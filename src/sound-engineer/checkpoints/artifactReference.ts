// src/sound-engineer/checkpoints/artifactReference.ts
// Lightweight typed lineage references to upstream and downstream artifacts

import { deepFreeze } from "../contracts/immutability";
import { LayerIdentity, isLayerIdentity } from "./layerIdentity";

/**
 * Standard typed vocabulary of Sound Engineer pipeline artifacts.
 * Extensible for future domain models while maintaining architectural stability.
 */
export const ARTIFACT_TYPES = {
  /** Immutable snapshot of ingested user prompt, YouTube metadata, audio descriptors, and preset files */
  INPUT_SNAPSHOT: "InputSnapshot",

  /** Synthesized audio and musical evidence extracted from references */
  EVIDENCE_RECORD: "EvidenceRecord",

  /** Architectural tone decisions and gear selection rationale */
  ENGINEERING_DECISION_RECORD: "EngineeringDecisionRecord",

  /** High-level semantic topology and aesthetic specifications */
  SEMANTIC_TONE_DESIGN: "SemanticToneDesign",

  /** Pre-flight acoustic, routing, and physical limitation validation findings */
  VALIDATION_REPORT: "ValidationReport",

  /** Concrete target platform parameter translation and routing instructions */
  PLATFORM_TRANSLATION_PLAN: "PlatformTranslationPlan",

  /** Final serialized export package or preset bundle */
  EXPORT_PACKAGE: "ExportPackage",

  /** Generic or custom intermediate artifact */
  CUSTOM: "CustomArtifact",
} as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[keyof typeof ARTIFACT_TYPES] | string;

/**
 * Lightweight reference identifying an artifact without embedding its full payload.
 * Preserves lineage across layer boundaries without memory bloat or mutation risks.
 */
export interface ArtifactReference {
  /** Unique identifier of the referenced artifact (e.g. snapshotId, recordId) */
  readonly artifactId: string;

  /** Canonical type classification of the artifact */
  readonly artifactType: ArtifactType;

  /** Semantic contract version of the referenced artifact payload (e.g. "1.0.0") */
  readonly contractVersion: string;

  /** Optional originating layer that generated this artifact */
  readonly producingLayer?: LayerIdentity;
}

export interface CreateArtifactReferenceOptions {
  artifactId: string;
  artifactType: ArtifactType;
  contractVersion: string;
  producingLayer?: LayerIdentity;
}

/**
 * Factory to create an immutable ArtifactReference.
 */
export function createArtifactReference(
  options: CreateArtifactReferenceOptions
): ArtifactReference {
  if (!options.artifactId || typeof options.artifactId !== "string" || options.artifactId.trim().length === 0) {
    throw new Error("ArtifactReference artifactId must be a non-empty string");
  }

  if (!options.artifactType || typeof options.artifactType !== "string" || options.artifactType.trim().length === 0) {
    throw new Error("ArtifactReference artifactType must be a non-empty string");
  }

  if (
    !options.contractVersion ||
    typeof options.contractVersion !== "string" ||
    options.contractVersion.trim().length === 0
  ) {
    throw new Error("ArtifactReference contractVersion must be a non-empty string");
  }

  if (options.producingLayer !== undefined && !isLayerIdentity(options.producingLayer)) {
    throw new Error(`Invalid producingLayer: "${String(options.producingLayer)}"`);
  }

  const ref: ArtifactReference = {
    artifactId: options.artifactId.trim(),
    artifactType: options.artifactType.trim(),
    contractVersion: options.contractVersion.trim(),
    ...(options.producingLayer ? { producingLayer: options.producingLayer } : {}),
  };

  return deepFreeze(ref);
}

/**
 * Type guard for ArtifactReference.
 */
export function isArtifactReference(value: unknown): value is ArtifactReference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.artifactId === "string" &&
    candidate.artifactId.length > 0 &&
    typeof candidate.artifactType === "string" &&
    candidate.artifactType.length > 0 &&
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    (candidate.producingLayer === undefined || isLayerIdentity(candidate.producingLayer))
  );
}
