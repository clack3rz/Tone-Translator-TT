// src/sound-engineer/validation/evidence/uatErrors.ts
// Authoritative error definitions for Phase 1C.5h WP-13:
// User Acceptance Testing (UAT) Multi-Persona Workflow Engine (Record 12).
// Bound to frozen specification v0.1j Section 17, Section 33, and Implementation Plan v0.1h WP-13.

/**
 * Thrown when a ValidationPackage is missing, malformed, or fails strict schema validation.
 */
export class IneligibleUATPackageError extends Error {
  constructor(
    public readonly packageId: string,
    public readonly reason: string
  ) {
    super(`Ineligible ValidationPackage "${packageId}" for UAT evaluation: ${reason}`);
    this.name = "IneligibleUATPackageError";
  }
}

/**
 * Thrown when neither PROFILE-14 nor PROFILE-07 (or the scenario-required UAT profile)
 * is assigned or applicable to the package/subject.
 */
export class InapplicableUATProfileError extends Error {
  constructor(
    public readonly packageId: string,
    public readonly attemptedProfile: string,
    public readonly reason: string
  ) {
    super(
      `Inapplicable UAT profile "${attemptedProfile}" for package "${packageId}": ${reason}`
    );
    this.name = "InapplicableUATProfileError";
  }
}

/**
 * Thrown when an evaluator persona is not one of the four canonical enums:
 * RECORDING_ENGINEER, SESSION_GUITARIST, PRODUCER, PLATFORM_ARCHITECT.
 */
export class InvalidEvaluatorPersonaError extends Error {
  constructor(
    public readonly attemptedPersona: string,
    public readonly allowedPersonas: ReadonlyArray<string>
  ) {
    super(
      `Invalid evaluator persona "${attemptedPersona}". Canonical personas are: [${allowedPersonas.join(", ")}]. Illustrative sub-types cannot replace canonical personas.`
    );
    this.name = "InvalidEvaluatorPersonaError";
  }
}

/**
 * Thrown when task completion status is not one of:
 * COMPLETED_SUCCESSFULLY, COMPLETED_WITH_FRICTION, FAILED.
 */
export class InvalidTaskCompletionStatusError extends Error {
  constructor(
    public readonly attemptedStatus: string,
    public readonly allowedStatuses: ReadonlyArray<string>
  ) {
    super(
      `Invalid task completion status "${attemptedStatus}". Canonical statuses are: [${allowedStatuses.join(", ")}].`
    );
    this.name = "InvalidTaskCompletionStatusError";
  }
}

/**
 * Thrown when musical fitness verdict is not one of:
 * ACCEPTED, REJECTED, CONDITIONALLY_ACCEPTED.
 */
export class InvalidMusicalFitnessVerdictError extends Error {
  constructor(
    public readonly attemptedVerdict: string,
    public readonly allowedVerdicts: ReadonlyArray<string>
  ) {
    super(
      `Invalid musical fitness verdict "${attemptedVerdict}". Canonical verdicts are: [${allowedVerdicts.join(", ")}]. Record 12 musical fitness must not be confused with Record 17 outcome classes.`
    );
    this.name = "InvalidMusicalFitnessVerdictError";
  }
}

/**
 * Thrown when task duration is negative, NaN, non-finite, or otherwise invalid.
 */
export class InvalidTaskDurationError extends Error {
  constructor(
    public readonly attemptedDuration: unknown,
    public readonly reason: string
  ) {
    super(`Invalid task duration "${String(attemptedDuration)}": ${reason}`);
    this.name = "InvalidTaskDurationError";
  }
}

/**
 * Thrown when a required UAT metric profile is missing or unresolved.
 * Enforces Anti-Universal-Rating discipline (no universal 1-5 or default scorecards).
 */
export class MissingUATMetricProfileError extends Error {
  constructor(
    public readonly profileRef: string,
    public readonly reason: string
  ) {
    super(
      `Missing or invalid UAT metric profile reference "${profileRef}": ${reason}. Universal rating fallback is strictly prohibited.`
    );
    this.name = "MissingUATMetricProfileError";
  }
}

/**
 * Thrown when a workflow satisfaction rating violates the governing metric profile rules.
 */
export class InvalidSatisfactionRatingError extends Error {
  constructor(
    public readonly profileRef: string,
    public readonly attemptedRating: number,
    public readonly reason: string
  ) {
    super(
      `Invalid workflow satisfaction rating "${attemptedRating}" for profile "${profileRef}": ${reason}`
    );
    this.name = "InvalidSatisfactionRatingError";
  }
}

/**
 * Thrown when task scenario metadata is malformed, missing, or outside package scope.
 */
export class InvalidTaskScenarioError extends Error {
  constructor(
    public readonly scenarioId: string,
    public readonly reason: string
  ) {
    super(`Invalid task scenario "${scenarioId}": ${reason}`);
    this.name = "InvalidTaskScenarioError";
  }
}

/**
 * Thrown when required persona evaluations are omitted for a user-facing workflow.
 */
export class IncompletePersonaCoverageError extends Error {
  constructor(
    public readonly packageId: string,
    public readonly missingPersonas: ReadonlyArray<string>
  ) {
    super(
      `Incomplete canonical persona coverage for package "${packageId}". Missing required personas: [${missingPersonas.join(", ")}]. Evaluations must not be fabricated.`
    );
    this.name = "IncompletePersonaCoverageError";
  }
}
