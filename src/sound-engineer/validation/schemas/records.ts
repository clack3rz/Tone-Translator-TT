// src/sound-engineer/validation/schemas/records.ts
// Authoritative TypeScript types, Zod runtime validators, and JSON schemas
// for all twenty-two governed Phase 1C.5h records.
// Frozen authoritative specification: v0.1j / Implementation Plan v0.1g

import { z } from "zod";
import {
  INTAKE_STATUSES,
  VALIDATION_PRIMARY_DOMAINS,
  READINESS_OUTCOMES,
  PREREQUISITE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  TOLERANCE_EVALUATIONS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  EVALUATOR_PERSONAS,
  TASK_COMPLETION_STATUSES,
  MUSICAL_FITNESS_VERDICTS,
  REGRESSION_CLASSIFICATIONS,
  MATERIALITY_SCORES,
  REGRESSION_DOMAINS,
  FAILURE_ATTRIBUTION_CLASSES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  FAILURE_MATERIALITIES,
  CONFLICT_TYPES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_RESOLUTION_STATUSES,
  UNCERTAINTY_SOURCES,
  UNCERTAINTY_GATE_8_IMPACTS,
  VALIDATION_OUTCOME_CLASSES,
  REVALIDATION_TRIGGER_SOURCES,
  REVALIDATION_REQUIRED_ACTIONS,
  PILLAR_READINESS_STATUSES,
  ADOPTION_DECISION_OUTCOMES,
  GOVERNANCE_STATUSES,
  PREVIOUS_GOVERNANCE_STATUSES,
  NEW_GOVERNANCE_STATUSES,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_EFFECTS,
  REQUIRED_ADOPTION_RESPONSES,
} from "./enums";
import {
  recordIntegrityMetadataSchema,
  versionIntegrityReferenceSchema,
  architectureVersionMatrixSchema,
  RecordIntegrityMetadata,
  VersionIntegrityReference,
  ArchitectureVersionMatrix,
} from "./integrity";

// ---------------------------------------------------------------------------
// 1. ValidationIntakeRecord
// ---------------------------------------------------------------------------
export const validationIntakeRecordSchema = z
  .object({
    intake_id: z.string().min(1, "intake_id must not be empty"),
    timestamp: z.string().datetime({ message: "timestamp must be an ISO 8601 UTC timestamp" }),
    handoff_package_id: z.string().min(1, "handoff_package_id must not be empty"),
    handoff_package_integrity_ref: z.string().min(1, "handoff_package_integrity_ref must not be empty"),
    migration_batch_id: z.string().min(1, "migration_batch_id must not be empty"),
    requested_by: z.string().min(1, "requested_by must not be empty"),
    declared_scope: z.string().min(1, "declared_scope must not be empty"),
    frozen_upstream_versions: z.record(z.string(), z.string()),
    target_platform_declared_version: z.string().min(1, "target_platform_declared_version must not be empty"),
    intake_status: z.enum([INTAKE_STATUSES.INTAKE_ACCEPTED, INTAKE_STATUSES.INTAKE_REJECTED]),
    rejection_reason: z.string().optional(),
    record_integrity_metadata: recordIntegrityMetadataSchema,
  })
  .strict();

export type ValidationIntakeRecord = Readonly<z.infer<typeof validationIntakeRecordSchema>>;

// ---------------------------------------------------------------------------
// 2. ValidationScopeRecord
// ---------------------------------------------------------------------------
export const validationScopeRecordSchema = z
  .object({
    scope_id: z.string().min(1, "scope_id must not be empty"),
    intake_id: z.string().min(1, "intake_id must not be empty"),
    primary_domain: z.enum([
      VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      VALIDATION_PRIMARY_DOMAINS.REASONING_CAPABILITY,
      VALIDATION_PRIMARY_DOMAINS.PLATFORM_EXPORT,
      VALIDATION_PRIMARY_DOMAINS.END_TO_END_WORKFLOW,
    ]),
    included_units: z.array(z.string().min(1)).min(1, "included_units must not be empty"),
    excluded_units: z.array(z.string().min(1)),
    boundary_constraints: z.array(z.string().min(1)),
    scope_inflation_protection: z.boolean(),
  })
  .strict();

export type ValidationScopeRecord = Readonly<z.infer<typeof validationScopeRecordSchema>>;

// ---------------------------------------------------------------------------
// 3. ValidationVersionBindingRecord
// ---------------------------------------------------------------------------
export const validationVersionBindingRecordSchema = z
  .object({
    binding_id: z.string().min(1, "binding_id must not be empty"),
    scope_id: z.string().min(1, "scope_id must not be empty"),
    architecture_version_matrix: architectureVersionMatrixSchema,
    runtime_implementation_version: z.string().min(1, "runtime_implementation_version must not be empty"),
    model_configuration_version: z.string().min(1, "model_configuration_version must not be empty"),
    deterministic_rules_version: z.string().min(1, "deterministic_rules_version must not be empty"),
    gear_catalog_version: z.string().min(1, "gear_catalog_version must not be empty"),
    platform_exporter_version: z.string().min(1, "platform_exporter_version must not be empty"),
    fixture_library_version: z.string().min(1, "fixture_library_version must not be empty"),
    target_platform_runtime_version: z.string().min(1, "target_platform_runtime_version must not be empty"),
    host_environment_version: z.string().min(1, "host_environment_version must not be empty"),
    version_integrity_reference: versionIntegrityReferenceSchema,
  })
  .strict();

export type ValidationVersionBindingRecord = Readonly<z.infer<typeof validationVersionBindingRecordSchema>>;

// ---------------------------------------------------------------------------
// 4. ValidationReadinessAssessmentRecord
// ---------------------------------------------------------------------------
export const validationReadinessAssessmentRecordSchema = z
  .object({
    readiness_id: z.string().min(1, "readiness_id must not be empty"),
    intake_id: z.string().min(1, "intake_id must not be empty"),
    evaluated_prerequisites: z.record(
      z.string(),
      z.enum([
        PREREQUISITE_STATUSES.PASS,
        PREREQUISITE_STATUSES.FAIL,
        PREREQUISITE_STATUSES.BLOCKED,
      ])
    ),
    fixture_coverage_ratio: z.number().min(0).max(1),
    readiness_outcome: z.enum([
      READINESS_OUTCOMES.READY,
      READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE,
      READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS,
    ]),
    limitation_notes: z.array(z.string()),
    assessment_timestamp: z.string().datetime({ message: "assessment_timestamp must be ISO 8601 UTC" }),
    assessor_id: z.string().min(1, "assessor_id must not be empty"),
  })
  .strict();

export type ValidationReadinessAssessmentRecord = Readonly<z.infer<typeof validationReadinessAssessmentRecordSchema>>;

// ---------------------------------------------------------------------------
// 5. ValidationCase
// ---------------------------------------------------------------------------
export const validationCaseSchema = z
  .object({
    case_id: z.string().min(1, "case_id must not be empty"),
    title: z.string().min(1, "title must not be empty"),
    validation_question: z.string().min(1, "validation_question must not be empty"),
    validation_subject: z.string().min(1, "validation_subject must not be empty"),
    scoped_boundaries: z.array(z.string().min(1)),
    applicable_test_dimensions: z.array(z.string().min(1)),
    required_evidence_classes: z
      .array(
        z.enum([
          REQUIRED_EVIDENCE_CLASSES.OBJECTIVE,
          REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL,
          REQUIRED_EVIDENCE_CLASSES.OPERATIONAL,
          REQUIRED_EVIDENCE_CLASSES.MIXED,
        ])
      )
      .min(1),
    associated_fixture_set: z.array(z.string().min(1)),
    evaluation_methodology: z.string().min(1, "evaluation_methodology must not be empty"),
    acceptance_criteria_ref: z.string().min(1, "acceptance_criteria_ref must not be empty"),
    failure_consequence: z.string().min(1, "failure_consequence must not be empty"),
    expected_remand_destination: z.string().min(1, "expected_remand_destination must not be empty"),
  })
  .strict();

export type ValidationCase = Readonly<z.infer<typeof validationCaseSchema>>;

// ---------------------------------------------------------------------------
// 6. ValidationPackage
// ---------------------------------------------------------------------------
export const validationPackageSchema = z
  .object({
    package_id: z.string().min(1, "package_id must not be empty"),
    intake_id: z.string().min(1, "intake_id must not be empty"),
    scope_record_ref: z.string().min(1, "scope_record_ref must not be empty"),
    version_binding_ref: z.string().min(1, "version_binding_ref must not be empty"),
    assigned_test_profiles: z.array(z.string().min(1)),
    validation_case_refs: z.array(z.string().min(1)),
    execution_record_refs: z.array(z.string().min(1)),
    evidence_refs: z.array(z.string().min(1)),
    outcome_record_ref: z.string().optional(),
    gate8_decision_ref: z.string().optional(),
  })
  .strict();

export type ValidationPackage = Readonly<z.infer<typeof validationPackageSchema>>;

// ---------------------------------------------------------------------------
// 7. TestProfileRecord
// ---------------------------------------------------------------------------
export const testProfileRecordSchema = z
  .object({
    profile_id: z.string().min(1, "profile_id must not be empty"),
    profile_family: z.enum([
      TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
      TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER,
      TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT,
      TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE,
      TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING,
      TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY,
      TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT,
      TEST_PROFILE_FAMILIES.PROFILE_09_REGRESSION,
      TEST_PROFILE_FAMILIES.PROFILE_10_OPERATIONAL_STABILITY,
      TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK,
      TEST_PROFILE_FAMILIES.PROFILE_12_ADVERSARIAL_EDGE_CASE,
      TEST_PROFILE_FAMILIES.PROFILE_13_TRACEABILITY_GOVERNANCE,
      TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT,
    ]),
    target_component_class: z.string().min(1, "target_component_class must not be empty"),
    required_analyses: z.array(z.string().min(1)),
    applicable_fixture_classes: z.array(
      z.enum([
        FIXTURE_CLASSES.DI_PERFORMANCE,
        FIXTURE_CLASSES.REFERENCE_TONE,
        FIXTURE_CLASSES.APPROVED_PRESET,
        FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
        FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
        FIXTURE_CLASSES.MULTITRACK_CONTEXT,
        FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
        FIXTURE_CLASSES.WORKFLOW_PROMPT,
      ])
    ),
    tolerance_criteria_spec: z.string().min(1, "tolerance_criteria_spec must not be empty"),
    applicability_rules: z.array(z.string().min(1)),
  })
  .strict();

export type TestProfileRecord = Readonly<z.infer<typeof testProfileRecordSchema>>;

// ---------------------------------------------------------------------------
// 8. ValidationFixtureRecord
// ---------------------------------------------------------------------------
export const fixtureProvenanceMetadataSchema = z
  .object({
    instrument_details: z.string().optional(),
    capture_hardware: z.string().optional(),
    recording_engineer: z.string().optional(),
    capture_date: z.string().optional(),
  })
  .strict();

export type FixtureProvenanceMetadata = Readonly<z.infer<typeof fixtureProvenanceMetadataSchema>>;

export const validationFixtureRecordSchema = z
  .object({
    fixture_id: z.string().min(1, "fixture_id must not be empty"),
    fixture_name: z.string().min(1, "fixture_name must not be empty"),
    fixture_class: z.enum([
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
      FIXTURE_CLASSES.MULTITRACK_CONTEXT,
      FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
      FIXTURE_CLASSES.WORKFLOW_PROMPT,
    ]),
    version: z.string().min(1, "version must not be empty"),
    payload_integrity_ref: z.string().min(1, "payload_integrity_ref must not be empty"),
    declared_applicability_scope: z.array(z.string().min(1)),
    provenance_metadata: fixtureProvenanceMetadataSchema,
    calibration_spec: z.string().min(1, "calibration_spec must not be empty"),
    contamination_status: z.enum([
      FIXTURE_CONTAMINATION_STATUSES.CLEAN,
      FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
      FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
    ]),
    lifecycle_status: z.enum([
      FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
      FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      FIXTURE_LIFECYCLE_STATUSES.RETIRED,
    ]),
    superseding_fixture_id: z.string().optional(),
  })
  .strict();

export type ValidationFixtureRecord = Readonly<z.infer<typeof validationFixtureRecordSchema>>;

// ---------------------------------------------------------------------------
// 9. ValidationExecutionRecord
// ---------------------------------------------------------------------------
export const validationExecutionRecordSchema = z
  .object({
    execution_id: z.string().min(1, "execution_id must not be empty"),
    case_id: z.string().min(1, "case_id must not be empty"),
    profile_id: z.string().min(1, "profile_id must not be empty"),
    fixture_id: z.string().min(1, "fixture_id must not be empty"),
    binding_id: z.string().min(1, "binding_id must not be empty"),
    execution_timestamp: z.string().datetime({ message: "execution_timestamp must be ISO 8601 UTC" }),
    execution_environment: z.string().min(1, "execution_environment must not be empty"),
    input_audio_integrity_ref: z.string().min(1, "input_audio_integrity_ref must not be empty"),
    output_audio_integrity_ref: z.string().min(1, "output_audio_integrity_ref must not be empty"),
    execution_duration_ms: z.number().nonnegative(),
    anomalies_detected: z.array(z.string()),
    raw_measurements: z.record(z.string(), z.unknown()),
    outcome: z.enum([
      EXECUTION_OUTCOMES.COMPLETED,
      EXECUTION_OUTCOMES.FAILED,
      EXECUTION_OUTCOMES.ABORTED,
      EXECUTION_OUTCOMES.INCONCLUSIVE,
    ]),
    trace_ref: z.string().min(1, "trace_ref must not be empty"),
  })
  .strict();

export type ValidationExecutionRecord = Readonly<z.infer<typeof validationExecutionRecordSchema>>;

// ---------------------------------------------------------------------------
// 10. ObjectiveEvidenceRecord
// ---------------------------------------------------------------------------
export const objectiveEvidenceRecordSchema = z
  .object({
    objective_evidence_id: z.string().min(1, "objective_evidence_id must not be empty"),
    execution_id: z.string().min(1, "execution_id must not be empty"),
    metric_category: z.enum([
      OBJECTIVE_METRIC_CATEGORIES.STRUCTURAL_SCHEMA,
      OBJECTIVE_METRIC_CATEGORIES.PARAMETER_BOUNDS,
      OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY,
      OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      OBJECTIVE_METRIC_CATEGORIES.DYNAMIC_ENVELOPE,
      OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
      OBJECTIVE_METRIC_CATEGORIES.PHASE_COHERENCE,
      OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE,
    ]),
    measured_parameters: z.record(z.string(), z.unknown()),
    applied_threshold_profile_ref: z.string().min(1, "applied_threshold_profile_ref must not be empty"),
    tolerance_evaluation: z.enum([
      TOLERANCE_EVALUATIONS.MET,
      TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      TOLERANCE_EVALUATIONS.BORDERLINE,
      TOLERANCE_EVALUATIONS.NOT_APPLICABLE,
    ]),
    measured_delta: z.number(),
    objective_pass_fail: z.enum([
      OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
      OBJECTIVE_PASS_FAIL_STATUSES.INCONCLUSIVE,
    ]),
    artifacts_retained: z.array(z.string()),
  })
  .strict();

export type ObjectiveEvidenceRecord = Readonly<z.infer<typeof objectiveEvidenceRecordSchema>>;

// ---------------------------------------------------------------------------
// 11. PerceptualEvaluationRecord
// ---------------------------------------------------------------------------
export const listeningEnvironmentSchema = z
  .object({
    monitor_type: z.string().min(1),
    calibrated_spl_profile_ref: z.string().min(1),
    acoustic_treatment_level: z.string().min(1),
  })
  .strict();

export type ListeningEnvironment = Readonly<z.infer<typeof listeningEnvironmentSchema>>;

export const perceptualEvaluationRecordSchema = z
  .object({
    perceptual_evidence_id: z.string().min(1, "perceptual_evidence_id must not be empty"),
    execution_id: z.string().min(1, "execution_id must not be empty"),
    evaluator_id: z.string().min(1, "evaluator_id must not be empty"),
    evaluator_role: z.enum([
      PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      PERCEPTUAL_EVALUATOR_ROLES.SESSION_GUITARIST,
      PERCEPTUAL_EVALUATOR_ROLES.PRODUCER,
      PERCEPTUAL_EVALUATOR_ROLES.PLATFORM_SPECIALIST,
    ]),
    methodology_used: z.enum([
      PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW,
      PERCEPTUAL_METHODOLOGIES.AB_TESTING,
      PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
      PERCEPTUAL_METHODOLOGIES.ABX_TESTING,
      PERCEPTUAL_METHODOLOGIES.MUSHRA,
      PERCEPTUAL_METHODOLOGIES.PAIRED_COMPARISON,
      PERCEPTUAL_METHODOLOGIES.REFERENCE_MATCHING,
      PERCEPTUAL_METHODOLOGIES.DEFECT_DETECTION_PANEL,
      PERCEPTUAL_METHODOLOGIES.MUSICAL_CONTEXT,
      PERCEPTUAL_METHODOLOGIES.INTERACTIVE_PLAYABILITY,
      PERCEPTUAL_METHODOLOGIES.EXTENDED_LISTENING_FATIGUE,
    ]),
    listening_environment: listeningEnvironmentSchema,
    presented_stimuli_refs: z.record(z.string(), z.string()),
    perceptual_dimensions_evaluated: z.record(z.string(), z.union([z.number(), z.string()])),
    qualitative_observations: z.string(),
    confidence: z.enum([
      PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      PERCEPTUAL_CONFIDENCE_LEVELS.MEDIUM,
      PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
    ]),
    evaluation_outcome: z.enum([
      PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE,
    ]),
  })
  .strict();

export type PerceptualEvaluationRecord = Readonly<z.infer<typeof perceptualEvaluationRecordSchema>>;

// ---------------------------------------------------------------------------
// 12. UATEvaluationRecord
// ---------------------------------------------------------------------------
export const uatEvaluationRecordSchema = z
  .object({
    uat_id: z.string().min(1, "uat_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    evaluator_persona: z.enum([
      EVALUATOR_PERSONAS.RECORDING_ENGINEER,
      EVALUATOR_PERSONAS.SESSION_GUITARIST,
      EVALUATOR_PERSONAS.PRODUCER,
      EVALUATOR_PERSONAS.PLATFORM_ARCHITECT,
    ]),
    task_scenario_id: z.string().min(1, "task_scenario_id must not be empty"),
    task_completion_status: z.enum([
      TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
      TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
      TASK_COMPLETION_STATUSES.FAILED,
    ]),
    task_duration_seconds: z.number().nonnegative(),
    workflow_satisfaction_rating: z.number(),
    cognitive_friction_notes: z.string(),
    musical_fitness_verdict: z.enum([
      MUSICAL_FITNESS_VERDICTS.ACCEPTED,
      MUSICAL_FITNESS_VERDICTS.REJECTED,
      MUSICAL_FITNESS_VERDICTS.CONDITIONALLY_ACCEPTED,
    ]),
    uat_blockers_identified: z.array(z.string()),
  })
  .strict();

export type UATEvaluationRecord = Readonly<z.infer<typeof uatEvaluationRecordSchema>>;

// ---------------------------------------------------------------------------
// 13. RegressionAssessmentRecord
// ---------------------------------------------------------------------------
export const regressionAssessmentRecordSchema = z
  .object({
    regression_id: z.string().min(1, "regression_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    comparison_target: z.string().min(1, "comparison_target must not be empty"),
    divergence_detected: z.boolean(),
    divergence_magnitude: z.union([z.number(), z.string()]),
    classification: z.enum([
      REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      REGRESSION_CLASSIFICATIONS.NEUTRAL,
      REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION,
      REGRESSION_CLASSIFICATIONS.UNRESOLVED,
    ]),
    materiality_score: z.enum([
      MATERIALITY_SCORES.HIGH,
      MATERIALITY_SCORES.MEDIUM,
      MATERIALITY_SCORES.LOW,
      MATERIALITY_SCORES.NEGLIGIBLE,
    ]),
    affected_scope: z.array(z.string().min(1)),
    regression_domain: z.enum([
      REGRESSION_DOMAINS.ACOUSTIC,
      REGRESSION_DOMAINS.FUNCTIONAL,
      REGRESSION_DOMAINS.EXPORT,
      REGRESSION_DOMAINS.OPERATIONAL,
      REGRESSION_DOMAINS.PLAYABILITY,
    ]),
    detailed_justification: z.string(),
    blocks_gate_8: z.boolean(),
  })
  .strict();

export type RegressionAssessmentRecord = Readonly<z.infer<typeof regressionAssessmentRecordSchema>>;

// ---------------------------------------------------------------------------
// 14. ValidationFailureRecord
// ---------------------------------------------------------------------------
export const validationFailureRecordSchema = z
  .object({
    failure_id: z.string().min(1, "failure_id must not be empty"),
    execution_id: z.string().min(1, "execution_id must not be empty"),
    failure_timestamp: z.string().datetime({ message: "failure_timestamp must be ISO 8601 UTC" }),
    failure_title: z.string().min(1, "failure_title must not be empty"),
    failure_symptom: z.string().min(1, "failure_symptom must not be empty"),
    attribution_class: z.enum([
      FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
      FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
      FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
      FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
      FAILURE_ATTRIBUTION_CLASSES.REASONING,
      FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
      FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM,
      FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
      FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
    ]),
    attribution_evidence_refs: z.array(z.string().min(1)),
    attribution_confidence: z.enum([
      ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
      ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
      ATTRIBUTION_CONFIDENCE_LEVELS.SUSPECTED,
    ]),
    materiality: z.enum([
      FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      FAILURE_MATERIALITIES.MAJOR,
      FAILURE_MATERIALITIES.MINOR,
      FAILURE_MATERIALITIES.COSMETIC,
    ]),
    affected_scope: z.array(z.string().min(1)),
    gate_8_blocked: z.boolean(),
    remand_destination: z.string().min(1, "remand_destination must not be empty"),
    retest_prerequisites: z.string().min(1, "retest_prerequisites must not be empty"),
  })
  .strict();

export type ValidationFailureRecord = Readonly<z.infer<typeof validationFailureRecordSchema>>;

// ---------------------------------------------------------------------------
// 15. EvidenceConflictRecord
// ---------------------------------------------------------------------------
export const evidenceConflictRecordSchema = z
  .object({
    conflict_id: z.string().min(1, "conflict_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    conflict_type: z.enum([
      CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL,
      CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
      CONFLICT_TYPES.SHADOW_VS_PROD_DIVERGENCE,
      CONFLICT_TYPES.FIXTURE_VS_SIMULATION,
      CONFLICT_TYPES.MULTI_METHODOLOGY_DISCREPANCY,
    ]),
    competing_evidence_refs: z.array(z.string().min(1)).min(2, "Must reference at least 2 competing evidence items"),
    conflict_description: z.string().min(1, "conflict_description must not be empty"),
    underlying_acoustic_phenomenon: z.string(),
    resolution_strategy: z.enum([
      CONFLICT_RESOLUTION_STRATEGIES.CONDUCT_TARGETED_RETEST,
      CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
      CONFLICT_RESOLUTION_STRATEGIES.DECLARED_INTENTIONAL_CORRECTION,
      CONFLICT_RESOLUTION_STRATEGIES.ESCALATE_TO_STAGE_14_REVIEW,
    ]),
    resolution_status: z.enum([
      CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
      CONFLICT_RESOLUTION_STATUSES.RESOLVED_BY_PANEL,
      CONFLICT_RESOLUTION_STATUSES.ACCEPTED_TRADE_OFF,
    ]),
    residual_uncertainty_score: z.union([z.number(), z.string()]),
  })
  .strict();

export type EvidenceConflictRecord = Readonly<z.infer<typeof evidenceConflictRecordSchema>>;

// ---------------------------------------------------------------------------
// 16. ValidationUncertaintyRecord
// ---------------------------------------------------------------------------
export const validationUncertaintyRecordSchema = z
  .object({
    uncertainty_id: z.string().min(1, "uncertainty_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    uncertainty_source: z.enum([
      UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
      UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE,
      UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE,
      UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
      UNCERTAINTY_SOURCES.CALIBRATION_AMBIGUITY,
      UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE,
      UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY,
    ]),
    affected_scope: z.array(z.string().min(1)),
    potential_production_risk: z.string(),
    gate_8_impact: z.enum([
      UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
      UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
    ]),
    required_monitoring_if_authorized: z.array(z.string()),
  })
  .strict();

export type ValidationUncertaintyRecord = Readonly<z.infer<typeof validationUncertaintyRecordSchema>>;

// ---------------------------------------------------------------------------
// 17. ValidationOutcomeRecord
// ---------------------------------------------------------------------------
export const validationOutcomeRecordSchema = z
  .object({
    outcome_id: z.string().min(1, "outcome_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    outcome_class: z.enum([
      VALIDATION_OUTCOME_CLASSES.PASS,
      VALIDATION_OUTCOME_CLASSES.FAIL,
      VALIDATION_OUTCOME_CLASSES.BLOCKED,
      VALIDATION_OUTCOME_CLASSES.CONDITIONAL,
    ]),
    evaluated_scope: z.string().min(1, "evaluated_scope must not be empty"),
    version_binding: z.string().min(1, "version_binding must not be empty"),
    summary_verdict: z.string().min(1, "summary_verdict must not be empty"),
    objective_summary: z.record(z.string(), z.unknown()),
    perceptual_summary: z.record(z.string(), z.unknown()),
    uat_summary: z.record(z.string(), z.unknown()),
    regression_summary: z.record(z.string(), z.unknown()),
    unresolved_issues: z.array(z.string()),
    conditions_imposed: z.array(z.string()),
    timestamp: z.string().datetime({ message: "timestamp must be ISO 8601 UTC" }),
    record_integrity_metadata: recordIntegrityMetadataSchema,
  })
  .strict();

export type ValidationOutcomeRecord = Readonly<z.infer<typeof validationOutcomeRecordSchema>>;

// ---------------------------------------------------------------------------
// 18. RevalidationTriggerRecord
// ---------------------------------------------------------------------------
export const revalidationTriggerRecordSchema = z
  .object({
    trigger_id: z.string().min(1, "trigger_id must not be empty"),
    trigger_source: z.enum([
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
      REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
    ]),
    prior_binding_id: z.string().min(1, "prior_binding_id must not be empty"),
    new_binding_id: z.string().min(1, "new_binding_id must not be empty"),
    affected_scope: z.array(z.string().min(1)),
    required_action: z.enum([
      REVALIDATION_REQUIRED_ACTIONS.NO_ACTION,
      REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST,
      REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST,
      REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
    ]),
    trigger_timestamp: z.string().datetime({ message: "trigger_timestamp must be ISO 8601 UTC" }),
  })
  .strict();

export type RevalidationTriggerRecord = Readonly<z.infer<typeof revalidationTriggerRecordSchema>>;

// ---------------------------------------------------------------------------
// 19. RetestPlanRecord
// ---------------------------------------------------------------------------
export const retestPlanRecordSchema = z
  .object({
    retest_plan_id: z.string().min(1, "retest_plan_id must not be empty"),
    trigger_id: z.string().min(1, "trigger_id must not be empty"),
    previous_package_id: z.string().min(1, "previous_package_id must not be empty"),
    retained_valid_evidence_refs: z.array(z.string().min(1)),
    invalidated_evidence_refs: z.array(z.string().min(1)),
    required_new_cases: z.array(z.string().min(1)),
    retest_scope: z.array(z.string().min(1)),
  })
  .strict();

export type RetestPlanRecord = Readonly<z.infer<typeof retestPlanRecordSchema>>;

// ---------------------------------------------------------------------------
// 20. ProductionReadinessAssessmentRecord
// ---------------------------------------------------------------------------
export const pillarEvaluationsSchema = z
  .object({
    acoustic_musical_readiness: z.enum([
      PILLAR_READINESS_STATUSES.SATISFIED,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      PILLAR_READINESS_STATUSES.INCONCLUSIVE,
    ]),
    reasoning_governance_readiness: z.enum([
      PILLAR_READINESS_STATUSES.SATISFIED,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      PILLAR_READINESS_STATUSES.INCONCLUSIVE,
    ]),
    platform_operational_readiness: z.enum([
      PILLAR_READINESS_STATUSES.SATISFIED,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      PILLAR_READINESS_STATUSES.INCONCLUSIVE,
    ]),
    rollback_safety_readiness: z.enum([
      PILLAR_READINESS_STATUSES.SATISFIED,
      PILLAR_READINESS_STATUSES.DEFICIENT,
      PILLAR_READINESS_STATUSES.INCONCLUSIVE,
    ]),
  })
  .strict();

export type PillarEvaluations = Readonly<z.infer<typeof pillarEvaluationsSchema>>;

export const productionReadinessAssessmentRecordSchema = z
  .object({
    readiness_assessment_id: z.string().min(1, "readiness_assessment_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    pillar_evaluations: pillarEvaluationsSchema,
    hard_blockers_present: z.array(z.string()),
    gate_8_eligible: z.boolean(),
    synthesis_rationale: z.string().min(1, "synthesis_rationale must not be empty"),
    assessment_timestamp: z.string().datetime({ message: "assessment_timestamp must be ISO 8601 UTC" }),
  })
  .strict();

export type ProductionReadinessAssessmentRecord = Readonly<z.infer<typeof productionReadinessAssessmentRecordSchema>>;

// ---------------------------------------------------------------------------
// 21. AdoptionDecisionRecord
// ---------------------------------------------------------------------------
export const adoptionDecisionRecordSchema = z
  .object({
    decision_id: z.string().min(1, "decision_id must not be empty"),
    package_id: z.string().min(1, "package_id must not be empty"),
    readiness_assessment_id: z.string().min(1, "readiness_assessment_id must not be empty"),
    requested_scope: z.array(z.string().min(1)),
    authorized_scope: z.array(z.string().min(1)),
    version_binding_integrity_ref: z.string().min(1, "version_binding_integrity_ref must not be empty"),
    decision_outcome: z.enum([
      ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      ADOPTION_DECISION_OUTCOMES.REJECTED,
      ADOPTION_DECISION_OUTCOMES.BLOCKED,
    ]),
    decision_timestamp: z.string().datetime({ message: "decision_timestamp must be ISO 8601 UTC" }),
    conditions_and_restrictions: z.array(z.string()),
    mandatory_monitoring_rules: z.array(z.string()),
    rollback_verification_cert_ref: z.string().min(1, "rollback_verification_cert_ref must not be empty"),
    governance_status: z.enum([
      GOVERNANCE_STATUSES.ACTIVE,
      GOVERNANCE_STATUSES.SUSPENDED,
      GOVERNANCE_STATUSES.RESTRICTED,
      GOVERNANCE_STATUSES.WITHDRAWN,
      GOVERNANCE_STATUSES.SUPERSEDED,
    ]),
    authorizing_official: z.string().min(1, "authorizing_official must not be empty"),
    record_integrity_metadata: recordIntegrityMetadataSchema,
  })
  .strict();

export type AdoptionDecisionRecord = Readonly<z.infer<typeof adoptionDecisionRecordSchema>>;

// ---------------------------------------------------------------------------
// 22. Gate8ChangeRecord
// ---------------------------------------------------------------------------
export const gate8ChangeRecordSchema = z
  .object({
    change_id: z.string().min(1, "change_id must not be empty"),
    decision_id: z.string().min(1, "decision_id must not be empty"),
    previous_governance_status: z.enum([
      PREVIOUS_GOVERNANCE_STATUSES.ACTIVE,
      PREVIOUS_GOVERNANCE_STATUSES.SUSPENDED,
      PREVIOUS_GOVERNANCE_STATUSES.RESTRICTED,
    ]),
    new_governance_status: z.enum([
      NEW_GOVERNANCE_STATUSES.SUSPENDED,
      NEW_GOVERNANCE_STATUSES.RESTRICTED,
      NEW_GOVERNANCE_STATUSES.WITHDRAWN,
      NEW_GOVERNANCE_STATUSES.SUPERSEDED,
    ]),
    change_reason: z.string().min(1, "change_reason must not be empty"),
    trigger_source: z.enum([
      GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
      GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
      GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
      GATE8_CHANGE_TRIGGER_SOURCES.DOWNSTREAM_DEFECT,
    ]),
    governance_effect: z.enum([
      GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION,
      GOVERNANCE_EFFECTS.NARROW_SCOPE,
      GOVERNANCE_EFFECTS.REVOKE_AUTHORIZATION,
      GOVERNANCE_EFFECTS.SUPERSEDE_RECORD,
    ]),
    affected_authorization_scope: z.array(z.string().min(1)),
    required_adoption_response: z.enum([
      REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED,
      REQUIRED_ADOPTION_RESPONSES.SCOPE_NARROWED,
      REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED,
      REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE,
    ]),
    revalidation_required: z.boolean(),
    change_timestamp: z.string().datetime({ message: "change_timestamp must be ISO 8601 UTC" }),
    authorizing_official: z.string().min(1, "authorizing_official must not be empty"),
    record_integrity_metadata: recordIntegrityMetadataSchema,
  })
  .strict();

export type Gate8ChangeRecord = Readonly<z.infer<typeof gate8ChangeRecordSchema>>;

// ---------------------------------------------------------------------------
// Type Guards and Parsing Utilities
// ---------------------------------------------------------------------------
export function parseValidationIntakeRecord(data: unknown): ValidationIntakeRecord {
  return validationIntakeRecordSchema.parse(data);
}
export function parseValidationScopeRecord(data: unknown): ValidationScopeRecord {
  return validationScopeRecordSchema.parse(data);
}
export function parseValidationVersionBindingRecord(data: unknown): ValidationVersionBindingRecord {
  return validationVersionBindingRecordSchema.parse(data);
}
export function parseValidationReadinessAssessmentRecord(data: unknown): ValidationReadinessAssessmentRecord {
  return validationReadinessAssessmentRecordSchema.parse(data);
}
export function parseValidationCase(data: unknown): ValidationCase {
  return validationCaseSchema.parse(data);
}
export function parseValidationPackage(data: unknown): ValidationPackage {
  return validationPackageSchema.parse(data);
}
export function parseTestProfileRecord(data: unknown): TestProfileRecord {
  return testProfileRecordSchema.parse(data);
}
export function parseValidationFixtureRecord(data: unknown): ValidationFixtureRecord {
  return validationFixtureRecordSchema.parse(data);
}
export function parseValidationExecutionRecord(data: unknown): ValidationExecutionRecord {
  return validationExecutionRecordSchema.parse(data);
}
export function parseObjectiveEvidenceRecord(data: unknown): ObjectiveEvidenceRecord {
  return objectiveEvidenceRecordSchema.parse(data);
}
export function parsePerceptualEvaluationRecord(data: unknown): PerceptualEvaluationRecord {
  return perceptualEvaluationRecordSchema.parse(data);
}
export function parseUATEvaluationRecord(data: unknown): UATEvaluationRecord {
  return uatEvaluationRecordSchema.parse(data);
}
export function parseRegressionAssessmentRecord(data: unknown): RegressionAssessmentRecord {
  return regressionAssessmentRecordSchema.parse(data);
}
export function parseValidationFailureRecord(data: unknown): ValidationFailureRecord {
  return validationFailureRecordSchema.parse(data);
}
export function parseEvidenceConflictRecord(data: unknown): EvidenceConflictRecord {
  return evidenceConflictRecordSchema.parse(data);
}
export function parseValidationUncertaintyRecord(data: unknown): ValidationUncertaintyRecord {
  return validationUncertaintyRecordSchema.parse(data);
}
export function parseValidationOutcomeRecord(data: unknown): ValidationOutcomeRecord {
  return validationOutcomeRecordSchema.parse(data);
}
export function parseRevalidationTriggerRecord(data: unknown): RevalidationTriggerRecord {
  return revalidationTriggerRecordSchema.parse(data);
}
export function parseRetestPlanRecord(data: unknown): RetestPlanRecord {
  return retestPlanRecordSchema.parse(data);
}
export function parseProductionReadinessAssessmentRecord(data: unknown): ProductionReadinessAssessmentRecord {
  return productionReadinessAssessmentRecordSchema.parse(data);
}
export function parseAdoptionDecisionRecord(data: unknown): AdoptionDecisionRecord {
  return adoptionDecisionRecordSchema.parse(data);
}
export function parseGate8ChangeRecord(data: unknown): Gate8ChangeRecord {
  return gate8ChangeRecordSchema.parse(data);
}

/**
 * Catalogue map of all twenty-two governed Phase 1C.5h schemas.
 */
export const VALIDATION_RECORD_SCHEMAS = {
  ValidationIntakeRecord: validationIntakeRecordSchema,
  ValidationScopeRecord: validationScopeRecordSchema,
  ValidationVersionBindingRecord: validationVersionBindingRecordSchema,
  ValidationReadinessAssessmentRecord: validationReadinessAssessmentRecordSchema,
  ValidationCase: validationCaseSchema,
  ValidationPackage: validationPackageSchema,
  TestProfileRecord: testProfileRecordSchema,
  ValidationFixtureRecord: validationFixtureRecordSchema,
  ValidationExecutionRecord: validationExecutionRecordSchema,
  ObjectiveEvidenceRecord: objectiveEvidenceRecordSchema,
  PerceptualEvaluationRecord: perceptualEvaluationRecordSchema,
  UATEvaluationRecord: uatEvaluationRecordSchema,
  RegressionAssessmentRecord: regressionAssessmentRecordSchema,
  ValidationFailureRecord: validationFailureRecordSchema,
  EvidenceConflictRecord: evidenceConflictRecordSchema,
  ValidationUncertaintyRecord: validationUncertaintyRecordSchema,
  ValidationOutcomeRecord: validationOutcomeRecordSchema,
  RevalidationTriggerRecord: revalidationTriggerRecordSchema,
  RetestPlanRecord: retestPlanRecordSchema,
  ProductionReadinessAssessmentRecord: productionReadinessAssessmentRecordSchema,
  AdoptionDecisionRecord: adoptionDecisionRecordSchema,
  Gate8ChangeRecord: gate8ChangeRecordSchema,
} as const;

export type GovernedRecordName = keyof typeof VALIDATION_RECORD_SCHEMAS;
