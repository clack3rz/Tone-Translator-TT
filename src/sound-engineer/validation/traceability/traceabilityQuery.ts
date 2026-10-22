// src/sound-engineer/validation/traceability/traceabilityQuery.ts
// WP-29 Stage 2 Slice 1F: Audit Trail Query & Export Utility
// Read-only in-memory query service for factual WP-29 audit reports and provenance.

import { deepFreeze } from "../../contracts/immutability";
import { RunTrace } from "../../trace/runTrace";
import { UpstreamGovernanceState } from "../readiness/productionReadinessTypes";
import {
  AuditEvidenceContext,
  OrphanedMeasurementSummary,
  ParameterProvenanceSummary,
  PrincipleAuditResult,
  StageVerificationEntry,
  TRACEABILITY_FINDING_CATEGORIES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_TYPES,
  TraceabilityAuditReport,
  TraceabilityAuditVerdict,
  TraceabilityFinding,
  TraceabilityFindingCategory,
  TraceabilityFindingSeverity,
  TraceabilityFindingType,
  PARAMETER_PROVENANCE_LEVELS,
  formatParameterKey,
  ParameterIdentity,
  ParameterProvenanceCapabilityLevel,
  ParameterProvenanceDecisionContext,
  ParameterProvenanceEntry,
  ParameterProvenanceSemanticContext,
  ParameterProvenanceTranslationContext,
} from "./traceabilityTypes";
import {
  ParameterProvenanceIndex,
} from "./parameterProvenance";

/**
 * Implementation-local query disposition states.
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * These are NOT global governance or lifecycle statuses. They are local query results.
 */
export const TRACEABILITY_QUERY_STATUSES = {
  FOUND: "FOUND",
  NOT_FOUND: "NOT_FOUND",
  AMBIGUOUS: "AMBIGUOUS",
  NOT_VERIFIABLE: "NOT_VERIFIABLE",
  UNSUPPORTED_CAPABILITY: "UNSUPPORTED_CAPABILITY",
} as const;

export type TraceabilityQueryStatus =
  (typeof TRACEABILITY_QUERY_STATUSES)[keyof typeof TRACEABILITY_QUERY_STATUSES];

/**
 * Filter criteria for finding search.
 */
export interface TraceabilityFindingFilter {
  readonly type?: TraceabilityFindingType;
  readonly category?: TraceabilityFindingCategory;
  readonly code?: string;
  readonly severity?: TraceabilityFindingSeverity;
  readonly principleNumber?: number;
  readonly checkpointId?: string;
  readonly recordId?: string;
}

/**
 * Input query specification for parameter provenance.
 */
export interface ParameterProvenanceQuery {
  readonly stageId?: string;
  readonly targetDeviceId?: string;
  readonly parameterName?: string;
  readonly parameterKey?: string;
  readonly requestedLevel?: ParameterProvenanceCapabilityLevel | number | string;
}

/**
 * Detailed factual rationale and source provenance for a parameter.
 */
export interface ParameterRationaleDetails {
  readonly parameterIdentity: ParameterIdentity;
  readonly parameterKey: string;
  readonly translatedValue: unknown;
  readonly provenanceLevel: ParameterProvenanceCapabilityLevel;
  readonly isAmbiguous: boolean;
  readonly translationItem?: ParameterProvenanceTranslationContext;
  readonly translationRationale?: string;
  readonly semanticStage?: ParameterProvenanceSemanticContext;
  readonly stageDesignIntent?: string;
  readonly decisionRecord?: ParameterProvenanceDecisionContext;
  readonly decisionRationale?: string;
  readonly evidenceReferenceArtifactId?: string;
}

/**
 * Factual result of querying parameter provenance.
 */
export interface ParameterProvenanceQueryResult {
  readonly status: TraceabilityQueryStatus;
  readonly queryKey?: string;
  readonly singleMatch?: ParameterRationaleDetails;
  readonly collidingMatches?: readonly ParameterRationaleDetails[];
  readonly limitationMessage?: string;
  readonly supportedMaxLevel: ParameterProvenanceCapabilityLevel;
}

/**
 * Validation lineage query result.
 */
export interface ValidationLineageQueryResult {
  readonly evidenceContext: AuditEvidenceContext;
  readonly orphanedMeasurementSummary: OrphanedMeasurementSummary;
  readonly orphanFindings: readonly TraceabilityFinding[];
  readonly unverifiedLineageFindings: readonly TraceabilityFinding[];
  readonly orphanCount: number;
  readonly unverifiedCount: number;
  readonly resolvedCount: number;
  readonly isLineageIntact: boolean;
}

/**
 * Trace identity query result.
 */
export interface TraceIdentityQueryResult {
  readonly traceId: string;
  readonly runId: string;
  readonly verdict: TraceabilityAuditVerdict;
  readonly allAuditableInvariantsPassed: boolean;
  readonly evidenceContext: AuditEvidenceContext;
  readonly timing?: {
    readonly startedAt: string;
    readonly completedAt: string;
    readonly durationMs: number;
  };
}

/**
 * Context for initializing TraceabilityQueryEngine.
 */
export interface TraceabilityQueryEngineOptions {
  readonly report: TraceabilityAuditReport;
  readonly parameterIndex?: ParameterProvenanceIndex;
  readonly runTrace?: RunTrace;
  readonly upstreamGovernanceState?: UpstreamGovernanceState;
}

/**
 * Read-only in-memory query service for inspecting factual WP-29 audit trail records.
 */
export class TraceabilityQueryEngine {
  private readonly report: TraceabilityAuditReport;
  private readonly parameterIndex?: ParameterProvenanceIndex;
  private readonly upstreamGovernanceState?: UpstreamGovernanceState;

  constructor(options: TraceabilityQueryEngineOptions) {
    if (!options || !options.report) {
      throw new Error("TraceabilityQueryEngine requires a valid TraceabilityAuditReport.");
    }
    this.report = options.report;
    this.upstreamGovernanceState = options.upstreamGovernanceState;

    if (options.parameterIndex) {
      this.parameterIndex = options.parameterIndex;
    } else if (options.runTrace) {
      this.parameterIndex = ParameterProvenanceIndex.fromTrace(options.runTrace);
    }
  }

  /**
   * Returns trace identity, verdict, and evidence integration context.
   */
  public getTraceIdentity(): TraceIdentityQueryResult {
    return deepFreeze({
      traceId: this.report.traceId,
      runId: this.report.runId,
      verdict: this.report.verdict,
      allAuditableInvariantsPassed: this.report.allAuditableInvariantsPassed,
      evidenceContext: this.report.evidenceContext,
      timing: this.report.timing,
    });
  }

  /**
   * Returns all 14 reasoning lifecycle stage verification entries deterministically ordered (1–14).
   */
  public getLifecycleStages(): readonly StageVerificationEntry[] {
    const stages = [...this.report.lifecycleCoverage].sort(
      (a, b) => a.stageNumber - b.stageNumber
    );
    return deepFreeze(stages);
  }

  /**
   * Returns lifecycle verification for a specific stage number (1–14).
   */
  public getLifecycleStage(stageNumber: number): StageVerificationEntry | undefined {
    const stage = this.report.lifecycleCoverage.find((s) => s.stageNumber === stageNumber);
    return stage ? deepFreeze({ ...stage }) : undefined;
  }

  /**
   * Returns all 21 principle audit results deterministically ordered (1–21).
   */
  public getPrincipleResults(): readonly PrincipleAuditResult[] {
    const results = [...this.report.principleResults].sort(
      (a, b) => a.principleNumber - b.principleNumber
    );
    return deepFreeze(results);
  }

  /**
   * Returns principle audit result for a specific principle number (1–21).
   */
  public getPrincipleResult(principleNumber: number): PrincipleAuditResult | undefined {
    const result = this.report.principleResults.find((p) => p.principleNumber === principleNumber);
    return result ? deepFreeze({ ...result }) : undefined;
  }

  /**
   * Searches findings according to optional filters.
   */
  public findFindings(filter?: TraceabilityFindingFilter): readonly TraceabilityFinding[] {
    let findings = [...this.report.findings];

    if (filter) {
      if (filter.type) {
        findings = findings.filter((f) => f.type === filter.type);
      }
      if (filter.category) {
        findings = findings.filter((f) => f.category === filter.category);
      }
      if (filter.code) {
        findings = findings.filter((f) => f.code === filter.code);
      }
      if (filter.severity) {
        findings = findings.filter((f) => f.severity === filter.severity);
      }
      if (filter.principleNumber !== undefined) {
        findings = findings.filter((f) => f.principleNumber === filter.principleNumber);
      }
      if (filter.checkpointId) {
        findings = findings.filter((f) => f.checkpointId === filter.checkpointId);
      }
      if (filter.recordId) {
        findings = findings.filter(
          (f) =>
            (f as any).recordId === filter.recordId ||
            (f as any).executionId === filter.recordId
        );
      }
    }

    // Deterministic sorting by code, checkpointId, then message
    findings.sort((a, b) => {
      if (a.code !== b.code) return a.code.localeCompare(b.code);
      const cpA = a.checkpointId ?? "";
      const cpB = b.checkpointId ?? "";
      if (cpA !== cpB) return cpA.localeCompare(cpB);
      return a.message.localeCompare(b.message);
    });

    return deepFreeze(findings);
  }

  /**
   * Returns validation lineage status and orphaned measurement metrics.
   */
  public getValidationLineage(): ValidationLineageQueryResult {
    const orphanFindings = this.report.findings.filter(
      (f) =>
        f.category === TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT &&
        f.type === TRACEABILITY_FINDING_TYPES.VIOLATION
    );
    const unverifiedFindings = this.report.findings.filter(
      (f) =>
        f.category === TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT &&
        f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE
    );

    const isLineageIntact =
      (this.report.orphanedMeasurementSummary?.orphanedCount ?? 0) === 0 &&
      (this.report.orphanedMeasurementSummary?.unverifiedMeasurements ?? 0) === 0 &&
      orphanFindings.length === 0 &&
      unverifiedFindings.length === 0;

    return deepFreeze({
      evidenceContext: this.report.evidenceContext,
      orphanedMeasurementSummary: this.report.orphanedMeasurementSummary,
      orphanFindings,
      unverifiedLineageFindings: unverifiedFindings,
      orphanCount: this.report.orphanedMeasurementSummary?.orphanedCount ?? 0,
      unverifiedCount: this.report.orphanedMeasurementSummary?.unverifiedMeasurements ?? 0,
      resolvedCount: this.report.orphanedMeasurementSummary?.resolvedMeasurements ?? 0,
      isLineageIntact,
    });
  }

  /**
   * Queries factual parameter provenance behind preset parameters.
   *
   * Traces:
   * Parameter -> PlatformTranslationItem -> SemanticProcessingStage -> EngineeringDecisionRecord
   *
   * If caller requests Level 4 (EngineeringDecisionItem) or Level 5 (causal diagnosis/observation),
   * returns UNSUPPORTED_CAPABILITY limitation rather than guessing.
   */
  public queryParameterProvenance(
    query: ParameterProvenanceQuery
  ): ParameterProvenanceQueryResult {
    // 1. Check capability request
    const requestedLevel = query.requestedLevel;
    if (
      requestedLevel === 4 ||
      requestedLevel === 5 ||
      requestedLevel === PARAMETER_PROVENANCE_LEVELS.LEVEL_4_EXACT_DECISION_TRACE ||
      requestedLevel === PARAMETER_PROVENANCE_LEVELS.LEVEL_5_EXACT_CAUSAL_TRACE ||
      requestedLevel === "LEVEL_4_DECISION_ITEM" ||
      requestedLevel === "LEVEL_5_CAUSAL_DIAGNOSIS"
    ) {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.UNSUPPORTED_CAPABILITY,
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        limitationMessage:
          "Exact EngineeringDecisionItem (Level 4) and Causal Diagnosis/Observation (Level 5) parameter provenance are unsupported by canonical record schemas. Maximum supported capability is Level 3 (Decision Record Trace).",
      });
    }

    // 2. Format composite key
    let key: string;
    if (query.parameterKey) {
      key = query.parameterKey.trim();
    } else if (query.stageId && query.targetDeviceId && query.parameterName) {
      key = formatParameterKey({
        stageId: query.stageId,
        targetDeviceId: query.targetDeviceId,
        parameterName: query.parameterName,
      });
    } else {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.NOT_FOUND,
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        limitationMessage:
          "Invalid query: must specify either parameterKey or (stageId, targetDeviceId, parameterName).",
      });
    }

    // 3. Check index availability
    if (!this.parameterIndex) {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.NOT_VERIFIABLE,
        queryKey: key,
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        limitationMessage:
          "Parameter provenance index was not supplied to query engine context.",
      });
    }

    // Trace isolation: index traceId must match report traceId if present
    const indexTraceId = (this.parameterIndex as any).traceId;
    if (indexTraceId && indexTraceId !== this.report.traceId) {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.NOT_VERIFIABLE,
        queryKey: key,
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        limitationMessage: `Trace isolation violation: parameter index traceId "${indexTraceId}" does not match report traceId "${this.report.traceId}".`,
      });
    }

    // 4. Lookup in index
    const entries = this.parameterIndex.getAll(key);
    if (!entries || entries.length === 0) {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.NOT_FOUND,
        queryKey: key,
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
      });
    }

    const mapEntryToDetails = (entry: ParameterProvenanceEntry): ParameterRationaleDetails => ({
      parameterIdentity: entry.identity,
      parameterKey: entry.parameterKey,
      translatedValue: entry.translatedValue,
      provenanceLevel: entry.provenanceLevel,
      isAmbiguous: entry.isAmbiguous,
      translationItem: entry.translationItem,
      translationRationale: entry.translationItem?.rationale,
      semanticStage: entry.semanticStage,
      stageDesignIntent: entry.semanticStage?.designIntent,
      decisionRecord: entry.decisionRecord,
      decisionRationale: entry.decisionRecord?.overallObjective ?? (entry.decisionRecord as any)?.rationale,
      evidenceReferenceArtifactId: entry.decisionRecord?.evidenceReference?.artifactId,
    });

    if (entries.length === 1 && !entries[0].isAmbiguous) {
      return deepFreeze({
        status: TRACEABILITY_QUERY_STATUSES.FOUND,
        queryKey: key,
        singleMatch: mapEntryToDetails(entries[0]),
        supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
      });
    }

    // Ambiguous key collision: return all colliding entries preserving ambiguity
    return deepFreeze({
      status: TRACEABILITY_QUERY_STATUSES.AMBIGUOUS,
      queryKey: key,
      collidingMatches: entries.map(mapEntryToDetails),
      supportedMaxLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
      limitationMessage: `Ambiguous parameter key collision: ${entries.length} distinct translation items collided on key "${key}". All colliding entries are preserved.`,
    });
  }

  /**
   * Returns snapshot of supplied UpstreamGovernanceState if available.
   */
  public getUpstreamGovernanceSnapshot(): UpstreamGovernanceState | undefined {
    return this.upstreamGovernanceState ? deepFreeze({ ...this.upstreamGovernanceState }) : undefined;
  }
}
