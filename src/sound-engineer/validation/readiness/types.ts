// src/sound-engineer/validation/readiness/types.ts
// Authoritative type definitions and interfaces for Phase 1C.5h WP-06:
// Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor (Record 4).
// Bound to frozen specification v0.1j Section 10 and Implementation Plan v0.1h WP-06.

import { z } from "zod";
import {
  PREREQUISITE_STATUSES,
  PrerequisiteStatus,
  READINESS_OUTCOMES,
  ReadinessOutcome,
} from "../schemas/enums";
import {
  ValidationIntakeRecord,
  ValidationReadinessAssessmentRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  GateCompletionToken,
  MigrationHandoffPackage,
  Phase1C5gGateName,
  PHASE_1C5G_GATE_NAMES,
} from "../intake/types";

export {
  PHASE_1C5G_GATE_NAMES,
  type Phase1C5gGateName,
  type GateCompletionToken,
  type MigrationHandoffPackage,
};

/**
 * The complete Eight Mandatory Readiness Prerequisites defined in frozen Section 10.2.
 * CRITICAL ARCHITECTURAL CONSTITUTION: All 8 prerequisites must be audited.
 * Zero omitted checks permitted.
 */
export const MANDATORY_READINESS_PREREQUISITES = {
  /** 1. The handoff package is verifiable, uncorrupted, and matches cryptographic reference */
  HANDOFF_INTEGRITY: "Handoff Integrity",
  /** 2. Gates 1 through 7 recorded as COMPLETE with sealed tokens */
  ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED: "All Seven Phase 1C.5g Gates Documented",
  /** 3. Validated, uncontaminated golden fixtures matching declared scope exist and are accessible */
  GOLDEN_FIXTURE_AVAILABILITY: "Golden Fixture Availability",
  /** 4. Test environment, audio engine host, and target platform match the version binding */
  EXECUTION_ENVIRONMENT_STABILITY: "Execution Environment Stability",
  /** 5. Phase 1C.5f RunTrace recorder is active and ready to log all validation executions */
  TRACEABILITY_PIPELINE_ACTIVE: "Traceability Pipeline Active",
  /** 6. PATH-PROD and PATH-SHADOW execution harnesses are calibrated and comparable */
  COMPARABILITY_VERIFIED: "Comparability Verified",
  /** 7. PATH-ROLLBACK staging is configured and verified for live reversion testing */
  ROLLBACK_STAGING_VERIFIED: "Rollback Staging Verified",
  /** 8. No active critical defects or quarantine flags apply to scoped candidate units */
  ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS: "Absence of Unresolved Upstream Blockers",
} as const;

export type MandatoryReadinessPrerequisite =
  (typeof MANDATORY_READINESS_PREREQUISITES)[keyof typeof MANDATORY_READINESS_PREREQUISITES];

export const MANDATORY_READINESS_PREREQUISITE_NAMES = Object.freeze(
  Object.values(MANDATORY_READINESS_PREREQUISITES)
) as ReadonlyArray<MandatoryReadinessPrerequisite>;

/**
 * Audit result for an individual Phase 1C.5g gate.
 */
export interface GateAuditResult {
  readonly gateName: Phase1C5gGateName;
  readonly status: PrerequisiteStatus;
  readonly tokenPresent: boolean;
  readonly tokenId?: string;
  readonly sealedAt?: string;
  readonly authorizedBy?: string;
  readonly deficiencyReason?: string;
}

/**
 * Detailed deficiency log entry for an unmet readiness prerequisite.
 */
export interface PrerequisiteDeficiency {
  readonly prerequisite: string;
  readonly status: PrerequisiteStatus;
  readonly reason: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Golden fixture corpus assessment input.
 */
export interface FixtureAssessmentInput {
  /** Fixture coverage ratio across declared scope (0.0 to 1.0) */
  readonly coverageRatio: number;
  /** Total number of units within scope requiring golden fixtures */
  readonly totalScopedUnits?: number;
  /** Number of scoped units with accessible, verified golden fixtures */
  readonly unitsWithVerifiedFixtures?: number;
  /** Explicit list of scoped units missing golden fixtures */
  readonly missingFixtureUnits?: ReadonlyArray<string>;
  /** Contaminated fixture identifiers detected */
  readonly contaminatedFixtures?: ReadonlyArray<string>;
  /** Inaccessible fixture identifiers detected */
  readonly inaccessibleFixtures?: ReadonlyArray<string>;
  /** Whether fixture payload cryptographic integrity was verified */
  readonly payloadIntegrityVerified?: boolean;
}

/**
 * Execution environment stability status.
 */
export interface EnvironmentStatusInput {
  /** Whether the test harness and execution host are stable and ready */
  readonly isStable: boolean;
  /** Target platform host application version (must match version binding) */
  readonly targetPlatformRuntimeVersion?: string;
  /** Host OS / audio driver container environment version (must match version binding) */
  readonly hostEnvironmentVersion?: string;
  /** Execution codebase runtime version (must match version binding) */
  readonly runtimeImplementationVersion?: string;
  /** Diagnostic failure reason if unstable */
  readonly failureReason?: string;
}

/**
 * Phase 1C.5f Traceability Pipeline status.
 */
export interface TraceabilityPipelineStatusInput {
  /** Whether the RunTrace recorder is active and ready to log all validation executions */
  readonly isActive: boolean;
  /** Recorder instance identifier or session reference */
  readonly recorderId?: string;
  /** Diagnostic failure reason if inactive */
  readonly failureReason?: string;
}

/**
 * Comparability verification status between PATH-PROD and PATH-SHADOW harnesses.
 */
export interface ComparabilityStatusInput {
  /** Whether the harnesses have completed calibration */
  readonly isCalibrated: boolean;
  /** Whether the harnesses exhibit verified numerical and perceptual comparability */
  readonly isComparable: boolean;
  /** Diagnostic failure reason if uncalibrated or discrepant */
  readonly failureReason?: string;
}

/**
 * Rollback staging verification status (PATH-ROLLBACK staging).
 */
export interface RollbackStagingStatusInput {
  /** Whether PATH-ROLLBACK staging environment is configured */
  readonly isConfigured: boolean;
  /** Whether live reversion testing has been verified operational */
  readonly isVerified: boolean;
  /** Diagnostic failure reason if unconfigured or unverified */
  readonly failureReason?: string;
}

/**
 * Structured upstream blocker evidence item.
 */
export interface UpstreamBlockerItem {
  /** Unique blocker or defect identifier */
  readonly blockerId: string;
  /** Blocker category / classification (e.g. CRITICAL_DEFECT, QUARANTINE) */
  readonly blockerClass?: string;
  /** Diagnostic description */
  readonly description?: string;
  /** If true, explicitly applies globally across all units */
  readonly isGlobal?: boolean;
  /** Specific candidate unit identifiers affected by this blocker */
  readonly affectedUnits?: ReadonlyArray<string>;
  /** Whether the blocker is active and unresolved (defaults to true if listed) */
  readonly isActive?: boolean;
}

/**
 * Upstream blocker and quarantine status.
 */
export interface UpstreamBlockerStatusInput {
  /** Structured active blockers/defects/quarantines */
  readonly blockers?: ReadonlyArray<UpstreamBlockerItem>;
  /**
   * Active critical defects. Can be structured UpstreamBlockerItem or string identifier.
   * If string is provided without unit metadata, fails closed as missing applicability evidence.
   */
  readonly activeCriticalDefects?: ReadonlyArray<string | UpstreamBlockerItem>;
  /**
   * Active quarantine flags. Can be structured UpstreamBlockerItem or string identifier.
   * If string is provided without unit metadata, fails closed as missing applicability evidence.
   */
  readonly quarantineFlags?: ReadonlyArray<string | UpstreamBlockerItem>;
  /** Explicit list of blocked candidate unit identifiers */
  readonly blockedCandidateUnits?: ReadonlyArray<string>;
}

/**
 * Parameters supplied to ReadinessAssessmentAuditor.assessReadiness().
 */
export interface ReadinessAssessmentParams {
  /** Authoritative ValidationIntakeRecord (Record 1) from WP-03 */
  readonly intakeRecord: ValidationIntakeRecord;

  /** Authoritative ValidationVersionBindingRecord (Record 3) from WP-05 */
  readonly versionBindingRecord: ValidationVersionBindingRecord;

  /** Optional ValidationScopeRecord (Record 2) from WP-04 */
  readonly scopeRecord?: ValidationScopeRecord;

  /**
   * Optional incoming MigrationHandoffPackage.
   * If provided, package integrity and gate tokens are cross-audited directly.
   */
  readonly handoffPackage?: MigrationHandoffPackage;

  /**
   * Optional direct gate completion tokens.
   * If omitted, extracted from handoffPackage.gates if present.
   */
  readonly gateTokens?: ReadonlyArray<GateCompletionToken> | Readonly<Record<string, unknown>>;

  /**
   * Golden Fixture evaluation input.
   * If omitted, defaults to 0.0 coverage (BLOCKED_NOT_EVALUABLE).
   */
  readonly fixtureAssessment?: FixtureAssessmentInput;

  /**
   * Execution environment stability check.
   */
  readonly environmentStatus?: EnvironmentStatusInput;

  /**
   * Phase 1C.5f Traceability pipeline check.
   */
  readonly traceabilityPipelineStatus?: TraceabilityPipelineStatusInput;

  /**
   * PATH-PROD vs PATH-SHADOW comparability check.
   */
  readonly comparabilityStatus?: ComparabilityStatusInput;

  /**
   * Rollback staging check.
   */
  readonly rollbackStagingStatus?: RollbackStagingStatusInput;

  /**
   * Active upstream defect and quarantine check.
   */
  readonly upstreamBlockerStatus?: UpstreamBlockerStatusInput;

  /**
   * Optional explicit declared limitations for READY_WITH_DECLARED_LIMITATIONS.
   */
  readonly limitationNotes?: ReadonlyArray<string>;

  /**
   * Assessor identifier (defaults to "automated_readiness_auditor").
   */
  readonly assessorId?: string;

  /**
   * Optional deterministic ISO 8601 UTC timestamp.
   */
  readonly timestamp?: string;
}

/**
 * Comprehensive result produced by ReadinessAssessmentAuditor.
 */
export interface ReadinessAssessmentResult {
  /** Canonical Record 4 payload */
  readonly record: ValidationReadinessAssessmentRecord;
  /** Detailed audit findings for each of the seven Phase 1C.5g gates */
  readonly gateAudits: ReadonlyArray<GateAuditResult>;
  /** Deficiency logs for any unmet prerequisite */
  readonly deficiencies: ReadonlyArray<PrerequisiteDeficiency>;
  /** Boolean convenience: true if candidate is evaluable (READY or READY_WITH_DECLARED_LIMITATIONS) */
  readonly isReady: boolean;
  /** Boolean convenience: true strictly if outcome is READY without limitations */
  readonly isFullyReady: boolean;
  /** Boolean convenience: true if readiness_outcome === BLOCKED_NOT_EVALUABLE */
  readonly isBlocked: boolean;
  /** Boolean convenience: true if readiness_outcome === READY_WITH_DECLARED_LIMITATIONS */
  readonly hasDeclaredLimitations: boolean;
}

/**
 * Dependencies injected into ReadinessAssessmentAuditor.
 */
export interface ReadinessAuditorDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly integrityProvider?: IntegrityProvider;
  readonly defaultAssessorId?: string;
}

/**
 * Governed error thrown when assertReady() is invoked and readiness is BLOCKED_NOT_EVALUABLE.
 */
export class ValidationReadinessBlockedError extends Error {
  public readonly readinessRecord: ValidationReadinessAssessmentRecord;
  public readonly deficiencies: ReadonlyArray<PrerequisiteDeficiency>;

  constructor(
    message: string,
    readinessRecord: ValidationReadinessAssessmentRecord,
    deficiencies: ReadonlyArray<PrerequisiteDeficiency>
  ) {
    super(message);
    this.name = "ValidationReadinessBlockedError";
    this.readinessRecord = readinessRecord;
    this.deficiencies = deficiencies;
    Object.setPrototypeOf(this, ValidationReadinessBlockedError.prototype);
  }
}
