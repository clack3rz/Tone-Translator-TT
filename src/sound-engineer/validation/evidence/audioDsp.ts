// src/sound-engineer/validation/evidence/audioDsp.ts
// DSP primitives, PCM WAV sample decoding, and FFT analysis for Phase 1C.5h WP-11.
// Strictly unprivileged, pure mathematical computation with zero external dependencies.

import { validatePcmWavHeader } from "../fixtures/audioVerification";
import { AudioPayloadMalformedError, NumericalInstabilityError } from "./measurementErrors";
import { MeasurementPrecisionProfile } from "./objectiveTypes";

/**
 * Asserts that a number is strictly finite and not NaN.
 * Throws NumericalInstabilityError immediately on non-finite values.
 */
export function assertFiniteNumber(val: number, metricName: string): number {
  if (Number.isNaN(val)) {
    throw new NumericalInstabilityError(metricName, "Value is NaN");
  }
  if (!Number.isFinite(val)) {
    throw new NumericalInstabilityError(metricName, "Value is infinite");
  }
  return val;
}

/**
 * Deterministically rounds a floating-point number to the precision profile's decimal places.
 */
export function roundToPrecision(val: number, precision: MeasurementPrecisionProfile): number {
  assertFiniteNumber(val, "precision_rounding");
  const factor = Math.pow(10, precision.decimalPlaces);
  const rounded = Math.round(val * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Decoded multi-channel audio stream.
 */
export interface DecodedAudioStream {
  readonly channels: ReadonlyArray<Float64Array>;
  readonly sampleRate: number;
  readonly sampleCount: number;
}

/**
 * Decodes a raw uncompressed integer PCM WAV buffer into normalized floating-point channels in range [-1.0, 1.0].
 * Fails closed on malformed headers, empty data chunks, or unsupported non-PCM formats.
 */
export function decodePcmWavSamples(buffer: Uint8Array): DecodedAudioStream {
  if (!buffer || buffer.length === 0) {
    throw new AudioPayloadMalformedError("Buffer is empty or null (0 bytes)");
  }

  const parseResult = validatePcmWavHeader(buffer);
  if (!parseResult.valid || !parseResult.spec) {
    throw new AudioPayloadMalformedError(parseResult.errors.join("; "));
  }

  const spec = parseResult.spec;
  if (spec.sampleCount === 0) {
    throw new AudioPayloadMalformedError("WAV contains 0 audio samples (empty stem)");
  }

  // Find 'data' chunk offset
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 12;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = String.fromCharCode(
      buffer[offset],
      buffer[offset + 1],
      buffer[offset + 2],
      buffer[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "data") {
      dataOffset = offset + 8;
      dataLength = chunkSize;
      break;
    }
    const padded = chunkSize + (chunkSize % 2);
    offset += 8 + padded;
  }

  if (dataOffset === -1 || dataOffset + dataLength > buffer.length) {
    throw new AudioPayloadMalformedError("Could not locate valid 'data' chunk in WAV buffer");
  }

  const channels: Float64Array[] = [];
  for (let ch = 0; ch < spec.channels; ch++) {
    channels.push(new Float64Array(spec.sampleCount));
  }

  const bytesPerSample = spec.bitDepth / 8;
  const blockAlign = spec.channels * bytesPerSample;

  if (spec.bitDepth === 16) {
    const maxVal = 32768.0;
    for (let i = 0; i < spec.sampleCount; i++) {
      const sampleOffset = dataOffset + i * blockAlign;
      for (let ch = 0; ch < spec.channels; ch++) {
        const raw = view.getInt16(sampleOffset + ch * 2, true);
        channels[ch][i] = raw / maxVal;
      }
    }
  } else if (spec.bitDepth === 24) {
    const maxVal = 8388608.0;
    for (let i = 0; i < spec.sampleCount; i++) {
      const sampleOffset = dataOffset + i * blockAlign;
      for (let ch = 0; ch < spec.channels; ch++) {
        const byte0 = buffer[sampleOffset + ch * 3];
        const byte1 = buffer[sampleOffset + ch * 3 + 1];
        const byte2 = buffer[sampleOffset + ch * 3 + 2];
        let raw = byte0 | (byte1 << 8) | (byte2 << 16);
        // Sign extension for 24-bit
        if (raw & 0x800000) {
          raw |= ~0xffffff;
        }
        channels[ch][i] = raw / maxVal;
      }
    }
  } else if (spec.bitDepth === 32) {
    const maxVal = 2147483648.0;
    for (let i = 0; i < spec.sampleCount; i++) {
      const sampleOffset = dataOffset + i * blockAlign;
      for (let ch = 0; ch < spec.channels; ch++) {
        const raw = view.getInt32(sampleOffset + ch * 4, true);
        channels[ch][i] = raw / maxVal;
      }
    }
  } else {
    throw new AudioPayloadMalformedError(`Unsupported bit depth: ${spec.bitDepth}`);
  }

  return {
    channels,
    sampleRate: spec.sampleRate,
    sampleCount: spec.sampleCount,
  };
}

/**
 * FFT Result containing frequency bin magnitudes and complex components.
 */
export interface FftResult {
  readonly real: Float64Array;
  readonly imag: Float64Array;
  readonly magnitudes: Float64Array;
  readonly fftSize: number;
  readonly binWidthHz: number;
}

/**
 * Computes Cooley-Tukey radix-2 FFT on a power-of-2 length array.
 * Zero-pads the input signal if its length is less than target size.
 */
export function computeFft(
  samples: Float64Array,
  sampleRate: number,
  targetSize: number = 4096,
  windowType: "hann" | "rectangular" = "hann"
): FftResult {
  if (samples.length === 0) {
    throw new AudioPayloadMalformedError("Cannot compute FFT on empty sample array");
  }

  // Ensure targetSize is a power of 2
  let n = 1;
  while (n < targetSize) {
    n <<= 1;
  }

  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  const copyLen = Math.min(samples.length, n);

  // Apply window function
  if (windowType === "hann") {
    for (let i = 0; i < copyLen; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (copyLen - 1)));
      real[i] = samples[i] * w;
    }
  } else {
    for (let i = 0; i < copyLen; i++) {
      real[i] = samples[i];
    }
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey computation
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const tR = wR * real[i + k + halfLen] - wI * imag[i + k + halfLen];
        const tI = wR * imag[i + k + halfLen] + wI * real[i + k + halfLen];

        real[i + k] = uR + tR;
        imag[i + k] = uI + tI;
        real[i + k + halfLen] = uR - tR;
        imag[i + k + halfLen] = uI - tI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Compute magnitudes for single-sided spectrum (0 to Nyquist)
  const halfN = n / 2;
  const magnitudes = new Float64Array(halfN + 1);
  const normFactor = 2.0 / copyLen;

  for (let k = 0; k <= halfN; k++) {
    const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) * normFactor;
    magnitudes[k] = mag;
  }

  const binWidthHz = sampleRate / n;

  return {
    real,
    imag,
    magnitudes,
    fftSize: n,
    binWidthHz,
  };
}
