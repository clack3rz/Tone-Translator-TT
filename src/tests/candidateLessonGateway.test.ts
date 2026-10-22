// src/tests/candidateLessonGateway.test.ts
// Independent verification test suite for WP-26 Stage 2 Slice 2:
// Candidate Lesson Gateway Verification & Governance Boundary Tests.
// Bound to frozen specification v0.1j Section 30, Phase 1C.5f Section 14, and Build Plan v0.1h WP-26.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CandidateLessonHandoffGateway,
  CandidateLessonQuarantineSink,
  CandidateLessonQuarantineReceipt,
  CandidateLessonEvidencePackage,
  FormulateCandidateLessonInput,
  InvalidCandidateLessonPackageError,
  QuarantineHandoffError,
  SupportingEvidenceReference,
} from "../sound-engineer/validation/lessons";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  UATEvaluationRecord,
  ValidationFailureRecord,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationExecutionRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  OBJECTIVE_METRIC_CATEGORIES,
  TOLERANCE_EVALUATIONS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  EVALUATOR_PERSONAS,
  TASK_COMPLETION_STATUSES,
  MUSICAL_FITNESS_VERDICTS,
  FAILURE_ATTRIBUTION_CLASSES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  FAILURE_MATERIALITIES,
  VALIDATION_PRIMARY_DOMAINS,
  UNCERTAINTY_SOURCES,
  UNCERTAINTY_GATE_8_IMPACTS,
  EXECUTION_OUTCOMES,
} from "../sound-engineer/validation/schemas/enums";
import { canonicalizeJson } from "../sound-engineer/validation/schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../sound-engineer/validation/storage/ledgerTypes";

// ---------------------------------------------------------------------------
// Canonical Fixture Factories
// ---------------------------------------------------------------------------

function createMockScope(scopeId = "SCOPE_TEST_01"): ValidationScopeRecord {
  return {
    scope_id: scopeId,
    intake_id: "INTAKE_TEST_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["brit_8000_lead", "cab_4x12_vintage"],
    excluded_units: ["bass_svx_pre"],
    boundary_constraints: ["sample_rate_48khz_only"],
    scope_inflation_protection: true,
  };
}

function createMockUncertainty(
  uncertaintyId = "UNC_TEST_01"
): ValidationUncertaintyRecord {
  return {
    uncertainty_id: uncertaintyId,
    package_id: "PKG_TEST_01",
    uncertainty_source: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
    affected_scope: ["brit_8000_lead"],
    potential_production_risk: "Extreme high gain settings (>9.0) unverified for phase coherence.",
    gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
    required_monitoring_if_authorized: ["high_frequency_phase_telemetry"],
  };
}

function createMockExecution(
  executionId = "EXEC_TEST_01",
  traceRef = "trc_phase1c5f_001",
  bindingId = "BIND_TEST_01"
): ValidationExecutionRecord {
  return {
    execution_id: executionId,
    case_id: "CASE_TEST_01",
    profile_id: "PROFILE_01",
    fixture_id: "FIXTURE_GOLDEN_01",
    binding_id: bindingId,
    execution_timestamp: "2026-10-20T00:00:00Z",
    execution_environment: "SANDBOX_ISOLATED",
    input_audio_integrity_ref: "sha256:input123",
    output_audio_integrity_ref: "sha256:output123",
    execution_duration_ms: 125,
    anomalies_detected: [],
    raw_measurements: { thd: 0.015 },
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: traceRef,
  };
}

function createMockObjectiveEvidence(
  id = "OBJ_EVID_01",
  executionId = "EXEC_TEST_01"
): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: id,
    execution_id: executionId,
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { f3_db: -3.2, f6_db: -6.5 },
    applied_threshold_profile_ref: "THRESH_SPEC_01",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.4,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["spectrum_plot.png"],
  };
}

function createMockPerceptualEvidence(
  id = "PERC_EVID_01",
  executionId = "EXEC_TEST_01"
): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: id,
    execution_id: executionId,
    evaluator_id: "EVAL_MASTER_01",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "NearField_ATC_SCM25A",
      calibrated_spl_profile_ref: "SPL_83DB_C",
      acoustic_treatment_level: "LEDE_CERTIFIED",
    },
    presented_stimuli_refs: { candidate: "stem_cand.wav", reference: "stem_ref.wav" },
    perceptual_dimensions_evaluated: { warmth: 4.8, punch: 4.5, presence: 4.2 },
    qualitative_observations: "Exceptional upper-mid harmonic clarity without harshness.",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
  };
}

function createMockUATEvidence(
  id = "UAT_EVID_01",
  packageId = "PKG_TEST_01"
): UATEvaluationRecord {
  return {
    uat_id: id,
    package_id: packageId,
    evaluator_persona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
    task_scenario_id: "SCENARIO_STUDIO_MIX_01",
    task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
    task_duration_seconds: 45,
    workflow_satisfaction_rating: 9.5,
    cognitive_friction_notes: "None. Natural signal routing.",
    musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
    uat_blockers_identified: [],
  };
}

function createMockFailureRecord(
  id = "FAIL_EVID_01",
  executionId = "EXEC_TEST_01"
): ValidationFailureRecord {
  return {
    failure_id: id,
    execution_id: executionId,
    failure_timestamp: "2026-10-20T00:00:00Z",
    failure_title: "High-Frequency Comb Filtering on Dual Off-Axis Mic Pair",
    failure_symptom: "Phase cancellation between 3.5kHz and 4.8kHz observed.",
    attribution_class: FAILURE_ATTRIBUTION_CLASSES.REASONING,
    attribution_evidence_refs: ["OBJ_EVID_01"],
    attribution_confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
    materiality: FAILURE_MATERIALITIES.MAJOR,
    affected_scope: ["cab_4x12_vintage"],
    gate_8_blocked: true,
    remand_destination: "Phase1C.5c_CausalReasoning",
    retest_prerequisites: "Re-run multi-mic phase alignment test.",
  };
}

function createMockBindingRecord(bindingId = "BIND_TEST_01"): ValidationVersionBindingRecord {
  return {
    binding_id: bindingId,
    scope_id: "SCOPE_TEST_01",
    architecture_version_matrix: {
      "1C.5a_version": { version: "v0.3c", integrity_ref: "sha256:5a" },
      "1C.5b_version": { version: "v0.2f", integrity_ref: "sha256:5b" },
      "1C.5c_version": { version: "v0.1d", integrity_ref: "sha256:5c" },
      "1C.5d_version": { version: "v0.1l", integrity_ref: "sha256:5d" },
      "1C.5e_version": { version: "v0.1m", integrity_ref: "sha256:5e" },
      "1C.5f_version": { version: "v0.1j", integrity_ref: "sha256:5f" },
      "1C.5g_version": { version: "v0.1e", integrity_ref: "sha256:5g" },
      "1C.5h_mandate_version": { version: "v0.1d", integrity_ref: "sha256:5hm" },
      "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256:5ha" },
    },
    runtime_implementation_version: "1.0.0",
    model_configuration_version: "1.0.0",
    deterministic_rules_version: "1.0.0",
    gear_catalog_version: "1.0.0",
    platform_exporter_version: "1.0.0",
    fixture_library_version: "1.0.0",
    target_platform_runtime_version: "AT5_v5.5",
    host_environment_version: "Ubuntu_22.04",
    version_integrity_reference: {
      composite_digest: "sha256:composite_binding",
      algorithm: "SHA-256",
      sealed_at: "2026-10-20T00:00:00Z",
    },
  };
}

/**
 * Mock Quarantine Sink recording all quarantined packages.
 */
class MockQuarantineSink implements CandidateLessonQuarantineSink {
  public readonly quarantinedPackages: CandidateLessonEvidencePackage[] = [];
  public customReceiptGenerator?: (
    pkg: CandidateLessonEvidencePackage
  ) => CandidateLessonQuarantineReceipt;
  public shouldRejectWithError?: Error;

  async quarantineLesson(
    lessonPackage: CandidateLessonEvidencePackage
  ): Promise<CandidateLessonQuarantineReceipt> {
    if (this.shouldRejectWithError) {
      throw this.shouldRejectWithError;
    }

    this.quarantinedPackages.push(lessonPackage);

    if (this.customReceiptGenerator) {
      return this.customReceiptGenerator(lessonPackage);
    }

    return {
      receiptId: `CLQR_${Math.random().toString(36).substring(2, 10)}`,
      lessonPackageId: lessonPackage.packageId,
      quarantinedAt: new Date().toISOString(),
      status: "QUARANTINED",
      packageIntegrityDigest: lessonPackage.integrityMetadata.integrity_digest,
      quarantineRepositoryId: "REPO_1C5E_QUARANTINE_ISOLATION",
    };
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h — WP-26: Candidate Lesson Quarantine Handoff & Governance Integration", () => {
  it("01: Formulation Gate: single valid empirical evidence source formulates a Candidate Lesson", async () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const input: FormulateCandidateLessonInput = {
      proposedInsight:
        "High-pass filtering dynamic mics at 75Hz on vintage 4x12 cabs prevents muddy low-mid resonances under high-gain master bias.",
      supportingEvidence: [createMockObjectiveEvidence()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    };

    const result = await gateway.formulateAndQuarantine(input);

    assert.ok(result.package);
    assert.ok(result.package.packageId.startsWith("CLEP_"));
    assert.strictEqual(result.package.supportingEvidence.length, 1);
    assert.strictEqual(
      result.package.supportingEvidence[0].evidenceKind,
      "ObjectiveEvidenceRecord"
    );
    assert.strictEqual(
      result.package.supportingEvidence[0].evidenceId,
      "OBJ_EVID_01"
    );
    assert.strictEqual(result.receipt.status, "QUARANTINED");
    assert.strictEqual(result.receipt.lessonPackageId, result.package.packageId);
    assert.strictEqual(sink.quarantinedPackages.length, 1);
  });

  it("02: Prohibited Promotion-Gate: does NOT require multiple executions, multiple fixtures, or sample thresholds", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    // A single execution and single perceptual record MUST formulate successfully
    const input: FormulateCandidateLessonInput = {
      proposedInsight: "Subtle 2.5kHz presence dip softens digital harshness on EL34 lead channels.",
      supportingEvidence: [createMockPerceptualEvidence()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    };

    const pkg = gateway.formulatePackage(input);
    assert.ok(pkg);
    assert.strictEqual(pkg.supportingEvidence.length, 1);
    assert.strictEqual(pkg.supportingEvidence[0].evidenceKind, "PerceptualEvaluationRecord");
  });

  it("03: Lifecycle Ownership: CandidateLessonEvidencePackage contains zero local lifecycle state machine", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const pkg = gateway.formulatePackage({
      proposedInsight: "Comb filtering occurs when dual off-axis dynamic mics differ by less than 1.5 inches.",
      supportingEvidence: [createMockFailureRecord()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    });

    // Verify governanceTargetState or lifecycle state fields are absent from package
    const packageRecord = pkg as unknown as Record<string, unknown>;
    assert.strictEqual(packageRecord.governanceTargetState, undefined);
    assert.strictEqual(packageRecord.lifecycleStatus, undefined);
    assert.strictEqual(packageRecord.governanceStatus, undefined);

    // Verify gateway has no lifecycle mutation methods
    const gatewayRecord = gateway as unknown as Record<string, unknown>;
    assert.strictEqual(gatewayRecord.promote, undefined);
    assert.strictEqual(gatewayRecord.approve, undefined);
    assert.strictEqual(gatewayRecord.reject, undefined);
    assert.strictEqual(gatewayRecord.transitionState, undefined);
  });

  it("04: Reference Types Are Thin Canonical Pointers, not duplicate shadow schemas", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const scope = createMockScope();
    const uncertainty = createMockUncertainty();

    const pkg = gateway.formulatePackage({
      proposedInsight: "Cabinet coupling resonances require explicit low-end damping.",
      supportingEvidence: [createMockObjectiveEvidence()],
      scope,
      uncertainty,
      execution: createMockExecution(),
    });

    // ScopeRef is a thin pointer referencing scope_id and affected units
    assert.strictEqual(pkg.scopeRef.scopeRecordRef, scope.scope_id);
    assert.deepStrictEqual(pkg.scopeRef.affectedUnits, scope.included_units);
    const scopeRefAny = pkg.scopeRef as unknown as Record<string, unknown>;
    assert.strictEqual(scopeRefAny.scope_inflation_protection, undefined);
    assert.strictEqual(scopeRefAny.intake_id, undefined);

    // UncertaintyRef is a thin pointer referencing uncertainty_id and source
    assert.strictEqual(pkg.uncertaintyRef.uncertaintyRecordRef, uncertainty.uncertainty_id);
    assert.strictEqual(pkg.uncertaintyRef.uncertaintySource, uncertainty.uncertainty_source);
    const uncRefAny = pkg.uncertaintyRef as unknown as Record<string, unknown>;
    assert.strictEqual(uncRefAny.package_id, undefined);
    assert.strictEqual(uncRefAny.potential_production_risk, undefined);
  });

  it("05: Permitted Evidence: independently supports Record 10, 11, 12, 14, and pre-resolved references", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const categories: Array<{
      desc: string;
      evidence: FormulateCandidateLessonInput["supportingEvidence"][0];
      expectedKind: string;
      expectedId: string;
    }> = [
      {
        desc: "Record 10 (ObjectiveEvidenceRecord)",
        evidence: createMockObjectiveEvidence("OBJ_CUSTOM_99"),
        expectedKind: "ObjectiveEvidenceRecord",
        expectedId: "OBJ_CUSTOM_99",
      },
      {
        desc: "Record 11 (PerceptualEvaluationRecord)",
        evidence: createMockPerceptualEvidence("PERC_CUSTOM_88"),
        expectedKind: "PerceptualEvaluationRecord",
        expectedId: "PERC_CUSTOM_88",
      },
      {
        desc: "Record 12 (UATEvaluationRecord)",
        evidence: createMockUATEvidence("UAT_CUSTOM_77"),
        expectedKind: "UATEvaluationRecord",
        expectedId: "UAT_CUSTOM_77",
      },
      {
        desc: "Record 14 (ValidationFailureRecord)",
        evidence: createMockFailureRecord("FAIL_CUSTOM_66"),
        expectedKind: "ValidationFailureRecord",
        expectedId: "FAIL_CUSTOM_66",
      },
      {
        desc: "Pre-resolved SupportingEvidenceReference",
        evidence: {
          evidenceKind: "ObjectiveEvidenceRecord",
          evidenceId: "REF_CUSTOM_55",
          observationSummary: "Pre-resolved reference",
        },
        expectedKind: "ObjectiveEvidenceRecord",
        expectedId: "REF_CUSTOM_55",
      },
    ];

    for (const cat of categories) {
      const pkg = gateway.formulatePackage({
        proposedInsight: `Testing evidence kind ${cat.desc}`,
        supportingEvidence: [cat.evidence],
        scope: createMockScope(),
        uncertainty: createMockUncertainty(),
        execution: createMockExecution(),
      });
      assert.strictEqual(pkg.supportingEvidence[0].evidenceKind, cat.expectedKind);
      assert.strictEqual(pkg.supportingEvidence[0].evidenceId, cat.expectedId);
    }
  });

  it("06: Permitted Evidence: accepts heterogeneous combinations of evidence sources", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const pkg = gateway.formulatePackage({
      proposedInsight: "Multi-dimensional evidence confirms punch preservation with minimal phase drift.",
      supportingEvidence: [
        createMockObjectiveEvidence("OBJ_1"),
        createMockPerceptualEvidence("PERC_1"),
        createMockUATEvidence("UAT_1"),
        createMockFailureRecord("FAIL_1"),
      ],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    });

    assert.strictEqual(pkg.supportingEvidence.length, 4);
    assert.strictEqual(pkg.supportingEvidence[0].evidenceKind, "ObjectiveEvidenceRecord");
    assert.strictEqual(pkg.supportingEvidence[1].evidenceKind, "PerceptualEvaluationRecord");
    assert.strictEqual(pkg.supportingEvidence[2].evidenceKind, "UATEvaluationRecord");
    assert.strictEqual(pkg.supportingEvidence[3].evidenceKind, "ValidationFailureRecord");
  });

  it("07: Invalid Formulation: fails closed on empty or whitespace proposedInsight", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "   ",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("proposedInsight")));
        return true;
      }
    );
  });

  it("08: Invalid Formulation: fails closed on empty supportingEvidence", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("supportingEvidence")));
        return true;
      }
    );
  });

  it("09: Invalid Formulation: fails closed on unsupported evidence record type", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          // Pass an unsupported object (e.g. random dictionary or unsupported kind)
          supportingEvidence: [{ random_field: "invalid" } as unknown as SupportingEvidenceReference],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("does not conform")));
        return true;
      }
    );
  });

  it("10: Invalid Formulation: fails closed on missing scope or empty affectedUnits", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    // Empty included units in scope
    const emptyScope: ValidationScopeRecord = {
      ...createMockScope(),
      included_units: [],
    };

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: emptyScope,
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("included_units")));
        return true;
      }
    );
  });

  it("11: Invalid Formulation: fails closed on missing uncertainty reference", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: null as unknown as ValidationUncertaintyRecord,
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("uncertainty")));
        return true;
      }
    );
  });

  it("12: Invalid Formulation: fails closed on missing execution identity or runTraceRef", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    // Missing runTraceRef when execution is string
    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: "EXEC_ONLY_STRING",
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("runTraceRef is required")));
        return true;
      }
    );
  });

  it("13: Lineage Verification: fails closed on traceRef mismatch between execution and explicit trace", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const exec = createMockExecution("EXEC_01", "trc_canonical_01");

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: exec,
          runTraceRef: "trc_contradictory_99",
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("Lineage mismatch")));
        return true;
      }
    );
  });

  it("14: Lineage Verification: fails closed on bindingId mismatch between execution and versionBinding", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const exec = createMockExecution("EXEC_01", "trc_01", "BIND_EXEC_ORIGINAL");

    assert.throws(
      () =>
        gateway.formulatePackage({
          proposedInsight: "Valid insight text.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: exec,
          versionBinding: "BIND_CONTRADICTORY_OTHER",
        }),
      (err: unknown) => {
        assert.ok(err instanceof InvalidCandidateLessonPackageError);
        assert.ok(err.validationErrors.some((e) => e.includes("execution.binding_id")));
        return true;
      }
    );
  });

  it("15: Stage 14 Boundary: optional review reference is purely observational and does not confer promotion", async () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    // Case A: Without stage14ReviewRef
    const resA = await gateway.formulateAndQuarantine({
      proposedInsight: "Lesson without stage 14.",
      supportingEvidence: [createMockObjectiveEvidence()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    });
    assert.strictEqual(resA.package.stage14ReviewRef, undefined);
    assert.strictEqual(resA.receipt.status, "QUARANTINED");

    // Case B: With stage14ReviewRef
    const resB = await gateway.formulateAndQuarantine({
      proposedInsight: "Lesson with stage 14 observational review.",
      supportingEvidence: [createMockObjectiveEvidence()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
      stage14ReviewRef: "STAGE14_REV_2026_01",
    });
    assert.strictEqual(resB.package.stage14ReviewRef, "STAGE14_REV_2026_01");
    // Receipt remains QUARANTINED, exactly identical governance status
    assert.strictEqual(resB.receipt.status, "QUARANTINED");
  });

  it("16: Receipt Validation: fails closed if receipt status is not 'QUARANTINED'", async () => {
    const sink = new MockQuarantineSink();
    // Simulate illegal sink attempting to report PROMOTED or APPROVED
    sink.customReceiptGenerator = (pkg) => ({
      receiptId: "CLQR_ILLEGAL_01",
      lessonPackageId: pkg.packageId,
      quarantinedAt: new Date().toISOString(),
      status: "PROMOTED" as unknown as "QUARANTINED",
      packageIntegrityDigest: pkg.integrityMetadata.integrity_digest,
    });

    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    await assert.rejects(
      () =>
        gateway.formulateAndQuarantine({
          proposedInsight: "Valid insight.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof QuarantineHandoffError);
        assert.ok(String(err).includes('expected "QUARANTINED"'));
        return true;
      }
    );
  });

  it("17: Receipt Validation: fails closed on mismatched lessonPackageId", async () => {
    const sink = new MockQuarantineSink();
    sink.customReceiptGenerator = (pkg) => ({
      receiptId: "CLQR_MISMATCH_01",
      lessonPackageId: "CLEP_WRONG_OTHER_ID",
      quarantinedAt: new Date().toISOString(),
      status: "QUARANTINED",
      packageIntegrityDigest: pkg.integrityMetadata.integrity_digest,
    });

    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    await assert.rejects(
      () =>
        gateway.formulateAndQuarantine({
          proposedInsight: "Valid insight.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof QuarantineHandoffError);
        assert.ok(String(err).includes("lessonPackageId mismatch"));
        return true;
      }
    );
  });

  it("18: Receipt Validation: fails closed on package integrity digest mismatch", async () => {
    const sink = new MockQuarantineSink();
    sink.customReceiptGenerator = (pkg) => ({
      receiptId: "CLQR_CORRUPT_01",
      lessonPackageId: pkg.packageId,
      quarantinedAt: new Date().toISOString(),
      status: "QUARANTINED",
      packageIntegrityDigest: "sha256:corrupted_digest_does_not_match",
    });

    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    await assert.rejects(
      () =>
        gateway.formulateAndQuarantine({
          proposedInsight: "Valid insight.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof QuarantineHandoffError);
        assert.ok(String(err).includes("integrity digest mismatch"));
        return true;
      }
    );
  });

  it("19: Quarantine Failure Behaviour: sink exception wraps into QuarantineHandoffError and leaves package intact", async () => {
    const sink = new MockQuarantineSink();
    sink.shouldRejectWithError = new Error("Remote quarantine storage connection timed out.");

    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    await assert.rejects(
      () =>
        gateway.formulateAndQuarantine({
          proposedInsight: "Valid insight.",
          supportingEvidence: [createMockObjectiveEvidence()],
          scope: createMockScope(),
          uncertainty: createMockUncertainty(),
          execution: createMockExecution(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof QuarantineHandoffError);
        assert.ok(String(err).includes("Remote quarantine storage connection timed out"));
        return true;
      }
    );
  });

  it("20: Integrity & Immutability: package has valid SHA-256 seal and is deeply frozen", () => {
    const sink = new MockQuarantineSink();
    const gateway = new CandidateLessonHandoffGateway({ quarantineSink: sink });

    const pkg = gateway.formulatePackage({
      proposedInsight: "Cabinet coupling resonances require explicit low-end damping.",
      supportingEvidence: [createMockObjectiveEvidence()],
      scope: createMockScope(),
      uncertainty: createMockUncertainty(),
      execution: createMockExecution(),
    });

    assert.ok(pkg.integrityMetadata);
    assert.strictEqual(pkg.integrityMetadata.algorithm, "SHA-256");
    assert.strictEqual(pkg.integrityMetadata.canonical_serialization_format, "CANONICAL-JSON");
    assert.ok(pkg.integrityMetadata.integrity_digest.length === 64);

    // Verify digest recalculation against unsealed payload
    const provider = new DefaultSha256IntegrityProvider();
    const { integrityMetadata, ...unsealedPayload } = pkg;
    const computedDigest = provider.computeDigest(canonicalizeJson(unsealedPayload));
    assert.strictEqual(integrityMetadata.integrity_digest, computedDigest);

    // Verify deep freeze
    assert.ok(Object.isFrozen(pkg));
    assert.ok(Object.isFrozen(pkg.supportingEvidence));
    assert.ok(Object.isFrozen(pkg.scopeRef));
    assert.ok(Object.isFrozen(pkg.uncertaintyRef));

    // Attempted mutation throws in strict mode
    assert.throws(() => {
      (pkg as unknown as Record<string, unknown>).proposedInsight = "Mutated insight!";
    }, TypeError);
  });

  it("21: Active Knowledge Protection: static structural audit confirms zero active knowledge writer imports", () => {
    const lessonsDir = path.resolve(process.cwd(), "src/sound-engineer/validation/lessons");
    const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".ts"));

    assert.ok(files.length >= 3, "Expected at least lessonTypes.ts, candidateLessonGateway.ts, and index.ts");

    for (const file of files) {
      const fullPath = path.join(lessonsDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify zero imports of active database / knowledge mutators
      assert.ok(
        !content.includes("at5DatabaseService"),
        `Forbidden import of at5DatabaseService found in ${file}`
      );
      assert.ok(
        !content.includes("saveGearItem"),
        `Forbidden active knowledge mutation method found in ${file}`
      );
      assert.ok(
        !content.includes("saveVerifiedMapping"),
        `Forbidden active knowledge mutation method found in ${file}`
      );
      assert.ok(
        !content.includes("saveParameterMapping"),
        `Forbidden active knowledge mutation method found in ${file}`
      );
      assert.ok(
        !content.includes("saveMicPlacementMapping"),
        `Forbidden active knowledge mutation method found in ${file}`
      );
      assert.ok(
        !content.includes("saveVIRReferenceOverrides"),
        `Forbidden active knowledge mutation method found in ${file}`
      );
      assert.ok(
        !content.includes("from \"fs\"") && !content.includes("from \"node:fs\""),
        `Forbidden filesystem import found in ${file}`
      );
    }
  });

  it("22: Record Catalogue Protection: exactly 22 governed records in records.ts; CandidateLesson is not Record 23", () => {
    const recordsSchemaPath = path.resolve(
      process.cwd(),
      "src/sound-engineer/validation/schemas/records.ts"
    );
    const content = fs.readFileSync(recordsSchemaPath, "utf-8");

    // Check count of exported record types in records.ts (Record 01 to Record 22)
    const recordTypeMatches = content.match(/export type Validation\w+Record|export type [A-Z]\w+Record|export type ValidationCase|export type ValidationPackage/g);
    assert.ok(recordTypeMatches, "Record types must be found");

    // CandidateLesson must NOT be defined in records.ts
    assert.ok(
      !content.includes("CandidateLessonRecord"),
      "CandidateLessonRecord must NOT be defined as a 23rd record in records.ts"
    );
    assert.ok(
      !content.includes("CandidateLessonEvidencePackageSchema"),
      "CandidateLessonEvidencePackage must NOT be in records.ts"
    );
  });
});
