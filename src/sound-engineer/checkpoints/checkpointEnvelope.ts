// src/sound-engineer/checkpoints/checkpointEnvelope.ts
// Generic versioned checkpoint envelope for Sound Engineer pipeline layers

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { LayerIdentity, isLayerIdentity } from "./layerIdentity";
import {
  CheckpointStatus,
  CHECKPOINT_STATUSES,
  isCheckpointStatus,
  isTerminalCheckpointStatus,
} from "./checkpointStatus";
import { CheckpointDiagnostic, isCheckpointDiagnostic } from "./checkpointDiagnostic";
import { ArtifactReference, isArtifactReference } from "./artifactReference";

/**
 * Current version of the CheckpointEnvelope specification.
 * Following semantic versioning, completely independent from inner layer payload versions.
 */
export const CHECKPOINT_ENVELOPE_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Strongly typed Checkpoint identifier.
 * Completely independent from AT5 preset UUIDs, snapshot IDs, or gear GUIDs.
 */
export type CheckpointId = string;

/**
 * Generates an independently identifiable CheckpointId.
 *
 * @param layer Optional layer to prefix the checkpoint identifier for human-readable tracing.
 */
export function generateCheckpointId(layer?: LayerIdentity): CheckpointId {
  const prefix = layer ? `chk_${layer.toLowerCase()}` : "chk";
  let uuid: string;

  if (typeof globalThis.crypto?.randomUUID === "function") {
    uuid = globalThis.crypto.randomUUID();
  } else {
    const timestamp = Date.now().toString(36);
    const randomHex =
      Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    uuid = `${timestamp}-${randomHex}`;
  }

  return `${prefix}_${uuid}`;
}

/**
 * Generic versioned checkpoint envelope wrapping layer execution metadata,
 * lineage, diagnostics, and domain payload.
 */
export interface CheckpointEnvelope<TPayload = unknown> {
  /** Contract specification version of the envelope */
  readonly contractVersion: typeof CHECKPOINT_ENVELOPE_CONTRACT_VERSION | string;

  /** Unique checkpoint identifier */
  readonly checkpointId: CheckpointId;

  /** Bound execution run identity */
  readonly runId: RunId;

  /** Execution stream identity under which this layer ran */
  readonly stream: ExecutionStream;

  /** Architectural layer that produced this checkpoint */
  readonly layer: LayerIdentity;

  /** Execution status of the layer */
  readonly status: CheckpointStatus;

  /** ISO 8601 creation timestamp (UTC) */
  readonly createdAt: string;

  /** ISO 8601 timestamp when layer processing commenced (only once running/started) */
  readonly startedAt?: string;

  /** ISO 8601 timestamp when layer processing reached terminal status */
  readonly completedAt?: string;

  /** Processing duration in milliseconds (computed from startedAt and completedAt) */
  readonly durationMs?: number;

  /** Input artifact references consumed by this layer */
  readonly inputs: ReadonlyArray<ArtifactReference>;

  /** Optional output artifact reference produced by this layer */
  readonly output?: ArtifactReference;

  /** Diagnostics emitted during layer execution */
  readonly diagnostics: ReadonlyArray<CheckpointDiagnostic>;

  /**
   * Optional layer-specific payload.
   * Version of the payload is independent of envelope contractVersion.
   */
  readonly payload?: TPayload;
}

export interface CreateCheckpointEnvelopeOptions<TPayload = unknown> {
  /** Checkpoint ID (defaults to generated CheckpointId) */
  checkpointId?: CheckpointId;

  /** Bound run identity (required) */
  runId: RunId;

  /** Execution stream (required) */
  stream: ExecutionStream;

  /** Layer identity (required) */
  layer: LayerIdentity;

  /** Checkpoint status (required) */
  status: CheckpointStatus;

  /** Creation timestamp (defaults to current ISO string) */
  createdAt?: string;

  /** Timestamp when processing commenced */
  startedAt?: string;

  /** Timestamp when processing finished */
  completedAt?: string;

  /** Explicit duration in ms (if omitted, computed from startedAt and completedAt) */
  durationMs?: number;

  /** Consumed upstream artifact references */
  inputs?: ReadonlyArray<ArtifactReference>;

  /** Produced downstream artifact reference */
  output?: ArtifactReference;

  /** Emitted diagnostics */
  diagnostics?: ReadonlyArray<CheckpointDiagnostic>;

  /** Optional payload */
  payload?: TPayload;
}

/**
 * Factory to create an immutable CheckpointEnvelope instance.
 * Enforces strict temporal integrity (no fabricated timing for pending checkpoints)
 * and deep defensive immutability.
 */
export function createCheckpointEnvelope<TPayload = unknown>(
  options: CreateCheckpointEnvelopeOptions<TPayload>
): CheckpointEnvelope<TPayload> {
  // 1. Validate required identity fields
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("CheckpointEnvelope runId must be a non-empty string");
  }

  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }

  if (!isLayerIdentity(options.layer)) {
    throw new Error(`Invalid layer identity: "${String(options.layer)}"`);
  }

  if (!isCheckpointStatus(options.status)) {
    throw new Error(`Invalid checkpoint status: "${String(options.status)}"`);
  }

  // 2. Validate timing integrity
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  let startedAt = options.startedAt;
  let completedAt = options.completedAt;
  let durationMs = options.durationMs;

  if (options.status === CHECKPOINT_STATUSES.PENDING) {
    // Pending checkpoints MUST NOT fabricate startedAt, completedAt, or durationMs
    if (startedAt !== undefined) {
      throw new Error("Pending checkpoint must not have a startedAt timestamp");
    }
    if (completedAt !== undefined) {
      throw new Error("Pending checkpoint must not have a completedAt timestamp");
    }
    if (durationMs !== undefined) {
      throw new Error("Pending checkpoint must not have a durationMs value");
    }
  } else if (options.status === CHECKPOINT_STATUSES.RUNNING) {
    if (!startedAt) {
      startedAt = new Date().toISOString();
    }
    if (completedAt !== undefined) {
      throw new Error("Running checkpoint must not have a completedAt timestamp");
    }
    if (durationMs !== undefined) {
      throw new Error("Running checkpoint must not have a durationMs value");
    }
  } else if (isTerminalCheckpointStatus(options.status)) {
    if (startedAt && completedAt) {
      const startMs = Date.parse(startedAt);
      const endMs = Date.parse(completedAt);
      if (isNaN(startMs) || isNaN(endMs)) {
        throw new Error("Invalid startedAt or completedAt timestamp string");
      }
      if (durationMs === undefined) {
        durationMs = Math.max(0, endMs - startMs);
      }
    }
  }

  // 3. Validate lineage & diagnostics
  const inputs: ArtifactReference[] = [];
  if (options.inputs) {
    for (const input of options.inputs) {
      if (!isArtifactReference(input)) {
        throw new Error("Invalid ArtifactReference found in inputs array");
      }
      inputs.push(input);
    }
  }

  if (options.output !== undefined && !isArtifactReference(options.output)) {
    throw new Error("Invalid output ArtifactReference provided");
  }

  const diagnostics: CheckpointDiagnostic[] = [];
  if (options.diagnostics) {
    for (const diag of options.diagnostics) {
      if (!isCheckpointDiagnostic(diag)) {
        throw new Error("Invalid CheckpointDiagnostic found in diagnostics array");
      }
      diagnostics.push(diag);
    }
  }

  // 4. Construct pristine, deeply frozen envelope
  const envelope: CheckpointEnvelope<TPayload> = {
    contractVersion: CHECKPOINT_ENVELOPE_CONTRACT_VERSION,
    checkpointId: options.checkpointId ?? generateCheckpointId(options.layer),
    runId: options.runId.trim(),
    stream: options.stream,
    layer: options.layer,
    status: options.status,
    createdAt,
    ...(startedAt ? { startedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    inputs: Object.freeze(inputs.map((item) => defensiveClone(item))),
    ...(options.output ? { output: defensiveClone(options.output) } : {}),
    diagnostics: Object.freeze(diagnostics.map((item) => defensiveClone(item))),
    ...(options.payload !== undefined ? { payload: defensiveClone(options.payload) } : {}),
  };

  return deepFreeze(envelope);
}

/**
 * Type guard to validate whether an unknown value conforms to the CheckpointEnvelope contract.
 */
export function isCheckpointEnvelope(value: unknown): value is CheckpointEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.checkpointId === "string" &&
    candidate.checkpointId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    isLayerIdentity(candidate.layer) &&
    isCheckpointStatus(candidate.status) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    (candidate.startedAt === undefined ||
      (typeof candidate.startedAt === "string" && !isNaN(Date.parse(candidate.startedAt)))) &&
    (candidate.completedAt === undefined ||
      (typeof candidate.completedAt === "string" && !isNaN(Date.parse(candidate.completedAt)))) &&
    (candidate.durationMs === undefined ||
      (typeof candidate.durationMs === "number" && candidate.durationMs >= 0)) &&
    Array.isArray(candidate.inputs) &&
    candidate.inputs.every((item) => isArtifactReference(item)) &&
    (candidate.output === undefined || isArtifactReference(candidate.output)) &&
    Array.isArray(candidate.diagnostics) &&
    candidate.diagnostics.every((item) => isCheckpointDiagnostic(item))
  );
}

/**
 * Validation helper returning a structured report of any contract violations.
 */
export function validateCheckpointEnvelope(envelope: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!envelope || typeof envelope !== "object") {
    return { valid: false, errors: ["Envelope must be a non-null object"] };
  }

  const c = envelope as Record<string, unknown>;

  if (typeof c.contractVersion !== "string" || !c.contractVersion) {
    errors.push("Missing or invalid contractVersion");
  }
  if (typeof c.checkpointId !== "string" || !c.checkpointId) {
    errors.push("Missing or invalid checkpointId");
  }
  if (typeof c.runId !== "string" || !c.runId) {
    errors.push("Missing or invalid runId");
  }
  if (!isExecutionStream(c.stream)) {
    errors.push(`Invalid stream: "${String(c.stream)}"`);
  }
  if (!isLayerIdentity(c.layer)) {
    errors.push(`Invalid layer: "${String(c.layer)}"`);
  }
  if (!isCheckpointStatus(c.status)) {
    errors.push(`Invalid status: "${String(c.status)}"`);
  }
  if (typeof c.createdAt !== "string" || isNaN(Date.parse(c.createdAt))) {
    errors.push("Invalid createdAt timestamp");
  }

  if (c.status === CHECKPOINT_STATUSES.PENDING) {
    if (c.startedAt !== undefined) errors.push("Pending checkpoint must not have startedAt");
    if (c.completedAt !== undefined) errors.push("Pending checkpoint must not have completedAt");
    if (c.durationMs !== undefined) errors.push("Pending checkpoint must not have durationMs");
  }

  if (c.status === CHECKPOINT_STATUSES.RUNNING && c.completedAt !== undefined) {
    errors.push("Running checkpoint must not have completedAt");
  }

  if (!Array.isArray(c.inputs)) {
    errors.push("inputs must be an array");
  } else {
    c.inputs.forEach((item, idx) => {
      if (!isArtifactReference(item)) {
        errors.push(`inputs[${idx}] is not a valid ArtifactReference`);
      }
    });
  }

  if (c.output !== undefined && !isArtifactReference(c.output)) {
    errors.push("output is not a valid ArtifactReference");
  }

  if (!Array.isArray(c.diagnostics)) {
    errors.push("diagnostics must be an array");
  } else {
    c.diagnostics.forEach((diag, idx) => {
      if (!isCheckpointDiagnostic(diag)) {
        errors.push(`diagnostics[${idx}] is not a valid CheckpointDiagnostic`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
