// src/sound-engineer/validation/regression/regressionErrors.ts
// Governed domain error classes for Phase 1C.5h WP-15:
// Tripartite Differential Comparison & Regression Detection Engine.

/**
 * Base error for all differential auditing and regression classification failures.
 */
export class DifferentialAuditingError extends Error {
  constructor(message: string) {
    super(`[DIFFERENTIAL AUDITING ERROR] ${message}`);
    this.name = "DifferentialAuditingError";
  }
}

/**
 * Thrown when Golden Reference benchmark fixture fails governance requirements
 * (inactive lifecycle, contamination, missing integrity ref, or class mismatch).
 */
export class InvalidGoldenReferenceError extends DifferentialAuditingError {
  constructor(public readonly fixtureId: string, message: string) {
    super(`Golden Reference '${fixtureId}' invalid: ${message}`);
    this.name = "InvalidGoldenReferenceError";
  }
}

/**
 * Thrown when PATH-PROD legacy baseline evidence is missing, invalid, or re-synthesized.
 */
export class InvalidPathProdBaselineError extends DifferentialAuditingError {
  constructor(public readonly legacyId: string, message: string) {
    super(`PATH-PROD baseline '${legacyId}' invalid: ${message}`);
    this.name = "InvalidPathProdBaselineError";
  }
}

/**
 * Thrown when candidate evidence is missing, corrupted, or unbound.
 */
export class InvalidCandidateEvidenceError extends DifferentialAuditingError {
  constructor(message: string) {
    super(`Candidate comparison evidence invalid: ${message}`);
    this.name = "InvalidCandidateEvidenceError";
  }
}

/**
 * Thrown when comparison scope exceeds or violates WP-04 declared validation scope boundaries.
 */
export class ScopeMismatchError extends DifferentialAuditingError {
  constructor(message: string) {
    super(`Comparison scope boundary mismatch: ${message}`);
    this.name = "ScopeMismatchError";
  }
}

/**
 * Thrown when version binding mismatch is detected between package and execution.
 */
export class VersionBindingMismatchError extends DifferentialAuditingError {
  constructor(message: string) {
    super(`Version binding mismatch: ${message}`);
    this.name = "VersionBindingMismatchError";
  }
}

/**
 * Thrown when materiality profile reference cannot be resolved or is missing.
 * Prevents synthesis of arbitrary/universal fallback thresholds.
 */
export class MissingMaterialityGovernanceError extends DifferentialAuditingError {
  constructor(public readonly profileRef: string) {
    super(
      `No governed materiality profile found for '${profileRef}'. ` +
        `Universal or synthesized fallback thresholds are strictly prohibited.`
    );
    this.name = "MissingMaterialityGovernanceError";
  }
}

/**
 * Thrown if any attempt is made to shortcut classification by equating
 * candidate != legacy with regression.
 */
export class LegacyDivergenceShortcutForbiddenError extends DifferentialAuditingError {
  constructor(message: string) {
    super(`Forbidden legacy divergence shortcut: ${message}`);
    this.name = "LegacyDivergenceShortcutForbiddenError";
  }
}

/**
 * Thrown if scalar collapse of regression/materiality scores is attempted.
 */
export class RegressionScalarCollapseForbiddenError extends DifferentialAuditingError {
  constructor(message: string) {
    super(`Forbidden scalar collapse in regression detection: ${message}`);
    this.name = "RegressionScalarCollapseForbiddenError";
  }
}
