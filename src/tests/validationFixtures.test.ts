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
import {
  parseValidationFixtureRecord,
  ValidationScopeRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  computePayloadDigest,
  computeSha256BytesHex,
  createDefaultMvviCorpusManifest,
  createSyntheticPcmWav,
  FixtureCorpusManager,
  FixtureImmutabilityViolationError,
  MVVI_BOOTSTRAP_FIXTURE_RECORDS,
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
    it("successfully validates valid 16-bit, 24-bit, and 32-bit float PCM WAV buffers", () => {
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

      // 32-bit Float PCM
      const wav32 = createSyntheticPcmWav({
        sampleRate: 96000,
        channels: 1,
        bitDepth: 32,
        durationSeconds: 0.1,
        signalType: "chirp",
      });
      const res32 = validatePcmWavHeader(wav32);
      assert.equal(res32.valid, true);
      assert.equal(res32.spec?.bitDepth, 32);
      assert.equal(res32.spec?.isFloat, true);
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
});
