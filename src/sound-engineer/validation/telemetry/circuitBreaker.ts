// src/sound-engineer/validation/telemetry/circuitBreaker.ts
// CanaryCircuitBreaker: Orchestrates post-cutover real-time quality telemetry governance under Phase 1C.5h WP-28.
// Slice 3A: Major evaluation ingestion, TRIGGER-10 detection via RevalidationTriggerDetector,
// canonical RevalidationTriggerRecord (Record 18) generation, and INVALIDATED_BY relationship edge instantiation.
// Slice 3B: Authoritative Gate 8 suspension via Gate8StateMachine, canonical Gate8ChangeRecord (Record 22) generation,
// and Phase 1C.5g operational rollback signaling via OperationalSignalPort.
// Slice 3C: WP-20 Retest Planning handoff, canonical RetestPlanRecord (Record 19) generation,
// and REQUIRES_RETEST relationship edge instantiation.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, Table 14, and Build Plan v0.1h WP-28.
// Strictly preserves historical immutability of AdoptionDecisionRecord (Record 21).

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
  ADOPTION_DECISION_OUTCOMES,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_STATUSES,
  REQUIRED_ADOPTION_RESPONSES,
  REVALIDATION_TRIGGER_SOURCES,
} from "../schemas/enums";
import { Gate8ChangeRecord } from "../schemas/records";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { RevalidationTriggerDetector } from "../retest/triggerDetector";
import {
  GovernedMaterialChangeEvent,
  RetestPlanRecord,
  RetestPlanResult,
} from "../retest/retestTypes";
import { RetestPlanner } from "../retest/retestPlanner";
import { Gate8StateMachine } from "../gate8/stateMachine";
import {
  OperationalRollbackSignal,
  OperationalSignalAck,
  OperationalSignalPort,
} from "./operationalSignalPort";
import {
  AuthorizationBindingMismatchError,
  CircuitBreakerExecutionError,
  CircuitBreakerPreconditionError,
  InactiveAuthorizationError,
  ProhibitedSuspensionError,
  ScopeMismatchError,
  TerminalAuthorizationStateError,
  VersionBindingMismatchError,
} from "./telemetryErrors";
import {
  CircuitBreakerExecutionInput,
  CircuitBreakerExecutionResult,
  CircuitBreakerExecutionStatus,
  CircuitBreakerRetestHandoffInput,
  CircuitBreakerRetestStageResult,
  CircuitBreakerRetestStatus,
  CircuitBreakerSuspensionInput,
  CircuitBreakerSuspensionStageResult,
  CircuitBreakerSuspensionStatus,
  CircuitBreakerTriggerInput,
  CircuitBreakerTriggerStageResult,
  RuleBreachEvaluation,
} from "./telemetryTypes";

/**
 * Dependencies injected into CanaryCircuitBreaker.
 */
export interface CircuitBreakerDependencies {
  /** Authoritative trigger detector service for emitting canonical Record 18 */
  readonly triggerDetector: RevalidationTriggerDetector;

  /** Authoritative Gate 8 lifecycle state machine (WP-24) for executing suspension and emitting Record 22 */
  readonly gate8StateMachine?: Gate8StateMachine;

  /** Authoritative RetestPlanner engine (WP-20) for generating Record 19 and partitioning evidence */
  readonly retestPlanner?: RetestPlanner;

  /** Operational signal capability port for communicating rollback demands to Phase 1C.5g */
  readonly operationalSignalPort?: OperationalSignalPort;

  /** Authoritative relationship graph for attaching canonical INVALIDATED_BY and REQUIRES_RETEST edges */
  readonly graph?: ValidationRelationshipGraph;

  /** Authoritative audit ledger for immutable record verification */
  readonly auditLedger?: ValidationAuditLedger;

  /** Default authorizing official identity for automated circuit breaker actions */
  readonly authorizingOfficial?: string;

  /** Default authorizing official cryptographic key */
  readonly authorizingOfficialKey?: string;

  /** Mockable clock function returning ISO 8601 UTC string */
  readonly clock?: () => string;
}

/**
 * CanaryCircuitBreaker: Governed orchestration engine for real-time quality telemetry degradation.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. Consumes factual TelemetryEvaluationResult from QualityTelemetryMonitor (WF-17).
 * 2. Fires TRIGGER-10 strictly upon confirmed MAJOR_DEGRADATION; non-major evaluations are ineligible.
 * 3. Enforces scope containment and version-binding congruence against the active AdoptionDecisionRecord.
 * 4. Generates canonical RevalidationTriggerRecord (Record 18) via RevalidationTriggerDetector (Slice 3A).
 * 5. Instantiates canonical Edge 10: AdoptionDecisionRecord -> RevalidationTriggerRecord (INVALIDATED_BY) (Slice 3A).
 * 6. Historical AdoptionDecisionRecord (Record 21) remains 100% immutable; it is NEVER mutated in place.
 * 7. Executes post-cutover Gate 8 suspension via Gate8StateMachine, generating Gate8ChangeRecord (Record 22) (Slice 3B).
 * 8. Dispatches operational rollback signal to Phase 1C.5g via OperationalSignalPort (Slice 3B).
 * 9. WP-28 holds ZERO traffic routing authority; routing reversion belongs exclusively to Phase 1C.5g.
 * 10. Hands off to WP-20 RetestPlanner for canonical Record 19 generation and REQUIRES_RETEST edge creation (Slice 3C).
 * 11. Strictly reconciles end-to-end incident state without mutating canonical records.
 */
export class CanaryCircuitBreaker {
  private readonly triggerDetector: RevalidationTriggerDetector;
  private readonly gate8StateMachine: Gate8StateMachine;
  private readonly retestPlanner: RetestPlanner;
  private readonly operationalSignalPort?: OperationalSignalPort;
  private readonly graph?: ValidationRelationshipGraph;
  private readonly auditLedger?: ValidationAuditLedger;
  private readonly authorizingOfficial?: string;
  private readonly authorizingOfficialKey?: string;
  private readonly clock: () => string;

  constructor(dependencies: CircuitBreakerDependencies) {
    if (!dependencies || !dependencies.triggerDetector) {
      throw new Error(
        "CanaryCircuitBreaker requires a valid RevalidationTriggerDetector instance."
      );
    }
    this.triggerDetector = dependencies.triggerDetector;
    this.graph = dependencies.graph;
    this.auditLedger = dependencies.auditLedger;
    this.clock = dependencies.clock ?? (() => new Date().toISOString());
    this.gate8StateMachine =
      dependencies.gate8StateMachine ??
      new Gate8StateMachine({
        auditLedger: this.auditLedger,
        graph: this.graph,
      });
    this.retestPlanner =
      dependencies.retestPlanner ??
      new RetestPlanner({
        graph: this.graph,
        auditLedger: this.auditLedger,
      });
    this.operationalSignalPort = dependencies.operationalSignalPort;
    this.authorizingOfficial = dependencies.authorizingOfficial;
    this.authorizingOfficialKey = dependencies.authorizingOfficialKey;
  }

  // ---------------------------------------------------------------------------
  // Slice 3A: Trigger Detection, Record 18 Generation & INVALIDATED_BY Linkage
  // ---------------------------------------------------------------------------

  /**
   * Processes a TelemetryEvaluationResult for potential TRIGGER-10 firing.
   * If severity is not MAJOR_DEGRADATION, returns a factual INELIGIBLE result.
   * If MAJOR_DEGRADATION, detects TRIGGER-10, emits Record 18, and links INVALIDATED_BY edge.
   */
  public async processTriggerStage(
    input: CircuitBreakerTriggerInput
  ): Promise<CircuitBreakerTriggerStageResult> {
    if (!input || !input.evaluation) {
      throw new Error("CircuitBreakerTriggerInput.evaluation is required.");
    }
    if (!input.activeDecision || !input.activeDecision.decision_id) {
      throw new Error("CircuitBreakerTriggerInput.activeDecision is required.");
    }
    if (!input.activeBinding || !input.activeBinding.binding_id) {
      throw new Error("CircuitBreakerTriggerInput.activeBinding is required.");
    }

    const orchestrationStartedAt = this.clock();
    const evaluation = input.evaluation;
    const activeDecision = input.activeDecision;
    const activeBinding = input.activeBinding;

    // 1. Eligibility Check: only MAJOR_DEGRADATION qualifies for TRIGGER-10
    if (evaluation.severity !== "MAJOR_DEGRADATION") {
      return deepFreeze({
        status: "INELIGIBLE",
        eligibleForTrigger: false,
        decisionId: activeDecision.decision_id,
        evaluationTimestamp: evaluation.evaluationTimestamp,
        orchestrationStartedAt,
        completedAt: this.clock(),
        details: `Telemetry severity is "${evaluation.severity}". Only MAJOR_DEGRADATION is eligible for TRIGGER-10 orchestration.`,
      });
    }

    // 2. Immutable Authorization Outcome Validation
    // Validate only the immutable authorization outcome in Record 21.
    // Allowed: AUTHORIZED, CONDITIONALLY_AUTHORIZED
    // Rejected: REJECTED, BLOCKED
    // Record 21 is immutable historical authorization evidence and is not the authoritative source of current post-authorization lifecycle state.
    // Current lifecycle status (ACTIVE, SUSPENDED, RESTRICTED, WITHDRAWN, SUPERSEDED) is deferred entirely to Slice 3B / Gate8StateMachine.
    const isAuthorizedOutcome =
      activeDecision.decision_outcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
      activeDecision.decision_outcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED;

    if (!isAuthorizedOutcome) {
      throw new InactiveAuthorizationError(
        activeDecision.decision_id,
        activeDecision.governance_status,
        activeDecision.decision_outcome,
        `Supplied AdoptionDecisionRecord "${activeDecision.decision_id}" does not represent an authorized decision outcome ` +
          `(decision_outcome="${activeDecision.decision_outcome}"). Only AUTHORIZED and CONDITIONALLY_AUTHORIZED outcomes are eligible for TRIGGER-10 orchestration.`
      );
    }

    // 3. Scope Containment Safety Validation
    // Telemetry evaluation scope must strictly reside within authorized scope
    const authorizedSet = new Set(activeDecision.authorized_scope);
    const alienUnits = evaluation.scope.filter((u) => !authorizedSet.has(u));
    if (alienUnits.length > 0) {
      throw new ScopeMismatchError(
        evaluation.scope,
        activeDecision.authorized_scope,
        `Telemetry evaluation scope contains units [${alienUnits.join(", ")}] outside active authorized scope.`
      );
    }

    // 4. Version Binding Safety Validation: Mutually consistent 3-way identity verification
    // 1) Telemetry evaluation versionBindingId
    // 2) Supplied activeBinding.binding_id
    // 3) The binding referenced/authorized by the supplied activeDecision (version_binding_integrity_ref)

    // Check 1: Identity 1 == Identity 2
    if (evaluation.versionBindingId !== activeBinding.binding_id) {
      throw new VersionBindingMismatchError(
        evaluation.versionBindingId,
        activeBinding.binding_id,
        "Telemetry evaluation version binding does not match the supplied active version binding."
      );
    }

    // Check 2: Identity 2 == Identity 3 (verify activeBinding is the binding authorized by activeDecision)
    // Exact Record 21 Binding Integrity Check:
    // Compare Record 21's version_binding_integrity_ref against the canonical composite_digest of the active binding.
    // Do NOT allow activeDecision.version_binding_integrity_ref === activeBinding.binding_id.
    const bindingDigest =
      activeBinding.version_integrity_reference?.composite_digest;
    const isAuthorizedBinding =
      bindingDigest !== undefined &&
      activeDecision.version_binding_integrity_ref === bindingDigest;

    if (!isAuthorizedBinding) {
      throw new AuthorizationBindingMismatchError(
        activeBinding.binding_id,
        activeDecision.version_binding_integrity_ref,
        `Supplied active binding "${activeBinding.binding_id}" (composite digest: "${bindingDigest ?? "none"}") ` +
          `does not match version_binding_integrity_ref on AdoptionDecisionRecord "${activeDecision.decision_id}" ` +
          `(expected: "${activeDecision.version_binding_integrity_ref}").`
      );
    }

    // 5. Extract Major Breaches Deterministically
    const majorBreaches: RuleBreachEvaluation[] = evaluation.breachedRules
      .filter((b) => b.breachSeverity === "MAJOR_DEGRADATION")
      .sort((a, b) => a.metricId.localeCompare(b.metricId));

    if (majorBreaches.length === 0) {
      throw new Error(
        `Telemetry evaluation claimed MAJOR_DEGRADATION but contains zero major rule breaches.`
      );
    }

    const primaryBreach = majorBreaches[0];

    // Find sample size for primary metric if available
    const primaryObs = evaluation.evaluatedMetrics.find(
      (m) => m.metricId === primaryBreach.metricId
    );
    const sampleSize = primaryObs?.sampleSize ?? 1000;

    // Construct factual anomaly summary across all major breaches
    const breachSummary = majorBreaches
      .map(
        (b) =>
          `[metric: "${b.metricId}", observed: ${b.observedValue}, threshold: ${b.thresholdValue}]`
      )
      .join("; ");

    const anomalyDetails =
      `Major telemetry degradation across ${majorBreaches.length} metric(s): ${breachSummary}. ` +
      `Evaluated against profile "${evaluation.profileRef}".`;

    // 6. Build GovernedMaterialChangeEvent strictly matching TRIGGER-10 schema
    const changeEvent: GovernedMaterialChangeEvent = {
      trigger_source:
        REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
      description: `Production quality telemetry anomaly spike in scope [${evaluation.scope.join(", ")}]: ${anomalyDetails}`,
      affected_units: [...evaluation.scope],
      telemetry_anomaly: {
        metric_name: primaryBreach.metricId,
        observed_defect_rate: primaryBreach.observedValue,
        threshold: primaryBreach.thresholdValue,
        sample_size: sampleSize,
        warrants_gate_8_suspension: true,
        anomaly_details: anomalyDetails,
      },
    };

    // 7. Invoke Canonical RevalidationTriggerDetector
    // In live Canary telemetry, prior_binding_id and new_binding_id both reference the active binding
    let triggerRecord;
    let triggerDetectedAt: string;

    try {
      const triggerResult = this.triggerDetector.detectTrigger({
        priorBinding: activeBinding,
        newBinding: activeBinding,
        scopeRecord: input.scopeRecord,
        changeEvent,
        graph: this.graph,
        auditLedger: this.auditLedger,
        timestamp: orchestrationStartedAt,
      });

      triggerRecord = triggerResult.triggerRecord;
      triggerDetectedAt = this.clock();
    } catch (triggerError: any) {
      throw new CircuitBreakerExecutionError(
        "TRIGGER_DETECTION",
        `Failed to detect and generate Record 18: ${triggerError.message}`,
        undefined,
        triggerError
      );
    }

    // 8. Instantiate Canonical INVALIDATED_BY Edge
    // Direction: AdoptionDecisionRecord -> RevalidationTriggerRecord
    // Preserves AdoptionDecisionRecord immutability (historical record is NEVER mutated)
    let invalidationEdge: RelationshipEdge | undefined;
    let edgeInstantiatedAt: string | undefined;

    if (this.graph) {
      try {
        // Ensure both endpoints are registered in relationship graph
        if (!this.graph.hasNode(activeDecision.decision_id)) {
          this.graph.registerNode({
            id: activeDecision.decision_id,
            kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
          });
        }
        if (!this.graph.hasNode(triggerRecord.trigger_id)) {
          this.graph.registerNode({
            id: triggerRecord.trigger_id,
            kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
          });
        }

        // Add canonical Edge 10 (idempotent: returns existing edge if already created)
        invalidationEdge = this.graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: {
            id: activeDecision.decision_id,
            kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
          },
          target: {
            id: triggerRecord.trigger_id,
            kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
          },
        });

        edgeInstantiatedAt = this.clock();
      } catch (graphError: any) {
        // Fail closed diagnostically while preserving the successfully generated Record 18
        throw new CircuitBreakerExecutionError(
          "INVALIDATED_BY_LINKAGE",
          `RevalidationTriggerRecord "${triggerRecord.trigger_id}" was generated, but INVALIDATED_BY edge creation failed: ${graphError.message}`,
          triggerRecord,
          graphError
        );
      }
    }

    const completedAt = this.clock();

    return deepFreeze({
      status: "TRIGGER_FIRED",
      eligibleForTrigger: true,
      decisionId: activeDecision.decision_id,
      triggerRecord: defensiveClone(triggerRecord),
      invalidationEdge: invalidationEdge ? defensiveClone(invalidationEdge) : undefined,
      allMajorBreaches: Object.freeze(majorBreaches.map((b) => defensiveClone(b))),
      evaluationTimestamp: evaluation.evaluationTimestamp,
      orchestrationStartedAt,
      triggerDetectedAt,
      edgeInstantiatedAt,
      completedAt,
      details: `TRIGGER-10 fired successfully; Record 18 "${triggerRecord.trigger_id}" emitted with required_action "SUSPEND_GATE_8"; INVALIDATED_BY edge created.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Slice 3B: WP-24 Gate 8 Suspension, Record 22 & Operational Rollback Signaling
  // ---------------------------------------------------------------------------

  /**
   * Processes Gate 8 suspension and operational rollback signaling.
   *
   * PRECONDITIONS:
   * - Slice 3A must have completed successfully with status === "TRIGGER_FIRED".
   * - Canonical RevalidationTriggerRecord (Record 18) must be provided.
   * - When graph is attached, canonical INVALIDATED_BY edge must be provided.
   * - Fails closed if Slice 3A has not completed successfully.
   * - Does NOT recreate Record 18 or INVALIDATED_BY edge.
   *
   * LIFECYCLE STATE AUTHORITY:
   * - Evaluates current state exclusively via Gate8StateMachine.getAuthorizationState(decisionId).
   * - ACTIVE: valid -> execute suspension via state machine -> generate Record 22.
   * - SUSPENDED: already satisfied -> acknowledge existing suspension without re-suspending.
   * - RESTRICTED: prohibited -> fail closed via ProhibitedSuspensionError.
   * - WITHDRAWN / SUPERSEDED: terminal -> fail closed via TerminalAuthorizationStateError.
   *
   * OPERATIONAL BOUNDARY:
   * - WP-28 holds ZERO traffic routing authority.
   * - Emits declarative OperationalRollbackSignal to OperationalSignalPort (Phase 1C.5g).
   */
  public async processSuspensionStage(
    input: CircuitBreakerSuspensionInput
  ): Promise<CircuitBreakerSuspensionStageResult> {
    // 1. Enforce Slice 3A Preconditions (Fail closed if Slice 3A has not completed successfully)
    if (!input || !input.triggerResult) {
      throw new CircuitBreakerPreconditionError(
        "Slice 3B requires a valid triggerResult from Slice 3A."
      );
    }
    const triggerResult = input.triggerResult;
    if (triggerResult.status !== "TRIGGER_FIRED" || !triggerResult.eligibleForTrigger) {
      throw new CircuitBreakerPreconditionError(
        `Slice 3B requires a successful TRIGGER_FIRED result; received status "${triggerResult.status}".`
      );
    }
    if (!triggerResult.triggerRecord || !triggerResult.triggerRecord.trigger_id) {
      throw new CircuitBreakerPreconditionError(
        "Slice 3B requires a canonical RevalidationTriggerRecord (Record 18) produced by Slice 3A."
      );
    }
    if (this.graph && !triggerResult.invalidationEdge) {
      throw new CircuitBreakerPreconditionError(
        "Slice 3B requires a canonical INVALIDATED_BY edge produced by Slice 3A when graph is configured."
      );
    }
    if (!input.activeDecision || !input.activeDecision.decision_id) {
      throw new CircuitBreakerPreconditionError(
        "Slice 3B requires a valid activeDecision (AdoptionDecisionRecord)."
      );
    }
    if (!input.activeBinding || !input.activeBinding.binding_id) {
      throw new CircuitBreakerPreconditionError(
        "Slice 3B requires a valid activeBinding (ValidationVersionBindingRecord)."
      );
    }
    if (triggerResult.decisionId !== input.activeDecision.decision_id) {
      throw new CircuitBreakerPreconditionError(
        `Decision ID mismatch: triggerResult indicates "${triggerResult.decisionId}", but activeDecision is "${input.activeDecision.decision_id}".`
      );
    }

    const startedAt = this.clock();
    const decisionId = input.activeDecision.decision_id;

    // 2. Authoritative Post-Cutover Lifecycle State Evaluation via Gate8StateMachine
    // Current lifecycle authority belongs exclusively to WP-24 / Gate8StateMachine.
    const authState = this.gate8StateMachine.getAuthorizationState(decisionId);
    if (!authState) {
      throw new CircuitBreakerExecutionError(
        "LIFECYCLE_EVALUATION",
        `Decision "${decisionId}" has no recorded authorization state in Gate8StateMachine. Cannot suspend unregistered authorization.`,
        triggerResult.triggerRecord
      );
    }

    const currentStatus = authState.currentStatus;
    let suspensionStatus: CircuitBreakerSuspensionStatus;
    let changeRecord: Gate8ChangeRecord | undefined;
    const previousGovernanceStatus = currentStatus;
    let currentGovernanceStatus: string;
    let suspensionAppliedAt: string | undefined;

    if (currentStatus === GOVERNANCE_STATUSES.ACTIVE) {
      // 2.1 ACTIVE: Suspension is valid
      const official =
        input.authorizingOfficial ??
        this.authorizingOfficial ??
        input.activeDecision.authorizing_official ??
        "Automated Gate 8 Pipeline";

      const officialKey =
        input.authorizingOfficialKey ??
        this.authorizingOfficialKey ??
        (official === "Automated Gate 8 Pipeline"
          ? "sec_key_automated_gate8_pipeline_2026_q4"
          : official === "Chief Sound Engineering Governance Authority"
          ? "sec_key_chief_governance_2026_q4_phase1c5h"
          : undefined);

      const changeReason =
        input.changeReason ??
        `Automated circuit breaker suspension: TRIGGER-10 production quality telemetry anomaly spike detected ` +
        `[Record 18: ${triggerResult.triggerRecord.trigger_id}]. ` +
        `${triggerResult.details ?? "Production quality telemetry anomaly spike."}`;

      try {
        const transitionResult = this.gate8StateMachine.suspendAuthorization({
          decisionId,
          decisionRecord: input.activeDecision,
          changeReason,
          triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
          authorizingOfficial: official,
          authorizingOfficialKey: officialKey,
          affectedScope: triggerResult.triggerRecord.affected_scope,
          revalidationRequired: true,
          requiredAdoptionResponse: REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED,
          timestamp: startedAt,
        });

        changeRecord = transitionResult.changeRecord;

        // Verify the generated Record 22 contains required_adoption_response === REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED
        if (
          changeRecord.required_adoption_response !==
          REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED
        ) {
          throw new CircuitBreakerExecutionError(
            "GATE8_SUSPENSION",
            `Generated Record 22 "${changeRecord.change_id}" required_adoption_response was "${changeRecord.required_adoption_response}", expected "${REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED}".`,
            triggerResult.triggerRecord
          );
        }

        suspensionStatus = "SUSPENDED";
        currentGovernanceStatus = GOVERNANCE_STATUSES.SUSPENDED;
        suspensionAppliedAt = this.clock();
      } catch (err: any) {
        if (err instanceof CircuitBreakerExecutionError) {
          throw err;
        }
        throw new CircuitBreakerExecutionError(
          "GATE8_SUSPENSION",
          `Failed to execute Gate 8 suspension: ${err.message}`,
          triggerResult.triggerRecord,
          err
        );
      }
    } else if (currentStatus === GOVERNANCE_STATUSES.SUSPENDED) {
      // 2.2 SUSPENDED: Suspension condition is already satisfied (idempotent / no-op)
      suspensionStatus = "ALREADY_SUSPENDED";
      currentGovernanceStatus = GOVERNANCE_STATUSES.SUSPENDED;
      const history = this.gate8StateMachine.getChangeRecords(decisionId);
      changeRecord = history.length > 0 ? history[history.length - 1] : undefined;
    } else if (currentStatus === GOVERNANCE_STATUSES.RESTRICTED) {
      // 2.3 RESTRICTED: Direct transition to SUSPENDED without re-adjudication is prohibited
      throw new ProhibitedSuspensionError(
        decisionId,
        currentStatus,
        "Direct transition from RESTRICTED to SUSPENDED without re-adjudication is strictly prohibited by Gate 8 governance."
      );
    } else if (
      currentStatus === GOVERNANCE_STATUSES.WITHDRAWN ||
      currentStatus === GOVERNANCE_STATUSES.SUPERSEDED
    ) {
      // 2.4 & 2.5 WITHDRAWN / SUPERSEDED: Terminal states
      throw new TerminalAuthorizationStateError(
        decisionId,
        currentStatus,
        `Cannot invoke circuit breaker against an authorization in terminal state "${currentStatus}".`
      );
    } else {
      throw new CircuitBreakerExecutionError(
        "LIFECYCLE_EVALUATION",
        `Unrecognized Gate 8 lifecycle governance status "${currentStatus}".`,
        triggerResult.triggerRecord
      );
    }

    // 3. Operational Rollback Signaling (Phase 1C.5g)
    // WP-28 holds ZERO traffic routing authority; routing reversion belongs exclusively to Phase 1C.5g.
    const breachedMetricsSummary = triggerResult.allMajorBreaches
      ? triggerResult.allMajorBreaches
          .map((b) => `${b.metricId}=${b.observedValue} (threshold: ${b.thresholdValue})`)
          .join("; ")
      : undefined;

    const rollbackSignal: OperationalRollbackSignal = {
      decisionId,
      versionBindingId: input.activeBinding.binding_id,
      affectedScope: [...triggerResult.triggerRecord.affected_scope],
      reason:
        `Production quality telemetry anomaly spike breaching profile "${triggerResult.triggerRecord.trigger_id}". ` +
        `Gate 8 authorization "${decisionId}" suspended. Live routing reversion to golden baseline requested. ` +
        (breachedMetricsSummary ? `Breaches: ${breachedMetricsSummary}.` : ""),
      requestedAt: this.clock(),
      triggerSource: "TRIGGER-10",
      telemetryEventId: triggerResult.triggerRecord.trigger_id,
      breachedMetricSummary: breachedMetricsSummary,
    };

    let rollbackDispatched = false;
    let rollbackAck: OperationalSignalAck | undefined;
    let rollbackSignaledAt: string | undefined;
    let rollbackError: string | undefined;

    const signalPort = input.operationalSignalPort ?? this.operationalSignalPort;
    if (signalPort) {
      try {
        rollbackAck = await Promise.resolve(signalPort.signalRollback(rollbackSignal));
        rollbackDispatched = true;
        rollbackSignaledAt = this.clock();
      } catch (signalErr: any) {
        // Governance suspension is satisfied, but operational signal dispatch failed.
        // Rollback signal failure must NOT suppress or cancel the governed retest obligation.
        // Preserve rollback signaling failure separately so that RetestPlanner handoff proceeds.
        rollbackDispatched = false;
        rollbackError =
          signalErr instanceof Error ? signalErr.message : String(signalErr);
      }
    }

    const completedAt = this.clock();

    const rollbackDetail = rollbackError
      ? `Operational rollback signal dispatch to Phase 1C.5g failed: ${rollbackError}.`
      : rollbackDispatched
      ? `Operational rollback signal dispatched to Phase 1C.5g (dispatchId: "${rollbackAck?.dispatchId}").`
      : `Operational signal port not attached; rollback signal constructed without dispatch.`;

    const details =
      suspensionStatus === "SUSPENDED"
        ? `Gate 8 authorization "${decisionId}" successfully transitioned ACTIVE -> SUSPENDED via Record 22 ` +
          `"${changeRecord?.change_id}". ${rollbackDetail}`
        : `Gate 8 authorization "${decisionId}" was already in SUSPENDED status (suspension condition already satisfied). ${rollbackDetail}`;

    return deepFreeze({
      status: suspensionStatus,
      decisionId,
      changeRecord: changeRecord ? defensiveClone(changeRecord) : undefined,
      previousGovernanceStatus,
      currentGovernanceStatus,
      rollbackDispatched,
      rollbackSignal: defensiveClone(rollbackSignal),
      rollbackAck: rollbackAck ? defensiveClone(rollbackAck) : undefined,
      rollbackError,
      startedAt,
      suspensionAppliedAt,
      rollbackSignaledAt,
      completedAt,
      details,
    });
  }

  // ---------------------------------------------------------------------------
  // Slice 3C: WP-20 Retest Planning Handoff, Record 19 & REQUIRES_RETEST Linkage
  // ---------------------------------------------------------------------------

  /**
   * Orchestrates the handoff from confirmed Gate 8 suspension (Slice 3B) and
   * triggered telemetry degradation (Slice 3A) to WP-20 Retest Planning.
   *
   * Invariants:
   * 1. Requires valid Slice 3A trigger evidence (TRIGGER_FIRED + canonical Record 18 + INVALIDATED_BY).
   * 2. Requires valid Slice 3B suspension outcome (SUSPENDED or ALREADY_SUSPENDED).
   * 3. Preserves factual distinction between suspension completed, already suspended,
   *    and rollback signal acknowledgment.
   * 4. Invokes authoritative WP-20 RetestPlanner.createRetestPlan() — does NOT construct Record 19 manually.
   * 5. Establishes canonical Edge: Record 18 (RevalidationTriggerRecord) -> Record 19 (RetestPlanRecord) (REQUIRES_RETEST).
   * 6. Strictly preserves immutability of Record 19 without modification or re-sealing.
   * 7. Fails closed upon missing preconditions or contract violations.
   */
  public async processRetestHandoffStage(
    input: CircuitBreakerRetestHandoffInput
  ): Promise<CircuitBreakerRetestStageResult> {
    const startedAt = this.clock();

    // 1. Validate preconditions
    if (!input) {
      throw new CircuitBreakerPreconditionError(
        "CircuitBreakerRetestHandoffInput is required."
      );
    }

    const { triggerResult, suspensionResult } = input;

    // 1.1 Verify Slice 3A trigger evidence
    if (!triggerResult) {
      throw new CircuitBreakerPreconditionError(
        "Trigger stage result from Slice 3A is required for retest planning handoff."
      );
    }

    if (
      !triggerResult.eligibleForTrigger ||
      triggerResult.status !== "TRIGGER_FIRED" ||
      !triggerResult.triggerRecord
    ) {
      throw new CircuitBreakerPreconditionError(
        "Cannot execute retest planning handoff: Slice 3A did not produce an eligible fired trigger or canonical Record 18."
      );
    }

    // 1.2 Verify Slice 3B suspension evidence
    if (!suspensionResult) {
      throw new CircuitBreakerPreconditionError(
        "Suspension stage result from Slice 3B is required for retest planning handoff."
      );
    }

    if (
      suspensionResult.status !== "SUSPENDED" &&
      suspensionResult.status !== "ALREADY_SUSPENDED"
    ) {
      throw new CircuitBreakerPreconditionError(
        `Cannot execute retest planning handoff: suspension stage is in invalid status "${suspensionResult.status}".`
      );
    }

    // 1.3 Verify decision identity congruence
    if (triggerResult.decisionId !== suspensionResult.decisionId) {
      throw new CircuitBreakerPreconditionError(
        `Decision ID mismatch between trigger stage ("${triggerResult.decisionId}") and suspension stage ("${suspensionResult.decisionId}").`
      );
    }

    // 1.4 Validate mandatory planning artifacts
    const missingInputs: string[] = [];
    if (!input.packageRecord || !input.packageRecord.package_id) {
      missingInputs.push("packageRecord");
    }
    if (!input.scopeRecord || !input.scopeRecord.scope_id) {
      missingInputs.push("scopeRecord");
    }
    if (!input.availableCases) {
      missingInputs.push("availableCases");
    }
    if (!input.existingEvidenceRecords) {
      missingInputs.push("existingEvidenceRecords");
    }

    if (missingInputs.length > 0) {
      const completedAt = this.clock();

      const suspensionFact =
        suspensionResult.status === "SUSPENDED"
          ? `Gate 8 authorization transitioned to SUSPENDED via Record 22 "${suspensionResult.changeRecord?.change_id}".`
          : `Gate 8 authorization was already in SUSPENDED status.`;

      const rollbackFact = suspensionResult.rollbackDispatched
        ? `Operational rollback signal dispatched to Phase 1C.5g (dispatchId: "${suspensionResult.rollbackAck?.dispatchId ?? "acknowledged"}").`
        : `Operational rollback signal constructed without dispatch.`;

      const details =
        `WP-20 Retest Planning handoff is incomplete. Mandatory retest-planning inputs missing: [${missingInputs.join(", ")}]. ` +
        `Record 19 (RetestPlanRecord) and canonical REQUIRES_RETEST edge were NOT created. ` +
        `Retest handoff could not be executed without caller-supplied inputs. Incident reconciliation is partial. ` +
        `Prior evidence preserved: Record 18 "${triggerResult.triggerRecord.trigger_id}", INVALIDATED_BY edge. ` +
        `Lifecycle context: ${suspensionFact} ${rollbackFact}`;

      return deepFreeze({
        status: "RETEST_HANDOFF_INCOMPLETE",
        missingInputs: Object.freeze([...missingInputs]),
        startedAt,
        completedAt,
        details,
      });
    }

    // 2. Invoke canonical WP-20 RetestPlanner
    const planner = input.retestPlanner ?? this.retestPlanner;
    const graph = input.graph ?? this.graph;
    const auditLedger = input.auditLedger ?? this.auditLedger;

    let retestPlanResult: RetestPlanResult;
    try {
      retestPlanResult = planner.createRetestPlan({
        triggerRecord: triggerResult.triggerRecord,
        packageRecord: input.packageRecord!,
        scopeRecord: input.scopeRecord!,
        availableCases: input.availableCases!,
        existingEvidenceRecords: input.existingEvidenceRecords!,
        executionRecords: input.executionRecords,
        changeEvent: input.changeEvent,
        graph,
        auditLedger,
      });
    } catch (err: any) {
      if (
        err instanceof CircuitBreakerPreconditionError ||
        err instanceof CircuitBreakerExecutionError
      ) {
        throw err;
      }
      throw new CircuitBreakerExecutionError(
        "RETEST_PLANNING",
        `WP-20 RetestPlanner failed during retest plan creation: ${err.message}`,
        triggerResult.triggerRecord,
        err
      );
    }

    // 3. Verify Record 19 Ownership & Integrity
    const {
      retestPlan,
      retainedValidEvidenceRefs,
      invalidatedEvidenceRefs,
      requiredNewCases,
      retestScope,
      requiresRetestEdge,
    } = retestPlanResult;

    if (!retestPlan || !retestPlan.retest_plan_id) {
      throw new CircuitBreakerExecutionError(
        "RETEST_PLANNING",
        "RetestPlanner failed to produce a valid RetestPlanRecord (Record 19).",
        triggerResult.triggerRecord
      );
    }

    if (retestPlan.trigger_id !== triggerResult.triggerRecord.trigger_id) {
      throw new CircuitBreakerExecutionError(
        "RETEST_PLANNING",
        `Record 19 trigger_id "${retestPlan.trigger_id}" does not match Record 18 trigger_id "${triggerResult.triggerRecord.trigger_id}".`,
        triggerResult.triggerRecord
      );
    }

    if (retestPlan.previous_package_id !== input.packageRecord!.package_id) {
      throw new CircuitBreakerExecutionError(
        "RETEST_PLANNING",
        `Record 19 previous_package_id "${retestPlan.previous_package_id}" does not match package_id "${input.packageRecord!.package_id}".`,
        triggerResult.triggerRecord
      );
    }

    // 4. Verify canonical REQUIRES_RETEST edge linkage if graph is configured
    if (graph && !requiresRetestEdge) {
      const existingEdge = graph
        .getEdges()
        .find(
          (e) =>
            e.edgeType === GOVERNED_EDGE_TYPES.REQUIRES_RETEST &&
            e.source.id === triggerResult.triggerRecord.trigger_id &&
            e.target.id === retestPlan.retest_plan_id
        );
      if (!existingEdge) {
        throw new CircuitBreakerExecutionError(
          "RETEST_EDGE_LINKAGE",
          `Canonical REQUIRES_RETEST edge was not established between trigger "${triggerResult.triggerRecord.trigger_id}" and plan "${retestPlan.retest_plan_id}".`,
          triggerResult.triggerRecord
        );
      }
    }

    const completedAt = this.clock();

    // Preserve factual status distinctions in details string
    const suspensionFact =
      suspensionResult.status === "SUSPENDED"
        ? `Gate 8 authorization transitioned to SUSPENDED via Record 22 "${suspensionResult.changeRecord?.change_id}".`
        : `Gate 8 authorization was already in SUSPENDED status.`;

    const rollbackFact = suspensionResult.rollbackError
      ? `Operational rollback signal dispatch to Phase 1C.5g failed: ${suspensionResult.rollbackError}.`
      : suspensionResult.rollbackDispatched
      ? `Operational rollback signal dispatched to Phase 1C.5g (dispatchId: "${suspensionResult.rollbackAck?.dispatchId ?? "acknowledged"}").`
      : `Operational rollback signal constructed without dispatch.`;

    const details =
      `WP-20 RetestPlanRecord "${retestPlan.retest_plan_id}" successfully produced for trigger "${triggerResult.triggerRecord.trigger_id}". ` +
      `Evidence partitioned: ${retainedValidEvidenceRefs.length} retained valid, ${invalidatedEvidenceRefs.length} invalidated. ` +
      `Required new cases: [${requiredNewCases.join(", ")}]. Bounded retest scope: [${retestScope.join(", ")}]. ` +
      (requiresRetestEdge
        ? `Canonical REQUIRES_RETEST edge "${requiresRetestEdge.edgeId}" established. `
        : "") +
      `Incident context: ${suspensionFact} ${rollbackFact}`;

    return deepFreeze({
      status: "RETEST_PLANNED",
      retestPlan: defensiveClone(retestPlan),
      retainedValidEvidenceRefs: [...retainedValidEvidenceRefs],
      invalidatedEvidenceRefs: [...invalidatedEvidenceRefs],
      requiredNewCases: [...requiredNewCases],
      retestScope: [...retestScope],
      requiresRetestEdge: requiresRetestEdge
        ? defensiveClone(requiresRetestEdge)
        : undefined,
      startedAt,
      completedAt,
      details,
    });
  }

  // ---------------------------------------------------------------------------
  // End-to-End Orchestration (Slice 3A + Slice 3B + Slice 3C)
  // ---------------------------------------------------------------------------

  /**
   * Complete end-to-end CircuitBreaker execution across Slice 3A, Slice 3B, and Slice 3C.
   *
   * 1. Trigger Detection Stage (Slice 3A):
   *    Evaluates telemetry against governed rules.
   *    If severity !== MAJOR_DEGRADATION, exits cleanly as INELIGIBLE.
   *    If MAJOR_DEGRADATION, emits Record 18 and registers INVALIDATED_BY edge.
   *
   * 2. Gate 8 Suspension Stage (Slice 3B):
   *    Suspends active Gate 8 authorization via Gate8StateMachine, emitting Record 22.
   *    Dispatches operational rollback signal to Phase 1C.5g via OperationalSignalPort.
   *
   * 3. Retest Planning Handoff Stage (Slice 3C):
   *    Mandatory governance handoff for qualifying major incidents.
   *    Invokes WP-20 RetestPlanner when inputs are supplied, producing Record 19 and REQUIRES_RETEST.
   *    If mandatory inputs are missing, reports RETEST_HANDOFF_INCOMPLETE while preserving all prior evidence.
   *    Declares INCIDENT_RECONCILED only when all required governance handoffs factually complete.
   */
  public async execute(
    input: CircuitBreakerExecutionInput
  ): Promise<CircuitBreakerExecutionResult> {
    const triggerStage = await this.processTriggerStage(input);

    if (!triggerStage.eligibleForTrigger || triggerStage.status !== "TRIGGER_FIRED") {
      return deepFreeze({
        status: "INELIGIBLE",
        eligibleForTrigger: false,
        decisionId: input.activeDecision.decision_id,
        triggerStage,
        completedAt: this.clock(),
        details:
          triggerStage.details ??
          `Telemetry evaluation was not eligible for TRIGGER-10 firing.`,
      });
    }

    const suspensionStage = await this.processSuspensionStage({
      triggerResult: triggerStage,
      activeDecision: input.activeDecision,
      activeBinding: input.activeBinding,
      authorizingOfficial: input.authorizingOfficial,
      authorizingOfficialKey: input.authorizingOfficialKey,
      changeReason: input.changeReason,
      operationalSignalPort: input.operationalSignalPort,
    });

    // Retest planning handoff is a mandatory governance handoff for qualifying major incidents.
    // It is NEVER silently skipped. Missing inputs are reported as incomplete retest handoff.
    const retestStage = await this.processRetestHandoffStage({
      triggerResult: triggerStage,
      suspensionResult: suspensionStage,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      availableCases: input.availableCases,
      existingEvidenceRecords: input.existingEvidenceRecords,
      executionRecords: input.executionRecords,
      changeEvent: input.changeEvent,
      retestPlanner: input.retestPlanner,
      graph: this.graph,
      auditLedger: this.auditLedger,
    });

    // Verify complete end-to-end incident reconciliation (all 6 minimum criteria):
    // 1. Record 18 exists
    const hasRecord18 =
      triggerStage.status === "TRIGGER_FIRED" &&
      Boolean(triggerStage.triggerRecord?.trigger_id);

    // 2. INVALIDATED_BY exists
    const hasInvalidatedBy =
      Boolean(triggerStage.invalidationEdge) ||
      Boolean(
        this.graph
          ?.getEdges()
          .some(
            (e) =>
              e.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY &&
              e.source.id === triggerStage.decisionId &&
              e.target.id === triggerStage.triggerRecord?.trigger_id
          )
      );

    // 3. Lifecycle suspension is satisfied (newly SUSPENDED or already SUSPENDED)
    const isSuspensionSatisfied =
      suspensionStage.status === "SUSPENDED" ||
      suspensionStage.status === "ALREADY_SUSPENDED";

    // 4. Operational rollback request has been attempted according to Slice 3B semantics without dispatch failure.
    // If operational rollback dispatch failed, INCIDENT_RECONCILED is IMPOSSIBLE.
    // Note: rollback acknowledgment (rollbackAck) is strictly an operational reception acknowledgment,
    // not proof of completed physical rollback (Phase 1C.5g owns PATH-ROLLBACK execution).
    const isRollbackDispatchedWithoutFailure =
      Boolean(suspensionStage.rollbackSignal) &&
      !suspensionStage.rollbackError;

    // 5. RetestPlanner has successfully produced canonical Record 19
    const hasRecord19 =
      retestStage.status === "RETEST_PLANNED" &&
      Boolean(retestStage.retestPlan?.retest_plan_id);

    // 6. Canonical REQUIRES_RETEST has been established
    const hasRequiresRetest =
      Boolean(retestStage.requiresRetestEdge) ||
      Boolean(
        this.graph
          ?.getEdges()
          .some(
            (e) =>
              e.edgeType === GOVERNED_EDGE_TYPES.REQUIRES_RETEST &&
              e.source.id === triggerStage.triggerRecord?.trigger_id &&
              e.target.id === retestStage.retestPlan?.retest_plan_id
          )
      );

    const isIncidentReconciled =
      hasRecord18 &&
      hasInvalidatedBy &&
      isSuspensionSatisfied &&
      isRollbackDispatchedWithoutFailure &&
      hasRecord19 &&
      hasRequiresRetest;

    const status: CircuitBreakerExecutionStatus = isIncidentReconciled
      ? "INCIDENT_RECONCILED"
      : "RECONCILIATION_INCOMPLETE";

    const completedAt = this.clock();

    const incidentDetails = [
      triggerStage.details,
      suspensionStage.details,
      retestStage.details,
    ]
      .filter(Boolean)
      .join(" ");

    return deepFreeze({
      status,
      eligibleForTrigger: true,
      decisionId: input.activeDecision.decision_id,
      triggerStage,
      suspensionStage,
      retestStage,
      completedAt,
      details: incidentDetails,
    });
  }
}

