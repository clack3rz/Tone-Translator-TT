// src/sound-engineer/validation/evidence/measurementErrors.ts
// Error classes for Phase 1C.5h WP-11:
// Objective Acoustic & Signal-Processing Measurement Engine (Record 10).
// Bound to frozen specification v0.1j Section 15 and Implementation Plan v0.1h WP-11.

export class MeasurementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeasurementError";
  }
}

export class NumericalInstabilityError extends MeasurementError {
  constructor(public readonly metricName: string, message: string) {
    super(`Numerical instability detected in metric '${metricName}': ${message}. NaN/Infinity values are strictly prohibited.`);
    this.name = "NumericalInstabilityError";
  }
}

export class IneligibleExecutionError extends MeasurementError {
  constructor(public readonly executionId: string, message: string) {
    super(`Validation execution '${executionId}' is ineligible for objective measurement: ${message}`);
    this.name = "IneligibleExecutionError";
  }
}

export class AudioPayloadMalformedError extends MeasurementError {
  constructor(message: string) {
    super(`Audio payload malformed or unreadable: ${message}`);
    this.name = "AudioPayloadMalformedError";
  }
}

export class MeasurementBudgetExceededError extends MeasurementError {
  constructor(
    public readonly durationMs: number,
    public readonly budgetMs: number,
    public readonly budgetRef: string
  ) {
    super(
      `Objective measurement exceeded operational budget of ${budgetMs}ms (${budgetRef}). Actual duration was ${durationMs}ms.`
    );
    this.name = "MeasurementBudgetExceededError";
  }
}

export class InapplicableAnalysisError extends MeasurementError {
  constructor(public readonly analysisType: string, message: string) {
    super(`Analysis '${analysisType}' is not applicable: ${message}`);
    this.name = "InapplicableAnalysisError";
  }
}
