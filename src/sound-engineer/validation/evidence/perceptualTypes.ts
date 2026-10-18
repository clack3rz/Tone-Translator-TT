// src/sound-engineer/validation/evidence/perceptualTypes.ts
// Authoritative types, domain enums, and interfaces for Phase 1C.5h WP-12:
// Perceptual Evaluation, Blind Listening & Psychoacoustic Harness (Record 11).
// Bound to frozen specification v0.1j Section 16, Table 06, Table 07, and Implementation Plan v0.1h WP-12.

import {
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PerceptualConfidenceLevel,
  PerceptualEvaluationOutcome,
  PerceptualEvaluatorRole,
  PerceptualMethodology,
} from "../schemas/enums";
import {
  ListeningEnvironment,
  PerceptualEvaluationRecord,
  TestProfileRecord,
  ValidationCase,
  ValidationExecutionRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";

/**
 * Governed listening monitor types.
 */
export const PERCEPTUAL_MONITOR_TYPES = {
  NEARFIELD_STUDIO_MONITORS: "NEARFIELD_STUDIO_MONITORS",
  OPEN_BACK_HEADPHONES: "OPEN_BACK_HEADPHONES",
  IEM: "IEM",
  GUITAR_CAB_FRFR: "GUITAR_CAB_FRFR",
} as const;
export type PerceptualMonitorType =
  (typeof PERCEPTUAL_MONITOR_TYPES)[keyof typeof PERCEPTUAL_MONITOR_TYPES];

/**
 * Governed acoustic treatment levels.
 */
export const PERCEPTUAL_ACOUSTIC_TREATMENTS = {
  TREATED_CONTROL_ROOM: "TREATED_CONTROL_ROOM",
  UNTREATED: "UNTREATED",
  REFERENCE_HEADPHONE: "REFERENCE_HEADPHONE",
} as const;
export type PerceptualAcousticTreatment =
  (typeof PERCEPTUAL_ACOUSTIC_TREATMENTS)[keyof typeof PERCEPTUAL_ACOUSTIC_TREATMENTS];

/**
 * Canonical perceptual evaluation dimensions defined in frozen Section 16.3.
 */
export const CANONICAL_PERCEPTUAL_DIMENSIONS = {
  TONAL_BALANCE: "tonal_balance",
  HARMONIC_WARMTH_VS_HARSHNESS: "harmonic_warmth_vs_harshness",
  TRANSIENT_PUNCH_AND_CLARITY: "transient_punch_and_clarity",
  DYNAMIC_TOUCH_RESPONSE: "dynamic_touch_response",
  MIX_PRESENCE_AND_SEPARATION: "mix_presence_and_separation",
  LISTENING_FATIGUE_ABSENCE: "listening_fatigue_absence",
} as const;
export type CanonicalPerceptualDimension =
  (typeof CANONICAL_PERCEPTUAL_DIMENSIONS)[keyof typeof CANONICAL_PERCEPTUAL_DIMENSIONS];

/**
 * Pluggable random number generator for stimulus presentation and blinding randomization.
 * Defaults to production Math.random; can be injected with deterministic PRNG for test reproducibility.
 */
export type RandomSource = () => number;

/**
 * Helper creating a deterministic pseudo-random number generator for reproducible testing.
 */
export function createDeterministicRandomSource(initialSeed = 123456789): RandomSource {
  let s = initialSeed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Internal unblinded role of an audio stimulus within an evaluation session.
 */
export type StimulusRole =
  | "CANDIDATE"
  | "BASELINE"
  | "REFERENCE"
  | "HIDDEN_REFERENCE"
  | "ANCHOR"
  | "PROBE_X";

/**
 * Internal stimulus descriptor holding bit-level audio payload and provenance.
 */
export interface InternalStimulus {
  readonly id: string;
  readonly role: StimulusRole;
  readonly audioPayload: Uint8Array;
  readonly integrityRef: string;
  readonly description?: string;
  readonly isAnchor?: boolean;
  readonly anchorType?: "LOW_PASS" | "BAND_LIMIT" | "NOISE" | "DEGRADED";
}

/**
 * Blinded stimulus presentation item exposed to the evaluator UI / panel.
 * CRITICAL: Must NEVER expose candidate, baseline, or anchor identity, filenames, or path labels.
 */
export interface BlindedStimulusPresentationItem {
  readonly token: string;
  readonly audioPayload: Uint8Array;
  readonly integrityRef: string;
}

/**
 * Representation of a blinded presentation session.
 * The decoding map is isolated from evaluator-facing payloads.
 */
export interface BlindedPresentationSession {
  readonly sessionId: string;
  readonly methodology: PerceptualMethodology;
  readonly presentationItems: ReadonlyArray<BlindedStimulusPresentationItem>;
  /**
   * Internal decoding map strictly hidden from evaluator-facing payloads.
   */
  readonly internalDecodingMap: ReadonlyMap<string, StimulusRole>;
}

/**
 * Definition of a single rated dimension in a governed rating scale.
 */
export interface RatingDimensionDefinition {
  readonly dimensionKey: string;
  readonly label: string;
  readonly scaleType: "NUMERIC_RANGE" | "DISCRETE_CATEGORIES" | "BOOLEAN";
  readonly min?: number;
  readonly max?: number;
  readonly categories?: ReadonlyArray<string>;
  readonly description?: string;
}

/**
 * Governed rating scale profile defining valid scoring bounds and outcome evaluation.
 * ZERO universal numeric freezing: pass/fail criteria are strictly governed by profile.
 */
export interface RatingScaleProfile {
  readonly profileRef: string;
  readonly scaleName: string;
  readonly dimensions: ReadonlyArray<RatingDimensionDefinition>;
  /**
   * Evaluates final outcome based on governed rules.
   * If required governance is unavailable, returns PERCEPTUAL_INCONCLUSIVE.
   */
  readonly evaluateOutcome: (
    ratings: Record<string, number | string>,
    context?: {
      readonly isAnchorValid?: boolean;
      readonly isDurationExceeded?: boolean;
      readonly interRaterReliability?: number;
    }
  ) => PerceptualEvaluationOutcome;
}

/**
 * Governed listening methodology profile defining blinding, duration, and anchor requirements.
 */
export interface ListeningMethodologyProfile {
  readonly profileRef: string;
  readonly methodology: PerceptualMethodology;
  readonly requiresBlinding: boolean;
  readonly requiresHiddenReference: boolean;
  readonly requiresAnchorCheck: boolean;
  readonly maxSessionDurationMinutes?: number;
  readonly minEvaluators?: number;
  /** Governed anchor verification logic */
  readonly verifyAnchorRating?: (
    anchorRating: number | string,
    referenceRating?: number | string
  ) => boolean;
  /** Governed inter-rater reliability method and threshold */
  readonly reliabilityMethod?: "KAPPA" | "PEARSON_CORRELATION" | "PERCENTAGE_AGREEMENT";
  readonly verifyReliability?: (reliabilityScore: number) => boolean;
}

/**
 * Evaluator qualification information kept internal to session state.
 * Never persisted to Record 11.
 */
export interface EvaluatorQualifications {
  readonly yearsExperience?: number;
  readonly hearingThresholdCertified?: boolean;
  readonly specializedGenres?: ReadonlyArray<string>;
  readonly notes?: string;
}

/**
 * Input parameters for executing a perceptual listening evaluation.
 */
export interface PerceptualEvaluationParams {
  readonly executionRecord: ValidationExecutionRecord;
  readonly caseRecord?: ValidationCase;
  readonly testProfile?: TestProfileRecord;
  readonly candidateAudio: Uint8Array;
  readonly baselineAudio?: Uint8Array;
  readonly referenceAudio?: Uint8Array;
  readonly anchorAudio?: Uint8Array;
  readonly evaluatorId: string;
  readonly evaluatorRole: PerceptualEvaluatorRole;
  readonly evaluatorPersonaId?: string;
  readonly methodology: PerceptualMethodology;
  readonly listeningEnvironment: ListeningEnvironment;
  readonly ratings: Record<string, number | string>;
  readonly qualitativeObservations: string;
  readonly confidence: PerceptualConfidenceLevel;
  readonly sessionDurationMinutes?: number;
  readonly evaluatorQualifications?: EvaluatorQualifications;
  readonly methodologyProfile?: ListeningMethodologyProfile;
  readonly ratingScaleProfile?: RatingScaleProfile;
  readonly randomSource?: RandomSource;
}

/**
 * Output of a single perceptual evaluation session.
 */
export interface PerceptualEvaluationResult {
  readonly evidenceRecord: PerceptualEvaluationRecord;
  readonly blindedPresentation: BlindedPresentationSession;
  readonly sessionDurationMinutes?: number;
  readonly isAnchorValid?: boolean;
}

/**
 * Multi-evaluator panel evaluation input.
 */
export interface MultiEvaluatorPanelParams {
  readonly executionRecord: ValidationExecutionRecord;
  readonly caseRecord?: ValidationCase;
  readonly testProfile?: TestProfileRecord;
  readonly candidateAudio: Uint8Array;
  readonly baselineAudio?: Uint8Array;
  readonly referenceAudio?: Uint8Array;
  readonly anchorAudio?: Uint8Array;
  readonly methodology: PerceptualMethodology;
  readonly listeningEnvironment: ListeningEnvironment;
  readonly methodologyProfile?: ListeningMethodologyProfile;
  readonly ratingScaleProfile?: RatingScaleProfile;
  readonly randomSource?: RandomSource;
  readonly evaluators: ReadonlyArray<{
    readonly evaluatorId: string;
    readonly evaluatorRole: PerceptualEvaluatorRole;
    readonly evaluatorPersonaId?: string;
    readonly ratings: Record<string, number | string>;
    readonly qualitativeObservations: string;
    readonly confidence: PerceptualConfidenceLevel;
    readonly sessionDurationMinutes?: number;
    readonly evaluatorQualifications?: EvaluatorQualifications;
  }>;
}

/**
 * Multi-evaluator panel evaluation result.
 */
export interface MultiEvaluatorPanelResult {
  readonly evidenceRecords: ReadonlyArray<PerceptualEvaluationRecord>;
  readonly interRaterReliability?: number;
  readonly reliabilityMethod?: string;
  readonly isReliabilityAccepted?: boolean;
  readonly panelOutcome: PerceptualEvaluationOutcome;
}

/**
 * Dependencies injected into PerceptualListeningHarness.
 */
export interface PerceptualHarnessDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly integrityProvider?: IntegrityProvider;
  readonly defaultRandomSource?: RandomSource;
}
