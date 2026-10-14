// src/tests/validationScope.test.ts
// Test suite for Phase 1C.5h WP-04:
// Validation Scope Boundary & Inflation Protection Subsystem (Record 2).
// Bound to frozen specification v0.1j Section 9, Table 18, Condition 20, and Implementation Plan v0.1h WP-04.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INTAKE_STATUSES,
  VALIDATION_PRIMARY_DOMAINS,
  TEST_PROFILE_FAMILIES,
  FIXTURE_CLASSES,
  REQUIRED_EVIDENCE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  ValidationIntakeRecord,
  ValidationScopeRecord,
  ValidationCase,
  TestProfileRecord,
  ValidationFixtureRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  ValidationScopeManager,
  ScopeEnforcer,
  SCOPE_FAILURE_CONDITIONS,
  ScopeDerivationError,
  ScopeWildcardRejectionError,
  ScopeInflationError,
  parseScopeDefinition,
  validateNoWildcards,
} from "../sound-engineer/validation/scope";

function createAcceptedIntakeRecord(overrides?: Partial<ValidationIntakeRecord>): ValidationIntakeRecord {
  return {
    intake_id: "intake_test_pkg_001",
    timestamp: new Date().toISOString(),
    handoff_package_id: "test_pkg_001",
    handoff_package_integrity_ref: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    migration_batch_id: "batch_2026_10_14",
    requested_by: "lead_sound_architect",
    declared_scope: "High-Gain Lead Amplifier Models (American Preamp Line)",
    frozen_upstream_versions: {
      "1C.5a": "v0.3c",
      "1C.5b": "v0.2f",
      "1C.5c": "v0.1d",
      "1C.5d": "v0.1l",
      "1C.5e": "v0.1m",
      "1C.5f": "v0.1j",
      "1C.5g": "v0.1e",
      "1C.5h_mandate": "v0.1d",
    },
    target_platform_declared_version: "AmpliTube 5 v5.11.0",
    intake_status: INTAKE_STATUSES.INTAKE_ACCEPTED,
    record_integrity_metadata: {
      integrity_digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
      algorithm: "SHA-256",
      sealed_at: new Date().toISOString(),
      signer_identity: "validation_intake_service",
      canonical_serialization_format: "CANONICAL-JSON",
    },
    ...overrides,
  };
}

describe("Phase 1C.5h — WP-04: Validation Scope Boundary & Inflation Protection Subsystem", () => {
  // -------------------------------------------------------------------------
  // 1. Acceptance Prerequisite & Derivation
  // -------------------------------------------------------------------------
  it("A. Derives canonical ValidationScopeRecord (Record 2) from an accepted intake record", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const manager = new ValidationScopeManager(graph, ledger);

    const intake = createAcceptedIntakeRecord({
      declared_scope: JSON.stringify({
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: ["amp_american_lead_ch1", "amp_american_lead_ch2"],
        excluded_units: ["amp_british_clean", "bass_combo_100"],
        boundary_constraints: ["44.1kHz and 48kHz audio rates strictly bound", "Mono-to-Stereo topology only"],
        scope_inflation_protection: true,
      }),
    });

    const scopeRecord = manager.deriveScope(intake);

    assert.equal(scopeRecord.scope_id, "scope_intake_test_pkg_001");
    assert.equal(scopeRecord.intake_id, "intake_test_pkg_001");
    assert.equal(scopeRecord.primary_domain, VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY);
    assert.deepEqual(scopeRecord.included_units, ["amp_american_lead_ch1", "amp_american_lead_ch2"]);
    assert.deepEqual(scopeRecord.excluded_units, ["amp_british_clean", "bass_combo_100"]);
    assert.equal(scopeRecord.scope_inflation_protection, true);

    // Node registered in graph
    assert.ok(graph.hasNode(scopeRecord.scope_id));
    const node = graph.getNode(scopeRecord.scope_id);
    assert.equal(node?.kind, GOVERNED_ENTITY_KINDS.ValidationScopeRecord);

    // Ledger entry recorded
    assert.equal(ledger.getEntryCount(), 1);
    const entry = ledger.getLatestEntry();
    assert.equal(entry?.entityKind, GOVERNED_ENTITY_KINDS.ValidationScopeRecord);
    assert.equal(entry?.entityId, scopeRecord.scope_id);
  });

  it("B. Rejects derivation if intake record is INTAKE_REJECTED", () => {
    const manager = new ValidationScopeManager();
    const rejectedIntake = createAcceptedIntakeRecord({
      intake_status: INTAKE_STATUSES.INTAKE_REJECTED,
      rejection_reason: "Failed gate 4 verification",
    });

    assert.throws(
      () => manager.deriveScope(rejectedIntake),
      (err: unknown) => {
        assert.ok(err instanceof ScopeDerivationError);
        assert.ok(err.message.includes("INTAKE_REJECTED"));
        assert.ok(err.message.includes("Only INTAKE_ACCEPTED records are eligible"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 2. Wildcard Prohibition & Ambiguous Boundaries
  // -------------------------------------------------------------------------
  it("C. Rejects wildcard boundary definitions with ScopeWildcardRejectionError", () => {
    const wildcardCases = [
      ["*"],
      ["amp_*"],
      ["amp_?"],
      [".*"],
      ["%"],
      ["all"],
      ["any"],
      ["ALL_GEAR"],
      ["all-gear"],
      ["all_models"],
      ["universal"],
      ["global"],
      ["*.*"],
    ];

    for (const badTokens of wildcardCases) {
      assert.throws(
        () => validateNoWildcards(badTokens, "test_tokens"),
        (err: unknown) => {
          assert.ok(err instanceof ScopeWildcardRejectionError);
          assert.ok(err.message.includes("prohibited"));
          return true;
        },
        `Expected wildcard tokens ${JSON.stringify(badTokens)} to throw ScopeWildcardRejectionError`
      );
    }
  });

  it("D. Rejects raw declared_scope text containing wildcards when no structured override is present", () => {
    const manager = new ValidationScopeManager();
    const wildcardIntake = createAcceptedIntakeRecord({
      declared_scope: "All Amplifiers (*)",
    });

    assert.throws(
      () => manager.deriveScope(wildcardIntake),
      (err: unknown) => {
        assert.ok(err instanceof ScopeWildcardRejectionError);
        return true;
      }
    );
  });

  it("E. Rejects contradictory scope definitions where a unit is in both included and excluded sets", () => {
    const manager = new ValidationScopeManager();
    const intake = createAcceptedIntakeRecord({
      declared_scope: JSON.stringify({
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: ["amp_dual_rectifier", "amp_mark_iv"],
        excluded_units: ["amp_mark_iv", "amp_british_crunch"],
      }),
    });

    assert.throws(
      () => manager.deriveScope(intake),
      (err: unknown) => {
        assert.ok(err instanceof ScopeDerivationError);
        assert.ok(err.message.includes("Ambiguous scope boundary conflict"));
        assert.ok(err.message.includes("amp_mark_iv"));
        return true;
      }
    );
  });

  it("F. Rejects empty included_units", () => {
    const manager = new ValidationScopeManager();
    const intake = createAcceptedIntakeRecord({
      declared_scope: JSON.stringify({
        primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
        included_units: [],
      }),
    });

    assert.throws(
      () => manager.deriveScope(intake),
      (err: unknown) => {
        assert.ok(err instanceof ScopeDerivationError);
        assert.ok(err.message.includes("included_units is empty"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 3. Delimited Text Scope Parsing
  // -------------------------------------------------------------------------
  it("G. Parses natural delimited text into explicit included units", () => {
    const parsed = parseScopeDefinition("amp_lead_ch1, amp_lead_ch2; amp_lead_ch3\namp_solo_boost");
    assert.deepEqual(parsed.included_units, [
      "amp_lead_ch1",
      "amp_lead_ch2",
      "amp_lead_ch3",
      "amp_solo_boost",
    ]);
    assert.equal(parsed.primary_domain, VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY);
    assert.equal(parsed.scope_inflation_protection, true);
  });

  // -------------------------------------------------------------------------
  // 4. ScopeEnforcer Interceptor: Unit-Level Checks & Condition 20
  // -------------------------------------------------------------------------
  it("H. ScopeEnforcer verifies in-scope units and throws ScopeInflationError with Condition 20 on out-of-scope units", () => {
    const scopeRecord: ValidationScopeRecord = {
      scope_id: "scope_lead_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_american_highgain", "cab_4x12_vintage"],
      excluded_units: ["amp_british_clean", "cab_1x12_openback"],
      boundary_constraints: ["44.1kHz only"],
      scope_inflation_protection: true,
    };

    const enforcer = new ScopeEnforcer(scopeRecord);

    // In-scope checks
    assert.equal(enforcer.isWithinScope("amp_american_highgain"), true);
    assert.equal(enforcer.isWithinScope("cab_4x12_vintage"), true);
    assert.doesNotThrow(() => enforcer.assertWithinScope("amp_american_highgain"));

    // Excluded unit checks
    assert.equal(enforcer.isWithinScope("amp_british_clean"), false);
    assert.equal(enforcer.isExplicitlyExcluded("amp_british_clean"), true);
    assert.throws(
      () => enforcer.assertWithinScope("amp_british_clean"),
      (err: unknown) => {
        assert.ok(err instanceof ScopeInflationError);
        assert.equal(err.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
        assert.ok(err.message.includes("Condition 20"));
        assert.ok(err.message.includes("negative boundary fence"));
        assert.deepEqual(err.excludedUnits, ["amp_british_clean"]);
        return true;
      }
    );

    // Unlisted (out-of-scope) unit checks
    assert.equal(enforcer.isWithinScope("amp_random_pedal"), false);
    assert.throws(
      () => enforcer.assertWithinScope("amp_random_pedal"),
      (err: unknown) => {
        assert.ok(err instanceof ScopeInflationError);
        assert.equal(err.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
        assert.ok(err.message.includes("Condition 20"));
        assert.ok(err.message.includes("not present in declared included_units"));
        assert.deepEqual(err.outOfScopeUnits, ["amp_random_pedal"]);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 5. ValidationCase Scope Boundary Interception
  // -------------------------------------------------------------------------
  it("I. ScopeEnforcer intercepts out-of-scope ValidationCase and tags with Condition 20", () => {
    const scopeRecord: ValidationScopeRecord = {
      scope_id: "scope_lead_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_american_highgain"],
      excluded_units: ["amp_british_clean"],
      boundary_constraints: ["Strict scope isolation"],
      scope_inflation_protection: true,
    };
    const enforcer = new ScopeEnforcer(scopeRecord);

    // 1. In-scope ValidationCase
    const validCase: ValidationCase = {
      case_id: "case_001",
      title: "High Gain Spectral Match",
      validation_question: "Does American High Gain meet spectral tolerance?",
      validation_subject: "amp_american_highgain",
      scoped_boundaries: ["amp_american_highgain"],
      applicable_test_dimensions: ["Spectral Analysis"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: ["fixture_di_stem_001"],
      evaluation_methodology: "FFT Spectral Comparison",
      acceptance_criteria_ref: "ac_spec_001",
      failure_consequence: "BLOCK_CANDIDATE",
      expected_remand_destination: "Phase 1C.5g Migration Planning",
    };

    const validResult = enforcer.validateTestCaseScope(validCase);
    assert.equal(validResult.allowed, true);
    assert.equal(validResult.condition, undefined);

    // 2. Out-of-scope ValidationCase attempting to test excluded gear
    const invalidCase: ValidationCase = {
      ...validCase,
      case_id: "case_002",
      validation_subject: "amp_british_clean",
      scoped_boundaries: ["amp_british_clean"],
    };

    const invalidResult = enforcer.validateTestCaseScope(invalidCase);
    assert.equal(invalidResult.allowed, false);
    assert.equal(invalidResult.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
    assert.ok(invalidResult.violationReason?.includes("ValidationCase \"case_002\" exceeds declared scope"));
    assert.deepEqual(invalidResult.excludedUnitsEncountered, ["amp_british_clean"]);
  });

  // -------------------------------------------------------------------------
  // 6. TestProfileRecord Scope Boundary Interception
  // -------------------------------------------------------------------------
  it("J. ScopeEnforcer intercepts TestProfileRecord referencing out-of-scope gear", () => {
    const scopeRecord: ValidationScopeRecord = {
      scope_id: "scope_lead_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_american_highgain"],
      excluded_units: ["bass_subsystem"],
      boundary_constraints: ["Guitar gear only"],
      scope_inflation_protection: true,
    };
    const enforcer = new ScopeEnforcer(scopeRecord);

    const validProfile: TestProfileRecord = {
      profile_id: "profile_highgain_01",
      profile_family: TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      target_component_class: "amp_american_highgain",
      required_analyses: ["Spectral FFT", "THD"],
      applicable_fixture_classes: [FIXTURE_CLASSES.DI_PERFORMANCE],
      tolerance_criteria_spec: "tol_spec_001",
      applicability_rules: ["Rule 1: High-gain guitar tones only"],
    };

    const validResult = enforcer.validateTestProfileScope(validProfile);
    assert.equal(validResult.allowed, true);

    const outOfScopeProfile: TestProfileRecord = {
      ...validProfile,
      profile_id: "profile_bass_01",
      target_component_class: "bass_subsystem",
    };

    const invalidResult = enforcer.validateTestProfileScope(outOfScopeProfile);
    assert.equal(invalidResult.allowed, false);
    assert.equal(invalidResult.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
    assert.ok(invalidResult.violationReason?.includes("profile_bass_01"));
  });

  // -------------------------------------------------------------------------
  // 7. ValidationFixtureRecord Scope Boundary Interception
  // -------------------------------------------------------------------------
  it("K. ScopeEnforcer intercepts ValidationFixtureRecord referencing out-of-scope gear", () => {
    const scopeRecord: ValidationScopeRecord = {
      scope_id: "scope_lead_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_american_highgain"],
      excluded_units: ["acoustic_dreadnought"],
      boundary_constraints: ["Electric guitar only"],
      scope_inflation_protection: true,
    };
    const enforcer = new ScopeEnforcer(scopeRecord);

    const fixture: ValidationFixtureRecord = {
      fixture_id: "fix_acoustic_001",
      fixture_name: "Acoustic Strum Reference",
      fixture_class: FIXTURE_CLASSES.REFERENCE_TONE,
      version: "v1.0",
      payload_integrity_ref: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
      declared_applicability_scope: ["acoustic_dreadnought"],
      provenance_metadata: {},
      calibration_spec: "-18 LUFS normalized",
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
    };

    const check = enforcer.validateFixtureScope(fixture);
    assert.equal(check.allowed, false);
    assert.equal(check.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
    assert.deepEqual(check.excludedUnitsEncountered, ["acoustic_dreadnought"]);
  });

  // -------------------------------------------------------------------------
  // 8. Gate 8 Production Cutover Scope Matrix (Table 18) Enforcement
  // -------------------------------------------------------------------------
  it("L. ScopeEnforcer validates production authorization petition against Table 18 Scope Inflation Guard", () => {
    const scopeRecord: ValidationScopeRecord = {
      scope_id: "scope_lead_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_american_highgain_ch1", "amp_american_highgain_ch2"],
      excluded_units: ["amp_american_clean", "amp_british_crunch"],
      boundary_constraints: ["Sample rate locked to 48kHz"],
      scope_inflation_protection: true,
    };
    const enforcer = new ScopeEnforcer(scopeRecord);

    // Case 1: Permitted authorization grant (strictly within tested scope)
    const validPetition = ["amp_american_highgain_ch1", "amp_american_highgain_ch2"];
    const validResult = enforcer.validateAdoptionScope(validPetition);
    assert.equal(validResult.allowed, true);
    assert.deepEqual(validResult.inScopeUnits, validPetition);

    // Case 2: Prohibited expansion (adjacent untested model requested)
    const inflatedPetition = [
      "amp_american_highgain_ch1",
      "amp_american_clean", // Adjacent excluded model
      "amp_untested_prototype", // Untested model
    ];
    const inflatedResult = enforcer.validateAdoptionScope(inflatedPetition);
    assert.equal(inflatedResult.allowed, false);
    assert.equal(inflatedResult.condition, SCOPE_FAILURE_CONDITIONS.CONDITION_20);
    assert.ok(inflatedResult.violationReason?.includes("Scope inflation detected"));
    assert.deepEqual(inflatedResult.outOfScopeUnits, ["amp_untested_prototype"]);
    assert.deepEqual(inflatedResult.excludedUnitsEncountered, ["amp_american_clean"]);
  });

  // -------------------------------------------------------------------------
  // 9. Immutable Scope Identity & Invariant Preservation
  // -------------------------------------------------------------------------
  it("M. Preserves immutable scope identity and enforces freeze protection", () => {
    const manager = new ValidationScopeManager();
    const intake = createAcceptedIntakeRecord();
    const scopeRecord = manager.deriveScope(intake, {
      includedUnits: ["amp_lead_highgain"],
      excludedUnits: ["amp_lead_clean"],
    });

    // Record is deeply frozen
    assert.ok(Object.isFrozen(scopeRecord));
    assert.ok(Object.isFrozen(scopeRecord.included_units));
    assert.ok(Object.isFrozen(scopeRecord.excluded_units));

    // Attempted mutation throws in strict mode
    assert.throws(() => {
      (scopeRecord as any).primary_domain = "MODIFIED_DOMAIN";
    });
    assert.throws(() => {
      (scopeRecord.included_units as any).push("amp_illegal_inflation");
    });

    // Immutable lookup by scope_id and intake_id
    assert.equal(manager.getScopeRecord(scopeRecord.scope_id), scopeRecord);
    assert.equal(manager.getScopeByIntakeId(intake.intake_id), scopeRecord);
  });

  // -------------------------------------------------------------------------
  // 10. Audit Ledger Monotonic Verifiability
  // -------------------------------------------------------------------------
  it("N. Verifies tamper-evident audit ledger sequencing for derived ValidationScopeRecords", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const manager = new ValidationScopeManager(graph, ledger);

    const intake1 = createAcceptedIntakeRecord({ intake_id: "intake_001", declared_scope: "amp_model_1" });
    const intake2 = createAcceptedIntakeRecord({ intake_id: "intake_002", declared_scope: "amp_model_2" });

    manager.deriveScope(intake1);
    manager.deriveScope(intake2);

    assert.equal(ledger.getEntryCount(), 2);
    const verification = ledger.verifyLedger();
    assert.equal(verification.isValid, true);
    assert.equal(verification.totalEntries, 2);
    assert.equal(verification.corruptedSequenceNumber, undefined);
  });
});
