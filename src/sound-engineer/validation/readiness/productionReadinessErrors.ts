// src/sound-engineer/validation/readiness/productionReadinessErrors.ts
// Domain errors for Phase 1C.5h WP-21: Four-Pillar Production Readiness Assessment Synthesis (Record 20).
// Bound to frozen specification v0.1j Section 25 & Table 13.

export class ProductionReadinessSynthesisError extends Error {
  constructor(message: string) {
    super(`[WP-21 ProductionReadinessSynthesisError] ${message}`);
    this.name = "ProductionReadinessSynthesisError";
  }
}

export class ReadinessContextValidationError extends ProductionReadinessSynthesisError {
  constructor(message: string) {
    super(`Readiness context validation failed: ${message}`);
    this.name = "ReadinessContextValidationError";
  }
}

export class InvalidProductionReadinessRecordError extends ProductionReadinessSynthesisError {
  constructor(message: string) {
    super(`Invalid ProductionReadinessAssessmentRecord payload: ${message}`);
    this.name = "InvalidProductionReadinessRecordError";
  }
}

export class RollbackEvidenceBoundaryError extends ProductionReadinessSynthesisError {
  constructor(message: string) {
    super(`Rollback verification boundary error: ${message}`);
    this.name = "RollbackEvidenceBoundaryError";
  }
}
