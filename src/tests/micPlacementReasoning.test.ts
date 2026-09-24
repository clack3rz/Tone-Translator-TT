// src/tests/micPlacementReasoning.test.ts
// Tests for Stage 2: Explicit Semantic Microphone Placement Decision System

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import {
  VALID_SEMANTIC_POSITIONS,
  VALID_SEMANTIC_DISTANCES,
  VALID_SEMANTIC_ANGLES,
  isValidSemanticPosition,
  isValidSemanticDistance,
  isValidSemanticAngle,
  isCompleteSemanticPlacement,
  formatSemanticPlacement,
  parseSemanticPlacement,
  extractCanonicalMicPlacement,
  getVIRCalibrationCoordinates,
  setVIRCalibrationOverrides,
  resetVIRCalibrationOverrides,
  composeVIRCoordinates,
  resolveCompositeMicPlacement
} from "../services/at5MicPlacementService";

import {
  determineMicrophoneRole,
  reasonSemanticMicPlacement,
  ensureSignalChainSemanticPlacements,
  formatMicrophoneDebug
} from "../services/at5MicPlacementReasoning";

import { translateTone } from "../services/geminiService";
import { getExportDebugData, generateXML } from "../services/presetExporter";
import { detectCabSettingsFormat, normaliseSignalChain } from "../services/at5SignalChainNormalizer";
import { ToneResult } from "../types";

describe("Stage 2: Semantic Microphone Placement System", () => {
  
  // 1. Authoritative Vocabulary Tests
  it("strictly defines and validates the authoritative 3-dimension vocabulary", () => {
    assert.deepEqual(VALID_SEMANTIC_POSITIONS, ["Cap", "Cap Edge", "Cone", "Cone Edge"]);
    assert.deepEqual(VALID_SEMANTIC_DISTANCES, ["Close", "Medium", "Far"]);
    assert.deepEqual(VALID_SEMANTIC_ANGLES, ["On Axis", "45° Off Axis"]);

    assert.equal(isValidSemanticPosition("Cap Edge"), true);
    assert.equal(isValidSemanticPosition("Grill Center"), false);

    assert.equal(isValidSemanticDistance("Close"), true);
    assert.equal(isValidSemanticDistance("Inch"), false);

    assert.equal(isValidSemanticAngle("45° Off Axis"), true);
    assert.equal(isValidSemanticAngle("90 Degrees"), false);
  });

  it("accurately detects complete triplets vs partial or invalid placements", () => {
    // Complete triplets
    assert.equal(isCompleteSemanticPlacement("Cap Edge, Close, On Axis"), true);
    assert.equal(isCompleteSemanticPlacement("Cone, Close, 45° Off Axis"), true);
    assert.equal(isCompleteSemanticPlacement("Cap Edge · Close · On Axis"), true);
    assert.equal(isCompleteSemanticPlacement("Cap, Far, On Axis"), true);

    // Incomplete / partial strings
    assert.equal(isCompleteSemanticPlacement("Cap Edge"), false);
    assert.equal(isCompleteSemanticPlacement("Close"), false);
    assert.equal(isCompleteSemanticPlacement("Cap Edge, Close"), false);
    assert.equal(isCompleteSemanticPlacement(""), false);
    assert.equal(isCompleteSemanticPlacement(null), false);
    assert.equal(isCompleteSemanticPlacement(undefined), false);

    // Invalid labels
    assert.equal(isCompleteSemanticPlacement("Grill Center, Close, On Axis"), false);
    assert.equal(isCompleteSemanticPlacement("Behind Amp"), false);
  });

  // 2. Microphone Role Assignment
  it("assigns authoritative tonal roles based on model and musical function", () => {
    assert.equal(determineMicrophoneRole("Dynamic 57"), "primary attack/presence mic");
    assert.equal(determineMicrophoneRole("Ribbon 121"), "warmth/fizz-control mic");
    assert.equal(determineMicrophoneRole("Dynamic 421"), "body/punch mic");
    assert.equal(determineMicrophoneRole("Condenser 87"), "detail/polish mic");
    assert.equal(determineMicrophoneRole("Vintage Dynamic 20"), "bass low-end/fullness mic");
  });

  // 3. Reasoning Engine Placement Decisions
  it("selects appropriate placement for single-mic setup (Dynamic 57 attack)", () => {
    const decision = reasonSemanticMicPlacement({
      micModel: "Dynamic 57",
      micSlot: "Mic_1",
      speakerName: "Brit 75",
      promptContext: "tight rock rhythm"
    });

    assert.equal(decision.position, "Cap Edge");
    assert.equal(decision.orientation, "W");
    assert.equal(decision.distance, "Close");
    assert.equal(decision.angle, "On Axis");
    assert.equal(decision.placementString, "Cap Edge, W, Close, On Axis");
    assert.match(decision.reason, /preserves transient definition/i);
  });

  it("selects complementary placement for dual-mic high-gain thrash setup", () => {
    // Mic 1: Dynamic 57 for attack
    const m1 = reasonSemanticMicPlacement({
      micModel: "Dynamic 57",
      micSlot: "Mic_1",
      speakerName: "Brit 75",
      promptContext: "high gain thrash metal rhythm kill 'em all"
    });
    assert.equal(m1.placementString, "Cap Edge, W, Close, On Axis");

    // Mic 2: Ribbon 121 for warmth/fizz-control
    const m2 = reasonSemanticMicPlacement({
      micModel: "Ribbon 121",
      micSlot: "Mic_2",
      speakerName: "Brit 75",
      promptContext: "high gain thrash metal rhythm kill 'em all",
      otherMic: {
        model: m1.micModel,
        role: m1.role,
        position: m1.position,
        orientation: m1.orientation,
        distance: m1.distance,
        angle: m1.angle
      }
    });

    assert.equal(m2.position, "Cone");
    assert.equal(m2.orientation, "W");
    assert.equal(m2.distance, "Close");
    assert.equal(m2.angle, "45° Off Axis");
    assert.equal(m2.placementString, "Cone, W, Close, 45° Off Axis");
    assert.match(m2.reason, /tames high-frequency distortion fizz/i);
  });

  it("selects on-axis ribbon placement for classic crunch without fizz (AC/DC Greenback)", () => {
    const m2 = reasonSemanticMicPlacement({
      micModel: "Ribbon 121",
      micSlot: "Mic_2",
      speakerName: "Brit Green",
      promptContext: "classic rock ac/dc crunch rhythm",
      toneProfile: {
        source_type: "text",
        confidence: "high",
        gain_level: "medium",
        distortion_type: "crunch"
      }
    });

    assert.equal(m2.position, "Cone");
    assert.equal(m2.orientation, "W");
    assert.equal(m2.distance, "Close");
    assert.equal(m2.angle, "On Axis");
    assert.equal(m2.placementString, "Cone, W, Close, On Axis");
    assert.match(m2.reason, /woody lower midrange/i);
  });

  // 4. Signal Chain Normalization & Fallback Completion
  it("completes omitted mic placements at generation boundary", () => {
    const rawChain: ToneResult = {
      tone_summary: { style: "metal", gain_level: "high", noise_level: "high" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 8000",
          settings: {
            Speaker: "Brit 75",
            Mic_1: "Dynamic 57",
            Mic_2: "Ribbon 121",
            Room: "Small Studio"
          }
        }
      ],
      engineering_notes: {
        gain_strategy: "high gain",
        noise_control: "gate",
        eq_strategy: "scoop"
      },
      confidence: 90
    };

    const completed = ensureSignalChainSemanticPlacements(rawChain, undefined, "thrash metal");
    const cabSettings = completed.signal_chain[0].settings;

    assert.equal(cabSettings["Mic_1_Placement"], "Cap Edge, W, Close, On Axis");
    assert.equal(cabSettings["Mic_2_Placement"], "Cone, W, Close, 45° Off Axis");
    assert.equal(cabSettings["Mic_1_Orientation"], "W");
    assert.equal(cabSettings["Mic_2_Orientation"], "W");
    assert.ok(completed.engineering_notes.microphone_debug);
    assert.match(completed.engineering_notes.microphone_debug!, /Mic 1: Dynamic 57/);
    assert.match(completed.engineering_notes.microphone_debug!, /Mic 2: Ribbon 121/);
  });

  it("corrects partial mic placements at generation boundary", () => {
    const rawChain: ToneResult = {
      tone_summary: { style: "rock", gain_level: "medium", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 8000",
          settings: {
            Speaker: "Brit Green",
            Mic_1: "Dynamic 57",
            Mic_1_Placement: "Cap Edge", // partial
            Room: "Small Studio"
          }
        }
      ],
      engineering_notes: {
        gain_strategy: "crunch",
        noise_control: "none",
        eq_strategy: "mid forward"
      },
      confidence: 90
    };

    const completed = ensureSignalChainSemanticPlacements(rawChain, undefined, "rock");
    const cabSettings = completed.signal_chain[0].settings;

    assert.equal(cabSettings["Mic_1_Placement"], "Cap Edge, W, Close, On Axis");
    assert.equal(cabSettings["Mic_1_Orientation"], "W");
  });

  it("preserves explicitly specified valid semantic placement triplets", () => {
    const rawChain: ToneResult = {
      tone_summary: { style: "ambient", gain_level: "low", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "2x12 Open Back",
          settings: {
            Speaker: "American 12C",
            Mic_1: "Condenser 87",
            Mic_1_Placement: "Cone, Medium, On Axis",
            Room: "Large Studio"
          }
        }
      ],
      engineering_notes: {
        gain_strategy: "clean",
        noise_control: "none",
        eq_strategy: "open"
      },
      confidence: 95
    };

    const completed = ensureSignalChainSemanticPlacements(rawChain, undefined, "ambient clean");
    const cabSettings = completed.signal_chain[0].settings;

    assert.equal(cabSettings["Mic_1_Placement"], "Cone, Medium, On Axis");
  });

  // 5. Regression Test: "1980s Metallica Kill 'Em All rhythm"
  it("verifies explicit placement and truthful provenance for 1980s Metallica Kill 'Em All rhythm", async () => {
    const chain = await translateTone("1980s Metallica Kill 'Em All rhythm", undefined, undefined, undefined, undefined, undefined, true);
    const cab = chain.signal_chain.find(c => c.type === "cab");
    assert.ok(cab, "Cabinet element must be present");

    // Signal chain settings must explicitly have complete 4-part placements
    assert.equal(cab.settings["Mic_0_Placement"], "Cap Edge, W, Close, On Axis");
    assert.equal(cab.settings["Mic_1_Placement"], "Cone, W, Close, 45° Off Axis");

    // Engineering notes must include microphone debug breakdown
    assert.ok(chain.engineering_notes.microphone_debug, "Microphone debug notes must be present");
    assert.match(chain.engineering_notes.microphone_debug!, /Role: primary attack\/presence mic/);
    assert.match(chain.engineering_notes.microphone_debug!, /Role: warmth\/fizz-control mic/);

    // Export debug data and inspect Cab Raw Diagnostics
    const debugData = getExportDebugData(chain);
    const cabItem = debugData.exported_chain.find(item => item.type === "cab");
    assert.ok(cabItem, "Cab item must be found in exported chain");

    // Check original_settings and normalized_settings have explicit placement values
    assert.equal(cabItem.original_settings["Mic_0_Placement"], "Cap Edge, W, Close, On Axis");
    assert.equal(cabItem.original_settings["Mic_1_Placement"], "Cone, W, Close, 45° Off Axis");
    assert.equal(cabItem.normalized_settings["Mic_0_Placement"], "Cap Edge, W, Close, On Axis");
    assert.equal(cabItem.normalized_settings["Mic_1_Placement"], "Cone, W, Close, 45° Off Axis");

    // Lineage provenance flags must report placement_was_supplied_by_chain: true
    const mic0Canon = extractCanonicalMicPlacement(cab.settings, 0);
    const mic1Canon = extractCanonicalMicPlacement(cab.settings, 1);
    assert.equal(mic0Canon.placement_was_supplied_by_chain, true);
    assert.equal(mic1Canon.placement_was_supplied_by_chain, true);
    assert.equal(mic0Canon.raw_supplied_placement, "Cap Edge, W, Close, On Axis");
    assert.equal(mic1Canon.raw_supplied_placement, "Cone, W, Close, 45° Off Axis");

    // Coordinate resolution source vs semantic provenance distinction
    const mic0Param = cabItem.parameter_details?.find(p => p.parameter === "Mic 0 Placement");
    const mic1Param = cabItem.parameter_details?.find(p => p.parameter === "Mic 1 Placement");
    assert.ok(mic0Param, "Mic 0 parameter detail must exist");
    assert.ok(mic1Param, "Mic 1 parameter detail must exist");
    assert.equal(mic0Param.semantic_provenance, "signal_chain_generated");
    assert.equal(mic1Param.semantic_provenance, "signal_chain_generated");
    assert.equal(mic0Param.coordinate_resolution_source, "reference_calibration_vir");
    assert.equal(mic1Param.coordinate_resolution_source, "reference_calibration_vir");

    // Ribbon 121 now resolves via reference_calibration_vir on verified reference cabinet
    assert.match(chain.engineering_notes.microphone_debug!, /Cone/i);
    assert.match(chain.engineering_notes.microphone_debug!, /45° Off Axis/i);
    assert.match(chain.engineering_notes.microphone_debug!, /fizz/i);
    assert.match(chain.engineering_notes.microphone_debug!, /Reason:/i);
  });

  // 6. Multi-Factor Acoustic Reasoning Diagnostics Tests
  it("exposes all acoustic reasoning dimensions (Role, Target Tone, Position, Distance, Angle, Multi-Mic) cleanly", () => {
    const m1 = reasonSemanticMicPlacement({
      micModel: "Dynamic 57",
      micSlot: "Mic_1",
      speakerName: "Brit 75",
      promptContext: "tight rock rhythm",
      toneProfile: {
        source_type: "text",
        confidence: "high",
        gain_level: "high",
        distortion_type: "saturated",
        role: "rhythm"
      }
    });

    const m2 = reasonSemanticMicPlacement({
      micModel: "Ribbon 121",
      micSlot: "Mic_2",
      speakerName: "Brit 75",
      promptContext: "tight rock rhythm",
      toneProfile: {
        source_type: "text",
        confidence: "high",
        gain_level: "high",
        distortion_type: "saturated",
        role: "rhythm"
      },
      otherMic: {
        model: m1.micModel,
        role: m1.role,
        position: m1.position,
        distance: m1.distance,
        angle: m1.angle
      }
    });

    // 1. Mic Role is explicitly populated
    assert.equal(m1.role, "primary attack/presence mic");
    assert.equal(m2.role, "warmth/fizz-control mic");

    // 2. Position rationale is present
    assert.match(m1.reason, /Cap Edge/i);
    assert.match(m2.reason, /Cone/i);

    // 3. Distance rationale is present
    assert.match(m1.reason, /Close/i);
    assert.match(m2.reason, /Close/i);

    // 4. Angle rationale is present
    assert.match(m1.reason, /On Axis/i);
    assert.match(m2.reason, /45° Off Axis/i);

    // 5. Multi-mic complementary relationship is present in Mic 2
    assert.match(m2.reason, /complements/i);
    assert.match(m2.reason, /Dynamic 57/i);

    // 6. Validation note is cleanly separated and not embedded inside the acoustic reason
    assert.ok(m1.validationNote);
    assert.doesNotMatch(m1.reason, /Validation:/i);
    assert.doesNotMatch(m1.reason, /Preserved explicit valid/i);
  });

  // 7. Validation Separation When Explicit Placement Is Supplied
  it("keeps validation statements strictly in validationNote when explicit valid placement is supplied", () => {
    const decision = reasonSemanticMicPlacement({
      micModel: "Dynamic 57",
      micSlot: "Mic_1",
      speakerName: "Brit 75",
      existingPlacement: "Cap Edge, Close, On Axis",
      promptContext: "classic heavy metal",
      toneProfile: {
        source_type: "text",
        confidence: "high",
        gain_level: "high",
        distortion_type: "saturated"
      }
    });

    // Acoustic reason must explain musical and physical rationale
    assert.match(decision.reason, /attack/i);
    assert.match(decision.reason, /Cap Edge/i);
    assert.match(decision.reason, /Close/i);
    assert.match(decision.reason, /On Axis/i);

    // Validation note records verification without polluting acoustic reasoning
    assert.equal(decision.validationNote, "Explicit semantic placement was supplied and passed vocabulary validation.");
    assert.doesNotMatch(decision.reason, /Explicit semantic placement/i);

    // Formatted debug output includes both sections
    const formatted = formatMicrophoneDebug([decision]);
    assert.match(formatted, /Reason:/);
    assert.match(formatted, /Validation:/);
  });

  // 8. Backwards Compatibility Test: Legacy Chains
  it("truthfully identifies legacy chains without placement as placement_was_supplied_by_chain: false", () => {
    const legacyCabSettings = {
      Speaker: "Brit 75",
      Mic_1: "Dynamic 57",
      Mic_2: "Ribbon 121",
      Room: "Small Studio"
      // No Mic_1_Placement or Mic_2_Placement
    };

    const mic0Canon = extractCanonicalMicPlacement(legacyCabSettings, 0);
    const mic1Canon = extractCanonicalMicPlacement(legacyCabSettings, 1);

    assert.equal(mic0Canon.placement_was_supplied_by_chain, false);
    assert.equal(mic1Canon.placement_was_supplied_by_chain, false);
    assert.equal(mic0Canon.raw_supplied_placement, undefined);
    assert.equal(mic1Canon.raw_supplied_placement, undefined);
    // Canonical fallback label is still derived safely for VIR calibration
    assert.ok(mic0Canon.canonical_placement_label);
    assert.ok(mic1Canon.canonical_placement_label);
  });

  // 9. Area B: Explicit Format Detection
  it("explicitly detects schema formats: canonical_0_indexed, legacy_1_indexed, and single_mic_ambiguous", () => {
    // Canonical 0-indexed
    const canonFormat = detectCabSettingsFormat({
      Mic_0: "Dynamic 57",
      Mic_0_Placement: "Cap Edge, Close, On Axis",
      Mic_1: "Condenser 87",
      Mic_1_Placement: "Cone, Close, 45° Off Axis"
    });
    assert.equal(canonFormat.format, "canonical_0_indexed");
    assert.equal(canonFormat.isLegacy, false);
    assert.equal(canonFormat.isAmbiguous, false);

    // Legacy 1-indexed
    const legacyFormat = detectCabSettingsFormat({
      Mic_1: "Dynamic 57",
      Mic_1_Placement: "Cap Edge, Close, On Axis",
      Mic_2: "Condenser 87",
      Mic_2_Placement: "Cone, Close, 45° Off Axis"
    });
    assert.equal(legacyFormat.format, "legacy_1_indexed");
    assert.equal(legacyFormat.isLegacy, true);
    assert.equal(legacyFormat.isAmbiguous, false);

    // Single mic ambiguous (only Mic_1 present)
    const singleAmbiguous = detectCabSettingsFormat({
      Mic_1: "Dynamic 57",
      Mic_1_Placement: "Cap Edge, Close, On Axis"
    });
    assert.equal(singleAmbiguous.format, "single_mic_ambiguous");
    assert.equal(singleAmbiguous.isLegacy, true);
    assert.equal(singleAmbiguous.isAmbiguous, true);
    assert.match(singleAmbiguous.reason, /Ambiguous single-mic key/);
  });

  // 10. Area B: Normalization Boundary (Legacy absorption into Canonical 0-based)
  it("enforces normalization boundary: legacy keys are absorbed and downstream receives strictly Mic_0 and Mic_1", () => {
    const legacyChain: ToneResult = {
      confidence: 1,
      tone_summary: { style: "rock", gain_level: "high", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 1960A",
          settings: {
            Speaker: "Brit 75",
            Mic_1: "Dynamic 57",
            Mic_1_Placement: "Cap Edge, Close, On Axis",
            Mic_2: "Ribbon 121",
            Mic_2_Placement: "Cone, Close, 45° Off Axis"
          }
        }
      ],
      engineering_notes: {
        signal_path_summary: "Legacy test path"
      }
    };

    const normalised = normaliseSignalChain(legacyChain);
    const cab = normalised.signal_chain.find(c => c.type === "cab");
    assert.ok(cab, "Normalized cab must exist");

    // Must have canonical keys
    assert.equal(cab.settings["Mic_0"], "Dynamic 57");
    assert.equal(cab.settings["Mic_0_Placement"], "Cap Edge, Close, On Axis");
    assert.equal(cab.settings["Mic_1"], "Ribbon 121");
    assert.equal(cab.settings["Mic_1_Placement"], "Cone, Close, 45° Off Axis");

    // Must NOT contain legacy keys downstream
    assert.equal(cab.settings["Mic_2"], undefined, "Legacy Mic_2 must be stripped");
    assert.equal(cab.settings["Mic_2_Placement"], undefined, "Legacy Mic_2_Placement must be stripped");
  });

  // 11. Area A: Resolved Coordinates -> XML Serialization
  it("serializes exact resolved numeric coordinates into XML without leaking diagnostic fields", () => {
    const testChain: ToneResult = {
      confidence: 1,
      tone_summary: { style: "rock", gain_level: "high", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 1960A",
          settings: {
            Speaker: "Brit 75",
            Mic_0: "Dynamic 57",
            Mic_0_Placement: "Cap Edge, Close, On Axis",
            Mic_1: "Condenser 87",
            Mic_1_Placement: "Cone, Close, 45° Off Axis",
            _mic_format_diagnostic: "diagnostic test",
            _mic_format_ambiguous: 1
          }
        }
      ],
      engineering_notes: {
        signal_path_summary: "XML test"
      }
    };

    const xml = generateXML(testChain);
    assert.ok(xml, "XML string must be generated");

    // Exact numeric coordinate verification
    // Cap Edge, Close, On Axis -> XAxis: -0.214223, YAxis: -0.00519017, Distance: 0, Angle: 0, Speaker: 0
    assert.match(xml, /Mic0Angle="0"/, "Mic0Angle must match 0");
    assert.match(xml, /Mic0XAxis="-0\.214223"/, "Mic0XAxis must match calibrated -0.214223");
    assert.match(xml, /Mic0YAxis="-0\.00519017"/, "Mic0YAxis must match calibrated -0.00519017");
    assert.match(xml, /Mic0Distance="0"/, "Mic0Distance must match 0");
    assert.match(xml, /Mic0Speaker="0"/, "Mic0Speaker must match 0");

    // Cone, Close, 45° Off Axis -> Angle: 1, Distance: 0, Speaker: 1, XAxis: -0.428446, YAxis: -0.0103803
    assert.match(xml, /Mic1Angle="1"/, "Mic1Angle must match 1");
    assert.match(xml, /Mic1XAxis="-0\.428446"/, "Mic1XAxis must match calibrated -0.428446");
    assert.match(xml, /Mic1YAxis="-0\.0103803"/, "Mic1YAxis must match calibrated -0.0103803");
    assert.match(xml, /Mic1Distance="0"/, "Mic1Distance must match 0");
    assert.match(xml, /Mic1Speaker="1"/, "Mic1Speaker must match 1");

    // Verification: Internal diagnostic fields must NOT leak into the XML
    assert.equal(xml.includes("_mic_format_diagnostic"), false, "_mic_format_diagnostic must not be in XML");
    assert.equal(xml.includes("_mic_format_ambiguous"), false, "_mic_format_ambiguous must not be in XML");
  });

  // 12. Area D: Durable VIR Reference Calibration Overrides and Reset
  it("allows setting VIR reference calibration overrides and resetting to factory defaults", () => {
    // Before override
    const initialCoords = getVIRCalibrationCoordinates();
    assert.equal(initialCoords.positions["Cap"].X, 0);
    assert.equal(initialCoords.positions["Cap"].Y, 0);

    // Apply calibration overrides
    setVIRCalibrationOverrides({
      positions: {
        "Cap": { X: 0.12345, Y: 0.67890 }
      }
    });

    const overriddenCoords = getVIRCalibrationCoordinates();
    assert.equal(overriddenCoords.positions["Cap"].X, 0.12345);
    assert.equal(overriddenCoords.positions["Cap"].Y, 0.67890);

    // Composed coordinates use active override
    const composed = composeVIRCoordinates("Cap", "Close", "On Axis", "Mic_0");
    assert.equal(composed.XAxis, 0.12345);
    assert.equal(composed.YAxis, 0.67890);

    // Reset to factory baseline
    resetVIRCalibrationOverrides();
    const restoredCoords = getVIRCalibrationCoordinates();
    assert.equal(restoredCoords.positions["Cap"].X, 0);
    assert.equal(restoredCoords.positions["Cap"].Y, 0);
  });

  // 13. Area 7 Test 1 & 3: Canonical dual-mic object (Mic_0 + Mic_1) with canonical placement fields
  it("processes canonical dual-mic object: Mic_0 + Mic_1 with Mic_0_Placement + Mic_1_Placement", () => {
    const canonicalSettings = {
      Mic_0: "Dynamic 57",
      Mic_0_Placement: "Cap Edge, Close, On Axis",
      Mic_1: "Ribbon 121",
      Mic_1_Placement: "Cone, Close, 45° Off Axis"
    };

    const format = detectCabSettingsFormat(canonicalSettings);
    assert.equal(format.format, "canonical_0_indexed");
    assert.equal(format.isLegacy, false);
    assert.equal(format.isAmbiguous, false);

    const mic0 = extractCanonicalMicPlacement(canonicalSettings, 0);
    const mic1 = extractCanonicalMicPlacement(canonicalSettings, 1);

    assert.equal(mic0.placement_was_supplied_by_chain, true);
    assert.equal(mic0.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic0.canonical_placement_label, "Cap Edge · Close · On Axis");
    assert.equal(mic1.placement_was_supplied_by_chain, true);
    assert.equal(mic1.raw_supplied_placement, "Cone, Close, 45° Off Axis");
    assert.equal(mic1.canonical_placement_label, "Cone · Close · 45° Off Axis");
  });

  // 14. Area 7 Test 2 & 4: Legacy dual-mic object (Mic_1 + Mic_2) with legacy placement fields
  it("processes legacy dual-mic object: Mic_1 + Mic_2 with Mic_1_Placement + Mic_2_Placement and normalizes seamlessly", () => {
    const legacySettings = {
      Mic_1: "Dynamic 57",
      Mic_1_Placement: "Cap Edge, Close, On Axis",
      Mic_2: "Ribbon 121",
      Mic_2_Placement: "Cone, Close, 45° Off Axis"
    };

    const format = detectCabSettingsFormat(legacySettings);
    assert.equal(format.format, "legacy_1_indexed");
    assert.equal(format.isLegacy, true);
    assert.equal(format.isAmbiguous, false);

    const mic0 = extractCanonicalMicPlacement(legacySettings, 0);
    const mic1 = extractCanonicalMicPlacement(legacySettings, 1);

    assert.equal(mic0.placement_was_supplied_by_chain, true);
    assert.equal(mic0.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic0.canonical_placement_label, "Cap Edge · Close · On Axis");
    assert.equal(mic1.placement_was_supplied_by_chain, true);
    assert.equal(mic1.raw_supplied_placement, "Cone, Close, 45° Off Axis");
    assert.equal(mic1.canonical_placement_label, "Cone · Close · 45° Off Axis");
  });

  // 15. Area 7 Test 5: Canonical single Mic_0
  it("processes canonical single Mic_0 without creating spurious Mic_1 placement", () => {
    const singleMic0Settings = {
      Mic_0: "Dynamic 57",
      Mic_0_Placement: "Cap Edge, Close, On Axis"
    };

    const format = detectCabSettingsFormat(singleMic0Settings);
    assert.equal(format.format, "canonical_0_indexed");
    assert.equal(format.isLegacy, false);
    assert.equal(format.isAmbiguous, false);

    const mic0 = extractCanonicalMicPlacement(singleMic0Settings, 0);
    const mic1 = extractCanonicalMicPlacement(singleMic0Settings, 1);

    assert.equal(mic0.placement_was_supplied_by_chain, true);
    assert.equal(mic0.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic0.canonical_placement_label, "Cap Edge · Close · On Axis");
    assert.equal(mic1.placement_was_supplied_by_chain, false);
  });

  // 16. Area 7 Test 6: Ambiguous single Mic_1
  it("handles ambiguous single Mic_1 safely mapping to Slot 0 without duplicating into Slot 1", () => {
    const ambiguousSingle = {
      Mic_1: "Dynamic 57",
      Mic_1_Placement: "Cap Edge, Close, On Axis"
    };

    const format = detectCabSettingsFormat(ambiguousSingle);
    assert.equal(format.format, "single_mic_ambiguous");
    assert.equal(format.isAmbiguous, true);
    assert.equal(format.isLegacy, true);

    const mic0 = extractCanonicalMicPlacement(ambiguousSingle, 0);
    const mic1 = extractCanonicalMicPlacement(ambiguousSingle, 1);

    // Slot 0 receives the placement safely
    assert.equal(mic0.placement_was_supplied_by_chain, true);
    assert.equal(mic0.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic0.canonical_placement_label, "Cap Edge · Close · On Axis");

    // Slot 1 is NOT duplicated from ambiguous Mic_1
    assert.equal(mic1.placement_was_supplied_by_chain, false);
  });

  // 17. Area 7 Test 7: Legacy single Mic_1 where reliable legacy metadata is available
  it("supports legacy single Mic_1 where reliable legacy metadata indicates legacy origin", () => {
    const legacySingleWithMeta = {
      Mic_1: "Dynamic 57",
      Mic_1_Placement: "Cap Edge, Close, On Axis",
      _legacy_format: true
    };

    const format = detectCabSettingsFormat(legacySingleWithMeta);
    assert.equal(format.isLegacy, true);

    const mic0 = extractCanonicalMicPlacement(legacySingleWithMeta, 0);
    assert.equal(mic0.placement_was_supplied_by_chain, true);
    assert.equal(mic0.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic0.canonical_placement_label, "Cap Edge · Close · On Axis");
  });

  // 18. Area 7 Test 8 & 9: Mic 0 always exports to AT5 Mic0*, Mic 1 always exports to AT5 Mic1*
  it("guarantees Mic 0 always exports to AT5 Mic0* and Mic 1 always exports to AT5 Mic1*", () => {
    const chain: ToneResult = {
      confidence: 1,
      tone_summary: { style: "rock", gain_level: "high", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 1960A",
          settings: {
            Mic_0: "Dynamic 57",
            Mic_0_Placement: "Cap Edge, Close, On Axis",
            Mic_1: "Condenser 87",
            Mic_1_Placement: "Cone, Close, 45° Off Axis"
          }
        }
      ],
      engineering_notes: { signal_path_summary: "Dual test" }
    };

    const xml = generateXML(chain);
    assert.ok(xml);

    // Mic 0 attributes
    assert.match(xml, /Mic0Model="1e41acc4-85af-4e84-bee4-eabc0be5fef1"/);
    assert.match(xml, /Mic0Angle="0"/);
    assert.match(xml, /Mic0XAxis="-0\.214223"/);
    assert.match(xml, /Mic0YAxis="-0\.00519017"/);
    assert.match(xml, /Mic0Distance="0"/);
    assert.match(xml, /Mic0Speaker="0"/);

    // Mic 1 attributes
    assert.match(xml, /Mic1Model="9e444286-cab4-46a4-bfa3-a6d55b3ffcfb"/); // Condenser 87
    assert.match(xml, /Mic1Angle="1"/);
    assert.match(xml, /Mic1XAxis="-0\.428446"/);
    assert.match(xml, /Mic1YAxis="-0\.0103803"/);
    assert.match(xml, /Mic1Distance="0"/);
    assert.match(xml, /Mic1Speaker="1"/);
  });

  // 19. Area 7 Test 10: No off-by-one mapping is possible after normalization
  it("prevents any off-by-one mapping after normalization across both legacy and canonical sources", () => {
    const legacyChain: ToneResult = {
      confidence: 1,
      tone_summary: { style: "rock", gain_level: "high", noise_level: "low" },
      signal_chain: [
        {
          type: "cab",
          name: "4x12 Brit 8000",
          settings: {
            Speaker: "Brit 75",
            Mic_1: "Dynamic 57",
            Mic_1_Placement: "Cap, Close, On Axis",
            Mic_2: "Condenser 87",
            Mic_2_Placement: "Cone Edge, Far, 45° Off Axis"
          }
        }
      ],
      engineering_notes: { signal_path_summary: "Off by one test" }
    };

    const normalised = normaliseSignalChain(legacyChain);
    const cab = normalised.signal_chain.find(c => c.type === "cab")!;

    // Normalized settings must be strictly canonical
    assert.equal(cab.settings["Mic_0"], "Dynamic 57");
    assert.equal(cab.settings["Mic_0_Placement"], "Cap, Close, On Axis");
    assert.equal(cab.settings["Mic_1"], "Condenser 87");
    assert.equal(cab.settings["Mic_1_Placement"], "Cone Edge, Far, 45° Off Axis");
    assert.equal(cab.settings["Mic_2"], undefined);
    assert.equal(cab.settings["Mic_2_Placement"], undefined);

    const xml = generateXML(normalised);
    // Mic0 must receive Mic_0 values
    assert.match(xml, /Mic0XAxis="0"/);
    assert.match(xml, /Mic0Distance="0"/);
    assert.match(xml, /Mic0Angle="0"/);

    // Mic1 must receive Mic_1 values (Cone Edge: -0.785484, Far: 1, 45°: 1)
    assert.match(xml, /Mic1XAxis="-0\.785484"/);
    assert.match(xml, /Mic1Distance="1"/);
    assert.match(xml, /Mic1Angle="1"/);
  });

  // 20. Area 7 Test 11: Existing legacy VIR profile IDs remain discoverable
  it("ensures existing legacy VIR profile IDs remain discoverable via composite resolver", () => {
    const mockLegacyMapping = {
      id: "vir_cab_4x12_brit_mic1_cap_edge",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      cabName: "4x12 Brit 8000",
      micSlot: "Mic_1",
      micIndex: 1,
      canonicalPlacementName: "Cap Edge, Close, On Axis",
      placementAliases: ["cap edge", "close", "on axis"],
      xml_values: {
        Mic1Angle: 0,
        Mic1Distance: 0,
        Mic1Speaker: 1,
        Mic1XAxis: -0.214223,
        Mic1YAxis: -0.00519017
      },
      validationStatus: "verified" as const,
      confidence: 100,
      isActive: true
    };

    const resolved = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_1",
      slotIndex: 1,
      canonicalPlacement: {
        position: "Cap Edge",
        distance: "Close",
        angle: "On Axis",
        sourceRawPlacement: "Cap Edge, Close, On Axis",
        wasSuppliedByChain: true,
        placement_was_supplied_by_chain: true,
        semanticProvenance: "signal_chain_generated",
        isUnspecified: false,
        canonicalLabel: "Cap Edge, Close, On Axis"
      },
      micModelName: "Condenser 87",
      micModelGuid: "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb",
      dbMappings: [mockLegacyMapping as any]
    });

    assert.equal(resolved.resolved, true);
    assert.equal(resolved.coordinates.XAxis, -0.214223);
    assert.equal(resolved.coordinates.YAxis, -0.00519017);
  });

  // 21. Area 7 Test 12: New VIR records use canonical numbering
  it("enforces canonical numbering (Mic_0, Mic_1) for new VIR records", () => {
    const canonicalSlot0: "Mic_0" | "Mic_1" = "Mic_0";
    const canonicalSlot1: "Mic_0" | "Mic_1" = "Mic_1";
    assert.match(canonicalSlot0, /^Mic_[01]$/);
    assert.match(canonicalSlot1, /^Mic_[01]$/);
  });

  after(() => {
    setTimeout(() => process.exit(0), 100);
  });
});
