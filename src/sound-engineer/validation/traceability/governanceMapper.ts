// src/sound-engineer/validation/traceability/governanceMapper.ts
// WP-29 Stage 2 Slice 1E: Pre-Gate-8 Governance Mapping & Blocker-04 Integration
// Implementation-local mapping layer consuming factual WP-29 audit outputs
// to produce standard UpstreamGovernanceState for pre-Gate-8 readiness synthesis.

import { deepFreeze } from "../../contracts/immutability";
import { UpstreamGovernanceState } from "../readiness/productionReadinessTypes";
import {
  PRINCIPLE_AUDIT_STATES,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_CATEGORIES,
  TRACEABILITY_FINDING_TYPES,
  TraceabilityAuditReport,
  TraceabilityFinding,
} from "./traceabilityTypes";

/**
 * Options to supply upstream context that is out-of-scope or delegated
 * from the factual WP-29 runtime audit report.
 */
export interface UpstreamGovernanceMappingOptions {
  /**
   * Overrides or establishes the count of completed reasoning lifecycle stages.
   * If omitted, derived from report.lifecycleCoverage (counting stages with presentInTrace === true).
   */
  readonly reasoningLifecycleStagesCompleted?: number;

  /**
   * Explicit status of candidate lesson quarantine passed through from Phase 1C.5e/f ownership.
   * If undefined, candidate_lesson_quarantined will be undefined (or preserved from pass-through state).
   */
  readonly candidateLessonQuarantined?: boolean;

  /**
   * Prior upstream governance state to pass through non-traceability fields
   * (e.g. external candidate_lesson_quarantined).
   */
  readonly priorGovernanceState?: UpstreamGovernanceState;

  /**
   * Additional upstream violations from phases 1C.5a through 1C.5g not captured in RunTrace.
   */
  readonly additionalUpstreamViolations?: readonly string[];

  /**
   * Explicit causal explainability verified status override, if supplied by upstream causal engine.
   */
  readonly causalExplainabilityVerified?: boolean;
}

/**
 * Known finding codes that genuinely establish ungrounded reasoning,
 * fabricated causal diagnosis, or hallucinated decisions.
 *
 * NOTE: P7 (context/evidence conflation) is a structural epistemic separation failure.
 * P12 and P15 are layer/timestamp sequencing inversions.
 * None of P7, P12, or P15 constitute ungrounded or fabricated reasoning.
 */
const UNGROUNDED_REASONING_FINDING_CODES = new Set<string>([
  "ERR_UNGROUNDED_REASONING",
  "ERR_FABRICATED_INTERVENTION",
  "ERR_FABRICATED_CAUSAL_DIAGNOSIS",
  "ERR_HALLUCINATED_DECISION",
]);

/**
 * Implementation-local predicate determining whether a factual finding
 * genuinely represents a defect or gap in provenance / lineage integrity.
 *
 * PROVENANCE INTEGRITY includes:
 * - RunTrace envelope and checkpoint structural lineage
 * - Intake identity and contract versions
 * - Sequence index monotonicity and causal ordering
 * - Checkpoint runId / envelope integrity
 * - Input/output artifact lineage chains (Record 1 / Record 6 / Record 12 / etc.)
 * - Validation execution trace resolution (Record 9 trace_ref)
 * - Measurement parent linkage (Records 10 and 11 to Record 9)
 * - Parameter provenance Level 1-3 translation and decision linkage
 *
 * EXCLUDED (NOT provenance-relevant):
 * - PRINCIPLE_GOVERNANCE findings: Evaluate reasoning quality, causal discipline,
 *   epistemic separation / conflation (P7), or sequencing inversions (P12, P15),
 *   NOT whether provenance / lineage is intact.
 * - Non-structural informational findings (e.g. INFO_SCOPE_COVERAGE_UNVERIFIABLE).
 */
export function isProvenanceRelevantFinding(finding: TraceabilityFinding): boolean {
  if (!finding) return false;

  // 1. PRINCIPLE_GOVERNANCE evaluations are strictly excluded.
  // P1/P12/P15 sequencing/timestamp inversions and P7 conflation do not break provenance.
  if (finding.category === TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE) {
    return false;
  }

  // 2. Informational observations that do not impair trace completeness or lineage
  if (finding.code === "INFO_SCOPE_COVERAGE_UNVERIFIABLE") {
    return false;
  }

  // 3. Early termination findings indicate execution halted early (FAILED/CANCELLED),
  // leaving downstream lineage incomplete / unverifiable.
  if (finding.code.startsWith("INFO_EARLY_TERMINATION_")) {
    return true;
  }

  // 4. Lineage, Provenance, Orphaned Measurement, and Parameter Provenance categories
  if (
    finding.category === TRACEABILITY_FINDING_CATEGORIES.LINEAGE ||
    finding.category === TRACEABILITY_FINDING_CATEGORIES.PROVENANCE ||
    finding.category === TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT ||
    finding.category === TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE
  ) {
    return true;
  }

  // 5. Checkpoint and envelope integrity structure
  if (finding.category === TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE) {
    return true;
  }

  // 6. Trace structure (monotonic sequence, checkpoint presence, envelope continuity)
  if (finding.category === TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE) {
    return true;
  }

  return false;
}

/**
 * Maps a factual TraceabilityAuditReport into an UpstreamGovernanceState
 * consumable by the ProductionReadinessSynthesizer and hard blocker evaluator.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION (WP-29 Slice 1E):
 * 1. Read-only and non-authoritative: Does NOT approve, reject, or suspend Gate 8.
 * 2. Does NOT mutate Gate-8 state machine or Record 22.
 * 3. Does NOT alter, evaluate, or overwrite version-binding integrity (owned by WP-05 / VersionBindingService).
 * 4. Factual provenance_intact: Derived strictly from provenance/lineage facts:
 *    - No trace structure / envelope integrity violations or unverified envelopes
 *    - No orphaned measurements (Records 10/11)
 *    - No unresolvable or invalid Record 9 execution trace refs
 *    - Parameter provenance Level 3 complete with 0 unresolved and 0 ambiguous entries
 *    - Early-terminal trace (FAILED/CANCELLED) prevents provenance_intact
 *    - Unrelated principle limitations (such as P18 anti-circularity being NOT_VERIFIABLE)
 *      or principle violations (such as P12 timing or P15 sequencing) do NOT prevent provenance_intact
 *      if all provenance facts are intact.
 * 5. P18 Non-Circularity limitation preserved: P18 NOT_VERIFIABLE prevents principles_complied === true.
 * 6. ungrounded_reasoning_detected: Set ONLY when positive evidence specifically establishes
 *    ungrounded reasoning (ERR_UNGROUNDED_REASONING, etc.). Missing evidence or sequencing violations
 *    (P12, P15, P7) NEVER set this flag true.
 * 7. upstream_violations contains exact factual finding codes with VIOLATION type.
 *    NOT_VERIFIABLE and INFORMATIONAL findings are strictly excluded.
 * 8. causal_explainability_verified: Cannot be proven by WP-29 alone due to Level-3 ceiling
 *    (Level 4/5 causal tracing is unsupported); false unless explicitly supplied by upstream causal engine.
 * 9. candidate_lesson_quarantined: Pass-through preserved from options or prior state; not derived from findings.
 * 10. reasoning_lifecycle_stages_completed: Counts actual stages with presentInTrace === true from
 *     factual lifecycle representation (e.g. 13 if Stage 06 is unrepresented, or fewer if early-terminal).
 *
 * @param report The frozen, factual TraceabilityAuditReport emitted by TraceabilityAuditor.
 * @param options Optional context overrides for upstream delegated checks.
 * @returns An immutable, frozen UpstreamGovernanceState.
 */
export function toUpstreamGovernanceState(
  report: TraceabilityAuditReport,
  options?: UpstreamGovernanceMappingOptions
): UpstreamGovernanceState {
  if (!report) {
    throw new Error("toUpstreamGovernanceState requires a valid TraceabilityAuditReport.");
  }

  // 1. Extract factual VIOLATION findings for upstream_violations
  // Strictly excludes NOT_VERIFIABLE, INFORMATIONAL, and unsupported capability requests.
  const violationFindings = report.findings.filter(
    (f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION
  );

  const upstreamViolations: string[] = violationFindings.map((f) => f.code);

  if (options?.additionalUpstreamViolations && options.additionalUpstreamViolations.length > 0) {
    upstreamViolations.push(...options.additionalUpstreamViolations);
  }

  // 2. Factual determination of provenance_intact derived strictly from provenance facts:
  // Must NOT conflate unrelated principle limitations (such as P18 non-circularity NOT_VERIFIABLE)
  // or principle governance violations (such as P12 timing or P15 ordering) with broken provenance.
  //
  // Provenance is intact IF AND ONLY IF:
  // a) No provenance-specific VIOLATION findings (lineage, integrity structure, orphan measurements).
  // b) No provenance-specific NOT_VERIFIABLE findings (missing envelopes, unverified parameter stages, etc.).
  // c) Trace is completed (not early-terminal FAILED or CANCELLED).
  // d) Parameter provenance coverage:
  //    - If parameter provenance summary is present: unresolvedCount === 0 and ambiguousCount === 0.
  // e) Validation measurement lineage:
  //    - orphanedMeasurementSummary.orphanedMeasurements === 0
  //    - orphanedMeasurementSummary.unverifiedMeasurements === 0
  const hasProvenanceViolation = report.findings.some(
    (f) =>
      f.type === TRACEABILITY_FINDING_TYPES.VIOLATION &&
      isProvenanceRelevantFinding(f)
  );

  const hasProvenanceNotVerifiable = report.findings.some(
    (f) =>
      f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE &&
      isProvenanceRelevantFinding(f)
  );

  // Check orphaned measurements summary if present
  const hasOrphanIssues =
    (report.orphanedMeasurementSummary?.orphanedMeasurements ?? 0) > 0 ||
    (report.orphanedMeasurementSummary?.unverifiedMeasurements ?? 0) > 0 ||
    (report.orphanedMeasurementSummary?.orphanedCount ?? 0) > 0 ||
    (report.orphanedMeasurementSummary?.ruleB_UnresolvableTraceCount ?? 0) > 0;

  // Check parameter provenance summary if present
  const hasParamIssues =
    (report.parameterProvenanceSummary?.unresolvedEntriesCount ?? 0) > 0 ||
    (report.parameterProvenanceSummary?.ambiguousEntriesCount ?? 0) > 0;

  // Check if trace lifecycle indicates early termination
  const isEarlyTerminal = report.findings.some(
    (f) => f.code.startsWith("INFO_EARLY_TERMINATION_")
  );

  const isProvenanceIntact =
    !hasProvenanceViolation &&
    !hasProvenanceNotVerifiable &&
    !hasOrphanIssues &&
    !hasParamIssues &&
    !isEarlyTerminal;

  // 3. Factual detection of ungrounded reasoning:
  // Set ONLY when positive evidence specifically demonstrates ungrounded reasoning.
  // P7 (conflation) and P12/P15 (layer ordering) are NOT ungrounded reasoning.
  // Missing evidence / NOT_VERIFIABLE NEVER sets this true.
  const hasUngroundedFinding = report.findings.some(
    (f) =>
      f.type === TRACEABILITY_FINDING_TYPES.VIOLATION &&
      (UNGROUNDED_REASONING_FINDING_CODES.has(f.code) ||
        f.code === "ERR_UNGROUNDED_REASONING" ||
        f.code === "ERR_FABRICATED_INTERVENTION")
  );

  // 4. Principles compliance:
  // Truthfully map 21 Principles.
  // Principles are complied IF AND ONLY IF:
  // - Zero VIOLATION findings across all principles
  // - Zero NOT_VERIFIABLE findings across all principles
  // Because P18 currently remains NOT_VERIFIABLE due to canonical record limitations,
  // principles_complied MUST NOT be true if P18 (or any other principle) is NOT_VERIFIABLE.
  const hasPrincipleViolations =
    report.principleResults.some(
      (p) => p.state === PRINCIPLE_AUDIT_STATES.VIOLATION
    ) ||
    report.findings.some(
      (f) =>
        f.type === TRACEABILITY_FINDING_TYPES.VIOLATION &&
        (f.category === TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE ||
          f.principleNumber !== undefined)
    );

  const hasUnverifiedPrinciples = report.principleResults.some(
    (p) => p.state === PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE
  );

  const principlesComplied = !hasPrincipleViolations && !hasUnverifiedPrinciples;

  // 5. Causal explainability:
  // Maximum supported parameter provenance is LEVEL_3_DECISION_RECORD_TRACE.
  // WP-29 cannot independently prove Level 4 (exact decision item) or Level 5 (exact causal diagnosis/observation chain).
  // Therefore, WP-29 alone cannot verify full causal explainability; it is false unless explicitly supplied by upstream causal engine.
  const causalExplainabilityVerified = options?.causalExplainabilityVerified ?? false;

  // 6. Reasoning lifecycle stages completed:
  // Factual count of stages completed. If options provides an explicit count, use it.
  // Otherwise, count stages where presentInTrace === true in lifecycleCoverage.
  // (In current runtime contracts, Stage 06 is NOT_REPRESENTED, so even a complete run has at most 13 stages present).
  let stagesCompleted: number;
  if (options?.reasoningLifecycleStagesCompleted !== undefined) {
    stagesCompleted = options.reasoningLifecycleStagesCompleted;
  } else if (report.lifecycleCoverage && report.lifecycleCoverage.length > 0) {
    stagesCompleted = report.lifecycleCoverage.filter((s) => s.presentInTrace === true).length;
  } else {
    stagesCompleted = 0;
  }

  // 7. Candidate lesson quarantine:
  // Preserve Phase 1C.5e/f ownership. mapper does NOT derive this from findings.
  // Passed through from options or priorGovernanceState.
  const candidateLessonQuarantined =
    options?.candidateLessonQuarantined ??
    options?.priorGovernanceState?.candidate_lesson_quarantined;

  const governanceState: UpstreamGovernanceState = {
    reasoning_lifecycle_stages_completed: stagesCompleted,
    principles_complied: principlesComplied,
    causal_explainability_verified: causalExplainabilityVerified,
    provenance_intact: isProvenanceIntact,
    ungrounded_reasoning_detected: hasUngroundedFinding,
    ...(candidateLessonQuarantined !== undefined ? { candidate_lesson_quarantined: candidateLessonQuarantined } : {}),
    upstream_violations: Object.freeze([...upstreamViolations]),
  };

  return deepFreeze(governanceState);
}
