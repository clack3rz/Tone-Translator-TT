// src/sound-engineer/shadow/shadowRunState.ts
// Versioned run state contract and types for isolated Shadow execution

import { RunId, RunLifecycleStatus, EXECUTION_STREAMS } from "../execution";
import { SnapshotId } from "../contracts";

/**
 * Current version of the ShadowRunState contract specification.
 */
export const SHADOW_RUN_STATE_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Structured, serializable error representation for failed Shadow runs.
 * Prevents raw or unhandled Error objects from polluting application runtime.
 */
export interface ShadowExecutionError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly stack?: string;
  readonly timestamp: string;
}

/**
 * Harmless placeholder execution result for infrastructure verification.
 * Contains no sound-engineering conclusions or platform-specific mutations.
 */
export interface ShadowExecutionResult {
  readonly runId: RunId;
  readonly snapshotId: SnapshotId;
  readonly acknowledged: boolean;
  readonly executedAt: string;
  readonly durationMs: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Read-only snapshot of a Shadow run's state at any point in its lifecycle.
 */
export interface ShadowRunState {
  /** Contract specification version */
  readonly contractVersion: typeof SHADOW_RUN_STATE_CONTRACT_VERSION;

  /** Unique execution run identity */
  readonly runId: RunId;

  /** Strictly bound to SHADOW stream */
  readonly stream: typeof EXECUTION_STREAMS.SHADOW;

  /** Bound InputSnapshot identifier */
  readonly snapshotId: SnapshotId;

  /** Current lifecycle status */
  readonly status: RunLifecycleStatus;

  /** ISO 8601 timestamp when controller envelope was created */
  readonly createdAt: string;

  /** ISO 8601 timestamp when execution entered 'running' status */
  readonly startedAt?: string;

  /** ISO 8601 timestamp when run reached a terminal state */
  readonly completedAt?: string;

  /** Structured error if the run reached 'failed' status */
  readonly error?: ShadowExecutionError;

  /** Execution result if the run reached 'completed' status */
  readonly result?: ShadowExecutionResult;

  /** Optional cancellation reason if status is 'cancelled' */
  readonly cancellationReason?: string;
}

/**
 * Type guard to validate whether an unknown value conforms to the ShadowRunState contract.
 */
export function isShadowRunState(value: unknown): value is ShadowRunState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    candidate.contractVersion === SHADOW_RUN_STATE_CONTRACT_VERSION &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    candidate.stream === EXECUTION_STREAMS.SHADOW &&
    typeof candidate.snapshotId === "string" &&
    candidate.snapshotId.length > 0 &&
    typeof candidate.status === "string" &&
    typeof candidate.createdAt === "string"
  );
}
