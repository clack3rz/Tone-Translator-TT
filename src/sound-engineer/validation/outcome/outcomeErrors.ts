// src/sound-engineer/validation/outcome/outcomeErrors.ts
// Authoritative domain errors for Phase 1C.5h WP-19: Governed Validation Outcome Synthesis & Decision Engine.
// Bound to frozen specification v0.1j Section 23 and Implementation Plan v0.1h WP-19.

/**
 * Base error class for all validation outcome synthesis operations.
 */
export class OutcomeSynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutcomeSynthesisError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when context validation fails due to package, scope, or version binding incoherence.
 */
export class OutcomeContextValidationError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "OutcomeContextValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when foreign evidence, regression, conflict, or uncertainty belonging to
 * another package or execution is supplied to synthesis.
 */
export class ForeignEvidenceError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "ForeignEvidenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when evaluated scope violates WP-04 scope containment or attempts scope inflation.
 */
export class ScopeContainmentError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "ScopeContainmentError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when test profile applicability fails to resolve or fails closed.
 */
export class ApplicabilityResolutionError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "ApplicabilityResolutionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an applicable assigned profile has missing execution or required evidence.
 */
export class IncompleteCoverageError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteCoverageError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a constructed ValidationOutcomeRecord violates authoritative schema rules,
 * contains invented outcome statuses, or includes non-persisted fields.
 */
export class InvalidOutcomeRecordError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOutcomeRecordError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an illegal relationship edge or invalid endpoint linking is attempted.
 */
export class InvalidOutcomeLinkingError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOutcomeLinkingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested uncertainty threshold profile reference is missing or unknown.
 * Enforces fail-closed behavior with no universal fallback.
 */
export class MissingThresholdProfileError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "MissingThresholdProfileError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when mutation of a historical, sealed ValidationOutcomeRecord is attempted.
 */
export class ImmutableRecordMutationError extends OutcomeSynthesisError {
  constructor(message: string) {
    super(message);
    this.name = "ImmutableRecordMutationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
