// src/sound-engineer/validation/platform/amplitube5XmlParser.ts
// AmpliTube 5 XML preset parser and simulated structural loadability engine.
// Bound to Phase 1C.5h WP-30 Stage 2 Slice 2.

import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  type LoadabilityEvaluationResult,
  LOADABILITY_CAPABILITY_TYPES,
} from "./platformAdapter";

/**
 * Recognized AmpliTube 5 processing and gear section names.
 */
export const AT5_KNOWN_SECTIONS = [
  "StompA1",
  "StompA2",
  "StompStereo",
  "StompB1",
  "StompB2",
  "StompB3",
  "AmpA",
  "AmpB",
  "AmpC",
  "CabA",
  "CabB",
  "CabC",
  "LoopFxA",
  "LoopFxB",
  "LoopFxC",
  "RackA",
  "RackB",
  "RackC",
  "RackDI",
  "RackMaster",
  "Studio",
  "Tuner",
] as const;

export type AT5KnownSectionName = (typeof AT5_KNOWN_SECTIONS)[number];

/**
 * Parsed representation of an AmpliTube 5 preset XML artifact.
 */
export interface AmpliTube5ParsedPreset {
  /** Target format attribute, verified to be "at5p" */
  readonly format: string;
  /** Version attribute on the Preset root element (e.g. "2") */
  readonly version: string;
  /** Unique identifier of the preset instance */
  readonly guid?: string;
  /** BPM setting configured in preset header */
  readonly presetBpm?: string | number;
  /** MIDI Program Change number */
  readonly programChange?: string | number;
  /** Core signal chain topology configuration */
  readonly chain?: {
    readonly preset?: string;
    readonly diBeforeAmp?: string | number;
    readonly raw?: Record<string, unknown>;
  };
  /** Audio input configuration */
  readonly input?: {
    readonly input?: string | number;
    readonly raw?: Record<string, unknown>;
  };
  /** Audio output configuration */
  readonly output?: {
    readonly output?: string | number;
    readonly raw?: Record<string, unknown>;
  };
  /** Tuner module settings */
  readonly tuner?: {
    readonly bypass?: string | number;
    readonly mute?: string | number;
    readonly outputVolume?: string | number;
    readonly tunerType?: string;
    readonly raw?: Record<string, unknown>;
  };
  /** Optional metadata tag */
  readonly metaInfo?: Record<string, unknown>;
  /** Names of recognized processing sections present in this preset */
  readonly detectedSectionNames: readonly string[];
  /** Raw unparsed children and attributes under <Preset> */
  readonly rawRoot: Record<string, unknown>;
}

/**
 * Structural validation result for AmpliTube 5 preset XML.
 */
export interface AmpliTube5StructuralValidationResult {
  /** True if preset passes all structural, syntax, and format constraints */
  readonly isValid: boolean;
  /** True if the raw XML text is syntactically well-formed XML */
  readonly isSyntaxValid: boolean;
  /** Parsed preset envelope if syntax was valid, else undefined */
  readonly parsedPreset?: AmpliTube5ParsedPreset;
  /** Factual fatal error descriptions causing validation failure */
  readonly errors: readonly string[];
  /** Non-fatal informational warnings or disclosures */
  readonly warnings: readonly string[];
}

/**
 * Parses and structurally validates an AmpliTube 5 preset XML string.
 * Strictly fail-closed: malformed, corrupt, empty, non-at5p, or structurally deficient XML fails immediately.
 */
export function parseAmpliTube5Xml(
  xmlContent: string
): AmpliTube5StructuralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fail-closed check for empty, undefined, or whitespace-only input
  if (!xmlContent || typeof xmlContent !== "string" || !xmlContent.trim()) {
    return {
      isValid: false,
      isSyntaxValid: false,
      errors: ["Preset XML content is empty, null, or whitespace-only."],
      warnings: [],
    };
  }

  // 2. Syntax validation via fast-xml-parser XMLValidator
  const syntaxCheck = XMLValidator.validate(xmlContent);
  if (syntaxCheck !== true) {
    const errorDetail =
      typeof syntaxCheck === "object" && syntaxCheck?.err
        ? `${syntaxCheck.err.msg} (line ${syntaxCheck.err.line}, col ${syntaxCheck.err.col})`
        : "Invalid XML syntax.";
    return {
      isValid: false,
      isSyntaxValid: false,
      errors: [`XML syntax validation failed: ${errorDetail}`],
      warnings: [],
    };
  }

  // 3. In-memory XML parsing
  let jsonObj: any;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
      parseAttributeValue: false,
    });
    jsonObj = parser.parse(xmlContent);
  } catch (err) {
    return {
      isValid: false,
      isSyntaxValid: false,
      errors: [
        `XML parser exception: ${err instanceof Error ? err.message : String(err)}`,
      ],
      warnings: [],
    };
  }

  // 4. Root envelope verification
  if (!jsonObj || typeof jsonObj !== "object" || !jsonObj.Preset) {
    return {
      isValid: false,
      isSyntaxValid: true,
      errors: ["Missing required root <Preset> element in XML artifact."],
      warnings: [],
    };
  }

  const root = jsonObj.Preset;

  // 5. Target-platform format assertion (Format="at5p")
  const format = String(root.Format ?? "").trim();
  if (!format) {
    errors.push("Missing required 'Format' attribute on <Preset> root element.");
  } else if (format.toLowerCase() !== "at5p") {
    errors.push(
      `Invalid preset format: expected Format="at5p", but found "${format}".`
    );
  }

  // 6. Target-platform version attribute check
  const version = String(root.Version ?? "").trim();
  if (!version) {
    errors.push("Missing required 'Version' attribute on <Preset> root element.");
  }

  // 7. Structural signal flow and essential routing elements
  if (!root.Chain) {
    errors.push(
      "Missing required signal chain routing element <Chain> in preset envelope."
    );
  }

  if (!root.Input) {
    errors.push(
      "Missing required input configuration element <Input> in preset envelope."
    );
  }

  if (!root.Output) {
    errors.push(
      "Missing required output configuration element <Output> in preset envelope."
    );
  }

  // 8. Processing sections presence audit
  const detectedSectionNames: string[] = [];
  for (const sectionName of AT5_KNOWN_SECTIONS) {
    if (root[sectionName] !== undefined) {
      detectedSectionNames.push(sectionName);
    }
  }

  if (detectedSectionNames.length === 0) {
    errors.push(
      "Structural preset validation failed: preset contains no signal processing or gear blocks (Stomp, Amp, Cab, Rack, LoopFx, or Tuner)."
    );
  }

  // 9. Assemble parsed preset structure if valid
  const isValid = errors.length === 0;
  if (!isValid) {
    return {
      isValid: false,
      isSyntaxValid: true,
      errors,
      warnings,
    };
  }

  const parsedPreset: AmpliTube5ParsedPreset = {
    format,
    version,
    guid: root.GUID ? String(root.GUID) : undefined,
    presetBpm: root.PresetBPM !== undefined ? root.PresetBPM : undefined,
    programChange: root.ProgramChange !== undefined ? root.ProgramChange : undefined,
    chain: root.Chain
      ? {
          preset: root.Chain.Preset ? String(root.Chain.Preset) : undefined,
          diBeforeAmp: root.Chain.DIBeforeAmp,
          raw: root.Chain,
        }
      : undefined,
    input: root.Input
      ? {
          input: root.Input.Input,
          raw: root.Input,
        }
      : undefined,
    output: root.Output
      ? {
          output: root.Output.Output,
          raw: root.Output,
        }
      : undefined,
    tuner: root.Tuner
      ? {
          bypass: root.Tuner.Bypass,
          mute: root.Tuner.Mute,
          outputVolume: root.Tuner.OutputVolume,
          tunerType: root.Tuner.TunerType ? String(root.Tuner.TunerType) : undefined,
          raw: root.Tuner,
        }
      : undefined,
    metaInfo: root.MetaInfo,
    detectedSectionNames,
    rawRoot: root,
  };

  return {
    isValid: true,
    isSyntaxValid: true,
    parsedPreset,
    errors: [],
    warnings,
  };
}

/**
 * Simulates in-memory loading of an AmpliTube 5 preset artifact.
 * Verifies syntax, root tag, format attribute, routing envelope, and processing sections
 * without requiring the native closed-source AmpliTube 5 binary runtime.
 */
export function simulateAmpliTube5Load(
  xmlContent: string
): LoadabilityEvaluationResult {
  const structuralResult = parseAmpliTube5Xml(xmlContent);

  if (!structuralResult.isValid) {
    return {
      capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
      loadable: false,
      details: `Simulated AT5 in-memory loader rejected preset: ${structuralResult.errors.join("; ")}`,
    };
  }

  const preset = structuralResult.parsedPreset;
  const sectionsSummary = preset?.detectedSectionNames.join(", ") ?? "none";

  return {
    capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
    loadable: true,
    details: `Simulated AT5 in-memory loader successfully verified preset structure (Format="${preset?.format}", Version="${preset?.version}", ActiveSections=[${sectionsSummary}]).`,
  };
}
