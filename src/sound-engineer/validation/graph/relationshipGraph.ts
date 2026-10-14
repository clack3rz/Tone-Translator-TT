// src/sound-engineer/validation/graph/relationshipGraph.ts
// ValidationRelationshipGraph: Authoritative DAG lineage, single canonical symmetric conflict persistence,
// orphan protection, and governance query implementation for Phase 1C.5h WP-02.

import { deepFreeze } from "../../contracts/immutability";
import {
  CycleDetectedError,
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  GovernedEdgeType,
  GraphEdgeEndpoint,
  OrphanEndpointError,
  RelationshipEdge,
  createCanonicalEdgeId,
  validateEdgeEndpoints,
} from "./edgeTypes";

export interface CreateEdgeInput {
  readonly edgeType: GovernedEdgeType | string;
  readonly source: GraphEdgeEndpoint;
  readonly target: GraphEdgeEndpoint;
}

export interface ProvenanceLineageResult {
  readonly rootEntityId: string;
  readonly traversedNodeIds: ReadonlyArray<string>;
  readonly traversedEdges: ReadonlyArray<RelationshipEdge>;
  readonly intakeRecordId?: string;
  readonly migrationHandoffPackageId?: string;
  readonly versionBindingIds: ReadonlyArray<string>;
}

export interface ImpactedScopeResult {
  readonly triggerId: string;
  readonly invalidatedOutcomeIds: ReadonlyArray<string>;
  readonly invalidatedDecisionIds: ReadonlyArray<string>;
  readonly retestPlanIds: ReadonlyArray<string>;
  readonly traversedEdges: ReadonlyArray<RelationshipEdge>;
}

export interface EvidenceConflictPair {
  readonly objectiveEvidenceId: string;
  readonly perceptualEvidenceId: string;
  readonly conflictEdgeId: string;
}

export interface EvidenceForCaseResult {
  readonly caseId: string;
  readonly objectiveEvidenceIds: ReadonlyArray<string>;
  readonly perceptualEvidenceIds: ReadonlyArray<string>;
  readonly evidenceEdges: ReadonlyArray<RelationshipEdge>;
  readonly conflictEdges: ReadonlyArray<RelationshipEdge>;
  readonly conflictingPairs: ReadonlyArray<EvidenceConflictPair>;
}

/**
 * Authoritative Validation Relationship Graph for Phase 1C.5h.
 * Manages the exact 14 governed relationship edges with strict DAG enforcement and
 * single canonical symmetric conflict edge persistence.
 */
export class ValidationRelationshipGraph {
  /** Registered node descriptors indexed by entity ID */
  private readonly nodes: Map<string, GraphEdgeEndpoint> = new Map();

  /** Canonical edges indexed by edgeId */
  private readonly edges: Map<string, RelationshipEdge> = new Map();

  /** Adjacency index for outgoing directional edges: sourceId -> array of edgeIds */
  private readonly outgoingDirectionalEdges: Map<string, string[]> = new Map();

  /** Adjacency index for incoming directional edges: targetId -> array of edgeIds */
  private readonly incomingDirectionalEdges: Map<string, string[]> = new Map();

  /** Adjacency index for symmetric CONFLICTS_WITH edges: endpointId -> array of edgeIds */
  private readonly conflictEdgesByEndpoint: Map<string, string[]> = new Map();

  /**
   * Registers a node/endpoint in the graph to satisfy orphan protection.
   */
  public registerNode(endpoint: GraphEdgeEndpoint): void {
    if (!endpoint || !endpoint.id) {
      throw new Error("Invalid endpoint: id must be a non-empty string");
    }
    this.nodes.set(endpoint.id, deepFreeze({ id: endpoint.id, kind: endpoint.kind }));
  }

  /**
   * Registers multiple nodes in batch.
   */
  public registerNodes(endpoints: ReadonlyArray<GraphEdgeEndpoint>): void {
    for (const ep of endpoints) {
      this.registerNode(ep);
    }
  }

  public hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  public getNode(id: string): GraphEdgeEndpoint | undefined {
    return this.nodes.get(id);
  }

  public getNodes(): ReadonlyArray<GraphEdgeEndpoint> {
    return Array.from(this.nodes.values());
  }

  public hasEdge(edgeId: string): boolean {
    return this.edges.has(edgeId);
  }

  public getEdge(edgeId: string): RelationshipEdge | undefined {
    return this.edges.get(edgeId);
  }

  public getEdges(): ReadonlyArray<RelationshipEdge> {
    return Array.from(this.edges.values());
  }

  /**
   * Adds a governed relationship edge with full endpoint validation, orphan protection,
   * single canonical symmetric persistence, and DAG cycle prevention.
   */
  public addEdge(input: CreateEdgeInput): RelationshipEdge {
    const { source, target, edgeType } = input;

    // 1. Orphan protection: verify both endpoints are registered nodes in the graph
    if (!this.nodes.has(source.id)) {
      throw new OrphanEndpointError(source.id, source.kind);
    }
    if (!this.nodes.has(target.id)) {
      throw new OrphanEndpointError(target.id, target.kind);
    }

    // Verify registered kind matches provided kind to prevent identity spoofing
    const registeredSource = this.nodes.get(source.id)!;
    if (registeredSource.kind !== source.kind) {
      throw new Error(
        `Source node kind mismatch for "${source.id}": registered as "${registeredSource.kind}", provided as "${source.kind}".`
      );
    }
    const registeredTarget = this.nodes.get(target.id)!;
    if (registeredTarget.kind !== target.kind) {
      throw new Error(
        `Target node kind mismatch for "${target.id}": registered as "${registeredTarget.kind}", provided as "${target.kind}".`
      );
    }

    // 2. Validate endpoint semantics and extract canonical endpoint order
    const { canonicalSource, canonicalTarget } = validateEdgeEndpoints(edgeType, source, target);
    const def = GOVERNED_EDGE_DEFINITIONS[edgeType as GovernedEdgeType];

    // 3. Compute deterministic canonical edge ID
    const edgeId = createCanonicalEdgeId(def.edgeType, canonicalSource.id, canonicalTarget.id);

    // 4. Duplicate handling (Idempotent reuse)
    // If exact canonical edge already exists, return the existing edge without inflating counts
    const existing = this.edges.get(edgeId);
    if (existing) {
      return existing;
    }

    // 5. Directional DAG Cycle Detection
    // Applies strictly to directional lineage edges; symmetric CONFLICTS_WITH is excluded
    if (def.participatesInDagCycleDetection) {
      this.assertNoCycle(canonicalSource.id, canonicalTarget.id);
    }

    // 6. Construct and persist immutable canonical relationship edge
    const newEdge: RelationshipEdge = deepFreeze({
      edgeId,
      edgeType: def.edgeType,
      source: canonicalSource,
      target: canonicalTarget,
      isSymmetric: def.isSymmetric,
      createdAt: new Date().toISOString(),
    });

    this.edges.set(edgeId, newEdge);

    // 7. Index edge in adjacency maps
    if (def.isSymmetric) {
      this.indexConflictEdge(canonicalSource.id, edgeId);
      this.indexConflictEdge(canonicalTarget.id, edgeId);
    } else {
      this.indexDirectionalEdge(canonicalSource.id, canonicalTarget.id, edgeId);
    }

    return newEdge;
  }

  /**
   * Helper indexing directional edges for traversal and cycle detection.
   */
  private indexDirectionalEdge(sourceId: string, targetId: string, edgeId: string): void {
    if (!this.outgoingDirectionalEdges.has(sourceId)) {
      this.outgoingDirectionalEdges.set(sourceId, []);
    }
    this.outgoingDirectionalEdges.get(sourceId)!.push(edgeId);

    if (!this.incomingDirectionalEdges.has(targetId)) {
      this.incomingDirectionalEdges.set(targetId, []);
    }
    this.incomingDirectionalEdges.get(targetId)!.push(edgeId);
  }

  /**
   * Helper indexing symmetric conflict edges for bidirectional lookup.
   */
  private indexConflictEdge(endpointId: string, edgeId: string): void {
    if (!this.conflictEdgesByEndpoint.has(endpointId)) {
      this.conflictEdgesByEndpoint.set(endpointId, []);
    }
    this.conflictEdgesByEndpoint.get(endpointId)!.push(edgeId);
  }

  /**
   * Enforces directional acyclicity using Breadth-First Search (BFS).
   * Verifies that adding sourceId -> targetId will not create a cycle.
   */
  private assertNoCycle(sourceId: string, targetId: string): void {
    if (sourceId === targetId) {
      throw new CycleDetectedError(`Direct self-cycle detected for node "${sourceId}".`);
    }

    // Check if there is an existing path from targetId to sourceId
    const visited = new Set<string>();
    const queue: string[] = [targetId];
    visited.add(targetId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === sourceId) {
        throw new CycleDetectedError(
          `Cycle detected: adding edge "${sourceId}" -> "${targetId}" introduces a directed cycle in lineage graph.`
        );
      }

      const outgoing = this.outgoingDirectionalEdges.get(current) ?? [];
      for (const edgeId of outgoing) {
        const edge = this.edges.get(edgeId);
        if (edge && !edge.isSymmetric) {
          const nextNodeId = edge.target.id;
          if (!visited.has(nextNodeId)) {
            visited.add(nextNodeId);
            queue.push(nextNodeId);
          }
        }
      }
    }
  }

  /**
   * Query 1: getConflicts(recordId)
   * Resolves the opposing conflicting evidence records for the given record ID bidirectionally.
   * Querying either member of a stored conflict pair returns the opposing record descriptor.
   */
  public getConflicts(recordId: string): ReadonlyArray<GraphEdgeEndpoint> {
    const edgeIds = this.conflictEdgesByEndpoint.get(recordId) ?? [];
    const opposingEndpoints: GraphEdgeEndpoint[] = [];

    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.isSymmetric) {
        if (edge.source.id === recordId) {
          opposingEndpoints.push(edge.target);
        } else if (edge.target.id === recordId) {
          opposingEndpoints.push(edge.source);
        }
      }
    }

    // Return deterministic sorted results by entity ID
    return opposingEndpoints.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Query 2: getProvenanceLineage(recordId)
   * Traces backwards through governed relationships toward relevant intake, handoff, and version-binding.
   */
  public getProvenanceLineage(recordId: string): ProvenanceLineageResult {
    const visitedNodes = new Set<string>();
    const traversedEdges: RelationshipEdge[] = [];
    const versionBindingIds = new Set<string>();
    let intakeRecordId: string | undefined;
    let migrationHandoffPackageId: string | undefined;

    const queue: string[] = [recordId];
    visitedNodes.add(recordId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = this.nodes.get(currentId);

      // Check outgoing edges from current node
      const outgoingEdgeIds = this.outgoingDirectionalEdges.get(currentId) ?? [];
      for (const edgeId of outgoingEdgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        if (edge.edgeType === GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF) {
          intakeRecordId = edge.source.id;
          migrationHandoffPackageId = edge.target.id;
          traversedEdges.push(edge);
          if (!visitedNodes.has(edge.target.id)) {
            visitedNodes.add(edge.target.id);
            queue.push(edge.target.id);
          }
        } else if (edge.edgeType === GOVERNED_EDGE_TYPES.BOUND_TO) {
          versionBindingIds.add(edge.target.id);
          traversedEdges.push(edge);
          if (!visitedNodes.has(edge.target.id)) {
            visitedNodes.add(edge.target.id);
          }
        } else if (
          edge.edgeType === GOVERNED_EDGE_TYPES.VALIDATES ||
          edge.edgeType === GOVERNED_EDGE_TYPES.TESTED_WITH ||
          edge.edgeType === GOVERNED_EDGE_TYPES.COMPARED_AGAINST ||
          edge.edgeType === GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION
        ) {
          traversedEdges.push(edge);
          if (!visitedNodes.has(edge.target.id)) {
            visitedNodes.add(edge.target.id);
            queue.push(edge.target.id);
          }
        }
      }

      // Check incoming directional edges to current node (tracing backward from evidence/retests/executions)
      const incomingEdgeIds = this.incomingDirectionalEdges.get(currentId) ?? [];
      for (const edgeId of incomingEdgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        // Trace backward from evidence to case or outcome
        if (edge.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY) {
          traversedEdges.push(edge);
          if (!visitedNodes.has(edge.source.id)) {
            visitedNodes.add(edge.source.id);
            queue.push(edge.source.id);
          }
        } else if (edge.edgeType === GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION) {
          traversedEdges.push(edge);
          if (!visitedNodes.has(edge.source.id)) {
            visitedNodes.add(edge.source.id);
            queue.push(edge.source.id);
          }
        }
      }
    }

    return {
      rootEntityId: recordId,
      traversedNodeIds: Array.from(visitedNodes).sort(),
      traversedEdges: traversedEdges.sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
      intakeRecordId,
      migrationHandoffPackageId,
      versionBindingIds: Array.from(versionBindingIds).sort(),
    };
  }

  /**
   * Query 3: getImpactedScope(triggerId)
   * Traces governed invalidation and retest impact forward via INVALIDATED_BY and REQUIRES_RETEST.
   */
  public getImpactedScope(triggerId: string): ImpactedScopeResult {
    const invalidatedOutcomeIds: string[] = [];
    const invalidatedDecisionIds: string[] = [];
    const retestPlanIds: string[] = [];
    const traversedEdges: RelationshipEdge[] = [];

    // 1. Incoming INVALIDATED_BY edges pointing to this trigger
    const incomingEdgeIds = this.incomingDirectionalEdges.get(triggerId) ?? [];
    for (const edgeId of incomingEdgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY) {
        traversedEdges.push(edge);
        if (edge.source.kind === GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord) {
          invalidatedOutcomeIds.push(edge.source.id);
        } else if (edge.source.kind === GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord) {
          invalidatedDecisionIds.push(edge.source.id);
        }
      }
    }

    // 2. Outgoing REQUIRES_RETEST edges directed from this trigger
    const outgoingEdgeIds = this.outgoingDirectionalEdges.get(triggerId) ?? [];
    for (const edgeId of outgoingEdgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.edgeType === GOVERNED_EDGE_TYPES.REQUIRES_RETEST) {
        traversedEdges.push(edge);
        if (edge.target.kind === GOVERNED_ENTITY_KINDS.RetestPlanRecord) {
          retestPlanIds.push(edge.target.id);
        }
      }
    }

    return {
      triggerId,
      invalidatedOutcomeIds: invalidatedOutcomeIds.sort(),
      invalidatedDecisionIds: invalidatedDecisionIds.sort(),
      retestPlanIds: retestPlanIds.sort(),
      traversedEdges: traversedEdges.sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
    };
  }

  /**
   * Query 4: getEvidenceForCase(caseId)
   * Collects all objective, perceptual, and conflict records reachable from the specified ValidationCase.
   */
  public getEvidenceForCase(caseId: string): EvidenceForCaseResult {
    const objectiveEvidenceIds: string[] = [];
    const perceptualEvidenceIds: string[] = [];
    const evidenceEdges: RelationshipEdge[] = [];
    const conflictEdgeMap: Map<string, RelationshipEdge> = new Map();
    const conflictingPairs: EvidenceConflictPair[] = [];

    // Outgoing EVIDENCED_BY edges from case
    const outgoingEdgeIds = this.outgoingDirectionalEdges.get(caseId) ?? [];
    for (const edgeId of outgoingEdgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.edgeType === GOVERNED_EDGE_TYPES.EVIDENCED_BY) {
        evidenceEdges.push(edge);
        if (edge.target.kind === GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord) {
          objectiveEvidenceIds.push(edge.target.id);
        } else if (edge.target.kind === GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord) {
          perceptualEvidenceIds.push(edge.target.id);
        }
      }
    }

    // Check for CONFLICTS_WITH edges involving any of the collected evidence records
    const allEvidenceIds = [...objectiveEvidenceIds, ...perceptualEvidenceIds];
    for (const evidenceId of allEvidenceIds) {
      const conflictEdgeIds = this.conflictEdgesByEndpoint.get(evidenceId) ?? [];
      for (const cEdgeId of conflictEdgeIds) {
        const cEdge = this.edges.get(cEdgeId);
        if (cEdge && cEdge.isSymmetric && !conflictEdgeMap.has(cEdge.edgeId)) {
          conflictEdgeMap.set(cEdge.edgeId, cEdge);

          // Determine which is objective and which is perceptual
          const objId =
            cEdge.source.kind === GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord
              ? cEdge.source.id
              : cEdge.target.id;
          const percId =
            cEdge.source.kind === GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord
              ? cEdge.source.id
              : cEdge.target.id;

          conflictingPairs.push({
            objectiveEvidenceId: objId,
            perceptualEvidenceId: percId,
            conflictEdgeId: cEdge.edgeId,
          });
        }
      }
    }

    return {
      caseId,
      objectiveEvidenceIds: objectiveEvidenceIds.sort(),
      perceptualEvidenceIds: perceptualEvidenceIds.sort(),
      evidenceEdges: evidenceEdges.sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
      conflictEdges: Array.from(conflictEdgeMap.values()).sort((a, b) =>
        a.edgeId.localeCompare(b.edgeId)
      ),
      conflictingPairs: conflictingPairs.sort((a, b) =>
        a.conflictEdgeId.localeCompare(b.conflictEdgeId)
      ),
    };
  }

  /**
   * Query 5: isApplicableForCurrentBinding(outcomeRecord)
   * Determines whether a historical ValidationOutcomeRecord remains currently applicable
   * or has been rendered stale by an incoming INVALIDATED_BY edge.
   * CRITICAL GOVERNANCE: Historical record payload is never mutated. No INVALIDATED outcome_class is created.
   */
  public isApplicableForCurrentBinding(
    outcomeRecord: { readonly outcome_id: string } | string
  ): boolean {
    const outcomeId =
      typeof outcomeRecord === "string" ? outcomeRecord : outcomeRecord.outcome_id;

    if (!outcomeId) {
      return false;
    }

    // Check if any INVALIDATED_BY edge originates from this outcome record
    const outgoingEdgeIds = this.outgoingDirectionalEdges.get(outcomeId) ?? [];
    for (const edgeId of outgoingEdgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY) {
        // Stale due to invalidation trigger
        return false;
      }
    }

    return true;
  }
}
