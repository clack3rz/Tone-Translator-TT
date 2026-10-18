// src/sound-engineer/validation/retest/triggerMappings.ts
// Phase 1C.5h WP-20: Revalidation Trigger Source Normalization & Version Mapping.
// Bound to frozen specification v0.1j Section 24.2, Table 14, and Implementation Plan v0.1h WP-20.

import {
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  RevalidationRequiredAction,
  RevalidationTriggerSource,
} from "../schemas/enums";
import { ValidationVersionBindingRecord } from "../schemas/records";
import { InvalidRequiredActionError, InvalidTriggerSourceError } from "./retestErrors";

/**
 * Mapping from various normalized trigger representations (e.g. "TRIGGER-01", "trigger_01", etc.)
 * to the exact canonical RevalidationTriggerSource enum string.
 */
const TRIGGER_ALIAS_MAP: Record<string, RevalidationTriggerSource> = {
  // TRIGGER-01
  "trigger-01": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  "trigger_01": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  "trigger01": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  "trigger-1": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  "trigger_1": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  "1": REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE,

  // TRIGGER-02
  "trigger-02": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  "trigger_02": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  "trigger02": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  "trigger-2": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  "trigger_2": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  "2": REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE,

  // TRIGGER-03
  "trigger-03": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  "trigger_03": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  "trigger03": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  "trigger-3": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  "trigger_3": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  "3": REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE,

  // TRIGGER-04
  "trigger-04": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  "trigger_04": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  "trigger04": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  "trigger-4": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  "trigger_4": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  "4": REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE,

  // TRIGGER-05
  "trigger-05": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  "trigger_05": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  "trigger05": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  "trigger-5": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  "trigger_5": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  "5": REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE,

  // TRIGGER-06
  "trigger-06": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  "trigger_06": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  "trigger06": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  "trigger-6": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  "trigger_6": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  "6": REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE,

  // TRIGGER-07
  "trigger-07": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  "trigger_07": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  "trigger07": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  "trigger-7": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  "trigger_7": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  "7": REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE,

  // TRIGGER-08
  "trigger-08": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  "trigger_08": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  "trigger08": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  "trigger-8": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  "trigger_8": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  "8": REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE,

  // TRIGGER-09
  "trigger-09": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  "trigger_09": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  "trigger09": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  "trigger-9": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  "trigger_9": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  "9": REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED,

  // TRIGGER-10
  "trigger-10": REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
  "trigger_10": REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
  "trigger10": REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
  "10": REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
  [REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE.toLowerCase()]:
    REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE,
};

/**
 * Normalizes an arbitrary trigger string to the canonical RevalidationTriggerSource.
 * Strictly rejects trigger 11 and unapproved sources.
 */
export function normalizeTriggerSource(source: string): RevalidationTriggerSource {
  if (!source || typeof source !== "string") {
    throw new InvalidTriggerSourceError(String(source));
  }

  const clean = source.trim().toLowerCase();

  // Explicit check for trigger 11 or higher
  if (
    clean === "trigger-11" ||
    clean === "trigger_11" ||
    clean === "trigger11" ||
    clean === "11" ||
    clean.includes("trigger_11") ||
    clean.includes("trigger-11")
  ) {
    throw new InvalidTriggerSourceError(source);
  }

  const canonical = TRIGGER_ALIAS_MAP[clean];
  if (!canonical) {
    throw new InvalidTriggerSourceError(source);
  }

  return canonical;
}

/**
 * Normalizes an arbitrary required action string to the canonical RevalidationRequiredAction.
 * Strictly rejects non-canonical actions (e.g. RETEST, ROLLBACK, INVALIDATE, etc.).
 */
export function normalizeRequiredAction(action: string): RevalidationRequiredAction {
  if (!action || typeof action !== "string") {
    throw new InvalidRequiredActionError(String(action));
  }

  const upper = action.trim().toUpperCase();
  if (
    upper === REVALIDATION_REQUIRED_ACTIONS.NO_ACTION ||
    upper === REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST ||
    upper === REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST ||
    upper === REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8
  ) {
    return upper as RevalidationRequiredAction;
  }

  throw new InvalidRequiredActionError(action);
}

/**
 * Analyzes differences between a prior and updated ValidationVersionBindingRecord
 * and returns all triggered RevalidationTriggerSource values with rationales.
 */
export function detectTriggersFromBindingDiff(
  prior: ValidationVersionBindingRecord,
  current: ValidationVersionBindingRecord
): {
  readonly triggers: readonly RevalidationTriggerSource[];
  readonly rationales: readonly string[];
} {
  const triggers: RevalidationTriggerSource[] = [];
  const rationales: string[] = [];

  // 1. Upstream Reasoning Architecture Matrix (1C.5a through 1C.5f, 1C.5h_mandate) or model_configuration_version
  const reasoningChanged =
    prior.model_configuration_version !== current.model_configuration_version ||
    prior.architecture_version_matrix["1C.5a_version"].version !==
      current.architecture_version_matrix["1C.5a_version"].version ||
    prior.architecture_version_matrix["1C.5a_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5a_version"].integrity_ref ||
    prior.architecture_version_matrix["1C.5b_version"].version !==
      current.architecture_version_matrix["1C.5b_version"].version ||
    prior.architecture_version_matrix["1C.5b_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5b_version"].integrity_ref ||
    prior.architecture_version_matrix["1C.5c_version"].version !==
      current.architecture_version_matrix["1C.5c_version"].version ||
    prior.architecture_version_matrix["1C.5c_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5c_version"].integrity_ref ||
    prior.architecture_version_matrix["1C.5d_version"].version !==
      current.architecture_version_matrix["1C.5d_version"].version ||
    prior.architecture_version_matrix["1C.5d_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5d_version"].integrity_ref ||
    prior.architecture_version_matrix["1C.5e_version"].version !==
      current.architecture_version_matrix["1C.5e_version"].version ||
    prior.architecture_version_matrix["1C.5e_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5e_version"].integrity_ref ||
    prior.architecture_version_matrix["1C.5f_version"].version !==
      current.architecture_version_matrix["1C.5f_version"].version ||
    prior.architecture_version_matrix["1C.5f_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5f_version"].integrity_ref;

  if (reasoningChanged) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE);
    rationales.push(
      "TRIGGER-01: Detected change in upstream reasoning architecture matrix (Phases 1C.5a–1C.5f) or model_configuration_version."
    );
  }

  // 2. Deterministic rules version
  if (prior.deterministic_rules_version !== current.deterministic_rules_version) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE);
    rationales.push(
      `TRIGGER-02: Deterministic rules version changed from "${prior.deterministic_rules_version}" to "${current.deterministic_rules_version}".`
    );
  }

  // 3. Gear catalog version
  if (prior.gear_catalog_version !== current.gear_catalog_version) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE);
    rationales.push(
      `TRIGGER-03: Gear definition catalog version changed from "${prior.gear_catalog_version}" to "${current.gear_catalog_version}".`
    );
  }

  // 4. Platform exporter version
  if (prior.platform_exporter_version !== current.platform_exporter_version) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE);
    rationales.push(
      `TRIGGER-04: Platform exporter version changed from "${prior.platform_exporter_version}" to "${current.platform_exporter_version}".`
    );
  }

  // 5. Target platform runtime or host environment version
  if (
    prior.target_platform_runtime_version !== current.target_platform_runtime_version ||
    prior.host_environment_version !== current.host_environment_version
  ) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE);
    rationales.push(
      `TRIGGER-05: Target platform runtime ("${prior.target_platform_runtime_version}" -> "${current.target_platform_runtime_version}") or host environment ("${prior.host_environment_version}" -> "${current.host_environment_version}") updated.`
    );
  }

  // 6. Fixture library version
  if (prior.fixture_library_version !== current.fixture_library_version) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE);
    rationales.push(
      `TRIGGER-06: Golden Acoustic Fixture library version changed from "${prior.fixture_library_version}" to "${current.fixture_library_version}".`
    );
  }

  // 7. Runtime implementation version
  if (prior.runtime_implementation_version !== current.runtime_implementation_version) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE);
    rationales.push(
      `TRIGGER-07: Core runtime/DSP implementation version changed from "${prior.runtime_implementation_version}" to "${current.runtime_implementation_version}".`
    );
  }

  // 8. Rollback mechanism (1C.5g migration/coexistence/rollback architecture)
  if (
    prior.architecture_version_matrix["1C.5g_version"].version !==
      current.architecture_version_matrix["1C.5g_version"].version ||
    prior.architecture_version_matrix["1C.5g_version"].integrity_ref !==
      current.architecture_version_matrix["1C.5g_version"].integrity_ref
  ) {
    triggers.push(REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE);
    rationales.push(
      "TRIGGER-08: Rollback mechanism / operational deployment logic version (Phase 1C.5g) changed."
    );
  }

  return { triggers, rationales };
}
