// src/sound-engineer/validation/packages/coverageValidator.ts
// Profile coverage matrix evaluation engine for Phase 1C.5h WP-09.
// Verifies that every mandatory test profile has at least one associated ValidationCase.
// Bound to frozen specification v0.1j Section 13, Table 05, and Table 07.

import { ValidationCase, ValidationScopeRecord } from "../schemas/records";
import { ProfileApplicabilityEngine } from "../profiles/applicabilityEngine";
import { TestProfileRepository } from "../profiles/profileRepository";
import { PackageCompositionError, PackageCoverageResult } from "./types";

/**
 * Normalizes an arbitrary profile query key to its canonical profile_id.
 */
function resolveCanonicalProfileId(
  idOrFamily: string,
  repository: TestProfileRepository
): string | undefined {
  const profile = repository.getProfile(idOrFamily);
  return profile ? profile.profile_id : undefined;
}

/**
 * Evaluates the profile coverage matrix across an aggregated suite of ValidationCase records.
 *
 * Rules:
 * 1. For each candidate subject or unit in the declared scope, computes mandatory and optional profiles
 *    via ProfileApplicabilityEngine (WP-07).
 * 2. Compares mandatory requirements against the union of `applicable_test_dimensions` across all cases.
 * 3. Sealing is permitted only if `uncoveredMandatoryProfiles` is empty (100% mandatory coverage).
 * 4. Optional profiles do not block sealing if omitted.
 */
export function evaluatePackageProfileCoverage(options: {
  cases: readonly ValidationCase[];
  scopeRecord: ValidationScopeRecord;
  explicitAssignedProfiles?: readonly string[];
  applicabilityEngine?: ProfileApplicabilityEngine;
  profileRepository?: TestProfileRepository;
}): PackageCoverageResult {
  const { cases, scopeRecord, explicitAssignedProfiles } = options;
  const repository = options.profileRepository ?? new TestProfileRepository();
  const engine = options.applicabilityEngine ?? new ProfileApplicabilityEngine(repository);

  const diagnostics: string[] = [];
  const mandatoryProfileIds = new Set<string>();
  const optionalProfileIds = new Set<string>();

  // 1. Determine mandatory and optional profile requirements for the package scope
  if (explicitAssignedProfiles && explicitAssignedProfiles.length > 0) {
    for (const p of explicitAssignedProfiles) {
      const canonical = resolveCanonicalProfileId(p, repository);
      if (canonical) {
        mandatoryProfileIds.add(canonical);
      } else {
        throw new PackageCompositionError(
          `Unrecognized test profile identifier in explicit assignment: "${p}". Profile references must be canonical WP-07 profiles.`
        );
      }
    }
  } else {
    // Derive mandatory profiles across all included units in the declared scope
    const subjectsToEvaluate: string[] = [
      ...new Set([
        ...scopeRecord.included_units,
        ...cases.map((c) => c.validation_subject),
      ]),
    ];

    for (const subject of subjectsToEvaluate) {
      // Evaluate applicability for subject within scope
      const evalResult = engine.evaluateApplicability({
        subjectId: subject,
        componentClass: subject,
        unitId: subject,
        scopeRecord,
      });

      if (evalResult.isResolved && evalResult.isScopeAllowed) {
        for (const p of evalResult.mandatoryProfiles) {
          mandatoryProfileIds.add(p.profile_id);
        }
        for (const p of evalResult.optionalProfiles) {
          optionalProfileIds.add(p.profile_id);
        }
      }
    }

    // If scope domain has recognized baseline profiles (e.g. Structural Schema is baseline for all candidates)
    if (mandatoryProfileIds.size === 0) {
      // At minimum, Profile 01 (Structural Schema) applies to any validation scope
      const p1 = repository.getProfile("PROFILE-01");
      if (p1) mandatoryProfileIds.add(p1.profile_id);
    }
  }

  // 2. Tally covered dimensions across all provided cases
  const coveredProfileIds = new Set<string>();

  for (const c of cases) {
    for (const dim of c.applicable_test_dimensions) {
      const canonical = resolveCanonicalProfileId(dim, repository);
      if (canonical) {
        coveredProfileIds.add(canonical);
      } else {
        throw new PackageCompositionError(
          `Case "${c.case_id}" references non-canonical or unrecognized profile dimension "${dim}".`
        );
      }
    }
  }

  // 3. Compute coverage gaps
  const uncoveredMandatory: string[] = [];
  for (const mand of mandatoryProfileIds) {
    if (!coveredProfileIds.has(mand)) {
      uncoveredMandatory.push(mand);
      diagnostics.push(
        `Mandatory profile "${mand}" is uncovered. At least one ValidationCase must target this profile.`
      );
    }
  }

  const optionalCovered: string[] = [];
  for (const opt of optionalProfileIds) {
    if (coveredProfileIds.has(opt)) {
      optionalCovered.push(opt);
    }
  }

  const isComplete = uncoveredMandatory.length === 0;

  return {
    isComplete,
    mandatoryProfiles: Object.freeze(Array.from(mandatoryProfileIds).sort()),
    coveredProfiles: Object.freeze(Array.from(coveredProfileIds).sort()),
    uncoveredMandatoryProfiles: Object.freeze(uncoveredMandatory.sort()),
    optionalProfilesCovered: Object.freeze(optionalCovered.sort()),
    diagnostics: Object.freeze(diagnostics),
  };
}
