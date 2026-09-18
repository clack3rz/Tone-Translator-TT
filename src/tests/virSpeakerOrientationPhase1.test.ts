// src/tests/virSpeakerOrientationPhase1.test.ts
// Phase 1 Unit Tests: VIR Speaker Orientation Expansion Architecture & Backward-Compatible Foundation

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import {
  VALID_SEMANTIC_ORIENTATIONS,
  parseSemanticPlacement,
  formatSemanticPlacement,
  extractCanonicalMicPlacement,
  resolveCompositeMicPlacement,
  getVIRCalibrationCoordinates,
  setVIRCalibrationOverrides,
  resetVIRCalibrationOverrides,
  VIR_CALIBRATION_COORDINATES,
  getEffectiveMappingOrientation,
  CARDINAL_ORIENTATION_CLOCK,
  CARDINAL_ORIENTATION_LABELS,
  formatSemanticOrientation
} from "../services/at5MicPlacementService";

import { MicPlacementMapping } from "../types";

describe("VIR Speaker Orientation Expansion — Phase 1 Foundation", () => {
  after(() => {
    resetVIRCalibrationOverrides();
  });

  it("exports valid semantic orientations ['N', 'E', 'S', 'W']", () => {
    assert.deepEqual(VALID_SEMANTIC_ORIENTATIONS, ["N", "E", "S", "W"]);
  });

  it("guarantees backward compatibility for legacy 3-part placements without explicit orientation", () => {
    // 1. Cap Edge, Close, On Axis
    const parsed = parseSemanticPlacement("Cap Edge, Close, On Axis");
    assert.equal(parsed.position, "Cap Edge");
    assert.equal(parsed.distance, "Close");
    assert.equal(parsed.angle, "On Axis");
    assert.equal(parsed.orientation, undefined);
    assert.equal(parsed.hasExplicitOrientation, false);

    // Formatted label retains 3-part representation when no orientation was provided
    const formatted = formatSemanticPlacement(parsed.position, parsed.distance, parsed.angle);
    assert.equal(formatted, "Cap Edge, Close, On Axis");

    // Canonical extraction preserves 3-part canonical label
    const canonical = extractCanonicalMicPlacement({ Mic_0_Placement: "Cap Edge, Close, On Axis" }, 0);
    assert.equal(canonical.canonicalLabel, "Cap Edge · Close · On Axis");

    // Resolves to existing factory West coordinates
    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap Edge, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(res.resolved, true);
    assert.equal(res.resolutionSource, "reference_calibration_vir");
    assert.equal(res.coordinates.XAxis, -0.214223);
    assert.equal(res.coordinates.YAxis, -0.00519017);
    assert.equal(res.coordinates.Distance, 0);
    assert.equal(res.coordinates.Angle, 0);
  });

  it("enforces Cap as orientationless center point", () => {
    // Parsing Cap with orientation ignores/strips orientation because Cap is the speaker centre
    const parsedWithN = parseSemanticPlacement("Cap, N, Close, On Axis");
    assert.equal(parsedWithN.position, "Cap");
    assert.equal(parsedWithN.orientation, undefined);
    assert.equal(parsedWithN.distance, "Close");

    const parsedWithClock = parseSemanticPlacement("Cap (12 o'clock), Close");
    assert.equal(parsedWithClock.position, "Cap");
    assert.equal(parsedWithClock.orientation, undefined);

    // Formatting Cap with an orientation parameter omits orientation
    const formatted = formatSemanticPlacement("Cap", "Close", "On Axis", "N");
    assert.equal(formatted, "Cap, Close, On Axis");

    // Reference coordinates for Cap are center (0, 0)
    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(res.resolved, true);
    assert.equal(res.coordinates.XAxis, 0);
    assert.equal(res.coordinates.YAxis, 0);
  });

  it("correctly parses explicit orientations and clock notations for radial positions", () => {
    // Cardinal tokens: N, E, S, W
    const parsedN = parseSemanticPlacement("Cap Edge, N, Close, On Axis");
    assert.equal(parsedN.position, "Cap Edge");
    assert.equal(parsedN.orientation, "N");
    assert.equal(parsedN.hasExplicitOrientation, true);

    const parsedE = parseSemanticPlacement("Cone · E · Far");
    assert.equal(parsedE.position, "Cone");
    assert.equal(parsedE.orientation, "E");
    assert.equal(parsedE.distance, "Far");

    const parsedS = parseSemanticPlacement("Cone Edge, South, Medium, 45° Off Axis");
    assert.equal(parsedS.position, "Cone Edge");
    assert.equal(parsedS.orientation, "S");
    assert.equal(parsedS.distance, "Medium");
    assert.equal(parsedS.angle, "45° Off Axis");

    // Clock notations: 12 o'clock (N), 3 o'clock (E), 6 o'clock (S), 9 o'clock (W)
    const clock12 = parseSemanticPlacement("Cone, 12 o'clock, Close");
    assert.equal(clock12.orientation, "N");

    const clock3 = parseSemanticPlacement("Cap Edge (3 o'clock), Medium");
    assert.equal(clock3.orientation, "E");

    const clock6 = parseSemanticPlacement("Cone Edge, 6 o'clock, Far");
    assert.equal(clock6.orientation, "S");

    const clock9 = parseSemanticPlacement("Cap Edge, 9 o'clock, Close");
    assert.equal(clock9.orientation, "W");

    // AT5 digital clock notations: 00:00 (N), 03:00 (E), 06:00 (S), 09:00 (W)
    const digital00 = parseSemanticPlacement("Cone, 00:00, Close");
    assert.equal(digital00.orientation, "N");

    const digital03 = parseSemanticPlacement("Cap Edge (03:00), Medium");
    assert.equal(digital03.orientation, "E");

    const digital06 = parseSemanticPlacement("Cone Edge, 06:00, Far");
    assert.equal(digital06.orientation, "S");

    const digital09 = parseSemanticPlacement("Cap Edge, 09:00, Close");
    assert.equal(digital09.orientation, "W");
  });

  it("resolves West cardinal orientations to verified factory coordinates", () => {
    const resCapEdgeW = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap Edge, W, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resCapEdgeW.resolved, true);
    assert.equal(resCapEdgeW.resolutionSource, "reference_calibration_vir");
    assert.equal(resCapEdgeW.isCalibrated, true);
    assert.equal(resCapEdgeW.coordinates.XAxis, -0.214223);
    assert.equal(resCapEdgeW.coordinates.YAxis, -0.00519017);

    const resConeW = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, W, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resConeW.coordinates.XAxis, -0.428446);
    assert.equal(resConeW.coordinates.YAxis, -0.0103803);
  });

  it("handles uncalibrated cardinal orientations (E, S) cleanly as uncalibrated gaps", () => {
    // When no override exists, E/S does not fabricate coordinates; flags as uncalibrated orientation gap
    const resE = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap Edge, E, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resE.resolutionSource, "uncalibrated_orientation_gap");
    assert.equal(resE.isCalibrated, false);
    assert.ok(resE.warning?.includes("awaiting verified AT5 calibration"));
    assert.equal(resE.coordinates.XAxis, 0);
    assert.equal(resE.coordinates.YAxis, 0);

    const resS = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, S, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resS.resolutionSource, "uncalibrated_orientation_gap");
    assert.equal(resS.isCalibrated, false);
  });

  it("allows setting cardinal calibration overrides for N/E/S reference points", () => {
    setVIRCalibrationOverrides({
      positions: {
        "Cone N": { X: 0.00123, Y: 0.428446 },
        "Cone E": { X: 0.428446, Y: -0.00123 }
      }
    });

    const coords = getVIRCalibrationCoordinates();
    assert.equal(coords.positions["Cone N"].isCalibrated, true);
    assert.equal(coords.positions["Cone N"].X, 0.00123);
    assert.equal(coords.positions["Cone N"].Y, 0.428446);

    const resOverridden = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cone, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: []
    });

    assert.equal(resOverridden.resolutionSource, "reference_calibration_vir");
    assert.equal(resOverridden.isCalibrated, true);
    assert.equal(resOverridden.coordinates.XAxis, 0.00123);
    assert.equal(resOverridden.coordinates.YAxis, 0.428446);

    // Reset overrides
    resetVIRCalibrationOverrides();
  });

  it("gives Tier 1 Firestore custom mappings precedence when matching orientation", () => {
    const customMapping: MicPlacementMapping = {
      id: "custom_cap_edge_north",
      gear: "4x12 Brit 8000",
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      micIndex: 0,
      friendly_setting: "Mic_0_Placement",
      friendly_value: "Cap Edge, N, Close, On Axis",
      friendly_placement: "Cap Edge",
      friendly_orientation: "N",
      canonicalPlacementName: "Cap Edge, N, Close, On Axis",
      status: "validated",
      maps_to: {
        Mic0XAxis: 0.002,
        Mic0YAxis: 0.214,
        Mic0Distance: 0,
        Mic0Angle: 0,
        Mic0Speaker: 0
      }
    };

    const res = resolveCompositeMicPlacement({
      cabName: "4x12 Brit 8000",
      cabGuid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
      micSlot: "Mic_0",
      requestedLabel: "Cap Edge, N, Close, On Axis",
      micModelName: "Dynamic 57",
      dbMappings: [customMapping]
    });

    assert.equal(res.resolutionSource, "firestore_verified");
    assert.equal(res.coordinates.XAxis, 0.002);
    assert.equal(res.coordinates.YAxis, 0.214);
  });

  it("getEffectiveMappingOrientation correctly resolves effective orientation for display", () => {
    // 1. Explicit orientation mapping
    assert.equal(getEffectiveMappingOrientation({
      friendly_placement: "Cap Edge",
      friendly_orientation: "N"
    }), "N");

    // 2. Legacy off-centre mapping with no orientation defaults to West ("W")
    assert.equal(getEffectiveMappingOrientation({
      friendly_placement: "Cone",
      friendly_value: "Cone, Close, On Axis"
    }), "W");

    assert.equal(getEffectiveMappingOrientation({
      friendly_value: "Cone Edge, Close, On Axis"
    }), "W");

    // 3. Cap center placement is orientationless and returns undefined
    assert.equal(getEffectiveMappingOrientation({
      friendly_placement: "Cap",
      friendly_value: "Cap, Close, On Axis"
    }), undefined);

    assert.equal(getEffectiveMappingOrientation({
      friendly_value: "Cap, Close, On Axis"
    }), undefined);
  });

  it("formats user-facing cardinal orientation labels using AT5 digital clock notation", () => {
    assert.equal(CARDINAL_ORIENTATION_CLOCK["N"], "00:00");
    assert.equal(CARDINAL_ORIENTATION_CLOCK["E"], "03:00");
    assert.equal(CARDINAL_ORIENTATION_CLOCK["S"], "06:00");
    assert.equal(CARDINAL_ORIENTATION_CLOCK["W"], "09:00");

    assert.equal(CARDINAL_ORIENTATION_LABELS["N"], "N · 00:00");
    assert.equal(CARDINAL_ORIENTATION_LABELS["E"], "E · 03:00");
    assert.equal(CARDINAL_ORIENTATION_LABELS["S"], "S · 06:00");
    assert.equal(CARDINAL_ORIENTATION_LABELS["W"], "W · 09:00");

    assert.equal(formatSemanticOrientation("N"), "N · 00:00");
    assert.equal(formatSemanticOrientation("E"), "E · 03:00");
    assert.equal(formatSemanticOrientation("S"), "S · 06:00");
    assert.equal(formatSemanticOrientation("W"), "W · 09:00");
    assert.equal(formatSemanticOrientation(undefined), "—");
  });
});
