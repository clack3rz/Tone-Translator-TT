// src/services/at5ParameterManifest.ts
// Maps AI/debug-friendly gear settings into AT5 XML-safe parameter attributes.

import {
  AMP_MANIFEST,
  STOMP_MANIFEST,
  CAB_MANIFEST,
  RACK_MANIFEST,
  ROOM_MANIFEST,
  TONEX_MANIFEST,
  GearItem,
  KnobDefinition,
} from "./gearManifest";
import { AT5_VERIFIED_GEAR, VerifiedGearDef, VerifiedParamDef } from "./at5VerifiedParameterOverrides";
import { getAt5Catalog } from "./at5Catalog";

export const FILTER_BANDS = [
  20, 25, 31, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 
  12500, 16000, 20000
];

export function parseFrequencyToHz(freqStr: string): number | null {
  const clean = freqStr.toLowerCase().trim();
  const match = clean.match(/^([0-9.]+)\s*(khz|hz|k)?$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (isNaN(val)) return null;
  const unit = match[2];
  if (unit === "khz" || unit === "k") {
    return val * 1000;
  }
  return val;
}

export function findClosestBand(hz: number): number {
  let closest = FILTER_BANDS[0];
  let minDiff = Math.abs(hz - closest);
  for (let i = 1; i < FILTER_BANDS.length; i++) {
    const diff = Math.abs(hz - FILTER_BANDS[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = FILTER_BANDS[i];
    }
  }
  return closest;
}

export interface ResolvedParameter {
  friendlyName: string;
  xmlName: string;
  min: number;
  max: number;
  unit?: string;
  aliases?: string[];
  defaultValue?: number | string;
  transform?: VerifiedParamDef["transform"];
}

const ALL_GEAR: GearItem[] = [
  ...AMP_MANIFEST,
  ...STOMP_MANIFEST,
  ...CAB_MANIFEST,
  ...RACK_MANIFEST,
  ...ROOM_MANIFEST,
  ...TONEX_MANIFEST,
];

export const normalise = (value: string) =>
  String(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compact = (value: string) => String(value).replace(/[^a-zA-Z0-9]/g, "");

const escapeXmlAttr = (value: unknown) =>
  String(value).replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      case "'": return "&apos;";
      default: return c;
    }
  });

const isKnobDefinition = (knob: string | KnobDefinition): knob is KnobDefinition =>
  typeof knob !== "string";

const scoreTextMatch = (query: string, candidates: string[]) => {
  const q = normalise(query);
  let score = 0;

  for (const rawCandidate of candidates) {
    const candidate = normalise(rawCandidate);
    if (!candidate) continue;

    if (candidate === q) score += 1000;
    if (candidate.includes(q)) score += 300;
    if (q.includes(candidate)) score += 180;

    for (const token of q.split(" ")) {
      if (token.length >= 3 && candidate.includes(token)) score += 20;
    }
  }

  return score;
};

export function findVerifiedGearWithScore(
  gearNameOrId: string | undefined,
  category?: string
): { gear: VerifiedGearDef; score: number } | undefined {
  if (!gearNameOrId) return undefined;

  const matches = AT5_VERIFIED_GEAR
    .filter((gear) => !category || gear.category === (category === "pedal" ? "stomp" : category))
    .map((gear) => ({
      gear,
      score: scoreTextMatch(gearNameOrId, [gear.name, gear.realId ?? "", ...(gear.aliases ?? [])]),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0];
}

export function findManifestGearWithScore(
  gearNameOrId: string | undefined,
  category?: string
): { gear: GearItem; score: number } | undefined {
  if (!gearNameOrId) return undefined;

  const matches = ALL_GEAR
    .filter((gear) => !category || gear.category === (category === "pedal" ? "stomp" : category))
    .map((gear) => ({
      gear,
      score: scoreTextMatch(gearNameOrId, [gear.id, gear.name, gear.realId ?? ""]),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0];
}

export function findCatalogGearWithScore(
  gearNameOrId: string | undefined,
  category?: string
): { gear: any; score: number } | undefined {
  if (!gearNameOrId) return undefined;

  const catalog = getAt5Catalog() || [];
  const group = category === "pedal" ? "stomp" : category;

  const matches = catalog
    .filter((item) => !group || item.group === group)
    .map((item) => {
      let score = scoreTextMatch(gearNameOrId, [
        item.displayName,
        item.guid ?? "",
        ...(item.otherNames ?? []),
        ...(item.examplePresets ?? [])
      ]);

      // Grant a substantial bonus for items with non-empty/real GUIDs to resolve tie-breakers nicely
      if (score > 0 && item.guid && item.guid.trim() !== "") {
        score += 500;
      }

      return { gear: item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0];
}

export function findVerifiedGear(
  gearNameOrId: string | undefined,
  category?: string
): VerifiedGearDef | undefined {
  return findVerifiedGearWithScore(gearNameOrId, category)?.gear;
}

export function findManifestGear(
  gearNameOrId: string | undefined,
  category?: string
): GearItem | undefined {
  return findManifestGearWithScore(gearNameOrId, category)?.gear;
}

export function resolveVerifiedOrManifestRealId(
  gearNameOrId: string | undefined,
  category?: string
): string | undefined {
  const verifiedMatch = findVerifiedGearWithScore(gearNameOrId, category);
  const manifestMatch = findManifestGearWithScore(gearNameOrId, category);
  const catalogMatch = findCatalogGearWithScore(gearNameOrId, category);

  const candidates: { realId?: string; score: number; type: "verified" | "manifest" | "catalog" }[] = [];

  if (verifiedMatch) {
    candidates.push({ realId: verifiedMatch.gear.realId, score: verifiedMatch.score, type: "verified" });
  }
  if (manifestMatch) {
    candidates.push({ realId: manifestMatch.gear.realId, score: manifestMatch.score, type: "manifest" });
  }
  if (catalogMatch) {
    candidates.push({ realId: catalogMatch.gear.guid, score: catalogMatch.score, type: "catalog" });
  }

  if (candidates.length === 0) return undefined;

  const getScoringTier = (score: number) => {
    if (score >= 1000) return 3; // EXACT MATCH
    if (score >= 150) return 2;  // STRONG MATCH
    return 1;                    // WEAK/TOKEN MATCH
  };

  candidates.sort((a, b) => {
    const aTier = getScoringTier(a.score);
    const bTier = getScoringTier(b.score);

    if (bTier !== aTier) {
      return bTier - aTier;
    }

    const aBonus = a.type === "verified" ? 5000 : a.type === "catalog" ? 1000 : 0;
    const bBonus = b.type === "verified" ? 5000 : b.type === "catalog" ? 1000 : 0;
    const aScore = a.score + aBonus;
    const bScore = b.score + bBonus;

    if (bScore !== aScore) {
      return bScore - aScore;
    }
    const aHasId = !!(a.realId && a.realId.trim() !== "");
    const bHasId = !!(b.realId && b.realId.trim() !== "");
    if (aHasId !== bHasId) {
      return bHasId ? 1 : -1;
    }
    return 0;
  });

  return candidates[0].realId;
}

export function getParameterDefinitions(
  gearNameOrId: string | undefined,
  category?: string
): ResolvedParameter[] {
  const verifiedMatch = findVerifiedGearWithScore(gearNameOrId, category);
  const manifestMatch = findManifestGearWithScore(gearNameOrId, category);
  const catalogMatch = findCatalogGearWithScore(gearNameOrId, category);

  const candidates: { type: "verified" | "manifest" | "catalog"; score: number; data: any }[] = [];

  if (verifiedMatch) {
    candidates.push({ type: "verified", score: verifiedMatch.score, data: verifiedMatch.gear });
  }
  if (manifestMatch) {
    candidates.push({ type: "manifest", score: manifestMatch.score, data: manifestMatch.gear });
  }
  if (catalogMatch) {
    candidates.push({ type: "catalog", score: catalogMatch.score, data: catalogMatch.gear });
  }

  if (candidates.length === 0) return [];

  const getScoringTier = (score: number) => {
    if (score >= 1000) return 3; // EXACT MATCH
    if (score >= 150) return 2;  // STRONG MATCH
    return 1;                    // WEAK/TOKEN MATCH
  };

  candidates.sort((a, b) => {
    const aTier = getScoringTier(a.score);
    const bTier = getScoringTier(b.score);

    if (bTier !== aTier) {
      return bTier - aTier;
    }

    const aBonus = a.type === "verified" ? 5000 : a.type === "catalog" ? 1000 : 0;
    const bBonus = b.type === "verified" ? 5000 : b.type === "catalog" ? 1000 : 0;
    return (b.score + bBonus) - (a.score + aBonus);
  });

  const best = candidates[0];

  if (best.type === "verified") {
    return best.data.params;
  }

  if (best.type === "catalog") {
    const gear = best.data;
    if (!gear.knobs) return [];
    return gear.knobs.map((knob: any) => {
      const baseXmlName = compact(knob.name);
      return {
        friendlyName: knob.name,
        xmlName: gear.group === "amp" && gear.paramSuffix ? `${baseXmlName}${gear.paramSuffix}` : baseXmlName,
        min: knob.min ?? 0,
        max: knob.max ?? 10,
        defaultValue: knob.default !== undefined ? knob.default : undefined,
      };
    });
  }

  const gear = best.data;
  if (!gear.knobs) return [];

  return gear.knobs.filter(isKnobDefinition).map((knob: any) => {
    const baseXmlName = compact(knob.name);
    return {
      friendlyName: knob.name,
      xmlName: gear.category === "amp" && gear.paramSuffix ? `${baseXmlName}${gear.paramSuffix}` : baseXmlName,
      min: knob.min,
      max: knob.max,
      unit: knob.unit,
    };
  });
}

const parseSettingValue = (
  value: unknown,
  transform?: VerifiedParamDef["transform"]
): string | number | undefined => {
  if (value === undefined || value === null) return undefined;
  
  const text = String(value).trim().toLowerCase();
  if (text === "" || text === "undefined" || text === "null") return undefined;
  
  if (transform === "black76Ratio") {
    if (text.includes("20")) return "_20";
    if (text.includes("12")) return "_12";
    if (text.includes("8")) return "_8";
    if (text.includes("4")) return "_4";
    if (text.includes("all")) return "All";
    
    const num = parseFloat(text);
    if (num === 20) return "_20";
    if (num === 12) return "_12";
    if (num === 8) return "_8";
    if (num === 4) return "_4";
    
    return "_4";
  }

  if (typeof value === "number") return value;

  let n: number | undefined;

  // Compressor Ratio mapping (Generic fallback - legacy)
  if (text.includes("ratio") && !transform) {
    if (text.includes("4:1") || text === "4" || text === "_4") n = 0;
    else if (text.includes("8:1") || text === "8" || text === "_8") n = 1;
    else if (text.includes("12:1") || text === "12" || text === "_12") n = 2;
    else if (text.includes("20:1") || text === "20" || text === "_20") n = 3;
    else if (text.includes("all")) n = 4;
  }

  if (n === undefined) {
    const first = text.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/i)?.[0];
    if (!first) {
      // If no numeric data found, but it's a non-empty alphanumeric string,
      // treat it as a potential enum value (e.g. "Low", "All").
      if (text.length > 0 && /^[a-z0-9_\s]+$/i.test(text)) {
        return String(value).trim();
      }
      return undefined;
    }
    n = parseFloat(first);
  }
  if (!Number.isFinite(n)) return undefined;

  if (transform === "dbThresholdToLinear") {
    const db = Math.min(0, Math.max(-100, n));
    n = Math.pow(10, db / 20);
  }

  if (transform === "khzToHzIfNeeded") {
    if (text.includes("khz")) n *= 1000;
  }

  if (transform === "noiseGateRelease") {
    if (text.includes("ms")) {
      // already milliseconds
    } else if (text.includes("s") || text.includes("sec")) {
      n = n * 1000;
    } else if (n > 1.5 && n <= 10) {
      n = 20 + n * 148; // treat as 20-1500 dial (0-10 scale)
    } else if (n <= 1.5) {
      n = n * 1000; // treat as seconds (e.g. 1.2 -> 1200ms)
    }
  }

  if (transform === "noiseGateDepth") {
    // If input is 0..10 and not explicitly dB, convert to AT5 dB range: -100..-20
    if (!text.includes("db") && n >= 0 && n <= 10) {
      // 0 -> -100, 10 -> -20. Linear mapping: -100 + (n * 8)
      n = -100 + n * 8;
    }
  }

  if (transform === "black76InputOutput") {
    // Treat values as dB if they include dB or are numeric.
    // UI range is -99.0 dB to 0.0 dB.
    // Convert to linear: linear = Math.pow(10, db / 20)
    
    let db = n;
    if (db > 0) db = 0; // Clamp positive to 0 dB
    if (db < -99) db = -99; // Clamp lower bound
    
    n = Math.pow(10, db / 20);
  }

  return n;
};

export function resolveParameterValue(
  value: unknown,
  min: number,
  max: number,
  transform?: VerifiedParamDef["transform"]
): string | number | undefined {
  const v = parseSettingValue(value, transform);
  if (typeof v === "string") return v;
  if (v === undefined || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, v as number));
}

export function normalizeSettingsToCanonical(
  gearNameOrId: string | undefined,
  category: string,
  settings: Record<string, string | number> = {}
): Record<string, string | number> {
  const defs = getParameterDefinitions(gearNameOrId, category);
  if (!defs || defs.length === 0) {
    return settings;
  }

  const normalized: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(settings)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9.]/g, "");
    
    const def = defs.find((d) => {
      const cleanFriendly = d.friendlyName.toLowerCase().replace(/[^a-z0-9.]/g, "");
      const cleanXml = d.xmlName.toLowerCase().replace(/[^a-z0-9.]/g, "");
      const cleanAliases = (d.aliases ?? []).map((a) => a.toLowerCase().replace(/[^a-z0-9.]/g, ""));
      return (
        cleanFriendly === cleanKey ||
        cleanXml === cleanKey ||
        cleanAliases.includes(cleanKey)
      );
    });

    if (def) {
      normalized[def.friendlyName] = val;
    } else {
      normalized[key] = val;
    }
  }
  return normalized;
}

export function buildMappedParameterAttrs(
  gearNameOrId: string | undefined,
  category: string,
  settings: Record<string, unknown> = {}
): string {
  const defs = getParameterDefinitions(gearNameOrId, category);

  const canonicalSettings = normalizeSettingsToCanonical(gearNameOrId, category, settings as Record<string, string | number>);

  const normalisedSettings = new Map(
    Object.entries(canonicalSettings).map(([key, value]) => [normalise(key), value])
  );

  // Noise Gate Depth safety
  if (normalise(gearNameOrId || "") === "noise gate") {
    const hasDepth = ["depth", "reduction"].some(alias => normalisedSettings.has(normalise(alias)));
    if (!hasDepth) {
      normalisedSettings.set("depth", "-60");
    }
  }

  if (!defs.length) {
    return Object.entries(settings || {})
      .map(([key, value]) => `${compact(key)}="${escapeXmlAttr(value)}"`)
      .join(" ");
  }

  return defs
    .map((def) => {
      const lookupNames = [def.friendlyName, def.xmlName, ...(def.aliases ?? [])];
      let raw = lookupNames
        .map((name) => normalisedSettings.get(normalise(name)))
        .find((value) => value !== undefined);

      if (raw === undefined && gearNameOrId && (category === "rack" || category === "stomp") && gearNameOrId.toLowerCase().includes("graphic")) {
        const bandMatch = def.xmlName.match(/^Band(\d+)$/i);
        if (bandMatch) {
          const bandFreq = parseInt(bandMatch[1]);
          for (const [sKey, sVal] of normalisedSettings.entries()) {
            const hz = parseFrequencyToHz(sKey);
            if (hz !== null) {
              const closest = findClosestBand(hz);
              if (closest === bandFreq) {
                raw = sVal;
                break;
              }
            }
          }
        }
      }

      if (raw === undefined && def.defaultValue !== undefined) {
        raw = def.defaultValue;
      }

      const resolved = resolveParameterValue(raw, def.min, def.max, def.transform);
      if (resolved === undefined) return null;

      if (typeof resolved === "string") {
        return `${def.xmlName}="${escapeXmlAttr(resolved)}"`;
      }

      return `${def.xmlName}="${Number(resolved.toFixed(6))}"`;
    })
    .filter(Boolean)
    .join(" ");
}
