// src/sound-engineer/validation/attribution/attributionTypes.ts
// Phase 1C.5h WP-16: Root-Layer Failure Attribution & Diagnostic Isolation Engine Types.
// Bound to frozen specification v0.1j Section 21, Section 29, Table 09, Table 17, and Implementation Plan v0.1h WP-16.

import {
  FailureAttributionClass,
  AttributionConfidenceLevel,
  FailureMateriality,
  FAILURE_ATTRIBUTION_CLASSES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  FAILURE_MATERIALITIES,
} from "../schemas/enums";
import {
  ValidationExecutionRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  ValidationFailureRecord,
} from "../schemas/records";
import { RelationshipEdge, GraphEdgeEndpoint } from "../graph/edgeTypes";

/**
 * Governed Table 17 Remand Classes.
 */
export const REMAND_CLASSES = {
  MIGRATION_REMAND: "MIGRATION_REMAND",
  REASONING_REMAND: "REASONING_REMAND",
  TRANSLATION_REMAND: "TRANSLATION_REMAND",
  RUNTIME_REMAND: "RUNTIME_REMAND",
  FIXTURE_REMAND: "FIXTURE_REMAND",
  ENVIRONMENT_REMAND: "ENVIRONMENT_REMAND",
  PLATFORM_REMAND: "PLATFORM_REMAND",
  INFRASTRUCTURE_REMAND: "INFRASTRUCTURE_REMAND",
  JOINT_DIAGNOSTIC_REMAND: "JOINT_DIAGNOSTIC_REMAND",
} as const;
export type RemandClass = (typeof REMAND_CLASSES)[keyof typeof REMAND_CLASSES];

/**
 * Governed routing information for a remand destination according to Table 17 & Section 29.
 */
export interface RemandDestinationInfo {
  readonly remandClass: RemandClass;
  readonly remandDestination: string;
  readonly upstreamRecipient: string;
  readonly governanceEntityId: string;
  readonly defaultRetestPrerequisites: string;
}

/**
 * The authoritative Table 17 Remand Routing Destination mapping for all 9 attribution classes.
 */
export const TABLE_17_REMAND_ROUTING: Readonly<Record<FailureAttributionClass, RemandDestinationInfo>> = {
  [FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING]: {
    remandClass: REMAND_CLASSES.MIGRATION_REMAND,
    remandDestination: "Phase 1C.5g Migration Team",
    upstreamRecipient: "Phase 1C.5g Migration",
    governanceEntityId: "GOVERNANCE_PHASE_1C5G_MIGRATION",
    defaultRetestPrerequisites:
      "Re-evaluate heuristic translation table, correct parameter transformation mapping, and verify schema diff",
  },
  [FAILURE_ATTRIBUTION_CLASSES.REASONING]: {
    remandClass: REMAND_CLASSES.REASONING_REMAND,
    remandDestination: "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)",
    upstreamRecipient: "Phases 1C.5a–e Governance",
    governanceEntityId: "GOVERNANCE_UPSTREAM_REASONING",
    defaultRetestPrerequisites:
      "Refine prompt, correct causal graph, update reasoning constraints, and eliminate cognitive contradictions across Stages 01–14",
  },
  [FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION]: {
    remandClass: REMAND_CLASSES.TRANSLATION_REMAND,
    remandDestination: "Stage 12 Platform Translation Governance",
    upstreamRecipient: "Stage 12 Platform Team",
    governanceEntityId: "GOVERNANCE_STAGE_12_PLATFORM",
    defaultRetestPrerequisites:
      "Correct platform parameter ID, update parameter normalization curve, and validate preset serialization syntax",
  },
  [FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION]: {
    remandClass: REMAND_CLASSES.RUNTIME_REMAND,
    remandDestination: "Software Engineering Core Team",
    upstreamRecipient: "Core Software Team",
    governanceEntityId: "GOVERNANCE_CORE_SOFTWARE",
    defaultRetestPrerequisites:
      "Patch runtime memory/threading defect, resolve null pointer or buffer overflow, and verify regression fix",
  },
  [FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE]: {
    remandClass: REMAND_CLASSES.FIXTURE_REMAND,
    remandDestination: "Golden Fixture Curation Team",
    upstreamRecipient: "Fixture Curation Team",
    governanceEntityId: "GOVERNANCE_FIXTURE_CURATION",
    defaultRetestPrerequisites:
      "Recalibrate audio stem, record new DI track with verified hardware levels, or quarantine contaminated fixture",
  },
  [FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT]: {
    remandClass: REMAND_CLASSES.ENVIRONMENT_REMAND,
    remandDestination: "Validation Infrastructure Engineering",
    upstreamRecipient: "Infrastructure Team",
    governanceEntityId: "GOVERNANCE_VALIDATION_INFRASTRUCTURE",
    defaultRetestPrerequisites:
      "Scale test runner resource budget, patch host audio driver, and stabilize test container execution environment",
  },
  [FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM]: {
    remandClass: REMAND_CLASSES.PLATFORM_REMAND,
    remandDestination: "Platform Integration & Vendor Compatibility Team",
    upstreamRecipient: "Vendor Integration",
    governanceEntityId: "GOVERNANCE_VENDOR_INTEGRATION",
    defaultRetestPrerequisites:
      "File vendor bug report, update compatibility shim, or verify vendor platform patch notes",
  },
  [FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE]: {
    remandClass: REMAND_CLASSES.INFRASTRUCTURE_REMAND,
    remandDestination: "Operations & SRE Team",
    upstreamRecipient: "Operations / SRE Team",
    governanceEntityId: "GOVERNANCE_OPERATIONS_SRE",
    defaultRetestPrerequisites:
      "Resolve cluster scheduling constraints, stabilize database connection dropouts, and remediate disk I/O degradation",
  },
  [FAILURE_ATTRIBUTION_CLASSES.UNKNOWN]: {
    remandClass: REMAND_CLASSES.JOINT_DIAGNOSTIC_REMAND,
    remandDestination: "Joint Diagnostic Working Group",
    upstreamRecipient: "Joint Diagnostic Working Group",
    governanceEntityId: "GOVERNANCE_JOINT_DIAGNOSTIC",
    defaultRetestPrerequisites:
      "Execute joint forensic diagnostic isolation across working group and establish unambiguous root architectural layer",
  },
};

/**
 * Quantitative or qualitative anomaly in measurements supporting failure isolation.
 */
export interface MeasurementAnomaly {
  readonly metric: string;
  readonly observed: number | string;
  readonly expected: number | string | [number, number];
  readonly deviation?: number;
  readonly unit?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Structured diagnostic symptom descriptor fed into forensic analysis.
 */
export interface ForensicSymptomDescriptor {
  readonly title: string;
  readonly symptom: string;
  readonly error?: Error | { name?: string; message?: string; stack?: string };
  readonly exitCode?: number;
  readonly logs?: ReadonlyArray<string>;
  readonly traceId?: string;
  readonly runTraceRef?: string;
  readonly measurementAnomalies?: ReadonlyArray<MeasurementAnomaly>;
  readonly audioIntegrityAnomalies?: ReadonlyArray<string>;
  readonly platformError?: {
    code?: string;
    vendorMessage?: string;
    rawOutput?: string;
  };
  readonly mappingDiff?: {
    sourceParam?: string;
    mappedParam?: string;
    heuristicRuleId?: string;
    description?: string;
  };
  readonly reasoningDiagnostics?: {
    stageNumber?: number;
    stageName?: string;
    contradictionDetected?: boolean;
    causalAnomaly?: string;
    hypothesisRefuted?: boolean;
  };
}

/**
 * Caller input for the FailureAttributionEngine.
 */
export interface FailureAttributionInput {
  readonly failureId?: string;
  readonly executionRecord: ValidationExecutionRecord;
  readonly scopeRecord: ValidationScopeRecord;
  readonly versionBindingRecord?: ValidationVersionBindingRecord;
  readonly symptomDetails: ForensicSymptomDescriptor;
  readonly explicitAttributionClass?: FailureAttributionClass;
  readonly explicitConfidence?: AttributionConfidenceLevel;
  readonly materiality?: FailureMateriality;
  readonly gate8Blocked?: boolean;
  readonly affectedScope?: ReadonlyArray<string>;
  readonly evidenceRefs?: ReadonlyArray<string>;
  readonly customRemandDestination?: string;
  readonly customRetestPrerequisites?: string;
  readonly customGovernanceEntityId?: string;
}

/**
 * Individual step recorded in the forensic isolation trace.
 */
export interface ForensicDecisionStep {
  readonly stepNumber: number;
  readonly evaluatedLayer: FailureAttributionClass;
  readonly hypothesis: string;
  readonly result: "MATCH" | "RULED_OUT" | "INCONCLUSIVE";
  readonly rationale: string;
}

/**
 * Detailed trace of the forensic isolation process proving why a layer was selected or ruled out.
 */
export interface ForensicIsolationTrace {
  readonly steps: ReadonlyArray<ForensicDecisionStep>;
  readonly isolatedClass: FailureAttributionClass;
  readonly confidence: AttributionConfidenceLevel;
  readonly primaryEvidenceSummary: string;
  readonly isConfounded: boolean;
}

/**
 * Complete result emitted by the FailureAttributionEngine.
 */
export interface FailureAttributionResult {
  readonly record: ValidationFailureRecord;
  readonly remandDestination: string;
  readonly remandClass: RemandClass;
  readonly upstreamRecipient: string;
  readonly governanceEntity: GraphEdgeEndpoint;
  readonly edgesCreated: ReadonlyArray<RelationshipEdge>;
  readonly isolationTrace: ForensicIsolationTrace;
}
