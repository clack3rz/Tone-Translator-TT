// src/tests/productionReadinessAssessment.test.ts
// Comprehensive focused verification suite for Phase 1C.5h WP-21:
// Four-Pillar Production Readiness Assessment Synthesis (Record 20).
// Bound to frozen specification v0.1j Section 25, Table 12, Table 13, and Implementation Plan v0.1h WP-21.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  MATERIALITY_SCORES,
  MUSICAL_FITNESS_VERDICTS,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_METHODOLOGIES,
  PILLAR_READINESS_STATUSES,
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
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ProductionReadinessAssessmentRecord,
  productionReadinessAssessmentRecordSchema,
  RegressionAssessmentRecord,
  RevalidationTriggerRecord,
  UATEvaluationRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../sound-engineer/validation/binding";
import {
  FROZEN_HARD_BLOCKERS,
  ProductionReadinessSynthesisInput,
  RollbackVerificationEvidence,
  UpstreamGovernanceState,
  ProductionReadinessSynthesizer,
  ReadinessContextValidationError,
  deriveDeterministicReadinessId,
} from "../sound-engineer/validation/readiness";

// ---------------------------------------------------------------------------
// Standard Test Fixtures & Factories
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

function createValidBinding(scopeId: string = "scope_lead_5150_v1"): ValidationVersionBindingRecord {
  const archProvider = new StaticArchitectureIntegrityReferenceProvider(
    TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  );
  const bindingService = new VersionBindingService(
    undefined,
    undefined,
    undefined,
    archProvider
  );
  const dummyScope = createTestScope({ scope_id: scopeId });
  return bindingService.bindVersions(dummyScope, {
    runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
    model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
    deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
    gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
    platform_exporter_version: "stage12_serializer_digest_9a8b7c",
    fixture_library_version: "golden_stems_manifest_digest_def456",
    target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
    host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  });
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
    profile_id: "profile:03_target_platform_export",
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
    measured_parameters: { delta_db: 0.25 },
    applied_threshold_profile_ref: "profile_acoustic_strict",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.25,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: [],
    ...overrides,
  };
}

function createTestPerceptualEvidence(overrides?: Partial<PerceptualEvaluationRecord>): PerceptualEvaluationRecord {
  return {
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
    ...overrides,
  };
}

function createTestUATEvaluation(overrides?: Partial<UATEvaluationRecord>): UATEvaluationRecord {
  return {
    uat_id: "uat_01",
    package_id: "pkg_5150_validation_01",
    evaluator_persona: "SESSION_GUITARIST",
    task_scenario_id: "scenario_crunch_solo",
    task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
    task_duration_seconds: 120,
    workflow_satisfaction_rating: 9.5,
    cognitive_friction_notes: "None",
    musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
    uat_blockers_identified: [],
    ...overrides,
  };
}

function createTestFixture(overrides?: Partial<ValidationFixtureRecord>): ValidationFixtureRecord {
  return {
    fixture_id: "fix_01",
    fixture_name: "Clean DI Stems",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "1.0.0",
    payload_integrity_ref: "sha256:fix_payload_01",
    declared_applicability_scope: ["guitar:amp:5150_lead"],
    provenance_metadata: {
      recording_engineer: "Lead Sound Engineer",
    },
    calibration_spec: "AES17_COMPLIANT_-18LUFS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
    ...overrides,
  };
}

function createValidRollbackEvidence(overrides?: Partial<RollbackVerificationEvidence>): RollbackVerificationEvidence {
  return {
    rollback_verified: true,
    path_prod_isolated: true,
    path_rollback_verified_under_load: true,
    recovery_time_objective_met: true,
    telemetry_stop_criteria_configured: true,
    verification_timestamp: "2026-03-20T12:45:00Z",
    evidence_ref: "cert_rollback_verified_load_test_01",
    ...overrides,
  };
}

function createValidUpstreamGovernance(overrides?: Partial<UpstreamGovernanceState>): UpstreamGovernanceState {
  return {
    reasoning_lifecycle_stages_completed: 14,
    principles_complied: true,
    causal_explainability_verified: true,
    provenance_intact: true,
    ungrounded_reasoning_detected: false,
    candidate_lesson_quarantined: true,
    upstream_violations: [],
    ...overrides,
  };
}

function createPristineInput(overrides?: Partial<ProductionReadinessSynthesisInput>): ProductionReadinessSynthesisInput {
  const scope = createTestScope();
  const binding = createValidBinding(scope.scope_id);
  const pkg = createTestPackage({
    scope_record_ref: scope.scope_id,
    version_binding_ref: binding.binding_id,
  });

  const objAcoustic = createTestObjectiveEvidence();
  const objExport = createTestObjectiveEvidence({
    objective_evidence_id: "obj_export_01",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
    measured_parameters: { preset_serialization_valid: 1 },
    measured_delta: 0,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
  });
  const perc = createTestPerceptualEvidence();
  const uat = createTestUATEvaluation();
  const exec = createTestExecution({ binding_id: binding.binding_id });
  const fix = createTestFixture();

  return {
    packageRecord: pkg,
    scopeRecord: scope,
    requestedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    versionBinding: binding,
    objectiveEvidence: [objAcoustic, objExport],
    perceptualEvaluations: [perc],
    uatEvaluations: [uat],
    executionRecords: [exec],
    fixtureRecords: [fix],
    rollbackEvidence: createValidRollbackEvidence(),
    upstreamGovernanceState: createValidUpstreamGovernance(),
    timestamp: "2026-03-20T13:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WP-21 Test Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h — WP-21: Four-Pillar Production Readiness Assessment Synthesis (Record 20)", () => {
  const synthesizer = new ProductionReadinessSynthesizer();

  // -------------------------------------------------------------------------
  // 1. Pristine Baseline & Strict Boolean 4/4 SATISFIED Evaluation
  // -------------------------------------------------------------------------
  it("01: Pristine candidate evaluates all 4 pillars SATISFIED, 0 hard blockers, and gate_8_eligible === true", () => {
    const input = createPristineInput();
    const result = synthesizer.synthesizeProductionReadiness(input);

    assert.equal(result.gate8Eligible, true);
    assert.equal(result.hardBlockersPresent.length, 0);

    assert.equal(result.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.SATISFIED);
    assert.equal(result.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.SATISFIED);
    assert.equal(result.pillarEvaluations.platform_operational_readiness, PILLAR_READINESS_STATUSES.SATISFIED);
    assert.equal(result.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.SATISFIED);

    assert.equal(result.assessmentRecord.gate_8_eligible, true);
    assert.deepEqual(result.assessmentRecord.hard_blockers_present, []);
    assert.ok(result.assessmentRecord.readiness_assessment_id.startsWith("readiness_"));
    assert.equal(result.assessmentRecord.package_id, input.packageRecord.package_id);
    assert.match(result.synthesisRationale, /Gate 8 Pre-Adjudication Eligibility: ELIGIBLE/);

    // Schema validation compliance
    const parsed = productionReadinessAssessmentRecordSchema.safeParse(result.assessmentRecord);
    assert.equal(parsed.success, true);
  });

  // -------------------------------------------------------------------------
  // 2. Strict Boolean Rule: ANY pillar not SATISFIED -> gate_8_eligible === false
  // -------------------------------------------------------------------------
  it("02: Fails Gate 8 eligibility if any single pillar is DEFICIENT or INCONCLUSIVE even with 0 hard blockers", () => {
    // Acoustic deficient
    const inputDef = createPristineInput({
      objectiveEvidence: [
        createTestObjectiveEvidence({
          objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
        }),
        createTestObjectiveEvidence({
          objective_evidence_id: "obj_export_01",
          metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
          objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
        }),
      ],
    });
    const resDef = synthesizer.synthesizeProductionReadiness(inputDef);
    assert.equal(resDef.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
    assert.equal(resDef.gate8Eligible, false);
    assert.equal(resDef.assessmentRecord.gate_8_eligible, false);

    // Governance inconclusive (missing upstream governance state)
    const inputInc = createPristineInput({
      upstreamGovernanceState: undefined,
    });
    const resInc = synthesizer.synthesizeProductionReadiness(inputInc);
    assert.equal(resInc.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resInc.gate8Eligible, false);
  });

  // -------------------------------------------------------------------------
  // 3. Hard Blocker 1: Unresolved material genuine regression in scope
  // -------------------------------------------------------------------------
  it("03: BLOCKER-01: only GENUINE_REGRESSION triggers blocker; INTENTIONAL_CORRECTION, NEUTRAL, UNRESOLVED do not", () => {
    // Case A: Confirmed GENUINE_REGRESSION in scope triggers Blocker 1
    const genuineRegression: RegressionAssessmentRecord = {
      regression_id: "reg_01",
      package_id: "pkg_5150_validation_01",
      comparison_target: "v1.0.0_baseline",
      divergence_detected: true,
      divergence_magnitude: 4.5,
      classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
      materiality_score: MATERIALITY_SCORES.HIGH,
      affected_scope: ["guitar:amp:5150_lead"],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "Severe loss of low-end punch under palm muting.",
      blocks_gate_8: true,
    };

    const inputGenuine = createPristineInput({
      regressionAssessments: [genuineRegression],
    });
    const resGenuine = synthesizer.synthesizeProductionReadiness(inputGenuine);
    assert.equal(resGenuine.gate8Eligible, false);
    assert.ok(resGenuine.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION));
    assert.equal(resGenuine.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // Case B: INTENTIONAL_CORRECTION does NOT trigger Blocker 1 and does NOT fail Pillar 4
    const intentionalCorrection: RegressionAssessmentRecord = {
      ...genuineRegression,
      regression_id: "reg_intentional",
      classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      blocks_gate_8: false,
    };
    const inputIntentional = createPristineInput({
      regressionAssessments: [intentionalCorrection],
    });
    const resIntentional = synthesizer.synthesizeProductionReadiness(inputIntentional);
    assert.ok(!resIntentional.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION));
    assert.equal(resIntentional.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.SATISFIED);

    // Case C: NEUTRAL divergence does NOT trigger Blocker 1
    const neutralDivergence: RegressionAssessmentRecord = {
      ...genuineRegression,
      regression_id: "reg_neutral",
      classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
      blocks_gate_8: false,
    };
    const inputNeutral = createPristineInput({
      regressionAssessments: [neutralDivergence],
    });
    const resNeutral = synthesizer.synthesizeProductionReadiness(inputNeutral);
    assert.ok(!resNeutral.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION));

    // Case D: UNRESOLVED divergence does NOT trigger Blocker 1, but forces Pillar 4 INCONCLUSIVE
    const unresolvedDivergence: RegressionAssessmentRecord = {
      ...genuineRegression,
      regression_id: "reg_unresolved",
      classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
      blocks_gate_8: false,
    };
    const inputUnresolved = createPristineInput({
      regressionAssessments: [unresolvedDivergence],
    });
    const resUnresolved = synthesizer.synthesizeProductionReadiness(inputUnresolved);
    assert.ok(!resUnresolved.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION));
    assert.equal(resUnresolved.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resUnresolved.gate8Eligible, false); // Fails closed due to INCONCLUSIVE pillar
  });

  // -------------------------------------------------------------------------
  // 4. Hard Blocker 2: Target-platform preset export failure, crash, or corruption
  // -------------------------------------------------------------------------
  it("04: BLOCKER-02 immediately disqualifies Gate 8 on preset export failure, crash, or corruption", () => {
    // Case A: Objective export failure
    const inputObjFail = createPristineInput({
      objectiveEvidence: [
        createTestObjectiveEvidence(),
        createTestObjectiveEvidence({
          objective_evidence_id: "obj_export_bad",
          metric_category: OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
          measured_parameters: { preset_serialization_valid: 0 },
          measured_delta: -1,
          objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
        }),
      ],
    });
    const resObj = synthesizer.synthesizeProductionReadiness(inputObjFail);
    assert.equal(resObj.gate8Eligible, false);
    assert.ok(resObj.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION));
    assert.equal(resObj.pillarEvaluations.platform_operational_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // Case B: Execution crash in export profile
    const inputCrash = createPristineInput({
      executionRecords: [
        createTestExecution({
          profile_id: "profile:03_target_platform_export",
          outcome: EXECUTION_OUTCOMES.FAILED,
        }),
      ],
    });
    const resCrash = synthesizer.synthesizeProductionReadiness(inputCrash);
    assert.equal(resCrash.gate8Eligible, false);
    assert.ok(resCrash.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION));
  });

  // -------------------------------------------------------------------------
  // 5. Hard Blocker 3: Failure or unverified state of automated rollback (PATH-ROLLBACK)
  // -------------------------------------------------------------------------
  it("05: BLOCKER-03 fails closed on unsupplied, failed, or stale rollback evidence", () => {
    // Case A: Unsupplied rollback evidence (fails closed)
    const inputMissing = createPristineInput({
      rollbackEvidence: undefined,
    });
    const resMissing = synthesizer.synthesizeProductionReadiness(inputMissing);
    assert.equal(resMissing.gate8Eligible, false);
    assert.ok(resMissing.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal(resMissing.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);

    // Case B: Explicit rollback verification failure
    const inputFailed = createPristineInput({
      rollbackEvidence: createValidRollbackEvidence({
        rollback_verified: false,
        failure_reason: "Automated failover script timed out at 45 seconds (> 30s SLA)",
      }),
    });
    const resFailed = synthesizer.synthesizeProductionReadiness(inputFailed);
    assert.equal(resFailed.gate8Eligible, false);
    assert.ok(resFailed.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal(resFailed.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // Case C: Unverified under load
    const inputLoad = createPristineInput({
      rollbackEvidence: createValidRollbackEvidence({
        path_rollback_verified_under_load: false,
      }),
    });
    const resLoad = synthesizer.synthesizeProductionReadiness(inputLoad);
    assert.equal(resLoad.gate8Eligible, false);
    assert.ok(resLoad.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));

    // Case D: Stale rollback evidence marked stale via typed boundary
    const inputStaleRb = createPristineInput({
      rollbackEvidence: createValidRollbackEvidence({
        is_stale: true,
      }),
    });
    const resStaleRb = synthesizer.synthesizeProductionReadiness(inputStaleRb);
    assert.equal(resStaleRb.gate8Eligible, false);
    assert.ok(resStaleRb.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal(resStaleRb.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // Case E: Rollback evidence with mismatched version binding
    const inputMismatchRb = createPristineInput({
      rollbackEvidence: createValidRollbackEvidence({
        version_binding_ref: "binding_obsolete_previous_v0",
      }),
    });
    const resMismatchRb = synthesizer.synthesizeProductionReadiness(inputMismatchRb);
    assert.equal(resMismatchRb.gate8Eligible, false);
    assert.ok(resMismatchRb.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal(resMismatchRb.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
  });

  // -------------------------------------------------------------------------
  // 6. Hard Blocker 4: Missing, broken, or unverifiable Phase 1C.5f provenance / traceability
  // -------------------------------------------------------------------------
  it("06: BLOCKER-04: provenance failure triggers blocker; tampered binding fails closed in context validator", () => {
    // Case A: Broken RunTrace lineage in upstream governance triggers Blocker 4
    const inputBrokenTrace = createPristineInput({
      upstreamGovernanceState: createValidUpstreamGovernance({
        provenance_intact: false,
      }),
    });
    const resTrace = synthesizer.synthesizeProductionReadiness(inputBrokenTrace);
    assert.equal(resTrace.gate8Eligible, false);
    assert.ok(resTrace.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN));
    assert.equal(resTrace.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // Case B: Tampered version binding digest fails closed before synthesis in context validation
    const tamperedBinding = {
      ...createValidBinding(),
      version_integrity_reference: {
        composite_digest: "sha256:forged_digest_000000000000",
        algorithm: "SHA-256" as const,
        sealed_at: "2026-03-20T12:00:00Z",
      },
    };
    const inputTampered = createPristineInput({
      versionBinding: tamperedBinding,
    });
    assert.throws(
      () => synthesizer.synthesizeProductionReadiness(inputTampered),
      ReadinessContextValidationError
    );

    // Case C: Valid binding + valid provenance evaluates cleanly
    const inputClean = createPristineInput();
    const resClean = synthesizer.synthesizeProductionReadiness(inputClean);
    assert.ok(!resClean.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN));
  });

  // -------------------------------------------------------------------------
  // 7. Hard Blocker 5: Contaminated, miscalibrated, or missing Golden fixtures & SUSPECT handling
  // -------------------------------------------------------------------------
  it("07: BLOCKER-05: CONTAMINATED or INVALIDATED triggers Blocker 5; active SUSPECT forces INCONCLUSIVE pillar", () => {
    // Case A: Confirmed CONTAMINATED fixture triggers Blocker 5
    const inputContam = createPristineInput({
      fixtureRecords: [
        createTestFixture({
          contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
        }),
      ],
    });
    const resContam = synthesizer.synthesizeProductionReadiness(inputContam);
    assert.equal(resContam.gate8Eligible, false);
    assert.ok(resContam.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING));

    // Case B: Miscalibrated / INVALIDATED fixture triggers Blocker 5
    const inputInval = createPristineInput({
      fixtureRecords: [
        createTestFixture({
          lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
        }),
      ],
    });
    const resInval = synthesizer.synthesizeProductionReadiness(inputInval);
    assert.equal(resInval.gate8Eligible, false);
    assert.ok(resInval.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING));

    // Case C: Active SUSPECT fixture (quarantine pending verification) does NOT trigger Blocker 5,
    // but forces Pillar 1 to INCONCLUSIVE (fail-closed, gate_8_eligible === false)
    const inputSuspect = createPristineInput({
      fixtureRecords: [
        createTestFixture({
          contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
          lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
        }),
      ],
    });
    const resSuspect = synthesizer.synthesizeProductionReadiness(inputSuspect);
    assert.ok(!resSuspect.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING));
    assert.equal(resSuspect.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resSuspect.gate8Eligible, false);
    assert.match(resSuspect.synthesisRationale, /flagged SUSPECT/);
  });

  // -------------------------------------------------------------------------
  // 8. Hard Blocker 6: Requested authorization scope broader than tested scope (Scope Inflation)
  // -------------------------------------------------------------------------
  it("08: BLOCKER-06 prohibits scope inflation when requested scope exceeds tested boundaries", () => {
    // Requesting unit not in included_units
    const inputInflated = createPristineInput({
      requestedScope: [
        "guitar:amp:5150_lead",
        "guitar:cab:4x12_greenback",
        "guitar:pedal:untested_tube_screamer", // Not in scopeRecord.included_units
      ],
    });
    const resInflated = synthesizer.synthesizeProductionReadiness(inputInflated);
    assert.equal(resInflated.gate8Eligible, false);
    assert.ok(resInflated.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION));

    // Requesting explicitly excluded unit
    const inputExcluded = createPristineInput({
      requestedScope: ["bass:amp:svt_classic"], // In scopeRecord.excluded_units
    });
    const resExcluded = synthesizer.synthesizeProductionReadiness(inputExcluded);
    assert.equal(resExcluded.gate8Eligible, false);
    assert.ok(resExcluded.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION));

    // Valid subset contained in tested scope does not trigger Blocker 6
    const inputSubset = createPristineInput({
      requestedScope: ["guitar:amp:5150_lead"],
    });
    const resSubset = synthesizer.synthesizeProductionReadiness(inputSubset);
    assert.ok(!resSubset.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION));
  });

  // -------------------------------------------------------------------------
  // 9. Hard Blocker 7: Unresolved critical uncertainty regarding production tone safety
  // -------------------------------------------------------------------------
  it("09: BLOCKER-07 disqualifies Gate 8 on unresolved critical uncertainty; benign does not", () => {
    const criticalUncertainty: ValidationUncertaintyRecord = {
      uncertainty_id: "unc_01",
      package_id: "pkg_5150_validation_01",
      uncertainty_source: UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY,
      affected_scope: ["guitar:amp:5150_lead"],
      potential_production_risk: "Critical tone safety: potential audio burst / high gain oscillation on patch switch",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      required_monitoring_if_authorized: [],
    };

    const input = createPristineInput({
      uncertaintyRecords: [criticalUncertainty],
    });
    const result = synthesizer.synthesizeProductionReadiness(input);
    assert.equal(result.gate8Eligible, false);
    assert.ok(result.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_07_CRITICAL_TONE_UNCERTAINTY));

    // Low acceptable risk uncertainty does not trigger BLOCKER-07
    const lowRiskUncertainty: ValidationUncertaintyRecord = {
      ...criticalUncertainty,
      uncertainty_id: "unc_low",
      potential_production_risk: "Negligible noise floor difference under 96kHz",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
    };
    const inputLow = createPristineInput({
      uncertaintyRecords: [lowRiskUncertainty],
    });
    const resLow = synthesizer.synthesizeProductionReadiness(inputLow);
    assert.ok(!resLow.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_07_CRITICAL_TONE_UNCERTAINTY));
  });

  // -------------------------------------------------------------------------
  // 10. Hard Blocker 8: Unresolved upstream architectural violation across Phases 1C.5a-g
  // -------------------------------------------------------------------------
  it("10: BLOCKER-08 disqualifies Gate 8 on active upstream violations or ungrounded reasoning", () => {
    // Case A: Active upstream violations list
    const inputViol = createPristineInput({
      upstreamGovernanceState: createValidUpstreamGovernance({
        upstream_violations: ["1C.5d Stage 7 Acoustic Hypothesis Contract Violation"],
      }),
    });
    const resViol = synthesizer.synthesizeProductionReadiness(inputViol);
    assert.equal(resViol.gate8Eligible, false);
    assert.ok(resViol.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION));

    // Case B: Fabricated intervention reasoning
    const inputFab = createPristineInput({
      upstreamGovernanceState: createValidUpstreamGovernance({
        ungrounded_reasoning_detected: true,
      }),
    });
    const resFab = synthesizer.synthesizeProductionReadiness(inputFab);
    assert.equal(resFab.gate8Eligible, false);
    assert.ok(resFab.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION));

    // Case C: Candidate lesson quarantine breach
    const inputQuarantine = createPristineInput({
      upstreamGovernanceState: createValidUpstreamGovernance({
        candidate_lesson_quarantined: false,
      }),
    });
    const resQuarantine = synthesizer.synthesizeProductionReadiness(inputQuarantine);
    assert.equal(resQuarantine.gate8Eligible, false);
    assert.ok(resQuarantine.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION));
  });

  // -------------------------------------------------------------------------
  // 11. WP-20 Invalidation Tracing & Stale Evidence Inconclusiveness
  // -------------------------------------------------------------------------
  it("11: Canonical INVALIDATED_BY respects exact endpoints; stale evidence detected via governed lineage", () => {
    const graph = new ValidationRelationshipGraph();

    // 1. Verify exact canonical INVALIDATED_BY contract: rejects non-permitted sources
    graph.registerNode({ id: "obj_test", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord });
    graph.registerNode({ id: "perc_test", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord });
    graph.registerNode({ id: "uat_test", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord });
    graph.registerNode({ id: "reg_test", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord });
    graph.registerNode({ id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord });

    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "obj_test", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          target: { id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
        }),
      InvalidEndpointError
    );

    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "perc_test", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
          target: { id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
        }),
      InvalidEndpointError
    );

    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "uat_test", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
          target: { id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
        }),
      InvalidEndpointError
    );

    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "reg_test", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
          target: { id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
        }),
      InvalidEndpointError
    );

    // Scenario A: Historical PASS outcome invalidated canonically
    // Canonical: ValidationOutcomeRecord -> RevalidationTriggerRecord
    const outcome: ValidationOutcomeRecord = {
      outcome_id: "outcome_5150_v1",
      package_id: "pkg_5150_validation_01",
      outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
      evaluated_scope: "guitar:amp:5150_lead",
      version_binding: "binding_2026_5150_v1",
      summary_verdict: "Prior pass verdict",
      objective_summary: {},
      perceptual_summary: {},
      uat_summary: {},
      regression_summary: {},
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-03-20T10:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:outcome_seal",
        algorithm: "SHA-256",
        sealed_at: "2026-03-20T10:00:00Z",
      },
    };

    graph.registerNode({ id: outcome.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord });
    graph.addEdge({
      source: { id: outcome.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
      target: { id: "trig_test", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
    });

    // Historical record payload remains untouched (PASS preserved)
    assert.equal(outcome.outcome_class, VALIDATION_OUTCOME_CLASSES.PASS);
    assert.equal(outcome.summary_verdict, "Prior pass verdict");

    // But current readiness synthesis cannot use it as positive proof
    const inputWithOutcome = createPristineInput({
      graph,
      validationOutcome: outcome,
    });
    const resultOutcome = synthesizer.synthesizeProductionReadiness(inputWithOutcome);
    assert.equal(resultOutcome.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resultOutcome.gate8Eligible, false);
    assert.match(resultOutcome.synthesisRationale, /invalidated by a revalidation trigger/);

    // Scenario B: Objective evidence associated with stale validation context (via execution binding mismatch)
    // Result: cannot support SATISFIED readiness; no direct INVALIDATED_BY edge from ObjectiveEvidenceRecord created
    const inputMismatchedObj = createPristineInput({
      executionRecords: [
        createTestExecution({
          execution_id: "exec_obsolete_01",
          binding_id: "binding_obsolete_matrix_v0", // does not match active binding
        }),
      ],
      objectiveEvidence: [
        createTestObjectiveEvidence({
          execution_id: "exec_obsolete_01",
        }),
      ],
    });
    const resMismatchedObj = synthesizer.synthesizeProductionReadiness(inputMismatchedObj);
    assert.equal(resMismatchedObj.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resMismatchedObj.gate8Eligible, false);

    // Scenario C: Perceptual/UAT evidence associated with stale context
    // Result: cannot support current readiness; no illegal graph edge created
    const inputMismatchedPerc = createPristineInput({
      executionRecords: [
        createTestExecution({
          execution_id: "exec_obsolete_perc",
          binding_id: "binding_obsolete_matrix_v0",
        }),
      ],
      perceptualEvaluations: [
        createTestPerceptualEvidence({
          execution_id: "exec_obsolete_perc",
        }),
      ],
    });
    const resMismatchedPerc = synthesizer.synthesizeProductionReadiness(inputMismatchedPerc);
    assert.equal(resMismatchedPerc.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resMismatchedPerc.gate8Eligible, false);

    const inputMismatchedUat = createPristineInput({
      uatEvaluations: [
        createTestUATEvaluation({
          package_id: "pkg_different_prior_v0", // does not match current package
        }),
      ],
    });
    const resMismatchedUat = synthesizer.synthesizeProductionReadiness(inputMismatchedUat);
    assert.equal(resMismatchedUat.pillarEvaluations.acoustic_musical_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resMismatchedUat.gate8Eligible, false);

    // Scenario D: Rollback evidence stale
    // Result: Blocker 3 present; Pillar 4 not SATISFIED; no rollback-record INVALIDATED_BY edge exists
    const inputStaleRollback = createPristineInput({
      rollbackEvidence: createValidRollbackEvidence({
        is_stale: true,
      }),
    });
    const resStaleRollback = synthesizer.synthesizeProductionReadiness(inputStaleRollback);
    assert.ok(resStaleRollback.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal(resStaleRollback.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
    assert.equal(resStaleRollback.gate8Eligible, false);

    // Scenario E: Fresh rollback evidence
    // Result: satisfies rollback portion when otherwise valid; no WP-27 execution occurs
    const pristineFresh = createPristineInput();
    const resFresh = synthesizer.synthesizeProductionReadiness(pristineFresh);
    assert.equal(resFresh.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.SATISFIED);
    assert.ok(!resFresh.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED));
    assert.equal((synthesizer as any).executeRollback, undefined);
  });

  // -------------------------------------------------------------------------
  // 12. Non-Scalar Rule & Orthogonal Pillars
  // -------------------------------------------------------------------------
  it("12: Strictly adheres to non-scalar rule: zero percentage or weighted scores in Record 20", () => {
    const input = createPristineInput();
    const result = synthesizer.synthesizeProductionReadiness(input);

    const record = result.assessmentRecord as any;
    assert.equal(record.aggregate_score, undefined);
    assert.equal(record.percentage_readiness, undefined);
    assert.equal(record.scalar_rating, undefined);
    assert.equal(record.readiness_percentage, undefined);

    // Only the four canonical evaluations are present
    assert.deepEqual(Object.keys(record.pillar_evaluations).sort(), [
      "acoustic_musical_readiness",
      "platform_operational_readiness",
      "reasoning_governance_readiness",
      "rollback_safety_readiness",
    ].sort());
  });

  // -------------------------------------------------------------------------
  // 13. Audit Ledger and Relationship Graph Integration
  // -------------------------------------------------------------------------
  it("13: Seamlessly integrates with Audit Ledger and Relationship Graph idempotently", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();

    const input = createPristineInput({ graph, auditLedger: ledger });
    const result1 = synthesizer.synthesizeProductionReadiness(input);

    assert.equal(graph.hasNode(result1.assessmentRecord.readiness_assessment_id), true);
    assert.equal(ledger.getEntries().length, 1);
    assert.equal(ledger.getEntries()[0].entityId, result1.assessmentRecord.readiness_assessment_id);

    // Repeated call with same timestamp is idempotent
    const result2 = synthesizer.synthesizeProductionReadiness(input);
    assert.equal(result2.assessmentRecord.readiness_assessment_id, result1.assessmentRecord.readiness_assessment_id);
    assert.equal(ledger.getEntries().length, 1);
  });

  // -------------------------------------------------------------------------
  // 14. Context Validation Fail-Closed
  // -------------------------------------------------------------------------
  it("14: Context validation fails closed on missing packageRecord or missing scopeRecord", () => {
    assert.throws(
      () => synthesizer.synthesizeProductionReadiness(null as any),
      ReadinessContextValidationError
    );
    assert.throws(
      () => synthesizer.synthesizeProductionReadiness({ ...createPristineInput(), packageRecord: null as any }),
      ReadinessContextValidationError
    );
    assert.throws(
      () => synthesizer.synthesizeProductionReadiness({ ...createPristineInput(), scopeRecord: null as any }),
      ReadinessContextValidationError
    );
  });

  // -------------------------------------------------------------------------
  // 15. Exact Record 20 Schema & Field Invariance
  // -------------------------------------------------------------------------
  it("15: Record 20 contains exactly 7 permitted keys; rejects all invented or leaked Record 21 fields", () => {
    const input = createPristineInput();
    const result = synthesizer.synthesizeProductionReadiness(input);
    const record = result.assessmentRecord;

    const allowedKeys = [
      "readiness_assessment_id",
      "package_id",
      "pillar_evaluations",
      "hard_blockers_present",
      "gate_8_eligible",
      "synthesis_rationale",
      "assessment_timestamp",
    ].sort();

    assert.deepEqual(Object.keys(record).sort(), allowedKeys);

    // Confirm no Record 21 concepts leaked into Record 20
    const raw = record as any;
    assert.equal(raw.decision, undefined);
    assert.equal(raw.decision_class, undefined);
    assert.equal(raw.authorized_scope, undefined);
    assert.equal(raw.authorizing_official, undefined);
    assert.equal(raw.conditions_imposed, undefined);
    assert.equal(raw.adjudication_timestamp, undefined);
    assert.equal(raw.cutover_authorized, undefined);
  });

  // -------------------------------------------------------------------------
  // 16. Orthogonality & Zero Pillar Compensation
  // -------------------------------------------------------------------------
  it("16: Strict orthogonality: no pillar can compensate for another", () => {
    // 1. P1 SATISFIED / P2 DEFICIENT / P3 SATISFIED / P4 SATISFIED -> false
    const inP2 = createPristineInput({
      upstreamGovernanceState: createValidUpstreamGovernance({
        ungrounded_reasoning_detected: true,
      }),
    });
    const resP2 = synthesizer.synthesizeProductionReadiness(inP2);
    assert.equal(resP2.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
    assert.equal(resP2.gate8Eligible, false);

    // 2. P1 SATISFIED / P2 SATISFIED / P3 INCONCLUSIVE / P4 SATISFIED -> false
    const inP3 = createPristineInput({
      objectiveEvidence: [createTestObjectiveEvidence()], // missing export & operational evidence
      executionRecords: [],
    });
    const resP3 = synthesizer.synthesizeProductionReadiness(inP3);
    assert.equal(resP3.pillarEvaluations.platform_operational_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resP3.gate8Eligible, false);

    // 3. P1 SATISFIED / P2 SATISFIED / P3 SATISFIED / P4 INCONCLUSIVE -> false
    const inP4 = createPristineInput({
      rollbackEvidence: undefined,
    });
    const resP4 = synthesizer.synthesizeProductionReadiness(inP4);
    assert.equal(resP4.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
    assert.equal(resP4.gate8Eligible, false);
  });

  // -------------------------------------------------------------------------
  // 17. Outcome Class Insufficiency (PASS alone does not grant Gate 8 eligibility)
  // -------------------------------------------------------------------------
  it("17: ValidationOutcomeRecord.outcome_class === PASS alone is insufficient without 4/4 SATISFIED pillars", () => {
    const outcomePass: ValidationOutcomeRecord = {
      outcome_id: "outcome_pass_01",
      package_id: "pkg_5150_validation_01",
      outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
      evaluated_scope: "guitar:amp:5150_lead",
      version_binding: "binding_2026_5150_v1",
      summary_verdict: "Prior package passed",
      objective_summary: {},
      perceptual_summary: {},
      uat_summary: {},
      regression_summary: {},
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-03-20T10:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:outcome_pass",
        algorithm: "SHA-256",
        sealed_at: "2026-03-20T10:00:00Z",
      },
    };

    // Candidate has PASS outcome, but lacks rollback verification evidence
    const input = createPristineInput({
      validationOutcome: outcomePass,
      rollbackEvidence: undefined, // Missing rollback
    });
    const result = synthesizer.synthesizeProductionReadiness(input);
    assert.equal(result.gate8Eligible, false);
    assert.equal(result.pillarEvaluations.rollback_safety_readiness, PILLAR_READINESS_STATUSES.INCONCLUSIVE);
  });

  // -------------------------------------------------------------------------
  // 18. Exact 14 Governed Edge Types Preserved
  // -------------------------------------------------------------------------
  it("18: Relationship graph preserves exactly 14 governed edge types; WP-21 adds zero edge types", () => {
    const edgeTypes = Object.keys(GOVERNED_EDGE_DEFINITIONS);
    assert.equal(edgeTypes.length, 14);

    const forbiddenEdges = [
      "ASSESSES_READINESS",
      "AUTHORIZES",
      "HAS_READINESS",
      "READINESS_EVALUATES",
    ];
    for (const forbidden of forbiddenEdges) {
      assert.equal((GOVERNED_EDGE_TYPES as any)[forbidden], undefined);
    }
  });

  // -------------------------------------------------------------------------
  // 19. WP-22 Boundary & WP-27 Boundary Integrity
  // -------------------------------------------------------------------------
  it("19: WP-21 respects WP-22 (Adoption Decision) and WP-27 (Rollback Execution) boundaries", () => {
    const input = createPristineInput();
    const result = synthesizer.synthesizeProductionReadiness(input);

    // WP-22 boundaries
    assert.equal((result as any).adoptionDecision, undefined);
    assert.equal((result as any).governanceStatus, undefined);
    assert.equal((result as any).cutoverPlan, undefined);

    // WP-27 boundaries: consumes evidence, does not execute rollback
    assert.equal((synthesizer as any).executeRollback, undefined);
    assert.equal((synthesizer as any).rehearseRollback, undefined);
    assert.equal((synthesizer as any).measureRecoveryTiming, undefined);
  });

  // -------------------------------------------------------------------------
  // 20. Deep Immutability of Record 20
  // -------------------------------------------------------------------------
  it("20: ProductionReadinessAssessmentRecord is deeply frozen and immutable", () => {
    const input = createPristineInput();
    const result = synthesizer.synthesizeProductionReadiness(input);
    const record = result.assessmentRecord;

    assert.ok(Object.isFrozen(record));
    assert.ok(Object.isFrozen(record.pillar_evaluations));
    assert.ok(Object.isFrozen(record.hard_blockers_present));

    assert.throws(() => {
      (record as any).gate_8_eligible = false;
    }, TypeError);

    assert.throws(() => {
      (record.pillar_evaluations as any).acoustic_musical_readiness = "DEFICIENT";
    }, TypeError);
  });
});
