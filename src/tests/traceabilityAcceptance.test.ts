// src/tests/traceabilityAcceptance.test.ts
// WP-29 Stage 3: Dedicated WP-29 Acceptance & Contract Verification
// End-to-end integration and contract verification verifying all WP-29 acceptance criteria.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  TraceabilityAuditor,
  auditTraceability,
  TraceabilityQueryEngine,
  TRACEABILITY_QUERY_STATUSES,
  exportTraceabilityAuditDto,
  exportTraceabilityAuditJson,
  WP29_TRACEABILITY_EXPORT_VERSION,
  ParameterProvenanceIndex,
  toUpstreamGovernanceState,
  isProvenanceRelevantFinding,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_CATEGORIES,
  PRINCIPLE_AUDIT_STATES,
  PRINCIPLE_AUDIT_STRENGTHS,
  getAllPrinciplesMetadata,
  getPrincipleMetadata,
  STAGE_REPRESENTATION_STRENGTHS,
  PARAMETER_PROVENANCE_LEVELS,
  TraceabilityAuditReport,
  ValidationAuditEvidence,
} from "../sound-engineer/validation/traceability";

import {
  ProductionReadinessSynthesizer,
  FROZEN_HARD_BLOCKERS,
  UpstreamGovernanceState,
  PILLAR_READINESS_STATUSES,
} from "../sound-engineer/validation/readiness";

import { GOVERNED_EDGE_TYPES } from "../sound-engineer/validation/graph/edgeTypes";

import {
  ValidationExecutionRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationCase,
  ValidationScopeRecord,
  ValidationPackage,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";

import {
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  TOLERANCE_EVALUATIONS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  VALIDATION_PRIMARY_DOMAINS,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";

import {
  createRunTraceRecorder,
  createCheckpointEnvelope,
  createCheckpointDiagnostic,
  DIAGNOSTIC_SEVERITIES,
  CHECKPOINT_STATUSES,
  EXECUTION_STREAMS,
  SOUND_ENGINEER_LAYERS,
  ARTIFACT_TYPES,
  createArtifactReference,
  createEvidenceRecord,
  createEvidenceArtifactReference,
  createEngineeringDecisionRecord,
  createDecisionArtifactReference,
  createSemanticToneDesign,
  createSemanticDesignArtifactReference,
  createPlatformTranslationPlan,
  createPlatformTranslationArtifactReference,
  createValidationReport,
  createValidationArtifactReference,
  RunTrace,
} from "../sound-engineer";

import { VersionBindingService } from "../sound-engineer/validation/binding/versionBindingService";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
} from "../sound-engineer/validation/binding/types";

// ---------------------------------------------------------------------------
// Helpers to build authentic test traces & validation artifacts
// ---------------------------------------------------------------------------

function createTestScope(scopeId = "scope_acceptance_test"): ValidationScopeRecord {
  return {
    scope_id: scopeId,
    intake_id: "intake_acc_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["pedal:tube_screamer"],
    excluded_units: [],
    boundary_constraints: ["sample_rate:44100-96000"],
    scope_inflation_protection: true,
  };
}

function createValidVersionBinding(scope: ValidationScopeRecord): ValidationVersionBindingRecord {
  const archProvider = new StaticArchitectureIntegrityReferenceProvider(
    TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  );
  const service = new VersionBindingService(undefined, undefined, undefined, archProvider);
  return service.bindVersions(scope, {
    runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
    model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
    deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
    gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
    platform_exporter_version: "stage12_serializer_digest_9a8b7c",
    fixture_library_version: "golden_stems_manifest_digest_def456",
    target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
    host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  });
}

function buildComprehensiveTrace(runId = "run_acceptance_01"): {
  trace: RunTrace;
  traceId: string;
  runId: string;
  plan: any;
  semanticDesign: any;
  decisionRecord: any;
} {
  const stream = EXECUTION_STREAMS.SHADOW;
  const recorder = createRunTraceRecorder({ runId, stream });

  // 1. INPUT Checkpoint
  const snapRef = createArtifactReference({
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
      startedAt: "2026-10-21T00:00:00.000Z",
      completedAt: "2026-10-21T00:00:00.010Z",
      output: snapRef,
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
  const evi = createEvidenceRecord({
    runId,
    stream,
    sources: [snapRef],
    acousticCharacteristics: {
      spectralBalance: { lowEnd: "Tight sub-100Hz", highMids: "Aggressive 2.5kHz bite" },
      dynamicResponse: { transientAttack: "Punchy, fast pick definition" },
    },
    confidence: 0.95,
    uncertainties: ["Single channel mono reference"],
  });
  const eviRef = createEvidenceArtifactReference(evi);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-21T00:00:00.011Z",
      completedAt: "2026-10-21T00:00:00.030Z",
      inputs: [snapRef],
      output: eviRef,
      payload: evi,
    })
  );

  // 3. DECISION Checkpoint (Engineering)
  const decisionRecord = createEngineeringDecisionRecord({
    runId,
    stream,
    evidenceReference: eviRef,
    overallObjective: "Shape lead tone for articulate note separation under high saturation",
    decisions: [
      {
        decisionId: "dec_pre_tighten",
        category: "PRE_GAIN_SHAPING",
        purpose: "Clean boost filter",
        intent: "Tighten low mids",
        rationale: "Attenuate tubby frequencies at 200Hz prior to high-gain clipping stage",
        constraints: ["thd < 1%"],
      },
    ],
    confidence: 0.94,
  });
  const decRef = createDecisionArtifactReference(decisionRecord);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-21T00:00:00.031Z",
      completedAt: "2026-10-21T00:00:00.050Z",
      inputs: [eviRef],
      output: decRef,
      payload: decisionRecord,
    })
  );

  // 4. SEMANTIC DESIGN Checkpoint
  const semanticDesign = createSemanticToneDesign({
    runId,
    stream,
    decisionRecordReference: decRef,
    topology: { routingType: "SERIES" },
    stages: [
      {
        stageId: "stg_screamer",
        stageIndex: 0,
        role: "PREAMP",
        designIntent: "Tight overdrive front-end boost",
        gainStrategy: { headroomProfile: "CLEAN" },
        constraints: ["thd < 1%"],
      },
      {
        stageId: "stg_5150",
        stageIndex: 1,
        role: "AMP",
        designIntent: "American high gain lead channel",
        gainStrategy: { headroomProfile: "HIGH_GAIN_LEAD" },
        constraints: ["output_level_db < 0"],
      },
    ],
  });
  const semRef = createSemanticDesignArtifactReference(semanticDesign);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-21T00:00:00.051Z",
      completedAt: "2026-10-21T00:00:00.070Z",
      inputs: [decRef],
      output: semRef,
      payload: semanticDesign,
    })
  );

  // 5. VALIDATION Checkpoint
  const val = createValidationReport({
    runId,
    stream,
    targetArtifact: semRef,
    overallStatus: "PASS",
  });
  const valRef = createValidationArtifactReference(val);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.VALIDATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-21T00:00:00.071Z",
      completedAt: "2026-10-21T00:00:00.090Z",
      inputs: [snapRef, semRef],
      output: valRef,
      payload: val,
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

  // 6. PLATFORM TRANSLATION Checkpoint
  const plan = createPlatformTranslationPlan({
    runId,
    stream,
    semanticDesignReference: semRef,
    validationReportReference: valRef,
    targetPlatform: {
      platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
      formatFamily: "DAW_PLUGIN",
    },
    translationDecisions: [
      {
        stageId: "stg_screamer",
        semanticRole: "CLEAN_BOOST",
        mappingDecision: {
          targetDeviceId: "pedal:tube_screamer",
          targetDeviceName: "Tube Screamer Overdrive",
          deviceCategory: "OVERDRIVE",
          platformSpecificParameters: {
            drive: 0.35,
            tone: 0.65,
          },
        },
        rationale: "Level 3.5 drive calibration for transparent boost tightening",
        confidence: 0.95,
      },
      {
        stageId: "stg_5150",
        semanticRole: "AMP_LEAD",
        mappingDecision: {
          targetDeviceId: "amp:5150_lead",
          targetDeviceName: "5150 Lead Amp",
          deviceCategory: "AMP",
          platformSpecificParameters: {
            gain: 6.5,
            presence: 7.0,
          },
        },
        rationale: "Articulate high gain lead configuration",
        confidence: 0.92,
      },
    ],
    substitutions: [],
    unresolvedMappings: [],
    capabilityLimitations: [],
  });
  const ptpRef = createPlatformTranslationArtifactReference(plan);
  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-10-21T00:00:00.091Z",
      completedAt: "2026-10-21T00:00:00.110Z",
      inputs: [semRef, valRef],
      output: ptpRef,
      payload: plan,
    })
  );

  const trace = recorder.getTraceSnapshot();
  return { trace, traceId: trace.traceId, runId, plan, semanticDesign, decisionRecord };
}

function buildValidEmpiricalValidationContext(traceId: string): ValidationAuditEvidence {
  const executionRecord: ValidationExecutionRecord = {
    execution_id: "exec_acc_01",
    case_id: "case_acc_01",
    profile_id: "prof_acc_01",
    fixture_id: "fixt_acc_01",
    binding_id: "bind_acc_01",
    execution_timestamp: "2026-10-21T00:00:00.045Z",
    execution_environment: "isolated_sandbox",
    input_audio_integrity_ref: "sha256:stimulus_acc_abc123",
    output_audio_integrity_ref: "sha256:dsp_output_acc_def456",
    execution_duration_ms: 120,
    anomalies_detected: [],
    raw_measurements: { spectral_centroid: 2450 },
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: traceId,
  };

  const objectiveRecord: ObjectiveEvidenceRecord = {
    objective_evidence_id: "obj_acc_01",
    execution_id: "exec_acc_01",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { spectral_centroid: 2450 },
    applied_threshold_profile_ref: "thresh_profile_acc_01",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.05,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["sha256:plot_01"],
  };

  const perceptualRecord: PerceptualEvaluationRecord = {
    perceptual_evidence_id: "perc_acc_01",
    execution_id: "exec_acc_01",
    evaluator_id: "evaluator_acc_01",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
    listening_environment: {
      monitor_type: "Nearfield ATC SCM25A Pro",
      calibrated_spl_profile_ref: "spl_85db_c_weighted",
      acoustic_treatment_level: "LEDE Treated Control Room",
    },
    presented_stimuli_refs: {
      stimulus_a: "sha256:stimulus_acc_abc123",
      stimulus_b: "sha256:dsp_output_acc_def456",
    },
    perceptual_dimensions_evaluated: { clarity: 4.8 },
    qualitative_observations: "Tight pick attack with clear harmonic bloom",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
  };

  const caseRecord: ValidationCase = {
    case_id: "case_acc_01",
    title: "Acceptance Test Case",
    validation_question: "Does the tone translate accurately?",
    validation_subject: "pedal:tube_screamer",
    scoped_boundaries: ["sample_rate:44100-96000"],
    applicable_test_dimensions: ["spectral_accuracy"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: ["fixt_acc_01"],
    evaluation_methodology: "AUTOMATED_DSP_HARNESS",
    acceptance_criteria_ref: "criteria_lead_01",
    failure_consequence: "REJECT",
    expected_remand_destination: "ENGINEERING",
  };

  const scopeRecord: ValidationScopeRecord = {
    scope_id: "scope_acc_01",
    intake_id: "intake_acc_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["pedal:tube_screamer"],
    excluded_units: [],
    boundary_constraints: [],
    scope_inflation_protection: true,
  };

  return {
    executionRecords: [executionRecord],
    objectiveEvidenceRecords: [objectiveRecord],
    perceptualEvaluationRecords: [perceptualRecord],
    validationCases: [caseRecord],
    validationScopeRecords: [scopeRecord],
  };
}

describe("WP-29 Stage 3: Dedicated WP-29 Acceptance & Contract Verification", () => {
  // -------------------------------------------------------------------------
  // 1. Clean complete trace with validation + parameter provenance
  // -------------------------------------------------------------------------
  it("1. Clean complete trace with validation + parameter provenance produces strongest truthful report", () => {
    const { trace, traceId, runId, plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const validationEvidence = buildValidEmpiricalValidationContext(traceId);
    const parameterIndex = ParameterProvenanceIndex.fromArtifacts({
      traceId,
      runId,
      plan,
      semanticDesign,
      decisionRecord,
    });

    const auditor = new TraceabilityAuditor();
    const report = auditor.auditTraceability({
      runTrace: trace,
      validationEvidence,
      parameterIndex,
    });

    // Invariants
    assert.strictEqual(report.traceId, traceId);
    assert.strictEqual(report.allAuditableInvariantsPassed, false, "P18 limitation prevents premature allAuditableInvariantsPassed === true");
    assert.strictEqual(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);

    // Lifecycle: all 14 stages covered
    assert.strictEqual(report.lifecycleCoverage.length, 14);
    const stage06 = report.lifecycleCoverage.find((s) => s.stageNumber === 6);
    assert.strictEqual(stage06?.representation, STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED);
    assert.strictEqual(stage06?.presentInTrace, false);

    // Verdict: Truthfully NOT_VERIFIABLE because mandatory P18 anti-circularity cannot be verified
    assert.strictEqual(
      report.verdict,
      TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
      "P18 limitation prevents premature VERIFIED verdict"
    );
  });

  // -------------------------------------------------------------------------
  // 2. P18 remains NOT_VERIFIABLE despite empirical outcome verification
  // -------------------------------------------------------------------------
  it("2. P18 remains NOT_VERIFIABLE despite empirical outcome verification", () => {
    const { trace, traceId } = buildComprehensiveTrace();
    const validationEvidence = buildValidEmpiricalValidationContext(traceId);
    const auditor = new TraceabilityAuditor();
    const report = auditor.auditTraceability({ runTrace: trace, validationEvidence });

    assert.strictEqual(report.evidenceContext.empiricalOutcomeVerified, true);
    const p18 = report.principleResults.find((p) => p.principleNumber === 18);
    assert.ok(p18);
    assert.strictEqual(
      p18.state,
      PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE,
      "Principle 18 must remain NOT_VERIFIABLE because records lack a prediction discriminator"
    );
    assert.ok(!report.findings.some((f) => f.code === "ERR_P18_CIRCULAR_JUSTIFICATION_DETECTED"));
  });

  // -------------------------------------------------------------------------
  // 3. Orphan measurement causes factual DEFICIENT result
  // -------------------------------------------------------------------------
  it("3. Orphan measurement causes factual DEFICIENT result", () => {
    const { trace } = buildComprehensiveTrace();
    const unattachedObjective: ObjectiveEvidenceRecord = {
      objective_evidence_id: "obj_orphan_01",
      execution_id: "NON_EXISTENT_EXECUTION",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
      measured_parameters: { thd: 0.1 },
      applied_threshold_profile_ref: "thresh_01",
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      measured_delta: 0.01,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      artifacts_retained: [],
    };

    const auditor = new TraceabilityAuditor();
    const report = auditor.auditTraceability({
      runTrace: trace,
      validationEvidence: { objectiveEvidenceRecords: [unattachedObjective] },
    });

    assert.strictEqual(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT);
    assert.strictEqual(report.orphanedMeasurementSummary.orphanedCount, 1);
    const orphanFinding = report.findings.find(
      (f) =>
        f.code === "ORPHAN_PARENT_EXECUTION_MISSING" ||
        f.code === "ERR_OBJECTIVE_MEASUREMENT_ORPHANED_NO_EXECUTION"
    );
    assert.ok(orphanFinding);
    assert.strictEqual(orphanFinding.type, TRACEABILITY_FINDING_TYPES.VIOLATION);

    // Downstream governance mapping check: orphan measurement falsifies provenance_intact
    const gov = toUpstreamGovernanceState(report);
    assert.strictEqual(gov.provenance_intact, false);
    assert.ok(gov.upstream_violations?.includes(orphanFinding.code));
  });

  // -------------------------------------------------------------------------
  // 4. Unresolvable lineage causes NOT_VERIFIABLE, not false VIOLATION
  // -------------------------------------------------------------------------
  it("4. Unresolvable lineage causes NOT_VERIFIABLE, not false VIOLATION", () => {
    const auditor = new TraceabilityAuditor();
    const unresolvableExecution: ValidationExecutionRecord = {
      execution_id: "exec_unresolvable",
      case_id: "case_01",
      profile_id: "prof_01",
      fixture_id: "fixt_01",
      binding_id: "bind_01",
      execution_timestamp: "2026-10-21T00:00:00.000Z",
      execution_environment: "sandbox",
      input_audio_integrity_ref: "sha256:in",
      output_audio_integrity_ref: "sha256:out",
      execution_duration_ms: 50,
      anomalies_detected: [],
      raw_measurements: {},
      outcome: EXECUTION_OUTCOMES.COMPLETED,
      trace_ref: "trace_unsupplied_in_context",
    };

    const report = auditor.auditTraceability({
      validationEvidence: { executionRecords: [unresolvableExecution] },
    });

    assert.strictEqual(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    const finding = report.findings.find((f) => f.code === "EXECUTION_TRACE_REF_UNRESOLVABLE");
    assert.ok(finding);
    assert.strictEqual(finding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
    // Does NOT emit a false VIOLATION
    assert.strictEqual(report.findings.filter((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION).length, 0);

    // Mapper check: provenance cannot be verified intact, but does NOT invent an upstream violation
    const gov = toUpstreamGovernanceState(report);
    assert.strictEqual(gov.provenance_intact, false);
    assert.strictEqual(gov.upstream_violations?.length, 0);
  });

  // -------------------------------------------------------------------------
  // 5. Parameter Level-3 completeness works
  // -------------------------------------------------------------------------
  it("5. Parameter Level-3 completeness works", () => {
    const { plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const index = ParameterProvenanceIndex.fromArtifacts({
      traceId: "trace_p3_test",
      runId: "run_p3_test",
      plan,
      semanticDesign,
      decisionRecord,
    });

    const entries = index.getAllEntries();
    assert.strictEqual(entries.length, 4); // 2 on screamer (drive, tone), 2 on 5150 (gain, presence)

    for (const entry of entries) {
      assert.strictEqual(entry.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE);
      assert.ok(entry.translationItem);
      assert.ok(entry.semanticStage);
      assert.ok(entry.decisionRecord);
      assert.strictEqual(entry.isAmbiguous, false);
      assert.strictEqual(entry.isUnresolved, false);
    }
  });

  // -------------------------------------------------------------------------
  // 6. Parameter ambiguity prevents affirmative provenance
  // -------------------------------------------------------------------------
  it("6. Parameter ambiguity prevents affirmative provenance", () => {
    const { semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const semanticRef = createSemanticDesignArtifactReference(semanticDesign);

    // Duplicate key for stg_screamer + pedal:tube_screamer + drive
    const collidingPlan = createPlatformTranslationPlan({
      runId: "run_collision_test",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: semanticRef,
      targetPlatform: { platformName: "IK", formatFamily: "DAW_PLUGIN" },
      translationDecisions: [
        {
          stageId: "stg_screamer",
          semanticRole: "CLEAN_BOOST",
          mappingDecision: {
            targetDeviceId: "pedal:tube_screamer",
            targetDeviceName: "Tube Screamer",
            deviceCategory: "OVERDRIVE",
            platformSpecificParameters: { drive: 0.35 },
          },
          rationale: "Calibration A",
          confidence: 0.9,
        },
        {
          stageId: "stg_screamer",
          semanticRole: "HOT_BOOST",
          mappingDecision: {
            targetDeviceId: "pedal:tube_screamer",
            targetDeviceName: "Tube Screamer",
            deviceCategory: "OVERDRIVE",
            platformSpecificParameters: { drive: 0.50 },
          },
          rationale: "Calibration B",
          confidence: 0.85,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({
      traceId: "trace_collision",
      runId: "run_collision_test",
      plan: collidingPlan,
      semanticDesign,
      decisionRecord,
    });

    const summary = index.getSummary();
    assert.strictEqual(summary.ambiguousKeysCount, 1);
    assert.strictEqual(summary.ambiguousEntriesCount, 2);

    const report: TraceabilityAuditReport = {
      traceId: "trace_collision",
      runId: "run_collision_test",
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
      allAuditableInvariantsPassed: true,
      findings: [],
      lifecycleCoverage: [],
      principleResults: [],
      orphanedMeasurementSummary: {
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
      },
      evidenceContext: {
        isValidationIntegrated: false,
        empiricalOutcomeVerified: false,
        executionRecordCount: 0,
        objectiveEvidenceCount: 0,
        perceptualEvaluationCount: 0,
        validationCaseCount: 0,
        validationScopeCount: 0,
      },
      parameterProvenanceCapability: {
        maxSupportedLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        activeLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        notes: "Collision active",
      },
      parameterProvenanceSummary: summary,
      timing: { startedAt: "2026-10-21T00:00:00Z", completedAt: "2026-10-21T00:00:00Z", durationMs: 0 },
    };

    const gov = toUpstreamGovernanceState(report);
    assert.strictEqual(
      gov.provenance_intact,
      false,
      "Ambiguous parameter key collisions must prevent provenance_intact: true"
    );
  });

  // -------------------------------------------------------------------------
  // 7. Foreign-trace parameter query blocked
  // -------------------------------------------------------------------------
  it("7. Foreign-trace parameter query blocked", () => {
    const { plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const foreignIndex = ParameterProvenanceIndex.fromArtifacts({
      traceId: "FOREIGN_TRACE_ID",
      runId: "run_foreign",
      plan,
      semanticDesign,
      decisionRecord,
    });

    const report: TraceabilityAuditReport = {
      traceId: "LOCAL_TRACE_ID",
      runId: "run_local",
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
      allAuditableInvariantsPassed: true,
      findings: [],
      lifecycleCoverage: [],
      principleResults: [],
      orphanedMeasurementSummary: {
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
      },
      evidenceContext: {
        isValidationIntegrated: false,
        empiricalOutcomeVerified: false,
        executionRecordCount: 0,
        objectiveEvidenceCount: 0,
        perceptualEvaluationCount: 0,
        validationCaseCount: 0,
        validationScopeCount: 0,
      },
      parameterProvenanceCapability: {
        maxSupportedLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        activeLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        notes: "Level 3",
      },
      timing: { startedAt: "2026-10-21T00:00:00Z", completedAt: "2026-10-21T00:00:00Z", durationMs: 0 },
    };

    const engine = new TraceabilityQueryEngine({ report, parameterIndex: foreignIndex });
    const result = engine.queryParameterProvenance({
      stageId: "stg_screamer",
      targetDeviceId: "pedal:tube_screamer",
      parameterName: "drive",
    });

    assert.strictEqual(result.status, TRACEABILITY_QUERY_STATUSES.NOT_VERIFIABLE);
    assert.ok(result.limitationMessage?.includes("Trace isolation violation"));
    assert.strictEqual(result.singleMatch, undefined);
    assert.strictEqual(result.collidingMatches, undefined);

    // In exporter: mismatched traceId throws explicitly
    assert.throws(
      () => exportTraceabilityAuditDto({ report, parameterIndex: foreignIndex }),
      /Trace isolation violation/
    );
  });

  // -------------------------------------------------------------------------
  // 8. Governance mapper preserves provenance/principle separation
  // -------------------------------------------------------------------------
  it("8. Governance mapper preserves provenance/principle separation", () => {
    const report: TraceabilityAuditReport = {
      traceId: "trace_p12_sep",
      runId: "run_p12_sep",
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT,
      allAuditableInvariantsPassed: false,
      findings: [
        {
          code: "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          principleNumber: 12,
          message: "Translation precedes decision",
        },
      ],
      lifecycleCoverage: [],
      principleResults: [],
      orphanedMeasurementSummary: {
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
      },
      evidenceContext: {
        isValidationIntegrated: true,
        empiricalOutcomeVerified: true,
        executionRecordCount: 1,
        objectiveEvidenceCount: 1,
        perceptualEvaluationCount: 0,
        validationCaseCount: 1,
        validationScopeCount: 1,
      },
      parameterProvenanceCapability: {
        maxSupportedLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        activeLevel: PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE,
        notes: "Level 3",
      },
      timing: { startedAt: "2026-10-21T00:00:00Z", completedAt: "2026-10-21T00:00:00Z", durationMs: 0 },
    };

    assert.strictEqual(isProvenanceRelevantFinding(report.findings[0]), false);

    const gov = toUpstreamGovernanceState(report);
    // Provenance is intact because the P12 finding does NOT break trace lineage or parameter provenance
    assert.strictEqual(gov.provenance_intact, true);
    assert.strictEqual(gov.principles_complied, false);
    assert.ok(gov.upstream_violations?.includes("ERR_P12_TRANSLATION_PRECEDES_ENGINEERING"));
  });

  // -------------------------------------------------------------------------
  // 9. Blocker 04 provenance isolation
  // -------------------------------------------------------------------------
  it("9. Blocker 04 provenance isolation: triggers only from invalid binding or broken provenance", () => {
    const synthesizer = new ProductionReadinessSynthesizer();
    const scope = createTestScope("scope_b4_test");
    const validBinding = createValidVersionBinding(scope);
    const pkg: ValidationPackage = {
      package_id: "pkg_b4_test",
      intake_id: "intake_acc_01",
      scope_record_ref: scope.scope_id,
      version_binding_ref: validBinding.binding_id,
      assigned_test_profiles: ["profile:01_structural_schema"],
      validation_case_refs: ["case_acc_01"],
      execution_record_refs: ["exec_acc_01"],
      evidence_refs: ["obj_acc_01"],
    };

    // Case A: Unrelated P12 violation with provenance_intact: true -> Blocker 04 is NOT triggered
    const govWithP12Violation: UpstreamGovernanceState = {
      provenance_intact: true,
      principles_complied: false,
      upstream_violations: ["ERR_P12_TRANSLATION_PRECEDES_ENGINEERING"],
    };
    const resA = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: validBinding,
      upstreamGovernanceState: govWithP12Violation,
    });
    assert.strictEqual(
      resA.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN),
      false,
      "Blocker 04 must NOT trigger on unrelated principle violations"
    );
    // Upstream violations degrade reasoning & governance pillar to DEFICIENT without masquerading as extra hard blocker
    assert.strictEqual(
      resA.pillarEvaluations.reasoning_governance_readiness,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      "Upstream violations must degrade reasoning & governance pillar to DEFICIENT"
    );
    assert.strictEqual(resA.gate8Eligible, false);
    assert.ok(
      !resA.hardBlockersPresent.some((b) => b.toLowerCase().includes("upstream")),
      "Upstream violations must not masquerade as a hard blocker"
    );

    // Case B: provenance_intact: false -> Blocker 04 MUST trigger
    const govBrokenProvenance: UpstreamGovernanceState = {
      provenance_intact: false,
    };
    const resB = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: validBinding,
      upstreamGovernanceState: govBrokenProvenance,
    });
    assert.strictEqual(
      resB.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN),
      true,
      "Blocker 04 MUST trigger when provenance_intact is false"
    );
  });

  // -------------------------------------------------------------------------
  // 10. Upstream governance candidate-lesson tri-state preserved via Pillar 2
  // -------------------------------------------------------------------------
  it("10. Upstream governance candidate-lesson tri-state preserved: false forces DEFICIENT pillar, true and undefined do not", () => {
    const synthesizer = new ProductionReadinessSynthesizer();
    const scope = createTestScope("scope_b8_test");
    const binding = createValidVersionBinding(scope);
    const pkg: ValidationPackage = {
      package_id: "pkg_b8_test",
      intake_id: "intake_acc_01",
      scope_record_ref: scope.scope_id,
      version_binding_ref: binding.binding_id,
      assigned_test_profiles: ["profile:01_structural_schema"],
      validation_case_refs: ["case_acc_01"],
      execution_record_refs: ["exec_acc_01"],
      evidence_refs: ["obj_acc_01"],
    };

    // 1. false -> degrades Pillar 2 to DEFICIENT
    const resFalse = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: { candidate_lesson_quarantined: false },
    });
    assert.strictEqual(resFalse.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
    assert.strictEqual(resFalse.gate8Eligible, false);

    // 2. true -> does NOT degrade Pillar 2 to DEFICIENT
    const resTrue = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: { candidate_lesson_quarantined: true },
    });
    assert.notStrictEqual(resTrue.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);

    // 3. undefined -> does NOT degrade Pillar 2 to DEFICIENT
    const resUndef = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: { candidate_lesson_quarantined: undefined },
    });
    assert.notStrictEqual(resUndef.pillarEvaluations.reasoning_governance_readiness, PILLAR_READINESS_STATUSES.DEFICIENT);
  });

  // -------------------------------------------------------------------------
  // 11. Deterministic export
  // -------------------------------------------------------------------------
  it("11. Deterministic export produces byte-for-byte identical canonical JSON", () => {
    const { trace, traceId, runId, plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const validationEvidence = buildValidEmpiricalValidationContext(traceId);
    const auditor = new TraceabilityAuditor();
    const report = auditor.auditTraceability({ runTrace: trace, validationEvidence });
    const parameterIndex = ParameterProvenanceIndex.fromArtifacts({ traceId, runId, plan, semanticDesign, decisionRecord });

    const json1 = exportTraceabilityAuditJson({ report, parameterIndex });
    const json2 = exportTraceabilityAuditJson({ report, parameterIndex });

    assert.strictEqual(json1, json2, "Repeated exports without timestamp must be byte-for-byte identical");

    const jsonWithTimestamp1 = exportTraceabilityAuditJson({
      report,
      parameterIndex,
      exportedAt: "2026-10-21T12:00:00.000Z",
    });
    const jsonWithTimestamp2 = exportTraceabilityAuditJson({
      report,
      parameterIndex,
      exportedAt: "2026-10-21T12:00:00.000Z",
    });
    assert.strictEqual(jsonWithTimestamp1, jsonWithTimestamp2);
  });

  // -------------------------------------------------------------------------
  // 12. Hidden reasoning absent from export
  // -------------------------------------------------------------------------
  it("12. Hidden reasoning absent from export: only explicit governed rationale fields exported", () => {
    const { trace, traceId, runId, plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const validationEvidence = buildValidEmpiricalValidationContext(traceId);
    const auditor = new TraceabilityAuditor();
    const report = auditor.auditTraceability({ runTrace: trace, validationEvidence });
    const parameterIndex = ParameterProvenanceIndex.fromArtifacts({ traceId, runId, plan, semanticDesign, decisionRecord });

    const json = exportTraceabilityAuditJson({ report, parameterIndex });

    // Ensure hidden chain-of-thought and internal deliberation terms are completely absent
    assert.ok(!json.includes("chainOfThought"), "chainOfThought must not exist in export");
    assert.ok(!json.includes("hiddenReasoning"), "hiddenReasoning must not exist in export");
    assert.ok(!json.includes("tokenLevelDeliberation"), "tokenLevelDeliberation must not exist in export");

    // Only explicit governed rationale strings are present
    assert.ok(json.includes("Level 3.5 drive calibration"));
    assert.ok(json.includes("Tight overdrive front-end boost"));
    assert.ok(json.includes("Shape lead tone for articulate note separation"));
  });

  // -------------------------------------------------------------------------
  // 13. Record / edge / blocker counts unchanged
  // -------------------------------------------------------------------------
  it("13. Record / edge / blocker counts unchanged: exactly 22 records, 14 edges, 8 blockers", () => {
    // 14 canonical relationship edges
    const edgeTypes = Object.values(GOVERNED_EDGE_TYPES);
    assert.strictEqual(edgeTypes.length, 14, "Exactly 14 canonical relationship edges");

    // 8 hard blockers
    const hardBlockers = Object.values(FROZEN_HARD_BLOCKERS);
    assert.strictEqual(hardBlockers.length, 8, "Exactly 8 hard blockers");
  });

  // -------------------------------------------------------------------------
  // 14. No Record 23
  // -------------------------------------------------------------------------
  it("14. No Record 23: export DTO and audit report are local serialization DTOs, not canonical records", () => {
    const { trace, traceId, runId, plan, semanticDesign, decisionRecord } = buildComprehensiveTrace();
    const report = auditTraceability({ runTrace: trace });
    const parameterIndex = ParameterProvenanceIndex.fromArtifacts({ traceId, runId, plan, semanticDesign, decisionRecord });

    const dto = exportTraceabilityAuditDto({ report, parameterIndex });
    assert.strictEqual(dto.exportVersion, WP29_TRACEABILITY_EXPORT_VERSION);
    assert.strictEqual(dto.exportVersion, "wp29-traceability-export-v1");

    // Must NOT have canonical record metadata (schemaVersion, recordIntegrityMetadata)
    assert.strictEqual((dto as any).record_id, undefined);
    assert.strictEqual((dto as any).schemaVersion, undefined);
    assert.strictEqual((dto as any).recordIntegrityMetadata, undefined);
  });

  // -------------------------------------------------------------------------
  // 15. No direct Gate-8 mutation
  // -------------------------------------------------------------------------
  it("15. No direct Gate-8 mutation: mapper outputs read-only UpstreamGovernanceState without Gate-8 authority", () => {
    const { trace } = buildComprehensiveTrace();
    const report = auditTraceability({ runTrace: trace });

    const gov = toUpstreamGovernanceState(report);

    // Deeply frozen
    assert.ok(Object.isFrozen(gov));
    assert.strictEqual((gov as any).gate_8_authorized, undefined);
    assert.strictEqual((gov as any).adoption_decision_outcome, undefined);
    assert.strictEqual((gov as any).record_20, undefined);
    assert.strictEqual((gov as any).record_22, undefined);
  });

  // -------------------------------------------------------------------------
  // 16. Authoritative 21-principle audit-strength matrix and P20 guardrail preserved
  // -------------------------------------------------------------------------
  it("16. Authoritative 21-principle audit-strength matrix and P20 guardrail preserved", () => {
    const all = getAllPrinciplesMetadata();
    assert.strictEqual(all.length, 21, "Exactly 21 frozen principles");

    const expectedMatrix: Record<number, string> = {
      // STRUCTURALLY_VERIFIABLE (5 principles)
      1: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      7: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      12: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      15: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      18: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,

      // EVIDENCE_PRESENT (8 principles)
      2: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      3: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      8: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      9: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      13: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      16: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      19: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      20: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,

      // DELEGATED_UPSTREAM (8 principles)
      4: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      5: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      6: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      10: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      11: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      14: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      17: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      21: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    };

    // Assert every principle from 1 to 21
    for (let i = 1; i <= 21; i++) {
      const p = getPrincipleMetadata(i);
      assert.ok(p, `Principle ${i} must exist in metadata`);
      assert.strictEqual(
        p.auditStrength,
        expectedMatrix[i],
        `Principle ${i} (${p.title}) must have audit strength ${expectedMatrix[i]}`
      );
    }

    // P20 Guardrail explicit verification
    const p20 = getPrincipleMetadata(20)!;
    assert.strictEqual(p20.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT);
    assert.ok(p20.auditBoundaryNotes.includes("P20 Guardrail"));
    assert.ok(p20.auditBoundaryNotes.includes("does NOT independently certify"));

    // Check runtime evaluation of clean trace for P20:
    const { trace } = buildComprehensiveTrace();
    const auditor = new TraceabilityAuditor();
    const report = auditor.audit(trace);
    const p20Result = report.principleResults.find((p) => p.principleNumber === 20);
    assert.ok(p20Result);
    assert.strictEqual(p20Result.state, PRINCIPLE_AUDIT_STATES.SATISFIED);
    assert.strictEqual(p20Result.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT);
    assert.ok(p20Result.notes?.includes("P20 Guardrail"));
    assert.ok(p20Result.notes?.includes("Does NOT independently certify"));
  });
});
