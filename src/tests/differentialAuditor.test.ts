// src/tests/differentialAuditor.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-15:
// Tripartite Differential Comparison & Regression Detection Engine (Record 13).
// Bound to frozen specification v0.1j Section 13, Section 34, and Implementation Plan v0.1h WP-15.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  MATERIALITY_SCORES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  REGRESSION_CLASSIFICATIONS,
  REGRESSION_DOMAINS,
  TOLERANCE_EVALUATIONS,
} from "../sound-engineer/validation/schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  RegressionAssessmentRecord,
  regressionAssessmentRecordSchema,
  ValidationFixtureRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  InvalidEdgeTypeError,
  InvalidEndpointError,
  validateEdgeEndpoints,
} from "../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import {
  DifferentialAuditingEngine,
  DifferentialAuditorInput,
  GoldenReferenceData,
  InvalidCandidateEvidenceError,
  InvalidGoldenReferenceError,
  InvalidPathProdBaselineError,
  LegacyOutputData,
  MaterialityResolver,
  MissingMaterialityGovernanceError,
  RegressionClassifier,
  ScopeMismatchError,
  TripartiteComparator,
  VersionBindingMismatchError,
} from "../sound-engineer/validation/regression";

// ---------------------------------------------------------------------------
// Test Fixture Helpers
// ---------------------------------------------------------------------------

function createMockScopeRecord(): ValidationScopeRecord {
  return {
    scope_id: "SCOPE-001",
    intake_id: "INTAKE-001",
    primary_domain: "GEAR_FAMILY",
    included_units: ["tone.guitar.tube_preamp", "tone.guitar.cabinet_ir"],
    excluded_units: ["tone.bass.*"],
    boundary_constraints: ["Isolated under Axiom 6 boundary"],
    scope_inflation_protection: true,
  };
}

function createMockVersionBindingRecord(): ValidationVersionBindingRecord {
  return {
    binding_id: "BIND-001",
    scope_id: "SCOPE-001",
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
    runtime_implementation_version: "git_sha_abc1234567890",
    model_configuration_version: "checkpoint_tt_core_v1.0",
    deterministic_rules_version: "rules_manifest_2026_10",
    gear_catalog_version: "catalog_gear_v1.4",
    platform_exporter_version: "stage12_exporter_v2.1",
    fixture_library_version: "golden_corpus_manifest_v3",
    target_platform_runtime_version: "DAW-HOST-BUILD-2026.10",
    host_environment_version: "UBUNTU_24_04_ALSA_JACK2",
    version_integrity_reference: {
      composite_digest: "sha256:composite_binding_digest",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T00:00:00Z",
    },
  };
}

function createMockPackage(): ValidationPackage {
  return {
    package_id: "PKG-001",
    intake_id: "INTAKE-001",
    scope_record_ref: "SCOPE-001",
    version_binding_ref: "BIND-001",
    assigned_test_profiles: ["PROFILE-09"],
    validation_case_refs: ["CASE-001"],
    execution_record_refs: ["EXEC-CAND-001"],
    evidence_refs: ["OBJ-001"],
  };
}

function createMockGoldenFixture(overrides: Partial<ValidationFixtureRecord> = {}): ValidationFixtureRecord {
  return {
    fixture_id: "FIXTURE-GOLDEN-001",
    fixture_name: "Golden Reference Marshall JCM800 DI Stem",
    fixture_class: FIXTURE_CLASSES.REFERENCE_TONE,
    version: "1.0.0",
    payload_integrity_ref: "sha256-goldenpayload1234567890abcdef",
    declared_applicability_scope: ["tone.guitar.tube_preamp"],
    provenance_metadata: {
      instrument_details: "1982 Marshall JCM800 2203",
      recording_engineer: "Master Lab",
    },
    calibration_spec: "cal_spec:0dbfs_equals_plus_18dbu",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
    ...overrides,
  };
}

function createMockObjectiveEvidence(overrides: Partial<ObjectiveEvidenceRecord> = {}): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: "OBJ-EVID-001",
    execution_id: "EXEC-CAND-001",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { frequencyResponseDeltaDb: 0.4, thdPercent: 1.2 },
    applied_threshold_profile_ref: "tolerance_spec:tube_preamp:spectral",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.4,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["artifact_fft_001.json"],
    ...overrides,
  };
}

function createMockPerceptualEvidence(overrides: Partial<PerceptualEvaluationRecord> = {}): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: "PERC-EVID-001",
    execution_id: "EXEC-CAND-001",
    evaluator_id: "EVAL-001",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "ATC SCM25A Pro",
      calibrated_spl_profile_ref: "spl_85db_c_weighted",
      acoustic_treatment_level: "LEDE Master Room",
    },
    presented_stimuli_refs: { stimulus_a: "cand_wav", stimulus_b: "golden_wav" },
    perceptual_dimensions_evaluated: { tonal_balance: 9.0, warmth: 8.5 },
    qualitative_observations: "Dynamic warmth and transient punch are indistinguishable from reference.",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    ...overrides,
  };
}

function createMockInput(overrides: Partial<DifferentialAuditorInput> = {}): DifferentialAuditorInput {
  const scopeRecord = createMockScopeRecord();
  const versionBindingRecord = createMockVersionBindingRecord();
  const packageRecord = createMockPackage();
  const goldenReference: GoldenReferenceData = {
    fixtureRecord: createMockGoldenFixture(),
    payload: new Uint8Array([1, 2, 3, 4, 5]),
    referenceMetrics: { frequencyResponseDeltaDb: 0.0, thdPercent: 1.0 },
  };
  const legacyOutput: LegacyOutputData = {
    outputId: "PATH-PROD-OUTPUT-001",
    executionId: "EXEC-LEGACY-001",
    objectiveEvidence: [
      createMockObjectiveEvidence({
        objective_evidence_id: "OBJ-LEGACY-001",
        execution_id: "EXEC-LEGACY-001",
        measured_delta: 0.8,
        measured_parameters: { frequencyResponseDeltaDb: 0.8, thdPercent: 1.5 },
      }),
    ],
    renderedBuffer: new Uint8Array([1, 2, 3, 4, 10]),
  };
  const candidateData = {
    execution: {
      execution_id: "EXEC-CAND-001",
      case_id: "CASE-001",
      profile_id: "PROFILE-09",
      fixture_id: "FIXTURE-GOLDEN-001",
      binding_id: "BIND-001",
      execution_timestamp: "2026-10-17T01:00:00Z",
      execution_environment: "sandbox_isolated_v2",
      input_audio_integrity_ref: "sha256-input123",
      output_audio_integrity_ref: "sha256-output123",
      execution_duration_ms: 125,
      anomalies_detected: [],
      raw_measurements: {},
      outcome: "COMPLETED" as const,
      trace_ref: "trace-001",
    },
    objectiveEvidence: [
      createMockObjectiveEvidence({
        objective_evidence_id: "OBJ-CAND-001",
        execution_id: "EXEC-CAND-001",
        measured_delta: 0.3,
        measured_parameters: { frequencyResponseDeltaDb: 0.3, thdPercent: 1.1 },
      }),
    ],
    perceptualEvidence: [createMockPerceptualEvidence()],
    renderedBuffer: new Uint8Array([1, 2, 3, 4, 6]),
  };

  return {
    packageRecord,
    scopeRecord,
    versionBindingRecord,
    candidateData,
    legacyOutput,
    goldenReference,
    materialityProfileRef: "tolerance_spec_ref:regression_tolerance_profile",
    regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("WP-15: Tripartite Differential Comparison & Regression Detection Engine (Record 13)", () => {
  const engine = new DifferentialAuditingEngine();

  // 1-4. Tripartite comparison execution & independence
  it("executes all three independent pairwise comparisons and retains them separately", () => {
    const input = createMockInput();
    const result = engine.auditRegression(input);

    // 1. Valid tripartite result exists
    assert.ok(result.tripartiteComparison, "Tripartite comparison must be returned");
    assert.ok(result.tripartiteComparison.comparisonId, "Comparison ID must be set");

    // 2. Candidate vs PATH-PROD retained independently
    const { candidateVsLegacy, candidateVsGolden, legacyVsGolden } = result.tripartiteComparison;
    assert.equal(candidateVsLegacy.sourceEntityKind, "Candidate");
    assert.equal(candidateVsLegacy.targetEntityKind, "LegacyOutput");
    assert.equal(candidateVsLegacy.targetEntityId, "PATH-PROD-OUTPUT-001");
    assert.ok(typeof candidateVsLegacy.divergenceDetected === "boolean");
    assert.ok(candidateVsLegacy.metricsDelta, "Candidate vs Legacy metrics delta must exist");

    // 3. Candidate vs Golden retained independently
    assert.equal(candidateVsGolden.sourceEntityKind, "Candidate");
    assert.equal(candidateVsGolden.targetEntityKind, "GoldenReference");
    assert.equal(candidateVsGolden.targetEntityId, "FIXTURE-GOLDEN-001");
    assert.ok(typeof candidateVsGolden.divergenceDetected === "boolean");

    // 4. PATH-PROD vs Golden retained independently
    assert.equal(legacyVsGolden.sourceEntityKind, "LegacyOutput");
    assert.equal(legacyVsGolden.targetEntityKind, "GoldenReference");
    assert.equal(legacyVsGolden.targetEntityId, "FIXTURE-GOLDEN-001");
    assert.ok(typeof legacyVsGolden.divergenceDetected === "boolean");

    // Comparisons are distinct objects
    assert.notEqual(candidateVsLegacy, candidateVsGolden);
    assert.notEqual(candidateVsGolden, legacyVsGolden);
    assert.notEqual(candidateVsLegacy, legacyVsGolden);
  });

  // 5-6. Record 13 schema & strict field enforcement
  it("emits Record 13 strictly matching the signed-off schema with zero extra fields", () => {
    const input = createMockInput();
    const { record } = engine.auditRegression(input);

    // Schema parse passes
    const validated = regressionAssessmentRecordSchema.parse(record);
    assert.ok(validated);

    // Verify exact fields
    assert.ok(record.regression_id.startsWith("reg_PKG-001_"));
    assert.equal(record.package_id, "PKG-001");
    assert.ok(record.comparison_target.includes("PATH-PROD-OUTPUT-001"));
    assert.ok(typeof record.divergence_detected === "boolean");
    assert.ok(typeof record.divergence_magnitude === "number" || typeof record.divergence_magnitude === "string");
    assert.ok(record.classification in REGRESSION_CLASSIFICATIONS);
    assert.ok(record.materiality_score in MATERIALITY_SCORES);
    assert.deepEqual(record.affected_scope, ["tone.guitar.tube_preamp", "tone.guitar.cabinet_ir"]);
    assert.equal(record.regression_domain, REGRESSION_DOMAINS.ACOUSTIC);
    assert.ok(typeof record.detailed_justification === "string");
    assert.ok(typeof record.blocks_gate_8 === "boolean");

    // Exact fields count: exactly 11 properties in Record 13 schema
    const keys = Object.keys(record);
    assert.equal(keys.length, 11, "Record 13 must contain exactly 11 canonical fields");

    // Prohibit extra fields
    assert.throws(() => {
      regressionAssessmentRecordSchema.parse({
        ...record,
        extra_illegal_field: "prohibited",
      });
    });
  });

  // 7-10. Canonical classifications accepted
  it("accepts only the four canonical short-form classifications in Record 13", () => {
    const baseRecord: RegressionAssessmentRecord = {
      regression_id: "reg_001",
      package_id: "PKG-001",
      comparison_target: "target_001",
      divergence_detected: false,
      divergence_magnitude: 0,
      classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      materiality_score: MATERIALITY_SCORES.NEGLIGIBLE,
      affected_scope: ["tone.guitar.tube_preamp"],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "test",
      blocks_gate_8: false,
    };

    // 7. INTENTIONAL_CORRECTION
    assert.ok(regressionAssessmentRecordSchema.parse(baseRecord));

    // 8. NEUTRAL
    assert.ok(
      regressionAssessmentRecordSchema.parse({
        ...baseRecord,
        classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
      })
    );

    // 9. GENUINE_REGRESSION
    assert.ok(
      regressionAssessmentRecordSchema.parse({
        ...baseRecord,
        classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
      })
    );

    // 10. UNRESOLVED
    assert.ok(
      regressionAssessmentRecordSchema.parse({
        ...baseRecord,
        classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
      })
    );
  });

  // 11-13. Rejection of long-form legacy tokens
  it("strictly rejects long-form legacy tokens at the schema level", () => {
    const baseRecord = {
      regression_id: "reg_001",
      package_id: "PKG-001",
      comparison_target: "target_001",
      divergence_detected: true,
      divergence_magnitude: 1.0,
      materiality_score: MATERIALITY_SCORES.MEDIUM,
      affected_scope: ["tone.guitar.tube_preamp"],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "test",
      blocks_gate_8: false,
    };

    // 11. INTENTIONAL_ARCHITECTURAL_CORRECTION rejected
    assert.throws(
      () =>
        regressionAssessmentRecordSchema.parse({
          ...baseRecord,
          classification: "INTENTIONAL_ARCHITECTURAL_CORRECTION",
        }),
      /Invalid option|invalid_value|expected one of/
    );

    // 12. NEUTRAL_DIVERGENCE rejected
    assert.throws(
      () =>
        regressionAssessmentRecordSchema.parse({
          ...baseRecord,
          classification: "NEUTRAL_DIVERGENCE",
        }),
      /Invalid option|invalid_value|expected one of/
    );

    // 13. UNRESOLVED_DIVERGENCE rejected
    assert.throws(
      () =>
        regressionAssessmentRecordSchema.parse({
          ...baseRecord,
          classification: "UNRESOLVED_DIVERGENCE",
        }),
      /Invalid option|invalid_value|expected one of/
    );
  });

  // 14. Cardinal Rule: candidate != legacy ALONE does not create regression
  it("enforces cardinal rule: candidate diverging from legacy is NOT automatically a regression", () => {
    const input = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        // Candidate has divergence from legacy (delta = 0.5 vs legacy 1.5), but candidate is within tolerance (MET, PASS)
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.5,
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        perceptualEvidence: [createMockPerceptualEvidence()],
      },
    });

    const { record } = engine.auditRegression(input);
    assert.notEqual(
      record.classification,
      REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
      "Candidate differing from legacy must NOT automatically be classified as regression"
    );
  });

  // 15. Legacy mismatch + authorized intentional correction intent => INTENTIONAL_CORRECTION
  it("classifies INTENTIONAL_CORRECTION when divergence from legacy is backed by authorized intent", () => {
    const input = createMockInput({
      intentionalCorrectionIntent: {
        intentId: "INTENT-001",
        rationale: "Correcting legacy 500Hz resonance filter defect per Phase 1C.4 bugfix specification",
        approvedChangeRef: "RFC-2026-ACOUSTIC-FILTER-FIX",
        isAuthorized: true,
      },
    });

    const { record } = engine.auditRegression(input);
    assert.equal(record.classification, REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION);
    assert.equal(record.blocks_gate_8, false);
    assert.ok(record.detailed_justification.includes("RFC-2026-ACOUSTIC-FILTER-FIX"));
  });

  // 16. Candidate closer to Golden alone does NOT auto-classify intentional correction
  it("does NOT auto-classify intentional correction merely because candidate is closer to Golden", () => {
    const input = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.1, // very close to golden (0.0) compared to legacy (0.8)
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        perceptualEvidence: [createMockPerceptualEvidence()],
      },
      // Explicitly NO intentional correction intent provided
      intentionalCorrectionIntent: undefined,
    });

    const { record } = engine.auditRegression(input);
    // Must NOT be INTENTIONAL_CORRECTION without authorized intent
    assert.notEqual(
      record.classification,
      REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      "Closer to Golden alone must NOT auto-classify as INTENTIONAL_CORRECTION"
    );
    // Properly classified as NEUTRAL
    assert.equal(record.classification, REGRESSION_CLASSIFICATIONS.NEUTRAL);
  });

  // 17. Governed neutral divergence classifies NEUTRAL
  it("classifies non-degrading divergence within governed tolerances as NEUTRAL", () => {
    const input = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.6,
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        perceptualEvidence: [createMockPerceptualEvidence()],
      },
    });

    const { record } = engine.auditRegression(input);
    assert.equal(record.classification, REGRESSION_CLASSIFICATIONS.NEUTRAL);
    assert.equal(record.blocks_gate_8, false);
  });

  // 18. Material degradation classifies GENUINE_REGRESSION
  it("classifies actual degradation relative to Golden/governed tolerances as GENUINE_REGRESSION", () => {
    const input = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 3.5, // > 3.0 dB threshold in acoustic profile (HIGH materiality)
            tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          }),
        ],
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
            qualitative_observations: "Severe harmonic distortion",
          }),
        ],
      },
    });

    const { record } = engine.auditRegression(input);
    assert.equal(record.classification, REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION);
    assert.equal(record.materiality_score, MATERIALITY_SCORES.HIGH);
    assert.equal(record.blocks_gate_8, true);
  });

  // 19. Contradictory / borderline evidence classifies UNRESOLVED
  it("classifies UNRESOLVED when evidence streams are contradictory (objective pass vs perceptual fail)", () => {
    const input = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.2,
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        // Objective passes, but perceptual listening fails
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
            qualitative_observations: "Severe unnatural harshness in 3kHz upper mid harmonics",
          }),
        ],
      },
    });

    const { record } = engine.auditRegression(input);
    assert.equal(record.classification, REGRESSION_CLASSIFICATIONS.UNRESOLVED);
    assert.ok(record.detailed_justification.includes("Contradictory evidence detected"));
  });

  // 20-22. Materiality governance & absence of universal thresholds
  it("strictly enforces governed materiality profiles and rejects missing profile without fallback", () => {
    // 20. Missing profile throws MissingMaterialityGovernanceError
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          materialityProfileRef: "non_existent_unregistered_profile_ref",
        })
      );
    }, MissingMaterialityGovernanceError);

    // 21. Materiality score uses registered profile thresholds
    const customResolver = new MaterialityResolver();
    customResolver.registerProfile({
      materialityProfileRef: "custom:test:profile",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      thresholds: {
        highThreshold: 10.0,
        mediumThreshold: 5.0,
        lowThreshold: 1.0,
      },
      description: "Custom profile with high thresholds",
      isGate8BlockingMateriality: (score) => score === MATERIALITY_SCORES.HIGH,
    });

    const customEngine = new DifferentialAuditingEngine({ materialityResolver: customResolver });
    const score = customResolver.evaluateMaterialityScore(
      4.0,
      customResolver.resolveProfile("custom:test:profile")
    );
    // Under custom profile: 4.0 is LOW (1.0 - 5.0 is low)
    assert.equal(score, MATERIALITY_SCORES.LOW);

    // Under default acoustic profile: 4.0 would be HIGH (> 3.0)
    const defaultProfile = customResolver.resolveProfile("tolerance_spec_ref:regression_tolerance_profile");
    const defaultScore = customResolver.evaluateMaterialityScore(4.0, defaultProfile);
    assert.equal(defaultScore, MATERIALITY_SCORES.HIGH);

    // 22. Confirms no single universal threshold governs all domains
    assert.notEqual(score, defaultScore);
  });

  // 23-26. blocks_gate_8 frozen rule enforcement
  it("enforces blocks_gate_8 strictly based on governed materiality of genuine regression and unresolved states", () => {
    // 23. Immaterial genuine regression does NOT block Gate 8
    const immaterialClassifier = new RegressionClassifier();
    const customProfile = {
      materialityProfileRef: "profile_immaterial_test",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      thresholds: { highThreshold: 10.0, mediumThreshold: 5.0, lowThreshold: 1.0 },
      description: "Test profile",
      isGate8BlockingMateriality: (score: any) => score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    };
    const inputLow = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.6, // Low under custom profile (< 1.0 is negligible, 0.6 is negligible)
            tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          }),
        ],
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
          }),
        ],
      },
    });

    const resolver = new MaterialityResolver();
    resolver.registerProfile(customProfile);
    const lowEngine = new DifferentialAuditingEngine({ materialityResolver: resolver });
    const lowResult = lowEngine.auditRegression({
      ...inputLow,
      materialityProfileRef: "profile_immaterial_test",
    });

    assert.equal(lowResult.record.classification, REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION);
    assert.equal(lowResult.record.materiality_score, MATERIALITY_SCORES.NEGLIGIBLE);
    assert.equal(lowResult.record.blocks_gate_8, false, "Immaterial regression must not block Gate 8");

    // 24. Material genuine regression DOES block Gate 8
    const inputHigh = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 12.0, // HIGH under custom profile (>= 10.0)
            tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          }),
        ],
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
          }),
        ],
      },
    });
    const highResult = lowEngine.auditRegression({
      ...inputHigh,
      materialityProfileRef: "profile_immaterial_test",
    });
    assert.equal(highResult.record.classification, REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION);
    assert.equal(highResult.record.materiality_score, MATERIALITY_SCORES.HIGH);
    assert.equal(highResult.record.blocks_gate_8, true, "Material genuine regression must block Gate 8");

    // 25. Material unresolved divergence sets blocks_gate_8=true
    const inputUnresolvedHigh = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 12.0, // High magnitude
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
          }),
        ],
      },
    });
    const unresHighResult = lowEngine.auditRegression({
      ...inputUnresolvedHigh,
      materialityProfileRef: "profile_immaterial_test",
    });
    assert.equal(unresHighResult.record.classification, REGRESSION_CLASSIFICATIONS.UNRESOLVED);
    assert.equal(unresHighResult.record.blocks_gate_8, true, "Material unresolved divergence must block Gate 8");

    // 26. Immaterial unresolved divergence does NOT block Gate 8
    const inputUnresolvedLow = createMockInput({
      candidateData: {
        execution: createMockInput().candidateData.execution,
        objectiveEvidence: [
          createMockObjectiveEvidence({
            measured_delta: 0.2, // Negligible magnitude
            tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
            objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          }),
        ],
        perceptualEvidence: [
          createMockPerceptualEvidence({
            evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
          }),
        ],
      },
    });
    const unresLowResult = lowEngine.auditRegression({
      ...inputUnresolvedLow,
      materialityProfileRef: "profile_immaterial_test",
    });
    assert.equal(unresLowResult.record.classification, REGRESSION_CLASSIFICATIONS.UNRESOLVED);
    assert.equal(unresLowResult.record.blocks_gate_8, false, "Immaterial unresolved divergence must not block Gate 8");
  });

  // 27-28. Integrity validation of Candidate & PATH-PROD baseline
  it("fails closed on invalid Candidate evidence or invalid PATH-PROD baseline", () => {
    // 27. Invalid candidate evidence (e.g. missing package)
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          packageRecord: null as any,
        })
      );
    }, InvalidCandidateEvidenceError);

    // 28. Invalid PATH-PROD evidence (empty output ID)
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          legacyOutput: { outputId: "" },
        })
      );
    }, InvalidPathProdBaselineError);

    // 28b. Attempt to substitute candidate as legacy baseline fails closed
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          legacyOutput: { outputId: "EXEC-CAND-001" }, // same as candidate execution ID
        })
      );
    }, InvalidPathProdBaselineError);
  });

  // 29-30. Integrity validation of Golden Reference
  it("rejects invalid, inactive, contaminated, or scope-mismatched Golden References", () => {
    // 29. Missing fixture record
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          goldenReference: { fixtureRecord: null as any },
        })
      );
    }, InvalidGoldenReferenceError);

    // 30a. Inactive lifecycle status
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          goldenReference: {
            fixtureRecord: createMockGoldenFixture({
              lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
            }),
          },
        })
      );
    }, InvalidGoldenReferenceError);

    // 30b. Contaminated status
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          goldenReference: {
            fixtureRecord: createMockGoldenFixture({
              contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
            }),
          },
        })
      );
    }, InvalidGoldenReferenceError);

    // 30c. Empty payload integrity ref
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          goldenReference: {
            fixtureRecord: createMockGoldenFixture({
              payload_integrity_ref: "",
            }),
          },
        })
      );
    }, InvalidGoldenReferenceError);

    // 30d. Scope mismatch (fixture scope doesn't overlap with validation scope)
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          goldenReference: {
            fixtureRecord: createMockGoldenFixture({
              declared_applicability_scope: ["tone.acoustic.microphone_placement"], // No overlap with tube_preamp
            }),
          },
        })
      );
    }, InvalidGoldenReferenceError);
  });

  // 31-32. Comparison scope & version binding mismatch
  it("fails closed on scope record or version binding mismatch", () => {
    // 31. Scope reference mismatch
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          packageRecord: {
            ...createMockPackage(),
            scope_record_ref: "SCOPE-DIFFERENT-999",
          },
        })
      );
    }, ScopeMismatchError);

    // 32. Version binding mismatch
    assert.throws(() => {
      engine.auditRegression(
        createMockInput({
          packageRecord: {
            ...createMockPackage(),
            version_binding_ref: "BIND-DIFFERENT-999",
          },
        })
      );
    }, VersionBindingMismatchError);
  });

  // 33-37. Canonical COMPARED_AGAINST graph endpoints & exact 14 catalogue
  it("registers exact COMPARED_AGAINST relationship edges and respects the frozen 14-edge catalogue", () => {
    const graph = new ValidationRelationshipGraph();
    const graphEngine = new DifferentialAuditingEngine({ graph });

    const input = createMockInput();
    const result = graphEngine.auditRegression(input);

    // 33. Exact COMPARED_AGAINST Record13 -> LegacyOutput
    const edgeLegacy = result.edgesCreated.find((e) => e.target.kind === GOVERNED_ENTITY_KINDS.LegacyOutput);
    assert.ok(edgeLegacy, "Edge to LegacyOutput must be created");
    assert.equal(edgeLegacy.edgeType, GOVERNED_EDGE_TYPES.COMPARED_AGAINST);
    assert.equal(edgeLegacy.source.id, result.record.regression_id);
    assert.equal(edgeLegacy.source.kind, GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord);
    assert.equal(edgeLegacy.target.id, "PATH-PROD-OUTPUT-001");

    // 34. Exact COMPARED_AGAINST Record13 -> GoldenReference
    const edgeGolden = result.edgesCreated.find((e) => e.target.kind === GOVERNED_ENTITY_KINDS.GoldenReference);
    assert.ok(edgeGolden, "Edge to GoldenReference must be created");
    assert.equal(edgeGolden.edgeType, GOVERNED_EDGE_TYPES.COMPARED_AGAINST);
    assert.equal(edgeGolden.source.id, result.record.regression_id);
    assert.equal(edgeGolden.target.id, "FIXTURE-GOLDEN-001");

    // 34b. Only strictly 2 edges created (LegacyOutput and GoldenReference), no candidate edge
    assert.equal(result.edgesCreated.length, 2, "Must create exactly two COMPARED_AGAINST edges");
    const candidateEdge = result.edgesCreated.find((e) => e.target.kind === GOVERNED_ENTITY_KINDS.ValidationExecutionRecord);
    assert.equal(candidateEdge, undefined, "No Candidate/ValidationExecutionRecord COMPARED_AGAINST edge must exist");
    const fixtureEdge = result.edgesCreated.find((e) => e.target.kind === GOVERNED_ENTITY_KINDS.ValidationFixtureRecord);
    assert.equal(fixtureEdge, undefined, "No generic ValidationFixtureRecord COMPARED_AGAINST edge must exist");

    // 34c. COMPARED_AGAINST strictly rejects ValidationExecutionRecord target
    assert.throws(() => {
      validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
        { id: result.record.regression_id, kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
        { id: "EXEC-001", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord }
      );
    }, InvalidEndpointError);

    // 34d. COMPARED_AGAINST strictly rejects generic ValidationFixtureRecord target
    assert.throws(() => {
      validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
        { id: result.record.regression_id, kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
        { id: "FIXTURE-001", kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord }
      );
    }, InvalidEndpointError);

    // 35. Reverse edge COMPARED_AGAINST is rejected
    assert.throws(() => {
      validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
        { id: "PATH-PROD-OUTPUT-001", kind: GOVERNED_ENTITY_KINDS.LegacyOutput },
        { id: result.record.regression_id, kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord }
      );
    }, InvalidEndpointError);

    // 36. No new invented relationship edge type permitted
    assert.throws(() => {
      validateEdgeEndpoints(
        "REGRESSED_FROM",
        { id: result.record.regression_id, kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
        { id: "PATH-PROD-OUTPUT-001", kind: GOVERNED_ENTITY_KINDS.LegacyOutput }
      );
    }, InvalidEdgeTypeError);

    // 37. Authoritative graph catalogue remains exactly 14 edges
    const totalEdgeTypes = Object.keys(GOVERNED_EDGE_TYPES).length;
    assert.equal(totalEdgeTypes, 14, "Governed relationship edge catalogue must remain exactly 14 edge types");
    assert.equal(Object.keys(GOVERNED_EDGE_DEFINITIONS).length, 14);
  });

  // 38-43. Strict architectural boundaries & immutability
  it("enforces immutability and ensures no Record 14–17 or WP-16+ artifacts are produced", () => {
    const input = createMockInput();
    const result = engine.auditRegression(input);

    // 38. Record 13 is deeply frozen / immutable
    assert.ok(Object.isFrozen(result.record), "RegressionAssessmentRecord must be frozen");
    assert.ok(Object.isFrozen(result.tripartiteComparison), "Tripartite comparison must be frozen");

    // Attempting mutation throws
    assert.throws(() => {
      (result.record as any).classification = REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION;
    });

    // 39. Zero Record 14–17 emitted
    const recordKeys = Object.keys(result);
    assert.ok(!("failureRecord" in result));
    assert.ok(!("conflictRecord" in result));
    assert.ok(!("uncertaintyRecord" in result));
    assert.ok(!("outcomeRecord" in result));

    // 40. No REMANDS_TO edge created
    for (const edge of result.edgesCreated) {
      assert.notEqual(edge.edgeType, GOVERNED_EDGE_TYPES.REMANDS_TO);
    }

    // 41. No EvidenceConflictRecord created
    assert.equal((result as any).evidenceConflictRecord, undefined);

    // 42. No Gate 8 decision records created (Record 20, 21, 22 absent)
    assert.equal((result as any).readinessAssessment, undefined);
    assert.equal((result as any).adoptionDecision, undefined);
    assert.equal((result as any).gate8Change, undefined);

    // 43. WP-16 failure attribution artifacts absent
    assert.equal((result as any).attributionClass, undefined);
    assert.equal((result as any).remandDestination, undefined);
  });
});
