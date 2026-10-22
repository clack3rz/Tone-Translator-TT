// src/sound-engineer/validation/platform/amplitube5ParameterValidator.ts
// AmpliTube 5 serialized XML parameter legality validator.
// Bound to Phase 1C.5h WP-30 Stage 2 Slice 4A.

import {
  type PlatformParameterValidationResult,
  PLATFORM_VALIDATION_STATUSES,
} from "./platformAdapter";
import type { AmpliTube5ParsedPreset } from "./amplitube5XmlParser";
import {
  enumerateAmpliTube5ModuleSlots,
  lookupCatalogGearByGuid,
  type AmpliTube5RawModuleSlot,
} from "./amplitube5ModuleValidator";
import {
  getParameterDefinitions,
  getGearSelectorMappings,
  type ResolvedParameter,
} from "../../../services/at5ParameterManifest";
import { AT5_EMPTY_SLOT_GUID } from "../../../services/at5Catalog";

/**
 * Set of structural envelope and metadata attribute names derived from
 * AT5 XML parser, module validator, and exporter contracts (not gear parameter knobs).
 */
const STRUCTURAL_METADATA_ATTRIBUTES = new Set<string>([
  // Preset envelope metadata (from AmpliTube 5 XML preset root contract)
  "version",
  "format",
  "guid",
  "presetbpm",
  "programchange",
  "chain",
  "input",
  "output",

  // Module identity & naming attributes (from SECTION_CONFIGS & gear catalog)
  "model",
  "cabmodel",
  "name",
  "modelname",
  "displayname",
  "cabmodelname",
  "dromid",

  // Standard execution & slot controls (from exporter slot templates)
  "bypass",
  "mute",
  "outputvolume",
  "fullscreen",
  "guiloadcomplete",
  "midichannel",
]);

/**
 * Checks whether an XML attribute represents structural module/slot metadata
 * or cabinet acoustic topology rather than a serialized gear parameter knob.
 *
 * Grounded in:
 * 1. Exporter slot wrappers and parser contracts (Bypass, Mute, FullScreen, etc.);
 * 2. Module identity contracts in SECTION_CONFIGS (Model, StompN, SlotN);
 * 3. Cabinet acoustic & VIR placement topology (cabs in AT5 define params: [],
 *    where attributes represent mic coordinates, speaker models, and room acoustics).
 */
export function isStructuralOrContainerAttribute(
  attrKey: string,
  slotFamily: string
): boolean {
  const clean = normalizeKey(attrKey);

  // 1. Direct match against authoritative structural metadata controls
  if (STRUCTURAL_METADATA_ATTRIBUTES.has(clean)) {
    return true;
  }

  // 2. Multi-slot indexed attributes (e.g. Stomp0..Stomp5, Slot0..Slot5)
  if (/^(stomp|slot)\d+$/i.test(attrKey)) {
    return true;
  }

  // 3. Cabinet / Studio acoustic & mic topology attributes:
  // In AmpliTube 5, cabinets define no continuous tone knobs (manifest params: []).
  // Attributes on cab nodes represent mic placement coordinates, speaker models, and room acoustics.
  if (slotFamily === "cab") {
    if (
      clean.startsWith("mic") ||
      clean.startsWith("speaker") ||
      clean.startsWith("room") ||
      clean.startsWith("di") ||
      clean.startsWith("bus") ||
      clean === "highlevel" ||
      clean === "irdecimation" ||
      clean === "ambience"
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Computes the count of decimal places for a numeric value or numeric string representation.
 */
export function countDecimalPlaces(val: string | number): number {
  const str = typeof val === "number" ? val.toString() : String(val).trim();
  if (str.includes("e-") || str.includes("E-")) {
    const parts = str.toLowerCase().split("e-");
    const mantissaDec = parts[0].includes(".") ? parts[0].split(".")[1].length : 0;
    return mantissaDec + parseInt(parts[1], 10);
  }
  const dot = str.indexOf(".");
  return dot === -1 ? 0 : str.length - dot - 1;
}

export interface StepConformanceResult {
  conforms: boolean;
  verifiable: boolean;
  reason?: string;
}

/**
 * Validates step conformance using exact decimal integer scaling without arbitrary floating-point tolerances.
 * Eliminates arbitrary epsilons and multipliers by scaling numVal, exportMin, and exportStep into integer space:
 *   scale = 10^d where d = max(decimals(val), decimals(step), decimals(exportMin))
 *   conforms = abs(intVal - intMin) % intStep === 0
 *
 * Preferred evaluation hierarchy:
 * 1. Explicit authoritative option rows when present.
 * 2. Exact decimal integer scaling based on decimal representations of exportStep, exportMin, and serializedValue.
 * 3. Fail-safe NOT_VERIFIABLE if scale exceeds safe integer arithmetic limits (d > 8 or outside safe integers).
 */
export function validateStepConformance(
  numVal: number,
  serializedValue: string,
  exportMin: number,
  step: number,
  def: ResolvedParameter
): StepConformanceResult {
  // 1. If explicit option rows exist, check exact option row membership first
  if (def.optionRows && def.optionRows.length > 0) {
    const matchedOption = def.optionRows.some((row) => {
      if (typeof row.exportValue === "number") {
        return Math.abs(numVal - row.exportValue) === 0;
      }
      return String(row.exportValue).trim().toLowerCase() === serializedValue.trim().toLowerCase();
    });
    if (matchedOption) {
      return { conforms: true, verifiable: true };
    }
  }

  // 2. Exact decimal integer scaling
  const valDecimals = countDecimalPlaces(serializedValue);
  const stepDecimals = countDecimalPlaces(step);
  const minDecimals = countDecimalPlaces(exportMin);
  const maxDecimals = Math.max(valDecimals, stepDecimals, minDecimals);

  // If decimal scale exceeds safe integer arithmetic limits (d > 8), return NOT_VERIFIABLE
  if (maxDecimals > 8) {
    return {
      conforms: false,
      verifiable: false,
      reason: `Decimal scale ${maxDecimals} exceeds safe integer arithmetic limits for exact step verification.`,
    };
  }

  const scale = Math.pow(10, maxDecimals);
  const intVal = Math.round(numVal * scale);
  const intMin = Math.round(exportMin * scale);
  const intStep = Math.round(step * scale);

  if (
    !Number.isSafeInteger(intVal) ||
    !Number.isSafeInteger(intMin) ||
    !Number.isSafeInteger(intStep) ||
    intStep <= 0
  ) {
    return {
      conforms: false,
      verifiable: false,
      reason: `Scaled integer values exceed safe integer bounds for exact step verification.`,
    };
  }

  const offset = Math.abs(intVal - intMin);
  const remainder = offset % intStep;

  if (remainder !== 0) {
    return {
      conforms: false,
      verifiable: true,
      reason: `Step violation: serialized value ${numVal} (scaled: ${intVal}) offset from exportMin ${exportMin} (scaled: ${intMin}) is ${offset}, which is not an exact multiple of step ${step} (scaled: ${intStep}, remainder: ${remainder}).`,
    };
  }

  return { conforms: true, verifiable: true };
}

/**
 * Normalizes an attribute or parameter key for matching.
 */
function normalizeKey(key: string): string {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Extracts serialized parameter attributes from a slot node in the raw XML root.
 */
function extractSlotRawParameters(
  rawRoot: Record<string, unknown>,
  slot: AmpliTube5RawModuleSlot
): Record<string, unknown> {
  const parts = slot.slotLocation.split("/");
  const sectionName = parts[0];
  const slotIdent = parts[1];

  const sectionNode = rawRoot[sectionName] as Record<string, any> | undefined;
  if (!sectionNode || typeof sectionNode !== "object") {
    return {};
  }

  // 1. Amp section: parameters live in sectionNode.Amp
  if (slot.slotFamily === "amp") {
    const ampObj = sectionNode.Amp;
    if (ampObj && typeof ampObj === "object") {
      return ampObj;
    }
    return {};
  }

  // 2. Cab section: parameters live in sectionNode.Cab (or sectionNode attributes)
  if (slot.slotFamily === "cab") {
    const cabObj = sectionNode.Cab;
    if (cabObj && typeof cabObj === "object") {
      return cabObj;
    }
    return {};
  }

  // 3. Stomp / Rack sections: parameters live in sectionNode[slotIdent]
  // slotIdent is typically "Slot0", "Slot1", etc.
  const slotObj = sectionNode[slotIdent];
  if (slotObj && typeof slotObj === "object") {
    return slotObj;
  }

  return {};
}

/**
 * Resolves a serialized XML attribute key to its authoritative parameter definition.
 */
function resolveParameterDefinition(
  attrKey: string,
  definitions: readonly ResolvedParameter[],
  activeBankMappings?: Record<string, string>
): ResolvedParameter | undefined {
  const cleanAttr = normalizeKey(attrKey);

  // 1. If selector mapping is active, check if attrKey matches an active physical parameter
  if (activeBankMappings) {
    for (const [logicalName, physicalAttr] of Object.entries(activeBankMappings)) {
      if (normalizeKey(physicalAttr) === cleanAttr) {
        // Find definition corresponding to this logical or physical name
        const match = definitions.find(
          (d) =>
            normalizeKey(d.xmlName) === cleanAttr ||
            normalizeKey(d.friendlyName) === normalizeKey(logicalName)
        );
        if (match) return match;
      }
    }
  }

  // 2. Direct match on xmlName
  const directXml = definitions.find((d) => normalizeKey(d.xmlName) === cleanAttr);
  if (directXml) return directXml;

  // 3. Match on canonicalParameterName / at5XmlAttributeName
  const canonMatch = definitions.find(
    (d) =>
      (d.canonicalParameterName && normalizeKey(d.canonicalParameterName) === cleanAttr) ||
      (d.at5XmlAttributeName && normalizeKey(d.at5XmlAttributeName) === cleanAttr)
  );
  if (canonMatch) return canonMatch;

  // 4. Match on friendlyName
  const friendlyMatch = definitions.find((d) => normalizeKey(d.friendlyName) === cleanAttr);
  if (friendlyMatch) return friendlyMatch;

  // 5. Match on aliases / effectiveAliases
  const aliasMatch = definitions.find((d) => {
    const aliases = [...(d.aliases || []), ...(d.effectiveAliases || [])];
    return aliases.some((a) => normalizeKey(a) === cleanAttr);
  });
  if (aliasMatch) return aliasMatch;

  // 6. Suffix-based strip match (e.g. Gain_BritishTubeLead1 -> prefix "Gain", matches alias "gain" of PreAmp)
  if (attrKey.includes("_")) {
    const prefix = attrKey.split("_")[0];
    const cleanPrefix = normalizeKey(prefix);
    const prefixMatch = definitions.find(
      (d) =>
        normalizeKey(d.friendlyName) === cleanPrefix ||
        normalizeKey(d.xmlName) === cleanPrefix ||
        [...(d.aliases || []), ...(d.effectiveAliases || [])].some(
          (a) => normalizeKey(a) === cleanPrefix
        )
    );
    if (prefixMatch) return prefixMatch;
  }

  return undefined;
}

/**
 * Validates a single serialized parameter attribute against its authoritative definition.
 */
function validateSingleParameter(
  attrKey: string,
  rawValue: unknown,
  slot: AmpliTube5RawModuleSlot,
  definitions: readonly ResolvedParameter[],
  selectorMappingContext?: {
    activeBank?: string;
    activeBankMappings?: Record<string, string>;
    selectorUnresolved?: boolean;
    selectorParamKey?: string;
    selectorDependentAttrs?: Set<string>;
  }
): PlatformParameterValidationResult {
  const serializedValue = String(rawValue ?? "").trim();
  const cleanAttr = normalizeKey(attrKey);

  // Check if this parameter is selector-dependent and selector could not be resolved
  if (
    selectorMappingContext?.selectorUnresolved &&
    selectorMappingContext.selectorDependentAttrs?.has(cleanAttr)
  ) {
    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
      message: `Selector context unresolved: parameter '${attrKey}' depends on selector '${selectorMappingContext.selectorParamKey}', whose state could not be resolved from preset.`,
    };
  }

  // Resolve definition
  const def = resolveParameterDefinition(
    attrKey,
    definitions,
    selectorMappingContext?.activeBankMappings
  );

  // Unknown parameter
  if (!def) {
    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      message: `Unknown or unmapped serialized parameter '${attrKey}' for module '${slot.rawName || slot.rawGuid}'.`,
    };
  }

  // Determine authoritative serialized export bounds
  const rawDef = def as unknown as { exportMin?: number; exportMax?: number };
  const exportMin = rawDef.exportMin !== undefined ? rawDef.exportMin : (def.authoritativeRange ? def.authoritativeRange[0] : def.min);
  const exportMax = rawDef.exportMax !== undefined ? rawDef.exportMax : (def.authoritativeRange ? def.authoritativeRange[1] : def.max);

  const legalRange =
    exportMin !== undefined && exportMax !== undefined
      ? { min: exportMin, max: exportMax }
      : undefined;

  // 1. Empty string validation
  if (serializedValue === "") {
    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      legalRange,
      message: `Empty serialized value: parameter '${attrKey}' requires a valid serialized value, but value is empty.`,
    };
  }

  // 2. Numeric parsing and validation
  const numVal = Number(serializedValue);
  if (isNaN(numVal) || !Number.isFinite(numVal)) {
    // Check if it's a valid enum / string option
    if (def.optionRows && def.optionRows.length > 0) {
      const cleanVal = normalizeKey(serializedValue);
      const matchesOption = def.optionRows.some(
        (o) =>
          normalizeKey(String(o.exportValue)) === cleanVal ||
          normalizeKey(o.id) === cleanVal ||
          normalizeKey(o.displayLabel) === cleanVal
      );
      if (matchesOption) {
        return {
          parameterId: attrKey,
          moduleId: slot.rawGuid,
          serializedValue,
          status: PLATFORM_VALIDATION_STATUSES.PASS,
          legalRange,
          message: `Verified discrete parameter '${attrKey}' with valid option '${serializedValue}'.`,
        };
      }
    }

    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      legalRange,
      message: `Non-numeric serialized value: parameter '${attrKey}' requires a numeric value, but received '${serializedValue}'.`,
    };
  }

  // 3. Numeric range validation against authoritative export bounds
  if (exportMin !== undefined && numVal < exportMin - 1e-6) {
    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      legalRange,
      message: `Out of range: serialized value ${numVal} is below authoritative exportMin ${exportMin} for parameter '${attrKey}'.`,
    };
  }

  if (exportMax !== undefined && numVal > exportMax + 1e-6) {
    return {
      parameterId: attrKey,
      moduleId: slot.rawGuid,
      serializedValue,
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      legalRange,
      message: `Out of range: serialized value ${numVal} exceeds authoritative exportMax ${exportMax} for parameter '${attrKey}'.`,
    };
  }

  // 4. Step validation (enforced strictly where exportStep is authoritative relative to exportMin)
  if (def.exportStep !== undefined && def.exportStep > 0 && exportMin !== undefined) {
    const step = def.exportStep;
    const stepResult = validateStepConformance(numVal, serializedValue, exportMin, step, def);

    if (!stepResult.verifiable) {
      return {
        parameterId: attrKey,
        moduleId: slot.rawGuid,
        serializedValue,
        status: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
        legalRange,
        message: stepResult.reason || `Step conformance cannot be verified without arbitrary tolerance for parameter '${attrKey}'.`,
      };
    }

    if (!stepResult.conforms) {
      return {
        parameterId: attrKey,
        moduleId: slot.rawGuid,
        serializedValue,
        status: PLATFORM_VALIDATION_STATUSES.FAIL,
        legalRange,
        message: stepResult.reason || `Step violation: serialized value ${numVal} does not conform to authoritative exportStep ${step} from exportMin ${exportMin}.`,
      };
    }
  }

  return {
    parameterId: attrKey,
    moduleId: slot.rawGuid,
    serializedValue,
    status: PLATFORM_VALIDATION_STATUSES.PASS,
    legalRange,
    message: `Verified serialized parameter '${attrKey}' = ${serializedValue} within export bounds [${exportMin}, ${exportMax}].`,
  };
}

/**
 * Validates all serialized parameters belonging to recognized active gear modules in the preset.
 */
export function validateAmpliTube5Parameters(
  parsedPreset: AmpliTube5ParsedPreset
): readonly PlatformParameterValidationResult[] {
  const discoveredSlots = enumerateAmpliTube5ModuleSlots(parsedPreset.rawRoot);
  const parameterResults: PlatformParameterValidationResult[] = [];

  for (const slot of discoveredSlots) {
    // 1. Skip empty slots (AT5_EMPTY_SLOT_GUID)
    if (slot.rawGuid.toLowerCase() === AT5_EMPTY_SLOT_GUID.toLowerCase()) {
      continue;
    }

    // 2. Only active recognized modules are evaluated
    const catalogItem = lookupCatalogGearByGuid(slot.rawGuid);
    if (!catalogItem) {
      continue; // Unrecognized gear fails at module validation level
    }

    // 3. Extract serialized parameter attributes for this slot
    const rawParams = extractSlotRawParameters(parsedPreset.rawRoot, slot);

    // 4. Retrieve authoritative parameter definitions
    const definitions = getParameterDefinitions(slot.rawGuid, slot.slotFamily);

    // 5. Check for selector-dependent mappings (e.g. multi-channel amps)
    const selectorMappings = getGearSelectorMappings(slot.rawGuid, slot.slotFamily);
    let selectorContext:
      | {
          activeBank?: string;
          activeBankMappings?: Record<string, string>;
          selectorUnresolved?: boolean;
          selectorParamKey?: string;
          selectorDependentAttrs?: Set<string>;
        }
      | undefined;

    if (selectorMappings && selectorMappings.length > 0) {
      const mapping = selectorMappings[0];
      const selectorKey = mapping.selectorParameter;
      const cleanSelectorKey = normalizeKey(selectorKey);

      // Collect all selector-dependent attributes across all cases
      const selectorDependentAttrs = new Set<string>();
      if (mapping.cases) {
        for (const cDef of Object.values(mapping.cases)) {
          if (cDef && cDef.parameters) {
            for (const [logical, physical] of Object.entries(cDef.parameters)) {
              selectorDependentAttrs.add(normalizeKey(logical));
              selectorDependentAttrs.add(normalizeKey(physical));
            }
          }
        }
      }

      // Find selector value in rawParams
      let rawSelectorVal: unknown = undefined;
      for (const [k, v] of Object.entries(rawParams)) {
        if (normalizeKey(k) === cleanSelectorKey) {
          rawSelectorVal = v;
          break;
        }
      }

      if (rawSelectorVal === undefined) {
        // If not found in rawParams, check parent section node
        const sectionNode = parsedPreset.rawRoot[slot.slotLocation.split("/")[0]] as Record<string, any>;
        if (sectionNode) {
          for (const [k, v] of Object.entries(sectionNode)) {
            if (normalizeKey(k) === cleanSelectorKey) {
              rawSelectorVal = v;
              break;
            }
          }
        }
      }

      if (rawSelectorVal !== undefined && rawSelectorVal !== null) {
        const strVal = String(rawSelectorVal).trim();
        const caseDef = mapping.cases[strVal];
        if (caseDef) {
          selectorContext = {
            activeBank: strVal,
            activeBankMappings: caseDef.parameters,
            selectorDependentAttrs,
          };
        } else {
          selectorContext = {
            selectorUnresolved: true,
            selectorParamKey: selectorKey,
            selectorDependentAttrs,
          };
        }
      } else {
        selectorContext = {
          selectorUnresolved: true,
          selectorParamKey: selectorKey,
          selectorDependentAttrs,
        };
      }
    }

    // 6. Validate each serialized attribute
    for (const [attrKey, attrValue] of Object.entries(rawParams)) {
      // Skip structural envelope / container attributes
      if (isStructuralOrContainerAttribute(attrKey, slot.slotFamily)) {
        continue;
      }

      const result = validateSingleParameter(
        attrKey,
        attrValue,
        slot,
        definitions,
        selectorContext
      );
      parameterResults.push(result);
    }
  }

  return parameterResults;
}
