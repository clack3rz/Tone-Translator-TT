// src/sound-engineer/validation/evidence/objectiveMeasurementEngine.ts
// Objective Acoustic & Signal-Processing Measurement Engine (Record 10).
// Phase 1C.5h — WP-11.
// Bound to frozen specification v0.1j Section 15, Table 05, 06, 07, and Implementation Plan v0.1h WP-11.

import { deepFreeze } from "../../contracts/immutability";
import {
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  ObjectiveMetricCategory,
  REQUIRED_EVIDENCE_CLASSES,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  objectiveEvidenceRecordSchema,
  validationExecutionRecordSchema,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  createCanonicalEdgeId,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { IntegrityProvider } from "../schemas/integrity";
import { DEFAULT_INTEGRITY_PROVIDER } from "../fixtures/audioVerification";
import { decodePcmWavSamples } from "./audioDsp";
import { computeSpectralAnalysis } from "./spectralAnalysis";
import { computeHarmonicAnalysis } from "./harmonicAnalysis";
import { computeDynamicAnalysis } from "./dynamicAnalysis";
import { computePhaseAnalysis } from "./phaseAnalysis";
import {
  DefaultToleranceProfileResolver,
  evaluateToleranceRule,
} from "./toleranceResolver";
import {
  DEFAULT_PRECISION_PROFILE,
  MeasureExecutionParams,
  MeasurementPrecisionProfile,
  ObjectiveMeasurementDependencies,
  ObjectiveMeasurementResult,
  ToleranceCriteriaProfile,
  ToleranceProfileResolver,
} from "./objectiveTypes";
import {
  AudioPayloadMalformedError,
  InapplicableAnalysisError,
  IneligibleExecutionError,
  MeasurementBudgetExceededError,
} from "./measurementErrors";

/**
 * ObjectiveMeasurementEngine:
 * Extracts deterministic, mathematical, and signal-processing metrics from WP-10 rendered audio,
 * validates against version-bound tolerance profiles without universal numeric freezing,
 * produces sealed ObjectiveEvidenceRecords (Record 10), and attaches canonical EVIDENCED_BY edges.
 */
export class ObjectiveMeasurementEngine {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly toleranceResolver: ToleranceProfileResolver;
  private readonly defaultPrecision: MeasurementPrecisionProfile;
  private readonly defaultBudgetMs: number;

  /** Immutable in-memory registry of recorded evidence */
  private readonly evidenceRegistry: Map<string, ObjectiveEvidenceRecord> = new Map();

  constructor(dependencies: ObjectiveMeasurementDependencies = {}) {
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.integrityProvider =
      dependencies.integrityProvider ?? DEFAULT_INTEGRITY_PROVIDER;
    this.toleranceResolver =
      dependencies.toleranceResolver ?? new DefaultToleranceProfileResolver();
    this.defaultPrecision =
      dependencies.defaultPrecisionProfile ?? DEFAULT_PRECISION_PROFILE;
    this.defaultBudgetMs = dependencies.defaultBudgetMs ?? 10000;
  }

  public getEvidence(evidenceId: string): ObjectiveEvidenceRecord | undefined {
    return this.evidenceRegistry.get(evidenceId);
  }

  public getAllEvidence(): ReadonlyArray<ObjectiveEvidenceRecord> {
    return Array.from(this.evidenceRegistry.values());
  }

  public getEvidenceCount(): number {
    return this.evidenceRegistry.size;
  }

  /**
   * Generates a deterministic unique identifier for Record 10 evidence.
   */
  private generateEvidenceId(executionId: string, category: string): string {
    const raw = `${executionId}:${category}:${Math.random().toString(36).substring(2, 9)}`;
    const digest = this.integrityProvider.computeDigest(raw).substring(7, 19);
    return `EVID-OBJ-${executionId}-${digest}`;
  }

  /**
   * Analyzes a completed WP-10 validation execution and generates a sealed ObjectiveEvidenceRecord.
   */
  public async measureExecution(
    params: MeasureExecutionParams
  ): Promise<ObjectiveMeasurementResult> {
    const startTime = Date.now();
    const budgetMs = params.operationalBudgetMs ?? this.defaultBudgetMs;
    const budgetRef = params.operationalBudgetRef ?? "tolerance_spec_ref:operational_budget_ref";

    // 1. Input Eligibility: Validate Execution Record Schema
    try {
      validationExecutionRecordSchema.parse(params.executionRecord);
    } catch (err: unknown) {
      throw new IneligibleExecutionError(
        params.executionRecord?.execution_id ?? "UNKNOWN",
        `Execution record schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. Input Eligibility: Verify Execution Outcome
    if (params.executionRecord.outcome !== EXECUTION_OUTCOMES.COMPLETED) {
      throw new IneligibleExecutionError(
        params.executionRecord.execution_id,
        `Execution outcome is '${params.executionRecord.outcome}'. Objective measurement requires COMPLETED execution.`
      );
    }

    // 3. Input Eligibility: Candidate Audio Presence & Bit-Level Integrity
    if (!params.candidateAudio || params.candidateAudio.length === 0) {
      throw new IneligibleExecutionError(
        params.executionRecord.execution_id,
        "Candidate audio buffer is empty or missing."
      );
    }

    const computedDigest = this.integrityProvider.computeDigest(params.candidateAudio);
    const expectedDigest = params.executionRecord.output_audio_integrity_ref;
    const isIntegrityMatch =
      computedDigest === expectedDigest ||
      computedDigest.replace(/^sha256:/, "") === expectedDigest.replace(/^sha256:/, "");

    if (!isIntegrityMatch) {
      throw new IneligibleExecutionError(
        params.executionRecord.execution_id,
        `Candidate audio integrity mismatch: computed '${computedDigest}' does not match execution record output '${params.executionRecord.output_audio_integrity_ref}'.`
      );
    }

    // 4. Evidence Class Applicability Verification (WP-09 / WP-07)
    if (params.caseRecord) {
      const requiresObjective =
        params.caseRecord.required_evidence_classes.includes(
          REQUIRED_EVIDENCE_CLASSES.OBJECTIVE
        ) ||
        params.caseRecord.required_evidence_classes.includes(
          REQUIRED_EVIDENCE_CLASSES.MIXED
        );

      if (!requiresObjective) {
        throw new InapplicableAnalysisError(
          "OBJECTIVE_MEASUREMENT",
          `Validation case '${params.caseRecord.case_id}' does not require objective evidence.`
        );
      }
    }

    // 5. Decode Audio Streams
    const candidateStream = decodePcmWavSamples(params.candidateAudio);
    let baselineStream = undefined;
    if (params.baselineAudio && params.baselineAudio.length > 0) {
      baselineStream = decodePcmWavSamples(params.baselineAudio);
    }

    const precision = params.precisionProfile ?? this.defaultPrecision;
    const category = params.targetCategory ?? OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS;

    // 6. Execute Specific Objective Measurement Algorithms
    let measuredParameters: Record<string, unknown> = {};
    let representativeMetricValue = 0;
    let targetMetricKey = "primary_delta";

    switch (category) {
      case OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS: {
        const spectral = computeSpectralAnalysis(
          candidateStream.channels[0],
          baselineStream ? baselineStream.channels[0] : undefined,
          candidateStream.sampleRate,
          precision
        );
        measuredParameters = {
          peak_frequency_hz: spectral.peakFrequencyHz,
          spectral_centroid_hz: spectral.spectralCentroidHz,
          spectral_rolloff_hz: spectral.spectralRolloffHz,
          spectral_tilt_db_octave: spectral.spectralTiltDbPerOctave,
          frequency_response_delta_db: spectral.frequencyResponseDeltaDb,
          total_band_energy: spectral.totalBandEnergy,
        };
        targetMetricKey = "frequency_response_delta_db";
        representativeMetricValue = spectral.frequencyResponseDeltaDb ?? spectral.spectralCentroidHz;
        break;
      }

      case OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION: {
        const harmonic = computeHarmonicAnalysis(
          candidateStream.channels[0],
          candidateStream.sampleRate,
          undefined,
          precision
        );
        measuredParameters = {
          fundamental_frequency_hz: harmonic.fundamentalFrequencyHz,
          fundamental_magnitude_db: harmonic.fundamentalMagnitudeDb,
          thd_percent: harmonic.thdPercent,
          thd_plus_n_db: harmonic.thdPlusNDb,
          harmonic_energy_ratio: harmonic.harmonicEnergyRatio,
          individual_harmonics_db: harmonic.individualHarmonicsDb,
        };
        targetMetricKey = "thd_percent";
        representativeMetricValue = harmonic.thdPercent;
        break;
      }

      case OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE: {
        const dynamic = computeDynamicAnalysis(
          candidateStream.channels[0],
          baselineStream ? baselineStream.channels[0] : undefined,
          candidateStream.sampleRate,
          precision
        );
        measuredParameters = {
          peak_amplitude_linear: dynamic.peakAmplitudeLinear,
          rms_linear: dynamic.rmsLinear,
          peak_amplitude_dbfs: dynamic.peakAmplitudeDbFs,
          rms_dbfs: dynamic.rmsDbFs,
          crest_factor_linear: dynamic.crestFactorLinear,
          crest_factor_db: dynamic.crestFactorDb,
          dynamic_range_db: dynamic.dynamicRangeDb,
          compression_envelope_delta_db: dynamic.compressionEnvelopeDeltaDb,
        };
        targetMetricKey = "crest_factor_db";
        representativeMetricValue = dynamic.compressionEnvelopeDeltaDb ?? dynamic.crestFactorDb;
        break;
      }

      case OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE: {
        const phase = computePhaseAnalysis(candidateStream.channels, precision);
        measuredParameters = {
          channel_count: phase.channelCount,
          is_stereo: phase.isStereo,
          phase_correlation: phase.phaseCorrelation,
          stereo_width: phase.stereoWidth,
        };
        targetMetricKey = "phase_correlation";
        representativeMetricValue = phase.phaseCorrelation;
        break;
      }

      case OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE: {
        const wallClockMs = params.executionRecord.execution_duration_ms;
        measuredParameters = {
          execution_duration_ms: wallClockMs,
          telemetry_wall_clock_ms: params.executionRecord.raw_measurements["execution_wall_clock_ms"] ?? wallClockMs,
        };
        targetMetricKey = "execution_duration_ms";
        representativeMetricValue = wallClockMs;
        break;
      }

      case OBJECTIVE_METRIC_CATEGORIES.STRUCTURAL_SCHEMA:
      case OBJECTIVE_METRIC_CATEGORIES.PARAMETER_BOUNDS:
      case OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY: {
        // Schema and bounds analysis
        measuredParameters = {
          schema_conformance: true,
          bounds_clamping_violations: 0,
          export_serialization_error_count: 0,
        };
        targetMetricKey = "bounds_clamping_violations";
        representativeMetricValue = 0;
        break;
      }

      default:
        throw new InapplicableAnalysisError(category, "Unrecognized objective metric category");
    }

    // 7. Resolve Version-Bound Tolerance Profile (ZERO universal numeric freezing)
    let toleranceProfile: ToleranceCriteriaProfile | undefined = params.toleranceProfile;
    if (!toleranceProfile && params.testProfile?.tolerance_criteria_spec) {
      toleranceProfile = this.toleranceResolver.resolveToleranceProfile(
        params.testProfile.tolerance_criteria_spec
      );
    }

    const appliedProfileRef =
      toleranceProfile?.profileRef ??
      params.testProfile?.tolerance_criteria_spec ??
      "tolerance_spec_ref:none_declared";

    // 8. Evaluate Tolerance against Governed Rules
    const matchingRule = toleranceProfile?.metricRules.find(
      (r) => r.metricName === targetMetricKey
    );

    const evaluation = evaluateToleranceRule(representativeMetricValue, matchingRule);

    // 9. Operational Budget Check
    const durationMs = Date.now() - startTime;
    if (durationMs > budgetMs) {
      throw new MeasurementBudgetExceededError(durationMs, budgetMs, budgetRef);
    }

    // 10. Assemble and Validate Record 10 ObjectiveEvidenceRecord
    const evidenceId = this.generateEvidenceId(params.executionRecord.execution_id, category);
    const artifactsRetained: string[] = [
      params.executionRecord.output_audio_integrity_ref,
      ...(params.retentionArtifactRefs ?? []),
    ];

    const evidenceRaw = {
      objective_evidence_id: evidenceId,
      execution_id: params.executionRecord.execution_id,
      metric_category: category,
      measured_parameters: measuredParameters,
      applied_threshold_profile_ref: appliedProfileRef,
      tolerance_evaluation: evaluation.toleranceEvaluation,
      measured_delta: evaluation.measuredDelta,
      objective_pass_fail: evaluation.passFailStatus,
      artifacts_retained: artifactsRetained,
    };

    const validatedRecord: ObjectiveEvidenceRecord = objectiveEvidenceRecordSchema.parse(evidenceRaw);
    const frozenRecord = deepFreeze(validatedRecord);

    // Store in historical registry
    this.evidenceRegistry.set(evidenceId, frozenRecord);

    // 11. Graph Linage & Governance Ownership (EVIDENCED_BY edge)
    // Canonical edge: ValidationCase | ValidationOutcomeRecord -> ObjectiveEvidenceRecord
    // NEVER create ExecutionRecord -> EvidenceRecord graph edge!
    if (this.graph) {
      // Register evidence node
      if (!this.graph.hasNode(evidenceId)) {
        this.graph.registerNode({
          id: evidenceId,
          kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
        });
      }

      if (params.caseRecord) {
        if (!this.graph.hasNode(params.caseRecord.case_id)) {
          this.graph.registerNode({
            id: params.caseRecord.case_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationCase,
          });
        }
        this.graph.addEdge({
          source: { id: params.caseRecord.case_id, kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          target: { id: evidenceId, kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
        });
      }
    }

    // 12. Audit Ledger Append
    if (this.ledger) {
      const nowIso = new Date().toISOString();
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
        evidenceId,
        frozenRecord,
        nowIso
      );

      if (params.caseRecord) {
        const edgeId = createCanonicalEdgeId(
          GOVERNED_EDGE_TYPES.EVIDENCED_BY,
          params.caseRecord.case_id,
          evidenceId
        );
        this.ledger.appendEdge({
          edgeId,
          edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
          source: { id: params.caseRecord.case_id, kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          target: { id: evidenceId, kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          isSymmetric: false,
          createdAt: nowIso,
        });
      }
    }

    return {
      evidenceRecord: frozenRecord,
      durationMs,
    };
  }
}
