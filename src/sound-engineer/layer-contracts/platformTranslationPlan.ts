// src/sound-engineer/layer-contracts/platformTranslationPlan.ts
// Layer 5 Contract: PlatformTranslationPlan (How a specific target platform will realise the intent)

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { ArtifactReference, isArtifactReference, createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";

export const PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION = "1.0.0" as const;

export type PlanId = string;

export function generatePlanId(): PlanId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `ptp_${uuid}`;
}

export type PlatformFormatFamily = "DAW_PLUGIN" | "STANDALONE_MODELER" | "HARDWARE_DSP" | "HYBRID";

export interface TargetPlatformIdentity {
  readonly platformName: string; // e.g. "IK_MULTIMEDIA_AMPLITUBE_5", "NEURAL_DSP_QUAD_CORTEX", "LINE6_HELIX"
  readonly platformVersion?: string;
  readonly formatFamily: PlatformFormatFamily | string;
}

export interface PlatformDeviceMapping {
  readonly targetDeviceId: string;
  readonly targetDeviceName: string;
  readonly deviceCategory: string; // e.g. "amp", "stomp", "cab", "rack", "ir"
  readonly platformSpecificParameters?: Readonly<Record<string, unknown>>;
}

export interface PlatformTranslationItem {
  readonly stageId: string;
  readonly semanticRole: string;
  readonly mappingDecision: PlatformDeviceMapping;
  readonly rationale: string;
  readonly confidence: number;
}

export interface PlatformSubstitution {
  readonly stageId: string;
  readonly requestedSemanticRole: string;
  readonly substitutedDeviceName: string;
  readonly substitutionReason: string;
}

export interface UnresolvedMapping {
  readonly stageId: string;
  readonly semanticRequirement: string;
  readonly limitationReason: string;
}

/**
 * PlatformTranslationPlan: Maps a validated SemanticToneDesign into concrete,
 * target-platform-specific devices, routing configurations, and parameter recipes.
 * Explicitly permitted to contain platform-specific implementation data, while remaining
 * capable of targeting multiple distinct platforms (e.g. AT5, Quad Cortex, Helix).
 */
export interface PlatformTranslationPlan {
  readonly contractVersion: typeof PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION | string;
  readonly planId: PlanId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;

  /** Reference to the upstream SemanticToneDesign being translated */
  readonly semanticDesignReference: ArtifactReference;

  /** Optional reference to the ValidationReport that approved execution */
  readonly validationReportReference?: ArtifactReference;

  /** Target platform specification */
  readonly targetPlatform: TargetPlatformIdentity;

  /** Concrete mapping decisions for each semantic stage */
  readonly translationDecisions: ReadonlyArray<PlatformTranslationItem>;

  /** Substitutions made where exact semantic matches were unavailable */
  readonly substitutions: ReadonlyArray<PlatformSubstitution>;

  /** Requirements that could not be resolved due to platform limitations */
  readonly unresolvedMappings: ReadonlyArray<UnresolvedMapping>;

  /** Documented platform constraints or hardware limitations */
  readonly capabilityLimitations: ReadonlyArray<string>;

  /** Translation-specific warnings */
  readonly warnings: ReadonlyArray<string>;

  /** Overall confidence in the platform realization (0.0 to 1.0) */
  readonly translationConfidence: number;
}

export interface CreatePlatformTranslationPlanOptions {
  planId?: PlanId;
  runId: RunId;
  stream: ExecutionStream;
  createdAt?: string;
  semanticDesignReference: ArtifactReference;
  validationReportReference?: ArtifactReference;
  targetPlatform: TargetPlatformIdentity;
  translationDecisions?: ReadonlyArray<PlatformTranslationItem>;
  substitutions?: ReadonlyArray<PlatformSubstitution>;
  unresolvedMappings?: ReadonlyArray<UnresolvedMapping>;
  capabilityLimitations?: ReadonlyArray<string>;
  warnings?: ReadonlyArray<string>;
  translationConfidence?: number;
}

export function createPlatformTranslationPlan(
  options: CreatePlatformTranslationPlanOptions
): PlatformTranslationPlan {
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("PlatformTranslationPlan runId must be a non-empty string");
  }
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }
  if (!isArtifactReference(options.semanticDesignReference)) {
    throw new Error("PlatformTranslationPlan semanticDesignReference must be a valid ArtifactReference");
  }
  if (
    options.validationReportReference !== undefined &&
    !isArtifactReference(options.validationReportReference)
  ) {
    throw new Error("PlatformTranslationPlan validationReportReference must be a valid ArtifactReference");
  }
  if (
    !options.targetPlatform ||
    !options.targetPlatform.platformName ||
    !options.targetPlatform.formatFamily
  ) {
    throw new Error("PlatformTranslationPlan targetPlatform must specify platformName and formatFamily");
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  const translationDecisions: PlatformTranslationItem[] = [];
  if (options.translationDecisions) {
    for (const item of options.translationDecisions) {
      if (!item.stageId || !item.semanticRole || !item.mappingDecision) {
        throw new Error("Invalid PlatformTranslationItem: missing required fields");
      }
      translationDecisions.push({
        stageId: item.stageId.trim(),
        semanticRole: item.semanticRole.trim(),
        mappingDecision: defensiveClone(item.mappingDecision),
        rationale: item.rationale ? item.rationale.trim() : "",
        confidence: item.confidence !== undefined ? item.confidence : 1.0,
      });
    }
  }

  const substitutions: PlatformSubstitution[] = [];
  if (options.substitutions) {
    for (const sub of options.substitutions) {
      substitutions.push(defensiveClone(sub));
    }
  }

  const unresolvedMappings: UnresolvedMapping[] = [];
  if (options.unresolvedMappings) {
    for (const unres of options.unresolvedMappings) {
      unresolvedMappings.push(defensiveClone(unres));
    }
  }

  const capabilityLimitations = options.capabilityLimitations ? [...options.capabilityLimitations] : [];
  const warnings = options.warnings ? [...options.warnings] : [];

  const translationConfidence =
    options.translationConfidence !== undefined ? options.translationConfidence : 1.0;

  const plan: PlatformTranslationPlan = {
    contractVersion: PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION,
    planId: options.planId ?? generatePlanId(),
    runId: options.runId.trim(),
    stream: options.stream,
    createdAt,
    semanticDesignReference: defensiveClone(options.semanticDesignReference),
    ...(options.validationReportReference
      ? { validationReportReference: defensiveClone(options.validationReportReference) }
      : {}),
    targetPlatform: defensiveClone(options.targetPlatform),
    translationDecisions: Object.freeze(translationDecisions.map((td) => defensiveClone(td))),
    substitutions: Object.freeze(substitutions),
    unresolvedMappings: Object.freeze(unresolvedMappings),
    capabilityLimitations: Object.freeze(capabilityLimitations),
    warnings: Object.freeze(warnings),
    translationConfidence,
  };

  return deepFreeze(plan);
}

export function isPlatformTranslationPlan(value: unknown): value is PlatformTranslationPlan {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.planId === "string" &&
    candidate.planId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    isArtifactReference(candidate.semanticDesignReference) &&
    (candidate.validationReportReference === undefined || isArtifactReference(candidate.validationReportReference)) &&
    typeof candidate.targetPlatform === "object" &&
    candidate.targetPlatform !== null &&
    Array.isArray(candidate.translationDecisions) &&
    Array.isArray(candidate.substitutions) &&
    Array.isArray(candidate.unresolvedMappings) &&
    Array.isArray(candidate.capabilityLimitations) &&
    Array.isArray(candidate.warnings) &&
    typeof candidate.translationConfidence === "number"
  );
}

export function createPlatformTranslationArtifactReference(plan: PlatformTranslationPlan): ArtifactReference {
  return createArtifactReference({
    artifactId: plan.planId,
    artifactType: ARTIFACT_TYPES.PLATFORM_TRANSLATION_PLAN,
    contractVersion: plan.contractVersion,
    producingLayer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
  });
}
