// src/sound-engineer/validation/platform/amplitube5Adapter.ts
// AmpliTube 5 platform validation adapter implementing technology-neutral contracts.
// Bound to Phase 1C.5h WP-30 Stage 2 Slice 4A.

import {
  type PlatformExportValidator,
  type PresetExportValidationRequest,
  type PlatformExportValidationResult,
  PLATFORM_VALIDATION_STATUSES,
  LOADABILITY_CAPABILITY_TYPES,
} from "./platformAdapter";
import {
  parseAmpliTube5Xml,
  simulateAmpliTube5Load,
} from "./amplitube5XmlParser";
import {
  validateAmpliTube5Modules,
} from "./amplitube5ModuleValidator";
import {
  validateAmpliTube5Parameters,
} from "./amplitube5ParameterValidator";
import {
  evaluateAmpliTube5ExportEvidence,
} from "./amplitube5ExportEvidence";

/**
 * Configuration options for AmpliTube5ValidationAdapter.
 */
export interface AmpliTube5AdapterOptions {
  /** Target platform version string (defaults to "5.5.0") */
  readonly platformVersion?: string;
}

/**
 * Concrete AmpliTube 5 validation adapter.
 * Implements the technology-neutral PlatformExportValidator capability contract.
 * Validates preset artifact syntax, structural integrity, simulated loadability,
 * gear module GUID identities, serialized parameter legality against authoritative specifications,
 * and export-process conversion evidence (clamping, disparity, mapping integrity).
 */
export class AmpliTube5ValidationAdapter implements PlatformExportValidator {
  public readonly platformId = "amplitube-5";
  public readonly platformVersion: string;

  constructor(options?: AmpliTube5AdapterOptions) {
    this.platformVersion = options?.platformVersion ?? "5.5.0";
  }

  /**
   * Validates an exported AmpliTube 5 preset artifact against:
   * 1. XML syntax and structural envelope integrity;
   * 2. Simulated in-memory structural loadability;
   * 3. Gear module GUIDs, catalogue membership, and slot compatibility (Slice 3);
   * 4. Serialized parameter attribute legality against authoritative bounds (Slice 4A);
   * 5. Export-process evidence integrity, pre-export clamping, and disparity detection (Slice 4B).
   */
  public async validatePresetExport(
    request: PresetExportValidationRequest
  ): Promise<PlatformExportValidationResult> {
    const diagnostics: string[] = [];

    // 1. Target platform ID assertion if specified
    if (request.targetPlatformId && request.targetPlatformId !== this.platformId) {
      diagnostics.push(
        `Target platform mismatch: request specified "${request.targetPlatformId}", but adapter is "${this.platformId}".`
      );
    }

    // 2. Parse and structurally validate preset XML
    const structuralResult = parseAmpliTube5Xml(request.serializedPreset);

    // 3. Factual fail-closed on syntax or structural envelope failure
    if (!structuralResult.isValid) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.FAIL,
        isSyntaxValid: structuralResult.isSyntaxValid,
        processEvidenceEvaluated: false,
        moduleResults: undefined, // Module validation did not run due to structural failure
        parameterResults: undefined, // Parameter validation did not run due to structural failure
        loadability: {
          capabilityType: LOADABILITY_CAPABILITY_TYPES.SIMULATED_LOADER,
          loadable: false,
          details: `Simulated AT5 in-memory loader rejected preset: ${structuralResult.errors.join("; ")}`,
        },
        diagnostics: [
          ...diagnostics,
          ...structuralResult.errors,
          ...structuralResult.warnings,
        ],
      };
    }

    // 4. In-memory simulated loadability evaluation
    const loadability = simulateAmpliTube5Load(request.serializedPreset);

    // 5. Gear module GUID, catalogue membership, and slot compatibility validation (Slice 3)
    const moduleResults = validateAmpliTube5Modules(structuralResult.parsedPreset!);
    const hasModuleFailure = moduleResults.some(
      (m) => m.status === PLATFORM_VALIDATION_STATUSES.FAIL
    );

    // Collect module diagnostic messages
    const moduleDiagnostics: string[] = [];
    for (const m of moduleResults) {
      if (m.status === PLATFORM_VALIDATION_STATUSES.FAIL && m.message) {
        moduleDiagnostics.push(`MODULE_DEFECT [${m.slotLocation}]: ${m.message}`);
      }
    }

    // 6. Serialized parameter attribute legality validation (Slice 4A)
    const rawParameterResults = validateAmpliTube5Parameters(structuralResult.parsedPreset!);

    // 7. Export-process evidence evaluation (Slice 4B)
    const exportEvidence = request.exportEvidence;
    const processEvidenceEvaluated = exportEvidence !== undefined;

    let parameterResults = rawParameterResults;
    let evidenceDiagnostics: string[] = [];
    let hasClamping = false;
    let hasDisparity = false;
    let hasMappingFailure = false;
    let isEvidenceComplete = false;

    if (processEvidenceEvaluated) {
      const evidenceEval = evaluateAmpliTube5ExportEvidence(
        rawParameterResults,
        exportEvidence
      );
      parameterResults = evidenceEval.correlatedParameterResults;
      evidenceDiagnostics = [...evidenceEval.diagnostics];
      hasClamping = evidenceEval.clampCount > 0;
      hasDisparity = evidenceEval.disparityCount > 0;
      hasMappingFailure = evidenceEval.failureCount > 0;
      isEvidenceComplete = evidenceEval.isComplete;
    }

    // Check for parameter-level failures (either serialized legality or evidence mapping)
    const hasParameterFailure = parameterResults.some(
      (p) => p.status === PLATFORM_VALIDATION_STATUSES.FAIL
    );

    // Collect parameter diagnostic messages
    const parameterDiagnostics: string[] = [];
    for (const p of parameterResults) {
      if (p.status === PLATFORM_VALIDATION_STATUSES.FAIL && p.message) {
        parameterDiagnostics.push(`PARAMETER_DEFECT [${p.moduleId}/${p.parameterId}]: ${p.message}`);
      }
    }

    // 8. Overall verdict determination (Slice 4B hierarchy):
    // Priority 1: Any module or parameter failure -> FAIL
    if (hasModuleFailure || hasParameterFailure || hasMappingFailure) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.FAIL,
        isSyntaxValid: true,
        processEvidenceEvaluated,
        moduleResults,
        parameterResults,
        loadability,
        diagnostics: [
          ...diagnostics,
          ...structuralResult.warnings,
          ...moduleDiagnostics,
          ...parameterDiagnostics,
          ...evidenceDiagnostics,
          hasModuleFailure
            ? "MODULE_VALIDATION_FAILED: One or more module slots failed GUID syntax, catalogue resolution, or slot compatibility."
            : "MODULE_VALIDATION_PASSED",
          hasParameterFailure
            ? "PARAMETER_VALIDATION_FAILED: One or more parameters failed legality or export evidence integrity."
            : "PARAMETER_VALIDATION_PASSED",
        ],
      };
    }

    // Priority 2: Process evidence not evaluated -> NOT_VERIFIABLE
    if (!processEvidenceEvaluated) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
        isSyntaxValid: true,
        processEvidenceEvaluated: false,
        moduleResults,
        parameterResults,
        loadability,
        diagnostics: [
          ...diagnostics,
          ...structuralResult.warnings,
          `MODULE_VALIDATION_PASSED: All ${moduleResults.length} enumerated module slots verified against AmpliTube 5 gear catalog.`,
          `PARAMETER_VALIDATION_PASSED: All ${parameterResults.length} serialized parameters verified against authoritative AmpliTube 5 parameter export specifications.`,
          "EXPORT_EVIDENCE_NOT_EVALUATED: Export-process/clamping evidence was not supplied.",
          "INCOMPLETE_CAPABILITY_VERDICT: Structural envelope, module identities, and serialized parameter bounds verified, but full export verification requires export clamping process evaluation. Overall disposition remains NOT_VERIFIABLE.",
        ],
      };
    }

    // Priority 3: Incomplete evidence, unresolved parameters, or unexplained orphan evidence -> NOT_VERIFIABLE
    // Enforced strictly before DISPARITY so an incomplete verification never masquerades as a verified DISPARITY.
    if (
      !isEvidenceComplete ||
      parameterResults.some((p) => p.status === PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE)
    ) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
        isSyntaxValid: true,
        processEvidenceEvaluated: true,
        moduleResults,
        parameterResults,
        loadability,
        diagnostics: [
          ...diagnostics,
          ...structuralResult.warnings,
          ...evidenceDiagnostics,
          `MODULE_VALIDATION_PASSED: All ${moduleResults.length} enumerated module slots verified against AmpliTube 5 gear catalog.`,
          "INCOMPLETE_PROCESS_EVIDENCE: One or more serialized parameters lack complete export conversion evidence or unexplained orphan evidence was detected. Full PASS requires complete evidence.",
        ],
      };
    }

    // Priority 4: Fully verified, but clamping or disparity detected -> DISPARITY
    if (
      hasClamping ||
      hasDisparity ||
      parameterResults.some((p) => p.status === PLATFORM_VALIDATION_STATUSES.DISPARITY)
    ) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.DISPARITY,
        isSyntaxValid: true,
        processEvidenceEvaluated: true,
        moduleResults,
        parameterResults,
        loadability,
        diagnostics: [
          ...diagnostics,
          ...structuralResult.warnings,
          ...evidenceDiagnostics,
          `MODULE_VALIDATION_PASSED: All ${moduleResults.length} enumerated module slots verified against AmpliTube 5 gear catalog.`,
          `PARAMETER_LEGALITY_PASSED: Serialized XML parameter values are legal, but pre-export clamping or conversion disparity occurred.`,
          "DISPARITY_DETECTED: Target-platform artifact is valid, but source value required clamping or was altered during export.",
        ],
      };
    }

    // Priority 5: Any parameter WARNING -> WARNING
    if (parameterResults.some((p) => p.status === PLATFORM_VALIDATION_STATUSES.WARNING)) {
      return {
        overallStatus: PLATFORM_VALIDATION_STATUSES.WARNING,
        isSyntaxValid: true,
        processEvidenceEvaluated: true,
        moduleResults,
        parameterResults,
        loadability,
        diagnostics: [
          ...diagnostics,
          ...structuralResult.warnings,
          ...evidenceDiagnostics,
          `MODULE_VALIDATION_PASSED: All ${moduleResults.length} enumerated module slots verified against AmpliTube 5 gear catalog.`,
          "EXPORT_VALIDATION_WARNING: Valid artifact with non-fatal conversion warnings.",
        ],
      };
    }

    // Priority 6: All dimensions affirmatively verified -> PASS
    return {
      overallStatus: PLATFORM_VALIDATION_STATUSES.PASS,
      isSyntaxValid: true,
      processEvidenceEvaluated: true,
      moduleResults,
      parameterResults,
      loadability,
      diagnostics: [
        ...diagnostics,
        ...structuralResult.warnings,
        ...evidenceDiagnostics,
        `MODULE_VALIDATION_PASSED: All ${moduleResults.length} enumerated module slots verified against AmpliTube 5 gear catalog.`,
        `PARAMETER_VALIDATION_PASSED: All ${parameterResults.length} serialized parameters verified against authoritative AmpliTube 5 parameter export specifications.`,
        "EXPORT_EVIDENCE_VERIFIED: Full source-to-export integrity verified with zero clamping, zero disparity, and complete evidence coverage.",
      ],
    };
  }
}

