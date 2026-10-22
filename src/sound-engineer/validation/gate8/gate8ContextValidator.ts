// src/sound-engineer/validation/gate8/gate8ContextValidator.ts
// Authoritative context validation, prerequisite verification, and deterministic ID derivation
// for Gate 8 Production Cutover Adjudication (WF-16).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 13, and Build Plan v0.1h WP-22.

import {
  ADOPTION_DECISION_OUTCOMES,
  AdoptionDecisionOutcome,
  GOVERNANCE_STATUSES,
  GovernanceStatus,
  PILLAR_READINESS_STATUSES,
} from "../schemas/enums";
import { computeSha256Hex } from "../storage/ledgerTypes";
import { isOutcomeInvalidatedInGraph } from "../readiness/readinessContextValidator";
import { VersionBindingService } from "../binding/versionBindingService";
import {
  Gate8AdjudicationInput,
} from "./gate8Types";
import {
  ConditionalAuthorizationConstraintError,
  Gate8PrerequisiteError,
  InvalidDecisionOutcomeError,
  InvalidRollbackReferenceError,
  InvalidVersionBindingError,
  StaleReadinessAssessmentError,
} from "./gate8Errors";
import { assertAuthorizingOfficial } from "./gate8Signer";

const VALID_DECISION_OUTCOMES = new Set<string>([
  ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
  ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
  ADOPTION_DECISION_OUTCOMES.REJECTED,
  ADOPTION_DECISION_OUTCOMES.BLOCKED,
]);

/**
 * Validates all inputs and prerequisites for Gate 8 Adjudication.
 * Enforces fail-closed security invariants across all four decision classes.
 */
export function validateGate8Context(
  input: Gate8AdjudicationInput,
  resolvedOutcome: AdoptionDecisionOutcome
): void {
  if (!input) {
    throw new Gate8PrerequisiteError("Gate8AdjudicationInput is required.");
  }

  // 1. Mandatory Parent Records
  if (!input.packageRecord || !input.packageRecord.package_id) {
    throw new Gate8PrerequisiteError("A valid ValidationPackage with package_id is required.");
  }
  if (!input.readinessAssessmentRecord || !input.readinessAssessmentRecord.readiness_assessment_id) {
    throw new Gate8PrerequisiteError(
      "A valid ProductionReadinessAssessmentRecord (Record 20) with readiness_assessment_id is required."
    );
  }
  if (!input.scopeRecord || !input.scopeRecord.scope_id) {
    throw new Gate8PrerequisiteError("A valid ValidationScopeRecord with scope_id is required.");
  }
  if (!input.versionBindingRecord || !input.versionBindingRecord.binding_id) {
    throw new Gate8PrerequisiteError(
      "A valid ValidationVersionBindingRecord with binding_id is required."
    );
  }

  // 2. Authorizing Official Validation (Technology-Neutral Signer Verification & Forgery Check)
  assertAuthorizingOfficial(
    input.authorizingOfficial,
    input.authorizingOfficialValidator,
    input.authorityRegistry,
    input.authorizingOfficialKey
  );

  // 3. Package & Readiness Binding Alignment
  if (input.readinessAssessmentRecord.package_id !== input.packageRecord.package_id) {
    throw new StaleReadinessAssessmentError(
      `Package mismatch: ReadinessAssessmentRecord refers to package "${input.readinessAssessmentRecord.package_id}", ` +
        `but candidate package is "${input.packageRecord.package_id}".`
    );
  }

  // 4. Scope and Version Binding Alignment
  if (input.versionBindingRecord.scope_id !== input.scopeRecord.scope_id) {
    throw new InvalidVersionBindingError(
      `Scope mismatch: VersionBindingRecord refers to scope "${input.versionBindingRecord.scope_id}", ` +
        `but candidate scope is "${input.scopeRecord.scope_id}".`
    );
  }

  // 5. Version Binding Cryptographic Integrity Check
  const versionBindingService = new VersionBindingService();
  const isBindingValid = versionBindingService.verifyBindingIntegrity(input.versionBindingRecord);
  if (!isBindingValid) {
    throw new InvalidVersionBindingError(
      `Version binding integrity verification failed for binding "${input.versionBindingRecord.binding_id}". ` +
        `Tampered or mismatched version matrices are rejected.`
    );
  }

  // 6. Governing Outcome & Lineage Freshness Check
  if (input.validationOutcomeRecord) {
    if (input.validationOutcomeRecord.package_id !== input.packageRecord.package_id) {
      throw new StaleReadinessAssessmentError(
        `Package mismatch: Governing ValidationOutcomeRecord refers to package "${input.validationOutcomeRecord.package_id}", ` +
          `but candidate package is "${input.packageRecord.package_id}".`
      );
    }
    if (
      input.validationOutcomeRecord.version_binding &&
      input.validationOutcomeRecord.version_binding !== input.versionBindingRecord.binding_id
    ) {
      throw new StaleReadinessAssessmentError(
        `Version binding mismatch: Governing ValidationOutcomeRecord is bound to "${input.validationOutcomeRecord.version_binding}", ` +
          `but candidate version binding is "${input.versionBindingRecord.binding_id}".`
      );
    }
  }

  // Stale / Invalidation Check in Lineage Graph
  if (input.graph) {
    if (input.validationOutcomeRecord) {
      const isOutcomeInvalidated = isOutcomeInvalidatedInGraph(
        input.validationOutcomeRecord.outcome_id,
        input.graph
      );
      if (isOutcomeInvalidated) {
        throw new StaleReadinessAssessmentError(
          `Governing ValidationOutcomeRecord "${input.validationOutcomeRecord.outcome_id}" ` +
            `is marked invalidated in the relationship graph via canonical INVALIDATED_BY edge.`
        );
      }
    }

    const isRecordStale = isOutcomeInvalidatedInGraph(
      input.readinessAssessmentRecord.readiness_assessment_id,
      input.graph
    );
    if (isRecordStale) {
      throw new StaleReadinessAssessmentError(
        `ReadinessAssessmentRecord "${input.readinessAssessmentRecord.readiness_assessment_id}" ` +
          `is marked invalidated in the relationship graph.`
      );
    }
  }

  // 7. Initial Governance Status Constraint
  if (input.governanceStatus && input.governanceStatus !== GOVERNANCE_STATUSES.ACTIVE) {
    throw new Gate8PrerequisiteError(
      `Newly issued Gate 8 decisions must begin with governance_status = ACTIVE. ` +
        `Status transitions to "${input.governanceStatus}" require a governed Gate8ChangeRecord (WP-24).`
    );
  }

  // 8. Decision Outcome Enum Validation
  if (input.decisionOutcome && !VALID_DECISION_OUTCOMES.has(input.decisionOutcome)) {
    throw new InvalidDecisionOutcomeError(
      `Invalid decision outcome: "${input.decisionOutcome}". ` +
        `Allowed outcomes are AUTHORIZED, CONDITIONALLY_AUTHORIZED, REJECTED, BLOCKED.`
    );
  }

  // 9. Outcome-Specific Precondition Auditing
  const { readinessAssessmentRecord, rollbackEvidence, rollbackVerificationCertRef } = input;

  // Resolve rollback reference string
  const resolvedRollbackRef =
    rollbackVerificationCertRef ??
    rollbackEvidence?.evidence_ref ??
    "";

  if (
    resolvedOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
    resolvedOutcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED
  ) {
    // Both authorization classes require affirmative rollback verification
    if (!resolvedRollbackRef || resolvedRollbackRef.trim().length === 0) {
      throw new InvalidRollbackReferenceError(
        "Gate 8 authorization requires a valid, verified rollback verification certificate reference."
      );
    }

    if (rollbackEvidence) {
      if (!rollbackEvidence.rollback_verified) {
        throw new InvalidRollbackReferenceError(
          `Rollback verification evidence indicates failure: ${rollbackEvidence.failure_reason ?? "rollback_verified is false"}.`
        );
      }
      if (rollbackEvidence.is_stale) {
        throw new InvalidRollbackReferenceError(
          "Rollback verification evidence is marked stale and cannot authorize production cutover."
        );
      }
      if (
        rollbackEvidence.version_binding_ref &&
        rollbackEvidence.version_binding_ref !==
          input.versionBindingRecord.version_integrity_reference.composite_digest
      ) {
        throw new InvalidRollbackReferenceError(
          "Rollback verification evidence is bound to a different version binding digest."
        );
      }
    }

    // Both authorization classes STRICTLY PROHIBIT active hard blockers
    if (readinessAssessmentRecord.hard_blockers_present.length > 0) {
      const blockersStr = readinessAssessmentRecord.hard_blockers_present.join("; ");
      if (resolvedOutcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED) {
        throw new ConditionalAuthorizationConstraintError(
          `Conditional authorization cannot waive active hard blockers: [${blockersStr}].`
        );
      } else {
        throw new Gate8PrerequisiteError(
          `Candidate possesses active hard blockers: [${blockersStr}]. Cannot authorize cutover.`
        );
      }
    }

    // Full AUTHORIZED specific checks
    if (resolvedOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED) {
      if (!readinessAssessmentRecord.gate_8_eligible) {
        throw new Gate8PrerequisiteError(
          "Cannot issue full AUTHORIZED decision: ProductionReadinessAssessmentRecord.gate_8_eligible is false."
        );
      }

      const pillars = readinessAssessmentRecord.pillar_evaluations;
      const allFourSatisfied =
        pillars.acoustic_musical_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
        pillars.reasoning_governance_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
        pillars.platform_operational_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
        pillars.rollback_safety_readiness === PILLAR_READINESS_STATUSES.SATISFIED;

      if (!allFourSatisfied) {
        throw new Gate8PrerequisiteError(
          `Full AUTHORIZED requires all four readiness pillars to be SATISFIED. Current: ` +
            `Acoustic=${pillars.acoustic_musical_readiness}, Governance=${pillars.reasoning_governance_readiness}, ` +
            `Platform=${pillars.platform_operational_readiness}, Rollback=${pillars.rollback_safety_readiness}.`
        );
      }

      // Full AUTHORIZED requires empty conditions_and_restrictions
      if (
        input.conditionsAndRestrictions &&
        input.conditionsAndRestrictions.length > 0
      ) {
        throw new ConditionalAuthorizationConstraintError(
          `Full AUTHORIZED decision requires conditions_and_restrictions to be empty []. ` +
            `Received ${input.conditionsAndRestrictions.length} condition(s). Use CONDITIONALLY_AUTHORIZED instead.`
        );
      }
    }

    // CONDITIONALLY_AUTHORIZED specific checks
    if (resolvedOutcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED) {
      // Must have explicit non-empty conditions and restrictions
      if (
        !input.conditionsAndRestrictions ||
        input.conditionsAndRestrictions.length === 0
      ) {
        throw new ConditionalAuthorizationConstraintError(
          "CONDITIONALLY_AUTHORIZED requires explicit, non-empty conditions_and_restrictions."
        );
      }

      // Must have explicit non-empty mandatory monitoring rules
      if (
        !input.mandatoryMonitoringRules ||
        input.mandatoryMonitoringRules.length === 0
      ) {
        throw new ConditionalAuthorizationConstraintError(
          "CONDITIONALLY_AUTHORIZED requires explicit, non-empty mandatory_monitoring_rules."
        );
      }
    }
  }
}

/**
 * Derives a deterministic decision identifier for Gate 8 AdoptionDecisionRecord (Record 21).
 */
export function deriveDeterministicDecisionId(
  packageId: string,
  readinessAssessmentId: string,
  requestedScope: readonly string[],
  authorizedScope: readonly string[],
  decisionOutcome: string,
  versionBindingRef: string,
  timestamp?: string
): string {
  const sortedReq = [...requestedScope].sort().join(",");
  const sortedAuth = [...authorizedScope].sort().join(",");
  const payload = `gate8:${packageId}:${readinessAssessmentId}:${sortedReq}:${sortedAuth}:${decisionOutcome}:${versionBindingRef}:${timestamp ?? ""}`;
  const hash = computeSha256Hex(payload).slice(0, 16);
  return `adr_${hash}`;
}
