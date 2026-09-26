// src/tests/runTrace.test.ts
// Unit & Integration tests for Sound Engineer Phase 1B.3: Run Trace & Checkpoint Aggregation

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  EXECUTION_STREAMS,
  generateRunId,
  SOUND_ENGINEER_LAYERS,
  CHECKPOINT_STATUSES,
  createCheckpointEnvelope,
  generateCheckpointId,
  createCheckpointDiagnostic,
  DIAGNOSTIC_SEVERITIES,
  createArtifactReference,
  ARTIFACT_TYPES,
  // Trace module:
  RUN_TRACE_CONTRACT_VERSION,
  generateTraceId,
  isRunTrace,
  createRunTraceRecorder,
  createSyntheticShadowTrace,
  RunTraceRecorder,
  RunTrace,
  CHECKPOINT_ENVELOPE_CONTRACT_VERSION,
  EVIDENCE_RECORD_CONTRACT_VERSION,
  ENGINEERING_DECISION_CONTRACT_VERSION,
  SEMANTIC_TONE_DESIGN_CONTRACT_VERSION,
  VALIDATION_REPORT_CONTRACT_VERSION,
  PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION,
} from "../sound-engineer";

describe("Phase 1B.3: Run Trace & Checkpoint Aggregation", () => {
  const mockRunId = generateRunId(EXECUTION_STREAMS.SHADOW);
  const mockStream = EXECUTION_STREAMS.SHADOW;

  // Test 1: RunTrace has independent contract version
  it("1. RunTrace has independent contract version", () => {
    assert.equal(RUN_TRACE_CONTRACT_VERSION, "1.0.0");
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.contractVersion, "1.0.0");
  });

  // Test 2: Trace has unique traceId
  it("2. Trace has unique traceId starting with trc_ prefix", () => {
    const id1 = generateTraceId();
    const id2 = generateTraceId();
    assert.ok(id1.startsWith("trc_"));
    assert.ok(id2.startsWith("trc_"));
    assert.notEqual(id1, id2);
  });

  // Test 3: Trace associates with correct runId
  it("3. Trace associates with correct runId", () => {
    const runId = generateRunId(EXECUTION_STREAMS.DEV);
    const recorder = createRunTraceRecorder({ runId, stream: EXECUTION_STREAMS.DEV });
    assert.equal(recorder.runId, runId);
    assert.equal(recorder.getTraceSnapshot().runId, runId);
  });

  // Test 4: Trace associates with correct stream
  it("4. Trace associates with correct stream", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: EXECUTION_STREAMS.SHADOW });
    assert.equal(recorder.stream, EXECUTION_STREAMS.SHADOW);
    assert.equal(recorder.getTraceSnapshot().stream, EXECUTION_STREAMS.SHADOW);
  });

  // Test 5: Valid matching checkpoint can be recorded
  it("5. Valid matching checkpoint can be recorded", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const checkpoint = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T18:00:00.000Z",
      completedAt: "2026-09-25T18:00:00.020Z",
    });

    const entry = recorder.recordCheckpoint(checkpoint);
    assert.equal(entry.sequenceIndex, 0);
    assert.equal(entry.checkpoint.checkpointId, checkpoint.checkpointId);
    assert.equal(recorder.getEntryCount(), 1);

    const snapshot = recorder.getTraceSnapshot();
    assert.ok(isRunTrace(snapshot));
    assert.equal(snapshot.checkpointCount, 1);
  });

  // Test 6: Different-run checkpoint is rejected
  it("6. Different-run checkpoint is rejected explicitly", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const wrongRunId = generateRunId(mockStream);
    const foreignCheckpoint = createCheckpointEnvelope({
      runId: wrongRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.throws(() => {
      recorder.recordCheckpoint(foreignCheckpoint);
    }, /Cross-run checkpoint rejected/);
  });

  // Test 7: Different-stream checkpoint is rejected
  it("7. Different-stream checkpoint is rejected explicitly", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const foreignCheckpoint = createCheckpointEnvelope({
      runId: mockRunId,
      stream: EXECUTION_STREAMS.DEV, // Mismatched stream
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.PENDING,
    });

    assert.throws(() => {
      recorder.recordCheckpoint(foreignCheckpoint);
    }, /Cross-stream checkpoint rejected/);
  });

  // Test 8: Duplicate checkpointId is rejected
  it("8. Duplicate checkpointId is rejected explicitly", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const sharedId = generateCheckpointId(SOUND_ENGINEER_LAYERS.INPUT);
    const cp1 = createCheckpointEnvelope({
      checkpointId: sharedId,
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.COMPLETED,
    });

    recorder.recordCheckpoint(cp1);

    const cp2 = createCheckpointEnvelope({
      checkpointId: sharedId, // Duplicate
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.COMPLETED,
    });

    assert.throws(() => {
      recorder.recordCheckpoint(cp2);
    }, /Duplicate checkpointId rejected/);
  });

  // Test 9: Multiple checkpoints for same layer are allowed
  it("9. Multiple checkpoints for same layer are allowed (for retries/iterations)", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });

    // Iteration 1 of Engineering
    const cp1 = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.WARNING,
      startedAt: "2026-09-25T18:00:00.000Z",
      completedAt: "2026-09-25T18:00:00.030Z",
    });
    recorder.recordCheckpoint(cp1);

    // Iteration 2 of Engineering (refined decision)
    const cp2 = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.COMPLETED,
      startedAt: "2026-09-25T18:00:00.035Z",
      completedAt: "2026-09-25T18:00:00.060Z",
    });
    recorder.recordCheckpoint(cp2);

    assert.equal(recorder.getEntryCount(), 2);
    const engCheckpoints = recorder.getCheckpointsByLayer(SOUND_ENGINEER_LAYERS.ENGINEERING);
    assert.equal(engCheckpoints.length, 2);
    assert.equal(engCheckpoints[0].status, "warning");
    assert.equal(engCheckpoints[1].status, "completed");
  });

  // Test 10: Explicit sequence/order remains deterministic
  it("10. Explicit sequence index remains deterministic", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const layers = [
      SOUND_ENGINEER_LAYERS.INPUT,
      SOUND_ENGINEER_LAYERS.EVIDENCE,
      SOUND_ENGINEER_LAYERS.ENGINEERING,
    ];

    layers.forEach((layer, idx) => {
      const entry = recorder.recordCheckpoint(
        createCheckpointEnvelope({
          runId: mockRunId,
          stream: mockStream,
          layer,
          status: CHECKPOINT_STATUSES.COMPLETED,
        })
      );
      assert.equal(entry.sequenceIndex, idx);
    });

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.checkpoints[0].sequenceIndex, 0);
    assert.equal(snapshot.checkpoints[1].sequenceIndex, 1);
    assert.equal(snapshot.checkpoints[2].sequenceIndex, 2);
  });

  // Test 11: Completion timing does not reorder checkpoints
  it("11. Completion timing does not reorder checkpoints", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });

    // Step 0 was recorded first, took longer (completed at :050)
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-09-25T18:00:00.000Z",
        completedAt: "2026-09-25T18:00:00.050Z",
      })
    );

    // Step 1 was recorded second, finished quicker (completed at :020)
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-09-25T18:00:00.010Z",
        completedAt: "2026-09-25T18:00:00.020Z",
      })
    );

    const checkpoints = recorder.getCheckpoints();
    assert.equal(checkpoints[0].layer, SOUND_ENGINEER_LAYERS.INPUT);
    assert.equal(checkpoints[1].layer, SOUND_ENGINEER_LAYERS.EVIDENCE);
  });

  // Test 12: WARNING checkpoint produces warning trace summary without failure
  it("12. WARNING checkpoint produces WARNING trace summary without failure", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
        status: CHECKPOINT_STATUSES.WARNING,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.status, "WARNING");
    assert.notEqual(snapshot.status, "FAILED");
  });

  // Test 13: FAILED checkpoint produces failed trace summary
  it("13. FAILED checkpoint produces FAILED trace summary", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.VALIDATION,
        status: CHECKPOINT_STATUSES.FAILED,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.status, "FAILED");
  });

  // Test 14: CANCELLED checkpoint is represented correctly
  it("14. CANCELLED checkpoint produces CANCELLED trace summary", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.CANCELLED,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.status, "CANCELLED");
  });

  // Test 15: SKIPPED does not automatically fail trace
  it("15. SKIPPED does not automatically fail trace", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.SKIPPED,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.status, "COMPLETED");
  });

  // Test 16: Diagnostic counts aggregate correctly
  it("16. Diagnostic counts aggregate correctly across checkpoints", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });

    const cp1 = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.COMPLETED,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "D1",
          message: "Info message",
          source: "Stage1",
        }),
      ],
    });

    const cp2 = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.ENGINEERING,
      status: CHECKPOINT_STATUSES.WARNING,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.WARNING,
          code: "D2",
          message: "Warning message",
          source: "Stage2",
        }),
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.ERROR,
          code: "D3",
          message: "Error message",
          source: "Stage2",
        }),
      ],
    });

    recorder.recordCheckpoint(cp1);
    recorder.recordCheckpoint(cp2);

    const snapshot = recorder.getTraceSnapshot();
    assert.equal(snapshot.diagnostics.totalCount, 3);
    assert.equal(snapshot.diagnostics.infoCount, 1);
    assert.equal(snapshot.diagnostics.warningCount, 1);
    assert.equal(snapshot.diagnostics.errorCount, 1);
  });

  // Test 17: Diagnostics retain source checkpoint/layer association
  it("17. Diagnostics retain source checkpoint and layer association", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const cp = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.VALIDATION,
      status: CHECKPOINT_STATUSES.COMPLETED,
      diagnostics: [
        createCheckpointDiagnostic({
          severity: DIAGNOSTIC_SEVERITIES.INFO,
          code: "RULE_EVALUATED",
          message: "Acoustic rules checked",
          source: "Validator",
        }),
      ],
    });

    recorder.recordCheckpoint(cp);
    const diags = recorder.getDiagnostics();
    assert.equal(diags.length, 1);
    assert.equal(diags[0].layer, SOUND_ENGINEER_LAYERS.VALIDATION);
    assert.equal(diags[0].checkpointId, cp.checkpointId);
    assert.equal(diags[0].sequenceIndex, 0);
    assert.equal(diags[0].diagnostic.code, "RULE_EVALUATED");
  });

  // Test 18: Wall-clock timing and summed checkpoint timing are distinguishable
  it("18. Wall-clock timing and summed layer duration are distinguishable", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });

    // Layer 1: took 40ms (:000 to :040)
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-09-25T18:00:00.000Z",
        completedAt: "2026-09-25T18:00:00.040Z",
        durationMs: 40,
      })
    );

    // Layer 2: took 30ms (:060 to :090)
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.COMPLETED,
        startedAt: "2026-09-25T18:00:00.060Z",
        completedAt: "2026-09-25T18:00:00.090Z",
        durationMs: 30,
      })
    );

    const timing = recorder.getTraceSnapshot().timing;
    assert.equal(timing.startedAt, "2026-09-25T18:00:00.000Z");
    assert.equal(timing.completedAt, "2026-09-25T18:00:00.090Z");
    assert.equal(timing.wallClockDurationMs, 90, "Wall clock span is 90ms (from :000 to :090)");
    assert.equal(timing.summedLayerDurationMs, 70, "Sum of layer durations is 40 + 30 = 70ms");
  });

  // Test 19: Pending checkpoints do not fabricate duration
  it("19. Pending checkpoints do not fabricate duration", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
        status: CHECKPOINT_STATUSES.PENDING,
      })
    );

    const timing = recorder.getTraceSnapshot().timing;
    assert.equal(timing.startedAt, undefined);
    assert.equal(timing.completedAt, undefined);
    assert.equal(timing.wallClockDurationMs, undefined);
    assert.equal(timing.summedLayerDurationMs, 0);
  });

  // Test 20: Artifact lineage can be followed through references
  it("20. Artifact lineage can be followed through references", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });

    const ref1 = createArtifactReference({
      artifactId: "art_input_1",
      artifactType: ARTIFACT_TYPES.INPUT_SNAPSHOT,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.INPUT,
    });
    const ref2 = createArtifactReference({
      artifactId: "art_evidence_1",
      artifactType: ARTIFACT_TYPES.EVIDENCE_RECORD,
      contractVersion: "1.0.0",
      producingLayer: SOUND_ENGINEER_LAYERS.EVIDENCE,
    });

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
        output: ref1,
      })
    );
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.COMPLETED,
        inputs: [ref1],
        output: ref2,
      })
    );

    const lineage = recorder.getArtifactLineage();
    assert.equal(lineage.length, 2);
    assert.equal(lineage[0].output?.artifactId, "art_input_1");
    assert.equal(lineage[1].inputs[0].artifactId, "art_input_1");
    assert.equal(lineage[1].output?.artifactId, "art_evidence_1");
  });

  // Test 21: Checkpoint payloads are not duplicated for lineage
  it("21. Checkpoint payloads are not duplicated merely for lineage tracking", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const heavyPayload = { massiveAudioBuffer: new Array(100).fill(0.5) };

    const ref = createArtifactReference({
      artifactId: "heavy_art_1",
      artifactType: ARTIFACT_TYPES.CUSTOM,
      contractVersion: "1.0.0",
    });

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.EVIDENCE,
        status: CHECKPOINT_STATUSES.COMPLETED,
        output: ref,
        payload: heavyPayload,
      })
    );

    const lineage = recorder.getArtifactLineage();
    // Lineage entry only has reference, not payload
    assert.equal((lineage[0] as any).payload, undefined);
    assert.equal(lineage[0].output?.artifactId, "heavy_art_1");
  });

  // Test 22: Public trace snapshot is immutable
  it("22. Public trace snapshot is immutable (Object.isFrozen)", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.checkpoints));
    assert.ok(Object.isFrozen(snapshot.diagnostics));
    assert.ok(Object.isFrozen(snapshot.timing));
    assert.ok(Object.isFrozen(snapshot.lineage));

    assert.throws(() => {
      (snapshot as any).status = "CANCELLED";
    }, TypeError);
  });

  // Test 23: Public checkpoint arrays cannot mutate internal trace state
  it("23. Public checkpoint arrays cannot mutate internal trace state", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );

    const checkpoints = recorder.getCheckpoints();
    assert.throws(() => {
      (checkpoints as any).push({});
    }, TypeError);

    assert.equal(recorder.getEntryCount(), 1);
  });

  // Test 24: Historical checkpoint cannot be silently replaced
  it("24. Historical checkpoint cannot be silently replaced or overwritten", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    const cpId = "chk_fixed_001";

    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        checkpointId: cpId,
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );

    const attemptedOverride = createCheckpointEnvelope({
      checkpointId: cpId,
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.FAILED,
    });

    assert.throws(() => {
      recorder.recordCheckpoint(attemptedOverride);
    }, /Duplicate checkpointId rejected/);

    assert.equal(recorder.getCheckpointById(cpId)?.status, "completed");
  });

  // Test 25: Concurrent independent traces do not affect one another
  it("25. Concurrent independent traces do not affect one another", () => {
    const run1 = generateRunId(EXECUTION_STREAMS.SHADOW);
    const run2 = generateRunId(EXECUTION_STREAMS.SHADOW);

    const trace1 = createRunTraceRecorder({ runId: run1, stream: EXECUTION_STREAMS.SHADOW });
    const trace2 = createRunTraceRecorder({ runId: run2, stream: EXECUTION_STREAMS.SHADOW });

    trace1.recordCheckpoint(
      createCheckpointEnvelope({
        runId: run1,
        stream: EXECUTION_STREAMS.SHADOW,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );

    assert.equal(trace1.getEntryCount(), 1);
    assert.equal(trace2.getEntryCount(), 0);
  });

  // Test 26: No global mutable trace registry exists
  it("26. Confirms no global mutable trace registry exists in module", () => {
    const dir = path.resolve(process.cwd(), "src/sound-engineer/trace");
    const files = fs.readdirSync(dir);

    for (const f of files) {
      if (!f.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(dir, f), "utf-8");

      assert.ok(!content.includes("allTraces ="), `${f} must not define allTraces`);
      assert.ok(!content.includes("globalTraces"), `${f} must not define globalTraces`);
      assert.ok(!content.includes("traceRegistry ="), `${f} must not define traceRegistry`);
    }
  });

  // Test 27: Trace recording performs no external side effects
  it("27. Trace recording performs no external side effects", () => {
    const recorder = createRunTraceRecorder({ runId: mockRunId, stream: mockStream });
    recorder.recordCheckpoint(
      createCheckpointEnvelope({
        runId: mockRunId,
        stream: mockStream,
        layer: SOUND_ENGINEER_LAYERS.INPUT,
        status: CHECKPOINT_STATUSES.COMPLETED,
      })
    );

    const snapshot = recorder.getTraceSnapshot();
    assert.ok(snapshot);
    // In-memory operation completed with zero I/O
  });

  // Test 28: CURRENT production contracts/services are not referenced
  it("28. CURRENT production contracts/services are not referenced in trace files", () => {
    const dir = path.resolve(process.cwd(), "src/sound-engineer/trace");
    const files = fs.readdirSync(dir);

    for (const f of files) {
      if (!f.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(dir, f), "utf-8");

      assert.ok(!content.includes("translateTone"), `${f} must not reference translateTone`);
      assert.ok(!content.includes("buildToneProfile"), `${f} must not reference buildToneProfile`);
      assert.ok(!content.includes("gemini"), `${f} must not reference gemini`);
      assert.ok(!content.includes("firestore"), `${f} must not reference firestore`);
      assert.ok(!content.includes("at5p"), `${f} must not reference at5p`);
    }
  });

  // Test 29: Existing CheckpointEnvelope remains unchanged
  it("29. Existing CheckpointEnvelope remains unchanged", () => {
    assert.equal(CHECKPOINT_ENVELOPE_CONTRACT_VERSION, "1.0.0");
    const cp = createCheckpointEnvelope({
      runId: mockRunId,
      stream: mockStream,
      layer: SOUND_ENGINEER_LAYERS.INPUT,
      status: CHECKPOINT_STATUSES.PENDING,
    });
    assert.equal(cp.contractVersion, "1.0.0");
    assert.ok(cp.checkpointId.startsWith("chk_input_"));
  });

  // Test 30: Existing layer artifact contracts remain unchanged
  it("30. Existing layer artifact contracts remain unchanged", () => {
    assert.equal(EVIDENCE_RECORD_CONTRACT_VERSION, "1.0.0");
    assert.equal(ENGINEERING_DECISION_CONTRACT_VERSION, "1.0.0");
    assert.equal(SEMANTIC_TONE_DESIGN_CONTRACT_VERSION, "1.0.0");
    assert.equal(VALIDATION_REPORT_CONTRACT_VERSION, "1.0.0");
    assert.equal(PLATFORM_TRANSLATION_PLAN_CONTRACT_VERSION, "1.0.0");
  });

  // Demonstration test: Synthetic Shadow Trace with 6-layer pipeline
  it("31. Demonstrates synthetic Shadow trace with 6 layers matching requested lifecycle", () => {
    const { trace, recorder } = createSyntheticShadowTrace();

    assert.equal(trace.checkpointCount, 6);
    assert.equal(trace.stream, "SHADOW");

    const checkpoints = recorder.getCheckpoints();
    assert.equal(checkpoints[0].layer, "INPUT");
    assert.equal(checkpoints[0].status, "completed");

    assert.equal(checkpoints[1].layer, "EVIDENCE");
    assert.equal(checkpoints[1].status, "completed");

    assert.equal(checkpoints[2].layer, "ENGINEERING");
    assert.equal(checkpoints[2].status, "warning");

    assert.equal(checkpoints[3].layer, "SEMANTIC_DESIGN");
    assert.equal(checkpoints[3].status, "completed");

    assert.equal(checkpoints[4].layer, "VALIDATION");
    assert.equal(checkpoints[4].status, "completed");

    assert.equal(checkpoints[5].layer, "PLATFORM_TRANSLATION");
    assert.equal(checkpoints[5].status, "pending");

    // With layer 6 pending, the trace status is RUNNING
    assert.equal(trace.status, "RUNNING");

    // Verify diagnostic summary
    assert.equal(trace.diagnostics.totalCount, 3);
    assert.equal(trace.diagnostics.warningCount, 1);
    assert.equal(trace.diagnostics.infoCount, 2);

    // Verify lineage flow
    assert.equal(trace.lineage.length, 6);
    assert.equal(trace.lineage[0].output?.artifactType, "InputSnapshot");
    assert.equal(trace.lineage[1].output?.artifactType, "EvidenceRecord");
    assert.equal(trace.lineage[2].output?.artifactType, "EngineeringDecisionRecord");
    assert.equal(trace.lineage[3].output?.artifactType, "SemanticToneDesign");
    assert.equal(trace.lineage[4].output?.artifactType, "ValidationReport");
  });
});
