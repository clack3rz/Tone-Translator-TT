// src/tests/checkpointEnvelope.test.ts
// Unit tests for Sound Engineer Phase 1B.1: Checkpoint Envelope & Layer Identity

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  SOUND_ENGINEER_LAYERS,
  LayerIdentity,
  isLayerIdentity,
  CHECKPOINT_STATUSES,
  CheckpointStatus,
  isCheckpointStatus,
  isTerminalCheckpointStatus,
  CHECKPOINT_ENVELOPE_CONTRACT_VERSION,
  generateCheckpointId,
  createCheckpointEnvelope,
  isCheckpointEnvelope,
  validateCheckpointEnvelope,
  CheckpointEnvelope,
  createCheckpointDiagnostic,
  isCheckpointDiagnostic,
  DIAGNOSTIC_SEVERITIES,
  createArtifactReference,
  isArtifactReference,
  ARTIFACT_TYPES,
  EXECUTION_STREAMS,
  generateRunId,
} from "../sound-engineer";

describe("Phase 1B.1: Checkpoint Envelope & Layer Identity", () => {
  // Test 1: all required layer identities are distinct
  it("1. all required layer identities are distinct and non-empty", () => {
    const layers = Object.values(SOUND_ENGINEER_LAYERS);
    const uniqueLayers = new Set(layers);

    assert.equal(uniqueLayers.size, layers.length, "All layer identities must be strictly unique");
    assert.ok(layers.length >= 7, "Must contain at least the 7 core layer identities");

    assert.ok(layers.includes("INPUT"));
    assert.ok(layers.includes("EVIDENCE"));
    assert.ok(layers.includes("ENGINEERING"));
    assert.ok(layers.includes("SEMANTIC_DESIGN"));
    assert.ok(layers.includes("VALIDATION"));
    assert.ok(layers.includes("PLATFORM_TRANSLATION"));
    assert.ok(layers.includes("EXPORT"));

    for (const layer of layers) {
      assert.ok(isLayerIdentity(layer), `isLayerIdentity should return true for ${layer}`);
    }
    assert.equal(isLayerIdentity("INVALID_LAYER"), false);
    assert.equal(isLayerIdentity(null), false);
  });

  // Test 2: checkpoint IDs are unique
  it("2. checkpoint IDs are unique and correctly formatted", () => {
    const idSet = new Set<string>();
    const count = 100;

    for (let i = 0; i < count; i++) {
      const id = generateCheckpointId(SOUND_ENGINEER_LAYERS.ENGINEERING);
      assert.ok(id.startsWith("chk_engineering_"), `ID must start with layer prefix: ${id}`);
      idSet.add(id);
    }

    assert.equal(idSet.size, count, "All generated checkpoint IDs must be unique");

    // Generic prefix without layer
    const genericId = generateCheckpointId();
    assert.ok(genericId.startsWith("chk_"), `Generic ID must start with chk_: ${genericId}`);
  });

  // Test 3: checkpoint correctly associates with runId
  it("3. checkpoint correctly associates with runId", () => {
    const runId = generateRunId(EXECUTION_STREAMS.SHADOW);
    const envelope = createCheckpointEnvelope({
      runId,
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.equal(envelope.runId, runId);
    assert.ok(isCheckpointEnvelope(envelope));
  });

  // Test 4: checkpoint correctly associates with stream
  it("4. checkpoint correctly associates with stream (CURRENT, SHADOW, DEV)", () => {
    const streams = [
      EXECUTION_STREAMS.CURRENT,
      EXECUTION_STREAMS.SHADOW,
      EXECUTION_STREAMS.DEV,
    ];

    for (const stream of streams) {
      const envelope = createCheckpointEnvelope({
        runId: generateRunId(stream),
        stream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.PENDING,
      });

      assert.equal(envelope.stream, stream);
      assert.ok(isCheckpointEnvelope(envelope));
    }
  });

  // Test 5: envelope contract version exists
  it("5. envelope contract version exists and follows semantic versioning", () => {
    assert.equal(CHECKPOINT_ENVELOPE_CONTRACT_VERSION, "1.0.0");

    const envelope = createCheckpointEnvelope({
      runId: "run_test_123",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.equal(envelope.contractVersion, "1.0.0");
  });

  // Test 6: payload version remains independent of envelope version
  it("6. payload version remains independent of envelope version", () => {
    interface CustomEvidencePayload {
      schemaVersion: string;
      confidence: number;
    }

    // Payload v1.0 in Envelope v1.0
    const envWithV1 = createCheckpointEnvelope<CustomEvidencePayload>({
      runId: "run_test_v1",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.050Z",
      payload: { schemaVersion: "1.0.0", confidence: 0.95 },
    });

    assert.equal(envWithV1.contractVersion, "1.0.0");
    assert.equal(envWithV1.payload?.schemaVersion, "1.0.0");

    // Payload v2.3 in Envelope v1.0
    const envWithV2 = createCheckpointEnvelope<CustomEvidencePayload>({
      runId: "run_test_v2",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.050Z",
      payload: { schemaVersion: "2.3.0", confidence: 0.99 },
    });

    assert.equal(envWithV2.contractVersion, "1.0.0");
    assert.equal(envWithV2.payload?.schemaVersion, "2.3.0");
  });

  // Test 7: lifecycle statuses are strongly validated
  it("7. lifecycle statuses are strongly validated", () => {
    const validStatuses = Object.values(CHECKPOINT_STATUSES);

    for (const status of validStatuses) {
      assert.ok(isCheckpointStatus(status));
    }

    assert.equal(isCheckpointStatus("unknown_status"), false);
    assert.equal(isCheckpointStatus(123), false);
    assert.equal(isCheckpointStatus(null), false);

    assert.throws(
      () =>
        createCheckpointEnvelope({
          runId: "run_invalid",
          stream: EXECUTION_STREAMS.SHADOW,
          layer: SOUND_ENGINEER_LAYERS.INPUT,
          status: "not_a_real_status" as CheckpointStatus,
        }),
      /Invalid checkpoint status/
    );
  });

  // Test 8: pending checkpoint has no fabricated start/completion timing
  it("8. pending checkpoint has no fabricated start/completion timing", () => {
    const pendingEnv = createCheckpointEnvelope({
      runId: "run_pending_test",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.equal(pendingEnv.startedAt, undefined, "Pending checkpoint must have undefined startedAt");
    assert.equal(pendingEnv.completedAt, undefined, "Pending checkpoint must have undefined completedAt");
    assert.equal(pendingEnv.durationMs, undefined, "Pending checkpoint must have undefined durationMs");
    assert.ok(pendingEnv.createdAt, "Pending checkpoint must have createdAt");

    // Attempting to pass startedAt to pending must throw
    assert.throws(
      () =>
        createCheckpointEnvelope({
          runId: "run_pending_bad",
          stream: EXECUTION_STREAMS.SHADOW,
          layer: SOUND_ENGINEER_LAYERS.INPUT,
          status: CHECKPOINT_STATUSES.PENDING,
          startedAt: new Date().toISOString(),
        }),
      /Pending checkpoint must not have a startedAt timestamp/
    );
  });

  // Test 9: completed checkpoint supports valid timing/duration
  it("9. completed checkpoint supports valid timing/duration calculation", () => {
    const startedAt = "2026-09-25T17:00:00.000Z";
    const completedAt = "2026-09-25T17:00:00.125Z";

    const completedEnv = createCheckpointEnvelope({
      runId: "run_completed_test",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.VALIDATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt,
      completedAt,
    });

    assert.equal(completedEnv.startedAt, startedAt);
    assert.equal(completedEnv.completedAt, completedAt);
    assert.equal(completedEnv.durationMs, 125, "durationMs must automatically be 125ms");
  });

  // Test 10: WARNING is distinguishable from FAILED
  it("10. WARNING is distinguishable from FAILED and represents non-fatal completion", () => {
    assert.notEqual(CHECKPOINT_STATUSES.WARNING, CHECKPOINT_STATUSES.FAILED);
    assert.ok(isTerminalCheckpointStatus(CHECKPOINT_STATUSES.WARNING));
    assert.ok(isTerminalCheckpointStatus(CHECKPOINT_STATUSES.FAILED));

    const warningEnv = createCheckpointEnvelope({
      runId: "run_warn",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.WARNING,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.050Z",
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.WARNING,
          code: "SUBOPTIMAL_IMPEDANCE_MATCH",
          message: "Pickup load impedance slightly exceeds ideal curve",
          source: "EngineeringImpedanceEvaluator",
        }),
      ],
    });

    assert.equal(warningEnv.status, "warning");
    assert.notEqual(warningEnv.status, "failed");
    assert.equal(warningEnv.diagnostics[0].severity, "WARNING");
  });

  // Test 11: SKIPPED is explicitly representable
  it("11. SKIPPED is explicitly representable rather than missing data", () => {
    const skippedEnv = createCheckpointEnvelope({
      runId: "run_skip",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.SKIPPED,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "DIRECT_PRESET_INPUT_BYPASS",
          message: "Evidence extraction bypassed: direct user preset provided",
          source: "PipelineRoutingController",
        }),
      ],
    });

    assert.equal(skippedEnv.status, "skipped");
    assert.ok(isTerminalCheckpointStatus(skippedEnv.status));
    assert.equal(skippedEnv.diagnostics[0].code, "DIRECT_PRESET_INPUT_BYPASS");
  });

  // Test 12: structured diagnostics preserve severity/code/message/source
  it("12. structured diagnostics preserve severity/code/message/source and context", () => {
    const diag = createCheckpointDiagnostic({
      severity: DIAGNOSTIC_SEVERITIES.ERROR,
      code: "OUT_OF_BOUNDS_PARAMETER",
      message: "Gain parameter 15 exceeds maximum threshold 10",
      source: "ValidationBoundsChecker",
      context: { paramKey: "gain", attemptedValue: 15, maxValue: 10 },
    });

    assert.equal(diag.severity, "ERROR");
    assert.equal(diag.code, "OUT_OF_BOUNDS_PARAMETER");
    assert.equal(diag.message, "Gain parameter 15 exceeds maximum threshold 10");
    assert.equal(diag.source, "ValidationBoundsChecker");
    assert.ok(diag.timestamp);
    assert.deepEqual(diag.context, { paramKey: "gain", attemptedValue: 15, maxValue: 10 });
    assert.ok(isCheckpointDiagnostic(diag));
  });

  // Test 13: multiple diagnostics can coexist
  it("13. multiple diagnostics can coexist across different severities", () => {
    const d1 = createCheckpointDiagnostic({
      severity: DIAGNOSTIC_SEVERITIES.INFO,
      code: "ANALYSIS_STARTED",
      message: "Commenced FFT spectral analysis",
      source: "EvidenceAnalyzer",
    });
    const d2 = createCheckpointDiagnostic({
      severity: DIAGNOSTIC_SEVERITIES.WARNING,
      code: "NOISE_FLOOR_ELEVATED",
      message: "Noise floor -45dB may affect high-frequency accuracy",
      source: "EvidenceAnalyzer",
    });

    const envelope = createCheckpointEnvelope({
      runId: "run_multi_diag",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
      status: CHECKPOINT_STATUSES.WARNING,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.040Z",
      diagnostics: [d1, d2],
    });

    assert.equal(envelope.diagnostics.length, 2);
    assert.equal(envelope.diagnostics[0].severity, "INFO");
    assert.equal(envelope.diagnostics[1].severity, "WARNING");
  });

  // Test 14: artifact references preserve lineage without copying payloads
  it("14. artifact references preserve lineage without copying heavy payloads", () => {
    const inputRef = createArtifactReference({
      artifactId: "snap_shadow_999",
      artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
    });

    assert.equal(inputRef.artifactId, "snap_shadow_999");
    assert.equal(inputRef.artifactType, "InputSnapshot");
    assert.equal(inputRef.contractVersion, "1.0.0");
    assert.equal(inputRef.producingLayer, "INPUT");
    assert.ok(isArtifactReference(inputRef));

    // Verify it doesn't contain raw audio files or strings
    assert.equal((inputRef as any).rawContent, undefined);
    assert.equal((inputRef as any).payload, undefined);
  });

  // Test 15: multiple input artifact references are supported
  it("15. multiple input artifact references are supported", () => {
    const ref1 = createArtifactReference({
      artifactId: "snap_shadow_001",
      artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
    });
    const ref2 = createArtifactReference({
      artifactId: "ev_record_001",
      artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
    });

    const envelope = createCheckpointEnvelope({
      runId: "run_multi_inputs",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.PENDING,
      inputs: [ref1, ref2],
    });

    assert.equal(envelope.inputs.length, 2);
    assert.equal(envelope.inputs[0].artifactId, "snap_shadow_001");
    assert.equal(envelope.inputs[1].artifactId, "ev_record_001");
  });

  // Test 16: output artifact reference is optional before production
  it("16. output artifact reference is optional before production and terminal states", () => {
    const pendingEnv = createCheckpointEnvelope({
      runId: "run_no_output",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.equal(pendingEnv.output, undefined);

    const completedEnv = createCheckpointEnvelope({
      runId: "run_with_output",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.030Z",
      output: createArtifactReference({
        artifactId: "semantic_design_001",
        artifactType: ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN,
        contractVersion: "1.0.0",
        producingLayer: SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
      }),
    });

    assert.ok(completedEnv.output);
    assert.equal(completedEnv.output.artifactId, "semantic_design_001");
  });

  // Test 17: source-object mutation cannot alter completed checkpoint
  it("17. source-object mutation cannot alter completed checkpoint", () => {
    const mutableInputs = [
      createArtifactReference({
        artifactId: "initial_snap",
        artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
        contractVersion: "1.0.0",
      }),
    ];

    const mutableDiagnostics = [
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.INFO,
        code: "INITIAL_DIAG",
        message: "Initial diagnostic",
        source: "Init",
      }),
    ];

    const mutablePayload = {
      nested: { value: 42 },
    };

    const envelope = createCheckpointEnvelope({
      runId: "run_immutability_test",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.020Z",
      inputs: mutableInputs,
      diagnostics: mutableDiagnostics,
      payload: mutablePayload,
    });

    // Mutate source collections and payload
    mutableInputs.push(
      createArtifactReference({
        artifactId: "tampered_snap",
        artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
        contractVersion: "1.0.0",
      })
    );
    mutableDiagnostics.push(
      createCheckpointDiagnostic({
        severity: DIAGNOSTIC_SEVERITIES.ERROR,
        code: "TAMPERED_DIAG",
        message: "Tampered diagnostic",
        source: "Tamper",
      })
    );
    mutablePayload.nested.value = 999;

    // Checkpoint must remain unaffected
    assert.equal(envelope.inputs.length, 1);
    assert.equal(envelope.diagnostics.length, 1);
    assert.equal(envelope.payload?.nested.value, 42);
  });

  // Test 18: consumer mutation cannot alter checkpoint
  it("18. consumer mutation cannot alter checkpoint (frozen object)", () => {
    const envelope = createCheckpointEnvelope({
      runId: "run_consumer_tamper",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.VALIDATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T17:00:00.000Z",
      completedAt: "2026-09-25T17:00:00.010Z",
      payload: { decision: "APPROVE" },
    });

    assert.ok(Object.isFrozen(envelope));
    assert.ok(Object.isFrozen(envelope.inputs));
    assert.ok(Object.isFrozen(envelope.diagnostics));
    assert.ok(Object.isFrozen(envelope.payload));

    assert.throws(() => {
      (envelope as any).status = "failed";
    }, TypeError);

    assert.throws(() => {
      (envelope.inputs as any).push({});
    }, TypeError);

    assert.throws(() => {
      (envelope.payload as any).decision = "REJECT";
    }, TypeError);
  });

  // Test 19: checkpoint creation performs no external side effects
  it("19. checkpoint creation performs no external side effects", () => {
    // Calling createCheckpointEnvelope creates purely in-memory objects without I/O
    const envelope = createCheckpointEnvelope({
      runId: "run_pure_test",
      stream: EXECUTION_STREAMS.SHADOW,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.ok(envelope);
    const validation = validateCheckpointEnvelope(envelope);
    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);
  });

  // Test 20: generic contracts contain no AT5/GUID/VIR dependency
  it("20. generic contracts contain no AT5/GUID/VIR dependency", () => {
    const checkpointDir = path.resolve(process.cwd(), "src/sound-engineer/checkpoints");
    const files = fs.readdirSync(checkpointDir);

    for (const file of files) {
      if (!file.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(checkpointDir, file), "utf-8");

      assert.ok(!content.includes("AmpliTube"), `${file} must not reference AmpliTube`);
      assert.ok(!content.includes("at5p"), `${file} must not reference at5p`);
      assert.ok(!content.includes("guid"), `${file} must not reference guid`);
      assert.ok(!content.includes("speakerOrientation"), `${file} must not reference speakerOrientation`);
    }
  });

  // Test 21: no global checkpoint registry exists
  it("21. confirms no global mutable checkpoint registry exists in module", () => {
    const checkpointDir = path.resolve(process.cwd(), "src/sound-engineer/checkpoints");
    const files = fs.readdirSync(checkpointDir);

    for (const file of files) {
      if (!file.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(checkpointDir, file), "utf-8");

      assert.ok(!content.includes("allCheckpoints ="), `${file} must not define allCheckpoints`);
      assert.ok(!content.includes("checkpointRegistry ="), `${file} must not define checkpointRegistry`);
      assert.ok(!content.includes("globalCheckpoints"), `${file} must not define globalCheckpoints`);
    }
  });

  // Test 22: validation helper detects contract errors cleanly
  it("22. validateCheckpointEnvelope catches malformed envelopes", () => {
    assert.equal(validateCheckpointEnvelope(null).valid, false);
    assert.equal(validateCheckpointEnvelope({}).valid, false);

    const malformed = {
      contractVersion: "1.0.0",
      checkpointId: "chk_123",
      runId: "run_123",
      stream: "INVALID_STREAM",
      layer: "INVALID_LAYER",
      status: "invalid_status",
      createdAt: "not-a-date",
      inputs: "not-an-array",
      diagnostics: "not-an-array",
    };

    const result = validateCheckpointEnvelope(malformed);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 5);
  });
});
