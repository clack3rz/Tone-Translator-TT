// src/tests/validationReadinessAuditor.test.ts
// Test suite for Phase 1C.5h WP-06:
// Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor (Record 4).
// Bound to frozen specification v0.1j Section 10, Table 04, Table 12, and Implementation Plan v0.1h WP-06.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTAKE_STATUSES,
  PREREQUISITE_STATUSES,
  READINESS_OUTCOMES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  ValidationIntakeRecord,
  ValidationReadinessAssessmentRecord,
  validationReadinessAssessmentRecordSchema,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  GateCompletionToken,
  MANDATORY_READINESS_PREREQUISITES,
  MigrationHandoffPackage,
  PHASE_1C5G_GATE_NAMES,
  Phase1C5gGateName,
  ReadinessAssessmentAuditor,
  ReadinessAssessmentParams,
  ValidationReadinessBlockedError,
} from "../sound-engineer/validation/readiness";

describe("Phase 1C.5h — WP-06: Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor (Record 4)", () => {
  // ---------------------------------------------------------------------------
  // Test Fixture Factories
  // ---------------------------------------------------------------------------

  function createValidGateTokens(): GateCompletionToken[] {
    return PHASE_1C5G_GATE_NAMES.map((gateName, index) => ({
      gate_name: gateName,
      status: "COMPLETE",
      token_id: `token_gate_${index + 1}_sealed`,
      sealed_at: "2026-10-14T00:00:00.000Z",
      authorized_by: "phase_1c5g_migration_official",
    }));
  }

  function createSampleIntakeRecord(overrides?: Partial<ValidationIntakeRecord>): ValidationIntakeRecord {
    return {
      intake_id: "intake_mhp_2026_001",
      timestamp: "2026-10-14T01:00:00.000Z",
      handoff_package_id: "pkg_1c5g_batch_42",
      handoff_package_integrity_ref: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      migration_batch_id: "batch_42",
      requested_by: "Lead Migration Engineer",
      declared_scope: "High Gain Amplifier Family v1",
      frozen_upstream_versions: {
        "1C.5a": "v0.1c",
        "1C.5b": "v0.1a",
        "1C.5c": "v0.1d",
        "1C.5d": "v0.1a",
        "1C.5e": "v0.1b",
        "1C.5f": "v0.1d",
        "1C.5g": "v0.1c",
        "1C.5h_mandate": "v0.1d",
      },
      target_platform_declared_version: "DAW-HOST-BUILD-2026.10",
      intake_status: INTAKE_STATUSES.INTAKE_ACCEPTED,
      record_integrity_metadata: {
        integrity_digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        algorithm: "SHA-256",
        sealed_at: "2026-10-14T01:00:00.000Z",
      },
      ...overrides,
    };
  }

  function createSampleVersionBindingRecord(
    overrides?: Partial<ValidationVersionBindingRecord>
  ): ValidationVersionBindingRecord {
    return {
      binding_id: "binding_scope_001_deadbeef12345678",
      scope_id: "scope_001",
      architecture_version_matrix: {
        "1C.5a_version": { version: "v0.1c", integrity_ref: "sha256:1111" },
        "1C.5b_version": { version: "v0.1a", integrity_ref: "sha256:2222" },
        "1C.5c_version": { version: "v0.1d", integrity_ref: "sha256:3333" },
        "1C.5d_version": { version: "v0.1a", integrity_ref: "sha256:4444" },
        "1C.5e_version": { version: "v0.1b", integrity_ref: "sha256:5555" },
        "1C.5f_version": { version: "v0.1d", integrity_ref: "sha256:6666" },
        "1C.5g_version": { version: "v0.1c", integrity_ref: "sha256:7777" },
        "1C.5h_mandate_version": { version: "v0.1d", integrity_ref: "sha256:8888" },
        "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256:9999" },
      },
      runtime_implementation_version: "git_sha_abc1234567890",
      model_configuration_version: "checkpoint_tt_core_v1.0",
      deterministic_rules_version: "rules_manifest_2026_10",
      gear_catalog_version: "catalog_gear_v1.4",
      platform_exporter_version: "stage12_exporter_v2.1",
      fixture_library_version: "golden_corpus_manifest_v3",
      target_platform_runtime_version: "DAW-HOST-BUILD-2026.10",
      host_environment_version: "UBUNTU_24_04_ALSA_JACK2",
      version_integrity_reference: {
        composite_digest: "sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        algorithm: "SHA-256",
        sealed_at: "2026-10-14T01:30:00.000Z",
        component_digests: {
          "1C.5a_version": "sha256:1111",
        },
      },
      ...overrides,
    };
  }

  function createSampleScopeRecord(): ValidationScopeRecord {
    return {
      scope_id: "scope_001",
      intake_id: "intake_mhp_2026_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_lead_5150", "amp_recto_dual"],
      excluded_units: ["cab_vintage_4x12"],
      boundary_constraints: ["Isolated under Axiom 6"],
      scope_inflation_protection: true,
    };
  }

  function createFullReadyParams(): ReadinessAssessmentParams {
    const intakeRecord = createSampleIntakeRecord();
    const versionBindingRecord = createSampleVersionBindingRecord();
    const scopeRecord = createSampleScopeRecord();
    const gateTokens = createValidGateTokens();

    return {
      intakeRecord,
      versionBindingRecord,
      scopeRecord,
      gateTokens,
      fixtureAssessment: {
        coverageRatio: 1.0,
        totalScopedUnits: 2,
        unitsWithVerifiedFixtures: 2,
        payloadIntegrityVerified: true,
      },
      environmentStatus: {
        isStable: true,
        targetPlatformRuntimeVersion: "DAW-HOST-BUILD-2026.10",
        hostEnvironmentVersion: "UBUNTU_24_04_ALSA_JACK2",
        runtimeImplementationVersion: "git_sha_abc1234567890",
      },
      traceabilityPipelineStatus: {
        isActive: true,
        recorderId: "run_trace_recorder_session_01",
      },
      comparabilityStatus: {
        isCalibrated: true,
        isComparable: true,
      },
      rollbackStagingStatus: {
        isConfigured: true,
        isVerified: true,
      },
      upstreamBlockerStatus: {
        activeCriticalDefects: [],
        quarantineFlags: [],
        blockedCandidateUnits: [],
      },
      timestamp: "2026-10-14T02:00:00.000Z",
      assessorId: "lead_readiness_auditor",
    };
  }

  // ---------------------------------------------------------------------------
  // Check 1: Full Ready Scenario
  // ---------------------------------------------------------------------------
  it("1. evaluates full readiness (READY) when all eight mandatory prerequisites pass and fixture coverage is 100%", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const auditor = new ReadinessAssessmentAuditor({ graph, ledger });

    const params = createFullReadyParams();
    const result = auditor.assessReadiness(params);

    assert.equal(result.isReady, true);
    assert.equal(result.isBlocked, false);
    assert.equal(result.hasDeclaredLimitations, false);
    assert.equal(result.deficiencies.length, 0);

    const record = result.record;
    assert.equal(record.readiness_outcome, READINESS_OUTCOMES.READY);
    assert.equal(record.intake_id, params.intakeRecord.intake_id);
    assert.equal(record.fixture_coverage_ratio, 1.0);
    assert.deepEqual(record.limitation_notes, []);
    assert.equal(record.assessor_id, "lead_readiness_auditor");
    assert.equal(record.assessment_timestamp, "2026-10-14T02:00:00.000Z");
    // Verify exactly 8 evaluated_prerequisites keys with zero gate sub-results
    assert.equal(Object.keys(record.evaluated_prerequisites).length, 8);

    // Verify all 8 Section 10.2 prerequisites are explicitly evaluated to PASS
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED],
      PREREQUISITE_STATUSES.PASS
    );
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS],
      PREREQUISITE_STATUSES.PASS
    );

    // Verify all 7 Phase 1C.5g individual gates are recorded with status PASS
    assert.equal(result.gateAudits.length, 7);
    for (const gate of result.gateAudits) {
      assert.equal(gate.status, PREREQUISITE_STATUSES.PASS);
      assert.equal(gate.tokenPresent, true);
    }

    // Verify schema parse validation
    assert.doesNotThrow(() => validationReadinessAssessmentRecordSchema.parse(record));

    // Verify graph registration
    const graphNode = graph.getNode(record.readiness_id);
    assert.ok(graphNode);
    assert.equal(graphNode.kind, GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord);

    // Verify audit ledger record
    const ledgerEntry = ledger.getLatestEntry();
    assert.ok(ledgerEntry);
    assert.equal(ledgerEntry.entityKind, GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord);
    assert.equal(ledgerEntry.entityId, record.readiness_id);

    // Verify assertReady does not throw
    const asserted = auditor.assertReady(params);
    assert.equal(asserted.record.readiness_id, record.readiness_id);
  });

  // ---------------------------------------------------------------------------
  // Check 2: Missing Phase 1C.5g Gates
  // ---------------------------------------------------------------------------
  it("2. fails with BLOCKED_NOT_EVALUABLE and lists deficiencies when Phase 1C.5g gate tokens are missing", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Remove Gate 4: Shadow Execution Exercised and Gate 6: Rollback Path Operational
    const incompleteTokens = createValidGateTokens().filter(
      (t) =>
        t.gate_name !== "Shadow Execution Exercised" &&
        t.gate_name !== "Rollback Path Operational"
    );

    const params: ReadinessAssessmentParams = {
      ...fullParams,
      gateTokens: incompleteTokens,
    };

    const result = auditor.assessReadiness(params);
    assert.equal(result.isReady, false);
    assert.equal(result.isBlocked, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);

    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );

    // Confirm deficiency log explicitly identifies missing gates
    const gateDeficiency = result.deficiencies.find(
      (d) => d.prerequisite === MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
    );
    assert.ok(gateDeficiency);
    assert.equal(gateDeficiency.status, PREREQUISITE_STATUSES.FAIL);
    assert.ok(gateDeficiency.reason.includes("Shadow Execution Exercised"));
    assert.ok(gateDeficiency.reason.includes("Rollback Path Operational"));

    // assertReady MUST throw ValidationReadinessBlockedError immediately halting pipeline
    assert.throws(
      () => auditor.assertReady(params),
      (err: unknown) => {
        assert.ok(err instanceof ValidationReadinessBlockedError);
        assert.equal(err.readinessRecord.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
        assert.ok(err.message.includes("BLOCKED_NOT_EVALUABLE"));
        return true;
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Check 3: Renamed or Invented 1C.5g Gate Names Rejected
  // ---------------------------------------------------------------------------
  it("3. rejects renamed or invented gate names and fails closed with zero tolerance for substitution", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Substitute Gate 4 with an invented name "Shadow Testing Done"
    const corruptedTokens = createValidGateTokens().map((t) => {
      if (t.gate_name === "Shadow Execution Exercised") {
        return { ...t, gate_name: "Shadow Testing Done" };
      }
      return t;
    });

    const result = auditor.assessReadiness({
      ...fullParams,
      gateTokens: corruptedTokens,
    });

    assert.equal(result.isBlocked, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);

    const gateAudit = result.gateAudits.find((g) => g.gateName === "Shadow Execution Exercised");
    assert.ok(gateAudit);
    assert.equal(gateAudit.status, PREREQUISITE_STATUSES.FAIL);
    assert.equal(gateAudit.tokenPresent, false);
  });

  // ---------------------------------------------------------------------------
  // Check 4: Incomplete / Unsealed Gate Status
  // ---------------------------------------------------------------------------
  it("4. fails prerequisite when a gate token has non-complete status (e.g. IN_PROGRESS)", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const partialTokens = createValidGateTokens().map((t) => {
      if (t.gate_name === "Provenance & Lineage Sealed") {
        return { ...t, status: "IN_PROGRESS" as any };
      }
      return t;
    });

    const result = auditor.assessReadiness({
      ...fullParams,
      gateTokens: partialTokens,
    });

    assert.equal(result.isBlocked, true);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 4a: Missing or Empty token_id Fails Sealed Gate Evidence Requirement
  // ---------------------------------------------------------------------------
  it("4a. fails prerequisite when a gate token lacks a non-empty token_id", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Token with missing token_id
    const missingTokenIdList = createValidGateTokens().map((t) => {
      if (t.gate_name === "Structural Mapping Complete") {
        const { token_id, ...rest } = t;
        return rest as any;
      }
      return t;
    });

    const resultMissing = auditor.assessReadiness({
      ...fullParams,
      gateTokens: missingTokenIdList,
    });
    assert.equal(resultMissing.isBlocked, true);
    assert.equal(
      resultMissing.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );
    const gateAudit = resultMissing.gateAudits.find(
      (g) => g.gateName === "Structural Mapping Complete"
    );
    assert.ok(gateAudit);
    assert.equal(gateAudit.status, PREREQUISITE_STATUSES.FAIL);
    assert.match(gateAudit.deficiencyReason ?? "", /token_id/);

    // Token with empty/whitespace token_id
    const emptyTokenIdList = createValidGateTokens().map((t) => {
      if (t.gate_name === "Structural Mapping Complete") {
        return { ...t, token_id: "   " };
      }
      return t;
    });
    const resultEmpty = auditor.assessReadiness({
      ...fullParams,
      gateTokens: emptyTokenIdList,
    });
    assert.equal(resultEmpty.isBlocked, true);
    assert.equal(
      resultEmpty.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 4b: Missing or Invalid sealed_at Fails Sealed Gate Evidence Requirement
  // ---------------------------------------------------------------------------
  it("4b. fails prerequisite when a gate token lacks a valid ISO 8601 UTC sealed_at timestamp", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Token with missing sealed_at
    const missingSealedAtList = createValidGateTokens().map((t) => {
      if (t.gate_name === "Architectural Compatibility Verified") {
        const { sealed_at, ...rest } = t;
        return rest as any;
      }
      return t;
    });

    const resultMissing = auditor.assessReadiness({
      ...fullParams,
      gateTokens: missingSealedAtList,
    });
    assert.equal(resultMissing.isBlocked, true);
    assert.equal(
      resultMissing.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );
    const gateAudit = resultMissing.gateAudits.find(
      (g) => g.gateName === "Architectural Compatibility Verified"
    );
    assert.ok(gateAudit);
    assert.equal(gateAudit.status, PREREQUISITE_STATUSES.FAIL);
    assert.match(gateAudit.deficiencyReason ?? "", /sealed_at/);

    // Token with non-datetime string
    const invalidSealedAtList = createValidGateTokens().map((t) => {
      if (t.gate_name === "Architectural Compatibility Verified") {
        return { ...t, sealed_at: "not-a-valid-iso-datetime" };
      }
      return t;
    });
    const resultInvalid = auditor.assessReadiness({
      ...fullParams,
      gateTokens: invalidSealedAtList,
    });
    assert.equal(resultInvalid.isBlocked, true);
    assert.equal(
      resultInvalid.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 4c: Canonical Status PASS Accepted Alongside COMPLETE Per Signed-off WP-03
  // ---------------------------------------------------------------------------
  it("4c. accepts canonical completion status 'PASS' as well as 'COMPLETE' per signed-off WP-03", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const passTokens = createValidGateTokens().map((t, idx) => ({
      ...t,
      status: (idx % 2 === 0 ? "PASS" : "COMPLETE") as any,
    }));

    const result = auditor.assessReadiness({
      ...fullParams,
      gateTokens: passTokens,
    });

    assert.equal(result.isReady, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.READY);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ALL_SEVEN_PHASE_1C5G_GATES_DOCUMENTED
      ],
      PREREQUISITE_STATUSES.PASS
    );
  });

  // ---------------------------------------------------------------------------
  // Check 4d: authorized_by Remains Governed Optional Metadata
  // ---------------------------------------------------------------------------
  it("4d. accepts gate tokens when authorized_by is omitted, verifying it remains optional", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Strip authorized_by from all tokens
    const tokensWithoutAuthorizedBy = createValidGateTokens().map((t) => {
      const { authorized_by, ...rest } = t;
      return rest;
    });

    const result = auditor.assessReadiness({
      ...fullParams,
      gateTokens: tokensWithoutAuthorizedBy,
    });

    assert.equal(result.isReady, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.READY);
    for (const g of result.gateAudits) {
      assert.equal(g.status, PREREQUISITE_STATUSES.PASS);
      assert.ok(g.tokenId);
      assert.ok(g.sealedAt);
      assert.equal(g.authorizedBy, undefined);
    }
  });

  // ---------------------------------------------------------------------------
  // Check 4e: Every One of the Seven Gates Audited for Sealed Evidence
  // ---------------------------------------------------------------------------
  it("4e. individually verifies each of the seven Phase 1C.5g gates requires sealed tokens", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    for (const gateName of PHASE_1C5G_GATE_NAMES) {
      // Create tokens where only this specific gate lacks token_id
      const unsealedTokenList = createValidGateTokens().map((t) => {
        if (t.gate_name === gateName) {
          const { token_id, ...rest } = t;
          return rest as any;
        }
        return t;
      });

      const result = auditor.assessReadiness({
        ...fullParams,
        gateTokens: unsealedTokenList,
      });

      assert.equal(result.isBlocked, true, `Gate '${gateName}' must require sealed token`);
      const targetAudit = result.gateAudits.find((g) => g.gateName === gateName);
      assert.ok(targetAudit);
      assert.equal(targetAudit.status, PREREQUISITE_STATUSES.FAIL);
    }
  });

  // ---------------------------------------------------------------------------
  // Check 5: Missing Golden Fixtures (Zero Coverage)
  // ---------------------------------------------------------------------------
  it("5. fails with BLOCKED_NOT_EVALUABLE when golden fixture coverage is zero or omitted", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Zero coverage
    const zeroResult = auditor.assessReadiness({
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 0.0,
        totalScopedUnits: 2,
        unitsWithVerifiedFixtures: 0,
      },
    });

    assert.equal(zeroResult.isBlocked, true);
    assert.equal(zeroResult.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(
      zeroResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY],
      PREREQUISITE_STATUSES.FAIL
    );

    // Omitted fixture assessment
    const omittedResult = auditor.assessReadiness({
      ...fullParams,
      fixtureAssessment: undefined,
    });

    assert.equal(omittedResult.isBlocked, true);
    assert.equal(omittedResult.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(omittedResult.record.fixture_coverage_ratio, 0.0);
  });

  // ---------------------------------------------------------------------------
  // Check 6: Contaminated Golden Fixtures or Failed Payload Integrity
  // ---------------------------------------------------------------------------
  it("6. fails Golden Fixture Availability if fixtures are contaminated or payload integrity fails", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Contamination
    const contamResult = auditor.assessReadiness({
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 1.0,
        contaminatedFixtures: ["stem_lead_hi_gain_contam_01"],
      },
    });
    assert.equal(contamResult.isBlocked, true);
    assert.equal(
      contamResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY],
      PREREQUISITE_STATUSES.FAIL
    );

    // Failed integrity
    const integrityResult = auditor.assessReadiness({
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 1.0,
        payloadIntegrityVerified: false,
      },
    });
    assert.equal(integrityResult.isBlocked, true);
    assert.equal(
      integrityResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 7: Partial Golden Fixture Coverage produces READY_WITH_DECLARED_LIMITATIONS
  // ---------------------------------------------------------------------------
  it("7. produces READY_WITH_DECLARED_LIMITATIONS with explicit limitation notes for partial fixture coverage", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const partialParams: ReadinessAssessmentParams = {
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 0.85,
        totalScopedUnits: 20,
        unitsWithVerifiedFixtures: 17,
        missingFixtureUnits: ["amp_custom_ch3", "amp_custom_ch4", "pedal_fuzz_rare"],
        payloadIntegrityVerified: true,
      },
      limitationNotes: [
        "Scope bounded to channels 1 and 2; rare fuzz pedal fixtures pending lab digitisation.",
      ],
    };

    const result = auditor.assessReadiness(partialParams);
    assert.equal(result.isReady, true);
    assert.equal(result.isBlocked, false);
    assert.equal(result.hasDeclaredLimitations, true);

    const record = result.record;
    assert.equal(record.readiness_outcome, READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS);
    assert.equal(record.fixture_coverage_ratio, 0.85);

    // Golden fixture availability is PASS because the evaluable subset is valid
    assert.equal(
      record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.GOLDEN_FIXTURE_AVAILABILITY],
      PREREQUISITE_STATUSES.PASS
    );

    // Contains caller notes plus automatic partial fixture coverage note
    assert.ok(record.limitation_notes.length >= 2);
    assert.ok(record.limitation_notes.some((n) => n.includes("rare fuzz pedal")));
    assert.ok(record.limitation_notes.some((n) => n.includes("85%")));

    // assertReady does not throw for READY_WITH_DECLARED_LIMITATIONS
    assert.doesNotThrow(() => auditor.assertReady(partialParams));
  });

  // ---------------------------------------------------------------------------
  // Check 7a: Arbitrary Caller Notes Do Not Create Limited Readiness
  // ---------------------------------------------------------------------------
  it("7a. verifies arbitrary limitation notes do not alter READY outcome when all prerequisites pass and fixture coverage is 100%", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const resultWithNotes = auditor.assessReadiness({
      ...fullParams,
      limitationNotes: ["Arbitrary caller comment", "Non-governed observation"],
    });

    assert.equal(resultWithNotes.isReady, true);
    assert.equal(resultWithNotes.isFullyReady, true);
    assert.equal(resultWithNotes.hasDeclaredLimitations, false);
    assert.equal(resultWithNotes.record.readiness_outcome, READINESS_OUTCOMES.READY);
    assert.equal(resultWithNotes.record.fixture_coverage_ratio, 1.0);
  });

  // ---------------------------------------------------------------------------
  // Check 8: Execution Environment Instability or Version Mismatch
  // ---------------------------------------------------------------------------
  it("8. fails Execution Environment Stability on host/platform version mismatch or instability", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Mismatched target platform version
    const mismatchResult = auditor.assessReadiness({
      ...fullParams,
      environmentStatus: {
        isStable: true,
        targetPlatformRuntimeVersion: "DAW-HOST-BUILD-UNAPPROVED-2027.01",
      },
    });

    assert.equal(mismatchResult.isBlocked, true);
    assert.equal(
      mismatchResult.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY
      ],
      PREREQUISITE_STATUSES.FAIL
    );
    assert.ok(
      mismatchResult.deficiencies.some((d) => d.reason.includes("Target-platform runtime mismatch"))
    );

    // Harness marked unstable
    const unstableResult = auditor.assessReadiness({
      ...fullParams,
      environmentStatus: {
        isStable: false,
        failureReason: "Audio buffer underruns in JACK2 audio engine daemon",
      },
    });
    assert.equal(unstableResult.isBlocked, true);
    assert.equal(
      unstableResult.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.EXECUTION_ENVIRONMENT_STABILITY
      ],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 9: Traceability Pipeline Inactive
  // ---------------------------------------------------------------------------
  it("9. fails Traceability Pipeline Active prerequisite when Phase 1C.5f RunTrace recorder is inactive", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const result = auditor.assessReadiness({
      ...fullParams,
      traceabilityPipelineStatus: {
        isActive: false,
        failureReason: "Phase 1C.5f RunTrace socket connection timed out",
      },
    });

    assert.equal(result.isBlocked, true);
    assert.equal(
      result.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE],
      PREREQUISITE_STATUSES.FAIL
    );
    assert.ok(
      result.deficiencies.some((d) => d.prerequisite === MANDATORY_READINESS_PREREQUISITES.TRACEABILITY_PIPELINE_ACTIVE)
    );
  });

  // ---------------------------------------------------------------------------
  // Check 10: Comparability Unverified (PATH-PROD vs PATH-SHADOW)
  // ---------------------------------------------------------------------------
  it("10. fails Comparability Verified prerequisite if harnesses are uncalibrated or discrepant", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const uncalibratedResult = auditor.assessReadiness({
      ...fullParams,
      comparabilityStatus: {
        isCalibrated: false,
        isComparable: true,
        failureReason: "Null test calibration delta exceeds -90 dBFS baseline floor",
      },
    });

    assert.equal(uncalibratedResult.isBlocked, true);
    assert.equal(
      uncalibratedResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED],
      PREREQUISITE_STATUSES.FAIL
    );

    const incomparableResult = auditor.assessReadiness({
      ...fullParams,
      comparabilityStatus: {
        isCalibrated: true,
        isComparable: false,
        failureReason: "DSP latency discrepancy detected between PATH-PROD and PATH-SHADOW",
      },
    });

    assert.equal(incomparableResult.isBlocked, true);
    assert.equal(
      incomparableResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.COMPARABILITY_VERIFIED],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 11: Rollback Staging Unverified
  // ---------------------------------------------------------------------------
  it("11. fails Rollback Staging Verified prerequisite if PATH-ROLLBACK is unconfigured or unverified", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const unverifiedResult = auditor.assessReadiness({
      ...fullParams,
      rollbackStagingStatus: {
        isConfigured: true,
        isVerified: false,
        failureReason: "Automated failover dry-run timed out at 850ms (exceeds 500ms RTO limit)",
      },
    });

    assert.equal(unverifiedResult.isBlocked, true);
    assert.equal(
      unverifiedResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.ROLLBACK_STAGING_VERIFIED],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 12: Upstream Critical Defects or Quarantine Flags
  // ---------------------------------------------------------------------------
  it("12. marks Absence of Unresolved Upstream Blockers as BLOCKED when defects or quarantines exist", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const blockerResult = auditor.assessReadiness({
      ...fullParams,
      upstreamBlockerStatus: {
        activeCriticalDefects: ["CRIT-DEFECT-1C5G-DSP-01"],
        quarantineFlags: ["QUARANTINE_CAB_MIC_NOTCH"],
        blockedCandidateUnits: ["amp_recto_dual"],
      },
    });

    assert.equal(blockerResult.isBlocked, true);
    assert.equal(
      blockerResult.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.BLOCKED
    );
    assert.ok(
      blockerResult.deficiencies.some((d) =>
        d.reason.includes("CRIT-DEFECT-1C5G-DSP-01")
      )
    );
  });

  // ---------------------------------------------------------------------------
  // Check 12a: Included-Unit Blocker Blocks Readiness
  // ---------------------------------------------------------------------------
  it("12a. blocks readiness when an active blocker affects an included scoped candidate unit", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const result = auditor.assessReadiness({
      ...fullParams,
      upstreamBlockerStatus: {
        blockers: [
          {
            blockerId: "BLOCKER-INC-01",
            description: "DSP issue in 5150 lead channel",
            affectedUnits: ["amp_lead_5150"],
            isActive: true,
          },
        ],
      },
    });

    assert.equal(result.isBlocked, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.BLOCKED
    );
    assert.ok(result.deficiencies.some((d) => d.reason.includes("amp_lead_5150")));
  });

  // ---------------------------------------------------------------------------
  // Check 12b: Excluded-Unit Blocker Does NOT Block Readiness
  // ---------------------------------------------------------------------------
  it("12b. does NOT block readiness when a blocker affects only explicitly excluded units", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const result = auditor.assessReadiness({
      ...fullParams,
      upstreamBlockerStatus: {
        blockers: [
          {
            blockerId: "BLOCKER-EXC-01",
            description: "Defect in vintage 4x12 cab model",
            affectedUnits: ["cab_vintage_4x12"], // Explicitly in excluded_units
            isActive: true,
          },
        ],
      },
    });

    assert.equal(result.isReady, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.READY);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.PASS
    );
  });

  // ---------------------------------------------------------------------------
  // Check 12c: Unrelated-Unit Blocker Outside Scope Does NOT Block Readiness
  // ---------------------------------------------------------------------------
  it("12c. does NOT block readiness when a blocker affects candidate units outside declared scope", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const result = auditor.assessReadiness({
      ...fullParams,
      upstreamBlockerStatus: {
        blockers: [
          {
            blockerId: "BLOCKER-UNRELATED-01",
            description: "Defect in outboard chorus pedal unit",
            affectedUnits: ["pedal_chorus_vintage_80s"], // Neither in included nor excluded
            isActive: true,
          },
        ],
      },
    });

    assert.equal(result.isReady, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.READY);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.PASS
    );
  });

  // ---------------------------------------------------------------------------
  // Check 12d: Global Blocker Blocks Readiness Across All Scoped Units
  // ---------------------------------------------------------------------------
  it("12d. blocks readiness when an active blocker is explicitly marked global", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const result = auditor.assessReadiness({
      ...fullParams,
      upstreamBlockerStatus: {
        blockers: [
          {
            blockerId: "BLOCKER-GLOBAL-01",
            description: "Global memory buffer overrun in audio engine host",
            isGlobal: true,
            isActive: true,
          },
        ],
      },
    });

    assert.equal(result.isBlocked, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.BLOCKED
    );
    assert.ok(result.deficiencies.some((d) => d.reason.includes("Global Blocker")));
  });

  // ---------------------------------------------------------------------------
  // Check 12e: Missing Blocker Evidence Fails Closed
  // ---------------------------------------------------------------------------
  it("12e. fails closed with BLOCKED status when upstream blocker readiness evidence is omitted", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    const { upstreamBlockerStatus, ...paramsWithoutBlockerEvidence } = fullParams;
    const result = auditor.assessReadiness(paramsWithoutBlockerEvidence);

    assert.equal(result.isBlocked, true);
    assert.equal(result.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(
      result.record.evaluated_prerequisites[
        MANDATORY_READINESS_PREREQUISITES.ABSENCE_OF_UNRESOLVED_UPSTREAM_BLOCKERS
      ],
      PREREQUISITE_STATUSES.BLOCKED
    );
    assert.ok(
      result.deficiencies.some((d) =>
        d.reason.includes("absence of blockers cannot be verified (fail-closed)")
      )
    );
  });

  // ---------------------------------------------------------------------------
  // Check 13: Handoff Package Verification (INTAKE_REJECTED or Integrity Mismatch)
  // ---------------------------------------------------------------------------
  it("13. fails Handoff Integrity when intake was rejected or package integrity reference mismatches", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const fullParams = createFullReadyParams();

    // Rejected intake
    const rejectedIntake = createSampleIntakeRecord({
      intake_status: INTAKE_STATUSES.INTAKE_REJECTED,
      rejection_reason: "Tampered package signature",
    });

    const rejectedResult = auditor.assessReadiness({
      ...fullParams,
      intakeRecord: rejectedIntake,
    });

    assert.equal(rejectedResult.isBlocked, true);
    assert.equal(
      rejectedResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY],
      PREREQUISITE_STATUSES.FAIL
    );

    // Package integrity ref mismatch
    const mismatchedPackage: MigrationHandoffPackage = {
      package_id: fullParams.intakeRecord.handoff_package_id,
      migration_batch_id: "batch_42",
      requested_by: "Lead Migration Engineer",
      declared_scope: "High Gain Amplifier Family v1",
      frozen_upstream_versions: fullParams.intakeRecord.frozen_upstream_versions,
      target_platform_declared_version: "DAW-HOST-BUILD-2026.10",
      gates: createValidGateTokens(),
      integrity_ref: "sha256:DIFFERENT_HASH_CORRUPTED",
      signature: "sig_valid",
      signer_identity: "signer_01",
      signer_role: "phase_1c5g_migration_official",
    };

    const packageMismatchResult = auditor.assessReadiness({
      ...fullParams,
      handoffPackage: mismatchedPackage,
    });

    assert.equal(packageMismatchResult.isBlocked, true);
    assert.equal(
      packageMismatchResult.record.evaluated_prerequisites[MANDATORY_READINESS_PREREQUISITES.HANDOFF_INTEGRITY],
      PREREQUISITE_STATUSES.FAIL
    );
  });

  // ---------------------------------------------------------------------------
  // Check 14: Deterministic Readiness ID & Immutability
  // ---------------------------------------------------------------------------
  it("14. produces deterministic readiness_id and enforces deep-freeze immutability on Record 4", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const params = createFullReadyParams();

    const result1 = auditor.assessReadiness(params);
    const result2 = auditor.assessReadiness(params);

    // Deterministic readiness ID
    assert.equal(result1.record.readiness_id, result2.record.readiness_id);

    // Deep freeze immutability
    assert.throws(() => {
      (result1.record as any).readiness_outcome = "TAMPERED";
    });
    assert.throws(() => {
      (result1.record.limitation_notes as any).push("Tampered note");
    });
    assert.throws(() => {
      (result1.record.evaluated_prerequisites as any)["New Key"] = "PASS";
    });
  });

  // ---------------------------------------------------------------------------
  // Check 14a: Full-Digest Readiness Identity Discriminator
  // ---------------------------------------------------------------------------
  it("14a. derives readiness_id using full deterministic state digest without truncation", () => {
    const auditor = new ReadinessAssessmentAuditor();
    const params = createFullReadyParams();
    const result = auditor.assessReadiness(params);

    const prefix = `readiness_${params.intakeRecord.intake_id}_`;
    assert.ok(result.record.readiness_id.startsWith(prefix));
    const digestPart = result.record.readiness_id.slice(prefix.length);
    // SHA-256 hex digest is exactly 64 characters
    assert.equal(digestPart.length, 64);
    assert.match(digestPart, /^[0-9a-f]{64}$/);
  });

  // ---------------------------------------------------------------------------
  // Check 14b: Blocked -> Ready Reassessment History Preserves Immutable Audit Trail
  // ---------------------------------------------------------------------------
  it("14b. preserves immutable historical blocked assessment when reassessment becomes READY", () => {
    const ledger = new ValidationAuditLedger();
    const auditor = new ReadinessAssessmentAuditor({ ledger });
    const fullParams = createFullReadyParams();

    // Assessment A: Blocked because golden fixtures unavailable (coverage = 0)
    const paramsBlocked: ReadinessAssessmentParams = {
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 0.0,
        totalScopedUnits: 2,
        unitsWithVerifiedFixtures: 0,
      },
    };
    const resultA = auditor.assessReadiness(paramsBlocked);
    assert.equal(resultA.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    const idA = resultA.record.readiness_id;

    // Assessment B: Same intake, but fixtures are later supplied (coverage = 100%)
    const paramsReady: ReadinessAssessmentParams = {
      ...fullParams,
      fixtureAssessment: {
        coverageRatio: 1.0,
        totalScopedUnits: 2,
        unitsWithVerifiedFixtures: 2,
        payloadIntegrityVerified: true,
      },
    };
    const resultB = auditor.assessReadiness(paramsReady);
    assert.equal(resultB.record.readiness_outcome, READINESS_OUTCOMES.READY);
    const idB = resultB.record.readiness_id;

    // Required: distinct readiness_id
    assert.notEqual(idA, idB);

    // Required: Assessment A remains in cache and is immutable
    const cachedA = auditor.getAssessment(idA);
    assert.ok(cachedA);
    assert.equal(cachedA.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);
    assert.equal(resultA.record.readiness_outcome, READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE);

    // Required: both records exist in audit ledger history
    const ledgerEntries = ledger.getEntries();
    assert.equal(ledgerEntries.length, 2);
    assert.equal(ledgerEntries[0].entityId, idA);
    assert.equal(ledgerEntries[1].entityId, idB);
  });

  // ---------------------------------------------------------------------------
  // Check 14c: Identical Reassessment Replay Is Idempotent
  // ---------------------------------------------------------------------------
  it("14c. replaying identical readiness state is idempotent and creates zero duplicate ledger records", () => {
    const ledger = new ValidationAuditLedger();
    const auditor = new ReadinessAssessmentAuditor({ ledger });
    const params = createFullReadyParams();

    const firstRun = auditor.assessReadiness(params);
    assert.equal(ledger.getEntries().length, 1);

    // Replay with identical governed parameters
    const secondRun = auditor.assessReadiness(params);
    assert.equal(secondRun.record.readiness_id, firstRun.record.readiness_id);
    assert.equal(secondRun.record.readiness_outcome, firstRun.record.readiness_outcome);

    // Zero duplicate ledger entries
    assert.equal(ledger.getEntries().length, 1);
  });

  // ---------------------------------------------------------------------------
  // Check 15: Zero Edge Expansion / Strict Graph & Ledger Preservation
  // ---------------------------------------------------------------------------
  it("15. registers Record 4 node and ledger entry without expanding 14 governed edge types", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const auditor = new ReadinessAssessmentAuditor({ graph, ledger });

    const params = createFullReadyParams();
    const result = auditor.assessReadiness(params);

    // Node registered
    const node = graph.getNode(result.record.readiness_id);
    assert.ok(node);
    assert.equal(node.kind, GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord);

    // Zero edges added (Record 4 does not create invented edges)
    assert.equal(graph.getEdges().length, 0);

    // Ledger entry appended
    const entry = ledger.getLatestEntry();
    assert.ok(entry);
    assert.equal(entry.entityKind, GOVERNED_ENTITY_KINDS.ValidationReadinessAssessmentRecord);
    assert.equal(entry.entityId, result.record.readiness_id);

    // Ledger chain integrity verified
    const integrityCheck = ledger.verifyLedger();
    assert.equal(integrityCheck.isValid, true);
  });
});
