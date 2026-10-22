// src/tests/traceabilityValidationIntegration.test.ts
// Unit and integration test suite for WP-29 Stage 2 Slice 1C:
// Validation Record Integration, Orphan Measurement Detection & P18 Completion.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  TraceabilityAuditor,
  auditTraceability,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_CATEGORIES,
  PRINCIPLE_AUDIT_STATES,
  ValidationAuditEvidence,
} from "../sound-engineer/validation/traceability";

import {
  ValidationExecutionRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationCase,
  ValidationScopeRecord,
} from "../sound-engineer/validation/schemas/records";

import {
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  TOLERANCE_EVALUATIONS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  VALIDATION_PRIMARY_DOMAINS,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";

import { createCleanTrace } from "./traceabilityAuditor.test";
import { RunTrace } from "../sound-engineer/trace/runTrace";
import { ARTIFACT_TYPES } from "../sound-engineer/checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../sound-engineer/checkpoints/layerIdentity";

function createValidExecution(
  traceRef: string,
  overrides?: Partial<ValidationExecutionRecord>
): ValidationExecutionRecord {
  return {
    execution_id: overrides?.execution_id ?? "exec_lead_01",
    case_id: overrides?.case_id ?? "case_crunch_validation",
    profile_id: overrides?.profile_id ?? "profile_tube_screamer",
    fixture_id: overrides?.fixture_id ?? "fixt_di_riff_01",
    binding_id: overrides?.binding_id ?? "bind_runtime_v1",
    execution_timestamp: overrides?.execution_timestamp ?? "2026-10-20T12:00:00.000Z",
    execution_environment: overrides?.execution_environment ?? "isolated_sandbox",
    input_audio_integrity_ref: overrides?.input_audio_integrity_ref ?? "sha256:input_di_stimulus_hash_abc123",
    output_audio_integrity_ref: overrides?.output_audio_integrity_ref ?? "sha256:output_dsp_capture_hash_def456",
    execution_duration_ms: overrides?.execution_duration_ms ?? 145,
    anomalies_detected: overrides?.anomalies_detected ?? [],
    raw_measurements: overrides?.raw_measurements ?? { thd: 0.012, latency_ms: 2.1 },
    outcome: overrides?.outcome ?? EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: traceRef,
  };
}

function createValidObjectiveEvidence(
  executionId: string,
  overrides?: Partial<ObjectiveEvidenceRecord>
): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: overrides?.objective_evidence_id ?? "obj_ev_thd_01",
    execution_id: executionId,
    metric_category: overrides?.metric_category ?? OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
    measured_parameters: overrides?.measured_parameters ?? { thd_percent: 1.2 },
    applied_threshold_profile_ref: overrides?.applied_threshold_profile_ref ?? "thresh_thd_std_01",
    tolerance_evaluation: overrides?.tolerance_evaluation ?? TOLERANCE_EVALUATIONS.MET,
    measured_delta: overrides?.measured_delta ?? 0.05,
    objective_pass_fail: overrides?.objective_pass_fail ?? OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: overrides?.artifacts_retained ?? ["sha256:post_dsp_spectrum_plot_01"],
  };
}

function createValidPerceptualEvaluation(
  executionId: string,
  overrides?: Partial<PerceptualEvaluationRecord>
): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: overrides?.perceptual_evidence_id ?? "perc_ev_expert_01",
    execution_id: executionId,
    evaluator_id: overrides?.evaluator_id ?? "evaluator_lead_engineer_01",
    evaluator_role: overrides?.evaluator_role ?? PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: overrides?.methodology_used ?? PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
    listening_environment: overrides?.listening_environment ?? {
      monitor_type: "Nearfield ATC SCM25A Pro",
      calibrated_spl_profile_ref: "spl_85db_c_weighted",
      acoustic_treatment_level: "LEDE Treated Control Room",
    },
    presented_stimuli_refs: overrides?.presented_stimuli_refs ?? {
      stimulus_a: "sha256:input_di_stimulus_hash_abc123",
      stimulus_b: "sha256:output_dsp_capture_hash_def456",
    },
    perceptual_dimensions_evaluated: overrides?.perceptual_dimensions_evaluated ?? {
      clarity: 4.8,
      punch: 4.5,
      naturalness: 4.7,
    },
    qualitative_observations: overrides?.qualitative_observations ?? "Tight pick attack with clear harmonic bloom",
    confidence: overrides?.confidence ?? PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: overrides?.evaluation_outcome ?? PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
  };
}

describe("WP-29 Slice 1C: Validation Record Integration & Orphan Detection", () => {
  const auditor = new TraceabilityAuditor();

  // 1. Record 9: valid trace_ref resolves cleanly to audited RunTrace
  it("1. Record 9: valid trace_ref resolves cleanly to audited RunTrace", () => {
    const trace = createCleanTrace("run_rec9_valid");
    const execution = createValidExecution(trace.traceId);

    const report = auditor.audit(trace, {
      executions: [execution],
      objectiveEvidence: [createValidObjectiveEvidence(execution.execution_id)],
    });

    // Zero execution trace_ref findings
    const execTraceFindings = report.findings.filter(
      (f) => f.code === "EXECUTION_TRACE_REF_INVALID" || f.code === "EXECUTION_TRACE_REF_UNRESOLVABLE"
    );
    assert.equal(execTraceFindings.length, 0);
    assert.equal(report.orphanedMeasurementSummary.ruleB_UnresolvableTraceCount, 0);
    assert.equal(report.orphanedMeasurementSummary.resolvedMeasurements, 1);
  });

  // 2. Record 9: wrong trace_ref emits EXECUTION_TRACE_REF_INVALID factual VIOLATION
  it("2. Record 9: wrong trace_ref emits EXECUTION_TRACE_REF_INVALID factual VIOLATION", () => {
    const trace = createCleanTrace("run_rec9_wrong");
    const execution = createValidExecution("trc_completely_different_trace");

    const report = auditor.audit(trace, {
      executions: [execution],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_INVALID");
    assert.ok(finding, "Should emit EXECUTION_TRACE_REF_INVALID");
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(finding.recordKind, "ValidationExecutionRecord");
    assert.equal(finding.recordId, execution.execution_id);
  });

  // 2b. Record 9: trace_ref pointing to runId is rejected with EXECUTION_TRACE_REF_INVALID (traceId vs runId distinction)
  it("2b. Record 9: trace_ref pointing to runId is rejected with EXECUTION_TRACE_REF_INVALID", () => {
    const trace = createCleanTrace("run_rec9_runid_distinction");
    // Canonical distinction: trace_ref must reference traceId ("trc_..."), NOT runId ("run_...")
    assert.notEqual(trace.traceId, trace.runId);
    const executionWithRunId = createValidExecution(trace.runId);

    const report = auditor.audit(trace, {
      executions: [executionWithRunId],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_INVALID");
    assert.ok(finding, "trace_ref targeting runId must be rejected with EXECUTION_TRACE_REF_INVALID");
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(finding.recordKind, "ValidationExecutionRecord");
  });

  // 2c. Record 9: trace_ref with URI wrapper ref:trace:${traceId} is rejected with EXECUTION_TRACE_REF_INVALID (no prefix alias)
  it("2c. Record 9: trace_ref with URI wrapper ref:trace:${traceId} is rejected with EXECUTION_TRACE_REF_INVALID", () => {
    const trace = createCleanTrace("run_rec9_prefix_alias");
    const executionWithPrefix = createValidExecution(`ref:trace:${trace.traceId}`);

    const report = auditor.audit(trace, {
      executions: [executionWithPrefix],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_INVALID");
    assert.ok(finding, "URI prefix ref:trace:... must be rejected; only exact traceId is authoritative");
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 2d. Record 9: trace_ref with URI wrapper ref:trace:${runId} is rejected with EXECUTION_TRACE_REF_INVALID
  it("2d. Record 9: trace_ref with URI wrapper ref:trace:${runId} is rejected with EXECUTION_TRACE_REF_INVALID", () => {
    const trace = createCleanTrace("run_rec9_prefix_runid");
    const executionWithPrefixRunId = createValidExecution(`ref:trace:${trace.runId}`);

    const report = auditor.audit(trace, {
      executions: [executionWithPrefixRunId],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_INVALID");
    assert.ok(finding, "ref:trace:${runId} must be rejected with EXECUTION_TRACE_REF_INVALID");
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 3. Record 9: unresolvable context emits EXECUTION_TRACE_REF_UNRESOLVABLE NOT_VERIFIABLE
  it("3. Record 9: unresolvable context emits EXECUTION_TRACE_REF_UNRESOLVABLE NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_rec9_unresolvable");
    const execution = createValidExecution("UNRESOLVED");

    const report = auditor.audit(trace, {
      executions: [execution],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_UNRESOLVABLE");
    assert.ok(finding, "Should emit EXECUTION_TRACE_REF_UNRESOLVABLE");
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
  });

  // 4. Orphan Rule A: ObjectiveEvidenceRecord missing parent execution -> VIOLATION
  it("4. Orphan Rule A: ObjectiveEvidenceRecord missing parent execution emits factual VIOLATION", () => {
    const trace = createCleanTrace("run_orphan_rule_a_obj");
    const orphanObj = createValidObjectiveEvidence("exec_non_existent_999");

    const report = auditor.audit(trace, {
      executions: [], // No executions supplied!
      objectiveEvidence: [orphanObj],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "ORPHAN_PARENT_EXECUTION_MISSING");
    assert.ok(finding);
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(finding.category, TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT);
    assert.equal(finding.recordKind, "ObjectiveEvidenceRecord");
    assert.equal(finding.recordId, orphanObj.objective_evidence_id);

    // Summary assertions
    assert.equal(report.orphanedMeasurementSummary.totalMeasurements, 1);
    assert.equal(report.orphanedMeasurementSummary.orphanedMeasurements, 1);
    assert.equal(report.orphanedMeasurementSummary.ruleA_MissingExecutionCount, 1);
    assert.equal(report.orphanedMeasurementSummary.objectiveOrphanedCount, 1);
    assert.equal(report.orphanedMeasurementSummary.perceptualOrphanedCount, 0);
  });

  // 5. Orphan Rule A: PerceptualEvaluationRecord missing parent execution -> VIOLATION (identity preserved)
  it("5. Orphan Rule A: PerceptualEvaluationRecord missing parent execution emits factual VIOLATION and preserves identity", () => {
    const trace = createCleanTrace("run_orphan_rule_a_perc");
    const orphanPerc = createValidPerceptualEvaluation("exec_ghost_execution");

    const report = auditor.audit(trace, {
      executions: [],
      perceptualEvaluations: [orphanPerc],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const finding = report.findings.find((f) => f.code === "ORPHAN_PARENT_EXECUTION_MISSING");
    assert.ok(finding);
    assert.equal(finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(finding.recordKind, "PerceptualEvaluationRecord");
    assert.equal(finding.recordId, orphanPerc.perceptual_evidence_id);

    assert.equal(report.orphanedMeasurementSummary.perceptualOrphanedCount, 1);
    assert.equal(report.orphanedMeasurementSummary.objectiveOrphanedCount, 0);
  });

  // 6. Orphan Rule B: Parent execution exists but trace_ref does not resolve -> VIOLATION
  it("6. Orphan Rule B: Parent execution exists but trace_ref does not resolve -> VIOLATION", () => {
    const trace = createCleanTrace("run_orphan_rule_b");
    const badExec = createValidExecution("trc_alien_run_trace_id", { execution_id: "exec_alien_01" });
    const objEvidence = createValidObjectiveEvidence(badExec.execution_id);

    const report = auditor.audit(trace, {
      executions: [badExec],
      objectiveEvidence: [objEvidence],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.equal(report.orphanedMeasurementSummary.ruleB_UnresolvableTraceCount, 1);
    assert.equal(report.orphanedMeasurementSummary.orphanedMeasurements, 1);

    const ruleBFinding = report.findings.find(
      (f) => f.code === "EXECUTION_TRACE_REF_INVALID" && f.recordKind === "ObjectiveEvidenceRecord"
    );
    assert.ok(ruleBFinding, "Must emit finding for measurement whose parent execution has invalid trace");
    assert.equal(ruleBFinding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 7. Orphan Rule B: Valid parent execution + valid trace -> 0 orphans
  it("7. Orphan Rule B: Valid parent execution + valid trace -> 0 orphans", () => {
    const trace = createCleanTrace("run_orphan_clean");
    const validExec = createValidExecution(trace.traceId, { execution_id: "exec_clean_01" });
    const objEvidence = createValidObjectiveEvidence(validExec.execution_id);
    const percEvidence = createValidPerceptualEvaluation(validExec.execution_id);

    const report = auditor.audit(trace, {
      executions: [validExec],
      objectiveEvidence: [objEvidence],
      perceptualEvaluations: [percEvidence],
    });

    assert.equal(report.orphanedMeasurementSummary.totalMeasurements, 2);
    assert.equal(report.orphanedMeasurementSummary.orphanedMeasurements, 0);
    assert.equal(report.orphanedMeasurementSummary.resolvedMeasurements, 2);
    assert.equal(report.orphanedMeasurementSummary.ruleA_MissingExecutionCount, 0);
    assert.equal(report.orphanedMeasurementSummary.ruleB_UnresolvableTraceCount, 0);
  });

  // 8. Rule C boundary: Exact decision-level link unsupported; scope-level coverage populates scopeCoverageVerifiedCount
  it("8. Rule C boundary: exact decision link unsupported; scope-level verification uses explicit case/scope records", () => {
    const trace = createCleanTrace("run_rule_c_scope");
    const exec = createValidExecution(trace.traceId, {
      execution_id: "exec_scope_01",
      case_id: "case_gain_staging",
      profile_id: "unit_preamp_overdrive",
    });
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const testCase: ValidationCase = {
      case_id: "case_gain_staging",
      title: "Gain Staging Case",
      validation_question: "Does preamp gain staging remain within linear bounds?",
      validation_subject: "unit_preamp_overdrive",
      scoped_boundaries: ["unit_preamp_overdrive"],
      applicable_test_dimensions: ["harmonic_distortion"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fixt_di_riff_01"],
      evaluation_methodology: "AUTOMATED_THD_SWEEP",
      acceptance_criteria_ref: "crit_thd_below_2pct",
      failure_consequence: "REMAND_TO_ENGINEERING",
      expected_remand_destination: "ENGINEERING",
    };

    const testScope: ValidationScopeRecord = {
      scope_id: "scope_guitar_overdrive_v1",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["unit_preamp_overdrive", "unit_cab_sim"],
      excluded_units: [],
      boundary_constraints: ["No sub-harmonic generation"],
      scope_inflation_protection: true,
    };

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
      validationCases: [testCase],
      validationScopes: [testScope],
    });

    // Scope coverage verified from explicit case and scope unit matching
    assert.equal(report.orphanedMeasurementSummary.scopeCoverageVerifiedCount, 1);
  });

  // 8b. Rule C boundary: Insufficient scope identity emits INFO_SCOPE_COVERAGE_UNVERIFIABLE NOT_VERIFIABLE
  it("8b. Rule C boundary: Insufficient scope identity emits INFO_SCOPE_COVERAGE_UNVERIFIABLE NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_rule_c_insufficient_scope");
    const exec = createValidExecution(trace.traceId, {
      execution_id: "exec_scope_unmatched",
      case_id: "case_gain_staging",
      profile_id: "unit_preamp_overdrive",
    });
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const testCase: ValidationCase = {
      case_id: "case_gain_staging",
      title: "Gain Staging Case",
      validation_question: "Does preamp gain staging remain within linear bounds?",
      validation_subject: "DSP Preamp",
      scoped_boundaries: ["preamp"],
      applicable_test_dimensions: ["harmonic_distortion"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fixt_di_riff_01"],
      evaluation_methodology: "AUTOMATED_THD_SWEEP",
      acceptance_criteria_ref: "crit_thd_below_2pct",
      failure_consequence: "REMAND_TO_ENGINEERING",
      expected_remand_destination: "ENGINEERING",
    };

    // Scope contains only unrelated unit
    const unrelatedScope: ValidationScopeRecord = {
      scope_id: "scope_cab_sim_only",
      intake_id: "intake_002",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["unit_cab_sim_exclusive"],
      excluded_units: [],
      boundary_constraints: [],
      scope_inflation_protection: true,
    };

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
      validationCases: [testCase],
      validationScopes: [unrelatedScope],
    });

    assert.equal(report.orphanedMeasurementSummary.scopeCoverageVerifiedCount, 0);
    const scopeFinding = report.findings.find((f) => f.code === "INFO_SCOPE_COVERAGE_UNVERIFIABLE");
    assert.ok(scopeFinding, "Should emit INFO_SCOPE_COVERAGE_UNVERIFIABLE when scope cannot be established");
    assert.equal(scopeFinding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
  });

  // 8c. Rule C boundary: No name or alias inference; descriptive labels do not substitute for unit matching
  it("8c. Rule C boundary: No name or alias inference; descriptive labels do not substitute for unit matching", () => {
    const trace = createCleanTrace("run_rule_c_no_inference");
    const exec = createValidExecution(trace.traceId, {
      execution_id: "exec_scope_alias",
      case_id: "case_overdrive_alias",
      profile_id: "unit_overdrive_tube_screamer",
    });
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const testCase: ValidationCase = {
      case_id: "case_overdrive_alias",
      title: "Tube Screamer Preamp Overdrive", // Descriptive title
      validation_question: "Does the preamp overdrive cleanly?",
      validation_subject: "Tube Screamer", // Descriptive subject
      scoped_boundaries: ["preamp", "overdrive"],
      applicable_test_dimensions: ["harmonic_distortion"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fixt_di_riff_01"],
      evaluation_methodology: "AUTOMATED_THD_SWEEP",
      acceptance_criteria_ref: "crit_thd_below_2pct",
      failure_consequence: "REMAND_TO_ENGINEERING",
      expected_remand_destination: "ENGINEERING",
    };

    // Scope has descriptive boundary constraint "Tube Screamer" but included_units is completely different
    const scopeWithDescriptionOnly: ValidationScopeRecord = {
      scope_id: "scope_gear_screamer",
      intake_id: "intake_003",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["completely_different_unit_id"], // Exact canonical ID differs
      excluded_units: [],
      boundary_constraints: ["Tube Screamer", "Preamp Overdrive"],
      scope_inflation_protection: true,
    };

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
      validationCases: [testCase],
      validationScopes: [scopeWithDescriptionOnly],
    });

    // Zero scope coverage because no free-text or description inference is permitted
    assert.equal(report.orphanedMeasurementSummary.scopeCoverageVerifiedCount, 0);
    assert.ok(report.findings.some((f) => f.code === "INFO_SCOPE_COVERAGE_UNVERIFIABLE"));
  });

  // 9. P18: RunTrace-only audit remains NOT_VERIFIABLE
  it("9. P18: RunTrace-only audit remains NOT_VERIFIABLE (backward compatibility)", () => {
    const trace = createCleanTrace("run_p18_only_trace");
    const report = auditor.audit(trace); // No validation evidence supplied

    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
    assert.ok(report.findings.some((f) => f.code === "INFO_P18_AUDIO_RECEIPTS_UNVERIFIABLE"));
    assert.equal(report.evidenceContext.isValidationIntegrated, false);
  });

  // 10. P18: Valid empirical validation evidence produces SATISFIED
  // 10. P18: Valid empirical validation evidence establishes empirical outcome provenance while full P18 remains NOT_VERIFIABLE
  it("10. P18: Valid empirical validation evidence establishes empirical outcome provenance while full P18 remains NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_p18_satisfied");
    const exec = createValidExecution(trace.traceId, {
      input_audio_integrity_ref: "sha256:authentic_di_input_hash",
      output_audio_integrity_ref: "sha256:authentic_dsp_capture_hash",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
    });

    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    // Factual separation: Requirement A (empirical outcome provenance) is VERIFIED,
    // but Requirement B (anti-circularity) cannot be proven from current records (no discriminator).
    // Therefore full P18 remains NOT_VERIFIABLE.
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
    assert.equal(report.evidenceContext.empiricalOutcomeVerified, true);
    assert.equal(report.evidenceContext.isValidationIntegrated, true);
    assert.ok(report.findings.some((f) => f.code === "INFO_P18_EMPIRICAL_OUTCOME_VERIFIED"));
    assert.ok(!report.findings.some((f) => f.code === "INFO_P18_AUDIO_RECEIPTS_UNVERIFIABLE"));
    assert.ok(!report.findings.some((f) => f.code === "EMPIRICAL_OUTCOME_NOT_VERIFIABLE"));
    // Since mandatory P18 is NOT_VERIFIABLE, overall audit verdict is TRACE_COMPLIANCE_NOT_VERIFIABLE
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
  });

  // 11. P18: Missing empirical provenance produces NOT_VERIFIABLE
  it("11. P18: Missing empirical audio integrity refs produces NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_p18_missing_receipts");
    const exec = createValidExecution(trace.traceId, {
      output_audio_integrity_ref: "", // Empty audio receipt!
    });
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
    });

    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
    assert.equal(report.evidenceContext.empiricalOutcomeVerified, false);
    assert.ok(report.findings.some((f) => f.code === "EMPIRICAL_OUTCOME_NOT_VERIFIABLE"));
  });

  // 12. P18: No fabricated circularity inputs; records lack prediction discriminator so circularity is not fabricated
  it("12. P18: No fabricated circularity inputs; canonical records lack prediction discriminator so no circularity violation is claimed", () => {
    const trace = createCleanTrace("run_p18_no_fabricated_circularity");
    const exec = createValidExecution(trace.traceId);
    const obj = createValidObjectiveEvidence(exec.execution_id);

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
    });

    // Zero fabricated circularity violations
    assert.ok(!report.findings.some((f) => f.code === "ERR_P18_CIRCULAR_OUTCOME"));
    assert.ok(!report.findings.some((f) => f.code === "EMPIRICAL_OUTCOME_CIRCULAR_REFERENCE"));
    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
  });

  // 12b. P18: No heuristic prediction matching; valid audio digest containing substring 'prediction' does not fabricate circularity
  it("12b. P18: No heuristic prediction matching; substring 'prediction' in digest does not fabricate circularity", () => {
    const trace = createCleanTrace("run_p18_no_heuristics");
    // Execution has valid digest containing 'prediction' as a substring (e.g. from file path or test label)
    const execWithSubstring = createValidExecution(trace.traceId, {
      output_audio_integrity_ref: "sha256:hash_sample_with_word_prediction_in_it",
    });
    const obj = createValidObjectiveEvidence(execWithSubstring.execution_id, {
      artifacts_retained: ["sha256:spectrum_simulation_plot_retained"],
    });

    const report = auditor.audit(trace, {
      executions: [execWithSubstring],
      objectiveEvidence: [obj],
    });

    // Must NOT fabricate EMPIRICAL_OUTCOME_CIRCULAR_REFERENCE via heuristic substring matching
    assert.ok(!report.findings.some((f) => f.code === "EMPIRICAL_OUTCOME_CIRCULAR_REFERENCE"));
    assert.equal(report.evidenceContext.empiricalOutcomeVerified, true);
    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
  });

  // 13. Verdict: Factual orphan measurement forces TRACE_COMPLIANCE_DEFICIENT
  it("13. Verdict: Factual orphan measurement forces TRACE_COMPLIANCE_DEFICIENT", () => {
    const trace = createCleanTrace("run_verdict_orphan");
    const orphanObj = createValidObjectiveEvidence("non_existent_exec");

    const report = auditor.audit(trace, {
      executions: [],
      objectiveEvidence: [orphanObj],
    });

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.equal(report.allAuditableInvariantsPassed, false);
  });

  // 14. Verdict: Unresolved P18 with zero violations produces TRACE_COMPLIANCE_NOT_VERIFIABLE
  it("14. Verdict: Unresolved P18 with zero violations produces TRACE_COMPLIANCE_NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_verdict_not_verifiable");
    // RunTrace only: clean trace, zero violations, but P18 unverified
    const report = auditor.audit(trace);

    assert.equal(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
  });

  // 15. Verdict: Integrated audit with valid empirical receipts still yields TRACE_COMPLIANCE_NOT_VERIFIABLE due to unverified P18
  it("15. Verdict: Integrated audit with valid empirical receipts still yields TRACE_COMPLIANCE_NOT_VERIFIABLE due to unverified P18", () => {
    const trace = createCleanTrace("run_verdict_integrated_p18_unverified");
    const exec = createValidExecution(trace.traceId);
    const obj = createValidObjectiveEvidence(exec.execution_id);
    const perc = createValidPerceptualEvaluation(exec.execution_id);

    const report = auditor.audit(trace, {
      executions: [exec],
      objectiveEvidence: [obj],
      perceptualEvaluations: [perc],
    });

    // Zero violations
    assert.equal(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);
    // Empirical outcome is verified
    assert.equal(report.evidenceContext.empiricalOutcomeVerified, true);
    assert.equal(report.evidenceContext.isValidationIntegrated, true);
    // But P18 is NOT_VERIFIABLE, so TRACE_COMPLIANCE_VERIFIED is prohibited
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
    assert.equal(report.orphanedMeasurementSummary.orphanedMeasurements, 0);
    assert.equal(report.orphanedMeasurementSummary.resolvedMeasurements, 2);
  });

  // 16. Backward compatibility & EvidenceContext
  it("16. Backward compatibility: auditTraceability helper works identically with options or direct param", () => {
    const trace = createCleanTrace("run_helper_compat");
    const exec = createValidExecution(trace.traceId);
    const obj = createValidObjectiveEvidence(exec.execution_id);

    // Passed via options
    const reportOptions = auditTraceability(trace, {
      validationEvidence: {
        executions: [exec],
        objectiveEvidence: [obj],
      },
    });

    // Passed via third argument
    const reportArg = auditTraceability(trace, undefined, {
      executions: [exec],
      objectiveEvidence: [obj],
    });

    assert.equal(reportOptions.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(reportArg.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(reportOptions.evidenceContext.isValidationIntegrated, true);
    assert.equal(reportOptions.evidenceContext.empiricalOutcomeVerified, true);
    assert.equal(reportOptions.evidenceContext.executionRecordCount, 1);
    assert.equal(reportOptions.evidenceContext.objectiveEvidenceCount, 1);
  });
});
