// src/tests/acousticEvaluationSynthesizer.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-14:
// Multi-Dimensional Acoustic Evaluation & Orthogonal Tolerance Engine.
// Bound to frozen specification v0.1j Section 19, Invariant 2, Invariant 7, and Plan Override v0.1h.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  TEST_PROFILE_FAMILIES,
  TOLERANCE_EVALUATIONS,
} from "../sound-engineer/validation/schemas/enums";
import {
  ObjectiveEvidenceRecord,
  objectiveEvidenceRecordSchema,
  PerceptualEvaluationRecord,
  perceptualEvaluationRecordSchema,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import {
  ACOUSTIC_EVALUATION_DIMENSIONS,
  ACOUSTIC_SYNTHESIS_STATES,
  AcousticEvaluationSynthesizer,
  DIMENSION_APPLICABILITY_STATES,
  DIMENSION_EVALUATION_STATUSES,
  InvalidEvidenceSchemaError,
  ScalarCollapseForbiddenError,
  ToleranceCriteriaResolver,
  UnrecognizedTopologyError,
} from "../sound-engineer/validation/evaluation";

/**
 * Helper to build valid mock ObjectiveEvidenceRecord.
 */
function createMockObjectiveEvidence(
  category: (typeof OBJECTIVE_METRIC_CATEGORIES)[keyof typeof OBJECTIVE_METRIC_CATEGORIES],
  measuredParameters: Record<string, unknown>,
  passFail: (typeof OBJECTIVE_PASS_FAIL_STATUSES)[keyof typeof OBJECTIVE_PASS_FAIL_STATUSES] = OBJECTIVE_PASS_FAIL_STATUSES.PASS,
  measuredDelta: number = 0.5,
  evidenceId: string = `OBJ-${Math.random().toString(36).substring(2, 9)}`
): ObjectiveEvidenceRecord {
  const raw = {
    objective_evidence_id: evidenceId,
    execution_id: "EXEC-WP14-001",
    metric_category: category,
    measured_parameters: measuredParameters,
    applied_threshold_profile_ref: "tolerance_spec_ref:acoustic_profile_tolerance",
    tolerance_evaluation:
      passFail === OBJECTIVE_PASS_FAIL_STATUSES.PASS
        ? TOLERANCE_EVALUATIONS.MET
        : TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
    measured_delta: measuredDelta,
    objective_pass_fail: passFail,
    artifacts_retained: ["artifact_fft.raw"],
  };
  return objectiveEvidenceRecordSchema.parse(raw);
}

/**
 * Helper to build valid mock PerceptualEvaluationRecord.
 */
function createMockPerceptualEvidence(
  dimensions: Record<string, number | string>,
  outcome: (typeof PERCEPTUAL_EVALUATION_OUTCOMES)[keyof typeof PERCEPTUAL_EVALUATION_OUTCOMES] = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
  observations: string = "Expert listening evaluation.",
  evidenceId: string = `PERC-${Math.random().toString(36).substring(2, 9)}`
): PerceptualEvaluationRecord {
  const raw = {
    perceptual_evidence_id: evidenceId,
    execution_id: "EXEC-WP14-001",
    evaluator_id: "EVAL-PRO-001",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "Nearfield Studio Monitors",
      calibrated_spl_profile_ref: "spl_83db_c_weighted",
      acoustic_treatment_level: "LEDE Master Room",
    },
    presented_stimuli_refs: { stimulus_A: "cand_01", stimulus_B: "ref_01" },
    perceptual_dimensions_evaluated: dimensions,
    qualitative_observations: observations,
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: outcome,
  };
  return perceptualEvaluationRecordSchema.parse(raw);
}

describe("WP-14: Multi-Dimensional Acoustic Evaluation & Orthogonal Tolerance Engine", () => {
  // ---------------------------------------------------------------------------
  // 1. Valid profile-specific spectral evaluation
  // ---------------------------------------------------------------------------
  it("evaluates spectral dimension independently against governed tolerance criteria", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
        { frequencyResponseDeltaDb: 1.1, spectralCentroidHz: 2450 }
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-SPECTRAL-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: objEvidence,
      perceptualEvidence: [],
      toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    });

    const spectral = result.perDimensionResults.SPECTRAL;
    assert.equal(spectral.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(spectral.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(spectral.isCritical, true);
    assert.ok(spectral.evidenceRefs.includes(objEvidence[0].objective_evidence_id));
  });

  // ---------------------------------------------------------------------------
  // 2. Valid dynamic response evaluation
  // ---------------------------------------------------------------------------
  it("evaluates dynamic envelope dimension against profile-specific dynamic budget", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
        { crestFactorDb: 12.5, dynamicRangeDb: 55.0 }
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-DYNAMIC-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE],
      objectiveEvidence: objEvidence,
      perceptualEvidence: [],
      toleranceSpecRef: "tolerance_spec_ref:dynamic_budget_spec",
    });

    const dynamic = result.perDimensionResults.DYNAMIC;
    assert.equal(dynamic.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(dynamic.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(dynamic.isCritical, true);
  });

  // ---------------------------------------------------------------------------
  // 3. Valid harmonic distortion evaluation
  // ---------------------------------------------------------------------------
  it("evaluates harmonic texture dimension against circuit-specific harmonic tolerances", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
        { thdPercent: 3.2, fundamentalFrequencyHz: 440 }
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-HARMONIC-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: objEvidence,
      perceptualEvidence: [],
      gearTopology: "TUBE_POWER_AMP",
    });

    const harmonic = result.perDimensionResults.HARMONIC;
    assert.equal(harmonic.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(harmonic.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(harmonic.isCritical, true);
  });

  // ---------------------------------------------------------------------------
  // 4. Valid phase coherence evaluation
  // ---------------------------------------------------------------------------
  it("evaluates spatial and phase dimension independently", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE,
        { phaseCorrelation: 0.92, stereoWidth: 1.0 }
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-PHASE-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: objEvidence,
      perceptualEvidence: [],
      gearTopology: "CABINET_IR_SIMULATOR",
    });

    const phase = result.perDimensionResults.PHASE;
    assert.equal(phase.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(phase.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(phase.isCritical, true);
  });

  // ---------------------------------------------------------------------------
  // 5. Applicable playability dimension
  // ---------------------------------------------------------------------------
  it("evaluates playability dimension when PROFILE-07 is assigned", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE,
        { latencyMs: 5.2 }
      ),
    ];
    const percEvidence = [
      createMockPerceptualEvidence(
        { playability_feel: 8.5, touch_response: 9.0 },
        PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
        "Touch response is immediate and natural."
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-PLAYABILITY-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY],
      objectiveEvidence: objEvidence,
      perceptualEvidence: percEvidence,
      toleranceSpecRef: "tolerance_spec_ref:latency_budget_ref",
    });

    const playability = result.perDimensionResults.PLAYABILITY;
    assert.equal(playability.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(playability.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(playability.isCritical, true);
  });

  // ---------------------------------------------------------------------------
  // 6. Applicable mix-context dimension
  // ---------------------------------------------------------------------------
  it("evaluates mix-context dimension when PROFILE-08 is assigned", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(
        OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
        { maskingRatio: 0.15, mixSeparationDb: 18.0 }
      ),
    ];
    const percEvidence = [
      createMockPerceptualEvidence(
        { mix_pocket: 8.0, vocal_separation: 9.0 },
        PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
        "Sits cleanly in the guitar pocket without masking lead vocals."
      ),
    ];

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-MIX-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT],
      objectiveEvidence: objEvidence,
      perceptualEvidence: percEvidence,
      toleranceSpecRef: "tolerance_spec_ref:mix_context_masking_tolerance",
    });

    const mix = result.perDimensionResults.MIX_CONTEXT;
    assert.equal(mix.applicabilityState, DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED);
    assert.equal(mix.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(mix.isCritical, false);
  });

  // ---------------------------------------------------------------------------
  // 7. Dimensions remain independently represented; no scalar collapse
  // ---------------------------------------------------------------------------
  it("preserves each orthogonal dimension independently without scalar collapse", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-MULTI-01" },
      assignedProfiles: [
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
        TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE,
      ],
      objectiveEvidence: [
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS, { frequencyResponseDeltaDb: 0.9 }),
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION, { thdPercent: 2.1 }),
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE, { phaseCorrelation: 0.88 }),
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE, { crestFactorDb: 11.2 }),
      ],
      perceptualEvidence: [],
      toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    });

    // All four dimensions independently exist
    assert.ok(result.perDimensionResults.SPECTRAL);
    assert.ok(result.perDimensionResults.DYNAMIC);
    assert.ok(result.perDimensionResults.HARMONIC);
    assert.ok(result.perDimensionResults.PHASE);

    // No composite scalar field exists
    assert.equal((result as any).scalarScore, undefined);
    assert.equal((result as any).compositeScore, undefined);
    assert.equal((result as any).averageScore, undefined);
    assert.equal((result as any).percentagePass, undefined);
  });

  // ---------------------------------------------------------------------------
  // 8. Scalar aggregate scoring is explicitly prohibited and throws
  // ---------------------------------------------------------------------------
  it("throws ScalarCollapseForbiddenError if computeScalarScore is called", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    assert.throws(
      () => synthesizer.computeScalarScore(),
      ScalarCollapseForbiddenError
    );
  });

  // ---------------------------------------------------------------------------
  // 9. Passing dimension CANNOT mask failing critical dimension
  // ---------------------------------------------------------------------------
  it("prevents passing spectral dimension from masking critical harmonic distortion failure", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    // Pristine spectral response (< 0.5 dB) BUT severe harmonic distortion (35% THD on tube power amp where threshold is 8%)
    const objSpectral = createMockObjectiveEvidence(
      OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      { frequencyResponseDeltaDb: 0.3 }
    );
    const objHarmonic = createMockObjectiveEvidence(
      OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
      { thdPercent: 35.0 },
      OBJECTIVE_PASS_FAIL_STATUSES.FAIL
    );

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-MASKING-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: [objSpectral, objHarmonic],
      perceptualEvidence: [],
      gearTopology: "TUBE_POWER_AMP",
    });

    assert.equal(result.perDimensionResults.SPECTRAL.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(result.perDimensionResults.HARMONIC.evaluationStatus, DIMENSION_EVALUATION_STATUSES.FAILED);
    assert.equal(result.perDimensionResults.HARMONIC.isCritical, true);

    // Synthesis state MUST reflect critical failure
    assert.equal(result.synthesisState, ACOUSTIC_SYNTHESIS_STATES.CRITICAL_FAILURE_PRESENT);
    assert.equal(result.hasCriticalFailure, true);
    assert.ok(result.criticalFailingDimensions.includes(ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC));
  });

  // ---------------------------------------------------------------------------
  // 10. Criticality is derived from governed profile/spec, not hardcoded
  // ---------------------------------------------------------------------------
  it("derives criticality strictly from governed profile data", () => {
    const resolver = new ToleranceCriteriaResolver();
    const synth = new AcousticEvaluationSynthesizer(resolver);

    // Custom spec with non-critical harmonic dimension
    resolver.registerSpec({
      dimension: ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC,
      toleranceSpecRef: "tolerance_spec:experimental_fuzz:harmonic",
      isCritical: false, // Explicitly non-critical for experimental fuzz
      gearTopology: "EXPERIMENTAL_FUZZ",
      rules: [{ metricName: "thdPercent", comparisonType: "VALUE_LESS_THAN", thresholdValue: 80.0 }],
    });

    const result = synth.synthesize({
      caseRecord: {
        case_id: "CASE-CRIT-01",
        applicable_test_dimensions: ["HARMONIC"],
      },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: [
        createMockObjectiveEvidence(
          OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
          { thdPercent: 95.0 }, // Exceeds 80%
          OBJECTIVE_PASS_FAIL_STATUSES.FAIL
        ),
      ],
      perceptualEvidence: [],
      gearTopology: "EXPERIMENTAL_FUZZ",
      toleranceResolver: resolver,
    });

    const harmonic = result.perDimensionResults.HARMONIC;
    assert.equal(harmonic.evaluationStatus, DIMENSION_EVALUATION_STATUSES.FAILED);
    assert.equal(harmonic.isCritical, false); // NOT critical!
    assert.equal(result.hasCriticalFailure, false);
    assert.equal(result.synthesisState, ACOUSTIC_SYNTHESIS_STATES.NON_CRITICAL_FAILURE_PRESENT);
  });

  // ---------------------------------------------------------------------------
  // 11. Objective and perceptual separation: objective cannot overwrite perceptual failure
  // ---------------------------------------------------------------------------
  it("ensures perceptual failure cannot be waived or overwritten by passing objective metrics", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    // Objective spectral measurement is MET (< 1.5 dB)
    const objSpectral = createMockObjectiveEvidence(
      OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      { frequencyResponseDeltaDb: 0.8 },
      OBJECTIVE_PASS_FAIL_STATUSES.PASS
    );

    // Perceptual listening panel found severe unmusical harshness / fatigue -> FAIL
    const percSpectral = createMockPerceptualEvidence(
      { tonal_balance: 3.0, harshness: 9.5 },
      PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      "High frequency harshness causes severe listening fatigue."
    );

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-PERC-FAIL-01" },
      assignedProfiles: [
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
        TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING,
      ],
      objectiveEvidence: [objSpectral],
      perceptualEvidence: [percSpectral],
      toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    });

    const spectral = result.perDimensionResults.SPECTRAL;
    // Perceptual failure MUST cause the dimension to fail
    assert.equal(spectral.evaluationStatus, DIMENSION_EVALUATION_STATUSES.FAILED);
    assert.ok(spectral.failureReason?.includes("Perceptual evaluation"));
  });

  // ---------------------------------------------------------------------------
  // 12. Perceptual pass cannot waive objective failure
  // ---------------------------------------------------------------------------
  it("ensures objective failure cannot be waived by passing perceptual evaluation", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    // Objective harmonic distortion measurement failed (clipping aliasing above threshold)
    const objHarmonic = createMockObjectiveEvidence(
      OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
      { thdPercent: 12.0 },
      OBJECTIVE_PASS_FAIL_STATUSES.FAIL
    );

    // Perceptual review thought it sounded pleasant
    const percHarmonic = createMockPerceptualEvidence(
      { warmth: 8.5 },
      PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      "Warm harmonic saturation."
    );

    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-OBJ-FAIL-01" },
      assignedProfiles: [
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
        TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING,
      ],
      objectiveEvidence: [objHarmonic],
      perceptualEvidence: [percHarmonic],
      toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    });

    const harmonic = result.perDimensionResults.HARMONIC;
    assert.equal(harmonic.evaluationStatus, DIMENSION_EVALUATION_STATUSES.FAILED);
    assert.ok(harmonic.failureReason?.includes("Objective measurement"));
  });

  // ---------------------------------------------------------------------------
  // 13. Non-applicable dimension handled distinctly from missing evidence
  // ---------------------------------------------------------------------------
  it("distinguishes clearly between non-applicable dimensions and applicable-missing-evidence", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    // Case only assigns PROFILE-05 (Dynamic Response).
    // Spectral, Harmonic, Phase, Playability, Mix Context are NOT applicable.
    // Dynamic is applicable, but has no evidence supplied.
    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-APPLICABILITY-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE],
      objectiveEvidence: [],
      perceptualEvidence: [],
      toleranceSpecRef: "tolerance_spec_ref:dynamic_budget_spec",
    });

    // Dynamic is APPLICABLE_MISSING_EVIDENCE
    assert.equal(
      result.perDimensionResults.DYNAMIC.applicabilityState,
      DIMENSION_APPLICABILITY_STATES.APPLICABLE_MISSING_EVIDENCE
    );
    assert.equal(
      result.perDimensionResults.DYNAMIC.evaluationStatus,
      DIMENSION_EVALUATION_STATUSES.UNEVALUABLE
    );

    // Spectral is NOT_APPLICABLE
    assert.equal(
      result.perDimensionResults.SPECTRAL.applicabilityState,
      DIMENSION_APPLICABILITY_STATES.NOT_APPLICABLE
    );
    assert.equal(
      result.perDimensionResults.SPECTRAL.evaluationStatus,
      DIMENSION_EVALUATION_STATUSES.NOT_APPLICABLE
    );
  });

  // ---------------------------------------------------------------------------
  // 14. CRITICAL PLAN DEFECT OVERRIDE: Unknown topology handling
  // ---------------------------------------------------------------------------
  it("enforces plan defect override: unknown topology does NOT use strictest conservative tolerances", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const objEvidence = [
      createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS, { frequencyResponseDeltaDb: 0.5 }),
    ];

    // Evaluate with an unknown/unregistered gear topology
    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-UNKNOWN-TOPOLOGY" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: objEvidence,
      perceptualEvidence: [],
      gearTopology: "QUANTUM_PHOTONIC_CRYSTAL_AMPLIFIER", // Unrecognized!
      failClosedOnUnrecognizedTopology: false,
    });

    // Must NOT borrow tolerances or use "strictest" fallback
    const spectral = result.perDimensionResults.SPECTRAL;
    assert.equal(
      spectral.applicabilityState,
      DIMENSION_APPLICABILITY_STATES.UNEVALUABLE_MISSING_TOLERANCE
    );
    assert.equal(
      spectral.evaluationStatus,
      DIMENSION_EVALUATION_STATUSES.UNEVALUABLE
    );
    assert.ok(spectral.unevaluableReason?.includes("unrecognized"));

    // When failClosedOnUnrecognizedTopology is true, it throws UnrecognizedTopologyError
    assert.throws(
      () =>
        synthesizer.synthesize({
          caseRecord: { case_id: "CASE-UNKNOWN-FAILCLOSED" },
          assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
          objectiveEvidence: objEvidence,
          perceptualEvidence: [],
          gearTopology: "NEURAL_MAGNETIC_PREAMP_V99",
          failClosedOnUnrecognizedTopology: true,
        }),
      UnrecognizedTopologyError
    );
  });

  // ---------------------------------------------------------------------------
  // 15. Invalid evidence schema fails closed
  // ---------------------------------------------------------------------------
  it("fails closed when supplied evidence records violate schema", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    const badObjective = {
      objective_evidence_id: "BAD-OBJ-01",
      // missing required execution_id, metric_category, etc.
    };

    assert.throws(
      () =>
        synthesizer.synthesize({
          caseRecord: { case_id: "CASE-BAD-SCHEMA" },
          assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
          objectiveEvidence: [badObjective as any],
          perceptualEvidence: [],
        }),
      InvalidEvidenceSchemaError
    );
  });

  // ---------------------------------------------------------------------------
  // 16. Target amplifier and pedal topology cases (Table 05 derived)
  // ---------------------------------------------------------------------------
  it("accurately synthesizes tube amplifier and overdrive pedal circuit classes using governed tolerances", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();

    // 1. Tube Power Amp case
    const tubeResult = synthesizer.synthesize({
      caseRecord: {
        case_id: "CASE-TUBE-AMP-01",
        applicable_test_dimensions: ["SPECTRAL", "HARMONIC", "DYNAMIC"],
      },
      assignedProfiles: [
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
        TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE,
      ],
      objectiveEvidence: [
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS, { frequencyResponseDeltaDb: 1.2 }),
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION, { thdPercent: 5.5 }), // Within tube limit of 8%
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE, { crestFactorDb: 12.0 }),
      ],
      perceptualEvidence: [],
      gearTopology: "TUBE_POWER_AMP",
    });

    assert.equal(tubeResult.perDimensionResults.SPECTRAL.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(tubeResult.perDimensionResults.HARMONIC.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(tubeResult.perDimensionResults.DYNAMIC.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(tubeResult.synthesisState, ACOUSTIC_SYNTHESIS_STATES.FULLY_EVALUABLE);

    // 2. Analog Overdrive Pedal case
    const pedalResult = synthesizer.synthesize({
      caseRecord: {
        case_id: "CASE-OD-PEDAL-01",
        applicable_test_dimensions: ["SPECTRAL", "HARMONIC"],
      },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: [
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS, { frequencyResponseDeltaDb: 1.8 }),
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION, { thdPercent: 20.0 }), // Within overdrive limit of 25%
      ],
      perceptualEvidence: [],
      gearTopology: "ANALOG_OVERDRIVE_PEDAL",
    });

    assert.equal(pedalResult.perDimensionResults.SPECTRAL.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(pedalResult.perDimensionResults.HARMONIC.evaluationStatus, DIMENSION_EVALUATION_STATUSES.MET);
    assert.equal(pedalResult.synthesisState, ACOUSTIC_SYNTHESIS_STATES.FULLY_EVALUABLE);
  });

  // ---------------------------------------------------------------------------
  // 17. Governance & Architecture boundaries: no Record 13-17 produced, exactly 14 edge types
  // ---------------------------------------------------------------------------
  it("enforces strict architectural boundaries: no new records, exactly 14 edge types, result is deeply frozen", () => {
    const synthesizer = new AcousticEvaluationSynthesizer();
    const result = synthesizer.synthesize({
      caseRecord: { case_id: "CASE-GOV-01" },
      assignedProfiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      objectiveEvidence: [
        createMockObjectiveEvidence(OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS, { frequencyResponseDeltaDb: 1.0 }),
      ],
      perceptualEvidence: [],
      gearTopology: "TUBE_POWER_AMP",
    });

    // Result is immutable / deeply frozen
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.perDimensionResults));
    assert.ok(Object.isFrozen(result.perDimensionResults.SPECTRAL));

    // Result is NOT a 23rd record; no schema pollution
    assert.equal((result as any).regression_id, undefined); // No Record 13
    assert.equal((result as any).failure_id, undefined);    // No Record 14
    assert.equal((result as any).conflict_id, undefined);   // No Record 15
    assert.equal((result as any).uncertainty_id, undefined);// No Record 16
    assert.equal((result as any).outcome_id, undefined);    // No Record 17

    // Exactly 14 governed edge types remain in the graph catalog
    assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);
  });
});
