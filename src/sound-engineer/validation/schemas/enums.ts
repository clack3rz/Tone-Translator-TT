// src/sound-engineer/validation/schemas/enums.ts
// Authoritative canonical enums for Phase 1C.5h (Empirical Validation & Gate 8 Governance)
// Bound to frozen specification v0.1j and Implementation Plan v0.1g

/**
 * Record 01: Intake status indicating whether the sealed handoff was formally accepted.
 * Transient states (RECEIVED, VERIFYING, VERIFIED) are strictly prohibited from persistence.
 */
export const INTAKE_STATUSES = {
  INTAKE_ACCEPTED: "INTAKE_ACCEPTED",
  INTAKE_REJECTED: "INTAKE_REJECTED",
} as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[keyof typeof INTAKE_STATUSES];

/**
 * Record 02: Primary validation scope domain.
 */
export const VALIDATION_PRIMARY_DOMAINS = {
  GEAR_FAMILY: "GEAR_FAMILY",
  REASONING_CAPABILITY: "REASONING_CAPABILITY",
  PLATFORM_EXPORT: "PLATFORM_EXPORT",
  END_TO_END_WORKFLOW: "END_TO_END_WORKFLOW",
} as const;
export type ValidationPrimaryDomain =
  (typeof VALIDATION_PRIMARY_DOMAINS)[keyof typeof VALIDATION_PRIMARY_DOMAINS];

/**
 * Record 04: Pre-validation readiness assessment outcome.
 */
export const READINESS_OUTCOMES = {
  READY: "READY",
  BLOCKED_NOT_EVALUABLE: "BLOCKED_NOT_EVALUABLE",
  READY_WITH_DECLARED_LIMITATIONS: "READY_WITH_DECLARED_LIMITATIONS",
} as const;
export type ReadinessOutcome = (typeof READINESS_OUTCOMES)[keyof typeof READINESS_OUTCOMES];

/**
 * Record 04: Prerequisite status evaluating individual handoff requirements.
 */
export const PREREQUISITE_STATUSES = {
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
} as const;
export type PrerequisiteStatus = (typeof PREREQUISITE_STATUSES)[keyof typeof PREREQUISITE_STATUSES];

/**
 * Record 05: Required evidence class categories.
 */
export const REQUIRED_EVIDENCE_CLASSES = {
  OBJECTIVE: "OBJECTIVE",
  PERCEPTUAL: "PERCEPTUAL",
  OPERATIONAL: "OPERATIONAL",
  MIXED: "MIXED",
} as const;
export type RequiredEvidenceClass =
  (typeof REQUIRED_EVIDENCE_CLASSES)[keyof typeof REQUIRED_EVIDENCE_CLASSES];

/**
 * Record 07: The fourteen standardized test profile families.
 */
export const TEST_PROFILE_FAMILIES = {
  PROFILE_01_STRUCTURAL_SCHEMA: "PROFILE_01_STRUCTURAL_SCHEMA",
  PROFILE_02_DETERMINISTIC_PARAMETER: "PROFILE_02_DETERMINISTIC_PARAMETER",
  PROFILE_03_TARGET_PLATFORM_EXPORT: "PROFILE_03_TARGET_PLATFORM_EXPORT",
  PROFILE_04_OBJECTIVE_ACOUSTIC: "PROFILE_04_OBJECTIVE_ACOUSTIC",
  PROFILE_05_DYNAMIC_RESPONSE: "PROFILE_05_DYNAMIC_RESPONSE",
  PROFILE_06_PERCEPTUAL_LISTENING: "PROFILE_06_PERCEPTUAL_LISTENING",
  PROFILE_07_PLAYABILITY: "PROFILE_07_PLAYABILITY",
  PROFILE_08_MIX_CONTEXT: "PROFILE_08_MIX_CONTEXT",
  PROFILE_09_REGRESSION: "PROFILE_09_REGRESSION",
  PROFILE_10_OPERATIONAL_STABILITY: "PROFILE_10_OPERATIONAL_STABILITY",
  PROFILE_11_ROLLBACK: "PROFILE_11_ROLLBACK",
  PROFILE_12_ADVERSARIAL_EDGE_CASE: "PROFILE_12_ADVERSARIAL_EDGE_CASE",
  PROFILE_13_TRACEABILITY_GOVERNANCE: "PROFILE_13_TRACEABILITY_GOVERNANCE",
  PROFILE_14_USER_WORKFLOW_UAT: "PROFILE_14_USER_WORKFLOW_UAT",
} as const;
export type TestProfileFamily =
  (typeof TEST_PROFILE_FAMILIES)[keyof typeof TEST_PROFILE_FAMILIES];

/**
 * Record 08: The eight golden acoustic fixture classes.
 */
export const FIXTURE_CLASSES = {
  DI_PERFORMANCE: "DI_PERFORMANCE",
  REFERENCE_TONE: "REFERENCE_TONE",
  APPROVED_PRESET: "APPROVED_PRESET",
  RENDERED_PLATFORM_BENCHMARK: "RENDERED_PLATFORM_BENCHMARK",
  SYNTHETIC_TEST_SIGNAL: "SYNTHETIC_TEST_SIGNAL",
  MULTITRACK_CONTEXT: "MULTITRACK_CONTEXT",
  ADVERSARIAL_PATHOLOGICAL: "ADVERSARIAL_PATHOLOGICAL",
  WORKFLOW_PROMPT: "WORKFLOW_PROMPT",
} as const;
export type FixtureClass = (typeof FIXTURE_CLASSES)[keyof typeof FIXTURE_CLASSES];

/**
 * Record 08: Fixture contamination status.
 */
export const FIXTURE_CONTAMINATION_STATUSES = {
  CLEAN: "CLEAN",
  CONTAMINATED: "CONTAMINATED",
  SUSPECT: "SUSPECT",
} as const;
export type FixtureContaminationStatus =
  (typeof FIXTURE_CONTAMINATION_STATUSES)[keyof typeof FIXTURE_CONTAMINATION_STATUSES];

/**
 * Record 08: Fixture lifecycle governance status.
 */
export const FIXTURE_LIFECYCLE_STATUSES = {
  ACTIVE: "ACTIVE",
  SUPERSEDED: "SUPERSEDED",
  INVALIDATED: "INVALIDATED",
  RETIRED: "RETIRED",
} as const;
export type FixtureLifecycleStatus =
  (typeof FIXTURE_LIFECYCLE_STATUSES)[keyof typeof FIXTURE_LIFECYCLE_STATUSES];

/**
 * Record 09: Test execution completion outcome.
 */
export const EXECUTION_OUTCOMES = {
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  ABORTED: "ABORTED",
  INCONCLUSIVE: "INCONCLUSIVE",
} as const;
export type ExecutionOutcome = (typeof EXECUTION_OUTCOMES)[keyof typeof EXECUTION_OUTCOMES];

/**
 * Record 10: Objective metric measurement categories.
 */
export const OBJECTIVE_METRIC_CATEGORIES = {
  STRUCTURAL_SCHEMA: "STRUCTURAL_SCHEMA",
  PARAMETER_BOUNDS: "PARAMETER_BOUNDS",
  EXPORT_INTEGRITY: "EXPORT_INTEGRITY",
  SPECTRAL_ANALYSIS: "SPECTRAL_ANALYSIS",
  DYNAMIC_ENVELOPE: "DYNAMIC_ENVELOPE",
  HARMONIC_DISTORTION: "HARMONIC_DISTORTION",
  PHASE_COHERENCE: "PHASE_COHERENCE",
  OPERATIONAL_LATENCY_PERFORMANCE: "OPERATIONAL_LATENCY_PERFORMANCE",
} as const;
export type ObjectiveMetricCategory =
  (typeof OBJECTIVE_METRIC_CATEGORIES)[keyof typeof OBJECTIVE_METRIC_CATEGORIES];

/**
 * Record 10: Tolerance evaluation against version-bound tolerance profiles.
 */
export const TOLERANCE_EVALUATIONS = {
  MET: "MET",
  OUT_OF_TOLERANCE: "OUT_OF_TOLERANCE",
  BORDERLINE: "BORDERLINE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;
export type ToleranceEvaluation =
  (typeof TOLERANCE_EVALUATIONS)[keyof typeof TOLERANCE_EVALUATIONS];

/**
 * Record 10: Objective binary/ternary assessment outcome.
 */
export const OBJECTIVE_PASS_FAIL_STATUSES = {
  PASS: "PASS",
  FAIL: "FAIL",
  INCONCLUSIVE: "INCONCLUSIVE",
} as const;
export type ObjectivePassFailStatus =
  (typeof OBJECTIVE_PASS_FAIL_STATUSES)[keyof typeof OBJECTIVE_PASS_FAIL_STATUSES];

/**
 * Record 11: Perceptual evaluator roles.
 */
export const PERCEPTUAL_EVALUATOR_ROLES = {
  MASTER_ENGINEER: "MASTER_ENGINEER",
  SESSION_GUITARIST: "SESSION_GUITARIST",
  PRODUCER: "PRODUCER",
  PLATFORM_SPECIALIST: "PLATFORM_SPECIALIST",
} as const;
export type PerceptualEvaluatorRole =
  (typeof PERCEPTUAL_EVALUATOR_ROLES)[keyof typeof PERCEPTUAL_EVALUATOR_ROLES];

/**
 * Record 11: The eleven governed perceptual listening methodologies.
 */
export const PERCEPTUAL_METHODOLOGIES = {
  SIGHTED_EXPERT_REVIEW: "SIGHTED_EXPERT_REVIEW",
  AB_TESTING: "AB_TESTING",
  BLIND_AB_TESTING: "BLIND_AB_TESTING",
  ABX_TESTING: "ABX_TESTING",
  MUSHRA: "MUSHRA",
  PAIRED_COMPARISON: "PAIRED_COMPARISON",
  REFERENCE_MATCHING: "REFERENCE_MATCHING",
  DEFECT_DETECTION_PANEL: "DEFECT_DETECTION_PANEL",
  MUSICAL_CONTEXT: "MUSICAL_CONTEXT",
  INTERACTIVE_PLAYABILITY: "INTERACTIVE_PLAYABILITY",
  EXTENDED_LISTENING_FATIGUE: "EXTENDED_LISTENING_FATIGUE",
} as const;
export type PerceptualMethodology =
  (typeof PERCEPTUAL_METHODOLOGIES)[keyof typeof PERCEPTUAL_METHODOLOGIES];

/**
 * Record 11: Confidence levels for perceptual judgments.
 */
export const PERCEPTUAL_CONFIDENCE_LEVELS = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type PerceptualConfidenceLevel =
  (typeof PERCEPTUAL_CONFIDENCE_LEVELS)[keyof typeof PERCEPTUAL_CONFIDENCE_LEVELS];

/**
 * Record 11: Perceptual evaluation outcomes.
 */
export const PERCEPTUAL_EVALUATION_OUTCOMES = {
  PERCEPTUAL_PASS: "PERCEPTUAL_PASS",
  PERCEPTUAL_FAIL: "PERCEPTUAL_FAIL",
  PERCEPTUAL_INCONCLUSIVE: "PERCEPTUAL_INCONCLUSIVE",
} as const;
export type PerceptualEvaluationOutcome =
  (typeof PERCEPTUAL_EVALUATION_OUTCOMES)[keyof typeof PERCEPTUAL_EVALUATION_OUTCOMES];

/**
 * Record 12: The four canonical UAT evaluator personas.
 */
export const EVALUATOR_PERSONAS = {
  RECORDING_ENGINEER: "RECORDING_ENGINEER",
  SESSION_GUITARIST: "SESSION_GUITARIST",
  PRODUCER: "PRODUCER",
  PLATFORM_ARCHITECT: "PLATFORM_ARCHITECT",
} as const;
export type EvaluatorPersona =
  (typeof EVALUATOR_PERSONAS)[keyof typeof EVALUATOR_PERSONAS];

/**
 * Record 12: Task completion status in UAT workflows.
 */
export const TASK_COMPLETION_STATUSES = {
  COMPLETED_SUCCESSFULLY: "COMPLETED_SUCCESSFULLY",
  COMPLETED_WITH_FRICTION: "COMPLETED_WITH_FRICTION",
  FAILED: "FAILED",
} as const;
export type TaskCompletionStatus =
  (typeof TASK_COMPLETION_STATUSES)[keyof typeof TASK_COMPLETION_STATUSES];

/**
 * Record 12: Final musical fitness verdict from persona evaluation.
 */
export const MUSICAL_FITNESS_VERDICTS = {
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CONDITIONALLY_ACCEPTED: "CONDITIONALLY_ACCEPTED",
} as const;
export type MusicalFitnessVerdict =
  (typeof MUSICAL_FITNESS_VERDICTS)[keyof typeof MUSICAL_FITNESS_VERDICTS];

/**
 * Record 13: Canonical machine enum values for regression classification.
 * CRITICAL GOVERNANCE: Must match frozen schema exactly:
 * INTENTIONAL_CORRECTION | NEUTRAL | GENUINE_REGRESSION | UNRESOLVED.
 * Long-form display strings (e.g. INTENTIONAL_ARCHITECTURAL_CORRECTION) are strictly prohibited from persistence.
 */
export const REGRESSION_CLASSIFICATIONS = {
  INTENTIONAL_CORRECTION: "INTENTIONAL_CORRECTION",
  NEUTRAL: "NEUTRAL",
  GENUINE_REGRESSION: "GENUINE_REGRESSION",
  UNRESOLVED: "UNRESOLVED",
} as const;
export type RegressionClassification =
  (typeof REGRESSION_CLASSIFICATIONS)[keyof typeof REGRESSION_CLASSIFICATIONS];

/**
 * Record 13: Materiality score for regression impact.
 */
export const MATERIALITY_SCORES = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NEGLIGIBLE: "NEGLIGIBLE",
} as const;
export type MaterialityScore =
  (typeof MATERIALITY_SCORES)[keyof typeof MATERIALITY_SCORES];

/**
 * Record 13: Regression domain.
 */
export const REGRESSION_DOMAINS = {
  ACOUSTIC: "ACOUSTIC",
  FUNCTIONAL: "FUNCTIONAL",
  EXPORT: "EXPORT",
  OPERATIONAL: "OPERATIONAL",
  PLAYABILITY: "PLAYABILITY",
} as const;
export type RegressionDomain =
  (typeof REGRESSION_DOMAINS)[keyof typeof REGRESSION_DOMAINS];

/**
 * Record 14: The nine root-layer failure attribution classes.
 */
export const FAILURE_ATTRIBUTION_CLASSES = {
  VALIDATION_ENVIRONMENT: "VALIDATION_ENVIRONMENT",
  TEST_FIXTURE: "TEST_FIXTURE",
  MIGRATION_MAPPING: "MIGRATION_MAPPING",
  RUNTIME_IMPLEMENTATION: "RUNTIME_IMPLEMENTATION",
  REASONING: "REASONING",
  PLATFORM_TRANSLATION: "PLATFORM_TRANSLATION",
  TARGET_PLATFORM: "TARGET_PLATFORM",
  OPERATIONAL_INFRASTRUCTURE: "OPERATIONAL_INFRASTRUCTURE",
  UNKNOWN: "UNKNOWN",
} as const;
export type FailureAttributionClass =
  (typeof FAILURE_ATTRIBUTION_CLASSES)[keyof typeof FAILURE_ATTRIBUTION_CLASSES];

/**
 * Record 14: Failure attribution confidence.
 */
export const ATTRIBUTION_CONFIDENCE_LEVELS = {
  CERTAIN: "CERTAIN",
  PROBABLE: "PROBABLE",
  SUSPECTED: "SUSPECTED",
} as const;
export type AttributionConfidenceLevel =
  (typeof ATTRIBUTION_CONFIDENCE_LEVELS)[keyof typeof ATTRIBUTION_CONFIDENCE_LEVELS];

/**
 * Record 14: Failure materiality.
 */
export const FAILURE_MATERIALITIES = {
  CRITICAL_BLOCKER: "CRITICAL_BLOCKER",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
  COSMETIC: "COSMETIC",
} as const;
export type FailureMateriality =
  (typeof FAILURE_MATERIALITIES)[keyof typeof FAILURE_MATERIALITIES];

/**
 * Record 15: Conflict types between divergent evidence streams.
 */
export const CONFLICT_TYPES = {
  OBJECTIVE_VS_PERCEPTUAL: "OBJECTIVE_VS_PERCEPTUAL",
  EVALUATOR_DISAGREEMENT: "EVALUATOR_DISAGREEMENT",
  SHADOW_VS_PROD_DIVERGENCE: "SHADOW_VS_PROD_DIVERGENCE",
  FIXTURE_VS_SIMULATION: "FIXTURE_VS_SIMULATION",
  MULTI_METHODOLOGY_DISCREPANCY: "MULTI_METHODOLOGY_DISCREPANCY",
} as const;
export type ConflictType = (typeof CONFLICT_TYPES)[keyof typeof CONFLICT_TYPES];

/**
 * Record 15: Governed strategy for resolving evidence conflict.
 */
export const CONFLICT_RESOLUTION_STRATEGIES = {
  CONDUCT_TARGETED_RETEST: "CONDUCT_TARGETED_RETEST",
  CONVENE_EXPERT_PANEL_RECONCILIATION: "CONVENE_EXPERT_PANEL_RECONCILIATION",
  DECLARED_INTENTIONAL_CORRECTION: "DECLARED_INTENTIONAL_CORRECTION",
  ESCALATE_TO_STAGE_14_REVIEW: "ESCALATE_TO_STAGE_14_REVIEW",
} as const;
export type ConflictResolutionStrategy =
  (typeof CONFLICT_RESOLUTION_STRATEGIES)[keyof typeof CONFLICT_RESOLUTION_STRATEGIES];

/**
 * Record 15: Conflict resolution status.
 */
export const CONFLICT_RESOLUTION_STATUSES = {
  UNRESOLVED: "UNRESOLVED",
  RESOLVED_BY_PANEL: "RESOLVED_BY_PANEL",
  ACCEPTED_TRADE_OFF: "ACCEPTED_TRADE_OFF",
} as const;
export type ConflictResolutionStatus =
  (typeof CONFLICT_RESOLUTION_STATUSES)[keyof typeof CONFLICT_RESOLUTION_STATUSES];

/**
 * Record 16: Sources of preserved validation uncertainty.
 */
export const UNCERTAINTY_SOURCES = {
  MISSING_EVIDENCE: "MISSING_EVIDENCE",
  CONFLICTING_EVIDENCE: "CONFLICTING_EVIDENCE",
  INSUFFICIENT_SAMPLE_SIZE: "INSUFFICIENT_SAMPLE_SIZE",
  UNTESTED_EDGE_DOMAIN: "UNTESTED_EDGE_DOMAIN",
  CALIBRATION_AMBIGUITY: "CALIBRATION_AMBIGUITY",
  UNKNOWN_FAILURE_CAUSE: "UNKNOWN_FAILURE_CAUSE",
  TARGET_PLATFORM_VERSION_INSTABILITY: "TARGET_PLATFORM_VERSION_INSTABILITY",
} as const;
export type UncertaintySource =
  (typeof UNCERTAINTY_SOURCES)[keyof typeof UNCERTAINTY_SOURCES];

/**
 * Record 16: Uncertainty impact on Gate 8 eligibility.
 */
export const UNCERTAINTY_GATE_8_IMPACTS = {
  ALLOWS_CONDITIONAL: "ALLOWS_CONDITIONAL",
  FORCES_BLOCK: "FORCES_BLOCK",
  ACCEPTABLE_LOW_RISK: "ACCEPTABLE_LOW_RISK",
} as const;
export type UncertaintyGate8Impact =
  (typeof UNCERTAINTY_GATE_8_IMPACTS)[keyof typeof UNCERTAINTY_GATE_8_IMPACTS];

/**
 * Record 17: Governed validation outcome classes.
 * CRITICAL: There is NO persisted INVALIDATED outcome state.
 * Historical outcomes are immutable; staleness is modeled via graph relationships.
 */
export const VALIDATION_OUTCOME_CLASSES = {
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
  CONDITIONAL: "CONDITIONAL",
} as const;
export type ValidationOutcomeClass =
  (typeof VALIDATION_OUTCOME_CLASSES)[keyof typeof VALIDATION_OUTCOME_CLASSES];

/**
 * Record 18: The ten mandatory revalidation trigger sources.
 */
export const REVALIDATION_TRIGGER_SOURCES = {
  TRIGGER_01_UPSTREAM_REASONING_UPDATE: "TRIGGER_01_UPSTREAM_REASONING_UPDATE",
  TRIGGER_02_DETERMINISTIC_RULE_UPDATE: "TRIGGER_02_DETERMINISTIC_RULE_UPDATE",
  TRIGGER_03_GEAR_CATALOG_UPDATE: "TRIGGER_03_GEAR_CATALOG_UPDATE",
  TRIGGER_04_PLATFORM_EXPORTER_UPDATE: "TRIGGER_04_PLATFORM_EXPORTER_UPDATE",
  TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE: "TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE",
  TRIGGER_06_FIXTURE_LIBRARY_UPDATE: "TRIGGER_06_FIXTURE_LIBRARY_UPDATE",
  TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE: "TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE",
  TRIGGER_08_ROLLBACK_MECHANISM_UPDATE: "TRIGGER_08_ROLLBACK_MECHANISM_UPDATE",
  TRIGGER_09_CANDIDATE_LESSON_APPROVED: "TRIGGER_09_CANDIDATE_LESSON_APPROVED",
  TRIGGER_10_TELEMETRY_ANOMALY_SPIKE: "TRIGGER_10_TELEMETRY_ANOMALY_SPIKE",
} as const;
export type RevalidationTriggerSource =
  (typeof REVALIDATION_TRIGGER_SOURCES)[keyof typeof REVALIDATION_TRIGGER_SOURCES];

/**
 * Record 18: Action required upon revalidation trigger firing.
 */
export const REVALIDATION_REQUIRED_ACTIONS = {
  NO_ACTION: "NO_ACTION",
  PARTIAL_RETEST: "PARTIAL_RETEST",
  FULL_RETEST: "FULL_RETEST",
  SUSPEND_GATE_8: "SUSPEND_GATE_8",
} as const;
export type RevalidationRequiredAction =
  (typeof REVALIDATION_REQUIRED_ACTIONS)[keyof typeof REVALIDATION_REQUIRED_ACTIONS];

/**
 * Record 20: Pre-Gate 8 Four-Pillar readiness status values.
 */
export const PILLAR_READINESS_STATUSES = {
  SATISFIED: "SATISFIED",
  DEFICIENT: "DEFICIENT",
  INCONCLUSIVE: "INCONCLUSIVE",
} as const;
export type PillarReadinessStatus =
  (typeof PILLAR_READINESS_STATUSES)[keyof typeof PILLAR_READINESS_STATUSES];

/**
 * Record 21: Gate 8 Adoption decision outcomes.
 */
export const ADOPTION_DECISION_OUTCOMES = {
  AUTHORIZED: "AUTHORIZED",
  CONDITIONALLY_AUTHORIZED: "CONDITIONALLY_AUTHORIZED",
  REJECTED: "REJECTED",
  BLOCKED: "BLOCKED",
} as const;
export type AdoptionDecisionOutcome =
  (typeof ADOPTION_DECISION_OUTCOMES)[keyof typeof ADOPTION_DECISION_OUTCOMES];

/**
 * Record 21: Governed lifecycle status of the Gate 8 authorization.
 */
export const GOVERNANCE_STATUSES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  RESTRICTED: "RESTRICTED",
  WITHDRAWN: "WITHDRAWN",
  SUPERSEDED: "SUPERSEDED",
} as const;
export type GovernanceStatus =
  (typeof GOVERNANCE_STATUSES)[keyof typeof GOVERNANCE_STATUSES];

/**
 * Record 22: Valid previous governance status values before change.
 */
export const PREVIOUS_GOVERNANCE_STATUSES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  RESTRICTED: "RESTRICTED",
} as const;
export type PreviousGovernanceStatus =
  (typeof PREVIOUS_GOVERNANCE_STATUSES)[keyof typeof PREVIOUS_GOVERNANCE_STATUSES];

/**
 * Record 22: Valid new governance status values resulting from change.
 * CRITICAL GOVERNANCE: ACTIVE is strictly prohibited as a new_governance_status.
 * Withdrawn authorizations are never reinstated; remediated candidates require a new Gate 8 decision.
 */
export const NEW_GOVERNANCE_STATUSES = {
  SUSPENDED: "SUSPENDED",
  RESTRICTED: "RESTRICTED",
  WITHDRAWN: "WITHDRAWN",
  SUPERSEDED: "SUPERSEDED",
} as const;
export type NewGovernanceStatus =
  (typeof NEW_GOVERNANCE_STATUSES)[keyof typeof NEW_GOVERNANCE_STATUSES];

/**
 * Record 22: Trigger sources causing post-cutover Gate 8 change.
 */
export const GATE8_CHANGE_TRIGGER_SOURCES = {
  TELEMETRY_STOP_CRITERIA: "TELEMETRY_STOP_CRITERIA",
  HUMAN_AUDIT: "HUMAN_AUDIT",
  REVALIDATION_FAILURE: "REVALIDATION_FAILURE",
  DOWNSTREAM_DEFECT: "DOWNSTREAM_DEFECT",
} as const;
export type Gate8ChangeTriggerSource =
  (typeof GATE8_CHANGE_TRIGGER_SOURCES)[keyof typeof GATE8_CHANGE_TRIGGER_SOURCES];

/**
 * Record 22: Governance effect of the Gate 8 change.
 */
export const GOVERNANCE_EFFECTS = {
  SUSPEND_AUTHORIZATION: "SUSPEND_AUTHORIZATION",
  NARROW_SCOPE: "NARROW_SCOPE",
  REVOKE_AUTHORIZATION: "REVOKE_AUTHORIZATION",
  SUPERSEDE_RECORD: "SUPERSEDE_RECORD",
} as const;
export type GovernanceEffect =
  (typeof GOVERNANCE_EFFECTS)[keyof typeof GOVERNANCE_EFFECTS];

/**
 * Record 22: Required adoption response communicated to Phase 1C.5g.
 */
export const REQUIRED_ADOPTION_RESPONSES = {
  ADOPTION_HALTED: "ADOPTION_HALTED",
  SCOPE_NARROWED: "SCOPE_NARROWED",
  ROLLBACK_REQUIRED: "ROLLBACK_REQUIRED",
  NO_OPERATIONAL_CHANGE: "NO_OPERATIONAL_CHANGE",
} as const;
export type RequiredAdoptionResponse =
  (typeof REQUIRED_ADOPTION_RESPONSES)[keyof typeof REQUIRED_ADOPTION_RESPONSES];
