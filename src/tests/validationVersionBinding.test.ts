// src/tests/validationVersionBinding.test.ts
// Phase 1C.5h — WP-05: Strict Version Binding Subsystem Tests
// Verifies Section 9.2, Section 9.5, Section 33, and Implementation Plan v0.1h WP-05.
// Governed Corrective Implementation:
// Tests A through N verifying removal of caller binding ID override, full-state digest identity,
// authoritative integrity reference provider boundary, fail-closed behavior on missing refs,
// parameter mutation sensitivity, and idempotency with historical preservation.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARCHITECTURE_ARTIFACT_KEYS,
  ArchitectureArtifactKey,
  ArchitectureIntegrityReferenceProvider,
  ARTIFACT_KEY_TO_MATRIX_PROP,
  buildCanonicalArchitectureMatrix,
  DefaultSha256IntegrityProvider,
  FROZEN_UPSTREAM_TITLES,
  FROZEN_UPSTREAM_VERSIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  MissingDependencyError,
  StaticArchitectureIntegrityReferenceProvider,
  TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
  VALIDATION_PRIMARY_DOMAINS,
  ValidationAuditLedger,
  ValidationRelationshipGraph,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  validationVersionBindingRecordSchema,
  VersionBindingDependencies,
  VersionBindingError,
  VersionBindingService,
  VersionMismatchError,
} from "../sound-engineer/validation";

describe("Phase 1C.5h — WP-05: Strict Version Binding Subsystem (Record 3)", () => {
  // Helper to manufacture a valid upstream ValidationScopeRecord fixture
  function createSampleScopeRecord(
    scopeId: string = "scope_amp_high_gain_v1",
    intakeId: string = "intake_mhp_001"
  ): ValidationScopeRecord {
    return {
      scope_id: scopeId,
      intake_id: intakeId,
      primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
      included_units: ["amp_lead_5150", "amp_recto_dual"],
      excluded_units: ["cab_vintage_4x12", "pedal_ts9"],
      boundary_constraints: [
        "Strict scope boundary isolation enforced under Axiom 6",
      ],
      scope_inflation_protection: true,
    };
  }

  // Canonical valid execution environment dependencies fixture with injected synthetic test integrity refs
  function createValidDependencies(
    integrityRefs: Partial<Record<ArchitectureArtifactKey, string>> = TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
  ): VersionBindingDependencies {
    return {
      runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
      model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
      deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
      gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
      platform_exporter_version: "stage12_serializer_digest_9a8b7c",
      fixture_library_version: "golden_stems_manifest_digest_def456",
      target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
      host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
      architecture_integrity_references: integrityRefs,
    };
  }

  // Helper creating a service pre-configured with a static test architecture integrity reference provider
  function createTestService(
    graph?: ValidationRelationshipGraph,
    ledger?: ValidationAuditLedger
  ): VersionBindingService {
    const archProvider = new StaticArchitectureIntegrityReferenceProvider(
      TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
    );
    return new VersionBindingService(graph, ledger, undefined, archProvider);
  }

  // -------------------------------------------------------------------------
  // TEST A: No Public Arbitrary Binding ID Override
  // -------------------------------------------------------------------------
  it("A. derives canonical binding_id solely from governed state and ignores arbitrary caller identity", () => {
    const scope = createSampleScopeRecord("scope_no_override_01");
    const deps = createValidDependencies();
    const service = createTestService();

    // Pass untyped options with a attempted caller bindingId override
    const record = service.bindVersions(scope, deps, {
      ...({ bindingId: "manual_unauthorized_override" } as any),
    });

    assert.notEqual(
      record.binding_id,
      "manual_unauthorized_override",
      "Canonical binding_id must NOT be overridden by caller-supplied ID"
    );
    assert.ok(
      record.binding_id.startsWith(`binding_${scope.scope_id}_`),
      "Canonical binding_id must follow the governed derivation pattern"
    );

    // Verify subsequent request with changed runtime and same attempted override produces a distinct ID
    const deps2 = {
      ...deps,
      runtime_implementation_version: "git_sha_runtime_v2",
    };
    const record2 = service.bindVersions(scope, deps2, {
      ...({ bindingId: "manual_unauthorized_override" } as any),
    });

    assert.notEqual(record.binding_id, record2.binding_id);
    assert.notEqual(record2.binding_id, "manual_unauthorized_override");
  });

  // -------------------------------------------------------------------------
  // TEST B: Same Scope + Changed Runtime Version
  // -------------------------------------------------------------------------
  it("B. produces distinct full-state binding_id and appends new ledger entry when runtime version changes", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const service = createTestService(graph, ledger);

    const scope = createSampleScopeRecord("scope_runtime_change_01");
    const deps1 = createValidDependencies();
    const deps2 = {
      ...deps1,
      runtime_implementation_version: "git_sha_NEW_RELEASE_12345",
    };

    const record1 = service.bindVersions(scope, deps1);
    const record2 = service.bindVersions(scope, deps2);

    assert.notEqual(record1.binding_id, record2.binding_id);
    assert.notEqual(
      record1.version_integrity_reference.composite_digest,
      record2.version_integrity_reference.composite_digest
    );

    // Both historical bindings preserved
    const scopeBindings = service.getBindingsForScope(scope.scope_id);
    assert.equal(scopeBindings.length, 2);
    assert.equal(scopeBindings[0].binding_id, record1.binding_id);
    assert.equal(scopeBindings[1].binding_id, record2.binding_id);

    // Latest returns record2
    assert.equal(service.getBindingByScopeId(scope.scope_id)?.binding_id, record2.binding_id);

    // Ledger has 2 entries
    assert.equal(ledger.getEntries().length, 2);
  });

  // -------------------------------------------------------------------------
  // TEST C: Cross-Scope Isolation
  // -------------------------------------------------------------------------
  it("C. guarantees cross-scope isolation: same version dependencies with different scopes produce distinct bindings", () => {
    const service = createTestService();
    const scopeA = createSampleScopeRecord("scope_alpha");
    const scopeB = createSampleScopeRecord("scope_beta");
    const deps = createValidDependencies();

    const recordA = service.bindVersions(scopeA, deps);
    const recordB = service.bindVersions(scopeB, deps);

    assert.notEqual(recordA.binding_id, recordB.binding_id);
    assert.notEqual(recordA.scope_id, recordB.scope_id);
    assert.notEqual(
      recordA.version_integrity_reference.composite_digest,
      recordB.version_integrity_reference.composite_digest
    );

    // Queries by scope return isolated sets
    const scopeAList = service.getBindingsForScope("scope_alpha");
    const scopeBList = service.getBindingsForScope("scope_beta");
    assert.equal(scopeAList.length, 1);
    assert.equal(scopeBList.length, 1);
    assert.equal(scopeAList[0].binding_id, recordA.binding_id);
    assert.equal(scopeBList[0].binding_id, recordB.binding_id);
  });

  // -------------------------------------------------------------------------
  // TEST D: Full Digest Identity (No Truncation)
  // -------------------------------------------------------------------------
  it("D. derives binding_id from the complete 64-character SHA-256 version-state digest without truncation", () => {
    const service = createTestService();
    const scope = createSampleScopeRecord("scope_full_digest");
    const deps = createValidDependencies();

    const record = service.bindVersions(scope, deps);

    // Pattern: binding_${scopeId}_${64-char full hex digest}
    const expectedPrefix = `binding_${scope.scope_id}_`;
    assert.ok(record.binding_id.startsWith(expectedPrefix));

    const digestPart = record.binding_id.substring(expectedPrefix.length);
    assert.equal(digestPart.length, 64, "Binding ID must contain the full 64-character hex digest");
    assert.match(digestPart, /^[0-9a-f]{64}$/, "Digest must be a valid 64-char hex string");
  });

  // -------------------------------------------------------------------------
  // TEST E: Artificial Prefix Collision Regression Test
  // -------------------------------------------------------------------------
  it("E. ensures distinct version states cannot collide or be equated even if a hypothetical prefix matches", () => {
    // Custom mock integrity provider that produces distinct 64-char digests sharing the same 16-char prefix
    class MockPrefixCollisionIntegrityProvider extends DefaultSha256IntegrityProvider {
      private counter = 0;
      public override computeDigest(payload: string): string {
        this.counter++;
        // Same 16-character prefix "aaaaaaaaaaaaaaaa", but different suffix
        const suffix = this.counter.toString(16).padStart(48, "0");
        return `aaaaaaaaaaaaaaaa${suffix}`;
      }
    }

    const mockProvider = new MockPrefixCollisionIntegrityProvider();
    const archProvider = new StaticArchitectureIntegrityReferenceProvider(
      TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS
    );
    const service = new VersionBindingService(undefined, undefined, mockProvider, archProvider);

    const scope = createSampleScopeRecord("scope_collision_test");
    const deps1 = createValidDependencies();
    const deps2 = {
      ...deps1,
      runtime_implementation_version: "runtime_different_state",
    };

    const record1 = service.bindVersions(scope, deps1);
    const record2 = service.bindVersions(scope, deps2);

    // Both IDs share "aaaaaaaaaaaaaaaa" prefix in digest portion, but full IDs are distinct
    assert.notEqual(
      record1.binding_id,
      record2.binding_id,
      "Full-digest binding_id must NOT collide even when digest prefixes match"
    );
    assert.equal(service.getBindingsForScope(scope.scope_id).length, 2);
  });

  // -------------------------------------------------------------------------
  // TEST F: Runtime Architecture Refs Require Supply / Injection (Fail Closed)
  // -------------------------------------------------------------------------
  it("F. fails closed with MissingDependencyError when created without authoritative architecture integrity references", () => {
    // Service created without architecture integrity provider, and deps without refs
    const bareService = new VersionBindingService();
    const scope = createSampleScopeRecord("scope_fail_closed_bare");
    const depsWithoutRefs: VersionBindingDependencies = {
      runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
      model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
      deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
      gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
      platform_exporter_version: "stage12_serializer_digest_9a8b7c",
      fixture_library_version: "golden_stems_manifest_digest_def456",
      target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
      host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    };

    assert.throws(
      () => {
        bareService.bindVersions(scope, depsWithoutRefs);
      },
      (err: unknown) => {
        assert.ok(err instanceof MissingDependencyError);
        assert.ok(
          err.dependencyKey.startsWith("architecture_version_matrix."),
          "Must fail on missing architecture integrity reference"
        );
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // TEST G: All Nine Architecture Refs Required (Parameterized Independent Removal)
  // -------------------------------------------------------------------------
  it("G. independently requires authoritative integrity_ref for all nine architecture specifications", () => {
    for (const key of ARCHITECTURE_ARTIFACT_KEYS) {
      const incompleteRefs = { ...TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS };
      delete (incompleteRefs as any)[key];

      const service = new VersionBindingService();
      const scope = createSampleScopeRecord(`scope_missing_${key}`);
      const deps = createValidDependencies(incompleteRefs);

      assert.throws(
        () => {
          service.bindVersions(scope, deps);
        },
        (err: unknown) => {
          assert.ok(err instanceof MissingDependencyError);
          const matrixProp = ARTIFACT_KEY_TO_MATRIX_PROP[key];
          assert.equal(
            err.dependencyKey,
            `architecture_version_matrix.${matrixProp}.integrity_ref`,
            `Omission of integrity_ref for ${key} must fail with MissingDependencyError on exact field`
          );
          return true;
        }
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST H: Synthetic Test Refs Clearly Isolated
  // -------------------------------------------------------------------------
  it("H. verifies synthetic integrity refs originate exclusively from test fixtures and are not production defaults", () => {
    // buildCanonicalArchitectureMatrix() without parameters produces empty strings, NOT default hashes
    const matrixWithoutProvider = buildCanonicalArchitectureMatrix();
    for (const key of ARCHITECTURE_ARTIFACT_KEYS) {
      const prop = ARTIFACT_KEY_TO_MATRIX_PROP[key];
      assert.equal(
        matrixWithoutProvider[prop].integrity_ref,
        "",
        `Production default matrix for ${prop} must NOT contain synthetic placeholder hashes`
      );
    }

    // Explicit test fixture constant has clearly marked synthetic tokens
    for (const key of ARCHITECTURE_ARTIFACT_KEYS) {
      assert.ok(
        TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS[key].startsWith("test_"),
        `Test fixture token for ${key} must be explicitly prefixed with test_`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST I: Supplied Authoritative Reference Preservation
  // -------------------------------------------------------------------------
  it("I. injects nine distinct authoritative integrity references and verifies exact preservation in persisted Record 3", () => {
    const authoritativeRefs: Record<ArchitectureArtifactKey, string> = {
      "1C.5a": "auth_sha256_spec_1c5a_v03c_governed_digest_1111",
      "1C.5b": "auth_sha256_spec_1c5b_v02f_governed_digest_2222",
      "1C.5c": "auth_sha256_spec_1c5c_v01d_governed_digest_3333",
      "1C.5d": "auth_sha256_spec_1c5d_v01l_governed_digest_4444",
      "1C.5e": "auth_sha256_spec_1c5e_v01m_governed_digest_5555",
      "1C.5f": "auth_sha256_spec_1c5f_v01j_governed_digest_6666",
      "1C.5g": "auth_sha256_spec_1c5g_v01e_governed_digest_7777",
      "1C.5h_mandate": "auth_sha256_spec_1c5h_mandate_v01d_governed_digest_8888",
      "1C.5h_architecture": "auth_sha256_spec_1c5h_arch_v01j_governed_digest_9999",
    };

    const provider = new StaticArchitectureIntegrityReferenceProvider(authoritativeRefs);
    const service = new VersionBindingService(undefined, undefined, undefined, provider);
    const scope = createSampleScopeRecord("scope_preservation_test");
    const deps = createValidDependencies({});

    const record = service.bindVersions(scope, deps);

    for (const key of ARCHITECTURE_ARTIFACT_KEYS) {
      const prop = ARTIFACT_KEY_TO_MATRIX_PROP[key];
      assert.equal(
        record.architecture_version_matrix[prop].integrity_ref,
        authoritativeRefs[key],
        `Persisted Record 3 must preserve exact authoritative integrity reference for ${prop}`
      );
      assert.equal(
        record.version_integrity_reference.component_digests?.[prop],
        authoritativeRefs[key],
        `Component digest for ${prop} must match exact supplied reference`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST J: Integrity Reference Mutation
  // -------------------------------------------------------------------------
  it("J. changing one supplied architecture integrity ref produces new version-state digest, binding_id, and composite digest", () => {
    const service = createTestService();
    const scope = createSampleScopeRecord("scope_mut_arch_ref");
    const deps1 = createValidDependencies();

    const record1 = service.bindVersions(scope, deps1);

    // Mutate 1C.5h_architecture integrity ref
    const deps2 = createValidDependencies({
      ...TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
      "1C.5h_architecture": "test_sha256_MUTATED_1c5h_arch_ref",
    });

    const record2 = service.bindVersions(scope, deps2);

    assert.notEqual(record1.binding_id, record2.binding_id);
    assert.notEqual(
      record1.version_integrity_reference.composite_digest,
      record2.version_integrity_reference.composite_digest
    );
    assert.equal(
      record2.architecture_version_matrix["1C.5h_architecture_version"].integrity_ref,
      "test_sha256_MUTATED_1c5h_arch_ref"
    );
  });

  // -------------------------------------------------------------------------
  // TEST K: Version Mismatch Protection
  // -------------------------------------------------------------------------
  it("K. fails with VersionMismatchError if an architecture version label diverges, even with valid integrity_ref", () => {
    const service = createTestService();
    const scope = createSampleScopeRecord("scope_version_mismatch");
    const deps = createValidDependencies();

    assert.throws(
      () => {
        service.bindVersions(scope, {
          ...deps,
          architecture_version_matrix: buildCanonicalArchitectureMatrix(
            TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
            {
              "1C.5h_architecture_version": {
                version: "v0.1h", // Divergent version
                integrity_ref: TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS["1C.5h_architecture"],
              },
            }
          ),
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof VersionMismatchError);
        assert.equal(err.component, "Phase 1C.5h Architecture Baseline");
        assert.equal(err.expectedVersion, "v0.1j");
        assert.equal(err.actualVersion, "v0.1h");
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // TEST L: Idempotent Replay
  // -------------------------------------------------------------------------
  it("L. identical scope + versions + supplied refs + execution dependencies produces identical binding and single ledger entry", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const service = createTestService(graph, ledger);

    const scope = createSampleScopeRecord("scope_idemp_replay");
    const deps = createValidDependencies();

    const record1 = service.bindVersions(scope, deps);
    const record2 = service.bindVersions(scope, deps);

    assert.equal(record1.binding_id, record2.binding_id);
    assert.equal(
      record1.version_integrity_reference.composite_digest,
      record2.version_integrity_reference.composite_digest
    );

    const ledgerEntries = ledger.getEntries().filter((e) => e.entityId === record1.binding_id);
    assert.equal(ledgerEntries.length, 1, "Idempotent replay must not create duplicate ledger entries");
  });

  // -------------------------------------------------------------------------
  // TEST M: Historical Binding Preservation
  // -------------------------------------------------------------------------
  it("M. preserves immutable historical bindings when dependencies change for the same scope", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const service = createTestService(graph, ledger);

    const scope = createSampleScopeRecord("scope_history_preservation");
    const deps1 = createValidDependencies();
    const deps2 = {
      ...deps1,
      model_configuration_version: "claude-3-7-sonnet_temp0.3_prompt_v3.1",
    };

    const record1 = service.bindVersions(scope, deps1);
    const record2 = service.bindVersions(scope, deps2);

    assert.notEqual(record1.binding_id, record2.binding_id);

    // Prior binding record1 remains untouched and retrievable
    const historical1 = service.getBinding(record1.binding_id);
    assert.ok(historical1);
    assert.equal(historical1.model_configuration_version, deps1.model_configuration_version);

    // Latest returns record2
    const latest = service.getBindingByScopeId(scope.scope_id);
    assert.ok(latest);
    assert.equal(latest.binding_id, record2.binding_id);

    // All bindings for scope
    const allForScope = service.getBindingsForScope(scope.scope_id);
    assert.equal(allForScope.length, 2);
    assert.equal(allForScope[0].binding_id, record1.binding_id);
    assert.equal(allForScope[1].binding_id, record2.binding_id);

    // Immutability verified
    assert.throws(() => {
      (record1 as any).model_configuration_version = "illegal_mutation";
    }, TypeError);
  });

  // -------------------------------------------------------------------------
  // TEST N: Zero Edge Expansion (Preserves 14 Governed Edge Types)
  // -------------------------------------------------------------------------
  it("N. registers only Record 3 nodes and preserves exactly 14 governed edge types without expansion", () => {
    const graph = new ValidationRelationshipGraph();
    const service = createTestService(graph);

    const scope = createSampleScopeRecord("scope_graph_edges");
    const deps = createValidDependencies();

    const record = service.bindVersions(scope, deps);

    // Node is registered
    const node = graph.getNode(record.binding_id);
    assert.ok(node);
    assert.equal(node.id, record.binding_id);
    assert.equal(node.kind, GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord);

    // No edge created between scope and version binding (BOUND_TO is reserved for ValidationCase/Package)
    const allEdges = graph.getEdges();
    assert.equal(allEdges.length, 0, "WP-05 must not create premature scope->version edges");

    // Governed edge catalogue count remains exactly 14
    const edgeTypes = Object.keys(GOVERNED_EDGE_TYPES);
    assert.equal(edgeTypes.length, 14, "Governed edge catalogue must remain exactly 14");
  });

  // -------------------------------------------------------------------------
  // TEST O: Parameterized Execution Environment Dependency Mutation
  // -------------------------------------------------------------------------
  it("O. produces distinct binding_id and composite digest for each individual execution dependency mutation", () => {
    const scope = createSampleScopeRecord("scope_runtime_mutations");
    const baseDeps = createValidDependencies();
    const service = createTestService();

    const baseline = service.bindVersions(scope, baseDeps);
    const baseBindingId = baseline.binding_id;
    const baseDigest = baseline.version_integrity_reference.composite_digest;

    const runtimeKeys: (keyof typeof baseDeps)[] = [
      "runtime_implementation_version",
      "model_configuration_version",
      "deterministic_rules_version",
      "gear_catalog_version",
      "platform_exporter_version",
      "fixture_library_version",
      "target_platform_runtime_version",
      "host_environment_version",
    ];

    for (const key of runtimeKeys) {
      const mutatedDeps = {
        ...baseDeps,
        [key]: `${baseDeps[key]}_MUTATED`,
      };
      const mutatedRecord = service.bindVersions(scope, mutatedDeps);
      assert.notEqual(
        mutatedRecord.binding_id,
        baseBindingId,
        `Mutating "${key}" must produce distinct binding_id`
      );
      assert.notEqual(
        mutatedRecord.version_integrity_reference.composite_digest,
        baseDigest,
        `Mutating "${key}" must produce distinct composite_digest`
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST P: Prohibits Placeholder Hash Tokens and Version Cloning
  // -------------------------------------------------------------------------
  it("P. rejects placeholder strings ('unknown', 'pending', version string clone) as integrity references", () => {
    const service = new VersionBindingService();
    const scope = createSampleScopeRecord("scope_placeholder_test");

    // Case 1: integrity_ref cloned from version string
    assert.throws(
      () => {
        service.bindVersions(scope, createValidDependencies({
          ...TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
          "1C.5a": "v0.3c", // Cloned version string
        }));
      },
      (err: unknown) => {
        assert.ok(err instanceof MissingDependencyError);
        assert.equal(err.dependencyKey, "architecture_version_matrix.1C.5a_version.integrity_ref");
        return true;
      }
    );

    // Case 2: placeholder "unknown"
    assert.throws(
      () => {
        service.bindVersions(scope, createValidDependencies({
          ...TEST_SYNTHETIC_UPSTREAM_INTEGRITY_REFS,
          "1C.5f": "unknown",
        }));
      },
      (err: unknown) => {
        assert.ok(err instanceof MissingDependencyError);
        assert.equal(err.dependencyKey, "architecture_version_matrix.1C.5f_version.integrity_ref");
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // TEST Q: Timestamp Invariance
  // -------------------------------------------------------------------------
  it("Q. different timestamps produce identical binding_id, composite digest, and no duplicate binding", () => {
    const service = createTestService();
    const scope = createSampleScopeRecord("scope_time_01");
    const deps = createValidDependencies();

    const record1 = service.bindVersions(scope, deps, { timestamp: "2026-10-14T00:00:00.000Z" });
    const record2 = service.bindVersions(scope, deps, { timestamp: "2026-10-14T12:00:00.000Z" });

    assert.equal(record1.binding_id, record2.binding_id, "Timestamp must not alter binding_id");
    assert.equal(
      record1.version_integrity_reference.composite_digest,
      record2.version_integrity_reference.composite_digest,
      "Timestamp must not alter composite_digest"
    );
    assert.equal(service.getBindingsForScope(scope.scope_id).length, 1);
  });

  // -------------------------------------------------------------------------
  // TEST R: Cryptographic Composite Integrity Verification
  // -------------------------------------------------------------------------
  it("R. verifyBindingIntegrity confirms cryptographic validity and detects tampering", () => {
    const service = createTestService();
    const scope = createSampleScopeRecord("scope_verify_integ");
    const deps = createValidDependencies();

    const record = service.bindVersions(scope, deps);
    assert.ok(service.verifyBindingIntegrity(record.binding_id));
    assert.ok(service.verifyBindingIntegrity(record));

    // Tampered record
    const tampered = {
      ...record,
      runtime_implementation_version: "tampered_version",
    };
    assert.equal(service.verifyBindingIntegrity(tampered as any), false);
  });
});
