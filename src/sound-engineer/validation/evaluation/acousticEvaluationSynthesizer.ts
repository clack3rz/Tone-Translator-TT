// src/sound-engineer/validation/evaluation/acousticEvaluationSynthesizer.ts
// AcousticEvaluationSynthesizer: Multi-Dimensional Acoustic Evaluation & Orthogonal Tolerance Engine.
// Phase 1C.5h — WP-14.
// Bound to frozen specification v0.1j Section 19, Invariant 2, Invariant 7, and Plan Override v0.1h.

import { deepFreeze } from "../../contracts/immutability";
import { TEST_PROFILE_FAMILIES } from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  objectiveEvidenceRecordSchema,
  PerceptualEvaluationRecord,
  perceptualEvaluationRecordSchema,
  TestProfileRecord,
  ValidationCase,
} from "../schemas/records";
import {
  ACOUSTIC_EVALUATION_DIMENSIONS,
  ACOUSTIC_SYNTHESIS_STATES,
  AcousticEvaluationDimension,
  AcousticEvaluationSynthesis,
  AcousticSynthesisState,
  ALL_ACOUSTIC_DIMENSIONS,
  DIMENSION_APPLICABILITY_STATES,
  DIMENSION_EVALUATION_STATUSES,
  DimensionEvaluationResult,
  DimensionToleranceSpec,
} from "./acousticEvaluationTypes";
import {
  InvalidEvidenceSchemaError,
  ScalarCollapseForbiddenError,
  UnrecognizedTopologyError,
} from "./acousticEvaluationErrors";
import { ToleranceCriteriaResolver } from "./toleranceCriteriaResolver";
import { OrthogonalDimensionEvaluator } from "./orthogonalDimensionEvaluator";

export interface SynthesizeAcousticEvaluationParams {
  readonly caseRecord?: ValidationCase | { readonly case_id: string; readonly applicable_test_dimensions?: ReadonlyArray<string> };
  readonly packageRef?: string;
  readonly assignedProfiles: ReadonlyArray<TestProfileRecord | string>;
  readonly applicableDimensions?: ReadonlyArray<AcousticEvaluationDimension>;
  readonly objectiveEvidence: ReadonlyArray<ObjectiveEvidenceRecord>;
  readonly perceptualEvidence: ReadonlyArray<PerceptualEvaluationRecord>;
  readonly gearTopology?: string;
  readonly componentClass?: string;
  readonly toleranceSpecRef?: string;
  readonly toleranceResolver?: ToleranceCriteriaResolver;
  readonly customToleranceSpecs?: ReadonlyArray<DimensionToleranceSpec>;
  readonly failClosedOnUnrecognizedTopology?: boolean;
}

/**
 * Normalizes a profile identifier for robust matching across enums and short codes.
 */
function normalizeProfile(p: TestProfileRecord | string): string {
  const raw = typeof p === "string" ? p : p.profile_family || p.profile_id;
  return raw.trim().toUpperCase().replace(/[-_]/g, "");
}

/**
 * Determines which acoustic dimensions are applicable based on assigned profile families
 * or explicitly declared applicable test dimensions from the validation case.
 * Table 05 & Table 07 mappings:
 * - PROFILE-04 (Objective Acoustic): Spectral, Harmonic, Phase
 * - PROFILE-05 (Dynamic Response): Dynamic
 * - PROFILE-06 (Perceptual Listening): Spectral, Dynamic, Harmonic
 * - PROFILE-07 (Playability): Playability
 * - PROFILE-08 (Mix Context): Mix Context
 */
function determineApplicableDimensions(
  assignedProfiles: ReadonlyArray<TestProfileRecord | string>,
  explicitDimensions?: ReadonlyArray<string>
): Set<AcousticEvaluationDimension> {
  // If the validation case or caller explicitly declares applicable test dimensions, honor that!
  if (explicitDimensions && explicitDimensions.length > 0) {
    const set = new Set<AcousticEvaluationDimension>();
    for (const d of explicitDimensions) {
      const norm = d.trim().toUpperCase();
      if (norm in ACOUSTIC_EVALUATION_DIMENSIONS) {
        set.add(norm as AcousticEvaluationDimension);
      }
    }
    if (set.size > 0) {
      return set;
    }
  }

  const applicable = new Set<AcousticEvaluationDimension>();

  for (const prof of assignedProfiles) {
    const norm = normalizeProfile(prof);

    if (norm.includes("PROFILE04") || norm.includes("PROFILE4") || norm.includes("OBJECTIVEACOUSTIC")) {
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL);
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC);
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.PHASE);
    }
    if (norm.includes("PROFILE05") || norm.includes("PROFILE5") || norm.includes("DYNAMICRESPONSE")) {
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC);
    }
    if (norm.includes("PROFILE06") || norm.includes("PROFILE6") || norm.includes("PERCEPTUALLISTENING")) {
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL);
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC);
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC);
    }
    if (norm.includes("PROFILE07") || norm.includes("PROFILE7") || norm.includes("PLAYABILITY")) {
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.PLAYABILITY);
    }
    if (norm.includes("PROFILE08") || norm.includes("PROFILE8") || norm.includes("MIXCONTEXT")) {
      applicable.add(ACOUSTIC_EVALUATION_DIMENSIONS.MIX_CONTEXT);
    }
  }

  return applicable;
}

/**
 * AcousticEvaluationSynthesizer:
 * Evaluates governed acoustic evidence across independent orthogonal dimensions
 * without scalar collapse, composite scoring, or threshold fabrication.
 *
 * Governing Rule:
 * `NO UNIVERSAL SYNTHETIC ACOUSTIC SCORE.`
 */
export class AcousticEvaluationSynthesizer {
  private readonly defaultResolver: ToleranceCriteriaResolver;

  constructor(toleranceResolver?: ToleranceCriteriaResolver) {
    this.defaultResolver = toleranceResolver ?? new ToleranceCriteriaResolver();
  }

  /**
   * Anti-Scalar Collapse Guard: Throws error if any attempt is made to compute
   * scalar averages or composite scores.
   */
  public computeScalarScore(): never {
    throw new ScalarCollapseForbiddenError(
      "AcousticEvaluationSynthesizer.computeScalarScore() is strictly forbidden by Invariant 2."
    );
  }

  /**
   * Synthesizes multi-dimensional acoustic evidence across all orthogonal dimensions.
   */
  public synthesize(params: SynthesizeAcousticEvaluationParams): AcousticEvaluationSynthesis {
    const {
      caseRecord,
      packageRef,
      assignedProfiles,
      objectiveEvidence,
      perceptualEvidence,
      gearTopology,
      componentClass,
      toleranceSpecRef,
      toleranceResolver = this.defaultResolver,
      customToleranceSpecs,
      failClosedOnUnrecognizedTopology = false,
    } = params;

    // -------------------------------------------------------------------------
    // 1. Evidence Schema & Integrity Validation
    // -------------------------------------------------------------------------
    for (const obj of objectiveEvidence) {
      try {
        objectiveEvidenceRecordSchema.parse(obj);
      } catch (err: unknown) {
        throw new InvalidEvidenceSchemaError(
          obj?.objective_evidence_id ?? "UNKNOWN",
          "ObjectiveEvidenceRecord",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    for (const perc of perceptualEvidence) {
      try {
        perceptualEvaluationRecordSchema.parse(perc);
      } catch (err: unknown) {
        throw new InvalidEvidenceSchemaError(
          perc?.perceptual_evidence_id ?? "UNKNOWN",
          "PerceptualEvaluationRecord",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // Register any custom tolerance specs provided for this run
    if (customToleranceSpecs) {
      for (const spec of customToleranceSpecs) {
        toleranceResolver.registerSpec(spec);
      }
    }

    // -------------------------------------------------------------------------
    // 2. Unrecognized Topology Handling (Critical Plan Defect Override)
    // -------------------------------------------------------------------------
    // If gearTopology is supplied, check whether any tolerance spec exists for it.
    // Strictly prohibits fallback to "strictest conservative tolerances", nearest-family borrowing,
    // or synthetic thresholds.
    let isTopologyUnrecognized = false;
    let unrecognizedTopologyReason: string | undefined;

    if (gearTopology) {
      const hasAnySpecForTopology = ALL_ACOUSTIC_DIMENSIONS.some((dim) =>
        toleranceResolver.hasTolerance(dim, gearTopology)
      );

      if (!hasAnySpecForTopology) {
        isTopologyUnrecognized = true;
        unrecognizedTopologyReason = `Gear topology "${gearTopology}" is unrecognized. Fallback to strictest conservative tolerances or synthetic thresholds is strictly prohibited.`;

        if (failClosedOnUnrecognizedTopology) {
          throw new UnrecognizedTopologyError(gearTopology, unrecognizedTopologyReason);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. Determine Orthogonal Dimension Applicability
    // -------------------------------------------------------------------------
    const explicitDims =
      params.applicableDimensions ??
      (caseRecord && "applicable_test_dimensions" in caseRecord
        ? (caseRecord as any).applicable_test_dimensions
        : undefined);

    const applicableDimensionsSet = determineApplicableDimensions(
      assignedProfiles,
      explicitDims
    );

    // -------------------------------------------------------------------------
    // 4. Evaluate Each Orthogonal Dimension Independently
    // -------------------------------------------------------------------------
    const perDimensionResults: Record<AcousticEvaluationDimension, DimensionEvaluationResult> =
      {} as any;

    const applicableDimensions: AcousticEvaluationDimension[] = [];
    const evaluatedDimensions: AcousticEvaluationDimension[] = [];
    const failingDimensions: AcousticEvaluationDimension[] = [];
    const criticalFailingDimensions: AcousticEvaluationDimension[] = [];
    const unevaluableDimensions: AcousticEvaluationDimension[] = [];
    const allEvidenceRefsSet = new Set<string>();

    for (const dimension of ALL_ACOUSTIC_DIMENSIONS) {
      const isApplicable = applicableDimensionsSet.has(dimension);

      if (isApplicable) {
        applicableDimensions.push(dimension);
      }

      // Resolve tolerance criteria spec for this dimension
      let toleranceSpec: DimensionToleranceSpec | undefined;
      let missingToleranceReason: string | undefined;

      if (isTopologyUnrecognized) {
        // Plan Defect Override: Do NOT borrow or synthesize strictest limits
        toleranceSpec = undefined;
        missingToleranceReason = unrecognizedTopologyReason;
      } else {
        // Try gearTopology first, then toleranceSpecRef
        toleranceSpec =
          toleranceResolver.resolveTolerance(dimension, gearTopology) ??
          toleranceResolver.resolveTolerance(dimension, toleranceSpecRef);

        if (!toleranceSpec && isApplicable) {
          missingToleranceReason = `No governed tolerance criteria specification registered for dimension "${dimension}" (spec ref: "${toleranceSpecRef ?? "NONE"}").`;
        }
      }

      // Evaluate dimension independently
      const dimResult = OrthogonalDimensionEvaluator.evaluateDimension({
        dimension,
        toleranceSpec,
        isApplicable,
        objectiveEvidence,
        perceptualEvidence,
        missingToleranceReason,
      });

      perDimensionResults[dimension] = dimResult;

      for (const ref of dimResult.evidenceRefs) {
        allEvidenceRefsSet.add(ref);
      }

      // Track evaluation states
      if (dimResult.applicabilityState === DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED) {
        evaluatedDimensions.push(dimension);
      }

      if (dimResult.evaluationStatus === DIMENSION_EVALUATION_STATUSES.FAILED) {
        failingDimensions.push(dimension);
        if (dimResult.isCritical) {
          criticalFailingDimensions.push(dimension);
        }
      } else if (dimResult.evaluationStatus === DIMENSION_EVALUATION_STATUSES.UNEVALUABLE) {
        unevaluableDimensions.push(dimension);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Overall Synthesis State Determination (Without Scalar Collapse)
    // -------------------------------------------------------------------------
    // Governed Rule: A strong result in one dimension NEVER masks a critical failure in another.
    let synthesisState: AcousticSynthesisState;
    const hasCriticalFailure = criticalFailingDimensions.length > 0;

    if (applicableDimensions.length === 0) {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.NO_APPLICABLE_DIMENSIONS;
    } else if (hasCriticalFailure) {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.CRITICAL_FAILURE_PRESENT;
    } else if (failingDimensions.length > 0) {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.NON_CRITICAL_FAILURE_PRESENT;
    } else if (unevaluableDimensions.length === applicableDimensions.length) {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.COMPLETELY_UNEVALUABLE;
    } else if (unevaluableDimensions.length > 0) {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.PARTIALLY_UNEVALUABLE;
    } else {
      synthesisState = ACOUSTIC_SYNTHESIS_STATES.FULLY_EVALUABLE;
    }

    const caseId =
      typeof caseRecord === "string"
        ? caseRecord
        : caseRecord?.case_id ?? "CASE-UNKNOWN";

    const evaluationId = `EVAL-SYNTH-${caseId}-${Date.now().toString(36)}`;

    return deepFreeze({
      evaluationId,
      caseRef: caseId,
      packageRef,
      componentClass,
      gearTopology,
      synthesisState,
      hasCriticalFailure,
      perDimensionResults: deepFreeze(perDimensionResults),
      applicableDimensions: deepFreeze(applicableDimensions),
      evaluatedDimensions: deepFreeze(evaluatedDimensions),
      failingDimensions: deepFreeze(failingDimensions),
      criticalFailingDimensions: deepFreeze(criticalFailingDimensions),
      unevaluableDimensions: deepFreeze(unevaluableDimensions),
      allEvidenceRefs: deepFreeze(Array.from(allEvidenceRefsSet)),
      synthesisTimestamp: new Date().toISOString(),
    });
  }
}
