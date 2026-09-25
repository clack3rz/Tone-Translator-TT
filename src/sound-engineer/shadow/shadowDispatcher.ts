// src/sound-engineer/shadow/shadowDispatcher.ts
// Controlled Shadow execution dispatcher for Tone Translator Sound Engineer Architecture

import {
  EXECUTION_STREAMS,
  createRunMetadata,
  RunMetadata,
} from "../execution";
import {
  createInputSnapshot,
  InputSnapshot,
  createAudioPayloadDescriptor,
  createImportedPresetDescriptor,
  AudioPayloadDescriptor,
  ImportedPresetDescriptor,
} from "../contracts";
import {
  ShadowExecutionController,
  createShadowExecutionController,
  ShadowControllerOptions,
} from "./shadowExecutionController";
import { ShadowRunState } from "./shadowRunState";

/**
 * Supported fault injection modes for Shadow UAT testing.
 * Affects ONLY the isolated Shadow execution, never CURRENT production.
 */
export type ShadowFaultMode = "normal" | "fail" | "timeout";

export interface ShadowDispatchInputs {
  /** User text description or musical prompt */
  userText?: string;
  /** Optional YouTube reference URL */
  youtubeUrl?: string;
  /** Reference/target audio file */
  targetAudioFile?: { name: string; type: string; size?: number } | null;
  /** Current/user recording audio file */
  recordingAudioFile?: { name: string; type: string; size?: number } | null;
  /** Imported preset data if available */
  userPreset?: { name?: string; rawContent?: string } | null;
  /** Operational validation recipe mode flag */
  useValidationRecipes?: boolean;
  /** UAT fault injection mode (defaults to 'normal') */
  faultMode?: ShadowFaultMode;
}

export interface ShadowDispatchResult {
  readonly controller: ShadowExecutionController;
  readonly runMetadata: RunMetadata;
  readonly inputSnapshot: InputSnapshot;
  readonly cancel: (reason?: string) => void;
}

/**
 * Dispatches an isolated SHADOW execution run asynchronously in the background.
 *
 * Guarantees:
 * 1. Non-blocking: returns immediately without awaiting Shadow completion.
 * 2. Complete isolation: receives no production services or write permissions.
 * 3. Exact input capture: maps supplied inputs into an immutable InputSnapshot.
 * 4. Fault injection: supports Normal, Fail, and Timeout without affecting CURRENT.
 */
export function dispatchShadowRun(
  inputs: ShadowDispatchInputs,
  onStateChange?: (state: ShadowRunState) => void
): ShadowDispatchResult {
  // 1. Create independent SHADOW RunMetadata
  const runMetadata = createRunMetadata({
    stream: EXECUTION_STREAMS.SHADOW,
    tags: {
      dispatchSource: "shadow_application_dispatcher",
      faultMode: inputs.faultMode || "normal",
    },
  });

  // 2. Map available inputs into platform-independent descriptors
  let targetAudio: AudioPayloadDescriptor | undefined = undefined;
  if (inputs.targetAudioFile) {
    targetAudio = createAudioPayloadDescriptor({
      fileName: inputs.targetAudioFile.name,
      mimeType: inputs.targetAudioFile.type || "audio/wav",
      byteLength: inputs.targetAudioFile.size,
      sourceType: "file",
    });
  }

  let recordingAudio: AudioPayloadDescriptor | undefined = undefined;
  if (inputs.recordingAudioFile) {
    recordingAudio = createAudioPayloadDescriptor({
      fileName: inputs.recordingAudioFile.name,
      mimeType: inputs.recordingAudioFile.type || "audio/wav",
      byteLength: inputs.recordingAudioFile.size,
      sourceType: "file",
    });
  }

  let importedPreset: ImportedPresetDescriptor | undefined = undefined;
  if (inputs.userPreset) {
    importedPreset = createImportedPresetDescriptor({
      fileName: inputs.userPreset.name || "imported_preset.at5p",
      format: "at5p",
      rawContent: inputs.userPreset.rawContent,
    });
  }

  // 3. Create immutable InputSnapshot anchored to this run
  const inputSnapshot = createInputSnapshot({
    runId: runMetadata.runId,
    stream: EXECUTION_STREAMS.SHADOW,
    userText: inputs.userText,
    youtubeUrl: inputs.youtubeUrl,
    targetAudio,
    recordingAudio,
    importedPreset,
    generationOptions: {
      useValidationRecipes: Boolean(inputs.useValidationRecipes),
    },
  });

  // 4. Configure controller options based on UAT fault injection mode
  const controllerOptions: ShadowControllerOptions = {};
  const faultMode = inputs.faultMode || "normal";

  if (faultMode === "fail") {
    controllerOptions.customExecutor = async () => {
      // Small simulated delay before failing to verify lifecycle 'running' state
      await new Promise((resolve) => setTimeout(resolve, 30));
      const simulatedError = new Error("Simulated Shadow UAT Executor Failure [Fault Mode: fail]");
      (simulatedError as any).code = "UAT_FAULT_INJECTION_FAIL";
      throw simulatedError;
    };
  } else if (faultMode === "timeout") {
    controllerOptions.timeoutMs = 40; // Strict isolated timeout
    controllerOptions.customExecutor = async () => {
      // Delay longer than timeoutMs to trigger controller timeout logic
      await new Promise((resolve) => setTimeout(resolve, 200));
    };
  }

  // 5. Instantiate controller
  const controller = createShadowExecutionController(
    runMetadata,
    inputSnapshot,
    controllerOptions
  );

  // 6. Subscribe listener for state transitions
  if (onStateChange) {
    // Immediate callback with initial 'created' state
    onStateChange(controller.getState());
    controller.subscribe(onStateChange);
  }

  // 7. Non-blocking asynchronous dispatch (Fire-and-forget; never blocks caller)
  queueMicrotask(() => {
    controller.execute().catch((err) => {
      // Controller.execute() captures all errors into state, but guard against unforeseen rejections
      console.error("Uncaught error during Shadow execution:", err);
    });
  });

  return {
    controller,
    runMetadata,
    inputSnapshot,
    cancel: (reason?: string) => controller.cancel(reason),
  };
}
