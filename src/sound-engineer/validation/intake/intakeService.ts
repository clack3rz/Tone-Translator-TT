// src/sound-engineer/validation/intake/intakeService.ts
// ValidationIntakeService: Authoritative intake verification, sealed handoff validation,
// and atomic graph/ledger integration for Phase 1C.5h WP-03.
// Bound to frozen specification v0.1j Section 8 and Implementation Plan v0.1h WP-03.

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import { canonicalizeJson, IntegrityProvider } from "../schemas/integrity";
import { INTAKE_STATUSES } from "../schemas/enums";
import {
  ValidationIntakeRecord,
  validationIntakeRecordSchema,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  GateCompletionToken,
  IntakeProcessingResult,
  MigrationHandoffPackage,
  PHASE_1C5G_GATE_NAMES,
} from "./types";
import {
  DefaultHandoffSignatureVerifier,
  HandoffSignatureVerifier,
} from "./signatureVerifier";

/**
 * Normalizes a gate key to see if it matches a required Phase 1C.5g gate name.
 * Accepts exact name or standard prefixed name (e.g. "Gate 1: Structural Mapping Complete").
 */
function matchesGateName(candidateName: string, requiredName: string): boolean {
  if (candidateName === requiredName) {
    return true;
  }
  const stripped = candidateName.replace(/^Gate\s*\d+\s*:\s*/i, "").trim();
  return stripped === requiredName;
}

/**
 * Validates that all seven exact Phase 1C.5g gate completion tokens are present and certified.
 */
function verifySevenGates(
  gates: ReadonlyArray<GateCompletionToken> | Readonly<Record<string, unknown>>
): { isValid: boolean; missingGate?: string } {
  if (!gates) {
    return { isValid: false, missingGate: PHASE_1C5G_GATE_NAMES[0] };
  }

  if (Array.isArray(gates)) {
    for (const requiredGate of PHASE_1C5G_GATE_NAMES) {
      const match = gates.find(
        (g) =>
          g &&
          typeof g.gate_name === "string" &&
          matchesGateName(g.gate_name, requiredGate) &&
          (g.status === "COMPLETE" || g.status === "PASS")
      );
      if (!match) {
        return { isValid: false, missingGate: requiredGate };
      }
    }
    return { isValid: true };
  }

  if (typeof gates === "object") {
    const keys = Object.keys(gates);
    for (const requiredGate of PHASE_1C5G_GATE_NAMES) {
      const matchingKey = keys.find((k) => matchesGateName(k, requiredGate));
      if (!matchingKey) {
        return { isValid: false, missingGate: requiredGate };
      }
      const val = (gates as Record<string, unknown>)[matchingKey];
      if (typeof val === "string") {
        if (val !== "COMPLETE" && val !== "PASS") {
          return { isValid: false, missingGate: requiredGate };
        }
      } else if (val && typeof val === "object") {
        const status = (val as { status?: unknown }).status;
        if (status !== "COMPLETE" && status !== "PASS") {
          return { isValid: false, missingGate: requiredGate };
        }
      } else {
        return { isValid: false, missingGate: requiredGate };
      }
    }
    return { isValid: true };
  }

  return { isValid: false, missingGate: PHASE_1C5G_GATE_NAMES[0] };
}

/**
 * ValidationIntakeService: Coordinates sealed handoff verification, canonical Record 1 creation,
 * atomic graph edge linking (DERIVED_FROM_HANDOFF), and audit ledger sealing.
 */
export class ValidationIntakeService {
  private readonly graph: ValidationRelationshipGraph;
  private readonly ledger: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly signatureVerifier: HandoffSignatureVerifier;

  /** Cache of accepted intake results indexed by package_id for idempotent replay */
  private readonly acceptedPackages: Map<string, IntakeProcessingResult> = new Map();

  /** In-memory store of all generated intake records indexed by intake_id */
  private readonly intakeRecords: Map<string, ValidationIntakeRecord> = new Map();

  constructor(
    graph: ValidationRelationshipGraph,
    ledger: ValidationAuditLedger,
    integrityProvider?: IntegrityProvider,
    signatureVerifier?: HandoffSignatureVerifier
  ) {
    this.graph = graph;
    this.ledger = ledger;
    this.integrityProvider =
      integrityProvider ?? ledger.getIntegrityProvider() ?? new DefaultSha256IntegrityProvider();
    this.signatureVerifier = signatureVerifier ?? new DefaultHandoffSignatureVerifier();
  }

  public getIntakeRecord(intakeId: string): ValidationIntakeRecord | undefined {
    return this.intakeRecords.get(intakeId);
  }

  public getIntakeByPackageId(packageId: string): ValidationIntakeRecord | undefined {
    for (const record of this.intakeRecords.values()) {
      if (record.handoff_package_id === packageId) {
        return record;
      }
    }
    return undefined;
  }

  public getAllIntakes(): ReadonlyArray<ValidationIntakeRecord> {
    return deepFreeze(Array.from(this.intakeRecords.values()));
  }

  /**
   * Processes an incoming sealed MigrationHandoffPackageRecord from Phase 1C.5g.
   * Atomicity rule: Rejection terminates downstream progression; it does not erase identifiable provenance.
   * - Identifiable rejected handoffs register the handoff node and link DERIVED_FROM_HANDOFF without advancing.
   * - Unidentifiable malformed envelopes are audited in ledger without fabricating graph entities.
   * - Acceptance seals Record 1, links DERIVED_FROM_HANDOFF, and enables downstream workflows.
   */
  public processIntake(pkg: MigrationHandoffPackage): IntakeProcessingResult {
    const timestamp = new Date().toISOString();

    // 1. Idempotency Check: Return existing result for identical accepted package
    if (pkg && pkg.package_id && this.acceptedPackages.has(pkg.package_id)) {
      const priorResult = this.acceptedPackages.get(pkg.package_id)!;
      if (priorResult.intakeRecord.handoff_package_integrity_ref === pkg.integrity_ref) {
        return {
          ...priorResult,
          isReplay: true,
        };
      }
    }

    // 2. Structural Envelope Inspection
    let rejectionReason: string | undefined;

    const isIdentifiablePackage = Boolean(
      pkg &&
      typeof pkg.package_id === "string" &&
      pkg.package_id.trim() !== ""
    );

    if (!pkg) {
      rejectionReason = "Malformed handoff package: payload is null or undefined.";
    } else if (!isIdentifiablePackage) {
      rejectionReason = "Malformed handoff package: missing or invalid package_id.";
    } else if (!pkg.migration_batch_id || typeof pkg.migration_batch_id !== "string") {
      rejectionReason = `Package "${pkg.package_id}": missing migration_batch_id.`;
    } else if (!pkg.requested_by || typeof pkg.requested_by !== "string") {
      rejectionReason = `Package "${pkg.package_id}": missing requested_by identifier.`;
    } else if (!pkg.declared_scope || typeof pkg.declared_scope !== "string" || pkg.declared_scope.trim() === "") {
      rejectionReason = `Package "${pkg.package_id}": missing declared migration scope reference.`;
    } else if (
      !pkg.frozen_upstream_versions ||
      typeof pkg.frozen_upstream_versions !== "object" ||
      Object.keys(pkg.frozen_upstream_versions).length === 0
    ) {
      rejectionReason = `Package "${pkg.package_id}": missing required frozen upstream version metadata.`;
    } else if (!pkg.target_platform_declared_version || typeof pkg.target_platform_declared_version !== "string") {
      rejectionReason = `Package "${pkg.package_id}": missing target_platform_declared_version.`;
    } else if (!pkg.integrity_ref || typeof pkg.integrity_ref !== "string") {
      rejectionReason = `Package "${pkg.package_id}": missing declared integrity reference.`;
    }

    // 3. Cryptographic Envelope Integrity Verification
    if (!rejectionReason && pkg) {
      const dataToHash =
        pkg.payload_data !== undefined
          ? pkg.payload_data
          : {
              package_id: pkg.package_id,
              migration_batch_id: pkg.migration_batch_id,
              requested_by: pkg.requested_by,
              declared_scope: pkg.declared_scope,
              frozen_upstream_versions: pkg.frozen_upstream_versions,
              target_platform_declared_version: pkg.target_platform_declared_version,
              gates: pkg.gates,
            };

      const computedDigest = this.integrityProvider.computeDigest(canonicalizeJson(dataToHash));
      if (computedDigest !== pkg.integrity_ref) {
        rejectionReason = `Package "${pkg.package_id}": integrity mismatch. Expected digest "${pkg.integrity_ref}", computed "${computedDigest}".`;
      }
    }

    // 4. Digital Signature & Signer Role Verification (via injected policy)
    if (!rejectionReason && pkg) {
      const sigResult = this.signatureVerifier.verifySignature({
        packageId: pkg.package_id,
        payloadToVerify: pkg.payload_data ?? pkg.integrity_ref,
        signature: pkg.signature,
        signerIdentity: pkg.signer_identity,
        signerRole: pkg.signer_role,
      });

      if (!sigResult.isValid) {
        rejectionReason = sigResult.failureReason ?? "Signature verification failed.";
      }
    }

    // 5. Phase 1C.5g Seven Gates Audit
    if (!rejectionReason && pkg) {
      const gatesResult = verifySevenGates(pkg.gates);
      if (!gatesResult.isValid) {
        rejectionReason = `Package "${pkg.package_id}": missing required Phase 1C.5g gate completion: "${gatesResult.missingGate}". All seven prerequisite gates must be complete.`;
      }
    }

    // 6. Branch A: REJECTION PATH
    if (rejectionReason) {
      if (isIdentifiablePackage && pkg) {
        // Identifiable rejected handoff: preserve provenance via DERIVED_FROM_HANDOFF edge
        const packageId = pkg.package_id;
        const intakeId = `intake_rej_${packageId}_${Date.now()}`;

        const recordCore = {
          intake_id: intakeId,
          timestamp,
          handoff_package_id: packageId,
          handoff_package_integrity_ref: pkg.integrity_ref || "UNVERIFIED_INTEGRITY",
          migration_batch_id: pkg.migration_batch_id || "UNKNOWN_BATCH",
          requested_by: pkg.requested_by || "UNKNOWN_REQUESTER",
          declared_scope: pkg.declared_scope || "UNDECLARED_SCOPE",
          frozen_upstream_versions: pkg.frozen_upstream_versions || {},
          target_platform_declared_version: pkg.target_platform_declared_version || "UNKNOWN_TARGET_VERSION",
          intake_status: INTAKE_STATUSES.INTAKE_REJECTED,
          rejection_reason: rejectionReason,
        };

        const sealDigest = this.integrityProvider.computeDigest(canonicalizeJson(recordCore));

        const rejectedRecord: ValidationIntakeRecord = deepFreeze(
          validationIntakeRecordSchema.parse({
            ...recordCore,
            record_integrity_metadata: {
              integrity_digest: sealDigest,
              algorithm: this.integrityProvider.algorithmName,
              sealed_at: timestamp,
              signer_identity: "validation_intake_service",
              canonical_serialization_format: "CANONICAL-JSON",
            },
          })
        );

        this.intakeRecords.set(intakeId, rejectedRecord);

        // 1. Commit rejected Record 1 to the audit ledger
        const recordLedgerEntry = this.ledger.appendRecord(
          GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
          intakeId,
          rejectedRecord,
          timestamp
        );

        // 2. Register both nodes in the relationship graph:
        // - rejected ValidationIntakeRecord node
        // - identifiable MigrationHandoffPackageRecord node (referenced for provenance, not authenticated)
        this.graph.registerNode({
          id: intakeId,
          kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
        });
        this.graph.registerNode({
          id: packageId,
          kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
        });

        // 3. Create canonical DERIVED_FROM_HANDOFF relationship edge:
        // ValidationIntakeRecord -> MigrationHandoffPackageRecord
        const relationshipEdge: RelationshipEdge = this.graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
          source: {
            id: intakeId,
            kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
          },
          target: {
            id: packageId,
            kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
          },
        });

        // 4. Commit relationship edge to the audit ledger
        const edgeLedgerEntry = this.ledger.appendEdge(relationshipEdge, timestamp);

        // 5. Terminate processing immediately. Zero downstream WP-04+ state created.
        return deepFreeze({
          status: "INTAKE_REJECTED",
          intakeRecord: rejectedRecord,
          handoffPackageId: packageId,
          rejectionReason,
          relationshipEdge,
          ledgerEntry: recordLedgerEntry,
          edgeLedgerEntry,
        });
      } else {
        // Unidentifiable malformed envelope exception (null/undefined input, missing/empty package_id):
        // Record rejected attempt in audit ledger without fabricating graph entities.
        const fallbackPackageId = "unidentified_package";
        const intakeId = `intake_rej_unidentified_${Date.now()}`;

        const recordCore = {
          intake_id: intakeId,
          timestamp,
          handoff_package_id: fallbackPackageId,
          handoff_package_integrity_ref: "UNVERIFIED_INTEGRITY",
          migration_batch_id: "UNIDENTIFIED_BATCH",
          requested_by: "UNIDENTIFIED_REQUESTER",
          declared_scope: "UNDECLARED_SCOPE",
          frozen_upstream_versions: {},
          target_platform_declared_version: "UNKNOWN_TARGET_VERSION",
          intake_status: INTAKE_STATUSES.INTAKE_REJECTED,
          rejection_reason: rejectionReason,
        };

        const sealDigest = this.integrityProvider.computeDigest(canonicalizeJson(recordCore));

        const rejectedRecord: ValidationIntakeRecord = deepFreeze(
          validationIntakeRecordSchema.parse({
            ...recordCore,
            record_integrity_metadata: {
              integrity_digest: sealDigest,
              algorithm: this.integrityProvider.algorithmName,
              sealed_at: timestamp,
              signer_identity: "validation_intake_service",
              canonical_serialization_format: "CANONICAL-JSON",
            },
          })
        );

        this.intakeRecords.set(intakeId, rejectedRecord);

        const recordLedgerEntry = this.ledger.appendRecord(
          GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
          intakeId,
          rejectedRecord,
          timestamp
        );

        // Do NOT register graph nodes; do NOT fabricate DERIVED_FROM_HANDOFF edge
        return deepFreeze({
          status: "INTAKE_REJECTED",
          intakeRecord: rejectedRecord,
          handoffPackageId: "",
          rejectionReason,
          relationshipEdge: undefined,
          ledgerEntry: recordLedgerEntry,
        });
      }
    }

    // 7. Branch B: ACCEPTANCE PATH
    const packageId = pkg.package_id;
    const intakeId = `intake_${packageId}`;

    const recordCore = {
      intake_id: intakeId,
      timestamp,
      handoff_package_id: packageId,
      handoff_package_integrity_ref: pkg.integrity_ref,
      migration_batch_id: pkg.migration_batch_id,
      requested_by: pkg.requested_by,
      declared_scope: pkg.declared_scope,
      frozen_upstream_versions: defensiveClone(pkg.frozen_upstream_versions),
      target_platform_declared_version: pkg.target_platform_declared_version,
      intake_status: INTAKE_STATUSES.INTAKE_ACCEPTED,
    };

    const sealDigest = this.integrityProvider.computeDigest(canonicalizeJson(recordCore));

    const acceptedRecord: ValidationIntakeRecord = deepFreeze(
      validationIntakeRecordSchema.parse({
        ...recordCore,
        record_integrity_metadata: {
          integrity_digest: sealDigest,
          algorithm: this.integrityProvider.algorithmName,
          sealed_at: timestamp,
          signer_identity: "validation_intake_service",
          canonical_serialization_format: "CANONICAL-JSON",
        },
      })
    );

    // Atomic Graph & Ledger Integration
    // Register both endpoints to satisfy WP-02 orphan protection
    this.graph.registerNode({
      id: intakeId,
      kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
    });
    this.graph.registerNode({
      id: packageId,
      kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
    });

    // Create the canonical DERIVED_FROM_HANDOFF relationship edge
    const relationshipEdge: RelationshipEdge = this.graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
      source: {
        id: intakeId,
        kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
      },
      target: {
        id: packageId,
        kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
      },
    });

    // Commit Record 1 and the relationship edge to the audit ledger
    const recordLedgerEntry = this.ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
      intakeId,
      acceptedRecord,
      timestamp
    );

    const edgeLedgerEntry = this.ledger.appendEdge(relationshipEdge, timestamp);

    this.intakeRecords.set(intakeId, acceptedRecord);

    const result: IntakeProcessingResult = deepFreeze({
      status: "INTAKE_ACCEPTED",
      intakeRecord: acceptedRecord,
      handoffPackageId: packageId,
      relationshipEdge,
      ledgerEntry: recordLedgerEntry,
      edgeLedgerEntry,
    });

    this.acceptedPackages.set(packageId, result);

    return result;
  }
}
