// src/tests/traceabilityAuditor.test.ts
// Focused unit tests for WP-29 Slice 1B: Core Traceability Auditor & RunTrace Verification.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STREAMS,
  SOUND_ENGINEER_LAYERS,
  CHECKPOINT_STATUSES,
  createCheckpointEnvelope,
  createCheckpointDiagnostic,
  DIAGNOSTIC_SEVERITIES,
  createArtifactReference,
  ARTIFACT_TYPES,
  createRunTraceRecorder,
  RunTrace,
  createEvidenceRecord,
  createEvidenceArtifactReference,
  createEngineeringDecisionRecord,
  createDecisionArtifactReference,
  createSemanticToneDesign,
  createSemanticDesignArtifactReference,
  createValidationReport,
  createValidationArtifactReference,
  createPlatformTranslationPlan,
  createPlatformTranslationArtifactReference,
} from "../sound-engineer";

import {
  TraceabilityAuditor,
  auditTraceability,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_CATEGORIES,
  STAGE_REPRESENTATION_STRENGTHS,
  PRINCIPLE_AUDIT_STATES,
  PRINCIPLE_AUDIT_STRENGTHS,
  getLifecycleStageMetadata,
} from "../sound-engineer/validation/traceability";

/**
 * Builds a valid, complete 6-layer RunTrace for clean audit baseline testing.
 */
export function createCleanTrace(runId = "run_test_clean"): RunTrace {
  const stream = EXECUTION_STREAMS.SHADOW;
  const recorder = createRunTraceRecorder({ runId, stream });

  // 1. INPUT Checkpoint
  const inputArtifact = createArtifactReference({
    artifactId: `snap_${runId}`,
    artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
    contractVersion: "1.0.0",
    producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
  });
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.000Z",
      completedAt: "2026-10-20T12:00:00.010Z",
      output: inputArtifact,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "INPUT_INGESTED",
          message: "User text prompt and audio provenance captured into immutable snapshot",
          source: "InputIngestionStage",
        }),
      ],
    })
  );

  // 2. EVIDENCE Checkpoint
  const evidenceRecord = createEvidenceRecord({
    runId,
    stream,
    sources: [inputArtifact],
    acousticCharacteristics: {
      spectralBalance: { lowEnd: "Tight sub-100Hz", highMids: "Aggressive 2.5kHz bite" },
      dynamicResponse: { transientAttack: "Punchy, fast pick definition" },
    },
    confidence: 0.95,
    uncertainties: ["Single channel mono reference"],
  });
  const evidenceRef = createEvidenceArtifactReference(evidenceRecord);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.011Z",
      completedAt: "2026-10-20T12:00:00.030Z",
      inputs: [inputArtifact],
      output: evidenceRef,
      payload: evidenceRecord,
    })
  );

  // 3. ENGINEERING Checkpoint
  const decisionRecord = createEngineeringDecisionRecord({
    runId,
    stream,
    evidenceReference: evidenceRef,
    overallObjective: "Construct tight 80s lead tone with rich tube saturation",
    decisions: [
      {
        decisionId: "dec_pre_tighten",
        category: "PRE_GAIN_SHAPING",
        purpose: "Tighten low end before preamp distortion",
        intent: "High-pass below 100Hz to prevent bass flub",
        rationale: "Evidence displays tight low end with clear pick articulation",
        constraints: ["Preserve low-mid warmth at 400Hz"],
        tradeOffs: ["Slight reduction in extreme sub-bass thump"],
      },
    ],
    confidence: 0.92,
  });
  const decisionRef = createDecisionArtifactReference(decisionRecord);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.031Z",
      completedAt: "2026-10-20T12:00:00.060Z",
      inputs: [evidenceRef],
      output: decisionRef,
      payload: decisionRecord,
    })
  );

  // 4. SEMANTIC_DESIGN Checkpoint
  const semanticDesign = createSemanticToneDesign({
    runId,
    stream,
    decisionRecordReference: decisionRef,
    topology: { routingType: "SERIES" },
    stages: [
      {
        stageId: "stg_filter",
        stageIndex: 0,
        role: "PRE_FILTER",
        designIntent: "High-pass 100Hz roll-off",
        frequencyStrategy: { lowCutHz: 100 },
        constraints: ["12dB/octave slope"],
      },
    ],
  });
  const semanticRef = createSemanticDesignArtifactReference(semanticDesign);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.061Z",
      completedAt: "2026-10-20T12:00:00.080Z",
      inputs: [decisionRef],
      output: semanticRef,
      payload: semanticDesign,
    })
  );

  // 5. VALIDATION Checkpoint
  const validationReport = createValidationReport({
    runId,
    stream,
    targetArtifact: semanticRef,
    overallStatus: "PASS",
  });
  const validationRef = createValidationArtifactReference(validationReport);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.VALIDATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.081Z",
      completedAt: "2026-10-20T12:00:00.100Z",
      inputs: [inputArtifact, semanticRef],
      output: validationRef,
      payload: validationReport,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "GOVERNED_REVIEW_RECORD_SEALED",
          message: "Governed review completed without quarantined lessons",
          source: "EngineeringReviewStage",
        }),
      ],
    })
  );

  // 6. PLATFORM_TRANSLATION Checkpoint
  const translationPlan = createPlatformTranslationPlan({
    runId,
    stream,
    semanticDesignReference: semanticRef,
    validationReportReference: validationRef,
    targetPlatform: {
      platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
      formatFamily: "DAW_PLUGIN",
    },
    translationDecisions: [
      {
        stageId: "stg_filter",
        semanticRole: "PRE_FILTER",
        mappingDecision: {
          targetDeviceId: "pedal_eq",
          targetDeviceName: "Graphic EQ",
          deviceCategory: "stomp",
        },
        rationale: "Matched 100Hz high pass filter slope",
        confidence: 0.95,
      },
    ],
    substitutions: [],
    unresolvedMappings: [],
    capabilityLimitations: [],
  });
  const translationRef = createPlatformTranslationArtifactReference(translationPlan);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-20T12:00:00.101Z",
      completedAt: "2026-10-20T12:00:00.120Z",
      inputs: [semanticRef, validationRef],
      output: translationRef,
      payload: translationPlan,
    })
  );

  return recorder.getTraceSnapshot();
}

describe("WP-29 Slice 1B: Core Traceability Auditor & RunTrace Verification", () => {
  const auditor = new TraceabilityAuditor();

  // 1. Clean trace verification
  it("1. Clean trace: produces expected structural/evidence results without false substantive engineering claims", () => {
    const trace = createCleanTrace();
    const report = auditor.audit(trace);

    assert.equal(report.traceId, trace.traceId);
    assert.equal(report.runId, trace.runId);
    // In RunTrace-only audit, P18 cannot be verified (empirical post-action audio receipts absent from RunTrace),
    // which correctly prevents TRACE_COMPLIANCE_VERIFIED and yields TRACE_COMPLIANCE_NOT_VERIFIABLE
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
    assert.equal(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);

    // Verify 14 lifecycle stages coverage populated
    assert.equal(report.lifecycleCoverage.length, 14);

    // Verify 21 principle results populated
    assert.equal(report.principleResults.length, 21);

    // Check P1 (Evidence Precedes Diagnosis)
    const p1 = report.principleResults.find((p) => p.principleNumber === 1)!;
    assert.equal(p1.state, PRINCIPLE_AUDIT_STATES.SATISFIED);
    assert.equal(p1.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE);

    // Check P2 (Observation Is Not Interpretation - EVIDENCE_PRESENT)
    const p2 = report.principleResults.find((p) => p.principleNumber === 2)!;
    assert.equal(p2.state, PRINCIPLE_AUDIT_STATES.SATISFIED);
    assert.ok(p2.notes?.includes("Substantive spectral accuracy not independently evaluated"));

    // Check P4 (Symptom Does Not Identify Its Cause - DELEGATED_UPSTREAM)
    const p4 = report.principleResults.find((p) => p.principleNumber === 4)!;
    assert.equal(p4.state, PRINCIPLE_AUDIT_STATES.DELEGATED);
    assert.notEqual(p4.state, PRINCIPLE_AUDIT_STATES.SATISFIED);
    assert.ok(p4.notes?.includes("delegated to upstream reasoning engine"));

    // Check P18 (Evaluate Outcomes Honestly Without Circular Justification)
    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
    assert.equal(p18.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE);
    assert.ok(p18.notes?.includes("RunTrace alone does not expose post-action empirical audio outcome evidence"));
  });

  // 2. Broken sequence index monotonicity
  it("2. Broken sequence: emits factual VIOLATION and TRACE_COMPLIANCE_DEFICIENT", () => {
    const clean = createCleanTrace("run_broken_seq");

    // Corrupt sequenceIndex on checkpoint 2 to break monotonicity (e.g. sequence is 0, 1, 9, 3, 4, 5)
    const corruptedCheckpoints = clean.checkpoints.map((entry, idx) => {
      if (idx === 2) {
        return {
          ...entry,
          sequenceIndex: 9, // Jump in sequence ordering
        };
      }
      return entry;
    });

    const brokenTrace: RunTrace = {
      ...clean,
      checkpoints: corruptedCheckpoints,
    };

    const report = auditor.audit(brokenTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.equal(report.allAuditableInvariantsPassed, false);

    const seqViolations = report.findings.filter(
      (f) =>
        f.code === "ERR_SEQ_NON_MONOTONIC" &&
        f.type === TRACEABILITY_FINDING_TYPES.VIOLATION &&
        f.severity === TRACEABILITY_FINDING_SEVERITIES.CRITICAL
    );
    assert.ok(seqViolations.length > 0, "Should emit at least one ERR_SEQ_NON_MONOTONIC violation");
  });

  // 3. Missing required envelope
  it("3. Missing required envelope: emits NOT_VERIFIABLE and TRACE_COMPLIANCE_NOT_VERIFIABLE", () => {
    const clean = createCleanTrace("run_missing_envelope");

    // Remove the PLATFORM_TRANSLATION envelope
    const filteredCheckpoints = clean.checkpoints.filter(
      (e) => e.checkpoint.layer !== SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION
    );

    const missingEnvelopeTrace: RunTrace = {
      ...clean,
      checkpointCount: filteredCheckpoints.length,
      checkpoints: filteredCheckpoints,
    };

    const report = auditor.audit(missingEnvelopeTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);

    const missingFindings = report.findings.filter(
      (f) =>
        f.code === "WARN_REQUIRED_ENVELOPE_MISSING_PLATFORM_TRANSLATION" &&
        f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE &&
        f.severity === TRACEABILITY_FINDING_SEVERITIES.CRITICAL
    );
    assert.equal(missingFindings.length, 1);
  });

  // 4. Missing reference vs Wrong reference distinction
  it("4. Reference verification: correctly distinguishes VIOLATION (wrong reference) from NOT_VERIFIABLE (unsupplied reference)", () => {
    // 4A: Wrong concrete reference -> positive VIOLATION
    const cleanA = createCleanTrace("run_wrong_ref");
    const corruptedCheckpointsA = cleanA.checkpoints.map((entry) => {
      if (entry.checkpoint.layer === SOUND_ENGINEER_LAYERS.ENGINEERING) {
        const payload = entry.checkpoint.payload as any;
        return {
          ...entry,
          checkpoint: {
            ...entry.checkpoint,
            payload: {
              ...payload,
              evidenceReference: {
                ...payload.evidenceReference,
                artifactId: "evi_non_existent_wrong_id", // Mismatched reference
              },
            },
          },
        };
      }
      return entry;
    });

    const wrongRefTrace: RunTrace = { ...cleanA, checkpoints: corruptedCheckpointsA };
    const reportA = auditor.audit(wrongRefTrace);

    assert.equal(reportA.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const mismatchFinding = reportA.findings.find((f) => f.code === "ERR_P1_EVIDENCE_REF_MISMATCH");
    assert.ok(mismatchFinding, "Should emit ERR_P1_EVIDENCE_REF_MISMATCH");
    assert.equal(mismatchFinding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(mismatchFinding.category, TRACEABILITY_FINDING_CATEGORIES.LINEAGE);

    // 4B: Unsupplied output reference -> NOT_VERIFIABLE
    const cleanB = createCleanTrace("run_unsupplied_ref");
    const corruptedCheckpointsB = cleanB.checkpoints.map((entry) => {
      if (entry.checkpoint.layer === SOUND_ENGINEER_LAYERS.EVIDENCE) {
        return {
          ...entry,
          checkpoint: {
            ...entry.checkpoint,
            output: undefined, // Upstream reference evidence omitted/unsupplied
          },
        };
      }
      return entry;
    });

    const unsuppliedRefTrace: RunTrace = { ...cleanB, checkpoints: corruptedCheckpointsB };
    const reportB = auditor.audit(unsuppliedRefTrace);

    assert.equal(reportB.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    const unsuppliedFinding = reportB.findings.find((f) => f.code === "WARN_P1_EVIDENCE_OUTPUT_ABSENT");
    assert.ok(unsuppliedFinding, "Should emit WARN_P1_EVIDENCE_OUTPUT_ABSENT");
    assert.equal(unsuppliedFinding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
  });

  // 5. Delegated principles stay DELEGATED
  it("5. Delegated principles: remain DELEGATED and never convert to SATISFIED simply from rationale existence", () => {
    const trace = createCleanTrace("run_delegated");
    const report = auditor.audit(trace);

    const delegatedPrincipleNumbers = [4, 5, 6, 10, 11, 14, 17, 21];
    for (const num of delegatedPrincipleNumbers) {
      const p = report.principleResults.find((item) => item.principleNumber === num)!;
      assert.equal(
        p.state,
        PRINCIPLE_AUDIT_STATES.DELEGATED,
        `Principle ${num} (${p.title}) must have state DELEGATED`
      );
      assert.notEqual(
        p.state,
        PRINCIPLE_AUDIT_STATES.SATISFIED,
        `Principle ${num} must never be converted to SATISFIED`
      );
    }
  });

  // 6. Grouped stages are not claimed as independently exact
  it("6. Grouped stages: Stages 04, 05, and 07 remain GROUPED", () => {
    const trace = createCleanTrace("run_grouped");
    const report = auditor.audit(trace);

    const stg4 = report.lifecycleCoverage.find((s) => s.stageNumber === 4)!;
    assert.equal(stg4.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);
    assert.ok(stg4.details?.includes("Grouped inside ENGINEERING layer"));

    const stg5 = report.lifecycleCoverage.find((s) => s.stageNumber === 5)!;
    assert.equal(stg5.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);

    const stg7 = report.lifecycleCoverage.find((s) => s.stageNumber === 7)!;
    assert.equal(stg7.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);

    // Derived stages remain DERIVED
    const stg8 = report.lifecycleCoverage.find((s) => s.stageNumber === 8)!;
    assert.equal(stg8.representation, STAGE_REPRESENTATION_STRENGTHS.DERIVED);

    // Stages 1 and 12 are EXACT
    const stg1 = report.lifecycleCoverage.find((s) => s.stageNumber === 1)!;
    assert.equal(stg1.representation, STAGE_REPRESENTATION_STRENGTHS.EXACT);

    const stg12 = report.lifecycleCoverage.find((s) => s.stageNumber === 12)!;
    assert.equal(stg12.representation, STAGE_REPRESENTATION_STRENGTHS.EXACT);

    // Stage 11 is DERIVED (EngineeringDecisionRecord directly represented; PredictedOutcomeRecord not separately persisted)
    const stg11 = report.lifecycleCoverage.find((s) => s.stageNumber === 11)!;
    assert.equal(stg11.representation, STAGE_REPRESENTATION_STRENGTHS.DERIVED);
    assert.ok(stg11.details?.includes("Derived representation"));
  });

  // 7. Stage 06 remains NOT_REPRESENTED
  it("7. Stage 06: remains NOT_REPRESENTED and presentInTrace is false", () => {
    const trace = createCleanTrace("run_stg6");
    const report = auditor.audit(trace);

    const stg6 = report.lifecycleCoverage.find((s) => s.stageNumber === 6)!;
    assert.equal(stg6.stageNumber, 6);
    assert.equal(stg6.representation, STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED);
    assert.equal(stg6.presentInTrace, false);
    assert.ok(stg6.details?.includes("Not represented in current runtime contracts"));
  });

  // 8. RunTrace integrity boundary: structural, not cryptographic
  it("8. RunTrace integrity: evaluates runtime structural integrity without cryptographic claims", () => {
    const trace = createCleanTrace("run_structural");
    const report = auditor.audit(trace);

    // Confirm no cryptographic hash/signature findings are required or evaluated
    assert.equal(
      report.findings.filter((f) => f.code.includes("HASH") || f.code.includes("CRYPTO")).length,
      0
    );
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
  });

  // 9. P20 Guardrail: evidence-presence semantics only
  it("9. P20 Guardrail: verifies deliberation record presence without claiming substantive acoustic sufficiency", () => {
    const trace = createCleanTrace("run_p20");
    const report = auditor.audit(trace);

    const p20 = report.principleResults.find((p) => p.principleNumber === 20)!;
    assert.equal(p20.state, PRINCIPLE_AUDIT_STATES.SATISFIED);
    assert.equal(p20.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT);
    assert.ok(p20.notes?.includes("P20 Guardrail"));
    assert.ok(p20.notes?.includes("Does NOT independently certify that every substantive judgement was acoustically sufficient"));
  });

  // 10. Timestamp causal inversion check
  it("10. Timestamp inversion: detects completedAt prior to startedAt as VIOLATION", () => {
    const clean = createCleanTrace("run_inverted_time");
    const corruptedCheckpoints = clean.checkpoints.map((entry, idx) => {
      if (idx === 1) {
        return {
          ...entry,
          checkpoint: {
            ...entry.checkpoint,
            startedAt: "2026-10-20T12:00:00.050Z",
            completedAt: "2026-10-20T12:00:00.010Z", // Inverted! completed before started
          },
        };
      }
      return entry;
    });

    const invertedTrace: RunTrace = { ...clean, checkpoints: corruptedCheckpoints };
    const report = auditor.audit(invertedTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const timeFinding = report.findings.find((f) => f.code === "ERR_TIMESTAMP_INVERTED_CHECKPOINT");
    assert.ok(timeFinding);
    assert.equal(timeFinding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 11. P7: Context vs evidence conflation check
  it("11. P7: detects conflation when INPUT context and EVIDENCE share identical artifact identity", () => {
    const clean = createCleanTrace("run_conflated_p7");
    const corruptedCheckpoints = clean.checkpoints.map((entry) => {
      if (entry.checkpoint.layer === SOUND_ENGINEER_LAYERS.EVIDENCE) {
        return {
          ...entry,
          checkpoint: {
            ...entry.checkpoint,
            output: {
              artifactId: `snap_${clean.runId}`, // Same ID as INPUT artifact!
              artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
              contractVersion: "1.0.0",
              producingLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
            },
          },
        };
      }
      return entry;
    });

    const conflatedTrace: RunTrace = { ...clean, checkpoints: corruptedCheckpoints };
    const report = auditor.audit(conflatedTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const p7Finding = report.findings.find((f) => f.code === "ERR_P7_CONTEXT_EVIDENCE_CONFLATED");
    assert.ok(p7Finding);
    assert.equal(p7Finding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 12. P12 & P15: Platform translation ordering checks
  it("12. P12 & P15: emits VIOLATION if platform translation precedes engineering or semantic design", () => {
    const clean = createCleanTrace("run_translation_order");

    // Put PLATFORM_TRANSLATION at sequence 1, before ENGINEERING (sequence 2) and SEMANTIC_DESIGN (sequence 3)
    const ptpEntry = clean.checkpoints.find((e) => e.checkpoint.layer === SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION)!;
    const otherEntries = clean.checkpoints.filter((e) => e.checkpoint.layer !== SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION);

    const reorderedCheckpoints = [
      otherEntries[0], // INPUT (seq 0)
      { ...ptpEntry, sequenceIndex: 1 }, // PLATFORM_TRANSLATION (seq 1)
      { ...otherEntries[1], sequenceIndex: 2 }, // EVIDENCE (seq 2)
      { ...otherEntries[2], sequenceIndex: 3 }, // ENGINEERING (seq 3)
      { ...otherEntries[3], sequenceIndex: 4 }, // SEMANTIC_DESIGN (seq 4)
      { ...otherEntries[4], sequenceIndex: 5 }, // VALIDATION (seq 5)
    ];

    const reorderedTrace: RunTrace = { ...clean, checkpoints: reorderedCheckpoints };
    const report = auditor.audit(reorderedTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const p12Finding = report.findings.find((f) => f.code === "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING");
    assert.ok(p12Finding, "Should emit ERR_P12_TRANSLATION_PRECEDES_ENGINEERING");

    const p15Finding = report.findings.find((f) => f.code === "ERR_P15_ORDERING_INVERTED");
    assert.ok(p15Finding, "Should emit ERR_P15_ORDERING_INVERTED");
  });

  // 13. Deep immutability of audit report
  it("13. Immutability: audit report is frozen and caller-owned RunTrace is not mutated", () => {
    const trace = createCleanTrace("run_immutability");
    const traceOriginalCheckpointCount = trace.checkpoints.length;

    const report = auditTraceability(trace);

    assert.ok(Object.isFrozen(report), "Report must be frozen");
    assert.ok(Object.isFrozen(report.findings), "Findings must be frozen");
    assert.ok(Object.isFrozen(report.lifecycleCoverage), "Lifecycle coverage must be frozen");
    assert.ok(Object.isFrozen(report.principleResults), "Principle results must be frozen");

    // Attempting mutation must fail
    assert.throws(() => {
      (report as any).verdict = "MUTATED";
    });

    // Caller's trace must be unaltered
    assert.equal(trace.checkpoints.length, traceOriginalCheckpointCount);
  });

  // 14. 14-Stage representation matrix verification
  it("14. Lifecycle representation matrix: verifies exact representation strengths for Stages 01 through 14", () => {
    const trace = createCleanTrace("run_matrix_check");
    const report = auditor.audit(trace);

    const expectedStrengths: Record<number, string> = {
      1: STAGE_REPRESENTATION_STRENGTHS.EXACT,
      2: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      3: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      4: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
      5: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
      6: STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED,
      7: STAGE_REPRESENTATION_STRENGTHS.GROUPED,
      8: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      9: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      10: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      11: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      12: STAGE_REPRESENTATION_STRENGTHS.EXACT,
      13: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
      14: STAGE_REPRESENTATION_STRENGTHS.DERIVED,
    };

    const expectedNames: Record<number, string> = {
      1: "INTENT_INTAKE",
      2: "CASE_EVIDENCE_ASSESSMENT",
      3: "OBSERVATION_FORMATION",
      4: "HYPOTHESIS_GENERATION",
      5: "HYPOTHESIS_EVALUATION_AND_COMPETITION",
      6: "DISCRIMINATING_EVIDENCE_CHECK",
      7: "CAUSAL_DIAGNOSIS",
      8: "ENGINEERING_REQUIREMENT_FORMATION",
      9: "CANDIDATE_INTERVENTION_GENERATION",
      10: "CONSTRAINT_AND_TRADE_OFF_ANALYSIS",
      11: "ENGINEERING_DECISION_AND_PREDICTION",
      12: "SEMANTIC_TONE_DESIGN_HANDOFF",
      13: "OUTCOME_EVIDENCE_INGESTION",
      14: "ENGINEERING_REVIEW_AND_ITERATION",
    };

    for (let stg = 1; stg <= 14; stg++) {
      const entry = report.lifecycleCoverage.find((s) => s.stageNumber === stg)!;
      assert.ok(entry, `Stage ${stg} must be present in report`);
      assert.equal(
        entry.stageName,
        expectedNames[stg],
        `Stage ${stg} canonical name must be ${expectedNames[stg]}, observed ${entry.stageName}`
      );
      assert.equal(
        entry.representation,
        expectedStrengths[stg],
        `Stage ${stg} representation must be ${expectedStrengths[stg]}, observed ${entry.representation}`
      );

      const meta = getLifecycleStageMetadata(stg)!;
      assert.equal(
        meta.stageName,
        expectedNames[stg],
        `LifecycleStageMetadata for stage ${stg} canonical name must be ${expectedNames[stg]}`
      );
      assert.equal(
        meta.representationStrength,
        expectedStrengths[stg],
        `LifecycleStageMetadata for stage ${stg} must be ${expectedStrengths[stg]}`
      );
    }

    // Explicitly verify PLATFORM_TRANSLATION runtime layer does NOT become Stage 13
    assert.equal(expectedNames[13], "OUTCOME_EVIDENCE_INGESTION");
    assert.notEqual(expectedNames[13], "PLATFORM_TRANSLATION");
    const stg13Meta = getLifecycleStageMetadata(13)!;
    assert.equal(stg13Meta.stageName, "OUTCOME_EVIDENCE_INGESTION");
    assert.notEqual(stg13Meta.stageName, "PLATFORM_TRANSLATION");
  });

  // 15. P18 RunTrace-only verification: capability classification vs runtime result
  it("15. P18 verification: principle capability remains STRUCTURALLY_VERIFIABLE while RunTrace-only result is NOT_VERIFIABLE", () => {
    const trace = createCleanTrace("run_p18_truth");
    const report = auditor.audit(trace);

    const p18 = report.principleResults.find((p) => p.principleNumber === 18)!;
    // Architecture defines P18 capability as STRUCTURALLY_VERIFIABLE
    assert.equal(p18.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE);
    // But actual RunTrace-only runtime evaluation result is NOT_VERIFIABLE
    assert.equal(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);
    assert.notEqual(p18.state, PRINCIPLE_AUDIT_STATES.SATISFIED);

    const p18Finding = report.findings.find(
      (f) => f.code === "INFO_P18_AUDIO_RECEIPTS_UNVERIFIABLE"
    );
    assert.ok(p18Finding);
    assert.equal(p18Finding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
    assert.equal(p18Finding.severity, TRACEABILITY_FINDING_SEVERITIES.INFO);
  });

  // 16. Verdict derivation: INFO-severity NOT_VERIFIABLE finding prevents TRACE_COMPLIANCE_VERIFIED
  it("16. Verdict derivation: severity is descriptive only; INFO NOT_VERIFIABLE prevents TRACE_COMPLIANCE_VERIFIED", () => {
    const trace = createCleanTrace("run_verdict_severity");
    const report = auditor.audit(trace);

    // There are zero VIOLATION findings in the clean trace
    const violations = report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(violations.length, 0);

    // The findings contain only an INFO-severity NOT_VERIFIABLE finding (P18 audio receipts unsupplied)
    const notVerifiableFindings = report.findings.filter(
      (f) => f.type === TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE
    );
    assert.ok(notVerifiableFindings.length > 0);
    assert.ok(notVerifiableFindings.every((f) => f.severity === TRACEABILITY_FINDING_SEVERITIES.INFO));

    // Must yield TRACE_COMPLIANCE_NOT_VERIFIABLE, NOT TRACE_COMPLIANCE_VERIFIED
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
  });

  // 17. Sequence behavior: validates contiguous zero-based sequence according to authoritative contract
  it("17. Sequence contract: rejects absent, malformed, duplicates, inversions, and gaps with correct classification", () => {
    const clean = createCleanTrace("run_seq_contract");

    // Case 0: Valid contiguous sequence (0, 1, 2, 3, 4, 5) — zero sequence-related findings
    const reportClean = auditor.audit(clean);
    assert.ok(
      !reportClean.findings.some(
        (f) =>
          f.code === "ERR_SEQ_ABSENT" ||
          f.code === "ERR_SEQ_MALFORMED_TYPE" ||
          f.code === "ERR_SEQ_NON_MONOTONIC"
      ),
      "Clean trace must have zero sequence findings"
    );

    // Case A: Absent sequenceIndex (undefined / null) -> NOT_VERIFIABLE (ERR_SEQ_ABSENT)
    const absentTrace: RunTrace = {
      ...clean,
      checkpoints: clean.checkpoints.map((entry, idx) =>
        idx === 2 ? { ...entry, sequenceIndex: undefined as any } : entry
      ),
    };
    const reportAbsent = auditor.audit(absentTrace);
    assert.equal(reportAbsent.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    const absentFinding = reportAbsent.findings.find((f) => f.code === "ERR_SEQ_ABSENT");
    assert.ok(absentFinding, "Should emit ERR_SEQ_ABSENT when sequenceIndex is missing");
    assert.equal(absentFinding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);

    // Case B: Malformed / non-numeric sequenceIndex (string "invalid") -> VIOLATION (ERR_SEQ_MALFORMED_TYPE)
    const malformedTrace: RunTrace = {
      ...clean,
      checkpoints: clean.checkpoints.map((entry, idx) =>
        idx === 1 ? { ...entry, sequenceIndex: "invalid" as any } : entry
      ),
    };
    const reportMalformed = auditor.audit(malformedTrace);
    assert.equal(reportMalformed.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const malformedFinding = reportMalformed.findings.find((f) => f.code === "ERR_SEQ_MALFORMED_TYPE");
    assert.ok(malformedFinding, "Should emit ERR_SEQ_MALFORMED_TYPE for non-numeric sequenceIndex");
    assert.equal(malformedFinding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);

    // Case C: Duplicate sequenceIndex (0, 1, 1, 3, 4, 5) -> VIOLATION (ERR_SEQ_NON_MONOTONIC)
    const duplicateTrace: RunTrace = {
      ...clean,
      checkpoints: clean.checkpoints.map((entry, idx) => (idx === 2 ? { ...entry, sequenceIndex: 1 } : entry)),
    };
    const reportDup = auditor.audit(duplicateTrace);
    assert.equal(reportDup.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.ok(reportDup.findings.some((f) => f.code === "ERR_SEQ_NON_MONOTONIC" && f.type === TRACEABILITY_FINDING_TYPES.VIOLATION));

    // Case D: Decreasing / inverted sequenceIndex (0, 2, 1, 3, 4, 5) -> VIOLATION (ERR_SEQ_NON_MONOTONIC)
    const decreasingTrace: RunTrace = {
      ...clean,
      checkpoints: clean.checkpoints.map((entry, idx) => {
        if (idx === 1) return { ...entry, sequenceIndex: 2 };
        if (idx === 2) return { ...entry, sequenceIndex: 1 };
        return entry;
      }),
    };
    const reportDec = auditor.audit(decreasingTrace);
    assert.equal(reportDec.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.ok(reportDec.findings.some((f) => f.code === "ERR_SEQ_NON_MONOTONIC" && f.type === TRACEABILITY_FINDING_TYPES.VIOLATION));

    // Case E: Numeric gap (0, 1, 3, 4, 5) — rejected because RunTrace contract is strict contiguous 0-based
    const gapCheckpoints = [
      clean.checkpoints[0], // 0
      clean.checkpoints[1], // 1
      { ...clean.checkpoints[2], sequenceIndex: 3 }, // Gap from 1 to 3
      { ...clean.checkpoints[3], sequenceIndex: 4 },
      { ...clean.checkpoints[4], sequenceIndex: 5 },
    ];
    const gapTrace: RunTrace = {
      ...clean,
      checkpointCount: gapCheckpoints.length,
      checkpoints: gapCheckpoints,
    };
    const reportGap = auditor.audit(gapTrace);
    assert.equal(reportGap.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    const gapViolation = reportGap.findings.find((f) => f.code === "ERR_SEQ_NON_MONOTONIC");
    assert.ok(gapViolation, "Should emit ERR_SEQ_NON_MONOTONIC for gap");
    assert.equal(gapViolation.type, TRACEABILITY_FINDING_TYPES.VIOLATION);
  });

  // 18. Early-terminal FAILED trace semantics
  it("18. Early-terminal FAILED trace: preserves partial coverage, avoids false violations, yields TRACE_COMPLIANCE_NOT_VERIFIABLE", () => {
    const clean = createCleanTrace("run_failed_early");

    // Execution halted after EVIDENCE layer (only 2 checkpoints recorded: INPUT and EVIDENCE)
    const partialCheckpoints = clean.checkpoints.slice(0, 2);
    const failedTrace: RunTrace = {
      ...clean,
      status: "FAILED" as any,
      checkpointCount: partialCheckpoints.length,
      checkpoints: partialCheckpoints,
    };

    const report = auditor.audit(failedTrace);

    // Must NOT be verified for Gate-8 production candidate
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);

    // Must NOT emit structural VIOLATIONS for legally unexecuted downstream envelopes
    const violations = report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION);
    assert.equal(violations.length, 0, "Early terminal trace without defects must have zero VIOLATIONS");

    // Emits informative finding about early termination
    assert.ok(report.findings.some((f) => f.code === "INFO_EARLY_TERMINATION_FAILED"));

    // Factual lifecycle coverage is preserved up to termination point
    const stg1 = report.lifecycleCoverage.find((s) => s.stageNumber === 1)!;
    assert.equal(stg1.presentInTrace, true);

    const stg2 = report.lifecycleCoverage.find((s) => s.stageNumber === 2)!;
    assert.equal(stg2.presentInTrace, true);

    const stg3 = report.lifecycleCoverage.find((s) => s.stageNumber === 3)!;
    assert.equal(stg3.presentInTrace, true);

    // Unreached downstream stages are marked not present with truthful explanation
    const stg4 = report.lifecycleCoverage.find((s) => s.stageNumber === 4)!;
    assert.equal(stg4.presentInTrace, false);
    assert.ok(stg4.details?.includes('Not reached: trace terminated early with status "FAILED"'));

    const stg11 = report.lifecycleCoverage.find((s) => s.stageNumber === 11)!;
    assert.equal(stg11.presentInTrace, false);
    assert.ok(stg11.details?.includes('Not reached: trace terminated early with status "FAILED"'));
  });

  // 19. Early-terminal CANCELLED trace semantics
  it("19. Early-terminal CANCELLED trace: preserves partial coverage and yields TRACE_COMPLIANCE_NOT_VERIFIABLE", () => {
    const clean = createCleanTrace("run_cancelled_early");

    // Execution cancelled after INPUT layer
    const partialCheckpoints = clean.checkpoints.slice(0, 1);
    const cancelledTrace: RunTrace = {
      ...clean,
      status: "CANCELLED" as any,
      checkpointCount: partialCheckpoints.length,
      checkpoints: partialCheckpoints,
    };

    const report = auditor.audit(cancelledTrace);

    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(report.allAuditableInvariantsPassed, false);
    assert.equal(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);

    // Stage 1 present, Stage 2 unreached
    const stg1 = report.lifecycleCoverage.find((s) => s.stageNumber === 1)!;
    assert.equal(stg1.presentInTrace, true);

    const stg2 = report.lifecycleCoverage.find((s) => s.stageNumber === 2)!;
    assert.equal(stg2.presentInTrace, false);
    assert.ok(stg2.details?.includes('Not reached: trace terminated early with status "CANCELLED"'));
  });

  // 20. Early-terminal with factual violation: DEFICIENT takes precedence
  it("20. Early-terminal with factual violation: DEFICIENT takes precedence over NOT_VERIFIABLE", () => {
    const clean = createCleanTrace("run_failed_with_violation");

    // Execution halted after 2 checkpoints, but checkpoint 1 has sequenceIndex corrupted (gap)
    const corruptedPartialCheckpoints = [
      clean.checkpoints[0], // seq 0
      { ...clean.checkpoints[1], sequenceIndex: 5 }, // Corrupted seq 5 instead of 1
    ];

    const failedBrokenTrace: RunTrace = {
      ...clean,
      status: "FAILED" as any,
      checkpointCount: corruptedPartialCheckpoints.length,
      checkpoints: corruptedPartialCheckpoints,
    };

    const report = auditor.audit(failedBrokenTrace);

    // Precedence rule: factual VIOLATION forces TRACE_COMPLIANCE_DEFICIENT
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.equal(report.allAuditableInvariantsPassed, false);
    assert.ok(report.findings.some((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION));
  });
});
