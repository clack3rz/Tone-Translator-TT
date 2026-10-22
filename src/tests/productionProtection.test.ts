// src/tests/productionProtection.test.ts
// Comprehensive focused verification suite for Phase 1C.5h WP-27:
// Production Protection, PATH-SHADOW Isolation & Rollback Verification.
// Bound to frozen specification v0.1j Section 31, PROFILE-11, Invariant 9, and Build Plan WP-27.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXECUTION_STREAMS } from "../sound-engineer/execution";
import {
  ADOPTION_DECISION_OUTCOMES,
  EXECUTION_OUTCOMES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  GOVERNANCE_STATUSES,
  MUSICAL_FITNESS_VERDICTS,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PILLAR_READINESS_STATUSES,
  TASK_COMPLETION_STATUSES,
  TOLERANCE_EVALUATIONS,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import { GOVERNED_EDGE_TYPES } from "../sound-engineer/validation/graph/edgeTypes";
import {
  VALIDATION_RECORD_SCHEMAS,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  ConfiguredRecoveryObjectiveResolver,
  EnforceRollbackVerificationInput,
  evaluateRecoveryObjective,
  GovernedRecoveryObjective,
  IsolationAssertionError,
  mapCertificateToReadinessEvidence,
  ProductionProtectionEnforcer,
  RehearsalExecutionParams,
  RehearsalExecutionResult,
  RehearsalLoadProfile,
  RollbackRehearsalAdapter,
  RollbackRehearsalRunner,
  RollbackVerificationCertificate,
  RollbackVerificationTamperError,
  SimulatedFailureSpec,
} from "../sound-engineer/validation/protection";
import {
  FROZEN_HARD_BLOCKERS,
  ProductionReadinessSynthesizer,
  RollbackVerificationEvidence,
} from "../sound-engineer/validation/readiness";
import {
  DEFAULT_GATE8_AUTHORITIES,
  Gate8AdjudicationEngine,
} from "../sound-engineer/validation/gate8";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../sound-engineer/validation/binding";
import { DefaultSha256IntegrityProvider } from "../sound-engineer/validation/storage/ledgerTypes";

// ---------------------------------------------------------------------------
// Controlled Mock Rehearsal Adapter (Verification Only — ZERO Live Routing Authority)
// ---------------------------------------------------------------------------

class MockRollbackRehearsalAdapter implements RollbackRehearsalAdapter {
  public readonly adapterName = "MockRollbackRehearsalAdapter";
  public invocationCount = 0;
  public lastParams?: RehearsalExecutionParams;
  public customExecutionHandler?: (params: RehearsalExecutionParams) => Promise<RehearsalExecutionResult>;

  public async rehearseRollback(params: RehearsalExecutionParams): Promise<RehearsalExecutionResult> {
    this.invocationCount++;
    this.lastParams = params;

    if (this.customExecutionHandler) {
      return this.customExecutionHandler(params);
    }

    // Default pristine passing execution
    return {
      success: true,
      rollbackLatencyMs: 45,
      trafficDrainMs: 120,
      acousticFidelityDelta: 0.02,
      restorationVerified: true,
      executedLoadProfileId: params.loadProfile.profileId,
      loadAppliedVerified: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Standard Test Fixtures
// ---------------------------------------------------------------------------

const STANDARD_LOAD_PROFILE: RehearsalLoadProfile = {
  profileId: "LOAD_PROFILE_PEAK_SIM_100",
  concurrency: 100,
  throughputRps: 500,
  durationMs: 5000,
  description: "Simulated peak concurrency workload",
};

const STANDARD_FAILURE_SPEC: SimulatedFailureSpec = {
  failureType: "DSP_PIPELINE_FAULT",
  injectedAtStage: "Stage 09: Intervention Execution",
  description: "Injected unhandled audio buffer distortion fault",
};

const STANDARD_RECOVERY_OBJECTIVE: GovernedRecoveryObjective = {
  recoveryObjectiveRef: "obj_ref_peak_recovery_sla_v1",
  maxRollbackLatencyMs: 100,
  maxTrafficDrainMs: 300,
  maxAcousticFidelityDelta: 0.05,
  description: "Governed production recovery SLA: <100ms failover, <300ms drain, delta<=0.05",
};

function createStandardEnforceInput(
  overrides?: Partial<EnforceRollbackVerificationInput>
): EnforceRollbackVerificationInput {
  return {
    executionStream: EXECUTION_STREAMS.SHADOW,
    packageId: "pkg_production_cutover_candidate_001",
    scopeId: "scope_core_amp_models_001",
    versionBindingRef: "binding_digest_immutable_v0_1j",
    recoveryObjectiveRef: STANDARD_RECOVERY_OBJECTIVE.recoveryObjectiveRef,
    governedObjective: STANDARD_RECOVERY_OBJECTIVE,
    simulatedFailure: STANDARD_FAILURE_SPEC,
    loadProfile: STANDARD_LOAD_PROFILE,
    ...overrides,
  };
}

describe("Phase 1C.5h WP-27: Production Protection & Rollback Verification", () => {
  // =========================================================================
  // 1. Recovery Objective Resolution & Zero Hardcoded Defaults
  // =========================================================================
  describe("1. Recovery Objective Resolution", () => {
    it("01: ConfiguredRecoveryObjectiveResolver contains zero hardcoded defaults and fails closed if unresolved", async () => {
      const emptyResolver = new ConfiguredRecoveryObjectiveResolver();
      assert.equal(emptyResolver.size, 0);

      // Unknown ref returns undefined
      const resolved = await emptyResolver.resolve("unknown_objective_ref");
      assert.equal(resolved, undefined);

      // Registered objective resolves cleanly
      emptyResolver.registerObjective(STANDARD_RECOVERY_OBJECTIVE);
      assert.equal(emptyResolver.size, 1);
      const found = await emptyResolver.resolve(STANDARD_RECOVERY_OBJECTIVE.recoveryObjectiveRef);
      assert.ok(found);
      assert.equal(found?.maxRollbackLatencyMs, 100);
      assert.equal(found?.maxTrafficDrainMs, 300);
      assert.equal(found?.maxAcousticFidelityDelta, 0.05);
    });

    it("02: Unresolved recovery_objective_ref fails closed and cannot generate a PASS certificate", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const emptyResolver = new ConfiguredRecoveryObjectiveResolver();
      const runner = new RollbackRehearsalRunner({ adapter, objectiveResolver: emptyResolver });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner, objectiveResolver: emptyResolver });

      const input = createStandardEnforceInput({
        recoveryObjectiveRef: "unregistered_external_policy_ref",
        governedObjective: undefined, // Must resolve via resolver
      });

      const result = await enforcer.enforceRollbackVerification(input);

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.rollbackEvidence.rollback_verified, false);
      assert.ok(result.failureReason?.includes("could not be resolved"));
      // Adapter must NOT be invoked when criteria are unresolvable
      assert.equal(adapter.invocationCount, 0);
    });

    it("03: evaluateRecoveryObjective evaluates dimensions independently against governed policy", () => {
      // Dimension A: Latency exceeds SLA
      const evalLatencyFail = evaluateRecoveryObjective(
        { rollbackLatencyMs: 150, trafficDrainMs: 100, acousticFidelityDelta: 0.01, restorationVerified: true },
        STANDARD_RECOVERY_OBJECTIVE
      );
      assert.equal(evalLatencyFail.latencyMet, false);
      assert.equal(evalLatencyFail.criteriaMet, false);

      // Dimension B: Traffic drain exceeds SLA
      const evalDrainFail = evaluateRecoveryObjective(
        { rollbackLatencyMs: 50, trafficDrainMs: 500, acousticFidelityDelta: 0.01, restorationVerified: true },
        STANDARD_RECOVERY_OBJECTIVE
      );
      assert.equal(evalDrainFail.drainMet, false);
      assert.equal(evalDrainFail.criteriaMet, false);

      // Dimension C: Acoustic fidelity delta exceeds SLA
      const evalFidelityFail = evaluateRecoveryObjective(
        { rollbackLatencyMs: 50, trafficDrainMs: 100, acousticFidelityDelta: 0.15, restorationVerified: true },
        STANDARD_RECOVERY_OBJECTIVE
      );
      assert.equal(evalFidelityFail.fidelityMet, false);
      assert.equal(evalFidelityFail.criteriaMet, false);

      // Dimension D: Baseline restoration not verified
      const evalRestorationFail = evaluateRecoveryObjective(
        { rollbackLatencyMs: 50, trafficDrainMs: 100, acousticFidelityDelta: 0.01, restorationVerified: false },
        STANDARD_RECOVERY_OBJECTIVE
      );
      assert.equal(evalRestorationFail.restorationMet, false);
      assert.equal(evalRestorationFail.criteriaMet, false);
    });
  });

  // =========================================================================
  // 2. PATH-PROD Isolation & Stream Protection
  // =========================================================================
  describe("2. PATH-PROD Isolation & Stream Protection", () => {
    it("04: Rejects CURRENT production stream immediately without invoking rehearsal adapter", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const input = createStandardEnforceInput({
        executionStream: EXECUTION_STREAMS.CURRENT,
      });

      const result = await enforcer.enforceRollbackVerification(input);

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.certificate.path_prod_isolated, false);
      assert.equal(result.rollbackEvidence.path_prod_isolated, false);
      assert.equal(result.rollbackEvidence.rollback_verified, false);
      assert.ok(result.failureReason?.includes("Isolation assertion failed"));
      // CRITICAL: Adapter must NEVER be invoked on CURRENT stream
      assert.equal(adapter.invocationCount, 0);
    });

    it("05: assertIsolation directly throws IsolationAssertionError on CURRENT stream", () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      assert.throws(
        () => enforcer.assertIsolation(EXECUTION_STREAMS.CURRENT),
        (err: unknown) => {
          assert.ok(err instanceof IsolationAssertionError);
          assert.equal((err as IsolationAssertionError).stream, EXECUTION_STREAMS.CURRENT);
          return true;
        }
      );

      // SHADOW and DEV streams pass isolation assertion
      assert.doesNotThrow(() => enforcer.assertIsolation(EXECUTION_STREAMS.SHADOW));
      assert.doesNotThrow(() => enforcer.assertIsolation(EXECUTION_STREAMS.DEV));
    });
  });

  // =========================================================================
  // 3. Successful Rehearsal & Certificate Generation
  // =========================================================================
  describe("3. Successful Rehearsal", () => {
    it("06: Fully conforming rehearsal generates a sealed PASS certificate and passing evidence", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const input = createStandardEnforceInput({
        telemetryStopCriteriaConfigured: true,
        isStale: false,
      });

      const result = await enforcer.enforceRollbackVerification(input);

      assert.equal(result.isPassing, true);
      assert.equal(adapter.invocationCount, 1);
      assert.equal(result.certificate.verdict, "PASS");
      assert.equal(result.certificate.path_prod_isolated, true);
      assert.equal(result.certificate.verified_under_load, true);
      assert.equal(result.certificate.restoration_verified, true);
      assert.equal(result.certificate.measured_latency_ms, 45);
      assert.equal(result.certificate.measured_drain_ms, 120);
      assert.equal(result.certificate.measured_fidelity_delta, 0.02);
      assert.equal(result.certificate.record_integrity_metadata.algorithm, "SHA-256");

      // Evidence mapping
      assert.equal(result.rollbackEvidence.rollback_verified, true);
      assert.equal(result.rollbackEvidence.path_prod_isolated, true);
      assert.equal(result.rollbackEvidence.path_rollback_verified_under_load, true);
      assert.equal(result.rollbackEvidence.recovery_time_objective_met, true);
      assert.equal(result.rollbackEvidence.evidence_ref, result.certificate.certificate_id);
      assert.equal(result.rollbackEvidence.telemetry_stop_criteria_configured, true);
      assert.equal(result.rollbackEvidence.is_stale, false);
    });
  });

  // =========================================================================
  // 4. Peak-Load Proof (Critical Invariant)
  // =========================================================================
  describe("4. Peak-Load Proof", () => {
    it("07: Non-zero concurrency alone is insufficient; requires adapter proof of executed profile", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      // Case A: loadAppliedVerified is omitted / undefined
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: true,
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: undefined, // Omitted
      });
      const resA = await enforcer.enforceRollbackVerification(createStandardEnforceInput());
      assert.equal(resA.isPassing, false);
      assert.equal(resA.certificate.verified_under_load, false);
      assert.equal(resA.certificate.verdict, "FAIL");
      assert.equal(resA.rollbackEvidence.path_rollback_verified_under_load, false);

      // Case B: loadAppliedVerified is false
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: true,
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: false, // Explicitly false
      });
      const resB = await enforcer.enforceRollbackVerification(createStandardEnforceInput());
      assert.equal(resB.isPassing, false);
      assert.equal(resB.certificate.verified_under_load, false);

      // Case C: executedLoadProfileId is missing
      adapter.customExecutionHandler = async () => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: true,
        executedLoadProfileId: undefined, // Missing
        loadAppliedVerified: true,
      });
      const resC = await enforcer.enforceRollbackVerification(createStandardEnforceInput());
      assert.equal(resC.isPassing, false);
      assert.equal(resC.certificate.verified_under_load, false);

      // Case D: executedLoadProfileId mismatches requested profileId
      adapter.customExecutionHandler = async () => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: true,
        executedLoadProfileId: "SOME_OTHER_PROFILE_UNREQUESTED", // Mismatch
        loadAppliedVerified: true,
      });
      const resD = await enforcer.enforceRollbackVerification(createStandardEnforceInput());
      assert.equal(resD.isPassing, false);
      assert.equal(resD.certificate.verified_under_load, false);
      assert.ok(resD.failureReason?.includes("Simulated peak load execution was not verified"));

      // Case E: Concurrency > 0 exists in request but adapter provides zero load proof
      adapter.customExecutionHandler = async () => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: true,
        // No load fields at all
      });
      const resE = await enforcer.enforceRollbackVerification(
        createStandardEnforceInput({ loadProfile: { profileId: "PROFILE_X", concurrency: 500 } })
      );
      assert.equal(resE.isPassing, false);
      assert.equal(resE.certificate.verified_under_load, false);
      assert.equal(resE.rollbackEvidence.rollback_verified, false);
    });
  });

  // =========================================================================
  // 5. Individual Dimension Failures
  // =========================================================================
  describe("5. Individual Failure Dimensions", () => {
    it("08: Latency exceeding SLA forces certificate FAIL and rollback_verified false", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 250, // Exceeds SLA of 100ms
        trafficDrainMs: 120,
        acousticFidelityDelta: 0.02,
        restorationVerified: true,
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.rollbackEvidence.rollback_verified, false);
      assert.equal(result.rollbackEvidence.recovery_time_objective_met, false);
      assert.ok(result.failureReason?.includes("Rollback Latency"));
    });

    it("09: Traffic drain exceeding SLA forces certificate FAIL and rollback_verified false", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 50,
        trafficDrainMs: 600, // Exceeds SLA of 300ms
        acousticFidelityDelta: 0.02,
        restorationVerified: true,
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.rollbackEvidence.rollback_verified, false);
      assert.equal(result.rollbackEvidence.recovery_time_objective_met, false);
      assert.ok(result.failureReason?.includes("Traffic Drain"));
    });

    it("10: Acoustic fidelity exceeding SLA forces certificate FAIL but preserves recovery_time_objective_met if timing passed", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 45, // Meets <= 100ms SLA
        trafficDrainMs: 120, // Meets <= 300ms SLA
        acousticFidelityDelta: 0.35, // FAILS: Exceeds maxAcousticFidelityDelta of 0.05
        restorationVerified: true,
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      // Overall verification FAILS because fidelity is unacceptable
      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.rollbackEvidence.rollback_verified, false);

      // BUT timing dimensions (RTO) met SLA
      assert.equal(result.rollbackEvidence.recovery_time_objective_met, true);
      assert.ok(result.failureReason?.includes("Acoustic Fidelity Delta"));
    });

    it("11: Baseline restoration failure forces certificate FAIL and rollback_verified false", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: true,
        rollbackLatencyMs: 40,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.01,
        restorationVerified: false, // Failed restoration
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.certificate.restoration_verified, false);
      assert.equal(result.rollbackEvidence.rollback_verified, false);
    });

    it("12: Rehearsal adapter exception is contained and recorded in attempt history without fabricating metrics", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async () => {
        throw new Error("Simulated adapter cluster network partition");
      };
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      assert.equal(result.isPassing, false);
      assert.equal(result.certificate.verdict, "FAIL");
      assert.equal(result.rollbackEvidence.rollback_verified, false);
      assert.equal(result.rehearsalObservation.attemptHistory.length, 1);
      assert.equal(result.rehearsalObservation.attemptHistory[0].success, false);
      assert.ok(result.rehearsalObservation.attemptHistory[0].errorMessage?.includes("network partition"));
      assert.equal(result.certificate.measured_latency_ms, undefined);
    });
  });

  // =========================================================================
  // 6. Retry Protocol & Audit History Immutability
  // =========================================================================
  describe("6. Retry Protocol & Attempt Auditability", () => {
    it("13: Executes exactly one attempt by default when no retry policy is supplied", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: false,
        rollbackLatencyMs: 50,
        trafficDrainMs: 100,
        acousticFidelityDelta: 0.02,
        restorationVerified: false,
        failureReason: "Simulated transient lock conflict",
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(
        createStandardEnforceInput({ retryPolicy: undefined })
      );

      assert.equal(adapter.invocationCount, 1);
      assert.equal(result.rehearsalObservation.totalAttempts, 1);
      assert.equal(result.rehearsalObservation.attemptHistory.length, 1);
    });

    it("14: Retry protocol executes up to maxRetries; prior failures are NEVER erased from history", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      let attemptCount = 0;
      adapter.customExecutionHandler = async (params) => {
        attemptCount++;
        if (attemptCount === 1) {
          // Attempt 0 fails
          return {
            success: false,
            rollbackLatencyMs: 300,
            trafficDrainMs: 500,
            acousticFidelityDelta: 0.1,
            restorationVerified: false,
            failureReason: "Attempt 0: transient thread contention",
            executedLoadProfileId: params.loadProfile.profileId,
            loadAppliedVerified: true,
          };
        }
        // Attempt 1 succeeds
        return {
          success: true,
          rollbackLatencyMs: 40,
          trafficDrainMs: 100,
          acousticFidelityDelta: 0.02,
          restorationVerified: true,
          executedLoadProfileId: params.loadProfile.profileId,
          loadAppliedVerified: true,
        };
      };

      const runner = new RollbackRehearsalRunner({
        adapter,
        sleepFn: async () => {}, // Instant mock sleep
      });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(
        createStandardEnforceInput({
          retryPolicy: { maxRetries: 2, backoffMs: 50 },
        })
      );

      assert.equal(adapter.invocationCount, 2);
      assert.equal(result.rehearsalObservation.totalAttempts, 2);
      assert.equal(result.rehearsalObservation.attemptHistory.length, 2);

      // Verify Attempt 0 is preserved with failure diagnosis
      const attempt0 = result.rehearsalObservation.attemptHistory[0];
      assert.equal(attempt0.attemptIndex, 0);
      assert.equal(attempt0.success, false);
      assert.equal(attempt0.failureReason, "Attempt 0: transient thread contention");

      // Verify Attempt 1 is recorded
      const attempt1 = result.rehearsalObservation.attemptHistory[1];
      assert.equal(attempt1.attemptIndex, 1);
      assert.equal(attempt1.success, true);

      // Final certificate succeeds because retry succeeded
      assert.equal(result.certificate.verdict, "PASS");
      assert.equal(result.certificate.attempt_count, 2);
    });
  });

  // =========================================================================
  // 7. Telemetry Stop Criteria & Staleness Non-Defaulting
  // =========================================================================
  describe("7. Telemetry & Staleness Non-Defaulting", () => {
    it("15: Telemetry stop criteria is never defaulted to true (zero ?? true fail-open)", () => {
      const sampleCert: RollbackVerificationCertificate = {
        certificate_id: "rollcert_sample_001",
        package_id: "pkg_001",
        binding_id: "binding_001",
        recovery_objective_ref: "obj_ref_001",
        rehearsal_timestamp: "2026-10-20T12:00:00Z",
        simulated_failure_type: "DSP_FAULT",
        measured_latency_ms: 50,
        measured_drain_ms: 100,
        measured_fidelity_delta: 0.01,
        path_prod_isolated: true,
        verified_under_load: true,
        restoration_verified: true,
        verdict: "PASS",
        attempt_count: 1,
        record_integrity_metadata: {
          integrity_digest: "hash_sample",
          algorithm: "SHA-256",
          sealed_at: "2026-10-20T12:00:00Z",
          canonical_serialization_format: "CANONICAL-JSON",
        },
      };

      // Case A: Explicit true -> true
      const evTrue = mapCertificateToReadinessEvidence(sampleCert, { telemetryStopCriteriaConfigured: true });
      assert.equal(evTrue.telemetry_stop_criteria_configured, true);

      // Case B: Explicit false -> false
      const evFalse = mapCertificateToReadinessEvidence(sampleCert, { telemetryStopCriteriaConfigured: false });
      assert.equal(evFalse.telemetry_stop_criteria_configured, false);

      // Case C: Omitted -> undefined (NEVER defaulted to true)
      const evOmitted = mapCertificateToReadinessEvidence(sampleCert, {});
      assert.equal(evOmitted.telemetry_stop_criteria_configured, undefined);
    });

    it("16: Staleness is never defaulted to false (zero hardcoded freshness)", () => {
      const sampleCert: RollbackVerificationCertificate = {
        certificate_id: "rollcert_sample_002",
        package_id: "pkg_002",
        binding_id: "binding_002",
        recovery_objective_ref: "obj_ref_002",
        rehearsal_timestamp: "2026-10-20T12:00:00Z",
        simulated_failure_type: "DSP_FAULT",
        path_prod_isolated: true,
        verified_under_load: true,
        restoration_verified: true,
        verdict: "PASS",
        attempt_count: 1,
        record_integrity_metadata: {
          integrity_digest: "hash_sample",
          algorithm: "SHA-256",
          sealed_at: "2026-10-20T12:00:00Z",
          canonical_serialization_format: "CANONICAL-JSON",
        },
      };

      // Case A: Explicit true -> true
      const evTrue = mapCertificateToReadinessEvidence(sampleCert, { isStale: true });
      assert.equal(evTrue.is_stale, true);

      // Case B: Explicit false -> false
      const evFalse = mapCertificateToReadinessEvidence(sampleCert, { isStale: false });
      assert.equal(evFalse.is_stale, false);

      // Case C: Omitted -> undefined (NEVER hardcoded to false)
      const evOmitted = mapCertificateToReadinessEvidence(sampleCert, {});
      assert.equal(evOmitted.is_stale, undefined);
    });
  });

  // =========================================================================
  // 8. Cryptographic Tamper Evidence & Immutability
  // =========================================================================
  describe("8. Integrity & Immutability", () => {
    it("17: Valid sealed certificate verifies; tamper with any field throws RollbackVerificationTamperError", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());
      assert.equal(result.isPassing, true);

      // Pristine certificate verifies cleanly
      assert.equal(enforcer.verifyCertificate(result.certificate), true);

      // Tamper 1: Modify measured_latency_ms
      const tamperedLatency = { ...result.certificate, measured_latency_ms: 999 };
      assert.throws(
        () => enforcer.verifyCertificate(tamperedLatency as any),
        RollbackVerificationTamperError
      );

      // Tamper 2: Modify verdict
      const tamperedVerdict = { ...result.certificate, verdict: "FAIL" as const };
      assert.throws(
        () => enforcer.verifyCertificate(tamperedVerdict as any),
        RollbackVerificationTamperError
      );

      // Tamper 3: Modify package_id
      const tamperedPackage = { ...result.certificate, package_id: "pkg_forged_999" };
      assert.throws(
        () => enforcer.verifyCertificate(tamperedPackage as any),
        RollbackVerificationTamperError
      );

      // Tamper 4: Modify binding_id
      const tamperedBinding = { ...result.certificate, binding_id: "binding_forged_999" };
      assert.throws(
        () => enforcer.verifyCertificate(tamperedBinding as any),
        RollbackVerificationTamperError
      );
    });

    it("18: Returned structures are deeply frozen and immutable", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const result = await enforcer.enforceRollbackVerification(createStandardEnforceInput());

      assert.ok(Object.isFrozen(result));
      assert.ok(Object.isFrozen(result.certificate));
      assert.ok(Object.isFrozen(result.rollbackEvidence));
      assert.ok(Object.isFrozen(result.rehearsalObservation));
      assert.ok(Object.isFrozen(result.rehearsalObservation.attemptHistory));

      // Attempting mutation throws in strict mode
      assert.throws(() => {
        (result.certificate as any).verdict = "MUTATED";
      });
    });
  });

  // =========================================================================
  // 9. WP-21 Production Readiness & Hard Blocker 3 Integration
  // =========================================================================
  describe("9. WP-21 & WP-22 Governance Integration", () => {
    function createValidTestBinding(scopeId: string = "scope_core_amp_models_001") {
      const archProvider = new StaticArchitectureIntegrityReferenceProvider(
        TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
      );
      const bindingService = new VersionBindingService(
        undefined,
        undefined,
        undefined,
        archProvider
      );
      const dummyScope: any = {
        scope_id: scopeId,
        intake_id: "intake_001",
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: ["unit_amp_marshall_plexi_lead"],
        excluded_units: [],
        boundary_constraints: [],
        scope_inflation_protection: true,
      };
      return bindingService.bindVersions(dummyScope, {
        runtime_implementation_version: "2.1.0-alpha",
        model_configuration_version: "1.0.4",
        deterministic_rules_version: "3.2.1",
        gear_catalog_version: "2026.1",
        platform_exporter_version: "1.4.0",
        fixture_library_version: "3.0.0",
        target_platform_runtime_version: "AmpliTube5_v5.10",
        host_environment_version: "Node_v20.18.0",
        architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
      });
    }

    function createPristineReadinessInput(
      versionBinding: ValidationVersionBindingRecord,
      rollbackEvidence?: RollbackVerificationEvidence
    ) {
      const scopeRecord: any = {
        scope_id: "scope_core_amp_models_001",
        intake_id: "intake_001",
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: ["unit_amp_marshall_plexi_lead"],
        excluded_units: [],
        boundary_constraints: [],
        scope_inflation_protection: true,
      };

      const packageRecord: any = {
        package_id: "pkg_production_cutover_candidate_001",
        intake_id: "intake_001",
        scope_record_ref: scopeRecord.scope_id,
        version_binding_ref: versionBinding.binding_id,
        assigned_test_profiles: ["PROFILE-11"],
        validation_case_refs: ["case_001"],
        execution_record_refs: ["exec_001"],
        evidence_refs: ["obj_001"],
        outcome_record_ref: "outcome_001",
        gate8_decision_ref: "gate8_decision_001",
      };

      const objAcoustic: any = {
        objective_evidence_id: "obj_01",
        execution_id: "exec_01",
        metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
        measured_parameters: { delta_db: 0.25 },
        applied_threshold_profile_ref: "profile_acoustic_strict",
        tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
        measured_delta: 0.25,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
        artifacts_retained: [],
      };

      const objExport: any = {
        objective_evidence_id: "obj_export_01",
        execution_id: "exec_01",
        metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
        measured_parameters: { preset_serialization_valid: 1 },
        measured_delta: 0,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
        artifacts_retained: [],
      };

      const perc: any = {
        perceptual_evidence_id: "perc_01",
        execution_id: "exec_01",
        evaluator_id: "eval_expert_01",
        evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        listening_environment: {
          monitor_type: "GENELEC_8351B",
          calibrated_spl_profile_ref: "profile_spl_85dba",
          acoustic_treatment_level: "TREATED_STUDIO",
        },
        presented_stimuli_refs: { candidate: "stem_01_candidate", reference: "stem_01_ref" },
        perceptual_dimensions_evaluated: { tonal_balance: 9.0, dynamic_feel: 8.8, warmth: 9.2, punch: 8.9 },
        qualitative_observations: "Warm, punchy, authentic response.",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      };

      const uat: any = {
        uat_id: "uat_01",
        package_id: "pkg_production_cutover_candidate_001",
        evaluator_persona: "SESSION_GUITARIST",
        task_scenario_id: "scenario_crunch_solo",
        task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        task_duration_seconds: 120,
        workflow_satisfaction_rating: 9.5,
        cognitive_friction_notes: "None",
        musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uat_blockers_identified: [],
      };

      const exec: any = {
        execution_id: "exec_01",
        case_id: "case_01",
        profile_id: "PROFILE-11",
        fixture_id: "fix_01",
        binding_id: versionBinding.binding_id,
        execution_timestamp: "2026-03-20T12:30:00Z",
        execution_environment: "ubuntu_24.04_x86_64",
        input_audio_integrity_ref: "sha256:in_01",
        output_audio_integrity_ref: "sha256:out_01",
        execution_duration_ms: 150,
        anomalies_detected: [],
        raw_measurements: {},
        outcome: EXECUTION_OUTCOMES.COMPLETED,
        trace_ref: "trace_01",
      };

      const fix: any = {
        fixture_id: "fix_01",
        fixture_name: "Clean DI Stems",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "1.0.0",
        payload_integrity_ref: "sha256:fix_payload_01",
        declared_applicability_scope: ["unit_amp_marshall_plexi_lead"],
        provenance_metadata: {
          recording_engineer: "Lead Sound Engineer",
        },
        calibration_spec: "AES17_COMPLIANT_-18LUFS",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      };

      const upstreamGovernanceState = {
        reasoning_lifecycle_stages_completed: 14,
        principles_complied: true,
        causal_explainability_verified: true,
        provenance_intact: true,
        ungrounded_reasoning_detected: false,
        candidate_lesson_quarantined: true,
        upstream_violations: [],
      };

      return {
        packageRecord,
        scopeRecord,
        requestedScope: ["unit_amp_marshall_plexi_lead"],
        versionBinding,
        objectiveEvidence: [objAcoustic, objExport],
        perceptualEvaluations: [perc],
        uatEvaluations: [uat],
        executionRecords: [exec],
        fixtureRecords: [fix],
        upstreamGovernanceState,
        rollbackEvidence,
      };
    }

    it("19: Passing WP-27 evidence satisfies Pillar 4 and enables Gate 8 eligibility in WP-21", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const versionBinding = createValidTestBinding("scope_core_amp_models_001");

      const result = await enforcer.enforceRollbackVerification(
        createStandardEnforceInput({
          versionBindingRef: versionBinding.binding_id,
          telemetryStopCriteriaConfigured: true,
          isStale: false,
        })
      );

      const synthesizer = new ProductionReadinessSynthesizer();
      const readinessResult = synthesizer.synthesizeProductionReadiness(
        createPristineReadinessInput(versionBinding, result.rollbackEvidence)
      );

      assert.equal(readinessResult.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.SATISFIED);
      assert.equal(readinessResult.hardBlockersPresent.length, 0);
      assert.equal(readinessResult.gate8Eligible, true);
    });

    it("20: Failing WP-27 evidence triggers Hard Blocker 3 and sets gate_8_eligible false in WP-21", async () => {
      const adapter = new MockRollbackRehearsalAdapter();
      adapter.customExecutionHandler = async (params) => ({
        success: false,
        rollbackLatencyMs: 400,
        trafficDrainMs: 900,
        acousticFidelityDelta: 0.5,
        restorationVerified: false,
        failureReason: "Simulated complete failover crash",
        executedLoadProfileId: params.loadProfile.profileId,
        loadAppliedVerified: true,
      });
      const runner = new RollbackRehearsalRunner({ adapter });
      const enforcer = new ProductionProtectionEnforcer({ rehearsalRunner: runner });

      const versionBinding = createValidTestBinding("scope_core_amp_models_001");

      const result = await enforcer.enforceRollbackVerification(
        createStandardEnforceInput({
          versionBindingRef: versionBinding.binding_id,
          telemetryStopCriteriaConfigured: true,
          isStale: false,
        })
      );

      const synthesizer = new ProductionReadinessSynthesizer();
      const readinessResult = synthesizer.synthesizeProductionReadiness(
        createPristineReadinessInput(versionBinding, result.rollbackEvidence)
      );

      assert.equal(readinessResult.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
      assert.ok(readinessResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
      assert.equal(readinessResult.gate8Eligible, false);
    });

    it("21: Unperformed / absent rollback evidence triggers Hard Blocker 3 and sets Pillar 4 INCONCLUSIVE in WP-21", () => {
      const synthesizer = new ProductionReadinessSynthesizer();
      const versionBinding = createValidTestBinding("scope_core_amp_models_001");
      const readinessResult = synthesizer.synthesizeProductionReadiness(
        createPristineReadinessInput(versionBinding, undefined) // Absent rollback evidence
      );

      assert.equal(readinessResult.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
      assert.ok(readinessResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
      assert.equal(readinessResult.gate8Eligible, false);
    });

    it("22: Ineligible Record 20 prevents Gate 8 authorization in WP-22", () => {
      const adjudicationEngine = new Gate8AdjudicationEngine();
      const scope: any = {
        scope_id: "scope_001",
        intake_id: "intake_001",
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: ["unit_amp_marshall_plexi_lead"],
        excluded_units: [],
        boundary_constraints: [],
        scope_inflation_protection: true,
      };
      const binding = createValidTestBinding(scope.scope_id);
      const pkg: any = {
        package_id: "pkg_production_cutover_candidate_001",
        intake_id: "intake_001",
        scope_record_ref: scope.scope_id,
        version_binding_ref: binding.binding_id,
        assigned_test_profiles: ["PROFILE-11"],
        validation_case_refs: ["case_001"],
        execution_record_refs: ["exec_001"],
        evidence_refs: ["obj_001"],
      };

      const ineligibleReadinessRecord: any = {
        readiness_assessment_id: "readiness_ineligible_001",
        package_id: pkg.package_id,
        pillar_evaluations: {
          acoustic_musical_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
          reasoning_governance_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
          platform_operational_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
          rollback_safety_readiness: PILLAR_READINESS_STATUSES.DEFICIENT,
        },
        hard_blockers_present: [FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED],
        gate_8_eligible: false,
        synthesis_rationale: "Rollback verification failed.",
        assessment_timestamp: "2026-03-20T12:50:00.000Z",
      };

      const input: any = {
        packageRecord: pkg,
        readinessAssessmentRecord: ineligibleReadinessRecord,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: DEFAULT_GATE8_AUTHORITIES[0].officialId,
        authorizingOfficialKey: DEFAULT_GATE8_AUTHORITIES[0].keyOrSecret,
        requestedScope: ["unit_amp_marshall_plexi_lead"],
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.BLOCKED,
        blockedRationale: "Hard Blocker 3 present: rollback failed or unperformed",
        rollbackVerificationCertRef: "rollcert_failed_001",
      };

      const adjudicationResult = adjudicationEngine.adjudicateCutover(input);

      assert.equal(adjudicationResult.isAuthorized, false);
      assert.equal(adjudicationResult.decisionOutcome, ADOPTION_DECISION_OUTCOMES.BLOCKED);
      assert.equal(adjudicationResult.authorizedScope.length, 0);
    });
  });

  // =========================================================================
  // 10. Structural Governance & Boundary Invariants
  // =========================================================================
  describe("10. Structural Governance & Boundaries", () => {
    it("23: Preserves exactly 22 governed records; RollbackVerificationCertificate is NOT Record 23", () => {
      const recordKeys = Object.keys(VALIDATION_RECORD_SCHEMAS);
      assert.equal(recordKeys.length, 22);
      assert.ok(!recordKeys.includes("RollbackVerificationCertificate" as any));
    });

    it("24: Relationship graph edge catalogue contains exactly 14 governed edge types; zero rollback edges added", () => {
      const edgeTypes = Object.values(GOVERNED_EDGE_TYPES);
      assert.equal(edgeTypes.length, 14);
      assert.ok(!edgeTypes.includes("VERIFIED_BY_ROLLBACK" as any));
      assert.ok(!edgeTypes.includes("ROLLS_BACK_TO" as any));
    });

    it("25: WP-27 protection module exposes zero live production routing or cutover authority", async () => {
      const protectionModule = await import("../sound-engineer/validation/protection");
      const exportedKeys = Object.keys(protectionModule);

      // Verify no live cutover or production routing functions are exported
      assert.ok(!exportedKeys.includes("switchProductionTraffic"));
      assert.ok(!exportedKeys.includes("cutoverProduction"));
      assert.ok(!exportedKeys.includes("rollbackLiveProduction"));
      assert.ok(!exportedKeys.includes("updateRoutingTable"));
      assert.ok(!exportedKeys.includes("manipulateLoadBalancer"));
    });
  });
});
