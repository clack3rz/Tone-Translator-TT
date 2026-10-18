// src/sound-engineer/validation/evidence/harmonicAnalysis.ts
// Harmonic distortion analysis engine for Phase 1C.5h WP-11:
// Total Harmonic Distortion (THD%), THD+N, Individual Harmonics, and Harmonic Energy Ratio.
// Bound to frozen specification v0.1j Section 15.

import { computeFft, assertFiniteNumber, roundToPrecision } from "./audioDsp";
import { HarmonicAnalysisResult, MeasurementPrecisionProfile } from "./objectiveTypes";

/**
 * Computes deterministic harmonic distortion metrics from audio samples.
 */
export function computeHarmonicAnalysis(
  samples: Float64Array,
  sampleRate: number,
  expectedFundamentalHz: number | undefined,
  precision: MeasurementPrecisionProfile
): HarmonicAnalysisResult {
  const fftSize = 8192;
  const fft = computeFft(samples, sampleRate, fftSize, "hann");
  const halfN = fft.magnitudes.length;

  // 1. Locate fundamental peak
  let fundamentalBin = 0;
  let fundamentalMag = 0;

  if (expectedFundamentalHz && expectedFundamentalHz > 0) {
    const targetBin = Math.round(expectedFundamentalHz / fft.binWidthHz);
    // Search in a window around target bin (+/- 5 bins)
    const minBin = Math.max(1, targetBin - 5);
    const maxBin = Math.min(halfN - 1, targetBin + 5);
    for (let k = minBin; k <= maxBin; k++) {
      if (fft.magnitudes[k] > fundamentalMag) {
        fundamentalMag = fft.magnitudes[k];
        fundamentalBin = k;
      }
    }
  } else {
    // Search for highest magnitude bin between 20 Hz and 10,000 Hz
    const minBin = Math.max(1, Math.round(20 / fft.binWidthHz));
    const maxBin = Math.min(halfN - 1, Math.round(10000 / fft.binWidthHz));
    for (let k = minBin; k <= maxBin; k++) {
      if (fft.magnitudes[k] > fundamentalMag) {
        fundamentalMag = fft.magnitudes[k];
        fundamentalBin = k;
      }
    }
  }

  const fundamentalFreqHz = fundamentalBin * fft.binWidthHz;
  const fundamentalMagDb =
    fundamentalMag > precision.floatEpsilon ? 20 * Math.log10(fundamentalMag) : -120;

  // 2. Measure harmonics (h2 through h10)
  const individualHarmonicsDb: Record<string, number> = {};
  let sumHarmonicPower = 0;
  let totalNonFundPower = 0;

  for (let h = 2; h <= 10; h++) {
    const targetHarmonicBin = fundamentalBin * h;
    if (targetHarmonicBin >= halfN) {
      break;
    }

    // Search +/- 2 bins around theoretical harmonic to account for slight window leakage
    let harmPeakMag = 0;
    const searchMin = Math.max(1, targetHarmonicBin - 2);
    const searchMax = Math.min(halfN - 1, targetHarmonicBin + 2);
    for (let k = searchMin; k <= searchMax; k++) {
      if (fft.magnitudes[k] > harmPeakMag) {
        harmPeakMag = fft.magnitudes[k];
      }
    }

    sumHarmonicPower += harmPeakMag * harmPeakMag;
    const relDb =
      harmPeakMag > precision.floatEpsilon
        ? 20 * Math.log10(harmPeakMag / (fundamentalMag > precision.floatEpsilon ? fundamentalMag : 1.0))
        : -120;

    individualHarmonicsDb[`h${h}`] = roundToPrecision(assertFiniteNumber(relDb, `h${h}_level`), precision);
  }

  // 3. Compute THD% = sqrt(sum(V_harm^2)) / V_fund * 100
  let rawThdPercent = 0;
  if (fundamentalMag > precision.floatEpsilon) {
    const harmVrms = Math.sqrt(sumHarmonicPower);
    rawThdPercent = (harmVrms / fundamentalMag) * 100;
  }
  const thdPercent = roundToPrecision(assertFiniteNumber(rawThdPercent, "thd_percent"), precision);

  // 4. Compute THD+N
  // Total power excluding fundamental bin and its immediate skirts
  let totalSignalPower = 0;
  for (let k = 1; k < halfN; k++) {
    const mag = fft.magnitudes[k];
    totalSignalPower += mag * mag;
    if (Math.abs(k - fundamentalBin) > 3) {
      totalNonFundPower += mag * mag;
    }
  }

  let rawThdPlusNDb = -120;
  if (fundamentalMag > precision.floatEpsilon && totalNonFundPower > precision.floatEpsilon) {
    rawThdPlusNDb = 10 * Math.log10(totalNonFundPower / (fundamentalMag * fundamentalMag));
  }
  const thdPlusNDb = roundToPrecision(assertFiniteNumber(rawThdPlusNDb, "thd_plus_n_db"), precision);

  // 5. Harmonic energy ratio = sum(harm_power) / (fund_power + sum(harm_power))
  const fundPower = fundamentalMag * fundamentalMag;
  const totalHarmonicAndFund = fundPower + sumHarmonicPower;
  const rawRatio =
    totalHarmonicAndFund > precision.floatEpsilon ? sumHarmonicPower / totalHarmonicAndFund : 0;
  const harmonicEnergyRatio = roundToPrecision(
    assertFiniteNumber(rawRatio, "harmonic_energy_ratio"),
    precision
  );

  return {
    fundamentalFrequencyHz: roundToPrecision(fundamentalFreqHz, precision),
    fundamentalMagnitudeDb: roundToPrecision(fundamentalMagDb, precision),
    thdPercent,
    thdPlusNDb,
    harmonicEnergyRatio,
    individualHarmonicsDb,
  };
}
