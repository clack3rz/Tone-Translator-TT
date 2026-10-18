// src/sound-engineer/validation/evidence/uatCoverageValidator.ts
// UATCoverageValidator: Validates canonical persona coverage for user-facing workflows.
// Phase 1C.5h — WP-13.
// Bound to frozen specification v0.1j Section 17.2 and Implementation Plan v0.1h WP-13.

import { deepFreeze } from "../../contracts/immutability";
import {
  EvaluatorPersona,
  EVALUATOR_PERSONAS,
} from "../schemas/enums";
import { UATEvaluationRecord } from "../schemas/records";
import {
  CANONICAL_EVALUATOR_PERSONAS,
  UATCoverageReport,
} from "./uatTypes";

/**
 * UATCoverageValidator:
 * Audits persona coverage across evaluated UAT records for a ValidationPackage.
 * Enforces:
 * - Detection of missing required canonical persona evaluations;
 * - Anti-fabrication discipline: NEVER generates synthetic or fake evaluations to force pass;
 * - Reports exact coverage state losslessly.
 */
export class UATCoverageValidator {
  /**
   * Evaluates canonical persona coverage for a given ValidationPackage.
   * By default, checks against all four canonical personas unless a specific subset is required.
   */
  public static evaluateCoverage(
    packageId: string,
    evaluations: ReadonlyArray<UATEvaluationRecord>,
    requiredPersonas?: ReadonlyArray<EvaluatorPersona>
  ): UATCoverageReport {
    const required = requiredPersonas && requiredPersonas.length > 0
      ? requiredPersonas
      : CANONICAL_EVALUATOR_PERSONAS;

    // Filter evaluations strictly belonging to this package
    const packageEvaluations = evaluations.filter(
      (ev) => ev.package_id === packageId
    );

    const evaluationsByPersona: Record<EvaluatorPersona, UATEvaluationRecord[]> = {
      [EVALUATOR_PERSONAS.RECORDING_ENGINEER]: [],
      [EVALUATOR_PERSONAS.SESSION_GUITARIST]: [],
      [EVALUATOR_PERSONAS.PRODUCER]: [],
      [EVALUATOR_PERSONAS.PLATFORM_ARCHITECT]: [],
    };

    const evaluatedSet = new Set<EvaluatorPersona>();

    for (const ev of packageEvaluations) {
      if (evaluationsByPersona[ev.evaluator_persona]) {
        evaluationsByPersona[ev.evaluator_persona].push(ev);
        evaluatedSet.add(ev.evaluator_persona);
      }
    }

    const evaluatedPersonas = Array.from(evaluatedSet);
    const missingPersonas = required.filter(
      (persona) => !evaluatedSet.has(persona)
    );

    const isCoverageComplete = missingPersonas.length === 0;

    return deepFreeze({
      packageId,
      requiredPersonas: [...required],
      evaluatedPersonas,
      missingPersonas,
      isCoverageComplete,
      evaluationCount: packageEvaluations.length,
      evaluationsByPersona: deepFreeze(evaluationsByPersona),
    });
  }
}
