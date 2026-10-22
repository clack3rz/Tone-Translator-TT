// src/tests/traceabilityParameterProvenance.test.ts
// Unit tests for WP-29 Stage 2 Slice 1D: Level 3 Parameter Provenance Index & Query.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STREAMS,
  SOUND_ENGINEER_LAYERS,
  CHECKPOINT_STATUSES,
  createCheckpointEnvelope,
  createArtifactReference,
  ARTIFACT_TYPES,
  createRunTraceRecorder,
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
  formatParameterKey,
  PARAMETER_PROVENANCE_LEVELS,
  MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
  ParameterIdentity,
  ParameterProvenanceIndex,
  buildParameterProvenanceIndex,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_CATEGORIES,
  auditTraceability,
  TRACEABILITY_AUDIT_VERDICTS,
} from "../sound-engineer/validation/traceability";
import { createCleanTrace } from "./traceabilityAuditor.test";

describe("WP-29 Stage 2 Slice 1D: Level 3 Parameter Provenance Index & Query", () => {
  // Test 1: Capability bounds & Level 4/5 denial
  it("1. Strictly bounds maximum capability to LEVEL_3_DECISION_RECORD_TRACE and denies Level 4/5", () => {
    assert.equal(
      MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
      PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE
    );

    const index = ParameterProvenanceIndex.fromArtifacts({});
    const lvl4 = index.queryLevel4Item("stg_lead::amp_model::Gain");
    assert.equal(lvl4.supported, false);
    assert.equal(lvl4.level, PARAMETER_PROVENANCE_LEVELS.LEVEL_4_EXACT_DECISION_TRACE);
    assert.ok(lvl4.reason.includes("not supported by current runtime contracts"));

    const lvl5 = index.queryLevel5Causal("stg_lead::amp_model::Gain");
    assert.equal(lvl5.supported, false);
    assert.equal(lvl5.level, PARAMETER_PROVENANCE_LEVELS.LEVEL_5_EXACT_CAUSAL_TRACE);
    assert.ok(lvl5.reason.includes("not supported by current runtime contracts"));
  });

  // Test 2: Composite key formatting & parameter identity
  it("2. Formats composite key preserving exact identity components", () => {
    const identity: ParameterIdentity = {
      stageId: "stg_overdrive_01",
      targetDeviceId: "pedal_ts9",
      parameterName: "Drive",
    };
    const key = formatParameterKey(identity);
    assert.equal(key, "stg_overdrive_01::pedal_ts9::Drive");

    // Case and special characters preserved exactly; no normalization heuristics
    const specialIdentity: ParameterIdentity = {
      stageId: "STAGE_EQ_CUSTOM",
      targetDeviceId: "rack::parametric_eq",
      parameterName: "Q-Factor_Band_1",
    };
    assert.equal(
      formatParameterKey(specialIdentity),
      "STAGE_EQ_CUSTOM::rack::parametric_eq::Q-Factor_Band_1"
    );
  });

  // Test 3: Level 1 Provenance (Parameter -> TranslationItem)
  it("3. Establishes Level 1 provenance when only translation item exists", () => {
    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_l1",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_absent",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_preamp",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_brit_800",
            targetDeviceName: "British 800 Lead",
            deviceCategory: "amp",
            platformSpecificParameters: {
              PreampGain: 6.5,
              MasterVolume: 8.0,
            },
          },
          rationale: "Matched high-gain British bite",
          confidence: 0.92,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    // Build index with no matching semanticDesign
    const index = ParameterProvenanceIndex.fromArtifacts({ plan });

    assert.equal(index.totalParameters, 2);
    assert.equal(index.size, 2);

    const gainEntry = index.getSingle("stg_preamp::amp_brit_800::PreampGain");
    assert.ok(gainEntry);
    assert.equal(gainEntry.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_1_PARAMETER_IDENTITY);
    assert.equal(gainEntry.translatedValue, 6.5);
    assert.equal(gainEntry.isAmbiguous, false);
    assert.equal(gainEntry.translationItem.semanticRole, "PREAMP");
    assert.equal(gainEntry.translationItem.targetDeviceName, "British 800 Lead");
    assert.equal(gainEntry.translationItem.rationale, "Matched high-gain British bite");
    assert.equal(gainEntry.semanticStage, undefined);
    assert.equal(gainEntry.decisionRecord, undefined);

    // Finding emitted for unresolved semantic stage
    const findings = index.getFindings();
    assert.equal(findings.length, 2);
    assert.equal(findings[0].code, "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED");
    assert.equal(findings[0].type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
    assert.equal(findings[0].category, TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE);
  });

  // Test 4: Level 2 Provenance (Parameter -> TranslationItem -> SemanticProcessingStage)
  it("4. Establishes Level 2 provenance when stageId matches SemanticProcessingStage", () => {
    const semanticRef = createArtifactReference({
      artifactId: "std_001",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const semanticDesign = createSemanticToneDesign({
      designId: "std_001",
      runId: "run_p1d_l2",
      stream: EXECUTION_STREAMS.SHADOW,
      decisionRecordReference: createArtifactReference({
        artifactId: "edr_unlinked",
        artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
        contractVersion: "1.0.0",
      }),
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_preamp",
          stageIndex: 0,
          role: "PREAMP",
          designIntent: "Bright crunch channel voicing",
          gainStrategy: { headroomProfile: "EDGE_OF_BREAKUP" },
          constraints: ["Keep noise below -60dB"],
        },
      ],
    });

    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_l2",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: semanticRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_preamp",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_brit_800",
            targetDeviceName: "British 800 Lead",
            deviceCategory: "amp",
            platformSpecificParameters: {
              PreampGain: 6.5,
            },
          },
          rationale: "Matched high-gain British bite",
          confidence: 0.92,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    // decisionRecord is absent / unresolvable
    const index = ParameterProvenanceIndex.fromArtifacts({
      plan,
      semanticDesign,
    });

    const entry = index.getSingle("stg_preamp::amp_brit_800::PreampGain");
    assert.ok(entry);
    assert.equal(entry.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_2_DESIGN_TRACE);
    assert.ok(entry.semanticStage);
    assert.equal(entry.semanticStage.stageId, "stg_preamp");
    assert.equal(entry.semanticStage.stageIndex, 0);
    assert.equal(entry.semanticStage.designIntent, "Bright crunch channel voicing");
    assert.deepEqual(entry.semanticStage.constraints, ["Keep noise below -60dB"]);
    assert.equal(entry.decisionRecord, undefined);

    // Finding emitted for unresolved decision record
    const findings = index.getFindings();
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "WARN_PARAM_DECISION_RECORD_UNRESOLVED");
    assert.equal(findings[0].type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
  });

  // Test 5: Level 3 Provenance (Parameter -> Translation -> SemanticStage -> EngineeringDecisionRecord)
  it("5. Establishes Level 3 provenance when upstream EngineeringDecisionRecord resolves", () => {
    const evidenceRef = createArtifactReference({
      artifactId: "evi_001",
      artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
      contractVersion: "1.0.0",
    });

    const decisionRecord = createEngineeringDecisionRecord({
      decisionRecordId: "edr_001",
      runId: "run_p1d_l3",
      stream: EXECUTION_STREAMS.SHADOW,
      evidenceReference: evidenceRef,
      overallObjective: "Deliver aggressive modern hard-rock rhythm tone",
      decisions: [
        {
          decisionId: "dec_preamp",
          category: "AMPLIFICATION",
          purpose: "High-mid harmonic saturation",
          intent: "British tube compression",
          rationale: "Aligns with target spectral density",
          constraints: ["Avoid muddy low-mids"],
        },
      ],
      confidence: 0.96,
    });
    const decisionRef = createDecisionArtifactReference(decisionRecord);

    const semanticDesign = createSemanticToneDesign({
      designId: "std_001",
      runId: "run_p1d_l3",
      stream: EXECUTION_STREAMS.SHADOW,
      decisionRecordReference: decisionRef,
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_preamp",
          stageIndex: 0,
          role: "PREAMP",
          designIntent: "High-mid harmonic saturation",
          gainStrategy: { headroomProfile: "HIGH_GAIN_LEAD" },
          constraints: ["Avoid muddy low-mids"],
        },
      ],
    });
    const semanticRef = createSemanticDesignArtifactReference(semanticDesign);

    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_l3",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: semanticRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_preamp",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_brit_800",
            targetDeviceName: "British 800 Lead",
            deviceCategory: "amp",
            platformSpecificParameters: {
              PreampGain: 7.2,
              Presence: 5.0,
            },
          },
          rationale: "Matched high-gain British bite",
          confidence: 0.95,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({
      plan,
      semanticDesign,
      decisionRecord,
    });

    assert.equal(index.totalParameters, 2);
    assert.equal(index.size, 2);

    const gainEntry = index.getSingle("stg_preamp::amp_brit_800::PreampGain");
    assert.ok(gainEntry);
    assert.equal(gainEntry.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE);
    assert.equal(gainEntry.isAmbiguous, false);
    assert.ok(gainEntry.translationItem);
    assert.ok(gainEntry.semanticStage);
    assert.ok(gainEntry.decisionRecord);
    assert.equal(gainEntry.decisionRecord.decisionRecordId, "edr_001");
    assert.equal(
      gainEntry.decisionRecord.overallObjective,
      "Deliver aggressive modern hard-rock rhythm tone"
    );
    assert.equal(gainEntry.decisionRecord.confidence, 0.96);

    // Zero unresolved warnings when all levels resolve cleanly
    assert.equal(index.getFindings().length, 0);

    const summary = index.getSummary();
    assert.equal(summary.totalIndexedParameters, 2);
    assert.equal(summary.uniqueKeysCount, 2);
    assert.equal(summary.ambiguousKeysCount, 0);
    assert.equal(summary.level1OnlyCount, 0);
    assert.equal(summary.level2Count, 0);
    assert.equal(summary.level3Count, 2);
    assert.equal(summary.maxLevelReached, PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE);
  });

  // Test 6: Collision handling (duplicate composite key)
  it("6. Handles composite key collisions by preserving both entries and marking ambiguous", () => {
    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_collision",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_001",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_parallel_eq",
          semanticRole: "PRE_FILTER",
          mappingDecision: {
            targetDeviceId: "pedal_graphic_eq",
            targetDeviceName: "Graphic EQ A",
            deviceCategory: "stomp",
            platformSpecificParameters: {
              Band100Hz: +3.0,
            },
          },
          rationale: "Path A boost",
          confidence: 0.9,
        },
        {
          stageId: "stg_parallel_eq",
          semanticRole: "PRE_FILTER",
          mappingDecision: {
            targetDeviceId: "pedal_graphic_eq",
            targetDeviceName: "Graphic EQ B (Split Branch)",
            deviceCategory: "stomp",
            platformSpecificParameters: {
              Band100Hz: -2.0,
            },
          },
          rationale: "Path B cut",
          confidence: 0.85,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({ plan });

    const key = "stg_parallel_eq::pedal_graphic_eq::Band100Hz";

    // Uniqueness free - composite key is collision prone
    assert.equal(index.isAmbiguous(key), true);
    assert.deepEqual(index.getAmbiguousKeys(), [key]);

    // getSingle returns undefined because of ambiguity
    assert.equal(index.getSingle(key), undefined);

    // lookup returns both colliding entries
    const lookupResult = index.lookup(key);
    assert.ok(Array.isArray(lookupResult));
    assert.equal(lookupResult.length, 2);

    const [e1, e2] = lookupResult;
    assert.equal(e1.translatedValue, +3.0);
    assert.equal(e1.isAmbiguous, true);
    assert.equal(e1.translationItem.rationale, "Path A boost");

    assert.equal(e2.translatedValue, -2.0);
    assert.equal(e2.isAmbiguous, true);
    assert.equal(e2.translationItem.rationale, "Path B cut");

    // Total parameters count is 2, unique keys is 1
    assert.equal(index.totalParameters, 2);
    assert.equal(index.size, 1);

    // Emits factual WARN_PARAM_KEY_COLLISION_AMBIGUOUS finding
    const findings = index.getFindings();
    const collisionFinding = findings.find(
      (f) => f.code === "WARN_PARAM_KEY_COLLISION_AMBIGUOUS"
    );
    assert.ok(collisionFinding);
    assert.equal(collisionFinding.type, TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE);
    assert.equal(collisionFinding.category, TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE);
  });

  // Test 7: Query filtering by stageId, targetDeviceId, and provenanceLevel
  it("7. Filters parameter provenance entries by stage, device, and capability level", () => {
    const semanticRef = createArtifactReference({
      artifactId: "std_001",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const semanticDesign = createSemanticToneDesign({
      designId: "std_001",
      runId: "run_p1d_queries",
      stream: EXECUTION_STREAMS.SHADOW,
      decisionRecordReference: createArtifactReference({
        artifactId: "edr_001",
        artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
        contractVersion: "1.0.0",
      }),
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_overdrive",
          stageIndex: 0,
          role: "PRE_OVERDRIVE",
          designIntent: "Mid boost overdrive",
          constraints: [],
        },
      ],
    });

    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_queries",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: semanticRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_overdrive",
          semanticRole: "PRE_OVERDRIVE",
          mappingDecision: {
            targetDeviceId: "pedal_ts9",
            targetDeviceName: "Tube Screamer",
            deviceCategory: "stomp",
            platformSpecificParameters: {
              Drive: 4.0,
              Tone: 6.0,
            },
          },
          rationale: "Clean mid boost",
          confidence: 0.95,
        },
        {
          stageId: "stg_unmapped_cab",
          semanticRole: "CABINET_IMPULSE",
          mappingDecision: {
            targetDeviceId: "cab_4x12",
            targetDeviceName: "4x12 Vintage 30",
            deviceCategory: "cab",
            platformSpecificParameters: {
              MicDistance: 2.5,
            },
          },
          rationale: "Default cab",
          confidence: 0.8,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({
      plan,
      semanticDesign,
    });

    // Query by stageId
    const odParams = index.getByStageId("stg_overdrive");
    assert.equal(odParams.length, 2);
    assert.ok(odParams.every((p) => p.identity.stageId === "stg_overdrive"));

    const cabParams = index.getByStageId("stg_unmapped_cab");
    assert.equal(cabParams.length, 1);
    assert.equal(cabParams[0].identity.parameterName, "MicDistance");

    // Query by targetDeviceId
    const ts9Params = index.getByTargetDeviceId("pedal_ts9");
    assert.equal(ts9Params.length, 2);

    // Query by provenance level
    const lvl1Params = index.getByProvenanceLevel(
      PARAMETER_PROVENANCE_LEVELS.LEVEL_1_PARAMETER_IDENTITY
    );
    assert.equal(lvl1Params.length, 1);
    assert.equal(lvl1Params[0].identity.stageId, "stg_unmapped_cab");

    const lvl2Params = index.getByProvenanceLevel(
      PARAMETER_PROVENANCE_LEVELS.LEVEL_2_DESIGN_TRACE
    );
    assert.equal(lvl2Params.length, 2);
  });

  // Test 8: Extracting from RunTrace checkpoints
  it("8. Builds ParameterProvenanceIndex directly from an execution RunTrace", () => {
    const runId = "run_p1d_trace_extract";
    const stream = EXECUTION_STREAMS.SHADOW;
    const recorder = createRunTraceRecorder({ runId, stream });

    // Evidence
    const evidence = createEvidenceRecord({
      runId,
      stream,
      sources: [
        createArtifactReference({
          artifactId: "snap_001",
          artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
          contractVersion: "1.0.0",
        }),
      ],
      confidence: 1.0,
    });
    const evidenceRef = createEvidenceArtifactReference(evidence);
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-10-20T12:00:00.001Z",
        completedAt: "2026-10-20T12:00:00.020Z",
        output: evidenceRef,
        payload: evidence,
      })
    );

    // Engineering Decision Record
    const decisionRecord = createEngineeringDecisionRecord({
      decisionRecordId: "edr_trace_01",
      runId,
      stream,
      evidenceReference: evidenceRef,
      overallObjective: "Warm vintage blues crunch",
      decisions: [],
      confidence: 0.95,
    });
    const decisionRef = createDecisionArtifactReference(decisionRecord);
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-10-20T12:00:00.021Z",
        completedAt: "2026-10-20T12:00:00.040Z",
        inputs: [evidenceRef],
        output: decisionRef,
        payload: decisionRecord,
      })
    );

    // SemanticToneDesign
    const semanticDesign = createSemanticToneDesign({
      designId: "std_trace_01",
      runId,
      stream,
      decisionRecordReference: decisionRef,
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_amp",
          stageIndex: 0,
          role: "PREAMP",
          designIntent: "Edge-of-breakup harmonic drive",
          constraints: [],
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
        startedAt: "2026-10-20T12:00:00.041Z",
        completedAt: "2026-10-20T12:00:00.060Z",
        inputs: [decisionRef],
        output: semanticRef,
        payload: semanticDesign,
      })
    );

    // PlatformTranslationPlan
    const plan = createPlatformTranslationPlan({
      runId,
      stream,
      semanticDesignReference: semanticRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_amp",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_tweed_deluxe",
            targetDeviceName: "57 Custom Deluxe",
            deviceCategory: "amp",
            platformSpecificParameters: {
              Volume: 6.0,
              Tone: 7.5,
            },
          },
          rationale: "Classic 6V6 power sag",
          confidence: 0.98,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });
    const translationRef = createPlatformTranslationArtifactReference(plan);
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-10-20T12:00:00.061Z",
        completedAt: "2026-10-20T12:00:00.080Z",
        inputs: [semanticRef],
        output: translationRef,
        payload: plan,
      })
    );

    const trace = recorder.getTraceSnapshot();

    // Build index using functional helper
    const index = buildParameterProvenanceIndex(trace);

    assert.equal(index.totalParameters, 2);
    assert.equal(index.size, 2);

    const vol = index.getSingle("stg_amp::amp_tweed_deluxe::Volume");
    assert.ok(vol);
    assert.equal(vol.provenanceLevel, PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE);
    assert.equal(vol.translatedValue, 6.0);
    assert.equal(vol.decisionRecord?.decisionRecordId, "edr_trace_01");
    assert.equal(vol.decisionRecord?.overallObjective, "Warm vintage blues crunch");
  });

  // Test 9: TraceabilityAuditor report includes parameterProvenanceSummary
  it("9. TraceabilityAuditor report includes parameterProvenanceSummary and capability notes", () => {
    const runId = "run_p1d_auditor_integration";
    const stream = EXECUTION_STREAMS.SHADOW;
    const recorder = createRunTraceRecorder({ runId, stream });

    // Build minimal trace with platform parameters
    const plan = createPlatformTranslationPlan({
      runId,
      stream,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_001",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_boost",
          semanticRole: "PRE_OVERDRIVE",
          mappingDecision: {
            targetDeviceId: "pedal_micro_amp",
            targetDeviceName: "Micro Amp Boost",
            deviceCategory: "stomp",
            platformSpecificParameters: {
              Gain: 12.0,
            },
          },
          rationale: "Clean linear boost",
          confidence: 0.99,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-10-20T12:00:00.001Z",
        completedAt: "2026-10-20T12:00:00.020Z",
        output: createPlatformTranslationArtifactReference(plan),
        payload: plan,
      })
    );

    const trace = recorder.getTraceSnapshot();
    const report = auditTraceability(trace);

    assert.ok(report.parameterProvenanceSummary);
    assert.equal(report.parameterProvenanceSummary.totalIndexedParameters, 1);
    assert.equal(report.parameterProvenanceSummary.uniqueKeysCount, 1);
    assert.ok(
      report.parameterProvenanceCapability.notes.includes(
        "indexed 1 parameters across 1 keys"
      )
    );
    assert.equal(
      report.parameterProvenanceCapability.maxSupportedLevel,
      PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE
    );
  });

  // Test 10: Exhaustive enumeration of translated parameters including unusual/nullish values
  it("10. Exhaustively enumerates all translated parameters including unusual/nullish values", () => {
    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_nullish",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_001",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_dsp",
          semanticRole: "POST_EQUALIZATION",
          mappingDecision: {
            targetDeviceId: "rack_multiband",
            targetDeviceName: "Multiband Processor",
            deviceCategory: "rack",
            platformSpecificParameters: {
              ZeroParam: 0,
              FalseParam: false,
              EmptyStringParam: "",
              NullParam: null,
            },
          },
          rationale: "Nullish test",
          confidence: 1.0,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({ plan });
    assert.equal(index.totalParameters, 4);
    assert.equal(index.size, 4);

    assert.equal(index.getSingle("stg_dsp::rack_multiband::ZeroParam")?.translatedValue, 0);
    assert.equal(index.getSingle("stg_dsp::rack_multiband::FalseParam")?.translatedValue, false);
    assert.equal(index.getSingle("stg_dsp::rack_multiband::EmptyStringParam")?.translatedValue, "");
    assert.equal(index.getSingle("stg_dsp::rack_multiband::NullParam")?.translatedValue, null);
  });

  // Test 11: Exact coverage accounting semantics
  it("11. ParameterProvenanceSummary provides exact mutually exclusive and cumulative coverage semantics", () => {
    const semanticRef = createArtifactReference({
      artifactId: "std_001",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const decisionRecord = createEngineeringDecisionRecord({
      decisionRecordId: "edr_001",
      runId: "run_p1d_acct",
      stream: EXECUTION_STREAMS.SHADOW,
      evidenceReference: createArtifactReference({
        artifactId: "evi_001",
        artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
        contractVersion: "1.0.0",
      }),
      overallObjective: "High-definition acoustic clarity",
      decisions: [],
      confidence: 1.0,
    });
    const decisionRef = createDecisionArtifactReference(decisionRecord);

    const semanticDesign = createSemanticToneDesign({
      designId: "std_001",
      runId: "run_p1d_acct",
      stream: EXECUTION_STREAMS.SHADOW,
      decisionRecordReference: decisionRef,
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_resolved_semantic",
          stageIndex: 0,
          role: "PREAMP",
          designIntent: "Clean transparent headroom",
          constraints: [],
        },
      ],
    });

    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_acct",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: semanticRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        // Level 3 candidate: resolves to stg_resolved_semantic and edr_001
        {
          stageId: "stg_resolved_semantic",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_clean",
            targetDeviceName: "Clean Tube Amp",
            deviceCategory: "amp",
            platformSpecificParameters: {
              Gain: 2.0,
            },
          },
          rationale: "Matched clean headroom",
          confidence: 1.0,
        },
        // Level 1 candidate: stg_missing_semantic does not exist in semanticDesign
        {
          stageId: "stg_missing_semantic",
          semanticRole: "POST_EQUALIZATION",
          mappingDecision: {
            targetDeviceId: "rack_eq",
            targetDeviceName: "Studio EQ",
            deviceCategory: "rack",
            platformSpecificParameters: {
              HighShelf: +1.5,
            },
          },
          rationale: "Air band",
          confidence: 1.0,
        },
        // Collision candidates: 2 entries sharing same composite key
        {
          stageId: "stg_resolved_semantic",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_clean",
            targetDeviceName: "Clean Tube Amp Alt",
            deviceCategory: "amp",
            platformSpecificParameters: {
              Master: 5.0,
            },
          },
          rationale: "Branch A",
          confidence: 0.9,
        },
        {
          stageId: "stg_resolved_semantic",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_clean",
            targetDeviceName: "Clean Tube Amp Alt",
            deviceCategory: "amp",
            platformSpecificParameters: {
              Master: 6.0,
            },
          },
          rationale: "Branch B",
          confidence: 0.9,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({
      plan,
      semanticDesign,
      decisionRecord,
    });

    const summary = index.getSummary();

    // Population counts
    assert.equal(summary.totalParametersEncountered, 4);
    assert.equal(summary.totalIndexEntries, 4);
    assert.equal(summary.uniqueKeysCount, 3); // Gain, HighShelf, Master
    assert.equal(summary.ambiguousKeysCount, 1); // Master key collided
    assert.equal(summary.ambiguousEntriesCount, 2); // 2 Master entries

    // Mutually exclusive final levels
    assert.equal(summary.level1ExactCount, 1); // HighShelf stopped at L1
    assert.equal(summary.level2ExactCount, 0); // None stopped at L2
    assert.equal(summary.level3ExactCount, 3); // Gain + 2 Master entries reached L3
    assert.equal(
      summary.level1ExactCount + summary.level2ExactCount + summary.level3ExactCount,
      summary.totalIndexEntries
    );

    // Cumulative counts
    assert.equal(summary.level1CumulativeCount, 4); // All 4 reached L1
    assert.equal(summary.level2CumulativeCount, 3); // 3 reached at least L2
    assert.equal(summary.level3CumulativeCount, 3); // 3 reached L3

    // Unresolved entries (entries that could not achieve required Level 3)
    assert.equal(summary.unresolvedEntriesCount, 1);
  });

  // Test 12: Unresolved Level 3 provenance in Gate-8 audit forces TRACE_COMPLIANCE_NOT_VERIFIABLE
  it("12. Unresolved required Level 3 parameter provenance forces TRACE_COMPLIANCE_NOT_VERIFIABLE with 0 violations", () => {
    const runTrace = createCleanTrace("run_p1d_unresolved_verdict");

    // Modify PLATFORM_TRANSLATION checkpoint payload to introduce parameter with non-existent semantic stage
    const modifiedCheckpoints = runTrace.checkpoints.map((cpEntry) => {
      if (cpEntry.checkpoint.layer === SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION) {
        const originalPlan = cpEntry.checkpoint.payload as any;
        const modifiedPlan = createPlatformTranslationPlan({
          runId: originalPlan.runId,
          stream: originalPlan.stream,
          semanticDesignReference: originalPlan.semanticDesignReference,
          validationReportReference: originalPlan.validationReportReference,
          targetPlatform: originalPlan.targetPlatform,
          translationDecisions: [
            {
              stageId: "stg_unregistered_stage_xyz",
              semanticRole: "PRE_FILTER",
              mappingDecision: {
                targetDeviceId: "pedal_eq",
                targetDeviceName: "Graphic EQ",
                deviceCategory: "stomp",
                platformSpecificParameters: {
                  MissingParam: 42,
                },
              },
              rationale: "Unregistered test",
              confidence: 0.9,
            },
          ],
          substitutions: [],
          unresolvedMappings: [],
          capabilityLimitations: [],
        });
        return {
          ...cpEntry,
          checkpoint: {
            ...cpEntry.checkpoint,
            payload: modifiedPlan,
          },
        };
      }
      return cpEntry;
    });

    const testTrace = {
      ...runTrace,
      checkpoints: modifiedCheckpoints,
    };

    const report = auditTraceability(testTrace);
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(
      report.findings.some((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION),
      false
    );
    assert.ok(
      report.findings.some((f) => f.code === "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED")
    );
  });

  // Test 13: Key collision forces TRACE_COMPLIANCE_NOT_VERIFIABLE with 0 violations
  it("13. Composite key collision forces TRACE_COMPLIANCE_NOT_VERIFIABLE without fabricating VIOLATION", () => {
    const runTrace = createCleanTrace("run_p1d_collision_verdict");

    const modifiedCheckpoints = runTrace.checkpoints.map((cpEntry) => {
      if (cpEntry.checkpoint.layer === SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION) {
        const originalPlan = cpEntry.checkpoint.payload as any;
        const modifiedPlan = createPlatformTranslationPlan({
          runId: originalPlan.runId,
          stream: originalPlan.stream,
          semanticDesignReference: originalPlan.semanticDesignReference,
          validationReportReference: originalPlan.validationReportReference,
          targetPlatform: originalPlan.targetPlatform,
          translationDecisions: [
            {
              stageId: "stg_filter",
              semanticRole: "PRE_FILTER",
              mappingDecision: {
                targetDeviceId: "pedal_eq",
                targetDeviceName: "Graphic EQ A",
                deviceCategory: "stomp",
                platformSpecificParameters: {
                  CutFreq: 100,
                },
              },
              rationale: "Branch A",
              confidence: 0.9,
            },
            {
              stageId: "stg_filter",
              semanticRole: "PRE_FILTER",
              mappingDecision: {
                targetDeviceId: "pedal_eq",
                targetDeviceName: "Graphic EQ B",
                deviceCategory: "stomp",
                platformSpecificParameters: {
                  CutFreq: 200,
                },
              },
              rationale: "Branch B",
              confidence: 0.9,
            },
          ],
          substitutions: [],
          unresolvedMappings: [],
          capabilityLimitations: [],
        });
        return {
          ...cpEntry,
          checkpoint: {
            ...cpEntry.checkpoint,
            payload: modifiedPlan,
          },
        };
      }
      return cpEntry;
    });

    const testTrace = {
      ...runTrace,
      checkpoints: modifiedCheckpoints,
    };

    const report = auditTraceability(testTrace);
    assert.equal(report.verdict, TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE);
    assert.equal(
      report.findings.some((f) => f.type === TRACEABILITY_FINDING_TYPES.VIOLATION),
      false
    );
    assert.ok(
      report.findings.some((f) => f.code === "WARN_PARAM_KEY_COLLISION_AMBIGUOUS")
    );
  });

  // Test 14: Unsupported Level 4/5 queries do not alter findings or audit report
  it("14. Unsupported Level 4 and Level 5 queries report limitation without altering audit state or findings", () => {
    const index = ParameterProvenanceIndex.fromArtifacts({});
    const initialFindingsCount = index.getFindings().length;

    const res4 = index.queryLevel4Item("any::key::here");
    assert.equal(res4.supported, false);
    assert.equal(index.getFindings().length, initialFindingsCount);

    const res5 = index.queryLevel5Causal("any::key::here");
    assert.equal(res5.supported, false);
    assert.equal(index.getFindings().length, initialFindingsCount);
  });

  // Test 15: Trace isolation
  it("15. Preserves trace isolation: entries and index bind to specific trace and execution identity", () => {
    const runTraceA = createCleanTrace("run_isolate_A");
    const runTraceB = createCleanTrace("run_isolate_B");

    const indexA = ParameterProvenanceIndex.fromTrace(runTraceA);
    const indexB = ParameterProvenanceIndex.fromTrace(runTraceB);

    assert.equal(indexA.traceId, runTraceA.traceId);
    assert.equal(indexA.runId, runTraceA.runId);

    assert.equal(indexB.traceId, runTraceB.traceId);
    assert.equal(indexB.runId, runTraceB.runId);

    assert.notEqual(indexA.traceId, indexB.traceId);
    assert.notEqual(indexA.runId, indexB.runId);
  });

  // Test 16: Immutability
  it("16. Enforces deep immutability across index entries, queries, summary, and findings", () => {
    const plan = createPlatformTranslationPlan({
      runId: "run_p1d_immut",
      stream: EXECUTION_STREAMS.SHADOW,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_001",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_drive",
          semanticRole: "PRE_OVERDRIVE",
          mappingDecision: {
            targetDeviceId: "pedal_od",
            targetDeviceName: "Overdrive",
            deviceCategory: "stomp",
            platformSpecificParameters: {
              Drive: 5.0,
            },
          },
          rationale: "Drive",
          confidence: 1.0,
        },
      ],
      substitutions: [],
      unresolvedMappings: [],
      capabilityLimitations: [],
    });

    const index = ParameterProvenanceIndex.fromArtifacts({ plan });

    const entry = index.getSingle("stg_drive::pedal_od::Drive")!;
    assert.ok(entry);
    assert.throws(() => {
      (entry as any).translatedValue = 999;
    }, /Cannot assign to read only property/);

    const allEntries = index.getAllEntries();
    assert.throws(() => {
      (allEntries as any).push(entry);
    }, /Cannot add property/);

    const allKeys = index.getAllKeys();
    assert.throws(() => {
      (allKeys as any).push("fake_key");
    }, /Cannot add property/);

    const summary = index.getSummary();
    assert.throws(() => {
      (summary as any).totalIndexedParameters = 0;
    }, /Cannot assign to read only property/);

    const findings = index.getFindings();
    assert.throws(() => {
      (findings as any).push({} as any);
    }, /Cannot add property/);
  });
});

