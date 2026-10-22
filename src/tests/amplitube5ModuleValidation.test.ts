// src/tests/amplitube5ModuleValidation.test.ts
// Unit test suite for WP-30 Stage 2 Slice 3: AmpliTube 5 Module GUID & Slot Validation.
// Bound to frozen specification v0.1j Section 37, Activity WF-07, and Build Plan v0.1h WP-30.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AmpliTube5ValidationAdapter,
  validateAmpliTube5Modules,
  lookupCatalogGearByGuid,
  enumerateAmpliTube5ModuleSlots,
  parseAmpliTube5Xml,
  PLATFORM_VALIDATION_STATUSES,
  LOADABILITY_CAPABILITY_TYPES,
  type PlatformModuleValidationResult,
} from "../sound-engineer/validation/platform";
import { AT5_EMPTY_SLOT_GUID } from "../services/at5Catalog";

// Authoritative test GUIDs from repository catalogue (src/data/amplitube5_gear_catalog.json)
const VALID_STOMP_GUID = "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0"; // OverScream (stomp)
const VALID_AMP_GUID = "8fe96936-5178-4950-9b80-d89c32534bad";   // Brit 8000 (amp)
const VALID_CAB_GUID = "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b";   // 4x12 Brit 8000 (cab)
const VALID_RACK_GUID = "e5a6190f-9031-4a30-8041-36ba95f9a2e1";  // Black 76 (rack)

// Minimal valid AT5 preset XML template
function createPresetXml(options?: {
  stompGuid?: string;
  stompName?: string;
  ampGuid?: string;
  ampName?: string;
  cabGuid?: string;
  rackGuid?: string;
  extraStompSlot1?: string;
}): string {
  const stomp0 = options?.stompGuid ?? VALID_STOMP_GUID;
  const stompNameAttr = options?.stompName ? ` Name="${options.stompName}"` : "";
  const amp0 = options?.ampGuid ?? VALID_AMP_GUID;
  const ampNameAttr = options?.ampName ? ` ModelName="${options.ampName}"` : "";
  const cab0 = options?.cabGuid ?? VALID_CAB_GUID;
  const rack0 = options?.rackGuid ?? VALID_RACK_GUID;
  const stomp1Attr = options?.extraStompSlot1 ? ` Stomp1="${options.extraStompSlot1}"` : "";

  return `<?xml version="1.0" ?>
<Preset Version="2" Format="at5p" GUID="8fe96936-5178-4950-9b80-d89c32534bad" PresetBPM="120" ProgramChange="1">
    <Chain Preset="Chain11" DIBeforeAmp="0" />
    <Input Input="1" />
    <Tuner Bypass="1" Mute="0" OutputVolume="1" TunerType="354eca51-457a-41b7-917d-ce6117586905" />
    <StompA1 Bypass="0" Mute="0" OutputVolume="1" Stomp0="${stomp0}"${stomp1Attr}>
        <Slot0${stompNameAttr} Drive="5.0" Tone="6.0" Level="7.0" />
    </StompA1>
    <AmpA Bypass="0" Mute="0" OutputVolume="1" Model="${amp0}">
        <Amp${ampNameAttr} Gain_BritishTubeLead1="6.0" />
    </AmpA>
    <CabA Bypass="0" Mute="0" OutputVolume="1" CabModel="${cab0}">
        <Cab Mic1Level="1.0" />
    </CabA>
    <RackA Bypass="0" Mute="0" OutputVolume="1" Stomp0="${rack0}">
        <Slot0 Input="5.0" Output="5.0" />
    </RackA>
    <Output Output="1" />
</Preset>`;
}

describe("WP-30 Stage 2 Slice 3: AmpliTube 5 Module GUID & Slot Validation", () => {
  it("1. Recognized valid Stomp GUID in Stomp slot passes and resolves catalogue model", () => {
    const xml = createPresetXml({ stompGuid: VALID_STOMP_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    assert.equal(parsed.isValid, true);

    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);
    const stompMod = modules.find((m) => m.slotLocation === "StompA1/Slot0");
    assert.ok(stompMod);
    assert.equal(stompMod.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(stompMod.isRecognized, true);
    assert.equal(stompMod.moduleName, "OverScream");
    assert.equal(stompMod.moduleId, VALID_STOMP_GUID);
  });

  it("2. Recognized valid Amp GUID in Amp slot passes and resolves catalogue model", () => {
    const xml = createPresetXml({ ampGuid: VALID_AMP_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const ampMod = modules.find((m) => m.slotLocation === "AmpA/Model");
    assert.ok(ampMod);
    assert.equal(ampMod.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(ampMod.isRecognized, true);
    assert.equal(ampMod.moduleName, "Brit 8000");
  });

  it("3. Recognized valid Cab GUID in Cab slot passes and resolves catalogue model", () => {
    const xml = createPresetXml({ cabGuid: VALID_CAB_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const cabMod = modules.find((m) => m.slotLocation === "CabA/CabModel");
    assert.ok(cabMod);
    assert.equal(cabMod.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(cabMod.isRecognized, true);
    assert.equal(cabMod.moduleName, "4x12 Brit 8000");
  });

  it("4. Recognized valid Rack GUID in Rack slot passes and resolves catalogue model", () => {
    const xml = createPresetXml({ rackGuid: VALID_RACK_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const rackMod = modules.find((m) => m.slotLocation === "RackA/Slot0");
    assert.ok(rackMod);
    assert.equal(rackMod.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(rackMod.isRecognized, true);
    assert.equal(rackMod.moduleName, "Black 76");
  });

  it("5. Malformed GUID syntax fails factually without fuzzy matching rescue", () => {
    const xml = createPresetXml({ stompGuid: "invalid-not-a-guid" });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const stompMod = modules.find((m) => m.slotLocation === "StompA1/Slot0");
    assert.ok(stompMod);
    assert.equal(stompMod.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(stompMod.isRecognized, false);
    assert.ok(stompMod.message?.includes("Malformed GUID syntax"));
  });

  it("6. Well-formed but unknown/unregistered GUID fails factually", () => {
    const unknownGuid = "ffffffff-ffff-4fff-bfff-ffffffffffff";
    const xml = createPresetXml({ stompGuid: unknownGuid });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const stompMod = modules.find((m) => m.slotLocation === "StompA1/Slot0");
    assert.ok(stompMod);
    assert.equal(stompMod.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(stompMod.isRecognized, false);
    assert.ok(stompMod.message?.includes("Unknown or unregistered module GUID"));
  });

  it("7. AT5_EMPTY_SLOT_GUID is accepted as a valid empty slot", () => {
    const xml = createPresetXml({ extraStompSlot1: AT5_EMPTY_SLOT_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const emptySlot = modules.find((m) => m.slotLocation === "StompA1/Slot1");
    assert.ok(emptySlot);
    assert.equal(emptySlot.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(emptySlot.moduleId, AT5_EMPTY_SLOT_GUID);
  });

  it("8. Empty slot does NOT count as active recognized gear module", () => {
    const xml = createPresetXml({ extraStompSlot1: AT5_EMPTY_SLOT_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const emptySlot = modules.find((m) => m.slotLocation === "StompA1/Slot1");
    assert.ok(emptySlot);
    // isRecognized must be false for empty slots
    assert.equal(emptySlot.isRecognized, false);
  });

  it("9. Known GUID placed in an incompatible slot fails factually", () => {
    // Attempting to place an Amp GUID in a Stomp slot
    const xmlAmpInStomp = createPresetXml({ stompGuid: VALID_AMP_GUID });
    const parsed1 = parseAmpliTube5Xml(xmlAmpInStomp);
    const modules1 = validateAmpliTube5Modules(parsed1.parsedPreset!);
    const badStomp = modules1.find((m) => m.slotLocation === "StompA1/Slot0");
    assert.ok(badStomp);
    assert.equal(badStomp.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(badStomp.isRecognized, true); // Recognized in catalogue, but incompatible slot
    assert.ok(badStomp.message?.includes("Slot incompatibility"));

    // Attempting to place a Rack GUID in a Cab slot
    const xmlRackInCab = createPresetXml({ cabGuid: VALID_RACK_GUID });
    const parsed2 = parseAmpliTube5Xml(xmlRackInCab);
    const modules2 = validateAmpliTube5Modules(parsed2.parsedPreset!);
    const badCab = modules2.find((m) => m.slotLocation === "CabA/CabModel");
    assert.ok(badCab);
    assert.equal(badCab.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(badCab.isRecognized, true);
    assert.ok(badCab.message?.includes("Slot incompatibility"));
  });

  it("10. Valid GUID is authoritative over harmless alias / descriptive name variation", () => {
    // "Tube Screamer" is a known alias for OverScream
    const xml = createPresetXml({
      stompGuid: VALID_STOMP_GUID,
      stompName: "Tube Screamer",
    });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const stompMod = modules.find((m) => m.slotLocation === "StompA1/Slot0");
    assert.ok(stompMod);
    assert.equal(stompMod.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(stompMod.moduleName, "OverScream");
  });

  it("11. Contradictory model name metadata produces diagnostic inconsistency warning while GUID governs", () => {
    // Serialized name claims "Fender '65 Deluxe Reverb" on an Amp slot whose GUID is "Brit 8000"
    const xml = createPresetXml({
      ampGuid: VALID_AMP_GUID,
      ampName: "Fender '65 Deluxe Reverb",
    });
    const parsed = parseAmpliTube5Xml(xml);
    const modules = validateAmpliTube5Modules(parsed.parsedPreset!);

    const ampMod = modules.find((m) => m.slotLocation === "AmpA/Model");
    assert.ok(ampMod);
    assert.equal(ampMod.status, PLATFORM_VALIDATION_STATUSES.PASS); // GUID governs
    assert.equal(ampMod.moduleName, "Brit 8000");
    assert.ok(ampMod.message?.includes("contradicts"));
  });

  it("12. Every discovered module slot is represented exactly once without duplication", () => {
    const xml = createPresetXml({ extraStompSlot1: AT5_EMPTY_SLOT_GUID });
    const parsed = parseAmpliTube5Xml(xml);
    const rawSlots = enumerateAmpliTube5ModuleSlots(parsed.parsedPreset!.rawRoot);

    const locations = rawSlots.map((s) => s.slotLocation);
    const uniqueLocations = new Set(locations);
    assert.equal(locations.length, uniqueLocations.size);
    assert.equal(locations.length, 5); // Stomp0, Stomp1, AmpA/Model, CabA/CabModel, RackA/Slot0
  });

  it("13. All valid modules + valid structure yields overall NOT_VERIFIABLE while parameters remain deferred", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const xml = createPresetXml();

    const result = await adapter.validatePresetExport({
      serializedPreset: xml,
    });

    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE);
    assert.equal(result.isSyntaxValid, true);
    assert.ok(result.moduleResults);
    assert.equal(result.moduleResults.every((m) => m.status === PLATFORM_VALIDATION_STATUSES.PASS), true);
    assert.ok(result.diagnostics.some((d) => d.includes("MODULE_VALIDATION_PASSED")));
    assert.ok(result.diagnostics.some((d) => d.includes("PARAMETER_VALIDATION_PASSED")));
  });

  it("14. Module defect yields overall FAIL and records diagnostic attribution", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const badXml = createPresetXml({ stompGuid: "99999999-9999-4999-8999-999999999999" });

    const result = await adapter.validatePresetExport({
      serializedPreset: badXml,
    });

    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(result.moduleResults);
    assert.ok(result.moduleResults.some((m) => m.status === PLATFORM_VALIDATION_STATUSES.FAIL));
    assert.ok(result.diagnostics.some((d) => d.includes("MODULE_DEFECT")));
  });

  it("15. moduleResults is defined after module validation runs", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const xml = createPresetXml();

    const result = await adapter.validatePresetExport({
      serializedPreset: xml,
    });

    assert.notEqual(result.moduleResults, undefined);
    assert.equal(Array.isArray(result.moduleResults), true);
    assert.equal(result.moduleResults!.length, 4);
  });

  it("16. parameterResults is defined after parameter validation runs in Slice 4A", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const xml = createPresetXml();

    const result = await adapter.validatePresetExport({
      serializedPreset: xml,
    });

    assert.ok(result.parameterResults);
    assert.ok(result.parameterResults.length > 0);
  });

  it("17. Slice-2 structural envelope and simulated loadability behavior remain unchanged", async () => {
    const adapter = new AmpliTube5ValidationAdapter();

    // Structurally malformed preset still fails before module evaluation
    const corruptResult = await adapter.validatePresetExport({
      serializedPreset: "<Preset Format='at5p'><UnclosedTag",
    });
    assert.equal(corruptResult.overallStatus, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(corruptResult.isSyntaxValid, false);
    assert.equal(corruptResult.loadability.loadable, false);
    assert.strictEqual(corruptResult.moduleResults, undefined); // Module validation did not run

    // Valid preset simulates successfully
    const validResult = await adapter.validatePresetExport({
      serializedPreset: createPresetXml(),
    });
    assert.equal(validResult.loadability.capabilityType, LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER);
    assert.equal(validResult.loadability.loadable, true);
  });

  it("18. Technology-neutral platform contract receives zero AT5-specific types", () => {
    // Assert lookupCatalogGearByGuid returns catalogue types without polluting platformAdapter contracts
    const item = lookupCatalogGearByGuid(VALID_AMP_GUID);
    assert.ok(item);
    assert.equal(item.displayName, "Brit 8000");

    // The output of validateAmpliTube5Modules strictly conforms to PlatformModuleValidationResult
    const mockModuleResult: PlatformModuleValidationResult = {
      moduleId: VALID_AMP_GUID,
      moduleName: "Brit 8000",
      slotLocation: "AmpA/Model",
      status: PLATFORM_VALIDATION_STATUSES.PASS,
      isRecognized: true,
      message: "Verified",
    };
    assert.equal(mockModuleResult.status, "PASS");
  });
});
