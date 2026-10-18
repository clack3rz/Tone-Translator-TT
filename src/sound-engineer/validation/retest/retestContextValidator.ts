// src/sound-engineer/validation/retest/retestContextValidator.ts
// Phase 1C.5h WP-20: Revalidation Context & Binding Transition Validation.
// Bound to frozen specification v0.1j Section 9.2, Section 9.5, Section 24, and Implementation Plan v0.1h WP-20.

import { computeSha256BytesHex } from "../fixtures/audioVerification";
import {
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import {
  BindingIntegrityError,
  IncoherentBindingTransitionError,
  ScopeContainmentError,
} from "./retestErrors";
import { GovernedMaterialChangeEvent } from "./retestTypes";

/**
 * Validates the cryptographic and structural integrity of a ValidationVersionBindingRecord.
 * Fails closed if binding references are missing, corrupt, or contain prohibited placeholders.
 */
export function validateBindingIntegrity(
  binding: ValidationVersionBindingRecord,
  label: "priorBinding" | "newBinding"
): void {
  if (!binding || typeof binding !== "object") {
    throw new BindingIntegrityError(label, "Binding record is undefined or not an object.");
  }

  if (!binding.binding_id || typeof binding.binding_id !== "string" || binding.binding_id.trim().length === 0) {
    throw new BindingIntegrityError(label, "binding_id must be a non-empty string.");
  }

  if (!binding.scope_id || typeof binding.scope_id !== "string" || binding.scope_id.trim().length === 0) {
    throw new BindingIntegrityError(binding.binding_id, "scope_id must be a non-empty string.");
  }

  const vir = binding.version_integrity_reference;
  if (!vir || typeof vir !== "object") {
    throw new BindingIntegrityError(binding.binding_id, "version_integrity_reference is missing.");
  }

  if (!vir.composite_digest || typeof vir.composite_digest !== "string" || vir.composite_digest.trim().length === 0) {
    throw new BindingIntegrityError(binding.binding_id, "version_integrity_reference.composite_digest is missing or empty.");
  }

  const lowerDigest = vir.composite_digest.toLowerCase();
  if (lowerDigest === "unknown" || lowerDigest === "pending" || lowerDigest === "none" || lowerDigest === "null") {
    throw new BindingIntegrityError(
      binding.binding_id,
      `Placeholder "${vir.composite_digest}" is prohibited as composite_digest.`
    );
  }

  if (!vir.sealed_at || typeof vir.sealed_at !== "string") {
    throw new BindingIntegrityError(binding.binding_id, "version_integrity_reference.sealed_at is missing.");
  }

  if (!vir.component_digests || typeof vir.component_digests !== "object") {
    throw new BindingIntegrityError(binding.binding_id, "version_integrity_reference.component_digests is missing.");
  }
}

/**
 * Validates the coherence of the transition between prior and new version bindings.
 */
export function validateBindingTransition(
  priorBinding: ValidationVersionBindingRecord,
  newBinding: ValidationVersionBindingRecord,
  changeEvent?: GovernedMaterialChangeEvent
): void {
  validateBindingIntegrity(priorBinding, "priorBinding");
  validateBindingIntegrity(newBinding, "newBinding");

  // 1. Cross-scope transition prohibited
  if (priorBinding.scope_id !== newBinding.scope_id) {
    throw new IncoherentBindingTransitionError(
      `Cross-scope binding transition prohibited. Prior scope: "${priorBinding.scope_id}", new scope: "${newBinding.scope_id}".`
    );
  }

  // 2. Identical binding IDs with no material change event is incoherent
  if (priorBinding.binding_id === newBinding.binding_id) {
    const hasExplicitChange =
      changeEvent &&
      (changeEvent.trigger_source !== undefined ||
        changeEvent.candidate_lesson_id !== undefined ||
        changeEvent.telemetry_anomaly !== undefined ||
        (changeEvent.affected_fixture_ids && changeEvent.affected_fixture_ids.length > 0));

    if (!hasExplicitChange) {
      throw new IncoherentBindingTransitionError(
        `Prior binding ID equals new binding ID ("${priorBinding.binding_id}") without an external material change event.`
      );
    }
  }

  // 3. Claimed trigger source validation against actual binding state changes
  if (changeEvent?.trigger_source) {
    const rawSource = String(changeEvent.trigger_source).trim();
    if (
      (rawSource.includes("03") || rawSource.includes("GEAR_CATALOG")) &&
      priorBinding.gear_catalog_version === newBinding.gear_catalog_version
    ) {
      throw new IncoherentBindingTransitionError(
        `Claimed TRIGGER-03 (Gear Catalog Update) but gear_catalog_version did not change ("${priorBinding.gear_catalog_version}").`
      );
    }
    if (
      (rawSource.includes("04") || rawSource.includes("EXPORTER")) &&
      priorBinding.platform_exporter_version === newBinding.platform_exporter_version
    ) {
      throw new IncoherentBindingTransitionError(
        `Claimed TRIGGER-04 (Platform Exporter Update) but platform_exporter_version did not change ("${priorBinding.platform_exporter_version}").`
      );
    }
    if (
      (rawSource.includes("02") || rawSource.includes("DETERMINISTIC_RULE")) &&
      priorBinding.deterministic_rules_version === newBinding.deterministic_rules_version
    ) {
      throw new IncoherentBindingTransitionError(
        `Claimed TRIGGER-02 (Deterministic Rule Update) but deterministic_rules_version did not change ("${priorBinding.deterministic_rules_version}").`
      );
    }
    if (
      (rawSource.includes("07") || rawSource.includes("RUNTIME_IMPLEMENTATION")) &&
      priorBinding.runtime_implementation_version === newBinding.runtime_implementation_version
    ) {
      throw new IncoherentBindingTransitionError(
        `Claimed TRIGGER-07 (Runtime Implementation Update) but runtime_implementation_version did not change ("${priorBinding.runtime_implementation_version}").`
      );
    }
    if (
      (rawSource.includes("10") || rawSource.includes("TELEMETRY")) &&
      changeEvent?.telemetry_anomaly &&
      changeEvent.telemetry_anomaly.warrants_gate_8_suspension !== true &&
      typeof changeEvent.telemetry_anomaly.observed_defect_rate === "number" &&
      typeof changeEvent.telemetry_anomaly.threshold === "number" &&
      changeEvent.telemetry_anomaly.observed_defect_rate < changeEvent.telemetry_anomaly.threshold
    ) {
      throw new IncoherentBindingTransitionError(
        `Claimed TRIGGER-10 (Production Telemetry Anomaly Spike) but telemetry anomaly is non-qualifying (observed defect rate ${changeEvent.telemetry_anomaly.observed_defect_rate} < threshold ${changeEvent.telemetry_anomaly.threshold} without suspension condition). Non-qualifying telemetry observations must not emit TRIGGER-10.`
      );
    }
  }
}

/**
 * Validates that an affected scope strictly resides within declared scope boundaries.
 */
export function validateScopeContainment(
  affectedScope: readonly string[],
  scopeRecord?: ValidationScopeRecord,
  requiredAction?: string
): void {
  if ((!affectedScope || affectedScope.length === 0) && requiredAction !== "NO_ACTION") {
    throw new ScopeContainmentError("Affected scope must contain at least one unit/component.");
  }

  if (!scopeRecord) {
    return;
  }

  const includedSet = new Set(scopeRecord.included_units);
  const excludedSet = new Set(scopeRecord.excluded_units ?? []);

  for (const unit of affectedScope) {
    if (excludedSet.has(unit)) {
      throw new ScopeContainmentError(
        `Unit "${unit}" is explicitly excluded in scope record "${scopeRecord.scope_id}".`
      );
    }

    if (!includedSet.has(unit)) {
      throw new ScopeContainmentError(
        `Unit "${unit}" is outside declared included_units of scope record "${scopeRecord.scope_id}".`
      );
    }
  }
}

/**
 * Derives a deterministic trigger ID for idempotency protection.
 */
export function deriveDeterministicTriggerId(
  priorBindingId: string,
  newBindingId: string,
  triggerSource: string,
  affectedScope: readonly string[],
  additionalEventToken?: string
): string {
  const sortedScope = [...affectedScope].sort().join(",");
  const payload = `${priorBindingId}:${newBindingId}:${triggerSource}:${sortedScope}:${additionalEventToken ?? ""}`;
  const hash = computeSha256BytesHex(new TextEncoder().encode(payload)).slice(0, 16);
  return `trig_${hash}`;
}
