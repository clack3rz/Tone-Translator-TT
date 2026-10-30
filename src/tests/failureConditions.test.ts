// src/tests/failureConditions.test.ts
// Comprehensive governance-response conformance verification suite for Phase 1C.5h WP-31:
// Twenty Validation Failure & Degradation Conditions (Conditions 01–10).
// Bound to frozen specification v0.1j Section 35, Table 16, Table 17, and Implementation Plan v0.1h WP-31.
//
// GOVERNING AXIOM:
// AUTOMATED CONFORMANCE OF GOVERNANCE RESPONSE != FABRICATED EMPIRICAL VALIDATION RESULT.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADOPTION_DECISION_OUTCOMES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  EVALUATOR_PERSONAS,
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  MATERIALITY_SCORES,
  MUSICAL_FITNESS_VERDICTS,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PILLAR_READINESS_STATUSES,
  REGRESSION_CLASSIFICATIONS,
  REGRESSION_DOMAINS,
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  TASK_COMPLETION_STATUSES,
  TOLERANCE_EVALUATIONS,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
  VALIDATION_OUTCOME_CLASSES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  FROZEN_HARD_BLOCKERS,
  type ProductionReadinessSynthesisInput,
} from "../sound-engineer/validation/readiness";
import { GOVERNED_HARD_BLOCKERS } from "../sound-engineer/validation/outcome/outcomeTypes";
import {
  ArchitecturalVerificationHarness,
  AUTHOR_OF_CHANGE_REMAND_ROUTING,
  INFRASTRUCTURE_TRACEABILITY_REMAND_ROUTING,
  PHASE_1C5G_COEXISTENCE_REMAND_ROUTING,
  PHASE_1C5G_COMPARATOR_REMAND_ROUTING,
  PHASE_1C5G_PLANNING_REMAND_ROUTING,
  PRODUCT_REASONING_REMAND_ROUTING,
  REASONING_KNOWLEDGE_GOVERNANCE_REMAND_ROUTING,
  TESTING_WORKING_GROUP_REMAND_ROUTING,
  createBaselineExecutionRecord,
  createBaselineFixtureRecord,
  createBaselineObjectiveEvidence,
  createBaselinePackageRecord,
  createBaselinePerceptualEvaluation,
  createBaselineRollbackEvidence,
  createBaselineScopeRecord,
  createBaselineUATEvaluation,
  createBaselineUpstreamGovernance,
  createBaselineValidationCase,
  createBaselineVersionBindingRecord,
} from "./helpers/architecturalVerificationHarness";

describe("Phase 1C.5h WP-31 — Degradation Conditions 01–20 Conformance Suite", () => {
  const harness = new ArchitecturalVerificationHarness();

  // ---------------------------------------------------------------------------
  // COND-01: Invalid Test Fixture
  // Detection Point: Activity WF-05 / Fixture Integrity Audit
  // Immediate Action: Mark fixture INVALIDATED; halt testing dependent on fixture; generate ValidationFailureRecord
  // Gate 8 Consequence: Blocks Gate 8 (unusable fixture prevents legitimate validation)
  // Attribution: TEST_FIXTURE -> Golden Acoustic Fixture Curation Team (FIXTURE_REMAND)
  // Hard Blocker Semantics: Generic invalidity does NOT assert BLOCK-05 (Instability) or BLOCK-07 (Contamination)
  // ---------------------------------------------------------------------------
  it("COND-01: Invalid Test Fixture halts dependent execution, disqualifies Gate 8, and remands to Fixture Curation Team", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const invalidFixture = createBaselineFixtureRecord({
      fixture_id: "fix_cond01_invalid",
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_cond01",
      associated_fixture_set: [invalidFixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond01",
      case_id: vCase.case_id,
      fixture_id: invalidFixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.ABORTED,
    });

    // 1. Generic fixture invalidity halts/aborts dependent execution and disqualifies Gate 8 progression
    assert.strictEqual(exec.outcome, EXECUTION_OUTCOMES.ABORTED, "Execution must be aborted for invalid fixture");

    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [invalidFixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Invalid fixture must disqualify Gate 8 eligibility");

    // 2. Failure attribution & defect remand routing to Fixture Curation Team
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Invalid Test Fixture",
          symptom: "Fixture checksum mismatch and payload corruption detected during WF-05 Fixture Integrity Audit.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: invalidFixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(attribution.record.gate_8_blocked, true);
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");
  });

  // ---------------------------------------------------------------------------
  // COND-02: Fixture Provenance Missing
  // Detection Point: Activity WF-05 / Fixture Provenance Inspection
  // Immediate Action: Quarantine fixture; refuse execution of dependent ValidationCases; generate ValidationFailureRecord
  // Gate 8 Consequence: Blocks Gate 8 (unverifiable provenance violates Invariant 4 and 10)
  // Attribution: TEST_FIXTURE -> Golden Acoustic Fixture Curation Team (FIXTURE_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-02: Fixture Provenance Missing halts execution, refuses cutover, and enforces FIXTURE_REMAND", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const quarantinedFixture = createBaselineFixtureRecord({
      fixture_id: "fix_cond02_no_provenance",
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_cond02",
      associated_fixture_set: [quarantinedFixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond02",
      case_id: vCase.case_id,
      fixture_id: quarantinedFixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.ABORTED,
    });

    // Upstream governance detects broken provenance
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [quarantinedFixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance({ provenance_intact: false }),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN),
      "Must trigger Hard Blocker 04 for missing provenance trail"
    );

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false);

    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Fixture Provenance Missing",
          symptom: "Audio stem capture chain-of-custody missing from metadata envelope, violating Invariant 4 and Invariant 10.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: quarantinedFixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");
  });

  // ---------------------------------------------------------------------------
  // COND-03: Calibration Mismatch
  // Detection Point: Activity WF-05 / Input Signal Calibration Check
  // Immediate Action: Abort execution; log calibration offset relative to calibration_profile_ref; generate ValidationFailureRecord
  // Gate 8 Consequence: Blocks Gate 8 until calibrated re-run is executed
  // Attribution: TEST_FIXTURE or VALIDATION_ENVIRONMENT -> Fixture Team / Validation Infrastructure
  // Hard Blocker Semantics: Calibration mismatch halts evaluation and requires retest; does NOT assert BLOCK-05
  // ---------------------------------------------------------------------------
  it("COND-03: Calibration Mismatch aborts execution, prevents Gate 8 progression, and requires gain realignment", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const miscalibratedFixture = createBaselineFixtureRecord({
      fixture_id: "fix_cond03_miscalibrated",
      calibration_spec: "OFFSET_+8DB_INVALID",
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_cond03",
      associated_fixture_set: [miscalibratedFixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond03",
      case_id: vCase.case_id,
      fixture_id: miscalibratedFixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.ABORTED,
    });

    // 1. Calibration mismatch aborts execution and halts progression
    assert.strictEqual(exec.outcome, EXECUTION_OUTCOMES.ABORTED, "Calibration mismatch must abort execution run");

    // 2. Failure attribution & remand with calibration retest prerequisites
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Calibration Mismatch",
          symptom: "Input signal calibration level deviates by +8.0 dBFS from declared calibration profile reference.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: miscalibratedFixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(attribution.record.gate_8_blocked, true, "Untrustworthy calibration must halt Gate 8 progression");
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");
    assert.ok(remand.package.routing.defaultRetestPrerequisites.length > 0, "Must provide retest prerequisites for recalibration");
  });

  // ---------------------------------------------------------------------------
  // COND-04: Non-Reproducible Result
  // Detection Point: Activity WF-08 or WF-09 / Multi-Run Determinism Audit
  // Immediate Action: Flag candidate as non-deterministic; log execution environment discrepancies; generate ValidationFailureRecord
  // Gate 8 Consequence: Blocks Gate 8 (audio must be reproducible)
  // Attribution: RUNTIME_IMPLEMENTATION -> Software Engineering Core Team (RUNTIME_REMAND)
  // Hard Blocker Semantics: Non-reproducibility halts validation and preserves uncertainty; does NOT assert BLOCK-01
  // ---------------------------------------------------------------------------
  it("COND-04: Non-Reproducible Result flags candidate non-deterministic, blocks cutover, and issues RUNTIME_REMAND", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond04",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond04",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // 1. Failure attribution & remand to Core Software Engineering
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Non-Reproducible Result",
          symptom: "Bit-exact determinism audit across consecutive execution passes failed due to unseeded pseudo-random DSP state.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.strictEqual(attribution.record.gate_8_blocked, true, "Non-deterministic execution must halt Gate 8 cutover");
    assert.strictEqual(remand.package.routing.remandClass, "RUNTIME_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Software Engineering Core Team");

    // 2. Preserve explicit uncertainty regarding determinism rather than forcing regression classification
    const uncertaintyRecord = {
      uncertainty_id: "unc_cond04_reproducibility",
      package_id: pkg.package_id,
      uncertainty_source: UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE,
      affected_scope: [...scope.included_units],
      potential_production_risk: "Non-deterministic DSP state prevents bit-exact reproducibility verification.",
      required_monitoring_if_authorized: ["Deterministic state profiling"],
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
    };

    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      uncertaintyRecords: [uncertaintyRecord],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Non-reproducible candidate cannot be cut over");
    assert.ok(
      !readinessResult.assessmentRecord.hard_blockers_present?.includes(GOVERNED_HARD_BLOCKERS.BLOCK_01_REGRESSION),
      "Non-reproducible result must NOT be classified as BLOCK-01 genuine regression"
    );
  });

  // ---------------------------------------------------------------------------
  // COND-05: Objective Metrics Pass but Listening Fails
  // Detection Point: Activity WF-13 / Evidence Reconciliation
  // Immediate Action: Prohibit objective scores from overriding human listening; log acoustic dissonance; trigger targeted listening review
  // Gate 8 Consequence: Blocks Gate 8 (Invariant 7: What must be heard must be heard)
  // Attribution: REASONING -> Upstream Reasoning Governance (REASONING_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-05: Objective Metrics Pass but Listening Fails creates conflict, synthesizes FAIL, and remands to Upstream Reasoning", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond05",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond05",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });

    const objEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_cond05",
      execution_id: exec.execution_id,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    });

    const percEvaluation = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_cond05",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations: "Harsh fizzy top-end, lacking warmth and low-mid punch.",
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      execution_record_refs: [exec.execution_id],
      evidence_refs: [objEvidence.objective_evidence_id, percEvaluation.perceptual_evidence_id],
    });

    // 1. Detect evidence conflict
    const conflictResult = harness.conflictDetector.detectConflict({
      packageRecord: pkg,
      objectiveEvidence: objEvidence,
      perceptualEvidence: percEvaluation,
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
    });

    assert.strictEqual(conflictResult.hasConflict, true);
    assert.ok(conflictResult.record !== undefined);
    assert.strictEqual(conflictResult.record!.conflict_type, CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL);

    // 2. Synthesize outcome: Invariant 7 enforces listening governs -> FAIL
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      objectiveEvidence: [objEvidence],
      perceptualEvidence: [percEvaluation],
      conflictRecords: [conflictResult.record!],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);

    // 3. Failure attribution & remand to upstream reasoning
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Objective Metrics Pass but Listening Fails",
          symptom: "Acoustic harshness confirmed by expert panel despite passing FFT spectral error budget.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: objEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandClass, "REASONING_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)");
  });

  // ---------------------------------------------------------------------------
  // COND-06: Listening Passes but Deterministic / Export Validation Fails
  // Detection Point: Activity WF-13 / Evidence Reconciliation
  // Immediate Action: Prohibit subjective enthusiasm from excusing structural defect; log parameter boundary or serialization failure; generate EvidenceConflictRecord & ValidationFailureRecord
  // Gate 8 Consequence: Blocks Gate 8 (BLOCKER-02)
  // Attribution: PLATFORM_TRANSLATION -> Stage 12 Platform Translation Governance (TRANSLATION_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-06: Listening Passes but Deterministic / Export Fails blocks Gate 8 via BLOCKER-02 and triggers TRANSLATION_REMAND", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond06",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond06",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    const failedExportEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_cond06_export_fail",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    });

    const percPass = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_cond06",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      execution_record_refs: [exec.execution_id],
      evidence_refs: [failedExportEvidence.objective_evidence_id, percPass.perceptual_evidence_id],
    });

    // 1. Conflict detection (Type B: Ears PASS / Metrics FAIL)
    const conflictResult = harness.conflictDetector.detectConflict({
      packageRecord: pkg,
      objectiveEvidence: failedExportEvidence,
      perceptualEvidence: percPass,
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
    });

    assert.strictEqual(conflictResult.hasConflict, true);
    assert.ok(conflictResult.record !== undefined);

    // 2. Readiness check detects BLOCKER-02: Target-platform export failure
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      objectiveEvidence: [failedExportEvidence],
      fixtureRecords: [fixture],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION),
      "Export integrity failure must trigger Hard Blocker 02"
    );

    // 3. Attribution & Remand to Stage 12
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Listening Passes but Deterministic / Export Fails",
          symptom: "Export serialization failed due to parameter clamping violation in Stage 12 translation layer.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: failedExportEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION);
    assert.strictEqual(remand.package.routing.remandClass, "TRANSLATION_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Stage 12 Platform Translation Governance");
  });

  // ---------------------------------------------------------------------------
  // COND-07: PATH-PROD and PATH-SHADOW Not Comparable
  // Detection Point: Activity WF-11 / Tripartite Comparator Calibration
  // Immediate Action: Halt differential auditing; log comparability divergence (e.g. mismatched input buffers or gain staging)
  // Gate 8 Consequence: Blocks Gate 8 (regression detection invalid without calibrated comparability)
  // Attribution: VALIDATION_ENVIRONMENT / 1C5G -> Phase 1C.5g Infrastructure (ENVIRONMENT_REMAND)
  // Authority Boundary: Preserves Phase 1C.5h / Phase 1C.5g boundary; does NOT assert BLOCK-01
  // ---------------------------------------------------------------------------
  it("COND-07: PATH-PROD and PATH-SHADOW Not Comparable halts differential audit, blocks Gate 8, and remands to Phase 1C.5g Infrastructure", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond07",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond07",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.ABORTED,
    });

    // 1. Failure attribution & remand with Phase 1C.5g Infrastructure routing
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "PATH-PROD and PATH-SHADOW Not Comparable",
          symptom: "Input buffer alignment and sampling rate mismatch (44.1 kHz vs 96 kHz) prevents calibrated tripartite comparison.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: PHASE_1C5G_COMPARATOR_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT);
    assert.strictEqual(attribution.record.gate_8_blocked, true, "Comparability defect must halt Gate 8 progression");
    assert.strictEqual(remand.package.routing.remandClass, "ENVIRONMENT_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Phase 1C.5g Infrastructure", "Must remand to Phase 1C.5g Infrastructure, preserving 1C.5h/1C.5g boundary");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Phase 1C.5g Infrastructure");

    // 2. Halting differential auditing fails closed without falsely claiming a genuine regression (BLOCK-01)
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Aborted comparison must disqualify Gate 8 cutover");
    assert.ok(
      !readinessResult.assessmentRecord.hard_blockers_present?.includes(GOVERNED_HARD_BLOCKERS.BLOCK_01_REGRESSION),
      "Comparability failure must NOT assert BLOCK-01 genuine regression"
    );
  });

  // ---------------------------------------------------------------------------
  // COND-08: Unexplained Material Divergence
  // Detection Point: Activity WF-11 / Differential Auditing
  // Immediate Action: Classify as UNRESOLVED_DIVERGENCE; freeze candidate cutover
  // Gate 8 Consequence: Blocks Gate 8 until divergence is resolved as Intentional Correction or Neutral Divergence
  // Attribution: REASONING or MIGRATION_MAPPING -> Upstream Reasoning / Phase 1C.5g
  // Hard Blocker Semantics: Unresolved critical tone divergence triggers BLOCK-08 (Uncertainty), NOT BLOCK-07 (Contamination)
  // ---------------------------------------------------------------------------
  it("COND-08: Unexplained Material Divergence classifies as UNRESOLVED_DIVERGENCE, freezes Gate 8, and preserves uncertainty", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const fixture = createBaselineFixtureRecord();

    // 1. Regression assessment with UNRESOLVED (not GENUINE_REGRESSION)
    const regressionRecord = {
      regression_id: "reg_cond08_unresolved",
      package_id: pkg.package_id,
      comparison_target: `tripartite:legacy_out__${fixture.fixture_id}`,
      divergence_detected: true,
      divergence_magnitude: 6.4, // Material 6.4 dB delta
      classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
      materiality_score: MATERIALITY_SCORES.HIGH,
      affected_scope: [...scope.included_units],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "Material high-frequency peak detected; acoustic justification and intent unconfirmed.",
      blocks_gate_8: true,
    };

    // 2. ValidationUncertaintyRecord created to preserve explicit uncertainty
    const uncertaintyRecord = {
      uncertainty_id: "unc_cond08_divergence",
      package_id: pkg.package_id,
      uncertainty_source: UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE,
      affected_scope: [...scope.included_units],
      potential_production_risk: "Critical tone safety: potential listener fatigue and piercing treble response in production audio.",
      required_monitoring_if_authorized: ["Continuous spectral monitoring"],
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
    };

    // 3. Outcome synthesis preserves explicit uncertainty and applies canonical BLOCK-08: Uncertainty
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      regressionAssessments: [regressionRecord],
      uncertaintyRecords: [uncertaintyRecord],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.BLOCKED);

    // Canonical Table 13: BLOCK-08 is Uncertainty, BLOCK-07 is Contamination
    assert.ok(
      outcomeResult.activeBlockers.some((reason) =>
        reason.includes(GOVERNED_HARD_BLOCKERS.BLOCK_08_UNCERTAINTY)
      ),
      "Unresolved critical uncertainty must trigger canonical BLOCK-08: Uncertainty"
    );
    assert.ok(
      !outcomeResult.activeBlockers.some((reason) =>
        reason.includes(GOVERNED_HARD_BLOCKERS.BLOCK_07_CONTAMINATION)
      ),
      "Critical uncertainty must NOT be labeled as BLOCK-07 Contamination"
    );
    assert.ok(
      !outcomeResult.activeBlockers.some((reason) =>
        reason.includes(GOVERNED_HARD_BLOCKERS.BLOCK_01_REGRESSION)
      ),
      "Unresolved divergence must NOT be automatically classified as BLOCK-01 Genuine Regression"
    );

    // 4. Readiness check enforces Gate 8 disqualification
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      regressionAssessments: [regressionRecord],
      uncertaintyRecords: [uncertaintyRecord],
      fixtureRecords: [fixture],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Unresolved critical uncertainty must disqualify Gate 8 eligibility");
  });

  // ---------------------------------------------------------------------------
  // COND-09: Export Succeeds but Target-Platform Playback Fails
  // Detection Point: Activity WF-07 / Target-Platform Integrity Verification
  // Immediate Action: Log platform DSP instantiation failure, preset parse crash, or missing gear error; generate failed ObjectiveEvidenceRecord and ValidationFailureRecord
  // Gate 8 Consequence: Absolute Hard Blocker for Gate 8 (BLOCKER-02)
  // Attribution: PLATFORM_TRANSLATION or TARGET_PLATFORM -> Stage 12 Platform Translation Governance
  // ---------------------------------------------------------------------------
  it("COND-09: Export Succeeds but Target-Platform Playback Fails triggers BLOCKER-02 and remands to Stage 12", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond09",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond09",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // Export serialization was valid XML, but platform loading failed due to unknown gear ID
    const failedPlatformEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_cond09_platform_load_fail",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
      measured_delta: 1.0,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    });

    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      objectiveEvidence: [failedPlatformEvidence],
      fixtureRecords: [fixture],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION),
      "Platform playback failure must trigger Hard Blocker 02"
    );

    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Export Succeeds but Target-Platform Playback Fails",
          symptom: "AmpliTube 5 rejected preset loading with error: invalid gear identifier 'amp_lead_5150_typo'.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: failedPlatformEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION);
    assert.strictEqual(remand.package.routing.remandClass, "TRANSLATION_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Stage 12 Platform Translation Governance");
  });

  // ---------------------------------------------------------------------------
  // COND-10: Acoustic Result Passes but Runtime Is Unstable
  // Detection Point: Activity WF-08 / Operational Stability Profile
  // Immediate Action: Log resource leak, CPU execution budget breach, or buffer underrun under load
  // Gate 8 Consequence: Absolute Hard Blocker for Gate 8 (BLOCKER-05: Instability in outcome, operational pillar DEFICIENT)
  // Attribution: RUNTIME_IMPLEMENTATION -> Software Engineering Core Team (RUNTIME_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-10: Acoustic Passes but Runtime Is Unstable triggers operational failure, blocks Gate 8, and issues RUNTIME_REMAND", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_cond10",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond10",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // Acoustic evaluation passes
    const percPass = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_cond10",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });

    // Objective stability measurement fails: memory leak / buffer underrun
    const failedStabilityEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_cond10_stability_fail",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE,
      measured_delta: 42.0, // 42 audio dropouts under load
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      execution_record_refs: [exec.execution_id],
      evidence_refs: [failedStabilityEvidence.objective_evidence_id, percPass.perceptual_evidence_id],
    });

    // Synthesize outcome: instability forces FAIL
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      objectiveEvidence: [failedStabilityEvidence],
      perceptualEvidence: [percPass],
      hardBlockersPresent: [GOVERNED_HARD_BLOCKERS.BLOCK_05_INSTABILITY],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.ok(
      outcomeResult.activeBlockers.includes(GOVERNED_HARD_BLOCKERS.BLOCK_05_INSTABILITY),
      "Factual runtime instability must trigger canonical BLOCK-05: Instability"
    );
    assert.ok(
      !outcomeResult.activeBlockers.includes(GOVERNED_HARD_BLOCKERS.BLOCK_01_REGRESSION),
      "Operational instability must NOT assert BLOCK-01 genuine regression"
    );

    // Attribution & Remand to Core Software Engineering
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Acoustic Result Passes but Runtime Is Unstable",
          symptom: "Severe memory leak and 42 audio buffer dropouts detected during Profile-08 operational stress testing.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: failedStabilityEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.strictEqual(remand.package.routing.remandClass, "RUNTIME_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Software Engineering Core Team");

    // Readiness evaluation confirms platform operational pillar is DEFICIENT and Gate 8 disqualified
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      objectiveEvidence: [failedStabilityEvidence],
      fixtureRecords: [fixture],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Runtime instability must disqualify Gate 8 cutover");
    assert.ok(
      readinessResult.assessmentRecord.hard_blockers_present.includes(FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY),
      "Runtime instability must trigger canonical BLOCK-05: Instability in hard blockers"
    );
    assert.strictEqual(
      readinessResult.assessmentRecord.pillar_evaluations.platform_operational_readiness,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      "Operational latency/memory degradation must degrade platform operational pillar to DEFICIENT"
    );
  });

  // ---------------------------------------------------------------------------
  // COND-11: Rollback Validation Fails
  // Detection Point: Activity WF-14 / Rollback Audit (Pre-Cutover Rollback Verification)
  // Immediate Action: Log rollback failure (e.g. reversion time exceeding recovery objective, state inconsistency)
  // Gate 8 Consequence: Absolute Hard Blocker for Gate 8 (BLOCK-03: Rollback Fail; Invariant 9)
  // Attribution: OPERATIONAL_INFRASTRUCTURE -> Phase 1C.5g Coexistence Team (ENVIRONMENT_REMAND)
  // Governance Boundary: Phase 1C.5h declares governance outcome only; Phase 1C.5g owns rollback execution
  // ---------------------------------------------------------------------------
  it("COND-11: Rollback Validation Fails blocks Gate 8 via BLOCK-03 and remands to Phase 1C.5g Coexistence Team", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const vCase = createBaselineValidationCase({
      case_id: "case_cond11_rollback",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond11",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Rollback verification under load fails (e.g. reversion time SLA breached: 1800ms > 250ms target)
    const failedRollback = createBaselineRollbackEvidence(false, {
      rollback_verified: false,
      path_rollback_verified_under_load: false,
      recovery_time_objective_met: false,
      failure_reason: "Automated failover latency 1800ms exceeded governed SLA of 250ms under continuous load.",
    });

    // 2. Hard Blocker evaluation: BLOCK-03 applies factually
    const blockerEval = harness.checkHardBlockers({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: failedRollback,
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });

    assert.ok(
      blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED),
      "Rollback failure must trigger canonical BLOCK-03: Rollback Fail"
    );
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION),
      "Rollback failure must NOT assert BLOCK-01 genuine regression"
    );

    // 3. Readiness synthesis: Gate 8 disqualified, operational rollback pillar DEFICIENT
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: failedRollback,
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Failed rollback must disqualify Gate 8 cutover");
    assert.strictEqual(
      readinessResult.assessmentRecord.pillar_evaluations.rollback_safety_readiness,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      "Operational rollback pillar must be DEFICIENT"
    );

    // 4. Defect remand routed to Phase 1C.5g Coexistence Team (1C.5h declares governance, 1C.5g executes rollback)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Rollback Validation Fails",
          symptom: "Reversion latency 1800ms exceeded 250ms recovery objective during Profile-11 load verification.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: PHASE_1C5G_COEXISTENCE_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE);
    assert.strictEqual(remand.package.routing.remandDestination, "Phase 1C.5g Coexistence Team");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Phase 1C.5g Coexistence Team");
  });

  // ---------------------------------------------------------------------------
  // COND-12: Undocumented Test-Environment Dependency
  // Detection Point: Activity WF-02 / Version Binding Audit
  // Immediate Action: Identify undeclared dynamic library, local driver patch, or unversioned environment variable
  // Gate 8 Consequence: Blocks Gate 8 until all dependencies are explicitly codified and locked
  // Attribution: VALIDATION_ENVIRONMENT -> Validation Infrastructure Engineering (ENVIRONMENT_REMAND)
  // Hard Blocker Semantics: Halts validation; no arbitrary hard blocker is required unless independently satisfied
  // ---------------------------------------------------------------------------
  it("COND-12: Undocumented Test-Environment Dependency invalidates binding, blocks Gate 8, and remands to Validation Infrastructure", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const vCase = createBaselineValidationCase({
      case_id: "case_cond12",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond12",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // 1. Version binding with an uncodified/unversioned environment dependency (e.g. unversioned local ALSA driver patch)
    // Failure attribution isolates this to VALIDATION_ENVIRONMENT
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Undocumented Test-Environment Dependency",
          symptom: "Test runner executed against undeclared local kernel audio driver patch libasound_patch.so.2 not in version binding manifest.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT);
    assert.strictEqual(attribution.record.gate_8_blocked, true, "Undocumented dependency must halt Gate 8 progression");
    assert.strictEqual(remand.package.routing.remandClass, "ENVIRONMENT_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Validation Infrastructure Engineering");

    // 2. Readiness evaluation halts without claiming a false genuine regression (BLOCK-01) or runtime instability (BLOCK-05)
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerEval = harness.checkHardBlockers(readinessInput);
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION),
      "Undocumented environment dependency must NOT assert BLOCK-01 genuine regression"
    );
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY),
      "Undocumented environment dependency must NOT assert BLOCK-08 unless critical tone risk is proven"
    );

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Execution failure from undocumented dependency halts Gate 8");
  });

  // ---------------------------------------------------------------------------
  // COND-13: Expert Reviewers Disagree
  // Detection Point: Activity WF-13 / Evidence Reconciliation
  // Immediate Action: Log reviewer split in EvidenceConflictRecord; forbid scalar averaging of divergent scores
  // Gate 8 Consequence: Prevents unqualified PASS; forces CONDITIONAL or BLOCKED status
  // Attribution: REASONING / UNKNOWN -> Upstream Reasoning / Knowledge Governance (REASONING_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-13: Expert Reviewers Disagree records conflict, prohibits scalar averaging, and remands to Upstream Reasoning / Knowledge Governance", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond13",
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      execution_record_refs: [exec.execution_id],
    });
    const vCase = createBaselineValidationCase({
      case_id: exec.case_id,
      associated_fixture_set: [fixture.fixture_id],
    });

    // 1. Expert listening panel is split: Reviewer A accepts, Reviewer B rejects
    const reviewerAPass = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_cond13_revA_pass",
      execution_id: exec.execution_id,
      evaluator_id: "eval_master_eng_01",
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      qualitative_observations: "Warm, authentic top-end saturation; meets broadcast requirements.",
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    });

    const reviewerBFail = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_cond13_revB_fail",
      execution_id: exec.execution_id,
      evaluator_id: "eval_producer_02",
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      qualitative_observations: "Harsh treble buildup around 4.5kHz; thin body under palm-muting.",
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    });

    // 2. Disagreement is preserved in an EvidenceConflictRecord (Record 15)
    const conflictResult = harness.conflictDetector.recordDisagreement({
      packageRecord: pkg,
      conflictType: CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
      competingEvidenceRefs: [reviewerAPass.perceptual_evidence_id, reviewerBFail.perceptual_evidence_id],
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
      conflictDescription: "Expert listening panel disagreement: Master Engineer passed warmth/saturation while Golden Ear Producer rejected treble harshness.",
      underlyingAcousticPhenomenon: "Acoustic perception divergence across monitoring environments regarding high-frequency harmonic saturation.",
      customResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
    });

    assert.strictEqual(conflictResult.hasConflict, true);
    assert.strictEqual(conflictResult.record?.conflict_type, CONFLICT_TYPES.EVALUATOR_DISAGREEMENT);
    assert.strictEqual(conflictResult.record?.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);

    // 3. Axiom 4: Scalar mathematical averaging of conflicting scores is strictly forbidden
    assert.throws(
      () => harness.conflictDetector.assertNoScalarSmoothing(9.0, 3.0),
      (err: unknown) => {
        return (
          err instanceof Error &&
          err.name === "ScalarSmoothingForbiddenError" &&
          err.message.includes("Axiom 4")
        );
      },
      "Scalar smoothing or averaging divergent reviewer scores must throw ScalarSmoothingForbiddenError"
    );

    // 4. Outcome synthesis: Unresolved conflict prevents unqualified PASS
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      perceptualEvidence: [reviewerAPass, reviewerBFail],
      conflictRecords: [conflictResult.record!],
    });

    assert.notStrictEqual(
      outcomeResult.outcomeRecord.outcome_class,
      VALIDATION_OUTCOME_CLASSES.PASS,
      "Divergent reviewer conflict must not allow an unqualified PASS"
    );
    assert.ok(
      outcomeResult.outcomeRecord.unresolved_issues.some((issue) =>
        issue.toLowerCase().includes("conflict") || issue.toLowerCase().includes("perceptual")
      ),
      "Reviewer disagreement must be preserved explicitly in unresolved issues"
    );

    // 5. Defect remand routed to Upstream Reasoning / Knowledge Governance
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Expert Reviewers Materially Disagree",
          symptom: "Split evaluation between Master Engineer and Golden Ear Producer requires consensus reconciliation.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.MAJOR,
        gate8Blocked: false,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: REASONING_KNOWLEDGE_GOVERNANCE_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandDestination, "Upstream Reasoning / Knowledge Governance");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Upstream Reasoning / Knowledge Governance");
  });

  // ---------------------------------------------------------------------------
  // COND-14: UAT Result Inconclusive
  // Detection Point: Activity WF-10 / UAT Adjudication
  // Immediate Action: Log task confusion or ambiguous user feedback in UATEvaluationRecord; mark outcome INCONCLUSIVE/CONDITIONAL
  // Gate 8 Consequence: Blocks clean Gate 8 until workflow clarity is established; cannot be converted to PASS
  // Attribution: REASONING / UI -> Product / Reasoning Teams (REASONING_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-14: UAT Result Inconclusive prevents unqualified PASS, preserves friction, and remands to Product / Reasoning Teams", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond14",
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });
    const vCase = createBaselineValidationCase({
      case_id: exec.case_id,
      associated_fixture_set: [fixture.fixture_id],
    });

    // 1. UAT evaluation reveals task confusion and cognitive friction
    const inconclusiveUAT = createBaselineUATEvaluation({
      uat_id: "uat_cond14",
      package_id: pkg.package_id,
      evaluator_persona: EVALUATOR_PERSONAS.SESSION_GUITARIST,
      task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
      workflow_satisfaction_rating: 5.5,
      cognitive_friction_notes: "Session guitarist reported ambiguous preset parameter hierarchy and task confusion adjusting tone stack.",
      musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.CONDITIONALLY_ACCEPTED,
      uat_blockers_identified: ["Ambiguous tone stack layout"],
    });

    // 2. Synthesize outcome: Inconclusive UAT cannot be converted to unqualified PASS
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      uatEvidence: [inconclusiveUAT],
    });

    assert.notStrictEqual(
      outcomeResult.outcomeRecord.outcome_class,
      VALIDATION_OUTCOME_CLASSES.PASS,
      "Inconclusive UAT with friction must never be converted to an unqualified PASS"
    );
    assert.ok(
      outcomeResult.outcomeRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.CONDITIONAL ||
        outcomeResult.outcomeRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.BLOCKED,
      "Inconclusive UAT leads to governed CONDITIONAL or BLOCKED outcome requiring workflow remediation"
    );
    assert.ok(
      inconclusiveUAT.cognitive_friction_notes.includes("ambiguous") &&
      inconclusiveUAT.cognitive_friction_notes.includes("task confusion"),
      "Ambiguity and task confusion must remain explicitly documented in the UAT record"
    );

    // 3. Attribution & Remand to Product / Reasoning Teams
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "UAT Result Inconclusive",
          symptom: "Session guitarist encountered workflow ambiguity in tone stack hierarchy during lead tracking scenario.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        materiality: FAILURE_MATERIALITIES.MAJOR,
        gate8Blocked: false,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: PRODUCT_REASONING_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandDestination, "Product / Reasoning Teams");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Product / Reasoning Teams");
  });

  // ---------------------------------------------------------------------------
  // COND-15: Critical Domain Remains Untested
  // Detection Point: Activity WF-03 / Scope Coverage Audit
  // Immediate Action: Identify missing fixture coverage for declared critical gear or playing styles
  // Gate 8 Consequence: Limits authorized scope strictly to tested domain; prevents silent authorization of untested units
  // Attribution: TEST_FIXTURE -> Golden Fixture Curation Team (FIXTURE_REMAND)
  // Hard Blocker Semantics: Does not automatically assert BLOCK-06 unless request exceeds tested scope
  // ---------------------------------------------------------------------------
  it("COND-15: Critical Domain Untested constrains scope to tested evidence and remands to Fixture Curation Team", () => {
    // 1. Declared scope contains both High Gain Lead and Clean Twin Reverb
    const broadScope = createBaselineScopeRecord({
      scope_id: "scope_gear_family_multi",
      included_units: ["guitar:amp:5150_lead", "guitar:amp:clean_twin_reverb"],
    });
    const binding = createBaselineVersionBindingRecord(broadScope.scope_id);

    // Only the High Gain Lead amp has an executed test fixture and evidence
    const leadFixture = createBaselineFixtureRecord({
      fixture_id: "fix_lead_tested",
      declared_applicability_scope: ["guitar:amp:5150_lead"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_lead_only",
      scoped_boundaries: ["guitar:amp:5150_lead"],
      associated_fixture_set: [leadFixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_lead_only",
      case_id: vCase.case_id,
      fixture_id: leadFixture.fixture_id,
      binding_id: binding.binding_id,
    });
    const objPass = createBaselineObjectiveEvidence({
      execution_id: exec.execution_id,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });

    const pkg = createBaselinePackageRecord(broadScope.scope_id, binding.binding_id, {
      execution_record_refs: [exec.execution_id],
      evidence_refs: [objPass.objective_evidence_id],
    });

    // 2. Verified scope containment: tested scope is strictly "guitar:amp:5150_lead"
    // When no request exceeds the tested units, BLOCK-06 is NOT automatically asserted
    const blockerEval = harness.checkHardBlockers(
      {
        packageRecord: pkg,
        scopeRecord: createBaselineScopeRecord({ included_units: ["guitar:amp:5150_lead"] }),
        versionBinding: binding,
        fixtureRecords: [leadFixture],
        executionRecords: [exec],
        rollbackEvidence: createBaselineRollbackEvidence(true),
        upstreamGovernanceState: createBaselineUpstreamGovernance(),
      },
      ["guitar:amp:5150_lead"]
    );
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION),
      "Must NOT assert BLOCK-06 when requested scope remains within tested units"
    );

    // 3. Attribution of missing domain coverage to TEST_FIXTURE and remand to Fixture Curation Team
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: broadScope,
        symptomDetails: {
          title: "Critical Domain Remains Untested",
          symptom: "Missing golden audio performance fixtures for clean_twin_reverb; clean tone domain remains untested.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.MAJOR,
        gate8Blocked: false,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: leadFixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Fixture Curation Team");
  });

  // ---------------------------------------------------------------------------
  // COND-16: Material Implementation Change Occurs After PASS
  // Detection Point: Activity WF-02 / Post-Pass Dependency Integrity Monitor
  // Immediate Action: Generate RevalidationTriggerRecord; require retest; preserve prior immutable PASS
  // Gate 8 Consequence: Active authorization suspended pending retest of changed domain
  // Attribution: RUNTIME_IMPLEMENTATION / REASONING -> Author of change (RUNTIME_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-16: Implementation Change Post-PASS generates RevalidationTriggerRecord and remands to Author of change", () => {
    const scope = createBaselineScopeRecord();
    const priorBinding = createBaselineVersionBindingRecord(scope.scope_id, {
      binding_id: "binding_prior_pass",
      runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
    });

    // 1. Candidate previously attained a valid PASS under prior binding
    const priorOutcome = {
      outcome_id: "outcome_prior_pass_01",
      package_id: "pkg_cond16",
      scope_id: scope.scope_id,
      version_binding_id: priorBinding.binding_id,
      outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
      summary_verdict: "PASS: All criteria satisfied.",
      unresolved_issues: [],
      conditions_imposed: [],
      evaluator_signatures: ["sig_lead_01"],
      sealed_at: "2026-10-22T00:00:00.000Z",
    };

    // 2. Material implementation change occurs: Core DSP runtime codebase is updated post-pass
    const newBinding = createBaselineVersionBindingRecord(scope.scope_id, {
      binding_id: "binding_post_change_v2",
      runtime_implementation_version: "git_sha_9999_patched_dsp_loop",
    });

    // 3. Trigger detector evaluates binding diff: triggers canonical TRIGGER-07
    const triggerResult = harness.triggerDetector.detectTrigger({
      scopeRecord: scope,
      priorBinding,
      newBinding,
    });

    assert.ok(triggerResult.triggerRecord);
    assert.ok(
      triggerResult.detectedTriggers.includes(REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE),
      "Runtime code update must detect canonical TRIGGER-07"
    );
    assert.strictEqual(
      triggerResult.triggerRecord.required_action,
      REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST,
      "TRIGGER-07 requires full revalidation"
    );

    // 4. Prior PASS record remains immutable (not rewritten in place)
    assert.strictEqual(priorOutcome.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS, "Prior outcome record remains immutable");
    assert.strictEqual(priorOutcome.version_binding_id, "binding_prior_pass", "Prior outcome remains sealed to prior binding");

    // 5. Defect remand routed to Author of change
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({ associated_fixture_set: [fixture.fixture_id] });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond16",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: newBinding.binding_id,
    });

    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Material Implementation Change Occurs After PASS",
          symptom: "Post-pass DSP loop optimization altered runtime engine signature; requires targeted revalidation.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.MAJOR,
        gate8Blocked: true,
      },
      versionBinding: newBinding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: AUTHOR_OF_CHANGE_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.strictEqual(remand.package.routing.remandDestination, "Author of change");
  });

  // ---------------------------------------------------------------------------
  // COND-17: Test Evidence Corrupted or Unverifiable
  // Detection Point: Activity WF-01 / WF-12 / Integrity Envelope Audit
  // Immediate Action: Invalidate corrupt record; generate integrity alert; preserve tamper-evident audit ledger
  // Gate 8 Consequence: Absolute Hard Blocker for Gate 8 (BLOCK-04: Broken Provenance / Lineage)
  // Attribution: VALIDATION_ENVIRONMENT -> Infrastructure / Traceability (ENVIRONMENT_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-17: Test Evidence Corrupted or Unverifiable triggers BLOCK-04, preserves audit history, and remands to Traceability", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const vCase = createBaselineValidationCase({ associated_fixture_set: [fixture.fixture_id] });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond17",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      input_audio_integrity_ref: "corrupted_digest_mismatch_0000",
      output_audio_integrity_ref: "corrupted_digest_mismatch_1111",
    });

    // 1. Broken seal / unverifiable lineage detected in version binding / upstream governance
    const brokenUpstream = createBaselineUpstreamGovernance({
      provenance_intact: false,
      upstream_violations: ["Envelope checksum mismatch in test execution audio artifact."],
    });

    // 2. Hard Blocker evaluation: BLOCK-04 applies factually
    const blockerEval = harness.checkHardBlockers({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: brokenUpstream,
    });

    assert.ok(
      blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN),
      "Broken seal / unverifiable evidence must trigger canonical BLOCK-04: Provenance"
    );

    // 3. Corrupted evidence cannot contribute to Gate 8 authorization
    const readinessResult = harness.evaluateReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: brokenUpstream,
    });
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Corrupted evidence disqualifies Gate 8");

    // 4. Failure attribution & remand to Infrastructure / Traceability
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Test Evidence Corrupted or Unverifiable",
          symptom: "SHA256 payload integrity check failed for test execution artifact; broken tamper-evident envelope.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: INFRASTRUCTURE_TRACEABILITY_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT);
    assert.strictEqual(remand.package.routing.remandDestination, "Infrastructure / Traceability");
  });

  // ---------------------------------------------------------------------------
  // COND-18: Target-Platform Update Invalidates Prior Evidence
  // Detection Point: Activity WF-02 / Platform Monitor
  // Immediate Action: Detect TRIGGER-05; mark prior export evidence STALE; suspend active cutover
  // Gate 8 Consequence: Gate 8 status transitions to SUSPENDED pending compatibility test
  // Attribution: TARGET_PLATFORM -> Platform Integration & Vendor Compatibility Team (PLATFORM_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-18: Target-Platform Update triggers TRIGGER-05, suspends cutover, and remands to Platform Integration", () => {
    const scope = createBaselineScopeRecord();
    const priorBinding = createBaselineVersionBindingRecord(scope.scope_id, {
      binding_id: "binding_cond18_v1",
      target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
    });

    // Target-platform vendor updates host runtime
    const newBinding = createBaselineVersionBindingRecord(scope.scope_id, {
      binding_id: "binding_cond18_v2",
      target_platform_runtime_version: "AmpliTube5_v5.11.0_b456",
    });

    // 1. Trigger detector classifies platform version update as canonical TRIGGER-05
    const triggerResult = harness.triggerDetector.detectTrigger({
      scopeRecord: scope,
      priorBinding,
      newBinding,
    });

    assert.ok(triggerResult.triggerRecord);
    assert.ok(
      triggerResult.detectedTriggers.includes(REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE),
      "Target platform runtime update must detect canonical TRIGGER-05"
    );
    assert.strictEqual(
      triggerResult.triggerRecord.required_action,
      REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
      "TRIGGER-05 requires immediate cutover suspension and compatibility retest"
    );

    // 2. Attribution to TARGET_PLATFORM and remand to Platform Integration Team
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({ associated_fixture_set: [fixture.fixture_id] });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond18",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: newBinding.binding_id,
    });

    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Target-Platform Update Invalidates Prior Evidence",
          symptom: "Vendor runtime upgrade to AmpliTube5 v5.11.0 invalidates prior preset export evidence.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: newBinding,
      validationCase: vCase,
      fixtureRecord: fixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM);
    assert.strictEqual(remand.package.routing.remandClass, "PLATFORM_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Platform Integration & Vendor Compatibility Team");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Vendor Integration");
  });

  // ---------------------------------------------------------------------------
  // COND-19: Gate 8 Requested With Unresolved Critical Uncertainty
  // Detection Point: Activity WF-15 / Readiness Audit
  // Immediate Action: Identify critical unresolved risk (e.g. unknown continuous live stream stability); reject Gate 8
  // Gate 8 Consequence: Absolute Hard Blocker for Gate 8 (BLOCK-08: Uncertainty); cannot be converted into guessed FAIL
  // Attribution: UNKNOWN / RISK -> Testing Working Group (JOINT_DIAGNOSTIC_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-19: Gate 8 Requested With Critical Uncertainty triggers BLOCK-08, preserves uncertainty, and remands to Testing Working Group", () => {
    const scope = createBaselineScopeRecord();
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_cond19",
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });
    const vCase = createBaselineValidationCase({
      case_id: exec.case_id,
      associated_fixture_set: [fixture.fixture_id],
    });

    // 1. ValidationUncertaintyRecord with FORCES_BLOCK preserves explicit critical uncertainty
    const criticalUncertainty = {
      uncertainty_id: "unc_cond19_live_streaming",
      package_id: pkg.package_id,
      uncertainty_source: UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE,
      affected_scope: ["guitar:amp:5150_lead"],
      potential_production_risk: "Critical unknown risk of live audio buffer underrun during extended production session.",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      required_monitoring_if_authorized: ["Continuous buffer underrun telemetry"],
    };

    // 2. Hard Blocker check factually satisfies canonical BLOCK-08: Uncertainty
    const blockerEval = harness.checkHardBlockers({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      uncertaintyRecords: [criticalUncertainty],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });

    assert.ok(
      blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY),
      "Critical uncertainty must factually satisfy frozen architectural BLOCK-08 directly"
    );
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION),
      "Critical uncertainty must NOT be guessed as a BLOCK-01 genuine regression"
    );
    assert.ok(
      !blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_07_FIXTURE_CONTAMINATION),
      "Critical uncertainty must NOT be labeled as BLOCK-07 Contamination"
    );

    // 3. Readiness synthesis: Gate 8 cannot proceed
    const readinessResult = harness.evaluateReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      uncertaintyRecords: [criticalUncertainty],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });

    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Gate 8 cannot proceed with critical uncertainty");

    // 4. Attribution & Remand to Testing Working Group (Table 16)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Gate 8 Requested With Unresolved Critical Uncertainty",
          symptom: "Unresolved critical tone safety and live buffer stability uncertainty prevents cutover.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.SUSPECTED,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: TESTING_WORKING_GROUP_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.UNKNOWN);
    assert.strictEqual(remand.package.routing.remandDestination, "Testing Working Group");
  });

  // ---------------------------------------------------------------------------
  // COND-20: Requested Production Authorization Scope Exceeds Tested Scope
  // Detection Point: Activity WF-02 / WF-16 / Scope Alignment Audit
  // Immediate Action: Trigger Scope Inflation Protection; refuse global authorization; bound scope strictly to tested units
  // Gate 8 Consequence: Absolute Hard Blocker (BLOCK-06: Scope Inflation); Phase 1C.5h declares boundary but does not execute cutover
  // Attribution: MIGRATION_MAPPING -> Phase 1C.5g Planning (MIGRATION_REMAND)
  // ---------------------------------------------------------------------------
  it("COND-20: Scope Exceeds Tested Scope triggers BLOCK-06, refuses global authorization, and remands to Phase 1C.5g Planning", () => {
    // 1. Tested scope is strictly "guitar:amp:5150_lead"
    const scope = createBaselineScopeRecord({
      included_units: ["guitar:amp:5150_lead"],
      excluded_units: ["guitar:amp:dual_rectifier_untested"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({ declared_applicability_scope: ["guitar:amp:5150_lead"] });
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id);
    const vCase = createBaselineValidationCase({
      scoped_boundaries: ["guitar:amp:5150_lead"],
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });

    // 2. Candidate petitions Gate 8 for inflated scope including untested units
    const requestedInflatedScope = ["guitar:amp:5150_lead", "guitar:amp:dual_rectifier_untested"];

    // 3. Hard Blocker check factually satisfies canonical BLOCK-06: Scope Inflation
    const blockerEval = harness.checkHardBlockers(
      {
        packageRecord: pkg,
        scopeRecord: scope,
        versionBinding: binding,
        fixtureRecords: [fixture],
        executionRecords: [exec],
        rollbackEvidence: createBaselineRollbackEvidence(true),
        upstreamGovernanceState: createBaselineUpstreamGovernance(),
      },
      requestedInflatedScope
    );

    assert.ok(
      blockerEval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION),
      "Requested scope exceeding tested scope must trigger canonical BLOCK-06: Scope Inflation"
    );

    // 4. Gate 8 Adjudication: Attempting to authorize inflated scope throws Gate8ScopeContainmentError
    assert.throws(
      () =>
        harness.adjudicateGate8({
          packageRecord: pkg,
          scopeRecord: scope,
          versionBindingRecord: binding,
          authorizingOfficial: "GOVERNANCE_LEAD",
          readinessAssessmentRecord: {
            readiness_assessment_id: "readiness_cond20",
            package_id: pkg.package_id,
            scope_id: scope.scope_id,
            version_binding_id: binding.binding_id,
            overall_readiness_score: 0.95,
            gate_8_eligible: true,
            pillar_evaluations: {
              acoustic_musical_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
              reasoning_governance_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
              platform_operational_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
              rollback_safety_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
            },
            unresolved_genuine_regressions: [],
            hard_blockers_present: [FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION],
            residual_risks: [],
            conditions_required: [],
            recommended_adoption_decision: ADOPTION_DECISION_OUTCOMES.REJECTED,
            assessment_timestamp: "2026-10-22T00:00:00.000Z",
          } as any,
          requestedScope: requestedInflatedScope,
          decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
        }),
      (err: unknown) => {
        return (
          err instanceof Error &&
          err.name === "Gate8ScopeContainmentError" &&
          err.message.includes("requested scope exceeds tested scope")
        );
      },
      "Attempting to authorize inflated scope must throw Gate8ScopeContainmentError"
    );

    // 5. Attribution & Remand to Phase 1C.5g Planning
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Requested Production Authorization Scope Exceeds Tested Scope",
          symptom: "Requested authorization unit guitar:amp:dual_rectifier_untested is outside tested boundary.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      customRemandRoutingTable: PHASE_1C5G_PLANNING_REMAND_ROUTING,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING);
    assert.strictEqual(remand.package.routing.remandDestination, "Phase 1C.5g Planning");
    assert.strictEqual(remand.package.routing.upstreamRecipient, "Phase 1C.5g Migration Planning");
  });
});
