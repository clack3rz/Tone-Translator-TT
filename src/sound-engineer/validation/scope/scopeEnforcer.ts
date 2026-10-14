// src/sound-engineer/validation/scope/scopeEnforcer.ts
// ScopeEnforcer: Interceptor and boundary gatekeeper enforcing Phase 1C.5h scope isolation.
// Strictly blocks any test case, stem, fixture, profile, or evaluation attempting to evaluate
// gear, topologies, or units outside declared included_units or within negative boundary fences.
// Bound to frozen specification v0.1j Section 9, Table 18, Condition 20, and Implementation Plan v0.1h WP-04.

import { deepFreeze } from "../../contracts/immutability";
import { ValidationCase, ValidationFixtureRecord, TestProfileRecord, ValidationScopeRecord } from "../schemas/records";
import {
  SCOPE_FAILURE_CONDITIONS,
  ScopeCheckResult,
  ScopedExecutionInput,
  ScopedFixtureInput,
  ScopedProfileInput,
  ScopedTestCaseInput,
  ScopeInflationError,
} from "./types";

/**
 * Reusable interceptor for Phase 1C.5h scope isolation and inflation protection.
 * Prevents downstream validation artifacts and Gate 8 cutover petitions from exceeding
 * the explicitly tested and verified boundary.
 */
export class ScopeEnforcer {
  public readonly scopeRecord: ValidationScopeRecord;
  private readonly includedSet: Set<string>;
  private readonly includedNormalizedSet: Set<string>;
  private readonly excludedSet: Set<string>;
  private readonly excludedNormalizedSet: Set<string>;

  constructor(scopeRecord: ValidationScopeRecord) {
    this.scopeRecord = deepFreeze(scopeRecord);

    this.includedSet = new Set(this.scopeRecord.included_units.map((u) => u.trim()));
    this.includedNormalizedSet = new Set(
      this.scopeRecord.included_units.map((u) => u.trim().toLowerCase())
    );

    this.excludedSet = new Set(this.scopeRecord.excluded_units.map((u) => u.trim()));
    this.excludedNormalizedSet = new Set(
      this.scopeRecord.excluded_units.map((u) => u.trim().toLowerCase())
    );
  }

  /**
   * Returns the underlying immutable ValidationScopeRecord.
   */
  public getScopeRecord(): ValidationScopeRecord {
    return this.scopeRecord;
  }

  /**
   * Returns the scope identifier.
   */
  public get scopeId(): string {
    return this.scopeRecord.scope_id;
  }

  /**
   * Returns the parent intake identifier.
   */
  public get intakeId(): string {
    return this.scopeRecord.intake_id;
  }

  /**
   * Checks whether a unit identifier resides within the authorized scope.
   */
  public isWithinScope(unitId: string): boolean {
    if (!unitId || typeof unitId !== "string") {
      return false;
    }
    const trimmed = unitId.trim();
    const normalized = trimmed.toLowerCase();

    // 1. Negative boundary check: Explicitly excluded units are never within scope
    if (this.excludedSet.has(trimmed) || this.excludedNormalizedSet.has(normalized)) {
      return false;
    }

    // 2. Inflation Protection check: Unit must be explicitly included
    if (this.scopeRecord.scope_inflation_protection) {
      return this.includedSet.has(trimmed) || this.includedNormalizedSet.has(normalized);
    }

    return true;
  }

  /**
   * Checks whether a unit identifier matches an explicit negative boundary fence.
   */
  public isExplicitlyExcluded(unitId: string): boolean {
    if (!unitId || typeof unitId !== "string") {
      return false;
    }
    const trimmed = unitId.trim();
    const normalized = trimmed.toLowerCase();
    return this.excludedSet.has(trimmed) || this.excludedNormalizedSet.has(normalized);
  }

  /**
   * Asserts that a single unit resides strictly within declared scope.
   * Throws ScopeInflationError with Condition 20 if out of scope.
   */
  public assertWithinScope(unitId: string, context?: string): void {
    if (!this.isWithinScope(unitId)) {
      const isExcluded = this.isExplicitlyExcluded(unitId);
      const reason = isExcluded
        ? `Unit "${unitId}" matches an explicit negative boundary fence (excluded_units) in scope "${this.scopeRecord.scope_id}".`
        : `Unit "${unitId}" is not present in declared included_units for scope "${this.scopeRecord.scope_id}". Scope inflation protection is active.`;

      throw new ScopeInflationError(
        `[${SCOPE_FAILURE_CONDITIONS.CONDITION_20}] ${reason}${context ? ` (Context: ${context})` : ""}`,
        isExcluded ? [] : [unitId],
        isExcluded ? [unitId] : []
      );
    }
  }

  /**
   * Asserts that an array of units all reside strictly within declared scope.
   * Throws ScopeInflationError with Condition 20 detailing all violations if any unit fails.
   */
  public assertAllWithinScope(unitIds: ReadonlyArray<string>, context?: string): void {
    const result = this.checkUnits(unitIds);
    if (!result.allowed) {
      throw new ScopeInflationError(
        `[${SCOPE_FAILURE_CONDITIONS.CONDITION_20}] ${result.violationReason}${context ? ` (Context: ${context})` : ""}`,
        result.outOfScopeUnits,
        result.excludedUnitsEncountered
      );
    }
  }

  /**
   * Evaluates an arbitrary list of candidate units against scope boundaries without throwing.
   */
  public checkUnits(
    unitIds: string | ReadonlyArray<string>,
    subjectIdentifier?: string
  ): ScopeCheckResult {
    const rawList = Array.from(new Set(Array.isArray(unitIds) ? unitIds : [unitIds]));
    const inScope: string[] = [];
    const outOfScope: string[] = [];
    const excluded: string[] = [];

    for (const raw of rawList) {
      if (typeof raw !== "string" || raw.trim() === "") continue;
      const unit = raw.trim();

      if (this.isExplicitlyExcluded(unit)) {
        if (!excluded.includes(unit)) {
          excluded.push(unit);
        }
      } else if (this.isWithinScope(unit)) {
        if (!inScope.includes(unit)) {
          inScope.push(unit);
        }
      } else {
        if (!outOfScope.includes(unit)) {
          outOfScope.push(unit);
        }
      }
    }

    const allowed = outOfScope.length === 0 && excluded.length === 0;

    let violationReason: string | undefined;
    if (!allowed) {
      const parts: string[] = [];
      if (outOfScope.length > 0) {
        parts.push(`Units not in declared scope: [${outOfScope.join(", ")}]`);
      }
      if (excluded.length > 0) {
        parts.push(`Units matching negative boundary fences: [${excluded.join(", ")}]`);
      }
      violationReason = `Scope boundary violation: ${parts.join("; ")}. Under Axiom 6 and Table 18, evaluation and authorization are strictly limited to declared included_units.`;
    }

    return {
      allowed,
      inScopeUnits: deepFreeze(inScope),
      outOfScopeUnits: deepFreeze(outOfScope),
      excludedUnitsEncountered: deepFreeze(excluded),
      condition: allowed ? undefined : SCOPE_FAILURE_CONDITIONS.CONDITION_20,
      violationReason,
      evaluatedSubject: subjectIdentifier,
    };
  }

  /**
   * Validates a ValidationCase or scoped test case input against declared scope boundaries.
   * Intercepts test cases attempting to evaluate gear or topologies outside scope.
   */
  public validateTestCaseScope(testCase: ValidationCase | ScopedTestCaseInput): ScopeCheckResult {
    const unitsToCheck: string[] = [];

    if (testCase.validation_subject && testCase.validation_subject.trim() !== "") {
      unitsToCheck.push(testCase.validation_subject.trim());
    }

    if (testCase.scoped_boundaries && Array.isArray(testCase.scoped_boundaries)) {
      for (const b of testCase.scoped_boundaries) {
        if (b && typeof b === "string" && b.trim() !== "") {
          unitsToCheck.push(b.trim());
        }
      }
    }

    const check = this.checkUnits(unitsToCheck, testCase.case_id ?? testCase.title ?? "validation_case");
    if (!check.allowed) {
      return {
        ...check,
        violationReason: `ValidationCase "${testCase.case_id ?? testCase.title ?? 'unnamed'}" exceeds declared scope: ${check.violationReason}`,
      };
    }
    return check;
  }

  /**
   * Validates a TestProfileRecord or scoped profile input against declared scope boundaries.
   * Intercepts test profiles referencing out-of-scope gear or target component classes.
   */
  public validateTestProfileScope(profile: TestProfileRecord | ScopedProfileInput): ScopeCheckResult {
    const unitsToCheck: string[] = [];

    if (profile.target_component_class && profile.target_component_class.trim() !== "") {
      unitsToCheck.push(profile.target_component_class.trim());
    }

    if (profile.applicability_rules && Array.isArray(profile.applicability_rules)) {
      for (const rule of profile.applicability_rules) {
        if (typeof rule === "string" && rule.trim() !== "") {
          // If rule explicitly names a component or gear ID, check if it references excluded units
          for (const exc of this.scopeRecord.excluded_units) {
            if (rule.toLowerCase().includes(exc.toLowerCase())) {
              unitsToCheck.push(exc);
            }
          }
        }
      }
    }

    const check = this.checkUnits(unitsToCheck, profile.profile_id ?? "test_profile");
    if (!check.allowed) {
      return {
        ...check,
        violationReason: `TestProfile "${profile.profile_id ?? 'unnamed'}" references out-of-scope gear/components: ${check.violationReason}`,
      };
    }
    return check;
  }

  /**
   * Validates a ValidationFixtureRecord against declared scope boundaries.
   * Blocks fixtures whose declared applicability scope resides outside the validation scope.
   */
  public validateFixtureScope(fixture: ValidationFixtureRecord | ScopedFixtureInput): ScopeCheckResult {
    const scopes = fixture.declared_applicability_scope ?? [];
    const check = this.checkUnits(scopes, fixture.fixture_id ?? fixture.fixture_name ?? "fixture");
    if (!check.allowed) {
      return {
        ...check,
        violationReason: `ValidationFixture "${fixture.fixture_id ?? 'unnamed'}" declared applicability scope exceeds scope boundaries: ${check.violationReason}`,
      };
    }
    return check;
  }

  /**
   * Validates runtime execution parameters against declared scope boundaries.
   */
  public validateExecutionScope(executionParams: ScopedExecutionInput): ScopeCheckResult {
    const unitsToCheck: string[] = [];

    if (executionParams.gear_id) unitsToCheck.push(executionParams.gear_id);
    if (executionParams.routing_topology) unitsToCheck.push(executionParams.routing_topology);
    if (executionParams.genre) unitsToCheck.push(executionParams.genre);
    if (executionParams.sample_rate !== undefined) {
      unitsToCheck.push(String(executionParams.sample_rate));
    }
    if (executionParams.tested_units && Array.isArray(executionParams.tested_units)) {
      unitsToCheck.push(...executionParams.tested_units);
    }

    return this.checkUnits(unitsToCheck, executionParams.gear_id ?? "execution_run");
  }

  /**
   * Validates a requested Gate 8 production cutover authorization scope against the tested scope.
   * Implements Table 18 Scope Inflation Guard and Condition 20:
   * "Immediate Governance Action: Trigger Scope Inflation Protection; refuse global authorization;
   * restrict authorized scope strictly to tested boundary."
   */
  public validateAdoptionScope(requestedUnits: ReadonlyArray<string>): ScopeCheckResult {
    const check = this.checkUnits(requestedUnits, "Gate 8 Adoption Authorization Petition");
    if (!check.allowed) {
      return {
        ...check,
        violationReason: `Scope inflation detected: requested production authorization scope contains untested units [${check.outOfScopeUnits.join(', ')}]. Under Condition 20 and Axiom 6, authorization is strictly prohibited from exceeding the tested boundary.`,
      };
    }
    return check;
  }
}
