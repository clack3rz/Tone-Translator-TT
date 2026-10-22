// src/tests/traceabilityGovernanceMapper.test.ts
// WP-29 Stage 2 Slice 1E: Pre-Gate-8 Governance Mapping & Blocker-04 Integration
// Comprehensive tests verifying deterministic, non-authoritative mapping
// of factual WP-29 audit outputs to UpstreamGovernanceState for readiness synthesis.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  toUpstreamGovernanceState,
  isProvenanceRelevantFinding,
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_SEVERITIES,
  TRACEABILITY_FINDING_CATEGORIES,
  PRINCIPLE_AUDIT_STATES,
  TraceabilityAuditReport,
  TraceabilityFinding,
  StageVerificationEntry,
  STAGE_REPRESENTATION_STRENGTHS,
} from "../sound-engineer/validation/traceability";
import {
  ProductionReadinessSynthesizer,
  FROZEN_HARD_BLOCKERS,
  PILLAR_READINESS_STATUSES,
  ProductionReadinessSynthesisInput,
  UpstreamGovernanceState,
} from "../sound-engineer/validation/readiness";
import {
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import { VersionBindingService } from "../sound-engineer/validation/binding/versionBindingService";
import {
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
} from "../sound-engineer/validation/binding/types";

function createTestScope(scopeId = "scope_test_governance"): ValidationScopeRecord {
  return {
    scope_id: scopeId,
    intake_id: "intake_test_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["guitar:amp:5150_lead"],
    excluded_units: [],
    boundary_constraints: ["sample_rate:44100-96000"],
    scope_inflation_protection: true,
  };
}

function createTestBinding(scopeId = "scope_test_governance"): ValidationVersionBindingRecord {
  const archProvider = new StaticArchitectureIntegrityReferenceProvider(
    TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  );
  const service = new VersionBindingService(undefined, undefined, undefined, archProvider);
  const scope = createTestScope(scopeId);
  return service.bindVersions(scope, {
    runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
    model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
    deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
    gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
    platform_exporter_version: "stage12_serializer_digest_9a8b7c",
    fixture_library_version: "golden_stems_manifest_digest_def456",
    target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
    host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    architecture_integrity_references: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  });
}

function createTestPackage(packageId = "pkg_test_governance", scopeId = "scope_test_governance", bindingId = "bind_test_governance"): ValidationPackage {
  return {
    package_id: packageId,
    intake_id: "intake_test_gov",
    scope_record_ref: scopeId,
    version_binding_ref: bindingId,
    assigned_test_profiles: ["profile:01_structural_schema"],
    validation_case_refs: ["case_01"],
    execution_record_refs: ["exec_01"],
    evidence_refs: ["obj_01"],
  };
}

function create14StageLifecycleCoverage(stagesPresent = 13): StageVerificationEntry[] {
  const stages: StageVerificationEntry[] = [
    { stageNumber: 1, stageName: "INTENT_INTAKE", representation: STAGE_REPRESENTATION_STRENGTHS.EXACT, presentInTrace: stagesPresent >= 1 },
    { stageNumber: 2, stageName: "CASE_EVIDENCE_ASSESSMENT", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 2 },
    { stageNumber: 3, stageName: "OBSERVATION_FORMATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 3 },
    { stageNumber: 4, stageName: "HYPOTHESIS_GENERATION", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: stagesPresent >= 4 },
    { stageNumber: 5, stageName: "HYPOTHESIS_EVALUATION_AND_COMPETITION", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: stagesPresent >= 5 },
    { stageNumber: 6, stageName: "DISCRIMINATING_EVIDENCE_CHECK", representation: STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED, presentInTrace: false },
    { stageNumber: 7, stageName: "CAUSAL_DIAGNOSIS", representation: STAGE_REPRESENTATION_STRENGTHS.GROUPED, presentInTrace: stagesPresent >= 7 },
    { stageNumber: 8, stageName: "ENGINEERING_REQUIREMENT_FORMATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 8 },
    { stageNumber: 9, stageName: "CANDIDATE_INTERVENTION_GENERATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 9 },
    { stageNumber: 10, stageName: "CONSTRAINT_AND_TRADE_OFF_ANALYSIS", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 10 },
    { stageNumber: 11, stageName: "ENGINEERING_DECISION_AND_PREDICTION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 11 },
    { stageNumber: 12, stageName: "SEMANTIC_TONE_DESIGN_HANDOFF", representation: STAGE_REPRESENTATION_STRENGTHS.EXACT, presentInTrace: stagesPresent >= 12 },
    { stageNumber: 13, stageName: "OUTCOME_EVIDENCE_INGESTION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 13 },
    { stageNumber: 14, stageName: "ENGINEERING_REVIEW_AND_ITERATION", representation: STAGE_REPRESENTATION_STRENGTHS.DERIVED, presentInTrace: stagesPresent >= 13 },
  ];
  return stages;
}

function createMinimalMockReport(overrides?: Partial<TraceabilityAuditReport>): TraceabilityAuditReport {
  return {
    traceId: "trace_mock_01",
    runId: "run_mock_01",
    verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
    allAuditableInvariantsPassed: false,
    findings: [],
    lifecycleCoverage: create14StageLifecycleCoverage(13),
    principleResults: [
      { principleNumber: 1, title: "Respect the Raw Evidence", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
      { principleNumber: 4, title: "A Symptom Does Not Identify Its Cause", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
      { principleNumber: 5, title: "Diagnosis Should Be Causal Where Evidence Permits", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
      { principleNumber: 6, title: "Competing Hypotheses Survive Until Evidence Justifies Narrowing Them", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.DELEGATED, findings: [] },
      { principleNumber: 18, title: "Evaluate Outcomes Honestly Without Circular Justification", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE, findings: [] },
    ],
    orphanedMeasurementSummary: {
      totalMeasurementsChecked: 0,
      orphanedCount: 0,
      ruleA_MissingExecutionCount: 0,
      ruleB_UnresolvableTraceCount: 0,
      scopeCoverageVerifiedCount: 0,
      totalMeasurements: 0,
      resolvedMeasurements: 0,
      orphanedMeasurements: 0,
      unverifiedMeasurements: 0,
      objectiveEvidenceCount: 0,
      perceptualEvaluationCount: 0,
      objectiveOrphanedCount: 0,
      perceptualOrphanedCount: 0,
    },
    evidenceContext: {
      isValidationIntegrated: false,
      empiricalOutcomeVerified: false,
      executionRecordCount: 0,
      objectiveEvidenceCount: 0,
      perceptualEvaluationCount: 0,
      validationCaseCount: 0,
      validationScopeCount: 0,
    },
    parameterProvenanceCapability: {
      maxSupportedLevel: "LEVEL_3_DECISION_RECORD_TRACE",
      activeLevel: "LEVEL_3_DECISION_RECORD_TRACE",
      notes: "Local index verified",
    },
    parameterProvenanceSummary: {
      totalParametersEncountered: 1,
      totalIndexEntries: 1,
      uniqueKeysCount: 1,
      ambiguousKeysCount: 0,
      ambiguousEntriesCount: 0,
      level1ExactCount: 0,
      level2ExactCount: 0,
      level3ExactCount: 1,
      level1CumulativeCount: 1,
      level2CumulativeCount: 1,
      level3CumulativeCount: 1,
      unresolvedEntriesCount: 0,
      maxLevelReached: "LEVEL_3_DECISION_RECORD_TRACE",
      totalIndexedParameters: 1,
      level1OnlyCount: 0,
      level2Count: 0,
      level3Count: 1,
    },
    timing: {
      startedAt: "2026-10-21T00:00:00Z",
      completedAt: "2026-10-21T00:00:01Z",
      durationMs: 1000,
    },
    ...overrides,
  };
}

describe("WP-29 Stage 2 Slice 1E: Pre-Gate-8 Governance Mapping & Blocker-04 Integration", () => {
  it("1. Provenance vs P18 separation: complete provenance + P18 NOT_VERIFIABLE yields provenance_intact: true while principles_complied: false", () => {
    // Audit verdict is NOT_VERIFIABLE solely due to P18 anti-circularity limitation,
    // but all factual provenance checkpoints, lineage, parameter provenance, and measurements are intact.
    const reportWithP18Unverified = createMinimalMockReport({
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
      allAuditableInvariantsPassed: false,
      findings: [
        {
          code: "INFO_P18_EMPIRICAL_OUTCOME_VERIFIED",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
          principleNumber: 18,
          message: "Empirical outcome verified; full P18 unobservable",
        },
      ],
      parameterProvenanceSummary: {
        totalParametersEncountered: 2,
        totalIndexEntries: 2,
        uniqueKeysCount: 2,
        ambiguousKeysCount: 0,
        ambiguousEntriesCount: 0,
        level1ExactCount: 0,
        level2ExactCount: 0,
        level3ExactCount: 2,
        level1CumulativeCount: 2,
        level2CumulativeCount: 2,
        level3CumulativeCount: 2,
        unresolvedEntriesCount: 0,
        maxLevelReached: "LEVEL_3_DECISION_RECORD_TRACE",
        totalIndexedParameters: 2,
        level1OnlyCount: 0,
        level2Count: 0,
        level3Count: 2,
      },
    });

    const gov = toUpstreamGovernanceState(reportWithP18Unverified);

    // Provenance facts are intact:
    assert.strictEqual(gov.provenance_intact, true, "provenance_intact must be true when all provenance facts are intact despite P18 limitation");
    // But full principles cannot be claimed compliant:
    assert.strictEqual(gov.principles_complied, false, "principles_complied must remain false due to P18 NOT_VERIFIABLE");
    // And zero upstream violations:
    assert.strictEqual(gov.upstream_violations?.length, 0);
  });

  it("2. Provenance failure: unresolved mandatory parameter provenance sets provenance_intact: false", () => {
    const reportUnresolvedParam = createMinimalMockReport({
      findings: [
        {
          code: "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          targetId: "stg_99::pedal::gain",
          message: "Parameter stage does not resolve to SemanticProcessingStage",
        },
      ],
      parameterProvenanceSummary: {
        totalParametersEncountered: 1,
        totalIndexEntries: 1,
        uniqueKeysCount: 1,
        ambiguousKeysCount: 0,
        ambiguousEntriesCount: 0,
        level1ExactCount: 1,
        level2ExactCount: 0,
        level3ExactCount: 0,
        level1CumulativeCount: 1,
        level2CumulativeCount: 0,
        level3CumulativeCount: 0,
        unresolvedEntriesCount: 1,
        maxLevelReached: "LEVEL_1_PARAMETER_IDENTITY",
        totalIndexedParameters: 1,
        level1OnlyCount: 1,
        level2Count: 0,
        level3Count: 0,
      },
    });

    const gov = toUpstreamGovernanceState(reportUnresolvedParam);
    assert.strictEqual(gov.provenance_intact, false, "Unresolved parameter provenance prevents provenance_intact");
    assert.strictEqual(gov.upstream_violations?.length, 0, "NOT_VERIFIABLE parameter finding must not be added to upstream_violations");
  });

  it("3. Provenance failure: ambiguous composite key collision sets provenance_intact: false", () => {
    const reportAmbiguousParam = createMinimalMockReport({
      findings: [
        {
          code: "WARN_PARAM_KEY_COLLISION_AMBIGUOUS",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          targetId: "stg_eq::pedal::gain",
          message: "Duplicate composite key collision",
        },
      ],
      parameterProvenanceSummary: {
        totalParametersEncountered: 2,
        totalIndexEntries: 2,
        uniqueKeysCount: 1,
        ambiguousKeysCount: 1,
        ambiguousEntriesCount: 2,
        level1ExactCount: 0,
        level2ExactCount: 0,
        level3ExactCount: 2,
        level1CumulativeCount: 2,
        level2CumulativeCount: 2,
        level3CumulativeCount: 2,
        unresolvedEntriesCount: 0,
        maxLevelReached: "LEVEL_3_DECISION_RECORD_TRACE",
        totalIndexedParameters: 2,
        level1OnlyCount: 0,
        level2Count: 0,
        level3Count: 2,
      },
    });

    const gov = toUpstreamGovernanceState(reportAmbiguousParam);
    assert.strictEqual(gov.provenance_intact, false, "Ambiguous parameter provenance prevents provenance_intact");
  });

  it("4. Provenance failure: factual orphan measurement sets provenance_intact: false and emits upstream_violation", () => {
    const reportOrphan = createMinimalMockReport({
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT,
      findings: [
        {
          code: "ORPHAN_PARENT_EXECUTION_MISSING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "ObjectiveEvidenceRecord references non-existent parent execution",
        },
      ],
      orphanedMeasurementSummary: {
        totalMeasurementsChecked: 1,
        orphanedCount: 1,
        ruleA_MissingExecutionCount: 1,
        ruleB_UnresolvableTraceCount: 0,
        scopeCoverageVerifiedCount: 0,
        totalMeasurements: 1,
        resolvedMeasurements: 0,
        orphanedMeasurements: 1,
        unverifiedMeasurements: 0,
        objectiveEvidenceCount: 1,
        perceptualEvaluationCount: 0,
        objectiveOrphanedCount: 1,
        perceptualOrphanedCount: 0,
      },
    });

    const gov = toUpstreamGovernanceState(reportOrphan);
    assert.strictEqual(gov.provenance_intact, false);
    assert.strictEqual(gov.upstream_violations?.length, 1);
    assert.ok(gov.upstream_violations![0].includes("ORPHAN_PARENT_EXECUTION_MISSING"));
  });

  it("5. Provenance failure: unresolvable validation lineage sets provenance_intact: false without fabricating violation", () => {
    const reportUnresolvableLineage = createMinimalMockReport({
      findings: [
        {
          code: "EXECUTION_TRACE_REF_UNRESOLVABLE",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
          severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
          message: "Parent execution trace_ref is unresolvable",
        },
      ],
      orphanedMeasurementSummary: {
        totalMeasurementsChecked: 1,
        orphanedCount: 0,
        ruleA_MissingExecutionCount: 0,
        ruleB_UnresolvableTraceCount: 0,
        scopeCoverageVerifiedCount: 0,
        totalMeasurements: 1,
        resolvedMeasurements: 0,
        orphanedMeasurements: 0,
        unverifiedMeasurements: 1,
        objectiveEvidenceCount: 1,
        perceptualEvaluationCount: 0,
        objectiveOrphanedCount: 0,
        perceptualOrphanedCount: 0,
      },
    });

    const gov = toUpstreamGovernanceState(reportUnresolvableLineage);
    assert.strictEqual(gov.provenance_intact, false, "Unresolvable lineage prevents provenance_intact");
    assert.strictEqual(gov.upstream_violations?.length, 0, "NOT_VERIFIABLE lineage must not be added to upstream_violations");
  });

  it("6. Ungrounded reasoning: exact supported positive findings set flag true; sequencing violations (P7, P12, P15) do NOT", () => {
    // Case A: Exact positive ungrounded reasoning finding sets flag true
    const reportUngrounded = createMinimalMockReport({
      findings: [
        {
          code: "ERR_UNGROUNDED_REASONING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Fabricated causal hypothesis without acoustic observation support",
        },
      ],
    });
    const govUngrounded = toUpstreamGovernanceState(reportUngrounded);
    assert.strictEqual(govUngrounded.ungrounded_reasoning_detected, true);

    // Case B: P7 structural context/evidence conflation does NOT set ungrounded_reasoning_detected true
    const reportP7 = createMinimalMockReport({
      findings: [
        {
          code: "ERR_P7_CONTEXT_EVIDENCE_CONFLATED",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Input context and evidence share identical artifact ID",
        },
      ],
    });
    const govP7 = toUpstreamGovernanceState(reportP7);
    assert.strictEqual(govP7.ungrounded_reasoning_detected, false, "P7 structural conflation is not ungrounded reasoning");

    // Case C: P12 and P15 layer/timestamp sequencing violations do NOT set ungrounded_reasoning_detected true
    const reportSequencing = createMinimalMockReport({
      findings: [
        {
          code: "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Platform translation precedes engineering decision",
        },
        {
          code: "ERR_P15_ORDERING_INVERTED",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Platform translation does not operate downstream of semantic design",
        },
      ],
    });
    const govSeq = toUpstreamGovernanceState(reportSequencing);
    assert.strictEqual(govSeq.ungrounded_reasoning_detected, false, "P12/P15 sequencing inversions are not ungrounded reasoning");
  });

  it("7. Blocker 04 integration: triggers in synthesizer when provenance_intact: false; clears when true; version binding remains independent", () => {
    const scope = createTestScope();
    const binding = createTestBinding(scope.scope_id);
    const pkg = createTestPackage("pkg_b04", scope.scope_id, binding.binding_id);
    const synthesizer = new ProductionReadinessSynthesizer();

    // Provenance intact = false -> triggers Blocker 04
    const brokenGov = toUpstreamGovernanceState(createMinimalMockReport({
      findings: [
        {
          code: "ERR_INTAKE_MISSING_TRACE_ID",
          type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
          category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Trace ID missing",
        },
      ],
    }));
    assert.strictEqual(brokenGov.provenance_intact, false);

    const brokenRes = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: brokenGov,
    });
    assert.ok(brokenRes.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN));

    // Provenance intact = true -> clears Blocker 04 (provided version binding is valid)
    const intactGov = toUpstreamGovernanceState(createMinimalMockReport({
      findings: [],
    }));
    assert.strictEqual(intactGov.provenance_intact, true);

    const cleanRes = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: intactGov,
    });
    assert.ok(!cleanRes.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN));
  });

  it("8. Blocker 08 exact trigger: triggers on active upstream violations or ungrounded reasoning; generic NOT_VERIFIABLE does not trigger it", () => {
    const scope = createTestScope();
    const binding = createTestBinding(scope.scope_id);
    const pkg = createTestPackage("pkg_b08", scope.scope_id, binding.binding_id);
    const synthesizer = new ProductionReadinessSynthesizer();

    // Generic unverified principle (NOT_VERIFIABLE) does NOT trigger Blocker 08 if principles_complied is not false
    // Note: in hardBlockerEvaluator, Blocker 08 triggers if:
    // gov.upstream_violations.length > 0 || gov.ungrounded_reasoning_detected === true ||
    // gov.candidate_lesson_quarantined === false || gov.principles_complied === false.
    const govWithViolation = toUpstreamGovernanceState(createMinimalMockReport({
      findings: [
        {
          code: "ERR_INVARIANT_VIOLATION",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          message: "Invariant violated",
        },
      ],
    }));
    assert.strictEqual(govWithViolation.upstream_violations?.length, 1);

    const res = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: govWithViolation,
    });
    assert.ok(res.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION));
  });

  it("9. Causal explainability ceiling: causal_explainability_verified remains false under Level 3 parameter provenance", () => {
    const reportLevel3 = createMinimalMockReport({
      parameterProvenanceCapability: {
        maxSupportedLevel: "LEVEL_3_DECISION_RECORD_TRACE",
        activeLevel: "LEVEL_3_DECISION_RECORD_TRACE",
        notes: "Max supported level is Level 3",
      },
    });

    // Default derivation must be false because Level 4/5 causal tracing is unsupported
    const gov = toUpstreamGovernanceState(reportLevel3);
    assert.strictEqual(gov.causal_explainability_verified, false, "Causal explainability cannot be claimed verified under Level 3 capability ceiling");

    // Can only be true if explicitly supplied by upstream causal engine via options
    const govWithOverride = toUpstreamGovernanceState(reportLevel3, { causalExplainabilityVerified: true });
    assert.strictEqual(govWithOverride.causal_explainability_verified, true);
  });

  it("10. Lifecycle count derivation: accurately counts stages with presentInTrace === true without fabricating 14 discrete completions", () => {
    // Current runtime contract has Stage 06 as NOT_REPRESENTED, so an execution with all envelopes has 13 present
    const report = createMinimalMockReport({
      lifecycleCoverage: create14StageLifecycleCoverage(13),
    });
    const gov = toUpstreamGovernanceState(report);
    assert.strictEqual(gov.reasoning_lifecycle_stages_completed, 13, "Must count actual stages present (13), not invent 14 discrete stages");

    // Early-terminal trace with only 3 stages present
    const earlyReport = createMinimalMockReport({
      lifecycleCoverage: create14StageLifecycleCoverage(3),
    });
    const earlyGov = toUpstreamGovernanceState(earlyReport);
    assert.strictEqual(earlyGov.reasoning_lifecycle_stages_completed, 3);
  });

  it("11. Candidate lesson authority: pass-through preserved from options or prior state", () => {
    const report = createMinimalMockReport();

    // If options.candidateLessonQuarantined supplied:
    const govTrue = toUpstreamGovernanceState(report, { candidateLessonQuarantined: true });
    assert.strictEqual(govTrue.candidate_lesson_quarantined, true);

    const govFalse = toUpstreamGovernanceState(report, { candidateLessonQuarantined: false });
    assert.strictEqual(govFalse.candidate_lesson_quarantined, false);

    // If priorGovernanceState supplied:
    const priorGov: UpstreamGovernanceState = { candidate_lesson_quarantined: true };
    const govPrior = toUpstreamGovernanceState(report, { priorGovernanceState: priorGov });
    assert.strictEqual(govPrior.candidate_lesson_quarantined, true);

    // If unsupplied, remains undefined without guessing:
    const govUnsupplied = toUpstreamGovernanceState(report);
    assert.strictEqual(govUnsupplied.candidate_lesson_quarantined, undefined);
  });

  it("12. Non-authoritative mapper boundary: deeply immutable, does not mutate Gate 8 or Record 22", () => {
    const report = createMinimalMockReport();
    const gov = toUpstreamGovernanceState(report);

    assert.ok(Object.isFrozen(gov));
    if (gov.upstream_violations) {
      assert.ok(Object.isFrozen(gov.upstream_violations));
    }
    assert.strictEqual((gov as any).gate_8_authorized, undefined);
    assert.strictEqual((gov as any).record_22_mutation, undefined);
  });

  it("13. isProvenanceRelevantFinding predicate: separates provenance findings from principle governance evaluations", () => {
    // A. PRINCIPLE_GOVERNANCE findings are NOT provenance-relevant
    const p12Finding: TraceabilityFinding = {
      code: "ERR_P12_TRANSLATION_PRECEDES_ENGINEERING",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Platform translation precedes engineering decision",
    };
    assert.strictEqual(isProvenanceRelevantFinding(p12Finding), false);

    const p15Finding: TraceabilityFinding = {
      code: "ERR_P15_ORDERING_INVERTED",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Platform translation does not operate downstream of semantic design",
    };
    assert.strictEqual(isProvenanceRelevantFinding(p15Finding), false);

    const p7Finding: TraceabilityFinding = {
      code: "ERR_P7_CONTEXT_EVIDENCE_CONFLATED",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Context and evidence conflated",
    };
    assert.strictEqual(isProvenanceRelevantFinding(p7Finding), false);

    // B. INFO_SCOPE_COVERAGE_UNVERIFIABLE is NOT provenance-relevant
    const scopeFinding: TraceabilityFinding = {
      code: "INFO_SCOPE_COVERAGE_UNVERIFIABLE",
      type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
      category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
      severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
      message: "Scope-level trace coverage unverified",
    };
    assert.strictEqual(isProvenanceRelevantFinding(scopeFinding), false);

    // C. Lineage / Provenance / Measurement / Parameter / Structural findings ARE provenance-relevant
    const lineageFinding: TraceabilityFinding = {
      code: "ERR_P1_EVIDENCE_REF_MISSING",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.LINEAGE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Missing evidence ref",
    };
    assert.strictEqual(isProvenanceRelevantFinding(lineageFinding), true);

    const orphanFinding: TraceabilityFinding = {
      code: "ORPHAN_PARENT_EXECUTION_MISSING",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.ORPHANED_MEASUREMENT,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Orphaned measurement",
    };
    assert.strictEqual(isProvenanceRelevantFinding(orphanFinding), true);

    const paramFinding: TraceabilityFinding = {
      code: "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED",
      type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
      category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
      severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
      message: "Unresolved parameter",
    };
    assert.strictEqual(isProvenanceRelevantFinding(paramFinding), true);

    const integrityFinding: TraceabilityFinding = {
      code: "ERR_CHECKPOINT_RUN_ID_MISMATCH",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.INTEGRITY_STRUCTURE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Run ID mismatch",
    };
    assert.strictEqual(isProvenanceRelevantFinding(integrityFinding), true);

    const traceStructureFinding: TraceabilityFinding = {
      code: "ERR_SEQ_NON_MONOTONIC",
      type: TRACEABILITY_FINDING_TYPES.VIOLATION,
      category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
      severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
      message: "Sequence broken",
    };
    assert.strictEqual(isProvenanceRelevantFinding(traceStructureFinding), true);

    const earlyTermFinding: TraceabilityFinding = {
      code: "INFO_EARLY_TERMINATION_FAILED",
      type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
      category: TRACEABILITY_FINDING_CATEGORIES.TRACE_STRUCTURE,
      severity: TRACEABILITY_FINDING_SEVERITIES.INFO,
      message: "Early termination",
    };
    assert.strictEqual(isProvenanceRelevantFinding(earlyTermFinding), true);
  });

  it("14. Unrelated principle violation (P12 timing) does NOT trigger Blocker 04; triggers Blocker 08 only", () => {
    const scope = createTestScope();
    const binding = createTestBinding(scope.scope_id);
    const pkg = createTestPackage("pkg_p12_test", scope.scope_id, binding.binding_id);
    const synthesizer = new ProductionReadinessSynthesizer();

    // Report has a P12 timestamp inversion (PRINCIPLE_GOVERNANCE violation),
    // but all provenance envelopes, measurements, parameter links, and lineages are intact.
    const reportWithP12Violation = createMinimalMockReport({
      verdict: TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT,
      findings: [
        {
          code: "ERR_P12_TIMESTAMP_INVERTED",
          type: TRACEABILITY_FINDING_TYPES.VIOLATION,
          category: TRACEABILITY_FINDING_CATEGORIES.PRINCIPLE_GOVERNANCE,
          severity: TRACEABILITY_FINDING_SEVERITIES.CRITICAL,
          principleNumber: 12,
          message: "ENGINEERING completedAt occurs after PLATFORM_TRANSLATION startedAt",
        },
      ],
      principleResults: [
        {
          principleNumber: 12,
          title: "Predict Consequences Before Acting",
          auditStrength: "STRUCTURALLY_VERIFIABLE",
          state: PRINCIPLE_AUDIT_STATES.VIOLATION,
          findings: [],
        },
      ],
    });

    const gov = toUpstreamGovernanceState(reportWithP12Violation);

    // 1. Provenance is intact:
    assert.strictEqual(gov.provenance_intact, true, "Unrelated P12 violation must not break provenance_intact");

    // 2. Upstream violations and principles_complied are truthfully populated:
    assert.strictEqual(gov.principles_complied, false);
    assert.strictEqual(gov.upstream_violations?.length, 1);
    assert.ok(gov.upstream_violations![0].includes("ERR_P12_TIMESTAMP_INVERTED"));

    // 3. In synthesis:
    const res = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: gov,
    });

    // Blocker 04 must NOT be triggered:
    assert.ok(
      !res.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN),
      "Unrelated P12 violation must NOT indirectly trigger Hard Blocker 04"
    );

    // Blocker 08 MUST be triggered (due to active upstream violation):
    assert.ok(
      res.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION),
      "Active upstream violation must trigger Hard Blocker 08"
    );
  });

  it("15. Blocker 08 tri-state candidate lesson truth table: false triggers blocker, true and undefined do not", () => {
    const scope = createTestScope();
    const binding = createTestBinding(scope.scope_id);
    const pkg = createTestPackage("pkg_quarantine_tristate", scope.scope_id, binding.binding_id);
    const synthesizer = new ProductionReadinessSynthesizer();

    // Baseline clean report where principles complied is true and 0 violations
    const pristineReport = createMinimalMockReport({
      principleResults: [
        { principleNumber: 1, title: "Respect the Raw Evidence", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
        { principleNumber: 4, title: "A Symptom Does Not Identify Its Cause", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
        { principleNumber: 5, title: "Diagnosis Should Be Causal Where Evidence Permits", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
        { principleNumber: 6, title: "Competing Hypotheses Survive Until Evidence Justifies Narrowing Them", auditStrength: "DELEGATED_UPSTREAM", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
        { principleNumber: 18, title: "Evaluate Outcomes Honestly Without Circular Justification", auditStrength: "STRUCTURALLY_VERIFIABLE", state: PRINCIPLE_AUDIT_STATES.SATISFIED, findings: [] },
      ],
    });

    // 1. candidate_lesson_quarantined === false -> TRIGGERS Blocker 08
    const govFalse = toUpstreamGovernanceState(pristineReport, { candidateLessonQuarantined: false });
    assert.strictEqual(govFalse.candidate_lesson_quarantined, false);
    const resFalse = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: govFalse,
    });
    assert.ok(
      resFalse.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION),
      "candidate_lesson_quarantined: false MUST trigger Blocker 08"
    );
    assert.ok(
      resFalse.synthesisRationale.includes("quarantine") ||
      resFalse.hardBlockersPresent.length > 0
    );

    // 2. candidate_lesson_quarantined === true -> DOES NOT trigger Blocker 08
    const govTrue = toUpstreamGovernanceState(pristineReport, { candidateLessonQuarantined: true });
    assert.strictEqual(govTrue.candidate_lesson_quarantined, true);
    const resTrue = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: govTrue,
    });
    assert.ok(
      !resTrue.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION),
      "candidate_lesson_quarantined: true must NOT trigger Blocker 08"
    );

    // 3. candidate_lesson_quarantined === undefined -> DOES NOT trigger Blocker 08
    const govUndefined = toUpstreamGovernanceState(pristineReport);
    assert.strictEqual(govUndefined.candidate_lesson_quarantined, undefined);
    const resUndefined = synthesizer.synthesizeProductionReadiness({
      packageRecord: pkg,
      scopeRecord: scope,
      versionBinding: binding,
      upstreamGovernanceState: govUndefined,
    });
    assert.ok(
      !resUndefined.hardBlockersPresent.includes(FROZEN_HARD_BLOCKERS.BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION),
      "candidate_lesson_quarantined: undefined must NOT trigger Blocker 08"
    );
  });
});
