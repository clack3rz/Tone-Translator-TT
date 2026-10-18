// src/tests/validationPackages.test.ts
// Comprehensive unit and integration tests for Phase 1C.5h WP-09:
// ValidationPackage Composition & Sealing Engine (Record 6).
// Bound to frozen specification v0.1j Section 11, Section 13, and Invariant 2.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  READINESS_OUTCOMES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  parseValidationPackage,
  ValidationCase,
  ValidationReadinessAssessmentRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { GOVERNED_EDGE_TYPES, InvalidEndpointError } from "../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import { FixtureCorpusManager } from "../sound-engineer/validation/fixtures/fixtureManager";
import { ValidationCaseBuilder } from "../sound-engineer/validation/cases/caseBuilder";
import {
  PackageCompositionError,
  PackageCoverageError,
  PackageFixtureInvalidatedError,
  PackageReadinessError,
  PackageSealedMutationError,
  PackageScopeBindingMismatchError,
  ValidationPackageComposer,
} from "../sound-engineer/validation/packages";

describe("Phase 1C.5h — WP-09: Validation Package Composition Engine (Record 6)", () => {
  const sampleScope: ValidationScopeRecord = {
    scope_id: "scope_lead_rig_01",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["amp_lead_5150", "cab_4x12_vintage"],
    excluded_units: ["amp_clean_tweed"],
    boundary_constraints: ["Isolated under Axiom 6 boundary"],
    scope_inflation_protection: true,
  };

  const sampleBinding: ValidationVersionBindingRecord = {
    binding_id: "bnd_2026_scope_lead_rig_01",
    scope_id: "scope_lead_rig_01",
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

  const sampleReadinessReady: ValidationReadinessAssessmentRecord = {
    readiness_id: "readiness_001",
    intake_id: "intake_2026_01",
    evaluated_prerequisites: {
      "Handoff Integrity": "PASS",
      "All Seven Phase 1C.5g Gates Documented": "PASS",
      "Golden Fixture Availability": "PASS",
      "Execution Environment Stability": "PASS",
      "Traceability Pipeline Active": "PASS",
      "Comparability Verified": "PASS",
      "Rollback Staging Verified": "PASS",
      "Absence of Unresolved Upstream Blockers": "PASS",
    },
    fixture_coverage_ratio: 1.0,
    readiness_outcome: READINESS_OUTCOMES.READY,
    limitation_notes: [],
    assessment_timestamp: "2026-03-20T00:00:00Z",
    assessor_id: "Lead Auditor",
  };

  const sampleReadinessBlocked: ValidationReadinessAssessmentRecord = {
    ...sampleReadinessReady,
    readiness_id: "readiness_blocked_001",
    readiness_outcome: READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE,
    evaluated_prerequisites: {
      ...sampleReadinessReady.evaluated_prerequisites,
      "Golden Fixture Availability": "FAIL",
    },
    fixture_coverage_ratio: 0.0,
  };

  function createSampleCases(caseBuilder: ValidationCaseBuilder): ValidationCase[] {
    // Case 1: Objective Acoustic (Profile 04)
    const case1 = caseBuilder.buildCase({
      case_id: "CASE-ACOUSTIC-5150-01",
      title: "5150 Lead Frequency Response & THD",
      validation_question:
        "Does the 5150 lead amplifier model frequency response conform to the calibrated acoustic benchmark within tolerance?",
      validation_subject: "amp_lead_5150",
      scoped_boundaries: ["amp_lead_5150"],
      applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: [],
      evaluation_methodology: "Acoustic FFT spectral analysis",
      acceptance_criteria_ref: "TOL_SPECTRAL_FREQUENCY_RESPONSE_V1",
      failure_consequence: "Blocks amplifier model progression",
      expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
    });

    // Case 2: Structural Schema (Profile 01)
    const case2 = caseBuilder.buildCase({
      case_id: "CASE-SCHEMA-5150-01",
      title: "5150 Lead Parameter Schema Conformance",
      validation_question:
        "Do all 5150 lead amplifier parameters strictly conform to the governing structural parameter schema?",
      validation_subject: "amp_lead_5150",
      scoped_boundaries: ["amp_lead_5150"],
      applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: [],
      evaluation_methodology: "Schema AST verification",
      acceptance_criteria_ref: "SPEC_PARAMETER_SCHEMA_V1",
      failure_consequence: "Blocks parameter export",
      expected_remand_destination: "STAGE_12_PLATFORM_TRANSLATION",
    });

    return [case1, case2];
  }

  describe("A. Record 6 Schema & Sealing Parity", () => {
    it("successfully composes, seals, and validates a ValidationPackage", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        readinessRecord: sampleReadinessReady,
      });

      // Explicitly assign profiles that match cases
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);

      composer.addCases(cases);

      const envelope = composer.sealPackage();
      assert.ok(envelope);
      assert.ok(envelope.packageRecord.package_id.startsWith("PKG-"));
      assert.equal(envelope.packageRecord.scope_record_ref, sampleScope.scope_id);
      assert.equal(envelope.packageRecord.version_binding_ref, sampleBinding.binding_id);
      assert.equal(envelope.caseCount, 2);
      assert.equal(envelope.coverage.isComplete, true);

      // Verify schema parity using parseValidationPackage
      const parsed = parseValidationPackage(envelope.packageRecord);
      assert.equal(parsed.package_id, envelope.packageRecord.package_id);
    });

    it("verifies downstream execution, evidence, and outcome fields remain strictly empty/unset", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer.addCases(cases);

      const envelope = composer.sealPackage();
      const pkg = envelope.packageRecord;

      // Downstream fields must be empty arrays or undefined
      assert.deepEqual(pkg.execution_record_refs, []);
      assert.deepEqual(pkg.evidence_refs, []);
      assert.equal(pkg.outcome_record_ref, undefined);
      assert.equal(pkg.gate8_decision_ref, undefined);
    });
  });

  describe("B. Package Sealing Immutability & Determinism", () => {
    it("enforces immutability: prohibits case insertion or configuration after sealing", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer.addCases(cases);
      composer.sealPackage();

      assert.equal(composer.isSealed(), true);

      // Mutation attempts after seal must throw PackageSealedMutationError
      assert.throws(() => composer.addCase(cases[0]), PackageSealedMutationError);
      assert.throws(() => composer.setAssignedProfiles([]), PackageSealedMutationError);
      assert.throws(() => composer.sealPackage(), PackageSealedMutationError);
    });

    it("derives deterministic package ID and seal for identical canonical input", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer1 = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer1.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer1.addCases(cases);
      const env1 = composer1.sealPackage({ timestamp: "2026-03-20T12:00:00Z" });

      const composer2 = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer2.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer2.addCases(cases);
      const env2 = composer2.sealPackage({ timestamp: "2026-03-20T12:00:00Z" });

      assert.equal(env1.packageRecord.package_id, env2.packageRecord.package_id);
      assert.equal(env1.integrityMetadata.integrity_digest, env2.integrityMetadata.integrity_digest);
    });
  });

  describe("C. One Package = One Scope + One Binding Invariant", () => {
    it("rejects composition when version binding does not match scope", () => {
      const mismatchedBinding: ValidationVersionBindingRecord = {
        ...sampleBinding,
        scope_id: "scope_different_unrelated_99",
      };

      const composer = new ValidationPackageComposer();

      assert.throws(
        () => composer.setScopeAndBinding(sampleScope, mismatchedBinding),
        PackageScopeBindingMismatchError
      );
    });

    it("rejects empty package (zero cases)", () => {
      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      assert.throws(() => composer.sealPackage(), PackageCompositionError);
    });
  });

  describe("D. Mandatory Profile Coverage Matrix (Special Test: Profile Coverage)", () => {
    it("fails package sealing if any mandatory profile is missing case coverage", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      // Provide only Profile 01 case, leaving Profile 04 and Profile 12 uncovered
      const case1Only = caseBuilder.buildCase({
        case_id: "CASE-SCHEMA-ONLY-01",
        title: "Schema Only Case",
        validation_question: "Does the model conform to structural schema?",
        validation_subject: "amp_lead_5150",
        scoped_boundaries: ["amp_lead_5150"],
        applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Schema AST parsing",
        acceptance_criteria_ref: "SPEC_SCHEMA_V1",
        failure_consequence: "Blocks progression",
        expected_remand_destination: "STAGE_12_PLATFORM_TRANSLATION",
      });

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      // Require Profile 01 and Profile 04
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);

      composer.addCase(case1Only);

      // Must throw PackageCoverageError identifying PROFILE-04 / PROFILE_04_OBJECTIVE_ACOUSTIC as uncovered
      assert.throws(
        () => composer.sealPackage(),
        (err: unknown) => {
          assert.ok(err instanceof PackageCoverageError);
          assert.ok(
            err.uncoveredMandatoryProfiles.includes("PROFILE-04") ||
            err.uncoveredMandatoryProfiles.includes(TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC)
          );
          return true;
        }
      );
    });

    it("Special Test — Profile Coverage: reports PROFILE-12 uncovered when mandatory profiles PROFILE-01, PROFILE-03, PROFILE-12 are assigned but cases cover only PROFILE-01, PROFILE-03", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      const caseP01 = caseBuilder.buildCase({
        case_id: "CASE-P01-TEST",
        title: "P01 Case",
        validation_question: "Does the preset load in target platform without schema error?",
        validation_subject: "amp_lead_5150",
        scoped_boundaries: ["amp_lead_5150"],
        applicable_test_dimensions: ["PROFILE-01"],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Schema verification",
        acceptance_criteria_ref: "SPEC_SCHEMA_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "STAGE_12_PLATFORM_TRANSLATION",
      });

      const caseP03 = caseBuilder.buildCase({
        case_id: "CASE-P03-TEST",
        title: "P03 Case",
        validation_question: "Does the exported XML load in target platform DAW host?",
        validation_subject: "amp_lead_5150",
        scoped_boundaries: ["amp_lead_5150"],
        applicable_test_dimensions: ["PROFILE-03"],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Target host loader verification",
        acceptance_criteria_ref: "SPEC_XML_HOST_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "STAGE_12_PLATFORM_TRANSLATION",
      });

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      composer.setAssignedProfiles(["PROFILE-01", "PROFILE-03", "PROFILE-12"]);
      composer.addCases([caseP01, caseP03]);

      assert.throws(
        () => composer.sealPackage(),
        (err: unknown) => {
          assert.ok(err instanceof PackageCoverageError);
          assert.deepEqual(err.uncoveredMandatoryProfiles, ["PROFILE-12"]);
          return true;
        }
      );
    });

    it("permits sealing when an optional profile is omitted without blocking", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      // Assign only Profile 01 and Profile 04 (omitting optional Profile 06, Profile 07, etc.)
      composer.setAssignedProfiles(["PROFILE-01", "PROFILE-04"]);
      composer.addCases(cases);

      const envelope = composer.sealPackage();
      assert.ok(envelope);
      assert.equal(envelope.coverage.isComplete, true);
    });

    it("rejects unknown profile IDs assigned to package", () => {
      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      assert.throws(
        () => composer.setAssignedProfiles(["PROFILE-NON-EXISTENT-999"]),
        PackageCompositionError
      );
    });
  });

  describe("E. Readiness Gate Audit Integration (WP-06)", () => {
    it("rejects package composition/sealing if readiness outcome is BLOCKED_NOT_EVALUABLE", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        readinessRecord: sampleReadinessBlocked,
      });
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer.addCases(cases);

      assert.throws(() => composer.sealPackage(), PackageReadinessError);
    });

    it("handles READY_WITH_DECLARED_LIMITATIONS: rejects cases evaluating unevaluable limited scope", () => {
      const limitedReadiness: ValidationReadinessAssessmentRecord = {
        readiness_id: "readiness_lim_001",
        intake_id: "intake_2026_01",
        evaluated_prerequisites: {
          "Handoff Integrity": "PASS",
          "All Seven Phase 1C.5g Gates Documented": "PASS",
        },
        fixture_coverage_ratio: 0.85,
        readiness_outcome: READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS,
        limitation_notes: ["Excluded: cab_4x12_vintage is unevaluable due to missing acoustic calibration"],
        assessment_timestamp: "2026-03-20T00:00:00Z",
        assessor_id: "Lead Auditor",
      };

      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      const caseEvaluatingLimited = caseBuilder.buildCase({
        case_id: "CASE-LIMITED-CAB-01",
        title: "Cab 4x12 Validation",
        validation_question: "Does the cab 4x12 vintage model meet tolerance?",
        validation_subject: "cab_4x12_vintage",
        scoped_boundaries: ["cab_4x12_vintage"],
        applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Schema verification",
        acceptance_criteria_ref: "SPEC_SCHEMA_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
      });

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        readinessRecord: limitedReadiness,
      });

      composer.setAssignedProfiles([TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA]);
      composer.addCase(caseEvaluatingLimited);

      assert.throws(() => composer.sealPackage(), PackageReadinessError);
    });
  });

  describe("F. Fixture Revalidation Race (Special Test: Fixture Contamination Before Seal)", () => {
    it("fails package sealing if a fixture is contaminated between case creation and package seal", () => {
      const fixtureManager = new FixtureCorpusManager({ loadBootstrapCorpus: false });
      const fixtureRecord = {
        fixture_id: "FIX-DI-5150-RACE-01",
        fixture_name: "5150 Race Test DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:valid_di_hash",
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          instrument_details: "Fender Stratocaster Bridge Pickup",
          capture_hardware: "Radial JDI Direct Box -> Apollo x8",
          recording_engineer: "Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      };
      fixtureManager.registerFixture(fixtureRecord);

      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        fixtureManager,
      });

      // Build case with valid CLEAN fixture
      const validCase = caseBuilder.buildCase({
        case_id: "CASE-DI-RACE-01",
        title: "DI Race Case",
        validation_question: "Does the 5150 model replicate the DI performance fixture within spectral tolerance?",
        validation_subject: "amp_lead_5150",
        scoped_boundaries: ["amp_lead_5150"],
        applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        associated_fixture_set: ["FIX-DI-5150-RACE-01"],
        evaluation_methodology: "Acoustic FFT analysis",
        acceptance_criteria_ref: "TOL_SPECTRAL_DELTA_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
      });

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        fixtureManager,
      });
      composer.setAssignedProfiles([TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC]);
      composer.addCase(validCase);

      // Now, simulate contamination race: fixture is marked CONTAMINATED before package seal!
      fixtureManager.flagContaminated("FIX-DI-5150-RACE-01", "Leaked into prompt tuning set");

      // Package seal MUST fail closed
      assert.throws(
        () => composer.sealPackage(),
        (err: unknown) => {
          assert.ok(err instanceof PackageFixtureInvalidatedError);
          assert.equal(err.fixtureId, "FIX-DI-5150-RACE-01");
          return true;
        }
      );

      // The case must NOT be silently mutated or rewritten
      assert.equal(validCase.associated_fixture_set.length, 1);
      assert.equal(validCase.associated_fixture_set[0], "FIX-DI-5150-RACE-01");
    });
  });

  describe("G. Graph Linage & Governance Ownership (Special Tests: No TESTED_WITH, Exact 14 Edges)", () => {
    it("registers nodes and creates VALIDATES and BOUND_TO edges with zero TESTED_WITH edges", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();

      const dualScope: ValidationScopeRecord = {
        scope_id: "scope_lead_reasoning_01",
        intake_id: "intake_2026_01",
        primary_domain: VALIDATION_PRIMARY_DOMAINS.REASONING_CAPABILITY,
        included_units: ["amp_lead_5150", "cab_4x12_vintage", "at5_mic_placement_reasoning"],
        excluded_units: ["amp_clean_tweed"],
        boundary_constraints: ["Isolated under Axiom 6 boundary"],
        scope_inflation_protection: true,
      };

      const dualBinding: ValidationVersionBindingRecord = {
        ...sampleBinding,
        binding_id: "bnd_2026_scope_lead_reasoning_01",
        scope_id: "scope_lead_reasoning_01",
      };

      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: dualScope,
        versionBinding: dualBinding,
      });

      const case1 = caseBuilder.buildCase({
        case_id: "CASE-MIGRATION-CANDIDATE-01",
        title: "5150 Lead Model Acoustic Validation",
        validation_question: "Does the 5150 lead model meet acoustic tolerance criteria?",
        validation_subject: "amp_lead_5150",
        scoped_boundaries: ["amp_lead_5150"],
        applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Acoustic FFT",
        acceptance_criteria_ref: "TOL_SPECTRAL_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
      });

      const case2 = caseBuilder.buildCase({
        case_id: "CASE-REASONING-COMPONENT-01",
        title: "Mic Placement Reasoning Component Validation",
        validation_question: "Does the mic placement reasoning component compute valid coordinates?",
        validation_subject: "at5_mic_placement_reasoning",
        scoped_boundaries: ["at5_mic_placement_reasoning"],
        applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "Deterministic AST checking",
        acceptance_criteria_ref: "SPEC_COORDINATE_BOUND_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "PHASE_1C5C_DIAGNOSTIC_REASONING",
      });

      const composer = new ValidationPackageComposer({
        scopeRecord: dualScope,
        versionBinding: dualBinding,
        graph,
        ledger,
      });

      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);

      composer.addCase(case1, "MigrationCandidate");
      composer.addCase(case2, "ReasoningComponent");

      composer.sealPackage();

      // Verify graph edges
      const edges = graph.getEdges();

      // 1. BOUND_TO edge: ValidationPackage -> ValidationVersionBindingRecord
      const pkgBindingEdges = edges.filter(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.BOUND_TO && e.source.id.startsWith("PKG-")
      );
      assert.equal(pkgBindingEdges.length, 1);
      assert.equal(pkgBindingEdges[0].target.id, dualBinding.binding_id);

      // 2. BOUND_TO edges: ValidationCase -> ValidationVersionBindingRecord
      const caseBindingEdges = edges.filter(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.BOUND_TO && e.source.id.startsWith("CASE-")
      );
      assert.equal(caseBindingEdges.length, 2);

      // 3. VALIDATES edges:
      // ValidationCase -> MigrationCandidate ("amp_lead_5150")
      // ValidationCase -> ReasoningComponent ("at5_mic_placement_reasoning")
      const validatesEdges = edges.filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.VALIDATES);
      assert.equal(validatesEdges.length, 2);

      const targetKinds = validatesEdges.map((e) => e.target.kind).sort();
      assert.deepEqual(targetKinds, ["MigrationCandidate", "ReasoningComponent"]);

      // 4. SPECIAL TEST: ZERO TESTED_WITH EDGES
      // WP-09 must NOT create TESTED_WITH edges! Those belong strictly to WP-10 execution.
      const testedWithEdges = edges.filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.TESTED_WITH);
      assert.equal(testedWithEdges.length, 0, "WP-09 must create ZERO TESTED_WITH edges!");

      // 5. Governed catalogue remains exactly 14 edge types
      assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);

      // 6. Verify ledger entries were recorded
      assert.ok(ledger.getEntryCount() >= 5); // 2 cases + 1 package + 3 binding edges + 2 validates edges
    });

    it("rejects invalid VALIDATES edge target entity kinds", () => {
      const graph = new ValidationRelationshipGraph();
      graph.registerNode({ id: "CASE-01", kind: "ValidationCase" });
      graph.registerNode({ id: "INVALID-TARGET", kind: "ValidationFixtureRecord" });

      assert.throws(
        () =>
          graph.addEdge({
            edgeType: GOVERNED_EDGE_TYPES.VALIDATES,
            source: { id: "CASE-01", kind: "ValidationCase" },
            target: { id: "INVALID-TARGET", kind: "ValidationFixtureRecord" as any },
          }),
        InvalidEndpointError
      );
    });
  });

  describe("H. Special Test: Absence of Execution Artifacts & Audit Replay", () => {
    it("confirms no ValidationExecutionRecord, ObjectiveEvidenceRecord, or outcomes were created", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer.setAssignedProfiles([
        TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
        TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
      ]);
      composer.addCases(cases);

      const envelope = composer.sealPackage();
      const pkg = envelope.packageRecord;

      assert.equal(pkg.execution_record_refs.length, 0);
      assert.equal(pkg.evidence_refs.length, 0);
      assert.equal(pkg.outcome_record_ref, undefined);
      assert.equal(pkg.gate8_decision_ref, undefined);
    });

    it("changed package composition produces distinct deterministic identity and preserves prior package", () => {
      const caseBuilder = new ValidationCaseBuilder({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const cases = createSampleCases(caseBuilder);

      const composer1 = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      composer1.setAssignedProfiles(["PROFILE-01", "PROFILE-04"]);
      composer1.addCases(cases);
      const env1 = composer1.sealPackage();

      const composer2 = new ValidationPackageComposer({
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      // Add a third distinct case
      const case3 = caseBuilder.buildCase({
        case_id: "CASE-SCHEMA-EXTRA-01",
        title: "Extra Schema Case",
        validation_question: "Does the cab parameter schema match specification?",
        validation_subject: "cab_4x12_vintage",
        scoped_boundaries: ["cab_4x12_vintage"],
        applicable_test_dimensions: ["PROFILE-01"],
        required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
        evaluation_methodology: "AST parsing",
        acceptance_criteria_ref: "SPEC_CAB_SCHEMA_V1",
        failure_consequence: "Blocks cutover",
        expected_remand_destination: "STAGE_12_PLATFORM_TRANSLATION",
      });
      composer2.setAssignedProfiles(["PROFILE-01", "PROFILE-04"]);
      composer2.addCases([...cases, case3]);
      const env2 = composer2.sealPackage();

      assert.notEqual(env1.packageRecord.package_id, env2.packageRecord.package_id);
      assert.notEqual(env1.integrityMetadata.integrity_digest, env2.integrityMetadata.integrity_digest);
    });
  });
});
