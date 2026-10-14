// src/tests/validationVersionBinding.test.ts
// Phase 1C.5h — WP-05: Strict Version Binding Subsystem Tests
// Verifies Section 9.2, Section 9.5, Section 33, and Implementation Plan v0.1h WP-05.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanonicalArchitectureMatrix,
  buildCanonicalBaselineTrace,
  DEFAULT_FROZEN_UPSTREAM_INTEGRITY_REFS,
  DefaultSha256IntegrityProvider,
  FROZEN_UPSTREAM_TITLES,
  FROZEN_UPSTREAM_VERSIONS,
  GOVERNED_ENTITY_KINDS,
  MissingDependencyError,
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

  // Canonical valid execution environment dependencies fixture
  function createValidDependencies(): VersionBindingDependencies {
    return {
      runtime_implementation_version: "git_sha_8f3a9e2b1c4d5e6f",
      model_configuration_version: "claude-3-7-sonnet_temp0.0_prompt_v2.4_sha256_abc123",
      deterministic_rules_version: "rules_digest_2026_10_14_v1.0.4",
      gear_catalog_version: "catalog_digest_at5_v5.10_rev3",
      platform_exporter_version: "stage12_serializer_digest_9a8b7c",
      fixture_library_version: "golden_stems_manifest_digest_def456",
      target_platform_runtime_version: "AmpliTube5_v5.10.0_b123",
      host_environment_version: "Linux_x86_64_Kernel_6.6_AudioALSA_v1.2.11",
    };
  }

  // -------------------------------------------------------------------------
  // CHECK 1: Schema Parity & Full Upstream Matrix Binding
  // -------------------------------------------------------------------------
  it("A. binds the complete frozen upstream architecture version matrix and produces canonical Record 3", () => {
    const scope = createSampleScopeRecord();
    const deps = createValidDependencies();
    const service = new VersionBindingService();

    const record = service.bindVersions(scope, deps);

    // 100% field parity with Section 9.5
    assert.equal(record.binding_id, `binding_${scope.scope_id}`);
    assert.equal(record.scope_id, scope.scope_id);
    assert.equal(record.runtime_implementation_version, deps.runtime_implementation_version);
    assert.equal(record.model_configuration_version, deps.model_configuration_version);
    assert.equal(record.deterministic_rules_version, deps.deterministic_rules_version);
    assert.equal(record.gear_catalog_version, deps.gear_catalog_version);
    assert.equal(record.platform_exporter_version, deps.platform_exporter_version);
    assert.equal(record.fixture_library_version, deps.fixture_library_version);
    assert.equal(record.target_platform_runtime_version, deps.target_platform_runtime_version);
    assert.equal(record.host_environment_version, deps.host_environment_version);

    // Verify all eight upstream specifications in the matrix
    const matrix = record.architecture_version_matrix;
    assert.equal(matrix["1C.5a_version"].version, "v0.3c");
    assert.equal(matrix["1C.5b_version"].version, "v0.2f");
    assert.equal(matrix["1C.5c_version"].version, "v0.1d");
    assert.equal(matrix["1C.5d_version"].version, "v0.1l");
    assert.equal(matrix["1C.5e_version"].version, "v0.1m");
    assert.equal(matrix["1C.5f_version"].version, "v0.1j");
    assert.equal(matrix["1C.5g_version"].version, "v0.1e");
    assert.equal(matrix["1C.5h_mandate_version"].version, "v0.1d");

    // Verify baseline trace component in version_integrity_reference
    assert.equal(
      record.version_integrity_reference.component_digests?.["1C.5h_architecture_version"],
      "v0.1j"
    );

    // Conforms strictly to signed-off Zod schema
    const parsed = validationVersionBindingRecordSchema.parse(record);
    assert.equal(parsed.binding_id, record.binding_id);
  });

  // -------------------------------------------------------------------------
  // CHECK 2: Deterministic Integrity Reference Generation
  // -------------------------------------------------------------------------
  it("B. generates deterministic composite integrity references across identical environments", () => {
    const scope = createSampleScopeRecord("scope_determ_01");
    const deps = createValidDependencies();
    const fixedTimestamp = "2026-10-14T10:00:00.000Z";

    const service1 = new VersionBindingService();
    const service2 = new VersionBindingService();

    const record1 = service1.bindVersions(scope, deps, { timestamp: fixedTimestamp });
    const record2 = service2.bindVersions(scope, deps, { timestamp: fixedTimestamp });

    assert.equal(
      record1.version_integrity_reference.composite_digest,
      record2.version_integrity_reference.composite_digest,
      "Composite digests must be 100% deterministic given identical inputs and timestamps"
    );
    assert.equal(record1.version_integrity_reference.algorithm, "SHA-256");
  });

  // -------------------------------------------------------------------------
  // CHECK 3: Modifying Any Upstream Specification Breaks Composite Digest
  // -------------------------------------------------------------------------
  it("C. breaks composite integrity reference when any upstream specification in architecture matrix is modified", () => {
    const scope = createSampleScopeRecord();
    const deps = createValidDependencies();
    const fixedTimestamp = "2026-10-14T10:00:00.000Z";

    const service = new VersionBindingService();
    const baselineRecord = service.bindVersions(scope, deps, { timestamp: fixedTimestamp });
    const baselineDigest = baselineRecord.version_integrity_reference.composite_digest;

    // Test modifying 1C.5a integrity reference
    const alteredArch1 = buildCanonicalArchitectureMatrix({
      "1C.5a_version": { version: "v0.3c", integrity_ref: "sha256_tampered_1c5a" },
    });
    const recordAltered1 = new VersionBindingService().bindVersions(
      createSampleScopeRecord("scope_alt_1"),
      { ...deps, architecture_version_matrix: alteredArch1 },
      { timestamp: fixedTimestamp }
    );
    assert.notEqual(
      recordAltered1.version_integrity_reference.composite_digest,
      baselineDigest,
      "Tampering with 1C.5a integrity_ref must change composite digest"
    );

    // Test modifying 1C.5g integrity reference
    const alteredArch2 = buildCanonicalArchitectureMatrix({
      "1C.5g_version": { version: "v0.1e", integrity_ref: "sha256_tampered_1c5g" },
    });
    const recordAltered2 = new VersionBindingService().bindVersions(
      createSampleScopeRecord("scope_alt_2"),
      { ...deps, architecture_version_matrix: alteredArch2 },
      { timestamp: fixedTimestamp }
    );
    assert.notEqual(
      recordAltered2.version_integrity_reference.composite_digest,
      baselineDigest,
      "Tampering with 1C.5g integrity_ref must change composite digest"
    );

    // Test modifying baseline trace integrity reference
    const alteredTrace = {
      version: "v0.1j",
      integrity_ref: "sha256_tampered_baseline_trace",
    };
    const recordAltered3 = new VersionBindingService().bindVersions(
      createSampleScopeRecord("scope_alt_3"),
      { ...deps, detailed_baseline_trace: alteredTrace },
      { timestamp: fixedTimestamp }
    );
    assert.notEqual(
      recordAltered3.version_integrity_reference.composite_digest,
      baselineDigest,
      "Tampering with 1C.5h baseline trace integrity_ref must change composite digest"
    );
  });

  // -------------------------------------------------------------------------
  // CHECK 4: Modifying Any Runtime Dependency Breaks Composite Digest
  // -------------------------------------------------------------------------
  it("D. breaks composite integrity reference when any runtime execution dependency is modified", () => {
    const scope = createSampleScopeRecord();
    const deps = createValidDependencies();
    const fixedTimestamp = "2026-10-14T10:00:00.000Z";

    const service = new VersionBindingService();
    const baseline = service.bindVersions(scope, deps, { timestamp: fixedTimestamp });
    const baselineDigest = baseline.version_integrity_reference.composite_digest;

    const runtimeKeys: (keyof VersionBindingDependencies)[] = [
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
      const modifiedDeps = {
        ...deps,
        [key]: `${deps[key]}_MUTATED_FOR_TEST`,
      };
      const alteredRecord = new VersionBindingService().bindVersions(
        createSampleScopeRecord(`scope_mut_${key}`),
        modifiedDeps,
        { timestamp: fixedTimestamp }
      );
      assert.notEqual(
        alteredRecord.version_integrity_reference.composite_digest,
        baselineDigest,
        `Mutating execution dependency "${key}" must break composite integrity digest`
      );
    }
  });

  // -------------------------------------------------------------------------
  // CHECK 5: Upstream Version Mismatch Rejection
  // -------------------------------------------------------------------------
  it("E. rejects upstream version mismatches with VersionMismatchError", () => {
    const scope = createSampleScopeRecord();
    const deps = createValidDependencies();
    const service = new VersionBindingService();

    // Mismatched 1C.5a version (v0.3b instead of v0.3c)
    assert.throws(
      () => {
        service.bindVersions(scope, {
          ...deps,
          architecture_version_matrix: {
            "1C.5a_version": { version: "v0.3b", integrity_ref: "sha256_old" },
          },
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof VersionMismatchError);
        assert.equal(err.component, "Phase 1C.5a");
        assert.equal(err.expectedVersion, "v0.3c");
        assert.equal(err.actualVersion, "v0.3b");
        return true;
      }
    );

    // Mismatched 1C.5g version (v0.1d instead of v0.1e)
    assert.throws(
      () => {
        service.bindVersions(scope, {
          ...deps,
          architecture_version_matrix: {
            "1C.5g_version": { version: "v0.1d", integrity_ref: "sha256_old" },
          },
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof VersionMismatchError);
        assert.equal(err.component, "Phase 1C.5g");
        assert.equal(err.expectedVersion, "v0.1e");
        assert.equal(err.actualVersion, "v0.1d");
        return true;
      }
    );

    // Mismatched baseline trace version (v0.1h instead of v0.1j)
    assert.throws(
      () => {
        service.bindVersions(scope, {
          ...deps,
          detailed_baseline_trace: { version: "v0.1h", integrity_ref: "sha256_old" },
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof VersionMismatchError);
        assert.equal(err.component, "Phase 1C.5h Baseline Trace Architecture");
        assert.equal(err.expectedVersion, "v0.1j");
        assert.equal(err.actualVersion, "v0.1h");
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // CHECK 6: Missing Dependency Field Rejection (100% field population)
  // -------------------------------------------------------------------------
  it("F. rejects missing or empty dependency fields with MissingDependencyError", () => {
    const scope = createSampleScopeRecord();
    const service = new VersionBindingService();

    const mandatoryKeys = [
      "runtime_implementation_version",
      "model_configuration_version",
      "deterministic_rules_version",
      "gear_catalog_version",
      "platform_exporter_version",
      "fixture_library_version",
      "target_platform_runtime_version",
      "host_environment_version",
    ] as const;

    for (const key of mandatoryKeys) {
      const deps = createValidDependencies();
      (deps as any)[key] = ""; // empty string

      assert.throws(
        () => {
          service.bindVersions(scope, deps);
        },
        (err: unknown) => {
          assert.ok(err instanceof MissingDependencyError);
          assert.equal(err.dependencyKey, key);
          return true;
        },
        `Must throw MissingDependencyError for empty "${key}"`
      );

      const depsWhitespace = createValidDependencies();
      (depsWhitespace as any)[key] = "   "; // whitespace only
      assert.throws(
        () => {
          service.bindVersions(scope, depsWhitespace);
        },
        (err: unknown) => {
          assert.ok(err instanceof MissingDependencyError);
          assert.equal(err.dependencyKey, key);
          return true;
        },
        `Must throw MissingDependencyError for whitespace "${key}"`
      );
    }
  });

  // -------------------------------------------------------------------------
  // CHECK 7: verifyBindingIntegrity API
  // -------------------------------------------------------------------------
  it("G. verifyBindingIntegrity validates genuine records and detects tampering", () => {
    const scope = createSampleScopeRecord();
    const deps = createValidDependencies();
    const service = new VersionBindingService();

    const record = service.bindVersions(scope, deps);

    // Genuine record verifies true
    assert.equal(service.verifyBindingIntegrity(record), true);
    assert.equal(service.verifyBindingIntegrity(record.binding_id), true);

    // Tampered record copy
    const tamperedRecord: ValidationVersionBindingRecord = {
      ...record,
      runtime_implementation_version: "tampered_commit_sha",
    };
    assert.equal(service.verifyBindingIntegrity(tamperedRecord), false);
  });

  // -------------------------------------------------------------------------
  // CHECK 8: Immutability and Idempotency
  // -------------------------------------------------------------------------
  it("H. enforces deep freeze immutability and idempotent lookup", () => {
    const scope = createSampleScopeRecord("scope_freeze_01");
    const deps = createValidDependencies();
    const service = new VersionBindingService();

    const record = service.bindVersions(scope, deps);

    // Freeze protection: mutations throw TypeError
    assert.throws(() => {
      (record as any).runtime_implementation_version = "illegal_mutation";
    }, TypeError);

    assert.throws(() => {
      (record.architecture_version_matrix["1C.5a_version"] as any).version = "v0.99z";
    }, TypeError);

    // Idempotent retrieval
    const retrievedById = service.getBinding(record.binding_id);
    assert.equal(retrievedById, record);

    const retrievedByScope = service.getBindingByScopeId(scope.scope_id);
    assert.equal(retrievedByScope, record);

    // Re-calling bindVersions returns identical cached record
    const secondCall = service.bindVersions(scope, deps);
    assert.equal(secondCall, record);
  });

  // -------------------------------------------------------------------------
  // CHECK 9: Atomic Graph and Ledger Integration
  // -------------------------------------------------------------------------
  it("I. atomically registers ValidationVersionBindingRecord node in graph and entry in audit ledger", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const service = new VersionBindingService(graph, ledger);

    const scope = createSampleScopeRecord("scope_graph_01");
    const deps = createValidDependencies();

    const record = service.bindVersions(scope, deps);

    // Verify Graph Registration
    const graphNode = graph.getNode(record.binding_id);
    assert.ok(graphNode, "Node must be registered in relationship graph");
    assert.equal(graphNode.id, record.binding_id);
    assert.equal(graphNode.kind, GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord);

    // Verify Ledger Entry
    const ledgerEntries = ledger.getEntries().filter((e) => e.entityId === record.binding_id);
    assert.equal(ledgerEntries.length, 1);
    const entry = ledgerEntries[0];
    assert.equal(entry.entityKind, GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord);
    assert.equal(entry.entityId, record.binding_id);
    assert.equal((entry.payload as any).binding_id, record.binding_id);

    // Verify Ledger Integrity Chain
    const ledgerCheck = ledger.verifyLedger();
    assert.equal(ledgerCheck.isValid, true);
    assert.equal(ledgerCheck.totalEntries, 1);
  });
});
