// src/sound-engineer/validation/binding/versionBindingService.ts
// VersionBindingService: Authoritative engine for Phase 1C.5h WP-05.
// Implements the strict version binding protocol defined in Section 9.2, Section 9.5, and Section 33.
// Tamper-evidently locks validation scope to exact upstream architecture specifications and runtime execution dependencies.

import { defensiveClone, deepFreeze } from "../../contracts/immutability";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
  ArchitectureVersionEntry,
  ArchitectureVersionMatrix,
  canonicalizeJson,
  IntegrityProvider,
  VersionIntegrityReference,
} from "../schemas/integrity";
import {
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  validationVersionBindingRecordSchema,
} from "../schemas/records";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS,
  FROZEN_UPSTREAM_VERSIONS,
  MissingDependencyError,
  VersionBindingDependencies,
  VersionBindingError,
  VersionBindingOptions,
  VersionMismatchError,
} from "./types";

/**
 * Builds the canonical frozen architecture version matrix with individual integrity references.
 */
export function buildCanonicalArchitectureMatrix(
  overrides?: Partial<ArchitectureVersionMatrix>
): ArchitectureVersionMatrix {
  return {
    "1C.5a_version": overrides?.["1C.5a_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5a"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5a"],
    },
    "1C.5b_version": overrides?.["1C.5b_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5b"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5b"],
    },
    "1C.5c_version": overrides?.["1C.5c_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5c"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5c"],
    },
    "1C.5d_version": overrides?.["1C.5d_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5d"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5d"],
    },
    "1C.5e_version": overrides?.["1C.5e_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5e"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5e"],
    },
    "1C.5f_version": overrides?.["1C.5f_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5f"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5f"],
    },
    "1C.5g_version": overrides?.["1C.5g_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5g"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5g"],
    },
    "1C.5h_mandate_version": overrides?.["1C.5h_mandate_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5h_mandate"],
      integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5h_mandate"],
    },
  };
}

/**
 * Builds the canonical detailed baseline trace entry for Phase 1C.5h v0.1j architecture specification.
 */
export function buildCanonicalBaselineTrace(
  override?: ArchitectureVersionEntry
): ArchitectureVersionEntry {
  return override ?? {
    version: FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"],
    integrity_ref: DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5h_architecture"],
  };
}

/**
 * Authoritative Strict Version Binding Service for Phase 1C.5h WP-05.
 * Creates, verifies, registers, and audits immutable ValidationVersionBindingRecords (Record 3).
 */
export class VersionBindingService {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;

  /** Binding records stored by binding_id */
  private readonly bindingsById: Map<string, ValidationVersionBindingRecord> = new Map();

  /** Binding records indexed by scope_id */
  private readonly bindingsByScopeId: Map<string, ValidationVersionBindingRecord> = new Map();

  constructor(
    graph?: ValidationRelationshipGraph,
    ledger?: ValidationAuditLedger,
    integrityProvider?: IntegrityProvider
  ) {
    this.graph = graph;
    this.ledger = ledger;
    this.integrityProvider =
      integrityProvider ??
      ledger?.getIntegrityProvider() ??
      new DefaultSha256IntegrityProvider();
  }

  /**
   * Returns the active integrity provider.
   */
  public getIntegrityProvider(): IntegrityProvider {
    return this.integrityProvider;
  }

  /**
   * Binds the complete frozen dependency set for a validated scope and produces an immutable ValidationVersionBindingRecord (Record 3).
   *
   * Enforces:
   * 1. Scope Existence: scopeRecord must be a valid ValidationScopeRecord.
   * 2. Complete Architecture Matrix: Binds all eight upstream specifications plus detailed 1C.5h baseline trace.
   * 3. Frozen Version Conformance: Rejects mismatched upstream versions unless allowNonStandardUpstreamVersions is explicitly true.
   * 4. 100% Dependency Field Population: Rejects missing, empty, or whitespace-only execution environment dependencies.
   * 5. Cryptographic Composite Integrity: Generates deterministic composite digest across all bound version references.
   * 6. Graph & Ledger Persistence: Registers node in relationship graph and appends sealed entry in immutable audit ledger.
   */
  public bindVersions(
    scopeRecord: ValidationScopeRecord,
    dependencies: VersionBindingDependencies,
    options?: VersionBindingOptions
  ): ValidationVersionBindingRecord {
    // 1. Verify Scope Record Precondition
    if (!scopeRecord || !scopeRecord.scope_id || typeof scopeRecord.scope_id !== "string") {
      throw new VersionBindingError(
        "Cannot bind versions: invalid or missing ValidationScopeRecord. Scope must be established before version binding."
      );
    }

    const scopeId = scopeRecord.scope_id;
    const bindingId = options?.bindingId ?? `binding_${scopeId}`;

    // 2. Idempotency Check: Return existing record if already bound
    if (this.bindingsById.has(bindingId)) {
      return this.bindingsById.get(bindingId)!;
    }
    if (this.bindingsByScopeId.has(scopeId)) {
      return this.bindingsByScopeId.get(scopeId)!;
    }

    // 3. Validate Mandatory Execution Dependencies
    this.validateExecutionDependencies(dependencies);

    // 4. Assemble and Validate Complete Architecture Version Matrix
    const architectureMatrix = buildCanonicalArchitectureMatrix(
      dependencies.architecture_version_matrix
    );
    const baselineTrace = buildCanonicalBaselineTrace(
      dependencies.detailed_baseline_trace
    );

    if (!options?.allowNonStandardUpstreamVersions) {
      this.validateUpstreamArchitectureVersions(architectureMatrix, baselineTrace);
    }

    // 5. Compute Component Digests and Composite Version Integrity Reference
    const sealedAt = options?.timestamp ?? new Date().toISOString();
    const versionIntegrityReference = this.computeVersionIntegrityReference(
      bindingId,
      scopeId,
      architectureMatrix,
      baselineTrace,
      dependencies,
      sealedAt,
      options?.additionalComponentDigests
    );

    // 6. Assemble Canonical Record 3 Payload
    const rawRecord = {
      binding_id: bindingId,
      scope_id: scopeId,
      architecture_version_matrix: architectureMatrix,
      runtime_implementation_version: dependencies.runtime_implementation_version.trim(),
      model_configuration_version: dependencies.model_configuration_version.trim(),
      deterministic_rules_version: dependencies.deterministic_rules_version.trim(),
      gear_catalog_version: dependencies.gear_catalog_version.trim(),
      platform_exporter_version: dependencies.platform_exporter_version.trim(),
      fixture_library_version: dependencies.fixture_library_version.trim(),
      target_platform_runtime_version: dependencies.target_platform_runtime_version.trim(),
      host_environment_version: dependencies.host_environment_version.trim(),
      version_integrity_reference: versionIntegrityReference,
    };

    // 7. Validate strictly against frozen Section 9.5 schema
    const bindingRecord: ValidationVersionBindingRecord = deepFreeze(
      validationVersionBindingRecordSchema.parse(rawRecord)
    );

    // 8. Atomic Graph Integration: Register node
    if (this.graph) {
      this.graph.registerNode({
        id: bindingRecord.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });
    }

    // 9. Atomic Ledger Integration: Append immutable audit record
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
        bindingRecord.binding_id,
        bindingRecord,
        sealedAt
      );
    }

    // 10. Cache in memory
    this.bindingsById.set(bindingRecord.binding_id, bindingRecord);
    this.bindingsByScopeId.set(bindingRecord.scope_id, bindingRecord);

    return bindingRecord;
  }

  /**
   * Retrieves a ValidationVersionBindingRecord by its binding_id.
   */
  public getBinding(bindingId: string): ValidationVersionBindingRecord | undefined {
    return this.bindingsById.get(bindingId);
  }

  /**
   * Retrieves a ValidationVersionBindingRecord by its associated scope_id.
   */
  public getBindingByScopeId(scopeId: string): ValidationVersionBindingRecord | undefined {
    return this.bindingsByScopeId.get(scopeId);
  }

  /**
   * Returns all registered ValidationVersionBindingRecords.
   */
  public getAllBindings(): ReadonlyArray<ValidationVersionBindingRecord> {
    return deepFreeze(Array.from(this.bindingsById.values()));
  }

  /**
   * Verifies the cryptographic integrity of a ValidationVersionBindingRecord against recalculated digests.
   */
  public verifyBindingIntegrity(
    recordOrId: string | ValidationVersionBindingRecord
  ): boolean {
    const record =
      typeof recordOrId === "string"
        ? this.getBinding(recordOrId)
        : recordOrId;

    if (!record) {
      return false;
    }

    const baselineTrace: ArchitectureVersionEntry = {
      version:
        record.version_integrity_reference.component_digests?.["1C.5h_architecture_version"] ??
        FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"],
      integrity_ref:
        record.version_integrity_reference.component_digests?.["1C.5h_architecture_integrity"] ??
        DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS["1C.5h_architecture"],
    };

    const recomputed = this.computeVersionIntegrityReference(
      record.binding_id,
      record.scope_id,
      record.architecture_version_matrix,
      baselineTrace,
      {
        runtime_implementation_version: record.runtime_implementation_version,
        model_configuration_version: record.model_configuration_version,
        deterministic_rules_version: record.deterministic_rules_version,
        gear_catalog_version: record.gear_catalog_version,
        platform_exporter_version: record.platform_exporter_version,
        fixture_library_version: record.fixture_library_version,
        target_platform_runtime_version: record.target_platform_runtime_version,
        host_environment_version: record.host_environment_version,
      },
      record.version_integrity_reference.sealed_at
    );

    return (
      recomputed.composite_digest ===
      record.version_integrity_reference.composite_digest
    );
  }

  /**
   * Validates that all eight mandatory execution environment dependency fields are non-empty strings.
   */
  private validateExecutionDependencies(
    deps: VersionBindingDependencies
  ): void {
    const mandatoryKeys: (keyof VersionBindingDependencies)[] = [
      "runtime_implementation_version",
      "model_configuration_version",
      "deterministic_rules_version",
      "gear_catalog_version",
      "platform_exporter_version",
      "fixture_library_version",
      "target_platform_runtime_version",
      "host_environment_version",
    ];

    for (const key of mandatoryKeys) {
      const val = deps[key];
      if (typeof val !== "string" || val.trim() === "") {
        throw new MissingDependencyError(
          key,
          `Expected non-empty string, received ${JSON.stringify(val)}`
        );
      }
    }
  }

  /**
   * Validates that all architecture entries in the matrix match the frozen upstream specification versions.
   */
  private validateUpstreamArchitectureVersions(
    matrix: ArchitectureVersionMatrix,
    baselineTrace: ArchitectureVersionEntry
  ): void {
    const expectations: Array<{
      key: keyof ArchitectureVersionMatrix;
      expected: string;
      label: string;
    }> = [
      { key: "1C.5a_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5a"], label: "Phase 1C.5a" },
      { key: "1C.5b_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5b"], label: "Phase 1C.5b" },
      { key: "1C.5c_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5c"], label: "Phase 1C.5c" },
      { key: "1C.5d_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5d"], label: "Phase 1C.5d" },
      { key: "1C.5e_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5e"], label: "Phase 1C.5e" },
      { key: "1C.5f_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5f"], label: "Phase 1C.5f" },
      { key: "1C.5g_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5g"], label: "Phase 1C.5g" },
      { key: "1C.5h_mandate_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5h_mandate"], label: "Phase 1C.5h Mandate" },
    ];

    for (const { key, expected, label } of expectations) {
      const entry = matrix[key];
      if (!entry || !entry.version || typeof entry.version !== "string") {
        throw new MissingDependencyError(`architecture_version_matrix.${key}.version`);
      }
      if (!entry.integrity_ref || typeof entry.integrity_ref !== "string" || entry.integrity_ref.trim() === "") {
        throw new MissingDependencyError(`architecture_version_matrix.${key}.integrity_ref`);
      }
      if (entry.version !== expected) {
        throw new VersionMismatchError(label, expected, entry.version);
      }
    }

    // Baseline trace validation
    if (!baselineTrace.version || baselineTrace.version !== FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"]) {
      throw new VersionMismatchError(
        "Phase 1C.5h Baseline Trace Architecture",
        FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"],
        baselineTrace.version
      );
    }
    if (!baselineTrace.integrity_ref || baselineTrace.integrity_ref.trim() === "") {
      throw new MissingDependencyError("detailed_baseline_trace.integrity_ref");
    }
  }

  /**
   * Computes individual component digests and the composite cryptographic integrity reference.
   */
  private computeVersionIntegrityReference(
    bindingId: string,
    scopeId: string,
    architectureMatrix: ArchitectureVersionMatrix,
    baselineTrace: ArchitectureVersionEntry,
    dependencies: VersionBindingDependencies,
    sealedAt: string,
    additionalDigests?: Record<string, string>
  ): VersionIntegrityReference {
    // 1. Compute discrete component digests
    const componentDigests: Record<string, string> = {
      "1C.5a_version": architectureMatrix["1C.5a_version"].integrity_ref,
      "1C.5b_version": architectureMatrix["1C.5b_version"].integrity_ref,
      "1C.5c_version": architectureMatrix["1C.5c_version"].integrity_ref,
      "1C.5d_version": architectureMatrix["1C.5d_version"].integrity_ref,
      "1C.5e_version": architectureMatrix["1C.5e_version"].integrity_ref,
      "1C.5f_version": architectureMatrix["1C.5f_version"].integrity_ref,
      "1C.5g_version": architectureMatrix["1C.5g_version"].integrity_ref,
      "1C.5h_mandate_version": architectureMatrix["1C.5h_mandate_version"].integrity_ref,
      "1C.5h_architecture_version": baselineTrace.version,
      "1C.5h_architecture_integrity": baselineTrace.integrity_ref,
      runtime_implementation_version: this.integrityProvider.computeDigest(
        dependencies.runtime_implementation_version.trim()
      ),
      model_configuration_version: this.integrityProvider.computeDigest(
        dependencies.model_configuration_version.trim()
      ),
      deterministic_rules_version: this.integrityProvider.computeDigest(
        dependencies.deterministic_rules_version.trim()
      ),
      gear_catalog_version: this.integrityProvider.computeDigest(
        dependencies.gear_catalog_version.trim()
      ),
      platform_exporter_version: this.integrityProvider.computeDigest(
        dependencies.platform_exporter_version.trim()
      ),
      fixture_library_version: this.integrityProvider.computeDigest(
        dependencies.fixture_library_version.trim()
      ),
      target_platform_runtime_version: this.integrityProvider.computeDigest(
        dependencies.target_platform_runtime_version.trim()
      ),
      host_environment_version: this.integrityProvider.computeDigest(
        dependencies.host_environment_version.trim()
      ),
      ...additionalDigests,
    };

    // 2. Canonical composite payload structure (deterministically ordered)
    const compositePayload = {
      binding_id: bindingId,
      scope_id: scopeId,
      architecture_version_matrix: architectureMatrix,
      baseline_trace: baselineTrace,
      runtime_implementation_version: dependencies.runtime_implementation_version.trim(),
      model_configuration_version: dependencies.model_configuration_version.trim(),
      deterministic_rules_version: dependencies.deterministic_rules_version.trim(),
      gear_catalog_version: dependencies.gear_catalog_version.trim(),
      platform_exporter_version: dependencies.platform_exporter_version.trim(),
      fixture_library_version: dependencies.fixture_library_version.trim(),
      target_platform_runtime_version: dependencies.target_platform_runtime_version.trim(),
      host_environment_version: dependencies.host_environment_version.trim(),
      component_digests: componentDigests,
    };

    const canonicalString = canonicalizeJson(compositePayload);
    const compositeDigest = this.integrityProvider.computeDigest(canonicalString);

    return {
      composite_digest: compositeDigest,
      algorithm: this.integrityProvider.algorithmName,
      sealed_at: sealedAt,
      component_digests: deepFreeze(componentDigests),
    };
  }
}
