// src/sound-engineer/validation/evaluation/orthogonalDimensionEvaluator.ts
// Evaluates a single orthogonal acoustic dimension against governed tolerances and evidence.
// Phase 1C.5h — WP-14.
// Bound to frozen specification v0.1j Section 19, Invariant 2, Invariant 7, and Table 06/07.

import { deepFreeze } from "../../contracts/immutability";
import {
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  TOLERANCE_EVALUATIONS,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
} from "../schemas/records";
import { evaluateToleranceRule } from "../evidence/toleranceResolver";
import {
  ACOUSTIC_EVALUATION_DIMENSIONS,
  AcousticEvaluationDimension,
  DIMENSION_APPLICABILITY_STATES,
  DIMENSION_EVALUATION_STATUSES,
  DimensionEvaluationResult,
  DimensionEvaluationStatus,
  DimensionToleranceSpec,
} from "./acousticEvaluationTypes";

export interface EvaluateDimensionParams {
  readonly dimension: AcousticEvaluationDimension;
  readonly toleranceSpec?: DimensionToleranceSpec;
  readonly isApplicable: boolean;
  readonly objectiveEvidence: ReadonlyArray<ObjectiveEvidenceRecord>;
  readonly perceptualEvidence: ReadonlyArray<PerceptualEvaluationRecord>;
  readonly missingToleranceReason?: string;
}

/**
 * Checks if an ObjectiveEvidenceRecord corresponds to the given acoustic dimension.
 */
function matchesObjectiveDimension(
  dimension: AcousticEvaluationDimension,
  record: ObjectiveEvidenceRecord
): boolean {
  switch (dimension) {
    case ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL:
      return record.metric_category === OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS;
    case ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC:
      return record.metric_category === OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE;
    case ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC:
      return record.metric_category === OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION;
    case ACOUSTIC_EVALUATION_DIMENSIONS.PHASE:
      return record.metric_category === OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE;
    case ACOUSTIC_EVALUATION_DIMENSIONS.PLAYABILITY:
      return (
        record.metric_category === OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE ||
        "latencyMs" in record.measured_parameters ||
        "touchSensitivity" in record.measured_parameters
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.MIX_CONTEXT:
      return (
        "maskingRatio" in record.measured_parameters ||
        "mixSeparationDb" in record.measured_parameters ||
        "vocalPocketDeltaDb" in record.measured_parameters
      );
    default:
      return false;
  }
}

/**
 * Checks if a PerceptualEvaluationRecord provides judgments relevant to the given dimension.
 */
function matchesPerceptualDimension(
  dimension: AcousticEvaluationDimension,
  record: PerceptualEvaluationRecord
): boolean {
  const dims = Object.keys(record.perceptual_dimensions_evaluated).map((k) =>
    k.toLowerCase()
  );

  switch (dimension) {
    case ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL:
      return dims.some(
        (k) =>
          k.includes("tonal") ||
          k.includes("balance") ||
          k.includes("presence") ||
          k.includes("air") ||
          k.includes("treble")
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC:
      return dims.some(
        (k) =>
          k.includes("punch") ||
          k.includes("transient") ||
          k.includes("decay") ||
          k.includes("envelope")
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC:
      return dims.some(
        (k) =>
          k.includes("warmth") ||
          k.includes("harshness") ||
          k.includes("saturation") ||
          k.includes("distortion")
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.PHASE:
      return dims.some(
        (k) =>
          k.includes("width") ||
          k.includes("spatial") ||
          k.includes("phase") ||
          k.includes("smearing")
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.PLAYABILITY:
      return dims.some(
        (k) =>
          k.includes("playability") ||
          k.includes("touch") ||
          k.includes("feel") ||
          k.includes("latency")
      );
    case ACOUSTIC_EVALUATION_DIMENSIONS.MIX_CONTEXT:
      return dims.some(
        (k) =>
          k.includes("mix") ||
          k.includes("masking") ||
          k.includes("vocal") ||
          k.includes("separation")
      );
    default:
      return false;
  }
}

/**
 * OrthogonalDimensionEvaluator:
 * Evaluates an individual acoustic dimension independently without scalar collapse.
 */
export class OrthogonalDimensionEvaluator {
  public static evaluateDimension(params: EvaluateDimensionParams): DimensionEvaluationResult {
    const {
      dimension,
      toleranceSpec,
      isApplicable,
      objectiveEvidence,
      perceptualEvidence,
      missingToleranceReason,
    } = params;

    // -------------------------------------------------------------------------
    // 1. Inapplicable Dimension Handling
    // -------------------------------------------------------------------------
    if (!isApplicable) {
      return deepFreeze({
        dimension,
        applicabilityState: DIMENSION_APPLICABILITY_STATES.NOT_APPLICABLE,
        evaluationStatus: DIMENSION_EVALUATION_STATUSES.NOT_APPLICABLE,
        isCritical: false,
        evidenceRefs: [],
        objectiveEvidenceRefs: [],
        perceptualEvidenceRefs: [],
        observedDeltas: {},
        findings: [`Dimension "${dimension}" is not applicable to the assigned profiles and scope.`],
      });
    }

    // -------------------------------------------------------------------------
    // 2. Missing Governed Tolerance Handling (Plan Defect Override)
    // -------------------------------------------------------------------------
    if (!toleranceSpec) {
      const reason =
        missingToleranceReason ??
        `No governed tolerance criteria specification exists for dimension "${dimension}". Fallback to arbitrary or strictest thresholds is forbidden.`;
      return deepFreeze({
        dimension,
        applicabilityState: DIMENSION_APPLICABILITY_STATES.UNEVALUABLE_MISSING_TOLERANCE,
        evaluationStatus: DIMENSION_EVALUATION_STATUSES.UNEVALUABLE,
        isCritical: false,
        evidenceRefs: [],
        objectiveEvidenceRefs: [],
        perceptualEvidenceRefs: [],
        observedDeltas: {},
        findings: [reason],
        unevaluableReason: reason,
      });
    }

    // -------------------------------------------------------------------------
    // 3. Filter Evidence for this Specific Dimension
    // -------------------------------------------------------------------------
    const matchedObjective = objectiveEvidence.filter((rec) =>
      matchesObjectiveDimension(dimension, rec)
    );
    const matchedPerceptual = perceptualEvidence.filter((rec) =>
      matchesPerceptualDimension(dimension, rec)
    );

    const objectiveRefs = matchedObjective.map((r) => r.objective_evidence_id);
    const perceptualRefs = matchedPerceptual.map((r) => r.perceptual_evidence_id);
    const allEvidenceRefs = [...objectiveRefs, ...perceptualRefs];

    // -------------------------------------------------------------------------
    // 4. Missing Evidence Handling
    // -------------------------------------------------------------------------
    if (allEvidenceRefs.length === 0) {
      const reason = `Dimension "${dimension}" is applicable, but required objective or perceptual evidence has not been recorded.`;
      return deepFreeze({
        dimension,
        applicabilityState: DIMENSION_APPLICABILITY_STATES.APPLICABLE_MISSING_EVIDENCE,
        evaluationStatus: DIMENSION_EVALUATION_STATUSES.UNEVALUABLE,
        isCritical: toleranceSpec.isCritical,
        toleranceSpecRef: toleranceSpec.toleranceSpecRef,
        evidenceRefs: [],
        objectiveEvidenceRefs: [],
        perceptualEvidenceRefs: [],
        observedDeltas: {},
        findings: [reason],
        unevaluableReason: reason,
      });
    }

    // -------------------------------------------------------------------------
    // 5. Evaluate Objective Evidence Against Governed Rules
    // -------------------------------------------------------------------------
    const findings: string[] = [];
    const observedDeltas: Record<string, number> = {};
    let objectiveFailed = false;
    let objectiveBorderline = false;
    let failureReasons: string[] = [];

    for (const objRec of matchedObjective) {
      // Record overall objective status
      if (objRec.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL) {
        objectiveFailed = true;
        failureReasons.push(
          `Objective measurement "${objRec.objective_evidence_id}" failed tolerance evaluation.`
        );
      } else if (
        objRec.tolerance_evaluation === TOLERANCE_EVALUATIONS.BORDERLINE ||
        objRec.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE
      ) {
        objectiveBorderline = true;
      }

      observedDeltas[`obj:${objRec.objective_evidence_id}:measured_delta`] =
        objRec.measured_delta;

      // Check specific tolerance rules if declared in tolerance spec
      for (const rule of toleranceSpec.rules) {
        const measuredVal = objRec.measured_parameters[rule.metricName];
        if (typeof measuredVal === "number" && Number.isFinite(measuredVal)) {
          const evalOutcome = evaluateToleranceRule(measuredVal, rule);
          observedDeltas[`${objRec.objective_evidence_id}:${rule.metricName}`] =
            measuredVal;

          if (evalOutcome.passFailStatus === OBJECTIVE_PASS_FAIL_STATUSES.FAIL) {
            objectiveFailed = true;
            failureReasons.push(
              `Metric "${rule.metricName}" (${measuredVal}) exceeded governed threshold: ${evalOutcome.evaluationNotes}`
            );
          } else if (evalOutcome.passFailStatus === OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE) {
            objectiveBorderline = true;
          }
          findings.push(evalOutcome.evaluationNotes);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 6. Evaluate Perceptual Evidence (Strict Separation)
    // -------------------------------------------------------------------------
    let perceptualFailed = false;
    let perceptualInconclusive = false;

    for (const percRec of matchedPerceptual) {
      if (percRec.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL) {
        perceptualFailed = true;
        failureReasons.push(
          `Perceptual evaluation "${percRec.perceptual_evidence_id}" failed: ${percRec.qualitative_observations}`
        );
      } else if (
        percRec.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE
      ) {
        perceptualInconclusive = true;
      }
      findings.push(
        `Perceptual observation [${percRec.evaluator_role}]: "${percRec.qualitative_observations}"`
      );
    }

    // -------------------------------------------------------------------------
    // 7. Synthesize Dimension Status with Separation Discipline
    // -------------------------------------------------------------------------
    // Rules:
    // - Objective pass CANNOT waive perceptual failure.
    // - Perceptual pass CANNOT waive objective failure.
    // - If either fails, the dimension fails.
    let status: DimensionEvaluationStatus;
    let overallFailureReason: string | undefined;

    if (objectiveFailed || perceptualFailed) {
      status = DIMENSION_EVALUATION_STATUSES.FAILED;
      overallFailureReason = failureReasons.join(" | ");
    } else if (objectiveBorderline || perceptualInconclusive) {
      status = DIMENSION_EVALUATION_STATUSES.BORDERLINE;
    } else {
      status = DIMENSION_EVALUATION_STATUSES.MET;
    }

    return deepFreeze({
      dimension,
      applicabilityState: DIMENSION_APPLICABILITY_STATES.APPLICABLE_EVALUATED,
      evaluationStatus: status,
      isCritical: toleranceSpec.isCritical,
      toleranceSpecRef: toleranceSpec.toleranceSpecRef,
      evidenceRefs: allEvidenceRefs,
      objectiveEvidenceRefs: objectiveRefs,
      perceptualEvidenceRefs: perceptualRefs,
      observedDeltas: deepFreeze(observedDeltas),
      findings: deepFreeze(findings),
      failureReason: overallFailureReason,
    });
  }
}
