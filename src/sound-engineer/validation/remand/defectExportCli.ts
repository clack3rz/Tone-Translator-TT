// src/sound-engineer/validation/remand/defectExportCli.ts
// Phase 1C.5h WP-25: Defect Remand Packaging CLI & Portable Reproduction Export.
// Bound to frozen specification v0.1j Section 29, Table 17, and Implementation Plan v0.1h WP-25.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { deepFreeze } from "../../contracts/immutability";
import {
  canonicalizeJson,
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { computeSha256BytesHex } from "../fixtures/audioVerification";
import { ReadOnlyFixturePayloadStore } from "../fixtures/types";
import {
  DefectRemandPackage,
  RemandHandoffTracking,
  RemandLifecycleStatus,
} from "./remandTypes";
import { DefectRemandRouter } from "./defectRemandRouter";
import { RemandAgingTracker } from "./remandAgingTracker";

// ---------------------------------------------------------------------------
// Error Hierarchy
// ---------------------------------------------------------------------------

/**
 * Base error for defect export failures.
 */
export class DefectExportError extends Error {
  constructor(message: string) {
    super(`[DEFECT EXPORT ERROR] ${message}`);
    this.name = "DefectExportError";
  }
}

/**
 * Thrown when the integrity seal of the supplied DefectRemandPackage is invalid or tampered.
 */
export class PackageIntegrityVerificationError extends DefectExportError {
  constructor(public readonly packageId: string, message: string) {
    super(`Package '${packageId}': ${message}`);
    this.name = "PackageIntegrityVerificationError";
  }
}

/**
 * Thrown when attempting to write to an output directory that already exists and is non-empty.
 * Prevents silent overwrite of prior export evidence.
 */
export class ExportDestinationExistsError extends DefectExportError {
  constructor(public readonly targetPath: string) {
    super(`Target export path already exists: '${targetPath}'. Silent overwrite is prohibited.`);
    this.name = "ExportDestinationExistsError";
  }
}

/**
 * Thrown when the requested export path is invalid or attempts path traversal.
 */
export class InvalidExportDestinationError extends DefectExportError {
  constructor(public readonly targetPath: string, reason: string) {
    super(`Invalid export path '${targetPath}': ${reason}`);
    this.name = "InvalidExportDestinationError";
  }
}

/**
 * Thrown when a filesystem I/O operation fails during packaging or staged commit.
 */
export class ExportFilesystemError extends DefectExportError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "ExportFilesystemError";
  }
}

/**
 * Thrown when fixture payload integrity verification fails or required fixture metadata is missing.
 */
export class MissingReproductionFixtureError extends DefectExportError {
  constructor(public readonly fixtureId: string, message: string) {
    super(`Fixture '${fixtureId}': ${message}`);
    this.name = "MissingReproductionFixtureError";
  }
}

// ---------------------------------------------------------------------------
// Export Manifest & File Contracts
// ---------------------------------------------------------------------------

/**
 * Asset handling mode for reproducible audio / fixture stems.
 * - MANIFEST_REFERENCED: Large golden benchmark audio stem remains in canonical fixture corpus;
 *   manifest contains verifiable cryptographic payload digest and calibration spec.
 * - EMBEDDED_COPIED: Verified raw audio payload bytes are physically embedded inside export bundle.
 */
export type FixtureAssetHandlingMode = "MANIFEST_REFERENCED" | "EMBEDDED_COPIED";

export interface ExportedEvidenceFileEntry {
  /** Relative path within the export bundle (e.g. "records/failure-record.json") */
  readonly relativePath: string;
  /** Governed entity or evidence classification */
  readonly entityKind: string;
  /** SHA-256 digest of the serialized file contents */
  readonly fileDigest: string;
  /** Length of the file in bytes */
  readonly byteLength: number;
}

export interface ExportFixtureAssetReference {
  readonly fixtureId: string;
  readonly payloadDigest: string;
  readonly calibrationSpec: string;
  readonly assetHandlingMode: FixtureAssetHandlingMode;
  readonly relativeAssetPath?: string;
  readonly verifiedPayloadDigest?: string;
  readonly classification: "PORTABLE_GOVERNED_REPRODUCTION_PACKAGE_ASSET";
}

export interface ExportRemandManifest {
  readonly schemaVersion: "1.0.0";
  readonly exportPackageId: string;
  readonly remandId: string;
  readonly failureId: string;
  readonly executionId: string;
  readonly generatedAt: string;
  readonly canonicalDestination: {
    readonly remandClass: string;
    readonly upstreamRecipient: string;
    readonly governanceEntityId: string;
  };
  readonly trackingStatus: RemandLifecycleStatus;
  readonly packageIntegrityReference: {
    readonly packageDigest: string;
    readonly algorithm: string;
    readonly sealedAt: string;
  };
  readonly fixtureAsset: ExportFixtureAssetReference;
  readonly includedEvidenceFiles: ReadonlyArray<ExportedEvidenceFileEntry>;
  readonly manifestIntegrity: RecordIntegrityMetadata;
}

// ---------------------------------------------------------------------------
// Programmatic API Options & Results
// ---------------------------------------------------------------------------

export interface ExportDefectRemandOptions {
  /** The fully assembled and sealed DefectRemandPackage to export */
  readonly remandPackage: DefectRemandPackage;
  /** Directory path where the export bundle will be written */
  readonly outputDir: string;
  /**
   * If true, creates a subfolder named after the sanitized packageId inside outputDir.
   * If false, writes export files directly into outputDir.
   * Defaults to true.
   */
  readonly createSubfolder?: boolean;
  /**
   * Optional binary fixture payload (Uint8Array) or ReadOnlyFixturePayloadStore to embed into bundle.
   */
  readonly fixturePayload?: Uint8Array | ReadOnlyFixturePayloadStore;
  /** Pluggable integrity provider. Defaults to DefaultSha256IntegrityProvider. */
  readonly integrityProvider?: IntegrityProvider;
  /** Pluggable clock for deterministic timestamps. Defaults to system clock. */
  readonly nowFn?: () => Date;
  /**
   * If true, verifies the cryptographic seal of remandPackage before export.
   * Defaults to true (fail-closed).
   */
  readonly verifyIntegrity?: boolean;
}

export interface ExportDefectRemandResult {
  readonly success: boolean;
  readonly exportDirectory: string;
  readonly manifestPath: string;
  readonly manifest: ExportRemandManifest;
  readonly fixtureAssetMode: FixtureAssetHandlingMode;
  readonly manifestDigest: string;
  readonly exportedFiles: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Package Integrity Verification Helper
// ---------------------------------------------------------------------------

/**
 * Recomputes and verifies the cryptographic digest of an assembled DefectRemandPackage.
 * Follows exact canonical unsigned payload serialization from DefectRemandRouter.
 */
export function verifyDefectRemandPackageIntegrity(
  remandPackage: DefectRemandPackage,
  integrityProvider: IntegrityProvider = new DefaultSha256IntegrityProvider()
): boolean {
  if (!remandPackage || typeof remandPackage !== "object") {
    return false;
  }
  const {
    packageId,
    failureRecord,
    versionBinding,
    validationCase,
    fixtureRecord,
    executionTraceRef,
    fixtureStemRef,
    measurementEvidence,
    routing,
    tracking,
    packageIntegrity,
  } = remandPackage;

  if (!packageIntegrity || !packageIntegrity.integrity_digest) {
    return false;
  }

  // Cross-record lineage consistency checks (tamper detection)
  if (
    !failureRecord ||
    !versionBinding ||
    !validationCase ||
    !fixtureRecord ||
    !fixtureStemRef ||
    !measurementEvidence ||
    !routing ||
    !tracking
  ) {
    return false;
  }

  // Verify internal reference consistency
  if (
    fixtureRecord.fixture_id !== fixtureStemRef.fixtureId ||
    fixtureRecord.payload_integrity_ref !== fixtureStemRef.payloadDigest ||
    !validationCase.associated_fixture_set?.includes(fixtureRecord.fixture_id) ||
    routing.governanceEntityId !== tracking.governanceEntityId
  ) {
    return false;
  }

  const unsignedPayload = {
    packageId,
    failure_id: failureRecord.failure_id,
    execution_id: failureRecord.execution_id,
    binding_id: versionBinding.binding_id,
    case_id: validationCase.case_id,
    fixture_id: fixtureRecord.fixture_id,
    executionTraceRef,
    fixtureStemRef,
    measurementEvidence: {
      rawMeasurements: measurementEvidence.rawMeasurements ?? {},
      objectiveEvidenceId: measurementEvidence.objectiveEvidenceId ?? undefined,
      criteriaRef: measurementEvidence.criteriaRef,
    },
    routing,
    tracking,
  };

  const canonicalJson = canonicalizeJson(unsignedPayload);
  return integrityProvider.verifyDigest(canonicalJson, packageIntegrity.integrity_digest);
}

// ---------------------------------------------------------------------------
// Path Sanitization & Validation Helpers
// ---------------------------------------------------------------------------

function sanitizePathIdentifier(raw: string): string {
  // Disallow null bytes and path traversal patterns
  if (raw.includes("\0") || raw.includes("..")) {
    throw new InvalidExportDestinationError(raw, "Path traversal or null bytes detected in identifier.");
  }
  return raw.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function assertSafeDestination(destPath: string): void {
  const normalized = path.normalize(destPath);
  if (normalized.includes("\0")) {
    throw new InvalidExportDestinationError(destPath, "Path contains null bytes.");
  }
}

// ---------------------------------------------------------------------------
// Core Export Packaging Implementation
// ---------------------------------------------------------------------------

/**
 * Programmatically exports a complete portable reproduction package for a routed validation failure.
 *
 * Guarantees:
 * 1. Strict fail-closed package integrity verification.
 * 2. Deterministic canonical JSON serialization across all evidence files.
 * 3. Staged atomic filesystem write using temp-directory commit to prevent partial-write corruption.
 * 4. Explicit distinction between MANIFEST_REFERENCED and EMBEDDED_COPIED fixture assets.
 * 5. Tamper-evident export manifest sealed with SHA-256 digest.
 * 6. Non-destructive: zero modification of candidate code, prompts, mappings, fixtures, or governance states.
 */
export function exportDefectRemandPackage(options: ExportDefectRemandOptions): ExportDefectRemandResult {
  const {
    remandPackage,
    outputDir,
    createSubfolder = true,
    fixturePayload,
    integrityProvider = new DefaultSha256IntegrityProvider(),
    nowFn = () => new Date(),
    verifyIntegrity = true,
  } = options;

  if (!remandPackage || !remandPackage.packageId) {
    throw new DefectExportError("A valid DefectRemandPackage is required for export.");
  }
  if (!outputDir || outputDir.trim() === "") {
    throw new InvalidExportDestinationError(outputDir, "outputDir cannot be empty.");
  }

  assertSafeDestination(outputDir);

  // 1. Determine Target Directory & Validate Identifiers (Early Path Traversal Guard)
  const sanitizedPackageId = sanitizePathIdentifier(remandPackage.packageId);
  const targetDir = createSubfolder ? path.resolve(outputDir, sanitizedPackageId) : path.resolve(outputDir);
  assertSafeDestination(targetDir);

  // 2. Verify Package Integrity (Fail Closed)
  if (verifyIntegrity) {
    const isIntegrityValid = verifyDefectRemandPackageIntegrity(remandPackage, integrityProvider);
    if (!isIntegrityValid) {
      throw new PackageIntegrityVerificationError(
        remandPackage.packageId,
        "Package integrity seal verification failed. The evidence bundle may be corrupted or tampered."
      );
    }
  }

  // 3. Validate Fixture Stem Completeness
  const { fixtureStemRef, fixtureRecord } = remandPackage;
  if (!fixtureStemRef || !fixtureStemRef.payloadDigest || fixtureStemRef.payloadDigest.trim() === "") {
    throw new MissingReproductionFixtureError(
      fixtureRecord?.fixture_id ?? "UNKNOWN",
      "Missing mandatory payload digest reference on fixtureStemRef."
    );
  }
  if (!fixtureStemRef.calibrationSpec || fixtureStemRef.calibrationSpec.trim() === "") {
    throw new MissingReproductionFixtureError(
      fixtureRecord?.fixture_id ?? "UNKNOWN",
      "Missing mandatory calibration spec on fixtureStemRef."
    );
  }

  // Check destination collision (fail closed against silent overwrite)
  if (fs.existsSync(targetDir)) {
    try {
      const existingEntries = fs.readdirSync(targetDir);
      if (existingEntries.length > 0) {
        throw new ExportDestinationExistsError(targetDir);
      }
    } catch (err) {
      if (err instanceof DefectExportError) throw err;
      throw new ExportFilesystemError(`Failed inspecting destination '${targetDir}': ${String(err)}`, err);
    }
  }

  // 4. Resolve Fixture Payload if Provided
  let resolvedFixtureBytes: Uint8Array | undefined;
  if (fixturePayload) {
    if (fixturePayload instanceof Uint8Array) {
      resolvedFixtureBytes = fixturePayload;
    } else if (typeof fixturePayload === "object" && "readPayload" in fixturePayload) {
      resolvedFixtureBytes = fixturePayload.readPayload(fixtureRecord.fixture_id);
    }

    if (resolvedFixtureBytes) {
      // Cryptographically verify provided bytes against fixtureStemRef.payloadDigest
      const computedHex = computeSha256BytesHex(resolvedFixtureBytes);
      const expectedNorm = fixtureStemRef.payloadDigest.trim().toLowerCase().replace(/^sha256:/, "");
      if (computedHex.toLowerCase() !== expectedNorm) {
        throw new MissingReproductionFixtureError(
          fixtureRecord.fixture_id,
          `Provided fixture payload digest mismatch: computed '${computedHex}' vs expected '${expectedNorm}'.`
        );
      }
    }
  }

  // Ensure parent directory exists for adjacent staging
  const parentDir = path.dirname(targetDir);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // 5. Staged Atomic File Assembly Adjacent to Target Destination
  // Guarantees staging resides on the identical filesystem volume as targetDir,
  // preventing EXDEV cross-device errors and enabling atomic single-rename commit.
  const tempPrefix = path.join(parentDir, `.${sanitizedPackageId}.staging-`);
  let stagedDir: string | undefined;

  try {
    stagedDir = fs.mkdtempSync(tempPrefix);

    const evidenceFiles: ExportedEvidenceFileEntry[] = [];
    const exportedFilePaths: string[] = [];

    const writeEvidenceFile = (
      subPath: string,
      entityKind: string,
      data: unknown
    ): void => {
      const fullPath = path.join(stagedDir!, subPath);
      const dirName = path.dirname(fullPath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Format as readable JSON for human & tooling inspection
      const formattedJson = JSON.stringify(data, null, 2);
      fs.writeFileSync(fullPath, formattedJson, "utf8");

      // Compute deterministic digest over canonical JSON representation of persisted content
      const persistedContent = JSON.parse(formattedJson);
      const canonicalString = canonicalizeJson(persistedContent);
      const fileDigest = integrityProvider.computeDigest(canonicalString);
      const stats = fs.statSync(fullPath);

      evidenceFiles.push({
        relativePath: subPath,
        entityKind,
        fileDigest,
        byteLength: stats.size,
      });
      exportedFilePaths.push(subPath);
    };

    // A. Structured Governed Evidence Files
    writeEvidenceFile(
      "records/failure-record.json",
      "ValidationFailureRecord",
      remandPackage.failureRecord
    );

    writeEvidenceFile(
      "records/version-binding.json",
      "ValidationVersionBindingRecord",
      remandPackage.versionBinding
    );

    writeEvidenceFile(
      "records/validation-case.json",
      "ValidationCase",
      remandPackage.validationCase
    );

    writeEvidenceFile(
      "records/fixture-record.json",
      "ValidationFixtureRecord",
      remandPackage.fixtureRecord
    );

    writeEvidenceFile(
      "evidence/execution-trace.json",
      "ExecutionTraceReference",
      {
        execution_id: remandPackage.failureRecord.execution_id,
        trace_ref: remandPackage.executionTraceRef,
        binding_id: remandPackage.versionBinding.binding_id,
        case_id: remandPackage.validationCase.case_id,
      }
    );

    writeEvidenceFile(
      "evidence/measurements.json",
      "MeasurementEvidence",
      remandPackage.measurementEvidence
    );

    writeEvidenceFile(
      "governance/routing-and-tracking.json",
      "RemandRoutingAndTracking",
      {
        routing: remandPackage.routing,
        tracking: remandPackage.tracking,
      }
    );

    writeEvidenceFile(
      "remand-package.json",
      "DefectRemandPackage",
      remandPackage
    );

    // B. Fixture Asset Handling
    let fixtureAssetDescriptor: ExportFixtureAssetReference;

    if (resolvedFixtureBytes) {
      const sanitizedFixtureId = sanitizePathIdentifier(fixtureRecord.fixture_id);
      const assetSubPath = `assets/${sanitizedFixtureId}.wav`;
      const assetFullPath = path.join(stagedDir, assetSubPath);
      const assetDir = path.dirname(assetFullPath);
      if (!fs.existsSync(assetDir)) {
        fs.mkdirSync(assetDir, { recursive: true });
      }
      fs.writeFileSync(assetFullPath, resolvedFixtureBytes);

      const verifiedDigest = `sha256:${computeSha256BytesHex(resolvedFixtureBytes)}`;
      const stats = fs.statSync(assetFullPath);

      evidenceFiles.push({
        relativePath: assetSubPath,
        entityKind: "AudioBenchmarkStem",
        fileDigest: verifiedDigest,
        byteLength: stats.size,
      });
      exportedFilePaths.push(assetSubPath);

      fixtureAssetDescriptor = {
        fixtureId: fixtureRecord.fixture_id,
        payloadDigest: fixtureStemRef.payloadDigest,
        calibrationSpec: fixtureStemRef.calibrationSpec,
        assetHandlingMode: "EMBEDDED_COPIED",
        relativeAssetPath: assetSubPath,
        verifiedPayloadDigest: verifiedDigest,
        classification: "PORTABLE_GOVERNED_REPRODUCTION_PACKAGE_ASSET",
      };
    } else {
      fixtureAssetDescriptor = {
        fixtureId: fixtureRecord.fixture_id,
        payloadDigest: fixtureStemRef.payloadDigest,
        calibrationSpec: fixtureStemRef.calibrationSpec,
        assetHandlingMode: "MANIFEST_REFERENCED",
        classification: "PORTABLE_GOVERNED_REPRODUCTION_PACKAGE_ASSET",
      };
    }

    // C. Build and Seal Export Manifest
    const nowIso = nowFn().toISOString();
    const manifestUnsigned = {
      schemaVersion: "1.0.0" as const,
      exportPackageId: `EXP_${sanitizedPackageId}`,
      remandId: remandPackage.tracking.remandId,
      failureId: remandPackage.failureRecord.failure_id,
      executionId: remandPackage.failureRecord.execution_id,
      generatedAt: nowIso,
      canonicalDestination: {
        remandClass: remandPackage.routing.remandClass,
        upstreamRecipient: remandPackage.routing.upstreamRecipient,
        governanceEntityId: remandPackage.routing.governanceEntityId,
      },
      trackingStatus: remandPackage.tracking.status,
      packageIntegrityReference: {
        packageDigest: remandPackage.packageIntegrity.integrity_digest,
        algorithm: remandPackage.packageIntegrity.algorithm,
        sealedAt: remandPackage.packageIntegrity.sealed_at,
      },
      fixtureAsset: fixtureAssetDescriptor,
      includedEvidenceFiles: evidenceFiles,
    };

    const manifestCanonicalJson = canonicalizeJson(manifestUnsigned);
    const manifestDigest = integrityProvider.computeDigest(manifestCanonicalJson);

    const manifestIntegrity: RecordIntegrityMetadata = {
      integrity_digest: manifestDigest,
      algorithm: integrityProvider.algorithmName,
      sealed_at: nowIso,
      canonical_serialization_format: "RFC-8785-CANONICAL-JSON",
      signer_identity: "DefectExportCli",
    };

    const sealedManifest: ExportRemandManifest = deepFreeze({
      ...manifestUnsigned,
      manifestIntegrity,
    });

    const manifestFullPath = path.join(stagedDir, "manifest.json");
    fs.writeFileSync(
      manifestFullPath,
      JSON.stringify(sealedManifest, null, 2),
      "utf8"
    );
    exportedFilePaths.unshift("manifest.json");

    // D. Atomic Commit Staged Directory to Final Destination
    // Guard against race condition: if destination was created during export staging and is non-empty, fail closed
    if (fs.existsSync(targetDir)) {
      const existingEntries = fs.readdirSync(targetDir);
      if (existingEntries.length > 0) {
        throw new ExportDestinationExistsError(targetDir);
      }
      fs.rmdirSync(targetDir);
    }

    try {
      fs.renameSync(stagedDir, targetDir);
    } catch {
      // Cross-device fallback for exotic cross-mount environments
      fs.cpSync(stagedDir, targetDir, { recursive: true });
      fs.rmSync(stagedDir, { recursive: true, force: true });
    }
    stagedDir = undefined; // Mark as successfully committed

    return deepFreeze({
      success: true,
      exportDirectory: targetDir,
      manifestPath: path.join(targetDir, "manifest.json"),
      manifest: sealedManifest,
      fixtureAssetMode: fixtureAssetDescriptor.assetHandlingMode,
      manifestDigest,
      exportedFiles: exportedFilePaths,
    });
  } catch (err) {
    if (stagedDir && fs.existsSync(stagedDir)) {
      try {
        fs.rmSync(stagedDir, { recursive: true, force: true });
      } catch {
        // Suppress cleanup error to surface primary exception
      }
    }
    if (err instanceof DefectExportError) {
      throw err;
    }
    throw new ExportFilesystemError(`Export operation failed: ${String(err)}`, err);
  }
}

// ---------------------------------------------------------------------------
// Manifest Integrity Verification Helper
// ---------------------------------------------------------------------------

export interface ManifestVerificationResult {
  readonly isValid: boolean;
  readonly failureReason?: string;
  readonly checkedFilesCount: number;
}

/**
 * Cryptographically verifies an ExportRemandManifest seal and (optionally) the on-disk
 * evidence files listed within it.
 *
 * Checks:
 * 1. Manifest unkeyed SHA-256 seal matches canonical unsigned manifest payload.
 * 2. If exportDirectory is provided, verifies each listed evidence file exists on disk
 *    and its computed SHA-256 digest matches fileDigest in the manifest.
 */
export function verifyExportManifestIntegrity(
  manifest: ExportRemandManifest,
  exportDirectory?: string,
  integrityProvider: IntegrityProvider = new DefaultSha256IntegrityProvider()
): ManifestVerificationResult {
  if (!manifest || !manifest.manifestIntegrity || !manifest.manifestIntegrity.integrity_digest) {
    return { isValid: false, failureReason: "Missing manifestIntegrity metadata", checkedFilesCount: 0 };
  }

  // Extract unsigned manifest payload exactly as created during sealing
  const { manifestIntegrity, ...unsigned } = manifest;
  const canonicalJson = canonicalizeJson(unsigned);
  const isManifestDigestValid = integrityProvider.verifyDigest(canonicalJson, manifestIntegrity.integrity_digest);

  if (!isManifestDigestValid) {
    return {
      isValid: false,
      failureReason: "Manifest integrity seal verification failed (computed digest does not match manifestIntegrity.integrity_digest).",
      checkedFilesCount: 0,
    };
  }

  if (exportDirectory) {
    for (const fileEntry of manifest.includedEvidenceFiles) {
      const fullPath = path.join(exportDirectory, fileEntry.relativePath);
      if (!fs.existsSync(fullPath)) {
        return {
          isValid: false,
          failureReason: `Evidence file listed in manifest not found on disk: '${fileEntry.relativePath}'.`,
          checkedFilesCount: 0,
        };
      }

      if (fileEntry.entityKind === "AudioBenchmarkStem") {
        const bytes = fs.readFileSync(fullPath);
        const digest = `sha256:${computeSha256BytesHex(new Uint8Array(bytes))}`;
        const normComputed = digest.toLowerCase();
        const normExpected = fileEntry.fileDigest.toLowerCase();
        if (normComputed !== normExpected) {
          return {
            isValid: false,
            failureReason: `Audio asset file digest mismatch on '${fileEntry.relativePath}': computed '${digest}' vs expected '${fileEntry.fileDigest}'.`,
            checkedFilesCount: 0,
          };
        }
      } else {
        const content = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content);
        const digest = integrityProvider.computeDigest(canonicalizeJson(parsed));
        if (digest !== fileEntry.fileDigest) {
          return {
            isValid: false,
            failureReason: `Evidence file content digest mismatch on '${fileEntry.relativePath}': computed '${digest}' vs expected '${fileEntry.fileDigest}'.`,
            checkedFilesCount: 0,
          };
        }
      }
    }
  }

  return { isValid: true, checkedFilesCount: manifest.includedEvidenceFiles.length };
}

// ---------------------------------------------------------------------------
// Command-Line Interface (CLI) Runner
// ---------------------------------------------------------------------------

export interface CliExecutionResult {
  readonly exitCode: number;
  readonly message: string;
  readonly result?: ExportDefectRemandResult;
  readonly error?: Error;
}

export interface CliContext {
  readonly router?: DefectRemandRouter;
  readonly tracker?: RemandAgingTracker;
  readonly integrityProvider?: IntegrityProvider;
  readonly payloadStore?: ReadOnlyFixturePayloadStore;
  readonly nowFn?: () => Date;
}

/**
 * Parses CLI arguments and executes defect remand export.
 * Follows Node.js CLI conventions with structured, automation-friendly output.
 */
export async function runDefectExportCli(
  args: string[],
  context: CliContext = {}
): Promise<CliExecutionResult> {
  const usage = `
Usage: defect-export [options]

Options:
  --package-file <path>   Path to JSON file containing a serialized DefectRemandPackage
  --remand-id <id>        Remand ID to lookup from provided RemandAgingTracker
  -o, --out <dir>         Target output directory for reproduction export (required)
  --no-subfolder          Write evidence directly to output directory without packageId subfolder
  --embed-fixture         Attempt to embed binary fixture payload if payloadStore is available
  --no-verify             Bypass fail-closed package integrity verification (not recommended)
  -h, --help              Display this help message
`.trim();

  let packageFilePath: string | undefined;
  let remandId: string | undefined;
  let outDir: string | undefined;
  let createSubfolder = true;
  let embedFixture = false;
  let verifyIntegrity = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      return { exitCode: 0, message: usage };
    } else if (arg === "--package-file" && i + 1 < args.length) {
      packageFilePath = args[++i];
    } else if (arg === "--remand-id" && i + 1 < args.length) {
      remandId = args[++i];
    } else if ((arg === "-o" || arg === "--out") && i + 1 < args.length) {
      outDir = args[++i];
    } else if (arg === "--no-subfolder") {
      createSubfolder = false;
    } else if (arg === "--embed-fixture") {
      embedFixture = true;
    } else if (arg === "--no-verify") {
      verifyIntegrity = false;
    }
  }

  if (!outDir) {
    return {
      exitCode: 1,
      message: "Error: --out <dir> is required.\n\n" + usage,
    };
  }

  try {
    let pkg: DefectRemandPackage | undefined;

    if (packageFilePath) {
      if (!fs.existsSync(packageFilePath)) {
        return {
          exitCode: 1,
          message: `Error: Package file not found: '${packageFilePath}'`,
        };
      }
      const raw = fs.readFileSync(packageFilePath, "utf8");
      pkg = JSON.parse(raw) as DefectRemandPackage;
    } else if (remandId) {
      const tracker = context.tracker ?? context.router?.getAgingTracker();
      if (!tracker) {
        return {
          exitCode: 1,
          message: "Error: --remand-id specified but no RemandAgingTracker available in context.",
        };
      }
      pkg = tracker.getPackage(remandId);
      if (!pkg) {
        return {
          exitCode: 1,
          message: `Error: Remand ID '${remandId}' not found in RemandAgingTracker.`,
        };
      }
    } else {
      return {
        exitCode: 1,
        message: "Error: Either --package-file <path> or --remand-id <id> must be specified.\n\n" + usage,
      };
    }

    const result = exportDefectRemandPackage({
      remandPackage: pkg,
      outputDir: outDir,
      createSubfolder,
      fixturePayload: embedFixture ? context.payloadStore : undefined,
      integrityProvider: context.integrityProvider,
      nowFn: context.nowFn,
      verifyIntegrity,
    });

    const summary = [
      `[SUCCESS] Governed Defect Remand Package exported:`,
      `  Package ID:       ${result.manifest.exportPackageId}`,
      `  Remand ID:        ${result.manifest.remandId}`,
      `  Failure ID:       ${result.manifest.failureId}`,
      `  Destination:      ${result.manifest.canonicalDestination.upstreamRecipient} (${result.manifest.canonicalDestination.governanceEntityId})`,
      `  Export Directory: ${result.exportDirectory}`,
      `  Manifest Path:    ${result.manifestPath}`,
      `  Manifest Digest:  ${result.manifestDigest}`,
      `  Fixture Mode:     ${result.fixtureAssetMode}`,
      `  Total Files:      ${result.exportedFiles.length}`,
    ].join("\n");

    return {
      exitCode: 0,
      message: summary,
      result,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      exitCode: 2,
      message: `[ERROR] ${error.message}`,
      error,
    };
  }
}
