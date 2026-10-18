// src/sound-engineer/validation/uncertainty/uncertaintyManager.ts
// Phase 1C.5h WP-18: Explicit Uncertainty Modeling & Production Risk Accounting Engine (Record 16).
// Bound to frozen specification v0.1j Section 22.3, Table 15, Axiom 4, and Implementation Plan v0.1h WP-18.
// Cardinal Principle: UNCERTAINTY MUST SURVIVE THE DECISION.

import { deepFreeze } from "../../contracts/immutability";
import {
  CONFLICT_RESOLUTION_STATUSES,
  FAILURE_ATTRIBUTION_CLASSES,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
} from "../schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import {
  validationOutcomeRecordSchema,
  validationUncertaintyRecordSchema,
  ValidationOutcomeRecord,
  ValidationUncertaintyRecord,
  EvidenceConflictRecord,
  ValidationFailureRecord,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  IncompatibleUncertaintyContextError,
  InvalidUncertaintyLinkingError,
  InvalidUncertaintyRecordError,
} from "./uncertaintyErrors";
import {
  CalibrationAmbiguityInput,
  ConflictingEvidenceInput,
  GovernedRiskEvaluationResult,
  InsufficientSampleSizeInput,
  MissingEvidenceInput,
  RecordUncertaintyInput,
  TargetPlatformVersionInstabilityInput,
  UncertaintyRecordResult,
  UnknownFailureCauseInput,
  UntestedEdgeDomainInput,
} from "./uncertaintyTypes";
import { RiskProfileResolver } from "./riskProfileResolver";
import { UncertaintyContextValidator } from "./uncertaintyContextValidator";

/**
 * ValidationUncertaintyManager
 * Governed manager that explicitly captures what remains unknown after validation activity.
 * Preserves uncertainty rather than forcing binary certainty (Axiom 4).
 */
export class ValidationUncertaintyManager {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly profileResolver: RiskProfileResolver;
  private readonly recordsById: Map<string, ValidationUncertaintyRecord> = new Map();
  private readonly recordsByPackage: Map<string, ValidationUncertaintyRecord[]> = new Map();

  constructor(options?: {
    graph?: ValidationRelationshipGraph;
    ledger?: ValidationAuditLedger;
    profileResolver?: RiskProfileResolver;
  }) {
    this.graph = options?.graph;
    this.ledger = options?.ledger;
    this.profileResolver = options?.profileResolver ?? new RiskProfileResolver();
  }

  /**
   * Primary entry point: Records an explicit ValidationUncertaintyRecord (Record 16).
   */
  public recordUncertainty(input: RecordUncertaintyInput): UncertaintyRecordResult {
    // 1. Context Coherence and Scope Containment validation
    UncertaintyContextValidator.validate(input);

    // 2. Resolve governed risk profile (strictly fails closed if missing or unknown)
    const profile = this.profileResolver.resolveProfile(input.riskProfileRef);

    // 3. Evaluate production risk through governed profile
    const evaluation = profile.evaluateRisk({
      uncertaintySource: input.uncertaintySource,
      affectedScope: input.affectedScope,
      packageId: input.packageId,
      severity: input.severity,
      details: input.details,
      residualUncertaintyScore: input.residualUncertaintyScore,
      conflictRecord: input.conflictRecord,
      failureRecord: input.failureRecord,
      sampleSizeActual: input.sampleSizeActual,
      sampleSizeRequired: input.sampleSizeRequired,
      untestedDomainElements: input.untestedDomainElements,
    });

    // 4. Resolve exact Record 16 field values
    const potentialProductionRisk = input.customPotentialRisk ?? evaluation.potentialProductionRisk;
    const gate8Impact = input.customGate8Impact ?? evaluation.gate8Impact;
    const requiredMonitoring = input.customRequiredMonitoring ?? evaluation.requiredMonitoringIfAuthorized;

    // 5. Rule: gate_8_impact ALLOWS_CONDITIONAL requires non-empty declarative monitoring
    if (gate8Impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
      if (!requiredMonitoring || requiredMonitoring.length === 0) {
        throw new InvalidUncertaintyRecordError(
          "gate_8_impact ALLOWS_CONDITIONAL requires non-empty declarative required_monitoring_if_authorized."
        );
      }
    }

    // 6. Generate canonical uncertainty ID if not provided
    const uncertaintyId =
      input.uncertaintyId ??
      `unc-${input.packageId}-${input.uncertaintySource.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 7. Construct exact Record 16 schema object (NO persisted risk_score or invented fields)
    const rawRecord: ValidationUncertaintyRecord = {
      uncertainty_id: uncertaintyId,
      package_id: input.packageId,
      uncertainty_source: input.uncertaintySource,
      affected_scope: [...input.affectedScope],
      potential_production_risk: potentialProductionRisk,
      gate_8_impact: gate8Impact,
      required_monitoring_if_authorized: [...requiredMonitoring],
    };

    // 8. Strict schema parse & validate
    const parsedRecord = validationUncertaintyRecordSchema.parse(rawRecord);

    // 9. Immutable deep freeze
    const frozenRecord = deepFreeze(parsedRecord);

    // 10. Register in relationship graph if available
    if (this.graph) {
      this.graph.registerNode({
        id: frozenRecord.uncertainty_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
      });
    }

    // 11. Append-only ledger persistence if available
    if (this.ledger) {
      this.ledger.appendRecord(
        "ValidationUncertaintyRecord",
        frozenRecord.uncertainty_id,
        frozenRecord
      );
    }

    // 12. Internal storage
    this.recordsById.set(frozenRecord.uncertainty_id, frozenRecord);
    const existingPkg = this.recordsByPackage.get(frozenRecord.package_id) ?? [];
    existingPkg.push(frozenRecord);
    this.recordsByPackage.set(frozenRecord.package_id, existingPkg);

    return deepFreeze({
      uncertaintyRecord: frozenRecord,
      evaluation,
      isForcesBlock: frozenRecord.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      isAllowsConditional: frozenRecord.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
      isAcceptableLowRisk: frozenRecord.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
    });
  }

  /**
   * Source 1: MISSING_EVIDENCE
   * Records uncertainty where required governed evidence does not exist or cannot be established.
   */
  public recordMissingEvidence(input: MissingEvidenceInput): UncertaintyRecordResult {
    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
      affectedScope: input.affectedScope,
      riskProfileRef: input.riskProfileRef,
      details: input.missingEvidenceDescription,
      severity: input.severity ?? "CRITICAL",
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 2: CONFLICTING_EVIDENCE
   * Records uncertainty when unresolved WP-17 conflict leaves material doubt.
   * Prohibits converting resolved conflicts with zero residual uncertainty.
   */
  public recordConflictingEvidence(input: ConflictingEvidenceInput): UncertaintyRecordResult {
    // Check if conflict is fully resolved with zero residual doubt
    const isResolved =
      input.conflictRecord.resolution_status !== CONFLICT_RESOLUTION_STATUSES.UNRESOLVED;
    const residual = input.conflictRecord.residual_uncertainty_score;
    const isResidualZero =
      residual === 0 ||
      residual === "0" ||
      residual === "NONE" ||
      residual === "ZERO" ||
      residual === "NONE_RESOLVED";

    if (isResolved && isResidualZero) {
      throw new IncompatibleUncertaintyContextError(
        `EvidenceConflictRecord "${input.conflictRecord.conflict_id}" is resolved (${input.conflictRecord.resolution_status}) with no material residual uncertainty. Resolved conflicts do not generate Record 16.`
      );
    }

    const affectedScope =
      input.affectedScope ??
      (input.scopeRecord ? input.scopeRecord.included_units : ["guitar:amplifier:core_tone_stack"]);

    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE,
      affectedScope,
      riskProfileRef: input.riskProfileRef,
      conflictRecord: input.conflictRecord,
      residualUncertaintyScore: input.conflictRecord.residual_uncertainty_score,
      details: input.details ?? input.conflictRecord.conflict_description,
      severity: input.severity ?? "HIGH",
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 3: INSUFFICIENT_SAMPLE_SIZE
   * Records uncertainty where sample quantity/coverage is insufficient for governed claim.
   */
  public recordInsufficientSampleSize(input: InsufficientSampleSizeInput): UncertaintyRecordResult {
    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE,
      affectedScope: input.affectedScope,
      riskProfileRef: input.riskProfileRef,
      sampleSizeActual: input.sampleSizeActual,
      sampleSizeRequired: input.sampleSizeRequired,
      details: input.details,
      severity: input.severity,
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 4: UNTESTED_EDGE_DOMAIN
   * Records uncertainty for declared-scope edge domains not adequately exercised.
   */
  public recordUntestedEdgeDomain(input: UntestedEdgeDomainInput): UncertaintyRecordResult {
    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
      affectedScope: input.affectedScope,
      riskProfileRef: input.riskProfileRef,
      untestedDomainElements: input.untestedDomainElements,
      details: input.details,
      severity: input.severity,
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 5: CALIBRATION_AMBIGUITY
   * Records uncertainty where fixture/environment calibration prevents confident interpretation.
   */
  public recordCalibrationAmbiguity(input: CalibrationAmbiguityInput): UncertaintyRecordResult {
    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.CALIBRATION_AMBIGUITY,
      affectedScope: input.affectedScope,
      riskProfileRef: input.riskProfileRef,
      details: input.calibrationDivergenceDescription,
      severity: input.severity,
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 6: UNKNOWN_FAILURE_CAUSE
   * Derives from a governed WP-16 failure with attribution_class === UNKNOWN.
   * Prohibits converting without explicit residual-risk evidence.
   */
  public recordUnknownFailureCause(input: UnknownFailureCauseInput): UncertaintyRecordResult {
    if (!input.residualRiskEvidence || input.residualRiskEvidence.trim() === "") {
      throw new IncompatibleUncertaintyContextError(
        "WP-16 UNKNOWN failure requires explicit residual-risk evidence to generate uncertainty. Automatic conversion prohibited."
      );
    }

    if (input.failureRecord.attribution_class !== FAILURE_ATTRIBUTION_CLASSES.UNKNOWN) {
      throw new IncompatibleUncertaintyContextError(
        `Cannot record UNKNOWN_FAILURE_CAUSE for failure with attribution_class "${input.failureRecord.attribution_class}". Expected "UNKNOWN".`
      );
    }

    const affectedScope =
      input.affectedScope ??
      (input.scopeRecord ? input.scopeRecord.included_units : ["guitar:component:unknown_failure_domain"]);

    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE,
      affectedScope,
      riskProfileRef: input.riskProfileRef,
      failureRecord: input.failureRecord,
      details: `${input.failureRecord.failure_title}: ${input.failureRecord.failure_symptom}; Residual risk evidence: ${input.residualRiskEvidence}`,
      severity: input.severity ?? "HIGH",
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Source 7: TARGET_PLATFORM_VERSION_INSTABILITY
   * Records uncertainty where target platform version instability or compatibility uncertainty prevents evidence reliability.
   */
  public recordTargetPlatformVersionInstability(
    input: TargetPlatformVersionInstabilityInput
  ): UncertaintyRecordResult {
    return this.recordUncertainty({
      uncertaintyId: input.uncertaintyId,
      packageId: input.packageId,
      packageRecord: input.packageRecord,
      scopeRecord: input.scopeRecord,
      uncertaintySource: UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY,
      affectedScope: input.affectedScope,
      riskProfileRef: input.riskProfileRef,
      details: `${input.targetPlatformName} v${input.targetVersion}: ${input.instabilityDescription}`,
      severity: input.severity ?? "HIGH",
      customPotentialRisk: input.customPotentialRisk,
      customGate8Impact: input.customGate8Impact,
      customRequiredMonitoring: input.customRequiredMonitoring,
    });
  }

  /**
   * Canonical UNCERTAIN_OF Graph Edge Linking Operation:
   * ValidationOutcomeRecord -> ValidationUncertaintyRecord
   *
   * CRITICAL SEQUENCING BOUNDARY:
   * WP-18 DOES NOT synthesize or fabricate ValidationOutcomeRecord (owned by WP-19).
   * This method links an externally provided, schema-valid ValidationOutcomeRecord
   * to a ValidationUncertaintyRecord.
   */
  public linkUncertaintyToOutcome(
    outcomeRecord: ValidationOutcomeRecord,
    uncertaintyRecord: ValidationUncertaintyRecord
  ): RelationshipEdge {
    if (!this.graph) {
      throw new InvalidUncertaintyLinkingError(
        "ValidationRelationshipGraph must be provided to establish UNCERTAIN_OF edge."
      );
    }

    // 1. Schema parse & validation for both endpoints
    try {
      validationOutcomeRecordSchema.parse(outcomeRecord);
    } catch (err: unknown) {
      throw new InvalidUncertaintyLinkingError(
        `Source record must be a schema-valid ValidationOutcomeRecord: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      validationUncertaintyRecordSchema.parse(uncertaintyRecord);
    } catch (err: unknown) {
      throw new InvalidUncertaintyLinkingError(
        `Target record must be a schema-valid ValidationUncertaintyRecord: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. Context coherence: Outcome and Uncertainty must belong to the same package
    if (outcomeRecord.package_id !== uncertaintyRecord.package_id) {
      throw new IncompatibleUncertaintyContextError(
        `Cannot link UNCERTAIN_OF across different packages: outcome package "${outcomeRecord.package_id}" vs uncertainty package "${uncertaintyRecord.package_id}".`
      );
    }

    // 3. Register nodes in graph
    this.graph.registerNode({
      id: outcomeRecord.outcome_id,
      kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    });

    this.graph.registerNode({
      id: uncertaintyRecord.uncertainty_id,
      kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
    });

    // 4. Add canonical directed UNCERTAIN_OF edge: ValidationOutcomeRecord -> ValidationUncertaintyRecord
    const edge = this.graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
      source: {
        id: outcomeRecord.outcome_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
      },
      target: {
        id: uncertaintyRecord.uncertainty_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
      },
    });

    // 5. Append edge to audit ledger if available
    if (this.ledger) {
      this.ledger.appendEdge(edge);
    }

    return edge;
  }

  /**
   * Retrieves all uncertainties recorded for a package.
   */
  public getUncertaintiesForPackage(packageId: string): ReadonlyArray<ValidationUncertaintyRecord> {
    return deepFreeze([...(this.recordsByPackage.get(packageId) ?? [])]);
  }

  /**
   * Retrieves a specific uncertainty record by ID.
   */
  public getUncertaintyById(uncertaintyId: string): ValidationUncertaintyRecord | undefined {
    return this.recordsById.get(uncertaintyId);
  }

  /**
   * Retrieves all recorded uncertainty records.
   */
  public getAllUncertainties(): ReadonlyArray<ValidationUncertaintyRecord> {
    return deepFreeze([...this.recordsById.values()]);
  }
}
