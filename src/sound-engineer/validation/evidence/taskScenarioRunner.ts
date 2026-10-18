// src/sound-engineer/validation/evidence/taskScenarioRunner.ts
// TaskScenarioRunner: Executes and validates bounded, data-driven UAT task scenarios.
// Phase 1C.5h — WP-13.
// Bound to frozen specification v0.1j Section 17 and Implementation Plan v0.1h WP-13.

import { deepFreeze } from "../../contracts/immutability";
import {
  CANONICAL_EVALUATOR_PERSONAS,
  CANONICAL_MUSICAL_FITNESS_VERDICTS,
  CANONICAL_TASK_COMPLETION_STATUSES,
  TaskExecutionObservation,
  TaskScenario,
} from "./uatTypes";
import {
  InvalidEvaluatorPersonaError,
  InvalidMusicalFitnessVerdictError,
  InvalidTaskCompletionStatusError,
  InvalidTaskDurationError,
  InvalidTaskScenarioError,
} from "./uatErrors";
import { UATMetricResolverInterface } from "./uatTypes";

export interface TaskScenarioRunInput {
  readonly scenario: TaskScenario;
  readonly observation: TaskExecutionObservation;
  readonly metricResolver: UATMetricResolverInterface;
}

export interface ValidatedScenarioExecution {
  readonly taskScenarioId: string;
  readonly evaluatorPersona: TaskExecutionObservation["evaluatorPersona"];
  readonly taskCompletionStatus: TaskExecutionObservation["taskCompletionStatus"];
  readonly taskDurationSeconds: number;
  readonly workflowSatisfactionRating: number;
  readonly cognitiveFrictionNotes: string;
  readonly musicalFitnessVerdict: TaskExecutionObservation["musicalFitnessVerdict"];
  readonly uatBlockersIdentified: ReadonlyArray<string>;
  readonly metricProfileRef: string;
}

/**
 * TaskScenarioRunner:
 * Validates scenario inputs, enforces truthfulness of observed task execution,
 * preserves friction and blockers losslessly, and validates metric profile bounds.
 */
export class TaskScenarioRunner {
  /**
   * Validates a TaskScenario definition for structural integrity.
   */
  public static validateScenarioDefinition(scenario: TaskScenario): void {
    if (!scenario) {
      throw new InvalidTaskScenarioError("UNKNOWN", "Scenario definition is null or undefined.");
    }
    if (!scenario.taskScenarioId || scenario.taskScenarioId.trim() === "") {
      throw new InvalidTaskScenarioError(
        scenario.taskScenarioId ?? "EMPTY",
        "taskScenarioId must be a non-empty string."
      );
    }
    if (!scenario.title || scenario.title.trim() === "") {
      throw new InvalidTaskScenarioError(scenario.taskScenarioId, "title must be a non-empty string.");
    }
    if (!scenario.description || scenario.description.trim() === "") {
      throw new InvalidTaskScenarioError(
        scenario.taskScenarioId,
        "description must be a non-empty string."
      );
    }
    if (!scenario.metricProfileRef || scenario.metricProfileRef.trim() === "") {
      throw new InvalidTaskScenarioError(
        scenario.taskScenarioId,
        "metricProfileRef must be specified."
      );
    }
    if (!Array.isArray(scenario.targetPersonas) || scenario.targetPersonas.length === 0) {
      throw new InvalidTaskScenarioError(
        scenario.taskScenarioId,
        "targetPersonas must contain at least one canonical evaluator persona."
      );
    }
    for (const persona of scenario.targetPersonas) {
      if (!CANONICAL_EVALUATOR_PERSONAS.includes(persona)) {
        throw new InvalidEvaluatorPersonaError(persona, CANONICAL_EVALUATOR_PERSONAS);
      }
    }
  }

  /**
   * Validates an observed task execution against the scenario definition and governing metric profile.
   * Enforces:
   * 1. Exact 4 canonical evaluator personas;
   * 2. Exact 3 canonical task completion statuses (COMPLETED_WITH_FRICTION remains distinct);
   * 3. Exact 3 canonical musical fitness verdicts (independent judgment, not derived from metrics);
   * 4. Task duration is non-negative, finite, and not NaN;
   * 5. Workflow satisfaction governed by uat_metric_profile_ref (no universal fallback);
   * 6. Lossless preservation of friction notes and blockers.
   */
  public static executeScenario(input: TaskScenarioRunInput): ValidatedScenarioExecution {
    const { scenario, observation, metricResolver } = input;

    // 1. Validate scenario definition
    this.validateScenarioDefinition(scenario);

    // 2. Validate scenario ID match
    if (observation.taskScenarioId !== scenario.taskScenarioId) {
      throw new InvalidTaskScenarioError(
        observation.taskScenarioId,
        `Observation taskScenarioId "${observation.taskScenarioId}" does not match scenario definition "${scenario.taskScenarioId}".`
      );
    }

    // 3. Validate Evaluator Persona
    if (!CANONICAL_EVALUATOR_PERSONAS.includes(observation.evaluatorPersona)) {
      throw new InvalidEvaluatorPersonaError(
        observation.evaluatorPersona,
        CANONICAL_EVALUATOR_PERSONAS
      );
    }

    // If scenario specifies target personas, verify this persona is targeted
    if (
      scenario.targetPersonas.length > 0 &&
      !scenario.targetPersonas.includes(observation.evaluatorPersona)
    ) {
      throw new InvalidEvaluatorPersonaError(
        observation.evaluatorPersona,
        scenario.targetPersonas
      );
    }

    // 4. Validate Task Completion Status
    if (!CANONICAL_TASK_COMPLETION_STATUSES.includes(observation.taskCompletionStatus)) {
      throw new InvalidTaskCompletionStatusError(
        observation.taskCompletionStatus,
        CANONICAL_TASK_COMPLETION_STATUSES
      );
    }

    // 5. Validate Task Duration
    const duration = observation.taskDurationSeconds;
    if (
      typeof duration !== "number" ||
      Number.isNaN(duration) ||
      !Number.isFinite(duration) ||
      duration < 0
    ) {
      throw new InvalidTaskDurationError(
        duration,
        "Duration must be a finite, non-negative number."
      );
    }

    // 6. Validate Musical Fitness Verdict
    if (!CANONICAL_MUSICAL_FITNESS_VERDICTS.includes(observation.musicalFitnessVerdict)) {
      throw new InvalidMusicalFitnessVerdictError(
        observation.musicalFitnessVerdict,
        CANONICAL_MUSICAL_FITNESS_VERDICTS
      );
    }

    // 7. Workflow Satisfaction Rating Governance
    const metricProfileRef =
      observation.metricProfileRef ?? scenario.metricProfileRef;
    metricResolver.validateRating(metricProfileRef, observation.workflowSatisfactionRating);

    // 8. Lossless Cognitive Friction & Blockers Preservation
    // Friction notes are preserved verbatim; blockers are preserved verbatim
    const frictionNotes = typeof observation.cognitiveFrictionNotes === "string"
      ? observation.cognitiveFrictionNotes
      : "";

    const blockers = Array.isArray(observation.uatBlockersIdentified)
      ? [...observation.uatBlockersIdentified]
      : [];

    return deepFreeze({
      taskScenarioId: scenario.taskScenarioId,
      evaluatorPersona: observation.evaluatorPersona,
      taskCompletionStatus: observation.taskCompletionStatus,
      taskDurationSeconds: duration,
      workflowSatisfactionRating: observation.workflowSatisfactionRating,
      cognitiveFrictionNotes: frictionNotes,
      musicalFitnessVerdict: observation.musicalFitnessVerdict,
      uatBlockersIdentified: deepFreeze(blockers),
      metricProfileRef,
    });
  }
}
