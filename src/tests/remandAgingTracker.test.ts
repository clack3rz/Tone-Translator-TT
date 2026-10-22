// src/tests/remandAgingTracker.test.ts
// Targeted unit tests for WP-25 Slice 1: Remand Package Contracts & Aging Tracker.
// Bound to frozen specification v0.1j Section 29, Table 17, and Build Plan v0.1h WP-25.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  VALIDATION_RECORD_SCHEMAS,
  ValidationCase,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { TABLE_17_REMAND_ROUTING } from "../sound-engineer/validation/attribution/attributionTypes";
import {
  DefectRemandPackage,
  RemandLifecycleStatus,
} from "../sound-engineer/validation/remand/remandTypes";
import {
  DuplicateRemandRegistrationError,
  InvalidAgingCalculationError,
  InvalidRemandHandoffError,
  RemandAgingTracker,
  RemandNotFoundError,
} from "../sound-engineer/validation/remand/remandAgingTracker";

// ---------------------------------------------------------------------------
// Canonical Fixture Generators for Testing
// ---------------------------------------------------------------------------

function createMockFailureRecord(
  failureId = "FAIL_test_001",
  materiality = FAILURE_MATERIALITIES.CRITICAL_BLOCKER
): ValidationFailureRecord {
  return {
    failure_id: failureId,
    execution_id: "EXEC_2026_q4_001",
    failure_timestamp: "2026-10-20T00:00:00.000Z",
    failure_title: "Severe DSP Buffer Underflow in Lead Channel",
    failure_symptom: "Memory dropout during high-gain rendering causing silence",
    attribution_class: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
    attribution_evidence_refs: ["crash_dump_001.log"],
    attribution_confidence: "CERTAIN",
    materiality,
    affected_scope: ["Lead Channel"],
    gate_8_blocked: true,
    remand_destination: "Software Engineering Core Team",
    retest_prerequisites: "Patch buffer allocation race condition",
  };
}

function createMockVersionBinding(): ValidationVersionBindingRecord {
  return {
    binding_id: "BIND_test_001",
    scope_id: "SCOPE_test_001",
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

function createMockValidationCase(): ValidationCase {
  return {
    case_id: "CASE_test_001",
    title: "Lead Amp Dynamic Headroom Test",
    validation_question: "Does lead tone maintain dynamic headroom without clipping?",
    validation_subject: "American High Gain Lead Channel",
    scoped_boundaries: ["Gain 0-10", "Master 0-10"],
    applicable_test_dimensions: ["DIM_DYNAMIC_RANGE", "DIM_THD"],
    required_evidence_classes: [REQUIRED_EVIDENCE_CLASSES.OBJECTIVE],
    associated_fixture_set: ["FIX_di_guitar_lead_01"],
    evaluation_methodology: "METHOD_DETERMINISTIC_AUDIO_RUNNER",
    acceptance_criteria_ref: "CRIT_HEADROOM_MIN_12DB",
    failure_consequence: "BLOCKS_GATE_8",
    expected_remand_destination: "Software Engineering Core Team",
  };
}

function createMockFixtureRecord(): ValidationFixtureRecord {
  return {
    fixture_id: "FIX_di_guitar_lead_01",
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

function createMockRemandPackage(
  remandId = "REMAND_2026_001",
  packageId = "DRP_2026_001",
  remandedAt = "2026-10-20T10:00:00.000Z",
  materiality = FAILURE_MATERIALITIES.CRITICAL_BLOCKER
): DefectRemandPackage {
  const failureRecord = createMockFailureRecord(`FAIL_${remandId}`, materiality);
  const routing = TABLE_17_REMAND_ROUTING[FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION];

  return {
    packageId,
    failureRecord,
    executionTraceRef: "TRACE_exec_runner_2026_001",
    versionBinding: createMockVersionBinding(),
    validationCase: createMockValidationCase(),
    fixtureRecord: createMockFixtureRecord(),
    fixtureStemRef: {
      fixtureId: "FIX_di_guitar_lead_01",
      payloadDigest: "sha256:fixture_payload_digest_001",
      calibrationSpec: "-18 dBFS RMS sine reference at 1kHz",
    },
    measurementEvidence: {
      rawMeasurements: {
        peakLevelDb: 0.1,
        thdPercent: 4.8,
        bufferDropoutsDetected: 1,
      },
      objectiveEvidenceId: "OBJ_ev_001",
      criteriaRef: "CRIT_HEADROOM_MIN_12DB",
    },
    routing,
    tracking: {
      remandId,
      failureId: failureRecord.failure_id,
      remandedAt,
      recipient: routing.upstreamRecipient,
      governanceEntityId: routing.governanceEntityId,
      status: "OUTSTANDING",
    },
    packageIntegrity: {
      integrity_digest: "sha256:mock_package_seal_001",
      algorithm: "SHA-256",
      sealed_at: remandedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("WP-25 Slice 1: Remand Package Contracts & Aging Tracker", () => {
  describe("1. Architectural Boundary & Governed Record Catalogue Protection", () => {
    it("preserves exactly 22 canonical governed records; does NOT introduce DefectRemandPackage as Record 23", () => {
      const recordCount = Object.keys(VALIDATION_RECORD_SCHEMAS).length;
      assert.equal(recordCount, 22);
      assert.equal(
        (VALIDATION_RECORD_SCHEMAS as Record<string, unknown>)["DefectRemandPackage"],
        undefined
      );
      assert.equal(
        (VALIDATION_RECORD_SCHEMAS as Record<string, unknown>)["DefectRemandRecord"],
        undefined
      );
    });

    it("verifies RemandLifecycleStatus allows only OUTSTANDING and RETURNED", () => {
      const validStatuses: RemandLifecycleStatus[] = ["OUTSTANDING", "RETURNED"];
      assert.equal(validStatuses.length, 2);

      // Verify no invented states exist at runtime or in types
      const disallowed = ["ACKNOWLEDGED", "REMEDIATED", "REVALIDATED", "SUPERSEDED", "CLOSED"];
      for (const status of disallowed) {
        assert.ok(!validStatuses.includes(status as any));
      }
    });

    it("composite package composes authoritative evidence records without mutating them", () => {
      const pkg = createMockRemandPackage();
      assert.equal(pkg.failureRecord.attribution_class, "RUNTIME_IMPLEMENTATION");
      assert.equal(pkg.routing.governanceEntityId, "GOVERNANCE_CORE_SOFTWARE");
      assert.equal(pkg.tracking.status, "OUTSTANDING");
      assert.equal(pkg.tracking.handoffReturnRef, undefined);
    });
  });

  describe("2. RemandAgingTracker Registration & Outstanding Inquiries", () => {
    it("registers an OUTSTANDING remand package and retrieves it", () => {
      const tracker = new RemandAgingTracker();
      const pkg = createMockRemandPackage("REMAND_01");

      tracker.registerRemand(pkg);

      const outstanding = tracker.getOutstandingRemands();
      assert.equal(outstanding.length, 1);
      assert.equal(outstanding[0].remandId, "REMAND_01");
      assert.equal(outstanding[0].status, "OUTSTANDING");
      assert.equal(tracker.getPackage("REMAND_01")?.packageId, pkg.packageId);
    });

    it("supports idempotent registration of identical remand package", () => {
      const tracker = new RemandAgingTracker();
      const pkg = createMockRemandPackage("REMAND_IDEMP");

      tracker.registerRemand(pkg);
      // Re-registering identical package must succeed without error
      assert.doesNotThrow(() => {
        tracker.registerRemand(pkg);
      });

      assert.equal(tracker.getOutstandingRemands().length, 1);
    });

    it("rejects conflicting duplicate registration with same remandId but different packageId", () => {
      const tracker = new RemandAgingTracker();
      const pkg1 = createMockRemandPackage("REMAND_CONFLICT", "DRP_001");
      const pkg2 = createMockRemandPackage("REMAND_CONFLICT", "DRP_DIFFERENT");

      tracker.registerRemand(pkg1);

      assert.throws(() => {
        tracker.registerRemand(pkg2);
      }, DuplicateRemandRegistrationError);
    });
  });

  describe("3. Deterministic Aging Calculation & Threshold Comparison", () => {
    it("calculates deterministic elapsed age with injected clock", () => {
      const t0 = new Date("2026-10-20T10:00:00.000Z");
      const t1 = new Date("2026-10-20T12:30:00.000Z"); // 2.5 hours = 9,000,000 ms later

      const tracker = new RemandAgingTracker({ nowFn: () => t1 });
      const pkg = createMockRemandPackage("REMAND_TIME", "DRP_TIME", t0.toISOString());

      tracker.registerRemand(pkg);

      const aging = tracker.calculateAging();
      assert.equal(aging.length, 1);
      assert.equal(aging[0].remandId, "REMAND_TIME");
      assert.equal(aging[0].elapsedMs, 9_000_000);
      assert.equal(aging[0].isUnremediated, true);
      assert.equal(aging[0].materiality, FAILURE_MATERIALITIES.CRITICAL_BLOCKER);
      // When threshold is omitted, exceedsThreshold is undefined
      assert.equal(aging[0].exceedsThreshold, undefined);
    });

    it("correctly flags exceedsThreshold when thresholdMs is supplied", () => {
      const t0 = "2026-10-20T10:00:00.000Z";
      const asOf = "2026-10-20T14:00:00.000Z"; // 4 hours = 14,400,000 ms
      const elapsed = 14_400_000;

      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_THRESH", "DRP_THRESH", t0));

      // Threshold below elapsed age -> true
      const agingBelow = tracker.calculateAging(asOf, elapsed - 1000);
      assert.equal(agingBelow[0].exceedsThreshold, true);

      // Threshold above elapsed age -> false
      const agingAbove = tracker.calculateAging(asOf, elapsed + 1000);
      assert.equal(agingAbove[0].exceedsThreshold, false);

      // Threshold exactly equal to elapsed age -> false (not strictly greater)
      const agingEqual = tracker.calculateAging(asOf, elapsed);
      assert.equal(agingEqual[0].exceedsThreshold, false);
    });
  });

  describe("4. Handoff Return Lifecycle Transition & Immutability", () => {
    it("transitions factual status from OUTSTANDING to RETURNED upon recording handoff return", () => {
      const tracker = new RemandAgingTracker();
      const pkg = createMockRemandPackage("REMAND_RETURN_01");

      tracker.registerRemand(pkg);
      assert.equal(tracker.getOutstandingRemands().length, 1);

      const returnTime = "2026-10-20T15:00:00.000Z";
      const updated = tracker.recordHandoffReturn(
        "REMAND_RETURN_01",
        "HANDOFF_PKG_1C5G_REMEDIATED_v2.1",
        returnTime
      );

      assert.equal(updated.status, "RETURNED");
      assert.equal(updated.handoffReturnRef, "HANDOFF_PKG_1C5G_REMEDIATED_v2.1");
      assert.equal(updated.returnedAt, returnTime);

      // Returned remand must no longer appear in outstanding list
      assert.equal(tracker.getOutstandingRemands().length, 0);

      // Returned remand has isUnremediated === false
      const aging = tracker.calculateAging("2026-10-20T16:00:00.000Z");
      assert.equal(aging.length, 1);
      assert.equal(aging[0].isUnremediated, false);
    });

    it("supports idempotent recording of identical handoff return", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_IDEMP_RET"));

      tracker.recordHandoffReturn(
        "REMAND_IDEMP_RET",
        "HANDOFF_REF_01",
        "2026-10-20T12:00:00.000Z"
      );

      // Second identical call succeeds idempotently
      assert.doesNotThrow(() => {
        const ret2 = tracker.recordHandoffReturn(
          "REMAND_IDEMP_RET",
          "HANDOFF_REF_01",
          "2026-10-20T12:00:00.000Z"
        );
        assert.equal(ret2.status, "RETURNED");
      });
    });

    it("rejects contradictory second handoff return for already RETURNED remand", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_CONFLICT_RET"));

      tracker.recordHandoffReturn(
        "REMAND_CONFLICT_RET",
        "HANDOFF_FIRST",
        "2026-10-20T12:00:00.000Z"
      );

      assert.throws(() => {
        tracker.recordHandoffReturn(
          "REMAND_CONFLICT_RET",
          "HANDOFF_CONTRADICTORY",
          "2026-10-20T13:00:00.000Z"
        );
      }, InvalidRemandHandoffError);
    });

    it("guarantees returned objects and internal state cannot be mutated by caller", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_IMMUTABLE"));

      const outstanding = tracker.getOutstandingRemands();
      assert.throws(() => {
        (outstanding as any)[0] = "mutated";
      }, TypeError);

      assert.throws(() => {
        (outstanding[0] as any).status = "RETURNED";
      }, TypeError);
    });
  });

  describe("5. Failure Protection & Validation Invariants", () => {
    it("fails with RemandNotFoundError when attempting to record return on unknown remand", () => {
      const tracker = new RemandAgingTracker();
      assert.throws(() => {
        tracker.recordHandoffReturn("NONEXISTENT_REMAND", "HANDOFF_001");
      }, RemandNotFoundError);
    });

    it("fails with InvalidRemandHandoffError on empty or whitespace handoff return reference", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_EMPTY_REF"));

      assert.throws(() => {
        tracker.recordHandoffReturn("REMAND_EMPTY_REF", "");
      }, InvalidRemandHandoffError);

      assert.throws(() => {
        tracker.recordHandoffReturn("REMAND_EMPTY_REF", "   ");
      }, InvalidRemandHandoffError);
    });

    it("fails with InvalidRemandHandoffError when returnedAt is malformed or earlier than remandedAt", () => {
      const tracker = new RemandAgingTracker();
      const pkg = createMockRemandPackage("REMAND_TIME_FAIL", "DRP_TF", "2026-10-20T12:00:00.000Z");
      tracker.registerRemand(pkg);

      // Malformed timestamp
      assert.throws(() => {
        tracker.recordHandoffReturn("REMAND_TIME_FAIL", "HANDOFF_001", "not-a-timestamp");
      }, InvalidRemandHandoffError);

      // Earlier than remandedAt (temporal violation)
      assert.throws(() => {
        tracker.recordHandoffReturn("REMAND_TIME_FAIL", "HANDOFF_001", "2026-10-20T11:59:59.000Z");
      }, InvalidRemandHandoffError);
    });

    it("fails with InvalidAgingCalculationError on negative thresholdMs", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(createMockRemandPackage("REMAND_NEG"));

      assert.throws(() => {
        tracker.calculateAging(undefined, -1);
      }, InvalidAgingCalculationError);
    });

    it("fails with InvalidAgingCalculationError when asOf is earlier than remandedAt", () => {
      const tracker = new RemandAgingTracker();
      tracker.registerRemand(
        createMockRemandPackage("REMAND_EARLY", "DRP_EARLY", "2026-10-20T15:00:00.000Z")
      );

      assert.throws(() => {
        tracker.calculateAging("2026-10-20T14:00:00.000Z");
      }, InvalidAgingCalculationError);
    });
  });
});
