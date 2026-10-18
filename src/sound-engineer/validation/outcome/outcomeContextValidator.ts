// src/sound-engineer/validation/outcome/outcomeContextValidator.ts
// Phase 1C.5h WP-19: Context Coherence, Scope Containment, and Foreign Evidence Validator.
// Enforces that an outcome is immutably and exclusively bound to its governing package, scope, and version binding.
// Foreign evidence from other packages or uncontained scopes fails closed.

import {
  validationPackageSchema,
  validationScopeRecordSchema,
  validationVersionBindingRecordSchema,
} from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import {
  ForeignEvidenceError,
  OutcomeContextValidationError,
  ScopeContainmentError,
} from "./outcomeErrors";
import { SynthesizeOutcomeInput } from "./outcomeTypes";

export class OutcomeContextValidator {
  /**
   * Validates structural and contextual coherence of all inputs to outcome synthesis.
   * Throws specific domain errors on any mismatch, foreign leakage, or scope inflation.
   */
  public static validate(input: SynthesizeOutcomeInput): void {
    if (!input) {
      throw new OutcomeContextValidationError("SynthesizeOutcomeInput must not be undefined or null.");
    }

    // 1. Validate Schema Integrity of Core Binding Triad
    try {
      validationPackageSchema.parse(input.packageRecord);
    } catch (err) {
      throw new OutcomeContextValidationError(
        `Invalid ValidationPackage supplied to synthesis: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      validationScopeRecordSchema.parse(input.scopeRecord);
    } catch (err) {
      throw new OutcomeContextValidationError(
        `Invalid ValidationScopeRecord supplied to synthesis: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      validationVersionBindingRecordSchema.parse(input.versionBindingRecord);
    } catch (err) {
      throw new OutcomeContextValidationError(
        `Invalid ValidationVersionBindingRecord supplied to synthesis: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. Validate Triad Coherence (Package -> Scope & Package -> Version Binding)
    if (input.packageRecord.scope_record_ref !== input.scopeRecord.scope_id) {
      throw new OutcomeContextValidationError(
        `Scope reference mismatch: Package "${input.packageRecord.package_id}" references scope "${input.packageRecord.scope_record_ref}", but evaluated scope is "${input.scopeRecord.scope_id}".`
      );
    }

    if (input.packageRecord.version_binding_ref !== input.versionBindingRecord.binding_id) {
      throw new OutcomeContextValidationError(
        `Version binding mismatch: Package "${input.packageRecord.package_id}" references binding "${input.packageRecord.version_binding_ref}", but evaluated version binding is "${input.versionBindingRecord.binding_id}".`
      );
    }

    const packageId = input.packageRecord.package_id;
    const scopeEnforcer = new ScopeEnforcer(input.scopeRecord);

    // 3. Execution Records Coherence
    const knownExecutionIds = new Set<string>(input.packageRecord.execution_record_refs);
    if (input.executionRecords) {
      for (const exec of input.executionRecords) {
        if (knownExecutionIds.size > 0 && !knownExecutionIds.has(exec.execution_id)) {
          throw new ForeignEvidenceError(
            `Foreign execution detected: execution "${exec.execution_id}" is not referenced by package "${packageId}".`
          );
        }
        knownExecutionIds.add(exec.execution_id);
      }
    }

    // 4. Objective Evidence Coherence
    if (input.objectiveEvidence) {
      for (const obj of input.objectiveEvidence) {
        if (knownExecutionIds.size > 0 && !knownExecutionIds.has(obj.execution_id)) {
          throw new ForeignEvidenceError(
            `Foreign objective evidence detected: objective evidence "${obj.objective_evidence_id}" references foreign execution "${obj.execution_id}" not bound to package "${packageId}".`
          );
        }
      }
    }

    // 5. Perceptual Evidence Coherence
    if (input.perceptualEvidence) {
      for (const perc of input.perceptualEvidence) {
        if (knownExecutionIds.size > 0 && !knownExecutionIds.has(perc.execution_id)) {
          throw new ForeignEvidenceError(
            `Foreign perceptual evidence detected: perceptual evidence "${perc.perceptual_evidence_id}" references foreign execution "${perc.execution_id}" not bound to package "${packageId}".`
          );
        }
      }
    }

    // 6. UAT Evidence Coherence
    if (input.uatEvidence) {
      for (const uat of input.uatEvidence) {
        if (uat.package_id !== packageId) {
          throw new ForeignEvidenceError(
            `Foreign UAT evidence detected: UAT record "${uat.uat_id}" belongs to foreign package "${uat.package_id}" instead of evaluated package "${packageId}".`
          );
        }
      }
    }

    // 7. Regression Assessment Coherence and Scope Containment
    if (input.regressionAssessments) {
      for (const reg of input.regressionAssessments) {
        if (reg.package_id !== packageId) {
          throw new ForeignEvidenceError(
            `Foreign regression assessment detected: regression "${reg.regression_id}" belongs to foreign package "${reg.package_id}" instead of evaluated package "${packageId}".`
          );
        }

        // Scope containment check: all affected units must be within declared scope
        for (const unit of reg.affected_scope) {
          if (!scopeEnforcer.isWithinScope(unit)) {
            throw new ScopeContainmentError(
              `Scope containment violation in regression assessment "${reg.regression_id}": affected unit "${unit}" is outside declared scope "${input.scopeRecord.scope_id}" or explicitly excluded.`
            );
          }
        }
      }
    }

    // 8. Evidence Conflict Records Coherence
    if (input.conflictRecords) {
      for (const conflict of input.conflictRecords) {
        if (conflict.package_id !== packageId) {
          throw new ForeignEvidenceError(
            `Foreign conflict record detected: conflict "${conflict.conflict_id}" belongs to foreign package "${conflict.package_id}" instead of evaluated package "${packageId}".`
          );
        }
      }
    }

    // 9. Validation Uncertainty Records Coherence and Scope Containment
    if (input.uncertaintyRecords) {
      for (const u of input.uncertaintyRecords) {
        if (u.package_id !== packageId) {
          throw new ForeignEvidenceError(
            `Foreign uncertainty record detected: uncertainty "${u.uncertainty_id}" belongs to foreign package "${u.package_id}" instead of evaluated package "${packageId}".`
          );
        }

        for (const unit of u.affected_scope) {
          if (!scopeEnforcer.isWithinScope(unit)) {
            throw new ScopeContainmentError(
              `Scope containment violation in uncertainty record "${u.uncertainty_id}": affected unit "${unit}" is outside declared scope "${input.scopeRecord.scope_id}" or explicitly excluded.`
            );
          }
        }
      }
    }
  }
}
