#!/usr/bin/env python3
"""
Master Builder & Verification Script for:
TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1g.txt
Phase 1C.5e — Outcome Evaluation, Iteration & Engineering Review
Four Bounded Architectural Corrections Baseline (v0.1g)
"""

import os
import sys

def build_v01g():
    # 1. Authoritative upstream and previous versions immutability check
    prev_versions = [
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1e.txt",
        "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1f.txt"
    ]
    frozen_upstreams = [
        "TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.3c.txt",
        "TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2f.txt",
        "TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1d.txt",
        "TT_Engineering_Intervention_Alternatives_and_Tradeoff_Reasoning_v0.1l.txt"
    ]

    for p in prev_versions + frozen_upstreams:
        if not os.path.exists(p):
            print(f"ERROR: Required file {p} does not exist!")
            sys.exit(1)

    prev_sizes_before = {p: os.path.getsize(p) for p in prev_versions + frozen_upstreams}

    # 2. Read v0.1f as immediate source
    src_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1f.txt"
    target_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1g.txt"

    with open(src_path, "r", encoding="utf-8") as f:
        text = f.read()

    replacements = []

    # -------------------------------------------------------------------------
    # 1. HEADER & PREVIOUS VERSIONS LIST
    # -------------------------------------------------------------------------
    h_old = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5e — OUTCOME EVALUATION, ITERATION & ENGINEERING REVIEW
ARCHITECTURAL SPECIFICATION (v0.1f)
SIX ARCHITECTURAL RECONCILIATIONS BASELINE
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1f.txt
PHASE: Phase 1C.5e (Outcome Evaluation, Iteration & Engineering Review)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Architectural Reconciliation Pass (v0.1f)
PREVIOUS VERSIONS (PRESERVED UNCHANGED):
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt (v0.1 Design Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt (v0.1a Epistemic & Lifecycle Correction)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt (v0.1b Surgical Architectural Patch Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt (v0.1c Final Surgical Correction Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt (v0.1d Five Surgical Architectural Edits Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1e.txt (v0.1e Three Surgical Architectural Replacements Baseline)"""

    h_new = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5e — OUTCOME EVALUATION, ITERATION & ENGINEERING REVIEW
ARCHITECTURAL SPECIFICATION (v0.1g)
FOUR BOUNDED ARCHITECTURAL CORRECTIONS BASELINE
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1g.txt
PHASE: Phase 1C.5e (Outcome Evaluation, Iteration & Engineering Review)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Bounded Architectural Correction Pass (v0.1g)
PREVIOUS VERSIONS (PRESERVED UNCHANGED):
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt (v0.1 Design Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt (v0.1a Epistemic & Lifecycle Correction)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt (v0.1b Surgical Architectural Patch Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt (v0.1c Final Surgical Correction Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1d.txt (v0.1d Five Surgical Architectural Edits Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1e.txt (v0.1e Three Surgical Architectural Replacements Baseline)
  - TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1f.txt (v0.1f Six Architectural Reconciliations Baseline)"""
    replacements.append((h_old, h_new, "Header replacement", 1))

    # -------------------------------------------------------------------------
    # 2. TABLE OF CONTENTS: SECTION 26
    # -------------------------------------------------------------------------
    toc_old = "SECTION 26 — v0.1e → v0.1f ARCHITECTURAL RECONCILIATION REGISTER (RECONCILIATION 1 THROUGH 6)"
    toc_new = "SECTION 26 — v0.1f → v0.1g BOUNDED ARCHITECTURAL CORRECTION REGISTER (CORRECTIONS 1 THROUGH 4)"
    replacements.append((toc_old, toc_new, "TOC Section 26 title", 1))

    # -------------------------------------------------------------------------
    # 3. SECTION 1 SCOPE STATEMENT
    # -------------------------------------------------------------------------
    s1_old = """SCOPE OF v0.1f SIX ARCHITECTURAL RECONCILIATIONS (RECONCILIATION 1 THROUGH RECONCILIATION 6):
  This v0.1f artifact executes a tightly bounded architectural reconciliation pass implementing exactly six architectural reconciliations against the frozen upstream baselines:
  - RECONCILIATION 1: Stage 12 Semantic Tone Design and Execution Boundary (Reconciles §§4.1, 6, 23.1 and 25.3 against frozen 1C.5a §§19–21 and frozen 1C.5d §§19.2/24; explicitly distinguishes the 8-step sequence from Stage 11 decision through Stage 12 semantic handoff, translation, acceptability, pre-execution gate, execution, to Stage 13 outcome evidence; maintains platform-neutrality of Phase 1C.5e).
  - RECONCILIATION 2: Lifecycle Transitions and Record Presence (Reconciles §§4.2, 14, 17 and 25.3 against frozen 1C.5a lifecycle table; defines controlling actor, entry conditions, required/optional/barred records, and continuation semantics for post-decision statuses; corrects OUTCOME_UNEVALUABLE as a Review Engine review pause requiring records through Stage 14; preserves distinctions across terminal, blocked, paused, and in-progress states; clarifies Layer B actions as recommendations, not lifecycle statuses).
  - RECONCILIATION 3: Inherited Record Semantics and Six-Factor Review (Reconciles §§8, 18, 19, 25 and checklists with frozen 1C.5a Contract 11 and §22; preserves INHERITED canonical identities and non-normative schemas; retains the six independent review factors with explicit evidential rationale and uncertainty preservation; provides clear semantic mapping to Phase 1C.5e proposed audit elaborations; preserves execution deviation semantics and prohibits ungrounded causal claims).
  - RECONCILIATION 4: Consistent Evidence-Justified Iteration (Keeps §14.2/§14.3 architecture; aligns §13.3 action definitions, §15 boundary matrix, and pathways; removes requirements for confirmed causal diagnosis, "Supported & Active" mechanism, proof of cause, or monotonic improvement; preserves separate routes for refinement, alternatives, evidence acquisition, diagnosis revision, and requirement reformulation; allows upstream reassessment for weakened support, inconclusive results, invalid tests, or changed context).
  - RECONCILIATION 5: Scenario 19 Causal Claim Calibration (Calibrates Scenario 19 causal analysis; removes "zero causal link" and unqualified "diagnosis falsified"; replaces conclusion with case-bounded finding that observed response weakens the specific 6 kHz explanation under tested conditions without establishing complete capsule exclusion or alternative cause; specifies requirements for valid discriminating tests).
  - RECONCILIATION 6: Residual Downstream Commitments (Reconciles §§23.1, 25.2, and 28.1–28.2; qualifies Stage 14 candidate lessons as quarantined inputs for governed review rather than direct canonical knowledge; qualifies Phase 1C.5g migration ownership; maintains non-prescriptive posture for Phase 1C.5f integrity mechanisms and Phase 1C.5h UAT design; retains genuinely open questions without assigning premature mechanisms or voting thresholds)."""

    s1_new = """SCOPE OF v0.1g FOUR BOUNDED ARCHITECTURAL CORRECTIONS (CORRECTION 1 THROUGH CORRECTION 4):
  This v0.1g artifact executes a tightly bounded architectural correction pass implementing exactly four bounded corrections against the frozen upstream baselines:
  - CORRECTION 1 — RESTORE STATUS 19 DETAIL: Restores detailed entry for STATUS 19: PROCEED_BOUNDED_UNCERTAINTY in §4.2 between statuses 18 and 20; details controlling actor (Decision Engine), entry condition (surviving causal ambiguity with safe, bounded action), required records (prerequisites + Decision and PredictedOutcomeRecord), optional record (DiscriminatingRequest), barred records (none specified), non-terminal in-progress lifecycle meaning, and permitted continuation to canonical DECISION_SEALED_AWAITING_EXEC; updates §27.2 item 3 checklist to statuses 18–27.
  - CORRECTION 2 — REMOVE THE STATUS 24 REVIEW-RECORD PROHIBITION: Replaces barred-record wording at STATUS 24: OUTCOME_EVIDENCE_INGESTED in §4.2; states that frozen status 24 specifies no barred records, separates pending Stage 14 creation of EngineeringReviewRecord from prohibition, and preserves Evidence Intake responsibility, Stage 13 required records, and non-terminal in-progress progression into Stage 14.
  - CORRECTION 3 — MAKE STATUS 25 UNEVALUABILITY FACTOR-SPECIFIC: Replaces blanket six-factor unevaluability requirement in §4.2 status-25 entry; reconciles with Contract 11, §22, and Trace P10; specifies that each inherited review factor is assessed independently with explicit evidential rationale; preserves STATUS 25: OUTCOME_UNEVALUABLE as a Stage 14 Review Engine review pause without automatically propagating unevaluability to upstream factors or inferring reasoning soundness.
  - CORRECTION 4 — ALIGN ALTERNATIVE-INTERVENTION ELIGIBILITY: Replaces action_alternate_intervention definition in §13.3 to align with plausibility-based alternative deliberation in §15; establishes that diagnostic direction remains technically and causally plausible while current intervention/locus is ineffective, unsuitable, or introduces unacceptable collateral effects; recommends checkpoint-aware restoration and routes alternative deliberation to Phase 1C.5d without requiring definitive causal proof or authorizing tool selection in Phase 1C.5e."""
    replacements.append((s1_old, s1_new, "Section 1 Scope statement", 1))

    # -------------------------------------------------------------------------
    # 4. CORRECTIONS 1, 2, 3: SECTION 4.2 STATUS ENTRIES
    # -------------------------------------------------------------------------
    s4_entries_old = """--------------------------------------------------------------------------------
1. STATUS 18: JUSTIFIED_NO_CHANGE (TERMINAL RUN — COMPLETE)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Decision Engine (Stage 11 / Phase 1C.5d).
  - Entry Condition: Analysis confirms current tone fulfills intent better than available alternatives, or that intervention trade-offs outweigh acoustic benefits (Scenario J, Trace P4).
  - Required Records: All Stages 01 to 11 fully populated, including `EngineeringDecisionRecord` (`decision_type: "JUSTIFIED_NO_CHANGE"`), `PredictedOutcomeRecord`, and `retained_credible_alternatives`.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Downstream Semantic Tone Design Handoff, Platform Translation, Execution, and Outcome records are NOT CREATED (strictly barred).
  - Lifecycle Meaning: Terminal Run (Complete). Engineering decision is to leave tone as-is; do not manufacture downstream execution or outcome records.
  - Permitted Continuation: None. Full run closure.

--------------------------------------------------------------------------------
2. STATUS 20: DECISION_SEALED_AWAITING_EXEC (BATCH COMPLETE / LIFECYCLE OPEN)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Decision Engine (Stage 11 / Phase 1C.5d).
  - Entry Condition: Engineering decision and predictions sealed; batch run complete; ready for platform translation / semantic handoff (Trace P5).
  - Required Records: All Stages 01 to 11 fully populated.
  - Optional Records: `SemanticToneDesign` (if semantic handoff package generated).
  - Barred / Not-Yet-Created Records: ActualOutcomeEvidenceRecord, EngineeringReviewRecord.
  - Lifecycle Meaning: Batch Complete / Lifecycle Open (Non-Terminal / In-Progress).
  - Source Discrepancy Note: In Phase 1C.5a v0.3c, the canonical status column designates this token as `DECISION_SEALED_AWAITING_EXEC`, while explanatory text and transition columns occasionally refer to `DECISION_SEALED_AWAITING_EXECUTION`. Furthermore, the transition column references `PLATFORM_TRANSLATION_EVALUATED` as an explanatory operational transition rather than a separate canonical lifecycle status token.
  - Permitted Continuation: Advances across Stage 12 translation to `EXECUTION_BLOCKED_UNACCEPTABLE` (if rejected), `PLATFORM_TRANSLATION_UNSUPPORTED` (if blocks missing), or `EXECUTION_COMPLETED_AWAITING_OUT` (upon successful execution).

--------------------------------------------------------------------------------
3. STATUS 21: PLATFORM_TRANSLATION_UNSUPPORTED (TERMINAL RUN — HALTED)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Platform Translator (Stage 12 Operational Layer).
  - Entry Condition: Platform Translator reports that the target platform completely lacks required processing blocks (UNSUPPORTED capability; Trace P6).
  - Required Records: All Stages 01 to 12 fully populated + Translation Report documenting unsupported blocks.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Execution, Actual Audio, and EngineeringReviewRecord are barred.
  - Lifecycle Meaning: Terminal Run (Halted). Execution halted; upstream diagnosis remains frozen.
  - Permitted Continuation: None within this run. Requires platform change or a new engineering design in a separate run.

--------------------------------------------------------------------------------
4. STATUS 22: EXECUTION_BLOCKED_UNACCEPTABLE (NON-TERMINAL — GATE BLOCK)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Pre-Execution Gate (Stage 12 Operational Layer).
  - Entry Condition: Pre-execution gate detects that translator proposed DEFAULTED or APPROXIMATED mapping that violates non-negotiable preservation constraints or exceeds acceptable approximation boundaries before audio generation (Trace P7, Demonstration L4).
  - Required Records: All Stages 01 to 12 fully populated + Block Report documenting violated constraints.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Downstream Audio Generation, Actual Outcome Evidence, EngineeringReviewRecord.
  - Lifecycle Meaning: Non-Terminal (Gate Block). Downstream execution halted BEFORE audio generation.
  - Permitted Continuation: Escalates back to `DECISION_SEALED_AWAITING_EXEC` for selection of a retained alternative candidate or revised decision.

--------------------------------------------------------------------------------
5. STATUS 23: EXECUTION_COMPLETED_AWAITING_OUT (NON-TERMINAL — IN-PROGRESS)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Execution Engine / DAW Gateway (Stage 12 Operational Layer).
  - Entry Condition: Approved configuration rendered/executed on platform; audio rendered or preset loaded; awaiting capture buffer of resulting sound.
  - Required Records: All Stages 01 to 12 fully populated + Translation Report.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: EngineeringReviewRecord.
  - Lifecycle Meaning: Non-Terminal (In-Progress). Execution complete; outcome review not yet completed.
  - Permitted Continuation: Transitions to `STATUS 24: OUTCOME_EVIDENCE_INGESTED` upon receipt and calibration of the capture buffer.

--------------------------------------------------------------------------------
6. STATUS 24: OUTCOME_EVIDENCE_INGESTED (NON-TERMINAL — IN-PROGRESS)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Evidence Intake (Stage 13 / Phase 1C.5e).
  - Entry Condition: Post-execution audio capture received; objective delta calculations computed; ready for retrospective review.
  - Required Records: All Stages 01 to 13 fully populated, including `ActualOutcomeEvidenceRecord`.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: EngineeringReviewRecord (created in Stage 14).
  - Lifecycle Meaning: Non-Terminal (In-Progress). Outcome evidence available for active evaluation and review.
  - Source Discrepancy Note: In Phase 1C.5a v0.3c, the transition column references `ENGINEERING_REVIEW_COMPLETED, or OUTCOME_UNEVALUABLE (25)`. The phrase `ENGINEERING_REVIEW_COMPLETED` represents explanatory transition wording describing the completion of Stage 14 review, while the authoritative lifecycle statuses resulting from completed review are Status 26 `REVIEW_COMPLETED_AWAITING_ITER` or Status 27 `CYCLE_COMPLETED_SATISFIED`.
  - Permitted Continuation: Advances to Stage 14 review, resolving to `REVIEW_COMPLETED_AWAITING_ITER`, `CYCLE_COMPLETED_SATISFIED`, or `OUTCOME_UNEVALUABLE`.

--------------------------------------------------------------------------------
7. STATUS 25: OUTCOME_UNEVALUABLE (NON-TERMINAL — REVIEW PAUSE)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Submitted audio is inadequate to verify predictions (e.g. audio silent, wrong performance played, severe uncalibrated clipping, or test unverified; Scenario F, Trace P10).
  - Required Records: All Stages 01 to 14 fully populated, INCLUDING an unevaluable `EngineeringReviewRecord` where evaluation factors are formally rated `UNEVALUABLE` with documented rationale.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Non-Terminal (Review Pause).
  - CRITICAL ARCHITECTURAL CORRECTION: Status 25 is a REVIEW PAUSE assessed by the Review Engine in Stage 14, NOT merely an intake-level file rejection in Stage 13 and NOT an automatic terminal failure. It requires formal evaluation records through Stage 14 documenting why the test was unverified.
  - Permitted Continuation & Frozen Resumption Semantics: The frozen 1C.5a table transition column explicitly states: `None (Lifecycle paused awaiting valid performance capture)`. Resumption occurs when valid, calibrated audio is resubmitted for the run, preserving frozen resumption semantics without inventing unsupported transition tokens.

--------------------------------------------------------------------------------
8. STATUS 26: REVIEW_COMPLETED_AWAITING_ITER (ITERATION LOOP — OPEN)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Retrospective review completed; primary goal partially unmet, trade-off severe, or contingency alternative triggered (Trace P8).
  - Required Records: All Stages 01 to 14 fully populated, including completed `EngineeringReviewRecord`.
  - Optional Records: Quarantined Candidate-Lesson Submission (`candidate_lesson_quarantine_ref`).
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Iteration Loop (Open). Review completed; requires governed next step.
  - Permitted Continuation: Transitions to `INTENT_CLARIFICATION_REQUIRED` or `EVIDENCE_ASSESSMENT (Child Run)`. Governed child-run instantiation links parent `run_id`, preserves historical provenance, and applies child-run evidence revalidation.

--------------------------------------------------------------------------------
9. STATUS 27: CYCLE_COMPLETED_SATISFIED (FULL LIFECYCLE TERMINAL — CLOSED)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Tone fully satisfies intent; review confirms primary goals achieved within trade-off bounds (Scenario A).
  - Required Records: All Stages 01 to 14 fully populated, including completed `EngineeringReviewRecord`.
  - Optional Records: Quarantined Candidate-Lesson Submission (`candidate_lesson_quarantine_ref`).
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Full Lifecycle Terminal (Closed / Complete).
  - Permitted Continuation: None. Full lifecycle successfully closed."""

    s4_entries_new = """--------------------------------------------------------------------------------
1. STATUS 18: JUSTIFIED_NO_CHANGE (TERMINAL RUN — COMPLETE)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Decision Engine (Stage 11 / Phase 1C.5d).
  - Entry Condition: Analysis confirms current tone fulfills intent better than available alternatives, or that intervention trade-offs outweigh acoustic benefits (Scenario J, Trace P4).
  - Required Records: All Stages 01 to 11 fully populated, including `EngineeringDecisionRecord` (`decision_type: "JUSTIFIED_NO_CHANGE"`), `PredictedOutcomeRecord`, and `retained_credible_alternatives`.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Downstream Semantic Tone Design Handoff, Platform Translation, Execution, and Outcome records are NOT CREATED (strictly barred).
  - Lifecycle Meaning: Terminal Run (Complete). Engineering decision is to leave tone as-is; do not manufacture downstream execution or outcome records.
  - Permitted Continuation: None. Full run closure.

--------------------------------------------------------------------------------
2. STATUS 19: PROCEED_BOUNDED_UNCERTAINTY (NON-TERMINAL — IN-PROGRESS)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Decision Engine (Stage 11 / Phase 1C.5d).
  - Entry Condition: Surviving causal ambiguity with a safe, bounded action defensible across the surviving options (Trace P3).
  - Required Records: All prerequisite records (Stages 01 through 10) fully populated + `EngineeringDecisionRecord` and `PredictedOutcomeRecord`.
  - Optional Records: `DiscriminatingRequest` (authoritative source identity from Phase 1C.5a Contract 14).
  - Barred / Not-Yet-Created Records: None specified in the frozen status-19 row.
  - Lifecycle Meaning: Non-Terminal (In-Progress). Preserves bounded uncertainty explicitly; proceeding under bounded uncertainty does NOT imply that the underlying diagnosis is confirmed.
  - Permitted Continuation: Advances toward status 20 (`DECISION_SEALED_AWAITING_EXEC`). (Source Discrepancy Note: The frozen 1C.5a v0.3c transition column uses explanatory wording `DECISION_SEALED_AWAITING_EXECUTION`; Phase 1C.5e reconciles this to canonical status identity `DECISION_SEALED_AWAITING_EXEC` without introducing a new status).

--------------------------------------------------------------------------------
3. STATUS 20: DECISION_SEALED_AWAITING_EXEC (BATCH COMPLETE / LIFECYCLE OPEN)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Decision Engine (Stage 11 / Phase 1C.5d).
  - Entry Condition: Engineering decision and predictions sealed; batch run complete; ready for platform translation / semantic handoff (Trace P5).
  - Required Records: All Stages 01 to 11 fully populated.
  - Optional Records: `SemanticToneDesign` (if semantic handoff package generated).
  - Barred / Not-Yet-Created Records: ActualOutcomeEvidenceRecord, EngineeringReviewRecord.
  - Lifecycle Meaning: Batch Complete / Lifecycle Open (Non-Terminal / In-Progress).
  - Source Discrepancy Note: In Phase 1C.5a v0.3c, the canonical status column designates this token as `DECISION_SEALED_AWAITING_EXEC`, while explanatory text and transition columns occasionally refer to `DECISION_SEALED_AWAITING_EXECUTION`. Furthermore, the transition column references `PLATFORM_TRANSLATION_EVALUATED` as an explanatory operational transition rather than a separate canonical lifecycle status token.
  - Permitted Continuation: Advances across Stage 12 translation to `EXECUTION_BLOCKED_UNACCEPTABLE` (if rejected), `PLATFORM_TRANSLATION_UNSUPPORTED` (if blocks missing), or `EXECUTION_COMPLETED_AWAITING_OUT` (upon successful execution).

--------------------------------------------------------------------------------
4. STATUS 21: PLATFORM_TRANSLATION_UNSUPPORTED (TERMINAL RUN — HALTED)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Platform Translator (Stage 12 Operational Layer).
  - Entry Condition: Platform Translator reports that the target platform completely lacks required processing blocks (UNSUPPORTED capability; Trace P6).
  - Required Records: All Stages 01 to 12 fully populated + Translation Report documenting unsupported blocks.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Execution, Actual Audio, and EngineeringReviewRecord are barred.
  - Lifecycle Meaning: Terminal Run (Halted). Execution halted; upstream diagnosis remains frozen.
  - Permitted Continuation: None within this run. Requires platform change or a new engineering design in a separate run.

--------------------------------------------------------------------------------
5. STATUS 22: EXECUTION_BLOCKED_UNACCEPTABLE (NON-TERMINAL — GATE BLOCK)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Pre-Execution Gate (Stage 12 Operational Layer).
  - Entry Condition: Pre-execution gate detects that translator proposed DEFAULTED or APPROXIMATED mapping that violates non-negotiable preservation constraints or exceeds acceptable approximation boundaries before audio generation (Trace P7, Demonstration L4).
  - Required Records: All Stages 01 to 12 fully populated + Block Report documenting violated constraints.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: Downstream Audio Generation, Actual Outcome Evidence, EngineeringReviewRecord.
  - Lifecycle Meaning: Non-Terminal (Gate Block). Downstream execution halted BEFORE audio generation.
  - Permitted Continuation: Escalates back to `DECISION_SEALED_AWAITING_EXEC` for selection of a retained alternative candidate or revised decision.

--------------------------------------------------------------------------------
6. STATUS 23: EXECUTION_COMPLETED_AWAITING_OUT (NON-TERMINAL — IN-PROGRESS)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Execution Engine / DAW Gateway (Stage 12 Operational Layer).
  - Entry Condition: Approved configuration rendered/executed on platform; audio rendered or preset loaded; awaiting capture buffer of resulting sound.
  - Required Records: All Stages 01 to 12 fully populated + Translation Report.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: EngineeringReviewRecord.
  - Lifecycle Meaning: Non-Terminal (In-Progress). Execution complete; outcome review not yet completed.
  - Permitted Continuation: Transitions to `STATUS 24: OUTCOME_EVIDENCE_INGESTED` upon receipt and calibration of the capture buffer.

--------------------------------------------------------------------------------
7. STATUS 24: OUTCOME_EVIDENCE_INGESTED (NON-TERMINAL — IN-PROGRESS)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Evidence Intake (Stage 13 / Phase 1C.5e).
  - Entry Condition: Post-execution audio capture received; objective delta calculations computed; ready for retrospective review.
  - Required Records: All Stages 01 to 13 fully populated, including `ActualOutcomeEvidenceRecord`.
  - Optional Records: None.
  - Barred Records: None specified in the frozen status-24 row.
  - Record Timing: ActualOutcomeEvidenceRecord is present through Stage 13. EngineeringReviewRecord is produced through the subsequent Stage 14 review; its pending creation at this point is not a prohibition.
  - Lifecycle Meaning: Non-Terminal (In-Progress). Outcome evidence available for active evaluation and review.
  - Source Discrepancy Note: In Phase 1C.5a v0.3c, the transition column references `ENGINEERING_REVIEW_COMPLETED, or OUTCOME_UNEVALUABLE (25)`. The phrase `ENGINEERING_REVIEW_COMPLETED` represents explanatory transition wording describing the completion of Stage 14 review, while the authoritative lifecycle statuses resulting from completed review are Status 26 `REVIEW_COMPLETED_AWAITING_ITER` or Status 27 `CYCLE_COMPLETED_SATISFIED`.
  - Permitted Continuation: Advances to Stage 14 review, resolving to `REVIEW_COMPLETED_AWAITING_ITER`, `CYCLE_COMPLETED_SATISFIED`, or `OUTCOME_UNEVALUABLE`.

--------------------------------------------------------------------------------
8. STATUS 25: OUTCOME_UNEVALUABLE (NON-TERMINAL — REVIEW PAUSE)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Submitted audio is inadequate to verify predictions (e.g. audio silent, wrong performance played, severe uncalibrated clipping, or test unverified; Scenario F, Trace P10).
  - Required Records: All Stages 01 to 14 fully populated, including `EngineeringReviewRecord`.
  - Factor-Specific Unevaluability Assessment: The EngineeringReviewRecord documents outcome unevaluability and its evidential rationale. Each of the six inherited review factors is assessed independently. Inadequate outcome evidence does not automatically make initial evidence quality, hypothesis quality, diagnosis quality, decision quality or execution quality unevaluable. (As specifically illustrated in frozen Trace P10, outcome_quality: "UNEVALUABLE" is recorded while upstream reasoning records and qualities are evaluated independently).
  - Evidential Rationales & Independence: Assign UNEVALUABLE or the source-supported not-established meaning only where the evidence for that particular assessment is insufficient. Retain independently supported assessments with explicit evidential rationales. Do not infer that upstream reasoning was sound merely because the outcome cannot be evaluated.
  - Optional Records: None.
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Non-Terminal (Review Pause).
  - CRITICAL ARCHITECTURAL CLARIFICATION: Status 25 is a REVIEW PAUSE assessed by the Review Engine in Stage 14, NOT merely an intake-level file rejection in Stage 13 and NOT an automatic terminal failure. It requires formal evaluation records through Stage 14 documenting why the test was unverified.
  - Permitted Continuation & Frozen Resumption Semantics: The frozen 1C.5a table transition column explicitly states: `None (Lifecycle paused awaiting valid performance capture)`. Resumption occurs when valid, calibrated audio is resubmitted for the run, preserving frozen resumption semantics without inventing unsupported transition tokens.

--------------------------------------------------------------------------------
9. STATUS 26: REVIEW_COMPLETED_AWAITING_ITER (ITERATION LOOP — OPEN)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Retrospective review completed; primary goal partially unmet, trade-off severe, or contingency alternative triggered (Trace P8).
  - Required Records: All Stages 01 to 14 fully populated, including completed `EngineeringReviewRecord`.
  - Optional Records: Quarantined Candidate-Lesson Submission (`candidate_lesson_quarantine_ref`).
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Iteration Loop (Open). Review completed; requires governed next step.
  - Permitted Continuation: Transitions to `INTENT_CLARIFICATION_REQUIRED` or `EVIDENCE_ASSESSMENT (Child Run)`. Governed child-run instantiation links parent `run_id`, preserves historical provenance, and applies child-run evidence revalidation.

--------------------------------------------------------------------------------
10. STATUS 27: CYCLE_COMPLETED_SATISFIED (FULL LIFECYCLE TERMINAL — CLOSED)
--------------------------------------------------------------------------------
  - Controlling Actor / Responsibility: Review Engine (Stage 14 / Phase 1C.5e).
  - Entry Condition: Tone fully satisfies intent; review confirms primary goals achieved within trade-off bounds (Scenario A).
  - Required Records: All Stages 01 to 14 fully populated, including completed `EngineeringReviewRecord`.
  - Optional Records: Quarantined Candidate-Lesson Submission (`candidate_lesson_quarantine_ref`).
  - Barred / Not-Yet-Created Records: None.
  - Lifecycle Meaning: Full Lifecycle Terminal (Closed / Complete).
  - Permitted Continuation: None. Full lifecycle successfully closed."""
    replacements.append((s4_entries_old, s4_entries_new, "Section 4.2 Statuses 18-27 entries update", 1))

    # -------------------------------------------------------------------------
    # 5. CORRECTION 4: SECTION 13.3 action_alternate_intervention
    # -------------------------------------------------------------------------
    s13_3_old = """  - `action_alternate_intervention`: Diagnosis supported, but current locus ineffective or collateral damage excessive; revert to checkpoint and select alternative candidate from Phase 1C.5d."""
    s13_3_new = """  - `action_alternate_intervention`: The diagnostic direction remains technically and causally plausible, but evidence indicates that the current intervention or locus is ineffective, unsuitable, or introduces unacceptable collateral effects. Recommend checkpoint-aware restoration where justified and route alternative-candidate deliberation and selection to Phase 1C.5d. This recommendation does not require definitive causal confirmation and does not authorize Phase 1C.5e to select a new tool, locus or material intervention."""
    replacements.append((s13_3_old, s13_3_new, "Section 13.3 action_alternate_intervention", 1))

    # -------------------------------------------------------------------------
    # 6. SECTION 26: CORRECTION REGISTER
    # -------------------------------------------------------------------------
    s26_old = """SECTION 26 — v0.1e → v0.1f ARCHITECTURAL RECONCILIATION REGISTER (RECONCILIATION 1 THROUGH 6)
================================================================================
This register documents the execution of the Phase 1C.5e v0.1f Six Architectural Reconciliations:

+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| Reconciliation   | Title                            | Affected Sections | Defect / Ambiguity Addressed                | Architectural Rectification in v0.1f                     |
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 1 | Stage 12 Semantic Tone Design &  | Section 4.1, 6,   | Conflation of abstract reasoning with target| Explicitly distinguished the 8-step sequence across      |
|                  | Execution Boundary Reconciled    | 23.1, 25.3        | platform parameter instructions; unaligned  | Stage 11 -> 12 -> 13; affirmed platform-neutral handoff; |
|                  |                                  |                   | translation vs acceptability boundaries     | decoupled translation fidelity from acceptability; gate  |
|                  |                                  |                   |                                             | evaluates manifest before execution; simulation ≠ gate.  |
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 2 | Lifecycle Transitions & Record   | Section 4.2, 14,  | Misclassification of OUTCOME_UNEVALUABLE    | Reconciled post-decision statuses 18–27 with frozen 1C.5a|
|                  | Presence Reconciled              | 17, 25.3          | as intake reject; unmapped post-decision    | table; corrected OUTCOME_UNEVALUABLE as Review Engine    |
|                  |                                  |                   | transitions; Layer B action aliasing        | pause requiring Stage 14 records; Layer B actions decoupled|
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 3 | Inherited Record Semantics &     | Section 8, 18,    | Replacement of inherited six review factors | Restored inherited 6 factors (Evidence, Hypothesis,      |
|                  | Six-Factor Review Reconciled     | 19, 25.2, 27      | with proposed audits; missing Contract 11   | Diagnosis, Decision, Execution, Outcome quality) with    |
|                  |                                  |                   | execution deviation semantics               | rationales; mapped to proposed audits; added Contract 11.|
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 4 | Consistent Evidence-Justified    | Section 13.3, 15  | Residual requirements for proven diagnosis, | Aligned §13.3 and §15 with evidence-justified iteration; |
|                  | Iteration Architecture           |                   | "Supported & Active" cause, or monotonic    | plausibility and directional progress support refinement |
|                  |                                  |                   | convergence in boundary matrix and actions  | without proof of cause; separate routes for alternatives.|
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 5 | Scenario 19 Causal Claim         | Section 24        | Overclaimed "zero causal link" and          | Calibrated conclusion: response weakens 6 kHz explanation|
|                  | Calibration Reconciled           | (Scenario 19)     | unqualified "diagnosis falsified"; premature| without complete capsule exclusion; specified criteria   |
|                  |                                  |                   | capsule exclusion from spectral location    | for discriminating tests; preserved unresolved diagnostic|
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| RECONCILIATION 6 | Residual Downstream Commitments  | Section 23.1,     | Prescriptive downstream commitments for     | Qualified candidate lessons as quarantined for review;   |
|                  | Qualified & Deferrals Preserved  | 25.2, 28.1, 28.2  | 1C.5f integrity tools, 1C.5g migration      | affirmed 1C.5g migration ownership; non-prescriptive 1C5f|
|                  |                                  |                   | rules, and voting thresholds                | integrity and 1C5h UAT posture; open questions open.     |
+------------------+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+"""

    s26_new = """SECTION 26 — v0.1f → v0.1g BOUNDED ARCHITECTURAL CORRECTION REGISTER (CORRECTIONS 1 THROUGH 4)
================================================================================
This register documents the execution of the Phase 1C.5e v0.1g Four Bounded Architectural Corrections:

+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| Correction Title                 | Affected Sections | Defect / Ambiguity Addressed                | Architectural Rectification in v0.1g                     |
+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| CORRECTION 1 — RESTORE STATUS 19 | Section 4.2,      | Status 19 (PROCEED_BOUNDED_UNCERTAINTY) was | Restored detailed entry for Status 19 between 18 and 20; |
| DETAIL                           | Section 27.2      | omitted from the detailed §4.2 list; checklist| defined actor (Decision Engine), entry condition,        |
|                                  | (Item 3)          | referenced post-decision statuses 20–27     | required records, optional DiscriminatingRequest, barred |
|                                  |                   | instead of 18–27                            | records (none), and canonical continuation; updated §27.2|
+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| CORRECTION 2 — REMOVE THE STATUS | Section 4.2       | Status 24 entry declared                    | Replaced barred-record wording: confirmed frozen row has |
| 24 REVIEW-RECORD PROHIBITION     | (Status 24)       | EngineeringReviewRecord barred, conflating  | no barred records; documented record timing whereby Stage|
|                                  |                   | "not yet created" with a prohibition        | 14 review produces record without status 24 prohibition  |
+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| CORRECTION 3 — MAKE STATUS 25    | Section 4.2       | Status 25 entry required blanket rating of  | Replaced blanket rule with factor-specific assessment:   |
| UNEVALUABILITY FACTOR-SPECIFIC   | (Status 25)       | all six review factors as UNEVALUABLE,      | each inherited factor evaluated independently with       |
|                                  |                   | contradicting Contract 11, §22, & Trace P10 | evidential rationale; outcome unevaluability does not    |
|                                  |                   |                                             | automatically make upstream reasoning factors unevaluable|
+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+
| CORRECTION 4 — ALIGN ALTERNATIVE-| Section 13.3      | action_alternate_intervention definition in | Aligned §13.3 with §15 plausibility boundary: diagnostic |
| INTERVENTION ELIGIBILITY         |                   | §13.3 retained "Diagnosis supported" proof  | direction remains technically & causally plausible while |
|                                  |                   | requirement conflicting with §15 boundary   | locus is ineffective/unsuitable; routes candidate        |
|                                  |                   |                                             | deliberation to Phase 1C.5d without causal confirmation  |
+----------------------------------+-------------------+---------------------------------------------+----------------------------------------------------------+"""
    replacements.append((s26_old, s26_new, "Section 26 correction register", 1))

    # -------------------------------------------------------------------------
    # 7. SECTION 27.2: CHECKLIST ITEM 3
    # -------------------------------------------------------------------------
    s27_item3_old = """  [ ] 3. Are invented lifecycle status tokens completely purged, binding exclusively to frozen Statuses 20–27?"""
    s27_item3_new = """  [ ] 3. Are invented lifecycle status tokens completely purged, binding exclusively to frozen Statuses 18–27?"""
    replacements.append((s27_item3_old, s27_item3_new, "Section 27.2 checklist item 3 update", 1))

    # -------------------------------------------------------------------------
    # 8. SECTION 28.3: REVISION REGISTER
    # -------------------------------------------------------------------------
    s28_3_old = """| v0.1f   | October 2026       | Sound Engineer | Six Architectural Reconciliations Baseline.                 |
|         |                    | AI Architect   | Executes Reconciliations 1 through 6: reconciles Stage 12  |
|         |                    |                | execution boundary 8-step sequence (§§4.1, 6, 23.1, 25.3);  |
|         |                    |                | reconciles lifecycle statuses 18–27 and corrects Status 25  |
|         |                    |                | OUTCOME_UNEVALUABLE as Review Engine pause (§§4.2, 14, 17); |
|         |                    |                | restores inherited six review factors & Contract 11         |
|         |                    |                | deviations (§§8, 18, 19); aligns §13.3 & §15 iteration rules|
|         |                    |                | with evidence-justified architecture; calibrates Scenario 19|
|         |                    |                | causal claims; qualifies downstream commitments (§§23, 28); |
|         |                    |                | preserves all frozen upstream contracts; retains DRAFT.     |
+---------+--------------------+----------------+------------------------------------------------------------+"""

    s28_3_new = """| v0.1f   | October 2026       | Sound Engineer | Six Architectural Reconciliations Baseline.                 |
|         |                    | AI Architect   | Executes Reconciliations 1 through 6: reconciles Stage 12  |
|         |                    |                | execution boundary 8-step sequence (§§4.1, 6, 23.1, 25.3);  |
|         |                    |                | reconciles lifecycle statuses 18–27 and corrects Status 25  |
|         |                    |                | OUTCOME_UNEVALUABLE as Review Engine pause (§§4.2, 14, 17); |
|         |                    |                | restores inherited six review factors & Contract 11         |
|         |                    |                | deviations (§§8, 18, 19); aligns §13.3 & §15 iteration rules|
|         |                    |                | with evidence-justified architecture; calibrates Scenario 19|
|         |                    |                | causal claims; qualifies downstream commitments (§§23, 28); |
|         |                    |                | preserves all frozen upstream contracts; retains DRAFT.     |
+---------+--------------------+----------------+------------------------------------------------------------+
| v0.1g   | October 2026       | Sound Engineer | Four Bounded Architectural Corrections Baseline.             |
|         |                    | AI Architect   | Executes Corrections 1 through 4: restores §4.2 Status 19    |
|         |                    |                | detail & updates §27.2 checklist to statuses 18–27; removes  |
|         |                    |                | Status 24 EngineeringReviewRecord prohibition; makes Status  |
|         |                    |                | 25 unevaluability factor-specific (reconciled with Contract  |
|         |                    |                | 11, §22, and Trace P10); aligns §13.3 alternative-           |
|         |                    |                | intervention eligibility with §15 plausibility boundary;     |
|         |                    |                | preserves all upstream contracts; retains DRAFT status.      |
+---------+--------------------+----------------+------------------------------------------------------------+"""
    replacements.append((s28_3_old, s28_3_new, "Section 28.3 revision register update", 1))

    # -------------------------------------------------------------------------
    # 9. SECTION 28.4: FINAL ARCHITECTURAL STATUS
    # -------------------------------------------------------------------------
    s28_4_old = "This document is an architectural reconciliation draft (v0.1f)."
    s28_4_new = "This document is a bounded architectural correction draft (v0.1g)."
    replacements.append((s28_4_old, s28_4_new, "Section 28.4 draft version", 1))

    # -------------------------------------------------------------------------
    # 10. END OF SPECIFICATION MARKER
    # -------------------------------------------------------------------------
    end_old = "END OF SPECIFICATION: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1f.txt"
    end_new = "END OF SPECIFICATION: TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1g.txt"
    replacements.append((end_old, end_new, "End of spec marker", 1))

    # Apply all replacements
    output_text = text
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
    for p in prev_versions + frozen_upstreams:
        sz_after = os.path.getsize(p)
        if sz_after != prev_sizes_before[p]:
            print(f"FATAL ERROR: Immutability violation on {p}! Size changed from {prev_sizes_before[p]} to {sz_after}!")
            sys.exit(1)
    print("SUCCESS: All prior versions and frozen upstream documents preserved completely unchanged!")

if __name__ == "__main__":
    build_v01g()
