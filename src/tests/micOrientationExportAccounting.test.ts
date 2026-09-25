// src/tests/micOrientationExportAccounting.test.ts
// Unit Tests: Mic Orientation Semantic Field Export & Status Accounting Verification

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getExportDebugData,
  generateXML,
  parseOrientationKeySlot,
  checkOrientationConsumedBySlot
} from "../services/presetExporter";

import {
  extractCanonicalMicPlacement,
  resolveCompositeMicPlacement
} from "../services/at5MicPlacementService";

import { ToneResult } from "../types";

describe("AT5 Cabinet Export / Mic Orientation Semantic Accounting", () => {
  it("Scenario 1: VERIFIED Mic 0 (N) + VERIFIED Mic 1 (W) -> Orientation consumed, NO false PARTIAL, Cab status is PASS", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Verified Dual Mic",
      description: "Dual verified mics with discrete orientation settings",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_0_Orientation": "N",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem, "Cabinet item must exist in exported chain");

    // Check not_exported_detail
    const notExported = cabItem.not_exported_detail || [];
    assert.equal(notExported.length, 0, `not_exported_detail must be empty, but had: ${JSON.stringify(notExported)}`);

    // Status checks
    assert.equal(cabItem.parameter_mapping_status, "SUCCESS", "Cabinet parameter mapping status must be SUCCESS");
    assert.equal(cabItem.final_status, "PASS", "Cabinet final status must be PASS");
    assert.equal(debugData.parameter_mapping_status, "SUCCESS", "Overall parameter mapping status must be SUCCESS");

    // Verification of orientation details
    const orient0Detail = cabItem.details.find(d => d.parameter === "Mic_0_Orientation");
    const orient1Detail = cabItem.details.find(d => d.parameter === "Mic_1_Orientation");

    assert.ok(orient0Detail, "Mic_0_Orientation detail must be recorded in diagnostics");
    assert.equal(orient0Detail.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient0Detail.consumed_by, "Mic 0 Placement");
    assert.equal(orient0Detail.display_value, "N");

    assert.ok(orient1Detail, "Mic_1_Orientation detail must be recorded in diagnostics");
    assert.equal(orient1Detail.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient1Detail.consumed_by, "Mic 1 Placement");
    assert.equal(orient1Detail.display_value, "W");

    // Final XML verifier
    assert.equal(debugData.final_xml_verification?.status, "PASS");
    assert.equal(debugData.final_xml_verification?.discrepancies.length, 0);
  });

  it("Scenario 2: Both mics verified with different orientations (W and N) -> Not hardcoded to single orientation", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Multi Orientation",
      description: "Slot 0 W, Slot 1 N",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, W, Close, On Axis",
            "Mic_0_Orientation": "W",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, N, Close, On Axis",
            "Mic_1_Orientation": "N"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    assert.equal((cabItem.not_exported_detail || []).length, 0);
    assert.equal(cabItem.final_status, "PASS");

    const orient0 = cabItem.details.find(d => d.parameter === "Mic_0_Orientation");
    const orient1 = cabItem.details.find(d => d.parameter === "Mic_1_Orientation");

    assert.equal(orient0?.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient0?.display_value, "W");
    assert.equal(orient1?.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient1?.display_value, "N");
  });

  it("Scenario 3: Uncalibrated orientation gap (e.g. East or South) -> MUST NOT be marked consumed, MUST surface warning/fallback", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Uncalibrated East",
      description: "Slot 0 specifies uncalibrated East orientation",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, E, Close, On Axis",
            "Mic_0_Orientation": "E",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    // Mic 0 used fallback / uncalibrated orientation gap
    const mic0Placement = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    assert.ok(mic0Placement);
    assert.equal(mic0Placement.fallback_used, true);

    // Mic_0_Orientation MUST NOT be CONSUMED_BY_COMPOSITE
    const orient0 = cabItem.details.find(d => d.parameter === "Mic_0_Orientation");
    assert.notEqual(orient0?.mapping_status, "CONSUMED_BY_COMPOSITE");

    // Cabinet status must reflect fallback/partial, not clean PASS
    assert.notEqual(cabItem.final_status, "PASS");
  });

  it("Scenario 4: Malformed or unsupported orientation -> Must NOT be silently classified as consumed", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Malformed Orientation",
      description: "Slot 0 specifies invalid orientation value",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_0_Orientation": "INVALID_CARDINAL_DIRECTION",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    // The invalid orientation MUST be in not_exported_detail
    const notExported = cabItem.not_exported_detail || [];
    assert.ok(
      notExported.some(d => d.includes("Mic_0_Orientation")),
      `not_exported_detail must contain Mic_0_Orientation, got: ${JSON.stringify(notExported)}`
    );

    // Status must be PARTIAL due to unexported/unmapped setting
    assert.equal(cabItem.parameter_mapping_status, "PARTIAL");
    assert.equal(cabItem.final_status, "PARTIAL");

    const orient0 = cabItem.details.find(d => d.parameter === "Mic_0_Orientation");
    assert.notEqual(orient0?.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient0?.mapping_status, "UNVERIFIED");
  });

  it("Scenario 5: Genuine unrelated unexported cabinet setting -> Must still produce PARTIAL", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Unrelated Setting",
      description: "Valid mics plus an unrelated unexported setting",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_0_Orientation": "N",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W",
            "Unknown_Cabinet_Knob": "7.5"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    // Both orientations should be consumed
    const orient0 = cabItem.details.find(d => d.parameter === "Mic_0_Orientation");
    const orient1 = cabItem.details.find(d => d.parameter === "Mic_1_Orientation");
    assert.equal(orient0?.mapping_status, "CONSUMED_BY_COMPOSITE");
    assert.equal(orient1?.mapping_status, "CONSUMED_BY_COMPOSITE");

    // But Unknown_Cabinet_Knob MUST cause PARTIAL
    const notExported = cabItem.not_exported_detail || [];
    assert.ok(notExported.some(d => d.includes("Unknown_Cabinet_Knob")));
    assert.equal(cabItem.parameter_mapping_status, "PARTIAL");
    assert.equal(cabItem.final_status, "PARTIAL");
  });

  it("Scenario 6: Cap placement is orientationless and behaves correctly", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Cap Placement",
      description: "Cap placement has no cardinal orientation",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap, Close, On Axis",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W"
          }
        }
      ]
    };

    const debugData = getExportDebugData(toneResult);
    const cabItem = debugData.exported_chain.find(i => i.element_name === "4x12 Brit 8000");
    assert.ok(cabItem);

    assert.equal((cabItem.not_exported_detail || []).length, 0);
    assert.equal(cabItem.final_status, "PASS");

    const mic0 = cabItem.details.find(d => d.parameter === "Mic 0 Placement");
    assert.equal(mic0?.verification_status, "VERIFIED");
  });

  it("Scenario 7: Helper functions parseOrientationKeySlot and checkOrientationConsumedBySlot behave deterministically", () => {
    // parseOrientationKeySlot
    assert.equal(parseOrientationKeySlot("Mic_0_Orientation", false), 0);
    assert.equal(parseOrientationKeySlot("mic 0 orientation", false), 0);
    assert.equal(parseOrientationKeySlot("Mic_1_Orientation", false), 1);
    assert.equal(parseOrientationKeySlot("Mic_1_Orientation", true), 0); // Legacy mode
    assert.equal(parseOrientationKeySlot("Mic_2_Orientation", true), 1); // Legacy mode
    assert.equal(parseOrientationKeySlot("orientation", false), "generic");
    assert.equal(parseOrientationKeySlot("Mic_0_Distance", false), null);

    // checkOrientationConsumedBySlot with valid placement
    const activePl = extractCanonicalMicPlacement({ "Mic_0_Placement": "Cap Edge, N, Close, On Axis" }, 0);
    const resM = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      slotIndex: 0,
      canonicalPlacement: activePl
    });
    const xmlValues = {
      Mic0Angle: resM.coordinates.Angle,
      Mic0XAxis: resM.coordinates.XAxis,
      Mic0YAxis: resM.coordinates.YAxis,
      Mic0Distance: resM.coordinates.Distance,
      Mic0Speaker: resM.coordinates.Speaker
    };

    // Correct match
    const checkValid = checkOrientationConsumedBySlot("N", 0, activePl, resM, xmlValues, true);
    assert.equal(checkValid.isConsumed, true);
    assert.equal(checkValid.consumedBy, "Mic 0 Placement");

    // Orientation mismatch
    const checkMismatch = checkOrientationConsumedBySlot("W", 0, activePl, resM, xmlValues, true);
    assert.equal(checkMismatch.isConsumed, false);

    // XML verification mismatch
    const checkXmlMismatch = checkOrientationConsumedBySlot("N", 0, activePl, resM, xmlValues, false);
    assert.equal(checkXmlMismatch.isConsumed, false);

    // Cap rejection of cardinal orientation
    const capPl = extractCanonicalMicPlacement({ "Mic_0_Placement": "Cap, Close, On Axis" }, 0);
    const checkCapWithN = checkOrientationConsumedBySlot("N", 0, capPl, resM, xmlValues, true);
    assert.equal(checkCapWithN.isConsumed, false);
    assert.ok(checkCapWithN.reason?.includes("Cap is strictly orientationless"));
  });

  it("Scenario 8: Exported preset XML output is identical before and after status accounting fix", () => {
    const toneResult: ToneResult = {
      preset_name: "Brit 8000 Dual Mic",
      description: "Dual mic coordinates verification",
      signal_chain: [
        {
          model: "4x12 Brit 8000",
          name: "4x12 Brit 8000",
          type: "cab",
          settings: {
            "Speaker": "1",
            "Mic_0": "Dynamic 57",
            "Mic_0_Placement": "Cap Edge, N, Close, On Axis",
            "Mic_0_Orientation": "N",
            "Mic_1": "Condenser 87",
            "Mic_1_Placement": "Cone, W, Close, On Axis",
            "Mic_1_Orientation": "W"
          }
        }
      ]
    };

    const xml = generateXML(toneResult);
    assert.ok(xml.includes("<Cabinet") || xml.includes("Cab"), "XML must contain cabinet element");

    // Exact coordinate checks
    assert.ok(xml.includes(`Mic0Angle="0"`), "Mic0Angle must be 0");
    assert.ok(xml.includes(`Mic0XAxis="0"`), "Mic0XAxis must be 0");
    assert.ok(xml.includes(`Mic0YAxis="-0.214223"`), "Mic0YAxis must be -0.214223");
    assert.ok(xml.includes(`Mic0Distance="0"`), "Mic0Distance must be 0");
    assert.ok(xml.includes(`Mic0Speaker="0"`), "Mic0Speaker must be 0");

    assert.ok(xml.includes(`Mic1Angle="0"`), "Mic1Angle must be 0");
    assert.ok(xml.includes(`Mic1XAxis="-0.428446"`), "Mic1XAxis must be -0.428446");
    assert.ok(xml.includes(`Mic1YAxis="0"`), "Mic1YAxis must be 0");
    assert.ok(xml.includes(`Mic1Distance="0"`), "Mic1Distance must be 0");
    assert.ok(xml.includes(`Mic1Speaker="1"`), "Mic1Speaker must be 1");
  });
});
