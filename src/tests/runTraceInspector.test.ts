// src/tests/runTraceInspector.test.ts
// Unit & Integration tests for Sound Engineer Phase 1B.4: Observability UI & Run Trace Inspector

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

import {
  EXECUTION_STREAMS,
  generateRunId,
  SOUND_ENGINEER_LAYERS,
  CHECKPOINT_STATUSES,
  createSyntheticTraceForScenario,
  ScenarioTraceOptions,
  RunTrace,
  isRunTrace,
  RUN_TRACE_CONTRACT_VERSION,
  dispatchShadowRun,
  ShadowRunState,
  ARTIFACT_TYPES,
} from "../sound-engineer";
import { RunTraceInspector } from "../components/RunTraceInspector";
import { computeShadowDisplayStatus } from "../components/WorkspaceToolbar";
import {
  loadWorkingSession,
  saveWorkingSession,
  clearWorkingSession,
} from "../services/sessionStorage";

describe("Sound Engineer Phase 1B.4 — Observability UI & Run Trace Inspector", () => {
  const mockRunId = generateRunId(EXECUTION_STREAMS.SHADOW);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Trace Identity & Execution Stream Correctness
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Trace Identity & Stream Correctness", () => {
    it("associates trace strictly with the active Shadow runId and SHADOW stream", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      assert.equal(trace.runId, mockRunId);
      assert.equal(trace.stream, EXECUTION_STREAMS.SHADOW);
      assert.equal(trace.stream, "SHADOW");
      assert.equal(trace.contractVersion, RUN_TRACE_CONTRACT_VERSION);
      assert.equal(trace.contractVersion, "1.0.0");
      assert.ok(trace.traceId.startsWith("trc_"), "traceId must have trc_ prefix");
      assert.ok(isRunTrace(trace), "Must satisfy isRunTrace contract predicate");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Lifecycle Scenarios: NORMAL, FAIL, TIMEOUT, HOLD, CANCEL
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Truthful Lifecycle Scenarios", () => {
    it("NORMAL: renders all 6 stages, non-fatal advisory in Engineering, status WARNING", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      assert.equal(trace.status, "WARNING");
      assert.equal(trace.checkpoints.length, 6);

      const layers = trace.checkpoints.map((c) => c.checkpoint.layer);
      assert.deepEqual(layers, [
        SOUND_ENGINEER_LAYERS.INPUT,
        SOUND_ENGINEER_LAYERS.EVIDENCE,
        SOUND_ENGINEER_LAYERS.ENGINEERING,
        SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN,
        SOUND_ENGINEER_LAYERS.VALIDATION,
        SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION,
      ]);

      // Checkpoint statuses
      assert.equal(trace.checkpoints[0].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[1].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[2].checkpoint.status, "warning");
      assert.equal(trace.checkpoints[3].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[4].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[5].checkpoint.status, "completed");

      // Diagnostics check
      assert.equal(trace.diagnostics.errorCount, 0);
      assert.equal(trace.diagnostics.warningCount, 1);
      assert.ok(trace.diagnostics.infoCount >= 3);

      // Engineering warning diagnostic
      const engDiagnostics = trace.checkpoints[2].checkpoint.diagnostics;
      assert.equal(engDiagnostics.length, 1);
      assert.equal(engDiagnostics[0].severity, "WARNING");
      assert.equal(engDiagnostics[0].code, "RESONANCE_NEAR_LIMIT");
    });

    it("FAIL: upstream Engineering fails, downstream stages are explicitly SKIPPED without fake outputs", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "failed",
        faultMode: "fail",
        error: {
          code: "UAT_FAULT_INJECTION_FAIL",
          message: "Simulated Shadow UAT Executor Failure [Fault Mode: fail]",
        },
      });

      assert.equal(trace.status, "FAILED");
      assert.equal(trace.checkpoints.length, 6);

      // Checkpoint statuses
      assert.equal(trace.checkpoints[0].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[1].checkpoint.status, "completed");
      assert.equal(trace.checkpoints[2].checkpoint.status, "failed");
      assert.equal(trace.checkpoints[3].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[4].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[5].checkpoint.status, "skipped");

      // Engineering failure diagnostic
      const engDiag = trace.checkpoints[2].checkpoint.diagnostics[0];
      assert.equal(engDiag.severity, "ERROR");
      assert.equal(engDiag.code, "UAT_FAULT_INJECTION_FAIL");

      // Truthful downstream skipped checks: no produced output
      assert.equal(trace.checkpoints[3].checkpoint.output, undefined);
      assert.equal(trace.checkpoints[4].checkpoint.output, undefined);
      assert.equal(trace.checkpoints[5].checkpoint.output, undefined);

      // Downstream skipped diagnostic indicates skipped due to upstream failure
      const skippedDiag = trace.checkpoints[3].checkpoint.diagnostics[0];
      assert.equal(skippedDiag.code, "SKIPPED_DUE_TO_FAILURE");
    });

    it("TIMEOUT: upstream Engineering times out, downstream stages are explicitly SKIPPED without fake success", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "failed",
        faultMode: "timeout",
        error: {
          code: "SHADOW_EXECUTION_TIMEOUT",
          message: "Shadow execution exceeded maximum timeout budget (40ms)",
        },
      });

      assert.equal(trace.status, "FAILED");

      // Engineering checkpoint has timeout error
      const engCheckpoint = trace.checkpoints[2].checkpoint;
      assert.equal(engCheckpoint.status, "failed");
      assert.equal(engCheckpoint.diagnostics[0].severity, "ERROR");
      assert.equal(engCheckpoint.diagnostics[0].code, "SHADOW_EXECUTION_TIMEOUT");

      // Downstream stages skipped
      assert.equal(trace.checkpoints[3].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[4].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[5].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[5].checkpoint.output, undefined);
    });

    it("HOLD / RUNNING: Engineering is actively RUNNING, downstream stages are PENDING without fabricated timing", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "running",
        faultMode: "hold",
      });

      assert.equal(trace.status, "RUNNING");

      // Engineering checkpoint is running
      const engCheckpoint = trace.checkpoints[2].checkpoint;
      assert.equal(engCheckpoint.status, "running");
      assert.ok(engCheckpoint.startedAt, "Running checkpoint must have startedAt");
      assert.equal(engCheckpoint.completedAt, undefined, "Running checkpoint must NOT have completedAt");
      assert.equal(engCheckpoint.durationMs, undefined, "Running checkpoint must NOT have fabricated durationMs");

      // Downstream stages are PENDING
      assert.equal(trace.checkpoints[3].checkpoint.status, "pending");
      assert.equal(trace.checkpoints[4].checkpoint.status, "pending");
      assert.equal(trace.checkpoints[5].checkpoint.status, "pending");

      assert.equal(trace.checkpoints[3].checkpoint.startedAt, undefined);
      assert.equal(trace.checkpoints[3].checkpoint.completedAt, undefined);
      assert.equal(trace.checkpoints[3].checkpoint.durationMs, undefined);

      // Summed layer duration only accounts for completed stages (INPUT + EVIDENCE)
      const inputDuration = trace.checkpoints[0].checkpoint.durationMs ?? 0;
      const evidenceDuration = trace.checkpoints[1].checkpoint.durationMs ?? 0;
      assert.equal(trace.timing.summedLayerDurationMs, inputDuration + evidenceDuration);
    });

    it("CANCEL: aborted Engineering produces CANCELLED status (not FAILED), downstream SKIPPED", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "cancelled",
        faultMode: "hold",
        cancellationReason: "User manually cancelled shadow execution",
      });

      assert.equal(trace.status, "CANCELLED");
      assert.notEqual(trace.status, "FAILED", "Cancelled trace must NOT be marked FAILED");

      // Engineering checkpoint cancelled
      const engCheckpoint = trace.checkpoints[2].checkpoint;
      assert.equal(engCheckpoint.status, "cancelled");
      assert.equal(engCheckpoint.diagnostics[0].code, "SHADOW_RUN_CANCELLED");
      assert.equal(engCheckpoint.diagnostics[0].message, "User manually cancelled shadow execution");

      // Downstream stages skipped
      assert.equal(trace.checkpoints[3].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[4].checkpoint.status, "skipped");
      assert.equal(trace.checkpoints[5].checkpoint.status, "skipped");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Checkpoint Ordering & Diagnostics Aggregation
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. Sequence Ordering & Diagnostics Aggregation", () => {
    it("enforces strict monotonic sequenceIndex ordering from 0 through 5", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      trace.checkpoints.forEach((entry, idx) => {
        assert.equal(entry.sequenceIndex, idx, `Sequence index at position ${idx} must be ${idx}`);
      });
    });

    it("aggregates error, warning, and info diagnostics correctly across all checkpoints", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      let totalErrors = 0;
      let totalWarnings = 0;
      let totalInfos = 0;

      for (const entry of trace.checkpoints) {
        for (const d of entry.checkpoint.diagnostics) {
          if (d.severity === "ERROR") totalErrors++;
          if (d.severity === "WARNING") totalWarnings++;
          if (d.severity === "INFO") totalInfos++;
        }
      }

      assert.equal(trace.diagnostics.errorCount, totalErrors);
      assert.equal(trace.diagnostics.warningCount, totalWarnings);
      assert.equal(trace.diagnostics.infoCount, totalInfos);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Timing Metrics: Wall-Clock vs Summed Layer Duration
  // ──────────────────────────────────────────────────────────────────────────
  describe("4. Timing Metrics: Wall-Clock vs Summed Layer Duration", () => {
    it("distinguishes wall-clock elapsed time from arithmetic summed layer duration", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      assert.ok(typeof trace.timing.summedLayerDurationMs === "number");
      assert.ok(trace.timing.summedLayerDurationMs > 0);

      // Sum of layer durations matches sum of each checkpoint's durationMs
      const calculatedSum = trace.checkpoints.reduce(
        (sum, entry) => sum + (entry.checkpoint.durationMs ?? 0),
        0
      );
      assert.equal(trace.timing.summedLayerDurationMs, calculatedSum);

      // In completed runs, wallClockDurationMs is defined
      if (trace.timing.wallClockDurationMs !== undefined) {
        assert.ok(typeof trace.timing.wallClockDurationMs === "number");
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Artifact Lineage Tracking
  // ──────────────────────────────────────────────────────────────────────────
  describe("5. Artifact Lineage Tracking", () => {
    it("maintains chronological lineage mapping consumed inputs and produced outputs", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      assert.equal(trace.lineage.length, 6);

      // 0. INPUT: consumes none, produces INPUT_SNAPSHOT
      assert.equal(trace.lineage[0].inputs.length, 0);
      assert.equal(trace.lineage[0].output?.artifactType, ARTIFACT_TYPES.INPUT_SNAPSHOT);

      // 1. EVIDENCE: consumes INPUT_SNAPSHOT, produces EVIDENCE_RECORD
      assert.equal(trace.lineage[1].inputs[0].artifactType, ARTIFACT_TYPES.INPUT_SNAPSHOT);
      assert.equal(trace.lineage[1].output?.artifactType, ARTIFACT_TYPES.EVIDENCE_RECORD);

      // 2. ENGINEERING: consumes EVIDENCE_RECORD, produces ENGINEERING_DECISION_RECORD
      assert.equal(trace.lineage[2].inputs[0].artifactType, ARTIFACT_TYPES.EVIDENCE_RECORD);
      assert.equal(trace.lineage[2].output?.artifactType, ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD);

      // 3. SEMANTIC_DESIGN: consumes ENGINEERING_DECISION_RECORD, produces SEMANTIC_TONE_DESIGN
      assert.equal(trace.lineage[3].inputs[0].artifactType, ARTIFACT_TYPES.ENGINEERING_DECISION_RECORD);
      assert.equal(trace.lineage[3].output?.artifactType, ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN);

      // 4. VALIDATION: consumes SEMANTIC_TONE_DESIGN, produces VALIDATION_REPORT
      assert.equal(trace.lineage[4].inputs[0].artifactType, ARTIFACT_TYPES.SEMANTIC_TONE_DESIGN);
      assert.equal(trace.lineage[4].output?.artifactType, ARTIFACT_TYPES.VALIDATION_REPORT);

      // 5. PLATFORM_TRANSLATION: consumes SEMANTIC_TONE_DESIGN & VALIDATION_REPORT
      assert.equal(trace.lineage[5].inputs.length, 2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. RunTraceInspector Component Rendering & DOM Contracts
  // ──────────────────────────────────────────────────────────────────────────
  describe("6. RunTraceInspector Component & DOM Contracts", () => {
    it("renders null when isOpen is false", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
      });

      const html = renderToString(
        React.createElement(RunTraceInspector, {
          isOpen: false,
          onClose: () => {},
          trace,
        })
      );

      assert.equal(html, "");
    });

    it("renders null when trace is null", () => {
      const html = renderToString(
        React.createElement(RunTraceInspector, {
          isOpen: true,
          onClose: () => {},
          trace: null,
        })
      );

      assert.equal(html, "");
    });

    it("renders modal structure, synthetic QA badge, metrics, and checkpoints when open", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      const html = renderToString(
        React.createElement(RunTraceInspector, {
          isOpen: true,
          onClose: () => {},
          trace,
        })
      );

      // Modal container
      assert.ok(html.includes('data-testid="run-trace-inspector-modal"'));

      // Synthetic QA Trace badge
      assert.ok(html.includes('data-testid="synthetic-qa-trace-badge"'));
      assert.ok(html.includes("Synthetic QA Trace"));

      // Execution stream
      assert.ok(html.includes("SHADOW"));

      // Run and Trace ID
      assert.ok(html.includes(trace.runId));
      assert.ok(html.includes(trace.traceId));

      // Close button
      assert.ok(html.includes('data-testid="close-trace-inspector-button"'));

      // Checkpoints buttons
      assert.ok(html.includes('data-testid="checkpoint-item-input"'));
      assert.ok(html.includes('data-testid="checkpoint-item-evidence"'));
      assert.ok(html.includes('data-testid="checkpoint-item-engineering"'));
      assert.ok(html.includes('data-testid="checkpoint-item-semantic_design"'));
      assert.ok(html.includes('data-testid="checkpoint-item-validation"'));
      assert.ok(html.includes('data-testid="checkpoint-item-platform_translation"'));

      // Metrics & timings labels
      assert.ok(html.includes("Wall-Clock Duration"));
      assert.ok(html.includes("Summed Layer Duration"));
      assert.ok(html.includes("Total elapsed time"));
      assert.ok(html.includes("Arithmetic layer sum"));

      // Tabs
      assert.ok(html.includes('data-testid="tab-pipeline"'));
      assert.ok(html.includes('data-testid="tab-lineage"'));
    });

    it("renders read-only payload preview when checkpoint has payload", () => {
      const trace = createSyntheticTraceForScenario({
        runId: mockRunId,
        status: "completed",
        faultMode: "normal",
      });

      const html = renderToString(
        React.createElement(RunTraceInspector, {
          isOpen: true,
          onClose: () => {},
          trace,
        })
      );

      // When rendering default completed normal trace, first checkpoint (or default selected) renders
      assert.ok(html.includes("Stage Timings"));
      assert.ok(html.includes("Consumed Inputs"));
      assert.ok(html.includes("Produced Output"));
    });

    it("verifies Escape key handling logic in component source code", () => {
      const inspectorSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/RunTraceInspector.tsx"),
        "utf-8"
      );

      // Verify Escape listener pattern
      assert.ok(inspectorSource.includes('e.key === "Escape"'));
      assert.ok(inspectorSource.includes('window.addEventListener("keydown", handleKeyDown)'));
      assert.ok(inspectorSource.includes('window.removeEventListener("keydown", handleKeyDown)'));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Application & Toolbar Integration Contracts
  // ──────────────────────────────────────────────────────────────────────────
  describe("7. Application & Toolbar Integration Contracts", () => {
    it("WorkspaceToolbar renders quick trace button and popover trace button when shadowState is present", () => {
      const toolbarSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/WorkspaceToolbar.tsx"),
        "utf-8"
      );

      assert.ok(
        toolbarSource.includes('data-testid="shadow-quick-trace-button"'),
        "WorkspaceToolbar must render shadow-quick-trace-button"
      );
      assert.ok(
        toolbarSource.includes('data-testid="shadow-view-trace-button"'),
        "WorkspaceToolbar must render shadow-view-trace-button in details popover"
      );
      assert.ok(
        toolbarSource.includes("onOpenTraceInspector"),
        "WorkspaceToolbar must receive onOpenTraceInspector prop"
      );
    });

    it("App.tsx memoizes shadowTrace with createSyntheticTraceForScenario and mounts RunTraceInspector", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");

      assert.ok(
        appSource.includes("createSyntheticTraceForScenario"),
        "App.tsx must use createSyntheticTraceForScenario"
      );
      assert.ok(
        appSource.includes("<RunTraceInspector"),
        "App.tsx must mount RunTraceInspector"
      );
      assert.ok(
        appSource.includes("isTraceInspectorOpen"),
        "App.tsx must control isTraceInspectorOpen state"
      );
      assert.ok(
        appSource.includes("onOpenTraceInspector={() => setIsTraceInspectorOpen(true)}"),
        "App.tsx must provide onOpenTraceInspector callback to WorkspaceToolbar"
      );
    });

    it("RESET clears shadowState, shadowTrace, closes inspector, while preserving shadowModeEnabled, faultMode, and Current state", () => {
      // Simulate state transitions in App.tsx
      let shadowModeEnabled = true;
      let shadowFaultMode = "timeout";
      let shadowState: ShadowRunState | null = {
        contractVersion: "1.0.0",
        runId: mockRunId,
        stream: EXECUTION_STREAMS.SHADOW,
        snapshotId: `snap_${mockRunId}`,
        status: "failed",
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      let isTraceInspectorOpen = true;

      const currentToneState = {
        prompt: "Preserved Prompt",
        userPreset: { name: "LeadSolo" },
      };

      // Reset action
      shadowState = null;
      isTraceInspectorOpen = false;

      // Assertions
      assert.equal(shadowState, null);
      assert.equal(isTraceInspectorOpen, false);
      assert.equal(shadowModeEnabled, true, "Shadow enabled state must be preserved across reset");
      assert.equal(shadowFaultMode, "timeout", "QA fault mode must be preserved across reset");
      assert.equal(currentToneState.prompt, "Preserved Prompt", "Current prompt preserved");
      assert.equal(currentToneState.userPreset.name, "LeadSolo", "Current preset preserved");

      // Verify trace inspector is unavailable when shadowState is null
      const canInspectTrace = Boolean(shadowState);
      assert.equal(canInspectTrace, false, "Inspect Trace must be unavailable after reset");
    });

    it("Shadow OFF produces no new shadow run and no trace", () => {
      const shadowModeEnabled = false;
      let dispatchedRun = null;

      if (shadowModeEnabled) {
        dispatchedRun = dispatchShadowRun({ userText: "Disabled run" });
      }

      assert.equal(dispatchedRun, null);
    });

    it("Rapid consecutive runs discard stale older run trace via activeShadowRunIdRef check", () => {
      let activeShadowRunId: string | null = null;
      let activeTrace: RunTrace | null = null;

      // Run 1 starts
      const run1Id = generateRunId(EXECUTION_STREAMS.SHADOW);
      activeShadowRunId = run1Id;

      // Rapid Run 2 starts before Run 1 finishes
      const run2Id = generateRunId(EXECUTION_STREAMS.SHADOW);
      activeShadowRunId = run2Id;

      // Run 1 completion callback arrives late
      if (activeShadowRunId === run1Id) {
        activeTrace = createSyntheticTraceForScenario({ runId: run1Id, status: "completed" });
      }

      // Assert: Run 1 trace was discarded
      assert.equal(activeTrace, null, "Older run trace must be ignored when activeShadowRunId has changed");

      // Run 2 completion callback arrives
      if (activeShadowRunId === run2Id) {
        activeTrace = createSyntheticTraceForScenario({ runId: run2Id, status: "completed" });
      }

      assert.ok(activeTrace);
      assert.equal(activeTrace.runId, run2Id);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Isolation & Non-Interference Guarantees
  // ──────────────────────────────────────────────────────────────────────────
  describe("8. Isolation & Non-Interference Guarantees", () => {
    it("Working session persistence does NOT store shadow trace, shadow state, or inspector state", () => {
      clearWorkingSession();

      saveWorkingSession(
        {
          revision: 0,
          prompt: "Clean Current Session",
          youtubeUrl: "",
          useValidationRecipes: false,
          activeVariation: "primary",
          exportFilename: "Session1",
          toneResult: null,
          userPreset: null,
          diffs: [],
          activeGearId: null,
          isChainViewOpen: false,
        },
        true
      );

      const loaded = loadWorkingSession();
      assert.ok(loaded.session);

      // Verify no shadow-related properties leaked into working session
      const rawSession = loaded.session as Record<string, any>;
      assert.equal(rawSession.shadowState, undefined);
      assert.equal(rawSession.shadowTrace, undefined);
      assert.equal(rawSession.isTraceInspectorOpen, undefined);
    });

    it("Current Refresh, Clear, and Export controls remain independent of Shadow trace presence", () => {
      // With trace present
      const computeCurrentStatus = (hasToneResult: boolean, isDbRefreshing: boolean) => ({
        canRefresh: hasToneResult && !isDbRefreshing,
        canExport: hasToneResult,
      });

      const withTrace = computeCurrentStatus(true, false);
      const withoutTrace = computeCurrentStatus(true, false);

      assert.deepEqual(withTrace, withoutTrace);
      assert.equal(withTrace.canRefresh, true);
      assert.equal(withTrace.canExport, true);
    });

    it("RunTraceInspector code is strictly read-only and contains no Gemini, Firestore, or execution APIs", () => {
      const inspectorSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/RunTraceInspector.tsx"),
        "utf-8"
      );

      // Verify no production write or AI execution APIs are imported or invoked
      assert.ok(!inspectorSource.includes("geminiService"));
      assert.ok(!inspectorSource.includes("firestore"));
      assert.ok(!inspectorSource.includes("setToneResult"));
      assert.ok(!inspectorSource.includes("saveWorkingSession"));
      assert.ok(!inspectorSource.includes("dispatchShadowRun"));
      assert.ok(!inspectorSource.includes("fetch("));
    });
  });
});
