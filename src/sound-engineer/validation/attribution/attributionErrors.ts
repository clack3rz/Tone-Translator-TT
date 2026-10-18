// src/sound-engineer/validation/attribution/attributionErrors.ts
// Phase 1C.5h WP-16: Failure Attribution & Diagnostic Isolation Engine Error Taxonomy.

export class FailureAttributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FailureAttributionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidAttributionEvidenceError extends FailureAttributionError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAttributionEvidenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfoundedAttributionError extends FailureAttributionError {
  constructor(message: string) {
    super(message);
    this.name = "ConfoundedAttributionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidExecutionReferenceError extends FailureAttributionError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutionReferenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ScopeAttributionMismatchError extends FailureAttributionError {
  constructor(message: string) {
    super(message);
    this.name = "ScopeAttributionMismatchError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
