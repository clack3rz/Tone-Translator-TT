// src/tests/validationIntake.test.ts
// Comprehensive unit tests for Phase 1C.5h — WP-03: Validation Intake & Sealed Handoff Package Verification (Record 1)
// Bound to frozen specification v0.1j Section 8 and Implementation Plan v0.1h WP-03.

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { INTAKE_STATUSES } from "../sound-engineer/validation/schemas/enums";
import { canonicalizeJson } from "../sound-engineer/validation/schemas/integrity";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  InvalidEndpointError,
  validateEdgeEndpoints,
} from "../sound-engineer/validation/graph/edgeTypes";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import { DefaultSha256IntegrityProvider } from "../sound-engineer/validation/storage/ledgerTypes";
import {
  PHASE_1C5G_GATE_NAMES,
  MigrationHandoffPackage,
  GateCompletionToken,
} from "../sound-engineer/validation/intake/types";
import { ValidationIntakeService } from "../sound-engineer/validation/intake/intakeService";
import * as CanonicalEnums from "../sound-engineer/validation/schemas/enums";
import {
  DefaultHandoffSignatureVerifier,
  LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES,
  SignerAuthorizationPolicy,
} from "../sound-engineer/validation/intake/signatureVerifier";

describe("Phase 1C.5h — WP-03: Validation Intake & Sealed Handoff Package Verification", () => {
  let graph: ValidationRelationshipGraph;
  let ledger: ValidationAuditLedger;
  let integrityProvider: DefaultSha256IntegrityProvider;
  let signatureVerifier: DefaultHandoffSignatureVerifier;
  let intakeService: ValidationIntakeService;

  beforeEach(() => {
    graph = new ValidationRelationshipGraph();
    ledger = new ValidationAuditLedger();
    integrityProvider = new DefaultSha256IntegrityProvider();
    signatureVerifier = new DefaultHandoffSignatureVerifier();
    intakeService = new ValidationIntakeService(
      graph,
      ledger,
      integrityProvider,
      signatureVerifier
    );
  });

  /**
   * Helper constructing valid seven Phase 1C.5g gate tokens.
   */
  function createValidSevenGates(): GateCompletionToken[] {
    return PHASE_1C5G_GATE_NAMES.map((name, idx) => ({
      gate_name: name,
      status: "COMPLETE",
      token_id: `token_gate_${idx + 1}_${name.toLowerCase().replace(/\s+/g, "_")}`,
      sealed_at: "2026-10-13T10:00:00.000Z",
      authorized_by: "phase_1c5g_lead_auditor",
    }));
  }

  /**
   * Helper constructing a complete valid MigrationHandoffPackage fixture.
   */
  function createValidHandoffPackage(overrides?: Partial<MigrationHandoffPackage>): MigrationHandoffPackage {
    const gates = overrides?.gates ?? createValidSevenGates();
    const coreData = {
      package_id: overrides?.package_id ?? "mhp_amp_high_gain_v1",
      migration_batch_id: overrides?.migration_batch_id ?? "batch_2026_10_13_001",
      requested_by: overrides?.requested_by ?? "migration_coordinator_service",
      declared_scope: overrides?.declared_scope ?? "High-Gain Lead Amplifier Models (American Preamp Line)",
      frozen_upstream_versions: overrides?.frozen_upstream_versions ?? {
        "1C.5a": "v0.3c",
        "1C.5b": "v0.2f",
        "1C.5c": "v0.1d",
        "1C.5d": "v0.1l",
        "1C.5e": "v0.1m",
        "1C.5f": "v0.1j",
        "1C.5g": "v0.1e",
      },
      target_platform_declared_version: overrides?.target_platform_declared_version ?? "AmpliTube5_v5.10.0_b123",
      gates,
    };

    const computedIntegrity = integrityProvider.computeDigest(canonicalizeJson(coreData));
    const integrityRef = overrides?.integrity_ref ?? computedIntegrity;

    const basePackage: MigrationHandoffPackage = {
      ...coreData,
      package_type: "MIGRATION_HANDOFF_PACKAGE",
      source_phase: "Phase 1C.5g",
      integrity_ref: integrityRef,
      signature: `sig_rsa4096_${computedIntegrity.substring(0, 16)}`,
      signer_identity: "cert_phase_1c5g_release_key_2026",
      signer_role: "PHASE_1C5G_OFFICIAL",
    };

    return {
      ...basePackage,
      ...overrides,
    };
  }

  // =========================================================================
  // Section A: Valid Accepted Handoff & DERIVED_FROM_HANDOFF Edge
  // =========================================================================
  it("A. Valid sealed handoff package produces INTAKE_ACCEPTED, links DERIVED_FROM_HANDOFF, and commits to ledger", () => {
    const pkg = createValidHandoffPackage();

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_ACCEPTED");
    assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_ACCEPTED);
    assert.equal(result.intakeRecord.rejection_reason, undefined);
    assert.equal(result.intakeRecord.handoff_package_id, pkg.package_id);
    assert.equal(result.intakeRecord.handoff_package_integrity_ref, pkg.integrity_ref);

    // Verify Record 1 integrity metadata is sealed
    assert.equal(result.intakeRecord.record_integrity_metadata.algorithm, "SHA-256");
    assert.ok(result.intakeRecord.record_integrity_metadata.integrity_digest.length > 0);

    // Verify canonical DERIVED_FROM_HANDOFF edge exists in graph
    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.source.id, result.intakeRecord.intake_id);
    assert.equal(result.relationshipEdge.source.kind, GOVERNED_ENTITY_KINDS.ValidationIntakeRecord);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.equal(result.relationshipEdge.target.kind, GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord);

    // Verify graph registration
    assert.ok(graph.hasNode(result.intakeRecord.intake_id));
    assert.ok(graph.hasNode(pkg.package_id));
    assert.ok(graph.hasEdge(result.relationshipEdge.edgeId));

    // Verify audit ledger commits both Record 1 and relationship edge
    assert.equal(ledger.getEntryCount(), 2);
    const ledgerEntries = ledger.getEntries();
    assert.equal(ledgerEntries[0].entityKind, GOVERNED_ENTITY_KINDS.ValidationIntakeRecord);
    assert.equal(ledgerEntries[1].entityKind, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(ledger.verifyLedger().isValid, true);
  });

  // =========================================================================
  // Section B: Corrupted Integrity Reference (Identifiable Rejected Handoff)
  // =========================================================================
  it("B. Corrupted payload or invalid integrity_ref causes INTAKE_REJECTED but preserves identifiable provenance via DERIVED_FROM_HANDOFF", () => {
    const validPkg = createValidHandoffPackage();
    const corruptedPkg: MigrationHandoffPackage = {
      ...validPkg,
      package_id: "mhp_corrupted_001",
      declared_scope: "Tampered Scope Without Recalculating Checksum",
    };

    const result = intakeService.processIntake(corruptedPkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_REJECTED);
    assert.ok(result.rejectionReason?.includes("integrity mismatch"));

    // Provable provenance: DERIVED_FROM_HANDOFF exists to identifiable handoff
    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.source.id, result.intakeRecord.intake_id);
    assert.equal(result.relationshipEdge.target.id, corruptedPkg.package_id);

    // Graph registration
    assert.ok(graph.hasNode(result.intakeRecord.intake_id));
    assert.ok(graph.hasNode(corruptedPkg.package_id));
    assert.ok(graph.hasEdge(result.relationshipEdge.edgeId));
    assert.equal(graph.getEdges().length, 1);

    // Audit ledger commits both rejected record and relationship edge
    assert.equal(ledger.getEntryCount(), 2);
    assert.equal(ledger.verifyLedger().isValid, true);
  });

  // =========================================================================
  // Section C: Invalid Digital Signature (Identifiable Rejected Handoff)
  // =========================================================================
  it("C. Corrupted or invalid digital signature causes INTAKE_REJECTED with provenance linkage", () => {
    const pkg = createValidHandoffPackage({
      package_id: "mhp_bad_sig_001",
      signature: "INVALID_SIGNATURE",
    });

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_REJECTED);
    assert.ok(result.rejectionReason?.includes("signature is corrupted or invalid"));

    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.ok(graph.hasNode(pkg.package_id));
    assert.equal(graph.getEdges().length, 1);
  });

  // =========================================================================
  // Section D: Unauthorized Signer Role (Identifiable Rejected Handoff)
  // =========================================================================
  it("D. Valid signature from unauthorized signer role causes INTAKE_REJECTED with provenance linkage", () => {
    const pkg = createValidHandoffPackage({
      package_id: "mhp_unauthorized_role_001",
      signer_role: "JUNIOR_INTERN_DEVELOPER",
    });

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_REJECTED);
    assert.ok(result.rejectionReason?.includes("is not authorized for Phase 1C.5g handoff issuance"));

    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.ok(graph.hasNode(pkg.package_id));
    assert.equal(graph.getEdges().length, 1);
  });

  // =========================================================================
  // Section E: Missing Phase 1C.5g Gate Token (Parameterized across all 7 gates)
  // =========================================================================
  it("E. Omission of ANY of the seven Phase 1C.5g gates causes INTAKE_REJECTED with provenance linkage", () => {
    for (let i = 0; i < PHASE_1C5G_GATE_NAMES.length; i++) {
      const omittedGate = PHASE_1C5G_GATE_NAMES[i];
      const incompleteGates = createValidSevenGates().filter((g) => g.gate_name !== omittedGate);

      const localGraph = new ValidationRelationshipGraph();
      const localLedger = new ValidationAuditLedger();
      const localService = new ValidationIntakeService(
        localGraph,
        localLedger,
        integrityProvider,
        signatureVerifier
      );

      const coreData = {
        package_id: `mhp_missing_gate_${i + 1}`,
        migration_batch_id: "batch_missing_gate",
        requested_by: "coordinator",
        declared_scope: "Scope",
        frozen_upstream_versions: { "1C.5a": "v1.0" },
        target_platform_declared_version: "AT5",
        gates: incompleteGates,
      };

      const integrityRef = integrityProvider.computeDigest(canonicalizeJson(coreData));
      const pkg: MigrationHandoffPackage = {
        ...coreData,
        integrity_ref: integrityRef,
        signature: `sig_valid_${integrityRef.substring(0, 8)}`,
        signer_identity: "cert_auth_key",
        signer_role: "PHASE_1C5G_OFFICIAL",
      };

      const result = localService.processIntake(pkg);

      assert.equal(result.status, "INTAKE_REJECTED");
      assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_REJECTED);
      assert.ok(
        result.rejectionReason?.includes(omittedGate),
        `Must reject when gate "${omittedGate}" is omitted`
      );
      assert.ok(result.relationshipEdge);
      assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
      assert.equal(result.relationshipEdge.target.id, pkg.package_id);
      assert.ok(localGraph.hasNode(pkg.package_id));
      assert.equal(localGraph.getEdges().length, 1);
    }
  });

  // =========================================================================
  // Section F: Renamed Gate Token Rejection
  // =========================================================================
  it("F. Renamed gate token causes INTAKE_REJECTED with provenance linkage", () => {
    const gates = createValidSevenGates().map((g) => {
      if (g.gate_name === "Structural Mapping Complete") {
        return { ...g, gate_name: "Structural Mapping Passed" }; // Renamed!
      }
      return g;
    });

    const coreData = {
      package_id: "mhp_renamed_gate_001",
      migration_batch_id: "batch_renamed_gate",
      requested_by: "coordinator",
      declared_scope: "Scope",
      frozen_upstream_versions: { "1C.5a": "v1.0" },
      target_platform_declared_version: "AT5",
      gates,
    };

    const integrityRef = integrityProvider.computeDigest(canonicalizeJson(coreData));
    const pkg: MigrationHandoffPackage = {
      ...coreData,
      integrity_ref: integrityRef,
      signature: "sig_valid_renamed_test",
      signer_identity: "cert_auth_key",
      signer_role: "MIGRATION_OFFICIAL",
    };

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.ok(result.rejectionReason?.includes("Structural Mapping Complete"));
    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.ok(graph.hasNode(pkg.package_id));
  });

  // =========================================================================
  // Section G: Missing Declared Scope Reference
  // =========================================================================
  it("G. Missing declared scope reference causes INTAKE_REJECTED with provenance linkage", () => {
    const pkg = createValidHandoffPackage({
      package_id: "mhp_missing_scope_001",
      declared_scope: "", // Empty scope
    });

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.ok(result.rejectionReason?.includes("missing declared migration scope reference"));
    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.ok(graph.hasNode(pkg.package_id));
  });

  // =========================================================================
  // Section H: Missing Frozen Upstream Version Metadata
  // =========================================================================
  it("H. Missing frozen upstream version metadata causes INTAKE_REJECTED with provenance linkage", () => {
    const pkg = createValidHandoffPackage({
      package_id: "mhp_missing_versions_001",
      frozen_upstream_versions: {}, // Empty versions
    });

    const result = intakeService.processIntake(pkg);

    assert.equal(result.status, "INTAKE_REJECTED");
    assert.ok(result.rejectionReason?.includes("missing required frozen upstream version metadata"));
    assert.ok(result.relationshipEdge);
    assert.equal(result.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge.target.id, pkg.package_id);
    assert.ok(graph.hasNode(pkg.package_id));
  });

  // =========================================================================
  // Section I: Unidentifiable Malformed Envelope Exception
  // =========================================================================
  it("I. Unidentifiable malformed envelope retains audit history but does NOT fabricate graph nodes or edges", () => {
    const initialEdgeCount = graph.getEdges().length;
    const initialNodeCount = graph.getNodes().length;

    // 1. Null payload
    const malformed1 = intakeService.processIntake(null as any);
    assert.equal(malformed1.status, "INTAKE_REJECTED");
    assert.ok(malformed1.rejectionReason?.includes("null or undefined"));
    assert.equal(malformed1.relationshipEdge, undefined);
    assert.equal(graph.getEdges().length, initialEdgeCount);
    assert.equal(graph.getNodes().length, initialNodeCount);

    // 2. Empty object without package_id
    const malformed2 = intakeService.processIntake({} as any);
    assert.equal(malformed2.status, "INTAKE_REJECTED");
    assert.ok(malformed2.rejectionReason?.includes("package_id"));
    assert.equal(malformed2.relationshipEdge, undefined);
    assert.equal(graph.getEdges().length, initialEdgeCount);
    assert.equal(graph.getNodes().length, initialNodeCount);

    // 3. Blank/whitespace package_id
    const malformed3 = intakeService.processIntake({ package_id: "   " } as any);
    assert.equal(malformed3.status, "INTAKE_REJECTED");
    assert.ok(malformed3.rejectionReason?.includes("package_id"));
    assert.equal(malformed3.relationshipEdge, undefined);
    assert.equal(graph.getEdges().length, initialEdgeCount);
    assert.equal(graph.getNodes().length, initialNodeCount);

    // Verify all 3 rejections are preserved in immutable audit ledger
    assert.equal(ledger.getEntryCount(), 3);
    assert.equal(ledger.verifyLedger().isValid, true);
  });

  // =========================================================================
  // Section J: Canonical Enum Protection (Zero Transient States)
  // =========================================================================
  it("J. Strictly enforces canonical enum parity (INTAKE_ACCEPTED | INTAKE_REJECTED) with zero transient states", () => {
    const validPkg = createValidHandoffPackage({ package_id: "mhp_accepted_canonical" });
    const acceptedResult = intakeService.processIntake(validPkg);

    assert.equal(acceptedResult.intakeRecord.intake_status, "INTAKE_ACCEPTED");
    assert.ok(["INTAKE_ACCEPTED", "INTAKE_REJECTED"].includes(acceptedResult.intakeRecord.intake_status));

    const badPkg = createValidHandoffPackage({ package_id: "mhp_rej_canonical", signature: "INVALID_SIGNATURE" });
    const rejectedResult = intakeService.processIntake(badPkg);

    assert.equal(rejectedResult.intakeRecord.intake_status, "INTAKE_REJECTED");
    assert.ok(["INTAKE_ACCEPTED", "INTAKE_REJECTED"].includes(rejectedResult.intakeRecord.intake_status));

    const allIntakes = intakeService.getAllIntakes();
    for (const record of allIntakes) {
      assert.ok(
        record.intake_status === INTAKE_STATUSES.INTAKE_ACCEPTED ||
          record.intake_status === INTAKE_STATUSES.INTAKE_REJECTED,
        `Persisted intake_status "${record.intake_status}" must be canonical enum`
      );
    }
  });

  // =========================================================================
  // Section K: Governed Edge Directionality (ValidationIntakeRecord -> MigrationHandoffPackageRecord)
  // =========================================================================
  it("K. Enforces exact edge direction: ValidationIntakeRecord -> MigrationHandoffPackageRecord", () => {
    const intakeNode = {
      id: "intake_test_dir_01",
      kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
    };
    const handoffNode = {
      id: "mhp_test_dir_01",
      kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
    };

    assert.ok(
      validateEdgeEndpoints(
        GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
        intakeNode,
        handoffNode
      )
    );

    assert.throws(
      () =>
        validateEdgeEndpoints(
          GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
          handoffNode,
          intakeNode
        ),
      InvalidEndpointError
    );
  });

  // =========================================================================
  // Section L & M: Corrected Atomicity Rule on Rejection
  // =========================================================================
  it("L & M. Corrected atomicity rule: Rejection terminates downstream progression but does NOT erase identifiable provenance", () => {
    const badPkg = createValidHandoffPackage({
      package_id: "mhp_atomic_fail_01",
      signature: "INVALID_SIGNATURE",
    });

    const result = intakeService.processIntake(badPkg);
    assert.equal(result.status, "INTAKE_REJECTED");
    assert.equal(result.intakeRecord.intake_status, INTAKE_STATUSES.INTAKE_REJECTED);

    // Identifiable provenance is preserved
    assert.ok(graph.hasNode(badPkg.package_id));
    assert.ok(graph.hasNode(result.intakeRecord.intake_id));
    assert.equal(graph.getEdges().length, 1);
    assert.equal(result.relationshipEdge?.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);
    assert.equal(result.relationshipEdge?.source.id, result.intakeRecord.intake_id);
    assert.equal(result.relationshipEdge?.target.id, badPkg.package_id);

    // Atomicity guarantees: ZERO downstream WP-04+ entities or edges exist
    const allGraphNodes = graph.getNodes();
    for (const node of allGraphNodes) {
      assert.ok(
        node.kind === GOVERNED_ENTITY_KINDS.ValidationIntakeRecord ||
          node.kind === GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
        `Node kind "${node.kind}" must not be a downstream WP-04+ entity`
      );
    }

    // Ledger records both Record 1 and relationship edge
    assert.equal(ledger.getEntryCount(), 2);
    assert.equal(ledger.verifyLedger().isValid, true);
  });

  // =========================================================================
  // Section N: Idempotency & Replay Handling
  // =========================================================================
  it("N. Identical handoff package replay is handled idempotently without inflating records or edges", () => {
    const pkg = createValidHandoffPackage({ package_id: "mhp_replay_test_01" });

    const firstResult = intakeService.processIntake(pkg);
    assert.equal(firstResult.status, "INTAKE_ACCEPTED");
    assert.equal(firstResult.isReplay, undefined);

    const edgeCountAfterFirst = graph.getEdges().length;
    const ledgerCountAfterFirst = ledger.getEntryCount();

    const secondResult = intakeService.processIntake(pkg);
    assert.equal(secondResult.status, "INTAKE_ACCEPTED");
    assert.equal(secondResult.isReplay, true);
    assert.equal(secondResult.intakeRecord.intake_id, firstResult.intakeRecord.intake_id);

    assert.equal(graph.getEdges().length, edgeCountAfterFirst, "Replay must not create duplicate graph edges");
    assert.equal(ledger.getEntryCount(), ledgerCountAfterFirst, "Replay must not inflate audit ledger entries");
  });

  // =========================================================================
  // Section O: Configurable Signer Authorization Policy Boundary
  // =========================================================================
  it("O. Resolves signer authorization through configurable policy boundary without hardcoding canonical role taxonomy", () => {
    // 1. Custom policy interface implementation
    const customPolicy: SignerAuthorizationPolicy = {
      isAuthorized(role, identity) {
        return role === "SPECIAL_MIGRATION_DELEGATE" && identity.startsWith("cert_special_");
      },
    };

    const customVerifier = new DefaultHandoffSignatureVerifier({ policy: customPolicy });
    const localGraph = new ValidationRelationshipGraph();
    const localLedger = new ValidationAuditLedger();
    const customService = new ValidationIntakeService(
      localGraph,
      localLedger,
      integrityProvider,
      customVerifier
    );

    // Package signed with SPECIAL_MIGRATION_DELEGATE and valid cert
    const authorizedPkg = createValidHandoffPackage({
      package_id: "mhp_custom_auth_01",
      signer_role: "SPECIAL_MIGRATION_DELEGATE",
      signer_identity: "cert_special_2026",
    });

    const res1 = customService.processIntake(authorizedPkg);
    assert.equal(res1.status, "INTAKE_ACCEPTED");

    // Package signed with standard role that is NOT in this custom policy
    const unauthorizedPkg = createValidHandoffPackage({
      package_id: "mhp_custom_unauth_01",
      signer_role: "PHASE_1C5G_OFFICIAL", // Not permitted under this custom policy
      signer_identity: "cert_other_2026",
    });

    const res2 = customService.processIntake(unauthorizedPkg);
    assert.equal(res2.status, "INTAKE_REJECTED");
    assert.ok(res2.rejectionReason?.includes("not authorized"));
    // Provenance is preserved even for custom policy rejection
    assert.ok(res2.relationshipEdge);
    assert.equal(res2.relationshipEdge.target.id, unauthorizedPkg.package_id);

    // 2. Functional predicate injection
    const predicateVerifier = new DefaultHandoffSignatureVerifier({
      isAuthorized: (role) => role === "PIPELINE_ROBOT_ROLE",
    });

    const robotPkg = createValidHandoffPackage({
      package_id: "mhp_robot_01",
      signer_role: "PIPELINE_ROBOT_ROLE",
    });

    const res3 = new ValidationIntakeService(
      new ValidationRelationshipGraph(),
      new ValidationAuditLedger(),
      integrityProvider,
      predicateVerifier
    ).processIntake(robotPkg);

    assert.equal(res3.status, "INTAKE_ACCEPTED");
  });

  // =========================================================================
  // Section P: Descriptive Governance Role Text != Canonical Machine Role Enum
  // =========================================================================
  it("P. Confirms absence of upstream canonical machine role enum and verifies non-governing status of local default roles", () => {
    // 1. Confirm that canonical schema enums contain NO role enum or definitions for PHASE_1C5G_OFFICIAL or MIGRATION_OFFICIAL
    assert.equal(
      "SIGNER_ROLES" in CanonicalEnums,
      false,
      "Canonical schema enums must NOT define a SIGNER_ROLES enum (WP-03 does not define governance authority)"
    );
    assert.equal(
      "GOVERNANCE_ROLES" in CanonicalEnums,
      false,
      "Canonical schema enums must NOT define a GOVERNANCE_ROLES enum"
    );
    assert.equal(
      "PHASE_1C5G_OFFICIAL" in CanonicalEnums,
      false,
      "PHASE_1C5G_OFFICIAL must not be exported as a canonical schema enum"
    );
    assert.equal(
      "MIGRATION_OFFICIAL" in CanonicalEnums,
      false,
      "MIGRATION_OFFICIAL must not be exported as a canonical schema enum"
    );

    // 2. Confirm that LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES is an implementation-local non-governing test/dev policy
    assert.ok(Array.isArray(LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES));
    assert.ok(LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES.includes("PHASE_1C5G_OFFICIAL"));
    assert.ok(LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES.includes("MIGRATION_OFFICIAL"));

    // 3. Confirm that production authorization can be supplied entirely through injected policy
    // where any role string is admitted based purely on the injected policy without enum constraints
    const injectedProductionPolicy: SignerAuthorizationPolicy = {
      isAuthorized(role, identity, packageId) {
        // Production policy requires role to be "ENTERPRISE_VALIDATION_AUTHORITY" and specific key ID
        return role === "ENTERPRISE_VALIDATION_AUTHORITY" && identity === "hsm-key-production-001" && packageId.startsWith("mhp_");
      },
    };

    const prodVerifier = new DefaultHandoffSignatureVerifier({ policy: injectedProductionPolicy });
    const prodGraph = new ValidationRelationshipGraph();
    const prodLedger = new ValidationAuditLedger();
    const prodIntakeService = new ValidationIntakeService(
      prodGraph,
      prodLedger,
      integrityProvider,
      prodVerifier
    );

    // Package signed with injected role
    const validProdPkg = createValidHandoffPackage({
      package_id: "mhp_prod_01",
      signer_role: "ENTERPRISE_VALIDATION_AUTHORITY",
      signer_identity: "hsm-key-production-001",
    });

    const prodResult = prodIntakeService.processIntake(validProdPkg);
    assert.equal(prodResult.status, "INTAKE_ACCEPTED");
    assert.ok(prodResult.relationshipEdge);
    assert.equal(prodResult.relationshipEdge.edgeType, GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF);

    // Package signed with non-governing default role string is rejected because injected policy overrides default list
    const nonProdPkg = createValidHandoffPackage({
      package_id: "mhp_prod_unauth_01",
      signer_role: "MIGRATION_OFFICIAL",
      signer_identity: "hsm-key-production-001",
    });

    const unauthResult = prodIntakeService.processIntake(nonProdPkg);
    assert.equal(unauthResult.status, "INTAKE_REJECTED");
    assert.ok(unauthResult.rejectionReason?.includes("not authorized"));
    // Crucial: Provenance edge is preserved for rejected intake
    assert.ok(unauthResult.relationshipEdge);
    assert.equal(unauthResult.relationshipEdge.target.id, nonProdPkg.package_id);
  });
});

