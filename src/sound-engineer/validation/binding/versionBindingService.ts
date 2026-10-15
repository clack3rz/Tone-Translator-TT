// src/sound-engineer/validation/binding/versionBindingService.ts
// VersionBindingService: Authoritative engine for Phase 1C.5h WP-05.
// Implements the strict version binding protocol defined in Section 9.2, Section 9.5, and Section 33.
// Tamper-evidently locks validation scope to exact upstream architecture specifications and runtime execution dependencies.
// Updated under WP-05 Corrective Implementation:
// 1. Integrates canonical 1C.5h_architecture_version directly into architecture_version_matrix (9-entry matrix).
// 2. Eliminates caller-supplied binding_id override (authoritative identity derived solely from governed state).
// 3. Eliminates truncated hash prefixes (authoritative identity derives from full version-state digest).
// 4. Eliminates symbolic placeholder default integrity references; consumes authoritative integrity references via ArchitectureIntegrityReferenceProvider boundary.
// 5. Enforces fail-closed validation when any architecture integrity reference is missing or empty.
// 6. Preserves historical version bindings per scope while preventing stale-binding reuse.

import { defensiveClone, deepFreeze } from "../../contracts/immutability";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import {
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
  ARCHITECTURE_ARTIFACT_KEYS,
  ArchitectureArtifactKey,
  ArchitectureIntegrityReferenceProvider,
  ARTIFACT_KEY_TO_MATRIX_PROP,
  ExecutionEnvironmentDependencies,
  FROZEN_UPSTREAM_VERSIONS,
  MissingDependencyError,
  VersionBindingDependencies,
  VersionBindingError,
  VersionBindingOptions,
  VersionMismatchError,
} from "./types";

/**
 * Builds the canonical frozen architecture version matrix with individual integrity references.
 * Contains all nine explicit architecture specifications including the 1C.5h architecture baseline.
 *
 * NOTE: WP-05 does NOT invent or supply default fake hashes.
 * If an integrity source is provided (either an ArchitectureIntegrityReferenceProvider or a mapping),
 * it populates the integrity_ref fields. If not, integrity_ref defaults to empty string "",
 * which will fail closed upon validation.
 */
export function buildCanonicalArchitectureMatrix(
  integritySource?:
    | ArchitectureIntegrityReferenceProvider
    | Partial<Record<ArchitectureArtifactKey, string>>,
  overrides?: Partial<ArchitectureVersionMatrix>
): ArchitectureVersionMatrix {
  const getRef = (key: ArchitectureArtifactKey): string => {
    if (!integritySource) return "";
    if (typeof (integritySource as any).getIntegrityReference === "function") {
      return (integritySource as ArchitectureIntegrityReferenceProvider).getIntegrityReference(key) ?? "";
    }
    return (integritySource as Partial<Record<ArchitectureArtifactKey, string>>)[key] ?? "";
  };

  return {
    "1C.5a_version": overrides?.["1C.5a_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5a"],
      integrity_ref: getRef("1C.5a"),
    },
    "1C.5b_version": overrides?.["1C.5b_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5b"],
      integrity_ref: getRef("1C.5b"),
    },
    "1C.5c_version": overrides?.["1C.5c_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5c"],
      integrity_ref: getRef("1C.5c"),
    },
    "1C.5d_version": overrides?.["1C.5d_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5d"],
      integrity_ref: getRef("1C.5d"),
    },
    "1C.5e_version": overrides?.["1C.5e_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5e"],
      integrity_ref: getRef("1C.5e"),
    },
    "1C.5f_version": overrides?.["1C.5f_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5f"],
      integrity_ref: getRef("1C.5f"),
    },
    "1C.5g_version": overrides?.["1C.5g_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5g"],
      integrity_ref: getRef("1C.5g"),
    },
    "1C.5h_mandate_version": overrides?.["1C.5h_mandate_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5h_mandate"],
      integrity_ref: getRef("1C.5h_mandate"),
    },
    "1C.5h_architecture_version": overrides?.["1C.5h_architecture_version"] ?? {
      version: FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"],
      integrity_ref: getRef("1C.5h_architecture"),
    },
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
  private readonly architectureIntegrityProvider?: ArchitectureIntegrityReferenceProvider;

  /** Binding records stored by unique canonical binding_id */
  private readonly bindingsById: Map<string, ValidationVersionBindingRecord> = new Map();

  /** Binding records indexed by scope_id (permits multiple historical version bindings per scope) */
  private readonly bindingsByScopeId: Map<string, ValidationVersionBindingRecord[]> = new Map();

  constructor(
    graph?: ValidationRelationshipGraph,
    ledger?: ValidationAuditLedger,
    integrityProvider?: IntegrityProvider,
    architectureIntegrityProvider?: ArchitectureIntegrityReferenceProvider
  ) {
    this.graph = graph;
    this.ledger = ledger;
    this.integrityProvider =
      integrityProvider ??
      ledger?.getIntegrityProvider() ??
      new DefaultSha256IntegrityProvider();
    this.architectureIntegrityProvider = architectureIntegrityProvider;
  }

  /**
   * Returns the active cryptographic integrity provider.
   */
  public getIntegrityProvider(): IntegrityProvider {
    return this.integrityProvider;
  }

  /**
   * Returns the configured architecture integrity reference provider, if any.
   */
  public getArchitectureIntegrityProvider(): ArchitectureIntegrityReferenceProvider | undefined {
    return this.architectureIntegrityProvider;
  }

  /**
   * Binds the complete frozen dependency set for a validated scope and produces an immutable ValidationVersionBindingRecord (Record 3).
   *
   * Enforces:
   * 1. Scope Existence: scopeRecord must be a valid ValidationScopeRecord.
   * 2. Complete Architecture Matrix: Binds all nine explicit architecture specifications (1C.5a through 1C.5h_architecture).
   * 3. Authoritative Integrity References: Consumes authoritative integrity references from governance boundary; fails closed on omission.
   * 4. Frozen Version Conformance: Rejects mismatched upstream versions unless allowNonStandardUpstreamVersions is explicitly true.
   * 5. 100% Dependency Field Population: Rejects missing, empty, or whitespace-only execution environment dependencies.
   * 6. Acyclic Deterministic Full-State Identity: Derives binding_id from scope_id and the complete, non-truncated version-state digest.
   * 7. Idempotency & Historical Preservation: Same scope + same dependencies reuses identical binding; same scope + changed dependencies creates new immutable binding without overwriting prior records.
   * 8. Cryptographic Composite Integrity: Generates deterministic composite digest across all bound version references via canonical serialization.
   * 9. Graph & Ledger Persistence: Registers node in relationship graph and appends sealed entry in immutable audit ledger once per new binding.
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

    // 2. Validate Mandatory Execution Dependencies (100% field population)
    this.validateExecutionDependencies(dependencies);

    // 3. Assemble and Validate Complete Canonical 9-Entry Architecture Version Matrix
    const architectureMatrix = this.resolveArchitectureMatrix(dependencies);

    if (!options?.allowNonStandardUpstreamVersions) {
      this.validateUpstreamArchitectureVersions(architectureMatrix);
    }

    // 4. Compute Deterministic Full Version-State Digest and Canonical Binding ID
    // Derivation flow:
    // scope + canonical governed dependency state -> full version-state digest -> canonical binding_id
    // Governed state contains scope_id, all nine architecture entries (version + integrity_ref),
    // and all eight execution environment dependencies.
    const versionStatePayload = {
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
    };
    const canonicalVersionState = canonicalizeJson(versionStatePayload);
    const versionStateDigest = this.integrityProvider.computeDigest(canonicalVersionState);

    // CANONICAL BINDING IDENTITY: Derived strictly from scope + full version-state digest.
    // Callers cannot supply an arbitrary binding_id.
    // The digest is NOT truncated for identity equivalence.
    const bindingId = `binding_${scopeId}_${versionStateDigest}`;

    // 5. Idempotency Check: Return existing record if this exact binding is already bound
    if (this.bindingsById.has(bindingId)) {
      return this.bindingsById.get(bindingId)!;
    }

    // 6. Compute Component Digests and Composite Version Integrity Reference
    const sealedAt = options?.timestamp ?? new Date().toISOString();
    const versionIntegrityReference = this.computeVersionIntegrityReference(
      bindingId,
      scopeId,
      architectureMatrix,
      dependencies,
      sealedAt,
      options?.additionalComponentDigests
    );

    // 7. Assemble Canonical Record 3 Payload
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

    // 8. Validate strictly against Section 9.5 Record 3 schema
    const bindingRecord: ValidationVersionBindingRecord = deepFreeze(
      validationVersionBindingRecordSchema.parse(rawRecord)
    );

    // 9. Atomic Graph Integration: Register node (no edges added; edge catalogue remains exactly 14)
    if (this.graph) {
      this.graph.registerNode({
        id: bindingRecord.binding_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
      });
    }

    // 10. Atomic Ledger Integration: Append immutable audit record once for new binding
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
        bindingRecord.binding_id,
        bindingRecord,
        sealedAt
      );
    }

    // 11. Cache in memory: Preserve historical bindings per scope
    this.bindingsById.set(bindingRecord.binding_id, bindingRecord);
    const scopeList = this.bindingsByScopeId.get(bindingRecord.scope_id) ?? [];
    scopeList.push(bindingRecord);
    this.bindingsByScopeId.set(bindingRecord.scope_id, scopeList);

    return bindingRecord;
  }

  /**
   * Retrieves a ValidationVersionBindingRecord by its canonical binding_id.
   */
  public getBinding(bindingId: string): ValidationVersionBindingRecord | undefined {
    return this.bindingsById.get(bindingId);
  }

  /**
   * Retrieves the latest ValidationVersionBindingRecord associated with a scope_id.
   */
  public getBindingByScopeId(scopeId: string): ValidationVersionBindingRecord | undefined {
    const list = this.bindingsByScopeId.get(scopeId);
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  }

  /**
   * Retrieves all historical ValidationVersionBindingRecords associated with a scope_id.
   */
  public getBindingsForScope(scopeId: string): ReadonlyArray<ValidationVersionBindingRecord> {
    const list = this.bindingsByScopeId.get(scopeId);
    return list ? deepFreeze([...list]) : [];
  }

  /**
   * Returns all registered ValidationVersionBindingRecords across all scopes.
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

    const recomputed = this.computeVersionIntegrityReference(
      record.binding_id,
      record.scope_id,
      record.architecture_version_matrix,
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
   * Resolves the complete nine-entry architecture version matrix from supplied dependencies or configured provider.
   */
  private resolveArchitectureMatrix(
    dependencies: VersionBindingDependencies
  ): ArchitectureVersionMatrix {
    const provider =
      dependencies.architecture_integrity_provider ??
      this.architectureIntegrityProvider;
    const directRefs = dependencies.architecture_integrity_references;
    const explicitMatrix = dependencies.architecture_version_matrix;

    const resolveRef = (key: ArchitectureArtifactKey): string => {
      if (directRefs && directRefs[key] !== undefined) {
        return directRefs[key] ?? "";
      }
      if (provider) {
        return provider.getIntegrityReference(key) ?? "";
      }
      return "";
    };

    if (explicitMatrix) {
      // If caller passed an explicit matrix object, preserve its exact presence/omission of keys
      const result: any = {};
      for (const artifact of ARCHITECTURE_ARTIFACT_KEYS) {
        const matrixKey = ARTIFACT_KEY_TO_MATRIX_PROP[artifact];
        if (matrixKey in explicitMatrix) {
          const entry = explicitMatrix[matrixKey];
          result[matrixKey] = {
            version: entry?.version ?? FROZEN_UPSTREAM_VERSIONS[artifact],
            integrity_ref:
              entry?.integrity_ref !== undefined
                ? entry.integrity_ref
                : resolveRef(artifact),
          };
        }
      }
      return result as ArchitectureVersionMatrix;
    }

    // No explicit matrix supplied: resolve all 9 entries from provider / direct refs
    return {
      "1C.5a_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5a"],
        integrity_ref: resolveRef("1C.5a"),
      },
      "1C.5b_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5b"],
        integrity_ref: resolveRef("1C.5b"),
      },
      "1C.5c_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5c"],
        integrity_ref: resolveRef("1C.5c"),
      },
      "1C.5d_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5d"],
        integrity_ref: resolveRef("1C.5d"),
      },
      "1C.5e_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5e"],
        integrity_ref: resolveRef("1C.5e"),
      },
      "1C.5f_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5f"],
        integrity_ref: resolveRef("1C.5f"),
      },
      "1C.5g_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5g"],
        integrity_ref: resolveRef("1C.5g"),
      },
      "1C.5h_mandate_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5h_mandate"],
        integrity_ref: resolveRef("1C.5h_mandate"),
      },
      "1C.5h_architecture_version": {
        version: FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"],
        integrity_ref: resolveRef("1C.5h_architecture"),
      },
    };
  }

  /**
   * Validates that all eight mandatory execution environment dependency fields are non-empty strings.
   */
  private validateExecutionDependencies(
    deps: VersionBindingDependencies
  ): void {
    const mandatoryKeys: (keyof ExecutionEnvironmentDependencies)[] = [
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
          String(key),
          `Expected non-empty string, received ${JSON.stringify(val)}`
        );
      }
    }
  }

  /**
   * Validates that all nine architecture entries in the matrix match the frozen upstream specification versions
   * and contain non-empty, authoritative integrity references.
   * Fail closed on missing, placeholder, or self-cloned integrity evidence.
   */
  private validateUpstreamArchitectureVersions(
    matrix: ArchitectureVersionMatrix
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
      { key: "1C.5h_architecture_version", expected: FROZEN_UPSTREAM_VERSIONS["1C.5h_architecture"], label: "Phase 1C.5h Architecture Baseline" },
    ];

    for (const { key, expected, label } of expectations) {
      const entry = matrix[key];
      if (!entry || !entry.version || typeof entry.version !== "string") {
        throw new MissingDependencyError(`architecture_version_matrix.${key}.version`);
      }
      if (!entry.integrity_ref || typeof entry.integrity_ref !== "string" || entry.integrity_ref.trim() === "") {
        throw new MissingDependencyError(
          `architecture_version_matrix.${key}.integrity_ref`,
          `Authoritative architecture integrity reference is required for "${label}" and cannot be omitted or empty.`
        );
      }

      // Protect against placeholder tokens or version cloning
      const trimmedRef = entry.integrity_ref.trim();
      if (trimmedRef === entry.version) {
        throw new MissingDependencyError(
          `architecture_version_matrix.${key}.integrity_ref`,
          `Integrity reference for "${label}" cannot be a clone of the version string ("${entry.version}"). Authoritative cryptographic reference required.`
        );
      }
      const lowerRef = trimmedRef.toLowerCase();
      if (lowerRef === "unknown" || lowerRef === "pending" || lowerRef === "none" || lowerRef === "null") {
        throw new MissingDependencyError(
          `architecture_version_matrix.${key}.integrity_ref`,
          `Placeholder "${trimmedRef}" is prohibited as an integrity reference for "${label}". Fail closed on missing evidence.`
        );
      }

      if (entry.version !== expected) {
        throw new VersionMismatchError(label, expected, entry.version);
      }
    }
  }

  /**
   * Computes individual component digests and the composite cryptographic integrity reference.
   */
  private computeVersionIntegrityReference(
    bindingId: string,
    scopeId: string,
    architectureMatrix: ArchitectureVersionMatrix,
    dependencies: VersionBindingDependencies,
    sealedAt: string,
    additionalDigests?: Record<string, string>
  ): VersionIntegrityReference {
    // 1. Compute discrete component digests for all 9 architecture specifications + 8 runtime dependencies
    const componentDigests: Record<string, string> = {
      "1C.5a_version": architectureMatrix["1C.5a_version"].integrity_ref,
      "1C.5b_version": architectureMatrix["1C.5b_version"].integrity_ref,
      "1C.5c_version": architectureMatrix["1C.5c_version"].integrity_ref,
      "1C.5d_version": architectureMatrix["1C.5d_version"].integrity_ref,
      "1C.5e_version": architectureMatrix["1C.5e_version"].integrity_ref,
      "1C.5f_version": architectureMatrix["1C.5f_version"].integrity_ref,
      "1C.5g_version": architectureMatrix["1C.5g_version"].integrity_ref,
      "1C.5h_mandate_version": architectureMatrix["1C.5h_mandate_version"].integrity_ref,
      "1C.5h_architecture_version": architectureMatrix["1C.5h_architecture_version"].integrity_ref,
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

    // 2. Canonical composite payload structure (deterministically ordered via canonicalizeJson)
    const compositePayload = {
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
