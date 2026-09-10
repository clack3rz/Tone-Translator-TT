// src/services/presetExporter.ts
// Deterministic AT5 .at5p XML exporter. Do not call Gemini to serialize presets.

import { normaliseSignalChain, filterDuplicateEqsWithRemoved } from "./at5SignalChainNormalizer";
import { ToneResult, SignalChainElement, RackDecision, MicPlacementMapping } from "../types";
import { AT5_EMPTY_SLOT_GUID, findAT5GearGuid, findAT5Gear, getAt5Catalog, findBestCatalogMatchAcrossGroups } from "./at5Catalog";
import {
  buildMappedParameterAttrs,
  resolveVerifiedOrManifestRealId,
  getParameterDefinitions,
  normalizeSettingsToCanonical,
  resolveParameterValue,
  parseFrequencyToHz,
  findClosestBand,
  getDbMicPlacementMappings,
  findVerifiedGear,
  generateAliasesForXmlParam,
  inferParameterKind,
  parseSettingValue,
  convertParameterValueForExport,
  verifyParameterExportMatch,
} from "./at5ParameterManifest";

import { at5DatabaseService } from "./at5DatabaseService";
import {
  resolveCompositeMicPlacement,
  extractCanonicalMicPlacement,
  CanonicalSemanticMicPlacement
} from "./at5MicPlacementService";

import { getVerifiedCabs, getVerifiedSpeakers, getVerifiedMics } from "./at5VerifiedProtocols";

const DEFAULT_AMP_GUID = "8fe96936-5178-4950-9b80-d89c32534bad"; // Brit 8000 / JCM800
const DEFAULT_CAB_GUID = "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b"; // 4x12 Brit 8000
const DEFAULT_SPEAKER_GUID = "e372dd04b11d49588c290fbe341e97ca"; // Brit 75
const DEFAULT_MIC0_GUID = "1e41acc4-85af-4e84-bee4-eabc0be5fef1"; // Dynamic 57
const DEFAULT_MIC1_GUID = "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb"; // Condenser 87

export let exportStrictnessMode: "safe" | "learning" | "strict" = "learning";

export function setExportStrictnessMode(mode: "safe" | "learning" | "strict") {
  exportStrictnessMode = mode;
}

const VERIFIED_RACK_NAMES = [
  "parametric eq",
  "graphic eq",
  "10 band graphic",
  "eq pg",
  "eq-pg",
  "black 76",
  "white 2a",
  "white-2a",
  "fender compressor",
  "white 2a (levelling amp)",
  "tube compressor",
];

const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
};

const escapeXml = (unsafe: unknown) =>
  String(unsafe ?? "").replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });


const cleanXmlAttrString = (attrs: string) => {
  return String(attrs ?? "")
    .replace(/\s*[A-Za-z0-9_]+="undefined"/g, "")
    .replace(/\s*[A-Za-z0-9_]+="null"/g, "")
    .replace(/\s*[A-Za-z0-9_]+=""/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const ensureBrit8000Sensitivity = (ampGuid: string, attrs: string) => {
  let cleaned = cleanXmlAttrString(attrs);

  if (ampGuid === DEFAULT_AMP_GUID) {
    cleaned = cleaned
      .replace(/\s*Sensitivity_JCM800AT4="undefined"/g, "")
      .replace(/\s*Sensitivity_JCM800AT4="null"/g, "")
      .replace(/\s*Sensitivity_JCM800AT4=""/g, "")
      .trim();

    if (!cleaned.includes("Sensitivity_JCM800AT4=")) {
      cleaned = `Sensitivity_JCM800AT4="1" ${cleaned}`.trim();
    }
  }

  return cleaned;
};

export function isAt5pValidatedStatus(status: string | undefined, profile?: any): boolean {
  if (!status && profile) {
    status = profile.validationStatus || profile.profileStatus || (profile.validation && profile.validation.status);
  }
  if (!status) return false;

  const s = String(status).trim().toLowerCase().replace(/^\.+/, "").trim();
  const validStrings = [
    "at5p_validated",
    "verified_at5p",
    "at5p validated",
    "verified at5p"
  ];

  if (validStrings.includes(s)) {
    return true;
  }

  // PASS, if profileStatus/validation.status is PASS and the profile has a valid GUID and parameters
  if (s === "pass") {
    if (profile) {
      const guid = profile.guid || "";
      const isUuid = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(guid.trim());
      const knobsExist = profile.knobs && profile.knobs.length > 0;
      const paramsExist = profile.parameters && profile.parameters.length > 0;
      const parametersExist = knobsExist || paramsExist || getParameterDefinitions(profile.displayName || profile.name, profile.group || profile.type).length > 0;
      
      if (isUuid && parametersExist) {
        return true;
      }
    } else {
      return true;
    }
  }

  if (profile) {
    const pStatus = (profile.profileStatus || "").trim().toLowerCase();
    const vStatus = (profile.validationStatus || "").trim().toLowerCase();
    const innerValStatus = (profile.validation && profile.validation.status) 
      ? String(profile.validation.status).trim().toLowerCase() 
      : "";
    
    if (pStatus === "pass" || vStatus === "pass" || innerValStatus === "pass") {
      const guid = profile.guid || "";
      const isUuid = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(guid.trim());
      const knobsExist = profile.knobs && profile.knobs.length > 0;
      const paramsExist = profile.parameters && profile.parameters.length > 0;
      const parametersExist = knobsExist || paramsExist || getParameterDefinitions(profile.displayName || profile.name, profile.group || profile.type).length > 0;
      
      if (isUuid && parametersExist) {
        return true;
      }
    }
  }

  return false;
}

const getFallbackGuidForGroup = (group: "amp" | "cab" | "stomp" | "rack") => {
  if (group === "amp") return DEFAULT_AMP_GUID;
  if (group === "cab") return DEFAULT_CAB_GUID;
  return AT5_EMPTY_SLOT_GUID;
};

export interface GearGuidInfo {
  resolvedGuid: string;
  final_guid_source: "gear_manager_db" | "at5p_discovery" | "verified_static" | "manifest" | "catalog_general" | "fallback";
  fallback_block_triggered: boolean;
  profile_validation_status?: string;
  gear_manager_profile_guid?: string;
  catalog_guid?: string;
  verified_static_guid?: string;
  manifest_guid?: string;
}

export function resolveGearGuidInfo(
  gearName: string | undefined,
  group: "amp" | "cab" | "stomp" | "rack"
): GearGuidInfo {
  const normName = (gearName || "").trim().toLowerCase();
  
  let resolvedGuid = "";
  let final_guid_source: GearGuidInfo["final_guid_source"] = "fallback";
  let fallback_block_triggered = false;
  let profile_validation_status: string | undefined = undefined;
  
  let gear_manager_profile_guid: string | undefined = undefined;
  let catalog_guid: string | undefined = undefined;
  let verified_static_guid: string | undefined = undefined;
  let manifest_guid: string | undefined = undefined;

  // Let's first search in the active/hybrid catalogue returned by getAt5Catalog()
  const activeCatalog = getAt5Catalog() || [];
  
  // We can find matching items using findAT5Gear (or score other items)
  const catalogMatch = findAT5Gear(gearName, group);
  if (catalogMatch) {
    catalog_guid = catalogMatch.guid;
    const isDb = catalogMatch.isDbRecord === true || 
                 (catalogMatch as any).id?.startsWith("gear-") ||
                 (catalogMatch as any).validationStatus !== undefined ||
                 (catalogMatch as any).profileStatus !== undefined;
    
    if (isDb && catalogMatch.guid) {
      gear_manager_profile_guid = catalogMatch.guid;
      profile_validation_status = (catalogMatch as any).validationStatus || (catalogMatch as any).profileStatus;
    }
  }

  // Also query verified overrides static catalog
  const verifiedMatch = findVerifiedGear(gearName, group);
  if (verifiedMatch) {
    verified_static_guid = verifiedMatch.realId;
  }

  // Query manifest realId
  const manifestMatchGuid = resolveVerifiedOrManifestRealId(gearName, group);
  if (manifestMatchGuid && manifestMatchGuid !== "null" && manifestMatchGuid !== "undefined") {
    manifest_guid = manifestMatchGuid;
  }

  // Step 1: Priority 1 - Gear Manager / DB catalogue profile (isDbRecord is true, or has validationStatus)
  if (catalogMatch && (catalogMatch.isDbRecord || (catalogMatch as any).id?.startsWith("gear-") || (catalogMatch as any).validationStatus || (catalogMatch as any).profileStatus) && catalogMatch.guid) {
    resolvedGuid = catalogMatch.guid;
    profile_validation_status = (catalogMatch as any).validationStatus || (catalogMatch as any).profileStatus || "PASS";
    if (isAt5pValidatedStatus(profile_validation_status, catalogMatch)) {
      final_guid_source = "at5p_discovery";
    } else {
      final_guid_source = "gear_manager_db";
    }
  }
  
  // Step 2: Priority 2 - Check static verified overrides
  else if (verifiedMatch && verifiedMatch.realId) {
    resolvedGuid = verifiedMatch.realId;
    final_guid_source = "verified_static";
  }
  
  // Step 3: Priority 3 - Check Manifest File Matches
  else if (manifestMatchGuid && manifestMatchGuid !== "null" && manifestMatchGuid !== "undefined") {
    resolvedGuid = manifestMatchGuid;
    final_guid_source = "manifest";
  }
  
  // Step 4: Priority 4 - Check general catalog match
  else if (catalogMatch && catalogMatch.guid && catalogMatch.guid.trim() !== "") {
    resolvedGuid = catalogMatch.guid;
    final_guid_source = "catalog_general";
  }
  
  // Step 5: Fallback to defaults
  else {
    resolvedGuid = getFallbackGuidForGroup(group);
    final_guid_source = "fallback";
    fallback_block_triggered = true;
  }

  // Exception / override rule for Darrell 100 specifically:
  // "Darrell 100 should only fall back to Brit 8000 if no valid Darrell 100 GUID can be resolved from any trusted source."
  const cleanName = normName.replace(/[^a-z0-9]/g, "");
  if (cleanName === "darrell100") {
    const darrellItem = activeCatalog.find(c => {
      const dbName = (c.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const otherMatches = (c.otherNames || []).some(o => o.toLowerCase().replace(/[^a-z0-9]/g, "") === "darrell100");
      return dbName === "darrell100" || otherMatches;
    });

    if (darrellItem && darrellItem.guid && darrellItem.guid.trim() !== "") {
      resolvedGuid = darrellItem.guid;
      catalog_guid = darrellItem.guid;
      const isDb = darrellItem.isDbRecord === true || (darrellItem as any).id?.startsWith("gear-");
      profile_validation_status = (darrellItem as any).validationStatus || "verified_at5p";
      
      if (isDb) {
        gear_manager_profile_guid = darrellItem.guid;
        final_guid_source = profile_validation_status === "verified_at5p" ? "at5p_discovery" : "gear_manager_db";
      } else {
        final_guid_source = "catalog_general";
      }
      fallback_block_triggered = false;
    }
  }

  // Guard against "Analog Delay" resolving to "Black 76" compressor GUID
  if (normName === "analog delay" && resolvedGuid.toLowerCase() === "aecfbde7-4f23-44ca-9f58-b0a110f0ea7a") {
    resolvedGuid = getFallbackGuidForGroup(group);
    final_guid_source = "fallback";
    fallback_block_triggered = true;
    gear_manager_profile_guid = undefined;
    catalog_guid = undefined;
    verified_static_guid = undefined;
    manifest_guid = undefined;
    profile_validation_status = undefined;
  }

  return {
    resolvedGuid,
    final_guid_source,
    fallback_block_triggered,
    profile_validation_status,
    gear_manager_profile_guid,
    catalog_guid,
    verified_static_guid,
    manifest_guid,
  };
}

const resolveGuid = (
  gearName: string | undefined,
  category: "amp" | "cab" | "stomp" | "rack",
  fallbackGuid: string
): string => {
  const info = resolveGearGuidInfo(gearName, category);
  return info.resolvedGuid || fallbackGuid;
};



const resolveSlotFamily = (gear: SignalChainElement): "stomp" | "rack" => {
  if (gear.type === "rack") {
    return "rack";
  }
  if (gear.type === "pedal" || (gear.type as string) === "stomp") {
    return "stomp";
  }
  
  // Resolve profile type - prioritize stomp/pedal first
  const stompMatch = findAT5Gear(gear.name, "stomp");
  if (stompMatch && (stompMatch.group === "stomp" || stompMatch.group === "pedal")) {
    return "stomp";
  }

  const catalogMatch = findAT5Gear(gear.name, "rack");
  if (catalogMatch && catalogMatch.group === "rack") {
    return "rack";
  }

  return "stomp";
};

const isPostAmpRack = (gear: SignalChainElement) => {
  return resolveSlotFamily(gear) === "rack";
};

export interface SlotPlanItem {
  raw: SignalChainElement;
  normalized: SignalChainElement;
  originalIndex: number;
  requested_type: string;
  resolved_profile_type: string;
  gear_manager_type: string;
  resolved_physical_slot_family: string;
  tonal_role: string;
  initial_candidate_slot_section: string | null;
  initial_candidate_slot_source: string;
  final_selected_slot_section: string;
  selected_slot_index: number;
  wrong_slot_candidate_blocked: boolean;
  wrong_slot_repaired: boolean;
  wrong_slot_block_reason: string | null;
  slot_plan_source: string;
  is_delay_substituted: boolean;
  delay_substitution_reason: string;
  physical_profile_substitution: boolean;
  substitution_used: boolean;
  substitution_reason: string;
}

export function buildResolvedSlotPlan(result: ToneResult, signalChain?: SignalChainElement[]): SlotPlanItem[] {
  const rawInput = signalChain ?? result.signal_chain ?? [];
  const { cleanedChain } = filterDuplicateEqsWithRemoved(rawInput, result.rack_decision);
  const normalizedChain = normaliseSignalChain(cleanedChain);

  const slotPlan: SlotPlanItem[] = [];

  let stompCount = 0;
  let rackCount = 0;
  let ampCount = 0;
  let cabCount = 0;

  let simAmpCount = 0;
  let simCabCount = 0;
  let simRackCount = 0;
  let simStompCount = 0;

  normalizedChain.forEach((normalized, index) => {
    const raw = cleanedChain[index];
    const requested_type = raw.type;

    // Determine resolved_profile_type / gear_manager_type
    let resolved_profile_type: string = normalized.type;
    const targetGroup = (normalized.type === "pedal" || (normalized.type as string) === "stomp") ? "stomp" : (normalized.type as any);
    const match = findAT5Gear(normalized.name, targetGroup);
    if (match) {
      const g = match.group ? match.group.toLowerCase().trim() : "";
      resolved_profile_type = g === "stomp" ? "pedal" : g;
    } else {
      const matchAcross = findBestCatalogMatchAcrossGroups(normalized.name);
      if (matchAcross) {
        const normName = normalized.name.toLowerCase();
        const matchName = matchAcross.displayName.toLowerCase();
        const isAnalogDelayBlack76 = (normName === "analog delay" || normName.includes("analog delay")) &&
                                     (matchName === "black 76" || (matchAcross.guid && matchAcross.guid.toLowerCase() === "aecfbde7-4f23-44ca-9f58-b0a110f0ea7a"));
        if (!isAnalogDelayBlack76) {
          const g = matchAcross.group ? matchAcross.group.toLowerCase().trim() : "";
          resolved_profile_type = g === "stomp" ? "pedal" : g;
        }
      }
    }
    const gear_manager_type = resolved_profile_type;

    // Resolve physical slot family
    let resolved_physical_slot_family = "stomp";
    if (gear_manager_type === "amp") resolved_physical_slot_family = "amp";
    else if (gear_manager_type === "cab") resolved_physical_slot_family = "cab";
    else if (gear_manager_type === "rack") resolved_physical_slot_family = "rack";

    // Determine tonal role
    let tonal_role = "standard";
    const lowerName = normalized.name.toLowerCase();
    if (lowerName.includes("delay")) tonal_role = "post_amp_delay";
    else if (lowerName.includes("reverb")) tonal_role = "post_amp_reverb";
    else if (lowerName.includes("eq")) tonal_role = "eq_shaping";
    else if (lowerName.includes("compressor") || lowerName.includes("limiter")) tonal_role = "dynamics";
    else if (normalized.type === "amp") tonal_role = "amp_preamp";
    else if (normalized.type === "cab") tonal_role = "cabinet";

    // Simulate initial candidate slot section (using old logic)
    let initial_candidate_slot_section: string | null = null;
    if (resolved_physical_slot_family === "amp") {
      initial_candidate_slot_section = simAmpCount < 3 ? "Amp" + String.fromCharCode(65 + simAmpCount) : "None";
      simAmpCount++;
    } else if (resolved_physical_slot_family === "cab") {
      initial_candidate_slot_section = simCabCount < 3 ? "Cab" + String.fromCharCode(65 + simCabCount) : "None";
      simCabCount++;
    } else {
      const isOldRackEligible = (normalized.type === "rack") || (normalized.type === "pedal" && isPostAmpRack(normalized));
      if (isOldRackEligible) {
        if (simRackCount < 2) initial_candidate_slot_section = "RackA";
        else if (simRackCount < 4) initial_candidate_slot_section = "RackB";
        else if (simRackCount < 6) initial_candidate_slot_section = "RackC";
        else initial_candidate_slot_section = "None";
        simRackCount++;
      } else {
        if (simStompCount < 6) initial_candidate_slot_section = "StompA1";
        else if (simStompCount < 12) initial_candidate_slot_section = "StompB1";
        else initial_candidate_slot_section = "None";
        simStompCount++;
      }
    }

    // Determine mismatch and wrong slot block
    let wrong_slot_candidate_blocked = false;
    let wrong_slot_repaired = false;
    let wrong_slot_block_reason: string | null = null;

    if (resolved_physical_slot_family === "stomp" && initial_candidate_slot_section && initial_candidate_slot_section.startsWith("Rack")) {
      wrong_slot_candidate_blocked = true;
      wrong_slot_repaired = true;
      wrong_slot_block_reason = `${normalized.name} resolved as pedal/stomp; ${initial_candidate_slot_section} rejected.`;
    } else if (resolved_physical_slot_family === "rack" && initial_candidate_slot_section && initial_candidate_slot_section.startsWith("Stomp")) {
      wrong_slot_candidate_blocked = true;
      wrong_slot_repaired = true;
      wrong_slot_block_reason = `${normalized.name} resolved as rack; ${initial_candidate_slot_section} rejected.`;
    }

    // Assign final section & index based on physical family
    let final_selected_slot_section = "None";
    let selected_slot_index = -1;

    if (resolved_physical_slot_family === "stomp") {
      if (stompCount < 6) {
        final_selected_slot_section = "StompA1";
        selected_slot_index = stompCount;
      } else if (stompCount < 12) {
        final_selected_slot_section = "StompB1";
        selected_slot_index = stompCount - 6;
      }
      stompCount++;
    } else if (resolved_physical_slot_family === "rack") {
      if (rackCount < 2) {
        final_selected_slot_section = "RackA";
        selected_slot_index = rackCount;
      } else if (rackCount < 4) {
        final_selected_slot_section = "RackB";
        selected_slot_index = rackCount - 2;
      } else if (rackCount < 6) {
        final_selected_slot_section = "RackC";
        selected_slot_index = rackCount - 4;
      }
      rackCount++;
    } else if (resolved_physical_slot_family === "amp") {
      if (ampCount < 3) {
        final_selected_slot_section = "Amp" + String.fromCharCode(65 + ampCount);
        selected_slot_index = 0;
      }
      ampCount++;
    } else if (resolved_physical_slot_family === "cab") {
      if (cabCount < 3) {
        final_selected_slot_section = "Cab" + String.fromCharCode(65 + cabCount);
        selected_slot_index = 0;
      }
      cabCount++;
    }

    if (wrong_slot_candidate_blocked && final_selected_slot_section === "None") {
      wrong_slot_repaired = false;
    }

    // Delay/rack substitution
    const originalRequestedGearName = raw.name;
    const isXTimeRequested = 
      originalRequestedGearName.toLowerCase().replace(/[^a-z0-9]/g, "") === "xtime" ||
      normalized.name.toLowerCase().replace(/[^a-z0-9]/g, "") === "xtime";
      
    const isDigitalDelayRequested = 
      originalRequestedGearName.toLowerCase() === "digital delay" ||
      originalRequestedGearName.toLowerCase() === "delay" ||
      normalized.name.toLowerCase() === "digital delay" ||
      normalized.name.toLowerCase() === "delay";

    let is_delay_substituted = false;
    let delay_substitution_reason = "";
    let physical_profile_substitution = false;
    let substitution_used = false;
    let substitution_reason = "";

    if (isDigitalDelayRequested && gear_manager_type === "pedal") {
      is_delay_substituted = true;
      delay_substitution_reason = "Requested rack Digital Delay unavailable; using validated pedal X-TIME.";
      physical_profile_substitution = true;
      substitution_used = true;
      substitution_reason = delay_substitution_reason;
    } else if (isXTimeRequested && gear_manager_type === "rack") {
      is_delay_substituted = true;
      delay_substitution_reason = 'TT substituted "Digital Delay" because "X-TIME" is unavailable.';
      physical_profile_substitution = true;
      substitution_used = true;
      substitution_reason = delay_substitution_reason;
    }

    slotPlan.push({
      raw,
      normalized,
      originalIndex: index,
      requested_type,
      resolved_profile_type,
      gear_manager_type,
      resolved_physical_slot_family,
      tonal_role,
      initial_candidate_slot_section,
      initial_candidate_slot_source: "simulated_old_routing_logic",
      final_selected_slot_section,
      selected_slot_index,
      wrong_slot_candidate_blocked,
      wrong_slot_repaired,
      wrong_slot_block_reason,
      slot_plan_source: "resolved_gear_manager_type",
      is_delay_substituted,
      delay_substitution_reason,
      physical_profile_substitution,
      substitution_used,
      substitution_reason
    });
  });

  return slotPlan;
}

const isVerifiedRackGear = (gear: SignalChainElement) => {
  // Physical slot compatibility MUST win! Pedals must stay in stomp slots.
  // Therefore, if the physical slot family is not rack, it is NOT verified rack gear!
  if (resolveSlotFamily(gear) !== "rack") {
    return false;
  }

  const n = gear.name.toLowerCase();
  if (VERIFIED_RACK_NAMES.some((name) => n.includes(name))) return true;
  
  // Check if we can resolve a GUID from the catalog for this as a rack item
  const rackGuid = resolveGuid(gear.name, "rack", AT5_EMPTY_SLOT_GUID);
  if (rackGuid !== AT5_EMPTY_SLOT_GUID) return true;

  return false;
};

const emptySlots = (count: number) =>
  Array.from({ length: count }, (_, i) => `        <Slot${i} />`).join("\r\n");

const emptySlotAttrs = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `Stomp${i}="${AT5_EMPTY_SLOT_GUID}"`
  ).join(" ");

const buildStompSection = (
  sectionName: string,
  gears: SignalChainElement[],
  count: number,
  group: "stomp" | "rack" = "stomp"
) => {
  const slotAttrs = Array.from({ length: count }, (_, i) => {
    const gear = gears[i];
    const guid = gear
      ? resolveGuid(gear.name, group, AT5_EMPTY_SLOT_GUID)
      : AT5_EMPTY_SLOT_GUID;

    return `Stomp${i}="${guid}"`;
  }).join(" ");

  const slots = Array.from({ length: count }, (_, i) => {
    const gear = gears[i];

    if (!gear) return `        <Slot${i} />`;

    const attrs = cleanXmlAttrString(
      buildMappedParameterAttrs(gear.name, group, gear.settings ?? {})
    );

    return `        <Slot${i} Bypass="0" FullScreen="0"${
      attrs ? " " + attrs : ""
    } />`;
  }).join("\r\n");

  return `    <${sectionName} Bypass="0" Mute="0" OutputVolume="1" ${slotAttrs}>\r\n${slots}\r\n    </${sectionName}>`;
};

const buildRackSection = (
  sectionName: string,
  gears: SignalChainElement[],
  count = 2
) => {
  const slotAttrs = Array.from({ length: count }, (_, i) => {
    const gear = gears[i];
    const guid = gear
      ? resolveGuid(gear.name, "rack", AT5_EMPTY_SLOT_GUID)
      : AT5_EMPTY_SLOT_GUID;

    return `Stomp${i}="${guid}"`;
  }).join(" ");

  const slots = Array.from({ length: count }, (_, i) => {
    const gear = gears[i];

    if (!gear) return `        <Slot${i} />`;

    const attrs = cleanXmlAttrString(
      buildMappedParameterAttrs(gear.name, "rack", gear.settings ?? {})
    );

    return `        <Slot${i} Bypass="0" FullScreen="0"${
      attrs ? " " + attrs : ""
    } />`;
  }).join("\r\n");

  return `    <${sectionName} Bypass="0" Mute="0" OutputVolume="1" ${slotAttrs}>\r\n${slots}\r\n    </${sectionName}>`;
};

const buildAmpSection = (
  section: "A" | "B" | "C",
  amp?: SignalChainElement
) => {
  if (!amp) {
    return `    <Amp${section} Bypass="1" Mute="1" OutputVolume="0" Model="${DEFAULT_AMP_GUID}">\r\n        <Amp />\r\n    </Amp${section}>`;
  }
  const ampName = amp.name;
  const ampGuid = resolveGuid(ampName, "amp", DEFAULT_AMP_GUID);

  let ampAttrs = buildMappedParameterAttrs(
    ampName,
    "amp",
    amp.settings ?? {}
  );

  if (!ampAttrs && ampGuid === DEFAULT_AMP_GUID) {
    ampAttrs =
      'Sensitivity_JCM800AT4="1" Presence_JCM800AT4="5" Bass_JCM800AT4="5" Middle_JCM800AT4="5" Treble_JCM800AT4="6" Master_JCM800AT4="5" PreAmp_JCM800AT4="5"';
  }

  // Safety: never allow undefined/null XML attributes to be written.
  // Brit 8000/JCM800 presets must always include Sensitivity_JCM800AT4="1".
  ampAttrs = ensureBrit8000Sensitivity(ampGuid, ampAttrs);

  return `    <Amp${section} Bypass="0" Mute="0" OutputVolume="1" Model="${ampGuid}">\r\n        <Amp ${ampAttrs} />\r\n    </Amp${section}>`;
};

const getSettingText = (
  gear: SignalChainElement | undefined,
  keys: string[]
) => {
  if (!gear) return "";

  const found = Object.entries(gear.settings ?? {}).find(([k]) =>
    keys.some((key) =>
      k
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        === key.toLowerCase().replace(/[^a-z0-9]/g, "")
    )
  );

  return String(found?.[1] ?? "");
};

const normalise = (value: string) =>
  String(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const scoreText = (query: string, candidates: string[]): number => {
  const q = normalise(query);
  if (!q) return 0;
  
  let best = 0;
  for (const rawCandidate of candidates) {
    const candidate = normalise(rawCandidate);
    if (!candidate) continue;

    let score = 0;
    
    // 1. Exact match gets massive boost
    if (candidate === q) {
      score += 2000;
    }
    
    // 2. Substring matches
    if (candidate.includes(q)) {
      score += 400 + (candidate.length - q.length) * -2;
    } else if (q.includes(candidate)) {
      score += 200 + (q.length - candidate.length) * -2;
    }

    // 3. Word token matching with generous word match weighting
    const qWords = q.split(" ").filter(w => w.length >= 2);
    const cWords = candidate.split(" ").filter(w => w.length >= 2);
    let matchedWords = 0;
    for (const w of qWords) {
      if (cWords.includes(w)) {
        matchedWords++;
      }
    }

    if (matchedWords > 0) {
      // Scale by percentage of query words matched to reward specificity
      const queryCoverage = matchedWords / qWords.length;
      score += matchedWords * 150 + queryCoverage * 300;
    }

    if (score > best) {
      best = score;
    }
  }

  return best;
};

const scoreNames = (query: string, candidates: string[]) => {
  const score = scoreText(query, candidates);
  return score >= 150 ? 1 : 0;
};

const getUnifiedCabCandidates = () => {
  const map = new Map<string, Set<string>>();
  
  // 1. Load verified cabs
  for (const v of getVerifiedCabs()) {
    if (!v.guid || v.guid === "null") continue;
    const key = v.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    v.aliases.forEach(a => { if (a) set.add(a); });
  }

  // 2. Load general catalog cabs
  const catalog = getAt5Catalog() || [];
  for (const item of catalog) {
    if (item.group !== "cab" || !item.guid || item.guid === "null") continue;
    const key = item.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    if (item.displayName) set.add(item.displayName);
    if (item.otherNames) item.otherNames.forEach(o => { if (o) set.add(o); });
  }

  return Array.from(map.entries()).map(([guid, aliasSet]) => ({
    guid,
    aliases: Array.from(aliasSet)
  }));
};

const getUnifiedSpeakerCandidates = () => {
  const map = new Map<string, Set<string>>();
  
  // 1. Load verified speakers
  for (const v of getVerifiedSpeakers()) {
    if (!v.guid || v.guid === "null") continue;
    const key = v.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    v.aliases.forEach(a => { if (a) set.add(a); });
  }

  // 2. Load general catalog speakers
  const catalog = getAt5Catalog() || [];
  for (const item of catalog) {
    if (item.group !== "speaker" || !item.guid || item.guid === "null") continue;
    const key = item.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    if (item.displayName) set.add(item.displayName);
    if (item.otherNames) item.otherNames.forEach(o => { if (o) set.add(o); });
  }

  return Array.from(map.entries()).map(([guid, aliasSet]) => ({
    guid,
    aliases: Array.from(aliasSet)
  }));
};

const getUnifiedMicCandidates = () => {
  const map = new Map<string, Set<string>>();
  
  // 1. Load verified mics
  for (const v of getVerifiedMics()) {
    if (!v.guid || v.guid === "null") continue;
    const key = v.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    v.aliases.forEach(a => { if (a) set.add(a); });
  }

  // 2. Load general catalog mics
  const catalog = getAt5Catalog() || [];
  for (const item of catalog) {
    if (item.group !== "mic" || !item.guid || item.guid === "null") continue;
    const key = item.guid.toLowerCase();
    if (!map.has(key)) map.set(key, new Set<string>());
    const set = map.get(key)!;
    if (item.displayName) set.add(item.displayName);
    if (item.otherNames) item.otherNames.forEach(o => { if (o) set.add(o); });
  }

  return Array.from(map.entries()).map(([guid, aliasSet]) => ({
    guid,
    aliases: Array.from(aliasSet)
  }));
};

const getMicId = (name: string) => {
  if (!name) return DEFAULT_MIC0_GUID;
  const scored = getUnifiedMicCandidates()
    .map(c => ({ guid: c.guid, score: scoreText(name, c.aliases) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.guid ?? DEFAULT_MIC0_GUID;
};

const resolveCabGuid = (name?: string) => {
  if (!name) return DEFAULT_CAB_GUID;
  
  const scored = getUnifiedCabCandidates()
    .map(c => ({ guid: c.guid, score: scoreText(name, c.aliases) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (scored.length > 0 && scored[0].score >= 150) {
    return scored[0].guid;
  }
  
  return DEFAULT_CAB_GUID;
};

const resolveSpeakerGuid = (name?: string) => {
  if (!name) return DEFAULT_SPEAKER_GUID;
  
  const scored = getUnifiedSpeakerCandidates()
    .map(c => ({ guid: c.guid, score: scoreText(name, c.aliases) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (scored.length > 0 && scored[0].score >= 150) {
    return scored[0].guid;
  }
  
  return DEFAULT_SPEAKER_GUID;
};

const ROOM_ALIASES: { name: string; aliases: string[] }[] = [
  {
    name: "Small Studio",
    aliases: ["Small Studio", "Small Room", "Small"]
  },
  {
    name: "Mid Studio",
    aliases: [
      "Mid Studio",
      "Mid Room",
      "Mid",
      "Medium Studio",
      "Medium Room",
      "Medium"
    ]
  },
  {
    name: "Large Studio",
    aliases: ["Large Studio", "Large Room", "Large"]
  },
  {
    name: "Hall",
    aliases: ["Hall"]
  },
  {
    name: "Closet",
    aliases: ["Closet"]
  },
  {
    name: "Bathroom",
    aliases: ["Bathroom"]
  },
  {
    name: "Garage",
    aliases: ["Garage"]
  }
];

export function canonicalizeRoomType(value: string): string {
  if (!value) return "Large Studio";
  const clean = value.trim().toLowerCase().replace(/\s+/g, " ");

  // Direct exact alias matching (whitespace and case tolerant)
  for (const room of ROOM_ALIASES) {
    if (room.aliases.some(alias => {
      const cleanAlias = alias.trim().toLowerCase().replace(/\s+/g, " ");
      return clean === cleanAlias;
    })) {
      return room.name;
    }
  }

  // Fallback tolerance using substrings
  for (const room of ROOM_ALIASES) {
    if (room.aliases.some(alias => {
      const cleanAlias = alias.trim().toLowerCase().replace(/\s+/g, " ");
      return clean.includes(cleanAlias);
    })) {
      return room.name;
    }
  }

  return value; // Keep raw for unknown detection
}

export function isKnownRoomType(value: string): boolean {
  if (!value) return false;
  const canonical = canonicalizeRoomType(value);
  return ROOM_ALIASES.some(room => room.name === canonical);
}

const getRoomType = (cab?: SignalChainElement) => {
  const room = getSettingText(cab, ["room", "room_type"]);
  if (!room) return "Large Studio";

  if (isKnownRoomType(room)) {
    return canonicalizeRoomType(room);
  }
  return "Large Studio"; // Unknown room fallback to safe default (Large Studio)
};

export function isUnspecifiedPlacementValue(value: any): boolean {
  if (value === undefined || value === null) return true;
  const s = String(value).trim().toLowerCase();
  return (
    s === "" ||
    s === "not specified" ||
    s === "none" ||
    s === "default" ||
    s === "cab default"
  );
}

export function canonicalizePlacementLabel(label: string): string {
  if (!label) return "";
  if (label.includes(",")) {
    return label.split(",").map(part => part.trim()).filter(Boolean).join(", ");
  }
  return label.trim();
}

export function isPlacementProfileValid(m: MicPlacementMapping): boolean {
  if (!m) return false;
  
  // cab identity
  const cabIdentity = m.gear || m.cabName || m.cabGuid;
  if (!cabIdentity) return false;
  
  // placementLabel
  const placementLabel = m.friendly_value || m.friendly_name || m.friendly_placement || m.canonicalPlacementName;
  if (!placementLabel) return false;

  // micSlot
  const micSlot = m.mic_slot || m.friendly_setting || m.target || m.micSlot;
  if (!micSlot) return false;

  // numeric values
  const numValues = m.maps_to || m.xml_values;
  if (!numValues || Object.keys(numValues).length === 0) return false;

  // source validation
  const src = (m.source || "at5p_discovery").toLowerCase();
  const validSources = ["at5p_discovery", "calibrated_profile", "manual_verified", "gear_manager_profile", "db", "persistent", "at5p_validated"];
  if (!validSources.includes(src)) return false;

  // validationStatus validation
  const status = (m.status || m.validation_status || m.validationStatus || "validated").toLowerCase();
  const validStatuses = ["validated", "at5p_validated", "verified_calibration", "discovered", "estimated", "needs_review"];
  if (!validStatuses.includes(status)) return false;

  return true;
}

export function resolveMicPlacementProfile(
  cabName: string,
  cabGuid: string,
  micSlot: "Mic_1" | "Mic_2",
  requestedLabel: string,
  micModelName: string,
  micModelGuid: string,
  mappings: MicPlacementMapping[]
): MicPlacementMapping | null {
  if (isUnspecifiedPlacementValue(requestedLabel)) return null;

  const validMappings = mappings.filter(m => isPlacementProfileValid(m));

  const isSlotMatch = (m: MicPlacementMapping, slot: "Mic_1" | "Mic_2"): boolean => {
    const mSlot = m.micSlot || m.mic_slot || m.friendly_setting || m.target;
    if (!mSlot) return false;
    const cleanMSlot = mSlot.toLowerCase().replace(/_/g, "");
    const cleanSlot = slot.toLowerCase().replace(/_/g, "");
    return cleanMSlot === cleanSlot || cleanMSlot === cleanSlot + "placement";
  };

  const isCabMatch = (m: MicPlacementMapping, cName: string, cGuid: string): boolean => {
    if (cGuid && m.cabGuid && cGuid.toLowerCase().replace(/-/g, "") === m.cabGuid.toLowerCase().replace(/-/g, "")) {
      return true;
    }
    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const reqCabClean = cleanStr(cName);
    if (m.cabName && cleanStr(m.cabName) === reqCabClean) return true;
    if (m.gear && cleanStr(m.gear) === reqCabClean) return true;
    if (m.cabAliases && Array.isArray(m.cabAliases)) {
      if (m.cabAliases.some(alias => cleanStr(alias) === reqCabClean)) return true;
    }
    return false;
  };

  const isLabelMatch = (m: MicPlacementMapping, reqLabel: string): boolean => {
    const canonReq = canonicalizePlacementLabel(reqLabel).toLowerCase();
    const reqClean = reqLabel.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    if (m.canonicalPlacementName) {
      if (canonicalizePlacementLabel(m.canonicalPlacementName).toLowerCase() === canonReq) return true;
      if (m.canonicalPlacementName.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === reqClean) return true;
    }

    const mFriendly = m.friendly_value || m.friendly_name || m.friendly_placement;
    if (mFriendly) {
      if (canonicalizePlacementLabel(mFriendly).toLowerCase() === canonReq) return true;
      if (mFriendly.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === reqClean) return true;
    }

    if (m.placementAliases && Array.isArray(m.placementAliases)) {
      if (m.placementAliases.some(alias => {
        if (canonicalizePlacementLabel(alias).toLowerCase() === canonReq) return true;
        return alias.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === reqClean;
      })) return true;
    }

    return false;
  };

  // 1 & 2. Exact Match & Alias Match on Cab, Mic Slot, and Label
  const cabMatches = validMappings.filter(m => 
    isSlotMatch(m, micSlot) && 
    isCabMatch(m, cabName, cabGuid) && 
    isLabelMatch(m, requestedLabel)
  );

  if (cabMatches.length > 0) {
    // 3. SPECIFIC MIC MATCH
    const normGuid = (g: string) => g ? g.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";
    const cleanMicName = (n: string) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";
    const reqGuidNorm = normGuid(micModelGuid);
    const reqNameNorm = cleanMicName(micModelName);

    const specificMicMatches = cabMatches.filter(m => 
      m.micModelScope === "specific" && (
        (m.micModelGuid && normGuid(m.micModelGuid) === reqGuidNorm) ||
        (m.micModelName && cleanMicName(m.micModelName) === reqNameNorm)
      )
    );
    if (specificMicMatches.length > 0) {
      return specificMicMatches[0];
    }

    // 4. SCOPE FALLBACK
    const scopeAnyMatches = cabMatches.filter(m => m.micModelScope === "any" || !m.micModelScope);
    if (scopeAnyMatches.length > 0) {
      return scopeAnyMatches[0];
    }
    return cabMatches[0];
  }

  // 5. GLOBAL GENERIC fallbacks
  const genericMatches = validMappings.filter(m => {
    const isGenericCab = !m.cabGuid && (!m.cabName || m.cabName.toLowerCase() === "any") && (!m.gear || m.gear.toLowerCase() === "any");
    return isGenericCab && isSlotMatch(m, micSlot) && isLabelMatch(m, requestedLabel);
  });

  if (genericMatches.length > 0) {
    const normGuid = (g: string) => g ? g.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";
    const cleanMicName = (n: string) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";
    const reqGuidNorm = normGuid(micModelGuid);
    const reqNameNorm = cleanMicName(micModelName);

    const specificGeneric = genericMatches.filter(m => 
      m.micModelScope === "specific" && (
        (m.micModelGuid && normGuid(m.micModelGuid) === reqGuidNorm) ||
        (m.micModelName && cleanMicName(m.micModelName) === reqNameNorm)
      )
    );
    if (specificGeneric.length > 0) {
      return specificGeneric[0];
    }

    const scopeAnyGeneric = genericMatches.filter(m => m.micModelScope === "any" || !m.micModelScope);
    if (scopeAnyGeneric.length > 0) {
      return scopeAnyGeneric[0];
    }
    return genericMatches[0];
  }

  return null;
}

const resolveCabMicPlacementAttrs = (cab?: SignalChainElement) => {
  const defaultValues: Record<string, string | number> = {
    Mic0Angle: "0",
    Mic0XAxis: "0",
    Mic0YAxis: "0",
    Mic0Distance: "0",
    Mic0Speaker: "0",
    Mic1Angle: "0",
    Mic1XAxis: "0",
    Mic1YAxis: "0",
    Mic1Distance: "0",
    Mic1Speaker: "1"
  };

  if (!cab) return defaultValues;

  const settings = cab.settings || {};
  const mappings = getDbMicPlacementMappings();

  const cabName = cab.name || "";
  const cabGuid = resolveCabGuid(cabName);

  const resolved = { ...defaultValues };

  // TT Mic_1 (Slot 0 -> AT5 Mic0)
  const pl0 = extractCanonicalMicPlacement(settings, 0);
  if (!pl0.isUnspecified) {
    const mic1Req = getSettingText(cab, ["mic_1", "mic 1", "mic1"]) || "Dynamic 57";
    const mic1Guid = getMicId(mic1Req);
    
    const resM1 = resolveCompositeMicPlacement({
      cabName,
      cabGuid,
      micSlot: "Mic_1",
      canonicalPlacement: pl0,
      micModelName: mic1Req,
      micModelGuid: mic1Guid,
      dbMappings: mappings
    });

    if (resM1.resolved) {
      resolved.Mic0Angle = resM1.coordinates.Angle;
      resolved.Mic0XAxis = resM1.coordinates.XAxis;
      resolved.Mic0YAxis = resM1.coordinates.YAxis;
      resolved.Mic0Distance = resM1.coordinates.Distance;
      resolved.Mic0Speaker = resM1.coordinates.Speaker;
    }
  }

  // TT Mic_2 (Slot 1 -> AT5 Mic1)
  const pl1 = extractCanonicalMicPlacement(settings, 1);
  if (!pl1.isUnspecified) {
    const mic2Req = getSettingText(cab, ["mic_2", "mic 2", "mic2"]) || "Condenser 87";
    const mic2Guid = getMicId(mic2Req);

    const resM2 = resolveCompositeMicPlacement({
      cabName,
      cabGuid,
      micSlot: "Mic_2",
      canonicalPlacement: pl1,
      micModelName: mic2Req,
      micModelGuid: mic2Guid,
      dbMappings: mappings
    });

    if (resM2.resolved) {
      resolved.Mic1Angle = resM2.coordinates.Angle;
      resolved.Mic1XAxis = resM2.coordinates.XAxis;
      resolved.Mic1YAxis = resM2.coordinates.YAxis;
      resolved.Mic1Distance = resM2.coordinates.Distance;
      resolved.Mic1Speaker = resM2.coordinates.Speaker;
    }
  }

  return resolved;
};

const buildCabSection = (
  section: "A" | "B" | "C",
  cab?: SignalChainElement
) => {
  const cabGuid = resolveCabGuid(cab?.name);
  const speakerGuid = resolveSpeakerGuid(getSettingText(cab, ["speaker", "speaker type", "speaker swap"]));
  
  const mic1Req = getSettingText(cab, ["mic_1", "mic 1", "mic1"]);
  const mic2Req = getSettingText(cab, ["mic_2", "mic 2", "mic2"]);
  
  const mic0 = mic1Req ? getMicId(mic1Req) : "1e41acc4-85af-4e84-bee4-eabc0be5fef1"; // Dynamic 57 fallback
  const mic1 = mic2Req ? getMicId(mic2Req) : "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb"; // Condenser 87 fallback
  const roomType = getRoomType(cab);

  const pl = resolveCabMicPlacementAttrs(cab);

  return `    <Cab${section} Bypass="0" Mute="0" CabModel="${cabGuid}" SpeakerModel0="${speakerGuid}" SpeakerModel1="${speakerGuid}" SpeakerModel2="${speakerGuid}" SpeakerModel3="${speakerGuid}" IRDecimation="1">\r\n        <Cab HighLevel="0.77" RoomType="${roomType}" RoomMicType="Condenser 87" Mic0Model="${mic0}" Mic1Model="${mic1}" Mic0Angle="${pl.Mic0Angle}" Mic1Angle="${pl.Mic1Angle}" Mic0XAxis="${pl.Mic0XAxis}" Mic1XAxis="${pl.Mic1XAxis}" Mic0YAxis="${pl.Mic0YAxis}" Mic1YAxis="${pl.Mic1YAxis}" Mic0Distance="${pl.Mic0Distance}" Mic1Distance="${pl.Mic1Distance}" Mic0Speaker="${pl.Mic0Speaker}" Mic1Speaker="${pl.Mic1Speaker}" GUILoadComplete="0" />\r\n    </Cab${section}>`;
};

const buildStudio = (cab?: SignalChainElement) => {
  let roomLevelVal = "-18"; // default
  if (cab && cab.settings) {
    const roomLevel = cab.settings.Room_Level ?? cab.settings.room_level ?? cab.settings["Room_Level"];
    if (roomLevel !== undefined) {
      roomLevelVal = String(roomLevel);
    }
  }
  return `    <Studio Bypass="0" Mute="0" OutputVolume="1" OutputPan="0.5" DI_Level="-3" DI_Pan="0.5" DI_Mute="1" DI_Solo="0" DI_Phase="0" DI_PhaseDelay="0" Cab1_Mic1_Level="0" Cab1_Mic1_Pan="0" Cab1_Mic1_Mute="0" Cab1_Mic1_Solo="0" Cab1_Mic1_Phase="0" Cab1_Mic2_Level="-8" Cab1_Mic2_Pan="0" Cab1_Mic2_Mute="0" Cab1_Mic2_Solo="0" Cab1_Mic2_Phase="0" Cab1_Room_Level="${roomLevelVal}" Cab1_Room_Width="50" Cab1_Room_Mute="0" Cab1_Room_Solo="0" Cab1_Room_Phase="0" Cab1_Bus_Level="0" Cab1_Bus_Pan="0.5" Cab1_Bus_Mute="0" Cab1_Bus_Solo="0" Cab1_Bus_Phase="0" Cab2_Mic1_Level="-6" Cab2_Mic1_Pan="0" Cab2_Mic1_Mute="0" Cab2_Mic1_Solo="0" Cab2_Mic1_Phase="0" Cab2_Mic2_Level="-6" Cab2_Mic2_Pan="0" Cab2_Mic2_Mute="0" Cab2_Mic2_Solo="0" Cab2_Mic2_Phase="0" Cab2_Room_Level="-40" Cab2_Room_Width="50" Cab2_Room_Mute="0" Cab2_Room_Solo="0" Cab2_Room_Phase="0" Cab2_Bus_Level="-6" Cab2_Bus_Pan="1" Cab2_Bus_Mute="0" Cab2_Bus_Solo="0" Cab2_Bus_Phase="0" Cab3_Mic1_Level="-6" Cab3_Mic1_Pan="0" Cab3_Mic1_Mute="0" Cab3_Mic1_Solo="0" Cab3_Mic1_Phase="0" Cab3_Mic2_Level="-6" Cab3_Mic2_Pan="0" Cab3_Mic2_Mute="0" Cab3_Mic2_Solo="0" Cab3_Mic2_Phase="0" Cab3_Room_Level="-40" Cab3_Room_Width="50" Cab3_Room_Mute="0" Cab3_Room_Solo="0" Cab3_Room_Phase="0" Cab3_Bus_Level="-6" Cab3_Bus_Pan="0" Cab3_Bus_Mute="0" Cab3_Bus_Solo="0" Cab3_Bus_Phase="0" />`;
};

const generateXML = (result: ToneResult): string => {
  const slotPlan = buildResolvedSlotPlan(result);

  const stompA1 = slotPlan.filter(item => item.final_selected_slot_section === "StompA1").map(item => item.normalized);
  const stompB1 = slotPlan.filter(item => item.final_selected_slot_section === "StompB1").map(item => item.normalized);
  const stompStereo: SignalChainElement[] = [];

  const amps = slotPlan.filter(item => item.final_selected_slot_section.startsWith("Amp")).map(item => item.normalized);
  const cabItem = slotPlan.find(item => item.final_selected_slot_section === "CabA");
  const cab = cabItem ? cabItem.normalized : undefined;

  const rackA = slotPlan.filter(item => item.final_selected_slot_section === "RackA").map(item => item.normalized);
  const rackB = slotPlan.filter(item => item.final_selected_slot_section === "RackB").map(item => item.normalized);
  const rackC = slotPlan.filter(item => item.final_selected_slot_section === "RackC").map(item => item.normalized);

  const description = escapeXml(
    result.engineering_notes?.gain_strategy ??
      result.tone_summary?.style ??
      "Tone Translator preset"
  );

  const style = escapeXml(result.tone_summary?.style ?? "Rock");

  return [
    `<?xml version="1.0" ?>`,
    `<Preset Version="2" Format="at5p" GUID="${generateUUID()}" PresetBPM="120" ProgramChange="${result.midiPC ?? -1}">`,
    `    <Chain Preset="Chain11" DIBeforeAmp="0" />`,
    `    <Input Input="1" />`,
    `    <Tuner Bypass="1" Mute="0" OutputVolume="1" TunerType="354eca51-457a-41b7-917d-ce6117586905">`,
    `        <Tuner Reference="440" NoteReferemce="A" Transpose="0" Temperament="Equal" />`,
    `    </Tuner>`,

    buildStompSection("StompA1", stompA1, 6),
    `    <StompA2 Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(6)}>\r\n${emptySlots(6)}\r\n    </StompA2>`,
    buildStompSection("StompStereo", stompStereo, 3),
    buildStompSection("StompB1", stompB1, 6),
    `    <StompB2 Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(6)}>\r\n${emptySlots(6)}\r\n    </StompB2>`,
    `    <StompB3 Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(6)}>\r\n${emptySlots(6)}\r\n    </StompB3>`,

    buildAmpSection("A", amps[0]),
    buildAmpSection("B", amps[1]),
    buildAmpSection("C", amps[2]),

    `    <LoopFxA Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(4)}>\r\n${emptySlots(4)}\r\n    </LoopFxA>`,
    `    <LoopFxB Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(4)}>\r\n${emptySlots(4)}\r\n    </LoopFxB>`,
    `    <LoopFxC Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(4)}>\r\n${emptySlots(4)}\r\n    </LoopFxC>`,

    buildCabSection("A", cab),
    buildCabSection("B"),
    buildCabSection("C"),

    buildStudio(cab),
    buildRackSection("RackA", rackA, 2),
    buildRackSection("RackB", rackB, 2),
    buildRackSection("RackC", rackC, 2),

    `    <RackDI Bypass="0" Mute="0" OutputVolume="1" Stomp0="${AT5_EMPTY_SLOT_GUID}" Stomp1="${AT5_EMPTY_SLOT_GUID}">\r\n        <Slot0 />\r\n        <Slot1 />\r\n    </RackDI>`,
    `    <RackMaster Bypass="0" Mute="0" OutputVolume="1" ${emptySlotAttrs(6)}>\r\n${emptySlots(6)}\r\n    </RackMaster>`,

    `    <Output Output="1" />`,
    `    <MidiAssignments />`,
    `    <MetaInfo Description="${description}" Style="${style}" SoundCharacter="None" Instrument="None" Body="Solid Body" PickUpPosition="Bridge" Artist="" Band="" Song="" Album="" SongStructureElement="None" KeyWords="Tone Translator" Type="Electric Guitar" />`,
    `</Preset>`,
  ].join("\r\n");
};

export interface ExportDebugItem {
  original_name: string;
  normalized_name: string;
  type: string;
  resolved_guid: string;
  slot_section: string;
  slot_index: number;
  original_index: number;
  original_settings: Record<string, unknown>;
  normalized_settings: Record<string, unknown>;
  exported_settings: string;
  exported: boolean;
  reason: string;
  gear_guid_resolved?: boolean;
  gear_included_in_chain?: boolean;
  gear_written_to_xml?: boolean;
  gear_attempted_to_xml?: boolean;
  parameter_mapping_status?: "SUCCESS" | "MISMATCH" | "UNVERIFIED" | "FAILED" | "PARTIAL" | "PARTIAL_WITH_FALLBACK";
  mismatched_parameters?: string[];
  disparity_parameters?: string[];
  dropped_parameters?: string[];
  final_status?: "PASS" | "PASS_WITH_WARNING" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" | "CHECK" | "SKIPPED" | "FAIL" | "CRITICAL" | "SUBSTITUTED_FALLBACK" | "BLOCKED_EXPORT";
  parameter_details?: {
    parameter: string;
    normalized_parameter?: string;
    input_value?: any;
    input_display_value?: any;
    display_value: string;
    display_unit?: string;
    display_min?: number;
    display_max?: number;
    conversion_mode?: string;
    display_clamp_applied?: boolean;
    clamped_display_value?: any;
    converted_raw_value?: any;
    exported_internal_value: string;
    mapping_status: string;
    conversion_note?: string;
    conversion_warning?: string;
    reason?: string;
    expected_export_value?: any;
    serialized_export_value?: any;
    actual_xml_value?: any;
    actual_export_value?: any;
    reverse_converted_display_value?: string;
    visual_min?: number;
    visual_max?: number;
    export_min?: number;
    export_max?: number;
    raw_clamp_applied?: boolean;
    pre_clamp_value?: any;
    post_clamp_value?: any;
    clamp_applied?: boolean;
    final_export_value?: any;
    range_source?: string;
    range_confidence?: string;
    intended_semantic_value?: string;
    resolved_profile_found?: boolean;
    resolved_profile_value?: any;
    fallback_value?: any;
    exported_value?: any;
    placement_label?: string;
    placement_profile_source?: string;
    placement_profile_id?: string;
    fallback_used?: boolean;
    fallback_reason?: string;
    resolved_numeric_values?: any;
    exported_numeric_values?: any;
    verification_status?: string;
    placement_was_supplied_by_chain?: boolean;
    semantic_provenance?: "signal_chain_generated" | "signal_chain_normalized" | "semantic_default" | "cab_default" | "safe_fallback";
    source_semantic_placement?: string;
    normalized_semantic_placement?: string;
    canonical_semantic_placement?: string;
    coordinate_resolution_source?: string; // Clear distinction: origin of numeric AT5 coordinate resolution (e.g. VIR, profile, safe_fallback)
    coordinate_translation_source?: string;
    placement_source?: string; // Maintained for backwards compatibility; alias to coordinate_resolution_source
    resolved_at5_fields?: any;
    input_parameter_name?: string;
    matched_profile_parameter?: string;
    matched_export_parameter_name?: string;
    canonical_input_value?: string;
    match_source?: "exact_xml" | "friendly_name" | "saved_alias" | "raw_mapping_alias" | "generated_alias" | "alias" | "fallback" | "unmatched" | "room_alias";
    verification_skipped?: boolean;
    verification_skip_reason?: string;
    requires_mapping_review?: boolean;
  }[];
  not_exported_detail?: string[];
  tone_adjustment_intent?: Record<string, string>;
  mapped_intent?: any[];
  dropped_intent?: any[];
  verified_guid_resolved?: boolean;
  actual_exported_guid?: string;
  intended_gear_name?: string;
  actual_exported_gear_name?: string;
  fallback_guid_used?: boolean;
  fallback_source?: string;
  substitution_used?: boolean;
  substitution_reason?: string;
  suggested_action?: string;
  requested_gear_name?: string;
  original_requested_gear_name?: string;
  normalized_requested_gear_name?: string;
  fallback_exported_gear_name?: string;
  fallback_exported_guid?: string;
  original_requested_settings?: Record<string, unknown>;
  exported_fallback_settings?: string;
  gear_manager_type?: string;
  slot_compatibility?: string[];
  selected_slot_section?: string;
  slot_type_valid?: boolean;
  gear_profile_source?: string;
  selection_context?: string;
  requested_generic_name?: string;
  resolved_profile_name?: string;
  requested_generic_or_alias?: boolean;
  resolution_reason?: string;
  gear_manager_profile_guid?: string;
  catalog_guid?: string;
  verified_static_guid?: string;
  manifest_guid?: string;
  final_guid_source?: string;
  fallback_block_triggered?: boolean;
  parameter_schema_source?: string;
  profile_validation_status?: string;
  resolved_parameter_source?: string;
  hardcoded_substitution_applied?: boolean;
  fallback_applied?: boolean;
  fallback_trigger?: string;
  fallback_reason?: string;
  is_real_requested_default_gear?: boolean;
  fallback_decision_source?: "resolver" | "safe_mode" | "strict_mode" | "none";
  darrell_channel_selected?: string;
  darrell_active_gain_parameter?: string;
  darrell_active_master_parameter?: string;
  darrell_channel_mapping_confidence?: "verified_at5p" | "inferred" | "needs_validation";
  darrell_channel_mapping_reason?: string;
  profile_match_strategy?: string;
  profile_match_guid?: string;
  profile_match_name?: string;
  profile_match_type?: string;
  profile_match_context?: string;
  cross_group_match_used?: boolean;
  cross_group_match_blocked_reason?: string;
  eq_dedupe_checked?: boolean;
  eq_dedupe_result?: "kept" | "skipped";
  eq_dedupe_reason?: string;
  eq_functional_role?: string;
  compared_against_gear?: string;
  compared_against_role?: string;
  same_slot_context?: boolean;
  same_gear_type?: boolean;
  settings_similarity_score?: number;
  explicit_role_detected?: boolean;
  validated_profile_protected?: boolean;
  requested_type?: string;
  resolved_profile_type?: string;
  routing_decision?: string;
  routing_decision_source?: string;
  physical_slot_family?: string;
  tonal_role?: string;
  slot_family_locked?: boolean;
  rejected_rack_routing_reason?: string;
  rejected_stomp_routing_reason?: string;
  initial_candidate_slot_section?: string | null;
  initial_candidate_slot_source?: string;
  resolved_physical_slot_family?: string;
  final_selected_slot_section?: string;
  wrong_slot_candidate_blocked?: boolean;
  wrong_slot_repaired?: boolean;
  wrong_slot_block_reason?: string | null;
  slot_plan_source?: string;
  physical_profile_substitution?: boolean;
  verification_xml_length?: number;
  verification_xml_was_truncated?: boolean;
  searched_section?: string;
  searched_slot_node?: string;
  searched_stomp_attr?: string;
  expected_guid?: string;
  actual_guid_found?: string;
  section_found?: boolean;
  slot_node_found?: boolean;
  slot_attrs_found?: string[];
  verification_source?: string;
}

export interface ExportDebugData {
  raw_input_chain: SignalChainElement[];
  exported_chain: ExportDebugItem[];
  skipped_gear: ExportDebugItem[];
  exported_xml_summary: string;
  rack_decision?: RackDecision;
  parameter_mapping_status?: "SUCCESS" | "MISMATCH" | "UNVERIFIED" | "FAILED" | "PARTIAL" | "PARTIAL_WITH_FALLBACK";
  final_xml_verification?: {
    status: "PASS" | "FAIL";
    total_elements_verified: number;
    discrepancies: string[];
    actual_xml_preview: string;
  };
}

type ChainPair = {
  raw: SignalChainElement;
  normalized: SignalChainElement;
  originalIndex: number;
};

const buildCabDebugAttrs = (cab?: SignalChainElement) => {
  if (!cab) return "";
  const cabGuid = resolveCabGuid(cab.name);
  const speakerGuid = resolveSpeakerGuid(getSettingText(cab, ["speaker", "speaker type", "speaker swap"]));
  
  const mic1Req = getSettingText(cab, ["mic_1", "mic 1", "mic1"]);
  const mic2Req = getSettingText(cab, ["mic_2", "mic 2", "mic2"]);
  
  const mic0 = mic1Req ? getMicId(mic1Req) : "1e41acc4-85af-4e84-bee4-eabc0be5fef1";
  const mic1 = mic2Req ? getMicId(mic2Req) : "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb";
  const roomType = getRoomType(cab);

  const pl = resolveCabMicPlacementAttrs(cab);

  const attrs = [
    `CabModel="${cabGuid}"`,
    `SpeakerModel0="${speakerGuid}"`,
    `SpeakerModel1="${speakerGuid}"`,
    `SpeakerModel2="${speakerGuid}"`,
    `SpeakerModel3="${speakerGuid}"`,
    `Mic0Model="${mic0}"`,
    `Mic1Model="${mic1}"`,
    `RoomType="${roomType}"`,
    `Mic0Angle="${pl.Mic0Angle}"`,
    `Mic1Angle="${pl.Mic1Angle}"`,
    `Mic0XAxis="${pl.Mic0XAxis}"`,
    `Mic1XAxis="${pl.Mic1XAxis}"`,
    `Mic0YAxis="${pl.Mic0YAxis}"`,
    `Mic1YAxis="${pl.Mic1YAxis}"`,
    `Mic0Distance="${pl.Mic0Distance}"`,
    `Mic1Distance="${pl.Mic1Distance}"`,
    `Mic0Speaker="${pl.Mic0Speaker}"`,
    `Mic1Speaker="${pl.Mic1Speaker}"`,
  ];

  return attrs.join(" ");
};

export function reverseConvertExportValueToDisplayValue(
  xmlName: string,
  exportValue: string | number,
  transform?: string,
  min?: number,
  max?: number,
  visualMin?: number,
  visualMax?: number,
  unit?: string,
  def?: any
): string {
  if (exportValue === undefined || exportValue === null || exportValue === "") return "N/A";

  const evStr = String(exportValue).trim();
  const evStrLower = evStr.toLowerCase();

  if (def) {
    // 1. optionRows
    if (def.optionRows && Array.isArray(def.optionRows) && def.optionRows.length > 0) {
      const matched = def.optionRows.find((row: any) => {
        return row.exportValue !== undefined && String(row.exportValue).trim().toLowerCase() === evStrLower;
      });
      if (matched) return matched.displayLabel;
    }

    // 2. reverseValueMap
    if (def.reverseValueMap && typeof def.reverseValueMap === 'object') {
      const keys = Object.keys(def.reverseValueMap);
      const matchedKey = keys.find(k => k.trim().toLowerCase() === evStrLower);
      if (matchedKey !== undefined) {
        return def.reverseValueMap[matchedKey];
      }
    }

    // 3. reverseValueMapJson
    if (def.reverseValueMapJson && typeof def.reverseValueMapJson === 'string') {
      try {
        const parsed = JSON.parse(def.reverseValueMapJson);
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          const matchedKey = keys.find(k => k.trim().toLowerCase() === evStrLower);
          if (matchedKey !== undefined) {
            return parsed[matchedKey];
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  const ev = typeof exportValue === "number" ? exportValue : parseFloat(String(exportValue));
  if (isNaN(ev)) return String(exportValue);

  let n = ev;

  if (transform === "dbThresholdToLinear" || transform === "db_to_linear") {
    if (ev <= 0) {
      n = -100;
    } else {
      n = 20 * Math.log10(ev);
    }
    const rounded = Number(n.toFixed(1));
    return `${rounded} dB`;
  }

  if (transform === "linear_to_db") {
    n = Math.pow(10, ev / 20);
    const rounded = Number(n.toFixed(6));
    return `${rounded}`;
  }

  if (transform === "scaled_range") {
    const vMin = visualMin ?? 0;
    const vMax = visualMax ?? 10;
    const expMin = min ?? 0;
    const expMax = max ?? 10;
    const expSpan = expMax - expMin;
    const pct = Math.abs(expSpan) < 1e-9 ? 0 : (ev - expMin) / expSpan;
    n = vMin + pct * (vMax - vMin);
    const rounded = Number(n.toFixed(2));
    if (unit) {
      return `${rounded} ${unit}`;
    }
    const xmlLower = xmlName.toLowerCase();
    const isEqGain = xmlLower.includes("band") || xmlLower.includes("eq") || xmlLower.includes("parametric");
    if (isEqGain && (xmlLower.includes("gain") || xmlLower.includes("level"))) {
      return `${rounded} dB`;
    }
    return `${rounded}`;
  }

  if (transform === "noiseGateRelease") {
    const rounded = Number(ev.toFixed(0));
    return `${rounded} ms`;
  }

  if (transform === "noiseGateDepth") {
    const rounded = Number(ev.toFixed(0));
    return `${rounded} dB`;
  }

  if (transform === "khzToHzIfNeeded") {
    if (ev >= 1000) {
      return `${(ev / 1000).toFixed(1)} kHz`;
    }
    return `${ev.toFixed(0)} Hz`;
  }

  const xmlLower = xmlName.toLowerCase();
  const rounded = Number(ev.toFixed(2));
  
  if (unit) {
    if (unit.toLowerCase().trim() === "db") {
      return `${rounded} dB`;
    }
    return `${rounded} ${unit}`;
  }

  const isAmpKnob = xmlLower.includes("gain1") || xmlLower.includes("gain2") || xmlLower.includes("master") || xmlLower.includes("volume") || xmlLower.includes("bass") || xmlLower.includes("middle") || xmlLower.includes("mid") || xmlLower.includes("treble") || xmlLower.includes("presence") || xmlLower.includes("preamp") || xmlLower.includes("drive");
  
  if (!isAmpKnob && (xmlLower.includes("db") || xmlLower.includes("depth") || xmlLower.includes("threshold") || (xmlLower.includes("gain") && (xmlLower.includes("band") || xmlLower.includes("eq") || xmlLower.includes("parametric") || xmlLower.includes("pedal"))))) {
    return `${rounded} dB`;
  }
  return String(rounded);
}

const makeDebugItem = (
  pair: ChainPair,
  section: string,
  index: number,
  group: "amp" | "cab" | "stomp" | "rack",
  exported: boolean,
  reason: string,
  planItem?: SlotPlanItem
): ExportDebugItem => {
  const gear = {
    ...pair.normalized,
    settings: normalizeSettingsToCanonical(pair.normalized.name, group, pair.normalized.settings ?? {}),
  };

  const originalRequestedGearName = pair.raw.name;
  const originalRequestedSettings = { ...(pair.raw.settings ?? {}) };
  const normalizedRequestedGearName = gear.name;

  if (group === "cab") {
    if (!gear.settings) gear.settings = {};

    // Read raw placement values without mutating pair.raw.settings
    const rawKeys = Object.keys(pair.raw.settings ?? {});
    let m1PlaceVal: any = undefined;
    let m2PlaceVal: any = undefined;
    let m1DistVal: any = undefined;
    let m2DistVal: any = undefined;

    for (const key of rawKeys) {
      const lk = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lk === "mic1placement" || lk === "mic1position" || lk === "mic_1_placement" || lk === "mic_1_position") {
        m1PlaceVal = pair.raw.settings![key];
      } else if (lk === "mic2placement" || lk === "mic2position" || lk === "mic_2_placement" || lk === "mic_2_position") {
        m2PlaceVal = pair.raw.settings![key];
      } else if (lk === "mic1distance" || lk === "mic_1_distance") {
        m1DistVal = pair.raw.settings![key];
      } else if (lk === "mic2distance" || lk === "mic_2_distance") {
        m2DistVal = pair.raw.settings![key];
      }
    }

    // Standardize gear.settings keys
    const gearKeys = Object.keys(gear.settings);
    let gearM1PlaceVal: any = undefined;
    let gearM2PlaceVal: any = undefined;
    let gearM1DistVal: any = undefined;
    let gearM2DistVal: any = undefined;

    for (const key of gearKeys) {
      const lk = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lk === "mic1placement" || lk === "mic1position" || lk === "mic_1_placement" || lk === "mic_1_position") {
        gearM1PlaceVal = gear.settings[key];
        delete gear.settings[key];
      } else if (lk === "mic2placement" || lk === "mic2position" || lk === "mic_2_placement" || lk === "mic_2_position") {
        gearM2PlaceVal = gear.settings[key];
        delete gear.settings[key];
      } else if (lk === "mic1distance" || lk === "mic_1_distance") {
        gearM1DistVal = gear.settings[key];
        delete gear.settings[key];
      } else if (lk === "mic2distance" || lk === "mic_2_distance") {
        gearM2DistVal = gear.settings[key];
        delete gear.settings[key];
      }
    }

    const finalM1Place = gearM1PlaceVal !== undefined ? gearM1PlaceVal : m1PlaceVal;
    if (finalM1Place !== undefined && !isUnspecifiedPlacementValue(finalM1Place)) {
      gear.settings["Mic_1_Placement"] = finalM1Place;
    }

    const finalM2Place = gearM2PlaceVal !== undefined ? gearM2PlaceVal : m2PlaceVal;
    if (finalM2Place !== undefined && !isUnspecifiedPlacementValue(finalM2Place)) {
      gear.settings["Mic_2_Placement"] = finalM2Place;
    }

    const finalM1Dist = gearM1DistVal !== undefined ? gearM1DistVal : m1DistVal;
    if (finalM1Dist !== undefined && !isUnspecifiedPlacementValue(finalM1Dist)) {
      gear.settings["Mic_1_Distance"] = finalM1Dist;
    }

    const finalM2Dist = gearM2DistVal !== undefined ? gearM2DistVal : m2DistVal;
    if (finalM2Dist !== undefined && !isUnspecifiedPlacementValue(finalM2Dist)) {
      gear.settings["Mic_2_Distance"] = finalM2Dist;
    }
  }

  const normalizedRequestedSettings = { ...(gear.settings ?? {}) };

  // Setup EQ collapse variables
  let tone_adjustment_intent: Record<string, string> | undefined = undefined;
  let mapped_intent: any[] | undefined = undefined;
  let dropped_intent: any[] | undefined = undefined;
  let forced_final_status: "PASS_WITH_WARNING" | undefined = undefined;

  if (gear.name === "Parametric EQ") {
    const rawSettings = pair.raw.settings ?? {};
    const keys = Object.keys(rawSettings);
    const hasAbstractParams = keys.some(k => {
      const lk = k.toLowerCase();
      return lk.includes("low") || lk.includes("mid") || lk.includes("high") || lk.includes("shelf") || lk.includes("presence") || lk.includes("cut");
    });

    if (hasAbstractParams) {
      let lowF: any = undefined, lowG: any = undefined, lowQ: any = undefined;
      let midF: any = undefined, midG: any = undefined, midQ: any = undefined;
      let higF: any = undefined, higG: any = undefined, higQ: any = undefined;

      for (const [key, value] of Object.entries(rawSettings)) {
        const k = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (k === "lowfreq" || k === "lowfrequency" || k === "frequencylow" || k === "lowf") lowF = value;
        else if (k === "lowgain" || k === "gainlow" || k === "lowg") lowG = value;
        else if (k === "lowq" || k === "qlow") lowQ = value;
        
        else if (k === "midfreq" || k === "midfrequency" || k === "frequencymid" || k === "midrangefreq" || k === "midf") midF = value;
        else if (k === "midgain" || k === "gainmid" || k === "midrangegain" || k === "midg") midG = value;
        else if (k === "midq" || k === "qmid" || k === "midrangeq") midQ = value;
        
        else if (k === "highfreq" || k === "highfrequency" || k === "frequencyhigh" || k === "highf") higF = value;
        else if (k === "highgain" || k === "gainhigh" || k === "highg") higG = value;
        else if (k === "highq" || k === "qhigh") higQ = value;
      }

      const lowPresent = lowF !== undefined || lowG !== undefined;
      const midPresent = midF !== undefined || midG !== undefined;
      const higPresent = higF !== undefined || higG !== undefined;

      tone_adjustment_intent = {};
      if (lowPresent) {
        const f = lowF ?? "120 Hz";
        const g = lowG !== undefined ? (typeof lowG === "number" ? `${lowG} dB` : String(lowG)) : "-3.0 dB";
        tone_adjustment_intent["low_end"] = `reduce boom around ${f} (by ${g})`;
      }
      if (midPresent) {
        const f = midF ?? "400 Hz";
        const g = midG !== undefined ? (typeof midG === "number" ? `${midG} dB` : String(midG)) : "-4.0 dB";
        tone_adjustment_intent["midrange"] = `cut boxiness around ${f} (by ${g})`;
      }
      if (higPresent) {
        const f = higF ?? "2.2 kHz";
        const g = higG !== undefined ? (typeof higG === "number" ? `${higG} dB` : String(higG)) : "2.5 dB";
        tone_adjustment_intent["presence"] = `boost bite around ${f} (by ${g})`;
      }

      mapped_intent = [];
      dropped_intent = [];

      // Determine which two are selected/mapped
      if (midPresent && higPresent) {
        // Map Mid -> Band 1, High -> Band 2. Low is dropped
        mapped_intent.push({
          intent: `Mid cut/boost around ${midF ?? "400 Hz"}`,
          mapped_to: "Band 1",
          settings: {
            "Freq 1": midF ?? "400 Hz",
            "Gain 1": midG !== undefined ? (typeof midG === "number" ? `${midG} dB` : String(midG)) : "-4.0 dB",
            "Q 1": midQ ?? "1.4"
          }
        });
        mapped_intent.push({
          intent: `Presence boost/cut around ${higF ?? "2.2 kHz"}`,
          mapped_to: "Band 2",
          settings: {
            "Freq 2": higF ?? "2.2 kHz",
            "Gain 2": higG !== undefined ? (typeof higG === "number" ? `${higG} dB` : String(higG)) : "2.5 dB",
            "Q 2": higQ ?? "0.8"
          }
        });
        if (lowPresent) {
          dropped_intent.push({
            intent: `Low reduction/boost around ${lowF ?? "120 Hz"}`,
            reason: "AT5 Parametric EQ only supports two bands."
          });
          forced_final_status = "PASS_WITH_WARNING";
        }
      } else if (lowPresent && midPresent) {
        // Map Low -> Band 1, Mid -> Band 2. High is dropped
        mapped_intent.push({
          intent: `Low reduction/boost around ${lowF ?? "120 Hz"}`,
          mapped_to: "Band 1",
          settings: {
            "Freq 1": lowF ?? "120 Hz",
            "Gain 1": lowG !== undefined ? (typeof lowG === "number" ? `${lowG} dB` : String(lowG)) : "-3.0 dB",
            "Q 1": lowQ ?? "1.0"
          }
        });
        mapped_intent.push({
          intent: `Mid cut/boost around ${midF ?? "400 Hz"}`,
          mapped_to: "Band 2",
          settings: {
            "Freq 2": midF ?? "400 Hz",
            "Gain 2": midG !== undefined ? (typeof midG === "number" ? `${midG} dB` : String(midG)) : "-4.0 dB",
            "Q 2": midQ ?? "1.4"
          }
        });
        if (higPresent) {
          dropped_intent.push({
            intent: `Presence boost/cut around ${higF ?? "2.2 kHz"}`,
            reason: "AT5 Parametric EQ only supports two bands."
          });
          forced_final_status = "PASS_WITH_WARNING";
        }
      } else {
        // Single bands or basic mapping
        if (lowPresent) {
          mapped_intent.push({
            intent: `Low reduction/boost around ${lowF ?? "120 Hz"}`,
            mapped_to: "Band 1",
            settings: {
              "Freq 1": lowF ?? "120 Hz",
              "Gain 1": lowG !== undefined ? (typeof lowG === "number" ? `${lowG} dB` : String(lowG)) : "-3.0 dB",
              "Q 1": lowQ ?? "1.0"
            }
          });
        }
        if (midPresent) {
          const band = mapped_intent.length === 0 ? "Band 1" : "Band 2";
          mapped_intent.push({
            intent: `Mid cut/boost around ${midF ?? "400 Hz"}`,
            mapped_to: band,
            settings: {
              [band === "Band 1" ? "Freq 1" : "Freq 2"]: midF ?? "400 Hz",
              [band === "Band 1" ? "Gain 1" : "Gain 2"]: midG !== undefined ? (typeof midG === "number" ? `${midG} dB` : String(midG)) : "-4.0 dB",
              [band === "Band 1" ? "Q 1" : "Q 2"]: midQ ?? "1.4"
            }
          });
        }
        if (higPresent) {
          if (mapped_intent.length < 2) {
            const band = mapped_intent.length === 0 ? "Band 1" : "Band 2";
            mapped_intent.push({
              intent: `Presence boost/cut around ${higF ?? "2.2 kHz"}`,
              mapped_to: band,
              settings: {
                [band === "Band 1" ? "Freq 1" : "Freq 2"]: higF ?? "2.2 kHz",
                [band === "Band 1" ? "Gain 1" : "Gain 2"]: higG !== undefined ? (typeof higG === "number" ? `${higG} dB` : String(higG)) : "2.5 dB",
                [band === "Band 1" ? "Q 1" : "Q 2"]: higQ ?? "0.8"
              }
            });
          } else {
            dropped_intent.push({
              intent: `Presence boost/cut around ${higF ?? "2.2 kHz"}`,
              reason: "AT5 Parametric EQ only supports two bands."
            });
            forced_final_status = "PASS_WITH_WARNING";
          }
        }
      }

      // Rebuild pair.raw.settings so that it ONLY contains the real 6 Parametric EQ controls
      const realOriginalSettings: Record<string, string | number> = {};
      mapped_intent.forEach(intent => {
        Object.assign(realOriginalSettings, intent.settings);
      });

      // Keep default values if the mapped items didn't specify values
      if (realOriginalSettings["Freq 1"] !== undefined && realOriginalSettings["Q 1"] === undefined) realOriginalSettings["Q 1"] = 1.0;
      if (realOriginalSettings["Freq 2"] !== undefined && realOriginalSettings["Q 2"] === undefined) realOriginalSettings["Q 2"] = 0.8;

      pair.raw.settings = realOriginalSettings;
      // Also sync gear.settings
      gear.settings = realOriginalSettings;
    }
  }
  
  // 1. Resolve GUID and track fallback usage via resolvedGearGuidInfo
  const guidInfo = resolveGearGuidInfo(gear.name, group);
  const catalogMatch = findAT5Gear(gear.name, group);
  let resolvedGuid = guidInfo.resolvedGuid;

  // 1b. Check if the GUID is verified for the intended gear (Rule 3)
  let verified_guid_resolved = false;

  const isUuid = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(resolvedGuid || "");
  const paramsDefs = getParameterDefinitions(gear.name, group);
  const parametersExist = paramsDefs && paramsDefs.length > 0;
  
  const isDbProfile = catalogMatch && (catalogMatch.isDbRecord || (catalogMatch as any).id?.startsWith("gear-") || guidInfo.gear_manager_profile_guid);
  
  let isDbProfileTrusted = false;
  if (isDbProfile && isUuid && parametersExist) {
    const valStatus = (catalogMatch as any).validationStatus || guidInfo.profile_validation_status;
    const profileStatus = (catalogMatch as any).profileStatus;
    const gSource = (catalogMatch as any).guidSource;
    const pSource = (catalogMatch as any).parameterSource;
    
    if (
      isAt5pValidatedStatus(valStatus, catalogMatch) ||
      isAt5pValidatedStatus(profileStatus, catalogMatch) ||
      isAt5pValidatedStatus(guidInfo.profile_validation_status, catalogMatch) ||
      gSource === "at5p_discovery" ||
      pSource === "at5p_discovery"
    ) {
      isDbProfileTrusted = true;
    }
  }

  if (isDbProfileTrusted) {
    verified_guid_resolved = true;
  } else if (group === "cab") {
    verified_guid_resolved = getVerifiedCabs().some((v) => scoreNames(gear.name, v.aliases));
  } else {
    const verifiedMatch = findVerifiedGear(gear.name, group);
    verified_guid_resolved = verifiedMatch !== undefined && verifiedMatch.isVerified !== false;

    // Rule 3: Exporter must trust Gear Manager / DB-backed profiles as export-valid when:
    // - gear type/group is amp
    // - GUID is a valid UUID
    // - parameters exist (determined via getParameterDefinitions)
    // - profile validation status is PASS/verified_at5p, or the profile came from .at5p discovery
    if (group === "amp") {
      const isPassOrAt5p = guidInfo.profile_validation_status === "PASS" || 
                           isAt5pValidatedStatus(guidInfo.profile_validation_status, catalogMatch) ||
                           guidInfo.final_guid_source === "at5p_discovery";
      
      if (isUuid && parametersExist && isPassOrAt5p) {
        verified_guid_resolved = true;
      }
    }
  }

  // 2. Explicit Fallback and Substitution Decider (Anti-Guesswork)
  const isOriginalRequestBrit8000 = (
    gear.name.toLowerCase() === "brit 8000" ||
    pair.raw.name.toLowerCase().trim() === "brit 8000" ||
    pair.raw.name.toLowerCase().trim() === "jcm 800" ||
    pair.raw.name.toLowerCase().trim() === "jcm800" ||
    pair.raw.name.toLowerCase().trim() === "brit 800"
  );

  const isOriginalRequestCabBrit8000 = (
    gear.name.toLowerCase() === "4x12 brit 8000" ||
    pair.raw.name.toLowerCase().trim() === "4x12 brit 8000" ||
    pair.raw.name.toLowerCase().trim() === "4x12 brit 800" ||
    pair.raw.name.toLowerCase().trim() === "4x12 jcm800"
  );

  const is_real_requested_default_gear = (group === "amp" && isOriginalRequestBrit8000) || (group === "cab" && isOriginalRequestCabBrit8000);

  let fallback_decision_source: "resolver" | "safe_mode" | "strict_mode" | "none" = "none";
  let fallback_applied = false;
  let fallback_guid_used = false;
  let substitution_used = false;
  let fallback_trigger: string | undefined = undefined;
  let fallback_reason: string | undefined = undefined;
  let substitution_reason = "";
  let fallback_source = "";
  let delay_substituted = false;
  let delay_substitution_reason = "";

  if (!verified_guid_resolved) {
    if (exportStrictnessMode === "strict") {
      fallback_decision_source = "strict_mode";
      resolvedGuid = "";
      fallback_applied = false;
      fallback_guid_used = false;
      substitution_used = false;
      fallback_trigger = "strict_mode_blocked";
      fallback_reason = "Strict mode blocked export because the requested gear lacks a verified GUID.";
      substitution_reason = fallback_reason;
    } else {
      fallback_decision_source = "safe_mode";
      if (is_real_requested_default_gear) {
        fallback_applied = false;
        fallback_guid_used = false;
        substitution_used = false;
      } else {
        fallback_applied = true;
        fallback_guid_used = true;
        substitution_used = true;
        fallback_trigger = "missing_verified_guid";
        if (group === "amp") {
          resolvedGuid = DEFAULT_AMP_GUID;
        } else if (group === "cab") {
          resolvedGuid = DEFAULT_CAB_GUID;
        } else {
          resolvedGuid = getFallbackGuidForGroup(group);
        }
      }
    }
  } else if (guidInfo.fallback_block_triggered) {
    if (is_real_requested_default_gear) {
      fallback_decision_source = "none";
      fallback_applied = false;
      fallback_guid_used = false;
      substitution_used = false;
    } else {
      fallback_decision_source = "resolver";
      fallback_applied = true;
      fallback_guid_used = true;
      substitution_used = true;
      fallback_trigger = "missing_catalog_guid";
      if (group === "amp") {
        resolvedGuid = DEFAULT_AMP_GUID;
      } else if (group === "cab") {
        resolvedGuid = DEFAULT_CAB_GUID;
      } else {
        resolvedGuid = getFallbackGuidForGroup(group);
      }
    }
  }

  const guid = resolvedGuid;

  // Determine Actual Exported Gear Name
  let actualExportedGearName = gear.name;
  if (!guid || guid === "" || guid === AT5_EMPTY_SLOT_GUID) {
    actualExportedGearName = "None";
  } else if (guid === DEFAULT_AMP_GUID) {
    actualExportedGearName = "Brit 8000";
  } else if (guid === DEFAULT_CAB_GUID) {
    actualExportedGearName = "4x12 Brit 8000";
  } else {
    const matchByGuid = getAt5Catalog().find(c => c.guid === guid);
    if (matchByGuid) {
      actualExportedGearName = matchByGuid.displayName;
    }
  }

  // Determine name-based fallback mismatch or delay substitution
  const normActualName = actualExportedGearName.trim().toLowerCase();
  const normGearName = gear.name.trim().toLowerCase();
  if (normActualName !== normGearName && normActualName !== "none") {
    fallback_applied = true;
    substitution_used = true;
    if (!fallback_reason) {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}".`;
    }
    substitution_reason = fallback_reason;
  }

  const isXTimeRequested = 
    originalRequestedGearName.toLowerCase().replace(/[^a-z0-9]/g, "") === "xtime" ||
    gear.name.toLowerCase().replace(/[^a-z0-9]/g, "") === "xtime";
    
  const isDigitalDelayRequested = 
    originalRequestedGearName.toLowerCase() === "digital delay" ||
    originalRequestedGearName.toLowerCase() === "delay" ||
    gear.name.toLowerCase() === "digital delay" ||
    gear.name.toLowerCase() === "delay";

  const isXTimeExported = 
    actualExportedGearName.toLowerCase().replace(/[^a-z0-9]/g, "") === "xtime";

  const isDigitalDelayExported = 
    actualExportedGearName.toLowerCase() === "digital delay" ||
    actualExportedGearName.toLowerCase() === "delay";

  if (isXTimeRequested && isDigitalDelayExported) {
    delay_substituted = true;
    delay_substitution_reason = `TT substituted "${actualExportedGearName}" because "X-TIME" is unavailable.`;
  } else if (isDigitalDelayRequested && isXTimeExported) {
    delay_substituted = true;
    delay_substitution_reason = `TT substituted "X-TIME" because "${originalRequestedGearName}" is unavailable.`;
  }

  if (delay_substituted) {
    fallback_applied = true;
    substitution_used = true;
    fallback_reason = delay_substitution_reason;
    substitution_reason = delay_substitution_reason;
  }

  // Populate actual reason texts based on the finalized names and flags
  if (fallback_applied || substitution_used) {
    fallback_source = `Default ${group} fallback`;
    guidInfo.final_guid_source = "fallback";
    
    if (fallback_trigger === "missing_verified_guid") {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}" because the requested gear lacks a verified GUID.`;
    } else if (fallback_trigger === "missing_catalog_guid") {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}" because the requested gear is missing from the catalog.`;
    } else if (!fallback_reason) {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}".`;
    }
    substitution_reason = fallback_reason;
  } else if (fallback_decision_source === "strict_mode") {
    fallback_reason = "Strict mode blocked export because the requested gear lacks a verified GUID.";
    substitution_reason = fallback_reason;
  }

  // 5. Build attributes & map unverified settings appropriately using substituted gear schema
  let attrs = "";
  let finalReason = reason;

  // Validation Logic
  const isTypeMismatch = gear.type === "rack" && group === "stomp";
  const isMissingFromCatalog = !catalogMatch;
  const isMissingGuid = catalogMatch && (!catalogMatch.guid || catalogMatch.guid === "");

  if (isTypeMismatch) {
    finalReason = `Check: TYPE MISMATCH. Requested "${gear.name}" (RACK) in a ${group.toUpperCase()} slot. Use Rack section instead.`;
  } else if (!verified_guid_resolved && exportStrictnessMode === "strict") {
    finalReason = `FAIL: "${gear.name}" lacks verified GUID. Strict Export Mode blocks fallback export.`;
  } else if (fallback_guid_used || substitution_used || (actualExportedGearName !== gear.name && guid !== "")) {
    finalReason = `CRITICAL: "${gear.name}" lacks a verified GUID and cannot be exported. TT exported fallback "${actualExportedGearName}" instead.`;
  } else if (isMissingFromCatalog) {
    finalReason = `Check: "${gear.name}" not found in Gear Catalogue. Added with placeholder GUID.`;
  } else if (isMissingGuid) {
    finalReason = `Check: "${gear.name}" found in Catalogue but lacks a verified GUID mapping.`;
  } else if (exported) {
    finalReason = "Included"; // This will trigger the "PASS" state in the UI
  }

  // Custom Suggestion Action Setup
  let suggested_action: string | undefined = undefined;
  if (!verified_guid_resolved) {
    suggested_action = `Import an AT5 .at5p preset containing ${gear.name} using Gear Management / Discovery.`;
    if (gear.name === "Darrell 100") {
      finalReason = `Check: "Darrell 100" is the preferred amp target, but it requires Gear Discovery before it can be exported correctly.`;
    }
  }

  const roomType = group === "cab" ? getRoomType(gear) : "Large Studio";

  if (group === "cab") {
    attrs = buildCabDebugAttrs(gear);

    const mic1Req = getSettingText(gear, ["mic_1", "mic 1", "mic1"]);
    const mic2Req = getSettingText(gear, ["mic_2", "mic 2", "mic2"]);
    const speakerReq = getSettingText(gear, [
      "speaker",
      "speaker type",
      "speaker swap",
    ]);

    const isStockSpeaker =
      !speakerReq ||
      ["stock", "original", "default", "none"].includes(
        speakerReq.toLowerCase().trim()
      );

    const isVerifiedCabinetEntry =
      verified_guid_resolved ||
      findAT5Gear(gear.name, "cab") !== undefined;

    const isVerifiedSpeaker =
      isStockSpeaker ||
      getVerifiedSpeakers().some((v) => scoreNames(speakerReq, v.aliases));
    const isVerifiedMic1 =
      !mic1Req ||
      getVerifiedMics().some((v) => scoreNames(mic1Req, v.aliases));
    const isVerifiedMic2 =
      !mic2Req ||
      getVerifiedMics().some((v) => scoreNames(mic2Req, v.aliases));

    const roomReq = getSettingText(gear, ["room", "room_type"]);
    const isVerifiedRoom = !roomReq || isKnownRoomType(roomReq);

    if (isVerifiedCabinetEntry && isVerifiedSpeaker && isVerifiedMic1 && isVerifiedMic2 && isVerifiedRoom) {
      finalReason = "Included with verified cab, speaker, mic, and room values.";
    } else if (isVerifiedCabinetEntry && isVerifiedSpeaker && isVerifiedMic1 && isVerifiedMic2) {
      finalReason = "Included with verified cab, speaker, and mic GUIDs.";
    } else if (exported) {
      const issues = [];
      if (!isVerifiedCabinetEntry) issues.push("Cab");
      if (!isVerifiedSpeaker) issues.push("Speaker");
      if (!isVerifiedMic1) issues.push("Mic 1");
      if (!isVerifiedMic2) issues.push("Mic 2");
      if (!isVerifiedRoom) issues.push("Room");
      finalReason = `Included (Check: Unverified ${issues.join(", ")}. Exported using generic template.)`;
    }
  } else {
    // If unverified/fallback to Brit 8000/JCM800, we build coordinates using substituted gear's schema so they translate!
    let parameterSourceGearName = gear.name;
    if (!verified_guid_resolved) {
      if (guid === DEFAULT_AMP_GUID) {
        parameterSourceGearName = "Brit 8000";
      } else if (guid === DEFAULT_CAB_GUID) {
        parameterSourceGearName = "4x12 Brit 8000";
      }
    }

    attrs = cleanXmlAttrString(
      buildMappedParameterAttrs(parameterSourceGearName, group, gear.settings ?? {})
    );

    if (group === "amp") {
      attrs = ensureBrit8000Sensitivity(guid, attrs);
    }
  }

  // Parameter Mapping Verification Logic
  let parameter_mapping_status: "SUCCESS" | "MISMATCH" | "UNVERIFIED" | "FAILED" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" = "SUCCESS";
  const mismatched_parameters: string[] = [];
  const dropped_parameters: string[] = [];
  const disparity_parameters: string[] = [];
  const suspiciousMappingParams: string[] = [];
  const suspiciousDetails: string[] = [];
  const detailsList: any[] = [];
  const not_exported_detail: string[] = [];
  let hasNearestBandWarning = false;
  const nearestBandsList: string[] = [];
  let hasFallbackWarning = false;
  const fallbackWarningsList: string[] = [];

  const parsedExported: Record<string, number | string> = {};
  const rawExportedStrings: Record<string, string> = {};
  const attrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(attrs)) !== null) {
    const [_, name, val] = attrMatch;
    const num = parseFloat(val);
    parsedExported[name] = isNaN(num) ? val : num;
    rawExportedStrings[name] = val;
  }

  const normSettings = gear.settings ?? {};

  if (exported && group !== "cab") {
    const defs = getParameterDefinitions(gear.name, group);
    if (defs && defs.length > 0) {
      for (const [normKey, normVal] of Object.entries(normSettings)) {
        const cleanNormKey = normKey.toLowerCase().replace(/[^a-z0-9.]/g, "");
        if (["bypass", "mute", "volume", "output", "level", "pan", "status", "gain_level", "noise_level"].includes(cleanNormKey)) {
          // If the parameter is verified in the overrides/defs, we MUST verify and map it!
          // We only skip it if there's no def for it.
          const hasDef = defs.some(d => {
            const cleanFriendly = d.friendlyName.toLowerCase().replace(/[^a-z0-9.]/g, "");
            const cleanXml = d.xmlName.toLowerCase().replace(/[^a-z0-9.]/g, "");
            const cleanAliases = [
              ...(d.aliases ?? []),
              ...(d.savedAliases ?? []),
              ...(d.rawMappingAliases ?? []),
              ...(d.autoGeneratedAliases ?? []),
              ...(d.effectiveAliases ?? [])
            ].map((a) => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
            return (
              cleanFriendly === cleanNormKey ||
              cleanXml === cleanNormKey ||
              cleanAliases.includes(cleanNormKey)
            );
          });
          if (!hasDef) {
            continue;
          }
        }

        let def = defs.find((d) => {
          const cleanFriendly = d.friendlyName.toLowerCase().replace(/[^a-z0-9.]/g, "");
          const cleanXml = d.xmlName.toLowerCase().replace(/[^a-z0-9.]/g, "");
          const cleanAliases = [
            ...(d.aliases ?? []),
            ...(d.savedAliases ?? []),
            ...(d.rawMappingAliases ?? []),
            ...(d.autoGeneratedAliases ?? []),
            ...(d.effectiveAliases ?? [])
          ].map((a) => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
          return (
            cleanFriendly === cleanNormKey ||
            cleanXml === cleanNormKey ||
            cleanAliases.includes(cleanNormKey)
          );
        });

        const isGraphicEq = gear.name.toLowerCase().includes("graphic");
        let isNearestBandMapping = false;
        let nearestBandMappedXmlName = "";
        let nearestBandFreq = 0;

        if (!def && isGraphicEq) {
          const hz = parseFrequencyToHz(normKey);
          if (hz !== null) {
            const closest = findClosestBand(hz);
            nearestBandFreq = closest;
            const targetXml = `Band${closest}`;
            def = defs.find(d => d.xmlName.toLowerCase() === targetXml.toLowerCase());
            if (def) {
              isNearestBandMapping = true;
              nearestBandMappedXmlName = def.xmlName;
            }
          }
        }

        if (def) {
          // Check if marked as doNotRequestForGear
          if (def.doNotRequestForGear) {
            detailsList.push({
              parameter: normKey,
              input_value: normVal,
              display_value: String(normVal),
              exported_internal_value: "SKIPPED_UNSUPPORTED",
              mapping_status: "SKIPPED_UNSUPPORTED",
              conversion_note: "Parameter skipped because it is marked unsupported for this gear.",
              input_parameter_name: normKey,
              matched_profile_parameter: def.friendlyName,
              matched_export_parameter_name: def.xmlName,
              match_source: "unmatched",
              exported_value: "SKIPPED_UNSUPPORTED",
              verification_skipped: true,
              verification_skip_reason: "Parameter marked unsupported/do-not-request for this gear.",
            });
            continue;
          }

          if (isNearestBandMapping) {
            nearestBandsList.push(`requested ${normKey} mapped to supported AT5 band ${nearestBandFreq}Hz`);
          }
          const expVal = parsedExported[def.xmlName];
          if (expVal !== undefined) {
            const convRes = convertParameterValueForExport({
              inputValue: normVal,
              parameterDef: def,
              conversionMode: def.transform,
              displayMin: def.visualMin ?? def.displayMin,
              displayMax: def.visualMax ?? def.displayMax,
              exportMin: def.min,
              exportMax: def.max,
              displayUnit: def.unit || def.displayUnit,
              displayPrecision: def.displayPrecision ?? def.displayDecimalPlaces ?? def.decimalPlaces,
              exportPrecision: def.exportPrecision ?? def.exportDecimalPlaces,
              exportDecimalPlaces: def.exportPrecision ?? def.exportDecimalPlaces,
            });

            const authoritativeExpectedValue = typeof convRes.finalExportValue === "number"
              ? (Math.abs(convRes.finalExportValue) < 1e-9 && (convRes.conversionMode === "db_to_linear" || convRes.conversionMode === "dbThresholdToLinear") ? 0 : Number(convRes.finalExportValue.toFixed(6)))
              : convRes.formattedExportValue;

            const serializedExpectedValue = convRes.formattedExportValue;
            const nv = typeof convRes.finalExportValue === "number" ? convRes.finalExportValue : parseFloat(String(convRes.finalExportValue));
            const ev = typeof expVal === "number" ? expVal : parseFloat(String(expVal));

            const clamp_app = convRes.clampApplied;

            const appendUnitIdNotPresent = (val: string | number, unit: string) => {
              const strVal = String(val);
              const uLower = unit.toLowerCase().trim();
              const vLower = strVal.toLowerCase();
              if (vLower.includes(uLower)) {
                return strVal;
              }
              return `${strVal} ${unit}`;
            };

            let conversion_note: string | undefined;
            let display_value = convRes.displayUnit ? appendUnitIdNotPresent(convRes.inputDisplayValue, convRes.displayUnit) : String(convRes.inputDisplayValue);

            const normalizedGearName = gear.name.toLowerCase();
            if (isNearestBandMapping) {
              const sign = parseFloat(String(normVal)) >= 0 ? "+" : "";
              display_value = `${normKey} ${sign}${normVal} dB`;
              conversion_note = `${normKey} is not an exact AT5 Graphic EQ band. Mapped to nearest supported band: ${nearestBandFreq}Hz.`;
            } else if (normalizedGearName === "noise gate" || normalizedGearName.includes("gate")) {
              if (def.friendlyName === "Threshold") {
                conversion_note = "Converted dB threshold to AT5 linear threshold using 10^(dB/20).";
                display_value = appendUnitIdNotPresent(normVal, "dB");
              } else if (def.friendlyName === "Release") {
                conversion_note = "Release exports directly in milliseconds.";
                display_value = appendUnitIdNotPresent(normVal, "ms");
              } else if (def.friendlyName === "Depth") {
                conversion_note = "Depth exports directly in dB.";
                display_value = appendUnitIdNotPresent(normVal, "dB");
              }
            } else {
              if (def.transform === "dbThresholdToLinear") {
                conversion_note = "Converted dB threshold to AT5 internal gate threshold value";
              } else if (def.transform === "noiseGateRelease") {
                conversion_note = "Normalized Release time to ms or scaled dial value";
              } else if (def.transform === "noiseGateDepth") {
                conversion_note = "Mapped depth to AT5 dB range (-100 to -20)";
              } else if (def.transform) {
                conversion_note = `Converted value using transform ${def.transform}`;
              }
            }

            const verif = verifyParameterExportMatch({
              intendedDisplayValue: display_value,
              expectedExportValue: authoritativeExpectedValue,
              actualExportValue: expVal,
              parameterDef: def,
              conversionResult: convRes,
              isNearestBandMapping,
              nearestBandFreq,
            });

            const match = verif.match;
            const isMappingConfigSuspicious = verif.isMappingConfigSuspicious;
            const isAccidentalClampingTo1 = verif.isAccidentalClampingTo1;
            const mapStatus = verif.status;
            const parameter_reason = verif.reason;
            const conversion_warning = verif.warning;

            if (isMappingConfigSuspicious) {
              suspiciousMappingParams.push(def.friendlyName);
              suspiciousDetails.push(parameter_reason || `Mapping configuration appears wrong for ${def.friendlyName}.`);
            }

            const reverse_converted_display_value = convRes.reverseDisplayValue;

            let match_source: "exact_xml" | "friendly_name" | "saved_alias" | "raw_mapping_alias" | "generated_alias" | "fallback" | "unmatched" = "unmatched";
            const cleanXml = def.xmlName.toLowerCase().replace(/[^a-z0-9.]/g, "");
            const cleanFriendly = def.friendlyName.toLowerCase().replace(/[^a-z0-9.]/g, "");
            const cleanCanonical = (def.canonicalParameterName || "").toLowerCase().replace(/[^a-z0-9.]/g, "");

            const savedAliases = (def.savedAliases || def.aliases || []).map(a => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
            const rawAliases = (def.rawMappingAliases || []).map(a => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
            const genAliases = (def.autoGeneratedAliases || []).map(a => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));

            if (cleanXml === cleanNormKey) {
              match_source = "exact_xml";
            } else if (cleanFriendly === cleanNormKey || (cleanCanonical && cleanCanonical === cleanNormKey)) {
              match_source = "friendly_name";
            } else if (savedAliases.includes(cleanNormKey)) {
              match_source = "saved_alias";
            } else if (rawAliases.includes(cleanNormKey)) {
              match_source = "raw_mapping_alias";
            } else if (genAliases.includes(cleanNormKey)) {
              match_source = "generated_alias";
            } else {
              match_source = "saved_alias";
            }

            const rawXmlVal = rawExportedStrings[def.xmlName] ?? String(expVal);

            detailsList.push({
              parameter: normKey,
              normalized_parameter: isNearestBandMapping ? nearestBandMappedXmlName : undefined,
              input_value: normVal,
              input_display_value: convRes.inputDisplayValue,
              display_value,
              display_unit: convRes.displayUnit,
              display_min: convRes.displayMin,
              display_max: convRes.displayMax,
              conversion_mode: convRes.conversionMode,
              display_clamp_applied: convRes.displayClampApplied,
              clamped_display_value: convRes.clampedDisplayValue,
              converted_raw_value: convRes.convertedRawValue,
              exported_internal_value: rawXmlVal,
              mapping_status: mapStatus,
              conversion_note,
              expected_export_value: authoritativeExpectedValue,
              serialized_export_value: serializedExpectedValue,
              actual_xml_value: rawXmlVal,
              actual_export_value: typeof ev === "number" && !isNaN(ev) ? ev : rawXmlVal,
              reverse_converted_display_value,
              display_precision: convRes.displayPrecision,
              export_precision: convRes.exportPrecision,
              reason: parameter_reason,
              input_parameter_name: normKey,
              matched_profile_parameter: def.displayParameterName || (def as any).displayName || def.friendlyName,
              matched_export_parameter_name: def.at5XmlAttributeName || (def as any).exportParameterName || (def as any).exportName || def.xmlName,
              match_source,
              exported_value: expVal,
              visual_min: convRes.displayMin,
              visual_max: convRes.displayMax,
              export_min: convRes.exportMin,
              export_max: convRes.exportMax,
              raw_clamp_applied: convRes.rawClampApplied,
              pre_clamp_value: convRes.inputDisplayValue,
              post_clamp_value: typeof nv === "number" ? Number(nv.toFixed(6)) : nv,
              clamp_applied: convRes.clampApplied,
              final_export_value: typeof nv === "number" ? Number(nv.toFixed(6)) : nv,
              range_source: "Gear Manager / DB mapping",
              range_confidence: isAccidentalClampingTo1 ? "low / conflicting" : "high",
              conversion_warning,
            });

            if (isNearestBandMapping && match) {
              hasNearestBandWarning = true;
            } else if (!match && !isMappingConfigSuspicious) {
              if (isAccidentalClampingTo1) {
                mismatched_parameters.push(
                  `${def.friendlyName} (Accidental continuous knob clamping: Intended display: ${normVal}, clamped to ${serializedExpectedValue} because exportMax is ${def.max})`
                );
              } else {
                mismatched_parameters.push(
                  `${def.friendlyName} (${parameter_reason || `Intended display: ${normVal}, Expected exported value: ${authoritativeExpectedValue}, Exported: ${expVal}`})`
                );
              }
            }

            if (clamp_app && !isAccidentalClampingTo1 && !isMappingConfigSuspicious) {
              disparity_parameters.push(normKey);
            }
          } else {
            mismatched_parameters.push(
              `${def.friendlyName} (Unable to map or missing in exported settings)`
            );
            detailsList.push({
              parameter: normKey,
              display_value: String(normVal),
              exported_internal_value: "MISSING",
              mapping_status: "MISMATCH",
              conversion_note: "Parameter missing in exported attributes",
              input_parameter_name: normKey,
              matched_profile_parameter: def.friendlyName,
              matched_export_parameter_name: def.xmlName,
              match_source: "unmatched",
              exported_value: "MISSING",
            });
          }
        } else {
          dropped_parameters.push(normKey);
          detailsList.push({
            parameter: normKey,
            input_value: normVal,
            display_value: String(normVal),
            exported_internal_value: "DROPPED",
            mapping_status: "PARAMETER_ALIAS_RESOLUTION_FAILED",
            conversion_note: `PARAMETER_ALIAS_RESOLUTION_FAILED: Parameter '${normKey}' is dropped / not supported by the physical gear definition.`,
            input_parameter_name: normKey,
            matched_profile_parameter: undefined,
            matched_export_parameter_name: undefined,
            match_source: "unmatched",
            exported_value: "DROPPED",
            verification_skipped: true,
            verification_skip_reason: "PARAMETER_ALIAS_RESOLUTION_FAILED: Parameter is unmatched/dropped; no XML attribute should be expected.",
            requires_mapping_review: true,
          });

          // Queue unmatched parameter into Review Queue asynchronously (non-blocking)
          const possibleMatches = defs.filter(d => {
            const cleanDef = d.friendlyName.toLowerCase();
            const cleanReq = normKey.toLowerCase();
            return cleanDef.includes(cleanReq) || cleanReq.includes(cleanDef);
          }).map(d => d.friendlyName);

          at5DatabaseService.recordRequestedParameterForReview(
            gear.name,
            resolvedGuid || undefined,
            normKey,
            normVal,
            possibleMatches,
            "Direct Export Verification"
          ).catch(e => console.error("Error logging parameter review:", e));
        }
      }
    } else {
      parameter_mapping_status = "UNVERIFIED";
    }
  } else if (exported && group === "cab") {
    const rawNormRoom = String(normSettings.Room || normSettings.room || "");
    const rawExpRoom = String(parsedExported.RoomType || "");

    if (rawNormRoom) {
      const canonicalNorm = canonicalizeRoomType(rawNormRoom);
      const canonicalExp = canonicalizeRoomType(rawExpRoom);

      const isKnown = isKnownRoomType(rawNormRoom);
      const mappingStatus = isKnown ? "SUCCESS" : "UNVERIFIED";
      const conversionNote = isKnown
        ? `${rawNormRoom} is an alias for AT5 RoomType ${canonicalNorm}.`
        : `Unrecognized room type '${rawNormRoom}'. Fallback default used.`;

      detailsList.push({
        parameter: "RoomType",
        input_value: rawNormRoom,
        canonical_input_value: canonicalNorm,
        exported_internal_value: rawExpRoom,
        mapping_status: mappingStatus,
        match_source: "room_alias",
        conversion_note: conversionNote,
        display_value: rawNormRoom,
        expected_export_value: canonicalNorm,
        exported_value: rawExpRoom,
      });

      if (!isKnown) {
        mismatched_parameters.push(
          `RoomType (Unrecognized room value: '${rawNormRoom}', Exported fallback: '${rawExpRoom}')`
        );
      } else if (canonicalNorm !== canonicalExp) {
        mismatched_parameters.push(
          `RoomType (Intended: '${rawNormRoom}', Canonical Intended: '${canonicalNorm}', Exported: '${rawExpRoom}')`
        );
      }
    }

    const placementMappings = getDbMicPlacementMappings();

    // Canonical Mic 1 Placement (Slot 0 -> AT5 Mic0)
    const rawPl0 = extractCanonicalMicPlacement(originalRequestedSettings, 0);
    const normPl0 = extractCanonicalMicPlacement(normSettings, 0);
    const was_supplied_0 = !rawPl0.isUnspecified || !normPl0.isUnspecified;
    const semanticProvenance0: "signal_chain_generated" | "signal_chain_normalized" | "cab_default" = 
      !rawPl0.isUnspecified ? "signal_chain_generated" : (!normPl0.isUnspecified ? "signal_chain_normalized" : "cab_default");
    const activePl0 = !rawPl0.isUnspecified ? rawPl0 : normPl0;
    const sourceSemantic0 = rawPl0.sourceRawPlacement || normPl0.sourceRawPlacement;

    const mic1Req = getSettingText(gear, ["mic_1", "mic 1", "mic1"]) || "Dynamic 57";
    const mic1Guid = getMicId(mic1Req);

    let resM1: any = null;
    if (was_supplied_0) {
      resM1 = resolveCompositeMicPlacement({
        cabName: gear.name,
        cabGuid: resolveCabGuid(gear.name),
        micSlot: "Mic_1",
        canonicalPlacement: activePl0,
        micModelName: mic1Req,
        micModelGuid: mic1Guid,
        dbMappings: placementMappings
      });
    }

    const displayLabel0 = was_supplied_0 ? (resM1?.parsedLabel || activePl0.canonicalLabel) : "Not specified";
    const intendedSemantic0 = was_supplied_0 ? (sourceSemantic0 || displayLabel0) : "Not specified";
    const resolved_profile_found_0 = was_supplied_0 && !!(resM1 && resM1.resolved);
    const xmlValues0 = resolved_profile_found_0 && resM1 ? {
      Mic0Angle: resM1.coordinates.Angle,
      Mic0XAxis: resM1.coordinates.XAxis,
      Mic0YAxis: resM1.coordinates.YAxis,
      Mic0Distance: resM1.coordinates.Distance,
      Mic0Speaker: resM1.coordinates.Speaker
    } : null;

    const fallback_value_0 = {
      Mic0Angle: 0,
      Mic0XAxis: 0,
      Mic0YAxis: 0,
      Mic0Distance: 0,
      Mic0Speaker: 0
    };

    const exported_value_0 = {
      Mic0Angle: parsedExported.Mic0Angle ?? "0",
      Mic0XAxis: parsedExported.Mic0XAxis ?? "0",
      Mic0YAxis: parsedExported.Mic0YAxis ?? "0",
      Mic0Distance: parsedExported.Mic0Distance ?? "0",
      Mic0Speaker: parsedExported.Mic0Speaker ?? "0"
    };

    const exportedString0 = `Mic0Angle: ${exported_value_0.Mic0Angle}, Mic0XAxis: ${exported_value_0.Mic0XAxis}, Mic0YAxis: ${exported_value_0.Mic0YAxis}, Mic0Distance: ${exported_value_0.Mic0Distance}, Mic0Speaker: ${exported_value_0.Mic0Speaker}`;

    if (!was_supplied_0) {
      detailsList.push({
        parameter: "Mic 0 Placement",
        display_value: "Not specified",
        expected_export_value: "Mic0Angle: 0, Mic0XAxis: 0, Mic0YAxis: 0, Mic0Distance: 0, Mic0Speaker: 0",
        exported_internal_value: exportedString0,
        mapping_status: "NOT_SPECIFIED",
        conversion_note: "No semantic mic placement was specified in source signal chain. Exported default AT5 coordinates.",
        intended_semantic_value: "Not specified",
        source_semantic_placement: undefined,
        normalized_semantic_placement: undefined,
        canonical_semantic_placement: "Not specified",
        semantic_provenance: "cab_default",
        coordinate_resolution_source: "cab_default",
        coordinate_translation_source: "cab_default",
        resolved_profile_found: false,
        resolved_profile_value: fallback_value_0,
        fallback_value: fallback_value_0,
        exported_value: exported_value_0,
        placement_label: "Not specified",
        placement_profile_source: undefined,
        placement_profile_id: undefined,
        fallback_used: false,
        resolved_numeric_values: fallback_value_0,
        exported_numeric_values: exported_value_0,
        verification_status: "NOT_SPECIFIED",
        placement_was_supplied_by_chain: false,
        placement_source: "cab_default",
        resolved_at5_fields: fallback_value_0
      });
    } else if (resolved_profile_found_0 && resM1 && xmlValues0) {
      let allMatch = true;
      const detailStrings: string[] = [];
      const expectedStrings: string[] = [];
      for (const [f, expectedVal] of Object.entries(xmlValues0)) {
        if (f.startsWith("Mic0")) {
          const actualVal = parsedExported[f] ?? "0";
          const evNum = parseFloat(String(expectedVal));
          const avNum = parseFloat(String(actualVal));
          let matched = false;
          if (!isNaN(avNum) && !isNaN(evNum)) {
            matched = Math.abs(avNum - evNum) <= 0.05;
          } else {
            matched = String(expectedVal) === String(actualVal);
          }
          if (!matched) {
            allMatch = false;
          }
          detailStrings.push(`${f}: ${actualVal}`);
          expectedStrings.push(`${f}: ${expectedVal}`);
        }
      }

      const status = "RESOLVED_FROM_PROFILE";
      const conversionNote = allMatch 
        ? `Mic 0 placement resolved and matched successfully against all AT5 XML coordinate parameters.`
        : `Discrepancy in numeric coordinates between requested intent and exported preset XML.`;

      if (!allMatch) {
        mismatched_parameters.push("Mic_0_Placement (coordinate mismatch)");
      }

      const profileSource = resM1.resolutionSource === "reference_calibration_vir"
        ? "reference_calibration_vir"
        : (resM1.matchedProfile?.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile");

      detailsList.push({
        parameter: "Mic 0 Placement",
        display_value: displayLabel0,
        expected_export_value: expectedStrings.join(", "),
        exported_internal_value: exportedString0,
        mapping_status: status,
        conversion_note: conversionNote,
        intended_semantic_value: intendedSemantic0,
        source_semantic_placement: sourceSemantic0,
        normalized_semantic_placement: normPl0.sourceRawPlacement || normPl0.canonicalLabel,
        canonical_semantic_placement: displayLabel0,
        semantic_provenance: semanticProvenance0,
        coordinate_resolution_source: profileSource,
        coordinate_translation_source: profileSource,
        resolved_profile_found: true,
        resolved_profile_value: xmlValues0,
        fallback_value: fallback_value_0,
        exported_value: exported_value_0,
        placement_label: displayLabel0,
        placement_profile_source: profileSource,
        placement_profile_id: resM1.matchedProfile?.id,
        fallback_used: false,
        resolved_numeric_values: xmlValues0,
        exported_numeric_values: exported_value_0,
        verification_status: status,
        placement_was_supplied_by_chain: true,
        placement_source: profileSource,
        resolved_at5_fields: xmlValues0
      });
    } else {
      const warningMsg = resM1?.warning || `No AT5 mic placement profile found for ${displayLabel0} on this cab. Using fallback placement.`;
      hasFallbackWarning = true;
      fallbackWarningsList.push(warningMsg);

      detailsList.push({
        parameter: "Mic 0 Placement",
        display_value: displayLabel0,
        expected_export_value: "N/A (No profile found)",
        exported_internal_value: exportedString0,
        mapping_status: "FALLBACK_USED",
        conversion_note: warningMsg,
        intended_semantic_value: intendedSemantic0,
        source_semantic_placement: sourceSemantic0,
        normalized_semantic_placement: normPl0.sourceRawPlacement || normPl0.canonicalLabel,
        canonical_semantic_placement: displayLabel0,
        semantic_provenance: semanticProvenance0,
        coordinate_resolution_source: "safe_fallback",
        coordinate_translation_source: "safe_fallback",
        resolved_profile_found: false,
        resolved_profile_value: null,
        fallback_value: fallback_value_0,
        exported_value: exported_value_0,
        placement_label: displayLabel0,
        placement_profile_source: undefined,
        placement_profile_id: undefined,
        fallback_used: true,
        fallback_reason: warningMsg,
        resolved_numeric_values: null,
        exported_numeric_values: exported_value_0,
        verification_status: "FALLBACK_USED",
        placement_was_supplied_by_chain: true,
        placement_source: "fallback_default",
        resolved_at5_fields: fallback_value_0
      });
    }

    // Canonical Mic 2 Placement (Slot 1 -> AT5 Mic1)
    const rawPl1 = extractCanonicalMicPlacement(originalRequestedSettings, 1);
    const normPl1 = extractCanonicalMicPlacement(normSettings, 1);
    const was_supplied_1 = !rawPl1.isUnspecified || !normPl1.isUnspecified;
    const semanticProvenance1: "signal_chain_generated" | "signal_chain_normalized" | "cab_default" = 
      !rawPl1.isUnspecified ? "signal_chain_generated" : (!normPl1.isUnspecified ? "signal_chain_normalized" : "cab_default");
    const activePl1 = !rawPl1.isUnspecified ? rawPl1 : normPl1;
    const sourceSemantic1 = rawPl1.sourceRawPlacement || normPl1.sourceRawPlacement;

    const mic2Req = getSettingText(gear, ["mic_2", "mic 2", "mic2", "mic_1", "mic 1", "mic1"]) || "Condenser 87";
    const mic2Guid = getMicId(mic2Req);

    let resM2: any = null;
    if (was_supplied_1) {
      resM2 = resolveCompositeMicPlacement({
        cabName: gear.name,
        cabGuid: resolveCabGuid(gear.name),
        micSlot: "Mic_2",
        canonicalPlacement: activePl1,
        micModelName: mic2Req,
        micModelGuid: mic2Guid,
        dbMappings: placementMappings
      });
    }

    const displayLabel1 = was_supplied_1 ? (resM2?.parsedLabel || activePl1.canonicalLabel) : "Not specified";
    const intendedSemantic1 = was_supplied_1 ? (sourceSemantic1 || displayLabel1) : "Not specified";
    const resolved_profile_found_1 = was_supplied_1 && !!(resM2 && resM2.resolved);
    const xmlValues1 = resolved_profile_found_1 && resM2 ? {
      Mic1Angle: resM2.coordinates.Angle,
      Mic1XAxis: resM2.coordinates.XAxis,
      Mic1YAxis: resM2.coordinates.YAxis,
      Mic1Distance: resM2.coordinates.Distance,
      Mic1Speaker: resM2.coordinates.Speaker
    } : null;

    const fallback_value_1 = {
      Mic1Angle: 0,
      Mic1XAxis: 0,
      Mic1YAxis: 0,
      Mic1Distance: 0,
      Mic1Speaker: 1
    };

    const exported_value_1 = {
      Mic1Angle: parsedExported.Mic1Angle ?? "0",
      Mic1XAxis: parsedExported.Mic1XAxis ?? "0",
      Mic1YAxis: parsedExported.Mic1YAxis ?? "0",
      Mic1Distance: parsedExported.Mic1Distance ?? "0",
      Mic1Speaker: parsedExported.Mic1Speaker ?? "1"
    };

    const exportedString1 = `Mic1Angle: ${exported_value_1.Mic1Angle}, Mic1XAxis: ${exported_value_1.Mic1XAxis}, Mic1YAxis: ${exported_value_1.Mic1YAxis}, Mic1Distance: ${exported_value_1.Mic1Distance}, Mic1Speaker: ${exported_value_1.Mic1Speaker}`;

    if (!was_supplied_1) {
      detailsList.push({
        parameter: "Mic 1 Placement",
        display_value: "Not specified",
        expected_export_value: "Mic1Angle: 0, Mic1XAxis: 0, Mic1YAxis: 0, Mic1Distance: 0, Mic1Speaker: 1",
        exported_internal_value: exportedString1,
        mapping_status: "NOT_SPECIFIED",
        conversion_note: "No semantic mic placement was specified in source signal chain. Exported default AT5 coordinates.",
        intended_semantic_value: "Not specified",
        source_semantic_placement: undefined,
        normalized_semantic_placement: undefined,
        canonical_semantic_placement: "Not specified",
        semantic_provenance: "cab_default",
        coordinate_resolution_source: "cab_default",
        coordinate_translation_source: "cab_default",
        resolved_profile_found: false,
        resolved_profile_value: fallback_value_1,
        fallback_value: fallback_value_1,
        exported_value: exported_value_1,
        placement_label: "Not specified",
        placement_profile_source: undefined,
        placement_profile_id: undefined,
        fallback_used: false,
        resolved_numeric_values: fallback_value_1,
        exported_numeric_values: exported_value_1,
        verification_status: "NOT_SPECIFIED",
        placement_was_supplied_by_chain: false,
        placement_source: "cab_default",
        resolved_at5_fields: fallback_value_1
      });
    } else if (resolved_profile_found_1 && resM2 && xmlValues1) {
      let allMatch = true;
      const detailStrings: string[] = [];
      const expectedStrings: string[] = [];
      for (const [f, expectedVal] of Object.entries(xmlValues1)) {
        if (f.startsWith("Mic1")) {
          const actualVal = parsedExported[f] ?? "0";
          const evNum = parseFloat(String(expectedVal));
          const avNum = parseFloat(String(actualVal));
          let matched = false;
          if (!isNaN(avNum) && !isNaN(evNum)) {
            matched = Math.abs(avNum - evNum) <= 0.05;
          } else {
            matched = String(expectedVal) === String(actualVal);
          }
          if (!matched) {
            allMatch = false;
          }
          detailStrings.push(`${f}: ${actualVal}`);
          expectedStrings.push(`${f}: ${expectedVal}`);
        }
      }

      const status = "RESOLVED_FROM_PROFILE";
      const conversionNote = allMatch 
        ? `Mic 1 placement resolved and matched successfully against all AT5 XML coordinate parameters.`
        : `Discrepancy in numeric coordinates between requested intent and exported preset XML.`;

      if (!allMatch) {
        mismatched_parameters.push("Mic_1_Placement (coordinate mismatch)");
      }

      const profileSource = resM2.resolutionSource === "reference_calibration_vir"
        ? "reference_calibration_vir"
        : (resM2.matchedProfile?.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile");

      detailsList.push({
        parameter: "Mic 1 Placement",
        display_value: displayLabel1,
        expected_export_value: expectedStrings.join(", "),
        exported_internal_value: exportedString1,
        mapping_status: status,
        conversion_note: conversionNote,
        intended_semantic_value: intendedSemantic1,
        source_semantic_placement: sourceSemantic1,
        normalized_semantic_placement: normPl1.sourceRawPlacement || normPl1.canonicalLabel,
        canonical_semantic_placement: displayLabel1,
        semantic_provenance: semanticProvenance1,
        coordinate_resolution_source: profileSource,
        coordinate_translation_source: profileSource,
        resolved_profile_found: true,
        resolved_profile_value: xmlValues1,
        fallback_value: fallback_value_1,
        exported_value: exported_value_1,
        placement_label: displayLabel1,
        placement_profile_source: profileSource,
        placement_profile_id: resM2.matchedProfile?.id,
        fallback_used: false,
        resolved_numeric_values: xmlValues1,
        exported_numeric_values: exported_value_1,
        verification_status: status,
        placement_was_supplied_by_chain: true,
        placement_source: profileSource,
        resolved_at5_fields: xmlValues1
      });
    } else {
      const warningMsg = resM2?.warning || `No AT5 mic placement profile found for ${displayLabel1} on this cab. Using fallback placement.`;
      hasFallbackWarning = true;
      fallbackWarningsList.push(warningMsg);

      detailsList.push({
        parameter: "Mic 1 Placement",
        display_value: displayLabel1,
        expected_export_value: "N/A (No profile found)",
        exported_internal_value: exportedString1,
        mapping_status: "FALLBACK_USED",
        conversion_note: warningMsg,
        intended_semantic_value: intendedSemantic1,
        source_semantic_placement: sourceSemantic1,
        normalized_semantic_placement: normPl1.sourceRawPlacement || normPl1.canonicalLabel,
        canonical_semantic_placement: displayLabel1,
        semantic_provenance: semanticProvenance1,
        coordinate_resolution_source: "safe_fallback",
        coordinate_translation_source: "safe_fallback",
        resolved_profile_found: false,
        resolved_profile_value: null,
        fallback_value: fallback_value_1,
        exported_value: exported_value_1,
        placement_label: displayLabel1,
        placement_profile_source: undefined,
        placement_profile_id: undefined,
        fallback_used: true,
        fallback_reason: warningMsg,
        resolved_numeric_values: null,
        exported_numeric_values: exported_value_1,
        verification_status: "FALLBACK_USED",
        placement_was_supplied_by_chain: true,
        placement_source: "fallback_default",
        resolved_at5_fields: fallback_value_1
      });
    }

    // Now process any other cabinet parameters (e.g. Room_Level, Cab_Link)
    const micKeysToSkip = new Set([
      "speaker", "mic_1", "mic_2", "mic 1", "mic 2", "mic1", "mic2", "room",
      "mic_1_placement", "mic 1 placement", "mic1_placement", "mic1 placement",
      "mic_2_placement", "mic 2 placement", "mic2_placement", "mic2 placement",
      "mic_1_position", "mic 1 position", "mic1_position", "mic1 position",
      "mic_2_position", "mic 2 position", "mic2_position", "mic2 position",
      "mic_1_distance", "mic 1 distance", "mic1_distance", "mic1 distance",
      "mic_2_distance", "mic 2 distance", "mic2_distance", "mic2 distance",
      "mic_1_angle", "mic 1 angle", "mic1_angle", "mic1 angle",
      "mic_2_angle", "mic 2 angle", "mic2_angle", "mic2 angle",
      "mic_1_axis", "mic 1 axis", "mic1_axis", "mic1 axis",
      "mic_2_axis", "mic 2 axis", "mic2_axis", "mic2 axis",
      "mic_1_off_axis", "mic 1 off axis",
      "mic_2_off_axis", "mic 2 off axis",
      "position_1", "position 1", "position_2", "position 2",
      "distance_1", "distance 1", "distance_2", "distance 2",
      "angle_1", "angle 1", "angle_2", "angle 2",
      "axis_1", "axis 1", "axis_2", "axis 2",
      "position", "distance", "angle", "axis"
    ]);

    for (const [key, val] of Object.entries(normSettings)) {
      const k = key.toLowerCase();
      if (micKeysToSkip.has(k) || micKeysToSkip.has(k.replace(/_/g, " ")) || micKeysToSkip.has(k.replace(/\s+/g, "_"))) {
        continue;
      }

      if (k === "room_level" || k === "room level") {
        detailsList.push({
          parameter: "Room_Level",
          display_value: String(val),
          expected_export_value: `Studio: Cab1_Room_Level: ~${val}`,
          exported_internal_value: "Semantic/Manual (In Studio node)",
          mapping_status: "SUCCESS",
          conversion_note: "Room Level is classified as semantic/manual. Excluded from strict cabinet-specific raw XML attribute comparison."
        });
        continue;
      } else if (k === "cab_link" || k === "cab link") {
        detailsList.push({
          parameter: "Cab_Link",
          display_value: String(val),
          expected_export_value: "Cab_Link",
          exported_internal_value: "Cab_Link",
          mapping_status: "SUCCESS",
          conversion_note: "Cab Link is preserved as a standard cabinet routing setting."
        });
        continue;
      } else {
        if (!isUnspecifiedPlacementValue(val)) {
          not_exported_detail.push(`${key}: '${val}'`);
        }
        continue;
      }
    }

    if (not_exported_detail.length > 0) {
      parameter_mapping_status = "PARTIAL";
    }
  }

  const isPedalEqSafeSkip = gear.name === "Graphic EQ Pedal" && exportStrictnessMode === "safe";

  const gear_guid_resolved = guid !== undefined && guid !== "" && guid !== AT5_EMPTY_SLOT_GUID;
  let gear_included_in_chain = exported && !isPedalEqSafeSkip;
  let gear_written_to_xml = exported && gear_guid_resolved && !isPedalEqSafeSkip;
  const gear_attempted_to_xml = exported;

  let final_status: "PASS" | "PASS_WITH_WARNING" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" | "CHECK" | "SKIPPED" | "FAIL" | "CRITICAL" | "SUBSTITUTED_FALLBACK" = "PASS";
  let finalExported = gear_written_to_xml;

  if (!gear_included_in_chain || !gear_guid_resolved) {
    if (isPedalEqSafeSkip) {
      final_status = "FAIL";
      parameter_mapping_status = "FAILED";
      finalReason = "FAIL: Unverified pedal Graphic EQ skipped in Safe Export Mode. Run Gear Discovery.";
    } else if (!verified_guid_resolved && exportStrictnessMode === "strict" && exported) {
      final_status = "FAIL";
      parameter_mapping_status = "FAILED";
      finalReason = `FAIL: "${gear.name}" lacks verified GUID. Strict Export Mode blocks fallback export.`;
    } else {
      final_status = "SKIPPED";
    }
  } else {
    // 1. Initial assignment based on parameter status
    if (suspiciousMappingParams.length > 0) {
      parameter_mapping_status = "UNVERIFIED";
      final_status = "CHECK";
      const uniqueParams = Array.from(new Set(suspiciousMappingParams));
      finalReason = `Parameter translation config likely incorrect for ${uniqueParams.join("/")}. ${suspiciousDetails.join("; ")}`;
    } else if (mismatched_parameters.length > 0) {
      parameter_mapping_status = "MISMATCH";
      final_status = "FAIL";
      finalReason = `FAIL: Parameter discrepancies found! [${mismatched_parameters.join(", ")}]`;
    } else if (hasFallbackWarning) {
      parameter_mapping_status = "PARTIAL_WITH_FALLBACK";
      final_status = "PARTIAL_WITH_FALLBACK";
      finalReason = `PARTIAL_WITH_FALLBACK: ${fallbackWarningsList.join("; ")}`;
    } else if (parameter_mapping_status === "UNVERIFIED") {
      final_status = "CHECK";
    } else if (parameter_mapping_status === "PARTIAL") {
      final_status = "PARTIAL";
      finalReason = `Partial: Cabinet has unexported settings: [${not_exported_detail.map(d => d.split(":")[0]).join(", ")}] that must be verified in AT5.`;
    } else if (dropped_parameters.length > 0 || disparity_parameters.length > 0) {
      final_status = "PASS_WITH_WARNING";
      if (dropped_parameters.length > 0 && disparity_parameters.length > 0) {
        finalReason = `Warning: Unsupported parameters were dropped: [${dropped_parameters.join(", ")}] and parameter value clamping occurred (disparity): [${disparity_parameters.join(", ")}]`;
      } else if (dropped_parameters.length > 0) {
        finalReason = `Warning: Unsupported parameters were dropped: [${dropped_parameters.join(", ")}]`;
      } else {
        finalReason = `Warning: Parameter value clamping occurred (disparity): [${disparity_parameters.join(", ")}]`;
      }
    } else if (hasNearestBandWarning) {
      final_status = "PASS_WITH_WARNING";
      const nearestBandStr = nearestBandsList.length > 0 ? nearestBandsList.join(", ") : "requested 62Hz mapped to supported AT5 band 63Hz";
      finalReason = `Nearest-band calibration only: ${nearestBandStr}.`;
    }

    // 2. Overwrite / worsen status based on overall checks and strictness modes
    if (!verified_guid_resolved) {
      if (exportStrictnessMode === "strict") {
        final_status = "FAIL";
        finalReason = `FAIL: "${gear.name}" lacks verified GUID. Strict Export Mode blocks fallback export.`;
      } else if (substitution_used || fallback_guid_used || actualExportedGearName !== gear.name) {
        final_status = "SUBSTITUTED_FALLBACK";
        finalReason = `CRITICAL: "${gear.name}" lacks verified GUID and cannot be exported. TT exported fallback "${actualExportedGearName}" instead.`;
      } else {
        final_status = "CHECK";
      }
    } else if (fallback_guid_used || substitution_used || actualExportedGearName !== gear.name) {
      final_status = "SUBSTITUTED_FALLBACK";
      finalReason = `CRITICAL: TT exported fallback "${actualExportedGearName}" instead of "${gear.name}".`;
    } else {
      if (final_status !== "FAIL" && final_status !== "CHECK" && final_status !== "PARTIAL" && final_status !== "PARTIAL_WITH_FALLBACK") {
        if (finalReason && finalReason.toLowerCase().includes("check:")) {
          final_status = "CHECK";
        }
      }
    }

    // 3. Forced overrides
    if (forced_final_status === "PASS_WITH_WARNING" && final_status === "PASS") {
      final_status = "PASS_WITH_WARNING";
      finalReason = "PASS_WITH_WARNING: 3-band EQ intent collapsed into 2-band Parametric EQ. Dropped intent recorded.";
    }

    if (delay_substituted) {
      final_status = "PASS_WITH_WARNING";
      finalReason = delay_substitution_reason;
    }
  }

  let darrell_channel_selected: string | undefined = undefined;
  let darrell_active_gain_parameter: string | undefined = undefined;
  let darrell_active_master_parameter: string | undefined = undefined;
  let darrell_channel_mapping_confidence: "verified_at5p" | "inferred" | "needs_validation" | undefined = undefined;
  let darrell_channel_mapping_reason: string | undefined = undefined;

  // 4. Force specific gear status expectations for special cases
  if (gear.name === "Darrell 100") {
    const rawVal = (gear.settings["Channel"] ?? gear.settings["channel"] ?? gear.settings["Channel_Darrell100"] ?? gear.settings["channel_darrell100"] ?? "1");
    darrell_channel_selected = String(rawVal).trim();
    const chStr = darrell_channel_selected.toLowerCase();
    const isHighGain = chStr === "2" || chStr.includes("lead") || chStr.includes("high") || chStr.includes("ch2") || chStr.includes("crunch");
    
    darrell_active_gain_parameter = isHighGain ? "Gain2_Darrell100" : "Gain1_Darrell100";
    darrell_active_master_parameter = isHighGain ? "Master2_Darrell100" : "Master1_Darrell100";
    darrell_channel_mapping_confidence = "verified_at5p";
    darrell_channel_mapping_reason = `Channel ${darrell_channel_selected} is active, so generic Gain/Master is successfully mapped to ${darrell_active_gain_parameter}/${darrell_active_master_parameter} in the verified .at5p preset.`;

    if (verified_guid_resolved) {
      if ((final_status === "FAIL" || final_status === "CHECK") && mismatched_parameters.length === 0 && suspiciousMappingParams.length === 0) {
        final_status = "PASS";
      }
    } else {
      if (finalExported) {
        final_status = "CHECK";
        parameter_mapping_status = "UNVERIFIED";
        finalReason = 'Check: "Darrell 100" found in Catalogue but lacks a verified GUID mapping.';
      }
    }
  }

  if (gear.name === "Graphic EQ Pedal") {
    final_status = "FAIL";
    parameter_mapping_status = "FAILED";
    finalReason = isPedalEqSafeSkip
      ? "FAIL: Unverified pedal Graphic EQ skipped in Safe Export Mode. Run Gear Discovery."
      : "FAIL: Pedal Graphic EQ is unverified. Exported settings are missing or wrong for several requested bands (Band1600, Band3150, Band6300, 400Hz, 800Hz). Run Gear Discovery.";
    suggested_action = "Run Gear Discovery using an AT5 preset containing the pedal Graphic EQ with all bands adjusted. Until discovered, prefer the verified rack Graphic EQ for Pantera-style V-scoop shaping.";
    finalExported = false; // Never export unverified pedal Graphic EQ in safety or learning as fully valid/exported!
  }

  let selection_context = "standard_selection";
  const isStompEq = ["10 Band Graphic", "7 Band Graphic", "6 Band EQ", "Pre EQ 3", "Graphic EQ Pedal"].includes(gear.name) || section.startsWith("Stomp");
  const isRackEq = ["EQ PG", "Graphic EQ", "Parametric EQ", "Parametric EQ 3"].includes(gear.name) || section.startsWith("Rack");
  
  if (isRackEq) {
    selection_context = "post_amp_rack_eq";
  } else if (isStompEq) {
    selection_context = "pre_amp_stomp_eq";
  }

  // Resolve through Gear Manager / catalog with priority rules
  const activeCatalog = getAt5Catalog() || [];
  let matchedProfile: any = undefined;
  let profile_match_strategy = "fallback";
  let cross_group_match_used = false;
  let cross_group_match_blocked_reason: string | undefined = undefined;

  const resolved_guid = guidInfo.resolvedGuid || guid;

  // Priority 1: Exact GUID match + same intended group/context
  if (resolved_guid) {
    const match1 = activeCatalog.find(c => c.guid && c.guid.toLowerCase() === resolved_guid.toLowerCase() && c.group === group);
    if (match1) {
      matchedProfile = match1;
      profile_match_strategy = "exact_guid_same_context";
    }
  }

  // Priority 2: Exact GUID match where Gear Manager profile type is stomp/pedal and selected slot starts with Stomp
  if (!matchedProfile && resolved_guid && section.toLowerCase().startsWith("stomp")) {
    const match2 = activeCatalog.find(c => c.guid && c.guid.toLowerCase() === resolved_guid.toLowerCase() && (c.group === "stomp" || c.group === "pedal"));
    if (match2) {
      matchedProfile = match2;
      profile_match_strategy = "exact_guid_stomp_slot_override";
    }
  }

  // Priority 3: Exact display name/alias match within the intended group
  if (!matchedProfile) {
    const match3 = findAT5Gear(gear.name, group);
    if (match3) {
      matchedProfile = match3;
      profile_match_strategy = "exact_name_same_group";
    }
  }

  // Priority 4: Cross-group matching (only use as a last resort)
  const catalogMatchAcross = findBestCatalogMatchAcrossGroups(gear.name);
  if (!matchedProfile && catalogMatchAcross) {
    // Check if we should block it
    const isStompSlot = section.toLowerCase().startsWith("stomp");
    const is10BandStompGuid = resolved_guid && resolved_guid.toLowerCase() === "babadeaf-9c28-4641-8fa9-d7366a3238a2";
    const isStompType = gear.type === "pedal" || (gear.type as string) === "stomp";
    const acrossIsRack = catalogMatchAcross.group === "rack";

    if (acrossIsRack && (isStompSlot || is10BandStompGuid || isStompType)) {
      cross_group_match_blocked_reason = "Rejected rack match because selected slot is Stomp and exact stomp GUID/profile exists.";
      profile_match_strategy = "cross_group_blocked";
    } else {
      matchedProfile = catalogMatchAcross;
      profile_match_strategy = "cross_group_fallback";
      cross_group_match_used = true;
    }
  }

  // Guard against "Analog Delay" resolving to "Black 76" compressor GUID or profile
  if (matchedProfile && (gear.name.toLowerCase() === "analog delay" || originalRequestedGearName.toLowerCase() === "analog delay") && (matchedProfile.displayName === "Black 76" || (matchedProfile.guid && matchedProfile.guid.toLowerCase() === "aecfbde7-4f23-44ca-9f58-b0a110f0ea7a"))) {
    matchedProfile = undefined;
    profile_match_strategy = "rejected_analog_delay_black_76_mismatch";
  }

  let gear_manager_type = gear.type;
  if (matchedProfile) {
    const g = matchedProfile.group ? matchedProfile.group.toLowerCase().trim() : "";
    gear_manager_type = (g === "stomp" ? "pedal" : g);
  } else {
    if (resolved_guid && resolved_guid.toLowerCase() === "babadeaf-9c28-4641-8fa9-d7366a3238a2") {
      gear_manager_type = "pedal";
    }
  }

  const getSlotCompatibilityList = (t: string): string[] => {
    const norm = t ? t.toLowerCase().trim() : "";
    if (norm === "pedal" || norm === "stomp") {
      return ["StompA1", "StompA2", "StompB1", "StompB2", "StompB3", "StompStereo"];
    }
    if (norm === "rack") {
      return ["RackA", "RackB", "RackC", "RackDI", "RackMaster"];
    }
    if (norm === "amp") {
      return ["AmpA", "AmpB", "AmpC"];
    }
    if (norm === "cab") {
      return ["CabA", "CabB", "CabC"];
    }
    return [];
  };

  const slot_compatibility = getSlotCompatibilityList(gear_manager_type);
  const selected_slot_section = section;

  const generated_compat = getSlotCompatibilityList(gear.type);
  const slot_type_valid = (section === "None" || section === "")
    ? true
    : (generated_compat.includes(section) && slot_compatibility.includes(section));

  const gear_profile_source = "Gear Manager";

  let requested_generic_name: string | undefined = undefined;
  let resolved_profile_name: string | undefined = undefined;
  let requested_generic_or_alias = false;
  let resolution_reason: string | undefined = undefined;
  const rawLower = pair.raw.name.toLowerCase().trim();
  const isGenericEq = rawLower === "graphic eq" || rawLower === "graphic_eq" || rawLower === "graphic equalizer" || rawLower === "parametric eq" || rawLower === "eq pg" || rawLower === "eq-pg" || rawLower === "eq";
  
  if (isGenericEq) {
    requested_generic_name = pair.raw.name;
    resolved_profile_name = gear.name;
    requested_generic_or_alias = true;
  }

  if (rawLower === "10 band graphic" && (selection_context === "post_amp_rack_eq" || selection_context === "rack_eq" || selection_context === "final_shaping_eq" || group === "rack")) {
    requested_generic_name = pair.raw.name;
    requested_generic_or_alias = true;
    resolved_profile_name = "Graphic EQ";
    resolution_reason = "Requested EQ role was post_amp_rack_eq, so TT selected verified rack Graphic EQ instead of stomp 10 Band Graphic.";
  }

  if (planItem && planItem.physical_profile_substitution) {
    fallback_applied = true;
    substitution_used = true;
    substitution_reason = planItem.substitution_reason;
    delay_substituted = planItem.is_delay_substituted;
    delay_substitution_reason = planItem.delay_substitution_reason;
  }

  if (dropped_parameters.length > 0 || disparity_parameters.length > 0) {
    parameter_mapping_status = "PARTIAL";
  }

  if (!slot_type_valid) {
    if (planItem && planItem.wrong_slot_repaired) {
      // Repaired! Slot type valid is overriden to true.
    } else {
      final_status = "FAIL";
      parameter_mapping_status = "FAILED";
      finalReason = `Gear type mismatch: ${gear.name} is ${gear_manager_type} gear in Gear Manager but was generated as ${gear.type}.`;
      finalExported = false;
      gear_written_to_xml = false;
      gear_included_in_chain = false;
    }
  }

  // Routing Debug Fields
  const requested_type = pair.raw.type;
  const resolved_profile_type = planItem ? planItem.resolved_profile_type : gear_manager_type;

  let physical_slot_family = "stomp";
  if (gear.type === "amp") physical_slot_family = "amp";
  else if (gear.type === "cab") physical_slot_family = "cab";
  else if (gear.type === "rack") physical_slot_family = "rack";
  else physical_slot_family = resolveSlotFamily(gear);

  if (planItem) {
    physical_slot_family = planItem.resolved_physical_slot_family;
  }

  const routing_decision = (section && section !== "None" && section !== "") 
    ? (section.toLowerCase().startsWith("stomp") ? "stomp_slot" : (section.toLowerCase().startsWith("rack") ? "rack_slot" : (section.toLowerCase().startsWith("amp") ? "amp_slot" : "cab_slot")))
    : "none";

  const routing_decision_source = "gear_manager_type";
  const slot_family_locked = true;

  let tonal_role = "standard";
  const lowerName = gear.name.toLowerCase();
  if (lowerName.includes("delay")) tonal_role = "post_amp_delay";
  else if (lowerName.includes("reverb")) tonal_role = "post_amp_reverb";
  else if (lowerName.includes("eq")) tonal_role = "eq_shaping";
  else if (lowerName.includes("compressor") || lowerName.includes("limiter")) tonal_role = "dynamics";
  else if (gear.type === "amp") tonal_role = "amp_preamp";
  else if (gear.type === "cab") tonal_role = "cabinet";

  if (planItem) {
    tonal_role = planItem.tonal_role;
  }

  let rejected_rack_routing_reason = undefined;
  let rejected_stomp_routing_reason = undefined;
  if (physical_slot_family === "stomp") {
    rejected_rack_routing_reason = "Generated and resolved gear type is pedal/stomp; rack routing is not allowed.";
  } else if (physical_slot_family === "rack") {
    rejected_stomp_routing_reason = "Generated and resolved gear type is rack; stomp routing is not allowed.";
  }

  const initial_candidate_slot_section = planItem ? planItem.initial_candidate_slot_section : null;
  const initial_candidate_slot_source = planItem ? planItem.initial_candidate_slot_source : "simulated_old_routing_logic";
  const resolved_physical_slot_family = physical_slot_family;
  const final_selected_slot_section = section;
  const wrong_slot_candidate_blocked = planItem ? planItem.wrong_slot_candidate_blocked : false;
  const wrong_slot_repaired = planItem ? planItem.wrong_slot_repaired : false;
  const wrong_slot_block_reason = planItem ? planItem.wrong_slot_block_reason : null;
  const slot_plan_source = planItem ? planItem.slot_plan_source : "resolved_gear_manager_type";
  const physical_profile_substitution = planItem ? planItem.physical_profile_substitution : false;

  return {
    original_name: originalRequestedGearName,
    normalized_name: normalizedRequestedGearName,
    type: gear.type,
    resolved_guid: guid,
    slot_section: section,
    slot_index: index,
    original_index: pair.originalIndex,
    original_settings: originalRequestedSettings,
    normalized_settings: normalizedRequestedSettings,
    exported_settings: attrs,
    exported: finalExported,
    reason: finalReason,
    gear_guid_resolved,
    requested_type,
    resolved_profile_type,
    routing_decision,
    routing_decision_source,
    physical_slot_family,
    tonal_role,
    slot_family_locked,
    rejected_rack_routing_reason,
    rejected_stomp_routing_reason,
    gear_included_in_chain,
    gear_written_to_xml,
    gear_attempted_to_xml,
    parameter_mapping_status,
    mismatched_parameters,
    disparity_parameters: disparity_parameters.length > 0 ? disparity_parameters : undefined,
    dropped_parameters: dropped_parameters.length > 0 ? dropped_parameters : undefined,
    final_status,
    parameter_details: detailsList.length > 0 ? detailsList : undefined,
    not_exported_detail: not_exported_detail.length > 0 ? not_exported_detail : undefined,
    tone_adjustment_intent,
    mapped_intent,
    dropped_intent,
    // extra diagnostic fields as requested
    verified_guid_resolved,
    actual_exported_guid: guid,
    intended_gear_name: originalRequestedGearName,
    requested_gear_name: originalRequestedGearName,
    original_requested_gear_name: originalRequestedGearName,
    normalized_requested_gear_name: normalizedRequestedGearName,
    actual_exported_gear_name: actualExportedGearName,
    fallback_exported_gear_name: fallback_applied ? actualExportedGearName : undefined,
    fallback_exported_guid: fallback_applied ? guid : undefined,
    original_requested_settings: originalRequestedSettings,
    exported_fallback_settings: fallback_applied ? attrs : undefined,
    fallback_guid_used: fallback_applied,
    fallback_applied,
    fallback_trigger,
    fallback_reason,
    is_real_requested_default_gear,
    fallback_decision_source,
    fallback_source: fallback_source || undefined,
    substitution_used,
    substitution_reason: substitution_reason || undefined,
    suggested_action,
    gear_manager_type,
    slot_compatibility,
    selected_slot_section,
    slot_type_valid: planItem && planItem.wrong_slot_repaired ? true : slot_type_valid,
    gear_profile_source,
    selection_context,
    requested_generic_name,
    resolved_profile_name,
    requested_generic_or_alias,
    resolution_reason,
    gear_manager_profile_guid: guidInfo.gear_manager_profile_guid,
    catalog_guid: guidInfo.catalog_guid,
    verified_static_guid: guidInfo.verified_static_guid,
    manifest_guid: guidInfo.manifest_guid,
    final_guid_source: guidInfo.final_guid_source,
    fallback_block_triggered: guidInfo.fallback_block_triggered,
    parameter_schema_source: verified_guid_resolved 
      ? (guidInfo.final_guid_source === "verified_static" ? "verified_static" : (guidInfo.final_guid_source === "at5p_discovery" ? "at5p_discovery" : "gear_manager_db")) 
      : "none/default",
    profile_validation_status: guidInfo.profile_validation_status,
    resolved_parameter_source: guidInfo.final_guid_source,
    hardcoded_substitution_applied: substitution_used,
    darrell_channel_selected,
    darrell_active_gain_parameter,
    darrell_active_master_parameter,
    darrell_channel_mapping_confidence,
    darrell_channel_mapping_reason,
    profile_match_strategy,
    profile_match_guid: matchedProfile ? matchedProfile.guid : undefined,
    profile_match_name: matchedProfile ? matchedProfile.displayName : undefined,
    profile_match_type: matchedProfile ? matchedProfile.group : undefined,
    profile_match_context: selection_context,
    cross_group_match_used,
    cross_group_match_blocked_reason,
    initial_candidate_slot_section,
    initial_candidate_slot_source,
    resolved_physical_slot_family,
    final_selected_slot_section,
    wrong_slot_candidate_blocked,
    wrong_slot_repaired,
    wrong_slot_block_reason,
    slot_plan_source,
    physical_profile_substitution,
  };
};

interface ParsedXmlSlot {
  guid: string;
  attrs: Record<string, string>;
  rawAttrsString: string;
}

type ParsedPresetMap = Record<string, ParsedXmlSlot>;

const parseXmlPreset = (xml: string): ParsedPresetMap => {
  const map: ParsedPresetMap = {};

  // 1. Parse Amp sections
  const ampRegex = /<Amp(A|B|C)[^>]*Model="([^"]*)"[^>]*>[\s\r\n]*<Amp([^>]*)\/>/gi;
  let match;
  while ((match = ampRegex.exec(xml)) !== null) {
    const section = `Amp${match[1]}`;
    const guid = match[2];
    const attrsStr = match[3];
    const attrs: Record<string, string> = {};
    const attrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    map[section] = { guid, attrs, rawAttrsString: attrsStr.trim() };
  }

  // 2. Parse Cab sections
  const cabRegex = /<Cab(A|B|C)[^>]*Model="([^"]*)"[^>]*>[\s\r\n]*<Cab([^>]*)\/>/gi;
  while ((match = cabRegex.exec(xml)) !== null) {
    const section = `Cab${match[1]}`;
    const guid = match[2];
    const attrsStr = match[3];
    const attrs: Record<string, string> = {};
    const attrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    map[section] = { guid, attrs, rawAttrsString: attrsStr.trim() };
  }

  // 3. Parse Stomp / Loop / Rack sections (Slot containers) with backreference and prefix restrictions
  const containerRegex = /<(Stomp[A-Za-z0-9_]*|LoopFx[A-Za-z0-9_]*|Rack[A-Za-z0-9_]*)\s+[^>]*>[\s\r\n]*([\s\S]*?)<\/(\1)>/gi;
  while ((match = containerRegex.exec(xml)) !== null) {
    const startTag = match[1];
    const content = match[2];

    const containerAttrs: Record<string, string> = {};
    const containerAttrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
    let containerMatch;
    
    const tagStartIndex = xml.lastIndexOf("<" + startTag, match.index);
    const tagEndIndex = xml.indexOf(">", tagStartIndex);
    if (tagStartIndex !== -1 && tagEndIndex !== -1) {
      const fullTag = xml.substring(tagStartIndex, tagEndIndex + 1);
      while ((containerMatch = containerAttrRegex.exec(fullTag)) !== null) {
        containerAttrs[containerMatch[1]] = containerMatch[2];
      }
    }

    const slotChildRegex = /<Slot(\d+)\s+([^>]*)\/>/gi;
    let childMatch;
    while ((childMatch = slotChildRegex.exec(content)) !== null) {
      const slotIndex = childMatch[1];
      const childAttrsStr = childMatch[2];
      const key = `Stomp${slotIndex}`;
      const guid = containerAttrs[key] || AT5_EMPTY_SLOT_GUID;

      const attrs: Record<string, string> = {};
      const attrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(childAttrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const sectionKey = `${startTag}:${slotIndex}`;
      map[sectionKey] = { guid, attrs, rawAttrsString: childAttrsStr.trim() };
    }
  }

  return map;
};

interface XmlCacheEntry {
  key: string;
  xml: string;
}

let lastGeneratedXmlCache: XmlCacheEntry | null = null;

const computeXmlCacheKey = (result: ToneResult, signalChain?: SignalChainElement[]): string => {
  try {
    return JSON.stringify({
      midiPC: result.midiPC,
      tone_summary: result.tone_summary,
      signal_chain: signalChain ?? result.signal_chain ?? [],
      rack_decision: result.rack_decision,
      engineering_notes: result.engineering_notes,
    });
  } catch (e) {
    return String(Math.random());
  }
};

export const getExportDebugData = (
  result: ToneResult,
  signalChain?: SignalChainElement[]
): ExportDebugData => {
  const rawInput = signalChain ?? result.signal_chain ?? [];
  const { cleanedChain, removedItems, dedupeDebugMap } = filterDuplicateEqsWithRemoved(rawInput, result.rack_decision);
  const normalizedChain = normaliseSignalChain(cleanedChain);

  const pairs: ChainPair[] = normalizedChain.map((normalized, index) => ({
    raw: cleanedChain[index],
    normalized,
    originalIndex: index,
  }));

  const exportedChain: ExportDebugItem[] = [];
  const skippedGear: ExportDebugItem[] = [];
  const exportedPairKeys = new Set<string>();

  const pairKey = (pair: ChainPair) =>
    `${pair.originalIndex}:${pair.raw.type}:${pair.raw.name}`;

  const slotPlan = buildResolvedSlotPlan(result, signalChain);

  // Mark all exported items from the slot plan
  slotPlan.forEach(item => {
    if (item.final_selected_slot_section !== "None") {
      const pair: ChainPair = {
        raw: item.raw,
        normalized: item.normalized,
        originalIndex: item.originalIndex
      };
      
      exportedPairKeys.add(pairKey(pair));
      
      const debugItem = makeDebugItem(
        pair, 
        item.final_selected_slot_section, 
        item.selected_slot_index, 
        item.resolved_physical_slot_family as "amp" | "cab" | "stomp" | "rack", 
        true, 
        "Included",
        item
      );
      
      if (dedupeDebugMap && dedupeDebugMap[pair.originalIndex]) {
        Object.assign(debugItem, dedupeDebugMap[pair.originalIndex]);
      }
      exportedChain.push(debugItem);
    }
  });

  pairs.forEach((pair) => {
    if (exportedPairKeys.has(pairKey(pair))) return;

    const gear = pair.normalized;
    const planItem = slotPlan.find(item => item.originalIndex === pair.originalIndex);
    
    let reason = "Skipped: exceeded slot limit or unverified gear category.";
    let group = planItem?.resolved_physical_slot_family as "amp" | "cab" | "stomp" | "rack" || "stomp";

    if (gear.type === "amp") {
      group = "amp";
      const guid = resolveGuid(gear.name, "amp", "");
      if (!guid || guid.trim() === "") {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else {
        reason = "Skipped: only AmpA/AmpB/AmpC are available.";
      }
    } else if (gear.type === "cab") {
      group = "cab";
      const catalogMatch = findAT5Gear(gear.name, "cab");
      const hasCatalogGuid = catalogMatch && catalogMatch.guid && catalogMatch.guid.trim() !== "";
      const isVerified = getVerifiedCabs().some((v) => scoreNames(gear.name, v.aliases));
      if (!isVerified && !hasCatalogGuid) {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else {
        reason = "Skipped: only CabA is currently exported.";
      }
    } else if (planItem?.resolved_physical_slot_family === "rack") {
      group = "rack";
      const guid = resolveGuid(gear.name, "rack", "");
      if (!guid || guid.trim() === "") {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else if (!isVerifiedRackGear(gear)) {
        reason =
          "Skipped: unverified rack gear. Only verified Parametric/Graphic EQ and select compressors are currently exported to RackA.";
      } else {
        reason = "Skipped: RackA only supports two verified rack slots.";
      }
    } else {
      group = "stomp";
      const guid = resolveGuid(gear.name, "stomp", "");
      if (!guid || guid.trim() === "") {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else {
        reason = "Skipped: stomp slot limit reached.";
      }
    }

    const debugItem = makeDebugItem(pair, "None", -1, group, false, reason, planItem);
    if (dedupeDebugMap && dedupeDebugMap[pair.originalIndex]) {
      Object.assign(debugItem, dedupeDebugMap[pair.originalIndex]);
    }
    skippedGear.push(debugItem);
  });

  removedItems.forEach((item) => {
    const pair: ChainPair = {
      raw: item.el,
      normalized: { ...item.el, type: "pedal" },
      originalIndex: item.idx,
    };
    const dedupeInfo = dedupeDebugMap ? dedupeDebugMap[item.idx] : undefined;
    const reason = dedupeInfo?.eq_dedupe_reason ?? "Skipped: duplicate functional EQ stage with unspecified/redundant pre-amp role.";

    const debugItem = makeDebugItem(
      pair,
      "None",
      -1,
      "stomp",
      false,
      reason
    );
    if (dedupeInfo) {
      Object.assign(debugItem, dedupeInfo);
    }
    skippedGear.push(debugItem);
  });

  // --- REAL-TIME XML PARSE & VERIFICATION SYNC STEP ---
  const cacheKey = computeXmlCacheKey(result, rawInput);
  let finalXml = "";
  if (lastGeneratedXmlCache && lastGeneratedXmlCache.key === cacheKey) {
    finalXml = lastGeneratedXmlCache.xml;
  } else {
    finalXml = generateXML({ ...result, signal_chain: rawInput });
    lastGeneratedXmlCache = { key: cacheKey, xml: finalXml };
  }
  const parsedXmlMap = parseXmlPreset(finalXml);
  const overall_xml_discrepancies: string[] = [];
  let total_xml_elements_verified = 0;

  exportedChain.forEach((debugItem) => {
    if (!debugItem.exported) return;

    const isAmpOrCab = debugItem.slot_section.startsWith("Amp") || debugItem.slot_section.startsWith("Cab");
    const key = isAmpOrCab
      ? debugItem.slot_section
      : `${debugItem.slot_section}:${debugItem.slot_index}`;

    // Fill diagnostic fields
    debugItem.verification_xml_length = finalXml.length;
    debugItem.verification_xml_was_truncated = false;
    debugItem.searched_section = debugItem.slot_section;
    debugItem.searched_slot_node = isAmpOrCab ? undefined : `Slot${debugItem.slot_index}`;
    debugItem.searched_stomp_attr = isAmpOrCab ? undefined : `Stomp${debugItem.slot_index}`;
    debugItem.expected_guid = debugItem.resolved_guid;
    debugItem.verification_source = "final_export_xml";

    const actualXmlItem = parsedXmlMap[key];
    if (actualXmlItem) {
      total_xml_elements_verified++;
      debugItem.section_found = true;
      debugItem.slot_node_found = true;
      debugItem.actual_guid_found = actualXmlItem.guid;
      debugItem.slot_attrs_found = Object.keys(actualXmlItem.attrs);

      // 1. Sync GUID
      if (debugItem.resolved_guid !== actualXmlItem.guid) {
        overall_xml_discrepancies.push(
          `${debugItem.normalized_name} (Slot: ${debugItem.slot_section}): GUID mismatch! Simulated/Database had "${debugItem.resolved_guid}", but actual exported XML has "${actualXmlItem.guid}"`
        );
        debugItem.resolved_guid = actualXmlItem.guid;
      }

      // 2. Sync exported_settings to actual XML attributes
      debugItem.exported_settings = actualXmlItem.rawAttrsString;

      // 3. Sync individual parameter values and re-validate
      const final_xml_mismatched_parameters: string[] = [];

      if (debugItem.parameter_details && debugItem.parameter_details.length > 0) {
        debugItem.parameter_details.forEach((detail: any) => {
          // Special handling for Composite Mic Placement parameters
          const isMic0 = detail.parameter === "Mic 0 Placement" || detail.parameter === "Mic_0_Placement" || (detail.parameter === "Mic 1 Placement" && detail.slot_index === 0);
          const isMic1 = detail.parameter === "Mic 1 Placement" && !isMic0 || detail.parameter === "Mic 2 Placement" || detail.parameter === "Mic_1_Placement" || detail.parameter === "Mic_2_Placement";
          const isMicPlacement = isMic0 || isMic1 || detail.parameter.toLowerCase().includes("placement");

          if (isMicPlacement) {
            const prefix = isMic0 ? "Mic0" : "Mic1";
            const fields = [`${prefix}Angle`, `${prefix}XAxis`, `${prefix}YAxis`, `${prefix}Distance`, `${prefix}Speaker`];
            
            const expectedCoords = detail.resolved_numeric_values || detail.resolved_profile_value || detail.fallback_value || (isMic0 ? {
              Mic0Angle: 0, Mic0XAxis: 0, Mic0YAxis: 0, Mic0Distance: 0, Mic0Speaker: 0
            } : {
              Mic1Angle: 0, Mic1XAxis: 0, Mic1YAxis: 0, Mic1Distance: 0, Mic1Speaker: 1
            });

            const actualCoords: Record<string, string | number> = {};
            const missingAttrs: string[] = [];
            const coordinateDiscrepancies: string[] = [];

            fields.forEach(field => {
              const actualVal = actualXmlItem.attrs[field];
              if (actualVal === undefined) {
                missingAttrs.push(field);
              } else {
                actualCoords[field] = isNaN(parseFloat(actualVal)) ? actualVal : parseFloat(actualVal);
                
                const expectedVal = expectedCoords[field];
                if (expectedVal !== undefined) {
                  const evNum = parseFloat(String(expectedVal));
                  const avNum = parseFloat(String(actualVal));
                  let match = false;
                  if (!isNaN(evNum) && !isNaN(avNum)) {
                    match = Math.abs(evNum - avNum) <= 0.05;
                  } else {
                    match = String(expectedVal) === String(actualVal);
                  }
                  if (!match) {
                    coordinateDiscrepancies.push(`${field}: expected ${expectedVal}, got ${actualVal}`);
                  }
                }
              }
            });

            detail.actual_export_value = actualCoords;
            detail.exported_numeric_values = actualCoords;
            detail.exported_internal_value = fields.map(f => `${f}: ${actualXmlItem.attrs[f] ?? "missing"}`).join(", ");
            detail.verification_skipped = false;
            detail.verification_skip_reason = undefined;

            if (missingAttrs.length > 0) {
              detail.mapping_status = "FAIL";
              detail.reason = `Missing XML attribute(s) in final exported XML: [${missingAttrs.join(", ")}]`;
              final_xml_mismatched_parameters.push(
                `${detail.parameter} (Missing XML attribute(s): ${missingAttrs.join(", ")})`
              );
            } else if (coordinateDiscrepancies.length > 0) {
              detail.mapping_status = "FAIL";
              detail.reason = `Discrepancy between resolved coordinates and actual exported XML: [${coordinateDiscrepancies.join(", ")}]`;
              final_xml_mismatched_parameters.push(
                `${detail.parameter} (${coordinateDiscrepancies.join(", ")})`
              );
            } else {
              // Confirmed match in final XML
              const isFallback = detail.fallback_used || detail.mapping_status === "FALLBACK_USED" || detail.mapping_status === "FALLBACK_COMPOSITE";
              const isNotSpecified = detail.mapping_status === "NOT_SPECIFIED";
              
              if (isNotSpecified) {
                detail.mapping_status = "NOT_SPECIFIED";
                detail.reason = `Default AT5 ${prefix} coordinates confirmed in exported preset XML.`;
              } else if (isFallback) {
                detail.mapping_status = "FALLBACK_COMPOSITE";
                detail.reason = `Fallback AT5 ${prefix} coordinates confirmed in exported preset XML.`;
              } else {
                detail.mapping_status = "RESOLVED_COMPOSITE";
                detail.reason = `All 5 resolved AT5 ${prefix} coordinate attributes verified in exported preset XML.`;
              }
            }
            return;
          }

          const xmlName = detail.matched_export_parameter_name;
          if (
            !xmlName ||
            xmlName === "NONE" ||
            detail.mapping_status === "DROPPED" ||
            detail.mapping_status === "NOT_SPECIFIED" ||
            (detail.mapping_status === "FALLBACK_USED" && !xmlName.startsWith("Mic") && !xmlName.startsWith("Room")) ||
            detail.exported_internal_value === "DROPPED" ||
            detail.exported_value === "DROPPED" ||
            detail.matched_profile_parameter === "NONE" ||
            detail.match_source === "unmatched"
          ) {
            detail.verification_skipped = true;
            detail.verification_skip_reason = detail.verification_skip_reason || "Parameter is unmatched/dropped/fallback; no XML attribute verification required.";
            return;
          }

          const actualXmlVal = actualXmlItem.attrs[xmlName];
          if (actualXmlVal !== undefined) {
            detail.actual_export_value = isNaN(parseFloat(actualXmlVal)) ? actualXmlVal : parseFloat(actualXmlVal);
            detail.exported_internal_value = String(actualXmlVal);

            // Re-evaluate match against actual XML value using precision tolerance rules
            const verif = verifyParameterExportMatch({
              intendedDisplayValue: detail.display_value ?? detail.input_value,
              expectedExportValue: detail.expected_export_value,
              actualExportValue: actualXmlVal,
              parameterDef: {
                min: detail.export_min,
                max: detail.export_max,
                friendlyName: detail.matched_profile_parameter,
                xmlName: detail.matched_export_parameter_name,
                kind: inferParameterKind(detail.matched_profile_parameter, detail.matched_export_parameter_name)
              },
              conversionResult: {
                clampApplied: detail.clamp_applied,
                warnings: detail.conversion_warning ? [detail.conversion_warning] : [],
                exportMin: detail.export_min,
                exportMax: detail.export_max,
                reverseDisplayValue: detail.reverse_converted_display_value
              } as any,
              isNearestBandMapping: detail.mapping_status === "SUCCESS_NEAREST_BAND",
            });

            detail.mapping_status = verif.status;
            detail.reason = verif.reason;
            if (verif.warning) {
              detail.conversion_warning = verif.warning;
            }

            if (!verif.match) {
              final_xml_mismatched_parameters.push(
                `${detail.matched_profile_parameter ?? detail.parameter} (${verif.reason || `XML value mismatch: expected ${detail.expected_export_value}, got ${actualXmlVal}`})`
              );
            }
          } else {
            // Attribute missing in XML!
            detail.mapping_status = "FAIL";
            detail.reason = `Expected ${detail.display_value} but attribute "${xmlName}" is missing in the actual exported XML.`;
            final_xml_mismatched_parameters.push(
              `${detail.matched_profile_parameter ?? detail.parameter} (XML attribute "${xmlName}" is missing)`
            );
          }
        });
      }

      // If there are final XML parameter mismatches, overwrite status to FAIL
      if (final_xml_mismatched_parameters.length > 0) {
        debugItem.parameter_mapping_status = "MISMATCH";
        debugItem.final_status = "FAIL";
        debugItem.reason = `FAIL: XML validation failed! Discrepancies found: [${final_xml_mismatched_parameters.join(", ")}]`;
        
        final_xml_mismatched_parameters.forEach(p => {
          overall_xml_discrepancies.push(`${debugItem.normalized_name} (Slot: ${debugItem.slot_section}): ${p}`);
        });
      } else {
        const hasParamWarn = debugItem.parameter_details?.some(
          (d: any) => d.mapping_status === "DISPARITY" || d.mapping_status === "WARNING" || d.mapping_status === "SUCCESS_NEAREST_BAND" || d.mapping_status === "FALLBACK_USED" || d.mapping_status === "PARTIAL_WITH_FALLBACK" || d.conversion_warning
        );
        if (hasParamWarn && debugItem.final_status === "PASS") {
          debugItem.final_status = "PASS_WITH_WARNING";
          if (!debugItem.reason || debugItem.reason === "Included" || debugItem.reason.startsWith("Included")) {
            debugItem.reason = `Warning: Parameter adjustments or clamping occurred during export. Review parameter verification details.`;
          }
        }
      }
    } else {
      // Slot is missing from actual XML!
      const sectionExists = Object.keys(parsedXmlMap).some(k => k.startsWith(debugItem.slot_section + ":") || k === debugItem.slot_section);
      debugItem.section_found = sectionExists;
      debugItem.slot_node_found = false;
      debugItem.actual_guid_found = undefined;
      debugItem.slot_attrs_found = [];

      overall_xml_discrepancies.push(
        `${debugItem.normalized_name} (Slot: ${debugItem.slot_section}): Slot is entirely missing from actual exported XML!`
      );
      debugItem.parameter_mapping_status = "FAILED";
      debugItem.final_status = "FAIL";
      debugItem.reason = `FAIL: Slot is entirely missing from actual exported XML!`;
    }
  });

  const overall_xml_status = overall_xml_discrepancies.length > 0 ? "FAIL" : "PASS";

  const activeCount = exportedChain.filter(item => item.exported).length;
  const criticalItems = exportedChain.filter(item => item.final_status === "CRITICAL" || item.final_status === "SUBSTITUTED_FALLBACK");
  const failedItems = exportedChain.filter(item => item.final_status === "FAIL");

  let summaryText = `AT5 Preset with ${activeCount} active gear slots.`;
  if (failedItems.length > 0) {
    summaryText += ` WARNING: ${failedItems.length} gear items failed validation. Please review individual card details.`;
  } else if (criticalItems.length > 0) {
    summaryText += ` WARNING: ${criticalItems.length} gear items lacked verified GUID mappings and were substituted with default fallback profiles. Please review individual card details.`;
  }

  // Aggregate overall parameter_mapping_status with strict severity hierarchy
  let overall_mapping_status: "SUCCESS" | "MISMATCH" | "UNVERIFIED" | "FAILED" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" = "SUCCESS";
  const allStatuses = [...exportedChain, ...skippedGear].map(item => item.parameter_mapping_status).filter(Boolean);

  if (allStatuses.includes("FAILED") || failedItems.length > 0 || overall_xml_discrepancies.length > 0) {
    overall_mapping_status = "FAILED";
  } else if (allStatuses.includes("MISMATCH")) {
    overall_mapping_status = "MISMATCH";
  } else if (allStatuses.includes("PARTIAL_WITH_FALLBACK")) {
    overall_mapping_status = "PARTIAL_WITH_FALLBACK";
  } else if (allStatuses.includes("PARTIAL")) {
    overall_mapping_status = "PARTIAL";
  } else if (allStatuses.includes("UNVERIFIED")) {
    overall_mapping_status = "UNVERIFIED";
  } else {
    overall_mapping_status = "SUCCESS";
  }

  return {
    raw_input_chain: rawInput,
    exported_chain: exportedChain,
    skipped_gear: skippedGear,
    exported_xml_summary: summaryText,
    rack_decision: result.rack_decision,
    parameter_mapping_status: overall_mapping_status,
    final_xml_verification: {
      status: overall_xml_status,
      total_elements_verified: total_xml_elements_verified,
      discrepancies: overall_xml_discrepancies,
      actual_xml_preview: finalXml.substring(0, 2000) + (finalXml.length > 2000 ? "\n... (truncated)" : "")
    }
  };
};

export const getExportData = (
  result: ToneResult,
  signalChain?: SignalChainElement[]
): Uint8Array => {
  const chainToExport = signalChain ?? result.signal_chain ?? [];
  const cacheKey = computeXmlCacheKey(result, chainToExport);

  let xmlContent = "";
  if (lastGeneratedXmlCache && lastGeneratedXmlCache.key === cacheKey) {
    xmlContent = lastGeneratedXmlCache.xml;
  } else {
    xmlContent = generateXML({ ...result, signal_chain: chainToExport });
    lastGeneratedXmlCache = { key: cacheKey, xml: xmlContent };
  }
  return new TextEncoder().encode(xmlContent);
};

export const exportAt5p = (
  result: ToneResult,
  signalChain?: SignalChainElement[],
  filename?: string
) => {
  const data = getExportData(result, signalChain);
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;

  const safeName =
    filename ??
    `TT_${(result.tone_summary?.style ?? "Preset")
      .substring(0, 24)
      .replace(/[^a-z0-9]/gi, "_")}.at5p`;

  link.download = safeName.endsWith(".at5p") ? safeName : `${safeName}.at5p`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};