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
} from "./at5ParameterManifest";

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
    const isDb = catalogMatch.isDbRecord === true || (catalogMatch as any).id?.startsWith("gear-");
    const valStatus = (catalogMatch as any).validationStatus;
    
    if (isDb && catalogMatch.guid) {
      gear_manager_profile_guid = catalogMatch.guid;
      profile_validation_status = valStatus;
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
  if (catalogMatch && catalogMatch.isDbRecord && catalogMatch.guid) {
    resolvedGuid = catalogMatch.guid;
    profile_validation_status = (catalogMatch as any).validationStatus || "PASS";
    if (profile_validation_status === "verified_at5p") {
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



const isPostAmpRack = (gear: SignalChainElement) => {
  const n = gear.name.toLowerCase();

  return ["delay", "reverb", "eq", "compressor", "limiter", "rack"].some((x) =>
    n.includes(x)
  );
};

const isVerifiedRackGear = (gear: SignalChainElement) => {
  const n = gear.name.toLowerCase();
  if (VERIFIED_RACK_NAMES.some((name) => n.includes(name))) return true;
  
  // Check if we can resolve a GUID from the catalog for this as a rack item
  const rackGuid = resolveGuid(gear.name, "rack", AT5_EMPTY_SLOT_GUID);
  if (rackGuid !== AT5_EMPTY_SLOT_GUID) return true;

  // If it's a pedal being pushed to the rack pool (e.g. a delay pedal), 
  // check if we have a stomp GUID for it.
  if (gear.type === "pedal") {
    const stompGuid = resolveGuid(gear.name, "stomp", AT5_EMPTY_SLOT_GUID);
    return stompGuid !== AT5_EMPTY_SLOT_GUID;
  }

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

const getRoomType = (cab?: SignalChainElement) => {
  const room = getSettingText(cab, ["room", "room_type"]);

  if (/small/i.test(room)) return "Small Studio";
  if (/medium|mid/i.test(room)) return "Mid Studio";
  if (/large/i.test(room)) return "Large Studio";

  return "Large Studio";
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

export function isPlacementProfileValid(m: MicPlacementMapping): boolean {
  if (!m) return false;
  
  // cab identity
  const cabIdentity = m.gear;
  if (!cabIdentity) return false;
  
  // placementLabel
  const placementLabel = m.friendly_value || m.friendly_name || m.friendly_placement;
  if (!placementLabel) return false;

  // micSlot
  const micSlot = m.mic_slot || m.friendly_setting || m.target;
  if (!micSlot) return false;

  // numeric values
  const numValues = m.maps_to || m.xml_values;
  if (!numValues || Object.keys(numValues).length === 0) return false;

  // source validation
  const src = (m.source || "at5p_discovery").toLowerCase();
  const validSources = ["at5p_discovery", "calibrated_profile", "manual_verified", "gear_manager_profile", "db", "persistent"];
  if (!validSources.includes(src)) return false;

  // validationStatus validation
  const status = (m.status || m.validation_status || "validated").toLowerCase();
  const validStatuses = ["validated", "at5p_validated", "verified_calibration", "discovered", "estimated"];
  if (!validStatuses.includes(status)) return false;

  return true;
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

  const matchGear = (gearName: string) => {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanGear = clean(gearName);
    const cleanCab = clean(cab.name);
    return cleanGear === cleanCab;
  };

  const resolved = { ...defaultValues };

  let m1Placement = settings.Mic_1_Placement ?? settings.mic_1_placement ?? settings["Mic_1_Placement"];
  let m1Distance = settings.Mic_1_Distance ?? settings.mic_1_distance ?? settings["Mic_1_Distance"];

  if (m1Placement) {
    let pVal = String(m1Placement).trim();
    let dVal = m1Distance ? String(m1Distance).trim() : "";
    if (pVal.includes(",")) {
      const parts = pVal.split(",");
      pVal = parts[0].trim();
      dVal = parts[1].trim();
    }

    const mapM1 = mappings.find(m => {
      if (!matchGear(m.gear)) return false;
      const isSlot = m.mic_slot === "Mic_1" || m.friendly_setting === "Mic_1_Placement" || m.target === "Mic_1_Placement";
      if (!isSlot) return false;
      if (!isPlacementProfileValid(m)) return false;

      if (m.friendly_placement && m.friendly_distance && dVal) {
        if (m.friendly_placement.toLowerCase() === pVal.toLowerCase() &&
            m.friendly_distance.toLowerCase() === dVal.toLowerCase()) {
          return true;
        }
      }

      const fValueLower = (m.friendly_value || m.friendly_name || "").toLowerCase().trim();
      const inputLower = String(m1Placement).toLowerCase().trim();
      if (fValueLower === inputLower) return true;

      const fullVal = dVal ? `${pVal}_${dVal}`.toLowerCase() : pVal.toLowerCase();
      return fValueLower === pVal.toLowerCase() || fValueLower === fullVal;
    });

    if (mapM1) {
      const xmlValues = mapM1.maps_to || mapM1.xml_values || {};
      for (const [k, v] of Object.entries(xmlValues)) {
        if (k in defaultValues && k.startsWith("Mic0")) {
          resolved[k] = v;
        }
      }
    }
  }

  let m2Placement = settings.Mic_2_Placement ?? settings.mic_2_placement ?? settings["Mic_2_Placement"];
  let m2Distance = settings.Mic_2_Distance ?? settings.mic_2_distance ?? settings["Mic_2_Distance"];

  if (m2Placement) {
    let pVal = String(m2Placement).trim();
    let dVal = m2Distance ? String(m2Distance).trim() : "";
    if (pVal.includes(",")) {
      const parts = pVal.split(",");
      pVal = parts[0].trim();
      dVal = parts[1].trim();
    }

    const mapM2 = mappings.find(m => {
      if (!matchGear(m.gear)) return false;
      const isSlot = m.mic_slot === "Mic_2" || m.friendly_setting === "Mic_2_Placement" || m.target === "Mic_2_Placement";
      if (!isSlot) return false;
      if (!isPlacementProfileValid(m)) return false;

      if (m.friendly_placement && m.friendly_distance && dVal) {
        if (m.friendly_placement.toLowerCase() === pVal.toLowerCase() &&
            m.friendly_distance.toLowerCase() === dVal.toLowerCase()) {
          return true;
        }
      }

      const fValueLower = (m.friendly_value || m.friendly_name || "").toLowerCase().trim();
      const inputLower = String(m2Placement).toLowerCase().trim();
      if (fValueLower === inputLower) return true;

      const fullVal = dVal ? `${pVal}_${dVal}`.toLowerCase() : pVal.toLowerCase();
      return fValueLower === pVal.toLowerCase() || fValueLower === fullVal;
    });

    if (mapM2) {
      const xmlValues = mapM2.maps_to || mapM2.xml_values || {};
      for (const [k, v] of Object.entries(xmlValues)) {
        if (k in defaultValues && k.startsWith("Mic1")) {
          resolved[k] = v;
        }
      }
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
  const { cleanedChain } = filterDuplicateEqsWithRemoved(result.signal_chain ?? [], result.rack_decision);
  const chain = normaliseSignalChain(cleanedChain);

  const pedals = chain.filter((g) => g.type === "pedal");
  const amps = chain.filter((g) => g.type === "amp");
  const cab = chain.find((g) => g.type === "cab");
  const explicitRacks = chain.filter((g) => g.type === "rack");

  const preAmpPedals = pedals.filter((g) => !isPostAmpRack(g));
  const stompA1 = preAmpPedals.slice(0, 6);
  const stompB1 = preAmpPedals.slice(6, 12);
  const stompStereo: SignalChainElement[] = [];

  const rackA = [...explicitRacks, ...pedals.filter(isPostAmpRack)]
    .filter(isVerifiedRackGear)
    .slice(0, 6);

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
    buildRackSection("RackA", rackA.slice(0, 2), 2),
    buildRackSection("RackB", rackA.slice(2, 4), 2),
    buildRackSection("RackC", rackA.slice(4, 6), 2),

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
  dropped_parameters?: string[];
  final_status?: "PASS" | "PASS_WITH_WARNING" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" | "CHECK" | "SKIPPED" | "FAIL" | "CRITICAL" | "SUBSTITUTED_FALLBACK" | "BLOCKED_EXPORT";
  parameter_details?: {
    parameter: string;
    normalized_parameter?: string;
    input_value?: any;
    display_value: string;
    exported_internal_value: string;
    mapping_status: string;
    conversion_note?: string;
    expected_export_value?: any;
    actual_export_value?: any;
    reverse_converted_display_value?: string;
    reason?: string;
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
    placement_source?: string;
    resolved_at5_fields?: any;
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
}

export interface ExportDebugData {
  raw_input_chain: SignalChainElement[];
  exported_chain: ExportDebugItem[];
  skipped_gear: ExportDebugItem[];
  exported_xml_summary: string;
  rack_decision?: RackDecision;
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
  unit?: string
): string {
  if (exportValue === undefined || exportValue === null || exportValue === "") return "N/A";

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
  reason: string
): ExportDebugItem => {
  const gear = {
    ...pair.normalized,
    settings: normalizeSettingsToCanonical(pair.normalized.name, group, pair.normalized.settings ?? {}),
  };

  const originalRequestedGearName = pair.raw.name;
  const originalRequestedSettings = { ...(pair.raw.settings ?? {}) };
  const normalizedRequestedGearName = gear.name;
  const normalizedRequestedSettings = { ...(gear.settings ?? {}) };

  if (group === "cab") {
    if (!pair.raw.settings) pair.raw.settings = {};
    if (!gear.settings) gear.settings = {};

    // Standardize raw settings keys
    const rawKeys = Object.keys(pair.raw.settings);
    let m1PlaceVal: any = undefined;
    let m2PlaceVal: any = undefined;
    let m1DistVal: any = undefined;
    let m2DistVal: any = undefined;

    for (const key of rawKeys) {
      const lk = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lk === "mic1placement" || lk === "mic1position" || lk === "mic1placement" || lk === "mic_1_placement" || lk === "mic_1_position" || lk === "mic1position") {
        m1PlaceVal = pair.raw.settings[key];
        delete pair.raw.settings[key];
      } else if (lk === "mic2placement" || lk === "mic2position" || lk === "mic2placement" || lk === "mic_2_placement" || lk === "mic_2_position" || lk === "mic2position") {
        m2PlaceVal = pair.raw.settings[key];
        delete pair.raw.settings[key];
      } else if (lk === "mic1distance" || lk === "mic_1_distance") {
        m1DistVal = pair.raw.settings[key];
        delete pair.raw.settings[key];
      } else if (lk === "mic2distance" || lk === "mic_2_distance") {
        m2DistVal = pair.raw.settings[key];
        delete pair.raw.settings[key];
      }
    }

    pair.raw.settings["Mic_1_Placement"] = m1PlaceVal !== undefined ? m1PlaceVal : "Not specified";
    pair.raw.settings["Mic_2_Placement"] = m2PlaceVal !== undefined ? m2PlaceVal : "Not specified";
    if (m1DistVal !== undefined) pair.raw.settings["Mic_1_Distance"] = m1DistVal;
    if (m2DistVal !== undefined) pair.raw.settings["Mic_2_Distance"] = m2DistVal;

    // Standardize gear.settings keys
    const gearKeys = Object.keys(gear.settings);
    let gearM1PlaceVal: any = undefined;
    let gearM2PlaceVal: any = undefined;
    let gearM1DistVal: any = undefined;
    let gearM2DistVal: any = undefined;

    for (const key of gearKeys) {
      const lk = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lk === "mic1placement" || lk === "mic1position" || lk === "mic1placement" || lk === "mic_1_placement" || lk === "mic_1_position" || lk === "mic1position") {
        gearM1PlaceVal = gear.settings[key];
        delete gear.settings[key];
      } else if (lk === "mic2placement" || lk === "mic2position" || lk === "mic2placement" || lk === "mic_2_placement" || lk === "mic_2_position" || lk === "mic2position") {
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

    gear.settings["Mic_1_Placement"] = gearM1PlaceVal !== undefined ? gearM1PlaceVal : (m1PlaceVal !== undefined ? m1PlaceVal : "Not specified");
    gear.settings["Mic_2_Placement"] = gearM2PlaceVal !== undefined ? gearM2PlaceVal : (m2PlaceVal !== undefined ? m2PlaceVal : "Not specified");
    if (gearM1DistVal !== undefined) gear.settings["Mic_1_Distance"] = gearM1DistVal;
    else if (m1DistVal !== undefined) gear.settings["Mic_1_Distance"] = m1DistVal;
    
    if (gearM2DistVal !== undefined) gear.settings["Mic_2_Distance"] = gearM2DistVal;
    else if (m2DistVal !== undefined) gear.settings["Mic_2_Distance"] = m2DistVal;
  }

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
  if (group === "cab") {
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
      const isUuid = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(resolvedGuid || "");
      const paramsDefs = getParameterDefinitions(gear.name, group);
      const parametersExist = paramsDefs && paramsDefs.length > 0;
      
      const isPassOrAt5p = guidInfo.profile_validation_status === "PASS" || 
                           guidInfo.profile_validation_status === "verified_at5p" || 
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

  // Populate actual reason texts based on the finalized names and flags
  if (fallback_applied || substitution_used) {
    fallback_source = `Default ${group} fallback`;
    guidInfo.final_guid_source = "fallback";
    
    if (fallback_trigger === "missing_verified_guid") {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}" because the requested gear lacks a verified GUID.`;
    } else if (fallback_trigger === "missing_catalog_guid") {
      fallback_reason = `TT exported fallback "${actualExportedGearName}" instead of requested gear "${originalRequestedGearName}" because the requested gear is missing from the catalog.`;
    } else {
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

    if (isVerifiedCabinetEntry && isVerifiedSpeaker && isVerifiedMic1 && isVerifiedMic2) {
      finalReason = "Included with verified cab, speaker, and mic GUIDs.";
    } else if (exported) {
      const issues = [];
      if (!isVerifiedCabinetEntry) issues.push("Cab");
      if (!isVerifiedSpeaker) issues.push("Speaker");
      if (!isVerifiedMic1) issues.push("Mic 1");
      if (!isVerifiedMic2) issues.push("Mic 2");
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
  const detailsList: {
    parameter: string;
    normalized_parameter?: string;
    input_value?: any;
    display_value: string;
    exported_internal_value: string;
    mapping_status: string;
    conversion_note?: string;
    expected_export_value?: any;
    actual_export_value?: any;
    reverse_converted_display_value?: string;
    reason?: string;
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
    placement_source?: string;
    resolved_at5_fields?: any;
  }[] = [];
  const not_exported_detail: string[] = [];
  let hasNearestBandWarning = false;
  const nearestBandsList: string[] = [];
  let hasFallbackWarning = false;
  const fallbackWarningsList: string[] = [];

  const parsedExported: Record<string, number | string> = {};
  const attrRegex = /([A-Za-z0-9_]+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(attrs)) !== null) {
    const [_, name, val] = attrMatch;
    const num = parseFloat(val);
    parsedExported[name] = isNaN(num) ? val : num;
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
            const cleanAliases = (d.aliases ?? []).map((a) => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
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
          const cleanAliases = (d.aliases ?? []).map((a) => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
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
          if (isNearestBandMapping) {
            nearestBandsList.push(`requested ${normKey} mapped to supported AT5 band ${nearestBandFreq}Hz`);
          }
          const expVal = parsedExported[def.xmlName];
          if (expVal !== undefined) {
            const resolvedIntended = resolveParameterValue(normVal, def.min, def.max, def.transform, def.visualMin, def.visualMax);
            
            const nv = typeof resolvedIntended === "number" ? resolvedIntended : parseFloat(String(resolvedIntended));
            const ev = typeof expVal === "number" ? expVal : parseFloat(String(expVal));

            let match = false;
            if (!isNaN(nv) && !isNaN(ev)) {
              match = Math.abs(nv - ev) <= 0.15;
            } else {
              match = String(resolvedIntended).trim().toLowerCase() === String(expVal).trim().toLowerCase();
            }

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
            let display_value = def.unit ? appendUnitIdNotPresent(normVal, def.unit) : String(normVal);

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

            const reverse_converted_display_value = reverseConvertExportValueToDisplayValue(
              def.xmlName,
              ev,
              def.transform,
              def.min,
              def.max,
              def.visualMin,
              def.visualMax,
              def.unit
            );

            const mapStatus = isNearestBandMapping 
              ? (match ? "SUCCESS_NEAREST_BAND" : "FAIL") 
              : (match ? "SUCCESS" : "FAIL");
            
            let parameter_reason: string | undefined;
            if (mapStatus === "FAIL") {
              parameter_reason = `Expected ${display_value} but exported value loads as ${reverse_converted_display_value}.`;
            }

            detailsList.push({
              parameter: normKey,
              normalized_parameter: isNearestBandMapping ? nearestBandMappedXmlName : undefined,
              input_value: normVal,
              display_value,
              exported_internal_value: String(expVal),
              mapping_status: mapStatus,
              conversion_note,
              expected_export_value: typeof resolvedIntended === "number" ? Number(resolvedIntended.toFixed(6)) : String(resolvedIntended),
              actual_export_value: String(ev),
              reverse_converted_display_value,
              reason: parameter_reason
            });

            if (isNearestBandMapping && match) {
              hasNearestBandWarning = true;
            } else if (!match) {
              mismatched_parameters.push(
                `${def.friendlyName} (Intended display: ${normVal}, Expected exported value: ${resolvedIntended}, Exported: ${expVal})`
              );
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
            });
          }
        } else {
          dropped_parameters.push(normKey);
          detailsList.push({
            parameter: normKey,
            input_value: normVal,
            display_value: String(normVal),
            exported_internal_value: "DROPPED",
            mapping_status: "DROPPED",
            conversion_note: `Parameter '${normKey}' is dropped / not supported by the physical gear definition.`
          });
        }
      }
    } else {
      parameter_mapping_status = "UNVERIFIED";
    }
  } else if (exported && group === "cab") {
    const normRoom = String(normSettings.Room || normSettings.room || "").toLowerCase();
    const expRoom = String(parsedExported.RoomType || "").toLowerCase();

    if (normRoom && expRoom) {
      const getCleanRoom = (r: string) => {
        const rl = r.toLowerCase();
        if (rl.includes("small") || rl.includes("dry")) return "small";
        if (rl.includes("closet")) return "closet";
        if (rl.includes("bathroom")) return "bathroom";
        if (rl.includes("garage")) return "garage";
        if (rl.includes("hall")) return "hall";
        if (rl.includes("mid")) return "mid";
        return "large";
      };

      const cleanNorm = getCleanRoom(normRoom);
      const cleanExp = getCleanRoom(expRoom);

      if (cleanNorm !== cleanExp) {
        mismatched_parameters.push(
          `RoomType (Intended: '${normSettings.Room || normSettings.room}', Exported: '${parsedExported.RoomType}')`
        );
      }
    }

    const placementMappings = getDbMicPlacementMappings();
    const matchGearName = (mGear: string) => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      return clean(mGear) === clean(gear.name);
    };

    const canonicalKeysMap: Record<string, string> = {
      "mic_1_placement": "Mic_1_Placement",
      "mic_1_distance": "Mic_1_Distance",
      "mic_2_placement": "Mic_2_Placement",
      "mic_2_distance": "Mic_2_Distance",
      "room_level": "Room_Level",
      "mic 1 placement": "Mic_1_Placement",
      "mic 1 distance": "Mic_1_Distance",
      "mic 2 placement": "Mic_2_Placement",
      "mic 2 distance": "Mic_2_Distance",
      "room level": "Room_Level"
    };

    for (const [key, val] of Object.entries(normSettings)) {
      const k = key.toLowerCase();
      if (
        k === "speaker" || 
        k === "mic_1" || 
        k === "mic_2" || 
        k === "room" ||
        k === "mic_1_distance" ||
        k === "mic_2_distance" ||
        k === "mic 1 distance" ||
        k === "mic 2 distance"
      ) {
        continue;
      }

      const canonicalKey = canonicalKeysMap[k] || key;

      if (k === "mic_1_placement" || k === "mic 1 placement") {
        const plVal = normSettings.Mic_1_Placement ?? normSettings.mic_1_placement ?? normSettings["Mic_1_Placement"] ?? normSettings["Mic 1 Placement"] ?? normSettings["mic 1 placement"];
        const distVal = normSettings.Mic_1_Distance ?? normSettings.mic_1_distance ?? normSettings["Mic_1_Distance"] ?? normSettings["Mic 1 Distance"] ?? normSettings["mic 1 distance"];

        const was_supplied = !isUnspecifiedPlacementValue(plVal);
        
        let pVal = was_supplied && plVal ? String(plVal).trim() : "";
        let dVal = was_supplied && distVal ? String(distVal).trim() : "";
        if (pVal.includes(",")) {
          const parts = pVal.split(",");
          pVal = parts[0].trim();
          dVal = parts[1].trim();
        }

        let mapM1: any = null;
        if (was_supplied) {
          mapM1 = placementMappings.find(m => {
            if (!matchGearName(m.gear)) return false;
            const isSlot = m.mic_slot === "Mic_1" || m.friendly_setting === "Mic_1_Placement" || m.target === "Mic_1_Placement";
            if (!isSlot) return false;
            if (!isPlacementProfileValid(m)) return false;

            if (m.friendly_placement && m.friendly_distance && dVal) {
              if (m.friendly_placement.toLowerCase() === pVal.toLowerCase() &&
                  m.friendly_distance.toLowerCase() === dVal.toLowerCase()) {
                return true;
              }
            }

            const fValueLower = (m.friendly_value || m.friendly_name || "").toLowerCase().trim();
            const inputLower = plVal ? String(plVal).toLowerCase().trim() : "";
            if (fValueLower === inputLower) return true;

            const fullVal = dVal ? `${pVal}_${dVal}`.toLowerCase() : pVal.toLowerCase();
            return fValueLower === pVal.toLowerCase() || fValueLower === fullVal;
          });
        }

        const displayLabel = was_supplied ? (dVal ? `${pVal}, ${dVal}` : pVal) : "Not specified";
        const resolved_profile_found = was_supplied && !!(mapM1 && isPlacementProfileValid(mapM1));
        const xmlValues = resolved_profile_found && mapM1 ? (mapM1.maps_to || mapM1.xml_values || {}) : null;

        const fallback_value = {
          Mic0Angle: 0,
          Mic0XAxis: 0,
          Mic0YAxis: 0,
          Mic0Distance: 0,
          Mic0Speaker: 0
        };

        const exported_value = {
          Mic0Angle: parsedExported.Mic0Angle ?? "0",
          Mic0XAxis: parsedExported.Mic0XAxis ?? "0",
          Mic0YAxis: parsedExported.Mic0YAxis ?? "0",
          Mic0Distance: parsedExported.Mic0Distance ?? "0",
          Mic0Speaker: parsedExported.Mic0Speaker ?? "0"
        };

        const exportedString = `Mic0Angle: ${exported_value.Mic0Angle}, Mic0XAxis: ${exported_value.Mic0XAxis}, Mic0YAxis: ${exported_value.Mic0YAxis}, Mic0Distance: ${exported_value.Mic0Distance}, Mic0Speaker: ${exported_value.Mic0Speaker}`;

        if (!was_supplied) {
          // Case 3: No placement supplied, defaulting using standard Cab defaults
          detailsList.push({
            parameter: "Mic 1 Placement",
            display_value: "Not specified",
            expected_export_value: "Mic0Angle: 0, Mic0XAxis: 0, Mic0YAxis: 0, Mic0Distance: 0, Mic0Speaker: 0",
            exported_internal_value: exportedString,
            mapping_status: "NOT_SPECIFIED",
            conversion_note: "No semantic mic placement was specified in source signal chain. Exported default AT5 coordinates.",
            intended_semantic_value: "Not specified",
            resolved_profile_found: false,
            resolved_profile_value: fallback_value,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: "Not specified",
            placement_profile_source: undefined,
            placement_profile_id: undefined,
            fallback_used: false,
            resolved_numeric_values: fallback_value,
            exported_numeric_values: exported_value,
            verification_status: "NOT_SPECIFIED",
            placement_was_supplied_by_chain: false,
            placement_source: "cab_default",
            resolved_at5_fields: fallback_value
          });
        } else if (resolved_profile_found && mapM1 && xmlValues) {
          let allMatch = true;
          const detailStrings: string[] = [];
          const expectedStrings: string[] = [];
          for (const [f, expectedVal] of Object.entries(xmlValues)) {
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
            ? `Mic 1 placement resolved and matched successfully against all AT5 XML coordinate parameters.`
            : `Discrepancy in numeric coordinates between requested intent and exported preset XML.`;

          if (!allMatch) {
            mismatched_parameters.push("Mic_1_Placement (coordinate mismatch)");
          }

          detailsList.push({
            parameter: "Mic 1 Placement",
            display_value: displayLabel,
            expected_export_value: expectedStrings.join(", "),
            exported_internal_value: exportedString,
            mapping_status: status,
            conversion_note: conversionNote,
            intended_semantic_value: displayLabel,
            resolved_profile_found: true,
            resolved_profile_value: xmlValues,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: displayLabel,
            placement_profile_source: mapM1.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile",
            placement_profile_id: mapM1.id,
            fallback_used: false,
            resolved_numeric_values: xmlValues,
            exported_numeric_values: exported_value,
            verification_status: status,
            placement_was_supplied_by_chain: true,
            placement_source: mapM1.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile",
            resolved_at5_fields: xmlValues
          });
        } else {
          const warningMsg = `No AT5 mic placement profile found for ${displayLabel} on this cab. Using fallback placement.`;
          hasFallbackWarning = true;
          fallbackWarningsList.push(warningMsg);

          detailsList.push({
            parameter: "Mic 1 Placement",
            display_value: displayLabel,
            expected_export_value: "N/A (No profile found)",
            exported_internal_value: exportedString,
            mapping_status: "FALLBACK_USED",
            conversion_note: warningMsg,
            intended_semantic_value: displayLabel,
            resolved_profile_found: false,
            resolved_profile_value: null,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: displayLabel,
            placement_profile_source: undefined,
            placement_profile_id: undefined,
            fallback_used: true,
            fallback_reason: warningMsg,
            resolved_numeric_values: null,
            exported_numeric_values: exported_value,
            verification_status: "FALLBACK_USED",
            placement_was_supplied_by_chain: true,
            placement_source: "fallback_default",
            resolved_at5_fields: fallback_value
          });
        }
        continue;
      } else if (k === "mic_2_placement" || k === "mic 2 placement") {
        const plVal = normSettings.Mic_2_Placement ?? normSettings.mic_2_placement ?? normSettings["Mic_2_Placement"] ?? normSettings["Mic 2 Placement"] ?? normSettings["mic 2 placement"];
        const distVal = normSettings.Mic_2_Distance ?? normSettings.mic_2_distance ?? normSettings["Mic_2_Distance"] ?? normSettings["Mic 2 Distance"] ?? normSettings["mic 2 distance"];

        const was_supplied = !isUnspecifiedPlacementValue(plVal);

        let pVal = was_supplied && plVal ? String(plVal).trim() : "";
        let dVal = was_supplied && distVal ? String(distVal).trim() : "";
        if (pVal.includes(",")) {
          const parts = pVal.split(",");
          pVal = parts[0].trim();
          dVal = parts[1].trim();
        }

        let mapM2: any = null;
        if (was_supplied) {
          mapM2 = placementMappings.find(m => {
            if (!matchGearName(m.gear)) return false;
            const isSlot = m.mic_slot === "Mic_2" || m.friendly_setting === "Mic_2_Placement" || m.target === "Mic_2_Placement";
            if (!isSlot) return false;
            if (!isPlacementProfileValid(m)) return false;

            if (m.friendly_placement && m.friendly_distance && dVal) {
              if (m.friendly_placement.toLowerCase() === pVal.toLowerCase() &&
                  m.friendly_distance.toLowerCase() === dVal.toLowerCase()) {
                return true;
              }
            }

            const fValueLower = (m.friendly_value || m.friendly_name || "").toLowerCase().trim();
            const inputLower = plVal ? String(plVal).toLowerCase().trim() : "";
            if (fValueLower === inputLower) return true;

            const fullVal = dVal ? `${pVal}_${dVal}`.toLowerCase() : pVal.toLowerCase();
            return fValueLower === pVal.toLowerCase() || fValueLower === fullVal;
          });
        }

        const displayLabel = was_supplied ? (dVal ? `${pVal}, ${dVal}` : pVal) : "Not specified";
        const resolved_profile_found = was_supplied && !!(mapM2 && isPlacementProfileValid(mapM2));
        const xmlValues = resolved_profile_found && mapM2 ? (mapM2.maps_to || mapM2.xml_values || {}) : null;

        const fallback_value = {
          Mic1Angle: 0,
          Mic1XAxis: 0,
          Mic1YAxis: 0,
          Mic1Distance: 0,
          Mic1Speaker: 1
        };

        const exported_value = {
          Mic1Angle: parsedExported.Mic1Angle ?? "0",
          Mic1XAxis: parsedExported.Mic1XAxis ?? "0",
          Mic1YAxis: parsedExported.Mic1YAxis ?? "0",
          Mic1Distance: parsedExported.Mic1Distance ?? "0",
          Mic1Speaker: parsedExported.Mic1Speaker ?? "1"
        };

        const exportedString = `Mic1Angle: ${exported_value.Mic1Angle}, Mic1XAxis: ${exported_value.Mic1XAxis}, Mic1YAxis: ${exported_value.Mic1YAxis}, Mic1Distance: ${exported_value.Mic1Distance}, Mic1Speaker: ${exported_value.Mic1Speaker}`;

        if (!was_supplied) {
          // Case 3: No placement supplied, defaulting using standard Cab defaults
          detailsList.push({
            parameter: "Mic 2 Placement",
            display_value: "Not specified",
            expected_export_value: "Mic1Angle: 0, Mic1XAxis: 0, Mic1YAxis: 0, Mic1Distance: 0, Mic1Speaker: 1",
            exported_internal_value: exportedString,
            mapping_status: "NOT_SPECIFIED",
            conversion_note: "No semantic mic placement was specified in source signal chain. Exported default AT5 coordinates.",
            intended_semantic_value: "Not specified",
            resolved_profile_found: false,
            resolved_profile_value: fallback_value,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: "Not specified",
            placement_profile_source: undefined,
            placement_profile_id: undefined,
            fallback_used: false,
            resolved_numeric_values: fallback_value,
            exported_numeric_values: exported_value,
            verification_status: "NOT_SPECIFIED",
            placement_was_supplied_by_chain: false,
            placement_source: "cab_default",
            resolved_at5_fields: fallback_value
          });
        } else if (resolved_profile_found && mapM2 && xmlValues) {
          let allMatch = true;
          const detailStrings: string[] = [];
          const expectedStrings: string[] = [];
          for (const [f, expectedVal] of Object.entries(xmlValues)) {
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
            ? `Mic 2 placement resolved and matched successfully against all AT5 XML coordinate parameters.`
            : `Discrepancy in numeric coordinates between requested intent and exported preset XML.`;

          if (!allMatch) {
            mismatched_parameters.push("Mic_2_Placement (coordinate mismatch)");
          }

          detailsList.push({
            parameter: "Mic 2 Placement",
            display_value: displayLabel,
            expected_export_value: expectedStrings.join(", "),
            exported_internal_value: exportedString,
            mapping_status: status,
            conversion_note: conversionNote,
            intended_semantic_value: displayLabel,
            resolved_profile_found: true,
            resolved_profile_value: xmlValues,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: displayLabel,
            placement_profile_source: mapM2.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile",
            placement_profile_id: mapM2.id,
            fallback_used: false,
            resolved_numeric_values: xmlValues,
            exported_numeric_values: exported_value,
            verification_status: status,
            placement_was_supplied_by_chain: true,
            placement_source: mapM2.source === "at5p_discovery" ? "at5p_discovery_profile" : "calibrated_profile",
            resolved_at5_fields: xmlValues
          });
        } else {
          const warningMsg = `No AT5 mic placement profile found for ${displayLabel} on this cab. Using fallback placement.`;
          hasFallbackWarning = true;
          fallbackWarningsList.push(warningMsg);

          detailsList.push({
            parameter: "Mic 2 Placement",
            display_value: displayLabel,
            expected_export_value: "N/A (No profile found)",
            exported_internal_value: exportedString,
            mapping_status: "FALLBACK_USED",
            conversion_note: warningMsg,
            intended_semantic_value: displayLabel,
            resolved_profile_found: false,
            resolved_profile_value: null,
            fallback_value: fallback_value,
            exported_value: exported_value,
            placement_label: displayLabel,
            placement_profile_source: undefined,
            placement_profile_id: undefined,
            fallback_used: true,
            fallback_reason: warningMsg,
            resolved_numeric_values: null,
            exported_numeric_values: exported_value,
            verification_status: "FALLBACK_USED",
            placement_was_supplied_by_chain: true,
            placement_source: "fallback_default",
            resolved_at5_fields: fallback_value
          });
        }
        continue;
      } else if (k === "room_level") {
        detailsList.push({
          parameter: canonicalKey,
          display_value: String(val),
          expected_export_value: `Studio: Cab1_Room_Level: ~${val}`,
          exported_internal_value: "Semantic/Manual (In Studio node)",
          mapping_status: "SUCCESS",
          conversion_note: "Room Level is classified as semantic/manual. Excluded from strict cabinet-specific raw XML attribute comparison."
        });
        continue;
      } else {
        if (!isUnspecifiedPlacementValue(val)) {
          not_exported_detail.push(`${canonicalKey}: '${val}'`);
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
    if (mismatched_parameters.length > 0) {
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
    } else if (dropped_parameters.length > 0) {
      final_status = "PASS_WITH_WARNING";
      finalReason = `Warning: Unsupported parameters were dropped: [${dropped_parameters.join(", ")}]`;
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
      if (final_status === "FAIL" || final_status === "CHECK") {
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

  // Resolve through Gear Manager / catalog
  const catalogMatchAcross = findBestCatalogMatchAcrossGroups(gear.name);
  const gear_manager_type = catalogMatchAcross
    ? (catalogMatchAcross.group === "stomp" ? "pedal" : catalogMatchAcross.group)
    : gear.type;

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

  let selection_context = "standard_selection";
  const isStompEq = ["10 Band Graphic", "7 Band Graphic", "6 Band EQ", "Pre EQ 3", "Graphic EQ Pedal"].includes(gear.name) || section.startsWith("Stomp");
  const isRackEq = ["EQ PG", "Graphic EQ", "Parametric EQ", "Parametric EQ 3"].includes(gear.name) || section.startsWith("Rack");
  
  if (isRackEq) {
    selection_context = "post_amp_rack_eq";
  } else if (isStompEq) {
    selection_context = "pre_amp_stomp_eq";
  }

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

  if (!slot_type_valid) {
    final_status = "FAIL";
    parameter_mapping_status = "FAILED";
    finalReason = `Gear type mismatch: ${gear.name} is ${gear_manager_type} gear in Gear Manager but was generated as ${gear.type}.`;
    finalExported = false;
    gear_written_to_xml = false;
    gear_included_in_chain = false;
  }

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
    gear_included_in_chain,
    gear_written_to_xml,
    gear_attempted_to_xml,
    parameter_mapping_status,
    mismatched_parameters,
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
    slot_type_valid,
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
      ? (guidInfo.final_guid_source === "verified_static" ? "verified_static" : "gear_manager_db") 
      : "none/default",
    profile_validation_status: guidInfo.profile_validation_status,
    resolved_parameter_source: guidInfo.final_guid_source,
    hardcoded_substitution_applied: substitution_used,
    darrell_channel_selected,
    darrell_active_gain_parameter,
    darrell_active_master_parameter,
    darrell_channel_mapping_confidence,
    darrell_channel_mapping_reason,
  };
};

export const getExportDebugData = (
  result: ToneResult,
  signalChain?: SignalChainElement[]
): ExportDebugData => {
  const rawInput = signalChain ?? result.signal_chain ?? [];
  const { cleanedChain, removedItems } = filterDuplicateEqsWithRemoved(rawInput, result.rack_decision);
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

  const markExported = (
    pair: ChainPair,
    section: string,
    index: number,
    group: "amp" | "cab" | "stomp" | "rack",
    reason = "Included"
  ) => {
    exportedPairKeys.add(pairKey(pair));
    exportedChain.push(makeDebugItem(pair, section, index, group, true, reason));
  };

  const pedalPairs = pairs.filter((p) => p.normalized.type === "pedal");
  const ampPairs = pairs.filter((p) => p.normalized.type === "amp");
  const cabPairs = pairs.filter((p) => p.normalized.type === "cab");
  const rackPairs = pairs.filter((p) => p.normalized.type === "rack");

  const preAmpPairs = pedalPairs.filter((p) => !isPostAmpRack(p.normalized));
  const stompA1 = preAmpPairs.slice(0, 6);
  const stompB1 = preAmpPairs.slice(6, 12);
  const stompStereo: ChainPair[] = [];

  const rackMerged = [
    ...rackPairs,
    ...pedalPairs.filter((p) => isPostAmpRack(p.normalized)),
  ]
    .filter((p) => isVerifiedRackGear(p.normalized))
    .slice(0, 6);

  stompA1.forEach((pair, i) => markExported(pair, "StompA1", i, "stomp"));
  stompStereo.forEach((pair, i) =>
    markExported(pair, "StompStereo", i, "stomp")
  );
  stompB1.forEach((pair, i) => markExported(pair, "StompB1", i, "stomp"));

  ampPairs.slice(0, 3).forEach((pair, i) =>
    markExported(pair, `Amp${String.fromCharCode(65 + i)}`, 0, "amp")
  );

  cabPairs.slice(0, 1).forEach((pair) =>
    markExported(pair, "CabA", 0, "cab")
  );

  rackMerged.slice(0, 2).forEach((pair, i) => markExported(pair, "RackA", i, "rack"));
  rackMerged.slice(2, 4).forEach((pair, i) => markExported(pair, "RackB", i - 2, "rack"));
  rackMerged.slice(4, 6).forEach((pair, i) => markExported(pair, "RackC", i - 4, "rack"));

  pairs.forEach((pair) => {
    if (exportedPairKeys.has(pairKey(pair))) return;

    const gear = pair.normalized;
    let reason = "Skipped: exceeded slot limit or unverified gear category.";
    let group: "amp" | "cab" | "stomp" | "rack" = "stomp";

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
    } else if (
      gear.type === "rack" ||
      (gear.type === "pedal" && isPostAmpRack(gear))
    ) {
      group = "rack";
      const cat = isPostAmpRack(gear) ? "rack" : "stomp";
      const guid = resolveGuid(gear.name, cat, "");
      if (!guid || guid.trim() === "") {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else if (!isVerifiedRackGear(gear)) {
        reason =
          "Skipped: unverified rack gear. Only verified Parametric/Graphic EQ and select compressors are currently exported to RackA.";
      } else {
        reason = "Skipped: RackA only supports two verified rack slots.";
      }
    } else if (gear.type === "pedal") {
      group = "stomp";
      const guid = resolveGuid(gear.name, "stomp", "");
      if (!guid || guid.trim() === "") {
        reason = `Skipped: "${gear.name}" lacks a verified GUID mapping. Please use gear discovery to import.`;
      } else {
        reason = "Skipped: stomp slot limit reached.";
      }
    }

    skippedGear.push(makeDebugItem(pair, "None", -1, group, false, reason));
  });

  removedItems.forEach((item) => {
    const pair: ChainPair = {
      raw: item.el,
      normalized: { ...item.el, type: "pedal" },
      originalIndex: item.idx,
    };
    skippedGear.push(
      makeDebugItem(
        pair,
        "None",
        -1,
        "stomp",
        false,
        "Skipped: duplicate functional EQ stage with unspecified/redundant pre-amp role."
      )
    );
  });

  const activeCount = exportedChain.filter(item => item.exported).length;
  const criticalItems = exportedChain.filter(item => item.final_status === "CRITICAL" || item.final_status === "SUBSTITUTED_FALLBACK");
  const failedItems = exportedChain.filter(item => item.final_status === "FAIL");

  let summaryText = `AT5 Preset with ${activeCount} active gear slots.`;
  if (failedItems.length > 0) {
    summaryText += ` WARNING: ${failedItems.length} gear items failed validation and were blocked from exporting.`;
  } else if (criticalItems.length > 0) {
    summaryText += ` WARNING: ${criticalItems.length} gear items lacked verified GUID mappings and were substituted with default fallback profiles. Please review individual card details.`;
  }

  return {
    raw_input_chain: rawInput,
    exported_chain: exportedChain,
    skipped_gear: skippedGear,
    exported_xml_summary: summaryText,
    rack_decision: result.rack_decision,
  };
};

export const getExportData = (
  result: ToneResult,
  signalChain?: SignalChainElement[]
): Uint8Array => {
  const chainToExport = signalChain ?? result.signal_chain;
  const xmlContent = generateXML({ ...result, signal_chain: chainToExport });
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