// src/tests/validationExecution.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-10:
// Sandboxed Validation Execution Harness & Audio Runner (Record 9).
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXECUTION_OUTCOMES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  READINESS_OUTCOMES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  ValidationCase,
  validationExecutionRecordSchema,
  ValidationPackage,
  ValidationReadinessAssessmentRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  FixtureCorpusManager,
  InMemoryFixturePayloadStore,
} from "../sound-engineer/validation/fixtures/fixtureManager";
import {
  computeSha256BytesHex,
  createSyntheticPcmWav,
} from "../sound-engineer/validation/fixtures/audioVerification";
import { ValidationCaseBuilder } from "../sound-engineer/validation/cases/caseBuilder";
import { ValidationPackageComposer } from "../sound-engineer/validation/packages/packageComposer";
import {
  ExecutionEligibilityError,
  ExecutionRetestError,
  ExecutionTimeoutError,
  ProductionStateViolationError,
} from "../sound-engineer/validation/execution/executionErrors";
import {
  ProductionProtectionGuard,
  SandboxIsolationBoundary,
} from "../sound-engineer/validation/execution/sandboxIsolation";
import {
  DefaultOperationalBudgetResolver,
  ValidationExecutionRunner,
} from "../sound-engineer/validation/execution/executionRunner";
import { SimulatedPlatformValidationAdapter } from "../sound-engineer/validation/execution/platformValidationAdapter";

describe("Phase 1C.5h — WP-10: Sandboxed Validation Execution Harness & Audio Runner (Record 9)", () => {
  // Common valid test fixtures
  const sampleScope: ValidationScopeRecord = {
    scope_id: "scope_high_gain_lead_01",
    intake_id: "intake_2026_01",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["amp_lead_5150", "cab_4x12_vintage"],
    excluded_units: ["pedal_overdrive"],
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

  // Helper to build a sealed read-only FixtureCorpusManager with a valid DI fixture
  function createTestFixtureSetup(): {
    fixtureManager: FixtureCorpusManager;
    fixtureId: string;
    fixtureBuffer: Uint8Array;
  } {
    const payloadStore = new InMemoryFixturePayloadStore(false);
    const fixtureManager = new FixtureCorpusManager({
      payloadStore,
      isReadOnlyMount: false,
    });

    const fixtureBuffer = createSyntheticPcmWav({
      sampleRate: 48000,
      channels: 1,
      bitDepth: 24,
      durationSeconds: 0.1,
    });
    const hash = `sha256:${computeSha256BytesHex(fixtureBuffer)}`;
    const fixtureId = "FIX-DI-5150-01";

    fixtureManager.registerFixture(
      {
        fixture_id: fixtureId,
        fixture_name: "Calibrated 5150 Lead DI - Gibson Les Paul",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: hash,
        declared_applicability_scope: ["amp_lead_5150"],
        provenance_metadata: {
          instrument_details: "Gibson Les Paul Custom 1957 Reissue",
          capture_hardware: "Radial J48 Active DI -> Grace Design m108",
          recording_engineer: "Staff Audio Engineer",
          capture_date: "2026-10-15",
        },
        calibration_spec: "CAL-DI--18dBFS-PEAK",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      },
      fixtureBuffer
    );

    payloadStore.seal();
    (fixtureManager as unknown as { isReadOnlyMount: boolean }).isReadOnlyMount = true;

    return { fixtureManager, fixtureId, fixtureBuffer };
  }

  // Helper to create a valid ValidationCase using CaseBuilder
  function createSampleAcousticCase(fixtureId?: string): ValidationCase {
    const caseBuilder = new ValidationCaseBuilder({
      scopeRecord: sampleScope,
      versionBinding: sampleBinding,
    });
    return caseBuilder.buildCase({
      case_id: "CASE-ACOUSTIC-5150-01",
      title: "5150 Lead Frequency Response & Harmonic Distortion Test",
      validation_question:
        "Does the 5150 lead amplifier model frequency response conform to the calibrated acoustic benchmark within tolerance?",
      validation_subject: "amp_lead_5150",
      scoped_boundaries: ["amp_lead_5150"],
      applicable_test_dimensions: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
      required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
      associated_fixture_set: fixtureId ? [fixtureId] : [],
      evaluation_methodology: "Acoustic FFT spectral analysis",
      acceptance_criteria_ref: "TOL_SPECTRAL_FREQUENCY_RESPONSE_V1",
      failure_consequence: "Blocks amplifier model progression",
      expected_remand_destination: "PHASE_1C5D_INTERVENTION_DESIGN",
    });
  }

  // Helper to create a sealed package with the sample case
  function createSamplePackage(
    cases: ValidationCase[],
    fixtureManager?: FixtureCorpusManager
  ): ValidationPackage {
    const composer = new ValidationPackageComposer({
      scopeRecord: sampleScope,
      versionBinding: sampleBinding,
      readinessRecord: sampleReadinessReady,
      fixtureManager,
    });
    composer.setAssignedProfiles([TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC]);
    composer.addCases(cases);
    return composer.sealPackage().packageRecord;
  }

  describe("A. Record 9 Schema & Validation Execution Parity", () => {
    it("successfully executes a valid case, invokes candidate and baseline adapter paths, and produces sealed Record 9", async () => {
      const { fixtureManager, fixtureId } = createTestFixtureSetup();
      const adapter = new SimulatedPlatformValidationAdapter({
        platformId: "test-dsp-engine",
        platformVersion: "1.0.0",
      });
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();

      const runner = new ValidationExecutionRunner({
        fixtureManager,
        adapter,
        graph,
        ledger,
      });

      const caseRecord = createSampleAcousticCase(fixtureId);
      const pkg = createSamplePackage([caseRecord], fixtureManager);

      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        packageRecord: pkg,
        readinessRecord: sampleReadinessReady,
      });

      assert.ok(result);
      assert.ok(result.executionRecord);
      assert.ok(result.candidateOutput);
      assert.ok(result.baselineOutput);

      // Verify adapter was invoked for both candidate and baseline paths
      assert.equal(adapter.candidateCallCount, 1);
      assert.equal(adapter.baselineCallCount, 1);
      assert.equal(adapter.lastCandidateRequest?.caseId, caseRecord.case_id);
      assert.equal(adapter.lastBaselineRequest?.caseId, caseRecord.case_id);

      // Strictly validate Record 9 schema conformance
      const record = result.executionRecord;
      const parsed = validationExecutionRecordSchema.parse(record);
      assert.equal(parsed.execution_id, record.execution_id);
      assert.equal(record.case_id, caseRecord.case_id);
      assert.equal(record.fixture_id, fixtureId);
      assert.equal(record.binding_id, sampleBinding.binding_id);
      assert.equal(record.outcome, EXECUTION_OUTCOMES.COMPLETED);
      assert.ok(record.input_audio_integrity_ref.startsWith("sha256:"));
      assert.ok(record.output_audio_integrity_ref.startsWith("sha256:"));
      assert.ok(record.execution_duration_ms >= 0);
      assert.deepEqual(record.anomalies_detected, []);
      assert.ok(record.trace_ref.startsWith("trc_"));

      // Verify raw measurements container holds telemetry without DSP calculations
      assert.ok(typeof record.raw_measurements === "object");
      assert.equal(record.raw_measurements.platform_id, "test-dsp-engine");
      assert.ok("candidate_sample_count" in record.raw_measurements);
      assert.ok("baseline_sample_count" in record.raw_measurements);

      // Verify execution is preserved in runner history
      assert.equal(runner.getExecutionCount(), 1);
      assert.equal(runner.getExecution(record.execution_id)?.execution_id, record.execution_id);
    });

    it("attaches explicit caller trace_ref when provided for causal auditability", async () => {
      const { fixtureManager, fixtureId } = createTestFixtureSetup();
      const adapter = new SimulatedPlatformValidationAdapter();
      const runner = new ValidationExecutionRunner({ fixtureManager, adapter });

      const caseRecord = createSampleAcousticCase(fixtureId);
      const customTraceRef = "trc_custom_causal_audit_run_999";

      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        traceRef: customTraceRef,
      });

      assert.equal(result.executionRecord.trace_ref, customTraceRef);
    });
  });

  describe("B. Canonical TESTED_WITH Edge Management", () => {
    it("creates exact canonical TESTED_WITH edge (ValidationExecutionRecord -> ValidationFixtureRecord)", async () => {
      const { fixtureManager, fixtureId } = createTestFixtureSetup();
      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();

      const runner = new ValidationExecutionRunner({
        fixtureManager,
        adapter,
        graph,
        ledger,
      });

      const caseRecord = createSampleAcousticCase(fixtureId);
      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      const execId = result.executionRecord.execution_id;

      // Verify edge exists in graph
      const edges = graph.getEdges();
      const testedWithEdges = edges.filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.TESTED_WITH);

      assert.equal(testedWithEdges.length, 1);
      const edge = testedWithEdges[0];
      assert.equal(edge.source.id, execId);
      assert.equal(edge.source.kind, GOVERNED_ENTITY_KINDS.ValidationExecutionRecord);
      assert.equal(edge.target.id, fixtureId);
      assert.equal(edge.target.kind, GOVERNED_ENTITY_KINDS.ValidationFixtureRecord);

      // Verify zero case -> fixture TESTED_WITH edges
      const caseFixtureEdges = edges.filter(
        (e) =>
          e.edgeType === GOVERNED_EDGE_TYPES.TESTED_WITH &&
          e.source.kind === GOVERNED_ENTITY_KINDS.ValidationCase
      );
      assert.equal(caseFixtureEdges.length, 0);

      // Verify ledger entry
      assert.ok(ledger.getEntryCount() >= 2); // 1 record + 1 edge
    });

    it("creates zero TESTED_WITH edges when case does not require or use a fixture", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const runner = new ValidationExecutionRunner({ adapter, graph });

      // Build case with zero fixtures
      const caseRecord = createSampleAcousticCase(undefined);
      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      assert.equal(result.executionRecord.fixture_id, "NONE");
      assert.equal(result.testedWithFixtureId, undefined);

      const testedWithEdges = graph
        .getEdges()
        .filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.TESTED_WITH);
      assert.equal(testedWithEdges.length, 0);
    });
  });

  describe("C. Immediate Pre-Execution Fixture Revalidation & Fail-Closed Guards", () => {
    it("fails closed immediately if fixture becomes CONTAMINATED before execution", async () => {
      const { fixtureManager, fixtureId } = createTestFixtureSetup();
      const adapter = new SimulatedPlatformValidationAdapter();
      const runner = new ValidationExecutionRunner({ fixtureManager, adapter });
      const caseRecord = createSampleAcousticCase(fixtureId);

      // Flag fixture as CONTAMINATED via governed lifecycle method
      fixtureManager.flagContaminated(fixtureId, "Leaked into prompt tuning calibration");

      await assert.rejects(
        () =>
          runner.executeCase({
            caseRecord,
            scopeRecord: sampleScope,
            versionBinding: sampleBinding,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ExecutionEligibilityError);
          assert.match((err as Error).message, /CONTAMINATED/);
          return true;
        }
      );
    });

    it("fails closed immediately if fixture lifecycle state becomes INVALIDATED or SUSPECT", async () => {
      const { fixtureManager, fixtureId } = createTestFixtureSetup();
      const adapter = new SimulatedPlatformValidationAdapter();
      const runner = new ValidationExecutionRunner({ fixtureManager, adapter });
      const caseRecord = createSampleAcousticCase(fixtureId);

      // Flag fixture as SUSPECT via governed method (transitions lifecycle to INVALIDATED and contamination to SUSPECT)
      fixtureManager.flagSuspect(fixtureId, "Potential calibration drift detected");

      await assert.rejects(
        () =>
          runner.executeCase({
            caseRecord,
            scopeRecord: sampleScope,
            versionBinding: sampleBinding,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ExecutionEligibilityError);
          assert.match((err as Error).message, /SUSPECT|INVALIDATED/);
          return true;
        }
      );
    });

    it("fails closed if version binding scope does not match active scope", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const runner = new ValidationExecutionRunner({ adapter });
      const caseRecord = createSampleAcousticCase();

      const mismatchedBinding: ValidationVersionBindingRecord = {
        ...sampleBinding,
        scope_id: "scope_different_amp_02",
      };

      await assert.rejects(
        () =>
          runner.executeCase({
            caseRecord,
            scopeRecord: sampleScope,
            versionBinding: mismatchedBinding,
          }),
        ExecutionEligibilityError
      );
    });

    it("fails closed if case does not belong to provided package", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const runner = new ValidationExecutionRunner({ adapter });
      const caseRecord = createSampleAcousticCase();

      const foreignPackage: ValidationPackage = {
        package_id: "PKG-FOREIGN-01",
        intake_id: "intake_2026_01",
        scope_record_ref: sampleScope.scope_id,
        version_binding_ref: sampleBinding.binding_id,
        assigned_test_profiles: [TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC],
        validation_case_refs: ["CASE-DIFFERENT-99"],
        execution_record_refs: [],
        evidence_refs: [],
      };

      await assert.rejects(
        () =>
          runner.executeCase({
            caseRecord,
            scopeRecord: sampleScope,
            versionBinding: sampleBinding,
            packageRecord: foreignPackage,
          }),
        ExecutionEligibilityError
      );
    });
  });

  describe("D. Sandbox Crash Isolation & Render Failure Containment", () => {
    it("survives adapter / candidate render crash without crashing the parent harness", async () => {
      const adapter = new SimulatedPlatformValidationAdapter({
        shouldFailCandidate: true,
        candidateErrorMessage: "Fatal DSP memory allocation abort inside candidate core",
      });
      const runner = new ValidationExecutionRunner({ adapter });
      const caseRecord = createSampleAcousticCase();

      // Calling executeCase must NOT throw an unhandled exception to parent
      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      assert.ok(result);
      assert.equal(result.executionRecord.outcome, EXECUTION_OUTCOMES.FAILED);
      assert.ok(
        result.executionRecord.anomalies_detected.some((a) =>
          a.includes("Fatal DSP memory allocation abort")
        )
      );
      assert.equal(result.candidateOutput, undefined);
    });

    it("survives baseline render crash and reports FAILED outcome cleanly", async () => {
      const adapter = new SimulatedPlatformValidationAdapter({
        shouldFailBaseline: true,
        baselineErrorMessage: "PATH-PROD legacy host driver crashed",
      });
      const runner = new ValidationExecutionRunner({ adapter });
      const caseRecord = createSampleAcousticCase();

      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      assert.ok(result);
      assert.equal(result.executionRecord.outcome, EXECUTION_OUTCOMES.FAILED);
      assert.ok(
        result.executionRecord.anomalies_detected.some((a) =>
          a.includes("PATH-PROD legacy host driver crashed")
        )
      );
    });
  });

  describe("E. Timeout & Operational Budget Governance", () => {
    it("terminates execution when runtime exceeds operational budget reference and records ABORTED outcome", async () => {
      const adapter = new SimulatedPlatformValidationAdapter({
        shouldHangCandidate: true, // Hangs until signal abort
      });

      const budgetResolver = new DefaultOperationalBudgetResolver({
        BUDGET_TEST_FAST_TIMEOUT: 50, // 50ms budget for unit test speed
      });

      const runner = new ValidationExecutionRunner({
        adapter,
        budgetResolver,
      });

      const caseRecord = createSampleAcousticCase();

      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        operationalBudgetRef: "BUDGET_TEST_FAST_TIMEOUT",
      });

      assert.ok(result);
      assert.equal(result.executionRecord.outcome, EXECUTION_OUTCOMES.ABORTED);
      assert.ok(
        result.executionRecord.anomalies_detected.some((a) =>
          a.includes("operational budget limit of 50ms (BUDGET_TEST_FAST_TIMEOUT)")
        )
      );
      assert.equal(result.executionRecord.raw_measurements.sandbox_timeout, true);
    });
  });

  describe("F. Governed Retest & Canonical SUPERSEDES_VALIDATION Edge", () => {
    it("creates no SUPERSEDES_VALIDATION edge on standard first-run execution", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const runner = new ValidationExecutionRunner({ adapter, graph });
      const caseRecord = createSampleAcousticCase();

      const result = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      assert.equal(result.isRetest, false);
      const supersedesEdges = graph
        .getEdges()
        .filter((e) => e.edgeType === GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION);
      assert.equal(supersedesEdges.length, 0);
    });

    it("creates exact canonical SUPERSEDES_VALIDATION edge (new execution -> prior execution) on governed retest", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const ledger = new ValidationAuditLedger();
      const runner = new ValidationExecutionRunner({ adapter, graph, ledger });
      const caseRecord = createSampleAcousticCase();

      // First execution
      const run1 = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });
      const exec1Id = run1.executionRecord.execution_id;

      // Governed retest execution
      const run2 = await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
        supersedesExecutionId: exec1Id,
      });
      const exec2Id = run2.executionRecord.execution_id;

      assert.equal(run2.isRetest, true);
      assert.equal(run2.supersededExecutionId, exec1Id);
      assert.notEqual(exec1Id, exec2Id);

      // Verify exact SUPERSEDES_VALIDATION edge in graph
      const edges = graph.getEdges();
      const supersedesEdges = edges.filter(
        (e) => e.edgeType === GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION
      );
      assert.equal(supersedesEdges.length, 1);
      const edge = supersedesEdges[0];
      assert.equal(edge.source.id, exec2Id);
      assert.equal(edge.source.kind, GOVERNED_ENTITY_KINDS.ValidationExecutionRecord);
      assert.equal(edge.target.id, exec1Id);
      assert.equal(edge.target.kind, GOVERNED_ENTITY_KINDS.ValidationExecutionRecord);

      // Verify historical preservation: both run 1 and run 2 exist immutably
      assert.equal(runner.getExecutionCount(), 2);
      assert.ok(runner.getExecution(exec1Id));
      assert.ok(runner.getExecution(exec2Id));
    });

    it("rejects invalid or self-superseding relationships", async () => {
      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const runner = new ValidationExecutionRunner({ adapter, graph });
      const caseRecord = createSampleAcousticCase();

      // Attempt to supersede non-existent execution
      await assert.rejects(
        () =>
          runner.executeCase({
            caseRecord,
            scopeRecord: sampleScope,
            versionBinding: sampleBinding,
            supersedesExecutionId: "EXEC-NON-EXISTENT-9999",
          }),
        ExecutionRetestError
      );
    });
  });

  describe("G. Production Protection & Graph Invariants", () => {
    it("ensures zero production mutation is permitted in validation sandbox", () => {
      assert.doesNotThrow(() => ProductionProtectionGuard.assertSandboxIsolation());
      assert.throws(
        () => ProductionProtectionGuard.forbidProductionMutation("UPDATE_PROD_ROUTING"),
        ProductionStateViolationError
      );
    });

    it("verifies graph catalogue remains at exactly 14 governed edge types and zero Record 10+ evidence is created", async () => {
      assert.equal(
        Object.keys(GOVERNED_EDGE_DEFINITIONS).length,
        14,
        "Graph edge registry must remain at exactly 14 governed edge types"
      );

      const adapter = new SimulatedPlatformValidationAdapter();
      const graph = new ValidationRelationshipGraph();
      const runner = new ValidationExecutionRunner({ adapter, graph });
      const caseRecord = createSampleAcousticCase();

      await runner.executeCase({
        caseRecord,
        scopeRecord: sampleScope,
        versionBinding: sampleBinding,
      });

      // Confirm no ObjectiveEvidenceRecord, PerceptualEvaluationRecord, or outcomes were added to graph
      const registeredNodes = Array.from(graph.getNodes().values());
      const evidenceNodes = registeredNodes.filter(
        (n) =>
          n.kind === GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord ||
          n.kind === GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord ||
          n.kind === GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord
      );
      assert.equal(evidenceNodes.length, 0, "WP-10 must not create Record 10+ evidence");
    });
  });
});
