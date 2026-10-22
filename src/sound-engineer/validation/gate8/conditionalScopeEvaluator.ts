// src/sound-engineer/validation/gate8/conditionalScopeEvaluator.ts
// Scope carve-out, exclusion verification, and boundary containment evaluator for Phase 1C.5h WP-23.
// Enforces:
// 1. conditional authorized scope <= requested scope <= tested scope
// 2. conditional authorized scope INTERSECT excluded scope = EMPTY
// 3. Exclusions are explicit and deterministic; silent omissions are strictly prohibited.
// Bound to frozen specification v0.1j Section 27, Table 18, and Build Plan v0.1h WP-23.

import { deepFreeze } from "../../contracts/immutability";
import { ValidationScopeRecord } from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import {
  ConditionalScopeContainmentError,
  InvalidConditionalConstraintError,
} from "./conditionalErrors";

export interface ConditionalScopeResult {
  readonly requestedScope: readonly string[];
  readonly testedScope: readonly string[];
  readonly authorizedScope: readonly string[];
  readonly excludedScope: readonly string[];
  readonly isNarrowed: boolean;
}

const PROHIBITED_OPERATIONAL_KEYWORDS = [
  "traffic_percentage",
  "canary_percentage",
  "rollout_percentage",
  "user_percentage",
  "traffic_slice",
  "canary_slice",
  "path_prod_switch",
  "path_shadow_promote",
];

/**
 * Asserts that an input string does not contain prohibited Phase 1C.5g traffic-slicing constructs.
 */
export function assertNoProhibitedOperationalKeywords(text: string, contextDescription: string): void {
  const lower = text.toLowerCase();
  for (const keyword of PROHIBITED_OPERATIONAL_KEYWORDS) {
    if (lower.includes(keyword)) {
      throw new InvalidConditionalConstraintError(
        `Operational traffic manipulation construct "${keyword}" is strictly prohibited in ${contextDescription}. ` +
          `Phase 1C.5h may condition authorization, but Phase 1C.5g exclusively owns traffic slicing and rollout volume.`
      );
    }
  }
}

/**
 * Evaluates scope carve-outs for conditional authorization.
 * Strictly guarantees that:
 * 1. authorized_scope <= requested_scope <= tested_scope
 * 2. authorized_scope INTERSECT excluded_scope = EMPTY
 * 3. Every unit in requested_scope that is not in authorized_scope is explicitly declared in excluded_scope.
 * 4. No excluded or unvalidated units enter authorized_scope.
 */
export function evaluateConditionalScope(
  scopeRecord: ValidationScopeRecord,
  requestedScopeInput?: readonly string[],
  proposedAuthorizedScopeInput?: readonly string[],
  explicitExcludedScopeInput?: readonly string[]
): ConditionalScopeResult {
  const enforcer = new ScopeEnforcer(scopeRecord);
  const testedScope = Object.freeze([...scopeRecord.included_units].sort());

  // 1. Resolve & normalize requested scope (defaults to tested scope)
  const rawRequested = requestedScopeInput && requestedScopeInput.length > 0
    ? requestedScopeInput
    : testedScope;
  const requestedScope = Object.freeze(Array.from(new Set(rawRequested)).sort());

  // Validate that requested scope does not contain prohibited keywords
  for (const unit of requestedScope) {
    assertNoProhibitedOperationalKeywords(unit, "requested scope");
  }

  // 2. Requested scope must not exceed tested scope or contain baseline excluded units
  for (const unit of requestedScope) {
    if (enforcer.isExplicitlyExcluded(unit)) {
      throw new ConditionalScopeContainmentError(
        `Requested scope contains unit "${unit}" which is explicitly excluded in the baseline ValidationScopeRecord.`
      );
    }
    if (!enforcer.isWithinScope(unit)) {
      throw new ConditionalScopeContainmentError(
        `Requested scope contains unit "${unit}" which was not validated in the tested scope.`
      );
    }
  }

  // 3. Resolve & normalize proposed authorized scope
  const rawAuthorized = proposedAuthorizedScopeInput && proposedAuthorizedScopeInput.length > 0
    ? proposedAuthorizedScopeInput
    : requestedScope;
  const authorizedScope = Object.freeze(Array.from(new Set(rawAuthorized)).sort());

  for (const unit of authorizedScope) {
    assertNoProhibitedOperationalKeywords(unit, "authorized scope");
  }

  // 4. Resolve & normalize explicit excluded scope
  const rawExcluded = explicitExcludedScopeInput ? explicitExcludedScopeInput : [];
  const explicitExcluded = Object.freeze(Array.from(new Set(rawExcluded)).sort());

  for (const unit of explicitExcluded) {
    assertNoProhibitedOperationalKeywords(unit, "excluded scope");
  }

  // 5. Build sets for exact partition evaluation
  const authorizedSet = new Set(authorizedScope);
  const requestedSet = new Set(requestedScope);
  const excludedSet = new Set(explicitExcluded);

  // Check 5a: Authorized unit must be in requested scope and tested scope
  for (const unit of authorizedScope) {
    if (!requestedSet.has(unit)) {
      throw new ConditionalScopeContainmentError(
        `Conditional authorized scope contains unit "${unit}" not present in requested scope.`
      );
    }
    if (enforcer.isExplicitlyExcluded(unit)) {
      throw new ConditionalScopeContainmentError(
        `Conditional authorized scope contains unit "${unit}" which is excluded in baseline scope.`
      );
    }
    if (!enforcer.isWithinScope(unit)) {
      throw new ConditionalScopeContainmentError(
        `Conditional authorized scope contains unit "${unit}" which was not validated in tested scope.`
      );
    }
  }

  // Check 5b: Excluded unit not requested -> reject
  for (const unit of explicitExcluded) {
    if (!requestedSet.has(unit)) {
      throw new ConditionalScopeContainmentError(
        `Excluded unit "${unit}" was not present in requested scope. ` +
          `Conditional scope restriction requires an exact partition: every excluded unit must be a member of the requested scope.`
      );
    }
  }

  // Check 5c: Authorized scope INTERSECT excluded scope = EMPTY (requested unit in both sets -> reject)
  for (const unit of authorizedScope) {
    if (excludedSet.has(unit)) {
      throw new ConditionalScopeContainmentError(
        `Unit "${unit}" appears in both authorized_scope and excluded_scope. ` +
          `conditional authorized scope INTERSECT excluded scope must be strictly empty.`
      );
    }
  }

  // Check 5d: Requested unit in neither set -> reject (no silent omissions)
  for (const unit of requestedScope) {
    if (!authorizedSet.has(unit) && !excludedSet.has(unit)) {
      throw new ConditionalScopeContainmentError(
        `Unit "${unit}" was requested but omitted from authorized_scope without being explicitly listed in excluded_scope. ` +
          `Silent omission is strictly prohibited; all carve-outs must be explicit.`
      );
    }
  }

  const isNarrowed =
    authorizedScope.length < requestedScope.length ||
    explicitExcluded.length > 0;

  return deepFreeze({
    requestedScope,
    testedScope,
    authorizedScope,
    excludedScope: explicitExcluded,
    isNarrowed,
  });
}
