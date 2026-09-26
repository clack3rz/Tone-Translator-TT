// src/sound-engineer/layer-contracts/semanticToneDesign.ts
// Layer 3 Contract: SemanticToneDesign (Platform-independent executable intent)

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { ArtifactReference, isArtifactReference, createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";

export const SEMANTIC_TONE_DESIGN_CONTRACT_VERSION = "1.0.0" as const;

export type DesignId = string;

export function generateDesignId(): DesignId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `std_${uuid}`;
}

export type RoutingTopologyType = "SERIES" | "PARALLEL_SPLIT" | "DUAL_MONO" | "COMPLEX_BRANCH";

export interface SemanticTopology {
  readonly routingType: RoutingTopologyType | string;
  readonly branchCount?: number;
  readonly description?: string;
}

export interface SemanticFrequencyStrategy {
  readonly lowCutHz?: number;
  readonly highCutHz?: number;
  readonly emphasisBands?: ReadonlyArray<{
    readonly centerHz: number;
    readonly relativeGainDb: number;
    readonly qFactor?: number;
  }>;
}

export interface SemanticGainStrategy {
  readonly headroomProfile: string; // e.g. "HIGH_HEADROOM", "EDGE_OF_BREAKUP", "SATURATED_CRUNCH", "HIGH_GAIN_LEAD"
  readonly saturationHarmonics?: string; // e.g. "EVEN_DOMINANT", "ODD_DOMINANT", "SYMMETRICAL_BALANCED"
  readonly driveAmountPercent?: number; // 0 - 100 normalized
}

export interface SemanticDynamicsStrategy {
  readonly dynamicControlRole?: string; // e.g. "TRANSIENT_LIMITING", "SUSTAIN_LEVELING", "PARALLEL_PUNCH"
  readonly attackProfile?: string; // e.g. "FAST", "MEDIUM", "SLOW"
  readonly releaseProfile?: string; // e.g. "FAST", "MEDIUM", "SLOW", "AUTO"
}

export interface SemanticCabinetStrategy {
  readonly enclosureType?: string; // e.g. "4x12_CLOSED_BACK", "2x12_OPEN_BACK", "1x12_COMBO"
  readonly speakerCharacter?: string; // e.g. "BRITISH_VINTAGE_WARM", "AMERICAN_SCOOPED_PUNCH", "MODERN_HIGH_POWER"
  readonly dispersionPattern?: string; // e.g. "FOCUSED_BEAM", "WIDE_DISPERSION"
}

export interface SemanticCaptureStrategy {
  readonly primaryTransducer?: string; // e.g. "DYNAMIC_MOVING_COIL", "LARGE_DIAPHRAGM_CONDENSER", "RIBBON_VELOCITY"
  readonly secondaryTransducer?: string;
  readonly capturePlacementRole?: string; // e.g. "ON_AXIS_DIRECT_PUNCH", "EDGE_WARMTH_ROLLOFF", "DIFFUSE_ROOM_REFLECTIONS"
  readonly distanceProfile?: string; // e.g. "CLOSE_BAFFLE", "MEDIUM_DISTANCE", "ROOM_FAR"
}

export interface SemanticAmbienceStrategy {
  readonly spaceType?: string; // e.g. "DRY_ISOLATION_BOOTH", "STUDIO_LIVE_ROOM", "PLATE_REVERB", "SPRING_TANK"
  readonly wetDryRatioPercent?: number; // 0 - 100
  readonly decayTimeMs?: number;
}

export interface SemanticProcessingStage {
  readonly stageId: string;
  readonly stageIndex: number;
  readonly role: string; // e.g. "PRE_FILTER", "PRE_OVERDRIVE", "PREAMP", "POWER_AMP", "CABINET_IMPULSE", "MICROPHONE_CAPTURE", "POST_EQUALIZATION"
  readonly designIntent: string;
  readonly frequencyStrategy?: SemanticFrequencyStrategy;
  readonly gainStrategy?: SemanticGainStrategy;
  readonly dynamicsStrategy?: SemanticDynamicsStrategy;
  readonly cabinetStrategy?: SemanticCabinetStrategy;
  readonly captureStrategy?: SemanticCaptureStrategy;
  readonly ambienceStrategy?: SemanticAmbienceStrategy;
  readonly constraints: ReadonlyArray<string>;
}

/**
 * SemanticToneDesign: Stable, platform-independent structured representation
 * of the sound engineering design. Executable by multiple target platforms.
 * Strictly decoupled from target-platform implementation details (no platform model identifiers, vendor preset schemas, or parameter values).
 */
export interface SemanticToneDesign {
  readonly contractVersion: typeof SEMANTIC_TONE_DESIGN_CONTRACT_VERSION | string;
  readonly designId: DesignId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;

  /** Reference to upstream EngineeringDecisionRecord */
  readonly decisionRecordReference: ArtifactReference;

  /** Overall routing topology */
  readonly topology: SemanticTopology;

  /** Ordered or routed processing stages */
  readonly stages: ReadonlyArray<SemanticProcessingStage>;

  /** Overall design constraints */
  readonly constraints: ReadonlyArray<string>;
}

export interface CreateSemanticToneDesignOptions {
  designId?: DesignId;
  runId: RunId;
  stream: ExecutionStream;
  createdAt?: string;
  decisionRecordReference: ArtifactReference;
  topology: SemanticTopology;
  stages: ReadonlyArray<SemanticProcessingStage>;
  constraints?: ReadonlyArray<string>;
}

export function createSemanticToneDesign(options: CreateSemanticToneDesignOptions): SemanticToneDesign {
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("SemanticToneDesign runId must be a non-empty string");
  }
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }
  if (!isArtifactReference(options.decisionRecordReference)) {
    throw new Error("SemanticToneDesign decisionRecordReference must be a valid ArtifactReference");
  }
  if (!options.topology || !options.topology.routingType) {
    throw new Error("SemanticToneDesign topology must specify routingType");
  }
  if (!Array.isArray(options.stages) || options.stages.length === 0) {
    throw new Error("SemanticToneDesign must have at least one stage");
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  const stages: SemanticProcessingStage[] = [];
  for (const s of options.stages) {
    if (!s.stageId || typeof s.stageIndex !== "number" || !s.role || !s.designIntent) {
      throw new Error("Invalid SemanticProcessingStage: missing required fields");
    }
    stages.push({
      stageId: s.stageId.trim(),
      stageIndex: s.stageIndex,
      role: s.role.trim(),
      designIntent: s.designIntent.trim(),
      ...(s.frequencyStrategy ? { frequencyStrategy: defensiveClone(s.frequencyStrategy) } : {}),
      ...(s.gainStrategy ? { gainStrategy: defensiveClone(s.gainStrategy) } : {}),
      ...(s.dynamicsStrategy ? { dynamicsStrategy: defensiveClone(s.dynamicsStrategy) } : {}),
      ...(s.cabinetStrategy ? { cabinetStrategy: defensiveClone(s.cabinetStrategy) } : {}),
      ...(s.captureStrategy ? { captureStrategy: defensiveClone(s.captureStrategy) } : {}),
      ...(s.ambienceStrategy ? { ambienceStrategy: defensiveClone(s.ambienceStrategy) } : {}),
      constraints: Object.freeze(s.constraints ? [...s.constraints] : []),
    });
  }

  const constraints = options.constraints ? [...options.constraints] : [];

  const design: SemanticToneDesign = {
    contractVersion: SEMANTIC_TONE_DESIGN_CONTRACT_VERSION,
    designId: options.designId ?? generateDesignId(),
    runId: options.runId.trim(),
    stream: options.stream,
    createdAt,
    decisionRecordReference: defensiveClone(options.decisionRecordReference),
    topology: defensiveClone(options.topology),
    stages: Object.freeze(stages.map((stg) => defensiveClone(stg))),
    constraints: Object.freeze(constraints),
  };

  return deepFreeze(design);
}

export function isSemanticToneDesign(value: unknown): value is SemanticToneDesign {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.designId === "string" &&
    candidate.designId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    isArtifactReference(candidate.decisionRecordReference) &&
    typeof candidate.topology === "object" &&
    candidate.topology !== null &&
    Array.isArray(candidate.stages) &&
    candidate.stages.length > 0 &&
    Array.isArray(candidate.constraints)
  );
}

export function createSemanticDesignArtifactReference(design: SemanticToneDesign): ArtifactReference {
  return createArtifactReference({
    artifactId: design.designId,
    artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
    contractVersion: design.contractVersion,
    producingLayer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
  });
}
