// src/sound-engineer/validation/regression/regressionClassifier.ts
// Regression Classifier for Phase 1C.5h WP-15:
// Classifies observed divergences into the four canonical machine enums:
// - INTENTIONAL_CORRECTION
// - NEUTRAL
// - GENUINE_REGRESSION
// - UNRESOLVED
//
// Governed by:
// 1. Cardinal Rule: LEGACY OUTPUT ≠ EXPECTED TRUTH.
// 2. No automatic regression from legacy divergence.
// 3. No automatic "intentional correction" from candidate closer to Golden without authorized intent.
// 4. Honest UNRESOLVED for contradictory/borderline/ambiguous evidence.
// 5. Gate 8 block populated strictly by governed materiality policy for material regressions/unresolved divergences.

import {
  MATERIALITY_SCORES,
  MaterialityScore,
  REGRESSION_CLASSIFICATIONS,
  RegressionClassification,
} from "../schemas/enums";
import {
  CandidateComparisonData,
  IntentionalCorrectionIntent,
  LegacyOutputData,
  MaterialityProfile,
  TripartiteComparisonResult,
} from "./regressionTypes";
import { MaterialityResolver } from "./materialityResolver";

export interface ClassificationResult {
  readonly classification: RegressionClassification;
  readonly materialityScore: MaterialityScore;
  readonly blocksGate8: boolean;
  readonly justification: string;
}

export class RegressionClassifier {
  constructor(private readonly materialityResolver: MaterialityResolver = new MaterialityResolver()) {}

  /**
   * Classifies the tripartite differential comparison according to strict governing rules.
   */
  public classify(
    tripartite: TripartiteComparisonResult,
    candidateData: CandidateComparisonData,
    legacyData: LegacyOutputData,
    profile: MaterialityProfile,
    intent?: IntentionalCorrectionIntent
  ): ClassificationResult {
    const { candidateVsLegacy, candidateVsGolden, legacyVsGolden } = tripartite;

    // 1. Resolve materiality score from governed profile
    const materialityScore = this.materialityResolver.evaluateMaterialityScore(
      tripartite.primaryDivergenceMagnitude,
      profile
    );
    const isMaterial = profile.isGate8BlockingMateriality(materialityScore);

    // 2. Audit evidence for contradictory signals or missing critical evaluation
    const contradictionDetected = this.detectEvidenceContradiction(candidateData);
    if (contradictionDetected.hasContradiction) {
      return {
        classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
        materialityScore,
        blocksGate8: isMaterial,
        justification: `Contradictory evidence detected: ${contradictionDetected.reason}. Governed rule mandates UNRESOLVED without scalar collapse.`,
      };
    }

    // 3. Check for actual degradation / genuine regression relative to expected behavior / Golden Reference
    const candidateDegradation = this.assessCandidateDegradation(candidateData, candidateVsGolden, legacyVsGolden);
    if (candidateDegradation.isDegraded) {
      // It is a genuine regression if candidate degraded against expected benchmark
      return {
        classification: REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
        materialityScore,
        blocksGate8: isMaterial, // Only blocks if material under governed policy
        justification: `Genuine regression confirmed: ${candidateDegradation.reason}. Materiality: ${materialityScore}. Blocks Gate 8: ${isMaterial}.`,
      };
    }

    // 4. Check for Intentional Architectural Correction
    // Cardinal Rule: Candidate closer to Golden alone does NOT auto-classify as intentional correction.
    // Must have explicit authorized intentional correction intent.
    const candDivergedFromLegacy = candidateVsLegacy.divergenceDetected;
    const candCloserToGolden =
      typeof candidateVsGolden.divergenceMagnitude === "number" &&
      typeof legacyVsGolden.divergenceMagnitude === "number"
        ? candidateVsGolden.divergenceMagnitude < legacyVsGolden.divergenceMagnitude
        : false;

    if (candDivergedFromLegacy) {
      if (intent && intent.isAuthorized) {
        // Authorized intentional correction declared and supported
        return {
          classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
          materialityScore,
          blocksGate8: false,
          justification:
            `Intentional architectural correction verified under approved change ref '${intent.approvedChangeRef}': ` +
            `${intent.rationale}. Divergence from legacy is intentional and verified.`,
        };
      }

      // If candidate is closer to Golden but lacks authorized intent
      if (candCloserToGolden) {
        // Without authorized intent, we cannot auto-classify INTENTIONAL_CORRECTION.
        // If it is completely within governed tolerances and non-degrading, it may be NEUTRAL or UNRESOLVED.
        if (candidateDegradation.isBorderline) {
          return {
            classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
            materialityScore,
            blocksGate8: isMaterial,
            justification:
              "Candidate is closer to Golden Reference than legacy baseline, but lacks authorized intentional correction documentation and evidence is borderline.",
          };
        }
      }
    }

    // 5. Check if divergence is borderline / ambiguous
    if (candidateDegradation.isBorderline) {
      return {
        classification: REGRESSION_CLASSIFICATIONS.UNRESOLVED,
        materialityScore,
        blocksGate8: isMaterial,
        justification: `Divergence evidence is borderline/ambiguous (${candidateDegradation.reason}). Unresolved divergence preserved.`,
      };
    }

    // 6. Neutral Divergence
    // Non-degrading divergence within governed tolerances
    if (candDivergedFromLegacy) {
      return {
        classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
        materialityScore,
        blocksGate8: false,
        justification:
          `Divergence from legacy baseline detected (magnitude ${candidateVsLegacy.divergenceMagnitude}), ` +
          `but candidate meets all governed expected acoustic tolerances without degradation. Classified as NEUTRAL.`,
      };
    }

    // No divergence detected between candidate and legacy
    return {
      classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
      materialityScore: MATERIALITY_SCORES.NEGLIGIBLE,
      blocksGate8: false,
      justification: "No meaningful divergence detected across tripartite comparisons. Conforms to baseline and benchmark.",
    };
  }

  /**
   * Detects contradictory signals across evidence streams (e.g. objective passing but perceptual failing).
   */
  private detectEvidenceContradiction(candidateData: CandidateComparisonData): {
    hasContradiction: boolean;
    reason: string;
  } {
    let objectivePassing = false;
    let objectiveFailing = false;
    if (candidateData.objectiveEvidence && candidateData.objectiveEvidence.length > 0) {
      for (const obj of candidateData.objectiveEvidence) {
        if (obj.objective_pass_fail === "PASS" && obj.tolerance_evaluation === "MET") {
          objectivePassing = true;
        } else if (obj.objective_pass_fail === "FAIL" || obj.tolerance_evaluation === "OUT_OF_TOLERANCE") {
          objectiveFailing = true;
        }
      }
    }

    let perceptualPassing = false;
    let perceptualFailing = false;
    if (candidateData.perceptualEvidence && candidateData.perceptualEvidence.length > 0) {
      for (const perc of candidateData.perceptualEvidence) {
        if (perc.evaluation_outcome === "PERCEPTUAL_PASS") {
          perceptualPassing = true;
        } else if (perc.evaluation_outcome === "PERCEPTUAL_FAIL") {
          perceptualFailing = true;
        }
      }
    }

    // Conflict 1: Objective PASS but Perceptual FAIL
    if (objectivePassing && !objectiveFailing && perceptualFailing) {
      return {
        hasContradiction: true,
        reason: "Objective metrics pass while expert perceptual listening evaluation recorded PERCEPTUAL_FAIL",
      };
    }

    // Conflict 2: Objective FAIL but Perceptual PASS
    if (objectiveFailing && perceptualPassing && !perceptualFailing) {
      return {
        hasContradiction: true,
        reason: "Perceptual listening passed while objective metrics recorded out-of-tolerance failure",
      };
    }

    return { hasContradiction: false, reason: "" };
  }

  /**
   * Evaluates whether the candidate suffers genuine degradation relative to expected benchmark.
   */
  private assessCandidateDegradation(
    candidateData: CandidateComparisonData,
    candidateVsGolden: TripartiteComparisonResult["candidateVsGolden"],
    _legacyVsGolden: TripartiteComparisonResult["legacyVsGolden"]
  ): { isDegraded: boolean; isBorderline: boolean; reason: string } {
    // 1. Objective evidence checks
    if (candidateData.objectiveEvidence) {
      for (const obj of candidateData.objectiveEvidence) {
        if (obj.objective_pass_fail === "FAIL" || obj.tolerance_evaluation === "OUT_OF_TOLERANCE") {
          return {
            isDegraded: true,
            isBorderline: false,
            reason: `Objective metric failure in ${obj.metric_category}: measured delta=${obj.measured_delta}`,
          };
        }
        if (obj.tolerance_evaluation === "BORDERLINE") {
          return {
            isDegraded: false,
            isBorderline: true,
            reason: `Borderline tolerance evaluation in ${obj.metric_category}`,
          };
        }
      }
    }

    // 2. Perceptual evidence checks
    if (candidateData.perceptualEvidence) {
      for (const perc of candidateData.perceptualEvidence) {
        if (perc.evaluation_outcome === "PERCEPTUAL_FAIL") {
          return {
            isDegraded: true,
            isBorderline: false,
            reason: `Perceptual evaluation failed: ${perc.qualitative_observations || "unacceptable tonal defect"}`,
          };
        }
        if (perc.evaluation_outcome === "PERCEPTUAL_INCONCLUSIVE") {
          return {
            isDegraded: false,
            isBorderline: true,
            reason: "Perceptual evaluation was inconclusive",
          };
        }
      }
    }

    // 3. Acoustic synthesis checks if present
    if (candidateData.acousticSynthesis) {
      for (const dim of Object.values(candidateData.acousticSynthesis.perDimensionResults)) {
        if (dim.evaluationStatus === "FAILED" && dim.isCritical) {
          return {
            isDegraded: true,
            isBorderline: false,
            reason: `Acoustic synthesis critical dimension failure in ${dim.dimension}`,
          };
        }
        if (dim.evaluationStatus === "BORDERLINE") {
          return {
            isDegraded: false,
            isBorderline: true,
            reason: `Acoustic synthesis borderline dimension in ${dim.dimension}`,
          };
        }
      }
    }

    // 4. Candidate vs Golden divergence magnitude check if high
    if (typeof candidateVsGolden.divergenceMagnitude === "number" && candidateVsGolden.divergenceMagnitude > 5.0) {
      return {
        isDegraded: true,
        isBorderline: false,
        reason: `Excessive divergence magnitude (${candidateVsGolden.divergenceMagnitude}) relative to Golden Reference`,
      };
    }

    return { isDegraded: false, isBorderline: false, reason: "" };
  }
}
