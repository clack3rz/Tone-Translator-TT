// src/sound-engineer/validation/packages/packageComposer.ts
// ValidationPackageComposer: Aggregates validation cases into a governed, sealed ValidationPackage (Record 6).
// Bound to frozen specification v0.1j Section 11, Section 13, and Implementation Plan v0.1h WP-09.

import { deepFreeze } from "../../contracts/immutability";
import {
  parseValidationPackage,
  type ValidationCase,
  type ValidationPackage,
  type ValidationReadinessAssessmentRecord,
  type ValidationScopeRecord,
  type ValidationVersionBindingRecord,
} from "../schemas/records";
import { READINESS_OUTCOMES } from "../schemas/enums";
import { type IntegrityProvider, type RecordIntegrityMetadata } from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { GOVERNED_EDGE_TYPES, GOVERNED_ENTITY_KINDS, type GovernedEntityKind } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { ProfileApplicabilityEngine } from "../profiles/applicabilityEngine";
import { TestProfileRepository } from "../profiles/profileRepository";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import { validateCaseScope } from "../cases/caseValidator";
import { evaluatePackageProfileCoverage } from "./coverageValidator";
import {
  PackageCompositionError,
  PackageCoverageError,
  PackageFixtureInvalidatedError,
  PackageReadinessError,
  PackageSealedMutationError,
  PackageScopeBindingMismatchError,
  type PackageComposerDependencies,
  type PackageSealingOptions,
  type SealedValidationPackageEnvelope,
  type ValidationSubjectKind,
} from "./types";

/**
 * Normalizes text to a clean alphanumeric slug.
 */
function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * ValidationPackageComposer: Composes and seals immutable Record 6 ValidationPackage envelopes.
 * Enforces one-package = one-scope = one-binding invariant, complete mandatory profile coverage,
 * seal-time fixture re-verification, and graph/ledger governance.
 */
export class ValidationPackageComposer {
  private scopeRecord?: ValidationScopeRecord;
  private versionBinding?: ValidationVersionBindingRecord;
  private readinessRecord?: ValidationReadinessAssessmentRecord;
  private readonly cases: Map<string, ValidationCase> = new Map();
  private readonly subjectKinds: Map<string, ValidationSubjectKind> = new Map();
  private explicitAssignedProfiles?: readonly string[];

  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly applicabilityEngine: ProfileApplicabilityEngine;
  private readonly profileRepository: TestProfileRepository;
  private readonly fixtureManager: FixtureCorpusManager;
  private readonly integrityProvider: IntegrityProvider;

  private sealed = false;
  private sealedEnvelope?: SealedValidationPackageEnvelope;

  constructor(dependencies: PackageComposerDependencies = {}) {
    this.scopeRecord = dependencies.scopeRecord;
    this.versionBinding = dependencies.versionBinding;
    this.readinessRecord = dependencies.readinessRecord;
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.profileRepository = dependencies.profileRepository ?? new TestProfileRepository();
    this.applicabilityEngine =
      dependencies.applicabilityEngine ?? new ProfileApplicabilityEngine(this.profileRepository);
    this.fixtureManager = dependencies.fixtureManager ?? new FixtureCorpusManager({ loadBootstrapCorpus: false });
    this.integrityProvider = dependencies.integrityProvider ?? new DefaultSha256IntegrityProvider();

    if (this.scopeRecord && this.versionBinding) {
      this.assertScopeBindingMatch(this.scopeRecord, this.versionBinding);
    }
  }

  /**
   * Sets or replaces the authorized ValidationScopeRecord and bound ValidationVersionBindingRecord.
   * Enforces: "A ValidationPackage must correspond to one accepted intake, declared scope, and version binding."
   */
  public setScopeAndBinding(
    scope: ValidationScopeRecord,
    binding: ValidationVersionBindingRecord
  ): this {
    if (this.sealed) {
      throw new PackageSealedMutationError(
        "Cannot set scope and binding on an already sealed ValidationPackage."
      );
    }
    this.assertScopeBindingMatch(scope, binding);
    this.scopeRecord = scope;
    this.versionBinding = binding;
    return this;
  }

  /**
   * Sets or replaces the pre-validation readiness assessment record (WP-06).
   */
  public setReadiness(readiness: ValidationReadinessAssessmentRecord): this {
    if (this.sealed) {
      throw new PackageSealedMutationError(
        "Cannot set readiness assessment on an already sealed ValidationPackage."
      );
    }
    this.readinessRecord = readiness;
    return this;
  }

  /**
   * Explicitly sets assigned test profiles for this package.
   */
  public setAssignedProfiles(profiles: readonly string[]): this {
    if (this.sealed) {
      throw new PackageSealedMutationError(
        "Cannot set assigned profiles on an already sealed ValidationPackage."
      );
    }
    for (const p of profiles) {
      if (!this.profileRepository.hasProfile(p)) {
        throw new PackageCompositionError(
          `Unrecognized test profile identifier: "${p}". Profile references must be canonical WP-07 profiles.`
        );
      }
    }
    this.explicitAssignedProfiles = Object.freeze([...profiles]);
    return this;
  }

  /**
   * Adds a validated ValidationCase into the package.
   * Asserts scope containment and verifies that package is not already sealed.
   */
  public addCase(
    caseRecord: ValidationCase,
    subjectKind: ValidationSubjectKind = "MigrationCandidate"
  ): this {
    if (this.sealed) {
      throw new PackageSealedMutationError(
        `Cannot add case "${caseRecord.case_id}" to an already sealed ValidationPackage.`
      );
    }
    if (!caseRecord || !caseRecord.case_id) {
      throw new PackageCompositionError("Invalid ValidationCase: case_id must be provided.");
    }

    // Verify scope containment if scope is set
    if (this.scopeRecord) {
      validateCaseScope(caseRecord, this.scopeRecord);
    }

    this.cases.set(caseRecord.case_id, deepFreeze(caseRecord));
    this.subjectKinds.set(caseRecord.case_id, subjectKind);
    return this;
  }

  /**
   * Adds multiple ValidationCases in batch.
   */
  public addCases(
    caseRecords: readonly ValidationCase[],
    subjectKind: ValidationSubjectKind = "MigrationCandidate"
  ): this {
    for (const c of caseRecords) {
      this.addCase(c, subjectKind);
    }
    return this;
  }

  /**
   * Returns true if this package has been sealed.
   */
  public isSealed(): boolean {
    return this.sealed;
  }

  /**
   * Returns the array of ValidationCases currently registered in this composer.
   */
  public getCases(): readonly ValidationCase[] {
    return Object.freeze(Array.from(this.cases.values()));
  }

  /**
   * Returns the sealed ValidationPackage record, or undefined if unsealed.
   */
  public getPackage(): ValidationPackage | undefined {
    return this.sealedEnvelope?.packageRecord;
  }

  /**
   * Returns the complete sealed envelope, or undefined if unsealed.
   */
  public getSealedEnvelope(): SealedValidationPackageEnvelope | undefined {
    return this.sealedEnvelope;
  }

  /**
   * Seals the package into an immutable, verifiable Record 6 entity.
   *
   * Verifications enforced prior to sealing:
   * 1. Package is not already sealed.
   * 2. ScopeRecord and VersionBindingRecord are configured and match.
   * 3. At least one ValidationCase is present.
   * 4. Readiness outcome is not BLOCKED_NOT_EVALUABLE.
   * 5. Seal-time fixture re-verification (Special Test: Fixture Revalidation Race).
   * 6. Mandatory test profile coverage completeness (Special Test: Profile Coverage).
   * 7. Registers graph nodes and canonical VALIDATES and BOUND_TO edges (zero TESTED_WITH edges).
   * 8. Appends records and edges to the ValidationAuditLedger.
   */
  public sealPackage(options: PackageSealingOptions = {}): SealedValidationPackageEnvelope {
    if (this.sealed && this.sealedEnvelope) {
      throw new PackageSealedMutationError("ValidationPackage has already been sealed.");
    }

    // 1. Scope & Binding checks
    if (!this.scopeRecord) {
      throw new PackageCompositionError(
        "Cannot seal package: scopeRecord has not been configured."
      );
    }
    if (!this.versionBinding) {
      throw new PackageCompositionError(
        "Cannot seal package: versionBinding has not been configured."
      );
    }
    this.assertScopeBindingMatch(this.scopeRecord, this.versionBinding);

    // 2. Non-empty cases check
    if (this.cases.size === 0) {
      throw new PackageCompositionError(
        "Cannot seal empty validation package: package must contain at least one ValidationCase."
      );
    }

    const allCases = Array.from(this.cases.values());

    // 3. Readiness check (WP-06)
    if (this.readinessRecord) {
      if (this.readinessRecord.readiness_outcome === READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE) {
        throw new PackageReadinessError(
          `Cannot compose or seal validation package: readiness status is BLOCKED_NOT_EVALUABLE. Deficiencies must be remediated upstream.`,
          this.readinessRecord.readiness_outcome
        );
      }
      if (this.readinessRecord.readiness_outcome === READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS) {
        const notes = this.readinessRecord.limitation_notes ?? [];
        for (const c of allCases) {
          for (const note of notes) {
            const lowerNote = note.toLowerCase();
            const subject = c.validation_subject.toLowerCase();
            if (
              lowerNote.includes(subject) &&
              (lowerNote.includes("limited") ||
                lowerNote.includes("blocked") ||
                lowerNote.includes("unevaluable") ||
                lowerNote.includes("exclude") ||
                lowerNote.includes("omitted"))
            ) {
              throw new PackageReadinessError(
                `Case "${c.case_id}" targets subject "${c.validation_subject}" which is unevaluable under declared readiness limitation: "${note}". Composition must respect the bounded evaluable subset.`,
                this.readinessRecord.readiness_outcome
              );
            }
            for (const b of c.scoped_boundaries) {
              const boundaryUnit = b.toLowerCase();
              if (
                lowerNote.includes(boundaryUnit) &&
                (lowerNote.includes("limited") ||
                  lowerNote.includes("blocked") ||
                  lowerNote.includes("unevaluable") ||
                  lowerNote.includes("exclude") ||
                  lowerNote.includes("omitted"))
              ) {
                throw new PackageReadinessError(
                  `Case "${c.case_id}" boundary "${b}" is unevaluable under declared readiness limitation: "${note}". Composition must respect the bounded evaluable subset.`,
                  this.readinessRecord.readiness_outcome
                );
              }
            }
          }
        }
      }
    }

    // 4. Seal-time Fixture Re-verification (Invariant 4 / Anti-Contamination Gate)
    // Ensures fixtures marked CONTAMINATED, SUSPECT, SUPERSEDED, or INVALIDATED fail closed at seal time
    for (const c of allCases) {
      if (c.associated_fixture_set && c.associated_fixture_set.length > 0) {
        for (const fixId of c.associated_fixture_set) {
          if (!this.fixtureManager.hasFixture(fixId)) {
            throw new PackageFixtureInvalidatedError(
              `Fixture "${fixId}" in case "${c.case_id}" does not exist in fixture corpus at seal time.`,
              fixId
            );
          }
          const audit = this.fixtureManager.auditFixture(fixId);
          if (!audit.valid || !audit.isUsableForActiveTesting) {
            const reason = audit.errors.length > 0 ? audit.errors.join("; ") : "Fixture is quarantined or non-active.";
            throw new PackageFixtureInvalidatedError(
              `Fixture "${fixId}" in case "${c.case_id}" is no longer valid or eligible for active testing at package seal time: ${reason}`,
              fixId
            );
          }
          if (audit.lifecycleStatus !== "ACTIVE") {
            throw new PackageFixtureInvalidatedError(
              `Fixture "${fixId}" in case "${c.case_id}" is in non-active lifecycle state "${audit.lifecycleStatus}" at seal time.`,
              fixId
            );
          }
          if (audit.contaminationStatus !== "CLEAN") {
            throw new PackageFixtureInvalidatedError(
              `Fixture "${fixId}" in case "${c.case_id}" has contamination status "${audit.contaminationStatus}" at seal time.`,
              fixId
            );
          }
        }
      }
    }

    // 5. Mandatory Profile Coverage Evaluation
    const coverage = evaluatePackageProfileCoverage({
      cases: allCases,
      scopeRecord: this.scopeRecord,
      explicitAssignedProfiles: this.explicitAssignedProfiles,
      applicabilityEngine: this.applicabilityEngine,
      profileRepository: this.profileRepository,
    });

    if (!coverage.isComplete) {
      throw new PackageCoverageError(
        `Package sealing rejected: mandatory profile coverage is incomplete. Missing case coverage for mandatory profile(s): [${coverage.uncoveredMandatoryProfiles.join(
          ", "
        )}]. Every mandatory profile must have at least one valid case before sealing.`,
        coverage.uncoveredMandatoryProfiles
      );
    }

    // 6. Derive deterministic package_id if not provided
    const packageId = options.package_id && options.package_id.trim() !== ""
      ? options.package_id.trim()
      : this.deriveDeterministicPackageId(allCases, coverage);

    const timestamp = options.timestamp ?? new Date().toISOString();

    // 7. Assemble Record 6 ValidationPackage
    // Downstream execution_record_refs and evidence_refs MUST be empty arrays at composition time!
    // outcome_record_ref and gate8_decision_ref MUST be undefined!
    const canonicalAssignedProfiles = Array.from(
      new Set([
        ...coverage.mandatoryProfiles,
        ...coverage.coveredProfiles,
        ...(this.explicitAssignedProfiles?.map((p) => this.profileRepository.getProfile(p)?.profile_id ?? p) ?? []),
      ])
    ).sort();

    const rawPackageRecord = {
      package_id: packageId,
      intake_id: this.scopeRecord.intake_id,
      scope_record_ref: this.scopeRecord.scope_id,
      version_binding_ref: this.versionBinding.binding_id,
      assigned_test_profiles: canonicalAssignedProfiles,
      validation_case_refs: allCases.map((c) => c.case_id).sort(),
      execution_record_refs: [], // Downstream field: strictly empty during WP-09 composition
      evidence_refs: [], // Downstream field: strictly empty during WP-09 composition
      outcome_record_ref: undefined,
      gate8_decision_ref: undefined,
    };

    const validatedPackage = parseValidationPackage(rawPackageRecord);

    // 8. Compute integrity metadata seal over canonical package content
    const digest = this.integrityProvider.computeDigest(validatedPackage);
    const integrityMetadata: RecordIntegrityMetadata = deepFreeze({
      integrity_digest: digest,
      algorithm: this.integrityProvider.algorithmName,
      sealed_at: timestamp,
      signer_identity: options.signerIdentity ?? "Phase1C5h_ValidationPackageComposer",
      canonical_serialization_format: "CANONICAL-JSON-RFC-8785",
    });

    // 9. Register nodes and governed edges in the relationship graph
    if (this.graph) {
      this.registerInGraph(validatedPackage, allCases);
    }

    // 10. Persist into the append-only tamper-evident audit ledger
    if (this.ledger) {
      this.recordInLedger(validatedPackage, allCases, timestamp);
    }

    this.sealed = true;
    this.sealedEnvelope = deepFreeze({
      packageRecord: validatedPackage,
      integrityMetadata,
      sealedAt: timestamp,
      caseCount: allCases.length,
      coverage,
    });

    return this.sealedEnvelope;
  }

  /**
   * Registers package, case, binding, and subject nodes and adds canonical VALIDATES and BOUND_TO edges.
   * CRITICAL GOVERNANCE:
   * 1. Creates VALIDATES edges: ValidationCase -> MigrationCandidate | ReasoningComponent
   * 2. Creates BOUND_TO edges: ValidationCase -> ValidationVersionBindingRecord
   * 3. Creates BOUND_TO edges: ValidationPackage -> ValidationVersionBindingRecord
   * 4. ZERO TESTED_WITH edges created (TESTED_WITH belongs strictly to WP-10 execution).
   */
  private registerInGraph(pkg: ValidationPackage, cases: readonly ValidationCase[]): void {
    if (!this.graph || !this.versionBinding) return;

    // A. Register nodes
    this.graph.registerNode({
      id: pkg.package_id,
      kind: GOVERNED_ENTITY_KINDS.ValidationPackage,
    });

    this.graph.registerNode({
      id: this.versionBinding.binding_id,
      kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
    });

    for (const c of cases) {
      this.graph.registerNode({
        id: c.case_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationCase,
      });

      const subjectKind: GovernedEntityKind =
        this.subjectKinds.get(c.case_id) === "ReasoningComponent"
          ? GOVERNED_ENTITY_KINDS.ReasoningComponent
          : GOVERNED_ENTITY_KINDS.MigrationCandidate;

      this.graph.registerNode({
        id: c.validation_subject,
        kind: subjectKind,
      });
    }

    // B. Add canonical edges
    // 1. BOUND_TO: ValidationPackage -> ValidationVersionBindingRecord
    const pkgBindingEdge = this.graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.BOUND_TO,
      source: { id: pkg.package_id, kind: GOVERNED_ENTITY_KINDS.ValidationPackage },
      target: {
        id: this.versionBinding.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      },
    });
    if (this.ledger) {
      this.ledger.appendEdge(pkgBindingEdge);
    }

    // 2. For each case: VALIDATES edge & BOUND_TO edge
    for (const c of cases) {
      const subjectKind: GovernedEntityKind =
        this.subjectKinds.get(c.case_id) === "ReasoningComponent"
          ? GOVERNED_ENTITY_KINDS.ReasoningComponent
          : GOVERNED_ENTITY_KINDS.MigrationCandidate;

      // VALIDATES: ValidationCase -> MigrationCandidate | ReasoningComponent
      const validatesEdge = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.VALIDATES,
        source: { id: c.case_id, kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        target: { id: c.validation_subject, kind: subjectKind },
      });
      if (this.ledger) {
        this.ledger.appendEdge(validatesEdge);
      }

      // BOUND_TO: ValidationCase -> ValidationVersionBindingRecord
      const caseBindingEdge = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.BOUND_TO,
        source: { id: c.case_id, kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        target: {
          id: this.versionBinding.binding_id,
          kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
        },
      });
      if (this.ledger) {
        this.ledger.appendEdge(caseBindingEdge);
      }
    }
  }

  /**
   * Appends records into the append-only validation audit ledger.
   */
  private recordInLedger(
    pkg: ValidationPackage,
    cases: readonly ValidationCase[],
    timestamp: string
  ): void {
    if (!this.ledger) return;

    // Append each ValidationCase
    for (const c of cases) {
      this.ledger.appendRecord(GOVERNED_ENTITY_KINDS.ValidationCase, c.case_id, c, timestamp);
    }

    // Append ValidationPackage
    this.ledger.appendRecord(GOVERNED_ENTITY_KINDS.ValidationPackage, pkg.package_id, pkg, timestamp);
  }

  /**
   * Derives a deterministic package ID based on scope, binding, and case refs.
   */
  private deriveDeterministicPackageId(
    cases: readonly ValidationCase[],
    coverage: { mandatoryProfiles: readonly string[] }
  ): string {
    const scopeTag = toSlug(this.scopeRecord?.scope_id ?? "scope");
    const bindingSnippet = (this.versionBinding?.binding_id ?? "bnd")
      .replace(/^bnd_/i, "")
      .slice(0, 8);

    const canonicalState = {
      scopeId: this.scopeRecord?.scope_id,
      bindingId: this.versionBinding?.binding_id,
      caseIds: cases.map((c) => c.case_id).sort(),
      mandatoryProfiles: [...coverage.mandatoryProfiles].sort(),
    };

    const digest = this.integrityProvider.computeDigest(canonicalState);
    const cleanHash = digest.replace(/^sha256:/i, "").slice(0, 10);

    return `PKG-${scopeTag.toUpperCase()}-${bindingSnippet.toUpperCase()}-${cleanHash}`;
  }

  /**
   * Asserts scope and version binding match.
   */
  private assertScopeBindingMatch(
    scope: ValidationScopeRecord,
    binding: ValidationVersionBindingRecord
  ): void {
    if (binding.scope_id !== scope.scope_id) {
      throw new PackageScopeBindingMismatchError(
        `Version binding mismatch: binding "${binding.binding_id}" is locked to scope "${binding.scope_id}", but package is configured with scope "${scope.scope_id}". Under Invariant 2, package composition cannot cross scope boundaries.`
      );
    }
  }
}
