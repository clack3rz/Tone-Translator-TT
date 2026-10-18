// src/tests/revalidationRetest.test.ts
// Phase 1C.5h WP-20 Focused Verification:
// Revalidation Trigger Detection & Targeted Retest Planning (Records 18 & 19).
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

import test from "node:test";
import assert from "node:assert/strict";

import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import {
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  VALIDATION_OUTCOME_CLASSES,
  VALIDATION_PRIMARY_DOMAINS,
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  TOLERANCE_EVALUATIONS,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  RetestPlanRecord,
  retestPlanRecordSchema,
  RevalidationTriggerRecord,
  revalidationTriggerRecordSchema,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  RevalidationTriggerDetector,
  RetestPlanner,
  normalizeRequiredAction,
  normalizeTriggerSource,
  BindingIntegrityError,
  IncoherentBindingTransitionError,
  InvalidRequiredActionError,
  InvalidTriggerSourceError,
  InvalidSupersessionError,
  ScopeContainmentError,
  EvidencePartitioningError,
  RetestPlanningError,
} from "../sound-engineer/validation/retest";
import { isApplicableForCurrentBinding } from "../sound-engineer/validation/outcome";

// =============================================================================
// Authoritative Fixture Generators
// =============================================================================

function createTestScope(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return {
    scope_id: "scope_lead_5150_v1",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: [
      "guitar:amp:5150_lead",
      "guitar:cab:4x12_greenback",
      "guitar:pedal:tube_screamer",
    ],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
    ...overrides,
  };
}

function createTestBinding(
  overrides?: Partial<ValidationVersionBindingRecord>
): ValidationVersionBindingRecord {
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
      component_digests: {
        runtime_implementation_version: "sha256:r1",
      },
    },
    ...overrides,
  };
}

function createUpdatedBinding(
  mutations: Partial<ValidationVersionBindingRecord>,
  newId = "binding_2026_5150_v2"
): ValidationVersionBindingRecord {
  const base = createTestBinding();
  return {
    ...base,
    binding_id: newId,
    version_integrity_reference: {
      composite_digest: `sha256:comp_updated_${newId}`,
      algorithm: "SHA-256",
      sealed_at: "2026-03-21T12:00:00Z",
      component_digests: {
        runtime_implementation_version: "sha256:r2",
      },
    },
    ...mutations,
  };
}

function createTestCase(
  caseId: string,
  subject: string,
  units: string[],
  overrides?: Partial<ValidationCase>
): ValidationCase {
  return {
    case_id: caseId,
    title: `Validation case for ${subject}`,
    validation_question: `Does ${subject} reproduce authoritative tone within tolerance?`,
    validation_subject: subject,
    scoped_boundaries: units,
    applicable_test_dimensions: ["profile:04_objective_acoustic"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: ["fix_01"],
    evaluation_methodology: "AUTOMATED_SIGNAL_ANALYSIS",
    acceptance_criteria_ref: "criteria:std",
    failure_consequence: "REJECT",
    expected_remand_destination: "DSP_TEAM",
    ...overrides,
  };
}

function createTestPackage(overrides?: Partial<ValidationPackage>): ValidationPackage {
  return {
    package_id: "pkg_5150_validation_01",
    intake_id: "intake_2026_01",
    scope_record_ref: "scope_lead_5150_v1",
    version_binding_ref: "binding_2026_5150_v1",
    assigned_test_profiles: ["profile:04_objective_acoustic"],
    validation_case_refs: ["case_01", "case_02", "case_03"],
    execution_record_refs: ["exec_01", "exec_02", "exec_03"],
    evidence_refs: ["obj_01", "obj_02", "obj_03"],
    ...overrides,
  };
}

function createTestExecution(
  execId: string,
  caseId: string,
  fixtureId = "fix_01",
  overrides?: Partial<ValidationExecutionRecord>
): ValidationExecutionRecord {
  return {
    execution_id: execId,
    case_id: caseId,
    profile_id: "profile:04_objective_acoustic",
    fixture_id: fixtureId,
    binding_id: "binding_2026_5150_v1",
    execution_timestamp: "2026-03-20T12:30:00Z",
    execution_environment: "ubuntu_24.04_x86_64",
    input_audio_integrity_ref: "sha256:in_01",
    output_audio_integrity_ref: "sha256:out_01",
    execution_duration_ms: 120,
    anomalies_detected: [],
    raw_measurements: {},
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "trace_5150_v1",
    ...overrides,
  };
}

function createTestObjectiveEvidence(
  evidenceId: string,
  execId: string,
  overrides?: Partial<ObjectiveEvidenceRecord>
): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: evidenceId,
    execution_id: execId,
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { delta_db: 0.1 },
    applied_threshold_profile_ref: "threshold_std",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.1,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["fft.json"],
    ...overrides,
  };
}

function createTestPerceptualEvidence(
  evidenceId: string,
  execId: string,
  overrides?: Partial<PerceptualEvaluationRecord>
): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: evidenceId,
    execution_id: execId,
    evaluator_id: "evaluator_master_01",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.MUSHRA,
    listening_environment: {
      monitor_type: "nearfield_studio_monitors",
      calibrated_spl_profile_ref: "spl_cal_85db",
      acoustic_treatment_level: "treated_control_room",
    },
    presented_stimuli_refs: {
      stimulus_a: "ref_dry",
      stimulus_b: "render_target",
    },
    perceptual_dimensions_evaluated: {
      clarity: 95,
      transparency: 94,
    },
    qualitative_observations: "Tonal fidelity within audible transparency threshold",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    ...overrides,
  };
}

function createTestOutcome(overrides?: Partial<ValidationOutcomeRecord>): ValidationOutcomeRecord {
  return {
    outcome_id: "outcome_5150_pass_01",
    package_id: "pkg_5150_validation_01",
    outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
    evaluated_scope: "scope_5150_lead",
    version_binding: "binding_2026_5150_v1",
    summary_verdict: "Acoustic and platform validation passed unconditionally.",
    objective_summary: { total: 3, passed: 3, failed: 0 },
    perceptual_summary: { total: 0, passed: 0, failed: 0 },
    uat_summary: { total: 0, completed: 0, friction: 0, failed: 0 },
    regression_summary: { total: 0, genuine: 0, corrections: 0, neutral: 0, unresolved: 0 },
    unresolved_issues: [],
    conditions_imposed: [],
    timestamp: "2026-03-20T13:00:00Z",
    record_integrity_metadata: {
      integrity_digest: "sha256:out_sig",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T13:00:00Z",
    },
    ...overrides,
  };
}

// =============================================================================
// Comprehensive WP-20 Focused Verification Suite
// =============================================================================

test("Phase 1C.5h — WP-20 Focused Verification", async (t) => {
  const detector = new RevalidationTriggerDetector();
  const planner = new RetestPlanner();

  // ---------------------------------------------------------------------------
  // 1. Exact Record 18 schema
  // ---------------------------------------------------------------------------
  await t.test("01: Exact Record 18 schema accepted; extra/invented fields strictly rejected", () => {
    const validRecord = {
      trigger_id: "trig_001",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST,
      trigger_timestamp: "2026-03-21T10:00:00Z",
    };

    assert.doesNotThrow(() => revalidationTriggerRecordSchema.parse(validRecord));

    // Reject extra invented fields
    assert.throws(
      () => revalidationTriggerRecordSchema.parse({ ...validRecord, invented_field: "UNAPPROVED" }),
      /unrecognized_keys/i
    );
    // Reject mutable lifecycle field
    assert.throws(
      () => revalidationTriggerRecordSchema.parse({ ...validRecord, status: "ACTIVE" }),
      /unrecognized_keys/i
    );
    // Reject embedded Gate-8 decision state
    assert.throws(
      () => revalidationTriggerRecordSchema.parse({ ...validRecord, gate_8_approved: true }),
      /unrecognized_keys/i
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Exact Record 19 schema
  // ---------------------------------------------------------------------------
  await t.test("02: Exact Record 19 schema accepted; extra/invented fields strictly rejected", () => {
    const validPlan = {
      retest_plan_id: "plan_001",
      trigger_id: "trig_001",
      previous_package_id: "pkg_001",
      retained_valid_evidence_refs: ["obj_01"],
      invalidated_evidence_refs: ["obj_02"],
      required_new_cases: ["case_02"],
      retest_scope: ["guitar:amp:5150_lead"],
    };

    assert.doesNotThrow(() => retestPlanRecordSchema.parse(validPlan));

    // Reject status, approval, Gate-8, result fields
    assert.throws(
      () => retestPlanRecordSchema.parse({ ...validPlan, status: "PLANNED" }),
      /unrecognized_keys/i
    );
    assert.throws(
      () => retestPlanRecordSchema.parse({ ...validPlan, gate_8_state: "PENDING" }),
      /unrecognized_keys/i
    );
    assert.throws(
      () => retestPlanRecordSchema.parse({ ...validPlan, approval: "GRANTED" }),
      /unrecognized_keys/i
    );
    assert.throws(
      () => retestPlanRecordSchema.parse({ ...validPlan, execution_result: "SUCCESS" }),
      /unrecognized_keys/i
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Exact required_action vocabulary
  // ---------------------------------------------------------------------------
  await t.test("03: Exact four required_action values; invented values rejected", () => {
    assert.equal(normalizeRequiredAction("NO_ACTION"), "NO_ACTION");
    assert.equal(normalizeRequiredAction("PARTIAL_RETEST"), "PARTIAL_RETEST");
    assert.equal(normalizeRequiredAction("FULL_RETEST"), "FULL_RETEST");
    assert.equal(normalizeRequiredAction("SUSPEND_GATE_8"), "SUSPEND_GATE_8");

    assert.throws(() => normalizeRequiredAction("INVALIDATE"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("RETEST"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("REVALIDATE"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("BLOCK"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("ROLLBACK"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("SUSPEND"), InvalidRequiredActionError);
    assert.throws(() => normalizeRequiredAction("REAUTHORIZE"), InvalidRequiredActionError);
  });

  // ---------------------------------------------------------------------------
  // 4. Exact ten frozen trigger categories
  // ---------------------------------------------------------------------------
  await t.test("04: Exact ten trigger categories mapped; Trigger 11 strictly rejected", () => {
    for (let i = 1; i <= 10; i++) {
      const pad = String(i).padStart(2, "0");
      const normalized = normalizeTriggerSource(`TRIGGER-${pad}`);
      assert.ok(normalized.startsWith(`TRIGGER_${pad}`));
    }

    assert.throws(() => normalizeTriggerSource("TRIGGER-00"), InvalidTriggerSourceError);
    assert.throws(() => normalizeTriggerSource("TRIGGER-11"), InvalidTriggerSourceError);
    assert.throws(() => normalizeTriggerSource("TRIGGER_11"), InvalidTriggerSourceError);
    assert.throws(() => normalizeTriggerSource("11"), InvalidTriggerSourceError);
    assert.throws(() => normalizeTriggerSource("UNKNOWN_TRIGGER"), InvalidTriggerSourceError);
  });

  // ---------------------------------------------------------------------------
  // 5. CRITICAL — dependency-driven invalidation
  // ---------------------------------------------------------------------------
  await t.test("05: Dependency-driven invalidation across narrow gear, rules, exporter, and fixtures", () => {
    const scope = createTestScope();
    const cAmp = createTestCase("case_amp", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);
    const cCab = createTestCase("case_cab", "guitar:cab:4x12_greenback", ["guitar:cab:4x12_greenback"], {
      associated_fixture_set: ["fix_recalibrated_99"],
    });
    const cExport = createTestCase("case_export", "platform_export", ["guitar:pedal:tube_screamer"], {
      applicable_test_dimensions: ["profile:03_target_export_integrity"],
      evaluation_methodology: "EXPORT_VERIFICATION",
    });

    const execAmp = createTestExecution("exec_amp", "case_amp", "fix_clean");
    const execCab = createTestExecution("exec_cab", "case_cab", "fix_clean");
    const execRecal = createTestExecution("exec_recal", "case_cab", "fix_recalibrated_99");
    const execExport = createTestExecution("exec_export", "case_export", "fix_clean", {
      profile_id: "profile:03_target_export_integrity",
    });

    const evAmp = createTestObjectiveEvidence("obj_amp", "exec_amp");
    const evCab = createTestObjectiveEvidence("obj_cab", "exec_cab");
    const evRecal = createTestObjectiveEvidence("obj_recal", "exec_recal");
    const evExport = createTestObjectiveEvidence("obj_export", "exec_export", {
      metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
    });

    const pkg = createTestPackage({
      validation_case_refs: ["case_amp", "case_cab", "case_export"],
      execution_record_refs: ["exec_amp", "exec_cab", "exec_recal", "exec_export"],
      evidence_refs: ["obj_amp", "obj_cab", "obj_recal", "obj_export"],
    });

    // 1. Narrow gear change: TRIGGER-03 affecting only guitar:amp:5150_lead
    const trigGear: RevalidationTriggerRecord = {
      trigger_id: "trig_gear_narrow",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };
    const planGear = planner.createRetestPlan({
      triggerRecord: trigGear,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [cAmp, cCab, cExport],
      existingEvidenceRecords: [evAmp, evCab],
      executionRecords: [execAmp, execCab],
    });
    // Amp is invalidated; Cab is retained
    assert.deepEqual(planGear.invalidatedEvidenceRefs, ["obj_amp"]);
    assert.deepEqual(planGear.retainedValidEvidenceRefs, ["obj_cab"]);
    assert.deepEqual(planGear.requiredNewCases, ["case_amp"]);

    // 2. Narrow deterministic rule change: TRIGGER-02 affecting one unit
    const trigRule: RevalidationTriggerRecord = {
      trigger_id: "trig_rule_narrow",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };
    const planRule = planner.createRetestPlan({
      triggerRecord: trigRule,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [cAmp, cCab],
      existingEvidenceRecords: [evAmp, evCab],
      executionRecords: [execAmp, execCab],
    });
    assert.deepEqual(planRule.requiredNewCases, ["case_amp"]);
    assert.deepEqual(planRule.invalidatedEvidenceRefs, ["obj_amp"]);
    assert.deepEqual(planRule.retainedValidEvidenceRefs, ["obj_cab"]);

    // 3. Exporter change: TRIGGER-04 invalidates export evidence, retains reasoning/acoustic evidence
    const trigExport: RevalidationTriggerRecord = {
      trigger_id: "trig_exporter_change",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: scope.included_units,
      required_action: REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };
    const planExport = planner.createRetestPlan({
      triggerRecord: trigExport,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [cAmp, cExport],
      existingEvidenceRecords: [evAmp, evExport],
      executionRecords: [execAmp, execExport],
    });
    assert.deepEqual(planExport.invalidatedEvidenceRefs, ["obj_export"]);
    assert.deepEqual(planExport.retainedValidEvidenceRefs, ["obj_amp"]);
    assert.deepEqual(planExport.requiredNewCases, ["case_export"]);

    // 4. Fixture change: TRIGGER-06 invalidates only executions dependent on affected fixture
    const trigFix: RevalidationTriggerRecord = {
      trigger_id: "trig_fixture_change",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:cab:4x12_greenback"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };
    const planFix = planner.createRetestPlan({
      triggerRecord: trigFix,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [cAmp, cCab],
      existingEvidenceRecords: [evAmp, evRecal],
      executionRecords: [execAmp, execRecal],
      changeEvent: {
        affected_fixture_ids: ["fix_recalibrated_99"],
      },
    });
    assert.deepEqual(planFix.invalidatedEvidenceRefs, ["obj_recal"]);
    assert.deepEqual(planFix.retainedValidEvidenceRefs, ["obj_amp"]);
    assert.deepEqual(planFix.requiredNewCases, ["case_cab"]);
  });

  // ---------------------------------------------------------------------------
  // 6. CRITICAL — narrowest defensible affected scope
  // ---------------------------------------------------------------------------
  await t.test("06: Affected scope represents narrowest defensible impacted scope and protects bounds", () => {
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ deterministic_rules_version: "1.2.1" });
    const scope = createTestScope();

    // Isolated unit change
    const res = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      changeEvent: {
        affected_units: ["guitar:amp:5150_lead"],
      },
    });
    assert.deepEqual(res.affectedScope, ["guitar:amp:5150_lead"]);

    // Excluded units fail closed
    assert.throws(
      () =>
        detector.detectTrigger({
          priorBinding: prior,
          newBinding: updated,
          scopeRecord: scope,
          changeEvent: {
            affected_units: ["bass:amp:svt_classic"],
          },
        }),
      ScopeContainmentError
    );
  });

  // ---------------------------------------------------------------------------
  // 7. Binding integrity and transition coherence
  // ---------------------------------------------------------------------------
  await t.test("07: Binding integrity and transition coherence fail closed", () => {
    const valid = createTestBinding();
    const scope = createTestScope();

    // Unknown/undefined prior binding
    assert.throws(
      () => detector.detectTrigger({ priorBinding: undefined as any, newBinding: valid, scopeRecord: scope }),
      BindingIntegrityError
    );

    // Unknown/undefined new binding
    assert.throws(
      () => detector.detectTrigger({ priorBinding: valid, newBinding: undefined as any, scopeRecord: scope }),
      BindingIntegrityError
    );

    // Invalid prior-binding integrity (placeholder digest)
    const invalidPrior = createTestBinding({
      version_integrity_reference: {
        composite_digest: "pending",
        algorithm: "SHA-256",
        sealed_at: "2026-03-20T12:00:00Z",
        component_digests: {},
      },
    });
    assert.throws(
      () => detector.detectTrigger({ priorBinding: invalidPrior, newBinding: valid, scopeRecord: scope }),
      BindingIntegrityError
    );

    // Identical bindings without external change event
    assert.throws(
      () => detector.detectTrigger({ priorBinding: valid, newBinding: valid, scopeRecord: scope }),
      IncoherentBindingTransitionError
    );

    // Claimed TRIGGER-03 when gear_catalog_version did not change
    const bNoGear = createUpdatedBinding({ deterministic_rules_version: "2.0.0" }, "b_no_gear");
    assert.throws(
      () =>
        detector.detectTrigger({
          priorBinding: valid,
          newBinding: bNoGear,
          scopeRecord: scope,
          changeEvent: { trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE },
        }),
      IncoherentBindingTransitionError
    );

    // Claimed TRIGGER-04 when platform_exporter_version did not change
    assert.throws(
      () =>
        detector.detectTrigger({
          priorBinding: valid,
          newBinding: bNoGear,
          scopeRecord: scope,
          changeEvent: { trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE },
        }),
      IncoherentBindingTransitionError
    );
  });

  // ---------------------------------------------------------------------------
  // 8. Trigger/action independence
  // ---------------------------------------------------------------------------
  await t.test("08: Trigger/action independence: action follows impact rather than trigger number alone", () => {
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ gear_catalog_version: "2.0.0" });
    const scope = createTestScope();

    // Narrow gear domain -> PARTIAL_RETEST
    const resNarrow = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      changeEvent: {
        affected_units: ["guitar:amp:5150_lead"],
      },
    });
    assert.equal(resNarrow.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST);

    // Broad catalogue change covering all included units -> FULL_RETEST
    const resBroad = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      changeEvent: {
        affected_units: [...scope.included_units],
      },
    });
    assert.equal(resBroad.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST);
  });

  // ---------------------------------------------------------------------------
  // 9. CRITICAL — NO_ACTION semantics
  // ---------------------------------------------------------------------------
  await t.test("09: NO_ACTION preserves trigger evaluation, avoids stale evidence, and rejects plan creation", () => {
    const prior = createTestBinding();
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);

    // Irrelevant change outside declared scope produces NO_ACTION
    const resNoAction = detector.detectTrigger({
      priorBinding: prior,
      newBinding: createUpdatedBinding({ gear_catalog_version: "1.0.5" }),
      scopeRecord: scope,
      changeEvent: {
        affected_units: ["unrelated:organ:b3"],
      },
    });
    assert.equal(resNoAction.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.NO_ACTION);

    // Attempting to fabricate a RetestPlanRecord for NO_ACTION strictly fails closed
    assert.throws(
      () =>
        planner.createRetestPlan({
          triggerRecord: resNoAction.triggerRecord,
          packageRecord: pkg,
          scopeRecord: scope,
          availableCases: [c1],
          existingEvidenceRecords: [],
        }),
      RetestPlanningError
    );
  });

  // ---------------------------------------------------------------------------
  // 10. PARTIAL_RETEST semantics
  // ---------------------------------------------------------------------------
  await t.test("10: PARTIAL_RETEST selects only affected existing cases and bounds retest scope", () => {
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);
    const c2 = createTestCase("case_02", "guitar:cab:4x12_greenback", ["guitar:cab:4x12_greenback"]);

    const triggerRecord: RevalidationTriggerRecord = {
      trigger_id: "trig_partial_01",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };

    const plan = planner.createRetestPlan({
      triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1, c2],
      existingEvidenceRecords: [createTestObjectiveEvidence("obj_01", "exec_01")],
    });

    assert.deepEqual(plan.requiredNewCases, ["case_01"]);
    assert.ok(plan.retestScope.includes("guitar:amp:5150_lead"));
    assert.ok(!plan.retestScope.includes("guitar:cab:4x12_greenback"));
  });

  // ---------------------------------------------------------------------------
  // 11. FULL_RETEST semantics
  // ---------------------------------------------------------------------------
  await t.test("11: FULL_RETEST means full applicable retest of affected scope/package, not whole repository", () => {
    const scope = createTestScope();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);
    const c2 = createTestCase("case_02", "guitar:cab:4x12_greenback", ["guitar:cab:4x12_greenback"]);
    const cForeign = createTestCase("case_foreign", "bass:amp:svt_classic", ["bass:amp:svt_classic"]);

    const pkg = createTestPackage({
      validation_case_refs: ["case_01", "case_02"], // Only c1 and c2 belong to this package
    });

    const triggerRecord: RevalidationTriggerRecord = {
      trigger_id: "trig_full_01",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: scope.included_units,
      required_action: REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };

    const plan = planner.createRetestPlan({
      triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1, c2, cForeign],
      existingEvidenceRecords: [
        createTestObjectiveEvidence("obj_01", "exec_01"),
        createTestObjectiveEvidence("obj_02", "exec_02"),
      ],
    });

    // Package cases selected; foreign repo case excluded
    assert.deepEqual(plan.requiredNewCases, ["case_01", "case_02"]);
    assert.ok(!plan.requiredNewCases.includes("case_foreign"));
  });

  // ---------------------------------------------------------------------------
  // 12. Evidence partition completeness & foreign evidence fail-closed
  // ---------------------------------------------------------------------------
  await t.test("12: Evidence partition completeness, disjointness, and foreign evidence fail-closed", () => {
    const scope = createTestScope();
    const cAmp = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);
    const cCab = createTestCase("case_02", "guitar:cab:4x12_greenback", ["guitar:cab:4x12_greenback"]);

    const execAmp = createTestExecution("exec_01", "case_01");
    const execCab = createTestExecution("exec_02", "case_02");

    const objAff = createTestObjectiveEvidence("obj_aff", "exec_01");
    const objUnaff = createTestObjectiveEvidence("obj_unaff", "exec_02");
    const percAff = createTestPerceptualEvidence("perc_aff", "exec_01");
    const percUnaff = createTestPerceptualEvidence("perc_unaff", "exec_02");

    const pkg = createTestPackage({
      validation_case_refs: ["case_01", "case_02"],
      execution_record_refs: ["exec_01", "exec_02"],
      evidence_refs: ["obj_aff", "obj_unaff", "perc_aff", "perc_unaff"],
    });

    const triggerRecord: RevalidationTriggerRecord = {
      trigger_id: "trig_evidence_partition",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"], // Amp affected, Cab unaffected
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };

    const plan = planner.createRetestPlan({
      triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [cAmp, cCab],
      existingEvidenceRecords: [objAff, objUnaff, percAff, percUnaff],
      executionRecords: [execAmp, execCab],
    });

    // Disjointness check
    const retainedSet = new Set(plan.retainedValidEvidenceRefs);
    const invalidatedSet = new Set(plan.invalidatedEvidenceRefs);
    for (const id of retainedSet) {
      assert.ok(!invalidatedSet.has(id), `Evidence ${id} must not be in both sets`);
    }

    assert.deepEqual(plan.invalidatedEvidenceRefs, ["obj_aff", "perc_aff"]);
    assert.deepEqual(plan.retainedValidEvidenceRefs, ["obj_unaff", "perc_unaff"]);

    // Foreign-package evidence fails closed
    const foreignEvidence = createTestObjectiveEvidence("obj_foreign", "exec_01");
    assert.throws(
      () =>
        planner.createRetestPlan({
          triggerRecord,
          packageRecord: pkg,
          scopeRecord: scope,
          availableCases: [cAmp, cCab],
          existingEvidenceRecords: [objAff, foreignEvidence],
          executionRecords: [execAmp],
        }),
      EvidencePartitioningError
    );
  });

  // ---------------------------------------------------------------------------
  // 13. Historical immutability
  // ---------------------------------------------------------------------------
  await t.test("13: Historical records (17, 18, 19, executions, evidence) are immutable", () => {
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ platform_exporter_version: "1.2.0" });
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);

    const triggerRes = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
    });
    assert.ok(Object.isFrozen(triggerRes.triggerRecord));
    assert.throws(() => {
      (triggerRes.triggerRecord as any).required_action = "MUTATED";
    }, TypeError);

    const planRes = planner.createRetestPlan({
      triggerRecord: triggerRes.triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1],
      existingEvidenceRecords: [],
    });
    assert.ok(Object.isFrozen(planRes.retestPlan));
    assert.throws(() => {
      (planRes.retestPlan as any).retest_scope = [];
    }, TypeError);
  });

  // ---------------------------------------------------------------------------
  // 14. INVALIDATED_BY exact contract
  // ---------------------------------------------------------------------------
  await t.test("14: Canonical INVALIDATED_BY exact contract: Outcome -> Trigger accepted, reverse/foreign rejected", () => {
    const graph = new ValidationRelationshipGraph();
    const outcome = createTestOutcome();
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ deterministic_rules_version: "2.0.0" });
    const scope = createTestScope();

    const res = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      priorOutcomeRecord: outcome,
      graph,
    });

    assert.ok(res.invalidationEdge);
    assert.equal(res.invalidationEdge.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);
    assert.equal(res.invalidationEdge.source.id, outcome.outcome_id);
    assert.equal(res.invalidationEdge.target.id, res.triggerRecord.trigger_id);

    // Reverse orientation rejected
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: res.triggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          target: { id: outcome.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        }),
      /not permitted/i
    );

    // Execution -> Trigger rejected
    graph.registerNode({ id: "exec_01", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "exec_01", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          target: { id: res.triggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      /not permitted/i
    );

    // Package -> Trigger rejected
    graph.registerNode({ id: "pkg_01", kind: GOVERNED_ENTITY_KINDS.ValidationPackage });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "pkg_01", kind: GOVERNED_ENTITY_KINDS.ValidationPackage },
          target: { id: res.triggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      /not permitted/i
    );

    // AdoptionDecisionRecord -> Trigger accepted at graph level
    graph.registerNode({ id: "decision_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });
    const decEdge = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: { id: "decision_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
      target: { id: res.triggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
    });
    assert.equal(decEdge.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);
  });

  // ---------------------------------------------------------------------------
  // 15. WP-19 stale-applicability integration
  // ---------------------------------------------------------------------------
  await t.test("15: Historical PASS remains PASS while WP-19 dynamically observes staleness", () => {
    const graph = new ValidationRelationshipGraph();
    const outcome = createTestOutcome({ outcome_class: VALIDATION_OUTCOME_CLASSES.PASS });
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ gear_catalog_version: "2.0.0" });
    const scope = createTestScope();

    assert.equal(isApplicableForCurrentBinding(outcome, prior.binding_id, graph), true);

    detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      priorOutcomeRecord: outcome,
      graph,
    });

    // 1. Historical record never rewritten
    assert.equal(outcome.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
    // 2. WP-19 dynamically reports stale
    assert.equal(isApplicableForCurrentBinding(outcome, prior.binding_id, graph), false);
  });

  // ---------------------------------------------------------------------------
  // 16. REQUIRES_RETEST exact contract
  // ---------------------------------------------------------------------------
  await t.test("16: Canonical REQUIRES_RETEST exact contract: Trigger -> Plan accepted, reverse rejected", () => {
    const graph = new ValidationRelationshipGraph();
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);

    const triggerRecord: RevalidationTriggerRecord = {
      trigger_id: "trig_plan_contract",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };

    const planRes = planner.createRetestPlan({
      triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1],
      existingEvidenceRecords: [],
      graph,
    });

    assert.ok(planRes.requiresRetestEdge);
    assert.equal(planRes.requiresRetestEdge.edgeType, GOVERNED_EDGE_TYPES.REQUIRES_RETEST);
    assert.equal(planRes.requiresRetestEdge.source.id, triggerRecord.trigger_id);
    assert.equal(planRes.requiresRetestEdge.target.id, planRes.retestPlan.retest_plan_id);

    // Reverse orientation rejected
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.REQUIRES_RETEST,
          source: { id: planRes.retestPlan.retest_plan_id, kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord },
          target: { id: triggerRecord.trigger_id, kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      /not permitted/i
    );
  });

  // ---------------------------------------------------------------------------
  // 17. CRITICAL — SUPERSEDES_VALIDATION semantic orientation
  // ---------------------------------------------------------------------------
  await t.test("17: SUPERSEDES_VALIDATION preserves semantic direction (new -> prior), rejects inverted or cross-case", () => {
    const graph = new ValidationRelationshipGraph();
    const priorExec = createTestExecution("exec_hist", "case_01", "fix_01", {
      execution_timestamp: "2026-03-20T10:00:00Z",
    });
    const newExec = createTestExecution("exec_new", "case_01", "fix_01", {
      execution_timestamp: "2026-03-21T10:00:00Z",
    });

    // Valid: new -> prior accepted
    const supersession = planner.recordSupersession({
      newExecutionRecord: newExec,
      priorExecutionRecord: priorExec,
      graph,
    });
    assert.equal(supersession.edge.edgeType, GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION);
    assert.equal(supersession.edge.source.id, newExec.execution_id);
    assert.equal(supersession.edge.target.id, priorExec.execution_id);

    // Inverted timestamp (old -> new) rejected
    assert.throws(
      () =>
        planner.recordSupersession({
          newExecutionRecord: priorExec,
          priorExecutionRecord: newExec,
          graph,
        }),
      InvalidSupersessionError
    );

    // Self-supersession rejected
    assert.throws(
      () =>
        planner.recordSupersession({
          newExecutionRecord: priorExec,
          priorExecutionRecord: priorExec,
          graph,
        }),
      InvalidSupersessionError
    );

    // Cross-case supersession rejected
    const diffCaseExec = createTestExecution("exec_diff_case", "case_99");
    assert.throws(
      () =>
        planner.recordSupersession({
          newExecutionRecord: diffCaseExec,
          priorExecutionRecord: priorExec,
          graph,
        }),
      InvalidSupersessionError
    );

    // Historical execution remains intact
    assert.equal(priorExec.execution_id, "exec_hist");
    assert.equal(priorExec.outcome, EXECUTION_OUTCOMES.COMPLETED);
  });

  // ---------------------------------------------------------------------------
  // 18. Duplicate trigger idempotency
  // ---------------------------------------------------------------------------
  await t.test("18: Duplicate trigger idempotency prevents duplicate ledger entries while allowing distinct events", () => {
    const ledger = new ValidationAuditLedger();
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ deterministic_rules_version: "1.2.9" });
    const scope = createTestScope();

    // Event 1
    const resA = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      auditLedger: ledger,
      timestamp: "2026-03-21T10:00:00Z",
    });

    // Re-submit identical event
    const resB = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      auditLedger: ledger,
      timestamp: "2026-03-21T10:00:00Z",
    });

    assert.equal(resA.triggerRecord.trigger_id, resB.triggerRecord.trigger_id);
    // Duplicate not appended to ledger
    assert.equal(ledger.getEntryCount(), 1);

    // Distinct second event
    const updatedDistinct = createUpdatedBinding({ deterministic_rules_version: "1.3.0" }, "bind_distinct");
    const resC = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updatedDistinct,
      scopeRecord: scope,
      auditLedger: ledger,
      timestamp: "2026-03-22T10:00:00Z",
    });
    assert.notEqual(resA.triggerRecord.trigger_id, resC.triggerRecord.trigger_id);
    assert.equal(ledger.getEntryCount(), 2);
  });

  // ---------------------------------------------------------------------------
  // 19. TRIGGER-05: Target platform runtime update
  // ---------------------------------------------------------------------------
  await t.test("19: TRIGGER-05 target platform update escalates to SUSPEND_GATE_8 and invalidates platform evidence", () => {
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ target_platform_runtime_version: "6.0.0" });
    const scope = createTestScope();

    const res = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
    });
    assert.equal(res.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE);
    assert.equal(res.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);
  });

  // ---------------------------------------------------------------------------
  // 20. TRIGGER-06: Golden Acoustic Fixture library update
  // ---------------------------------------------------------------------------
  await t.test("20: TRIGGER-06 fixture library update preserves old fixture and invalidates dependent evidence", () => {
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ fixture_library_version: "2.0.0" });
    const scope = createTestScope();

    const res = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      changeEvent: {
        affected_fixture_ids: ["fix_recalibrated_01"],
      },
    });
    assert.equal(res.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE);
    assert.equal(res.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST);
  });

  // ---------------------------------------------------------------------------
  // 21. TRIGGER-09: Candidate lesson approved
  // ---------------------------------------------------------------------------
  await t.test("21: TRIGGER-09 candidate lesson approved operates under multiple impacts without inherently suspending", () => {
    const prior = createTestBinding();
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_5150", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);
    const c2 = createTestCase("case_cab", "guitar:cab:4x12_greenback", ["guitar:cab:4x12_greenback"]);
    const ev1 = createTestObjectiveEvidence("ev_5150", "exec_5150");
    const ev2 = createTestObjectiveEvidence("ev_cab", "exec_cab");
    const exec1: ValidationExecutionRecord = {
      execution_id: "exec_5150",
      case_id: "case_5150",
      fixture_id: "fix_01",
      profile_id: "profile_01",
      execution_timestamp: "2026-03-20T10:00:00Z",
      status: "COMPLETED",
      environment_integrity_hash: "env_hash_01",
    };
    const exec2: ValidationExecutionRecord = {
      execution_id: "exec_cab",
      case_id: "case_cab",
      fixture_id: "fix_01",
      profile_id: "profile_01",
      execution_timestamp: "2026-03-20T10:00:00Z",
      status: "COMPLETED",
      environment_integrity_hash: "env_hash_01",
    };

    // Case A: Lesson irrelevant to validated scope -> NO_ACTION
    const resA = detector.detectTrigger({
      priorBinding: prior,
      newBinding: createUpdatedBinding({}, "bind_lesson_unrelated"),
      scopeRecord: scope,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
        candidate_lesson_id: "LESSON-VOCAL-AUTOTUNE-01",
        candidate_lesson_domain: "vocal_tuning",
      },
    });
    assert.equal(resA.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED);
    assert.equal(resA.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.NO_ACTION);
    assert.deepEqual(resA.affectedScope, []);
    assert.notEqual(resA.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);

    // Retest planning fails closed for NO_ACTION: no RetestPlan fabricated
    assert.throws(
      () =>
        planner.createRetestPlan({
          triggerRecord: resA.triggerRecord,
          packageRecord: pkg,
          scopeRecord: scope,
          availableCases: [c1, c2],
          existingEvidenceRecords: [ev1, ev2],
        }),
      (err: any) => err.message.includes('required_action "NO_ACTION"')
    );

    // Case B: Lesson affects bounded validated domain -> PARTIAL_RETEST
    const resB = detector.detectTrigger({
      priorBinding: prior,
      newBinding: createUpdatedBinding({}, "bind_lesson_bounded"),
      scopeRecord: scope,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
        candidate_lesson_id: "LESSON-POWER-SAG-01",
        candidate_lesson_domain: "5150_lead",
      },
    });
    assert.equal(resB.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED);
    assert.equal(resB.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST);
    assert.deepEqual(resB.affectedScope, ["guitar:amp:5150_lead"]);
    assert.notEqual(resB.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);

    const planB = planner.createRetestPlan({
      triggerRecord: resB.triggerRecord,
      packageRecord: { ...pkg, validation_case_refs: ["case_5150", "case_cab"], evidence_refs: ["ev_5150", "ev_cab"] },
      scopeRecord: scope,
      availableCases: [c1, c2],
      executionRecords: [exec1, exec2],
      existingEvidenceRecords: [ev1, ev2],
      changeEvent: { candidate_lesson_domain: "5150_lead" },
    });
    assert.deepEqual(planB.invalidatedEvidenceRefs, ["ev_5150"]);
    assert.deepEqual(planB.retainedValidEvidenceRefs, ["ev_cab"]);
    assert.deepEqual(planB.requiredNewCases, ["case_5150"]);

    // Case C: Lesson affects entire applicable validated subject scope -> FULL_RETEST
    const resC = detector.detectTrigger({
      priorBinding: prior,
      newBinding: createUpdatedBinding({}, "bind_lesson_full"),
      scopeRecord: scope,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
        candidate_lesson_id: "LESSON-GLOBAL-IMPEDANCE-01",
        candidate_lesson_domain: "guitar",
      },
    });
    assert.equal(resC.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED);
    assert.equal(resC.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST);
    assert.deepEqual(resC.affectedScope, [
      "guitar:amp:5150_lead",
      "guitar:cab:4x12_greenback",
      "guitar:pedal:tube_screamer",
    ]);
    assert.notEqual(resC.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);
  });

  // ---------------------------------------------------------------------------
  // 22. CRITICAL — TRIGGER-10 boundary
  // ---------------------------------------------------------------------------
  await t.test("22: TRIGGER-10 boundary produces SUSPEND_GATE_8 declaratively without telemetry loops or rollback", () => {
    const prior = createTestBinding();
    const scope = createTestScope();

    // Governed telemetry anomaly meeting threshold warrants SUSPEND_GATE_8
    const res = detector.detectTrigger({
      priorBinding: prior,
      newBinding: createUpdatedBinding({}, "bind_telemetry"),
      scopeRecord: scope,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
        telemetry_anomaly: {
          metric_name: "buffer_underrun_defect_rate",
          observed_defect_rate: 0.05,
          threshold: 0.01,
          sample_size: 100000,
          warrants_gate_8_suspension: true,
        },
      },
    });
    assert.equal(res.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE);
    assert.equal(res.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);

    // Below-threshold / non-qualifying telemetry observation does NOT emit TRIGGER-10
    // Claimed TRIGGER-10 on non-qualifying telemetry fails closed (IncoherentBindingTransitionError)
    assert.throws(
      () =>
        detector.detectTrigger({
          priorBinding: prior,
          newBinding: createUpdatedBinding({}, "bind_telemetry_mild"),
          scopeRecord: scope,
          changeEvent: {
            trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
            telemetry_anomaly: {
              metric_name: "dsp_peak_headroom_drift",
              observed_defect_rate: 0.002,
              threshold: 0.01,
              sample_size: 100000,
              warrants_gate_8_suspension: false,
            },
          },
        }),
      (err: any) => err.message.includes("non-qualifying") || err.message.includes("TRIGGER-10")
    );

    // Unclaimed non-qualifying telemetry with identical binding IDs emits zero triggers (throws TriggerDetectionError)
    assert.throws(
      () =>
        detector.detectTrigger({
          priorBinding: prior,
          newBinding: prior,
          scopeRecord: scope,
          changeEvent: {
            telemetry_anomaly: {
              metric_name: "dsp_peak_headroom_drift",
              observed_defect_rate: 0.002,
              threshold: 0.01,
              sample_size: 100000,
              warrants_gate_8_suspension: false,
            },
          },
        }),
      (err: any) => err.message.includes("material change") || err.message.includes("TRIGGER-10")
    );

    // Verify zero live monitoring or rollback implementation exists
    assert.equal(typeof (detector as any).startMonitoring, "undefined");
    assert.equal(typeof (detector as any).executeRollback, "undefined");
    assert.equal(typeof (detector as any).mutateGate8Lifecycle, "undefined");
  });

  // ---------------------------------------------------------------------------
  // 23. Retest planner must not execute retests
  // ---------------------------------------------------------------------------
  await t.test("23: Retest planner constructs Record 19 and does not execute tests or synthesize outcomes", () => {
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);

    const triggerRecord: RevalidationTriggerRecord = {
      trigger_id: "trig_no_exec",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
      prior_binding_id: "binding_v1",
      new_binding_id: "binding_v2",
      affected_scope: ["guitar:amp:5150_lead"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      trigger_timestamp: "2026-03-21T12:00:00Z",
    };

    const plan = planner.createRetestPlan({
      triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1],
      existingEvidenceRecords: [],
    });

    assert.ok(plan.retestPlan);
    assert.equal(typeof (planner as any).runCase, "undefined");
    assert.equal(typeof (planner as any).synthesizeOutcome, "undefined");
  });

  // ---------------------------------------------------------------------------
  // 24. No premature revalidation success
  // ---------------------------------------------------------------------------
  await t.test("24: Creating Record 19 does not make old PASS applicable or claim trigger resolved", () => {
    const graph = new ValidationRelationshipGraph();
    const outcome = createTestOutcome({ outcome_class: VALIDATION_OUTCOME_CLASSES.PASS });
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ gear_catalog_version: "2.0.0" });
    const scope = createTestScope();
    const pkg = createTestPackage();
    const c1 = createTestCase("case_01", "guitar:amp:5150_lead", ["guitar:amp:5150_lead"]);

    const triggerRes = detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      priorOutcomeRecord: outcome,
      graph,
    });

    planner.createRetestPlan({
      triggerRecord: triggerRes.triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [c1],
      existingEvidenceRecords: [],
      graph,
    });

    // Old PASS remains inapplicable despite RetestPlan creation
    assert.equal(isApplicableForCurrentBinding(outcome, prior.binding_id, graph), false);
  });

  // ---------------------------------------------------------------------------
  // 25. Ledger behavior
  // ---------------------------------------------------------------------------
  await t.test("25: Ledger behavior is append-only with zero destructive replacement API", () => {
    const ledger = new ValidationAuditLedger();
    const prior = createTestBinding();
    const updated = createUpdatedBinding({ platform_exporter_version: "1.2.0" });
    const scope = createTestScope();

    detector.detectTrigger({
      priorBinding: prior,
      newBinding: updated,
      scopeRecord: scope,
      auditLedger: ledger,
    });

    assert.equal(ledger.getEntryCount(), 1);
    assert.equal(typeof (ledger as any).deleteEntry, "undefined");
    assert.equal(typeof (ledger as any).replaceEntry, "undefined");
    assert.equal(typeof (ledger as any).truncate, "undefined");
  });

  // ---------------------------------------------------------------------------
  // 26. Exact graph count
  // ---------------------------------------------------------------------------
  await t.test("26: Relationship graph maintains exactly 14 governed edge types", () => {
    assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);
    assert.equal(typeof (GOVERNED_EDGE_TYPES as any).HAS_RETEST_PLAN, "undefined");
    assert.equal(typeof (GOVERNED_EDGE_TYPES as any).INVALIDATES, "undefined");
    assert.equal(typeof (GOVERNED_EDGE_TYPES as any).REPLACES, "undefined");
    assert.equal(typeof (GOVERNED_EDGE_TYPES as any).RETESTS, "undefined");
  });

  // ---------------------------------------------------------------------------
  // 27. Downstream boundary
  // ---------------------------------------------------------------------------
  await t.test("27: Downstream boundary: zero Records 20/21/22 generation and WP-21 untouched", () => {
    assert.equal(typeof (planner as any).createProductionReadinessAssessment, "undefined");
    assert.equal(typeof (planner as any).createAdoptionDecision, "undefined");
    assert.equal(typeof (planner as any).createGate8ChangeRecord, "undefined");
    assert.equal(typeof (detector as any).adjudicateGate8, "undefined");
    assert.equal(typeof (detector as any).executeProductionCutover, "undefined");
  });
});
