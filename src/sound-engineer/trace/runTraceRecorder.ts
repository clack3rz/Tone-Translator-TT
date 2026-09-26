// src/sound-engineer/trace/runTraceRecorder.ts
// Controlled recorder and query store for Sound Engineer run-level traces

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { CheckpointEnvelope, isCheckpointEnvelope } from "../checkpoints/checkpointEnvelope";
import { LayerIdentity } from "../checkpoints/layerIdentity";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import {
  RunTrace,
  TraceId,
  generateTraceId,
  RUN_TRACE_CONTRACT_VERSION,
  TraceCheckpointEntry,
  TraceDiagnosticEntry,
  TraceLineageEntry,
  TraceLifecycleStatus,
  deriveTraceStatus,
  computeDiagnosticSummary,
  computeTimingSummary,
  computeLineageSummary,
} from "./runTrace";

export interface CreateRunTraceRecorderOptions {
  runId: RunId;
  stream: ExecutionStream;
  traceId?: TraceId;
  createdAt?: string;
}

/**
 * Controlled in-memory builder and query store for a single Sound Engineer execution run trace.
 * Protects history against mutation, rejects cross-run contamination, and provides
 * immutable public snapshots.
 */
export class RunTraceRecorder {
  private readonly _traceId: TraceId;
  private readonly _runId: RunId;
  private readonly _stream: ExecutionStream;
  private readonly _createdAt: string;
  private _updatedAt: string;

  /** Internal ordered sequence of recorded checkpoint entries */
  private readonly _entries: TraceCheckpointEntry[] = [];

  /** Set of checkpoint IDs already recorded in this trace */
  private readonly _checkpointIdSet = new Set<string>();

  constructor(options: CreateRunTraceRecorderOptions) {
    if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
      throw new Error("RunTraceRecorder runId must be a non-empty string");
    }
    if (!isExecutionStream(options.stream)) {
      throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
    }

    const createdAt = options.createdAt ?? new Date().toISOString();
    if (isNaN(Date.parse(createdAt))) {
      throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
    }

    this._traceId = options.traceId ?? generateTraceId();
    this._runId = options.runId.trim();
    this._stream = options.stream;
    this._createdAt = createdAt;
    this._updatedAt = createdAt;
  }

  public get traceId(): TraceId {
    return this._traceId;
  }

  public get runId(): RunId {
    return this._runId;
  }

  public get stream(): ExecutionStream {
    return this._stream;
  }

  public get createdAt(): string {
    return this._createdAt;
  }

  public get updatedAt(): string {
    return this._updatedAt;
  }

  /**
   * Appends an immutable CheckpointEnvelope to the trace.
   *
   * Enforces strict validation:
   * - Must be a valid CheckpointEnvelope.
   * - runId MUST match the trace runId.
   * - stream MUST match the trace stream.
   * - checkpointId MUST NOT already exist in this trace.
   */
  public recordCheckpoint(checkpoint: CheckpointEnvelope<unknown>): TraceCheckpointEntry {
    if (!isCheckpointEnvelope(checkpoint)) {
      throw new Error("Cannot record invalid CheckpointEnvelope into RunTrace");
    }

    if (checkpoint.runId !== this._runId) {
      throw new Error(
        `Cross-run checkpoint rejected: checkpoint runId "${checkpoint.runId}" does not match trace runId "${this._runId}"`
      );
    }

    if (checkpoint.stream !== this._stream) {
      throw new Error(
        `Cross-stream checkpoint rejected: checkpoint stream "${checkpoint.stream}" does not match trace stream "${this._stream}"`
      );
    }

    if (this._checkpointIdSet.has(checkpoint.checkpointId)) {
      throw new Error(
        `Duplicate checkpointId rejected: "${checkpoint.checkpointId}" is already recorded in this trace`
      );
    }

    const sequenceIndex = this._entries.length;
    const recordedAt = new Date().toISOString();

    const entry: TraceCheckpointEntry = deepFreeze({
      sequenceIndex,
      recordedAt,
      checkpoint: defensiveClone(checkpoint),
    });

    this._entries.push(entry);
    this._checkpointIdSet.add(checkpoint.checkpointId);
    this._updatedAt = recordedAt;

    return entry;
  }

  /**
   * Returns a deeply frozen, immutable RunTrace snapshot representing the current execution history.
   */
  public getTraceSnapshot(): RunTrace {
    const status = deriveTraceStatus(this._entries);
    const diagnostics = computeDiagnosticSummary(this._entries);
    const timing = computeTimingSummary(this._entries);
    const lineage = computeLineageSummary(this._entries);

    const snapshot: RunTrace = {
      contractVersion: RUN_TRACE_CONTRACT_VERSION,
      traceId: this._traceId,
      runId: this._runId,
      stream: this._stream,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      status,
      checkpointCount: this._entries.length,
      checkpoints: Object.freeze(this._entries.map((e) => defensiveClone(e))),
      diagnostics: defensiveClone(diagnostics),
      timing: defensiveClone(timing),
      lineage: defensiveClone(lineage),
    };

    return deepFreeze(snapshot);
  }

  /**
   * Returns all recorded checkpoints in chronological sequence order.
   */
  public getCheckpoints(): ReadonlyArray<CheckpointEnvelope<unknown>> {
    return Object.freeze(this._entries.map((e) => defensiveClone(e.checkpoint)));
  }

  /**
   * Returns all recorded checkpoints for a specific layer.
   * Useful when a layer ran multiple iterations or retries.
   */
  public getCheckpointsByLayer(layer: LayerIdentity): ReadonlyArray<CheckpointEnvelope<unknown>> {
    return Object.freeze(
      this._entries
        .filter((e) => e.checkpoint.layer === layer)
        .map((e) => defensiveClone(e.checkpoint))
    );
  }

  /**
   * Finds a specific checkpoint by its checkpointId.
   */
  public getCheckpointById(checkpointId: string): CheckpointEnvelope<unknown> | undefined {
    const entry = this._entries.find((e) => e.checkpoint.checkpointId === checkpointId);
    return entry ? defensiveClone(entry.checkpoint) : undefined;
  }

  /**
   * Returns all diagnostics across all checkpoints, retaining layer and sequence attribution.
   */
  public getDiagnostics(): ReadonlyArray<TraceDiagnosticEntry> {
    return computeDiagnosticSummary(this._entries).diagnostics;
  }

  /**
   * Returns the lineage step entries across the trace.
   */
  public getArtifactLineage(): ReadonlyArray<TraceLineageEntry> {
    return computeLineageSummary(this._entries);
  }

  /**
   * Returns the count of recorded checkpoints.
   */
  public getEntryCount(): number {
    return this._entries.length;
  }

  /**
   * Returns the current derived lifecycle status of the trace.
   */
  public getStatus(): TraceLifecycleStatus {
    return deriveTraceStatus(this._entries);
  }
}

/**
 * Factory to create an isolated RunTraceRecorder instance.
 */
export function createRunTraceRecorder(options: CreateRunTraceRecorderOptions): RunTraceRecorder {
  return new RunTraceRecorder(options);
}
