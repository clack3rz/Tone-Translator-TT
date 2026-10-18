// src/sound-engineer/validation/evidence/objectiveTypes.ts
// Type definitions for Phase 1C.5h WP-11:
// Objective Acoustic & Signal-Processing Measurement Engine (Record 10).
// Bound to frozen specification v0.1j Section 15, Table 05, 06, and 07.

import {
  ObjectiveMetricCategory,
  ToleranceEvaluation,
  ObjectivePassFailStatus,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  ValidationCase,
  ValidationExecutionRecord,
  TestProfileRecord,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { IntegrityProvider } from "../schemas/integrity";

/**
 * Standard measurement precision profile configuration.
 * Governs numeric precision, decimal rounding, and epsilon bounds.
 */
export interface MeasurementPrecisionProfile {
  readonly precisionProfileId: string;
  readonly decimalPlaces: number;
  readonly floatEpsilon: number;
}

export const DEFAULT_PRECISION_PROFILE: MeasurementPrecisionProfile = {
  precisionProfileId: "PRECISION-PROFILE-STD-4DP",
  decimalPlaces: 4,
  floatEpsilon: 1e-7,
};

/**
 * Tolerance evaluation criteria for a single objective metric dimension.
 * Explicitly governed by profile - NEVER hardcoded universal constants.
 */
export interface MetricToleranceRule {
  readonly metricName: string;
  readonly comparisonType: "DELTA_LESS_THAN" | "VALUE_LESS_THAN" | "VALUE_GREATER_THAN" | "RANGE";
  readonly thresholdValue: number;
  readonly secondaryThresholdValue?: number;
  readonly borderlineMarginPercent?: number; // e.g. 5% margin for BORDERLINE status
}

/**
 * Tolerance criteria profile containing governed rules for an objective profile.
 */
export interface ToleranceCriteriaProfile {
  readonly profileRef: string;
  readonly metricRules: ReadonlyArray<MetricToleranceRule>;
  readonly defaultPassFailBehavior?: "STRICT" | "LENIENT";
}

/**
 * Interface for resolving tolerance profiles.
 */
export interface ToleranceProfileResolver {
  resolveToleranceProfile(specRef: string): ToleranceCriteriaProfile | undefined;
}

/**
 * Spectral Analysis raw metrics.
 */
export interface SpectralAnalysisResult {
  readonly peakFrequencyHz: number;
  readonly spectralCentroidHz: number;
  readonly spectralRolloffHz: number;
  readonly spectralTiltDbPerOctave: number;
  readonly frequencyResponseDeltaDb?: number;
  readonly totalBandEnergy: number;
}

/**
 * Harmonic Distortion raw metrics.
 */
export interface HarmonicAnalysisResult {
  readonly fundamentalFrequencyHz: number;
  readonly fundamentalMagnitudeDb: number;
  readonly thdPercent: number;
  readonly thdPlusNDb?: number;
  readonly harmonicEnergyRatio: number;
  readonly individualHarmonicsDb: Readonly<Record<string, number>>;
}

/**
 * Dynamic Response raw metrics.
 */
export interface DynamicAnalysisResult {
  readonly peakAmplitudeLinear: number;
  readonly rmsLinear: number;
  readonly peakAmplitudeDbFs: number;
  readonly rmsDbFs: number;
  readonly crestFactorLinear: number;
  readonly crestFactorDb: number;
  readonly dynamicRangeDb: number;
  readonly compressionEnvelopeDeltaDb?: number;
}

/**
 * Phase & Spatial raw metrics.
 */
export interface PhaseAnalysisResult {
  readonly channelCount: number;
  readonly isStereo: boolean;
  readonly phaseCorrelation: number;
  readonly stereoWidth: number;
}

/**
 * Signal-to-Noise and artifact metrics.
 */
export interface NoiseArtifactsResult {
  readonly snrDb: number;
  readonly noiseFloorDbFs: number;
  readonly aliasingEnergyRatio?: number;
}

/**
 * Parameters for executing objective measurement on a completed execution run.
 */
export interface MeasureExecutionParams {
  readonly executionRecord: ValidationExecutionRecord;
  readonly candidateAudio: Uint8Array;
  readonly baselineAudio?: Uint8Array;
  readonly caseRecord?: ValidationCase;
  readonly testProfile?: TestProfileRecord;
  readonly toleranceProfile?: ToleranceCriteriaProfile;
  readonly precisionProfile?: MeasurementPrecisionProfile;
  readonly targetCategory?: ObjectiveMetricCategory;
  readonly operationalBudgetMs?: number;
  readonly operationalBudgetRef?: string;
  readonly retentionArtifactRefs?: ReadonlyArray<string>;
}

/**
 * Dependencies injected into ObjectiveMeasurementEngine.
 */
export interface ObjectiveMeasurementDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly integrityProvider?: IntegrityProvider;
  readonly toleranceResolver?: ToleranceProfileResolver;
  readonly defaultPrecisionProfile?: MeasurementPrecisionProfile;
  readonly defaultBudgetMs?: number;
}

/**
 * Result bundle produced by measuring a validation execution.
 */
export interface ObjectiveMeasurementResult {
  readonly evidenceRecord: ObjectiveEvidenceRecord;
  readonly durationMs: number;
}
