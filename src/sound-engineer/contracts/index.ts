// src/sound-engineer/contracts/index.ts
// Re-export versioned contracts for Tone Translator Sound Engineer

export {
  INPUT_PROVENANCE_SOURCES,
  VALID_INPUT_PROVENANCE_SOURCES,
  isInputProvenanceSource,
  type InputProvenanceSource,
  type InputProvenanceRecord,
  type SnapshotProvenanceMap,
} from "./inputProvenance";

export {
  computePayloadFingerprint,
  createAudioPayloadDescriptor,
  createImportedPresetDescriptor,
  type AudioPayloadSourceType,
  type AudioPayloadHandle,
  type AudioPayloadDescriptor,
  type ImportedPresetFormat,
  type ImportedPresetDescriptor,
  type CreateAudioDescriptorOptions,
  type CreateImportedPresetDescriptorOptions,
} from "./audioPayloadDescriptor";

export {
  deepFreeze,
  defensiveClone,
} from "./immutability";

export {
  INPUT_SNAPSHOT_CONTRACT_VERSION,
  generateSnapshotId,
  createInputSnapshot,
  isInputSnapshot,
  type SnapshotId,
  type GenerationOptionsInput,
  type RunInputs,
  type InputSnapshot,
  type CreateInputSnapshotOptions,
} from "./inputSnapshot";
