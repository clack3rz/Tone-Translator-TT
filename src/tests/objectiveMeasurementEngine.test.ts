// src/tests/objectiveMeasurementEngine.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-11:
// Objective Acoustic & Signal-Processing Measurement Engine (Record 10).
// Bound to frozen specification v0.1j Section 15, Table 05, 06, 07, and Implementation Plan v0.1h WP-11.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  TOLERANCE_EVALUATIONS,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  objectiveEvidenceRecordSchema,
  TestProfileRecord,
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
  AudioPayloadMalformedError,
  InapplicableAnalysisError,
  IneligibleExecutionError,
  NumericalInstabilityError,
} from "../sound-engineer/validation/evidence/measurementErrors";
import {
  computeFft,
  decodePcmWavSamples,
} from "../sound-engineer/validation/evidence/audioDsp";
import { computeSpectralAnalysis } from "../sound-engineer/validation/evidence/spectralAnalysis";
import { computeHarmonicAnalysis } from "../sound-engineer/validation/evidence/harmonicAnalysis";
import { computeDynamicAnalysis } from "../sound-engineer/validation/evidence/dynamicAnalysis";
import { computePhaseAnalysis } from "../sound-engineer/validation/evidence/phaseAnalysis";
import {
  DefaultToleranceProfileResolver,
  evaluateToleranceRule,
} from "../sound-engineer/validation/evidence/toleranceResolver";
import { ObjectiveMeasurementEngine } from "../sound-engineer/validation/evidence/objectiveMeasurementEngine";
import {
  DEFAULT_PRECISION_PROFILE,
  MetricToleranceRule,
  ToleranceCriteriaProfile,
} from "../sound-engineer/validation/evidence/objectiveTypes";

/**
 * Helper to synthesize custom stereo PCM WAV with explicit channel signals.
 */
function createStereoPcmWav(options: {
  sampleRate?: number;
  durationSeconds?: number;
  leftGenerator: (t: number) => number;
  rightGenerator: (t: number) => number;
}): Uint8Array {
  const sampleRate = options.sampleRate ?? 48000;
  const durationSeconds = options.durationSeconds ?? 0.5;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const bitDepth = 16;
  const channels = 2;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = totalSamples * blockAlign;
  const riffSize = 36 + dataSize;

  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);

  // 'RIFF'
  buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46;
  view.setUint32(4, riffSize, true);
  // 'WAVE'
  buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45;
  // 'fmt '
  buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // 'data'
  buffer[36] = 0x64; buffer[37] = 0x61; buffer[38] = 0x74; buffer[39] = 0x61;
  view.setUint32(40, dataSize, true);

  const maxVal = 32767.0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const lVal = Math.max(-1.0, Math.min(1.0, options.leftGenerator(t)));
    const rVal = Math.max(-1.0, Math.min(1.0, options.rightGenerator(t)));

    view.setInt16(44 + i * blockAlign, Math.round(lVal * maxVal), true);
    view.setInt16(44 + i * blockAlign + 2, Math.round(rVal * maxVal), true);
  }

  return buffer;
}

/**
 * Helper to synthesize a tone with known harmonic composition for THD testing.
 */
function createHarmonicSignalWav(options: {
  sampleRate?: number;
  durationSeconds?: number;
  fundamentalHz: number;
  harmonics: Array<{ multiple: number; amplitudeDb: number }>;
}): Uint8Array {
  const sampleRate = options.sampleRate ?? 48000;
  const durationSeconds = options.durationSeconds ?? 0.5;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const bitDepth = 24;
  const channels = 1;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = totalSamples * blockAlign;
  const riffSize = 36 + dataSize;

  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);

  // RIFF/WAVE/fmt/data headers
  buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46;
  view.setUint32(4, riffSize, true);
  buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45;
  buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  buffer[36] = 0x64; buffer[37] = 0x61; buffer[38] = 0x74; buffer[39] = 0x61;
  view.setUint32(40, dataSize, true);

  const maxVal = 8388607.0;
  const fundAmp = 0.5; // -6 dBFS nominal fundamental

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = fundAmp * Math.sin(2 * Math.PI * options.fundamentalHz * t);

    for (const h of options.harmonics) {
      const hAmp = fundAmp * Math.pow(10, h.amplitudeDb / 20);
      sample += hAmp * Math.sin(2 * Math.PI * (options.fundamentalHz * h.multiple) * t);
    }

    const clamped = Math.max(-1.0, Math.min(1.0, sample));
    const raw = Math.round(clamped * maxVal);

    const byte0 = raw & 0xff;
    const byte1 = (raw >> 8) & 0xff;
    const byte2 = (raw >> 16) & 0xff;
    buffer[44 + i * 3] = byte0;
    buffer[44 + i * 3 + 1] = byte1;
    buffer[44 + i * 3 + 2] = byte2;
  }

  return buffer;
}

describe("Phase 1C.5h — WP-11: Objective Acoustic & Signal-Processing Measurement Engine (Record 10)", () => {
  // Common sample objects
  const sampleCandidateWav = createSyntheticPcmWav({
    sampleRate: 48000,
    channels: 1,
    bitDepth: 24,
    durationSeconds: 0.2,
    signalType: "sine",
    frequencyHz: 1000,
    amplitudeDbFs: -6,
  });

  const sampleCandidateDigest = `sha256:${computeSha256BytesHex(sampleCandidateWav)}`;

  const sampleExecution: ValidationExecutionRecord = {
    execution_id: "EXEC-CASE-OBJ-01-2026",
    case_id: "CASE-OBJ-ACOUSTIC-01",
    profile_id: "PROFILE-04",
    fixture_id: "FIX-SYNTH-1000HZ",
    binding_id: "bnd_2026_scope_lead_rig_01",
    execution_timestamp: "2026-03-20T12:00:00Z",
    execution_environment: "HOST:LINUX/ARCH:X86_64",
    input_audio_integrity_ref: "sha256:input_ref",
    output_audio_integrity_ref: sampleCandidateDigest,
    execution_duration_ms: 125,
    anomalies_detected: [],
    raw_measurements: {
      execution_wall_clock_ms: 125,
      platform_id: "simulated-audio-engine-v1",
    },
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "trc_test_exec_01",
  };

  const sampleCase: ValidationCase = {
    case_id: "CASE-OBJ-ACOUSTIC-01",
    title: "Lead Amp Acoustic Falsification",
    validation_question: "Does candidate amp output diverge from baseline beyond governed tolerance?",
    validation_subject: "amp_lead_5150",
    scoped_boundaries: ["Isolated under Axiom 6"],
    applicable_test_dimensions: ["PROFILE-04"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: ["SYNTHETIC_TEST_SIGNAL"],
    evaluation_methodology: "AUTOMATED_DSP_MEASUREMENT",
    acceptance_criteria_ref: "spec:01j_sec15",
    failure_consequence: "BLOCK_GATE_8_RELEASE",
    expected_remand_destination: "ENGINEERING_REASONING_REMEDIATION",
  };

  const sampleTestProfile: TestProfileRecord = {
    profile_id: "PROFILE-04",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
    target_component_class: "Amplifier models, cabinet emulations",
    required_analyses: ["multi_band_spectral_magnitude_analysis", "thd_harmonic_distortion_measurement"],
    applicable_fixture_classes: ["SYNTHETIC_TEST_SIGNAL"],
    tolerance_criteria_spec: "tolerance_spec_ref:acoustic_profile_tolerance",
    applicability_rules: ["Mandatory for Amp Models"],
  };

  // -------------------------------------------------------------------------
  // Suite A: Record 10 Schema & Objective Measurement Parity
  // -------------------------------------------------------------------------
  describe("A. Record 10 Schema & Objective Measurement Parity", () => {
    it("successfully measures a valid WP-10 execution and produces sealed Record 10 matching canonical schema", async () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const engine = new ObjectiveMeasurementEngine({ graph, ledger });

      const result = await engine.measureExecution({
        executionRecord: sampleExecution,
        candidateAudio: sampleCandidateWav,
        caseRecord: sampleCase,
        testProfile: sampleTestProfile,
        targetCategory: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      });

      assert.ok(result.evidenceRecord);
      assert.ok(result.evidenceRecord.objective_evidence_id.startsWith("EVID-OBJ-EXEC-CASE-OBJ-01-2026-"));
      assert.strictEqual(result.evidenceRecord.execution_id, sampleExecution.execution_id);
      assert.strictEqual(result.evidenceRecord.metric_category, OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS);

      // Verify schema parse passes
      const validated = objectiveEvidenceRecordSchema.parse(result.evidenceRecord);
      assert.strictEqual(validated.objective_evidence_id, result.evidenceRecord.objective_evidence_id);

      // Verify immutability
      assert.throws(() => {
        (result.evidenceRecord as unknown as Record<string, unknown>).measured_delta = 999;
      }, /read only|frozen|extensible/i);

      // Verify stored in registry
      assert.strictEqual(engine.getEvidenceCount(), 1);
      assert.strictEqual(engine.getEvidence(result.evidenceRecord.objective_evidence_id), result.evidenceRecord);
    });

    it("produces deterministic repeat measurements for identical inputs", async () => {
      const engine = new ObjectiveMeasurementEngine();

      const result1 = await engine.measureExecution({
        executionRecord: sampleExecution,
        candidateAudio: sampleCandidateWav,
        testProfile: sampleTestProfile,
        targetCategory: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      });

      const result2 = await engine.measureExecution({
        executionRecord: sampleExecution,
        candidateAudio: sampleCandidateWav,
        testProfile: sampleTestProfile,
        targetCategory: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      });

      assert.strictEqual(
        result1.evidenceRecord.measured_parameters.spectral_centroid_hz,
        result2.evidenceRecord.measured_parameters.spectral_centroid_hz
      );
      assert.strictEqual(
        result1.evidenceRecord.measured_parameters.peak_frequency_hz,
        result2.evidenceRecord.measured_parameters.peak_frequency_hz
      );
    });
  });

  // -------------------------------------------------------------------------
  // Suite B: Spectral Analysis Accuracy (Centroid, Rolloff, FFT Peak)
  // -------------------------------------------------------------------------
  describe("B. Spectral Analysis Accuracy", () => {
    it("detects peak frequency with high precision for known synthetic tone (1000 Hz)", () => {
      const wav = createSyntheticPcmWav({
        sampleRate: 48000,
        frequencyHz: 1000,
        durationSeconds: 0.3,
        amplitudeDbFs: -3,
      });
      const decoded = decodePcmWavSamples(wav);
      const spectral = computeSpectralAnalysis(decoded.channels[0], undefined, decoded.sampleRate, DEFAULT_PRECISION_PROFILE);

      // Peak should be within 1 FFT bin of 1000 Hz (binWidth = 48000 / 4096 = 11.7 Hz)
      assert.ok(Math.abs(spectral.peakFrequencyHz - 1000) < 15, `Peak was ${spectral.peakFrequencyHz}, expected ~1000`);
      // Spectral centroid of pure tone should be very close to 1000 Hz
      assert.ok(Math.abs(spectral.spectralCentroidHz - 1000) < 50, `Centroid was ${spectral.spectralCentroidHz}, expected ~1000`);
    });

    it("calculates frequency-response delta between candidate and baseline", () => {
      const candWav = createSyntheticPcmWav({ sampleRate: 48000, frequencyHz: 1000, amplitudeDbFs: -6 });
      const baseWav = createSyntheticPcmWav({ sampleRate: 48000, frequencyHz: 1000, amplitudeDbFs: -12 });

      const candDecoded = decodePcmWavSamples(candWav);
      const baseDecoded = decodePcmWavSamples(baseWav);

      const spectral = computeSpectralAnalysis(
        candDecoded.channels[0],
        baseDecoded.channels[0],
        candDecoded.sampleRate,
        DEFAULT_PRECISION_PROFILE
      );

      assert.ok(spectral.frequencyResponseDeltaDb !== undefined);
      // Expected difference is approximately 6 dB
      assert.ok(
        Math.abs(spectral.frequencyResponseDeltaDb - 6.0) < 1.0,
        `Delta was ${spectral.frequencyResponseDeltaDb}, expected ~6 dB`
      );
    });
  });

  // -------------------------------------------------------------------------
  // Suite C: Harmonic Distortion (THD%, Harmonics)
  // -------------------------------------------------------------------------
  describe("C. Harmonic Distortion Analysis", () => {
    it("calculates near-zero THD% for pure undistorted sine wave", () => {
      const pureWav = createSyntheticPcmWav({
        sampleRate: 48000,
        frequencyHz: 1000,
        durationSeconds: 0.4,
        amplitudeDbFs: -6,
      });
      const decoded = decodePcmWavSamples(pureWav);
      const harmonic = computeHarmonicAnalysis(decoded.channels[0], decoded.sampleRate, 1000, DEFAULT_PRECISION_PROFILE);

      // FFT bin resolution is 48000 / 8192 = 5.86 Hz; measured fundamental bin should be within 5 Hz of 1000 Hz
      assert.ok(
        Math.abs(harmonic.fundamentalFrequencyHz - 1000) < 5.0,
        `Fundamental frequency was ${harmonic.fundamentalFrequencyHz}, expected within 5 Hz of 1000`
      );
      assert.ok(harmonic.thdPercent < 0.1, `Pure sine THD% was ${harmonic.thdPercent}, expected < 0.1%`);
    });

    it("accurately calculates THD% for synthetic wave with known 10% 2nd harmonic (-20 dB)", () => {
      // 2nd harmonic at -20 dB relative to fundamental = 10% THD
      const distortedWav = createHarmonicSignalWav({
        sampleRate: 48000,
        fundamentalHz: 1000,
        durationSeconds: 0.5,
        harmonics: [{ multiple: 2, amplitudeDb: -20 }],
      });
      const decoded = decodePcmWavSamples(distortedWav);
      const harmonic = computeHarmonicAnalysis(decoded.channels[0], decoded.sampleRate, 1000, DEFAULT_PRECISION_PROFILE);

      // Expected THD is ~10% (tolerance within +/- 1.5% due to windowing/bin sampling)
      assert.ok(
        Math.abs(harmonic.thdPercent - 10.0) < 1.5,
        `Measured THD was ${harmonic.thdPercent}%, expected ~10%`
      );
      assert.ok(harmonic.individualHarmonicsDb.h2 !== undefined);
      assert.ok(
        Math.abs(harmonic.individualHarmonicsDb.h2 - -20.0) < 2.0,
        `Measured h2 was ${harmonic.individualHarmonicsDb.h2} dB, expected ~ -20 dB`
      );
    });
  });

  // -------------------------------------------------------------------------
  // Suite D: Dynamic Response (Crest Factor & Dynamic Range)
  // -------------------------------------------------------------------------
  describe("D. Dynamic Response Analysis", () => {
    it("calculates theoretical crest factor for sine wave (3.01 dB / 1.414 linear)", () => {
      const sineWav = createSyntheticPcmWav({
        sampleRate: 48000,
        frequencyHz: 440,
        durationSeconds: 0.3,
        amplitudeDbFs: -6,
      });
      const decoded = decodePcmWavSamples(sineWav);
      const dynamic = computeDynamicAnalysis(decoded.channels[0], undefined, decoded.sampleRate, DEFAULT_PRECISION_PROFILE);

      // For sine wave, peak / RMS = sqrt(2) = 1.414, 20*log10(sqrt(2)) = 3.01 dB
      assert.ok(
        Math.abs(dynamic.crestFactorLinear - 1.414) < 0.05,
        `Crest linear was ${dynamic.crestFactorLinear}, expected ~1.414`
      );
      assert.ok(
        Math.abs(dynamic.crestFactorDb - 3.01) < 0.2,
        `Crest dB was ${dynamic.crestFactorDb}, expected ~3.01 dB`
      );
      assert.ok(dynamic.dynamicRangeDb > 0);
    });
  });

  // -------------------------------------------------------------------------
  // Suite E: Phase Coherence & Stereo Width
  // -------------------------------------------------------------------------
  describe("E. Phase Coherence & Stereo Width", () => {
    it("returns phase correlation of +1.0 and stereo width of 0.0 for identical stereo channels", () => {
      const identicalWav = createStereoPcmWav({
        sampleRate: 48000,
        leftGenerator: (t) => Math.sin(2 * Math.PI * 1000 * t),
        rightGenerator: (t) => Math.sin(2 * Math.PI * 1000 * t),
      });
      const decoded = decodePcmWavSamples(identicalWav);
      const phase = computePhaseAnalysis(decoded.channels, DEFAULT_PRECISION_PROFILE);

      assert.strictEqual(phase.isStereo, true);
      assert.strictEqual(phase.phaseCorrelation, 1.0);
      assert.strictEqual(phase.stereoWidth, 0.0);
    });

    it("returns phase correlation of -1.0 for inverted (180 deg out-of-phase) stereo channels", () => {
      const invertedWav = createStereoPcmWav({
        sampleRate: 48000,
        leftGenerator: (t) => Math.sin(2 * Math.PI * 1000 * t),
        rightGenerator: (t) => -Math.sin(2 * Math.PI * 1000 * t),
      });
      const decoded = decodePcmWavSamples(invertedWav);
      const phase = computePhaseAnalysis(decoded.channels, DEFAULT_PRECISION_PROFILE);

      assert.strictEqual(phase.isStereo, true);
      assert.strictEqual(phase.phaseCorrelation, -1.0);
      assert.ok(phase.stereoWidth > 1.0, `Stereo width was ${phase.stereoWidth}`);
    });
  });

  // -------------------------------------------------------------------------
  // Suite F: Tolerance Profile Evaluation & Anti-Universal Threshold Enforcement
  // -------------------------------------------------------------------------
  describe("F. Profile-Governed Tolerance Evaluation", () => {
    it("evaluates to MET when measured value satisfies governed tolerance rule", () => {
      const rule: MetricToleranceRule = {
        metricName: "thd_percent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 5.0,
      };
      const outcome = evaluateToleranceRule(2.5, rule);
      assert.strictEqual(outcome.toleranceEvaluation, TOLERANCE_EVALUATIONS.MET);
      assert.strictEqual(outcome.passFailStatus, OBJECTIVE_PASS_FAIL_STATUSES.PASS);
    });

    it("evaluates to OUT_OF_TOLERANCE when measured value exceeds governed threshold", () => {
      const rule: MetricToleranceRule = {
        metricName: "thd_percent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 1.0,
      };
      const outcome = evaluateToleranceRule(3.5, rule);
      assert.strictEqual(outcome.toleranceEvaluation, TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE);
      assert.strictEqual(outcome.passFailStatus, OBJECTIVE_PASS_FAIL_STATUSES.FAIL);
    });

    it("evaluates to BORDERLINE when measured value falls within margin band", () => {
      const rule: MetricToleranceRule = {
        metricName: "thd_percent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 10.0,
        borderlineMarginPercent: 10.0, // 9.0 to 10.0 is borderline
      };
      const outcome = evaluateToleranceRule(9.5, rule);
      assert.strictEqual(outcome.toleranceEvaluation, TOLERANCE_EVALUATIONS.BORDERLINE);
      assert.strictEqual(outcome.passFailStatus, OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE);
    });

    it("strictly returns NOT_APPLICABLE and does not use universal fallback when no rule is declared", () => {
      const outcome = evaluateToleranceRule(15.2, undefined);
      assert.strictEqual(outcome.toleranceEvaluation, TOLERANCE_EVALUATIONS.NOT_APPLICABLE);
      assert.strictEqual(outcome.passFailStatus, OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE);
      assert.strictEqual(outcome.measuredDelta, 0.0);
    });
  });

  // -------------------------------------------------------------------------
  // Suite G: Numerical Safety & Input Eligibility Guards
  // -------------------------------------------------------------------------
  describe("G. Numerical Safety & Input Eligibility Guards", () => {
    it("fails cleanly when given malformed or empty audio payload", async () => {
      const engine = new ObjectiveMeasurementEngine();
      const emptyBuffer = new Uint8Array(0);

      await assert.rejects(
        () =>
          engine.measureExecution({
            executionRecord: sampleExecution,
            candidateAudio: emptyBuffer,
          }),
        IneligibleExecutionError
      );
    });

    it("fails closed when candidate audio integrity does not match execution record output_audio_integrity_ref", async () => {
      const engine = new ObjectiveMeasurementEngine();
      const tamperedWav = new Uint8Array(sampleCandidateWav);
      tamperedWav[tamperedWav.length - 1] ^= 0xff; // Flip a bit

      await assert.rejects(
        () =>
          engine.measureExecution({
            executionRecord: sampleExecution,
            candidateAudio: tamperedWav,
          }),
        IneligibleExecutionError
      );
    });

    it("fails closed when execution outcome was FAILED or ABORTED", async () => {
      const engine = new ObjectiveMeasurementEngine();
      const failedExec: ValidationExecutionRecord = {
        ...sampleExecution,
        outcome: EXECUTION_OUTCOMES.FAILED,
      };

      await assert.rejects(
        () =>
          engine.measureExecution({
            executionRecord: failedExec,
            candidateAudio: sampleCandidateWav,
          }),
        IneligibleExecutionError
      );
    });

    it("fails closed when case does not require objective evidence", async () => {
      const engine = new ObjectiveMeasurementEngine();
      const nonObjectiveCase: ValidationCase = {
        ...sampleCase,
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL],
      };

      await assert.rejects(
        () =>
          engine.measureExecution({
            executionRecord: sampleExecution,
            candidateAudio: sampleCandidateWav,
            caseRecord: nonObjectiveCase,
          }),
        InapplicableAnalysisError
      );
    });
  });

  // -------------------------------------------------------------------------
  // Suite H: Canonical EVIDENCED_BY Edge Management & Graph Invariants
  // -------------------------------------------------------------------------
  describe("H. Canonical Graph Edge Management & Graph Invariants", () => {
    it("creates exact canonical EVIDENCED_BY edge from ValidationCase to ObjectiveEvidenceRecord", async () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const engine = new ObjectiveMeasurementEngine({ graph, ledger });

      const result = await engine.measureExecution({
        executionRecord: sampleExecution,
        candidateAudio: sampleCandidateWav,
        caseRecord: sampleCase,
        testProfile: sampleTestProfile,
      });

      const evidenceId = result.evidenceRecord.objective_evidence_id;

      // Verify node was registered
      assert.strictEqual(graph.hasNode(evidenceId), true);
      assert.strictEqual(graph.getNode(evidenceId)?.kind, GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord);

      // Verify EVIDENCED_BY edge exists: ValidationCase -> ObjectiveEvidenceRecord
      const caseEvidence = graph.getEvidenceForCase(sampleCase.case_id);
      assert.ok(caseEvidence.objectiveEvidenceIds.includes(evidenceId));
      const evidenceEdge = caseEvidence.evidenceEdges.find(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY && e.target.id === evidenceId
      );

      assert.ok(evidenceEdge, "Expected EVIDENCED_BY edge from case to evidence record");
      assert.strictEqual(evidenceEdge.source.kind, GOVERNED_ENTITY_KINDS.ValidationCase);
      assert.strictEqual(evidenceEdge.target.kind, GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord);
      assert.strictEqual(evidenceEdge.isSymmetric, false);

      // Verify ledger received entry
      assert.ok(ledger.getEntryCount() >= 2);
    });

    it("creates zero execution -> evidence graph edges, preserving 14 governed edge types", async () => {
      const graph = new ValidationRelationshipGraph();
      const engine = new ObjectiveMeasurementEngine({ graph });

      const result = await engine.measureExecution({
        executionRecord: sampleExecution,
        candidateAudio: sampleCandidateWav,
        caseRecord: sampleCase,
        testProfile: sampleTestProfile,
      });

      // Verify NO edge exists with execution_id as source in graph
      const execEdges = graph.getEdges().filter((e) => e.source.id === sampleExecution.execution_id);
      assert.strictEqual(execEdges.length, 0, "Zero graph edges should originate from execution_id in WP-11");

      // Verify graph catalogue remains at exactly 14 edge types
      const registeredTypes = Object.keys(GOVERNED_EDGE_DEFINITIONS);
      assert.strictEqual(registeredTypes.length, 14, "Graph catalogue must remain at exactly 14 edge types");
    });
  });
});
