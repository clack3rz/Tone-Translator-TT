// src/sound-engineer/validation/telemetry/operationalSignalPort.ts
// Capability port for requesting operational execution from Phase 1C.5g under Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.

/**
 * Factual request payload signaling Phase 1C.5g to execute operational PATH-ROLLBACK.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * Phase 1C.5h signals the need for rollback; Phase 1C.5g physically executes
 * traffic routing reversion to the baseline. WP-28 holds ZERO routing authority.
 */
export interface OperationalRollbackSignal {
  /** Identifier of the target AdoptionDecisionRecord whose cutover is being halted */
  readonly decisionId: string;

  /** Active version binding identifier under live exposure */
  readonly versionBindingId: string;

  /** Affected gear or preset scope to be rolled back */
  readonly affectedScope: readonly string[];

  /** Technical explanation of the triggering condition */
  readonly reason: string;

  /** ISO 8601 UTC timestamp when the rollback was requested */
  readonly requestedAt: string;

  /** Canonical trigger source token (e.g. "TRIGGER-10") */
  readonly triggerSource?: string;

  /** Optional telemetry event or sample reference that caused the rollback request */
  readonly telemetryEventId?: string;

  /** Optional summary of breached metrics */
  readonly breachedMetricSummary?: string;
}

/**
 * Factual request payload signaling Phase 1C.5g to pause Canary rollout traffic progression.
 * Distinct from rollback: pauses traffic expansion / slicing without immediately reverting baseline.
 */
export interface CanaryPauseSignal {
  /** Identifier of the target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Affected gear or preset scope */
  readonly affectedScope: readonly string[];

  /** Reason for pausing Canary (e.g. stream loss, heartbeat timeout) */
  readonly reason: string;

  /** ISO 8601 UTC timestamp when pause was requested */
  readonly requestedAt: string;

  /** Elapsed stream disruption time in milliseconds, if applicable */
  readonly streamLossDurationMs?: number;
}

/**
 * Receipt or acknowledgment returned by the Phase 1C.5g operational execution port.
 *
 * Note: Acknowledgment confirms signal receipt/dispatch; it does NOT constitute
 * physical traffic drain completion unless explicitly certified by the execution engine.
 */
export interface OperationalSignalAck {
  /** Whether the signal was accepted and dispatched to the execution harness */
  readonly acknowledged: boolean;

  /** Unique correlation or dispatch identifier assigned by the operational adapter */
  readonly dispatchId: string;

  /** ISO 8601 UTC timestamp of receipt */
  readonly timestamp: string;

  /** Optional notes or status from Phase 1C.5g */
  readonly note?: string;
}

/**
 * Capability interface through which WP-28 communicates operational demands to Phase 1C.5g.
 *
 * GOVERNANCE RULES:
 * 1. Declarative requests only (`signalRollback`, `signalCanaryPause`).
 * 2. NO methods for mutating routing tables, DNS, load balancers, or traffic slices.
 * 3. NO direct execution of PATH-ROLLBACK.
 */
export interface OperationalSignalPort {
  /**
   * Dispatches a formal operational rollback request to Phase 1C.5g.
   */
  signalRollback(
    signal: OperationalRollbackSignal
  ): Promise<OperationalSignalAck> | OperationalSignalAck;

  /**
   * Dispatches a formal Canary traffic pause request to Phase 1C.5g.
   */
  signalCanaryPause(
    signal: CanaryPauseSignal
  ): Promise<OperationalSignalAck> | OperationalSignalAck;
}
