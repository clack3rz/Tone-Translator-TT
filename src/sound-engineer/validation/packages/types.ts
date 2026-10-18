// src/sound-engineer/validation/packages/types.ts
// Authoritative type definitions and interfaces for Phase 1C.5h WP-09:
// Validation Package (Record 6) Composition & Sealing Engine.
// Bound to frozen specification v0.1j Section 11, Section 13, and Implementation Plan v0.1h WP-09.

import {
  READINESS_OUTCOMES,
  ReadinessOutcome,
  TEST_PROFILE_FAMILIES,
  TestProfileFamily,
} from "../schemas/enums";
import {
  RecordIntegrityMetadata,
  IntegrityProvider,
} from "../schemas/integrity";
import {
  ValidationCase,
  ValidationPackage,
  ValidationReadinessAssessmentRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { ProfileApplicabilityEngine } from "../profiles/applicabilityEngine";
import { TestProfileRepository } from "../profiles/profileRepository";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import { ValidationSubjectKind } from "../cases/types";

export {
  READINESS_OUTCOMES,
  type ReadinessOutcome,
  TEST_PROFILE_FAMILIES,
  type TestProfileFamily,
  type ValidationCase,
  type ValidationPackage,
  type ValidationReadinessAssessmentRecord,
  type ValidationScopeRecord,
  type ValidationVersionBindingRecord,
  type ValidationSubjectKind,
};

/**
 * Result of mandatory and optional test profile coverage evaluation across package cases.
 */
export interface PackageCoverageResult {
  /** True if every mandatory profile required for the package's scope is covered by at least one case */
  readonly isComplete: boolean;
  /** All mandatory test profile identifiers required for this package */
  readonly mandatoryProfiles: readonly string[];
  /** Test profile identifiers covered by at least one registered ValidationCase */
  readonly coveredProfiles: readonly string[];
  /** Mandatory profiles that have zero case coverage (must be empty for sealing to succeed) */
  readonly uncoveredMandatoryProfiles: readonly string[];
  /** Optional profiles covered by registered cases */
  readonly optionalProfilesCovered: readonly string[];
  /** Human-scannable diagnostic log of coverage evaluation */
  readonly diagnostics: readonly string[];
}

/**
 * Governed sealed envelope wrapping an immutable Record 6 ValidationPackage with its tamper-evident seal.
 * Preserves the exact signed-off WP-01 ValidationPackage machine schema without unofficial field pollution.
 */
export interface SealedValidationPackageEnvelope {
  /** The immutable Record 6 ValidationPackage */
  readonly packageRecord: ValidationPackage;
  /** Cryptographic integrity seal over canonical package content */
  readonly integrityMetadata: RecordIntegrityMetadata;
  /** ISO 8601 UTC timestamp of sealing */
  readonly sealedAt: string;
  /** Total number of validation cases aggregated in this package */
  readonly caseCount: number;
  /** Complete profile coverage audit result */
  readonly coverage: PackageCoverageResult;
}

/**
 * Dependencies injected into ValidationPackageComposer.
 */
export interface PackageComposerDependencies {
  readonly scopeRecord?: ValidationScopeRecord;
  readonly versionBinding?: ValidationVersionBindingRecord;
  readonly readinessRecord?: ValidationReadinessAssessmentRecord;
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly applicabilityEngine?: ProfileApplicabilityEngine;
  readonly profileRepository?: TestProfileRepository;
  readonly fixtureManager?: FixtureCorpusManager;
  readonly integrityProvider?: IntegrityProvider;
}

/**
 * Options controlling package sealing.
 */
export interface PackageSealingOptions {
  /** Optional explicit package_id; derived deterministically if omitted */
  readonly package_id?: string;
  /** Optional ISO 8601 UTC timestamp of sealing; defaults to current time */
  readonly timestamp?: string;
  /** Optional signer identity for the integrity seal */
  readonly signerIdentity?: string;
}

/**
 * Thrown when general package composition preconditions are violated.
 */
export class PackageCompositionError extends Error {
  constructor(message: string) {
    super(`[PACKAGE COMPOSITION ERROR] ${message}`);
    this.name = "PackageCompositionError";
  }
}

/**
 * Thrown when a package is missing case coverage for one or more mandatory test profiles.
 */
export class PackageCoverageError extends Error {
  constructor(
    message: string,
    public readonly uncoveredMandatoryProfiles: readonly string[]
  ) {
    super(`[PACKAGE COVERAGE ERROR] ${message}`);
    this.name = "PackageCoverageError";
  }
}

/**
 * Thrown when package composition is attempted against an unready or blocked readiness state.
 */
export class PackageReadinessError extends Error {
  constructor(message: string, public readonly readinessOutcome?: ReadinessOutcome) {
    super(`[PACKAGE READINESS ERROR] ${message}`);
    this.name = "PackageReadinessError";
  }
}

/**
 * Thrown when scope and version binding mismatch or cross-scope package contamination is attempted.
 */
export class PackageScopeBindingMismatchError extends Error {
  constructor(message: string) {
    super(`[PACKAGE SCOPE BINDING MISMATCH ERROR] ${message}`);
    this.name = "PackageScopeBindingMismatchError";
  }
}

/**
 * Thrown when a fixture referenced in a case has become contaminated, suspect, or invalidated before seal time.
 */
export class PackageFixtureInvalidatedError extends Error {
  constructor(message: string, public readonly fixtureId: string) {
    super(`[PACKAGE FIXTURE INVALIDATED ERROR] ${message}`);
    this.name = "PackageFixtureInvalidatedError";
  }
}

/**
 * Thrown when an illegal mutation is attempted on an already sealed ValidationPackage.
 */
export class PackageSealedMutationError extends Error {
  constructor(message: string) {
    super(`[PACKAGE SEALED MUTATION ERROR] ${message}`);
    this.name = "PackageSealedMutationError";
  }
}
