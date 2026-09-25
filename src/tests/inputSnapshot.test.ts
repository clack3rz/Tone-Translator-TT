// src/tests/inputSnapshot.test.ts
// Unit tests for Sound Engineer Phase 1A.2: Immutable Run Input Snapshot

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STREAMS,
  createRunMetadata,
  INPUT_SNAPSHOT_CONTRACT_VERSION,
  INPUT_PROVENANCE_SOURCES,
  createInputSnapshot,
  isInputSnapshot,
  createAudioPayloadDescriptor,
  createImportedPresetDescriptor,
  deepFreeze,
} from "../sound-engineer";

describe("Sound Engineer Phase 1A.2 — Immutable Run Input Snapshot", () => {
  // Requirement 1 & 2: Snapshot receives correct runId and corresponds to stream
  describe("1. Run Association & Stream Identity", () => {
    it("receives the correct runId and stream from active execution run metadata", () => {
      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const snapshot = createInputSnapshot({
        runId: run.runId,
        stream: run.stream,
        userText: "1980s tight thrash metal rhythm",
      });

      assert.equal(snapshot.runId, run.runId);
      assert.equal(snapshot.stream, "CURRENT");
    });

    it("anchors SHADOW and DEV runs to their respective streams", () => {
      const shadowRun = createRunMetadata({ stream: EXECUTION_STREAMS.SHADOW });
      const shadowSnap = createInputSnapshot({
        runId: shadowRun.runId,
        stream: shadowRun.stream,
        userText: "Warm British crunch",
      });
      assert.equal(shadowSnap.stream, "SHADOW");
      assert.equal(shadowSnap.runId, shadowRun.runId);

      const devRun = createRunMetadata({ stream: EXECUTION_STREAMS.DEV });
      const devSnap = createInputSnapshot({
        runId: devRun.runId,
        stream: devRun.stream,
        userText: "Clean jazz chorus",
      });
      assert.equal(devSnap.stream, "DEV");
    });

    it("rejects invalid or missing runId at creation boundary", () => {
      assert.throws(() => {
        createInputSnapshot({
          runId: "" as any,
          stream: EXECUTION_STREAMS.CURRENT,
        });
      }, /Invalid runId/);
    });
  });

  // Requirement 3: Contract version exists
  describe("2. Contract Versioning", () => {
    it("includes explicit snapshot contract version (1.0.0)", () => {
      assert.equal(INPUT_SNAPSHOT_CONTRACT_VERSION, "1.0.0");
      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const snapshot = createInputSnapshot({
        runId: run.runId,
        stream: run.stream,
      });

      assert.equal(snapshot.contractVersion, "1.0.0");
    });
  });

  // Requirement 4: Unique snapshot identity is generated
  describe("3. Snapshot Identity Uniqueness", () => {
    it("generates distinct, unique snapshotId values across creations", () => {
      const run = createRunMetadata({ stream: EXECUTION_STREAMS.CURRENT });
      const snap1 = createInputSnapshot({ runId: run.runId, stream: run.stream });
      const snap2 = createInputSnapshot({ runId: run.runId, stream: run.stream });

      assert.notEqual(snap1.snapshotId, snap2.snapshotId);
      assert.ok(snap1.snapshotId.startsWith("snap_current_"));
    });

    it("allows passing an explicit custom snapshotId when rehydrating checkpoints", () => {
      const customSnapshotId = "custom_snapshot_abc123";
      const snapshot = createInputSnapshot({
        runId: "run_xyz",
        stream: EXECUTION_STREAMS.DEV,
        snapshotId: customSnapshotId,
      });

      assert.equal(snapshot.snapshotId, customSnapshotId);
    });
  });

  // Requirement 5: Supplied text is represented exactly
  describe("4. Exact Representation of Supplied Inputs", () => {
    it("faithfully preserves user text prompt without modification", () => {
      const verbatimPrompt = "1970s Malcolm Young Jailbreak rhythm tone with vintage crunch and no delay";
      const snapshot = createInputSnapshot({
        runId: "run_01",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: verbatimPrompt,
      });

      assert.equal(snapshot.inputs.userText, verbatimPrompt);
      assert.equal(snapshot.provenance.userText.source, INPUT_PROVENANCE_SOURCES.USER_SUPPLIED);
    });

    it("faithfully preserves YouTube URL and operational options", () => {
      const yt = "https://www.youtube.com/watch?v=example123";
      const snapshot = createInputSnapshot({
        runId: "run_02",
        stream: EXECUTION_STREAMS.CURRENT,
        youtubeUrl: yt,
        generationOptions: { useValidationRecipes: true, strictGainMode: true },
      });

      assert.equal(snapshot.inputs.youtubeUrl, yt);
      assert.equal(snapshot.inputs.generationOptions.useValidationRecipes, true);
      assert.equal((snapshot.inputs.generationOptions as any).strictGainMode, true);
    });
  });

  // Requirement 6: Absent optional inputs remain explicitly distinguishable
  describe("5. Absent vs. Present Input Distinguishability", () => {
    it("explicitly marks absent optional inputs as not_supplied in provenance", () => {
      const snapshot = createInputSnapshot({
        runId: "run_sparse",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: "Simple prompt only",
      });

      assert.equal(snapshot.inputs.userText, "Simple prompt only");
      assert.equal(snapshot.inputs.youtubeUrl, undefined);
      assert.equal(snapshot.inputs.targetAudio, undefined);
      assert.equal(snapshot.inputs.recordingAudio, undefined);
      assert.equal(snapshot.inputs.importedPreset, undefined);

      assert.equal(snapshot.provenance.userText.source, "user_supplied");
      assert.equal(snapshot.provenance.youtubeUrl.source, "not_supplied");
      assert.equal(snapshot.provenance.targetAudio.source, "not_supplied");
      assert.equal(snapshot.provenance.recordingAudio.source, "not_supplied");
      assert.equal(snapshot.provenance.importedPreset.source, "not_supplied");
    });
  });

  // Requirement 7: Provenance is preserved and explicit
  describe("6. Provenance Preservation", () => {
    it("allows explicit provenance overrides (e.g. restored session, application default)", () => {
      const snapshot = createInputSnapshot({
        runId: "run_restored",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: "Restored prompt from sessionStorage",
        provenanceOverrides: {
          userText: {
            source: INPUT_PROVENANCE_SOURCES.RESTORED_SESSION,
            description: "Restored from working session revision 2",
          },
        },
      });

      assert.equal(snapshot.provenance.userText.source, "restored_session");
      assert.equal(snapshot.provenance.userText.description, "Restored from working session revision 2");
    });
  });

  // Requirement 8: Source-object mutation after creation does not change snapshot
  describe("7. Defensive Copying Against Source Mutation", () => {
    it("is immune to caller mutations of the source generationOptions object after creation", () => {
      const mutableOptions = {
        useValidationRecipes: false,
        flagA: "original",
      };

      const snapshot = createInputSnapshot({
        runId: "run_clone_test",
        stream: EXECUTION_STREAMS.CURRENT,
        generationOptions: mutableOptions,
      });

      assert.equal(snapshot.inputs.generationOptions.useValidationRecipes, false);
      assert.equal((snapshot.inputs.generationOptions as any).flagA, "original");

      // Mutate the caller's original object
      mutableOptions.useValidationRecipes = true;
      (mutableOptions as any).flagA = "MUTATED_BY_CALLER";
      (mutableOptions as any).newFlag = "SHOULD_NOT_EXIST";

      // Snapshot MUST remain unchanged
      assert.equal(snapshot.inputs.generationOptions.useValidationRecipes, false);
      assert.equal((snapshot.inputs.generationOptions as any).flagA, "original");
      assert.equal((snapshot.inputs.generationOptions as any).newFlag, undefined);
    });
  });

  // Requirement 9: Nested consumer mutation cannot alter the snapshot
  describe("8. Runtime Immutability via Deep Freeze", () => {
    it("prevents consumers from modifying nested snapshot properties at runtime", () => {
      const snapshot = createInputSnapshot({
        runId: "run_freeze_test",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: "Frozen text",
        generationOptions: { useValidationRecipes: true },
      });

      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.inputs));
      assert.ok(Object.isFrozen(snapshot.inputs.generationOptions));
      assert.ok(Object.isFrozen(snapshot.provenance));
      assert.ok(Object.isFrozen(snapshot.provenance.userText));

      // Attempting to mutate in strict mode must throw
      assert.throws(() => {
        (snapshot as any).runId = "mutated_run_id";
      }, TypeError);

      assert.throws(() => {
        (snapshot.inputs as any).userText = "mutated_text";
      }, TypeError);

      assert.throws(() => {
        (snapshot.inputs.generationOptions as any).useValidationRecipes = false;
      }, TypeError);

      assert.throws(() => {
        (snapshot.provenance.userText as any).source = "application_default";
      }, TypeError);
    });
  });

  // Requirement 10: Audio descriptors do not unnecessarily duplicate large payload data
  describe("9. Large Payload Handling (Audio & Preset Descriptors)", () => {
    it("references audio payload data without duplicative string cloning", () => {
      // Simulate a 1MB base64 string
      const largeBase64String = "A".repeat(1024 * 1024);

      const audioDescriptor = createAudioPayloadDescriptor({
        fileName: "heavy_riff.wav",
        mimeType: "audio/wav",
        sourceType: "base64",
        payloadHandle: {
          base64: largeBase64String,
        },
      });

      assert.ok(audioDescriptor.payloadId.startsWith("audio_payload_"));
      assert.equal(audioDescriptor.fileName, "heavy_riff.wav");
      assert.equal(audioDescriptor.mimeType, "audio/wav");
      assert.equal(audioDescriptor.payloadHandle?.base64, largeBase64String);

      const snapshot = createInputSnapshot({
        runId: "run_audio",
        stream: EXECUTION_STREAMS.CURRENT,
        targetAudio: audioDescriptor,
      });

      // Descriptor metadata is deeply frozen and accessible
      assert.equal(snapshot.inputs.targetAudio?.payloadId, audioDescriptor.payloadId);
      assert.equal(snapshot.inputs.targetAudio?.fileName, "heavy_riff.wav");

      // Verify that the payload reference points to the exact same string instance (no memory duplication)
      assert.equal(snapshot.inputs.targetAudio?.payloadHandle?.base64, largeBase64String);
      assert.ok(Object.isFrozen(snapshot.inputs.targetAudio));
    });

    it("represents imported preset context as an opaque descriptor", () => {
      const presetDescriptor = createImportedPresetDescriptor({
        fileName: "MasterLead.at5p",
        rawContent: "<AmpliTubePreset version='5.0'></AmpliTubePreset>",
      });

      assert.equal(presetDescriptor.format, "at5p");
      assert.equal(presetDescriptor.fileName, "MasterLead.at5p");

      const snapshot = createInputSnapshot({
        runId: "run_preset",
        stream: EXECUTION_STREAMS.CURRENT,
        importedPreset: presetDescriptor,
      });

      assert.equal(snapshot.inputs.importedPreset?.fileName, "MasterLead.at5p");
      assert.equal(snapshot.provenance.importedPreset.source, "user_supplied");
    });
  });

  // Requirement 11: Creating a snapshot has no external side effects
  describe("10. Side Effect Freedom", () => {
    it("creates snapshots purely in-memory with zero external state changes", () => {
      const snapshot = createInputSnapshot({
        runId: "run_side_effect_free",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: "Testing pure determinism",
      });

      assert.ok(isInputSnapshot(snapshot));
      assert.ok(typeof snapshot.snapshotId === "string");
      assert.ok(typeof snapshot.createdAt === "string");
    });
  });

  // Requirement 12: Contract remains platform-independent
  describe("11. Platform Independence", () => {
    it("contains no AT5 XML, parameter maps, GUIDs, or VIR coordinate properties", () => {
      const snapshot = createInputSnapshot({
        runId: "run_platform_indep",
        stream: EXECUTION_STREAMS.CURRENT,
        userText: "Marshall tone",
      });

      const keys = Object.keys(snapshot);
      assert.deepEqual(keys.sort(), [
        "contractVersion",
        "createdAt",
        "inputs",
        "provenance",
        "runId",
        "snapshotId",
        "stream",
      ].sort());

      const inputKeys = Object.keys(snapshot.inputs);
      assert.ok(!inputKeys.includes("cabGuid"));
      assert.ok(!inputKeys.includes("xmlValues"));
      assert.ok(!inputKeys.includes("virCoordinates"));
      assert.ok(!inputKeys.includes("at5Parameters"));
    });
  });
});
