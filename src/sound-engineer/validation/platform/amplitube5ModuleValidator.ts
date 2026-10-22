// src/sound-engineer/validation/platform/amplitube5ModuleValidator.ts
// AmpliTube 5 module GUID and slot compatibility validator.
// Bound to Phase 1C.5h WP-30 Stage 2 Slice 3.

import {
  type PlatformModuleValidationResult,
  PLATFORM_VALIDATION_STATUSES,
} from "./platformAdapter";
import type { AmpliTube5ParsedPreset } from "./amplitube5XmlParser";
import {
  getAt5Catalog,
  AT5_EMPTY_SLOT_GUID,
} from "../../../services/at5Catalog";
import type { AT5CatalogItem } from "../../../types";

/**
 * Standard GUID / UUID syntax regex (8-4-4-4-12 hex format).
 */
export const AT5_GUID_SYNTAX_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recognized AT5 gear groups for slot compatibility.
 */
export type AT5SlotFamily = "stomp" | "amp" | "cab" | "rack";

/**
 * Raw slot descriptor discovered during XML traversal.
 */
export interface AmpliTube5RawModuleSlot {
  readonly slotLocation: string;
  readonly slotFamily: AT5SlotFamily;
  readonly rawGuid: string;
  readonly rawName?: string;
}

/**
 * Section slot scanning configuration.
 */
interface SectionSlotConfig {
  readonly sectionName: string;
  readonly slotFamily: AT5SlotFamily;
  readonly slotCount: number;
  readonly attributePrefix?: string;
  readonly modelAttribute?: string;
}

const SECTION_CONFIGS: readonly SectionSlotConfig[] = [
  // Stomp sections (up to 6 slots each)
  { sectionName: "StompA1", slotFamily: "stomp", slotCount: 6, attributePrefix: "Stomp" },
  { sectionName: "StompA2", slotFamily: "stomp", slotCount: 6, attributePrefix: "Stomp" },
  { sectionName: "StompStereo", slotFamily: "stomp", slotCount: 3, attributePrefix: "Stomp" },
  { sectionName: "StompB1", slotFamily: "stomp", slotCount: 6, attributePrefix: "Stomp" },
  { sectionName: "StompB2", slotFamily: "stomp", slotCount: 6, attributePrefix: "Stomp" },
  { sectionName: "StompB3", slotFamily: "stomp", slotCount: 6, attributePrefix: "Stomp" },
  { sectionName: "LoopFxA", slotFamily: "stomp", slotCount: 4, attributePrefix: "Stomp" },
  { sectionName: "LoopFxB", slotFamily: "stomp", slotCount: 4, attributePrefix: "Stomp" },
  { sectionName: "LoopFxC", slotFamily: "stomp", slotCount: 4, attributePrefix: "Stomp" },

  // Amp sections (1 model per section)
  { sectionName: "AmpA", slotFamily: "amp", slotCount: 1, modelAttribute: "Model" },
  { sectionName: "AmpB", slotFamily: "amp", slotCount: 1, modelAttribute: "Model" },
  { sectionName: "AmpC", slotFamily: "amp", slotCount: 1, modelAttribute: "Model" },

  // Cab sections (1 cab model per section)
  { sectionName: "CabA", slotFamily: "cab", slotCount: 1, modelAttribute: "CabModel" },
  { sectionName: "CabB", slotFamily: "cab", slotCount: 1, modelAttribute: "CabModel" },
  { sectionName: "CabC", slotFamily: "cab", slotCount: 1, modelAttribute: "CabModel" },

  // Rack sections (2 slots for A/B/C/DI, 6 for Master)
  { sectionName: "RackA", slotFamily: "rack", slotCount: 2, attributePrefix: "Stomp" },
  { sectionName: "RackB", slotFamily: "rack", slotCount: 2, attributePrefix: "Stomp" },
  { sectionName: "RackC", slotFamily: "rack", slotCount: 2, attributePrefix: "Stomp" },
  { sectionName: "RackDI", slotFamily: "rack", slotCount: 2, attributePrefix: "Stomp" },
  { sectionName: "RackMaster", slotFamily: "rack", slotCount: 6, attributePrefix: "Stomp" },
];

/**
 * In-memory index of the authoritative AT5 gear catalogue by lowercase GUID.
 */
let catalogByGuidCache: Map<string, AT5CatalogItem> | null = null;

export function getAuthoritativeCatalogMap(): Map<string, AT5CatalogItem> {
  if (!catalogByGuidCache) {
    catalogByGuidCache = new Map();
    const catalog = getAt5Catalog();
    for (const item of catalog) {
      if (item.guid && item.guid.trim()) {
        catalogByGuidCache.set(item.guid.toLowerCase().trim(), item);
      }
    }
  }
  return catalogByGuidCache;
}

/**
 * Resets the in-memory catalogue index cache (used when catalogue updates).
 */
export function resetCatalogCache(): void {
  catalogByGuidCache = null;
}

/**
 * Looks up a gear module by GUID in the authoritative AmpliTube 5 catalogue.
 */
export function lookupCatalogGearByGuid(
  guid: string
): AT5CatalogItem | undefined {
  if (!guid) return undefined;
  const map = getAuthoritativeCatalogMap();
  return map.get(guid.toLowerCase().trim());
}

/**
 * Normalizes a name string for loose equality comparison.
 */
function normalizeName(name: string | undefined | null): string {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Enumerates every serialized AT5 module slot from parsed preset XML.
 * Each slot is represented exactly once.
 */
export function enumerateAmpliTube5ModuleSlots(
  rawRoot: Record<string, unknown>
): readonly AmpliTube5RawModuleSlot[] {
  const discoveredSlots: AmpliTube5RawModuleSlot[] = [];

  for (const config of SECTION_CONFIGS) {
    const sectionNode = rawRoot[config.sectionName] as Record<string, any> | undefined;
    if (!sectionNode || typeof sectionNode !== "object") {
      continue;
    }

    if (config.modelAttribute) {
      // Model attribute pattern (Amp, Cab)
      let rawGuid: string | undefined;
      let rawName: string | undefined;

      if (sectionNode[config.modelAttribute] !== undefined) {
        rawGuid = String(sectionNode[config.modelAttribute]);
      } else if (config.slotFamily === "amp" && sectionNode.Amp?.[config.modelAttribute] !== undefined) {
        rawGuid = String(sectionNode.Amp[config.modelAttribute]);
      } else if (config.slotFamily === "cab" && sectionNode.Cab?.[config.modelAttribute] !== undefined) {
        rawGuid = String(sectionNode.Cab[config.modelAttribute]);
      }

      if (rawGuid !== undefined) {
        rawName =
          sectionNode.ModelName ||
          sectionNode.Name ||
          sectionNode.Amp?.ModelName ||
          sectionNode.Amp?.Name ||
          sectionNode.Cab?.CabModelName ||
          sectionNode.Cab?.Name;

        discoveredSlots.push({
          slotLocation: `${config.sectionName}/${config.modelAttribute}`,
          slotFamily: config.slotFamily,
          rawGuid: rawGuid.trim(),
          rawName: rawName ? String(rawName).trim() : undefined,
        });
      }
    } else if (config.attributePrefix) {
      // Multi-slot indexed pattern (Stomp, Rack)
      for (let i = 0; i < config.slotCount; i++) {
        let rawGuid: string | undefined;
        let rawName: string | undefined;

        const attrKey = `${config.attributePrefix}${i}`;
        const slotKey = `Slot${i}`;

        if (sectionNode[attrKey] !== undefined) {
          rawGuid = String(sectionNode[attrKey]);
        } else if (sectionNode[slotKey]?.Model !== undefined) {
          rawGuid = String(sectionNode[slotKey].Model);
        } else if (sectionNode[slotKey]?.Stomp !== undefined) {
          rawGuid = String(sectionNode[slotKey].Stomp);
        }

        if (rawGuid !== undefined) {
          rawName =
            sectionNode[slotKey]?.Name ||
            sectionNode[slotKey]?.ModelName ||
            sectionNode[slotKey]?.DisplayName;

          discoveredSlots.push({
            slotLocation: `${config.sectionName}/Slot${i}`,
            slotFamily: config.slotFamily,
            rawGuid: rawGuid.trim(),
            rawName: rawName ? String(rawName).trim() : undefined,
          });
        }
      }
    }
  }

  return discoveredSlots;
}

/**
 * Validates a single module slot against GUID syntax, catalogue membership,
 * empty slot semantics, and slot family compatibility.
 */
export function validateSingleModuleSlot(
  slot: AmpliTube5RawModuleSlot
): PlatformModuleValidationResult {
  const { rawGuid, slotLocation, slotFamily, rawName } = slot;

  // 1. GUID syntax validation
  if (!rawGuid || !AT5_GUID_SYNTAX_REGEX.test(rawGuid)) {
    return {
      moduleId: rawGuid || "missing",
      slotLocation,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      isRecognized: false,
      message: `Malformed GUID syntax: "${rawGuid}". Expected standard 8-4-4-4-12 hexadecimal UUID format.`,
    };
  }

  // 2. Empty slot handling (AT5_EMPTY_SLOT_GUID)
  if (rawGuid.toLowerCase() === AT5_EMPTY_SLOT_GUID.toLowerCase()) {
    return {
      moduleId: rawGuid,
      slotLocation,
      status: PLATFORM_VALIDATION_STATUSES.PASS,
      isRecognized: false, // Factual: empty slot does NOT count as active recognized gear
      message: `Empty slot verified (${AT5_EMPTY_SLOT_GUID}). No active gear module loaded.`,
    };
  }

  // 3. Authoritative catalogue lookup
  const catalogItem = lookupCatalogGearByGuid(rawGuid);
  if (!catalogItem) {
    return {
      moduleId: rawGuid,
      slotLocation,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      isRecognized: false,
      message: `Unknown or unregistered module GUID: "${rawGuid}". Not found in authoritative AmpliTube 5 gear catalog.`,
    };
  }

  // 4. Slot / Gear-Family Compatibility
  const itemGroup = (catalogItem.group || "").toLowerCase();
  const canonicalGroup = itemGroup === "pedal" ? "stomp" : itemGroup;

  if (canonicalGroup !== slotFamily) {
    return {
      moduleId: rawGuid,
      moduleName: catalogItem.displayName,
      slotLocation,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      isRecognized: true, // Recognized in catalogue, but placed in incompatible slot
      message: `Slot incompatibility: module "${catalogItem.displayName}" has catalog group "${catalogItem.group}", but was serialized in ${slotFamily.toUpperCase()} slot "${slotLocation}".`,
    };
  }

  // 5. Name / Alias consistency check
  let diagnosticMessage = `Verified active gear module: "${catalogItem.displayName}" (${catalogItem.group}) in slot "${slotLocation}".`;
  if (rawName) {
    const normRaw = normalizeName(rawName);
    const normCanon = normalizeName(catalogItem.displayName);
    const normAliases = (catalogItem.otherNames ?? []).map(normalizeName);

    const matchesCanonical = normRaw === normCanon;
    const matchesAlias = normAliases.includes(normRaw);

    if (!matchesCanonical && !matchesAlias) {
      // Check if rawName matches another gear item in the catalog
      const catalog = getAt5Catalog();
      const otherItem = catalog.find(
        (i) => i.guid?.toLowerCase() !== rawGuid.toLowerCase() && normalizeName(i.displayName) === normRaw
      );

      if (otherItem) {
        diagnosticMessage = `Verified active gear module: "${catalogItem.displayName}" (${catalogItem.group}). Inconsistency warning: serialized name "${rawName}" contradicts canonical name "${catalogItem.displayName}".`;
      }
    }
  }

  return {
    moduleId: rawGuid,
    moduleName: catalogItem.displayName,
    slotLocation,
    status: PLATFORM_VALIDATION_STATUSES.PASS,
    isRecognized: true,
    message: diagnosticMessage,
  };
}

/**
 * Validates all serialized gear module slots in an AmpliTube 5 preset.
 */
export function validateAmpliTube5Modules(
  parsedPreset: AmpliTube5ParsedPreset
): readonly PlatformModuleValidationResult[] {
  const discoveredSlots = enumerateAmpliTube5ModuleSlots(parsedPreset.rawRoot);
  return discoveredSlots.map(validateSingleModuleSlot);
}
