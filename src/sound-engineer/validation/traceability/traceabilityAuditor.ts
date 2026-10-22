// src/sound-engineer/validation/traceability/traceabilityAuditor.ts
// Core TraceabilityAuditor implementation for Phase 1C.5h WP-29:
// Comprehensive Audit Trail, Traceability & Reasoning Provenance.
// Bound to frozen specification v0.1j Section 32 & Table 19.

import { deepFreeze } from "../../contracts/immutability";
import { LayerIdentity, SOUND_ENGINEER_LAYERS } from "../../checkpoints/layerIdentity";
import { CHECKPOINT_STATUSES } from "../../checkpoints/checkpointStatus";
import { ARTIFACT_TYPES } from "../../checkpoints/artifactReference";
import {
  RunTrace,
  TraceCheckpointEntry,
  TRACE_LIFECYCLE_STATUSES,
  RUN_TRACE_CONTRACT_VERSION,
} from "../../trace/runTrace";
import {
  LifecycleStageMetadata,
  MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
  OrphanedMeasurementSummary,
  PARAMETER_PROVENANCE_LEVELS,
  PrincipleAuditResult,
  PRINCIPLE_AUDIT_STATES,
  PrincipleAuditState,
  RuntimeEnvelopeGroup,
  RUNTIME_ENVELOPE_GROUPS,
  STAGE_REPRESENTATION_STRENGTHS,
  StageVerificationEntry,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_CATEGORIES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_TYPES,
  TraceabilityAuditReport,
  TraceabilityAuditVerdict,
  TraceabilityFinding,
  ValidationAuditEvidence,
  AuditEvidenceContext,
  ParameterProvenanceSummary,
} from "./traceabilityTypes";
import { ParameterProvenanceIndex } from "./parameterProvenance";
import {
  getAllPrinciplesMetadata,
  PRINCIPLE_AUDIT_STRENGTHS,
} from "./principlesMetadata";
import {
  ValidationExecutionRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationCase,
  ValidationScopeRecord,
} from "../schemas/records";

/**
 * Factual metadata definitions for all 14 reasoning lifecycle stages.
 * Strictly implements the Stage Representation Strength model:
 *   - Stage 01 and Stage 12 remain EXACT.
 *   - Stages 04, 05, and 07 remain GROUPED inside ENGINEERING deliberation.
 *   - Stage 06 remains NOT_REPRESENTED in current runtime contracts.
 *   - Stage 11 is DERIVED (EngineeringDecisionRecord directly represented; PredictedOutcomeRecord not separately persisted).
 *   - Stages 02, 03, 08, 09, 10, 13, and 14 remain DERIVED.
 */
const LIFECYCLE_STAGES: readonly LifecycleStageMetadata[] = [
  {
    stageNumber: 1,
    stageName: "INTENT_INTAKE",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.EXACT,
    sourceLayer: SOUND_ENGINEER_LAYERS.INPUT,
    artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
    requiredForGate8Cutover: true,
    description: "Ingests raw user prompt, artistic goals, and musical preferences into immutable InputSnapshot artifact.",
  },
  {
    stageNumber: 2,
    stageName: "CASE_EVIDENCE_ASSESSMENT",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
    artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
    requiredForGate8Cutover: true,
    description: "Documents multi-modal audio references and capture lineage in EvidenceRecord.",
  },
  {
    stageNumber: 3,
    stageName: "OBSERVATION_FORMATION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
    artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
    requiredForGate8Cutover: true,
    description: "Pure descriptive acoustic phenomena across spectral, dynamic, and spatial domains.",
  },
  {
    stageNumber: 4,
    stageName: "HYPOTHESIS_GENERATION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Formulates candidate causal mechanisms grouped inside engineering deliberation.",
  },
  {
    stageNumber: 5,
    stageName: "HYPOTHESIS_EVALUATION_AND_COMPETITION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Evaluates competing causal models grouped inside engineering deliberation.",
  },
  {
    stageNumber: 6,
    stageName: "DISCRIMINATING_EVIDENCE_CHECK",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    requiredForGate8Cutover: false,
    description: "Actionable diagnostic test protocol; not represented as discrete runtime contract.",
  },
  {
    stageNumber: 7,
    stageName: "CAUSAL_DIAGNOSIS",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Bounded causal diagnosis grouped inside engineering decision record.",
  },
  {
    stageNumber: 8,
    stageName: "ENGINEERING_REQUIREMENT_FORMATION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Solution-neutral behavioral transformation derived from decision objective.",
  },
  {
    stageNumber: 9,
    stageName: "CANDIDATE_INTERVENTION_GENERATION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Technical pathways across signal loci derived from decision items.",
  },
  {
    stageNumber: 10,
    stageName: "CONSTRAINT_AND_TRADE_OFF_ANALYSIS",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "Constraint and trade-off evaluation derived from decision items.",
  },
  {
    stageNumber: 11,
    stageName: "ENGINEERING_DECISION_AND_PREDICTION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
    requiredForGate8Cutover: true,
    description: "EngineeringDecisionRecord is directly represented, but full decision + prediction concept is not represented as independently sealed discrete subrecords (PredictedOutcomeRecord is not separately persisted).",
  },
  {
    stageNumber: 12,
    stageName: "SEMANTIC_TONE_DESIGN_HANDOFF",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.EXACT,
    sourceLayer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
    artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
    requiredForGate8Cutover: true,
    description: "Platform-independent executable semantic tone design handoff.",
  },
  {
    stageNumber: 13,
    stageName: "OUTCOME_EVIDENCE_INGESTION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.VALIDATION,
    artifactType: ARTIFACT_TYPES.VALIDATION_REPORT,
    requiredForGate8Cutover: true,
    description: "Post-execution empirical validation measurements and outcome evidence.",
  },
  {
    stageNumber: 14,
    stageName: "ENGINEERING_REVIEW_AND_ITERATION",
    representationStrength: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    sourceLayer: SOUND_ENGINEER_LAYERS.VALIDATION,
    artifactType: ARTIFACT_TYPES.VALIDATION_REPORT,
    requiredForGate8Cutover: true,
    description: "Retrospective review diagnostics and governed lessons derived from validation.",
  },
];

export const FROZEN_LIFECYCLE_STAGES_METADATA: readonly LifecycleStageMetadata[] =
  deepFreeze(LIFECYCLE_STAGES);

const STAGES_BY_NUMBER = new Map<number, LifecycleStageMetadata>(
  FROZEN_LIFECYCLE_STAGES_METADATA.map((s) => [s.stageNumber, s])
);

export function getLifecycleStageMetadata(
  stageNumber: number
): LifecycleStageMetadata | undefined {
  return STAGES_BY_NUMBER.get(stageNumber);
}

export function getAllLifecycleStagesMetadata(): readonly LifecycleStageMetadata[] {
  return FROZEN_LIFECYCLE_STAGES_METADATA;
}

export interface TraceabilityAuditorOptions {
  /** Whether the trace is audited for production cutover requiring all runtime envelopes */
  readonly requireProductionEnvelopes?: boolean;

  /** Optional canonical validation evidence for WP-29 Slice 1C linkage */
  readonly validationEvidence?: ValidationAuditEvidence;
}

/**
 * TraceabilityAuditor: Audits runtime trace structure, lifecycle coverage,
 * observable artifact lineage, and compliance with the 21 Principles of
 * Sound Engineering Reasoning.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTIONS:
 * 1. Authority Boundary:
 *    Evaluates trace structure, envelope coverage, and evidence presence.
 *    Does NOT re-adjudicate substantive sound-engineering judgements (acoustic correctness,
 *    musical optimality, parsimony, or hidden model reasoning).
 * 2. Severity Classification:
 *    CRITICAL finding is solely a descriptive audit classification. It does NOT mutate
 *    Blocker 04 or Gate 8 in this component.
 * 3. RunTrace Integrity:
 *    Evaluates immutable runtime structural integrity, not cryptographic tamper evidence.
 * 4. P20 Guardrail:
 *    EVIDENCE_PRESENT only. Confirms required deliberation envelopes and lineage entries are present;
 *    does NOT certify substantive acoustic sufficiency for human experts.
 */
export class TraceabilityAuditor {
  private readonly requireProductionEnvelopes: boolean;
  private readonly defaultValidationEvidence?: ValidationAuditEvidence;

  constructor(options?: TraceabilityAuditorOptions) {
    this.requireProductionEnvelopes = options?.requireProductionEnvelopes ?? true;
    this.defaultValidationEvidence = options?.validationEvidence;
  }

  /**
   * Alias / functional overload method matching auditTraceability calling convention.
   */
  public auditTraceability(
    input:
      | RunTrace
      | {
          runTrace?: RunTrace;
          validationEvidence?: ValidationAuditEvidence;
          parameterIndex?: ParameterProvenanceIndex;
        },
    validationEvidence?: ValidationAuditEvidence
  ): TraceabilityAuditReport {
    if (
      input &&
      typeof input === "object" &&
      ("runTrace" in input || "validationEvidence" in input) &&
      !("checkpoints" in input)
    ) {
      const runTrace = (input as any).runTrace;
      const effectiveEvidence = (input as any).validationEvidence ?? validationEvidence;
      return this.audit(runTrace, effectiveEvidence);
    }
    return this.audit(input as RunTrace, validationEvidence);
  }

  /**
   * Performs an authoritative, non-mutating audit of an execution RunTrace,
   * optionally integrated with canonical validation evidence (WP-29 Slice 1C).
   */
  public audit(
    runTrace: RunTrace,
    validationEvidence?: ValidationAuditEvidence
  ): TraceabilityAuditReport {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const effectiveEvidence = validationEvidence ?? this.defaultValidationEvidence;
    const empiricalOutcomeVerified = this.verifyEmpiricalOutcomeProvenance(runTrace, effectiveEvidence);
    const evidenceContext = this.createEvidenceContext(effectiveEvidence, empiricalOutcomeVerified);
    const findings: TraceabilityFinding[] = [];

    // 1. RunTrace Intake Validation (Fail-closed structural inspection)
    this.validateRunTraceIntake(runTrace, findings);

    // If initial intake reveals unworkable malformation or unsupplied trace, return early report
    // with validation linkage findings evaluated if validation evidence was supplied
    if (
      !runTrace ||
      typeof runTrace !== "object" ||
      !Array.isArray(runTrace.checkpoints)
    ) {
      const completedAt = new Date().toISOString();
      const orphanedMeasurementSummary = this.verifyValidationLinkage(
        runTrace,
        effectiveEvidence,
        findings
      );
      return deepFreeze({
        traceId: runTrace?.traceId || "malformed_trace",
        runId: runTrace?.runId || "malformed_run",
        verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
        allAuditableInvariantsPassed: false,
        findings: Object.freeze(findings),
        lifecycleCoverage: Object.freeze([]),
        principleResults: Object.freeze([]),
        orphanedMeasurementSummary,
        evidenceContext,
        parameterProvenanceCapability: this.createParameterProvenanceCapability(),
        timing: {
          startedAt,
          completedAt,
          durationMs: Math.max(0, Date.now() - startMs),
        },
      });
    }

    // Index checkpoints by layer
    const checkpointsByLayer = new Map<string, TraceCheckpointEntry[]>();
    for (const entry of runTrace.checkpoints) {
      const layer = entry.checkpoint?.layer;
      if (layer) {
        let list = checkpointsByLayer.get(layer);
        if (!list) {
          list = [];
          checkpointsByLayer.set(layer, list);
        }
        list.push(entry);
      }
    }

    // 2. Sequence Verification
    this.verifySequenceOrdering(runTrace, findings);

    // 3. Timestamp Verification
    this.verifyTimestamps(runTrace, checkpointsByLayer, findings);

    // 4. Lifecycle Envelope Coverage & Applicable Paths
    const lifecycleCoverage = this.evaluateLifecycleCoverage(
      runTrace,
      checkpointsByLayer,
      findings
    );

    // 4b. Validation Evidence Linkage & Orphan Measurement Detection (WP-29 Slice 1C)
    const orphanedMeasurementSummary = this.verifyValidationLinkage(
      runTrace,
      effectiveEvidence,
      findings
    );

    // 5. Principle-by-Principle Auditing (21 Principles)
    const principleResults = this.auditPrinciples(
      runTrace,
      checkpointsByLayer,
      findings,
      effectiveEvidence
    );

    // 5b. Parameter Provenance Indexing (WP-29 Slice 1D)
    const paramIndex = ParameterProvenanceIndex.fromTrace(runTrace);
    for (const f of paramIndex.getFindings()) {
      findings.push(f);
    }
    const parameterProvenanceSummary = paramIndex.getSummary();

    // 6. Verdict Derivation
    const verdict = this.deriveAuditVerdict(findings, principleResults, runTrace);

    // allAuditableInvariantsPassed strictly reflects programmatically auditable WP-29 invariants,
    // and does NOT signify that substantive sound-engineering judgement was acoustically optimal.
    const allAuditableInvariantsPassed =
      verdict === TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_VERIFIED;

    const completedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - startMs);

    const report: TraceabilityAuditReport = {
      traceId: runTrace.traceId,
      runId: runTrace.runId,
      verdict,
      allAuditableInvariantsPassed,
      findings: Object.freeze(findings),
      lifecycleCoverage: Object.freeze(lifecycleCoverage),
      principleResults: Object.freeze(principleResults),
      orphanedMeasurementSummary,
      evidenceContext,
      parameterProvenanceCapability: this.createParameterProvenanceCapability(parameterProvenanceSummary),
      parameterProvenanceSummary,
      timing: {
        startedAt,
        completedAt,
        durationMs,
      },
    };

    return deepFreeze(report);
  }

  /**
   * Validates foundational runtime metadata present in RunTrace.
   */
  private validateRunTraceIntake(
    runTrace: RunTrace,
    findings: TraceabilityFinding[]
  ): void {
    if (!runTrace || typeof runTrace !== "object") {
      findings.push({
        code: "ERR_INTAKE_OBJECT_INVALID",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        message: "RunTrace intake failed: target trace is null or not an object",
      });
      return;
    }

    if (!runTrace.traceId || typeof runTrace.traceId !== "string" || runTrace.traceId.trim().length === 0) {
      findings.push({
        code: "ERR_INTAKE_MISSING_TRACE_ID",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        message: "RunTrace intake failed: traceId is missing or empty",
      });
    }

    if (!runTrace.runId || typeof runTrace.runId !== "string" || runTrace.runId.trim().length === 0) {
      findings.push({
        code: "ERR_INTAKE_MISSING_RUN_ID",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        message: "RunTrace intake failed: runId is missing or empty",
      });
    }

    if (!runTrace.contractVersion || typeof runTrace.contractVersion !== "string") {
      findings.push({
        code: "ERR_INTAKE_MISSING_CONTRACT_VERSION",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        message: "RunTrace intake failed: contractVersion is missing or invalid",
      });
    }

    if (!Array.isArray(runTrace.checkpoints)) {
      findings.push({
        code: "ERR_INTAKE_CHECKPOINTS_NOT_ARRAY",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        message: "RunTrace intake failed: checkpoints collection is not an array",
      });
    }
  }

  /**
   * Verifies sequenceIndex monotonicity, determinism, and runId integrity across checkpoints.
   */
  private verifySequenceOrdering(
    runTrace: RunTrace,
    findings: TraceabilityFinding[]
  ): void {
    if (!Array.isArray(runTrace.checkpoints)) return;

    for (let i = 0; i < runTrace.checkpoints.length; i++) {
      const entry = runTrace.checkpoints[i];

      // 1. ABSENT: sequenceIndex is missing / null / undefined -> NOT_VERIFIABLE
      if (entry.sequenceIndex === undefined || entry.sequenceIndex === null) {
        findings.push({
          code: "ERR_SEQ_ABSENT",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          checkpointId: entry.checkpoint?.checkpointId,
          layer: entry.checkpoint?.layer,
          message: `Checkpoint at position ${i} sequenceIndex is absent (missing or null)`,
        });
        continue;
      }

      // 2. PRESENT BUT INVALID TYPE/VALUE: non-numeric or NaN violates runtime contract type -> VIOLATION
      if (typeof entry.sequenceIndex !== "number" || Number.isNaN(entry.sequenceIndex)) {
        findings.push({
          code: "ERR_SEQ_MALFORMED_TYPE",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          checkpointId: entry.checkpoint?.checkpointId,
          layer: entry.checkpoint?.layer,
          message: `Checkpoint at position ${i} has malformed non-numeric sequenceIndex (${String(entry.sequenceIndex)})`,
        });
        continue;
      }

      // 3. VALID NUMERIC VALUE WITH BAD ORDERING: contract requires contiguous 0-indexed progression -> VIOLATION
      if (entry.sequenceIndex !== i) {
        findings.push({
          code: "ERR_SEQ_NON_MONOTONIC",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          checkpointId: entry.checkpoint?.checkpointId,
          layer: entry.checkpoint?.layer,
          message: `Checkpoint sequence ordering broken at index ${i}: expected sequenceIndex ${i}, observed ${entry.sequenceIndex}`,
        });
      }

      // Checkpoint runId must strictly match parent trace runId
      if (entry.checkpoint && entry.checkpoint.runId !== runTrace.runId) {
        findings.push({
          code: "ERR_CHECKPOINT_RUN_ID_MISMATCH",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          checkpointId: entry.checkpoint.checkpointId,
          layer: entry.checkpoint.layer,
          message: `Checkpoint ${entry.checkpoint.checkpointId} runId "${entry.checkpoint.runId}" does not match trace runId "${runTrace.runId}"`,
        });
      }
    }
  }

  /**
   * Validates intra-checkpoint and inter-checkpoint timestamp causal ordering.
   */
  private verifyTimestamps(
    runTrace: RunTrace,
    checkpointsByLayer: Map<string, TraceCheckpointEntry[]>,
    findings: TraceabilityFinding[]
  ): void {
    if (!Array.isArray(runTrace.checkpoints)) return;

    // Intra-checkpoint timestamp validation
    for (const entry of runTrace.checkpoints) {
      const cp = entry.checkpoint;
      if (!cp) continue;

      if (cp.startedAt && cp.completedAt) {
        const startMs = Date.parse(cp.startedAt);
        const endMs = Date.parse(cp.completedAt);

        if (isNaN(startMs) || isNaN(endMs)) {
          findings.push({
            code: "WARN_TIMESTAMP_UNPARSEABLE",
            type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
            category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
            severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
            checkpointId: cp.checkpointId,
            layer: cp.layer,
            message: `Checkpoint ${cp.checkpointId} has unparseable ISO timestamp in startedAt or completedAt`,
          });
        } else if (endMs < startMs) {
          findings.push({
            code: "ERR_TIMESTAMP_INVERTED_CHECKPOINT",
            type: TRACEABILITY_FINDING_TYPES.VIOLATION,
            category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
            severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
            checkpointId: cp.checkpointId,
            layer: cp.layer,
            message: `Checkpoint ${cp.checkpointId} completedAt (${cp.completedAt}) precedes startedAt (${cp.startedAt})`,
          });
        }
      }
    }

    // Inter-checkpoint sequential causal ordering
    for (let i = 1; i < runTrace.checkpoints.length; i++) {
      const prev = runTrace.checkpoints[i - 1].checkpoint;
      const curr = runTrace.checkpoints[i].checkpoint;

      if (prev?.completedAt && curr?.startedAt) {
        const prevEndMs = Date.parse(prev.completedAt);
        const currStartMs = Date.parse(curr.startedAt);

        if (!isNaN(prevEndMs) && !isNaN(currStartMs) && prevEndMs > currStartMs) {
          findings.push({
            code: "ERR_TIMESTAMP_CAUSAL_ORDER_VIOLATED",
            type: TRACEABILITY_FINDING_TYPES.VIOLATION,
            category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
            severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
            checkpointId: curr.checkpointId,
            layer: curr.layer,
            message: `Causal timestamp ordering violated: checkpoint ${prev.checkpointId} (${prev.layer}) completed at ${prev.completedAt} after subsequent checkpoint ${curr.checkpointId} (${curr.layer}) started at ${curr.startedAt}`,
          });
        }
      }
    }
  }

  /**
   * Evaluates coverage across the 6 grouped runtime envelopes and populates 14-stage metadata.
   */
  private evaluateLifecycleCoverage(
    runTrace: RunTrace,
    checkpointsByLayer: Map<string, TraceCheckpointEntry[]>,
    findings: TraceabilityFinding[]
  ): StageVerificationEntry[] {
    const isCompleted = runTrace.status === TRACE_LIFECYCLE_STATUSES.COMPLETED;
    const isTerminalFault =
      runTrace.status === TRACE_LIFECYCLE_STATUSES.FAILED ||
      runTrace.status === TRACE_LIFECYCLE_STATUSES.CANCELLED;

    // 6 grouped runtime envelopes
    const requiredEnvelopes: RuntimeEnvelopeGroup[] = [
      RUNTIME_ENVELOPE_GROUPS.INPUT,
      RUNTIME_ENVELOPE_GROUPS.EVIDENCE,
      RUNTIME_ENVELOPE_GROUPS.ENGINEERING,
      RUNTIME_ENVELOPE_GROUPS.SEMANTIC_DESIGN,
      RUNTIME_ENVELOPE_GROUPS.VALIDATION,
      RUNTIME_ENVELOPE_GROUPS.PLATFORM_TRANSLATION,
    ];

    // For complete or production-candidate traces, verify all 6 envelopes
    if (isCompleted || (this.requireProductionEnvelopes && !isTerminalFault)) {
      for (const env of requiredEnvelopes) {
        if (!checkpointsByLayer.has(env)) {
          findings.push({
            code: `WARN_REQUIRED_ENVELOPE_MISSING_${env}`,
            type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
            category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
            severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
            layer: env,
            message: `Required runtime envelope "${env}" is absent from trace`,
          });
        }
      }
    }

    // For early-terminal traces (FAILED or CANCELLED), downstream envelopes were legally not reached.
    // Record a factual informational finding documenting that execution halted early.
    if (isTerminalFault) {
      findings.push({
        code: `INFO_EARLY_TERMINATION_${runTrace.status}`,
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
        message: `RunTrace terminated early with status "${runTrace.status}"; downstream envelopes were legally not executed`,
      });
    }

    const hasInput = checkpointsByLayer.has(SOUND_ENGINEER_LAYERS.INPUT);
    const hasEvidence = checkpointsByLayer.has(SOUND_ENGINEER_LAYERS.EVIDENCE);
    const hasEngineering = checkpointsByLayer.has(SOUND_ENGINEER_LAYERS.ENGINEERING);
    const hasSemantic = checkpointsByLayer.has(SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN);
    const hasValidation = checkpointsByLayer.has(SOUND_ENGINEER_LAYERS.VALIDATION);

    const evidenceCp = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.EVIDENCE)?.[0]?.checkpoint;
    const evidencePayload = evidenceCp?.payload as any;
    const hasAcousticObs = Boolean(evidencePayload?.acousticCharacteristics);

    const engCp = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.ENGINEERING)?.[0]?.checkpoint;
    const engPayload = engCp?.payload as any;
    const hasObjective = Boolean(engPayload?.overallObjective);
    const hasDecisions = Array.isArray(engPayload?.decisions) && engPayload.decisions.length > 0;
    const hasConstraints = hasDecisions && engPayload.decisions.some((d: any) => Array.isArray(d.constraints));

    const semCp = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN)?.[0]?.checkpoint;
    const semPayload = semCp?.payload as any;
    const hasSemanticDesign = Boolean(semPayload?.stages && semPayload?.topology);

    const coverage: StageVerificationEntry[] = [
      {
        stageNumber: 1,
        stageName: "INTENT_INTAKE",
        representation: STAGE_REPRESENTATION_STRENGTHS.EXACT,
        presentInTrace: hasInput,
        details: hasInput
          ? "Exact representation: InputSnapshot artifact sealed in INPUT layer."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "INPUT layer envelope absent.",
      },
      {
        stageNumber: 2,
        stageName: "CASE_EVIDENCE_ASSESSMENT",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEvidence,
        details: hasEvidence
          ? "Derived from EvidenceRecord source references in EVIDENCE layer."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "EVIDENCE layer envelope absent.",
      },
      {
        stageNumber: 3,
        stageName: "OBSERVATION_FORMATION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEvidence && hasAcousticObs,
        details: hasEvidence && hasAcousticObs
          ? "Derived from EvidenceRecord.acousticCharacteristics in EVIDENCE layer."
          : isTerminalFault && !hasEvidence
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "Acoustic observations missing or unsupplied.",
      },
      {
        stageNumber: 4,
        stageName: "HYPOTHESIS_GENERATION",
        representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
        presentInTrace: hasEngineering,
        details: hasEngineering
          ? "Grouped inside ENGINEERING layer deliberation; no discrete runtime artifact."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "ENGINEERING layer envelope absent.",
      },
      {
        stageNumber: 5,
        stageName: "HYPOTHESIS_EVALUATION_AND_COMPETITION",
        representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
        presentInTrace: hasEngineering,
        details: hasEngineering
          ? "Grouped inside ENGINEERING layer deliberation; no discrete runtime artifact."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "ENGINEERING layer envelope absent.",
      },
      {
        stageNumber: 6,
        stageName: "DISCRIMINATING_EVIDENCE_CHECK",
        representation: STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED,
        presentInTrace: false,
        details: "Not represented in current runtime contracts; direct execution path.",
      },
      {
        stageNumber: 7,
        stageName: "CAUSAL_DIAGNOSIS",
        representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
        presentInTrace: hasEngineering,
        details: hasEngineering
          ? "Grouped inside ENGINEERING layer deliberation; no discrete runtime artifact."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "ENGINEERING layer envelope absent.",
      },
      {
        stageNumber: 8,
        stageName: "ENGINEERING_REQUIREMENT_FORMATION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEngineering && hasObjective,
        details: hasEngineering && hasObjective
          ? "Derived from EngineeringDecisionRecord.overallObjective."
          : isTerminalFault && !hasEngineering
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "Engineering objective missing.",
      },
      {
        stageNumber: 9,
        stageName: "CANDIDATE_INTERVENTION_GENERATION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEngineering && hasDecisions,
        details: hasEngineering && hasDecisions
          ? "Derived from EngineeringDecisionRecord.decisions."
          : isTerminalFault && !hasEngineering
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "Engineering decisions missing.",
      },
      {
        stageNumber: 10,
        stageName: "CONSTRAINT_AND_TRADE_OFF_ANALYSIS",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEngineering && hasConstraints,
        details: hasEngineering && hasConstraints
          ? "Derived from EngineeringDecisionItem.constraints and tradeOffs."
          : isTerminalFault && !hasEngineering
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "Constraints or trade-off items missing.",
      },
      {
        stageNumber: 11,
        stageName: "ENGINEERING_DECISION_AND_PREDICTION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasEngineering && hasDecisions,
        details: hasEngineering && hasDecisions
          ? "Derived representation: EngineeringDecisionRecord directly represented, but decision + prediction concept is not represented as independently sealed discrete subrecords (PredictedOutcomeRecord is not separately persisted)."
          : isTerminalFault && !hasEngineering
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "EngineeringDecisionRecord missing.",
      },
      {
        stageNumber: 12,
        stageName: "SEMANTIC_TONE_DESIGN_HANDOFF",
        representation: STAGE_REPRESENTATION_STRENGTHS.EXACT,
        presentInTrace: hasSemantic && hasSemanticDesign,
        details: hasSemantic && hasSemanticDesign
          ? "Exact representation: SemanticToneDesign sealed."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "SemanticToneDesign missing.",
      },
      {
        stageNumber: 13,
        stageName: "OUTCOME_EVIDENCE_INGESTION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasValidation,
        details: hasValidation
          ? "Derived from ValidationReport in VALIDATION layer."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "VALIDATION layer envelope absent.",
      },
      {
        stageNumber: 14,
        stageName: "ENGINEERING_REVIEW_AND_ITERATION",
        representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
        presentInTrace: hasValidation || runTrace.diagnostics?.totalCount > 0,
        details: hasValidation || runTrace.diagnostics?.totalCount > 0
          ? "Derived from trace diagnostics and validation review."
          : isTerminalFault
            ? `Not reached: trace terminated early with status "${runTrace.status}".`
            : "No retrospective review diagnostics found in trace.",
      },
    ];

    return coverage;
  }

  /**
   * Audits each of the 21 Principles of Sound Engineering Reasoning according to its frozen strength.
   */
  private auditPrinciples(
    runTrace: RunTrace,
    checkpointsByLayer: Map<string, TraceCheckpointEntry[]>,
    findings: TraceabilityFinding[],
    validationEvidence?: ValidationAuditEvidence
  ): PrincipleAuditResult[] {
    const allPrinciples = getAllPrinciplesMetadata();
    const results: PrincipleAuditResult[] = [];

    const inp = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.INPUT)?.[0];
    const evi = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.EVIDENCE)?.[0];
    const eng = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.ENGINEERING)?.[0];
    const sem = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN)?.[0];
    const val = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.VALIDATION)?.[0];
    const ptp = checkpointsByLayer.get(SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION)?.[0];

    const eviPayload = evi?.checkpoint?.payload as any;
    const engPayload = eng?.checkpoint?.payload as any;
    const ptpPayload = ptp?.checkpoint?.payload as any;
    const valPayload = val?.checkpoint?.payload as any;

    for (const meta of allPrinciples) {
      const pFindings: TraceabilityFinding[] = [];
      let state: PrincipleAuditState = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
      let notes: string | undefined;

      switch (meta.number) {
        // =====================================================================
        // STRUCTURALLY VERIFIABLE (P1, P7, P12, P15, P18)
        // =====================================================================
        case 1: {
          // P1: Evidence Precedes Diagnosis
          if (!evi || !eng) {
            pFindings.push({
              code: "WARN_P1_ENVELOPES_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 1,
              message: "Evidence or Engineering checkpoint is absent; causal sequence cannot be verified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
            notes = "EVIDENCE or ENGINEERING checkpoint absent.";
          } else {
            let p1Violation = false;

            // Sequence check
            if (evi.sequenceIndex >= eng.sequenceIndex) {
              pFindings.push({
                code: "ERR_P1_ORDERING_INVERTED",
                type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                principleNumber: 1,
                checkpointId: eng.checkpoint.checkpointId,
                message: `Evidence checkpoint (seq ${evi.sequenceIndex}) does not precede engineering checkpoint (seq ${eng.sequenceIndex})`,
              });
              p1Violation = true;
            }

            // Timestamp check
            if (evi.checkpoint.completedAt && eng.checkpoint.startedAt) {
              if (Date.parse(evi.checkpoint.completedAt) > Date.parse(eng.checkpoint.startedAt)) {
                pFindings.push({
                  code: "ERR_P1_TIMESTAMP_INVERTED",
                  type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                  category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                  principleNumber: 1,
                  checkpointId: eng.checkpoint.checkpointId,
                  message: `EVIDENCE completedAt (${evi.checkpoint.completedAt}) occurs after ENGINEERING startedAt (${eng.checkpoint.startedAt})`,
                });
                p1Violation = true;
              }
            }

            // Evidence reference linkage check
            if (engPayload) {
              const evRef = engPayload.evidenceReference;
              if (!evRef) {
                pFindings.push({
                  code: "ERR_P1_EVIDENCE_REF_MISSING",
                  type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                  category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                  principleNumber: 1,
                  checkpointId: eng.checkpoint.checkpointId,
                  message: "Engineering decision record lacks required evidenceReference",
                });
                p1Violation = true;
              } else if (evi.checkpoint.output) {
                if (evRef.artifactId !== evi.checkpoint.output.artifactId) {
                  pFindings.push({
                    code: "ERR_P1_EVIDENCE_REF_MISMATCH",
                    type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                    category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
                    severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                    principleNumber: 1,
                    checkpointId: eng.checkpoint.checkpointId,
                    message: `Engineering decision evidenceReference "${evRef.artifactId}" does not match EVIDENCE output "${evi.checkpoint.output.artifactId}"`,
                  });
                  p1Violation = true;
                }
              } else {
                pFindings.push({
                  code: "WARN_P1_EVIDENCE_OUTPUT_ABSENT",
                  type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
                  category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
                  principleNumber: 1,
                  message: "EVIDENCE checkpoint output reference is absent; cannot positively verify reference match",
                });
              }
            }

            if (p1Violation) {
              state = PRINCIPLE_AUDIT_STATES.VIOLATION;
            } else if (pFindings.some((f) => f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE)) {
              state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
            } else {
              state = PRINCIPLE_AUDIT_STATES.SATISFIED;
              notes = "EVIDENCE precedes ENGINEERING in sequence and timestamp; valid evidenceReference verified.";
            }
          }
          break;
        }

        case 7: {
          // P7: Context Informs Reasoning but Does Not Prove Causation
          if (!inp || !evi) {
            pFindings.push({
              code: "WARN_P7_ENVELOPES_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 7,
              message: "INPUT or EVIDENCE checkpoint absent; cannot evaluate context vs evidence separation",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          } else {
            const inpId = inp.checkpoint.output?.artifactId || inp.checkpoint.checkpointId;
            const eviId = evi.checkpoint.output?.artifactId || evi.checkpoint.checkpointId;

            if (inpId === eviId) {
              pFindings.push({
                code: "ERR_P7_CONTEXT_EVIDENCE_CONFLATED",
                type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                principleNumber: 7,
                message: `INPUT context and EVIDENCE acoustic observations share identical artifact ID "${inpId}", violating structural epistemic separation`,
              });
              state = PRINCIPLE_AUDIT_STATES.VIOLATION;
            } else {
              state = PRINCIPLE_AUDIT_STATES.SATISFIED;
              notes = "InputSnapshot (context) and EvidenceRecord (acoustic observations) maintain separate structural representation.";
            }
          }
          break;
        }

        case 12: {
          // P12: Predict Consequences Before Acting
          if (!eng || !ptp) {
            pFindings.push({
              code: "WARN_P12_ENVELOPES_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 12,
              message: "ENGINEERING or PLATFORM_TRANSLATION checkpoint absent; cannot verify upstream prediction ordering",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          } else {
            let p12Violation = false;
            if (eng.sequenceIndex >= ptp.sequenceIndex) {
              pFindings.push({
                code: "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING",
                type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                principleNumber: 12,
                checkpointId: ptp.checkpoint.checkpointId,
                message: `Platform translation (seq ${ptp.sequenceIndex}) precedes or matches engineering decision (seq ${eng.sequenceIndex})`,
              });
              p12Violation = true;
            }
            if (eng.checkpoint.completedAt && ptp.checkpoint.startedAt) {
              if (Date.parse(eng.checkpoint.completedAt) > Date.parse(ptp.checkpoint.startedAt)) {
                pFindings.push({
                  code: "ERR_P12_TIMESTAMP_INVERTED",
                  type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                  category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                  principleNumber: 12,
                  checkpointId: ptp.checkpoint.checkpointId,
                  message: `ENGINEERING completedAt (${eng.checkpoint.completedAt}) occurs after PLATFORM_TRANSLATION startedAt (${ptp.checkpoint.startedAt})`,
                });
                p12Violation = true;
              }
            }

            if (p12Violation) {
              state = PRINCIPLE_AUDIT_STATES.VIOLATION;
            } else {
              state = PRINCIPLE_AUDIT_STATES.SATISFIED;
              notes = "Authoritative engineering decision envelope strictly precedes platform translation execution.";
            }
          }
          break;
        }

        case 15: {
          // P15: Platform Translation Operates Downstream of Engineering Reasoning
          if (!sem || !ptp) {
            pFindings.push({
              code: "WARN_P15_ENVELOPES_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 15,
              message: "SEMANTIC_DESIGN or PLATFORM_TRANSLATION checkpoint absent; cannot verify translation ordering",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          } else {
            let p15Violation = false;
            if (sem.sequenceIndex >= ptp.sequenceIndex) {
              pFindings.push({
                code: "ERR_P15_ORDERING_INVERTED",
                type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                principleNumber: 15,
                checkpointId: ptp.checkpoint.checkpointId,
                message: `Platform translation (seq ${ptp.sequenceIndex}) does not operate downstream of semantic design (seq ${sem.sequenceIndex})`,
              });
              p15Violation = true;
            }
            if (sem.checkpoint.completedAt && ptp.checkpoint.startedAt) {
              if (Date.parse(sem.checkpoint.completedAt) > Date.parse(ptp.checkpoint.startedAt)) {
                pFindings.push({
                  code: "ERR_P15_TIMESTAMP_INVERTED",
                  type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                  category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                  principleNumber: 15,
                  checkpointId: ptp.checkpoint.checkpointId,
                  message: `SEMANTIC_DESIGN completedAt (${sem.checkpoint.completedAt}) occurs after PLATFORM_TRANSLATION startedAt (${ptp.checkpoint.startedAt})`,
                });
                p15Violation = true;
              }
            }
            if (ptpPayload) {
              const semRef = ptpPayload.semanticDesignReference;
              if (!semRef) {
                pFindings.push({
                  code: "ERR_P15_SEMANTIC_REF_MISSING",
                  type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                  category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
                  severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                  principleNumber: 15,
                  checkpointId: ptp.checkpoint.checkpointId,
                  message: "PlatformTranslationPlan lacks required semanticDesignReference",
                });
                p15Violation = true;
              } else if (sem.checkpoint.output) {
                if (semRef.artifactId !== sem.checkpoint.output.artifactId) {
                  pFindings.push({
                    code: "ERR_P15_SEMANTIC_REF_MISMATCH",
                    type: TRACEABILITY_FINDING_TYPES.VIOLATION,
                    category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
                    severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
                    principleNumber: 15,
                    checkpointId: ptp.checkpoint.checkpointId,
                    message: `PlatformTranslationPlan semanticDesignReference "${semRef.artifactId}" does not match SEMANTIC_DESIGN output "${sem.checkpoint.output.artifactId}"`,
                  });
                  p15Violation = true;
                }
              }
            }

            if (p15Violation) {
              state = PRINCIPLE_AUDIT_STATES.VIOLATION;
            } else {
              state = PRINCIPLE_AUDIT_STATES.SATISFIED;
              notes = "SemanticToneDesign exists independently and PlatformTranslationPlan references it downstream.";
            }
          }
          break;
        }

        case 18: {
          // P18: Evaluate Outcomes Honestly Without Circular Justification
          // Architecture capability is STRUCTURALLY_VERIFIABLE.
          if (!val) {
            pFindings.push({
              code: "WARN_P18_VALIDATION_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 18,
              message: "VALIDATION layer checkpoint absent; outcome evidence without circularity cannot be verified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          } else if (
            !validationEvidence ||
            !validationEvidence.executions ||
            validationEvidence.executions.length === 0
          ) {
            // RunTrace-only audit (Slice 1B backward compatibility):
            // RunTrace alone does NOT expose post-action empirical audio outcome evidence (ValidationExecutionRecord / Record 9).
            pFindings.push({
              code: "INFO_P18_AUDIO_RECEIPTS_UNVERIFIABLE",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
              principleNumber: 18,
              message:
                "RunTrace-only audit: empirical post-action outcome evidence not verifiable without ValidationExecutionRecord receipts",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
            notes =
              "RunTrace alone does not expose post-action empirical audio outcome evidence (ValidationExecutionRecord is not supplied).";
          } else {
            // Validation-integrated audit (Slice 1C):
            // P18 includes two distinct requirements:
            // Requirement A: Empirical outcome evidence exists (actual post-action validation execution occurred).
            // Requirement B: Outcome evidence is not circularly sourced from pre-action prediction (Outcome Evidence Firewall intact).
            // P18 may be SATISFIED ONLY if BOTH A and B are verifiable.
            // Canonical Records 9-11 contain NO prediction-provenance discriminator (no is_prediction, prediction_source_ref, etc.).
            // Therefore, while Requirement A can be verified empirically, Requirement B cannot be independently proven from
            // current canonical records. Full P18 must remain NOT_VERIFIABLE until a canonical provenance source supplies B.
            const isEmpiricalVerified = this.verifyEmpiricalOutcomeProvenance(
              runTrace,
              validationEvidence
            );

            if (isEmpiricalVerified) {
              pFindings.push({
                code: "INFO_P18_EMPIRICAL_OUTCOME_VERIFIED",
                type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
                principleNumber: 18,
                message:
                  "Empirical outcome evidence verified from completed ValidationExecutionRecord audio receipts and linked measurements. However, full Principle 18 remains NOT_VERIFIABLE because current canonical validation records (Records 9-11) lack explicit prediction-provenance discriminators to verify the Outcome Evidence Firewall.",
              });
              state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
              notes =
                "Empirical outcome provenance verified (completed execution with valid audio digests and linked measurements). Full P18 remains NOT_VERIFIABLE because current canonical validation records (Records 9-11) lack explicit prediction-provenance discriminators to verify the Outcome Evidence Firewall.";
            } else {
              pFindings.push({
                code: "EMPIRICAL_OUTCOME_NOT_VERIFIABLE",
                type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
                category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
                principleNumber: 18,
                message:
                  "Empirical post-action outcome evidence incomplete: missing resolved completed execution with valid audio receipts and linked measurements",
              });
              state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
              notes =
                "Validation records supplied but post-action audio receipts, execution outcome, or linked measurements are incomplete or unresolvable.";
            }
          }
          break;
        }

        // =====================================================================
        // EVIDENCE PRESENT (P2, P3, P8, P9, P13, P16, P19, P20)
        // SATISFIED means ONLY: required supporting trace evidence is present.
        // WP-29 does NOT independently validate substantive engineering judgement.
        // =====================================================================
        case 2: {
          // P2: Observation Is Not Interpretation
          if (eviPayload && typeof eviPayload.acousticCharacteristics === "object") {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Descriptive acoustic evidence structure present in EvidenceRecord. Substantive spectral accuracy not independently evaluated.";
          } else {
            pFindings.push({
              code: "WARN_P2_DESCRIPTIVE_EVIDENCE_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 2,
              message: "EvidenceRecord lacks structured acousticCharacteristics descriptive properties",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 3: {
          // P3: Missing Evidence Is Not Negative Evidence
          if (eviPayload && Array.isArray(eviPayload.uncertainties)) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Explicit uncertainties/missing evidence representations present. Missing evidence not treated as negative evidence.";
          } else {
            pFindings.push({
              code: "WARN_P3_UNCERTAINTIES_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 3,
              message: "EvidenceRecord lacks uncertainties representation array",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 8: {
          // P8: Engineering Intent Constrains the Solution
          if (
            engPayload &&
            typeof engPayload.overallObjective === "string" &&
            engPayload.overallObjective.trim().length > 0 &&
            Array.isArray(engPayload.decisions) &&
            engPayload.decisions.some((d: any) => Array.isArray(d.constraints))
          ) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Engineering intent (overallObjective) and constraint definitions are present in decisions.";
          } else {
            pFindings.push({
              code: "WARN_P8_INTENT_CONSTRAINTS_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 8,
              message: "EngineeringDecisionRecord lacks overallObjective or decision constraints",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 9: {
          // P9: Generate Alternatives When the Problem Admits Alternatives
          const hasTradeOffs =
            Array.isArray(engPayload?.decisions) &&
            engPayload.decisions.some((d: any) => Array.isArray(d.tradeOffs) && d.tradeOffs.length > 0);
          const hasSubstitutions =
            Array.isArray(ptpPayload?.substitutions) && ptpPayload.substitutions.length > 0;

          if (hasTradeOffs || hasSubstitutions) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Alternative/trade-off or substitution evidence is present in trace.";
          } else if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Alternative generation necessity delegated to upstream reasoning engine; single-solution path may be justified.";
          } else {
            pFindings.push({
              code: "WARN_P9_ENGINEERING_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 9,
              message: "ENGINEERING checkpoint absent; cannot evaluate alternatives evidence",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 13: {
          // P13: Every Intervention Has Potential Trade-Offs
          // Empty array is accepted per upstream contract semantics
          if (
            engPayload &&
            Array.isArray(engPayload.decisions) &&
            engPayload.decisions.every((d: any) => d.tradeOffs !== undefined || d.constraints !== undefined)
          ) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Trade-off evidence fields are present on decision items.";
          } else {
            pFindings.push({
              code: "WARN_P13_TRADEOFFS_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 13,
              message: "Engineering decision items lack tradeOffs evidence fields",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 16: {
          // P16: Reject Unacceptable Platform Compromises
          if (
            ptpPayload &&
            Array.isArray(ptpPayload.substitutions) &&
            Array.isArray(ptpPayload.unresolvedMappings) &&
            Array.isArray(ptpPayload.capabilityLimitations)
          ) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Platform compromise, substitution, and unresolved-mapping evidence structures are present.";
          } else {
            pFindings.push({
              code: "WARN_P16_COMPROMISES_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 16,
              message: "PlatformTranslationPlan lacks substitution or unresolved-mapping reporting structures",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 19: {
          // P19: Capture Engineering Experience for Governed Review
          const hasGovernedReview = runTrace.diagnostics?.diagnostics?.some(
            (d) =>
              d.diagnostic?.code?.startsWith("GOVERNED_REVIEW") ||
              d.diagnostic?.code?.startsWith("CANDIDATE_LESSON") ||
              d.diagnostic?.code?.startsWith("REVIEW_RECORD") ||
              d.diagnostic?.source?.toLowerCase().includes("review") ||
              d.diagnostic?.source?.toLowerCase().includes("governance")
          );

          if (hasGovernedReview) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "Governed review or quarantined candidate-lesson diagnostic evidence present.";
          } else {
            pFindings.push({
              code: "INFO_P19_GOVERNED_REVIEW_ABSENT",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
              principleNumber: 19,
              message: "Trace lacks explicit governed-review or candidate-lesson diagnostic evidence",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
            notes = "Explicit governed-review evidence absent in RunTrace.";
          }
          break;
        }

        case 20: {
          // P20: The Deliberation Record Must Support Independent Retrospective Audit
          // P20 Guardrail: EVIDENCE_PRESENT only. Confirms factual presence of envelopes and lineage.
          const requiredLayers: LayerIdentity[] = [
            SOUND_ENGINEER_LAYERS.INPUT,
            SOUND_ENGINEER_LAYERS.EVIDENCE,
            SOUND_ENGINEER_LAYERS.ENGINEERING,
            SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
            SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
          ];
          const allLayersPresent = requiredLayers.every((l) => checkpointsByLayer.has(l));
          const hasLineage = Array.isArray(runTrace.lineage) && runTrace.lineage.length > 0;

          if (allLayersPresent && hasLineage) {
            state = PRINCIPLE_AUDIT_STATES.SATISFIED;
            notes = "P20 Guardrail: Required checkpoint envelopes, artifact references, and lineage entries are present and sealed. Does NOT independently certify that every substantive judgement was acoustically sufficient.";
          } else {
            pFindings.push({
              code: "WARN_P20_DELIBERATION_INCOMPLETE",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 20,
              message: "Deliberation record incomplete: missing core reasoning envelopes or lineage entries",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
            notes = "Essential deliberation envelopes or lineage missing from trace.";
          }
          break;
        }

        // =====================================================================
        // DELEGATED UPSTREAM (P4, P5, P6, P10, P11, P14, P17, P21)
        // Substantive judgement owned upstream; return DELEGATED if supporting
        // record exists. Never convert to SATISFIED simply because rationale exists.
        // =====================================================================
        case 4: {
          // P4: A Symptom Does Not Identify Its Cause
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Substantive causal decoupling delegated to upstream reasoning engine. Evidence reference and rationale presence verified.";
          } else {
            pFindings.push({
              code: "WARN_P4_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 4,
              message: "Engineering decision record absent; delegated causal decoupling support unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 5: {
          // P5: Diagnosis Should Be Causal Where Evidence Permits
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Acoustic correctness of causal diagnosis delegated to upstream reasoning engine (Stages 04-07). Objective and rationale present.";
          } else {
            pFindings.push({
              code: "WARN_P5_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 5,
              message: "Engineering decision record absent; delegated causal diagnosis support unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 6: {
          // P6: Competing Hypotheses Survive Until Evidence Justifies Narrowing Them
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Hypothesis competition and narrowing deliberation delegated upstream.";
          } else {
            pFindings.push({
              code: "WARN_P6_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 6,
              message: "Engineering decision record absent; hypothesis competition support unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 10: {
          // P10: Intervention Selection Follows Diagnosis
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Substantive intervention-to-diagnosis causal grounding delegated upstream; record-level evidence reference verified.";
          } else {
            pFindings.push({
              code: "WARN_P10_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 10,
              message: "Engineering decision record absent; intervention selection support unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 11: {
          // P11: Intervention Should Occur at the Causally Appropriate Point
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Signal chain locus causal appropriateness delegated upstream; decision category classifications verified.";
          } else {
            pFindings.push({
              code: "WARN_P11_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 11,
              message: "Engineering decision record absent; signal chain locus classification unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 14: {
          // P14: Parsimony: Do Not Intervene Without Justified Engineering Purpose
          if (engPayload) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Intervention parsimony and minimality delegated upstream; decision purpose and rationale fields verified.";
          } else {
            pFindings.push({
              code: "WARN_P14_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 14,
              message: "Engineering decision record absent; parsimony purpose and rationale unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 17: {
          // P17: Deterministic Code Validates Constraints; It Does Not Replace Judgement
          if (val) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "ValidationReport presence confirms deterministic constraint validation without replacing acoustic judgement.";
          } else {
            pFindings.push({
              code: "WARN_P17_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 17,
              message: "Validation checkpoint absent; constraint validator execution receipts unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        case 21: {
          // P21: Where Evidence Is Missing, Seek Discriminating Evidence Rather Than Guessing
          if (evi && eng) {
            state = PRINCIPLE_AUDIT_STATES.DELEGATED;
            notes = "Ambiguity resolution and discriminating evidence protocol delegated upstream to intake/diagnostic engines.";
          } else {
            pFindings.push({
              code: "WARN_P21_UPSTREAM_SUPPORT_MISSING",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              principleNumber: 21,
              message: "Evidence or engineering checkpoint absent; ambiguity handling support unverified",
            });
            state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          }
          break;
        }

        default:
          state = PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE;
          break;
      }

      // Collect principle-level findings into global findings
      for (const pf of pFindings) {
        findings.push(pf);
      }

      results.push({
        principleNumber: meta.number,
        title: meta.title,
        auditStrength: meta.auditStrength,
        state,
        findings: Object.freeze(pFindings),
        ...(notes ? { notes } : {}),
      });
    }

    return results;
  }

  /**
   * Derives local audit verdict conservatively and factually.
   *
   * TRACE_COMPLIANCE_DEFICIENT:
   *   One or more factual VIOLATION findings.
   * TRACE_COMPLIANCE_NOT_VERIFIABLE:
   *   No factual violations, but one or more mandatory applicable audit requirements cannot be verified.
   *   (Finding severity is descriptive only; an INFO-severity mandatory NOT_VERIFIABLE finding
   *   must still prevent TRACE_COMPLIANCE_VERIFIED).
   * TRACE_COMPLIANCE_VERIFIED:
   *   Only when:
   *     - zero VIOLATION;
   *     - zero mandatory NOT_VERIFIABLE;
   *     - all structurally auditable applicable invariants satisfied;
   *     - all required evidence-presence requirements established;
   *     - delegated principles have required upstream support.
   */
  private deriveAuditVerdict(
    findings: readonly TraceabilityFinding[],
    principleResults: readonly PrincipleAuditResult[],
    runTrace: RunTrace
  ): TraceabilityAuditVerdict {
    // 1. Any positive VIOLATION triggers DEFICIENT (precedence rule)
    const hasViolation = findings.some(
      (f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION
    );
    if (hasViolation) {
      return TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT;
    }

    // 2. Early-terminal traces (FAILED, CANCELLED) cannot imply complete Gate-8 verification.
    // Preserves factual coverage up to termination point; missing downstream evidence is NOT_VERIFIABLE.
    const isEarlyTerminal =
      runTrace.status === TRACE_LIFECYCLE_STATUSES.FAILED ||
      runTrace.status === TRACE_LIFECYCLE_STATUSES.CANCELLED;

    // 3. Any mandatory NOT_VERIFIABLE finding triggers NOT_VERIFIABLE.
    // Finding severity is descriptive only; it must not be used to bypass mandatory verification.
    const hasMandatoryNotVerifiableFinding = findings.some(
      (f) => f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE
    );

    // Check principle-level verification:
    // - STRUCTURALLY_VERIFIABLE principles must be SATISFIED (cannot be NOT_VERIFIABLE)
    // - EVIDENCE_PRESENT principles must be SATISFIED (cannot be NOT_VERIFIABLE)
    // - DELEGATED_UPSTREAM principles must have upstream support (state DELEGATED; cannot be NOT_VERIFIABLE)
    const hasUnverifiablePrinciple = principleResults.some(
      (p) => p.state === PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE
    );

    if (isEarlyTerminal || hasMandatoryNotVerifiableFinding || hasUnverifiablePrinciple) {
      return TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE;
    }

    // 4. Confirm all auditable applicable invariants satisfied, required evidence present,
    // and delegated principles have required upstream support
    const allPrinciplesCompliant = principleResults.every((p) => {
      if (p.auditStrength === PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE) {
        return p.state === PRINCIPLE_AUDIT_STATES.SATISFIED;
      }
      if (p.auditStrength === PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT) {
        return p.state === PRINCIPLE_AUDIT_STATES.SATISFIED;
      }
      if (p.auditStrength === PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM) {
        return p.state === PRINCIPLE_AUDIT_STATES.DELEGATED;
      }
      return false;
    });

    if (!allPrinciplesCompliant) {
      return TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE;
    }

    // 5. Fully verified
    return TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_VERIFIED;
  }

  private createEmptyOrphanedMeasurementSummary(): OrphanedMeasurementSummary {
    return Object.freeze({
      totalMeasurementsChecked: 0,
      orphanedCount: 0,
      ruleA_MissingExecutionCount: 0,
      ruleB_UnresolvableTraceCount: 0,
      scopeCoverageVerifiedCount: 0,
      totalMeasurements: 0,
      resolvedMeasurements: 0,
      orphanedMeasurements: 0,
      unverifiedMeasurements: 0,
      objectiveEvidenceCount: 0,
      perceptualEvaluationCount: 0,
      objectiveOrphanedCount: 0,
      perceptualOrphanedCount: 0,
    });
  }

  private createEvidenceContext(
    validationEvidence?: ValidationAuditEvidence,
    empiricalOutcomeVerified = false
  ): AuditEvidenceContext {
    const executionCount =
      validationEvidence?.executions?.length ??
      validationEvidence?.executionRecords?.length ??
      0;
    const objectiveCount =
      validationEvidence?.objectiveEvidence?.length ??
      validationEvidence?.objectiveEvidenceRecords?.length ??
      0;
    const perceptualCount =
      validationEvidence?.perceptualEvaluations?.length ??
      validationEvidence?.perceptualEvaluationRecords?.length ??
      0;
    const caseCount = validationEvidence?.validationCases?.length ?? 0;
    const scopeCount =
      validationEvidence?.validationScopes?.length ??
      validationEvidence?.validationScopeRecords?.length ??
      0;

    const isValidationIntegrated = Boolean(
      validationEvidence &&
        (executionCount > 0 || objectiveCount > 0 || perceptualCount > 0)
    );
    return Object.freeze({
      isValidationIntegrated,
      empiricalOutcomeVerified,
      executionRecordCount: executionCount,
      objectiveEvidenceCount: objectiveCount,
      perceptualEvaluationCount: perceptualCount,
      validationCaseCount: caseCount,
      validationScopeCount: scopeCount,
    });
  }

  /**
   * Deterministically verifies whether empirical post-action outcome evidence exists:
   * 1. At least one completed validation execution whose trace_ref strictly resolves to runTrace.traceId.
   * 2. Non-empty input and output audio integrity references (bit-level digests).
   * 3. At least one linked measurement (ObjectiveEvidenceRecord or PerceptualEvaluationRecord)
   *    whose execution_id resolves to that completed execution.
   */
  private verifyEmpiricalOutcomeProvenance(
    runTrace: RunTrace,
    validationEvidence?: ValidationAuditEvidence
  ): boolean {
    const executions =
      validationEvidence?.executions ?? validationEvidence?.executionRecords ?? [];
    if (executions.length === 0) {
      return false;
    }

    const completedResolvingExecs = executions.filter((e) => {
      const resolves = this.resolvesToTrace(e.trace_ref, runTrace);
      const hasAudioRefs =
        typeof e.input_audio_integrity_ref === "string" &&
        e.input_audio_integrity_ref.trim().length > 0 &&
        typeof e.output_audio_integrity_ref === "string" &&
        e.output_audio_integrity_ref.trim().length > 0;
      const isCompleted = !e.outcome || e.outcome === "COMPLETED";
      return resolves && hasAudioRefs && isCompleted;
    });

    if (completedResolvingExecs.length === 0) {
      return false;
    }

    const objEvidence =
      validationEvidence?.objectiveEvidence ??
      validationEvidence?.objectiveEvidenceRecords;
    const percEvaluations =
      validationEvidence?.perceptualEvaluations ??
      validationEvidence?.perceptualEvaluationRecords;

    const hasResolvingMeasurements =
      (objEvidence?.some((o) =>
        completedResolvingExecs.some((e) => e.execution_id === o.execution_id)
      ) ?? false) ||
      (percEvaluations?.some((p) =>
        completedResolvingExecs.some((e) => e.execution_id === p.execution_id)
      ) ?? false);

    return hasResolvingMeasurements;
  }

  /**
   * Deterministically resolves a trace reference against an audited RunTrace.
   */
  private resolvesToTrace(
    traceRef: string | undefined | null,
    runTrace: RunTrace
  ): boolean {
    if (!traceRef || typeof traceRef !== "string") return false;
    const trimmed = traceRef.trim();
    if (!trimmed) return false;
    if (!runTrace || !runTrace.traceId) return false;

    // Canonical Record 9 contract: ValidationExecutionRecord.trace_ref strictly references runTrace.traceId.
    // runId represents Tone Translator execution run identity, which is semantically distinct from trace identity.
    // URI prefixes such as "ref:trace:" are external reference wrappers, not canonical trace_ref values.
    return trimmed === runTrace.traceId;
  }

  /**
   * Verifies canonical validation evidence linkage and orphan measurement detection (WP-29 Slice 1C).
   *
   * Enforces:
   * 1. Record 9 trace_ref resolution to audited RunTrace.
   * 2. Orphan Rule A: Missing parent execution -> VIOLATION.
   * 3. Orphan Rule B: Parent execution with invalid / unresolvable trace -> VIOLATION / NOT_VERIFIABLE.
   * 4. Orphan Rule C: Scope-level trace coverage; exact decision-level link remains unsupported.
   * 5. Record identity preservation: Records 10 and 11 retain distinct source identity in findings.
   */
  private verifyValidationLinkage(
    runTrace: RunTrace,
    validationEvidence: ValidationAuditEvidence | undefined,
    findings: TraceabilityFinding[]
  ): OrphanedMeasurementSummary {
    if (!validationEvidence) {
      return this.createEmptyOrphanedMeasurementSummary();
    }

    const executions =
      validationEvidence.executions ?? validationEvidence.executionRecords ?? [];
    const objectiveEvidence =
      validationEvidence.objectiveEvidence ?? validationEvidence.objectiveEvidenceRecords ?? [];
    const perceptualEvaluations =
      validationEvidence.perceptualEvaluations ?? validationEvidence.perceptualEvaluationRecords ?? [];
    const validationCases = validationEvidence.validationCases ?? [];
    const validationScopes =
      validationEvidence.validationScopes ?? validationEvidence.validationScopeRecords ?? [];

    if (
      executions.length === 0 &&
      objectiveEvidence.length === 0 &&
      perceptualEvaluations.length === 0
    ) {
      return this.createEmptyOrphanedMeasurementSummary();
    }

    // 1. Index executions and verify Record 9 trace_ref resolution
    const executionsById = new Map<string, ValidationExecutionRecord>();
    const traceContextAvailable = Boolean(runTrace && (runTrace.traceId || runTrace.runId));

    for (const exec of executions) {
      if (!exec || typeof exec !== "object") continue;

      if (!exec.execution_id) {
        findings.push({
          code: "ERR_EXECUTION_ID_MISSING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "ValidationExecutionRecord is missing mandatory execution_id",
          recordKind: "ValidationExecutionRecord",
        });
        continue;
      }

      executionsById.set(exec.execution_id, exec);

      // Verify trace_ref resolution
      const isUnresolvableContext =
        !traceContextAvailable ||
        exec.trace_ref === "UNRESOLVED" ||
        exec.trace_ref === "UNVERIFIABLE" ||
        exec.trace_ref.startsWith("unresolved:") ||
        exec.trace_ref === "PENDING_RESOLUTION";

      if (isUnresolvableContext) {
        findings.push({
          code: "EXECUTION_TRACE_REF_UNRESOLVABLE",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          message: `ValidationExecutionRecord "${exec.execution_id}" trace_ref cannot be resolved: required resolution context is absent or unresolved ("${exec.trace_ref}")`,
          recordKind: "ValidationExecutionRecord",
          recordId: exec.execution_id,
          executionId: exec.execution_id,
        });
      } else if (!this.resolvesToTrace(exec.trace_ref, runTrace)) {
        findings.push({
          code: "EXECUTION_TRACE_REF_INVALID",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: `ValidationExecutionRecord "${exec.execution_id}" trace_ref "${exec.trace_ref}" does not resolve to audited RunTrace (traceId: "${runTrace.traceId}")`,
          recordKind: "ValidationExecutionRecord",
          recordId: exec.execution_id,
          executionId: exec.execution_id,
        });
      }
    }

    // 2. Orphan Evaluation for ObjectiveEvidenceRecord (Record 10) and PerceptualEvaluationRecord (Record 11)
    let totalMeasurements = 0;
    let orphanedCount = 0;
    let ruleA_MissingExecutionCount = 0;
    let ruleB_UnresolvableTraceCount = 0;
    let resolvedMeasurements = 0;
    let unverifiedMeasurements = 0;
    let objectiveOrphanedCount = 0;
    let perceptualOrphanedCount = 0;

    // Evaluate ObjectiveEvidenceRecord
    for (const obj of objectiveEvidence) {
      totalMeasurements++;
      const id = obj.objective_evidence_id;
      const parentExec = executionsById.get(obj.execution_id);

      if (!parentExec) {
        // Orphan Rule A: Missing parent execution
        ruleA_MissingExecutionCount++;
        orphanedCount++;
        objectiveOrphanedCount++;
        findings.push({
          code: "ORPHAN_PARENT_EXECUTION_MISSING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: `ObjectiveEvidenceRecord "${id}" references non-existent parent execution_id "${obj.execution_id}"`,
          recordKind: "ObjectiveEvidenceRecord",
          recordId: id,
          executionId: obj.execution_id,
        });
      } else {
        const isParentUnresolvable =
        !traceContextAvailable ||
        parentExec.trace_ref === "UNRESOLVED" ||
        parentExec.trace_ref === "UNVERIFIABLE" ||
        parentExec.trace_ref.startsWith("unresolved:") ||
        parentExec.trace_ref === "PENDING_RESOLUTION";

      if (isParentUnresolvable) {
        // External context absent -> NOT_VERIFIABLE (not an orphan)
        unverifiedMeasurements++;
        findings.push({
          code: "EXECUTION_TRACE_REF_UNRESOLVABLE",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          message: `ObjectiveEvidenceRecord "${id}" parent execution "${parentExec.execution_id}" trace resolution unresolvable: required external context is unavailable ("${parentExec.trace_ref}")`,
          recordKind: "ObjectiveEvidenceRecord",
          recordId: id,
          executionId: parentExec.execution_id,
        });
      } else if (!this.resolvesToTrace(parentExec.trace_ref, runTrace)) {
        // Orphan Rule B: Parent execution has invalid trace_ref
        ruleB_UnresolvableTraceCount++;
        orphanedCount++;
        objectiveOrphanedCount++;
        findings.push({
          code: "EXECUTION_TRACE_REF_INVALID",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: `ObjectiveEvidenceRecord "${id}" parent execution "${parentExec.execution_id}" trace_ref "${parentExec.trace_ref}" does not resolve to audited RunTrace`,
          recordKind: "ObjectiveEvidenceRecord",
          recordId: id,
          executionId: parentExec.execution_id,
        });
      } else {
        resolvedMeasurements++;
      }
    }
  }

    // Evaluate PerceptualEvaluationRecord
    for (const perc of perceptualEvaluations) {
      totalMeasurements++;
      const id = perc.perceptual_evidence_id;
      const parentExec = executionsById.get(perc.execution_id);

      if (!parentExec) {
        // Orphan Rule A: Missing parent execution
        ruleA_MissingExecutionCount++;
        orphanedCount++;
        perceptualOrphanedCount++;
        findings.push({
          code: "ORPHAN_PARENT_EXECUTION_MISSING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: `PerceptualEvaluationRecord "${id}" references non-existent parent execution_id "${perc.execution_id}"`,
          recordKind: "PerceptualEvaluationRecord",
          recordId: id,
          executionId: perc.execution_id,
        });
      } else {
        const isParentUnresolvable =
        !traceContextAvailable ||
        parentExec.trace_ref === "UNRESOLVED" ||
        parentExec.trace_ref === "UNVERIFIABLE" ||
        parentExec.trace_ref.startsWith("unresolved:") ||
        parentExec.trace_ref === "PENDING_RESOLUTION";

      if (isParentUnresolvable) {
        unverifiedMeasurements++;
        findings.push({
          code: "EXECUTION_TRACE_REF_UNRESOLVABLE",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          message: `PerceptualEvaluationRecord "${id}" parent execution "${parentExec.execution_id}" trace resolution unresolvable: required external context is unavailable ("${parentExec.trace_ref}")`,
          recordKind: "PerceptualEvaluationRecord",
          recordId: id,
          executionId: parentExec.execution_id,
        });
      } else if (!this.resolvesToTrace(parentExec.trace_ref, runTrace)) {
        // Orphan Rule B: Parent execution has invalid trace_ref
        ruleB_UnresolvableTraceCount++;
        orphanedCount++;
        perceptualOrphanedCount++;
        findings.push({
          code: "EXECUTION_TRACE_REF_INVALID",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: `PerceptualEvaluationRecord "${id}" parent execution "${parentExec.execution_id}" trace_ref "${parentExec.trace_ref}" does not resolve to audited RunTrace`,
          recordKind: "PerceptualEvaluationRecord",
          recordId: id,
          executionId: parentExec.execution_id,
        });
      } else {
        resolvedMeasurements++;
      }
    }
  }

    // 3. Orphan Rule C Boundary: Scope-level trace coverage
    // Explicit boundary: Canonical Records 10/11 have no stage_decision_id.
    // Decision-level exact linkage is unsupported. Scope-level linkage uses explicit case/scope records only.
    let scopeCoverageVerifiedCount = 0;
    if (validationCases.length > 0) {
      const casesById = new Map<string, ValidationCase>(
        validationCases.map((c) => [c.case_id, c])
      );
      for (const exec of executions) {
        if (this.resolvesToTrace(exec.trace_ref, runTrace) && casesById.has(exec.case_id)) {
          const caseRecord = casesById.get(exec.case_id)!;
          if (validationScopes.length > 0) {
            // Canonical ValidationScopeRecord.included_units strictly stores validation unit identifiers only
            // (e.g. target gear components/units). Case validation_subject and scoped_boundaries are unit identifiers.
            // profile_id, case_id, and fixture_id belong to distinct identifier domains and are not compared against included_units.
            const inScope = validationScopes.some(
              (s) =>
                s.included_units.includes(caseRecord.validation_subject) ||
                (Array.isArray(caseRecord.scoped_boundaries) &&
                  caseRecord.scoped_boundaries.some((b) => s.included_units.includes(b)))
            );
            if (inScope) {
              scopeCoverageVerifiedCount++;
            }
          } else {
            scopeCoverageVerifiedCount++;
          }
        }
      }
    }

    if (
      validationScopes.length > 0 &&
      scopeCoverageVerifiedCount === 0 &&
      executions.length > 0
    ) {
      findings.push({
        code: "INFO_SCOPE_COVERAGE_UNVERIFIABLE",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
        severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
        message:
          "Scope-level trace coverage between validation scopes and executed units could not be deterministically established",
      });
    }

    return Object.freeze({
      totalMeasurementsChecked: totalMeasurements,
      orphanedCount,
      ruleA_MissingExecutionCount,
      ruleB_UnresolvableTraceCount,
      scopeCoverageVerifiedCount,
      totalMeasurements,
      resolvedMeasurements,
      orphanedMeasurements: orphanedCount,
      unverifiedMeasurements,
      objectiveEvidenceCount: objectiveEvidence.length,
      perceptualEvaluationCount: perceptualEvaluations.length,
      objectiveOrphanedCount,
      perceptualOrphanedCount,
    });
  }

  private createParameterProvenanceCapability(
    summary?: ParameterProvenanceSummary
  ) {
    const notes =
      summary && summary.totalIndexedParameters > 0
        ? `Parameter provenance indexed ${summary.totalIndexedParameters} parameters across ${summary.uniqueKeysCount} keys (Level 3: ${summary.level3Count}, Level 2: ${summary.level2Count}, Level 1: ${summary.level1OnlyCount}, Ambiguous: ${summary.ambiguousKeysCount}).`
        : "Parameter provenance indexer and query APIs active (Level 3 capped).";
    return Object.freeze({
      maxSupportedLevel: MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
      activeLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
      notes,
    });
  }
}

/**
 * Functional entry point to perform a TraceabilityAuditor audit.
 */
export function auditTraceability(
  runTraceOrOptions:
    | RunTrace
    | {
        runTrace?: RunTrace;
        validationEvidence?: ValidationAuditEvidence;
        parameterIndex?: ParameterProvenanceIndex;
      },
  options?: TraceabilityAuditorOptions,
  validationEvidence?: ValidationAuditEvidence
): TraceabilityAuditReport {
  if (
    runTraceOrOptions &&
    typeof runTraceOrOptions === "object" &&
    ("runTrace" in runTraceOrOptions || "validationEvidence" in runTraceOrOptions) &&
    !("checkpoints" in runTraceOrOptions)
  ) {
    const runTrace = (runTraceOrOptions as any).runTrace;
    const effectiveEvidence =
      (runTraceOrOptions as any).validationEvidence ?? validationEvidence ?? options?.validationEvidence;
    const auditor = new TraceabilityAuditor(options);
    return auditor.audit(runTrace, effectiveEvidence);
  }

  const auditor = new TraceabilityAuditor(options);
  const effectiveEvidence = validationEvidence ?? options?.validationEvidence;
  return auditor.audit(runTraceOrOptions as RunTrace, effectiveEvidence);
}

