// src/sound-engineer/trace/runTrace.ts
// RunTrace contract and observability aggregation types for Sound Engineer pipeline

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { CheckpointEnvelope, CheckpointId } from "../checkpoints/checkpointEnvelope";
import { CheckpointDiagnostic } from "../checkpoints/checkpointDiagnostic";
import { ArtifactReference } from "../checkpoints/artifactReference";
import { LayerIdentity } from "../checkpoints/layerIdentity";
import { CHECKPOINT_STATUSES, isTerminalCheckpointStatus } from "../checkpoints/checkpointStatus";

export const RUN_TRACE_CONTRACT_VERSION = "1.0.0" as const;

export type TraceId = string;

export function generateTraceId(): TraceId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `trc_${uuid}`;
}

export const TRACE_LIFECYCLE_STATUSES = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  WARNING: "WARNING",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type TraceLifecycleStatus =
  (typeof TRACE_LIFECYCLE_STATUSES)[keyof typeof TRACE_LIFECYCLE_STATUSES];

/**
 * An individual checkpoint recorded into the trace with explicit execution sequencing.
 */
export interface TraceCheckpointEntry {
  /** Monotonic 0-indexed execution order sequence number */
  readonly sequenceIndex: number;
  /** ISO 8601 timestamp when this entry was ingested into the trace */
  readonly recordedAt: string;
  /** The immutable CheckpointEnvelope */
  readonly checkpoint: CheckpointEnvelope<unknown>;
}

/**
 * Diagnostic record attributed to its originating layer and checkpoint.
 */
export interface TraceDiagnosticEntry {
  readonly diagnostic: CheckpointDiagnostic;
  readonly layer: LayerIdentity;
  readonly checkpointId: CheckpointId;
  readonly sequenceIndex: number;
}

/**
 * Lineage step mapping inputs consumed and output produced by a layer.
 */
export interface TraceLineageEntry {
  readonly layer: LayerIdentity;
  readonly checkpointId: CheckpointId;
  readonly sequenceIndex: number;
  readonly inputs: ReadonlyArray<ArtifactReference>;
  readonly output?: ArtifactReference;
}

export interface TraceTimingSummary {
  /** Earliest startedAt timestamp observed across checkpoints */
  readonly startedAt?: string;
  /** Latest completedAt timestamp if all executed checkpoints reached a terminal state */
  readonly completedAt?: string;
  /** Wall-clock elapsed duration in milliseconds from startedAt to completedAt */
  readonly wallClockDurationMs?: number;
  /** Sum of individual execution durations across all completed/warning/failed checkpoints */
  readonly summedLayerDurationMs: number;
}

export interface TraceDiagnosticSummary {
  readonly totalCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly diagnostics: ReadonlyArray<TraceDiagnosticEntry>;
}

/**
 * RunTrace: Comprehensive, immutable observability snapshot representing
 * the execution history of one Sound Engineer run.
 */
export interface RunTrace {
  readonly contractVersion: typeof RUN_TRACE_CONTRACT_VERSION | string;
  readonly traceId: TraceId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: TraceLifecycleStatus;
  readonly checkpointCount: number;
  readonly checkpoints: ReadonlyArray<TraceCheckpointEntry>;
  readonly diagnostics: TraceDiagnosticSummary;
  readonly timing: TraceTimingSummary;
  readonly lineage: ReadonlyArray<TraceLineageEntry>;
}

/**
 * Passively derives the overall trace lifecycle summary from checkpoint statuses.
 * Precedence rules:
 *   1. FAILED: If ANY checkpoint has failed.
 *   2. CANCELLED: If ANY checkpoint was cancelled and none failed.
 *   3. RUNNING: If any checkpoint is actively running.
 *   4. WARNING: If all checkpoints reached terminal states and at least one is WARNING.
 *   5. COMPLETED: If all checkpoints are terminal and no errors/warnings occurred.
 *   6. PENDING: If no checkpoints exist or all checkpoints are PENDING.
 *   7. RUNNING: Default if intermediate execution states exist.
 */
export function deriveTraceStatus(
  entries: ReadonlyArray<TraceCheckpointEntry>
): TraceLifecycleStatus {
  if (entries.length === 0) {
    return TRACE_LIFECYCLE_STATUSES.PENDING;
  }

  let hasFailed = false;
  let hasCancelled = false;
  let hasRunning = false;
  let hasWarning = false;
  let hasPending = false;
  let allTerminal = true;

  for (const entry of entries) {
    const s = entry.checkpoint.status;
    if (s === CHECKPOINT_STATUSES.FAILED) {
      hasFailed = true;
    } else if (s === CHECKPOINT_STATUSES.CANCELLED) {
      hasCancelled = true;
    } else if (s === CHECKPOINT_STATUSES.RUNNING) {
      hasRunning = true;
    } else if (s === CHECKPOINT_STATUSES.WARNING) {
      hasWarning = true;
    } else if (s === CHECKPOINT_STATUSES.PENDING) {
      hasPending = true;
    }

    if (!isTerminalCheckpointStatus(s)) {
      allTerminal = false;
    }
  }

  if (hasFailed) return TRACE_LIFECYCLE_STATUSES.FAILED;
  if (hasCancelled) return TRACE_LIFECYCLE_STATUSES.CANCELLED;
  if (hasRunning) return TRACE_LIFECYCLE_STATUSES.RUNNING;
  if (allTerminal) {
    return hasWarning ? TRACE_LIFECYCLE_STATUSES.WARNING : TRACE_LIFECYCLE_STATUSES.COMPLETED;
  }
  if (hasPending && !hasWarning && entries.every((e) => e.checkpoint.status === CHECKPOINT_STATUSES.PENDING)) {
    return TRACE_LIFECYCLE_STATUSES.PENDING;
  }

  return TRACE_LIFECYCLE_STATUSES.RUNNING;
}

/**
 * Computes diagnostic summary aggregating records and retaining layer attribution.
 */
export function computeDiagnosticSummary(
  entries: ReadonlyArray<TraceCheckpointEntry>
): TraceDiagnosticSummary {
  const diagnostics: TraceDiagnosticEntry[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const entry of entries) {
    for (const d of entry.checkpoint.diagnostics) {
      diagnostics.push({
        diagnostic: d,
        layer: entry.checkpoint.layer,
        checkpointId: entry.checkpoint.checkpointId,
        sequenceIndex: entry.sequenceIndex,
      });

      if (d.severity === "ERROR") errorCount++;
      else if (d.severity === "WARNING") warningCount++;
      else if (d.severity === "INFO") infoCount++;
    }
  }

  return {
    totalCount: diagnostics.length,
    errorCount,
    warningCount,
    infoCount,
    diagnostics: Object.freeze(diagnostics),
  };
}

/**
 * Computes timing summary from recorded checkpoints without fabricating timing.
 */
export function computeTimingSummary(
  entries: ReadonlyArray<TraceCheckpointEntry>
): TraceTimingSummary {
  let earliestStartMs: number | undefined;
  let latestEndMs: number | undefined;
  let earliestStartIso: string | undefined;
  let latestEndIso: string | undefined;
  let summedLayerDurationMs = 0;
  let allExecutedAreTerminal = entries.length > 0;

  for (const entry of entries) {
    const cp = entry.checkpoint;

    if (cp.startedAt) {
      const startMs = Date.parse(cp.startedAt);
      if (!isNaN(startMs)) {
        if (earliestStartMs === undefined || startMs < earliestStartMs) {
          earliestStartMs = startMs;
          earliestStartIso = cp.startedAt;
        }
      }
    }

    if (cp.completedAt) {
      const endMs = Date.parse(cp.completedAt);
      if (!isNaN(endMs)) {
        if (latestEndMs === undefined || endMs > latestEndMs) {
          latestEndMs = endMs;
          latestEndIso = cp.completedAt;
        }
      }
    } else if (cp.status === CHECKPOINT_STATUSES.RUNNING) {
      allExecutedAreTerminal = false;
    }

    if (typeof cp.durationMs === "number" && cp.durationMs >= 0) {
      summedLayerDurationMs += cp.durationMs;
    }
  }

  let wallClockDurationMs: number | undefined;
  if (earliestStartMs !== undefined && latestEndMs !== undefined && allExecutedAreTerminal) {
    wallClockDurationMs = Math.max(0, latestEndMs - earliestStartMs);
  }

  return {
    ...(earliestStartIso ? { startedAt: earliestStartIso } : {}),
    ...(latestEndIso && allExecutedAreTerminal ? { completedAt: latestEndIso } : {}),
    ...(wallClockDurationMs !== undefined ? { wallClockDurationMs } : {}),
    summedLayerDurationMs,
  };
}

/**
 * Extracts artifact lineage across checkpoints in sequence order.
 */
export function computeLineageSummary(
  entries: ReadonlyArray<TraceCheckpointEntry>
): ReadonlyArray<TraceLineageEntry> {
  const lineage: TraceLineageEntry[] = [];

  for (const entry of entries) {
    lineage.push({
      layer: entry.checkpoint.layer,
      checkpointId: entry.checkpoint.checkpointId,
      sequenceIndex: entry.sequenceIndex,
      inputs: entry.checkpoint.inputs,
      ...(entry.checkpoint.output ? { output: entry.checkpoint.output } : {}),
    });
  }

  return Object.freeze(lineage);
}

/**
 * Type guard for RunTrace.
 */
export function isRunTrace(value: unknown): value is RunTrace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.traceId === "string" &&
    candidate.traceId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    typeof candidate.updatedAt === "string" &&
    !isNaN(Date.parse(candidate.updatedAt)) &&
    typeof candidate.status === "string" &&
    typeof candidate.checkpointCount === "number" &&
    Array.isArray(candidate.checkpoints) &&
    typeof candidate.diagnostics === "object" &&
    candidate.diagnostics !== null &&
    typeof candidate.timing === "object" &&
    candidate.timing !== null &&
    Array.isArray(candidate.lineage)
  );
}
