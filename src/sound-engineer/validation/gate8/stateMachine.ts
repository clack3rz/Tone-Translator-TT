// src/sound-engineer/validation/gate8/stateMachine.ts
// Gate8StateMachine: Authoritative post-cutover Gate 8 governance lifecycle state machine.
// Produces Record 22 — Gate8ChangeRecord and manages deterministic lifecycle transitions.
// Bound to frozen specification v0.1j Section 28, Table 18, Table 04, Invariant 10,
// and Build Plan v0.1h WP-24.

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import {
  ADOPTION_DECISION_OUTCOMES,
  GATE8_CHANGE_TRIGGER_SOURCES,
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
  adoptionDecisionRecordSchema,
  Gate8ChangeRecord,
  parseGate8ChangeRecord,
} from "../schemas/records";
import {
  canonicalizeJson,
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { AuthorityRegistry } from "./gate8Types";
import {
  assertAuthorizingOfficial,
  DEFAULT_GATE8_AUTHORITY_REGISTRY,
  KeyedAuthorityIntegrityProvider,
} from "./gate8Signer";
import {
  BaseTransitionInput,
  Gate8AuthorizationState,
  Gate8LifecycleChangeEvent,
  Gate8LifecycleEventListener,
  Gate8ReadjudicationEvidence,
  Gate8ReadjudicationInput,
  Gate8ReadjudicationResult,
  Gate8ReconciliationResult,
  Gate8StateMachineOptions,
  Gate8TransitionRequest,
  Gate8TransitionResult,
  ReinstateAuthorizationInput,
  RestrictAuthorizationInput,
  SupersedeAuthorizationInput,
  SuspendAuthorizationInput,
  WithdrawAuthorizationInput,
} from "./stateMachineTypes";
import {
  InvalidGate8ChangeRecordError,
  InvalidGate8TransitionError,
  PersistenceReconciliationError,
  ReadjudicationRequiredError,
  StaleGovernanceStateError,
  TerminalStateError,
  UnknownAuthorizationError,
} from "./stateMachineErrors";

/**
 * Creates tamper-evident RecordIntegrityMetadata over a Gate8ChangeRecord payload.
 */
export function sealGate8ChangePayload(
  payloadWithoutIntegrity: Record<string, unknown>,
  authorizingOfficial: string,
  integrityProvider: IntegrityProvider,
  sealedAt: string
): RecordIntegrityMetadata {
  const canonicalJson = canonicalizeJson(payloadWithoutIntegrity);
  const integrityDigest = integrityProvider.computeDigest(canonicalJson);

  return {
    integrity_digest: integrityDigest,
    algorithm: integrityProvider.algorithmName,
    sealed_at: sealedAt,
    signer_identity: authorizingOfficial,
    canonical_serialization_format: "RFC-8785",
  };
}

/**
 * Verifies the cryptographic integrity of a Gate8ChangeRecord.
 */
export function verifyGate8ChangeIntegrity(
  record: Gate8ChangeRecord,
  options?:
    | {
        registry?: AuthorityRegistry;
        expectedKey?: string;
        integrityProvider?: IntegrityProvider;
      }
    | IntegrityProvider
): boolean {
  if (!record || !record.record_integrity_metadata) return false;
  const { record_integrity_metadata, ...payloadWithoutIntegrity } = record;
  const canonicalJson = canonicalizeJson(payloadWithoutIntegrity);

  if (options && "computeDigest" in options && typeof options.computeDigest === "function") {
    return options.verifyDigest(canonicalJson, record_integrity_metadata.integrity_digest);
  }

  const opts = (options as any) ?? {};
  const registry: AuthorityRegistry = opts.registry ?? DEFAULT_GATE8_AUTHORITY_REGISTRY;

  if (record_integrity_metadata.algorithm === "HMAC-SHA256") {
    const officialId = record.authorizing_official;
    const creds = registry.getAuthorityCredentials(officialId);
    const authorityKey = opts.expectedKey ?? creds?.keyOrSecret;
    if (!authorityKey) return false;
    const provider = new KeyedAuthorityIntegrityProvider(authorityKey);
    return provider.verifyDigest(canonicalJson, record_integrity_metadata.integrity_digest);
  }

  if (opts.integrityProvider) {
    return opts.integrityProvider.verifyDigest(
      canonicalJson,
      record_integrity_metadata.integrity_digest
    );
  }

  const fallback = new DefaultSha256IntegrityProvider();
  return fallback.verifyDigest(canonicalJson, record_integrity_metadata.integrity_digest);
}

/**
 * Derives a deterministic change ID for a Gate8ChangeRecord when not provided.
 */
export function deriveDeterministicChangeId(
  decisionId: string,
  fromStatus: string,
  toStatus: string,
  timestamp: string,
  triggerSource: string
): string {
  const provider = new DefaultSha256IntegrityProvider();
  const raw = `${decisionId}:${fromStatus}:${toStatus}:${timestamp}:${triggerSource}`;
  const digest = provider.computeDigest(raw).substring(0, 16);
  return `g8c_${digest}`;
}

interface InternalAuthorizationState {
  decisionId: string;
  initialDecisionRecord: AdoptionDecisionRecord;
  currentStatus: GovernanceStatus;
  currentAuthorizedScope: string[];
  revision: number;
  history: Gate8ChangeRecord[];
  isTerminal: boolean;
  lastUpdatedTimestamp: string;
}

/**
 * Authoritative Gate 8 Governance Lifecycle State Machine.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. Post-cutover Gate 8 authorization is not an irrevocable, permanent grant of production exposure.
 * 2. Modifications are recorded via immutable, tamper-evident Gate8ChangeRecord (Record 22);
 *    historical decision records are NEVER mutated.
 * 3. Permitted Record 22 transitions:
 *    - ACTIVE -> SUSPENDED (Temporary stop upon anomaly / revalidation trigger)
 *    - ACTIVE -> RESTRICTED (Scope narrowing for defective subset)
 *    - ACTIVE | SUSPENDED | RESTRICTED -> WITHDRAWN (Terminal revocation)
 *    - ACTIVE | SUSPENDED | RESTRICTED -> SUPERSEDED (Version upgrade / replacement by re-adjudication)
 * 4. Record 22 CANNOT grant or reinstate ACTIVE status under frozen Section 28.3.
 *    Restoration from SUSPENDED or RESTRICTED to ACTIVE is achieved strictly through formal Gate 8
 *    re-adjudication issuing a new canonical AdoptionDecisionRecord (Record 21 / WF-16).
 *    The prior suspended/restricted record is retired as SUPERSEDED via Record 22.
 * 5. WITHDRAWN is strictly a TERMINAL governance state:
 *    - NO WITHDRAWN -> any transition exists.
 *    - Withdrawn records are permanently closed and cannot be reactivated or recycled.
 *    - A remediated candidate requires a new ValidationPackage and a new AdoptionDecisionRecord.
 * 6. previous_governance_status is strictly constrained to: ACTIVE | SUSPENDED | RESTRICTED.
 * 7. new_governance_status is strictly constrained to: SUSPENDED | RESTRICTED | WITHDRAWN | SUPERSEDED.
 * 8. Persistence consistency: Authoritative ledger replay reconstructs lifecycle state and relationship
 *    nodes without duplicate ledger entries or permanent stale state.
 */
export class Gate8StateMachine {
  private readonly options: Gate8StateMachineOptions;
  private readonly authorityRegistry: AuthorityRegistry;
  private readonly defaultIntegrityProvider: IntegrityProvider;

  private readonly statesByDecisionId = new Map<string, InternalAuthorizationState>();
  private readonly completedTransitionsByChangeId = new Map<string, Gate8TransitionResult>();
  private readonly lifecycleEvents: Gate8LifecycleChangeEvent[] = [];
  private readonly listeners = new Set<Gate8LifecycleEventListener>();

  constructor(options?: Gate8StateMachineOptions) {
    this.options = options ?? {};
    this.authorityRegistry =
      this.options.authorityRegistry ?? DEFAULT_GATE8_AUTHORITY_REGISTRY;
    this.defaultIntegrityProvider =
      this.options.integrityProvider ?? new DefaultSha256IntegrityProvider();

    if (this.options.onLifecycleChange) {
      this.listeners.add(this.options.onLifecycleChange);
    }
  }

  // ---------------------------------------------------------------------------
  // Authorization Registration and Query API
  // ---------------------------------------------------------------------------

  /**
   * Registers an AdoptionDecisionRecord into the state machine.
   * If already registered, returns the existing state snapshot.
   */
  public registerAuthorization(
    decisionRecord: AdoptionDecisionRecord
  ): Gate8AuthorizationState {
    if (!decisionRecord || !decisionRecord.decision_id) {
      throw new InvalidGate8ChangeRecordError(
        "AdoptionDecisionRecord must be defined with a valid decision_id."
      );
    }

    const decisionId = decisionRecord.decision_id;
    const existing = this.statesByDecisionId.get(decisionId);
    if (existing) {
      return this.snapshotState(existing);
    }

    const status = decisionRecord.governance_status;
    const isTerminal =
      status === GOVERNANCE_STATUSES.WITHDRAWN ||
      status === GOVERNANCE_STATUSES.SUPERSEDED;

    const internalState: InternalAuthorizationState = {
      decisionId,
      initialDecisionRecord: defensiveClone(decisionRecord),
      currentStatus: status,
      currentAuthorizedScope: [...decisionRecord.authorized_scope],
      revision: 1,
      history: [],
      isTerminal,
      lastUpdatedTimestamp: decisionRecord.decision_timestamp,
    };

    this.statesByDecisionId.set(decisionId, internalState);
    return this.snapshotState(internalState);
  }

  /**
   * Retrieves the current snapshot of an authorization's lifecycle state.
   */
  public getAuthorizationState(
    decisionId: string
  ): Gate8AuthorizationState | undefined {
    const internal = this.statesByDecisionId.get(decisionId);
    return internal ? this.snapshotState(internal) : undefined;
  }

  /**
   * Returns true if the authorization exists and is in ACTIVE governance status.
   */
  public isAuthorizationActive(decisionId: string): boolean {
    const internal = this.statesByDecisionId.get(decisionId);
    return internal ? internal.currentStatus === GOVERNANCE_STATUSES.ACTIVE : false;
  }

  /**
   * Returns the current authorized scope for a registered authorization.
   */
  public getAuthorizedScope(decisionId: string): readonly string[] {
    const internal = this.statesByDecisionId.get(decisionId);
    if (!internal) {
      throw new UnknownAuthorizationError(decisionId);
    }
    return Object.freeze([...internal.currentAuthorizedScope]);
  }

  /**
   * Returns all Gate8ChangeRecords applied to an authorization in chronological order.
   */
  public getChangeRecords(decisionId: string): readonly Gate8ChangeRecord[] {
    const internal = this.statesByDecisionId.get(decisionId);
    if (!internal) {
      throw new UnknownAuthorizationError(decisionId);
    }
    return deepFreeze(internal.history.map((r) => defensiveClone(r)));
  }

  // ---------------------------------------------------------------------------
  // Dedicated Lifecycle Transition Methods
  // ---------------------------------------------------------------------------

  /**
   * Transitions an ACTIVE authorization to SUSPENDED.
   * Temporary stop upon telemetry stop criteria or upstream invalidation.
   */
  public suspendAuthorization(
    input: SuspendAuthorizationInput
  ): Gate8TransitionResult {
    return this.executeTransition({
      targetStatus: GOVERNANCE_STATUSES.SUSPENDED,
      decisionId: input.decisionId,
      decisionRecord: input.decisionRecord,
      changeReason: input.changeReason,
      triggerSource: input.triggerSource,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeId: input.changeId,
      timestamp: input.timestamp,
      expectedCurrentStatus: input.expectedCurrentStatus,
      expectedRevision: input.expectedRevision,
      affectedScope: input.affectedScope,
      revalidationRequired: input.revalidationRequired ?? true,
      requiredAdoptionResponse:
        input.requiredAdoptionResponse ??
        REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED,
      governanceEffect: GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION,
    });
  }

  /**
   * Transitions an ACTIVE authorization to RESTRICTED (scope narrowing).
   * Carves out defective gear models while preserving cutover for unaffected gear.
   */
  public restrictAuthorization(
    input: RestrictAuthorizationInput
  ): Gate8TransitionResult {
    if (!input.carvedOutScope || input.carvedOutScope.length === 0) {
      throw new InvalidGate8TransitionError(
        GOVERNANCE_STATUSES.ACTIVE,
        GOVERNANCE_STATUSES.RESTRICTED,
        "carvedOutScope must be a non-empty list of gear units to exclude from cutover"
      );
    }

    return this.executeTransition({
      targetStatus: GOVERNANCE_STATUSES.RESTRICTED,
      decisionId: input.decisionId,
      decisionRecord: input.decisionRecord,
      changeReason: input.changeReason,
      triggerSource: input.triggerSource,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeId: input.changeId,
      timestamp: input.timestamp,
      expectedCurrentStatus: input.expectedCurrentStatus,
      expectedRevision: input.expectedRevision,
      carvedOutScope: input.carvedOutScope,
      retainedScope: input.retainedScope,
      revalidationRequired: input.revalidationRequired ?? true,
      requiredAdoptionResponse:
        input.requiredAdoptionResponse ??
        REQUIRED_ADOPTION_RESPONSES.SCOPE_NARROWED,
      governanceEffect: GOVERNANCE_EFFECTS.NARROW_SCOPE,
    });
  }

  /**
   * Transitions ACTIVE, SUSPENDED, or RESTRICTED authorization to WITHDRAWN.
   * Terminal revocation of cutover authority.
   */
  public withdrawAuthorization(
    input: WithdrawAuthorizationInput
  ): Gate8TransitionResult {
    return this.executeTransition({
      targetStatus: GOVERNANCE_STATUSES.WITHDRAWN,
      decisionId: input.decisionId,
      decisionRecord: input.decisionRecord,
      changeReason: input.changeReason,
      triggerSource: input.triggerSource,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeId: input.changeId,
      timestamp: input.timestamp,
      expectedCurrentStatus: input.expectedCurrentStatus,
      expectedRevision: input.expectedRevision,
      affectedScope: input.affectedScope,
      revalidationRequired: input.revalidationRequired ?? false,
      requiredAdoptionResponse:
        input.requiredAdoptionResponse ??
        REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED,
      governanceEffect: GOVERNANCE_EFFECTS.REVOKE_AUTHORIZATION,
    });
  }

  /**
   * Transitions an ACTIVE, SUSPENDED, or RESTRICTED authorization to SUPERSEDED (version upgrade).
   */
  public supersedeAuthorization(
    input: SupersedeAuthorizationInput
  ): Gate8TransitionResult {
    if (!input.supersedingDecisionId || typeof input.supersedingDecisionId !== "string") {
      throw new InvalidGate8TransitionError(
        GOVERNANCE_STATUSES.ACTIVE,
        GOVERNANCE_STATUSES.SUPERSEDED,
        "supersedingDecisionId must be a non-empty string referencing the replacement decision"
      );
    }

    return this.executeTransition({
      targetStatus: GOVERNANCE_STATUSES.SUPERSEDED,
      decisionId: input.decisionId,
      decisionRecord: input.decisionRecord,
      changeReason: input.changeReason,
      triggerSource: input.triggerSource,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeId: input.changeId,
      timestamp: input.timestamp,
      expectedCurrentStatus: input.expectedCurrentStatus,
      expectedRevision: input.expectedRevision,
      supersedingDecisionId: input.supersedingDecisionId,
      affectedScope: input.affectedScope,
      revalidationRequired: input.revalidationRequired ?? false,
      requiredAdoptionResponse:
        input.requiredAdoptionResponse ??
        REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE,
      governanceEffect: GOVERNANCE_EFFECTS.SUPERSEDE_RECORD,
    });
  }

  /**
   * Re-adjudicates a SUSPENDED or RESTRICTED authorization via formal Gate 8 re-adjudication.
   * Bound to Section 24.3, Section 26, Section 28, and Build Plan v0.1h WP-24:
   * 1. Revalidation produces evidence; Gate 8 re-adjudication produces authorization.
   * 2. The newly authorized lifecycle state is established through a canonical AdoptionDecisionRecord (Record 21).
   * 3. The prior authorization record is formally retired as SUPERSEDED via a canonical Record 22
   *    (governance_effect: SUPERSEDE_RECORD, new_governance_status: SUPERSEDED).
   * 4. The new AdoptionDecisionRecord is registered in the state machine as ACTIVE.
   */
  public readjudicateAuthorization(
    input: Gate8ReadjudicationInput
  ): Gate8ReadjudicationResult {
    const priorDecisionId = input.priorDecisionId ?? input.decisionId;
    if (!priorDecisionId) {
      throw new InvalidGate8ChangeRecordError(
        "priorDecisionId (or decisionId) must be specified for re-adjudication."
      );
    }

    // 1. Resolve target authorization internal state
    const priorState = this.statesByDecisionId.get(priorDecisionId);
    if (!priorState) {
      throw new UnknownAuthorizationError(priorDecisionId);
    }

    // 2. Validate current governance status
    const currentStatus = priorState.currentStatus;
    if (currentStatus === GOVERNANCE_STATUSES.WITHDRAWN) {
      throw new TerminalStateError(
        priorDecisionId,
        currentStatus,
        "WITHDRAWAL PERMANENTLY CLOSES THE AUTHORIZATION RECORD. IT DOES NOT PERMANENTLY BAN THE CAPABILITY. A WITHDRAWN AUTHORIZATION IS NEVER REINSTATED. A REMEDIATED CANDIDATE REQUIRES A NEW GATE 8 DECISION."
      );
    }
    if (currentStatus === GOVERNANCE_STATUSES.SUPERSEDED) {
      throw new TerminalStateError(
        priorDecisionId,
        currentStatus,
        "SUPERSEDED authorizations are terminal historical records and cannot be re-adjudicated."
      );
    }
    if (currentStatus === GOVERNANCE_STATUSES.ACTIVE) {
      throw new InvalidGate8TransitionError(
        currentStatus,
        GOVERNANCE_STATUSES.ACTIVE,
        `Authorization "${priorDecisionId}" is already ACTIVE.`
      );
    }

    if (
      currentStatus !== GOVERNANCE_STATUSES.SUSPENDED &&
      currentStatus !== GOVERNANCE_STATUSES.RESTRICTED
    ) {
      throw new InvalidGate8TransitionError(
        currentStatus,
        GOVERNANCE_STATUSES.ACTIVE,
        `Only SUSPENDED or RESTRICTED authorizations are eligible for re-adjudication; found "${currentStatus}".`
      );
    }

    // 3. Concurrency / revision validation on prior state
    if (
      input.expectedCurrentStatus !== undefined &&
      input.expectedCurrentStatus !== currentStatus
    ) {
      throw new StaleGovernanceStateError(
        priorDecisionId,
        currentStatus,
        priorState.revision,
        input.expectedCurrentStatus,
        input.expectedRevision
      );
    }
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== priorState.revision
    ) {
      throw new StaleGovernanceStateError(
        priorDecisionId,
        currentStatus,
        priorState.revision,
        input.expectedCurrentStatus,
        input.expectedRevision
      );
    }

    // 4. Validate re-adjudication AdoptionDecisionRecord (Record 21)
    const newDecisionRecord = input.readjudicationDecisionRecord;
    if (!newDecisionRecord) {
      throw new ReadjudicationRequiredError(
        priorDecisionId,
        currentStatus,
        "Missing formal Gate 8 re-adjudication AdoptionDecisionRecord (Record 21)."
      );
    }

    const parsedNewDecision = adoptionDecisionRecordSchema.parse(newDecisionRecord);

    if (parsedNewDecision.decision_id === priorDecisionId) {
      throw new InvalidGate8ChangeRecordError(
        "Re-adjudication decision_id cannot match prior decision_id; historical Record 21 records must not be overwritten."
      );
    }

    const isPositiveOutcome =
      parsedNewDecision.decision_outcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
      parsedNewDecision.decision_outcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED;

    if (!isPositiveOutcome) {
      throw new ReadjudicationRequiredError(
        priorDecisionId,
        currentStatus,
        `Re-adjudication outcome was "${parsedNewDecision.decision_outcome}", which does not authorize reinstatement.`
      );
    }

    if (parsedNewDecision.governance_status !== GOVERNANCE_STATUSES.ACTIVE) {
      throw new ReadjudicationRequiredError(
        priorDecisionId,
        currentStatus,
        `Re-adjudication decision record must have governance_status "ACTIVE", got "${parsedNewDecision.governance_status}".`
      );
    }

    // Verify authorizing official
    assertAuthorizingOfficial(
      input.authorizingOfficial,
      this.options.authorizingOfficialValidator,
      this.authorityRegistry,
      input.authorizingOfficialKey
    );

    // 5. Formally retire the prior record as SUPERSEDED via Record 22
    const timestamp = input.timestamp ?? new Date().toISOString();
    const changeReason =
      input.changeReason ??
      `Superseded by formal Gate 8 re-adjudication decision "${parsedNewDecision.decision_id}".`;

    const supersedeResult = this.executeTransition({
      decisionId: priorDecisionId,
      targetStatus: GOVERNANCE_STATUSES.SUPERSEDED,
      changeReason,
      triggerSource: input.triggerSource ?? GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeId: input.changeId,
      timestamp,
      supersedingDecisionId: parsedNewDecision.decision_id,
      revalidationRequired: false,
      requiredAdoptionResponse: REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE,
      governanceEffect: GOVERNANCE_EFFECTS.SUPERSEDE_RECORD,
    });

    // 6. Ingest the new AdoptionDecisionRecord as the authoritative ACTIVE authorization
    if (this.options.auditLedger) {
      const alreadyInLedger = this.options.auditLedger
        .getEntries()
        .some((e) => e.entityId === parsedNewDecision.decision_id);
      if (!alreadyInLedger) {
        this.options.auditLedger.appendRecord(
          "AdoptionDecisionRecord",
          parsedNewDecision.decision_id,
          parsedNewDecision,
          parsedNewDecision.decision_timestamp
        );
      }
    }

    if (this.options.graph) {
      if (!this.options.graph.hasNode(parsedNewDecision.decision_id)) {
        this.options.graph.registerNode({
          id: parsedNewDecision.decision_id,
          kind: "AdoptionDecisionRecord",
        });
      }
    }

    const newAuthState = this.registerAuthorization(parsedNewDecision);

    const transitionRationale = `Prior authorization "${priorDecisionId}" retired as SUPERSEDED; re-adjudicated authorization "${parsedNewDecision.decision_id}" registered as ACTIVE.`;

    return deepFreeze({
      success: true,
      priorDecisionId,
      previousStatus: currentStatus as PreviousGovernanceStatus,
      supersededChangeRecord: supersedeResult.changeRecord,
      newDecisionRecord: parsedNewDecision,
      newAuthorizationState: newAuthState,
      lifecycleEvent: supersedeResult.lifecycleEvent,
      transitionRationale,
    });
  }

  /**
   * Reinstates a SUSPENDED or RESTRICTED authorization via formal Gate 8 re-adjudication.
   * Alias of readjudicateAuthorization.
   */
  public reinstateAuthorization(
    input: ReinstateAuthorizationInput
  ): Gate8ReadjudicationResult {
    return this.readjudicateAuthorization(input);
  }

  /**
   * Unified transition dispatcher routing through the authoritative state machine.
   */
  public transition(request: Gate8TransitionRequest): Gate8TransitionResult {
    return this.executeTransition(request);
  }

  // ---------------------------------------------------------------------------
  // Audit Ledger Reconciliation & State Re-hydration
  // ---------------------------------------------------------------------------

  /**
   * Reconciles in-memory lifecycle state and relationship graph nodes from
   * the authoritative append-only ValidationAuditLedger.
   *
   * Ensures that:
   * 1. Any committed Gate8ChangeRecord is reflected in in-memory state.
   * 2. Missing graph nodes are registered.
   * 3. No duplicate transitions are created.
   * 4. Stale in-memory state resulting from partial persistence failures is restored.
   */
  public reconcileFromLedger(
    ledgerOverride?: ValidationAuditLedger
  ): Gate8ReconciliationResult {
    const ledger = ledgerOverride ?? this.options.auditLedger;
    if (!ledger) {
      return {
        reconciledDecisions: 0,
        replayedChanges: 0,
        graphNodesRegistered: 0,
      };
    }

    let replayedChanges = 0;
    let graphNodesRegistered = 0;
    let reconciledDecisions = 0;

    const entries = ledger.getEntries();

    // 1. Pass 1: Ingest all AdoptionDecisionRecords
    for (const entry of entries) {
      if (entry.entityKind === "AdoptionDecisionRecord") {
        const record = entry.payload as AdoptionDecisionRecord;
        if (!this.statesByDecisionId.has(record.decision_id)) {
          this.registerAuthorization(record);
          reconciledDecisions++;
        }
        if (this.options.graph && !this.options.graph.hasNode(record.decision_id)) {
          this.options.graph.registerNode({
            id: record.decision_id,
            kind: "AdoptionDecisionRecord",
          });
          graphNodesRegistered++;
        }
      }
    }

    // 2. Pass 2: Replay all Gate8ChangeRecords in chronological order
    for (const entry of entries) {
      if (entry.entityKind === "Gate8ChangeRecord") {
        const changeRecord = entry.payload as Gate8ChangeRecord;
        const state = this.statesByDecisionId.get(changeRecord.decision_id);
        if (state) {
          const alreadyApplied = state.history.some(
            (h) => h.change_id === changeRecord.change_id
          );
          if (!alreadyApplied) {
            state.currentStatus = changeRecord.new_governance_status as GovernanceStatus;
            if (changeRecord.new_governance_status === GOVERNANCE_STATUSES.WITHDRAWN) {
              state.currentAuthorizedScope = [];
              state.isTerminal = true;
            } else if (changeRecord.new_governance_status === GOVERNANCE_STATUSES.SUPERSEDED) {
              state.isTerminal = true;
            } else if (changeRecord.new_governance_status === GOVERNANCE_STATUSES.RESTRICTED) {
              const affected = changeRecord.affected_authorization_scope ?? [];
              state.currentAuthorizedScope = state.currentAuthorizedScope.filter(
                (unit) => !affected.includes(unit)
              );
            }
            state.revision += 1;
            state.history.push(changeRecord);
            state.lastUpdatedTimestamp = changeRecord.change_timestamp;
            replayedChanges++;
          }
        }

        if (this.options.graph && !this.options.graph.hasNode(changeRecord.change_id)) {
          this.options.graph.registerNode({
            id: changeRecord.change_id,
            kind: "Gate8ChangeRecord",
          });
          graphNodesRegistered++;
        }
      }
    }

    return {
      reconciledDecisions,
      replayedChanges,
      graphNodesRegistered,
    };
  }

  // ---------------------------------------------------------------------------
  // Event Subscription & History API
  // ---------------------------------------------------------------------------

  /**
   * Subscribes a listener to receive lifecycle state change events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: Gate8LifecycleEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Alias for subscribe.
   */
  public onLifecycleChange(listener: Gate8LifecycleEventListener): () => void {
    return this.subscribe(listener);
  }

  /**
   * Returns all lifecycle change events in chronological emission order.
   */
  public getLifecycleEvents(): readonly Gate8LifecycleChangeEvent[] {
    return deepFreeze(this.lifecycleEvents.map((e) => defensiveClone(e)));
  }

  /**
   * Returns lifecycle events for a specific decisionId.
   */
  public getEventHistory(
    decisionId: string
  ): readonly Gate8LifecycleChangeEvent[] {
    return deepFreeze(
      this.lifecycleEvents
        .filter((e) => e.decisionId === decisionId)
        .map((e) => defensiveClone(e))
    );
  }

  // ---------------------------------------------------------------------------
  // Internal State Machine Core Engine
  // ---------------------------------------------------------------------------

  private executeTransition(
    request: Gate8TransitionRequest
  ): Gate8TransitionResult {
    // 1. Resolve target authorization internal state
    let state = this.statesByDecisionId.get(request.decisionId);
    if (!state) {
      if (request.decisionRecord) {
        this.registerAuthorization(request.decisionRecord);
        state = this.statesByDecisionId.get(request.decisionId)!;
      } else {
        throw new UnknownAuthorizationError(request.decisionId);
      }
    }

    const currentStatus = state.currentStatus;
    const targetStatus = request.targetStatus;

    // 0. Early Idempotency Check: if request provides explicit changeId already completed
    if (request.changeId && this.completedTransitionsByChangeId.has(request.changeId)) {
      const existingResult = this.completedTransitionsByChangeId.get(request.changeId)!;
      if (
        existingResult.decisionId === request.decisionId &&
        existingResult.newStatus === targetStatus
      ) {
        return existingResult;
      }
      throw new InvalidGate8ChangeRecordError(
        `Conflicting duplicate transition with change_id "${request.changeId}" already exists.`
      );
    }

    // 2. Validate target status is a recognized GovernanceStatus
    this.assertValidGovernanceStatus(targetStatus);

    // 3. Concurrency / Stale-State Protection
    if (
      request.expectedCurrentStatus !== undefined &&
      request.expectedCurrentStatus !== currentStatus
    ) {
      throw new StaleGovernanceStateError(
        request.decisionId,
        currentStatus,
        state.revision,
        request.expectedCurrentStatus,
        request.expectedRevision
      );
    }
    if (
      request.expectedRevision !== undefined &&
      request.expectedRevision !== state.revision
    ) {
      throw new StaleGovernanceStateError(
        request.decisionId,
        currentStatus,
        state.revision,
        request.expectedCurrentStatus,
        request.expectedRevision
      );
    }

    // 4. Same-State Transition Protection
    if (currentStatus === targetStatus) {
      throw new InvalidGate8TransitionError(
        currentStatus,
        targetStatus,
        `Same-state transition is unsupported: authorization is already in "${currentStatus}" status`
      );
    }

    // 5. Terminal State Enforcement (WITHDRAWN and SUPERSEDED are terminal)
    if (currentStatus === GOVERNANCE_STATUSES.WITHDRAWN) {
      throw new TerminalStateError(
        request.decisionId,
        currentStatus,
        `Attempted transition from terminal state WITHDRAWN to "${targetStatus}"`
      );
    }
    if (currentStatus === GOVERNANCE_STATUSES.SUPERSEDED) {
      throw new TerminalStateError(
        request.decisionId,
        currentStatus,
        `Attempted transition from terminal historical state SUPERSEDED to "${targetStatus}"`
      );
    }

    // 6. Strict Transition Matrix Validation
    this.assertPermittedTransition(currentStatus, targetStatus, request);

    // 7. Authorizing Official Validation (Authenticity Verification)
    assertAuthorizingOfficial(
      request.authorizingOfficial,
      this.options.authorizingOfficialValidator,
      this.authorityRegistry,
      request.authorizingOfficialKey
    );

    // 8. Scope Resolution
    const { affectedScope, newAuthorizedScope } = this.resolveTransitionScopes(
      state,
      targetStatus,
      request
    );

    // 9. Timestamp and Change ID Resolution
    const timestamp = request.timestamp ?? new Date().toISOString();
    const changeId =
      request.changeId ??
      deriveDeterministicChangeId(
        request.decisionId,
        currentStatus,
        targetStatus,
        timestamp,
        request.triggerSource
      );

    // 10. Idempotency Check: if this exact changeId was already completed in memory
    const existingResult = this.completedTransitionsByChangeId.get(changeId);
    if (existingResult) {
      if (
        existingResult.decisionId === request.decisionId &&
        existingResult.previousStatus === currentStatus &&
        existingResult.newStatus === targetStatus
      ) {
        return existingResult;
      }
      throw new InvalidGate8ChangeRecordError(
        `Conflicting duplicate transition with change_id "${changeId}" already exists.`
      );
    }

    // 11. Resolve Governance Effect and Required Adoption Response
    const governanceEffect =
      request.governanceEffect ??
      this.resolveDefaultGovernanceEffect(currentStatus, targetStatus);
    const requiredAdoptionResponse =
      request.requiredAdoptionResponse ??
      this.resolveDefaultAdoptionResponse(targetStatus);
    const revalidationRequired =
      request.revalidationRequired ??
      this.resolveDefaultRevalidationRequired(targetStatus);

    // 12. Validate previous_governance_status contract
    this.assertValidPreviousStatus(currentStatus);

    // 13. Resolve Integrity Provider & Cryptographically Seal Record 22
    let integrityProvider: IntegrityProvider;
    if (this.options.integrityProvider) {
      integrityProvider = this.options.integrityProvider;
    } else {
      const creds = this.authorityRegistry.getAuthorityCredentials(
        request.authorizingOfficial.trim()
      );
      const authorityKey = request.authorizingOfficialKey ?? creds?.keyOrSecret;
      if (authorityKey) {
        integrityProvider = new KeyedAuthorityIntegrityProvider(authorityKey);
      } else {
        integrityProvider = this.defaultIntegrityProvider;
      }
    }

    let changeRecord: Gate8ChangeRecord;
    let alreadyCommittedInLedger = false;

    // Check if change is already committed in authoritative ledger (from a prior partial attempt)
    if (this.options.auditLedger) {
      const existingEntry = this.options.auditLedger
        .getEntries()
        .find((e) => e.entityId === changeId && e.entityKind === "Gate8ChangeRecord");
      if (existingEntry) {
        alreadyCommittedInLedger = true;
        changeRecord = existingEntry.payload as Gate8ChangeRecord;
      }
    }

    if (!alreadyCommittedInLedger) {
      const payloadWithoutIntegrity = {
        change_id: changeId,
        decision_id: request.decisionId,
        previous_governance_status: currentStatus as PreviousGovernanceStatus,
        new_governance_status: targetStatus as NewGovernanceStatus,
        change_reason: request.changeReason,
        trigger_source: request.triggerSource,
        governance_effect: governanceEffect,
        affected_authorization_scope: [...affectedScope],
        required_adoption_response: requiredAdoptionResponse,
        revalidation_required: revalidationRequired,
        change_timestamp: timestamp,
        authorizing_official: request.authorizingOfficial.trim(),
      };

      const integrityMetadata = sealGate8ChangePayload(
        payloadWithoutIntegrity,
        request.authorizingOfficial.trim(),
        integrityProvider,
        timestamp
      );

      changeRecord = deepFreeze(
        parseGate8ChangeRecord({
          ...payloadWithoutIntegrity,
          record_integrity_metadata: integrityMetadata,
        })
      );

      // 14. Ledger Persistence & Audit Trail (Authoritative Monotonic Append)
      if (this.options.auditLedger) {
        this.options.auditLedger.appendRecord(
          "Gate8ChangeRecord",
          changeRecord.change_id,
          changeRecord,
          changeRecord.change_timestamp
        );
      }
    }

    // 15. Relationship Graph Registration
    if (this.options.graph) {
      try {
        this.options.graph.registerNode({
          id: changeRecord!.change_id,
          kind: "Gate8ChangeRecord",
        });
      } catch (graphError) {
        // Authoritative ledger entry was committed, but graph registration failed.
        // Fail closed to prevent silent corruption, signaling that reconciliation is required.
        throw new PersistenceReconciliationError(
          request.decisionId,
          changeRecord!.change_id,
          "Gate8ChangeRecord was committed to the authoritative ValidationAuditLedger, but Registration in ValidationRelationshipGraph failed.",
          graphError
        );
      }
    }

    // 16. Authoritative In-Memory State Mutation
    state.currentStatus = targetStatus;
    state.currentAuthorizedScope = [...newAuthorizedScope];
    state.revision += 1;
    state.history.push(changeRecord!);
    state.lastUpdatedTimestamp = timestamp;
    if (
      targetStatus === GOVERNANCE_STATUSES.WITHDRAWN ||
      targetStatus === GOVERNANCE_STATUSES.SUPERSEDED
    ) {
      state.isTerminal = true;
    }

    // 17. Construct & Emit Lifecycle Change Event
    const lifecycleEvent: Gate8LifecycleChangeEvent = deepFreeze({
      eventId: `event_${changeRecord!.change_id}`,
      eventType: "GATE8_LIFECYCLE_STATUS_CHANGED",
      decisionId: request.decisionId,
      previousGovernanceStatus: currentStatus as PreviousGovernanceStatus,
      newGovernanceStatus: targetStatus,
      changeRecordId: changeRecord!.change_id,
      changeRecord: changeRecord!,
      governanceEffect,
      affectedScope,
      currentAuthorizedScope: Object.freeze([...newAuthorizedScope]),
      requiredAdoptionResponse,
      timestamp,
      authorizingOfficial: request.authorizingOfficial.trim(),
    });

    this.lifecycleEvents.push(lifecycleEvent);
    this.notifyListeners(lifecycleEvent);

    // 18. Build & Cache Transition Result (Idempotency Registry)
    const transitionRationale = `Gate 8 authorization "${request.decisionId}" transitioned from "${currentStatus}" to "${targetStatus}" via change "${changeId}".`;
    const result: Gate8TransitionResult = deepFreeze({
      success: true,
      changeRecord: changeRecord!,
      previousStatus: currentStatus as PreviousGovernanceStatus,
      newStatus: targetStatus,
      decisionId: request.decisionId,
      currentAuthorizedScope: Object.freeze([...newAuthorizedScope]),
      revision: state.revision,
      lifecycleEvent,
      transitionRationale,
    });

    this.completedTransitionsByChangeId.set(changeId, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  private assertValidGovernanceStatus(status: unknown): asserts status is GovernanceStatus {
    const valid = Object.values(GOVERNANCE_STATUSES);
    if (!status || typeof status !== "string" || !valid.includes(status as GovernanceStatus)) {
      throw new InvalidGate8TransitionError(
        "UNKNOWN",
        String(status),
        `Status "${status}" is not a recognized canonical GovernanceStatus.`
      );
    }
  }

  private assertValidPreviousStatus(status: GovernanceStatus): void {
    const allowed = [
      PREVIOUS_GOVERNANCE_STATUSES.ACTIVE,
      PREVIOUS_GOVERNANCE_STATUSES.SUSPENDED,
      PREVIOUS_GOVERNANCE_STATUSES.RESTRICTED,
    ];
    if (!allowed.includes(status as any)) {
      throw new InvalidGate8TransitionError(
        status,
        "UNKNOWN",
        `previous_governance_status must strictly be ACTIVE, SUSPENDED, or RESTRICTED; got "${status}".`
      );
    }
  }

  private assertPermittedTransition(
    current: GovernanceStatus,
    target: GovernanceStatus,
    request: Gate8TransitionRequest
  ): void {
    // Record 22 strictly rejects ACTIVE as new_governance_status
    if (target === GOVERNANCE_STATUSES.ACTIVE) {
      throw new InvalidGate8TransitionError(
        current,
        target,
        "Record 22 strictly rejects ACTIVE as new_governance_status under frozen Section 28.3. Formal re-adjudication produces authorization via AdoptionDecisionRecord (Record 21); use reinstateAuthorization() or readjudicateAuthorization()."
      );
    }

    switch (current) {
      case GOVERNANCE_STATUSES.ACTIVE:
        if (
          target === GOVERNANCE_STATUSES.SUSPENDED ||
          target === GOVERNANCE_STATUSES.RESTRICTED ||
          target === GOVERNANCE_STATUSES.WITHDRAWN ||
          target === GOVERNANCE_STATUSES.SUPERSEDED
        ) {
          return;
        }
        break;

      case GOVERNANCE_STATUSES.SUSPENDED:
        if (
          target === GOVERNANCE_STATUSES.WITHDRAWN ||
          target === GOVERNANCE_STATUSES.SUPERSEDED
        ) {
          return;
        }
        if (target === GOVERNANCE_STATUSES.RESTRICTED) {
          throw new InvalidGate8TransitionError(
            current,
            target,
            "Direct conversion between SUSPENDED and RESTRICTED without re-adjudication is prohibited."
          );
        }
        break;

      case GOVERNANCE_STATUSES.RESTRICTED:
        if (
          target === GOVERNANCE_STATUSES.WITHDRAWN ||
          target === GOVERNANCE_STATUSES.SUPERSEDED
        ) {
          return;
        }
        if (target === GOVERNANCE_STATUSES.SUSPENDED) {
          throw new InvalidGate8TransitionError(
            current,
            target,
            "Direct conversion between RESTRICTED and SUSPENDED without re-adjudication is prohibited."
          );
        }
        break;

      case GOVERNANCE_STATUSES.WITHDRAWN:
        throw new TerminalStateError(
          request.decisionId,
          current,
          "WITHDRAWN is permanently terminal"
        );

      case GOVERNANCE_STATUSES.SUPERSEDED:
        throw new TerminalStateError(
          request.decisionId,
          current,
          "SUPERSEDED is terminal historical"
        );
    }

    throw new InvalidGate8TransitionError(
      current,
      target,
      `Unsupported transition path from "${current}" to "${target}".`
    );
  }

  private resolveTransitionScopes(
    state: InternalAuthorizationState,
    targetStatus: GovernanceStatus,
    request: Gate8TransitionRequest
  ): { affectedScope: readonly string[]; newAuthorizedScope: readonly string[] } {
    if (targetStatus === GOVERNANCE_STATUSES.RESTRICTED) {
      const carvedOut = request.carvedOutScope ?? [];
      if (carvedOut.length === 0) {
        throw new InvalidGate8TransitionError(
          state.currentStatus,
          targetStatus,
          "carvedOutScope must contain at least one unit to restrict."
        );
      }

      // Ensure carved out units are part of current scope
      for (const unit of carvedOut) {
        if (!state.currentAuthorizedScope.includes(unit)) {
          throw new InvalidGate8TransitionError(
            state.currentStatus,
            targetStatus,
            `Carved-out unit "${unit}" is not currently in the authorized scope.`
          );
        }
      }

      // Calculate retained scope
      let retained: string[];
      if (request.retainedScope) {
        retained = [...request.retainedScope];
        for (const u of retained) {
          if (!state.currentAuthorizedScope.includes(u) || carvedOut.includes(u)) {
            throw new InvalidGate8TransitionError(
              state.currentStatus,
              targetStatus,
              `Retained unit "${u}" conflicts with carvedOutScope or current authorized scope.`
            );
          }
        }
      } else {
        retained = state.currentAuthorizedScope.filter((u) => !carvedOut.includes(u));
      }

      if (retained.length === 0) {
        throw new InvalidGate8TransitionError(
          state.currentStatus,
          targetStatus,
          "Scope restriction would carve out entire authorized scope; withdrawal must be used instead."
        );
      }

      return {
        affectedScope: Object.freeze([...carvedOut]),
        newAuthorizedScope: Object.freeze(retained),
      };
    }

    if (targetStatus === GOVERNANCE_STATUSES.WITHDRAWN) {
      return {
        affectedScope: Object.freeze(
          request.affectedScope ? [...request.affectedScope] : [...state.currentAuthorizedScope]
        ),
        newAuthorizedScope: Object.freeze([]),
      };
    }

    if (targetStatus === GOVERNANCE_STATUSES.SUPERSEDED) {
      return {
        affectedScope: Object.freeze(
          request.affectedScope ? [...request.affectedScope] : [...state.currentAuthorizedScope]
        ),
        newAuthorizedScope: Object.freeze([...state.currentAuthorizedScope]),
      };
    }

    // Default (e.g. SUSPENDED)
    const affected = request.affectedScope
      ? [...request.affectedScope]
      : [...state.currentAuthorizedScope];
    return {
      affectedScope: Object.freeze(affected),
      newAuthorizedScope: Object.freeze([...state.currentAuthorizedScope]),
    };
  }

  private resolveDefaultGovernanceEffect(
    fromStatus: GovernanceStatus,
    toStatus: GovernanceStatus
  ): GovernanceEffect {
    switch (toStatus) {
      case GOVERNANCE_STATUSES.SUSPENDED:
        return GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION;
      case GOVERNANCE_STATUSES.RESTRICTED:
        return GOVERNANCE_EFFECTS.NARROW_SCOPE;
      case GOVERNANCE_STATUSES.WITHDRAWN:
        return GOVERNANCE_EFFECTS.REVOKE_AUTHORIZATION;
      case GOVERNANCE_STATUSES.SUPERSEDED:
        return GOVERNANCE_EFFECTS.SUPERSEDE_RECORD;
      default:
        return GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION;
    }
  }

  private resolveDefaultAdoptionResponse(
    toStatus: GovernanceStatus
  ): RequiredAdoptionResponse {
    switch (toStatus) {
      case GOVERNANCE_STATUSES.SUSPENDED:
        return REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED;
      case GOVERNANCE_STATUSES.RESTRICTED:
        return REQUIRED_ADOPTION_RESPONSES.SCOPE_NARROWED;
      case GOVERNANCE_STATUSES.WITHDRAWN:
        return REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED;
      case GOVERNANCE_STATUSES.SUPERSEDED:
      case GOVERNANCE_STATUSES.ACTIVE:
        return REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE;
      default:
        return REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED;
    }
  }

  private resolveDefaultRevalidationRequired(toStatus: GovernanceStatus): boolean {
    switch (toStatus) {
      case GOVERNANCE_STATUSES.SUSPENDED:
      case GOVERNANCE_STATUSES.RESTRICTED:
        return true;
      case GOVERNANCE_STATUSES.WITHDRAWN:
      case GOVERNANCE_STATUSES.SUPERSEDED:
      case GOVERNANCE_STATUSES.ACTIVE:
        return false;
      default:
        return true;
    }
  }

  private notifyListeners(event: Gate8LifecycleChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        const res = listener(event);
        if (res instanceof Promise) {
          res.catch(() => {
            // Swallow asynchronous consumer errors to protect state machine consistency
          });
        }
      } catch {
        // Swallow synchronous consumer errors to protect state machine consistency
      }
    }
  }

  private snapshotState(state: InternalAuthorizationState): Gate8AuthorizationState {
    return deepFreeze({
      decisionId: state.decisionId,
      initialDecisionRecord: defensiveClone(state.initialDecisionRecord),
      currentStatus: state.currentStatus,
      currentAuthorizedScope: Object.freeze([...state.currentAuthorizedScope]),
      revision: state.revision,
      history: deepFreeze(state.history.map((r) => defensiveClone(r))),
      isTerminal: state.isTerminal,
      lastUpdatedTimestamp: state.lastUpdatedTimestamp,
    });
  }
}
