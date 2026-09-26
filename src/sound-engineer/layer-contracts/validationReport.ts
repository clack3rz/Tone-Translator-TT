// src/sound-engineer/layer-contracts/validationReport.ts
// Layer 4 Contract: ValidationReport (Whether the contract is coherent, complete, and executable)

import { ExecutionStream, isExecutionStream, RunId } from "../execution";
import { defensiveClone, deepFreeze } from "../contracts/immutability";
import { ArtifactReference, isArtifactReference, createArtifactReference, ARTIFACT_TYPES } from "../checkpoints/artifactReference";
import { SOUND_ENGINEER_LAYERS } from "../checkpoints/layerIdentity";

export const VALIDATION_REPORT_CONTRACT_VERSION = "1.0.0" as const;

export type ValidationReportId = string;

export function generateValidationReportId(): ValidationReportId {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  return `val_${uuid}`;
}

export type ValidationStatus = "PASS" | "WARN" | "FAIL";

export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface FindingLocation {
  readonly stageId?: string;
  readonly propertyPath?: string;
  readonly fieldName?: string;
}

export interface ValidationFinding {
  readonly findingId: string;
  readonly severity: ValidationSeverity;
  readonly ruleCode: string;
  readonly message: string;
  readonly location?: FindingLocation;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ValidationSummaryCounts {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

/**
 * ValidationReport: Deterministic assessment of contract quality, coherence,
 * and executability. Strictly reports problems without repairing, mutating,
 * or redesigning the upstream contract.
 */
export interface ValidationReport {
  readonly contractVersion: typeof VALIDATION_REPORT_CONTRACT_VERSION | string;
  readonly reportId: ValidationReportId;
  readonly runId: RunId;
  readonly stream: ExecutionStream;
  readonly createdAt: string;

  /** Reference to the artifact subjected to validation (e.g. SemanticToneDesign) */
  readonly targetArtifact: ArtifactReference;

  /** Overall status resulting from validation rules */
  readonly overallStatus: ValidationStatus;

  /** Whether the target design is executable (true for PASS and WARN, false for FAIL) */
  readonly isExecutable: boolean;

  /** Summary totals by finding severity */
  readonly summaryCounts: ValidationSummaryCounts;

  /** Granular diagnostic findings */
  readonly findings: ReadonlyArray<ValidationFinding>;
}

export interface CreateValidationReportOptions {
  reportId?: ValidationReportId;
  runId: RunId;
  stream: ExecutionStream;
  createdAt?: string;
  targetArtifact: ArtifactReference;
  findings?: ReadonlyArray<ValidationFinding>;
  overallStatus?: ValidationStatus;
}

export function createValidationReport(options: CreateValidationReportOptions): ValidationReport {
  if (!options.runId || typeof options.runId !== "string" || options.runId.trim().length === 0) {
    throw new Error("ValidationReport runId must be a non-empty string");
  }
  if (!isExecutionStream(options.stream)) {
    throw new Error(`Invalid execution stream: "${String(options.stream)}"`);
  }
  if (!isArtifactReference(options.targetArtifact)) {
    throw new Error("ValidationReport targetArtifact must be a valid ArtifactReference");
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  if (isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt ISO timestamp: "${createdAt}"`);
  }

  const findings: ValidationFinding[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  if (options.findings) {
    for (const f of options.findings) {
      if (!f.findingId || !f.severity || !f.ruleCode || !f.message) {
        throw new Error("Invalid ValidationFinding: missing required fields");
      }
      if (f.severity === "ERROR") errorCount++;
      else if (f.severity === "WARNING") warningCount++;
      else if (f.severity === "INFO") infoCount++;

      findings.push({
        findingId: f.findingId.trim(),
        severity: f.severity,
        ruleCode: f.ruleCode.trim(),
        message: f.message.trim(),
        ...(f.location ? { location: defensiveClone(f.location) } : {}),
        ...(f.context ? { context: defensiveClone(f.context) } : {}),
      });
    }
  }

  let overallStatus = options.overallStatus;
  if (!overallStatus) {
    if (errorCount > 0) overallStatus = "FAIL";
    else if (warningCount > 0) overallStatus = "WARN";
    else overallStatus = "PASS";
  }

  const isExecutable = overallStatus !== "FAIL";

  const report: ValidationReport = {
    contractVersion: VALIDATION_REPORT_CONTRACT_VERSION,
    reportId: options.reportId ?? generateValidationReportId(),
    runId: options.runId.trim(),
    stream: options.stream,
    createdAt,
    targetArtifact: defensiveClone(options.targetArtifact),
    overallStatus,
    isExecutable,
    summaryCounts: Object.freeze({
      errorCount,
      warningCount,
      infoCount,
    }),
    findings: Object.freeze(findings.map((f) => defensiveClone(f))),
  };

  return deepFreeze(report);
}

export function isValidationReport(value: unknown): value is ValidationReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.contractVersion === "string" &&
    candidate.contractVersion.length > 0 &&
    typeof candidate.reportId === "string" &&
    candidate.reportId.length > 0 &&
    typeof candidate.runId === "string" &&
    candidate.runId.length > 0 &&
    isExecutionStream(candidate.stream) &&
    typeof candidate.createdAt === "string" &&
    !isNaN(Date.parse(candidate.createdAt)) &&
    isArtifactReference(candidate.targetArtifact) &&
    (candidate.overallStatus === "PASS" || candidate.overallStatus === "WARN" || candidate.overallStatus === "FAIL") &&
    typeof candidate.isExecutable === "boolean" &&
    typeof candidate.summaryCounts === "object" &&
    candidate.summaryCounts !== null &&
    Array.isArray(candidate.findings)
  );
}

export function createValidationArtifactReference(report: ValidationReport): ArtifactReference {
  return createArtifactReference({
    artifactId: report.reportId,
    artifactType: ARTIFACT_TYPES.VALIDATION_REPORT,
    contractVersion: report.contractVersion,
    producingLayer: SOUND_ENGINEER_LAYERS.VALIDATION,
  });
}
