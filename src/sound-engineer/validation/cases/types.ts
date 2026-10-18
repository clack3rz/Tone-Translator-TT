// src/sound-engineer/validation/cases/types.ts
// Authoritative type definitions and interfaces for Phase 1C.5h WP-09:
// Validation Case (Record 5) Construction & Falsifiability Engine.
// Bound to frozen specification v0.1j Section 11, Section 13, and Implementation Plan v0.1h WP-09.

import {
  REQUIRED_EVIDENCE_CLASSES,
  RequiredEvidenceClass,
  TEST_PROFILE_FAMILIES,
  TestProfileFamily,
} from "../schemas/enums";
import {
  ValidationCase,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";

export {
  REQUIRED_EVIDENCE_CLASSES,
  type RequiredEvidenceClass,
  TEST_PROFILE_FAMILIES,
  type TestProfileFamily,
  type ValidationCase,
  type ValidationScopeRecord,
  type ValidationVersionBindingRecord,
};

/**
 * Governed target entity kind for the VALIDATES relationship edge:
 * ValidationCase -> MigrationCandidate | ReasoningComponent
 */
export type ValidationSubjectKind = "MigrationCandidate" | "ReasoningComponent";

/**
 * Input definition for constructing a single bounded, explicit, falsifiable ValidationCase.
 */
export interface ValidationCaseInput {
  /** Optional deterministic case identifier; auto-generated deterministically if omitted */
  readonly case_id?: string;
  /** Explicit descriptive title for the validation case */
  readonly title: string;
  /**
   * Bounded, explicit, falsifiable validation question.
   * Must declare target subject, condition/method, and measurable/perceptual determination.
   * Vague questions ("Does it sound good?", "Is it better?") are strictly rejected.
   */
  readonly validation_question: string;
  /** Exact candidate unit or component being validated */
  readonly validation_subject: string;
  /** Governed target entity kind for the canonical VALIDATES edge */
  readonly subjectKind?: ValidationSubjectKind;
  /**
   * Bounded topological/unit boundaries within declared scope.
   * Must strictly reside within scope included_units; cannot include excluded_units.
   */
  readonly scoped_boundaries: readonly string[];
  /** Standardized test profile families or dimensions from WP-07 */
  readonly applicable_test_dimensions: readonly string[];
  /** Required evidence categories (OBJECTIVE | PERCEPTUAL | OPERATIONAL | MIXED) */
  readonly required_evidence_classes: readonly RequiredEvidenceClass[];
  /** Governed fixture references (verified through WP-08); empty array when profile permits no fixtures */
  readonly associated_fixture_set?: readonly string[];
  /** Concrete testing methodology (declaration only; execution is deferred to WP-10+) */
  readonly evaluation_methodology: string;
  /**
   * Governed reference to tolerance profile, recovery objective, or latency budget.
   * Direct universal hardcoded numeric literals are strictly prohibited.
   */
  readonly acceptance_criteria_ref: string;
  /** Declarative consequence if this case fails (e.g. blocks cutover, requires re-engineering) */
  readonly failure_consequence: string;
  /**
   * Intended upstream engineering or governance destination on failure.
   * Declarative only: no REMANDS_TO edge is created in WP-09.
   */
  readonly expected_remand_destination: string;
}

/**
 * Structural completeness and falsifiability validation result for a ValidationCase.
 */
export interface CaseValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly validationCase?: ValidationCase;
}

import { TestProfileRepository } from "../profiles/profileRepository";

/**
 * Dependencies injected into ValidationCaseBuilder.
 */
export interface CaseBuilderDependencies {
  readonly scopeRecord?: ValidationScopeRecord;
  readonly versionBinding?: ValidationVersionBindingRecord;
  readonly fixtureManager?: FixtureCorpusManager;
  readonly profileRepository?: TestProfileRepository;
  readonly integrityProvider?: IntegrityProvider;
}

/**
 * Thrown when a validation case fails schema, structural, or field completeness rules.
 */
export class CaseValidationError extends Error {
  constructor(message: string, public readonly fieldName?: string) {
    super(`[VALIDATION CASE VALIDATION ERROR] ${message}`);
    this.name = "CaseValidationError";
  }
}

/**
 * Thrown when a validation question is empty, vague, or non-falsifiable.
 */
export class CaseFalsifiabilityError extends Error {
  constructor(message: string, public readonly questionText?: string) {
    super(`[CASE FALSIFIABILITY ERROR] ${message}`);
    this.name = "CaseFalsifiabilityError";
  }
}

/**
 * Thrown when an acceptance criteria reference is missing or attempts to use a bare numeric threshold.
 */
export class CaseAcceptanceCriteriaError extends Error {
  constructor(message: string, public readonly criteriaRef?: string) {
    super(`[CASE ACCEPTANCE CRITERIA ERROR] ${message}`);
    this.name = "CaseAcceptanceCriteriaError";
  }
}

/**
 * Thrown when a case attempts to evaluate an out-of-scope or excluded unit.
 */
export class CaseScopeViolationError extends Error {
  constructor(message: string, public readonly unitId?: string) {
    super(`[CASE SCOPE VIOLATION ERROR] ${message}`);
    this.name = "CaseScopeViolationError";
  }
}

/**
 * Thrown when a case references a fixture that is contaminated, suspect, off-scope, or missing.
 */
export class CaseFixtureError extends Error {
  constructor(message: string, public readonly fixtureId?: string) {
    super(`[CASE FIXTURE ERROR] ${message}`);
    this.name = "CaseFixtureError";
  }
}
