// src/sound-engineer/validation/uncertainty/uncertaintyErrors.ts
// Phase 1C.5h WP-18: Uncertainty Modeling & Risk Accounting Error Taxonomy.

export class ValidationUncertaintyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationUncertaintyError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MissingRiskProfileError extends ValidationUncertaintyError {
  constructor(public readonly requestedRef: string) {
    super(
      `Missing production risk profile: "${requestedRef}". ` +
      `Phase 1C.5h forbids hardcoded universal thresholds; risk evaluation requires an explicit governed profile.`
    );
    this.name = "MissingRiskProfileError";
  }
}

export class UnknownRiskProfileError extends ValidationUncertaintyError {
  constructor(public readonly requestedRef: string) {
    super(
      `Unknown production risk profile: "${requestedRef}". ` +
      `Profile not registered in governed risk profile repository. Fail-closed policy active.`
    );
    this.name = "UnknownRiskProfileError";
  }
}

export class IncompatibleUncertaintyContextError extends ValidationUncertaintyError {
  constructor(message: string) {
    super(`Incompatible uncertainty context: ${message}`);
    this.name = "IncompatibleUncertaintyContextError";
  }
}

export class ScopeContainmentViolationError extends ValidationUncertaintyError {
  constructor(
    message: string,
    public readonly outOfScopeUnits: ReadonlyArray<string> = [],
    public readonly excludedUnitsEncountered: ReadonlyArray<string> = []
  ) {
    super(`Scope containment violation: ${message}`);
    this.name = "ScopeContainmentViolationError";
  }
}

export class InvalidUncertaintyRecordError extends ValidationUncertaintyError {
  constructor(message: string) {
    super(`Invalid uncertainty record: ${message}`);
    this.name = "InvalidUncertaintyRecordError";
  }
}

export class InvalidUncertaintyLinkingError extends ValidationUncertaintyError {
  constructor(message: string) {
    super(`Invalid uncertainty graph linking: ${message}`);
    this.name = "InvalidUncertaintyLinkingError";
  }
}
