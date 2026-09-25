// src/sound-engineer/shadow/index.ts
// Re-export isolated Shadow execution lifecycle infrastructure

export {
  SHADOW_RUN_STATE_CONTRACT_VERSION,
  isShadowRunState,
  type ShadowExecutionError,
  type ShadowExecutionResult,
  type ShadowRunState,
} from "./shadowRunState";

export {
  ShadowExecutionController,
  createShadowExecutionController,
  type ShadowControllerOptions,
  type ShadowStateListener,
} from "./shadowExecutionController";

export {
  dispatchShadowRun,
  type ShadowFaultMode,
  type ShadowDispatchInputs,
  type ShadowDispatchResult,
} from "./shadowDispatcher";
