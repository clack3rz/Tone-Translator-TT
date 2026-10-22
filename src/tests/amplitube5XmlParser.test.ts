// src/tests/amplitube5XmlParser.test.ts
// Unit test suite for WP-30 Stage 2 Slice 2 & Slice 2.1:
// AmpliTube 5 XML Parsing, Simulated Structural Loadability & Incomplete-Capability Verdict.
// Bound to frozen specification v0.1j Section 37, Activity WF-07, and Build Plan v0.1h WP-30.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAmpliTube5Xml,
  simulateAmpliTube5Load,
  AmpliTube5ValidationAdapter,
  PLATFORM_VALIDATION_STATUSES,
  LOADABILITY_CAPABILITY_TYPES,
  type LoadabilityEvaluationResult,
  type PlatformExportValidator,
} from "../sound-engineer/validation/platform";
import { SimulatedPlatformValidationAdapter } from "../sound-engineer/validation/execution/platformValidationAdapter";
import type { RenderRequest } from "../sound-engineer/validation/execution/types";

// Standard well-formed AmpliTube 5 preset fixture
const VALID_AT5_PRESET_XML = `<?xml version="1.0" ?>
<Preset Version="2" Format="at5p" GUID="8fe96936-5178-4950-9b80-d89c32534bad" PresetBPM="120" ProgramChange="1">
    <Chain Preset="Chain11" DIBeforeAmp="0" />
    <Input Input="1" />
    <Tuner Bypass="1" Mute="0" OutputVolume="1" TunerType="354eca51-457a-41b7-917d-ce6117586905">
        <Tuner Reference="440" NoteReferemce="A" Transpose="0" Temperament="Equal" />
    </Tuner>
    <StompA1 Bypass="0" Mute="0" OutputVolume="1" Stomp0="fa1de2e2-102b-4edf-b3b5-23ceaeddedf0">
        <Slot0 Drive="5.0" Tone="6.0" Level="7.0" />
    </StompA1>
    <AmpA Bypass="0" Mute="0" OutputVolume="1" Model="8fe96936-5178-4950-9b80-d89c32534bad">
        <Amp Gain_BritishTubeLead1="6.0" Bass_BritishTubeLead1="5.0" />
    </AmpA>
    <CabA Bypass="0" Mute="0" OutputVolume="1" CabModel="7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b">
        <Cab Mic1Level="1.0" />
    </CabA>
    <RackA Bypass="0" Mute="0" OutputVolume="1" Stomp0="e5a6190f-9031-4a30-8041-36ba95f9a2e1">
        <Slot0 Input="5.0" Output="5.0" />
    </RackA>
    <Output Output="1" />
    <MetaInfo Description="Test Crunch Lead" Style="Rock" />
</Preset>`;

describe("WP-30 Stage 2 Slice 2 & 2.1: AmpliTube 5 XML Parsing & Simulated Structural Loadability", () => {
  it("1. Fail-closed detection for empty, null, or whitespace-only XML input", () => {
    const emptyResult = parseAmpliTube5Xml("");
    assert.equal(emptyResult.isValid, false);
    assert.equal(emptyResult.isSyntaxValid, false);
    assert.ok(emptyResult.errors.some((e) => e.includes("empty")));

    const whitespaceResult = parseAmpliTube5Xml("   \n\t  ");
    assert.equal(whitespaceResult.isValid, false);
    assert.equal(whitespaceResult.isSyntaxValid, false);
    assert.ok(whitespaceResult.errors.some((e) => e.includes("empty") || e.includes("whitespace")));

    const nullResult = parseAmpliTube5Xml(null as unknown as string);
    assert.equal(nullResult.isValid, false);
    assert.equal(nullResult.isSyntaxValid, false);
  });

  it("2. Fail-closed detection for syntactically malformed XML (unclosed tag, bad syntax)", () => {
    const unclosedTagXml = `<Preset Version="2" Format="at5p">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <Output Output="1" />`; // missing closing tag

    const result = parseAmpliTube5Xml(unclosedTagXml);
    assert.equal(result.isValid, false);
    assert.equal(result.isSyntaxValid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].includes("syntax") || result.errors[0].includes("Unclosed"));

    const garbageXml = "<<<not-even-xml>>>???";
    const garbageResult = parseAmpliTube5Xml(garbageXml);
    assert.equal(garbageResult.isValid, false);
    assert.equal(garbageResult.isSyntaxValid, false);
  });

  it("3. Fail-closed detection for valid XML missing the root <Preset> element", () => {
    const missingPresetXml = `<?xml version="1.0" ?>
    <PluginConfiguration Format="at5p" Version="2">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <AmpA Model="test-guid" />
      <Output Output="1" />
    </PluginConfiguration>`;

    const result = parseAmpliTube5Xml(missingPresetXml);
    assert.equal(result.isValid, false);
    assert.equal(result.isSyntaxValid, true); // XML syntax is fine, but envelope structure fails
    assert.ok(result.errors.some((e) => e.includes("<Preset>")));
  });

  it("4. Fail-closed detection for invalid or missing Format attribute (must be 'at5p')", () => {
    const missingFormatXml = `<?xml version="1.0" ?>
    <Preset Version="2">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <AmpA Model="test-guid" />
      <Output Output="1" />
    </Preset>`;

    const missingResult = parseAmpliTube5Xml(missingFormatXml);
    assert.equal(missingResult.isValid, false);
    assert.ok(missingResult.errors.some((e) => e.includes("Format")));

    const wrongFormatXml = `<?xml version="1.0" ?>
    <Preset Version="2" Format="helix-hx">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <AmpA Model="test-guid" />
      <Output Output="1" />
    </Preset>`;

    const wrongResult = parseAmpliTube5Xml(wrongFormatXml);
    assert.equal(wrongResult.isValid, false);
    assert.ok(wrongResult.errors.some((e) => e.includes("helix-hx") && e.includes("at5p")));
  });

  it("5. Fail-closed detection for missing essential routing nodes (Chain, Input, Output)", () => {
    // Missing Chain
    const missingChainXml = `<?xml version="1.0" ?>
    <Preset Version="2" Format="at5p">
      <Input Input="1" />
      <AmpA Model="test-guid" />
      <Output Output="1" />
    </Preset>`;
    const rChain = parseAmpliTube5Xml(missingChainXml);
    assert.equal(rChain.isValid, false);
    assert.ok(rChain.errors.some((e) => e.includes("<Chain>")));

    // Missing Input
    const missingInputXml = `<?xml version="1.0" ?>
    <Preset Version="2" Format="at5p">
      <Chain Preset="Chain11" />
      <AmpA Model="test-guid" />
      <Output Output="1" />
    </Preset>`;
    const rInput = parseAmpliTube5Xml(missingInputXml);
    assert.equal(rInput.isValid, false);
    assert.ok(rInput.errors.some((e) => e.includes("<Input>")));

    // Missing Output
    const missingOutputXml = `<?xml version="1.0" ?>
    <Preset Version="2" Format="at5p">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <AmpA Model="test-guid" />
    </Preset>`;
    const rOutput = parseAmpliTube5Xml(missingOutputXml);
    assert.equal(rOutput.isValid, false);
    assert.ok(rOutput.errors.some((e) => e.includes("<Output>")));
  });

  it("6. Fail-closed detection for empty preset body with zero processing sections", () => {
    const emptySectionsXml = `<?xml version="1.0" ?>
    <Preset Version="2" Format="at5p">
      <Chain Preset="Chain11" />
      <Input Input="1" />
      <Output Output="1" />
    </Preset>`;

    const result = parseAmpliTube5Xml(emptySectionsXml);
    assert.equal(result.isValid, false);
    assert.ok(
      result.errors.some((e) => e.includes("no signal processing or gear blocks"))
    );
  });

  it("7. Successfully parses valid AmpliTube 5 XML preset structure and extracts sections", () => {
    const result = parseAmpliTube5Xml(VALID_AT5_PRESET_XML);
    assert.equal(result.isValid, true);
    assert.equal(result.isSyntaxValid, true);
    assert.equal(result.errors.length, 0);

    const preset = result.parsedPreset;
    assert.ok(preset);
    assert.equal(preset.format, "at5p");
    assert.equal(preset.version, "2");
    assert.equal(preset.guid, "8fe96936-5178-4950-9b80-d89c32534bad");
    assert.equal(preset.presetBpm, "120");
    assert.equal(preset.programChange, "1");
    assert.equal(preset.chain?.preset, "Chain11");
    assert.equal(preset.input?.input, "1");
    assert.equal(preset.output?.output, "1");
    assert.equal(preset.tuner?.bypass, "1");

    assert.ok(preset.detectedSectionNames.includes("StompA1"));
    assert.ok(preset.detectedSectionNames.includes("AmpA"));
    assert.ok(preset.detectedSectionNames.includes("CabA"));
    assert.ok(preset.detectedSectionNames.includes("RackA"));
    assert.ok(preset.detectedSectionNames.includes("Tuner"));
  });

  it("8. In-memory simulated loadability evaluates correctly for valid and invalid presets", () => {
    // Valid preset simulates successfully
    const validLoad = simulateAmpliTube5Load(VALID_AT5_PRESET_XML);
    assert.equal(validLoad.capabilityType, LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER);
    assert.equal(validLoad.loadable, true);
    assert.ok(validLoad.details?.includes("successfully"));

    // Corrupted preset fails simulated load
    const corruptLoad = simulateAmpliTube5Load("<Preset Format='at5p'><Corrupt");
    assert.equal(corruptLoad.capabilityType, LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER);
    assert.equal(corruptLoad.loadable, false);
    assert.ok(corruptLoad.details?.includes("rejected"));
  });

  it("9. Semantic enforcement: loadable must be undefined when capabilityType is NOT_PERFORMED", () => {
    const notPerformed: LoadabilityEvaluationResult = {
      capabilityType: LOADABILITY_CAPABILITY_TYPES.NOT_PERFORMED,
      details: "Headless runner did not perform loadability test.",
    };
    assert.equal(notPerformed.capabilityType, "NOT_PERFORMED");
    assert.equal(notPerformed.loadable, undefined);
    assert.notEqual(notPerformed.loadable, false);
  });

  it("10. AmpliTube5ValidationAdapter returns NOT_VERIFIABLE on valid structural XML at Slice 2 capability level", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    assert.equal(adapter.platformId, "amplitube-5");
    assert.equal(adapter.platformVersion, "5.5.0");

    const result = await adapter.validatePresetExport({
      serializedPreset: VALID_AT5_PRESET_XML,
      targetPlatformId: "amplitube-5",
    });

    // Incomplete-capability verdict: valid syntax and modules cannot claim overall PASS while parameters are deferred
    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE);
    assert.equal(result.isSyntaxValid, true);
    assert.equal(result.loadability.capabilityType, LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER);
    assert.equal(result.loadability.loadable, true);
    assert.equal(result.processEvidenceEvaluated, false);

    // Module validation ran -> moduleResults is defined
    assert.ok(result.moduleResults);
    assert.equal(result.moduleResults.length, 4);
    // Parameter validation ran -> parameterResults is defined with zero failures
    assert.ok(result.parameterResults);
    assert.ok(result.parameterResults.length > 0);

    // Diagnostics explicitly disclose module pass and parameter pass
    assert.ok(result.diagnostics.some((d) => d.includes("MODULE_VALIDATION_PASSED")));
    assert.ok(result.diagnostics.some((d) => d.includes("PARAMETER_VALIDATION_PASSED")));
    assert.ok(result.diagnostics.some((d) => d.includes("INCOMPLETE_CAPABILITY_VERDICT")));
  });

  it("11. AmpliTube5ValidationAdapter preserves factual FAIL on malformed or corrupt XML", async () => {
    const adapter = new AmpliTube5ValidationAdapter();

    const result = await adapter.validatePresetExport({
      serializedPreset: "<Preset Format='at5p'><BrokenTag",
    });

    // Factual failure is preserved; not masked as NOT_VERIFIABLE
    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.FAIL);
    assert.equal(result.isSyntaxValid, false);
    assert.equal(result.loadability.loadable, false);
    assert.equal(result.moduleResults, undefined); // Module validation did not run
    assert.equal(result.parameterResults, undefined);
    assert.ok(result.diagnostics.length > 0);
  });

  it("12. Future PASS boundary: PASS is unavailable until all mandatory validation dimensions are evaluated", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const result = await adapter.validatePresetExport({
      serializedPreset: VALID_AT5_PRESET_XML,
    });

    // Prove PASS is strictly unavailable at Slice 3 capability level
    assert.notEqual(result.overallStatus, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE);
  });

  it("13. Unevaluated checks are distinguishable from verified-zero-defect sets", async () => {
    const adapter = new AmpliTube5ValidationAdapter();
    const result = await adapter.validatePresetExport({
      serializedPreset: VALID_AT5_PRESET_XML,
    });

    // Module validation ran -> defined array with 4 items
    assert.ok(result.moduleResults);
    assert.equal(result.moduleResults.length, 4);

    // Parameter validation ran -> defined array with verified parameters
    assert.ok(result.parameterResults);
    assert.ok(result.parameterResults.length > 0);

    // Process evidence remains unevaluated (false)
    assert.equal(result.processEvidenceEvaluated, false);
  });

  it("14. AmpliTube5ValidationAdapter implements strictly PlatformExportValidator without dummy audio rendering", () => {
    const adapter = new AmpliTube5ValidationAdapter();

    // Verify it implements PlatformExportValidator
    const exportValidator: PlatformExportValidator = adapter;
    assert.equal(typeof exportValidator.validatePresetExport, "function");
    assert.equal(exportValidator.platformId, "amplitube-5");

    // Verify dummy audio rendering methods are absent on the export validator
    assert.strictEqual((adapter as any).renderCandidate, undefined);
    assert.strictEqual((adapter as any).renderBaseline, undefined);
    assert.strictEqual((adapter as any).cancelRender, undefined);
  });

  it("15. Existing SimulatedPlatformValidationAdapter remains the authoritative audio rendering adapter", async () => {
    const simAdapter = new SimulatedPlatformValidationAdapter();
    assert.equal(typeof simAdapter.renderCandidate, "function");
    assert.equal(typeof simAdapter.renderBaseline, "function");

    const sampleBinding: any = {
      binding_id: "bnd_mock_01",
      scope_id: "scope_mock_01",
      architecture_version_matrix: {
        "1C.5h_architecture_version": { version: "v0.1j", integrity_ref: "sha256:mock" },
      },
      runtime_implementation_version: "1.0.0",
      model_configuration_version: "1.0.0",
      deterministic_rules_version: "1.0.0",
      gear_catalog_version: "3.2.0",
      platform_exporter_version: "1.0.0",
      fixture_library_version: "1.0.0",
      target_platform_runtime_version: "1.0.0",
      host_environment_version: "Linux",
      version_integrity_reference: {
        composite_digest: "sha256:mock",
        algorithm: "SHA-256",
        sealed_at: "2026-10-20T00:00:00Z",
      },
    };

    const req: RenderRequest = {
      renderId: "rnd_test_01",
      caseId: "CASE_01",
      subjectId: "Lead Tone",
      fixturePayload: new Uint8Array([1, 2, 3]),
      versionBinding: sampleBinding,
    };

    const res = await simAdapter.renderCandidate(req);
    assert.equal(res.renderId, "rnd_test_01");
    assert.equal(res.sampleRate, 48000);
  });
});
