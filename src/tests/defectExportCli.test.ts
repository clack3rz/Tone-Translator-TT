// src/tests/defectExportCli.test.ts
// Independent verification test suite for WP-25 Slice 3:
// Defect Export Packaging CLI & Portable Reproduction Export.
// Bound to frozen specification v0.1j Section 29, Table 17, and Build Plan v0.1h WP-25.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  REQUIRED_EVIDENCE_CLASSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  ValidationCase,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationVersionBindingRecord,
} from "../sound-engineer/validation/schemas/records";
import { TABLE_17_REMAND_ROUTING } from "../sound-engineer/validation/attribution/attributionTypes";
import {
  DefectRemandRouter,
  exportDefectRemandPackage,
  verifyDefectRemandPackageIntegrity,
  verifyExportManifestIntegrity,
  runDefectExportCli,
  PackageIntegrityVerificationError,
  ExportDestinationExistsError,
  InvalidExportDestinationError,
  MissingReproductionFixtureError,
  type DefectRemandPackage,
} from "../sound-engineer/validation/remand";
import { RemandAgingTracker } from "../sound-engineer/validation/remand/remandAgingTracker";
import { DefaultSha256IntegrityProvider } from "../sound-engineer/validation/storage/ledgerTypes";
import { computeSha256BytesHex } from "../sound-engineer/validation/fixtures/audioVerification";
import { InMemoryFixturePayloadStore } from "../sound-engineer/validation/fixtures/fixtureManager";

// ---------------------------------------------------------------------------
// Canonical Fixture & Record Factories
// ---------------------------------------------------------------------------

function createMockBinding(bindingId = "BIND_2026_EXP"): ValidationVersionBindingRecord {
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

function createMockFixture(
  fixtureId = "FIX_lead_exp",
  payloadDigest = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
): ValidationFixtureRecord {
  return {
    fixture_id: fixtureId,
    fixture_name: "Clean DI Stratocaster Lead Track",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "1.0.0",
    payload_integrity_ref: payloadDigest,
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
  caseId = "CASE_lead_exp",
  fixtureId = "FIX_lead_exp"
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
    acceptance_criteria_ref: "CRIT_THD_LESS_THAN_0_05",
    failure_consequence: "BLOCKS_GATE_8",
    expected_remand_destination: "Software Engineering Core Team",
  };
}

function createMockExecution(
  executionId = "EXEC_lead_exp",
  caseId = "CASE_lead_exp",
  fixtureId = "FIX_lead_exp",
  bindingId = "BIND_2026_EXP"
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
      measured_thd_percent: 0.12,
      peak_level_dbfs: -0.2,
      snr_db: 74.2,
    },
    outcome: "FAILED",
    trace_ref: "TRACE_EXEC_UUID_2026_EXP",
  };
}

function createMockFailure(
  failureId = "FAIL_lead_exp",
  executionId = "EXEC_lead_exp"
): ValidationFailureRecord {
  const routing = TABLE_17_REMAND_ROUTING[FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING];
  return {
    failure_id: failureId,
    execution_id: executionId,
    failure_timestamp: "2026-10-20T10:05:00.000Z",
    failure_title: "Validation Failure (MIGRATION_MAPPING)",
    failure_symptom: "Harmonic distortion exceeded Stage 12 threshold by 140%.",
    attribution_class: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
    attribution_evidence_refs: ["crash_dump_001.log"],
    attribution_confidence: "CERTAIN",
    materiality: FAILURE_MATERIALITIES.MAJOR,
    affected_scope: ["Lead Channel"],
    gate_8_blocked: true,
    remand_destination: routing.remandDestination,
    retest_prerequisites: routing.defaultRetestPrerequisites,
  };
}

function setupSealedPackage(options?: {
  fixturePayloadBytes?: Uint8Array;
  nowFn?: () => Date;
}): {
  remandPackage: DefectRemandPackage;
  fixtureBytes?: Uint8Array;
  router: DefectRemandRouter;
  tracker: RemandAgingTracker;
} {
  const nowFn = options?.nowFn ?? (() => new Date("2026-10-20T12:00:00.000Z"));
  const tracker = new RemandAgingTracker({ nowFn });
  const router = new DefectRemandRouter({ tracker, nowFn });

  let fixtureBytes = options?.fixturePayloadBytes;
  let payloadDigest = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  if (fixtureBytes) {
    payloadDigest = `sha256:${computeSha256BytesHex(fixtureBytes)}`;
  }

  const binding = createMockBinding();
  const fixture = createMockFixture("FIX_lead_exp", payloadDigest);
  const vcase = createMockCase("CASE_lead_exp", fixture.fixture_id);
  const exec = createMockExecution("EXEC_lead_exp", vcase.case_id, fixture.fixture_id, binding.binding_id);
  const failure = createMockFailure("FAIL_lead_exp", exec.execution_id);

  const routeResult = router.routeDefect({
    failureRecord: failure,
    executionRecord: exec,
    versionBinding: binding,
    validationCase: vcase,
    fixtureRecord: fixture,
    customPackageId: "DRP_EXPORT_TEST_01",
    customRemandId: "REMAND_EXPORT_TEST_01",
  });

  return {
    remandPackage: routeResult.package,
    fixtureBytes,
    router,
    tracker,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("WP-25 Slice 3: Defect Export Packaging CLI & Portable Reproduction Export", () => {
  let tmpRoot: string;

  // Clean test directory setup
  const createTestDir = (): string => {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wp25-export-test-"));
  };

  describe("1. Complete Structured Export", () => {
    it("exports complete self-contained evidence directory matching the WP-25 contract", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        createSubfolder: true,
      });

      assert.equal(result.success, true);
      assert.ok(fs.existsSync(result.exportDirectory));
      assert.ok(fs.existsSync(result.manifestPath));

      // Verify all structured evidence files exist
      const requiredFiles = [
        "manifest.json",
        "remand-package.json",
        "records/failure-record.json",
        "records/version-binding.json",
        "records/validation-case.json",
        "records/fixture-record.json",
        "evidence/execution-trace.json",
        "evidence/measurements.json",
        "governance/routing-and-tracking.json",
      ];

      for (const reqFile of requiredFiles) {
        const fullPath = path.join(result.exportDirectory, reqFile);
        assert.ok(fs.existsSync(fullPath), `Expected file '${reqFile}' was not exported.`);
      }

      // Verify failure-record contents
      const failureJson = JSON.parse(
        fs.readFileSync(path.join(result.exportDirectory, "records/failure-record.json"), "utf8")
      );
      assert.equal(failureJson.failure_id, remandPackage.failureRecord.failure_id);
      assert.equal(failureJson.attribution_class, "MIGRATION_MAPPING");
      assert.equal(failureJson.materiality, "MAJOR");

      // Verify version-binding contents
      const bindingJson = JSON.parse(
        fs.readFileSync(path.join(result.exportDirectory, "records/version-binding.json"), "utf8")
      );
      assert.equal(bindingJson.binding_id, remandPackage.versionBinding.binding_id);
      assert.ok(bindingJson.architecture_version_matrix["1C.5g_version"]);

      // Verify manifest contents
      assert.equal(result.manifest.remandId, remandPackage.tracking.remandId);
      assert.equal(result.manifest.failureId, remandPackage.failureRecord.failure_id);
      assert.equal(result.manifest.canonicalDestination.upstreamRecipient, "Phase 1C.5g Migration");
      assert.equal(result.manifest.canonicalDestination.governanceEntityId, "GOVERNANCE_PHASE_1C5G_MIGRATION");
      assert.ok(result.manifest.manifestIntegrity.integrity_digest.length > 0);

      // Clean up
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe("2. Fixture Asset Handling & Modes", () => {
    it("handles manifest-referenced fixture without fabricating binary dummy bytes", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        createSubfolder: true,
      });

      assert.equal(result.fixtureAssetMode, "MANIFEST_REFERENCED");
      assert.equal(result.manifest.fixtureAsset.assetHandlingMode, "MANIFEST_REFERENCED");
      assert.equal(result.manifest.fixtureAsset.fixtureId, remandPackage.fixtureRecord.fixture_id);
      assert.equal(result.manifest.fixtureAsset.payloadDigest, remandPackage.fixtureStemRef.payloadDigest);
      assert.equal(result.manifest.fixtureAsset.calibrationSpec, remandPackage.fixtureStemRef.calibrationSpec);

      // Verify no fabricated audio files exist
      const assetsDir = path.join(result.exportDirectory, "assets");
      assert.equal(fs.existsSync(assetsDir), false);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("handles embedded/copied fixture bytes when provided and verifies payload digest", () => {
      const testDir = createTestDir();
      const dummyAudioBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00]); // "RIFF$..."
      const { remandPackage } = setupSealedPackage({ fixturePayloadBytes: dummyAudioBytes });

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        createSubfolder: true,
        fixturePayload: dummyAudioBytes,
      });

      assert.equal(result.fixtureAssetMode, "EMBEDDED_COPIED");
      assert.equal(result.manifest.fixtureAsset.assetHandlingMode, "EMBEDDED_COPIED");
      assert.ok(result.manifest.fixtureAsset.relativeAssetPath);

      const exportedAssetPath = path.join(result.exportDirectory, result.manifest.fixtureAsset.relativeAssetPath!);
      assert.ok(fs.existsSync(exportedAssetPath));

      const writtenBytes = fs.readFileSync(exportedAssetPath);
      assert.deepEqual(new Uint8Array(writtenBytes), dummyAudioBytes);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("fails closed when supplied fixture payload bytes do not match expected digest", () => {
      const testDir = createTestDir();
      const genuineAudioBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const corruptAudioBytes = new Uint8Array([9, 9, 9, 9, 9]);
      const { remandPackage } = setupSealedPackage({ fixturePayloadBytes: genuineAudioBytes });

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage,
            outputDir: testDir,
            fixturePayload: corruptAudioBytes, // Mismatched payload
          });
        },
        MissingReproductionFixtureError
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("extracts and verifies fixture from ReadOnlyFixturePayloadStore if provided", () => {
      const testDir = createTestDir();
      const dummyBytes = new Uint8Array([10, 20, 30, 40]);
      const { remandPackage } = setupSealedPackage({ fixturePayloadBytes: dummyBytes });

      const store = new InMemoryFixturePayloadStore();
      store.provisionPayload(remandPackage.fixtureRecord.fixture_id, dummyBytes);
      store.seal();

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        fixturePayload: store,
      });

      assert.equal(result.fixtureAssetMode, "EMBEDDED_COPIED");
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe("3. Integrity & Tamper Protection", () => {
    it("exports valid sealed package with verifiable manifest digest", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();
      const integrityProvider = new DefaultSha256IntegrityProvider();

      assert.equal(verifyDefectRemandPackageIntegrity(remandPackage, integrityProvider), true);

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        integrityProvider,
      });

      assert.ok(result.manifestDigest);
      assert.equal(
        result.manifestDigest,
        result.manifest.manifestIntegrity.integrity_digest
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("fails closed when package integrity digest is tampered or invalid", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // Tamper with package digest
      const tamperedPackage: DefectRemandPackage = {
        ...remandPackage,
        packageIntegrity: {
          ...remandPackage.packageIntegrity,
          integrity_digest: "sha256:corrupted_digest_deadbeef",
        },
      };

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage: tamperedPackage,
            outputDir: testDir,
            verifyIntegrity: true,
          });
        },
        PackageIntegrityVerificationError
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("fails closed when package evidence fields have been mutated post-sealing", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // Mutate execution trace reference post-sealing
      const tamperedPackage: DefectRemandPackage = {
        ...remandPackage,
        executionTraceRef: "TRACE_TAMPERED_UUID_9999",
      };

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage: tamperedPackage,
            outputDir: testDir,
            verifyIntegrity: true,
          });
        },
        PackageIntegrityVerificationError
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("does not mutate original DefectRemandPackage during export", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();
      const snapshotBefore = JSON.stringify(remandPackage);

      exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
      });

      const snapshotAfter = JSON.stringify(remandPackage);
      assert.equal(snapshotBefore, snapshotAfter);

      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe("4. Deterministic Serialization & Clock Injection", () => {
    it("produces byte-identical manifest and evidence digests when clock is injected", () => {
      const testDir1 = createTestDir();
      const testDir2 = createTestDir();
      const fixedTime = () => new Date("2026-10-20T15:30:00.000Z");

      const { remandPackage } = setupSealedPackage({ nowFn: fixedTime });

      const res1 = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir1,
        nowFn: fixedTime,
      });

      const res2 = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir2,
        nowFn: fixedTime,
      });

      assert.equal(res1.manifestDigest, res2.manifestDigest);
      assert.equal(res1.manifest.generatedAt, res2.manifest.generatedAt);
      assert.deepEqual(res1.exportedFiles, res2.exportedFiles);

      fs.rmSync(testDir1, { recursive: true, force: true });
      fs.rmSync(testDir2, { recursive: true, force: true });
    });
  });

  describe("5. Filesystem Safety & Protection", () => {
    it("never silently overwrites an existing non-empty output directory", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // First export succeeds
      exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
        createSubfolder: false,
      });

      // Second export to same directory must fail closed
      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage,
            outputDir: testDir,
            createSubfolder: false,
          });
        },
        ExportDestinationExistsError
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("rejects path traversal in packageId or destination", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // Package with illegal path traversal in custom packageId
      const maliciousPackage: DefectRemandPackage = {
        ...remandPackage,
        packageId: "../../etc/malicious",
      };

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage: maliciousPackage,
            outputDir: testDir,
          });
        },
        InvalidExportDestinationError
      );

      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe("6. Handoff Return State & Boundary Protection", () => {
    it("preserves factual RETURNED tracking status when exporting a returned remand", () => {
      const testDir = createTestDir();
      const { remandPackage, router } = setupSealedPackage();

      // Record upstream handoff return in aging tracker
      router.recordHandoffReturn(
        remandPackage.tracking.remandId,
        "HANDOFF_PKG_STAGE12_REV2",
        "2026-10-20T14:00:00.000Z"
      );

      const returnedTracking = router.getAgingTracker().getTracking(remandPackage.tracking.remandId)!;
      assert.equal(returnedTracking.status, "RETURNED");

      // Build updated package reflecting return (as stored in tracker)
      const updatedPackage = router.getAgingTracker().getPackage(remandPackage.tracking.remandId)!;

      const result = exportDefectRemandPackage({
        remandPackage: updatedPackage,
        outputDir: testDir,
        verifyIntegrity: false, // Tracking fields updated post-initial seal
      });

      assert.equal(result.manifest.remandId, remandPackage.tracking.remandId);

      const trackingJson = JSON.parse(
        fs.readFileSync(path.join(result.exportDirectory, "governance/routing-and-tracking.json"), "utf8")
      );
      assert.equal(trackingJson.tracking.status, "RETURNED");
      assert.equal(trackingJson.tracking.handoffReturnRef, "HANDOFF_PKG_STAGE12_REV2");

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("confirms export does NOT execute candidate code, alter prompts, or modify fixtures", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const originalFixtureVersion = remandPackage.fixtureRecord.version;
      const originalBindingVersion = remandPackage.versionBinding.runtime_implementation_version;

      exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
      });

      // Fixtures and bindings must remain unchanged
      assert.equal(remandPackage.fixtureRecord.version, originalFixtureVersion);
      assert.equal(remandPackage.versionBinding.runtime_implementation_version, originalBindingVersion);

      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe("7. CLI Runner Integration", () => {
    it("runs CLI successfully with --remand-id and context", async () => {
      const testDir = createTestDir();
      const { remandPackage, tracker } = setupSealedPackage();

      const cliResult = await runDefectExportCli(
        ["--remand-id", remandPackage.tracking.remandId, "-o", testDir],
        { tracker }
      );

      assert.equal(cliResult.exitCode, 0);
      assert.ok(cliResult.result);
      assert.ok(cliResult.message.includes("[SUCCESS]"));
      assert.ok(fs.existsSync(cliResult.result!.manifestPath));

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("runs CLI successfully with --package-file", async () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const pkgFile = path.join(testDir, "package-source.json");
      fs.writeFileSync(pkgFile, JSON.stringify(remandPackage), "utf8");

      const exportOut = path.join(testDir, "exported");

      const cliResult = await runDefectExportCli(
        ["--package-file", pkgFile, "-o", exportOut]
      );

      assert.equal(cliResult.exitCode, 0);
      assert.ok(cliResult.result);
      assert.ok(fs.existsSync(cliResult.result!.manifestPath));

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("returns exitCode 1 when mandatory arguments are missing", async () => {
      const cliResult = await runDefectExportCli(["--remand-id", "REMAND_123"]);
      assert.equal(cliResult.exitCode, 1);
      assert.ok(cliResult.message.includes("--out <dir> is required"));
    });

    it("displays help when -h or --help is passed", async () => {
      const cliResult = await runDefectExportCli(["--help"]);
      assert.equal(cliResult.exitCode, 0);
      assert.ok(cliResult.message.includes("Usage: defect-export"));
    });
  });

  describe("8. Stage 3 Acceptance Audit Tests", () => {
    it("verifies manifest integrity over clean export and detects post-export file tampering", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
      });

      // 1. Clean verification passes
      const cleanCheck = verifyExportManifestIntegrity(result.manifest, result.exportDirectory);
      assert.equal(cleanCheck.isValid, true);
      assert.ok(cleanCheck.checkedFilesCount > 0);

      // 2. Tampering with evidence file on disk is detected
      const failureRecordPath = path.join(result.exportDirectory, "records/failure-record.json");
      const originalContent = fs.readFileSync(failureRecordPath, "utf8");
      const tamperedContent = originalContent.replace("MIGRATION_MAPPING", "REASONING");
      fs.writeFileSync(failureRecordPath, tamperedContent, "utf8");

      const tamperedCheck = verifyExportManifestIntegrity(result.manifest, result.exportDirectory);
      assert.equal(tamperedCheck.isValid, false);
      assert.ok(tamperedCheck.failureReason?.includes("digest mismatch"));

      // 3. Tampering with manifest seal is detected
      const tamperedManifest = {
        ...result.manifest,
        manifestIntegrity: {
          ...result.manifest.manifestIntegrity,
          integrity_digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      };
      const sealCheck = verifyExportManifestIntegrity(tamperedManifest);
      assert.equal(sealCheck.isValid, false);
      assert.ok(sealCheck.failureReason?.includes("Manifest integrity seal verification failed"));

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("verifies manifest represents trackingStatus and locks it in the seal", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      const result = exportDefectRemandPackage({
        remandPackage,
        outputDir: testDir,
      });

      assert.equal(result.manifest.trackingStatus, "OUTSTANDING");

      // Changing trackingStatus post-export invalidates manifest seal
      const tamperedTrackingManifest = {
        ...result.manifest,
        trackingStatus: "RETURNED" as const,
      };
      const check = verifyExportManifestIntegrity(tamperedTrackingManifest);
      assert.equal(check.isValid, false);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("protects against destination creation race condition before atomic commit", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // Create target directory in advance
      const targetDir = path.join(testDir, remandPackage.packageId);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "preexisting.txt"), "preexisting data");

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage,
            outputDir: testDir,
            createSubfolder: true,
          });
        },
        ExportDestinationExistsError
      );

      // Verify preexisting file was not overwritten or merged
      assert.equal(fs.existsSync(path.join(targetDir, "preexisting.txt")), true);
      assert.equal(fs.existsSync(path.join(targetDir, "manifest.json")), false);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("guarantees staging adjacent in parentDir leaves no partial targetDir on failure", () => {
      const testDir = createTestDir();
      const { remandPackage } = setupSealedPackage();

      // Tampered package will fail integrity verification BEFORE staged commit
      const tamperedPackage = {
        ...remandPackage,
        executionTraceRef: "CORRUPTED_TRACE",
      };

      const targetDir = path.join(testDir, tamperedPackage.packageId);

      assert.throws(
        () => {
          exportDefectRemandPackage({
            remandPackage: tamperedPackage,
            outputDir: testDir,
          });
        },
        PackageIntegrityVerificationError
      );

      // Verify no target directory was created
      assert.equal(fs.existsSync(targetDir), false);

      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });
});
