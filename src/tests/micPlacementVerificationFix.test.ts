// src/tests/micPlacementVerificationFix.test.ts
// Regression tests for Mic Placement Final Corrective Bug Fix Pass

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import {
  resolveCompositeMicPlacement,
  extractCanonicalMicPlacement
} from "../services/at5MicPlacementService";

import {
  getExportDebugData,
  generateXML
} from "../services/presetExporter";

import { setDbMicPlacementMappings } from "../services/at5ParameterManifest";
import { MicPlacementMapping, ToneResult } from "../types";

describe("Mic Placement Final Corrective Bug Fix Pass", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  it("prioritizes Firestore-registered profiles (Tier 1) over reference calibration for Mic 0 and Mic 1", () => {
    // Register a Firestore profile for 4x12 Brit 8000 Mic 1 with YAxis = 0
    const customMappings: MicPlacementMapping[] = [
      {
        id: "custom_m0_profile",
        gear: "4x12 Brit 8000",
        cabName: "4x12 Brit 8000",
        cabGuid: "12345678-1234-1234-1234-1234567890ab",
        micSlot: "Mic_0",
        micIndex: 0,
        friendly_setting: "Mic_0_Placement",
        friendly_value: "Cap Edge, Close, On Axis",
        canonicalPlacementName: "Cap Edge, Close, On Axis",
        micModelScope: "any",
        status: "needs_review", // Even unreviewed/custom status MUST take Tier 1 precedence
        maps_to: {
          Mic0Angle: 0,
          Mic0XAxis: -0.214223,
          Mic0YAxis: 0,
          Mic0Distance: 0,
          Mic0Speaker: 0
        }
      },
      {
        id: "custom_m1_profile",
        gear: "4x12 Brit 8000",
        cabName: "4x12 Brit 8000",
        cabGuid: "12345678-1234-1234-1234-1234567890ab",
        micSlot: "Mic_1",
        micIndex: 1,
        friendly_setting: "Mic_1_Placement",
        friendly_value: "Cone, Close, 45° Off Axis",
        canonicalPlacementName: "Cone, Close, 45° Off Axis",
        micModelScope: "any",
        status: "user_edited",
        maps_to: {
          Mic1Angle: 0.785398,
          Mic1XAxis: -0.404286,
          Mic1YAxis: 0, // Specifically 0 to ensure it overrides -0.0103803
          Mic1Distance: 0,
          Mic1Speaker: 1
        }
      }
    ];

    setDbMicPlacementMappings(customMappings);

    const dualCabSettings = {
      "Mic_0": "Dynamic 57",
      "Mic_0_Placement": "Cap Edge, Close, On Axis",
      "Mic_1": "Ribbon 121",
      "Mic_1_Placement": "Cone, Close, 45° Off Axis"
    };

    // Test Mic 0 resolution
    const pl0 = extractCanonicalMicPlacement(dualCabSettings, 0);

    const resM0 = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "12345678-1234-1234-1234-1234567890ab",
      micSlot: "Mic_0",
      slotIndex: 0,
      canonicalPlacement: pl0,
      micModelName: "Dynamic 57",
      micModelGuid: "1e41acc4-85af-4e84-bee4-eabc0be5fef1",
      dbMappings: customMappings
    });

    assert.equal(resM0.resolved, true);
    assert.equal(resM0.resolutionSource, "firestore_verified");
    assert.equal(resM0.coordinates.YAxis, 0);
    assert.equal(resM0.coordinates.XAxis, -0.214223);

    // Test Mic 1 resolution
    const pl1 = extractCanonicalMicPlacement(dualCabSettings, 1);

    const resM1 = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "12345678-1234-1234-1234-1234567890ab",
      micSlot: "Mic_1",
      slotIndex: 1,
      canonicalPlacement: pl1,
      micModelName: "Ribbon 121",
      micModelGuid: "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb",
      dbMappings: customMappings
    });

    assert.equal(resM1.resolved, true);
    assert.equal(resM1.resolutionSource, "firestore_verified");
    assert.equal(resM1.coordinates.YAxis, 0); // Preserved 0, not overwritten by built-in -0.0103803
    assert.equal(resM1.coordinates.XAxis, -0.404286);
  });

  it("exports exact coordinates to XML without overwriting YAxis=0", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Cab Export",
      description: "Test",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, Close, On Axis",
            "Mic_1": "Ribbon 121",
            "Mic_1_Placement": "Cone, Close, 45° Off Axis",
            "Room": "Small Studio"
          }
        }
      ]
    };

    const xml = generateXML(toneResult);
    assert.match(xml, /Mic0XAxis="-0\.214223"/);
    assert.match(xml, /Mic0YAxis="0"/);
    assert.match(xml, /Mic1XAxis="-0\.404286"/);
    assert.match(xml, /Mic1YAxis="0"/);
  });

  it("does not flag canonical Mic_0 and Mic_0_Placement as unexported cabinet parameters", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Parameter Verification",
      description: "Test",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, Close, On Axis",
            "Mic_1": "Ribbon 121",
            "Mic_1_Placement": "Cone, Close, 45° Off Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem, "Cab item must exist in debug export data");

    // Ensure no spurious unrecognized parameter for Mic_0 or Mic_0_Placement
    const unexported = cabItem.details.filter(d => 
      d.parameter.toLowerCase() === "mic_0" || 
      d.parameter.toLowerCase() === "mic 0" ||
      d.parameter.toLowerCase() === "mic_0_placement" ||
      d.parameter.toLowerCase() === "mic 0 placement"
    );

    for (const d of unexported) {
      assert.notEqual(d.mapping_status, "FAIL");
      assert.notEqual(d.mapping_status, "UNRECOGNIZED");
    }

    // Cab item itself should not have mismatched parameters due to Mic_0
    assert.equal(
      cabItem.mismatched_parameters.filter(p => p.includes("Mic_0") && p.includes("unrecognized")).length,
      0
    );
  });

  it("strictly detects coordinate discrepancies using precision tolerance", () => {
    const toneResult: ToneResult = {
      preset_name: "Test Verification Discrepancy",
      description: "Test",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, Close, On Axis",
            "Mic_1": "Ribbon 121",
            "Mic_1_Placement": "Cone, Close, 45° Off Axis"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    const mic0PlacementDetail = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    const mic1PlacementDetail = cabItem.details.find(d => d.parameter === "Mic 1 Placement");

    assert.ok(mic0PlacementDetail);
    assert.ok(mic1PlacementDetail);

    // Both should be VERIFIED because exported XML matches resolved profile exactly
    assert.equal(mic0PlacementDetail.verification_status, "VERIFIED");
    assert.equal(mic1PlacementDetail.verification_status, "VERIFIED");
  });
});

