// src/sound-engineer/validation/evidence/uatTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-13:
// User Acceptance Testing (UAT) Multi-Persona Workflow Engine (Record 12).
// Bound to frozen specification v0.1j Section 17, Section 33, and Implementation Plan v0.1h WP-13.

import {
  EVALUATOR_PERSONAS,
  EvaluatorPersona,
  MUSICAL_FITNESS_VERDICTS,
  MusicalFitnessVerdict,
  TASK_COMPLETION_STATUSES,
  TaskCompletionStatus,
  TEST_PROFILE_FAMILIES,
} from "../schemas/enums";
import {
  UATEvaluationRecord,
  ValidationPackage,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph";
import { ValidationAuditLedger } from "../storage";
import { IntegrityProvider } from "../schemas/integrity";

/**
 * The exact four canonical UAT evaluator personas governed by Section 17.2 and Section 33.
 */
export const CANONICAL_EVALUATOR_PERSONAS: ReadonlyArray<EvaluatorPersona> = [
  EVALUATOR_PERSONAS.RECORDING_ENGINEER,
  EVALUATOR_PERSONAS.SESSION_GUITARIST,
  EVALUATOR_PERSONAS.PRODUCER,
  EVALUATOR_PERSONAS.PLATFORM_ARCHITECT,
] as const;

/**
 * The exact three canonical task completion statuses governed by Section 17.3 and Section 33.
 */
export const CANONICAL_TASK_COMPLETION_STATUSES: ReadonlyArray<TaskCompletionStatus> = [
  TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
  TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
  TASK_COMPLETION_STATUSES.FAILED,
] as const;

/**
 * The exact three canonical musical fitness verdicts governed by Section 17.3 and Section 33.
 */
export const CANONICAL_MUSICAL_FITNESS_VERDICTS: ReadonlyArray<MusicalFitnessVerdict> = [
  MUSICAL_FITNESS_VERDICTS.ACCEPTED,
  MUSICAL_FITNESS_VERDICTS.REJECTED,
  MUSICAL_FITNESS_VERDICTS.CONDITIONALLY_ACCEPTED,
] as const;

/**
 * The two test profile families that govern UAT validation activities:
 * - PROFILE-07: Playability
 * - PROFILE-14: User-Workflow / UAT
 */
export const CANONICAL_UAT_PROFILES = [
  TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY,
  TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT,
] as const;

/**
 * Definition of a version-bound UAT Metric Profile governing workflow satisfaction.
 * Enforces Anti-Universal-Scorecard discipline (no universal 1-5, 1-10, or default pass threshold).
 */
export interface UATMetricProfile {
  /** Stable profile identifier reference, e.g. "uat_metric_profile_ref:recording_engineer_mix_context_v1" */
  readonly profileRef: string;
  /** Human-readable descriptive name */
  readonly ratingName: string;
  /** Minimum allowable numeric rating */
  readonly minRating: number;
  /** Maximum allowable numeric rating */
  readonly maxRating: number;
  /** Custom validation logic for granularity, scale steps, or discrete values */
  readonly validateRating: (rating: number) => boolean;
  /** Optional target duration recommended for the scenario in seconds */
  readonly targetDurationSeconds?: number;
  /** Optional hard ceiling on allowable task duration in seconds */
  readonly maxAllowableDurationSeconds?: number;
  /** Rationale or specification description */
  readonly description?: string;
}

/**
 * Data-driven representation of a bounded UAT task scenario.
 */
export interface TaskScenario {
  /** Stable identifier for the scenario */
  readonly taskScenarioId: string;
  /** Descriptive title */
  readonly title: string;
  /** Bounded user task description */
  readonly description: string;
  /** The test profile(s) governing this scenario (e.g. "PROFILE-14", "PROFILE-07") */
  readonly applicableProfiles: ReadonlyArray<string>;
  /** The canonical personas applicable/targeted for this task */
  readonly targetPersonas: ReadonlyArray<EvaluatorPersona>;
  /** Scoped units or boundary constraints in scope */
  readonly scopedBoundaries: ReadonlyArray<string>;
  /** Governing UAT metric profile reference for satisfaction scoring */
  readonly metricProfileRef: string;
  /** Optional non-normative illustrative scenario context (e.g. "touring guitarist", "bedroom producer") */
  readonly illustrativeContext?: string;
}

/**
 * Observed outcome parameters for a single UAT task scenario execution.
 */
export interface TaskExecutionObservation {
  readonly taskScenarioId: string;
  readonly evaluatorPersona: EvaluatorPersona;
  readonly taskCompletionStatus: TaskCompletionStatus;
  readonly taskDurationSeconds: number;
  readonly workflowSatisfactionRating: number;
  readonly cognitiveFrictionNotes: string;
  readonly musicalFitnessVerdict: MusicalFitnessVerdict;
  readonly uatBlockersIdentified: ReadonlyArray<string>;
  /** Optional explicit metric profile override (defaults to scenario's profileRef) */
  readonly metricProfileRef?: string;
  /** Optional custom persona endpoint ID for graph (defaults to canonical `evaluator_persona:${persona}`) */
  readonly evaluatorPersonaId?: string;
}

/**
 * Complete input required by UATEvaluationEngine to record a governed Record 12 evaluation.
 */
export interface UATEvaluationInput {
  /** The parent ValidationPackage under evaluation */
  readonly packageRecord: ValidationPackage;
  /** The observed evaluation data */
  readonly observation: TaskExecutionObservation;
  /** Optional task scenario definition (if not already registered in engine) */
  readonly scenario?: TaskScenario;
  /** Optional deterministic UAT ID (if omitted, engine generates a canonical one) */
  readonly uatId?: string;
}

/**
 * Structured persona coverage report for a ValidationPackage.
 */
export interface UATCoverageReport {
  readonly packageId: string;
  readonly requiredPersonas: ReadonlyArray<EvaluatorPersona>;
  readonly evaluatedPersonas: ReadonlyArray<EvaluatorPersona>;
  readonly missingPersonas: ReadonlyArray<EvaluatorPersona>;
  readonly isCoverageComplete: boolean;
  readonly evaluationCount: number;
  readonly evaluationsByPersona: Readonly<Record<EvaluatorPersona, ReadonlyArray<UATEvaluationRecord>>>;
}

/**
 * Optional dependencies for initializing UATEvaluationEngine.
 */
export interface UATEngineDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly integrityProvider?: IntegrityProvider;
  readonly metricResolver?: UATMetricResolverInterface;
  readonly scenarios?: ReadonlyArray<TaskScenario>;
}

/**
 * Contract for resolving and validating UAT metric profiles.
 */
export interface UATMetricResolverInterface {
  resolve(profileRef: string): UATMetricProfile;
  hasProfile(profileRef: string): boolean;
  validateRating(profileRef: string, rating: number): boolean;
}
