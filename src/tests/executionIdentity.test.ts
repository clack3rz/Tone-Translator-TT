// src/tests/executionIdentity.test.ts
// Unit tests for Sound Engineer Phase 1A.1: Execution Stream & Run Identity Foundation

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STREAMS,
  VALID_EXECUTION_STREAMS,
  isExecutionStream,
  getExecutionStreamDescriptor,
  RUN_LIFECYCLE_STATUSES,
  VALID_RUN_LIFECYCLE_STATUSES,
  isRunLifecycleStatus,
  isTerminalRunStatus,
  RUN_METADATA_CONTRACT_VERSION,
  generateRunId,
  createRunMetadata,
  isRunMetadata,
} from "../sound-engineer";

describe("Sound Engineer Phase 1A.1 — Execution Stream & Run Identity Foundation", () => {
  // Requirement 1: CURRENT, SHADOW, and DEV are valid distinct stream identities
  describe("1. Execution Stream Identity", () => {
    it("defines CURRENT, SHADOW, and DEV as distinct, immutable stream identities", () => {
      assert.equal(EXECUTION_STREAMS.CURRENT, "CURRENT");
      assert.equal(EXECUTION_STREAMS.SHADOW, "SHADOW");
      assert.equal(EXECUTION_STREAMS.DEV, "DEV");

      // Verify all three are distinct
      const uniqueStreams = new Set(VALID_EXECUTION_STREAMS);
      assert.equal(uniqueStreams.size, 3);
      assert.ok(uniqueStreams.has("CURRENT"));
      assert.ok(uniqueStreams.has("SHADOW"));
      assert.ok(uniqueStreams.has("DEV"));
    });

    it("correctly identifies valid and invalid stream values using type guard", () => {
      assert.equal(isExecutionStream("CURRENT"), true);
      assert.equal(isExecutionStream("SHADOW"), true);
      assert.equal(isExecutionStream("DEV"), true);

      assert.equal(isExecutionStream("PRODUCTION"), false);
      assert.equal(isExecutionStream("STAGING"), false);
      assert.equal(isExecutionStream("current"), false);
      assert.equal(isExecutionStream(""), false);
      assert.equal(isExecutionStream(null), false);
      assert.equal(isExecutionStream(undefined), false);
      assert.equal(isExecutionStream(123), false);
    });

    it("exposes platform-independent stream descriptors with appropriate authority bounds", () => {
      const currentDesc = getExecutionStreamDescriptor("CURRENT");
      assert.equal(currentDesc.stream, "CURRENT");
      assert.equal(currentDesc.isAuthoritativeForExport, true);
      assert.equal(currentDesc.isAuthoritativeForPersistence, true);
      assert.equal(currentDesc.isIsolatedObservation, false);

      const shadowDesc = getExecutionStreamDescriptor("SHADOW");
      assert.equal(shadowDesc.stream, "SHADOW");
      assert.equal(shadowDesc.isAuthoritativeForExport, false);
      assert.equal(shadowDesc.isAuthoritativeForPersistence, false);
      assert.equal(shadowDesc.isIsolatedObservation, true);

      const devDesc = getExecutionStreamDescriptor("DEV");
      assert.equal(devDesc.stream, "DEV");
      assert.equal(devDesc.isAuthoritativeForExport, false);
      assert.equal(devDesc.isAuthoritativeForPersistence, false);
      assert.equal(devDesc.isIsolatedObservation, true);
    });
  });

  // Requirement 2: Two created runs receive different runId values
  describe("2. Run Identity & Uniqueness", () => {
    it("generates unique runId values for different runs", () => {
      const runId1 = generateRunId(EXECUTION_STREAMS.CURRENT);
      const runId2 = generateRunId(EXECUTION_STREAMS.CURRENT);
      const runId3 = generateRunId(EXECUTION_STREAMS.SHADOW);

      assert.notEqual(runId1, runId2);
      assert.notEqual(runId1, runId3);
      assert.notEqual(runId2, runId3);

      assert.ok(runId1.startsWith("current_run_"));
      assert.ok(runId3.startsWith("shadow_run_"));
    });

    it("creates run metadata with unique runIds across successive creations", () => {
      const runA = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const runB = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });

      assert.notEqual(runA.runId, runB.runId);
      assert.ok(typeof runA.runId === "string" && runA.runId.length > 0);
      assert.ok(typeof runB.runId === "string" && runB.runId.length > 0);
    });

    it("allows passing an explicit runId when needed", () => {
      const customId = "custom_test_run_12345";
      const run = createRunMetadata({
        stream: EXECUTION_STREAMS.DEV,
        runId: customId,
      });

      assert.equal(run.runId, customId);
    });
  });

  // Requirement 3: A run records its correct stream
  describe("3. Stream Recording & Attribution", () => {
    it("records the correct stream for CURRENT, SHADOW, and DEV runs", () => {
      const currentRun = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      assert.equal(currentRun.stream, "CURRENT");

      const shadowRun = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      assert.equal(shadowRun.stream, "SHADOW");

      const devRun = createRunMetadata({ stream: EXECUTION_STREAMS.DEV });
      assert.equal(devRun.stream, "DEV");
    });

    it("rejects invalid stream arguments at creation boundary", () => {
      assert.throws(() => {
        createRunMetadata({ stream: "INVALID_STREAM" as any });
      }, /Invalid execution stream/);
    });
  });

  // Requirement 4: Creation timestamp is populated
  describe("4. Timestamp Population", () => {
    it("populates a valid ISO 8601 creation timestamp", () => {
      const before = Date.now();
      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const after = Date.now();

      assert.ok(typeof run.createdAt === "string");
      const parsedTime = Date.parse(run.createdAt);
      assert.ok(!isNaN(parsedTime));

      // Must be bounded within the test execution window
      assert.ok(parsedTime >= before - 1000 && parsedTime <= after + 1000);
    });

    it("allows passing a custom valid timestamp if reconstructing historical metadata", () => {
      const customTimestamp = "2026-09-25T12:00:00.000Z";
      const run = createRunMetadata({
        stream: EXECUTION_STREAMS.SHADOW,
        createdAt: customTimestamp,
      });

      assert.equal(run.createdAt, customTimestamp);
    });
  });

  // Requirement 5: Contract version is present
  describe("5. Contract Versioning", () => {
    it("includes the explicit semantic contract version on every run metadata instance", () => {
      assert.equal(RUN_METADATA_CONTRACT_VERSION, "1.0.0");

      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      assert.equal(run.contractVersion, RUN_METADATA_CONTRACT_VERSION);
    });
  });

  // Requirement 6: Lifecycle status uses the defined typed vocabulary
  describe("6. Lifecycle Vocabulary", () => {
    it("defines the standard typed lifecycle vocabulary", () => {
      assert.equal(RUN_LIFECYCLE_STATUSES.CREATED, "created");
      assert.equal(RUN_LIFECYCLE_STATUSES.RUNNING, "running");
      assert.equal(RUN_LIFECYCLE_STATUSES.COMPLETED, "completed");
      assert.equal(RUN_LIFECYCLE_STATUSES.FAILED, "failed");
      assert.equal(RUN_LIFECYCLE_STATUSES.CANCELLED, "cancelled");

      const expectedStatuses = ["created", "running", "completed", "failed", "cancelled"];
      assert.deepEqual(Array.from(VALID_RUN_LIFECYCLE_STATUSES), expectedStatuses);
    });

    it("defaults initial run lifecycle status to 'created'", () => {
      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      assert.equal(run.status, "created");
    });

    it("accepts explicitly passed valid lifecycle statuses", () => {
      const runningRun = createRunMetadata({
        stream: EXECUTION_STREAMS.SHADOW,
        status: "running",
      });
      assert.equal(runningRun.status, "running");

      const completedRun = createRunMetadata({
        stream: EXECUTION_STREAMS.DEV,
        status: "completed",
      });
      assert.equal(completedRun.status, "completed");
    });

    it("rejects invalid lifecycle statuses at creation boundary", () => {
      assert.throws(() => {
        createRunMetadata({
          stream: EXECUTION_STREAMS.CURRENT,
          status: "pending_approval" as any,
        });
      }, /Invalid run lifecycle status/);
    });

    it("correctly identifies terminal states using isTerminalRunStatus helper", () => {
      assert.equal(isTerminalRunStatus("created"), false);
      assert.equal(isTerminalRunStatus("running"), false);
      assert.equal(isTerminalRunStatus("completed"), true);
      assert.equal(isTerminalRunStatus("failed"), true);
      assert.equal(isTerminalRunStatus("cancelled"), true);
    });

    it("validates run metadata using isRunMetadata type guard", () => {
      const validRun = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      assert.equal(isRunMetadata(validRun), true);

      assert.equal(isRunMetadata(null), false);
      assert.equal(isRunMetadata({}), false);
      assert.equal(isRunMetadata({ runId: "123", stream: "INVALID" }), false);
      assert.equal(
        isRunMetadata({
          contractVersion: "1.0.0",
          runId: "run_123",
          stream: "CURRENT",
          createdAt: "not-a-date",
          status: "created",
        }),
        false
      );
    });
  });

  // Non-breaking extensibility: parentRunId and tags
  describe("7. Extensibility & Non-Breaking Metadata Support", () => {
    it("supports optional parentRunId for correlated shadow or dev runs", () => {
      const parentRun = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const shadowRun = createRunMetadata({
        stream: EXECUTION_STREAMS.SHADOW,
        parentRunId: parentRun.runId,
        tags: { trigger: "user_translate", session: "sess_456" },
      });

      assert.equal(shadowRun.stream, "SHADOW");
      assert.equal(shadowRun.parentRunId, parentRun.runId);
      assert.equal(shadowRun.tags?.trigger, "user_translate");
      assert.equal(shadowRun.tags?.session, "sess_456");
      assert.equal(isRunMetadata(shadowRun), true);
    });
  });
});
