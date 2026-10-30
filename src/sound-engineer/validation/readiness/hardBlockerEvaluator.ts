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
import { GOVERNED_HARD_BLOCKERS } from "../outcome/outcomeTypes";

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
  // 5. Hard Blocker 5: Runtime instability, resource leak, or audio buffer underruns (BLOCK-05)
  // ---------------------------------------------------------------------------
  let hasRuntimeInstability = false;
  if (input.objectiveEvidence) {
    for (const obj of input.objectiveEvidence) {
      if (
        obj.metric_category === OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE &&
        obj.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL
      ) {
        hasRuntimeInstability = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY] =
          `Operational stability / latency budget breach in objective evidence "${obj.objective_evidence_id}".`;
        break;
      }
    }
  }

  if (!hasRuntimeInstability && input.executionRecords) {
    for (const exec of input.executionRecords) {
      if (
        (exec.profile_id.includes("08") ||
          exec.profile_id.includes("operational") ||
          exec.profile_id.includes("stability")) &&
        (exec.outcome === EXECUTION_OUTCOMES.FAILED || exec.outcome === EXECUTION_OUTCOMES.ABORTED)
      ) {
        hasRuntimeInstability = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY] =
          `Operational execution failed or aborted under load in execution "${exec.execution_id}".`;
        break;
      }
    }
  }

  if (!hasRuntimeInstability && input.failureAttributions) {
    for (const f of input.failureAttributions) {
      if (
        f.attribution_class === FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION &&
        (f.gate_8_blocked || f.materiality === FAILURE_MATERIALITIES.CRITICAL_BLOCKER)
      ) {
        hasRuntimeInstability = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY] =
          `Runtime implementation instability in failure attribution "${f.failure_id}".`;
        break;
      }
    }
  }

  if (!hasRuntimeInstability && input.validationOutcome) {
    const outcomeWithBlockers = input.validationOutcome as { active_hard_blockers?: readonly string[] };
    if (
      outcomeWithBlockers.active_hard_blockers?.includes(
        GOVERNED_HARD_BLOCKERS.BLOCK_05_INSTABILITY
      ) ||
      input.validationOutcome.unresolved_issues?.some(
        (issue) =>
          issue.toLowerCase().includes("runtime instability") ||
          issue.toLowerCase().includes("buffer underrun") ||
          issue.toLowerCase().includes("resource leak")
      )
    ) {
      hasRuntimeInstability = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY] =
        "Runtime instability or buffer underrun recorded in validation outcome.";
    }
  }

  if (hasRuntimeInstability) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_05_RUNTIME_INSTABILITY);
  }

  // ---------------------------------------------------------------------------
  // 6. Hard Blocker 6: Requested authorization scope broader than actually tested scope (BLOCK-06)
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
  // 7. Hard Blocker 7: Contaminated Golden fixtures leaked into model tuning (BLOCK-07)
  // ---------------------------------------------------------------------------
  let hasFixtureContamination = false;
  if (input.fixtureRecords && input.fixtureRecords.length > 0) {
    for (const fix of input.fixtureRecords) {
      if (fix.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED) {
        hasFixtureContamination = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_07_FIXTURE_CONTAMINATION] =
          `Golden fixture "${fix.fixture_id}" is contaminated (${fix.contamination_status}).`;
        break;
      }
    }
  }

  if (!hasFixtureContamination && input.validationOutcome) {
    const outcomeWithBlockers = input.validationOutcome as { active_hard_blockers?: readonly string[] };
    if (
      outcomeWithBlockers.active_hard_blockers?.includes(
        GOVERNED_HARD_BLOCKERS.BLOCK_07_CONTAMINATION
      ) ||
      input.validationOutcome.unresolved_issues?.some(
        (issue) =>
          issue.toLowerCase().includes("fixture contamination") ||
          issue.toLowerCase().includes("fixture leak")
      )
    ) {
      hasFixtureContamination = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_07_FIXTURE_CONTAMINATION] =
        "Fixture contamination recorded in validation outcome.";
    }
  }

  if (hasFixtureContamination) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_07_FIXTURE_CONTAMINATION);
  }

  // ---------------------------------------------------------------------------
  // 8. Hard Blocker 8: Unresolved critical uncertainty regarding production tone safety or live audio risk (BLOCK-08)
  // ---------------------------------------------------------------------------
  let hasCriticalUncertainty = false;
  if (input.uncertaintyRecords && input.uncertaintyRecords.length > 0) {
    for (const u of input.uncertaintyRecords) {
      const isCritical =
        u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK ||
        u.potential_production_risk.toLowerCase().includes("critical") ||
        u.potential_production_risk.toLowerCase().includes("tone safety") ||
        u.potential_production_risk.toLowerCase().includes("live audio");

      if (isCritical) {
        hasCriticalUncertainty = true;
        details[FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY] =
          `Unresolved critical uncertainty "${u.uncertainty_id}": ${u.potential_production_risk}.`;
        break;
      }
    }
  }

  if (!hasCriticalUncertainty && input.validationOutcome) {
    const outcomeWithBlockers = input.validationOutcome as { active_hard_blockers?: readonly string[] };
    if (
      outcomeWithBlockers.active_hard_blockers?.includes(
        GOVERNED_HARD_BLOCKERS.BLOCK_08_UNCERTAINTY
      )
    ) {
      hasCriticalUncertainty = true;
      details[FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY] =
        "Critical uncertainty recorded in validation outcome.";
    }
  }

  if (hasCriticalUncertainty) {
    blockers.push(FROZEN_HARD_BLOCKERS.BLOCKER_08_CRITICAL_UNCERTAINTY);
  }

  return {
    hardBlockersPresent: Object.freeze([...new Set(blockers)]),
    blockerDetails: Object.freeze(details),
  };
}
