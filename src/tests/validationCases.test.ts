// src/tests/validationCases.test.ts
// Comprehensive unit and integration tests for Phase 1C.5h WP-09:
// ValidationCase Construction & Falsifiability Engine (Record 5).
// Bound to frozen specification v0.1j Section 11, Section 13, and Invariant 2.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  parseValidationCase,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  CaseAcceptanceCriteriaError,
  CaseFalsifiabilityError,
  CaseFixtureError,
  CaseScopeViolationError,
  CaseValidationError,
  ValidationCaseBuilder,
  ValidationCaseInput,
  validateAcceptanceCriteriaRef,
  validateCaseCompleteness,
  validateCaseFalsifiability,
} from "../sound-engineer/validation/cases";
import { FixtureCorpusManager } from "../sound-engineer/validation/fixtures/fixtureManager";

describe("Phase 1C.5h — WP-09: Validation Case Engine (Record 5)", () => {
  const sampleScope: ValidationScopeRecord = {
    scope_id: "scope_high_gain_lead_01",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["amp_lead_5150", "cab_4x12_vintage", "pedal_overdrive_ts"],
    excluded_units: ["amp_clean_tweed", "cab_bass_8x10"],
    boundary_constraints: ["Isolated under Axiom 6 boundary"],
    scope_inflation_protection: true,
  };

  const sampleBinding: ValidationVersionBindingRecord = {
    binding_id: "bnd_2026_scope_high_gain_lead_01",
    scope_id: "scope_high_gain_lead_01",
    architecture_version_matrix: {
      "1C.5a_version": { version: "v0.3c", integrity_ref: "sha256:1111" },
      "1C.5b_version": { version: "v0.2f", integrity_ref: "sha256:2222" },
      "1C.5c_version": { version: "v0.1d", integrity_ref: "sha256:3333" },
      "1C.5d_version": { version: "v0.1l", integrity_ref: "sha256:4444" },
      "1C.5e_version": { version: "v0.1m", integrity_ref: "sha256:5555" },
      "1C.5f_version": { version: "v1.0", integrity_ref: "sha256:6666" },
      "1C.5g_version": { version: "v1.0", integrity_ref: "sha256:7777" },
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
      composite_digest: "sha256:composite_binding_digest",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T00:00:00Z",
    },
  };

  function createValidCaseInput(overrides?: Partial<ValidationCaseInput>): ValidationCaseInput {
    return {
      title: "5150 High-Gain Lead Dynamic Range & Transient Preservation",
      validation_question:
        "Does the 5150 lead amplifier model preserve input pick attack dynamics within the governed tolerance profile?",
      validation_subject: "amp_lead_5150",
      scoped_boundaries: ["amp_lead_5150", "cab_4x12_vintage"],
      applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: [],
      evaluation_methodology: "Signal difference crest factor & transient envelope comparison",
      acceptance_criteria_ref: "TOL_DYNAMIC_CREST_FACTOR_SPEC_V1",
      failure_consequence: "Blocks high-gain lead amplifier cutover and triggers Phase 1C.5d parameter retuning",
      expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
      ...overrides,
    };
  }

  describe("A. Record 5 Schema & Case Construction", () => {
    it("successfully builds and parses a valid complete ValidationCase", () => {
      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      const input = createValidCaseInput();
      const validationCase = builder.buildCase(input);

      assert.ok(validationCase);
      assert.ok(validationCase.case_id.startsWith("CASE-"));
      assert.equal(validationCase.title, input.title);
      assert.equal(validationCase.validation_subject, "amp_lead_5150");
      assert.deepEqual(validationCase.required_evidence_classes, [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE]);

      // Verify schema parity
      const validated = parseValidationCase(validationCase);
      assert.equal(validated.case_id, validationCase.case_id);
    });

    it("enforces deep-freeze immutability on built ValidationCase", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });
      const validationCase = builder.buildCase(createValidCaseInput());

      assert.throws(() => {
        (validationCase as any).title = "Mutated Title";
      });
      assert.throws(() => {
        (validationCase.scoped_boundaries as any).push("illegal_unit");
      });
    });
  });

  describe("B. Falsifiability & Bounded Question Enforcement", () => {
    it("rejects missing or empty validation question", () => {
      const builder = new ValidationCaseBuilder();

      assert.throws(
        () => builder.buildCase(createValidCaseInput({ validation_question: "" })),
        CaseFalsifiabilityError
      );
      assert.throws(
        () => builder.buildCase(createValidCaseInput({ validation_question: "   " })),
        CaseFalsifiabilityError
      );
    });

    it("rejects questions that are too short (< 15 characters)", () => {
      assert.equal(validateCaseFalsifiability("Is it good?").valid, false);
      assert.throws(
        () =>
          new ValidationCaseBuilder().buildCase(
            createValidCaseInput({ validation_question: "Does it work?" })
          ),
        CaseFalsifiabilityError
      );
    });

    it("rejects subjective, vague, and unfalsifiable questions", () => {
      const vagueQuestions = [
        "Does the guitar sound good with this preset?",
        "Is it better than the previous model?",
        "Is the system acceptable for studio work?",
        "Does this amp sound great in the mix?",
        "Confirm that it works well across all settings.",
      ];

      for (const q of vagueQuestions) {
        const res = validateCaseFalsifiability(q);
        assert.equal(res.valid, false, `Expected question "${q}" to be rejected as vague`);
      }
    });

    it("accepts bounded, explicit, and falsifiable questions", () => {
      const validQuestions = [
        "Does the exported preset load in AmpliTube 5 without missing gear errors?",
        "Does the output waveform maintain THD below the governed threshold profile?",
        "Is the transient peak within the calibrated tolerance envelope?",
        "Evaluate whether the cabinet model frequency response matches reference curve within 1.5 dB.",
      ];

      for (const q of validQuestions) {
        const res = validateCaseFalsifiability(q);
        assert.equal(res.valid, true, `Expected question "${q}" to pass falsifiability check`);
      }
    });
  });

  describe("C. Acceptance Criteria Reference & Threshold Policy", () => {
    it("accepts governed criteria references", () => {
      assert.equal(validateAcceptanceCriteriaRef("TOL_SPECTRAL_DELTA_SPEC_V1").valid, true);
      assert.equal(validateAcceptanceCriteriaRef("REF_RECOVERY_OBJECTIVE_ZERO_LOSS").valid, true);
      assert.equal(validateAcceptanceCriteriaRef("SPEC_PRESET_XML_PARITY_V12").valid, true);
    });

    it("strictly rejects bare universal numeric thresholds (anti-hardcoded-threshold rule)", () => {
      const bareThresholds = ["0.5", "< 0.1", "10ms", "-18dBFS", "100Hz", "1.0", "5%"];

      for (const t of bareThresholds) {
        const res = validateAcceptanceCriteriaRef(t);
        assert.equal(res.valid, false, `Expected bare threshold "${t}" to be rejected`);
      }

      assert.throws(
        () =>
          new ValidationCaseBuilder().buildCase(
            createValidCaseInput({ acceptance_criteria_ref: "< 0.5 dB" })
          ),
        CaseAcceptanceCriteriaError
      );
    });
  });

  describe("D. WP-04 Scope Containment Integration", () => {
    it("accepts cases strictly within declared scope included_units", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });
      const validCase = builder.buildCase(
        createValidCaseInput({
          validation_subject: "pedal_overdrive_ts",
          scoped_boundaries: ["pedal_overdrive_ts", "amp_lead_5150"],
        })
      );
      assert.ok(validCase);
    });

    it("strictly rejects cases targeting units outside declared scope", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              validation_subject: "amp_untested_custom", // Not in included_units
            })
          ),
        CaseScopeViolationError
      );
    });

    it("strictly rejects cases reintroducing explicitly excluded units", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              validation_subject: "amp_clean_tweed", // in excluded_units
            })
          ),
        CaseScopeViolationError
      );

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              scoped_boundaries: ["amp_lead_5150", "cab_bass_8x10"], // cab_bass_8x10 is excluded
            })
          ),
        CaseScopeViolationError
      );
    });
  });

  describe("E. WP-08 Fixture Eligibility & Scope Matching", () => {
    const fixtureManager = new FixtureCorpusManager({ loadBootstrapCorpus: false });
    // Provision a clean in-scope fixture
    const cleanInScopeFixture = {
      fixture_id: "FIX-DI-5150-LEAD-01",
      fixture_name: "5150 High-Gain Lead DI Stem",
      fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
      version: "v1.0",
      payload_integrity_ref: "sha256:valid_di_stem_hash",
      declared_applicability_scope: ["amp_lead_5150", "cab_4x12_vintage"],
      provenance_metadata: {
        instrument_details: "Gibson Les Paul Custom",
        capture_hardware: "Radial JDI Direct Box -> Apollo x8",
        recording_engineer: "Lead Sound Engineer",
        capture_date: "2026-03-01T00:00:00Z",
      },
      calibration_spec: "CAL_SPEC_STD_DI",
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
    };
    fixtureManager.registerFixture(cleanInScopeFixture);

    it("accepts cases referencing valid, clean, in-scope fixtures", () => {
      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      const validationCase = builder.buildCase(
        createValidCaseInput({
          associated_fixture_set: ["FIX-DI-5150-LEAD-01"],
        })
      );
      assert.deepEqual(validationCase.associated_fixture_set, ["FIX-DI-5150-LEAD-01"]);
    });

    it("rejects non-existent fixture references", () => {
      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-NON-EXISTENT-999"],
            })
          ),
        CaseFixtureError
      );
    });

    it("rejects off-scope fixture references", () => {
      const offScopeFixture = {
        fixture_id: "FIX-DI-BASS-ONLY-01",
        fixture_name: "Bass Only DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:bass_di_hash",
        declared_applicability_scope: ["amp_bass", "cab_bass_8x10"],
        provenance_metadata: {
          recording_engineer: "Bass Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_STD_DI",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      };
      fixtureManager.registerFixture(offScopeFixture);

      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-DI-BASS-ONLY-01"],
            })
          ),
        CaseFixtureError
      );
    });

    it("rejects contaminated or quarantined fixtures", () => {
      const contaminatedFixture = {
        fixture_id: "FIX-DI-CONTAM-01",
        fixture_name: "Contaminated DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:contam_hash",
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          recording_engineer: "Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      };
      fixtureManager.registerFixture(contaminatedFixture);

      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-DI-CONTAM-01"],
            })
          ),
        CaseFixtureError
      );
    });

    it("rejects SUSPECT fixture references", () => {
      const suspectFixture = {
        fixture_id: "FIX-DI-SUSPECT-01",
        fixture_name: "Suspect DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:suspect_hash",
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          recording_engineer: "Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      };
      fixtureManager.registerFixture(suspectFixture);

      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-DI-SUSPECT-01"],
            })
          ),
        CaseFixtureError
      );
    });

    it("rejects SUPERSEDED fixture references for new case composition", () => {
      const supersededFixture = {
        fixture_id: "FIX-DI-SUPERSEDED-01",
        fixture_name: "Superseded DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:superseded_hash",
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          instrument_details: "Strat",
          capture_hardware: "DI Box",
          recording_engineer: "Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
      };
      fixtureManager.registerFixture(supersededFixture);

      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-DI-SUPERSEDED-01"],
            })
          ),
        CaseFixtureError
      );
    });

    it("rejects RETIRED fixture references", () => {
      const retiredFixture = {
        fixture_id: "FIX-DI-RETIRED-01",
        fixture_name: "Retired DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:retired_hash",
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          instrument_details: "Strat",
          capture_hardware: "DI Box",
          recording_engineer: "Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.RETIRED,
      };
      fixtureManager.registerFixture(retiredFixture);

      const builder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        fixtureManager,
      });

      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              associated_fixture_set: ["FIX-DI-RETIRED-01"],
            })
          ),
        CaseFixtureError
      );
    });

    it("permits non-fixture cases when profile/question does not require fixtures (e.g. Structural Schema)", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });
      const nonFixtureCase = builder.buildCase(
        createValidCaseInput({
          applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
          associated_fixture_set: [],
        })
      );
      assert.deepEqual(nonFixtureCase.associated_fixture_set, []);
    });
  });

  describe("F. Profile Dimension & Version Binding Governance", () => {
    it("rejects unknown test profile dimensions", () => {
      const builder = new ValidationCaseBuilder({ scopeRecord: sampleScope });
      assert.throws(
        () =>
          builder.buildCase(
            createValidCaseInput({
              applicable_test_dimensions: ["PROFILE_UNKNOWN_NONEXISTENT_99"],
            })
          ),
        CaseValidationError
      );
    });

    it("rejects version binding mismatch when binding scope does not match active scope", () => {
      const mismatchedBinding: ValidationVersionBindingRecord = {
        ...sampleBinding,
        scope_id: "scope_different_unrelated_99",
      };
      assert.throws(
        () =>
          new ValidationCaseBuilder({
            scopeRecord: sampleScope,
            versionBinding: mismatchedBinding,
          }),
        /Version binding mismatch/
      );
    });
  });

  describe("G. Completeness & Required Field Guards", () => {
    it("validates completeness using validateCaseCompleteness helper", () => {
      const valid = createValidCaseInput({ case_id: "CASE-DYNAMIC-5150-01" });
      const res = validateCaseCompleteness(valid);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);

      const incomplete = { ...valid, failure_consequence: "" };
      const badRes = validateCaseCompleteness(incomplete);
      assert.equal(badRes.valid, false);
      assert.ok(badRes.errors.some((e) => e.includes("failure_consequence")));
    });
  });
});
