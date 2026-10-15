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
 * Canonical identifiers for the nine frozen upstream architecture specifications.
 */
export type ArchitectureArtifactKey =
  | "1C.5a"
  | "1C.5b"
  | "1C.5c"
  | "1C.5d"
  | "1C.5e"
  | "1C.5f"
  | "1C.5g"
  | "1C.5h_mandate"
  | "1C.5h_architecture";

export const ARCHITECTURE_ARTIFACT_KEYS: readonly ArchitectureArtifactKey[] = [
  "1C.5a",
  "1C.5b",
  "1C.5c",
  "1C.5d",
  "1C.5e",
  "1C.5f",
  "1C.5g",
  "1C.5h_mandate",
  "1C.5h_architecture",
] as const;

/**
 * Mapping between ArchitectureArtifactKey and ArchitectureVersionMatrix property names.
 */
export const ARTIFACT_KEY_TO_MATRIX_PROP: Record<ArchitectureArtifactKey, keyof ArchitectureVersionMatrix> = {
  "1C.5a": "1C.5a_version",
  "1C.5b": "1C.5b_version",
  "1C.5c": "1C.5c_version",
  "1C.5d": "1C.5d_version",
  "1C.5e": "1C.5e_version",
  "1C.5f": "1C.5f_version",
  "1C.5g": "1C.5g_version",
  "1C.5h_mandate": "1C.5h_mandate_version",
  "1C.5h_architecture": "1C.5h_architecture_version",
};

/**
 * Technology-neutral governance input boundary abstraction supplying authoritative cryptographic
 * integrity references for the nine frozen architecture specifications.
 *
 * WP-05 is NOT responsible for scanning disks, crawling git, or inventing hash strings.
 * WP-05 is responsible for consuming authoritative integrity references supplied by this boundary.
 */
export interface ArchitectureIntegrityReferenceProvider {
  /**
   * Returns the authoritative cryptographic integrity reference for the specified architecture artifact.
   * If the artifact reference is missing, unavailable, or unresolved, returns undefined.
   */
  getIntegrityReference(artifact: ArchitectureArtifactKey): string | undefined;

  /**
   * Optional bulk resolver returning all available integrity references.
   */
  getAllIntegrityReferences?(): Partial<Record<ArchitectureArtifactKey, string>>;
}

/**
 * Concrete in-memory provider for testing, fixtures, and explicit programmatic governance supply.
 */
export class StaticArchitectureIntegrityReferenceProvider implements ArchitectureIntegrityReferenceProvider {
  private readonly refs: Map<ArchitectureArtifactKey, string>;

  constructor(refs: Partial<Record<ArchitectureArtifactKey, string>>) {
    this.refs = new Map(Object.entries(refs) as [ArchitectureArtifactKey, string][]);
  }

  public getIntegrityReference(artifact: ArchitectureArtifactKey): string | undefined {
    return this.refs.get(artifact);
  }

  public getAllIntegrityReferences(): Partial<Record<ArchitectureArtifactKey, string>> {
    return Object.fromEntries(this.refs.entries()) as Partial<Record<ArchitectureArtifactKey, string>>;
  }
}

/**
 * Isolated synthetic test fixture integrity references.
 * STRICT GOVERNANCE: Strictly for testing and fixture manufacturing; NOT a production default.
 * WP-05 does NOT automatically populate production records with these synthetic tokens.
 */
export const TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS = {
  "1C.5a": "test_sha256_1c5a_baseline_v0.3c",
  "1C.5b": "test_sha256_1c5b_baseline_v0.2f",
  "1C.5c": "test_sha256_1c5c_baseline_v0.1d",
  "1C.5d": "test_sha256_1c5d_baseline_v0.1l",
  "1C.5e": "test_sha256_1c5e_baseline_v0.1m",
  "1C.5f": "test_sha256_1c5f_baseline_v0.1j",
  "1C.5g": "test_sha256_1c5g_baseline_v0.1e",
  "1C.5h_mandate": "test_sha256_1c5h_mandate_v0.1d",
  "1C.5h_architecture": "test_sha256_1c5h_arch_baseline_v0.1j",
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
 * Governed directly by canonical architecture_version_matrix and execution environment dependencies.
 */
export interface VersionBindingDependencies extends ExecutionEnvironmentDependencies {
  /** Optional explicit architecture version matrix; if omitted, resolved from authoritative integrity provider */
  architecture_version_matrix?: Partial<ArchitectureVersionMatrix>;

  /** Optional per-call authoritative architecture integrity provider */
  architecture_integrity_provider?: ArchitectureIntegrityReferenceProvider;

  /** Optional per-call explicit mapping of authoritative integrity references */
  architecture_integrity_references?: Partial<Record<ArchitectureArtifactKey, string>>;
}

/**
 * Options configuring version binding creation and verification.
 * GOVERNED IDENTITY: Canonical binding_id cannot be overridden by callers.
 */
export interface VersionBindingOptions {
  /** Explicit ISO 8601 UTC timestamp; defaults to current UTC time. Included in envelope, does NOT affect binding_id. */
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
