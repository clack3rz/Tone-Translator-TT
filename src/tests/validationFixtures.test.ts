// src/tests/validationFixtures.test.ts
// Comprehensive test suite for Phase 1C.5h WP-08:
// Golden Acoustic Fixture Corpus & Benchmark Stem Management (Record 8).
// Bound to frozen specification v0.1j Section 18, Table 08, and Invariant 4.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import { type IntegrityProvider } from "../sound-engineer/validation/schemas/integrity";
import {
  parseValidationFixtureRecord,
  ValidationScopeRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  CanonicalSha256IntegrityProvider,
  DEFAULT_INTEGRITY_PROVIDER,
  bytesToDeterministicHex,
  computePayloadDigest,
  computeSha256BytesHex,
  createDefaultMvviCorpusManifest,
  createSyntheticPcmWav,
  FixtureCorpusManager,
  FixtureImmutabilityViolationError,
  FixturePayloadStore,
  FixtureStorageGovernanceError,
  FixtureStorageMutationError,
  InMemoryFixturePayloadStore,
  isAudioFixtureClass,
  MVVI_BOOTSTRAP_FIXTURE_RECORDS,
  ReadOnlyFixturePayloadStoreWrapper,
  SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES,
  validatePcmWavHeader,
  verifyAudioPayloadIntegrity,
  verifyFixtureManifest,
} from "../sound-engineer/validation/fixtures";

describe("Phase 1C.5h — WP-08: Golden Acoustic Fixture Corpus & Benchmark Stem Management (Record 8)", () => {
  const manager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

  function createSampleScope(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
    return {
      scope_id: "scope_high_gain_01",
      intake_id: "intake_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_lead_5150", "amp_recto_dual"],
      excluded_units: ["cab_vintage_4x12"],
      boundary_constraints: ["Isolated under Axiom 6 boundary"],
      scope_inflation_protection: true,
      ...overrides,
    };
  }

  describe("1. Strict Taxonomy Compliance (Eight Frozen Fixture Classes)", () => {
    it("recognizes all eight frozen Fixture Classes in enums and manifest", () => {
      const expectedClasses = [
        "DI_PERFORMANCE",
        "REFERENCE_TONE",
        "APPROVED_PRESET",
        "RENDERED_PLATFORM_BENCHMARK",
        "SYNTHETIC_TEST_SIGNAL",
        "MULTITRACK_CONTEXT",
        "ADVERSARIAL_PATHOLOGICAL",
        "WORKFLOW_PROMPT",
      ];

      for (const cls of expectedClasses) {
        assert.ok(
          cls in FIXTURE_CLASSES,
          `Expected frozen fixture class ${cls} to be present in FIXTURE_CLASSES`
        );
      }
      assert.equal(Object.keys(FIXTURE_CLASSES).length, 8);
    });

    it("ensures the MVVI bootstrap corpus covers all eight frozen Fixture Classes", () => {
      const manifest = createDefaultMvviCorpusManifest();
      const report = verifyFixtureManifest(manifest, { requireAllEightClasses: true });

      assert.equal(report.valid, true);
      assert.equal(report.errors.length, 0);

      for (const cls of Object.values(FIXTURE_CLASSES)) {
        assert.ok(
          report.fixtureClassDistribution[cls] > 0,
          `Expected fixture class ${cls} to have at least one representative in bootstrap corpus`
        );
      }
    });

    it("rejects non-governed fixture classes at schema validation level", () => {
      assert.throws(() => {
        parseValidationFixtureRecord({
          fixture_id: "FIX-INVALID-CLS-01",
          fixture_name: "Illegal Class Fixture",
          fixture_class: "UNOFFICIAL_MP3_DOWNLOAD",
          version: "v1.0",
          payload_integrity_ref: "sha256:abcd",
          declared_applicability_scope: ["amp_clean"],
          provenance_metadata: {
            recording_engineer: "Test Engineer",
            capture_date: "2026-03-01T00:00:00Z",
          },
          calibration_spec: "CAL_SPEC_STD",
          contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
          lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
        });
      });
    });
  });

  describe("2. Canonical Enum Parity for Record 8", () => {
    it("validates contamination_status: CLEAN | CONTAMINATED | SUSPECT", () => {
      assert.equal(FIXTURE_CONTAMINATION_STATUSES.CLEAN, "CLEAN");
      assert.equal(FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED, "CONTAMINATED");
      assert.equal(FIXTURE_CONTAMINATION_STATUSES.SUSPECT, "SUSPECT");
      assert.equal(Object.keys(FIXTURE_CONTAMINATION_STATUSES).length, 3);
    });

    it("validates lifecycle_status: ACTIVE | SUPERSEDED | INVALIDATED | RETIRED", () => {
      assert.equal(FIXTURE_LIFECYCLE_STATUSES.ACTIVE, "ACTIVE");
      assert.equal(FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED, "SUPERSEDED");
      assert.equal(FIXTURE_LIFECYCLE_STATUSES.INVALIDATED, "INVALIDATED");
      assert.equal(FIXTURE_LIFECYCLE_STATUSES.RETIRED, "RETIRED");
      assert.equal(Object.keys(FIXTURE_LIFECYCLE_STATUSES).length, 4);
    });

    it("rejects invalid contamination or lifecycle statuses", () => {
      assert.throws(() => {
        parseValidationFixtureRecord({
          fixture_id: "FIX-BAD-STATUS",
          fixture_name: "Bad Status Fixture",
          fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
          version: "v1.0",
          payload_integrity_ref: "sha256:1234",
          declared_applicability_scope: ["amp_clean"],
          provenance_metadata: {},
          calibration_spec: "CAL_SPEC_STD",
          contamination_status: "DIRTY_LEAKED", // Invalid
          lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
        });
      });
    });
  });

  describe("3. Declared Applicability Scope Enforcement (Prohibiting Off-Label Use)", () => {
    it("requires explicit, non-empty declared_applicability_scope on registration", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: false });

      assert.throws(() => {
        localManager.registerFixture({
          fixture_id: "FIX-NO-SCOPE",
          fixture_name: "No Scope Fixture",
          fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
          version: "v1.0",
          payload_integrity_ref: "sha256:1234",
          declared_applicability_scope: [], // Empty
          provenance_metadata: {},
          calibration_spec: "CAL_SPEC_STD",
          contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
          lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
        });
      });
    });

    it("matches applicable fixtures within declared scope", () => {
      const leadScope = createSampleScope({
        included_units: ["amp_lead_5150"],
      });

      const leadFixture = manager.getFixture("FIX-DI-LAD-01-v1")!;
      assert.ok(leadFixture);

      const evaluation = manager.isFixtureApplicableToScope(leadFixture, leadScope);
      assert.equal(evaluation.isApplicable, true);
      assert.ok(evaluation.matchedScopes.includes("amp_lead_5150"));
      assert.equal(evaluation.rejectionReason, undefined);
    });

    it("rejects off-scope fixture use with explicit diagnostic reason", () => {
      const highGainScope = createSampleScope({
        included_units: ["amp_recto_dual", "amp_lead_5150"],
      });

      // Bass DI fixture has scope ["amp_bass", "cab_bass_8x10", ...]
      const bassFixture = manager.getFixture("FIX-DI-BAS-01-v1")!;
      assert.ok(bassFixture);

      const evaluation = manager.isFixtureApplicableToScope(bassFixture, highGainScope);
      assert.equal(evaluation.isApplicable, false);
      assert.ok(evaluation.rejectionReason?.includes("Off-Scope Fixture Rejection"));
      assert.equal(evaluation.matchedScopes.length, 0);
    });
  });

  describe("4. Uncompressed PCM Audio Verification & Corrupt Header Rejection", () => {
    it("successfully validates valid 16-bit, 24-bit, and 32-bit integer PCM WAV buffers", () => {
      // 16-bit PCM
      const wav16 = createSyntheticPcmWav({
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16,
        durationSeconds: 0.1,
        signalType: "sine",
      });
      const res16 = validatePcmWavHeader(wav16);
      assert.equal(res16.valid, true);
      assert.equal(res16.spec?.bitDepth, 16);
      assert.equal(res16.spec?.sampleRate, 44100);
      assert.equal(res16.spec?.isFloat, false);
      assert.equal(res16.spec?.audioFormatCode, 1);

      // 24-bit PCM
      const wav24 = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 2,
        bitDepth: 24,
        durationSeconds: 0.1,
        signalType: "sine",
      });
      const res24 = validatePcmWavHeader(wav24);
      assert.equal(res24.valid, true);
      assert.equal(res24.spec?.bitDepth, 24);
      assert.equal(res24.spec?.channels, 2);
      assert.equal(res24.spec?.isFloat, false);
      assert.equal(res24.spec?.audioFormatCode, 1);

      // 32-bit Integer PCM
      const wav32 = createSyntheticPcmWav({
        sampleRate: 96000,
        channels: 1,
        bitDepth: 32,
        durationSeconds: 0.1,
        signalType: "chirp",
        formatCode: 1,
      });
      const res32 = validatePcmWavHeader(wav32);
      assert.equal(res32.valid, true);
      assert.equal(res32.spec?.bitDepth, 32);
      assert.equal(res32.spec?.isFloat, false);
      assert.equal(res32.spec?.audioFormatCode, 1);
    });

    it("strictly rejects IEEE Float audio format (0x0003) under frozen PCM contract", () => {
      const wavFloat = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 32,
        durationSeconds: 0.1,
        signalType: "sine",
        formatCode: 3, // IEEE float
      });
      const resFloat = validatePcmWavHeader(wavFloat);
      assert.equal(resFloat.valid, false);
      assert.ok(
        resFloat.errors.some(
          (e) =>
            e.includes("0x0003 is IEEE float") &&
            e.includes("uncompressed integer PCM (format code 0x0001)")
        )
      );
    });

    it("rejects truncated buffer (< 44 bytes)", () => {
      const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0x00]);
      const res = validatePcmWavHeader(truncated);
      assert.equal(res.valid, false);
      assert.ok(res.errors[0].includes("shorter than minimum 44-byte"));
    });

    it("rejects corrupt RIFF magic bytes", () => {
      const corrupt = createSyntheticPcmWav({ durationSeconds: 0.05 });
      corrupt[0] = 0x4e; // 'N' instead of 'R'
      corrupt[1] = 0x4f; // 'O' instead of 'I'
      const res = validatePcmWavHeader(corrupt);
      assert.equal(res.valid, false);
      assert.ok(res.errors[0].includes("missing 'RIFF' magic bytes"));
    });

    it("rejects corrupt WAVE marker", () => {
      const corrupt = createSyntheticPcmWav({ durationSeconds: 0.05 });
      corrupt[8] = 0x41; // 'A' instead of 'W'
      const res = validatePcmWavHeader(corrupt);
      assert.equal(res.valid, false);
      assert.ok(res.errors[0].includes("missing 'WAVE' format marker"));
    });

    it("rejects unsupported non-PCM compressed audio format codes", () => {
      const buffer = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const view = new DataView(buffer.buffer);
      // Change audioFormatCode to 0x0002 (ADPCM) or 0x0055 (MP3)
      view.setUint16(20, 0x0055, true);

      const res = validatePcmWavHeader(buffer);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Non-PCM audio format rejected")));
    });

    it("rejects corrupt WAV header where data chunk size exceeds physical buffer", () => {
      const buffer = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const view = new DataView(buffer.buffer);
      // Offset 40 is dataChunkSize; set it to 10 MB
      view.setUint32(40, 10000000, true);

      const res = validatePcmWavHeader(buffer);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("exceeds physical buffer length")));
    });
  });

  describe("5. Modified Audio Bits & Tamper-Evident Bit Integrity (Condition 01)", () => {
    it("computes deterministic SHA-256 over raw binary audio payload", () => {
      const audioBuffer = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 24,
        durationSeconds: 0.1,
        signalType: "sine",
      });

      const digest1 = computeSha256BytesHex(audioBuffer);
      const digest2 = computeSha256BytesHex(audioBuffer);
      assert.equal(digest1, digest2);
      assert.match(digest1, /^[0-9a-f]{64}$/);
    });

    it("verifies bit integrity when payload matches reference", () => {
      const audioBuffer = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 24,
        durationSeconds: 0.1,
      });
      const hash = `sha256:${computeSha256BytesHex(audioBuffer)}`;

      const check = verifyAudioPayloadIntegrity(audioBuffer, hash);
      assert.equal(check.valid, true);
      assert.equal(check.error, undefined);
    });

    it("rejects modified audio bits immediately (Condition 01: Invalid Test Fixture)", () => {
      const audioBuffer = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 24,
        durationSeconds: 0.1,
      });
      const originalHash = `sha256:${computeSha256BytesHex(audioBuffer)}`;

      // Flip a single bit in the audio data area
      audioBuffer[50] ^= 0x01;

      const check = verifyAudioPayloadIntegrity(audioBuffer, originalHash);
      assert.equal(check.valid, false);
      assert.ok(check.error?.includes("Audio bit integrity mismatch"));
      assert.ok(check.error?.includes("Invariant 4 violation"));
    });
  });

  describe("6. Provenance Completeness Audit (Condition 02)", () => {
    it("passes for fixtures with complete capture provenance", () => {
      const fixture = manager.getFixture("FIX-DI-CLN-01-v1")!;
      assert.ok(fixture);

      const audit = manager.auditProvenance(fixture);
      assert.equal(audit.valid, true);
      assert.equal(audit.missingFields.length, 0);
      assert.equal(audit.diagnosticMessage, undefined);
    });

    it("detects missing provenance fields and flags Condition 02", () => {
      const incompleteFixture = parseValidationFixtureRecord({
        fixture_id: "FIX-DI-NO-PROV-01",
        fixture_name: "Missing Provenance DI",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: "sha256:1111",
        declared_applicability_scope: ["amp_clean"],
        provenance_metadata: {
          // Missing instrument_details, capture_hardware, recording_engineer, capture_date
        },
        calibration_spec: "CAL_SPEC_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });

      const audit = manager.auditProvenance(incompleteFixture);
      assert.equal(audit.valid, false);
      assert.ok(audit.missingFields.includes("instrument_details"));
      assert.ok(audit.missingFields.includes("capture_hardware"));
      assert.ok(audit.missingFields.includes("recording_engineer"));
      assert.ok(audit.missingFields.includes("capture_date"));
      assert.ok(audit.diagnosticMessage?.includes("Condition 02: Fixture Provenance Missing"));
    });
  });

  describe("7. Calibration Specification Audit (Condition 03)", () => {
    it("verifies non-empty calibration_spec on fixtures", () => {
      const fixture = manager.getFixture("FIX-DI-CRN-01-v1")!;
      assert.ok(fixture);

      const audit = manager.auditCalibration(fixture);
      assert.equal(audit.valid, true);
      assert.ok(audit.calibrationSpec.length > 0);
    });

    it("rejects fixture with empty calibration spec", () => {
      const emptyCal = parseValidationFixtureRecord({
        fixture_id: "FIX-BAD-CAL",
        fixture_name: "Bad Cal",
        fixture_class: FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
        version: "v1.0",
        payload_integrity_ref: "sha256:2222",
        declared_applicability_scope: ["amp_clean"],
        provenance_metadata: {
          recording_engineer: "Test Eng",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "   ", // Whitespace only
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });

      const audit = manager.auditCalibration(emptyCal);
      assert.equal(audit.valid, false);
      assert.ok(audit.errors.length > 0);
    });
  });

  describe("8. Anti-Contamination Protocol & Invariant 4", () => {
    it("quarantines contaminated fixture and mandates full revalidation of prior passes", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

      const targetId = "FIX-DI-CLN-01-v1";
      const contaminationResult = localManager.flagContaminated(
        targetId,
        "Discovered fixture was leaked into prompt few-shot tuning set"
      );

      assert.equal(
        contaminationResult.fixture.contamination_status,
        FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED
      );
      assert.equal(
        contaminationResult.fixture.lifecycle_status,
        FIXTURE_LIFECYCLE_STATUSES.INVALIDATED
      );
      assert.equal(contaminationResult.requiresRevalidationOfPriorPasses, true);
      assert.ok(contaminationResult.quarantineReport.includes("QUARANTINE ENFORCED"));

      // Audit must reject contaminated fixture from active testing
      const audit = localManager.auditFixture(targetId);
      assert.equal(audit.isUsableForActiveTesting, false);
      assert.equal(audit.isQuarantined, true);
      assert.equal(audit.requiresRevalidationOfPriorPasses, true);
    });

    it("quarantines suspect fixture from active testing", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

      const targetId = "FIX-DI-CRN-01-v1";
      const suspectRecord = localManager.flagSuspect(
        targetId,
        "Calibration offset under review"
      );

      assert.equal(
        suspectRecord.contamination_status,
        FIXTURE_CONTAMINATION_STATUSES.SUSPECT
      );

      const audit = localManager.auditFixture(targetId);
      assert.equal(audit.isUsableForActiveTesting, false);
      assert.equal(audit.isQuarantined, true);
      assert.ok(audit.warnings.some((w) => w.includes("flagged SUSPECT")));
    });

    it("enforces Invariant 4: prohibits silent overwriting of a sealed fixture version", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

      const existing = localManager.getFixture("FIX-DI-BAS-01-v1")!;
      assert.ok(existing);

      assert.throws(
        () => {
          localManager.registerFixture({
            ...existing,
            fixture_name: "Mutated Bass Fixture", // Attempted in-place mutation
          });
        },
        FixtureImmutabilityViolationError
      );
    });
  });

  describe("9. Governed Lifecycle Management (ACTIVE -> SUPERSEDED -> RETIRED)", () => {
    it("successfully supersedes an active fixture with an approved successor", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

      const oldId = "FIX-DI-LAD-01-v1";
      const newFixtureInput = {
        fixture_id: "FIX-DI-LAD-01-v2",
        fixture_name: "High-Gain Leads (Dry DI) - v2 Re-Calibrated",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v2.0",
        payload_integrity_ref: "sha256:v2_digest_lead_di",
        declared_applicability_scope: [
          "amp_lead_5150",
          "amp_recto_dual",
          "PROFILE_04_OBJECTIVE_ACOUSTIC",
        ],
        provenance_metadata: {
          instrument_details: "ESP E-II Horizon FR, EMG 81 Bridge Active Pickup",
          capture_hardware: "Grace Design m108 (48kHz/24bit)",
          recording_engineer: "Master Sound Engineer",
          capture_date: "2026-03-25T10:00:00Z",
        },
        calibration_spec: "CAL_SPEC_DI_HI_Z_STD_0DBFS_PEAK_-14DBFS_RMS",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      };

      const result = localManager.supersedeFixture(oldId, newFixtureInput);
      assert.equal(result.success, true);
      assert.equal(result.previousStatus, FIXTURE_LIFECYCLE_STATUSES.ACTIVE);
      assert.equal(result.newStatus, FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED);
      assert.equal(result.supersedingFixtureId, "FIX-DI-LAD-01-v2");

      const oldRecord = localManager.getFixture(oldId)!;
      assert.equal(oldRecord.lifecycle_status, FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED);
      assert.equal(oldRecord.superseding_fixture_id, "FIX-DI-LAD-01-v2");

      const newRecord = localManager.getFixture("FIX-DI-LAD-01-v2")!;
      assert.equal(newRecord.lifecycle_status, FIXTURE_LIFECYCLE_STATUSES.ACTIVE);
    });

    it("retires a fixture to immutable audit archive", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });

      const targetId = "FIX-REF-STD-01-v1";
      const retResult = localManager.retireFixture(
        targetId,
        "Licensing window closed; replaced by open reference"
      );

      assert.equal(retResult.newStatus, FIXTURE_LIFECYCLE_STATUSES.RETIRED);

      const audit = localManager.auditFixture(targetId);
      assert.equal(audit.isUsableForActiveTesting, false);
      assert.ok(audit.warnings.some((w) => w.includes("RETIRED")));
    });
  });

  describe("10. Fixture Manifest Verification CLI & Tool", () => {
    it("verifies the default initial illustrative MVVI bootstrap manifest cleanly", () => {
      const manifest = createDefaultMvviCorpusManifest();
      const report = verifyFixtureManifest(manifest, { requireAllEightClasses: true });

      assert.equal(report.valid, true);
      assert.equal(report.totalFixtures, 12);
      assert.equal(report.activeCount, 12);
      assert.equal(report.cleanCount, 12);
      assert.equal(report.contaminatedCount, 0);
      assert.equal(report.suspectCount, 0);
      assert.equal(report.errors.length, 0);
    });

    it("detects manifest failure when a required fixture class is omitted", () => {
      const incompleteManifest = {
        manifestVersion: "1.0",
        createdAt: "2026-03-20T00:00:00Z",
        integrityRef: "sha256:abc",
        libraryVersion: "v1.0.0",
        fixtureCount: 1,
        fixtures: [
          {
            record: MVVI_BOOTSTRAP_FIXTURE_RECORDS[0], // Only DI_PERFORMANCE
          },
        ],
      };

      const report = verifyFixtureManifest(incompleteManifest, {
        requireAllEightClasses: true,
      });

      assert.equal(report.valid, false);
      assert.ok(
        report.errors.some((e) => e.includes("zero fixtures cataloged for frozen class"))
      );
    });
  });

  describe("11. Defect 1 Correction: Removal of Automatic Golden Bootstrap Corpus", () => {
    it("starts with exactly zero production golden fixtures when default constructor is called", () => {
      const freshManager = new FixtureCorpusManager();
      assert.equal(freshManager.countFixtures(), 0);
      assert.equal(freshManager.listFixtures().length, 0);
      assert.equal(freshManager.getFixture("FIX-DI-CLN-01-v1"), undefined);
    });

    it("ensures illustrative bootstrap records are not auto-loaded into production runtime", () => {
      const defaultManager = new FixtureCorpusManager({});
      assert.equal(defaultManager.countFixtures(), 0);
      for (const record of SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES) {
        assert.equal(defaultManager.hasFixture(record.fixture_id), false);
      }
    });

    it("requires explicit test-only invocation to populate synthetic test corpus", () => {
      const testManager = new FixtureCorpusManager({ loadBootstrapCorpus: false });
      assert.equal(testManager.countFixtures(), 0);

      // Explicit test-only invocation
      testManager.loadSyntheticTestBootstrapCorpus();
      assert.equal(testManager.countFixtures(), 12);
      assert.ok(testManager.getFixture("FIX-DI-CLN-01-v1"));

      // Isolated synthetic fixtures match
      assert.equal(
        SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES.length,
        MVVI_BOOTSTRAP_FIXTURE_RECORDS.length
      );
    });

    it("verifies no mock fixture silently qualifies as production golden evidence", () => {
      // In production mode, an empty corpus yields zero active golden fixtures
      const prodManager = new FixtureCorpusManager();
      const activeFixtures = prodManager.listFixtures({
        lifecycleStatus: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });
      assert.equal(activeFixtures.length, 0);

      // Synthetic bootstrap records are explicitly isolated and documented as test-only
      for (const record of SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES) {
        assert.ok(record.fixture_id);
      }
    });
  });

  describe("12. Defect 2 Correction: Authoritative Payload Integrity Routing Through IntegrityProvider", () => {
    it("routes raw binary audio payload hashing through IntegrityProvider without bypass", () => {
      const audioBuffer = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 24,
        durationSeconds: 0.05,
      });

      let computeCalled = false;
      let verifyCalled = false;

      const mockProvider: IntegrityProvider = {
        algorithmName: "MOCK-SHA-256",
        computeDigest(payload: unknown) {
          computeCalled = true;
          assert.ok(payload instanceof Uint8Array);
          return `mock:${computeSha256BytesHex(payload as Uint8Array)}`;
        },
        verifyDigest(payload: unknown, expectedDigest: string) {
          verifyCalled = true;
          assert.ok(payload instanceof Uint8Array);
          const computed = this.computeDigest(payload);
          return computed === expectedDigest;
        },
      };

      const digest = computePayloadDigest(audioBuffer, mockProvider);
      assert.equal(computeCalled, true);
      assert.ok(digest.startsWith("mock:"));

      const verifyResult = verifyAudioPayloadIntegrity(audioBuffer, digest, mockProvider);
      assert.equal(verifyCalled, true);
      assert.equal(verifyResult.valid, true);
    });

    it("verifies CanonicalSha256IntegrityProvider handles both binary Uint8Array and string uniformly", () => {
      const provider = new CanonicalSha256IntegrityProvider();
      assert.equal(provider.algorithmName, "SHA-256");

      const binaryPayload = new Uint8Array([1, 2, 3, 4, 5]);
      const binaryDigest = provider.computeDigest(binaryPayload);
      assert.match(binaryDigest, /^sha256:[0-9a-f]{64}$/);
      assert.equal(provider.verifyDigest(binaryPayload, binaryDigest), true);

      // Modified bits fail
      const tamperedBinary = new Uint8Array([1, 2, 3, 4, 6]);
      assert.equal(provider.verifyDigest(tamperedBinary, binaryDigest), false);

      const textPayload = "CALIBRATION_PROFILE_REF_DATA";
      const textDigest = provider.computeDigest(textPayload);
      assert.match(textDigest, /^sha256:[0-9a-f]{64}$/);
      assert.equal(provider.verifyDigest(textPayload, textDigest), true);
    });

    it("verifies deterministic byte serialization adapter works when custom provider only accepts strings", () => {
      const rawBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = bytesToDeterministicHex(rawBytes);
      assert.equal(hex, "deadbeef");

      // Provider that only accepts strings and throws if passed Uint8Array
      const stringOnlyProvider: IntegrityProvider = {
        algorithmName: "STRING-ONLY-SHA-256",
        computeDigest(payload: unknown): string {
          if (typeof payload !== "string") {
            throw new TypeError("Provider only accepts string input");
          }
          return `string-sha256:${payload}`;
        },
        verifyDigest(payload: unknown, expectedDigest: string): boolean {
          if (typeof payload !== "string") {
            throw new TypeError("Provider only accepts string input");
          }
          return `string-sha256:${payload}` === expectedDigest;
        },
      };

      // computePayloadDigest falls back to deterministic hex adapter
      const digest = computePayloadDigest(rawBytes, stringOnlyProvider);
      assert.equal(digest, "string-sha256:deadbeef");

      // verifyAudioPayloadIntegrity verifies through string adapter
      const verifyRes = verifyAudioPayloadIntegrity(rawBytes, digest, stringOnlyProvider);
      assert.equal(verifyRes.valid, true);
    });

    it("ensures zero bypass: rejecting provider verifyDigest unconditionally fails verification even with matching digest strings", () => {
      const audioBuffer = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const matchingDigest = `sha256:${computeSha256BytesHex(audioBuffer)}`;

      // A provider that always rejects (e.g. revoked key / security check failed)
      const rejectingProvider: IntegrityProvider = {
        algorithmName: "ALWAYS-FAILING",
        computeDigest(_payload: unknown): string {
          return matchingDigest;
        },
        verifyDigest(_payload: unknown, _expectedDigest: string): boolean {
          return false; // Intentionally returns false
        },
      };

      const result = verifyAudioPayloadIntegrity(audioBuffer, matchingDigest, rejectingProvider);
      assert.equal(result.valid, false, "Must fail closed if provider.verifyDigest returns false");
      assert.ok(result.error?.includes("Audio bit integrity mismatch"));
    });
  });

  describe("13. Defect 3 Correction: Governed Read-Only Payload Storage Boundary", () => {
    it("enforces two-phase payload store: writable during provisioning, strictly immutable once sealed", () => {
      const store = new InMemoryFixturePayloadStore(false);
      assert.equal(store.isReadOnlyForValidation(), false);

      const payload = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      store.provisionPayload("FIX-TEST-01", payload);
      assert.equal(store.hasPayload("FIX-TEST-01"), true);
      assert.deepEqual(store.readPayload("FIX-TEST-01"), payload);

      // Seal store
      store.seal();
      assert.equal(store.isReadOnlyForValidation(), true);

      // Mutation attempt after seal must throw FixtureStorageMutationError
      assert.throws(
        () => store.provisionPayload("FIX-TEST-02", payload),
        FixtureStorageMutationError
      );
    });

    it("verifies defensive copying: mutating retrieved payload buffer does not corrupt internal storage", () => {
      const store = new InMemoryFixturePayloadStore(false);
      const originalBytes = new Uint8Array([10, 20, 30, 40]);
      store.provisionPayload("FIX-DEF-01", originalBytes);
      store.seal();

      const retrieved1 = store.readPayload("FIX-DEF-01")!;
      assert.ok(retrieved1);
      assert.equal(retrieved1[0], 10);

      // Mutate returned array externally
      retrieved1[0] = 99;

      // Internal storage must remain uncorrupted (10)
      const retrieved2 = store.readPayload("FIX-DEF-01")!;
      assert.equal(retrieved2[0], 10, "Internal storage must remain untouched after external buffer mutation");
    });

    it("confirms validation-time interface exposes only read operations without mutation APIs", () => {
      const manager = new FixtureCorpusManager({
        loadBootstrapCorpus: false,
        isReadOnlyMount: true,
      });

      const payloadStore: FixturePayloadStore = manager.getPayloadStore();
      assert.equal(typeof payloadStore.readPayload, "function");
      assert.equal(typeof payloadStore.hasPayload, "function");
      assert.equal(typeof payloadStore.isReadOnlyForValidation, "function");
      assert.equal(payloadStore.isReadOnlyForValidation(), true);

      // Verify mutation methods are not exposed on payload store
      assert.equal((payloadStore as any).provisionPayload, undefined);
      assert.equal((payloadStore as any).seal, undefined);
      assert.equal((payloadStore as any).set, undefined);
      assert.equal((payloadStore as any).store, undefined);
      assert.equal((payloadStore as any).replace, undefined);
    });

    it("fails closed when validation operations are attempted on a non-read-only mount", () => {
      const writableManager = new FixtureCorpusManager({
        loadBootstrapCorpus: true,
        isReadOnlyMount: false, // Illegal writable validation mount
      });

      // auditFixture must fail closed and record storage governance error
      const audit = writableManager.auditFixture("FIX-DI-CLN-01-v1");
      assert.equal(audit.valid, false);
      assert.equal(audit.isUsableForActiveTesting, false);
      assert.ok(audit.errors.some((e) => e.includes("Storage Governance Failure")));

      // isFixtureUsableForTesting must also return false
      assert.equal(writableManager.isFixtureUsableForTesting("FIX-DI-CLN-01-v1"), false);

      // verifyAudioBitIntegrity must throw FixtureStorageGovernanceError
      const dummyBuffer = createSyntheticPcmWav({ durationSeconds: 0.05 });
      assert.throws(
        () => writableManager.verifyAudioBitIntegrity("FIX-DI-CLN-01-v1", dummyBuffer),
        FixtureStorageGovernanceError
      );
    });

    it("rejects storePayloadBuffer mutation during active read-only validation mount", () => {
      const readOnlyManager = new FixtureCorpusManager({
        loadBootstrapCorpus: true,
        isReadOnlyMount: true,
      });

      const audioBuffer = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const storeResult = readOnlyManager.storePayloadBuffer("FIX-DI-CLN-01-v1", audioBuffer);
      assert.equal(storeResult.valid, false);
      assert.ok(storeResult.error?.includes("READ-ONLY STORAGE ENFORCEMENT"));
    });
  });

  describe("14. Defect 4 Correction: Strict Enforcement of Uncompressed Integer PCM Contract", () => {
    it("successfully validates valid 16-bit, 24-bit, and 32-bit integer PCM WAV buffers", () => {
      const wav16 = createSyntheticPcmWav({
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16,
        durationSeconds: 0.05,
        formatCode: 1,
      });
      const res16 = validatePcmWavHeader(wav16);
      assert.equal(res16.valid, true);
      assert.equal(res16.spec?.audioFormatCode, 1);
      assert.equal(res16.spec?.isFloat, false);

      const wav24 = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 2,
        bitDepth: 24,
        durationSeconds: 0.05,
        formatCode: 1,
      });
      const res24 = validatePcmWavHeader(wav24);
      assert.equal(res24.valid, true);
      assert.equal(res24.spec?.audioFormatCode, 1);
      assert.equal(res24.spec?.isFloat, false);

      const wav32 = createSyntheticPcmWav({
        sampleRate: 96000,
        channels: 1,
        bitDepth: 32,
        durationSeconds: 0.05,
        formatCode: 1,
      });
      const res32 = validatePcmWavHeader(wav32);
      assert.equal(res32.valid, true);
      assert.equal(res32.spec?.audioFormatCode, 1);
      assert.equal(res32.spec?.isFloat, false);
    });

    it("strictly rejects IEEE Float audio format (0x0003) under frozen PCM contract", () => {
      const wavFloat = createSyntheticPcmWav({
        sampleRate: 48000,
        channels: 1,
        bitDepth: 32,
        durationSeconds: 0.05,
        formatCode: 3, // IEEE Float
      });
      const resFloat = validatePcmWavHeader(wavFloat);
      assert.equal(resFloat.valid, false);
      assert.ok(
        resFloat.errors.some(
          (e) =>
            e.includes("0x0003 is IEEE float") &&
            e.includes("uncompressed integer PCM (format code 0x0001)")
        )
      );
    });

    it("strictly rejects ADPCM format (0x0002)", () => {
      const wavAdpcm = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const view = new DataView(wavAdpcm.buffer);
      view.setUint16(20, 0x0002, true); // ADPCM
      const res = validatePcmWavHeader(wavAdpcm);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("0x2 is not uncompressed integer PCM")));
    });

    it("strictly rejects MP3-in-WAV (0x0055) and compressed codecs", () => {
      const wavMp3 = createSyntheticPcmWav({ durationSeconds: 0.05 });
      const view = new DataView(wavMp3.buffer);
      view.setUint16(20, 0x0055, true); // MP3
      const res = validatePcmWavHeader(wavMp3);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("0x55 is not uncompressed integer PCM")));
    });

    it("strictly rejects corrupt or truncated headers", () => {
      const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      const res = validatePcmWavHeader(truncated);
      assert.equal(res.valid, false);
      assert.ok(res.errors[0].includes("shorter than minimum 44-byte"));
    });
  });

  describe("15. Defect 5 Correction: Audio Validation Applied Only To Audio Fixture Classes", () => {
    it("registers and stores Approved Preset (non-audio) payload without WAV validation", () => {
      const provManager = new FixtureCorpusManager({
        loadBootstrapCorpus: false,
        isReadOnlyMount: false, // Ingestion mount
      });

      // XML preset content (not WAV)
      const xmlPresetText = "<amplitube_preset><model id='5150_lead' gain='7.5'/></amplitube_preset>";
      const xmlBytes = new TextEncoder().encode(xmlPresetText);
      const integrityRef = DEFAULT_INTEGRITY_PROVIDER.computeDigest(xmlBytes);

      const presetRecord = parseValidationFixtureRecord({
        fixture_id: "FIX-PRE-CUSTOM-01",
        fixture_name: "Custom AT5 Metal Lead Preset XML",
        fixture_class: FIXTURE_CLASSES.APPROVED_PRESET,
        version: "v1.0",
        payload_integrity_ref: integrityRef,
        declared_applicability_scope: ["at5_export", "amp_lead_5150"],
        provenance_metadata: {
          recording_engineer: "Lead DSP Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_PRESET_XML_V12",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });

      // Must succeed WITHOUT throwing "Corrupt audio header: missing 'RIFF'"
      const registered = provManager.registerFixture(presetRecord, xmlBytes);
      assert.ok(registered);
      assert.equal(registered.fixture_id, "FIX-PRE-CUSTOM-01");

      // Verify payload is stored and readable
      const retrieved = provManager.getPayloadBuffer("FIX-PRE-CUSTOM-01");
      assert.ok(retrieved);
      assert.deepEqual(retrieved, xmlBytes);
    });

    it("registers and stores Workflow & Prompt (non-audio) text/JSON payload without WAV validation", () => {
      const provManager = new FixtureCorpusManager({
        loadBootstrapCorpus: false,
        isReadOnlyMount: false,
      });

      const promptJson = JSON.stringify({
        promptId: "PRM-001",
        promptText: "Deliver a tight modern metal rhythm guitar tone inspired by Metallica Master of Puppets.",
      });
      const promptBytes = new TextEncoder().encode(promptJson);
      const integrityRef = DEFAULT_INTEGRITY_PROVIDER.computeDigest(promptBytes);

      const promptRecord = parseValidationFixtureRecord({
        fixture_id: "FIX-WRK-CUSTOM-01",
        fixture_name: "Metallica Master Rhythm Tone UAT Prompt",
        fixture_class: FIXTURE_CLASSES.WORKFLOW_PROMPT,
        version: "v1.0",
        payload_integrity_ref: integrityRef,
        declared_applicability_scope: ["tone_translator_workflow", "user_prompt_reasoning"],
        provenance_metadata: {
          recording_engineer: "Lead UX Researcher",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_UAT_PROMPT_SUITE_V1",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });

      // Must succeed WITHOUT WAV header validation
      const registered = provManager.registerFixture(promptRecord, promptBytes);
      assert.ok(registered);
      assert.equal(registered.fixture_id, "FIX-WRK-CUSTOM-01");
    });

    it("still strictly enforces PCM WAV validation for audio fixture classes", () => {
      const provManager = new FixtureCorpusManager({
        loadBootstrapCorpus: false,
        isReadOnlyMount: false,
      });

      // Invalid audio payload (plain text bytes instead of WAV)
      const fakeAudioText = "This is not a WAV file";
      const fakeBytes = new TextEncoder().encode(fakeAudioText);
      const integrityRef = DEFAULT_INTEGRITY_PROVIDER.computeDigest(fakeBytes);

      const audioRecord = parseValidationFixtureRecord({
        fixture_id: "FIX-DI-INVALID-01",
        fixture_name: "Corrupt Audio DI Stem",
        fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
        version: "v1.0",
        payload_integrity_ref: integrityRef,
        declared_applicability_scope: ["amp_clean"],
        provenance_metadata: {
          recording_engineer: "Sound Engineer",
          capture_date: "2026-03-01T00:00:00Z",
        },
        calibration_spec: "CAL_SPEC_DI_HI_Z_STD",
        contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
        lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
      });

      // Registering invalid audio payload into DI_PERFORMANCE must fail with audio header validation failure
      assert.throws(
        () => provManager.registerFixture(audioRecord, fakeBytes),
        /audio header validation failed/
      );
    });

    it("verifies non-audio fixtures still strictly enforce integrity, provenance, calibration, and applicability", () => {
      const provManager = new FixtureCorpusManager({
        loadBootstrapCorpus: false,
        isReadOnlyMount: false,
      });

      const promptBytes = new TextEncoder().encode("VALID_PROMPT_DATA");
      const badIntegrityRef = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

      // 1. Bit integrity mismatch on non-audio fixture must throw
      assert.throws(
        () =>
          provManager.registerFixture(
            {
              fixture_id: "FIX-WRK-BAD-INTEG",
              fixture_name: "Bad Integrity Prompt",
              fixture_class: FIXTURE_CLASSES.WORKFLOW_PROMPT,
              version: "v1.0",
              payload_integrity_ref: badIntegrityRef,
              declared_applicability_scope: ["tone_translator_workflow"],
              provenance_metadata: {
                recording_engineer: "Author",
                capture_date: "2026-03-01T00:00:00Z",
              },
              calibration_spec: "CAL_SPEC_PROMPT_V1",
              contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
              lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
            },
            promptBytes
          ),
        /payload integrity verification failed/
      );

      // 2. Empty declared applicability scope must throw
      const validRef = DEFAULT_INTEGRITY_PROVIDER.computeDigest(promptBytes);
      assert.throws(
        () =>
          provManager.registerFixture(
            {
              fixture_id: "FIX-WRK-NO-SCOPE",
              fixture_name: "No Scope Prompt",
              fixture_class: FIXTURE_CLASSES.WORKFLOW_PROMPT,
              version: "v1.0",
              payload_integrity_ref: validRef,
              declared_applicability_scope: [],
              provenance_metadata: {
                recording_engineer: "Author",
                capture_date: "2026-03-01T00:00:00Z",
              },
              calibration_spec: "CAL_SPEC_PROMPT_V1",
              contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
              lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
            },
            promptBytes
          ),
        /declared_applicability_scope must not be empty/
      );
    });

    it("verifies manifest generator assigns class-appropriate file extensions and omits audioSpec for non-audio classes", () => {
      const manifest = createDefaultMvviCorpusManifest();

      const presetEntry = manifest.fixtures.find(
        (f) => f.record.fixture_class === FIXTURE_CLASSES.APPROVED_PRESET
      );
      assert.ok(presetEntry);
      assert.ok(presetEntry.relativeFilePath?.endsWith(".xml"));
      assert.equal(presetEntry.audioSpec, undefined);

      const promptEntry = manifest.fixtures.find(
        (f) => f.record.fixture_class === FIXTURE_CLASSES.WORKFLOW_PROMPT
      );
      assert.ok(promptEntry);
      assert.ok(promptEntry.relativeFilePath?.endsWith(".json"));
      assert.equal(promptEntry.audioSpec, undefined);

      const audioEntry = manifest.fixtures.find(
        (f) => f.record.fixture_class === FIXTURE_CLASSES.DI_PERFORMANCE
      );
      assert.ok(audioEntry);
      assert.ok(audioEntry.relativeFilePath?.endsWith(".wav"));
      assert.ok(audioEntry.audioSpec);
      assert.equal(audioEntry.audioSpec.sampleRate, 48000);
    });
  });

  describe("16. Preserved Invariant 4 & Boundary Discipline: Quarantine & Revalidation Directives", () => {
    it("emits governed FixtureRevalidationDirective with TRIGGER-06 when fixture is contaminated", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });
      const targetId = "FIX-DI-CLN-01-v1";

      const result = localManager.flagContaminated(
        targetId,
        "Leaked into prompt few-shot tuning set"
      );

      assert.equal(result.isQuarantined, true);
      assert.equal(result.requiresRevalidationOfPriorPasses, true);
      assert.equal(
        result.revalidationDirective.triggerSource,
        "TRIGGER-06_FIXTURE_RECALIBRATION_CONTAMINATION"
      );
      assert.equal(result.revalidationDirective.fixtureId, targetId);
      assert.ok(result.revalidationDirective.affectedScope.includes("amp_clean"));

      const directives = localManager.getRevalidationDirectives();
      assert.equal(directives.length, 1);
      assert.equal(directives[0].fixtureId, targetId);

      const quarantined = localManager.getQuarantinedFixtures();
      assert.ok(quarantined.some((f) => f.fixture_id === targetId));

      assert.equal(localManager.isFixtureUsableForTesting(targetId), false);
    });

    it("emits governed FixtureRevalidationDirective and enforces quarantine when fixture is suspect", () => {
      const localManager = new FixtureCorpusManager({ loadBootstrapCorpus: true });
      const targetId = "FIX-DI-CRN-01-v1";

      const result = localManager.flagSuspect(
        targetId,
        "Level calibration disputed by external lab"
      );

      assert.equal(result.isQuarantined, true);
      assert.equal(result.requiresRevalidationOfPriorPasses, true);
      assert.equal(
        result.revalidationDirective.triggerSource,
        "TRIGGER-06_FIXTURE_RECALIBRATION_CONTAMINATION"
      );
      assert.equal(result.revalidationDirective.fixtureId, targetId);

      assert.equal(localManager.isFixtureUsableForTesting(targetId), false);
    });
  });
});
