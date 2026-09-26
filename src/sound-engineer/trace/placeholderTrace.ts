// src/sound-engineer/trace/placeholderTrace.ts
// Deterministic demonstration helper for synthetic Shadow pipeline traces

import { EXECUTION_STREAMS, generateRunId, RunId } from "../execution";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";
import { CHECKPOINT_STATUSES } from "../checkpoints/checkpointStatus";
import { createCheckpointEnvelope } from "../checkpoints/checkpointEnvelope";
import { createCheckpointDiagnostic, DIAGNOSTIC_SEVERITIES } from "../checkpoints/checkpointDiagnostic";
import { createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { createEvidenceRecord, createEvidenceArtifactReference } from "../layer-contracts/evidenceRecord";
import { createEngineeringDecisionRecord, createDecisionArtifactReference } from "../layer-contracts/engineeringDecisionRecord";
import { createSemanticToneDesign, createSemanticDesignArtifactReference } from "../layer-contracts/semanticToneDesign";
import { createValidationReport, createValidationArtifactReference } from "../layer-contracts/validationReport";
import { RunTraceRecorder, createRunTraceRecorder } from "./runTraceRecorder";
import { RunTrace } from "./runTrace";

export interface SyntheticShadowTraceOptions {
  runId?: RunId;
  promptText?: string;
}

/**
 * Constructs a deterministic synthetic Shadow RunTrace demonstrating the 6-layer pipeline:
 *   1. INPUT                 COMPLETED
 *   2. EVIDENCE              COMPLETED
 *   3. ENGINEERING           WARNING (demonstrates non-fatal engineering warning)
 *   4. SEMANTIC_DESIGN       COMPLETED
 *   5. VALIDATION            COMPLETED
 *   6. PLATFORM_TRANSLATION  PENDING (scheduled, awaiting target translation)
 *
 * Uses placeholder artifacts without invoking Gemini, DSP analysis, or database I/O.
 */
export function createSyntheticShadowTrace(
  options: SyntheticShadowTraceOptions = {}
): { recorder: RunTraceRecorder; trace: RunTrace } {
  const runId = options.runId ?? generateRunId(EXECUTION_STREAMS.SHADOW);
  const stream = EXECUTION_STREAMS.SHADOW;

  const recorder = createRunTraceRecorder({ runId, stream });

  // 1. INPUT Checkpoint: COMPLETED
  const inputArtifact = createArtifactReference({
    artifactId: `snap_${runId}`,
    artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
    contractVersion: "1.0.0",
    producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
  });

  const inputCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.INPUT,
    status: CHECKPOINT_STATUSES.COMPLETED,
    startedAt: "2026-09-25T18:00:00.000Z",
    completedAt: "2026-09-25T18:00:00.015Z",
    output: inputArtifact,
    diagnostics: [
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.INFO,
        code: "INPUT_INGESTED",
        message: "User text prompt and audio provenance captured into immutable snapshot",
        source: "InputIngestionStage",
      }),
    ],
  });
  recorder.recordCheckpoint(inputCheckpoint);

  // 2. EVIDENCE Checkpoint: COMPLETED
  const evidenceRecord = createEvidenceRecord({
    runId,
    stream,
    sources: [inputArtifact],
    musicalContext: {
      genreStyle: "80s Hard Rock",
      instrumentContext: "Bridge Humbucker Guitar",
    },
    acousticCharacteristics: {
      spectralBalance: { lowEnd: "Tight sub-100Hz", highMids: "Aggressive 2.5kHz bite" },
      dynamicResponse: { transientAttack: "Punchy, fast pick definition" },
    },
    confidence: 0.94,
    uncertainties: ["Single channel mono reference"],
  });
  const evidenceRef = createEvidenceArtifactReference(evidenceRecord);

  const evidenceCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
    status: CHECKPOINT_STATUSES.COMPLETED,
    startedAt: "2026-09-25T18:00:00.016Z",
    completedAt: "2026-09-25T18:00:00.045Z",
    inputs: [inputArtifact],
    output: evidenceRef,
    payload: evidenceRecord,
    diagnostics: [
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.INFO,
        code: "EVIDENCE_EXTRACTED",
        message: "Acoustic envelope and harmonic profile extracted",
        source: "EvidenceExtractionStage",
      }),
    ],
  });
  recorder.recordCheckpoint(evidenceCheckpoint);

  // 3. ENGINEERING Checkpoint: WARNING (Non-fatal acoustic constraint advisory)
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
      },
    ],
    confidence: 0.9,
  });
  const decisionRef = createDecisionArtifactReference(decisionRecord);

  const engineeringCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
    status: CHECKPOINT_STATUSES.WARNING,
    startedAt: "2026-09-25T18:00:00.046Z",
    completedAt: "2026-09-25T18:00:00.090Z",
    inputs: [evidenceRef],
    output: decisionRef,
    payload: decisionRecord,
    diagnostics: [
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.WARNING,
        code: "RESONANCE_NEAR_LIMIT",
        message: "Aggressive low-cut filter slope approaches phase shift boundary near 100Hz",
        source: "EngineeringAcousticFilterEvaluator",
      }),
    ],
  });
  recorder.recordCheckpoint(engineeringCheckpoint);

  // 4. SEMANTIC_DESIGN Checkpoint: COMPLETED
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
      {
        stageId: "stg_preamp",
        stageIndex: 1,
        role: "PREAMP",
        designIntent: "British high-gain cascading tube stage",
        gainStrategy: { headroomProfile: "HIGH_GAIN_LEAD" },
        constraints: ["Preserve pick articulation"],
      },
    ],
  });
  const semanticRef = createSemanticDesignArtifactReference(semanticDesign);

  const semanticCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
    status: CHECKPOINT_STATUSES.COMPLETED,
    startedAt: "2026-09-25T18:00:00.091Z",
    completedAt: "2026-09-25T18:00:00.125Z",
    inputs: [decisionRef],
    output: semanticRef,
    payload: semanticDesign,
  });
  recorder.recordCheckpoint(semanticCheckpoint);

  // 5. VALIDATION Checkpoint: COMPLETED
  const validationReport = createValidationReport({
    runId,
    stream,
    targetArtifact: semanticRef,
    overallStatus: "PASS",
  });
  const validationRef = createValidationArtifactReference(validationReport);

  const validationCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.VALIDATION,
    status: CHECKPOINT_STATUSES.COMPLETED,
    startedAt: "2026-09-25T18:00:00.126Z",
    completedAt: "2026-09-25T18:00:00.140Z",
    inputs: [semanticRef],
    output: validationRef,
    payload: validationReport,
  });
  recorder.recordCheckpoint(validationCheckpoint);

  // 6. PLATFORM_TRANSLATION Checkpoint: PENDING
  const translationCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
    status: CHECKPOINT_STATUSES.PENDING,
    inputs: [semanticRef, validationRef],
  });
  recorder.recordCheckpoint(translationCheckpoint);

  return {
    recorder,
    trace: recorder.getTraceSnapshot(),
  };
}

export interface ScenarioTraceOptions {
  runId: RunId;
  faultMode?: "normal" | "fail" | "timeout" | "hold";
  status: "created" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  error?: { code?: string; message?: string; timestamp?: string } | null;
  cancellationReason?: string | null;
}

/**
 * Generates an truthful synthetic QA trace tailored specifically to the active Shadow lifecycle scenario:
 * - NORMAL: 6 stages executed; non-fatal advisory logged in ENGINEERING (status: WARNING).
 * - FAIL: ENGINEERING fails; downstream stages explicitly SKIPPED (status: FAILED).
 * - TIMEOUT: ENGINEERING times out; downstream stages explicitly SKIPPED (status: FAILED).
 * - HOLD (running): ENGINEERING is actively RUNNING; downstream stages PENDING without fabricated timing (status: RUNNING).
 * - CANCELLED: ENGINEERING is CANCELLED; downstream stages explicitly SKIPPED (status: CANCELLED).
 */
export function createSyntheticTraceForScenario(
  options: ScenarioTraceOptions
): RunTrace {
  const { runId, faultMode = "normal", status, startedAt, completedAt, error, cancellationReason } = options;
  const stream = EXECUTION_STREAMS.SHADOW;
  const recorder = createRunTraceRecorder({ runId, stream, createdAt: startedAt });

  const baseStartTime = startedAt ? new Date(startedAt).getTime() : Date.now() - 200;
  const timeStr = (offsetMs: number) => new Date(baseStartTime + offsetMs).toISOString();

  // 1. INPUT Checkpoint: Always completed upon prompt ingestion
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
      startedAt: timeStr(0),
      completedAt: timeStr(15),
      output: inputArtifact,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "INPUT_INGESTED",
          message: "User text prompt and audio provenance captured into immutable snapshot",
          source: "InputIngestionStage",
          timestamp: timeStr(15),
        }),
      ],
    })
  );

  // 2. EVIDENCE Checkpoint: Always completed before deep engineering
  const evidenceRecord = createEvidenceRecord({
    runId,
    stream,
    sources: [inputArtifact],
    musicalContext: {
      genreStyle: "80s Hard Rock",
      instrumentContext: "Bridge Humbucker Guitar",
    },
    acousticCharacteristics: {
      spectralBalance: { lowEnd: "Tight sub-100Hz", highMids: "Aggressive 2.5kHz bite" },
      dynamicResponse: { transientAttack: "Punchy, fast pick definition" },
    },
    confidence: 0.94,
    uncertainties: ["Single channel mono reference"],
  });
  const evidenceRef = createEvidenceArtifactReference(evidenceRecord);

  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: timeStr(16),
      completedAt: timeStr(45),
      inputs: [inputArtifact],
      output: evidenceRef,
      payload: evidenceRecord,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "EVIDENCE_EXTRACTED",
          message: "Acoustic envelope and harmonic profile extracted",
          source: "EvidenceExtractionStage",
          timestamp: timeStr(45),
        }),
      ],
    })
  );

  // 3. Status Handling for ENGINEERING and Downstream Layers

  if (status === "running") {
    // HOLD / RUNNING: Engineering is actively executing; downstream is PENDING
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
        status: CHECKPOINT_STATUSES.RUNNING,
        startedAt: timeStr(46),
        inputs: [evidenceRef],
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
        status: CHECKPOINT_STATUSES.PENDING,
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.VALIDATION,
        status: CHECKPOINT_STATUSES.PENDING,
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.PENDING,
      })
    );

    return recorder.getTraceSnapshot();
  }

  if (status === "cancelled") {
    // CANCELLED: Engineering was aborted; downstream explicitly SKIPPED
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
        status: CHECKPOINT_STATUSES.CANCELLED,
        startedAt: timeStr(46),
        completedAt: completedAt ?? timeStr(75),
        inputs: [evidenceRef],
        diagnostics: [
          createCheckpointDiagnostic({
            severity: DIAGNOSTIC_SEVERITIES.INFO,
            code: "SHADOW_RUN_CANCELLED",
            message: cancellationReason || "Shadow execution cancelled by user request",
            source: "ShadowExecutionController",
            timestamp: completedAt ?? timeStr(75),
          }),
        ],
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
        status: CHECKPOINT_STATUSES.SKIPPED,
        diagnostics: [
          createCheckpointDiagnostic({
            severity: DIAGNOSTIC_SEVERITIES.INFO,
            code: "SKIPPED_DUE_TO_CANCELLATION",
            message: "Layer skipped because upstream execution was cancelled",
            source: "PipelineOrchestrator",
          }),
        ],
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.VALIDATION,
        status: CHECKPOINT_STATUSES.SKIPPED,
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.SKIPPED,
      })
    );

    return recorder.getTraceSnapshot();
  }

  if (status === "failed") {
    // FAIL or TIMEOUT: Engineering failed; downstream explicitly SKIPPED
    const isTimeout = faultMode === "timeout" || error?.code === "SHADOW_EXECUTION_TIMEOUT";
    const errorCode = isTimeout
      ? "SHADOW_EXECUTION_TIMEOUT"
      : error?.code || "UAT_FAULT_INJECTION_FAIL";
    const errorMessage = isTimeout
      ? error?.message || "Shadow execution exceeded maximum timeout budget (40ms)"
      : error?.message || "Simulated Shadow UAT Executor Failure [Fault Mode: fail]";

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
        status: CHECKPOINT_STATUSES.FAILED,
        startedAt: timeStr(46),
        completedAt: completedAt ?? timeStr(80),
        inputs: [evidenceRef],
        diagnostics: [
          createCheckpointDiagnostic({
            severity: DIAGNOSTIC_SEVERITIES.ERROR,
            code: errorCode,
            message: errorMessage,
            source: isTimeout ? "ShadowExecutionController" : "SimulatedUatExecutor",
            timestamp: completedAt ?? timeStr(80),
          }),
        ],
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
        status: CHECKPOINT_STATUSES.SKIPPED,
        diagnostics: [
          createCheckpointDiagnostic({
            severity: DIAGNOSTIC_SEVERITIES.INFO,
            code: "SKIPPED_DUE_TO_FAILURE",
            message: "Layer skipped because upstream engineering layer failed",
            source: "PipelineOrchestrator",
          }),
        ],
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.VALIDATION,
        status: CHECKPOINT_STATUSES.SKIPPED,
      })
    );

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId,
        stream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.SKIPPED,
      })
    );

    return recorder.getTraceSnapshot();
  }

  // 4. NORMAL or completed HOLD: All stages complete with non-fatal advisory in Engineering
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
      },
    ],
    confidence: 0.9,
  });
  const decisionRef = createDecisionArtifactReference(decisionRecord);

  recorder.recordCheckpoint(
    createCheckpointEnvelope({
      runId,
      stream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.WARNING,
      startedAt: timeStr(46),
      completedAt: timeStr(90),
      inputs: [evidenceRef],
      output: decisionRef,
      payload: decisionRecord,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.WARNING,
          code: "RESONANCE_NEAR_LIMIT",
          message: "Aggressive low-cut filter slope approaches phase shift boundary near 100Hz",
          source: "EngineeringAcousticFilterEvaluator",
          timestamp: timeStr(90),
        }),
      ],
    })
  );

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
      {
        stageId: "stg_preamp",
        stageIndex: 1,
        role: "PREAMP",
        designIntent: "British high-gain cascading tube stage",
        gainStrategy: { headroomProfile: "HIGH_GAIN_LEAD" },
        constraints: ["Preserve pick articulation"],
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
      startedAt: timeStr(91),
      completedAt: timeStr(125),
      inputs: [decisionRef],
      output: semanticRef,
      payload: semanticDesign,
    })
  );

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
      startedAt: timeStr(126),
      completedAt: timeStr(140),
      inputs: [semanticRef],
      output: validationRef,
      payload: validationReport,
    })
  );

  const translationCheckpoint = createCheckpointEnvelope({
    runId,
    stream,
    layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
    status: CHECKPOINT_STATUSES.COMPLETED,
    startedAt: timeStr(141),
    completedAt: timeStr(165),
    inputs: [semanticRef, validationRef],
    diagnostics: [
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.INFO,
        code: "TRANSLATION_PLAN_READY",
        message: "Target platform device mapping and parameter plan synthesized",
        source: "PlatformTranslationStage",
        timestamp: timeStr(165),
      }),
    ],
  });
  recorder.recordCheckpoint(translationCheckpoint);

  return recorder.getTraceSnapshot();
}
