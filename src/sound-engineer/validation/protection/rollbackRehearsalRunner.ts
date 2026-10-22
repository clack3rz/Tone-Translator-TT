// src/sound-engineer/validation/protection/rollbackRehearsalRunner.ts
// Rollback Rehearsal Runner for Phase 1C.5h WP-27:
// Executes empirical pre-cutover rollback rehearsal under simulated failure and peak load.
// Bound to frozen specification v0.1j Section 31, PROFILE-11, and Build Plan WP-27.

import { deepFreeze } from "../../contracts/immutability";
import {
  InvalidRehearsalInputError,
  RecoveryObjectiveResolutionError,
  RollbackRehearsalAdapterError,
} from "./protectionErrors";
import { RecoveryObjectiveResolver } from "./recoveryObjectiveResolver";
import {
  GovernedRecoveryObjective,
  RecoveryObjectiveEvaluation,
  RehearsalAttemptLog,
  RehearsalExecutionParams,
  RehearsalExecutionResult,
  RollbackRehearsalAdapter,
  RollbackRehearsalInput,
  RollbackRehearsalObservation,
} from "./rollbackTypes";

/**
 * Pure evaluation helper comparing empirical measurements against a governed recovery objective.
 * Strictly adheres to zero-hardcoded-thresholds: uses ONLY the values in `objective`.
 */
export function evaluateRecoveryObjective(
  measured: {
    readonly rollbackLatencyMs?: number;
    readonly trafficDrainMs?: number;
    readonly acousticFidelityDelta?: number;
    readonly restorationVerified: boolean;
  },
  objective: GovernedRecoveryObjective
): RecoveryObjectiveEvaluation {
  const details: string[] = [];

  const latencyMet =
    measured.rollbackLatencyMs !== undefined &&
    measured.rollbackLatencyMs <= objective.maxRollbackLatencyMs;
  details.push(
    `Rollback Latency: measured=${measured.rollbackLatencyMs ?? "N/A"}ms, SLA<=${objective.maxRollbackLatencyMs}ms -> ${latencyMet ? "PASS" : "FAIL"}`
  );

  const drainMet =
    measured.trafficDrainMs !== undefined &&
    measured.trafficDrainMs <= objective.maxTrafficDrainMs;
  details.push(
    `Traffic Drain: measured=${measured.trafficDrainMs ?? "N/A"}ms, SLA<=${objective.maxTrafficDrainMs}ms -> ${drainMet ? "PASS" : "FAIL"}`
  );

  const fidelityMet =
    measured.acousticFidelityDelta !== undefined &&
    measured.acousticFidelityDelta <= objective.maxAcousticFidelityDelta;
  details.push(
    `Acoustic Fidelity Delta: measured=${measured.acousticFidelityDelta ?? "N/A"}, MaxDelta<=${objective.maxAcousticFidelityDelta} -> ${fidelityMet ? "PASS" : "FAIL"}`
  );

  const restorationMet = measured.restorationVerified === true;
  details.push(
    `Baseline Restoration: verified=${measured.restorationVerified} -> ${restorationMet ? "PASS" : "FAIL"}`
  );

  const criteriaMet = latencyMet && drainMet && fidelityMet && restorationMet;

  return deepFreeze({
    criteriaMet,
    latencyMet,
    drainMet,
    fidelityMet,
    restorationMet,
    details: Object.freeze(details),
  });
}

/**
 * Dependencies injected into RollbackRehearsalRunner.
 */
export interface RollbackRehearsalRunnerDependencies {
  /** Rehearsal adapter providing sandboxed failover simulation */
  readonly adapter: RollbackRehearsalAdapter;
  /** Optional resolver for recovery objective references */
  readonly objectiveResolver?: RecoveryObjectiveResolver;
  /** Optional mockable clock returning ISO UTC strings */
  readonly clock?: () => string;
  /** Optional mockable sleep function for deterministic retry backoff */
  readonly sleepFn?: (ms: number) => Promise<void>;
}

/**
 * RollbackRehearsalRunner: Conducts empirical rollback rehearsals under simulated
 * peak load and simulated failure conditions.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * 1. Runs exclusively in sandbox/staging non-authoritative environments.
 * 2. Has ZERO live production authority; cannot route traffic or switch production paths.
 * 3. Preserves full audit history of all attempts without erasing prior failures.
 * 4. Never fabricates telemetry readiness or Gate 8 authorization.
 */
export class RollbackRehearsalRunner {
  private readonly adapter: RollbackRehearsalAdapter;
  private readonly objectiveResolver?: RecoveryObjectiveResolver;
  private readonly clock: () => string;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(dependencies: RollbackRehearsalRunnerDependencies) {
    if (!dependencies.adapter) {
      throw new InvalidRehearsalInputError(
        "adapter",
        "RollbackRehearsalAdapter must be provided to RollbackRehearsalRunner."
      );
    }
    this.adapter = dependencies.adapter;
    this.objectiveResolver = dependencies.objectiveResolver;
    this.clock = dependencies.clock ?? (() => new Date().toISOString());
    this.sleepFn =
      dependencies.sleepFn ??
      ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /**
   * Executes pre-cutover rollback rehearsal under simulated failure and peak load.
   * Preserves every attempt in an immutable attempt history.
   */
  public async executeRehearsal(
    input: RollbackRehearsalInput
  ): Promise<RollbackRehearsalObservation> {
    this.validateInput(input);

    const rehearsalId =
      input.rehearsalId ??
      `rehearsal_${input.packageId}_${input.versionBindingRef.slice(0, 8)}_${Date.now()}`;

    // 1. Resolve governed recovery objective if not directly supplied
    let governedObjective: GovernedRecoveryObjective | undefined = input.governedObjective;
    if (!governedObjective && this.objectiveResolver) {
      const resolved = await this.objectiveResolver.resolve(input.recoveryObjectiveRef);
      if (resolved) {
        governedObjective = resolved;
      }
    }

    // 2. Determine retry budget (default: 0 retries / 1 attempt)
    const maxRetries = input.retryPolicy ? Math.max(0, input.retryPolicy.maxRetries) : 0;
    const backoffMs = input.retryPolicy ? Math.max(0, input.retryPolicy.backoffMs) : 0;

    const attemptHistory: RehearsalAttemptLog[] = [];
    let lastResult: RehearsalExecutionResult | undefined;
    let finalFailureReason: string | undefined;

    let attemptIndex = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const attemptTimestamp = this.clock();
      const params: RehearsalExecutionParams = {
        rehearsalId,
        packageId: input.packageId,
        versionBindingRef: input.versionBindingRef,
        simulatedFailure: input.simulatedFailure,
        loadProfile: input.loadProfile,
        attemptIndex,
      };

      try {
        const executionResult = await this.adapter.rehearseRollback(params);
        lastResult = executionResult;

        const attemptLog: RehearsalAttemptLog = {
          attemptIndex,
          timestamp: attemptTimestamp,
          success: executionResult.success,
          rollbackLatencyMs: executionResult.rollbackLatencyMs,
          trafficDrainMs: executionResult.trafficDrainMs,
          acousticFidelityDelta: executionResult.acousticFidelityDelta,
          restorationVerified: executionResult.restorationVerified,
          executedLoadProfileId: executionResult.executedLoadProfileId,
          loadAppliedVerified: executionResult.loadAppliedVerified,
          failureReason: executionResult.failureReason,
          simulatedFailureType: input.simulatedFailure.failureType,
        };
        attemptHistory.push(deepFreeze(attemptLog));

        if (executionResult.success && executionResult.restorationVerified) {
          // Attempt succeeded operationally
          shouldContinue = false;
        } else {
          finalFailureReason =
            executionResult.failureReason ??
            `Rollback execution failed or unverified on attempt ${attemptIndex}`;
          if (attemptIndex < maxRetries) {
            attemptIndex++;
            if (backoffMs > 0) {
              await this.sleepFn(backoffMs);
            }
          } else {
            shouldContinue = false;
          }
        }
      } catch (err: unknown) {
        const errorName = err instanceof Error ? err.name : "UnknownError";
        const errorMessage = err instanceof Error ? err.message : String(err);
        finalFailureReason = `Adapter exception on attempt ${attemptIndex}: ${errorMessage}`;

        const attemptLog: RehearsalAttemptLog = {
          attemptIndex,
          timestamp: attemptTimestamp,
          success: false,
          restorationVerified: false,
          executedLoadProfileId: undefined,
          loadAppliedVerified: false,
          failureReason: finalFailureReason,
          simulatedFailureType: input.simulatedFailure.failureType,
          errorName,
          errorMessage,
        };
        attemptHistory.push(deepFreeze(attemptLog));

        if (attemptIndex < maxRetries) {
          attemptIndex++;
          if (backoffMs > 0) {
            await this.sleepFn(backoffMs);
          }
        } else {
          shouldContinue = false;
        }
      }
    }

    // 3. Evaluate criteria against governed recovery objective if available
    let objectiveEvaluation: RecoveryObjectiveEvaluation | undefined;
    if (governedObjective && lastResult) {
      objectiveEvaluation = evaluateRecoveryObjective(
        {
          rollbackLatencyMs: lastResult.rollbackLatencyMs,
          trafficDrainMs: lastResult.trafficDrainMs,
          acousticFidelityDelta: lastResult.acousticFidelityDelta,
          restorationVerified: lastResult.restorationVerified,
        },
        governedObjective
      );
    }

    const observation: RollbackRehearsalObservation = {
      rehearsalId,
      packageId: input.packageId,
      versionBindingRef: input.versionBindingRef,
      recoveryObjectiveRef: input.recoveryObjectiveRef,
      governedObjective: governedObjective ? deepFreeze({ ...governedObjective }) : undefined,
      simulatedFailure: deepFreeze({ ...input.simulatedFailure }),
      loadProfile: deepFreeze({ ...input.loadProfile }),
      executionCompleted: lastResult !== undefined,
      rollbackLatencyMs: lastResult?.rollbackLatencyMs,
      trafficDrainMs: lastResult?.trafficDrainMs,
      acousticFidelityDelta: lastResult?.acousticFidelityDelta,
      restorationVerified: lastResult?.restorationVerified ?? false,
      executedLoadProfileId: lastResult?.executedLoadProfileId,
      loadAppliedVerified: lastResult?.loadAppliedVerified === true,
      attemptHistory: Object.freeze(attemptHistory),
      totalAttempts: attemptHistory.length,
      objectiveEvaluation,
      observedAt: this.clock(),
      failureReason: lastResult?.success ? undefined : finalFailureReason,
    };

    return deepFreeze(observation);
  }

  /**
   * Validates rehearsal input boundaries.
   */
  private validateInput(input: RollbackRehearsalInput): void {
    if (!input.packageId || typeof input.packageId !== "string" || input.packageId.trim() === "") {
      throw new InvalidRehearsalInputError("packageId", "packageId must be a non-empty string");
    }
    if (
      !input.versionBindingRef ||
      typeof input.versionBindingRef !== "string" ||
      input.versionBindingRef.trim() === ""
    ) {
      throw new InvalidRehearsalInputError(
        "versionBindingRef",
        "versionBindingRef must be a non-empty string"
      );
    }
    if (
      !input.recoveryObjectiveRef ||
      typeof input.recoveryObjectiveRef !== "string" ||
      input.recoveryObjectiveRef.trim() === ""
    ) {
      throw new InvalidRehearsalInputError(
        "recoveryObjectiveRef",
        "recoveryObjectiveRef must be a non-empty string"
      );
    }
    if (!input.simulatedFailure || !input.simulatedFailure.failureType) {
      throw new InvalidRehearsalInputError(
        "simulatedFailure",
        "simulatedFailure with valid failureType must be supplied"
      );
    }
    if (!input.loadProfile || typeof input.loadProfile.concurrency !== "number") {
      throw new InvalidRehearsalInputError(
        "loadProfile",
        "loadProfile with numeric concurrency must be supplied"
      );
    }
  }
}
