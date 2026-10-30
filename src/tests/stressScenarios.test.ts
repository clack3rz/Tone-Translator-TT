// src/tests/stressScenarios.test.ts
// Comprehensive governance-response conformance verification suite for Phase 1C.5h WP-31:
// Stage 2 Slice 2A — Architectural Stress Scenarios 01–10.
// Bound to frozen specification v0.1j Section 36 (The Twenty Architectural Stress Scenarios)
// and Implementation Plan v0.1h WP-31.
//
// GOVERNING AXIOM:
// AUTOMATED CONFORMANCE OF GOVERNANCE RESPONSE != FABRICATED EMPIRICAL VALIDATION RESULT.
// All scenario acoustic values, reviewer outcomes, runtime conditions, and comparative results
// are synthetic premises used exclusively to verify governance response without claiming actual
// empirical listening, platform execution, or UAT occurred.

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
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_EFFECTS,
  GOVERNANCE_STATUSES,
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
  CandidateLessonHandoffGateway,
  type CandidateLessonEvidencePackage,
  type CandidateLessonQuarantineReceipt,
  type CandidateLessonQuarantineSink,
  type FormulateCandidateLessonInput,
} from "../sound-engineer/validation/lessons";
import {
  type AdoptionDecisionRecord,
  type RetestPlanRecord,
  type RevalidationTriggerRecord,
  type UATEvaluationRecord,
  type ValidationUncertaintyRecord,
} from "../sound-engineer/validation/schemas/records";
import { RetestPlanner } from "../sound-engineer/validation/retest";
import {
  Gate8StateMachine,
  ReadjudicationRequiredError,
} from "../sound-engineer/validation/gate8";
import { isApplicableForCurrentBinding } from "../sound-engineer/validation/outcome";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../sound-engineer/validation/binding";
import {
  type CanaryPauseSignal,
  type OperationalRollbackSignal,
  type OperationalSignalAck,
  type OperationalSignalPort,
} from "../sound-engineer/validation/telemetry/operationalSignalPort";
import {
  ArchitecturalVerificationHarness,
  PHASE_1C5G_COEXISTENCE_REMAND_ROUTING,
  PHASE_1C5G_PLANNING_REMAND_ROUTING,
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

const CANONICAL_OFFICIAL = "Chief Sound Engineering Governance Authority";
const CANONICAL_OFFICIAL_KEY = "sec_key_chief_governance_2026_q4_phase1c5h";

function createBaselineAdoptionDecision(
  packageRecord: any,
  readinessRecord: any,
  scopeRecord: any,
  versionBinding: any,
  overrides?: Partial<AdoptionDecisionRecord>
): AdoptionDecisionRecord {
  return Object.freeze({
    decision_id: `adr_${packageRecord.package_id}_active`,
    package_id: packageRecord.package_id,
    readiness_assessment_id: readinessRecord.readiness_id ?? "pra_baseline",
    requested_scope: [...scopeRecord.included_units],
    authorized_scope: [...scopeRecord.included_units],
    version_binding_integrity_ref: versionBinding.version_integrity_reference.composite_digest,
    decision_outcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
    decision_timestamp: "2026-03-20T12:00:00.000Z",
    conditions_and_restrictions: [],
    mandatory_monitoring_rules: ["MONITOR-THD-REALTIME"],
    rollback_verification_cert_ref: "cert_rollback_verified_load_test_01",
    governance_status: GOVERNANCE_STATUSES.ACTIVE,
    authorizing_official: CANONICAL_OFFICIAL,
    record_integrity_metadata: {
      integrity_digest: "sha256:digest_placeholder_adr",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T12:00:00.000Z",
      signer_identity: CANONICAL_OFFICIAL,
      canonical_serialization_format: "RFC-8785",
    },
    ...overrides,
  });
}

/**
 * Test-only mock quarantine sink for Scenario 07 candidate lesson isolation verification.
 */
class TestQuarantineSink implements CandidateLessonQuarantineSink {
  public readonly quarantinedPackages: CandidateLessonEvidencePackage[] = [];

  async quarantineLesson(
    lessonPackage: CandidateLessonEvidencePackage
  ): Promise<CandidateLessonQuarantineReceipt> {
    this.quarantinedPackages.push(lessonPackage);
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

describe("Phase 1C.5h WP-31 — Stage 2: Stress Scenarios 01–20", () => {
  const harness = new ArchitecturalVerificationHarness();

  // ---------------------------------------------------------------------------
  // Scenario 01: Architecture Passes Structural Checks but Sounds Worse
  // Context: A migrated high-gain rhythm candidate passes structural schema validation
  //          and parameter bound checks, but listening evaluations report that the tone
  //          is thin, harsh, and deficient in body compared to legacy baseline.
  // Profiles: PROFILE-01 (Structural/Schema), PROFILE-04 (Objective Acoustic), PROFILE-06 (Perceptual Listening).
  // Evidence: Objective (Schema) PASS; Perceptual (Listening) FAIL; EvidenceConflictRecord created.
  // Attribution: REASONING -> Upstream Reasoning Governance (Phases 1C.5a–e).
  // Outcome: FAIL (Invariant 1 & Invariant 7: structural compliance cannot override acoustic failure / Empirical Primacy).
  // Gate 8: Denied / blocked pending resolution of acoustic defects.
  // ---------------------------------------------------------------------------
  it("Scenario 01: Architecture Passes Structural Checks but Sounds Worse", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen01",
      included_units: ["guitar:amp:5150_lead_rhythm"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:5150_lead_rhythm"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen01",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen01",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Structural/Schema syntax and parameter bounds checks PASS
    const objectiveStructuralEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen01_structural",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.PARAMETER_BOUNDS,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    });

    // 2. Perceptual listening evaluations report thin, harsh tone deficient in warmth
    const perceptualAcousticEvidence = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen01_listening",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations:
        "Tone is thin, harsh, and deficient in body and low-frequency warmth compared to legacy baseline.",
      perceptual_dimensions_evaluated: {
        tonal_balance: 3.2,
        warmth: 2.8,
        harshness: 8.5,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen01",
      assigned_test_profiles: [
        "PROFILE-01_STRUCTURAL_SCHEMA",
        "PROFILE-04_OBJECTIVE_ACOUSTIC",
        "PROFILE-06_PERCEPTUAL_LISTENING",
      ],
      execution_record_refs: [exec.execution_id],
      evidence_refs: [
        objectiveStructuralEvidence.objective_evidence_id,
        perceptualAcousticEvidence.perceptual_evidence_id,
      ],
    });

    // 3. Evidence Conflict Detection: Structural pass vs Perceptual fail is detected and preserved
    const conflictResult = harness.detectConflict({
      packageRecord: pkg,
      objectiveEvidence: objectiveStructuralEvidence,
      perceptualEvidence: perceptualAcousticEvidence,
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
    });
    assert.strictEqual(conflictResult.hasConflict, true, "Disagreement between structural pass and perceptual listening fail must be detected");
    assert.ok(conflictResult.record, "EvidenceConflictRecord must be generated");
    assert.strictEqual(conflictResult.record.conflict_type, CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL);

    // 4. Failure Attribution & Remand: REASONING -> Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Architecture Passes Structural Checks but Sounds Worse",
          symptom: "Upstream reasoning generated prompt requirements that over-attenuated low-frequency warmth, causing harsh rhythm tone.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: objectiveStructuralEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandClass, "REASONING_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)");

    // 5. Outcome Synthesis: Invariant 1 and Invariant 7 govern — structural compliance cannot override acoustic failure (Empirical Primacy)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec],
      objectiveEvidence: [objectiveStructuralEvidence],
      perceptualEvidence: [perceptualAcousticEvidence],
      conflictRecords: [conflictResult.record],
      failureRecords: [attribution.record],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL, "Structural pass cannot override perceptual acoustic failure");

    // 6. Gate 8 Consequence: Cutover blocked pending resolution of acoustic defects
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      objectiveEvidence: [objectiveStructuralEvidence],
      perceptualEvaluations: [perceptualAcousticEvidence],
      evidenceConflicts: [conflictResult.record],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Acoustic failure must disqualify Gate 8 cutover");

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
    });

    assert.strictEqual(gate8Result.isAuthorized, false, "Gate 8 cannot progress on acoustic failure");
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(gate8Result.authorizesScopeEdge, undefined, "Rejected cutover must not attach AUTHORIZES_SCOPE edge");
  });

  // ---------------------------------------------------------------------------
  // Scenario 02: Candidate Sounds Better than Legacy but Differs Significantly
  // Context: A candidate lead preset diverges significantly in spectral response from legacy
  //          PATH-PROD, but listening evaluations judge the candidate to be acoustically superior,
  //          finding that legacy suffered from harsh resonance.
  // Profiles: PROFILE-04 (Objective Acoustic), PROFILE-06 (Perceptual Listening), PROFILE-09 (Regression Profile).
  // Evidence: Objective differential detected; Perceptual confirms warmth & absence of fatigue;
  //           RegressionAssessmentRecord classifies divergence as INTENTIONAL_ARCHITECTURAL_CORRECTION.
  // Attribution: None (improves upon legacy baseline).
  // Outcome: PASS for evaluated scope (Invariant 5 & Axiom 2: legacy is not truth; intentional correction is not regression).
  // Gate 8: Permitted for tested scope if all other gates and readiness criteria are satisfied.
  // ---------------------------------------------------------------------------
  it("Scenario 02: Candidate Sounds Better than Legacy but Differs Significantly", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen02",
      included_units: ["guitar:amp:lead_preset_mk2"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      fixture_class: FIXTURE_CLASSES.REFERENCE_TONE,
      declared_applicability_scope: ["guitar:amp:lead_preset_mk2"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen02",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen02",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:04_objective_acoustic",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen02_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Objective Evidence: Candidate diverges from legacy baseline by 5.2 dB (material divergence)
    const candidateObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen02_cand",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_delta: 0.8, // Closer to Golden reference than legacy
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });

    const legacyObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen02_legacy",
      execution_id: "exec_legacy_02",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_delta: 6.0, // Legacy had harsh resonance peak deviating from Golden benchmark
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    // 2. Perceptual Listening: Expert panel confirms candidate is superior, free from fatigue
    const candidatePerceptual = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen02_cand",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations:
        "Candidate is acoustically superior: eliminates harsh 3.2 kHz cabinet resonance present in legacy PATH-PROD; smooth top end.",
      perceptual_dimensions_evaluated: {
        warmth: 9.4,
        tonal_balance: 9.2,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen02",
      assigned_test_profiles: ["profile:04_objective_acoustic", "profile:03_target_platform_export"],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [candidateObjective.objective_evidence_id, candidatePerceptual.perceptual_evidence_id],
    });

    // 3. Differential Auditing: Governed classification identifies INTENTIONAL_CORRECTION
    const auditResult = harness.differentialAuditor.auditRegression({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      candidateData: {
        execution: exec,
        objectiveEvidence: [candidateObjective],
        perceptualEvidence: [candidatePerceptual],
      },
      legacyOutput: {
        outputId: "legacy_path_prod_lead_02",
        objectiveEvidence: [legacyObjective],
      },
      goldenReference: {
        fixtureRecord: fixture,
      },
      materialityProfileRef: "tolerance_spec_ref:regression_tolerance_profile",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      intentionalCorrectionIntent: {
        intentId: "intent_scen02_resonance_fix",
        rationale: "Deliberate excision of harsh 3.2 kHz cabinet resonance present in legacy PATH-PROD.",
        approvedChangeRef: "RFC-2026-LEAD-RESONANCE-FIX",
        isAuthorized: true,
      },
    });

    assert.strictEqual(
      auditResult.record.classification,
      REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      "Significant divergence with authorized correction must classify as INTENTIONAL_CORRECTION"
    );
    assert.strictEqual(auditResult.record.blocks_gate_8, false, "Intentional correction must not block Gate 8");

    // 4. Outcome Synthesis: PASS for evaluated scope (Axiom 2: legacy is comparator, not truth)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [candidateObjective],
      perceptualEvidence: [candidatePerceptual],
      regressionAssessments: [auditResult.record],
      rollbackOperationalityVerified: true,
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
    assert.strictEqual(outcomeResult.outcomeRecord.evaluated_scope, scope.scope_id);

    // 5. Gate 8 Consequence: Favorable evidence alone does not auto-authorize; Gate 8 requires all pillars satisfied
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [candidateObjective],
      perceptualEvaluations: [candidatePerceptual],
      regressionAssessments: [auditResult.record],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, true, "Candidate with verified intentional correction and satisfied pillars is eligible for Gate 8");

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });

    assert.strictEqual(gate8Result.isAuthorized, true);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.AUTHORIZED);
    assert.deepStrictEqual(gate8Result.authorizedScope, ["guitar:amp:lead_preset_mk2"]);
    assert.ok(gate8Result.authorizesScopeEdge, "Authorized decision attaches AUTHORIZES_SCOPE edge");
  });

  // ---------------------------------------------------------------------------
  // Scenario 03: Export Fails Despite Good Acoustic Reasoning
  // Context: Cognitive sound engineering reasoning across Stages 01–11 establishes
  //          platform-neutral engineering decision and prediction. Stage 12 translates
  //          semantic design into target-platform parameters, but emitted parameter ID
  //          is invalid, causing the serialized preset to fail to load.
  // Profiles: PROFILE-03 (Target-Platform Export Profile).
  // Evidence: Objective (Export) FAIL; ValidationFailureRecord generated.
  // Hard Blocker: Canonical BLOCK-02 (Target-platform export/load failure).
  // Attribution: PLATFORM_TRANSLATION -> Stage 12 Platform Translation Governance.
  // Outcome: FAIL (Invariant 1: reasoning elegance cannot excuse platform export failure).
  // Gate 8: Denied / blocked pending verified platform translation fix.
  // ---------------------------------------------------------------------------
  it("Scenario 03: Export Fails Despite Good Acoustic Reasoning", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen03",
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord();
    const vCase = createBaselineValidationCase({
      case_id: "case_scen03_export",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen03",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "PROFILE-03_TARGET_PLATFORM_EXPORT",
      outcome: EXECUTION_OUTCOMES.FAILED,
      anomalies_detected: ["PLATFORM_LOAD_REJECTION: Invalid parameter ID 'amp_ch3_bright_bias' in AT5 preset XML"],
    });

    // 1. Target platform load fails: failed objective export evidence
    const failedExportEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen03_export_fail",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.PARAMETER_BOUNDS,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen03",
      assigned_test_profiles: ["PROFILE-03_TARGET_PLATFORM_EXPORT"],
      execution_record_refs: [exec.execution_id],
      evidence_refs: [failedExportEvidence.objective_evidence_id],
    });

    // 2. Failure Attribution & Remand: PLATFORM_TRANSLATION -> Stage 12 Platform Translation Governance
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Export Fails Despite Good Acoustic Reasoning",
          symptom: "Stage 12 emitted invalid target-platform parameter identifier 'amp_ch3_bright_bias', causing AmpliTube 5 XML load crash.",
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

    // 3. Canonical Hard Blocker: BLOCK-02 (Target-platform load failure)
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      objectiveEvidence: [failedExportEvidence],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION),
      "Export load crash must trigger canonical Hard Blocker BLOCK-02"
    );

    // 4. Outcome Synthesis & Gate 8 Consequence: FAIL, Invariant 1 governs (Reasoning elegance cannot excuse export failure)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      targetPlatformExportVerified: false,
      objectiveEvidence: [failedExportEvidence],
      failureRecords: [attribution.record],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.ok(
      outcomeResult.unresolvedIssues.some((f) => f.includes(GOVERNED_HARD_BLOCKERS.BLOCK_02_EXPORT_CRASH)),
      "Unresolved issues must explicitly report BLOCK-02 target-platform export crash"
    );

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "BLOCK-02 must disqualify Gate 8 eligibility");
  });

  // ---------------------------------------------------------------------------
  // Scenario 04: Spectra Similar but Perceptually Different
  // Context: Candidate and legacy clean presets produce closely aligned spectral magnitude
  //          curves, but performing guitarists report that the candidate feels stiff and
  //          dynamic response is compressed under pick attack.
  // Profiles: PROFILE-04 (Objective Acoustic), PROFILE-05 (Dynamic Response), PROFILE-07 (Playability).
  // Evidence: Spectral match PASS; Dynamic touch sensitivity FAIL; EvidenceConflictRecord created.
  // Attribution: REASONING -> Upstream Reasoning (Phase 1C.5d).
  // Outcome: FAIL (Invariant 2: multi-dimensional evidence distinct; scalar/spectral similarity cannot mask dynamic envelope failure).
  // Gate 8: Blocked and remanded to upstream reasoning pending dynamic resolution.
  // ---------------------------------------------------------------------------
  it("Scenario 04: Spectra Similar but Perceptually Different", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen04",
      included_units: ["guitar:amp:clean_twin_reverb"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:clean_twin_reverb"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen04",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen04",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Objective spectral analysis matches closely (delta: 0.15 dB)
    const spectralMatchEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen04_spectral",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_delta: 0.15,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });

    // 2. Dynamic response / playability evaluation fails: stiff, compressed touch insensitivity
    const playabilityPerceptualEvidence = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen04_playability",
      execution_id: exec.execution_id,
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.SESSION_GUITARIST,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations:
        "Guitarist reports candidate feels stiff, touch-insensitive, and dynamic response is excessively compressed under heavy pick attack.",
      perceptual_dimensions_evaluated: {
        tonal_balance: 8.5,
        dynamic_response: 3.1,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen04",
      assigned_test_profiles: [
        "PROFILE-04_OBJECTIVE_ACOUSTIC",
        "PROFILE-05_DYNAMIC_RESPONSE",
        "PROFILE-07_PLAYABILITY",
      ],
      execution_record_refs: [exec.execution_id],
      evidence_refs: [
        spectralMatchEvidence.objective_evidence_id,
        playabilityPerceptualEvidence.perceptual_evidence_id,
      ],
    });

    // 3. Multidimensional evidence preserved: no scalar averaging erases dynamic failure
    const conflictResult = harness.detectConflict({
      packageRecord: pkg,
      objectiveEvidence: spectralMatchEvidence,
      perceptualEvidence: playabilityPerceptualEvidence,
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
    });
    assert.strictEqual(conflictResult.hasConflict, true, "Conflict between spectral match and dynamic playability failure must be detected");
    assert.ok(conflictResult.record);

    // 4. Failure Attribution: REASONING (Stage 11 committed to excessively compressed response)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Spectra Similar but Perceptually Different",
          symptom: "Upstream reasoning committed to an excessively compressed response that degraded pick attack dynamic feel despite spectral match.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: spectralMatchEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandClass, "REASONING_REMAND");

    // 5. Outcome & Gate 8 Consequence: FAIL (Invariant 2: spectral match cannot mask dynamic envelope failure)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec],
      objectiveEvidence: [spectralMatchEvidence],
      perceptualEvidence: [playabilityPerceptualEvidence],
      conflictRecords: [conflictResult.record],
      failureRecords: [attribution.record],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);

    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      objectiveEvidence: [spectralMatchEvidence],
      perceptualEvaluations: [playabilityPerceptualEvidence],
      evidenceConflicts: [conflictResult.record],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Dynamic playability failure must disqualify Gate 8");
  });

  // ---------------------------------------------------------------------------
  // Scenario 05: Reference Mismatch Caused by Player / Performance
  // Context: A candidate blues tone fails an objective match against an approved commercial
  //          reference stem. Forensic investigation reveals the fixture DI stem was captured
  //          with mismatched pickup types and dynamic playing technique relative to reference stem.
  // Profiles: PROFILE-04 (Objective Acoustic), PROFILE-06 (Perceptual Listening).
  // Evidence: Objective match fails; forensic notes prove pickup impedance & playing mismatch.
  // Attribution: TEST_FIXTURE -> Golden Fixture Curation Team.
  // Outcome: BLOCKED_NOT_EVALUABLE / BLOCKED (candidate is not blamed for invalid fixture).
  // Gate 8: Held in BLOCKED state pending calibrated fixture matching declared instrument scope.
  // ---------------------------------------------------------------------------
  it("Scenario 05: Reference Mismatch Caused by Player / Performance", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen05",
      included_units: ["guitar:amp:blues_deluxe"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);

    // Inappropriate fixture: captured with high-output ceramic humbucker instead of vintage single coil
    const mismatchedFixture = createBaselineFixtureRecord({
      fixture_id: "fix_scen05_mismatched_di",
      fixture_name: "Hot Ceramic Humbucker DI (Mismatched for Vintage Blues Spec)",
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen05",
      associated_fixture_set: [mismatchedFixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen05",
      case_id: vCase.case_id,
      fixture_id: mismatchedFixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.ABORTED,
    });

    const failedObjectiveEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen05_failed_match",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_delta: 4.8,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen05",
      execution_record_refs: [exec.execution_id],
      evidence_refs: [failedObjectiveEvidence.objective_evidence_id],
    });

    // 1. Forensic Failure Attribution: TEST_FIXTURE (inappropriate fixture applied to validation case)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Reference Mismatch Caused by Player / Performance",
          symptom: "Forensic analysis revealed fixture DI stem was captured with high-output ceramic pickups and aggressive technique, conflicting with vintage single-coil blues reference.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: mismatchedFixture,
      objectiveEvidenceRecord: failedObjectiveEvidence,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");

    // 2. Candidate is NOT falsely blamed: does NOT assert BLOCK-01 genuine regression
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [mismatchedFixture],
      executionRecords: [exec],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      !blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION),
      "Candidate must not be falsely blamed with BLOCK-01 for fixture mismatch"
    );

    // 3. Outcome Synthesis: BLOCKED (Candidate is not blamed for invalid comparative evidence)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      fixturesVerified: false,
      failureRecords: [attribution.record],
    });

    assert.strictEqual(
      outcomeResult.outcomeRecord.outcome_class,
      VALIDATION_OUTCOME_CLASSES.BLOCKED,
      "Validation outcome must be BLOCKED when fixture is invalid/mismatched"
    );

    // 4. Gate 8 Consequence: Suspends evaluation / holds Gate 8 in BLOCKED state
    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Fixture mismatch must disqualify Gate 8");

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
    });

    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.BLOCKED);
    assert.strictEqual(gate8Result.isAuthorized, false);
  });

  // ---------------------------------------------------------------------------
  // Scenario 06: High-Gain Passes but Clean Fails
  // Context: A migration handoff package covering an amplifier family passes all objective
  //          and perceptual tests on high-gain channels, but clean channel heuristics exhibit
  //          crossover distortion.
  // Profiles: Full test battery across clean and high-gain cases.
  // Evidence: High-gain produces PASS; clean produces FAIL with ValidationFailureRecord.
  // Attribution: MIGRATION_MAPPING (clean bias parameter remapping defect).
  // Outcome: CONDITIONAL (Clean blocked; High-Gain passed).
  // Gate 8: Restricts Gate 8 consideration strictly to partitioned high-gain scope.
  //         BLOCK-06 applies only if authorization is requested beyond tested passing subset.
  // ---------------------------------------------------------------------------
  it("Scenario 06: High-Gain Passes but Clean Fails", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen06",
      included_units: ["guitar:amp:amp_family_high_gain", "guitar:amp:amp_family_clean"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:amp_family_high_gain", "guitar:amp:amp_family_clean"],
    });

    // 1. High-Gain Channel Case: PASSES all tests
    const vCaseHighGain = createBaselineValidationCase({
      case_id: "case_scen06_high_gain",
      scoped_boundaries: ["guitar:amp:amp_family_high_gain"],
    });
    const execHighGain = createBaselineExecutionRecord({
      execution_id: "exec_scen06_high_gain",
      case_id: vCaseHighGain.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const objHighGain = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen06_hg",
      execution_id: execHighGain.execution_id,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    });
    const percHighGain = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen06_hg",
      execution_id: execHighGain.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });

    // 2. Clean Channel Case: FAILS due to crossover distortion
    const vCaseClean = createBaselineValidationCase({
      case_id: "case_scen06_clean",
      scoped_boundaries: ["guitar:amp:amp_family_clean"],
    });
    const execClean = createBaselineExecutionRecord({
      execution_id: "exec_scen06_clean",
      case_id: vCaseClean.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
      anomalies_detected: ["CROSSOVER_DISTORTION: Severe crossover notch distortion in clean channel output stage"],
    });
    const objClean = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen06_clean_fail",
      execution_id: execClean.execution_id,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen06",
      execution_record_refs: [execHighGain.execution_id, execClean.execution_id],
      evidence_refs: [
        objHighGain.objective_evidence_id,
        percHighGain.perceptual_evidence_id,
        objClean.objective_evidence_id,
      ],
    });

    // Failure attribution for clean channel failure: MIGRATION_MAPPING
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: execClean,
        scopeRecord: scope,
        symptomDetails: {
          title: "Clean Channel Crossover Distortion",
          symptom: "Migration heuristic table mapped output bias trim incorrectly, causing crossover notch distortion on clean channel.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
        affectedScope: ["guitar:amp:amp_family_clean"],
      },
      versionBinding: binding,
      validationCase: vCaseClean,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: objClean,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING);
    assert.strictEqual(remand.package.routing.remandClass, "MIGRATION_REMAND");

    // 3. Outcome Synthesis: Clean failed -> candidate package outcome is FAIL
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [execHighGain, execClean],
      objectiveEvidence: [objHighGain, objClean],
      perceptualEvidence: [percHighGain],
      failureRecords: [attribution.record],
      customConditions: ["Clean channel excluded from cutover pending bias remap revalidation."],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);

    // 4. Scoped/Conditional Partitioning: Gate 8 consideration restricted strictly to tested passing subset
    const partitionedScope = createBaselineScopeRecord({
      scope_id: "scope_scen06_partitioned_hg",
      included_units: ["guitar:amp:amp_family_high_gain"],
      excluded_units: ["guitar:amp:amp_family_clean"],
    });
    const partitionedBinding = createBaselineVersionBindingRecord(partitionedScope.scope_id);
    const execHighGainPartitioned = createBaselineExecutionRecord({
      execution_id: "exec_scen06_high_gain_part",
      case_id: vCaseHighGain.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: partitionedBinding.binding_id,
      profile_id: "profile:03_export_and_04_acoustic",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const objHighGainPartitioned = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen06_hg_part",
      execution_id: execHighGainPartitioned.execution_id,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    });
    const percHighGainPartitioned = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen06_hg_part",
      execution_id: execHighGainPartitioned.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });

    const partitionedPkg = createBaselinePackageRecord(partitionedScope.scope_id, partitionedBinding.binding_id, {
      package_id: "pkg_scen06_hg_only",
      assigned_test_profiles: ["profile:03_export_and_04_acoustic"],
      execution_record_refs: [execHighGainPartitioned.execution_id],
      evidence_refs: [objHighGainPartitioned.objective_evidence_id, percHighGainPartitioned.perceptual_evidence_id],
    });

    const partitionedReadinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: partitionedPkg,
      scopeRecord: partitionedScope,
      versionBinding: partitionedBinding,
      fixtureRecords: [fixture],
      executionRecords: [execHighGainPartitioned],
      objectiveEvidence: [objHighGainPartitioned],
      perceptualEvaluations: [percHighGainPartitioned],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: partitionedBinding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    // If requested scope is strictly the passing high-gain channel: no BLOCK-06
    const blockerCheckPassing = harness.checkHardBlockers(partitionedReadinessInput, ["guitar:amp:amp_family_high_gain"]);
    assert.ok(
      !blockerCheckPassing.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION),
      "Requested scope matching tested passing scope must NOT trigger BLOCK-06"
    );

    // If authorization is requested beyond tested passing scope (attempting to include failed clean channel): BLOCK-06 triggers
    const blockerCheckInflated = harness.checkHardBlockers(partitionedReadinessInput, [
      "guitar:amp:amp_family_high_gain",
      "guitar:amp:amp_family_clean",
    ]);
    assert.ok(
      blockerCheckInflated.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION),
      "Requesting authorization beyond tested passing scope must trigger BLOCK-06: Scope Inflation"
    );

    // Gate 8 authorizes strictly the partitioned passing scope
    const partitionedReadiness = harness.evaluateReadiness(partitionedReadinessInput);
    assert.strictEqual(partitionedReadiness.assessmentRecord.gate_8_eligible, true);

    const gate8Result = harness.adjudicateGate8({
      packageRecord: partitionedPkg,
      readinessAssessmentRecord: partitionedReadiness.assessmentRecord,
      scopeRecord: partitionedScope,
      versionBindingRecord: partitionedBinding,
      requestedScope: ["guitar:amp:amp_family_high_gain"],
      proposedAuthorizedScope: ["guitar:amp:amp_family_high_gain"],
      authorizingOfficial: "Lead Acoustic Architect",
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });

    assert.strictEqual(gate8Result.isAuthorized, true);
    assert.deepStrictEqual(gate8Result.authorizedScope, ["guitar:amp:amp_family_high_gain"]);
  });

  // ---------------------------------------------------------------------------
  // Scenario 07: Reviewers Disagree
  // Context: A candidate modern metal rhythm tone is evaluated by an expert listening panel,
  //          resulting in split assessments regarding whether the mid-frequency scoop is
  //          aesthetically appropriate or excessive for dense mixes.
  // Profiles: PROFILE-06 (Perceptual Listening), PROFILE-08 (Mix Context).
  // Evidence: Split perceptual evaluations; EvidenceConflictRecord created; ValidationUncertaintyRecord logged.
  // Governance: Score averaging is strictly prohibited (Axiom 4).
  // Candidate Lesson Boundary: Remanded into Phase 1C.5e/f quarantine; promotion does not occur automatically.
  // Gate 8: Full authorization blocked; routes to conditional follow-up.
  // ---------------------------------------------------------------------------
  it("Scenario 07: Reviewers Disagree", async () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen07",
      included_units: ["guitar:amp:modern_metal_lead"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:modern_metal_lead"],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen07",
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
    });

    // 1. Evaluator 1 (Metal Producer): PASSES mid scoop as articulate for heavy chugging
    const reviewerAPass = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen07_revA",
      execution_id: exec.execution_id,
      evaluator_id: "eval_metal_producer_01",
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      qualitative_observations: "Aggressive modern scoop; punchy transients and tight palm mutes.",
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      perceptual_dimensions_evaluated: {
        tonal_balance: 9.0,
        warmth: 8.8,
      },
    });

    // 2. Evaluator 2 (Mix/Mastering Engineer): FAILS mid scoop as hollow around 800Hz in dense mix
    const reviewerBFail = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen07_revB",
      execution_id: exec.execution_id,
      evaluator_id: "eval_master_eng_02",
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      qualitative_observations: "Mid scoop is excessive around 800Hz; rhythm guitars will be lost in dense multitrack mix.",
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      perceptual_dimensions_evaluated: {
        tonal_balance: 4.2,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen07",
      execution_record_refs: [exec.execution_id],
      evidence_refs: [reviewerAPass.perceptual_evidence_id, reviewerBFail.perceptual_evidence_id],
    });

    // 3. Prohibit Score Averaging: Axiom 4 forbids mathematical averaging of divergent scores
    assert.throws(
      () => harness.conflictDetector.assertNoScalarSmoothing(9.0, 4.2),
      (err: unknown) => {
        return (
          err instanceof Error &&
          err.name === "ScalarSmoothingForbiddenError" &&
          err.message.includes("Axiom 4")
        );
      },
      "Mathematical averaging of split reviewer evaluations must throw ScalarSmoothingForbiddenError"
    );

    // 4. Preserve Disagreement in EvidenceConflictRecord (Record 15)
    const conflictResult = harness.conflictDetector.recordDisagreement({
      packageRecord: pkg,
      conflictType: CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
      competingEvidenceRefs: [reviewerAPass.perceptual_evidence_id, reviewerBFail.perceptual_evidence_id],
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
      conflictDescription: "Split expert listening evaluation: Metal Producer accepted modern mid scoop while Mastering Engineer rejected mix presence loss around 800Hz.",
      underlyingAcousticPhenomenon: "Acoustic aesthetic trade-off between modern aggressive scoop and dense mix presence.",
      customResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
    });

    assert.strictEqual(conflictResult.hasConflict, true);
    assert.strictEqual(conflictResult.record?.conflict_type, CONFLICT_TYPES.EVALUATOR_DISAGREEMENT);
    assert.strictEqual(conflictResult.record?.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);

    // 5. ValidationUncertaintyRecord preserves demographic aesthetic variance
    const uncertaintyRecord = {
      uncertainty_id: "unc_scen07_reviewer_split",
      package_id: pkg.package_id,
      uncertainty_source: UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE,
      affected_scope: [...scope.included_units],
      potential_production_risk: "Aesthetic variance across listener demographics and mix contexts; potential guitar obscurity in dense mixes.",
      required_monitoring_if_authorized: ["Multi-genre mix context telemetry"],
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
    };

    // 6. Candidate Lesson Boundary: Formulate package and quarantine; no automatic promotion
    const quarantineSink = new TestQuarantineSink();
    const lessonGateway = new CandidateLessonHandoffGateway({ quarantineSink });

    const formulateInput: FormulateCandidateLessonInput = {
      proposedInsight:
        "Excessive mid-scooping at 800Hz on high-gain rhythm tracks causes mix obscurity in multitrack contexts with dense cymbals and bass.",
      supportingEvidence: [reviewerBFail],
      scope,
      uncertainty: uncertaintyRecord,
      execution: exec,
      versionBinding: binding,
    };

    const lessonResult = await lessonGateway.formulateAndQuarantine(formulateInput);
    assert.strictEqual(lessonResult.receipt.status, "QUARANTINED", "Candidate lesson must be sealed in quarantine");
    assert.strictEqual(quarantineSink.quarantinedPackages.length, 1);
    assert.strictEqual(
      lessonResult.package.supportingEvidence[0].evidenceId,
      reviewerBFail.perceptual_evidence_id
    );

    // 7. Outcome Synthesis: CONDITIONAL / requires follow-up, full PASS forbidden
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec],
      perceptualEvidence: [reviewerAPass, reviewerBFail],
      conflictRecords: [conflictResult.record!],
      uncertaintyRecords: [uncertaintyRecord],
    });

    assert.notStrictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS, "Reviewer disagreement must forbid unqualified PASS");

    // 8. Gate 8 Consequence: Full unconditional cutover is blocked
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      perceptualEvaluations: [reviewerAPass, reviewerBFail],
      evidenceConflicts: [conflictResult.record!],
      uncertaintyRecords: [uncertaintyRecord],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Unresolved reviewer disagreement blocks unqualified Gate 8 cutover");
  });

  // ---------------------------------------------------------------------------
  // Scenario 08: Metrics Disagree with Listening
  // Context: Objective harmonic analysis shows harmonic distortion exceeding nominal
  //          clean-profile thresholds on an edge-of-breakup blues preset, but listening
  //          panels enthusiastically praise the musical warmth and touch sensitivity.
  // Profiles: PROFILE-04 (Objective Acoustic), PROFILE-06 (Perceptual Listening), PROFILE-07 (Playability).
  // Evidence: Objective distortion threshold breach; harmonic order is predominantly even-order;
  //           Perceptual reports passing musicality; EvidenceConflictRecord created.
  // Attribution: None (intentional musical trade-off).
  // Outcome: Routes to governed review to determine intentional trade-off vs tolerance profile review.
  // Gate 8: Permitted only if governed review establishes intentional musicality without unresolved regression.
  // ---------------------------------------------------------------------------
  it("Scenario 08: Metrics Disagree with Listening", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen08",
      included_units: ["guitar:amp:edge_of_breakup_blues"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:edge_of_breakup_blues"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen08",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen08",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:04_objective_acoustic",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen08_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Objective evidence: Linear metric threshold breach (THD: 3.2 dB over clean baseline)
    const objectiveDistortionEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen08_thd",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
      measured_delta: 3.2,
      measured_parameters: {
        even_order_harmonic_ratio: 0.88, // 88% even-order harmonic content (tube warmth)
        odd_order_harmonic_ratio: 0.12,
      },
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    // 2. Perceptual evidence: Listening panel praises musical warmth, responsiveness, and touch sensitivity
    const perceptualWarmthEvidence = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen08_listening",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations:
        "Exceptional dynamic touch sensitivity and musical warmth; predominantly even-order saturation delivers classic blues response.",
      perceptual_dimensions_evaluated: {
        warmth: 9.6,
        tonal_balance: 9.2,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen08",
      assigned_test_profiles: ["profile:04_objective_acoustic", "profile:03_target_platform_export"],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [
        objectiveDistortionEvidence.objective_evidence_id,
        perceptualWarmthEvidence.perceptual_evidence_id,
      ],
    });

    // 3. Evidence Conflict Detection: Type B conflict (Perceptual PASS / Objective FAIL)
    const conflictResult = harness.detectConflict({
      packageRecord: pkg,
      objectiveEvidence: objectiveDistortionEvidence,
      perceptualEvidence: perceptualWarmthEvidence,
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
      customUnderlyingAcousticPhenomenon:
        "Harmonic/non-linear coloration deemed musically pleasant and responsive by listener but flagged as distortion anomaly by linear metric bounds.",
    });

    assert.strictEqual(conflictResult.hasConflict, true, "Type B conflict between metric breach and perceptual pass must be detected");
    assert.ok(conflictResult.record);
    assert.strictEqual(conflictResult.record.conflict_type, CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL);
    assert.ok(
      conflictResult.record.underlying_acoustic_phenomenon?.toLowerCase().includes("harmonic") ||
      conflictResult.record.underlying_acoustic_phenomenon?.toLowerCase().includes("coloration"),
      "Must identify harmonic coloration phenomenon"
    );

    // 4. Governed Review: Preserved disagreement; no speculative failure attribution assigned
    // Governed tolerance review confirms even-order harmonic distortion is an intentional musical trade-off
    const resolvedConflictRecord = {
      ...conflictResult.record!,
      resolution_status: CONFLICT_RESOLUTION_STATUSES.ACCEPTED_TRADE_OFF,
      resolution_strategy: CONFLICT_RESOLUTION_STRATEGIES.DECLARED_INTENTIONAL_CORRECTION,
    };

    const intentionalRegressionRecord = {
      regression_id: "reg_scen08_intentional_breakup",
      package_id: pkg.package_id,
      comparison_target: `tripartite:legacy_blues__${fixture.fixture_id}`,
      divergence_detected: true,
      divergence_magnitude: 3.2,
      classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      materiality_score: MATERIALITY_SCORES.LOW,
      affected_scope: [...scope.included_units],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "Governed review confirmed even-order harmonic saturation constitutes intentional musical warmth under edge-of-breakup profile.",
      blocks_gate_8: false,
    };

    // 5. Outcome Synthesis under Governed Intentional Trade-off
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveDistortionEvidence],
      perceptualEvidence: [perceptualWarmthEvidence],
      conflictRecords: [resolvedConflictRecord],
      regressionAssessments: [intentionalRegressionRecord],
      rollbackOperationalityVerified: true,
    });

    // Conflict resolved as accepted musical trade-off; candidate proceeds under governed review
    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    // 6. Gate 8 Consequence: Permitted because governed review established intentional musicality without regression
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveDistortionEvidence],
      perceptualEvaluations: [perceptualWarmthEvidence],
      evidenceConflicts: [resolvedConflictRecord],
      regressionAssessments: [intentionalRegressionRecord],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, true, "Governed intentional trade-off permits Gate 8 eligibility");

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });

    assert.strictEqual(gate8Result.isAuthorized, true);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.AUTHORIZED);
  });

  // ---------------------------------------------------------------------------
  // Scenario 09: Edge-Case Crashes New Path but Legacy Survives
  // Context: An adversarial test feeds an audio stem with extreme digital clipping and DC offset
  //          into both paths. Legacy PATH-PROD clamps stably; candidate PATH-SHADOW encounters
  //          an unhandled exception in internal DSP math and halts execution.
  // Profiles: PROFILE-12 (Adversarial / Edge-Case Profile).
  // Evidence: ValidationExecutionRecord indicates unhandled exception; ValidationFailureRecord generated.
  // Hard Blocker: Canonical BLOCK-05 (Runtime Instability: exception / crash).
  // Attribution: RUNTIME_IMPLEMENTATION -> Runtime Software Engineering.
  // Outcome: FAIL (Invariant 8: adversarial edge cases must be handled gracefully).
  // Gate 8: Denied / blocked pending runtime exception handling fix.
  // ---------------------------------------------------------------------------
  it("Scenario 09: Edge-Case Crashes New Path but Legacy Survives", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen09",
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      fixture_class: FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen09",
      associated_fixture_set: [fixture.fixture_id],
    });

    // Candidate PATH-SHADOW execution aborts due to unhandled DSP exception under DC offset
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen09",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "PROFILE-12_ADVERSARIAL_STABILITY",
      outcome: EXECUTION_OUTCOMES.FAILED,
      anomalies_detected: [
        "DSP_MATH_UNHANDLED_EXCEPTION: NaN generated in biquad filter transfer function under extreme +12dBFS DC offset",
      ],
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen09",
      assigned_test_profiles: ["PROFILE-12_ADVERSARIAL_STABILITY"],
      execution_record_refs: [exec.execution_id],
    });

    // 1. Failure Attribution: RUNTIME_IMPLEMENTATION -> Software Engineering Core Team (RUNTIME_REMAND)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Edge-Case Crashes New Path but Legacy Survives",
          symptom: "Missing boundary sanitization in DSP intake caused NaN in biquad filter and unhandled crash under adversarial input.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.strictEqual(remand.package.routing.remandClass, "RUNTIME_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Software Engineering Core Team");

    // 2. Canonical Hard Blocker: BLOCK-05 (Runtime Instability)
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerResult = harness.checkHardBlockers(readinessInput);
    assert.ok(
      blockerResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY),
      "Unhandled DSP crash must trigger canonical Hard Blocker BLOCK-05: Runtime Instability"
    );

    // 3. Outcome Synthesis: FAIL (Invariant 8: adversarial edge cases must be handled gracefully)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec],
      failureRecords: [attribution.record],
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);

    // 4. Gate 8 Consequence: Blocked / ineligible. Surviving legacy behavior is comparator evidence, not global truth
    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false, "Runtime crash must disqualify Gate 8 eligibility");

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
    });

    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(gate8Result.isAuthorized, false);
  });

  // ---------------------------------------------------------------------------
  // Scenario 10: Legacy Fails and Candidate Succeeds
  // Context: A complex multi-mic cabinet preset in legacy PATH-PROD exhibits severe comb-filtering
  //          and phase cancellation due to static delay offsets. Candidate PATH-SHADOW applies
  //          causal diagnosis to align mic distances, producing rich, phase-coherent output.
  // Profiles: PROFILE-04 (Phase Coherence), PROFILE-06 (Perceptual Listening), PROFILE-09 (Regression Profile).
  // Evidence: Legacy differential indicates phase cancellation; candidate indicates phase coherence & approval;
  //           RegressionAssessmentRecord classifies result as INTENTIONAL_ARCHITECTURAL_CORRECTION.
  // Attribution: None.
  // Outcome: PASS for tested scope.
  // Gate 8: Legacy is not unquestioned truth. Candidate success where legacy failed is recognized
  //         as intentional architectural correction; candidate achieves Gate 8 eligibility for tested scope.
  // ---------------------------------------------------------------------------
  it("Scenario 10: Legacy Fails and Candidate Succeeds", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen10",
      included_units: ["guitar:cab:multi_mic_vintage_4x12"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      fixture_class: FIXTURE_CLASSES.REFERENCE_TONE,
      declared_applicability_scope: ["guitar:cab:multi_mic_vintage_4x12"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen10",
      associated_fixture_set: [fixture.fixture_id],
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen10",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:04_objective_acoustic",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen10_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Candidate evidence: Coherent phase alignment and passing acoustic metrics
    const candidateObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen10_cand",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE,
      measured_delta: 0.1, // Phase coherence score > 0.95
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });

    const legacyObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen10_legacy",
      execution_id: "exec_legacy_10",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE,
      measured_delta: 5.4, // Legacy had severe comb filtering / phase cancellation notch at 1.8kHz
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    // 2. Perceptual evidence: Expert listening confirms rich, phase-coherent tone
    const candidatePerceptual = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen10_cand",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      qualitative_observations:
        "Candidate eliminates severe comb filtering present in legacy multi-mic preset; full, rich phase-coherent cabinet reproduction.",
      perceptual_dimensions_evaluated: {
        phase_coherence: 9.8,
        tonal_balance: 9.4,
      },
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen10",
      assigned_test_profiles: ["profile:04_objective_acoustic", "profile:03_target_platform_export"],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [candidateObjective.objective_evidence_id, candidatePerceptual.perceptual_evidence_id],
    });

    // 3. Differential Auditing: Tripartite comparison with authorized intentional correction
    const auditResult = harness.differentialAuditor.auditRegression({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      candidateData: {
        execution: exec,
        objectiveEvidence: [candidateObjective],
        perceptualEvidence: [candidatePerceptual],
      },
      legacyOutput: {
        outputId: "legacy_path_prod_multimic_10",
        objectiveEvidence: [legacyObjective],
      },
      goldenReference: {
        fixtureRecord: fixture,
      },
      materialityProfileRef: "tolerance_spec_ref:regression_tolerance_profile",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      intentionalCorrectionIntent: {
        intentId: "intent_scen10_phase_alignment",
        rationale: "Causal delay alignment of dual cabinet microphones to eliminate destructive comb filtering present in legacy PATH-PROD.",
        approvedChangeRef: "RFC-2026-MULTI-MIC-ALIGNMENT",
        isAuthorized: true,
      },
    });

    assert.strictEqual(
      auditResult.record.classification,
      REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      "Candidate fixing legacy comb filtering must be classified as INTENTIONAL_CORRECTION"
    );
    assert.strictEqual(auditResult.record.blocks_gate_8, false);

    // 4. Outcome Synthesis: PASS for evaluated scope (Legacy is not unquestioned truth)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [candidateObjective],
      perceptualEvidence: [candidatePerceptual],
      regressionAssessments: [auditResult.record],
      rollbackOperationalityVerified: true,
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    // 5. Gate 8 Consequence: Candidate achieves Gate 8 eligibility where improvement over legacy is verified
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [candidateObjective],
      perceptualEvaluations: [candidatePerceptual],
      regressionAssessments: [auditResult.record],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, true);

    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: "Lead Acoustic Architect",
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });

    assert.strictEqual(gate8Result.isAuthorized, true);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.AUTHORIZED);
    assert.deepStrictEqual(gate8Result.authorizedScope, ["guitar:cab:multi_mic_vintage_4x12"]);
  });

  // ---------------------------------------------------------------------------
  // Scenario 11: Rollback Simulation Fails
  // Context: A candidate package passes all objective and perceptual tests. During pre-cutover
  //          rollback verification under simulated failure, automated reversion fails to restore
  //          PATH-PROD within the declared operational recovery objective (recovery_objective_ref).
  // Profiles: PROFILE-11 (Rollback Profile).
  // Evidence: Objective (Rollback) indicates failure to meet recovery objective; ValidationFailureRecord generated.
  // Attribution: OPERATIONAL_INFRASTRUCTURE -> Phase 1C.5g Coexistence Team.
  // Outcome: FAIL (Invariant 9: reversibility is mandatory for Gate 8 consideration).
  // Gate 8: Absolute Hard Blocker (BLOCK-03); routes to authorization denial pending verified deterministic reversibility.
  // Remand: DefectRemandPackage routed to Phase 1C.5g Coexistence Team. Phase 1C.5h does NOT execute operational rollback.
  // ---------------------------------------------------------------------------
  it("Scenario 11: Rollback Simulation Fails", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen11",
      included_units: ["guitar:amp:5150_lead"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:5150_lead"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen11_rollback",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });

    const execAcoustic = createBaselineExecutionRecord({
      execution_id: "exec_scen11_acoustic",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile_04_objective_acoustic",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    // 1. Candidate passes normal objective and perceptual listening tests
    const passedObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen11_acoustic",
      execution_id: execAcoustic.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const passedPerceptual = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen11_listening",
      execution_id: execAcoustic.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });

    // 2. Pre-cutover rollback verification fails under simulated load
    const execRollback = createBaselineExecutionRecord({
      execution_id: "exec_scen11_rollback",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile_11_rollback_simulation",
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    const failedRollbackEvidence = createBaselineRollbackEvidence(false, {
      rollback_verified: false,
      recovery_time_objective_met: false,
      path_rollback_verified_under_load: false,
      failure_reason:
        "Automated reversion failed to restore PATH-PROD within declared 300ms recovery objective (elapsed: 1420ms)",
      evidence_ref: "cert_rollback_failed_sim_11",
      version_binding_ref: binding.binding_id,
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen11",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [execAcoustic.execution_id, execRollback.execution_id],
      evidence_refs: [passedObjective.objective_evidence_id, passedPerceptual.perceptual_evidence_id],
    });

    // 3. Forensic failure attribution: OPERATIONAL_INFRASTRUCTURE -> Phase 1C.5g Coexistence Team
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: execRollback,
        scopeRecord: scope,
        symptomDetails: {
          title: "Rollback Simulation Fails to Meet Recovery Objective",
          symptom:
            "Automated reversion failed to restore PATH-PROD within declared 300ms recovery objective under simulated load.",
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
    assert.strictEqual(remand.package.routing.remandClass, "ENVIRONMENT_REMAND");

    // 4. Outcome Synthesis: FAIL (Invariant 9: reversibility is mandatory)
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [execAcoustic, execRollback],
      objectiveEvidence: [passedObjective],
      perceptualEvidence: [passedPerceptual],
      failureRecords: [attribution.record],
      rollbackOperationalityVerified: false,
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.strictEqual(outcomeResult.isFail, true);
    assert.ok(
      outcomeResult.unresolvedIssues.some((f) => f.includes(GOVERNED_HARD_BLOCKERS.BLOCK_03_ROLLBACK_FAIL)),
      "Unresolved issues must explicitly cite BLOCK-03 rollback failure"
    );

    // 5. Production Readiness: Pillar 4 DEFICIENT, BLOCKER-03 triggered, gate_8_eligible: false
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [execRollback],
      objectiveEvidence: [passedObjective],
      perceptualEvaluations: [passedPerceptual],
      failureAttributions: [attribution.record],
      rollbackEvidence: failedRollbackEvidence,
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false);
    assert.strictEqual(readinessResult.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
    assert.ok(readinessResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));

    // 6. Gate 8 Adjudication: REJECTED / authorization denied under Invariant 9
    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
    });

    assert.strictEqual(gate8Result.isAuthorized, false);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(gate8Result.authorizedScope.length, 0);
    // Phase 1C.5h does NOT execute operational rollback (governance & validation boundary strictly preserved)
  });

  // ---------------------------------------------------------------------------
  // Scenario 12: Fixture Calibration Later Discovered Wrong
  // Context: Following prior validation, curation audits reveal that a DI fixture was captured
  //          with calibration levels deviating from declared standard, potentially skewing input gain.
  // Profiles: N/A (Post-Authorization Discovery).
  // Evidence: RevalidationTriggerRecord (Trigger 06) generated; prior validation outcomes linked to fixture marked STALE.
  // Action: Gate 8 status transitions to SUSPENDED. RetestPlanRecord issued to re-evaluate affected cases under corrected calibration.
  // Immutability: Prior PASS evidence remains immutable; no historical rewriting.
  // ---------------------------------------------------------------------------
  it("Scenario 12: Fixture Calibration Later Discovered Wrong", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen12",
      included_units: ["guitar:amp:5150_lead"],
    });
    const priorBinding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      fixture_id: "fix_scen12_di_stems",
      declared_applicability_scope: ["guitar:amp:5150_lead"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen12",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen12",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: priorBinding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen12_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: priorBinding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const priorObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen12_prior",
      execution_id: exec.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const priorPerceptual = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen12_prior",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });
    const pkg = createBaselinePackageRecord(scope.scope_id, priorBinding.binding_id, {
      package_id: "pkg_scen12",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [priorObjective.objective_evidence_id, priorPerceptual.perceptual_evidence_id],
    });

    // 1. Initial State: Package was validly synthesized and achieved Gate 8 authorization
    const initialOutcome = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: priorBinding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [priorObjective],
      perceptualEvidence: [priorPerceptual],
      rollbackOperationalityVerified: true,
    });
    assert.strictEqual(initialOutcome.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    const initialReadiness = harness.evaluateReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: priorBinding,
      validationOutcome: initialOutcome.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [priorObjective],
      perceptualEvaluations: [priorPerceptual],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: priorBinding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });
    assert.strictEqual(initialReadiness.assessmentRecord.gate_8_eligible, true);

    const initialAdoptionDecision = createBaselineAdoptionDecision(
      pkg,
      initialReadiness.assessmentRecord,
      scope,
      priorBinding,
      { decision_id: "adr_scen12_authorized" }
    );

    // Register active authorization with Gate 8 State Machine
    const stateMachine = new Gate8StateMachine({ graph: harness.graph, auditLedger: harness.auditLedger });
    stateMachine.registerAuthorization(initialAdoptionDecision);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialAdoptionDecision.decision_id), true);

    // 2. Post-Authorization Discovery: Curation audit discovers calibration defect in fixture -> TRIGGER-06
    const updatedBinding = {
      ...priorBinding,
      binding_id: "binding_recalibrated_fixture_scen12",
      fixture_library_version: "2.0.0",
      version_integrity_reference: {
        composite_digest: "sha256:comp_updated_fixture_12",
        algorithm: "SHA-256",
        sealed_at: "2026-03-21T12:00:00Z",
        component_digests: { fixture_library_version: "sha256:fix_v2" },
      },
    };

    const triggerResult = harness.triggerDetector.detectTrigger({
      priorBinding,
      newBinding: updatedBinding,
      scopeRecord: scope,
      priorOutcomeRecord: initialOutcome.outcomeRecord,
      graph: harness.graph,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
        description: "Post-authorization curation audit revealed DI fixture calibration level error (+2.5dB gain discrepancy).",
        affected_fixture_ids: [fixture.fixture_id],
      },
    });

    assert.strictEqual(triggerResult.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE);
    assert.strictEqual(triggerResult.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST);

    // 3. Historical evidence immutability: Original PASS records are NOT mutated
    assert.strictEqual(priorObjective.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
    assert.strictEqual(initialOutcome.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
    assert.strictEqual(Object.isFrozen(initialOutcome.outcomeRecord), true);

    // 4. Governance Action: Gate 8 status transitions to SUSPENDED via canonical State Machine
    const suspendResult = stateMachine.suspendAuthorization({
      decisionId: initialAdoptionDecision.decision_id,
      changeReason: "Post-validation audit discovered DI fixture calibration level error; re-evaluation required under corrected calibration standard.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });

    assert.strictEqual(suspendResult.success, true);
    assert.strictEqual(suspendResult.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
    assert.strictEqual(suspendResult.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialAdoptionDecision.decision_id), false);

    // 5. RetestPlanRecord issued: partitions evidence, isolates affected fixture evidence, mandates retest
    const retestPlanner = new RetestPlanner({ graph: harness.graph, auditLedger: harness.auditLedger });
    const planResult = retestPlanner.createRetestPlan({
      triggerRecord: triggerResult.triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      existingEvidenceRecords: [priorObjective, priorPerceptual],
      executionRecords: [exec],
      availableCases: [vCase],
      changeEvent: {
        affected_fixture_ids: [fixture.fixture_id],
      },
    });

    assert.ok(planResult.retestPlan.retest_plan_id);
    assert.ok(planResult.invalidatedEvidenceRefs.includes(priorObjective.objective_evidence_id));
    assert.ok(planResult.requiredNewCases.includes(vCase.case_id));
    assert.deepStrictEqual(planResult.retestScope, scope.included_units);
  });

  // ---------------------------------------------------------------------------
  // Scenario 13: Target-Platform Update Changes Output
  // Context: Target platform vendor releases runtime update (v5.5.0 -> v6.0.0) altering internal
  //          speaker simulation response, potentially shifting high-frequency output for presets.
  // Profiles: N/A (External Platform Update).
  // Evidence: RevalidationTriggerRecord (Trigger 05) generated; prior platform verification marked STALE.
  // Action: Gate 8 status transitions to SUSPENDED. RetestPlanRecord issued to re-evaluate platform rendering.
  // Boundary: No real vendor runtime executed beyond the existing test abstraction.
  // ---------------------------------------------------------------------------
  it("Scenario 13: Target-Platform Update Changes Output", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen13",
      included_units: ["guitar:amp:5150_lead"],
    });
    const priorBinding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:5150_lead"],
    });
    const vCasePlatform = createBaselineValidationCase({
      case_id: "case_scen13_export",
      evaluation_methodology: "PLATFORM_INTEGRITY_CHECK",
      applicable_test_dimensions: ["03_export_integrity", "platform_compatibility"],
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen13_export",
      case_id: vCasePlatform.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: priorBinding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const priorPlatformEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen13_export",
      execution_id: execExport.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const pkg = createBaselinePackageRecord(scope.scope_id, priorBinding.binding_id, {
      package_id: "pkg_scen13",
      validation_case_refs: [vCasePlatform.case_id],
      execution_record_refs: [execExport.execution_id],
      evidence_refs: [priorPlatformEvidence.objective_evidence_id],
    });

    // 1. Initial State: Valid authorization exists under target platform v5.5.0
    const initialAdoptionDecision = createBaselineAdoptionDecision(
      pkg,
      { readiness_id: "pra_scen13" },
      scope,
      priorBinding,
      { decision_id: "adr_scen13_authorized" }
    );
    const stateMachine = new Gate8StateMachine({ graph: harness.graph, auditLedger: harness.auditLedger });
    stateMachine.registerAuthorization(initialAdoptionDecision);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialAdoptionDecision.decision_id), true);

    // 2. Vendor releases platform update: target_platform_runtime_version changes -> TRIGGER-05
    const updatedBinding = {
      ...priorBinding,
      binding_id: "binding_target_platform_v6_scen13",
      target_platform_runtime_version: "6.0.0",
      version_integrity_reference: {
        composite_digest: "sha256:comp_updated_platform_13",
        algorithm: "SHA-256",
        sealed_at: "2026-03-22T12:00:00Z",
        component_digests: { target_platform_runtime_version: "sha256:plat_v6" },
      },
    };

    const triggerResult = harness.triggerDetector.detectTrigger({
      priorBinding,
      newBinding: updatedBinding,
      scopeRecord: scope,
      graph: harness.graph,
    });

    assert.strictEqual(
      triggerResult.primaryTriggerSource,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE
    );
    assert.strictEqual(triggerResult.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);

    // 3. Gate 8 State Machine: Transitions active authorization to SUSPENDED
    const suspendResult = stateMachine.suspendAuthorization({
      decisionId: initialAdoptionDecision.decision_id,
      changeReason: "Target platform vendor update to v6.0.0 alters cabinet simulation; prior platform verification is stale pending retest.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.DOWNSTREAM_DEFECT,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });

    assert.strictEqual(suspendResult.success, true);
    assert.strictEqual(suspendResult.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
    assert.strictEqual(suspendResult.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialAdoptionDecision.decision_id), false);

    // 4. RetestPlanRecord issued: mandates platform rendering retest
    const retestPlanner = new RetestPlanner({ graph: harness.graph, auditLedger: harness.auditLedger });
    const planResult = retestPlanner.createRetestPlan({
      triggerRecord: triggerResult.triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      existingEvidenceRecords: [priorPlatformEvidence],
      executionRecords: [execExport],
      availableCases: [vCasePlatform],
    });

    assert.ok(planResult.retestPlan.retest_plan_id);
    assert.ok(planResult.invalidatedEvidenceRefs.includes(priorPlatformEvidence.objective_evidence_id));
    assert.ok(planResult.requiredNewCases.includes(vCasePlatform.case_id));
    assert.deepStrictEqual(planResult.retestScope, scope.included_units);
  });

  // ---------------------------------------------------------------------------
  // Scenario 14: Validated Gear Family Passes but Adjacent Untested Family Requested
  // Context: A migration package for a specific high-gain amplifier model achieves Gate 8 authorization.
  //          The migration team requests extending authorization to an adjacent untested model on the
  //          assumption of circuit similarity.
  // Profiles: N/A (Scope Alignment Audit).
  // Evidence: Scope alignment audit detects requested scope exceeds tested scope; Scope Inflation Protection triggered.
  // Blocker: BLOCK-06 (BLOCKER_06_SCOPE_INFLATION).
  // Outcome: Authorization cannot extend beyond tested scope; untested family remains excluded; no production routing.
  // ---------------------------------------------------------------------------
  it("Scenario 14: Validated Gear Family Passes but Adjacent Untested Family Requested", () => {
    const testedScope = createBaselineScopeRecord({
      scope_id: "scope_scen14_tested",
      included_units: ["guitar:amp:5150_lead"],
      excluded_units: ["guitar:amp:5150_ii_adjacent_untested"],
    });
    const binding = createBaselineVersionBindingRecord(testedScope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: ["guitar:amp:5150_lead"],
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen14",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen14",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen14_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const objectiveEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen14_lead",
      execution_id: exec.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const perceptualEvidence = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen14_lead",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });
    const pkg = createBaselinePackageRecord(testedScope.scope_id, binding.binding_id, {
      package_id: "pkg_scen14",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [objectiveEvidence.objective_evidence_id, perceptualEvidence.perceptual_evidence_id],
    });

    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: testedScope,
      versionBindingRecord: binding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvidence: [perceptualEvidence],
      rollbackOperationalityVerified: true,
    });
    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    const pristineReadinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: testedScope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvaluations: [perceptualEvidence],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    // 1. Validated tested scope evaluates cleanly and achieves Gate 8 eligibility
    const validReadiness = harness.evaluateReadiness({
      ...pristineReadinessInput,
      requestedScope: ["guitar:amp:5150_lead"],
    });
    assert.strictEqual(validReadiness.assessmentRecord.gate_8_eligible, true);
    assert.strictEqual(validReadiness.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION), false);

    // 2. Migration team requests extending authorization to adjacent untested model ("guitar:amp:5150_ii_adjacent_untested")
    const inflatedRequestedScope = ["guitar:amp:5150_lead", "guitar:amp:5150_ii_adjacent_untested"];

    // Fast Hard Blocker check confirms BLOCK-06
    const blockerCheck = harness.checkHardBlockers(pristineReadinessInput, inflatedRequestedScope);
    assert.strictEqual(blockerCheck.hardBlockersPresent.length > 0, true);
    assert.ok(blockerCheck.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION));

    // Full readiness synthesis confirms BLOCKER-06 prevents Gate 8 eligibility
    const inflatedReadiness = harness.evaluateReadiness({
      ...pristineReadinessInput,
      requestedScope: inflatedRequestedScope,
    });
    assert.strictEqual(inflatedReadiness.assessmentRecord.gate_8_eligible, false);
    assert.ok(inflatedReadiness.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION));

    // 3. Gate 8 Adjudication: Request to authorize inflated scope is denied/rejected
    const inflatedGate8 = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: inflatedReadiness.assessmentRecord,
      scopeRecord: testedScope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
      requestedScope: inflatedRequestedScope,
    });
    assert.strictEqual(inflatedGate8.isAuthorized, false);
    assert.strictEqual(inflatedGate8.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(inflatedGate8.authorizedScope.length, 0);
    assert.ok(inflatedGate8.adjudicationRationale.includes("requested scope exceeding tested scope"));

    // 4. Confining Gate 8 strictly to tested scope succeeds
    const confinedGate8 = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: validReadiness.assessmentRecord,
      scopeRecord: testedScope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
      requestedScope: ["guitar:amp:5150_lead"],
    });
    assert.strictEqual(confinedGate8.isAuthorized, true);
    assert.deepStrictEqual(confinedGate8.authorizedScope, ["guitar:amp:5150_lead"]);
    assert.strictEqual(confinedGate8.authorizedScope.includes("guitar:amp:5150_ii_adjacent_untested"), false);
  });

  // ---------------------------------------------------------------------------
  // Scenario 15: Independently Validated Features Fail When Combined
  // Context: An overdrive pedal remapping passes validation in isolation; a multi-microphone cabinet
  //          placement passes validation in isolation. When combined in an end-to-end preset workflow,
  //          the combined signal exhibits digital clipping in the output stage.
  // Profiles: PROFILE-04 (Objective Acoustic), PROFILE-14 (User-Workflow / UAT).
  // Evidence: Objective indicates clipping under combined gain staging; ValidationFailureRecord generated.
  // Attribution: REASONING (gain-staging prediction rule failed under multi-component combination) -> Upstream Reasoning (Phase 1C.5d).
  // Outcome: FAIL for the combined workflow. Gate 8 denied for combined workflow scope.
  // Immutability: Individually valid historical evidence is NOT rewritten.
  // ---------------------------------------------------------------------------
  it("Scenario 15: Independently Validated Features Fail When Combined", () => {
    // 1. Component A in isolation: TS9 Overdrive pedal passes validation
    const pedalObjective = Object.freeze(createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen15_pedal_isolation",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      measured_parameters: { gain_headroom_db: 4.5 },
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    }));

    // 2. Component B in isolation: Multi-mic cabinet passes validation
    const cabinetObjective = Object.freeze(createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen15_cab_isolation",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_parameters: { phase_alignment_score: 0.98 },
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    }));

    // Historical records remain immutable
    assert.strictEqual(pedalObjective.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
    assert.strictEqual(cabinetObjective.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);

    // 3. Combined end-to-end workflow: Overdrive pedal chained into multi-mic cabinet
    const combinedScope = createBaselineScopeRecord({
      scope_id: "scope_scen15_combined",
      included_units: [
        "guitar:pedal:ts9_overdrive",
        "guitar:cab:4x12_multimic",
        "guitar:workflow:ts9_into_multimic",
      ],
    });
    const binding = createBaselineVersionBindingRecord(combinedScope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: combinedScope.included_units,
    });
    const vCaseCombined = createBaselineValidationCase({
      case_id: "case_scen15_combined",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:workflow:ts9_into_multimic",
    });
    const execCombined = createBaselineExecutionRecord({
      execution_id: "exec_scen15_combined",
      case_id: vCaseCombined.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile_04_objective_acoustic",
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // 4. Combined signal exhibits digital clipping in output stage
    const combinedClippingObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen15_combined_clipping",
      execution_id: execCombined.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      measured_parameters: { clipping_sample_count: 842, true_peak_dbfs: 3.2 },
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      measured_delta: 3.2,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    const pkg = createBaselinePackageRecord(combinedScope.scope_id, binding.binding_id, {
      package_id: "pkg_scen15_combined",
      validation_case_refs: [vCaseCombined.case_id],
      execution_record_refs: [execCombined.execution_id],
      evidence_refs: [combinedClippingObjective.objective_evidence_id],
    });

    // 5. Forensic failure attribution: REASONING -> Upstream Reasoning (Phase 1C.5d)
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: execCombined,
        scopeRecord: combinedScope,
        symptomDetails: {
          title: "Combined Workflow Output Clipping",
          symptom:
            "Combined workflow output clipping: Upstream gain-staging prediction rule did not account for additive boost between overdrive output buffer and multi-mic summer.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCaseCombined,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: combinedClippingObjective,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandDestination, "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)");
    assert.strictEqual(remand.package.routing.remandClass, "REASONING_REMAND");

    // 6. Outcome Synthesis: FAIL for combined workflow
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: combinedScope,
      versionBindingRecord: binding,
      executionRecords: [execCombined],
      objectiveEvidence: [combinedClippingObjective],
      failureRecords: [attribution.record],
      rollbackOperationalityVerified: true,
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.strictEqual(outcomeResult.isFail, true);

    // 7. Production Readiness: Pillar 1 DEFICIENT, gate_8_eligible: false
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: combinedScope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [execCombined],
      objectiveEvidence: [combinedClippingObjective],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false);
    assert.strictEqual(readinessResult.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // 8. Gate 8 Adjudication: Denied / non-authorizable for combined scope
    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: combinedScope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
    });

    assert.strictEqual(gate8Result.isAuthorized, false);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(gate8Result.authorizedScope.length, 0);

    // 9. Historical evidence immutability verified: Isolated records still intact and PASS
    assert.strictEqual(pedalObjective.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
    assert.strictEqual(cabinetObjective.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
  });

  // ---------------------------------------------------------------------------
  // Scenario 16: Candidate Lesson Changes Output After Validation
  // Context: A validated and authorized gear family experiences an upstream knowledge-base update
  //          due to an approved Candidate Lesson that alters dynamic power-sag computation.
  // Triggers: Post-authorization Candidate Lesson change invokes canonical Trigger 09
  //           (TRIGGER_09_CANDIDATE_LESSON_APPROVED).
  // Immutability: Prior validation outcome and evidence records remain strictly immutable.
  // Staleness: Applicability of prior evidence becomes dynamically stale under the changed binding.
  // Gate 8: State transitions to SUSPENDED.
  // Retest: Targeted RetestPlanRecord issued; re-authorization blocked pending empirical retest.
  // ---------------------------------------------------------------------------
  it("Scenario 16: Candidate Lesson Changes Output After Validation", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen16_lead",
      included_units: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    });
    const priorBinding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: scope.included_units,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen16_lead",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen16_lead",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: priorBinding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen16_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: priorBinding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const objectiveEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen16_lead",
      execution_id: exec.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const perceptualEvidence = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen16_lead",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    });
    const pkg = createBaselinePackageRecord(scope.scope_id, priorBinding.binding_id, {
      package_id: "pkg_scen16",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [objectiveEvidence.objective_evidence_id, perceptualEvidence.perceptual_evidence_id],
    });

    // 1. Initial State: Validated, passed, and authorized under priorBinding
    const initialOutcome = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: priorBinding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvidence: [perceptualEvidence],
      rollbackOperationalityVerified: true,
    });
    assert.strictEqual(initialOutcome.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    const initialReadiness = harness.evaluateReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: priorBinding,
      validationOutcome: initialOutcome.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvaluations: [perceptualEvidence],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: priorBinding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });
    assert.strictEqual(initialReadiness.assessmentRecord.gate_8_eligible, true);

    const initialDecision = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: initialReadiness.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: priorBinding,
      authorizingOfficial: CANONICAL_OFFICIAL,
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });
    assert.strictEqual(initialDecision.isAuthorized, true);

    const stateMachine = new Gate8StateMachine({ graph: harness.graph, auditLedger: harness.auditLedger });
    stateMachine.registerAuthorization(initialDecision.decisionRecord);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialDecision.decisionRecord.decision_id), true);
    assert.strictEqual(stateMachine.getAuthorizationState(initialDecision.decisionRecord.decision_id).currentStatus, GOVERNANCE_STATUSES.ACTIVE);

    // Initial evidence is applicable under prior binding
    assert.strictEqual(isApplicableForCurrentBinding(initialOutcome.outcomeRecord, priorBinding.binding_id, harness.graph), true);

    // 2. Post-authorization Candidate Lesson / knowledge-binding change invokes canonical Trigger 09
    const updatedBinding = {
      ...priorBinding,
      binding_id: "binding_scen16_sag_lesson",
      deterministic_rules_version: "rules_digest_2026_lesson_sag_applied",
      version_integrity_reference: {
        composite_digest: "sha256:comp_lesson_applied_scen16",
        algorithm: "SHA-256",
        sealed_at: "2026-03-23T12:00:00Z",
        component_digests: { deterministic_rules_version: "sha256:rules_lesson" },
      },
    };

    const triggerResult = harness.triggerDetector.detectTrigger({
      priorBinding,
      newBinding: updatedBinding,
      scopeRecord: scope,
      priorOutcomeRecord: initialOutcome.outcomeRecord,
      graph: harness.graph,
      changeEvent: {
        trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
        candidate_lesson_id: "LESSON-POWER-SAG-01",
        candidate_lesson_domain: "5150_lead",
      },
    });

    assert.strictEqual(triggerResult.primaryTriggerSource, REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED);
    assert.strictEqual(triggerResult.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST);
    assert.deepStrictEqual(triggerResult.affectedScope, ["guitar:amp:5150_lead"]);

    // 3. Previous validation evidence remains immutable (no rewrite or rollback of historical outcome)
    assert.strictEqual(objectiveEvidence.objective_pass_fail, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
    assert.strictEqual(perceptualEvidence.evaluation_outcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS);
    assert.strictEqual(initialOutcome.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);

    // 4. Applicability of that evidence becomes stale under changed knowledge binding
    assert.strictEqual(isApplicableForCurrentBinding(initialOutcome.outcomeRecord, priorBinding.binding_id, harness.graph), false);
    assert.strictEqual(isApplicableForCurrentBinding(initialOutcome.outcomeRecord, updatedBinding.binding_id, harness.graph), false);

    // 5. Gate 8 authorization transitions to SUSPENDED
    const suspendResult = stateMachine.suspendAuthorization({
      decisionId: initialDecision.decisionRecord.decision_id,
      changeReason: "Candidate Lesson LESSON-POWER-SAG-01 changed knowledge binding; prior evidence is stale pending targeted retest.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.DOWNSTREAM_DEFECT,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });
    assert.strictEqual(suspendResult.success, true);
    assert.strictEqual(suspendResult.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
    assert.strictEqual(suspendResult.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.getAuthorizationState(initialDecision.decisionRecord.decision_id).currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.isAuthorizationActive(initialDecision.decisionRecord.decision_id), false);

    // 6. Targeted retest is required before re-authorization
    const retestPlanner = new RetestPlanner({ graph: harness.graph, auditLedger: harness.auditLedger });
    const planResult = retestPlanner.createRetestPlan({
      triggerRecord: triggerResult.triggerRecord,
      packageRecord: pkg,
      scopeRecord: scope,
      availableCases: [vCase],
      executionRecords: [exec],
      existingEvidenceRecords: [objectiveEvidence],
      changeEvent: { candidate_lesson_domain: "5150_lead" },
    });

    assert.ok(planResult.retestPlan.retest_plan_id);
    assert.ok(planResult.invalidatedEvidenceRefs.includes(objectiveEvidence.objective_evidence_id));
    assert.ok(planResult.requiredNewCases.includes(vCase.case_id));
    assert.deepStrictEqual(planResult.retestScope, ["guitar:amp:5150_lead"]);

    // Attempting to reinstate authorization without revalidation evidence fails closed
    assert.throws(
      () => {
        (stateMachine as any).reinstateAuthorization({
          decisionId: initialDecision.decisionRecord.decision_id,
          changeReason: "Illegal attempt to reactivate suspended authorization without retest.",
          triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
          authorizingOfficial: CANONICAL_OFFICIAL,
          authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        });
      },
      ReadjudicationRequiredError
    );
  });

  // ---------------------------------------------------------------------------
  // Scenario 17: Code Refactor Claims No Acoustic Impact
  // Context: Engineering refactors DSP buffer memory allocation claiming "zero acoustic impact".
  // Triggers: Code refactor invokes canonical Trigger 07 (TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE).
  // Validation: Claimed "zero acoustic impact" does NOT waive validation.
  // Empirical Evidence: Empirical differential/regression evidence governs; material regression discovered.
  // Remediation: Material regression routes to runtime remediation.
  // Separation of Powers: Successful revalidation produces new evidence, NOT automatic authorization.
  // Axiom: REVALIDATION PRODUCES EVIDENCE. GATE 8 RE-ADJUDICATION PRODUCES AUTHORIZATION.
  // ---------------------------------------------------------------------------
  it("Scenario 17: Code Refactor Claims No Acoustic Impact", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen17_refactor",
      included_units: ["guitar:amp:5150_lead"],
    });
    const baselineBinding = createBaselineVersionBindingRecord(scope.scope_id, {
      binding_id: "binding_scen17_baseline",
      runtime_implementation_version: "2.4.1",
    });
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: scope.included_units,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen17_lead",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const execBaseline = createBaselineExecutionRecord({
      execution_id: "exec_scen17_baseline",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: baselineBinding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const baselineObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen17_baseline",
      execution_id: execBaseline.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      measured_parameters: { total_harmonic_distortion_percent: 1.2 },
    });

    // 1. Initial State: Baseline has active Gate 8 authorization
    const pkgBaseline = createBaselinePackageRecord(scope.scope_id, baselineBinding.binding_id, {
      package_id: "pkg_scen17_baseline",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [execBaseline.execution_id],
      evidence_refs: [baselineObjective.objective_evidence_id],
    });
    const baselineDecision = createBaselineAdoptionDecision(
      pkgBaseline,
      { readiness_id: "pra_scen17_baseline" },
      scope,
      baselineBinding,
      { decision_id: "adr_scen17_baseline_active" }
    );
    const stateMachine = new Gate8StateMachine({ graph: harness.graph, auditLedger: harness.auditLedger });
    stateMachine.registerAuthorization(baselineDecision);
    assert.strictEqual(stateMachine.isAuthorizationActive(baselineDecision.decision_id), true);

    // 2. Code refactor modifies runtime implementation claiming "zero acoustic impact"
    const refactoredBinding = {
      ...baselineBinding,
      binding_id: "binding_scen17_refactored",
      runtime_implementation_version: "2.4.2_clean_buffer_refactor",
      version_integrity_reference: {
        composite_digest: "sha256:comp_refactored_scen17",
        algorithm: "SHA-256",
        sealed_at: "2026-03-24T12:00:00Z",
        component_digests: { runtime_implementation_version: "sha256:refactor_sha" },
      },
    };

    // Code refactor invokes canonical Trigger 07
    const triggerResult = harness.triggerDetector.detectTrigger({
      priorBinding: baselineBinding,
      newBinding: refactoredBinding,
      scopeRecord: scope,
      graph: harness.graph,
    });

    assert.strictEqual(
      triggerResult.primaryTriggerSource,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE
    );
    // Claimed "zero acoustic impact" does NOT waive validation: full retest is mandated
    assert.strictEqual(triggerResult.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST);

    // 3. Empirical differential/regression evidence governs:
    // Refactored code actually introduces an unmodeled harmonic distortion regression
    const execRefactored = createBaselineExecutionRecord({
      execution_id: "exec_scen17_refactored",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: refactoredBinding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const refactoredObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen17_refactored",
      execution_id: execRefactored.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      measured_parameters: { total_harmonic_distortion_percent: 3.8 },
      measured_delta: 2.6,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
    });

    const refactoredPkg = createBaselinePackageRecord(scope.scope_id, refactoredBinding.binding_id, {
      package_id: "pkg_scen17_refactored",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [execRefactored.execution_id],
      evidence_refs: [refactoredObjective.objective_evidence_id],
    });

    const auditResult = harness.differentialAuditor.auditRegression({
      packageRecord: refactoredPkg,
      scopeRecord: scope,
      versionBindingRecord: refactoredBinding,
      candidateData: {
        execution: execRefactored,
        objectiveEvidence: [refactoredObjective],
      },
      legacyOutput: {
        outputId: "legacy_out_baseline_17",
        objectiveEvidence: [baselineObjective],
      },
      goldenReference: {
        fixtureRecord: fixture,
      },
      materialityProfileRef: "tolerance_spec_ref:regression_tolerance_profile",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
    });

    assert.strictEqual(
      auditResult.record.classification,
      REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION
    );

    // 4. Material regression routes to runtime remediation
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: execRefactored,
        scopeRecord: scope,
        symptomDetails: {
          title: "Refactor Buffer Truncation Harmonic Distortion",
          symptom: "Memory optimization refactor truncated buffer boundary leading to 2.6 dB THD regression.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: refactoredBinding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: refactoredObjective,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.strictEqual(remand.package.routing.remandClass, "RUNTIME_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Software Engineering Core Team");

    // Gate 8 authorization is suspended due to revalidation failure
    stateMachine.suspendAuthorization({
      decisionId: baselineDecision.decision_id,
      changeReason: "Material acoustic regression detected following refactor.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });
    assert.strictEqual(stateMachine.isAuthorizationActive(baselineDecision.decision_id), false);
    assert.strictEqual(stateMachine.getAuthorizationState(baselineDecision.decision_id).currentStatus, GOVERNANCE_STATUSES.SUSPENDED);

    // 5. Engineering fixes the bug in runtime implementation ("2.4.3_fixed")
    const bindingService = new VersionBindingService(
      undefined,
      undefined,
      undefined,
      new StaticArchitectureIntegrityReferenceProvider(TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS)
    );
    const correctedBinding = bindingService.bindVersions(scope, {
      runtime_implementation_version: "2.4.3_buffer_remediated",
      model_configuration_version: baselineBinding.model_configuration_version,
      deterministic_rules_version: baselineBinding.deterministic_rules_version,
      gear_catalog_version: baselineBinding.gear_catalog_version,
      platform_exporter_version: baselineBinding.platform_exporter_version,
      fixture_library_version: baselineBinding.fixture_library_version,
      target_platform_runtime_version: baselineBinding.target_platform_runtime_version,
      host_environment_version: baselineBinding.host_environment_version,
      architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
    });
    const execCorrected = createBaselineExecutionRecord({
      execution_id: "exec_scen17_corrected",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: correctedBinding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execCorrectedExport = createBaselineExecutionRecord({
      execution_id: "exec_scen17_corrected_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: correctedBinding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const correctedObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen17_corrected",
      execution_id: execCorrected.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      measured_parameters: { total_harmonic_distortion_percent: 1.2 },
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const correctedPkg = createBaselinePackageRecord(scope.scope_id, correctedBinding.binding_id, {
      package_id: "pkg_scen17_corrected",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [execCorrected.execution_id, execCorrectedExport.execution_id],
      evidence_refs: [correctedObjective.objective_evidence_id],
    });

    const revalOutcome = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: correctedPkg,
      scopeRecord: scope,
      versionBindingRecord: correctedBinding,
      executionRecords: [execCorrected, execCorrectedExport],
      objectiveEvidence: [correctedObjective],
      rollbackOperationalityVerified: true,
    });
    assert.strictEqual(revalOutcome.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
    assert.strictEqual(revalOutcome.isPass, true);

    // 6. Successful revalidation ONLY produces new evidence:
    // It does NOT automatically restore Gate 8 authorization!
    assert.strictEqual(stateMachine.isAuthorizationActive(baselineDecision.decision_id), false);
    assert.strictEqual(stateMachine.getAuthorizationState(baselineDecision.decision_id).currentStatus, GOVERNANCE_STATUSES.SUSPENDED);

    // Attempting generic reinstatement without re-adjudication fails closed
    assert.throws(
      () => {
        (stateMachine as any).reinstateAuthorization({
          decisionId: baselineDecision.decision_id,
          changeReason: "Attempting automated reinstatement without formal Gate 8 re-adjudication.",
          triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
          authorizingOfficial: CANONICAL_OFFICIAL,
          authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        });
      },
      ReadjudicationRequiredError
    );

    // 7. Gate 8 re-adjudication is still required
    // Full readiness synthesis confirms pillar satisfaction
    const revalReadiness = harness.evaluateReadiness({
      packageRecord: correctedPkg,
      scopeRecord: scope,
      versionBinding: correctedBinding,
      validationOutcome: revalOutcome.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [execCorrected, execCorrectedExport],
      objectiveEvidence: [correctedObjective],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: correctedBinding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    });
    assert.strictEqual(revalReadiness.assessmentRecord.gate_8_eligible, true);

    // Gate 8 formal re-adjudication produces authorization
    const readjudicatedDecision = harness.adjudicateGate8({
      packageRecord: correctedPkg,
      readinessAssessmentRecord: revalReadiness.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: correctedBinding,
      authorizingOfficial: CANONICAL_OFFICIAL,
      rollbackVerificationCertRef: "cert_rollback_verified_load_test_01",
    });
    assert.strictEqual(readjudicatedDecision.isAuthorized, true);
    assert.strictEqual(readjudicatedDecision.decisionOutcome, ADOPTION_DECISION_OUTCOMES.AUTHORIZED);

    const smReadjudicateResult = stateMachine.readjudicateAuthorization({
      priorDecisionId: baselineDecision.decision_id,
      readjudicationDecisionRecord: readjudicatedDecision.decisionRecord,
      changeReason: "Corrected runtime implementation verified passing empirical revalidation.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });
    assert.strictEqual(smReadjudicateResult.success, true);
    assert.strictEqual(smReadjudicateResult.newAuthorizationState.currentStatus, GOVERNANCE_STATUSES.ACTIVE);
    assert.strictEqual(stateMachine.isAuthorizationActive(readjudicatedDecision.decisionRecord.decision_id), true);
    assert.strictEqual(stateMachine.isAuthorizationActive(baselineDecision.decision_id), false);
    assert.strictEqual(stateMachine.getAuthorizationState(baselineDecision.decision_id).currentStatus, GOVERNANCE_STATUSES.SUPERSEDED);

    // Architectural Constitution Preserved:
    // REVALIDATION PRODUCES EVIDENCE. GATE 8 RE-ADJUDICATION PRODUCES AUTHORIZATION.
  });

  // ---------------------------------------------------------------------------
  // Scenario 18: Technically Successful Workflow is Confusing / Unacceptable
  // Context: An advanced stereo parallel routing workflow passes objective and perceptual acoustic
  //          benchmarks, but guitarist and producer UAT rejects the workflow as confusing and unworkable.
  // Authority: UAT failure remains independently authoritative for production readiness.
  // Outcome: ValidationOutcome is FAIL; Gate 8 cannot progress.
  // Remand: Defect remands to UI / reasoning according to existing attribution.
  // Priority: Acoustic PASS must not override unacceptable workflow/UAT.
  // Hard Blockers: No new Hard Blocker invented unless an existing blocker trigger is independently satisfied.
  // ---------------------------------------------------------------------------
  it("Scenario 18: Technically Successful Workflow is Confusing / Unacceptable", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen18_stereo_workflow",
      included_units: ["guitar:workflow:stereo_parallel_routing", "guitar:amp:5150_lead"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: scope.included_units,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen18_stereo_routing",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:workflow:stereo_parallel_routing",
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen18_stereo",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.FAILED,
    });

    // 1. Objective and perceptual acoustic evidence both PASS
    const passingObjective = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen18_acoustic_pass",
      execution_id: exec.execution_id,
      metric_category: OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      measured_parameters: { snr_db: 84.2, stereo_correlation: 0.96 },
    });
    const passingPerceptual = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen18_listening_pass",
      execution_id: exec.execution_id,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      evaluator_id: "eval_lead_sound_engineer",
      perceptual_dimensions_evaluated: { tonal_balance: 9.0, warmth: 9.0 },
    });

    // 2. User Acceptance Testing (PROFILE-14) evaluates workflow: REJECTED by producer persona
    const failingUAT = createBaselineUATEvaluation({
      uat_id: "uat_scen18_confusing_workflow",
      package_id: "pkg_scen18",
      evaluator_persona: EVALUATOR_PERSONAS.PRODUCER,
      task_scenario_id: "scenario_wet_dry_stereo_routing",
      task_completion_status: TASK_COMPLETION_STATUSES.FAILED,
      task_duration_seconds: 640,
      workflow_satisfaction_rating: 2.0,
      cognitive_friction_notes: "Parallel gain staging is unintuitive and controls produce unintended muting during live performance.",
      musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.REJECTED,
      uat_blockers_identified: ["UAT-DEFECT-ROUTING-AMBIGUITY"],
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen18",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [exec.execution_id],
      evidence_refs: [
        passingObjective.objective_evidence_id,
        passingPerceptual.perceptual_evidence_id,
        failingUAT.uat_id,
      ],
    });

    // 3. Forensic failure attribution: REASONING -> Reasoning Remand
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: exec,
        scopeRecord: scope,
        symptomDetails: {
          title: "Confusing Parallel Routing Workflow Rejection",
          symptom: "Workflow reasoning defect: preset routing graph confuses parallel gain staging and produces unusable workflow.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.MAJOR,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCase,
      fixtureRecord: fixture,
      objectiveEvidenceRecord: passingObjective,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.strictEqual(remand.package.routing.remandClass, "REASONING_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)");

    // 4. ValidationOutcome is FAIL: Acoustic PASS must not override unacceptable workflow/UAT
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec],
      objectiveEvidence: [passingObjective],
      perceptualEvidence: [passingPerceptual],
      uatEvidence: [failingUAT],
      failureRecords: [attribution.record],
      rollbackOperationalityVerified: true,
    });

    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);
    assert.strictEqual(outcomeResult.isFail, true);
    assert.ok(outcomeResult.outcomeRecord.unresolved_issues.some((issue) => issue.includes("UAT workflow failure")));
    assert.ok(outcomeResult.outcomeRecord.unresolved_issues.some((issue) => issue.includes("UAT musical fitness rejected")));

    // 5. Production Readiness: Pillar 1 (Acoustic/Musical) is DEFICIENT; Gate 8 cannot progress
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec],
      objectiveEvidence: [passingObjective],
      perceptualEvaluations: [passingPerceptual],
      uatEvaluations: [failingUAT],
      failureAttributions: [attribution.record],
      rollbackEvidence: createBaselineRollbackEvidence(true, {
        version_binding_ref: binding.binding_id,
      }),
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false);
    assert.strictEqual(
      readinessResult.pillarEvaluations.acoustic_musical_readiness,
      PILLAR_READINESS_STATUSES.DEFICIENT
    );

    // No new Hard Blocker invented for UAT alone when existing blocker predicates are not met
    const blockerCheck = harness.checkHardBlockers(readinessInput);
    assert.strictEqual(blockerCheck.hardBlockersPresent.length, 0);
    assert.strictEqual(readinessResult.hardBlockersPresent.length, 0);

    // 6. Gate 8 Adjudication: REJECTED
    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
    });

    assert.strictEqual(gate8Result.isAuthorized, false);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.BLOCKED);
    assert.strictEqual(gate8Result.authorizedScope.length, 0);
  });

  // ---------------------------------------------------------------------------
  // Scenario 19: Canary Users Report Issue Not Reproduced in Lab
  // Context: An authorized amplifier package exposed to Canary traffic exhibits input buffer clipping
  //          on high-output active pickups, which was not reproduced in lab testing due to passive DI fixtures.
  // Stop Criteria: Live telemetry / field feedback meets stop criteria.
  // Authority Separation: Phase 1C.5h records Gate 8 state as SUSPENDED; Phase 1C.5h notifies Phase 1C.5g;
  //                        Phase 1C.5g owns and executes rollback/routing response.
  // Domain Boundary: Active-pickup domain remains UNTESTED until fixture coverage exists.
  // Traceability: Appropriate fixture, retest, and remand records are generated.
  // Axiom: PHASE 1C.5h SUSPENDS AUTHORIZATION. PHASE 1C.5g EXECUTES THE GOVERNED OPERATIONAL RESPONSE.
  // ---------------------------------------------------------------------------
  it("Scenario 19: Canary Users Report Issue Not Reproduced in Lab", async () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen19_canary",
      included_units: ["guitar:amp:5150_lead"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);

    // 1. Lab fixture only covered passive pickup performance (Stratocaster single-coil)
    const labPassiveFixture = createBaselineFixtureRecord({
      fixture_id: "fix_scen19_passive_strat",
      fixture_name: "Passive Single Coil Clean DI",
      fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
      declared_applicability_scope: ["guitar:amp:5150_lead", "guitar:pickup:passive_single_coil"],
    });

    const vCaseLab = createBaselineValidationCase({
      case_id: "case_scen19_passive",
      associated_fixture_set: [labPassiveFixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const execLab = createBaselineExecutionRecord({
      execution_id: "exec_scen19_passive",
      case_id: vCaseLab.case_id,
      fixture_id: labPassiveFixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const objLab = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen19_passive_clean",
      execution_id: execLab.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });
    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen19",
      validation_case_refs: [vCaseLab.case_id],
      execution_record_refs: [execLab.execution_id],
      evidence_refs: [objLab.objective_evidence_id],
    });

    const activeDecision = createBaselineAdoptionDecision(
      pkg,
      { readiness_id: "pra_scen19" },
      scope,
      binding,
      { decision_id: "adr_scen19_active" }
    );
    const stateMachine = new Gate8StateMachine({ graph: harness.graph, auditLedger: harness.auditLedger });
    stateMachine.registerAuthorization(activeDecision);
    assert.strictEqual(stateMachine.isAuthorizationActive(activeDecision.decision_id), true);

    // 2. Canary deployment: live telemetry / field feedback meets stop criteria
    // High-output active pickups clip input stage; telemetry stop criteria breached
    const canaryAnomalyEvent = {
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
      anomaly_spike_metric: "ACTIVE_PICKUP_INPUT_CLIPPING_RATIO",
      breach_value: 0.18,
      threshold: 0.02,
      anomaly_spike_scope: scope.included_units,
    };

    // 3. Phase 1C.5h records Gate 8 state as SUSPENDED
    const suspendResult = stateMachine.suspendAuthorization({
      decisionId: activeDecision.decision_id,
      changeReason: "Canary telemetry stop criteria breached: high-output active pickups clip input stage.",
      triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
      authorizingOfficial: CANONICAL_OFFICIAL,
      authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
    });
    assert.strictEqual(suspendResult.success, true);
    assert.strictEqual(suspendResult.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.getAuthorizationState(activeDecision.decision_id).currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
    assert.strictEqual(stateMachine.isAuthorizationActive(activeDecision.decision_id), false);

    // 4. Exact Authority Separation:
    // Phase 1C.5h notifies Phase 1C.5g; Phase 1C.5g owns and executes rollback/routing response.
    // Phase 1C.5h does NOT execute operational rollback internally.
    const dispatchedSignals: OperationalRollbackSignal[] = [];
    let operationalRollbackExecutedBy1C5g = false;
    let baselineTrafficReinstatedBy1C5g = false;

    const phase1C5gSignalPort: OperationalSignalPort = {
      async signalRollback(signal: OperationalRollbackSignal): Promise<OperationalSignalAck> {
        dispatchedSignals.push(signal);
        // Phase 1C.5g physically executes the operational traffic drain and route reversion
        operationalRollbackExecutedBy1C5g = true;
        baselineTrafficReinstatedBy1C5g = true;
        return {
          acknowledged: true,
          dispatchId: `disp_1c5g_ack_${signal.decisionId}`,
          timestamp: new Date().toISOString(),
          note: "Phase 1C.5g operational router drained Canary traffic and reinstated baseline release.",
        };
      },
      async signalCanaryPause(signal: CanaryPauseSignal): Promise<OperationalSignalAck> {
        return {
          acknowledged: true,
          dispatchId: `disp_1c5g_pause_${signal.decisionId}`,
          timestamp: new Date().toISOString(),
        };
      },
    };

    const rollbackSignal: OperationalRollbackSignal = {
      decisionId: activeDecision.decision_id,
      versionBindingId: binding.binding_id,
      affectedScope: scope.included_units,
      reason: "Canary stop criteria breached: active pickup input clipping anomaly.",
      requestedAt: new Date().toISOString(),
      triggerSource: "TRIGGER-10",
      breachedMetricSummary: "THD and clipping ratio 18% on active-pickup inputs exceeding 2% limit",
    };

    const ack = await phase1C5gSignalPort.signalRollback(rollbackSignal);
    assert.strictEqual(ack.acknowledged, true);
    assert.strictEqual(dispatchedSignals.length, 1);
    assert.strictEqual(dispatchedSignals[0].decisionId, activeDecision.decision_id);
    assert.strictEqual(operationalRollbackExecutedBy1C5g, true);
    assert.strictEqual(baselineTrafficReinstatedBy1C5g, true);

    // Invariant confirmed:
    // PHASE 1C.5h SUSPENDS AUTHORIZATION. PHASE 1C.5g EXECUTES THE GOVERNED OPERATIONAL RESPONSE.

    // 5. Active-pickup domain remains UNTESTED until fixture coverage exists
    // The lab fixture declared scope does not cover active pickup domain
    assert.strictEqual(labPassiveFixture.declared_applicability_scope.includes("guitar:pickup:active_humbucker"), false);

    // 6. Appropriate fixture, retest, and remand records are generated
    // Defect remand to Golden Fixture Curation for missing test coverage
    const { attribution, remand } = harness.attributeAndRemand({
      failureInput: {
        executionRecord: execLab,
        scopeRecord: scope,
        symptomDetails: {
          title: "Missing Active Pickup Golden Fixture Coverage",
          symptom: "Lab Golden Stems lacked high-output active pickups, allowing input buffer clipping to escape lab validation.",
        },
        explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        explicitConfidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
        gate8Blocked: true,
      },
      versionBinding: binding,
      validationCase: vCaseLab,
      fixtureRecord: labPassiveFixture,
      objectiveEvidenceRecord: objLab,
    });

    assert.strictEqual(attribution.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.strictEqual(remand.package.routing.remandClass, "FIXTURE_REMAND");
    assert.strictEqual(remand.package.routing.remandDestination, "Golden Fixture Curation Team");

    // Curated active pickup fixture record is generated
    const activePickupFixture = createBaselineFixtureRecord({
      fixture_id: "fix_scen19_active_humbucker",
      fixture_name: "Active Humbucker 9V Preamp DI Stem",
      fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
      declared_applicability_scope: ["guitar:amp:5150_lead", "guitar:pickup:active_humbucker"],
      calibration_spec: "AES17_COMPLIANT_-18LUFS_WITH_HEADROOM_SAFETY",
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    });
    assert.ok(activePickupFixture.declared_applicability_scope.includes("guitar:pickup:active_humbucker"));

    // Retest plan triggered for active-pickup verification
    const triggerResult = harness.triggerDetector.detectTrigger({
      priorBinding: binding,
      newBinding: binding,
      scopeRecord: scope,
      changeEvent: canaryAnomalyEvent,
      graph: harness.graph,
    });
    assert.strictEqual(
      triggerResult.primaryTriggerSource,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE
    );
    assert.strictEqual(triggerResult.triggerRecord.required_action, REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8);
  });

  // ---------------------------------------------------------------------------
  // Scenario 20: Gate 8 Package Contains Conflicting Evidence and Unresolved Uncertainty
  // Context: A release candidate package exhibits reviewer listening disagreement, an untested
  //          active-pickup edge domain recorded as explicit uncertainty, and unverified rollback.
  // Conflicting Evidence: Unresolved reviewer listening disagreement is preserved without inventing synthetic blockers.
  // Uncertainty: Untested active-pickup scope recorded as ValidationUncertaintyRecord (BLOCK-08 critical uncertainty).
  // Rollback: Incomplete/unverified rollback verification recorded (BLOCK-03).
  // Production Readiness: Production readiness is DEFICIENT; Gate 8 rejected/remanded.
  // Blocker Traceability: Complete canonical blocker and uncertainty catalogue remains fully traceable.
  // ---------------------------------------------------------------------------
  it("Scenario 20: Gate 8 Package Contains Conflicting Evidence and Unresolved Uncertainty", () => {
    const scope = createBaselineScopeRecord({
      scope_id: "scope_scen20_high_gain",
      included_units: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    });
    const binding = createBaselineVersionBindingRecord(scope.scope_id);
    const fixture = createBaselineFixtureRecord({
      declared_applicability_scope: scope.included_units,
    });
    const vCase = createBaselineValidationCase({
      case_id: "case_scen20_5150",
      associated_fixture_set: [fixture.fixture_id],
      validation_subject: "guitar:amp:5150_lead",
    });
    const exec = createBaselineExecutionRecord({
      execution_id: "exec_scen20_5150",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });
    const execExport = createBaselineExecutionRecord({
      execution_id: "exec_scen20_export",
      case_id: vCase.case_id,
      fixture_id: fixture.fixture_id,
      binding_id: binding.binding_id,
      profile_id: "profile:03_target_platform_export",
      outcome: EXECUTION_OUTCOMES.COMPLETED,
    });

    const objectiveEvidence = createBaselineObjectiveEvidence({
      objective_evidence_id: "obj_scen20_5150",
      execution_id: exec.execution_id,
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    });

    // 1. Reviewer listening disagreement: Reviewer A passes, Reviewer B rejects
    const percReviewerA = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen20_lead_engineer_pass",
      execution_id: exec.execution_id,
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      evaluator_id: "eval_lead_sound_engineer",
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      perceptual_dimensions_evaluated: { tonal_balance: 8.5 },
      qualitative_observations: "High-gain articulation satisfies reference criteria.",
    });

    const percReviewerB = createBaselinePerceptualEvaluation({
      perceptual_evidence_id: "perc_scen20_producer_fail",
      execution_id: exec.execution_id,
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
      evaluator_id: "eval_external_golden_ear",
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      perceptual_dimensions_evaluated: { tonal_balance: 5.0 },
      qualitative_observations: "Excessive high-frequency fizz at 6.5kHz causes ear fatigue.",
    });

    const pkg = createBaselinePackageRecord(scope.scope_id, binding.binding_id, {
      package_id: "pkg_scen20",
      validation_case_refs: [vCase.case_id],
      execution_record_refs: [exec.execution_id, execExport.execution_id],
      evidence_refs: [
        objectiveEvidence.objective_evidence_id,
        percReviewerA.perceptual_evidence_id,
        percReviewerB.perceptual_evidence_id,
      ],
    });

    // Unresolved listening disagreement remains preserved via EvidenceConflictDetector
    const conflictResult = harness.conflictDetector.recordDisagreement({
      packageRecord: pkg,
      conflictType: CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
      competingEvidenceRefs: [percReviewerA.perceptual_evidence_id, percReviewerB.perceptual_evidence_id],
      conflictDetectionProfileRef: "conflict_detection_spec:acoustic:default",
      conflictDescription: "Split expert listening evaluation: Lead Sound Engineer passed articulation while Golden Ear Producer rejected 6.5kHz fizz.",
      underlyingAcousticPhenomenon: "High-frequency resonance trade-off between pick attack presence and smooth decay.",
      customResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
    });

    assert.strictEqual(conflictResult.hasConflict, true);
    assert.strictEqual(conflictResult.record?.conflict_type, CONFLICT_TYPES.EVALUATOR_DISAGREEMENT);
    assert.strictEqual(conflictResult.record?.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);

    // 2. Untested active-pickup scope remains explicit uncertainty
    const activePickupUncertainty: ValidationUncertaintyRecord = {
      uncertainty_id: "unc_scen20_active_pickups",
      package_id: pkg.package_id,
      uncertainty_source: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
      affected_scope: ["guitar:amp:5150_lead"],
      potential_production_risk: "Critical tone safety risk: active pickup output level may saturate input buffer and cause clipping in live audio performance.",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      required_monitoring_if_authorized: ["Input stage clipping telemetry"],
    };

    // 3. Rollback verification remains incomplete
    const incompleteRollback = createBaselineRollbackEvidence(false, {
      rollback_verified: false,
      path_rollback_verified_under_load: false,
      recovery_time_objective_met: false,
      failure_reason: "Automated rollback drill timed out under simulated 500 req/sec load.",
    });

    // 4. Validation Outcome Synthesis: Evaluator disagreement preserved
    const outcomeResult = harness.outcomeSynthesizer.synthesizeOutcome({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBindingRecord: binding,
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvidence: [percReviewerA, percReviewerB],
      conflictRecords: [conflictResult.record!],
      uncertaintyRecords: [activePickupUncertainty],
      rollbackOperationalityVerified: false,
    });
    assert.strictEqual(outcomeResult.outcomeRecord.outcome_class, VALIDATION_OUTCOME_CLASSES.FAIL);

    // 5. Production Readiness Synthesis:
    // Only canonical blockers evaluated where factual predicates are satisfied:
    // - BLOCK-03 for incomplete/unverified rollback
    // - BLOCK-08 for critical uncertainty forces-block
    // No blocker invented for reviewer disagreement itself!
    const readinessInput: ProductionReadinessSynthesisInput = {
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      validationOutcome: outcomeResult.outcomeRecord,
      fixtureRecords: [fixture],
      executionRecords: [exec, execExport],
      objectiveEvidence: [objectiveEvidence],
      perceptualEvaluations: [percReviewerA, percReviewerB],
      uncertaintyRecords: [activePickupUncertainty],
      evidenceConflicts: [conflictResult.record!],
      rollbackEvidence: incompleteRollback,
      upstreamGovernanceState: createBaselineUpstreamGovernance(),
    };

    const blockerCheck = harness.checkHardBlockers(readinessInput);
    assert.ok(blockerCheck.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.ok(blockerCheck.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY));
    assert.strictEqual(blockerCheck.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN), false);
    assert.strictEqual(blockerCheck.hardBlockersPresent.length, 2);

    const readinessResult = harness.evaluateReadiness(readinessInput);
    assert.strictEqual(readinessResult.assessmentRecord.gate_8_eligible, false);
    assert.strictEqual(
      readinessResult.pillarEvaluations.rollback_safety_readiness,
      PILLAR_READINESS_STATUSES.DEFICIENT
    );
    assert.ok(readinessResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.ok(readinessResult.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY));

    // 6. Gate 8 Adjudication: REJECTED / Remanded
    const gate8Result = harness.adjudicateGate8({
      packageRecord: pkg,
      readinessAssessmentRecord: readinessResult.assessmentRecord,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: CANONICAL_OFFICIAL,
    });

    assert.strictEqual(gate8Result.isAuthorized, false);
    assert.strictEqual(gate8Result.decisionOutcome, ADOPTION_DECISION_OUTCOMES.REJECTED);
    assert.strictEqual(gate8Result.authorizedScope.length, 0);
    assert.ok(gate8Result.decisionRecord.conditions_and_restrictions.some((c) => c.includes("Production cutover rejected")));

    // 7. Complete blocker and uncertainty catalogue remains traceable
    assert.strictEqual(readinessInput.uncertaintyRecords?.length, 1);
    assert.strictEqual(readinessInput.uncertaintyRecords?.[0].uncertainty_id, activePickupUncertainty.uncertainty_id);
    assert.strictEqual(conflictResult.record?.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);
  });
});
