// src/sound-engineer/validation/telemetry/telemetryErrors.ts
// Domain-specific error hierarchy for real-time quality telemetry monitoring under Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.

/**
 * Base error for all real-time quality telemetry exceptions.
 */
export abstract class TelemetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a governed `telemetry_threshold_profile_ref` cannot be resolved.
 * Fails closed: universal fallback thresholds are strictly prohibited.
 */
export class UnresolvedThresholdProfileError extends TelemetryError {
  constructor(
    public readonly profileRef: string,
    details?: string
  ) {
    super(
      `Unable to resolve governed telemetry threshold profile reference "${profileRef}". ` +
        `Failing closed: zero built-in threshold defaults permitted.${details ? ` Details: ${details}` : ""}`
    );
  }
}

/**
 * Thrown when an incoming telemetry sample violates factual schema or containment constraints.
 */
export class InvalidTelemetrySampleError extends TelemetryError {
  constructor(
    public readonly sampleIdOrTimestamp: string,
    message: string
  ) {
    super(`Invalid telemetry sample "${sampleIdOrTimestamp}": ${message}`);
  }
}

/**
 * Thrown when mandatory policy or configuration (such as stream-loss timeout or decision binding) is missing.
 */
export class MissingGovernedPolicyError extends TelemetryError {
  constructor(
    public readonly policyName: string,
    message: string
  ) {
    super(`Missing required governed policy "${policyName}": ${message}`);
  }
}

/**
 * Thrown when the telemetry stream fails to emit within the governed failsafe timeout.
 */
export class StreamDisruptedError extends TelemetryError {
  constructor(
    public readonly elapsedMs: number,
    public readonly timeoutMs: number,
    message?: string
  ) {
    super(
      `Telemetry stream disruption detected: no telemetry received for ${elapsedMs}ms ` +
        `(governed timeout: ${timeoutMs}ms).${message ? ` ${message}` : ""}`
    );
  }
}

/**
 * Thrown when an active governed profile requires a metric but the sample contains no usable observation.
 * Enforces fail-closed evaluation: missing evidence must never silently pass.
 */
export class MissingTelemetryEvidenceError extends TelemetryError {
  constructor(
    public readonly metricId: string,
    public readonly profileRef: string,
    message?: string
  ) {
    super(
      `Active governed profile "${profileRef}" requires metric "${metricId}" but sample contains zero valid observation.` +
        `${message ? ` ${message}` : " Evaluation fails closed."}`
    );
  }
}

/**
 * Thrown when telemetry sample scope does not match or is incompatible with authorized scope.
 */
export class ScopeMismatchError extends TelemetryError {
  constructor(
    public readonly telemetryScope: readonly string[],
    public readonly authorizedScope: readonly string[],
    message?: string
  ) {
    super(
      `Telemetry scope [${telemetryScope.join(", ")}] is incompatible with authorized scope [${authorizedScope.join(", ")}].` +
        `${message ? ` ${message}` : " Scope mismatch fails closed."}`
    );
  }
}

/**
 * Thrown when telemetry sample version binding reference mismatches expected active version binding.
 */
export class VersionBindingMismatchError extends TelemetryError {
  constructor(
    public readonly sampleBindingId: string,
    public readonly expectedBindingId: string,
    message?: string
  ) {
    super(
      `Telemetry version binding "${sampleBindingId}" does not match active expected version binding "${expectedBindingId}".` +
        `${message ? ` ${message}` : " Binding mismatch fails closed."}`
    );
  }
}

/**
 * Thrown when the supplied active version binding does not match the binding authorized by the active AdoptionDecisionRecord.
 */
export class AuthorizationBindingMismatchError extends VersionBindingMismatchError {
  constructor(
    public readonly suppliedBindingId: string,
    public readonly authorizedBindingRef: string,
    message?: string
  ) {
    super(
      suppliedBindingId,
      authorizedBindingRef,
      message ??
        `Supplied version binding "${suppliedBindingId}" does not match authorized binding reference "${authorizedBindingRef}".`
    );
  }
}

/**
 * Thrown when CircuitBreaker is invoked against an AdoptionDecisionRecord that does not have an authorized outcome (e.g. REJECTED or BLOCKED).
 */
export class InactiveAuthorizationError extends TelemetryError {
  constructor(
    public readonly decisionId: string,
    public readonly governanceStatus: string | undefined,
    public readonly decisionOutcome: string,
    message?: string
  ) {
    super(
      `Target AdoptionDecisionRecord "${decisionId}" does not represent an authorized outcome ` +
        `(decision_outcome: "${decisionOutcome}"${governanceStatus ? `, governance_status: "${governanceStatus}"` : ""}). ` +
        `Circuit breaker can only process authorized decisions.${message ? ` ${message}` : ""}`
    );
  }
}

/**
 * Thrown when an externally resolved policy lacks required fields (such as reactionBudgetMs) for production evaluation.
 */
export class IncompleteGovernedPolicyError extends TelemetryError {
  constructor(
    public readonly profileRef: string,
    public readonly missingRequirement: string,
    message?: string
  ) {
    super(
      `Governed profile "${profileRef}" is incomplete for production WF-17 evaluation: missing "${missingRequirement}".` +
        `${message ? ` ${message}` : " Production evaluation requires complete governed policy."}`
    );
  }
}

/**
 * Thrown when CircuitBreaker encounters a failure during trigger detection or graph linkage.
 * Captures any partial results (such as generated Record 18) to prevent evidence loss.
 */
export class CircuitBreakerExecutionError extends TelemetryError {
  constructor(
    public readonly stage: string,
    message: string,
    public readonly partialRecord18?: unknown,
    public readonly originalError?: unknown
  ) {
    super(`Circuit breaker execution failed at stage "${stage}": ${message}`);
  }
}

/**
 * Thrown when CircuitBreaker Slice 3B preconditions are not met.
 * Enforces that Slice 3B runs only after Slice 3A has successfully produced
 * an eligible MAJOR_DEGRADATION result, canonical Record 18, and canonical INVALIDATED_BY edge.
 */
export class CircuitBreakerPreconditionError extends TelemetryError {
  constructor(message: string) {
    super(`Circuit breaker precondition failure: ${message}`);
  }
}

/**
 * Thrown when Gate 8 lifecycle governance prohibits suspension from the current state
 * (e.g. from RESTRICTED without formal re-adjudication).
 */
export class ProhibitedSuspensionError extends TelemetryError {
  constructor(
    public readonly decisionId: string,
    public readonly currentStatus: string,
    message?: string
  ) {
    super(
      `Cannot suspend Gate 8 authorization "${decisionId}" currently in "${currentStatus}" status. ` +
        `${message ?? "Transition to SUSPENDED is prohibited from this lifecycle state without re-adjudication."}`
    );
  }
}

/**
 * Thrown when CircuitBreaker is invoked against an authorization in a terminal lifecycle state (WITHDRAWN or SUPERSEDED).
 */
export class TerminalAuthorizationStateError extends TelemetryError {
  constructor(
    public readonly decisionId: string,
    public readonly terminalStatus: string,
    message?: string
  ) {
    super(
      `Gate 8 authorization "${decisionId}" is in terminal state "${terminalStatus}". ` +
        `${message ?? "No further lifecycle transitions or automated suspensions are permitted on terminal authorizations."}`
    );
  }
}


