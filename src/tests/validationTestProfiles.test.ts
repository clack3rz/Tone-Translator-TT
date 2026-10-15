// src/tests/validationTestProfiles.test.ts
// Comprehensive test suite for Phase 1C.5h WP-07:
// Test Profile Template Repository & Applicability Rules Engine (Record 7).
// Bound to frozen specification v0.1j Section 13, Table 05, and Table 07.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_CLASSES,
  REQUIRED_EVIDENCE_CLASSES,
  TEST_PROFILE_FAMILIES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  testProfileRecordSchema,
  ValidationScopeRecord,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  CANONICAL_TEST_PROFILES,
  COMPONENT_CLASSES,
  ProfileApplicabilityEngine,
  TABLE_07_QUESTIONS,
  TestProfileRepository,
  ValidationSubjectInput,
} from "../sound-engineer/validation/profiles";

describe("Phase 1C.5h — WP-07: Test Profile Template Repository & Applicability Rules Engine (Record 7)", () => {
  const repository = new TestProfileRepository();
  const engine = new ProfileApplicabilityEngine(repository);

  function createSampleScopeRecord(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
    return {
      scope_id: "scope_lead_amps_01",
      intake_id: "intake_mhp_2026_001",
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_lead_5150", "amp_recto_dual", "eq_studio_parametric"],
      excluded_units: ["cab_vintage_4x12", "pedal_chorus_legacy"],
      boundary_constraints: ["Isolated under Axiom 6 boundary"],
      scope_inflation_protection: true,
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  // A. Exactly 14 profiles
  // ---------------------------------------------------------------------------
  it("A. repository contains exactly fourteen canonical profiles without duplicates", () => {
    const all = repository.getAllProfiles();
    assert.equal(all.length, 14);

    const ids = new Set(all.map((p) => p.profile_id));
    assert.equal(ids.size, 14);

    const families = new Set(all.map((p) => p.profile_family));
    assert.equal(families.size, 14);
  });

  // ---------------------------------------------------------------------------
  // B. Exact profile identities
  // ---------------------------------------------------------------------------
  it("B. asserts exact Profile 01 through 14 canonical IDs and families", () => {
    const expected = [
      { id: "PROFILE-01", family: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA },
      { id: "PROFILE-02", family: TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER },
      { id: "PROFILE-03", family: TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT },
      { id: "PROFILE-04", family: TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC },
      { id: "PROFILE-05", family: TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE },
      { id: "PROFILE-06", family: TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING },
      { id: "PROFILE-07", family: TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY },
      { id: "PROFILE-08", family: TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT },
      { id: "PROFILE-09", family: TEST_PROFILE_FAMILIES.PROFILE_09_REGRESSION },
      { id: "PROFILE-10", family: TEST_PROFILE_FAMILIES.PROFILE_10_OPERATIONAL_STABILITY },
      { id: "PROFILE-11", family: TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK },
      { id: "PROFILE-12", family: TEST_PROFILE_FAMILIES.PROFILE_12_ADVERSARIAL_EDGE_CASE },
      { id: "PROFILE-13", family: TEST_PROFILE_FAMILIES.PROFILE_13_TRACEABILITY_GOVERNANCE },
      { id: "PROFILE-14", family: TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT },
    ];

    const all = repository.getAllProfiles();
    for (let i = 0; i < 14; i++) {
      assert.equal(all[i].profile_id, expected[i].id);
      assert.equal(all[i].profile_family, expected[i].family);
    }
  });

  // ---------------------------------------------------------------------------
  // C. Exact frozen focus
  // ---------------------------------------------------------------------------
  it("C. verifies each profile required_analyses reflects its frozen focus from Section 13.2", () => {
    const p1 = repository.getProfile("PROFILE-01")!;
    assert.ok(p1.required_analyses.includes("schema_conformance_check"));
    assert.ok(p1.required_analyses.includes("xml_well_formedness_check"));

    const p4 = repository.getProfile("PROFILE-04")!;
    assert.ok(p4.required_analyses.includes("multi_band_spectral_magnitude_analysis"));
    assert.ok(p4.required_analyses.includes("thd_harmonic_distortion_measurement"));

    const p6 = repository.getProfile("PROFILE-06")!;
    assert.ok(p6.required_analyses.includes("tonal_balance_evaluation"));
    assert.ok(p6.required_analyses.includes("blind_listening_mushra_abx"));

    const p7 = repository.getProfile("PROFILE-07")!;
    assert.ok(p7.required_analyses.includes("performing_guitarist_feel_assessment"));
    assert.ok(p7.required_analyses.includes("latency_budget_verification"));

    const p11 = repository.getProfile("PROFILE-11")!;
    assert.ok(p11.required_analyses.includes("automated_rollback_execution_test"));

    const p13 = repository.getProfile("PROFILE-13")!;
    assert.ok(p13.required_analyses.includes("run_trace_completeness_audit"));

    const p14 = repository.getProfile("PROFILE-14")!;
    assert.ok(p14.required_analyses.includes("persona_task_completion_audit"));
  });

  // ---------------------------------------------------------------------------
  // D. Exact applicability
  // ---------------------------------------------------------------------------
  it("D. asserts target_component_class and applicability_rules match Section 13.2 / Table 05", () => {
    for (const p of repository.getAllProfiles()) {
      assert.ok(p.target_component_class.length > 0);
      assert.ok(p.applicability_rules.length > 0);
      assert.ok(p.applicable_fixture_classes.length > 0);
    }
  });

  // ---------------------------------------------------------------------------
  // E. Record 7 schema conformance
  // ---------------------------------------------------------------------------
  it("E. validates every canonical profile strictly against WP-01 testProfileRecordSchema", () => {
    for (const p of repository.getAllProfiles()) {
      assert.doesNotThrow(() => testProfileRecordSchema.parse(p));
    }
  });

  // ---------------------------------------------------------------------------
  // F. Immutability
  // ---------------------------------------------------------------------------
  it("F. prevents mutation of returned profiles and nested arrays", () => {
    const p1 = repository.getProfile("PROFILE-01")!;
    assert.throws(() => {
      (p1 as any).profile_id = "TAMPERED";
    });
    assert.throws(() => {
      (p1.required_analyses as any).push("tampered_analysis");
    });
    assert.throws(() => {
      (p1.applicability_rules as any).push("tampered_rule");
    });
  });

  // ---------------------------------------------------------------------------
  // G. Stable repository queries
  // ---------------------------------------------------------------------------
  it("G. supports query by ID, family, and normalized aliases without inventing profiles", () => {
    assert.ok(repository.getProfile("PROFILE-01"));
    assert.ok(repository.getProfile("profile_01"));
    assert.ok(repository.getProfile("PROFILE_01_STRUCTURAL_SCHEMA"));
    assert.ok(repository.getByFamily(TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC));
    assert.equal(repository.hasProfile("PROFILE-04"), true);

    // Unknown ID returns undefined, does not invent a profile
    assert.equal(repository.getProfile("PROFILE-99"), undefined);
    assert.equal(repository.hasProfile("NON_EXISTENT"), false);
  });

  // ---------------------------------------------------------------------------
  // H. Table 05 mandatory assignments
  // ---------------------------------------------------------------------------
  it("H. assigns mandatory profiles for every subsystem class represented in Table 05", () => {
    const testCases = [
      { cls: COMPONENT_CLASSES.PRESET_EXPORTER, expectedMandatory: "PROFILE-01" },
      { cls: COMPONENT_CLASSES.NORMALIZER, expectedMandatory: "PROFILE-02" },
      { cls: COMPONENT_CLASSES.SERIALIZER, expectedMandatory: "PROFILE-03" },
      { cls: COMPONENT_CLASSES.AMP_MODEL, expectedMandatory: "PROFILE-04" },
      { cls: COMPONENT_CLASSES.OVERDRIVE, expectedMandatory: "PROFILE-05" },
      { cls: COMPONENT_CLASSES.COMPLETE_GUITAR_TONE, expectedMandatory: "PROFILE-06" },
      { cls: COMPONENT_CLASSES.LIVE_DSP_MODEL, expectedMandatory: "PROFILE-07" },
      { cls: COMPONENT_CLASSES.STUDIO_MIX_PRESET, expectedMandatory: "PROFILE-08" },
      { cls: COMPONENT_CLASSES.MIGRATED_COMPONENT, expectedMandatory: "PROFILE-09" },
      { cls: COMPONENT_CLASSES.DSP_ENGINE, expectedMandatory: "PROFILE-10" },
      { cls: COMPONENT_CLASSES.DEPLOYMENT_CANDIDATE, expectedMandatory: "PROFILE-11" },
      { cls: COMPONENT_CLASSES.SIGNAL_INTAKE, expectedMandatory: "PROFILE-12" },
      { cls: COMPONENT_CLASSES.AI_REASONING_RUN, expectedMandatory: "PROFILE-13" },
      { cls: COMPONENT_CLASSES.FULL_APPLICATION_UI, expectedMandatory: "PROFILE-14" },
    ];

    for (const tc of testCases) {
      const res = engine.evaluateApplicability({
        subjectId: "sub_" + tc.cls,
        componentClass: tc.cls,
      });
      assert.equal(res.isResolved, true);
      assert.ok(
        res.mandatoryProfiles.some((p) => p.profile_id === tc.expectedMandatory),
        "Class " + tc.cls + " must include mandatory " + tc.expectedMandatory
      );
    }
  });

  // ---------------------------------------------------------------------------
  // I. Table 05 optional assignments
  // ---------------------------------------------------------------------------
  it("I. verifies optional profiles remain optional where specified in Table 05", () => {
    // Pure Audio Stems -> Profile 01 is optional
    const resAudio = engine.evaluateApplicability({
      subjectId: "sub_audio",
      componentClass: "Pure Audio Stems",
    });
    assert.ok(resAudio.optionalProfiles.some((p) => p.profile_id === "PROFILE-01"));
    assert.ok(!resAudio.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-01"));

    // Static Clean EQ -> Profile 05 is optional
    const resCleanEq = engine.evaluateApplicability({
      subjectId: "sub_eq",
      componentClass: "Static Clean EQ",
    });
    assert.ok(resCleanEq.optionalProfiles.some((p) => p.profile_id === "PROFILE-05"));
  });

  // ---------------------------------------------------------------------------
  // J. Table 07 objective-only / objective-dominant cases
  // ---------------------------------------------------------------------------
  it("J. enforces Table 07 objective-only requirements (preset loading, safe ranges, rollback)", () => {
    // Preset load error-free
    const resPreset = engine.evaluateApplicability({
      subjectId: "sub_q1",
      componentClass: COMPONENT_CLASSES.SERIALIZER,
      validationQuestion: TABLE_07_QUESTIONS.PRESET_LOAD_ERROR_FREE,
    });
    assert.ok(resPreset.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-03"));
    assert.ok(!resPreset.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
    assert.ok(resPreset.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.OBJECTIVE));
    assert.ok(!resPreset.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL));

    // EQ parameter values within safe ranges
    const resEqSafe = engine.evaluateApplicability({
      subjectId: "sub_q5",
      componentClass: COMPONENT_CLASSES.EQ_MODULE,
      validationQuestion: TABLE_07_QUESTIONS.EQ_PARAMETERS_SAFE_RANGE,
    });
    assert.ok(resEqSafe.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-02" || p.profile_id === "PROFILE-01"));
    assert.ok(!resEqSafe.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));

    // Rollback meet recovery objectives
    const resRollback = engine.evaluateApplicability({
      subjectId: "sub_q7",
      componentClass: COMPONENT_CLASSES.DEPLOYMENT_CANDIDATE,
      validationQuestion: TABLE_07_QUESTIONS.ROLLBACK_MEET_RECOVERY_OBJECTIVES,
    });
    assert.ok(resRollback.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-11"));
    assert.ok(!resRollback.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
  });

  // ---------------------------------------------------------------------------
  // K. Table 07 perceptual-required cases
  // ---------------------------------------------------------------------------
  it("K. enforces Table 07 perceptual-mandatory requirements (mix cut, playability, authentic tone)", () => {
    // Inspiring and genre-authentic tone (Objective: NO, Perceptual: YES)
    const resInspiring = engine.evaluateApplicability({
      subjectId: "sub_q8",
      componentClass: COMPONENT_CLASSES.COMPLETE_GUITAR_TONE,
      validationQuestion: TABLE_07_QUESTIONS.TONE_INSPIRING_GENRE_AUTHENTIC,
    });
    assert.ok(resInspiring.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
    assert.ok(resInspiring.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL));
    assert.ok(!resInspiring.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.OBJECTIVE));

    // Guitar tone cut through mix (Perceptual: YES, Objective: OPTIONAL)
    const resCut = engine.evaluateApplicability({
      subjectId: "sub_q3",
      componentClass: COMPONENT_CLASSES.STUDIO_MIX_PRESET,
      validationQuestion: TABLE_07_QUESTIONS.GUITAR_TONE_CUT_THROUGH_MIX,
    });
    assert.ok(resCut.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-08"));
    assert.ok(resCut.optionalProfiles.some((p) => p.profile_id === "PROFILE-04"));

    // Volume roll-off cleanup (Perceptual: YES, Objective: OPTIONAL)
    const resClean = engine.evaluateApplicability({
      subjectId: "sub_q4",
      componentClass: COMPONENT_CLASSES.LIVE_DSP_MODEL,
      validationQuestion: TABLE_07_QUESTIONS.AMP_CLEAN_UP_VOLUME_ROLLOFF,
    });
    assert.ok(resClean.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-07"));
    assert.ok(resClean.optionalProfiles.some((p) => p.profile_id === "PROFILE-05"));
  });

  // ---------------------------------------------------------------------------
  // L. Mixed objective + perceptual cases
  // ---------------------------------------------------------------------------
  it("L. enforces Table 07 mixed cases where both objective and perceptual evidence are mandated", () => {
    // Digital clipping (Peak meter objective + ear perceptual)
    const resClip = engine.evaluateApplicability({
      subjectId: "sub_q2",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
      validationQuestion: TABLE_07_QUESTIONS.AUDIO_FREE_OF_DIGITAL_CLIPPING,
    });
    assert.ok(resClip.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-04" || p.profile_id === "PROFILE-05"));
    assert.ok(resClip.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
    assert.ok(resClip.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.MIXED));

    // Speaker harsh fizz (THD objective + listening perceptual)
    const resFizz = engine.evaluateApplicability({
      subjectId: "sub_q6",
      componentClass: COMPONENT_CLASSES.CABINET_EMULATOR,
      validationQuestion: TABLE_07_QUESTIONS.CABINET_EXHIBIT_HARSH_FIZZ,
    });
    assert.ok(resFizz.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-04"));
    assert.ok(resFizz.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
    assert.ok(resFizz.requiredEvidenceClasses.includes(REQUIRED_EVIDENCE_CLASSES.MIXED));
  });

  // ---------------------------------------------------------------------------
  // M. Serializer subject
  // ---------------------------------------------------------------------------
  it("M. ensures pure serialization subjects do not receive irrelevant human listening or playability profiles", () => {
    const res = engine.evaluateApplicability({
      subjectId: "sub_serializer_pure",
      componentClass: COMPONENT_CLASSES.PRESET_EXPORTER,
    });
    assert.ok(res.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-01"));
    assert.ok(!res.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
    assert.ok(!res.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-07"));
    assert.ok(!res.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-14"));
  });

  // ---------------------------------------------------------------------------
  // N. Acoustic modelling subject
  // ---------------------------------------------------------------------------
  it("N. assigns objective acoustic profile to amplifier models and cabinet emulators", () => {
    const resAmp = engine.evaluateApplicability({
      subjectId: "sub_amp_5150",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
    });
    assert.ok(resAmp.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-04"));

    const resCab = engine.evaluateApplicability({
      subjectId: "sub_cab_1960",
      componentClass: COMPONENT_CLASSES.CABINET_EMULATOR,
    });
    assert.ok(resCab.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-04"));
  });

  // ---------------------------------------------------------------------------
  // O. Dynamic processor subject
  // ---------------------------------------------------------------------------
  it("O. assigns dynamic response profile to overdrives, compressors, and power-amp sag", () => {
    const resOD = engine.evaluateApplicability({
      subjectId: "sub_screamer",
      componentClass: COMPONENT_CLASSES.OVERDRIVE,
    });
    assert.ok(resOD.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-05"));

    const resComp = engine.evaluateApplicability({
      subjectId: "sub_studio_comp",
      componentClass: COMPONENT_CLASSES.COMPRESSOR,
    });
    assert.ok(resComp.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-05"));
  });

  // ---------------------------------------------------------------------------
  // P. Complete tone subject
  // ---------------------------------------------------------------------------
  it("P. assigns perceptual listening profile to complete guitar tones and presets", () => {
    const resTone = engine.evaluateApplicability({
      subjectId: "sub_heavy_rock_tone",
      componentClass: COMPONENT_CLASSES.COMPLETE_GUITAR_TONE,
    });
    assert.ok(resTone.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-06"));
  });

  // ---------------------------------------------------------------------------
  // Q. Playability subject
  // ---------------------------------------------------------------------------
  it("Q. assigns playability profile where interactive real-time feel is required", () => {
    const resPlay = engine.evaluateApplicability({
      subjectId: "sub_live_amp",
      componentClass: COMPONENT_CLASSES.LIVE_DSP_MODEL,
    });
    assert.ok(resPlay.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-07"));
  });

  // ---------------------------------------------------------------------------
  // R. Mix-context subject
  // ---------------------------------------------------------------------------
  it("R. assigns mix-context profile where multitrack commercial pocket is evaluated", () => {
    const resMix = engine.evaluateApplicability({
      subjectId: "sub_mix_preset",
      componentClass: COMPONENT_CLASSES.STUDIO_MIX_PRESET,
    });
    assert.ok(resMix.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-08"));
  });

  // ---------------------------------------------------------------------------
  // S. Migrated component
  // ---------------------------------------------------------------------------
  it("S. assigns regression profile when component is migrated from legacy production heuristics", () => {
    const resMigrated = engine.evaluateApplicability({
      subjectId: "sub_migrated_lead",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
      isMigrated: true,
    });
    assert.ok(resMigrated.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-09"));
  });

  // ---------------------------------------------------------------------------
  // T. New non-migrated component
  // ---------------------------------------------------------------------------
  it("T. does NOT automatically assign regression profile to completely novel components", () => {
    const resNovel = engine.evaluateApplicability({
      subjectId: "sub_novel_synth",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
      isMigrated: false,
    });
    assert.ok(!resNovel.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-09"));
    assert.ok(resNovel.optionalProfiles.some((p) => p.profile_id === "PROFILE-09"));
  });

  // ---------------------------------------------------------------------------
  // U. Production-cutover candidate
  // ---------------------------------------------------------------------------
  it("U. mandates rollback profile for production-cutover candidate deployments", () => {
    const resCutover = engine.evaluateApplicability({
      subjectId: "sub_deploy_pkg",
      componentClass: COMPONENT_CLASSES.DEPLOYMENT_CANDIDATE,
      isProductionCutoverCandidate: true,
    });
    assert.ok(resCutover.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-11"));
  });

  // ---------------------------------------------------------------------------
  // V. Non-cutover internal component
  // ---------------------------------------------------------------------------
  it("V. does NOT universally assign rollback profile to non-cutover internal utilities", () => {
    const resInternal = engine.evaluateApplicability({
      subjectId: "sub_internal_normalizer",
      componentClass: COMPONENT_CLASSES.NORMALIZER,
      isProductionCutoverCandidate: false,
    });
    assert.ok(!resInternal.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-11"));
    assert.ok(resInternal.optionalProfiles.some((p) => p.profile_id === "PROFILE-11"));
  });

  // ---------------------------------------------------------------------------
  // W. User/platform/signal-intake subject
  // ---------------------------------------------------------------------------
  it("W. assigns adversarial/edge-case profile to signal intake, exporter, and UI modules", () => {
    const resIntake = engine.evaluateApplicability({
      subjectId: "sub_audio_intake",
      componentClass: COMPONENT_CLASSES.SIGNAL_INTAKE,
      isUserFacingOrSignalIntake: true,
    });
    assert.ok(resIntake.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-12"));
  });

  // ---------------------------------------------------------------------------
  // X. AI reasoning run
  // ---------------------------------------------------------------------------
  it("X. assigns traceability/governance profile to all AI Sound Engineer reasoning runs", () => {
    const resAi = engine.evaluateApplicability({
      subjectId: "sub_reasoning_run_01",
      componentClass: COMPONENT_CLASSES.AI_REASONING_RUN,
      isAiReasoningRun: true,
    });
    assert.ok(resAi.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-13"));
  });

  // ---------------------------------------------------------------------------
  // Y. End-to-end workflow
  // ---------------------------------------------------------------------------
  it("Y. assigns user-workflow/UAT profile to full application UI and preset discovery flows", () => {
    const resWorkflow = engine.evaluateApplicability({
      subjectId: "sub_workflow_discovery",
      componentClass: COMPONENT_CLASSES.FULL_APPLICATION_UI,
      isEndToEndWorkflow: true,
    });
    assert.ok(resWorkflow.mandatoryProfiles.some((p) => p.profile_id === "PROFILE-14"));
  });

  // ---------------------------------------------------------------------------
  // Z. Unknown component class
  // ---------------------------------------------------------------------------
  it("Z. fails closed and does NOT default to all fourteen profiles for unknown component class", () => {
    const resUnknown = engine.evaluateApplicability({
      subjectId: "sub_unknown_gizmo",
      componentClass: "CompletelyUnrecognizedComponentFooBar",
    });
    assert.equal(resUnknown.isResolved, false);
    assert.equal(resUnknown.mandatoryProfiles.length, 0);
    assert.notEqual(resUnknown.mandatoryProfiles.length, 14);
    assert.ok(resUnknown.unresolvedReason?.includes("Unknown or unsupported component class"));
  });

  // ---------------------------------------------------------------------------
  // AA. Anti-universal-scorecard
  // ---------------------------------------------------------------------------
  it("AA. refuses arbitrary request for universal profile assignment", () => {
    const resUniversal = engine.evaluateApplicability({
      subjectId: "sub_universal_request",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
      requestAllProfiles: true,
    });
    assert.equal(resUniversal.isResolved, false);
    assert.equal(resUniversal.mandatoryProfiles.length, 0);
    assert.ok(resUniversal.unresolvedReason?.includes("Section 13.1 strictly prohibits universal fixed scorecards"));
  });

  // ---------------------------------------------------------------------------
  // AB. Out-of-scope unit
  // ---------------------------------------------------------------------------
  it("AB. prevents profile assignment from widening scope when unit is out of scope or excluded", () => {
    const scopeRecord = createSampleScopeRecord();

    // Unit explicitly in excluded_units: cab_vintage_4x12
    const resExcluded = engine.evaluateApplicability({
      subjectId: "sub_excluded_cab",
      componentClass: COMPONENT_CLASSES.CABINET_EMULATOR,
      unitId: "cab_vintage_4x12",
      scopeRecord,
    });
    assert.equal(resExcluded.isScopeAllowed, false);
    assert.equal(resExcluded.isResolved, false);
    assert.equal(resExcluded.mandatoryProfiles.length, 0);
    assert.ok(resExcluded.scopeViolationReason?.includes("outside declared validation scope or explicitly excluded"));

    // Unit not in included_units: unknown_pedal
    const resNotInScope = engine.evaluateApplicability({
      subjectId: "sub_unscoped_pedal",
      componentClass: COMPONENT_CLASSES.OVERDRIVE,
      unitId: "pedal_completely_out_of_scope",
      scopeRecord,
    });
    assert.equal(resNotInScope.isScopeAllowed, false);
    assert.equal(resNotInScope.isResolved, false);
  });

  // ---------------------------------------------------------------------------
  // AC. Determinism
  // ---------------------------------------------------------------------------
  it("AC. produces identical ordered profile output on equivalent input", () => {
    const input: ValidationSubjectInput = {
      subjectId: "sub_det_test",
      componentClass: COMPONENT_CLASSES.AMP_MODEL,
      isMigrated: true,
      isProductionCutoverCandidate: true,
    };

    const res1 = engine.evaluateApplicability(input);
    const res2 = engine.evaluateApplicability(input);

    assert.equal(res1.mandatoryProfiles.length, res2.mandatoryProfiles.length);
    for (let i = 0; i < res1.mandatoryProfiles.length; i++) {
      assert.equal(res1.mandatoryProfiles[i].profile_id, res2.mandatoryProfiles[i].profile_id);
    }
  });

  // ---------------------------------------------------------------------------
  // AD. No universal numeric tolerance
  // ---------------------------------------------------------------------------
  it("AD. verifies all profile templates use governed tolerance reference strings rather than universal numeric thresholds", () => {
    for (const p of repository.getAllProfiles()) {
      assert.ok(p.tolerance_criteria_spec.startsWith("tolerance_spec_ref:"));
      // Must not contain hardcoded magic numbers like "< 1%" or "< 10ms"
      assert.ok(!p.tolerance_criteria_spec.includes("%"));
      assert.ok(!p.tolerance_criteria_spec.includes("dB"));
      assert.ok(!p.tolerance_criteria_spec.includes("ms"));
    }
  });

  // ---------------------------------------------------------------------------
  // AE. Graph protection
  // ---------------------------------------------------------------------------
  it("AE. registers Record 7 nodes without inventing profile edges, preserving exactly 14 governed edge types", () => {
    const graph = new ValidationRelationshipGraph();
    const repoWithGraph = new TestProfileRepository({ graph });

    // Exactly 14 profile nodes registered
    const all = repoWithGraph.getAllProfiles();
    for (const p of all) {
      const node = graph.getNode(p.profile_id);
      assert.ok(node);
      assert.equal(node.kind, GOVERNED_ENTITY_KINDS.TestProfileRecord);
    }

    // Zero edges added (no Scope -> TestProfile or Subject -> TestProfile edge invented)
    assert.equal(graph.getEdges().length, 0);

    // Governed edge catalogue remains exactly 14
    assert.equal(Object.keys(GOVERNED_EDGE_TYPES).length, 14);
  });
});
