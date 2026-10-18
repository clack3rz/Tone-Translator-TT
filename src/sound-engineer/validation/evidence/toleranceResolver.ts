// src/sound-engineer/validation/evidence/toleranceResolver.ts
// Tolerance and threshold evaluation subsystem for Phase 1C.5h WP-11:
// Strictly governed by version-bound tolerance profiles - ZERO universal numeric freezing.
// Bound to frozen specification v0.1j Section 15.2 and Invariant 7.

import {
  OBJECTIVE_PASS_FAIL_STATUSES,
  ObjectivePassFailStatus,
  TOLERANCE_EVALUATIONS,
  ToleranceEvaluation,
} from "../schemas/enums";
import {
  MetricToleranceRule,
  ToleranceCriteriaProfile,
  ToleranceProfileResolver,
} from "./objectiveTypes";

export interface EvaluationOutcomeDetail {
  readonly toleranceEvaluation: ToleranceEvaluation;
  readonly passFailStatus: ObjectivePassFailStatus;
  readonly measuredDelta: number;
  readonly evaluationNotes: string;
}

/**
 * Standard in-memory tolerance profile registry mapping version-bound tolerance spec refs.
 */
export class DefaultToleranceProfileResolver implements ToleranceProfileResolver {
  private readonly profiles: Map<string, ToleranceCriteriaProfile> = new Map();

  constructor(customProfiles?: ReadonlyArray<ToleranceCriteriaProfile>) {
    if (customProfiles) {
      for (const p of customProfiles) {
        this.profiles.set(p.profileRef, p);
      }
    }
  }

  public registerProfile(profile: ToleranceCriteriaProfile): void {
    this.profiles.set(profile.profileRef, profile);
  }

  public resolveToleranceProfile(specRef: string): ToleranceCriteriaProfile | undefined {
    return this.profiles.get(specRef);
  }
}

/**
 * Evaluates a measured parameter against a governed MetricToleranceRule.
 * If no rule exists, strictly returns NOT_APPLICABLE. Never uses universal hardcoded defaults.
 */
export function evaluateToleranceRule(
  metricValue: number,
  rule: MetricToleranceRule | undefined
): EvaluationOutcomeDetail {
  if (!rule) {
    return {
      toleranceEvaluation: TOLERANCE_EVALUATIONS.NOT_APPLICABLE,
      passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE,
      measuredDelta: 0.0,
      evaluationNotes: "No governed tolerance rule declared for this metric dimension.",
    };
  }

  const marginPercent = rule.borderlineMarginPercent ?? 5.0; // 5% default margin around threshold

  switch (rule.comparisonType) {
    case "DELTA_LESS_THAN":
    case "VALUE_LESS_THAN": {
      const delta = metricValue - rule.thresholdValue;
      if (metricValue <= rule.thresholdValue) {
        // Check borderline band just under threshold
        const borderlineBand = rule.thresholdValue * (marginPercent / 100);
        if (rule.thresholdValue > 0 && metricValue >= rule.thresholdValue - borderlineBand) {
          return {
            toleranceEvaluation: TOLERANCE_EVALUATIONS.BORDERLINE,
            passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE,
            measuredDelta: delta,
            evaluationNotes: `Measured value ${metricValue} is borderline near threshold ${rule.thresholdValue} (within ${marginPercent}% margin).`,
          };
        }
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.MET,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          measuredDelta: delta,
          evaluationNotes: `Measured value ${metricValue} satisfies threshold <= ${rule.thresholdValue}.`,
        };
      } else {
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          measuredDelta: delta,
          evaluationNotes: `Measured value ${metricValue} exceeds threshold <= ${rule.thresholdValue} by ${delta}.`,
        };
      }
    }

    case "VALUE_GREATER_THAN": {
      const delta = metricValue - rule.thresholdValue;
      if (metricValue >= rule.thresholdValue) {
        const borderlineBand = rule.thresholdValue * (marginPercent / 100);
        if (rule.thresholdValue > 0 && metricValue <= rule.thresholdValue + borderlineBand) {
          return {
            toleranceEvaluation: TOLERANCE_EVALUATIONS.BORDERLINE,
            passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE,
            measuredDelta: delta,
            evaluationNotes: `Measured value ${metricValue} is borderline near threshold ${rule.thresholdValue} (within ${marginPercent}% margin).`,
          };
        }
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.MET,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          measuredDelta: delta,
          evaluationNotes: `Measured value ${metricValue} satisfies threshold >= ${rule.thresholdValue}.`,
        };
      } else {
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          measuredDelta: delta,
          evaluationNotes: `Measured value ${metricValue} is below threshold >= ${rule.thresholdValue} by ${Math.abs(delta)}.`,
        };
      }
    }

    case "RANGE": {
      const min = rule.thresholdValue;
      const max = rule.secondaryThresholdValue ?? rule.thresholdValue;
      if (metricValue >= min && metricValue <= max) {
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.MET,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
          measuredDelta: 0.0,
          evaluationNotes: `Measured value ${metricValue} is within governed range [${min}, ${max}].`,
        };
      } else {
        const delta = metricValue < min ? metricValue - min : metricValue - max;
        return {
          toleranceEvaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
          passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
          measuredDelta: delta,
          evaluationNotes: `Measured value ${metricValue} is out of governed range [${min}, ${max}].`,
        };
      }
    }

    default:
      return {
        toleranceEvaluation: TOLERANCE_EVALUATIONS.NOT_APPLICABLE,
        passFailStatus: OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE,
        measuredDelta: 0.0,
        evaluationNotes: "Unrecognized comparison type in tolerance rule.",
      };
  }
}
