// src/tests/defectRemandRouter.test.ts
// Independent verification test suite for WP-25 Slice 2:
// Defect Remand Router & Canonical REMANDS_TO Integration.
// Bound to frozen specification v0.1j Section 29, Table 17, and Build Plan v0.1h WP-25.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FailureAttributionClass,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
} from "../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import {
  ObjectiveEvidenceRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { TABLE_17_REMAND_ROUTING } from "../sound-engineer/validation/attribution/attributionTypes";
import {
  DefectRemandRouter,
  IncompleteReproductionEvidenceError,
  RemandLineageMismatchError,
  type RouteDefectInput,
} from "../sound-engineer/validation/remand";
import { RemandAgingTracker } from "../sound-engineer/validation/remand/remandAgingTracker";

// ---------------------------------------------------------------------------
// Canonical Fixture Factories
// ---------------------------------------------------------------------------

function createMockBinding(bindingId = "BIND_2026_01"): ValidationVersionBindingRecord {
  return {
    binding_id: bindingId,
    scope_id: "SCOPE_2026_01",
    architecture_version_matrix: {
      "1C.5a_version": { version: "v0.1a", integrity_ref: "sha256:aaa" },
      "1C.5b_version": { version: "v0.1b", integrity_ref: "sha256:bbb" },
      "1C.5c_version": { version: "v0.1c", integrity_ref: "sha256:ccc" },
      "1C.5d_version": { version: "v0.1d", integrity_ref: "sha256:ddd" },
      "1C.5e_version": { version: "v0.1e", integrity_ref: "sha256:eee" },
      "1C.5f_version": { version: "v0.1f", integrity_ref: "sha256:fff" },
      "1C.5g_version": { version: "v0.1g", integrity_ref: "sha256:ggg" },
      "1C.5h_mandate_version": { version: "v0.1d", integrity_ref: "sha256:hhh" },
      "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256:iii" },
    },
    runtime_implementation_version: "2.1.0-alpha",
    model_configuration_version: "1.4.2",
    deterministic_rules_version: "1.0.0",
    gear_catalog_version: "3.2.0",
    platform_exporter_version: "1.1.0",
    fixture_library_version: "2.0.0",
    target_platform_runtime_version: "AT5-5.5.0",
    host_environment_version: "Linux-6.1-x86_64",
    version_integrity_reference: {
      composite_digest: "sha256:composite_binding_001",
      algorithm: "SHA-256",
      sealed_at: "2026-10-20T00:00:00.000Z",
    },
  };
}

function createMockFixture(fixtureId = "FIX_lead_01"): ValidationFixtureRecord {
  return {
    fixture_id: fixtureId,
    fixture_name: "Clean DI Stratocaster Lead Track",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "1.0.0",
    payload_integrity_ref: "sha256:fixture_payload_digest_001",
    declared_applicability_scope: ["High Gain Amps"],
    provenance_metadata: {
      instrument_details: "Fender Stratocaster Bridge Pickup",
      capture_hardware: "Universal Audio Apollo x8",
      recording_engineer: "Principal Audio Curator",
      capture_date: "2026-09-01",
    },
    calibration_spec: "-18 dBFS RMS sine reference at 1kHz",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  };
}

function createMockCase(
  caseId = "CASE_lead_01",
  fixtureId = "FIX_lead_01"
): ValidationCase {
  return {
    case_id: caseId,
    title: "Lead Amp Dynamic Headroom Test",
    validation_question: "Does lead tone maintain dynamic headroom without clipping?",
    validation_subject: "American High Gain Lead Channel",
    scoped_boundaries: ["Gain 0-10", "Master 0-10"],
    applicable_test_dimensions: ["DIM_DYNAMIC_RANGE", "DIM_THD"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: [fixtureId],
    evaluation_methodology: "METHOD_DETERMINISTIC_AUDIO_RUNNER",
    acceptance_criteria_ref: "CRIT_HEADROOM_MIN_12DB",
    failure_consequence: "BLOCKS_GATE_8",
    expected_remand_destination: "Software Engineering Core Team",
  };
}

function createMockExecution(
  executionId = "EXEC_lead_01",
  caseId = "CASE_lead_01",
  fixtureId = "FIX_lead_01",
  bindingId = "BIND_2026_01"
): ValidationExecutionRecord {
  return {
    execution_id: executionId,
    case_id: caseId,
    profile_id: "PROF_acoustic_01",
    fixture_id: fixtureId,
    binding_id: bindingId,
    execution_timestamp: "2026-10-20T10:00:00.000Z",
    execution_environment: "Docker-AudioEngine-Ubuntu24",
    input_audio_integrity_ref: "sha256:input_stem_001",
    output_audio_integrity_ref: "sha256:output_rendered_001",
    execution_duration_ms: 1250,
    anomalies_detected: ["Buffer underflow at sample 44100"],
    raw_measurements: {
      peakLevelDb: 0.1,
      thdPercent: 4.8,
      bufferDropoutsDetected: 1,
    },
    outcome: "FAILED",
    trace_ref: "TRACE_exec_runner_lead_01",
  };
}

function createMockFailure(
  failureId = "FAIL_lead_01",
  executionId = "EXEC_lead_01",
  attributionClass: FailureAttributionClass = FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION
): ValidationFailureRecord {
  const routing = TABLE_17_REMAND_ROUTING[attributionClass];
  return {
    failure_id: failureId,
    execution_id: executionId,
    failure_timestamp: "2026-10-20T10:05:00.000Z",
    failure_title: `Validation Failure (${attributionClass})`,
    failure_symptom: `Observed anomalous output attributed to ${attributionClass}`,
    attribution_class: attributionClass,
    attribution_evidence_refs: ["crash_dump_001.log"],
    attribution_confidence: "CERTAIN",
    materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
    affected_scope: ["Lead Channel"],
    gate_8_blocked: true,
    remand_destination: routing.remandDestination,
    retest_prerequisites: routing.defaultRetestPrerequisites,
  };
}

function createMockObjectiveEvidence(
  executionId = "EXEC_lead_01"
): ObjectiveEvidenceRecord {
  return {
    objective_evidence_id: "OBJ_ev_lead_01",
    execution_id: executionId,
    metric_category: "DYNAMIC_ENVELOPE",
    measured_parameters: { dynamicHeadroomDb: -0.1 },
    applied_threshold_profile_ref: "THRESH_PROF_01",
    tolerance_evaluation: "OUT_OF_TOLERANCE",
    measured_delta: -12.1,
    objective_pass_fail: "FAIL",
    artifacts_retained: ["rendered_lead_output.wav"],
  };
}

function createConsistentInput(
  attributionClass: FailureAttributionClass = FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
  failureId = "FAIL_001"
): RouteDefectInput {
  const binding = createMockBinding("BIND_001");
  const fixture = createMockFixture("FIX_001");
  const validationCase = createMockCase("CASE_001", "FIX_001");
  const execution = createMockExecution("EXEC_001", "CASE_001", "FIX_001", "BIND_001");
  const failure = createMockFailure(failureId, "EXEC_001", attributionClass);
  const objective = createMockObjectiveEvidence("EXEC_001");

  return {
    failureRecord: failure,
    executionRecord: execution,
    versionBinding: binding,
    validationCase,
    fixtureRecord: fixture,
    objectiveEvidenceRecord: objective,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("WP-25 Slice 2: Defect Remand Router & Canonical REMANDS_TO Integration", () => {
  describe("1. Table 17 Remand Routing Across All Nine Attribution Classes", () => {
    const expectations: Array<{
      attribution: FailureAttributionClass;
      expectedRecipient: string;
      expectedEntityId: string;
      expectedRemandClass: string;
    }> = [
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
        expectedRecipient: "Phase 1C.5g Migration",
        expectedEntityId: "GOVERNANCE_PHASE_1C5G_MIGRATION",
        expectedRemandClass: "MIGRATION_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        expectedRecipient: "Phases 1C.5a–e Governance",
        expectedEntityId: "GOVERNANCE_UPSTREAM_REASONING",
        expectedRemandClass: "REASONING_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
        expectedRecipient: "Stage 12 Platform Team",
        expectedEntityId: "GOVERNANCE_STAGE_12_PLATFORM",
        expectedRemandClass: "TRANSLATION_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        expectedRecipient: "Core Software Team",
        expectedEntityId: "GOVERNANCE_CORE_SOFTWARE",
        expectedRemandClass: "RUNTIME_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        expectedRecipient: "Fixture Curation Team",
        expectedEntityId: "GOVERNANCE_FIXTURE_CURATION",
        expectedRemandClass: "FIXTURE_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
        expectedRecipient: "Infrastructure Team",
        expectedEntityId: "GOVERNANCE_VALIDATION_INFRASTRUCTURE",
        expectedRemandClass: "ENVIRONMENT_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM,
        expectedRecipient: "Vendor Integration",
        expectedEntityId: "GOVERNANCE_VENDOR_INTEGRATION",
        expectedRemandClass: "PLATFORM_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
        expectedRecipient: "Operations / SRE Team",
        expectedEntityId: "GOVERNANCE_OPERATIONS_SRE",
        expectedRemandClass: "INFRASTRUCTURE_REMAND",
      },
      {
        attribution: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
        expectedRecipient: "Joint Diagnostic Working Group",
        expectedEntityId: "GOVERNANCE_JOINT_DIAGNOSTIC",
        expectedRemandClass: "JOINT_DIAGNOSTIC_REMAND",
      },
    ];

    for (const exp of expectations) {
      it(`routes attribution ${exp.attribution} to canonical recipient ${exp.expectedRecipient}`, () => {
        const graph = new ValidationRelationshipGraph();
        const tracker = new RemandAgingTracker();
        const router = new DefectRemandRouter({ graph, tracker });

        const input = createConsistentInput(exp.attribution, `FAIL_${exp.attribution}`);
        const result = router.routeDefect(input);

        assert.equal(result.package.routing.remandClass, exp.expectedRemandClass);
        assert.equal(result.package.routing.upstreamRecipient, exp.expectedRecipient);
        assert.equal(result.package.routing.governanceEntityId, exp.expectedEntityId);
        assert.equal(result.tracking.recipient, exp.expectedRecipient);
        assert.equal(result.tracking.governanceEntityId, exp.expectedEntityId);
      });
    }
  });

  describe("2. Canonical REMANDS_TO Graph Relationship Semantics", () => {
    it("creates exactly one canonical REMANDS_TO edge: ValidationFailureRecord -> GovernanceEntity", () => {
      const graph = new ValidationRelationshipGraph();
      const router = new DefectRemandRouter({ graph });

      const input = createConsistentInput(
        FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        "FAIL_GRAPH_01"
      );
      const result = router.routeDefect(input);

      assert.ok(result.edge);
      assert.equal(result.edge.edgeType, GOVERNED_EDGE_TYPES.REMANDS_TO);
      assert.equal(result.edge.source.id, "FAIL_GRAPH_01");
      assert.equal(result.edge.source.kind, GOVERNED_ENTITY_KINDS.ValidationFailureRecord);
      assert.equal(result.edge.target.id, "GOVERNANCE_CORE_SOFTWARE");
      assert.equal(result.edge.target.kind, GOVERNED_ENTITY_KINDS.GovernanceEntity);

      // Verify node registrations in graph
      assert.ok(graph.hasNode("FAIL_GRAPH_01"));
      assert.ok(graph.hasNode("GOVERNANCE_CORE_SOFTWARE"));

      // Verify outgoing edge query from failure record
      const outgoing = graph
        .getEdges()
        .filter(
          (e) =>
            e.source.id === "FAIL_GRAPH_01" &&
            e.edgeType === GOVERNED_EDGE_TYPES.REMANDS_TO
        );
      assert.equal(outgoing.length, 1);
      assert.equal(outgoing[0].target.id, "GOVERNANCE_CORE_SOFTWARE");
    });

    it("supports idempotent re-routing of the same failure without creating duplicate edges", () => {
      const graph = new ValidationRelationshipGraph();
      const router = new DefectRemandRouter({ graph });

      const input = createConsistentInput(
        FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        "FAIL_IDEMP_GRAPH"
      );

      const res1 = router.routeDefect(input);
      const res2 = router.routeDefect(input);

      assert.equal(res1.edge?.edgeId, res2.edge?.edgeId);
      const edges = graph
        .getEdges()
        .filter(
          (e) =>
            e.source.id === "FAIL_IDEMP_GRAPH" &&
            e.edgeType === GOVERNED_EDGE_TYPES.REMANDS_TO
        );
      assert.equal(edges.length, 1);
    });
  });

  describe("3. DefectRemandPackage Assembly & Reproduction Completeness", () => {
    it("assembles complete self-contained package with all required evidence and integrity seal", () => {
      const fixedTime = new Date("2026-10-20T12:00:00.000Z");
      const router = new DefectRemandRouter({ nowFn: () => fixedTime });

      const input = createConsistentInput(
        FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
        "FAIL_PACKAGE_01"
      );
      const result = router.routeDefect(input);
      const pkg = result.package;

      assert.ok(pkg.packageId.startsWith("DRP_"));
      assert.equal(pkg.failureRecord.failure_id, "FAIL_PACKAGE_01");
      assert.equal(pkg.executionTraceRef, "TRACE_exec_runner_lead_01");
      assert.equal(pkg.versionBinding.binding_id, "BIND_001");
      assert.equal(pkg.validationCase.case_id, "CASE_001");
      assert.equal(pkg.fixtureRecord.fixture_id, "FIX_001");

      // Fixture stem reference completeness
      assert.equal(pkg.fixtureStemRef.fixtureId, "FIX_001");
      assert.equal(pkg.fixtureStemRef.payloadDigest, "sha256:fixture_payload_digest_001");
      assert.equal(pkg.fixtureStemRef.calibrationSpec, "-18 dBFS RMS sine reference at 1kHz");

      // Measurement evidence
      assert.ok(pkg.measurementEvidence.rawMeasurements);
      assert.equal(pkg.measurementEvidence.objectiveEvidenceId, "OBJ_ev_lead_01");
      assert.equal(pkg.measurementEvidence.criteriaRef, "CRIT_HEADROOM_MIN_12DB");

      // Package integrity metadata
      assert.equal(pkg.packageIntegrity.algorithm, "SHA-256");
      assert.equal(pkg.packageIntegrity.sealed_at, "2026-10-20T12:00:00.000Z");
      assert.ok(pkg.packageIntegrity.integrity_digest.length > 0);
      assert.equal(pkg.packageIntegrity.canonical_serialization_format, "RFC-8785-CANONICAL-JSON");
    });
  });

  describe("4. Cross-Record Lineage Consistency Validation (Fail-Closed)", () => {
    it("rejects failure record referencing a different execution ID", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        failureRecord: {
          ...input.failureRecord,
          execution_id: "EXEC_MISMATCHED",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, RemandLineageMismatchError);
    });

    it("rejects execution record bound to a different version binding ID", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        executionRecord: {
          ...input.executionRecord,
          binding_id: "BIND_MISMATCHED",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, RemandLineageMismatchError);
    });

    it("rejects execution record referencing a different case ID", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        executionRecord: {
          ...input.executionRecord,
          case_id: "CASE_MISMATCHED",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, RemandLineageMismatchError);
    });

    it("rejects execution record referencing a different fixture ID", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        executionRecord: {
          ...input.executionRecord,
          fixture_id: "FIX_MISMATCHED",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, RemandLineageMismatchError);
    });

    it("rejects validation case that does not associate the execution fixture", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        validationCase: {
          ...input.validationCase,
          associated_fixture_set: ["FIX_OTHER_UNRELATED"],
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, RemandLineageMismatchError);
    });

    it("rejects missing execution trace reference", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        executionRecord: {
          ...input.executionRecord,
          trace_ref: "",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, IncompleteReproductionEvidenceError);
    });

    it("rejects fixture with missing payload integrity reference", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput();
      const corruptedInput = {
        ...input,
        fixtureRecord: {
          ...input.fixtureRecord,
          payload_integrity_ref: "",
        },
      };

      assert.throws(() => {
        router.routeDefect(corruptedInput);
      }, IncompleteReproductionEvidenceError);
    });
  });

  describe("5. Tracking & Aging Integration", () => {
    it("registers newly routed remand as OUTSTANDING in RemandAgingTracker", () => {
      const tracker = new RemandAgingTracker();
      const router = new DefectRemandRouter({ tracker });

      const input = createConsistentInput(
        FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
        "FAIL_TRACK_01"
      );
      const result = router.routeDefect(input);

      assert.equal(result.tracking.status, "OUTSTANDING");
      const outstanding = tracker.getOutstandingRemands();
      assert.equal(outstanding.length, 1);
      assert.equal(outstanding[0].failureId, "FAIL_TRACK_01");
      assert.equal(outstanding[0].governanceEntityId, "GOVERNANCE_OPERATIONS_SRE");
    });

    it("allows recording handoff return through router and updates aging tracker", () => {
      const nowFn = () => new Date("2026-10-20T10:00:00.000Z");
      const tracker = new RemandAgingTracker({ nowFn });
      const router = new DefectRemandRouter({ tracker, nowFn });

      const input = createConsistentInput(
        FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        "FAIL_RETURN_01"
      );
      const result = router.routeDefect(input);
      const remandId = result.tracking.remandId;

      assert.equal(tracker.getOutstandingRemands().length, 1);

      const updated = router.recordHandoffReturn(
        remandId,
        "HANDOFF_PKG_CORE_SW_PATCH_v1.1",
        "2026-10-20T14:00:00.000Z"
      );

      assert.equal(updated.status, "RETURNED");
      assert.equal(updated.handoffReturnRef, "HANDOFF_PKG_CORE_SW_PATCH_v1.1");
      assert.equal(tracker.getOutstandingRemands().length, 0);
    });
  });

  describe("6. Separation of Concerns & Isolation Invariants", () => {
    it("confirms routing does NOT execute candidate code, alter prompts, or modify fixtures", () => {
      const router = new DefectRemandRouter();
      const input = createConsistentInput(FAILURE_ATTRIBUTION_CLASSES.REASONING, "FAIL_SOC_01");

      const originalBinding = JSON.stringify(input.versionBinding);
      const originalFixture = JSON.stringify(input.fixtureRecord);
      const originalCase = JSON.stringify(input.validationCase);

      const result = router.routeDefect(input);

      // Verify that candidate version binding, fixture, and case were not mutated
      assert.equal(JSON.stringify(input.versionBinding), originalBinding);
      assert.equal(JSON.stringify(input.fixtureRecord), originalFixture);
      assert.equal(JSON.stringify(input.validationCase), originalCase);

      // Verify routing recipient is informational metadata only
      assert.equal(result.package.routing.upstreamRecipient, "Phases 1C.5a–e Governance");
      assert.equal(
        result.package.routing.defaultRetestPrerequisites.includes("Refine prompt"),
        true
      );
    });
  });
});
