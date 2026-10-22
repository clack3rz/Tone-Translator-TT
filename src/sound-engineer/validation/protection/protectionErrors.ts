// src/sound-engineer/validation/protection/protectionErrors.ts
// Typed error hierarchy for Phase 1C.5h WP-27:
// Production Protection, PATH-SHADOW Isolation & Rollback Verification.
// Bound to frozen specification v0.1j Section 31 and Build Plan WP-27.

/**
 * Base error class for all production protection and rollback verification failures.
 */
export class ProductionProtectionError extends Error {
  public readonly code: string;

  constructor(message: string, code = "PRODUCTION_PROTECTION_ERROR") {
    super(message);
    this.name = "ProductionProtectionError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an attempted execution violates PATH-SHADOW / test sandbox isolation.
 */
export class IsolationAssertionError extends ProductionProtectionError {
  public readonly stream: string;

  constructor(stream: string, message: string) {
    super(
      `PATH-SHADOW Isolation Violation: stream='${stream}'. ${message}`,
      "ISOLATION_ASSERTION_ERROR"
    );
    this.name = "IsolationAssertionError";
    this.stream = stream;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when inputs supplied to the rollback rehearsal runner are invalid, incomplete, or malformed.
 */
export class InvalidRehearsalInputError extends ProductionProtectionError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(
      `Invalid Rollback Rehearsal Input: field='${field}'. ${message}`,
      "INVALID_REHEARSAL_INPUT_ERROR"
    );
    this.name = "InvalidRehearsalInputError";
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a recovery objective reference cannot be resolved and no governed criteria are available.
 * Fails closed for Gate 8 consideration.
 */
export class RecoveryObjectiveResolutionError extends ProductionProtectionError {
  public readonly recoveryObjectiveRef: string;

  constructor(recoveryObjectiveRef: string, message?: string) {
    super(
      `Failed to resolve recovery objective ref '${recoveryObjectiveRef}'. ${message ?? "Recovery policy must be explicitly governed; zero hardcoded fallback thresholds permitted."}`,
      "RECOVERY_OBJECTIVE_RESOLUTION_ERROR"
    );
    this.name = "RecoveryObjectiveResolutionError";
    this.recoveryObjectiveRef = recoveryObjectiveRef;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the rollback rehearsal adapter encounters an unrecoverable operational or invocation failure.
 */
export class RollbackRehearsalAdapterError extends ProductionProtectionError {
  public readonly adapterName: string;
  public readonly causeError?: Error;

  constructor(adapterName: string, message: string, causeError?: Error) {
    super(
      `Rollback Rehearsal Adapter Failure (${adapterName}): ${message}`,
      "ROLLBACK_REHEARSAL_ADAPTER_ERROR"
    );
    this.name = "RollbackRehearsalAdapterError";
    this.adapterName = adapterName;
    this.causeError = causeError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a RollbackVerificationCertificate fails cryptographic digest verification (tamper detected).
 */
export class RollbackVerificationTamperError extends ProductionProtectionError {
  public readonly certificateId: string;

  constructor(certificateId: string, message?: string) {
    super(
      `Rollback verification certificate tamper detected: certificate_id='${certificateId}'. ${message ?? "Integrity digest does not match computed canonical payload."}`,
      "ROLLBACK_VERIFICATION_TAMPER_ERROR"
    );
    this.name = "RollbackVerificationTamperError";
    this.certificateId = certificateId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

