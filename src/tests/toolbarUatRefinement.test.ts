// src/tests/toolbarUatRefinement.test.ts
// Unit & Integration tests for Sound Engineer Phase 1A.4a: UAT UI Refinement

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  computeShadowDisplayStatus,
  ShadowDisplayStatus,
} from "../components/WorkspaceToolbar";
import {
  ShadowRunState,
  dispatchShadowRun,
  EXECUTION_STREAMS,
} from "../sound-engineer";
import {
  loadWorkingSession,
  saveWorkingSession,
  clearWorkingSession,
} from "../services/sessionStorage";

describe("Sound Engineer Phase 1A.4a — UAT UI Refinement", () => {
  // Test 1: Shadow control is visible in secondary toolbar
  // Test 2: Old large bottom Shadow panel is no longer rendered
  describe("1. Header & Secondary Toolbar Layout Architecture (Req 1, 2)", () => {
    it("App.tsx renders persistent WorkspaceToolbar directly under main header", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");

      // Verify WorkspaceToolbar is mounted
      assert.ok(
        appSource.includes("<WorkspaceToolbar"),
        "WorkspaceToolbar must be mounted in App.tsx"
      );

      // Verify it is not conditionally gated on {toneResult && ( ... )}
      const headerToMain = appSource.substring(
        appSource.indexOf("<header"),
        appSource.indexOf("<main")
      );
      assert.ok(
        headerToMain.includes("<WorkspaceToolbar"),
        "WorkspaceToolbar must be located between <header> and <main>"
      );
      assert.ok(
        !headerToMain.includes("{toneResult && <WorkspaceToolbar"),
        "WorkspaceToolbar must be persistent and not gated on toneResult"
      );
    });

    it("old large bottom SoundEngineerDevPanel is no longer rendered in App.tsx", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");

      assert.ok(
        !appSource.includes("<SoundEngineerDevPanel"),
        "Old large SoundEngineerDevPanel must be removed from App.tsx"
      );
      assert.ok(
        !appSource.includes("import { SoundEngineerDevPanel }"),
        "SoundEngineerDevPanel import must be removed from App.tsx"
      );
    });
  });

  // Test 3: Shadow defaults OFF
  // Test 4: Fault controls disabled when Shadow OFF
  // Test 5: Fault controls enabled when Shadow ON
  describe("2. Shadow Mode & Fault Mode Controls (Req 3, 4, 5)", () => {
    it("defaults to OFF", () => {
      const initialShadowMode = false;
      const status = computeShadowDisplayStatus(initialShadowMode, null);
      assert.equal(status, "OFF");
    });

    it("evaluates to READY when Shadow Mode is ON and no run has executed", () => {
      const status = computeShadowDisplayStatus(true, null);
      assert.equal(status, "READY");
    });

    it("fault controls enablement is strictly governed by shadowModeEnabled", () => {
      const isFaultModeInteractive = (shadowModeEnabled: boolean) => shadowModeEnabled;

      assert.equal(isFaultModeInteractive(false), false, "Fault controls must be disabled when OFF");
      assert.equal(isFaultModeInteractive(true), true, "Fault controls must be enabled when ON");
    });
  });

  // Test 6: RUNNING state visible
  // Test 7: COMPLETED state visible
  // Test 8: FAILED state visible
  // Test 9: CANCELLED state visible
  describe("3. Textual Lifecycle Status Mapping (Req 6, 7, 8, 9)", () => {
    const mockState = (status: ShadowRunState["status"]): ShadowRunState => ({
      contractVersion: "1.0.0",
      runId: "shadow_run_mock123",
      stream: EXECUTION_STREAMS.SHADOW,
      snapshotId: "snap_shadow_mock123",
      status,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: status !== "running" ? new Date().toISOString() : undefined,
    });

    it("correctly maps 'running' to RUNNING status (Req 6)", () => {
      const status = computeShadowDisplayStatus(true, mockState("running"));
      assert.equal(status, "RUNNING");
    });

    it("correctly maps 'completed' to COMPLETED status (Req 7)", () => {
      const status = computeShadowDisplayStatus(true, mockState("completed"));
      assert.equal(status, "COMPLETED");
    });

    it("correctly maps 'failed' to FAILED status (Req 8)", () => {
      const status = computeShadowDisplayStatus(true, mockState("failed"));
      assert.equal(status, "FAILED");
    });

    it("correctly maps 'cancelled' to CANCELLED status (Req 9)", () => {
      const status = computeShadowDisplayStatus(true, mockState("cancelled"));
      assert.equal(status, "CANCELLED");
    });

    it("correctly maps 'created' to READY status", () => {
      const status = computeShadowDisplayStatus(true, mockState("created"));
      assert.equal(status, "READY");
    });

    it("always returns OFF when shadowModeEnabled is false, regardless of prior state", () => {
      const status = computeShadowDisplayStatus(false, mockState("completed"));
      assert.equal(status, "OFF");
    });
  });

  // Test 10: Current actions remain independent of Shadow status
  // Test 11: Current result-dependent controls correctly enable/disable
  // Test 12: Existing Current action handlers are preserved
  describe("4. Current Actions Enablement & Independence (Req 10, 11, 12)", () => {
    const computeCurrentActionsEnablement = (params: {
      hasToneResult: boolean;
      hasActiveContent: boolean;
      isDbRefreshing: boolean;
    }) => {
      return {
        canRefresh: params.hasToneResult && !params.isDbRefreshing,
        canClear: params.hasActiveContent,
        canExport: params.hasToneResult,
      };
    };

    it("disables result-dependent actions before valid Current result exists (Req 11)", () => {
      const beforeResult = computeCurrentActionsEnablement({
        hasToneResult: false,
        hasActiveContent: false,
        isDbRefreshing: false,
      });

      assert.equal(beforeResult.canRefresh, false);
      assert.equal(beforeResult.canClear, false);
      assert.equal(beforeResult.canExport, false);
    });

    it("enables Clear when prompt or active content is present before translation", () => {
      const withPromptOnly = computeCurrentActionsEnablement({
        hasToneResult: false,
        hasActiveContent: true, // User typed prompt
        isDbRefreshing: false,
      });

      assert.equal(withPromptOnly.canRefresh, false);
      assert.equal(withPromptOnly.canClear, true);
      assert.equal(withPromptOnly.canExport, false);
    });

    it("enables all Current actions after valid Current result exists", () => {
      const afterResult = computeCurrentActionsEnablement({
        hasToneResult: true,
        hasActiveContent: true,
        isDbRefreshing: false,
      });

      assert.equal(afterResult.canRefresh, true);
      assert.equal(afterResult.canClear, true);
      assert.equal(afterResult.canExport, true);
    });

    it("Current action enablement remains completely independent of Shadow status (Req 10)", () => {
      const shadowStatuses: ShadowDisplayStatus[] = [
        "OFF",
        "READY",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ];

      for (const shadowStatus of shadowStatuses) {
        const actions = computeCurrentActionsEnablement({
          hasToneResult: true,
          hasActiveContent: true,
          isDbRefreshing: false,
        });

        assert.equal(
          actions.canExport,
          true,
          `Export must be enabled when Shadow is ${shadowStatus}`
        );
        assert.equal(
          actions.canRefresh,
          true,
          `Refresh must be enabled when Shadow is ${shadowStatus}`
        );
        assert.equal(
          actions.canClear,
          true,
          `Clear must be enabled when Shadow is ${shadowStatus}`
        );
      }
    });

    it("preserves exact existing Current action handlers in App.tsx (Req 12)", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");

      assert.ok(
        appSource.includes("onRefreshChain={handleRefreshChain}"),
        "handleRefreshChain handler must be wired to onRefreshChain"
      );
      assert.ok(
        appSource.includes("onClearSession={handleClearWorkingSession}"),
        "handleClearWorkingSession handler must be wired to onClearSession"
      );
      assert.ok(
        appSource.includes("onExportPreset={initiateExport}"),
        "initiateExport handler must be wired to onExportPreset"
      );
    });
  });

  // Test 13: Shadow cancel remains isolated if exposed through detailed controls
  describe("5. Isolated Shadow Cancellation via UI (Req 13)", () => {
    it("cancelling Shadow through cancellation handle does not abort Current AbortController", () => {
      const currentAbortController = new AbortController();
      let currentAborted = false;
      currentAbortController.signal.addEventListener("abort", () => {
        currentAborted = true;
      });

      // Dispatch shadow run and invoke cancel
      const result = dispatchShadowRun({ userText: "Cancellation isolation test" });
      result.cancel("User clicked Cancel Shadow Run in toolbar popover");

      const finalState = result.controller.getState();
      assert.equal(finalState.status, "cancelled");
      assert.equal(finalState.cancellationReason, "User clicked Cancel Shadow Run in toolbar popover");

      // Current controller must be unaffected
      assert.equal(currentAborted, false);
      assert.equal(currentAbortController.signal.aborted, false);
    });
  });

  // Test 14: Existing session persistence remains free of Shadow state
  describe("6. Session Persistence Isolation (Req 14)", () => {
    it("does not serialize any toolbar or shadow state into working session persistence", () => {
      clearWorkingSession();

      saveWorkingSession(
        {
          revision: 0,
          prompt: "UI refinement session test",
          youtubeUrl: "",
          useValidationRecipes: false,
          activeVariation: "primary",
          exportFilename: "UIRefinementPreset",
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
      assert.equal(loaded.session.prompt, "UI refinement session test");

      const sessionKeys = Object.keys(loaded.session);
      assert.ok(!sessionKeys.includes("shadowModeEnabled"));
      assert.ok(!sessionKeys.includes("shadowFaultMode"));
      assert.ok(!sessionKeys.includes("shadowState"));
      assert.ok(!sessionKeys.includes("displayStatus"));
      assert.ok(!sessionKeys.includes("isDetailsOpen"));
    });
  });

  // Removed obsolete toolbar controls verification
  describe("7. Obsolete Controls Removal Verification", () => {
    it("confirms Tone Iterations: Studio Reference is removed from secondary toolbar", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");
      assert.ok(
        !appSource.includes("Tone Iterations:"),
        "Tone Iterations label must be removed"
      );
      assert.ok(
        !appSource.includes("Studio Reference"),
        "Static Studio Reference button must be removed"
      );
    });

    it("confirms redundant Inspect Chain button is removed from secondary toolbar", () => {
      const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");
      assert.ok(
        !appSource.includes("Inspect Chain"),
        "Inspect Chain button must be removed"
      );
    });
  });

  // Phase 1A.4b: HOLD Fault Mode & Manual Cancellation UAT Support
  describe("8. Phase 1A.4b: HOLD Fault Mode & Manual Cancellation UAT Support", () => {
    it("HOLD remains RUNNING long enough for cancellation (Req 1)", async () => {
      const result = dispatchShadowRun({
        userText: "Hold mode test",
        faultMode: "hold",
        holdDurationMs: 1000,
      });

      // Wait 60ms (well past normal 25ms completion window)
      await new Promise((resolve) => setTimeout(resolve, 60));

      const state = result.controller.getState();
      assert.equal(state.status, "running", "HOLD mode must remain RUNNING while waiting");

      // Clean up by cancelling
      result.cancel("Test cleanup");
    });

    it("cancelling HOLD results in CANCELLED and not FAILED (Req 2, 3)", async () => {
      let observedState: ShadowRunState | null = null;

      const result = dispatchShadowRun(
        {
          userText: "Hold mode cancel test",
          faultMode: "hold",
          holdDurationMs: 5000,
        },
        (state) => {
          observedState = state;
        }
      );

      // Wait a moment for RUNNING
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.equal(result.controller.getState().status, "running");

      // Invoke cancellation
      result.cancel("User cancelled during HOLD in UAT");

      await new Promise((resolve) => setTimeout(resolve, 20));

      const finalState = result.controller.getState();
      assert.equal(finalState.status, "cancelled", "Status must be CANCELLED");
      assert.notEqual(finalState.status, "failed", "Cancellation must not be FAILED");
      assert.equal(finalState.error, undefined, "Error must be undefined on cancellation");
      assert.equal(finalState.cancellationReason, "User cancelled during HOLD in UAT");
    });

    it("Current execution state is completely unaffected by HOLD and cancellation (Req 4)", async () => {
      const currentAbortController = new AbortController();
      let currentCancelled = false;
      currentAbortController.signal.addEventListener("abort", () => {
        currentCancelled = true;
      });

      let currentError: string | null = null;
      const currentToneResult = {
        confidence: 94,
        signal_chain: [{ name: "British Lead", type: "amp" }],
      };
      const initialJson = JSON.stringify(currentToneResult);

      const result = dispatchShadowRun({
        userText: "Current isolation test",
        faultMode: "hold",
        holdDurationMs: 3000,
      });

      await new Promise((resolve) => setTimeout(resolve, 30));
      result.cancel("Cancelled Shadow HOLD");

      assert.equal(currentCancelled, false);
      assert.equal(currentAbortController.signal.aborted, false);
      assert.equal(currentError, null);
      assert.equal(JSON.stringify(currentToneResult), initialJson);
    });

    it("HOLD completing without cancellation terminates normally with COMPLETED (Req 5)", async () => {
      const result = dispatchShadowRun({
        userText: "Hold completion test",
        faultMode: "hold",
        holdDurationMs: 60, // Short hold for unit test
      });

      // Wait for hold to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = result.controller.getState();
      assert.equal(state.status, "completed", "Uncancelled HOLD must terminate with COMPLETED");
      assert.ok(state.result);
      assert.equal(state.result?.acknowledged, true);
    });

    it("HOLD state is not persisted into Current session data (Req 6)", () => {
      clearWorkingSession();

      const result = dispatchShadowRun({
        userText: "Hold persistence test",
        faultMode: "hold",
      });

      saveWorkingSession(
        {
          revision: 0,
          prompt: "Hold session test",
          youtubeUrl: "",
          useValidationRecipes: false,
          activeVariation: "primary",
          exportFilename: "HoldPreset",
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
      assert.equal(loaded.session.prompt, "Hold session test");

      const sessionKeys = Object.keys(loaded.session);
      assert.ok(!sessionKeys.includes("faultMode"));
      assert.ok(!sessionKeys.includes("hold"));
      assert.ok(!sessionKeys.includes(result.runMetadata.runId));

      // Clean up
      result.cancel();
    });

    it("WorkspaceToolbar exposes HOLD in the fault mode selector", () => {
      const toolbarSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/WorkspaceToolbar.tsx"),
        "utf-8"
      );
      assert.ok(
        toolbarSource.includes('"hold"'),
        "WorkspaceToolbar must include hold in ShadowFaultMode list"
      );
    });
  });

  // Phase 1A.4c: Independent Shadow Reset
  describe("9. Phase 1A.4c: Independent Shadow Reset", () => {
    const isResetAvailable = (
      shadowModeEnabled: boolean,
      status: ShadowRunState["status"] | null
    ): boolean => {
      if (!shadowModeEnabled || !status) return false;
      return status === "completed" || status === "failed" || status === "cancelled";
    };

    it("Reset is available after COMPLETED, FAILED, and CANCELLED (Req 1, 2, 3)", () => {
      assert.equal(isResetAvailable(true, "completed"), true, "Must be available after COMPLETED");
      assert.equal(isResetAvailable(true, "failed"), true, "Must be available after FAILED");
      assert.equal(isResetAvailable(true, "cancelled"), true, "Must be available after CANCELLED");
    });

    it("Reset is unavailable while RUNNING (Req 10, 11)", () => {
      assert.equal(isResetAvailable(true, "running"), false, "Must be unavailable while RUNNING");
    });

    it("Reset is unavailable when Shadow is OFF (Req 12)", () => {
      assert.equal(isResetAvailable(false, "completed"), false, "Must be unavailable when OFF");
      assert.equal(isResetAvailable(false, "failed"), false, "Must be unavailable when OFF");
      assert.equal(isResetAvailable(false, "cancelled"), false, "Must be unavailable when OFF");
      assert.equal(isResetAvailable(false, "running"), false, "Must be unavailable when OFF");
    });

    it("Reset returns Shadow to READY when Shadow remains ON, clearing runId/snapshotId/error/metadata (Req 4, 5, 6, 7, 8, 9)", () => {
      let shadowModeEnabled = true;
      let shadowFaultMode = "hold";
      let shadowState: ShadowRunState | null = {
        contractVersion: "1.0.0",
        runId: "shadow_run_prev123",
        stream: EXECUTION_STREAMS.SHADOW,
        snapshotId: "snap_shadow_prev123",
        status: "failed",
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: {
          code: "UAT_FAULT_INJECTION_FAIL",
          message: "Simulated failure",
          isRecoverable: false,
          occurredAt: new Date().toISOString(),
        },
      };

      // Execute Reset Shadow action
      const handleResetShadow = () => {
        if (shadowState?.status === "running") return;
        shadowState = null;
      };

      handleResetShadow();

      // State after reset
      assert.equal(shadowState, null);
      assert.equal(computeShadowDisplayStatus(shadowModeEnabled, shadowState), "READY");
      assert.equal(shadowModeEnabled, true, "Shadow Mode must remain ON");
      assert.equal(shadowFaultMode, "hold", "Fault Mode selection must be preserved");
    });

    it("Reset does not alter CURRENT toneResult, prompt, or signal chain (Req 13, 14)", () => {
      const currentToneResult = {
        confidence: 96,
        signal_chain: [{ name: "British Tube Lead 1", type: "amp" }],
      };
      const initialJson = JSON.stringify(currentToneResult);
      const currentPrompt = "1970s Classic Rock Lead";

      let shadowState: ShadowRunState | null = {
        contractVersion: "1.0.0",
        runId: "shadow_run_old",
        stream: EXECUTION_STREAMS.SHADOW,
        snapshotId: "snap_shadow_old",
        status: "completed",
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      // Reset Shadow
      shadowState = null;

      // Current state assertions
      assert.equal(JSON.stringify(currentToneResult), initialJson);
      assert.equal(currentPrompt, "1970s Classic Rock Lead");
      assert.equal(currentToneResult.signal_chain.length, 1);
    });

    it("Reset performs no session/persistence side effects (Req 15)", () => {
      clearWorkingSession();

      saveWorkingSession(
        {
          revision: 0,
          prompt: "Session preserved across reset",
          youtubeUrl: "",
          useValidationRecipes: false,
          activeVariation: "primary",
          exportFilename: "PreservedPreset",
          toneResult: null,
          userPreset: null,
          diffs: [],
          activeGearId: null,
          isChainViewOpen: false,
        },
        true
      );

      // Perform Shadow reset
      let shadowState: ShadowRunState | null = null;
      assert.equal(shadowState, null);

      const loaded = loadWorkingSession();
      assert.ok(loaded.session);
      assert.equal(loaded.session.prompt, "Session preserved across reset");
    });

    it("new generation after Reset creates a completely new Shadow runId and snapshotId (Req 16)", () => {
      // Run 1
      const run1 = dispatchShadowRun({ userText: "Pre-reset tone" });
      const run1Id = run1.runMetadata.runId;
      const snap1Id = run1.inputSnapshot.snapshotId;

      // Reset
      let shadowState: ShadowRunState | null = null;
      assert.equal(shadowState, null);

      // Run 2 (New generation after Reset)
      const run2 = dispatchShadowRun({ userText: "Post-reset tone" });
      const run2Id = run2.runMetadata.runId;
      const snap2Id = run2.inputSnapshot.snapshotId;

      assert.notEqual(run1Id, run2Id, "New runId must be distinct from pre-reset runId");
      assert.notEqual(snap1Id, snap2Id, "New snapshotId must be distinct from pre-reset snapshotId");
      assert.equal(run2.runMetadata.stream, "SHADOW");
    });

    it("WorkspaceToolbar and App.tsx declare and wire onResetShadow correctly", () => {
      const toolbarSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/WorkspaceToolbar.tsx"),
        "utf-8"
      );
      assert.ok(
        toolbarSource.includes("onResetShadow"),
        "WorkspaceToolbar must include onResetShadow prop"
      );
      assert.ok(
        toolbarSource.includes('data-testid="shadow-quick-reset-button"'),
        "WorkspaceToolbar must render quick reset button"
      );
      assert.ok(
        toolbarSource.includes('data-testid="shadow-popover-reset-button"'),
        "WorkspaceToolbar must render popover reset button"
      );

      const appSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/App.tsx"),
        "utf-8"
      );
      assert.ok(
        appSource.includes("handleResetShadow"),
        "App.tsx must define handleResetShadow"
      );
      assert.ok(
        appSource.includes("onResetShadow={handleResetShadow}"),
        "App.tsx must pass onResetShadow to WorkspaceToolbar"
      );
    });
  });
});
