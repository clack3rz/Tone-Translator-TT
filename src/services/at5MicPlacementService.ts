// src/services/at5MicPlacementService.ts
// Authoritative VIR (Volumetric Impulse Response) Cabinet Mic Placement & Calibration Service

import { MicPlacementMapping } from "../types";

export type SemanticPosition = "Cap" | "Cap Edge" | "Cone" | "Cone Edge";
export type SemanticDistance = "Close" | "Medium" | "Far";
export type SemanticAngle = "On Axis" | "45° Off Axis";

export interface VIRCoordinates {
  Angle: number;
  XAxis: number;
  YAxis: number;
  Distance: number;
  Speaker: number;
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
 * Authoritative VIR Reference Grid Coordinates (Numeric)
 * Verified on IK Multimedia AmpliTube 5 VIR 3D Speaker Grid against 7 controlled AT5P exports
 */
export const VIR_CALIBRATION_COORDINATES = {
  positions: {
    "Cap": { X: 0, Y: 0, label: "Cap (Center)" },
    "Cap Edge": { X: -0.214223, Y: -0.00519017, label: "Cap Edge" },
    "Cone": { X: -0.428446, Y: -0.0103803, label: "Cone" },
    "Cone Edge": { X: -0.785484, Y: -0.0190306, label: "Cone Edge" }
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
    Mic_1: { defaultSpeaker: 0, label: "Speaker 1 (Top Left)" },
    Mic_2: { defaultSpeaker: 1, label: "Speaker 2 (Top Right)" }
  }
} as const;

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
      "brit 8000"
    ]
  }
];

/**
 * Reference Microphones verified with VIR calibrations
 * Strictly verified on Mic0Model = 1e41acc4-85af-4e84-bee4-eabc0be5fef1 (Dynamic 57)
 */
export const VIR_REFERENCE_MICS: { name: string; guid: string; aliases: string[] }[] = [
  {
    name: "Dynamic 57",
    guid: "1e41acc4-85af-4e84-bee4-eabc0be5fef1",
    aliases: ["dynamic 57", "sm57", "57", "shure sm57"]
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
 * Generates exact numeric VIR coordinates for composite semantic placement parameters
 */
export function composeVIRCoordinates(
  position: SemanticPosition = "Cap Edge",
  distance: SemanticDistance = "Close",
  angle: SemanticAngle = "On Axis",
  micSlot: "Mic_1" | "Mic_2" = "Mic_1",
  speakerOverride?: number
): VIRCoordinates {
  const posCoords = VIR_CALIBRATION_COORDINATES.positions[position] || VIR_CALIBRATION_COORDINATES.positions["Cap Edge"];
  const distCoords = VIR_CALIBRATION_COORDINATES.distances[distance] || VIR_CALIBRATION_COORDINATES.distances["Close"];
  const angleCoords = VIR_CALIBRATION_COORDINATES.angles[angle] || VIR_CALIBRATION_COORDINATES.angles["On Axis"];
  
  const defaultSpeaker = micSlot === "Mic_2" ? 1 : 0;
  const speakerVal = speakerOverride !== undefined ? Number(speakerOverride) : defaultSpeaker;

  return {
    Angle: angleCoords.Angle,
    XAxis: posCoords.X,
    YAxis: posCoords.Y,
    Distance: distCoords.Distance,
    Speaker: speakerVal
  };
}

function toCoordNum(val: any, fallback: number): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
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

  const defaultSpeaker = micSlot === "Mic_2" ? 1 : 0;
  const safeDefaultCoords: VIRCoordinates = {
    Angle: 0,
    XAxis: 0,
    YAxis: 0,
    Distance: 0,
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
      // If the mapping is specific to a mic, but no mic was requested, it cannot match as verified
      if (!cleanReqGuid && !cleanReqName) {
        return false;
      }

      // Priority 1: Match by GUID where available
      if (mappingMicGuid && cleanReqGuid && mappingMicGuid === cleanReqGuid) {
        return true;
      }

      // Priority 2: Match by normalized canonical name
      if (cleanMappingMicName && cleanReqName && cleanMappingMicName === cleanReqName) {
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

  // STEP 1: Exact Verified Firestore cab/mic mapping
  const verifiedMappings = dbMappings.filter(m => {
    const status = (m.status || m.validation_status || m.validationStatus || "").toLowerCase();
    return (status === "validated" || status === "at5p_validated" || status === "verified_calibration") &&
      isSlotMatch(m) &&
      isCabMatch(m) &&
      isLabelMatch(m) &&
      isMicScopeMatch(m);
  });

  if (verifiedMappings.length > 0) {
    const match = verifiedMappings[0];
    const xml = match.maps_to || match.xml_values || {};
    const prefix = micSlot === "Mic_1" ? "Mic0" : "Mic1";
    
    return {
      resolved: true,
      coordinates: {
        Angle: toCoordNum(xml[`${prefix}Angle`] ?? xml.Angle, 0),
        XAxis: toCoordNum(xml[`${prefix}XAxis`] ?? xml.XAxis, 0),
        YAxis: toCoordNum(xml[`${prefix}YAxis`] ?? xml.YAxis, 0),
        Distance: toCoordNum(xml[`${prefix}Distance`] ?? xml.Distance, 0),
        Speaker: toCoordNum(xml[`${prefix}Speaker`] ?? xml.Speaker, defaultSpeaker)
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

  // STEP 2: Exact Built-in Reference Calibration for tested cab/mic (Mic0 / Mic_1 ONLY)
  // Controlled calibration manipulated Mic0 (Dynamic 57) on 4x12 Brit 8000.
  // Mic1 (Mic_2) was untouched, so Mic_2 remains a calibration gap and does NOT resolve here.
  const isRefCab = isVIRReferenceCabinet(cabName, cabGuid);
  const isRefMic = isVIRReferenceMic(micModelName, micModelGuid);

  if (micSlot === "Mic_1" && isRefCab && isRefMic && parsed.position) {
    const composed = composeVIRCoordinates(
      parsed.position,
      parsed.distance || "Close",
      parsed.angle || "On Axis",
      "Mic_1"
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
      isLabelMatch(m) &&
      isMicScopeMatch(m);
  });

  if (estimatedMappings.length > 0) {
    const match = estimatedMappings[0];
    const xml = match.maps_to || match.xml_values || {};
    const prefix = micSlot === "Mic_1" ? "Mic0" : "Mic1";

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
      warning: `Resolved from unverified/estimated profile for ${cabName}.`,
      semanticPosition: parsed.position,
      semanticDistance: parsed.distance,
      semanticAngle: parsed.angle,
      parsedLabel: parsed.canonicalLabel
    };
  }

  // STEP 4: Safe Default / Calibration Gap if Unresolved
  let warningMsg: string;
  if (micSlot === "Mic_2") {
    warningMsg = `Mic 2 (Mic 1 slot) radial calibration is uncalibrated/unverified against AT5P exports. Defaulting to safe coordinates with Speaker 1 provenance.`;
  } else if (!isRefCab) {
    warningMsg = `No verified mic placement profile found for "${fullLabel}" on cabinet "${cabName}". Exporting safe standard coordinates (Center/Close).`;
  } else if (!isRefMic) {
    warningMsg = `Microphone "${micModelName || 'unspecified'}" has not been calibrated against AT5P reference exports for "${cabName}". Exporting safe standard coordinates.`;
  } else {
    warningMsg = `Semantic mic placement "${fullLabel}" could not be parsed into recognized VIR dimensions.`;
  }

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

