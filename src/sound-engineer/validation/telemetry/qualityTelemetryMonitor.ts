// src/sound-engineer/validation/telemetry/qualityTelemetryMonitor.ts
// QualityTelemetryMonitor: Executes Activity WF-17 Real-Time Quality Telemetry Evaluation.
// Ingests streaming metrics from Canary / PATH-ADOPT exposure, validates policy applicability,
// evaluates factual observations against governed threshold rules, and monitors stream continuity.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.
// Strictly adheres to zero-hardcoded-thresholds, factual diagnostic separation, and zero routing authority.

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import {
  FallbackTelemetryPort,
} from "./fallbackTelemetryPort";
import {
  OperationalSignalPort,
} from "./operationalSignalPort";
import {
  TelemetrySamplingControlPort,
} from "./telemetrySamplingControlPort";
import {
  IncompleteGovernedPolicyError,
  InvalidTelemetrySampleError,
  MissingGovernedPolicyError,
  MissingTelemetryEvidenceError,
  ScopeMismatchError,
  UnresolvedThresholdProfileError,
  VersionBindingMismatchError,
} from "./telemetryErrors";
import {
  TelemetryThresholdProfileResolver,
} from "./telemetryThresholdProfileResolver";
import {
  EvaluateTelemetryInput,
  GovernedMetricThresholdRule,
  GovernedTelemetryThresholdProfile,
  MetricComparisonDirection,
  RuleBreachEvaluation,
  StreamHealthReport,
  TelemetryEvaluationResult,
  TelemetryEvaluationSeverity,
  TelemetryMetricObservation,
  TelemetryOperationsAlert,
  TelemetrySample,
  TelemetryStreamLossPolicy,
  TelemetryWarningEvent,
} from "./telemetryTypes";

/**
 * Options configuring QualityTelemetryMonitor.
 */
export interface QualityTelemetryMonitorOptions {
  /** Governed telemetry threshold profile resolver (mandatory) */
  readonly resolver: TelemetryThresholdProfileResolver;

  /** Separate externally governed stream-loss policy (zero default timeout) */
  readonly streamLossPolicy?: TelemetryStreamLossPolicy;

  /** Operational signal port for dispatching Canary pause requests to Phase 1C.5g */
  readonly operationalSignalPort?: OperationalSignalPort;

  /** Sampling control port for dispatching semantic escalation requests upon minor anomalies */
  readonly samplingControlPort?: TelemetrySamplingControlPort;

  /** Pluggable fallback monitoring port */
  readonly fallbackTelemetryPort?: FallbackTelemetryPort;

  /** Injected callback/listener for minor anomaly warning events */
  readonly onWarning?: (event: TelemetryWarningEvent) => void | Promise<void>;

  /** Injected callback/listener for operations alerts */
  readonly onOperationsAlert?: (alert: TelemetryOperationsAlert) => void | Promise<void>;

  /** Mockable clock function returning ISO 8601 UTC string (defaults to new Date().toISOString()) */
  readonly clock?: () => string;
}

/**
 * Factual record of an active telemetry disruption episode.
 */
interface DisruptionEpisode {
  readonly episodeId: string;
  readonly detectedAt: string;
  readonly detectedAtMs: number;
  readonly pauseDispatched: boolean;
  readonly fallbackEngaged: boolean;
  readonly details: string;
}

/**
 * State record tracking stream health continuity and active disruption episode.
 */
interface StreamContinuityState {
  lastSampleTimestamp?: string;
  lastSampleReceivedAtMs?: number;
  activeDecisionId?: string;
  activeVersionBindingId?: string;
  activeScope?: string[];
  currentDisruptionEpisode?: DisruptionEpisode;
}

/**
 * QualityTelemetryMonitor: Core engine for Activity WF-17 post-cutover telemetry evaluation.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. Evaluates factual observations against externally governed threshold profiles.
 * 2. Does NOT own threshold numbers; zero hardcoded defaults.
 * 3. Does NOT execute Gate 8 suspension, Record 18 creation, or retest planning (owned by Slice 3 CircuitBreaker).
 * 4. Does NOT switch or manipulate production traffic (owned by Phase 1C.5g).
 * 5. Fails closed on unmapped profiles, missing evidence, scope mismatches, or incomplete policies.
 */
export class QualityTelemetryMonitor {
  private readonly resolver: TelemetryThresholdProfileResolver;
  private readonly streamLossPolicy?: TelemetryStreamLossPolicy;
  private readonly operationalSignalPort?: OperationalSignalPort;
  private readonly samplingControlPort?: TelemetrySamplingControlPort;
  private readonly fallbackTelemetryPort?: FallbackTelemetryPort;
  private readonly onWarning?: (event: TelemetryWarningEvent) => void | Promise<void>;
  private readonly onOperationsAlert?: (alert: TelemetryOperationsAlert) => void | Promise<void>;
  private readonly clock: () => string;

  private readonly streamState: StreamContinuityState = {};


  constructor(options: QualityTelemetryMonitorOptions) {
    if (!options || !options.resolver) {
      throw new MissingGovernedPolicyError(
        "resolver",
        "QualityTelemetryMonitor requires a valid TelemetryThresholdProfileResolver instance."
      );
    }
    this.resolver = options.resolver;
    this.streamLossPolicy = options.streamLossPolicy;
    this.operationalSignalPort = options.operationalSignalPort;
    this.samplingControlPort = options.samplingControlPort;
    this.fallbackTelemetryPort = options.fallbackTelemetryPort;
    this.onWarning = options.onWarning;
    this.onOperationsAlert = options.onOperationsAlert;
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  // ---------------------------------------------------------------------------
  // WF-17 Telemetry Sample Ingestion & Evaluation API
  // ---------------------------------------------------------------------------

  /**
   * Ingests and evaluates a factual TelemetrySample against the governed threshold profile.
   * Produces an immutable, factual TelemetryEvaluationResult without triggering governance mutations.
   */
  public async evaluateSample(
    input: EvaluateTelemetryInput
  ): Promise<TelemetryEvaluationResult> {
    if (!input || !input.sample) {
      throw new InvalidTelemetrySampleError("unknown", "Input sample must not be null or undefined.");
    }
    if (!input.profileRef || typeof input.profileRef !== "string" || input.profileRef.trim().length === 0) {
      throw new UnresolvedThresholdProfileError(
        String(input.profileRef),
        "A valid non-empty profileRef must be provided for evaluation."
      );
    }

    const sample = input.sample;
    const receivedTimestamp = this.clock();
    const receivedAtMs = this.parseTimestampToEpoch(receivedTimestamp, "receivedTimestamp");

    // 1. Basic Sample Validation
    this.validateSampleStructure(sample);

    // 2. Scope Containment & Compatibility Validation
    this.validateScopeAlignment(sample.scope, input.expectedAuthorizedScope, input.allowPartialScope);

    // 3. Version Binding Validation
    if (input.expectedVersionBindingId && sample.versionBindingId !== input.expectedVersionBindingId) {
      throw new VersionBindingMismatchError(
        sample.versionBindingId,
        input.expectedVersionBindingId
      );
    }

    // 4. Resolve Authoritative Governed Threshold Profile (fails closed; zero defaults)
    const profile = await this.resolver.resolve(input.profileRef);
    if (!profile) {
      throw new UnresolvedThresholdProfileError(input.profileRef);
    }

    // 5. Production-Evaluable Policy Validation
    // A production-evaluable profile must supply a valid, non-negative finite reaction budget
    this.validateProductionPolicyCompleteness(profile);

    // 6. Evaluate Factual Metric Observations Against Governed Rules
    const { evaluatedMetrics, breachedRules, missingEvidenceErrors } =
      this.evaluateMetricRules(sample.observations, profile.rules, profile.profileRef);

    // 7. Synthesize Severity
    let severity: TelemetryEvaluationSeverity;
    let unevaluableReason: string | undefined;

    const hasMajorBreach = breachedRules.some((b) => b.breachSeverity === "MAJOR_DEGRADATION");
    const hasMinorBreach = breachedRules.some((b) => b.breachSeverity === "MINOR_ANOMALY");

    if (hasMajorBreach) {
      severity = "MAJOR_DEGRADATION";
    } else if (missingEvidenceErrors.length > 0) {
      severity = "UNEVALUABLE";
      unevaluableReason = missingEvidenceErrors.join("; ");
    } else if (hasMinorBreach) {
      severity = "MINOR_ANOMALY";
    } else {
      severity = "NORMAL";
    }

    const evaluationTimestamp = this.clock();

    // 8. Construct Factual Result
    const evaluationResult: TelemetryEvaluationResult = deepFreeze({
      severity,
      profileRef: profile.profileRef,
      sampleTimestamp: sample.timestamp,
      evaluationTimestamp,
      receivedTimestamp,
      decisionId: sample.decisionId,
      versionBindingId: sample.versionBindingId,
      scope: Object.freeze([...sample.scope]),
      evaluatedMetrics: Object.freeze(evaluatedMetrics.map((m) => defensiveClone(m))),
      breachedRules: Object.freeze(breachedRules.map((b) => defensiveClone(b))),
      reactionBudgetMs: profile.reactionBudgetMs,
      eventId: sample.eventId,
      unevaluableReason,
    });

    // 9. Update Stream Health Tracking State
    this.updateStreamContinuityState(sample, receivedAtMs);

    // 10. Handle MINOR_ANOMALY Actions (Warning, Operations Alert, Sampling Escalation)
    if (severity === "MINOR_ANOMALY") {
      await this.handleMinorAnomalyActions(evaluationResult, breachedRules, sample);
    }

    return evaluationResult;
  }

  // ---------------------------------------------------------------------------
  // Stream Health & Disruption Checking API
  // ---------------------------------------------------------------------------

  /**
   * Deterministically evaluates stream continuity against the governed TelemetryStreamLossPolicy.
   * If stream loss is confirmed, dispatches declarative Canary pause and fallback requests.
   */
  public async checkStreamHealth(
    asOfTimestamp?: string
  ): Promise<StreamHealthReport> {
    const checkedAt = asOfTimestamp ?? this.clock();
    const checkedAtMs = this.parseTimestampToEpoch(checkedAt, "checkedAt");

    // If no stream-loss policy is configured, stream-loss timing cannot be evaluated
    if (!this.streamLossPolicy) {
      return deepFreeze({
        status: "UNKNOWN",
        elapsedSinceLastSampleMs: 0,
        checkedAt,
        disruptionDetected: false,
        details: "No TelemetryStreamLossPolicy configured; stream continuity tracking inactive.",
      });
    }

    const timeoutMs = this.streamLossPolicy.streamLossTimeoutMs;
    if (typeof timeoutMs !== "number" || timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
      throw new MissingGovernedPolicyError(
        "streamLossPolicy.streamLossTimeoutMs",
        "Stream loss timeout must be a positive finite number."
      );
    }

    const lastReceivedMs = this.streamState.lastSampleReceivedAtMs;

    // If no sample has ever arrived
    if (lastReceivedMs === undefined) {
      return deepFreeze({
        status: "UNKNOWN",
        elapsedSinceLastSampleMs: 0,
        streamLossTimeoutMs: timeoutMs,
        checkedAt,
        disruptionDetected: false,
        details: "No telemetry sample has been ingested yet.",
      });
    }

    const elapsedMs = Math.max(0, checkedAtMs - lastReceivedMs);
    const disruptionDetected = elapsedMs >= timeoutMs;

    if (!disruptionDetected) {
      // Stream is healthy; clear any active disruption episode
      this.streamState.currentDisruptionEpisode = undefined;
      return deepFreeze({
        status: "HEALTHY",
        elapsedSinceLastSampleMs: elapsedMs,
        streamLossTimeoutMs: timeoutMs,
        lastSampleTimestamp: this.streamState.lastSampleTimestamp,
        checkedAt,
        disruptionDetected: false,
      });
    }

    // Stream Disruption Confirmed
    // Check if we are already in an active disruption episode to prevent duplicate operational dispatch
    let episode = this.streamState.currentDisruptionEpisode;

    if (!episode) {
      // First confirmed entry into DISRUPTED: dispatch Canary pause and fallback requests once
      let pauseDispatched = false;
      let fallbackEngaged = false;
      const notes: string[] = [];
      const episodeId = `outage_${this.streamState.activeDecisionId ?? "unknown"}_${checkedAtMs}`;

      // 1. Dispatch Canary Pause request via OperationalSignalPort (if available)
      if (this.operationalSignalPort && this.streamState.activeDecisionId) {
        try {
          const pauseAck = await this.operationalSignalPort.signalCanaryPause({
            decisionId: this.streamState.activeDecisionId,
            affectedScope: this.streamState.activeScope ?? [],
            reason: `Telemetry stream loss detected: elapsed ${elapsedMs}ms exceeded governed timeout ${timeoutMs}ms.`,
            requestedAt: checkedAt,
            streamLossDurationMs: elapsedMs,
          });
          pauseDispatched = pauseAck.acknowledged;
          notes.push(`Canary pause signaled (ack dispatchId: ${pauseAck.dispatchId})`);
        } catch (err: any) {
          notes.push(`Canary pause dispatch failed: ${err.message}`);
        }
      } else if (!this.operationalSignalPort) {
        notes.push("OperationalSignalPort not configured; Canary pause not signaled.");
      }

      // 2. Dispatch Fallback Monitoring request via FallbackTelemetryPort (if available)
      if (this.fallbackTelemetryPort && this.streamState.activeDecisionId) {
        try {
          const fallbackAck = await this.fallbackTelemetryPort.engageFallbackMonitoring({
            decisionId: this.streamState.activeDecisionId,
            scope: this.streamState.activeScope ?? [],
            disruptionReason: `Stream timeout: ${elapsedMs}ms elapsed >= ${timeoutMs}ms limit.`,
            requestedAt: checkedAt,
          });
          fallbackEngaged = fallbackAck.engaged;
          notes.push(
            fallbackAck.engaged
              ? `Fallback monitoring engaged (${fallbackAck.fallbackSourceId ?? "active"})`
              : "Fallback monitoring requested but unacknowledged"
          );
        } catch (err: any) {
          notes.push(`Fallback monitoring dispatch failed: ${err.message}`);
        }
      } else if (!this.fallbackTelemetryPort) {
        notes.push("FallbackTelemetryPort not configured; fallback monitoring unavailable.");
      }

      episode = {
        episodeId,
        detectedAt: checkedAt,
        detectedAtMs: checkedAtMs,
        pauseDispatched,
        fallbackEngaged,
        details: notes.join("; "),
      };
      this.streamState.currentDisruptionEpisode = episode;
    }

    return deepFreeze({
      status: "DISRUPTED",
      elapsedSinceLastSampleMs: elapsedMs,
      streamLossTimeoutMs: timeoutMs,
      lastSampleTimestamp: this.streamState.lastSampleTimestamp,
      checkedAt,
      disruptionDetected: true,
      pauseSignalDispatched: episode.pauseDispatched,
      fallbackEngaged: episode.fallbackEngaged,
      details: episode.details,
    });
  }


  // ---------------------------------------------------------------------------
  // Internal Helpers & Validation Logic
  // ---------------------------------------------------------------------------

  private validateSampleStructure(sample: TelemetrySample): void {
    if (!sample.decisionId || typeof sample.decisionId !== "string" || sample.decisionId.trim().length === 0) {
      throw new InvalidTelemetrySampleError("unknown", "Sample decisionId must be a non-empty string.");
    }
    if (
      !sample.versionBindingId ||
      typeof sample.versionBindingId !== "string" ||
      sample.versionBindingId.trim().length === 0
    ) {
      throw new InvalidTelemetrySampleError(sample.decisionId, "Sample versionBindingId must be a non-empty string.");
    }
    if (!Array.isArray(sample.scope) || sample.scope.length === 0) {
      throw new InvalidTelemetrySampleError(sample.decisionId, "Sample scope must contain at least one gear/preset unit.");
    }
    if (!sample.timestamp || typeof sample.timestamp !== "string") {
      throw new InvalidTelemetrySampleError(sample.decisionId, "Sample timestamp must be defined.");
    }
    this.parseTimestampToEpoch(sample.timestamp, "sample.timestamp");

    if (!Array.isArray(sample.observations)) {
      throw new InvalidTelemetrySampleError(sample.decisionId, "Sample observations must be an array.");
    }
  }

  private validateScopeAlignment(
    sampleScope: readonly string[],
    authorizedScope?: readonly string[],
    allowPartialScope = true
  ): void {
    if (!authorizedScope || authorizedScope.length === 0) {
      return;
    }

    const authorizedSet = new Set(authorizedScope);
    const alienUnits = sampleScope.filter((u) => !authorizedSet.has(u));

    if (alienUnits.length > 0) {
      throw new ScopeMismatchError(
        sampleScope,
        authorizedScope,
        `Telemetry sample contains units [${alienUnits.join(", ")}] outside authorized scope.`
      );
    }

    if (!allowPartialScope && sampleScope.length !== authorizedScope.length) {
      throw new ScopeMismatchError(
        sampleScope,
        authorizedScope,
        "Partial scope observations are prohibited under strict scope configuration."
      );
    }
  }

  private validateProductionPolicyCompleteness(
    profile: GovernedTelemetryThresholdProfile
  ): void {
    if (
      profile.reactionBudgetMs === undefined ||
      typeof profile.reactionBudgetMs !== "number" ||
      profile.reactionBudgetMs < 0 ||
      !Number.isFinite(profile.reactionBudgetMs)
    ) {
      throw new IncompleteGovernedPolicyError(
        profile.profileRef,
        "reactionBudgetMs (must be a non-negative finite number)"
      );
    }
  }

  private evaluateMetricRules(
    observations: ReadonlyArray<TelemetryMetricObservation>,
    rules: ReadonlyArray<GovernedMetricThresholdRule>,
    profileRef: string
  ): {
    evaluatedMetrics: TelemetryMetricObservation[];
    breachedRules: RuleBreachEvaluation[];
    missingEvidenceErrors: string[];
  } {
    const obsByMetric = new Map<string, TelemetryMetricObservation>();
    for (const obs of observations) {
      if (obs && typeof obs.metricId === "string" && typeof obs.value === "number" && Number.isFinite(obs.value)) {
        obsByMetric.set(obs.metricId, obs);
      }
    }

    const evaluatedMetrics: TelemetryMetricObservation[] = Array.from(obsByMetric.values());
    const breachedRules: RuleBreachEvaluation[] = [];
    const missingEvidenceErrors: string[] = [];

    for (const rule of rules) {
      // 1. Validate Threshold Rule Completeness
      if (
        !rule ||
        !rule.metricId ||
        typeof rule.metricId !== "string" ||
        rule.metricId.trim().length === 0
      ) {
        missingEvidenceErrors.push(
          `Governed profile "${profileRef}" contains a threshold rule with missing or invalid metricId.`
        );
        continue;
      }

      if (typeof rule.majorThreshold !== "number" || !Number.isFinite(rule.majorThreshold)) {
        missingEvidenceErrors.push(
          `Governed rule for metric "${rule.metricId}" has non-finite or invalid majorThreshold.`
        );
        continue;
      }

      if (
        rule.minorThreshold !== undefined &&
        (typeof rule.minorThreshold !== "number" || !Number.isFinite(rule.minorThreshold))
      ) {
        missingEvidenceErrors.push(
          `Governed rule for metric "${rule.metricId}" has non-finite or invalid minorThreshold.`
        );
        continue;
      }

      const validDirections: MetricComparisonDirection[] = [
        "GREATER_THAN",
        "GREATER_THAN_OR_EQUAL",
        "LESS_THAN",
        "LESS_THAN_OR_EQUAL",
      ];
      if (!rule.comparisonDirection || !validDirections.includes(rule.comparisonDirection)) {
        missingEvidenceErrors.push(
          `Governed rule for metric "${rule.metricId}" lacks explicit governed comparisonDirection (got "${rule.comparisonDirection}"). Zero comparison defaults are permitted.`
        );
        continue;
      }

      if (
        rule.minSampleSize !== undefined &&
        (typeof rule.minSampleSize !== "number" ||
          !Number.isFinite(rule.minSampleSize) ||
          rule.minSampleSize < 0)
      ) {
        missingEvidenceErrors.push(
          `Governed rule for metric "${rule.metricId}" has invalid minSampleSize: must be a non-negative finite number.`
        );
        continue;
      }

      const obs = obsByMetric.get(rule.metricId);

      // Fails closed if governed rule requires a metric not supplied in sample
      if (!obs) {
        missingEvidenceErrors.push(
          `Metric "${rule.metricId}" required by profile "${profileRef}" is absent from sample.`
        );
        continue;
      }

      // Validate minimum sample size if specified by policy
      if (
        rule.minSampleSize !== undefined &&
        rule.minSampleSize > 0 &&
        (obs.sampleSize === undefined || obs.sampleSize < rule.minSampleSize)
      ) {
        missingEvidenceErrors.push(
          `Metric "${rule.metricId}" sample size (${obs.sampleSize ?? 0}) is below required minimum (${rule.minSampleSize}).`
        );
        continue;
      }

      // Evaluate Major Threshold Breach (using explicit governed comparison direction)
      const isMajor = this.compareMetric(
        obs.value,
        rule.majorThreshold,
        rule.comparisonDirection
      );

      if (isMajor) {
        breachedRules.push({
          metricId: rule.metricId,
          observedValue: obs.value,
          thresholdValue: rule.majorThreshold,
          breachSeverity: "MAJOR_DEGRADATION",
          ruleDescription: rule.description,
        });
        continue;
      }

      // Evaluate Minor / Warning Threshold Breach (using explicit governed comparison direction)
      if (rule.minorThreshold !== undefined) {
        const isMinor = this.compareMetric(
          obs.value,
          rule.minorThreshold,
          rule.comparisonDirection
        );

        if (isMinor) {
          breachedRules.push({
            metricId: rule.metricId,
            observedValue: obs.value,
            thresholdValue: rule.minorThreshold,
            breachSeverity: "MINOR_ANOMALY",
            ruleDescription: rule.description,
          });
        }
      }
    }

    return { evaluatedMetrics, breachedRules, missingEvidenceErrors };
  }

  private compareMetric(
    value: number,
    threshold: number,
    direction: MetricComparisonDirection
  ): boolean {
    switch (direction) {
      case "GREATER_THAN_OR_EQUAL":
        return value >= threshold;
      case "GREATER_THAN":
        return value > threshold;
      case "LESS_THAN_OR_EQUAL":
        return value <= threshold;
      case "LESS_THAN":
        return value < threshold;
    }
  }

  private updateStreamContinuityState(sample: TelemetrySample, receivedAtMs: number): void {
    this.streamState.lastSampleTimestamp = sample.timestamp;
    this.streamState.lastSampleReceivedAtMs = receivedAtMs;
    this.streamState.activeDecisionId = sample.decisionId;
    this.streamState.activeVersionBindingId = sample.versionBindingId;
    this.streamState.activeScope = [...sample.scope];
    // Reset local disruption episode state so that a future stream loss becomes a fresh episode.
    // Does NOT resume live Canary routing or alter WP-24 governance state.
    this.streamState.currentDisruptionEpisode = undefined;
  }


  private async handleMinorAnomalyActions(
    evaluationResult: TelemetryEvaluationResult,
    breachedRules: RuleBreachEvaluation[],
    sample: TelemetrySample
  ): Promise<void> {
    const eventId = sample.eventId ?? `warn_${sample.decisionId}_${Date.now()}`;
    const emittedTimestamp = this.clock();

    // 1. Emit typed warning event to listener
    const warningEvent: TelemetryWarningEvent = deepFreeze({
      eventId,
      decisionId: sample.decisionId,
      versionBindingId: sample.versionBindingId,
      scope: Object.freeze([...sample.scope]),
      sampleTimestamp: sample.timestamp,
      emittedTimestamp,
      breachedRules: Object.freeze(breachedRules.map((r) => defensiveClone(r))),
      metrics: Object.freeze(sample.observations.map((o) => defensiveClone(o))),
      message: `Minor telemetry anomaly detected across ${breachedRules.length} metric(s).`,
    });

    if (this.onWarning) {
      try {
        await this.onWarning(warningEvent);
      } catch {
        // Warning callback failure must not mask evaluation result
      }
    }

    // 2. Dispatch operations alert if listener configured
    if (this.onOperationsAlert) {
      const alert: TelemetryOperationsAlert = deepFreeze({
        alertId: `alert_${eventId}`,
        decisionId: sample.decisionId,
        versionBindingId: sample.versionBindingId,
        scope: Object.freeze([...sample.scope]),
        timestamp: emittedTimestamp,
        severity: "MINOR_ANOMALY",
        summary: `Telemetry warning in scope [${sample.scope.join(", ")}]: ${breachedRules.map((b) => b.metricId).join(", ")}`,
        breachedRules: Object.freeze(breachedRules.map((r) => defensiveClone(r))),
      });

      try {
        await this.onOperationsAlert(alert);
      } catch {
        // Operations alert failure must not mask evaluation result
      }
    }

    // 3. Request semantic sampling frequency escalation via port if configured
    if (this.samplingControlPort) {
      for (const breach of breachedRules) {
        try {
          await this.samplingControlPort.requestSamplingEscalation({
            decisionId: sample.decisionId,
            scope: sample.scope,
            metricId: breach.metricId,
            observedValue: breach.observedValue,
            rationale: `Minor anomaly threshold exceeded (${breach.observedValue} breached threshold ${breach.thresholdValue}).`,
            requestedAt: emittedTimestamp,
          });
        } catch {
          // Sampling escalation failure must not mask evaluation result
        }
      }
    }
  }

  private parseTimestampToEpoch(isoTimestamp: string, fieldName: string): number {
    const parsed = Date.parse(isoTimestamp);
    if (Number.isNaN(parsed)) {
      throw new InvalidTelemetrySampleError(fieldName, `Timestamp "${isoTimestamp}" is not a valid ISO 8601 date.`);
    }
    return parsed;
  }
}
