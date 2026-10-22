// src/sound-engineer/validation/gate8/stateMachineTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-24:
// Post-Cutover Gate 8 Lifecycle State Machine (Record 22).
// Bound to frozen specification v0.1j Section 28, Table 18, Table 04, and Build Plan v0.1h WP-24.

import {
  AdoptionDecisionOutcome,
  GATE8_CHANGE_TRIGGER_SOURCES,
  Gate8ChangeTriggerSource,
  GOVERNANCE_EFFECTS,
  GovernanceEffect,
  GOVERNANCE_STATUSES,
  GovernanceStatus,
  NEW_GOVERNANCE_STATUSES,
  NewGovernanceStatus,
  PREVIOUS_GOVERNANCE_STATUSES,
  PreviousGovernanceStatus,
  REQUIRED_ADOPTION_RESPONSES,
  RequiredAdoptionResponse,
} from "../schemas/enums";
import {
  AdoptionDecisionRecord,
  Gate8ChangeRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import { AuthorityRegistry, AuthorizingOfficialValidator } from "./gate8Types";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";

export {
  GATE8_CHANGE_TRIGGER_SOURCES,
  type Gate8ChangeTriggerSource,
  GOVERNANCE_EFFECTS,
  type GovernanceEffect,
  GOVERNANCE_STATUSES,
  type GovernanceStatus,
  NEW_GOVERNANCE_STATUSES,
  type NewGovernanceStatus,
  PREVIOUS_GOVERNANCE_STATUSES,
  type PreviousGovernanceStatus,
  REQUIRED_ADOPTION_RESPONSES,
  type RequiredAdoptionResponse,
  type Gate8ChangeRecord,
};

/**
 * Governed formal Gate 8 re-adjudication evidence contract.
 * Required to reinstate SUSPENDED or RESTRICTED authorizations to ACTIVE.
 * Strictly prevents generic state-update calls from reactivating authorizations.
 */
export interface Gate8ReadjudicationEvidence {
  /** Identifier of the formal re-adjudication decision or record */
  readonly readjudicationDecisionRef: string;

  /** Must be AUTHORIZED or CONDITIONALLY_AUTHORIZED */
  readonly decisionOutcome: AdoptionDecisionOutcome;

  /** Verified authorized scope confirmed by re-adjudication */
  readonly authorizedScope: readonly string[];

  /** Official presiding over re-adjudication */
  readonly authorizingOfficial: string;

  /** Optional cryptographic key for verifying authentic official signature */
  readonly authorizingOfficialKey?: string;

  /** Substantive technical justification for reinstatement */
  readonly justification: string;

  /** Reference to supporting ValidationOutcomeRecord (Record 17) with outcome PASS */
  readonly validationOutcomeRef?: string;

  /** Reference to Pre-Gate 8 Production Readiness Assessment (Record 20) with satisfied pillars */
  readonly readinessAssessmentRef?: string;

  /** Re-adjudication timestamp in ISO 8601 UTC */
  readonly timestamp?: string;
}

/**
 * Base parameters common to all Gate 8 state transition requests.
 */
export interface BaseTransitionInput {
  /** Reference to target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Optional AdoptionDecisionRecord for implicit ingestion */
  readonly decisionRecord?: AdoptionDecisionRecord;

  /** Technical explanation of modification */
  readonly changeReason: string;

  /** Trigger source causing change */
  readonly triggerSource: Gate8ChangeTriggerSource;

  /** Governance official authorizing this transition */
  readonly authorizingOfficial: string;

  /** Optional cryptographic key for authentic authority verification */
  readonly authorizingOfficialKey?: string;

  /** Explicit deterministic change_id override */
  readonly changeId?: string;

  /** Deterministic timestamp override (ISO 8601 UTC) */
  readonly timestamp?: string;

  /** Optimistic concurrency check: caller asserts current status */
  readonly expectedCurrentStatus?: GovernanceStatus;

  /** Optimistic concurrency check: caller asserts current revision */
  readonly expectedRevision?: number;
}

/**
 * Input for ACTIVE -> SUSPENDED transition.
 */
export interface SuspendAuthorizationInput extends BaseTransitionInput {
  /** Affected scope to suspend (defaults to all currently authorized units) */
  readonly affectedScope?: readonly string[];

  /** Whether targeted revalidation is required (defaults to true) */
  readonly revalidationRequired?: boolean;

  /** Desired adoption response for Phase 1C.5g (defaults to ADOPTION_HALTED) */
  readonly requiredAdoptionResponse?: RequiredAdoptionResponse;
}

/**
 * Input for ACTIVE -> RESTRICTED transition (scope narrowing).
 */
export interface RestrictAuthorizationInput extends BaseTransitionInput {
  /** Defective gear units to carve out and exclude from cutover (must be non-empty) */
  readonly carvedOutScope: readonly string[];

  /** Explicit retained scope (optional; if omitted, defaults to currentScope minus carvedOutScope) */
  readonly retainedScope?: readonly string[];

  /** Whether revalidation is required for the carved out scope (defaults to true) */
  readonly revalidationRequired?: boolean;

  /** Desired adoption response for Phase 1C.5g (defaults to SCOPE_NARROWED) */
  readonly requiredAdoptionResponse?: RequiredAdoptionResponse;
}

/**
 * Input for ACTIVE | SUSPENDED | RESTRICTED -> WITHDRAWN transition.
 * WITHDRAWN is terminal and permanently closes the authorization record.
 */
export interface WithdrawAuthorizationInput extends BaseTransitionInput {
  /** Affected scope withdrawn (defaults to all currently authorized units) */
  readonly affectedScope?: readonly string[];

  /** Permanent withdrawal never triggers automatic revalidation on this record (defaults to false) */
  readonly revalidationRequired?: boolean;

  /** Desired adoption response for Phase 1C.5g (defaults to ROLLBACK_REQUIRED) */
  readonly requiredAdoptionResponse?: RequiredAdoptionResponse;
}

/**
 * Input for formal Gate 8 re-adjudication restoring a SUSPENDED or RESTRICTED authorization.
 * Strict prerequisite: requires a newly issued canonical AdoptionDecisionRecord (Record 21)
 * from Activity WF-16 / Gate8AdjudicationEngine.
 */
export interface Gate8ReadjudicationInput {
  /** The prior authorization decision_id that is currently SUSPENDED or RESTRICTED */
  readonly priorDecisionId: string;

  /** Alias for priorDecisionId for API flexibility */
  readonly decisionId?: string;

  /** The newly issued canonical AdoptionDecisionRecord (Record 21) from formal Gate 8 re-adjudication */
  readonly readjudicationDecisionRecord: AdoptionDecisionRecord;

  /** Technical explanation of the re-adjudication and reinstatement */
  readonly changeReason: string;

  /** Trigger source causing change (defaults to HUMAN_AUDIT) */
  readonly triggerSource?: Gate8ChangeTriggerSource;

  /** Governance official authorizing this transition */
  readonly authorizingOfficial: string;

  /** Optional cryptographic key for authentic authority verification */
  readonly authorizingOfficialKey?: string;

  /** Explicit deterministic change_id override for the prior record's retirement */
  readonly changeId?: string;

  /** Timestamp override (ISO 8601 UTC) */
  readonly timestamp?: string;

  /** Optimistic concurrency check: caller asserts prior status */
  readonly expectedCurrentStatus?: GovernanceStatus;

  /** Optimistic concurrency check: caller asserts prior revision */
  readonly expectedRevision?: number;

  /** Optional evidence metadata */
  readonly readjudicationEvidence?: Gate8ReadjudicationEvidence;
}

/**
 * Reinstatement input type (alias of Gate8ReadjudicationInput).
 */
export type ReinstateAuthorizationInput = Gate8ReadjudicationInput;

/**
 * Result returned upon successful formal Gate 8 re-adjudication.
 * Distinguishes clearly between the prior authorization record (retired as SUPERSEDED)
 * and the newly authorized record (registered as ACTIVE).
 */
export interface Gate8ReadjudicationResult {
  readonly success: boolean;
  readonly priorDecisionId: string;
  readonly previousStatus: PreviousGovernanceStatus;
  readonly supersededChangeRecord: Gate8ChangeRecord;
  readonly newDecisionRecord: AdoptionDecisionRecord;
  readonly newAuthorizationState: Gate8AuthorizationState;
  readonly lifecycleEvent: Gate8LifecycleChangeEvent;
  readonly transitionRationale: string;
}

/**
 * Summary of reconciliation / replay operation from authoritative audit ledger.
 */
export interface Gate8ReconciliationResult {
  readonly reconciledDecisions: number;
  readonly replayedChanges: number;
  readonly graphNodesRegistered: number;
}

/**
 * Input for ACTIVE | SUSPENDED | RESTRICTED -> SUPERSEDED transition (version upgrade).
 */
export interface SupersedeAuthorizationInput extends BaseTransitionInput {
  /** Reference to the superseding AdoptionDecisionRecord */
  readonly supersedingDecisionId: string;

  /** Affected scope superseded (defaults to current scope) */
  readonly affectedScope?: readonly string[];

  /** Defaults to false */
  readonly revalidationRequired?: boolean;

  /** Defaults to NO_OPERATIONAL_CHANGE */
  readonly requiredAdoptionResponse?: RequiredAdoptionResponse;
}

/**
 * Unified transition request descriptor.
 */
export interface Gate8TransitionRequest extends BaseTransitionInput {
  readonly targetStatus: GovernanceStatus;
  readonly affectedScope?: readonly string[];
  readonly carvedOutScope?: readonly string[];
  readonly retainedScope?: readonly string[];
  readonly supersedingDecisionId?: string;
  readonly readjudicationEvidence?: Gate8ReadjudicationEvidence;
  readonly readjudicationDecisionRecord?: AdoptionDecisionRecord;
  readonly revalidationRequired?: boolean;
  readonly requiredAdoptionResponse?: RequiredAdoptionResponse;
  readonly governanceEffect?: GovernanceEffect;
}

/**
 * Authoritative event emitted upon successful Gate 8 lifecycle state transition.
 * Consumed by Phase 1C.5g and downstream governance monitors.
 */
export interface Gate8LifecycleChangeEvent {
  readonly eventId: string;
  readonly eventType: "GATE8_LIFECYCLE_STATUS_CHANGED";
  readonly decisionId: string;
  readonly previousGovernanceStatus: PreviousGovernanceStatus;
  readonly newGovernanceStatus: GovernanceStatus;
  readonly changeRecordId: string;
  readonly changeRecord: Gate8ChangeRecord;
  readonly governanceEffect: GovernanceEffect;
  readonly affectedScope: readonly string[];
  readonly currentAuthorizedScope: readonly string[];
  readonly requiredAdoptionResponse: RequiredAdoptionResponse;
  readonly timestamp: string;
  readonly authorizingOfficial: string;
}

/**
 * Listener function interface for lifecycle change events.
 */
export type Gate8LifecycleEventListener = (
  event: Gate8LifecycleChangeEvent
) => void | Promise<void>;

/**
 * Authoritative snapshot of an authorization's current lifecycle state.
 */
export interface Gate8AuthorizationState {
  readonly decisionId: string;
  readonly initialDecisionRecord: AdoptionDecisionRecord;
  readonly currentStatus: GovernanceStatus;
  readonly currentAuthorizedScope: readonly string[];
  readonly revision: number;
  readonly history: readonly Gate8ChangeRecord[];
  readonly isTerminal: boolean;
  readonly lastUpdatedTimestamp: string;
}

/**
 * Result returned by state machine transitions.
 */
export interface Gate8TransitionResult {
  readonly success: boolean;
  readonly changeRecord: Gate8ChangeRecord;
  readonly previousStatus: PreviousGovernanceStatus;
  readonly newStatus: GovernanceStatus;
  readonly decisionId: string;
  readonly currentAuthorizedScope: readonly string[];
  readonly revision: number;
  readonly lifecycleEvent: Gate8LifecycleChangeEvent;
  readonly transitionRationale: string;
}

/**
 * State machine options.
 */
export interface Gate8StateMachineOptions {
  readonly auditLedger?: ValidationAuditLedger;
  readonly graph?: ValidationRelationshipGraph;
  readonly integrityProvider?: IntegrityProvider;
  readonly authorityRegistry?: AuthorityRegistry;
  readonly authorizingOfficialValidator?: AuthorizingOfficialValidator;
  readonly onLifecycleChange?: Gate8LifecycleEventListener;
}
