// src/sound-engineer/shadow/shadowExecutionController.ts
// Independent Shadow execution controller owning the full lifecycle of a SHADOW run

import {
  RunMetadata,
  isRunMetadata,
  EXECUTION_STREAMS,
  RUN_LIFECYCLE_STATUSES,
  RunLifecycleStatus,
  isTerminalRunStatus,
} from "../execution";
import { InputSnapshot, isInputSnapshot } from "../contracts";
import {
  ShadowRunState,
  ShadowExecutionResult,
  ShadowExecutionError,
  SHADOW_RUN_STATE_CONTRACT_VERSION,
} from "./shadowRunState";

export interface ShadowControllerOptions {
  /**
   * Optional timeout in milliseconds for this specific Shadow run.
   * Does not share or affect any CURRENT timeouts.
   */
  timeoutMs?: number;

  /**
   * Optional custom executor function, primarily for testing failure and delay scenarios.
   * If not provided, the controller uses its safe, harmless built-in placeholder executor.
   */
  customExecutor?: (
    snapshot: InputSnapshot,
    signal: AbortSignal
  ) => Promise<Record<string, unknown> | void>;
}

export type ShadowStateListener = (state: ShadowRunState) => void;

/**
 * Standalone execution controller for a single SHADOW run.
 * Completely structurally isolated from CURRENT production services, storage, and lifecycle.
 */
export class ShadowExecutionController {
  private readonly runMetadata: RunMetadata;
  private readonly inputSnapshot: InputSnapshot;
  private readonly options: ShadowControllerOptions;

  private readonly abortController: AbortController;
  private readonly listeners: Set<ShadowStateListener> = new Set();

  private status: RunLifecycleStatus = RUN_LIFECYCLE_STATUSES.CREATED;
  private startedAt?: string;
  private completedAt?: string;
  private error?: ShadowExecutionError;
  private result?: ShadowExecutionResult;
  private cancellationReason?: string;

  private timeoutHandle?: ReturnType<typeof setTimeout>;
  private isTimeoutTriggered = false;

  constructor(
    runMetadata: RunMetadata,
    inputSnapshot: InputSnapshot,
    options: ShadowControllerOptions = {}
  ) {
    // 1. Boundary Guard: Validate metadata contracts
    if (!isRunMetadata(runMetadata)) {
      throw new Error("Invalid RunMetadata: provided object does not conform to the RunMetadata specification.");
    }
    if (!isInputSnapshot(inputSnapshot)) {
      throw new Error("Invalid InputSnapshot: provided object does not conform to the InputSnapshot specification.");
    }

    // 2. Stream Guard: Accept strictly SHADOW stream
    if (runMetadata.stream !== EXECUTION_STREAMS.SHADOW) {
      throw new Error(
        `ShadowExecutionController stream violation: expected stream "${EXECUTION_STREAMS.SHADOW}", received "${runMetadata.stream}".`
      );
    }
    if (inputSnapshot.stream !== EXECUTION_STREAMS.SHADOW) {
      throw new Error(
        `ShadowExecutionController snapshot stream violation: expected stream "${EXECUTION_STREAMS.SHADOW}", received "${inputSnapshot.stream}".`
      );
    }

    // 3. Identity Alignment Guard: Verify matching runId
    if (runMetadata.runId !== inputSnapshot.runId) {
      throw new Error(
        `ShadowExecutionController ID mismatch: RunMetadata runId "${runMetadata.runId}" does not match InputSnapshot runId "${inputSnapshot.runId}".`
      );
    }

    this.runMetadata = runMetadata;
    this.inputSnapshot = inputSnapshot;
    this.options = options;
    this.abortController = new AbortController();
  }

  /**
   * Returns an immutable read-only snapshot of the Shadow run state.
   */
  public getState(): ShadowRunState {
    const state: ShadowRunState = {
      contractVersion: SHADOW_RUN_STATE_CONTRACT_VERSION,
      runId: this.runMetadata.runId,
      stream: EXECUTION_STREAMS.SHADOW,
      snapshotId: this.inputSnapshot.snapshotId,
      status: this.status,
      createdAt: this.runMetadata.createdAt,
      ...(this.startedAt ? { startedAt: this.startedAt } : {}),
      ...(this.completedAt ? { completedAt: this.completedAt } : {}),
      ...(this.error ? { error: Object.freeze({ ...this.error }) } : {}),
      ...(this.result ? { result: Object.freeze({ ...this.result }) } : {}),
      ...(this.cancellationReason ? { cancellationReason: this.cancellationReason } : {}),
    };

    return Object.freeze(state);
  }

  /**
   * Subscribes a listener to state transition notifications.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: ShadowStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyStateChange(): void {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch (listenerErr) {
        // Listener errors must never disrupt controller lifecycle
        console.error("ShadowExecutionController listener error:", listenerErr);
      }
    }
  }

  /**
   * Executes the Shadow run lifecycle.
   * Normal flow: created -> running -> completed (or failed or cancelled).
   *
   * Guaranteed not to throw uncontrolled errors to caller; terminal state captures failure.
   */
  public async execute(): Promise<ShadowRunState> {
    // Terminal state protection: terminal runs cannot transition back into active states
    if (isTerminalRunStatus(this.status)) {
      return this.getState();
    }

    // Check if cancellation occurred before execute() was invoked
    if (this.abortController.signal.aborted) {
      this.status = RUN_LIFECYCLE_STATUSES.CANCELLED;
      this.completedAt = new Date().toISOString();
      this.notifyStateChange();
      return this.getState();
    }

    // Transition to running
    this.status = RUN_LIFECYCLE_STATUSES.RUNNING;
    this.startedAt = new Date().toISOString();
    const startTimeMs = Date.now();
    this.notifyStateChange();

    // Set up local isolated timeout if configured
    if (this.options.timeoutMs && this.options.timeoutMs > 0) {
      this.timeoutHandle = setTimeout(() => {
        if (!isTerminalRunStatus(this.status)) {
          this.isTimeoutTriggered = true;
          this.abortController.abort(new Error(`Shadow run timed out after ${this.options.timeoutMs}ms`));
        }
      }, this.options.timeoutMs);
    }

    try {
      let customMetadata: Record<string, unknown> | undefined = undefined;

      if (this.options.customExecutor) {
        const executorOutput = await this.options.customExecutor(
          this.inputSnapshot,
          this.abortController.signal
        );
        if (executorOutput && typeof executorOutput === "object") {
          customMetadata = executorOutput;
        }
      } else {
        // Safe, harmless placeholder operation
        await this.runPlaceholderOperation(this.abortController.signal);
      }

      // Check if aborted during async execution
      if (this.abortController.signal.aborted) {
        this.handleCancellation();
      } else {
        this.status = RUN_LIFECYCLE_STATUSES.COMPLETED;
        this.completedAt = new Date().toISOString();
        this.result = Object.freeze({
          runId: this.runMetadata.runId,
          snapshotId: this.inputSnapshot.snapshotId,
          acknowledged: true,
          executedAt: this.completedAt,
          durationMs: Date.now() - startTimeMs,
          ...(customMetadata ? { metadata: Object.freeze({ ...customMetadata }) } : {}),
        });
      }
    } catch (err: unknown) {
      this.handleExecutionError(err);
    } finally {
      this.clearTimeoutHandle();
      this.notifyStateChange();
    }

    return this.getState();
  }

  /**
   * Cancels the Shadow run independently.
   * Cancelling Shadow has zero effect on CURRENT runs.
   */
  public cancel(reason?: string): void {
    if (isTerminalRunStatus(this.status)) {
      // Cancellation after terminal state is a safe no-op that does not corrupt state
      return;
    }

    this.cancellationReason = reason || "Shadow run cancelled by consumer";

    if (this.status === RUN_LIFECYCLE_STATUSES.CREATED) {
      this.status = RUN_LIFECYCLE_STATUSES.CANCELLED;
      this.completedAt = new Date().toISOString();
      this.abortController.abort(new Error(this.cancellationReason));
      this.notifyStateChange();
      return;
    }

    // Trigger internal abort signal to interrupt active execution
    this.abortController.abort(new Error(this.cancellationReason));
  }

  private handleCancellation(): void {
    if (this.isTimeoutTriggered) {
      // Timeout abort translates to failed with explicit timeout error
      this.status = RUN_LIFECYCLE_STATUSES.FAILED;
      this.completedAt = new Date().toISOString();
      this.error = Object.freeze({
        name: "TimeoutError",
        message: `Shadow run timed out after ${this.options.timeoutMs}ms`,
        code: "SHADOW_TIMEOUT",
        timestamp: this.completedAt,
      });
    } else {
      this.status = RUN_LIFECYCLE_STATUSES.CANCELLED;
      this.completedAt = new Date().toISOString();
      if (!this.cancellationReason) {
        this.cancellationReason = "Shadow run cancelled";
      }
    }
  }

  private handleExecutionError(err: unknown): void {
    const errorTimestamp = new Date().toISOString();

    // Check if error was caused by abort/cancellation
    if (
      this.abortController.signal.aborted ||
      (err instanceof Error && (err.name === "AbortError" || err.message.toLowerCase().includes("abort")))
    ) {
      this.handleCancellation();
      return;
    }

    this.status = RUN_LIFECYCLE_STATUSES.FAILED;
    this.completedAt = errorTimestamp;

    if (err instanceof Error) {
      this.error = Object.freeze({
        name: err.name,
        message: err.message,
        code: (err as any).code || "SHADOW_EXECUTION_ERROR",
        stack: err.stack,
        timestamp: errorTimestamp,
      });
    } else {
      this.error = Object.freeze({
        name: "UnknownError",
        message: String(err),
        code: "SHADOW_UNKNOWN_ERROR",
        timestamp: errorTimestamp,
      });
    }
  }

  private clearTimeoutHandle(): void {
    if (this.timeoutHandle !== undefined) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
  }

  /**
   * Harmless local placeholder operation to simulate work without side effects.
   */
  private async runPlaceholderOperation(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw new Error("Aborted before placeholder execution");
    }
    // Yield execution turn cleanly while respecting abort signal
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener("abort", onAbort);
        reject(new Error("Shadow placeholder operation aborted"));
      };

      if (signal.aborted) {
        return onAbort();
      }

      signal.addEventListener("abort", onAbort, { once: true });

      // Minimal non-blocking micro-delay (25ms gives cancellation test margin)
      setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, 25);
    });
  }
}

/**
 * Factory helper to construct a standalone ShadowExecutionController.
 */
export function createShadowExecutionController(
  runMetadata: RunMetadata,
  inputSnapshot: InputSnapshot,
  options?: ShadowControllerOptions
): ShadowExecutionController {
  return new ShadowExecutionController(runMetadata, inputSnapshot, options);
}
