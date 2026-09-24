// src/tests/micPlacementDiagnosticClarity.test.ts
// Tests for Mic Placement Diagnostics in PARTIAL_WITH_FALLBACK and Multi-Mic Combinations

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { getExportDebugData, generateXML } from "../services/presetExporter";
import { setDbMicPlacementMappings } from "../services/at5ParameterManifest";
import { ToneResult, MicPlacementMapping } from "../types";

describe("Mic Placement Diagnostic Clarity & Multi-Mic Fallback Attribution", () => {
  after(() => {
    // Reset any custom mappings
    setDbMicPlacementMappings([]);
  });

  it("Combination A: Both Mic 0 and Mic 1 verified -> No fallback contribution to Cab status", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Combo A",
      description: "Both mics verified",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_1": "Dynamic 57",
            "Mic_1_Placement": "Cone, N, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem, "Cab item must exist");

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1Detail = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0Detail, "Mic 0 Placement detail must exist");
    assert.ok(mic1Detail, "Mic 1 Placement detail must exist");

    // Both must be verified
    assert.equal(mic0Detail.fallback_used, false);
    assert.equal(mic0Detail.verification_status, "VERIFIED");
    assert.equal(mic0Detail.coordinate_resolution_source, "reference_calibration_vir");

    assert.equal(mic1Detail.fallback_used, false);
    assert.equal(mic1Detail.verification_status, "VERIFIED");
    assert.equal(mic1Detail.coordinate_resolution_source, "reference_calibration_vir");

    // Cab should not be PARTIAL_WITH_FALLBACK
    assert.notEqual(cabItem.final_status, "PARTIAL_WITH_FALLBACK");
    assert.notEqual(cabItem.parameter_mapping_status, "PARTIAL_WITH_FALLBACK");
  });

  it("Combination B: Mic 0 Fallback + Mic 1 Verified -> Top-level reason explicitly identifies Mic 0", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Combo B",
      description: "Mic 0 fallback (East uncalibrated), Mic 1 verified (North)",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, E, Close, On Axis",
            "Mic_1": "Dynamic 57",
            "Mic_1_Placement": "Cone, N, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem, "Cab item must exist");

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1Detail = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0Detail);
    assert.ok(mic1Detail);

    // Mic 0 has fallback
    assert.equal(mic0Detail.fallback_used, true);
    assert.equal(mic0Detail.verification_status, "FALLBACK_USED");
    assert.equal(mic0Detail.coordinate_resolution_source, "safe_fallback");

    // Mic 1 is verified
    assert.equal(mic1Detail.fallback_used, false);
    assert.equal(mic1Detail.verification_status, "VERIFIED");
    assert.equal(mic1Detail.coordinate_resolution_source, "reference_calibration_vir");

    // Cab is PARTIAL_WITH_FALLBACK
    assert.equal(cabItem.final_status, "PARTIAL_WITH_FALLBACK");
    assert.equal(cabItem.parameter_mapping_status, "PARTIAL_WITH_FALLBACK");

    // Top-level reason must explicitly identify Mic 0
    assert.match(cabItem.reason, /^PARTIAL_WITH_FALLBACK: Mic 0 placement fallback — /);
    assert.match(cabItem.reason, /Cap Edge · E · Close · On Axis is awaiting verified AT5 calibration/);
    assert.doesNotMatch(cabItem.reason, /Mic 1 placement fallback/);
  });

  it("Combination C: Mic 0 Verified + Mic 1 Fallback -> Top-level reason explicitly identifies Mic 1", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Combo C",
      description: "Mic 0 verified (North), Mic 1 fallback (East uncalibrated)",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_1": "Dynamic 57",
            "Mic_1_Placement": "Cone, E, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1Detail = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0Detail);
    assert.ok(mic1Detail);

    // Mic 0 is verified
    assert.equal(mic0Detail.fallback_used, false);
    assert.equal(mic0Detail.verification_status, "VERIFIED");
    assert.equal(mic0Detail.coordinate_resolution_source, "reference_calibration_vir");

    // Mic 1 has fallback
    assert.equal(mic1Detail.fallback_used, true);
    assert.equal(mic1Detail.verification_status, "FALLBACK_USED");
    assert.equal(mic1Detail.coordinate_resolution_source, "safe_fallback");

    // Cab is PARTIAL_WITH_FALLBACK
    assert.equal(cabItem.final_status, "PARTIAL_WITH_FALLBACK");

    // Top-level reason must explicitly identify Mic 1
    assert.match(cabItem.reason, /^PARTIAL_WITH_FALLBACK: Mic 1 placement fallback — /);
    assert.match(cabItem.reason, /Cone · E · Close · On Axis is awaiting verified AT5 calibration/);
    assert.doesNotMatch(cabItem.reason, /Mic 0 placement fallback/);
  });

  it("Combination D: Mic 0 Fallback + Mic 1 Fallback -> Top-level reason identifies BOTH microphones without hiding either failure", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Combo D",
      description: "Both mics fallback (East and South uncalibrated)",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, E, Close, On Axis",
            "Mic_1": "Dynamic 57",
            "Mic_1_Placement": "Cone, S, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1Detail = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0Detail);
    assert.ok(mic1Detail);

    // Both have fallback
    assert.equal(mic0Detail.fallback_used, true);
    assert.equal(mic0Detail.verification_status, "FALLBACK_USED");

    assert.equal(mic1Detail.fallback_used, true);
    assert.equal(mic1Detail.verification_status, "FALLBACK_USED");

    // Cab is PARTIAL_WITH_FALLBACK
    assert.equal(cabItem.final_status, "PARTIAL_WITH_FALLBACK");

    // Top-level reason must explicitly identify both Mic 0 and Mic 1
    assert.match(cabItem.reason, /^PARTIAL_WITH_FALLBACK: Mic 0 & Mic 1 placement fallbacks — /);
    assert.match(cabItem.reason, /Mic 0 \(Cap Edge · E · Close · On Axis\)/);
    assert.match(cabItem.reason, /Mic 1 \(Cone · S · Close · On Axis\)/);
  });

  it("verifies a valid Cap placement at center (X=0, Y=0) is NOT labelled FALLBACK", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Cap Center",
      description: "Cap center resolves to 0,0 and must be VERIFIED",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    assert.ok(mic0Detail);

    assert.equal(mic0Detail.fallback_used, false);
    assert.equal(mic0Detail.verification_status, "VERIFIED");
    assert.equal(mic0Detail.coordinate_resolution_source, "reference_calibration_vir");
  });

  it("verifies Tier 1 custom Firestore mapping resolves with VERIFIED status", () => {
    const customMappings: MicPlacementMapping[] = [
      {
        id: "custom_m0_test",
        gear: "4x12 Brit 8000",
        cabName: "4x12 Brit 8000",
        cabGuid: "12345678-1234-1234-1234-1234567890ab",
        micSlot: "Mic_0",
        micIndex: 0,
        friendly_setting: "Mic_0_Placement",
        friendly_value: "Custom Edge",
        canonicalPlacementName: "Cap Edge, Close, On Axis",
        micModelScope: "any",
        status: "validated",
        maps_to: {
          Mic0Angle: 0,
          Mic0XAxis: -0.15,
          Mic0YAxis: -0.15,
          Mic0Distance: 0,
          Mic0Speaker: 0
        }
      }
    ];

    setDbMicPlacementMappings(customMappings);

    const toneResult: ToneResult = {
      preset_name: "Test Tier 1",
      description: "Custom mapping",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0Detail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    assert.ok(mic0Detail);

    assert.equal(mic0Detail.fallback_used, false);
    assert.equal(mic0Detail.verification_status, "VERIFIED");
    assert.ok(
      mic0Detail.coordinate_resolution_source === "calibrated_profile" ||
      mic0Detail.coordinate_resolution_source === "firestore_verified",
      `Expected calibrated_profile or firestore_verified, got ${mic0Detail.coordinate_resolution_source}`
    );
  });

  it("verifies UI status derivation helper getMicPlacementRowStatus handles all states accurately", async () => {
    const { getMicPlacementRowStatus } = await import("../components/AT5SignalChainView");

    // 1. Verified with VIR calibration
    const virParam = {
      parameter: "Mic 0 Placement",
      display_value: "Cap Edge · N · Close · On Axis",
      mapping_status: "RESOLVED_COMPOSITE",
      verification_status: "VERIFIED",
      coordinate_resolution_source: "reference_calibration_vir",
      fallback_used: false
    };
    const virStatus = getMicPlacementRowStatus(virParam);
    assert.equal(virStatus.statusBadgeText, "VERIFIED");
    assert.match(virStatus.statusBadgeClass, /emerald/);
    assert.match(virStatus.statusTooltip, /reference_calibration_vir/);
    assert.equal(virStatus.secondaryNote, "");

    // 2. Fallback used
    const fallbackParam = {
      parameter: "Mic 0 Placement",
      display_value: "Cap Edge · E · Close · On Axis",
      mapping_status: "FALLBACK_COMPOSITE",
      verification_status: "FALLBACK_USED",
      coordinate_resolution_source: "safe_fallback",
      fallback_used: true,
      fallback_reason: "Cap Edge · E · Close · On Axis is awaiting verified AT5 calibration. Exporting safe standard coordinates."
    };
    const fallbackStatus = getMicPlacementRowStatus(fallbackParam);
    assert.equal(fallbackStatus.statusBadgeText, "FALLBACK");
    assert.match(fallbackStatus.statusBadgeClass, /amber/);
    assert.match(fallbackStatus.rowBorderBg, /amber/);
    assert.match(fallbackStatus.secondaryNote, /awaiting verified AT5 calibration/);

    // 3. Not specified
    const notSpecParam = {
      parameter: "Mic 0 Placement",
      display_value: "Not specified",
      mapping_status: "NOT_SPECIFIED",
      verification_status: "NOT_SPECIFIED",
      fallback_used: false
    };
    const notSpecStatus = getMicPlacementRowStatus(notSpecParam);
    assert.equal(notSpecStatus.statusBadgeText, "NOT SPECIFIED");
    assert.match(notSpecStatus.statusBadgeClass, /slate/);

    // 4. Discrepancy
    const discParam = {
      parameter: "Mic 0 Placement",
      display_value: "Cap Edge, Close, On Axis",
      mapping_status: "FAIL",
      verification_status: "DISCREPANCY",
      conversion_note: "Discrepancy detected in numeric coordinates",
      fallback_used: false
    };
    const discStatus = getMicPlacementRowStatus(discParam);
    assert.equal(discStatus.statusBadgeText, "DISCREPANCY");
    assert.match(discStatus.statusBadgeClass, /rose/);
    assert.match(discStatus.secondaryNote, /Discrepancy detected/);
  });

  it("verifies Mic 0 and Mic 1 slots cannot become swapped and non-mic parameters remain unaffected", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Integrity",
      description: "Slot integrity test",
      signal_chain: [
        {
          model: "British Tube Lead 1",
          name: "British Tube Lead 1",
          type: "amp",
          settings: {
            "Gain": 7.5,
            "Bass": 5.0,
            "Mid": 6.0,
            "Treble": 7.0
          }
        },
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_1": "Dynamic 57",
            "Mic_1_Placement": "Cone, E, Close, On Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    
    // Check amp parameters are completely unaffected
    const ampItem = debugData.exported_chain.find(i => i.element_name === "British Tube Lead 1");
    assert.ok(ampItem);
    const gainDetail = ampItem.details.find(d => d.parameter === "Gain");
    assert.ok(gainDetail);
    assert.notEqual(gainDetail.mapping_status, "FALLBACK_COMPOSITE");

    // Check cab slots strictly preserve Mic 0 as Mic 0 and Mic 1 as Mic 1
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0 = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1 = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0);
    assert.ok(mic1);

    // Mic 0 was North -> VERIFIED
    assert.equal(mic0.fallback_used, false);
    assert.equal(mic0.verification_status, "VERIFIED");
    assert.match(mic0.display_value, /Cap Edge/);

    // Mic 1 was East -> FALLBACK
    assert.equal(mic1.fallback_used, true);
    assert.equal(mic1.verification_status, "FALLBACK_USED");
    assert.match(mic1.display_value, /Cone/);
  });
});
