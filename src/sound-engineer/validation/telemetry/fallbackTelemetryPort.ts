// src/sound-engineer/validation/telemetry/fallbackTelemetryPort.ts
// Pluggable capability interface for engaging external fallback monitoring under Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2 and Build Plan v0.1h WP-28.

/**
 * Factual context provided when engaging external fallback monitoring upon primary stream disruption.
 */
export interface FallbackMonitoringContext {
  /** Identifier of the target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Affected gear or preset scope */
  readonly scope: readonly string[];

  /** Explanation of why fallback is being requested (e.g. stream timeout) */
  readonly disruptionReason: string;

  /** ISO 8601 UTC timestamp of request */
  readonly requestedAt: string;
}

/**
 * Acknowledgment returned by the external fallback monitoring infrastructure.
 */
export interface FallbackMonitoringAck {
  /** Whether fallback monitoring was successfully engaged */
  readonly engaged: boolean;

  /** Identifier of the fallback monitoring source or channel */
  readonly fallbackSourceId?: string;

  /** ISO 8601 UTC timestamp */
  readonly timestamp: string;

  /** Optional note or status from fallback provider */
  readonly note?: string;
}

/**
 * Optional capability interface for engaging external fallback monitoring.
 *
 * CRITICAL GOVERNANCE INVARIANT:
 * WP-28 does NOT fabricate fallback data or implement a synthetic backup stream.
 * If an external fallback provider is not configured, absence is treated as a capability gap.
 */
export interface FallbackTelemetryPort {
  /**
   * Dispatches a request to activate external fallback telemetry monitoring.
   */
  engageFallbackMonitoring(
    context: FallbackMonitoringContext
  ): Promise<FallbackMonitoringAck> | FallbackMonitoringAck;
}
