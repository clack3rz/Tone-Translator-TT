// src/tests/gate8AdjudicationEngine.test.ts
// Comprehensive focused verification suite for Phase 1C.5h WP-22:
// Gate 8 Production Cutover Adjudication & Scoped Authorization (Record 21).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 18, Condition 20, and Build Plan v0.1h WP-22.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  ADOPTION_DECISION_OUTCOMES,
  GOVERNANCE_STATUSES,
  PILLAR_READINESS_STATUSES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  InvalidEndpointError,
} from "../sound-engineer/validation/graph/edgeTypes";
import {
  AdoptionDecisionRecord,
  adoptionDecisionRecordSchema,
  ProductionReadinessAssessmentRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../sound-engineer/validation/binding";
import {
  Gate8AdjudicationEngine,
  Gate8AdjudicationInput,
  Gate8PrerequisiteError,
  Gate8ScopeContainmentError,
  UnauthorizedSignerError,
  InvalidRollbackReferenceError,
  InvalidVersionBindingError,
  StaleReadinessAssessmentError,
  InvalidAdoptionDecisionRecordError,
  InvalidDecisionOutcomeError,
  ConditionalAuthorizationConstraintError,
  verifyAdoptionDecisionIntegrity,
  validateAuthorizingOfficial,
  deriveDeterministicDecisionId,
  isDecisionAuthorized,
  AuthorityKeyRegistry,
  DEFAULT_GATE8_AUTHORITIES,
  DEFAULT_GATE8_AUTHORITY_REGISTRY,
  KeyedAuthorityIntegrityProvider,
} from "../sound-engineer/validation/gate8";
import { DefaultSha256IntegrityProvider } from "../sound-engineer/validation/storage/ledgerTypes";

// ---------------------------------------------------------------------------
// Standard Test Fixtures & Factories
// ---------------------------------------------------------------------------

function createTestScope(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return {
    scope_id: "scope_lead_5150_v1",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
    ...overrides,
  };
}

function createValidBinding(scopeId: string = "scope_lead_5150_v1"): ValidationVersionBindingRecord {
  const archProvider = new StaticArchitectureIntegrityReferenceProvider(
    TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  );
  const bindingService = new VersionBindingService(
    undefined,
    undefined,
    undefined,
    archProvider
  );
  const dummyScope = createTestScope({ scope_id: scopeId });
  return bindingService.bindVersions(dummyScope, {
    runtime_implementation_version: "2.1.0-alpha",
    model_configuration_version: "1.0.4",
    deterministic_rules_version: "3.2.1",
    gear_catalog_version: "2026.1",
    platform_exporter_version: "1.4.0",
    fixture_library_version: "3.0.0",
    target_platform_runtime_version: "AmpliTube5_v5.10",
    host_environment_version: "Node_v20.18.0",
    architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  });
}

function createTestPackage(overrides?: Partial<ValidationPackage>): ValidationPackage {
  return {
    package_id: "pkg_2026_q4_lead_01",
    intake_id: "intake_2026_01",
    scope_record_ref: "scope_lead_5150_v1",
    version_binding_ref: "binding_001",
    assigned_test_profiles: ["profile_01_dry_stem_fidelity"],
    validation_case_refs: ["case_objective_01"],
    execution_record_refs: ["exec_01"],
    evidence_refs: ["obj_01"],
    ...overrides,
  };
}

function createEligibleReadinessAssessment(
  overrides?: Partial<ProductionReadinessAssessmentRecord>
): ProductionReadinessAssessmentRecord {
  return {
    readiness_assessment_id: "pra_eligible_001",
    package_id: "pkg_2026_q4_lead_01",
    pillar_evaluations: {
      acoustic_musical_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      reasoning_governance_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      platform_operational_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      rollback_safety_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
    },
    hard_blockers_present: [],
    gate_8_eligible: true,
    synthesis_rationale: "All four readiness pillars SATISFIED. Zero hard blockers present.",
    assessment_timestamp: "2026-10-18T12:00:00.000Z",
    ...overrides,
  };
}

function createIneligibleReadinessAssessment(
  hardBlockers: string[] = ["BLOCKER-01: Unresolved material genuine regression"],
  overrides?: Partial<ProductionReadinessAssessmentRecord>
): ProductionReadinessAssessmentRecord {
  return {
    readiness_assessment_id: "pra_ineligible_001",
    package_id: "pkg_2026_q4_lead_01",
    pillar_evaluations: {
      acoustic_musical_readiness: PILLAR_READINESS_STATUSES.DEFICIENT,
      reasoning_governance_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      platform_operational_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      rollback_safety_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
    },
    hard_blockers_present: hardBlockers,
    gate_8_eligible: false,
    synthesis_rationale: `Disqualified: ${hardBlockers.join("; ")}`,
    assessment_timestamp: "2026-10-18T12:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Focused Test Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h WP-22: Gate 8 Production Cutover Adjudication Engine", () => {
  const AUTHORIZED_OFFICIAL = "Chief Sound Engineering Governance Authority";
  const AUTHORIZED_KEY = DEFAULT_GATE8_AUTHORITIES[0].keyOrSecret;

  // 1 & 2: Exact Record 21 Schema Accepted & Extra Fields Rejected
  it("01 & 02: accepts exact Record 21 schema and strictly rejects extra/invented fields", () => {
    const validRaw = {
      decision_id: "adr_test_01",
      package_id: "pkg_2026_q4_lead_01",
      readiness_assessment_id: "pra_eligible_001",
      requested_scope: ["guitar:amp:5150_lead"],
      authorized_scope: ["guitar:amp:5150_lead"],
      version_binding_integrity_ref: "digest_1234567890abcdef",
      decision_outcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      decision_timestamp: "2026-10-18T12:00:00.000Z",
      conditions_and_restrictions: [],
      mandatory_monitoring_rules: ["Rule: 0.1% THD limit"],
      rollback_verification_cert_ref: "cert_rollback_verified_001",
      governance_status: GOVERNANCE_STATUSES.ACTIVE,
      authorizing_official: AUTHORIZED_OFFICIAL,
      record_integrity_metadata: {
        integrity_digest: "seal_digest_001",
        algorithm: "HMAC-SHA256",
        sealed_at: "2026-10-18T12:00:00.000Z",
        signer_identity: AUTHORIZED_OFFICIAL,
        canonical_serialization_format: "RFC-8785",
      },
    };

    const parsed = adoptionDecisionRecordSchema.parse(validRaw);
    assert.equal(parsed.decision_id, "adr_test_01");
    assert.equal(parsed.decision_outcome, "AUTHORIZED");

    // Rejected extra fields: cutover_executed, deployment_status, adoption_complete, rollback_executed, gate8_change
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...validRaw, cutover_executed: true });
    }, ZodError);
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...validRaw, deployment_status: "DEPLOYED" });
    }, ZodError);
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...validRaw, adoption_complete: true });
    }, ZodError);
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...validRaw, rollback_executed: false });
    }, ZodError);
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...validRaw, gate8_change: {} });
    }, ZodError);
  });

  // 3 & 4: Exact Four Decision Outcomes Accepted & Invalid Outcomes Rejected
  it("03 & 04: accepts exactly the four governed decision outcomes and rejects invalid outcomes", () => {
    const validOutcomes = ["AUTHORIZED", "CONDITIONALLY_AUTHORIZED", "REJECTED", "BLOCKED"];
    for (const outcome of validOutcomes) {
      assert.ok(outcome in ADOPTION_DECISION_OUTCOMES);
    }

    const invalidOutcomes = ["APPROVED", "DENIED", "PENDING", "NOT_EVALUABLE", "FAILED"];
    for (const invalid of invalidOutcomes) {
      assert.throws(() => {
        adoptionDecisionRecordSchema.parse({
          decision_id: "adr_bad",
          package_id: "pkg_1",
          readiness_assessment_id: "pra_1",
          requested_scope: ["amp:1"],
          authorized_scope: ["amp:1"],
          version_binding_integrity_ref: "ref_1",
          decision_outcome: invalid as any,
          decision_timestamp: "2026-10-18T12:00:00.000Z",
          conditions_and_restrictions: [],
          mandatory_monitoring_rules: [],
          rollback_verification_cert_ref: "cert_1",
          governance_status: GOVERNANCE_STATUSES.ACTIVE,
          authorizing_official: AUTHORIZED_OFFICIAL,
          record_integrity_metadata: {
            integrity_digest: "d",
            algorithm: "HMAC-SHA256",
            sealed_at: "2026-10-18T12:00:00.000Z",
          },
        });
      }, ZodError);
    }
  });

  // 5 & 6: Governance Status Vocabulary & Separation from Decision Outcome
  it("05 & 06: preserves exact governance-status vocabulary and maintains independent axes", () => {
    const validStatuses = ["ACTIVE", "SUSPENDED", "RESTRICTED", "WITHDRAWN", "SUPERSEDED"];
    for (const status of validStatuses) {
      assert.ok(status in GOVERNANCE_STATUSES);
    }

    // Cross-conflation prohibited: cannot put status in outcome, nor outcome in status
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({
        decision_id: "adr_bad",
        package_id: "pkg_1",
        readiness_assessment_id: "pra_1",
        requested_scope: ["amp:1"],
        authorized_scope: ["amp:1"],
        version_binding_integrity_ref: "ref_1",
        decision_outcome: "WITHDRAWN" as any,
        decision_timestamp: "2026-10-18T12:00:00.000Z",
        conditions_and_restrictions: [],
        mandatory_monitoring_rules: [],
        rollback_verification_cert_ref: "cert_1",
        governance_status: GOVERNANCE_STATUSES.ACTIVE,
        authorizing_official: AUTHORIZED_OFFICIAL,
        record_integrity_metadata: {
          integrity_digest: "d",
          algorithm: "HMAC-SHA256",
          sealed_at: "2026-10-18T12:00:00.000Z",
        },
      });
    }, ZodError);

    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({
        decision_id: "adr_bad",
        package_id: "pkg_1",
        readiness_assessment_id: "pra_1",
        requested_scope: ["amp:1"],
        authorized_scope: ["amp:1"],
        version_binding_integrity_ref: "ref_1",
        decision_outcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
        decision_timestamp: "2026-10-18T12:00:00.000Z",
        conditions_and_restrictions: [],
        mandatory_monitoring_rules: [],
        rollback_verification_cert_ref: "cert_1",
        governance_status: "AUTHORIZED" as any,
        authorizing_official: AUTHORIZED_OFFICIAL,
        record_integrity_metadata: {
          integrity_digest: "d",
          algorithm: "HMAC-SHA256",
          sealed_at: "2026-10-18T12:00:00.000Z",
        },
      });
    }, ZodError);
  });

  // 7, 8, 9, 10, 11, 12, 13: Full AUTHORIZED Prerequisites & Empty Conditions
  it("07 to 13: fully valid eligible candidate produces AUTHORIZED with 4/4 SATISFIED, 0 blockers, verified rollback, valid version binding, authorized signer, and empty conditions", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const graph = new ValidationRelationshipGraph();
    const auditLedger = new ValidationAuditLedger();

    graph.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });

    const engine = new Gate8AdjudicationEngine({ graph, auditLedger });
    const result = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_verified_pass_001",
      timestamp: "2026-10-18T14:00:00.000Z",
    });

    assert.equal(result.decisionOutcome, "AUTHORIZED");
    assert.equal(result.isAuthorized, true);
    assert.equal(result.decisionRecord.governance_status, "ACTIVE");
    assert.deepEqual(result.decisionRecord.conditions_and_restrictions, []);
    assert.deepEqual(result.authorizedScope, scope.included_units);
    assert.equal(result.decisionRecord.version_binding_integrity_ref, binding.version_integrity_reference.composite_digest);
    assert.equal(result.decisionRecord.rollback_verification_cert_ref, "cert_rollback_verified_pass_001");
    assert.ok(result.authorizesScopeEdge);
    assert.equal(result.authorizesScopeEdge?.edgeType, GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE);

    // 8: Requires 4/4 SATISFIED
    const deficientReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      pillar_evaluations: {
        ...readiness.pillar_evaluations,
        acoustic_musical_readiness: PILLAR_READINESS_STATUSES.DEFICIENT,
      },
    });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: deficientReadiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, Gate8PrerequisiteError);

    // 9: Requires 0 hard blockers
    const blockerReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      hard_blockers_present: ["BLOCKER-01: Regression"],
    });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: blockerReadiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, Gate8PrerequisiteError);

    // 10: Requires verified rollback reference
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, InvalidRollbackReferenceError);

    // 11: Requires valid version binding
    const tamperedBinding = {
      ...binding,
      gear_catalog_version: "2026.1_tampered",
    };
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: tamperedBinding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, InvalidVersionBindingError);

    // 12: Requires authorized signer
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: "unauthorized_intern_user",
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, UnauthorizedSignerError);

    // 13: Conditions must be empty for AUTHORIZED
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
        conditionsAndRestrictions: ["Condition: only opt-in internal users"],
      });
    }, ConditionalAuthorizationConstraintError);
  });

  // 14 to 18 & Condition 20: Scope Inflation Protection & Governed REJECTED Semantics
  it("14 to 18: Frozen Condition 20 - oversized petition produces governed REJECTED with authorized_scope=[], and separately tested subset authorizes", () => {
    const scope = createTestScope({
      included_units: ["guitar:amp:5150_lead"],
      excluded_units: ["bass:amp:svt_classic"],
    });
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const graph = new ValidationRelationshipGraph();
    graph.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
    const engine = new Gate8AdjudicationEngine({ graph });

    // Condition 20: Valid Gate 8 petition requesting more than tested scope
    // This is an evaluable decision, NOT a crash/throw.
    const oversizedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
      requestedScope: ["guitar:amp:5150_lead", "untested_amp_plexi"], // Oversized!
    });

    assert.equal(oversizedResult.decisionOutcome, "REJECTED");
    assert.equal(oversizedResult.isAuthorized, false);
    assert.deepEqual(oversizedResult.authorizedScope, []);
    assert.equal(oversizedResult.authorizesScopeEdge, undefined); // No AUTHORIZES_SCOPE edge!
    assert.ok(oversizedResult.decisionRecord.conditions_and_restrictions.some((c) => c.includes("Condition 20")));
    assert.equal(isDecisionAuthorized(oversizedResult.decisionRecord), false);

    // But if someone explicitly claims full AUTHORIZED for an oversized scope: throws Gate8ScopeContainmentError
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        requestedScope: ["guitar:amp:5150_lead", "untested_amp_plexi"],
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      });
    }, Gate8ScopeContainmentError);

    // Separately submitted valid petition requesting tested subset succeeds!
    const validSubsetResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
      requestedScope: ["guitar:amp:5150_lead"], // Exact tested unit
      decisionId: "adr_tested_subset_01",
    });

    assert.equal(validSubsetResult.decisionOutcome, "AUTHORIZED");
    assert.equal(validSubsetResult.isAuthorized, true);
    assert.deepEqual(validSubsetResult.authorizedScope, ["guitar:amp:5150_lead"]);
    assert.ok(validSubsetResult.authorizesScopeEdge);

    // Authorized scope cannot exceed requested scope
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        requestedScope: ["guitar:amp:5150_lead"],
        proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: ["Condition 1"],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, Gate8ScopeContainmentError);

    // Excluded unit cannot be authorized
    const excludedPetitionResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
      requestedScope: ["bass:amp:svt_classic"],
      decisionId: "adr_excluded_petition_01",
    });
    assert.equal(excludedPetitionResult.decisionOutcome, "REJECTED");
    assert.deepEqual(excludedPetitionResult.authorizedScope, []);
  });

  // 19 to 26: CONDITIONALLY_AUTHORIZED Constraints, Invariants, and Scope Narrowing
  it("19 to 26: supports CONDITIONALLY_AUTHORIZED, cannot waive blockers/rollback/uncertainty, requires non-empty constraints, and narrows scope", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const graph = new ValidationRelationshipGraph();
    graph.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });

    const engine = new Gate8AdjudicationEngine({ graph });

    // 19, 24, 25, 26: Valid conditional authorization narrowing scope
    const conditionalResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_001",
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"], // Narrowed scope
      conditionsAndRestrictions: ["Restriction: Internal staging only, max 50 concurrent sessions"],
      mandatoryMonitoringRules: ["Rule: Alert if DSP buffer latency > 12ms"],
    });

    assert.equal(conditionalResult.decisionOutcome, "CONDITIONALLY_AUTHORIZED");
    assert.equal(conditionalResult.isAuthorized, true);
    assert.deepEqual(conditionalResult.authorizedScope, ["guitar:amp:5150_lead"]);
    assert.equal(conditionalResult.decisionRecord.governance_status, "ACTIVE"); // Note: not auto-mapped to RESTRICTED
    assert.equal(conditionalResult.decisionRecord.conditions_and_restrictions.length, 1);
    assert.equal(conditionalResult.decisionRecord.mandatory_monitoring_rules.length, 1);
    assert.ok(conditionalResult.authorizesScopeEdge);

    // 20: Cannot waive a hard blocker
    const blockerReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      hard_blockers_present: ["BLOCKER-01: Unresolved material genuine regression"],
    });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: blockerReadiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: ["Condition: Waive regression"],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, ConditionalAuthorizationConstraintError);

    // 21: Cannot waive failed rollback
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackEvidence: {
          rollback_verified: false,
          failure_reason: "Automated failover exceeded 500ms RTO",
        },
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: ["Condition: rollback retry allowed"],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, InvalidRollbackReferenceError);

    // 22: Cannot waive broken provenance (provenance hard blocker)
    const provenanceBlockerReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      hard_blockers_present: ["BLOCKER-04: Missing, broken, or unverifiable Phase 1C.5f provenance"],
    });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: provenanceBlockerReadiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: ["Condition 1"],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, ConditionalAuthorizationConstraintError);

    // 23: Cannot waive critical uncertainty
    const uncertaintyBlockerReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      hard_blockers_present: ["BLOCKER-07: Unresolved critical uncertainty regarding production tone safety"],
    });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: uncertaintyBlockerReadiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: ["Condition 1"],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, ConditionalAuthorizationConstraintError);

    // 24: Requires explicit non-empty restrictions
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
        conditionsAndRestrictions: [],
        mandatoryMonitoringRules: ["Rule 1"],
      });
    }, ConditionalAuthorizationConstraintError);
  });

  // 27, 28, 29: Substantive Defect yields REJECTED; Corrupt/Missing Prerequisite yields BLOCKED; Semantically Distinct
  it("27 to 29: verified substantive defect yields REJECTED, non-evaluable prerequisite yields BLOCKED, and both remain semantically distinct", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const graph = new ValidationRelationshipGraph();
    graph.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });

    const engine = new Gate8AdjudicationEngine({ graph });

    // 27: Verified substantive defect -> REJECTED
    const rejectedReadiness = createIneligibleReadinessAssessment([
      "BLOCKER-01: Unresolved material genuine regression",
    ], { package_id: pkg.package_id });

    const rejectedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: rejectedReadiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.REJECTED,
      substantiveDefectRationale: "Verified -4.2dB mid-frequency acoustic hole violates Rule 12",
      rollbackVerificationCertRef: "cert_rollback_001",
    });

    assert.equal(rejectedResult.decisionOutcome, "REJECTED");
    assert.equal(rejectedResult.isAuthorized, false);
    assert.deepEqual(rejectedResult.authorizedScope, []);
    assert.equal(rejectedResult.authorizesScopeEdge, undefined); // No AUTHORIZES_SCOPE edge!

    // 28: Non-evaluable prerequisite / environment breakdown -> BLOCKED
    const blockedReadiness: ProductionReadinessAssessmentRecord = {
      readiness_assessment_id: "pra_blocked_001",
      package_id: pkg.package_id,
      pillar_evaluations: {
        acoustic_musical_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        reasoning_governance_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        platform_operational_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        rollback_safety_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
      },
      hard_blockers_present: [],
      gate_8_eligible: false,
      synthesis_rationale: "Validation test harness crashed; fixtures unreadable.",
      assessment_timestamp: "2026-10-18T12:00:00.000Z",
    };

    const blockedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: blockedReadiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.BLOCKED,
      blockingRationale: "Fixture infrastructure offline; evaluation cannot complete.",
      rollbackVerificationCertRef: "cert_rollback_001",
    });

    assert.equal(blockedResult.decisionOutcome, "BLOCKED");
    assert.equal(blockedResult.isAuthorized, false);
    assert.deepEqual(blockedResult.authorizedScope, []);
    assert.equal(blockedResult.authorizesScopeEdge, undefined);

    // 29: Distinct semantic rationales
    assert.notEqual(rejectedResult.adjudicationRationale, blockedResult.adjudicationRationale);
    assert.ok(rejectedResult.adjudicationRationale.includes("REJECTED"));
    assert.ok(blockedResult.adjudicationRationale.includes("BLOCKED"));
  });

  // 30, 31, 32, 33, 34: Stale/Mismatched Records & Tampered Version Integrity Fail Closed
  it("30 to 34: fails closed on stale readiness, mismatched package, mismatched version binding, tampered version integrity, or unauthorized official", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const graph = new ValidationRelationshipGraph();
    const engine = new Gate8AdjudicationEngine({ graph });

    // 30: Stale governing ValidationOutcomeRecord in graph fails closed
    const outcome: ValidationOutcomeRecord = {
      outcome_id: "outcome_valid_001",
      package_id: pkg.package_id,
      outcome_class: "PASS" as any,
      evaluated_scope: "lead_channel",
      version_binding: binding.binding_id,
      summary_verdict: "Pass verdict",
      objective_summary: {},
      perceptual_summary: {},
      uat_summary: {},
      regression_summary: {},
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-10-18T10:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:outcome_seal",
        algorithm: "SHA-256",
        sealed_at: "2026-10-18T10:00:00Z",
      },
    };
    graph.registerNode({ id: outcome.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord });
    graph.registerNode({ id: "trig_001", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: { id: outcome.outcome_id, kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
      target: { id: "trig_001", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
    });

    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        validationOutcomeRecord: outcome,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
        graph,
      });
    }, StaleReadinessAssessmentError);

    // 31: Mismatched package/readiness pair
    const otherPkg = createTestPackage({ package_id: "pkg_different_123" });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: otherPkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
      });
    }, StaleReadinessAssessmentError);

    // 32: Mismatched scope in version binding
    const otherScope = createTestScope({ scope_id: "scope_different_999" });
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: otherScope,
        versionBindingRecord: binding, // bound to scope_lead_5150_v1
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
      });
    }, InvalidVersionBindingError);

    // 33: Tampered version integrity fails closed
    const tamperedBinding: ValidationVersionBindingRecord = {
      ...binding,
      runtime_implementation_version: "2.1.0-tampered",
    };
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: tamperedBinding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_001",
      });
    }, InvalidVersionBindingError);

    // 34: Unauthorized official
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: "",
        rollbackVerificationCertRef: "cert_001",
      });
    }, UnauthorizedSignerError);
  });

  // 35 & 36: CRITICAL Cryptographic Authenticity, Valid Authority, Forgery Detection, Tampering Detection
  it("35 & 36: cryptographic authorization authenticity: valid key succeeds, unknown official fails, forged key fails, tampered payload/official fails", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const engine = new Gate8AdjudicationEngine();

    // 1. Valid authority + valid cryptographic proof -> succeeds
    const result = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
    });

    assert.equal(result.decisionRecord.record_integrity_metadata.algorithm, "HMAC-SHA256");
    const isAuthentic = verifyAdoptionDecisionIntegrity(result.decisionRecord);
    assert.equal(isAuthentic, true);

    // 2. Unknown/unregistered authority -> fails closed
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: "External Unknown Auditor",
        authorizingOfficialKey: "some_random_key",
        rollbackVerificationCertRef: "cert_001",
      });
    }, UnauthorizedSignerError);

    // 3. Forged identity: names valid authority but key belongs to someone else -> fails closed
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: readiness,
        scopeRecord: scope,
        versionBindingRecord: binding,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: "forged_malicious_key_12345", // Forged!
        rollbackVerificationCertRef: "cert_001",
      });
    }, UnauthorizedSignerError);

    // 4. Forged record with valid authority text but signed with forged key presented to verifier -> fails authenticity
    const forgedProvider = new KeyedAuthorityIntegrityProvider("forged_external_key");
    const forgedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
      integrityProvider: forgedProvider,
      decisionId: "adr_forged_sig_test",
    });
    // Verifying against the trusted authority registry detects the signature was forged
    assert.equal(verifyAdoptionDecisionIntegrity(forgedResult.decisionRecord), false);

    // 5. Tampered payload -> signature/integrity fails
    const tamperedPayloadRecord: AdoptionDecisionRecord = {
      ...result.decisionRecord,
      decision_outcome: ADOPTION_DECISION_OUTCOMES.REJECTED,
    };
    assert.equal(verifyAdoptionDecisionIntegrity(tamperedPayloadRecord), false);

    // 6. Tampered authorizing_official -> fails authenticity
    const tamperedOfficialRecord: AdoptionDecisionRecord = {
      ...result.decisionRecord,
      authorizing_official: "Lead Acoustic Architect",
    };
    assert.equal(verifyAdoptionDecisionIntegrity(tamperedOfficialRecord), false);
  });

  // 37, 38, 39, 40, 41, 42: Exact AUTHORIZES_SCOPE Edge Direction, Endpoints, and Non-Authorization Safeguards
  it("37 to 42: enforces exact AUTHORIZES_SCOPE direction, rejects reverse/invalid endpoints, maintains 14 edges, and ensures non-authorizations do not attach edges", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const graph = new ValidationRelationshipGraph();

    graph.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
    graph.registerNode({ id: "adr_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });

    // 37: Exact direction: AdoptionDecisionRecord -> ValidationScopeRecord
    const edge = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
      source: { id: "adr_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
      target: { id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord },
    });
    assert.equal(edge.edgeType, "AUTHORIZES_SCOPE");

    // 38: Reverse edge MUST fail
    assert.throws(() => {
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
        source: { id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord },
        target: { id: "adr_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
      });
    }, InvalidEndpointError);

    // 39: Invalid endpoints
    graph.registerNode({ id: "pkg_01", kind: GOVERNED_ENTITY_KINDS.ValidationPackage });
    assert.throws(() => {
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.AUTHORIZES_SCOPE,
        source: { id: "adr_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
        target: { id: "pkg_01", kind: GOVERNED_ENTITY_KINDS.ValidationPackage },
      });
    }, InvalidEndpointError);

    // 40: Relationship catalogue remains exactly 14 edge types
    assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);

    // 42: Negative decisions (REJECTED/BLOCKED) do not register AUTHORIZES_SCOPE
    const graph2 = new ValidationRelationshipGraph();
    graph2.registerNode({ id: scope.scope_id, kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord });
    const engine = new Gate8AdjudicationEngine({ graph: graph2 });

    const ineligibleReadiness = createIneligibleReadinessAssessment();
    const rejectedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: ineligibleReadiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_001",
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.REJECTED,
    });

    assert.equal(rejectedResult.authorizesScopeEdge, undefined);
    const scopeEdges = graph2
      .getEdges()
      .filter((e) => e.source.id === rejectedResult.decisionRecord.decision_id);
    assert.equal(scopeEdges.length, 0);
  });

  // 43, 44, 45, 46: Deep Immutability, Append-Only Ledger, Idempotency & Distinct Decisions
  it("43 to 46: guarantees deep immutability, append-only ledger storage, idempotency, and distinct decisions for changed inputs", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const readiness = createEligibleReadinessAssessment({ package_id: pkg.package_id });
    const ledger = new ValidationAuditLedger();
    const engine = new Gate8AdjudicationEngine({ auditLedger: ledger });

    const input: Gate8AdjudicationInput = {
      packageRecord: pkg,
      readinessAssessmentRecord: readiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_001",
      timestamp: "2026-10-18T15:00:00.000Z",
    };

    // 43: Deep immutability
    const result1 = engine.adjudicateCutover(input);
    assert.ok(Object.isFrozen(result1.decisionRecord));
    assert.ok(Object.isFrozen(result1.decisionRecord.authorized_scope));
    assert.ok(Object.isFrozen(result1.decisionRecord.requested_scope));
    assert.throws(() => {
      (result1.decisionRecord as any).decision_outcome = "REJECTED";
    }, TypeError);

    // 44 & 45: Append-only and idempotency
    const initialLedgerCount = ledger.getEntries().length;
    assert.equal(initialLedgerCount, 1);

    // Duplicate call returns identical cached result and does not duplicate ledger entry
    const result2 = engine.adjudicateCutover(input);
    assert.equal(result1.decisionRecord.decision_id, result2.decisionRecord.decision_id);
    assert.equal(ledger.getEntries().length, 1);

    // 46: Changed material input yields distinct decision
    const inputDifferentTimestamp: Gate8AdjudicationInput = {
      ...input,
      timestamp: "2026-10-18T15:05:00.000Z",
    };
    const result3 = engine.adjudicateCutover(inputDifferentTimestamp);
    assert.notEqual(result1.decisionRecord.decision_id, result3.decisionRecord.decision_id);
    assert.equal(ledger.getEntries().length, 2);
  });

  // 47 to 56: Boundary Guarantees: No Positive Authority from ACTIVE Alone, No Record 22, Zero Execution
  it("47 to 56: proves ACTIVE alone never conveys authority, handoff is certificate only, zero cutover/traffic/telemetry/rollback, zero Record 22", () => {
    const scope = createTestScope();
    const binding = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });
    const ineligibleReadiness = createIneligibleReadinessAssessment();
    const ledger = new ValidationAuditLedger();
    const graph = new ValidationRelationshipGraph();
    const engine = new Gate8AdjudicationEngine({ auditLedger: ledger, graph });

    // REJECTED with governance_status: ACTIVE
    const rejectedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: ineligibleReadiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_001",
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.REJECTED,
    });

    assert.equal(rejectedResult.decisionRecord.governance_status, "ACTIVE");
    assert.equal(rejectedResult.decisionRecord.decision_outcome, "REJECTED");
    // Proof that ACTIVE alone conveys zero authority:
    assert.equal(isDecisionAuthorized(rejectedResult.decisionRecord), false);
    assert.deepEqual(rejectedResult.authorizedScope, []);
    assert.equal(rejectedResult.authorizesScopeEdge, undefined);

    // BLOCKED with governance_status: ACTIVE
    const blockedReadiness: ProductionReadinessAssessmentRecord = {
      readiness_assessment_id: "pra_blocked_002",
      package_id: pkg.package_id,
      pillar_evaluations: {
        acoustic_musical_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        reasoning_governance_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        platform_operational_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
        rollback_safety_readiness: PILLAR_READINESS_STATUSES.INCONCLUSIVE,
      },
      hard_blockers_present: [],
      gate_8_eligible: false,
      synthesis_rationale: "Handoff integrity broken.",
      assessment_timestamp: "2026-10-18T12:00:00.000Z",
    };

    const blockedResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: blockedReadiness,
      scopeRecord: scope,
      versionBindingRecord: binding,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_001",
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.BLOCKED,
    });

    assert.equal(blockedResult.decisionRecord.governance_status, "ACTIVE");
    assert.equal(blockedResult.decisionRecord.decision_outcome, "BLOCKED");
    assert.equal(isDecisionAuthorized(blockedResult.decisionRecord), false);
    assert.deepEqual(blockedResult.authorizedScope, []);
    assert.equal(blockedResult.authorizesScopeEdge, undefined);

    // 47 & 48: No Record 22 (Gate8ChangeRecord) created; no governance transitions executed
    const ledgerEntries = ledger.getEntries();
    for (const entry of ledgerEntries) {
      assert.notEqual(entry.entityKind, "Gate8ChangeRecord");
    }

    // 49 & 50: No production cutover executed; no PATH-PROD mutation
    assert.equal((rejectedResult.decisionRecord as any).cutover_executed, undefined);
    assert.equal((rejectedResult.decisionRecord as any).path_prod_mutated, undefined);

    // 51: No telemetry started
    assert.equal((rejectedResult.decisionRecord as any).telemetry_started, undefined);

    // 52: No rollback executed
    assert.equal((rejectedResult.decisionRecord as any).rollback_executed, undefined);
  });

  // -------------------------------------------------------------------------
  // 13. Targeted Readiness-Freshness & Canonical INVALIDATED_BY Graph Verification
  // -------------------------------------------------------------------------
  it("57 to 62: Targeted Readiness-Freshness & Canonical INVALIDATED_BY Graph Verification", () => {
    const graph = new ValidationRelationshipGraph();
    const scope = createTestScope();
    const bindingV1 = createValidBinding(scope.scope_id);
    const pkg = createTestPackage({ scope_record_ref: scope.scope_id });

    // -----------------------------------------------------------------------
    // Part 1: Exact Canonical INVALIDATED_BY Contract Verification
    // -----------------------------------------------------------------------
    // Allowed sources: ValidationOutcomeRecord, AdoptionDecisionRecord
    // Allowed target: RevalidationTriggerRecord
    // Strictly rejects: ProductionReadinessAssessmentRecord, ObjectiveEvidenceRecord,
    //                   PerceptualEvaluationRecord, UATEvaluationRecord, RegressionAssessmentRecord,
    //                   Rollback evidence, and all reverse edges.
    graph.registerNode({ id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord });
    graph.registerNode({ id: "outcome_canonical_01", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord });
    graph.registerNode({ id: "decision_canonical_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord });

    // Legal 1: ValidationOutcomeRecord -> RevalidationTriggerRecord
    const legalEdge1 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: { id: "outcome_canonical_01", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
      target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
    });
    assert.equal(legalEdge1.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);

    // Legal 2: AdoptionDecisionRecord -> RevalidationTriggerRecord
    const legalEdge2 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: { id: "decision_canonical_01", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
      target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
    });
    assert.equal(legalEdge2.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);

    // Illegal A: ProductionReadinessAssessmentRecord -> RevalidationTriggerRecord MUST FAIL
    graph.registerNode({ id: "pra_illegal_01", kind: GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "pra_illegal_01", kind: GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord },
          target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      InvalidEndpointError
    );

    // Illegal B: ObjectiveEvidenceRecord -> RevalidationTriggerRecord MUST FAIL
    graph.registerNode({ id: "obj_illegal_01", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "obj_illegal_01", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      InvalidEndpointError
    );

    // Illegal C: PerceptualEvaluationRecord -> RevalidationTriggerRecord MUST FAIL
    graph.registerNode({ id: "perc_illegal_01", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "perc_illegal_01", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
          target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      InvalidEndpointError
    );

    // Illegal D: UATEvaluationRecord -> RevalidationTriggerRecord MUST FAIL
    graph.registerNode({ id: "uat_illegal_01", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "uat_illegal_01", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
          target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      InvalidEndpointError
    );

    // Illegal E: RegressionAssessmentRecord -> RevalidationTriggerRecord MUST FAIL
    graph.registerNode({ id: "reg_illegal_01", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord });
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "reg_illegal_01", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
          target: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        }),
      InvalidEndpointError
    );

    // Illegal F: Reverse direction: RevalidationTriggerRecord -> ValidationOutcomeRecord MUST FAIL
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
          source: { id: "trig_canonical_01", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          target: { id: "outcome_canonical_01", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        }),
      InvalidEndpointError
    );

    // -----------------------------------------------------------------------
    // Part 2: Historical Eligible Record 20 Scenario with Governed Revalidation
    // -----------------------------------------------------------------------
    // 1. Create a pristine, fully valid historical Record 20:
    //    - gate_8_eligible: true
    //    - All four pillars SATISFIED
    //    - Zero hard blockers
    const historicalReadiness = createEligibleReadinessAssessment({
      package_id: pkg.package_id,
      readiness_assessment_id: "pra_historical_clean_001",
    });
    assert.equal(historicalReadiness.gate_8_eligible, true);
    assert.equal(historicalReadiness.hard_blockers_present.length, 0);
    assert.equal(historicalReadiness.pillar_evaluations.acoustic_musical_readiness, "SATISFIED");
    assert.equal(historicalReadiness.pillar_evaluations.reasoning_governance_readiness, "SATISFIED");
    assert.equal(historicalReadiness.pillar_evaluations.platform_operational_readiness, "SATISFIED");
    assert.equal(historicalReadiness.pillar_evaluations.rollback_safety_readiness, "SATISFIED");

    // 2. Underlying governing ValidationOutcomeRecord initially active & valid
    const governingOutcome: ValidationOutcomeRecord = {
      outcome_id: "outcome_governing_v1",
      package_id: pkg.package_id,
      outcome_class: "PASS" as any,
      evaluated_scope: "guitar:amp:5150_lead",
      version_binding: bindingV1.binding_id,
      summary_verdict: "Prior comprehensive pass outcome",
      objective_summary: {},
      perceptual_summary: {},
      uat_summary: {},
      regression_summary: {},
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-10-18T08:00:00Z",
      record_integrity_metadata: {
        integrity_digest: "sha256:outcome_governing_v1_digest",
        algorithm: "SHA-256",
        sealed_at: "2026-10-18T08:00:00Z",
      },
    };

    const cleanGraph = new ValidationRelationshipGraph();
    cleanGraph.registerNode({
      id: governingOutcome.outcome_id,
      kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    });
    cleanGraph.registerNode({
      id: historicalReadiness.readiness_assessment_id,
      kind: GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
    });

    // Baseline: When governing outcome is current and not invalidated, Gate 8 succeeds
    const engine = new Gate8AdjudicationEngine({ graph: cleanGraph });
    const baselineResult = engine.adjudicateCutover({
      packageRecord: pkg,
      readinessAssessmentRecord: historicalReadiness,
      validationOutcomeRecord: governingOutcome,
      scopeRecord: scope,
      versionBindingRecord: bindingV1,
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      rollbackVerificationCertRef: "cert_rollback_001",
    });
    assert.equal(baselineResult.decisionOutcome, "AUTHORIZED");
    assert.equal(baselineResult.isAuthorized, true);

    // 3. Introduce a governed material change using ONLY legal revalidation mechanisms:
    //    A RevalidationTriggerRecord is created for knowledge inventory / DSP model update.
    //    The governing ValidationOutcomeRecord is linked via INVALIDATED_BY to the trigger.
    cleanGraph.registerNode({
      id: "trig_knowledge_update_09",
      kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
    });
    const canonicalInvalidationEdge = cleanGraph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: {
        id: governingOutcome.outcome_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
      },
      target: {
        id: "trig_knowledge_update_09",
        kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
      },
    });
    assert.equal(canonicalInvalidationEdge.edgeType, GOVERNED_EDGE_TYPES.INVALIDATED_BY);

    // Verify historical outcome record payload remains unchanged (PASS preserved)
    assert.equal(governingOutcome.outcome_class, "PASS");

    // 4. Now attempt Gate 8 adjudication with the historical eligible Record 20:
    //    Gate 8 MUST fail closed because governing outcome is invalidated in graph!
    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: historicalReadiness,
        validationOutcomeRecord: governingOutcome,
        scopeRecord: scope,
        versionBindingRecord: bindingV1,
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_rollback_001",
        graph: cleanGraph,
      });
    }, StaleReadinessAssessmentError);

    // 5. Version binding change scenario:
    //    If candidate is evaluated against a new version binding (e.g. bindingV2),
    //    the governing outcome bound to bindingV1 causes mismatch failure closed!
    const bindingService = new VersionBindingService(
      undefined,
      undefined,
      undefined,
      new StaticArchitectureIntegrityReferenceProvider(TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS)
    );
    const bindingV2 = bindingService.bindVersions(scope, {
      runtime_implementation_version: "2.2.0-beta",
      model_configuration_version: "1.0.4",
      deterministic_rules_version: "3.2.1",
      gear_catalog_version: "2026.1",
      platform_exporter_version: "1.4.0",
      fixture_library_version: "3.0.0",
      target_platform_runtime_version: "AmpliTube5_v5.10",
      host_environment_version: "Node_v20.18.0",
      architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
    });
    assert.notEqual(bindingV1.binding_id, bindingV2.binding_id);

    assert.throws(() => {
      engine.adjudicateCutover({
        packageRecord: pkg,
        readinessAssessmentRecord: historicalReadiness,
        validationOutcomeRecord: governingOutcome, // bound to bindingV1
        scopeRecord: scope,
        versionBindingRecord: bindingV2, // candidate is bindingV2
        authorizingOfficial: AUTHORIZED_OFFICIAL,
        authorizingOfficialKey: AUTHORIZED_KEY,
        rollbackVerificationCertRef: "cert_rollback_001",
      });
    }, StaleReadinessAssessmentError);

    // 6. Verify that NO illegal INVALIDATED_BY edge from Record 20 was ever created:
    const allGraphEdges = cleanGraph.getEdges();
    for (const edge of allGraphEdges) {
      if (edge.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY) {
        assert.notEqual(
          edge.source.kind,
          GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
          "Record 20 must NEVER be the source of an INVALIDATED_BY edge"
        );
        assert.notEqual(
          edge.target.kind,
          GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord,
          "Record 20 must NEVER be the target of an INVALIDATED_BY edge"
        );
      }
    }
  });
});

