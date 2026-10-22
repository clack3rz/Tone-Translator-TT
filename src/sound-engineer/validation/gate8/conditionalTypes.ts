// src/sound-engineer/validation/gate8/conditionalTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-23:
// Conditional Authorization, Scope Restriction & Boundary Subsystem.
// Bound to frozen specification v0.1j Section 27, Table 18, and Build Plan v0.1h WP-23.

import {
  AdoptionDecisionRecord,
  ProductionReadinessAssessmentRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { RollbackVerificationEvidence } from "../readiness/productionReadinessTypes";
import { VerifyAdoptionDecisionIntegrityOptions } from "./gate8Signer";
import { IntegrityProvider } from "../schemas/integrity";

/**
 * Declarative governance review condition (Section 27.3 Item 5).
 * Declares mandatory governance review triggers or validity review checkpoints.
 * WP-23 does not schedule or execute automation jobs.
 */
export interface ConditionalReviewRequirement {
  /** Governed trigger for mandatory review (e.g. "TARGETED_EVIDENCE_SUBMISSION", "VALIDITY_EXPIRATION", "MILESTONE_COMPLETION") */
  readonly reviewTrigger: string;

  /** Required reviewing governance authority role */
  readonly requiredReviewerRole: string;

  /** Specific conditions and criteria to be audited during the review */
  readonly reviewConditions: readonly string[];
}

/**
 * Declarative follow-up empirical evidence requirement (Section 27.3 Item 6).
 * States specific empirical data required to achieve full authorization.
 * WP-23 does not fabricate evidence or mark requirements satisfied prematurely.
 */
export interface ConditionalFollowUpEvidenceRequirement {
  /** Target evidence record kinds required (e.g. ["ObjectiveEvidenceRecord", "UATEvaluationRecord"]) */
  readonly targetEvidenceKinds: readonly string[];

  /** Human-readable auditable description of evidence needed */
  readonly description: string;

  /** Target scope units for which additional validation must be gathered */
  readonly targetScopeUnits: readonly string[];

  /** Minimum case or fixture count required if applicable */
  readonly minimumTestCount?: number;
}

/**
 * Declarative validity and expiration condition (Section 27.3 Item 7).
 * Implements bounded validity semantics without adding fields to Record 21.
 */
export interface ConditionalValidityCondition {
  /** Formal reference identifier to the condition contract (e.g. "cond_contract_v1_edge_2026_q4") */
  readonly validityConditionRef: string;

  /** Optional explicit expiration timestamp in ISO 8601 UTC */
  readonly expiresAt?: string;

  /** Associated telemetry stop-criteria profile references */
  readonly stopCriteriaRefs?: readonly string[];

  /** Human-readable explanation of validity boundary */
  readonly description: string;
}

/**
 * Non-persisted implementation contract representing the structured conditional authorization plan.
 * Governed Rule:
 * This helper is:
 * - NOT a governed validation record;
 * - NOT Record 23;
 * - NOT a graph entity;
 * - NOT appended to the audit ledger as a new frozen record type;
 * - NOT allowed to add a 15th field to AdoptionDecisionRecord.
 *
 * It models Section 27.3 concepts in memory and projects them deterministically into canonical Record 21 fields.
 */
export interface ConditionalAuthorizationPlan {
  /** Unique deterministic identifier for this conditional plan */
  readonly planId: string;

  /** Associated parent ValidationPackage identifier */
  readonly packageId: string;

  /** Associated ProductionReadinessAssessmentRecord identifier */
  readonly readinessAssessmentId: string;

  /** Explicitly narrowed permitted cutover scope (authorized_scope <= requested_scope <= tested_scope) */
  readonly authorizedScope: readonly string[];

  /** Explicit list of sub-models, gear, or parameter spaces excluded from cutover */
  readonly excludedScope: readonly string[];

  /** Declared governance bounds and compensating controls on deployment */
  readonly authorizationConstraints: readonly string[];

  /** Real-time telemetry monitoring rules, alert profile references, and stop criteria */
  readonly requiredMonitoring: readonly string[];

  /** Mandatory governance review requirement */
  readonly reviewRequirement?: ConditionalReviewRequirement;

  /** Specific empirical data required to remove condition or achieve full authorization */
  readonly followUpEvidenceRequirement?: ConditionalFollowUpEvidenceRequirement;

  /** Bounded validity condition or expiration definition */
  readonly validityCondition?: ConditionalValidityCondition;

  /** Revalidation prerequisites if conditions are breached or expire */
  readonly revalidationPrerequisites?: readonly string[];

  /** Governed rationale justifying conditional grant based on acceptable risk */
  readonly rationale: string;

  /** ISO 8601 UTC creation timestamp */
  readonly createdAt: string;
}

/**
 * Projection of the internal ConditionalAuthorizationPlan into canonical Record 21 fields.
 * Conforms strictly to the frozen 14-field schema of AdoptionDecisionRecord.
 */
export interface CanonicalRecord21Projection {
  /** Mapped to Record 21 authorized_scope */
  readonly authorizedScope: readonly string[];

  /** Mapped to Record 21 conditions_and_restrictions */
  readonly conditionsAndRestrictions: readonly string[];

  /** Mapped to Record 21 mandatory_monitoring_rules */
  readonly mandatoryMonitoringRules: readonly string[];
}

/**
 * Input supplied to ConditionalAuthorizationManager.prepareConditionalPlan().
 */
export interface PrepareConditionalPlanInput {
  /** Parent ValidationPackage under evaluation */
  readonly packageRecord: ValidationPackage;

  /** Pre-Gate 8 Four-Pillar Production Readiness Assessment (Record 20) */
  readonly readinessAssessmentRecord: ProductionReadinessAssessmentRecord;

  /** Tested ValidationScopeRecord (Record 2) */
  readonly scopeRecord: ValidationScopeRecord;

  /** Optional sealed ValidationVersionBindingRecord (Record 3) */
  readonly versionBindingRecord?: ValidationVersionBindingRecord;

  /** Requested candidate scope from Phase 1C.5g (defaults to scopeRecord.included_units) */
  readonly requestedScope?: readonly string[];

  /** Proposed authorized subset of scope */
  readonly proposedAuthorizedScope?: readonly string[];

  /** Explicit list of units or gear excluded from authorization */
  readonly excludedScope?: readonly string[];

  /** Explicit governance constraints and compensating controls */
  readonly authorizationConstraints?: readonly string[];

  /** Heightened telemetry monitoring rules and stop criteria */
  readonly requiredMonitoring?: readonly string[];

  /** Declarative review requirement */
  readonly reviewRequirement?: ConditionalReviewRequirement;

  /** Declarative follow-up evidence requirement */
  readonly followUpEvidenceRequirement?: ConditionalFollowUpEvidenceRequirement;

  /** Declarative validity condition or expiration */
  readonly validityCondition?: ConditionalValidityCondition;

  /** Revalidation prerequisites declared for condition breach/expiry */
  readonly revalidationPrerequisites?: readonly string[];

  /** Associated uncertainty records to check for acceptable low risk vs blocking */
  readonly uncertaintyRecords?: readonly ValidationUncertaintyRecord[];

  /** Rollback verification evidence consumed from WP-27 boundary */
  readonly rollbackEvidence?: RollbackVerificationEvidence;

  /** Audit rationale explaining acceptable risk */
  readonly rationale?: string;

  /** Deterministic timestamp override */
  readonly timestamp?: string;

  /** Explicit plan identifier override */
  readonly planId?: string;
}

/**
 * Options for validating an existing AdoptionDecisionRecord.
 */
export interface ValidateConditionalAuthorizationOptions {
  readonly integrityOptions?: VerifyAdoptionDecisionIntegrityOptions | IntegrityProvider;
  readonly expectedPackageId?: string;
  readonly expectedReadinessId?: string;
}

/**
 * Result returned by ConditionalAuthorizationManager.validateConditionalAuthorization().
 */
export interface ConditionalAuthorizationValidationResult {
  readonly isValid: boolean;
  readonly decisionId: string;
  readonly packageId: string;
  readonly authorizedScope: readonly string[];
  readonly conditionsAndRestrictions: readonly string[];
  readonly mandatoryMonitoringRules: readonly string[];
  readonly validationErrors: readonly string[];
  readonly evaluatedAt: string;
}

/**
 * Context supplied when evaluating the current validity of a conditional authorization.
 */
export interface ValidityEvaluationContext {
  /** Explicit evaluation instant (asOf) in ISO 8601 UTC format */
  readonly asOf?: string;

  /** Alternative explicit evaluation instant in ISO 8601 UTC format */
  readonly evaluationTimestamp?: string;

  /** Timestamp representing the evaluation instant (legacy alias for asOf) */
  readonly currentTimestamp?: string;

  /** Set of stop-criteria failure indicators triggered in telemetry */
  readonly triggeredStopCriteria?: readonly string[];

  /** Flag indicating whether mandatory review has passed if review was required */
  readonly reviewCompleted?: boolean;

  /** Specific evidence IDs submitted for follow-up verification */
  readonly submittedEvidenceRefs?: readonly string[];
}

/**
 * Declarative evaluation result of conditional validity and revalidation needs.
 */
export interface ConditionalValidityEvaluationResult {
  /** Current validity status */
  readonly status: "CURRENT" | "EXPIRED" | "UNMET_CONDITIONS";

  /** Whether the conditional authorization currently satisfies its contract */
  readonly isValid: boolean;

  /** Whether revalidation is required due to expiry or unmet conditions */
  readonly revalidationRequired: boolean;

  /** Reasons explaining why revalidation is required */
  readonly revalidationReasons: readonly string[];

  /** Scope affected by the revalidation requirement */
  readonly revalidationScope: readonly string[];

  /** Timestamp of evaluation */
  readonly evaluatedAt: string;
}
