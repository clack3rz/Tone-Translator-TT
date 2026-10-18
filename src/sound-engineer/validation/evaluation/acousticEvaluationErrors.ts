// src/sound-engineer/validation/evaluation/acousticEvaluationErrors.ts
// Authoritative error definitions for Phase 1C.5h WP-14:
// Multi-Dimensional Acoustic Evaluation & Orthogonal Tolerance Engine.
// Bound to frozen specification v0.1j Section 19, Invariant 2, Invariant 7, and Plan Override v0.1h.

/**
 * Thrown when an unknown or unrecognized gear topology is encountered.
 * CRITICAL BINDING OVERRIDE:
 * Strictly prohibits fallback to "strictest conservative tolerances", nearest-family borrowing,
 * or synthetic threshold invention. Fails closed and preserves the exact missing-governance reason.
 */
export class UnrecognizedTopologyError extends Error {
  constructor(
    public readonly topologyName: string,
    public readonly reason: string
  ) {
    super(
      `Unrecognized gear topology "${topologyName}": ${reason}. Fallback to strictest conservative tolerances or fabricated thresholds is strictly prohibited by governed threshold neutrality.`
    );
    this.name = "UnrecognizedTopologyError";
  }
}

/**
 * Thrown or recorded when no governed tolerance_criteria_spec exists for a dimension or topology.
 */
export class MissingGovernedToleranceError extends Error {
  constructor(
    public readonly dimension: string,
    public readonly specRef: string,
    public readonly reason: string
  ) {
    super(
      `Missing governed tolerance criteria for dimension "${dimension}" (spec ref: "${specRef}"): ${reason}. Universal fallback thresholds are strictly prohibited.`
    );
    this.name = "MissingGovernedToleranceError";
  }
}

/**
 * Thrown when an evidence record fails schema parse or validation.
 */
export class InvalidEvidenceSchemaError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly evidenceKind: string,
    public readonly reason: string
  ) {
    super(
      `Invalid evidence schema for ${evidenceKind} "${evidenceId}": ${reason}`
    );
    this.name = "InvalidEvidenceSchemaError";
  }
}

/**
 * Thrown when evidence cryptographic integrity fails or has mismatched execution references.
 */
export class EvidenceIntegrityError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly reason: string
  ) {
    super(`Evidence integrity violation for "${evidenceId}": ${reason}`);
    this.name = "EvidenceIntegrityError";
  }
}

/**
 * Thrown when evidence belongs to a different validation case or package scope.
 */
export class EvidenceScopeMismatchError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly expectedScope: string,
    public readonly actualScope: string
  ) {
    super(
      `Evidence scope mismatch for "${evidenceId}": expected "${expectedScope}", actual "${actualScope}".`
    );
    this.name = "EvidenceScopeMismatchError";
  }
}

/**
 * Thrown when an attempt is made to collapse orthogonal dimensions into a scalar aggregate score.
 * Enforces Invariant 2: Multi-Dimensional Acoustic Evaluation Invariant (Anti-Scalar Collapse).
 */
export class ScalarCollapseForbiddenError extends Error {
  constructor(public readonly attemptedFormula: string) {
    super(
      `Scalar acoustic collapse forbidden: attempted "${attemptedFormula}". Section 19 and Invariant 2 strictly prohibit scalar averaging, weighted scores, and composite percentages.`
    );
    this.name = "ScalarCollapseForbiddenError";
  }
}
