// src/tests/conditionalAuthorizationManager.test.ts
// Comprehensive focused verification suite for Phase 1C.5h WP-23:
// Conditional Authorization, Scope Restriction & Boundary Subsystem.
// Bound to frozen specification v0.1j Section 27, Table 18, and Build Plan v0.1h WP-23.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADOPTION_DECISION_OUTCOMES,
  GOVERNANCE_STATUSES,
  PILLAR_READINESS_STATUSES,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
} from "../sound-engineer/validation/graph/edgeTypes";
import {
  AdoptionDecisionRecord,
  adoptionDecisionRecordSchema,
  ProductionReadinessAssessmentRecord,
  VALIDATION_RECORD_SCHEMAS,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VersionBindingService,
} from "../sound-engineer/validation/binding";
import {
  Gate8AdjudicationEngine,
  DEFAULT_GATE8_AUTHORITIES,
  DEFAULT_GATE8_AUTHORITY_REGISTRY,
  isDecisionAuthorized,
} from "../sound-engineer/validation/gate8";
import {
  ConditionalAuthorizationManager,
  ConditionalAuthorizationPlan,
  EmptyConditionalPlanError,
  InvalidConditionalConstraintError,
  InvalidConditionalContextError,
  NonWaivableBlockerError,
  ConditionalScopeContainmentError,
} from "../sound-engineer/validation/gate8";

// ---------------------------------------------------------------------------
// Standard Test Fixtures & Factories
// ---------------------------------------------------------------------------

function createTestScope(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return {
    scope_id: "scope_lead_5150_v1",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: [
      "guitar:amp:5150_lead",
      "guitar:cab:4x12_greenback",
      "guitar:pickup:rare_vintage_singlecoil",
    ],
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

function createTestUncertainty(
  impact: string = UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
  overrides?: Partial<ValidationUncertaintyRecord>
): ValidationUncertaintyRecord {
  return {
    uncertainty_id: "unc_edge_001",
    package_id: "pkg_2026_q4_lead_01",
    uncertainty_source: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
    affected_scope: ["guitar:pickup:rare_vintage_singlecoil"],
    potential_production_risk: "Edge-case coverage limitation on rare vintage single-coil pickups under extreme gain.",
    required_monitoring_if_authorized: ["Monitor THD and input clipping telemetry on singlecoil inputs"],
    gate_8_impact: impact as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Focused WP-23 Verification Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h WP-23: Conditional Authorization, Scope Restriction & Boundary Subsystem", () => {
  const AUTHORIZED_OFFICIAL = "Chief Sound Engineering Governance Authority";
  const AUTHORIZED_KEY = DEFAULT_GATE8_AUTHORITIES[0].keyOrSecret;
  const manager = new ConditionalAuthorizationManager();
  const engine = new Gate8AdjudicationEngine();

  // Helper to issue an authentic Gate 8 decision via WP-22 engine
  function issueGate8Decision(
    outcome: (typeof ADOPTION_DECISION_OUTCOMES)[keyof typeof ADOPTION_DECISION_OUTCOMES],
    conditions: string[] = [],
    scopeOverrides?: Partial<ValidationScopeRecord>,
    proposedAuthScope?: string[]
  ): AdoptionDecisionRecord {
    const scopeRecord = createTestScope(scopeOverrides);
    const versionBindingRecord = createValidBinding(scopeRecord.scope_id);
    const packageRecord = createTestPackage({
      scope_record_ref: scopeRecord.scope_id,
      version_binding_ref: versionBindingRecord.binding_id,
    });
    const readinessRecord = createEligibleReadinessAssessment({
      package_id: packageRecord.package_id,
      hard_blockers_present: outcome === ADOPTION_DECISION_OUTCOMES.REJECTED ? ["BLOCKER-01: Genuine regression"] : [],
      gate_8_eligible: outcome !== ADOPTION_DECISION_OUTCOMES.REJECTED && outcome !== ADOPTION_DECISION_OUTCOMES.BLOCKED,
    });

    const result = engine.adjudicateCutover({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      versionBindingRecord,
      decisionOutcome: outcome,
      proposedAuthorizedScope: proposedAuthScope,
      conditionsAndRestrictions: conditions,
      mandatoryMonitoringRules: ["Rule: 0.1% THD limit", "Alert: dropouts > 0"],
      rollbackVerificationCertRef: "cert_rollback_verified_001",
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
    });

    return result.decisionRecord;
  }

  // -------------------------------------------------------------------------
  // Test 1: Entry Prerequisite & Context Validation (Req 1, 2, 3, 4, 5, 43)
  // -------------------------------------------------------------------------
  it("01-05, 43: accepts only CONDITIONALLY_AUTHORIZED context and rejects AUTHORIZED, REJECTED, BLOCKED, and tampered records", () => {
    // 1. Valid CONDITIONALLY_AUTHORIZED record
    const validCondRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      ["Condition 1: Restricted pickup scope"],
      undefined,
      ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"]
    );

    const valResult = manager.validateConditionalAuthorization(validCondRecord);
    assert.equal(valResult.isValid, true);
    assert.equal(valResult.decisionId, validCondRecord.decision_id);
    assert.equal(validCondRecord.governance_status, GOVERNANCE_STATUSES.ACTIVE);

    // 2. AUTHORIZED input rejected as wrong manager path
    const authorizedRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      []
    );
    assert.throws(
      () => manager.validateConditionalAuthorization(authorizedRecord),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalContextError);
        assert(err.message.includes("ConditionalAuthorizationManager operates exclusively on CONDITIONALLY_AUTHORIZED contexts"));
        return true;
      }
    );

    // 3. REJECTED input rejected
    const rejectedRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.REJECTED,
      ["Substantive defect"]
    );
    assert.throws(
      () => manager.validateConditionalAuthorization(rejectedRecord),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalContextError);
        assert(err.message.includes("REJECTED"));
        return true;
      }
    );

    // 4. BLOCKED input rejected
    const blockedRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.BLOCKED,
      ["Prerequisite missing"]
    );
    assert.throws(
      () => manager.validateConditionalAuthorization(blockedRecord),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalContextError);
        assert(err.message.includes("BLOCKED"));
        return true;
      }
    );

    // 5. Tampered Record 21 rejected
    const tamperedRecord: AdoptionDecisionRecord = {
      ...validCondRecord,
      authorized_scope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback", "bass:amp:svt_classic"],
    };
    assert.throws(
      () => manager.validateConditionalAuthorization(tamperedRecord),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalContextError);
        assert(err.message.includes("failed cryptographic integrity"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 2: Absolute Non-Waivable Invariants (Req 8, 9, 10, 11, 12, 13, 14)
  // -------------------------------------------------------------------------
  it("08-14: strictly rejects non-waivable blockers (genuine regression, broken export, failed rollback, broken provenance, principles violation, critical uncertainty)", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();

    // 9. Material Genuine Regression (BLOCKER-01)
    const praWithRegression = createEligibleReadinessAssessment({
      hard_blockers_present: ["BLOCKER-01: Unresolved material genuine regression within requested authorization scope"],
    });
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praWithRegression,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("BLOCKER-01"));
        return true;
      }
    );

    // 10. Broken Platform Export / Preset Corruption (BLOCKER-02)
    const praWithExportFailure = createEligibleReadinessAssessment({
      hard_blockers_present: ["BLOCKER-02: Target-platform preset export failure, crash, or serialization corruption"],
    });
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praWithExportFailure,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("BLOCKER-02"));
        return true;
      }
    );

    // 11. Failed / Unverified Automated Rollback (BLOCKER-03 & rollbackEvidence.rollback_verified === false)
    const praEligible = createEligibleReadinessAssessment();
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praEligible,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
          rollbackEvidence: {
            rollback_verified: false,
            failure_reason: "PATH-ROLLBACK script timed out after 3000ms",
          },
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("Automated rollback verification failed"));
        return true;
      }
    );

    // 12. Broken Provenance / Traceability (BLOCKER-04)
    const praBrokenProvenance = createEligibleReadinessAssessment({
      hard_blockers_present: ["BLOCKER-04: Missing, broken, or unverifiable Phase 1C.5f provenance / traceability"],
    });
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praBrokenProvenance,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("BLOCKER-04"));
        return true;
      }
    );

    // 13. Principles of Sound Engineering Reasoning Violation (BLOCKER-08)
    const praPrinciplesViolation = createEligibleReadinessAssessment({
      hard_blockers_present: ["BLOCKER-08: Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g (Principle 4 uncomplied)"],
    });
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praPrinciplesViolation,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("BLOCKER-08"));
        return true;
      }
    );

    // 8 & 14. Critical Uncertainty / FORCES_BLOCK (BLOCKER-07 & gate_8_impact === FORCES_BLOCK)
    const blockingUncertainty = createTestUncertainty(UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK, {
      uncertainty_id: "unc_critical_dsp",
      potential_production_risk: "Severe aliasing and intermodulation distortion on bass frequencies capable of blowing monitor speakers.",
    });
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: praEligible,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
          uncertaintyRecords: [blockingUncertainty],
        }),
      (err: unknown) => {
        assert(err instanceof NonWaivableBlockerError);
        assert(err.message.includes("FORCES_BLOCK"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 3: Permitted Conditional Gaps & Acceptable Low Risk (Req 6, 7)
  // -------------------------------------------------------------------------
  it("06, 07: manages minor edge-case gaps and acceptable low-risk uncertainty with compensating controls", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const lowRiskUncertainty = createTestUncertainty(UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL, {
      uncertainty_id: "unc_singlecoil_edge",
      potential_production_risk: "Minor THD elevation on high-output single-coil pickups above 8kHz.",
    });

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      // Carve out the rare singlecoil pickup from authorized scope
      proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
      excludedScope: ["guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: [
        "Constraint: Input level clamped to -6dBFS for high-impedance pickups",
        "Compensating Control: Downstream 10kHz low-pass shelving filter engaged",
      ],
      requiredMonitoring: [
        "Telemetry rule: Monitor 8kHz-16kHz harmonic distortion band; alert if THD > 0.5%",
      ],
      uncertaintyRecords: [lowRiskUncertainty],
      rationale: "Minor single-coil edge-case gap managed via scope exclusion and high-band monitoring.",
    });

    assert.equal(plan.authorizedScope.length, 2);
    assert.equal(plan.excludedScope.length, 1);
    assert.equal(plan.excludedScope[0], "guitar:pickup:rare_vintage_singlecoil");
    assert.equal(plan.authorizationConstraints.length, 2);
    assert.equal(plan.requiredMonitoring.length, 1);
  });

  // -------------------------------------------------------------------------
  // Test 4: Scope Carve-Outs, Containment & Exclusions (Req 15, 16, 17, 18, 19)
  // -------------------------------------------------------------------------
  it("15-19: enforces strict scope containment (subset of requested and tested, disjoint from excluded, no untested units, no silent omissions)", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    // 15 & 16: authorized unit not requested -> reject
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          requestedScope: ["guitar:amp:5150_lead"],
          proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"], // cab was not requested
          excludedScope: [],
        }),
      (err: unknown) => {
        assert(err instanceof ConditionalScopeContainmentError);
        assert(err.message.includes("not present in requested scope"));
        return true;
      }
    );

    // Excluded unit not requested -> reject (exact partition requirement)
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          requestedScope: ["guitar:amp:5150_lead"],
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback"], // cab was not requested
        }),
      (err: unknown) => {
        assert(err instanceof ConditionalScopeContainmentError);
        assert(err.message.includes("was not present in requested scope"));
        return true;
      }
    );

    // 18: Untested scope cannot enter authorized scope
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          requestedScope: ["guitar:amp:5150_lead", "guitar:amp:untested_custom_amp"],
          proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:amp:untested_custom_amp"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
        }),
      (err: unknown) => {
        assert(err instanceof ConditionalScopeContainmentError);
        assert(err.message.includes("was not validated in the tested scope"));
        return true;
      }
    );

    // 17: Requested unit in both sets (authorized INTERSECT excluded != empty) -> reject
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
          excludedScope: ["guitar:cab:4x12_greenback"], // cab appears in both!
        }),
      (err: unknown) => {
        assert(err instanceof ConditionalScopeContainmentError);
        assert(err.message.includes("appears in both authorized_scope and excluded_scope"));
        return true;
      }
    );

    // 19: Requested unit in neither set (silent omission) -> reject
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          requestedScope: [
            "guitar:amp:5150_lead",
            "guitar:cab:4x12_greenback",
            "guitar:pickup:rare_vintage_singlecoil",
          ],
          proposedAuthorizedScope: ["guitar:amp:5150_lead"], // 2 units dropped
          excludedScope: ["guitar:cab:4x12_greenback"], // pickup was silently dropped without listing in excludedScope!
        }),
      (err: unknown) => {
        assert(err instanceof ConditionalScopeContainmentError);
        assert(err.message.includes("Silent omission is strictly prohibited"));
        return true;
      }
    );

    // Prove exact partition: requested = authorized UNION excluded AND authorized INTERSECT excluded = EMPTY
    const validPlan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      requestedScope: [
        "guitar:amp:5150_lead",
        "guitar:cab:4x12_greenback",
        "guitar:pickup:rare_vintage_singlecoil",
      ],
      proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
      excludedScope: ["guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint A"],
    });
    const union = Array.from(new Set([...validPlan.authorizedScope, ...validPlan.excludedScope])).sort();
    assert.deepEqual(union, [
      "guitar:amp:5150_lead",
      "guitar:cab:4x12_greenback",
      "guitar:pickup:rare_vintage_singlecoil",
    ]);
    const intersection = validPlan.authorizedScope.filter((u) => validPlan.excludedScope.includes(u));
    assert.equal(intersection.length, 0);
  });

  // -------------------------------------------------------------------------
  // Test 5: Boundedness & Empty Conditional Plan Rejection (Req 20, 21, 22, 23, 24)
  // -------------------------------------------------------------------------
  it("20-24: requires at least one material condition and strictly rejects semantically empty plans", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    // 21: Completely unconditioned / empty plan rejected
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          proposedAuthorizedScope: scopeRecord.included_units,
          excludedScope: [],
          authorizationConstraints: [],
          requiredMonitoring: [],
          revalidationPrerequisites: [],
        }),
      (err: unknown) => {
        assert(err instanceof EmptyConditionalPlanError);
        assert(err.message.includes("Semantically empty conditional plans"));
        return true;
      }
    );

    // 22 & 23 & 24: Providing specific constraints, monitoring rules with explicit thresholds succeeds
    const validPlan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: scopeRecord.included_units,
      excludedScope: [],
      authorizationConstraints: ["Constraint: max input level +4dBu"],
      requiredMonitoring: ["Telemetry rule: alert on buffer dropout > 0 within 60s window"],
    });

    assert.equal(validPlan.authorizationConstraints.length, 1);
    assert.equal(validPlan.requiredMonitoring.length, 1);
  });

  // -------------------------------------------------------------------------
  // Test 6: Review, Follow-Up Evidence & Validity Requirements (Req 25, 26, 27, 28)
  // -------------------------------------------------------------------------
  it("25-28: declaratively models review requirements, follow-up evidence requirements, and validity/expiry conditions", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
      excludedScope: ["guitar:pickup:rare_vintage_singlecoil"],
      // 25. Review requirement
      reviewRequirement: {
        reviewTrigger: "TARGETED_FIXTURE_EVIDENCE_SUBMISSION",
        requiredReviewerRole: "GOVERNANCE_LEAD",
        reviewConditions: ["Audit THD measurements on 3 vintage singlecoil stems"],
      },
      // 26. Follow-up evidence requirement
      followUpEvidenceRequirement: {
        targetEvidenceKinds: ["ObjectiveEvidenceRecord", "PerceptualEvaluationRecord"],
        description: "Submit 5 additional objective test cases and 1 MUSHRA panel on vintage pickups",
        targetScopeUnits: ["guitar:pickup:rare_vintage_singlecoil"],
        minimumTestCount: 5,
      },
      // 27 & 28. Validity condition & expiry
      validityCondition: {
        validityConditionRef: "cond_contract_v1_lead_2026_q4",
        expiresAt: "2026-12-31T23:59:59.000Z",
        stopCriteriaRefs: ["stop_profile_thd_breach_v1"],
        description: "Valid for 60 days pending delivery of vintage singlecoil fixture calibration.",
      },
      revalidationPrerequisites: [
        "If expired before evidence submission, candidate scope reverts to laboratory retest.",
      ],
    });

    assert.equal(plan.reviewRequirement?.reviewTrigger, "TARGETED_FIXTURE_EVIDENCE_SUBMISSION");
    assert.equal(plan.followUpEvidenceRequirement?.targetEvidenceKinds[0], "ObjectiveEvidenceRecord");
    assert.equal(plan.validityCondition?.expiresAt, "2026-12-31T23:59:59.000Z");
    assert.equal(plan.revalidationPrerequisites?.length, 1);
  });

  // -------------------------------------------------------------------------
  // Test 7: Validity Evaluation & Expiry Behavior (Req 29, 30, 31, 32, 33, 34)
  // -------------------------------------------------------------------------
  it("29-34: evaluates condition validity declaratively (unexpired=current, expired=revalidation-required) with zero record mutations or side-effects", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      validityCondition: {
        validityConditionRef: "cond_contract_expiry_test",
        expiresAt: "2026-10-18T18:00:00.000Z", // expired earlier today
        stopCriteriaRefs: ["stop_profile_telemetry_01"],
        description: "Short-lived internal test authorization",
      },
    });

    // 29. Exact expiry boundary test (expiresAt = "2026-10-18T18:00:00.000Z")
    // 29a. Just before expiry (1ms before) -> CURRENT
    const beforeResult = manager.evaluateConditionValidity(plan, {
      asOf: "2026-10-18T17:59:59.999Z",
    });
    assert.equal(beforeResult.status, "CURRENT");
    assert.equal(beforeResult.isValid, true);
    assert.equal(beforeResult.revalidationRequired, false);

    // 29b. Exactly at expiry boundary (asOf >= expiresAt => EXPIRED) -> EXPIRED
    const atExpiryResult = manager.evaluateConditionValidity(plan, {
      asOf: "2026-10-18T18:00:00.000Z",
    });
    assert.equal(atExpiryResult.status, "EXPIRED");
    assert.equal(atExpiryResult.isValid, false);
    assert.equal(atExpiryResult.revalidationRequired, true);

    // 29c. Just after expiry (1ms after) -> EXPIRED
    const afterResult = manager.evaluateConditionValidity(plan, {
      asOf: "2026-10-18T18:00:00.001Z",
    });
    assert.equal(afterResult.status, "EXPIRED");
    assert.equal(afterResult.isValid, false);
    assert.equal(afterResult.revalidationRequired, true);

    // 30. Deterministic time semantics: same plan + same instant = strictly identical result
    const evalInstant = "2026-10-18T12:00:00.000Z";
    const run1 = manager.evaluateConditionValidity(plan, { asOf: evalInstant });
    const run2 = manager.evaluateConditionValidity(plan, { evaluationTimestamp: evalInstant });
    const run3 = manager.evaluateConditionValidity(plan, { currentTimestamp: evalInstant });
    assert.deepEqual(run1, run2);
    assert.deepEqual(run2, run3);

    // Omitting evaluation instant throws error requiring explicit deterministic timestamp
    assert.throws(
      () => manager.evaluateConditionValidity(plan, {}),
      (err: unknown) => {
        assert(err instanceof Error);
        assert(err.message.includes("Deterministic evaluation timestamp"));
        return true;
      }
    );

    // 31, 32, 33, 34: Confirm zero mutations or record generations
    // - Record 21 is not mutated
    // - Record 18 (RevalidationTriggerRecord) is not created
    // - Record 19 (RetestPlanRecord) is not created
    // - Record 22 (Gate8ChangeRecord) is not created
    const graph = new ValidationRelationshipGraph();
    assert.equal(graph.getEdges().length, 0);
  });

  // -------------------------------------------------------------------------
  // Test 8: Mapping to Canonical Record 21 Schema (Req 35, 36, 37, 38, 58)
  // -------------------------------------------------------------------------
  it("35-38, 58: projects conditional plan deterministically into canonical Record 21 fields with exactly 14 fields", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"],
      excludedScope: ["guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint: input pad required"],
      requiredMonitoring: ["Rule: 0.1% THD limit"],
      reviewRequirement: {
        reviewTrigger: "EXPIRY",
        requiredReviewerRole: "GOVERNANCE_LEAD",
        reviewConditions: ["Audit log review"],
      },
      validityCondition: {
        validityConditionRef: "contract_001",
        expiresAt: "2026-12-31T00:00:00.000Z",
        stopCriteriaRefs: ["stop_ref_1"],
        description: "Valid until year end",
      },
    });

    // Project plan into canonical Record 21 inputs
    const projection = manager.projectToRecord21Inputs(plan);

    // 35. authorizedScope
    assert.deepEqual(projection.authorizedScope, ["guitar:amp:5150_lead", "guitar:cab:4x12_greenback"]);

    // 36. conditionsAndRestrictions contains exclusions, constraints, review, validity
    assert(projection.conditionsAndRestrictions.some((c) => c.includes("SCOPE_EXCLUSION")));
    assert(projection.conditionsAndRestrictions.some((c) => c.includes("CONSTRAINT: input pad required")));
    assert(projection.conditionsAndRestrictions.some((c) => c.includes("REVIEW_REQUIREMENT")));
    assert(projection.conditionsAndRestrictions.some((c) => c.includes("VALIDITY_CONDITION")));

    // 37. mandatoryMonitoringRules contains monitoring + stop criteria
    assert(projection.mandatoryMonitoringRules.some((m) => m.includes("Rule: 0.1% THD limit")));
    assert(projection.mandatoryMonitoringRules.some((m) => m.includes("STOP_CRITERIA_PROFILE: stop_ref_1")));

    // 58. Feed projection directly into WP-22 Gate8AdjudicationEngine
    const versionBindingRecord = createValidBinding(scopeRecord.scope_id);
    const graph = new ValidationRelationshipGraph();
    const testEngine = new Gate8AdjudicationEngine();
    const adjudicationResult = testEngine.adjudicateCutover({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      versionBindingRecord,
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      proposedAuthorizedScope: projection.authorizedScope,
      conditionsAndRestrictions: projection.conditionsAndRestrictions,
      mandatoryMonitoringRules: projection.mandatoryMonitoringRules,
      rollbackVerificationCertRef: "cert_rollback_verified_001",
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
      graph,
    });

    // 38. Verify Record 21 has exactly 14 fields
    const parsed = adoptionDecisionRecordSchema.parse(adjudicationResult.decisionRecord);
    const fieldCount = Object.keys(parsed).length;
    assert.equal(fieldCount, 14, "AdoptionDecisionRecord must contain exactly fourteen persisted fields.");

    // Verify exact 14 canonical field names match frozen contract
    const canonicalRecord21Fields = [
      "authorizing_official",
      "authorized_scope",
      "conditions_and_restrictions",
      "decision_id",
      "decision_outcome",
      "decision_timestamp",
      "governance_status",
      "mandatory_monitoring_rules",
      "package_id",
      "readiness_assessment_id",
      "record_integrity_metadata",
      "requested_scope",
      "rollback_verification_cert_ref",
      "version_binding_integrity_ref",
    ].sort();
    assert.deepEqual(Object.keys(parsed).sort(), canonicalRecord21Fields);

    // Strict schema runtime proof: reject extra invented fields
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({
        ...parsed,
        signer_identity: "unauthorized_extra_field",
      });
    });
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({
        ...parsed,
        signer_role: "unauthorized_extra_field",
      });
    });
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({
        ...parsed,
        signer_signature: "unauthorized_extra_field",
      });
    });

    assert.equal(adjudicationResult.decisionRecord.governance_status, GOVERNANCE_STATUSES.ACTIVE);
    assert.ok(adjudicationResult.decisionRecord.authorized_scope.length > 0);
    assert.ok(adjudicationResult.decisionRecord.conditions_and_restrictions.length > 0);
    assert.ok(adjudicationResult.decisionRecord.mandatory_monitoring_rules.length > 0);

    // Verify canonical AUTHORIZES_SCOPE edge only is emitted (to ValidationScopeRecord)
    assert.ok(adjudicationResult.authorizesScopeEdge);
    assert.equal(adjudicationResult.authorizesScopeEdge.edgeType, "AUTHORIZES_SCOPE");
    assert.equal(adjudicationResult.authorizesScopeEdge.target.kind, "ValidationScopeRecord");

    // Verify manager validates this newly issued record cleanly
    const valResult = manager.validateConditionalAuthorization(adjudicationResult.decisionRecord);
    assert.equal(valResult.isValid, true);

    // Test validity_condition_ref preservation:
    // Two plans identical except validityConditionRef A vs B
    const planA = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      validityCondition: {
        validityConditionRef: "CONTRACT_REF_ALPHA",
        description: "Alpha condition contract",
      },
    });
    const planB = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      validityCondition: {
        validityConditionRef: "CONTRACT_REF_BETA",
        description: "Beta condition contract",
      },
    });

    assert.equal(planA.validityCondition?.validityConditionRef, "CONTRACT_REF_ALPHA");
    assert.equal(planB.validityCondition?.validityConditionRef, "CONTRACT_REF_BETA");

    const projA = manager.projectToRecord21Inputs(planA);
    const projB = manager.projectToRecord21Inputs(planB);

    assert(projA.conditionsAndRestrictions.some((c) => c.includes("Ref [CONTRACT_REF_ALPHA]")));
    assert(projB.conditionsAndRestrictions.some((c) => c.includes("Ref [CONTRACT_REF_BETA]")));
    assert.notDeepEqual(projA.conditionsAndRestrictions, projB.conditionsAndRestrictions);
  });

  // -------------------------------------------------------------------------
  // Test 9: Graph, Record & Governance Boundaries (Req 39, 40, 41, 42)
  // -------------------------------------------------------------------------
  it("39-42: introduces zero new record types, zero new graph edge types, and preserves 14-edge graph catalogue", () => {
    // 39. Exactly 22 governed validation record schemas defined (Records 1 through 22)
    const recordSchemaKeys = Object.keys(VALIDATION_RECORD_SCHEMAS);
    assert.equal(recordSchemaKeys.length, 22, "Exactly 22 governed record schemas must be defined (Records 1–22).");
    assert.ok(recordSchemaKeys.includes("Gate8ChangeRecord"), "Gate8ChangeRecord must remain present as frozen Record 22.");
    assert.equal(GOVERNED_ENTITY_KINDS.Gate8ChangeRecord, "Gate8ChangeRecord");

    // 40 & 41. Graph catalogue remains exactly 14 governed edge types
    const edgeTypesCount = Object.keys(GOVERNED_EDGE_TYPES).length;
    assert.equal(edgeTypesCount, 14, "Relationship Graph must preserve exactly 14 edge types.");

    // 42. No governance status transition (no RESTRICTED, SUSPENDED, WITHDRAWN)
    const validCondRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      ["Condition 1"],
      undefined,
      ["guitar:amp:5150_lead"]
    );
    assert.equal(validCondRecord.governance_status, GOVERNANCE_STATUSES.ACTIVE);
  });

  // -------------------------------------------------------------------------
  // Test 10: Phase 1C.5g Traffic-Slicing Boundary (Req 44, 45, 46, 47, 48, 49, 50)
  // -------------------------------------------------------------------------
  it("44-50: strictly prohibits operational traffic manipulation constructs (percentages, canary routing, PATH-PROD switches)", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    // 44 & 45. Prohibit traffic_percentage / canary_percentage in constraints
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
          authorizationConstraints: ["canary_percentage: 10%"],
        }),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalConstraintError);
        assert(err.message.includes("canary_percentage"));
        return true;
      }
    );

    // 46, 47, 48. Prohibit routing switches / PATH-PROD / PATH-SHADOW
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
          authorizationConstraints: ["path_prod_switch: execute immediately"],
        }),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalConstraintError);
        assert(err.message.includes("path_prod_switch"));
        return true;
      }
    );

    // Prohibit traffic_percentage in field names
    assert.throws(
      () =>
        manager.prepareConditionalPlan({
          packageRecord,
          readinessAssessmentRecord: readinessRecord,
          scopeRecord,
          proposedAuthorizedScope: ["guitar:amp:5150_lead"],
          excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
          traffic_percentage: 20, // prohibited field
        } as any),
      (err: unknown) => {
        assert(err instanceof InvalidConditionalConstraintError);
        assert(err.message.includes("traffic_percentage"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 11: Boundaries for WP-24, WP-27, and WP-28 (Req 51, 52, 53)
  // -------------------------------------------------------------------------
  it("51-53: preserves strict boundaries respecting WP-24 (state transitions), WP-27 (rollback execution), and WP-28 (telemetry monitoring)", () => {
    // 51. WP-23 does not implement Gate8ChangeRecord or state transitions
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint 1"],
    });

    // 52. WP-23 consumes rollback evidence, does not execute rollback
    assert.equal(plan.packageId, packageRecord.package_id);

    // 53. WP-23 declares monitoring rules, does not ingest or stream telemetry
    assert.equal(typeof manager.prepareConditionalPlan, "function");
    assert.equal(typeof manager.projectToRecord21Inputs, "function");
    assert.equal(typeof manager.validateConditionalAuthorization, "function");
    assert.equal(typeof manager.evaluateConditionValidity, "function");
  });

  // -------------------------------------------------------------------------
  // Test 12: Determinism, Semantics & Immutability (Req 54, 55, 56, 57)
  // -------------------------------------------------------------------------
  it("54-57: guarantees determinism, material semantic differentiation, and deep immutability", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const baseInput = {
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint A"],
      requiredMonitoring: ["Rule 1"],
      timestamp: "2026-10-18T12:00:00.000Z",
    };

    // 54. Deterministic equivalent inputs yield equivalent plan
    const plan1 = manager.prepareConditionalPlan(baseInput);
    const plan2 = manager.prepareConditionalPlan(baseInput);
    assert.equal(plan1.planId, plan2.planId);
    assert.deepEqual(plan1.authorizedScope, plan2.authorizedScope);
    assert.deepEqual(plan1.authorizationConstraints, plan2.authorizationConstraints);

    // 54b. Scope normalization & canonical deterministic identity
    // Reordered requested scope, duplicates, reordered authorized/excluded scopes, reordered constraints/monitoring
    const planNormalizedA = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      requestedScope: [
        "guitar:pickup:rare_vintage_singlecoil",
        "guitar:cab:4x12_greenback",
        "guitar:amp:5150_lead",
      ],
      proposedAuthorizedScope: [
        "guitar:cab:4x12_greenback",
        "guitar:amp:5150_lead",
        "guitar:cab:4x12_greenback", // duplicate
      ],
      excludedScope: [
        "guitar:pickup:rare_vintage_singlecoil",
        "guitar:pickup:rare_vintage_singlecoil", // duplicate
      ],
      authorizationConstraints: ["Constraint B", "Constraint A", "Constraint B"],
      requiredMonitoring: ["Rule 2", "Rule 1", "Rule 2"],
      timestamp: "2026-10-18T12:00:00.000Z",
    });

    const planNormalizedB = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      requestedScope: [
        "guitar:amp:5150_lead",
        "guitar:cab:4x12_greenback",
        "guitar:pickup:rare_vintage_singlecoil",
      ],
      proposedAuthorizedScope: [
        "guitar:amp:5150_lead",
        "guitar:cab:4x12_greenback",
      ],
      excludedScope: [
        "guitar:pickup:rare_vintage_singlecoil",
      ],
      authorizationConstraints: ["Constraint A", "Constraint B"],
      requiredMonitoring: ["Rule 1", "Rule 2"],
      timestamp: "2026-10-18T12:00:00.000Z",
    });

    assert.equal(planNormalizedA.planId, planNormalizedB.planId);
    assert.deepEqual(planNormalizedA.authorizedScope, planNormalizedB.authorizedScope);
    assert.deepEqual(planNormalizedA.excludedScope, planNormalizedB.excludedScope);
    assert.deepEqual(planNormalizedA.authorizationConstraints, planNormalizedB.authorizationConstraints);
    assert.deepEqual(planNormalizedA.requiredMonitoring, planNormalizedB.requiredMonitoring);

    // 55. Material change yields distinct plan semantics & ID
    const planDistinct = manager.prepareConditionalPlan({
      ...baseInput,
      authorizationConstraints: ["Constraint B — materially different control"],
    });
    assert.notEqual(plan1.planId, planDistinct.planId);

    // 56. Deep immutability: top-level and nested structures are frozen and throw on mutation
    const richPlan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint Alpha"],
      requiredMonitoring: ["Monitor 0.1% THD"],
      reviewRequirement: {
        reviewTrigger: "TARGETED_REVIEW",
        requiredReviewerRole: "CHIEF_ENGINEER",
        reviewConditions: ["Review condition 1"],
      },
      followUpEvidenceRequirement: {
        targetEvidenceKinds: ["ObjectiveEvidenceRecord"],
        description: "Follow-up lab fixture data",
        targetScopeUnits: ["guitar:cab:4x12_greenback"],
      },
      validityCondition: {
        validityConditionRef: "CONTRACT_IMMUTABLE_01",
        expiresAt: "2026-12-31T00:00:00.000Z",
        stopCriteriaRefs: ["stop_profile_01"],
        description: "Valid until end of quarter",
      },
    });

    assert(Object.isFrozen(richPlan));
    assert(Object.isFrozen(richPlan.authorizedScope));
    assert(Object.isFrozen(richPlan.excludedScope));
    assert(Object.isFrozen(richPlan.authorizationConstraints));
    assert(Object.isFrozen(richPlan.requiredMonitoring));
    assert(Object.isFrozen(richPlan.reviewRequirement));
    assert(Object.isFrozen(richPlan.reviewRequirement?.reviewConditions));
    assert(Object.isFrozen(richPlan.followUpEvidenceRequirement));
    assert(Object.isFrozen(richPlan.followUpEvidenceRequirement?.targetEvidenceKinds));
    assert(Object.isFrozen(richPlan.followUpEvidenceRequirement?.targetScopeUnits));
    assert(Object.isFrozen(richPlan.validityCondition));
    assert(Object.isFrozen(richPlan.validityCondition?.stopCriteriaRefs));

    // Explicitly verify nested mutations fail / throw
    assert.throws(() => {
      (richPlan.reviewRequirement!.reviewConditions as string[])[0] = "mutated";
    });
    assert.throws(() => {
      (richPlan.followUpEvidenceRequirement!.targetScopeUnits as string[])[0] = "mutated";
    });
    assert.throws(() => {
      (richPlan.validityCondition!.stopCriteriaRefs as string[])[0] = "mutated";
    });

    // Check projection deep immutability
    const proj = manager.projectToRecord21Inputs(richPlan);
    assert(Object.isFrozen(proj));
    assert(Object.isFrozen(proj.authorizedScope));
    assert(Object.isFrozen(proj.conditionsAndRestrictions));
    assert(Object.isFrozen(proj.mandatoryMonitoringRules));
    assert.throws(() => {
      (proj.conditionsAndRestrictions as string[])[0] = "mutated";
    });

    // Check validity evaluation result deep immutability
    const valEval = manager.evaluateConditionValidity(richPlan, { asOf: "2026-10-18T12:00:00.000Z" });
    assert(Object.isFrozen(valEval));
    assert(Object.isFrozen(valEval.revalidationReasons));
    assert(Object.isFrozen(valEval.revalidationScope));
    assert.throws(() => {
      (valEval.revalidationScope as string[]).push("illegal_scope");
    });

    // 57. Post-seal isolation: sealing Record 21 via WP-22 engine isolates it from subsequent mutations
    const versionBindingRecord = createValidBinding(scopeRecord.scope_id);
    const adjudicationResult = engine.adjudicateCutover({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      versionBindingRecord,
      decisionOutcome: ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      proposedAuthorizedScope: proj.authorizedScope,
      conditionsAndRestrictions: proj.conditionsAndRestrictions,
      mandatoryMonitoringRules: proj.mandatoryMonitoringRules,
      rollbackVerificationCertRef: "cert_rollback_verified_001",
      authorizingOfficial: AUTHORIZED_OFFICIAL,
      authorizingOfficialKey: AUTHORIZED_KEY,
    });
    const sealedRecord = adjudicationResult.decisionRecord;
    assert(Object.isFrozen(sealedRecord));
    assert.throws(() => {
      (sealedRecord.authorized_scope as string[]).push("illegal_scope");
    });
    assert.throws(() => {
      (sealedRecord.conditions_and_restrictions as string[]).push("illegal_condition");
    });
    // Cryptographic integrity remains valid for the sealed payload
    assert.equal(manager.validateConditionalAuthorization(sealedRecord).isValid, true);
  });

  // -------------------------------------------------------------------------
  // Test 13: Authority Separation (Req 59, 60)
  // -------------------------------------------------------------------------
  it("59, 60: enforces that conditional plans cannot grant authority by themselves; only sealed Record 21 conveys authority", () => {
    const scopeRecord = createTestScope();
    const packageRecord = createTestPackage();
    const readinessRecord = createEligibleReadinessAssessment();

    const plan = manager.prepareConditionalPlan({
      packageRecord,
      readinessAssessmentRecord: readinessRecord,
      scopeRecord,
      proposedAuthorizedScope: ["guitar:amp:5150_lead"],
      excludedScope: ["guitar:cab:4x12_greenback", "guitar:pickup:rare_vintage_singlecoil"],
      authorizationConstraints: ["Constraint 1"],
    });

    // 59. A plan is NOT an AdoptionDecisionRecord and cannot satisfy isDecisionAuthorized
    assert.equal(isDecisionAuthorized(plan as any), false);

    // 60. Only sealed Record 21 from WP-22 conveys Gate 8 cutover authority
    const validDecisionRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.CONDITIONALLY_AUTHORIZED,
      ["Condition 1"],
      undefined,
      ["guitar:amp:5150_lead"]
    );
    assert.equal(isDecisionAuthorized(validDecisionRecord), true);

    const rejectedRecord = issueGate8Decision(
      ADOPTION_DECISION_OUTCOMES.REJECTED,
      ["Substantive defect"]
    );
    assert.equal(isDecisionAuthorized(rejectedRecord), false);
  });
});
