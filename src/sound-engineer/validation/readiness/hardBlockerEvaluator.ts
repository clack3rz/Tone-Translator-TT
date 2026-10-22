// src/sound-engineer/validation/readiness/hardBlockerEvaluator.ts
// Authoritative evaluator for the Eight Frozen Production-Readiness Hard Blockers.
// Bound to frozen specification v0.1j Section 25.2 & Table 13.

import {
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  MATERIALITY_SCORES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  REGRESSION_CLASSIFICATIONS,
  UNCERTAINTY_GATE_8_IMPACTS,
  VALIDATION_OUTCOME_CLASSES,
} from "../schemas/enums";
import { VersionBindingService } from "../binding/versionBindingService";
import { isRecordStaleInGraph } from "./readinessContextValidator";
import {
  FROZEN_HARD_BLOCKERS,
  ProductionReadinessSynthesisInput,
} from "./productionReadinessTypes";

export interface HardBlockerEvaluationResult {
  readonly hardBlockersPresent: readonly string[];
  readonly blockerDetails: Readonly<Record<string, string>>;
}

/**
 * Evaluates a candidate against all eight frozen Hard Blockers defined in Table 13.
 * CRITICAL ARCHITECTURAL CONSTITUTION: All eight hard blockers are evaluated.
 * Any single blocker presence immediately disqualifies Gate 8 eligibility.
 */
export function evaluateHardBlockers(
  input: ProductionReadinessSynthesisInput,
  requestedScope: readonly string[]
): HardBlockerEvaluationResult {
  const blockers: string[] = [];
  const details: Record<string, string> = {};

  const requestedScopeSet = new Set(requestedScope);

  // ---------------------------------------------------------------------------
  // 1. Hard Blocker 1: Unresolved material genuine regression within requested authorization scope
  // ---------------------------------------------------------------------------
  let hasGenuineRegression = false;
  if (input.regressionAssessments && input.regressionAssessments.length > 0) {
    for (const reg of input.regressionAssessments) {
      const isGenuine = reg.classification === REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION;
      const isMaterial = reg.materiality_score !== MATERIALITY_SCORES.NEGLIGIBLE;
      const scopeIntersects =
        reg.affected_scope.some((s) => requestedScopeSet.has(s)) ||
        requestedScope.length === 0;

      if ((isGenuine && isMaterial && scopeIntersects) || (isGenuine && reg.blocks_gate_8 && scopeIntersects)) {
        hasGenuineRegression = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION] =
          `Unresolved material genuine regression in assessment "${reg.regression_id}" within requested authorization scope.`;
        break;
      }
    }
  }

  // Also check failure attributions if genuine regression is documented there
  if (!hasGenuineRegression && input.failureAttributions) {
    for (const f of input.failureAttributions) {
      if (
        f.materiality === FAILURE_MATERIALITIES.CRITICAL_BLOCKER &&
        f.gate_8_blocked &&
        (f.affected_scope.some((u) => requestedScopeSet.has(u)) || requestedScope.length === 0)
      ) {
        hasGenuineRegression = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION] =
          `Unresolved material genuine regression failure in "${f.failure_id}".`;
        break;
      }
    }
  }

  if (hasGenuineRegression) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION);
  }

  // ---------------------------------------------------------------------------
  // 2. Hard Blocker 2: Target-platform preset export failure, crash, or serialization corruption
  // ---------------------------------------------------------------------------
  let hasExportFailure = false;
  if (input.objectiveEvidence) {
    for (const obj of input.objectiveEvidence) {
      if (
        obj.metric_category === OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY &&
        obj.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL
      ) {
        hasExportFailure = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION] =
          `Export integrity verification failed in objective evidence "${obj.objective_evidence_id}".`;
        break;
      }
    }
  }

  if (!hasExportFailure && input.executionRecords) {
    for (const exec of input.executionRecords) {
      if (
        (exec.profile_id.includes("03") || exec.profile_id.includes("export")) &&
        (exec.outcome === EXECUTION_OUTCOMES.FAILED || exec.outcome === EXECUTION_OUTCOMES.ABORTED)
      ) {
        hasExportFailure = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION] =
          `Target platform export execution failed or crashed in execution "${exec.execution_id}".`;
        break;
      }
    }
  }

  if (!hasExportFailure && input.failureAttributions) {
    for (const f of input.failureAttributions) {
      if (
        (f.attribution_class === FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION ||
          f.attribution_class === FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM) &&
        f.gate_8_blocked
      ) {
        hasExportFailure = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION] =
          `Platform export failure attribution "${f.failure_id}" (${f.attribution_class}).`;
        break;
      }
    }
  }

  if (hasExportFailure) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_02_EXPORT_FAILURE_CORRUPTION);
  }

  // ---------------------------------------------------------------------------
  // 3. Hard Blocker 3: Failure or unverified state of automated rollback (PATH-ROLLBACK)
  // ---------------------------------------------------------------------------
  // Absolute fail-closed requirement: missing or failed rollback evidence is an absolute hard blocker.
  if (!input.rollbackEvidence) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED);
    details[FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED] =
      "Automated rollback verification evidence (PATH-ROLLBACK) is absent/unsupplied. Fails closed pending authoritative rollback verification.";
  } else if (!input.rollbackEvidence.rollback_verified) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED);
    details[FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED] =
      `Automated rollback verification failed: ${input.rollbackEvidence.failure_reason ?? "Rollback execution was not verified."}`;
  } else if (
    input.rollbackEvidence.path_rollback_verified_under_load === false ||
    input.rollbackEvidence.recovery_time_objective_met === false ||
    input.rollbackEvidence.telemetry_stop_criteria_configured === false
  ) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED);
    details[FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED] =
      "Rollback verification requirements incomplete: load verification, recovery time objective, or telemetry stop criteria unfulfilled.";
  } else if (
    input.rollbackEvidence.is_stale === true ||
    (input.rollbackEvidence.version_binding_ref &&
      input.versionBinding &&
      input.rollbackEvidence.version_binding_ref !== input.versionBinding.binding_id)
  ) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED);
    details[FROZEN_HARD_BLOCKERS.BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED] =
      "Rollback verification evidence is stale or bound to a mismatched version binding.";
  }

  // ---------------------------------------------------------------------------
  // 4. Hard Blocker 4: Missing, broken, or unverifiable Phase 1C.5f provenance / traceability
  // ---------------------------------------------------------------------------
  let hasProvenanceIssue = false;
  if (!input.versionBinding) {
    hasProvenanceIssue = true;
    details[FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN] =
      "Version binding record is missing. Provenance cannot be verified.";
  } else {
    const service = new VersionBindingService();
    const isValid = service.verifyBindingIntegrity(input.versionBinding);
    if (!isValid) {
      hasProvenanceIssue = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN] =
        `Version binding integrity compromised for "${input.versionBinding.binding_id}".`;
    }
  }

  if (!hasProvenanceIssue && input.upstreamGovernanceState) {
    if (input.upstreamGovernanceState.provenance_intact === false) {
      hasProvenanceIssue = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN] =
        "Phase 1C.5f RunTrace / provenance lineage is broken or unverified.";
    }
  }

  if (hasProvenanceIssue) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN);
  }

  // ---------------------------------------------------------------------------
  // 5. Hard Blocker 5: Contaminated, miscalibrated, or missing Golden fixtures
  // ---------------------------------------------------------------------------
  let hasFixtureIssue = false;
  if (input.fixtureRecords && input.fixtureRecords.length > 0) {
    for (const fix of input.fixtureRecords) {
      if (
        fix.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED ||
        fix.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.INVALIDATED
      ) {
        hasFixtureIssue = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING] =
          `Golden fixture "${fix.fixture_id}" is contaminated or miscalibrated/invalidated ("${fix.contamination_status}" / "${fix.lifecycle_status}").`;
        break;
      }
    }
  } else if (!input.fixtureRecords && (input.packageRecord.validation_case_refs?.length ?? 0) > 0) {
    // Check if outcome was BLOCKED due to fixture missing
    if (
      input.validationOutcome?.unresolved_issues.some((issue) =>
        issue.toLowerCase().includes("fixture") || issue.toLowerCase().includes("contamination")
      ) ||
      (input.validationOutcome?.outcome_class === VALIDATION_OUTCOME_CLASSES.BLOCKED &&
        input.validationOutcome?.summary_verdict.toLowerCase().includes("fixture"))
    ) {
      hasFixtureIssue = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING] =
        "Golden fixtures missing or contaminated during validation.";
    }
  }

  if (hasFixtureIssue) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING);
  }

  // ---------------------------------------------------------------------------
  // 6. Hard Blocker 6: Requested authorization scope broader than actually tested scope
  // ---------------------------------------------------------------------------
  let hasScopeInflation = false;
  const testedUnits = new Set(input.scopeRecord.included_units);
  const excludedUnits = new Set(input.scopeRecord.excluded_units ?? []);

  for (const unit of requestedScope) {
    if (!testedUnits.has(unit)) {
      hasScopeInflation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION] =
        `Requested authorization unit "${unit}" was not tested in scope "${input.scopeRecord.scope_id}".`;
      break;
    }
    if (excludedUnits.has(unit)) {
      hasScopeInflation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION] =
        `Requested authorization unit "${unit}" is explicitly excluded in scope "${input.scopeRecord.scope_id}".`;
      break;
    }
  }

  if (hasScopeInflation) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_06_SCOPE_INFLATION);
  }

  // ---------------------------------------------------------------------------
  // 7. Hard Blocker 7: Unresolved critical uncertainty regarding production tone safety
  // ---------------------------------------------------------------------------
  let hasCriticalUncertainty = false;
  if (input.uncertaintyRecords && input.uncertaintyRecords.length > 0) {
    for (const u of input.uncertaintyRecords) {
      const isCritical =
        u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK ||
        u.potential_production_risk.toLowerCase().includes("critical") ||
        u.potential_production_risk.toLowerCase().includes("tone safety");

      if (isCritical) {
        hasCriticalUncertainty = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_07_CRITICAL_TONE_UNCERTAINTY] =
          `Unresolved critical uncertainty "${u.uncertainty_id}": ${u.potential_production_risk}.`;
        break;
      }
    }
  }

  if (hasCriticalUncertainty) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_07_CRITICAL_TONE_UNCERTAINTY);
  }

  // ---------------------------------------------------------------------------
  // 8. Hard Blocker 8: Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g
  // ---------------------------------------------------------------------------
  let hasUpstreamViolation = false;
  if (input.upstreamGovernanceState) {
    const gov = input.upstreamGovernanceState;
    if (gov.upstream_violations && gov.upstream_violations.length > 0) {
      hasUpstreamViolation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION] =
        `Active upstream architectural violations: ${gov.upstream_violations.join(", ")}.`;
    } else if (gov.ungrounded_reasoning_detected === true) {
      hasUpstreamViolation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION] =
        "Ungrounded or fabricated intervention reasoning detected in upstream pipeline.";
    } else if (gov.candidate_lesson_quarantined === false) {
      hasUpstreamViolation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION] =
        "Candidate lesson quarantine violation: unapproved candidate lesson promoted.";
    } else if (gov.principles_complied === false) {
      hasUpstreamViolation = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION] =
        "Non-compliance with the 21 Architectural Principles detected.";
    }
  }

  if (hasUpstreamViolation) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION);
  }

  return {
    hardBlockersPresent: Object.freeze([...new Set(blockers)]),
    blockerDetails: Object.freeze(details),
  };
}
