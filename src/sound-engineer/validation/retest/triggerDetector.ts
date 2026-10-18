// src/sound-engineer/validation/retest/triggerDetector.ts
// Phase 1C.5h WP-20: RevalidationTriggerDetector Implementation (Record 18).
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

import { deepFreeze } from "../../contracts/immutability";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  RevalidationRequiredAction,
  RevalidationTriggerSource,
} from "../schemas/enums";
import {
  RevalidationTriggerRecord,
  revalidationTriggerRecordSchema,
  ValidationScopeRecord,
} from "../schemas/records";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  calculateAffectedScope,
  determineRequiredAction,
} from "./dependencyImpactAnalyzer";
import {
  deriveDeterministicTriggerId,
  validateBindingTransition,
  validateScopeContainment,
} from "./retestContextValidator";
import {
  ScopeContainmentError,
  TriggerDetectionError,
} from "./retestErrors";
import {
  GovernedMaterialChangeEvent,
  TriggerDetectionInput,
  TriggerDetectionResult,
} from "./retestTypes";
import {
  detectTriggersFromBindingDiff,
  normalizeRequiredAction,
  normalizeTriggerSource,
} from "./triggerMappings";

/**
 * RevalidationTriggerDetector: Authoritative engine for detecting and classifying
 * material changes against the ten frozen revalidation triggers and emitting immutable Record 18.
 */
export class RevalidationTriggerDetector {
  constructor(
    private readonly defaultOptions?: {
      readonly graph?: ValidationRelationshipGraph;
      readonly auditLedger?: ValidationAuditLedger;
    }
  ) {}

  /**
   * Evaluates prior vs new version binding state and optional external change event,
   * classifies material changes against the ten frozen triggers, and emits an immutable RevalidationTriggerRecord.
   */
  public detectTrigger(input: TriggerDetectionInput): TriggerDetectionResult {
    if (!input) {
      throw new TriggerDetectionError("TriggerDetectionInput is required.");
    }

    // 1. Validate version bindings and transition coherence
    validateBindingTransition(input.priorBinding, input.newBinding, input.changeEvent);

    // 2. Detect triggers from version binding diff
    const diffResult = detectTriggersFromBindingDiff(input.priorBinding, input.newBinding);
    const detectedTriggers: RevalidationTriggerSource[] = [...diffResult.triggers];
    const rationales: string[] = [...diffResult.rationales];

    // 3. Process explicit governed change event if provided
    let explicitTriggerSource: RevalidationTriggerSource | undefined;
    if (input.changeEvent?.trigger_source) {
      explicitTriggerSource = normalizeTriggerSource(input.changeEvent.trigger_source);
      if (!detectedTriggers.includes(explicitTriggerSource)) {
        detectedTriggers.push(explicitTriggerSource);
      }
      if (input.changeEvent.description) {
        rationales.push(input.changeEvent.description);
      }
    } else if (input.changeEvent) {
      // Deduce trigger from change event payload if not explicitly named
      if (input.changeEvent.candidate_lesson_id || input.changeEvent.candidate_lesson_domain) {
        explicitTriggerSource = REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED;
        if (!detectedTriggers.includes(explicitTriggerSource)) {
          detectedTriggers.push(explicitTriggerSource);
        }
        rationales.push(
          `TRIGGER-09: Promotion of candidate lesson "${input.changeEvent.candidate_lesson_id ?? "unknown"}" affecting domain "${input.changeEvent.candidate_lesson_domain ?? "general"}".`
        );
      } else if (input.changeEvent.telemetry_anomaly) {
        const anomaly = input.changeEvent.telemetry_anomaly;
        const isQualifying =
          anomaly.warrants_gate_8_suspension === true ||
          (anomaly.warrants_gate_8_suspension !== false &&
            typeof anomaly.observed_defect_rate === "number" &&
            typeof anomaly.threshold === "number" &&
            anomaly.observed_defect_rate >= anomaly.threshold);

        if (isQualifying) {
          explicitTriggerSource = REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE;
          if (!detectedTriggers.includes(explicitTriggerSource)) {
            detectedTriggers.push(explicitTriggerSource);
          }
          rationales.push(
            `TRIGGER-10: Production quality telemetry anomaly in metric "${anomaly.metric_name}" (defect rate ${anomaly.observed_defect_rate} >= threshold ${anomaly.threshold}).`
          );
        }
      } else if (
        input.changeEvent.affected_fixture_ids &&
        input.changeEvent.affected_fixture_ids.length > 0
      ) {
        explicitTriggerSource = REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE;
        if (!detectedTriggers.includes(explicitTriggerSource)) {
          detectedTriggers.push(explicitTriggerSource);
        }
        rationales.push(
          `TRIGGER-06: Golden Acoustic Fixture recalibration/invalidation affecting fixtures: ${input.changeEvent.affected_fixture_ids.join(", ")}.`
        );
      }
    }

    // Fail closed if zero material triggers detected
    if (detectedTriggers.length === 0) {
      throw new TriggerDetectionError(
        "No material change detected between prior and new version bindings, and zero governed change event provided."
      );
    }

    // Determine primary trigger source
    const primaryTriggerSource = explicitTriggerSource ?? detectedTriggers[0];

    // 4. Resolve scope record (from input or fallback synthetic representation of binding scope)
    const scopeRecord: ValidationScopeRecord =
      input.scopeRecord ?? {
        scope_id: input.priorBinding.scope_id,
        intake_id: "intake_inferred",
        primary_domain: "GEAR_FAMILY",
        included_units: ["core_preset"],
        excluded_units: [],
        boundary_constraints: [],
        scope_inflation_protection: true,
      };

    // Fail closed if changeEvent explicitly specifies excluded units
    if (input.changeEvent?.affected_units) {
      const excludedSet = new Set(scopeRecord.excluded_units ?? []);
      for (const u of input.changeEvent.affected_units) {
        if (excludedSet.has(u)) {
          throw new ScopeContainmentError(
            `Unit "${u}" is explicitly excluded in scope record "${scopeRecord.scope_id}".`
          );
        }
      }
    }

    // 5. Calculate narrowest defensible affected scope
    const affectedScope = calculateAffectedScope(
      primaryTriggerSource,
      scopeRecord,
      input.changeEvent
    );

    // 6. Determine required action
    const requiredActionRaw = determineRequiredAction(
      primaryTriggerSource,
      affectedScope,
      scopeRecord,
      input.changeEvent
    );
    const requiredAction = normalizeRequiredAction(requiredActionRaw);

    // Validate scope containment
    validateScopeContainment(affectedScope, input.scopeRecord, requiredAction);

    // 7. Derive deterministic trigger ID and timestamp
    const timestamp = input.timestamp ?? new Date().toISOString();
    const eventToken =
      input.changeEvent?.candidate_lesson_id ??
      input.changeEvent?.telemetry_anomaly?.metric_name ??
      (input.changeEvent?.affected_fixture_ids ? input.changeEvent.affected_fixture_ids.join(",") : undefined);

    const triggerId = deriveDeterministicTriggerId(
      input.priorBinding.binding_id,
      input.newBinding.binding_id,
      primaryTriggerSource,
      affectedScope,
      eventToken
    );

    // 8. Build raw record payload strictly adhering to Record 18 schema
    const rawRecord = {
      trigger_id: triggerId,
      trigger_source: primaryTriggerSource,
      prior_binding_id: input.priorBinding.binding_id,
      new_binding_id: input.newBinding.binding_id,
      affected_scope: [...affectedScope],
      required_action: requiredAction,
      trigger_timestamp: timestamp,
    };

    // Parse and validate strictly with Zod schema (rejection of extra/invented fields)
    const parsedRecord = revalidationTriggerRecordSchema.parse(rawRecord);
    const triggerRecord: RevalidationTriggerRecord = deepFreeze(parsedRecord);

    // 9. Attach relationship graph edges if graph provided
    const graph = input.graph ?? this.defaultOptions?.graph;
    let invalidationEdge: RelationshipEdge | undefined;

    if (graph) {
      // Register RevalidationTriggerRecord node
      graph.registerNode({
        id: triggerRecord.trigger_id,
        kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
      });

      // If prior outcome provided, link via canonical INVALIDATED_BY edge:
      // ValidationOutcomeRecord -> RevalidationTriggerRecord
      if (input.priorOutcomeRecord) {
        if (!graph.hasNode(input.priorOutcomeRecord.outcome_id)) {
          graph.registerNode({
            id: input.priorOutcomeRecord.outcome_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
          });
        }

        invalidationEdge = graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: {
            id: input.priorOutcomeRecord.outcome_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
          },
          target: {
            id: triggerRecord.trigger_id,
            kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
          },
        });
      }
    }

    // 10. Append to audit ledger if provided and not duplicate
    const auditLedger = input.auditLedger ?? this.defaultOptions?.auditLedger;
    if (auditLedger) {
      const alreadyLogged = auditLedger
        .getEntries()
        .some(
          (e) =>
            e.entityKind === GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord &&
            e.entityId === triggerRecord.trigger_id
        );
      if (!alreadyLogged) {
        auditLedger.appendRecord(
          GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
          triggerRecord.trigger_id,
          triggerRecord,
          triggerRecord.trigger_timestamp
        );
      }

      if (invalidationEdge) {
        const edgeAlreadyLogged = auditLedger
          .getEntries()
          .some((e) => e.entryType === "RELATIONSHIP_EDGE" && e.entityId === invalidationEdge.edgeId);
        if (!edgeAlreadyLogged) {
          auditLedger.appendEdge(invalidationEdge, invalidationEdge.createdAt);
        }
      }
    }

    return deepFreeze({
      triggerRecord,
      detectedTriggers: Object.freeze(detectedTriggers),
      primaryTriggerSource,
      rationales: Object.freeze(rationales),
      affectedScope: Object.freeze(affectedScope),
      invalidationEdge,
    });
  }
}
