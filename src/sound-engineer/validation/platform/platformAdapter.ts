// src/sound-engineer/validation/platform/platformAdapter.ts
// Authoritative technology-neutral platform capability contracts for Phase 1C.5h WP-30.
// Bound to frozen specification v0.1j Section 37, Activity WF-07, and Build Plan v0.1h WP-30.

import type { RenderRequest, RenderResult } from "../execution/types";

/**
 * Fundamental technology-neutral identity for any target-platform adapter.
 * Contains zero vendor-specific fields.
 */
export interface TargetPlatformIdentity {
  /** Identifier of the target platform adapter (e.g. "amplitube-5", "simulated-engine") */
  readonly platformId: string;
  /** Semantic version string of the platform adapter */
  readonly platformVersion: string;
}

/**
 * Capability contract for candidate and baseline audio rendering.
 * Used canonically by WP-10 / MVVI execution harnesses (ValidationExecutionRunner).
 * Does not force preset export verification onto audio-rendering engines.
 */
export interface PlatformAudioRenderer extends TargetPlatformIdentity {
  /**
   * Renders audio through the candidate Tone Translator pipeline / shadow model.
   */
  renderCandidate(request: RenderRequest): Promise<RenderResult>;

  /**
   * Renders audio through the legacy baseline to produce comparison reference WAV.
   * Strictly read-only baseline generation; does not mutate live production routing or state.
   */
  renderBaseline(request: RenderRequest): Promise<RenderResult>;

  /**
   * Optional cancellation hook to abort an active render job.
   */
  cancelRender?(renderId: string): Promise<void>;
}

/**
 * Backward-compatibility alias for the execution layer.
 * Preserves 100% source compatibility with existing WP-10 / MVVI callers and implementers.
 */
export type PlatformValidationAdapter = PlatformAudioRenderer;

// ---------------------------------------------------------------------------
// Export Process Evidence & Conversion Contracts (Vendor-Neutral)
// ---------------------------------------------------------------------------

/**
 * Technology-neutral record capturing one parameter's translation / export facts.
 * Provides the evidence needed to detect pre-serialization clamping.
 */
export interface ParameterConversionRecord {
  /** Parameter identifier / name / attribute */
  readonly parameterId: string;
  /** Target gear module / slot or device identifier if localized */
  readonly targetModuleId?: string;
  /** Raw / source input value before export conversion */
  readonly sourceValue: unknown;
  /** Final converted value intended for serialization */
  readonly convertedValue: unknown;
  /** Exact string or token serialized into the final artifact */
  readonly serializedValue?: string;
  /** True if the source value exceeded legal platform bounds and was clamped */
  readonly clampApplied: boolean;
  /** Pre-clamp value prior to constraint enforcement, if available */
  readonly preClampValue?: unknown;
  /** Post-clamp value after constraint enforcement, if available */
  readonly postClampValue?: unknown;
  /** Display value formatted with unit where applicable */
  readonly displayValue?: string;
  /** Existing local conversion or mapping disposition (e.g. "SUCCESS", "DISPARITY", "WARNING", "FAIL") */
  readonly mappingStatus?: string;
  /** Diagnostic note or reason describing conversion */
  readonly diagnosticNote?: string;
}

/**
 * Container for optional export-process accounting evidence.
 */
export interface ExportProcessEvidence {
  /** Array of parameter conversion records generated during export */
  readonly parameterConversions: readonly ParameterConversionRecord[];
  /** Optional identifier of the originating tone design or preset name */
  readonly sourcePresetName?: string;
  /** Optional metadata about the export workflow */
  readonly exportMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Request payload for target-platform preset export verification.
 * Vendor-neutral: accepts generic serialized text and optional process evidence.
 */
export interface PresetExportValidationRequest {
  /** Serialized preset payload (e.g. XML, JSON, or format-specific string) */
  readonly serializedPreset: string;
  /** Optional target platform ID to assert against the adapter's platformId */
  readonly targetPlatformId?: string;
  /** Optional target platform version to assert against adapter's platformVersion */
  readonly targetPlatformVersion?: string;
  /** Optional correlation/context reference (e.g. validationCaseId, executionId, traceRef) */
  readonly correlationRef?: string;
  /**
   * Optional export conversion / process accounting evidence.
   * If omitted, validation evaluates serialized-artifact validity only.
   */
  readonly exportEvidence?: ExportProcessEvidence;
}

// ---------------------------------------------------------------------------
// Validation Result Contracts (Implementation-Local Vocabulary)
// ---------------------------------------------------------------------------

/**
 * Implementation-local validation status classifications for target-platform export.
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * These are local validation disposition values, NOT global governance or lifecycle statuses.
 */
export const PLATFORM_VALIDATION_STATUSES = {
  /** All platform constraints, syntax, module IDs, and parameter ranges are valid without compromise */
  PASS: "PASS",
  /** Artifact is syntactically and physically legal, but required clamping, approximation, or fallback substitution */
  WARNING: "WARNING",
  /** Pre-export clamping or value disparity detected (source value exceeded legal platform limits) */
  DISPARITY: "DISPARITY",
  /** Syntactically invalid, corrupted, unregistered module, out-of-range serialized value, or missing required component */
  FAIL: "FAIL",
  /** Capability not available or evidence insufficient to evaluate */
  NOT_VERIFIABLE: "NOT_VERIFIABLE",
} as const;

export type PlatformValidationStatus =
  (typeof PLATFORM_VALIDATION_STATUSES)[keyof typeof PLATFORM_VALIDATION_STATUSES];

/**
 * Technology-neutral loadability capability classifications.
 * Distinguishes native binary execution from in-memory simulated loading without vendor-specific types.
 */
export const LOADABILITY_CAPABILITY_TYPES = {
  /** Verified via native platform runtime / binary invocation */
  NATIVE_RUNTIME: "NATIVE_RUNTIME",
  /** Verified via in-memory simulated parser / schema loader */
  SIMULATED_LOADER: "SIMULATED_LOADER",
  /** Loadability testing not performed or unavailable in this environment */
  NOT_PERFORMED: "NOT_PERFORMED",
} as const;

export type LoadabilityCapabilityType =
  (typeof LOADABILITY_CAPABILITY_TYPES)[keyof typeof LOADABILITY_CAPABILITY_TYPES];

/**
 * Loadability evaluation outcome.
 */
export interface LoadabilityEvaluationResult {
  /** Which capability tier was used for evaluation */
  readonly capabilityType: LoadabilityCapabilityType;
  /**
   * True/false outcome if evaluated under NATIVE_RUNTIME or SIMULATED_LOADER;
   * MUST be absent / undefined when capabilityType is NOT_PERFORMED.
   * Never use false to mean "not evaluated".
   */
  readonly loadable?: boolean;
  /** Descriptive diagnostic details or limitation explanation */
  readonly details?: string;
}

/**
 * Result of validating an individual target-platform gear module.
 */
export interface PlatformModuleValidationResult {
  /** Identifier of the module (e.g. GUID or canonical ID) */
  readonly moduleId: string;
  /** Optional human-readable or display name */
  readonly moduleName?: string;
  /** Slot / category / section location in the preset */
  readonly slotLocation?: string;
  /** Local validation status */
  readonly status: PlatformValidationStatus;
  /** True if the module is registered in the authoritative platform catalogue */
  readonly isRecognized: boolean;
  /** Diagnostic message */
  readonly message?: string;
}

/**
 * Result of validating an individual target-platform parameter.
 */
export interface PlatformParameterValidationResult {
  /** Parameter identifier / name / attribute */
  readonly parameterId: string;
  /** Associated module identifier if localized */
  readonly moduleId?: string;
  /** Local validation status (PASS, DISPARITY, WARNING, FAIL) */
  readonly status: PlatformValidationStatus;
  /** Serialized value read from the preset artifact */
  readonly serializedValue?: string;
  /** Source input value from conversion evidence if available */
  readonly sourceValue?: unknown;
  /** True if conversion evidence indicates clamping occurred */
  readonly clampApplied?: boolean;
  /** Authoritative legal platform range if applicable */
  readonly legalRange?: {
    readonly min: number;
    readonly max: number;
  };
  /** Diagnostic message or explanation */
  readonly message?: string;
}

/**
 * Comprehensive technology-neutral export validation result.
 * Supports explicit reporting of partial evidence limitations and simulated loadability.
 */
export interface PlatformExportValidationResult {
  /** Overall validation disposition across all checks */
  readonly overallStatus: PlatformValidationStatus;
  /** True if the serialized preset syntax and structural envelope are valid */
  readonly isSyntaxValid: boolean;
  /** True if optional export process evidence was supplied and evaluated */
  readonly processEvidenceEvaluated: boolean;
  /**
   * Validation outcomes for individual modules / gear IDs.
   * Undefined when module validation has not been performed (distinguishable from 0 evaluated defects).
   */
  readonly moduleResults?: readonly PlatformModuleValidationResult[];
  /**
   * Validation outcomes for individual parameters.
   * Undefined when parameter validation has not been performed (distinguishable from 0 evaluated defects).
   */
  readonly parameterResults?: readonly PlatformParameterValidationResult[];
  /** Loadability evaluation outcome */
  readonly loadability: LoadabilityEvaluationResult;
  /** Factual diagnostic notes, limitation disclosures, or warning details */
  readonly diagnostics: readonly string[];
}

// ---------------------------------------------------------------------------
// Target-Platform Export Validator Capability Contract
// ---------------------------------------------------------------------------

/**
 * Capability contract for target-platform preset export and integrity verification (WF-07 / PROFILE-03).
 * Implemented by concrete platform adapters (e.g. AmpliTube5ValidationAdapter).
 * Does not force audio rendering onto export-only validation engines.
 */
export interface PlatformExportValidator extends TargetPlatformIdentity {
  /**
   * Validates an exported target-platform preset artifact against syntax, module catalogues,
   * parameter bounds, and optional conversion evidence.
   */
  validatePresetExport(
    request: PresetExportValidationRequest
  ): Promise<PlatformExportValidationResult>;
}

/**
 * Composed unified interface for adapters providing both rendering and export validation capabilities.
 */
export interface UnifiedPlatformValidationAdapter
  extends PlatformAudioRenderer,
    PlatformExportValidator {}
