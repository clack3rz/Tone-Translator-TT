// src/sound-engineer/contracts/audioPayloadDescriptor.ts
// Platform-independent payload descriptors for large inputs (Audio & Presets)

/**
 * Supported source formats for audio payloads.
 */
export type AudioPayloadSourceType = "file" | "base64" | "data_url" | "blob" | "external_reference";

/**
 * Immutable carrier for audio payload content.
 * Kept distinct from the descriptor metadata to avoid deep-cloning multi-megabyte strings.
 */
export interface AudioPayloadHandle {
  /** Raw base64 encoded audio string (if loaded in memory) */
  readonly base64?: string;
  /** Browser Blob or File reference (if in-memory) */
  readonly blob?: Blob;
  /** External storage or resource URI (for future out-of-band retrieval) */
  readonly uri?: string;
}

/**
 * Platform-independent descriptor for an audio input payload.
 * Provides complete immutable identity, metadata, and fingerprinting without
 * requiring duplication of the underlying audio binary in browser memory.
 */
export interface AudioPayloadDescriptor {
  /** Unique payload identifier */
  readonly payloadId: string;
  /** Source format representation */
  readonly sourceType: AudioPayloadSourceType;
  /** Original file name if supplied (e.g. "riff_reference.wav") */
  readonly fileName?: string;
  /** MIME type (e.g. "audio/wav", "audio/mp3", "audio/mpeg") */
  readonly mimeType: string;
  /** Size in bytes if known */
  readonly byteLength?: number;
  /** Duration in seconds if pre-calculated */
  readonly durationSeconds?: number;
  /**
   * Content fingerprint / checksum representation.
   * Enables cache lookups and verification without reading raw audio bytes.
   */
  readonly fingerprint?: string;
  /**
   * Reference handle to the underlying audio data.
   * Wrapped in a frozen container to maintain immutability without cloning large strings.
   */
  readonly payloadHandle?: AudioPayloadHandle;
}

/**
 * Supported container formats for imported preset files.
 */
export type ImportedPresetFormat = "at5p" | "xml" | "json" | "opaque";

/**
 * Platform-independent descriptor for an imported preset input.
 * Represents what was supplied before any AT5-specific parsing or gear translation occurs.
 */
export interface ImportedPresetDescriptor {
  /** Unique preset payload identifier */
  readonly presetId: string;
  /** Original file name (e.g. "LeadSolo.at5p") */
  readonly fileName: string;
  /** Format of the imported file */
  readonly format: ImportedPresetFormat;
  /** Size in bytes of the raw payload */
  readonly sizeBytes: number;
  /** Optional content fingerprint */
  readonly fingerprint?: string;
  /** Raw unparsed content string */
  readonly rawContent?: string;
}

/**
 * Generates a lightweight payload fingerprint from metadata and content hints without full hashing overhead.
 */
export function computePayloadFingerprint(
  name: string,
  byteLength: number,
  contentSample?: string
): string {
  const sample = contentSample ? contentSample.substring(0, 32) : "";
  const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `fp_${cleanName}_${byteLength}_${sample.length}`;
}

export interface CreateAudioDescriptorOptions {
  sourceType: AudioPayloadSourceType;
  fileName?: string;
  mimeType: string;
  byteLength?: number;
  durationSeconds?: number;
  fingerprint?: string;
  payloadHandle?: AudioPayloadHandle;
  payloadId?: string;
}

/**
 * Creates an immutable AudioPayloadDescriptor.
 * Freezes metadata and reference handle without copying large string buffers.
 */
export function createAudioPayloadDescriptor(
  options: CreateAudioDescriptorOptions
): AudioPayloadDescriptor {
  const payloadId = options.payloadId || `audio_payload_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const byteLength = options.byteLength ?? (options.payloadHandle?.base64?.length ? Math.round(options.payloadHandle.base64.length * 0.75) : undefined);
  const fingerprint = options.fingerprint || computePayloadFingerprint(options.fileName || "audio", byteLength || 0, options.payloadHandle?.base64);

  return Object.freeze({
    payloadId,
    sourceType: options.sourceType,
    ...(options.fileName ? { fileName: options.fileName } : {}),
    mimeType: options.mimeType,
    ...(byteLength !== undefined ? { byteLength } : {}),
    ...(options.durationSeconds !== undefined ? { durationSeconds: options.durationSeconds } : {}),
    fingerprint,
    ...(options.payloadHandle ? { payloadHandle: Object.freeze({ ...options.payloadHandle }) } : {}),
  });
}

export interface CreateImportedPresetDescriptorOptions {
  fileName: string;
  format?: ImportedPresetFormat;
  rawContent?: string;
  sizeBytes?: number;
  presetId?: string;
  fingerprint?: string;
}

/**
 * Creates an immutable ImportedPresetDescriptor.
 */
export function createImportedPresetDescriptor(
  options: CreateImportedPresetDescriptorOptions
): ImportedPresetDescriptor {
  const presetId = options.presetId || `preset_input_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const sizeBytes = options.sizeBytes ?? (options.rawContent ? options.rawContent.length : 0);
  const ext = options.fileName.toLowerCase().split('.').pop() || "";
  let format: ImportedPresetFormat = options.format || "opaque";
  if (!options.format) {
    if (ext === "at5p") format = "at5p";
    else if (ext === "xml") format = "xml";
    else if (ext === "json") format = "json";
  }

  const fingerprint = options.fingerprint || computePayloadFingerprint(options.fileName, sizeBytes, options.rawContent);

  return Object.freeze({
    presetId,
    fileName: options.fileName,
    format,
    sizeBytes,
    fingerprint,
    ...(options.rawContent !== undefined ? { rawContent: options.rawContent } : {}),
  });
}
