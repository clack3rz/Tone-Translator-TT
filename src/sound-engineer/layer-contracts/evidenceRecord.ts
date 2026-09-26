// src/sound-engineer/layer-contracts/evidenceRecord.ts
// Layer 1 Contract: EvidenceRecord (What was observed)

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { ArtifactReference, isArtifactReference, createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";

export const EVIDENCE_RECORD_CONTRACT_VERSION = "1.0.0" as const;

export type EvidenceId = string;

export function generateEvidenceId(): EvidenceId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `evi_${uuid}`;
}

export interface ObservedSpectralBalance {
  readonly lowEnd?: string;
  readonly lowMids?: string;
  readonly highMids?: string;
  readonly highEnd?: string;
}

export interface ObservedDynamicResponse {
  readonly compression?: string;
  readonly transientAttack?: string;
  readonly sustainProfile?: string;
}

export interface ObservedDistortionTexture {
  readonly saturationLevel?: string;
  readonly breakupCharacter?: string;
  readonly harmonicDensity?: string;
}

export interface ObservedSpatialCharacteristics {
  readonly ambience?: string;
  readonly roomDimension?: string;
  readonly stereoSpread?: string;
}

export interface ObservedAcousticCharacteristics {
  readonly spectralBalance?: ObservedSpectralBalance;
  readonly dynamicResponse?: ObservedDynamicResponse;
  readonly distortionTexture?: ObservedDistortionTexture;
  readonly spatialCharacteristics?: ObservedSpatialCharacteristics;
}

export interface ObservedMusicalContext {
  readonly genreStyle?: string;
  readonly instrumentContext?: string;
  readonly playingTechnique?: string;
  readonly estimatedTempoBpm?: number;
  readonly musicalKey?: string;
}

export interface EvidenceProvenance {
  readonly extractionMethod?: string;
  readonly analyticalConfidence?: number;
  readonly notes?: string;
}

/**
 * EvidenceRecord: Factual and derived observations available to the Sound Engineer
 * before engineering judgement and tone design decisions take place.
 * Strictly observations: NO engineering prescriptions or gear choices.
 */
export interface EvidenceRecord {
  readonly contractVersion: typeof EVIDENCE_RECORD_CONTRACT_VERSION | string;
  readonly evidenceId: EvidenceId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;

  /** References to upstream source inputs (e.g. InputSnapshot) */
  readonly sources: ReadonlyArray<ArtifactReference>;

  /** Factual musical context extracted or specified in inputs */
  readonly musicalContext?: ObservedMusicalContext;

  /** Factual acoustic and spectral characteristics observed */
  readonly acousticCharacteristics?: ObservedAcousticCharacteristics;

  /** Quantitative confidence in the observed evidence (0.0 to 1.0) */
  readonly confidence: number;

  /** Explicit uncertainty factors or measurement limitations */
  readonly uncertainties: ReadonlyArray<string>;

  /** Traceability of how the evidence was observed or derived */
  readonly provenance?: EvidenceProvenance;
}

export interface CreateEvidenceRecordOptions {
  evidenceId?: EvidenceId;
  runId: RunId;
  stream: ExecutionStream;
  createdAt?: string;
  sources?: ReadonlyArray<ArtifactReference>;
  musicalContext?: ObservedMusicalContext;
  acousticCharacteristics?: ObservedAcousticCharacteristics;
  confidence?: number;
  uncertainties?: ReadonlyArray<string>;
  provenance?: EvidenceProvenance;
}

export function createEvidenceRecord(options: CreateEvidenceRecordOptions): EvidenceRecord {
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("EvidenceRecord runId must be a non-empty string");
  }
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  const sources: ArtifactReference[] = [];
  if (options.sources) {
    for (const src of options.sources) {
      if (!isArtifactReference(src)) {
        throw new Error("Invalid ArtifactReference found in EvidenceRecord sources array");
      }
      sources.push(src);
    }
  }

  const confidence = options.confidence !== undefined ? options.confidence : 1.0;
  if (typeof confidence !== "number" || isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("EvidenceRecord confidence must be a number between 0 and 1");
  }

  const uncertainties: string[] = [];
  if (options.uncertainties) {
    for (const u of options.uncertainties) {
      if (typeof u === "string" && u.trim().length > 0) {
        uncertainties.push(u.trim());
      }
    }
  }

  const record: EvidenceRecord = {
    contractVersion: EVIDENCE_RECORD_CONTRACT_VERSION,
    evidenceId: options.evidenceId ?? generateEvidenceId(),
    runId: options.runId.trim(),
    stream: options.stream,
    createdAt,
    sources: Object.freeze(sources.map((s) => defensiveClone(s))),
    ...(options.musicalContext ? { musicalContext: defensiveClone(options.musicalContext) } : {}),
    ...(options.acousticCharacteristics ? { acousticCharacteristics: defensiveClone(options.acousticCharacteristics) } : {}),
    confidence,
    uncertainties: Object.freeze(uncertainties),
    ...(options.provenance ? { provenance: defensiveClone(options.provenance) } : {}),
  };

  return deepFreeze(record);
}

export function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.evidenceId === "string" &&
    candidate.evidenceId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    Array.isArray(candidate.sources) &&
    candidate.sources.every((s) => isArtifactReference(s)) &&
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    Array.isArray(candidate.uncertainties)
  );
}

export function createEvidenceArtifactReference(record: EvidenceRecord): ArtifactReference {
  return createArtifactReference({
    artifactId: record.evidenceId,
    artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
    contractVersion: record.contractVersion,
    producingLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
  });
}
