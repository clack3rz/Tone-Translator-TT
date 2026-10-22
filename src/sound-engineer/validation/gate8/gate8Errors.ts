// src/sound-engineer/validation/gate8/gate8Errors.ts
// Authoritative error types for Phase 1C.5h WP-22:
// Gate 8 Production Cutover Adjudication & Scoped Authorization (Record 21).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 18, and Build Plan v0.1h WP-22.

export class Gate8Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Gate8Error";
  }
}

export class Gate8PrerequisiteError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Prerequisite Validation Failure: ${message}`);
    this.name = "Gate8PrerequisiteError";
  }
}

export class Gate8ScopeContainmentError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Scope Containment Failure: ${message}`);
    this.name = "Gate8ScopeContainmentError";
  }
}

export class UnauthorizedSignerError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Authorizing Authority Validation Failure: ${message}`);
    this.name = "UnauthorizedSignerError";
  }
}

export class InvalidRollbackReferenceError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Rollback Verification Reference Failure: ${message}`);
    this.name = "InvalidRollbackReferenceError";
  }
}

export class InvalidVersionBindingError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Version Binding Integrity Failure: ${message}`);
    this.name = "InvalidVersionBindingError";
  }
}

export class StaleReadinessAssessmentError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Readiness Assessment Stale/Invalid Failure: ${message}`);
    this.name = "StaleReadinessAssessmentError";
  }
}

export class InvalidAdoptionDecisionRecordError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 AdoptionDecisionRecord Schema Failure: ${message}`);
    this.name = "InvalidAdoptionDecisionRecordError";
  }
}

export class InvalidDecisionOutcomeError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Invalid Decision Outcome: ${message}`);
    this.name = "InvalidDecisionOutcomeError";
  }
}

export class ConditionalAuthorizationConstraintError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Conditional Authorization Constraint Failure: ${message}`);
    this.name = "ConditionalAuthorizationConstraintError";
  }
}

export class Gate8AdjudicationBlockedError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Adjudication Blocked (Not Evaluable): ${message}`);
    this.name = "Gate8AdjudicationBlockedError";
  }
}
