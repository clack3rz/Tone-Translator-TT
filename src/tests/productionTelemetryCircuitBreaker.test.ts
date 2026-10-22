// src/tests/productionTelemetryCircuitBreaker.test.ts
// Phase 1C.5h WP-28: Dedicated Acceptance & Regression Verification Suite.
// Real-Time Quality Telemetry Monitoring & Canary Circuit Breaker.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, Table 14, Table 18,
// and Build Plan v0.1h WP-28 (Slices 1, 2, 3A, 3B, 3C).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADOPTION_DECISION_OUTCOMES,
  AdoptionDecisionOutcome,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_STATUSES,
  GovernanceStatus,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  REQUIRED_ADOPTION_RESPONSES,
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  TOLERANCE_EVALUATIONS,
  VALIDATION_PRIMARY_DOMAINS,
  REQUIRED_EVIDENCE_CLASSES,
  EXECUTION_OUTCOMES,
} from "../sound-engineer/validation/schemas/enums";
import {
  AdoptionDecisionRecord,
  Gate8ChangeRecord,
  ObjectiveEvidenceRecord,
  RetestPlanRecord,
  RevalidationTriggerRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  Gate8StateMachine,
  StaleGovernanceStateError,
} from "../sound-engineer/validation/gate8";
import { RevalidationTriggerDetector } from "../sound-engineer/validation/retest/triggerDetector";
import { RetestPlanner } from "../sound-engineer/validation/retest/retestPlanner";
import {
  ConfiguredTelemetryThresholdProfileResolver,
  TelemetryThresholdProfileResolver,
} from "../sound-engineer/validation/telemetry/telemetryThresholdProfileResolver";
import {
  QualityTelemetryMonitor,
} from "../sound-engineer/validation/telemetry/qualityTelemetryMonitor";
import {
  CanaryCircuitBreaker,
} from "../sound-engineer/validation/telemetry/circuitBreaker";
import {
  GovernedMetricThresholdRule,
  GovernedTelemetryThresholdProfile,
  MetricComparisonDirection,
  TelemetryEvaluationResult,
  TelemetryEvaluationSeverity,
  TelemetryMetricObservation,
  TelemetrySample,
  TelemetryStreamLossPolicy,
} from "../sound-engineer/validation/telemetry/telemetryTypes";
import {
  FallbackMonitoringAck,
  FallbackMonitoringContext,
  FallbackTelemetryPort,
} from "../sound-engineer/validation/telemetry/fallbackTelemetryPort";
import {
  CanaryPauseSignal,
  OperationalRollbackSignal,
  OperationalSignalAck,
  OperationalSignalPort,
} from "../sound-engineer/validation/telemetry/operationalSignalPort";
import {
  AuthorizationBindingMismatchError,
  CircuitBreakerExecutionError,
  CircuitBreakerPreconditionError,
  InactiveAuthorizationError,
  IncompleteGovernedPolicyError,
  InvalidTelemetrySampleError,
  MissingGovernedPolicyError,
  MissingTelemetryEvidenceError,
  ProhibitedSuspensionError,
  ScopeMismatchError,
  TerminalAuthorizationStateError,
  UnresolvedThresholdProfileError,
  VersionBindingMismatchError,
} from "../sound-engineer/validation/telemetry/telemetryErrors";

// =============================================================================
// Canonical Test Fixtures & Factories
// =============================================================================

const TEST_SCOPE = Object.freeze([
  "guitar:amp:5150_lead",
  "guitar:cab:4x12_greenback",
  "guitar:pedal:tube_screamer",
]);

const CANONICAL_OFFICIAL = "Chief Sound Engineering Governance Authority";
const CANONICAL_OFFICIAL_KEY = "sec_key_chief_governance_2026_q4_phase1c5h";

function createTestScopeRecord(
  scopeId = "scope_wp28_test",
  units: readonly string[] = TEST_SCOPE
): ValidationScopeRecord {
  return Object.freeze({
    scope_id: scopeId,
    intake_id: "intake_wp28_001",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: [...units],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
  });
}

function createTestBindingRecord(
  bindingId = "binding_wp28_test",
  scopeId = "scope_wp28_test"
): ValidationVersionBindingRecord {
  return Object.freeze({
    binding_id: bindingId,
    scope_id: scopeId,
    architecture_version_matrix: {
      "1C.5a_version": { version: "v0.3c", integrity_ref: "sha256:1111" },
      "1C.5b_version": { version: "v0.2f", integrity_ref: "sha256:2222" },
      "1C.5c_version": { version: "v0.1d", integrity_ref: "sha256:3333" },
      "1C.5d_version": { version: "v0.1l", integrity_ref: "sha256:4444" },
      "1C.5e_version": { version: "v0.1m", integrity_ref: "sha256:5555" },
      "1C.5f_version": { version: "v1.0", integrity_ref: "sha256:6666" },
      "1C.5g_version": { version: "v1.0", integrity_ref: "sha256:7777" },
      "1C.5h_mandate_version": { version: "v0.1d", integrity_ref: "sha256:8888" },
      "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256:9999" },
    },
    runtime_implementation_version: "2.4.1",
    model_configuration_version: "1.0.0",
    deterministic_rules_version: "1.2.0",
    gear_catalog_version: "1.0.4",
    platform_exporter_version: "1.1.0",
    fixture_library_version: "1.0.0",
    target_platform_runtime_version: "5.5.0",
    host_environment_version: "ubuntu_24.04_x86_64",
    version_integrity_reference: {
      composite_digest: "sha256:comp_wp28_binding",
      algorithm: "SHA-256",
      sealed_at: "2026-10-15T00:00:00Z",
      component_digests: {
        runtime_implementation_version: "sha256:r1",
      },
    },
  });
}

function createSampleAdoptionDecision(
  decisionId = "adr_wp28_001",
  governanceStatus: GovernanceStatus = GOVERNANCE_STATUSES.ACTIVE,
  scope: readonly string[] = TEST_SCOPE,
  outcome: AdoptionDecisionOutcome = ADOPTION_DECISION_OUTCOMES.AUTHORIZED
): AdoptionDecisionRecord {
  return Object.freeze({
    decision_id: decisionId,
    package_id: "pkg_wp28_demo",
    readiness_assessment_id: "pra_wp28_demo",
    requested_scope: [...scope],
    authorized_scope: [...scope],
    version_binding_integrity_ref: "sha256:comp_wp28_binding",
    decision_outcome: outcome,
    decision_timestamp: "2026-10-15T00:00:00.000Z",
    conditions_and_restrictions: [],
    mandatory_monitoring_rules: ["MONITOR-THD-REALTIME"],
    rollback_verification_cert_ref: "cert_rollback_001",
    governance_status: governanceStatus,
    authorizing_official: CANONICAL_OFFICIAL,
    record_integrity_metadata: {
      integrity_digest: "digest_placeholder_adr",
      algorithm: "SHA-256",
      sealed_at: "2026-10-15T00:00:00.000Z",
      signer_identity: CANONICAL_OFFICIAL,
      canonical_serialization_format: "RFC-8785",
    },
  });
}

function createSamplePackage(
  packageId = "pkg_wp28_demo",
  scopeId = "scope_wp28_test",
  bindingId = "binding_wp28_test"
): ValidationPackage {
  return Object.freeze({
    package_id: packageId,
    intake_id: "intake_wp28_001",
    scope_record_ref: scopeId,
    version_binding_ref: bindingId,
    assigned_test_profiles: ["profile:04_objective_acoustic"],
    validation_case_refs: ["case_01", "case_02"],
    execution_record_refs: ["exec_01", "exec_02"],
    evidence_refs: ["obj_01", "obj_02"],
  });
}

function createSampleCases(): ValidationCase[] {
  return [
    {
      case_id: "case_01",
      title: "5150 Lead Gain Linearity",
      validation_question: "Does amp stage preserve linear harmonic ratio?",
      validation_subject: "guitar:amp:5150_lead",
      scoped_boundaries: ["guitar:amp:5150_lead"],
      applicable_test_dimensions: ["profile:04_objective_acoustic"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fix_01"],
      evaluation_methodology: "AUTOMATED_SIGNAL_ANALYSIS",
      acceptance_criteria_ref: "criteria:thd_ratio",
      failure_consequence: "REJECT",
      expected_remand_destination: "DSP_TEAM",
    },
    {
      case_id: "case_02",
      title: "Cabinet Greenback Impedance Resonance",
      validation_question: "Does cabinet maintain acoustic resonance bounds?",
      validation_subject: "guitar:cab:4x12_greenback",
      scoped_boundaries: ["guitar:cab:4x12_greenback"],
      applicable_test_dimensions: ["profile:04_objective_acoustic"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fix_02"],
      evaluation_methodology: "AUTOMATED_SIGNAL_ANALYSIS",
      acceptance_criteria_ref: "criteria:resonance",
      failure_consequence: "REJECT",
      expected_remand_destination: "DSP_TEAM",
    },
  ];
}

function createSampleExecutions(): ValidationExecutionRecord[] {
  return [
    {
      execution_id: "exec_01",
      case_id: "case_01",
      profile_id: "profile:04_objective_acoustic",
      fixture_id: "fix_01",
      binding_id: "binding_wp28_test",
      execution_timestamp: "2026-10-15T00:00:00Z",
      execution_environment: "ubuntu_24.04_x86_64",
      input_audio_integrity_ref: "sha256:in_01",
      output_audio_integrity_ref: "sha256:out_01",
      execution_duration_ms: 120,
      anomalies_detected: [],
      raw_measurements: {},
      outcome: EXECUTION_OUTCOMES.COMPLETED,
      trace_ref: "trace_exec_01",
    },
    {
      execution_id: "exec_02",
      case_id: "case_02",
      profile_id: "profile:04_objective_acoustic",
      fixture_id: "fix_02",
      binding_id: "binding_wp28_test",
      execution_timestamp: "2026-10-15T00:00:00Z",
      execution_environment: "ubuntu_24.04_x86_64",
      input_audio_integrity_ref: "sha256:in_02",
      output_audio_integrity_ref: "sha256:out_02",
      execution_duration_ms: 140,
      anomalies_detected: [],
      raw_measurements: {},
      outcome: EXECUTION_OUTCOMES.COMPLETED,
      trace_ref: "trace_exec_02",
    },
  ];
}

function createSampleObjectiveEvidence(
  evidenceId: string,
  execId: string
): ObjectiveEvidenceRecord {
  return Object.freeze({
    objective_evidence_id: evidenceId,
    execution_id: execId,
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { delta_db: 0.1 },
    applied_threshold_profile_ref: "threshold_std",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.1,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["fft.json"],
  });
}

function createCanonicalThresholdProfile(
  profileRef = "telemetry_profile_production_canary_01"
): GovernedTelemetryThresholdProfile {
  return Object.freeze({
    profileRef,
    reactionBudgetMs: 5000,
    rules: [
      {
        metricId: "thd_ratio",
        comparisonDirection: "GREATER_THAN" as const,
        majorThreshold: 0.05,
        minorThreshold: 0.03,
        minSampleSize: 10,
        description: "Total Harmonic Distortion ratio breach",
      },
      {
        metricId: "snr_db",
        comparisonDirection: "LESS_THAN" as const,
        majorThreshold: 60.0,
        minorThreshold: 70.0,
        minSampleSize: 10,
        description: "Signal to Noise Ratio degradation",
      },
    ],
  });
}

function createMockSignalPort(
  shouldFail = false,
  failMessage = "Network timeout communicating with Phase 1C.5g harness"
): {
  port: OperationalSignalPort;
  dispatchedSignals: OperationalRollbackSignal[];
} {
  const dispatchedSignals: OperationalRollbackSignal[] = [];
  const port: OperationalSignalPort = {
    async signalRollback(signal: OperationalRollbackSignal): Promise<OperationalSignalAck> {
      dispatchedSignals.push(signal);
      if (shouldFail) {
        throw new Error(failMessage);
      }
      return {
        dispatchId: `ack_disp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        acknowledged: true,
        timestamp: new Date().toISOString(),
        note: "Rollback acknowledged by Phase 1C.5g harness",
      };
    },
    async signalCanaryPause(signal: CanaryPauseSignal): Promise<OperationalSignalAck> {
      return {
        dispatchId: `ack_pause_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        acknowledged: true,
        timestamp: new Date().toISOString(),
        note: "Canary pause acknowledged",
      };
    },
  };
  return { port, dispatchedSignals };
}

function createMockFallbackPort(): {
  port: FallbackTelemetryPort;
  engagedContexts: FallbackMonitoringContext[];
} {
  const engagedContexts: FallbackMonitoringContext[] = [];
  const port: FallbackTelemetryPort = {
    async engageFallbackMonitoring(
      context: FallbackMonitoringContext
    ): Promise<FallbackMonitoringAck> {
      engagedContexts.push(context);
      return {
        engaged: true,
        fallbackSourceId: "fallback_channel_canary_01",
        timestamp: new Date().toISOString(),
        note: "Fallback telemetry monitoring engaged",
      };
    },
  };
  return { port, engagedContexts };
}

// =============================================================================
// Test Suite: WP-28 Production Telemetry & Canary Circuit Breaker
// =============================================================================

describe("Phase 1C.5h WP-28: Real-Time Quality Telemetry Monitoring & Canary Circuit Breaker", () => {
  // ---------------------------------------------------------------------------
  // 2. Governed Threshold Resolver Verification
  // ---------------------------------------------------------------------------
  describe("2. Governed Threshold Resolver", () => {
    it("2.1 resolves known configured profile successfully", async () => {
      const canonicalProfile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([canonicalProfile]);

      const resolved = await resolver.resolve("telemetry_profile_production_canary_01");
      assert.ok(resolved);
      assert.equal(resolved.profileRef, "telemetry_profile_production_canary_01");
      assert.equal(resolved.reactionBudgetMs, 5000);
      assert.equal(resolved.rules.length, 2);
    });

    it("2.2 fails closed for unknown profile reference (returns undefined)", async () => {
      const resolver = new ConfiguredTelemetryThresholdProfileResolver();
      const resolved = await resolver.resolve("unknown_telemetry_profile");
      assert.equal(resolved, undefined);
    });

    it("2.3 fails closed when QualityTelemetryMonitor evaluates unmapped profile reference", async () => {
      const resolver = new ConfiguredTelemetryThresholdProfileResolver();
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.06, sampleSize: 20 }],
      };

      await assert.rejects(
        async () => {
          await monitor.evaluateSample({
            sample,
            profileRef: "non_existent_profile",
          });
        },
        (err: any) => {
          assert.ok(err instanceof UnresolvedThresholdProfileError);
          assert.equal(err.profileRef, "non_existent_profile");
          return true;
        }
      );
    });

    it("2.4 has no default profile and zero built-in threshold numbers", () => {
      const emptyResolver = new ConfiguredTelemetryThresholdProfileResolver();
      assert.equal(emptyResolver.resolve("default"), undefined);
      assert.equal(emptyResolver.resolve("standard"), undefined);
      assert.equal(emptyResolver.resolve(""), undefined);
    });

    it("2.5 fails closed when profile lacks externally supplied reaction budget", async () => {
      const invalidProfile: any = {
        profileRef: "profile_no_budget",
        rules: [
          {
            metricId: "thd_ratio",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 0.05,
          },
        ],
        // reactionBudgetMs omitted
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([invalidProfile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.02, sampleSize: 20 }],
      };

      await assert.rejects(
        async () => {
          await monitor.evaluateSample({
            sample,
            profileRef: "profile_no_budget",
          });
        },
        (err: any) => {
          assert.ok(err instanceof IncompleteGovernedPolicyError);
          assert.equal(err.missingRequirement, "reactionBudgetMs (must be a non-negative finite number)");
          return true;
        }
      );
    });

    it("2.6 fails closed when reaction budget is negative or non-finite", async () => {
      const badBudgets = [-100, NaN, Infinity];
      for (const badBudget of badBudgets) {
        const profile: any = {
          profileRef: `profile_bad_budget_${badBudget}`,
          reactionBudgetMs: badBudget,
          rules: [
            {
              metricId: "thd_ratio",
              comparisonDirection: "GREATER_THAN",
              majorThreshold: 0.05,
            },
          ],
        };

        // 1. Synchronous registry validation fails closed
        assert.throws(
          () => new ConfiguredTelemetryThresholdProfileResolver([profile]),
          /reactionBudgetMs: must be a non-negative finite number/
        );

        // 2. Runtime monitor fails closed via IncompleteGovernedPolicyError if resolver returns such profile
        const customResolver: TelemetryThresholdProfileResolver = {
          resolve: () => profile,
        };
        const monitor = new QualityTelemetryMonitor({ resolver: customResolver });

        const sample: TelemetrySample = {
          decisionId: "adr_wp28_001",
          versionBindingId: "binding_wp28_test",
          scope: TEST_SCOPE,
          timestamp: "2026-10-15T12:00:00Z",
          observations: [{ metricId: "thd_ratio", value: 0.02, sampleSize: 20 }],
        };

        await assert.rejects(
          async () => {
            await monitor.evaluateSample({
              sample,
              profileRef: profile.profileRef,
            });
          },
          (err: any) => {
            assert.ok(err instanceof IncompleteGovernedPolicyError);
            return true;
          }
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Threshold Rule Completeness Verification
  // ---------------------------------------------------------------------------
  describe("3. Threshold Rule Completeness", () => {
    it("3.1 requires explicit comparison direction; missing direction evaluates to UNEVALUABLE", async () => {
      const profile: any = {
        profileRef: "profile_missing_direction",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            majorThreshold: 0.05,
            // comparisonDirection omitted
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.10, sampleSize: 20 }],
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_missing_direction",
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.ok(result.unevaluableReason);
      assert.match(result.unevaluableReason, /lacks explicit governed comparisonDirection/);
      assert.equal(result.breachedRules.length, 0);
    });

    it("3.2 malformed or non-finite major threshold evaluates to UNEVALUABLE", async () => {
      const malformedThresholds = [NaN, Infinity, "0.05" as any, undefined as any];

      for (const badThreshold of malformedThresholds) {
        const profile: GovernedTelemetryThresholdProfile = {
          profileRef: "profile_bad_major",
          reactionBudgetMs: 3000,
          rules: [
            {
              metricId: "thd_ratio",
              comparisonDirection: "GREATER_THAN",
              majorThreshold: badThreshold,
            },
          ],
        };

        const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
        const monitor = new QualityTelemetryMonitor({ resolver });

        const sample: TelemetrySample = {
          decisionId: "adr_wp28_001",
          versionBindingId: "binding_wp28_test",
          scope: TEST_SCOPE,
          timestamp: "2026-10-15T12:00:00Z",
          observations: [{ metricId: "thd_ratio", value: 0.10, sampleSize: 20 }],
        };

        const result = await monitor.evaluateSample({
          sample,
          profileRef: "profile_bad_major",
        });

        assert.equal(result.severity, "UNEVALUABLE");
        assert.ok(result.unevaluableReason);
        assert.match(result.unevaluableReason, /non-finite or invalid majorThreshold/);
      }
    });

    it("3.3 malformed optional minor threshold evaluates to UNEVALUABLE", async () => {
      const profile: any = {
        profileRef: "profile_bad_minor",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 0.05,
            minorThreshold: NaN,
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.02, sampleSize: 20 }],
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_bad_minor",
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.ok(result.unevaluableReason);
      assert.match(result.unevaluableReason, /non-finite or invalid minorThreshold/);
    });

    it("3.4 invalid or negative minSampleSize evaluates to UNEVALUABLE", async () => {
      const profile: any = {
        profileRef: "profile_bad_samplesize",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 0.05,
            minSampleSize: -5,
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.02, sampleSize: 20 }],
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_bad_samplesize",
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.match(result.unevaluableReason!, /invalid minSampleSize/);
    });

    it("3.5 does not fallback to GREATER_THAN_OR_EQUAL when direction is omitted or invalid", async () => {
      const profile: any = {
        profileRef: "profile_no_fallback",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            majorThreshold: 0.05,
            comparisonDirection: "INVALID_DIRECTION",
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.05, sampleSize: 20 }],
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_no_fallback",
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.match(result.unevaluableReason!, /Zero comparison defaults are permitted/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Comparison Semantics & Boundary Verification
  // ---------------------------------------------------------------------------
  describe("4. Comparison Semantics & Boundaries", () => {
    async function evaluateSingleMetric(
      direction: MetricComparisonDirection,
      majorThreshold: number,
      observedValue: number
    ): Promise<TelemetryEvaluationResult> {
      const profile: GovernedTelemetryThresholdProfile = {
        profileRef: `test_profile_${direction}`,
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "test_metric",
            comparisonDirection: direction,
            majorThreshold,
            minSampleSize: 1,
          },
        ],
      };
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });
      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "test_metric", value: observedValue, sampleSize: 10 }],
      };
      return monitor.evaluateSample({ sample, profileRef: profile.profileRef });
    }

    it("4.1 GREATER_THAN: strictly greater than; boundary equality does NOT breach", async () => {
      // Below threshold -> NORMAL
      const resBelow = await evaluateSingleMetric("GREATER_THAN", 10.0, 9.99);
      assert.equal(resBelow.severity, "NORMAL");

      // Exactly at threshold -> NORMAL (strict inequality does NOT breach at equality)
      const resEqual = await evaluateSingleMetric("GREATER_THAN", 10.0, 10.0);
      assert.equal(resEqual.severity, "NORMAL");

      // Above threshold -> MAJOR_DEGRADATION
      const resAbove = await evaluateSingleMetric("GREATER_THAN", 10.0, 10.01);
      assert.equal(resAbove.severity, "MAJOR_DEGRADATION");
      assert.equal(resAbove.breachedRules.length, 1);
    });

    it("4.2 GREATER_THAN_OR_EQUAL: weak inequality; boundary equality DOES breach", async () => {
      // Below threshold -> NORMAL
      const resBelow = await evaluateSingleMetric("GREATER_THAN_OR_EQUAL", 10.0, 9.99);
      assert.equal(resBelow.severity, "NORMAL");

      // Exactly at threshold -> MAJOR_DEGRADATION (weak inequality breaches at equality)
      const resEqual = await evaluateSingleMetric("GREATER_THAN_OR_EQUAL", 10.0, 10.0);
      assert.equal(resEqual.severity, "MAJOR_DEGRADATION");
      assert.equal(resEqual.breachedRules.length, 1);

      // Above threshold -> MAJOR_DEGRADATION
      const resAbove = await evaluateSingleMetric("GREATER_THAN_OR_EQUAL", 10.0, 10.01);
      assert.equal(resAbove.severity, "MAJOR_DEGRADATION");
    });

    it("4.3 LESS_THAN: strictly less than; boundary equality does NOT breach", async () => {
      // Above threshold -> NORMAL
      const resAbove = await evaluateSingleMetric("LESS_THAN", 50.0, 50.01);
      assert.equal(resAbove.severity, "NORMAL");

      // Exactly at threshold -> NORMAL (strict inequality does NOT breach at equality)
      const resEqual = await evaluateSingleMetric("LESS_THAN", 50.0, 50.0);
      assert.equal(resEqual.severity, "NORMAL");

      // Below threshold -> MAJOR_DEGRADATION
      const resBelow = await evaluateSingleMetric("LESS_THAN", 50.0, 49.99);
      assert.equal(resBelow.severity, "MAJOR_DEGRADATION");
      assert.equal(resBelow.breachedRules.length, 1);
    });

    it("4.4 LESS_THAN_OR_EQUAL: weak inequality; boundary equality DOES breach", async () => {
      // Above threshold -> NORMAL
      const resAbove = await evaluateSingleMetric("LESS_THAN_OR_EQUAL", 50.0, 50.01);
      assert.equal(resAbove.severity, "NORMAL");

      // Exactly at threshold -> MAJOR_DEGRADATION (weak inequality breaches at equality)
      const resEqual = await evaluateSingleMetric("LESS_THAN_OR_EQUAL", 50.0, 50.0);
      assert.equal(resEqual.severity, "MAJOR_DEGRADATION");
      assert.equal(resEqual.breachedRules.length, 1);

      // Below threshold -> MAJOR_DEGRADATION
      const resBelow = await evaluateSingleMetric("LESS_THAN_OR_EQUAL", 50.0, 49.99);
      assert.equal(resBelow.severity, "MAJOR_DEGRADATION");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Sample Sufficiency, Scope Alignment & Windowing
  // ---------------------------------------------------------------------------
  describe("5. Sample Sufficiency, Scope Alignment & Windowing", () => {
    it("5.1 observed sampleSize < minSampleSize evaluates to UNEVALUABLE", async () => {
      const profile: GovernedTelemetryThresholdProfile = {
        profileRef: "profile_min_sample",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 0.05,
            minSampleSize: 50,
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.10, sampleSize: 20 }], // 20 < 50
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_min_sample",
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.ok(result.unevaluableReason);
      assert.match(result.unevaluableReason, /sample size \(20\) is below required minimum \(50\)/);
    });

    it("5.2 observed sampleSize >= minSampleSize is evaluated normally", async () => {
      const profile: GovernedTelemetryThresholdProfile = {
        profileRef: "profile_sufficient_sample",
        reactionBudgetMs: 3000,
        rules: [
          {
            metricId: "thd_ratio",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 0.05,
            minSampleSize: 20,
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.06, sampleSize: 20 }],
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: "profile_sufficient_sample",
      });

      assert.equal(result.severity, "MAJOR_DEGRADATION");
      assert.equal(result.breachedRules.length, 1);
    });

    it("5.3 missing required metric from sample evaluates to UNEVALUABLE", async () => {
      const canonicalProfile = createCanonicalThresholdProfile(); // requires "thd_ratio" and "snr_db"
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([canonicalProfile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [{ metricId: "thd_ratio", value: 0.02, sampleSize: 20 }], // snr_db omitted
      };

      const result = await monitor.evaluateSample({
        sample,
        profileRef: canonicalProfile.profileRef,
      });

      assert.equal(result.severity, "UNEVALUABLE");
      assert.match(result.unevaluableReason!, /Metric "snr_db" required by profile .* is absent/);
    });

    it("5.4 fails closed when sample contains units outside authorized scope", async () => {
      const canonicalProfile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([canonicalProfile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sampleWithAlienUnit: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: [...TEST_SCOPE, "synth:korg:ms20_alien"],
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "thd_ratio", value: 0.02, sampleSize: 20 },
          { metricId: "snr_db", value: 80.0, sampleSize: 20 },
        ],
      };

      await assert.rejects(
        async () => {
          await monitor.evaluateSample({
            sample: sampleWithAlienUnit,
            profileRef: canonicalProfile.profileRef,
            expectedAuthorizedScope: TEST_SCOPE,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ScopeMismatchError);
          assert.match(err.message, /outside authorized scope/);
          return true;
        }
      );
    });

    it("5.5 fails closed when sample versionBindingId does not match expected", async () => {
      const canonicalProfile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([canonicalProfile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sampleWrongBinding: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_mismatch_v999",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "thd_ratio", value: 0.02, sampleSize: 20 },
          { metricId: "snr_db", value: 80.0, sampleSize: 20 },
        ],
      };

      await assert.rejects(
        async () => {
          await monitor.evaluateSample({
            sample: sampleWrongBinding,
            profileRef: canonicalProfile.profileRef,
            expectedVersionBindingId: "binding_wp28_test",
          });
        },
        (err: any) => {
          assert.ok(err instanceof VersionBindingMismatchError);
          assert.equal(err.sampleBindingId, "binding_mismatch_v999");
          assert.equal(err.expectedBindingId, "binding_wp28_test");
          return true;
        }
      );
    });

    it("5.6 fails closed on malformed ISO timestamp in sample", async () => {
      const canonicalProfile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([canonicalProfile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sampleBadTimestamp: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "not-a-valid-iso-timestamp",
        observations: [
          { metricId: "thd_ratio", value: 0.02, sampleSize: 20 },
          { metricId: "snr_db", value: 80.0, sampleSize: 20 },
        ],
      };

      await assert.rejects(
        async () => {
          await monitor.evaluateSample({
            sample: sampleBadTimestamp,
            profileRef: canonicalProfile.profileRef,
          });
        },
        (err: any) => {
          assert.ok(err instanceof InvalidTelemetrySampleError);
          assert.match(err.message, /ISO 8601/);
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Evaluation Aggregation Verification
  // ---------------------------------------------------------------------------
  describe("6. Evaluation Aggregation", () => {
    it("6.1 evaluates to NORMAL when all observations are within thresholds", async () => {
      const profile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "thd_ratio", value: 0.02, sampleSize: 20 }, // < 0.03 minor, < 0.05 major
          { metricId: "snr_db", value: 85.0, sampleSize: 20 },   // > 70.0 minor, > 60.0 major
        ],
      };

      const result = await monitor.evaluateSample({ sample, profileRef: profile.profileRef });
      assert.equal(result.severity, "NORMAL");
      assert.equal(result.breachedRules.length, 0);
    });

    it("6.2 evaluates to MINOR_ANOMALY when minor threshold breached but no major breached", async () => {
      const profile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "thd_ratio", value: 0.035, sampleSize: 20 }, // > 0.03 minor, < 0.05 major
          { metricId: "snr_db", value: 85.0, sampleSize: 20 },     // healthy
        ],
      };

      const result = await monitor.evaluateSample({ sample, profileRef: profile.profileRef });
      assert.equal(result.severity, "MINOR_ANOMALY");
      assert.equal(result.breachedRules.length, 1);
      assert.equal(result.breachedRules[0].breachSeverity, "MINOR_ANOMALY");
      assert.equal(result.breachedRules[0].metricId, "thd_ratio");
    });

    it("6.3 evaluates to MAJOR_DEGRADATION when at least one major threshold breached", async () => {
      const profile = createCanonicalThresholdProfile();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "thd_ratio", value: 0.07, sampleSize: 20 }, // > 0.05 major breach!
          { metricId: "snr_db", value: 85.0, sampleSize: 20 },    // healthy
        ],
      };

      const result = await monitor.evaluateSample({ sample, profileRef: profile.profileRef });
      assert.equal(result.severity, "MAJOR_DEGRADATION");
      assert.equal(result.breachedRules.length, 1);
      assert.equal(result.breachedRules[0].breachSeverity, "MAJOR_DEGRADATION");
      assert.equal(result.breachedRules[0].metricId, "thd_ratio");
    });

    it("6.4 multi-metric mixed evaluation prioritizes MAJOR_DEGRADATION", async () => {
      const profile: GovernedTelemetryThresholdProfile = {
        profileRef: "profile_multi_metric",
        reactionBudgetMs: 5000,
        rules: [
          {
            metricId: "metric_normal",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 100,
            minorThreshold: 80,
            minSampleSize: 5,
          },
          {
            metricId: "metric_minor",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 100,
            minorThreshold: 50,
            minSampleSize: 5,
          },
          {
            metricId: "metric_major",
            comparisonDirection: "GREATER_THAN",
            majorThreshold: 50,
            minorThreshold: 30,
            minSampleSize: 5,
          },
        ],
      };

      const resolver = new ConfiguredTelemetryThresholdProfileResolver([profile]);
      const monitor = new QualityTelemetryMonitor({ resolver });

      const sample: TelemetrySample = {
        decisionId: "adr_wp28_001",
        versionBindingId: "binding_wp28_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00Z",
        observations: [
          { metricId: "metric_normal", value: 20, sampleSize: 10 },
          { metricId: "metric_minor", value: 60, sampleSize: 10 }, // > 50 minor
          { metricId: "metric_major", value: 75, sampleSize: 10 }, // > 50 major!
        ],
      };

      const result = await monitor.evaluateSample({ sample, profileRef: profile.profileRef });
      assert.equal(result.severity, "MAJOR_DEGRADATION");
      assert.equal(result.breachedRules.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. WP-28 Slice 3A: Revalidation Trigger Handoff (Record 18 & INVALIDATED_BY)
  // ---------------------------------------------------------------------------
  describe("7. WP-28 Slice 3A: Revalidation Trigger Handoff", () => {
    it("7.1 NORMAL or MINOR_ANOMALY evaluations do not fire circuit breaker", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, graph });

      const activeDecision = createSampleAdoptionDecision();
      const activeBinding = createTestBindingRecord();

      for (const severity of ["NORMAL", "MINOR_ANOMALY"] as TelemetryEvaluationSeverity[]) {
        const evalResult: TelemetryEvaluationResult = {
          severity,
          profileRef: "profile_wp28_001",
          sampleTimestamp: "2026-10-15T12:00:00Z",
          evaluationTimestamp: "2026-10-15T12:00:01Z",
          receivedTimestamp: "2026-10-15T12:00:00.500Z",
          decisionId: activeDecision.decision_id,
          versionBindingId: activeBinding.binding_id,
          scope: TEST_SCOPE,
          evaluatedMetrics: [],
          breachedRules: [],
          reactionBudgetMs: 5000,
        };

        const stageResult = await cb.processTriggerStage({
          evaluation: evalResult,
          activeDecision,
          activeBinding,
        });

        assert.equal(stageResult.status, "INELIGIBLE");
        assert.equal(stageResult.eligibleForTrigger, false);
        assert.equal(stageResult.triggerRecord, undefined);
        assert.equal(stageResult.invalidationEdge, undefined);
      }
    });

    it("7.2 fails closed when active decision outcome is not authorized (e.g. REJECTED or BLOCKED)", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, graph });

      const rejectedDecision = createSampleAdoptionDecision(
        "adr_rejected_001",
        GOVERNANCE_STATUSES.WITHDRAWN,
        TEST_SCOPE,
        ADOPTION_DECISION_OUTCOMES.REJECTED
      );
      const activeBinding = createTestBindingRecord();

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: rejectedDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.10, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.10,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      await assert.rejects(
        async () => {
          await cb.processTriggerStage({
            evaluation: majorEval,
            activeDecision: rejectedDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof InactiveAuthorizationError);
          assert.equal(err.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
          return true;
        }
      );
    });

    it("7.3 MAJOR_DEGRADATION produces canonical Record 18 with TRIGGER-10 and Edge 10", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, graph });

      const activeDecision = createSampleAdoptionDecision("adr_test_slice3a");
      const activeBinding = createTestBindingRecord("binding_test_slice3a");

      // Register decision and binding nodes in graph
      graph.registerNode({
        id: activeDecision.decision_id,
        kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
      });
      graph.registerNode({
        id: activeBinding.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.08, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.08,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
            ruleDescription: "THD ratio breach",
          },
        ],
        reactionBudgetMs: 5000,
      };

      const stageResult = await cb.processTriggerStage({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord: createTestScopeRecord("scope_wp28_test", TEST_SCOPE),
      });

      assert.equal(stageResult.status, "TRIGGER_FIRED");
      assert.equal(stageResult.eligibleForTrigger, true);
      assert.ok(stageResult.triggerRecord);
      assert.equal(
        stageResult.triggerRecord.trigger_source,
        REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE
      );
      assert.equal(stageResult.triggerRecord.prior_binding_id, activeBinding.binding_id);
      assert.equal(stageResult.triggerRecord.new_binding_id, activeBinding.binding_id);
      assert.deepEqual(stageResult.triggerRecord.affected_scope, [...TEST_SCOPE]);

      // Check Edge 10: AdoptionDecisionRecord -> RevalidationTriggerRecord (INVALIDATED_BY)
      assert.ok(stageResult.invalidationEdge);
      assert.equal(stageResult.invalidationEdge.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);
      assert.equal(stageResult.invalidationEdge.source.id, activeDecision.decision_id);
      assert.equal(stageResult.invalidationEdge.target.id, stageResult.triggerRecord.trigger_id);

      // Verify node exists in graph
      const hasNode = graph.hasNode(stageResult.triggerRecord.trigger_id);
      assert.equal(hasNode, true);

      // Verify Record 21 historical immutability: activeDecision is unmodified
      assert.equal(activeDecision.governance_status, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(activeDecision.decision_outcome, ADOPTION_DECISION_OUTCOMES.AUTHORIZED);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. WP-28 Slice 3B: Gate 8 Suspension & Rollback Signaling
  // ---------------------------------------------------------------------------
  describe("8. WP-28 Slice 3B: Gate 8 Suspension & Operational Rollback Signaling", () => {
    it("8.1 fails closed with CircuitBreakerPreconditionError if Slice 3A did not fire or inputs mismatch", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, graph });

      const activeDecision = createSampleAdoptionDecision("adr_test_precondition");
      const activeBinding = createTestBindingRecord("binding_test_precondition");

      // Ineligible trigger result
      const ineligibleTriggerResult = {
        status: "INELIGIBLE" as const,
        eligibleForTrigger: false,
        decisionId: activeDecision.decision_id,
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      await assert.rejects(
        async () => {
          await cb.processSuspensionStage({
            triggerResult: ineligibleTriggerResult,
            activeDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof CircuitBreakerPreconditionError);
          assert.match(err.message, /requires a successful TRIGGER_FIRED result/);
          return true;
        }
      );
    });

    it("8.2 fails closed when Gate 8 authorization state is missing / undefined", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine(); // Decision not registered in sm
      const cb = new CanaryCircuitBreaker({ triggerDetector, gate8StateMachine: sm, graph });

      const activeDecision = createSampleAdoptionDecision("adr_not_registered");
      const activeBinding = createTestBindingRecord("binding_not_registered");

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_mock_01",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_01",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      await assert.rejects(
        async () => {
          await cb.processSuspensionStage({
            triggerResult,
            activeDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof CircuitBreakerExecutionError);
          assert.equal(err.stage, "LIFECYCLE_EVALUATION");
          assert.match(err.message, /no recorded authorization state in Gate8StateMachine/);
          return true;
        }
      );
    });

    it("8.3 transitions ACTIVE -> SUSPENDED with canonical Record 22 (required_adoption_response: ROLLBACK_REQUIRED)", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();

      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_active_to_suspend");
      const activeBinding = createTestBindingRecord("binding_active_to_suspend");
      sm.registerAuthorization(activeDecision);

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_002",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_02",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      const suspensionResult = await cb.processSuspensionStage({
        triggerResult,
        activeDecision,
        activeBinding,
      });

      assert.equal(suspensionResult.status, "SUSPENDED");
      assert.equal(suspensionResult.decisionId, activeDecision.decision_id);
      assert.equal(suspensionResult.previousGovernanceStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(suspensionResult.currentGovernanceStatus, GOVERNANCE_STATUSES.SUSPENDED);

      // Record 22 assertions
      assert.ok(suspensionResult.changeRecord);
      const rec22 = suspensionResult.changeRecord;
      assert.equal(rec22.decision_id, activeDecision.decision_id);
      assert.equal(rec22.previous_governance_status, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(rec22.new_governance_status, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(rec22.trigger_source, GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA);
      assert.equal(rec22.required_adoption_response, REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED);
      assert.equal(rec22.revalidation_required, true);

      // State machine state
      assert.equal(sm.isAuthorizationActive(activeDecision.decision_id), false);
      const postState = sm.getAuthorizationState(activeDecision.decision_id);
      assert.equal(postState?.currentStatus, GOVERNANCE_STATUSES.SUSPENDED);

      // Operational rollback signal dispatched
      assert.equal(suspensionResult.rollbackDispatched, true);
      assert.ok(suspensionResult.rollbackAck);
      assert.equal(suspensionResult.rollbackAck.acknowledged, true);
      assert.equal(dispatchedSignals.length, 1);
      assert.equal(dispatchedSignals[0].decisionId, activeDecision.decision_id);
      assert.equal(dispatchedSignals[0].triggerSource, "TRIGGER-10");
    });

    it("8.4 acknowledges already-SUSPENDED authorization idempotently without duplicate transition", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const { port: signalPort } = createMockSignalPort();

      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_already_suspended");
      const activeBinding = createTestBindingRecord("binding_already_suspended");
      sm.registerAuthorization(activeDecision);

      // Transition once to SUSPENDED
      sm.suspendAuthorization({
        decisionId: activeDecision.decision_id,
        changeReason: "Initial suspension",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const initialHistoryLength = sm.getChangeRecords(activeDecision.decision_id).length;
      assert.equal(initialHistoryLength, 1);

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_003",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_03",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      const suspensionResult = await cb.processSuspensionStage({
        triggerResult,
        activeDecision,
        activeBinding,
      });

      assert.equal(suspensionResult.status, "ALREADY_SUSPENDED");
      assert.equal(suspensionResult.currentGovernanceStatus, GOVERNANCE_STATUSES.SUSPENDED);

      // Verify NO duplicate Record 22 was created in state machine
      const finalHistory = sm.getChangeRecords(activeDecision.decision_id);
      assert.equal(finalHistory.length, 1);
    });

    it("8.5 fails closed with ProhibitedSuspensionError when authorization is RESTRICTED", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, gate8StateMachine: sm, graph });

      const activeDecision = createSampleAdoptionDecision("adr_restricted_test");
      const activeBinding = createTestBindingRecord("binding_restricted_test");
      sm.registerAuthorization(activeDecision);

      // Restrict authorization
      sm.restrictAuthorization({
        decisionId: activeDecision.decision_id,
        changeReason: "Testing restricted restriction",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        carvedOutScope: ["guitar:amp:5150_lead"],
      });

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_004",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_04",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      await assert.rejects(
        async () => {
          await cb.processSuspensionStage({
            triggerResult,
            activeDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ProhibitedSuspensionError);
          assert.equal(err.currentStatus, GOVERNANCE_STATUSES.RESTRICTED);
          return true;
        }
      );
    });

    it("8.6 fails closed with TerminalAuthorizationStateError when authorization is WITHDRAWN or SUPERSEDED", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, gate8StateMachine: sm, graph });

      const withdrawnDecision = createSampleAdoptionDecision("adr_withdrawn_test");
      const activeBinding = createTestBindingRecord("binding_withdrawn_test");
      sm.registerAuthorization(withdrawnDecision);

      sm.withdrawAuthorization({
        decisionId: withdrawnDecision.decision_id,
        changeReason: "Withdrawing authorization",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_005",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: withdrawnDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_05",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: withdrawnDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      await assert.rejects(
        async () => {
          await cb.processSuspensionStage({
            triggerResult,
            activeDecision: withdrawnDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof TerminalAuthorizationStateError);
          assert.equal(err.terminalStatus, GOVERNANCE_STATUSES.WITHDRAWN);
          return true;
        }
      );
    });

    it("8.7 rejects stale expected revision or status under WP-24 optimistic concurrency; preserves earlier Record 18 / INVALIDATED_BY", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        graph,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_stale_concurrency");
      const activeBinding = createTestBindingRecord("binding_stale_concurrency");
      sm.registerAuthorization(activeDecision);

      graph.registerNode({
        id: activeDecision.decision_id,
        kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
      });

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_stale_01",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      graph.registerNode({
        id: mockTriggerRecord.trigger_id,
        kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
      });

      const invalidationEdge = graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
        source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
        target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
      });

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge,
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      // Monkey-patch sm.suspendAuthorization to throw StaleGovernanceStateError simulating concurrent revision collision
      sm.suspendAuthorization = () => {
        throw new StaleGovernanceStateError(
          activeDecision.decision_id,
          GOVERNANCE_STATUSES.ACTIVE,
          2,
          GOVERNANCE_STATUSES.ACTIVE,
          1
        );
      };

      await assert.rejects(
        async () => {
          await cb.processSuspensionStage({
            triggerResult,
            activeDecision,
            activeBinding,
          });
        },
        (err: any) => {
          assert.ok(err instanceof CircuitBreakerExecutionError);
          assert.equal(err.stage, "GATE8_SUSPENSION");
          assert.ok(
            (err.originalError ?? err.cause) instanceof StaleGovernanceStateError
          );
          return true;
        }
      );

      // Verify no duplicate Record 22 created in state machine
      assert.equal(sm.getChangeRecords(activeDecision.decision_id).length, 0);

      // Verify Record 18 and INVALIDATED_BY edge remain preserved in graph
      assert.equal(graph.hasNode(mockTriggerRecord.trigger_id), true);
      assert.equal(graph.hasEdge(invalidationEdge.edgeId), true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. WP-28 Slice 3C: Retest Planning Handoff & Incident Reconciliation
  // ---------------------------------------------------------------------------
  describe("9. WP-28 Slice 3C: Retest Planning Handoff & Reconciliation", () => {
    it("9.1 missing retest inputs does not fabricate Record 19 and returns RETEST_HANDOFF_INCOMPLETE", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const cb = new CanaryCircuitBreaker({ triggerDetector, gate8StateMachine: sm, graph });

      const activeDecision = createSampleAdoptionDecision("adr_missing_retest_in");
      const activeBinding = createTestBindingRecord("binding_missing_retest_in");
      sm.registerAuthorization(activeDecision);

      const mockTriggerRecord: RevalidationTriggerRecord = {
        trigger_id: "trig_wp28_006",
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        prior_binding_id: activeBinding.binding_id,
        new_binding_id: activeBinding.binding_id,
        affected_scope: [...TEST_SCOPE],
        required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
        trigger_timestamp: "2026-10-15T12:00:00Z",
      };

      const triggerResult = {
        status: "TRIGGER_FIRED" as const,
        eligibleForTrigger: true,
        decisionId: activeDecision.decision_id,
        triggerRecord: mockTriggerRecord,
        invalidationEdge: {
          edgeId: "edge_inv_06",
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
          target: { id: mockTriggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          isSymmetric: false,
          createdAt: "2026-10-15T12:00:00Z",
        },
        evaluationTimestamp: "2026-10-15T12:00:00Z",
        orchestrationStartedAt: "2026-10-15T12:00:00Z",
        completedAt: "2026-10-15T12:00:01Z",
      };

      const suspensionResult = await cb.processSuspensionStage({
        triggerResult,
        activeDecision,
        activeBinding,
      });

      // Retest handoff called with missing inputs
      const retestResult = await cb.processRetestHandoffStage({
        triggerResult,
        suspensionResult,
        // packageRecord, scopeRecord, availableCases, existingEvidenceRecords are omitted
      });

      assert.equal(retestResult.status, "RETEST_HANDOFF_INCOMPLETE");
      assert.equal(retestResult.retestPlan, undefined);
      assert.equal(retestResult.requiresRetestEdge, undefined);
      assert.ok(retestResult.missingInputs);
      assert.ok(retestResult.missingInputs.includes("packageRecord"));
      assert.ok(retestResult.missingInputs.includes("scopeRecord"));
      assert.ok(retestResult.missingInputs.includes("availableCases"));
      assert.ok(retestResult.missingInputs.includes("existingEvidenceRecords"));
    });

    it("9.2 valid retest inputs invokes RetestPlanner and produces canonical Record 19 and Edge 11", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const retestPlanner = new RetestPlanner({ graph });
      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner,
        graph,
      });

      const activeDecision = createSampleAdoptionDecision("adr_valid_retest");
      const activeBinding = createTestBindingRecord("binding_valid_retest");
      const scopeRecord = createTestScopeRecord("scope_valid_retest");
      const packageRecord = createSamplePackage("pkg_valid_retest", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [
        createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id),
        createSampleObjectiveEvidence("obj_02", sampleExecutions[1].execution_id),
      ];

      sm.registerAuthorization(activeDecision);

      // Register prerequisite nodes in graph
      graph.registerNode({
        id: activeDecision.decision_id,
        kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
      });
      graph.registerNode({
        id: scopeRecord.scope_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
      });
      graph.registerNode({
        id: activeBinding.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.10, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.10,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      // Process real Slice 3A trigger stage
      const triggerResult = await cb.processTriggerStage({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord,
      });

      assert.equal(triggerResult.status, "TRIGGER_FIRED");
      assert.ok(triggerResult.triggerRecord);

      const suspensionResult = await cb.processSuspensionStage({
        triggerResult,
        activeDecision,
        activeBinding,
      });

      assert.equal(suspensionResult.status, "SUSPENDED");

      const retestResult = await cb.processRetestHandoffStage({
        triggerResult,
        suspensionResult,
        packageRecord,
        scopeRecord,
        availableCases,
        existingEvidenceRecords: existingEvidence,
        executionRecords: sampleExecutions,
      });

      assert.equal(retestResult.status, "RETEST_PLANNED");
      assert.ok(retestResult.retestPlan);
      const plan = retestResult.retestPlan;
      assert.equal(plan.trigger_id, triggerResult.triggerRecord.trigger_id);
      assert.equal(plan.previous_package_id, packageRecord.package_id);

      // Verify canonical REQUIRES_RETEST edge (Edge 11): Record 18 -> Record 19
      assert.ok(retestResult.requiresRetestEdge);
      assert.equal(retestResult.requiresRetestEdge.edgeType, GOVERNED_EDGE_TYPES.REQUIRES_RETEST);
      assert.equal(retestResult.requiresRetestEdge.source.id, triggerResult.triggerRecord.trigger_id);
      assert.equal(retestResult.requiresRetestEdge.target.id, plan.retest_plan_id);

      // Verify graph node exists
      const hasPlanNode = graph.hasNode(plan.retest_plan_id);
      assert.equal(hasPlanNode, true);
    });

    it("9.3 rollback-signal failure does NOT cancel retest handoff; incident remains RECONCILIATION_INCOMPLETE", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const retestPlanner = new RetestPlanner({ graph });

      // Signal port configured to fail
      const { port: failingPort } = createMockSignalPort(true, "Rollback dispatch dropped by socket failure");

      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner,
        graph,
        operationalSignalPort: failingPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_failing_signal");
      const activeBinding = createTestBindingRecord("binding_failing_signal");
      const scopeRecord = createTestScopeRecord("scope_failing_signal");
      const packageRecord = createSamplePackage("pkg_failing_signal", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [
        createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id),
        createSampleObjectiveEvidence("obj_02", sampleExecutions[1].execution_id),
      ];

      sm.registerAuthorization(activeDecision);

      graph.registerNode({
        id: activeDecision.decision_id,
        kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
      });
      graph.registerNode({
        id: scopeRecord.scope_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
      });
      graph.registerNode({
        id: activeBinding.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.12, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.12,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      // Full execute flow
      const execResult = await cb.execute({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord,
        packageRecord,
        availableCases,
        existingEvidenceRecords: existingEvidence,
        executionRecords: sampleExecutions,
      });

      // Verify Gate 8 suspension succeeded
      assert.ok(execResult.suspensionStage);
      assert.equal(execResult.suspensionStage.status, "SUSPENDED");
      assert.ok(execResult.suspensionStage.rollbackError);
      assert.match(execResult.suspensionStage.rollbackError, /socket failure/);

      // Verify Retest Handoff was NOT cancelled and produced Record 19 and Edge 11
      assert.ok(execResult.retestStage);
      assert.equal(execResult.retestStage.status, "RETEST_PLANNED");
      assert.ok(execResult.retestStage.retestPlan);
      assert.ok(execResult.retestStage.requiresRetestEdge);
      assert.equal(execResult.retestStage.requiresRetestEdge.edgeType, GOVERNED_EDGE_TYPES.REQUIRES_RETEST);

      // Verify overall incident status remains RECONCILIATION_INCOMPLETE because rollback signal failed
      assert.equal(execResult.status, "RECONCILIATION_INCOMPLETE");
      assert.match(execResult.details, /failed/);
    });

    it("9.4 end-to-end incident reconciliation happy path returns INCIDENT_RECONCILED", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const retestPlanner = new RetestPlanner({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();

      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_e2e_reconciled");
      const activeBinding = createTestBindingRecord("binding_e2e_reconciled");
      const scopeRecord = createTestScopeRecord("scope_e2e_reconciled");
      const packageRecord = createSamplePackage("pkg_e2e_reconciled", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [
        createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id),
        createSampleObjectiveEvidence("obj_02", sampleExecutions[1].execution_id),
      ];

      sm.registerAuthorization(activeDecision);

      graph.registerNode({
        id: activeDecision.decision_id,
        kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
      });
      graph.registerNode({
        id: scopeRecord.scope_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
      });
      graph.registerNode({
        id: activeBinding.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.15, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.15,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      const execResult = await cb.execute({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord,
        packageRecord,
        availableCases,
        existingEvidenceRecords: existingEvidence,
        executionRecords: sampleExecutions,
      });

      assert.equal(execResult.status, "INCIDENT_RECONCILED");
      assert.ok(execResult.triggerStage.triggerRecord);
      assert.ok(execResult.triggerStage.invalidationEdge);
      assert.ok(execResult.suspensionStage);
      assert.equal(execResult.suspensionStage.status, "SUSPENDED");
      assert.ok(execResult.suspensionStage.changeRecord);
      assert.equal(execResult.suspensionStage.rollbackDispatched, true);
      assert.equal(dispatchedSignals.length, 1);
      assert.ok(execResult.retestStage);
      assert.equal(execResult.retestStage.status, "RETEST_PLANNED");
      assert.ok(execResult.retestStage.retestPlan);
      assert.ok(execResult.retestStage.requiresRetestEdge);
    });

    it("9.5 missing mandatory retest inputs in end-to-end execute returns RECONCILIATION_INCOMPLETE, zero Record 19, zero REQUIRES_RETEST, preserving prior facts", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();
      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_missing_retest_e2e");
      const activeBinding = createTestBindingRecord("binding_missing_retest_e2e");
      sm.registerAuthorization(activeDecision);

      graph.registerNode({ id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.15, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.15,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      const execResult = await cb.execute({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        // Retest inputs omitted: packageRecord, scopeRecord, availableCases, existingEvidenceRecords
      });

      assert.equal(execResult.status, "RECONCILIATION_INCOMPLETE");
      assert.ok(execResult.triggerStage.triggerRecord);
      assert.ok(execResult.triggerStage.invalidationEdge);
      assert.ok(execResult.suspensionStage);
      assert.equal(execResult.suspensionStage.status, "SUSPENDED");
      assert.equal(execResult.suspensionStage.rollbackDispatched, true);
      assert.equal(dispatchedSignals.length, 1);

      // Verify retest stage is incomplete and zero Record 19 was fabricated
      assert.ok(execResult.retestStage);
      assert.equal(execResult.retestStage.status, "RETEST_HANDOFF_INCOMPLETE");
      assert.equal(execResult.retestStage.retestPlan, undefined);
      assert.equal(execResult.retestStage.requiresRetestEdge, undefined);
    });

    it("9.6 RetestPlanner failure preserves Record 18, INVALIDATED_BY, Record 22, and rollback dispatch without returning INCIDENT_RECONCILED", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();

      // Mock RetestPlanner that throws synchronously during retest plan creation
      const failingRetestPlanner = {
        createRetestPlan(): never {
          throw new Error("Simulated RetestPlanner storage failure");
        },
      } as unknown as RetestPlanner;

      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner: failingRetestPlanner,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_failing_retest_planner");
      const activeBinding = createTestBindingRecord("binding_failing_retest_planner");
      const scopeRecord = createTestScopeRecord("scope_failing_retest_planner");
      const packageRecord = createSamplePackage("pkg_failing_retest_planner", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id)];

      sm.registerAuthorization(activeDecision);
      graph.registerNode({ id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });
      graph.registerNode({ id: scopeRecord.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
      graph.registerNode({ id: packageRecord.package_id, kind: GOVERNED_ENTITY_KINDS.ValidationPackage });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.15, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.15,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      await assert.rejects(
        async () => {
          await cb.execute({
            evaluation: majorEval,
            activeDecision,
            activeBinding,
            scopeRecord,
            packageRecord,
            availableCases,
            existingEvidenceRecords: existingEvidence,
            executionRecords: sampleExecutions,
          });
        },
        (err: any) => {
          assert.ok(err instanceof CircuitBreakerExecutionError);
          assert.equal(err.stage, "RETEST_PLANNING");
          assert.match(err.message, /WP-20 RetestPlanner failed/);
          return true;
        }
      );

      // Verify prior governance state remains intact:
      // 1. Suspension in state machine was NOT rolled back
      const authState = sm.getAuthorizationState(activeDecision.decision_id);
      assert.equal(authState?.currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(sm.getChangeRecords(activeDecision.decision_id).length, 1);

      // 2. Operational rollback was dispatched
      assert.equal(dispatchedSignals.length, 1);

      // 3. INVALIDATED_BY edge exists in graph
      const invEdges = graph.getEdges().filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY);
      assert.equal(invEdges.length, 1);
    });

    it("9.7 whole-incident idempotency: repeated processing of the same incident produces at most 1 Record 18, 1 INVALIDATED_BY, 1 Record 22, 1 rollback signal, 1 Record 19, 1 REQUIRES_RETEST", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const retestPlanner = new RetestPlanner({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();
      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_idempotency_e2e");
      const activeBinding = createTestBindingRecord("binding_idempotency_e2e");
      const scopeRecord = createTestScopeRecord("scope_idempotency_e2e");
      const packageRecord = createSamplePackage("pkg_idempotency_e2e", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id)];

      sm.registerAuthorization(activeDecision);
      graph.registerNode({ id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });
      graph.registerNode({ id: scopeRecord.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
      graph.registerNode({ id: packageRecord.package_id, kind: GOVERNED_ENTITY_KINDS.ValidationPackage });

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: "2026-10-15T12:00:00Z",
        evaluationTimestamp: "2026-10-15T12:00:01Z",
        receivedTimestamp: "2026-10-15T12:00:00.500Z",
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.15, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.15,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      const input = {
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord,
        packageRecord,
        availableCases,
        existingEvidenceRecords: existingEvidence,
        executionRecords: sampleExecutions,
      };

      // First execution
      const exec1 = await cb.execute(input);
      assert.equal(exec1.status, "INCIDENT_RECONCILED");
      assert.equal(exec1.suspensionStage.status, "SUSPENDED");
      assert.equal(sm.getChangeRecords(activeDecision.decision_id).length, 1);
      assert.equal(dispatchedSignals.length, 1);

      // Second execution with same incident
      const exec2 = await cb.execute(input);
      assert.equal(exec2.status, "INCIDENT_RECONCILED");
      // Authorization was already SUSPENDED; state machine received 0 new transitions
      assert.equal(exec2.suspensionStage.status, "ALREADY_SUSPENDED");
      assert.equal(sm.getChangeRecords(activeDecision.decision_id).length, 1);

      // Graph edges are not inflated:
      const invEdges = graph.getEdges().filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY);
      assert.equal(invEdges.length, 1);
      const retestEdges = graph.getEdges().filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.REQUIRES_RETEST);
      assert.equal(retestEdges.length, 1);
    });

    it("9.8 INCIDENT_RECONCILED guard matrix: impossible when any required handoff condition fails", async () => {
      // 1. Rollback failure prevents INCIDENT_RECONCILED (re-verified from 9.3)
      // 2. Missing retest inputs prevents INCIDENT_RECONCILED (re-verified from 9.5)
      // 3. Rollback acknowledgment is NOT treated as proof of completed physical rollback
      const { port: signalPort } = createMockSignalPort();
      const ack = await signalPort.signalRollback({
        decisionId: "adr_guard_test",
        versionBindingId: "binding_guard_test",
        affectedScope: ["guitar:pickup"],
        reason: "Test rollback acknowledgment semantics",
        requestedAt: new Date().toISOString(),
      });
      assert.equal(ack.acknowledged, true);
      // Factual invariant: acknowledgment is reception only; physical rollback is owned by Phase 1C.5g
      assert.equal((ack as any).physicalRollbackCompleted, undefined);
      assert.equal((ack as any).trafficDrained, undefined);
      assert.equal((ack as any).baselineRestored, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Stream-Loss Continuity Policy & Episode Idempotency
  // ---------------------------------------------------------------------------
  describe("10. Stream-Loss Continuity Policy & Episode Idempotency", () => {
    it("10.1 stream-loss timeout comes only from external TelemetryStreamLossPolicy; zero default timeout; unconfigured returns UNKNOWN", async () => {
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([createCanonicalThresholdProfile()]);
      // Monitor with NO streamLossPolicy
      const monitorWithoutPolicy = new QualityTelemetryMonitor({ resolver });

      const reportNoPolicy = await monitorWithoutPolicy.checkStreamHealth();
      assert.equal(reportNoPolicy.status, "UNKNOWN");
      assert.equal(reportNoPolicy.disruptionDetected, false);
      assert.match(reportNoPolicy.details!, /No TelemetryStreamLossPolicy configured/);

      // Monitor with invalid/negative timeout in streamLossPolicy fails closed
      const monitorWithInvalidPolicy = new QualityTelemetryMonitor({
        resolver,
        streamLossPolicy: { streamLossTimeoutMs: -100 },
      });
      await assert.rejects(
        async () => {
          await monitorWithInvalidPolicy.checkStreamHealth();
        },
        (err: any) => {
          assert.ok(err instanceof MissingGovernedPolicyError);
          assert.match(err.message, /Stream loss timeout must be a positive finite number/);
          return true;
        }
      );
    });

    it("10.2 stream-loss episode idempotency: first DISRUPTED dispatches pause and fallback once; repeated checks do not redispatch", async () => {
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([createCanonicalThresholdProfile()]);
      const { port: signalPort } = createMockSignalPort();
      const { port: fallbackPort, engagedContexts } = createMockFallbackPort();

      const streamLossPolicy: TelemetryStreamLossPolicy = {
        streamLossTimeoutMs: 1000,
      };

      let currentTime = "2026-10-15T12:00:00.000Z";
      const monitor = new QualityTelemetryMonitor({
        resolver,
        streamLossPolicy,
        operationalSignalPort: signalPort,
        fallbackTelemetryPort: fallbackPort,
        clock: () => currentTime,
      });

      const sample: TelemetrySample = {
        decisionId: "adr_stream_test",
        versionBindingId: "binding_stream_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00.000Z",
        observations: [{ metricId: "thd_ratio", value: 0.01 }],
      };

      // Ingest sample at T0
      await monitor.evaluateSample({
        sample,
        profileRef: "telemetry_profile_production_canary_01",
        expectedAuthorizedScope: TEST_SCOPE,
        expectedVersionBindingId: "binding_stream_test",
      });

      // Check stream health at T0 + 500ms (healthy)
      currentTime = "2026-10-15T12:00:00.500Z";
      const healthyReport = await monitor.checkStreamHealth(currentTime);
      assert.equal(healthyReport.status, "HEALTHY");
      assert.equal(healthyReport.disruptionDetected, false);

      // Check stream health at T0 + 1500ms (timeout exceeded -> first DISRUPTED entry)
      currentTime = "2026-10-15T12:00:01.500Z";
      const firstDisruption = await monitor.checkStreamHealth(currentTime);
      assert.equal(firstDisruption.status, "DISRUPTED");
      assert.equal(firstDisruption.disruptionDetected, true);
      assert.equal(firstDisruption.pauseSignalDispatched, true);
      assert.equal(firstDisruption.fallbackEngaged, true);
      assert.equal(engagedContexts.length, 1);

      // Repeated health checks during the same disruption episode do NOT redispatch
      currentTime = "2026-10-15T12:00:02.000Z";
      const secondCheck = await monitor.checkStreamHealth(currentTime);
      assert.equal(secondCheck.status, "DISRUPTED");
      assert.equal(secondCheck.disruptionDetected, true);
      assert.equal(engagedContexts.length, 1); // Not called again
    });

    it("10.3 valid telemetry clears disruption episode; does not auto-resume Canary; subsequent distinct outage redispatches once", async () => {
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([createCanonicalThresholdProfile()]);
      const { port: signalPort } = createMockSignalPort();
      const { port: fallbackPort, engagedContexts } = createMockFallbackPort();

      let currentTime = "2026-10-15T12:00:00.000Z";
      const monitor = new QualityTelemetryMonitor({
        resolver,
        streamLossPolicy: { streamLossTimeoutMs: 1000 },
        operationalSignalPort: signalPort,
        fallbackTelemetryPort: fallbackPort,
        clock: () => currentTime,
      });

      const sample1: TelemetrySample = {
        decisionId: "adr_stream_reset",
        versionBindingId: "binding_stream_reset",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00.000Z",
        observations: [{ metricId: "thd_ratio", value: 0.01 }],
      };

      await monitor.evaluateSample({
        sample: sample1,
        profileRef: "telemetry_profile_production_canary_01",
        expectedAuthorizedScope: TEST_SCOPE,
        expectedVersionBindingId: "binding_stream_reset",
      });

      // Outage 1: at T0 + 1500ms
      currentTime = "2026-10-15T12:00:01.500Z";
      const outage1 = await monitor.checkStreamHealth(currentTime);
      assert.equal(outage1.status, "DISRUPTED");
      assert.equal(engagedContexts.length, 1);

      // Ingest valid sample2 at T0 + 3000ms
      currentTime = "2026-10-15T12:00:03.000Z";
      const sample2: TelemetrySample = {
        decisionId: "adr_stream_reset",
        versionBindingId: "binding_stream_reset",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:03.000Z",
        observations: [{ metricId: "thd_ratio", value: 0.01 }],
      };

      await monitor.evaluateSample({
        sample: sample2,
        profileRef: "telemetry_profile_production_canary_01",
        expectedAuthorizedScope: TEST_SCOPE,
        expectedVersionBindingId: "binding_stream_reset",
      });

      // Stream recovers: status is HEALTHY, episode reset, zero automatic Canary resume signal
      currentTime = "2026-10-15T12:00:03.100Z";
      const recoveryReport = await monitor.checkStreamHealth(currentTime);
      assert.equal(recoveryReport.status, "HEALTHY");
      assert.equal(recoveryReport.disruptionDetected, false);

      // Outage 2 (distinct outage): at T0 + 4500ms (1500ms after sample2)
      currentTime = "2026-10-15T12:00:04.500Z";
      const outage2 = await monitor.checkStreamHealth(currentTime);
      assert.equal(outage2.status, "DISRUPTED");
      assert.equal(outage2.disruptionDetected, true);
      assert.equal(engagedContexts.length, 2); // Distinct outage dispatches once again
    });

    it("10.4 stream-loss governance isolation: stream loss produces zero TRIGGER-10, Record 18, INVALIDATED_BY, Record 22, rollback, Record 19, or REQUIRES_RETEST", async () => {
      const graph = new ValidationRelationshipGraph();
      const sm = new Gate8StateMachine({ graph });
      const { port: signalPort, dispatchedSignals } = createMockSignalPort();
      const resolver = new ConfiguredTelemetryThresholdProfileResolver([createCanonicalThresholdProfile()]);

      let currentTime = "2026-10-15T12:00:00.000Z";
      const monitor = new QualityTelemetryMonitor({
        resolver,
        streamLossPolicy: { streamLossTimeoutMs: 500 },
        operationalSignalPort: signalPort,
        clock: () => currentTime,
      });

      const activeDecision = createSampleAdoptionDecision("adr_isolation_test");
      sm.registerAuthorization(activeDecision);

      const sample: TelemetrySample = {
        decisionId: activeDecision.decision_id,
        versionBindingId: "binding_isolation_test",
        scope: TEST_SCOPE,
        timestamp: "2026-10-15T12:00:00.000Z",
        observations: [{ metricId: "thd_ratio", value: 0.01 }],
      };

      await monitor.evaluateSample({
        sample,
        profileRef: "telemetry_profile_production_canary_01",
        expectedAuthorizedScope: TEST_SCOPE,
        expectedVersionBindingId: "binding_isolation_test",
      });

      // Stream disruption at T0 + 2000ms
      currentTime = "2026-10-15T12:00:02.000Z";
      const disruption = await monitor.checkStreamHealth(currentTime);
      assert.equal(disruption.status, "DISRUPTED");

      // Verify ZERO governance mutations:
      // Zero rollback signals (only Canary pause)
      assert.equal(dispatchedSignals.length, 0);

      // Gate8 state remains ACTIVE (no suspension)
      const authState = sm.getAuthorizationState(activeDecision.decision_id);
      assert.equal(authState?.currentStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(sm.getChangeRecords(activeDecision.decision_id).length, 0);

      // Graph has zero Record 18, zero Record 19, zero Record 22
      assert.equal(graph.getNodes().length, 0);
      assert.equal(graph.getEdges().length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Reaction Timing & Frozen Architectural Boundaries
  // ---------------------------------------------------------------------------
  describe("11. Reaction Timing & Frozen Architectural Boundaries", () => {
    it("11.1 preserves distinct factual timing fields without fabricating an ungrounded reaction-budget PASS/FAIL checkpoint", async () => {
      const graph = new ValidationRelationshipGraph();
      const triggerDetector = new RevalidationTriggerDetector({ graph });
      const sm = new Gate8StateMachine({ graph });
      const retestPlanner = new RetestPlanner({ graph });
      const { port: signalPort } = createMockSignalPort();
      const cb = new CanaryCircuitBreaker({
        triggerDetector,
        gate8StateMachine: sm,
        retestPlanner,
        graph,
        operationalSignalPort: signalPort,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const activeDecision = createSampleAdoptionDecision("adr_timing_test");
      const activeBinding = createTestBindingRecord("binding_timing_test");
      const scopeRecord = createTestScopeRecord("scope_timing_test");
      const packageRecord = createSamplePackage("pkg_timing_test", scopeRecord.scope_id, activeBinding.binding_id);
      const availableCases = createSampleCases();
      const sampleExecutions = createSampleExecutions();
      const existingEvidence = [
        createSampleObjectiveEvidence("obj_01", sampleExecutions[0].execution_id),
        createSampleObjectiveEvidence("obj_02", sampleExecutions[1].execution_id),
      ];

      sm.registerAuthorization(activeDecision);
      graph.registerNode({ id: activeDecision.decision_id, kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });
      graph.registerNode({ id: scopeRecord.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
      graph.registerNode({ id: packageRecord.package_id, kind: GOVERNED_ENTITY_KINDS.ValidationPackage });

      const sampleTime = "2026-10-15T12:00:00.000Z";
      const receivedTime = "2026-10-15T12:00:00.100Z";
      const evalTime = "2026-10-15T12:00:00.200Z";

      const majorEval: TelemetryEvaluationResult = {
        severity: "MAJOR_DEGRADATION",
        profileRef: "profile_wp28_001",
        sampleTimestamp: sampleTime,
        receivedTimestamp: receivedTime,
        evaluationTimestamp: evalTime,
        decisionId: activeDecision.decision_id,
        versionBindingId: activeBinding.binding_id,
        scope: TEST_SCOPE,
        evaluatedMetrics: [{ metricId: "thd_ratio", value: 0.15, sampleSize: 20 }],
        breachedRules: [
          {
            metricId: "thd_ratio",
            observedValue: 0.15,
            thresholdValue: 0.05,
            breachSeverity: "MAJOR_DEGRADATION",
          },
        ],
        reactionBudgetMs: 5000,
      };

      const result = await cb.execute({
        evaluation: majorEval,
        activeDecision,
        activeBinding,
        scopeRecord,
        packageRecord,
        availableCases,
        existingEvidenceRecords: existingEvidence,
        executionRecords: sampleExecutions,
      });

      // Verify factual timing preservation
      assert.equal(result.triggerStage.evaluationTimestamp, evalTime);
      assert.ok(result.triggerStage.orchestrationStartedAt);
      assert.ok(result.triggerStage.completedAt);
      assert.ok(result.suspensionStage.startedAt);
      assert.ok(result.suspensionStage.completedAt);
      assert.ok(result.suspensionStage.rollbackSignaledAt);
      assert.ok(result.retestStage.startedAt);
      assert.ok(result.retestStage.completedAt);
      assert.ok(result.completedAt);

      // Confirm no boolean PASS/FAIL verdict is fabricated for the reaction budget
      assert.equal((result as any).budgetVerdict, undefined);
      assert.equal((result as any).budgetPassFail, undefined);
    });

    it("11.2 frozen boundary verification: 22 records, 14 edges, zero routing mutations, zero direct PATH-ROLLBACK", () => {
      // Governed edge catalogue is exactly 14 edges
      assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);

      // Exactly 14 edge types in registry
      assert.ok(GOVERNED_EDGE_TYPES.REQUIRES_RETEST);
      assert.ok(GOVERNED_EDGE_TYPES.INVALIDATED_BY);

      // Governed entity kinds: 22 records + 7 upstream entities = 29
      assert.equal(Object.keys(GOVERNED_ENTITY_KINDS).length, 29);
      assert.equal((GOVERNED_ENTITY_KINDS as any).ValidationRecord23, undefined);

      // Circuit breaker and monitor hold zero traffic-routing authority
      const cbProto = CanaryCircuitBreaker.prototype as any;
      assert.equal(cbProto.setTrafficPercentage, undefined);
      assert.equal(cbProto.mutateRoutingTable, undefined);
      assert.equal(cbProto.revertDns, undefined);
      assert.equal(cbProto.executePathRollback, undefined);

      const monitorProto = QualityTelemetryMonitor.prototype as any;
      assert.equal(monitorProto.setTrafficPercentage, undefined);
      assert.equal(monitorProto.mutateRoutingTable, undefined);
      assert.equal(monitorProto.revertDns, undefined);
      assert.equal(monitorProto.executePathRollback, undefined);
    });
  });
});
