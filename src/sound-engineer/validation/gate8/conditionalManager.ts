// src/sound-engineer/validation/gate8/conditionalManager.ts
// ConditionalAuthorizationManager: Primary engine for Phase 1C.5h WP-23:
// Conditional Authorization, Scope Restriction & Boundary Subsystem.
// Bound to frozen specification v0.1j Section 27, Table 18, and Build Plan v0.1h WP-23.

import { deepFreeze } from "../../contracts/immutability";
import {
  ADOPTION_DECISION_OUTCOMES,
  GOVERNANCE_STATUSES,
  UNCERTAINTY_GATE_8_IMPACTS,
} from "../schemas/enums";
import { AdoptionDecisionRecord } from "../schemas/records";
import { computeSha256Hex } from "../storage/ledgerTypes";
import {
  assertNoProhibitedOperationalKeywords,
  evaluateConditionalScope,
} from "./conditionalScopeEvaluator";
import { evaluateConditionalValidity } from "./conditionalValidityEvaluator";
import {
  ConditionalAuthorizationPlan,
  CanonicalRecord21Projection,
  ConditionalAuthorizationValidationResult,
  ConditionalValidityEvaluationResult,
  PrepareConditionalPlanInput,
  ValidateConditionalAuthorizationOptions,
  ValidityEvaluationContext,
} from "./conditionalTypes";
import {
  EmptyConditionalPlanError,
  InvalidConditionalConstraintError,
  InvalidConditionalContextError,
  NonWaivableBlockerError,
} from "./conditionalErrors";
import { verifyAdoptionDecisionIntegrity } from "./gate8Signer";

/**
 * ConditionalAuthorizationManager
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. PHASE 1C.5h MAY CONDITION AUTHORIZATION. PHASE 1C.5g OWNS TRAFFIC-SLICING AND CUTOVER EXECUTION.
 * 2. Record 21 remains strictly fourteen persisted fields. No schema expansion.
 * 3. Scope containment: conditional authorized scope <= requested scope <= tested scope,
 *    and conditional authorized scope INTERSECT excluded scope = EMPTY.
 * 4. Absolute Non-Waivable Invariants:
 *    - Never bypasses material genuine regressions, broken exports, failed rollbacks,
 *      broken provenance, 21 Principles violations, or critical tone uncertainty.
 *    - Preserves all applicable WP-21 hard blockers.
 * 5. Conditional plan objects are in-memory implementation helpers, NOT governed records,
 *    NOT Record 23, NOT graph entities, and NOT ledger records.
 * 6. Conditional plans cannot grant production authority by themselves; authority is exclusively
 *    conveyed by sealed Record 21 from WP-22.
 * 7. Zero runtime traffic manipulation (no traffic percentages, canary percentages, rollout cohorts).
 */
export class ConditionalAuthorizationManager {
  /**
   * Prepares and validates a deterministic ConditionalAuthorizationPlan.
   *
   * Formulates:
   * - Permitted bounded scope;
   * - Explicit exclusions;
   * - Authorization constraints & compensating controls;
   * - Declarative monitoring rules;
   * - Mandatory review requirements;
   * - Follow-up evidence requirements;
   * - Validity conditions & revalidation prerequisites.
   *
   * Enforces all absolute non-waivable invariants and rejects empty conditional plans.
   */
  public prepareConditionalPlan(input: PrepareConditionalPlanInput): ConditionalAuthorizationPlan {
    if (!input) {
      throw new InvalidConditionalContextError("PrepareConditionalPlanInput is required.");
    }

    // 1. Validate Non-Waivable Invariants & Hard Blockers
    this.assertNonWaivableInvariants(input);

    // 2. Prohibit Operational Traffic-Slicing Constructs
    this.assertNoTrafficPercentagesInInput(input);

    // 3. Evaluate Scope Carve-outs & Boundaries
    const scopeResult = evaluateConditionalScope(
      input.scopeRecord,
      input.requestedScope,
      input.proposedAuthorizedScope,
      input.excludedScope
    );

    // 4. Resolve Constraints, Monitoring, and Requirements (normalized and deduplicated)
    const constraints = Object.freeze(
      Array.from(
        new Set((input.authorizationConstraints ?? []).map((c) => c.trim()))
      ).sort()
    );
    for (const c of constraints) {
      assertNoProhibitedOperationalKeywords(c, "authorization constraint");
    }

    const requiredMonitoring = Object.freeze(
      Array.from(
        new Set((input.requiredMonitoring ?? []).map((m) => m.trim()))
      ).sort()
    );
    for (const m of requiredMonitoring) {
      assertNoProhibitedOperationalKeywords(m, "required monitoring rule");
    }

    const reviewRequirement = input.reviewRequirement
      ? deepFreeze({
          reviewTrigger: input.reviewRequirement.reviewTrigger.trim(),
          requiredReviewerRole: input.reviewRequirement.requiredReviewerRole.trim(),
          reviewConditions: Object.freeze(
            Array.from(new Set(input.reviewRequirement.reviewConditions.map((cond) => cond.trim()))).sort()
          ),
        })
      : undefined;
    if (reviewRequirement) {
      assertNoProhibitedOperationalKeywords(reviewRequirement.reviewTrigger, "review trigger");
      for (const cond of reviewRequirement.reviewConditions) {
        assertNoProhibitedOperationalKeywords(cond, "review condition");
      }
    }

    const followUpEvidence = input.followUpEvidenceRequirement
      ? deepFreeze({
          targetEvidenceKinds: Object.freeze(
            Array.from(new Set(input.followUpEvidenceRequirement.targetEvidenceKinds.map((k) => k.trim()))).sort()
          ),
          description: input.followUpEvidenceRequirement.description.trim(),
          targetScopeUnits: Object.freeze(
            Array.from(new Set(input.followUpEvidenceRequirement.targetScopeUnits.map((u) => u.trim()))).sort()
          ),
          minimumTestCount: input.followUpEvidenceRequirement.minimumTestCount,
        })
      : undefined;
    if (followUpEvidence) {
      assertNoProhibitedOperationalKeywords(followUpEvidence.description, "follow-up evidence description");
    }

    const validityCondition = input.validityCondition
      ? deepFreeze({
          validityConditionRef: input.validityCondition.validityConditionRef.trim(),
          expiresAt: input.validityCondition.expiresAt,
          stopCriteriaRefs: input.validityCondition.stopCriteriaRefs
            ? Object.freeze(Array.from(new Set(input.validityCondition.stopCriteriaRefs.map((r) => r.trim()))).sort())
            : undefined,
          description: input.validityCondition.description.trim(),
        })
      : undefined;
    if (validityCondition) {
      assertNoProhibitedOperationalKeywords(validityCondition.description, "validity condition description");
    }

    const revalidationPrerequisites = Object.freeze(
      Array.from(
        new Set((input.revalidationPrerequisites ?? []).map((p) => p.trim()))
      ).sort()
    );
    for (const p of revalidationPrerequisites) {
      assertNoProhibitedOperationalKeywords(p, "revalidation prerequisite");
    }

    // 5. Require at least one material governed condition (no semantically empty conditional plan)
    const hasMeaningfulCondition =
      scopeResult.isNarrowed ||
      constraints.length > 0 ||
      requiredMonitoring.length > 0 ||
      reviewRequirement !== undefined ||
      followUpEvidence !== undefined ||
      validityCondition !== undefined ||
      revalidationPrerequisites.length > 0;

    if (!hasMeaningfulCondition) {
      throw new EmptyConditionalPlanError(
        "A conditional authorization plan must contain at least one material governed condition " +
          "(narrower authorized scope, explicit exclusion, authorization constraint, monitoring rule, " +
          "review requirement, follow-up evidence requirement, or validity condition). " +
          "Semantically empty conditional plans indistinguishable from full AUTHORIZED are strictly prohibited."
      );
    }

    // 6. Formulate deterministic plan identifier from canonical semantic payload
    const canonicalSemanticPayload = JSON.stringify({
      packageId: input.packageRecord.package_id,
      readinessAssessmentId: input.readinessAssessmentRecord.readiness_assessment_id,
      authorizedScope: scopeResult.authorizedScope,
      excludedScope: scopeResult.excludedScope,
      authorizationConstraints: constraints,
      requiredMonitoring,
      reviewRequirement,
      followUpEvidenceRequirement: followUpEvidence,
      validityCondition,
      revalidationPrerequisites,
    });
    const planHash = computeSha256Hex(canonicalSemanticPayload).slice(0, 16);
    const planId = input.planId ?? `cap_${planHash}`;
    const timestamp = input.timestamp ?? new Date().toISOString();

    const rationale =
      input.rationale ??
      `Governed conditional authorization plan established for package "${input.packageRecord.package_id}": ` +
        `authorized [${scopeResult.authorizedScope.length}] unit(s), excluded [${scopeResult.excludedScope.length}] unit(s), ` +
        `under [${constraints.length}] constraint(s) and [${requiredMonitoring.length}] mandatory monitoring rule(s).`;

    return deepFreeze({
      planId,
      packageId: input.packageRecord.package_id,
      readinessAssessmentId: input.readinessAssessmentRecord.readiness_assessment_id,
      authorizedScope: scopeResult.authorizedScope,
      excludedScope: scopeResult.excludedScope,
      authorizationConstraints: constraints,
      requiredMonitoring,
      reviewRequirement,
      followUpEvidenceRequirement: followUpEvidence,
      validityCondition,
      revalidationPrerequisites,
      rationale,
      createdAt: timestamp,
    });
  }

  /**
   * Projects an internal ConditionalAuthorizationPlan into canonical Record 21 fields.
   * Enables seamless consumption by WP-22 Gate8AdjudicationEngine without expanding
   * the frozen 14-field schema.
   */
  public projectToRecord21Inputs(plan: ConditionalAuthorizationPlan): CanonicalRecord21Projection {
    if (!plan) {
      throw new InvalidConditionalContextError("ConditionalAuthorizationPlan is required.");
    }

    const conditionsAndRestrictions: string[] = [];

    // Map explicit exclusions
    if (plan.excludedScope.length > 0) {
      conditionsAndRestrictions.push(
        `SCOPE_EXCLUSION: Excluded units: [${plan.excludedScope.join(", ")}]`
      );
    }

    // Map authorization constraints
    for (const constraint of plan.authorizationConstraints) {
      const trimmed = constraint.trim();
      const content = trimmed.toLowerCase().startsWith("constraint:")
        ? trimmed.slice("constraint:".length).trim()
        : trimmed;
      conditionsAndRestrictions.push(`CONSTRAINT: ${content}`);
    }

    // Map review requirements
    if (plan.reviewRequirement) {
      conditionsAndRestrictions.push(
        `REVIEW_REQUIREMENT: Trigger [${plan.reviewRequirement.reviewTrigger}], ` +
          `Role [${plan.reviewRequirement.requiredReviewerRole}], ` +
          `Conditions: [${plan.reviewRequirement.reviewConditions.join("; ")}]`
      );
    }

    // Map follow-up evidence requirements
    if (plan.followUpEvidenceRequirement) {
      conditionsAndRestrictions.push(
        `FOLLOW_UP_EVIDENCE: Kinds [${plan.followUpEvidenceRequirement.targetEvidenceKinds.join(", ")}], ` +
          `Scope [${plan.followUpEvidenceRequirement.targetScopeUnits.join(", ")}]: ` +
          `${plan.followUpEvidenceRequirement.description}`
      );
    }

    // Map validity condition
    if (plan.validityCondition) {
      const expiryStr = plan.validityCondition.expiresAt
        ? `, Expires [${plan.validityCondition.expiresAt}]`
        : "";
      conditionsAndRestrictions.push(
        `VALIDITY_CONDITION: Ref [${plan.validityCondition.validityConditionRef}]${expiryStr}: ` +
          `${plan.validityCondition.description}`
      );
    }

    // Map revalidation prerequisites
    if (plan.revalidationPrerequisites && plan.revalidationPrerequisites.length > 0) {
      for (const prereq of plan.revalidationPrerequisites) {
        const trimmed = prereq.trim();
        const content = trimmed.toLowerCase().startsWith("revalidation_prerequisite:")
          ? trimmed.slice("revalidation_prerequisite:".length).trim()
          : trimmed;
        conditionsAndRestrictions.push(`REVALIDATION_PREREQUISITE: ${content}`);
      }
    }

    // Map monitoring rules
    const mandatoryMonitoringRules: string[] = [...plan.requiredMonitoring];
    if (plan.validityCondition?.stopCriteriaRefs) {
      for (const stopRef of plan.validityCondition.stopCriteriaRefs) {
        mandatoryMonitoringRules.push(`STOP_CRITERIA_PROFILE: ${stopRef}`);
      }
    }

    return deepFreeze({
      authorizedScope: Object.freeze([...plan.authorizedScope]),
      conditionsAndRestrictions: Object.freeze(conditionsAndRestrictions),
      mandatoryMonitoringRules: Object.freeze(mandatoryMonitoringRules),
    });
  }

  /**
   * Validates an already-issued AdoptionDecisionRecord against WP-23 conditional governance rules.
   *
   * Strict Entry Requirements:
   * 1. decision_outcome === CONDITIONALLY_AUTHORIZED (AUTHORIZED, REJECTED, and BLOCKED are rejected).
   * 2. Cryptographic signature authenticity verified (tampered records rejected).
   * 3. governance_status === ACTIVE at initial issuance (not RESTRICTED or SUSPENDED).
   * 4. Non-empty authorized_scope.
   * 5. Non-empty conditions_and_restrictions.
   * 6. Non-empty mandatory_monitoring_rules.
   */
  public validateConditionalAuthorization(
    record: AdoptionDecisionRecord,
    options?: ValidateConditionalAuthorizationOptions
  ): ConditionalAuthorizationValidationResult {
    if (!record) {
      throw new InvalidConditionalContextError("AdoptionDecisionRecord is required.");
    }

    const errors: string[] = [];

    // 1. Outcome Check: MUST be CONDITIONALLY_AUTHORIZED
    if (record.decision_outcome !== ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED) {
      throw new InvalidConditionalContextError(
        `AdoptionDecisionRecord decision_outcome is "${record.decision_outcome}". ` +
          `ConditionalAuthorizationManager operates exclusively on CONDITIONALLY_AUTHORIZED contexts. ` +
          `Outcomes AUTHORIZED, REJECTED, and BLOCKED belong exclusively to WP-22 adjudication authority.`
      );
    }

    // 2. Cryptographic Authenticity Check
    const isAuthentic = verifyAdoptionDecisionIntegrity(record, options?.integrityOptions);
    if (!isAuthentic) {
      throw new InvalidConditionalContextError(
        `AdoptionDecisionRecord "${record.decision_id}" failed cryptographic integrity or ` +
          `authorizing official authenticity verification. Tampered or unauthenticated decisions fail closed.`
      );
    }

    // 3. Initial Governance Status Check
    if (record.governance_status !== GOVERNANCE_STATUSES.ACTIVE) {
      throw new InvalidConditionalContextError(
        `Newly issued conditional authorization must possess governance_status = ACTIVE. ` +
          `Received status "${record.governance_status}". Post-cutover state changes belong to WP-24.`
      );
    }

    // 4. Non-empty Authorized Scope Check
    if (!record.authorized_scope || record.authorized_scope.length === 0) {
      errors.push("CONDITIONALLY_AUTHORIZED record must possess a non-empty authorized_scope.");
    }

    // 5. Non-empty Conditions & Restrictions Check
    if (!record.conditions_and_restrictions || record.conditions_and_restrictions.length === 0) {
      errors.push("CONDITIONALLY_AUTHORIZED record must possess non-empty conditions_and_restrictions.");
    }

    // 6. Non-empty Mandatory Monitoring Rules Check
    if (!record.mandatory_monitoring_rules || record.mandatory_monitoring_rules.length === 0) {
      errors.push("CONDITIONALLY_AUTHORIZED record must possess non-empty mandatory_monitoring_rules.");
    }

    // 7. Context Matching
    if (options?.expectedPackageId && record.package_id !== options.expectedPackageId) {
      errors.push(
        `Package mismatch: expected "${options.expectedPackageId}", got "${record.package_id}".`
      );
    }
    if (
      options?.expectedReadinessId &&
      record.readiness_assessment_id !== options.expectedReadinessId
    ) {
      errors.push(
        `Readiness assessment mismatch: expected "${options.expectedReadinessId}", got "${record.readiness_assessment_id}".`
      );
    }

    if (errors.length > 0) {
      throw new InvalidConditionalContextError(
        `Conditional authorization record validation failed: ${errors.join("; ")}`
      );
    }

    return deepFreeze({
      isValid: true,
      decisionId: record.decision_id,
      packageId: record.package_id,
      authorizedScope: Object.freeze([...record.authorized_scope]),
      conditionsAndRestrictions: Object.freeze([...record.conditions_and_restrictions]),
      mandatoryMonitoringRules: Object.freeze([...record.mandatory_monitoring_rules]),
      validationErrors: Object.freeze([]),
      evaluatedAt: new Date().toISOString(),
    });
  }

  /**
   * Declarative evaluation of conditional validity and revalidation requirements.
   * Zero operational side-effects.
   */
  public evaluateConditionValidity(
    plan: ConditionalAuthorizationPlan,
    context?: ValidityEvaluationContext
  ): ConditionalValidityEvaluationResult {
    return evaluateConditionalValidity(plan, context);
  }

  /**
   * Enforces absolute non-waivable invariants:
   * 1. Unresolved material genuine regression
   * 2. Broken target-platform export or corruption
   * 3. Failed or unverified automated rollback
   * 4. Broken or missing Phase 1C.5f provenance
   * 5. Principles of Sound Engineering Reasoning violation
   * 6. Critical unresolved uncertainty
   * 7. All applicable WP-21 hard blockers.
   */
  private assertNonWaivableInvariants(input: PrepareConditionalPlanInput): void {
    const { readinessAssessmentRecord, rollbackEvidence, uncertaintyRecords } = input;

    // Check 1: WP-21 Active Hard Blockers
    if (readinessAssessmentRecord.hard_blockers_present.length > 0) {
      const blockers = readinessAssessmentRecord.hard_blockers_present.join("; ");
      throw new NonWaivableBlockerError(
        `Candidate possesses active hard blockers: [${blockers}]. ` +
          `Conditional authorization can NEVER waive active hard blockers.`
      );
    }

    // Check 2: Rollback Verification Evidence
    if (rollbackEvidence) {
      if (!rollbackEvidence.rollback_verified) {
        throw new NonWaivableBlockerError(
          `Automated rollback verification failed: ${rollbackEvidence.failure_reason ?? "rollback_verified is false"}. ` +
            `Unverified or failed rollback is an absolute non-waivable blocker.`
        );
      }
      if (rollbackEvidence.is_stale) {
        throw new NonWaivableBlockerError(
          "Rollback verification evidence is marked stale. Stale rollback evidence cannot authorize cutover."
        );
      }
    }

    // Check 3: Uncertainty Records (FORCES_BLOCK is strictly non-waivable)
    if (uncertaintyRecords && uncertaintyRecords.length > 0) {
      for (const u of uncertaintyRecords) {
        if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
          throw new NonWaivableBlockerError(
            `Uncertainty "${u.uncertainty_id}" (${u.uncertainty_source}) has gate_8_impact FORCES_BLOCK: ` +
              `"${u.potential_production_risk}". Critical unresolved uncertainty capable of degrading live audio cannot be conditioned.`
          );
        }
      }
    }
  }

  /**
   * Asserts that no operational traffic-percentage or routing keywords exist in the input object.
   */
  private assertNoTrafficPercentagesInInput(input: PrepareConditionalPlanInput): void {
    const rawKeys = Object.keys(input);
    for (const k of rawKeys) {
      assertNoProhibitedOperationalKeywords(k, "input field names");
    }

    // Check rationale
    if (input.rationale) {
      assertNoProhibitedOperationalKeywords(input.rationale, "plan rationale");
    }
  }
}
