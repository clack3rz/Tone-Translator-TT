// src/sound-engineer/validation/profiles/profileDefinitions.ts
// The exact fourteen canonical TestProfileRecord templates for Phase 1C.5h.
// Bound to frozen specification v0.1j Section 13.2, Table 05, and Table 07.

import { deepFreeze } from "../../contracts/immutability";
import {
  FIXTURE_CLASSES,
  TEST_PROFILE_FAMILIES,
} from "../schemas/enums";
import {
  TestProfileRecord,
  testProfileRecordSchema,
} from "../schemas/records";

/**
 * Raw definitions of the fourteen canonical TestProfileRecord templates.
 * All tolerance_criteria_spec values use version-bound references (NEVER universal hardcoded numbers).
 */
const RAW_PROFILES = [
  // ---------------------------------------------------------------------------
  // PROFILE-01: STRUCTURAL / SCHEMA PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-01",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
    target_component_class: "Serialization, parameter remapping, catalog imports, configuration",
    required_analyses: [
      "schema_conformance_check",
      "xml_well_formedness_check",
      "parameter_bound_clamping_check",
      "datatype_validation_check",
      "enum_validity_check",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:structural_schema_zero_error",
    applicability_rules: [
      "Table 05: Mandatory for Preset Exporter, Rule Engine, Parameter Remapping, Configuration",
      "Table 05: Optional for Pure Audio Stems",
      "Section 13.2: Focus on schema conformance, XML well-formedness, parameter bound clamping, datatype validation, enum validity",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-02: DETERMINISTIC PARAMETER PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-02",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER,
    target_component_class: "Deterministic transformation rules, gain-staging calculators, tone-stack math",
    required_analyses: [
      "mathematical_correctness_verification",
      "algorithmic_transfer_function_analysis",
      "linear_logarithmic_conversion_check",
      "parameter_continuity_audit",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:deterministic_parameter_precision",
    applicability_rules: [
      "Table 05: Mandatory for Normalizer, Gain Calculator, Tone-Stack Math",
      "Table 05: Optional for Subjective Tone Prompts",
      "Section 13.2: Focus on mathematical correctness, algorithmic transfer functions, linear/logarithmic conversions, parameter continuity",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-03: TARGET-PLATFORM EXPORT PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-03",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT,
    target_component_class: "Stage 12 platform translation, preset exporters, platform packaging",
    required_analyses: [
      "target_platform_preset_import_check",
      "parameter_id_integrity_audit",
      "gear_substitution_legality_verification",
      "gui_rendering_integrity_check",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:target_platform_export_zero_error",
    applicability_rules: [
      "Table 05: Mandatory for Serializer, Exporter, Stage 12 Translation",
      "Table 05: Optional for Raw Prompt Reasoning",
      "Section 13.2: Focus on successful target-platform preset import, parameter ID integrity, gear substitution legality, GUI rendering without error",
      "Table 12: Invariant 8 Hard Blocker if export fails",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-04: OBJECTIVE ACOUSTIC PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-04",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC,
    target_component_class: "Amplifier models, cabinet emulations, EQ modules, analog saturation algorithms",
    required_analyses: [
      "multi_band_spectral_magnitude_analysis",
      "thd_harmonic_distortion_measurement",
      "phase_coherence_analysis",
      "noise_floor_measurement",
      "frequency_response_delta_analysis",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
      FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:acoustic_profile_tolerance",
    applicability_rules: [
      "Table 05: Mandatory for Amp Models, Cab Emulators, EQ Modules, Analog Saturation Algorithms",
      "Table 05: Optional for UI Workflow Controls",
      "Section 13.2: Focus on multi-band spectral magnitude, harmonic distortion / THD, phase coherence, noise floor, frequency-response deltas",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-05: DYNAMIC RESPONSE PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-05",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE,
    target_component_class: "Overdrive/distortion stages, power-amp sag, compressor modules, gate logic",
    required_analyses: [
      "compression_envelope_measurement",
      "transient_attack_preservation_analysis",
      "sustain_decay_curve_analysis",
      "crest_factor_measurement",
      "velocity_sensitivity_audit",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:dynamic_budget_spec",
    applicability_rules: [
      "Table 05: Mandatory for Overdrives, Compressors, Gates, Power-Amp Sag",
      "Table 05: Optional for Static Clean EQ",
      "Section 13.2: Focus on compression envelope, transient attack preservation, sustain decay curve, crest factor, velocity sensitivity",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-06: PERCEPTUAL LISTENING PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-06",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING,
    target_component_class: "Complete guitar tones, cabinet IR selections, EQ curves, core sound engineering algorithms",
    required_analyses: [
      "tonal_balance_evaluation",
      "musical_warmth_assessment",
      "harshness_detection",
      "presence_evaluation",
      "mid_range_punch_analysis",
      "listening_fatigue_audit",
      "blind_listening_mushra_abx",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:perceptual_evaluation_rating_profile",
    applicability_rules: [
      "Table 05: Mandatory for All Core Guitar Presets, Complete Guitar Tones, Cabinet IR Selection",
      "Table 05: Optional for Deterministic Serializers",
      "Section 13.2: Focus on expert human evaluation of tonal balance, musical warmth, harshness, presence, mid-range punch, listening fatigue",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-07: PLAYABILITY PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-07",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY,
    target_component_class: "Live guitar emulation, interactive DSP, real-time input conditioning",
    required_analyses: [
      "performing_guitarist_feel_assessment",
      "pick_attack_response_evaluation",
      "latency_budget_verification",
      "dynamic_interaction_analysis",
      "volume_rolloff_cleanup_evaluation",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:latency_budget_ref",
    applicability_rules: [
      "Table 05: Mandatory for Live DSP Models, Amp Emulators, Interactive Guitar Emulation",
      "Table 05: Optional for Batch Offline Exporters",
      "Section 13.2: Focus on performing guitarist feel, pick response, latency within declared latency_budget_ref, dynamic interaction, volume roll-off cleanup",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-08: MIX-CONTEXT PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-08",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT,
    target_component_class: "Final mix presets, studio mastering chains, multi-mic blend reasoning",
    required_analyses: [
      "multitrack_mix_behavior_analysis",
      "bass_masking_detection",
      "vocal_frequency_separation_audit",
      "cymbal_harshness_interaction_check",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.MULTITRACK_CONTEXT,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.APPROVED_PRESET,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:mix_context_masking_tolerance",
    applicability_rules: [
      "Table 05: Mandatory for Studio Mix Presets, Multitracks, Final Mix Presets, Multi-Mic Blend Reasoning",
      "Table 05: Optional for Isolated Instrument DIs",
      "Section 13.2: Focus on tonal behavior in full multitrack mix, bass masking, vocal frequency separation, cymbal harshness interaction",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-09: REGRESSION PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-09",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_09_REGRESSION,
    target_component_class: "All migrated components replacing existing legacy production heuristics",
    required_analyses: [
      "tripartite_differential_comparison",
      "path_prod_divergence_analysis",
      "genuine_regression_isolation",
      "regression_materiality_scoring",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.REFERENCE_TONE,
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:regression_tolerance_profile",
    applicability_rules: [
      "Table 05: Mandatory for All Migrated Components Replacing Existing Legacy Production Heuristics",
      "Table 05: Optional for Completely Novel Gear with No Legacy Production Predecessor",
      "Section 13.2: Focus on differential tripartite comparison against PATH-PROD and reference benchmarks; isolation of genuine regressions",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-10: OPERATIONAL STABILITY PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-10",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_10_OPERATIONAL_STABILITY,
    target_component_class: "Runtime DSP engine, background shadow execution pipelines, export batch services",
    required_analyses: [
      "host_resource_consumption_audit",
      "continuous_rendering_memory_stability_check",
      "buffer_underrun_overrun_monitoring",
      "thread_safety_concurrency_audit",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
      FIXTURE_CLASSES.DI_PERFORMANCE,
      FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:operational_budget_ref",
    applicability_rules: [
      "Table 05: Mandatory for DSP Engine, Execution Pipelines, Background Shadow Execution, Export Batch Services",
      "Table 05: Optional for Static Heuristic Rules",
      "Section 13.2: Focus on host resource consumption, memory stability under continuous audio rendering, buffer underrun/overrun resistance, thread safety",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-11: ROLLBACK PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-11",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK,
    target_component_class: "All production-cutover candidate deployments",
    required_analyses: [
      "automated_rollback_execution_test",
      "state_recovery_speed_measurement",
      "zero_downtime_reversion_verification",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:recovery_objective_ref",
    applicability_rules: [
      "Table 05: Mandatory for All Deployment Candidates / Production-Cutover Candidates (Mandatory for Gate 8 Consideration)",
      "Table 05: Optional for Pre-Handoff Prototypes, Isolated Schema Utilities, Local Tests",
      "Section 13.2: Focus on pre-cutover automated rollback execution under load, state recovery speed within recovery_objective_ref, zero-downtime reversion",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-12: ADVERSARIAL / EDGE-CASE PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-12",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_12_ADVERSARIAL_EDGE_CASE,
    target_component_class: "All user-facing, platform-facing, or signal-intake modules",
    required_analyses: [
      "degraded_input_tolerance_test",
      "extreme_signal_level_handling_check",
      "extreme_input_impedance_audit",
      "contradictory_prompt_resilience_test",
      "corrupt_payload_xml_handling_check",
      "pathological_boundary_condition_test",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL,
      FIXTURE_CLASSES.WORKFLOW_PROMPT,
      FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:adversarial_resilience_criteria",
    applicability_rules: [
      "Table 05: Mandatory for Signal Intake, Exporter, UI, User-Facing, Platform-Facing Modules",
      "Table 05: Optional for Internal Protected Math",
      "Section 13.2: Focus on degraded inputs, extreme signal levels, unusual impedances, contradictory user prompts, corrupt platform payload/XML",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-13: TRACEABILITY / GOVERNANCE PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-13",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_13_TRACEABILITY_GOVERNANCE,
    target_component_class: "All AI Sound Engineer reasoning runs; audit compliance verification",
    required_analyses: [
      "run_trace_completeness_audit",
      "tamper_evident_integrity_seal_check",
      "causal_reasoning_step_justification_audit",
      "audit_compliance_verification",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.WORKFLOW_PROMPT,
      FIXTURE_CLASSES.APPROVED_PRESET,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:governance_audit_compliance_standard",
    applicability_rules: [
      "Table 05: Mandatory for All AI Reasoning Runs, Governance and Audit Verification",
      "Table 05: Optional for Deterministic C++ DSP",
      "Section 13.2: Focus on Phase 1C.5f RunTrace completeness, tamper-evident record integrity metadata, causal reasoning step justification",
    ],
  },

  // ---------------------------------------------------------------------------
  // PROFILE-14: USER-WORKFLOW / UAT PROFILE
  // ---------------------------------------------------------------------------
  {
    profile_id: "PROFILE-14",
    profile_family: TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT,
    target_component_class: "End-to-end Tone Translator user workflows, UI controls, preset discovery",
    required_analyses: [
      "persona_task_completion_audit",
      "workflow_satisfaction_measurement",
      "cognitive_friction_evaluation",
      "musical_fitness_workflow_verdict",
    ],
    applicable_fixture_classes: [
      FIXTURE_CLASSES.WORKFLOW_PROMPT,
      FIXTURE_CLASSES.APPROVED_PRESET,
      FIXTURE_CLASSES.REFERENCE_TONE,
    ],
    tolerance_criteria_spec: "tolerance_spec_ref:persona_workflow_acceptance_criteria",
    applicability_rules: [
      "Table 05: Mandatory for Full Application UI & Workflows, End-to-End User Workflows, Preset Discovery",
      "Table 05: Optional for Standalone Micro-Services, Internal Deterministic Utilities",
      "Section 13.2: Focus on end-to-end task completion by real-world personas (Recording Engineer, Session Guitarist, Producer, Preset Architect)",
    ],
  },
];

/**
 * Validated, deeply frozen canonical profile templates.
 * Exactly 14 profiles in canonical order (PROFILE-01 through PROFILE-14).
 */
export const CANONICAL_TEST_PROFILES: ReadonlyArray<TestProfileRecord> = deepFreeze(
  RAW_PROFILES.map((raw) => testProfileRecordSchema.parse(raw))
);
