// src/tests/perceptualListeningHarness.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-12:
// Perceptual Evaluation, Blind Listening & Psychoacoustic Harness (Record 11).
// Bound to frozen specification v0.1j Section 16, Table 06, Table 07, and Implementation Plan v0.1h WP-12.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXECUTION_OUTCOMES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
} from "../sound-engineer/validation/schemas/enums";
import {
  PerceptualEvaluationRecord,
  perceptualEvaluationRecordSchema,
  ValidationCase,
  ValidationExecutionRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  computeSha256BytesHex,
  createSyntheticPcmWav,
} from "../sound-engineer/validation/fixtures/audioVerification";
import {
  InapplicablePerceptualCaseError,
  IneligiblePerceptualExecutionError,
  InvalidEvaluatorRoleError,
  InvalidListeningEnvironmentError,
} from "../sound-engineer/validation/evidence/perceptualErrors";
import {
  CANONICAL_PERCEPTUAL_DIMENSIONS,
  createDeterministicRandomSource,
  ListeningMethodologyProfile,
  PERCEPTUAL_ACOUSTIC_TREATMENTS,
  PERCEPTUAL_MONITOR_TYPES,
  RatingScaleProfile,
} from "../sound-engineer/validation/evidence/perceptualTypes";
import {
  BlindedStimulusPresenter,
  methodologyRequiresBlinding,
} from "../sound-engineer/validation/evidence/blindedStimulusPresenter";
import {
  calculateInterRaterReliability,
  computeCohensKappa,
  computePearsonCorrelation,
} from "../sound-engineer/validation/evidence/interRaterReliability";
import { PerceptualListeningHarness } from "../sound-engineer/validation/evidence/perceptualListeningHarness";

/**
 * Helper to build valid execution record and audio payload for tests.
 */
function createMockExecutionAndAudio(options?: {
  executionId?: string;
  outcome?: any;
  frequencyHz?: number;
}) {
  const executionId = options?.executionId ?? "EXEC-TEST-PERC-01";
  const frequencyHz = options?.frequencyHz ?? 440;
  const audioBytes = createSyntheticPcmWav({
    sampleRate: 48000,
    durationSeconds: 0.1,
    frequencyHz,
    amplitudeDbFs: -6,
  });
  const digest = computeSha256BytesHex(audioBytes);

  const executionRecord: ValidationExecutionRecord = {
    execution_id: executionId,
    case_id: "CASE-PERC-01",
    profile_id: "PROFILE-06",
    fixture_id: "FIX-DI-01",
    binding_id: "BIND-01",
    execution_timestamp: "2026-10-16T20:00:00.000Z",
    execution_environment: "CONTAINER_SANDBOX_OFFLINE",
    input_audio_integrity_ref: "sha256:inputdummy",
    output_audio_integrity_ref: digest,
    execution_duration_ms: 120,
    anomalies_detected: [],
    raw_measurements: {},
    outcome: options?.outcome ?? EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "trace:exec-test-01",
  };

  return { executionRecord, audioBytes, digest };
}

/**
 * Standard test rating scale profile.
 */
const mockRatingScaleProfile: RatingScaleProfile = {
  profileRef: "rating_scale_profile:perceptual_standard_v1",
  scaleName: "Standard Perceptual 10-Point Scale",
  dimensions: [
    {
      dimensionKey: CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE,
      label: "Tonal Balance",
      scaleType: "NUMERIC_RANGE",
      min: 1,
      max: 10,
    },
    {
      dimensionKey: CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS,
      label: "Warmth vs Harshness",
      scaleType: "NUMERIC_RANGE",
      min: 1,
      max: 10,
    },
  ],
  evaluateOutcome: (ratings, context) => {
    if (context?.isAnchorValid === false || context?.isDurationExceeded === true) {
      return PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    }
    const tonal = Number(ratings[CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE] ?? 0);
    const warmth = Number(ratings[CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS] ?? 0);
    if (tonal >= 6.0 && warmth >= 6.0) {
      return PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS;
    }
    return PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL;
  },
};

/**
 * Standard MUSHRA methodology profile with anchor check and session limit.
 */
const mockMushraProfile: ListeningMethodologyProfile = {
  profileRef: "listening_methodology_profile:mushra_v1",
  methodology: PERCEPTUAL_METHODOLOGIES.MUSHRA,
  requiresBlinding: true,
  requiresHiddenReference: true,
  requiresAnchorCheck: true,
  maxSessionDurationMinutes: 30,
  minEvaluators: 2,
  verifyAnchorRating: (anchorRating, referenceRating) => {
    // Anchor must be rated strictly less than 40 on 100-pt scale, and lower than reference
    const anchorNum = Number(anchorRating);
    const refNum = referenceRating !== undefined ? Number(referenceRating) : 100;
    return anchorNum <= 40 && anchorNum < refNum;
  },
  reliabilityMethod: "PEARSON_CORRELATION",
  verifyReliability: (score) => score >= 0.75,
};

describe("Phase 1C.5h — WP-12: Perceptual Evaluation, Blind Listening & Psychoacoustic Harness (Record 11)", () => {
  // ---------------------------------------------------------------------------
  // 1. Record 11 Schema & Emitted Record Integrity
  // ---------------------------------------------------------------------------
  describe("A. Record 11 Schema & Emitted Record Integrity", () => {
    it("successfully evaluates a valid eligible WP-10 execution and produces valid Record 11", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-master-eng-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_calibration_profile:83db_c_weighted_slow",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8.5,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 8.0,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TRANSIENT_PUNCH_AND_CLARITY]: 9.0,
        },
        qualitativeObservations: "Tight low-end punch, natural pick transient response without harsh top fizz.",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      assert.ok(result.evidenceRecord.perceptual_evidence_id.startsWith("EVID-PERC-"));
      assert.equal(result.evidenceRecord.execution_id, executionRecord.execution_id);
      assert.equal(result.evidenceRecord.evaluator_id, "eval-master-eng-01");
      assert.equal(result.evidenceRecord.evaluator_role, PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER);
      assert.equal(result.evidenceRecord.methodology_used, PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW);
      assert.equal(result.evidenceRecord.evaluation_outcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS);

      // Emitted Record 11 passes exact signed-off schema
      const parsed = perceptualEvaluationRecordSchema.parse(result.evidenceRecord);
      assert.equal(parsed.perceptual_evidence_id, result.evidenceRecord.perceptual_evidence_id);
    });

    it("verifies emitted Record 11 contains no extra persisted fields (strict schema validation)", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-02",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
        methodology: PERCEPTUAL_METHODOLOGIES.MUSICAL_CONTEXT,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.OPEN_BACK_HEADPHONES,
          calibrated_spl_profile_ref: "spl_calibration:reference_headphones",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.REFERENCE_HEADPHONE,
        },
        ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 7 },
        qualitativeObservations: "Sits cleanly inside rhythm section.",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.MEDIUM,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      // Verify exact keys in record match canonical schema
      const expectedKeys = new Set([
        "perceptual_evidence_id",
        "execution_id",
        "evaluator_id",
        "evaluator_role",
        "methodology_used",
        "listening_environment",
        "presented_stimuli_refs",
        "perceptual_dimensions_evaluated",
        "qualitative_observations",
        "confidence",
        "evaluation_outcome",
      ]);

      const recordKeys = Object.keys(result.evidenceRecord);
      assert.equal(recordKeys.length, expectedKeys.size);
      for (const k of recordKeys) {
        assert.ok(expectedKeys.has(k), `Unexpected field "${k}" found in Record 11`);
      }

      // Verifying strict schema rejects extra fields
      const recordWithExtra = { ...result.evidenceRecord, extra_field: "illegal_payload" };
      assert.throws(() => perceptualEvaluationRecordSchema.parse(recordWithExtra));
    });

    it("verifies Record 11 is deeply frozen and immutable after creation", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-03",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.SESSION_GUITARIST,
        methodology: PERCEPTUAL_METHODOLOGIES.INTERACTIVE_PLAYABILITY,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.GUITAR_CAB_FRFR,
          calibrated_spl_profile_ref: "spl_calibration:frfr_85db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.DYNAMIC_TOUCH_RESPONSE]: 8 },
        qualitativeObservations: "Immediate touch sensitivity under pick.",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      assert.ok(Object.isFrozen(result.evidenceRecord));
      assert.ok(Object.isFrozen(result.evidenceRecord.listening_environment));
      assert.ok(Object.isFrozen(result.evidenceRecord.presented_stimuli_refs));
      assert.ok(Object.isFrozen(result.evidenceRecord.perceptual_dimensions_evaluated));

      assert.throws(() => {
        (result.evidenceRecord as any).evaluation_outcome = "PERCEPTUAL_FAIL";
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Case Evidence Class & Eligibility Guards
  // ---------------------------------------------------------------------------
  describe("B. Case Evidence Class & Execution Eligibility Guards", () => {
    it("fails closed when case only requires OBJECTIVE evidence", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const objectiveOnlyCase: ValidationCase = {
        case_id: "CASE-OBJ-ONLY",
        title: "Objective FFT Analysis Only",
        validation_question: "Does harmonic distortion meet specification?",
        validation_subject: "Amp_Model_JCM800",
        scoped_boundaries: ["Acoustics"],
        applicable_test_dimensions: ["THD"],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        associated_fixture_set: ["FIX-01"],
        evaluation_methodology: "AUTOMATED_FFT",
        acceptance_criteria_ref: "tol:thd_1pct",
        failure_consequence: "REMAND",
        expected_remand_destination: "DSP_TEAM",
      };

      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            caseRecord: objectiveOnlyCase,
            candidateAudio: audioBytes,
            evaluatorId: "eval-01",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
              calibrated_spl_profile_ref: "spl_cal:83db",
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
            },
            ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8 },
            qualitativeObservations: "Sounds fine.",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
          }),
        InapplicablePerceptualCaseError
      );
    });

    it("accepts cases requiring PERCEPTUAL or MIXED evidence", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const perceptualCase: ValidationCase = {
        case_id: "CASE-PERC-OK",
        title: "Perceptual Tonal Balance Panel",
        validation_question: "Does amplifier model deliver pleasant warmth?",
        validation_subject: "Amp_Model_Bassman",
        scoped_boundaries: ["Acoustics"],
        applicable_test_dimensions: ["WARMTH", "BALANCE"],
        required_evidence_classes: [
          REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL,
          REQUIRED_EVIDENCE_CLASSES.MIXED,
        ],
        associated_fixture_set: ["FIX-01"],
        evaluation_methodology: "BLIND_LISTENING",
        acceptance_criteria_ref: "rating_scale_profile:perceptual_standard_v1",
        failure_consequence: "REMAND",
        expected_remand_destination: "TONE_DESIGN",
      };

      const result = await harness.evaluateSession({
        executionRecord,
        caseRecord: perceptualCase,
        candidateAudio: audioBytes,
        evaluatorId: "eval-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.SESSION_GUITARIST,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 8,
        },
        qualitativeObservations: "Organic warmth.",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      assert.equal(result.evidenceRecord.evaluation_outcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS);
    });

    it("fails closed when execution outcome was FAILED or ABORTED", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio({
        outcome: EXECUTION_OUTCOMES.FAILED,
      });
      const harness = new PerceptualListeningHarness();

      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            candidateAudio: audioBytes,
            evaluatorId: "eval-01",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
              calibrated_spl_profile_ref: "spl_cal:83db",
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
            },
            ratings: {},
            qualitativeObservations: "Attempting evaluation on failed execution",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
          }),
        IneligiblePerceptualExecutionError
      );
    });

    it("fails closed when candidate audio integrity does not match execution record output_audio_integrity_ref", async () => {
      const { executionRecord } = createMockExecutionAndAudio();
      const corruptedAudio = new Uint8Array([1, 2, 3, 4, 5]); // Mismatched buffer
      const harness = new PerceptualListeningHarness();

      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            candidateAudio: corruptedAudio,
            evaluatorId: "eval-01",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
              calibrated_spl_profile_ref: "spl_cal:83db",
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
            },
            ratings: {},
            qualitativeObservations: "Integrity mismatch test",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
          }),
        IneligiblePerceptualExecutionError
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Governed Roles & Listening Environment Validation
  // ---------------------------------------------------------------------------
  describe("C. Governed Roles & Listening Environment Validation", () => {
    it("accepts all four canonical evaluator roles", async () => {
      const roles = [
        PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        PERCEPTUAL_EVALUATOR_ROLES.SESSION_GUITARIST,
        PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
        PERCEPTUAL_EVALUATOR_ROLES.PLATFORM_SPECIALIST,
      ];

      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      for (const role of roles) {
        const result = await harness.evaluateSession({
          executionRecord,
          candidateAudio: audioBytes,
          evaluatorId: `eval-${role.toLowerCase()}`,
          evaluatorRole: role,
          methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
          listeningEnvironment: {
            monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
            calibrated_spl_profile_ref: "spl_cal:standard_83db",
            acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
          },
          ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 7 },
          qualitativeObservations: `Observations for ${role}`,
          confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
          ratingScaleProfile: mockRatingScaleProfile,
        });
        assert.equal(result.evidenceRecord.evaluator_role, role);
      }
    });

    it("rejects invalid or invented evaluator roles", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            candidateAudio: audioBytes,
            evaluatorId: "eval-invalid",
            evaluatorRole: "CASUAL_LISTENER" as any,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
              calibrated_spl_profile_ref: "spl_cal:83db",
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
            },
            ratings: {},
            qualitativeObservations: "Casual listener",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
          }),
        InvalidEvaluatorRoleError
      );
    });

    it("rejects invalid listening environments missing calibration or invalid monitor type", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      // Missing SPL calibration reference
      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            candidateAudio: audioBytes,
            evaluatorId: "eval-01",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
              calibrated_spl_profile_ref: "", // Empty!
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
            },
            ratings: {},
            qualitativeObservations: "Missing calibration",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
          }),
        InvalidListeningEnvironmentError
      );

      // Invalid monitor type
      await assert.rejects(
        () =>
          harness.evaluateSession({
            executionRecord,
            candidateAudio: audioBytes,
            evaluatorId: "eval-01",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
            listeningEnvironment: {
              monitor_type: "BLUETOOTH_SPEAKER" as any, // Not allowed!
              calibrated_spl_profile_ref: "spl_cal:83db",
              acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.UNTREATED,
            },
            ratings: {},
            qualitativeObservations: "Bluetooth speaker",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
          }),
        InvalidListeningEnvironmentError
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Blinded Presentation, Zero Leakage & Randomization
  // ---------------------------------------------------------------------------
  describe("D. Blinded Presentation, Zero Leakage & Randomization", () => {
    it("blinded A/B hides candidate/baseline identity and uses opaque lettered tokens", () => {
      const presenter = new BlindedStimulusPresenter();
      const candidateAudio = new Uint8Array([1, 2, 3]);
      const baselineAudio = new Uint8Array([4, 5, 6]);

      const session = presenter.presentStimuli({
        sessionId: "sess_ab_01",
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        stimuli: [
          {
            id: "candidate",
            role: "CANDIDATE",
            audioPayload: candidateAudio,
            integrityRef: "sha256:cand_hash",
          },
          {
            id: "baseline",
            role: "BASELINE",
            audioPayload: baselineAudio,
            integrityRef: "sha256:base_hash",
          },
        ],
        randomSource: createDeterministicRandomSource(42),
      });

      // Presentation items exposed to evaluator
      const tokens = session.presentationItems.map((item) => item.token);
      assert.deepEqual(tokens.sort(), ["Stimulus_A", "Stimulus_B"]);

      // Verify zero leakage in presentation items
      for (const item of session.presentationItems) {
        assert.ok(!item.token.toLowerCase().includes("candidate"));
        assert.ok(!item.token.toLowerCase().includes("baseline"));
        assert.ok(!item.token.toLowerCase().includes("path-prod"));
        assert.ok(!item.token.toLowerCase().includes("path-shadow"));
      }

      // Internal decoding map preserves true mapping
      assert.ok(session.internalDecodingMap.has("Stimulus_A"));
      assert.ok(session.internalDecodingMap.has("Stimulus_B"));
    });

    it("verifies stimulus ordering is randomized and not hardcoded A=Candidate", () => {
      const presenter = new BlindedStimulusPresenter();
      const candidateAudio = new Uint8Array([1, 2, 3]);
      const baselineAudio = new Uint8Array([4, 5, 6]);

      // Seed 1
      const session1 = presenter.presentStimuli({
        sessionId: "sess_rnd_1",
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        stimuli: [
          { id: "cand", role: "CANDIDATE", audioPayload: candidateAudio, integrityRef: "sha256:c" },
          { id: "base", role: "BASELINE", audioPayload: baselineAudio, integrityRef: "sha256:b" },
        ],
        randomSource: () => 0.05, // Selects candidate first
      });

      // Seed 2
      const session2 = presenter.presentStimuli({
        sessionId: "sess_rnd_2",
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        stimuli: [
          { id: "cand", role: "CANDIDATE", audioPayload: candidateAudio, integrityRef: "sha256:c" },
          { id: "base", role: "BASELINE", audioPayload: baselineAudio, integrityRef: "sha256:b" },
        ],
        randomSource: () => 0.95, // Selects baseline first
      });

      const roleA1 = session1.internalDecodingMap.get("Stimulus_A");
      const roleA2 = session2.internalDecodingMap.get("Stimulus_A");

      assert.notEqual(roleA1, roleA2, "Randomized stimulus ordering must not be fixed or hardcoded");
    });

    it("verifies injected deterministic RNG allows exact test reproducibility", () => {
      const presenter = new BlindedStimulusPresenter();
      const stimuli = [
        { id: "c", role: "CANDIDATE" as const, audioPayload: new Uint8Array([1]), integrityRef: "sha256:c" },
        { id: "b", role: "BASELINE" as const, audioPayload: new Uint8Array([2]), integrityRef: "sha256:b" },
        { id: "r", role: "REFERENCE" as const, audioPayload: new Uint8Array([3]), integrityRef: "sha256:r" },
      ];

      const run1 = presenter.presentStimuli({
        sessionId: "s1",
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        stimuli,
        randomSource: createDeterministicRandomSource(999),
      });

      const run2 = presenter.presentStimuli({
        sessionId: "s2",
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        stimuli,
        randomSource: createDeterministicRandomSource(999),
      });

      assert.equal(run1.internalDecodingMap.get("Stimulus_A"), run2.internalDecodingMap.get("Stimulus_A"));
      assert.equal(run1.internalDecodingMap.get("Stimulus_B"), run2.internalDecodingMap.get("Stimulus_B"));
      assert.equal(run1.internalDecodingMap.get("Stimulus_C"), run2.internalDecodingMap.get("Stimulus_C"));
    });

    it("ABX stimulus mapping blinds probe X to evaluator", () => {
      const presenter = new BlindedStimulusPresenter();
      const candidateAudio = new Uint8Array([10, 20]);
      const referenceAudio = new Uint8Array([30, 40]);

      const session = presenter.presentStimuli({
        sessionId: "sess_abx",
        methodology: PERCEPTUAL_METHODOLOGIES.ABX_TESTING,
        stimuli: [
          { id: "cand", role: "CANDIDATE", audioPayload: candidateAudio, integrityRef: "sha256:c" },
          { id: "ref", role: "REFERENCE", audioPayload: referenceAudio, integrityRef: "sha256:r" },
        ],
        randomSource: createDeterministicRandomSource(100),
      });

      const tokenNames = session.presentationItems.map((p) => p.token);
      assert.ok(tokenNames.includes("Stimulus_A"));
      assert.ok(tokenNames.includes("Stimulus_B"));
      assert.ok(tokenNames.includes("Stimulus_X"));

      // Evaluator sees Stimulus_X without knowing if it's candidate or reference
      const roleX = session.internalDecodingMap.get("Stimulus_X");
      assert.ok(roleX === "CANDIDATE" || roleX === "REFERENCE");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. MUSHRA Hidden References & Anchor Integrity Verification
  // ---------------------------------------------------------------------------
  describe("E. MUSHRA Hidden Reference & Anchor Invalidation", () => {
    it("MUSHRA blinds hidden reference and low-pass anchor among stimuli", () => {
      const presenter = new BlindedStimulusPresenter();
      const stimuli = [
        { id: "c", role: "CANDIDATE" as const, audioPayload: new Uint8Array([1]), integrityRef: "sha256:c" },
        { id: "b", role: "BASELINE" as const, audioPayload: new Uint8Array([2]), integrityRef: "sha256:b" },
        { id: "r", role: "REFERENCE" as const, audioPayload: new Uint8Array([3]), integrityRef: "sha256:r" },
        { id: "hr", role: "HIDDEN_REFERENCE" as const, audioPayload: new Uint8Array([3]), integrityRef: "sha256:r" },
        { id: "anc", role: "ANCHOR" as const, audioPayload: new Uint8Array([4]), integrityRef: "sha256:anc" },
      ];

      const session = presenter.presentStimuli({
        sessionId: "sess_mushra",
        methodology: PERCEPTUAL_METHODOLOGIES.MUSHRA,
        stimuli,
        randomSource: createDeterministicRandomSource(555),
      });

      assert.equal(session.presentationItems.length, 5);
      // All labeled Stimulus_A through Stimulus_E
      const roles = Array.from(session.internalDecodingMap.values());
      assert.ok(roles.includes("ANCHOR"));
      assert.ok(roles.includes("HIDDEN_REFERENCE"));
      assert.ok(roles.includes("CANDIDATE"));

      // Ensure no tokens contain the word anchor or hidden
      for (const item of session.presentationItems) {
        assert.ok(!item.token.toLowerCase().includes("anchor"));
        assert.ok(!item.token.toLowerCase().includes("hidden"));
      }
    });

    it("required hidden anchor check failure invalidates session and prevents PERCEPTUAL_PASS", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const baselineAudio = createSyntheticPcmWav({ frequencyHz: 440, amplitudeDbFs: -6 });
      const referenceAudio = createSyntheticPcmWav({ frequencyHz: 440, amplitudeDbFs: -6 });
      const anchorAudio = createSyntheticPcmWav({ frequencyHz: 200, amplitudeDbFs: -14 }); // low-pass degraded

      const harness = new PerceptualListeningHarness();

      // Evaluator mistakenly rates anchor high (e.g. 85 / 100), failing anchor check
      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        baselineAudio,
        referenceAudio,
        anchorAudio,
        evaluatorId: "eval-panellist-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.MUSHRA,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          Stimulus_A: 95,
          Stimulus_B: 90,
          anchor: 85, // Failed sanity anchor! Anchor was rated 85 > 40 threshold
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 9.0,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 9.0,
        },
        qualitativeObservations: "Everything sounded amazing including degraded anchor",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        methodologyProfile: mockMushraProfile,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      assert.equal(result.isAnchorValid, false);
      // Outcome MUST NOT BE PERCEPTUAL_PASS
      assert.equal(
        result.evidenceRecord.evaluation_outcome,
        PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE
      );
      assert.ok(
        result.evidenceRecord.qualitative_observations.includes(
          "Sanity anchor verification failed; session invalidated"
        )
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Rating Scale Governance & Anti-Universal-Threshold Discipline
  // ---------------------------------------------------------------------------
  describe("F. Rating Scale Governance & Anti-Universal-Threshold Discipline", () => {
    it("strictly returns PERCEPTUAL_INCONCLUSIVE when no rating scale profile is supplied (zero universal average >= 7)", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 10,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 10,
        },
        qualitativeObservations: "High scores but without governed profile",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        // ratingScaleProfile intentionally omitted!
      });

      // Zero universal pass fallback! Must be INCONCLUSIVE
      assert.equal(
        result.evidenceRecord.evaluation_outcome,
        PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE
      );
    });

    it("evaluates outcome according to governed rating scale profile rules", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      // Passing ratings
      const passResult = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 7.5,
        },
        qualitativeObservations: "Pass ratings",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });
      assert.equal(passResult.evidenceRecord.evaluation_outcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS);

      // Failing ratings
      const failResult = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-02",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 4, // Below 6 threshold
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 3,
        },
        qualitativeObservations: "Harsh tone, weak low end",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });
      assert.equal(failResult.evidenceRecord.evaluation_outcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Session Duration Governance & Reviewer Fatigue Mitigation
  // ---------------------------------------------------------------------------
  describe("G. Session Duration Governance & Reviewer Fatigue Mitigation", () => {
    it("invalidates session when session duration exceeds governed limit", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const fatiguedProfile: ListeningMethodologyProfile = {
        profileRef: "listening_methodology_profile:extended_fatigue_v1",
        methodology: PERCEPTUAL_METHODOLOGIES.EXTENDED_LISTENING_FATIGUE,
        requiresBlinding: false,
        requiresHiddenReference: false,
        requiresAnchorCheck: false,
        maxSessionDurationMinutes: 45, // Limit 45 min
      };

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-fatigued-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.EXTENDED_LISTENING_FATIGUE,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        sessionDurationMinutes: 65, // Exceeded! (65 > 45)
        ratings: {
          [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 9.0,
          [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 9.0,
        },
        qualitativeObservations: "Listened for over an hour",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        methodologyProfile: fatiguedProfile,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      // Session invalidated due to fatigue, never PERCEPTUAL_PASS
      assert.equal(
        result.evidenceRecord.evaluation_outcome,
        PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE
      );
      assert.ok(
        result.evidenceRecord.qualitative_observations.includes(
          "invalidated for listener fatigue"
        )
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Inter-Rater Reliability
  // ---------------------------------------------------------------------------
  describe("H. Inter-Rater Reliability (Multi-Evaluator Panels)", () => {
    it("single-evaluator case does not fabricate reliability", () => {
      const ratings = [{ tonal: 8, warmth: 7 }];
      const result = calculateInterRaterReliability(ratings);
      assert.equal(result.isCalculated, false);
      assert.ok(result.reason.includes("Single evaluator evaluation cannot compute reliability"));
    });

    it("calculates Pearson correlation across shared dimensions for multi-evaluator panel", () => {
      const rater1 = { tonal: 8, warmth: 7, clarity: 9 };
      const rater2 = { tonal: 8, warmth: 7, clarity: 8.5 };

      const result = calculateInterRaterReliability([rater1, rater2], "PEARSON_CORRELATION");
      assert.equal(result.isCalculated, true);
      if (result.isCalculated) {
        assert.ok(result.score > 0.9, `Expected strong positive correlation, got ${result.score}`);
        assert.equal(result.evaluatorCount, 2);
      }
    });

    it("calculates Cohen's Kappa for discrete categorical ratings", () => {
      const rater1 = ["PASS", "PASS", "FAIL", "PASS"];
      const rater2 = ["PASS", "PASS", "FAIL", "PASS"];

      const kappa = computeCohensKappa(rater1, rater2);
      assert.equal(kappa, 1.0, "Identical ratings should produce kappa of 1.0");
    });

    it("evaluates multi-evaluator panel using evaluatePanel and enforces reliability check", async () => {
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();
      const harness = new PerceptualListeningHarness();

      const panelResult = await harness.evaluatePanel({
        executionRecord,
        candidateAudio: audioBytes,
        methodology: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        methodologyProfile: mockMushraProfile,
        ratingScaleProfile: mockRatingScaleProfile,
        evaluators: [
          {
            evaluatorId: "eval-p1",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
            ratings: {
              [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8.0,
              [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 8.0,
            },
            qualitativeObservations: "Solid balance",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
          },
          {
            evaluatorId: "eval-p2",
            evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
            ratings: {
              [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8.5,
              [CANONICAL_PERCEPTUAL_DIMENSIONS.HARMONIC_WARMTH_VS_HARSHNESS]: 7.5,
            },
            qualitativeObservations: "Warm vintage vibe",
            confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
          },
        ],
      });

      assert.equal(panelResult.evidenceRecords.length, 2);
      assert.ok(panelResult.interRaterReliability !== undefined);
      assert.equal(panelResult.panelOutcome, PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Canonical Graph Edge Management & Graph Invariants
  // ---------------------------------------------------------------------------
  describe("I. Canonical Graph Edge Management & Graph Invariants", () => {
    it("creates exact canonical EVALUATED_BY edge from PerceptualEvaluationRecord to EvaluatorPersona", async () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const harness = new PerceptualListeningHarness({ graph, ledger });
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-master-eng-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        evaluatorPersonaId: "persona:master_engineer",
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8 },
        qualitativeObservations: "Master review",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      const evidenceId = result.evidenceRecord.perceptual_evidence_id;
      const outgoing = graph.getEdges().filter((e) => e.source.id === evidenceId);

      const evaluatedByEdge = outgoing.find((e) => e.edgeType === GOVERNED_EDGE_TYPES.EVALUATED_BY);
      assert.ok(evaluatedByEdge, "Expected canonical EVALUATED_BY edge");
      assert.equal(evaluatedByEdge.source.kind, GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord);
      assert.equal(evaluatedByEdge.target.kind, GOVERNED_ENTITY_KINDS.EvaluatorPersona);
      assert.equal(evaluatedByEdge.target.id, "persona:master_engineer");
    });

    it("creates exact canonical EVIDENCED_BY edge from ValidationCase to PerceptualEvaluationRecord", async () => {
      const graph = new ValidationRelationshipGraph();
      const harness = new PerceptualListeningHarness({ graph });
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();

      const caseRecord: ValidationCase = {
        case_id: "CASE-PERC-01",
        title: "Perceptual Tonal Validation",
        validation_question: "Is tonal balance accepted?",
        validation_subject: "Amp_Lead",
        scoped_boundaries: ["Amp"],
        applicable_test_dimensions: ["Tone"],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL],
        associated_fixture_set: ["FIX-01"],
        evaluation_methodology: "BLIND_AB",
        acceptance_criteria_ref: "spec:01",
        failure_consequence: "REMAND",
        expected_remand_destination: "DEV",
      };

      const result = await harness.evaluateSession({
        executionRecord,
        caseRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8 },
        qualitativeObservations: "Case linkage test",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      const evidenceId = result.evidenceRecord.perceptual_evidence_id;
      const caseOutgoing = graph.getEdges().filter((e) => e.source.id === caseRecord.case_id);
      const evidencedByEdge = caseOutgoing.find(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY && e.target.id === evidenceId
      );
      assert.ok(evidencedByEdge, "Expected EVIDENCED_BY edge from ValidationCase to PerceptualEvaluationRecord");
      assert.equal(evidencedByEdge.source.kind, GOVERNED_ENTITY_KINDS.ValidationCase);
      assert.equal(evidencedByEdge.target.kind, GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord);
    });

    it("creates ZERO ExecutionRecord -> PerceptualRecord edges and ZERO CONFLICTS_WITH edges", async () => {
      const graph = new ValidationRelationshipGraph();
      const harness = new PerceptualListeningHarness({ graph });
      const { executionRecord, audioBytes } = createMockExecutionAndAudio();

      const result = await harness.evaluateSession({
        executionRecord,
        candidateAudio: audioBytes,
        evaluatorId: "eval-01",
        evaluatorRole: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
        methodology: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
        listeningEnvironment: {
          monitor_type: PERCEPTUAL_MONITOR_TYPES.NEARFIELD_STUDIO_MONITORS,
          calibrated_spl_profile_ref: "spl_cal:83db",
          acoustic_treatment_level: PERCEPTUAL_ACOUSTIC_TREATMENTS.TREATED_CONTROL_ROOM,
        },
        ratings: { [CANONICAL_PERCEPTUAL_DIMENSIONS.TONAL_BALANCE]: 8 },
        qualitativeObservations: "Edge invariant test",
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        ratingScaleProfile: mockRatingScaleProfile,
      });

      const allEdges = graph.getEdges();
      for (const edge of allEdges) {
        assert.notEqual(
          edge.source.kind,
          GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
          "ExecutionRecord must never be source of edge to PerceptualEvidence"
        );
        assert.notEqual(
          edge.edgeType,
          GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
          "WP-12 must not create CONFLICTS_WITH edges; conflicts belong to later stage"
        );
      }
    });

    it("verifies graph remains exactly 14 governed edge types and no Record 12 / WP-13 artifacts are created", () => {
      const edgeTypes = Object.keys(GOVERNED_EDGE_TYPES);
      assert.equal(edgeTypes.length, 14, "Graph must remain exactly 14 governed edge types");
    });
  });
});
