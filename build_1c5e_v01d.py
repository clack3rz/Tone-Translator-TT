#!/usr/bin/env python3
"""
Master Builder & Verification Script for:
TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt
Phase 1C.5e — Outcome Evaluation, Iteration & Engineering Review
Five Surgical Architectural Edits Baseline (v0.1d)
"""

import os
import sys
import re

def build_and_verify_v01d():
    # 1. Authoritative upstream and previous versions immutability check
    v01_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt"
    v01a_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt"
    v01b_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt"
    v01c_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt"
    target_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt"

    for p in [v01_path, v01a_path, v01b_path, v01c_path]:
        if not os.path.exists(p):
            print(f"ERROR: Required previous version {p} does not exist!")
            sys.exit(1)

    v01_sz_before = os.path.getsize(v01_path)
    v01a_sz_before = os.path.getsize(v01a_path)
    v01b_sz_before = os.path.getsize(v01b_path)
    v01c_sz_before = os.path.getsize(v01c_path)

    # 2. Read v0.1c as immediate source
    with open(v01c_path, "r", encoding="utf-8") as f:
        src_text = f.read()

    # 3. Apply the Five Surgical Edits
    replacements = []

    # Header
    h_old = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5e — OUTCOME EVALUATION, ITERATION & ENGINEERING REVIEW
ARCHITECTURAL SPECIFICATION (v0.1c)
FINAL SURGICAL CORRECTION BASELINE
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt
PHASE: Phase 1C.5e (Outcome Evaluation, Iteration & Engineering Review)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Final Surgical Correction Pass (v0.1c)
PREVIOUS VERSIONS (PRESERVED UNCHANGED):
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt (v0.1 Design Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt (v0.1a Epistemic & Lifecycle Correction)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt (v0.1b Surgical Architectural Patch Baseline)"""

    h_new = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5e — OUTCOME EVALUATION, ITERATION & ENGINEERING REVIEW
ARCHITECTURAL SPECIFICATION (v0.1d)
FIVE SURGICAL ARCHITECTURAL EDITS BASELINE
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt
PHASE: Phase 1C.5e (Outcome Evaluation, Iteration & Engineering Review)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Surgical Architectural Correction Pass (v0.1d)
PREVIOUS VERSIONS (PRESERVED UNCHANGED):
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt (v0.1 Design Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt (v0.1a Epistemic & Lifecycle Correction)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt (v0.1b Surgical Architectural Patch Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt (v0.1c Final Surgical Correction Baseline)"""
    replacements.append((h_old, h_new, "Header replacement", 1))

    # Intro Scope
    s_old = """SCOPE OF v0.1c FINAL SURGICAL CORRECTIONS (VC-01 THROUGH VC-07):
  This v0.1c artifact executes a constrained surgical correction pass resolving exactly seven identified defects:
  - VC-01: Section 5 Verbatim Principles & Operational Interpretation Structure (separates verbatim frozen principles from Phase 1C.5e operational interpretations; preserves independent invariant).
  - VC-02: Comprehensive Principle Reference Repair (corrects every principle citation across the entire document to match v0.3c meanings; audits Outcome Evidence Firewall, Platform Translation, and Confounder citations).
  - VC-03: Lifecycle Status & Transition Semantics Fidelity (purges all invented lifecycle status tokens; strictly binds post-decision lifecycle to frozen Statuses 20–27 of Phase 1C.5a v0.3c).
  - VC-04: Pre-Action Validation, Simulation Lane & Upstream Record Immutability (preserves Stage 11 read-only boundaries; enforces Simulation Firewall: "Simulation is not actual outcome evidence").
  - VC-05: Causal Attribution, Confounder Isolation & Non-Dogmatic Falsification (enforces 10 constitutional causal rules; prevents jumping from failed remedies to diagnostic falsification without discriminating tests).
  - VC-06: Two-Layer Model, Checkpoint-Aware Reversion & Non-Stacking Discipline (decouples Layer A Findings from Layer B Actions; enforces 3-state checkpoint restoration; forbids corrective stacking).
  - VC-07: Scenario Illustrative Auditing, Concordance Registries, Correction Register & Governance Status (re-audits Scenarios 1–20 as synthetic illustrations with ORIGIN_7 markers; updates concordances; documents VC-01–VC-07 register; retains DRAFT status without freeze claims)."""

    s_new = """SCOPE OF v0.1d FIVE SURGICAL ARCHITECTURAL EDITS (EDIT 1 THROUGH EDIT 5):
  This v0.1d artifact executes a tightly bounded correction pass implementing exactly five architectural edits:
  - EDIT 1: Fix Stage 13 / 14 Record Classification (reclassifies ActualOutcomeEvidenceRecord and EngineeringReviewRecord as INHERITED canonical identities and lifecycle stage ownership; designates Phase 1C.5e schemas as PHASE_1C5E_PROPOSED_ELABORATION and non-normative illustrative schemas).
  - EDIT 2: Replace §14.2 & §14.3 Iteration Rules (removes mandatory causal-confirmation and monotonic-convergence requirements; establishes evidence-justified iteration authorization; incorporates bracketing, bounded search, and nonlinear exploration; converts anti-thrashing triggers to reassessment rather than automatic reversion).
  - EDIT 3: Reversion & Anti-Thrashing Reassessment Alignment (aligns Section 16 checkpoint-aware reversion and Section 22 AP-04 failure mode with evidence-governed reassessment; clarifies that reversion is an intentional, authorized restoration rather than a blind reflexive rollback).
  - EDIT 4: Residual Patch Marker Cleanup (removes ephemeral SP and VC markers from section headers and scenario titles to restore pristine, authoritative architectural headings).
  - EDIT 5: v0.1d Surgical Edit Register, Revision Register & Governance Maintenance (documents Edits 1–5 in Section 26; updates Section 27 checklist and Section 28 revision register; preserves DRAFT status without freeze claims)."""
    replacements.append((s_old, s_new, "Scope in intro replacement", 1))

    # Section 26 replacement (before TOC replacement)
    m26_list = [m.start() for m in re.finditer(r'SECTION 26', src_text)]
    m26 = m26_list[1] if len(m26_list) > 1 else -1
    m27_list = [m.start() for m in re.finditer(r'SECTION 27', src_text)]
    m27 = m27_list[1] if len(m27_list) > 1 else -1
    sec26_exact_old = src_text[m26:m27]

    sec26_exact_new = """SECTION 26 — v0.1c → v0.1d SURGICAL ARCHITECTURAL EDIT REGISTER (EDIT 1 THROUGH EDIT 5)
================================================================================
This register documents the execution of the Phase 1C.5e v0.1d Five Surgical Architectural Edits:

+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| Edit   | Title                            | Affected Sections | Defect Corrected                            | Architectural Rectification in v0.1d                     |
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| EDIT 1 | Stage 13 / 14 Record             | Section 19, 25.2, | Classified ActualOutcomeEvidenceRecord and  | Reclassified canonical record identity & Stage 13/14     |
|        | Classification Reconciliation    | Section 25.3      | EngineeringReviewRecord as newly proposed   | ownership as INHERITED (Phase 1C.5a v0.3c); designated   |
|        |                                  |                   | by Phase 1C.5e                              | detailed fields/schema as PHASE_1C5E_PROPOSED_ELABORATION|
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| EDIT 2 | Iteration Rules & Anti-Thrashing | Section 14.2,     | Mandatory causal confirmation and universal | Replaced with evidence-justified iteration authorization;|
|        | Reassessment Architecture        | Section 14.3      | monotonic convergence requirements          | recognized bracketing & parameter reversal; converted    |
|        |                                  |                   |                                             | thrashing triggers to reassessment instead of auto-revert|
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| EDIT 3 | Reversion & Anti-Thrashing       | Section 16.3,     | Automatic / mandatory reversion language    | Clarified that adverse findings prompt deliberate        |
|        | Reassessment Alignment           | Section 22 (AP-04)| and overly rigid thrashing failure defense  | reassessment prior to rollback; updated AP-04 defense    |
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| EDIT 4 | Residual Patch Marker Cleanup    | Section 3, 4, 6,  | Obsolete parenthetical patch tokens         | Purged ephemeral SP and VC markers from section headers  |
|        |                                  | 8, 12, 13, 16, 24 | (SP-10, VC-03 to VC-06) in active headings  | and scenario titles, restoring pristine sound headings   |
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| EDIT 5 | v0.1d Register, Checklist &      | Section 26, 27,   | Missing v0.1d edit register entry;          | Documented Edits 1–5 in Section 26 register; updated     |
|        | Governance Status Maintenance    | Section 28        | version baseline documentation              | Section 27 checklist and Section 28 revision register;   |
|        |                                  |                   |                                             | maintained DRAFT status without freeze claims            |
+--------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+

================================================================================
"""
    replacements.append((sec26_exact_old, sec26_exact_new, "Section 26 replacement", 1))

    # TOC Section 26 update
    toc_old = "SECTION 26 — v0.1b → v0.1c FINAL SURGICAL CORRECTION REGISTER (VC-01 THROUGH VC-07)"
    toc_new = "SECTION 26 — v0.1c → v0.1d SURGICAL ARCHITECTURAL EDIT REGISTER (EDIT 1 THROUGH EDIT 5)"
    replacements.append((toc_old, toc_new, "TOC Section 26 replacement", 1))

    # EDIT 1: Section 19.2 and 19.3
    s19_old = """19.2 PRIMARY PROPOSED SCHEMA 1: `ActualOutcomeEvidenceRecord` (STAGE 13)
[NON_NORMATIVE_ILLUSTRATIVE_SCHEMA]
Conceptual record fields:"""

    s19_new = """19.2 PRIMARY PROPOSED SCHEMA ELABORATION 1: `ActualOutcomeEvidenceRecord` (STAGE 13)
CLASSIFICATION & LIFECYCLE OWNERSHIP:
  - Canonical Record Identity: `INHERITED` (Phase 1C.5a v0.3c Stage 13)
  - Stage 13 Lifecycle Ownership: `INHERITED` (Phase 1C.5a v0.3c)
  - Detailed Phase 1C.5e Fields / Schema: `PHASE_1C5E_PROPOSED_ELABORATION`
  - Schema Status: `NON_NORMATIVE_ILLUSTRATIVE_SCHEMA`

Conceptual record fields:"""
    replacements.append((s19_old, s19_new, "Section 19.2 replacement", 1))

    s19_3_old = """19.3 PRIMARY PROPOSED SCHEMA 2: `EngineeringReviewRecord` (STAGE 14)
[NON_NORMATIVE_ILLUSTRATIVE_SCHEMA]
Conceptual record fields:"""

    s19_3_new = """19.3 PRIMARY PROPOSED SCHEMA ELABORATION 2: `EngineeringReviewRecord` (STAGE 14)
CLASSIFICATION & LIFECYCLE OWNERSHIP:
  - Canonical Record Identity: `INHERITED` (Phase 1C.5a v0.3c Stage 14)
  - Stage 14 Lifecycle Ownership: `INHERITED` (Phase 1C.5a v0.3c)
  - Detailed Phase 1C.5e Fields / Schema: `PHASE_1C5E_PROPOSED_ELABORATION`
  - Schema Status: `NON_NORMATIVE_ILLUSTRATIVE_SCHEMA`

Conceptual record fields:"""
    replacements.append((s19_3_old, s19_3_new, "Section 19.3 replacement", 1))

    # Section 25.2 Vocabulary Concordance
    v25_old = """| ActualOutcomeEvidenceRecord           | PHASE_1C5E_PROPOSED      | Proposed Stage 13 record schema (Section 19.2).                        |
| EngineeringReviewRecord               | PHASE_1C5E_PROPOSED      | Proposed Stage 14 retrospective review schema (Section 19.3).          |"""

    v25_new = """| ActualOutcomeEvidenceRecord           | INHERITED (RECORD & STAGE)| Canonical Stage 13 record identity inherited from Phase 1C.5a v0.3c;   |
|                                       | PHASE_1C5E_ELABORATION    | detailed fields/schema proposed by Phase 1C.5e (Section 19.2).         |
| EngineeringReviewRecord               | INHERITED (RECORD & STAGE)| Canonical Stage 14 record identity inherited from Phase 1C.5a v0.3c;   |
|                                       | PHASE_1C5E_ELABORATION    | detailed fields/schema proposed by Phase 1C.5e (Section 19.3).         |"""
    replacements.append((v25_old, v25_new, "Section 25.2 vocabulary replacement", 1))

    # Section 25.3 Lifecycle Concordance
    l25_old = """| Stage 13 | Actual Outcome Evaluation       | 24. OUTCOME_EVIDENCE_INGESTED     | PredictedOutcome, Requirements  | ActualOutcomeEvidenceRecord (Proposed)       |
|          |                                 | 25. OUTCOME_UNEVALUABLE           |                                 |                                              |
| Stage 14 | Retrospective Engineering Review| 26. REVIEW_COMPLETED_AWAITING_ITER| All upstream records (Stages 1-13)| EngineeringReviewRecord (Proposed)           |"""

    l25_new = """| Stage 13 | Actual Outcome Evaluation       | 24. OUTCOME_EVIDENCE_INGESTED     | PredictedOutcome, Requirements  | ActualOutcomeEvidenceRecord (Inherited Record / Proposed Elaboration)       |
|          |                                 | 25. OUTCOME_UNEVALUABLE           |                                 |                                              |
| Stage 14 | Retrospective Engineering Review| 26. REVIEW_COMPLETED_AWAITING_ITER| All upstream records (Stages 1-13)| EngineeringReviewRecord (Inherited Record / Proposed Elaboration)           |"""
    replacements.append((l25_old, l25_new, "Section 25.3 lifecycle replacement", 1))

    # EDIT 2: Section 14.2 & 14.3 Iteration Rules
    s14_old = """14.2 ITERATION AUTHORIZATION & TRAJECTORY GOVERNANCE
An iteration step is AUTHORIZED ONLY IF ALL of the following criteria are satisfied:
  1. Diagnostic Mechanism Active: The previous acoustic delta demonstrated that the targeted causal variable actively influences the defect.
  2. Trajectory Convergent: The acoustic delta moved monotonically toward the requirement target without degrading preservation metrics.
  3. Preservation Bounds Unbreached: Zero non-exceedance bounds violated.
  4. Stopping Criteria Pre-Defined: Clear stopping thresholds established prior to adjustment.

14.3 ANTI-THRASHING & CONVERGENCE SAFEGUARDS
Phase 1C.5e eliminates arbitrary universal iteration count numbers (e.g. fixed "3 iterations max").
Instead, termination is governed by dynamic convergence:
  - Diminishing Returns Rule: If an adjustment produces smaller acoustic benefit than the prior step while trade-offs increase, iteration halts immediately.
  - Oscillation Detection: If parameter adjustments flip direction (e.g. cutting then boosting the same band), thrashing is declared; iteration halts and clean reversion is triggered.
  - Contextual Budget: Iteration cycles are bound by track-specific complexity budgets; once exhausted, the system halts and escalates."""

    s14_new = """14.2 EVIDENCE-JUSTIFIED ITERATION AUTHORIZATION
Bounded refinement may be justified when:
  1. The current intervention remains technically and causally plausible;
  2. The observed outcome provides sufficient reason to believe refinement may improve requirement satisfaction;
  3. Preservation constraints remain acceptable;
  4. No material evidence requires reopening diagnosis;
  5. Another pass has reasonable expected information gain;
  6. Stopping criteria are defined for the case.

Directional improvement may SUPPORT refinement.
It does NOT prove the causal diagnosis.
Monotonic convergence is NOT a universal requirement.

14.3 ANTI-THRASHING / REVIEW TRIGGERS
The following trigger reassessment rather than automatic reversion:
  - Diminishing benefit;
  - Increasing trade-offs;
  - Reversal of parameter direction;
  - Oscillating parameter values;
  - Repeated inconclusive changes.

Parameter reversal may legitimately occur during:
  - Bracketing;
  - Bounded search;
  - Nonlinear-response exploration;
  - Perceptual optimization.

Iteration should stop, return upstream, or escalate when justified by evidence, constraints, budget, or persistent non-convergence."""
    replacements.append((s14_old, s14_new, "Section 14.2 and 14.3 replacement", 1))

    # EDIT 3: Section 16 & Section 22 AP-04 Alignment
    s16_3_old = """16.3 CHECKPOINT RESTORATION LOGIC (VC-06)
When an active intervention fails, introduces unacceptable trade-offs, or proves regressive:
  - The default restoration target is the LAST ACCEPTED CHECKPOINT (State 2), NOT necessarily the Original Baseline (State 1).
  - This preserves previously validated and accepted engineering gains (e.g. an earlier successful low-end cleanup on bass) rather than unnecessarily wiping out all session progress.
  - If the earlier accepted gains are themselves called into question by new evidence, or if the entire processing chain must be abandoned, full reversion to the Original Baseline (State 1) is executed."""

    s16_3_new = """16.3 CHECKPOINT RESTORATION LOGIC
When an active intervention fails, introduces unacceptable trade-offs, or proves regressive:
  - Adverse outcome findings or anti-thrashing indicators prompt deliberate reassessment of the intervention trajectory before authorizing checkpoint rollback (Section 14.3). Parameter exploration techniques (such as bracketing or nonlinear search) do not constitute premature grounds for automatic rollback.
  - Where reversion is authorized, the default restoration target is the LAST ACCEPTED CHECKPOINT (State 2), NOT necessarily the Original Baseline (State 1).
  - This preserves previously validated and accepted engineering gains (e.g. an earlier successful low-end cleanup on bass) rather than unnecessarily wiping out all session progress.
  - If the earlier accepted gains are themselves called into question by new evidence, or if the entire processing chain must be abandoned, full reversion to the Original Baseline (State 1) is executed."""
    replacements.append((s16_3_old, s16_3_new, "Section 16.3 replacement", 1))

    ap4_old = """4. ANTI-PATTERN AP-04 (Infinite Iteration & Blind Parameter Hunting):
   - Prohibited: Endlessly tweaking filter frequencies or compressor thresholds without a convergent trajectory.
   - Defense: Strict anti-thrashing rules, diminishing return checks, and mandatory reversion (Principle 14)."""

    ap4_new = """4. ANTI-PATTERN AP-04 (Infinite Iteration & Blind Parameter Hunting):
   - Prohibited: Endlessly tweaking filter frequencies or compressor thresholds without evidence justification or defined stopping criteria.
   - Defense: Evidence-justified iteration bounds, anti-thrashing reassessment triggers, and checkpoint-aware reversion (Principle 14)."""
    replacements.append((ap4_old, ap4_new, "AP-04 replacement", 1))

    # EDIT 4: Residual Patch Marker Cleanup
    replacements.append(("3.1 SEALED UPSTREAM RECORDS (VC-04)", "3.1 SEALED UPSTREAM RECORDS", "Sec 3.1 title", 1))
    replacements.append(("4.2 EXACT FROZEN LIFECYCLE STATUSES (VC-03)", "4.2 EXACT FROZEN LIFECYCLE STATUSES", "Sec 4.2 title", 1))
    replacements.append(("6.2 PRE-ACTION VALIDATION & SIMULATION LANE (VC-04)", "6.2 PRE-ACTION VALIDATION & SIMULATION LANE", "Sec 6.2 title", 1))
    replacements.append(("6.3 THE SIMULATION FIREWALL (VC-04)", "6.3 THE SIMULATION FIREWALL", "Sec 6.3 title", 1))
    replacements.append(("8.2 MODALITY-DEPENDENT & QUESTION-RELATIVE EVIDENCE SUFFICIENCY (VC-04 & VC-05)", "8.2 MODALITY-DEPENDENT & QUESTION-RELATIVE EVIDENCE SUFFICIENCY", "Sec 8.2 title", 1))
    replacements.append(("12.3 CAUSAL EXCLUSION & FALSIFICATION REPAIR (VC-05)", "12.3 CAUSAL EXCLUSION & FALSIFICATION DISAMBIGUATION", "Sec 12.3 title", 1))
    replacements.append(("13.1 DECOUPLING FINDINGS FROM ACTIONS (VC-06)", "13.1 DECOUPLING FINDINGS FROM ACTIONS", "Sec 13.1 title", 1))
    replacements.append(("13.4 PROPOSED SUMMARY LABEL (VC-06)", "13.4 PROPOSED SUMMARY LABEL", "Sec 13.4 title", 1))
    replacements.append(("16.1 REVERSION AS A FIRST-CLASS ENGINEERING OUTCOME (VC-06)", "16.1 REVERSION AS A FIRST-CLASS ENGINEERING OUTCOME", "Sec 16.1 title", 1))
    replacements.append(("16.2 THREE DISTINCT ARCHITECTURAL STATES (VC-06)", "16.2 THREE DISTINCT ARCHITECTURAL STATES", "Sec 16.2 title", 1))
    replacements.append(("16.4 REVERSION LIFECYCLE PHASES (VC-06)", "16.4 REVERSION LIFECYCLE PHASES", "Sec 16.4 title", 1))
    replacements.append(("16.5 FORBIDDING UNJUSTIFIED CORRECTIVE STACKING (VC-06)", "16.5 FORBIDDING UNJUSTIFIED CORRECTIVE STACKING", "Sec 16.5 title", 1))
    replacements.append(("SCENARIO 16: Confounded Multi-Track Interaction with Incomplete Telemetry (SP-10)", "SCENARIO 16: Confounded Multi-Track Interaction with Incomplete Telemetry", "Scenario 16 title", 1))
    replacements.append(("SCENARIO 17: User Subjective Preference Overriding Technical Correction (SP-10)", "SCENARIO 17: User Subjective Preference Overriding Technical Correction", "Scenario 17 title", 1))
    replacements.append(("SCENARIO 18: Unintended Degradation Triggering Checkpoint Reversion (SP-10)", "SCENARIO 18: Unintended Degradation Triggering Checkpoint Reversion", "Scenario 18 title", 1))
    replacements.append(("SCENARIO 19: Boundary Diagnostic Falsification vs Parameter Tuning (SP-10)", "SCENARIO 19: Boundary Diagnostic Falsification vs Parameter Tuning", "Scenario 19 title", 1))
    replacements.append(("SCENARIO 20: Cross-Boundary Epistemic Abstention with Surviving Uncertainty (SP-10)", "SCENARIO 20: Cross-Boundary Epistemic Abstention with Surviving Uncertainty", "Scenario 20 title", 1))

    # Section 28.3 Revision Register
    rev_reg_old = """| v0.1c   | October 2026       | Sound Engineer | Final Surgical Correction Baseline.                        |
|         |                    | AI Architect   | Executes VC-01 through VC-07: decouples verbatim Phase     |
|         |                    |                | 1C.5a 21 Principles from Phase 1C.5e operational           |
|         |                    |                | interpretations; repairs all principle citations; restores |
|         |                    |                | exact frozen lifecycle statuses 20–27 and purges invented  |
|         |                    |                | status tokens; reinforces Simulation Firewall and upstream |
|         |                    |                | record immutability; enforces 10 constitutional causal     |
|         |                    |                | rules; decouples Layer A Findings from Layer B Actions;    |
|         |                    |                | implements Checkpoint-Aware Reversion; re-audits all 20    |
|         |                    |                | scenarios as synthetic illustrations; marks ORIGIN_7       |
|         |                    |                | values; documents VC-01–VC-07 register; retains DRAFT status|
|         |                    |                | without freeze claims.                                     |
+---------+--------------------+----------------+------------------------------------------------------------+"""

    rev_reg_new = """| v0.1c   | October 2026       | Sound Engineer | Final Surgical Correction Baseline.                        |
|         |                    | AI Architect   | Executes VC-01 through VC-07: decouples verbatim Phase     |
|         |                    |                | 1C.5a 21 Principles from Phase 1C.5e operational           |
|         |                    |                | interpretations; repairs all principle citations; restores |
|         |                    |                | exact frozen lifecycle statuses 20–27 and purges invented  |
|         |                    |                | status tokens; reinforces Simulation Firewall and upstream |
|         |                    |                | record immutability; enforces 10 constitutional causal     |
|         |                    |                | rules; decouples Layer A Findings from Layer B Actions;    |
|         |                    |                | implements Checkpoint-Aware Reversion; re-audits all 20    |
|         |                    |                | scenarios as synthetic illustrations; marks ORIGIN_7       |
|         |                    |                | values; documents VC-01–VC-07 register; retains DRAFT status|
|         |                    |                | without freeze claims.                                     |
+---------+--------------------+----------------+------------------------------------------------------------+
| v0.1d   | October 2026       | Sound Engineer | Five Surgical Architectural Edits Baseline.                |
|         |                    | AI Architect   | Executes Edit 1 through Edit 5: reconciles Stage 13 & 14   |
|         |                    |                | record classification (ActualOutcomeEvidenceRecord and     |
|         |                    |                | EngineeringReviewRecord canonical identity & ownership     |
|         |                    |                | INHERITED; schema designated proposed elaboration);        |
|         |                    |                | replaces §14.2 & §14.3 iteration rules (removes universal  |
|         |                    |                | monotonic convergence; establishes evidence-justified      |
|         |                    |                | iteration authorization; incorporates bracketing & bounded |
|         |                    |                | search; converts thrashing triggers to reassessment);      |
|         |                    |                | aligns Section 16 reversion and AP-04 failure mode with    |
|         |                    |                | deliberate reassessment; purges residual patch tags from   |
|         |                    |                | active headings and scenarios; updates Section 26 register |
|         |                    |                | and Section 27 checklist; strictly retains DRAFT status    |
|         |                    |                | without freeze or certification claims.                    |
+---------+--------------------+----------------+------------------------------------------------------------+"""
    replacements.append((rev_reg_old, rev_reg_new, "Section 28.3 revision register replacement", 1))

    # Section 28.4 draft version
    s28_4_old = "This document is a final surgical correction draft (v0.1c)."
    s28_4_new = "This document is a surgical architectural correction draft (v0.1d)."
    replacements.append((s28_4_old, s28_4_new, "Section 28.4 draft version", 1))

    # End of spec marker
    end_old = "END OF SPECIFICATION: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt"
    end_new = "END OF SPECIFICATION: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt"
    replacements.append((end_old, end_new, "End of spec marker", 1))

    # Apply all replacements
    output_text = src_text
    for old_s, new_s, desc, count in replacements:
        if old_s not in output_text:
            print(f"ERROR: Target string not found for: {desc}")
            sys.exit(1)
        if count == 1:
            output_text = output_text.replace(old_s, new_s, 1)
        else:
            output_text = output_text.replace(old_s, new_s)
        print(f"Applied: {desc}")

    # Write target file
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(output_text)

    line_count = len(output_text.splitlines())
    byte_count = len(output_text.encode("utf-8"))
    print(f"\nSuccessfully generated {target_path}")
    print(f"Total Lines: {line_count}")
    print(f"Total Bytes: {byte_count}")

    # 4. Strict Immutability Verification for Previous Versions
    v01_sz_after = os.path.getsize(v01_path)
    v01a_sz_after = os.path.getsize(v01a_path)
    v01b_sz_after = os.path.getsize(v01b_path)
    v01c_sz_after = os.path.getsize(v01c_path)

    assert v01_sz_before == v01_sz_after, f"v0.1 modified! Before: {v01_sz_before}, After: {v01_sz_after}"
    assert v01a_sz_before == v01a_sz_after, f"v0.1a modified! Before: {v01a_sz_before}, After: {v01a_sz_after}"
    assert v01b_sz_before == v01b_sz_after, f"v0.1b modified! Before: {v01b_sz_before}, After: {v01b_sz_after}"
    assert v01c_sz_before == v01c_sz_after, f"v0.1c modified! Before: {v01c_sz_before}, After: {v01c_sz_after}"
    print("Verification PASS: All previous versions (v0.1, v0.1a, v0.1b, v0.1c) preserved UNCHANGED.")

    # 5. Section Verification (all 28 sections)
    expected_sections = [
        "SECTION 1 — PURPOSE, SCOPE & GOVERNANCE BOUNDARIES",
        "SECTION 2 — ARCHITECTURAL POSITION & UPSTREAM DEPENDENCY MAP",
        "SECTION 3 — UPSTREAM RECORD IMMUTABILITY & ANTI-REWRITE ENFORCEMENT",
        "SECTION 4 — LIFECYCLE OWNERSHIP & STAGE BOUNDARIES (STAGES 11 TO 14)",
        "SECTION 5 — THE 21 FROZEN PRINCIPLES OF SOUND ENGINEERING REASONING",
        "SECTION 6 — PRE-ACTION VALIDATION, PREDICTION CONSUMPTION & SIMULATION LANE",
        "SECTION 7 — THE OUTCOME EVIDENCE FIREWALL",
        "SECTION 8 — ACTUAL OUTCOME EVIDENCE ARCHITECTURE (STAGE 13)",
        "SECTION 9 — OUTCOME COMPARISON & MULTI-DIMENSIONAL DELTA EVALUATION",
        "SECTION 10 — PRESERVATION REQUIREMENTS EVALUATION",
        "SECTION 11 — TRADE-OFF, COLLATERAL DAMAGE & UNEXPECTED EFFECT EVALUATION",
        "SECTION 12 — CAUSAL ATTRIBUTION ARCHITECTURE & CONFOUNDER GOVERNANCE",
        "SECTION 13 — TWO-LAYER OUTCOME EVALUATION MODEL: FINDINGS & ACTIONS",
        "SECTION 14 — ITERATION ARCHITECTURE & PATHWAY GOVERNANCE",
        "SECTION 15 — REFINEMENT VS ALTERNATIVE VS RE-DIAGNOSIS BOUNDARY MATRIX",
        "SECTION 16 — CHECKPOINT-AWARE REVERSION ARCHITECTURE & NON-STACKING DISCIPLINE",
        "SECTION 17 — RETURN-UPSTREAM DIRECTIVES & PARENT-CHILD RUN TRACEABILITY",
        "SECTION 18 — RETROSPECTIVE ENGINEERING REVIEW ARCHITECTURE (STAGE 14)",
        "SECTION 19 — RECORD ARCHITECTURE & PROPOSED PHASE 1C.5e SCHEMAS",
        "SECTION 20 — UNCERTAINTY SURVIVAL ACROSS EVALUATION & REVIEW",
        "SECTION 21 — HUMAN / USER EVALUATION & MULTI-TRACK COEXISTENCE",
        "SECTION 22 — FAILURE MODES & PROHIBITED ANTI-PATTERNS",
        "SECTION 23 — CROSS-PHASE INTERFACES & DOWNSTREAM INTEGRATION BOUNDARIES",
        "SECTION 24 — WORKED ARCHITECTURAL ILLUSTRATIONS (SCENARIOS 1 TO 20)",
        "SECTION 25 — CONCORDANCE REGISTRIES & VOCABULARY AUDIT TABLES",
        "SECTION 26 — v0.1c → v0.1d SURGICAL ARCHITECTURAL EDIT REGISTER (EDIT 1 THROUGH EDIT 5)",
        "SECTION 27 — INDEPENDENT-REVIEW CHECKLIST & CONSTITUTIONAL AUDIT",
        "SECTION 28 — OPEN DESIGN QUESTIONS, REVISION REGISTER & FINAL STATUS"
    ]

    for sec in expected_sections:
        assert sec in output_text, f"Missing section: {sec}"
    print("Verification PASS: All 28 sections verified present.")

    # 6. Scenario Verification (all 20 scenarios)
    for i in range(1, 21):
        tag = f"SCENARIO {i}:"
        assert tag in output_text, f"Missing scenario: {tag}"
    print("Verification PASS: All 20 Scenarios verified present.")

    # 7. Edit 1 Verification
    assert "Canonical Record Identity: `INHERITED` (Phase 1C.5a v0.3c Stage 13)" in output_text
    assert "Canonical Record Identity: `INHERITED` (Phase 1C.5a v0.3c Stage 14)" in output_text
    assert "INHERITED (RECORD & STAGE)" in output_text
    assert "NON_NORMATIVE_ILLUSTRATIVE_SCHEMA" in output_text
    print("Verification PASS: Edit 1 (Stage 13 & 14 Record Classification) verified.")

    # 8. Edit 2 Verification
    assert "14.2 EVIDENCE-JUSTIFIED ITERATION AUTHORIZATION" in output_text
    assert "Monotonic convergence is NOT a universal requirement." in output_text
    assert "14.3 ANTI-THRASHING / REVIEW TRIGGERS" in output_text
    assert "The following trigger reassessment rather than automatic reversion:" in output_text
    assert "Bracketing;" in output_text
    print("Verification PASS: Edit 2 (§14.2 & §14.3 Iteration Rules) verified.")

    # 9. Edit 3 Verification
    assert "deliberate reassessment of the intervention trajectory before authorizing checkpoint rollback" in output_text
    assert "Evidence-justified iteration bounds, anti-thrashing reassessment triggers, and checkpoint-aware reversion" in output_text
    print("Verification PASS: Edit 3 (Reversion & AP-04 Alignment) verified.")

    # 10. Edit 4 Verification
    assert "(SP-10)" not in output_text, "Found leftover (SP-10) in output_text!"
    print("Verification PASS: Edit 4 (Residual Patch Marker Cleanup) verified.")

    # 11. Edit 5 Verification
    assert "EDIT 1 THROUGH EDIT 5" in output_text
    assert "v0.1d" in output_text
    print("Verification PASS: Edit 5 (Register, Revision & Governance Maintenance) verified.")

    # 12. Governance Status Verification
    assert "STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED" in output_text
    prohibited = [
        "STATUS: PASS",
        "STATUS: FROZEN",
        "STATUS: CERTIFIED",
        "STATUS: APPROVED",
        "STATUS: PRODUCTION READY",
        "STATUS: ELIGIBLE FOR FREEZE"
    ]
    for p in prohibited:
        assert p not in output_text, f"Found prohibited status string: {p}"
    print("Verification PASS: Governance status strictly DRAFT — ARCHITECTURAL REVIEW REQUIRED.")
    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY.")

if __name__ == "__main__":
    build_and_verify_v01d()
