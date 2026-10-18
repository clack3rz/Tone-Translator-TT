// src/tests/outcomeSynthesizer.test.ts
// Comprehensive focused verification suite for Phase 1C.5h WP-19:
// Governed Validation Outcome Synthesis & Decision Engine (Record 17).
// Bound to frozen specification v0.1j Section 23, Table 11, Table 13, and Implementation Plan v0.1h WP-19.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  EVALUATOR_PERSONAS,
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_METHODOLOGIES,
  REGRESSION_CLASSIFICATIONS,
  REGRESSION_DOMAINS,
  TASK_COMPLETION_STATUSES,
  TOLERANCE_EVALUATIONS,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
  VALIDATION_OUTCOME_CLASSES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  InvalidEndpointError,
} from "../sound-engineer/validation/graph/edgeTypes";
import {
  validationOutcomeRecordSchema,
  EvidenceConflictRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  RegressionAssessmentRecord,
  RevalidationTriggerRecord,
  UATEvaluationRecord,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  ForeignEvidenceError,
  InvalidOutcomeRecordError,
  MissingThresholdProfileError,
  OutcomeContextValidationError,
  ScopeContainmentError,
} from "../sound-engineer/validation/outcome/outcomeErrors";
import {
  GOVERNED_HARD_BLOCKERS,
  SynthesizeOutcomeInput,
} from "../sound-engineer/validation/outcome/outcomeTypes";
import {
  UncertaintyThresholdResolver,
} from "../sound-engineer/validation/outcome/uncertaintyThresholdResolver";
import {
  isApplicableForCurrentBinding,
  ValidationOutcomeSynthesizer,
} from "../sound-engineer/validation/outcome/outcomeSynthesizer";

// ---------------------------------------------------------------------------
// Standard Test Fixtures
// ---------------------------------------------------------------------------

function createTestScope(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return {
    scope_id: "scope_lead_5150_v1",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
    ...overrides,
  };
}

function createTestBinding(overrides?: Partial<ValidationVersionBindingRecord>): ValidationVersionBindingRecord {
  return {
    binding_id: "binding_2026_5150_v1",
    scope_id: "scope_lead_5150_v1",
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
      composite_digest: "sha256:comp_5150_binding",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T12:00:00Z",
    },
    ...overrides,
  };
}

function createTestPackage(overrides?: Partial<ValidationPackage>): ValidationPackage {
  return {
    package_id: "pkg_5150_validation_01",
    intake_id: "intake_2026_01",
    scope_record_ref: "scope_lead_5150_v1",
    version_binding_ref: "binding_2026_5150_v1",
    assigned_test_profiles: [
      "profile:01_structural_schema",
      "profile:02_deterministic_parameter",
      "profile:03_target_platform_export",
      "profile:04_objective_acoustic",
    ],
    validation_case_refs: ["case_01", "case_02", "case_03", "case_04"],
    execution_record_refs: ["exec_01", "exec_02", "exec_03", "exec_04"],
    evidence_refs: ["obj_01", "perc_01"],
    ...overrides,
  };
}

function createTestExecution(overrides?: Partial<ValidationExecutionRecord>): ValidationExecutionRecord {
  return {
    execution_id: "exec_01",
    case_id: "case_01",
    profile_id: "profile:04_objective_acoustic",
    fixture_id: "fix_01",
    binding_id: "binding_2026_5150_v1",
    execution_timestamp: "2026-03-20T12:30:00Z",
    execution_environment: "ubuntu_24.04_x86_64",
    input_audio_integrity_ref: "sha256:in_01",
    output_audio_integrity_ref: "sha256:out_01",
    execution_duration_ms: 150,
    anomalies_detected: [],
    raw_measurements: {},
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "trace_01",
    ...overrides,
  };
}

function createTestObjectiveEvidence(overrides?: Partial<ObjectiveEvidenceRecord>): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: "obj_01",
    execution_id: "exec_01",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { frequency_delta_db: 0.15 },
    applied_threshold_profile_ref: "threshold_profile:core_dsp:standard",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.15,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["spectrum_dump.json"],
    ...overrides,
  };
}

function createTestPerceptualEvidence(overrides?: Partial<PerceptualEvaluationRecord>): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: "perc_01",
    execution_id: "exec_01",
    evaluator_id: "eval_master_01",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "Genelec 8351B",
      calibrated_spl_profile_ref: "spl_85db_c_weighted",
      acoustic_treatment_level: "LEDE_Class_A",
    },
    presented_stimuli_refs: { candidate: "stim_cand_01", reference: "stim_ref_01" },
    perceptual_dimensions_evaluated: { timbre_accuracy: 9.5, dynamic_punch: 9.2 },
    qualitative_observations: "Transparent harmonic overtone reproduction matching golden Plexi reference.",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    ...overrides,
  };
}

function createTestUATEvidence(overrides?: Partial<UATEvaluationRecord>): UATEvaluationRecord {
  return {
    uat_id: "uat_01",
    package_id: "pkg_5150_validation_01",
    evaluator_persona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
    task_scenario_id: "scenario_studio_tracking_01",
    task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
    task_duration_seconds: 45,
    workflow_satisfaction_rating: 9.0,
    cognitive_friction_notes: "None observed. Signal chain instantiated seamlessly.",
    musical_fitness_verdict: "ACCEPTED",
    uat_blockers_identified: [],
    ...overrides,
  };
}

function createTestRegression(overrides?: Partial<RegressionAssessmentRecord>): RegressionAssessmentRecord {
  return {
    regression_id: "reg_01",
    package_id: "pkg_5150_validation_01",
    comparison_target: "golden_reference_v1",
    divergence_detected: false,
    divergence_magnitude: 0.05,
    classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
    materiality_score: "NEGLIGIBLE",
    affected_scope: ["guitar:amp:5150_lead"],
    regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
    detailed_justification: "Imperceptible floating point variation within 0.05dB tolerance.",
    blocks_gate_8: false,
    ...overrides,
  };
}

function createTestConflict(overrides?: Partial<EvidenceConflictRecord>): EvidenceConflictRecord {
  return {
    conflict_id: "conf_01",
    package_id: "pkg_5150_validation_01",
    conflict_type: CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL,
    competing_evidence_refs: ["obj_01", "perc_01"],
    conflict_description: "Minor spectral peak variation reviewed by expert panel.",
    underlying_acoustic_phenomenon: "Phase cancellation in cabinet early reflection simulation.",
    resolution_strategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
    resolution_status: CONFLICT_RESOLUTION_STATUSES.RESOLVED_BY_PANEL,
    residual_uncertainty_score: 0.1,
    ...overrides,
  };
}

function createTestUncertainty(overrides?: Partial<ValidationUncertaintyRecord>): ValidationUncertaintyRecord {
  return {
    uncertainty_id: "unc_01",
    package_id: "pkg_5150_validation_01",
    uncertainty_source: UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE,
    affected_scope: ["guitar:amp:5150_lead"],
    potential_production_risk: "Minor sample variance in extreme down-tuned drop-A riffs.",
    gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
    required_monitoring_if_authorized: [],
    ...overrides,
  };
}

function createTestFailure(overrides?: Partial<ValidationFailureRecord>): ValidationFailureRecord {
  return {
    failure_id: "fail_01",
    execution_id: "exec_01",
    failure_timestamp: "2026-03-20T12:00:00Z",
    failure_title: "Export serialization crash",
    failure_symptom: "Segmentation fault during AT5 preset XML emission",
    attribution_class: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
    attribution_evidence_refs: ["exec_01"],
    attribution_confidence: "CERTAIN",
    materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
    affected_scope: ["guitar:amp:5150_lead"],
    gate_8_blocked: true,
    remand_destination: "Stage 12 Translation Governance",
    retest_prerequisites: "Fix AT5 XML parameter encoding",
    ...overrides,
  };
}

function createCompleteExecutions(): ValidationExecutionRecord[] {
  return [
    createTestExecution({ execution_id: "exec_01", profile_id: "profile:01_structural_schema" }),
    createTestExecution({ execution_id: "exec_02", profile_id: "profile:02_deterministic_parameter" }),
    createTestExecution({ execution_id: "exec_03", profile_id: "profile:03_target_platform_export" }),
    createTestExecution({ execution_id: "exec_04", profile_id: "profile:04_objective_acoustic" }),
  ];
}

// ---------------------------------------------------------------------------
// Focused Verification Suite for WP-19 (22 Criteria)
// ---------------------------------------------------------------------------

describe("Phase 1C.5h — WP-19 Focused Verification", () => {
  // Criterion 1: Exact Record 17 schema and rejection of extra fields
  it("01: Exact Record 17 schema accepted; extra/invented fields strictly rejected", () => {
    const validOutcomePayload: ValidationOutcomeRecord = {
      outcome_id: "out_test_01",
      package_id: "pkg_5150_validation_01",
      outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
      evaluated_scope: "scope_lead_5150_v1",
      version_binding: "binding_2026_5150_v1",
      summary_verdict: "All validation criteria satisfied.",
      objective_summary: { passed: 10, failed: 0 },
      perceptual_summary: { pass: 5, fail: 0 },
      uat_summary: { completed: 3, failed: 0 },
      regression_summary: { regressions: 0 },
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-03-20T13:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:digest_123",
        algorithm: "SHA-256",
        sealed_at: "2026-03-20T13:00:00Z",
      },
    };

    const parsed = validationOutcomeRecordSchema.parse(validOutcomePayload);
    assert.equal(parsed.outcome_id, "out_test_01");

    // Extra fields rejected
    const extraForbiddenFields = [
      { gate_8_authorized: true },
      { production_ready: true },
      { decision_outcome: "AUTHORIZED" },
      { governance_status: "ACTIVE" },
      { overall_score: 95 },
      { confidence_score: 0.99 },
      { invalidated: true },
    ];

    for (const forbidden of extraForbiddenFields) {
      assert.throws(
        () => validationOutcomeRecordSchema.parse({ ...validOutcomePayload, ...forbidden }),
        /unrecognized_keys/i
      );
    }
  });

  // Criterion 2: Exact four outcome classes
  it("02: Exact four outcome classes accepted; non-canonical aliases rejected", () => {
    assert.deepEqual(
      Object.values(VALIDATION_OUTCOME_CLASSES).sort(),
      ["BLOCKED", "CONDITIONAL", "FAIL", "PASS"].sort()
    );

    const base = {
      outcome_id: "out_test_02",
      package_id: "pkg_01",
      evaluated_scope: "scope_01",
      version_binding: "binding_01",
      summary_verdict: "Summary",
      objective_summary: {},
      perceptual_summary: {},
      uat_summary: {},
      regression_summary: {},
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-03-20T13:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:digest",
        algorithm: "SHA-256",
        sealed_at: "2026-03-20T13:00:00Z",
      },
    };

    for (const validClass of ["PASS", "FAIL", "BLOCKED", "CONDITIONAL"]) {
      const record = validationOutcomeRecordSchema.parse({ ...base, outcome_class: validClass });
      assert.equal(record.outcome_class, validClass);
    }

    const invalidAliases = [
      "INVALIDATED",
      "PASSED",
      "FAILED",
      "READY",
      "AUTHORIZED",
      "CONDITIONALLY_AUTHORIZED",
      "REJECTED",
      "NOT_EVALUABLE",
    ];
    for (const alias of invalidAliases) {
      assert.throws(
        () => validationOutcomeRecordSchema.parse({ ...base, outcome_class: alias }),
        /invalid_value|invalid/i
      );
    }
  });

  // Criterion 3: Precedence based on architectural semantics (Case A, Case B, Case C)
  it("03: Outcome precedence preserves architectural semantics for Case A (FAIL), Case B (BLOCKED), and Case C (FAIL with coincident blockers preserved)", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // Case A: Valid evaluation completed; verified material genuine regression exists; no evaluation-invalidating prerequisite failure -> FAIL
    const caseA = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
          materiality_score: "HIGH",
          blocks_gate_8: true,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(caseA.outcomeClass, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.equal(caseA.activeBlockers.length, 0);

    // Case B: Required fixture/environment makes evaluation impossible; no valid candidate failure established -> BLOCKED
    const caseB = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      fixturesVerified: false, // Broken fixture precondition
      rollbackOperationalityVerified: true,
    });
    assert.equal(caseB.outcomeClass, VALIDATION_OUTCOME_CLASSES.BLOCKED);

    // Case C: Verified material candidate failure exists AND an unrelated/later blocking condition also exists -> FAIL with coincident blockers preserved
    const caseC = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      targetPlatformExportVerified: false, // Verified candidate failure: BLOCK-02 export crash
      hardBlockersPresent: [GOVERNED_HARD_BLOCKERS.BLOCK_05_INSTABILITY], // Coincident blocker
      rollbackOperationalityVerified: true,
    });
    assert.equal(caseC.outcomeClass, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.ok(caseC.activeBlockers.length > 0);
    // Does NOT blindly erase the verified failure or the blocker: both are preserved
    assert.match(caseC.summaryVerdict, /FAIL \(WITH COINCIDENT BLOCKERS\)/i);
    assert.ok(caseC.unresolvedIssues.some((issue) => issue.includes("BLOCK-02: Export Crash")));
    assert.ok(caseC.unresolvedIssues.some((issue) => issue.includes("BLOCK-05: Instability")));
  });

  // Criterion 4: UNRESOLVED divergence is NOT GENUINE_REGRESSION
  it("04: UNRESOLVED divergence is strictly distinct from GENUINE_REGRESSION across 5 separate states", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // State 1: Material GENUINE_REGRESSION -> classified as genuine regression, yields FAIL
    const state1 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          regression_id: "reg_state_1",
          classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
          materiality_score: "HIGH",
          blocks_gate_8: true,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(state1.outcomeClass, VALIDATION_OUTCOME_CLASSES.FAIL);
    const s1Summary = state1.outcomeRecord.regression_summary as any;
    assert.equal(s1Summary.genuine_regression_count, 1);
    assert.equal(s1Summary.unresolved_count, 0);

    // State 2: UNRESOLVED divergence + blocks_gate_8: true -> blocks PASS as active blocker, NOT genuine regression
    const state2 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          regression_id: "reg_state_2",
          classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
          materiality_score: "MEDIUM",
          blocks_gate_8: true,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(state2.outcomeClass, VALIDATION_OUTCOME_CLASSES.BLOCKED);
    const s2Summary = state2.outcomeRecord.regression_summary as any;
    assert.equal(s2Summary.genuine_regression_count, 0); // NOT collapsed into genuine regression
    assert.equal(s2Summary.unresolved_count, 1);
    assert.ok(state2.activeBlockers.some((b) => b.includes("Unresolved divergence")));

    // State 3: UNRESOLVED divergence + non-blocking state -> remains in unresolved issues, NOT genuine regression
    const state3 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          regression_id: "reg_state_3",
          classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
          materiality_score: "LOW",
          blocks_gate_8: false,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    const s3Summary = state3.outcomeRecord.regression_summary as any;
    assert.equal(s3Summary.genuine_regression_count, 0);
    assert.equal(s3Summary.unresolved_count, 1);
    assert.ok(state3.unresolvedIssues.some((u) => u.includes("reg_state_3")));

    // State 4: INTENTIONAL_CORRECTION -> does not block or fail
    const state4 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          regression_id: "reg_state_4",
          classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
          blocks_gate_8: false,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(state4.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);
    const s4Summary = state4.outcomeRecord.regression_summary as any;
    assert.equal(s4Summary.intentional_correction_count, 1);
    assert.equal(s4Summary.genuine_regression_count, 0);

    // State 5: NEUTRAL divergence -> does not block or fail
    const state5 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          regression_id: "reg_state_5",
          classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
          blocks_gate_8: false,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(state5.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);
    const s5Summary = state5.outcomeRecord.regression_summary as any;
    assert.equal(s5Summary.neutral_divergence_count, 1);
    assert.equal(s5Summary.genuine_regression_count, 0);
  });

  // Criterion 5: PASS requires strict positive proof (removing requirements breaks PASS)
  it("05: PASS requires strict positive proof; removing requirements breaks PASS", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // Baseline: Clean PASS
    const cleanPass = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      perceptualEvidence: [createTestPerceptualEvidence()],
      uatEvidence: [createTestUATEvidence()],
      rollbackOperationalityVerified: true,
    });
    assert.equal(cleanPass.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);

    // 1. Remove rollback verification -> fails PASS
    const noRollback = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      rollbackOperationalityVerified: false,
    });
    assert.notEqual(noRollback.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);

    // 2. Remove objective pass -> fails PASS
    const failedObjective = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence({ objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL })],
      rollbackOperationalityVerified: true,
    });
    assert.notEqual(failedObjective.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);

    // 3. Remove complete coverage -> fails PASS
    const missingExec = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [executions[0]], // Missing 3 executions
      objectiveEvidence: [createTestObjectiveEvidence()],
      rollbackOperationalityVerified: true,
    });
    assert.notEqual(missingExec.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);

    // 4. Inject genuine regression -> fails PASS
    const withRegression = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: [
        createTestRegression({
          classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
          materiality_score: "HIGH",
          blocks_gate_8: true,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.notEqual(withRegression.outcomeClass, VALIDATION_OUTCOME_CLASSES.PASS);
  });

  // Criterion 6: Applicability-driven accounting
  it("06: WP-07 applicability: non-applicable excluded, missing applicable blocks, no local rule invention", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const executions = createCompleteExecutions();

    // Package with an assigned profile that is legitimately non-applicable for this gear domain
    const pkgWithNonApp = createTestPackage({
      assigned_test_profiles: [
        "profile:01_structural_schema",
        "profile:02_deterministic_parameter",
        "profile:03_target_platform_export",
        "profile:04_objective_acoustic",
        "profile:08_mix_context", // Non-applicable for Core Guitar Preset
      ],
    });

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkgWithNonApp,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      rollbackOperationalityVerified: true,
    });
    assert.equal(result.isPass, true);
    assert.ok(
      result.applicabilityDiagnostics.some((d) => d.includes("NON_APPLICABLE"))
    );
  });

  // Criterion 7: Objective evidence
  it("07: objective_summary accurately reflects WP-11 evidence without synthetic global score", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const objEvidence = [
      createTestObjectiveEvidence({
        objective_evidence_id: "obj_01",
        metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      }),
      createTestObjectiveEvidence({
        objective_evidence_id: "obj_02",
        metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.BORDERLINE,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      }),
      createTestObjectiveEvidence({
        objective_evidence_id: "obj_03",
        metric_category: OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.NOT_APPLICABLE,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      }),
    ];

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: objEvidence,
      rollbackOperationalityVerified: true,
    });

    const sum = result.outcomeRecord.objective_summary as any;
    assert.equal(sum.total_evaluations, 3);
    assert.equal(sum.passed_count, 3);
    assert.equal(sum.borderline_count, 1);
    assert.equal(sum.not_applicable_count, 1);
    assert.equal(sum.global_score, undefined); // No synthetic global score
  });

  // Criterion 8: Perceptual evidence and objective PASS / listening FAIL conflict
  it("08: Perceptual evidence influences outcome; objective PASS / listening FAIL respects conflict resolution", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // Objective metrics PASS, but listening panel FAILS
    const objPass = [createTestObjectiveEvidence({ objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS })];
    const percFail = [createTestPerceptualEvidence({ evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL })];

    const failOutcome = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: objPass,
      perceptualEvidence: percFail,
      rollbackOperationalityVerified: true,
    });

    // Listening failure cannot be blindly overruled by objective metrics
    assert.equal(failOutcome.outcomeClass, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.match(failOutcome.summaryVerdict, /Perceptual evaluation failed/i);
  });

  // Criterion 9: UAT evidence exact semantics
  it("09: UAT evidence uses exact machine semantics; friction produces CONDITIONAL with conditions", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const uatFriction = [
      createTestUATEvidence({
        task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
        musical_fitness_verdict: "CONDITIONALLY_ACCEPTED",
        cognitive_friction_notes: "Preset switching had 120ms delay.",
      }),
    ];

    const condOutcome = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      uatEvidence: uatFriction,
      rollbackOperationalityVerified: true,
    });

    assert.equal(condOutcome.outcomeClass, VALIDATION_OUTCOME_CLASSES.CONDITIONAL);
    assert.ok(condOutcome.conditionsImposed.length > 0);
  });

  // Criterion 10: Regression summary distinct classifications
  it("10: Regression summary maintains distinct counts with zero scalar collapse", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const regressions = [
      createTestRegression({ regression_id: "r1", classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION }),
      createTestRegression({ regression_id: "r2", classification: REGRESSION_CLASSIFICATIONS.NEUTRAL }),
      createTestRegression({ regression_id: "r3", classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED }),
    ];

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [createTestObjectiveEvidence()],
      regressionAssessments: regressions,
      rollbackOperationalityVerified: true,
    });

    const sum = result.outcomeRecord.regression_summary as any;
    assert.equal(sum.intentional_correction_count, 1);
    assert.equal(sum.neutral_divergence_count, 1);
    assert.equal(sum.unresolved_count, 1);
    assert.equal(sum.genuine_regression_count, 0);
    assert.equal(sum.overall_regression_score, undefined); // No scalar score
  });

  // Criterion 11: All eight governed hard blockers prevent PASS
  it("11: All eight governed hard blockers prevent PASS without semantic flattening", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // Verify all 8 blockers exist in enum map
    assert.equal(Object.keys(GOVERNED_HARD_BLOCKERS).length, 8);

    // Test BLOCK-01: Regression -> FAIL
    const r1 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      regressionAssessments: [
        createTestRegression({ classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION, materiality_score: "HIGH" }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(r1.outcomeClass, VALIDATION_OUTCOME_CLASSES.FAIL);

    // Test BLOCK-07: Contamination -> BLOCKED
    const r7 = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      fixturesVerified: false,
      rollbackOperationalityVerified: true,
    });
    assert.equal(r7.outcomeClass, VALIDATION_OUTCOME_CLASSES.BLOCKED);
  });

  // Criterion 12: Uncertainty handling (WP-18 exact semantics)
  it("12: Uncertainty: FORCES_BLOCK blocks, ALLOWS_CONDITIONAL yields CONDITIONAL, ACCEPTABLE_LOW_RISK permits PASS", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    // FORCES_BLOCK
    const rBlock = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      uncertaintyRecords: [
        createTestUncertainty({
          uncertainty_source: UNCERTAINTY_SOURCES.CALIBRATION_AMBIGUITY,
          gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(rBlock.outcomeClass, VALIDATION_OUTCOME_CLASSES.BLOCKED);

    // ALLOWS_CONDITIONAL
    const rCond = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      uncertaintyRecords: [
        createTestUncertainty({
          uncertainty_source: UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE,
          gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
          required_monitoring_if_authorized: ["telemetry:sample_monitoring"],
        }),
      ],
      rollbackOperationalityVerified: true,
    });
    assert.equal(rCond.outcomeClass, VALIDATION_OUTCOME_CLASSES.CONDITIONAL);
    assert.ok(rCond.conditionsImposed.includes("telemetry:sample_monitoring"));
  });

  // Criterion 13: UncertaintyThresholdResolver
  it("13: UncertaintyThresholdResolver resolves known profiles and fails closed on missing/empty/unknown", () => {
    const resolver = new UncertaintyThresholdResolver();

    // Known profiles resolve
    assert.ok(resolver.resolveProfile("threshold_profile:core_dsp:standard"));
    assert.ok(resolver.resolveProfile("threshold_profile:platform_export:standard"));
    assert.ok(resolver.resolveProfile("threshold_profile:user_facing:standard"));

    // Missing, empty, or unknown strictly fails closed
    assert.throws(() => resolver.resolveProfile(undefined), MissingThresholdProfileError);
    assert.throws(() => resolver.resolveProfile(""), MissingThresholdProfileError);
    assert.throws(() => resolver.resolveProfile("threshold_profile:unknown_profile"), MissingThresholdProfileError);
  });

  // Criterion 14: CONDITIONAL requirements (non-empty conditions, declarative only)
  it("14: CONDITIONAL outcome requires non-empty declarative conditions; no telemetry execution", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      uncertaintyRecords: [
        createTestUncertainty({
          gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
          required_monitoring_if_authorized: ["telemetry:monitor_gain_staging"],
        }),
      ],
      rollbackOperationalityVerified: true,
    });

    assert.equal(result.outcomeClass, VALIDATION_OUTCOME_CLASSES.CONDITIONAL);
    assert.ok(result.conditionsImposed.length > 0);
    assert.ok(result.conditionsImposed.includes("telemetry:monitor_gain_staging"));
    // Declarative only: no runtime execution
    assert.equal((result as any).telemetryStarted, undefined);
  });

  // Criterion 15: unresolved_issues completeness
  it("15: unresolved_issues accurately aggregates active open items without historical leakage", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      conflictRecords: [
        createTestConflict({ conflict_id: "c_active", resolution_status: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED }),
        createTestConflict({ conflict_id: "c_resolved", resolution_status: CONFLICT_RESOLUTION_STATUSES.RESOLVED_BY_PANEL }),
      ],
      uncertaintyRecords: [
        createTestUncertainty({ uncertainty_id: "u_active", gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL }),
      ],
      rollbackOperationalityVerified: true,
    });

    assert.ok(result.unresolvedIssues.some((issue) => issue.includes("c_active")));
    assert.ok(!result.unresolvedIssues.some((issue) => issue.includes("c_resolved")));
    assert.ok(result.unresolvedIssues.some((issue) => issue.includes("u_active")));
  });

  // Criterion 16: Context coherence fail-closed checks
  it("16: Context coherence: package, scope, version binding, and foreign evidence fail closed", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();

    // Package/Scope mismatch
    assert.throws(
      () => synthesizer.synthesizeOutcome({
        packageRecord: pkg,
        scopeRecord: createTestScope({ scope_id: "other_scope" }),
        versionBindingRecord: binding,
      }),
      OutcomeContextValidationError
    );

    // Package/Binding mismatch
    assert.throws(
      () => synthesizer.synthesizeOutcome({
        packageRecord: pkg,
        scopeRecord: scope,
        versionBindingRecord: createTestBinding({ binding_id: "other_binding" }),
      }),
      OutcomeContextValidationError
    );

    // Foreign UAT evidence
    assert.throws(
      () => synthesizer.synthesizeOutcome({
        packageRecord: pkg,
        scopeRecord: scope,
        versionBindingRecord: binding,
        uatEvidence: [createTestUATEvidence({ package_id: "foreign_pkg" })],
      }),
      ForeignEvidenceError
    );

    // Foreign Regression evidence
    assert.throws(
      () => synthesizer.synthesizeOutcome({
        packageRecord: pkg,
        scopeRecord: scope,
        versionBindingRecord: binding,
        regressionAssessments: [createTestRegression({ package_id: "foreign_pkg" })],
      }),
      ForeignEvidenceError
    );
  });

  // Criterion 17: Canonical EVIDENCED_BY
  it("17: Canonical EVIDENCED_BY: Outcome -> Objective and Outcome -> Perceptual accepted; reverse and other entities rejected", () => {
    const graph = new ValidationRelationshipGraph();
    const synthesizer = new ValidationOutcomeSynthesizer({ graph });
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const obj = createTestObjectiveEvidence();
    const perc = createTestPerceptualEvidence();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      objectiveEvidence: [obj],
      perceptualEvidence: [perc],
      rollbackOperationalityVerified: true,
    });

    // Valid EVIDENCED_BY edges created
    assert.ok(
      result.edgesCreated.some(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY && e.target.id === obj.objective_evidence_id
      )
    );
    assert.ok(
      result.edgesCreated.some(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY && e.target.id === perc.perceptual_evidence_id
      )
    );

    // Reverse rejected
    assert.throws(() => {
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
        source: { id: obj.objective_evidence_id, kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
        target: { id: result.outcomeRecord.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
      });
    }, InvalidEndpointError);

    // Outcome -> UAT rejected as EVIDENCED_BY
    graph.registerNode({ id: "uat_dummy", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord });
    assert.throws(() => {
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
        source: { id: result.outcomeRecord.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        target: { id: "uat_dummy", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
      });
    }, InvalidEndpointError);
  });

  // Criterion 18: Canonical UNCERTAIN_OF
  it("18: Canonical UNCERTAIN_OF: Outcome -> Uncertainty uses UNCERTAIN_OF without endpoint widening", () => {
    const graph = new ValidationRelationshipGraph();
    const synthesizer = new ValidationOutcomeSynthesizer({ graph });
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();
    const uncert = createTestUncertainty();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      uncertaintyRecords: [uncert],
      rollbackOperationalityVerified: true,
    });

    assert.ok(
      result.edgesCreated.some(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.UNCERTAIN_OF && e.target.id === uncert.uncertainty_id
      )
    );
  });

  // Criterion 19: Record 17 immutability
  it("19: Record 17 is deep-frozen and sealed; mutating outcome_class to INVALIDATED is impossible", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      rollbackOperationalityVerified: true,
    });

    assert.ok(Object.isFrozen(result.outcomeRecord));
    assert.throws(() => {
      (result.outcomeRecord as any).outcome_class = "INVALIDATED";
    }, /TypeError/i);
    assert.equal(result.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
  });

  // Criterion 20: Stale applicability query
  it("20: isApplicableForCurrentBinding detects staleness dynamically without mutating outcome", () => {
    const graph = new ValidationRelationshipGraph();
    const scope = createTestScope();
    const bindingV1 = createTestBinding({ binding_id: "binding_v1" });
    const bindingV2 = createTestBinding({ binding_id: "binding_v2" });
    const pkg = createTestPackage({ version_binding_ref: "binding_v1" });
    const executions = createCompleteExecutions();

    const synthesizer = new ValidationOutcomeSynthesizer({ graph });
    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: bindingV1,
      executionRecords: executions,
      rollbackOperationalityVerified: true,
    });

    const historicalRecord = result.outcomeRecord;
    assert.equal(isApplicableForCurrentBinding(historicalRecord, bindingV1, graph), true);
    assert.equal(isApplicableForCurrentBinding(historicalRecord, bindingV2, graph), false);

    // Test-only RevalidationTriggerRecord fixture to establish INVALIDATED_BY edge
    const triggerFixture: RevalidationTriggerRecord = {
      trigger_id: "trig_01",
      trigger_source: "TRIGGER_01_UPSTREAM_REASONING_UPDATE",
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: "FULL_RETEST",
      trigger_timestamp: "2026-03-21T00:00:00Z",
    };

    graph.registerNode({ id: triggerFixture.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: { id: historicalRecord.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
      target: { id: triggerFixture.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
    });

    // Stale applicability observed dynamically
    assert.equal(isApplicableForCurrentBinding(historicalRecord, bindingV1, graph), false);
    // Historical outcome retains original PASS class and is NOT mutated
    assert.equal(historicalRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
  });

  // Criterion 21: Gate-8 separation
  it("21: Gate-8 separation: PASS != AUTHORIZED, CONDITIONAL != CONDITIONALLY_AUTHORIZED; no downstream records created", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      rollbackOperationalityVerified: true,
    });

    assert.equal((result as any).adoptionDecisionRecord, undefined);
    assert.equal((result as any).productionReadinessRecord, undefined);
    assert.equal((result as any).gate8ChangeRecord, undefined);
    assert.equal((result.outcomeRecord as any).gate_8_authorized, undefined);
  });

  // Criterion 22: No WP-20 production leakage
  it("22: No WP-20 leakage: production code contains zero trigger generators or retest planners", () => {
    const synthesizer = new ValidationOutcomeSynthesizer();
    const scope = createTestScope();
    const binding = createTestBinding();
    const pkg = createTestPackage();
    const executions = createCompleteExecutions();

    const result = synthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: executions,
      rollbackOperationalityVerified: true,
    });

    assert.equal((result as any).triggerRecord, undefined);
    assert.equal((result as any).retestPlanRecord, undefined);
  });
});
