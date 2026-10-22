// src/tests/traceabilityQueryAndExport.test.ts
// WP-29 Stage 2 Slice 1F: Audit Trail Query & Export Utility Tests
// Focused unit tests verifying factual query APIs, rationale lookups, deterministic exports,
// capability limits, and immutability.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  TraceabilityQueryEngine,
  TRACEABILITY_QUERY_STATUSES,
  exportTraceabilityAuditDto,
  exportTraceabilityAuditJson,
  WP29_TRACEABILITY_EXPORT_VERSION,
  TraceabilityAuditReport,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_CATEGORIES,
  PRINCIPLE_AUDIT_STATES,
  STAGE_REPRESENTATION_STRENGTHS,
  StageVerificationEntry,
  ParameterProvenanceIndex,
  PARAMETER_PROVENANCE_LEVELS,
} from "../sound-engineer/validation/traceability";
import { UpstreamGovernanceState } from "../sound-engineer/validation/readiness";
import {
  PlatformTranslationPlan,
  SemanticToneDesign,
  EngineeringDecisionRecord,
} from "../sound-engineer/layer-contracts";
import {
  createEngineeringDecisionRecord,
  createDecisionArtifactReference,
  createSemanticToneDesign,
  createSemanticDesignArtifactReference,
  createPlatformTranslationPlan,
  createArtifactReference,
  EXECUTION_STREAMS,
  ARTIFACT_TYPES,
} from "../sound-engineer";

function create14StageLifecycle(): StageVerificationEntry[] {
  return [
    { stageNumber: 1, stageName: "INTENT_INTAKE", representation: STAGE_REPRESENTATION_STRENGTHS.EXACT, presentInTrace: true },
    { stageNumber: 2, stageName: "CASE_EVIDENCE_ASSESSMENT", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 3, stageName: "OBSERVATION_FORMATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 4, stageName: "HYPOTHESIS_GENERATION", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: true },
    { stageNumber: 5, stageName: "HYPOTHESIS_EVALUATION_AND_COMPETITION", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: true },
    { stageNumber: 6, stageName: "DISCRIMINATING_EVIDENCE_CHECK", representation: STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED, presentInTrace: false },
    { stageNumber: 7, stageName: "CAUSAL_DIAGNOSIS", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: true },
    { stageNumber: 8, stageName: "ENGINEERING_REQUIREMENT_FORMATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 9, stageName: "CANDIDATE_INTERVENTION_GENERATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 10, stageName: "CONSTRAINT_AND_TRADE_OFF_ANALYSIS", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 11, stageName: "ENGINEERING_DECISION_AND_PREDICTION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 12, stageName: "SEMANTIC_TONE_DESIGN_HANDOFF", representation: STAGE_REPRESENTATION_STRENGTHS.EXACT, presentInTrace: true },
    { stageNumber: 13, stageName: "OUTCOME_EVIDENCE_INGESTION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
    { stageNumber: 14, stageName: "ENGINEERING_REVIEW_AND_ITERATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: true },
  ];
}

function create21Principles() {
  return [
    { principleNumber: 1, title: "Respect the Raw Evidence", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 2, title: "Descriptive Evidence Precedes Interpretive Evaluation", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 3, title: "Acknowledge and Track Uncertainties Explicitly", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 4, title: "A Symptom Does Not Identify Its Cause", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 5, title: "Diagnosis Should Be Causal Where Evidence Permits", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 6, title: "Competing Hypotheses Survive Until Evidence Justifies Narrowing Them", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 7, title: "Context Informs Reasoning but Does Not Prove Causation", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 8, title: "Engineering Intent Defines Success, Constraints Narrow It", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 9, title: "Interventions Require Explicit Rationale", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 10, title: "Distinguish Reversible Adjustments from Structural Changes", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 11, title: "Respect Processing Order and Signal Flow", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 12, title: "Predict Consequences Before Acting", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 13, title: "Trade-offs Are Inevitable; Make Them Consciously", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 14, title: "Validate Through Multiple Perspectives When Consequences Are High", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 15, title: "Platform Translation Operates Downstream of Engineering Reasoning", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 16, title: "Compromises Must Be Audible, Measurable, or Structurally Traceable", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 17, title: "Maintain Coherence Across the Entire Signal Chain", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
    { principleNumber: 18, title: "Evaluate Outcomes Honestly Without Circular Justification", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE, findings: [] },
    { principleNumber: 19, title: "Preserve Reversibility Until Confidence Is Established", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 20, title: "Audit Trail Completeness Precedes Output Finality", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
    { principleNumber: 21, title: "Learn Structurally Across Sessions", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
  ];
}

function createMockReport(overrides?: Partial<TraceabilityAuditReport>): TraceabilityAuditReport {
  return {
    traceId: "trace_query_test_01",
    runId: "run_query_test_01",
    verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
    allAuditableInvariantsPassed: false,
    findings: [
      {
        code: "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING",
        type: TRACEABILITY_FINDING_TYPES.VIOLATION,
        category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
        principleNumber: 12,
        checkpointId: "cp_ptp_01",
        message: "Platform translation precedes engineering decision",
      },
      {
        code: "INFO_P18_EMPIRICAL_OUTCOME_VERIFIED",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
        severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
        principleNumber: 18,
        message: "Empirical outcome verified via audio receipts; full P18 unobservable",
      },
      {
        code: "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED",
        type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
        category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
        severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
        targetId: "stg_unresolved::eq::gain",
        message: "Stage does not resolve to semantic design",
      },
    ],
    lifecycleCoverage: create14StageLifecycle(),
    principleResults: create21Principles(),
    orphanedMeasurementSummary: {
      totalMeasurementsChecked: 2,
      orphanedCount: 0,
      ruleA_MissingExecutionCount: 0,
      ruleB_UnresolvableTraceCount: 0,
      scopeCoverageVerifiedCount: 2,
      totalMeasurements: 2,
      resolvedMeasurements: 2,
      orphanedMeasurements: 0,
      unverifiedMeasurements: 0,
      objectiveEvidenceCount: 1,
      perceptualEvaluationCount: 1,
      objectiveOrphanedCount: 0,
      perceptualOrphanedCount: 0,
    },
    evidenceContext: {
      isValidationIntegrated: true,
      empiricalOutcomeVerified: true,
      executionRecordCount: 1,
      objectiveEvidenceCount: 1,
      perceptualEvaluationCount: 1,
      validationCaseCount: 1,
      validationScopeCount: 1,
    },
    parameterProvenanceCapability: {
      maxSupportedLevel: "LEVEL_3_DECISION_RECORD_TRACE",
      activeLevel: "LEVEL_3_DECISION_RECORD_TRACE",
      notes: "Level 3 capability active",
    },
    parameterProvenanceSummary: {
      totalParametersEncountered: 3,
      totalIndexEntries: 3,
      uniqueKeysCount: 2,
      ambiguousKeysCount: 1,
      ambiguousEntriesCount: 2,
      level1ExactCount: 0,
      level2ExactCount: 0,
      level3ExactCount: 3,
      level1CumulativeCount: 3,
      level2CumulativeCount: 3,
      level3CumulativeCount: 3,
      unresolvedEntriesCount: 0,
      maxLevelReached: "LEVEL_3_DECISION_RECORD_TRACE",
      totalIndexedParameters: 3,
      level1OnlyCount: 0,
      level2Count: 0,
      level3Count: 3,
    },
    timing: {
      startedAt: "2026-10-21T00:00:00.000Z",
      completedAt: "2026-10-21T00:00:00.050Z",
      durationMs: 50,
    },
    ...overrides,
  };
}

function createMockArtifacts(): {
  plan: PlatformTranslationPlan;
  semanticDesign: SemanticToneDesign;
  decisionRecord: EngineeringDecisionRecord;
} {
  const evidenceRef = createArtifactReference({
    artifactId: "evi_mock_01",
    artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
    contractVersion: "1.0.0",
  });

  const decisionRecord = createEngineeringDecisionRecord({
    decisionRecordId: "dec_mock_01",
    runId: "run_query_test_01",
    stream: EXECUTION_STREAMS.SHADOW,
    evidenceReference: evidenceRef,
    overallObjective: "Selected dual-stage frequency shaping based on acoustic evidence of tubby resonance at 180Hz.",
    decisions: [
      {
        decisionId: "dec_freq_01",
        category: "FILTERING",
        purpose: "Resonance shaping",
        intent: "Tighten low mids",
        rationale: "Selected dual-stage frequency shaping based on acoustic evidence of tubby resonance at 180Hz.",
        constraints: ["thd < 1%"],
      },
    ],
    confidence: 0.95,
  });

  const decisionRef = createDecisionArtifactReference(decisionRecord);

  const semanticDesign = createSemanticToneDesign({
    designId: "sem_mock_01",
    runId: "run_query_test_01",
    stream: EXECUTION_STREAMS.SHADOW,
    decisionRecordReference: decisionRef,
    topology: { routingType: "SERIES" },
    stages: [
      {
        stageId: "stg_boost",
        stageIndex: 0,
        role: "PREAMP",
        designIntent: "Tighten transient response while preserving headroom.",
        gainStrategy: { headroomProfile: "CLEAN" },
        constraints: ["thd < 1%"],
      },
      {
        stageId: "stg_amp",
        stageIndex: 1,
        role: "AMP",
        designIntent: "Deliver articulate saturation without muddy low frequencies.",
        gainStrategy: { headroomProfile: "HIGH_GAIN_LEAD" },
        constraints: ["output_level_db < 0"],
      },
    ],
  });

  const semanticRef = createSemanticDesignArtifactReference(semanticDesign);

  const plan = createPlatformTranslationPlan({
    runId: "run_query_test_01",
    stream: EXECUTION_STREAMS.SHADOW,
    semanticDesignReference: semanticRef,
    targetPlatform: {
      platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
      formatFamily: "DAW_PLUGIN",
    },
    translationDecisions: [
      {
        stageId: "stg_boost",
        semanticRole: "CLEAN_BOOST",
        mappingDecision: {
          targetDeviceId: "pedal:tube_screamer",
          targetDeviceName: "Tube Screamer",
          deviceCategory: "OVERDRIVE",
          platformSpecificParameters: {
            gain: 0.35,
          },
        },
        rationale: "Moderate front-end overdrive to tighten lower mids without clipping bass.",
        confidence: 0.95,
      },
      // Colliding duplicate key to test ambiguity handling
      {
        stageId: "stg_boost",
        semanticRole: "CLEAN_BOOST_ALT",
        mappingDecision: {
          targetDeviceId: "pedal:tube_screamer",
          targetDeviceName: "Tube Screamer",
          deviceCategory: "OVERDRIVE",
          platformSpecificParameters: {
            gain: 0.40,
          },
        },
        rationale: "Alternative hot boost calibration.",
        confidence: 0.90,
      },
      // Unique key
      {
        stageId: "stg_amp",
        semanticRole: "AMP_LEAD",
        mappingDecision: {
          targetDeviceId: "amp:5150",
          targetDeviceName: "5150 Lead Amp",
          deviceCategory: "AMP",
          platformSpecificParameters: {
            bass: 4.5,
          },
        },
        rationale: "Trim low rumble at high volume.",
        confidence: 0.92,
      },
    ],
    substitutions: [],
    unresolvedMappings: [],
    capabilityLimitations: [],
  });

  return { plan, semanticDesign, decisionRecord };
}

describe("WP-29 Stage 2 Slice 1F: Audit Trail Query & Export Utility", () => {
  // =========================================================================
  // 1. TraceabilityQueryEngine: Lifecycle Query
  // =========================================================================
  describe("Lifecycle Query", () => {
    it("1. getLifecycleStages returns all 14 stages in order 1–14; Stage 06 is NOT_REPRESENTED; grouped stages remain GROUPED", () => {
      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report });

      const stages = engine.getLifecycleStages();
      assert.strictEqual(stages.length, 14);
      for (let i = 0; i < 14; i++) {
        assert.strictEqual(stages[i].stageNumber, i + 1);
      }

      // Stage 06: NOT_REPRESENTED and not present in trace
      const stage06 = engine.getLifecycleStage(6);
      assert.ok(stage06);
      assert.strictEqual(stage06.stageName, "DISCRIMINATING_EVIDENCE_CHECK");
      assert.strictEqual(stage06.representation, STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED);
      assert.strictEqual(stage06.presentInTrace, false);

      // Grouped stages (Stages 4, 5, 7)
      const stage04 = engine.getLifecycleStage(4);
      assert.strictEqual(stage04?.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);
      const stage05 = engine.getLifecycleStage(5);
      assert.strictEqual(stage05?.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);
      const stage07 = engine.getLifecycleStage(7);
      assert.strictEqual(stage07?.representation, STAGE_REPRESENTATION_STRENGTHS.GROUPED);
    });
  });

  // =========================================================================
  // 2. TraceabilityQueryEngine: Principle Query
  // =========================================================================
  describe("Principle Query", () => {
    it("2. getPrincipleResults returns all 21 principles in order; P18 is NOT_VERIFIABLE; delegated principles remain DELEGATED", () => {
      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report });

      const principles = engine.getPrincipleResults();
      assert.strictEqual(principles.length, 21);
      for (let i = 0; i < 21; i++) {
        assert.strictEqual(principles[i].principleNumber, i + 1);
      }

      // P18 must remain NOT_VERIFIABLE
      const p18 = engine.getPrincipleResult(18);
      assert.ok(p18);
      assert.strictEqual(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);

      // Delegated principles (e.g. P4, P5, P6, P10, P11, P14, P17, P21) remain DELEGATED
      const p4 = engine.getPrincipleResult(4);
      assert.strictEqual(p4?.state, PRINCIPLE_AUDIT_STATES.DELEGATED);
      const p21 = engine.getPrincipleResult(21);
      assert.strictEqual(p21?.state, PRINCIPLE_AUDIT_STATES.DELEGATED);
    });
  });

  // =========================================================================
  // 3. TraceabilityQueryEngine: Finding Filter
  // =========================================================================
  describe("Finding Filter", () => {
    it("3. findFindings filters deterministically by type, category, code, severity, and principleNumber", () => {
      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report });

      // Filter by type: VIOLATION
      const violations = engine.findFindings({ type: TRACEABILITY_FINDING_TYPES.VIOLATION });
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0].code, "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING");

      // Filter by category: PARAMETER_PROVENANCE
      const paramFindings = engine.findFindings({
        category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
      });
      assert.strictEqual(paramFindings.length, 1);
      assert.strictEqual(paramFindings[0].code, "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED");

      // Filter by authoritative severities: CRITICAL, WARNING, INFO
      const criticalFindings = engine.findFindings({
        severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      });
      assert.strictEqual(criticalFindings.length, 1);
      assert.strictEqual(criticalFindings[0].severity, TRACEABILITY_FINDING_SEVERITIES.CRITICAL);

      const warningFindings = engine.findFindings({
        severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
      });
      assert.strictEqual(warningFindings.length, 1);
      assert.strictEqual(warningFindings[0].severity, TRACEABILITY_FINDING_SEVERITIES.WARNING);

      const infoFindings = engine.findFindings({
        severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
      });
      assert.strictEqual(infoFindings.length, 1);
      assert.strictEqual(infoFindings[0].severity, TRACEABILITY_FINDING_SEVERITIES.INFO);

      // Filter by principleNumber: 12
      const p12Findings = engine.findFindings({ principleNumber: 12 });
      assert.strictEqual(p12Findings.length, 1);
      assert.strictEqual(p12Findings[0].code, "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING");

      // Filter by non-existent code
      const empty = engine.findFindings({ code: "NON_EXISTENT_CODE" });
      assert.strictEqual(empty.length, 0);
    });
  });

  // =========================================================================
  // 4. TraceabilityQueryEngine: Parameter Provenance Query
  // =========================================================================
  describe("Parameter Provenance Query", () => {
    it("4. Level-3 parameter query returns factual source material: translation, semantic stage, and decision record", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report, parameterIndex });

      // Unique match query
      const result = engine.queryParameterProvenance({
        stageId: "stg_amp",
        targetDeviceId: "amp:5150",
        parameterName: "bass",
      });

      assert.strictEqual(result.status, TRACEABILITY_QUERY_STATUSES.FOUND);
      assert.ok(result.singleMatch);
      assert.strictEqual(result.singleMatch.translatedValue, 4.5);
      assert.strictEqual(result.singleMatch.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE);
      assert.strictEqual(result.singleMatch.translationRationale, "Trim low rumble at high volume.");
      assert.strictEqual(result.singleMatch.stageDesignIntent, "Deliver articulate saturation without muddy low frequencies.");
      assert.strictEqual(result.singleMatch.decisionRecord?.decisionRecordId, "dec_mock_01");
      assert.strictEqual(result.singleMatch.evidenceReferenceArtifactId, "evi_mock_01");
      assert.strictEqual(result.singleMatch.isAmbiguous, false);
    });

    it("5. Ambiguous composite key collision returns AMBIGUOUS status with all colliding entries preserved", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report, parameterIndex });

      // Colliding key: stg_boost::pedal:tube_screamer::gain (two distinct translation items)
      const result = engine.queryParameterProvenance({
        stageId: "stg_boost",
        targetDeviceId: "pedal:tube_screamer",
        parameterName: "gain",
      });

      assert.strictEqual(result.status, TRACEABILITY_QUERY_STATUSES.AMBIGUOUS);
      assert.ok(result.collidingMatches);
      assert.strictEqual(result.collidingMatches.length, 2);
      assert.strictEqual(result.collidingMatches[0].isAmbiguous, true);
      assert.strictEqual(result.collidingMatches[1].isAmbiguous, true);
      // Values preserved
      assert.strictEqual(result.collidingMatches[0].translatedValue, 0.35);
      assert.strictEqual(result.collidingMatches[1].translatedValue, 0.40);
      assert.ok(result.limitationMessage?.includes("collision"));
    });

    it("6. Unsupported Level 4/5 request reports UNSUPPORTED_CAPABILITY and never guesses", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport();
      const engine = new TraceabilityQueryEngine({ report, parameterIndex });

      // Request Level 4
      const res4 = engine.queryParameterProvenance({
        stageId: "stg_amp",
        targetDeviceId: "amp:5150",
        parameterName: "bass",
        requestedLevel: 4,
      });
      assert.strictEqual(res4.status, TRACEABILITY_QUERY_STATUSES.UNSUPPORTED_CAPABILITY);
      assert.ok(res4.limitationMessage?.includes("Level 4"));

      // Request Level 5
      const res5 = engine.queryParameterProvenance({
        stageId: "stg_amp",
        targetDeviceId: "amp:5150",
        parameterName: "bass",
        requestedLevel: 5,
      });
      assert.strictEqual(res5.status, TRACEABILITY_QUERY_STATUSES.UNSUPPORTED_CAPABILITY);
      assert.ok(res5.limitationMessage?.includes("Level 5"));
    });

    it("7. Trace isolation: index with mismatched traceId cannot leak parameters into another trace report", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const matchingIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport(); // traceId is "trace_query_test_01"
      const engineMatching = new TraceabilityQueryEngine({ report, parameterIndex: matchingIndex });

      // 1. Matching trace + genuinely absent parameter -> NOT_FOUND
      const absentRes = engineMatching.queryParameterProvenance({
        stageId: "stg_nonexistent",
        targetDeviceId: "pedal:none",
        parameterName: "volume",
      });
      assert.strictEqual(absentRes.status, TRACEABILITY_QUERY_STATUSES.NOT_FOUND);
      assert.strictEqual(absentRes.singleMatch, undefined);
      assert.strictEqual(absentRes.collidingMatches, undefined);

      // 2. Foreign-trace index -> NOT_VERIFIABLE with isolation violation message
      const foreignIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "DIFFERENT_TRACE_ID_FOREIGN",
        runId: "run_other_99",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const engineForeign = new TraceabilityQueryEngine({ report, parameterIndex: foreignIndex });

      const foreignRes = engineForeign.queryParameterProvenance({
        stageId: "stg_amp",
        targetDeviceId: "amp:5150",
        parameterName: "bass",
      });

      assert.strictEqual(foreignRes.status, TRACEABILITY_QUERY_STATUSES.NOT_VERIFIABLE);
      assert.ok(foreignRes.limitationMessage?.includes("Trace isolation violation"));
      // Strict isolation: foreign parameter details are NEVER leaked
      assert.strictEqual(foreignRes.singleMatch, undefined);
      assert.strictEqual(foreignRes.collidingMatches, undefined);
    });
  });

  // =========================================================================
  // 5. Traceability Exporter Tests
  // =========================================================================
  describe("Audit Trail Exporter", () => {
    it("8. exportTraceabilityAuditDto produces deterministic DTO with exact export version and capability limits", () => {
      const report = createMockReport();
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const govState: UpstreamGovernanceState = {
        reasoning_lifecycle_stages_completed: 13,
        principles_complied: false,
        provenance_intact: true,
        upstream_violations: ["ERR_P12: Inverted"],
      };

      const dto = exportTraceabilityAuditDto({
        report,
        parameterIndex,
        upstreamGovernanceState: govState,
        exportedAt: "2026-10-21T00:00:00Z",
      });

      assert.strictEqual(dto.exportVersion, WP29_TRACEABILITY_EXPORT_VERSION);
      assert.strictEqual(dto.traceId, "trace_query_test_01");
      assert.strictEqual(dto.runId, "run_query_test_01");
      assert.strictEqual(dto.exportedAt, "2026-10-21T00:00:00Z");
      assert.strictEqual(dto.lifecycleCoverage.length, 14);
      assert.strictEqual(dto.principleResults.length, 21);
      assert.strictEqual(dto.findings.length, 3);
      assert.ok(dto.parameterProvenanceEntries);
      assert.strictEqual(dto.parameterProvenanceEntries.length, 3);
      assert.strictEqual(dto.upstreamGovernanceSnapshot?.provenance_intact, true);
      assert.strictEqual(dto.capabilityLimitations.length, 3);

      // Immutability: DTO is frozen
      assert.ok(Object.isFrozen(dto));
      assert.ok(Object.isFrozen(dto.lifecycleCoverage));
      assert.ok(Object.isFrozen(dto.principleResults));
      assert.ok(Object.isFrozen(dto.findings));
    });

    it("9. Determinism: equivalent audit input produces identical structural JSON string", () => {
      const report1 = createMockReport();
      const report2 = createMockReport();
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex1 = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });
      const parameterIndex2 = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      // Without timestamp
      const json1 = exportTraceabilityAuditJson({
        report: report1,
        parameterIndex: parameterIndex1,
      });
      const json2 = exportTraceabilityAuditJson({
        report: report2,
        parameterIndex: parameterIndex2,
      });

      assert.strictEqual(json1, json2, "Equivalent audit inputs must produce byte-for-byte identical canonical JSON");

      // With injected fixed timestamp
      const jsonWithTime1 = exportTraceabilityAuditJson({
        report: report1,
        parameterIndex: parameterIndex1,
        exportedAt: "2026-10-21T12:34:56Z",
      });
      const jsonWithTime2 = exportTraceabilityAuditJson({
        report: report2,
        parameterIndex: parameterIndex2,
        exportedAt: "2026-10-21T12:34:56Z",
      });
      assert.strictEqual(jsonWithTime1, jsonWithTime2);
    });

    it("10. P18 export truth: empiricalOutcomeVerified is preserved while Principle 18 state remains NOT_VERIFIABLE", () => {
      const report = createMockReport();
      const dto = exportTraceabilityAuditDto({ report });

      assert.strictEqual(dto.evidenceContext.empiricalOutcomeVerified, true);
      const p18 = dto.principleResults.find((p) => p.principleNumber === 18);
      assert.ok(p18);
      assert.strictEqual(p18.state, PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE);

      const p18Limit = dto.capabilityLimitations.find((l) => l.capability === "PRINCIPLE_18_ANTI_CIRCULARITY");
      assert.ok(p18Limit);
      assert.ok(p18Limit.limitationDescription.includes("prediction discriminator"));
    });

    it("11. Ambiguity preservation: colliding parameter entries are both preserved in export array with isAmbiguous === true", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport();
      const dto = exportTraceabilityAuditDto({ report, parameterIndex });

      assert.ok(dto.parameterProvenanceEntries);
      const colliding = dto.parameterProvenanceEntries.filter(
        (e) => e.parameterKey === "stg_boost::pedal:tube_screamer::gain"
      );
      assert.strictEqual(colliding.length, 2, "Both colliding entries must be preserved in array");
      assert.strictEqual(colliding[0].isAmbiguous, true);
      assert.strictEqual(colliding[1].isAmbiguous, true);
      assert.strictEqual(colliding[0].translatedValue, 0.35);
      assert.strictEqual(colliding[1].translatedValue, 0.40);
    });

    it("11b. Deterministic collision ordering across heterogeneous translated values (number, string, boolean, null, object)", () => {
      const { semanticDesign, decisionRecord } = createMockArtifacts();
      const semanticRef = createSemanticDesignArtifactReference(semanticDesign);

      // Create a plan with 5 colliding entries for the same composite key but heterogeneous values
      const heterogeneousPlan = createPlatformTranslationPlan({
        runId: "run_query_test_01",
        stream: EXECUTION_STREAMS.SHADOW,
        semanticDesignReference: semanticRef,
        targetPlatform: {
          platformName: "CUSTOM_PLATFORM",
          formatFamily: "DAW_PLUGIN",
        },
        translationDecisions: [
          {
            stageId: "stg_boost",
            semanticRole: "ROLE_OBJECT",
            mappingDecision: {
              targetDeviceId: "pedal:multi",
              targetDeviceName: "Multi Pedal",
              deviceCategory: "SPECIAL",
              platformSpecificParameters: {
                setting: { profile: "A", gain: 1 },
              },
            },
            rationale: "Object value calibration",
            confidence: 0.9,
          },
          {
            stageId: "stg_boost",
            semanticRole: "ROLE_STRING",
            mappingDecision: {
              targetDeviceId: "pedal:multi",
              targetDeviceName: "Multi Pedal",
              deviceCategory: "SPECIAL",
              platformSpecificParameters: {
                setting: "bright",
              },
            },
            rationale: "String value calibration",
            confidence: 0.9,
          },
          {
            stageId: "stg_boost",
            semanticRole: "ROLE_NUMBER",
            mappingDecision: {
              targetDeviceId: "pedal:multi",
              targetDeviceName: "Multi Pedal",
              deviceCategory: "SPECIAL",
              platformSpecificParameters: {
                setting: 10,
              },
            },
            rationale: "Number value calibration",
            confidence: 0.9,
          },
          {
            stageId: "stg_boost",
            semanticRole: "ROLE_BOOL",
            mappingDecision: {
              targetDeviceId: "pedal:multi",
              targetDeviceName: "Multi Pedal",
              deviceCategory: "SPECIAL",
              platformSpecificParameters: {
                setting: true,
              },
            },
            rationale: "Boolean value calibration",
            confidence: 0.9,
          },
          {
            stageId: "stg_boost",
            semanticRole: "ROLE_NULL",
            mappingDecision: {
              targetDeviceId: "pedal:multi",
              targetDeviceName: "Multi Pedal",
              deviceCategory: "SPECIAL",
              platformSpecificParameters: {
                setting: null,
              },
            },
            rationale: "Null value calibration",
            confidence: 0.9,
          },
        ],
        substitutions: [],
        unresolvedMappings: [],
        capabilityLimitations: [],
      });

      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan: heterogeneousPlan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport();

      // Export 1
      const json1 = exportTraceabilityAuditJson({ report, parameterIndex });
      // Export 2
      const json2 = exportTraceabilityAuditJson({ report, parameterIndex });

      assert.strictEqual(json1, json2, "Repeated exports with heterogeneous translated values must be byte-for-byte identical");

      const dto = exportTraceabilityAuditDto({ report, parameterIndex });
      assert.ok(dto.parameterProvenanceEntries);
      assert.strictEqual(dto.parameterProvenanceEntries.length, 5);

      // Verify that all 5 heterogeneous entries are ordered deterministically by canonicalized JSON string:
      const values = dto.parameterProvenanceEntries.map((e) => JSON.stringify(e.translatedValue));
      assert.deepStrictEqual(values, [
        "\"bright\"",
        "{\"profile\":\"A\",\"gain\":1}",
        "10",
        "null",
        "true",
      ]);
    });

    it("12. Trace isolation in exporter: throws error on mismatched parameter index traceId", () => {
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const foreignIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "FOREIGN_TRACE_99",
        runId: "run_foreign",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const report = createMockReport(); // traceId: "trace_query_test_01"

      assert.throws(
        () => exportTraceabilityAuditDto({ report, parameterIndex: foreignIndex }),
        /Trace isolation violation/
      );
    });

    it("13. No mutation: exporting leaves source report and index completely unmodified", () => {
      const report = createMockReport();
      const { plan, semanticDesign, decisionRecord } = createMockArtifacts();
      const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
        traceId: "trace_query_test_01",
        runId: "run_query_test_01",
        plan,
        semanticDesign,
        decisionRecord,
      });

      const reportFindingsCountBefore = report.findings.length;
      const paramIndexKeysCountBefore = parameterIndex.getAllKeys().length;

      exportTraceabilityAuditJson({ report, parameterIndex });

      assert.strictEqual(report.findings.length, reportFindingsCountBefore);
      assert.strictEqual(parameterIndex.getAllKeys().length, paramIndexKeysCountBefore);
    });
  });
});
