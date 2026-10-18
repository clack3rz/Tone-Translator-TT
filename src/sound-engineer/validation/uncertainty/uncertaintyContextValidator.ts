// src/sound-engineer/validation/uncertainty/uncertaintyContextValidator.ts
// Phase 1C.5h WP-18: Uncertainty Context Coherence & Scope Containment Validator.
// Enforces WP-04 scope containment, package context binding, and WP-16/WP-17 coherence.

import { FAILURE_ATTRIBUTION_CLASSES, UNCERTAINTY_GATE_8_IMPACTS } from "../schemas/enums";
import {
  evidenceConflictRecordSchema,
  validationFailureRecordSchema,
  validationPackageSchema,
  validationScopeRecordSchema,
} from "../schemas/records";
import {
  IncompatibleUncertaintyContextError,
  InvalidUncertaintyRecordError,
  ScopeContainmentViolationError,
} from "./uncertaintyErrors";
import { RecordUncertaintyInput } from "./uncertaintyTypes";

export class UncertaintyContextValidator {
  /**
   * Validates comprehensive context coherence for an uncertainty recording input.
   */
  public static validate(input: RecordUncertaintyInput): void {
    // 1. Basic packageId validation
    if (!input.packageId || typeof input.packageId !== "string" || input.packageId.trim() === "") {
      throw new IncompatibleUncertaintyContextError("package_id must be a non-empty string.");
    }

    // 2. Affected scope basic validation
    if (!Array.isArray(input.affectedScope) || input.affectedScope.length === 0) {
      throw new InvalidUncertaintyRecordError("affected_scope must be a non-empty array of unit identifiers.");
    }
    for (const unit of input.affectedScope) {
      if (!unit || typeof unit !== "string" || unit.trim() === "") {
        throw new InvalidUncertaintyRecordError("affected_scope elements must be non-empty strings.");
      }
    }

    // 3. Package Record Coherence
    if (input.packageRecord) {
      try {
        validationPackageSchema.parse(input.packageRecord);
      } catch (err: unknown) {
        throw new IncompatibleUncertaintyContextError(
          `Provided packageRecord fails ValidationPackage schema: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (input.packageRecord.package_id !== input.packageId) {
        throw new IncompatibleUncertaintyContextError(
          `packageRecord.package_id "${input.packageRecord.package_id}" does not match requested packageId "${input.packageId}".`
        );
      }
    }

    // 4. Scope Record Coherence & Scope Containment (WP-04)
    if (input.scopeRecord) {
      try {
        validationScopeRecordSchema.parse(input.scopeRecord);
      } catch (err: unknown) {
        throw new IncompatibleUncertaintyContextError(
          `Provided scopeRecord fails ValidationScopeRecord schema: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (input.packageRecord && input.packageRecord.scope_record_ref) {
        if (input.packageRecord.scope_record_ref !== input.scopeRecord.scope_id) {
          throw new IncompatibleUncertaintyContextError(
            `scopeRecord.scope_id "${input.scopeRecord.scope_id}" does not match packageRecord.scope_record_ref "${input.packageRecord.scope_record_ref}".`
          );
        }
      }

      // Check scope containment
      const includedNormalized = new Set(
        input.scopeRecord.included_units.map((u) => u.trim().toLowerCase())
      );
      const excludedNormalized = new Set(
        input.scopeRecord.excluded_units.map((u) => u.trim().toLowerCase())
      );

      const outOfScopeUnits: string[] = [];
      const excludedEncountered: string[] = [];

      for (const unit of input.affectedScope) {
        const norm = unit.trim().toLowerCase();
        if (excludedNormalized.has(norm)) {
          excludedEncountered.push(unit);
        } else if (input.scopeRecord.scope_inflation_protection && !includedNormalized.has(norm)) {
          outOfScopeUnits.push(unit);
        }
      }

      if (excludedEncountered.length > 0 || outOfScopeUnits.length > 0) {
        const details = [
          excludedEncountered.length > 0
            ? `Excluded units encountered: [${excludedEncountered.join(", ")}]`
            : "",
          outOfScopeUnits.length > 0
            ? `Units not in included scope: [${outOfScopeUnits.join(", ")}]`
            : "",
        ]
          .filter(Boolean)
          .join("; ");

        throw new ScopeContainmentViolationError(
          `Affected scope exceeds declared validation scope "${input.scopeRecord.scope_id}". ${details}`,
          outOfScopeUnits,
          excludedEncountered
        );
      }
    }

    // 5. Conflict Record Coherence (WP-17)
    if (input.conflictRecord) {
      try {
        evidenceConflictRecordSchema.parse(input.conflictRecord);
      } catch (err: unknown) {
        throw new IncompatibleUncertaintyContextError(
          `Provided conflictRecord fails EvidenceConflictRecord schema: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (input.conflictRecord.package_id !== input.packageId) {
        throw new IncompatibleUncertaintyContextError(
          `conflictRecord.package_id "${input.conflictRecord.package_id}" does not match requested packageId "${input.packageId}".`
        );
      }
    }

    // 6. Failure Record Coherence (WP-16)
    if (input.failureRecord) {
      try {
        validationFailureRecordSchema.parse(input.failureRecord);
      } catch (err: unknown) {
        throw new IncompatibleUncertaintyContextError(
          `Provided failureRecord fails ValidationFailureRecord schema: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // If evaluating UNKNOWN_FAILURE_CAUSE, failure record attribution must be UNKNOWN
      if (
        input.uncertaintySource === "UNKNOWN_FAILURE_CAUSE" &&
        input.failureRecord.attribution_class !== FAILURE_ATTRIBUTION_CLASSES.UNKNOWN
      ) {
        throw new IncompatibleUncertaintyContextError(
          `Failure record has attribution class "${input.failureRecord.attribution_class}", expected "UNKNOWN" for UNKNOWN_FAILURE_CAUSE uncertainty.`
        );
      }
    }

    // 7. Gate 8 Impact & Required Monitoring validation
    if (input.customGate8Impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
      if (
        input.customRequiredMonitoring &&
        input.customRequiredMonitoring.length === 0
      ) {
        throw new InvalidUncertaintyRecordError(
          "gate_8_impact ALLOWS_CONDITIONAL requires non-empty declarative required_monitoring_if_authorized."
        );
      }
    }
  }
}
