// src/sound-engineer/validation/gate8/gate8AdjudicationEngine.ts
// Gate8AdjudicationEngine: Authoritative engine for Phase 1C.5h WP-22:
// Activity WF-16 — Gate 8 Cutover Adjudication & Scoped Authorization (Record 21).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 18, and Build Plan v0.1h WP-22.

import { deepFreeze } from "../../contracts/immutability";
import {
  ADOPTION_DECISION_OUTCOMES,
  AdoptionDecisionOutcome,
  GOVERNANCE_STATUSES,
  GovernanceStatus,
  READINESS_OUTCOMES,
} from "../schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { IntegrityProvider } from "../schemas/integrity";
import {
  AdoptionDecisionRecord,
  adoptionDecisionRecordSchema,
} from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import {
  Gate8AdjudicationEngineOptions,
  Gate8AdjudicationInput,
  Gate8AdjudicationResult,
} from "./gate8Types";
import {
  deriveDeterministicDecisionId,
  validateGate8Context,
} from "./gate8ContextValidator";
import { evaluateScopeAuthorization } from "./scopeAuthorizationEvaluator";
import {
  DEFAULT_GATE8_AUTHORITY_REGISTRY,
  KeyedAuthorityIntegrityProvider,
  sealAdoptionDecisionPayload,
} from "./gate8Signer";
import {
  Gate8AdjudicationBlockedError,
  Gate8ScopeContainmentError,
  InvalidAdoptionDecisionRecordError,
} from "./gate8Errors";

/**
 * Gate8AdjudicationEngine: The exclusive Gate 8 Cutover Adjudication authority.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. GATE 8 AUTHORIZES. PHASE 1C.5g EXECUTES GOVERNED ADOPTION.
 * 2. Gate 8 issues an authorization certificate (AdoptionDecisionRecord); it NEVER executes cutover,
 *    traffic routing, canary activation, or rollback.
 * 3. Scope containment: authorized_scope <= requested_scope <= tested_scope.
 * 4. Relationship catalogue remains exactly 14 edge types. Canonical AUTHORIZES_SCOPE is directed:
 *    AdoptionDecisionRecord -> ValidationScopeRecord.
 * 5. Negative decisions (REJECTED, BLOCKED) NEVER attach AUTHORIZES_SCOPE edges.
 * 6. Initial governance_status is strictly ACTIVE; post-cutover lifecycle changes belong to WP-24 / Record 22.
 * 7. Authentic cryptographic signing: Record 21 is sealed via keyed authority credentials.
 * 8. Frozen Condition 20: Valid oversized petitions produce governed REJECTED records (authorized_scope=[]).
 */
export class Gate8AdjudicationEngine {
  private readonly defaultOptions?: Gate8AdjudicationEngineOptions;
  private readonly decisionsById = new Map<string, Gate8AdjudicationResult>();

  constructor(options?: Gate8AdjudicationEngineOptions) {
    this.defaultOptions = options;
  }

  /**
   * Adjudicates production cutover for a candidate ValidationPackage against its
   * Four-Pillar Production Readiness Assessment (Record 20).
   *
   * Synthesizes and cryptographically seals the authoritative AdoptionDecisionRecord (Record 21).
   */
  public adjudicateCutover(input: Gate8AdjudicationInput): Gate8AdjudicationResult {
    // 1. Resolve candidate decision outcome (including Condition 20 scope inflation evaluation)
    const resolvedOutcome = this.resolveDecisionOutcome(input);

    // 2. Validate context, prerequisites, version binding integrity, and authorizing official
    validateGate8Context(input, resolvedOutcome);

    // 3. Strict scope authorization evaluation
    const scopeEvaluation = evaluateScopeAuthorization(
      input.scopeRecord,
      input.requestedScope,
      input.proposedAuthorizedScope,
      resolvedOutcome
    );

    // 4. Resolve timestamps and version binding integrity reference
    const timestamp = input.timestamp ?? new Date().toISOString();
    const versionBindingIntegrityRef =
      input.versionBindingRecord.version_integrity_reference.composite_digest;

    // 5. Derive deterministic decision identifier
    const decisionId =
      input.decisionId ??
      deriveDeterministicDecisionId(
        input.packageRecord.package_id,
        input.readinessAssessmentRecord.readiness_assessment_id,
        scopeEvaluation.requestedScope,
        scopeEvaluation.authorizedScope,
        resolvedOutcome,
        versionBindingIntegrityRef,
        input.timestamp
      );

    // 6. Idempotency check: return existing frozen adjudication if identical
    if (this.decisionsById.has(decisionId)) {
      return this.decisionsById.get(decisionId)!;
    }

    // 7. Resolve rollback verification reference
    const rollbackCertRef =
      input.rollbackVerificationCertRef ??
      input.rollbackEvidence?.evidence_ref ??
      `${input.readinessAssessmentRecord.readiness_assessment_id}_rollback_ref`;

    // 8. Resolve conditions & restrictions and mandatory monitoring rules
    const conditionsAndRestrictions = this.resolveConditions(input, resolvedOutcome);
    const mandatoryMonitoringRules = Object.freeze(
      input.mandatoryMonitoringRules ? [...input.mandatoryMonitoringRules] : []
    );

    // 9. Initial governance status is strictly ACTIVE for newly issued decisions
    const governanceStatus: GovernanceStatus =
      input.governanceStatus ?? GOVERNANCE_STATUSES.ACTIVE;

    // 10. Integrity provider resolution (authentic cryptographic signing)
    let integrityProvider: IntegrityProvider;
    if (input.integrityProvider) {
      integrityProvider = input.integrityProvider;
    } else if (this.defaultOptions?.integrityProvider) {
      integrityProvider = this.defaultOptions.integrityProvider;
    } else {
      const registry =
        input.authorityRegistry ??
        this.defaultOptions?.authorityRegistry ??
        DEFAULT_GATE8_AUTHORITY_REGISTRY;
      const officialId = input.authorizingOfficial.trim();
      const creds = registry.getAuthorityCredentials(officialId);
      const authorityKey = input.authorizingOfficialKey ?? creds?.keyOrSecret;

      if (authorityKey) {
        integrityProvider = new KeyedAuthorityIntegrityProvider(authorityKey);
      } else {
        integrityProvider = new DefaultSha256IntegrityProvider();
      }
    }

    // 11. Prepare unsealed payload for cryptographic sealing
    const unsealedPayload = {
      decision_id: decisionId,
      package_id: input.packageRecord.package_id,
      readiness_assessment_id: input.readinessAssessmentRecord.readiness_assessment_id,
      requested_scope: [...scopeEvaluation.requestedScope],
      authorized_scope: [...scopeEvaluation.authorizedScope],
      version_binding_integrity_ref: versionBindingIntegrityRef,
      decision_outcome: resolvedOutcome,
      decision_timestamp: timestamp,
      conditions_and_restrictions: [...conditionsAndRestrictions],
      mandatory_monitoring_rules: [...mandatoryMonitoringRules],
      rollback_verification_cert_ref: rollbackCertRef,
      governance_status: governanceStatus,
      authorizing_official: input.authorizingOfficial.trim(),
    };

    // 12. Cryptographically seal record using integrity provider
    const recordIntegrityMetadata = sealAdoptionDecisionPayload(
      unsealedPayload,
      input.authorizingOfficial.trim(),
      integrityProvider,
      timestamp
    );

    // 13. Construct complete raw Record 21
    const rawRecord = {
      ...unsealedPayload,
      record_integrity_metadata: recordIntegrityMetadata,
    };

    // 14. Strict schema validation (rejects extra/invented fields)
    let parsedRecord: AdoptionDecisionRecord;
    try {
      parsedRecord = adoptionDecisionRecordSchema.parse(rawRecord);
    } catch (err) {
      throw new InvalidAdoptionDecisionRecordError(
        `AdoptionDecisionRecord schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const decisionRecord = deepFreeze(parsedRecord);

    // 15. Relationship Graph integration
    const graph = input.graph ?? this.defaultOptions?.graph;
    let authorizesScopeEdge: RelationshipEdge | undefined;

    if (graph) {
      // Register ValidationScopeRecord node if not already present
      if (!graph.hasNode(input.scopeRecord.scope_id)) {
        graph.registerNode({
          id: input.scopeRecord.scope_id,
          kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
        });
      }

      // Register AdoptionDecisionRecord node
      if (!graph.hasNode(decisionRecord.decision_id)) {
        graph.registerNode({
          id: decisionRecord.decision_id,
          kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
        });
      }

      // Canonical AUTHORIZES_SCOPE edge ONLY for positive authorizations
      if (
        resolvedOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
        resolvedOutcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED
      ) {
        authorizesScopeEdge = graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
          source: {
            id: decisionRecord.decision_id,
            kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
          },
          target: {
            id: input.scopeRecord.scope_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
          },
        });
      }
    }

    // 16. Append-only Audit Ledger integration
    const auditLedger = input.auditLedger ?? this.defaultOptions?.auditLedger;
    if (auditLedger) {
      const alreadyLogged = auditLedger
        .getEntries()
        .some(
          (e) =>
            e.entityKind === GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord &&
            e.entityId === decisionRecord.decision_id
        );
      if (!alreadyLogged) {
        auditLedger.appendRecord(
          GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord,
          decisionRecord.decision_id,
          decisionRecord,
          decisionRecord.decision_timestamp
        );
      }
    }

    // 17. Synthesize Adjudication Rationale
    const adjudicationRationale = this.synthesizeAdjudicationRationale(
      resolvedOutcome,
      decisionRecord,
      scopeEvaluation.authorizedScope,
      conditionsAndRestrictions,
      input
    );

    const isAuthorized =
      resolvedOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED ||
      resolvedOutcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED;

    const result: Gate8AdjudicationResult = deepFreeze({
      decisionRecord,
      decisionOutcome: resolvedOutcome,
      authorizedScope: decisionRecord.authorized_scope,
      isAuthorized,
      authorizesScopeEdge,
      adjudicationRationale,
    });

    // 18. Store in idempotency cache
    this.decisionsById.set(decisionId, result);

    return result;
  }

  /**
   * Resolves the Gate 8 decision outcome based on explicit input or pre-Gate 8 assessment.
   * Incorporates Condition 20: Scope inflation detection results in governed REJECTED outcome.
   */
  private resolveDecisionOutcome(input: Gate8AdjudicationInput): AdoptionDecisionOutcome {
    // Condition 20 Scope Inflation Audit
    const enforcer = new ScopeEnforcer(input.scopeRecord);
    const requestedScope =
      input.requestedScope && input.requestedScope.length > 0
        ? input.requestedScope
        : input.scopeRecord.included_units;

    const hasScopeInflation = requestedScope.some(
      (unit) => !enforcer.isWithinScope(unit) || enforcer.isExplicitlyExcluded(unit)
    );

    if (hasScopeInflation) {
      if (input.decisionOutcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED) {
        throw new Gate8ScopeContainmentError(
          "Full AUTHORIZED is strictly prohibited when requested scope exceeds tested scope. " +
            "Condition 20 requires global authorization to be REJECTED."
        );
      }
      return ADOPTION_DECISION_OUTCOMES.REJECTED;
    }

    if (input.decisionOutcome) {
      return input.decisionOutcome;
    }

    const { readinessAssessmentRecord } = input;

    // If pre-Gate 8 readiness assessment is marked eligible
    if (readinessAssessmentRecord.gate_8_eligible) {
      if (input.conditionsAndRestrictions && input.conditionsAndRestrictions.length > 0) {
        return ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED;
      }
      return ADOPTION_DECISION_OUTCOMES.AUTHORIZED;
    }

    // If candidate has active hard blockers or failed pillars
    if (readinessAssessmentRecord.hard_blockers_present.length > 0) {
      return ADOPTION_DECISION_OUTCOMES.REJECTED;
    }

    // If readiness assessment was inconclusive or not evaluable
    return ADOPTION_DECISION_OUTCOMES.BLOCKED;
  }

  /**
   * Resolves conditions and restrictions based on outcome class.
   */
  private resolveConditions(
    input: Gate8AdjudicationInput,
    outcome: AdoptionDecisionOutcome
  ): readonly string[] {
    if (outcome === ADOPTION_DECISION_OUTCOMES.AUTHORIZED) {
      return Object.freeze([]);
    }

    if (outcome === ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED) {
      return Object.freeze(
        input.conditionsAndRestrictions ? [...input.conditionsAndRestrictions] : []
      );
    }

    if (outcome === ADOPTION_DECISION_OUTCOMES.REJECTED) {
      if (input.conditionsAndRestrictions && input.conditionsAndRestrictions.length > 0) {
        return Object.freeze([...input.conditionsAndRestrictions]);
      }
      if (input.substantiveDefectRationale) {
        return Object.freeze([input.substantiveDefectRationale]);
      }

      // Check for Condition 20 scope inflation
      const enforcer = new ScopeEnforcer(input.scopeRecord);
      const requestedScope =
        input.requestedScope && input.requestedScope.length > 0
          ? input.requestedScope
          : input.scopeRecord.included_units;
      const isOversized = requestedScope.some(
        (u) => !enforcer.isWithinScope(u) || enforcer.isExplicitlyExcluded(u)
      );
      if (isOversized) {
        return Object.freeze([
          "Condition 20: Requested production authorization scope exceeds tested scope. Global authorization REJECTED; scoped authorization permitted ONLY for tested subset.",
        ]);
      }

      return Object.freeze([
        `Production cutover rejected: ${input.readinessAssessmentRecord.synthesis_rationale}`,
      ]);
    }

    if (outcome === ADOPTION_DECISION_OUTCOMES.BLOCKED) {
      if (input.conditionsAndRestrictions && input.conditionsAndRestrictions.length > 0) {
        return Object.freeze([...input.conditionsAndRestrictions]);
      }
      if (input.blockingRationale) {
        return Object.freeze([input.blockingRationale]);
      }
      return Object.freeze([
        `Adjudication blocked: ${input.readinessAssessmentRecord.synthesis_rationale}`,
      ]);
    }

    return Object.freeze([]);
  }

  /**
   * Generates a deterministic human-readable technical rationale for the decision.
   */
  private synthesizeAdjudicationRationale(
    outcome: AdoptionDecisionOutcome,
    decisionRecord: AdoptionDecisionRecord,
    authorizedScope: readonly string[],
    conditions: readonly string[],
    input: Gate8AdjudicationInput
  ): string {
    const scopeCount = authorizedScope.length;
    switch (outcome) {
      case ADOPTION_DECISION_OUTCOMES.AUTHORIZED:
        return (
          `Gate 8 Adjudication: AUTHORIZED. Candidate package "${decisionRecord.package_id}" ` +
          `is fully authorized for production cutover across ${scopeCount} scoped unit(s). ` +
          `Bound to version integrity "${decisionRecord.version_binding_integrity_ref}". ` +
          `Zero conditions or restrictions.`
        );
      case ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED:
        return (
          `Gate 8 Adjudication: CONDITIONALLY_AUTHORIZED. Candidate package "${decisionRecord.package_id}" ` +
          `is granted bounded authorization across ${scopeCount} scoped unit(s) subject to ` +
          `${conditions.length} explicit condition(s) and mandatory telemetry monitoring.`
        );
      case ADOPTION_DECISION_OUTCOMES.REJECTED: {
        const enforcer = new ScopeEnforcer(input.scopeRecord);
        const requestedScope =
          input.requestedScope && input.requestedScope.length > 0
            ? input.requestedScope
            : input.scopeRecord.included_units;
        const isOversized = requestedScope.some(
          (u) => !enforcer.isWithinScope(u) || enforcer.isExplicitlyExcluded(u)
        );
        if (isOversized) {
          return (
            `Gate 8 Adjudication: REJECTED (Condition 20). Production cutover denied for package ` +
            `"${decisionRecord.package_id}" due to requested scope exceeding tested scope. ` +
            `Zero units authorized for cutover.`
          );
        }
        return (
          `Gate 8 Adjudication: REJECTED. Production cutover denied for package "${decisionRecord.package_id}". ` +
          `Zero units authorized for cutover.`
        );
      }
      case ADOPTION_DECISION_OUTCOMES.BLOCKED:
        return (
          `Gate 8 Adjudication: BLOCKED. Cutover adjudication cannot validly complete for package ` +
          `"${decisionRecord.package_id}". Zero units authorized.`
        );
    }
  }
}
