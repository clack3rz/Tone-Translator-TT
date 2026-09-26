// src/sound-engineer/checkpoints/checkpointStatus.ts
// Granular execution statuses for individual Sound Engineer processing layers

/**
 * Valid execution statuses for a layer checkpoint.
 * Distinct from overall run-level lifecycle status to support layer-specific semantics
 * such as non-fatal warnings and explicit skips.
 */
export const CHECKPOINT_STATUSES = {
  /** Layer is queued or scheduled; processing has not yet commenced */
  PENDING: "pending",

  /** Layer is actively executing */
  RUNNING: "running",

  /** Layer completed processing successfully with pristine outputs */
  COMPLETED: "completed",

  /**
   * Layer completed processing and produced valid output, but encountered recoverable
   * issues or non-fatal boundary warnings. Crucially, WARNING != FAILED.
   */
  WARNING: "warning",

  /** Layer encountered an unrecoverable failure and could not produce valid output */
  FAILED: "failed",

  /** Layer was explicitly bypassed due to conditional pipeline routing or satisfied prerequisites */
  SKIPPED: "skipped",

  /** Layer execution was aborted prior to completion due to cancellation request */
  CANCELLED: "cancelled",
} as const;

export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[keyof typeof CHECKPOINT_STATUSES];

const CHECKPOINT_STATUS_VALUES = new Set<string>(Object.values(CHECKPOINT_STATUSES));

/**
 * Type guard to validate whether an unknown value is a recognized CheckpointStatus.
 */
export function isCheckpointStatus(value: unknown): value is CheckpointStatus {
  return typeof value === "string" && CHECKPOINT_STATUS_VALUES.has(value);
}

/**
 * Returns true if the status represents a final terminal state for the layer.
 */
export function isTerminalCheckpointStatus(status: CheckpointStatus): boolean {
  return (
    status === CHECKPOINT_STATUSES.COMPLETED ||
    status === CHECKPOINT_STATUSES.WARNING ||
    status === CHECKPOINT_STATUSES.FAILED ||
    status === CHECKPOINT_STATUSES.SKIPPED ||
    status === CHECKPOINT_STATUSES.CANCELLED
  );
}
