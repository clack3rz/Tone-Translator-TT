// src/sound-engineer/validation/protection/rollbackTypes.ts
// Reusable contracts, observation types, and certificate structures for Phase 1C.5h WP-27:
// Production Protection, PATH-SHADOW Isolation & Rollback Verification.
// Bound to frozen specification v0.1j Section 31, PROFILE-11, and Build Plan WP-27.

import { ExecutionStream } from "../../execution";
import { RollbackVerificationEvidence } from "../readiness/productionReadinessTypes";
import { RecordIntegrityMetadata } from "../schemas/integrity";

/**
 * Governed recovery acceptance criteria resolved from `recovery_objective_ref`.
 * Represents externally governed policy (Phase 1C.5g / operational governance).
 * Contains ZERO universal default thresholds.
 */
export interface GovernedRecoveryObjective {
  /** Governed identifier or URI of the recovery objective */
  readonly recoveryObjectiveRef: string;
  /** Maximum acceptable rollback execution latency in milliseconds */
  readonly maxRollbackLatencyMs: number;
  /** Maximum acceptable traffic draining duration in milliseconds */
  readonly maxTrafficDrainMs: number;
  /** Maximum permissible acoustic fidelity divergence delta */
  readonly maxAcousticFidelityDelta: number;
  /** Optional human-readable description of this governed objective */
  readonly description?: string;
}

/**
 * Rehearsal load profile specification representing simulated peak-load execution.
 * Kept strictly decoupled from recovery acceptance criteria.
 */
export interface RehearsalLoadProfile {
  /** Unique identifier for the load profile */
  readonly profileId: string;
  /** Number of concurrent simulated requests/streams */
  readonly concurrency: number;
  /** Optional target throughput in requests/evaluations per second */
  readonly throughputRps?: number;
  /** Optional duration of the simulated load test in milliseconds */
  readonly durationMs?: number;
  /** Optional description of the workload */
  readonly description?: string;
}

/**
 * Governed fault condition specification injected to exercise failover.
 */
export interface SimulatedFailureSpec {
  /** Identifier of the fault category (e.g. "DSP_PIPELINE_FAULT", "RENDER_BUFFER_OVERRUN", "PROCESS_CRASH") */
  readonly failureType: string;
  /** Optional parameters qualifying the injected fault */
  readonly faultPayload?: Readonly<Record<string, unknown>>;
  /** Optional target stage where fault should be triggered */
  readonly injectedAtStage?: string;
  /** Human-readable description of the simulated fault condition */
  readonly description?: string;
}

/**
 * Execution parameters supplied to a RollbackRehearsalAdapter during a rehearsal attempt.
 */
export interface RehearsalExecutionParams {
  readonly rehearsalId: string;
  readonly packageId: string;
  readonly versionBindingRef: string;
  readonly simulatedFailure: SimulatedFailureSpec;
  readonly loadProfile: RehearsalLoadProfile;
  readonly attemptIndex: number;
}

/**
 * Empirical result returned by a RollbackRehearsalAdapter for a single rehearsal execution.
 */
export interface RehearsalExecutionResult {
  /** Whether the rollback sequence executed cleanly without adapter crash */
  readonly success: boolean;
  /** Measured duration from failure trigger to rollback completion in milliseconds */
  readonly rollbackLatencyMs: number;
  /** Measured duration to drain pending in-flight requests in milliseconds */
  readonly trafficDrainMs: number;
  /** Measured acoustic fidelity divergence between post-rollback output and baseline */
  readonly acousticFidelityDelta: number;
  /** Whether the rehearsed target returned to the verified baseline restoration state */
  readonly restorationVerified: boolean;
  /** Factual identifier of the load profile executed by the adapter (proves requested load was exercised) */
  readonly executedLoadProfileId?: string;
  /** Explicit verification from adapter that the requested load profile was actually applied */
  readonly loadAppliedVerified?: boolean;
  /** Optional diagnostic or failure message */
  readonly failureReason?: string;
  /** Optional structured diagnostic metadata */
  readonly diagnosticDetails?: Readonly<Record<string, unknown>>;
}

/**
 * Adapter interface for conducting rollback rehearsals in sandbox/staging environments.
 *
 * CRITICAL PRODUCTION BOUNDARY:
 * This interface has ZERO live production authority. It must NOT provide methods for
 * live traffic switching, DNS mutation, canary activation, or production rollback.
 */
export interface RollbackRehearsalAdapter {
  readonly adapterName: string;

  /**
   * Triggers a sandboxed/staging rehearsal failover and measures reversion dynamics.
   */
  rehearseRollback(params: RehearsalExecutionParams): Promise<RehearsalExecutionResult>;
}

/**
 * Optional caller-supplied retry policy for mitigating rollback flakiness.
 * Kept strictly decoupled from GovernedRecoveryObjective.
 */
export interface RehearsalRetryPolicy {
  /** Maximum number of retries beyond the initial attempt (0 = single attempt) */
  readonly maxRetries: number;
  /** Backoff interval between retries in milliseconds */
  readonly backoffMs: number;
}

/**
 * Immutable log record for a single rehearsal attempt.
 * Preserved in full audit history; earlier failures are NEVER erased.
 */
export interface RehearsalAttemptLog {
  readonly attemptIndex: number;
  readonly timestamp: string;
  readonly success: boolean;
  readonly rollbackLatencyMs?: number;
  readonly trafficDrainMs?: number;
  readonly acousticFidelityDelta?: number;
  readonly restorationVerified?: boolean;
  readonly executedLoadProfileId?: string;
  readonly loadAppliedVerified?: boolean;
  readonly failureReason?: string;
  readonly simulatedFailureType: string;
  readonly errorName?: string;
  readonly errorMessage?: string;
}

/**
 * Objective evaluation breakdown comparing rehearsal observations against GovernedRecoveryObjective.
 */
export interface RecoveryObjectiveEvaluation {
  readonly criteriaMet: boolean;
  readonly latencyMet: boolean;
  readonly drainMet: boolean;
  readonly fidelityMet: boolean;
  readonly restorationMet: boolean;
  readonly details: readonly string[];
}

/**
 * Raw empirical rehearsal observation returned by RollbackRehearsalRunner.
 * Preserves all factual measurements, attempt history, and evaluation without generating
 * the final sealed certificate or mutating Record 20/21.
 */
export interface RollbackRehearsalObservation {
  readonly rehearsalId: string;
  readonly packageId: string;
  readonly versionBindingRef: string;
  readonly recoveryObjectiveRef: string;
  readonly governedObjective?: GovernedRecoveryObjective;
  readonly simulatedFailure: SimulatedFailureSpec;
  readonly loadProfile: RehearsalLoadProfile;
  readonly executionCompleted: boolean;
  readonly rollbackLatencyMs?: number;
  readonly trafficDrainMs?: number;
  readonly acousticFidelityDelta?: number;
  readonly restorationVerified: boolean;
  /** Factual identifier of the load profile executed during the final attempt */
  readonly executedLoadProfileId?: string;
  /** Whether the requested simulated peak load profile was verified as applied */
  readonly loadAppliedVerified: boolean;
  readonly attemptHistory: readonly RehearsalAttemptLog[];
  readonly totalAttempts: number;
  readonly objectiveEvaluation?: RecoveryObjectiveEvaluation;
  readonly observedAt: string;
  readonly failureReason?: string;
}

/**
 * Input parameters required by RollbackRehearsalRunner.executeRehearsal().
 */
export interface RollbackRehearsalInput {
  /** Optional explicit rehearsal run ID; if omitted, a deterministic ID is derived */
  readonly rehearsalId?: string;
  /** Identifier of candidate ValidationPackage under test */
  readonly packageId: string;
  /** Composite digest or ID of bound ValidationVersionBindingRecord */
  readonly versionBindingRef: string;
  /** Governed recovery objective reference token */
  readonly recoveryObjectiveRef: string;
  /** Optional pre-resolved governed recovery objective (if resolver is bypassed) */
  readonly governedObjective?: GovernedRecoveryObjective;
  /** Injected fault condition specification */
  readonly simulatedFailure: SimulatedFailureSpec;
  /** Simulated peak load profile */
  readonly loadProfile: RehearsalLoadProfile;
  /** Optional retry policy (defaults to 0 retries / 1 attempt) */
  readonly retryPolicy?: RehearsalRetryPolicy;
}

/**
 * RollbackVerificationCertificate: Tamper-evident, sealed certificate generated by
 * Activity WF-14 (PROFILE-11) certifying that pre-cutover rollback rehearsal was executed,
 * meets governed recovery criteria, and isolated PATH-PROD.
 *
 * NOTE: NOT Record 23. This is a sealed composite certificate referenced by Record 21
 * (`rollback_verification_cert_ref`) and consumed as evidence by Record 20.
 */
export interface RollbackVerificationCertificate {
  readonly certificate_id: string;
  readonly package_id: string;
  readonly scope_id?: string;
  readonly binding_id: string;
  readonly recovery_objective_ref: string;
  readonly rehearsal_timestamp: string;
  readonly simulated_failure_type: string;
  readonly measured_latency_ms?: number;
  readonly measured_drain_ms?: number;
  readonly measured_fidelity_delta?: number;
  readonly path_prod_isolated: boolean;
  readonly verified_under_load: boolean;
  readonly restoration_verified: boolean;
  readonly verdict: "PASS" | "FAIL";
  readonly failure_reason?: string;
  readonly attempt_count: number;
  readonly record_integrity_metadata: RecordIntegrityMetadata;
}

/**
 * Unsealed payload of RollbackVerificationCertificate used for deterministic hashing.
 */
export type RollbackVerificationCertificatePayload = Omit<
  RollbackVerificationCertificate,
  "record_integrity_metadata"
>;

/**
 * Parameters for ProductionProtectionEnforcer.enforceRollbackVerification().
 */
export interface EnforceRollbackVerificationInput {
  /** Execution stream identity. Must NOT be CURRENT production. Defaults to SHADOW. */
  readonly executionStream?: ExecutionStream | string;
  /** Candidate ValidationPackage identifier */
  readonly packageId: string;
  /** Optional ValidationScopeRecord reference */
  readonly scopeId?: string;
  /** Bound ValidationVersionBindingRecord reference / ID */
  readonly versionBindingRef: string;
  /** Governed recovery objective reference */
  readonly recoveryObjectiveRef: string;
  /** Optional pre-resolved governed recovery objective */
  readonly governedObjective?: GovernedRecoveryObjective;
  /** Injected fault condition specification */
  readonly simulatedFailure: SimulatedFailureSpec;
  /** Simulated peak load profile */
  readonly loadProfile: RehearsalLoadProfile;
  /** Optional retry policy */
  readonly retryPolicy?: RehearsalRetryPolicy;
  /** Optional explicit upstream telemetry stop criteria configuration flag (never defaulted) */
  readonly telemetryStopCriteriaConfigured?: boolean;
  /** Optional explicit staleness override */
  readonly isStale?: boolean;
  /** Optional custom certificate ID */
  readonly certificateId?: string;
  /** Optional signer identity for integrity metadata */
  readonly signerIdentity?: string;
}

/**
 * Result returned by ProductionProtectionEnforcer.enforceRollbackVerification().
 */
export interface ProductionProtectionEnforcementResult {
  readonly isPassing: boolean;
  readonly certificate: RollbackVerificationCertificate;
  readonly rollbackEvidence: RollbackVerificationEvidence;
  readonly rehearsalObservation: RollbackRehearsalObservation;
  readonly isolationEvidence: {
    readonly streamVerified: boolean;
    readonly executionStream: string;
    readonly sandboxGuardVerified: boolean;
  };
  readonly failureReason?: string;
}
