// src/sound-engineer/validation/telemetry/telemetryTypes.ts
// Telemetry domain contracts, metric definitions, and governed profile interfaces for Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.
// Strictly adheres to the zero-hardcoded-thresholds and historical immutability invariants.

import {
  AdoptionDecisionRecord,
  Gate8ChangeRecord,
  RetestPlanRecord,
  RevalidationTriggerRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { RelationshipEdge } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  AnyEvidenceRecord,
  GovernedMaterialChangeEvent,
} from "../retest/retestTypes";
import { RetestPlanner } from "../retest/retestPlanner";
import {
  OperationalRollbackSignal,
  OperationalSignalAck,
  OperationalSignalPort,
} from "./operationalSignalPort";

/**
 * Implementation-local severity classification for real-time telemetry evaluation.
 * Governed Rule:
 * - This is NOT a frozen global enum and is NOT in schemas/enums.ts.
 * - This does NOT represent a new governed lifecycle state or record.
 */
export type TelemetryEvaluationSeverity =
  | "NORMAL"
  | "MINOR_ANOMALY"
  | "MAJOR_DEGRADATION"
  | "UNEVALUABLE";

/**
 * Mathematical comparison direction applied during threshold evaluation.
 */
export type MetricComparisonDirection =
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL";

/**
 * Single metric threshold rule resolved from an externally governed telemetry threshold profile.
 * Zero hardcoded values: all thresholds, bounds, and directions are externally supplied.
 */
export interface GovernedMetricThresholdRule {
  /** Metric identifier matched against incoming observations (e.g. "thd_ratio", "buffer_underrun_rate") */
  readonly metricId: string;

  /** Major threshold at which stop criteria are breached and circuit breaker must trigger */
  readonly majorThreshold: number;

  /** Optional minor threshold at which warning and sampling escalation are triggered */
  readonly minorThreshold?: number;

  /** Explicit governed comparison operator (mandatory: zero code-owned comparison defaults permitted). */
  readonly comparisonDirection: MetricComparisonDirection;

  /** Optional unit representation provided by governed policy (e.g. "ratio", "dB", "ms", "count") */
  readonly unit?: string;

  /** Minimum sample count or window size required by policy to consider observation statistically valid */
  readonly minSampleSize?: number;

  /** Human-readable explanation of the governing rule */
  readonly description?: string;
}

/**
 * Governed telemetry threshold policy resolved from `telemetry_threshold_profile_ref`.
 *
 * CRITICAL GOVERNANCE CONSTITUTION:
 * - WP-28 does NOT own threshold values.
 * - WP-28 consumes externally governed threshold profiles.
 * - Zero default threshold numbers or built-in fallback profiles.
 */
export interface GovernedTelemetryThresholdProfile {
  /** Unique reference token identifying this governed profile (matches telemetry_threshold_profile_ref) */
  readonly profileRef: string;

  /** Array of metric threshold rules enforced under this profile */
  readonly rules: ReadonlyArray<GovernedMetricThresholdRule>;

  /**
   * Optional maximum permitted time budget (in milliseconds) within which the circuit breaker
   * must fire following a major degradation breach. Governed strictly by the profile, not hardcoded.
   */
  readonly reactionBudgetMs?: number;

  /** Human-readable description of the profile scope and purpose */
  readonly description?: string;

  /** Optional auxiliary metadata supplied by the governance authority */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Externally supplied stream-loss failsafe policy.
 * Separate ownership: stream-loss timeout is not assumed to be part of the threshold profile.
 * Zero default timeout: must be explicitly provided by the caller or runtime environment.
 */
export interface TelemetryStreamLossPolicy {
  /** Duration in milliseconds of telemetry absence before stream disruption is declared */
  readonly streamLossTimeoutMs: number;

  /** Optional identifier or reference token for this stream-loss policy */
  readonly policyRef?: string;

  /** Human-readable rationale or description */
  readonly description?: string;
}

/**
 * Single observed telemetry metric datum from live Canary / PATH-ADOPT exposure.
 */
export interface TelemetryMetricObservation {
  /** Metric identifier (matches GovernedMetricThresholdRule.metricId) */
  readonly metricId: string;

  /** Observed numeric value */
  readonly value: number;

  /** Number of observations or buffer frames represented in this metric */
  readonly sampleSize?: number;

  /** Unit of measurement (if supplied by emitter) */
  readonly unit?: string;

  /** Optional auxiliary metadata attached to the observation */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable factual telemetry sample ingested from Canary traffic slices.
 * Contains only factual references; does NOT duplicate canonical record payloads.
 */
export interface TelemetrySample {
  /** Reference to the active AdoptionDecisionRecord authorizing the live exposure */
  readonly decisionId: string;

  /** Reference to the active ValidationVersionBindingRecord under test */
  readonly versionBindingId: string;

  /** Governed gear or preset scope for which these metrics were observed */
  readonly scope: readonly string[];

  /** Timestamp when the metric observations were measured (ISO 8601 UTC) */
  readonly timestamp: string;

  /** Extensible set of metric observations reported in this sample */
  readonly observations: ReadonlyArray<TelemetryMetricObservation>;

  /** Optional externally supplied correlation or event identifier */
  readonly eventId?: string;

  /** Optional emitter/harness metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Factual record of an individual threshold rule breach during evaluation.
 */
export interface RuleBreachEvaluation {
  /** The metric that breached threshold */
  readonly metricId: string;

  /** The actual observed numeric value */
  readonly observedValue: number;

  /** The threshold that was exceeded */
  readonly thresholdValue: number;

  /** Severity of the breach */
  readonly breachSeverity: "MINOR_ANOMALY" | "MAJOR_DEGRADATION";

  /** Optional description from the breached rule */
  readonly ruleDescription?: string;
}

/**
 * Immutable factual evaluation result produced by QualityTelemetryMonitor.
 * Pure diagnostic artifact: does NOT perform Gate 8 mutation or operational rollback.
 */
export interface TelemetryEvaluationResult {
  /** Final synthesized evaluation severity */
  readonly severity: TelemetryEvaluationSeverity;

  /** Reference to the governing profile used for evaluation */
  readonly profileRef: string;

  /** Original timestamp of the telemetry observation */
  readonly sampleTimestamp: string;

  /** Timestamp when evaluation was conducted (ISO 8601 UTC) */
  readonly evaluationTimestamp: string;

  /** Reference to active AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Reference to active version binding */
  readonly versionBindingId: string;

  /** Evaluated gear / preset scope */
  readonly scope: readonly string[];

  /** All metric observations evaluated */
  readonly evaluatedMetrics: ReadonlyArray<TelemetryMetricObservation>;

  /** Any threshold rules breached during evaluation */
  readonly breachedRules: ReadonlyArray<RuleBreachEvaluation>;

  /** Governed reaction budget (in ms) from profile, if specified */
  readonly reactionBudgetMs?: number;

  /** Timestamp when telemetry sample was received by monitor (ISO 8601 UTC) */
  readonly receivedTimestamp?: string;

  /** Optional event identifier carried over from the sample */
  readonly eventId?: string;

  /** Reason for UNEVALUABLE status if evidence was missing or incomplete */
  readonly unevaluableReason?: string;
}

/**
 * Factual warning event emitted upon MINOR_ANOMALY detection.
 */
export interface TelemetryWarningEvent {
  readonly eventId: string;
  readonly decisionId: string;
  readonly versionBindingId: string;
  readonly scope: readonly string[];
  readonly sampleTimestamp: string;
  readonly emittedTimestamp: string;
  readonly breachedRules: ReadonlyArray<RuleBreachEvaluation>;
  readonly metrics: ReadonlyArray<TelemetryMetricObservation>;
  readonly message: string;
}

/**
 * Factual operations alert dispatched upon MINOR_ANOMALY or unusual operational drift.
 */
export interface TelemetryOperationsAlert {
  readonly alertId: string;
  readonly decisionId: string;
  readonly versionBindingId: string;
  readonly scope: readonly string[];
  readonly timestamp: string;
  readonly severity: TelemetryEvaluationSeverity;
  readonly summary: string;
  readonly breachedRules: ReadonlyArray<RuleBreachEvaluation>;
}

/**
 * Stream health classification.
 */
export type StreamHealthStatus = "HEALTHY" | "DISRUPTED" | "UNKNOWN";

/**
 * Factual diagnostic report of telemetry stream health and continuity.
 */
export interface StreamHealthReport {
  readonly status: StreamHealthStatus;
  readonly elapsedSinceLastSampleMs: number;
  readonly streamLossTimeoutMs?: number;
  readonly lastSampleTimestamp?: string;
  readonly checkedAt: string;
  readonly disruptionDetected: boolean;
  readonly pauseSignalDispatched?: boolean;
  readonly fallbackEngaged?: boolean;
  readonly details?: string;
}

/**
 * Input for QualityTelemetryMonitor.evaluateSample().
 */
export interface EvaluateTelemetryInput {
  readonly sample: TelemetrySample;
  readonly profileRef: string;
  readonly expectedAuthorizedScope?: readonly string[];
  readonly expectedVersionBindingId?: string;
  readonly allowPartialScope?: boolean;
}

/**
 * Known telemetry metric identifiers corresponding to frozen examples and existing repository metrics.
 * Note: These are supported identifier conventions, NOT rigid mandatory fields on every sample.
 */
export const KNOWN_TELEMETRY_METRIC_IDS = {
  /** Total Harmonic Distortion degradation */
  THD_RATIO: "telemetry:thd_ratio",
  /** High-frequency aliasing drift */
  ALIASING_DRIFT: "telemetry:aliasing_drift",
  /** Spectral balance / flatness shift */
  SPECTRAL_BALANCE_DRIFT: "telemetry:spectral_balance_drift",
  /** Audio buffer dropout occurrences */
  BUFFER_DROPOUT_COUNT: "telemetry:buffer_dropout_count",
  /** Audio buffer underrun defect rate */
  BUFFER_UNDERRUN_RATE: "telemetry:buffer_underrun_rate",
  /** Host audio thread callback jitter */
  CALLBACK_JITTER_MS: "telemetry:callback_jitter_ms",
  /** User preset reload / discard frequency */
  PRESET_RELOAD_RATE: "telemetry:preset_reload_rate",
  /** Immediate preset abandonment / discard rate */
  PRESET_DISCARD_RATE: "telemetry:preset_discard_rate",
  /** Musician acoustic fatigue / negative sentiment score */
  ACOUSTIC_FATIGUE_SCORE: "telemetry:acoustic_fatigue_score",
} as const;

export type KnownTelemetryMetricId =
  (typeof KNOWN_TELEMETRY_METRIC_IDS)[keyof typeof KNOWN_TELEMETRY_METRIC_IDS];

/**
 * Factual input for CircuitBreaker trigger processing.
 */
export interface CircuitBreakerTriggerInput {
  /** Factual evaluation result produced by QualityTelemetryMonitor */
  readonly evaluation: TelemetryEvaluationResult;

  /** Active AdoptionDecisionRecord being monitored */
  readonly activeDecision: AdoptionDecisionRecord;

  /** Active ValidationVersionBindingRecord under test */
  readonly activeBinding: ValidationVersionBindingRecord;

  /** Optional ValidationScopeRecord (if provided by governance context) */
  readonly scopeRecord?: ValidationScopeRecord;
}

/**
 * Factual result produced by CircuitBreaker trigger detection and edge linkage (Slice 3A).
 */
export interface CircuitBreakerTriggerStageResult {
  /** Execution status of the trigger detection stage */
  readonly status: "TRIGGER_FIRED" | "INELIGIBLE";

  /** Whether the telemetry evaluation was eligible for TRIGGER-10 firing */
  readonly eligibleForTrigger: boolean;

  /** Reference to the target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Canonical RevalidationTriggerRecord generated by RevalidationTriggerDetector, if fired */
  readonly triggerRecord?: RevalidationTriggerRecord;

  /** Canonical INVALIDATED_BY relationship edge instantiated, if fired */
  readonly invalidationEdge?: RelationshipEdge;

  /** All major breaches identified during evaluation */
  readonly allMajorBreaches?: ReadonlyArray<RuleBreachEvaluation>;

  /** Timestamp of the underlying evaluation */
  readonly evaluationTimestamp: string;

  /** Timestamp when circuit breaker orchestration started */
  readonly orchestrationStartedAt: string;

  /** Timestamp when trigger detection completed */
  readonly triggerDetectedAt?: string;

  /** Timestamp when INVALIDATED_BY edge was registered */
  readonly edgeInstantiatedAt?: string;

  /** Timestamp when this stage concluded */
  readonly completedAt: string;

  /** Diagnostic details or rationale */
  readonly details?: string;
}

/**
 * Execution status for Gate 8 suspension stage (Slice 3B).
 */
export type CircuitBreakerSuspensionStatus =
  | "SUSPENDED"           // Gate 8 was ACTIVE and successfully transitioned to SUSPENDED via Record 22
  | "ALREADY_SUSPENDED";  // Gate 8 was already SUSPENDED; suspension is already satisfied

/**
 * Factual input for CircuitBreaker Gate 8 suspension stage (Slice 3B).
 */
export interface CircuitBreakerSuspensionInput {
  /** Successful trigger stage result produced by Slice 3A */
  readonly triggerResult: CircuitBreakerTriggerStageResult;

  /** Active AdoptionDecisionRecord being suspended */
  readonly activeDecision: AdoptionDecisionRecord;

  /** Active ValidationVersionBindingRecord under exposure */
  readonly activeBinding: ValidationVersionBindingRecord;

  /** Optional authorizer identity override */
  readonly authorizingOfficial?: string;

  /** Optional authorizer cryptographic key */
  readonly authorizingOfficialKey?: string;

  /** Optional explicit change reason override */
  readonly changeReason?: string;

  /** Optional operational signal port override for this execution */
  readonly operationalSignalPort?: OperationalSignalPort;
}

/**
 * Factual result produced by CircuitBreaker Gate 8 suspension and rollback signaling (Slice 3B).
 */
export interface CircuitBreakerSuspensionStageResult {
  /** Execution status of the suspension stage */
  readonly status: CircuitBreakerSuspensionStatus;

  /** Reference to target AdoptionDecisionRecord */
  readonly decisionId: string;

  /** Canonical Gate8ChangeRecord (Record 22) generated upon new transition */
  readonly changeRecord?: Gate8ChangeRecord;

  /** Governance status before this suspension step */
  readonly previousGovernanceStatus: string;

  /** Resulting governance status (strictly SUSPENDED) */
  readonly currentGovernanceStatus: string;

  /** Whether operational rollback signal was dispatched via OperationalSignalPort */
  readonly rollbackDispatched: boolean;

  /** Factual operational rollback signal generated for Phase 1C.5g */
  readonly rollbackSignal: OperationalRollbackSignal;

  /** Acknowledgment from Phase 1C.5g operational execution port, if dispatched */
  readonly rollbackAck?: OperationalSignalAck;

  /** Error details if operational rollback signal dispatch failed */
  readonly rollbackError?: string;

  /** Timestamp when suspension stage started */
  readonly startedAt: string;

  /** Timestamp when Gate 8 transition was applied */
  readonly suspensionAppliedAt?: string;

  /** Timestamp when operational rollback was signaled */
  readonly rollbackSignaledAt?: string;

  /** Timestamp when this stage concluded */
  readonly completedAt: string;

  /** Diagnostic details or rationale */
  readonly details: string;
}

/**
 * Execution status for Retest Planning handoff stage (Slice 3C).
 */
export type CircuitBreakerRetestStatus =
  | "RETEST_PLANNED"
  | "RETEST_HANDOFF_INCOMPLETE";

/**
 * Factual input for CircuitBreaker Retest Planning handoff stage (Slice 3C).
 */
export interface CircuitBreakerRetestHandoffInput {
  /** Successful trigger stage result produced by Slice 3A */
  readonly triggerResult: CircuitBreakerTriggerStageResult;

  /** Successful suspension stage result produced by Slice 3B */
  readonly suspensionResult: CircuitBreakerSuspensionStageResult;

  /** The prior ValidationPackage that was previously validated */
  readonly packageRecord?: ValidationPackage;

  /** The declared validation scope record */
  readonly scopeRecord?: ValidationScopeRecord;

  /** Available pool of ValidationCases in the repository/package */
  readonly availableCases?: readonly ValidationCase[];

  /** Existing evidence records from prior execution to be partitioned */
  readonly existingEvidenceRecords?: readonly AnyEvidenceRecord[];

  /** Optional execution records associated with existing evidence for dependency tracing */
  readonly executionRecords?: readonly ValidationExecutionRecord[];

  /** Optional governed external change event */
  readonly changeEvent?: GovernedMaterialChangeEvent;

  /** Optional RetestPlanner override */
  readonly retestPlanner?: RetestPlanner;

  /** Optional graph override */
  readonly graph?: ValidationRelationshipGraph;

  /** Optional audit ledger override */
  readonly auditLedger?: ValidationAuditLedger;
}

/**
 * Factual result produced by CircuitBreaker Retest Planning handoff (Slice 3C).
 */
export interface CircuitBreakerRetestStageResult {
  /** Execution status of the retest stage */
  readonly status: CircuitBreakerRetestStatus;

  /** Canonical RetestPlanRecord (Record 19) generated by WP-20 RetestPlanner (present when RETEST_PLANNED) */
  readonly retestPlan?: RetestPlanRecord;

  /** Disjoint retained valid evidence references (present when RETEST_PLANNED) */
  readonly retainedValidEvidenceRefs?: readonly string[];

  /** Disjoint invalidated evidence references marked stale (present when RETEST_PLANNED) */
  readonly invalidatedEvidenceRefs?: readonly string[];

  /** Minimum sufficient set of required new validation cases (present when RETEST_PLANNED) */
  readonly requiredNewCases?: readonly string[];

  /** Bounded retest scope (present when RETEST_PLANNED) */
  readonly retestScope?: readonly string[];

  /** Canonical REQUIRES_RETEST relationship edge (Record 18 -> Record 19), if graph provided and planned */
  readonly requiresRetestEdge?: RelationshipEdge;

  /** List of missing mandatory inputs when retest handoff is incomplete */
  readonly missingInputs?: readonly string[];

  /** Timestamp when retest handoff stage started */
  readonly startedAt: string;

  /** Timestamp when retest plan generation concluded */
  readonly completedAt: string;

  /** Diagnostic details or rationale */
  readonly details: string;
}

/**
 * Execution status for end-to-end CircuitBreaker orchestration.
 */
export type CircuitBreakerExecutionStatus =
  | "INCIDENT_RECONCILED"
  | "RECONCILIATION_INCOMPLETE"
  | "TRIGGER_FIRED_AND_SUSPENDED"
  | "TRIGGER_FIRED_ALREADY_SUSPENDED"
  | "INELIGIBLE";

/**
 * Input for end-to-end CircuitBreaker execution across Slice 3A, Slice 3B, and Slice 3C.
 */
export interface CircuitBreakerExecutionInput extends CircuitBreakerTriggerInput {
  readonly authorizingOfficial?: string;
  readonly authorizingOfficialKey?: string;
  readonly changeReason?: string;
  readonly operationalSignalPort?: OperationalSignalPort;

  // Retest planning handoff inputs (Slice 3C)
  readonly packageRecord?: ValidationPackage;
  readonly availableCases?: readonly ValidationCase[];
  readonly existingEvidenceRecords?: readonly AnyEvidenceRecord[];
  readonly executionRecords?: readonly ValidationExecutionRecord[];
  readonly changeEvent?: GovernedMaterialChangeEvent;
  readonly retestPlanner?: RetestPlanner;
}

/**
 * Factual result produced by end-to-end CircuitBreaker orchestration.
 */
export interface CircuitBreakerExecutionResult {
  readonly status: CircuitBreakerExecutionStatus;
  readonly eligibleForTrigger: boolean;
  readonly decisionId: string;
  readonly triggerStage: CircuitBreakerTriggerStageResult;
  readonly suspensionStage?: CircuitBreakerSuspensionStageResult;
  readonly retestStage?: CircuitBreakerRetestStageResult;
  readonly completedAt: string;
  readonly details: string;
}



