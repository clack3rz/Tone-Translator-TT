// src/tests/helpers/architecturalVerificationHarness.ts
// Test-only composition harness for WP-31: End-to-End System Integration.
// Strictly wires existing WP-01 through WP-30 production subsystems without inventing
// new production code, fabricating empirical results, or mutating frozen schemas.
// Bound to frozen specification v0.1j Section 35, Section 36, and Implementation Plan v0.1h WP-31.

import { deepFreeze } from "../../sound-engineer/contracts/immutability";
import {
  ADOPTION_DECISION_OUTCOMES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  EVALUATOR_PERSONAS,
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  MATERIALITY_SCORES,
  MUSICAL_FITNESS_VERDICTS,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PILLAR_READINESS_STATUSES,
  REGRESSION_CLASSIFICATIONS,
  REGRESSION_DOMAINS,
  REQUIRED_EVIDENCE_CLASSES,
  TASK_COMPLETION_STATUSES,
  TOLERANCE_EVALUATIONS,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
  VALIDATION_OUTCOME_CLASSES,
  VALIDATION_PRIMARY_DOMAINS,
  type FailureAttributionClass,
  type FailureMateriality,
  type ValidationOutcomeClass,
} from "../../sound-engineer/validation/schemas/enums";
import {
  type AdoptionDecisionRecord,
  type EvidenceConflictRecord,
  type ObjectiveEvidenceRecord,
  type PerceptualEvaluationRecord,
  type ProductionReadinessAssessmentRecord,
  type RegressionAssessmentRecord,
  type RevalidationTriggerRecord,
  type UATEvaluationRecord,
  type ValidationCase,
  type ValidationExecutionRecord,
  type ValidationFailureRecord,
  type ValidationFixtureRecord,
  type ValidationOutcomeRecord,
  type ValidationPackage,
  type ValidationScopeRecord,
  type ValidationUncertaintyRecord,
  type ValidationVersionBindingRecord,
  parseValidationFailureRecord,
  parseValidationOutcomeRecord,
} from "../../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
} from "../../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../../sound-engineer/validation/storage/auditLedger";
import {
  FROZEN_HARD_BLOCKERS,
  type ProductionReadinessSynthesisInput,
  type ProductionReadinessSynthesisResult,
  type RollbackVerificationEvidence,
  type UpstreamGovernanceState,
  ProductionReadinessSynthesizer,
} from "../../sound-engineer/validation/readiness";
import { evaluateHardBlockers, type HardBlockerEvaluationResult } from "../../sound-engineer/validation/readiness/hardBlockerEvaluator";
import {
  FailureAttributionEngine,
  TABLE_17_REMAND_ROUTING,
  type FailureAttributionInput,
  type FailureAttributionResult,
  type RemandDestinationInfo,
} from "../../sound-engineer/validation/attribution";
import {
  DefectRemandRouter,
  type RouteDefectInput,
  type RouteDefectResult,
} from "../../sound-engineer/validation/remand";
import {
  EvidenceConflictDetector,
  ConflictDetectionProfileResolver,
  type EvidenceConflictDetectorInput,
  type EvidenceConflictDetectionResult,
} from "../../sound-engineer/validation/conflicts";
import {
  ValidationOutcomeSynthesizer,
  type SynthesizeOutcomeInput,
  type OutcomeSynthesisResult,
} from "../../sound-engineer/validation/outcome";
import {
  DifferentialAuditingEngine,
  type DifferentialAuditorInput,
  type DifferentialAuditResult,
} from "../../sound-engineer/validation/regression";
import {
  Gate8AdjudicationEngine,
  DEFAULT_GATE8_AUTHORITIES,
  DEFAULT_GATE8_AUTHORITY_REGISTRY,
  type Gate8AdjudicationInput,
  type Gate8AdjudicationResult,
} from "../../sound-engineer/validation/gate8";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../../sound-engineer/validation/binding";
import { RevalidationTriggerDetector } from "../../sound-engineer/validation/retest";

/**
 * Standard factory helpers for creating canonical governed records with valid defaults.
 */
export function createBaselineScopeRecord(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return deepFreeze({
    scope_id: "scope_lead_5150_v1",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
    ...overrides,
  });
}

export function createBaselineVersionBindingRecord(
  scopeId: string = "scope_lead_5150_v1",
  overrides?: Partial<ValidationVersionBindingRecord>
): ValidationVersionBindingRecord {
  const archProvider = new StaticArchitectureIntegrityReferenceProvider(
    TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  );
  const bindingService = new VersionBindingService(
    undefined,
    undefined,
    undefined,
    archProvider
  );
  const dummyScope = createBaselineScopeRecord({ scope_id: scopeId });
  const binding = bindingService.bindVersions(dummyScope, {
    runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
    model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
    deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
    gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
    platform_exporter_version: "stage12_serializer_digest_9a8b7c",
    fixture_library_version: "golden_stems_manifest_digest_def456",
    target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
    host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  });
  return deepFreeze({
    ...binding,
    ...overrides,
  });
}

export function createBaselineFixtureRecord(overrides?: Partial<ValidationFixtureRecord>): ValidationFixtureRecord {
  return deepFreeze({
    fixture_id: "fix_01",
    fixture_name: "Clean Stratocaster DI Track",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "1.0.0",
    payload_integrity_ref: "sha256:fix_payload_01",
    declared_applicability_scope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    provenance_metadata: {
      recording_engineer: "Lead Sound Engineer",
      instrument_details: "Stratocaster Bridge Pickup",
      capture_hardware: "Universal Audio Apollo x8",
      capture_date: "2026-10-01",
    },
    calibration_spec: "AES17_COMPLIANT_-18LUFS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
    ...overrides,
  });
}

export function createBaselinePackageRecord(
  scopeId: string = "scope_lead_5150_v1",
  bindingId: string = "binding_2026_5150_v1",
  overrides?: Partial<ValidationPackage>
): ValidationPackage {
  return deepFreeze({
    package_id: "pkg_5150_validation_01",
    intake_id: "intake_2026_01",
    scope_record_ref: scopeId,
    version_binding_ref: bindingId,
    assigned_test_profiles: [
      "profile:01_structural_schema",
      "profile:03_target_platform_export",
      "profile:04_objective_acoustic",
      "profile:06_perceptual_listening",
    ],
    validation_case_refs: ["case_01"],
    execution_record_refs: ["exec_01"],
    evidence_refs: ["obj_01"],
    ...overrides,
  });
}

export function createBaselineValidationCase(overrides?: Partial<ValidationCase>): ValidationCase {
  return deepFreeze({
    case_id: "case_01",
    title: "Lead Amp Dynamic Headroom Test",
    validation_question: "Does lead tone maintain dynamic headroom without clipping?",
    validation_subject: "American High Gain Lead Channel",
    scoped_boundaries: ["guitar:amp:5150_lead"],
    applicable_test_dimensions: ["DIM_DYNAMIC_RANGE", "DIM_THD"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: ["fix_01"],
    evaluation_methodology: "METHOD_DETERMINISTIC_AUDIO_RUNNER",
    acceptance_criteria_ref: "CRIT_HEADROOM_MIN_12DB",
    failure_consequence: "BLOCKS_GATE_8",
    expected_remand_destination: "Software Engineering Core Team",
    ...overrides,
  });
}

export function createBaselineExecutionRecord(overrides?: Partial<ValidationExecutionRecord>): ValidationExecutionRecord {
  return deepFreeze({
    execution_id: "exec_01",
    case_id: "case_01",
    profile_id: "profile:04_objective_acoustic",
    fixture_id: "fix_01",
    binding_id: "binding_2026_5150_v1",
    execution_timestamp: "2026-10-22T00:00:00.000Z",
    execution_environment: "ubuntu_24.04_x86_64",
    input_audio_integrity_ref: "sha256:in_01",
    output_audio_integrity_ref: "sha256:out_01",
    execution_duration_ms: 150,
    anomalies_detected: [],
    raw_measurements: { delta_db: 0.25 },
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "trace_01",
    ...overrides,
  });
}

export function createBaselineObjectiveEvidence(overrides?: Partial<ObjectiveEvidenceRecord>): ObjectiveEvidenceRecord {
  return deepFreeze({
    objective_evidence_id: "obj_01",
    execution_id: "exec_01",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: { delta_db: 0.25 },
    applied_threshold_profile_ref: "profile_acoustic_strict",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.25,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: [],
    ...overrides,
  });
}

export function createBaselinePerceptualEvaluation(overrides?: Partial<PerceptualEvaluationRecord>): PerceptualEvaluationRecord {
  return deepFreeze({
    perceptual_evidence_id: "perc_01",
    execution_id: "exec_01",
    evaluator_id: "eval_expert_01",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "GENELEC_8351B",
      calibrated_spl_profile_ref: "profile_spl_85dba",
      acoustic_treatment_level: "TREATED_STUDIO",
    },
    presented_stimuli_refs: { candidate: "stem_01_candidate", reference: "stem_01_ref" },
    perceptual_dimensions_evaluated: { tonal_balance: 9.0, warmth: 9.2 },
    qualitative_observations: "Warm, punchy, authentic response.",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    ...overrides,
  });
}

export function createBaselineUATEvaluation(overrides?: Partial<UATEvaluationRecord>): UATEvaluationRecord {
  return deepFreeze({
    uat_id: "uat_01",
    package_id: "pkg_5150_validation_01",
    evaluator_persona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
    task_scenario_id: "scenario_lead_tracking_01",
    task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
    task_duration_seconds: 180,
    workflow_satisfaction_rating: 9.0,
    cognitive_friction_notes: "None observed; natural control layout.",
    musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
    uat_blockers_identified: [],
    ...overrides,
  });
}

export function createBaselineRollbackEvidence(verified = true, overrides?: Partial<RollbackVerificationEvidence>): RollbackVerificationEvidence {
  return deepFreeze({
    rollback_verified: verified,
    path_prod_isolated: true,
    path_rollback_verified_under_load: verified,
    recovery_time_objective_met: verified,
    telemetry_stop_criteria_configured: true,
    verification_timestamp: "2026-10-22T00:00:00.000Z",
    evidence_ref: "cert_rollback_verified_load_test_01",
    version_binding_ref: "binding_2026_5150_v1",
    ...overrides,
  });
}

export function createBaselineUpstreamGovernance(overrides?: Partial<UpstreamGovernanceState>): UpstreamGovernanceState {
  return deepFreeze({
    reasoning_lifecycle_stages_completed: 14,
    principles_complied: true,
    causal_explainability_verified: true,
    provenance_intact: true,
    ungrounded_reasoning_detected: false,
    candidate_lesson_quarantined: true,
    upstream_violations: [],
    ...overrides,
  });
}

/**
 * Canonical Table 16 / Phase 1C.5g Infrastructure routing for comparator failures (COND-07).
 * Preserves the Phase 1C.5h / Phase 1C.5g authority boundary by routing comparator environment
 * mismatches to Phase 1C.5g Infrastructure rather than generic Phase 1C.5h Validation Infrastructure.
 */
export const PHASE_1C5G_COMPARATOR_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT]: {
    remandClass: "ENVIRONMENT_REMAND",
    remandDestination: "Phase 1C.5g Infrastructure",
    upstreamRecipient: "Phase 1C.5g Infrastructure",
    governanceEntityId: "GOVERNANCE_PHASE_1C5G_INFRASTRUCTURE",
    defaultRetestPrerequisites:
      "Calibrate tripartite comparator alignment, equalize input buffer formats, and verify sampling rate parity between PATH-PROD and PATH-SHADOW",
  },
});

/**
 * Canonical Table 16 / Phase 1C.5g Coexistence Team routing for rollback failures (COND-11).
 */
export const PHASE_1C5G_COEXISTENCE_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE]: {
    remandClass: "ENVIRONMENT_REMAND",
    remandDestination: "Phase 1C.5g Coexistence Team",
    upstreamRecipient: "Phase 1C.5g Coexistence Team",
    governanceEntityId: "GOVERNANCE_PHASE_1C5G_COEXISTENCE",
    defaultRetestPrerequisites:
      "Verify automated failover timing, repair state consistency during reversion under live load, and certify RTO within governed SLA",
  },
});

/**
 * Canonical Table 16 / Upstream Reasoning / Knowledge Governance routing for reviewer disagreement (COND-13).
 */
export const REASONING_KNOWLEDGE_GOVERNANCE_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.REASONING]: {
    remandClass: "REASONING_REMAND",
    remandDestination: "Upstream Reasoning / Knowledge Governance",
    upstreamRecipient: "Upstream Reasoning / Knowledge Governance",
    governanceEntityId: "GOVERNANCE_UPSTREAM_REASONING_KNOWLEDGE",
    defaultRetestPrerequisites:
      "Convene blind consensus listening panel, isolate monitoring environments, and reconcile aesthetic evaluation guidelines",
  },
});

/**
 * Canonical Table 16 / Product / Reasoning Teams routing for inconclusive UAT (COND-14).
 */
export const PRODUCT_REASONING_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.REASONING]: {
    remandClass: "REASONING_REMAND",
    remandDestination: "Product / Reasoning Teams",
    upstreamRecipient: "Product / Reasoning Teams",
    governanceEntityId: "GOVERNANCE_PRODUCT_REASONING",
    defaultRetestPrerequisites:
      "Refine user interaction design, clarify preset parameter naming hierarchy, and re-run UAT with fresh evaluator persona",
  },
});

/**
 * Canonical Table 16 / Author of change routing for material implementation change (COND-16).
 */
export const AUTHOR_OF_CHANGE_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION]: {
    remandClass: "RUNTIME_REMAND",
    remandDestination: "Author of change",
    upstreamRecipient: "Author of change",
    governanceEntityId: "GOVERNANCE_AUTHOR_OF_CHANGE",
    defaultRetestPrerequisites:
      "Submit revised implementation package, generate binding diff, and execute targeted revalidation plan",
  },
});

/**
 * Canonical Table 16 / Infrastructure / Traceability routing for corrupted evidence (COND-17).
 */
export const INFRASTRUCTURE_TRACEABILITY_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT]: {
    remandClass: "ENVIRONMENT_REMAND",
    remandDestination: "Infrastructure / Traceability",
    upstreamRecipient: "Infrastructure / Traceability",
    governanceEntityId: "GOVERNANCE_INFRASTRUCTURE_TRACEABILITY",
    defaultRetestPrerequisites:
      "Investigate storage or transmission corruption, re-run test harness to generate fresh sealed record, and verify envelope checksums",
  },
});

/**
 * Canonical Table 16 / Testing Working Group routing for unresolved critical uncertainty (COND-19).
 */
export const TESTING_WORKING_GROUP_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.UNKNOWN]: {
    remandClass: "JOINT_DIAGNOSTIC_REMAND",
    remandDestination: "Testing Working Group",
    upstreamRecipient: "Testing Working Group",
    governanceEntityId: "GOVERNANCE_TESTING_WORKING_GROUP",
    defaultRetestPrerequisites:
      "Execute targeted stress testing suite to resolve unknown stability or safety risks under continuous load",
  },
});

/**
 * Canonical Table 16 / Phase 1C.5g Planning routing for scope inflation (COND-20).
 */
export const PHASE_1C5G_PLANNING_REMAND_ROUTING: Readonly<Record<string, RemandDestinationInfo>> = deepFreeze({
  ...TABLE_17_REMAND_ROUTING,
  [FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING]: {
    remandClass: "MIGRATION_REMAND",
    remandDestination: "Phase 1C.5g Planning",
    upstreamRecipient: "Phase 1C.5g Migration Planning",
    governanceEntityId: "GOVERNANCE_PHASE_1C5G_PLANNING",
    defaultRetestPrerequisites:
      "Submit separate handoff packages and validation suites for adjacent untested gear family models",
  },
});

/**
 * ArchitecturalVerificationHarness:
 * Test-only composition helper coordinating existing WP-01 through WP-30 production services.
 */
export class ArchitecturalVerificationHarness {
  public readonly graph: ValidationRelationshipGraph;
  public readonly auditLedger: ValidationAuditLedger;
  public readonly readinessSynthesizer: ProductionReadinessSynthesizer;
  public readonly failureAttributionEngine: FailureAttributionEngine;
  public readonly defectRemandRouter: DefectRemandRouter;
  public readonly outcomeSynthesizer: ValidationOutcomeSynthesizer;
  public readonly conflictDetector: EvidenceConflictDetector;
  public readonly differentialAuditor: DifferentialAuditingEngine;
  public readonly gate8Engine: Gate8AdjudicationEngine;
  public readonly triggerDetector: RevalidationTriggerDetector;

  constructor() {
    this.graph = new ValidationRelationshipGraph();
    this.auditLedger = new ValidationAuditLedger();
    this.readinessSynthesizer = new ProductionReadinessSynthesizer({
      graph: this.graph,
      auditLedger: this.auditLedger,
    });
    this.failureAttributionEngine = new FailureAttributionEngine({
      graph: this.graph,
      ledger: this.auditLedger,
    });
    this.defectRemandRouter = new DefectRemandRouter({
      graph: this.graph,
    });
    this.outcomeSynthesizer = new ValidationOutcomeSynthesizer({
      graph: this.graph,
      ledger: this.auditLedger,
    });
    this.conflictDetector = new EvidenceConflictDetector({
      graph: this.graph,
      ledger: this.auditLedger,
    });
    this.differentialAuditor = new DifferentialAuditingEngine({
      graph: this.graph,
      ledger: this.auditLedger,
    });
    this.gate8Engine = new Gate8AdjudicationEngine({
      graph: this.graph,
      auditLedger: this.auditLedger,
      authorityRegistry: DEFAULT_GATE8_AUTHORITY_REGISTRY,
    });
    this.triggerDetector = new RevalidationTriggerDetector({
      graph: this.graph,
      auditLedger: this.auditLedger,
    });
  }

  /**
   * Evaluates readiness and the 8 frozen Hard Blockers across candidate synthesis inputs.
   */
  public evaluateReadiness(input: ProductionReadinessSynthesisInput): ProductionReadinessSynthesisResult {
    return this.readinessSynthesizer.synthesizeProductionReadiness(input);
  }

  /**
   * Fast evaluation of the 8 frozen Hard Blockers without full record generation.
   */
  public checkHardBlockers(input: ProductionReadinessSynthesisInput, requestedScope?: readonly string[]): HardBlockerEvaluationResult {
    const scope = requestedScope ?? input.scopeRecord.included_units;
    return evaluateHardBlockers(input, scope);
  }

  /**
   * Runs forensic failure attribution on an execution failure and packages a defect remand.
   */
  public attributeAndRemand(input: {
    readonly failureInput: FailureAttributionInput;
    readonly versionBinding: ValidationVersionBindingRecord;
    readonly validationCase: ValidationCase;
    readonly fixtureRecord: ValidationFixtureRecord;
    readonly objectiveEvidenceRecord?: ObjectiveEvidenceRecord;
    readonly customRemandRoutingTable?: Readonly<Record<string, RemandDestinationInfo>>;
  }): {
    readonly attribution: FailureAttributionResult;
    readonly remand: RouteDefectResult;
  } {
    const routingTable = input.customRemandRoutingTable;
    const attributionEngine = routingTable
      ? new FailureAttributionEngine({
          graph: this.graph,
          ledger: this.auditLedger,
          remandRoutingTable: routingTable as Readonly<Record<FailureAttributionClass, RemandDestinationInfo>>,
        })
      : this.failureAttributionEngine;

    const router = routingTable
      ? new DefectRemandRouter({
          graph: this.graph,
          remandRoutingTable: routingTable,
        })
      : this.defectRemandRouter;

    const attribution = attributionEngine.attributeFailure(input.failureInput);
    const remand = router.routeDefect({
      failureRecord: attribution.record,
      executionRecord: input.failureInput.executionRecord,
      versionBinding: input.versionBinding,
      validationCase: input.validationCase,
      fixtureRecord: input.fixtureRecord,
      objectiveEvidenceRecord: input.objectiveEvidenceRecord,
    });

    return { attribution, remand };
  }

  /**
   * Runs evidence conflict detection between objective and perceptual findings.
   */
  public detectConflict(input: EvidenceConflictDetectorInput): EvidenceConflictDetectionResult {
    return this.conflictDetector.detectConflict(input);
  }

  /**
   * Adjudicates Gate 8 production cutover using the authoritative engine.
   */
  public adjudicateGate8(input: Gate8AdjudicationInput): Gate8AdjudicationResult {
    return this.gate8Engine.adjudicateCutover(input);
  }
}
