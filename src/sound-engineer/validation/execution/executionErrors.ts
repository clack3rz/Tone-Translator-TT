// src/sound-engineer/validation/execution/executionErrors.ts
// Typed error definitions for Phase 1C.5h WP-10:
// Sandboxed Validation Execution Harness & Audio Runner (Record 9).
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.

/**
 * Thrown when validation prerequisites or eligibility criteria fail before execution.
 * Fails closed on invalid scope, version binding mismatch, missing case, or ineligible fixture.
 */
export class ExecutionEligibilityError extends Error {
  public override readonly name = "ExecutionEligibilityError";
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(`[WP-10 Execution Eligibility Violation]: ${message}`);
    Object.setPrototypeOf(this, ExecutionEligibilityError.prototype);
  }
}

/**
 * Thrown when an operational budget / timeout is exceeded.
 */
export class ExecutionTimeoutError extends Error {
  public override readonly name = "ExecutionTimeoutError";
  constructor(
    public readonly executionId: string,
    public readonly budgetMs: number,
    public readonly budgetRef: string,
    message?: string
  ) {
    super(
      message ??
        `[WP-10 Execution Timeout]: Execution '${executionId}' exceeded operational budget limit of ${budgetMs}ms governed by '${budgetRef}'.`
    );
    Object.setPrototypeOf(this, ExecutionTimeoutError.prototype);
  }
}

/**
 * Thrown when an isolated sandbox crash occurs.
 */
export class ExecutionSandboxCrashError extends Error {
  public override readonly name = "ExecutionSandboxCrashError";
  constructor(
    public readonly executionId: string,
    public readonly underlyingError: unknown,
    message?: string
  ) {
    super(
      message ??
        `[WP-10 Sandbox Crash]: Isolated sandbox execution failed for '${executionId}': ${
          underlyingError instanceof Error ? underlyingError.message : String(underlyingError)
        }`
    );
    Object.setPrototypeOf(this, ExecutionSandboxCrashError.prototype);
  }
}

/**
 * Thrown when governed retest or supersession semantics are violated.
 */
export class ExecutionRetestError extends Error {
  public override readonly name = "ExecutionRetestError";
  constructor(message: string) {
    super(`[WP-10 Retest Supersession Violation]: ${message}`);
    Object.setPrototypeOf(this, ExecutionRetestError.prototype);
  }
}

/**
 * Thrown when any prohibited mutation of production state or live routing is attempted.
 */
export class ProductionStateViolationError extends Error {
  public override readonly name = "ProductionStateViolationError";
  constructor(message: string) {
    super(`[WP-10 Production Protection Invariant Violation]: ${message}`);
    Object.setPrototypeOf(this, ProductionStateViolationError.prototype);
  }
}
