// src/sound-engineer/validation/retest/retestTypes.ts
// Phase 1C.5h WP-20: Revalidation Trigger Detection & Retest Planning Types.
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

import {
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  RevalidationRequiredAction,
  RevalidationTriggerSource,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  RegressionAssessmentRecord,
  RetestPlanRecord,
  RevalidationTriggerRecord,
  retestPlanRecordSchema,
  revalidationTriggerRecordSchema,
  UATEvaluationRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { RelationshipEdge } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";

export {
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  type RevalidationRequiredAction,
  type RevalidationTriggerSource,
  type RevalidationTriggerRecord,
  type RetestPlanRecord,
  revalidationTriggerRecordSchema,
  retestPlanRecordSchema,
};

/**
 * The ten frozen revalidation triggers defined in frozen specification v0.1j Section 24.2 & Table 14.
 * Phase 1C.5h governs exactly these ten triggers. Trigger 11 is strictly rejected.
 */
export const FROZEN_REVALIDATION_TRIGGERS = {
  TRIGGER_01: "TRIGGER-01",
  TRIGGER_02: "TRIGGER-02",
  TRIGGER_03: "TRIGGER-03",
  TRIGGER_04: "TRIGGER-04",
  TRIGGER_05: "TRIGGER-05",
  TRIGGER_06: "TRIGGER-06",
  TRIGGER_07: "TRIGGER-07",
  TRIGGER_08: "TRIGGER-08",
  TRIGGER_09: "TRIGGER-09",
  TRIGGER_10: "TRIGGER-10",
} as const;

export type FrozenRevalidationTriggerKey =
  (typeof FROZEN_REVALIDATION_TRIGGERS)[keyof typeof FROZEN_REVALIDATION_TRIGGERS];

/**
 * Descriptive metadata for the ten frozen revalidation triggers.
 */
export const FROZEN_TRIGGER_DESCRIPTIONS: Record<RevalidationTriggerSource, string> = {
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE]:
    "Upstream reasoning architecture or prompt template update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE]:
    "Deterministic heuristic rule, parameter clamp, or table update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE]:
    "Gear definition catalog or gear alias update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE]:
    "Target-platform parameter manifest or exporter serialization update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE]:
    "Target-platform version update or host OS runtime update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE]:
    "Golden Acoustic Fixture update, recalibration, or contamination invalidation",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE]:
    "Runtime execution engine, audio driver, or DSP core codebase update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE]:
    "PATH-ROLLBACK mechanism or operational deployment logic update",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED]:
    "Approval and promotion of a new Candidate Lesson affecting the subject domain",
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE]:
    "Production quality telemetry reporting a significant anomaly or defect spike",
};

/**
 * Input descriptor for an externally identified or governed material change event.
 */
export interface GovernedMaterialChangeEvent {
  /** Optional trigger source token or canonical enum value */
  readonly trigger_source?: RevalidationTriggerSource | string;
  /** Human-scannable description or rationale */
  readonly description?: string;
  /** Specific units affected by the change (must be within scope) */
  readonly affected_units?: readonly string[];
  /** Specific domains affected by the change */
  readonly affected_domains?: readonly string[];
  /** Fixture IDs updated, recalibrated, or suspect under TRIGGER-06 */
  readonly affected_fixture_ids?: readonly string[];
  /** Candidate lesson ID approved under TRIGGER-09 */
  readonly candidate_lesson_id?: string;
  /** Subject domain influenced by the candidate lesson under TRIGGER-09 */
  readonly candidate_lesson_domain?: string;
  /** Telemetry defect spike metrics under TRIGGER-10 */
  readonly telemetry_anomaly?: {
    readonly metric_name: string;
    readonly observed_defect_rate: number;
    readonly threshold: number;
    readonly sample_size: number;
    readonly warrants_gate_8_suspension?: boolean;
    readonly anomaly_details?: string;
  };
  /** Explicit required_action override if governed */
  readonly force_action?: RevalidationRequiredAction;
}

/**
 * Input parameters for RevalidationTriggerDetector.detectTrigger().
 */
export interface TriggerDetectionInput {
  /** The baseline/prior version binding */
  readonly priorBinding: ValidationVersionBindingRecord;
  /** The updated/new version binding */
  readonly newBinding: ValidationVersionBindingRecord;
  /** The declared scope record */
  readonly scopeRecord?: ValidationScopeRecord;
  /** Prior validation outcome record to be linked via INVALIDATED_BY */
  readonly priorOutcomeRecord?: ValidationOutcomeRecord;
  /** Optional governed external change event */
  readonly changeEvent?: GovernedMaterialChangeEvent;
  /** Optional relationship graph to register node and attach INVALIDATED_BY */
  readonly graph?: ValidationRelationshipGraph;
  /** Optional audit ledger to record the immutable entry */
  readonly auditLedger?: ValidationAuditLedger;
  /** Optional ISO 8601 UTC timestamp override for deterministic tests */
  readonly timestamp?: string;
}

/**
 * Result produced by RevalidationTriggerDetector.detectTrigger().
 */
export interface TriggerDetectionResult {
  /** The immutable Record 18 RevalidationTriggerRecord */
  readonly triggerRecord: RevalidationTriggerRecord;
  /** All detected trigger sources (at least one) */
  readonly detectedTriggers: readonly RevalidationTriggerSource[];
  /** Primary trigger source assigned to Record 18 */
  readonly primaryTriggerSource: RevalidationTriggerSource;
  /** Explanatory rationales for the detected change and selected action */
  readonly rationales: readonly string[];
  /** Evaluated narrowest affected scope */
  readonly affectedScope: readonly string[];
  /** The canonical INVALIDATED_BY relationship edge if graph was provided */
  readonly invalidationEdge?: RelationshipEdge;
}

/**
 * Evidence record type union eligible for retest evaluation and partitioning.
 */
export type AnyEvidenceRecord =
  | ObjectiveEvidenceRecord
  | PerceptualEvaluationRecord
  | UATEvaluationRecord
  | RegressionAssessmentRecord;

/**
 * Input parameters for RetestPlanner.createRetestPlan().
 */
export interface RetestPlanInput {
  /** The trigger record that initiated the retest plan */
  readonly triggerRecord: RevalidationTriggerRecord;
  /** The prior ValidationPackage that was previously validated */
  readonly packageRecord: ValidationPackage;
  /** The declared validation scope record */
  readonly scopeRecord: ValidationScopeRecord;
  /** Available pool of ValidationCases in the repository/package */
  readonly availableCases: readonly ValidationCase[];
  /** Existing evidence records from prior execution to be partitioned */
  readonly existingEvidenceRecords: readonly AnyEvidenceRecord[];
  /** Optional execution records associated with existing evidence for dependency tracing */
  readonly executionRecords?: readonly ValidationExecutionRecord[];
  /** Optional governed external change event */
  readonly changeEvent?: GovernedMaterialChangeEvent;
  /** Optional relationship graph to register node and attach REQUIRES_RETEST */
  readonly graph?: ValidationRelationshipGraph;
  /** Optional audit ledger to record the immutable entry */
  readonly auditLedger?: ValidationAuditLedger;
}

/**
 * Result produced by RetestPlanner.createRetestPlan().
 */
export interface RetestPlanResult {
  /** The immutable Record 19 RetestPlanRecord */
  readonly retestPlan: RetestPlanRecord;
  /** Disjoint retained valid evidence references */
  readonly retainedValidEvidenceRefs: readonly string[];
  /** Disjoint invalidated evidence references marked stale */
  readonly invalidatedEvidenceRefs: readonly string[];
  /** Minimum sufficient set of ValidationCase IDs required */
  readonly requiredNewCases: readonly string[];
  /** Specific bounded scope of the retest */
  readonly retestScope: readonly string[];
  /** The canonical REQUIRES_RETEST relationship edge if graph was provided */
  readonly requiresRetestEdge?: RelationshipEdge;
}

/**
 * Input parameters for RetestPlanner.recordSupersession().
 */
export interface RecordSupersessionInput {
  /** The newly executed ValidationExecutionRecord */
  readonly newExecutionRecord: ValidationExecutionRecord;
  /** The historical prior ValidationExecutionRecord being superseded */
  readonly priorExecutionRecord: ValidationExecutionRecord;
  /** Relationship graph to record the SUPERSEDES_VALIDATION edge */
  readonly graph: ValidationRelationshipGraph;
  /** Optional audit ledger to record the edge */
  readonly auditLedger?: ValidationAuditLedger;
  /** Optional ISO 8601 UTC timestamp */
  readonly timestamp?: string;
}

/**
 * Result produced by RetestPlanner.recordSupersession().
 */
export interface RecordSupersessionResult {
  /** The canonical SUPERSEDES_VALIDATION edge */
  readonly edge: RelationshipEdge;
  /** The new execution record ID (source) */
  readonly newExecutionId: string;
  /** The superseded historical execution record ID (target) */
  readonly supersededExecutionId: string;
}
