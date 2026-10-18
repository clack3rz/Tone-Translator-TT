// src/sound-engineer/validation/evidence/perceptualErrors.ts
// Governed typed error classes for Phase 1C.5h WP-12:
// Perceptual Evaluation, Blind Listening & Psychoacoustic Harness (Record 11).
// Bound to frozen specification v0.1j Section 16 and Implementation Plan v0.1h WP-12.

/**
 * Thrown when an input execution record fails schema validation, has non-completed outcome,
 * or lacks bit-level matching audio artifacts.
 */
export class IneligiblePerceptualExecutionError extends Error {
  constructor(public readonly executionId: string, public readonly reason: string) {
    super(`Execution "${executionId}" is ineligible for perceptual evaluation: ${reason}`);
    this.name = "IneligiblePerceptualExecutionError";
  }
}

/**
 * Thrown when a validation case does not require perceptual or mixed evidence classes.
 */
export class InapplicablePerceptualCaseError extends Error {
  constructor(public readonly caseId: string, public readonly reason: string) {
    super(`Validation case "${caseId}" cannot receive perceptual evidence: ${reason}`);
    this.name = "InapplicablePerceptualCaseError";
  }
}

/**
 * Thrown when an unapproved evaluator role is presented.
 */
export class InvalidEvaluatorRoleError extends Error {
  constructor(public readonly attemptedRole: string) {
    super(
      `Invalid perceptual evaluator role: "${attemptedRole}". Must be one of MASTER_ENGINEER, SESSION_GUITARIST, PRODUCER, PLATFORM_SPECIALIST.`
    );
    this.name = "InvalidEvaluatorRoleError";
  }
}

/**
 * Thrown when a listening environment violates canonical environment schemas or misses SPL calibration.
 */
export class InvalidListeningEnvironmentError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid listening environment: ${reason}`);
    this.name = "InvalidListeningEnvironmentError";
  }
}

/**
 * Thrown when blinded presentation leaks candidate, baseline, or anchor identity.
 */
export class BlindedStimulusLeakError extends Error {
  constructor(public readonly leakedIdentifier: string, public readonly location: string) {
    super(`Blinded stimulus identity leakage detected at "${location}": exposed "${leakedIdentifier}".`);
    this.name = "BlindedStimulusLeakError";
  }
}

/**
 * Thrown when a perceptual listening session is invalidated due to hidden anchor check failure or fatigue.
 */
export class SessionInvalidatedError extends Error {
  constructor(public readonly sessionId: string, public readonly reason: string) {
    super(`Perceptual session "${sessionId}" is invalidated: ${reason}`);
    this.name = "SessionInvalidatedError";
  }
}

/**
 * Thrown when required methodology profile or rating scale governance is missing.
 */
export class MissingPerceptualGovernanceError extends Error {
  constructor(public readonly profileRef: string, public readonly reason: string) {
    super(`Missing required perceptual governance profile "${profileRef}": ${reason}`);
    this.name = "MissingPerceptualGovernanceError";
  }
}

/**
 * Thrown when audio payload integrity does not match the declared reference.
 */
export class StimulusIntegrityMismatchError extends Error {
  constructor(public readonly stimulusId: string, public readonly computed: string, public readonly expected: string) {
    super(
      `Stimulus "${stimulusId}" integrity mismatch: computed "${computed}" does not match expected "${expected}".`
    );
    this.name = "StimulusIntegrityMismatchError";
  }
}
