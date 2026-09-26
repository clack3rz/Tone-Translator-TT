// src/sound-engineer/checkpoints/checkpointDiagnostic.ts
// Structured generic diagnostic records for Sound Engineer layer checkpoints

import { defensiveClone, deepFreeze } from "../contracts/immutability";

export const DIAGNOSTIC_SEVERITIES = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const;

export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[keyof typeof DIAGNOSTIC_SEVERITIES];

const DIAGNOSTIC_SEVERITY_VALUES = new Set<string>(Object.values(DIAGNOSTIC_SEVERITIES));

/**
 * Type guard for DiagnosticSeverity.
 */
export function isDiagnosticSeverity(value: unknown): value is DiagnosticSeverity {
  return typeof value === "string" && DIAGNOSTIC_SEVERITY_VALUES.has(value);
}

/**
 * Structured diagnostic record emitted during layer checkpointing.
 * Decoupled from DAW formats and platform-specific error structures.
 */
export interface CheckpointDiagnostic {
  /** Severity classification of the diagnostic event */
  readonly severity: DiagnosticSeverity;

  /** Standardized machine-readable error or warning code */
  readonly code: string;

  /** Human-readable explanation of the condition */
  readonly message: string;

  /** Originating subsystem, component, or heuristic rule that generated this diagnostic */
  readonly source: string;

  /** ISO 8601 timestamp (UTC) when the diagnostic was logged */
  readonly timestamp: string;

  /** Optional structured context metadata (JSON-serializable) */
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface CreateCheckpointDiagnosticOptions {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  source: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

/**
 * Factory to create an immutable CheckpointDiagnostic record.
 */
export function createCheckpointDiagnostic(
  options: CreateCheckpointDiagnosticOptions
): CheckpointDiagnostic {
  if (!isDiagnosticSeverity(options.severity)) {
    throw new Error(
      `Invalid diagnostic severity: "${String(options.severity)}". Expected one of: ${Object.values(
        DIAGNOSTIC_SEVERITIES
      ).join(", ")}`
    );
  }

  if (!options.code || typeof options.code !== "string" || options.code.trim().length === 0) {
    throw new Error("CheckpointDiagnostic code must be a non-empty string");
  }

  if (!options.message || typeof options.message !== "string" || options.message.trim().length === 0) {
    throw new Error("CheckpointDiagnostic message must be a non-empty string");
  }

  if (!options.source || typeof options.source !== "string" || options.source.trim().length === 0) {
    throw new Error("CheckpointDiagnostic source must be a non-empty string");
  }

  const timestamp = options.timestamp ?? new Date().toISOString();
  if (isNaN(Date.parse(timestamp))) {
    throw new Error(`Invalid ISO timestamp: "${timestamp}"`);
  }

  const diagnostic: CheckpointDiagnostic = {
    severity: options.severity,
    code: options.code.trim(),
    message: options.message.trim(),
    source: options.source.trim(),
    timestamp,
    ...(options.context ? { context: defensiveClone(options.context) } : {}),
  };

  return deepFreeze(diagnostic);
}

/**
 * Type guard for CheckpointDiagnostic.
 */
export function isCheckpointDiagnostic(value: unknown): value is CheckpointDiagnostic {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    isDiagnosticSeverity(candidate.severity) &&
    typeof candidate.code === "string" &&
    candidate.code.length > 0 &&
    typeof candidate.message === "string" &&
    candidate.message.length > 0 &&
    typeof candidate.source === "string" &&
    candidate.source.length > 0 &&
    typeof candidate.timestamp === "string" &&
    !isNaN(Date.parse(candidate.timestamp)) &&
    (candidate.context === undefined || (typeof candidate.context === "object" && candidate.context !== null))
  );
}
