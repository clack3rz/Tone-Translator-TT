#!/usr/bin/env python3
"""
Builder script for:
TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1c.txt

Revision Title:
Final Readiness, Applicability & Graph-Implementation Fidelity Correction

Immediate Source:
TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt [Preserved Unchanged]

Governing Authorities:
TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN]
TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN]
"""

import sys

def build():
    source_path = "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt"
    output_path = "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1c.txt"

    with open(source_path, "r", encoding="utf-8") as f:
        text = f.read()

    # 1. Header replacements
    old_header = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5h — IMPLEMENTATION & BUILD PLAN
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1b — Residual Frozen-Semantics & Canonical Contract Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1a.txt [Preserved Unchanged]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Source Status: FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE
Plan Status: DRAFT — IMPLEMENTATION PLANNING
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
================================================================================
1. DOCUMENT IDENTITY, PURPOSE & SCOPE
--------------------------------------------------------------------------------
1.1 Document Identification
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Phase: Phase 1C.5h (Empirical Validation, User Acceptance Testing, Verification & Production-Readiness Governance)
Version: v0.1b — Residual Frozen-Semantics & Canonical Contract Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1a.txt [Preserved Unchanged — SUPERSEDED BY v0.1b]"""

    new_header = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5h — IMPLEMENTATION & BUILD PLAN
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1c — Final Readiness, Applicability & Graph-Implementation Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt [Preserved Unchanged]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Source Status: FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE
Plan Status: DRAFT — IMPLEMENTATION PLANNING
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
================================================================================
1. DOCUMENT IDENTITY, PURPOSE & SCOPE
--------------------------------------------------------------------------------
1.1 Document Identification
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1c.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Phase: Phase 1C.5h (Empirical Validation, User Acceptance Testing, Verification & Production-Readiness Governance)
Version: v0.1c — Final Readiness, Applicability & Graph-Implementation Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt [Preserved Unchanged — SUPERSEDED BY v0.1c]"""

    assert old_header in text, "old_header not found"
    text = text.replace(old_header, new_header, 1)

    # 2. WP-01 Canonical Enum Parity replacement
    old_wp01_enums = """   - Canonical enum parity:
     * Record 01: `intake_status: INTAKE_ACCEPTED | INTAKE_REJECTED` (with optional `rejection_reason`);
     * Record 12: `evaluator_persona: RECORDING_ENGINEER | SESSION_GUITARIST | PRODUCER | PLATFORM_ARCHITECT`, `task_completion_status: COMPLETED_SUCCESSFULLY | COMPLETED_WITH_FRICTION | FAILED`, `musical_fitness_verdict: ACCEPTED | REJECTED | CONDITIONALLY_ACCEPTED`;
     * Record 13: `classification: INTENTIONAL_ARCHITECTURAL_CORRECTION | NEUTRAL_DIVERGENCE | GENUINE_REGRESSION | UNRESOLVED_DIVERGENCE`;
     * Record 21: `decision_outcome: AUTHORIZED | CONDITIONALLY_AUTHORIZED | REJECTED | BLOCKED`, `governance_status: ACTIVE | SUSPENDED | RESTRICTED | WITHDRAWN | SUPERSEDED`;
     * Record 22: `previous_governance_status: ACTIVE | SUSPENDED | RESTRICTED`, `new_governance_status: SUSPENDED | RESTRICTED | WITHDRAWN | SUPERSEDED`."""

    new_wp01_enums = """   - Canonical enum parity:
     * Record 01: `intake_status: INTAKE_ACCEPTED | INTAKE_REJECTED` (with optional `rejection_reason`);
     * Record 04: `readiness_outcome: READY | BLOCKED_NOT_EVALUABLE | READY_WITH_DECLARED_LIMITATIONS`, `evaluated_prerequisites` status values: `PASS | FAIL | BLOCKED`;
     * Record 08: `contamination_status: CLEAN | CONTAMINATED | SUSPECT`, `lifecycle_status: ACTIVE | SUPERSEDED | INVALIDATED | RETIRED`;
     * Record 10: `tolerance_evaluation: MET | OUT_OF_TOLERANCE | BORDERLINE | NOT_APPLICABLE`;
     * Record 12: `evaluator_persona: RECORDING_ENGINEER | SESSION_GUITARIST | PRODUCER | PLATFORM_ARCHITECT`, `task_completion_status: COMPLETED_SUCCESSFULLY | COMPLETED_WITH_FRICTION | FAILED`, `musical_fitness_verdict: ACCEPTED | REJECTED | CONDITIONALLY_ACCEPTED`;
     * Record 13: `classification: INTENTIONAL_ARCHITECTURAL_CORRECTION | NEUTRAL_DIVERGENCE | GENUINE_REGRESSION | UNRESOLVED_DIVERGENCE`;
     * Record 17: `outcome_class: PASS | FAIL | BLOCKED | CONDITIONAL` (strictly immutable; no `INVALIDATED` outcome state; stale applicability is modeled via incoming `INVALIDATED_BY` edge);
     * Record 18: `required_action: NO_ACTION | PARTIAL_RETEST | FULL_RETEST | SUSPEND_GATE_8`;
     * Record 20: `pillar_evaluations`: `acoustic_musical_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`, `reasoning_governance_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`, `platform_operational_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`, `rollback_safety_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`, `gate_8_eligible: boolean`;
     * Record 21: `decision_outcome: AUTHORIZED | CONDITIONALLY_AUTHORIZED | REJECTED | BLOCKED`, `governance_status: ACTIVE | SUSPENDED | RESTRICTED | WITHDRAWN | SUPERSEDED`;
     * Record 22: `previous_governance_status: ACTIVE | SUSPENDED | RESTRICTED`, `new_governance_status: SUSPENDED | RESTRICTED | WITHDRAWN | SUPERSEDED`."""

    assert old_wp01_enums in text, "old_wp01_enums not found"
    text = text.replace(old_wp01_enums, new_wp01_enums, 1)

    # 3. WP-02 Graph Implementation replacement
    old_wp02_spec = """   - [IMPLEMENTATION-INTERNAL — NON-ARCHITECTURAL]: Any internal persistence mechanics (e.g. database foreign keys, parent-child container links, or ledger block hash chains) exist solely as private persistence plumbing and do NOT constitute architectural relationship edges.
   - Governing Rule:
     `THE FROZEN EDGE NAME AND ITS ENDPOINT SEMANTICS FORM ONE CONTRACT. RESTORING THE NAME WITHOUT RESTORING THE ENDPOINTS IS NOT CONFORMANCE.`
   - Implement `ValidationAuditLedger` providing cryptographic hash chaining where every record references the previous block's integrity reference via `integrity_provider`.
5. Testable Deliverables:
   - `src/sound-engineer/validation/graph/relationshipGraph.ts`
   - `src/sound-engineer/validation/storage/auditLedger.ts`
   - Audit verification utility verifying cryptographic chain integrity.
6. Acceptance Criteria:
   - Exact implementation of the 14 frozen edges with zero invented edges and 100% endpoint conformity.
   - Cycle detection rejecting non-DAG edge insertions.
   - Tamper-detection: any modification to a historical record immediately breaks ledger validation."""

    new_wp02_spec = """   - Graph Cycle Detection & Symmetric Conflict Edge Handling:
     * Enforce strict DAG acyclicity across directional lineage and derivation flows: intake -> cases -> execution -> evidence -> outcomes -> revalidation -> retests;
     * Explicitly handle Edge 7 (`CONFLICTS_WITH: ObjectiveEvidenceRecord <-> PerceptualEvaluationRecord`) as an undirected, symmetric cross-evidence association rather than a directional lineage derivation;
     * The graph cycle detection engine must evaluate `CONFLICTS_WITH` as an orthogonal mutual relationship, ensuring bidirectional conflict assertions between competing evidence records do not trigger false-positive cycle rejections;
   - Lineage Traversal Query Contracts:
     * Implement `getProvenanceLineage(recordId)` tracing backwards to intake, handoff, and version binding;
     * Implement `getImpactedScope(triggerId)` tracing invalidation forward via `INVALIDATED_BY` and `REQUIRES_RETEST`;
     * Implement `getEvidenceForCase(caseId)` collecting all linked objective, perceptual, and conflict records;
     * Implement `isApplicableForCurrentBinding(outcomeRecord)` verifying whether an outcome remains applicable or has been rendered stale by an incoming `INVALIDATED_BY` edge;
   - [IMPLEMENTATION-INTERNAL — NON-ARCHITECTURAL]: Any internal persistence mechanics (e.g. database foreign keys, parent-child container links, or ledger block hash chains) exist solely as private persistence plumbing and do NOT constitute architectural relationship edges.
   - Governing Rule:
     `THE FROZEN EDGE NAME AND ITS ENDPOINT SEMANTICS FORM ONE CONTRACT. RESTORING THE NAME WITHOUT RESTORING THE ENDPOINTS IS NOT CONFORMANCE.`
   - Implement `ValidationAuditLedger` providing cryptographic hash chaining where every record references the previous block's integrity reference via `integrity_provider`.
5. Testable Deliverables:
   - `src/sound-engineer/validation/graph/relationshipGraph.ts`
   - `src/sound-engineer/validation/storage/auditLedger.ts`
   - Audit verification utility verifying cryptographic chain integrity and DAG lineage traversal.
6. Acceptance Criteria:
   - Exact implementation of the 14 frozen edges with zero invented edges and 100% endpoint conformity.
   - Cycle detection rejecting non-DAG directed lineage insertions while cleanly supporting symmetric `CONFLICTS_WITH` associations.
   - Complete lineage traversal query APIs operational for provenance and invalidation impact analysis.
   - Tamper-detection: any modification to a historical record immediately breaks ledger validation."""

    assert old_wp02_spec in text, "old_wp02_spec not found"
    text = text.replace(old_wp02_spec, new_wp02_spec, 1)

    # 4. WP-06 Pre-Validation Readiness Assessment replacement
    old_wp06 = """WP-06: Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor (Record 4)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the pre-flight readiness gatekeeper that verifies the candidate's eligibility for validation across the exact seven frozen Phase 1C.5g prerequisite gates and fixture coverage.
2. Architectural Binding:
   - Section 10: VALIDATION READINESS ASSESSMENT ARCHITECTURE.
   - Activity WF-03: Validation Readiness Assessment.
   - Table 04: Validation Workflow Matrix.
   - Table 12: Gate 8 Eligibility Matrix.
3. Inputs & Dependencies:
   - WP-05 (Version Binding), WP-03 (Intake).
4. Technical Implementation Specification:
   - Implement `ReadinessAssessmentAuditor` auditing the exact seven frozen Phase 1C.5g Gates:
     1. `Structural Mapping Complete`
     2. `Architectural Compatibility Verified`
     3. `Provenance & Lineage Sealed`
     4. `Shadow Execution Exercised`
     5. `Differential Analysis Documented`
     6. `Rollback Path Operational`
     7. `Handoff Package Assembled`
   - Governing Rule:
     `PHASE 1C.5h VERIFIES THE FROZEN PHASE 1C.5g GATES. IT DOES NOT DEFINE ALTERNATIVE GATE NAMES.`
   - Verify fixture coverage ratio against declared scope requirements;
   - Verify test environment health;
   - Produce `ValidationReadinessAssessmentRecord` (Record 4) with outcome `READY`, `BLOCKED_NOT_EVALUABLE`, or `READY_WITH_DECLARED_LIMITATIONS`.
5. Testable Deliverables:
   - `src/sound-engineer/validation/readiness/readinessAuditor.ts`
   - Test cases simulating missing Gate 5 (Differential Analysis Documented) and unverified Gate 6 (Rollback Path Operational).
6. Acceptance Criteria:
   - Exact audit of the seven frozen Phase 1C.5g gate tokens with zero renamed gates.
   - `BLOCKED_NOT_EVALUABLE` outcome halts validation pipeline immediately before execution.
   - Detailed deficiency log generated for every unmet prerequisite.
7. Failure Modes & Mitigations:
   - Partial gate evidence: enforce strict schema validation on Phase 1C.5g gate tokens."""

    new_wp06 = """WP-06: Pre-Validation Readiness Assessment & Phase 1C.5g Gate Auditor (Record 4)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the pre-flight readiness gatekeeper that verifies the candidate's eligibility for validation across the complete Eight Mandatory Readiness Prerequisites defined in Section 10.2 (incorporating all seven frozen Phase 1C.5g prerequisite gates) and calculates fixture coverage.
2. Architectural Binding:
   - Section 10: VALIDATION READINESS ASSESSMENT ARCHITECTURE (The Eight Mandatory Prerequisites).
   - Activity WF-03: Validation Readiness Assessment.
   - Table 04: Validation Workflow Matrix.
   - Table 12: Gate 8 Eligibility Matrix.
3. Inputs & Dependencies:
   - WP-05 (Version Binding), WP-03 (Intake), WP-08 (Fixture Corpus).
4. Technical Implementation Specification:
   - Implement `ReadinessAssessmentAuditor` auditing the complete EIGHT MANDATORY READINESS PREREQUISITES (Section 10.2):
     1. `Handoff Integrity`: The handoff package is verifiable, uncorrupted, and matches cryptographic reference;
     2. `All Seven Phase 1C.5g Gates Documented`: Gates 1 through 7 recorded as COMPLETE with sealed tokens:
        * Gate 1: `Structural Mapping Complete`
        * Gate 2: `Architectural Compatibility Verified`
        * Gate 3: `Provenance & Lineage Sealed`
        * Gate 4: `Shadow Execution Exercised`
        * Gate 5: `Differential Analysis Documented`
        * Gate 6: `Rollback Path Operational`
        * Gate 7: `Handoff Package Assembled`
     3. `Golden Fixture Availability`: Validated, uncontaminated golden fixtures matching declared scope exist, are accessible, and have verified payload integrity;
     4. `Execution Environment Stability`: Test environment, audio engine host, and target platform match the version binding;
     5. `Traceability Pipeline Active`: Phase 1C.5f RunTrace recorder is active and ready to log all validation executions;
     6. `Comparability Verified`: PATH-PROD and PATH-SHADOW execution harnesses are calibrated and comparable;
     7. `Rollback Staging Verified`: PATH-ROLLBACK staging is configured and verified for live reversion testing;
     8. `Absence of Unresolved Upstream Blockers`: No active critical defects or quarantine flags apply to scoped candidate units;
   - Governing Rule:
     `PRE-VALIDATION READINESS ENFORCES ALL EIGHT SECTION 10.2 PREREQUISITES, INCLUDING THE SEVEN FROZEN PHASE 1C.5g GATES.`
   - Populate `ValidationReadinessAssessmentRecord` (Record 4):
     * `evaluated_prerequisites`: Map of prerequisite name to evaluation result (`PASS | FAIL | BLOCKED`);
     * `fixture_coverage_ratio`: Proportion of scoped units with verified golden fixtures;
     * `readiness_outcome`: Canonical enum `READY | BLOCKED_NOT_EVALUABLE | READY_WITH_DECLARED_LIMITATIONS`;
     * `limitation_notes`: Array of explicit constraints when outcome is `READY_WITH_DECLARED_LIMITATIONS`;
     * `assessment_timestamp` and `assessor_id`.
5. Testable Deliverables:
   - `src/sound-engineer/validation/readiness/readinessAuditor.ts`
   - Test suite simulating missing 1C.5g gates, missing golden fixtures, uncalibrated environments, and partial readiness.
6. Acceptance Criteria:
   - Comprehensive audit of all 8 mandatory prerequisites from Section 10.2 with zero omitted checks.
   - Exact audit of the seven frozen Phase 1C.5g gate tokens with zero renamed gates.
   - `BLOCKED_NOT_EVALUABLE` outcome halts validation pipeline immediately before execution.
   - Canonical enum parity for Record 4 (`readiness_outcome: READY | BLOCKED_NOT_EVALUABLE | READY_WITH_DECLARED_LIMITATIONS`).
   - Detailed deficiency log generated for every unmet prerequisite.
7. Failure Modes & Mitigations:
   - Partial gate evidence: enforce strict schema validation on Phase 1C.5g gate tokens and halt pipeline."""

    assert old_wp06 in text, "old_wp06 not found"
    text = text.replace(old_wp06, new_wp06, 1)

    # 5. WP-07 Test Profile Applicability replacement
    old_wp07 = """WP-07: Test Profile Template Repository & Applicability Rules Engine (Record 7)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the repository of fourteen standardized, orthogonal `TestProfileRecord` templates and the rules engine that assigns them to validation cases based on gear topology.
2. Architectural Binding:
   - Section 13: TEST PROFILE ARCHITECTURE (The Exact Fourteen Profiles 01 to 14).
   - Activity WF-04: Test Profile & Dimension Selection.
   - Table 05: Test Profile Applicability Matrix.
3. Inputs & Dependencies:
   - WP-01 (Schemas), WP-04 (Scope).
4. Technical Implementation Specification:
   - Implement `TestProfileRepository` containing the fourteen frozen profile families:
     * PROFILE-01: STRUCTURAL / SCHEMA PROFILE
     * PROFILE-02: DETERMINISTIC PARAMETER PROFILE
     * PROFILE-03: TARGET-PLATFORM EXPORT PROFILE
     * PROFILE-04: OBJECTIVE ACOUSTIC PROFILE
     * PROFILE-05: DYNAMIC RESPONSE PROFILE
     * PROFILE-06: PERCEPTUAL LISTENING PROFILE
     * PROFILE-07: PLAYABILITY PROFILE
     * PROFILE-08: MIX-CONTEXT PROFILE
     * PROFILE-09: REGRESSION PROFILE
     * PROFILE-10: OPERATIONAL STABILITY PROFILE
     * PROFILE-11: ROLLBACK PROFILE
     * PROFILE-12: ADVERSARIAL / EDGE-CASE PROFILE
     * PROFILE-13: TRACEABILITY / GOVERNANCE PROFILE
     * PROFILE-14: USER-WORKFLOW / UAT PROFILE
   - Implement `ProfileApplicabilityEngine` mapping component classes (high-gain amp, optical compressor, tape echo) to required profiles.
5. Testable Deliverables:
   - `src/sound-engineer/validation/profiles/profileRepository.ts`
   - `src/sound-engineer/validation/profiles/applicabilityEngine.ts`
   - Unit tests verifying profile assignment logic.
6. Acceptance Criteria:
   - Exact adherence to the 14 frozen profile IDs and definitions.
   - Profiles are immutable objects with frozen tolerance profiles.
7. Failure Modes & Mitigations:
   - Unknown component class: defaults to comprehensive superset profile."""

    new_wp07 = """WP-07: Test Profile Template Repository & Applicability Rules Engine (Record 7)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the repository of fourteen standardized, orthogonal `TestProfileRecord` templates and the rules engine that assigns them to validation cases based on component class and operational domain, enforcing Section 13.2, Table 05, and Table 07 applicability rules.
2. Architectural Binding:
   - Section 13: TEST PROFILE ARCHITECTURE (The Exact Fourteen Profiles 01 to 14 with Declared Applicability).
   - Activity WF-04: Test Profile & Dimension Selection.
   - Table 05: Test Profile Applicability Matrix.
   - Table 07: Objective vs Perceptual Applicability Matrix.
3. Inputs & Dependencies:
   - WP-01 (Schemas), WP-04 (Scope).
4. Technical Implementation Specification:
   - Implement `TestProfileRepository` containing the fourteen frozen profile families with exact Focus and Applicability boundaries (Section 13.2 / Table 05):
     * PROFILE-01: STRUCTURAL / SCHEMA PROFILE (Applicability: Serialization, parameter remapping, catalog imports, configuration);
     * PROFILE-02: DETERMINISTIC PARAMETER PROFILE (Applicability: Deterministic transformation rules, gain-staging calculators, tone-stack math);
     * PROFILE-03: TARGET-PLATFORM EXPORT PROFILE (Applicability: Stage 12 platform translation, preset exporters, platform packaging);
     * PROFILE-04: OBJECTIVE ACOUSTIC PROFILE (Applicability: Amp models, cab emulations, EQ modules, analog saturation algorithms);
     * PROFILE-05: DYNAMIC RESPONSE PROFILE (Applicability: Overdrives, power-amp sag, compressor modules, gate logic);
     * PROFILE-06: PERCEPTUAL LISTENING PROFILE (Applicability: Complete guitar tones, cabinet IR selections, EQ curves, core sound engineering algorithms);
     * PROFILE-07: PLAYABILITY PROFILE (Applicability: Live guitar emulation, interactive DSP, real-time input conditioning);
     * PROFILE-08: MIX-CONTEXT PROFILE (Applicability: Final mix presets, studio mastering chains, multi-mic blend reasoning);
     * PROFILE-09: REGRESSION PROFILE (Applicability: All migrated components replacing existing legacy production heuristics);
     * PROFILE-10: OPERATIONAL STABILITY PROFILE (Applicability: Runtime DSP engine, background shadow execution pipelines, export batch services);
     * PROFILE-11: ROLLBACK PROFILE (Applicability: All production-cutover candidate deployments. Mandatory for Gate 8 consideration);
     * PROFILE-12: ADVERSARIAL / EDGE-CASE PROFILE (Applicability: All user-facing, platform-facing, or signal-intake modules);
     * PROFILE-13: TRACEABILITY / GOVERNANCE PROFILE (Applicability: All AI Sound Engineer reasoning runs; audit compliance verification);
     * PROFILE-14: USER-WORKFLOW / UAT PROFILE (Applicability: End-to-end Tone Translator user workflows, UI controls, preset discovery);
   - Implement `ProfileApplicabilityEngine`:
     * Enforce Table 05 mandatory vs optional profile assignments per subsystem type;
     * Enforce Table 07 Objective vs Perceptual Applicability Matrix, determining mandatory evidence classes based on the validation question;
     * Anti-universal-scorecard rule: reject arbitrary test assignment that ignores orthogonal domain boundaries;
   - Output `TestProfileRecord` (Record 7) instances bound to immutable tolerance profile references (`tolerance_criteria_spec`).
5. Testable Deliverables:
   - `src/sound-engineer/validation/profiles/profileRepository.ts`
   - `src/sound-engineer/validation/profiles/applicabilityEngine.ts`
   - Unit tests verifying profile assignment logic across all 14 profile families and Table 05/07 matrices.
6. Acceptance Criteria:
   - Exact adherence to the 14 frozen profile IDs, definitions, and declared applicability domains.
   - Enforces Table 07 objective vs perceptual requirements with zero violations.
   - Profiles are immutable objects with version-bound tolerance specifications.
7. Failure Modes & Mitigations:
   - Unknown component class: defaults to comprehensive superset profile."""

    assert old_wp07 in text, "old_wp07 not found"
    text = text.replace(old_wp07, new_wp07, 1)

    # 6. WP-08 Golden Fixture replacement
    old_wp08 = """WP-08: Golden Acoustic Fixture Corpus & Benchmark Stem Management (Record 8)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the storage, provenance verification, and lifecycle management engine for golden acoustic fixtures across the exact eight frozen Fixture Classes.
2. Architectural Binding:
   - Section 18: GOLDEN ACOUSTIC FIXTURE LIBRARY & BENCHMARK STEM MANAGEMENT.
   - Activity WF-05: Fixture Corpus Association.
   - Table 08: Fixture Governance Matrix.
   - Invariant 4: Golden Fixture Immutability & Independence Invariant.
3. Inputs & Dependencies:
   - WP-01 (Schemas), storage subsystem.
4. Technical Implementation Specification:
   - Implement `FixtureCorpusManager` cataloging fixtures across the exact eight frozen Fixture Classes:
     1. `DI Performance` (unprocessed direct-injection instrument stems);
     2. `Reference Tone` (curated commercial studio reference recordings);
     3. `Approved Preset` (verified target platform preset benchmarks);
     4. `Rendered Platform Benchmark` (pre-rendered reference platform audio output);
     5. `Synthetic Test Signal` (calibrated sine waves, log chirps, step pulses);
     6. `Multitrack Context` (isolated tracks within a multitrack arrangement);
     7. `Adversarial & Pathological` (clipped inputs, extreme dynamics, noisy stems);
     8. `Workflow & Prompt` (standardized user prompt sets for UAT workflows).
   - Governing Rule:
     `CONTENT EXAMPLES DO NOT REPLACE THE FROZEN FIXTURE TAXONOMY.`
     (Illustrative stem examples such as clean chords, crunch riffs, high-gain leads, bass lines, acoustic guitars, and calibration chirps exist beneath their respective frozen fixture classes).
   - Verify uncompressed PCM audio;
   - Store and verify `payload_integrity_ref` via `integrity_provider`;
   - Verify complete chain-of-custody provenance;
   - Generate `ValidationFixtureRecord` (Record 8);
   - Implement anti-contamination lock preventing test code from modifying fixture files.
5. Testable Deliverables:
   - `src/sound-engineer/validation/fixtures/fixtureManager.ts`
   - Fixture manifest verification CLI tool.
   - Test suite testing corrupt audio headers, modified audio bits, and missing provenance.
6. Acceptance Criteria:
   - Strict taxonomy compliance with the 8 frozen Fixture Classes.
   - Rejection of any audio file with modified bits or missing provenance.
   - Read-only filesystem permissions enforced at container mount.
7. Failure Modes & Mitigations:
   - Storage corruption: automated integrity verification before every test execution run."""

    new_wp08 = """WP-08: Golden Acoustic Fixture Corpus & Benchmark Stem Management (Record 8)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the storage, provenance verification, declared applicability scope enforcement, and lifecycle management engine for golden acoustic fixtures across the exact eight frozen Fixture Classes.
2. Architectural Binding:
   - Section 18: GOLDEN ACOUSTIC FIXTURE LIBRARY & BENCHMARK STEM MANAGEMENT.
   - Activity WF-05: Fixture Corpus Association.
   - Table 08: Fixture Governance Matrix.
   - Invariant 4: Golden Fixture Immutability & Independence Invariant.
3. Inputs & Dependencies:
   - WP-01 (Schemas), storage subsystem.
4. Technical Implementation Specification:
   - Implement `FixtureCorpusManager` cataloging fixtures across the exact eight frozen Fixture Classes:
     1. `DI Performance` (unprocessed direct-injection instrument stems);
     2. `Reference Tone` (curated studio reference recordings with governed provenance);
     3. `Approved Preset` (verified target platform preset benchmarks);
     4. `Rendered Platform Benchmark` (pre-rendered reference platform audio output);
     5. `Synthetic Test Signal` (calibrated sine waves, log chirps, step pulses);
     6. `Multitrack Context` (isolated tracks within a multitrack arrangement);
     7. `Adversarial & Pathological` (clipped inputs, extreme dynamics, noisy stems);
     8. `Workflow & Prompt` (standardized user prompt sets for UAT workflows).
   - Enforce explicit `declared_applicability_scope` on every `ValidationFixtureRecord` (Record 8), prohibiting off-label use of fixtures outside their calibrated domain;
   - Enforce canonical enum states on Record 8:
     * `contamination_status: CLEAN | CONTAMINATED | SUSPECT`
     * `lifecycle_status: ACTIVE | SUPERSEDED | INVALIDATED | RETIRED`
   - Enforce anti-contamination protocol:
     * Read-only container mount;
     * Immediate invalidation of validation cases using fixtures flagged `CONTAMINATED` or `SUSPECT`;
   - Governing Rule:
     `CONTENT EXAMPLES DO NOT REPLACE THE FROZEN FIXTURE TAXONOMY.`
     (Illustrative stem examples such as clean chords, crunch riffs, high-gain leads, bass lines, acoustic guitars, and calibration chirps exist beneath their respective frozen fixture classes).
   - Verify uncompressed PCM audio;
   - Store and verify `payload_integrity_ref` via `integrity_provider`;
   - Verify complete chain-of-custody provenance;
   - Generate `ValidationFixtureRecord` (Record 8).
5. Testable Deliverables:
   - `src/sound-engineer/validation/fixtures/fixtureManager.ts`
   - Fixture manifest verification CLI tool.
   - Test suite testing corrupt audio headers, modified audio bits, off-scope fixture rejection, and contamination handling.
6. Acceptance Criteria:
   - Strict taxonomy compliance with the 8 frozen Fixture Classes.
   - Explicit `declared_applicability_scope` enforced for every fixture.
   - Canonical enum parity for Record 8 (`contamination_status` and `lifecycle_status`).
   - Rejection of any audio file with modified bits, missing provenance, or contamination flag.
   - Read-only filesystem permissions enforced at container mount.
7. Failure Modes & Mitigations:
   - Storage corruption: automated integrity verification before every test execution run."""

    assert old_wp08 in text, "old_wp08 not found"
    text = text.replace(old_wp08, new_wp08, 1)

    # 7. WP-19 Historical Immutability replacement
    old_wp19 = """WP-19: Governed Validation Outcome Synthesis & Decision Engine (Record 17)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the outcome synthesis engine that aggregates all evidence, regressions, conflicts, and uncertainties into a governed `ValidationOutcomeRecord`.
2. Architectural Binding:
   - Section 23: VALIDATION OUTCOME ARCHITECTURE.
   - Table 11: Validation Outcome Matrix.
   - Table 04: Validation Workflow Matrix.
3. Inputs & Dependencies:
   - WP-11, WP-12, WP-13, WP-15, WP-17, WP-18.
4. Technical Implementation Specification:
   - Implement `ValidationOutcomeSynthesizer`:
     * Evaluate outcome rules matching Table 11:
       - PASS: All required cases executed, objective tolerances met, perceptual panel approved, zero unresolved material genuine regressions within scope. (Eligible for Gate 8 adjudication; does not grant cutover automatically).
       - FAIL: Unresolved material genuine regression, severe objective breach, or perceptual failure. (Ineligible for Gate 8; triggers defect remand).
       - BLOCKED: Pre-requisite missing, fixture invalid, environment crash, test harness failure. (Testing halted).
       - CONDITIONAL: Non-critical deviations, minor cosmetic shifts, or acceptable low risks with compensating controls. (Eligible for conditional Gate 8 review).
     * Link evidence via canonical `EVIDENCED_BY` edge: `ValidationOutcomeRecord -> ObjectiveEvidenceRecord | PerceptualEvaluationRecord`;
     * Produce `ValidationOutcomeRecord` (Record 17);
     * Bind immutably to package ID and version binding ID.
5. Testable Deliverables:
   - `src/sound-engineer/validation/outcome/outcomeSynthesizer.ts`
   - Test suite covering PASS, FAIL, BLOCKED, and CONDITIONAL outcome synthesis.
6. Acceptance Criteria:
   - PASS requires 0 unresolved material genuine regressions within scope.
   - Complete summary verdict with objective, perceptual, UAT, and regression breakdowns.
   - Canonical `EVIDENCED_BY` endpoint conformance.
7. Failure Modes & Mitigations:
   - Premature PASS: automated validator checks that all package cases are accounted for."""

    new_wp19 = """WP-19: Governed Validation Outcome Synthesis & Decision Engine (Record 17)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the outcome synthesis engine that aggregates all evidence, regressions, conflicts, and uncertainties into a governed `ValidationOutcomeRecord`, enforcing strict historical outcome immutability and stale-applicability graph semantics.
2. Architectural Binding:
   - Section 23: VALIDATION OUTCOME ARCHITECTURE.
   - Table 11: Validation Outcome Matrix.
   - Table 04: Validation Workflow Matrix.
3. Inputs & Dependencies:
   - WP-11, WP-12, WP-13, WP-15, WP-17, WP-18.
4. Technical Implementation Specification:
   - Implement `ValidationOutcomeSynthesizer`:
     * Evaluate outcome rules matching Table 11:
       - PASS: All required cases executed, objective tolerances met, perceptual panel approved, zero unresolved material genuine regressions within scope. (Eligible for Gate 8 adjudication; does not grant cutover automatically).
       - FAIL: Unresolved material genuine regression, severe objective breach, or perceptual failure. (Ineligible for Gate 8; triggers defect remand).
       - BLOCKED: Pre-requisite missing, fixture invalid, environment crash, test harness failure. (Testing halted).
       - CONDITIONAL: Non-critical deviations, minor cosmetic shifts, or acceptable low risks with compensating controls. (Eligible for conditional Gate 8 review).
     * Enforce strict canonical `outcome_class` enum: `PASS | FAIL | BLOCKED | CONDITIONAL`;
     * Historical Outcome Immutability & Stale Applicability Rule:
       - Historical `ValidationOutcomeRecord` instances are cryptographically sealed in the audit ledger and are STRICTLY IMMUTABLE;
       - An outcome record's `outcome_class` is NEVER mutated to `INVALIDATED` or altered post-creation;
       - When upstream changes occur, prior outcomes become stale for current applicability through incoming `INVALIDATED_BY` relationship edges: `ValidationOutcomeRecord -> RevalidationTriggerRecord`;
       - Current applicability is evaluated dynamically via graph lineage query (`isApplicableForCurrentBinding(outcomeRecord)`), NOT by destructive record mutation;
     * Link evidence via canonical `EVIDENCED_BY` edge: `ValidationOutcomeRecord -> ObjectiveEvidenceRecord | PerceptualEvaluationRecord`;
     * Produce `ValidationOutcomeRecord` (Record 17);
     * Bind immutably to package ID and version binding ID.
5. Testable Deliverables:
   - `src/sound-engineer/validation/outcome/outcomeSynthesizer.ts`
   - Test suite covering PASS, FAIL, BLOCKED, and CONDITIONAL outcome synthesis and asserting historical record immutability under revalidation.
6. Acceptance Criteria:
   - PASS requires 0 unresolved material genuine regressions within scope.
   - Strict adherence to the four canonical `outcome_class` enums with zero invented statuses (no `INVALIDATED` status).
   - Historical outcome immutability enforced across all revalidation events.
   - Complete summary verdict with objective, perceptual, UAT, and regression breakdowns.
   - Canonical `EVIDENCED_BY` endpoint conformance.
7. Failure Modes & Mitigations:
   - Premature PASS: automated validator checks that all package cases are accounted for."""

    assert old_wp19 in text, "old_wp19 not found"
    text = text.replace(old_wp19, new_wp19, 1)

    # 8. WP-20 Revalidation Trigger & Retest Planning replacement
    old_wp20 = """WP-20: Revalidation Trigger Detection & Targeted Retest Planning (Records 18, 19)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the change-detection engine that monitors system layers for material changes across the ten frozen revalidation triggers and constructs targeted `RetestPlanRecord` instances preserving valid audit lineage.
2. Architectural Binding:
   - Section 24: RETEST & REVALIDATION ARCHITECTURE.
   - Table 14: Revalidation Trigger Matrix (Exact Triggers 01 to 10).
3. Inputs & Dependencies:
   - WP-05 (Version Binding), WP-19 (Outcomes).
4. Technical Implementation Specification:
   - Implement `RevalidationTriggerDetector` monitoring the ten frozen triggers:
     * TRIGGER-01: Upstream reasoning architecture or prompt template update
     * TRIGGER-02: Deterministic heuristic rule, parameter clamp, or table update
     * TRIGGER-03: Gear definition catalog or gear alias update
     * TRIGGER-04: Target-platform parameter manifest or exporter serialization update
     * TRIGGER-05: Target-platform version update or host OS runtime update
     * TRIGGER-06: Golden Acoustic Fixture update, recalibration, or contamination invalidation
     * TRIGGER-07: Runtime execution engine, audio driver, or DSP core codebase update
     * TRIGGER-08: PATH-ROLLBACK mechanism or operational deployment logic update
     * TRIGGER-09: Approval and promotion of a new Candidate Lesson affecting the subject domain
     * TRIGGER-10: Production quality telemetry reporting a significant anomaly or defect spike
   - Link invalidation via canonical `INVALIDATED_BY` edge:
     `ValidationOutcomeRecord | AdoptionDecisionRecord -> RevalidationTriggerRecord`;
   - Generate `RevalidationTriggerRecord` (Record 18);
   - Implement `RetestPlanner`:
     * Link retest requirement via canonical `REQUIRES_RETEST` edge:
       `RevalidationTriggerRecord -> RetestPlanRecord`;
     * Preserve intact historical evidence; link retests via canonical `SUPERSEDES_VALIDATION` edge:
       `ValidationExecutionRecord -> ValidationExecutionRecord`;
     * Generate `RetestPlanRecord` (Record 19).
5. Testable Deliverables:
   - `src/sound-engineer/validation/retest/triggerDetector.ts`
   - `src/sound-engineer/validation/retest/retestPlanner.ts`
   - Test suite simulating triggers and retest plan generation.
6. Acceptance Criteria:
   - Exact mapping to the 10 frozen triggers.
   - Canonical `INVALIDATED_BY`, `REQUIRES_RETEST`, and `SUPERSEDES_VALIDATION` endpoint conformance.
   - Targeted retest scope isolation without historical record mutation.
7. Failure Modes & Mitigations:
   - Cascading invalidation: explicit dependency graph tracing to prevent over-invalidation."""

    new_wp20 = """WP-20: Revalidation Trigger Detection & Targeted Retest Planning (Records 18, 19)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the change-detection engine that monitors system layers for material changes across the ten frozen revalidation triggers and constructs targeted `RetestPlanRecord` instances, modeling stale applicability via relationship edges while preserving historical audit records strictly immutable.
2. Architectural Binding:
   - Section 24: RETEST & REVALIDATION ARCHITECTURE.
   - Table 14: Revalidation Trigger Matrix (Exact Triggers 01 to 10).
3. Inputs & Dependencies:
   - WP-05 (Version Binding), WP-19 (Outcomes).
4. Technical Implementation Specification:
   - Implement `RevalidationTriggerDetector` monitoring the ten frozen triggers:
     * TRIGGER-01: Upstream reasoning architecture or prompt template update
     * TRIGGER-02: Deterministic heuristic rule, parameter clamp, or table update
     * TRIGGER-03: Gear definition catalog or gear alias update
     * TRIGGER-04: Target-platform parameter manifest or exporter serialization update
     * TRIGGER-05: Target-platform version update or host OS runtime update
     * TRIGGER-06: Golden Acoustic Fixture update, recalibration, or contamination invalidation
     * TRIGGER-07: Runtime execution engine, audio driver, or DSP core codebase update
     * TRIGGER-08: PATH-ROLLBACK mechanism or operational deployment logic update
     * TRIGGER-09: Approval and promotion of a new Candidate Lesson affecting the subject domain
     * TRIGGER-10: Production quality telemetry reporting a significant anomaly or defect spike
   - Link invalidation via canonical `INVALIDATED_BY` edge:
     `ValidationOutcomeRecord | AdoptionDecisionRecord -> RevalidationTriggerRecord`;
   - Enforce that prior records are marked stale for current applicability via graph linkage without mutating historical record contents;
   - Generate `RevalidationTriggerRecord` (Record 18) with canonical `required_action: NO_ACTION | PARTIAL_RETEST | FULL_RETEST | SUSPEND_GATE_8`;
   - Implement `RetestPlanner`:
     * Link retest requirement via canonical `REQUIRES_RETEST` edge:
       `RevalidationTriggerRecord -> RetestPlanRecord`;
     * Preserve intact historical evidence; link retests via canonical `SUPERSEDES_VALIDATION` edge:
       `ValidationExecutionRecord -> ValidationExecutionRecord`;
     * Generate `RetestPlanRecord` (Record 19).
5. Testable Deliverables:
   - `src/sound-engineer/validation/retest/triggerDetector.ts`
   - `src/sound-engineer/validation/retest/retestPlanner.ts`
   - Test suite simulating triggers, verifying zero mutation of historical records, and asserting retest plan generation.
6. Acceptance Criteria:
   - Exact mapping to the 10 frozen triggers.
   - Canonical `INVALIDATED_BY`, `REQUIRES_RETEST`, and `SUPERSEDES_VALIDATION` endpoint conformance.
   - Targeted retest scope isolation without historical record mutation.
   - Canonical enum parity for Record 18 (`required_action`).
7. Failure Modes & Mitigations:
   - Cascading invalidation: explicit dependency graph tracing to prevent over-invalidation."""

    assert old_wp20 in text, "old_wp20 not found"
    text = text.replace(old_wp20, new_wp20, 1)

    # 9. WP-21 Four-Pillar Production Readiness Assessment replacement
    old_wp21 = """WP-21: Four-Pillar Production Readiness Assessment Synthesis (Record 20)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the pre-Gate-8 readiness evaluation engine synthesizing the Four Pillars of Production Readiness and checking for the exact eight frozen Hard Blockers.
2. Architectural Binding:
   - Section 25: PRODUCTION READINESS ASSESSMENT ARCHITECTURE.
   - Section 25.3: Hard Blockers to Gate 8 Consideration.
   - Activity WF-15: Production-Readiness Synthesis.
   - Table 12: Gate 8 Eligibility Matrix.
   - Table 13: Hard Blocker Matrix.
3. Inputs & Dependencies:
   - WP-14, WP-15, WP-19, WP-27 (Rollback Verification).
4. Technical Implementation Specification:
   - Implement `ProductionReadinessSynthesizer`:
     * Evaluate PILLAR 1: Acoustic & Musical Readiness (Signals, Listening, Playability, Defects);
     * Evaluate PILLAR 2: Reasoning & Governance Readiness (Stages 01-14, 21 Principles, Explainability, Quarantined Lessons);
     * Evaluate PILLAR 3: Platform & Operational Readiness (Target export, parameter bounds, resource budgets);
     * Evaluate PILLAR 4: Rollback & Production-Safety Readiness (Isolation, zero unresolved material genuine regressions, verified automated rollback, telemetry stop criteria);
     * Check for the EXACT EIGHT FROZEN HARD BLOCKERS (Section 25.3 & Table 13):
       1. Any unresolved material genuine regression within the requested authorization scope;
       2. Any target-platform preset export failure, crash, or serialization corruption;
       3. Failure or unverified state of automated rollback (PATH-ROLLBACK);
       4. Missing, broken, or unverifiable Phase 1C.5f provenance / traceability records;
       5. Contaminated, miscalibrated, or missing Golden test fixtures;
       6. Requested authorization scope broader than the actually tested scope;
       7. Unresolved critical uncertainty regarding production tone safety;
       8. Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g;
   - Governing Rule:
     `THE PRODUCTION READINESS ENGINE MUST IMPLEMENT THE FROZEN HARD BLOCKERS, NOT AN IMPLEMENTATION-DERI1003: - Generate `ProductionReadinessAssessmentRecord` (Record 20) with `gate_8_eligible: boolean`.
5. Testable Deliverables:
   - `src/sound-engineer/validation/readiness/readinessSynthesizer.ts`
   - Test suite asserting disqualification against all eight frozen Hard Blockers independently.
6. Acceptance Criteria:
   - Immediate disqualification if ANY of the eight frozen Hard Blockers is present.
   - Every pillar requires explicit evidence reference, not synthetic aggregate score.
7. Failure Modes & Mitigations:
   - Incomplete pillar assessment: gatekeeper blocks presentation to Gate 8 without 4/4 pillars evaluated."""

    # Note: check exact text in v0.1b for WP-21
    pos_21 = text.find("WP-21: Four-Pillar Production Readiness Assessment Synthesis (Record 20)")
    pos_22 = text.find("WP-22: Gate 8 Production Cutover Adjudication & Scoped Authorization (Record 21)")
    wp21_existing = text[pos_21:pos_22]

    new_wp21 = """WP-21: Four-Pillar Production Readiness Assessment Synthesis (Record 20)
--------------------------------------------------------------------------------
1. Objective & Scope:
   Implement the pre-Gate-8 readiness evaluation engine synthesizing the Four Pillars of Production Readiness, auditing for the exact eight frozen Hard Blockers, and evaluating strict boolean Gate 8 eligibility.
2. Architectural Binding:
   - Section 25: PRODUCTION READINESS ASSESSMENT ARCHITECTURE.
   - Section 25.3: Hard Blockers to Gate 8 Consideration.
   - Activity WF-15: Production-Readiness Synthesis.
   - Table 12: Gate 8 Eligibility Matrix.
   - Table 13: Hard Blocker Matrix.
3. Inputs & Dependencies:
   - WP-14, WP-15, WP-19, WP-27 (Rollback Verification).
4. Technical Implementation Specification:
   - Implement `ProductionReadinessSynthesizer`:
     * Evaluate PILLAR 1: Acoustic & Musical Readiness (`acoustic_musical_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`);
     * Evaluate PILLAR 2: Reasoning & Governance Readiness (`reasoning_governance_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`);
     * Evaluate PILLAR 3: Platform & Operational Readiness (`platform_operational_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`);
     * Evaluate PILLAR 4: Rollback & Production-Safety Readiness (`rollback_safety_readiness: SATISFIED | DEFICIENT | INCONCLUSIVE`);
     * Check for the EXACT EIGHT FROZEN HARD BLOCKERS (Section 25.3 & Table 13):
       1. Any unresolved material genuine regression within the requested authorization scope;
       2. Any target-platform preset export failure, crash, or serialization corruption;
       3. Failure or unverified state of automated rollback (PATH-ROLLBACK);
       4. Missing, broken, or unverifiable Phase 1C.5f provenance / traceability records;
       5. Contaminated, miscalibrated, or missing Golden test fixtures;
       6. Requested authorization scope broader than the actually tested scope;
       7. Unresolved critical uncertainty regarding production tone safety;
       8. Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g;
     * Compute `gate_8_eligible: boolean`:
       Strict boolean rule: `gate_8_eligible === true` IF AND ONLY IF all four pillars evaluate to `SATISFIED` AND `hard_blockers_present.length === 0`;
     * Populate `ProductionReadinessAssessmentRecord` (Record 20):
       - `readiness_assessment_id: string`
       - `package_id: string`
       - `pillar_evaluations` (four canonical evaluations)
       - `hard_blockers_present: string[]`
       - `gate_8_eligible: boolean`
       - `synthesis_rationale: string`
       - `assessment_timestamp: string`
   - Governing Rule:
     `THE PRODUCTION READINESS ENGINE MUST IMPLEMENT THE FROZEN HARD BLOCKERS, NOT AN IMPLEMENTATION-DERIVED SUBSET.`
5. Testable Deliverables:
   - `src/sound-engineer/validation/readiness/readinessSynthesizer.ts`
   - Test suite asserting disqualification against all eight frozen Hard Blockers independently and verifying strict 4/4 SATISFIED requirement for `gate_8_eligible`.
6. Acceptance Criteria:
   - Canonical enum parity for Record 20 (`SATISFIED | DEFICIENT | INCONCLUSIVE` per pillar).
   - Immediate disqualification (`gate_8_eligible = false`) if ANY of the eight frozen Hard Blockers is present or if ANY pillar is not `SATISFIED`.
   - Every pillar requires explicit evidence reference, not synthetic aggregate score.
7. Failure Modes & Mitigations:
   - Incomplete pillar assessment: gatekeeper blocks presentation to Gate 8 without 4/4 pillars evaluated.
================================================================================
"""
    text = text[:pos_21] + new_wp21 + text[pos_22:]

    # 10. Section 9 table replacements
    old_s9_table = """| WP-01  | schemas/records.ts, schemas/enums.ts     | 100% field parity with Section 33; Zod strict parse| npm test -- src/sound-engineer/validation/schemas/         |
| WP-02  | graph/relationshipGraph.ts, ledger.ts    | Exactly 14 frozen edges with canonical endpoints   | npm test -- src/sound-engineer/validation/graph/           |
| WP-03  | intake/intakeService.ts                  | INTAKE_ACCEPTED / INTAKE_REJECTED enum parity      | npm test -- src/sound-engineer/validation/intake/          |
| WP-04  | scope/scopeManager.ts, scopeEnforcer.ts  | Blocks out-of-scope test cases; enforces boundaries| npm test -- src/sound-engineer/validation/scope/           |
| WP-05  | binding/versionBindingService.ts         | Composite hash across full frozen dependency set   | npm test -- src/sound-engineer/validation/binding/         |
| WP-06  | readiness/readinessAuditor.ts            | Audits 7 frozen 1C.5g gates; halts on unverified   | npm test -- src/sound-engineer/validation/readiness/       |
| WP-07  | profiles/profileRepository.ts, engine.ts | 14 frozen profiles; correct gear family mapping    | npm test -- src/sound-engineer/validation/profiles/        |
| WP-08  | fixtures/fixtureManager.ts, manifest     | 8 frozen fixture classes; payload integrity audit  | npm test -- src/sound-engineer/validation/fixtures/        |
| WP-09  | cases/caseBuilder.ts, packageComposer.ts | Bounded falsifiable cases; BOUND_TO & VALIDATES    | npm test -- src/sound-engineer/validation/cases/           |
| WP-10  | execution/executionRunner.ts, sandbox.ts | Sandboxed sub-process; TESTED_WITH to fixtures     | npm test -- src/sound-engineer/validation/execution/       |
| WP-11  | evidence/objectiveMeasurementEngine.ts   | Precision governed by measurement_precision_profile| npm test -- src/sound-engineer/validation/evidence/obj     |
| WP-12  | evidence/perceptualListeningHarness.ts   | Double-blind stimulus; EVALUATED_BY & EVIDENCED_BY | npm test -- src/sound-engineer/validation/evidence/percep  |
| WP-13  | evidence/uatEvaluationEngine.ts          | 4 canonical personas; Section 17.3 enum parity     | npm test -- src/sound-engineer/validation/evidence/uat     |
| WP-14  | evaluation/acousticSynthesizer.ts        | Orthogonal evaluation; anti-scalar collapse        | npm test -- src/sound-engineer/validation/evaluation/      |
| WP-15  | regression/differentialAuditor.ts        | Tripartite comparison; COMPARED_AGAINST edge       | npm test -- src/sound-engineer/validation/regression/      |
| WP-16  | attribution/failureAttributionEngine.ts  | 9 attribution classes; REMANDS_TO edge to Table 17 | npm test -- src/sound-engineer/validation/attribution/     |
| WP-17  | conflicts/conflictDetector.ts            | Explicit conflict logging; CONFLICTS_WITH edge     | npm test -- src/sound-engineer/validation/conflicts/       |
| WP-18  | uncertainty/uncertaintyManager.ts        | UNCERTAIN_OF edge; Gate 8 impact determination     | npm test -- src/sound-engineer/validation/uncertainty/     |
| WP-19  | outcome/outcomeSynthesizer.ts            | Table 11 parity; EVIDENCED_BY edge; 0 material regr| npm test -- src/sound-engineer/validation/outcome/         |
| WP-20  | retest/triggerDetector.ts, planner.ts    | 10 triggers; INVALIDATED_BY & REQUIRES_RETEST edges| npm test -- src/sound-engineer/validation/retest/          |
| WP-21  | readiness/readinessSynthesizer.ts        | 4 pillars evaluated; all 8 frozen Hard Blockers    | npm test -- src/sound-engineer/validation/readiness/four   |"""

    new_s9_table = """| WP-01  | schemas/records.ts, schemas/enums.ts     | 100% field parity with Section 33; Records 1-22 Zod| npm test -- src/sound-engineer/validation/schemas/         |
| WP-02  | graph/relationshipGraph.ts, ledger.ts    | 14 frozen edges; DAG traversal & symmetric conflict| npm test -- src/sound-engineer/validation/graph/           |
| WP-03  | intake/intakeService.ts                  | INTAKE_ACCEPTED / INTAKE_REJECTED enum parity      | npm test -- src/sound-engineer/validation/intake/          |
| WP-04  | scope/scopeManager.ts, scopeEnforcer.ts  | Blocks out-of-scope test cases; enforces boundaries| npm test -- src/sound-engineer/validation/scope/           |
| WP-05  | binding/versionBindingService.ts         | Composite hash across full frozen dependency set   | npm test -- src/sound-engineer/validation/binding/         |
| WP-06  | readiness/readinessAuditor.ts            | Audits 8 Sec 10.2 prereqs (incl 7 gates); Record 4 | npm test -- src/sound-engineer/validation/readiness/       |
| WP-07  | profiles/profileRepository.ts, engine.ts | 14 frozen profiles; Table 05 & 07 applicability    | npm test -- src/sound-engineer/validation/profiles/        |
| WP-08  | fixtures/fixtureManager.ts, manifest     | 8 fixture classes; declared scopes; clean/contam   | npm test -- src/sound-engineer/validation/fixtures/        |
| WP-09  | cases/caseBuilder.ts, packageComposer.ts | Bounded falsifiable cases; BOUND_TO & VALIDATES    | npm test -- src/sound-engineer/validation/cases/           |
| WP-10  | execution/executionRunner.ts, sandbox.ts | Sandboxed sub-process; TESTED_WITH to fixtures     | npm test -- src/sound-engineer/validation/execution/       |
| WP-11  | evidence/objectiveMeasurementEngine.ts   | Precision governed by measurement_precision_profile| npm test -- src/sound-engineer/validation/evidence/obj     |
| WP-12  | evidence/perceptualListeningHarness.ts   | Double-blind stimulus; EVALUATED_BY & EVIDENCED_BY | npm test -- src/sound-engineer/validation/evidence/percep  |
| WP-13  | evidence/uatEvaluationEngine.ts          | 4 canonical personas; Section 17.3 enum parity     | npm test -- src/sound-engineer/validation/evidence/uat     |
| WP-14  | evaluation/acousticSynthesizer.ts        | Orthogonal evaluation; anti-scalar collapse        | npm test -- src/sound-engineer/validation/evaluation/      |
| WP-15  | regression/differentialAuditor.ts        | Tripartite comparison; COMPARED_AGAINST edge       | npm test -- src/sound-engineer/validation/regression/      |
| WP-16  | attribution/failureAttributionEngine.ts  | 9 attribution classes; REMANDS_TO edge to Table 17 | npm test -- src/sound-engineer/validation/attribution/     |
| WP-17  | conflicts/conflictDetector.ts            | Explicit conflict logging; CONFLICTS_WITH edge     | npm test -- src/sound-engineer/validation/conflicts/       |
| WP-18  | uncertainty/uncertaintyManager.ts        | UNCERTAIN_OF edge; Gate 8 impact determination     | npm test -- src/sound-engineer/validation/uncertainty/     |
| WP-19  | outcome/outcomeSynthesizer.ts            | Table 11 parity; historical outcome immutability   | npm test -- src/sound-engineer/validation/outcome/         |
| WP-20  | retest/triggerDetector.ts, planner.ts    | 10 triggers; INVALIDATED_BY edge; 0 record mutation| npm test -- src/sound-engineer/validation/retest/          |
| WP-21  | readiness/readinessSynthesizer.ts        | 4 pillars (SATISFIED); 8 Hard Blockers; eligible   | npm test -- src/sound-engineer/validation/readiness/four   |"""

    assert old_s9_table in text, "old_s9_table not found"
    text = text.replace(old_s9_table, new_s9_table, 1)

    # 11. Section 11 Document Control & Revision Register replacement
    old_s11 = """| v0.1b   | 2026-10-13   | Lead Sound Architect  | Residual Frozen-Semantics & Canonical Contract Fidelity        |
|         |              | & Validation Engineer | Correction. Applies a narrowly bounded residual fidelity       |
|         |              |                       | correction to v0.1a without altering the Phase 1C.5h           |
|         |              |                       | implementation programme structure. Restores exact endpoint    |
|         |              |                       | semantics for all fourteen frozen relationship edges and       |
|         |              |                       | propagates those semantics through dependent Work Packages;    |
|         |              |                       | restores the exact seven Phase 1C.5g Gate names in WP-06;      |
|         |              |                       | restores the exact eight frozen Fixture Classes in WP-08;      |
|         |              |                       | restores canonical ValidationIntakeRecord intake_status        |
|         |              |                       | values; restores the complete eight-item frozen Gate 8 Hard    |
|         |              |                       | Blocker model in WP-21; removes stale and incorrect            |
|         |              |                       | constitutional invariant references in WP-17 and WP-26 and     |
|         |              |                       | audits all invariant references; removes the incorrect         |
|         |              |                       | seven-layer version-binding claim; and corrects WP-31 wording   |
|         |              |                       | to distinguish the Ten Constitutional Invariants from the      |
|         |              |                       | twenty-point Design Mandate compliance checklist. No frozen    |
|         |              |                       | architecture, threshold-neutrality work, MVVI design,          |
|         |              |                       | programme sequencing, milestone structure, Work Package        |
|         |              |                       | structure, or authority boundary is changed.                   |
|         |              |                       | Status: DRAFT — IMPLEMENTATION PLANNING.                       |
+---------+--------------+-----------------------+----------------------------------------------------------------+
11.2 Architectural Status Declaration
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1b — Residual Frozen-Semantics & Canonical Contract Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1a.txt [Preserved Unchanged]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
Status: DRAFT — IMPLEMENTATION PLANNING
Authority Level: Authoritative Implementation & Engineering Programme Specification (Draft Status — Subject to Formal Review and Adoption)
DECLARATION:
This DRAFT Implementation & Build Plan is the current proposed engineering programme specification for Phase 1C.5h and remains subject to implementation-plan review and formal adoption.
ALL SUBSYSTEM BUILDS, CODE MODULES, TEST HARNESSES, AND VALIDATION PIPELINES MUST EXECUTE IN STRICT COMPLIANCE WITH THE SEQUENCING, WORK PACKAGES, AND ACCEPTANCE CRITERIA HEREIN.
================================================================================
END OF IMPLEMENTATION PLAN: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt
================================================================================"""

    new_s11 = """| v0.1b   | 2026-10-13   | Lead Sound Architect  | Residual Frozen-Semantics & Canonical Contract Fidelity        |
|         |              | & Validation Engineer | Correction. Applies a narrowly bounded residual fidelity       |
|         |              |                       | correction to v0.1a without altering the Phase 1C.5h           |
|         |              |                       | implementation programme structure. Restores exact endpoint    |
|         |              |                       | semantics for all fourteen frozen relationship edges and       |
|         |              |                       | propagates those semantics through dependent Work Packages;    |
|         |              |                       | restores the exact seven Phase 1C.5g Gate names in WP-06;      |
|         |              |                       | restores the exact eight frozen Fixture Classes in WP-08;      |
|         |              |                       | restores canonical ValidationIntakeRecord intake_status        |
|         |              |                       | values; restores the complete eight-item frozen Gate 8 Hard    |
|         |              |                       | Blocker model in WP-21; removes stale and incorrect            |
|         |              |                       | constitutional invariant references in WP-17 and WP-26 and     |
|         |              |                       | audits all invariant references; removes the incorrect         |
|         |              |                       | seven-layer version-binding claim; and corrects WP-31 wording   |
|         |              |                       | to distinguish the Ten Constitutional Invariants from the      |
|         |              |                       | twenty-point Design Mandate compliance checklist.              |
|         |              |                       | [SUPERSEDED BY v0.1c — DRAFT IMPLEMENTATION PLAN]              |
+---------+--------------+-----------------------+----------------------------------------------------------------+
| v0.1c   | 2026-10-13   | Lead Sound Architect  | Final Readiness, Applicability & Graph-Implementation          |
|         |              | & Validation Engineer | Fidelity Correction. Applies a narrowly bounded final          |
|         |              |                       | implementation-contract fidelity correction to v0.1b without    |
|         |              |                       | altering the Phase 1C.5h implementation programme structure,   |
|         |              |                       | tracks, milestones, or work package count. Resolves five       |
|         |              |                       | residual defects discovered during formal review:              |
|         |              |                       | (1) Pre-Validation Readiness & Schema Parity: Restores the     |
|         |              |                       | complete Eight Mandatory Readiness Prerequisites in WP-06      |
|         |              |                       | matching Section 10.2 (Handoff Integrity, All 7 1C.5g Gates,   |
|         |              |                       | Golden Fixture Availability, Environment Stability, RunTrace   |
|         |              |                       | Active, Comparability Verified, Rollback Staging Verified,     |
|         |              |                       | and Absence of Upstream Blockers), and establishes canonical   |
|         |              |                       | enum parity for ValidationReadinessAssessmentRecord (Record 4);|
|         |              |                       | (2) Production Readiness Four-Pillar Schema Parity: Establishes|
|         |              |                       | canonical schema and enum parity for Record 20 in WP-01 and    |
|         |              |                       | WP-21 across the four pillars (SATISFIED | DEFICIENT |         |
|         |              |                       | INCONCLUSIVE), audits all eight frozen Hard Blockers, and      |
|         |              |                       | enforces strict boolean gate_8_eligible evaluation;            |
|         |              |                       | (3) Historical Immutability & Stale Applicability Linkage:     |
|         |              |                       | Enforces that historical ValidationOutcomeRecords are strictly |
|         |              |                       | immutable and never mutated to INVALIDATED, with stale         |
|         |              |                       | applicability modeled exclusively via incoming INVALIDATED_BY  |
|         |              |                       | relationship edges in WP-19, WP-20, and WP-24;                 |
|         |              |                       | (4) Profile & Fixture Applicability Rules Engine: Establishes  |
|         |              |                       | explicit binding of ProfileApplicabilityEngine to the 14       |
|         |              |                       | frozen profile applicability domains (Section 13.2 / Table 05) |
|         |              |                       | and Table 07 objective vs perceptual matrix in WP-07, and      |
|         |              |                       | enforces declared_applicability_scope, contamination_status    |
|         |              |                       | (CLEAN | CONTAMINATED | SUSPECT), and lifecycle_status (ACTIVE |
|         |              |                       | | SUPERSEDED | INVALIDATED | RETIRED) for fixtures in WP-08;   |
|         |              |                       | (5) Graph Implementation & DAG Constraint Resolution:          |
|         |              |                       | Specifies implementation mechanics in WP-02 for the 14 frozen  |
|         |              |                       | edges, explicitly handling symmetric CONFLICTS_WITH edge       |
|         |              |                       | mechanics within DAG cycle detection and defining explicit     |
|         |              |                       | lineage traversal query contracts.                             |
|         |              |                       | Status: DRAFT — IMPLEMENTATION PLANNING.                       |
+---------+--------------+-----------------------+----------------------------------------------------------------+
11.2 Architectural Status Declaration
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1c.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1c — Final Readiness, Applicability & Graph-Implementation Fidelity Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1b.txt [Preserved Unchanged]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
Status: DRAFT — IMPLEMENTATION PLANNING
Authority Level: Authoritative Implementation & Engineering Programme Specification (Draft Status — Subject to Formal Review and Adoption)
DECLARATION:
This DRAFT Implementation & Build Plan is the current proposed engineering programme specification for Phase 1C.5h and remains subject to implementation-plan review and formal adoption.
ALL SUBSYSTEM BUILDS, CODE MODULES, TEST HARNESSES, AND VALIDATION PIPELINES MUST EXECUTE IN STRICT COMPLIANCE WITH THE SEQUENCING, WORK PACKAGES, AND ACCEPTANCE CRITERIA HEREIN.
================================================================================
END OF IMPLEMENTATION PLAN: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1c.txt
================================================================================"""

    assert old_s11 in text, "old_s11 not found"
    text = text.replace(old_s11, new_s11, 1)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"Successfully generated {output_path}")
    print(f"Total size: {len(text)} bytes, {len(text.splitlines())} lines")

if __name__ == "__main__":
    build()
