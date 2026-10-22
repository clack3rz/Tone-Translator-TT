// src/sound-engineer/validation/gate8/scopeAuthorizationEvaluator.ts
// Scope authorization evaluator and containment enforcement for Phase 1C.5h WP-22.
// Enforces: authorized_scope <= requested_scope <= tested_scope
// Bound to frozen specification v0.1j Section 26, Table 18, and Build Plan v0.1h WP-22.

import { ADOPTION_DECISION_OUTCOMES, AdoptionDecisionOutcome } from "../schemas/enums";
import { ValidationScopeRecord } from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import { Gate8ScopeContainmentError } from "./gate8Errors";

export interface ScopeEvaluationResult {
  readonly requestedScope: readonly string[];
  readonly authorizedScope: readonly string[];
  readonly testedScope: readonly string[];
  readonly isContained: boolean;
  readonly scopeInflationDetected: boolean;
  readonly excludedUnitsDetected: readonly string[];
  readonly unvalidatedUnitsDetected: readonly string[];
}

/**
 * Evaluates requested and proposed authorized scope against the tested ValidationScopeRecord.
 * Strictly guarantees that:
 * 1. requested_scope does not contain excluded units or unvalidated units.
 * 2. authorized_scope <= requested_scope <= tested_scope for positive authorizations.
 * 3. authorized_scope is strictly empty [] for REJECTED and BLOCKED outcomes.
 */
export function evaluateScopeAuthorization(
  scopeRecord: ValidationScopeRecord,
  requestedScopeInput: readonly string[] | undefined,
  proposedAuthorizedScopeInput: readonly string[] | undefined,
  decisionOutcome: AdoptionDecisionOutcome
): ScopeEvaluationResult {
  const enforcer = new ScopeEnforcer(scopeRecord);
  const testedScope = Object.freeze([...scopeRecord.included_units]);

  // 1. Resolve requested scope (defaults to tested scope if not provided)
  const requestedScope = Object.freeze(
    requestedScopeInput && requestedScopeInput.length > 0
      ? [...requestedScopeInput]
      : [...testedScope]
  );

  // 2. Identify excluded units or unvalidated units in requested scope
  const excludedInRequested: string[] = [];
  const unvalidatedInRequested: string[] = [];

  for (const unit of requestedScope) {
    if (enforcer.isExplicitlyExcluded(unit)) {
      excludedInRequested.push(unit);
    }
    if (!enforcer.isWithinScope(unit)) {
      unvalidatedInRequested.push(unit);
    }
  }

  const requestedScopeInflation =
    excludedInRequested.length > 0 || unvalidatedInRequested.length > 0;

  // 3. For negative decisions (REJECTED, BLOCKED), authorized scope is strictly empty []
  if (
    decisionOutcome === ADOPTION_DECISION_OUTCOMES.REJECTED ||
    decisionOutcome === ADOPTION_DECISION_OUTCOMES.BLOCKED
  ) {
    return Object.freeze({
      requestedScope,
      authorizedScope: Object.freeze([]),
      testedScope,
      isContained: true,
      scopeInflationDetected: requestedScopeInflation,
      excludedUnitsDetected: Object.freeze(excludedInRequested),
      unvalidatedUnitsDetected: Object.freeze(unvalidatedInRequested),
    });
  }

  // 4. For positive decisions (AUTHORIZED, CONDITIONALLY_AUTHORIZED), validate requested scope containment
  if (requestedScopeInflation) {
    throw new Gate8ScopeContainmentError(
      `Requested scope exceeds tested scope or contains excluded units: ` +
        `excluded=[${excludedInRequested.join(", ")}], unvalidated=[${unvalidatedInRequested.join(", ")}]. ` +
        `Scope inflation is strictly prohibited.`
    );
  }

  // 5. Resolve authorized scope
  let authorizedScope: readonly string[];

  if (proposedAuthorizedScopeInput && proposedAuthorizedScopeInput.length > 0) {
    authorizedScope = Object.freeze([...proposedAuthorizedScopeInput]);
  } else {
    // By default, authorized scope equals requested scope
    authorizedScope = requestedScope;
  }

  // 6. Verify that authorized scope <= requested scope
  const requestedSet = new Set(requestedScope);
  const unrequestedAuthorized: string[] = [];
  const excludedInAuthorized: string[] = [];
  const untestedInAuthorized: string[] = [];

  for (const unit of authorizedScope) {
    if (!requestedSet.has(unit)) {
      unrequestedAuthorized.push(unit);
    }
    if (enforcer.isExplicitlyExcluded(unit)) {
      excludedInAuthorized.push(unit);
    }
    if (!enforcer.isWithinScope(unit)) {
      untestedInAuthorized.push(unit);
    }
  }

  if (unrequestedAuthorized.length > 0) {
    throw new Gate8ScopeContainmentError(
      `Authorized scope contains units not present in requested scope: [${unrequestedAuthorized.join(", ")}]. ` +
        `authorized_scope must never exceed requested_scope.`
    );
  }

  if (excludedInAuthorized.length > 0 || untestedInAuthorized.length > 0) {
    throw new Gate8ScopeContainmentError(
      `Authorized scope contains excluded or untested units: ` +
        `excluded=[${excludedInAuthorized.join(", ")}], untested=[${untestedInAuthorized.join(", ")}]. ` +
        `authorized_scope must never exceed tested_scope.`
    );
  }

  // 7. For full AUTHORIZED, authorized scope must exactly equal requested scope (no carve-outs allowed without conditional authorization)
  if (
    decisionOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED &&
    authorizedScope.length !== requestedScope.length
  ) {
    throw new Gate8ScopeContainmentError(
      `Full AUTHORIZED requires authorized scope to match requested scope exactly. ` +
        `Scope narrowing requires CONDITIONALLY_AUTHORIZED.`
    );
  }

  return Object.freeze({
    requestedScope,
    authorizedScope,
    testedScope,
    isContained: true,
    scopeInflationDetected: false,
    excludedUnitsDetected: Object.freeze([]),
    unvalidatedUnitsDetected: Object.freeze([]),
  });
}
