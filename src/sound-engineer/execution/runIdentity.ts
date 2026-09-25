// src/sound-engineer/execution/runIdentity.ts
// Platform-independent run identity and metadata contract for Sound Engineer execution

import { ExecutionStream, isExecutionStream, EXECUTION_STREAMS } from "./streamIdentity";
import { RunLifecycleStatus, RUN_LIFECYCLE_STATUSES, isRunLifecycleStatus } from "./runLifecycle";

/**
 * Current version of the RunMetadata contract specification.
 * Following semantic versioning for architectural checkpointing.
 */
export const RUN_METADATA_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Strongly typed run identifier.
 * Completely decoupled from AT5 preset UUIDs or platform-specific GUIDs.
 */
export type RunId = string;

/**
 * Core metadata envelope identifying every execution run in Tone Translator.
 * Designed to be extensible without breaking backwards compatibility.
 */
export interface RunMetadata {
  /** Explicit version of the run metadata specification */
  readonly contractVersion: typeof RUN_METADATA_CONTRACT_VERSION | string;

  /** Globally unique execution run identifier */
  readonly runId: RunId;

  /** Execution stream identity under which this run was dispatched */
  readonly stream: ExecutionStream;

  /** ISO 8601 creation timestamp (UTC) */
  readonly createdAt: string;

  /** Current lifecycle status of the run */
  readonly status: RunLifecycleStatus;

  /**
   * Optional parent or correlated run identifier.
   * Used when a SHADOW or DEV run is spawned to observe or compare against an authoritative CURRENT run.
   */
  readonly parentRunId?: RunId;

  /**
   * Extensible metadata dictionary for future context tags without breaking the contract.
   */
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Generates an independently identifiable RunId using the environment's native crypto API.
 * Uses Web Crypto API (crypto.randomUUID) supported across modern browsers and Node.js runtimes,
 * with a resilient fallback if running in constrained sandbox environments.
 *
 * @param stream Optional stream prefix to make the runId human-readable during debugging.
 */
export function generateRunId(stream?: ExecutionStream): RunId {
  const prefix = stream ? `${stream.toLowerCase()}_run` : "run";
  let uuid: string;

  if (typeof globalThis.crypto?.randomUUID === "function") {
    uuid = globalThis.crypto.randomUUID();
  } else {
    // Resilient fallback for environments without randomUUID
    const timestamp = Date.now().toString(36);
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    uuid = `${timestamp}-${randomHex}`;
  }

  return `${prefix}_${uuid}`;
}

export interface CreateRunMetadataOptions {
  /** The execution stream for this run (required) */
  stream: ExecutionStream;

  /** Optional explicit runId (defaults to a newly generated unique RunId) */
  runId?: RunId;

  /** Optional explicit creation timestamp (defaults to current ISO string) */
  createdAt?: string;

  /** Optional initial lifecycle status (defaults to 'created') */
  status?: RunLifecycleStatus;

  /** Optional parent runId when correlating parallel or shadow executions */
  parentRunId?: RunId;

  /** Optional key-value tags for future extensibility */
  tags?: Record<string, string>;
}

/**
 * Factory function to create a pristine, immutable RunMetadata instance conforming to RUN_METADATA_CONTRACT_VERSION.
 */
export function createRunMetadata(options: CreateRunMetadataOptions): RunMetadata {
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}". Expected one of: ${Object.values(EXECUTION_STREAMS).join(", ")}`);
  }

  const status = options.status ?? RUN_LIFECYCLE_STATUSES.CREATED;
  if (!isRunLifecycleStatus(status)) {
    throw new Error(`Invalid run lifecycle status: "${String(status)}". Expected one of: ${Object.values(RUN_LIFECYCLE_STATUSES).join(", ")}`);
  }

  return Object.freeze({
    contractVersion: RUN_METADATA_CONTRACT_VERSION,
    runId: options.runId ?? generateRunId(options.stream),
    stream: options.stream,
    createdAt: options.createdAt ?? new Date().toISOString(),
    status,
    ...(options.parentRunId ? { parentRunId: options.parentRunId } : {}),
    ...(options.tags ? { tags: Object.freeze({ ...options.tags }) } : {}),
  });
}

/**
 * Type guard to validate whether an unknown object conforms to the RunMetadata contract.
 */
export function isRunMetadata(value: unknown): value is RunMetadata {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    isRunLifecycleStatus(candidate.status) &&
    (candidate.parentRunId === undefined || typeof candidate.parentRunId === "string") &&
    (candidate.tags === undefined || (typeof candidate.tags === "object" && candidate.tags !== null))
  );
}
