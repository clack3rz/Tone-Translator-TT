// src/sound-engineer/validation/platform/amplitube5ExportEvidence.ts
// AmpliTube 5 export-process evidence translator and integrity evaluator.
// Bound to Phase 1C.5h WP-30 Stage 2 Slice 4B.

import {
  type ExportProcessEvidence,
  type ParameterConversionRecord,
  type PlatformParameterValidationResult,
  type PlatformValidationStatus,
  PLATFORM_VALIDATION_STATUSES,
} from "./platformAdapter";

/**
 * Normalizes an attribute or parameter key for deterministic correlation.
 */
function normalizeParamKey(key: string): string {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Translates Stage-12 exporter diagnostics (e.g. ExportDebugData or parameter_details)
 * into technology-neutral ExportProcessEvidence without importing AT5-specific types into platform contracts.
 */
export function translateStage12ExportEvidence(
  debugData: unknown
): ExportProcessEvidence {
  if (!debugData || typeof debugData !== "object") {
    return { parameterConversions: [] };
  }

  const data = debugData as Record<string, any>;
  const records: ParameterConversionRecord[] = [];

  // Case 1: Standard ExportDebugData with exported_chain or items
  const chain = Array.isArray(data.exported_chain)
    ? data.exported_chain
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  for (const item of chain) {
    if (!item || typeof item !== "object") continue;

    const moduleId = String(
      item.actual_exported_guid || item.resolved_guid || item.guid || ""
    );
    const details = Array.isArray(item.parameter_details)
      ? item.parameter_details
      : [];

    for (const detail of details) {
      if (!detail || typeof detail !== "object") continue;

      const parameterId = String(
        detail.matched_export_parameter_name ||
          detail.at5XmlAttributeName ||
          detail.parameter ||
          ""
      );
      if (!parameterId) continue;

      const clampApplied = Boolean(
        detail.clamp_applied ||
          detail.display_clamp_applied ||
          detail.raw_clamp_applied ||
          detail.clampApplied
      );

      const sourceValue =
        detail.input_value !== undefined
          ? detail.input_value
          : detail.input_display_value !== undefined
          ? detail.input_display_value
          : detail.sourceValue;

      const convertedValue =
        detail.final_export_value !== undefined
          ? detail.final_export_value
          : detail.converted_raw_value !== undefined
          ? detail.converted_raw_value
          : detail.convertedValue;

      const serializedValue =
        detail.serialized_export_value !== undefined
          ? String(detail.serialized_export_value)
          : detail.actual_xml_value !== undefined
          ? String(detail.actual_xml_value)
          : detail.exported_internal_value !== undefined
          ? String(detail.exported_internal_value)
          : detail.serializedValue !== undefined
          ? String(detail.serializedValue)
          : undefined;

      const mappingStatus = detail.mapping_status || detail.mappingStatus;
      const diagnosticNote =
        detail.conversion_note ||
        detail.conversion_warning ||
        detail.reason ||
        detail.diagnosticNote;

      records.push({
        parameterId,
        targetModuleId: moduleId || undefined,
        sourceValue,
        convertedValue,
        serializedValue,
        clampApplied,
        preClampValue: detail.pre_clamp_value ?? detail.preClampValue,
        postClampValue: detail.post_clamp_value ?? detail.postClampValue,
        displayValue: detail.display_value ?? detail.displayValue,
        mappingStatus: mappingStatus ? String(mappingStatus) : undefined,
        diagnosticNote: diagnosticNote ? String(diagnosticNote) : undefined,
      });
    }
  }

  // Case 2: Direct list of parameter_details without item wrapper
  if (records.length === 0 && Array.isArray(data.parameter_details)) {
    for (const detail of data.parameter_details) {
      if (!detail || typeof detail !== "object") continue;
      const parameterId = String(
        detail.matched_export_parameter_name || detail.parameter || ""
      );
      if (!parameterId) continue;

      records.push({
        parameterId,
        targetModuleId: detail.moduleId || detail.targetModuleId,
        sourceValue:
          detail.input_value ?? detail.input_display_value ?? detail.sourceValue,
        convertedValue:
          detail.final_export_value ??
          detail.converted_raw_value ??
          detail.convertedValue,
        serializedValue:
          detail.serialized_export_value ??
          detail.actual_xml_value ??
          detail.serializedValue,
        clampApplied: Boolean(detail.clamp_applied || detail.clampApplied),
        preClampValue: detail.pre_clamp_value ?? detail.preClampValue,
        postClampValue: detail.post_clamp_value ?? detail.postClampValue,
        displayValue: detail.display_value ?? detail.displayValue,
        mappingStatus: detail.mapping_status ?? detail.mappingStatus,
        diagnosticNote:
          detail.conversion_note ?? detail.reason ?? detail.diagnosticNote,
      });
    }
  }

  // Case 3: Already an ExportProcessEvidence container
  if (records.length === 0 && Array.isArray(data.parameterConversions)) {
    return {
      parameterConversions: data.parameterConversions,
      sourcePresetName: data.sourcePresetName,
      exportMetadata: data.exportMetadata,
    };
  }

  return {
    parameterConversions: records,
    sourcePresetName: data.sourcePresetName ?? data.preset_name,
    exportMetadata: data.exportMetadata,
  };
}

/**
 * Result of evaluating export-process evidence against serialized parameters.
 */
export interface AmpliTube5EvidenceEvaluationResult {
  readonly correlatedParameterResults: readonly PlatformParameterValidationResult[];
  readonly overallProcessStatus: PlatformValidationStatus;
  readonly isComplete: boolean;
  readonly missingEvidenceCount: number;
  readonly duplicateEvidenceCount: number;
  readonly orphanEvidenceCount: number;
  readonly clampCount: number;
  readonly disparityCount: number;
  readonly failureCount: number;
  readonly diagnostics: readonly string[];
}

/**
 * Checks whether an evidence record matches a serialized parameter.
 */
function isRecordMatch(
  rec: ParameterConversionRecord,
  p: PlatformParameterValidationResult
): boolean {
  // 1. Parameter key match (case-insensitive alphanumeric equality)
  if (normalizeParamKey(rec.parameterId) !== normalizeParamKey(p.parameterId)) {
    return false;
  }

  // 2. Module identity match if present
  if (rec.targetModuleId && p.moduleId) {
    return (
      rec.targetModuleId.toLowerCase().trim() ===
      p.moduleId.toLowerCase().trim()
    );
  }

  return true;
}

/**
 * Evaluates export-process evidence against the serialized parameters discovered in the preset.
 * Verifies source/conversion/serialized integrity, pre-export clamping, and mapping statuses.
 */
export function evaluateAmpliTube5ExportEvidence(
  serializedParameters: readonly PlatformParameterValidationResult[],
  evidence: ExportProcessEvidence
): AmpliTube5EvidenceEvaluationResult {
  const diagnostics: string[] = [];
  const records = evidence.parameterConversions || [];
  const matchedRecordIndices = new Set<number>();

  let missingEvidenceCount = 0;
  let duplicateEvidenceCount = 0;
  let clampCount = 0;
  let disparityCount = 0;
  let failureCount = 0;

  const correlatedResults: PlatformParameterValidationResult[] = [];

  for (const p of serializedParameters) {
    // Find all matching evidence records for this serialized parameter
    const matchingIndices: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (isRecordMatch(records[i], p)) {
        matchingIndices.push(i);
      }
    }

    // A: Missing evidence
    if (matchingIndices.length === 0) {
      missingEvidenceCount++;
      diagnostics.push(
        `MISSING_EVIDENCE [${p.moduleId ?? "unknown"}/${p.parameterId}]: No export conversion evidence found for serialized parameter.`
      );
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        status: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
        legalRange: p.legalRange,
        message: `Missing export conversion evidence for serialized parameter '${p.parameterId}'.`,
      });
      continue;
    }

    // B: Duplicate evidence
    if (matchingIndices.length > 1) {
      duplicateEvidenceCount++;
      for (const idx of matchingIndices) {
        matchedRecordIndices.add(idx);
      }
      diagnostics.push(
        `DUPLICATE_EVIDENCE [${p.moduleId ?? "unknown"}/${p.parameterId}]: Multiple (${matchingIndices.length}) conversion evidence records found.`
      );
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        status: PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE,
        legalRange: p.legalRange,
        message: `Duplicate export conversion evidence detected (${matchingIndices.length} records) for parameter '${p.parameterId}'.`,
      });
      continue;
    }

    // C: Exactly one matching record
    const matchIdx = matchingIndices[0];
    matchedRecordIndices.add(matchIdx);
    const rec = records[matchIdx];

    // Priority 1: Did Slice 4A serialized legality already fail?
    if (p.status === PLATFORM_VALIDATION_STATUSES.FAIL) {
      failureCount++;
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: rec.clampApplied,
        status: PLATFORM_VALIDATION_STATUSES.FAIL,
        legalRange: p.legalRange,
        message: p.message,
      });
      continue;
    }

    // Priority 2: Factual mapping / configuration failure reported by exporter
    const rawStatus = String(rec.mappingStatus || "").toUpperCase().trim();
    if (
      rawStatus === "FAIL" ||
      rawStatus === "FAILED" ||
      rawStatus === "MISMATCH" ||
      rawStatus === "FAIL_MAPPING_CONFIGURATION"
    ) {
      failureCount++;
      const msg = `Export mapping failure [${rawStatus}] for parameter '${p.parameterId}': ${rec.diagnosticNote || "Mapping configuration failed in exporter."}`;
      diagnostics.push(`MAPPING_FAILURE [${p.moduleId ?? "unknown"}/${p.parameterId}]: ${msg}`);
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: rec.clampApplied,
        status: PLATFORM_VALIDATION_STATUSES.FAIL,
        legalRange: p.legalRange,
        message: msg,
      });
      continue;
    }

    // Priority 3: Expected export value differs from actual serialized XML value
    let isValueMismatch = false;
    let expectedRep = "";
    if (rec.convertedValue !== undefined && p.serializedValue !== undefined) {
      const expNum =
        typeof rec.convertedValue === "number"
          ? rec.convertedValue
          : parseFloat(String(rec.convertedValue));
      const actNum = parseFloat(String(p.serializedValue));

      if (!isNaN(expNum) && !isNaN(actNum)) {
        isValueMismatch = Math.abs(expNum - actNum) > 1e-4;
        expectedRep = String(expNum);
      } else if (rec.serializedValue !== undefined) {
        isValueMismatch =
          String(rec.serializedValue).trim().toLowerCase() !==
          String(p.serializedValue).trim().toLowerCase();
        expectedRep = String(rec.serializedValue);
      }
    }

    if (isValueMismatch) {
      failureCount++;
      const msg = `Export disparity: evidence expected serialized value '${expectedRep}' but actual serialized XML contains '${p.serializedValue}' for parameter '${p.parameterId}'.`;
      diagnostics.push(`EXPORT_MISMATCH [${p.moduleId ?? "unknown"}/${p.parameterId}]: ${msg}`);
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: rec.clampApplied,
        status: PLATFORM_VALIDATION_STATUSES.FAIL,
        legalRange: p.legalRange,
        message: msg,
      });
      continue;
    }

    // Priority 4: Pre-export clamping applied
    if (rec.clampApplied) {
      clampCount++;
      const msg = `Pre-export clamping detected: source value '${rec.sourceValue}' was clamped to '${rec.convertedValue ?? p.serializedValue}' for parameter '${p.parameterId}'.`;
      diagnostics.push(`CLAMPING_DETECTED [${p.moduleId ?? "unknown"}/${p.parameterId}]: ${msg}`);
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: true,
        status: PLATFORM_VALIDATION_STATUSES.DISPARITY,
        legalRange: p.legalRange,
        message: msg,
      });
      continue;
    }

    // Priority 5: Exporter reported non-fatal DISPARITY
    if (rawStatus === "DISPARITY") {
      disparityCount++;
      const msg = `Export disparity reported for parameter '${p.parameterId}': ${rec.diagnosticNote || "Value altered during export."}`;
      diagnostics.push(`DISPARITY [${p.moduleId ?? "unknown"}/${p.parameterId}]: ${msg}`);
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: false,
        status: PLATFORM_VALIDATION_STATUSES.DISPARITY,
        legalRange: p.legalRange,
        message: msg,
      });
      continue;
    }

    // Priority 6: Non-fatal exporter warning
    if (rawStatus === "WARNING" || rawStatus === "SUCCESS_NEAREST_BAND") {
      const msg = `Export warning for parameter '${p.parameterId}': ${rec.diagnosticNote || rawStatus}`;
      correlatedResults.push({
        parameterId: p.parameterId,
        moduleId: p.moduleId,
        serializedValue: p.serializedValue,
        sourceValue: rec.sourceValue,
        clampApplied: false,
        status: PLATFORM_VALIDATION_STATUSES.WARNING,
        legalRange: p.legalRange,
        message: msg,
      });
      continue;
    }

    // Priority 7: Clean conversion
    correlatedResults.push({
      parameterId: p.parameterId,
      moduleId: p.moduleId,
      serializedValue: p.serializedValue,
      sourceValue: rec.sourceValue,
      clampApplied: false,
      status: PLATFORM_VALIDATION_STATUSES.PASS,
      legalRange: p.legalRange,
      message: `Verified source-to-export integrity for parameter '${p.parameterId}' = ${p.serializedValue} (source: ${rec.sourceValue}).`,
    });
  }

  // D: Check for orphan evidence records
  let orphanEvidenceCount = 0;
  for (let i = 0; i < records.length; i++) {
    if (!matchedRecordIndices.has(i)) {
      orphanEvidenceCount++;
      const rec = records[i];
      diagnostics.push(
        `ORPHAN_EVIDENCE [${rec.targetModuleId ?? "unknown"}/${rec.parameterId}]: Evidence record does not correspond to any active serialized parameter in preset artifact.`
      );
    }
  }

  // Overall process status calculation
  let overallProcessStatus: PlatformValidationStatus;
  if (failureCount > 0) {
    overallProcessStatus = PLATFORM_VALIDATION_STATUSES.FAIL;
  } else if (
    missingEvidenceCount > 0 ||
    duplicateEvidenceCount > 0 ||
    orphanEvidenceCount > 0 ||
    serializedParameters.length === 0
  ) {
    overallProcessStatus = PLATFORM_VALIDATION_STATUSES.NOT_VERIFIABLE;
  } else if (clampCount > 0 || disparityCount > 0) {
    overallProcessStatus = PLATFORM_VALIDATION_STATUSES.DISPARITY;
  } else if (correlatedResults.some((r) => r.status === PLATFORM_VALIDATION_STATUSES.WARNING)) {
    overallProcessStatus = PLATFORM_VALIDATION_STATUSES.WARNING;
  } else {
    overallProcessStatus = PLATFORM_VALIDATION_STATUSES.PASS;
  }

  const isComplete =
    missingEvidenceCount === 0 &&
    duplicateEvidenceCount === 0 &&
    orphanEvidenceCount === 0 &&
    serializedParameters.length > 0;

  return {
    correlatedParameterResults: correlatedResults,
    overallProcessStatus,
    isComplete,
    missingEvidenceCount,
    duplicateEvidenceCount,
    orphanEvidenceCount,
    clampCount,
    disparityCount,
    failureCount,
    diagnostics,
  };
}
