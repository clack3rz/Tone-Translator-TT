// src/sound-engineer/execution/streamIdentity.ts
// Platform-independent execution stream identity for Tone Translator Sound Engineer Architecture

/**
 * Authoritative execution streams supported by the Sound Engineer architecture.
 *
 * - `CURRENT`: The protected existing Tone Translator production execution path.
 *   Authoritative for standard user tone generation and preset export.
 *
 * - `SHADOW`: An isolated observation execution path running new Sound Engineer
 *   architecture alongside CURRENT for comparison and validation.
 *   Strictly read-only; has no authority to alter CURRENT results, persistence, or exports.
 *
 * - `DEV`: An explicitly selected development/test execution path used for
 *   isolated Sound Engineer engineering and UAT.
 */
export const EXECUTION_STREAMS = {
  CURRENT: "CURRENT",
  SHADOW: "SHADOW",
  DEV: "DEV",
} as const;

export type ExecutionStream = (typeof EXECUTION_STREAMS)[keyof typeof EXECUTION_STREAMS];

export const VALID_EXECUTION_STREAMS: readonly ExecutionStream[] = Object.freeze([
  EXECUTION_STREAMS.CURRENT,
  EXECUTION_STREAMS.SHADOW,
  EXECUTION_STREAMS.DEV,
]);

/**
 * Type guard to verify whether a given value is a valid ExecutionStream.
 */
export function isExecutionStream(value: unknown): value is ExecutionStream {
  return typeof value === "string" && (VALID_EXECUTION_STREAMS as readonly string[]).includes(value);
}

/**
 * Structural capability descriptor for an execution stream.
 * Defines permissions and authority boundaries without platform-specific dependencies.
 */
export interface ExecutionStreamDescriptor {
  readonly stream: ExecutionStream;
  readonly displayName: string;
  readonly description: string;
  /** Whether this stream has authority to produce final production export presets */
  readonly isAuthoritativeForExport: boolean;
  /** Whether this stream has authority to commit to primary user session persistence */
  readonly isAuthoritativeForPersistence: boolean;
  /** Whether this stream runs in observation/isolated mode */
  readonly isIsolatedObservation: boolean;
}

export const EXECUTION_STREAM_DESCRIPTORS: Readonly<Record<ExecutionStream, ExecutionStreamDescriptor>> = Object.freeze({
  [EXECUTION_STREAMS.CURRENT]: {
    stream: EXECUTION_STREAMS.CURRENT,
    displayName: "Current Production",
    description: "Authoritative production execution path for tone generation and preset export.",
    isAuthoritativeForExport: true,
    isAuthoritativeForPersistence: true,
    isIsolatedObservation: false,
  },
  [EXECUTION_STREAMS.SHADOW]: {
    stream: EXECUTION_STREAMS.SHADOW,
    displayName: "Shadow Observation",
    description: "Isolated parallel observation path for evaluation and UAT without altering production state.",
    isAuthoritativeForExport: false,
    isAuthoritativeForPersistence: false,
    isIsolatedObservation: true,
  },
  [EXECUTION_STREAMS.DEV]: {
    stream: EXECUTION_STREAMS.DEV,
    displayName: "Development Stream",
    description: "Explicitly selected development stream for isolated Sound Engineer testing and tuning.",
    isAuthoritativeForExport: false,
    isAuthoritativeForPersistence: false,
    isIsolatedObservation: true,
  },
});

export function getExecutionStreamDescriptor(stream: ExecutionStream): ExecutionStreamDescriptor {
  return EXECUTION_STREAM_DESCRIPTORS[stream];
}
