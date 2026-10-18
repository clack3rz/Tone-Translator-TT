// src/tests/uncertaintyManager.test.ts
// Test suite for Phase 1C.5h WP-18: Explicit Uncertainty Modeling & Production Risk Accounting (Record 16).
// Validates:
// 1. Exact Record 16 schema acceptance and extra-fields rejection.
// 2. Exact 7 uncertainty sources and rejection of noncanonical sources.
// 3. Exact 3 gate_8_impact values and rejection of noncanonical impacts.
// 4. Creation for all 7 uncertainty sources.
// 5. Source/impact orthogonality (same source can receive different impacts based on risk profile).
// 6. Risk profile required: fails closed on missing/unknown profile (no universal threshold fallback, no strictest profile fallback).
// 7. Internal risk calculation does not add extra fields to Record 16.
// 8. Governance boundaries: ACCEPTABLE_LOW_RISK is not PASS, ALLOWS_CONDITIONAL is not authorization, FORCES_BLOCK is not a Gate-8 decision.
// 9. Conditional impact retains non-empty declarative monitoring requirements (no telemetry execution).
// 10. WP-04 Scope containment: out-of-scope uncertainty rejected, excluded units rejected.
// 11. Context coherence: incompatible package, unrelated conflict, unrelated failure rejected.
// 12. Resolved/no-material-residual WP-17 conflict does not automatically convert.
// 13. WP-16 UNKNOWN failure requires residual-risk evidence (no automatic conversion).
// 14. Record 16 immutability and source record preservation.
// 15. Canonical UNCERTAIN_OF: ValidationOutcomeRecord -> ValidationUncertaintyRecord accepted, reverse rejected, invalid sources (Package, Conflict, Failure) rejected.
// 16. Graph catalogue remains exactly 14 governed edge types.
// 17. Absence of WP-19+ artifacts (no Record 17 generation, no Gate 8 adjudication, no revalidation).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_TYPES,
  FAILURE_ATTRIBUTION_CLASSES,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
  VALIDATION_OUTCOME_CLASSES,
  VALIDATION_PRIMARY_DOMAINS,
} from "../sound-engineer/validation/schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
} from "../sound-engineer/validation/graph/edgeTypes";
import {
  evidenceConflictRecordSchema,
  parseValidationUncertaintyRecord,
  validationOutcomeRecordSchema,
  validationUncertaintyRecordSchema,
  EvidenceConflictRecord,
  ValidationFailureRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
} from "../sound-engineer/validation/schemas/records";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import {
  IncompatibleUncertaintyContextError,
  InvalidUncertaintyLinkingError,
  InvalidUncertaintyRecordError,
  MissingRiskProfileError,
  RiskProfileResolver,
  ScopeContainmentViolationError,
  UnknownRiskProfileError,
  ValidationUncertaintyManager,
} from "../sound-engineer/validation/uncertainty";

// ---------------------------------------------------------------------------
// Test Fixture Helpers
// ---------------------------------------------------------------------------

function createMockScopeRecord(overrides?: Partial<ValidationScopeRecord>): ValidationScopeRecord {
  return {
    scope_id: "scope-pkg-001",
    intake_id: "intake-001",
    primary_domain: VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY,
    included_units: ["guitar:amp:plexi_50w", "guitar:amp:american_clean", "guitar:cab:4x12_greenback"],
    excluded_units: ["bass:amp:svt_classic"],
    boundary_constraints: ["sample_rate:44100-96000", "gain_range:0-10"],
    scope_inflation_protection: true,
    ...overrides,
  };
}

function createMockPackageRecord(overrides?: Partial<ValidationPackage>): ValidationPackage {
  return {
    package_id: "pkg-001",
    intake_id: "intake-001",
    scope_record_ref: "scope-pkg-001",
    version_binding_ref: "binding-001",
    assigned_test_profiles: ["profile:04_acoustic_frequency_response"],
    validation_case_refs: ["case-001"],
    execution_record_refs: ["exec-001"],
    evidence_refs: ["obj-001", "perc-001"],
    ...overrides,
  };
}

function createMockConflictRecord(overrides?: Partial<EvidenceConflictRecord>): EvidenceConflictRecord {
  return {
    conflict_id: "conf-pkg-001-01",
    package_id: "pkg-001",
    conflict_type: CONFLICT_TYPES.OBJECTIVE_VS_PERCEPTUAL,
    competing_evidence_refs: ["obj-001", "perc-001"],
    conflict_description: "Objective frequency response met envelope bounds but human listening detected unmusical artifacts.",
    underlying_acoustic_phenomenon: "Psychoacoustic divergence between transfer function tolerances and timbre perception.",
    resolution_strategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
    resolution_status: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
    residual_uncertainty_score: 0.75,
    ...overrides,
  };
}

function createMockFailureRecord(overrides?: Partial<ValidationFailureRecord>): ValidationFailureRecord {
  return {
    failure_id: "fail-pkg-001-01",
    execution_id: "exec-001",
    failure_timestamp: "2026-03-20T12:00:00Z",
    failure_title: "Intermittent audio buffer dropouts",
    failure_symptom: "Audio glitch during export execution under load",
    attribution_class: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
    attribution_evidence_refs: ["exec-001"],
    attribution_confidence: "SUSPECTED",
    materiality: "MAJOR",
    affected_scope: ["guitar:amp:plexi_50w"],
    gate_8_blocked: true,
    remand_destination: "Phase 1C.5a AI Sound Engineer",
    retest_prerequisites: "Rerun under clean sandbox",
    ...overrides,
  };
}

/**
 * Test fixture for a schema-valid ValidationOutcomeRecord.
 * STRICT BOUNDARY: Used solely to verify UNCERTAIN_OF graph endpoint typing.
 * This is NOT an implementation of WP-19.
 */
function createMockOutcomeRecordFixture(overrides?: Partial<ValidationOutcomeRecord>): ValidationOutcomeRecord {
  return {
    outcome_id: "outcome-pkg-001-01",
    package_id: "pkg-001",
    outcome_class: VALIDATION_OUTCOME_CLASSES.CONDITIONAL,
    evaluated_scope: "guitar:amp:plexi_50w",
    version_binding: "binding-001",
    summary_verdict: "Conditionally validated subject to residual uncertainty monitoring.",
    objective_summary: { passed: 10, failed: 0 },
    perceptual_summary: { passed: 8, inconclusive: 1 },
    uat_summary: { passed: 4, failed: 0 },
    regression_summary: { regressions_detected: 0 },
    unresolved_issues: ["Limited edge domain sampling"],
    conditions_imposed: ["Mandatory runtime telemetry monitoring"],
    timestamp: "2026-03-20T12:00:00Z",
    record_integrity_metadata: {
      integrity_digest: "sha256:outcome_test_digest",
      algorithm: "SHA-256",
      sealed_at: "2026-03-20T12:00:00Z",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe("Phase 1C.5h WP-18: ValidationUncertaintyRecord Schema & Enums", () => {
  it("accepts a valid Record 16 matching exact schema", () => {
    const raw = {
      uncertainty_id: "unc-pkg-001-001",
      package_id: "pkg-001",
      uncertainty_source: UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
      affected_scope: ["guitar:amp:plexi_50w"],
      potential_production_risk: "Missing transient response measurements may allow clipping.",
      gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
      required_monitoring_if_authorized: [],
    };

    const parsed = parseValidationUncertaintyRecord(raw);
    assert.equal(parsed.uncertainty_id, "unc-pkg-001-001");
    assert.equal(parsed.uncertainty_source, "MISSING_EVIDENCE");
    assert.equal(parsed.gate_8_impact, "FORCES_BLOCK");
  });

  it("strictly rejects extra/invented persisted fields on Record 16 (risk_score, risk_level, severity, confidence, gate8_blocked)", () => {
    const forbiddenFields = [
      { risk_score: 0.95 },
      { risk_level: "HIGH" },
      { severity: "CRITICAL" },
      { confidence: "HIGH" },
      { gate8_blocked: true },
    ];

    for (const extra of forbiddenFields) {
      const invalidRecord = {
        uncertainty_id: "unc-pkg-001-002",
        package_id: "pkg-001",
        uncertainty_source: UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
        affected_scope: ["guitar:amp:plexi_50w"],
        potential_production_risk: "Risk description.",
        gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
        required_monitoring_if_authorized: [],
        ...extra,
      };

      assert.throws(
        () => validationUncertaintyRecordSchema.parse(invalidRecord),
        /unrecognized_keys|extra/i
      );
    }
  });

  it("accepts all seven exact uncertainty source enum tokens", () => {
    const expectedSources = [
      "MISSING_EVIDENCE",
      "CONFLICTING_EVIDENCE",
      "INSUFFICIENT_SAMPLE_SIZE",
      "UNTESTED_EDGE_DOMAIN",
      "CALIBRATION_AMBIGUITY",
      "UNKNOWN_FAILURE_CAUSE",
      "TARGET_PLATFORM_VERSION_INSTABILITY",
    ];

    for (const source of expectedSources) {
      assert.equal(UNCERTAINTY_SOURCES[source as keyof typeof UNCERTAINTY_SOURCES], source);
      const record = {
        uncertainty_id: `unc-${source}`,
        package_id: "pkg-001",
        uncertainty_source: source,
        affected_scope: ["guitar:amp:plexi_50w"],
        potential_production_risk: `Potential risk for ${source}`,
        gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
        required_monitoring_if_authorized: ["telemetry:generic_monitor"],
      };
      assert.doesNotThrow(() => validationUncertaintyRecordSchema.parse(record));
    }
  });

  it("rejects noncanonical uncertainty sources and invented aliases", () => {
    const invalidSources = [
      "LOW_CONFIDENCE",
      "UNKNOWN",
      "TEST_GAP",
      "EDGE_CASE",
      "PLATFORM_RISK",
      "DATA_GAP",
    ];

    for (const badSource of invalidSources) {
      const record = {
        uncertainty_id: `unc-bad-${badSource}`,
        package_id: "pkg-001",
        uncertainty_source: badSource,
        affected_scope: ["guitar:amp:plexi_50w"],
        potential_production_risk: "Risk",
        gate_8_impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
        required_monitoring_if_authorized: ["telemetry:monitor"],
      };
      assert.throws(() => validationUncertaintyRecordSchema.parse(record));
    }
  });

  it("accepts all three exact gate_8_impact tokens and rejects noncanonical values", () => {
    const validImpacts = ["ALLOWS_CONDITIONAL", "FORCES_BLOCK", "ACCEPTABLE_LOW_RISK"];
    for (const impact of validImpacts) {
      assert.equal(
        UNCERTAINTY_GATE_8_IMPACTS[impact as keyof typeof UNCERTAINTY_GATE_8_IMPACTS],
        impact
      );
    }

    const badImpacts = ["PASS", "FAIL", "BLOCKED", "CONDITIONAL", "REJECTED", "AUTHORIZED"];
    for (const badImpact of badImpacts) {
      const record = {
        uncertainty_id: `unc-bad-impact-${badImpact}`,
        package_id: "pkg-001",
        uncertainty_source: UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
        affected_scope: ["guitar:amp:plexi_50w"],
        potential_production_risk: "Risk",
        gate_8_impact: badImpact,
        required_monitoring_if_authorized: [],
      };
      assert.throws(() => validationUncertaintyRecordSchema.parse(record));
    }
  });
});

describe("Phase 1C.5h WP-18: Governed Uncertainty Creation for All 7 Sources", () => {
  it("creates Source 1: MISSING_EVIDENCE", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      missingEvidenceDescription: "Missing DI dynamic pickup response measurement for high-gain setting.",
      severity: "CRITICAL",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.MISSING_EVIDENCE);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);
    assert.equal(result.isForcesBlock, true);
    assert.equal(result.isAllowsConditional, false);
    // Internal risk score is calculated in evaluation but NOT in Record 16
    assert.ok(result.evaluation.internalCalculatedRiskScore! > 0.8);
    assert.equal((result.uncertaintyRecord as Record<string, unknown>).risk_score, undefined);
  });

  it("creates Source 2: CONFLICTING_EVIDENCE for unresolved conflict with material residual doubt", () => {
    const manager = new ValidationUncertaintyManager();
    const conflict = createMockConflictRecord({
      resolution_status: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
      residual_uncertainty_score: 0.85,
    });

    const result = manager.recordConflictingEvidence({
      packageId: "pkg-001",
      conflictRecord: conflict,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      severity: "CRITICAL",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);
  });

  it("creates Source 3: INSUFFICIENT_SAMPLE_SIZE", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordInsufficientSampleSize({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      sampleSizeActual: 10,
      sampleSizeRequired: 20,
      severity: "MEDIUM",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);
    assert.ok(result.uncertaintyRecord.required_monitoring_if_authorized.length > 0);
  });

  it("creates Source 4: UNTESTED_EDGE_DOMAIN", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["sample_rate:192000", "buffer_size:32"],
      severity: "HIGH",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);
  });

  it("creates Source 5: CALIBRATION_AMBIGUITY without converting to failure", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordCalibrationAmbiguity({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:american_clean"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      calibrationDivergenceDescription: "Fixture reference DI pre-amp exhibited 0.5dB calibration drift.",
      severity: "MEDIUM",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.CALIBRATION_AMBIGUITY);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);
    assert.ok(result.uncertaintyRecord.required_monitoring_if_authorized.includes("telemetry:fixture_recalibration_audit_flag"));
  });

  it("creates Source 6: UNKNOWN_FAILURE_CAUSE when residual-risk evidence is supplied", () => {
    const manager = new ValidationUncertaintyManager();
    const failure = createMockFailureRecord({
      attribution_class: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
    });

    const result = manager.recordUnknownFailureCause({
      packageId: "pkg-001",
      failureRecord: failure,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      residualRiskEvidence: "Intermittent audio glitch occurred on 1 out of 500 test runs with unexplained root cause.",
      severity: "HIGH",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);
  });

  it("creates Source 7: TARGET_PLATFORM_VERSION_INSTABILITY", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordTargetPlatformVersionInstability({
      packageId: "pkg-001",
      affectedScope: ["guitar:cab:4x12_greenback"],
      riskProfileRef: "risk_profile:platform:amplitube5_adapter",
      targetPlatformName: "AmpliTube 5",
      targetVersion: "5.5.0-beta",
      instabilityDescription: "Unreleased beta patch contains unverified XML node changes.",
      severity: "MEDIUM",
    });

    assert.equal(result.uncertaintyRecord.uncertainty_source, UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY);
    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);
    assert.ok(result.uncertaintyRecord.required_monitoring_if_authorized.includes("telemetry:at5_preset_load_success_rate"));
  });
});

describe("Phase 1C.5h WP-18: Source/Impact Orthogonality & Risk Profile Governance", () => {
  it("proves uncertainty source does not hardcode Gate 8 impact (same source receives different impacts)", () => {
    const manager = new ValidationUncertaintyManager();

    // 1. UNTESTED_EDGE_DOMAIN with HIGH severity in conservative profile -> FORCES_BLOCK
    const highRisk = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["extreme_gain_boost:11.0"],
      severity: "CRITICAL",
    });
    assert.equal(highRisk.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);

    // 2. UNTESTED_EDGE_DOMAIN with MEDIUM severity in conservative profile -> ALLOWS_CONDITIONAL
    const medRisk = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["secondary_bright_switch_setting"],
      severity: "MEDIUM",
    });
    assert.equal(medRisk.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);

    // 3. UNTESTED_EDGE_DOMAIN with LOW severity in conservative profile -> ACCEPTABLE_LOW_RISK
    const lowRisk = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["cosmetic_indicator_toggle"],
      severity: "LOW",
    });
    assert.equal(lowRisk.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK);
  });

  it("fails closed when risk profile is missing or unknown (no fallback to universal threshold or strictest profile)", () => {
    const manager = new ValidationUncertaintyManager();

    // Missing profile reference
    assert.throws(
      () =>
        manager.recordMissingEvidence({
          packageId: "pkg-001",
          affectedScope: ["guitar:amp:plexi_50w"],
          riskProfileRef: "",
          missingEvidenceDescription: "Missing",
        }),
      MissingRiskProfileError
    );

    // Unknown profile reference
    assert.throws(
      () =>
        manager.recordMissingEvidence({
          packageId: "pkg-001",
          affectedScope: ["guitar:amp:plexi_50w"],
          riskProfileRef: "risk_profile:non_existent:guessed_profile",
          missingEvidenceDescription: "Missing",
        }),
      UnknownRiskProfileError
    );
  });

  it("confirms internal risk calculation does not add a persisted field to Record 16", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      missingEvidenceDescription: "Missing evidence",
    });

    const keys = Object.keys(result.uncertaintyRecord);
    assert.ok(!keys.includes("risk_score"));
    assert.ok(!keys.includes("internalCalculatedRiskScore"));
    assert.deepEqual(keys.sort(), [
      "affected_scope",
      "gate_8_impact",
      "package_id",
      "potential_production_risk",
      "required_monitoring_if_authorized",
      "uncertainty_id",
      "uncertainty_source",
    ].sort());
  });
});

describe("Phase 1C.5h WP-18: Governance Boundaries & Declarative Monitoring", () => {
  it("confirms ACCEPTABLE_LOW_RISK does not create a PASS verdict or ValidationOutcomeRecord", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:permissive:low_impact",
      untestedDomainElements: ["secondary_ui_skin"],
      severity: "LOW",
    });

    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK);
    assert.equal(result.isAcceptableLowRisk, true);
    // Verifies no outcome record or pass verdict is generated
    assert.equal((result as unknown as Record<string, unknown>).outcome_class, undefined);
    assert.equal((result as unknown as Record<string, unknown>).outcomeRecord, undefined);
  });

  it("confirms ALLOWS_CONDITIONAL does not authorize deployment or execute telemetry", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordCalibrationAmbiguity({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:american_clean"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      calibrationDivergenceDescription: "0.2dB calibration drift.",
      severity: "MEDIUM",
    });

    assert.equal(result.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);
    assert.equal(result.isAllowsConditional, true);
    // Declarative monitoring list is populated
    assert.ok(result.uncertaintyRecord.required_monitoring_if_authorized.length > 0);
    // Monitoring requirements are purely string identifiers (declarative only)
    for (const rule of result.uncertaintyRecord.required_monitoring_if_authorized) {
      assert.equal(typeof rule, "string");
      assert.ok(rule.startsWith("telemetry:"));
    }
  });

  it("requires non-empty required_monitoring_if_authorized when impact is ALLOWS_CONDITIONAL", () => {
    const manager = new ValidationUncertaintyManager();
    assert.throws(
      () =>
        manager.recordUncertainty({
          packageId: "pkg-001",
          uncertaintySource: UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN,
          affectedScope: ["guitar:amp:plexi_50w"],
          riskProfileRef: "risk_profile:conservative:core_dsp",
          customGate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
          customRequiredMonitoring: [], // PROHIBITED EMPTY MONITORING FOR CONDITIONAL
        }),
      InvalidUncertaintyRecordError
    );
  });
});

describe("Phase 1C.5h WP-18: Scope Containment & Context Coherence", () => {
  it("rejects affected_scope exceeding WP-04 declared validation scope (ScopeContainmentViolationError)", () => {
    const scope = createMockScopeRecord({
      included_units: ["guitar:amp:plexi_50w"],
      excluded_units: ["bass:amp:svt_classic"],
      scope_inflation_protection: true,
    });
    const manager = new ValidationUncertaintyManager();

    // 1. Unit not in included_units
    assert.throws(
      () =>
        manager.recordMissingEvidence({
          packageId: "pkg-001",
          scopeRecord: scope,
          affectedScope: ["guitar:amp:untested_marshall_jcm800"], // Out of scope
          riskProfileRef: "risk_profile:conservative:core_dsp",
          missingEvidenceDescription: "Missing",
        }),
      ScopeContainmentViolationError
    );

    // 2. Unit in negative boundary fence (excluded_units)
    assert.throws(
      () =>
        manager.recordMissingEvidence({
          packageId: "pkg-001",
          scopeRecord: scope,
          affectedScope: ["bass:amp:svt_classic"], // Explicitly excluded
          riskProfileRef: "risk_profile:conservative:core_dsp",
          missingEvidenceDescription: "Missing",
        }),
      ScopeContainmentViolationError
    );
  });

  it("rejects incompatible package and context references", () => {
    const pkg = createMockPackageRecord({ package_id: "pkg-001" });
    const manager = new ValidationUncertaintyManager();

    // Mismatched package ID between input and packageRecord
    assert.throws(
      () =>
        manager.recordUncertainty({
          packageId: "pkg-002", // Mismatch
          packageRecord: pkg,
          uncertaintySource: UNCERTAINTY_SOURCES.MISSING_EVIDENCE,
          affectedScope: ["guitar:amp:plexi_50w"],
          riskProfileRef: "risk_profile:conservative:core_dsp",
        }),
      IncompatibleUncertaintyContextError
    );
  });

  it("rejects unrelated WP-17 conflict referencing a different package", () => {
    const manager = new ValidationUncertaintyManager();
    const conflict = createMockConflictRecord({
      package_id: "pkg-FOREIGN-999", // Unrelated package
    });

    assert.throws(
      () =>
        manager.recordConflictingEvidence({
          packageId: "pkg-001",
          conflictRecord: conflict,
          riskProfileRef: "risk_profile:conservative:core_dsp",
        }),
      IncompatibleUncertaintyContextError
    );
  });

  it("rejects automatic conversion of a resolved WP-17 conflict with zero residual uncertainty", () => {
    const manager = new ValidationUncertaintyManager();
    const resolvedConflict = createMockConflictRecord({
      resolution_status: CONFLICT_RESOLUTION_STATUSES.RESOLVED_BY_PANEL,
      residual_uncertainty_score: 0, // No material doubt remains
    });

    assert.throws(
      () =>
        manager.recordConflictingEvidence({
          packageId: "pkg-001",
          conflictRecord: resolvedConflict,
          riskProfileRef: "risk_profile:conservative:core_dsp",
        }),
      IncompatibleUncertaintyContextError
    );
  });

  it("rejects automatic conversion of WP-16 UNKNOWN failure without explicit residual-risk evidence", () => {
    const manager = new ValidationUncertaintyManager();
    const failure = createMockFailureRecord({
      attribution_class: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
    });

    assert.throws(
      () =>
        manager.recordUnknownFailureCause({
          packageId: "pkg-001",
          failureRecord: failure,
          riskProfileRef: "risk_profile:conservative:core_dsp",
          residualRiskEvidence: "", // MISSING RESIDUAL RISK EVIDENCE
        }),
      IncompatibleUncertaintyContextError
    );
  });
});

describe("Phase 1C.5h WP-18: Immutability & Source Record Integrity", () => {
  it("enforces deep immutability on emitted ValidationUncertaintyRecord", () => {
    const manager = new ValidationUncertaintyManager();
    const result = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      missingEvidenceDescription: "Missing",
    });

    const record = result.uncertaintyRecord;
    assert.throws(
      () => {
        (record as unknown as Record<string, unknown>).potential_production_risk = "Mutated risk";
      },
      /TypeError: Cannot assign to read only property/
    );

    assert.throws(
      () => {
        (record.affected_scope as unknown as string[]).push("guitar:amp:injected");
      },
      /TypeError: Cannot add property/
    );
  });
});

describe("Phase 1C.5h WP-18: Canonical UNCERTAIN_OF Graph Linking & Catalogue Protection", () => {
  it("accepts canonical ValidationOutcomeRecord -> ValidationUncertaintyRecord UNCERTAIN_OF edge", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const manager = new ValidationUncertaintyManager({ graph, ledger });

    const result = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["extreme_gain_boost:11.0"],
      severity: "CRITICAL",
    });

    // Test-only schema-valid outcome fixture used strictly to verify graph endpoint conformance
    const outcomeFixture = createMockOutcomeRecordFixture({
      outcome_id: "outcome-001",
      package_id: "pkg-001",
    });

    const edge = manager.linkUncertaintyToOutcome(outcomeFixture, result.uncertaintyRecord);

    assert.equal(edge.edgeType, GOVERNED_EDGE_TYPES.UNCERTAIN_OF);
    assert.equal(edge.source.id, outcomeFixture.outcome_id);
    assert.equal(edge.source.kind, GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord);
    assert.equal(edge.target.id, result.uncertaintyRecord.uncertainty_id);
    assert.equal(edge.target.kind, GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord);

    // Verify presence in graph
    const edgeFromGraph = graph.getEdge(edge.edgeId);
    assert.ok(edgeFromGraph);
    assert.equal(edgeFromGraph?.edgeType, GOVERNED_EDGE_TYPES.UNCERTAIN_OF);
    assert.equal(edgeFromGraph?.source.id, outcomeFixture.outcome_id);
    assert.equal(edgeFromGraph?.target.id, result.uncertaintyRecord.uncertainty_id);
  });

  it("rejects reverse UNCERTAIN_OF edge (ValidationUncertaintyRecord -> ValidationOutcomeRecord)", () => {
    const graph = new ValidationRelationshipGraph();
    const manager = new ValidationUncertaintyManager({ graph });

    const result = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      missingEvidenceDescription: "Missing",
    });

    const outcomeFixture = createMockOutcomeRecordFixture({ package_id: "pkg-001" });

    // Reverse attempt directly via graph.addEdge
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
          source: {
            id: result.uncertaintyRecord.uncertainty_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
          },
          target: {
            id: outcomeFixture.outcome_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
          },
        }),
      /InvalidEndpointError|endpoint/i
    );
  });

  it("rejects illegal UNCERTAIN_OF source kinds (Package, Conflict, Failure)", () => {
    const graph = new ValidationRelationshipGraph();

    const target = {
      id: "unc-001",
      kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
    };

    // 1. ValidationPackage -> ValidationUncertaintyRecord
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
          source: { id: "pkg-001", kind: GOVERNED_ENTITY_KINDS.ValidationPackage },
          target,
        }),
      /InvalidEndpointError|endpoint/i
    );

    // 2. EvidenceConflictRecord -> ValidationUncertaintyRecord
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
          source: { id: "conf-001", kind: GOVERNED_ENTITY_KINDS.EvidenceConflictRecord },
          target,
        }),
      /InvalidEndpointError|endpoint/i
    );

    // 3. ValidationFailureRecord -> ValidationUncertaintyRecord
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
          source: { id: "fail-001", kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord },
          target,
        }),
      /InvalidEndpointError|endpoint/i
    );
  });

  it("confirms the relationship graph catalogue remains exactly 14 governed edge types", () => {
    const allGovernedEdges = Object.keys(GOVERNED_EDGE_TYPES);
    assert.equal(allGovernedEdges.length, 14);
    assert.deepEqual(allGovernedEdges.sort(), [
      "AUTHORIZES_SCOPE",
      "BOUND_TO",
      "COMPARED_AGAINST",
      "CONFLICTS_WITH",
      "DERIVED_FROM_HANDOFF",
      "EVALUATED_BY",
      "EVIDENCED_BY",
      "INVALIDATED_BY",
      "REMANDS_TO",
      "REQUIRES_RETEST",
      "SUPERSEDES_VALIDATION",
      "TESTED_WITH",
      "UNCERTAIN_OF",
      "VALIDATES",
    ].sort());
  });

  it("confirms WP-18 does not synthesize Record 17 and WP-19 artifacts are absent", () => {
    const manager = new ValidationUncertaintyManager();
    // Manager has no method to synthesize outcomes or Gate 8 decisions
    assert.equal((manager as unknown as Record<string, unknown>).synthesizeOutcome, undefined);
    assert.equal((manager as unknown as Record<string, unknown>).createGate8Decision, undefined);
    assert.equal((manager as unknown as Record<string, unknown>).generateRetestPlan, undefined);
  });
});

describe("Phase 1C.5h WP-18: Source Preservation, Narrow Scoping, and Downstream Protection", () => {
  it("proves CONFLICTING_EVIDENCE produces different impacts under different severity/profiles", () => {
    const manager = new ValidationUncertaintyManager();
    const conflict = createMockConflictRecord();

    // 1. Critical severity -> FORCES_BLOCK
    const r1 = manager.recordConflictingEvidence({
      packageId: "pkg-001",
      conflictRecord: conflict,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      severity: "CRITICAL",
    });
    assert.equal(r1.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);

    // 2. Medium severity -> ALLOWS_CONDITIONAL
    const r2 = manager.recordConflictingEvidence({
      packageId: "pkg-001",
      conflictRecord: conflict,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      severity: "MEDIUM",
    });
    assert.equal(r2.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);

    // 3. Low severity -> ACCEPTABLE_LOW_RISK
    const r3 = manager.recordConflictingEvidence({
      packageId: "pkg-001",
      conflictRecord: conflict,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      severity: "LOW",
    });
    assert.equal(r3.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK);
  });

  it("proves UNKNOWN_FAILURE_CAUSE is not automatically blocking", () => {
    const manager = new ValidationUncertaintyManager();
    const failure = createMockFailureRecord({ attribution_class: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN });

    const nonBlockingResult = manager.recordUnknownFailureCause({
      packageId: "pkg-001",
      failureRecord: failure,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      residualRiskEvidence: "Intermittent non-critical log artifact under rare stress condition.",
      severity: "MEDIUM",
    });

    assert.equal(nonBlockingResult.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL);
    assert.equal(nonBlockingResult.isForcesBlock, false);
  });

  it("proves MISSING_EVIDENCE is not universally mapped to one impact", () => {
    const manager = new ValidationUncertaintyManager();

    // Conservative core DSP -> FORCES_BLOCK
    const res1 = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:conservative:core_dsp",
      missingEvidenceDescription: "Missing",
      severity: "CRITICAL",
    });
    assert.equal(res1.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK);

    // General standard with low severity -> ACCEPTABLE_LOW_RISK
    const res2 = manager.recordMissingEvidence({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:general:standard",
      missingEvidenceDescription: "Missing non-essential telemetry metric",
      severity: "LOW",
    });
    assert.equal(res2.uncertaintyRecord.gate_8_impact, UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK);
  });

  it("proves source records (WP-16 Failure, WP-17 Conflict) remain completely unmodified and un-mutated", () => {
    const manager = new ValidationUncertaintyManager();
    const conflict = createMockConflictRecord();
    const conflictCopy = JSON.parse(JSON.stringify(conflict));

    manager.recordConflictingEvidence({
      packageId: "pkg-001",
      conflictRecord: conflict,
      riskProfileRef: "risk_profile:conservative:core_dsp",
    });
    assert.deepEqual(conflict, conflictCopy);

    const failure = createMockFailureRecord();
    const failureCopy = JSON.parse(JSON.stringify(failure));

    manager.recordUnknownFailureCause({
      packageId: "pkg-001",
      failureRecord: failure,
      riskProfileRef: "risk_profile:conservative:core_dsp",
      residualRiskEvidence: "Material doubt remains.",
    });
    assert.deepEqual(failure, failureCopy);
  });

  it("enforces narrow scoping without scope inflation (one sample rate/boundary does not inflate to all)", () => {
    const manager = new ValidationUncertaintyManager();
    const scope = createMockScopeRecord({
      included_units: ["sample_rate:192000", "gain_level:10.0", "guitar:amp:plexi_50w"],
      scope_inflation_protection: true,
    });

    const result = manager.recordUntestedEdgeDomain({
      packageId: "pkg-001",
      scopeRecord: scope,
      affectedScope: ["sample_rate:192000"], // Narrow single unit
      riskProfileRef: "risk_profile:conservative:core_dsp",
      untestedDomainElements: ["sample_rate:192000"],
      severity: "MEDIUM",
    });

    assert.equal(result.uncertaintyRecord.affected_scope.length, 1);
    assert.equal(result.uncertaintyRecord.affected_scope[0], "sample_rate:192000");
    assert.ok(!result.uncertaintyRecord.affected_scope.includes("guitar:amp:plexi_50w"));
  });

  it("confirms WP-18 creates zero downstream records (No Record 17, 18, 19, 20, 21, 22) and no telemetry jobs", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const manager = new ValidationUncertaintyManager({ graph, ledger });

    manager.recordTargetPlatformVersionInstability({
      packageId: "pkg-001",
      affectedScope: ["guitar:amp:plexi_50w"],
      riskProfileRef: "risk_profile:platform:amplitube5_adapter",
      targetPlatformName: "AmpliTube 5",
      targetVersion: "5.5.0",
      instabilityDescription: "Minor patch version incompatibility.",
    });

    // Ledger only contains Record 16 (ValidationUncertaintyRecord)
    const ledgerEntries = ledger.getEntries();
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].entityKind, "ValidationUncertaintyRecord");

    // No Record 17 (ValidationOutcomeRecord)
    // No Record 18 (RevalidationTriggerRecord)
    // No Record 19 (RetestPlanRecord)
    // No Record 20 (ProductionReadinessAssessmentRecord)
    // No Record 21 (AdoptionDecisionRecord)
    // No Record 22 (Gate8ChangeRecord)
    for (const entry of ledgerEntries) {
      assert.notEqual(entry.entityKind, "ValidationOutcomeRecord");
      assert.notEqual(entry.entityKind, "RevalidationTriggerRecord");
      assert.notEqual(entry.entityKind, "RetestPlanRecord");
      assert.notEqual(entry.entityKind, "ProductionReadinessAssessmentRecord");
      assert.notEqual(entry.entityKind, "AdoptionDecisionRecord");
      assert.notEqual(entry.entityKind, "Gate8ChangeRecord");
    }

    // Graph only contains registered uncertainty node
    const nodes = graph.getNodes();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].kind, GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord);
  });
});
