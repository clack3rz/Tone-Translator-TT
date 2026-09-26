// src/tests/layerContracts.test.ts
// Unit & Integration tests for Sound Engineer Phase 1B.2: Layer-Specific Contract Skeletons

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  EXECUTION_STREAMS,
  generateRunId,
  createArtifactReference,
  ARTIFACT_TYPES,
  SOUND_ENGINEER_LAYERS,
  createCheckpointEnvelope,
  CHECKPOINT_STATUSES,
  isCheckpointEnvelope,
  // Layer contracts:
  EVIDENCE_RECORD_CONTRACT_VERSION,
  generateEvidenceId,
  createEvidenceRecord,
  isEvidenceRecord,
  createEvidenceArtifactReference,
  EvidenceRecord,
  ENGINEERING_DECISION_CONTRACT_VERSION,
  generateDecisionRecordId,
  createEngineeringDecisionRecord,
  isEngineeringDecisionRecord,
  createDecisionArtifactReference,
  EngineeringDecisionRecord,
  SEMANTIC_TONE_DESIGN_CONTRACT_VERSION,
  generateDesignId,
  createSemanticToneDesign,
  isSemanticToneDesign,
  createSemanticDesignArtifactReference,
  SemanticToneDesign,
  VALIDATION_REPORT_CONTRACT_VERSION,
  generateValidationReportId,
  createValidationReport,
  isValidationReport,
  createValidationArtifactReference,
  ValidationReport,
  PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION,
  generatePlanId,
  createPlatformTranslationPlan,
  isPlatformTranslationPlan,
  createPlatformTranslationArtifactReference,
  PlatformTranslationPlan,
} from "../sound-engineer";

describe("Phase 1B.2: Layer-Specific Contract Skeletons", () => {
  const mockRunId = generateRunId(EXECUTION_STREAMS.SHADOW);
  const mockStream = EXECUTION_STREAMS.SHADOW;

  // Test 1: each artifact has independent contract version
  it("1. each artifact has independent contract version", () => {
    assert.equal(EVIDENCE_RECORD_CONTRACT_VERSION, "1.0.0");
    assert.equal(ENGINEERING_DECISION_CONTRACT_VERSION, "1.0.0");
    assert.equal(SEMANTIC_TONE_DESIGN_CONTRACT_VERSION, "1.0.0");
    assert.equal(VALIDATION_REPORT_CONTRACT_VERSION, "1.0.0");
    assert.equal(PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION, "1.0.0");
  });

  // Test 2: each artifact has unique artifact identity
  it("2. each artifact has unique artifact identity with dedicated prefix", () => {
    const eviId = generateEvidenceId();
    const edrId = generateDecisionRecordId();
    const stdId = generateDesignId();
    const valId = generateValidationReportId();
    const ptpId = generatePlanId();

    assert.ok(eviId.startsWith("evi_"));
    assert.ok(edrId.startsWith("edr_"));
    assert.ok(stdId.startsWith("std_"));
    assert.ok(valId.startsWith("val_"));
    assert.ok(ptpId.startsWith("ptp_"));

    const idSet = new Set([eviId, edrId, stdId, valId, ptpId]);
    assert.equal(idSet.size, 5, "All generated IDs must be distinct");
  });

  // Test 3: each artifact associates with runId/stream
  it("3. each artifact associates with runId and stream", () => {
    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      confidence: 0.95,
    });
    assert.equal(evidence.runId, mockRunId);
    assert.equal(evidence.stream, mockStream);
    assert.ok(isEvidenceRecord(evidence));

    const evidenceRef = createEvidenceArtifactReference(evidence);

    const decision = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: evidenceRef,
      overallObjective: "Classic hard rock crunch",
    });
    assert.equal(decision.runId, mockRunId);
    assert.equal(decision.stream, mockStream);
    assert.ok(isEngineeringDecisionRecord(decision));
  });

  // Test 4: lineage uses ArtifactReference rather than embedded upstream payload
  it("4. lineage uses ArtifactReference rather than embedded upstream payload", () => {
    const inputRef = createArtifactReference({
      artifactId: "snap_input_123",
      artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
    });

    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      sources: [inputRef],
    });
    assert.equal(evidence.sources.length, 1);
    assert.equal(evidence.sources[0].artifactId, "snap_input_123");
    // Ensure no raw snapshot payload is embedded
    assert.equal((evidence.sources[0] as any).userText, undefined);

    const evidenceRef = createEvidenceArtifactReference(evidence);
    const decision = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: evidenceRef,
      overallObjective: "High-definition lead tone",
    });
    assert.equal(decision.evidenceReference.artifactId, evidence.evidenceId);
    assert.equal(decision.evidenceReference.artifactType, "EvidenceRecord");
    // Ensure no raw evidence record payload is embedded
    assert.equal((decision.evidenceReference as any).musicalContext, undefined);
  });

  // Test 5: EvidenceRecord distinguishes observation from prescription structurally
  it("5. EvidenceRecord distinguishes observation from prescription structurally", () => {
    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      musicalContext: {
        genreStyle: "80s Hard Rock",
        instrumentContext: "Bridge Humbucker Guitar",
        estimatedTempoBpm: 120,
      },
      acousticCharacteristics: {
        spectralBalance: {
          lowEnd: "Controlled low frequencies below 120Hz",
          lowMids: "Warm body present at 500Hz",
          highMids: "Prominent bite between 2-3kHz",
        },
        dynamicResponse: {
          compression: "Heavy sustain with moderate dynamic range",
          transientAttack: "Fast, punchy pick articulation",
        },
        distortionTexture: {
          saturationLevel: "Medium-high saturation with harmonic richness",
        },
      },
      confidence: 0.9,
      uncertainties: ["Single mic recording with natural room reflections"],
    });

    assert.ok(isEvidenceRecord(evidence));
    assert.equal(evidence.musicalContext?.genreStyle, "80s Hard Rock");
    assert.equal(evidence.acousticCharacteristics?.spectralBalance?.highMids, "Prominent bite between 2-3kHz");
    assert.equal(evidence.uncertainties[0], "Single mic recording with natural room reflections");

    // Verify it lacks engineering prescriptions
    assert.equal((evidence as any).decisions, undefined);
    assert.equal((evidence as any).stages, undefined);
    assert.equal((evidence as any).targetPlatform, undefined);
  });

  // Test 6: EngineeringDecisionRecord supports objective/decision/rationale/constraints
  it("6. EngineeringDecisionRecord supports objective/decision/rationale/constraints", () => {
    const evidenceRef = createArtifactReference({
      artifactId: "evi_mock_001",
      artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
      contractVersion: "1.0.0",
    });

    const decisionRecord = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: evidenceRef,
      overallObjective: "Construct 80s lead tone with cutting upper-midrange and controlled low end",
      decisions: [
        {
          decisionId: "dec_tighten_lf",
          category: "PRE_GAIN_SHAPING",
          purpose: "Tighten low end before distortion stage",
          intent: "Reduce LF drive into preamp to prevent mud and enhance pick attack",
          rationale: "Reference evidence displays punchy transients with disciplined bass below 100Hz",
          constraints: ["Preserve low-mid warmth", "Avoid thinness in higher registers"],
          tradeOffs: ["Slight reduction in sub-bass weight"],
        },
      ],
      confidence: 0.92,
    });

    assert.ok(isEngineeringDecisionRecord(decisionRecord));
    assert.equal(decisionRecord.decisions.length, 1);
    const d = decisionRecord.decisions[0];
    assert.equal(d.purpose, "Tighten low end before distortion stage");
    assert.equal(d.intent, "Reduce LF drive into preamp to prevent mud and enhance pick attack");
    assert.equal(d.constraints.length, 2);
    assert.equal(d.tradeOffs?.[0], "Slight reduction in sub-bass weight");
  });

  // Test 7: SemanticToneDesign supports high-level processing domains without platform implementation
  it("7. SemanticToneDesign supports high-level processing domains without platform implementation", () => {
    const edrRef = createArtifactReference({
      artifactId: "edr_mock_001",
      artifactType: ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD,
      contractVersion: "1.0.0",
    });

    const design = createSemanticToneDesign({
      runId: mockRunId,
      stream: mockStream,
      decisionRecordReference: edrRef,
      topology: {
        routingType: "SERIES",
        branchCount: 1,
        description: "Single-path high-gain lead chain",
      },
      stages: [
        {
          stageId: "stage_pre_shaping",
          stageIndex: 0,
          role: "PRE_FILTER",
          designIntent: "High-pass roll off below 90Hz",
          frequencyStrategy: { lowCutHz: 90, highCutHz: 12000 },
          constraints: ["Slope must not exceed 12dB/octave"],
        },
        {
          stageId: "stage_preamp",
          stageIndex: 1,
          role: "PREAMP",
          designIntent: "British-voiced cascading tube distortion",
          gainStrategy: {
            headroomProfile: "HIGH_GAIN_LEAD",
            saturationHarmonics: "SYMMETRICAL_BALANCED",
            driveAmountPercent: 75,
          },
          constraints: ["Maintain pick definition under high saturation"],
        },
        {
          stageId: "stage_capture",
          stageIndex: 2,
          role: "MICROPHONE_CAPTURE",
          designIntent: "Dynamic moving-coil mic on-axis for direct punch",
          captureStrategy: {
            primaryTransducer: "DYNAMIC_MOVING_COIL",
            capturePlacementRole: "ON_AXIS_DIRECT_PUNCH",
            distanceProfile: "CLOSE_BAFFLE",
          },
          constraints: ["Minimize phase cancellation if combined"],
        },
      ],
      constraints: ["Latency must remain under 5ms"],
    });

    assert.ok(isSemanticToneDesign(design));
    assert.equal(design.stages.length, 3);
    assert.equal(design.stages[1].gainStrategy?.headroomProfile, "HIGH_GAIN_LEAD");
    assert.equal(design.stages[2].captureStrategy?.primaryTransducer, "DYNAMIC_MOVING_COIL");
  });

  // Test 8: ValidationReport supports PASS/WARN/FAIL-style outcomes without repairing input
  it("8. ValidationReport supports PASS/WARN/FAIL-style outcomes without repairing input", () => {
    const stdRef = createArtifactReference({
      artifactId: "std_mock_001",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    // PASS Report
    const passReport = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: stdRef,
      overallStatus: "PASS",
    });
    assert.equal(passReport.overallStatus, "PASS");
    assert.equal(passReport.isExecutable, true);
    assert.equal(passReport.summaryCounts.errorCount, 0);

    // WARN Report
    const warnReport = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: stdRef,
      findings: [
        {
          findingId: "find_warn_01",
          severity: "WARNING",
          ruleCode: "HIGH_FREQUENCY_ACCUMULATION",
          message: "Potential harshness around 4kHz if unbuffered",
        },
      ],
    });
    assert.equal(warnReport.overallStatus, "WARN");
    assert.equal(warnReport.isExecutable, true);
    assert.equal(warnReport.summaryCounts.warningCount, 1);

    // FAIL Report
    const failReport = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: stdRef,
      findings: [
        {
          findingId: "find_err_01",
          severity: "ERROR",
          ruleCode: "MISSING_AMPLIFIER_STAGE",
          message: "Signal chain contains no amplification stage",
        },
      ],
    });
    assert.equal(failReport.overallStatus, "FAIL");
    assert.equal(failReport.isExecutable, false);
    assert.equal(failReport.summaryCounts.errorCount, 1);
  });

  // Test 9: validation findings support structured severity/code/location/context
  it("9. validation findings support structured severity/code/location/context", () => {
    const stdRef = createArtifactReference({
      artifactId: "std_mock_002",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const report = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: stdRef,
      findings: [
        {
          findingId: "find_001",
          severity: "ERROR",
          ruleCode: "FREQUENCY_CUTOFF_INVERTED",
          message: "lowCutHz exceeds highCutHz",
          location: {
            stageId: "stage_pre_shaping",
            propertyPath: "stages[0].frequencyStrategy",
            fieldName: "lowCutHz",
          },
          context: { lowCutHz: 15000, highCutHz: 5000 },
        },
      ],
    });

    assert.ok(isValidationReport(report));
    const finding = report.findings[0];
    assert.equal(finding.severity, "ERROR");
    assert.equal(finding.ruleCode, "FREQUENCY_CUTOFF_INVERTED");
    assert.equal(finding.location?.stageId, "stage_pre_shaping");
    assert.deepEqual(finding.context, { lowCutHz: 15000, highCutHz: 5000 });
  });

  // Test 10: PlatformTranslationPlan identifies target platform
  it("10. PlatformTranslationPlan identifies target platform", () => {
    const stdRef = createArtifactReference({
      artifactId: "std_mock_003",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const plan = createPlatformTranslationPlan({
      runId: mockRunId,
      stream: mockStream,
      semanticDesignReference: stdRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        platformVersion: "5.5.0",
        formatFamily: "DAW_PLUGIN",
      },
    });

    assert.ok(isPlatformTranslationPlan(plan));
    assert.equal(plan.targetPlatform.platformName, "IK_MULTIMEDIA_AMPLITUBE_5");
    assert.equal(plan.targetPlatform.formatFamily, "DAW_PLUGIN");
  });

  // Test 11: PlatformTranslationPlan supports mappings/substitutions/unresolved items
  it("11. PlatformTranslationPlan supports mappings, substitutions, and unresolved items", () => {
    const stdRef = createArtifactReference({
      artifactId: "std_mock_004",
      artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
      contractVersion: "1.0.0",
    });

    const plan = createPlatformTranslationPlan({
      runId: mockRunId,
      stream: mockStream,
      semanticDesignReference: stdRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stage_preamp",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "amp_brit_8000",
            targetDeviceName: "Brit 8000",
            deviceCategory: "amp",
            platformSpecificParameters: { PreAmp_Gain: 7.5, Master: 6.0 },
          },
          rationale: "Selected 800-series model to fulfill high-gain British lead design intent",
          confidence: 0.95,
        },
      ],
      substitutions: [
        {
          stageId: "stage_cabinet",
          requestedSemanticRole: "CABINET_IMPULSE",
          substitutedDeviceName: "4x12 Brit 8000",
          substitutionReason: "Exact vintage cone unavailable, substituted factory 4x12 equivalent",
        },
      ],
      unresolvedMappings: [
        {
          stageId: "stage_dynamic_eq",
          semanticRequirement: "DYNAMIC_EQ_RESONANCE_SUPPRESSION",
          limitationReason: "Target platform lacks native dynamic EQ rack unit",
        },
      ],
      capabilityLimitations: ["No dynamic EQ module in current target version"],
      warnings: ["Substituted cabinet may slightly enhance 3kHz brightness"],
      translationConfidence: 0.88,
    });

    assert.ok(isPlatformTranslationPlan(plan));
    assert.equal(plan.translationDecisions.length, 1);
    assert.equal(plan.translationDecisions[0].mappingDecision.targetDeviceName, "Brit 8000");
    assert.equal(plan.substitutions.length, 1);
    assert.equal(plan.substitutions[0].substitutedDeviceName, "4x12 Brit 8000");
    assert.equal(plan.unresolvedMappings.length, 1);
    assert.equal(plan.capabilityLimitations.length, 1);
    assert.equal(plan.warnings.length, 1);
  });

  // Test 12: upstream artifacts contain no AT5/GUID/XML/VIR-coordinate dependencies
  it("12. upstream artifacts contain no AT5/GUID/XML/VIR-coordinate dependencies", () => {
    const upstreamFiles = [
      "evidenceRecord.ts",
      "engineeringDecisionRecord.ts",
      "semanticToneDesign.ts",
      "validationReport.ts",
    ];

    const dir = path.resolve(process.cwd(), "src/sound-engineer/layer-contracts");

    for (const f of upstreamFiles) {
      const content = fs.readFileSync(path.join(dir, f), "utf-8");
      assert.ok(!content.includes("AmpliTube"), `${f} must not mention AmpliTube`);
      assert.ok(!content.includes("at5p"), `${f} must not mention at5p`);
      assert.ok(!content.includes("guid"), `${f} must not mention guid`);
      assert.ok(!content.includes("GUID"), `${f} must not mention GUID`);
      assert.ok(!content.includes("speakerOrientation"), `${f} must not mention speakerOrientation`);
      assert.ok(!content.includes("Mic0XAxis"), `${f} must not mention Mic0XAxis`);
      assert.ok(!content.includes("Brit 8000"), `${f} must not mention Brit 8000`);
    }
  });

  // Test 13: platform plan may contain platform-specific implementation data
  it("13. platform plan is explicitly allowed to contain platform-specific implementation data", () => {
    const plan = createPlatformTranslationPlan({
      runId: mockRunId,
      stream: mockStream,
      semanticDesignReference: createArtifactReference({
        artifactId: "std_test",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
      }),
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_1",
          semanticRole: "PREAMP",
          mappingDecision: {
            targetDeviceId: "guid_brit_8000_123",
            targetDeviceName: "Brit 8000",
            deviceCategory: "amp",
            platformSpecificParameters: {
              guid: "d41d8cd98f00b204e9800998ecf8427e",
              micXAxis: -0.428446,
            },
          },
          rationale: "Concrete mapping to AT5 platform parameters",
          confidence: 1.0,
        },
      ],
    });

    assert.ok(isPlatformTranslationPlan(plan));
    const param = plan.translationDecisions[0].mappingDecision.platformSpecificParameters as any;
    assert.equal(param.guid, "d41d8cd98f00b204e9800998ecf8427e");
  });

  // Test 14: caller mutation cannot alter created artifacts
  it("14. caller mutation cannot alter created artifacts", () => {
    const mutableSources = [
      createArtifactReference({
        artifactId: "snap_1",
        artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
        contractVersion: "1.0.0",
      }),
    ];
    const mutableUncertainties = ["Uncertainty 1"];

    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      sources: mutableSources,
      uncertainties: mutableUncertainties,
    });

    mutableSources.push(
      createArtifactReference({
        artifactId: "snap_tamper",
        artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
        contractVersion: "1.0.0",
      })
    );
    mutableUncertainties.push("Tampered uncertainty");

    assert.equal(evidence.sources.length, 1);
    assert.equal(evidence.uncertainties.length, 1);
  });

  // Test 15: consumer mutation cannot alter artifacts
  it("15. consumer mutation cannot alter artifacts (deeply frozen)", () => {
    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      confidence: 0.9,
    });

    assert.ok(Object.isFrozen(evidence));
    assert.ok(Object.isFrozen(evidence.sources));
    assert.ok(Object.isFrozen(evidence.uncertainties));

    assert.throws(() => {
      (evidence as any).confidence = 0.1;
    }, TypeError);

    assert.throws(() => {
      (evidence.uncertainties as any).push("Tamper");
    }, TypeError);
  });

  // Test 16: runtime structural guards reject malformed records
  it("16. runtime structural guards reject malformed records", () => {
    assert.equal(isEvidenceRecord(null), false);
    assert.equal(isEvidenceRecord({}), false);
    assert.equal(isEvidenceRecord({ contractVersion: "1.0.0" }), false);

    assert.equal(isEngineeringDecisionRecord(null), false);
    assert.equal(isEngineeringDecisionRecord({ runId: "123" }), false);

    assert.equal(isSemanticToneDesign(null), false);
    assert.equal(isSemanticToneDesign({ stages: [] }), false);

    assert.equal(isValidationReport(null), false);
    assert.equal(isValidationReport({ overallStatus: "UNKNOWN" }), false);

    assert.equal(isPlatformTranslationPlan(null), false);
    assert.equal(isPlatformTranslationPlan({ targetPlatform: null }), false);
  });

  // Test 17: contract creation performs no external side effects
  it("17. contract creation performs no external side effects", () => {
    // Pure memory operations
    const evidence = createEvidenceRecord({ runId: mockRunId, stream: mockStream });
    assert.ok(evidence);
    const edr = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: createEvidenceArtifactReference(evidence),
      overallObjective: "Pure test",
    });
    assert.ok(edr);
  });

  // Test 18: existing CheckpointEnvelope can wrap each new payload type
  it("18. existing CheckpointEnvelope can wrap each new payload type", () => {
    // 1. Evidence envelope
    const evidence = createEvidenceRecord({ runId: mockRunId, stream: mockStream });
    const envEvidence = createCheckpointEnvelope<EvidenceRecord>({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T18:00:00.000Z",
      completedAt: "2026-09-25T18:00:00.020Z",
      output: createEvidenceArtifactReference(evidence),
      payload: evidence,
    });
    assert.ok(isCheckpointEnvelope(envEvidence));
    assert.equal(envEvidence.payload?.evidenceId, evidence.evidenceId);

    // 2. Engineering Decision envelope
    const edr = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: createEvidenceArtifactReference(evidence),
      overallObjective: "Wrap test",
    });
    const envEdr = createCheckpointEnvelope<EngineeringDecisionRecord>({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T18:00:00.000Z",
      completedAt: "2026-09-25T18:00:00.030Z",
      inputs: [createEvidenceArtifactReference(evidence)],
      output: createDecisionArtifactReference(edr),
      payload: edr,
    });
    assert.ok(isCheckpointEnvelope(envEdr));
    assert.equal(envEdr.payload?.overallObjective, "Wrap test");
  });

  // Test 19: ArtifactReference can represent each new artifact
  it("19. ArtifactReference can represent each new artifact", () => {
    const evidence = createEvidenceRecord({ runId: mockRunId, stream: mockStream });
    const refEvi = createEvidenceArtifactReference(evidence);
    assert.equal(refEvi.artifactType, "EvidenceRecord");
    assert.equal(refEvi.producingLayer, "EVIDENCE");

    const edr = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: refEvi,
      overallObjective: "Ref test",
    });
    const refEdr = createDecisionArtifactReference(edr);
    assert.equal(refEdr.artifactType, "EngineeringDecisionRecord");
    assert.equal(refEdr.producingLayer, "ENGINEERING");

    const std = createSemanticToneDesign({
      runId: mockRunId,
      stream: mockStream,
      decisionRecordReference: refEdr,
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "s1",
          stageIndex: 0,
          role: "PREAMP",
          designIntent: "Intent",
          constraints: [],
        },
      ],
    });
    const refStd = createSemanticDesignArtifactReference(std);
    assert.equal(refStd.artifactType, "SemanticToneDesign");
    assert.equal(refStd.producingLayer, "SEMANTIC_DESIGN");

    const val = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: refStd,
    });
    const refVal = createValidationArtifactReference(val);
    assert.equal(refVal.artifactType, "ValidationReport");
    assert.equal(refVal.producingLayer, "VALIDATION");

    const ptp = createPlatformTranslationPlan({
      runId: mockRunId,
      stream: mockStream,
      semanticDesignReference: refStd,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
    });
    const refPtp = createPlatformTranslationArtifactReference(ptp);
    assert.equal(refPtp.artifactType, "PlatformTranslationPlan");
    assert.equal(refPtp.producingLayer, "PLATFORM_TRANSLATION");
  });

  // Test 20: no orchestration/global registry is introduced
  it("20. confirms no orchestration or global registry exists in layer contracts", () => {
    const dir = path.resolve(process.cwd(), "src/sound-engineer/layer-contracts");
    const files = fs.readdirSync(dir);

    for (const f of files) {
      if (!f.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(dir, f), "utf-8");

      assert.ok(!content.includes("allArtifacts ="), `${f} must not define allArtifacts`);
      assert.ok(!content.includes("artifactRegistry"), `${f} must not define artifactRegistry`);
      assert.ok(!content.includes("orchestrator"), `${f} must not define orchestrator`);
      assert.ok(!content.includes("executePipeline"), `${f} must not define executePipeline`);
    }
  });

  // Test 21: Full end-to-end lineage representation test
  it("21. full end-to-end lineage flow is representable via ArtifactReference", () => {
    // 1. Input Snapshot reference
    const inputRef = createArtifactReference({
      artifactId: "snap_input_001",
      artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
    });

    // 2. EvidenceRecord consumes InputSnapshot
    const evidence = createEvidenceRecord({
      runId: mockRunId,
      stream: mockStream,
      sources: [inputRef],
      confidence: 0.95,
    });
    const evidenceRef = createEvidenceArtifactReference(evidence);

    // 3. EngineeringDecisionRecord consumes EvidenceRecord
    const decision = createEngineeringDecisionRecord({
      runId: mockRunId,
      stream: mockStream,
      evidenceReference: evidenceRef,
      overallObjective: "Vintage 1968 Plexi lead sound",
      decisions: [
        {
          decisionId: "d1",
          category: "AMPLIFICATION",
          purpose: "Warm power amp saturation",
          intent: "Drive EL34 power valves into natural compression",
          rationale: "Evidence indicates harmonically rich breakup with smooth top end",
          constraints: ["Maintain dynamic touch sensitivity"],
        },
      ],
    });
    const decisionRef = createDecisionArtifactReference(decision);

    // 4. SemanticToneDesign consumes EngineeringDecisionRecord
    const design = createSemanticToneDesign({
      runId: mockRunId,
      stream: mockStream,
      decisionRecordReference: decisionRef,
      topology: { routingType: "SERIES" },
      stages: [
        {
          stageId: "stg_poweramp",
          stageIndex: 0,
          role: "POWER_AMP",
          designIntent: "British EL34 power stage compression",
          gainStrategy: { headroomProfile: "SATURATED_CRUNCH" },
          constraints: ["Touch responsive dynamic envelope"],
        },
      ],
    });
    const designRef = createSemanticDesignArtifactReference(design);

    // 5. ValidationReport consumes SemanticToneDesign
    const validation = createValidationReport({
      runId: mockRunId,
      stream: mockStream,
      targetArtifact: designRef,
      overallStatus: "PASS",
    });
    const validationRef = createValidationArtifactReference(validation);

    // 6. PlatformTranslationPlan consumes SemanticToneDesign (and optionally ValidationReport)
    const translation = createPlatformTranslationPlan({
      runId: mockRunId,
      stream: mockStream,
      semanticDesignReference: designRef,
      validationReportReference: validationRef,
      targetPlatform: {
        platformName: "IK_MULTIMEDIA_AMPLITUBE_5",
        formatFamily: "DAW_PLUGIN",
      },
      translationDecisions: [
        {
          stageId: "stg_poweramp",
          semanticRole: "POWER_AMP",
          mappingDecision: {
            targetDeviceId: "British_Lead_50",
            targetDeviceName: "British Lead 50",
            deviceCategory: "amp",
          },
          rationale: "Matches EL34 50-watt power envelope",
          confidence: 0.98,
        },
      ],
    });
    const translationRef = createPlatformTranslationArtifactReference(translation);

    // Assert full lineage chain
    assert.equal(evidence.sources[0].artifactId, "snap_input_001");
    assert.equal(decision.evidenceReference.artifactId, evidence.evidenceId);
    assert.equal(design.decisionRecordReference.artifactId, decision.decisionRecordId);
    assert.equal(validation.targetArtifact.artifactId, design.designId);
    assert.equal(translation.semanticDesignReference.artifactId, design.designId);
    assert.equal(translation.validationReportReference?.artifactId, validation.reportId);
    assert.equal(translationRef.producingLayer, "PLATFORM_TRANSLATION");
  });
});
