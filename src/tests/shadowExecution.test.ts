// src/tests/shadowExecution.test.ts
// Unit tests for Sound Engineer Phase 1A.3: Independent Shadow Lifecycle Foundation

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STREAMS,
  createRunMetadata,
  createInputSnapshot,
  ShadowExecutionController,
  createShadowExecutionController,
  isShadowRunState,
  SHADOW_RUN_STATE_CONTRACT_VERSION,
} from "../sound-engineer";

describe("Sound Engineer Phase 1A.3 — Independent Shadow Lifecycle Foundation", () => {
  function createValidShadowFixtures(customRunId?: string) {
    const run = createRunMetadata({
      stream: EXECUTION_STREAMS.SHADOW,
      ...(customRunId ? { runId: customRunId } : {}),
    });
    const snapshot = createInputSnapshot({
      runId: run.runId,
      stream: EXECUTION_STREAMS.SHADOW,
      userText: "Shadow evaluation tone request",
    });
    return { run, snapshot };
  }

  // Requirements 1, 2, 3, 4: Valid run execution, lifecycle progression, and result reference
  describe("1. Normal Lifecycle & Execution", () => {
    it("initializes with lifecycle status 'created'", () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const state = controller.getState();
      assert.equal(state.status, "created");
      assert.equal(state.runId, run.runId);
      assert.equal(state.snapshotId, snapshot.snapshotId);
      assert.equal(state.stream, "SHADOW");
      assert.equal(state.startedAt, undefined);
      assert.equal(state.completedAt, undefined);
      assert.equal(state.error, undefined);
      assert.equal(state.result, undefined);
      assert.equal(state.contractVersion, SHADOW_RUN_STATE_CONTRACT_VERSION);
    });

    it("progresses through normal lifecycle to reach 'completed'", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const observedStatuses: string[] = [];
      controller.subscribe((state) => {
        observedStatuses.push(state.status);
      });

      const finalState = await controller.execute();

      assert.equal(finalState.status, "completed");
      assert.ok(typeof finalState.startedAt === "string");
      assert.ok(typeof finalState.completedAt === "string");
      assert.ok(observedStatuses.includes("running"));
      assert.ok(observedStatuses.includes("completed"));
    });

    it("result references the correct runId and snapshotId", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const finalState = await controller.execute();

      assert.ok(finalState.result);
      assert.equal(finalState.result.runId, run.runId);
      assert.equal(finalState.result.snapshotId, snapshot.snapshotId);
      assert.equal(finalState.result.acknowledged, true);
      assert.ok(finalState.result.durationMs >= 0);
    });
  });

  // Requirements 5, 6, 7, 8, 9: Boundary enforcement & rejection of non-shadow runs
  describe("2. Shadow-Only Boundary Guards", () => {
    it("rejects CURRENT run at controller construction boundary", () => {
      const currentRun = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const currentSnap = createInputSnapshot({
        runId: currentRun.runId,
        stream: EXECUTION_STREAMS.CURRENT,
      });

      assert.throws(() => {
        createShadowExecutionController(currentRun, currentSnap);
      }, /stream violation: expected stream "SHADOW", received "CURRENT"/);
    });

    it("rejects DEV run at controller construction boundary", () => {
      const devRun = createRunMetadata({ stream: EXECUTION_STREAMS.DEV });
      const devSnap = createInputSnapshot({
        runId: devRun.runId,
        stream: EXECUTION_STREAMS.DEV,
      });

      assert.throws(() => {
        createShadowExecutionController(devRun, devSnap);
      }, /stream violation: expected stream "SHADOW", received "DEV"/);
    });

    it("rejects run/snapshot ID mismatch", () => {
      const runA = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      const runB = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      const snapshotB = createInputSnapshot({
        runId: runB.runId,
        stream: EXECUTION_STREAMS.SHADOW,
      });

      assert.throws(() => {
        createShadowExecutionController(runA, snapshotB);
      }, /ID mismatch/);
    });

    it("rejects stream mismatch between RunMetadata and InputSnapshot", () => {
      const shadowRun = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      // Create malformed snapshot masquerading with different stream
      const malformedSnapshot: any = {
        contractVersion: "1.0.0",
        snapshotId: "snap_123",
        runId: shadowRun.runId,
        stream: "CURRENT",
        createdAt: new Date().toISOString(),
        inputs: { generationOptions: {} },
        provenance: {},
      };

      assert.throws(() => {
        createShadowExecutionController(shadowRun, malformedSnapshot);
      }, /stream violation/);
    });

    it("rejects malformed contract inputs", () => {
      assert.throws(() => {
        createShadowExecutionController(null as any, null as any);
      }, /Invalid RunMetadata/);

      const shadowRun = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      assert.throws(() => {
        createShadowExecutionController(shadowRun, { notASnapshot: true } as any);
      }, /Invalid InputSnapshot/);
    });
  });

  // Requirements 10, 11: Failure isolation and structured error information
  describe("3. Failure Isolation", () => {
    it("captures deliberate executor failure and produces terminal 'failed' status", async () => {
      const { run, snapshot } = createValidShadowFixtures();

      const controller = createShadowExecutionController(run, snapshot, {
        customExecutor: async () => {
          const err = new Error("Simulated transient neural compute failure");
          (err as any).code = "INJECTED_TEST_FAILURE";
          throw err;
        },
      });

      const finalState = await controller.execute();

      assert.equal(finalState.status, "failed");
      assert.ok(finalState.error);
      assert.equal(finalState.error.name, "Error");
      assert.equal(finalState.error.message, "Simulated transient neural compute failure");
      assert.equal(finalState.error.code, "INJECTED_TEST_FAILURE");
      assert.ok(typeof finalState.error.stack === "string");
      assert.ok(typeof finalState.error.timestamp === "string");
      assert.equal(finalState.result, undefined);
    });

    it("does not throw uncontrolled errors to caller during execute()", async () => {
      const { run, snapshot } = createValidShadowFixtures();

      const controller = createShadowExecutionController(run, snapshot, {
        customExecutor: async () => {
          throw new TypeError("Uncaught inner pipeline exception");
        },
      });

      // Must resolve cleanly with terminal state, not unhandled promise rejection
      const finalState = await controller.execute();
      assert.equal(finalState.status, "failed");
      assert.equal(finalState.error?.name, "TypeError");
    });
  });

  // Requirements 12, 13, 14, 15: Cancellation mechanics and terminal state protection
  describe("4. Cancellation & Terminal State Protection", () => {
    it("transitions directly to 'cancelled' if cancelled before execution begins", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      controller.cancel("User cancelled run in queue");

      const stateAfterCancel = controller.getState();
      assert.equal(stateAfterCancel.status, "cancelled");
      assert.equal(stateAfterCancel.cancellationReason, "User cancelled run in queue");

      const finalState = await controller.execute();
      assert.equal(finalState.status, "cancelled");
      assert.equal(finalState.error, undefined);
    });

    it("cancelling an active run produces 'cancelled' (not 'failed')", async () => {
      const { run, snapshot } = createValidShadowFixtures();

      const controller = createShadowExecutionController(run, snapshot, {
        customExecutor: async (_snap, signal) => {
          // Long-running async task that listens to abort
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 500);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              const abortErr = new Error("Operation aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            });
          });
        },
      });

      const execPromise = controller.execute();

      // Trigger cancellation while running
      setTimeout(() => {
        controller.cancel("Explicit user abort");
      }, 10);

      const finalState = await execPromise;

      assert.equal(finalState.status, "cancelled");
      assert.equal(finalState.error, undefined);
      assert.equal(finalState.result, undefined);
    });

    it("cancellation after completion has no destructive effect", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const finalState = await controller.execute();
      assert.equal(finalState.status, "completed");

      // Attempt to cancel an already completed run
      controller.cancel("Stale cancellation attempt");

      const stateAfterCancel = controller.getState();
      assert.equal(stateAfterCancel.status, "completed");
      assert.equal(stateAfterCancel.cancellationReason, undefined);
    });

    it("terminal state cannot return to active 'running' status", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const state1 = await controller.execute();
      assert.equal(state1.status, "completed");

      // Attempt to re-execute completed run
      const state2 = await controller.execute();
      assert.equal(state2.status, "completed");
      assert.equal(state2.completedAt, state1.completedAt);
    });
  });

  // Requirement 16: Timeout affects only the associated Shadow run
  describe("5. Isolated Timeout Handling", () => {
    it("transitions to failed with explicit timeout error when timeoutMs is exceeded", async () => {
      const { run, snapshot } = createValidShadowFixtures();

      const controller = createShadowExecutionController(run, snapshot, {
        timeoutMs: 20, // 20ms timeout
        customExecutor: async () => {
          // Run longer than timeout
          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      });

      const finalState = await controller.execute();

      assert.equal(finalState.status, "failed");
      assert.ok(finalState.error);
      assert.equal(finalState.error.name, "TimeoutError");
      assert.equal(finalState.error.code, "SHADOW_TIMEOUT");
      assert.match(finalState.error.message, /timed out after 20ms/);
    });
  });

  // Requirements 17, 18, 19: Concurrency and mutual independence across multiple runs
  describe("6. Multiple Concurrent Shadow Runs & Mutual Independence", () => {
    it("maintains complete independence between simultaneous Shadow runs", async () => {
      const fixtureA = createValidShadowFixtures("shadow_run_A");
      const fixtureB = createValidShadowFixtures("shadow_run_B");

      const controllerA = createShadowExecutionController(fixtureA.run, fixtureA.snapshot);
      const controllerB = createShadowExecutionController(fixtureB.run, fixtureB.snapshot);

      assert.notEqual(controllerA.getState().runId, controllerB.getState().runId);

      const [stateA, stateB] = await Promise.all([controllerA.execute(), controllerB.execute()]);

      assert.equal(stateA.status, "completed");
      assert.equal(stateA.runId, fixtureA.run.runId);

      assert.equal(stateB.status, "completed");
      assert.equal(stateB.runId, fixtureB.run.runId);
    });

    it("failure of Shadow A does NOT affect Shadow B", async () => {
      const fixtureA = createValidShadowFixtures("shadow_run_fail_A");
      const fixtureB = createValidShadowFixtures("shadow_run_ok_B");

      const controllerA = createShadowExecutionController(fixtureA.run, fixtureA.snapshot, {
        customExecutor: async () => {
          throw new Error("Failure isolated strictly to Run A");
        },
      });

      const controllerB = createShadowExecutionController(fixtureB.run, fixtureB.snapshot);

      const [stateA, stateB] = await Promise.all([controllerA.execute(), controllerB.execute()]);

      assert.equal(stateA.status, "failed");
      assert.equal(stateA.error?.message, "Failure isolated strictly to Run A");

      // Run B must complete normally and remain completely unaffected
      assert.equal(stateB.status, "completed");
      assert.equal(stateB.error, undefined);
      assert.equal(stateB.result?.acknowledged, true);
    });

    it("cancellation of Shadow A does NOT affect Shadow B", async () => {
      const fixtureA = createValidShadowFixtures("shadow_run_cancel_A");
      const fixtureB = createValidShadowFixtures("shadow_run_ok_B");

      const controllerA = createShadowExecutionController(fixtureA.run, fixtureA.snapshot, {
        customExecutor: async (_snap, signal) => {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 300);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              const err = new Error("Aborted");
              err.name = "AbortError";
              reject(err);
            });
          });
        },
      });

      const controllerB = createShadowExecutionController(fixtureB.run, fixtureB.snapshot);

      const promiseA = controllerA.execute();
      const promiseB = controllerB.execute();

      // Cancel only A
      setTimeout(() => {
        controllerA.cancel("Cancel A only");
      }, 10);

      const [stateA, stateB] = await Promise.all([promiseA, promiseB]);

      assert.equal(stateA.status, "cancelled");
      assert.equal(stateB.status, "completed");
    });
  });

  // Requirements 20, 21: Preserving inputs and zero side effects
  describe("7. Immutability & Zero Side Effects", () => {
    it("supplied RunMetadata and InputSnapshot remain strictly unchanged", async () => {
      const { run, snapshot } = createValidShadowFixtures();

      const runBefore = JSON.stringify(run);
      const snapBefore = JSON.stringify(snapshot);

      const controller = createShadowExecutionController(run, snapshot);
      await controller.execute();

      const runAfter = JSON.stringify(run);
      const snapAfter = JSON.stringify(snapshot);

      assert.equal(runBefore, runAfter);
      assert.equal(snapBefore, snapAfter);
    });

    it("operates with zero side effects and conforms to ShadowRunState contract", async () => {
      const { run, snapshot } = createValidShadowFixtures();
      const controller = createShadowExecutionController(run, snapshot);

      const finalState = await controller.execute();

      assert.ok(isShadowRunState(finalState));
      assert.ok(Object.isFrozen(finalState));
    });
  });
});
