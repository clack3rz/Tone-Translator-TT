// src/sound-engineer/validation/retest/retestPlanner.ts
// Phase 1C.5h WP-20: RetestPlanner Implementation (Record 19).
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

import { computeSha256BytesHex } from "../fixtures/audioVerification";
import { deepFreeze } from "../../contracts/immutability";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
  RetestPlanRecord,
  retestPlanRecordSchema,
  revalidationTriggerRecordSchema,
} from "../schemas/records";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  computeRetestScope,
  partitionEvidence,
  selectRequiredNewCases,
} from "./dependencyImpactAnalyzer";
import {
  InvalidSupersessionError,
  RetestPlanningError,
} from "./retestErrors";
import {
  RecordSupersessionInput,
  RecordSupersessionResult,
  RetestPlanInput,
  RetestPlanResult,
} from "./retestTypes";

/**
 * RetestPlanner: Authoritative engine for constructing targeted RetestPlanRecord instances (Record 19),
 * partitioning historical evidence into disjoint retained and invalidated sets, and preserving
 * historical execution supersession lineage.
 */
export class RetestPlanner {
  constructor(
    private readonly defaultOptions?: {
      readonly graph?: ValidationRelationshipGraph;
      readonly auditLedger?: ValidationAuditLedger;
    }
  ) {}

  /**
   * Constructs an immutable RetestPlanRecord instance for a governed RevalidationTriggerRecord.
   */
  public createRetestPlan(input: RetestPlanInput): RetestPlanResult {
    if (!input) {
      throw new RetestPlanningError("RetestPlanInput is required.");
    }

    // 1. Validate RevalidationTriggerRecord
    const triggerRecord = revalidationTriggerRecordSchema.parse(input.triggerRecord);

    // Fail closed if trigger required_action is NO_ACTION: no retest plan is warranted or permitted
    if (triggerRecord.required_action === "NO_ACTION") {
      throw new RetestPlanningError(
        'Cannot fabricate RetestPlanRecord for trigger with required_action "NO_ACTION". No retest is warranted or permitted.'
      );
    }

    // 2. Validate package and scope records
    if (!input.packageRecord || !input.packageRecord.package_id) {
      throw new RetestPlanningError("Valid ValidationPackage is required.");
    }

    if (!input.scopeRecord || !input.scopeRecord.scope_id) {
      throw new RetestPlanningError("Valid ValidationScopeRecord is required.");
    }

    // 3. Partition historical evidence into disjoint retained vs invalidated sets
    const { retainedValidEvidenceRefs, invalidatedEvidenceRefs } = partitionEvidence(
      triggerRecord.trigger_source,
      triggerRecord.required_action,
      triggerRecord.affected_scope,
      input.existingEvidenceRecords,
      input.executionRecords,
      input.changeEvent,
      input.packageRecord,
      input.availableCases
    );

    // 4. Select minimum sufficient set of required new validation cases
    const requiredNewCases = selectRequiredNewCases(
      triggerRecord.trigger_source,
      triggerRecord.required_action,
      triggerRecord.affected_scope,
      input.packageRecord,
      input.availableCases,
      invalidatedEvidenceRefs,
      input.changeEvent
    );

    // 5. Compute bounded retest scope
    const retestScope = computeRetestScope(
      requiredNewCases,
      input.availableCases,
      triggerRecord.affected_scope,
      input.scopeRecord
    );

    const planPayload = `${triggerRecord.trigger_id}:${input.packageRecord.package_id}:${requiredNewCases.join(",")}:${retestScope.join(",")}`;
    const planIdHash = computeSha256BytesHex(new TextEncoder().encode(planPayload)).slice(0, 16);
    const retestPlanId = `plan_${planIdHash}`;

    // 7. Construct raw RetestPlanRecord strictly adhering to Record 19 schema
    const rawPlan = {
      retest_plan_id: retestPlanId,
      trigger_id: triggerRecord.trigger_id,
      previous_package_id: input.packageRecord.package_id,
      retained_valid_evidence_refs: [...retainedValidEvidenceRefs],
      invalidated_evidence_refs: [...invalidatedEvidenceRefs],
      required_new_cases: [...requiredNewCases],
      retest_scope: [...retestScope],
    };

    // Strict Zod schema parsing (rejects extra/invented fields)
    const parsedPlan = retestPlanRecordSchema.parse(rawPlan);
    const retestPlan: RetestPlanRecord = deepFreeze(parsedPlan);

    // 8. Attach relationship graph edge if graph provided
    const graph = input.graph ?? this.defaultOptions?.graph;
    let requiresRetestEdge: RelationshipEdge | undefined;

    if (graph) {
      // Register nodes if not registered
      if (!graph.hasNode(triggerRecord.trigger_id)) {
        graph.registerNode({
          id: triggerRecord.trigger_id,
          kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
        });
      }

      graph.registerNode({
        id: retestPlan.retest_plan_id,
        kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord,
      });

      // Create canonical REQUIRES_RETEST edge:
      // RevalidationTriggerRecord -> RetestPlanRecord
      requiresRetestEdge = graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.REQUIRES_RETEST,
        source: {
          id: triggerRecord.trigger_id,
          kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
        },
        target: {
          id: retestPlan.retest_plan_id,
          kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord,
        },
      });
    }

    // 9. Append to audit ledger if provided
    const auditLedger = input.auditLedger ?? this.defaultOptions?.auditLedger;
    if (auditLedger) {
      const alreadyLogged = auditLedger
        .getEntries()
        .some(
          (e) =>
            e.entityKind === GOVERNED_ENTITY_KINDS.RetestPlanRecord &&
            e.entityId === retestPlan.retest_plan_id
        );
      if (!alreadyLogged) {
        auditLedger.appendRecord(
          GOVERNED_ENTITY_KINDS.RetestPlanRecord,
          retestPlan.retest_plan_id,
          retestPlan
        );
      }

      if (requiresRetestEdge) {
        const edgeAlreadyLogged = auditLedger
          .getEntries()
          .some((e) => e.entryType === "RELATIONSHIP_EDGE" && e.entityId === requiresRetestEdge.edgeId);
        if (!edgeAlreadyLogged) {
          auditLedger.appendEdge(requiresRetestEdge, requiresRetestEdge.createdAt);
        }
      }
    }

    return deepFreeze({
      retestPlan,
      retainedValidEvidenceRefs,
      invalidatedEvidenceRefs,
      requiredNewCases,
      retestScope,
      requiresRetestEdge,
    });
  }

  /**
   * Records a canonical SUPERSEDES_VALIDATION relationship edge when a new execution
   * replaces an older historical execution.
   *
   * Semantic orientation:
   * newExecutionRecord (source) -> priorExecutionRecord (target) via SUPERSEDES_VALIDATION.
   *
   * CRITICAL GOVERNANCE:
   * The historical prior execution record is NEVER mutated or deleted.
   */
  public recordSupersession(input: RecordSupersessionInput): RecordSupersessionResult {
    if (!input) {
      throw new InvalidSupersessionError("RecordSupersessionInput is required.");
    }

    if (!input.newExecutionRecord || !input.newExecutionRecord.execution_id) {
      throw new InvalidSupersessionError("Valid newExecutionRecord is required.");
    }

    if (!input.priorExecutionRecord || !input.priorExecutionRecord.execution_id) {
      throw new InvalidSupersessionError("Valid priorExecutionRecord is required.");
    }

    if (input.newExecutionRecord.execution_id === input.priorExecutionRecord.execution_id) {
      throw new InvalidSupersessionError(
        `Self-supersession prohibited. Execution ID "${input.newExecutionRecord.execution_id}" cannot supersede itself.`
      );
    }

    // Inverted direction check: new execution must not be chronologically older than prior execution
    if (
      input.newExecutionRecord.execution_timestamp &&
      input.priorExecutionRecord.execution_timestamp &&
      new Date(input.newExecutionRecord.execution_timestamp).getTime() <
        new Date(input.priorExecutionRecord.execution_timestamp).getTime()
    ) {
      throw new InvalidSupersessionError(
        `Inverted supersession direction: priorExecutionRecord (${input.priorExecutionRecord.execution_timestamp}) is newer than newExecutionRecord (${input.newExecutionRecord.execution_timestamp}).`
      );
    }

    // Cross-case supersession prohibited: new execution must target the same validation case as prior execution
    if (input.newExecutionRecord.case_id !== input.priorExecutionRecord.case_id) {
      throw new InvalidSupersessionError(
        `Cross-case supersession prohibited. New execution case "${input.newExecutionRecord.case_id}" does not match prior execution case "${input.priorExecutionRecord.case_id}".`
      );
    }

    const graph = input.graph;
    if (!graph) {
      throw new InvalidSupersessionError("ValidationRelationshipGraph is required to record supersession.");
    }

    // Register nodes in graph if not already registered
    if (!graph.hasNode(input.newExecutionRecord.execution_id)) {
      graph.registerNode({
        id: input.newExecutionRecord.execution_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
      });
    }

    if (!graph.hasNode(input.priorExecutionRecord.execution_id)) {
      graph.registerNode({
        id: input.priorExecutionRecord.execution_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
      });
    }

    // Create canonical SUPERSEDES_VALIDATION edge:
    // newExecutionRecord (source) -> priorExecutionRecord (target)
    const edge = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
      source: {
        id: input.newExecutionRecord.execution_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
      },
      target: {
        id: input.priorExecutionRecord.execution_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
      },
    });

    // Append to audit ledger if provided
    const auditLedger = input.auditLedger ?? this.defaultOptions?.auditLedger;
    if (auditLedger) {
      auditLedger.appendEdge(edge, input.timestamp ?? edge.createdAt);
    }

    return deepFreeze({
      edge,
      newExecutionId: input.newExecutionRecord.execution_id,
      supersededExecutionId: input.priorExecutionRecord.execution_id,
    });
  }
}
