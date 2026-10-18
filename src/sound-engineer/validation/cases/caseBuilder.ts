// src/sound-engineer/validation/cases/caseBuilder.ts
// ValidationCaseBuilder: Constructs bounded, explicit, falsifiable validation cases (Record 5).
// Bound to frozen specification v0.1j Section 11, Section 13, and Invariant 2.

import { deepFreeze } from "../../contracts/immutability";
import { parseValidationCase, type ValidationCase, type ValidationScopeRecord, type ValidationVersionBindingRecord } from "../schemas/records";
import { type IntegrityProvider } from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import {
  validateAcceptanceCriteriaRef,
  validateCaseFalsifiability,
  validateCaseFixtures,
  validateCaseScope,
} from "./caseValidator";
import {
  CaseAcceptanceCriteriaError,
  type CaseBuilderDependencies,
  CaseFalsifiabilityError,
  CaseValidationError,
  type ValidationCaseInput,
} from "./types";

/**
 * Normalizes an arbitrary text string into a clean lowercase hyphenated slug.
 */
function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

import { TestProfileRepository } from "../profiles/profileRepository";

/**
 * ValidationCaseBuilder: Builder for atomic Record 5 ValidationCase entities.
 * Enforces scope containment (WP-04), version binding alignment (WP-05),
 * fixture eligibility (WP-08), and falsifiability discipline.
 */
export class ValidationCaseBuilder {
  private scopeRecord?: ValidationScopeRecord;
  private versionBinding?: ValidationVersionBindingRecord;
  private fixtureManager?: FixtureCorpusManager;
  private readonly profileRepository: TestProfileRepository;
  private readonly integrityProvider: IntegrityProvider;

  constructor(dependencies: CaseBuilderDependencies = {}) {
    this.scopeRecord = dependencies.scopeRecord;
    this.versionBinding = dependencies.versionBinding;
    this.fixtureManager = dependencies.fixtureManager;
    this.profileRepository = dependencies.profileRepository ?? new TestProfileRepository();
    this.integrityProvider = dependencies.integrityProvider ?? new DefaultSha256IntegrityProvider();

    // Verify scope and version binding match if both provided
    if (this.scopeRecord && this.versionBinding) {
      this.assertScopeBindingMatch(this.scopeRecord, this.versionBinding);
    }
  }

  /**
   * Sets or updates the active ValidationScopeRecord.
   */
  public setScope(scope: ValidationScopeRecord): this {
    if (this.versionBinding) {
      this.assertScopeBindingMatch(scope, this.versionBinding);
    }
    this.scopeRecord = scope;
    return this;
  }

  /**
   * Sets or updates the active ValidationVersionBindingRecord.
   */
  public setVersionBinding(binding: ValidationVersionBindingRecord): this {
    if (this.scopeRecord) {
      this.assertScopeBindingMatch(this.scopeRecord, binding);
    }
    this.versionBinding = binding;
    return this;
  }

  /**
   * Sets or updates the FixtureCorpusManager for fixture verification.
   */
  public setFixtureManager(fixtureManager: FixtureCorpusManager): this {
    this.fixtureManager = fixtureManager;
    return this;
  }

  /**
   * Builds an immutable, verified, schema-conformant ValidationCase.
   */
  public buildCase(input: ValidationCaseInput): ValidationCase {
    if (!input) {
      throw new CaseValidationError("Case input must be provided.");
    }
    if (!input.title || input.title.trim() === "") {
      throw new CaseValidationError("title must not be empty.", "title");
    }
    if (!input.validation_subject || input.validation_subject.trim() === "") {
      throw new CaseValidationError("validation_subject must not be empty.", "validation_subject");
    }

    // 1. Falsifiability enforcement
    const falsifiability = validateCaseFalsifiability(input.validation_question, input.title);
    if (!falsifiability.valid) {
      throw new CaseFalsifiabilityError(falsifiability.reason!, input.validation_question);
    }

    // 2. Acceptance criteria ref enforcement (rejects hardcoded universal numeric thresholds)
    const criteria = validateAcceptanceCriteriaRef(input.acceptance_criteria_ref);
    if (!criteria.valid) {
      throw new CaseAcceptanceCriteriaError(criteria.reason!, input.acceptance_criteria_ref);
    }

    // 3. Scoped boundaries completeness
    if (!input.scoped_boundaries || input.scoped_boundaries.length === 0) {
      throw new CaseValidationError(
        "scoped_boundaries must contain at least one bounded unit identifier.",
        "scoped_boundaries"
      );
    }

    // 4. Applicable test dimensions completeness
    if (!input.applicable_test_dimensions || input.applicable_test_dimensions.length === 0) {
      throw new CaseValidationError(
        "applicable_test_dimensions must contain at least one test profile dimension.",
        "applicable_test_dimensions"
      );
    }
    for (const dim of input.applicable_test_dimensions) {
      if (!this.profileRepository.hasProfile(dim)) {
        throw new CaseValidationError(
          `Unrecognized test profile dimension: "${dim}". Applicable dimensions must derive from canonical TestProfiles.`,
          "applicable_test_dimensions"
        );
      }
    }

    // 5. Required evidence classes completeness
    if (!input.required_evidence_classes || input.required_evidence_classes.length === 0) {
      throw new CaseValidationError(
        "required_evidence_classes must declare at least one evidence class (OBJECTIVE | PERCEPTUAL | OPERATIONAL | MIXED).",
        "required_evidence_classes"
      );
    }

    // 6. Evaluation methodology completeness
    if (!input.evaluation_methodology || input.evaluation_methodology.trim() === "") {
      throw new CaseValidationError(
        "evaluation_methodology must not be empty.",
        "evaluation_methodology"
      );
    }

    // 7. Failure consequence completeness
    if (!input.failure_consequence || input.failure_consequence.trim() === "") {
      throw new CaseValidationError(
        "failure_consequence must declare a concrete failure consequence.",
        "failure_consequence"
      );
    }

    // 8. Expected remand destination completeness
    if (!input.expected_remand_destination || input.expected_remand_destination.trim() === "") {
      throw new CaseValidationError(
        "expected_remand_destination must declare an upstream remand destination.",
        "expected_remand_destination"
      );
    }

    // 9. Scope containment check (WP-04)
    if (this.scopeRecord) {
      validateCaseScope(input, this.scopeRecord);
    }

    // 10. Fixture references check (WP-08)
    const fixtureSet = input.associated_fixture_set ?? [];
    if (this.fixtureManager && fixtureSet.length > 0) {
      validateCaseFixtures(fixtureSet, this.fixtureManager, this.scopeRecord);
    }

    // 11. Deterministic case ID generation
    const caseId = input.case_id && input.case_id.trim() !== ""
      ? input.case_id.trim()
      : this.deriveDeterministicCaseId(input);

    // 12. Assemble record and parse through strict WP-01 schema
    const rawRecord = {
      case_id: caseId,
      title: input.title.trim(),
      validation_question: input.validation_question.trim(),
      validation_subject: input.validation_subject.trim(),
      scoped_boundaries: [...input.scoped_boundaries.map((s) => s.trim())],
      applicable_test_dimensions: [...input.applicable_test_dimensions.map((d) => d.trim())],
      required_evidence_classes: [...input.required_evidence_classes],
      associated_fixture_set: [...fixtureSet.map((f) => f.trim())],
      evaluation_methodology: input.evaluation_methodology.trim(),
      acceptance_criteria_ref: input.acceptance_criteria_ref.trim(),
      failure_consequence: input.failure_consequence.trim(),
      expected_remand_destination: input.expected_remand_destination.trim(),
    };

    const validated = parseValidationCase(rawRecord);
    return deepFreeze(validated);
  }

  /**
   * Derives a deterministic, tamper-evident case identifier based on case content.
   */
  private deriveDeterministicCaseId(input: ValidationCaseInput): string {
    const dimensionTag = input.applicable_test_dimensions[0]
      ? toSlug(input.applicable_test_dimensions[0])
      : "dim";
    const subjectTag = toSlug(input.validation_subject);

    const canonicalInput = {
      scopeId: this.scopeRecord?.scope_id ?? "generic",
      subject: input.validation_subject.trim(),
      question: input.validation_question.trim(),
      dimensions: [...input.applicable_test_dimensions].sort(),
      methodology: input.evaluation_methodology.trim(),
      criteriaRef: input.acceptance_criteria_ref.trim(),
      remand: input.expected_remand_destination.trim(),
    };

    const digest = this.integrityProvider.computeDigest(canonicalInput);
    const cleanHash = digest.replace(/^sha256:/i, "").slice(0, 10);

    return `CASE-${dimensionTag.toUpperCase()}-${subjectTag.toUpperCase()}-${cleanHash}`;
  }

  /**
   * Asserts that the supplied ValidationScopeRecord and ValidationVersionBindingRecord reference the same scope.
   */
  private assertScopeBindingMatch(
    scope: ValidationScopeRecord,
    binding: ValidationVersionBindingRecord
  ): void {
    if (binding.scope_id !== scope.scope_id) {
      throw new Error(
        `Version binding mismatch: binding "${binding.binding_id}" is bound to scope "${binding.scope_id}", but active scope is "${scope.scope_id}".`
      );
    }
  }
}
