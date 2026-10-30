// src/sound-engineer/validation/conflicts/conflictDetector.ts
// Phase 1C.5h WP-17: Evidence Conflict Preservation & Resolution Accounting Engine (Record 15).
// Bound to frozen specification v0.1j Section 22, Table 15, Axiom 4, and Implementation Plan v0.1h WP-17.

import { deepFreeze } from "../../contracts/immutability";
import {
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  TOLERANCE_EVALUATIONS,
  PerceptualConfidenceLevel,
} from "../schemas/enums";
import {
  parseEvidenceConflictRecord,
  parseObjectiveEvidenceRecord,
  parsePerceptualEvaluationRecord,
  parseValidationExecutionRecord,
  parseValidationPackage,
  parseValidationScopeRecord,
  parseValidationVersionBindingRecord,
  EvidenceConflictRecord,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  GraphEdgeEndpoint,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  DisagreementEvidenceInput,
  EvidenceConflictDetectionResult,
  EvidenceConflictDetectorInput,
} from "./conflictTypes";
import {
  ConflictDetectionProfileResolver,
} from "./conflictDetectionProfileResolver";
import {
  IncompatibleEvidenceContextError,
  InvalidEvidenceError,
  ScalarSmoothingForbiddenError,
} from "./conflictErrors";

export interface EvidenceConflictDetectorDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly profileResolver?: ConflictDetectionProfileResolver;
}

/**
 * Generates an authoritative conflict ID with standard prefix.
 */
function generateConflictId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  return `CONFLICT_${uuid}`;
}

/**
 * Maps perceptual confidence level to numeric score for threshold comparison.
 */
function confidenceRank(level?: PerceptualConfidenceLevel): number {
  switch (level) {
    case PERCEPTUAL_CONFIDENCE_LEVELS.HIGH:
      return 3;
    case PERCEPTUAL_CONFIDENCE_LEVELS.MEDIUM:
      return 2;
    case PERCEPTUAL_CONFIDENCE_LEVELS.LOW:
      return 1;
    default:
      return 0;
  }
}

/**
 * Evidence Conflict Preservation & Resolution Accounting Engine (Record 15).
 * Implements Activity WF-13 (Evidence Reconciliation & Uncertainty Logging).
 *
 * Enforces:
 * 1. Strict preservation of contradictory evidence without scalar smoothing or artificial consensus (Axiom 4).
 * 2. Governing profile-driven conflict detection thresholds (prohibiting universal hardcoded percentages).
 * 3. Persistence of a SINGLE canonical symmetric CONFLICTS_WITH relationship edge between
 *    ObjectiveEvidenceRecord and PerceptualEvaluationRecord with canonical endpoint ordering (min_id, max_id).
 * 4. Bidirectional conflict query resolution so both competing evidence endpoints symmetrically discover opposing evidence.
 * 5. Append-only tamper-evident audit ledger registration.
 */
export class EvidenceConflictDetector {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly profileResolver: ConflictDetectionProfileResolver;

  constructor(dependencies: EvidenceConflictDetectorDependencies = {}) {
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.profileResolver = dependencies.profileResolver ?? new ConflictDetectionProfileResolver();
  }

  public getProfileResolver(): ConflictDetectionProfileResolver {
    return this.profileResolver;
  }

  /**
   * Detects conflict between objective measurement evidence and human perceptual evaluation.
   * Emits an immutable EvidenceConflictRecord (Record 15) and single canonical symmetric CONFLICTS_WITH edge when conflict exists.
   */
  public detectConflict(input: EvidenceConflictDetectorInput): EvidenceConflictDetectionResult {
    // 1. Validate inputs
    this.validateDetectorInput(input);

    const {
      packageRecord,
      objectiveEvidence,
      perceptualEvidence,
      conflictDetectionProfileRef,
      customConflictId,
      customConflictType,
      customResolutionStrategy,
      customResolutionStatus,
      customUnderlyingAcousticPhenomenon,
      customDescription,
      customResidualUncertainty,
    } = input;

    // 2. Resolve governed conflict profile (fail-closed)
    const profile = this.profileResolver.resolveProfile(conflictDetectionProfileRef);

    // 3. Evaluate whether objective evidence passed or failed
    const isObjectivePass =
      objectiveEvidence.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.PASS &&
      objectiveEvidence.tolerance_evaluation !== TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE;
    const isObjectiveFail =
      objectiveEvidence.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL ||
      objectiveEvidence.tolerance_evaluation === TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE;

    // 4. Evaluate whether perceptual evaluation passed or failed
    const isPerceptualPass =
      perceptualEvidence.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS;
    const isPerceptualFail =
      perceptualEvidence.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL;

    // 5. Check confidence thresholding if configured in profile
    const minConfidence = profile.triggers.minPerceptualConfidenceForConflict;
    const confidenceSatisfied =
      !minConfidence || confidenceRank(perceptualEvidence.confidence) >= confidenceRank(minConfidence);

    // 6. Detect conflict types
    // Type A: Objective passes, Perceptual fails (Metrics PASS / Ears FAIL - Table 15 Row 1)
    const typeAConflict =
      profile.triggers.detectObjectivePassPerceptualFail &&
      isObjectivePass &&
      isPerceptualFail &&
      confidenceSatisfied;

    // Type B: Perceptual passes, Objective fails (Ears PASS / Metrics FAIL - Table 15 Row 2)
    const typeBConflict =
      profile.triggers.detectPerceptualPassObjectiveFail &&
      isPerceptualPass &&
      isObjectiveFail &&
      confidenceSatisfied;

    const hasConflict = typeAConflict || typeBConflict || Boolean(customConflictType);

    if (!hasConflict) {
      return deepFreeze({
        hasConflict: false,
      });
    }

    // 7. Formulate conflict properties
    const conflictId = customConflictId ?? generateConflictId();
    const conflictType = customConflictType ?? CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL;

    let defaultDesc: string;
    if (typeAConflict) {
      defaultDesc =
        `Objective metric passed (${objectiveEvidence.metric_category}, delta: ${objectiveEvidence.measured_delta}), ` +
        `but human listening panel failed (${perceptualEvidence.evaluator_role}: ${perceptualEvidence.evaluation_outcome}).`;
    } else if (typeBConflict) {
      defaultDesc =
        `Human listening panel passed (${perceptualEvidence.evaluator_role}), ` +
        `but objective metric failed technical tolerance limits (${objectiveEvidence.metric_category}: delta ${objectiveEvidence.measured_delta}).`;
    } else {
      defaultDesc =
        `Cross-methodology evidence discrepancy detected between objective evidence "${objectiveEvidence.objective_evidence_id}" ` +
        `and perceptual evaluation "${perceptualEvidence.perceptual_evidence_id}".`;
    }

    const conflictDescription = customDescription ?? defaultDesc;

    const underlyingAcousticPhenomenon =
      customUnderlyingAcousticPhenomenon ??
      profile.defaultUnderlyingAcousticPhenomenon ??
      (typeAConflict
        ? "Psychoacoustic divergence: mathematical transfer function tolerances met while human auditory timbre perception detected unacceptable artifacts."
        : "Harmonic/non-linear coloration deemed musically pleasant and responsive by listener but flagged as distortion anomaly by linear metric bounds.");

    const resolutionStrategy =
      customResolutionStrategy ??
      profile.defaultResolutionStrategy ??
      CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION;

    const resolutionStatus =
      customResolutionStatus ??
      profile.defaultResolutionStatus ??
      CONFLICT_RESOLUTION_STATUSES.UNRESOLVED;

    const residualUncertainty =
      customResidualUncertainty ??
      (profile.calculateResidualUncertainty
        ? profile.calculateResidualUncertainty(objectiveEvidence, perceptualEvidence)
        : 0.75);

    // 8. Construct and validate EvidenceConflictRecord (Record 15)
    const rawRecord: EvidenceConflictRecord = {
      conflict_id: conflictId,
      package_id: packageRecord.package_id,
      conflict_type: conflictType,
      competing_evidence_refs: [
        objectiveEvidence.objective_evidence_id,
        perceptualEvidence.perceptual_evidence_id,
      ],
      conflict_description: conflictDescription,
      underlying_acoustic_phenomenon: underlyingAcousticPhenomenon,
      resolution_strategy: resolutionStrategy,
      resolution_status: resolutionStatus,
      residual_uncertainty_score: residualUncertainty,
    };

    const conflictRecord = parseEvidenceConflictRecord(rawRecord);

    // 9. Persist single canonical symmetric CONFLICTS_WITH edge in graph
    const objectiveEndpoint: GraphEdgeEndpoint = {
      id: objectiveEvidence.objective_evidence_id,
      kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
    };
    const perceptualEndpoint: GraphEdgeEndpoint = {
      id: perceptualEvidence.perceptual_evidence_id,
      kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    };

    let relationshipEdge: RelationshipEdge | undefined;

    if (this.graph) {
      // Orphan protection: ensure both endpoints are registered
      this.graph.registerNode(objectiveEndpoint);
      this.graph.registerNode(perceptualEndpoint);

      // Add symmetric edge (graph canonicalizes order to (min_id, max_id) and indexes both directions)
      relationshipEdge = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
        source: objectiveEndpoint,
        target: perceptualEndpoint,
      });
    }

    // 10. Ledger persistence
    if (this.ledger) {
      this.ledger.appendRecord("EvidenceConflictRecord", conflictRecord.conflict_id, conflictRecord);
      if (relationshipEdge) {
        this.ledger.appendEdge(relationshipEdge);
      }
    }

    return deepFreeze({
      hasConflict: true,
      conflictType,
      record: conflictRecord,
      edge: relationshipEdge,
      objectiveEndpoint,
      perceptualEndpoint,
      resolutionStrategy,
      resolutionStatus,
    });
  }

  /**
   * Documents an intra-modality evidence disagreement (e.g., Type C: Reviewer Disagreement,
   * or Type D: Metric-vs-Metric Discrepancy) within Record 15 without violating the 14-edge graph catalog.
   */
  public recordDisagreement(input: DisagreementEvidenceInput): EvidenceConflictDetectionResult {
    if (!input.packageRecord || !input.packageRecord.package_id) {
      throw new IncompatibleEvidenceContextError("packageRecord.package_id is required");
    }
    parseValidationPackage(input.packageRecord);

    if (!input.competingEvidenceRefs || input.competingEvidenceRefs.length < 2) {
      throw new InvalidEvidenceError("competingEvidenceRefs must contain at least 2 evidence references");
    }
    for (const ref of input.competingEvidenceRefs) {
      if (!ref || ref.trim().length === 0) {
        throw new InvalidEvidenceError("competingEvidenceRefs must not contain empty or whitespace-only reference strings");
      }
    }
    if (!input.conflictDescription || input.conflictDescription.trim().length === 0) {
      throw new InvalidEvidenceError("conflictDescription must not be empty");
    }

    const profile = this.profileResolver.resolveProfile(input.conflictDetectionProfileRef);

    const conflictId = input.customConflictId ?? generateConflictId();
    const resolutionStrategy =
      input.customResolutionStrategy ??
      profile.defaultResolutionStrategy ??
      CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION;
    const resolutionStatus =
      profile.defaultResolutionStatus ?? CONFLICT_RESOLUTION_STATUSES.UNRESOLVED;
    const residualUncertainty = input.customResidualUncertainty ?? 0.8;

    const rawRecord: EvidenceConflictRecord = {
      conflict_id: conflictId,
      package_id: input.packageRecord.package_id,
      conflict_type: input.conflictType,
      competing_evidence_refs: [...input.competingEvidenceRefs],
      conflict_description: input.conflictDescription,
      underlying_acoustic_phenomenon:
        input.underlyingAcousticPhenomenon ??
        profile.defaultUnderlyingAcousticPhenomenon ??
        "Intra-modality divergence observed across competing evidence evaluation streams.",
      resolution_strategy: resolutionStrategy,
      resolution_status: resolutionStatus,
      residual_uncertainty_score: residualUncertainty,
    };

    const conflictRecord = parseEvidenceConflictRecord(rawRecord);

    if (this.ledger) {
      this.ledger.appendRecord("EvidenceConflictRecord", conflictRecord.conflict_id, conflictRecord);
    }

    return deepFreeze({
      hasConflict: true,
      conflictType: conflictRecord.conflict_type,
      record: conflictRecord,
      resolutionStrategy,
      resolutionStatus,
    });
  }

  /**
   * Prohibits artificial mathematical consensus, smoothing, or averaging of conflicting scores.
   * Throws ScalarSmoothingForbiddenError under Axiom 4.
   */
  public assertNoScalarSmoothing(objectiveScore: number, perceptualScore: number): never {
    throw new ScalarSmoothingForbiddenError(
      `Attempted to perform scalar smoothing or averaging of conflicting scores (${objectiveScore} vs ${perceptualScore}). ` +
      `Axiom 4 and Section 22 strictly forbid artificial consensus or mathematical smoothing of contradictory evidence.`
    );
  }

  /**
   * Validates detector inputs for schema compliance and execution consistency.
   */
  private validateDetectorInput(input: EvidenceConflictDetectorInput): void {
    if (!input.packageRecord || !input.packageRecord.package_id) {
      throw new IncompatibleEvidenceContextError("packageRecord with valid package_id is required");
    }
    parseValidationPackage(input.packageRecord);

    if (!input.objectiveEvidence) {
      throw new InvalidEvidenceError("objectiveEvidence is required");
    }
    if (!input.perceptualEvidence) {
      throw new InvalidEvidenceError("perceptualEvidence is required");
    }

    // Verify schemas
    parseObjectiveEvidenceRecord(input.objectiveEvidence);
    parsePerceptualEvaluationRecord(input.perceptualEvidence);

    // Incompatible executions check
    if (input.objectiveEvidence.execution_id !== input.perceptualEvidence.execution_id) {
      throw new IncompatibleEvidenceContextError(
        `Incompatible execution context: objective evidence references execution_id "${input.objectiveEvidence.execution_id}", ` +
        `whereas perceptual evaluation references execution_id "${input.perceptualEvidence.execution_id}". ` +
        `Cross-methodology conflict detection requires evidence originating from the same execution context.`
      );
    }

    if (input.scopeRecord) {
      parseValidationScopeRecord(input.scopeRecord);
      if (input.scopeRecord.scope_id !== input.packageRecord.scope_record_ref) {
        throw new IncompatibleEvidenceContextError(
          `Scope mismatch: scopeRecord.scope_id "${input.scopeRecord.scope_id}" does not match packageRecord.scope_record_ref "${input.packageRecord.scope_record_ref}".`
        );
      }
    }

    if (input.versionBindingRecord) {
      parseValidationVersionBindingRecord(input.versionBindingRecord);
      if (input.versionBindingRecord.binding_id !== input.packageRecord.version_binding_ref) {
        throw new IncompatibleEvidenceContextError(
          `Version binding mismatch: versionBindingRecord.binding_id "${input.versionBindingRecord.binding_id}" does not match packageRecord.version_binding_ref "${input.packageRecord.version_binding_ref}".`
        );
      }
    }

    if (input.executionRecord) {
      parseValidationExecutionRecord(input.executionRecord);
      if (input.executionRecord.execution_id !== input.objectiveEvidence.execution_id) {
        throw new IncompatibleEvidenceContextError(
          `Execution mismatch: executionRecord.execution_id "${input.executionRecord.execution_id}" does not match evidence execution_id "${input.objectiveEvidence.execution_id}".`
        );
      }
      if (input.versionBindingRecord && input.executionRecord.binding_id !== input.versionBindingRecord.binding_id) {
        throw new IncompatibleEvidenceContextError(
          `Version binding mismatch: executionRecord.binding_id "${input.executionRecord.binding_id}" does not match versionBindingRecord.binding_id "${input.versionBindingRecord.binding_id}".`
        );
      }
      if (
        input.packageRecord.validation_case_refs.length > 0 &&
        !input.packageRecord.validation_case_refs.includes(input.executionRecord.case_id)
      ) {
        throw new IncompatibleEvidenceContextError(
          `Case mismatch: executionRecord.case_id "${input.executionRecord.case_id}" is not in packageRecord.validation_case_refs [${input.packageRecord.validation_case_refs.join(", ")}].`
        );
      }
    }
  }
}
