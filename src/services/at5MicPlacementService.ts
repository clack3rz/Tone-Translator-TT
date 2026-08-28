// src/services/at5MicPlacementService.ts
// Authoritative VIR (Volumetric Impulse Response) Cabinet Mic Placement & Calibration Service

import { MicPlacementMapping } from "../types";

export type SemanticPosition = "Cap" | "Cap Edge" | "Cone" | "Cone Edge";
export type SemanticDistance = "Close" | "Medium" | "Far";
export type SemanticAngle = "On Axis" | "45° Off Axis";

export interface VIRCoordinates {
  Angle: string | number;
  XAxis: string | number;
  YAxis: string | number;
  Distance: string | number;
  Speaker: string | number;
}

export interface ParsedSemanticPlacement {
  position?: SemanticPosition;
  distance?: SemanticDistance;
  angle?: SemanticAngle;
  speakerIndex?: number;
  rawLabel: string;
  canonicalLabel: string;
}

export interface PlacementResolutionResult {
  resolved: boolean;
  coordinates: VIRCoordinates;
  resolutionSource: "firestore_verified" | "reference_calibration_vir" | "estimated_profile" | "safe_default" | "cab_default";
  matchedProfile?: MicPlacementMapping | null;
  isEstimated: boolean;
  isReferenceCalibration: boolean;
  warning?: string;
  semanticPosition?: string;
  semanticDistance?: string;
  semanticAngle?: string;
  parsedLabel: string;
}

/**
 * Authoritative VIR Reference Grid Coordinates
 * Verified on IK Multimedia AmpliTube 5 VIR 3D Speaker Grid
 */
export const VIR_CALIBRATION_COORDINATES = {
  positions: {
    "Cap": { X: "0", Y: "0", label: "Cap (Center)" },
    "Cap Edge": { X: "-0.214223", Y: "-0.00519017", label: "Cap Edge" },
    "Cone": { X: "-0.428446", Y: "-0.0103803", label: "Cone" },
    "Cone Edge": { X: "-0.785484", Y: "-0.0190306", label: "Cone Edge" }
  },
  distances: {
    "Close": { Distance: "0", label: "Close (Grille)" },
    "Medium": { Distance: "0.5", label: "Medium (Mid-Distance)" },
    "Far": { Distance: "1", label: "Far (Room Offset)" }
  },
  angles: {
    "On Axis": { Angle: "0", label: "On Axis (0°)" },
    "45° Off Axis": { Angle: "1", label: "45° Off Axis" }
  },
  speakers: {
    Mic_1: { defaultSpeaker: "0", label: "Speaker 1 (Top Left)" },
    Mic_2: { defaultSpeaker: "1", label: "Speaker 2 (Top Right)" }
  }
} as const;

/**
 * Reference Cabinets verified for VIR Coordinate Grid calibration
 */
export const VIR_REFERENCE_CABINETS: { name: string; guid: string; aliases: string[] }[] = [
  {
    name: "4x12 Brit 8000",
    guid: "fb5fc82f-a926-4591-87d2-168906fd79d3",
    aliases: [
      "4x12 brit 8000",
      "4x12 british lead s100",
      "british lead s100",
      "british tube lead 1",
      "british lead s",
      "british lead s (jcm800)",
      "british lead s100 (jcm800)",
      "4x12 british tube lead 1",
      "marshall 1960",
      "4x12 1960av sl"
    ]
  },
  {
    name: "4x12 Closed 75 C",
    guid: "c4ea21cc-6444-4779-9eee-62d4bc085410",
    aliases: [
      "4x12 closed 75 c",
      "4x12 closed 75c",
      "4x12 british 30",
      "closed 75",
      "4x12 v30"
    ]
  }
];

/**
 * Reference Microphones verified with VIR calibrations
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
  },
  {
    name: "Condenser 414",
    guid: "0f35a776-f6db-403d-930f-6b7f42fed749",
    aliases: ["condenser 414", "c414", "414", "akg c414"]
  },
  {
    name: "Dynamic 421",
    guid: "b216abec-6fae-4fcd-95fd-c89aacf60ee2",
    aliases: ["dynamic 421", "md 421", "421", "sennheiser 421", "md421"]
  },
  {
    name: "Ribbon 121",
    guid: "cf06582b-4b26-42ce-9491-e00e7ab2481e",
    aliases: ["ribbon 121", "r121", "121", "royer 121", "royer r-121"]
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
 * Parses free-form semantic placement text into discrete position, distance, and angle
 * e.g. "Cap Edge, Far, 45° Off Axis" -> { position: "Cap Edge", distance: "Far", angle: "45° Off Axis" }
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

  // 2. Distance parsing
  let distance: SemanticDistance | undefined = undefined;
  if (lower.includes("far") || lower.includes("room") || lower.includes("distant") || lower.includes("1.0") || lower.includes("back")) {
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

  // Fallback defaults if position was identified but distance/angle omitted
  const posPart = position || "Cap Edge";
  const distPart = distance || "Close";
  const angPart = angle || "On Axis";

  const canonicalLabelParts: string[] = [posPart];
  if (distance) canonicalLabelParts.push(distPart);
  if (angle) canonicalLabelParts.push(angPart);

  return {
    position,
    distance,
    angle,
    rawLabel: clean,
    canonicalLabel: canonicalLabelParts.join(", ")
  };
}

/**
 * Checks if a given cabinet is one of the verified VIR reference cabinets
 */
export function isVIRReferenceCabinet(cabName?: string, cabGuid?: string): boolean {
  if (!cabName && !cabGuid) return false;

  const cleanCab = cleanPlacementStr(cabName || "");
  const cleanGuid = (cabGuid || "").toLowerCase().replace(/-/g, "").trim();

  return VIR_REFERENCE_CABINETS.some(ref => {
    if (cleanGuid && ref.guid.toLowerCase().replace(/-/g, "").trim() === cleanGuid) {
      return true;
    }
    const cleanRefName = cleanPlacementStr(ref.name);
    if (cleanRefName === cleanCab) return true;
    return ref.aliases.some(alias => cleanPlacementStr(alias) === cleanCab);
  });
}

/**
 * Checks if a given microphone is one of the verified VIR reference microphones
 */
export function isVIRReferenceMic(micName?: string, micGuid?: string): boolean {
  if (!micName && !micGuid) return true; // If unspecified, assume compatible standard mic

  const cleanMic = cleanPlacementStr(micName || "");
  const cleanGuid = (micGuid || "").toLowerCase().replace(/-/g, "").trim();

  return VIR_REFERENCE_MICS.some(ref => {
    if (cleanGuid && ref.guid.toLowerCase().replace(/-/g, "").trim() === cleanGuid) {
      return true;
    }
    const cleanRefName = cleanPlacementStr(ref.name);
    if (cleanRefName === cleanMic) return true;
    return ref.aliases.some(alias => cleanPlacementStr(alias) === cleanMic);
  });
}

/**
 * Generates exact AT5 XML coordinates for composite semantic placement parameters
 */
export function composeVIRCoordinates(
  position: SemanticPosition = "Cap Edge",
  distance: SemanticDistance = "Close",
  angle: SemanticAngle = "On Axis",
  micSlot: "Mic_1" | "Mic_2" = "Mic_1",
  speakerOverride?: string | number
): VIRCoordinates {
  const posCoords = VIR_CALIBRATION_COORDINATES.positions[position] || VIR_CALIBRATION_COORDINATES.positions["Cap Edge"];
  const distCoords = VIR_CALIBRATION_COORDINATES.distances[distance] || VIR_CALIBRATION_COORDINATES.distances["Close"];
  const angleCoords = VIR_CALIBRATION_COORDINATES.angles[angle] || VIR_CALIBRATION_COORDINATES.angles["On Axis"];
  
  const defaultSpeaker = micSlot === "Mic_2" ? "1" : "0";
  const speakerVal = speakerOverride !== undefined ? String(speakerOverride) : defaultSpeaker;

  return {
    Angle: angleCoords.Angle,
    XAxis: posCoords.X,
    YAxis: posCoords.Y,
    Distance: distCoords.Distance,
    Speaker: speakerVal
  };
}

/**
 * Strict Hierarchical Resolver for Cabinet Mic Placements
 *
 * PRECEDENCE:
 * 1. Exact verified Firestore cab/mic mapping (status: 'validated' | 'at5p_validated')
 * 2. Exact built-in reference calibration for tested cab/mic configuration
 * 3. Explicitly marked estimated fallback if one exists in Firestore (status: 'estimated' | 'discovered')
 * 4. Safe default / warning if unresolved (DOES NOT silently apply reference coordinates to arbitrary cabs)
 */
export function resolveCompositeMicPlacement(options: {
  cabName: string;
  cabGuid?: string;
  micSlot: "Mic_1" | "Mic_2";
  requestedLabel: string;
  distanceLabel?: string;
  angleLabel?: string;
  micModelName?: string;
  micModelGuid?: string;
  dbMappings?: MicPlacementMapping[];
}): PlacementResolutionResult {
  const {
    cabName,
    cabGuid = "",
    micSlot,
    requestedLabel,
    distanceLabel,
    angleLabel,
    micModelName = "",
    micModelGuid = "",
    dbMappings = []
  } = options;

  const defaultSpeaker = micSlot === "Mic_2" ? "1" : "0";
  const safeDefaultCoords: VIRCoordinates = {
    Angle: "0",
    XAxis: "0",
    YAxis: "0",
    Distance: "0",
    Speaker: defaultSpeaker
  };

  // Case 0: Unspecified or empty placement
  if (isUnspecifiedPlacement(requestedLabel)) {
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

  // Combine components into composite label if separate fields were provided
  let fullLabel = String(requestedLabel).trim();
  if (distanceLabel && !fullLabel.toLowerCase().includes(distanceLabel.toLowerCase())) {
    fullLabel = `${fullLabel}, ${distanceLabel}`;
  }
  if (angleLabel && !fullLabel.toLowerCase().includes(angleLabel.toLowerCase())) {
    fullLabel = `${fullLabel}, ${angleLabel}`;
  }

  const parsed = parseSemanticPlacement(fullLabel);
  const cleanCab = cleanPlacementStr(cabName);
  const cleanGuid = cabGuid.toLowerCase().replace(/-/g, "").trim();

  // Helper matching functions
  const isSlotMatch = (m: MicPlacementMapping): boolean => {
    const s = m.micSlot || m.mic_slot || m.friendly_setting || m.target || "";
    const cleanS = s.toLowerCase().replace(/_/g, "");
    const cleanReq = micSlot.toLowerCase().replace(/_/g, "");
    return cleanS === cleanReq || cleanS === cleanReq + "placement";
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
    if (m.placementAliases && Array.isArray(m.placementAliases)) {
      if (m.placementAliases.some(a => cleanPlacementStr(a) === cleanPlacementStr(parsed.canonicalLabel) || cleanPlacementStr(a) === cleanPlacementStr(fullLabel))) {
        return true;
      }
    }
    return false;
  };

  // STEP 1: Exact Verified Firestore cab/mic mapping
  const verifiedMappings = dbMappings.filter(m => {
    const status = (m.status || m.validation_status || m.validationStatus || "").toLowerCase();
    return (status === "validated" || status === "at5p_validated" || status === "verified_calibration") &&
      isSlotMatch(m) &&
      isCabMatch(m) &&
      isLabelMatch(m);
  });

  if (verifiedMappings.length > 0) {
    const match = verifiedMappings[0];
    const xml = match.maps_to || match.xml_values || {};
    const prefix = micSlot === "Mic_1" ? "Mic0" : "Mic1";
    
    return {
      resolved: true,
      coordinates: {
        Angle: xml[`${prefix}Angle`] ?? xml.Angle ?? "0",
        XAxis: xml[`${prefix}XAxis`] ?? xml.XAxis ?? "0",
        YAxis: xml[`${prefix}YAxis`] ?? xml.YAxis ?? "0",
        Distance: xml[`${prefix}Distance`] ?? xml.Distance ?? "0",
        Speaker: xml[`${prefix}Speaker`] ?? xml.Speaker ?? defaultSpeaker
      },
      resolutionSource: "firestore_verified",
      matchedProfile: match,
      isEstimated: false,
      isReferenceCalibration: false,
      semanticPosition: parsed.position,
      semanticDistance: parsed.distance,
      semanticAngle: parsed.angle,
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 2: Exact Built-in Reference Calibration for tested cab/mic
  const isRefCab = isVIRReferenceCabinet(cabName, cabGuid);
  const isRefMic = isVIRReferenceMic(micModelName, micModelGuid);

  if (isRefCab && isRefMic && parsed.position) {
    const composed = composeVIRCoordinates(
      parsed.position,
      parsed.distance || "Close",
      parsed.angle || "On Axis",
      micSlot
    );

    return {
      resolved: true,
      coordinates: composed,
      resolutionSource: "reference_calibration_vir",
      matchedProfile: null,
      isEstimated: false,
      isReferenceCalibration: true,
      semanticPosition: parsed.position,
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
      isLabelMatch(m);
  });

  if (estimatedMappings.length > 0) {
    const match = estimatedMappings[0];
    const xml = match.maps_to || match.xml_values || {};
    const prefix = micSlot === "Mic_1" ? "Mic0" : "Mic1";

    return {
      resolved: true,
      coordinates: {
        Angle: xml[`${prefix}Angle`] ?? xml.Angle ?? "0",
        XAxis: xml[`${prefix}XAxis`] ?? xml.XAxis ?? "0",
        YAxis: xml[`${prefix}YAxis`] ?? xml.YAxis ?? "0",
        Distance: xml[`${prefix}Distance`] ?? xml.Distance ?? "0",
        Speaker: xml[`${prefix}Speaker`] ?? xml.Speaker ?? defaultSpeaker
      },
      resolutionSource: "estimated_profile",
      matchedProfile: match,
      isEstimated: true,
      isReferenceCalibration: false,
      warning: `Resolved from unverified/estimated profile for ${cabName}.`,
      semanticPosition: parsed.position,
      semanticDistance: parsed.distance,
      semanticAngle: parsed.angle,
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 4: Safe Default / Warning if Unresolved (Does NOT silently apply reference coordinates globally!)
  const warningMsg = isRefCab 
    ? `Semantic mic placement "${fullLabel}" could not be parsed into recognized VIR dimensions.`
    : `No verified mic placement profile found for "${fullLabel}" on cabinet "${cabName}". Exporting safe standard coordinates (Center/Close).`;

  return {
    resolved: false,
    coordinates: safeDefaultCoords,
    resolutionSource: "safe_default",
    matchedProfile: null,
    isEstimated: false,
    isReferenceCalibration: false,
    warning: warningMsg,
    semanticPosition: parsed.position,
    semanticDistance: parsed.distance,
    semanticAngle: parsed.angle,
    parsedLabel: parsed.canonicalLabel
  };
}
