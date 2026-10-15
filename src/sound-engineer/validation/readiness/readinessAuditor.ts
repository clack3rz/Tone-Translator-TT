// src/sound-engineer/validation/readiness/readinessAuditor.ts
// ReadinessAssessmentAuditor: Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor.
// Implements the pre-flight readiness gatekeeper defined in Section 10 and Activity WF-03.
// Audits all Eight Mandatory Readiness Prerequisites (including the seven Phase 1C.5g gates)
// and computes fixture coverage before launching empirical validation.
// Bound to frozen specification v0.1j Section 10 and Implementation Plan v0.1h WP-06.

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import {
  INTAKE_STATUSES,
  PREREQUISITE_STATUSES,
  PrerequisiteStatus,
  READINESS_OUTCOMES,
  ReadinessOutcome,
} from "../schemas/enums";
import { canonicalizeJson, IntegrityProvider } from "../schemas/integrity";
import {
  ValidationReadinessAssessmentRecord,
  validationReadinessAssessmentRecordSchema,
} from "../schemas/records";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  GateAuditResult,
  GateCompletionToken,
  MANDATORY_READINESS_PREREQUISITES,
  MandatoryReadinessPrerequisite,
  PHASE_1C5G_GATE_NAMES,
  Phase1C5gGateName,
  PrerequisiteDeficiency,
  ReadinessAssessmentParams,
  ReadinessAssessmentResult,
  ReadinessAuditorDependencies,
  UpstreamBlockerItem,
  ValidationReadinessBlockedError,
} from "./types";

/**
 * Normalizes gate candidate name against authoritative Phase 1C.5g gate names.
 * Accepts exact string (e.g. "Structural Mapping Complete") or standard prefixed format
 * (e.g. "Gate 1: Structural Mapping Complete").
 */
function matchesGateName(candidateName: string, requiredName: string): boolean {
  if (candidateName === requiredName) {
    return true;
  }
  const stripped = candidateName.replace(/^Gate\s*\d+\s*:\s*/i, "").trim();
  return stripped === requiredName;
}

/**
 * Standard gate labels formatted with "Gate N: <Name>" for unambiguous reporting.
 */
function formatGateLabel(index: number, name: Phase1C5gGateName): string {
  return `Gate ${index + 1}: ${name}`;
}

export class ReadinessAssessmentAuditor {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly defaultAssessorId: string;

  /** Historical in-memory cache indexed by readiness_id */
  private readonly assessmentsById = new Map<string, ValidationReadinessAssessmentRecord>();
  /** Historical in-memory cache indexed by intake_id */
  private readonly assessmentsByIntakeId = new Map<string, ValidationReadinessAssessmentRecord[]>();

  constructor(dependencies?: ReadinessAuditorDependencies) {
    this.graph = dependencies?.graph;
    this.ledger = dependencies?.ledger;
    this.integrityProvider = dependencies?.integrityProvider ?? new DefaultSha256IntegrityProvider();
    this.defaultAssessorId = dependencies?.defaultAssessorId ?? "automated_readiness_auditor";
  }

  /**
   * Performs an authoritative Pre-Validation Readiness Assessment auditing the
   * complete Eight Mandatory Readiness Prerequisites defined in Section 10.2.
   *
   * Enforces:
   * 1. Handoff Integrity (intake acceptance, package integrity, signature match)
   * 2. All Seven Phase 1C.5g Gates Documented (sealed completion tokens for Gates 1–7)
   * 3. Golden Fixture Availability (coverage ratio calculation, contamination audit)
   * 4. Execution Environment Stability (runtime, host, platform match version binding)
   * 5. Traceability Pipeline Active (Phase 1C.5f RunTrace recorder status)
   * 6. Comparability Verified (PATH-PROD vs PATH-SHADOW harness calibration)
   * 7. Rollback Staging Verified (PATH-ROLLBACK live reversion readiness)
   * 8. Absence of Unresolved Upstream Blockers (critical defects, quarantine flags)
   *
   * Produces canonical `ValidationReadinessAssessmentRecord` (Record 4) with zero omitted checks.
   */
  public assessReadiness(params: ReadinessAssessmentParams): ReadinessAssessmentResult {
    // Validate mandatory parameters
    if (!params || !params.intakeRecord) {
      throw new Error("Cannot assess readiness: intakeRecord is required.");
    }
    if (!params.versionBindingRecord) {
      throw new Error("Cannot assess readiness: versionBindingRecord is required.");
    }

    const { intakeRecord, versionBindingRecord } = params;
    const deficiencies: PrerequisiteDeficiency[] = [];
    const evaluatedPrerequisites: Record<string, PrerequisiteStatus> = {};

    // -------------------------------------------------------------------------
    // 1. Audit Prerequisite 1: Handoff Integrity
    // -------------------------------------------------------------------------
    const handoffAudit = this.auditHandoffIntegrity(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY] = handoffAudit.status;
    if (handoffAudit.deficiency) {
      deficiencies.push(handoffAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 2. Audit Prerequisite 2: All Seven Phase 1C.5g Gates Documented
    // -------------------------------------------------------------------------
    const gatesAudit = this.auditSevenPhase1C5gGates(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED] =
      gatesAudit.overallStatus;
    if (gatesAudit.deficiency) {
      deficiencies.push(gatesAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 3. Audit Prerequisite 3: Golden Fixture Availability
    // -------------------------------------------------------------------------
    const fixtureAudit = this.auditGoldenFixtureAvailability(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY] =
      fixtureAudit.status;
    if (fixtureAudit.deficiency) {
      deficiencies.push(fixtureAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 4. Audit Prerequisite 4: Execution Environment Stability
    // -------------------------------------------------------------------------
    const environmentAudit = this.auditExecutionEnvironmentStability(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY] =
      environmentAudit.status;
    if (environmentAudit.deficiency) {
      deficiencies.push(environmentAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 5. Audit Prerequisite 5: Traceability Pipeline Active
    // -------------------------------------------------------------------------
    const traceabilityAudit = this.auditTraceabilityPipeline(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE] =
      traceabilityAudit.status;
    if (traceabilityAudit.deficiency) {
      deficiencies.push(traceabilityAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 6. Audit Prerequisite 6: Comparability Verified
    // -------------------------------------------------------------------------
    const comparabilityAudit = this.auditComparability(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED] =
      comparabilityAudit.status;
    if (comparabilityAudit.deficiency) {
      deficiencies.push(comparabilityAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 7. Audit Prerequisite 7: Rollback Staging Verified
    // -------------------------------------------------------------------------
    const rollbackAudit = this.auditRollbackStaging(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED] =
      rollbackAudit.status;
    if (rollbackAudit.deficiency) {
      deficiencies.push(rollbackAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // 8. Audit Prerequisite 8: Absence of Unresolved Upstream Blockers
    // -------------------------------------------------------------------------
    const blockerAudit = this.auditUpstreamBlockers(params);
    evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS] =
      blockerAudit.status;
    if (blockerAudit.deficiency) {
      deficiencies.push(blockerAudit.deficiency);
    }

    // -------------------------------------------------------------------------
    // Synthesize Readiness Outcome & Limitation Notes
    // -------------------------------------------------------------------------
    const fixtureCoverageRatio = fixtureAudit.coverageRatio;
    const limitationNotes: string[] = params.limitationNotes ? [...params.limitationNotes] : [];

    // Check if any of the eight mandatory prerequisites failed or blocked
    const hasUnmetPrerequisite = (
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED] !== PREREQUISITE_STATUSES.PASS ||
      evaluatedPrerequisites[MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS] !== PREREQUISITE_STATUSES.PASS
    );

    let readinessOutcome: ReadinessOutcome;

    if (hasUnmetPrerequisite || fixtureCoverageRatio === 0) {
      // Critical prerequisites unmet or zero fixtures available
      readinessOutcome = READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE;
    } else if (fixtureCoverageRatio < 1.0) {
      // Governed bounded limitation: partial fixture coverage across valid subset
      readinessOutcome = READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS;
      const pct = Math.round(fixtureCoverageRatio * 100);
      const autoNote = `Partial golden fixture coverage: ${pct}% of scoped candidate units verified.`;
      if (!limitationNotes.some((n) => n.includes("Partial golden fixture coverage"))) {
        limitationNotes.push(autoNote);
      }
    } else {
      // All eight mandatory prerequisites pass, 100% fixture coverage, no governed bounded limitation
      readinessOutcome = READINESS_OUTCOMES.READY;
    }

    // -------------------------------------------------------------------------
    // Compute Full Deterministic Readiness ID & Assemble Record 4
    // -------------------------------------------------------------------------
    const assessmentTimestamp = params.timestamp ?? new Date().toISOString();
    const assessorId = params.assessorId ?? this.defaultAssessorId;

    const deterministicState = {
      intake_id: intakeRecord.intake_id,
      version_binding_id: versionBindingRecord.binding_id,
      evaluated_prerequisites: evaluatedPrerequisites,
      fixture_coverage_ratio: fixtureCoverageRatio,
      readiness_outcome: readinessOutcome,
      limitation_notes: limitationNotes,
    };
    const stateDigest = this.integrityProvider.computeDigest(canonicalizeJson(deterministicState));
    const readinessId = `readiness_${intakeRecord.intake_id}_${stateDigest}`;

    // Idempotency: return existing record if identical governed state was already evaluated
    if (this.assessmentsById.has(readinessId)) {
      const existingRecord = this.assessmentsById.get(readinessId)!;
      const isFullyReady = existingRecord.readiness_outcome === READINESS_OUTCOMES.READY;
      const hasDeclaredLimitations =
        existingRecord.readiness_outcome === READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS;
      return {
        record: existingRecord,
        gateAudits: deepFreeze(gatesAudit.results),
        deficiencies: deepFreeze(deficiencies),
        isReady: isFullyReady || hasDeclaredLimitations,
        isFullyReady,
        isBlocked: existingRecord.readiness_outcome === READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE,
        hasDeclaredLimitations,
      };
    }

    // Build raw Record 4
    const rawRecord = {
      readiness_id: readinessId,
      intake_id: intakeRecord.intake_id,
      evaluated_prerequisites: evaluatedPrerequisites,
      fixture_coverage_ratio: fixtureCoverageRatio,
      readiness_outcome: readinessOutcome,
      limitation_notes: limitationNotes,
      assessment_timestamp: assessmentTimestamp,
      assessor_id: assessorId,
    };

    // Strict schema parse and deep freeze
    const record: ValidationReadinessAssessmentRecord = deepFreeze(
      validationReadinessAssessmentRecordSchema.parse(rawRecord)
    );

    // -------------------------------------------------------------------------
    // Atomic Graph & Ledger Integration
    // -------------------------------------------------------------------------
    if (this.graph) {
      this.graph.registerNode({
        id: record.readiness_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord,
      });
    }

    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord,
        record.readiness_id,
        record,
        record.assessment_timestamp
      );
    }

    // Cache record in memory
    this.assessmentsById.set(record.readiness_id, record);
    const existingList = this.assessmentsByIntakeId.get(record.intake_id) ?? [];
    existingList.push(record);
    this.assessmentsByIntakeId.set(record.intake_id, existingList);

    const isFullyReady = record.readiness_outcome === READINESS_OUTCOMES.READY;
    const hasDeclaredLimitations =
      record.readiness_outcome === READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS;
    const isReady = isFullyReady || hasDeclaredLimitations;
    const isBlocked = record.readiness_outcome === READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE;

    return {
      record,
      gateAudits: deepFreeze(gatesAudit.results),
      deficiencies: deepFreeze(deficiencies),
      isReady,
      isFullyReady,
      isBlocked,
      hasDeclaredLimitations,
    };
  }

  /**
   * Assesses readiness and halts immediately by throwing ValidationReadinessBlockedError
   * if the outcome is BLOCKED_NOT_EVALUABLE.
   *
   * Fulfills Acceptance Criterion:
   * "BLOCKED_NOT_EVALUABLE outcome halts validation pipeline immediately before execution."
   */
  public assertReady(params: ReadinessAssessmentParams): ReadinessAssessmentResult {
    const result = this.assessReadiness(params);
    if (result.isBlocked) {
      const deficiencySummary = result.deficiencies
        .map((d) => `[${d.prerequisite}]: ${d.reason}`)
        .join("; ");
      throw new ValidationReadinessBlockedError(
        `Pre-Validation Readiness Assessment failed with BLOCKED_NOT_EVALUABLE: ${deficiencySummary}`,
        result.record,
        result.deficiencies
      );
    }
    return result;
  }

  /**
   * Retrieves a cached readiness assessment by readiness_id.
   */
  public getAssessment(readinessId: string): ValidationReadinessAssessmentRecord | undefined {
    const record = this.assessmentsById.get(readinessId);
    return record ? defensiveClone(record) : undefined;
  }

  /**
   * Retrieves the latest cached readiness assessment for an intake_id.
   */
  public getAssessmentByIntakeId(intakeId: string): ValidationReadinessAssessmentRecord | undefined {
    const list = this.assessmentsByIntakeId.get(intakeId);
    if (!list || list.length === 0) return undefined;
    return defensiveClone(list[list.length - 1]);
  }

  // =========================================================================
  // Private Subsystem Auditors
  // =========================================================================

  /**
   * Audit 1: Handoff Integrity
   */
  private auditHandoffIntegrity(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const { intakeRecord, handoffPackage } = params;

    // Check intake status
    if (intakeRecord.intake_status !== INTAKE_STATUSES.INTAKE_ACCEPTED) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `ValidationIntakeRecord is not accepted (status: ${intakeRecord.intake_status}, reason: ${intakeRecord.rejection_reason ?? "Intake rejected"}).`,
        },
      };
    }

    // Check package identifiers
    if (!intakeRecord.handoff_package_id || intakeRecord.handoff_package_id.trim() === "") {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "ValidationIntakeRecord is missing handoff_package_id reference.",
        },
      };
    }

    if (!intakeRecord.handoff_package_integrity_ref || intakeRecord.handoff_package_integrity_ref.trim() === "") {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "ValidationIntakeRecord is missing handoff_package_integrity_ref.",
        },
      };
    }

    // If actual handoff package was provided, cross-audit cryptographic reference
    if (handoffPackage) {
      if (handoffPackage.package_id !== intakeRecord.handoff_package_id) {
        return {
          status: PREREQUISITE_STATUSES.FAIL,
          deficiency: {
            prerequisite: MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY,
            status: PREREQUISITE_STATUSES.FAIL,
            reason: `Handoff package ID mismatch: package '${handoffPackage.package_id}' does not match intake '${intakeRecord.handoff_package_id}'.`,
          },
        };
      }

      if (handoffPackage.integrity_ref !== intakeRecord.handoff_package_integrity_ref) {
        return {
          status: PREREQUISITE_STATUSES.FAIL,
          deficiency: {
            prerequisite: MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY,
            status: PREREQUISITE_STATUSES.FAIL,
            reason: "Handoff package integrity reference does not match intake record envelope reference.",
          },
        };
      }
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }

  /**
   * Audit 2: All Seven Phase 1C.5g Gates Documented
   */
  private auditSevenPhase1C5gGates(params: ReadinessAssessmentParams): {
    overallStatus: PrerequisiteStatus;
    results: GateAuditResult[];
    deficiency?: PrerequisiteDeficiency;
  } {
    // Resolve gate tokens from explicit param or handoffPackage
    const rawGates = params.gateTokens ?? params.handoffPackage?.gates;
    const results: GateAuditResult[] = [];
    const missingOrFailedGates: string[] = [];

    // Normalize candidate tokens array
    let tokens: Array<Record<string, unknown>> = [];
    if (Array.isArray(rawGates)) {
      tokens = rawGates.filter((g) => g && typeof g === "object") as Array<Record<string, unknown>>;
    } else if (rawGates && typeof rawGates === "object") {
      tokens = Object.entries(rawGates).map(([k, v]) => {
        if (v && typeof v === "object") {
          return { gate_name: k, ...v };
        }
        return { gate_name: k, status: v };
      });
    }

    for (const requiredGate of PHASE_1C5G_GATE_NAMES) {
      const match = tokens.find((t) => {
        const name = typeof t.gate_name === "string" ? t.gate_name : "";
        return matchesGateName(name, requiredGate);
      });

      if (!match) {
        missingOrFailedGates.push(requiredGate);
        results.push({
          gateName: requiredGate,
          status: PREREQUISITE_STATUSES.FAIL,
          tokenPresent: false,
          deficiencyReason: `Missing Phase 1C.5g gate completion token for '${requiredGate}'.`,
        });
        continue;
      }

      const rawStatus = typeof match.status === "string" ? match.status.toUpperCase() : "";
      const isComplete = rawStatus === "COMPLETE" || rawStatus === "PASS";
      const hasValidTokenId = typeof match.token_id === "string" && match.token_id.trim().length > 0;
      const isValidSealedAt = typeof match.sealed_at === "string" &&
        match.sealed_at.trim().length > 0 &&
        !isNaN(Date.parse(match.sealed_at)) &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(match.sealed_at);

      if (!isComplete) {
        missingOrFailedGates.push(requiredGate);
        results.push({
          gateName: requiredGate,
          status: PREREQUISITE_STATUSES.FAIL,
          tokenPresent: true,
          tokenId: typeof match.token_id === "string" ? match.token_id : undefined,
          sealedAt: typeof match.sealed_at === "string" ? match.sealed_at : undefined,
          authorizedBy: typeof match.authorized_by === "string" ? match.authorized_by : undefined,
          deficiencyReason: `Gate completion token status is '${match.status}', expected 'COMPLETE' or 'PASS'.`,
        });
      } else if (!hasValidTokenId) {
        missingOrFailedGates.push(requiredGate);
        results.push({
          gateName: requiredGate,
          status: PREREQUISITE_STATUSES.FAIL,
          tokenPresent: true,
          tokenId: typeof match.token_id === "string" ? match.token_id : undefined,
          sealedAt: typeof match.sealed_at === "string" ? match.sealed_at : undefined,
          authorizedBy: typeof match.authorized_by === "string" ? match.authorized_by : undefined,
          deficiencyReason: `Gate completion token for '${requiredGate}' lacks required non-empty token_id.`,
        });
      } else if (!isValidSealedAt) {
        missingOrFailedGates.push(requiredGate);
        results.push({
          gateName: requiredGate,
          status: PREREQUISITE_STATUSES.FAIL,
          tokenPresent: true,
          tokenId: typeof match.token_id === "string" ? match.token_id : undefined,
          sealedAt: typeof match.sealed_at === "string" ? match.sealed_at : undefined,
          authorizedBy: typeof match.authorized_by === "string" ? match.authorized_by : undefined,
          deficiencyReason: `Gate completion token for '${requiredGate}' lacks valid ISO 8601 UTC sealed_at timestamp.`,
        });
      } else {
        results.push({
          gateName: requiredGate,
          status: PREREQUISITE_STATUSES.PASS,
          tokenPresent: true,
          tokenId: match.token_id as string,
          sealedAt: match.sealed_at as string,
          authorizedBy: typeof match.authorized_by === "string" ? match.authorized_by : undefined,
        });
      }
    }

    if (missingOrFailedGates.length > 0) {
      return {
        overallStatus: PREREQUISITE_STATUSES.FAIL,
        results,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Phase 1C.5g gates not fully documented or certified: ${missingOrFailedGates.join(", ")}.`,
          details: { missingOrFailedGates },
        },
      };
    }

    return {
      overallStatus: PREREQUISITE_STATUSES.PASS,
      results,
    };
  }

  /**
   * Audit 3: Golden Fixture Availability
   */
  private auditGoldenFixtureAvailability(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    coverageRatio: number;
    deficiency?: PrerequisiteDeficiency;
  } {
    const fixtureInput = params.fixtureAssessment;

    if (!fixtureInput) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: 0.0,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "Golden fixture assessment input omitted; fixture corpus unverified.",
        },
      };
    }

    const ratio = fixtureInput.coverageRatio;

    // Check bounds
    if (typeof ratio !== "number" || isNaN(ratio) || ratio < 0 || ratio > 1) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: 0.0,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Invalid fixture_coverage_ratio: ${ratio}. Must be between 0.0 and 1.0.`,
        },
      };
    }

    // Check payload cryptographic integrity
    if (fixtureInput.payloadIntegrityVerified === false) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: ratio,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "Golden fixture payload integrity verification failed (tampering or checksum mismatch detected).",
        },
      };
    }

    // Check contamination
    if (fixtureInput.contaminatedFixtures && fixtureInput.contaminatedFixtures.length > 0) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: ratio,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Contaminated golden fixtures detected in scope: ${fixtureInput.contaminatedFixtures.join(", ")}.`,
          details: { contaminatedFixtures: fixtureInput.contaminatedFixtures },
        },
      };
    }

    // Check accessibility
    if (fixtureInput.inaccessibleFixtures && fixtureInput.inaccessibleFixtures.length > 0) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: ratio,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Golden fixtures inaccessible: ${fixtureInput.inaccessibleFixtures.join(", ")}.`,
          details: { inaccessibleFixtures: fixtureInput.inaccessibleFixtures },
        },
      };
    }

    // Check zero coverage
    if (ratio === 0.0) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        coverageRatio: 0.0,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "Zero golden fixtures available for declared validation scope.",
        },
      };
    }

    // Partial coverage (0 < ratio < 1.0) or full coverage (ratio === 1.0)
    // Partial coverage evaluates to PASS prerequisite-wise when fixtures are valid and uncorrupted,
    // but drives the outcome to READY_WITH_DECLARED_LIMITATIONS.
    return {
      status: PREREQUISITE_STATUSES.PASS,
      coverageRatio: ratio,
    };
  }

  /**
   * Audit 4: Execution Environment Stability
   */
  private auditExecutionEnvironmentStability(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const { versionBindingRecord, environmentStatus } = params;

    if (!environmentStatus) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "Execution environment stability status not provided.",
        },
      };
    }

    if (!environmentStatus.isStable) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Execution environment marked unstable: ${environmentStatus.failureReason ?? "Host or harness instability detected"}.`,
        },
      };
    }

    // Target-Platform runtime version cross-check
    if (
      environmentStatus.targetPlatformRuntimeVersion &&
      environmentStatus.targetPlatformRuntimeVersion.trim() !==
        versionBindingRecord.target_platform_runtime_version.trim()
    ) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Target-platform runtime mismatch: harness reports '${environmentStatus.targetPlatformRuntimeVersion}', version binding requires '${versionBindingRecord.target_platform_runtime_version}'.`,
        },
      };
    }

    // Host environment version cross-check
    if (
      environmentStatus.hostEnvironmentVersion &&
      environmentStatus.hostEnvironmentVersion.trim() !==
        versionBindingRecord.host_environment_version.trim()
    ) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Host environment mismatch: harness reports '${environmentStatus.hostEnvironmentVersion}', version binding requires '${versionBindingRecord.host_environment_version}'.`,
        },
      };
    }

    // Runtime implementation version cross-check
    if (
      environmentStatus.runtimeImplementationVersion &&
      environmentStatus.runtimeImplementationVersion.trim() !==
        versionBindingRecord.runtime_implementation_version.trim()
    ) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Runtime implementation mismatch: harness reports '${environmentStatus.runtimeImplementationVersion}', version binding requires '${versionBindingRecord.runtime_implementation_version}'.`,
        },
      };
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }

  /**
   * Audit 5: Traceability Pipeline Active
   */
  private auditTraceabilityPipeline(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const trace = params.traceabilityPipelineStatus;

    if (!trace || !trace.isActive) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Phase 1C.5f RunTrace recorder is inactive or offline: ${trace?.failureReason ?? "Recorder connection refused"}.`,
        },
      };
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }

  /**
   * Audit 6: Comparability Verified
   */
  private auditComparability(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const comp = params.comparabilityStatus;

    if (!comp) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "Harness comparability status not documented.",
        },
      };
    }

    if (!comp.isCalibrated) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Harness calibration incomplete: ${comp.failureReason ?? "PATH-PROD and PATH-SHADOW harnesses not calibrated"}.`,
        },
      };
    }

    if (!comp.isComparable) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `Harness comparability failed: ${comp.failureReason ?? "Discrepancy detected between PATH-PROD and PATH-SHADOW harnesses"}.`,
        },
      };
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }

  /**
   * Audit 7: Rollback Staging Verified
   */
  private auditRollbackStaging(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const staging = params.rollbackStagingStatus;

    if (!staging) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: "PATH-ROLLBACK staging status not provided.",
        },
      };
    }

    if (!staging.isConfigured) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `PATH-ROLLBACK staging is not configured: ${staging.failureReason ?? "Missing staging cluster configuration"}.`,
        },
      };
    }

    if (!staging.isVerified) {
      return {
        status: PREREQUISITE_STATUSES.FAIL,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED,
          status: PREREQUISITE_STATUSES.FAIL,
          reason: `PATH-ROLLBACK live reversion testing is unverified: ${staging.failureReason ?? "Rollback dry-run failed"}.`,
        },
      };
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }

  /**
   * Audit 8: Absence of Unresolved Upstream Blockers
   *
   * Enforces Section 10.2:
   * "Absence of Unresolved Upstream Blockers: No active critical defects or quarantine flags apply to the scoped candidate units."
   *
   * 1. Fail Closed: Absence of blocker evidence is NOT evidence of absence. If upstreamBlockerStatus is omitted,
   *    evaluates to BLOCKED (BLOCKED_NOT_EVALUABLE).
   * 2. Scope-Aware: Evaluates blockers against params.scopeRecord (included_units vs excluded_units).
   *    - Applicable: Blocker affects an included scoped unit -> BLOCKED.
   *    - Excluded: Blocker affects only explicitly excluded units -> Does NOT block.
   *    - Unrelated: Blocker affects candidate units outside current scope -> Does NOT block.
   *    - Global: Explicit global blocker (isGlobal === true) applies across all scoped units -> BLOCKED.
   *    - Missing Applicability: Blocker item lacking unit metadata and not marked global fails closed -> BLOCKED.
   */
  private auditUpstreamBlockers(params: ReadinessAssessmentParams): {
    status: PrerequisiteStatus;
    deficiency?: PrerequisiteDeficiency;
  } {
    const blockerStatus = params.upstreamBlockerStatus;

    // Fail closed: absence of blocker evidence is NOT evidence of absence
    if (!blockerStatus) {
      return {
        status: PREREQUISITE_STATUSES.BLOCKED,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS,
          status: PREREQUISITE_STATUSES.BLOCKED,
          reason: "Upstream blocker readiness evidence omitted; absence of blockers cannot be verified (fail-closed).",
        },
      };
    }

    const scopeRecord = params.scopeRecord;
    const includedUnits = new Set<string>(scopeRecord?.included_units ?? []);
    const excludedUnits = new Set<string>(scopeRecord?.excluded_units ?? []);

    const applicableBlockers: Array<{ id: string; reason: string }> = [];

    // Helper to evaluate a structured or string blocker
    const evaluateBlockerItem = (
      item: string | UpstreamBlockerItem,
      category: string
    ) => {
      if (typeof item === "string") {
        const id = item.trim();
        if (!id) return;
        // String blocker without unit metadata lacks applicability evidence -> fail closed
        applicableBlockers.push({
          id,
          reason: `${category} '${id}' lacks affected-unit applicability evidence; failing closed.`,
        });
        return;
      }

      if (!item || item.isActive === false) {
        return;
      }

      const id = item.blockerId || "unknown_blocker";

      // Global blocker explicitly applies across all units
      if (item.isGlobal === true) {
        applicableBlockers.push({
          id,
          reason: `Global ${category} '${id}' applies across all scoped units: ${item.description ?? ""}`.trim(),
        });
        return;
      }

      const affected = item.affectedUnits ?? [];
      if (affected.length === 0) {
        // Missing applicability evidence fails closed
        applicableBlockers.push({
          id,
          reason: `${category} '${id}' does not declare affected units and is not marked global; failing closed.`,
        });
        return;
      }

      // Check intersection with scopeRecord
      // 1. Any affected unit in includedUnits -> APPLICABLE
      const matchedIncluded = affected.filter((u) => includedUnits.has(u));
      if (matchedIncluded.length > 0) {
        applicableBlockers.push({
          id,
          reason: `${category} '${id}' applies to included scoped unit(s): ${matchedIncluded.join(", ")}.`,
        });
        return;
      }

      // 2. All affected units in excludedUnits -> EXPLICITLY EXCLUDED (does not block)
      const allExcluded = affected.every((u) => excludedUnits.has(u));
      if (allExcluded) {
        return; // Non-blocking
      }

      // 3. Unrelated units (neither included nor excluded) -> does not block
    };

    // Evaluate structured blockers array
    if (blockerStatus.blockers) {
      for (const b of blockerStatus.blockers) {
        evaluateBlockerItem(b, "Blocker");
      }
    }

    // Evaluate active critical defects
    if (blockerStatus.activeCriticalDefects) {
      for (const d of blockerStatus.activeCriticalDefects) {
        evaluateBlockerItem(d, "Critical defect");
      }
    }

    // Evaluate quarantine flags
    if (blockerStatus.quarantineFlags) {
      for (const q of blockerStatus.quarantineFlags) {
        evaluateBlockerItem(q, "Quarantine flag");
      }
    }

    // Evaluate blocked candidate units
    if (blockerStatus.blockedCandidateUnits) {
      for (const unitId of blockerStatus.blockedCandidateUnits) {
        if (includedUnits.has(unitId)) {
          applicableBlockers.push({
            id: unitId,
            reason: `Scoped candidate unit '${unitId}' is explicitly declared blocked.`,
          });
        }
      }
    }

    if (applicableBlockers.length > 0) {
      const summary = applicableBlockers.map((b) => b.reason).join("; ");
      return {
        status: PREREQUISITE_STATUSES.BLOCKED,
        deficiency: {
          prerequisite: MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS,
          status: PREREQUISITE_STATUSES.BLOCKED,
          reason: `Active upstream blockers apply to current validation scope: ${summary}`,
          details: { applicableBlockers },
        },
      };
    }

    return { status: PREREQUISITE_STATUSES.PASS };
  }
}
