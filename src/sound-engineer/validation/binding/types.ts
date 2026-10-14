// src/sound-engineer/validation/binding/types.ts
// Strict Version Binding Subsystem Types & Error Contracts
// Phase 1C.5h WP-05: Bound to frozen specification v0.1j Section 9.2, Section 9.5, Section 33, and Implementation Plan v0.1h.

import {
  ArchitectureVersionEntry,
  ArchitectureVersionMatrix,
} from "../schemas/integrity";

/**
 * Frozen upstream architecture specification version constants.
 * Binds the full frozen upstream architecture matrix across all eight upstream specifications
 * plus the detailed Phase 1C.5h v0.1j architecture baseline trace.
 */
export const FROZEN_UPSTREAM_VERSIONS = {
  "1C.5a": "v0.3c",
  "1C.5b": "v0.2f",
  "1C.5c": "v0.1d",
  "1C.5d": "v0.1l",
  "1C.5e": "v0.1m",
  "1C.5f": "v0.1j",
  "1C.5g": "v0.1e",
  "1C.5h_mandate": "v0.1d",
  "1C.5h_architecture": "v0.1j",
} as const;

/**
 * Descriptive specification titles for frozen upstream architecture tiers.
 */
export const FROZEN_UPSTREAM_TITLES = {
  "1C.5a": "The 21 Principles & 27 Reasoning Lifecycle Statuses",
  "1C.5b": "Evidence Interpretation & Hypothesis Formation",
  "1C.5c": "Engineering Diagnosis & Causal Reasoning",
  "1C.5d": "Intervention Alternatives & Trade-Off Reasoning",
  "1C.5e": "Outcome Evaluation, Iteration & Review",
  "1C.5f": "Reasoning Traceability, Explainability & Governance",
  "1C.5g": "Knowledge Migration, Remapping & Controlled Adoption",
  "1C.5h_mandate": "Phase 1C.5h Constitutional Design Mandate",
  "1C.5h_architecture": "Empirical Validation, UAT, Verification and Production Readiness Architecture",
} as const;

/**
 * Canonical default baseline cryptographic integrity references for upstream specifications.
 */
export const DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS = {
  "1C.5a": "sha256_1c5a_baseline_v0.3c",
  "1C.5b": "sha256_1c5b_baseline_v0.2f",
  "1C.5c": "sha256_1c5c_baseline_v0.1d",
  "1C.5d": "sha256_1c5d_baseline_v0.1l",
  "1C.5e": "sha256_1c5e_baseline_v0.1m",
  "1C.5f": "sha256_1c5f_baseline_v0.1j",
  "1C.5g": "sha256_1c5g_baseline_v0.1e",
  "1C.5h_mandate": "sha256_1c5h_mandate_v0.1d",
  "1C.5h_architecture": "sha256_1c5h_arch_baseline_v0.1j",
} as const;

/**
 * The eight mandatory execution environment dependency fields defined in Section 9.5.
 */
export interface ExecutionEnvironmentDependencies {
  /** Commit hash, build tag, or package digest of execution codebase */
  runtime_implementation_version: string;
  /** Checkpoint identifier, sampling parameters, prompt template digests */
  model_configuration_version: string;
  /** Version digest of rule tables and parameter clamps */
  deterministic_rules_version: string;
  /** Version digest of target-platform gear definition catalog */
  gear_catalog_version: string;
  /** Version digest of preset serialization logic */
  platform_exporter_version: string;
  /** Manifest digest of golden audio stems and test presets */
  fixture_library_version: string;
  /** Exact version and build of target platform host application */
  target_platform_runtime_version: string;
  /** Operating environment, audio driver API, runtime dependencies */
  host_environment_version: string;
}

/**
 * Complete input structure accepted by VersionBindingService.
 */
export interface VersionBindingDependencies extends ExecutionEnvironmentDependencies {
  /** Optional explicit architecture version matrix; defaults to canonical frozen upstream matrix */
  architecture_version_matrix?: Partial<ArchitectureVersionMatrix>;
  /** Optional explicit detailed baseline trace; defaults to 1C.5h v0.1j baseline */
  detailed_baseline_trace?: ArchitectureVersionEntry;
}

/**
 * Options configuring version binding creation and verification.
 */
export interface VersionBindingOptions {
  /** Explicit binding ID; defaults to `binding_${scope_id}` */
  bindingId?: string;
  /** Explicit ISO 8601 UTC timestamp; defaults to current UTC time */
  timestamp?: string;
  /** Optional custom or additional component digests */
  additionalComponentDigests?: Record<string, string>;
  /** When true, bypasses the strict frozen upstream version match check (strictly for hypothetical testing) */
  allowNonStandardUpstreamVersions?: boolean;
}

/**
 * Base error for all version binding operations.
 */
export class VersionBindingError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "VERSION_BINDING_ERROR") {
    super(message);
    this.name = "VersionBindingError";
    this.code = code;
  }
}

/**
 * Thrown when an upstream architecture specification version differs from the frozen canonical baseline.
 */
export class VersionMismatchError extends VersionBindingError {
  public readonly component: string;
  public readonly expectedVersion: string;
  public readonly actualVersion: string;

  constructor(component: string, expectedVersion: string, actualVersion: string) {
    super(
      `Frozen upstream architecture version mismatch for "${component}": expected "${expectedVersion}", received "${actualVersion}". Strict version binding prohibits validation against unauthorized or divergent upstream versions.`,
      "VERSION_MISMATCH_ERROR"
    );
    this.name = "VersionMismatchError";
    this.component = component;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Thrown when any mandatory dependency or integrity reference is missing or empty.
 */
export class MissingDependencyError extends VersionBindingError {
  public readonly dependencyKey: string;

  constructor(dependencyKey: string, details?: string) {
    super(
      `Missing required execution dependency for version binding: "${dependencyKey}"${details ? ` - ${details}` : ""}. Complete version binding requires 100% field population without omission.`,
      "MISSING_DEPENDENCY_ERROR"
    );
    this.name = "MissingDependencyError";
    this.dependencyKey = dependencyKey;
  }
}
