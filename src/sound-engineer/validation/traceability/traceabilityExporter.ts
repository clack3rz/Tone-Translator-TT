// src/sound-engineer/validation/traceability/traceabilityExporter.ts
// WP-29 Stage 2 Slice 1F: Audit Trail Query & Export Utility
// Deterministic export serialization for factual WP-29 audit trail records.

import { deepFreeze } from "../../contracts/immutability";
import { canonicalizeJson } from "../schemas/integrity";
import { UpstreamGovernanceState } from "../readiness/productionReadinessTypes";
import {
  AuditEvidenceContext,
  OrphanedMeasurementSummary,
  ParameterProvenanceSummary,
  PrincipleAuditResult,
  StageVerificationEntry,
  TraceabilityAuditReport,
  TraceabilityAuditVerdict,
  TraceabilityFinding,
  PARAMETER_PROVENANCE_LEVELS,
  ParameterProvenanceEntry,
} from "./traceabilityTypes";
import {
  ParameterProvenanceIndex,
} from "./parameterProvenance";

/**
 * Version identifier for WP-29 Traceability Export DTO format.
 * NOTE: This is local to the export utility DTO and must NOT be confused with
 * RunTrace contractVersion or canonical validation record schemaVersion.
 */
export const WP29_TRACEABILITY_EXPORT_VERSION = "wp29-traceability-export-v1";

/**
 * Factual capability limitation entry.
 */
export interface TraceabilityCapabilityLimitation {
  readonly capability: string;
  readonly supportedLevel: string;
  readonly limitationDescription: string;
}

/**
 * Canonical list of frozen capability limitations inherent to the current WP-29 architecture.
 */
export const FROZEN_CAPABILITY_LIMITATIONS: readonly TraceabilityCapabilityLimitation[] = Object.freeze([
  Object.freeze({
    capability: "PARAMETER_PROVENANCE_FINE_GRAINED",
    supportedLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
    limitationDescription:
      "Exact EngineeringDecisionItem (Level 4) and Causal Diagnosis/Observation (Level 5) parameter provenance are unsupported by canonical records. Maximum supported level is Level 3 (Decision Record Trace).",
  }),
  Object.freeze({
    capability: "PRINCIPLE_18_ANTI_CIRCULARITY",
    supportedLevel: "EMPIRICAL_OUTCOME_RECEIPTS",
    limitationDescription:
      "Empirical validation receipts prove real-world acoustic outcome, but Principle 18 non-circular justification cannot be independently verified from canonical records lacking a prediction discriminator.",
  }),
  Object.freeze({
    capability: "LIFECYCLE_STAGE_06_REPRESENTATION",
    supportedLevel: "NOT_REPRESENTED",
    limitationDescription:
      "Stage 06 (DISCRIMINATING_EVIDENCE_CHECK) is not represented as an explicit runtime envelope in current execution contracts.",
  }),
]);

/**
 * Structured export DTO representing the factual WP-29 audit trail.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. This is a read-only serialization DTO, NOT a canonical validation record (not Record 23).
 * 2. It does NOT claim cryptographic sealing, signatures, or ledger-bound integrity.
 * 3. It exports observable engineering provenance and explicit recorded rationales only.
 *    Hidden reasoning, model chain-of-thought, internal deliberation, or undocumented inferences
 *    are STRICTLY EXCLUDED.
 * 4. Belongs to exactly one trace context (traceId, runId).
 */
export interface TraceabilityAuditExportDto {
  readonly exportVersion: string;
  readonly exportedAt?: string;
  readonly traceId: string;
  readonly runId: string;
  readonly verdict: TraceabilityAuditVerdict;
  readonly allAuditableInvariantsPassed: boolean;
  readonly lifecycleCoverage: readonly StageVerificationEntry[];
  readonly principleResults: readonly PrincipleAuditResult[];
  readonly findings: readonly TraceabilityFinding[];
  readonly evidenceContext: AuditEvidenceContext;
  readonly orphanedMeasurementSummary: OrphanedMeasurementSummary;
  readonly parameterProvenanceSummary?: ParameterProvenanceSummary;
  readonly parameterProvenanceEntries?: readonly ParameterProvenanceEntry[];
  readonly upstreamGovernanceSnapshot?: UpstreamGovernanceState;
  readonly capabilityLimitations: readonly TraceabilityCapabilityLimitation[];
}

/**
 * Context parameters for generating an audit export.
 */
export interface TraceabilityExportContext {
  readonly report: TraceabilityAuditReport;
  readonly parameterIndex?: ParameterProvenanceIndex;
  readonly upstreamGovernanceState?: UpstreamGovernanceState;
  readonly exportedAt?: string;
}

/**
 * Produces a deeply immutable, deterministically sorted TraceabilityAuditExportDto.
 *
 * Ordering Invariants:
 * - Lifecycle stages: sorted 1 to 14
 * - Principle results: sorted 1 to 21
 * - Findings: sorted by code, then checkpointId, then message
 * - Parameter entries: sorted by composite key, then by translatedValue string representation
 */
export function exportTraceabilityAuditDto(
  context: TraceabilityExportContext
): TraceabilityAuditExportDto {
  if (!context || !context.report) {
    throw new Error("exportTraceabilityAuditDto requires a valid TraceabilityAuditReport.");
  }

  const { report, parameterIndex, upstreamGovernanceState, exportedAt } = context;

  // 1. Trace isolation verification
  if (parameterIndex) {
    const pTraceId = (parameterIndex as any).traceId;
    if (pTraceId && pTraceId !== report.traceId) {
      throw new Error(
        `Trace isolation violation: parameterIndex traceId "${pTraceId}" does not match report traceId "${report.traceId}".`
      );
    }
  }

  // 2. Deterministic lifecycle ordering (stages 1–14)
  const orderedLifecycle = [...report.lifecycleCoverage].sort(
    (a, b) => a.stageNumber - b.stageNumber
  );

  // 3. Deterministic principle results ordering (principles 1–21)
  const orderedPrinciples = [...report.principleResults].sort(
    (a, b) => a.principleNumber - b.principleNumber
  );

  // 4. Deterministic findings ordering
  const orderedFindings = [...report.findings].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    const cpA = a.checkpointId ?? "";
    const cpB = b.checkpointId ?? "";
    if (cpA !== cpB) return cpA.localeCompare(cpB);
    return a.message.localeCompare(b.message);
  });

  // 5. Deterministic parameter entries ordering (preserving all colliding entries in an array)
  let orderedParamEntries: ParameterProvenanceEntry[] | undefined;
  if (parameterIndex) {
    const allEntries = parameterIndex.getAllEntries();
    orderedParamEntries = [...allEntries].sort((a, b) => {
      if (a.parameterKey !== b.parameterKey) {
        return a.parameterKey.localeCompare(b.parameterKey);
      }
      const valA = canonicalizeJson(a.translatedValue);
      const valB = canonicalizeJson(b.translatedValue);
      if (valA !== valB) return valA.localeCompare(valB);
      const roleA = a.translationItem?.semanticRole ?? "";
      const roleB = b.translationItem?.semanticRole ?? "";
      if (roleA !== roleB) return roleA.localeCompare(roleB);
      const ratA = a.translationItem?.rationale ?? "";
      const ratB = b.translationItem?.rationale ?? "";
      if (ratA !== ratB) return ratA.localeCompare(ratB);
      const stgA = a.identity.stageId;
      const stgB = b.identity.stageId;
      return stgA.localeCompare(stgB);
    });
  }

  const exportDto: TraceabilityAuditExportDto = {
    exportVersion: WP29_TRACEABILITY_EXPORT_VERSION,
    ...(exportedAt ? { exportedAt } : {}),
    traceId: report.traceId,
    runId: report.runId,
    verdict: report.verdict,
    allAuditableInvariantsPassed: report.allAuditableInvariantsPassed,
    lifecycleCoverage: Object.freeze(orderedLifecycle),
    principleResults: Object.freeze(orderedPrinciples),
    findings: Object.freeze(orderedFindings),
    evidenceContext: report.evidenceContext,
    orphanedMeasurementSummary: report.orphanedMeasurementSummary,
    ...(report.parameterProvenanceSummary
      ? { parameterProvenanceSummary: report.parameterProvenanceSummary }
      : {}),
    ...(orderedParamEntries ? { parameterProvenanceEntries: Object.freeze(orderedParamEntries) } : {}),
    ...(upstreamGovernanceState ? { upstreamGovernanceSnapshot: upstreamGovernanceState } : {}),
    capabilityLimitations: FROZEN_CAPABILITY_LIMITATIONS,
  };

  return deepFreeze(exportDto);
}

/**
 * Serializes a TraceabilityExportContext into a canonical, deterministic JSON string.
 *
 * Uses repository-canonical canonicalizeJson ensuring identical structural and key ordering.
 */
export function exportTraceabilityAuditJson(
  context: TraceabilityExportContext
): string {
  const dto = exportTraceabilityAuditDto(context);
  return canonicalizeJson(dto);
}
