// src/sound-engineer/validation/traceability/traceabilityTypes.ts
// Implementation-local types and contracts for Phase 1C.5h WP-29:
// Comprehensive Audit Trail, Traceability & Reasoning Provenance.
// Bound to frozen specification v0.1j Section 32 & Table 19.

import { RunId } from "../../execution";
import { TraceId } from "../../trace/runTrace";
import { ArtifactReference } from "../../checkpoints/artifactReference";
import {
  ValidationExecutionRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationCase,
  ValidationScopeRecord,
} from "../schemas/records";

/**
 * Implementation-local audit verdicts for WP-29 traceability evaluations.
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * These are NOT global governance/lifecycle statuses. They do not appear in GOVERNANCE_STATUSES.
 * They represent local audit disposition codes for TraceabilityAuditReport.
 */
export const TRACEABILITY_AUDIT_VERDICTS = {
  /** All programmatically auditable structural and evidence invariants satisfied; zero violations detected */
  TRACE_COMPLIANCE_VERIFIED: "TRACE_COMPLIANCE_VERIFIED",

  /** One or more affirmative structural or governance violations detected */
  TRACE_COMPLIANCE_DEFICIENT: "TRACE_COMPLIANCE_DEFICIENT",

  /** Essential trace checkpoints or evidence required for verification are absent/unsupplied */
  TRACE_COMPLIANCE_NOT_VERIFIABLE: "TRACE_COMPLIANCE_NOT_VERIFIABLE",
} as const;

export type TraceabilityAuditVerdict =
  (typeof TRACEABILITY_AUDIT_VERDICTS)[keyof typeof TRACEABILITY_AUDIT_VERDICTS];

/**
 * Finding type strictly separating positive rule violations from unverified missing evidence.
 */
export const TRACEABILITY_FINDING_TYPES = {
  /** Evidence affirmatively demonstrates a frozen governance rule or sequence invariant was broken */
  VIOLATION: "VIOLATION",

  /** Evidence required to determine compliance is absent or insufficient to evaluate */
  NOT_VERIFIABLE: "NOT_VERIFIABLE",

  /** Factual informational observation or non-blocking diagnostic note */
  INFORMATIONAL: "INFORMATIONAL",
} as const;

export type TraceabilityFindingType =
  (typeof TRACEABILITY_FINDING_TYPES)[keyof typeof TRACEABILITY_FINDING_TYPES];

/**
 * Severity of a traceability finding.
 */
export const TRACEABILITY_FINDING_SEVERITIES = {
  /** Critical failure factual audit classification (descriptive only; translated downstream by readiness services) */
  CRITICAL: "CRITICAL",

  /** Material issue or advisory warning */
  WARNING: "WARNING",

  /** Diagnostic contextual information */
  INFO: "INFO",
} as const;

export type TraceabilityFindingSeverity =
  (typeof TRACEABILITY_FINDING_SEVERITIES)[keyof typeof TRACEABILITY_FINDING_SEVERITIES];

/**
 * Narrow implementation-local finding categories needed by the frozen contract.
 */
export const TRACEABILITY_FINDING_CATEGORIES = {
  /** Checkpoint structure, layer sequencing, or timestamp monotonicity */
  TRACE_STRUCTURE: "TRACE_STRUCTURE",

  /** Compliance evaluation against the 21 Principles of Sound Engineering Reasoning */
  PRINCIPLE_GOVERNANCE: "PRINCIPLE_GOVERNANCE",

  /** Input/output artifact reference chain or checkpoint envelope linkage */
  LINEAGE: "LINEAGE",

  /** Source data attribution, environment metadata, or version binding context */
  PROVENANCE: "PROVENANCE",

  /** Validation measurements (Records 10 & 11) lacking resolvable trace linkage */
  ORPHANED_MEASUREMENT: "ORPHANED_MEASUREMENT",

  /** Gear parameter translation linkage back to semantic design or engineering decision */
  PARAMETER_PROVENANCE: "PARAMETER_PROVENANCE",

  /** Structural checkpoint envelope integrity, sequence indices, or contract versions */
  INTEGRITY_STRUCTURE: "INTEGRITY_STRUCTURE",
} as const;

export type TraceabilityFindingCategory =
  (typeof TRACEABILITY_FINDING_CATEGORIES)[keyof typeof TRACEABILITY_FINDING_CATEGORIES];

/**
 * A concrete, structured traceability finding.
 */
export interface TraceabilityFinding {
  /** Stable finding identifier / code (e.g. "ERR_SEQ_INVERTED", "WARN_P13_TRADEOFFS_ABSENT") */
  readonly code: string;

  /** Distinction between positive violation and missing verifiable evidence */
  readonly type: TraceabilityFindingType;

  /** Functional category */
  readonly category: TraceabilityFindingCategory;

  /** Severity level */
  readonly severity: TraceabilityFindingSeverity;

  /** Associated principle number (1-21) if applicable */
  readonly principleNumber?: number;

  /** Associated checkpoint identifier if localized */
  readonly checkpointId?: string;

  /** Associated layer name if localized */
  readonly layer?: string;

  /** Target entity or parameter identifier if localized */
  readonly targetId?: string;

  /** Concise factual message */
  readonly message: string;

  /** Detailed technical description or trace evidence */
  readonly details?: string;

  /** Originating canonical record kind for validation linkage (e.g. "ValidationExecutionRecord", "ObjectiveEvidenceRecord") */
  readonly recordKind?: string;

  /** Originating canonical record identifier */
  readonly recordId?: string;

  /** Associated parent execution ID */
  readonly executionId?: string;
}

/**
 * Representation strength of a reasoning lifecycle stage in current runtime contracts.
 */
export const STAGE_REPRESENTATION_STRENGTHS = {
  /** Explicit, independently identifiable stage record / artifact exists */
  EXACT: "EXACT",

  /** Stage presence is derived from a typed subrecord or explicit property */
  DERIVED: "DERIVED",

  /** Stage is conceptually embedded inside a broader checkpoint layer (e.g. ENGINEERING) */
  GROUPED: "GROUPED",

  /** No discrete runtime artifact or subrecord represents this stage */
  NOT_REPRESENTED: "NOT_REPRESENTED",
} as const;

export type StageRepresentationStrength =
  (typeof STAGE_REPRESENTATION_STRENGTHS)[keyof typeof STAGE_REPRESENTATION_STRENGTHS];

/**
 * Factual metadata for one of the 14 reasoning lifecycle stages.
 */
export interface LifecycleStageMetadata {
  /** Stage ordinal: 1 through 14 */
  readonly stageNumber: number;

  /** Canonical stage name from Phase 1C.5a / 1C.5f */
  readonly stageName: string;

  /** How the stage is represented in current runtime contracts */
  readonly representationStrength: StageRepresentationStrength;

  /** Originating runtime layer from SOUND_ENGINEER_LAYERS */
  readonly sourceLayer: string;

  /** Expected artifact type if explicitly produced */
  readonly artifactType?: string;

  /** Whether affirmative evidence is required for a production cutover candidate */
  readonly requiredForGate8Cutover: boolean;

  /** Concise architectural description of stage purpose */
  readonly description: string;
}

/**
 * Six runtime envelope groups from SOUND_ENGINEER_LAYERS.
 */
export const RUNTIME_ENVELOPE_GROUPS = {
  INPUT: "INPUT",
  EVIDENCE: "EVIDENCE",
  ENGINEERING: "ENGINEERING",
  SEMANTIC_DESIGN: "SEMANTIC_DESIGN",
  PLATFORM_TRANSLATION: "PLATFORM_TRANSLATION",
  VALIDATION: "VALIDATION",
} as const;

export type RuntimeEnvelopeGroup =
  (typeof RUNTIME_ENVELOPE_GROUPS)[keyof typeof RUNTIME_ENVELOPE_GROUPS];

/**
 * Metadata for a grouped runtime checkpoint layer.
 */
export interface RuntimeEnvelopeMetadata {
  readonly layer: RuntimeEnvelopeGroup;
  readonly associatedStages: readonly number[];
  readonly expectedArtifactType: string;
  readonly isRequiredForCompleteTrace: boolean;
}

/**
 * Evaluation state for an individual principle audit.
 */
export const PRINCIPLE_AUDIT_STATES = {
  /** Verifiable structural or evidence requirements are satisfied */
  SATISFIED: "SATISFIED",

  /** Factual violation of governance rule detected */
  VIOLATION: "VIOLATION",

  /** Required evidence is missing or trace is truncated */
  NOT_VERIFIABLE: "NOT_VERIFIABLE",

  /** Substantive engineering judgement delegated to upstream stage/review */
  DELEGATED: "DELEGATED",
} as const;

export type PrincipleAuditState =
  (typeof PRINCIPLE_AUDIT_STATES)[keyof typeof PRINCIPLE_AUDIT_STATES];

/**
 * Result of auditing a single Principle of Sound Engineering Reasoning.
 */
export interface PrincipleAuditResult {
  readonly principleNumber: number;
  readonly title: string;
  readonly auditStrength: string;
  readonly state: PrincipleAuditState;
  readonly findings: readonly TraceabilityFinding[];
  readonly notes?: string;
}

/**
 * Parameter provenance capability levels.
 * Current maximum truthfully supported level is LEVEL_3_DECISION_RECORD_TRACE.
 */
export const PARAMETER_PROVENANCE_LEVELS = {
  /** Level 1: Parameter -> PlatformTranslationItem only */
  LEVEL_1_PARAMETER_IDENTITY: "LEVEL_1_PARAMETER_IDENTITY",

  /** Level 2: Parameter -> TranslationItem -> SemanticProcessingStage */
  LEVEL_2_DESIGN_TRACE: "LEVEL_2_DESIGN_TRACE",

  /** Level 3: Parameter -> TranslationItem -> SemanticStage -> EngineeringDecisionRecord (record-level) */
  LEVEL_3_DECISION_RECORD_TRACE: "LEVEL_3_DECISION_RECORD_TRACE",

  /** Level 4: Parameter -> Exact EngineeringDecisionItem (currently unsupported by explicit IDs) */
  LEVEL_4_EXACT_DECISION_TRACE: "LEVEL_4_EXACT_DECISION_TRACE",

  /** Level 5: Parameter -> Decision -> Requirement -> Diagnosis -> Observation (currently unsupported by explicit IDs) */
  LEVEL_5_EXACT_CAUSAL_TRACE: "LEVEL_5_EXACT_CAUSAL_TRACE",
} as const;

export type ParameterProvenanceCapabilityLevel =
  (typeof PARAMETER_PROVENANCE_LEVELS)[keyof typeof PARAMETER_PROVENANCE_LEVELS];

/**
 * Current maximum supported parameter provenance capability level.
 */
export const MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL: ParameterProvenanceCapabilityLevel =
  PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE;

/**
 * Identity structure identifying an individual parameter within a platform translation plan.
 */
export interface ParameterIdentity {
  /** Stage identifier from PlatformTranslationItem / SemanticProcessingStage */
  readonly stageId: string;

  /** Target gear device identifier from PlatformDeviceMapping */
  readonly targetDeviceId: string;

  /** Parameter name key within platformSpecificParameters */
  readonly parameterName: string;
}

/**
 * Formats a composite parameter key from its identity components.
 * Note: Indexers must support collision/ambiguity reporting if duplicate keys occur.
 */
export function formatParameterKey(identity: ParameterIdentity): string {
  return `${identity.stageId}::${identity.targetDeviceId}::${identity.parameterName}`;
}

/**
 * Level 1 factual translation context for a platform-specific parameter.
 */
export interface ParameterProvenanceTranslationContext {
  readonly stageId: string;
  readonly semanticRole: string;
  readonly targetDeviceId: string;
  readonly targetDeviceName: string;
  readonly deviceCategory: string;
  readonly rationale?: string;
  readonly confidence?: number;
}

/**
 * Level 2 factual semantic tone design context for a platform-specific parameter.
 */
export interface ParameterProvenanceSemanticContext {
  readonly stageId: string;
  readonly stageIndex: number;
  readonly role: string;
  readonly designIntent: string;
  readonly constraints: ReadonlyArray<string>;
}

/**
 * Level 3 factual engineering decision record context for a platform-specific parameter.
 * Bound strictly to record-level provenance (not exact decision item).
 */
export interface ParameterProvenanceDecisionContext {
  readonly decisionRecordId: string;
  readonly overallObjective: string;
  readonly confidence: number;
  readonly evidenceReference?: ArtifactReference;
}

/**
 * Comprehensive implementation-local parameter provenance entry.
 * Capped strictly at Level 3 (LEVEL_3_DECISION_RECORD_TRACE).
 */
export interface ParameterProvenanceEntry {
  /** Bound trace identifier if audited in a RunTrace context */
  readonly traceId?: TraceId;

  /** Bound execution run identifier */
  readonly runId?: RunId;

  readonly identity: ParameterIdentity;
  readonly parameterKey: string;
  readonly translatedValue?: unknown;
  readonly provenanceLevel: ParameterProvenanceCapabilityLevel;
  readonly isAmbiguous: boolean;
  readonly isUnresolved?: boolean;

  /** Level 1: Platform Translation context */
  readonly translationItem: ParameterProvenanceTranslationContext;

  /** Level 2: Semantic Tone Design Stage context (present if resolved) */
  readonly semanticStage?: ParameterProvenanceSemanticContext;

  /** Level 3: Engineering Decision Record context (present if resolved) */
  readonly decisionRecord?: ParameterProvenanceDecisionContext;
}

/**
 * Factual summary of parameter provenance indexing.
 * Strictly separates mutually exclusive final levels from cumulative coverage.
 */
export interface ParameterProvenanceSummary {
  /** Total translated parameter key-value pairs encountered across all translation items */
  readonly totalParametersEncountered: number;

  /** Total entries present in the parameter provenance index */
  readonly totalIndexEntries: number;

  /** Total unique composite keys in the index */
  readonly uniqueKeysCount: number;

  /** Total composite keys that encountered collisions (> 1 entry) */
  readonly ambiguousKeysCount: number;

  /** Total parameter entries participating in collisions */
  readonly ambiguousEntriesCount: number;

  /** Mutually exclusive: entries whose highest reached level stopped at Level 1 */
  readonly level1ExactCount: number;

  /** Mutually exclusive: entries whose highest reached level stopped at Level 2 */
  readonly level2ExactCount: number;

  /** Mutually exclusive: entries whose highest reached level reached Level 3 */
  readonly level3ExactCount: number;

  /** Cumulative: entries reaching at least Level 1 (always equals totalIndexEntries) */
  readonly level1CumulativeCount: number;

  /** Cumulative: entries reaching at least Level 2 (level2Exact + level3Exact) */
  readonly level2CumulativeCount: number;

  /** Cumulative: entries reaching at least Level 3 (level3Exact) */
  readonly level3CumulativeCount: number;

  /** Total entries that could not reach required Level 3 provenance (level1Exact + level2Exact) */
  readonly unresolvedEntriesCount: number;

  /** Maximum provenance capability level reached across the population */
  readonly maxLevelReached: ParameterProvenanceCapabilityLevel;

  // Backward-compatibility aliases
  readonly totalIndexedParameters: number;
  readonly level1OnlyCount: number;
  readonly level2Count: number;
  readonly level3Count: number;
}

/**
 * Canonical validation evidence optionally supplied for WP-29 Slice 1C linkage.
 * CRITICAL BOUNDARY:
 * Consumes existing canonical records only (Records 9, 10, 11, and optionally 5 and 2).
 * Does not define new record types or modify existing schemas.
 */
export interface ValidationAuditEvidence {
  readonly executions?: readonly ValidationExecutionRecord[];
  readonly objectiveEvidence?: readonly ObjectiveEvidenceRecord[];
  readonly perceptualEvaluations?: readonly PerceptualEvaluationRecord[];
  readonly validationCases?: readonly ValidationCase[];
  readonly validationScopes?: readonly ValidationScopeRecord[];

  // Canonical record naming aliases
  readonly executionRecords?: readonly ValidationExecutionRecord[];
  readonly objectiveEvidenceRecords?: readonly ObjectiveEvidenceRecord[];
  readonly perceptualEvaluationRecords?: readonly PerceptualEvaluationRecord[];
  readonly validationScopeRecords?: readonly ValidationScopeRecord[];
}

/**
 * Factual context describing evidence supplied for an audit execution.
 */
export interface AuditEvidenceContext {
  readonly isValidationIntegrated: boolean;
  readonly empiricalOutcomeVerified: boolean;
  readonly executionRecordCount: number;
  readonly objectiveEvidenceCount: number;
  readonly perceptualEvaluationCount: number;
  readonly validationCaseCount: number;
  readonly validationScopeCount: number;
}

/**
 * Summary of orphaned measurement evaluation.
 */
export interface OrphanedMeasurementSummary {
  readonly totalMeasurementsChecked: number;
  readonly orphanedCount: number;
  readonly ruleA_MissingExecutionCount: number;
  readonly ruleB_UnresolvableTraceCount: number;
  readonly scopeCoverageVerifiedCount: number;

  // Canonical WP-29 Slice 1C contract aliases and breakdowns
  readonly totalMeasurements: number;
  readonly resolvedMeasurements: number;
  readonly orphanedMeasurements: number;
  readonly unverifiedMeasurements: number;
  readonly objectiveEvidenceCount: number;
  readonly perceptualEvaluationCount: number;
  readonly objectiveOrphanedCount: number;
  readonly perceptualOrphanedCount: number;
}

/**
 * Detailed stage verification entry in audit report.
 */
export interface StageVerificationEntry {
  readonly stageNumber: number;
  readonly stageName: string;
  readonly representation: StageRepresentationStrength;
  readonly presentInTrace: boolean;
  readonly details?: string;
}

/**
 * Comprehensive in-memory report produced by TraceabilityAuditor.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * This is an implementation-local result structure.
 * It is NOT Record 23, NOT a canonical validation record, and is NEVER written to the audit ledger.
 */
export interface TraceabilityAuditReport {
  /** Trace identifier audited */
  readonly traceId: TraceId;

  /** Bound execution run identity */
  readonly runId: RunId;

  /** Overall audit verdict */
  readonly verdict: TraceabilityAuditVerdict;

  /** Boolean summary flag indicating whether all auditable governance invariants passed */
  readonly allAuditableInvariantsPassed: boolean;

  /** Detailed findings (violations, missing evidence, informational notes) */
  readonly findings: readonly TraceabilityFinding[];

  /** Stage-by-stage coverage evaluation based on the factual representation model */
  readonly lifecycleCoverage: readonly StageVerificationEntry[];

  /** Individual evaluation results for Principles 1 through 21 */
  readonly principleResults: readonly PrincipleAuditResult[];

  /** Summary of validation measurement linkage and orphan detection */
  readonly orphanedMeasurementSummary: OrphanedMeasurementSummary;

  /** Factual context describing whether evidence was RunTrace-only or validation-integrated */
  readonly evidenceContext: AuditEvidenceContext;

  /** Parameter provenance capability metadata */
  readonly parameterProvenanceCapability: {
    readonly maxSupportedLevel: ParameterProvenanceCapabilityLevel;
    readonly activeLevel: ParameterProvenanceCapabilityLevel;
    readonly notes: string;
  };

  /** Optional parameter provenance indexing summary (WP-29 Slice 1D) */
  readonly parameterProvenanceSummary?: ParameterProvenanceSummary;

  /** Audit execution timing metadata */
  readonly timing: {
    readonly startedAt: string;
    readonly completedAt: string;
    readonly durationMs: number;
  };
}
