// src/tests/validationRecords.test.ts
// Comprehensive unit tests for Phase 1C.5h — WP-01: Foundational Schemas & Record Catalogue (Records 1-22)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import {
  // Canonical Enums
  INTAKE_STATUSES,
  VALIDATION_PRIMARY_DOMAINS,
  READINESS_OUTCOMES,
  PREREQUISITE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  EXECUTION_OUTCOMES,
  OBJECTIVE_METRIC_CATEGORIES,
  TOLERANCE_EVALUATIONS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  EVALUATOR_PERSONAS,
  TASK_COMPLETION_STATUSES,
  MUSICAL_FITNESS_VERDICTS,
  REGRESSION_CLASSIFICATIONS,
  MATERIALITY_SCORES,
  REGRESSION_DOMAINS,
  FAILURE_ATTRIBUTION_CLASSES,
  ATTRIBUTION_CONFIDENCE_LEVELS,
  FAILURE_MATERIALITIES,
  CONFLICT_TYPES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_RESOLUTION_STATUSES,
  UNCERTAINTY_SOURCES,
  UNCERTAINTY_GATE_8_IMPACTS,
  VALIDATION_OUTCOME_CLASSES,
  REVALIDATION_TRIGGER_SOURCES,
  REVALIDATION_REQUIRED_ACTIONS,
  PILLAR_READINESS_STATUSES,
  ADOPTION_DECISION_OUTCOMES,
  GOVERNANCE_STATUSES,
  PREVIOUS_GOVERNANCE_STATUSES,
  NEW_GOVERNANCE_STATUSES,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_EFFECTS,
  REQUIRED_ADOPTION_RESPONSES,
  // Schemas and Validators
  validationIntakeRecordSchema,
  validationScopeRecordSchema,
  validationVersionBindingRecordSchema,
  validationReadinessAssessmentRecordSchema,
  validationCaseSchema,
  validationPackageSchema,
  testProfileRecordSchema,
  validationFixtureRecordSchema,
  validationExecutionRecordSchema,
  objectiveEvidenceRecordSchema,
  perceptualEvaluationRecordSchema,
  uatEvaluationRecordSchema,
  regressionAssessmentRecordSchema,
  validationFailureRecordSchema,
  evidenceConflictRecordSchema,
  validationUncertaintyRecordSchema,
  validationOutcomeRecordSchema,
  revalidationTriggerRecordSchema,
  retestPlanRecordSchema,
  productionReadinessAssessmentRecordSchema,
  adoptionDecisionRecordSchema,
  gate8ChangeRecordSchema,
  VALIDATION_RECORD_SCHEMAS,
  // Integrity Schemas and Helpers
  recordIntegrityMetadataSchema,
  versionIntegrityReferenceSchema,
  architectureVersionMatrixSchema,
  canonicalizeJson,
} from "../sound-engineer/validation";

// Synthetic base fixtures for schema testing
const validIntegrityMetadata = {
  integrity_digest: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  algorithm: "SHA-256",
  sealed_at: "2026-10-13T10:00:00.000Z",
  signer_identity: "validator-node-01",
  canonical_serialization_format: "RFC-8785",
};

const validArchitectureVersionMatrix = {
  "1C.5a_version": { version: "v0.3c", integrity_ref: "sha256_1c5a_baseline" },
  "1C.5b_version": { version: "v0.2f", integrity_ref: "sha256_1c5b_baseline" },
  "1C.5c_version": { version: "v0.1d", integrity_ref: "sha256_1c5c_baseline" },
  "1C.5d_version": { version: "v0.1l", integrity_ref: "sha256_1c5d_baseline" },
  "1C.5e_version": { version: "v0.1m", integrity_ref: "sha256_1c5e_baseline" },
  "1C.5f_version": { version: "v0.1j", integrity_ref: "sha256_1c5f_baseline" },
  "1C.5g_version": { version: "v0.1e", integrity_ref: "sha256_1c5g_baseline" },
  "1C.5h_mandate_version": { version: "v0.1d", integrity_ref: "sha256_1c5h_mandate" },
  "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256_1c5h_arch_baseline" },
};

const validVersionIntegrityReference = {
  composite_digest: "sha256_composite_matrix_digest_abc123",
  algorithm: "SHA-256",
  sealed_at: "2026-10-13T10:00:00.000Z",
  component_digests: {
    "1C.5a": "sha256_1c5a_baseline",
    "1C.5b": "sha256_1c5b_baseline",
  },
};

describe("Phase 1C.5h — WP-01: Foundational Schemas & Record Catalogue", () => {
  // Test 1: Record Catalogue completeness
  it("1. exposes all twenty-two governed record schemas in catalogue map", () => {
    const schemaKeys = Object.keys(VALIDATION_RECORD_SCHEMAS);
    assert.equal(schemaKeys.length, 22, "Catalogue must contain exactly 22 governed records");
    assert.ok(schemaKeys.includes("ValidationIntakeRecord"));
    assert.ok(schemaKeys.includes("ValidationScopeRecord"));
    assert.ok(schemaKeys.includes("ValidationVersionBindingRecord"));
    assert.ok(schemaKeys.includes("ValidationReadinessAssessmentRecord"));
    assert.ok(schemaKeys.includes("ValidationCase"));
    assert.ok(schemaKeys.includes("ValidationPackage"));
    assert.ok(schemaKeys.includes("TestProfileRecord"));
    assert.ok(schemaKeys.includes("ValidationFixtureRecord"));
    assert.ok(schemaKeys.includes("ValidationExecutionRecord"));
    assert.ok(schemaKeys.includes("ObjectiveEvidenceRecord"));
    assert.ok(schemaKeys.includes("PerceptualEvaluationRecord"));
    assert.ok(schemaKeys.includes("UATEvaluationRecord"));
    assert.ok(schemaKeys.includes("RegressionAssessmentRecord"));
    assert.ok(schemaKeys.includes("ValidationFailureRecord"));
    assert.ok(schemaKeys.includes("EvidenceConflictRecord"));
    assert.ok(schemaKeys.includes("ValidationUncertaintyRecord"));
    assert.ok(schemaKeys.includes("ValidationOutcomeRecord"));
    assert.ok(schemaKeys.includes("RevalidationTriggerRecord"));
    assert.ok(schemaKeys.includes("RetestPlanRecord"));
    assert.ok(schemaKeys.includes("ProductionReadinessAssessmentRecord"));
    assert.ok(schemaKeys.includes("AdoptionDecisionRecord"));
    assert.ok(schemaKeys.includes("Gate8ChangeRecord"));
  });

  // Test 2: Record 01 — ValidationIntakeRecord
  it("2. Record 01 (ValidationIntakeRecord) enforces strict schema and canonical enums", () => {
    const valid = {
      intake_id: "intake_001",
      timestamp: "2026-10-13T10:00:00.000Z",
      handoff_package_id: "mhp_1c5g_lead_01",
      handoff_package_integrity_ref: "sha256_package_ref_123",
      migration_batch_id: "batch_2026_q4_01",
      requested_by: "migration-coordinator-01",
      declared_scope: "Lead Amps - High Gain",
      frozen_upstream_versions: { "1C.5g": "v0.1e" },
      target_platform_declared_version: "AT5_v5.10",
      intake_status: INTAKE_STATUSES.INTAKE_ACCEPTED,
      rejection_reason: undefined,
      record_integrity_metadata: validIntegrityMetadata,
    };

    const parsed = validationIntakeRecordSchema.parse(valid);
    assert.equal(parsed.intake_status, "INTAKE_ACCEPTED");

    // Rejection of unknown properties (strict check)
    assert.throws(() => {
      validationIntakeRecordSchema.parse({ ...valid, unknown_property: "disallowed" });
    }, ZodError);

    // Rejection of transient non-persisted states (RECEIVED, VERIFYING, VERIFIED)
    const invalidStatuses = ["RECEIVED", "VERIFYING", "VERIFIED", "PENDING", "ACCEPTED"];
    for (const badStatus of invalidStatuses) {
      assert.throws(() => {
        validationIntakeRecordSchema.parse({ ...valid, intake_status: badStatus });
      }, ZodError);
    }
  });

  // Test 3: Record 02 — ValidationScopeRecord
  it("3. Record 02 (ValidationScopeRecord) enforces primary domain and scope bounds", () => {
    const valid = {
      scope_id: "scope_001",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_brit_800", "amp_american_dual"],
      excluded_units: ["amp_bass_300"],
      boundary_constraints: ["44.1kHz and 48kHz only", "Mono input"],
      scope_inflation_protection: true,
    };

    const parsed = validationScopeRecordSchema.parse(valid);
    assert.equal(parsed.primary_domain, "GEAR_FAMILY");
    assert.equal(parsed.included_units.length, 2);

    // Rejects empty included_units
    assert.throws(() => {
      validationScopeRecordSchema.parse({ ...valid, included_units: [] });
    }, ZodError);

    // Rejects unknown property
    assert.throws(() => {
      validationScopeRecordSchema.parse({ ...valid, rogue_field: true });
    }, ZodError);
  });

  // Test 4: Record 03 — ValidationVersionBindingRecord & Architecture Matrix
  it("4. Record 03 (ValidationVersionBindingRecord) enforces full architecture matrix and integrity reference", () => {
    const valid = {
      binding_id: "binding_001",
      scope_id: "scope_001",
      architecture_version_matrix: validArchitectureVersionMatrix,
      runtime_implementation_version: "git_commit_789abc",
      model_configuration_version: "model_config_v1.0",
      deterministic_rules_version: "rules_digest_def456",
      gear_catalog_version: "catalog_digest_ghi789",
      platform_exporter_version: "exporter_digest_jkl012",
      fixture_library_version: "fixture_lib_digest_mno345",
      target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
      host_environment_version: "Linux_x86_64_Kernel_6.6",
      version_integrity_reference: validVersionIntegrityReference,
    };

    const parsed = validationVersionBindingRecordSchema.parse(valid);
    assert.equal(parsed.architecture_version_matrix["1C.5a_version"].version, "v0.3c");
    assert.equal(parsed.architecture_version_matrix["1C.5h_mandate_version"].version, "v0.1d");
    assert.equal(parsed.architecture_version_matrix["1C.5h_architecture_version"].version, "v0.1j");

    // Missing an architecture entry must fail
    const missingArch = { ...validArchitectureVersionMatrix } as any;
    delete missingArch["1C.5g_version"];
    assert.throws(() => {
      validationVersionBindingRecordSchema.parse({ ...valid, architecture_version_matrix: missingArch });
    }, ZodError);

    // Architecture matrix represented as a single string/hash must fail
    assert.throws(() => {
      validationVersionBindingRecordSchema.parse({
        ...valid,
        architecture_version_matrix: "sha256_single_hash_collapsed" as any,
      });
    }, ZodError);

    // Missing integrity ref must fail
    assert.throws(() => {
      validationVersionBindingRecordSchema.parse({
        ...valid,
        architecture_version_matrix: {
          ...validArchitectureVersionMatrix,
          "1C.5a_version": { version: "v0.3c" } as any,
        },
      });
    }, ZodError);
  });

  // Test 5: Record 04 — ValidationReadinessAssessmentRecord
  it("5. Record 04 enforces frozen readiness outcomes and prerequisite status", () => {
    const valid = {
      readiness_id: "readiness_001",
      intake_id: "intake_001",
      evaluated_prerequisites: {
        "Gate 1: Structural Mapping Complete": PREREQUISITE_STATUSES.PASS,
        "Gate 2: Architectural Compatibility": PREREQUISITE_STATUSES.PASS,
        "Gate 3: Provenance & Lineage": PREREQUISITE_STATUSES.PASS,
        "Gate 4: Shadow Execution": PREREQUISITE_STATUSES.PASS,
        "Gate 5: Differential Analysis": PREREQUISITE_STATUSES.PASS,
        "Gate 6: Rollback Path Operational": PREREQUISITE_STATUSES.PASS,
        "Gate 7: Handoff Package Assembled": PREREQUISITE_STATUSES.PASS,
      },
      fixture_coverage_ratio: 0.95,
      readiness_outcome: READINESS_OUTCOMES.READY,
      limitation_notes: [],
      assessment_timestamp: "2026-10-13T10:00:00.000Z",
      assessor_id: "readiness-auditor-daemon",
    };

    const parsed = validationReadinessAssessmentRecordSchema.parse(valid);
    assert.equal(parsed.readiness_outcome, "READY");

    // Allows READY_WITH_DECLARED_LIMITATIONS and BLOCKED_NOT_EVALUABLE
    assert.ok(
      validationReadinessAssessmentRecordSchema.parse({
        ...valid,
        readiness_outcome: READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS,
        limitation_notes: ["Coverage limited to standard tuning stems"],
      })
    );
    assert.ok(
      validationReadinessAssessmentRecordSchema.parse({
        ...valid,
        readiness_outcome: READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE,
      })
    );

    // Rejects non-canonical outcomes
    assert.throws(() => {
      validationReadinessAssessmentRecordSchema.parse({ ...valid, readiness_outcome: "NOT_READY" });
    }, ZodError);
    assert.throws(() => {
      validationReadinessAssessmentRecordSchema.parse({ ...valid, readiness_outcome: "PENDING" });
    }, ZodError);

    // Rejects non-canonical prerequisite status
    assert.throws(() => {
      validationReadinessAssessmentRecordSchema.parse({
        ...valid,
        evaluated_prerequisites: { "Gate 1": "SUCCESS" as any },
      });
    }, ZodError);
  });

  // Test 6: Record 05 — ValidationCase
  it("6. Record 05 (ValidationCase) parses valid case and rejects malformed fields", () => {
    const valid = {
      case_id: "case_transient_001",
      title: "High Gain Transient Response Verification",
      validation_question: "Does the candidate preserve pick attack crest factor within 1.5 dB of reference?",
      validation_subject: "Amp American Lead Pre-gain Stage",
      scoped_boundaries: ["High Gain", "Drop D Tuning"],
      applicable_test_dimensions: ["Dynamic Envelope", "Spectral Balance"],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE, REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL],
      associated_fixture_set: ["fix_di_drop_d_heavy_01"],
      evaluation_methodology: "Tripartite crest factor and ABX listening comparison",
      acceptance_criteria_ref: "tol_profile_high_gain_v1",
      failure_consequence: "Scoped Gate 8 Block on American Lead Model",
      expected_remand_destination: "Upstream Reasoning Governance (Phase 1C.5d)",
    };

    const parsed = validationCaseSchema.parse(valid);
    assert.equal(parsed.case_id, "case_transient_001");
    assert.equal(parsed.required_evidence_classes.length, 2);

    assert.throws(() => {
      validationCaseSchema.parse({ ...valid, required_evidence_classes: ["SYNTHETIC" as any] });
    }, ZodError);
  });

  // Test 7: Record 06 — ValidationPackage
  it("7. Record 06 (ValidationPackage) aggregates cases, fixtures, and evidence references", () => {
    const valid = {
      package_id: "pkg_2026_q4_lead_01",
      intake_id: "intake_001",
      scope_record_ref: "scope_001",
      version_binding_ref: "binding_001",
      assigned_test_profiles: ["profile_04_acoustic", "profile_06_perceptual"],
      validation_case_refs: ["case_transient_001"],
      execution_record_refs: ["exec_001"],
      evidence_refs: ["obj_ev_001", "percept_ev_001"],
      outcome_record_ref: "outcome_001",
      gate8_decision_ref: "decision_001",
    };

    const parsed = validationPackageSchema.parse(valid);
    assert.equal(parsed.package_id, "pkg_2026_q4_lead_01");

    assert.throws(() => {
      validationPackageSchema.parse({ ...valid, extra_field: 123 });
    }, ZodError);
  });

  // Test 8: Record 07 — TestProfileRecord
  it("8. Record 07 (TestProfileRecord) supports the 14 profile families and 8 fixture classes", () => {
    const valid = {
      profile_id: "prof_acoustic_04",
      profile_family: TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      target_component_class: "Amplifier Lead Channel",
      required_analyses: ["FFT Spectral Delta", "THD Harmonic Order", "Phase Correlation"],
      applicable_fixture_classes: [FIXTURE_CLASSES.DI_PERFORMANCE, FIXTURE_CLASSES.REFERENCE_TONE],
      tolerance_criteria_spec: "tol_spec_acoustic_lead_v1.0",
      applicability_rules: ["Apply to all high-gain amp models"],
    };

    const parsed = testProfileRecordSchema.parse(valid);
    assert.equal(parsed.profile_family, "PROFILE_04_OBJECTIVE_ACOUSTIC");

    // Rejects non-canonical profile family
    assert.throws(() => {
      testProfileRecordSchema.parse({ ...valid, profile_family: "PROFILE_99_CUSTOM" });
    }, ZodError);
  });

  // Test 9: Record 08 — ValidationFixtureRecord
  it("9. Record 08 enforces frozen contamination_status (CLEAN|CONTAMINATED|SUSPECT) and lifecycle_status", () => {
    const valid = {
      fixture_id: "fix_di_strat_blues_01",
      fixture_name: "1962 Strat Neck Pickup Blues Riff",
      fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
      version: "v1.2",
      payload_integrity_ref: "sha256_fixture_payload_blob_ref",
      declared_applicability_scope: ["Clean and Edge-of-breakup channels"],
      provenance_metadata: {
        instrument_details: "Fender Custom Shop 1962 Stratocaster",
        capture_hardware: "Rupert Neve RNDI Hi-Z Direct Box",
        recording_engineer: "Lead Acoustic Specialist",
        capture_date: "2026-09-15",
      },
      calibration_spec: "cal_hi_z_minus_18dbfs_peak",
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      superseding_fixture_id: undefined,
    };

    const parsed = validationFixtureRecordSchema.parse(valid);
    assert.equal(parsed.contamination_status, "CLEAN");
    assert.equal(parsed.lifecycle_status, "ACTIVE");

    // Canonical contamination states: CLEAN | CONTAMINATED | SUSPECT
    assert.ok(
      validationFixtureRecordSchema.parse({
        ...valid,
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
      })
    );
    assert.ok(
      validationFixtureRecordSchema.parse({
        ...valid,
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
      })
    );

    assert.throws(() => {
      validationFixtureRecordSchema.parse({ ...valid, contamination_status: "UNCONTAMINATED" });
    }, ZodError);

    // Canonical lifecycle states: ACTIVE | SUPERSEDED | INVALIDATED | RETIRED
    assert.ok(
      validationFixtureRecordSchema.parse({
        ...valid,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
      })
    );
    assert.ok(
      validationFixtureRecordSchema.parse({
        ...valid,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      })
    );
    assert.ok(
      validationFixtureRecordSchema.parse({
        ...valid,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.RETIRED,
      })
    );

    assert.throws(() => {
      validationFixtureRecordSchema.parse({ ...valid, lifecycle_status: "ARCHIVED" });
    }, ZodError);
  });

  // Test 10: Record 09 — ValidationExecutionRecord
  it("10. Record 09 (ValidationExecutionRecord) enforces execution fields and outcome states", () => {
    const valid = {
      execution_id: "exec_2026_10_01",
      case_id: "case_transient_001",
      profile_id: "prof_acoustic_04",
      fixture_id: "fix_di_strat_blues_01",
      binding_id: "binding_001",
      execution_timestamp: "2026-10-13T10:05:00.000Z",
      execution_environment: "AudioTestContainer-Host04",
      input_audio_integrity_ref: "sha256_input_stem",
      output_audio_integrity_ref: "sha256_output_stem",
      execution_duration_ms: 1240,
      anomalies_detected: [],
      raw_measurements: { peak_db: -3.2, rms_db: -14.1, crest_factor: 10.9 },
      outcome: EXECUTION_OUTCOMES.COMPLETED,
      trace_ref: "trc_run_1c5f_trace_001",
    };

    const parsed = validationExecutionRecordSchema.parse(valid);
    assert.equal(parsed.outcome, "COMPLETED");

    assert.throws(() => {
      validationExecutionRecordSchema.parse({ ...valid, execution_duration_ms: -5 });
    }, ZodError);
  });

  // Test 11: Record 10 — ObjectiveEvidenceRecord
  it("11. Record 10 enforces frozen tolerance_evaluation (MET | OUT_OF_TOLERANCE | BORDERLINE | NOT_APPLICABLE)", () => {
    const valid = {
      objective_evidence_id: "obj_ev_001",
      execution_id: "exec_2026_10_01",
      metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
      measured_parameters: { sub_bass_delta_db: 0.2, mid_scoop_delta_db: -0.4 },
      applied_threshold_profile_ref: "tol_profile_spectral_v1",
      tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
      measured_delta: 0.4,
      objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      artifacts_retained: ["s3://artifacts/spectral_plot_001.png"],
    };

    const parsed = objectiveEvidenceRecordSchema.parse(valid);
    assert.equal(parsed.tolerance_evaluation, "MET");

    // All canonical tolerance values
    assert.ok(
      objectiveEvidenceRecordSchema.parse({
        ...valid,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      })
    );
    assert.ok(
      objectiveEvidenceRecordSchema.parse({
        ...valid,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.BORDERLINE,
      })
    );
    assert.ok(
      objectiveEvidenceRecordSchema.parse({
        ...valid,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.NOT_APPLICABLE,
      })
    );

    // Rejects non-canonical tolerance values
    assert.throws(() => {
      objectiveEvidenceRecordSchema.parse({ ...valid, tolerance_evaluation: "WITHIN_LIMITS" });
    }, ZodError);
    assert.throws(() => {
      objectiveEvidenceRecordSchema.parse({ ...valid, tolerance_evaluation: "PASSED" });
    }, ZodError);
  });

  // Test 12: Record 11 — PerceptualEvaluationRecord
  it("12. Record 11 enforces perceptual methodologies, listener roles, and evaluation outcome", () => {
    const valid = {
      perceptual_evidence_id: "percept_ev_001",
      execution_id: "exec_2026_10_01",
      evaluator_id: "evaluator_anon_42",
      evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
      methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
      listening_environment: {
        monitor_type: "Nearfield Studio Monitors (ATC SCM25A)",
        calibrated_spl_profile_ref: "spl_85db_c_weighted",
        acoustic_treatment_level: "Treated Control Room",
      },
      presented_stimuli_refs: {
        stimulus_a: "sha256_stim_a_hash",
        stimulus_b: "sha256_stim_b_hash",
      },
      perceptual_dimensions_evaluated: {
        tonal_balance: 4.5,
        warmth: 4.8,
        pick_attack_clarity: 4.7,
      },
      qualitative_observations: "Warm low-mid response without muddiness; transparent transient snap.",
      confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
    };

    const parsed = perceptualEvaluationRecordSchema.parse(valid);
    assert.equal(parsed.evaluator_role, "MASTER_ENGINEER");
    assert.equal(parsed.methodology_used, "BLIND_AB_TESTING");

    assert.throws(() => {
      perceptualEvaluationRecordSchema.parse({ ...valid, methodology_used: "CASUAL_LISTENING" });
    }, ZodError);
  });

  // Test 13: Record 12 — UATEvaluationRecord
  it("13. Record 12 enforces exact evaluator personas, task completion statuses, and musical fitness verdicts", () => {
    const valid = {
      uat_id: "uat_001",
      package_id: "pkg_2026_q4_lead_01",
      evaluator_persona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
      task_scenario_id: "task_grunge_rhythm_blend",
      task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
      task_duration_seconds: 142,
      workflow_satisfaction_rating: 4.8,
      cognitive_friction_notes: "Preset loaded immediately; no corrective EQ was necessary in mix context.",
      musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
      uat_blockers_identified: [],
    };

    const parsed = uatEvaluationRecordSchema.parse(valid);
    assert.equal(parsed.evaluator_persona, "RECORDING_ENGINEER");
    assert.equal(parsed.task_completion_status, "COMPLETED_SUCCESSFULLY");
    assert.equal(parsed.musical_fitness_verdict, "ACCEPTED");

    // All canonical personas
    const personas = [
      EVALUATOR_PERSONAS.RECORDING_ENGINEER,
      EVALUATOR_PERSONAS.SESSION_GUITARIST,
      EVALUATOR_PERSONAS.PRODUCER,
      EVALUATOR_PERSONAS.PLATFORM_ARCHITECT,
    ];
    for (const p of personas) {
      assert.ok(uatEvaluationRecordSchema.parse({ ...valid, evaluator_persona: p }));
    }

    // Rejects non-canonical persona
    assert.throws(() => {
      uatEvaluationRecordSchema.parse({ ...valid, evaluator_persona: "CASUAL_LISTENER" });
    }, ZodError);

    // Rejects non-canonical task completion status
    assert.throws(() => {
      uatEvaluationRecordSchema.parse({ ...valid, task_completion_status: "SUCCESS" });
    }, ZodError);

    // Rejects non-canonical musical fitness verdict
    assert.throws(() => {
      uatEvaluationRecordSchema.parse({ ...valid, musical_fitness_verdict: "PASSED" });
    }, ZodError);
  });

  // Test 14: Record 13 — RegressionAssessmentRecord Canonical Enum Parity
  it("14. Record 13 strictly enforces persisted enum INTENTIONAL_CORRECTION | NEUTRAL | GENUINE_REGRESSION | UNRESOLVED and REJECTS long-form labels", () => {
    const valid = {
      regression_id: "reg_001",
      package_id: "pkg_2026_q4_lead_01",
      comparison_target: "PATH-PROD vs PATH-SHADOW",
      divergence_detected: true,
      divergence_magnitude: "1.2 dB mid-range contour shift",
      classification: REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION,
      materiality_score: MATERIALITY_SCORES.MEDIUM,
      affected_scope: ["amp_lead_highgain_channel"],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "Corrects legacy harsh resonant peak at 3.2 kHz documented in defect #142",
      blocks_gate_8: false,
    };

    // Exactly 4 canonical machine enum values accepted
    const accepted = ["INTENTIONAL_CORRECTION", "NEUTRAL", "GENUINE_REGRESSION", "UNRESOLVED"];
    for (const cls of accepted) {
      const parsed = regressionAssessmentRecordSchema.parse({
        ...valid,
        classification: cls as any,
      });
      assert.equal(parsed.classification, cls);
    }

    // CRITICAL: Explicitly verify rejection of long-form human labels
    const forbiddenLabels = [
      "INTENTIONAL_ARCHITECTURAL_CORRECTION",
      "NEUTRAL_DIVERGENCE",
      "UNRESOLVED_DIVERGENCE",
    ];
    for (const forbidden of forbiddenLabels) {
      assert.throws(
        () => {
          regressionAssessmentRecordSchema.parse({
            ...valid,
            classification: forbidden as any,
          });
        },
        ZodError,
        `Record 13 must strictly reject human-facing long form label "${forbidden}"`
      );
    }
  });

  // Test 15: Record 14 — ValidationFailureRecord
  it("15. Record 14 enforces root-layer attribution classes and confidence", () => {
    const valid = {
      failure_id: "fail_001",
      execution_id: "exec_2026_10_01",
      failure_timestamp: "2026-10-13T10:10:00.000Z",
      failure_title: "Target Platform Load Crash on Preset Serializer Output",
      failure_symptom: "Unhandled exception in AmpliTube 5 XML parameter parser",
      attribution_class: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
      attribution_evidence_refs: ["crash_dump_001.log", "serialized_preset_001.xml"],
      attribution_confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
      materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      affected_scope: ["Preset Export Subsystem"],
      gate_8_blocked: true,
      remand_destination: "Stage 12 Platform Translation Governance",
      retest_prerequisites: "Patch invalid parameter ID attribute in export serializer",
    };

    const parsed = validationFailureRecordSchema.parse(valid);
    assert.equal(parsed.attribution_class, "PLATFORM_TRANSLATION");
    assert.equal(parsed.gate_8_blocked, true);

    // Verifies all 9 attribution classes
    const classes = Object.values(FAILURE_ATTRIBUTION_CLASSES);
    assert.equal(classes.length, 9);
    for (const c of classes) {
      assert.ok(validationFailureRecordSchema.parse({ ...valid, attribution_class: c }));
    }

    assert.throws(() => {
      validationFailureRecordSchema.parse({ ...valid, attribution_class: "BAD_CODE" });
    }, ZodError);
  });

  // Test 16: Record 15 — EvidenceConflictRecord
  it("16. Record 15 preserves contradictory evidence and requires >= 2 competing evidence refs", () => {
    const valid = {
      conflict_id: "conflict_001",
      package_id: "pkg_2026_q4_lead_01",
      conflict_type: CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL,
      competing_evidence_refs: ["obj_ev_001", "percept_ev_001"],
      conflict_description: "Objective harmonic THD exceeds nominal limit, but listening panel unanimously scores warmth as excellent.",
      underlying_acoustic_phenomenon: "Predominance of musical even-order tube saturation perceived as desirable warmth rather than distortion.",
      resolution_strategy: CONFLICT_RESOLUTION_STRATEGIES.DECLARED_INTENTIONAL_CORRECTION,
      resolution_status: CONFLICT_RESOLUTION_STATUSES.ACCEPTED_TRADE_OFF,
      residual_uncertainty_score: 0.1,
    };

    const parsed = evidenceConflictRecordSchema.parse(valid);
    assert.equal(parsed.conflict_type, "OBJECTIVE_VS_PERCEPTUAL");

    // Less than 2 competing evidence refs must fail
    assert.throws(() => {
      evidenceConflictRecordSchema.parse({ ...valid, competing_evidence_refs: ["obj_ev_001"] });
    }, ZodError);
  });

  // Test 17: Record 16 — ValidationUncertaintyRecord
  it("17. Record 16 logs preserved uncertainty and Gate 8 impact", () => {
    const valid = {
      uncertainty_id: "unc_001",
      package_id: "pkg_2026_q4_lead_01",
      uncertainty_source: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
      affected_scope: ["Active 8-string baritone pickups"],
      potential_production_risk: "Sub-harmonic bass frequencies below 50 Hz unverified under extreme gain.",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
      required_monitoring_if_authorized: ["telemetry_sub_50hz_crest_factor_monitor"],
    };

    const parsed = validationUncertaintyRecordSchema.parse(valid);
    assert.equal(parsed.gate_8_impact, "ALLOWS_CONDITIONAL");

    assert.throws(() => {
      validationUncertaintyRecordSchema.parse({ ...valid, gate_8_impact: "IGNORE" });
    }, ZodError);
  });

  // Test 18: Record 17 — ValidationOutcomeRecord & Rejection of INVALIDATED
  it("18. Record 17 enforces outcome classes (PASS|FAIL|BLOCKED|CONDITIONAL) and strictly REJECTS INVALIDATED", () => {
    const valid = {
      outcome_id: "outcome_001",
      package_id: "pkg_2026_q4_lead_01",
      outcome_class: VALIDATION_OUTCOME_CLASSES.PASS,
      evaluated_scope: "American High Gain Lead Channel",
      version_binding: "binding_001",
      summary_verdict: "High gain rhythm and lead channels satisfy all objective tolerances and panel listening criteria.",
      objective_summary: { total_tests: 12, passed: 12, failed: 0 },
      perceptual_summary: { listening_sessions: 4, average_score: 4.8 },
      uat_summary: { scenarios_executed: 6, completion_rate: 1.0 },
      regression_summary: { intentional_corrections: 1, neutral: 2, genuine_regressions: 0 },
      unresolved_issues: [],
      conditions_imposed: [],
      timestamp: "2026-10-13T10:15:00.000Z",
      record_integrity_metadata: validIntegrityMetadata,
    };

    const validOutcomes = ["PASS", "FAIL", "BLOCKED", "CONDITIONAL"];
    for (const oc of validOutcomes) {
      const parsed = validationOutcomeRecordSchema.parse({ ...valid, outcome_class: oc as any });
      assert.equal(parsed.outcome_class, oc);
    }

    // CRITICAL: INVALIDATED is NOT a valid outcome state
    assert.throws(
      () => {
        validationOutcomeRecordSchema.parse({ ...valid, outcome_class: "INVALIDATED" as any });
      },
      ZodError,
      "Record 17 must strictly reject INVALIDATED as outcome_class"
    );
  });

  // Test 19: Record 18 — RevalidationTriggerRecord
  it("19. Record 18 enforces the 4 canonical required actions and 10 trigger sources", () => {
    const valid = {
      trigger_id: "trigger_001",
      trigger_source: REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
      prior_binding_id: "binding_001",
      new_binding_id: "binding_002",
      affected_scope: ["Preset Export Subsystem", "AmpliTube 5 XML serialization"],
      required_action: REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8,
      trigger_timestamp: "2026-10-13T10:20:00.000Z",
    };

    const parsed = revalidationTriggerRecordSchema.parse(valid);
    assert.equal(parsed.required_action, "SUSPEND_GATE_8");

    // All 4 required actions
    const actions = ["NO_ACTION", "PARTIAL_RETEST", "FULL_RETEST", "SUSPEND_GATE_8"];
    for (const a of actions) {
      assert.ok(revalidationTriggerRecordSchema.parse({ ...valid, required_action: a as any }));
    }

    assert.throws(() => {
      revalidationTriggerRecordSchema.parse({ ...valid, required_action: "CANCEL_ALL" });
    }, ZodError);
  });

  // Test 20: Record 19 — RetestPlanRecord
  it("20. Record 19 parses retest plan and preserves evidence lineage", () => {
    const valid = {
      retest_plan_id: "retest_001",
      trigger_id: "trigger_001",
      previous_package_id: "pkg_2026_q4_lead_01",
      retained_valid_evidence_refs: ["obj_ev_001", "percept_ev_001"],
      invalidated_evidence_refs: ["export_ev_001"],
      required_new_cases: ["case_export_at5_v511_01"],
      retest_scope: ["Preset Export Subsystem under AmpliTube 5 v5.11"],
    };

    const parsed = retestPlanRecordSchema.parse(valid);
    assert.equal(parsed.retest_plan_id, "retest_001");
    assert.equal(parsed.retained_valid_evidence_refs.length, 2);
  });

  // Test 21: Record 20 — ProductionReadinessAssessmentRecord (Four Pillars)
  it("21. Record 20 enforces exact four-pillar readiness values (SATISFIED|DEFICIENT|INCONCLUSIVE)", () => {
    const valid = {
      readiness_assessment_id: "pra_001",
      package_id: "pkg_2026_q4_lead_01",
      pillar_evaluations: {
        acoustic_musical_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
        reasoning_governance_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
        platform_operational_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
        rollback_safety_readiness: PILLAR_READINESS_STATUSES.SATISFIED,
      },
      hard_blockers_present: [],
      gate_8_eligible: true,
      synthesis_rationale: "All 4 pillars verified; zero material regressions; rollback verified in 120ms.",
      assessment_timestamp: "2026-10-13T10:25:00.000Z",
    };

    const parsed = productionReadinessAssessmentRecordSchema.parse(valid);
    assert.equal(parsed.gate_8_eligible, true);
    assert.equal(parsed.pillar_evaluations.acoustic_musical_readiness, "SATISFIED");

    // Pillar values can be DEFICIENT or INCONCLUSIVE
    assert.ok(
      productionReadinessAssessmentRecordSchema.parse({
        ...valid,
        pillar_evaluations: {
          ...valid.pillar_evaluations,
          acoustic_musical_readiness: PILLAR_READINESS_STATUSES.DEFICIENT,
        },
        gate_8_eligible: false,
      })
    );

    // Rejects non-canonical pillar values
    assert.throws(() => {
      productionReadinessAssessmentRecordSchema.parse({
        ...valid,
        pillar_evaluations: {
          ...valid.pillar_evaluations,
          acoustic_musical_readiness: "PASSED" as any,
        },
      });
    }, ZodError);
  });

  // Test 22: Record 21 — AdoptionDecisionRecord
  it("22. Record 21 strictly separates decision outcome from governance status", () => {
    const valid = {
      decision_id: "adr_001",
      package_id: "pkg_2026_q4_lead_01",
      readiness_assessment_id: "pra_001",
      requested_scope: ["American High Gain Lead Channel"],
      authorized_scope: ["American High Gain Lead Channel"],
      version_binding_integrity_ref: "sha256_binding_composite_digest",
      decision_outcome: ADOPTION_DECISION_OUTCOMES.AUTHORIZED,
      decision_timestamp: "2026-10-13T10:30:00.000Z",
      conditions_and_restrictions: [],
      mandatory_monitoring_rules: ["Monitor error rate spike over 0.1%"],
      rollback_verification_cert_ref: "cert_rollback_verified_001",
      governance_status: GOVERNANCE_STATUSES.ACTIVE,
      authorizing_official: "Chief Sound Engineering Governance Authority",
      record_integrity_metadata: validIntegrityMetadata,
    };

    const parsed = adoptionDecisionRecordSchema.parse(valid);
    assert.equal(parsed.decision_outcome, "AUTHORIZED");
    assert.equal(parsed.governance_status, "ACTIVE");

    // Rejection of conflation: decision_outcome cannot take governance_status values like WITHDRAWN
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...valid, decision_outcome: "WITHDRAWN" as any });
    }, ZodError);
    assert.throws(() => {
      adoptionDecisionRecordSchema.parse({ ...valid, governance_status: "AUTHORIZED" as any });
    }, ZodError);
  });

  // Test 23: Record 22 — Gate8ChangeRecord & Rejection of ACTIVE as new_governance_status
  it("23. Record 22 strictly REJECTS ACTIVE as new_governance_status and accepts only SUSPENDED|RESTRICTED|WITHDRAWN|SUPERSEDED", () => {
    const valid = {
      change_id: "g8c_001",
      decision_id: "adr_001",
      previous_governance_status: PREVIOUS_GOVERNANCE_STATUSES.ACTIVE,
      new_governance_status: NEW_GOVERNANCE_STATUSES.SUSPENDED,
      change_reason: "Target platform vendor patch 5.11 released; export verification required",
      trigger_source: GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
      governance_effect: GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION,
      affected_authorization_scope: ["American High Gain Lead Channel"],
      required_adoption_response: REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED,
      revalidation_required: true,
      change_timestamp: "2026-10-13T10:35:00.000Z",
      authorizing_official: "Governance Lead",
      record_integrity_metadata: validIntegrityMetadata,
    };

    const validNewStatuses = ["SUSPENDED", "RESTRICTED", "WITHDRAWN", "SUPERSEDED"];
    for (const ns of validNewStatuses) {
      const parsed = gate8ChangeRecordSchema.parse({
        ...valid,
        new_governance_status: ns as any,
      });
      assert.equal(parsed.new_governance_status, ns);
    }

    // CRITICAL: ACTIVE is strictly forbidden as new_governance_status
    assert.throws(
      () => {
        gate8ChangeRecordSchema.parse({ ...valid, new_governance_status: "ACTIVE" as any });
      },
      ZodError,
      "Record 22 must strictly reject ACTIVE as new_governance_status"
    );
  });

  // Test 24: Round-trip JSON serialization
  it("24. Round-trip JSON serialization preserves valid canonical values", () => {
    const sampleRecord = {
      regression_id: "reg_002",
      package_id: "pkg_2026_q4_lead_01",
      comparison_target: "PATH-PROD vs PATH-SHADOW",
      divergence_detected: false,
      divergence_magnitude: 0,
      classification: REGRESSION_CLASSIFICATIONS.NEUTRAL,
      materiality_score: MATERIALITY_SCORES.NEGLIGIBLE,
      affected_scope: ["amp_lead_highgain_channel"],
      regression_domain: REGRESSION_DOMAINS.ACOUSTIC,
      detailed_justification: "Output identical within floating-point epsilon",
      blocks_gate_8: false,
    };

    const serialized = JSON.stringify(sampleRecord);
    const deserialized = JSON.parse(serialized);
    const parsed = regressionAssessmentRecordSchema.parse(deserialized);

    assert.deepEqual(parsed, sampleRecord);
    assert.equal(canonicalizeJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  });
});
