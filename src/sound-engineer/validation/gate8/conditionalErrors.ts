// src/sound-engineer/validation/gate8/conditionalErrors.ts
// Authoritative error types for Phase 1C.5h WP-23:
// Conditional Authorization, Scope Restriction & Boundary Subsystem.
// Bound to frozen specification v0.1j Section 27, Table 18, and Build Plan v0.1h WP-23.

import { Gate8Error } from "./gate8Errors";

/**
 * Base error for all WP-23 Conditional Authorization errors.
 */
export class ConditionalAuthorizationError extends Gate8Error {
  constructor(message: string) {
    super(`Conditional Authorization Failure: ${message}`);
    this.name = "ConditionalAuthorizationError";
  }
}

/**
 * Thrown when an invalid context (e.g. non-CONDITIONALLY_AUTHORIZED outcome, tampered record)
 * is passed to the ConditionalAuthorizationManager.
 */
export class InvalidConditionalContextError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Invalid Context: ${message}`);
    this.name = "InvalidConditionalContextError";
  }
}

/**
 * Thrown when an attempt is made to bypass absolute non-waivable invariants
 * (e.g. material genuine regression, broken export, unverified rollback, broken provenance,
 * principles violation, critical uncertainty, or active hard blockers).
 */
export class NonWaivableBlockerError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Non-Waivable Blocker Detected: ${message}`);
    this.name = "NonWaivableBlockerError";
  }
}

/**
 * Thrown when scope containment or carve-out invariants are violated:
 * - authorized_scope not subset of requested_scope
 * - authorized_scope not subset of tested_scope
 * - authorized_scope overlaps with excluded_scope
 * - unvalidated or excluded units in authorized_scope
 * - silent omissions without explicit exclusion.
 */
export class ConditionalScopeContainmentError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Scope Containment Failure: ${message}`);
    this.name = "ConditionalScopeContainmentError";
  }
}

/**
 * Thrown when a conditional authorization is semantically empty
 * (no narrower scope, no exclusions, no constraints, no monitoring, no review/evidence requirements),
 * which would make it indistinguishable from full AUTHORIZED.
 */
export class EmptyConditionalPlanError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Empty Conditional Plan: ${message}`);
    this.name = "EmptyConditionalPlanError";
  }
}

/**
 * Thrown when an invalid constraint, vague rule, ungrounded threshold,
 * or prohibited operational/traffic-slicing construct (e.g. traffic percentages) is encountered.
 */
export class InvalidConditionalConstraintError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Invalid Constraint: ${message}`);
    this.name = "InvalidConditionalConstraintError";
  }
}

/**
 * Thrown when condition validity has expired or stop-criteria trigger revalidation.
 */
export class ConditionalValidityExpiredError extends ConditionalAuthorizationError {
  constructor(message: string) {
    super(`Validity Expired: ${message}`);
    this.name = "ConditionalValidityExpiredError";
  }
}
