// src/sound-engineer/contracts/inputProvenance.ts
// Platform-independent input provenance specification for Tone Translator Sound Engineer Architecture

/**
 * Authoritative input provenance sources.
 * Explicitly records the origin of every input category supplied to an execution run.
 *
 * - `user_supplied`: Directly provided by the user in the current session (e.g. typed prompt, dropped file).
 * - `application_default`: System fallback or baseline default (e.g. default placeholder prompt).
 * - `restored_session`: Rehydrated from a previously stored working session.
 * - `imported_preset`: Extracted from an imported preset or patch container.
 * - `generated_derived`: Programmatically derived or transformed from a prior step.
 * - `not_supplied`: Explicitly absent / not provided for this run.
 */
export const INPUT_PROVENANCE_SOURCES = {
  USER_SUPPLIED: "user_supplied",
  APPLICATION_DEFAULT: "application_default",
  RESTORED_SESSION: "restored_session",
  IMPORTED_PRESET: "imported_preset",
  GENERATED_DERIVED: "generated_derived",
  NOT_SUPPLIED: "not_supplied",
} as const;

export type InputProvenanceSource = (typeof INPUT_PROVENANCE_SOURCES)[keyof typeof INPUT_PROVENANCE_SOURCES];

export const VALID_INPUT_PROVENANCE_SOURCES: readonly InputProvenanceSource[] = Object.freeze([
  INPUT_PROVENANCE_SOURCES.USER_SUPPLIED,
  INPUT_PROVENANCE_SOURCES.APPLICATION_DEFAULT,
  INPUT_PROVENANCE_SOURCES.RESTORED_SESSION,
  INPUT_PROVENANCE_SOURCES.IMPORTED_PRESET,
  INPUT_PROVENANCE_SOURCES.GENERATED_DERIVED,
  INPUT_PROVENANCE_SOURCES.NOT_SUPPLIED,
]);

/**
 * Type guard to check if a value is a valid InputProvenanceSource.
 */
export function isInputProvenanceSource(value: unknown): value is InputProvenanceSource {
  return typeof value === "string" && (VALID_INPUT_PROVENANCE_SOURCES as readonly string[]).includes(value);
}

/**
 * Explicit provenance record for an individual input dimension.
 */
export interface InputProvenanceRecord {
  /** The authoritative origin category */
  readonly source: InputProvenanceSource;
  /** Optional human-readable description (e.g. original filename, session key) */
  readonly description?: string;
  /** ISO 8601 timestamp when this input was registered */
  readonly suppliedAt?: string;
}

/**
 * Complete provenance map for all input categories supported by Tone Translator.
 * Distinguishes present vs. absent inputs explicitly.
 */
export interface SnapshotProvenanceMap {
  /** Provenance of the user text / prompt */
  readonly userText: InputProvenanceRecord;
  /** Provenance of the YouTube URL reference */
  readonly youtubeUrl: InputProvenanceRecord;
  /** Provenance of the target / reference audio */
  readonly targetAudio: InputProvenanceRecord;
  /** Provenance of the user / current recording audio */
  readonly recordingAudio: InputProvenanceRecord;
  /** Provenance of the imported preset context */
  readonly importedPreset: InputProvenanceRecord;
  /** Provenance of execution options and flags */
  readonly generationOptions: InputProvenanceRecord;
}
