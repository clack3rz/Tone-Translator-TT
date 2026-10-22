// src/sound-engineer/validation/readiness/readinessSynthesizer.ts
// Authoritative ProductionReadinessSynthesizer for Phase 1C.5h WP-21:
// Four-Pillar Production Readiness Assessment Synthesis (Record 20).
// Bound to frozen specification v0.1j Section 25 & Table 13.

import { deepFreeze } from "../../contracts/immutability";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  PILLAR_READINESS_STATUSES,
  ProductionReadinessAssessmentRecord,
  productionReadinessAssessmentRecordSchema,
  ProductionReadinessSynthesisInput,
  ProductionReadinessSynthesisResult,
} from "./productionReadinessTypes";
import {
  deriveDeterministicReadinessId,
  validateReadinessContext,
} from "./readinessContextValidator";
import { evaluateHardBlockers } from "./hardBlockerEvaluator";
import { evaluateFourPillars } from "./pillarEvaluator";
import { InvalidProductionReadinessRecordError } from "./productionReadinessErrors";

/**
 * ProductionReadinessSynthesizer: Authoritative engine for WF-15 Production Readiness Synthesis.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. Production readiness is NEVER a single synthetic scalar score, percentage, or weighted mean.
 * 2. Gate 8 authorizes production cutover; WP-21 ONLY determines pre-Gate-8 eligibility.
 * 3. gate_8_eligible === true IF AND ONLY IF all four pillars are SATISFIED AND hard_blockers_present.length === 0.
 * 4. Zero invented Record 20 fields; zero implementation of Records 21 or 22.
 */
export class ProductionReadinessSynthesizer {
  constructor(
    private readonly defaultOptions?: {
      readonly graph?: ValidationRelationshipGraph;
      readonly auditLedger?: ValidationAuditLedger;
    }
  ) {}

  /**
   * Synthesizes the Four-Pillar Production Readiness Assessment (Record 20).
   */
  public synthesizeProductionReadiness(
    input: ProductionReadinessSynthesisInput
  ): ProductionReadinessSynthesisResult {
    // 1. Context validation (fails closed if essential inputs are invalid or missing)
    validateReadinessContext(input);

    // 2. Resolve requested scope (defaults to package scope / included_units)
    const requestedScope = Object.freeze(
      input.requestedScope && input.requestedScope.length > 0
        ? [...input.requestedScope]
        : [...input.scopeRecord.included_units]
    );

    // 3. Evaluate the Eight Frozen Hard Blockers
    const hardBlockerResult = evaluateHardBlockers(input, requestedScope);
    const hardBlockersPresent = hardBlockerResult.hardBlockersPresent;

    // 4. Evaluate the Four Orthogonal Readiness Pillars
    const pillarResult = evaluateFourPillars(input, requestedScope);
    const pillarEvaluations = pillarResult.pillarEvaluations;

    // 5. Strict Gate 8 Eligibility Determination (IF AND ONLY IF all 4 SATISFIED and 0 blockers)
    const allPillarsSatisfied =
      pillarEvaluations.acoustic_musical_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
      pillarEvaluations.reasoning_governance_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
      pillarEvaluations.platform_operational_readiness === PILLAR_READINESS_STATUSES.SATISFIED &&
      pillarEvaluations.rollback_safety_readiness === PILLAR_READINESS_STATUSES.SATISFIED;

    const zeroHardBlockers = hardBlockersPresent.length === 0;

    const gate8Eligible = allPillarsSatisfied && zeroHardBlockers;

    // 6. Generate Deterministic Technical Synthesis Rationale
    const rationaleParts: string[] = [];

    rationaleParts.push(
      `Gate 8 Pre-Adjudication Eligibility: ${gate8Eligible ? "ELIGIBLE" : "INELIGIBLE"}.`
    );

    rationaleParts.push(
      `Pillars: Acoustic=${pillarEvaluations.acoustic_musical_readiness}, Reasoning/Governance=${pillarEvaluations.reasoning_governance_readiness}, Platform=${pillarEvaluations.platform_operational_readiness}, Rollback/Safety=${pillarEvaluations.rollback_safety_readiness}.`
    );

    if (hardBlockersPresent.length > 0) {
      rationaleParts.push(
        `Active Hard Blockers (${hardBlockersPresent.length}): ${hardBlockersPresent.join("; ")}.`
      );
    } else {
      rationaleParts.push("Zero active hard blockers detected.");
    }

    if (!gate8Eligible) {
      const disqualifications: string[] = [];
      if (pillarEvaluations.acoustic_musical_readiness !== PILLAR_READINESS_STATUSES.SATISFIED) {
        disqualifications.push(`Acoustic pillar is ${pillarEvaluations.acoustic_musical_readiness}`);
      }
      if (pillarEvaluations.reasoning_governance_readiness !== PILLAR_READINESS_STATUSES.SATISFIED) {
        disqualifications.push(`Reasoning/governance pillar is ${pillarEvaluations.reasoning_governance_readiness}`);
      }
      if (pillarEvaluations.platform_operational_readiness !== PILLAR_READINESS_STATUSES.SATISFIED) {
        disqualifications.push(`Platform operational pillar is ${pillarEvaluations.platform_operational_readiness}`);
      }
      if (pillarEvaluations.rollback_safety_readiness !== PILLAR_READINESS_STATUSES.SATISFIED) {
        disqualifications.push(`Rollback/safety pillar is ${pillarEvaluations.rollback_safety_readiness}`);
      }
      if (hardBlockersPresent.length > 0) {
        disqualifications.push(`${hardBlockersPresent.length} hard blocker(s) present`);
      }
      rationaleParts.push(`Disqualification reason(s): ${disqualifications.join(", ")}.`);
    }

    const pillarRationalesText = Object.entries(pillarResult.pillarRationales)
      .filter(([_, text]) => Boolean(text && text.length > 0))
      .map(([pillar, text]) => `[${pillar}]: ${text}`)
      .join(" ");
    if (pillarRationalesText) {
      rationaleParts.push(pillarRationalesText);
    }

    const synthesisRationale = rationaleParts.join(" ");

    // 7. Derive Deterministic Assessment ID
    const timestamp = input.timestamp ?? new Date().toISOString();
    const readinessAssessmentId = deriveDeterministicReadinessId(
      input.packageRecord.package_id,
      requestedScope,
      input.versionBinding?.binding_id,
      timestamp
    );

    // 8. Construct Raw Record 20 adhering strictly to WP-01 schema
    const rawRecord = {
      readiness_assessment_id: readinessAssessmentId,
      package_id: input.packageRecord.package_id,
      pillar_evaluations: {
        acoustic_musical_readiness: pillarEvaluations.acoustic_musical_readiness,
        reasoning_governance_readiness: pillarEvaluations.reasoning_governance_readiness,
        platform_operational_readiness: pillarEvaluations.platform_operational_readiness,
        rollback_safety_readiness: pillarEvaluations.rollback_safety_readiness,
      },
      hard_blockers_present: [...hardBlockersPresent],
      gate_8_eligible: gate8Eligible,
      synthesis_rationale: synthesisRationale,
      assessment_timestamp: timestamp,
    };

    // Strict schema parse (rejects extra/invented fields)
    let parsedRecord: ProductionReadinessAssessmentRecord;
    try {
      parsedRecord = productionReadinessAssessmentRecordSchema.parse(rawRecord);
    } catch (err) {
      throw new InvalidProductionReadinessRecordError(
        `ProductionReadinessAssessmentRecord schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const assessmentRecord = deepFreeze(parsedRecord);

    // 9. Register node in Relationship Graph if provided
    const graph = input.graph ?? this.defaultOptions?.graph;
    if (graph) {
      if (!graph.hasNode(assessmentRecord.readiness_assessment_id)) {
        graph.registerNode({
          id: assessmentRecord.readiness_assessment_id,
          kind: GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
        });
      }
    }

    // 10. Append to Audit Ledger if provided (idempotent)
    const auditLedger = input.auditLedger ?? this.defaultOptions?.auditLedger;
    if (auditLedger) {
      const alreadyLogged = auditLedger
        .getEntries()
        .some(
          (e) =>
            e.entityKind === GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord &&
            e.entityId === assessmentRecord.readiness_assessment_id
        );
      if (!alreadyLogged) {
        auditLedger.appendRecord(
          GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
          assessmentRecord.readiness_assessment_id,
          assessmentRecord,
          assessmentRecord.assessment_timestamp
        );
      }
    }

    return deepFreeze({
      assessmentRecord,
      pillarEvaluations,
      hardBlockersPresent,
      gate8Eligible,
      synthesisRationale,
    });
  }
}
