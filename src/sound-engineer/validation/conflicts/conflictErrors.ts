// src/sound-engineer/validation/conflicts/conflictErrors.ts
// Phase 1C.5h WP-17: Evidence Conflict Error Taxonomy.

export class EvidenceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MissingConflictProfileError extends EvidenceConflictError {
  constructor(public readonly requestedRef: string) {
    super(
      `Missing conflict detection profile: "${requestedRef}". ` +
      `Phase 1C.5h forbids hardcoded universal thresholds; conflict detection requires an explicit governed profile.`
    );
    this.name = "MissingConflictProfileError";
  }
}

export class IncompatibleEvidenceContextError extends EvidenceConflictError {
  constructor(message: string) {
    super(`Incompatible evidence context: ${message}`);
    this.name = "IncompatibleEvidenceContextError";
  }
}

export class InvalidEvidenceError extends EvidenceConflictError {
  constructor(message: string) {
    super(`Invalid evidence record: ${message}`);
    this.name = "InvalidEvidenceError";
  }
}

export class ScalarSmoothingForbiddenError extends EvidenceConflictError {
  constructor(message: string = "Scalar smoothing, averaging, or artificial consensus is strictly prohibited under Axiom 4.") {
    super(message);
    this.name = "ScalarSmoothingForbiddenError";
  }
}
