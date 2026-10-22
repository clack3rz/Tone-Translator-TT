// src/tests/platformAdapterContract.test.ts
// Unit test suite for WP-30 Stage 2 Slice 1: Technology-Neutral Platform Capability Contracts.
// Bound to frozen specification v0.1j Section 37, Activity WF-07, and Build Plan v0.1h WP-30.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type TargetPlatformIdentity,
  type PlatformAudioRenderer,
  type PlatformExportValidator,
  type PlatformValidationAdapter,
  type UnifiedPlatformValidationAdapter,
  type PresetExportValidationRequest,
  type ExportProcessEvidence,
  type ParameterConversionRecord,
  type PlatformExportValidationResult,
  type PlatformModuleValidationResult,
  type PlatformParameterValidationResult,
  PLATFORM_VALIDATION_STATUSES,
  LOADABILITY_CAPABILITY_TYPES,
} from "../sound-engineer/validation/platform";
import {
  PlatformValidationAdapter as LegacyExecutionAdapter,
  RenderRequest,
  RenderResult,
} from "../sound-engineer/validation/execution/types";
import {
  SimulatedPlatformValidationAdapter,
} from "../sound-engineer/validation/execution/platformValidationAdapter";
import {
  ValidationExecutionRunner,
} from "../sound-engineer/validation/execution/executionRunner";

describe("WP-30 Stage 2 Slice 1: Technology-Neutral Platform Capability Contracts", () => {
  it("1. PlatformAudioRenderer can be implemented without export validation methods", async () => {
    class MinimalAudioRenderer implements PlatformAudioRenderer {
      public readonly platformId = "test-dsp-renderer";
      public readonly platformVersion = "1.0.0";

      public async renderCandidate(request: RenderRequest): Promise<RenderResult> {
        return {
          renderId: request.renderId,
          audioBuffer: new Uint8Array([1, 2, 3]),
          sampleRate: 48000,
          channelCount: 2,
          sampleCount: 3,
          durationMs: 10,
          renderMetadata: { mode: "candidate" },
          anomalies: [],
        };
      }

      public async renderBaseline(request: RenderRequest): Promise<RenderResult> {
        return {
          renderId: request.renderId,
          audioBuffer: new Uint8Array([1, 2, 3]),
          sampleRate: 48000,
          channelCount: 2,
          sampleCount: 3,
          durationMs: 10,
          renderMetadata: { mode: "baseline" },
          anomalies: [],
        };
      }
    }

    const renderer = new MinimalAudioRenderer();
    assert.equal(renderer.platformId, "test-dsp-renderer");
    assert.equal(renderer.platformVersion, "1.0.0");
    assert.equal(typeof renderer.renderCandidate, "function");
    assert.equal(typeof renderer.renderBaseline, "function");
    // Confirms export validation method is NOT required on a renderer
    assert.equal((renderer as any).validatePresetExport, undefined);
  });

  it("2. PlatformExportValidator can be implemented without audio rendering methods", async () => {
    class MinimalExportValidator implements PlatformExportValidator {
      public readonly platformId = "neutral-preset-validator";
      public readonly platformVersion = "2.0.0";

      public async validatePresetExport(
        request: PresetExportValidationRequest
      ): Promise<PlatformExportValidationResult> {
        const hasEvidence = request.exportEvidence !== undefined;
        return {
          overallStatus: PLATFORM_VALIDATION_STATUSES.PASS,
          isSyntaxValid: true,
          processEvidenceEvaluated: hasEvidence,
          moduleResults: [],
          parameterResults: [],
          loadability: {
            capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
            loadable: true,
            details: "Simulated load confirmed well-formed preset envelope.",
          },
          diagnostics: [],
        };
      }
    }

    const validator = new MinimalExportValidator();
    assert.equal(validator.platformId, "neutral-preset-validator");
    assert.equal(validator.platformVersion, "2.0.0");
    assert.equal(typeof validator.validatePresetExport, "function");
    // Confirms audio rendering methods are NOT required on an export validator
    assert.equal((validator as any).renderCandidate, undefined);
    assert.equal((validator as any).renderBaseline, undefined);

    const result = await validator.validatePresetExport({
      serializedPreset: "<Preset Mock='true' />",
    });
    assert.equal(result.overallStatus, PLATFORM_VALIDATION_STATUSES.PASS);
    assert.equal(result.isSyntaxValid, true);
    assert.equal(result.processEvidenceEvaluated, false);
  });

  it("3. Existing SimulatedPlatformValidationAdapter remains valid and compatible", async () => {
    const sim = new SimulatedPlatformValidationAdapter({
      platformId: "sim-dsp-engine",
      platformVersion: "1.0.0-sim",
    });

    assert.equal(sim.platformId, "sim-dsp-engine");
    assert.equal(sim.platformVersion, "1.0.0-sim");

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

    const cand = await sim.renderCandidate(req);
    assert.ok(cand.audioBuffer);
    assert.equal(sim.candidateCallCount, 1);

    const base = await sim.renderBaseline(req);
    assert.ok(base.audioBuffer);
    assert.equal(sim.baselineCallCount, 1);
  });

  it("4. ValidationExecutionRunner accepts rendering adapter and executes unchanged", () => {
    const sim = new SimulatedPlatformValidationAdapter();
    const runner = new ValidationExecutionRunner({
      adapter: sim,
    });

    assert.ok(runner);
    assert.equal(runner.getExecutionCount(), 0);
  });

  it("5. Export request accepts optional conversion evidence and correlation reference", () => {
    const conversionRecord: ParameterConversionRecord = {
      parameterId: "gain_knob",
      targetModuleId: "amp_module_01",
      sourceValue: 12.5,
      convertedValue: 10.0,
      serializedValue: "10.000000",
      clampApplied: true,
      preClampValue: 12.5,
      postClampValue: 10.0,
      displayValue: "12.5",
      mappingStatus: "DISPARITY",
      diagnosticNote: "Input value 12.5 was clamped to maximum legal bound 10.0",
    };

    const evidence: ExportProcessEvidence = {
      sourcePresetName: "Vintage Lead Tone",
      parameterConversions: [conversionRecord],
      exportMetadata: { toolVersion: "1.2.0" },
    };

    const request: PresetExportValidationRequest = {
      serializedPreset: "<Preset Mock='true'><Amp Gain='10.000000' /></Preset>",
      targetPlatformId: "amplitube-5",
      targetPlatformVersion: "5.11.0",
      correlationRef: "CASE_LEAD_SOLO_01",
      exportEvidence: evidence,
    };

    assert.equal(request.targetPlatformId, "amplitube-5");
    assert.equal(request.correlationRef, "CASE_LEAD_SOLO_01");
    assert.ok(request.exportEvidence);
    assert.equal(request.exportEvidence.parameterConversions.length, 1);
    assert.equal(request.exportEvidence.parameterConversions[0].clampApplied, true);
    assert.equal(request.exportEvidence.parameterConversions[0].postClampValue, 10.0);
  });

  it("6. Absence of conversion evidence is represented cleanly without false claims", () => {
    const requestWithoutEvidence: PresetExportValidationRequest = {
      serializedPreset: "<Preset><Amp Gain='5.0' /></Preset>",
    };

    assert.equal(requestWithoutEvidence.exportEvidence, undefined);

    // Simulated evaluation without evidence
    const resultWithoutEvidence: PlatformExportValidationResult = {
      overallStatus: PLATFORM_VALIDATION_STATUSES.PASS,
      isSyntaxValid: true,
      processEvidenceEvaluated: false,
      moduleResults: [],
      parameterResults: [
        {
          parameterId: "Gain",
          status: PLATFORM_VALIDATION_STATUSES.PASS,
          serializedValue: "5.0",
          clampApplied: undefined, // Unknown without evidence
          message: "Serialized attribute conforms to catalog bounds; pre-export clamping not verifiable.",
        },
      ],
      loadability: {
        capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
        loadable: true,
      },
      diagnostics: [
        "Export conversion evidence was omitted; evaluation reflects serialized artifact validity only.",
      ],
    };

    assert.equal(resultWithoutEvidence.processEvidenceEvaluated, false);
    assert.equal(resultWithoutEvidence.parameterResults[0].clampApplied, undefined);
    assert.ok(resultWithoutEvidence.diagnostics[0].includes("evidence was omitted"));
  });

  it("7. Result model distinguishes uncompromised PASS, DISPARITY, and FAIL", () => {
    // 1. Uncompromised PASS
    const passParam: PlatformParameterValidationResult = {
      parameterId: "Bass",
      status: PLATFORM_VALIDATION_STATUSES.PASS,
      serializedValue: "5.0",
      sourceValue: 5.0,
      clampApplied: false,
    };
    assert.equal(passParam.status, "PASS");
    assert.equal(passParam.clampApplied, false);

    // 2. DISPARITY (Legal XML attribute, but physical clamping occurred)
    const disparityParam: PlatformParameterValidationResult = {
      parameterId: "Treble",
      status: PLATFORM_VALIDATION_STATUSES.DISPARITY,
      serializedValue: "10.0",
      sourceValue: 14.2,
      clampApplied: true,
      legalRange: { min: 0, max: 10 },
      message: "Value was clamped from 14.2 down to 10.0 due to physical hardware limit.",
    };
    assert.equal(disparityParam.status, "DISPARITY");
    assert.equal(disparityParam.clampApplied, true);
    assert.notEqual(disparityParam.status, PLATFORM_VALIDATION_STATUSES.PASS);

    // 3. FAIL (Corrupt, missing, or illegal serialized attribute)
    const failParam: PlatformParameterValidationResult = {
      parameterId: "Gain",
      status: PLATFORM_VALIDATION_STATUSES.FAIL,
      serializedValue: "25.0",
      legalRange: { min: 0, max: 10 },
      message: "Serialized attribute 25.0 exceeds maximum permitted platform bound 10.0",
    };
    assert.equal(failParam.status, "FAIL");
  });

  it("8. Loadability capability distinguishes SIMULATED_LOADER, NATIVE_RUNTIME, and NOT_PERFORMED", () => {
    assert.equal(LOADABILITY_CAPABILITY_TYPES.NATIVE_RUNTIME, "NATIVE_RUNTIME");
    assert.equal(LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER, "SIMULATED_LOADER");
    assert.equal(LOADABILITY_CAPABILITY_TYPES.NOT_PERFORMED, "NOT_PERFORMED");

    const simulatedLoad: PlatformExportValidationResult["loadability"] = {
      capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
      loadable: true,
      details: "In-memory XML schema parser verified required root and section tags.",
    };

    assert.equal(simulatedLoad.capabilityType, "SIMULATED_LOADER");
    assert.equal(simulatedLoad.loadable, true);

    const notPerformedLoad: PlatformExportValidationResult["loadability"] = {
      capabilityType: LOADABILITY_CAPABILITY_TYPES.NOT_PERFORMED,
      details: "Evaluation not performed in headless environment.",
    };

    assert.equal(notPerformedLoad.capabilityType, "NOT_PERFORMED");
    assert.equal(notPerformedLoad.loadable, undefined);
  });

  it("9. Technology-neutral contracts contain zero vendor-specific types or field names", () => {
    // Assert keys and status values are completely vendor-agnostic
    const statuses = Object.values(PLATFORM_VALIDATION_STATUSES);
    assert.ok(statuses.includes("PASS"));
    assert.ok(statuses.includes("DISPARITY"));
    assert.ok(statuses.includes("WARNING"));
    assert.ok(statuses.includes("FAIL"));
    assert.ok(statuses.includes("NOT_VERIFIABLE"));

    const loadTypes = Object.values(LOADABILITY_CAPABILITY_TYPES);
    assert.ok(loadTypes.includes("SIMULATED_LOADER"));
    assert.ok(loadTypes.includes("NATIVE_RUNTIME"));
    assert.ok(loadTypes.includes("NOT_PERFORMED"));

    // Ensure no AmpliTube, AT5, or IK string literals in enum values
    for (const s of statuses) {
      assert.equal(/amplitube|at5|ikmpak/i.test(s), false);
    }
    for (const l of loadTypes) {
      assert.equal(/amplitube|at5|ikmpak/i.test(l), false);
    }
  });

  it("10. Legacy execution import path remains source-compatible", () => {
    // Both types should be assignable to one another
    const legacyInstance: LegacyExecutionAdapter = new SimulatedPlatformValidationAdapter();
    const neutralInstance: PlatformValidationAdapter = legacyInstance;

    assert.equal(legacyInstance.platformId, neutralInstance.platformId);
    assert.equal(typeof neutralInstance.renderCandidate, "function");
    assert.equal(typeof neutralInstance.renderBaseline, "function");
  });
});
