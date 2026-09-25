// src/sound-engineer/execution/runLifecycle.ts
// Typed lifecycle status vocabulary for Sound Engineer execution runs

/**
 * Standard lifecycle statuses for Sound Engineer execution runs.
 *
 * - `created`: The run envelope has been initialized and assigned a runId, but execution has not yet commenced.
 * - `running`: The run is actively executing its pipeline stages.
 * - `completed`: The run finished all planned execution stages successfully.
 * - `failed`: The run encountered an unhandled error or failed validation that halted execution.
 * - `cancelled`: The run was aborted before normal completion.
 */
export const RUN_LIFECYCLE_STATUSES = {
  CREATED: "created",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type RunLifecycleStatus = (typeof RUN_LIFECYCLE_STATUSES)[keyof typeof RUN_LIFECYCLE_STATUSES];

export const VALID_RUN_LIFECYCLE_STATUSES: readonly RunLifecycleStatus[] = Object.freeze([
  RUN_LIFECYCLE_STATUSES.CREATED,
  RUN_LIFECYCLE_STATUSES.RUNNING,
  RUN_LIFECYCLE_STATUSES.COMPLETED,
  RUN_LIFECYCLE_STATUSES.FAILED,
  RUN_LIFECYCLE_STATUSES.CANCELLED,
]);

/**
 * Type guard to verify whether a given value is a valid RunLifecycleStatus.
 */
export function isRunLifecycleStatus(value: unknown): value is RunLifecycleStatus {
  return typeof value === "string" && (VALID_RUN_LIFECYCLE_STATUSES as readonly string[]).includes(value as RunLifecycleStatus);
}

/**
 * Helper to determine whether a lifecycle status represents a terminal (final) state.
 */
export function isTerminalRunStatus(status: RunLifecycleStatus): boolean {
  return (
    status === RUN_LIFECYCLE_STATUSES.COMPLETED ||
    status === RUN_LIFECYCLE_STATUSES.FAILED ||
    status === RUN_LIFECYCLE_STATUSES.CANCELLED
  );
}
