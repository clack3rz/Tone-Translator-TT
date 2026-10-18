// src/tests/failureAttributionEngine.test.ts
// Test suite for Phase 1C.5h WP-16: Root-Layer Failure Attribution & Diagnostic Isolation Engine (Record 14).
// Validates all 9 orthogonal failure attribution scenarios, Table 17 Remand Routing,
// canonical REMANDS_TO edge contract, immutability, and ledger compliance.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTION_CONFIDENCE_LEVELS,
  EXECUTION_OUTCOMES,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FailureAttributionClass,
  FailureMateriality,
} from "../sound-engineer/validation/schemas/enums";
import {
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  parseValidationFailureRecord,
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
  ConfoundedAttributionError,
  FailureAttributionEngine,
  InvalidAttributionEvidenceError,
  InvalidExecutionReferenceError,
  REMAND_CLASSES,
  ScopeAttributionMismatchError,
  TABLE_17_REMAND_ROUTING,
} from "../sound-engineer/validation/attribution";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockScopeRecord(): ValidationScopeRecord {
  return {
    scope_id: "SCOPE-001",
    intake_id: "INTAKE-001",
    primary_domain: "GEAR_FAMILY",
    included_units: ["tone.guitar.tube_preamp", "tone.guitar.cabinet_ir"],
    excluded_units: ["tone.bass.*"],
    boundary_constraints: ["Isolated under Axiom 6 boundary"],
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
}

function createMockExecutionRecord(overrides: Partial<ValidationExecutionRecord> = {}): ValidationExecutionRecord {
  return {
    execution_id: "EXEC-001",
    case_id: "CASE-001",
    profile_id: "PROFILE-01",
    fixture_id: "FIX-DI-001",
    binding_id: "BIND-001",
    execution_timestamp: "2026-03-20T12:00:00Z",
    execution_environment: "SANDBOX_ISOLATED_CONTAINER",
    input_audio_integrity_ref: "sha256:input_audio_digest",
    output_audio_integrity_ref: "sha256:output_audio_digest",
    execution_duration_ms: 125,
    anomalies_detected: [],
    raw_measurements: { thd: 0.012 },
    outcome: EXECUTION_OUTCOMES.FAILED,
    trace_ref: "ref:run_trace_001",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite: FailureAttributionEngine (WP-16 / Record 14)
// ---------------------------------------------------------------------------

describe("WP-16: FailureAttributionEngine (Record 14)", () => {
  // 1. VALIDATION_ENVIRONMENT Scenario
  it("Scenario 1: Attributes runner OOM and audio driver dropouts to VALIDATION_ENVIRONMENT", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const engine = new FailureAttributionEngine({ graph, ledger });

    const execution = createMockExecutionRecord({
      anomalies_detected: ["Runner killed by host kernel (SIGKILL, exit 137)"],
    });

    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      versionBindingRecord: createMockVersionBindingRecord(),
      symptomDetails: {
        title: "Test Runner Host Out Of Memory",
        symptom: "Test runner harness suffered OutOfMemory (OOM) during audio buffer rendering; kernel terminated process with exit code 137",
        exitCode: 137,
        logs: ["kernel: Out of memory: Kill process 8421 (test-runner)", "Audio driver dropout detected on ALSA interface"],
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT);
    assert.equal(result.record.attribution_confidence, ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN);
    assert.equal(result.remandDestination, "Validation Infrastructure Engineering");
    assert.equal(result.remandClass, REMAND_CLASSES.ENVIRONMENT_REMAND);
    assert.equal(result.upstreamRecipient, "Infrastructure Team");
    assert.equal(result.record.gate_8_blocked, true);
    assert.equal(result.isolationTrace.isConfounded, false);
    assert.equal(result.edgesCreated.length, 1);
    assert.equal(result.edgesCreated[0].edgeType, GOVERNED_EDGE_TYPES.REMANDS_TO);
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_VALIDATION_INFRASTRUCTURE");
  });

  // 2. TEST_FIXTURE Scenario
  it("Scenario 2: Attributes corrupted audio stem and depleted pickup battery to TEST_FIXTURE", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Golden Fixture Audio Signal Corrupted",
        symptom: "Severe clipping detected in stem; DI input track waveform shows severe asymmetric flat-topping and depleted pickup battery DC offset",
        audioIntegrityAnomalies: ["Severe clipping at 0.0 dBFS in reference DI stem", "DC offset exceeds 15%"],
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.equal(result.remandDestination, "Golden Fixture Curation Team");
    assert.equal(result.remandClass, REMAND_CLASSES.FIXTURE_REMAND);
    assert.equal(result.upstreamRecipient, "Fixture Curation Team");
    assert.equal(result.record.materiality, FAILURE_MATERIALITIES.MAJOR);
    assert.equal(result.record.gate_8_blocked, false); // Governed rule: MAJOR does not automatically set gate_8_blocked = true
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_FIXTURE_CURATION");
  });

  // 3. MIGRATION_MAPPING Scenario
  it("Scenario 3: Attributes Phase 1C.5g parameter transformation diff to MIGRATION_MAPPING", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Heuristic Parameter Remapping Mismatch",
        symptom: "Phase 1C.5g mapping table translated mid-frequency sweep to illegal range; schema diff indicates unmapped parameter 'eq_mid_freq'",
        mappingDiff: {
          sourceParam: "amp.lead.eq_mid_freq",
          mappedParam: "illegal_target_param_id",
          heuristicRuleId: "RULE_1C5G_PARAM_042",
          description: "Parameter transformation table produced out-of-range frequency index",
        },
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING);
    assert.equal(result.remandDestination, "Phase 1C.5g Migration Team");
    assert.equal(result.remandClass, REMAND_CLASSES.MIGRATION_REMAND);
    assert.equal(result.upstreamRecipient, "Phase 1C.5g Migration");
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_PHASE_1C5G_MIGRATION");
  });

  // 4. RUNTIME_IMPLEMENTATION Scenario
  it("Scenario 4: Attributes null pointer exception in core DSP code to RUNTIME_IMPLEMENTATION", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Runtime DSP Buffer Crash",
        symptom: "Runtime execution threw unhandled exception: TypeError: Cannot read properties of undefined (reading 'processBuffer')",
        error: {
          name: "TypeError",
          message: "Cannot read properties of undefined (reading 'processBuffer')",
          stack: "TypeError: Cannot read properties of undefined\n    at DspEngine.processBuffer (/src/runtime/dsp.ts:42:15)",
        },
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.equal(result.remandDestination, "Software Engineering Core Team");
    assert.equal(result.remandClass, REMAND_CLASSES.RUNTIME_REMAND);
    assert.equal(result.upstreamRecipient, "Core Software Team");
    assert.equal(result.record.materiality, FAILURE_MATERIALITIES.CRITICAL_BLOCKER);
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_CORE_SOFTWARE");
  });

  // 5. REASONING Scenario
  it("Scenario 5: Attributes cognitive contradiction in Stages 01–14 to REASONING", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Cognitive Dissonance in Acoustic Diagnosis",
        symptom: "AI sound engineering reasoning chain in Stage 07 formulated ungrounded causal diagnosis, applying severe treble cut to an already muffled tone request",
        reasoningDiagnostics: {
          stageNumber: 7,
          stageName: "Causal Diagnosis & EQ Plan",
          contradictionDetected: true,
          causalAnomaly: "Hypothesis H2 directly contradicts acquired acoustic evidence E1",
        },
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.REASONING);
    assert.equal(result.remandDestination, "Upstream Reasoning Governance (Phases 1C.5a through 1C.5e)");
    assert.equal(result.remandClass, REMAND_CLASSES.REASONING_REMAND);
    assert.equal(result.upstreamRecipient, "Phases 1C.5a–e Governance");
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_UPSTREAM_REASONING");
  });

  // 6. PLATFORM_TRANSLATION Scenario
  it("Scenario 6: Attributes Stage 12 illegal platform parameter ID to PLATFORM_TRANSLATION", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Stage 12 Platform Translation Parameter Error",
        symptom: "Stage 12 emitted illegal platform parameter ID 'kParam_AmpGain_Invalid' and invalid preset XML serialization syntax",
        logs: ["AmpliTube 5 XML tag error: unknown parameter identifier", "Stage 12 normalization curve failed clamp bounds"],
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION);
    assert.equal(result.remandDestination, "Stage 12 Platform Translation Governance");
    assert.equal(result.remandClass, REMAND_CLASSES.TRANSLATION_REMAND);
    assert.equal(result.upstreamRecipient, "Stage 12 Platform Team");
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_STAGE_12_PLATFORM");
  });

  // 7. TARGET_PLATFORM Scenario
  it("Scenario 7: Attributes vendor host application crash to TARGET_PLATFORM", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "External Host Vendor Platform Crash",
        symptom: "External target platform host binary crashed internally; vendor patch regression documented in external platform build 2026.10",
        platformError: {
          code: "VENDOR_SEGFAULT_0xDEAD",
          vendorMessage: "AmpliTube 5 crash in vendor module ik_core_dsp.so",
        },
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM);
    assert.equal(result.remandDestination, "Platform Integration & Vendor Compatibility Team");
    assert.equal(result.remandClass, REMAND_CLASSES.PLATFORM_REMAND);
    assert.equal(result.upstreamRecipient, "Vendor Integration");
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_VENDOR_INTEGRATION");
  });

  // 8. OPERATIONAL_INFRASTRUCTURE Scenario
  it("Scenario 8: Attributes cluster scheduling and DB dropouts to OPERATIONAL_INFRASTRUCTURE", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Cluster Scheduling & Database Connection Dropout",
        symptom: "Host hardware experienced SRE cluster eviction and database connection dropout during validation audit ledger commit",
        logs: ["SRE cluster eviction notice received", "Storage latency alert: disk I/O exceeded 5000ms"],
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE);
    assert.equal(result.remandDestination, "Operations & SRE Team");
    assert.equal(result.remandClass, REMAND_CLASSES.INFRASTRUCTURE_REMAND);
    assert.equal(result.upstreamRecipient, "Operations / SRE Team");
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_OPERATIONS_SRE");
  });

  // 9. UNKNOWN Scenario
  it("Scenario 9: Attributes unclassified symptoms without recognizable signatures to UNKNOWN", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Anomalous Non-Specific Behavior",
        symptom: "Tone generation exhibited unexpected behavior with no error traces, no OOM, and no discernible pattern",
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.UNKNOWN);
    assert.equal(result.remandDestination, "Joint Diagnostic Working Group");
    assert.equal(result.remandClass, REMAND_CLASSES.JOINT_DIAGNOSTIC_REMAND);
    assert.equal(result.upstreamRecipient, "Joint Diagnostic Working Group");
    assert.equal(result.record.gate_8_blocked, false); // Proves UNKNOWN does NOT automatically block Gate 8
    assert.equal(result.edgesCreated[0].target.id, "GOVERNANCE_JOINT_DIAGNOSTIC");
  });

  // 10. Confounded Multi-Signal Scenario
  it("Scenario 10: Forbids speculative blame when multiple conflicting signals are present, isolating to UNKNOWN", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const execution = createMockExecutionRecord();
    const result = engine.attributeFailure({
      executionRecord: execution,
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Confounded Simultaneous Multi-Layer Symptom",
        symptom: "Test runner logged host OutOfMemory while simultaneously AI reasoning logged cognitive contradiction in Stage 07 and DI stem was reported corrupt audio",
        audioIntegrityAnomalies: ["Clipped stem"],
        reasoningDiagnostics: { contradictionDetected: true },
        logs: ["kernel: Out of memory", "cognitive contradiction in Stage 07"],
      },
    });

    assert.equal(result.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.UNKNOWN);
    assert.equal(result.isolationTrace.isConfounded, true);
    assert.equal(result.remandDestination, "Joint Diagnostic Working Group");
    assert.equal(result.record.gate_8_blocked, false); // Confounded UNKNOWN does NOT automatically block Gate 8
  });

  // 11. Canonical REMANDS_TO Edge Endpoint Contract
  it("Scenario 11: Validates exact canonical REMANDS_TO edge contract and rejects invalid endpoints", () => {
    const graph = new ValidationRelationshipGraph();
    const engine = new FailureAttributionEngine({ graph });

    const result = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Runner OutOfMemory",
        symptom: "Runner crashed with OutOfMemory",
      },
    });

    // Exact edge created
    assert.equal(result.edgesCreated.length, 1);
    const edge = result.edgesCreated[0];
    assert.equal(edge.edgeType, GOVERNED_EDGE_TYPES.REMANDS_TO);
    assert.equal(edge.source.kind, GOVERNED_ENTITY_KINDS.ValidationFailureRecord);
    assert.equal(edge.source.id, result.record.failure_id);
    assert.equal(edge.target.kind, GOVERNED_ENTITY_KINDS.GovernanceEntity);
    assert.equal(edge.target.id, "GOVERNANCE_VALIDATION_INFRASTRUCTURE");

    // Endpoint validator accepts valid direction
    assert.ok(
      validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.REMANDS_TO,
        { id: result.record.failure_id, kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord },
        { id: "GOVERNANCE_VALIDATION_INFRASTRUCTURE", kind: GOVERNED_ENTITY_KINDS.GovernanceEntity }
      )
    );

    // Endpoint validator strictly rejects reversed direction
    assert.throws(
      () =>
        validateEdgeEndpoints(
          GOVERNED_EDGE_TYPES.REMANDS_TO,
          { id: "GOVERNANCE_VALIDATION_INFRASTRUCTURE", kind: GOVERNED_ENTITY_KINDS.GovernanceEntity },
          { id: result.record.failure_id, kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord }
        ),
      InvalidEndpointError
    );

    // Endpoint validator strictly rejects non-governance target
    assert.throws(
      () =>
        validateEdgeEndpoints(
          GOVERNED_EDGE_TYPES.REMANDS_TO,
          { id: result.record.failure_id, kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord },
          { id: "EXEC-001", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord }
        ),
      InvalidEndpointError
    );

    // Endpoint validator strictly rejects non-failure source
    assert.throws(
      () =>
        validateEdgeEndpoints(
          GOVERNED_EDGE_TYPES.REMANDS_TO,
          { id: "REG-001", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
          { id: "GOVERNANCE_STAGE_12_PLATFORM", kind: GOVERNED_ENTITY_KINDS.GovernanceEntity }
        ),
      InvalidEndpointError
    );
  });

  // 12. Immutability & Audit Ledger Compliance
  it("Scenario 12: Enforces immutability via deepFreeze and appends Record 14 to audit ledger", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const engine = new FailureAttributionEngine({ graph, ledger });

    const result = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Runtime DSP Buffer Crash",
        symptom: "Runtime core null pointer exception in processBuffer",
      },
    });

    // Object is deep-frozen
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.record));
    assert.ok(Object.isFrozen(result.isolationTrace));

    // In strict mode, modifying frozen object throws
    assert.throws(() => {
      (result.record as any).failure_title = "Modified Title";
    }, TypeError);

    // Ledger contains Record 14
    const entries = ledger.getEntries();
    const failureEntry = entries.find((e) => e.entityId === result.record.failure_id);
    assert.ok(failureEntry);
    assert.equal((failureEntry.payload as any).failure_id, result.record.failure_id);
    assert.equal(failureEntry.entityKind, GOVERNED_ENTITY_KINDS.ValidationFailureRecord);
  });

  // 13. Exact Schema Parity for Record 14
  it("Scenario 13: Emitted record conforms 100% to signed-off Record 14 schema", () => {
    const engine = new FailureAttributionEngine();

    const result = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Test Fixture Miscalibration",
        symptom: "Stem header is invalid and audio format is not supported",
      },
    });

    // Schema parse verification
    const parsed = parseValidationFailureRecord(result.record);
    assert.equal(parsed.failure_id, result.record.failure_id);
    assert.equal(parsed.execution_id, "EXEC-001");
    assert.ok(parsed.failure_timestamp);
    assert.ok(parsed.attribution_evidence_refs.length >= 1);
    assert.equal(parsed.affected_scope.length, 2);
    assert.equal(parsed.retest_prerequisites.length > 0, true);
  });

  // 14. Error Conditions
  it("Scenario 14: Throws appropriate error when mandatory inputs are missing or invalid", () => {
    const engine = new FailureAttributionEngine();

    // Missing execution record
    assert.throws(
      () =>
        engine.attributeFailure({
          executionRecord: null as any,
          scopeRecord: createMockScopeRecord(),
          symptomDetails: { title: "Title", symptom: "Symptom" },
        }),
      InvalidExecutionReferenceError
    );

    // Missing scope record
    assert.throws(
      () =>
        engine.attributeFailure({
          executionRecord: createMockExecutionRecord(),
          scopeRecord: null as any,
          symptomDetails: { title: "Title", symptom: "Symptom" },
        }),
      ScopeAttributionMismatchError
    );

    // Empty title
    assert.throws(
      () =>
        engine.attributeFailure({
          executionRecord: createMockExecutionRecord(),
          scopeRecord: createMockScopeRecord(),
          symptomDetails: { title: "", symptom: "Symptom" },
        }),
      InvalidAttributionEvidenceError
    );

    // Empty symptom
    assert.throws(
      () =>
        engine.attributeFailure({
          executionRecord: createMockExecutionRecord(),
          scopeRecord: createMockScopeRecord(),
          symptomDetails: { title: "Title", symptom: "   " },
        }),
      InvalidAttributionEvidenceError
    );

    // Binding ID mismatch
    assert.throws(
      () =>
        engine.attributeFailure({
          executionRecord: createMockExecutionRecord({ binding_id: "WRONG_BINDING" }),
          scopeRecord: createMockScopeRecord(),
          versionBindingRecord: createMockVersionBindingRecord(),
          symptomDetails: { title: "Title", symptom: "Symptom" },
        }),
      InvalidExecutionReferenceError
    );
  });

  // 15. UNKNOWN Gate 8 Independence Verification
  it("Scenario 15: Proves UNKNOWN does not automatically imply Gate-8 blocking solely because it is UNKNOWN", () => {
    const engine = new FailureAttributionEngine();

    // 15a. UNKNOWN with MINOR materiality -> NOT blocked
    const minorUnknown = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      materiality: FAILURE_MATERIALITIES.MINOR,
      symptomDetails: {
        title: "Unclassified Minor UI Glitch",
        symptom: "Minor cosmetic artifact without clear attribution layer",
      },
    });
    assert.equal(minorUnknown.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.UNKNOWN);
    assert.equal(minorUnknown.record.materiality, FAILURE_MATERIALITIES.MINOR);
    assert.equal(minorUnknown.record.gate_8_blocked, false, "UNKNOWN + MINOR must not block Gate 8");

    // 15b. UNKNOWN with MAJOR materiality -> NOT automatically blocked at Record 14 level
    const majorUnknown = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      materiality: FAILURE_MATERIALITIES.MAJOR,
      symptomDetails: {
        title: "Unclassified Major Divergence",
        symptom: "Major divergence with unidentifiable root cause",
      },
    });
    assert.equal(majorUnknown.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.UNKNOWN);
    assert.equal(majorUnknown.record.materiality, FAILURE_MATERIALITIES.MAJOR);
    assert.equal(majorUnknown.record.gate_8_blocked, false, "UNKNOWN + MAJOR must not automatically block Gate 8");

    // 15c. UNKNOWN with COSMETIC materiality -> NOT blocked
    const cosmeticUnknown = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      materiality: FAILURE_MATERIALITIES.COSMETIC,
      symptomDetails: {
        title: "Unclassified Cosmetic Discrepancy",
        symptom: "Slight pixel alignment variance without known cause",
      },
    });
    assert.equal(cosmeticUnknown.record.gate_8_blocked, false, "UNKNOWN + COSMETIC must not block Gate 8");

    // 15d. UNKNOWN with CRITICAL_BLOCKER materiality -> BLOCKED because of materiality
    const criticalUnknown = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      symptomDetails: {
        title: "Unclassified Fatal Hang",
        symptom: "Harness hung without stack or driver output",
      },
    });
    assert.equal(criticalUnknown.record.gate_8_blocked, true, "UNKNOWN + CRITICAL_BLOCKER blocks due to materiality");

    // 15e. UNKNOWN with explicit caller gate8Blocked = true -> BLOCKED because caller explicitly requested
    const explicitBlockedUnknown = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      materiality: FAILURE_MATERIALITIES.MINOR,
      gate8Blocked: true,
      symptomDetails: {
        title: "Unclassified Minor with Governed Block",
        symptom: "Governed policy explicitly flagged this scope as blocked",
      },
    });
    assert.equal(explicitBlockedUnknown.record.gate_8_blocked, true, "Explicit gate8Blocked=true must be respected");
  });

  // 16. Complete Materiality Independence Across Attribution Classes
  it("Scenario 16: Proves attribution class and materiality are strictly independent across all pairings", () => {
    const engine = new FailureAttributionEngine();

    // 16a. RUNTIME_IMPLEMENTATION with MINOR materiality
    const runtimeMinor = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
      materiality: FAILURE_MATERIALITIES.MINOR,
      symptomDetails: {
        title: "Minor Runtime Calculation Inefficiency",
        symptom: "Runtime processing loop took 5ms longer than optimal but within soft budget",
      },
    });
    assert.equal(runtimeMinor.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION);
    assert.equal(runtimeMinor.record.materiality, FAILURE_MATERIALITIES.MINOR);
    assert.equal(runtimeMinor.record.gate_8_blocked, false);

    // 16b. TEST_FIXTURE with CRITICAL_BLOCKER materiality
    const fixtureCritical = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
      materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      symptomDetails: {
        title: "Critical Golden Fixture Zero-Byte File",
        symptom: "Golden stem file completely corrupted with zero bytes, crashing harness",
      },
    });
    assert.equal(fixtureCritical.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE);
    assert.equal(fixtureCritical.record.materiality, FAILURE_MATERIALITIES.CRITICAL_BLOCKER);
    assert.equal(fixtureCritical.record.gate_8_blocked, true);

    // 16c. MIGRATION_MAPPING with COSMETIC materiality
    const mappingCosmetic = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
      materiality: FAILURE_MATERIALITIES.COSMETIC,
      symptomDetails: {
        title: "Cosmetic Label Truncation in Mapping Table",
        symptom: "Display label truncated by 1 character in parameter metadata comment",
      },
    });
    assert.equal(mappingCosmetic.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING);
    assert.equal(mappingCosmetic.record.materiality, FAILURE_MATERIALITIES.COSMETIC);
    assert.equal(mappingCosmetic.record.gate_8_blocked, false);

    // 16d. VALIDATION_ENVIRONMENT with MAJOR materiality
    const envMajor = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      explicitAttributionClass: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
      materiality: FAILURE_MATERIALITIES.MAJOR,
      symptomDetails: {
        title: "Validation Container High CPU Throttling",
        symptom: "Test runner container experienced 80% CPU throttling during render pass",
      },
    });
    assert.equal(envMajor.record.attribution_class, FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT);
    assert.equal(envMajor.record.materiality, FAILURE_MATERIALITIES.MAJOR);
    assert.equal(envMajor.record.gate_8_blocked, false);
  });

  // 17. MAJOR vs CRITICAL_BLOCKER Governance
  it("Scenario 17: Proves MAJOR is not automatically treated as CRITICAL_BLOCKER and gate_8_blocked follows exact governed rule", () => {
    const engine = new FailureAttributionEngine();

    // 17a. Default failure without crash signature defaults to MAJOR, gate_8_blocked = false
    const defaultMajor = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Standard Parameter Out Of Range",
        symptom: "Observed parameter was outside expected threshold window",
      },
    });
    assert.equal(defaultMajor.record.materiality, FAILURE_MATERIALITIES.MAJOR);
    assert.equal(defaultMajor.record.gate_8_blocked, false, "Default MAJOR must not auto-block Gate 8");

    // 17b. Explicit CRITICAL_BLOCKER automatically sets gate_8_blocked = true
    const explicitCritical = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      symptomDetails: {
        title: "Fatal Pipeline Halt",
        symptom: "Pipeline encountered unrecoverable state",
      },
    });
    assert.equal(explicitCritical.record.materiality, FAILURE_MATERIALITIES.CRITICAL_BLOCKER);
    assert.equal(explicitCritical.record.gate_8_blocked, true, "CRITICAL_BLOCKER must set gate_8_blocked = true");

    // 17c. Explicit caller override gate8Blocked = false on CRITICAL_BLOCKER is respected
    const explicitUnblockCritical = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      materiality: FAILURE_MATERIALITIES.CRITICAL_BLOCKER,
      gate8Blocked: false,
      symptomDetails: {
        title: "Critical Failure with Downstream Exception",
        symptom: "Explicit override passed by coordinator",
      },
    });
    assert.equal(explicitUnblockCritical.record.gate_8_blocked, false, "Caller explicit gate8Blocked=false must be respected");
  });

  // 18. Absence of Downstream Records (No Gate-8 decision records, No Records 15-17)
  it("Scenario 18: Proves no Gate-8 decision records or Record 15-17 artifacts are created by WP-16", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const engine = new FailureAttributionEngine({ graph, ledger });

    const result = engine.attributeFailure({
      executionRecord: createMockExecutionRecord(),
      scopeRecord: createMockScopeRecord(),
      symptomDetails: {
        title: "Isolated Diagnostic Attribution",
        symptom: "Forensic analysis executed in isolation",
      },
    });

    // 18a. Result contains only ValidationFailureRecord (Record 14)
    assert.ok(result.record);
    assert.equal(result.record.failure_id.startsWith("FAIL_"), true);

    // 18b. Graph edges: only REMANDS_TO edge created
    assert.equal(result.edgesCreated.length, 1);
    assert.equal(result.edgesCreated[0].edgeType, GOVERNED_EDGE_TYPES.REMANDS_TO);

    // 18c. Ledger entries: only ValidationFailureRecord appended
    const entries = ledger.getEntries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].entityKind, GOVERNED_ENTITY_KINDS.ValidationFailureRecord);

    // 18d. Confirm zero instances of downstream records
    const forbiddenKinds = [
      GOVERNED_ENTITY_KINDS.EvidenceConflictRecord, // Record 15 (WP-17)
      GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord, // Record 16 (WP-18)
      GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord, // Record 17 (WP-19)
      GOVERNED_ENTITY_KINDS.ProductionReadinessAssessmentRecord, // Record 20 (WP-21)
      GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord, // Record 21 (WP-22)
      GOVERNED_ENTITY_KINDS.Gate8ChangeRecord, // Record 22 (WP-24)
    ];

    for (const kind of forbiddenKinds) {
      assert.equal(
        entries.some((e) => e.entityKind === kind),
        false,
        `Ledger must not contain ${kind}`
      );
    }
  });
});
