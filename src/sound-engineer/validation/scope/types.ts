// src/sound-engineer/validation/scope/types.ts
// Authoritative types, error classes, and contracts for Phase 1C.5h WP-04:
// Validation Scope Boundary & Inflation Protection Subsystem (Record 2).
// Bound to frozen specification v0.1j Section 9, Table 18, Condition 20, and Implementation Plan v0.1h WP-04.

import { z } from "zod";
import { ValidationPrimaryDomain, VALIDATION_PRIMARY_DOMAINS } from "../schemas/enums";
import { ValidationScopeRecord } from "../schemas/records";

/**
 * Governed Failure Conditions for Phase 1C.5h Scope Enforcement.
 * Condition 20 is the exact architectural failure condition defined in Section 35 of frozen v0.1j.
 */
export const SCOPE_FAILURE_CONDITIONS = {
  CONDITION_20: "Condition 20: Requested Production Authorization Scope Exceeds Tested Scope",
} as const;

export type ScopeFailureCondition =
  (typeof SCOPE_FAILURE_CONDITIONS)[keyof typeof SCOPE_FAILURE_CONDITIONS];

/**
 * Tokens and patterns that constitute wildcards or ambiguous boundaries.
 * Under Axiom 6 (Strictly Scoped Authorization) and WP-04 Inflation Protection,
 * wildcards are strictly prohibited and force immediate rejection.
 */
export const PROHIBITED_WILDCARD_PATTERNS = [
  /\*/,                     // Asterisk wildcard (e.g. *, amp_*)
  /\?/,                     // Question mark wildcard (e.g. amp_?)
  /\.\*/,                   // Regex wildcard (.*)
  /%/,                      // SQL wildcard (%)
  /^(all|any|all_gear|all-gear|all_models|all_scopes|universal|global|\*\.\*)$/i, // Universal match words
] as const;

/**
 * Explicit input descriptor for declaring validation scope boundaries.
 */
export interface ScopeDeclarationInput {
  readonly scope_id?: string;
  readonly primary_domain?: ValidationPrimaryDomain;
  readonly included_units?: ReadonlyArray<string>;
  readonly excluded_units?: ReadonlyArray<string>;
  readonly boundary_constraints?: ReadonlyArray<string>;
  readonly scope_inflation_protection?: boolean;
}

/**
 * Parsed and sanitized scope definition ready for canonical record compilation.
 */
export interface ParsedScopeDefinition {
  readonly primary_domain: ValidationPrimaryDomain;
  readonly included_units: ReadonlyArray<string>;
  readonly excluded_units: ReadonlyArray<string>;
  readonly boundary_constraints: ReadonlyArray<string>;
  readonly scope_inflation_protection: boolean;
}

/**
 * Options for deriving a ValidationScopeRecord from an accepted ValidationIntakeRecord.
 */
export interface ScopeDerivationOptions {
  /** Explicit scope ID override; defaults to `scope_${intakeRecord.intake_id}` */
  readonly scopeId?: string;
  /** Explicit scope declaration payload if overriding or augmenting text declared_scope */
  readonly scopeDeclaration?: ScopeDeclarationInput;
  /** Explicit primary domain override */
  readonly primaryDomain?: ValidationPrimaryDomain;
  /** Explicit included units */
  readonly includedUnits?: ReadonlyArray<string>;
  /** Explicit negative boundary fences (excluded units) */
  readonly excludedUnits?: ReadonlyArray<string>;
  /** Explicit boundary constraints */
  readonly boundaryConstraints?: ReadonlyArray<string>;
  /** Whether scope inflation protection is enabled (defaults to true; required by Axiom 6) */
  readonly scopeInflationProtection?: boolean;
}

/**
 * Structured outcome resulting from evaluating candidate entities against scope boundaries.
 */
export interface ScopeCheckResult {
  /** True if all evaluated units or targets reside strictly within declared scope */
  readonly allowed: boolean;
  /** Units confirmed to reside within explicit included_units */
  readonly inScopeUnits: ReadonlyArray<string>;
  /** Units evaluated that were not found in included_units */
  readonly outOfScopeUnits: ReadonlyArray<string>;
  /** Units evaluated that matched an explicit negative boundary fence (excluded_units) */
  readonly excludedUnitsEncountered: ReadonlyArray<string>;
  /** Bound failure condition if rejected (e.g. Condition 20) */
  readonly condition?: string;
  /** Explanatory rejection narrative */
  readonly violationReason?: string;
  /** Identifier of the evaluated subject, test case, or profile */
  readonly evaluatedSubject?: string;
}

/**
 * Minimal structural interfaces for scoped validation entities consumed by ScopeEnforcer.
 */
export interface ScopedTestCaseInput {
  readonly case_id?: string;
  readonly title?: string;
  readonly validation_subject?: string;
  readonly scoped_boundaries?: ReadonlyArray<string>;
}

export interface ScopedProfileInput {
  readonly profile_id?: string;
  readonly target_component_class?: string;
  readonly applicability_rules?: ReadonlyArray<string>;
}

export interface ScopedFixtureInput {
  readonly fixture_id?: string;
  readonly fixture_name?: string;
  readonly declared_applicability_scope?: ReadonlyArray<string>;
}

export interface ScopedExecutionInput {
  readonly gear_id?: string;
  readonly routing_topology?: string;
  readonly genre?: string;
  readonly sample_rate?: string | number;
  readonly tested_units?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Governed Error Hierarchy for Phase 1C.5h Scope Boundaries
// ---------------------------------------------------------------------------

/**
 * Error thrown when validation scope derivation fails due to intake invalidity,
 * conflicting boundaries, or missing mandatory scope metadata.
 */
export class ScopeDerivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeDerivationError";
    Object.setPrototypeOf(this, ScopeDerivationError.prototype);
  }
}

/**
 * Error thrown when a scope definition contains wildcards or ambiguous boundary tokens.
 * Enforces Invariant 6 and Axiom 6: "The authorization engine rejects wildcard authorizations."
 */
export class ScopeWildcardRejectionError extends Error {
  readonly prohibitedToken?: string;

  constructor(message: string, prohibitedToken?: string) {
    super(message);
    this.name = "ScopeWildcardRejectionError";
    this.prohibitedToken = prohibitedToken;
    Object.setPrototypeOf(this, ScopeWildcardRejectionError.prototype);
  }
}

/**
 * Error thrown by interceptors when an out-of-scope evaluation is attempted,
 * triggering Condition 20 (Requested Production Authorization Scope Exceeds Tested Scope).
 */
export class ScopeInflationError extends Error {
  readonly condition: string = SCOPE_FAILURE_CONDITIONS.CONDITION_20;
  readonly outOfScopeUnits: ReadonlyArray<string>;
  readonly excludedUnits: ReadonlyArray<string>;

  constructor(
    message: string,
    outOfScopeUnits: ReadonlyArray<string> = [],
    excludedUnits: ReadonlyArray<string> = []
  ) {
    super(message);
    this.name = "ScopeInflationError";
    this.outOfScopeUnits = outOfScopeUnits;
    this.excludedUnits = excludedUnits;
    Object.setPrototypeOf(this, ScopeInflationError.prototype);
  }
}
