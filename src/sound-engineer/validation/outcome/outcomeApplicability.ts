// src/sound-engineer/validation/outcome/outcomeApplicability.ts
// Phase 1C.5h WP-19: Test Profile Applicability Evaluation and Complete Accounting Engine.
// Integrates directly with WP-07 ProfileApplicabilityEngine and TestProfileRepository.
// Rejects universal scorecards; excludes non-applicable profiles from blocking PASS;
// enforces that 100% of applicable assigned profiles are executed and accounted for.

import { ProfileApplicabilityEngine } from "../profiles/applicabilityEngine";
import { TestProfileRepository } from "../profiles/profileRepository";
import { COMPONENT_CLASSES, ProfileApplicabilityResult } from "../profiles/types";
import { VALIDATION_PRIMARY_DOMAINS } from "../schemas/enums";
import { TestProfileRecord } from "../schemas/records";
import { SynthesizeOutcomeInput } from "./outcomeTypes";

export interface OutcomeApplicabilityAssessment {
  readonly applicabilityResult: ProfileApplicabilityResult;
  readonly isResolved: boolean;
  readonly unresolvedReason?: string;
  readonly applicableProfileIds: ReadonlyArray<string>;
  readonly nonApplicableProfileIds: ReadonlyArray<string>;
  readonly executedProfileIds: ReadonlyArray<string>;
  readonly missingApplicableProfileIds: ReadonlyArray<string>;
  readonly hasCompleteCoverage: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

/**
 * Robust profile lookup supporting arbitrary query key conventions (e.g. "profile:01_structural_schema").
 */
function lookupProfile(repository: TestProfileRepository, key: string): TestProfileRecord | undefined {
  if (!key) return undefined;
  const direct = repository.getProfile(key);
  if (direct) return direct;
  const cleaned = key.replace(/:/g, "_");
  const byCleaned = repository.getProfile(cleaned);
  if (byCleaned) return byCleaned;
  const lower = key.toLowerCase();
  if (lower.startsWith("profile")) {
    const numMatch = key.match(/\d+/);
    if (numMatch) {
      const pad = numMatch[0].padStart(2, "0");
      return repository.getProfile(`PROFILE-${pad}`) ?? repository.getProfile(`PROFILE-${numMatch[0]}`);
    }
  }
  return undefined;
}

/**
 * Derives fit-for-purpose Table 05 component class from scope record domain and included units.
 */
function inferComponentClass(input: SynthesizeOutcomeInput): string {
  const domain = input.scopeRecord.primary_domain;

  if (domain === VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY) {
    const units = (input.scopeRecord.included_units || []).map((u) => u.toLowerCase());
    if (units.some((u) => u.includes("amp") && u.includes("cab"))) {
      return COMPONENT_CLASSES.CORE_GUITAR_PRESET;
    }
    if (units.some((u) => u.includes("amp"))) {
      return COMPONENT_CLASSES.AMP_MODEL;
    }
    if (units.some((u) => u.includes("cab"))) {
      return COMPONENT_CLASSES.CABINET_EMULATOR;
    }
    return COMPONENT_CLASSES.CORE_GUITAR_PRESET;
  }

  if (domain === VALIDATION_PRIMARY_DOMAINS.PLATFORM_EXPORT) {
    return COMPONENT_CLASSES.PRESET_EXPORTER;
  }

  if (domain === VALIDATION_PRIMARY_DOMAINS.END_TO_END_WORKFLOW) {
    return COMPONENT_CLASSES.COMPLETE_GUITAR_TONE;
  }

  if (domain === VALIDATION_PRIMARY_DOMAINS.REASONING_CAPABILITY) {
    return "AI Reasoning Run";
  }

  // Pass through directly to allow fail-closed handling if unknown/unsupported
  return domain;
}

export class OutcomeApplicabilityEvaluator {
  private readonly engine: ProfileApplicabilityEngine;
  private readonly repository: TestProfileRepository;

  constructor(engine?: ProfileApplicabilityEngine, repository?: TestProfileRepository) {
    this.repository = repository ?? new TestProfileRepository();
    this.engine = engine ?? new ProfileApplicabilityEngine(this.repository);
  }

  /**
   * Evaluates fit-for-purpose profile applicability and complete accounting for the candidate package.
   */
  public evaluate(input: SynthesizeOutcomeInput): OutcomeApplicabilityAssessment {
    let result = input.applicabilityResult;

    if (!result) {
      const componentClass = inferComponentClass(input);
      const primaryUnit = input.scopeRecord.included_units[0] ?? input.scopeRecord.scope_id;

      result = this.engine.evaluateApplicability({
        subjectId: input.packageRecord.package_id,
        componentClass,
        unitId: primaryUnit,
        scopeRecord: input.scopeRecord,
      });
    }

    // 1. Missing or failed applicability resolution strictly fails closed
    if (!result.isResolved || !result.isScopeAllowed) {
      const reason =
        result.unresolvedReason ??
        result.scopeViolationReason ??
        "Applicability resolution failed closed; component class unknown or outside scope.";
      return {
        applicabilityResult: result,
        isResolved: false,
        unresolvedReason: reason,
        applicableProfileIds: [],
        nonApplicableProfileIds: result.nonApplicableProfiles.map((p) => p.profile_id),
        executedProfileIds: [],
        missingApplicableProfileIds: [],
        hasCompleteCoverage: false,
        diagnostics: [`Applicability resolution failure: ${reason}`],
      };
    }

    // 2. Identify all non-applicable canonical profile IDs
    const nonApplicableCanonicalIds = new Set(
      result.nonApplicableProfiles.map((p) => p.profile_id)
    );

    // 3. Reconcile with package assigned profiles
    // Applicable assigned profiles = assigned profiles that are NOT non-applicable
    const assignedProfiles = input.packageRecord.assigned_test_profiles;
    const applicableProfileIds: string[] = [];
    const diagnostics: string[] = [];

    for (const assigned of assignedProfiles) {
      const canonicalProfile = lookupProfile(this.repository, assigned);
      const canonicalId = canonicalProfile ? canonicalProfile.profile_id : assigned;

      if (nonApplicableCanonicalIds.has(canonicalId)) {
        diagnostics.push(
          `Profile "${assigned}" (${canonicalId}) is classified as NON_APPLICABLE for subject domain "${result.componentClass}"; legitimately excluded from PASS requirement set.`
        );
      } else {
        applicableProfileIds.push(assigned);
      }
    }

    // 4. Complete Accounting Rule: verify every applicable assigned profile is executed and accounted for
    const executedCanonicalIds = new Set<string>();

    if (input.executionRecords) {
      for (const exec of input.executionRecords) {
        const profId = exec.profile_id;
        if (profId) {
          const canonical = lookupProfile(this.repository, profId);
          if (canonical) {
            executedCanonicalIds.add(canonical.profile_id);
          }
          executedCanonicalIds.add(profId);
        }
      }
    }

    const missingApplicableProfileIds: string[] = [];
    for (const app of applicableProfileIds) {
      const canonical = lookupProfile(this.repository, app);
      const canonicalId = canonical ? canonical.profile_id : app;

      const isExecuted =
        executedCanonicalIds.has(canonicalId) ||
        executedCanonicalIds.has(app) ||
        (input.executionRecords &&
          input.executionRecords.some((e) => {
            const eCanon = lookupProfile(this.repository, e.profile_id)?.profile_id;
            return eCanon === canonicalId || e.profile_id === app;
          }));

      if (!isExecuted) {
        missingApplicableProfileIds.push(app);
      }
    }

    const hasCompleteCoverage = missingApplicableProfileIds.length === 0;

    if (!hasCompleteCoverage) {
      diagnostics.push(
        `Complete accounting failure: Missing execution/evidence for applicable assigned profiles: ${missingApplicableProfileIds.join(", ")}.`
      );
    } else {
      diagnostics.push(
        `100% of applicable assigned profiles accounted for (${applicableProfileIds.length} profiles).`
      );
    }

    return {
      applicabilityResult: result,
      isResolved: true,
      applicableProfileIds,
      nonApplicableProfileIds: Array.from(nonApplicableCanonicalIds),
      executedProfileIds: Array.from(executedCanonicalIds),
      missingApplicableProfileIds,
      hasCompleteCoverage,
      diagnostics,
    };
  }
}
