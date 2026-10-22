// src/sound-engineer/validation/remand/defectRemandRouter.ts
// Phase 1C.5h WP-25: Defect Remand Packaging & Multi-Destination Routing Subsystem.
// Bound to frozen specification v0.1j Section 29, Table 17, and Implementation Plan v0.1h WP-25.

import { deepFreeze } from "../../contracts/immutability";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
  ObjectiveEvidenceRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import {
  canonicalizeJson,
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  RemandDestinationInfo,
  TABLE_17_REMAND_ROUTING,
} from "../attribution/attributionTypes";
import {
  DefectRemandPackage,
  RemandHandoffTracking,
} from "./remandTypes";
import { NowFn, RemandAgingTracker } from "./remandAgingTracker";

/**
 * Thrown when supplied validation records fail lineage consistency checks.
 */
export class RemandLineageMismatchError extends Error {
  constructor(message: string) {
    super(`[REMAND LINEAGE MISMATCH] ${message}`);
    this.name = "RemandLineageMismatchError";
  }
}

/**
 * Thrown when evidence required to assemble a reproducible defect package is missing or incomplete.
 */
export class IncompleteReproductionEvidenceError extends Error {
  constructor(message: string) {
    super(`[INCOMPLETE REPRODUCTION EVIDENCE] ${message}`);
    this.name = "IncompleteReproductionEvidenceError";
  }
}

/**
 * Thrown when a failure record contains an unresolvable or unsupported failure attribution class.
 */
export class UnsupportedFailureAttributionError extends Error {
  constructor(message: string) {
    super(`[UNSUPPORTED FAILURE ATTRIBUTION] ${message}`);
    this.name = "UnsupportedFailureAttributionError";
  }
}

/**
 * Strongly typed input contract for routing a defect.
 */
export interface RouteDefectInput {
  /** The governed Record 14 documenting the failure and root attribution */
  readonly failureRecord: ValidationFailureRecord;
  /** The governed Record 09 documenting the failed execution harness run */
  readonly executionRecord: ValidationExecutionRecord;
  /** The governed Record 03 locking dependency and engine version matrix */
  readonly versionBinding: ValidationVersionBindingRecord;
  /** The governed Record 05 describing the reproducible test case */
  readonly validationCase: ValidationCase;
  /** The governed Record 08 describing the golden acoustic fixture or preset */
  readonly fixtureRecord: ValidationFixtureRecord;
  /** Optional explicit execution trace reference; defaults to executionRecord.trace_ref */
  readonly executionTraceRef?: string;
  /** Optional linked objective measurements (Record 10) */
  readonly objectiveEvidenceRecord?: ObjectiveEvidenceRecord;
  /** Optional deterministic packageId override */
  readonly customPackageId?: string;
  /** Optional deterministic remandId override */
  readonly customRemandId?: string;
}

/**
 * Result returned upon successful packaging and routing of a defect remand.
 */
export interface RouteDefectResult {
  /** The assembled and sealed composite DefectRemandPackage */
  readonly package: DefectRemandPackage;
  /** The canonical REMANDS_TO edge created in the relationship graph (if graph provided) */
  readonly edge?: RelationshipEdge;
  /** The factual tracking metadata registered in the aging tracker */
  readonly tracking: RemandHandoffTracking;
}

/**
 * Dependencies injected into the DefectRemandRouter.
 */
export interface DefectRemandRouterDependencies {
  /** Authoritative validation relationship graph for REMANDS_TO edge insertion */
  readonly graph?: ValidationRelationshipGraph;
  /** Remand aging tracker for un-remediated defect tracking */
  readonly tracker?: RemandAgingTracker;
  /** Cryptographic integrity provider for sealing the composite package */
  readonly integrityProvider?: IntegrityProvider;
  /** Authoritative Table 17 routing table; defaults to TABLE_17_REMAND_ROUTING */
  readonly remandRoutingTable?: Readonly<Record<string, RemandDestinationInfo>>;
  /** Pluggable clock for deterministic timestamping */
  readonly nowFn?: NowFn;
}

/**
 * Core WP-25 Defect Remand Packaging & Multi-Destination Routing Engine.
 *
 * Implements:
 * 1. Lineage consistency validation across Failure, Execution, Case, Fixture, and Binding.
 * 2. Exact Table 17 Remand Routing Destination resolution.
 * 3. DefectRemandPackage assembly and cryptographic sealing.
 * 4. Canonical REMANDS_TO edge creation: ValidationFailureRecord -> GovernanceEntity.
 * 5. Factual tracking registration with RemandAgingTracker.
 * 6. Strict separation-of-concerns: Phase 1C.5h routes evidence; upstream owner remediates.
 */
export class DefectRemandRouter {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly tracker: RemandAgingTracker;
  private readonly integrityProvider: IntegrityProvider;
  private readonly remandRoutingTable: Readonly<Record<string, RemandDestinationInfo>>;
  private readonly nowFn: NowFn;

  constructor(dependencies: DefectRemandRouterDependencies = {}) {
    this.graph = dependencies.graph;
    this.nowFn = dependencies.nowFn ?? (() => new Date());
    this.tracker = dependencies.tracker ?? new RemandAgingTracker({ nowFn: this.nowFn });
    this.integrityProvider = dependencies.integrityProvider ?? new DefaultSha256IntegrityProvider();
    this.remandRoutingTable = dependencies.remandRoutingTable ?? TABLE_17_REMAND_ROUTING;
  }

  /**
   * Packages failure evidence and routes the defect to its authoritative upstream owner.
   *
   * Fail-stop order of operations:
   * 1. Validate inputs & cross-record lineage.
   * 2. Validate reproduction completeness.
   * 3. Resolve Table 17 destination from canonical WP-16 failure attribution.
   * 4. Assemble DefectRemandPackage & apply cryptographic seal.
   * 5. Mutate graph: register nodes and create canonical REMANDS_TO edge.
   * 6. Mutate tracker: register remand tracking metadata.
   * 7. Return immutable deep-frozen result.
   */
  public routeDefect(input: RouteDefectInput): RouteDefectResult {
    // 1. Cross-Record Lineage Consistency Validation
    this.validateLineage(input);

    // 2. Reproduction Completeness Validation
    this.validateReproductionCompleteness(input);

    // 3. Resolve Table 17 Destination
    const routing = this.resolveRouting(input.failureRecord);

    // 4. Assemble Composite DefectRemandPackage
    const remandPackage = this.assembleAndSealPackage(input, routing);

    // 5. Relationship Graph Integration: Create canonical REMANDS_TO edge
    let edge: RelationshipEdge | undefined;
    if (this.graph) {
      edge = this.registerGraphEdge(input.failureRecord.failure_id, routing.governanceEntityId);
    }

    // 6. Register Remand with Aging Tracker
    this.tracker.registerRemand(remandPackage);

    // 7. Return Deep-Frozen Result
    return deepFreeze({
      package: remandPackage,
      edge,
      tracking: remandPackage.tracking,
    });
  }

  /**
   * Delegates recording of an upstream remediation handoff to the RemandAgingTracker.
   */
  public recordHandoffReturn(
    remandId: string,
    returnRef: string,
    returnedAt?: string
  ): RemandHandoffTracking {
    return this.tracker.recordHandoffReturn(remandId, returnRef, returnedAt);
  }

  /**
   * Returns the underlying RemandAgingTracker.
   */
  public getAgingTracker(): RemandAgingTracker {
    return this.tracker;
  }

  // ---------------------------------------------------------------------------
  // Internal Verification & Assembly Helpers
  // ---------------------------------------------------------------------------

  private validateLineage(input: RouteDefectInput): void {
    const { failureRecord, executionRecord, versionBinding, validationCase, fixtureRecord } = input;

    if (!failureRecord || !executionRecord || !versionBinding || !validationCase || !fixtureRecord) {
      throw new RemandLineageMismatchError("All five core records (Failure, Execution, Binding, Case, Fixture) are required.");
    }

    // Failure must reference the supplied ExecutionRecord
    if (failureRecord.execution_id !== executionRecord.execution_id) {
      throw new RemandLineageMismatchError(
        `FailureRecord execution_id '${failureRecord.execution_id}' does not match ExecutionRecord '${executionRecord.execution_id}'.`
      );
    }

    // Execution must be bound to the supplied VersionBindingRecord
    if (executionRecord.binding_id !== versionBinding.binding_id) {
      throw new RemandLineageMismatchError(
        `ExecutionRecord binding_id '${executionRecord.binding_id}' does not match VersionBindingRecord '${versionBinding.binding_id}'.`
      );
    }

    // Execution must match the supplied ValidationCase
    if (executionRecord.case_id !== validationCase.case_id) {
      throw new RemandLineageMismatchError(
        `ExecutionRecord case_id '${executionRecord.case_id}' does not match ValidationCase '${validationCase.case_id}'.`
      );
    }

    // Execution must match the supplied ValidationFixtureRecord
    if (executionRecord.fixture_id !== fixtureRecord.fixture_id) {
      throw new RemandLineageMismatchError(
        `ExecutionRecord fixture_id '${executionRecord.fixture_id}' does not match ValidationFixtureRecord '${fixtureRecord.fixture_id}'.`
      );
    }

    // ValidationCase must include the Fixture in its declared associated fixtures
    if (!validationCase.associated_fixture_set.includes(fixtureRecord.fixture_id)) {
      throw new RemandLineageMismatchError(
        `ValidationCase '${validationCase.case_id}' does not list Fixture '${fixtureRecord.fixture_id}' in associated_fixture_set.`
      );
    }

    // If ObjectiveEvidenceRecord is provided, it must reference the ExecutionRecord
    if (input.objectiveEvidenceRecord && input.objectiveEvidenceRecord.execution_id !== executionRecord.execution_id) {
      throw new RemandLineageMismatchError(
        `ObjectiveEvidenceRecord execution_id '${input.objectiveEvidenceRecord.execution_id}' does not match ExecutionRecord '${executionRecord.execution_id}'.`
      );
    }
  }

  private validateReproductionCompleteness(input: RouteDefectInput): void {
    const { executionRecord, fixtureRecord, validationCase, executionTraceRef } = input;

    // Execution trace must be deterministically verifiable
    const traceRef = executionTraceRef ?? executionRecord.trace_ref;
    if (!traceRef || traceRef.trim() === "") {
      throw new IncompleteReproductionEvidenceError(
        "Execution trace reference is missing. A valid trace_ref is mandatory for reproducible defect remand."
      );
    }

    // Fixture must have valid payload digest and calibration spec
    if (!fixtureRecord.payload_integrity_ref || fixtureRecord.payload_integrity_ref.trim() === "") {
      throw new IncompleteReproductionEvidenceError(
        `Fixture '${fixtureRecord.fixture_id}' is missing payload_integrity_ref; cannot guarantee golden stem integrity.`
      );
    }
    if (!fixtureRecord.calibration_spec || fixtureRecord.calibration_spec.trim() === "") {
      throw new IncompleteReproductionEvidenceError(
        `Fixture '${fixtureRecord.fixture_id}' is missing calibration_spec; cannot verify reference gain level.`
      );
    }

    // Acceptance criteria reference must be non-empty
    if (!validationCase.acceptance_criteria_ref || validationCase.acceptance_criteria_ref.trim() === "") {
      throw new IncompleteReproductionEvidenceError(
        `ValidationCase '${validationCase.case_id}' is missing acceptance_criteria_ref.`
      );
    }
  }

  private resolveRouting(failureRecord: ValidationFailureRecord): RemandDestinationInfo {
    const attribution = failureRecord.attribution_class;
    const info = this.remandRoutingTable[attribution];

    if (!info) {
      throw new UnsupportedFailureAttributionError(
        `No canonical Table 17 remand routing defined for failure attribution class '${attribution}'.`
      );
    }

    return info;
  }

  private assembleAndSealPackage(
    input: RouteDefectInput,
    routing: RemandDestinationInfo
  ): DefectRemandPackage {
    const { failureRecord, executionRecord, versionBinding, validationCase, fixtureRecord } = input;
    const nowIso = this.nowFn().toISOString();

    const packageId =
      input.customPackageId ?? `DRP_${failureRecord.failure_id}_${executionRecord.execution_id}`;
    const remandId = input.customRemandId ?? `REMAND_${failureRecord.failure_id}`;
    const executionTraceRef = input.executionTraceRef ?? executionRecord.trace_ref;

    const fixtureStemRef = {
      fixtureId: fixtureRecord.fixture_id,
      payloadDigest: fixtureRecord.payload_integrity_ref,
      calibrationSpec: fixtureRecord.calibration_spec,
    };

    const measurementEvidence = {
      rawMeasurements: executionRecord.raw_measurements ?? {},
      objectiveEvidenceId: input.objectiveEvidenceRecord?.objective_evidence_id,
      criteriaRef: validationCase.acceptance_criteria_ref,
    };

    const tracking: RemandHandoffTracking = {
      remandId,
      failureId: failureRecord.failure_id,
      remandedAt: nowIso,
      recipient: routing.upstreamRecipient,
      governanceEntityId: routing.governanceEntityId,
      status: "OUTSTANDING",
    };

    // Construct unsigned package representation for deterministic integrity sealing
    const unsignedPayload = {
      packageId,
      failure_id: failureRecord.failure_id,
      execution_id: executionRecord.execution_id,
      binding_id: versionBinding.binding_id,
      case_id: validationCase.case_id,
      fixture_id: fixtureRecord.fixture_id,
      executionTraceRef,
      fixtureStemRef,
      measurementEvidence,
      routing,
      tracking,
    };

    const canonicalJson = canonicalizeJson(unsignedPayload);
    const integrityDigest = this.integrityProvider.computeDigest(canonicalJson);

    const packageIntegrity: RecordIntegrityMetadata = {
      integrity_digest: integrityDigest,
      algorithm: this.integrityProvider.algorithmName,
      sealed_at: nowIso,
      canonical_serialization_format: "RFC-8785-CANONICAL-JSON",
      signer_identity: "DefectRemandRouter",
    };

    return deepFreeze({
      packageId,
      failureRecord,
      executionTraceRef,
      versionBinding,
      validationCase,
      fixtureRecord,
      fixtureStemRef,
      measurementEvidence,
      routing,
      tracking,
      packageIntegrity,
    });
  }

  private registerGraphEdge(failureId: string, governanceEntityId: string): RelationshipEdge {
    if (!this.graph) {
      throw new Error("Graph dependency not available for edge registration.");
    }

    // 1. Ensure source node is registered (ValidationFailureRecord)
    this.graph.registerNode({
      id: failureId,
      kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
    });

    // 2. Ensure target node is registered (GovernanceEntity)
    this.graph.registerNode({
      id: governanceEntityId,
      kind: GOVERNED_ENTITY_KINDS.GovernanceEntity,
    });

    // 3. Add canonical REMANDS_TO edge: ValidationFailureRecord -> GovernanceEntity
    return this.graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.REMANDS_TO,
      source: {
        id: failureId,
        kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
      },
      target: {
        id: governanceEntityId,
        kind: GOVERNED_ENTITY_KINDS.GovernanceEntity,
      },
    });
  }
}
