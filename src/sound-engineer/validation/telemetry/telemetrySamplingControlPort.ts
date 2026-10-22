// src/sound-engineer/validation/telemetry/telemetrySamplingControlPort.ts
// Capability port for requesting telemetry sampling escalation upon minor anomalies under Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.

/**
 * Factual context provided when requesting telemetry sampling frequency escalation.
 *
 * CRITICAL RULE:
 * WP-28 does NOT invent or mandate a numeric sample rate (e.g. "100 Hz").
 * It requests semantic escalation; the external telemetry infrastructure configures the actual rate.
 */
export interface SamplingEscalationContext {
  /** Identifier of the target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Affected gear or preset scope */
  readonly scope: readonly string[];

  /** Identifier of the metric that exhibited the minor anomaly */
  readonly metricId: string;

  /** Actual observed value that warranted heightened observation */
  readonly observedValue: number;

  /** Rationale or explanation for escalation */
  readonly rationale: string;

  /** ISO 8601 UTC timestamp of request */
  readonly requestedAt: string;
}

/**
 * Acknowledgment returned by the external telemetry infrastructure.
 */
export interface SamplingEscalationAck {
  /** Whether the escalation request was received and accepted */
  readonly accepted: boolean;

  /** ISO 8601 UTC timestamp */
  readonly timestamp: string;

  /** Optional status or configured rate details provided by telemetry infrastructure */
  readonly details?: string;
}

/**
 * Optional capability interface for notifying telemetry infrastructure to escalate sampling frequency.
 */
export interface TelemetrySamplingControlPort {
  /**
   * Requests semantic sampling frequency escalation from the external telemetry provider.
   */
  requestSamplingEscalation(
    context: SamplingEscalationContext
  ): Promise<SamplingEscalationAck> | SamplingEscalationAck;
}
