// src/sound-engineer/contracts/inputSnapshot.ts
// Platform-independent, immutable Run Input Snapshot contract for Tone Translator Sound Engineer

import { RunId, ExecutionStream, isExecutionStream } from "../execution";
import {
  SnapshotProvenanceMap,
  InputProvenanceRecord,
  INPUT_PROVENANCE_SOURCES,
} from "./inputProvenance";
import {
  AudioPayloadDescriptor,
  ImportedPresetDescriptor,
} from "./audioPayloadDescriptor";
import { deepFreeze, defensiveClone } from "./immutability";

/**
 * Current version of the InputSnapshot contract specification.
 */
export const INPUT_SNAPSHOT_CONTRACT_VERSION = "1.0.0" as const;

export type SnapshotId = string;

/**
 * Operational flags and generation options passed to the run.
 */
export interface GenerationOptionsInput {
  /** Tone Translator validation recipe mode flag */
  readonly useValidationRecipes?: boolean;
  /** Extensible options dictionary for future run parameters */
  readonly [key: string]: unknown;
}

/**
 * Exact inputs associated with one execution run, prior to any
 * Evidence Analysis or Sound Engineer reasoning.
 */
export interface RunInputs {
  /** User text description or musical prompt */
  readonly userText?: string;
  /** Optional YouTube reference URL */
  readonly youtubeUrl?: string;
  /** Optional target / reference audio descriptor */
  readonly targetAudio?: AudioPayloadDescriptor;
  /** Optional user / current recording audio descriptor */
  readonly recordingAudio?: AudioPayloadDescriptor;
  /** Optional imported reference preset descriptor (opaque) */
  readonly importedPreset?: ImportedPresetDescriptor;
  /** Generation options and operational flags */
  readonly generationOptions: GenerationOptionsInput;
}

/**
 * Immutable Input Snapshot contract representing exactly what an execution run received.
 */
export interface InputSnapshot {
  /** Explicit semantic version of the snapshot contract */
  readonly contractVersion: typeof INPUT_SNAPSHOT_CONTRACT_VERSION;

  /** Globally unique snapshot identifier */
  readonly snapshotId: SnapshotId;

  /** Phase 1A.1 execution run identity to which this snapshot is anchored */
  readonly runId: RunId;

  /** Phase 1A.1 execution stream under which this run was dispatched */
  readonly stream: ExecutionStream;

  /** ISO 8601 creation timestamp (UTC) */
  readonly createdAt: string;

  /** Exact inputs supplied to the run */
  readonly inputs: RunInputs;

  /** Explicit origin/provenance record for each input category */
  readonly provenance: SnapshotProvenanceMap;

  /** Optional extensible tags */
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Options for creating an immutable InputSnapshot.
 */
export interface CreateInputSnapshotOptions {
  /** Phase 1A.1 runId (required) */
  runId: RunId;

  /** Phase 1A.1 execution stream (required) */
  stream: ExecutionStream;

  /** User text description or musical prompt */
  userText?: string;

  /** Optional YouTube reference URL */
  youtubeUrl?: string;

  /** Optional target / reference audio descriptor */
  targetAudio?: AudioPayloadDescriptor;

  /** Optional user / current recording audio descriptor */
  recordingAudio?: AudioPayloadDescriptor;

  /** Optional imported reference preset descriptor */
  importedPreset?: ImportedPresetDescriptor;

  /** Generation options and operational flags */
  generationOptions?: GenerationOptionsInput;

  /** Optional custom snapshotId (defaults to generated unique ID) */
  snapshotId?: SnapshotId;

  /** Optional explicit creation timestamp (defaults to now) */
  createdAt?: string;

  /** Explicit provenance overrides per input category */
  provenanceOverrides?: Partial<SnapshotProvenanceMap>;

  /** Optional extensible tags */
  tags?: Record<string, string>;
}

/**
 * Generates an independently identifiable SnapshotId.
 */
export function generateSnapshotId(stream?: ExecutionStream): SnapshotId {
  const prefix = stream ? `snap_${stream.toLowerCase()}` : "snap";
  let uuid: string;

  if (typeof globalThis.crypto?.randomUUID === "function") {
    uuid = globalThis.crypto.randomUUID();
  } else {
    const timestamp = Date.now().toString(36);
    const randomHex = Math.random().toString(36).substring(2, 10);
    uuid = `${timestamp}-${randomHex}`;
  }

  return `${prefix}_${uuid}`;
}

/**
 * Constructs a default provenance record for an input based on presence.
 */
function resolveDefaultProvenance(
  isSupplied: boolean,
  suppliedDescription?: string,
  override?: InputProvenanceRecord
): InputProvenanceRecord {
  if (override) {
    return { ...override };
  }
  return {
    source: isSupplied
      ? INPUT_PROVENANCE_SOURCES.USER_SUPPLIED
      : INPUT_PROVENANCE_SOURCES.NOT_SUPPLIED,
    ...(suppliedDescription ? { description: suppliedDescription } : {}),
  };
}

/**
 * Factory function creating a fully immutable, platform-independent InputSnapshot.
 * Defensively clones inputs and deeply freezes the entire snapshot data structure.
 */
export function createInputSnapshot(options: CreateInputSnapshotOptions): InputSnapshot {
  if (!options.runId || typeof options.runId !== "string") {
    throw new Error(`Invalid runId: "${String(options.runId)}". InputSnapshot requires an active RunId.`);
  }

  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}". Expected CURRENT, SHADOW, or DEV.`);
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const snapshotId = options.snapshotId ?? generateSnapshotId(options.stream);

  // Defensively copy options and inputs so post-creation caller mutations do not affect the snapshot
  const generationOptions: GenerationOptionsInput = options.generationOptions
    ? defensiveClone(options.generationOptions)
    : { useValidationRecipes: false };

  const inputs: RunInputs = {
    ...(options.userText !== undefined ? { userText: options.userText } : {}),
    ...(options.youtubeUrl !== undefined ? { youtubeUrl: options.youtubeUrl } : {}),
    ...(options.targetAudio !== undefined ? { targetAudio: options.targetAudio } : {}),
    ...(options.recordingAudio !== undefined ? { recordingAudio: options.recordingAudio } : {}),
    ...(options.importedPreset !== undefined ? { importedPreset: options.importedPreset } : {}),
    generationOptions,
  };

  const pOverrides = options.provenanceOverrides || {};

  const provenance: SnapshotProvenanceMap = {
    userText: resolveDefaultProvenance(
      inputs.userText !== undefined && inputs.userText.trim().length > 0,
      inputs.userText ? "User text prompt provided" : undefined,
      pOverrides.userText
    ),
    youtubeUrl: resolveDefaultProvenance(
      Boolean(inputs.youtubeUrl && inputs.youtubeUrl.trim().length > 0),
      inputs.youtubeUrl ? "YouTube URL reference provided" : undefined,
      pOverrides.youtubeUrl
    ),
    targetAudio: resolveDefaultProvenance(
      Boolean(inputs.targetAudio),
      inputs.targetAudio?.fileName || (inputs.targetAudio ? "Reference audio provided" : undefined),
      pOverrides.targetAudio
    ),
    recordingAudio: resolveDefaultProvenance(
      Boolean(inputs.recordingAudio),
      inputs.recordingAudio?.fileName || (inputs.recordingAudio ? "Current user recording provided" : undefined),
      pOverrides.recordingAudio
    ),
    importedPreset: resolveDefaultProvenance(
      Boolean(inputs.importedPreset),
      inputs.importedPreset?.fileName || (inputs.importedPreset ? "Imported preset provided" : undefined),
      pOverrides.importedPreset
    ),
    generationOptions: resolveDefaultProvenance(
      Boolean(options.generationOptions),
      "Execution configuration options",
      pOverrides.generationOptions
    ),
  };

  const rawSnapshot: InputSnapshot = {
    contractVersion: INPUT_SNAPSHOT_CONTRACT_VERSION,
    snapshotId,
    runId: options.runId,
    stream: options.stream,
    createdAt,
    inputs,
    provenance,
    ...(options.tags ? { tags: defensiveClone(options.tags) } : {}),
  };

  // Deep-freeze to guarantee runtime immutability against consumer modifications
  return deepFreeze(rawSnapshot);
}

/**
 * Type guard validating whether an unknown object conforms to the InputSnapshot contract.
 */
export function isInputSnapshot(value: unknown): value is InputSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    candidate.contractVersion === INPUT_SNAPSHOT_CONTRACT_VERSION &&
    typeof candidate.snapshotId === "string" &&
    candidate.snapshotId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    typeof candidate.inputs === "object" &&
    candidate.inputs !== null &&
    typeof candidate.provenance === "object" &&
    candidate.provenance !== null &&
    (candidate.tags === undefined || (typeof candidate.tags === "object" && candidate.tags !== null))
  );
}
