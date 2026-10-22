// src/sound-engineer/validation/readiness/readinessContextValidator.ts
// Context validation, integrity checks, and deterministic ID derivation for WP-21.

import { computeSha256BytesHex } from "../fixtures/audioVerification";
import { GOVERNED_EDGE_TYPES } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { VersionBindingService } from "../binding/versionBindingService";
import {
  ProductionReadinessSynthesisInput,
} from "./productionReadinessTypes";
import {
  ReadinessContextValidationError,
} from "./productionReadinessErrors";

/**
 * Validates input parameters for Production Readiness Synthesis.
 * Fails closed if essential package or scope records are missing.
 */
export function validateReadinessContext(input: ProductionReadinessSynthesisInput): void {
  if (!input) {
    throw new ReadinessContextValidationError("ProductionReadinessSynthesisInput is required.");
  }

  if (!input.packageRecord || !input.packageRecord.package_id) {
    throw new ReadinessContextValidationError("A valid ValidationPackage with package_id is required.");
  }

  if (!input.scopeRecord || !input.scopeRecord.scope_id) {
    throw new ReadinessContextValidationError("A valid ValidationScopeRecord with scope_id is required.");
  }

  // Validate version binding integrity if provided
  if (input.versionBinding) {
    const service = new VersionBindingService();
    const isValid = service.verifyBindingIntegrity(input.versionBinding);
    if (!isValid) {
      throw new ReadinessContextValidationError(
        `Version binding integrity validation failed for "${input.versionBinding.binding_id}".`
      );
    }
  }
}

/**
 * Checks if a historical ValidationOutcomeRecord or AdoptionDecisionRecord has been invalidated
 * by an outgoing INVALIDATED_BY edge to a RevalidationTriggerRecord in the graph.
 * Strictly respects canonical edge definition: source must be ValidationOutcomeRecord | AdoptionDecisionRecord.
 */
export function isOutcomeInvalidatedInGraph(
  outcomeId: string,
  graph?: ValidationRelationshipGraph
): boolean {
  if (!graph || !outcomeId) {
    return false;
  }
  return graph.getEdges().some(
    (e) => e.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY && e.source.id === outcomeId
  );
}

/** Backward-compatible alias for isOutcomeInvalidatedInGraph */
export const isRecordStaleInGraph = isOutcomeInvalidatedInGraph;

/**
 * Derives a deterministic, tamper-evident readiness assessment ID based on
 * the canonical package ID, requested scope, version binding, and evaluation components.
 */
export function deriveDeterministicReadinessId(
  packageId: string,
  requestedScope: readonly string[],
  bindingId?: string,
  timestamp?: string
): string {
  const sortedScope = [...requestedScope].sort().join(",");
  const payload = `readiness:${packageId}:${bindingId ?? "no_binding"}:${sortedScope}:${timestamp ?? ""}`;
  const hash = computeSha256BytesHex(new TextEncoder().encode(payload)).slice(0, 16);
  return `readiness_${hash}`;
}
