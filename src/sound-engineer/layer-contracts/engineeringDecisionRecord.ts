// src/sound-engineer/layer-contracts/engineeringDecisionRecord.ts
// Layer 2 Contract: EngineeringDecisionRecord (What was decided and why)

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { ArtifactReference, isArtifactReference, createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";

export const ENGINEERING_DECISION_CONTRACT_VERSION = "1.0.0" as const;

export type DecisionRecordId = string;

export function generateDecisionRecordId(): DecisionRecordId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `edr_${uuid}`;
}

export type EngineeringDecisionCategory =
  | "SIGNAL_ROUTING"
  | "PRE_GAIN_SHAPING"
  | "AMPLIFICATION"
  | "POWER_SECTION"
  | "CABINET_ACOUSTICS"
  | "TRANSDUCER_CAPTURE"
  | "POST_EQUALIZATION"
  | "DYNAMIC_PROCESSING"
  | "TIME_BASED_EFFECTS"
  | "CORRECTIVE_PROCESSING";

export interface EngineeringDecisionItem {
  readonly decisionId: string;
  readonly category: EngineeringDecisionCategory | string;
  readonly purpose: string;
  readonly intent: string;
  readonly rationale: string;
  readonly constraints: ReadonlyArray<string>;
  readonly tradeOffs?: ReadonlyArray<string>;
  readonly dependencies?: ReadonlyArray<string>;
}

/**
 * EngineeringDecisionRecord: Sound-engineering judgement about WHAT should be done and WHY.
 * Expresses musical/acoustic intent, constraints, and trade-offs.
 * Strictly decoupled from target-platform implementation details (no platform model identifiers, vendor preset schemas, or parameter values).
 */
export interface EngineeringDecisionRecord {
  readonly contractVersion: typeof ENGINEERING_DECISION_CONTRACT_VERSION | string;
  readonly decisionRecordId: DecisionRecordId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;

  /** Reference to the upstream EvidenceRecord that justified these decisions */
  readonly evidenceReference: ArtifactReference;

  /** Overall acoustic/engineering objective for this signal chain */
  readonly overallObjective: string;

  /** Specific sound-engineering decisions with purpose, intent, constraints, and rationale */
  readonly decisions: ReadonlyArray<EngineeringDecisionItem>;

  /** Overall confidence of the engineering decision plan (0.0 to 1.0) */
  readonly confidence: number;
}

export interface CreateEngineeringDecisionRecordOptions {
  decisionRecordId?: DecisionRecordId;
  runId: RunId;
  stream: ExecutionStream;
  createdAt?: string;
  evidenceReference: ArtifactReference;
  overallObjective: string;
  decisions?: ReadonlyArray<EngineeringDecisionItem>;
  confidence?: number;
}

export function createEngineeringDecisionRecord(
  options: CreateEngineeringDecisionRecordOptions
): EngineeringDecisionRecord {
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("EngineeringDecisionRecord runId must be a non-empty string");
  }
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }
  if (!isArtifactReference(options.evidenceReference)) {
    throw new Error("EngineeringDecisionRecord evidenceReference must be a valid ArtifactReference");
  }
  if (!options.overallObjective || typeof options.overallObjective !== "string" || options.overallObjective.trim().length === 0) {
    throw new Error("EngineeringDecisionRecord overallObjective must be a non-empty string");
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  const decisions: EngineeringDecisionItem[] = [];
  if (options.decisions) {
    for (const d of options.decisions) {
      if (!d.decisionId || !d.category || !d.purpose || !d.intent || !d.rationale) {
        throw new Error("Invalid EngineeringDecisionItem: missing required fields");
      }
      decisions.push({
        decisionId: d.decisionId.trim(),
        category: d.category.trim(),
        purpose: d.purpose.trim(),
        intent: d.intent.trim(),
        rationale: d.rationale.trim(),
        constraints: Object.freeze(d.constraints ? [...d.constraints] : []),
        ...(d.tradeOffs ? { tradeOffs: Object.freeze([...d.tradeOffs]) } : {}),
        ...(d.dependencies ? { dependencies: Object.freeze([...d.dependencies]) } : {}),
      });
    }
  }

  const confidence = options.confidence !== undefined ? options.confidence : 1.0;
  if (typeof confidence !== "number" || isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("EngineeringDecisionRecord confidence must be a number between 0 and 1");
  }

  const record: EngineeringDecisionRecord = {
    contractVersion: ENGINEERING_DECISION_CONTRACT_VERSION,
    decisionRecordId: options.decisionRecordId ?? generateDecisionRecordId(),
    runId: options.runId.trim(),
    stream: options.stream,
    createdAt,
    evidenceReference: defensiveClone(options.evidenceReference),
    overallObjective: options.overallObjective.trim(),
    decisions: Object.freeze(decisions.map((d) => defensiveClone(d))),
    confidence,
  };

  return deepFreeze(record);
}

export function isEngineeringDecisionRecord(value: unknown): value is EngineeringDecisionRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.decisionRecordId === "string" &&
    candidate.decisionRecordId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    isArtifactReference(candidate.evidenceReference) &&
    typeof candidate.overallObjective === "string" &&
    Array.isArray(candidate.decisions) &&
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1
  );
}

export function createDecisionArtifactReference(record: EngineeringDecisionRecord): ArtifactReference {
  return createArtifactReference({
    artifactId: record.decisionRecordId,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    contractVersion: record.contractVersion,
    producingLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
  });
}
