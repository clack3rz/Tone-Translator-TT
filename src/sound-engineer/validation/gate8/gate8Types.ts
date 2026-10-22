// src/sound-engineer/validation/gate8/gate8Types.ts
// Authoritative types and interfaces for Phase 1C.5h WP-22:
// Gate 8 Production Cutover Adjudication & Scoped Authorization (Record 21).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 18, and Build Plan v0.1h WP-22.

import {
  ADOPTION_DECISION_OUTCOMES,
  AdoptionDecisionOutcome,
  GOVERNANCE_STATUSES,
  GovernanceStatus,
  PILLAR_READINESS_STATUSES,
  PillarReadinessStatus,
} from "../schemas/enums";
import {
  AdoptionDecisionRecord,
  adoptionDecisionRecordSchema,
  ProductionReadinessAssessmentRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import {
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { RelationshipEdge } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { RollbackVerificationEvidence } from "../readiness/productionReadinessTypes";

export {
  ADOPTION_DECISION_OUTCOMES,
  type AdoptionDecisionOutcome,
  GOVERNANCE_STATUSES,
  type GovernanceStatus,
  type AdoptionDecisionRecord,
  adoptionDecisionRecordSchema,
  PILLAR_READINESS_STATUSES,
  type PillarReadinessStatus,
};

/**
 * Governed recognizing authority roles for Gate 8 cutover authorization.
 */
export const GOVERNED_AUTHORIZING_OFFICIAL_ROLES = [
  "CHIEF_SOUND_ENGINEERING_GOVERNANCE_AUTHORITY",
  "PHASE_1C5H_GOVERNANCE_OFFICIAL",
  "GOVERNANCE_LEAD",
  "LEAD_ACOUSTIC_ARCHITECT",
  "AUTOMATED_GATE8_PIPELINE",
] as const;

export type GovernedAuthorizingOfficialRole =
  (typeof GOVERNED_AUTHORIZING_OFFICIAL_ROLES)[keyof typeof GOVERNED_AUTHORIZING_OFFICIAL_ROLES];

/**
 * Authorizing authority validator function type.
 */
export type AuthorizingOfficialValidator = (official: string) => boolean;

/**
 * Cryptographic credential material for an authorized Gate 8 official.
 */
export interface AuthorityKeyCredentials {
  readonly officialId: string;
  readonly role: string;
  readonly keyOrSecret: string;
  readonly publicKeyOrRef?: string;
}

/**
 * Registry interface for verifying and retrieving trusted Gate 8 authority signing credentials.
 */
export interface AuthorityRegistry {
  isAuthorizedOfficial(officialId: string): boolean;
  getAuthorityCredentials(officialId: string): AuthorityKeyCredentials | undefined;
}

/**
 * Input parameters supplied to Gate8AdjudicationEngine.adjudicateCutover().
 */
export interface Gate8AdjudicationInput {
  /** Parent ValidationPackage under evaluation */
  readonly packageRecord: ValidationPackage;

  /** Pre-Gate 8 Four-Pillar Production Readiness Assessment (Record 20) */
  readonly readinessAssessmentRecord: ProductionReadinessAssessmentRecord;

  /** Tested ValidationScopeRecord (Record 2) */
  readonly scopeRecord: ValidationScopeRecord;

  /** Exact sealed ValidationVersionBindingRecord (Record 3) */
  readonly versionBindingRecord: ValidationVersionBindingRecord;

  /** Optional governing ValidationOutcomeRecord (Record 17) underlying this evaluation */
  readonly validationOutcomeRecord?: ValidationOutcomeRecord;

  /** Requested candidate scope from Phase 1C.5g (defaults to scopeRecord.included_units) */
  readonly requestedScope?: readonly string[];

  /** Proposed bounded authorization scope (defaults to requestedScope for AUTHORIZED) */
  readonly proposedAuthorizedScope?: readonly string[];

  /** Explicitly requested decision outcome (optional; inferred if omitted) */
  readonly decisionOutcome?: AdoptionDecisionOutcome;

  /** Conditions and restrictions for conditional authorization (must be [] for full AUTHORIZED) */
  readonly conditionsAndRestrictions?: readonly string[];

  /** Mandatory real-time telemetry monitoring rules declared for cutover */
  readonly mandatoryMonitoringRules?: readonly string[];

  /** Reference to verified automated rollback certificate/execution */
  readonly rollbackVerificationCertRef?: string;

  /** Explicit typed rollback evidence consumed from WP-27 boundary */
  readonly rollbackEvidence?: RollbackVerificationEvidence;

  /** Identity of the authorizing official or automated pipeline */
  readonly authorizingOfficial: string;

  /** Optional cryptographic key proof of the authorizing official (for authentic signing verification) */
  readonly authorizingOfficialKey?: string;

  /** Optional initial governance status override (governed default is ACTIVE) */
  readonly governanceStatus?: GovernanceStatus;

  /** Deterministic timestamp override (defaults to current ISO 8601 UTC) */
  readonly timestamp?: string;

  /** Optional explicit decision_id override */
  readonly decisionId?: string;

  /** Optional relationship graph for node and AUTHORIZES_SCOPE edge registration */
  readonly graph?: ValidationRelationshipGraph;

  /** Optional append-only audit ledger for immutable record persistence */
  readonly auditLedger?: ValidationAuditLedger;

  /** Pluggable technology-neutral integrity provider */
  readonly integrityProvider?: IntegrityProvider;

  /** Optional trusted authority registry for verifying official signing credentials */
  readonly authorityRegistry?: AuthorityRegistry;

  /** Optional custom validator for the authorizing official */
  readonly authorizingOfficialValidator?: AuthorizingOfficialValidator;

  /** Substantive defect rationale for REJECTED outcomes */
  readonly substantiveDefectRationale?: string;

  /** Blocking rationale for BLOCKED outcomes */
  readonly blockingRationale?: string;
}

/**
 * Result returned by Gate8AdjudicationEngine.adjudicateCutover().
 */
export interface Gate8AdjudicationResult {
  /** Authoritative, deeply frozen, sealed AdoptionDecisionRecord (Record 21) */
  readonly decisionRecord: AdoptionDecisionRecord;

  /** Resulting Gate 8 decision outcome */
  readonly decisionOutcome: AdoptionDecisionOutcome;

  /** Explicit authorized scope granted */
  readonly authorizedScope: readonly string[];

  /** Whether production cutover was authorized (true for AUTHORIZED | CONDITIONALLY_AUTHORIZED) */
  readonly isAuthorized: boolean;

  /** Created AUTHORIZES_SCOPE edge (only present for positive authorizations) */
  readonly authorizesScopeEdge?: RelationshipEdge;

  /** Deterministic rationale synthesizing Gate 8 adjudication */
  readonly adjudicationRationale: string;
}

/**
 * Configuration options for Gate8AdjudicationEngine instantiation.
 */
export interface Gate8AdjudicationEngineOptions {
  readonly graph?: ValidationRelationshipGraph;
  readonly auditLedger?: ValidationAuditLedger;
  readonly integrityProvider?: IntegrityProvider;
  readonly authorityRegistry?: AuthorityRegistry;
  readonly authorizingOfficialValidator?: AuthorizingOfficialValidator;
}

/**
 * Helper to determine whether an AdoptionDecisionRecord conveys positive production cutover authority.
 * Enforces that governance_status === ACTIVE alone NEVER conveys authorization.
 */
export function isDecisionAuthorized(record: AdoptionDecisionRecord): boolean {
  if (!record) return false;
  const isPositiveOutcome =
    record.decision_outcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
    record.decision_outcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED;
  return isPositiveOutcome && record.authorized_scope.length > 0;
}
