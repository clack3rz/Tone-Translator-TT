// src/sound-engineer/validation/graph/edgeTypes.ts
// Authoritative definitions and endpoint validation contracts for the fourteen governed Phase 1C.5h relationship edges.
// Bound to frozen specification v0.1j Section 34 and Implementation Plan v0.1h WP-02.

import { z } from "zod";

/**
 * The exact fourteen governed relationship edges defined in frozen Section 34.
 * CRITICAL GOVERNANCE: Exactly 14 edge types. Zero invented edges permitted.
 */
export const GOVERNED_EDGE_TYPES = {
  /** 1. ValidationCase -> MigrationCandidate | ReasoningComponent */
  VALIDATES: "VALIDATES",
  /** 2. ValidationExecutionRecord -> ValidationFixtureRecord */
  TESTED_WITH: "TESTED_WITH",
  /** 3. ValidationCase | ValidationPackage -> ValidationVersionBindingRecord */
  BOUND_TO: "BOUND_TO",
  /** 4. ValidationCase | ValidationOutcomeRecord -> ObjectiveEvidenceRecord | PerceptualEvaluationRecord */
  EVIDENCED_BY: "EVIDENCED_BY",
  /** 5. RegressionAssessmentRecord -> LegacyOutput | GoldenReference */
  COMPARED_AGAINST: "COMPARED_AGAINST",
  /** 6. PerceptualEvaluationRecord | UATEvaluationRecord -> EvaluatorPersona */
  EVALUATED_BY: "EVALUATED_BY",
  /** 7. ObjectiveEvidenceRecord <-> PerceptualEvaluationRecord (Symmetric) */
  CONFLICTS_WITH: "CONFLICTS_WITH",
  /** 8. ValidationOutcomeRecord -> ValidationUncertaintyRecord */
  UNCERTAIN_OF: "UNCERTAIN_OF",
  /** 9. ValidationExecutionRecord -> ValidationExecutionRecord */
  SUPERSEDES_VALIDATION: "SUPERSEDES_VALIDATION",
  /** 10. ValidationOutcomeRecord | AdoptionDecisionRecord -> RevalidationTriggerRecord */
  INVALIDATED_BY: "INVALIDATED_BY",
  /** 11. RevalidationTriggerRecord -> RetestPlanRecord */
  REQUIRES_RETEST: "REQUIRES_RETEST",
  /** 12. AdoptionDecisionRecord -> ValidationScopeRecord */
  AUTHORIZES_SCOPE: "AUTHORIZES_SCOPE",
  /** 13. ValidationFailureRecord -> GovernanceEntity */
  REMANDS_TO: "REMANDS_TO",
  /** 14. ValidationIntakeRecord -> MigrationHandoffPackageRecord */
  DERIVED_FROM_HANDOFF: "DERIVED_FROM_HANDOFF",
} as const;

export type GovernedEdgeType =
  (typeof GOVERNED_EDGE_TYPES)[keyof typeof GOVERNED_EDGE_TYPES];

export const governedEdgeTypeSchema = z.enum([
  GOVERNED_EDGE_TYPES.VALIDATES,
  GOVERNED_EDGE_TYPES.TESTED_WITH,
  GOVERNED_EDGE_TYPES.BOUND_TO,
  GOVERNED_EDGE_TYPES.EVIDENCED_BY,
  GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
  GOVERNED_EDGE_TYPES.EVALUATED_BY,
  GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
  GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
  GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
  GOVERNED_EDGE_TYPES.INVALIDATED_BY,
  GOVERNED_EDGE_TYPES.REQUIRES_RETEST,
  GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
  GOVERNED_EDGE_TYPES.REMANDS_TO,
  GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
]);

/**
 * All governed entity kinds eligible to participate in Phase 1C.5h relationship edges.
 * Includes all twenty-two governed records plus recognized upstream and reference entities.
 */
export const GOVERNED_ENTITY_KINDS = {
  // Governed Phase 1C.5h Records (01 to 22)
  ValidationIntakeRecord: "ValidationIntakeRecord",
  ValidationScopeRecord: "ValidationScopeRecord",
  ValidationVersionBindingRecord: "ValidationVersionBindingRecord",
  ValidationReadinessAssessmentRecord: "ValidationReadinessAssessmentRecord",
  ValidationCase: "ValidationCase",
  ValidationPackage: "ValidationPackage",
  TestProfileRecord: "TestProfileRecord",
  ValidationFixtureRecord: "ValidationFixtureRecord",
  ValidationExecutionRecord: "ValidationExecutionRecord",
  ObjectiveEvidenceRecord: "ObjectiveEvidenceRecord",
  PerceptualEvaluationRecord: "PerceptualEvaluationRecord",
  UATEvaluationRecord: "UATEvaluationRecord",
  RegressionAssessmentRecord: "RegressionAssessmentRecord",
  ValidationFailureRecord: "ValidationFailureRecord",
  EvidenceConflictRecord: "EvidenceConflictRecord",
  ValidationUncertaintyRecord: "ValidationUncertaintyRecord",
  ValidationOutcomeRecord: "ValidationOutcomeRecord",
  RevalidationTriggerRecord: "RevalidationTriggerRecord",
  RetestPlanRecord: "RetestPlanRecord",
  ProductionReadinessAssessmentRecord: "ProductionReadinessAssessmentRecord",
  AdoptionDecisionRecord: "AdoptionDecisionRecord",
  Gate8ChangeRecord: "Gate8ChangeRecord",

  // Governed Reference and Upstream Entities
  MigrationCandidate: "MigrationCandidate",
  ReasoningComponent: "ReasoningComponent",
  LegacyOutput: "LegacyOutput",
  GoldenReference: "GoldenReference",
  EvaluatorPersona: "EvaluatorPersona",
  GovernanceEntity: "GovernanceEntity",
  MigrationHandoffPackageRecord: "MigrationHandoffPackageRecord",
} as const;

export type GovernedEntityKind =
  (typeof GOVERNED_ENTITY_KINDS)[keyof typeof GOVERNED_ENTITY_KINDS];

export const governedEntityKindSchema = z.enum([
  GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
  GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
  GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
  GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord,
  GOVERNED_ENTITY_KINDS.ValidationCase,
  GOVERNED_ENTITY_KINDS.ValidationPackage,
  GOVERNED_ENTITY_KINDS.TestProfileRecord,
  GOVERNED_ENTITY_KINDS.ValidationFixtureRecord,
  GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
  GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
  GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
  GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
  GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord,
  GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
  GOVERNED_ENTITY_KINDS.EvidenceConflictRecord,
  GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
  GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
  GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
  GOVERNED_ENTITY_KINDS.RetestPlanRecord,
  GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
  GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
  GOVERNED_ENTITY_KINDS.Gate8ChangeRecord,
  GOVERNED_ENTITY_KINDS.MigrationCandidate,
  GOVERNED_ENTITY_KINDS.ReasoningComponent,
  GOVERNED_ENTITY_KINDS.LegacyOutput,
  GOVERNED_ENTITY_KINDS.GoldenReference,
  GOVERNED_ENTITY_KINDS.EvaluatorPersona,
  GOVERNED_ENTITY_KINDS.GovernanceEntity,
  GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
]);

/**
 * Typed descriptor for an endpoint in the relationship graph.
 */
export const graphEdgeEndpointSchema = z
  .object({
    id: z.string().min(1, "Endpoint ID must not be empty"),
    kind: governedEntityKindSchema,
  })
  .strict();

export type GraphEdgeEndpoint = Readonly<z.infer<typeof graphEdgeEndpointSchema>>;

/**
 * Definition and endpoint validation metadata for a governed edge.
 */
export interface GovernedEdgeDefinition {
  readonly edgeType: GovernedEdgeType;
  readonly allowedSourceKinds: ReadonlyArray<GovernedEntityKind>;
  readonly allowedTargetKinds: ReadonlyArray<GovernedEntityKind>;
  readonly isSymmetric: boolean;
  readonly participatesInDagCycleDetection: boolean;
}

/**
 * The authoritative registry defining exact endpoint semantics for each of the 14 governed edges.
 */
export const GOVERNED_EDGE_DEFINITIONS: Readonly<Record<GovernedEdgeType, GovernedEdgeDefinition>> = {
  VALIDATES: {
    edgeType: GOVERNED_EDGE_TYPES.VALIDATES,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationCase],
    allowedTargetKinds: [
      GOVERNED_ENTITY_KINDS.MigrationCandidate,
      GOVERNED_ENTITY_KINDS.ReasoningComponent,
    ],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  TESTED_WITH: {
    edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationExecutionRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.ValidationFixtureRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  BOUND_TO: {
    edgeType: GOVERNED_EDGE_TYPES.BOUND_TO,
    allowedSourceKinds: [
      GOVERNED_ENTITY_KINDS.ValidationCase,
      GOVERNED_ENTITY_KINDS.ValidationPackage,
    ],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  EVIDENCED_BY: {
    edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
    allowedSourceKinds: [
      GOVERNED_ENTITY_KINDS.ValidationCase,
      GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    ],
    allowedTargetKinds: [
      GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
      GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    ],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  COMPARED_AGAINST: {
    edgeType: GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord],
    allowedTargetKinds: [
      GOVERNED_ENTITY_KINDS.LegacyOutput,
      GOVERNED_ENTITY_KINDS.GoldenReference,
    ],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  EVALUATED_BY: {
    edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
    allowedSourceKinds: [
      GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
      GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
    ],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.EvaluatorPersona],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  CONFLICTS_WITH: {
    edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
    allowedSourceKinds: [
      GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
      GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    ],
    allowedTargetKinds: [
      GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
      GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    ],
    isSymmetric: true,
    participatesInDagCycleDetection: false,
  },
  UNCERTAIN_OF: {
    edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  SUPERSEDES_VALIDATION: {
    edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationExecutionRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.ValidationExecutionRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  INVALIDATED_BY: {
    edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
    allowedSourceKinds: [
      GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
      GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
    ],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  REQUIRES_RETEST: {
    edgeType: GOVERNED_EDGE_TYPES.REQUIRES_RETEST,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.RetestPlanRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  AUTHORIZES_SCOPE: {
    edgeType: GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.ValidationScopeRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  REMANDS_TO: {
    edgeType: GOVERNED_EDGE_TYPES.REMANDS_TO,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationFailureRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.GovernanceEntity],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
  DERIVED_FROM_HANDOFF: {
    edgeType: GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
    allowedSourceKinds: [GOVERNED_ENTITY_KINDS.ValidationIntakeRecord],
    allowedTargetKinds: [GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord],
    isSymmetric: false,
    participatesInDagCycleDetection: true,
  },
};

/**
 * An immutable persisted relationship edge in the ValidationRelationshipGraph.
 */
export interface RelationshipEdge {
  readonly edgeId: string;
  readonly edgeType: GovernedEdgeType;
  readonly source: GraphEdgeEndpoint;
  readonly target: GraphEdgeEndpoint;
  readonly isSymmetric: boolean;
  readonly createdAt: string;
}

export class InvalidEdgeTypeError extends Error {
  constructor(public readonly attemptedType: string) {
    super(`Invalid governed edge type: "${attemptedType}". Phase 1C.5h governs exactly 14 frozen relationship edges.`);
    this.name = "InvalidEdgeTypeError";
  }
}

export class InvalidEndpointError extends Error {
  constructor(
    public readonly edgeType: GovernedEdgeType,
    public readonly message: string
  ) {
    super(`Endpoint validation failure for edge "${edgeType}": ${message}`);
    this.name = "InvalidEndpointError";
  }
}

export class CycleDetectedError extends Error {
  constructor(public readonly cycleDetails: string) {
    super(`DAG cycle detected: ${cycleDetails}`);
    this.name = "CycleDetectedError";
  }
}

export class OrphanEndpointError extends Error {
  constructor(public readonly endpointId: string, public readonly kind: string) {
    super(`Orphan endpoint rejected: entity "${endpointId}" (${kind}) is not registered in graph.`);
    this.name = "OrphanEndpointError";
  }
}

/**
 * Derives the deterministic canonical edge ID.
 * For symmetric CONFLICTS_WITH: uses (min(id_a, id_b), max(id_a, id_b)).
 * For directional edges: uses (source.id, target.id).
 */
export function createCanonicalEdgeId(
  edgeType: GovernedEdgeType,
  sourceId: string,
  targetId: string
): string {
  if (edgeType === GOVERNED_EDGE_TYPES.CONFLICTS_WITH) {
    const minId = sourceId < targetId ? sourceId : targetId;
    const maxId = sourceId < targetId ? targetId : sourceId;
    return `edge_conflicts_${minId}__${maxId}`;
  }
  return `edge_${edgeType}_${sourceId}__${targetId}`;
}

/**
 * Validates edge endpoints against the frozen governing matrix.
 * Enforces strict directional source/target constraints and special symmetric rules.
 */
export function validateEdgeEndpoints(
  edgeType: string,
  source: GraphEdgeEndpoint,
  target: GraphEdgeEndpoint
): { canonicalSource: GraphEdgeEndpoint; canonicalTarget: GraphEdgeEndpoint } {
  // 1. Edge type validation
  const parsedTypeResult = governedEdgeTypeSchema.safeParse(edgeType);
  if (!parsedTypeResult.success) {
    throw new InvalidEdgeTypeError(edgeType);
  }
  const canonicalEdgeType = parsedTypeResult.data;
  const def = GOVERNED_EDGE_DEFINITIONS[canonicalEdgeType];

  // 2. Endpoint kind validation
  if (!def.allowedSourceKinds.includes(source.kind) && !def.isSymmetric) {
    throw new InvalidEndpointError(
      canonicalEdgeType,
      `Source entity kind "${source.kind}" is not permitted. Allowed source kinds: [${def.allowedSourceKinds.join(", ")}]`
    );
  }

  if (!def.allowedTargetKinds.includes(target.kind) && !def.isSymmetric) {
    throw new InvalidEndpointError(
      canonicalEdgeType,
      `Target entity kind "${target.kind}" is not permitted. Allowed target kinds: [${def.allowedTargetKinds.join(", ")}]`
    );
  }

  // 3. Special symmetric rules for CONFLICTS_WITH
  if (canonicalEdgeType === GOVERNED_EDGE_TYPES.CONFLICTS_WITH) {
    const isPairValid =
      (source.kind === GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord &&
        target.kind === GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord) ||
      (source.kind === GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord &&
        target.kind === GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord);

    if (!isPairValid) {
      throw new InvalidEndpointError(
        canonicalEdgeType,
        `CONFLICTS_WITH requires exactly one ObjectiveEvidenceRecord and one PerceptualEvaluationRecord. Received source: "${source.kind}", target: "${target.kind}".`
      );
    }

    // Canonicalize endpoint ordering by ID so (A, B) and (B, A) store the exact same canonical endpoints
    const isSourceFirst = source.id < target.id;
    return {
      canonicalSource: isSourceFirst ? source : target,
      canonicalTarget: isSourceFirst ? target : source,
    };
  }

  // 4. Directional validation: verify directional constraints
  if (!def.allowedSourceKinds.includes(source.kind)) {
    throw new InvalidEndpointError(
      canonicalEdgeType,
      `Source entity kind "${source.kind}" is not permitted. Allowed source kinds: [${def.allowedSourceKinds.join(", ")}]`
    );
  }

  if (!def.allowedTargetKinds.includes(target.kind)) {
    throw new InvalidEndpointError(
      canonicalEdgeType,
      `Target entity kind "${target.kind}" is not permitted. Allowed target kinds: [${def.allowedTargetKinds.join(", ")}]`
    );
  }

  return { canonicalSource: source, canonicalTarget: target };
}
