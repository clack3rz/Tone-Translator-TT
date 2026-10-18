// src/sound-engineer/validation/evidence/phaseAnalysis.ts
// Phase coherence and stereo imaging analysis engine for Phase 1C.5h WP-11:
// Inter-channel Phase Correlation Coefficient and Stereo Width.
// Bound to frozen specification v0.1j Section 15.

import { assertFiniteNumber, roundToPrecision } from "./audioDsp";
import { MeasurementPrecisionProfile, PhaseAnalysisResult } from "./objectiveTypes";

/**
 * Computes deterministic phase coherence and stereo width from multi-channel audio.
 */
export function computePhaseAnalysis(
  channels: ReadonlyArray<Float64Array>,
  precision: MeasurementPrecisionProfile
): PhaseAnalysisResult {
  const channelCount = channels.length;

  // For mono signals: correlation is 1.0 (self-correlation), stereo width is 0.0
  if (channelCount < 2) {
    return {
      channelCount,
      isStereo: false,
      phaseCorrelation: 1.0,
      stereoWidth: 0.0,
    };
  }

  const left = channels[0];
  const right = channels[1];
  const n = Math.min(left.length, right.length);

  if (n === 0) {
    return {
      channelCount,
      isStereo: true,
      phaseCorrelation: 1.0,
      stereoWidth: 0.0,
    };
  }

  // 1. Calculate means
  let sumL = 0;
  let sumR = 0;
  for (let i = 0; i < n; i++) {
    sumL += left[i];
    sumR += right[i];
  }
  const meanL = sumL / n;
  const meanR = sumR / n;

  // 2. Calculate Pearson correlation coefficient
  let num = 0;
  let denL = 0;
  let denR = 0;
  let sumMidSq = 0;
  let sumSideSq = 0;

  for (let i = 0; i < n; i++) {
    const dL = left[i] - meanL;
    const dR = right[i] - meanR;
    num += dL * dR;
    denL += dL * dL;
    denR += dR * dR;

    // Mid/Side components
    const mid = (left[i] + right[i]) * 0.7071067811865475; // 1 / sqrt(2)
    const side = (left[i] - right[i]) * 0.7071067811865475;
    sumMidSq += mid * mid;
    sumSideSq += side * side;
  }

  let rawCorr = 1.0;
  const denom = Math.sqrt(denL * denR);
  if (denom > precision.floatEpsilon) {
    rawCorr = num / denom;
    // Bound to [-1.0, 1.0] against precision artifacts
    rawCorr = Math.max(-1.0, Math.min(1.0, rawCorr));
  } else {
    // One or both channels silent
    rawCorr = 1.0;
  }

  const phaseCorrelation = roundToPrecision(assertFiniteNumber(rawCorr, "phase_correlation"), precision);

  // 3. Stereo Width = RMS(Side) / RMS(Mid)
  const rmsMid = Math.sqrt(sumMidSq / n);
  const rmsSide = Math.sqrt(sumSideSq / n);

  let rawWidth = 0.0;
  if (rmsMid > precision.floatEpsilon) {
    rawWidth = rmsSide / rmsMid;
  } else if (rmsSide > precision.floatEpsilon) {
    rawWidth = 2.0; // Pure out-of-phase side signal
  }

  const stereoWidth = roundToPrecision(assertFiniteNumber(rawWidth, "stereo_width"), precision);

  return {
    channelCount,
    isStereo: true,
    phaseCorrelation,
    stereoWidth,
  };
}
