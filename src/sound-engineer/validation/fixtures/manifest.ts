// src/sound-engineer/validation/fixtures/manifest.ts
// Canonical initial illustrative MVVI bootstrap fixture corpus catalog.
// Bound to frozen specification v0.1j Section 18, Table 08, and Section 5.

import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  type FixtureClass,
} from "../schemas/enums";
import {
  parseValidationFixtureRecord,
  type ValidationFixtureRecord,
} from "../schemas/records";
import {
  DEFAULT_INTEGRITY_PROVIDER,
  isAudioFixtureClass,
} from "./audioVerification";
import {
  type FixtureCorpusManifest,
  type FixtureManifestEntry,
} from "./types";

/**
 * Standard semantic version for the initial illustrative MVVI bootstrap fixture corpus.
 */
export const MVVI_FIXTURE_CORPUS_VERSION = "v1.0.0-mvvi-bootstrap";

/**
 * Computes deterministic integrity reference using the authoritative IntegrityProvider.
 */
function computeTextPayloadDigest(text: string): string {
  return DEFAULT_INTEGRITY_PROVIDER.computeDigest(text);
}

/**
 * ISOLATED SYNTHETIC TEST-ONLY MVVI BOOTSTRAP FIXTURE RECORDS.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION (Section 18, Invariant 4):
 * "A TEST FIXTURE IS NOT AUTOMATICALLY PRODUCTION GOLDEN EVIDENCE."
 * "MVVI MEMBERSHIP DOES NOT AUTOMATICALLY CONFER GOLDEN-FIXTURE STATUS."
 *
 * These records represent isolated synthetic test-only fixtures used exclusively for automated tests,
 * taxonomy coverage verification, and harness testing.
 * They are NOT registered into production/runtime state by default, and must never be conflated
 * with real, physical, hardware-calibrated Golden Acoustic Evidence.
 */
export const SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES: readonly ValidationFixtureRecord[] = [
  // 1. DI_PERFORMANCE - Clean Chords
  parseValidationFixtureRecord({
    fixture_id: "FIX-DI-CLN-01-v1",
    fixture_name: "Clean Chords (Dry DI) - Stratocaster Vintage '61",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_RAW_DI_STEM_CLEAN_CHORDS_STRAT_VINTAGE_61_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_clean",
      "cab_vintage",
      "eq_parametric",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
      "PROFILE_06_PERCEPTUAL_LISTENING",
      "PROFILE_07_PLAYABILITY",
    ],
    provenance_metadata: {
      instrument_details:
        "Fender American Vintage II 1961 Stratocaster (Alder/Rosewood), Pure Vintage '61 Single-Coil Neck, D'Addario EXL110 (10-46)",
      capture_hardware:
        "Rupert Neve RNDI Active Transformer DI -> Prism Sound Titan Converter (48kHz/24bit)",
      recording_engineer: "Chief Sound Engineer (Validated Tracking Room A)",
      capture_date: "2026-03-15T14:30:00Z",
    },
    calibration_spec: "CAL_SPEC_DI_HI_Z_STD_0DBFS_PEAK_-18DBFS_RMS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 1. DI_PERFORMANCE - Crunch Rhythms
  parseValidationFixtureRecord({
    fixture_id: "FIX-DI-CRN-01-v1",
    fixture_name: "Crunch Rhythms (Dry DI) - Les Paul '59 Humbucker",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_RAW_DI_STEM_CRUNCH_RHYTHM_LP59_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_crunch",
      "amp_british_plexi",
      "cab_4x12",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
      "PROFILE_05_DYNAMIC_RESPONSE",
      "PROFILE_06_PERCEPTUAL_LISTENING",
    ],
    provenance_metadata: {
      instrument_details:
        "Gibson Custom 1959 Les Paul Standard (Mahogany/Maple), CustomBucker Bridge, Ernie Ball Slinky (10-46)",
      capture_hardware:
        "Radial JDV Mk5 Class-A Active DI -> Grace Design m108 (48kHz/24bit)",
      recording_engineer: "Senior Sound Engineer (Tracking Room B)",
      capture_date: "2026-03-16T11:00:00Z",
    },
    calibration_spec: "CAL_SPEC_DI_HI_Z_STD_0DBFS_PEAK_-16DBFS_RMS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 1. DI_PERFORMANCE - High-Gain Leads
  parseValidationFixtureRecord({
    fixture_id: "FIX-DI-LAD-01-v1",
    fixture_name: "High-Gain Leads (Dry DI) - Active EMG 81",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_RAW_DI_STEM_HIGH_GAIN_LEADS_EMG81_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_high_gain",
      "amp_lead_5150",
      "amp_recto_dual",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
      "PROFILE_05_DYNAMIC_RESPONSE",
      "PROFILE_07_PLAYABILITY",
    ],
    provenance_metadata: {
      instrument_details:
        "ESP E-II Horizon FR, EMG 81 Bridge Active Pickup, D'Addario NYXL (10-52, Drop D)",
      capture_hardware:
        "Countryman Type 85 Active DI -> Universal Audio Apollo x8p (48kHz/24bit)",
      recording_engineer: "Master Sound Engineer (Studio High-Gain Lab)",
      capture_date: "2026-03-17T16:45:00Z",
    },
    calibration_spec: "CAL_SPEC_DI_HI_Z_STD_0DBFS_PEAK_-14DBFS_RMS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 1. DI_PERFORMANCE - Bass Lines
  parseValidationFixtureRecord({
    fixture_id: "FIX-DI-BAS-01-v1",
    fixture_name: "Bass Lines (Dry DI) - '60s Precision Bass",
    fixture_class: FIXTURE_CLASSES.DI_PERFORMANCE,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_RAW_DI_STEM_BASS_LINES_P_BASS_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_bass",
      "cab_bass_8x10",
      "compressor_bass",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
      "PROFILE_05_DYNAMIC_RESPONSE",
    ],
    provenance_metadata: {
      instrument_details:
        "Fender American Original '60s Precision Bass (Alder/Rosewood), Pure Vintage '63 Split-Coil, La Bella 760FS Flatwounds",
      capture_hardware:
        "A-Designs REDDI Tube Direct Box -> API 312 Preamp -> Burl Mothership (48kHz/24bit)",
      recording_engineer: "Senior Bass Tracking Specialist",
      capture_date: "2026-03-18T10:15:00Z",
    },
    calibration_spec: "CAL_SPEC_DI_HI_Z_STD_0DBFS_PEAK_-12DBFS_RMS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 2. REFERENCE_TONE
  parseValidationFixtureRecord({
    fixture_id: "FIX-REF-STD-01-v1",
    fixture_name: "Studio Commercial Reference Tone - Classic British Crunch",
    fixture_class: FIXTURE_CLASSES.REFERENCE_TONE,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_REFERENCE_COMMERCIAL_STUDIO_BRITISH_CRUNCH_STEM_96K_24B"
    ),
    declared_applicability_scope: [
      "amp_british_plexi",
      "cab_greenback_4x12",
      "PROFILE_06_PERCEPTUAL_LISTENING",
      "PROFILE_09_REGRESSION",
    ],
    provenance_metadata: {
      instrument_details: "Commercial multi-track master isolated guitar stem",
      capture_hardware:
        "Abbey Road Studios EMI TG12345 Console -> Studer A800 2-inch tape transfer (96kHz/24bit)",
      recording_engineer: "Governed Rights & Provenance Audio Custodian",
      capture_date: "2026-01-10T09:00:00Z",
    },
    calibration_spec: "CAL_SPEC_REF_TONE_NAB_ALIGNED_-18DBFS_RMS",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 3. APPROVED_PRESET
  parseValidationFixtureRecord({
    fixture_id: "FIX-PRS-APP-01-v1",
    fixture_name: "Approved Stage 12 Baseline Preset Benchmark",
    fixture_class: FIXTURE_CLASSES.APPROVED_PRESET,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_PRESET_AT5_VERIFIED_GOLDEN_LEAD_SOLO_XML"
    ),
    declared_applicability_scope: [
      "at5_export",
      "stage_12_platform_translation",
      "PROFILE_03_TARGET_PLATFORM_EXPORT",
    ],
    provenance_metadata: {
      instrument_details: "Verified AmpliTube 5 XML preset payload",
      capture_hardware: "IK Multimedia AmpliTube 5.11 Engine Validation Host",
      recording_engineer: "Lead Platform Integration Engineer",
      capture_date: "2026-02-01T12:00:00Z",
    },
    calibration_spec: "CAL_SPEC_PRESET_XML_V12_PARITY_SPEC",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 4. RENDERED_PLATFORM_BENCHMARK
  parseValidationFixtureRecord({
    fixture_id: "FIX-RN-PLT-01-v1",
    fixture_name: "Rendered Physical Amp & Cab Platform Benchmark",
    fixture_class: FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_RENDERED_BENCHMARK_PHYSICAL_5150_V30_SM57_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_lead_5150",
      "cab_4x12",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
      "PROFILE_09_REGRESSION",
    ],
    provenance_metadata: {
      instrument_details:
        "Physical 5150 Block Letter Head, 4x12 Celestion V30, Shure SM57 Cap-Edge",
      capture_hardware:
        "Physical Tube Amp Rig -> Two Notes Torpedo Captor X -> Neve 1073 -> Lynx Aurora(n)",
      recording_engineer: "Acoustic Benchmark Calibration Engineer",
      capture_date: "2026-02-15T15:20:00Z",
    },
    calibration_spec: "CAL_SPEC_ANALOG_SPL_100DB_AT_1M_CALIBRATED",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 5. SYNTHETIC_TEST_SIGNAL - Pure Sine 1 kHz
  parseValidationFixtureRecord({
    fixture_id: "FIX-SYN-SIN-01-v1",
    fixture_name: "Pure Sine 1 kHz Calibrated Test Signal",
    fixture_class: FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_SYNTHETIC_SINE_1000HZ_0DBFS_PEAK_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_models",
      "gain_staging",
      "thd_measurement",
      "PROFILE_02_DETERMINISTIC_PARAMETER",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
    ],
    provenance_metadata: {
      instrument_details: "Pure mathematical 1000 Hz sinusoidal waveform",
      capture_hardware: "Deterministic 64-bit IEEE float synthesis generator",
      recording_engineer: "DSP Verification Architect",
      capture_date: "2026-01-01T00:00:00Z",
    },
    calibration_spec: "CAL_SPEC_SYNTH_0DBFS_PEAK_1000HZ",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 5. SYNTHETIC_TEST_SIGNAL - Log Chirp (20 Hz - 20 kHz)
  parseValidationFixtureRecord({
    fixture_id: "FIX-SYN-CHP-01-v1",
    fixture_name: "Logarithmic Frequency Sweep (20 Hz - 20 kHz)",
    fixture_class: FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_SYNTHETIC_LOG_CHIRP_20HZ_20000HZ_MINUS6DBFS_48K_24B"
    ),
    declared_applicability_scope: [
      "amp_models",
      "cab_models",
      "eq_modules",
      "frequency_response",
      "PROFILE_04_OBJECTIVE_ACOUSTIC",
    ],
    provenance_metadata: {
      instrument_details: "Logarithmic sine sweep from 20 Hz to 20000 Hz",
      capture_hardware: "Deterministic 64-bit IEEE float synthesis generator",
      recording_engineer: "DSP Verification Architect",
      capture_date: "2026-01-01T00:00:00Z",
    },
    calibration_spec: "CAL_SPEC_SYNTH_-6DBFS_PEAK_LOG_SWEEP",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 6. MULTITRACK_CONTEXT
  parseValidationFixtureRecord({
    fixture_id: "FIX-MLT-CTX-01-v1",
    fixture_name: "Multitrack Rhythm Section Context Stem (Drums & Bass)",
    fixture_class: FIXTURE_CLASSES.MULTITRACK_CONTEXT,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_MULTITRACK_RHYTHM_SECTION_DRUMS_BASS_48K_24B"
    ),
    declared_applicability_scope: [
      "mix_context",
      "vocal_masking",
      "bass_pocket",
      "PROFILE_08_MIX_CONTEXT",
    ],
    provenance_metadata: {
      instrument_details: "Acoustic drum kit and bass guitar isolated stem group",
      capture_hardware:
        "SSL 4000E Console -> Pro Tools Ultimate HDX (48kHz/24bit)",
      recording_engineer: "Studio Mixing Engineer",
      capture_date: "2026-02-20T17:00:00Z",
    },
    calibration_spec: "CAL_SPEC_MULTITRACK_VU_ZERO_ALIGNED",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 7. ADVERSARIAL_PATHOLOGICAL
  parseValidationFixtureRecord({
    fixture_id: "FIX-ADV-CLP-01-v1",
    fixture_name: "Adversarial Pathological Signal (+6 dBFS Clip & DC Offset)",
    fixture_class: FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_ADVERSARIAL_CLIPPED_PLUS_6DBFS_50MV_DC_OFFSET_60HZ_HUM_48K"
    ),
    declared_applicability_scope: [
      "signal_intake",
      "input_clipping",
      "dc_offset",
      "PROFILE_12_ADVERSARIAL_EDGE_CASE",
    ],
    provenance_metadata: {
      instrument_details:
        "Pathological +6 dBFS digitally clipped signal with 50mV DC offset and 60Hz hum",
      capture_hardware:
        "Stress Testing Signal Generator -> Audio Precision APx555",
      recording_engineer: "Adversarial Robustness QA Engineer",
      capture_date: "2026-03-01T08:30:00Z",
    },
    calibration_spec: "CAL_SPEC_ADVERSARIAL_PLUS_6DBFS_HARSH_CLIP",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),

  // 8. WORKFLOW_PROMPT
  parseValidationFixtureRecord({
    fixture_id: "FIX-WRK-PRM-01-v1",
    fixture_name: "Standardized UAT Prompt Set Benchmark (50 Tones)",
    fixture_class: FIXTURE_CLASSES.WORKFLOW_PROMPT,
    version: "v1.0",
    payload_integrity_ref: computeTextPayloadDigest(
      "PAYLOAD_UAT_PROMPT_SET_50_GOVERNED_GENRE_REQUESTS_CORPUS"
    ),
    declared_applicability_scope: [
      "tone_translator_workflow",
      "user_prompt_reasoning",
      "PROFILE_14_USER_WORKFLOW_UAT",
    ],
    provenance_metadata: {
      instrument_details:
        "Curated suite of 50 standardized natural language guitar tone requests",
      capture_hardware: "Phase 1C.5h UAT Benchmark Test Corpus",
      recording_engineer: "Lead User Experience Researcher",
      capture_date: "2026-03-05T13:00:00Z",
    },
    calibration_spec: "CAL_SPEC_UAT_PROMPT_SUITE_V1",
    contamination_status: FIXTURE_CONTAMINATION_STATUSES.CLEAN,
    lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.ACTIVE,
  }),
];

/**
 * @deprecated Use SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES. Isolated synthetic test-only fixtures for automated test suites.
 */
export const MVVI_BOOTSTRAP_FIXTURE_RECORDS: readonly ValidationFixtureRecord[] =
  SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES;

/**
 * Creates the canonical initial illustrative MVVI bootstrap fixture corpus manifest.
 * Assigns class-appropriate file extensions (.xml for presets, .json for prompts, .wav for audio stems)
 * and omits audioSpec for non-audio fixture classes (Defect 5).
 */
export function createDefaultMvviCorpusManifest(): FixtureCorpusManifest {
  const entries: FixtureManifestEntry[] = MVVI_BOOTSTRAP_FIXTURE_RECORDS.map((record) => {
    const isAudio = isAudioFixtureClass(record.fixture_class);
    let extension = "wav";
    if (record.fixture_class === FIXTURE_CLASSES.APPROVED_PRESET) {
      extension = "xml";
    } else if (record.fixture_class === FIXTURE_CLASSES.WORKFLOW_PROMPT) {
      extension = "json";
    }

    return {
      record,
      relativeFilePath: `fixtures/${record.fixture_id}.${extension}`,
      audioSpec: isAudio
        ? {
            sampleRate: 48000,
            channels: 1,
            bitDepth: 24,
          }
        : undefined,
    };
  });

  const compositeDigest = computeTextPayloadDigest(
    entries.map((e) => `${e.record.fixture_id}:${e.record.payload_integrity_ref}`).join("|")
  );

  return {
    manifestVersion: "1.0",
    createdAt: "2026-03-20T00:00:00Z",
    integrityRef: compositeDigest,
    libraryVersion: MVVI_FIXTURE_CORPUS_VERSION,
    fixtureCount: entries.length,
    fixtures: entries,
  };
}
