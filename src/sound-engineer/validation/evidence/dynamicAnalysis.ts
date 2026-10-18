// src/sound-engineer/validation/evidence/dynamicAnalysis.ts
// Dynamic envelope analysis engine for Phase 1C.5h WP-11:
// Peak, RMS, Crest Factor, Dynamic Range, and Compression Envelope Delta.
// Bound to frozen specification v0.1j Section 15.

import { assertFiniteNumber, roundToPrecision } from "./audioDsp";
import { DynamicAnalysisResult, MeasurementPrecisionProfile } from "./objectiveTypes";

/**
 * Computes deterministic dynamic response and envelope metrics from audio samples.
 */
export function computeDynamicAnalysis(
  candidateSamples: Float64Array,
  baselineSamples: Float64Array | undefined,
  sampleRate: number,
  precision: MeasurementPrecisionProfile
): DynamicAnalysisResult {
  let peakLinear = 0;
  let sumSquares = 0;
  const n = candidateSamples.length;

  for (let i = 0; i < n; i++) {
    const absVal = Math.abs(candidateSamples[i]);
    if (absVal > peakLinear) {
      peakLinear = absVal;
    }
    sumSquares += absVal * absVal;
  }

  const rmsLinear = n > 0 ? Math.sqrt(sumSquares / n) : 0;

  assertFiniteNumber(peakLinear, "peak_amplitude");
  assertFiniteNumber(rmsLinear, "rms_amplitude");

  // Crest factor: peak / rms
  let rawCrestLinear = 1.0;
  let rawCrestDb = 0.0;
  if (rmsLinear > precision.floatEpsilon) {
    rawCrestLinear = peakLinear / rmsLinear;
    rawCrestDb = 20 * Math.log10(rawCrestLinear);
  }

  const peakAmplitudeDbFs =
    peakLinear > precision.floatEpsilon ? 20 * Math.log10(peakLinear) : -120;
  const rmsDbFs =
    rmsLinear > precision.floatEpsilon ? 20 * Math.log10(rmsLinear) : -120;

  // Dynamic Range: difference between peak and noise floor (or lowest 50ms RMS window)
  const windowSize = Math.max(64, Math.floor(sampleRate * 0.05)); // 50ms window
  let minWindowRms = Number.MAX_VALUE;

  for (let i = 0; i + windowSize <= n; i += windowSize) {
    let windowSumSq = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = candidateSamples[i + j];
      windowSumSq += s * s;
    }
    const winRms = Math.sqrt(windowSumSq / windowSize);
    if (winRms > precision.floatEpsilon && winRms < minWindowRms) {
      minWindowRms = winRms;
    }
  }

  let rawDynamicRangeDb = 0;
  if (minWindowRms !== Number.MAX_VALUE && minWindowRms > precision.floatEpsilon && peakLinear > precision.floatEpsilon) {
    rawDynamicRangeDb = 20 * Math.log10(peakLinear / minWindowRms);
  } else if (peakLinear > precision.floatEpsilon) {
    // If no minimum non-zero window was found, estimate dynamic range from peak vs 24-bit noise floor
    rawDynamicRangeDb = Math.min(144, 20 * Math.log10(peakLinear / 1e-6));
  }

  // Compression Envelope Delta (if baseline is supplied)
  let compressionEnvelopeDeltaDb: number | undefined;
  if (baselineSamples && baselineSamples.length > 0) {
    let baselinePeak = 0;
    let baselineSumSq = 0;
    const baseLen = baselineSamples.length;
    for (let i = 0; i < baseLen; i++) {
      const absV = Math.abs(baselineSamples[i]);
      if (absV > baselinePeak) baselinePeak = absV;
      baselineSumSq += absV * absV;
    }
    const baselineRms = baseLen > 0 ? Math.sqrt(baselineSumSq / baseLen) : 0;
    if (baselineRms > precision.floatEpsilon) {
      const baselineCrestLinear = baselinePeak / baselineRms;
      const baselineCrestDb = 20 * Math.log10(baselineCrestLinear);
      // Delta in crest factor (reduction indicates compression)
      compressionEnvelopeDeltaDb = roundToPrecision(
        assertFiniteNumber(rawCrestDb - baselineCrestDb, "compression_envelope_delta"),
        precision
      );
    }
  }

  return {
    peakAmplitudeLinear: roundToPrecision(peakLinear, precision),
    rmsLinear: roundToPrecision(rmsLinear, precision),
    peakAmplitudeDbFs: roundToPrecision(assertFiniteNumber(peakAmplitudeDbFs, "peak_dbfs"), precision),
    rmsDbFs: roundToPrecision(assertFiniteNumber(rmsDbFs, "rms_dbfs"), precision),
    crestFactorLinear: roundToPrecision(assertFiniteNumber(rawCrestLinear, "crest_factor_linear"), precision),
    crestFactorDb: roundToPrecision(assertFiniteNumber(rawCrestDb, "crest_factor_db"), precision),
    dynamicRangeDb: roundToPrecision(assertFiniteNumber(rawDynamicRangeDb, "dynamic_range_db"), precision),
    compressionEnvelopeDeltaDb,
  };
}
