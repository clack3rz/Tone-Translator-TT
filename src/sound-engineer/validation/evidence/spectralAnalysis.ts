// src/sound-engineer/validation/evidence/spectralAnalysis.ts
// Spectral domain analysis engine for Phase 1C.5h WP-11:
// FFT frequency response deltas, Spectral Centroid, Spectral Tilt, and Spectral Rolloff.
// Bound to frozen specification v0.1j Section 15.

import { computeFft, assertFiniteNumber, roundToPrecision } from "./audioDsp";
import { MeasurementPrecisionProfile, SpectralAnalysisResult } from "./objectiveTypes";

/**
 * Computes deterministic spectral analysis across frequency bins.
 */
export function computeSpectralAnalysis(
  candidateSamples: Float64Array,
  baselineSamples: Float64Array | undefined,
  sampleRate: number,
  precision: MeasurementPrecisionProfile
): SpectralAnalysisResult {
  const fftSize = 4096;
  const candidateFft = computeFft(candidateSamples, sampleRate, fftSize, "hann");
  const halfN = candidateFft.magnitudes.length;

  let sumWeightedFreq = 0;
  let sumMag = 0;
  let totalEnergy = 0;
  let peakMag = -1;
  let peakBin = 0;

  for (let k = 1; k < halfN; k++) {
    const freq = k * candidateFft.binWidthHz;
    const mag = candidateFft.magnitudes[k];
    assertFiniteNumber(mag, "fft_magnitude");

    sumWeightedFreq += freq * mag;
    sumMag += mag;
    totalEnergy += mag * mag;

    if (mag > peakMag) {
      peakMag = mag;
      peakBin = k;
    }
  }

  // Peak frequency
  const peakFrequencyHz = peakBin * candidateFft.binWidthHz;

  // Spectral Centroid: sum(f * mag) / sum(mag)
  // Guard against complete silence (zero energy)
  const rawCentroid = sumMag > precision.floatEpsilon ? sumWeightedFreq / sumMag : 0;
  const spectralCentroidHz = roundToPrecision(assertFiniteNumber(rawCentroid, "spectral_centroid"), precision);

  // Spectral Rolloff: frequency below which 85% of spectral power is concentrated
  const rolloffThreshold = totalEnergy * 0.85;
  let cumulativeEnergy = 0;
  let rolloffBin = 0;
  for (let k = 1; k < halfN; k++) {
    const mag = candidateFft.magnitudes[k];
    cumulativeEnergy += mag * mag;
    if (cumulativeEnergy >= rolloffThreshold) {
      rolloffBin = k;
      break;
    }
  }
  const rawRolloff = rolloffBin * candidateFft.binWidthHz;
  const spectralRolloffHz = roundToPrecision(assertFiniteNumber(rawRolloff, "spectral_rolloff"), precision);

  // Spectral Tilt: linear regression slope of 20*log10(mag) vs log2(freq)
  // Analyzed between 100 Hz and 10,000 Hz
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let count = 0;

  for (let k = 1; k < halfN; k++) {
    const freq = k * candidateFft.binWidthHz;
    if (freq >= 100 && freq <= 10000) {
      const mag = candidateFft.magnitudes[k];
      if (mag > precision.floatEpsilon) {
        const x = Math.log2(freq / 100); // octaves above 100 Hz
        const y = 20 * Math.log10(mag);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
        count++;
      }
    }
  }

  let rawTilt = 0;
  if (count > 2) {
    const denom = count * sumXX - sumX * sumX;
    if (Math.abs(denom) > precision.floatEpsilon) {
      rawTilt = (count * sumXY - sumX * sumY) / denom;
    }
  }
  const spectralTiltDbPerOctave = roundToPrecision(assertFiniteNumber(rawTilt, "spectral_tilt"), precision);

  // Frequency Response Delta (if baseline is available)
  let frequencyResponseDeltaDb: number | undefined;
  if (baselineSamples && baselineSamples.length > 0) {
    const baselineFft = computeFft(baselineSamples, sampleRate, fftSize, "hann");
    let sumSquaredDiffDb = 0;
    let validBins = 0;

    for (let k = 1; k < halfN; k++) {
      const magC = candidateFft.magnitudes[k];
      const magB = baselineFft.magnitudes[k];
      if (magC > precision.floatEpsilon && magB > precision.floatEpsilon) {
        const dbC = 20 * Math.log10(magC);
        const dbB = 20 * Math.log10(magB);
        const diff = dbC - dbB;
        sumSquaredDiffDb += diff * diff;
        validBins++;
      }
    }

    if (validBins > 0) {
      const rmsDiff = Math.sqrt(sumSquaredDiffDb / validBins);
      frequencyResponseDeltaDb = roundToPrecision(
        assertFiniteNumber(rmsDiff, "frequency_response_delta"),
        precision
      );
    }
  }

  return {
    peakFrequencyHz: roundToPrecision(peakFrequencyHz, precision),
    spectralCentroidHz,
    spectralRolloffHz,
    spectralTiltDbPerOctave,
    frequencyResponseDeltaDb,
    totalBandEnergy: roundToPrecision(totalEnergy, precision),
  };
}
