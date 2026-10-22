// src/sound-engineer/validation/protection/productionProtectionEnforcer.ts
// Production Protection Enforcer for Phase 1C.5h WP-27:
// Enforces PATH-SHADOW isolation, coordinates Activity WF-14 rollback rehearsal,
// seals RollbackVerificationCertificate, and bridges evidence to Record 20 and Record 21.
// Bound to frozen specification v0.1j Section 31, PROFILE-11, and Build Plan WP-27.

import { deepFreeze } from "../../contracts/immutability";
import { EXECUTION_STREAMS } from "../../execution";
import { ProductionProtectionGuard } from "../execution/sandboxIsolation";
import { RollbackVerificationEvidence } from "../readiness/productionReadinessTypes";
import {
  canonicalizeJson,
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  InvalidRehearsalInputError,
  IsolationAssertionError,
  RollbackVerificationTamperError,
} from "./protectionErrors";
import { RecoveryObjectiveResolver } from "./recoveryObjectiveResolver";
import { RollbackRehearsalRunner } from "./rollbackRehearsalRunner";
import {
  EnforceRollbackVerificationInput,
  GovernedRecoveryObjective,
  ProductionProtectionEnforcementResult,
  RollbackRehearsalInput,
  RollbackRehearsalObservation,
  RollbackVerificationCertificate,
  RollbackVerificationCertificatePayload,
} from "./rollbackTypes";

/**
 * Pure mapping helper converting a RollbackVerificationCertificate into
 * standard WP-21 RollbackVerificationEvidence for Record 20 synthesis.
 *
 * CRITICAL GOVERNANCE INVARIANT:
 * Telemetry stop criteria and staleness must NEVER be fail-open defaulted.
 * If unsupplied, they remain undefined / as provided.
 */
export function mapCertificateToReadinessEvidence(
  certificate: RollbackVerificationCertificate,
  options?: {
    readonly telemetryStopCriteriaConfigured?: boolean;
    readonly isStale?: boolean;
    readonly recoveryTimeObjectiveMetOverride?: boolean;
    readonly timingCriteriaMet?: boolean;
  }
): RollbackVerificationEvidence {
  const isPassing = certificate.verdict === "PASS";

  // Recovery Time Objective (RTO) evaluates specifically timing criteria (latency and drain)
  // Acoustic fidelity is evaluated independently for rollback_verified and certificate.verdict
  const timingMet =
    options?.recoveryTimeObjectiveMetOverride ??
    options?.timingCriteriaMet ??
    (isPassing
      ? true
      : certificate.measured_latency_ms !== undefined &&
        certificate.measured_drain_ms !== undefined &&
        certificate.failure_reason === undefined);

  return deepFreeze({
    rollback_verified: isPassing,
    path_prod_isolated: certificate.path_prod_isolated,
    path_rollback_verified_under_load: certificate.verified_under_load,
    recovery_time_objective_met: timingMet,
    telemetry_stop_criteria_configured: options?.telemetryStopCriteriaConfigured,
    verification_timestamp: certificate.rehearsal_timestamp,
    evidence_ref: certificate.certificate_id,
    failure_reason: certificate.failure_reason,
    version_binding_ref: certificate.binding_id,
    is_stale: options?.isStale,
  });
}

/**
 * Dependencies injected into ProductionProtectionEnforcer.
 */
export interface ProductionProtectionEnforcerDependencies {
  /** Runner executing sandboxed rollback rehearsals */
  readonly rehearsalRunner: RollbackRehearsalRunner;
  /** Optional resolver for recovery objective references */
  readonly objectiveResolver?: RecoveryObjectiveResolver;
  /** Cryptographic integrity provider (defaults to DefaultSha256IntegrityProvider) */
  readonly integrityProvider?: IntegrityProvider;
  /** Signer identity attached to sealed certificate integrity metadata */
  readonly signerIdentity?: string;
  /** Optional mockable clock */
  readonly clock?: () => string;
}

/**
 * ProductionProtectionEnforcer: Enforces production isolation and pre-cutover
 * rollback verification under Phase 1C.5h WP-27.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * 1. Verifies non-authoritative execution (PATH-SHADOW or DEV).
 * 2. Does NOT switch PATH-PROD or route live user traffic.
 * 3. Does NOT perform operational production rollback (owned by Phase 1C.5g).
 * 4. Does NOT issue Gate 8 authorization (owned by WP-22 Gate8AdjudicationEngine).
 * 5. Supplies empirical evidence to WP-21 and references to WP-22.
 */
export class ProductionProtectionEnforcer {
  private readonly rehearsalRunner: RollbackRehearsalRunner;
  private readonly objectiveResolver?: RecoveryObjectiveResolver;
  private readonly integrityProvider: IntegrityProvider;
  private readonly signerIdentity: string;
  private readonly clock: () => string;

  constructor(dependencies: ProductionProtectionEnforcerDependencies) {
    if (!dependencies.rehearsalRunner) {
      throw new InvalidRehearsalInputError(
        "rehearsalRunner",
        "rehearsalRunner must be supplied to ProductionProtectionEnforcer"
      );
    }
    this.rehearsalRunner = dependencies.rehearsalRunner;
    this.objectiveResolver = dependencies.objectiveResolver;
    this.integrityProvider =
      dependencies.integrityProvider ?? new DefaultSha256IntegrityProvider();
    this.signerIdentity =
      dependencies.signerIdentity ?? "ProductionProtectionEnforcer-v0.1h";
    this.clock = dependencies.clock ?? (() => new Date().toISOString());
  }

  /**
   * Asserts that current context is strictly isolated from live PATH-PROD traffic.
   * Throws IsolationAssertionError if stream is CURRENT or if sandbox guards are breached.
   */
  public assertIsolation(stream?: string): void {
    ProductionProtectionGuard.assertSandboxIsolation();

    if (stream === EXECUTION_STREAMS.CURRENT) {
      throw new IsolationAssertionError(
        stream,
        "Validation and rollback rehearsals are strictly prohibited on CURRENT production stream."
      );
    }
  }

  /**
   * Executes Activity WF-14: Conducts empirical pre-cutover rollback rehearsal,
   * verifies PATH-SHADOW isolation, evaluates recovery metrics, and seals
   * a tamper-evident RollbackVerificationCertificate.
   */
  public async enforceRollbackVerification(
    input: EnforceRollbackVerificationInput
  ): Promise<ProductionProtectionEnforcementResult> {
    this.validateEnforceInput(input);

    const timestamp = this.clock();
    const stream = input.executionStream ?? EXECUTION_STREAMS.SHADOW;

    // 1. Verify PATH-SHADOW / test stream isolation
    let isStreamIsolated = true;
    let isolationErrorReason: string | undefined;

    try {
      this.assertIsolation(stream);
    } catch (err: unknown) {
      isStreamIsolated = false;
      isolationErrorReason = err instanceof Error ? err.message : String(err);
    }

    // 2. Resolve governed recovery objective
    let governedObjective: GovernedRecoveryObjective | undefined = input.governedObjective;
    if (!governedObjective && this.objectiveResolver) {
      const resolved = await this.objectiveResolver.resolve(input.recoveryObjectiveRef);
      if (resolved) {
        governedObjective = resolved;
      }
    }

    const objectiveResolved = governedObjective !== undefined;

    let observation: RollbackRehearsalObservation;
    let failureReason: string | undefined;

    // 3. If stream isolation or recovery objective resolution failed, do NOT invoke adapter
    if (!isStreamIsolated) {
      failureReason = `Isolation assertion failed: ${isolationErrorReason ?? "Production stream prohibited"}`;
      observation = deepFreeze({
        rehearsalId: `aborted_${input.packageId}_isolation_failure`,
        packageId: input.packageId,
        versionBindingRef: input.versionBindingRef,
        recoveryObjectiveRef: input.recoveryObjectiveRef,
        governedObjective,
        simulatedFailure: deepFreeze({ ...input.simulatedFailure }),
        loadProfile: deepFreeze({ ...input.loadProfile }),
        executionCompleted: false,
        restorationVerified: false,
        executedLoadProfileId: undefined,
        loadAppliedVerified: false,
        attemptHistory: [],
        totalAttempts: 0,
        observedAt: timestamp,
        failureReason,
      });
    } else if (!objectiveResolved) {
      failureReason = `Recovery objective '${input.recoveryObjectiveRef}' could not be resolved. Fails closed with zero hardcoded fallback thresholds.`;
      observation = deepFreeze({
        rehearsalId: `aborted_${input.packageId}_unresolved_objective`,
        packageId: input.packageId,
        versionBindingRef: input.versionBindingRef,
        recoveryObjectiveRef: input.recoveryObjectiveRef,
        governedObjective: undefined,
        simulatedFailure: deepFreeze({ ...input.simulatedFailure }),
        loadProfile: deepFreeze({ ...input.loadProfile }),
        executionCompleted: false,
        restorationVerified: false,
        executedLoadProfileId: undefined,
        loadAppliedVerified: false,
        attemptHistory: [],
        totalAttempts: 0,
        observedAt: timestamp,
        failureReason,
      });
    } else {
      // 4. Execute empirical rehearsal via runner
      const runnerInput: RollbackRehearsalInput = {
        packageId: input.packageId,
        versionBindingRef: input.versionBindingRef,
        recoveryObjectiveRef: input.recoveryObjectiveRef,
        governedObjective,
        simulatedFailure: input.simulatedFailure,
        loadProfile: input.loadProfile,
        retryPolicy: input.retryPolicy,
      };

      observation = await this.rehearsalRunner.executeRehearsal(runnerInput);

      // Factual proof that the requested simulated peak load profile was actually applied
      const loadProfileExercised =
        observation.loadAppliedVerified === true &&
        observation.executedLoadProfileId === input.loadProfile.profileId;

      if (!observation.executionCompleted || !observation.restorationVerified) {
        failureReason =
          observation.failureReason ??
          "Rollback rehearsal failed to complete or verify baseline restoration";
      } else if (observation.objectiveEvaluation && !observation.objectiveEvaluation.criteriaMet) {
        failureReason = `Recovery objective criteria not met: ${observation.objectiveEvaluation.details.filter((d) => d.includes("FAIL")).join("; ")}`;
      } else if (!loadProfileExercised) {
        failureReason = `Simulated peak load execution was not verified: requested load profile '${input.loadProfile.profileId}', adapter reported executed profile '${observation.executedLoadProfileId ?? "none"}' (verified=${observation.loadAppliedVerified}).`;
      }
    }

    // 5. Evaluate strict boolean PASS conditions
    // Peak load execution is proven only if adapter explicitly verified the requested profile
    const verifiedUnderLoad =
      observation.loadAppliedVerified === true &&
      observation.executedLoadProfileId === input.loadProfile.profileId;

    const isPassing =
      isStreamIsolated &&
      objectiveResolved &&
      verifiedUnderLoad &&
      observation.executionCompleted &&
      observation.restorationVerified &&
      (observation.objectiveEvaluation?.criteriaMet === true);

    const verdict: "PASS" | "FAIL" = isPassing ? "PASS" : "FAIL";
    const certificateId =
      input.certificateId ??
      `rollcert_${input.packageId}_${input.versionBindingRef.slice(0, 8)}_${timestamp.replace(/[-:.]/g, "")}`;

    // 6. Seal RollbackVerificationCertificate
    const certificatePayload: RollbackVerificationCertificatePayload = {
      certificate_id: certificateId,
      package_id: input.packageId,
      scope_id: input.scopeId,
      binding_id: input.versionBindingRef,
      recovery_objective_ref: input.recoveryObjectiveRef,
      rehearsal_timestamp: timestamp,
      simulated_failure_type: input.simulatedFailure.failureType,
      measured_latency_ms: observation.rollbackLatencyMs,
      measured_drain_ms: observation.trafficDrainMs,
      measured_fidelity_delta: observation.acousticFidelityDelta,
      path_prod_isolated: isStreamIsolated,
      verified_under_load: verifiedUnderLoad,
      restoration_verified: observation.restorationVerified,
      verdict,
      failure_reason: isPassing ? undefined : failureReason,
      attempt_count: observation.totalAttempts,
    };

    const canonicalJson = canonicalizeJson(certificatePayload);
    const integrityDigest = this.integrityProvider.computeDigest(canonicalJson);

    const recordIntegrityMetadata: RecordIntegrityMetadata = {
      integrity_digest: integrityDigest,
      algorithm: this.integrityProvider.algorithmName,
      sealed_at: timestamp,
      signer_identity: input.signerIdentity ?? this.signerIdentity,
      canonical_serialization_format: "CANONICAL-JSON",
    };

    const certificate: RollbackVerificationCertificate = deepFreeze({
      ...certificatePayload,
      record_integrity_metadata: recordIntegrityMetadata,
    });

    // 7. Map to WP-21 RollbackVerificationEvidence
    // Timing criteria (RTO) relates specifically to rollback latency and traffic drain duration
    const timingCriteriaMet = observation.objectiveEvaluation
      ? observation.objectiveEvaluation.latencyMet && observation.objectiveEvaluation.drainMet
      : false;

    const rollbackEvidence = mapCertificateToReadinessEvidence(certificate, {
      telemetryStopCriteriaConfigured: input.telemetryStopCriteriaConfigured,
      isStale: input.isStale,
      timingCriteriaMet,
      recoveryTimeObjectiveMetOverride: timingCriteriaMet,
    });

    return deepFreeze({
      isPassing,
      certificate,
      rollbackEvidence,
      rehearsalObservation: observation,
      isolationEvidence: {
        streamVerified: isStreamIsolated,
        executionStream: String(stream),
        sandboxGuardVerified: true,
      },
      failureReason: isPassing ? undefined : failureReason,
    });
  }

  /**
   * Verifies the cryptographic seal on a RollbackVerificationCertificate.
   * Throws RollbackVerificationTamperError if digest does not match payload.
   */
  public verifyCertificate(certificate: RollbackVerificationCertificate): boolean {
    const { record_integrity_metadata, ...unsealedPayload } = certificate;
    const canonicalJson = canonicalizeJson(unsealedPayload);
    const isValid = this.integrityProvider.verifyDigest(
      canonicalJson,
      record_integrity_metadata.integrity_digest
    );
    if (!isValid) {
      throw new RollbackVerificationTamperError(
        certificate.certificate_id,
        `Tamper detected in RollbackVerificationCertificate. Computed digest does not match sealed digest '${record_integrity_metadata.integrity_digest}'.`
      );
    }
    return true;
  }

  /**
   * Validates input parameters for enforceRollbackVerification().
   */
  private validateEnforceInput(input: EnforceRollbackVerificationInput): void {
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
