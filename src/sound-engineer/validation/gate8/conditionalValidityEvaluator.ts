// src/sound-engineer/validation/gate8/conditionalValidityEvaluator.ts
// Declarative validity and expiration evaluator for Phase 1C.5h WP-23.
// Enforces:
// 1. Unmet conditions trigger revalidation evaluation upon condition expiration.
// 2. Purely declarative evaluation: zero operational side-effects (no Record 18/19/22 creation,
//    no live suspension, no rollback execution, no Record 21 mutation).
// Bound to frozen specification v0.1j Section 27.3 Item 7 and Build Plan v0.1h WP-23.

import { deepFreeze } from "../../contracts/immutability";
import {
  ConditionalAuthorizationPlan,
  ConditionalValidityEvaluationResult,
  ValidityEvaluationContext,
} from "./conditionalTypes";

/**
 * Evaluates whether a ConditionalAuthorizationPlan remains currently valid or has expired/breached conditions,
 * requiring revalidation.
 */
export function evaluateConditionalValidity(
  plan: ConditionalAuthorizationPlan,
  context?: ValidityEvaluationContext
): ConditionalValidityEvaluationResult {
  const nowStr = context?.asOf ?? context?.evaluationTimestamp ?? context?.currentTimestamp;
  if (!nowStr) {
    throw new Error(
      "Deterministic evaluation timestamp (asOf, evaluationTimestamp, or currentTimestamp) must be explicitly provided."
    );
  }
  const evaluationTime = Date.parse(nowStr);
  if (isNaN(evaluationTime)) {
    throw new Error(`Evaluation timestamp "${nowStr}" is not a valid ISO 8601 date.`);
  }

  const reasons: string[] = [];
  const revalidationScope: string[] = [];
  let isExpired = false;
  let hasUnmetConditions = false;

  // 1. Evaluate expiration timestamp if present in validityCondition
  // Exact boundary rule: asOf >= expiresAt => EXPIRED
  if (plan.validityCondition?.expiresAt) {
    const expiryTime = Date.parse(plan.validityCondition.expiresAt);
    if (!isNaN(expiryTime) && !isNaN(evaluationTime) && evaluationTime >= expiryTime) {
      isExpired = true;
      reasons.push(
        `Conditional authorization expired at ${plan.validityCondition.expiresAt} (current: ${nowStr}). ` +
          `Condition contract "${plan.validityCondition.validityConditionRef}" requires revalidation.`
      );
      revalidationScope.push(...plan.authorizedScope);
    }
  }

  // 2. Evaluate telemetry stop criteria if triggered
  if (context?.triggeredStopCriteria && context.triggeredStopCriteria.length > 0) {
    hasUnmetConditions = true;
    reasons.push(
      `Telemetry stop criteria triggered: [${context.triggeredStopCriteria.join(", ")}]. ` +
        `Quality threshold exceeded; revalidation required.`
    );
    revalidationScope.push(...plan.authorizedScope);
  }

  // 3. Evaluate review requirement completion
  if (plan.reviewRequirement && context?.reviewCompleted === false) {
    hasUnmetConditions = true;
    reasons.push(
      `Mandatory governance review on trigger "${plan.reviewRequirement.reviewTrigger}" was not completed or failed.`
    );
    revalidationScope.push(...plan.authorizedScope);
  }

  // 4. Evaluate follow-up evidence submission
  if (plan.followUpEvidenceRequirement && context?.submittedEvidenceRefs) {
    if (context.submittedEvidenceRefs.length === 0) {
      hasUnmetConditions = true;
      reasons.push(
        `Required follow-up evidence [${plan.followUpEvidenceRequirement.targetEvidenceKinds.join(", ")}] not submitted.`
      );
      revalidationScope.push(...plan.followUpEvidenceRequirement.targetScopeUnits);
    }
  }

  // Determine final status
  let status: "CURRENT" | "EXPIRED" | "UNMET_CONDITIONS";
  let isValid = true;
  let revalidationRequired = false;

  if (isExpired) {
    status = "EXPIRED";
    isValid = false;
    revalidationRequired = true;
  } else if (hasUnmetConditions) {
    status = "UNMET_CONDITIONS";
    isValid = false;
    revalidationRequired = true;
  } else {
    status = "CURRENT";
    isValid = true;
    revalidationRequired = false;
  }

  // Deduplicate revalidation scope
  const uniqueScope = Object.freeze(Array.from(new Set(revalidationScope)).sort());

  return deepFreeze({
    status,
    isValid,
    revalidationRequired,
    revalidationReasons: Object.freeze(reasons),
    revalidationScope: uniqueScope,
    evaluatedAt: nowStr,
  });
}
