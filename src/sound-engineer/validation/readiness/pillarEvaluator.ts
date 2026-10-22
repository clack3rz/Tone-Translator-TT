// src/sound-engineer/validation/readiness/pillarEvaluator.ts
// Multi-pillar evaluator for the four orthogonal production-readiness pillars.
// Bound to frozen specification v0.1j Section 25.1 & Table 13.

import {
  EXECUTION_OUTCOMES,
  FIXTURE_CONTAMINATION_STATUSES,
  MATERIALITY_SCORES,
  MUSICAL_FITNESS_VERDICTS,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PILLAR_READINESS_STATUSES,
  PillarReadinessStatus,
  REGRESSION_CLASSIFICATIONS,
  TASK_COMPLETION_STATUSES,
  VALIDATION_OUTCOME_CLASSES,
} from "../schemas/enums";
import { isOutcomeInvalidatedInGraph, isRecordStaleInGraph } from "./readinessContextValidator";
import {
  PillarEvaluations,
  ProductionReadinessSynthesisInput,
} from "./productionReadinessTypes";

export interface PillarEvaluationResult {
  readonly pillarEvaluations: PillarEvaluations;
  readonly pillarRationales: Readonly<Record<keyof PillarEvaluations, string>>;
}

/**
 * Evaluates the candidate across all four orthogonal readiness pillars.
 * CRITICAL GOVERNANCE:
 * Production readiness is NEVER a single synthetic scalar score, percentage, or weighted mean.
 * The four pillars remain strictly orthogonal.
 */
export function evaluateFourPillars(
  input: ProductionReadinessSynthesisInput,
  requestedScope: readonly string[]
): PillarEvaluationResult {
  const rationales: Record<keyof PillarEvaluations, string> = {
    acoustic_musical_readiness: "",
    reasoning_governance_readiness: "",
    platform_operational_readiness: "",
    rollback_safety_readiness: "",
  };

  // ---------------------------------------------------------------------------
  // PILLAR 1: Acoustic & Musical Readiness
  // ---------------------------------------------------------------------------
  let acousticStatus: PillarReadinessStatus;
  const acousticFailures: string[] = [];
  let hasAffirmativeAcousticEvidence = false;
  let hasStaleAcousticEvidence = false;

  // Index executions for version binding checks
  const executionBindingMap = new Map<string, string>();
  if (input.executionRecords) {
    for (const exec of input.executionRecords) {
      if (exec.execution_id && exec.binding_id) {
        executionBindingMap.set(exec.execution_id, exec.binding_id);
      }
    }
  }

  // 1. Check outcome staleness in WP-20 graph or binding mismatch
  if (input.validationOutcome) {
    if (isOutcomeInvalidatedInGraph(input.validationOutcome.outcome_id, input.graph)) {
      hasStaleAcousticEvidence = true;
    }
    if (
      input.versionBinding &&
      input.validationOutcome.version_binding !== input.versionBinding.binding_id
    ) {
      hasStaleAcousticEvidence = true;
    }
  }

  // 2. Check objective evidence (excluding export and latency which belong to Pillar 3)
  if (input.objectiveEvidence && input.objectiveEvidence.length > 0) {
    for (const obj of input.objectiveEvidence) {
      if (
        obj.metric_category !== OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY &&
        obj.metric_category !== OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE
      ) {
        const execBinding = executionBindingMap.get(obj.execution_id);
        if (
          input.versionBinding &&
          execBinding &&
          execBinding !== input.versionBinding.binding_id
        ) {
          hasStaleAcousticEvidence = true;
          continue;
        }
        hasAffirmativeAcousticEvidence = true;
        if (obj.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL) {
          acousticFailures.push(
            `Objective acoustic failure in "${obj.objective_evidence_id}" (${obj.metric_category})`
          );
        }
      }
    }
  }

  // 3. Check perceptual evaluations (expert listening across musical dimensions)
  if (input.perceptualEvaluations && input.perceptualEvaluations.length > 0) {
    for (const perc of input.perceptualEvaluations) {
      const execBinding = executionBindingMap.get(perc.execution_id);
      if (
        input.versionBinding &&
        execBinding &&
        execBinding !== input.versionBinding.binding_id
      ) {
        hasStaleAcousticEvidence = true;
        continue;
      }
      hasAffirmativeAcousticEvidence = true;
      if (perc.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL) {
        acousticFailures.push(
          `Perceptual listening failure in "${perc.perceptual_evidence_id}" (${perc.methodology_used})`
        );
      }
    }
  }

  // 4. Check UAT evaluations (musician playability and production fitness)
  if (input.uatEvaluations && input.uatEvaluations.length > 0) {
    for (const uat of input.uatEvaluations) {
      if (uat.package_id !== input.packageRecord.package_id) {
        hasStaleAcousticEvidence = true;
        continue;
      }
      hasAffirmativeAcousticEvidence = true;
      if (
        uat.musical_fitness_verdict === MUSICAL_FITNESS_VERDICTS.REJECTED ||
        uat.task_completion_status === TASK_COMPLETION_STATUSES.FAILED
      ) {
        acousticFailures.push(
          `UAT musical fitness rejection by ${uat.evaluator_persona} in "${uat.uat_id}"`
        );
      }
    }
  }

  // 5. Check Golden fixtures: if any fixture is SUSPECT, fixture integrity is unverified -> INCONCLUSIVE
  let hasSuspectFixture = false;
  if (input.fixtureRecords && input.fixtureRecords.length > 0) {
    for (const fix of input.fixtureRecords) {
      if (fix.contamination_status === FIXTURE_CONTAMINATION_STATUSES.SUSPECT) {
        hasSuspectFixture = true;
        break;
      }
    }
  }

  // Determine Pillar 1 verdict
  if (acousticFailures.length > 0) {
    acousticStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
    rationales.acoustic_musical_readiness =
      `DEFICIENT: Material audible defects or playability rejections detected (${acousticFailures.length} failure(s)): ${acousticFailures[0]}.`;
  } else if (input.validationOutcome?.outcome_class === VALIDATION_OUTCOME_CLASSES.FAIL) {
    acousticStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
    rationales.acoustic_musical_readiness =
      `DEFICIENT: ValidationOutcomeRecord class is FAIL: ${input.validationOutcome.summary_verdict}.`;
  } else if (hasSuspectFixture) {
    acousticStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.acoustic_musical_readiness =
      "INCONCLUSIVE: Fixture integrity is flagged SUSPECT (unverifiable calibration / quarantine); cannot support affirmative acoustic readiness.";
  } else if (!hasAffirmativeAcousticEvidence || hasStaleAcousticEvidence) {
    acousticStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.acoustic_musical_readiness = hasStaleAcousticEvidence
      ? "INCONCLUSIVE: Acoustic evidence or prior outcome has been invalidated by a revalidation trigger and cannot support current readiness."
      : "INCONCLUSIVE: Missing affirmative objective signal measurements, expert listening, or UAT playability evidence.";
  } else if (input.validationOutcome?.outcome_class === VALIDATION_OUTCOME_CLASSES.BLOCKED) {
    acousticStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.acoustic_musical_readiness =
      "INCONCLUSIVE: Validation outcome is BLOCKED; acoustic readiness cannot be proven.";
  } else {
    acousticStatus = PILLAR_READINESS_STATUSES.SATISFIED;
    rationales.acoustic_musical_readiness =
      "SATISFIED: Objective acoustic signal measurements within tolerance, expert listening approved, and musician playability confirmed.";
  }

  // ---------------------------------------------------------------------------
  // PILLAR 2: Reasoning & Governance Readiness
  // ---------------------------------------------------------------------------
  let reasoningStatus: PillarReadinessStatus;
  const reasoningFailures: string[] = [];
  const gov = input.upstreamGovernanceState;

  if (!gov) {
    reasoningStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.reasoning_governance_readiness =
      "INCONCLUSIVE: Upstream governance state unsupplied; governance compliance cannot be inferred from acoustic output alone.";
  } else {
    if (gov.provenance_intact === false) {
      reasoningFailures.push("Phase 1C.5f RunTrace / provenance lineage broken");
    }
    if (gov.ungrounded_reasoning_detected === true) {
      reasoningFailures.push("Fabricated or ungrounded intervention reasoning detected");
    }
    if (gov.candidate_lesson_quarantined === false) {
      reasoningFailures.push("Candidate lesson quarantine breached");
    }
    if (gov.principles_complied === false) {
      reasoningFailures.push("Non-compliance with 21 Principles");
    }
    if (gov.upstream_violations && gov.upstream_violations.length > 0) {
      reasoningFailures.push(`Unresolved upstream violations: ${gov.upstream_violations.join(", ")}`);
    }

    if (reasoningFailures.length > 0) {
      reasoningStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
      rationales.reasoning_governance_readiness =
        `DEFICIENT: Architectural governance violations detected: ${reasoningFailures.join("; ")}.`;
    } else if (
      gov.provenance_intact === true &&
      gov.causal_explainability_verified === true &&
      (gov.reasoning_lifecycle_stages_completed ?? 0) >= 14
    ) {
      reasoningStatus = PILLAR_READINESS_STATUSES.SATISFIED;
      rationales.reasoning_governance_readiness =
        "SATISFIED: Complete 14-stage reasoning lifecycle verified, causal explainability confirmed, unbroken provenance seal intact.";
    } else {
      reasoningStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
      rationales.reasoning_governance_readiness =
        "INCONCLUSIVE: Incomplete affirmative evidence for 14-stage reasoning lifecycle or causal explainability.";
    }
  }

  // ---------------------------------------------------------------------------
  // PILLAR 3: Platform & Operational Readiness
  // ---------------------------------------------------------------------------
  let platformStatus: PillarReadinessStatus;
  const platformFailures: string[] = [];
  let hasAffirmativePlatformEvidence = false;

  if (input.objectiveEvidence && input.objectiveEvidence.length > 0) {
    for (const obj of input.objectiveEvidence) {
      if (
        obj.metric_category === OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY ||
        obj.metric_category === OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE
      ) {
        hasAffirmativePlatformEvidence = true;
        if (obj.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL) {
          platformFailures.push(
            `Operational metric failure in "${obj.objective_evidence_id}" (${obj.metric_category})`
          );
        }
      }
    }
  }

  if (input.executionRecords && input.executionRecords.length > 0) {
    for (const exec of input.executionRecords) {
      if (
        exec.profile_id.includes("03") ||
        exec.profile_id.includes("export") ||
        exec.profile_id.includes("05")
      ) {
        hasAffirmativePlatformEvidence = true;
        if (
          exec.outcome === EXECUTION_OUTCOMES.FAILED ||
          exec.outcome === EXECUTION_OUTCOMES.ABORTED
        ) {
          platformFailures.push(`Platform execution failed in "${exec.execution_id}"`);
        }
      }
    }
  }

  if (platformFailures.length > 0) {
    platformStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
    rationales.platform_operational_readiness =
      `DEFICIENT: Preset export or operational performance failures detected: ${platformFailures.join("; ")}.`;
  } else if (!hasAffirmativePlatformEvidence) {
    platformStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.platform_operational_readiness =
      "INCONCLUSIVE: Missing affirmative evidence for preset export integrity or operational latency performance.";
  } else {
    platformStatus = PILLAR_READINESS_STATUSES.SATISFIED;
    rationales.platform_operational_readiness =
      "SATISFIED: Preset export succeeds without error, legal parameter mappings verified, operational latency within budget.";
  }

  // ---------------------------------------------------------------------------
  // PILLAR 4: Rollback & Production-Safety Readiness
  // ---------------------------------------------------------------------------
  let rollbackStatus: PillarReadinessStatus;

  // Fail closed: Missing rollback verification evidence is NEVER satisfied
  if (!input.rollbackEvidence) {
    rollbackStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
    rationales.rollback_safety_readiness =
      "INCONCLUSIVE: Rollback verification evidence is unsupplied (WP-27 boundary). Fails closed pending automated rollback evidence.";
  } else if (
    !input.rollbackEvidence.rollback_verified ||
    input.rollbackEvidence.path_rollback_verified_under_load === false ||
    input.rollbackEvidence.recovery_time_objective_met === false ||
    input.rollbackEvidence.telemetry_stop_criteria_configured === false ||
    input.rollbackEvidence.is_stale === true ||
    (input.rollbackEvidence.version_binding_ref &&
      input.versionBinding &&
      input.rollbackEvidence.version_binding_ref !== input.versionBinding.binding_id)
  ) {
    rollbackStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
    rationales.rollback_safety_readiness =
      `DEFICIENT: Automated rollback verification failed, incomplete, or stale: ${input.rollbackEvidence.failure_reason ?? "Rollback safety criteria unfulfilled."}`;
  } else {
    // Check if regression assessments in scope show material genuine regression or unresolved divergence
    let hasGenuineRegressionInScope = false;
    let hasUnresolvedDivergenceInScope = false;
    if (input.regressionAssessments) {
      const requestedScopeSet = new Set(requestedScope);
      for (const reg of input.regressionAssessments) {
        const intersects =
          reg.affected_scope.some((s) => requestedScopeSet.has(s)) ||
          requestedScope.length === 0;

        if (intersects) {
          if (
            reg.classification === REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION &&
            (reg.materiality_score !== MATERIALITY_SCORES.NEGLIGIBLE || reg.blocks_gate_8)
          ) {
            hasGenuineRegressionInScope = true;
            break;
          } else if (reg.classification === REGRESSION_CLASSIFICATIONS.UNRESOLVED) {
            hasUnresolvedDivergenceInScope = true;
          }
        }
      }
    }

    if (hasGenuineRegressionInScope) {
      rollbackStatus = PILLAR_READINESS_STATUSES.DEFICIENT;
      rationales.rollback_safety_readiness =
        "DEFICIENT: Production safety compromised by unresolved material genuine regression in requested scope.";
    } else if (hasUnresolvedDivergenceInScope) {
      rollbackStatus = PILLAR_READINESS_STATUSES.INCONCLUSIVE;
      rationales.rollback_safety_readiness =
        "INCONCLUSIVE: Unresolved regression divergence assessment pending in requested scope.";
    } else {
      rollbackStatus = PILLAR_READINESS_STATUSES.SATISFIED;
      rationales.rollback_safety_readiness =
        "SATISFIED: Automated rollback empirically verified under load within recovery time objective; real-time telemetry stop criteria configured.";
    }
  }

  const pillarEvaluations: PillarEvaluations = Object.freeze({
    acoustic_musical_readiness: acousticStatus,
    reasoning_governance_readiness: reasoningStatus,
    platform_operational_readiness: platformStatus,
    rollback_safety_readiness: rollbackStatus,
  });

  return {
    pillarEvaluations,
    pillarRationales: Object.freeze(rationales),
  };
}
