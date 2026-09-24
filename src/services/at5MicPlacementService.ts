// src/services/at5MicPlacementService.ts
// Authoritative VIR (Volumetric Impulse Response) Cabinet Mic Placement & Calibration Service

import type { MicPlacementMapping } from "../types";
import { detectCabSettingsFormat } from "./at5SignalChainNormalizer";
import { at5DatabaseService } from "./at5DatabaseService";

export type SemanticOrientation = "N" | "E" | "S" | "W";
export const VALID_SEMANTIC_ORIENTATIONS: readonly SemanticOrientation[] = ["N", "E", "S", "W"];

export type SemanticPosition = "Cap" | "Cap Edge" | "Cone" | "Cone Edge";
export type SemanticDistance = "Close" | "Medium" | "Far";
export type SemanticAngle = "On Axis" | "45° Off Axis";

export const VALID_SEMANTIC_POSITIONS: readonly SemanticPosition[] = ["Cap", "Cap Edge", "Cone", "Cone Edge"];
export const VALID_SEMANTIC_DISTANCES: readonly SemanticDistance[] = ["Close", "Medium", "Far"];
export const VALID_SEMANTIC_ANGLES: readonly SemanticAngle[] = ["On Axis", "45° Off Axis"];

export function isValidSemanticPosition(pos: any): pos is SemanticPosition {
  return typeof pos === "string" && (VALID_SEMANTIC_POSITIONS as readonly string[]).includes(pos);
}

export function isValidSemanticOrientation(val: any): val is SemanticOrientation {
  return typeof val === "string" && (VALID_SEMANTIC_ORIENTATIONS as readonly string[]).includes(val);
}

export const CARDINAL_ORIENTATION_CLOCK: Record<SemanticOrientation, string> = {
  N: "00:00",
  E: "03:00",
  S: "06:00",
  W: "09:00"
};

export const CARDINAL_ORIENTATION_LABELS: Record<SemanticOrientation, string> = {
  N: "N · 00:00",
  E: "E · 03:00",
  S: "S · 06:00",
  W: "W · 09:00"
};

export function formatSemanticOrientation(orient?: SemanticOrientation | string): string {
  if (!orient) return "—";
  return (CARDINAL_ORIENTATION_LABELS as Record<string, string>)[orient] || orient;
}

export function isValidSemanticDistance(dist: any): dist is SemanticDistance {
  return typeof dist === "string" && (VALID_SEMANTIC_DISTANCES as readonly string[]).includes(dist);
}

export function isValidSemanticAngle(ang: any): ang is SemanticAngle {
  return typeof ang === "string" && (VALID_SEMANTIC_ANGLES as readonly string[]).includes(ang);
}

export function formatSemanticPlacement(
  position: SemanticPosition,
  distance: SemanticDistance,
  angle: SemanticAngle,
  orientation?: SemanticOrientation
): string {
  if (position === "Cap" || !orientation) {
    return `${position}, ${distance}, ${angle}`;
  }
  return `${position}, ${orientation}, ${distance}, ${angle}`;
}

export interface VIRCoordinates {
  Angle: number;
  XAxis: number;
  YAxis: number;
  Distance: number;
  Speaker: number;
}

export interface ParsedSemanticPlacement {
  position?: SemanticPosition;
  orientation?: SemanticOrientation;
  distance?: SemanticDistance;
  angle?: SemanticAngle;
  speakerIndex?: number;
  rawLabel: string;
  canonicalLabel: string;
  hasExplicitOrientation?: boolean;
}

export interface CanonicalSemanticMicPlacement {
  position?: SemanticPosition;
  orientation?: SemanticOrientation;
  distance?: SemanticDistance;
  angle?: SemanticAngle;
  rawPosition?: string;
  rawOrientation?: string;
  rawDistance?: string;
  rawAngle?: string;
  rawCompound?: string;
  sourceRawPlacement?: string;
  raw_supplied_placement?: string;
  wasSuppliedByChain: boolean;
  placement_was_supplied_by_chain: boolean;
  semanticProvenance: "signal_chain_generated" | "signal_chain_normalized" | "semantic_default" | "cab_default" | "safe_fallback";
  isUnspecified: boolean;
  canonicalLabel: string;
  canonical_placement_label?: string;
}

export interface PlacementResolutionResult {
  resolved: boolean;
  coordinates: VIRCoordinates;
  resolutionSource: "firestore_verified" | "reference_calibration_vir" | "estimated_profile" | "safe_default" | "cab_default" | "uncalibrated_orientation_gap";
  matchedProfile?: MicPlacementMapping | null;
  isEstimated: boolean;
  isReferenceCalibration: boolean;
  isCalibrated?: boolean;
  warning?: string;
  semanticPosition?: string;
  semanticOrientation?: string;
  semanticDistance?: string;
  semanticAngle?: string;
  parsedLabel: string;
}

/**
 * Authoritative VIR Reference Grid Coordinates (Numeric)
 * Verified on IK Multimedia AmpliTube 5 VIR 3D Speaker Grid against 7 controlled AT5P exports.
 *
 * Cardinal Model Architecture (Phase 2A):
 * - 1 x Cap (center of speaker, orientationless)
 * - 4 x Cap Edge (W factory-verified; N verified AT5 calibration; E/S awaiting verified AT5 calibration)
 * - 4 x Cone (W factory-verified; N verified AT5 calibration; E/S awaiting verified AT5 calibration)
 * - 4 x Cone Edge (W factory-verified; N verified AT5 calibration; E/S awaiting verified AT5 calibration)
 * Total 13 speaker-face reference points.
 */
export const VIR_CALIBRATION_COORDINATES = {
  positions: {
    // Center point (orientationless)
    "Cap": { X: 0, Y: 0, label: "Cap (Center)", isCalibrated: true },

    // Legacy / canonical baseline keys (represent West / 09:00 radial path)
    "Cap Edge": { X: -0.214223, Y: -0.00519017, label: "Cap Edge (W - 09:00)", isCalibrated: true },
    "Cone": { X: -0.428446, Y: -0.0103803, label: "Cone (W - 09:00)", isCalibrated: true },
    "Cone Edge": { X: -0.785484, Y: -0.0190306, label: "Cone Edge (W - 09:00)", isCalibrated: true },

    // Cardinal 13-point explicit reference points:
    // West (verified factory calibration)
    "Cap Edge W": { X: -0.214223, Y: -0.00519017, label: "Cap Edge (W - 09:00)", isCalibrated: true },
    "Cone W": { X: -0.428446, Y: -0.0103803, label: "Cone (W - 09:00)", isCalibrated: true },
    "Cone Edge W": { X: -0.785484, Y: -0.0190306, label: "Cone Edge (W - 09:00)", isCalibrated: true },

    // North (00:00) - verified AT5 reference calibration (Phase 2A)
    "Cap Edge N": { X: 0, Y: -0.214223, label: "Cap Edge (N - 00:00)", isCalibrated: true },
    "Cone N": { X: 0, Y: -0.428446, label: "Cone (N - 00:00)", isCalibrated: true },
    "Cone Edge N": { X: 0, Y: -0.785484, label: "Cone Edge (N - 00:00)", isCalibrated: true },

    // East (03:00) - uncalibrated in Phase 1 & 2A (no fabricated coordinates)
    "Cap Edge E": { X: null as unknown as number, Y: null as unknown as number, label: "Cap Edge (E - 03:00)", isCalibrated: false },
    "Cone E": { X: null as unknown as number, Y: null as unknown as number, label: "Cone (E - 03:00)", isCalibrated: false },
    "Cone Edge E": { X: null as unknown as number, Y: null as unknown as number, label: "Cone Edge (E - 03:00)", isCalibrated: false },

    // South (06:00) - uncalibrated in Phase 1 & 2A (no fabricated coordinates)
    "Cap Edge S": { X: null as unknown as number, Y: null as unknown as number, label: "Cap Edge (S - 06:00)", isCalibrated: false },
    "Cone S": { X: null as unknown as number, Y: null as unknown as number, label: "Cone (S - 06:00)", isCalibrated: false },
    "Cone Edge S": { X: null as unknown as number, Y: null as unknown as number, label: "Cone Edge (S - 06:00)", isCalibrated: false }
  },
  distances: {
    "Close": { Distance: 0, label: "Close" },
    "Medium": { Distance: 0.5, label: "Medium" },
    "Far": { Distance: 1, label: "Far" }
  },
  angles: {
    "On Axis": { Angle: 0, label: "On Axis (0°)" },
    "45° Off Axis": { Angle: 1, label: "45° Off Axis" }
  },
  speakers: {
    Mic_0: { defaultSpeaker: 0, label: "Speaker 1 (Top Left)" },
    Mic_1: { defaultSpeaker: 1, label: "Speaker 2 (Top Right)" },
    Mic_2: { defaultSpeaker: 1, label: "Speaker 2 (Top Right)" }
  }
} as const;

export interface VIRReferenceOverrides {
  positions?: Record<string, { X: number; Y: number }>;
  distances?: Record<string, { Distance: number }>;
  angles?: Record<string, { Angle: number }>;
}

let virCalibrationOverrides: VIRReferenceOverrides = {};

export function setVIRCalibrationOverrides(overrides: VIRReferenceOverrides): void {
  virCalibrationOverrides = overrides || {};
}

export function resetVIRCalibrationOverrides(): void {
  virCalibrationOverrides = {};
}

export function getVIRCalibrationOverrides(): VIRReferenceOverrides {
  return virCalibrationOverrides;
}

/**
 * Loads durable TT-managed VIR reference calibration overrides from Firestore (system_calibrations/vir_reference).
 * Overrides in-memory grid and falls back safely to built-in baseline constants if offline or not yet provisioned.
 */
export async function initializeVIRCalibration(forceRefresh = false): Promise<VIRReferenceOverrides> {
  try {
    const overrides = await at5DatabaseService.getVIRReferenceOverrides(forceRefresh);
    if (overrides && (overrides.positions || overrides.distances || overrides.angles)) {
      setVIRCalibrationOverrides(overrides);
      return overrides;
    }
  } catch (err) {
    console.warn("Could not load VIR reference overrides from Firestore, using baseline constants:", err);
  }
  return virCalibrationOverrides;
}

export const refreshVIRCalibration = initializeVIRCalibration;

export function getVIRCalibrationCoordinates() {
  const mergedPositions: Record<string, { X: number; Y: number; label: string; isCalibrated: boolean }> = {
    "Cap": {
      X: virCalibrationOverrides.positions?.["Cap"]?.X ?? VIR_CALIBRATION_COORDINATES.positions["Cap"].X,
      Y: virCalibrationOverrides.positions?.["Cap"]?.Y ?? VIR_CALIBRATION_COORDINATES.positions["Cap"].Y,
      label: "Cap (Center)",
      isCalibrated: true
    },
    "Cap Edge": {
      X: virCalibrationOverrides.positions?.["Cap Edge"]?.X ?? virCalibrationOverrides.positions?.["Cap Edge W"]?.X ?? VIR_CALIBRATION_COORDINATES.positions["Cap Edge"].X,
      Y: virCalibrationOverrides.positions?.["Cap Edge"]?.Y ?? virCalibrationOverrides.positions?.["Cap Edge W"]?.Y ?? VIR_CALIBRATION_COORDINATES.positions["Cap Edge"].Y,
      label: "Cap Edge (W - 09:00)",
      isCalibrated: true
    },
    "Cone": {
      X: virCalibrationOverrides.positions?.["Cone"]?.X ?? virCalibrationOverrides.positions?.["Cone W"]?.X ?? VIR_CALIBRATION_COORDINATES.positions["Cone"].X,
      Y: virCalibrationOverrides.positions?.["Cone"]?.Y ?? virCalibrationOverrides.positions?.["Cone W"]?.Y ?? VIR_CALIBRATION_COORDINATES.positions["Cone"].Y,
      label: "Cone (W - 09:00)",
      isCalibrated: true
    },
    "Cone Edge": {
      X: virCalibrationOverrides.positions?.["Cone Edge"]?.X ?? virCalibrationOverrides.positions?.["Cone Edge W"]?.X ?? VIR_CALIBRATION_COORDINATES.positions["Cone Edge"].X,
      Y: virCalibrationOverrides.positions?.["Cone Edge"]?.Y ?? virCalibrationOverrides.positions?.["Cone Edge W"]?.Y ?? VIR_CALIBRATION_COORDINATES.positions["Cone Edge"].Y,
      label: "Cone Edge (W - 09:00)",
      isCalibrated: true
    }
  };

  // Helper for cardinal 12 points
  const cardinalConfigs: [SemanticPosition, SemanticOrientation, string, number | null, number | null][] = [
    ["Cap Edge", "W", "09:00", -0.214223, -0.00519017],
    ["Cap Edge", "N", "00:00", 0, -0.214223],
    ["Cap Edge", "E", "03:00", null, null],
    ["Cap Edge", "S", "06:00", null, null],
    ["Cone", "W", "09:00", -0.428446, -0.0103803],
    ["Cone", "N", "00:00", 0, -0.428446],
    ["Cone", "E", "03:00", null, null],
    ["Cone", "S", "06:00", null, null],
    ["Cone Edge", "W", "09:00", -0.785484, -0.0190306],
    ["Cone Edge", "N", "00:00", 0, -0.785484],
    ["Cone Edge", "E", "03:00", null, null],
    ["Cone Edge", "S", "06:00", null, null]
  ];

  for (const [pos, orient, clock, defX, defY] of cardinalConfigs) {
    const key = `${pos} ${orient}`;
    const override = virCalibrationOverrides.positions?.[key] || (orient === "W" ? virCalibrationOverrides.positions?.[pos] : undefined);
    if (override && typeof override.X === "number" && typeof override.Y === "number" && !isNaN(override.X) && !isNaN(override.Y)) {
      mergedPositions[key] = {
        X: override.X,
        Y: override.Y,
        label: `${pos} (${orient} - ${clock})`,
        isCalibrated: true
      };
    } else if (defX !== null && defY !== null) {
      mergedPositions[key] = {
        X: defX,
        Y: defY,
        label: `${pos} (${orient} - ${clock})`,
        isCalibrated: true
      };
    } else {
      mergedPositions[key] = {
        X: 0,
        Y: 0,
        label: `${pos} (${orient} - ${clock})`,
        isCalibrated: false
      };
    }
  }

  return {
    positions: mergedPositions,
    distances: {
      "Close": {
        Distance: virCalibrationOverrides.distances?.["Close"]?.Distance ?? VIR_CALIBRATION_COORDINATES.distances["Close"].Distance,
        label: "Close"
      },
      "Medium": {
        Distance: virCalibrationOverrides.distances?.["Medium"]?.Distance ?? VIR_CALIBRATION_COORDINATES.distances["Medium"].Distance,
        label: "Medium"
      },
      "Far": {
        Distance: virCalibrationOverrides.distances?.["Far"]?.Distance ?? VIR_CALIBRATION_COORDINATES.distances["Far"].Distance,
        label: "Far"
      }
    },
    angles: {
      "On Axis": {
        Angle: virCalibrationOverrides.angles?.["On Axis"]?.Angle ?? VIR_CALIBRATION_COORDINATES.angles["On Axis"].Angle,
        label: "On Axis (0°)"
      },
      "45° Off Axis": {
        Angle: virCalibrationOverrides.angles?.["45° Off Axis"]?.Angle ?? VIR_CALIBRATION_COORDINATES.angles["45° Off Axis"].Angle,
        label: "45° Off Axis"
      }
    },
    speakers: {
      Mic_0: { defaultSpeaker: 0, label: "Speaker 1 (Top Left)" },
      Mic_1: { defaultSpeaker: 1, label: "Speaker 2 (Top Right)" },
      Mic_2: { defaultSpeaker: 1, label: "Speaker 2 (Top Right)" }
    }
  };
}

/**
 * Resolves coordinates and calibration status for a discrete position + orientation reference point.
 */
export function getVIRReferencePositionCoordinates(
  position: SemanticPosition,
  orientation?: SemanticOrientation
): { X: number; Y: number; label: string; isCalibrated: boolean } {
  const coords = getVIRCalibrationCoordinates();
  if (position === "Cap") {
    const cap = coords.positions["Cap"];
    return {
      X: cap?.X ?? 0,
      Y: cap?.Y ?? 0,
      label: "Cap (Center)",
      isCalibrated: true
    };
  }

  const orient: SemanticOrientation = orientation || "W";
  const keyWithOrient = `${position} ${orient}`;
  const posEntry = coords.positions[keyWithOrient] || (orient === "W" ? coords.positions[position] : undefined);

  if (posEntry && posEntry.isCalibrated) {
    return {
      X: posEntry.X,
      Y: posEntry.Y,
      label: posEntry.label,
      isCalibrated: true
    };
  }

  const clockMap: Record<SemanticOrientation, string> = {
    N: "00:00",
    E: "03:00",
    S: "06:00",
    W: "09:00"
  };

  return {
    X: 0,
    Y: 0,
    label: `${position} (${orient} - ${clockMap[orient]})`,
    isCalibrated: false
  };
}

/**
 * 13 Canonical Speaker-Face Reference Grid Keys (Phase 2A):
 * - Center: Cap (orientationless)
 * - Radial rings: Cap Edge, Cone, Cone Edge across W, N, E, S
 */
export const VIR_REFERENCE_GRID_KEYS = [
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
] as const;

export type VIRReferenceGridKey = typeof VIR_REFERENCE_GRID_KEYS[number];

/**
 * Reference Cabinets verified for VIR Coordinate Grid calibration
 * Strictly calibrated against the 7 controlled AT5P exports:
 * CabModel = 7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b (4x12 Brit 8000)
 */
export const VIR_REFERENCE_CABINETS: { name: string; guid: string; aliases: string[] }[] = [
  {
    name: "4x12 Brit 8000",
    guid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b",
    aliases: [
      "4x12 brit 8000",
      "4x12 brit8000",
      "brit 8000 4x12",
      "brit 8000",
      "4x12 brit 1960a",
      "4x12 brit 1960",
      "brit 1960a",
      "brit 1960"
    ]
  },
  {
    name: "4x12 Brit 1960A",
    guid: "c4ea21cc-6444-4779-9eee-62d4bc085410",
    aliases: [
      "4x12 brit 1960a",
      "4x12 brit 1960",
      "brit 1960a",
      "brit 1960",
      "4x12 brit 8000",
      "brit 8000"
    ]
  }
];

/**
 * Reference Microphones verified with VIR calibrations
 * Strictly verified on Mic0Model = 1e41acc4-85af-4e84-bee4-eabc0be5fef1 (Dynamic 57) and Condenser 87
 */
export const VIR_REFERENCE_MICS: { name: string; guid: string; aliases: string[] }[] = [
  {
    name: "Dynamic 57",
    guid: "1e41acc4-85af-4e84-bee4-eabc0be5fef1",
    aliases: ["dynamic 57", "sm57", "57", "shure sm57"]
  },
  {
    name: "Condenser 87",
    guid: "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb",
    aliases: ["condenser 87", "u87", "87", "neumann u87"]
  }
];

/**
 * Normalizes strings for robust matching
 */
export function cleanPlacementStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Checks if a string represents an unspecified placement
 */
export function isUnspecifiedPlacement(val: any): boolean {
  if (val === undefined || val === null) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === "" ||
    s === "not specified" ||
    s === "none" ||
    s === "default" ||
    s === "cab default" ||
    s === "unspecified"
  );
}

/**
 * Parses free-form semantic placement text into discrete position, orientation, distance, and angle
 * e.g. "Cap Edge, N, Close, On Axis" -> { position: "Cap Edge", orientation: "N", distance: "Close", angle: "On Axis" }
 * e.g. "Cap Edge, Close, On Axis" -> { position: "Cap Edge", orientation: "W", distance: "Close", angle: "On Axis" } (backward compatible)
 * e.g. "Cap, Close, On Axis" -> { position: "Cap", orientation: undefined, distance: "Close", angle: "On Axis" }
 */
export function parseSemanticPlacement(rawText: string): ParsedSemanticPlacement {
  if (isUnspecifiedPlacement(rawText)) {
    return {
      rawLabel: rawText || "",
      canonicalLabel: "Not specified"
    };
  }

  const clean = String(rawText).trim();
  const lower = clean.toLowerCase();

  // 1. Angle parsing
  let angle: SemanticAngle | undefined = undefined;
  if (
    lower.includes("45") ||
    lower.includes("off axis") ||
    lower.includes("off-axis") ||
    lower.includes("angled") ||
    lower.includes("45 deg") ||
    lower.includes("45°")
  ) {
    angle = "45° Off Axis";
  } else if (
    lower.includes("on axis") ||
    lower.includes("on-axis") ||
    lower.includes("straight") ||
    lower.includes("direct") ||
    lower.includes("0 deg") ||
    lower.includes("0°")
  ) {
    angle = "On Axis";
  }

  // 2. Distance parsing (Close / Medium / Far - VIR distance adjustment)
  let distance: SemanticDistance | undefined = undefined;
  if (lower.includes("far") || lower.includes("distant") || lower.includes("1.0") || lower.includes("back")) {
    distance = "Far";
  } else if (lower.includes("medium") || lower.includes("mid") || lower.includes("0.5") || lower.includes("halfway")) {
    distance = "Medium";
  } else if (lower.includes("close") || lower.includes("grille") || lower.includes("tight") || lower.includes("0.0") || lower.includes("front")) {
    distance = "Close";
  }

  // 3. Position parsing (Order matters: Cap Edge before Cap, Cone Edge before Cone)
  let position: SemanticPosition | undefined = undefined;
  if (lower.includes("cap edge") || lower.includes("cap-edge") || lower.includes("edge of cap") || lower.includes("cap/cone")) {
    position = "Cap Edge";
  } else if (lower.includes("cone edge") || lower.includes("cone-edge") || lower.includes("edge of cone") || lower.includes("outer cone")) {
    position = "Cone Edge";
  } else if (lower.includes("cap") || lower.includes("center") || lower.includes("centre") || lower.includes("dust cap")) {
    position = "Cap";
  } else if (lower.includes("cone") || lower.includes("body")) {
    position = "Cone";
  }

  // 4. Orientation parsing (N=00:00, E=03:00, S=06:00, W=09:00)
  let parsedOrientation: SemanticOrientation | undefined = undefined;
  let hasExplicitOrientation = false;

  // Check clock and name aliases first
  if (lower.includes("00:00") || lower.includes("12 o'clock") || lower.includes("12 oclock") || lower.includes("12:00") || lower.includes("north")) {
    parsedOrientation = "N";
    hasExplicitOrientation = true;
  } else if (lower.includes("03:00") || lower.includes("3 o'clock") || lower.includes("3 oclock") || lower.includes("3:00") || lower.includes("east")) {
    parsedOrientation = "E";
    hasExplicitOrientation = true;
  } else if (lower.includes("06:00") || lower.includes("6 o'clock") || lower.includes("6 oclock") || lower.includes("6:00") || lower.includes("south")) {
    parsedOrientation = "S";
    hasExplicitOrientation = true;
  } else if (lower.includes("09:00") || lower.includes("9 o'clock") || lower.includes("9 oclock") || lower.includes("9:00") || lower.includes("west")) {
    parsedOrientation = "W";
    hasExplicitOrientation = true;
  } else {
    // Check single cardinal letter tokens bounded by delimiters/spaces (e.g. "Cap Edge, N, Close" or "Cone · W · Far")
    const tokens = clean.split(/[,·/|\s]+/).map(t => t.trim().toUpperCase());
    for (const t of tokens) {
      if (t === "N") {
        parsedOrientation = "N";
        hasExplicitOrientation = true;
        break;
      } else if (t === "E") {
        parsedOrientation = "E";
        hasExplicitOrientation = true;
        break;
      } else if (t === "S") {
        parsedOrientation = "S";
        hasExplicitOrientation = true;
        break;
      } else if (t === "W") {
        parsedOrientation = "W";
        hasExplicitOrientation = true;
        break;
      }
    }
  }

  // Effective orientation rule:
  // - For Cap: Cap is the centre of the speaker and has no meaningful orientation.
  //   Orientation must remain undefined / N/A and must NOT be artificially normalized to W.
  // - For off-centre positions: parsed orientation is undefined if not explicitly provided,
  //   and defaults to West / 9 o'clock during coordinate resolution for full backward compatibility.
  let orientation: SemanticOrientation | undefined = undefined;
  if (position !== "Cap") {
    orientation = parsedOrientation;
  }

  // If no semantic position, distance, angle, or orientation was recognized, treat as unspecified
  if (!position && !distance && !angle && !parsedOrientation) {
    return {
      rawLabel: clean,
      canonicalLabel: "Not specified",
      hasExplicitOrientation: false
    };
  }

  // Fallback defaults if position was identified but distance/angle omitted
  const posPart = position || "Cap Edge";
  const distPart = distance || "Close";
  const angPart = angle || "On Axis";

  let canonicalLabel: string;
  if (posPart === "Cap") {
    canonicalLabel = `${posPart} · ${distPart} · ${angPart}`;
  } else if (hasExplicitOrientation && orientation) {
    canonicalLabel = `${posPart} · ${orientation} · ${distPart} · ${angPart}`;
  } else {
    // Legacy canonical label preserves 3-part form for backward compatibility
    canonicalLabel = `${posPart} · ${distPart} · ${angPart}`;
  }

  return {
    position,
    orientation,
    distance,
    angle,
    rawLabel: clean,
    canonicalLabel,
    hasExplicitOrientation
  };
}

/**
 * Resolves the effective cardinal display orientation for a placement mapping or record.
 * 
 * Rules:
 * - Cap is the speaker center and orientationless -> returns undefined (displayed as "—" or "N/A").
 * - If an explicit orientation is stored (or in the label) -> returns that orientation ("N" | "E" | "S" | "W").
 * - Legacy off-centre placements with no explicit orientation -> returns "W" (factory West / 9 o'clock).
 */
export function getEffectiveMappingOrientation(
  m: Partial<MicPlacementMapping> | {
    friendly_placement?: string;
    friendlyPlacement?: string;
    friendly_orientation?: string;
    friendlyOrientation?: string;
    orientation?: string;
    friendly_value?: string;
    friendly_name?: string;
    canonicalPlacementName?: string;
    position?: string;
  }
): SemanticOrientation | undefined {
  const targetLabel = m.canonicalPlacementName || m.friendly_value || m.friendly_name || m.friendly_placement || "";
  const parsedTarget = targetLabel ? parseSemanticPlacement(targetLabel) : { position: undefined, orientation: undefined };

  const compPos = m.friendly_placement ||
    (m as any).friendlyPlacement ||
    (m as any).position ||
    parsedTarget.position;

  if (compPos === "Cap") {
    return undefined;
  }

  const explicitOrient = m.friendly_orientation ||
    (m as any).friendlyOrientation ||
    (m as any).orientation ||
    (parsedTarget.position !== "Cap" ? parsedTarget.orientation : undefined);

  if (explicitOrient && (VALID_SEMANTIC_ORIENTATIONS as readonly string[]).includes(explicitOrient as any)) {
    return explicitOrient as SemanticOrientation;
  }

  // Off-centre positions without explicit orientation default to West (W / 9 o'clock)
  if (compPos) {
    return "W";
  }

  return undefined;
}

/**
 * Checks if a string represents an explicit, complete semantic placement tuple
 * containing all required dimensions:
 * - 3 parts: [Position, Distance, Angle] (legacy or Cap)
 * - 4 parts: [Position, Orientation, Distance, Angle] (orientation-aware off-centre)
 * strictly matching the authoritative semantic vocabulary.
 */
export function isCompleteSemanticPlacement(val: any): boolean {
  if (!val || typeof val !== "string") return false;
  const s = val.trim();
  const parts = s.split(/[,·]/).map(p => p.trim()).filter(Boolean);

  if (parts.length === 3) {
    const [pos, dist, ang] = parts;
    return (
      isValidSemanticPosition(pos) &&
      isValidSemanticDistance(dist) &&
      isValidSemanticAngle(ang)
    );
  }

  if (parts.length === 4) {
    const [pos, orient, dist, ang] = parts;
    return (
      isValidSemanticPosition(pos) &&
      pos !== "Cap" && // Cap cannot have an orientation
      isValidSemanticOrientation(orient) &&
      isValidSemanticDistance(dist) &&
      isValidSemanticAngle(ang)
    );
  }

  return false;
}

/**
 * Checks if a given cabinet is the verified VIR reference cabinet (4x12 Brit 8000)
 * Strict Priority:
 * 1. exact cab GUID match
 * 2. exact canonical name match if GUID is unavailable
 * 3. only proven direct aliases for that exact same AT5 cabinet identity
 */
export function isVIRReferenceCabinet(cabName?: string, cabGuid?: string): boolean {
  if (!cabName && !cabGuid) return false;

  const cleanCab = cleanPlacementStr(cabName || "");
  const cleanGuid = (cabGuid || "").toLowerCase().replace(/-/g, "").trim();

  // Priority 1: Exact cab GUID match
  if (cleanGuid) {
    const isGuidMatch = VIR_REFERENCE_CABINETS.some(ref => 
      ref.guid.toLowerCase().replace(/-/g, "").trim() === cleanGuid
    );
    if (isGuidMatch) return true;
  }

  // Priority 2: Exact canonical name match if GUID is unavailable or omitted
  if (cleanCab) {
    const isNameMatch = VIR_REFERENCE_CABINETS.some(ref => 
      cleanPlacementStr(ref.name) === cleanCab
    );
    if (isNameMatch) return true;

    // Priority 3: Only proven direct aliases for that exact same AT5 cabinet identity
    const isAliasMatch = VIR_REFERENCE_CABINETS.some(ref => 
      ref.aliases.some(alias => cleanPlacementStr(alias) === cleanCab)
    );
    if (isAliasMatch) return true;
  }

  return false;
}

/**
 * Checks if a given microphone is the verified VIR reference microphone (Dynamic 57)
 * Priority:
 * 1. exact mic GUID match
 * 2. exact canonical name match
 * 3. proven aliases
 * Unspecified mic identity returns false so it does not silently qualify for AT5P-validated reference calibration.
 */
export function isVIRReferenceMic(micName?: string, micGuid?: string): boolean {
  if (!micName && !micGuid) return false; // Unspecified mic must NOT automatically qualify as reference

  const cleanMic = cleanPlacementStr(micName || "");
  const cleanGuid = (micGuid || "").toLowerCase().replace(/-/g, "").trim();

  // Priority 1: Exact mic GUID match
  if (cleanGuid) {
    const isGuidMatch = VIR_REFERENCE_MICS.some(ref => 
      ref.guid.toLowerCase().replace(/-/g, "").trim() === cleanGuid
    );
    if (isGuidMatch) return true;
  }

  // Priority 2: Exact canonical name match
  if (cleanMic) {
    const isNameMatch = VIR_REFERENCE_MICS.some(ref => 
      cleanPlacementStr(ref.name) === cleanMic
    );
    if (isNameMatch) return true;

    // Priority 3: Proven aliases
    const isAliasMatch = VIR_REFERENCE_MICS.some(ref => 
      ref.aliases.some(alias => cleanPlacementStr(alias) === cleanMic)
    );
    if (isAliasMatch) return true;
  }

  return false;
}

/**
 * Generates exact numeric VIR coordinates for composite semantic placement parameters.
 * Understands orientation (N, E, S, W):
 * - Cap: center (orientationless, calibrated)
 * - Cap Edge / Cone / Cone Edge + W: factory calibrated West coordinates
 * - Cap Edge / Cone / Cone Edge + N/E/S: uncalibrated unless an explicit override is present
 */
export function composeVIRCoordinates(
  position: SemanticPosition = "Cap Edge",
  distance: SemanticDistance = "Close",
  angle: SemanticAngle = "On Axis",
  micSlot: "Mic_0" | "Mic_1" | "Mic_2" = "Mic_0",
  speakerOverride?: number,
  orientation?: SemanticOrientation
): VIRCoordinates & { isCalibrated: boolean; uncalibratedReason?: string } {
  const effectiveOrientation = position === "Cap" ? undefined : (orientation || "W");
  const posCoords = getVIRReferencePositionCoordinates(position, effectiveOrientation);
  const coords = getVIRCalibrationCoordinates();
  const distCoords = coords.distances[distance] || coords.distances["Close"];
  const angleCoords = coords.angles[angle] || coords.angles["On Axis"];
  
  const defaultSpeaker = (micSlot === "Mic_1" || micSlot === "Mic_2") ? 1 : 0;
  const speakerVal = speakerOverride !== undefined ? Number(speakerOverride) : defaultSpeaker;

  let uncalibratedReason: string | undefined = undefined;
  if (!posCoords.isCalibrated) {
    uncalibratedReason = `Reference calibration for ${position} (${effectiveOrientation}) is uncalibrated. Awaiting verified AT5 calibration capture.`;
  }

  return {
    Angle: angleCoords.Angle,
    XAxis: posCoords.X,
    YAxis: posCoords.Y,
    Distance: distCoords.Distance,
    Speaker: speakerVal,
    isCalibrated: posCoords.isCalibrated,
    uncalibratedReason
  };
}

function toCoordNum(val: any, fallback: number): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/**
 * Extracts and normalizes semantic mic placement from arbitrary settings keys into ONE canonical object.
 * Maps:
 * - TT Mic_1 (slotIndex 0) -> AT5 Mic0
 * - TT Mic_2 (slotIndex 1) -> AT5 Mic1
 */
export function extractCanonicalMicPlacement(
  settings: Record<string, any> = {},
  slotIndex: 0 | 1 = 0
): CanonicalSemanticMicPlacement {
  if (!settings || typeof settings !== "object") {
    return {
      isUnspecified: true,
      wasSuppliedByChain: false,
      placement_was_supplied_by_chain: false,
      semanticProvenance: "cab_default",
      canonicalLabel: "Not specified",
      canonical_placement_label: "Not specified"
    };
  }

  const findVal = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const targetNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const [k, v] of Object.entries(settings)) {
        if (v === undefined || v === null) continue;
        const sNorm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (sNorm === targetNorm) {
          const str = String(v).trim();
          if (!isUnspecifiedPlacement(str)) return str;
        }
      }
    }
    return undefined;
  };

  let rawCompound: string | undefined;
  let rawPos: string | undefined;
  let rawOrient: string | undefined;
  let rawDist: string | undefined;
  let rawAng: string | undefined;

  const detection = detectCabSettingsFormat(settings);
  const isLegacy = detection.resolvedAs === "legacy_1";

  if (slotIndex === 0) {
    if (isLegacy) {
      // Legacy primary mic uses mic_1 keys
      rawCompound = findVal([
        "mic_1_placement", "mic 1 placement", "mic1_placement", "mic1 placement",
        "placement_1", "placement 1", "placement1",
        "mic_placement", "mic placement", "placement"
      ]);
      rawPos = findVal([
        "mic_1_position", "mic 1 position", "mic1_position", "mic1 position",
        "position_1", "position 1", "position1", "position", "pos"
      ]);
      rawOrient = findVal([
        "mic_1_orientation", "mic 1 orientation", "mic1_orientation", "mic1 orientation",
        "orientation_1", "orientation 1", "orientation1", "orientation", "orient"
      ]);
      rawDist = findVal([
        "mic_1_distance", "mic 1 distance", "mic1_distance", "mic1 distance",
        "distance_1", "distance 1", "distance1", "distance", "dist"
      ]);
      rawAng = findVal([
        "mic_1_angle", "mic 1 angle", "mic1_angle", "mic1 angle",
        "mic_1_axis", "mic 1 axis", "mic1_axis", "mic1 axis",
        "mic_1_off_axis", "mic 1 off axis",
        "angle_1", "angle 1", "angle1", "angle",
        "axis_1", "axis 1", "axis1", "axis"
      ]);
    } else {
      // Canonical primary mic uses mic_0 keys
      rawCompound = findVal([
        "mic_0_placement", "mic 0 placement", "mic0_placement", "mic0 placement",
        "placement_0", "placement 0", "placement0",
        "mic_placement", "mic placement", "placement"
      ]);
      rawPos = findVal([
        "mic_0_position", "mic 0 position", "mic0_position", "mic0 position",
        "position_0", "position 0", "position0", "position", "pos"
      ]);
      rawOrient = findVal([
        "mic_0_orientation", "mic 0 orientation", "mic0_orientation", "mic0 orientation",
        "orientation_0", "orientation 0", "orientation0", "orientation", "orient"
      ]);
      rawDist = findVal([
        "mic_0_distance", "mic 0 distance", "mic0_distance", "mic0 distance",
        "distance_0", "distance 0", "distance0", "distance", "dist"
      ]);
      rawAng = findVal([
        "mic_0_angle", "mic 0 angle", "mic0_angle", "mic0 angle",
        "mic_0_axis", "mic 0 axis", "mic0_axis", "mic0 axis",
        "mic_0_off_axis", "mic 0 off axis",
        "angle_0", "angle 0", "angle0", "angle",
        "axis_0", "axis 0", "axis0", "axis"
      ]);
    }
  } else {
    // Slot 1 (Secondary mic)
    if (detection.isAmbiguous || detection.format === "single_mic_ambiguous" || detection.format === "ambiguous_single_1") {
      // Safe policy: single ambiguous mic 1 was already assigned to primary slot 0; slot 1 has no placement
      rawCompound = undefined;
      rawPos = undefined;
      rawOrient = undefined;
      rawDist = undefined;
      rawAng = undefined;
    } else if (isLegacy) {
      // Legacy secondary mic uses mic_2 keys
      rawCompound = findVal([
        "mic_2_placement", "mic 2 placement", "mic2_placement", "mic2 placement",
        "placement_2", "placement 2", "placement2"
      ]);
      rawPos = findVal([
        "mic_2_position", "mic 2 position", "mic2_position", "mic2 position",
        "position_2", "position 2", "position2"
      ]);
      rawOrient = findVal([
        "mic_2_orientation", "mic 2 orientation", "mic2_orientation", "mic2 orientation",
        "orientation_2", "orientation 2", "orientation2"
      ]);
      rawDist = findVal([
        "mic_2_distance", "mic 2 distance", "mic2_distance", "mic2 distance",
        "distance_2", "distance 2", "distance2"
      ]);
      rawAng = findVal([
        "mic_2_angle", "mic 2 angle", "mic2_angle", "mic2 angle",
        "mic_2_axis", "mic 2 axis", "mic2_axis", "mic2 axis",
        "mic_2_off_axis", "mic 2 off axis",
        "angle_2", "angle 2", "angle2",
        "axis_2", "axis 2", "axis2"
      ]);
    } else {
      // Canonical secondary mic uses mic_1 keys
      rawCompound = findVal([
        "mic_1_placement", "mic 1 placement", "mic1_placement", "mic1 placement",
        "placement_1", "placement 1", "placement1"
      ]);
      rawPos = findVal([
        "mic_1_position", "mic 1 position", "mic1_position", "mic1 position",
        "position_1", "position 1", "position1"
      ]);
      rawOrient = findVal([
        "mic_1_orientation", "mic 1 orientation", "mic1_orientation", "mic1 orientation",
        "orientation_1", "orientation 1", "orientation1"
      ]);
      rawDist = findVal([
        "mic_1_distance", "mic 1 distance", "mic1_distance", "mic1 distance",
        "distance_1", "distance 1", "distance1"
      ]);
      rawAng = findVal([
        "mic_1_angle", "mic 1 angle", "mic1_angle", "mic1 angle",
        "mic_1_axis", "mic 1 axis", "mic1_axis", "mic1 axis",
        "mic_1_off_axis", "mic 1 off axis",
        "angle_1", "angle 1", "angle1",
        "axis_1", "axis 1", "axis1"
      ]);
    }
  }

  // Parse compound if present
  let posFromCompound: SemanticPosition | undefined;
  let orientFromCompound: SemanticOrientation | undefined;
  let distFromCompound: SemanticDistance | undefined;
  let angFromCompound: SemanticAngle | undefined;
  let parsedCompoundExplicitOrientation = false;

  if (rawCompound) {
    const parsedCompound = parseSemanticPlacement(rawCompound);
    posFromCompound = parsedCompound.position;
    orientFromCompound = parsedCompound.orientation;
    distFromCompound = parsedCompound.distance;
    angFromCompound = parsedCompound.angle;
    parsedCompoundExplicitOrientation = Boolean(parsedCompound.hasExplicitOrientation);
  }

  // Discrete fields override/supplement compound
  const parsedPos = (rawPos ? (parseSemanticPlacement(rawPos).position || parseSemanticPlacement(rawPos + " on axis").position) : undefined) || posFromCompound;
  const parsedOrient = (rawOrient ? (parseSemanticPlacement(`Cap Edge, ${rawOrient}, Close, On Axis`).orientation) : undefined) || orientFromCompound;
  const parsedDist = (rawDist ? parseSemanticPlacement("Cone, " + rawDist).distance : undefined) || distFromCompound;
  const parsedAng = (rawAng ? parseSemanticPlacement("Cone, Close, " + rawAng).angle : undefined) || angFromCompound;

  // A placement is specified ONLY if at least one semantic component (position, distance, angle) was recognized!
  const hasSemanticIntent = Boolean(parsedPos || parsedDist || parsedAng);
  const isUnspecified = !hasSemanticIntent;

  if (isUnspecified) {
    return {
      isUnspecified: true,
      wasSuppliedByChain: false,
      placement_was_supplied_by_chain: false,
      semanticProvenance: "cab_default",
      canonicalLabel: "Not specified",
      canonical_placement_label: "Not specified",
      raw_supplied_placement: undefined
    };
  }

  const finalPos: SemanticPosition | undefined = parsedPos;
  // Cap is orientationless. Off-centre positions default to W.
  const finalOrient: SemanticOrientation | undefined = finalPos === "Cap" ? undefined : (parsedOrient || "W");
  const finalDist: SemanticDistance | undefined = parsedDist;
  const finalAng: SemanticAngle | undefined = parsedAng;

  const posPart = finalPos || "Cap Edge";
  const distPart = finalDist || "Close";
  const angPart = finalAng || "On Axis";

  // If explicit orientation was parsed (and not Cap), show it in canonical label
  const hasExplicitOrient = Boolean(rawOrient || parsedCompoundExplicitOrientation);
  let canonicalLabel: string;
  if (posPart === "Cap") {
    canonicalLabel = `${posPart} · ${distPart} · ${angPart}`;
  } else if (hasExplicitOrient && finalOrient) {
    canonicalLabel = `${posPart} · ${finalOrient} · ${distPart} · ${angPart}`;
  } else {
    canonicalLabel = `${posPart} · ${distPart} · ${angPart}`;
  }

  const sourceRawPlacement = rawCompound || rawPos || (rawOrient ? `Orientation: ${rawOrient}` : undefined) || (rawDist ? `Distance: ${rawDist}` : undefined) || (rawAng ? `Angle: ${rawAng}` : undefined);

  return {
    position: finalPos,
    orientation: finalOrient,
    distance: finalDist,
    angle: finalAng,
    rawPosition: rawPos,
    rawOrientation: rawOrient,
    rawDistance: rawDist,
    rawAngle: rawAng,
    rawCompound: rawCompound,
    sourceRawPlacement,
    raw_supplied_placement: sourceRawPlacement,
    wasSuppliedByChain: true,
    placement_was_supplied_by_chain: true,
    semanticProvenance: "signal_chain_generated",
    isUnspecified: false,
    canonicalLabel,
    canonical_placement_label: canonicalLabel
  };
}

/**
 * Strict Hierarchical Resolver for Cabinet Mic Placements
 *
 * PRECEDENCE:
 * 1. Exact verified Firestore cab/mic mapping (status: 'validated' | 'at5p_validated')
 * 2. Exact built-in reference calibration for tested cab/mic configuration (Mic0 / Mic_1 ONLY)
 * 3. Explicitly marked estimated fallback if one exists in Firestore (status: 'estimated' | 'discovered' | 'needs_review')
 * 4. Safe default / calibration gap if unresolved (DOES NOT silently apply reference coordinates to arbitrary cabs or Mic2)
 */
export function resolveCompositeMicPlacement(options: {
  cabName: string;
  cabGuid?: string;
  micSlot?: "Mic_0" | "Mic_1" | "Mic_2";
  slotIndex?: 0 | 1;
  requestedLabel?: string;
  distanceLabel?: string;
  angleLabel?: string;
  canonicalPlacement?: CanonicalSemanticMicPlacement;
  micModelName?: string;
  micModelGuid?: string;
  dbMappings?: MicPlacementMapping[];
}): PlacementResolutionResult {
  const {
    cabName,
    cabGuid = "",
    micSlot,
    slotIndex,
    requestedLabel = "",
    distanceLabel,
    angleLabel,
    canonicalPlacement,
    micModelName = "",
    micModelGuid = "",
    dbMappings = []
  } = options;

  // Determine canonical slot index: 0 (AT5 Mic0) or 1 (AT5 Mic1)
  const targetSlot: 0 | 1 = slotIndex !== undefined
    ? slotIndex
    : (micSlot === "Mic_0" ? 0 : (micSlot === "Mic_1" || micSlot === "Mic_2" ? 1 : 0));

  const prefix = targetSlot === 0 ? "Mic0" : "Mic1";
  const defaultSpeaker = targetSlot === 1 ? 1 : 0;
  const safeDefaultCoords: VIRCoordinates = {
    Angle: 0,
    XAxis: 0,
    YAxis: 0,
    Distance: 0,
    Speaker: defaultSpeaker
  };

  // Resolve or normalize canonical placement
  let canonical: CanonicalSemanticMicPlacement;
  if (canonicalPlacement) {
    canonical = canonicalPlacement;
  } else {
    // If not supplied, construct canonical object from individual fields
    const mockSettings: Record<string, any> = {};
    const effectiveSlotKey = targetSlot === 0 ? "Mic_0" : "Mic_1";
    if (requestedLabel) mockSettings[`${effectiveSlotKey}_Placement`] = requestedLabel;
    if (distanceLabel) mockSettings[`${effectiveSlotKey}_Distance`] = distanceLabel;
    if (angleLabel) mockSettings[`${effectiveSlotKey}_Angle`] = angleLabel;
    canonical = extractCanonicalMicPlacement(mockSettings, targetSlot);
  }

  // Case 0: Unspecified or empty placement
  if (canonical.isUnspecified) {
    return {
      resolved: false,
      coordinates: safeDefaultCoords,
      resolutionSource: "cab_default",
      matchedProfile: null,
      isEstimated: false,
      isReferenceCalibration: false,
      parsedLabel: "Not specified"
    };
  }

  const fullLabel = canonical.canonicalLabel;
  const parsed = {
    position: canonical.position,
    orientation: canonical.orientation,
    distance: canonical.distance,
    angle: canonical.angle,
    canonicalLabel: canonical.canonicalLabel,
    rawLabel: fullLabel
  };
  const cleanCab = cleanPlacementStr(cabName);
  const cleanGuid = cabGuid.toLowerCase().replace(/-/g, "").trim();

  // Helper matching functions
  const isSlotMatch = (m: MicPlacementMapping): boolean => {
    // 1. Direct micIndex check if present
    if (m.micIndex !== undefined) {
      return m.micIndex === targetSlot;
    }

    // 2. Authoritative check: maps_to contains Mic0 vs Mic1 keys
    const xml = m.maps_to || m.xml_values || {};
    const xmlKeys = Object.keys(xml);
    if (targetSlot === 0 && xmlKeys.some(k => k.toLowerCase().startsWith("mic0"))) return true;
    if (targetSlot === 1 && xmlKeys.some(k => k.toLowerCase().startsWith("mic1"))) return true;

    // 3. Normalized slot string check
    const s = (m.micSlot || m.mic_slot || m.friendly_setting || m.target || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (targetSlot === 0) {
      if (s === "mic0" || s === "mic0placement") return true;
      if ((s === "mic1" || s === "mic1placement") && !xmlKeys.some(k => k.toLowerCase().startsWith("mic1"))) return true;
    } else {
      if (s === "mic1" || s === "mic1placement") {
        if (xmlKeys.some(k => k.toLowerCase().startsWith("mic1"))) return true;
      }
      if (s === "mic2" || s === "mic2placement") return true;
    }

    return false;
  };

  const isCabMatch = (m: MicPlacementMapping): boolean => {
    if (cleanGuid && m.cabGuid && m.cabGuid.toLowerCase().replace(/-/g, "").trim() === cleanGuid) {
      return true;
    }
    if (m.cabName && cleanPlacementStr(m.cabName) === cleanCab) return true;
    if (m.gear && cleanPlacementStr(m.gear) === cleanCab) return true;
    if (m.cabAliases && Array.isArray(m.cabAliases)) {
      if (m.cabAliases.some(alias => cleanPlacementStr(alias) === cleanCab)) return true;
    }
    return false;
  };

  const isLabelMatch = (m: MicPlacementMapping): boolean => {
    const targetLabel = m.canonicalPlacementName || m.friendly_value || m.friendly_name || m.friendly_placement || "";
    if (cleanPlacementStr(targetLabel) === cleanPlacementStr(parsed.canonicalLabel)) return true;
    if (cleanPlacementStr(targetLabel) === cleanPlacementStr(fullLabel)) return true;

    // Component-level matching with cardinal orientation support
    const parsedTarget = parseSemanticPlacement(targetLabel);
    const compPos = m.friendly_placement || (m as any).friendlyPlacement || parsedTarget.position;
    const compOrient = (m.friendly_orientation || (m as any).friendlyOrientation || m.orientation || (parsedTarget.position !== "Cap" ? parsedTarget.orientation : undefined)) as SemanticOrientation | undefined;
    const compDist = m.friendly_distance || (m as any).friendlyDistance || parsedTarget.distance;
    const compAng = m.friendly_angle || (m as any).friendlyAngle || parsedTarget.angle;

    if (compPos) {
      const mPos = cleanPlacementStr(compPos);
      const mDist = cleanPlacementStr(compDist || "Close");
      const mAng = cleanPlacementStr(compAng || "On Axis");
      const pPos = cleanPlacementStr(parsed.position || "");
      const pDist = cleanPlacementStr(parsed.distance || "Close");
      const pAng = cleanPlacementStr(parsed.angle || "On Axis");

      // Cap is orientationless; for off-centre positions, absence of orientation implies W (West)
      const effectivePOrient = parsed.position === "Cap" ? undefined : (parsed.orientation || "W");
      const effectiveMOrient = getEffectiveMappingOrientation(m);

      if (mPos && mPos === pPos && mDist === pDist && mAng === pAng && effectiveMOrient === effectivePOrient) {
        return true;
      }

      // Check reconstructed strings with or without orientation
      const reconstructedWithOrient = compPos === "Cap"
        ? [compPos, compDist || "Close", compAng || "On Axis"].join(", ")
        : [compPos, effectiveMOrient, compDist || "Close", compAng || "On Axis"].join(", ");
      const reconstructedLegacy = [compPos, compDist || "Close", compAng || "On Axis"].join(", ");

      if (cleanPlacementStr(reconstructedWithOrient) === cleanPlacementStr(parsed.canonicalLabel) ||
          cleanPlacementStr(reconstructedWithOrient) === cleanPlacementStr(fullLabel) ||
          cleanPlacementStr(reconstructedLegacy) === cleanPlacementStr(parsed.canonicalLabel) ||
          cleanPlacementStr(reconstructedLegacy) === cleanPlacementStr(fullLabel)) {
        return true;
      }
    }

    if (m.placementAliases && Array.isArray(m.placementAliases)) {
      if (m.placementAliases.some(a => cleanPlacementStr(a) === cleanPlacementStr(parsed.canonicalLabel) || cleanPlacementStr(a) === cleanPlacementStr(fullLabel))) {
        return true;
      }
    }

    // Check if profile ID contains slug of requested placement
    if (m.id) {
      const cleanId = cleanPlacementStr(m.id);
      if (cleanId.includes(cleanPlacementStr(parsed.canonicalLabel)) || cleanId.includes(cleanPlacementStr(fullLabel))) {
        return true;
      }
    }

    return false;
  };

  const isMicScopeMatch = (m: MicPlacementMapping): boolean => {
    const scope = (m.micModelScope || (m as any).mic_model_scope || "").toLowerCase().trim();

    // 1. Explicit "any" scope matches all requested microphones
    if (scope === "any") {
      return true;
    }

    const mappingMicGuid = (m.micModelGuid || (m as any).mic_model_guid || "").toLowerCase().replace(/-/g, "").trim();
    const mappingMicName = m.micModelName || (m as any).mic_model_name || "";
    const cleanMappingMicName = cleanPlacementStr(mappingMicName);

    const cleanReqGuid = (micModelGuid || "").toLowerCase().replace(/-/g, "").trim();
    const cleanReqName = cleanPlacementStr(micModelName || "");

    const isSpecific = scope === "specific" || Boolean(mappingMicGuid || mappingMicName);

    if (isSpecific) {
      // If the mapping is specific to a mic, but no mic was requested, it matches if it's the only one or can match
      if (!cleanReqGuid && !cleanReqName) {
        return true;
      }

      // Priority 1: Match by GUID where available
      if (mappingMicGuid && cleanReqGuid && mappingMicGuid === cleanReqGuid) {
        return true;
      }

      // Priority 2: Match by normalized canonical name
      if (cleanMappingMicName && cleanReqName && (cleanMappingMicName === cleanReqName || cleanMappingMicName.includes(cleanReqName) || cleanReqName.includes(cleanMappingMicName))) {
        return true;
      }

      // Priority 3: Match against mapping's custom mic aliases if present
      if (m.micAliases && Array.isArray(m.micAliases)) {
        if (m.micAliases.some(a => cleanPlacementStr(a) === cleanReqName)) {
          return true;
        }
      }

      // Priority 4: Match against verified reference mic aliases if mapping references a known reference mic
      const refMic = VIR_REFERENCE_MICS.find(r =>
        (mappingMicGuid && r.guid.toLowerCase().replace(/-/g, "") === mappingMicGuid) ||
        (cleanMappingMicName && cleanPlacementStr(r.name) === cleanMappingMicName) ||
        (cleanMappingMicName && r.aliases.some(a => cleanPlacementStr(a) === cleanMappingMicName))
      );

      if (refMic) {
        if (cleanReqGuid && refMic.guid.toLowerCase().replace(/-/g, "") === cleanReqGuid) return true;
        if (cleanReqName && cleanPlacementStr(refMic.name) === cleanReqName) return true;
        if (cleanReqName && refMic.aliases.some(a => cleanPlacementStr(a) === cleanReqName)) return true;
      }

      return false;
    }

    // For legacy records with no micModelScope AND neither micModelGuid nor micModelName:
    // Preserved for backward compatibility when no specific model conflict exists
    return true;
  };

  // STEP 1: Matching Firestore cab/mic profiles (Tier 1: Firestore-registered Profiles)
  // All active user-calibrated or registered Firestore profiles take top priority over built-in fallback tables
  const matchingFirestoreProfiles = dbMappings.filter(m => {
    const status = (m.status || m.validation_status || m.validationStatus || "").toLowerCase();
    if (status === "rejected" || status === "disabled") return false;
    return isSlotMatch(m) && isCabMatch(m) && isLabelMatch(m) && isMicScopeMatch(m);
  });

  if (matchingFirestoreProfiles.length > 0) {
    // Sort so verified / manual calibration takes precedence over unreviewed
    matchingFirestoreProfiles.sort((a, b) => {
      const statusA = (a.status || a.validation_status || a.validationStatus || "").toLowerCase();
      const statusB = (b.status || b.validation_status || b.validationStatus || "").toLowerCase();
      const isAHigh = statusA === "validated" || statusA === "at5p_validated" || statusA === "verified_calibration" || statusA === "verified" || a.source === "manual_calibration" || a.source === "user_edited" || a.isCustomProfile;
      const isBHigh = statusB === "validated" || statusB === "at5p_validated" || statusB === "verified_calibration" || statusB === "verified" || b.source === "manual_calibration" || b.source === "user_edited" || b.isCustomProfile;
      if (isAHigh && !isBHigh) return -1;
      if (!isAHigh && isBHigh) return 1;
      return 0;
    });

    const match = matchingFirestoreProfiles[0];
    const xml = match.maps_to || match.xml_values || {};

    const findCoord = (fieldName: string, fallback: number): number => {
      const full = `${prefix}${fieldName}`;
      if (xml[full] !== undefined && xml[full] !== null && xml[full] !== "") {
        return toCoordNum(xml[full], fallback);
      }
      if (xml[fieldName] !== undefined && xml[fieldName] !== null && xml[fieldName] !== "") {
        return toCoordNum(xml[fieldName], fallback);
      }
      const fullLower = full.toLowerCase();
      const fieldLower = fieldName.toLowerCase();
      for (const [k, v] of Object.entries(xml)) {
        const kl = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if ((kl === fullLower || kl === fieldLower) && v !== undefined && v !== null && v !== "") {
          return toCoordNum(v, fallback);
        }
      }
      return fallback;
    };
    
    return {
      resolved: true,
      coordinates: {
        Angle: findCoord("Angle", 0),
        XAxis: findCoord("XAxis", 0),
        YAxis: findCoord("YAxis", 0),
        Distance: findCoord("Distance", 0),
        Speaker: findCoord("Speaker", defaultSpeaker)
      },
      resolutionSource: "firestore_verified",
      matchedProfile: match,
      isEstimated: false,
      isReferenceCalibration: false,
      isCalibrated: true,
      semanticPosition: parsed.position,
      semanticOrientation: parsed.orientation,
      semanticDistance: parsed.distance,
      semanticAngle: parsed.angle,
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 2: Authoritative Physical VIR Reference Calibration for verified reference cabinets
  // The physical VIR 3D coordinate grid is an intrinsic geometric property of the speaker cone/cabinet.
  // Any valid AT5 microphone transducer mounted in front of that cabinet inherits the verified spatial coordinates.
  const isRefCab = isVIRReferenceCabinet(cabName, cabGuid);
  const isRefMic = isVIRReferenceMic(micModelName, micModelGuid);

  if ((targetSlot === 0 || targetSlot === 1) && isRefCab && parsed.position) {
    const slotKey = targetSlot === 0 ? "Mic_0" : "Mic_1";
    const composed = composeVIRCoordinates(
      parsed.position,
      parsed.distance || "Close",
      parsed.angle || "On Axis",
      slotKey,
      undefined,
      parsed.orientation
    );

    // If cardinal orientation has no verified AT5 calibration yet (e.g. E/S without override),
    // strictly report as uncalibrated calibration gap rather than fabricating coordinates.
    if (!composed.isCalibrated) {
      return {
        resolved: false,
        coordinates: safeDefaultCoords,
        resolutionSource: "uncalibrated_orientation_gap",
        matchedProfile: null,
        isEstimated: false,
        isReferenceCalibration: false,
        isCalibrated: false,
        warning: `Calibration gap: ${parsed.position} (${parsed.orientation || "unspecified"}) is awaiting verified AT5 calibration. Exporting safe standard coordinates.`,
        semanticPosition: parsed.position,
        semanticOrientation: parsed.orientation,
        semanticDistance: parsed.distance || "Close",
        semanticAngle: parsed.angle || "On Axis",
        parsedLabel: parsed.canonicalLabel
      };
    }

    return {
      resolved: true,
      coordinates: composed,
      resolutionSource: "reference_calibration_vir",
      matchedProfile: null,
      isEstimated: false,
      isReferenceCalibration: true,
      isCalibrated: true,
      semanticPosition: parsed.position,
      semanticOrientation: parsed.orientation,
      semanticDistance: parsed.distance || "Close",
      semanticAngle: parsed.angle || "On Axis",
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 3: Explicitly Marked Estimated Fallback from Firestore
  const estimatedMappings = dbMappings.filter(m => {
    const status = (m.status || m.validation_status || m.validationStatus || "").toLowerCase();
    return (status === "estimated" || status === "discovered" || status === "needs_review") &&
      isSlotMatch(m) &&
      isCabMatch(m) &&
      isLabelMatch(m) &&
      isMicScopeMatch(m);
  });

  if (estimatedMappings.length > 0) {
    const match = estimatedMappings[0];
    const xml = match.maps_to || match.xml_values || {};

    return {
      resolved: true,
      coordinates: {
        Angle: toCoordNum(xml[`${prefix}Angle`] ?? xml.Angle, 0),
        XAxis: toCoordNum(xml[`${prefix}XAxis`] ?? xml.XAxis, 0),
        YAxis: toCoordNum(xml[`${prefix}YAxis`] ?? xml.YAxis, 0),
        Distance: toCoordNum(xml[`${prefix}Distance`] ?? xml.Distance, 0),
        Speaker: toCoordNum(xml[`${prefix}Speaker`] ?? xml.Speaker, defaultSpeaker)
      },
      resolutionSource: "estimated_profile",
      matchedProfile: match,
      isEstimated: true,
      isReferenceCalibration: false,
      isCalibrated: false,
      warning: `Resolved from unverified/estimated profile for ${cabName}.`,
      semanticPosition: parsed.position,
      semanticOrientation: parsed.orientation,
      semanticDistance: parsed.distance,
      semanticAngle: parsed.angle,
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 4: Safe Default / Calibration Gap if Unresolved
  let warningMsg: string;
  if (!isRefCab) {
    warningMsg = `No verified mic placement profile found for "${fullLabel}" on cabinet "${cabName}". Exporting safe standard coordinates (Center/Close).`;
  } else if (!parsed.position) {
    warningMsg = `Semantic mic placement "${fullLabel}" could not be parsed into recognized VIR dimensions.`;
  } else {
    warningMsg = `Position "${parsed.position}" on slot ${targetSlot} is uncalibrated against AT5P reference exports for "${cabName}". Exporting safe standard coordinates.`;
  }

  return {
    resolved: false,
    coordinates: safeDefaultCoords,
    resolutionSource: "safe_default",
    matchedProfile: null,
    isEstimated: false,
    isReferenceCalibration: false,
    isCalibrated: false,
    warning: warningMsg,
    semanticPosition: parsed.position,
    semanticOrientation: parsed.orientation,
    semanticDistance: parsed.distance,
    semanticAngle: parsed.angle,
    parsedLabel: parsed.canonicalLabel
  };
}

