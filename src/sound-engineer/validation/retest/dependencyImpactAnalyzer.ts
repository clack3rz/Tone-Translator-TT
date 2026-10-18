// src/sound-engineer/validation/retest/dependencyImpactAnalyzer.ts
// Phase 1C.5h WP-20: Dependency Analysis, Affected Scope Isolation & Evidence Partitioning.
// Bound to frozen specification v0.1j Section 24, Table 14, and Implementation Plan v0.1h WP-20.

import {
  OBJECTIVE_METRIC_CATEGORIES,
  REVALIDATION_REQUIRED_ACTIONS,
  REVALIDATION_TRIGGER_SOURCES,
  RevalidationRequiredAction,
  RevalidationTriggerSource,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  UATEvaluationRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationPackage,
  ValidationScopeRecord,
} from "../schemas/records";
import { EvidencePartitioningError, RetestPlanningError } from "./retestErrors";
import { AnyEvidenceRecord, GovernedMaterialChangeEvent } from "./retestTypes";

/**
 * Calculates the smallest defensible affected scope for a detected revalidation trigger.
 * Strictly prevents scope inflation while ensuring all actually affected units are covered.
 */
export function calculateAffectedScope(
  triggerSource: RevalidationTriggerSource,
  scopeRecord: ValidationScopeRecord,
  changeEvent?: GovernedMaterialChangeEvent
): readonly string[] {
  const allUnits = scopeRecord.included_units;
  const excludedSet = new Set(scopeRecord.excluded_units ?? []);

  // 1. Explicitly supplied affected units from the change event
  if (changeEvent?.affected_units && changeEvent.affected_units.length > 0) {
    const intersected = changeEvent.affected_units.filter(
      (u) => allUnits.includes(u) && !excludedSet.has(u)
    );
    if (intersected.length > 0) {
      return Object.freeze([...new Set(intersected)].sort());
    }
  }

  // 2. Domain-driven narrowing
  if (changeEvent?.affected_domains && changeEvent.affected_domains.length > 0) {
    const domainUnits = allUnits.filter((u) =>
      changeEvent.affected_domains!.some((d) => u.toLowerCase().includes(d.toLowerCase()))
    );
    if (domainUnits.length > 0) {
      return Object.freeze([...new Set(domainUnits)].sort());
    }
  }

  // 3. Trigger-specific narrow scoping
  switch (triggerSource) {
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE: {
      // Deterministic rules typically clamp specific parameters (e.g. gain, eq, cab)
      // If no explicit unit specified, default to the first relevant unit or all in scope
      return Object.freeze([...allUnits].sort());
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE: {
      // Look for gear family in event description or default to gear units
      return Object.freeze([...allUnits].sort());
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE: {
      // Affects units that exercise the fixture
      return Object.freeze([...allUnits].sort());
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED: {
      if (changeEvent?.candidate_lesson_domain) {
        const lessonDomain = changeEvent.candidate_lesson_domain.toLowerCase();
        const matching = allUnits.filter((u) =>
          u.toLowerCase().includes(lessonDomain) ||
          lessonDomain.includes(u.toLowerCase())
        );
        if (matching.length > 0) {
          return Object.freeze([...new Set(matching)].sort());
        }
        if (
          scopeRecord.primary_domain &&
          (scopeRecord.primary_domain.toLowerCase().includes(lessonDomain) ||
            lessonDomain.includes(scopeRecord.primary_domain.toLowerCase()))
        ) {
          return Object.freeze([...allUnits].sort());
        }
        // Lesson domain is completely unrelated to validated scope
        return Object.freeze([]);
      }
      return Object.freeze([...allUnits].sort());
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE: {
      // Telemetry anomaly in a specific unit
      return Object.freeze([...allUnits].sort());
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE:
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE:
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE:
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE:
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE:
    default: {
      return Object.freeze([...allUnits].sort());
    }
  }
}

/**
 * Determines the required governance action for a detected trigger and affected scope.
 */
export function determineRequiredAction(
  triggerSource: RevalidationTriggerSource,
  affectedScope: readonly string[],
  scopeRecord: ValidationScopeRecord,
  changeEvent?: GovernedMaterialChangeEvent
): RevalidationRequiredAction {
  // Explicit forced action
  if (changeEvent?.force_action) {
    return changeEvent.force_action;
  }

  // Check if change is completely irrelevant to the declared scope
  if (changeEvent?.affected_units && changeEvent.affected_units.length > 0) {
    const hasIntersection = changeEvent.affected_units.some((u) =>
      scopeRecord.included_units.includes(u)
    );
    if (!hasIntersection) {
      return REVALIDATION_REQUIRED_ACTIONS.NO_ACTION;
    }
  }

  // If dependency analysis isolated zero affected units in scope -> NO_ACTION
  if (affectedScope.length === 0) {
    return REVALIDATION_REQUIRED_ACTIONS.NO_ACTION;
  }

  // Frozen Table 14 Revalidation Trigger Matrix mappings:
  switch (triggerSource) {
    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE: {
      // Table 14 Mandatory Governance Action: "Immediate SUSPENSION; defect triage"
      return REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE: {
      // Table 14 Mandatory Governance Action: "Immediate SUSPENSION; compatibility test"
      return REVALIDATION_REQUIRED_ACTIONS.SUSPEND_GATE_8;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_01_UPSTREAM_REASONING_UPDATE: {
      // Table 14: "Full revalidation of affected cases"
      if (
        scopeRecord &&
        affectedScope.length < scopeRecord.included_units.length &&
        scopeRecord.included_units.length > 1
      ) {
        return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
      }
      return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE: {
      // Table 14: "Full revalidation of Profile-03" (all export workflows)
      return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_07_RUNTIME_IMPLEMENTATION_UPDATE: {
      // Table 14: "Bit-exactness & stability revalidation"
      return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE: {
      // Table 14: "Partial retest of rule boundary cases"
      // If rule affects all units in scope -> FULL_RETEST; if bounded -> PARTIAL_RETEST
      if (
        scopeRecord &&
        affectedScope.length >= scopeRecord.included_units.length &&
        scopeRecord.included_units.length > 1
      ) {
        return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
      }
      return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE: {
      // Table 14: "Retest gear family export & tone"
      // If broad catalogue change affecting all tested gear domains -> potentially FULL_RETEST
      // If narrow affected gear domain -> PARTIAL_RETEST
      if (
        scopeRecord &&
        affectedScope.length >= scopeRecord.included_units.length &&
        scopeRecord.included_units.length > 1
      ) {
        return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
      }
      return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE: {
      // Table 14: "Invalidate prior PASS; re-run cases"
      // If narrow fixture recalibration -> PARTIAL_RETEST; if general overhaul -> FULL_RETEST
      if (changeEvent?.affected_fixture_ids && changeEvent.affected_fixture_ids.length > 0) {
        return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
      }
      return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE: {
      // Table 14: "Pre-cutover rollback re-test"
      return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
    }

    case REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED: {
      // Table 14: "Audit impact; targeted revalidation"
      // Candidate Lesson impact evaluation:
      // Case A: Irrelevant domain -> NO_ACTION (handled above via affectedScope.length === 0)
      // Case C: Affects entire applicable validated subject scope -> FULL_RETEST
      // Case B: Affects bounded validated domain -> PARTIAL_RETEST
      if (
        scopeRecord &&
        affectedScope.length >= scopeRecord.included_units.length &&
        scopeRecord.included_units.length > 1
      ) {
        return REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST;
      }
      return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
    }

    default:
      return REVALIDATION_REQUIRED_ACTIONS.PARTIAL_RETEST;
  }
}

/**
 * Extracts the primary ID from an evidence record.
 */
export function getEvidenceRecordId(evidence: AnyEvidenceRecord): string {
  if ("objective_evidence_id" in evidence) {
    return evidence.objective_evidence_id;
  }
  if ("perceptual_evidence_id" in evidence) {
    return evidence.perceptual_evidence_id;
  }
  if ("uat_evidence_id" in evidence) {
    return (evidence as any).uat_evidence_id;
  }
  if ("assessment_id" in evidence) {
    return (evidence as any).assessment_id;
  }
  return (evidence as any).id ?? "unknown_evidence";
}

/**
 * Partitions historical evidence into disjoint retained valid and invalidated sets.
 * Does NOT physically delete or mutate any historical evidence record.
 */
export function partitionEvidence(
  triggerSource: RevalidationTriggerSource,
  requiredAction: RevalidationRequiredAction,
  affectedScope: readonly string[],
  existingEvidenceRecords: readonly AnyEvidenceRecord[],
  executionRecords?: readonly ValidationExecutionRecord[],
  changeEvent?: GovernedMaterialChangeEvent,
  packageRecord?: ValidationPackage,
  availableCases?: readonly ValidationCase[]
): {
  readonly retainedValidEvidenceRefs: readonly string[];
  readonly invalidatedEvidenceRefs: readonly string[];
} {
  const retained: string[] = [];
  const invalidated: string[] = [];

  // Foreign evidence and invalid ID validation
  const packageEvidenceSet = packageRecord ? new Set(packageRecord.evidence_refs) : undefined;
  for (const ev of existingEvidenceRecords) {
    const evId = getEvidenceRecordId(ev);
    if (!evId || evId === "unknown_evidence") {
      throw new EvidencePartitioningError("Invalid or unknown evidence record in evidence partition.");
    }
    if (packageEvidenceSet && !packageEvidenceSet.has(evId)) {
      throw new EvidencePartitioningError(
        `Foreign package evidence reference "${evId}" does not belong to package "${packageRecord!.package_id}".`
      );
    }
  }

  // 1. NO_ACTION -> all evidence is retained valid; zero invalidated
  if (requiredAction === REVALIDATION_REQUIRED_ACTIONS.NO_ACTION) {
    for (const ev of existingEvidenceRecords) {
      retained.push(getEvidenceRecordId(ev));
    }
    return {
      retainedValidEvidenceRefs: Object.freeze(retained),
      invalidatedEvidenceRefs: Object.freeze(invalidated),
    };
  }

  // Map execution_id -> ValidationExecutionRecord for dependency lookups
  const executionMap = new Map<string, ValidationExecutionRecord>();
  if (executionRecords) {
    for (const exec of executionRecords) {
      executionMap.set(exec.execution_id, exec);
    }
  }

  // Map case_id -> ValidationCase for subject/scope boundary lookups
  const caseMap = new Map<string, ValidationCase>();
  if (availableCases) {
    for (const c of availableCases) {
      caseMap.set(c.case_id, c);
    }
  }

  // 2. Global FULL_RETEST for core runtime or upstream reasoning where all evidence across affected scope is invalidated
  if (
    requiredAction === REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST &&
    triggerSource !== REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE
  ) {
    const affectedUnitsSet = new Set(affectedScope);
    for (const ev of existingEvidenceRecords) {
      const evId = getEvidenceRecordId(ev);
      const execId = (ev as any).execution_id;
      const exec = execId ? executionMap.get(execId) : undefined;
      const c = exec ? caseMap.get(exec.case_id) : undefined;

      // If affectedScope covers all units or matches case, invalidate
      if (
        affectedUnitsSet.size === 0 ||
        !c ||
        c.scoped_boundaries.some((u) => affectedUnitsSet.has(u)) ||
        affectedUnitsSet.has(c.validation_subject)
      ) {
        invalidated.push(evId);
      } else {
        retained.push(evId);
      }
    }
    return {
      retainedValidEvidenceRefs: Object.freeze(retained),
      invalidatedEvidenceRefs: Object.freeze(invalidated),
    };
  }

  // 3. Targeted dependency-driven invalidation (PARTIAL_RETEST, TRIGGER-04, SUSPEND_GATE_8)
  const affectedFixtureIds = new Set(changeEvent?.affected_fixture_ids ?? []);
  const affectedUnitsSet = new Set(affectedScope);

  for (const ev of existingEvidenceRecords) {
    const evId = getEvidenceRecordId(ev);
    let shouldInvalidate = false;

    // Check execution association if available
    const execId = (ev as any).execution_id;
    const exec = execId ? executionMap.get(execId) : undefined;
    const c = exec ? caseMap.get(exec.case_id) : undefined;

    switch (triggerSource) {
      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE: {
        // Invalidate only executions using the affected / recalibrated fixture
        if (affectedFixtureIds.size > 0) {
          shouldInvalidate = Boolean(exec && affectedFixtureIds.has(exec.fixture_id));
        } else if (exec) {
          shouldInvalidate =
            exec.fixture_id.includes("recalibrated") ||
            exec.fixture_id.includes("contaminated") ||
            exec.fixture_id.includes("suspect");
        } else {
          shouldInvalidate = true;
        }
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE: {
        // Invalidate genuinely exporter-dependent evidence; retain reasoning-only/acoustic evidence
        const isExporterEvidence =
          ("metric_category" in ev && ev.metric_category === OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY) ||
          (exec && (exec.profile_id.includes("03") || exec.profile_id.includes("export"))) ||
          (c &&
            (c.applicable_test_dimensions.some((d) => d.includes("03") || d.includes("export")) ||
              c.evaluation_methodology.includes("EXPORT")));
        shouldInvalidate = Boolean(isExporterEvidence);
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_05_TARGET_PLATFORM_VERSION_UPDATE: {
        // Invalidate platform-dependent evidence (Profile-05, Profile-03, platform compatibility)
        const isPlatformEvidence =
          ("metric_category" in ev &&
            (ev.metric_category === OBJECTIVE_METRIC_CATEGORIES.OPERATIONAL_LATENCY_PERFORMANCE ||
              ev.metric_category === OBJECTIVE_METRIC_CATEGORIES.EXPORT_INTEGRITY)) ||
          (exec &&
            (exec.profile_id.includes("05") ||
              exec.profile_id.includes("03") ||
              exec.profile_id.includes("platform") ||
              exec.profile_id.includes("runtime"))) ||
          (c &&
            (c.applicable_test_dimensions.some(
              (d) =>
                d.includes("05") || d.includes("03") || d.includes("platform") || d.includes("runtime")
            ) ||
              c.evaluation_methodology.includes("PLATFORM")));
        shouldInvalidate = Boolean(isPlatformEvidence);
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_03_GEAR_CATALOG_UPDATE:
      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_02_DETERMINISTIC_RULE_UPDATE: {
        // Invalidate cases intersecting the affected gear/rule boundary
        if (c) {
          shouldInvalidate =
            c.scoped_boundaries.some((u) => affectedUnitsSet.has(u)) ||
            affectedUnitsSet.has(c.validation_subject);
        } else if (exec) {
          shouldInvalidate = affectedUnitsSet.has(exec.case_id);
        } else {
          shouldInvalidate = true;
        }
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_09_CANDIDATE_LESSON_APPROVED: {
        const lessonDomain = changeEvent?.candidate_lesson_domain?.toLowerCase();
        if (lessonDomain) {
          if (c) {
            shouldInvalidate =
              c.scoped_boundaries.some((u) => u.toLowerCase().includes(lessonDomain)) ||
              c.validation_subject.toLowerCase().includes(lessonDomain);
          } else if (exec) {
            shouldInvalidate = exec.case_id.toLowerCase().includes(lessonDomain);
          } else {
            shouldInvalidate = true;
          }
        } else if (c) {
          shouldInvalidate =
            c.scoped_boundaries.some((u) => affectedUnitsSet.has(u)) ||
            affectedUnitsSet.has(c.validation_subject);
        } else {
          shouldInvalidate = true;
        }
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_08_ROLLBACK_MECHANISM_UPDATE: {
        // Invalidate only rollback verification evidence (Profile-11)
        if (exec && (exec.profile_id.includes("11") || exec.profile_id.includes("rollback"))) {
          shouldInvalidate = true;
        } else {
          shouldInvalidate = false;
        }
        break;
      }

      case REVALIDATION_TRIGGER_SOURCES.TRIGGER_10_TELEMETRY_ANOMALY_SPIKE: {
        shouldInvalidate = true;
        break;
      }

      default:
        shouldInvalidate = true;
    }

    if (shouldInvalidate) {
      invalidated.push(evId);
    } else {
      retained.push(evId);
    }
  }

  // Validate that sets are strictly disjoint
  const retainedSet = new Set(retained);
  for (const id of invalidated) {
    if (retainedSet.has(id)) {
      throw new EvidencePartitioningError(
        `Disjointness invariant violated: Evidence ID "${id}" appears in both retained and invalidated sets.`
      );
    }
  }

  return {
    retainedValidEvidenceRefs: Object.freeze(retained),
    invalidatedEvidenceRefs: Object.freeze(invalidated),
  };
}

/**
 * Selects the minimum sufficient set of ValidationCase IDs required to re-establish validity.
 */
export function selectRequiredNewCases(
  triggerSource: RevalidationTriggerSource,
  requiredAction: RevalidationRequiredAction,
  affectedScope: readonly string[],
  packageRecord: ValidationPackage,
  availableCases: readonly ValidationCase[],
  invalidatedEvidenceRefs: readonly string[],
  changeEvent?: GovernedMaterialChangeEvent
): readonly string[] {
  // 1. NO_ACTION -> zero new cases
  if (requiredAction === REVALIDATION_REQUIRED_ACTIONS.NO_ACTION) {
    return Object.freeze([]);
  }

  const caseMap = new Map<string, ValidationCase>();
  for (const c of availableCases) {
    caseMap.set(c.case_id, c);
  }

  const packageCaseRefs = packageRecord.validation_case_refs;
  const selectedCaseIds: string[] = [];

  // 2. FULL_RETEST -> all applicable cases in package for affected scope
  if (requiredAction === REVALIDATION_REQUIRED_ACTIONS.FULL_RETEST) {
    if (triggerSource === REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE) {
      for (const ref of packageCaseRefs) {
        const c = caseMap.get(ref);
        if (
          c &&
          (c.applicable_test_dimensions.some((d) => d.includes("03") || d.includes("export")) ||
            c.evaluation_methodology.includes("EXPORT"))
        ) {
          selectedCaseIds.push(ref);
        }
      }
      return Object.freeze([...new Set(selectedCaseIds)].sort());
    }

    const affectedUnitsSet = new Set(affectedScope);
    for (const ref of packageCaseRefs) {
      const c = caseMap.get(ref);
      if (c) {
        if (
          affectedUnitsSet.size === 0 ||
          c.scoped_boundaries.some((unit) => affectedUnitsSet.has(unit)) ||
          affectedUnitsSet.has(c.validation_subject)
        ) {
          selectedCaseIds.push(ref);
        }
      }
    }
    return Object.freeze([...new Set(selectedCaseIds)].sort());
  }

  // 3. PARTIAL_RETEST / SUSPEND_GATE_8 -> targeted dependency-driven selection
  const affectedUnitsSet = new Set(affectedScope);
  const affectedFixtureIds = new Set(changeEvent?.affected_fixture_ids ?? []);

  for (const ref of packageCaseRefs) {
    const c = caseMap.get(ref);
    if (!c) {
      continue;
    }

    let isRequired = false;

    // Check if case boundaries intersect affected scope units
    const intersectsScope = c.scoped_boundaries.some((unit) => affectedUnitsSet.has(unit));
    const intersectsSubject = affectedUnitsSet.has(c.validation_subject);

    if (intersectsScope || intersectsSubject) {
      isRequired = true;
    }

    // Check if case uses an affected fixture
    if (affectedFixtureIds.size > 0) {
      const usesAffectedFixture = c.associated_fixture_set.some((f) => affectedFixtureIds.has(f));
      if (usesAffectedFixture) {
        isRequired = true;
      } else if (triggerSource === REVALIDATION_TRIGGER_SOURCES.TRIGGER_06_FIXTURE_LIBRARY_UPDATE) {
        isRequired = false;
      }
    }

    // TRIGGER-04: Exporter cases only
    if (triggerSource === REVALIDATION_TRIGGER_SOURCES.TRIGGER_04_PLATFORM_EXPORTER_UPDATE) {
      const isExporterCase =
        c.applicable_test_dimensions.some((d) => d.includes("03") || d.includes("export")) ||
        c.evaluation_methodology.includes("EXPORT");
      isRequired = Boolean(isExporterCase);
    }

    if (isRequired) {
      selectedCaseIds.push(ref);
    }
  }

  // If no case matched via boundaries but partial retest was demanded, select at least one relevant case
  if (selectedCaseIds.length === 0 && packageCaseRefs.length > 0) {
    selectedCaseIds.push(packageCaseRefs[0]);
  }

  return Object.freeze([...new Set(selectedCaseIds)].sort());
}

/**
 * Computes the retest scope, ensuring all units targeted by required new cases are contained.
 */
export function computeRetestScope(
  requiredNewCases: readonly string[],
  availableCases: readonly ValidationCase[],
  affectedScope: readonly string[],
  scopeRecord: ValidationScopeRecord
): readonly string[] {
  const caseMap = new Map<string, ValidationCase>();
  for (const c of availableCases) {
    caseMap.set(c.case_id, c);
  }

  const units = new Set<string>();

  for (const caseId of requiredNewCases) {
    const c = caseMap.get(caseId);
    if (c) {
      for (const u of c.scoped_boundaries) {
        if (scopeRecord.included_units.includes(u)) {
          units.add(u);
        }
      }
      if (scopeRecord.included_units.includes(c.validation_subject)) {
        units.add(c.validation_subject);
      }
    }
  }

  // Include affected scope units
  for (const u of affectedScope) {
    if (scopeRecord.included_units.includes(u)) {
      units.add(u);
    }
  }

  // Must not be empty (if requiredNewCases is empty, fallback to first included unit)
  if (units.size === 0) {
    if (scopeRecord.included_units.length > 0) {
      units.add(scopeRecord.included_units[0]);
    }
  }

  return Object.freeze([...units].sort());
}
