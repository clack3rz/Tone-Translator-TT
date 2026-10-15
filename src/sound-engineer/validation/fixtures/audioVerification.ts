// src/sound-engineer/validation/fixtures/audioVerification.ts
// Audio payload integrity and PCM header validation engine for Phase 1C.5h WP-08.
// Enforces uncompressed PCM audio requirement and tamper-evident bit integrity.

import { type IntegrityProvider } from "../schemas/integrity";
import { type PcmAudioSpec, type PcmValidationResult } from "./types";

/**
 * Rotates a 32-bit integer right by n bits.
 */
function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

// SHA-256 Constants (first 32 bits of fractional parts of cube roots of first 64 primes)
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Computes deterministic SHA-256 hex string directly over raw binary bytes (Uint8Array).
 * Ensures zero-dependency cryptographic hashing of binary audio buffers.
 */
export function computeSha256BytesHex(bytes: Uint8Array): string {
  const bitLength = bytes.length * 8;
  const extraBytes = (bytes.length + 9) % 64;
  const paddingLength = extraBytes === 0 ? 0 : 64 - extraBytes;
  const totalLength = bytes.length + 1 + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(totalLength - 8, highBits, false);
  view.setUint32(totalLength - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const hexParts = [h0, h1, h2, h3, h4, h5, h6, h7].map((num) =>
    num.toString(16).padStart(8, "0")
  );
  return hexParts.join("");
}

/**
 * Computes payload digest for binary buffer or string payload.
 */
export function computePayloadDigest(
  payload: Uint8Array | string,
  integrityProvider?: IntegrityProvider
): string {
  if (typeof payload === "string") {
    if (integrityProvider) {
      return integrityProvider.computeDigest(payload);
    }
    const bytes = new TextEncoder().encode(payload);
    return computeSha256BytesHex(bytes);
  }
  return computeSha256BytesHex(payload);
}

/**
 * Verifies that the payload digest matches the expected integrity reference.
 */
export function verifyAudioPayloadIntegrity(
  payload: Uint8Array | string,
  expectedIntegrityRef: string,
  integrityProvider?: IntegrityProvider
): {
  valid: boolean;
  computedDigest: string;
  expectedDigest: string;
  error?: string;
} {
  const computedDigest = computePayloadDigest(payload, integrityProvider);
  const normExpected = expectedIntegrityRef.trim().toLowerCase().replace(/^sha256:/, "");
  const normComputed = computedDigest.trim().toLowerCase().replace(/^sha256:/, "");
  const valid = normExpected === normComputed || expectedIntegrityRef === computedDigest;
  return {
    valid,
    computedDigest,
    expectedDigest: expectedIntegrityRef,
    error: valid
      ? undefined
      : `Audio bit integrity mismatch: expected ${expectedIntegrityRef}, computed ${computedDigest} (Invariant 4 violation / Condition 01)`,
  };
}

/**
 * Reads a 4-character ASCII string from buffer at given byte offset.
 */
function readAsciiString(buffer: Uint8Array, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length && offset + i < buffer.length; i++) {
    str += String.fromCharCode(buffer[offset + i]);
  }
  return str;
}

/**
 * Validates an uncompressed PCM WAV header and structure.
 * Rejects corrupt audio headers and non-PCM compressed formats.
 */
export function validatePcmWavHeader(buffer: Uint8Array): PcmValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (buffer.length < 44) {
    return {
      valid: false,
      errors: [
        `Corrupt audio header: WAV buffer length ${buffer.length} bytes is shorter than minimum 44-byte RIFF header`,
      ],
      warnings: [],
    };
  }

  const riff = readAsciiString(buffer, 0, 4);
  if (riff !== "RIFF" && riff !== "RIFX") {
    return {
      valid: false,
      errors: [
        `Corrupt audio header: missing 'RIFF' magic bytes at offset 0 (found '${riff}')`,
      ],
      warnings: [],
    };
  }

  const isLittleEndian = riff === "RIFF";
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const wave = readAsciiString(buffer, 8, 4);
  if (wave !== "WAVE") {
    return {
      valid: false,
      errors: [
        `Corrupt audio header: missing 'WAVE' format marker at offset 8 (found '${wave}')`,
      ],
      warnings: [],
    };
  }

  let offset = 12;
  let foundFmt = false;
  let foundData = false;

  let audioFormatCode = 0;
  let channels = 0;
  let sampleRate = 0;
  let byteRate = 0;
  let blockAlign = 0;
  let bitsPerSample = 0;
  let dataChunkSize = 0;
  let dataChunkOffset = 0;

  // Walk RIFF chunks
  while (offset + 8 <= buffer.length) {
    const chunkId = readAsciiString(buffer, offset, 4);
    const chunkSize = view.getUint32(offset + 4, isLittleEndian);
    const chunkDataOffset = offset + 8;

    if (chunkId === "fmt ") {
      foundFmt = true;
      if (chunkSize < 16) {
        errors.push(`Corrupt 'fmt ' chunk: size ${chunkSize} is smaller than 16 bytes`);
        break;
      }
      if (chunkDataOffset + 16 > buffer.length) {
        errors.push(`Corrupt 'fmt ' chunk: truncated within buffer`);
        break;
      }

      audioFormatCode = view.getUint16(chunkDataOffset, isLittleEndian);
      channels = view.getUint16(chunkDataOffset + 2, isLittleEndian);
      sampleRate = view.getUint32(chunkDataOffset + 4, isLittleEndian);
      byteRate = view.getUint32(chunkDataOffset + 8, isLittleEndian);
      blockAlign = view.getUint16(chunkDataOffset + 12, isLittleEndian);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, isLittleEndian);
    } else if (chunkId === "data") {
      foundData = true;
      dataChunkSize = chunkSize;
      dataChunkOffset = chunkDataOffset;
      // data chunk is often the last chunk or followed by metadata
    }

    // Chunks are padded to word boundaries (2 bytes)
    const paddedSize = chunkSize + (chunkSize % 2);
    offset += 8 + paddedSize;
  }

  if (!foundFmt) {
    errors.push("Missing required 'fmt ' chunk in WAV container");
  }

  if (!foundData) {
    errors.push("Missing required 'data' chunk in WAV container");
  }

  if (foundFmt) {
    // Check audio format: 1 = PCM integer, 3 = IEEE float
    if (audioFormatCode !== 1 && audioFormatCode !== 3) {
      errors.push(
        `Non-PCM audio format rejected: format code 0x${audioFormatCode.toString(
          16
        )} is not uncompressed PCM (format 1 or 3 required)`
      );
    }

    if (channels < 1 || channels > 8) {
      errors.push(`Invalid audio channel count: ${channels} (must be between 1 and 8)`);
    }

    if (sampleRate < 8000 || sampleRate > 384000) {
      errors.push(
        `Invalid sample rate: ${sampleRate} Hz (calibrated range is 8000 Hz to 384000 Hz)`
      );
    }

    if (bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
      errors.push(
        `Invalid bit depth: ${bitsPerSample} bits (must be 16, 24, or 32-bit PCM)`
      );
    }

    const expectedBlockAlign = (channels * bitsPerSample) / 8;
    if (blockAlign !== expectedBlockAlign) {
      errors.push(
        `Corrupt header: block align ${blockAlign} does not match channels * bitsPerSample / 8 (${expectedBlockAlign})`
      );
    }

    const expectedByteRate = sampleRate * expectedBlockAlign;
    if (byteRate !== expectedByteRate) {
      errors.push(
        `Corrupt header: byte rate ${byteRate} does not match sampleRate * blockAlign (${expectedByteRate})`
      );
    }
  }

  if (foundData) {
    if (dataChunkSize === 0) {
      errors.push("Data chunk size is 0 bytes (empty audio stem)");
    }
    if (dataChunkOffset + dataChunkSize > buffer.length) {
      errors.push(
        `Corrupt WAV header: data chunk size (${dataChunkSize}) exceeds physical buffer length (${buffer.length - dataChunkOffset})`
      );
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = dataChunkSize / (channels * bytesPerSample);
  const durationSeconds = sampleCount / sampleRate;

  const spec: PcmAudioSpec = {
    sampleRate,
    channels,
    bitDepth: bitsPerSample as 16 | 24 | 32,
    byteLength: dataChunkSize,
    sampleCount,
    durationSeconds,
    isFloat: audioFormatCode === 3,
    audioFormatCode,
  };

  return {
    valid: true,
    errors: [],
    warnings,
    spec,
  };
}

/**
 * Creates a valid in-memory PCM WAV buffer for synthetic test signals and fixtures.
 */
export function createSyntheticPcmWav(options: {
  sampleRate?: number;
  channels?: number;
  bitDepth?: 16 | 24 | 32;
  durationSeconds?: number;
  signalType?: "sine" | "chirp" | "impulse" | "silence" | "noise";
  frequencyHz?: number;
  amplitudeDbFs?: number;
}): Uint8Array {
  const sampleRate = options.sampleRate ?? 48000;
  const channels = options.channels ?? 1;
  const bitDepth = options.bitDepth ?? 24;
  const durationSeconds = options.durationSeconds ?? 1.0;
  const signalType = options.signalType ?? "sine";
  const frequencyHz = options.frequencyHz ?? 1000;
  const amplitudeDbFs = options.amplitudeDbFs ?? -6; // -6 dBFS nominal

  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const riffSize = 36 + dataSize;

  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);

  // 'RIFF' chunk descriptor
  buffer[0] = 0x52; // R
  buffer[1] = 0x49; // I
  buffer[2] = 0x46; // F
  buffer[3] = 0x46; // F
  view.setUint32(4, riffSize, true);

  // 'WAVE' format
  buffer[8] = 0x57; // W
  buffer[9] = 0x41; // A
  buffer[10] = 0x56; // V
  buffer[11] = 0x45; // E

  // 'fmt ' subchunk
  buffer[12] = 0x66; // f
  buffer[13] = 0x6d; // m
  buffer[14] = 0x74; // t
  buffer[15] = 0x20; // ' '
  view.setUint32(16, 16, true); // Subchunk1Size = 16 for PCM
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true); // 1 = PCM integer, 3 = IEEE float
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // 'data' subchunk
  buffer[36] = 0x64; // d
  buffer[37] = 0x61; // a
  buffer[38] = 0x74; // t
  buffer[39] = 0x61; // a
  view.setUint32(40, dataSize, true);

  // Generate signal samples
  const peakLinear = Math.pow(10, amplitudeDbFs / 20);
  let dataOffset = 44;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sampleVal = 0;

    switch (signalType) {
      case "sine":
        sampleVal = Math.sin(2 * Math.PI * frequencyHz * t) * peakLinear;
        break;
      case "chirp": {
        // Log sweep 20 Hz to 20 kHz
        const f0 = 20;
        const f1 = 20000;
        const k = Math.pow(f1 / f0, 1 / durationSeconds);
        const currentFreq = f0 * Math.pow(k, t);
        sampleVal = Math.sin(2 * Math.PI * currentFreq * t) * peakLinear;
        break;
      }
      case "impulse":
        sampleVal = i === 0 ? peakLinear : 0;
        break;
      case "noise":
        sampleVal = (Math.random() * 2 - 1) * peakLinear;
        break;
      case "silence":
      default:
        sampleVal = 0;
        break;
    }

    // Clamp [-1.0, 1.0]
    sampleVal = Math.max(-1.0, Math.min(1.0, sampleVal));

    // Write across channels
    for (let c = 0; c < channels; c++) {
      if (bitDepth === 16) {
        const int16 = Math.round(sampleVal * 32767);
        view.setInt16(dataOffset, int16, true);
        dataOffset += 2;
      } else if (bitDepth === 24) {
        const int24 = Math.round(sampleVal * 8388607);
        buffer[dataOffset] = int24 & 0xff;
        buffer[dataOffset + 1] = (int24 >> 8) & 0xff;
        buffer[dataOffset + 2] = (int24 >> 16) & 0xff;
        dataOffset += 3;
      } else if (bitDepth === 32) {
        // IEEE Float 32
        view.setFloat32(dataOffset, sampleVal, true);
        dataOffset += 4;
      }
    }
  }

  return buffer;
}
