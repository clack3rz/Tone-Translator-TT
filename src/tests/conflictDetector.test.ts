// src/tests/conflictDetector.test.ts
// Test suite for Phase 1C.5h WP-17: Evidence Conflict Preservation & Resolution Accounting (Record 15).
// Validates:
// 1. Conflict detection Type A (Metrics PASS / Ears FAIL) and Type B (Ears PASS / Metrics FAIL).
// 2. Strict preservation of contradictory evidence without scalar smoothing (Axiom 4).
// 3. Single canonical symmetric CONFLICTS_WITH relationship edge persistence with (min_id, max_id) ordering.
// 4. Bidirectional conflict query traversal across both competing evidence endpoints.
// 5. Fail-closed profile resolution (prohibiting hardcoded universal percentages).
// 6. Record 15 schema conformance and immutable append-only ledger compliance.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  OBJECTIVE_METRIC_CATEGORIES,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PERCEPTUAL_METHODOLOGIES,
  TOLERANCE_EVALUATIONS,
  EXECUTION_OUTCOMES,
} from "../sound-engineer/validation/schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationExecutionRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  parseEvidenceConflictRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  InvalidEndpointError,
  validateEdgeEndpoints,
} from "../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  ConflictDetectionProfileResolver,
  EvidenceConflictDetector,
  IncompatibleEvidenceContextError,
  InvalidEvidenceError,
  MissingConflictProfileError,
  ScalarSmoothingForbiddenError,
} from "../sound-engineer/validation/conflicts";

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

function createMockScopeRecord(): ValidationScopeRecord {
  return {
    scope_id: "SCOPE-001",
    intake_id: "INTAKE-001",
    primary_domain: "GEAR_FAMILY",
    included_units: ["tone.guitar.tube_preamp"],
    excluded_units: [],
    boundary_constraints: [],
    scope_inflation_protection: true,
  };
}

function createMockVersionBindingRecord(): ValidationVersionBindingRecord {
  return {
    binding_id: "BIND-001",
    scope_id: "SCOPE-001",
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
    runtime_implementation_version: "sha256:runtime_impl_version_hash_value",
    model_configuration_version: "sha256:model_config_version_hash_value",
    deterministic_rules_version: "sha256:rules_manifest_version_hash_val",
    gear_catalog_version: "sha256:gear_catalog_version_hash_value",
    platform_exporter_version: "sha256:platform_exporter_version_hash",
    fixture_library_version: "sha256:golden_corpus_manifest_version",
    target_platform_runtime_version: "sha256:target_platform_runtime_hash",
    host_environment_version: "sha256:host_environment_version_hash",
    version_integrity_reference: {
      composite_digest: "sha256:composite_binding_digest",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T00:00:00Z",
    },
  };
}

function createMockExecutionRecord(): ValidationExecutionRecord {
  return {
    execution_id: "EXEC-001",
    case_id: "CASE-001",
    profile_id: "PROFILE-01",
    fixture_id: "FIX-001",
    binding_id: "BIND-001",
    execution_timestamp: "2026-03-20T12:00:00Z",
    execution_environment: "SANDBOX_ISOLATED_CONTAINER",
    input_audio_integrity_ref: "sha256:input_audio_digest",
    output_audio_integrity_ref: "sha256:output_audio_digest",
    execution_duration_ms: 125,
    anomalies_detected: [],
    raw_measurements: {},
    outcome: EXECUTION_OUTCOMES.COMPLETED,
    trace_ref: "TRACE-001",
  };
}

function createMockPackage(): ValidationPackage {
  return {
    package_id: "PKG-LEAD-SOLO-001",
    intake_id: "INTAKE-001",
    scope_record_ref: "SCOPE-001",
    version_binding_ref: "BIND-001",
    assigned_test_profiles: ["PROFILE-01"],
    validation_case_refs: ["CASE-001", "CASE-002"],
    execution_record_refs: ["EXEC-001"],
    evidence_refs: ["OBJ-EVID-001", "PERC-EVID-001"],
  };
}

function createMockObjectiveEvidence(
  overrides: Partial<ObjectiveEvidenceRecord> = {}
): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: "OBJ-EVID-001",
    execution_id: "EXEC-001",
    metric_category: OBJECTIVE_METRIC_CATEGORIES.SPECTRAL_ANALYSIS,
    measured_parameters: {
      spectral_centroid_hz: 2450.5,
      frequency_response_delta_db: 0.8,
    },
    applied_threshold_profile_ref: "conflict_detection_spec:acoustic:default",
    tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
    measured_delta: 0.8,
    objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
    artifacts_retained: ["spectral_plot_001.json"],
    ...overrides,
  };
}

function createMockPerceptualEvidence(
  overrides: Partial<PerceptualEvaluationRecord> = {}
): PerceptualEvaluationRecord {
  return {
    perceptual_evidence_id: "PERC-EVID-001",
    execution_id: "EXEC-001",
    evaluator_id: "EVAL-001",
    evaluator_role: PERCEPTUAL_EVALUATOR_ROLES.MASTER_ENGINEER,
    methodology_used: PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING,
    listening_environment: {
      monitor_type: "Nearfield Monitors (Genelec 8351B)",
      calibrated_spl_profile_ref: "SPL-83DB-C-WEIGHTED",
      acoustic_treatment_level: "LEDE-TREATED-ROOM-RT60-0.25S",
    },
    presented_stimuli_refs: {
      stimulus_A: "sha256:reference_stimulus_hash",
      stimulus_B: "sha256:candidate_stimulus_hash",
    },
    perceptual_dimensions_evaluated: {
      timbre_accuracy: 2.1,
      dynamic_punch: 2.0,
      spatial_clarity: 2.5,
    },
    qualitative_observations: "Harsh resonant spike around 3.5kHz causing ear fatigue on sustained lead lines.",
    confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
    evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WP-17 Test Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h WP-17 — Evidence Conflict Preservation & Resolution Accounting (Record 15)", () => {
  const profileRef = "conflict_detection_spec:acoustic:default";

  describe("Scenario 1: Metrics PASS / Ears FAIL (Table 15 Row 1)", () => {
    it("detects conflict when objective passes but human listening fails, preserving raw conflict", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const objectiveEvidence = createMockObjectiveEvidence({
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.MET,
        measured_delta: 0.8,
      });
      const perceptualEvidence = createMockPerceptualEvidence({
        evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
      });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence,
        perceptualEvidence,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.conflictType, CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL);
      assert.ok(result.record);
      assert.strictEqual(result.record.package_id, packageRecord.package_id);
      assert.deepStrictEqual(result.record.competing_evidence_refs, [
        objectiveEvidence.objective_evidence_id,
        perceptualEvidence.perceptual_evidence_id,
      ]);
      assert.strictEqual(result.record.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);
      assert.strictEqual(
        result.record.resolution_strategy,
        CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION
      );
      assert.ok(result.record.conflict_description.includes("Objective metric passed"));
      assert.ok(result.record.conflict_description.includes("human listening panel failed"));

      // Validates schema compliance
      const validated = parseEvidenceConflictRecord(result.record);
      assert.strictEqual(validated.conflict_id, result.record.conflict_id);

      // Verify edge created in graph
      assert.ok(result.edge);
      assert.strictEqual(result.edge.edgeType, GOVERNED_EDGE_TYPES.CONFLICTS_WITH);
      assert.strictEqual(result.edge.isSymmetric, true);

      // Verify audit ledger contains record and edge
      assert.ok(ledger.getEntryCount() >= 2);
      const recordEntry = ledger.getEntries().find((e) => e.entityKind === "EvidenceConflictRecord");
      assert.ok(recordEntry);
      const edgeEntry = ledger.getEntries().find((e) => e.entityKind === GOVERNED_EDGE_TYPES.CONFLICTS_WITH);
      assert.ok(edgeEntry);
    });
  });

  describe("Scenario 2: Ears PASS / Metrics FAIL (Table 15 Row 2)", () => {
    it("detects conflict when human listening passes but objective metric fails technical threshold", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const objectiveEvidence = createMockObjectiveEvidence({
        metric_category: OBJECTIVE_METRIC_CATEGORIES.HARMONIC_DISTORTION,
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
        measured_delta: 4.8,
      });
      const perceptualEvidence = createMockPerceptualEvidence({
        evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
        confidence: PERCEPTUAL_CONFIDENCE_LEVELS.HIGH,
        qualitative_observations: "Warm tube saturation with rich second-order harmonics, highly responsive to picking dynamics.",
      });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence,
        perceptualEvidence,
        conflictDetectionProfileRef: "conflict_profile:guitar:tube_amp",
      });

      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.conflictType, CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL);
      assert.ok(result.record);
      assert.ok(result.record.conflict_description.includes("Human listening panel passed"));
      assert.ok(result.record.conflict_description.includes("objective metric failed"));
      assert.strictEqual(
        result.record.resolution_strategy,
        CONFLICT_RESOLUTION_STRATEGIES.ESCALATE_TO_STAGE_14_REVIEW
      );
      assert.strictEqual(result.record.resolution_status, CONFLICT_RESOLUTION_STATUSES.UNRESOLVED);
    });
  });

  describe("Scenario 3: Non-conflicting evidence streams", () => {
    it("returns hasConflict: false when both objective and perceptual evaluations pass", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const objectiveEvidence = createMockObjectiveEvidence({
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS,
      });
      const perceptualEvidence = createMockPerceptualEvidence({
        evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS,
      });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence,
        perceptualEvidence,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, false);
      assert.strictEqual(result.record, undefined);
      assert.strictEqual(result.edge, undefined);
      assert.strictEqual(ledger.getEntryCount(), 0);
    });

    it("returns hasConflict: false when both objective and perceptual evaluations fail (mutual agreement on failure)", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const objectiveEvidence = createMockObjectiveEvidence({
        objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.FAIL,
        tolerance_evaluation: TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE,
      });
      const perceptualEvidence = createMockPerceptualEvidence({
        evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL,
      });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence,
        perceptualEvidence,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, false);
    });
  });

  describe("Single Canonical Symmetric CONFLICTS_WITH Edge & Bidirectional Traversal", () => {
    it("persists exactly one symmetric edge regardless of input order and allows bidirectional traversal", () => {
      const graph = new ValidationRelationshipGraph();
      const detector = new EvidenceConflictDetector({ graph });

      const packageRecord = createMockPackage();
      // Test with objId < percId
      const obj1 = createMockObjectiveEvidence({ objective_evidence_id: "OBJ-A-001" });
      const perc1 = createMockPerceptualEvidence({ perceptual_evidence_id: "PERC-B-002" });

      const result1 = detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj1,
        perceptualEvidence: perc1,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result1.hasConflict, true);
      assert.ok(result1.edge);
      const edgeId1 = result1.edge.edgeId;

      // Bidirectional traversal check
      const conflictsFromObj = graph.getConflicts("OBJ-A-001");
      const conflictsFromPerc = graph.getConflicts("PERC-B-002");

      assert.strictEqual(conflictsFromObj.length, 1);
      assert.strictEqual(conflictsFromObj[0].id, "PERC-B-002");
      assert.strictEqual(conflictsFromObj[0].kind, GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord);

      assert.strictEqual(conflictsFromPerc.length, 1);
      assert.strictEqual(conflictsFromPerc[0].id, "OBJ-A-001");
      assert.strictEqual(conflictsFromPerc[0].kind, GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord);

      // Now attempt duplicate registration with reversed order or re-run
      const edge2 = graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
        source: { id: "PERC-B-002", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
        target: { id: "OBJ-A-001", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
      });

      // Must be idempotent reuse of the exact same canonical edge ID
      assert.strictEqual(edge2.edgeId, edgeId1);
      assert.strictEqual(graph.getEdges().length, 1);
    });

    it("enforces canonical endpoint ordering (min_id, max_id) in edge definition", () => {
      const objEndpoint = { id: "OBJ-ZZZ", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord };
      const percEndpoint = { id: "PERC-AAA", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord };

      const { canonicalSource, canonicalTarget } = validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
        objEndpoint,
        percEndpoint
      );

      // "OBJ-ZZZ" > "PERC-AAA", so canonicalSource must be PERC-AAA, canonicalTarget OBJ-ZZZ
      assert.strictEqual(canonicalSource.id, "OBJ-ZZZ" < "PERC-AAA" ? "OBJ-ZZZ" : "PERC-AAA");
      assert.strictEqual(canonicalTarget.id, "OBJ-ZZZ" < "PERC-AAA" ? "PERC-AAA" : "OBJ-ZZZ");
    });

    it("rejects CONFLICTS_WITH edges between invalid endpoints (e.g. two ObjectiveEvidenceRecords or two PerceptualEvaluationRecords)", () => {
      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "OBJ-1", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
            { id: "OBJ-2", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
          );
        },
        InvalidEndpointError
      );

      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "PERC-1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
            { id: "PERC-2", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
          );
        },
        InvalidEndpointError
      );
    });
  });

  describe("Axiom 4: Anti-Scalar Smoothing & Conflict Preservation", () => {
    it("strictly prohibits scalar smoothing, averaging, or artificial consensus", () => {
      const detector = new EvidenceConflictDetector();

      assert.throws(
        () => {
          detector.assertNoScalarSmoothing(0.92, 0.45);
        },
        ScalarSmoothingForbiddenError
      );
    });

    it("preserves individual raw conflicting scores in competing evidence records without averaging", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ measured_delta: 0.85 });
      const perc = createMockPerceptualEvidence();

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, true);
      // Raw scores must remain unmodified on the inputs
      assert.strictEqual(obj.measured_delta, 0.85);
      assert.strictEqual(perc.perceptual_dimensions_evaluated.timbre_accuracy, 2.1);
      // Competing evidence refs explicitly preserved
      assert.deepStrictEqual(result.record?.competing_evidence_refs, [
        obj.objective_evidence_id,
        perc.perceptual_evidence_id,
      ]);
    });
  });

  describe("Governed Conflict Detection Profile Resolver & Fail-Closed Behavior", () => {
    it("fails closed with MissingConflictProfileError when profile reference is missing or empty", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            conflictDetectionProfileRef: "non_existent_profile_spec",
          });
        },
        MissingConflictProfileError
      );

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            conflictDetectionProfileRef: "",
          });
        },
        MissingConflictProfileError
      );
    });

    it("allows registering and applying domain-specific custom conflict detection profiles", () => {
      const resolver = new ConflictDetectionProfileResolver();
      resolver.registerProfile({
        profileRef: "custom:bass_low_end_conflict",
        description: "Custom bass frequency conflict profile",
        triggers: {
          detectObjectivePassPerceptualFail: true,
          detectPerceptualPassObjectiveFail: false,
        },
        defaultResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONDUCT_TARGETED_RETEST,
        defaultResolutionStatus: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
        calculateResidualUncertainty: () => 0.55,
      });

      const detector = new EvidenceConflictDetector({ profileResolver: resolver });
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS });
      const perc = createMockPerceptualEvidence({ evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: "custom:bass_low_end_conflict",
      });

      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.record?.residual_uncertainty_score, 0.55);
      assert.strictEqual(
        result.record?.resolution_strategy,
        CONFLICT_RESOLUTION_STRATEGIES.CONDUCT_TARGETED_RETEST
      );
    });
  });

  describe("Disagreement Evidence Accounting (Type C: Reviewer, Type D: Methodology)", () => {
    it("documents intra-modality disagreement in Record 15 without violating graph endpoint contracts", () => {
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ ledger });

      const packageRecord = createMockPackage();

      const result = detector.recordDisagreement({
        packageRecord,
        conflictType: CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
        competingEvidenceRefs: ["PERC-EVID-001", "PERC-EVID-002"],
        conflictDescription: "Split expert listening panel on high-gain cabinet resonance.",
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, true);
      assert.strictEqual(result.conflictType, CONFLICT_TYPES.EVALUATOR_DISAGREEMENT);
      assert.ok(result.record);
      assert.strictEqual(result.record.package_id, packageRecord.package_id);
      assert.deepStrictEqual(result.record.competing_evidence_refs, ["PERC-EVID-001", "PERC-EVID-002"]);

      // Ledger must contain Record 15
      assert.strictEqual(ledger.getEntryCount(), 1);
      const entry = ledger.getLatestEntry();
      assert.strictEqual(entry?.entityKind, "EvidenceConflictRecord");
    });

    it("rejects disagreement documentation with fewer than 2 competing evidence references", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();

      assert.throws(
        () => {
          detector.recordDisagreement({
            packageRecord,
            conflictType: CONFLICT_TYPES.MULTI_METHODOLOGY_DISCREPANCY,
            competingEvidenceRefs: ["OBJ-001"],
            conflictDescription: "Single evidence item cannot form a conflict",
            conflictDetectionProfileRef: profileRef,
          });
        },
        InvalidEvidenceError
      );
    });
  });

  describe("Immutability & Input Validation Protection", () => {
    it("returns deep-frozen results that prevent mutation", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: profileRef,
      });

      assert.ok(Object.isFrozen(result));
      if (result.record) {
        assert.ok(Object.isFrozen(result.record));
        assert.throws(() => {
          // @ts-expect-error mutating frozen record
          result.record.resolution_status = CONFLICT_RESOLUTION_STATUSES.RESOLVED_BY_PANEL;
        }, TypeError);
      }
    });

    it("rejects input with missing packageRecord", () => {
      const detector = new EvidenceConflictDetector();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord: null as unknown as ValidationPackage,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("explicitly verifies raw evidence records are never mutated by conflict detection", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ measured_delta: 0.77 });
      const perc = createMockPerceptualEvidence({ qualitative_observations: "Dynamic sensitivity preserved" });

      const objSnapshot = JSON.parse(JSON.stringify(obj));
      const percSnapshot = JSON.parse(JSON.stringify(perc));

      detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: profileRef,
      });

      assert.deepStrictEqual(obj, objSnapshot);
      assert.deepStrictEqual(perc, percSnapshot);
    });
  });

  describe("Package / Execution / Scope Context Coherence (Point 12)", () => {
    it("fails closed when objective and perceptual evidence reference incompatible executions", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ execution_id: "EXEC-001" });
      const perc = createMockPerceptualEvidence({ execution_id: "EXEC-002" });

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("fails closed when scopeRecord.scope_id does not match packageRecord.scope_record_ref", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();
      const scopeRecord = createMockScopeRecord();
      // @ts-expect-error forcing mismatch
      scopeRecord.scope_id = "SCOPE-MISMATCH-999";

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            scopeRecord,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("fails closed when versionBindingRecord.binding_id does not match packageRecord.version_binding_ref", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();
      const versionBindingRecord = createMockVersionBindingRecord();
      // @ts-expect-error forcing mismatch
      versionBindingRecord.binding_id = "BIND-MISMATCH-888";

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            versionBindingRecord,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("fails closed when executionRecord.execution_id does not match evidence execution_id", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ execution_id: "EXEC-001" });
      const perc = createMockPerceptualEvidence({ execution_id: "EXEC-001" });
      const executionRecord = createMockExecutionRecord();
      // @ts-expect-error forcing mismatch
      executionRecord.execution_id = "EXEC-DIFFERENT-777";

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            executionRecord,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("fails closed when executionRecord.case_id is not included in packageRecord.validation_case_refs", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();
      const executionRecord = createMockExecutionRecord();
      // @ts-expect-error forcing case mismatch
      executionRecord.case_id = "CASE-FOREIGN-666";

      assert.throws(
        () => {
          detector.detectConflict({
            packageRecord,
            objectiveEvidence: obj,
            perceptualEvidence: perc,
            executionRecord,
            conflictDetectionProfileRef: profileRef,
          });
        },
        IncompatibleEvidenceContextError
      );
    });

    it("rejects disagreement input with whitespace-only evidence reference string", () => {
      const detector = new EvidenceConflictDetector();
      const packageRecord = createMockPackage();

      assert.throws(
        () => {
          detector.recordDisagreement({
            packageRecord,
            conflictType: CONFLICT_TYPES.EVALUATOR_DISAGREEMENT,
            competingEvidenceRefs: ["PERC-001", "   "],
            conflictDescription: "Invalid whitespace ref test",
            conflictDetectionProfileRef: profileRef,
          });
        },
        InvalidEvidenceError
      );
    });
  });

  describe("Governed Graph Endpoint Rejections for CONFLICTS_WITH (Point 8)", () => {
    it("rejects UAT ↔ Objective and UAT ↔ Perceptual as CONFLICTS_WITH endpoints", () => {
      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "UAT-001", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
            { id: "OBJ-001", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
          );
        },
        InvalidEndpointError
      );

      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "UAT-001", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
            { id: "PERC-001", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
          );
        },
        InvalidEndpointError
      );
    });

    it("rejects EvidenceConflictRecord or RegressionAssessmentRecord as CONFLICTS_WITH endpoints", () => {
      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "CONF-001", kind: "EvidenceConflictRecord" as unknown as typeof GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
            { id: "OBJ-001", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
          );
        },
        InvalidEndpointError
      );

      assert.throws(
        () => {
          validateEdgeEndpoints(
            GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
            { id: "REG-001", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
            { id: "OBJ-001", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
          );
        },
        InvalidEndpointError
      );
    });
  });

  describe("Boundary Protection: WP-15, WP-16, and WP-18 Separation (Points 11, 15, 16)", () => {
    it("confirms conflict detection does NOT emit ValidationFailureRecord or attribution classes (WP-16)", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence({ objective_pass_fail: OBJECTIVE_PASS_FAIL_STATUSES.PASS });
      const perc = createMockPerceptualEvidence({ evaluation_outcome: PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL });

      const result = detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: profileRef,
      });

      assert.strictEqual(result.hasConflict, true);
      // Ensure no failure records were appended to ledger
      const failureEntries = ledger.getEntries().filter((e) => e.entityKind === "ValidationFailureRecord");
      assert.strictEqual(failureEntries.length, 0);

      // Ensure no REMANDS_TO edge was emitted
      const remandsEdges = ledger.getEntries().filter((e) => e.entityKind === GOVERNED_EDGE_TYPES.REMANDS_TO);
      assert.strictEqual(remandsEdges.length, 0);
    });

    it("confirms conflict detection does NOT emit ValidationUncertaintyRecord or UNCERTAIN_OF edge (WP-18)", () => {
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const detector = new EvidenceConflictDetector({ graph, ledger });

      const packageRecord = createMockPackage();
      const obj = createMockObjectiveEvidence();
      const perc = createMockPerceptualEvidence();

      detector.detectConflict({
        packageRecord,
        objectiveEvidence: obj,
        perceptualEvidence: perc,
        conflictDetectionProfileRef: profileRef,
      });

      // Ensure no uncertainty records were appended
      const uncertaintyEntries = ledger.getEntries().filter((e) => e.entityKind === "ValidationUncertaintyRecord");
      assert.strictEqual(uncertaintyEntries.length, 0);

      // Ensure no UNCERTAIN_OF edge was emitted
      const uncertainEdges = ledger.getEntries().filter((e) => e.entityKind === GOVERNED_EDGE_TYPES.UNCERTAIN_OF);
      assert.strictEqual(uncertainEdges.length, 0);
    });
  });
});
