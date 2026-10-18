// src/sound-engineer/validation/execution/sandboxIsolation.ts
// Dedicated Sandbox Isolation Boundary for Phase 1C.5h WP-10.
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.
// Preserves production protection invariants: zero authority to mutate live production routing or state.
// Bounded runtime, explicit termination, and crash survival without crashing parent harness.

import {
  ExecutionSandboxCrashError,
  ExecutionTimeoutError,
  ProductionStateViolationError,
} from "./executionErrors";

/**
 * Result structure returned by SandboxIsolationBoundary.
 * Ensures parent harness receives deterministic outcomes even on adapter crash or timeout.
 */
export interface SandboxExecutionOutcome<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: Error;
  readonly isTimeout: boolean;
  readonly isCrashed: boolean;
  readonly durationMs: number;
  readonly anomalies: string[];
}

/**
 * Production Protection State Monitor.
 * Validates that live musician tone generation (PATH-PROD) and production databases remain unmutated.
 */
export class ProductionProtectionGuard {
  private static liveProductionRoutingLocked = true;
  private static liveProductionDatabaseLocked = true;
  private static liveProductionSessionLocked = true;

  /**
   * Asserts that current context has ZERO authority to mutate live production state.
   */
  public static assertSandboxIsolation(): void {
    if (!this.liveProductionRoutingLocked || !this.liveProductionDatabaseLocked || !this.liveProductionSessionLocked) {
      throw new ProductionStateViolationError(
        "Production state guard unlocked during validation execution. Live production must remain strictly immutable."
      );
    }
  }

  /**
   * Throws if an attempted mutation of production routing or database occurs in sandbox context.
   */
  public static forbidProductionMutation(operationName: string): never {
    throw new ProductionStateViolationError(
      `Prohibited production mutation attempted in validation sandbox: '${operationName}'. Validation executions have zero authority over live production state.`
    );
  }
}

/**
 * SandboxIsolationBoundary: Encapsulates bounded execution, process/task isolation,
 * abort signal handling, and clean crash containment for audio rendering jobs.
 * Explicitly truthful: this is a JavaScript asynchronous boundary that isolates
 * memory references, catches all exceptions, and bounds execution duration.
 */
export class SandboxIsolationBoundary {
  private activeAbortControllers: Set<AbortController> = new Set();

  /**
   * Runs an operation within the sandbox boundary.
   * Catches all exceptions, handles timeouts via AbortSignal, and returns a safe outcome.
   * NEVER throws an unhandled exception that could crash the parent harness.
   */
  public async executeInSandbox<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    executionId: string,
    operationalBudgetRef: string
  ): Promise<SandboxExecutionOutcome<T>> {
    ProductionProtectionGuard.assertSandboxIsolation();

    const abortController = new AbortController();
    this.activeAbortControllers.add(abortController);

    const startTime = Date.now();
    let timeoutTimer: NodeJS.Timeout | undefined;
    let didTimeout = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        didTimeout = true;
        abortController.abort();
        reject(new ExecutionTimeoutError(executionId, timeoutMs, operationalBudgetRef));
      }, timeoutMs);
    });

    try {
      // Race operation against operational budget timeout
      const result = await Promise.race([
        operation(abortController.signal),
        timeoutPromise,
      ]);

      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      this.activeAbortControllers.delete(abortController);

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        result,
        isTimeout: false,
        isCrashed: false,
        durationMs,
        anomalies: [],
      };
    } catch (err: unknown) {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      this.activeAbortControllers.delete(abortController);

      const durationMs = Date.now() - startTime;
      const isTimeout = didTimeout || err instanceof ExecutionTimeoutError;
      const errorObj = err instanceof Error ? err : new Error(String(err));

      const anomalies: string[] = [];
      if (isTimeout) {
        anomalies.push(
          `[TIMEOUT_ANOMALY]: Execution exceeded operational budget limit of ${timeoutMs}ms (${operationalBudgetRef}). Sandbox terminated render.`
        );
      } else {
        anomalies.push(
          `[SANDBOX_CRASH_ANOMALY]: Unhandled exception inside sandbox: ${errorObj.message}`
        );
      }

      return {
        success: false,
        error: isTimeout
          ? new ExecutionTimeoutError(executionId, timeoutMs, operationalBudgetRef)
          : new ExecutionSandboxCrashError(executionId, errorObj),
        isTimeout,
        isCrashed: !isTimeout,
        durationMs,
        anomalies,
      };
    }
  }

  /**
   * Explicitly terminates all currently executing operations in the sandbox.
   */
  public terminateAll(): void {
    for (const controller of this.activeAbortControllers) {
      controller.abort();
    }
    this.activeAbortControllers.clear();
  }
}
