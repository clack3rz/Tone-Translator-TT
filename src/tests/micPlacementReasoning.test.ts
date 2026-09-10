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
  extractCanonicalMicPlacement
} from "../services/at5MicPlacementService";

import {
  determineMicrophoneRole,
  reasonSemanticMicPlacement,
  ensureSignalChainSemanticPlacements,
  formatMicrophoneDebug
} from "../services/at5MicPlacementReasoning";

import { translateTone } from "../services/geminiService";
import { getExportDebugData } from "../services/presetExporter";
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
    assert.equal(decision.distance, "Close");
    assert.equal(decision.angle, "On Axis");
    assert.equal(decision.placementString, "Cap Edge, Close, On Axis");
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
    assert.equal(m1.placementString, "Cap Edge, Close, On Axis");

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
        distance: m1.distance,
        angle: m1.angle
      }
    });

    assert.equal(m2.position, "Cone");
    assert.equal(m2.distance, "Close");
    assert.equal(m2.angle, "45° Off Axis");
    assert.equal(m2.placementString, "Cone, Close, 45° Off Axis");
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
    assert.equal(m2.distance, "Close");
    assert.equal(m2.angle, "On Axis");
    assert.equal(m2.placementString, "Cone, Close, On Axis");
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

    assert.equal(cabSettings["Mic_1_Placement"], "Cap Edge, Close, On Axis");
    assert.equal(cabSettings["Mic_2_Placement"], "Cone, Close, 45° Off Axis");
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

    assert.equal(cabSettings["Mic_1_Placement"], "Cap Edge, Close, On Axis");
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

    // Signal chain settings must explicitly have complete triplets
    assert.equal(cab.settings["Mic_1_Placement"], "Cap Edge, Close, On Axis");
    assert.equal(cab.settings["Mic_2_Placement"], "Cone, Close, 45° Off Axis");

    // Engineering notes must include microphone debug breakdown
    assert.ok(chain.engineering_notes.microphone_debug, "Microphone debug notes must be present");
    assert.match(chain.engineering_notes.microphone_debug!, /Role: primary attack\/presence mic/);
    assert.match(chain.engineering_notes.microphone_debug!, /Role: warmth\/fizz-control mic/);

    // Export debug data and inspect Cab Raw Diagnostics
    const debugData = getExportDebugData(chain);
    const cabItem = debugData.exported_chain.find(item => item.type === "cab");
    assert.ok(cabItem, "Cab item must be found in exported chain");

    // Check original_settings and normalized_settings have explicit placement values
    assert.equal(cabItem.original_settings["Mic_1_Placement"], "Cap Edge, Close, On Axis");
    assert.equal(cabItem.original_settings["Mic_2_Placement"], "Cone, Close, 45° Off Axis");
    assert.equal(cabItem.normalized_settings["Mic_1_Placement"], "Cap Edge, Close, On Axis");
    assert.equal(cabItem.normalized_settings["Mic_2_Placement"], "Cone, Close, 45° Off Axis");

    // Lineage provenance flags must report placement_was_supplied_by_chain: true
    const mic0Canon = extractCanonicalMicPlacement(cab.settings, 0);
    const mic1Canon = extractCanonicalMicPlacement(cab.settings, 1);
    assert.equal(mic0Canon.placement_was_supplied_by_chain, true);
    assert.equal(mic1Canon.placement_was_supplied_by_chain, true);
    assert.equal(mic0Canon.raw_supplied_placement, "Cap Edge, Close, On Axis");
    assert.equal(mic1Canon.raw_supplied_placement, "Cone, Close, 45° Off Axis");

    // Coordinate resolution source vs semantic provenance distinction
    const mic0Param = cabItem.parameter_details?.find(p => p.parameter === "Mic 0 Placement");
    const mic1Param = cabItem.parameter_details?.find(p => p.parameter === "Mic 1 Placement");
    assert.ok(mic0Param, "Mic 0 parameter detail must exist");
    assert.ok(mic1Param, "Mic 1 parameter detail must exist");
    assert.equal(mic0Param.semantic_provenance, "signal_chain_generated");
    assert.equal(mic1Param.semantic_provenance, "signal_chain_generated");
    assert.equal(mic0Param.coordinate_resolution_source, "reference_calibration_vir");
    assert.equal(mic1Param.coordinate_resolution_source, "safe_fallback");

    // Ribbon 121 coordinate fallback must NOT alter or weaken its semantic reasoning in microphone_debug
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

  after(() => {
    setTimeout(() => process.exit(0), 100);
  });
});
