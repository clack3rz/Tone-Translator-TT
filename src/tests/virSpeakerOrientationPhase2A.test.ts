// src/tests/virSpeakerOrientationPhase2A.test.ts
// Phase 2A Unit Tests: VIR Speaker Orientation — Verified North Reference Calibration

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import {
  VIR_CALIBRATION_COORDINATES,
  VIR_REFERENCE_GRID_KEYS,
  getVIRCalibrationCoordinates,
  resetVIRCalibrationOverrides,
  resolveCompositeMicPlacement,
  parseSemanticPlacement,
  formatSemanticPlacement,
  extractCanonicalMicPlacement
} from "../services/at5MicPlacementService";

import {
  resolveCabMicPlacementAttrs,
  generateXML
} from "../services/presetExporter";

import { SignalChainElement, ToneResult } from "../types";

describe("VIR Speaker Orientation — Phase 2A: Verified North Reference Calibration", () => {
  after(() => {
    resetVIRCalibrationOverrides();
  });

  it("registers exact North coordinates in authoritative VIR reference calibration data", () => {
    const coords = getVIRCalibrationCoordinates();

    // 1. Cap Edge N
    const capEdgeN = coords.positions["Cap Edge N"];
    assert.ok(capEdgeN, "Cap Edge N must exist in reference positions");
    assert.equal(capEdgeN.X, 0, "Cap Edge N X must be exact 0");
    assert.equal(capEdgeN.Y, -0.214223, "Cap Edge N Y must be -0.214223");
    assert.equal(capEdgeN.isCalibrated, true, "Cap Edge N status must be calibrated");

    // 2. Cone N
    const coneN = coords.positions["Cone N"];
    assert.ok(coneN, "Cone N must exist in reference positions");
    assert.equal(coneN.X, 0, "Cone N X must be exact 0");
    assert.equal(coneN.Y, -0.428446, "Cone N Y must be -0.428446");
    assert.equal(coneN.isCalibrated, true, "Cone N status must be calibrated");

    // 3. Cone Edge N
    const coneEdgeN = coords.positions["Cone Edge N"];
    assert.ok(coneEdgeN, "Cone Edge N must exist in reference positions");
    assert.equal(coneEdgeN.X, 0, "Cone Edge N X must be exact 0");
    assert.equal(coneEdgeN.Y, -0.785484, "Cone Edge N Y must be -0.785484");
    assert.equal(coneEdgeN.isCalibrated, true, "Cone Edge N status must be calibrated");
  });

  it("contains exactly 13 canonical speaker-face reference grid keys in order", () => {
    const expectedKeys = [
      "Cap",
      "Cap Edge W",
      "Cap Edge N",
      "Cap Edge E",
      "Cap Edge S",
      "Cone W",
      "Cone N",
      "Cone E",
      "Cone S",
      "Cone Edge W",
      "Cone Edge N",
      "Cone Edge E",
      "Cone Edge S"
    ];
    assert.deepEqual(VIR_REFERENCE_GRID_KEYS, expectedKeys);
  });

  it("resolves Cap Edge · N · Close · On Axis via Tier 2 reference calibration without Firestore profiles", () => {
    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap Edge, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: [] // Strictly empty: proves independence from Tier 1 Firestore profiles
    });

    assert.equal(res.resolved, true);
    assert.equal(res.resolutionSource, "reference_calibration_vir");
    assert.equal(res.isReferenceCalibration, true);
    assert.equal(res.isCalibrated, true);
    assert.equal(res.coordinates.XAxis, 0);
    assert.equal(res.coordinates.YAxis, -0.214223);
    assert.equal(res.coordinates.Distance, 0);
    assert.equal(res.coordinates.Angle, 0);
    assert.equal(res.coordinates.Speaker, 0);
  });

  it("resolves Cone · N · Close · On Axis via Tier 2 reference calibration without Firestore profiles", () => {
    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: [] // Strictly empty: proves independence from Tier 1 Firestore profiles
    });

    assert.equal(res.resolved, true);
    assert.equal(res.resolutionSource, "reference_calibration_vir");
    assert.equal(res.isReferenceCalibration, true);
    assert.equal(res.isCalibrated, true);
    assert.equal(res.coordinates.XAxis, 0);
    assert.equal(res.coordinates.YAxis, -0.428446);
    assert.equal(res.coordinates.Distance, 0);
    assert.equal(res.coordinates.Angle, 0);
    assert.equal(res.coordinates.Speaker, 0);
  });

  it("resolves Cone Edge · N · Close · On Axis via Tier 2 reference calibration without Firestore profiles", () => {
    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone Edge, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: [] // Strictly empty: proves independence from Tier 1 Firestore profiles
    });

    assert.equal(res.resolved, true);
    assert.equal(res.resolutionSource, "reference_calibration_vir");
    assert.equal(res.isReferenceCalibration, true);
    assert.equal(res.isCalibrated, true);
    assert.equal(res.coordinates.XAxis, 0);
    assert.equal(res.coordinates.YAxis, -0.785484);
    assert.equal(res.coordinates.Distance, 0);
    assert.equal(res.coordinates.Angle, 0);
    assert.equal(res.coordinates.Speaker, 0);
  });

  it("preserves Phase 1 safeguards: East and South remain uncalibrated orientation gaps", () => {
    const eastPositions = ["Cap Edge", "Cone", "Cone Edge"] as const;
    for (const pos of eastPositions) {
      const resE = resolveCompositeMicPlacement({
        cabName: "4x12 Brit 8000",
        cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
        micSlot: "Mic_0",
        requestedLabel: `${pos}, E, Close, On Axis`,
        micModelName: "Dynamic 57",
        dbMappings: []
      });

      assert.equal(resE.resolved, false, `${pos} E must not resolve`);
      assert.equal(resE.resolutionSource, "uncalibrated_orientation_gap");
      assert.equal(resE.isCalibrated, false);
      assert.ok(resE.warning?.includes("awaiting verified AT5 calibration"));
      assert.equal(resE.coordinates.XAxis, 0);
      assert.equal(resE.coordinates.YAxis, 0);

      const resS = resolveCompositeMicPlacement({
        cabName: "4x12 Brit 8000",
        cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
        micSlot: "Mic_0",
        requestedLabel: `${pos}, S, Close, On Axis`,
        micModelName: "Dynamic 57",
        dbMappings: []
      });

      assert.equal(resS.resolved, false, `${pos} S must not resolve`);
      assert.equal(resS.resolutionSource, "uncalibrated_orientation_gap");
      assert.equal(resS.isCalibrated, false);
      assert.ok(resS.warning?.includes("awaiting verified AT5 calibration"));
      assert.equal(resS.coordinates.XAxis, 0);
      assert.equal(resS.coordinates.YAxis, 0);
    }
  });

  it("preserves Phase 1 safeguards: legacy placement without orientation resolves as West", () => {
    // Legacy 3-part: Cone, Close, On Axis
    const resLegacy = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resLegacy.resolved, true);
    assert.equal(resLegacy.resolutionSource, "reference_calibration_vir");
    assert.equal(resLegacy.isCalibrated, true);
    assert.equal(resLegacy.coordinates.XAxis, -0.428446);
    assert.equal(resLegacy.coordinates.YAxis, -0.0103803);
  });

  it("preserves Phase 1 safeguards: explicit W remains identical to legacy placement", () => {
    const resLegacy = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    const resExplicitW = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, W, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resExplicitW.resolved, true);
    assert.equal(resExplicitW.coordinates.XAxis, resLegacy.coordinates.XAxis);
    assert.equal(resExplicitW.coordinates.YAxis, resLegacy.coordinates.YAxis);
    assert.equal(resExplicitW.coordinates.Distance, resLegacy.coordinates.Distance);
    assert.equal(resExplicitW.coordinates.Angle, resLegacy.coordinates.Angle);
  });

  it("preserves Phase 1 safeguards: Cap remains orientationless center point", () => {
    const parsedWithN = parseSemanticPlacement("Cap, N, Close, On Axis");
    assert.equal(parsedWithN.position, "Cap");
    assert.equal(parsedWithN.orientation, undefined);

    const formatted = formatSemanticPlacement("Cap", "Close", "On Axis", "N");
    assert.equal(formatted, "Cap, Close, On Axis");

    const resCapN = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resCapN.resolved, true);
    assert.equal(resCapN.coordinates.XAxis, 0);
    assert.equal(resCapN.coordinates.YAxis, 0);
  });

  it("exports exact North coordinates (X=0, Y=-0.428446) for Mic 0 slot", () => {
    const cabElement: SignalChainElement = {
      type: "cab",
      name: "4x12 Brit 8000",
      settings: {
        mic_0: "Dynamic 57",
        mic_0_placement: "Cone, N, Close, On Axis",
        mic_1: "Condenser 87",
        mic_1_placement: "Cap, Close, On Axis"
      }
    };

    const attrs = resolveCabMicPlacementAttrs(cabElement);
    assert.equal(attrs.Mic0XAxis, 0, "Mic0XAxis must be exact 0");
    assert.equal(attrs.Mic0YAxis, -0.428446, "Mic0YAxis must be -0.428446");
    assert.equal(attrs.Mic0Distance, 0, "Mic0Distance must be 0");
    assert.equal(attrs.Mic0Angle, 0, "Mic0Angle must be 0");

    const toneResult: ToneResult = {
      preset_name: "Test North Export Mic0",
      description: "Testing North reference export for Mic 0",
      signal_chain: [cabElement]
    };

    const xml = generateXML(toneResult);
    assert.match(xml, /Mic0XAxis="0"/, "Exported XML must contain Mic0XAxis=\"0\"");
    assert.match(xml, /Mic0YAxis="-0\.428446"/, "Exported XML must contain Mic0YAxis=\"-0.428446\"");
    assert.match(xml, /Mic0Distance="0"/, "Exported XML must contain Mic0Distance=\"0\"");
    assert.match(xml, /Mic0Angle="0"/, "Exported XML must contain Mic0Angle=\"0\"");
  });

  it("exports exact North coordinates (X=0, Y=-0.428446) for Mic 1 slot without hardcoding slot index", () => {
    const cabElement: SignalChainElement = {
      type: "cab",
      name: "4x12 Brit 8000",
      settings: {
        mic_0: "Dynamic 57",
        mic_0_placement: "Cap, Close, On Axis",
        mic_1: "Dynamic 57",
        mic_1_placement: "Cone, N, Close, On Axis"
      }
    };

    const attrs = resolveCabMicPlacementAttrs(cabElement);
    assert.equal(attrs.Mic1XAxis, 0, "Mic1XAxis must be exact 0");
    assert.equal(attrs.Mic1YAxis, -0.428446, "Mic1YAxis must be -0.428446");
    assert.equal(attrs.Mic1Distance, 0, "Mic1Distance must be 0");
    assert.equal(attrs.Mic1Angle, 0, "Mic1Angle must be 0");

    const toneResult: ToneResult = {
      preset_name: "Test North Export Mic1",
      description: "Testing North reference export for Mic 1",
      signal_chain: [cabElement]
    };

    const xml = generateXML(toneResult);
    assert.match(xml, /Mic1XAxis="0"/, "Exported XML must contain Mic1XAxis=\"0\"");
    assert.match(xml, /Mic1YAxis="-0\.428446"/, "Exported XML must contain Mic1YAxis=\"-0.428446\"");
    assert.match(xml, /Mic1Distance="0"/, "Exported XML must contain Mic1Distance=\"0\"");
    assert.match(xml, /Mic1Angle="0"/, "Exported XML must contain Mic1Angle=\"0\"");
  });
});
