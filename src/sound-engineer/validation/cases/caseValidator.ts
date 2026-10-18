// src/sound-engineer/validation/cases/caseValidator.ts
// Bounded, explicit, and falsifiable validation rule checks for ValidationCase (Record 5).
// Bound to frozen specification v0.1j Section 11, Section 13, and Invariant 2.

import { validationCaseSchema, type ValidationCase, type ValidationScopeRecord } from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import { ScopeInflationError } from "../scope/types";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import {
  CaseAcceptanceCriteriaError,
  CaseFalsifiabilityError,
  CaseFixtureError,
  CaseScopeViolationError,
  CaseValidationError,
  type CaseValidationResult,
  type ValidationCaseInput,
} from "./types";

/**
 * List of forbidden vague phrases that violate the Falsifiability invariant.
 * Validation questions containing these phrases cannot be empirically proven false.
 */
const FORBIDDEN_VAGUE_PHRASES = [
  "sound good",
  "sounds good",
  "sound better",
  "sounds better",
  "sound great",
  "sounds great",
  "sound nice",
  "sounds nice",
  "sound fine",
  "sounds fine",
  "sound acceptable",
  "sounds acceptable",
  "sound okay",
  "sounds okay",
  "is it better",
  "is it good",
  "is it okay",
  "is it fine",
  "is the system acceptable",
  "is it acceptable",
  "works well",
  "working well",
  "looks good",
  "high quality",
  "good tone",
  "great tone",
  "nice tone",
];

/**
 * Regex matching direct universal hardcoded numeric literals/thresholds.
 * Direct numeric criteria without a governed reference are strictly forbidden.
 */
const BARE_NUMERIC_THRESHOLD_PATTERN =
  /^[<>=~±≤≥]?\s*[-+]?\s*[\d.]+\s*(?:db|dbfs|ms|s|hz|khz|%|samples)?$/i;

/**
 * Validates that a validation question is bounded, explicit, and falsifiable.
 * Rejects empty, whitespace-only, or subjective/vague phrasing.
 */
export function validateCaseFalsifiability(
  question: string,
  title?: string
): { valid: boolean; reason?: string } {
  if (!question || typeof question !== "string") {
    return {
      valid: false,
      reason: "Validation question must be a non-empty string.",
    };
  }

  const trimmed = question.trim();
  if (trimmed.length < 15) {
    return {
      valid: false,
      reason: `Validation question is too short (${trimmed.length} chars, minimum 15 required). A falsifiable question must declare a subject, condition/method, and measurable/perceptual determination.`,
    };
  }

  const lower = trimmed.toLowerCase();
  for (const vague of FORBIDDEN_VAGUE_PHRASES) {
    if (lower.includes(vague)) {
      return {
        valid: false,
        reason: `Subjective or unfalsifiable phrasing detected ("${vague}"). Questions must ask a falsifiable engineering question (e.g. preset loading, transient preservation, tolerance compliance, recovery objective).`,
      };
    }
  }

  // Must declare a question or explicit evaluation condition
  const hasQuestionMark = trimmed.endsWith("?");
  const startsWithCondition = /^(does|is|are|will|can|verify|evaluate|ensure|confirm|test|measure|validate)\b/i.test(
    trimmed
  );

  if (!hasQuestionMark && !startsWithCondition) {
    return {
      valid: false,
      reason: `Validation question must either end with '?' or begin with an interrogative/evaluation condition verb (e.g. Does, Is, Are, Verify, Evaluate). Provided: "${trimmed}"`,
    };
  }

  return { valid: true };
}

/**
 * Validates that the acceptance criteria is a governed reference rather than a hardcoded universal numeric threshold.
 * Enforces Cardinal Rule: "NO UNIVERSAL NUMERIC VALIDATION THRESHOLD MAY BE FROZEN WITHOUT DOMAIN-SPECIFIC EMPIRICAL JUSTIFICATION."
 */
export function validateAcceptanceCriteriaRef(
  criteriaRef: string
): { valid: boolean; reason?: string } {
  if (!criteriaRef || typeof criteriaRef !== "string" || criteriaRef.trim() === "") {
    return {
      valid: false,
      reason: "acceptance_criteria_ref must not be empty.",
    };
  }

  const trimmed = criteriaRef.trim();

  // Strictly reject bare numeric literals or thresholds
  if (BARE_NUMERIC_THRESHOLD_PATTERN.test(trimmed)) {
    return {
      valid: false,
      reason: `Direct universal numeric threshold "${trimmed}" is forbidden. Acceptance criteria must be a governed reference (e.g. "TOL_SPECTRAL_DELTA_V1", "REF_RECOVERY_OBJECTIVE_STD", "SPEC_PRESET_XML_V12").`,
    };
  }

  // Must contain identifiable governed reference tokens
  const hasAlphabetic = /[a-zA-Z]/.test(trimmed);
  if (!hasAlphabetic) {
    return {
      valid: false,
      reason: `Acceptance criteria "${trimmed}" must be a named governed reference identifier containing alphabetic characters.`,
    };
  }

  return { valid: true };
}

/**
 * Asserts that a ValidationCase strictly resides within its parent ValidationScopeRecord.
 * Throws CaseScopeViolationError if the subject or scoped boundaries exceed declared scope.
 */
export function validateCaseScope(
  caseInput: ValidationCase | ValidationCaseInput,
  scopeRecord: ValidationScopeRecord
): void {
  const enforcer = new ScopeEnforcer(scopeRecord);
  try {
    const check = enforcer.validateTestCaseScope({
      validation_subject: caseInput.validation_subject,
      scoped_boundaries: caseInput.scoped_boundaries,
      case_id: caseInput.case_id,
      title: caseInput.title,
    });

    if (!check.allowed) {
      throw new CaseScopeViolationError(
        check.violationReason ?? `Case exceeds declared scope "${scopeRecord.scope_id}"`,
        check.outOfScopeUnits[0] ?? check.excludedUnitsEncountered[0]
      );
    }
  } catch (err: unknown) {
    if (err instanceof ScopeInflationError) {
      throw new CaseScopeViolationError(err.message, err.outOfScopeUnits[0] ?? err.excludedUnits[0]);
    }
    if (err instanceof CaseScopeViolationError) {
      throw err;
    }
    throw new CaseScopeViolationError(
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Audits and verifies all fixture references associated with a case against WP-08.
 * Rejects contaminated, suspect, superseded, invalidated, retired, off-scope, or missing fixtures.
 */
export function validateCaseFixtures(
  fixtureIds: readonly string[],
  fixtureManager: FixtureCorpusManager,
  scopeRecord?: ValidationScopeRecord
): void {
  if (!fixtureIds || fixtureIds.length === 0) {
    return;
  }

  for (const fixId of fixtureIds) {
    if (!fixtureManager.hasFixture(fixId)) {
      throw new CaseFixtureError(
        `Referenced fixture "${fixId}" does not exist in the golden fixture corpus.`,
        fixId
      );
    }

    const audit = fixtureManager.auditFixture(fixId);
    if (!audit.valid || !audit.isUsableForActiveTesting) {
      const reason = audit.errors.length > 0 ? audit.errors.join("; ") : "Fixture is quarantined or non-active.";
      throw new CaseFixtureError(
        `Referenced fixture "${fixId}" is not eligible for active testing: ${reason}`,
        fixId
      );
    }

    if (scopeRecord) {
      const scopeCheck = fixtureManager.isFixtureApplicableToScope(fixId, scopeRecord);
      if (!scopeCheck.isApplicable) {
        throw new CaseFixtureError(
          `Referenced fixture "${fixId}" is off-scope for validation scope "${scopeRecord.scope_id}": ${scopeCheck.rejectionReason}`,
          fixId
        );
      }
    }
  }
}

/**
 * Validates complete schema, structural, and falsifiability rules for a ValidationCase.
 */
export function validateCaseCompleteness(input: unknown): CaseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parseResult = validationCaseSchema.safeParse(input);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push(`Field '${issue.path.join(".")}': ${issue.message}`);
    }
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const record: ValidationCase = parseResult.data;

  // 1. Falsifiability
  const falsifiability = validateCaseFalsifiability(record.validation_question, record.title);
  if (!falsifiability.valid) {
    errors.push(`validation_question: ${falsifiability.reason}`);
  }

  // 2. Acceptance Criteria
  const criteria = validateAcceptanceCriteriaRef(record.acceptance_criteria_ref);
  if (!criteria.valid) {
    errors.push(`acceptance_criteria_ref: ${criteria.reason}`);
  }

  // 3. Scoped boundaries non-empty
  if (!record.scoped_boundaries || record.scoped_boundaries.length === 0) {
    errors.push("scoped_boundaries must contain at least one bounded unit identifier.");
  }

  // 4. Dimensions non-empty
  if (!record.applicable_test_dimensions || record.applicable_test_dimensions.length === 0) {
    errors.push("applicable_test_dimensions must contain at least one test profile dimension.");
  }

  // 5. Evidence classes
  if (!record.required_evidence_classes || record.required_evidence_classes.length === 0) {
    errors.push("required_evidence_classes must declare at least one evidence class.");
  }

  // 6. Methodology
  if (!record.evaluation_methodology || record.evaluation_methodology.trim() === "") {
    errors.push("evaluation_methodology must not be empty.");
  }

  // 7. Failure consequence
  if (!record.failure_consequence || record.failure_consequence.trim() === "") {
    errors.push("failure_consequence must declare a concrete failure consequence.");
  }

  // 8. Expected remand destination
  if (!record.expected_remand_destination || record.expected_remand_destination.trim() === "") {
    errors.push("expected_remand_destination must declare an upstream remand destination.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validationCase: errors.length === 0 ? record : undefined,
  };
}
