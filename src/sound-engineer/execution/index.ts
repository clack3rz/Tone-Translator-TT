// src/sound-engineer/execution/index.ts
// Re-export execution identity infrastructure for Tone Translator Sound Engineer Architecture

export {
  EXECUTION_STREAMS,
  VALID_EXECUTION_STREAMS,
  isExecutionStream,
  getExecutionStreamDescriptor,
  EXECUTION_STREAM_DESCRIPTORS,
  type ExecutionStream,
  type ExecutionStreamDescriptor,
} from "./streamIdentity";

export {
  RUN_LIFECYCLE_STATUSES,
  VALID_RUN_LIFECYCLE_STATUSES,
  isRunLifecycleStatus,
  isTerminalRunStatus,
  type RunLifecycleStatus,
} from "./runLifecycle";

export {
  RUN_METADATA_CONTRACT_VERSION,
  generateRunId,
  createRunMetadata,
  isRunMetadata,
  type RunId,
  type RunMetadata,
  type CreateRunMetadataOptions,
} from "./runIdentity";
