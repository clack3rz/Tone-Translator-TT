import { getExportDebugData } from "../services/presetExporter";
import { resolveGearParameters, normalizeSettingsToCanonical } from "../services/at5ParameterManifest";
import { ToneResult } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("=== Running Compressor Parameter Alias Resolution & Priority Tests ===");

// ----------------------------------------------------------------------
// Test 1: Compressor Regression Test with Sensitivity=2.5 and Level=7.5
// ----------------------------------------------------------------------
console.log("\n[Test 1] Testing Compressor parameter alias resolution for Sensitivity -> Comp and Level -> Level...");

const compressorToneResult: ToneResult = {
  tone_summary: {
    style: "Clean Compressor Test",
    gain_level: "low",
    noise_level: "low"
  },
  engineering_notes: {
    gain_strategy: "Pedal compression before amp.",
    noise_control: "None",
    eq_strategy: "Flat"
  },
  confidence: 1.0,
  signal_chain: [
    {
      type: "pedal",
      name: "Compressor",
      settings: {
        "Sensitivity": 2.5,
        "Level": 7.5
      }
    },
    {
      type: "amp",
      name: "Brit 8000",
      settings: {
        "PreAmp": 5,
        "Master": 5
      }
    },
    {
      type: "cab",
      name: "4x12 Brit 8000",
      settings: {}
    }
  ]
};

const debugData1 = getExportDebugData(compressorToneResult);
const exportedCompItem = debugData1.exported_chain.find(
  item => item.original_name.toLowerCase() === "compressor" || item.normalized_name.toLowerCase() === "compressor"
);

assert(!!exportedCompItem, "Exported Compressor item should be present in exported_chain");

console.log("Original settings:", JSON.stringify(exportedCompItem?.original_settings));
console.log("Normalized settings:", JSON.stringify(exportedCompItem?.normalized_settings));
console.log("Exported XML settings string:", exportedCompItem?.exported_settings);
console.log("Parameter details:", JSON.stringify(exportedCompItem?.parameter_details, null, 2));

// Assertions for Test 1
assert(
  exportedCompItem?.original_settings["Sensitivity"] === 2.5,
  "Original settings must preserve requested Sensitivity=2.5"
);
assert(
  exportedCompItem?.original_settings["Level"] === 7.5,
  "Original settings must preserve requested Level=7.5"
);

assert(
  exportedCompItem?.exported_settings.includes('Comp="2.5"'),
  `Exported XML must contain Comp="2.5", got: ${exportedCompItem?.exported_settings}`
);
assert(
  exportedCompItem?.exported_settings.includes('Level="2.371374"') || exportedCompItem?.exported_settings.includes('Level="7.5"'),
  `Exported XML must contain Level, got: ${exportedCompItem?.exported_settings}`
);

assert(
  !exportedCompItem?.dropped_parameters || exportedCompItem.dropped_parameters.length === 0,
  `No parameters should be dropped for Compressor, dropped: ${JSON.stringify(exportedCompItem?.dropped_parameters)}`
);

const compDetail = exportedCompItem?.parameter_details?.find(
  d => d.input_parameter_name === "Comp" || d.input_parameter_name === "Sensitivity" || d.parameter === "Comp" || d.parameter === "Sensitivity"
);
assert(!!compDetail, "Comp/Sensitivity parameter detail must exist");
assert(
  compDetail?.matched_export_parameter_name === "Comp" || compDetail?.matched_profile_parameter === "Comp",
  `Sensitivity/Comp must resolve to Comp, got: ${compDetail?.matched_export_parameter_name}`
);

const levelDetail = exportedCompItem?.parameter_details?.find(
  d => d.input_parameter_name === "Level" || d.parameter === "Level"
);
assert(!!levelDetail, "Level parameter detail must exist");
assert(
  levelDetail?.matched_export_parameter_name === "Level" || levelDetail?.matched_profile_parameter === "Level",
  `Level must resolve to Level, got: ${levelDetail?.matched_export_parameter_name}`
);

console.log("PASSED Test 1: Compressor Sensitivity and Level resolved correctly!");

// ----------------------------------------------------------------------
// Test 2: Priority Test - Exact Match Priority over Generic Normalization
// ----------------------------------------------------------------------
console.log("\n[Test 2] Testing exact match priority over generic normalization...");

const compDefs = resolveGearParameters("Compressor", "stomp");
assert(compDefs.length >= 2, "Compressor must have at least 2 resolved parameter definitions");

const normResult = normalizeSettingsToCanonical("Compressor", "stomp", {
  "Comp": 3.0,
  "Level": 6.0,
  "Sensitivity": 4.0
});

console.log("Normalized canonical settings for Compressor:", JSON.stringify(normResult));

assert(normResult["Comp"] !== undefined, "Canonical settings must include 'Comp'");
assert(normResult["Level"] !== undefined, "Canonical settings must include 'Level'");
assert(normResult["Output"] === undefined, "Canonical settings must NOT include 'Output' when 'Level' is valid on Compressor");

console.log("PASSED Test 2: Exact gear parameter match priority verified!");

console.log("\n=== ALL COMPRESSOR RESOLVER TESTS PASSED SUCCESSFULLY ===");
process.exit(0);
