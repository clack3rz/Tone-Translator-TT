// src/sound-engineer/validation/retest/retestErrors.ts
// Phase 1C.5h WP-20: Revalidation Trigger Detection & Retest Planning Error Contracts.
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

export class RetestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetestError";
  }
}

export class TriggerDetectionError extends RetestError {
  constructor(message: string) {
    super(`Trigger detection failed: ${message}`);
    this.name = "TriggerDetectionError";
  }
}

export class InvalidTriggerSourceError extends RetestError {
  constructor(attemptedSource: string) {
    super(
      `Invalid trigger source: "${attemptedSource}". Phase 1C.5h defines exactly ten frozen revalidation triggers (TRIGGER-01 through TRIGGER-10). Trigger 11 is strictly rejected.`
    );
    this.name = "InvalidTriggerSourceError";
  }
}

export class InvalidRequiredActionError extends RetestError {
  constructor(attemptedAction: string) {
    super(
      `Invalid required action: "${attemptedAction}". Phase 1C.5h permits only NO_ACTION, PARTIAL_RETEST, FULL_RETEST, and SUSPEND_GATE_8.`
    );
    this.name = "InvalidRequiredActionError";
  }
}

export class IncoherentBindingTransitionError extends RetestError {
  constructor(message: string) {
    super(`Incoherent version binding transition: ${message}`);
    this.name = "IncoherentBindingTransitionError";
  }
}

export class BindingIntegrityError extends RetestError {
  constructor(bindingId: string, reason: string) {
    super(`Version binding integrity failure for "${bindingId}": ${reason}`);
    this.name = "BindingIntegrityError";
  }
}

export class ScopeContainmentError extends RetestError {
  constructor(message: string) {
    super(`Scope containment violation in revalidation: ${message}`);
    this.name = "ScopeContainmentError";
  }
}

export class EvidencePartitioningError extends RetestError {
  constructor(message: string) {
    super(`Evidence partitioning error in retest planning: ${message}`);
    this.name = "EvidencePartitioningError";
  }
}

export class RetestPlanningError extends RetestError {
  constructor(message: string) {
    super(`Retest planning failed: ${message}`);
    this.name = "RetestPlanningError";
  }
}

export class InvalidSupersessionError extends RetestError {
  constructor(message: string) {
    super(`Validation execution supersession error: ${message}`);
    this.name = "InvalidSupersessionError";
  }
}
