// src/sound-engineer/checkpoints/layerIdentity.ts
// Strongly typed layer vocabulary for Sound Engineer architecture

/**
 * Authoritative Sound Engineer processing layers.
 * Completely decoupled from specific DAW/hardware platforms (e.g. AT5).
 *
 * NOTE on EXPORT:
 * Represents a future traceable execution boundary for downstream format serialization
 * and export package generation. It does NOT own, replace, or govern CURRENT AT5 preset export.
 */
export const SOUND_ENGINEER_LAYERS = {
  /** Ingestion and provenance capture of raw user prompts, references, and audio inputs */
  INPUT: "INPUT",

  /** Extraction and synthesis of musical/acoustic evidence from source references */
  EVIDENCE: "EVIDENCE",

  /** Deep sound engineering analysis, target gear selection, and architectural decisions */
  ENGINEERING: "ENGINEERING",

  /** High-level semantic design representation of the tone topology and aesthetic goals */
  SEMANTIC_DESIGN: "SEMANTIC_DESIGN",

  /** Pre-flight acoustic, electrical, and constraint validation against target limitations */
  VALIDATION: "VALIDATION",

  /** Translation of semantic tone design into concrete platform-specific parameters and recipes */
  PLATFORM_TRANSLATION: "PLATFORM_TRANSLATION",

  /** Final artifact preparation and serialization (traceable boundary only; does NOT govern CURRENT export) */
  EXPORT: "EXPORT",
} as const;

export type LayerIdentity = (typeof SOUND_ENGINEER_LAYERS)[keyof typeof SOUND_ENGINEER_LAYERS];

const LAYER_VALUES = new Set<string>(Object.values(SOUND_ENGINEER_LAYERS));

/**
 * Type guard to validate whether an unknown value is a recognized LayerIdentity.
 */
export function isLayerIdentity(value: unknown): value is LayerIdentity {
  return typeof value === "string" && LAYER_VALUES.has(value);
}
