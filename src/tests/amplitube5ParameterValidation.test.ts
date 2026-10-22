// src/tests/amplitube5ParameterValidation.test.ts
// Unit test suite for WP-30 Stage 2 Slice 4A:
// AmpliTube 5 Serialized Parameter Legality Validation.
// Bound to frozen specification v0.1j Section 37, Activity WF-07, and Build Plan v0.1h WP-30.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAmpliTube5Xml,
  AmpliTube5ValidationAdapter,
  validateAmpliTube5Parameters,
  PLATFORM_VALIDATION_STATUSES,
  validateStepConformance,
  countDecimalPlaces,
  isStructuralOrContainerAttribute,
} from "../sound-engineer/validation/platform";

// Authoritative GUID fixtures from AT5 gear catalog
const STOMP_OVERSCREAM_GUID = "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0"; // OverScream (Drive, Tone, Level 0-10)
const AMP_BRIT8000_GUID = "8fe96936-5178-4950-9b80-d89c32534bad";     // Brit 8000 (Gain, Bass, Treble, etc. 0-10)
const AMP_DARRELL100_GUID = "cfa6b70c-2c6c-4b83-b881-571a6343dfac";   // Darrell 100 (multi-channel selector amp)
const CAB_BRIT8000_GUID = "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b";     // 4x12 Brit 8000
const RACK_FENDER_COMP_GUID = "7307c816-856f-438b-a381-45edf43bee0b"; // Fender Compressor (OutLevel 0.177828-5.62341)
const RACK_BLACK76_GUID = "e5a6190f-9031-4a30-8041-36ba95f9a2e1";     // Black 76

/**
 * Builds a test AT5 preset XML with configurable module parameters.
 */
function createParamTestXml(options?: {
  stompGuid?: string;
  stompParams?: string;
  ampGuid?: string;
  ampParams?: string;
  cabGuid?: string;
  cabParams?: string;
  rackGuid?: string;
  rackParams?: string;
  extraEnvelopeAttrs?: string;
}): string {
  const stompGuid = options?.stompGuid ?? STOMP_OVERSCREAM_GUID;
  const stompParams = options?.stompParams ?? 'Drive="5.0" Tone="6.0" Level="7.0"';
  const ampGuid = options?.ampGuid ?? AMP_BRIT8000_GUID;
  const ampParams = options?.ampParams ?? 'Gain_BritishTubeLead1="6.0" Bass_BritishTubeLead1="5.0"';
  const cabGuid = options?.cabGuid ?? CAB_BRIT8000_GUID;
  const cabParams = options?.cabParams ?? 'Mic1Level="1.0"';
  const rackGuid = options?.rackGuid ?? RACK_BLACK76_GUID;
  const rackParams = options?.rackParams ?? 'Input="5.0" Output="5.0"';
  const extraEnv = options?.extraEnvelopeAttrs ?? "";

  return `<?xml version="1.0" ?>
<Preset Version="2" Format="at5p" GUID="8fe96936-5178-4950-9b80-d89c32534bad" PresetBPM="120" ProgramChange="1"${extraEnv}>
    <Chain Preset="Chain11" DIBeforeAmp="0" />
    <Input Input="1" />
    <Tuner Bypass="1" Mute="0" OutputVolume="1" TunerType="354eca51-457a-41b7-917d-ce6117586905" />
    <StompA1 Bypass="0" Mute="0" OutputVolume="1" Stomp0="${stompGuid}">
        <Slot0 ${stompParams} />
    </StompA1>
    <AmpA Bypass="0" Mute="0" OutputVolume="1" Model="${ampGuid}">
        <Amp ${ampParams} />
    </AmpA>
    <CabA Bypass="0" Mute="0" OutputVolume="1" CabModel="${cabGuid}">
        <Cab ${cabParams} />
    </CabA>
    <RackA Bypass="0" Mute="0" OutputVolume="1" Stomp0="${rackGuid}">
        <Slot0 ${rackParams} />
    </RackA>
    <Output Output="1" />
</Preset>`;
}

describe("WP-30 Stage 2 Slice 4A: Serialized AT5 Parameter Legality Validation", () => {
  const adapter = new AmpliTube5ValidationAdapter();

  it("1. Valid numeric parameter inside export range passes", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="5.0" Tone="6.5" Level="7.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    assert.equal(parsed.isValid, true);

    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(driveResult.serializedValue, "5.0");
    assert.ok(driveResult.legalRange);
    assert.equal(driveResult.legalRange.min, 0);
    assert.equal(driveResult.legalRange.max, 10);
  });

  it("2. Exact exportMin accepted", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="0.0" Tone="5.0" Level="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(driveResult.serializedValue, "0.0");
  });

  it("3. Exact exportMax accepted", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="10.0" Tone="5.0" Level="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(driveResult.serializedValue, "10.0");
  });

  it("4. Below exportMin fails", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="-0.5" Tone="5.0" Level="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(driveResult.message?.includes("below authoritative exportMin"));
  });

  it("5. Above exportMax fails", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="11.5" Tone="5.0" Level="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(driveResult.message?.includes("exceeds authoritative exportMax"));
  });

  it("6. Non-numeric value fails for numeric parameter", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="maximum_gain" Tone="5.0" Level="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveResult = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveResult);
    assert.equal(driveResult.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(driveResult.message?.includes("Non-numeric"));
  });

  it("7. Unknown/unmapped parameter handled fail-closed", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="5.0" UnmappedBogusKnob="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const bogusResult = paramResults.find((p) => p.parameterId === "UnmappedBogusKnob");
    assert.ok(bogusResult);
    assert.equal(bogusResult.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(bogusResult.message?.includes("Unknown or unmapped"));
  });

  it("8. Metadata/envelope attribute is not misclassified as gear parameter", () => {
    const xml = createParamTestXml({
      extraEnvelopeAttrs: ' FullScreen="0" GuiLoadComplete="1"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    const envelopeKeys = ["Bypass", "Mute", "OutputVolume", "FullScreen", "PresetBPM", "ProgramChange"];
    for (const envKey of envelopeKeys) {
      assert.equal(
        paramResults.some((p) => p.parameterId.toLowerCase() === envKey.toLowerCase()),
        false,
        `Envelope attribute ${envKey} should not appear in parameterResults`
      );
    }
  });

  it("9. Parameter XML name resolves through existing manifest mapping", () => {
    const xml = createParamTestXml({
      ampParams: 'Gain_BritishTubeLead1="6.0" Bass_BritishTubeLead1="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const gainParam = paramResults.find((p) => p.parameterId === "Gain_BritishTubeLead1");
    assert.ok(gainParam);
    assert.equal(gainParam.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(gainParam.legalRange?.min, 0);
    assert.equal(gainParam.legalRange?.max, 10);
  });

  it("10. Selector-dependent parameter uses correct active selector bank", () => {
    // Darrell 100 has Channel_Darrell100 selector. When "0", Gain1_Darrell100 is active Channel 1 Gain.
    const xml = createParamTestXml({
      ampGuid: AMP_DARRELL100_GUID,
      ampParams: 'Channel_Darrell100="0" Gain1_Darrell100="6.5" Master1_Darrell100="7.0" Bass_Darrell100="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    const channelParam = paramResults.find((p) => p.parameterId === "Channel_Darrell100");
    assert.ok(channelParam);
    assert.equal(channelParam.status, PLATFORM_VALIDATION_STATUSES.PASS);

    const gain1Param = paramResults.find((p) => p.parameterId === "Gain1_Darrell100");
    assert.ok(gain1Param);
    assert.equal(gain1Param.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(gain1Param.legalRange?.min, 0);
    assert.equal(gain1Param.legalRange?.max, 10);
  });

  it("11. Unresolved selector context does not guess (returns NOT_VERIFIABLE)", () => {
    // Darrell 100 with selector missing from preset, but selector-dependent Gain1_Darrell100 present
    const xml = createParamTestXml({
      ampGuid: AMP_DARRELL100_GUID,
      ampParams: 'Gain1_Darrell100="6.5" Bass_Darrell100="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    const gain1Param = paramResults.find((p) => p.parameterId === "Gain1_Darrell100");
    assert.ok(gain1Param);
    assert.equal(gain1Param.status, PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE);
    assert.ok(gain1Param.message?.includes("Selector context unresolved"));

    // Non-selector-dependent parameter (Bass) should still pass
    const bassParam = paramResults.find((p) => p.parameterId === "Bass_Darrell100");
    assert.ok(bassParam);
    assert.equal(bassParam.status, PLATFORM_VALIDATION_STATUSES.PASS);
  });

  it("12. Valid transformed/internal AT5 value not compared against display-domain bounds incorrectly", () => {
    // Fender Compressor: OutLevel authoritative export bounds are [0.177828, 5.62341] (linear float)
    // Display domain is [-15, +15] dB. Serialized value "1.0" represents 0 dB linear float.
    const xml = createParamTestXml({
      rackGuid: RACK_FENDER_COMP_GUID,
      rackParams: 'OutLevel="1.0" Volume="0.5"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    const outLevel = paramResults.find((p) => p.parameterId === "OutLevel");
    assert.ok(outLevel);
    assert.equal(outLevel.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(outLevel.legalRange?.min, 0.177828);
    assert.equal(outLevel.legalRange?.max, 5.62341);

    // Below authoritative linear min (e.g. 0.1 < 0.177828) fails, even though 0.1 is in [0, 10]
    const failXml = createParamTestXml({
      rackGuid: RACK_FENDER_COMP_GUID,
      rackParams: 'OutLevel="0.1" Volume="0.5"',
    });
    const failParsed = parseAmpliTube5Xml(failXml);
    const failResults = validateAmpliTube5Parameters(failParsed.parsedPreset!);
    const failOutLevel = failResults.find((p) => p.parameterId === "OutLevel");
    assert.ok(failOutLevel);
    assert.equal(failOutLevel.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(failOutLevel.message?.includes("below authoritative exportMin"));
  });

  it("13. exportStep enforced only where authoritative", () => {
    // OverScream has continuous knobs without exportStep, so any valid float passes
    const xml = createParamTestXml({
      stompParams: 'Drive="5.333333" Tone="6.0" Level="7.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);
    const driveParam = paramResults.find((p) => p.parameterId === "Drive");
    assert.ok(driveParam);
    assert.equal(driveParam.status, PLATFORM_VALIDATION_STATUSES.PASS);
  });

  it("14. exportPrecision formatting guidance semantics match repository behavior", () => {
    // Both 6.5 and 6.50 parse as 6.5 and validate cleanly within export bounds
    const xml1 = createParamTestXml({ stompParams: 'Drive="6.5"' });
    const xml2 = createParamTestXml({ stompParams: 'Drive="6.50"' });

    const p1 = validateAmpliTube5Parameters(parseAmpliTube5Xml(xml1).parsedPreset!);
    const p2 = validateAmpliTube5Parameters(parseAmpliTube5Xml(xml2).parsedPreset!);

    assert.equal(p1.find((p) => p.parameterId === "Drive")?.status, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(p2.find((p) => p.parameterId === "Drive")?.status, PLATFORM_VALIDATION_STATUSES.PASS);
  });

  it("15. Every applicable serialized parameter enumerated exactly once", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="5.0" Tone="6.0" Level="7.0"',
      ampParams: 'Gain_BritishTubeLead1="6.0" Bass_BritishTubeLead1="5.0"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    // Check unique parameter identification per module
    const keys = paramResults.map((p) => `${p.moduleId}::${p.parameterId}`);
    const uniqueKeys = new Set(keys);
    assert.equal(keys.length, uniqueKeys.size, "No duplicate parameter evaluations");
  });

  it("16. parameterResults is defined after successful parameter validation", async () => {
    const xml = createParamTestXml();
    const result = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: xml,
    });

    assert.ok(result.parameterResults);
    assert.ok(Array.isArray(result.parameterResults));
    assert.ok(result.parameterResults.length > 0);
  });

  it("17. moduleResults remains intact when parameter validation runs", async () => {
    const xml = createParamTestXml();
    const result = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: xml,
    });

    assert.ok(result.moduleResults);
    assert.ok(Array.isArray(result.moduleResults));
    assert.ok(result.moduleResults.length > 0);
    assert.ok(result.moduleResults.every((m) => m.status === PLATFORM_VALIDATION_STATUSES.PASS));
  });

  it("18. Any parameter defect causes overall FAIL", async () => {
    // Valid structure, valid module GUIDs, but Drive parameter is out of range (15.0 > 10.0)
    const xml = createParamTestXml({
      stompParams: 'Drive="15.0" Tone="6.0" Level="7.0"',
    });
    const result = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: xml,
    });

    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(result.parameterResults);
    const failedParam = result.parameterResults.find((p) => p.status === PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(failedParam);
    assert.equal(failedParam.parameterId, "Drive");
    assert.ok(result.diagnostics.some((d) => d.includes("PARAMETER_DEFECT")));
  });

  it("19. All serialized parameters valid still yields overall NOT_VERIFIABLE", async () => {
    // Valid structure, valid modules, valid parameters, but process evidence is unevaluated
    const xml = createParamTestXml();
    const result = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: xml,
    });

    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE);
    assert.equal(result.isSyntaxValid, true);
    assert.ok(result.diagnostics.some((d) => d.includes("PARAMETER_VALIDATION_PASSED")));
    assert.ok(result.diagnostics.some((d) => d.includes("EXPORT_EVIDENCE_NOT_EVALUATED")));
  });

  it("20. processEvidenceEvaluated remains strictly false", async () => {
    // Case A: all parameters valid
    const passXml = createParamTestXml();
    const passResult = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: passXml,
    });
    assert.equal(passResult.processEvidenceEvaluated, false);

    // Case B: failing parameter
    const failXml = createParamTestXml({ stompParams: 'Drive="999.0"' });
    const failResult = await adapter.validatePresetExport({
      targetPlatformId: "amplitube-5",
      serializedPreset: failXml,
    });
    assert.equal(failResult.processEvidenceEvaluated, false);
  });

  it("21. validateStepConformance uses exact decimal integer scaling without arbitrary epsilons or multipliers", () => {
    // A: Decimal places calculation
    assert.equal(countDecimalPlaces("2.5"), 1);
    assert.equal(countDecimalPlaces(0.05), 2);
    assert.equal(countDecimalPlaces("10"), 0);
    assert.equal(countDecimalPlaces("0.000001"), 6);

    // B: Exact decimal stepped parameter (exportMin: 0.1, step: 0.1)
    // In raw IEEE-754 floats: (0.3 - 0.1) % 0.1 != 0 due to 0.19999999999999996
    // In exact decimal integer scaling: (3 - 1) % 1 === 0 with zero tolerance multiplier
    const stepDef = { friendlyName: "Test", xmlName: "Test", min: 0.1, max: 1.0, exportStep: 0.1 };
    const passResult = validateStepConformance(0.3, "0.3", 0.1, 0.1, stepDef as any);
    assert.equal(passResult.conforms, true);
    assert.equal(passResult.verifiable, true);

    const failResult = validateStepConformance(0.35, "0.35", 0.1, 0.1, stepDef as any);
    assert.equal(failResult.conforms, false);
    assert.equal(failResult.verifiable, true);
    assert.ok(failResult.reason?.includes("not an exact multiple"));

    // C: Option rows match check
    const optDef = {
      friendlyName: "Switch",
      xmlName: "Switch",
      min: 0,
      max: 2,
      exportStep: 1,
      optionRows: [
        { id: "1", displayLabel: "Clean", exportValue: 0, aliases: [], sortOrder: 0 },
        { id: "2", displayLabel: "Crunch", exportValue: 1, aliases: [], sortOrder: 1 },
      ],
    };
    const optPass = validateStepConformance(1, "1", 0, 1, optDef as any);
    assert.equal(optPass.conforms, true);

    // D: Scale exceeding safe integer limit (>8 decimals) returns verifiable: false
    const excessiveDecResult = validateStepConformance(0.1234567891, "0.1234567891", 0, 0.1, stepDef as any);
    assert.equal(excessiveDecResult.verifiable, false);
  });

  it("22. Step origin semantics evaluate relative to exportMin rather than zero", () => {
    // Concrete Example: Tube Compressor Ratio has exportMin: 1.5, exportStep: 0.5, exportMax: 4.5
    // Valid values are 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5.
    // Relative to exportMin (1.5):
    // - 2.0 offset is 0.5 (1 * 0.5) -> PASS
    // - 2.2 offset is 0.7 -> FAIL
    // - 1.5 offset is 0.0 (0 * 0.5) -> PASS
    // If evaluated relative to zero:
    // 1.5 % 0.5 === 0 and 2.0 % 0.5 === 0, but if exportMin were 1.3:
    // (1.8 - 1.3) % 0.5 === 0, whereas 1.8 % 0.5 === 0.3 != 0.
    const ratioDef = {
      friendlyName: "Ratio",
      xmlName: "Ratio",
      min: 1.5,
      max: 4.5,
      exportStep: 0.5,
    };

    // 2.0 (exact step 1 from min 1.5)
    const valid20 = validateStepConformance(2.0, "2.0", 1.5, 0.5, ratioDef as any);
    assert.equal(valid20.conforms, true);
    assert.equal(valid20.verifiable, true);

    // 1.5 (exact step 0 from min 1.5)
    const valid15 = validateStepConformance(1.5, "1.5", 1.5, 0.5, ratioDef as any);
    assert.equal(valid15.conforms, true);

    // 2.2 (offset 0.7 is not multiple of 0.5 from min 1.5)
    const invalid22 = validateStepConformance(2.2, "2.2", 1.5, 0.5, ratioDef as any);
    assert.equal(invalid22.conforms, false);
    assert.equal(invalid22.verifiable, true);
    assert.ok(invalid22.reason?.includes("not an exact multiple"));
  });

  it("23. isStructuralOrContainerAttribute excludes known module/slot metadata without treating it as unknown gear parameter", () => {
    // Structural envelope controls
    assert.equal(isStructuralOrContainerAttribute("Bypass", "stomp"), true);
    assert.equal(isStructuralOrContainerAttribute("Mute", "amp"), true);
    assert.equal(isStructuralOrContainerAttribute("OutputVolume", "amp"), true);
    assert.equal(isStructuralOrContainerAttribute("FullScreen", "stomp"), true);
    assert.equal(isStructuralOrContainerAttribute("GuiLoadComplete", "cab"), true);

    // Module identity attributes
    assert.equal(isStructuralOrContainerAttribute("Model", "amp"), true);
    assert.equal(isStructuralOrContainerAttribute("CabModel", "cab"), true);
    assert.equal(isStructuralOrContainerAttribute("Name", "stomp"), true);
    assert.equal(isStructuralOrContainerAttribute("ModelName", "amp"), true);
    assert.equal(isStructuralOrContainerAttribute("Stomp0", "stomp"), true);
    assert.equal(isStructuralOrContainerAttribute("Slot0", "stomp"), true);

    // Cabinet acoustic topology (in cab family)
    assert.equal(isStructuralOrContainerAttribute("Mic0Angle", "cab"), true);
    assert.equal(isStructuralOrContainerAttribute("RoomType", "cab"), true);
    assert.equal(isStructuralOrContainerAttribute("HighLevel", "cab"), true);
    assert.equal(isStructuralOrContainerAttribute("SpeakerModel0", "cab"), true);

    // Genuine gear parameters must NOT be classified as structural/container
    assert.equal(isStructuralOrContainerAttribute("Drive", "stomp"), false);
    assert.equal(isStructuralOrContainerAttribute("Tone", "stomp"), false);
    assert.equal(isStructuralOrContainerAttribute("Gain_BritishTubeLead1", "amp"), false);
    assert.equal(isStructuralOrContainerAttribute("UnexpectedGearKnob", "stomp"), false);
  });

  it("24. Genuine unknown gear parameter still fails closed while structural metadata is ignored", () => {
    const xml = createParamTestXml({
      stompParams: 'Drive="5.0" Tone="6.0" Level="7.0" Bypass="0" FullScreen="0" GenuineUnknownKnob="3.5"',
    });
    const parsed = parseAmpliTube5Xml(xml);
    const paramResults = validateAmpliTube5Parameters(parsed.parsedPreset!);

    // Bypass and FullScreen must NOT appear in parameterResults
    assert.equal(paramResults.some((p) => p.parameterId === "Bypass"), false);
    assert.equal(paramResults.some((p) => p.parameterId === "FullScreen"), false);

    // GenuineUnknownKnob MUST be evaluated and FAIL closed
    const unknownParam = paramResults.find((p) => p.parameterId === "GenuineUnknownKnob");
    assert.ok(unknownParam);
    assert.equal(unknownParam.status, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.ok(unknownParam.message?.includes("Unknown or unmapped"));
  });

  it("25. Negative range step progression and scientific notation evidence closure", () => {
    // 1. Negative range stepped progression based on Rack Graphic EQ (Gain31Hz: min -12.0, max 12.0, step 1.0)
    const eqDef = {
      friendlyName: "31Hz",
      xmlName: "Gain31Hz",
      min: -12.0,
      max: 12.0,
      exportStep: 1.0,
    };

    // A: Exact minimum (-12.0): offset is 0
    const minCheck = validateStepConformance(-12.0, "-12.0", -12.0, 1.0, eqDef as any);
    assert.equal(minCheck.conforms, true);
    assert.equal(minCheck.verifiable, true);

    // B: Valid stepped value crossing zero (0.0): offset is 12 (12 * 1.0)
    const zeroCheck = validateStepConformance(0.0, "0.0", -12.0, 1.0, eqDef as any);
    assert.equal(zeroCheck.conforms, true);
    assert.equal(zeroCheck.verifiable, true);

    // C: Valid negative stepped value (-10.0): offset is 2 (2 * 1.0)
    const negCheck = validateStepConformance(-10.0, "-10.0", -12.0, 1.0, eqDef as any);
    assert.equal(negCheck.conforms, true);
    assert.equal(negCheck.verifiable, true);

    // D: Off-step value (-10.5): offset is 1.5, not a multiple of 1.0
    const offStepCheck = validateStepConformance(-10.5, "-10.5", -12.0, 1.0, eqDef as any);
    assert.equal(offStepCheck.conforms, false);
    assert.equal(offStepCheck.verifiable, true);
    assert.ok(offStepCheck.reason?.includes("not an exact multiple"));

    // 2. Scientific notation parsing in countDecimalPlaces
    assert.equal(countDecimalPlaces("1e-5"), 5);
    assert.equal(countDecimalPlaces("1.5e-3"), 4);
    assert.equal(countDecimalPlaces(1e-7), 7);
  });
});

