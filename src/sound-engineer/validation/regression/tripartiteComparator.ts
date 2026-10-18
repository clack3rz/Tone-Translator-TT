// src/sound-engineer/validation/regression/tripartiteComparator.ts
// Tripartite Differential Comparator for Phase 1C.5h WP-15:
// Executes independent pairwise differential comparisons:
// Comparison A: Candidate vs PATH-PROD Legacy Baseline
// Comparison B: Candidate vs Golden Reference Benchmark
// Comparison C: PATH-PROD Legacy Baseline vs Golden Reference Benchmark
// Preserves all three comparisons independently without collapsing into a single pairwise delta.

import { deepFreeze } from "../../contracts/immutability";
import { RegressionDomain } from "../schemas/enums";
import {
  CandidateComparisonData,
  GoldenReferenceData,
  LegacyOutputData,
  PairwiseComparison,
  TripartiteComparisonResult,
} from "./regressionTypes";

export class TripartiteComparator {
  /**
   * Performs all three independent pairwise comparisons and returns the tripartite result.
   */
  public compareTripartite(
    candidate: CandidateComparisonData,
    legacy: LegacyOutputData,
    golden: GoldenReferenceData,
    domain: RegressionDomain
  ): TripartiteComparisonResult {
    const candidateId = candidate.execution?.execution_id ?? "candidate_subject";
    const legacyId = legacy.outputId;
    const goldenId = golden.fixtureRecord.fixture_id;

    // 1. Comparison A: Candidate vs PATH-PROD
    const compA = this.compareCandidateVsLegacy(candidate, legacy, candidateId, legacyId, domain);

    // 2. Comparison B: Candidate vs Golden Reference
    const compB = this.compareCandidateVsGolden(candidate, golden, candidateId, goldenId, domain);

    // 3. Comparison C: PATH-PROD vs Golden Reference
    const compC = this.compareLegacyVsGolden(legacy, golden, legacyId, goldenId, domain);

    // Primary divergence is based on candidate divergence from baseline or golden
    const primaryDivergenceDetected = compA.divergenceDetected || compB.divergenceDetected;
    const primaryDivergenceMagnitude =
      typeof compA.divergenceMagnitude === "number" && typeof compB.divergenceMagnitude === "number"
        ? Math.max(compA.divergenceMagnitude, compB.divergenceMagnitude)
        : compA.divergenceMagnitude;

    const result: TripartiteComparisonResult = {
      comparisonId: `tripartite_${candidateId}_${legacyId}_${goldenId}_${Date.now()}`,
      candidateVsLegacy: compA,
      candidateVsGolden: compB,
      legacyVsGolden: compC,
      primaryDivergenceDetected,
      primaryDivergenceMagnitude,
      timestamp: new Date().toISOString(),
    };

    return deepFreeze(result);
  }

  /**
   * Comparison A: Candidate vs PATH-PROD Legacy Production Baseline.
   */
  private compareCandidateVsLegacy(
    candidate: CandidateComparisonData,
    legacy: LegacyOutputData,
    candidateId: string,
    legacyId: string,
    _domain: RegressionDomain
  ): PairwiseComparison {
    const metricsDelta: Record<string, number | string> = {};
    const notes: string[] = [];
    let maxDelta = 0;
    let divergenceDetected = false;

    // 1. Compare objective evidence if present
    if (candidate.objectiveEvidence && legacy.objectiveEvidence) {
      for (const candObj of candidate.objectiveEvidence) {
        const matchingLegacy = legacy.objectiveEvidence.find(
          (l) => l.metric_category === candObj.metric_category
        );
        if (matchingLegacy) {
          const delta = Math.abs(candObj.measured_delta - matchingLegacy.measured_delta);
          metricsDelta[`obj_${candObj.metric_category}_delta`] = delta;
          if (delta > 0.05) {
            divergenceDetected = true;
            if (delta > maxDelta) maxDelta = delta;
          }
        } else {
          metricsDelta[`obj_${candObj.metric_category}_delta`] = candObj.measured_delta;
          if (candObj.measured_delta > 0.05) {
            divergenceDetected = true;
            if (candObj.measured_delta > maxDelta) maxDelta = candObj.measured_delta;
          }
        }
      }
    } else if (candidate.objectiveEvidence && candidate.objectiveEvidence.length > 0) {
      for (const candObj of candidate.objectiveEvidence) {
        metricsDelta[`obj_${candObj.metric_category}_delta`] = candObj.measured_delta;
        if (candObj.measured_delta > 0.05) {
          divergenceDetected = true;
          if (candObj.measured_delta > maxDelta) maxDelta = candObj.measured_delta;
        }
      }
    }

    // 2. Compare acoustic synthesis dimensions if present
    if (candidate.acousticSynthesis && legacy.acousticSynthesis) {
      for (const candDim of Object.values(candidate.acousticSynthesis.perDimensionResults)) {
        const legacyDim = legacy.acousticSynthesis.perDimensionResults[candDim.dimension];
        if (legacyDim) {
          if (candDim.evaluationStatus !== legacyDim.evaluationStatus) {
            divergenceDetected = true;
            notes.push(`Dimension ${candDim.dimension} status delta: ${candDim.evaluationStatus} vs ${legacyDim.evaluationStatus}`);
          }
          if (candDim.observedDeltas && legacyDim.observedDeltas) {
            for (const [key, val] of Object.entries(candDim.observedDeltas)) {
              const legacyVal = legacyDim.observedDeltas[key];
              if (legacyVal !== undefined) {
                const diff = Math.abs(val - legacyVal);
                metricsDelta[`acoustic_${candDim.dimension}_${key}_diff`] = diff;
                if (diff > maxDelta) maxDelta = diff;
                if (diff > 0.05) divergenceDetected = true;
              }
            }
          }
        }
      }
    }

    // 3. Compare audio buffers if provided
    if (candidate.renderedBuffer && legacy.renderedBuffer) {
      const bufferDiff = this.compareAudioBuffers(candidate.renderedBuffer, legacy.renderedBuffer);
      metricsDelta["buffer_rms_delta"] = bufferDiff.rmsDelta;
      if (bufferDiff.divergenceDetected) {
        divergenceDetected = true;
        if (bufferDiff.rmsDelta > maxDelta) maxDelta = bufferDiff.rmsDelta;
        notes.push(`Audio buffer divergence detected: RMS delta ${bufferDiff.rmsDelta.toFixed(4)}`);
      }
    }

    // If maxDelta was found, set divergence magnitude
    const magnitude = maxDelta > 0 ? Number(maxDelta.toFixed(4)) : (divergenceDetected ? 1.0 : 0.0);

    return {
      comparisonId: `cmp_cand_legacy_${candidateId}_${legacyId}`,
      sourceEntityId: candidateId,
      sourceEntityKind: "Candidate",
      targetEntityId: legacyId,
      targetEntityKind: "LegacyOutput",
      divergenceDetected,
      divergenceMagnitude: magnitude,
      metricsDelta,
      notes,
    };
  }

  /**
   * Comparison B: Candidate vs Golden Reference Benchmark.
   */
  private compareCandidateVsGolden(
    candidate: CandidateComparisonData,
    golden: GoldenReferenceData,
    candidateId: string,
    goldenId: string,
    _domain: RegressionDomain
  ): PairwiseComparison {
    const metricsDelta: Record<string, number | string> = {};
    const notes: string[] = [];
    let maxDelta = 0;
    let divergenceDetected = false;

    // 1. Compare against Golden reference metrics
    if (golden.referenceMetrics) {
      for (const [key, refVal] of Object.entries(golden.referenceMetrics)) {
        if (typeof refVal === "number") {
          // Look for corresponding metric in candidate objective evidence
          let candidateVal: number | undefined;
          if (candidate.objectiveEvidence) {
            for (const obj of candidate.objectiveEvidence) {
              if (obj.measured_parameters && key in obj.measured_parameters) {
                const param = obj.measured_parameters[key];
                if (typeof param === "number") candidateVal = param;
              }
            }
          }
          if (candidateVal !== undefined) {
            const diff = Math.abs(candidateVal - refVal);
            metricsDelta[`ref_${key}_diff`] = diff;
            if (diff > 0.05) {
              divergenceDetected = true;
              if (diff > maxDelta) maxDelta = diff;
            }
          }
        }
      }
    }

    // 2. Candidate objective evidence measured delta relative to ideal 0
    if (candidate.objectiveEvidence) {
      for (const obj of candidate.objectiveEvidence) {
        if (obj.tolerance_evaluation === "OUT_OF_TOLERANCE" || obj.objective_pass_fail === "FAIL") {
          divergenceDetected = true;
          if (obj.measured_delta > maxDelta) maxDelta = obj.measured_delta;
          notes.push(`Candidate failed objective tolerance: ${obj.metric_category} delta=${obj.measured_delta}`);
        }
      }
    }

    // 3. Audio buffers if present
    if (candidate.renderedBuffer && golden.payload) {
      const bufferDiff = this.compareAudioBuffers(candidate.renderedBuffer, golden.payload);
      metricsDelta["golden_buffer_rms_delta"] = bufferDiff.rmsDelta;
      if (bufferDiff.divergenceDetected) {
        divergenceDetected = true;
        if (bufferDiff.rmsDelta > maxDelta) maxDelta = bufferDiff.rmsDelta;
      }
    }

    const magnitude = maxDelta > 0 ? Number(maxDelta.toFixed(4)) : (divergenceDetected ? 1.0 : 0.0);

    return {
      comparisonId: `cmp_cand_golden_${candidateId}_${goldenId}`,
      sourceEntityId: candidateId,
      sourceEntityKind: "Candidate",
      targetEntityId: goldenId,
      targetEntityKind: "GoldenReference",
      divergenceDetected,
      divergenceMagnitude: magnitude,
      metricsDelta,
      notes,
    };
  }

  /**
   * Comparison C: PATH-PROD vs Golden Reference Benchmark.
   * Establishes whether the legacy baseline was itself already divergent from the benchmark.
   */
  private compareLegacyVsGolden(
    legacy: LegacyOutputData,
    golden: GoldenReferenceData,
    legacyId: string,
    goldenId: string,
    _domain: RegressionDomain
  ): PairwiseComparison {
    const metricsDelta: Record<string, number | string> = {};
    const notes: string[] = [];
    let maxDelta = 0;
    let divergenceDetected = false;

    if (golden.referenceMetrics && legacy.objectiveEvidence) {
      for (const [key, refVal] of Object.entries(golden.referenceMetrics)) {
        if (typeof refVal === "number") {
          for (const obj of legacy.objectiveEvidence) {
            if (obj.measured_parameters && key in obj.measured_parameters) {
              const param = obj.measured_parameters[key];
              if (typeof param === "number") {
                const diff = Math.abs(param - refVal);
                metricsDelta[`legacy_vs_golden_${key}_diff`] = diff;
                if (diff > 0.05) {
                  divergenceDetected = true;
                  if (diff > maxDelta) maxDelta = diff;
                }
              }
            }
          }
        }
      }
    }

    if (legacy.renderedBuffer && golden.payload) {
      const bufferDiff = this.compareAudioBuffers(legacy.renderedBuffer, golden.payload);
      metricsDelta["legacy_vs_golden_buffer_rms_delta"] = bufferDiff.rmsDelta;
      if (bufferDiff.divergenceDetected) {
        divergenceDetected = true;
        if (bufferDiff.rmsDelta > maxDelta) maxDelta = bufferDiff.rmsDelta;
        notes.push(`Legacy baseline diverges from Golden reference: RMS delta ${bufferDiff.rmsDelta.toFixed(4)}`);
      }
    }

    const magnitude = maxDelta > 0 ? Number(maxDelta.toFixed(4)) : (divergenceDetected ? 1.0 : 0.0);

    return {
      comparisonId: `cmp_legacy_golden_${legacyId}_${goldenId}`,
      sourceEntityId: legacyId,
      sourceEntityKind: "LegacyOutput",
      targetEntityId: goldenId,
      targetEntityKind: "GoldenReference",
      divergenceDetected,
      divergenceMagnitude: magnitude,
      metricsDelta,
      notes,
    };
  }

  /**
   * Lightweight audio buffer comparison.
   */
  private compareAudioBuffers(
    bufA: Uint8Array,
    bufB: Uint8Array
  ): { divergenceDetected: boolean; rmsDelta: number } {
    if (bufA.length === 0 || bufB.length === 0) {
      return { divergenceDetected: false, rmsDelta: 0 };
    }

    const minLen = Math.min(bufA.length, bufB.length);
    let sumSquaredDiff = 0;
    const sampleStep = Math.max(1, Math.floor(minLen / 1024)); // sample at points
    let sampledCount = 0;

    for (let i = 0; i < minLen; i += sampleStep) {
      const diff = (bufA[i] - bufB[i]) / 255;
      sumSquaredDiff += diff * diff;
      sampledCount++;
    }

    const rmsDelta = sampledCount > 0 ? Math.sqrt(sumSquaredDiff / sampledCount) * 10 : 0;
    const divergenceDetected = rmsDelta > 0.01 || bufA.length !== bufB.length;

    return { divergenceDetected, rmsDelta: Number(rmsDelta.toFixed(4)) };
  }
}
