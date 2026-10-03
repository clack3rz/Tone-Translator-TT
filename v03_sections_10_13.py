#!/usr/bin/env python3
"""
Sections 10 to 13 for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.3.txt
"""

def get_sections_10_13():
    return '''================================================================================
SECTION 10 — AUTHORITATIVE LIFECYCLE TABLE
================================================================================

10.1 THE SINGLE AUTHORITATIVE LIFECYCLE MODEL (BLOCKER B2 RESOLUTION)
To permanently eliminate conflicting lifecycle rules and fragmented container
semantics, the master lifecycle model below is declared SOLE AND AUTHORITATIVE
over all prose, examples, and challenge scenarios.

Every reasoning run operates under one active `lifecycle_status`. That status
strictly dictates which records are required, permitted, conditional, or forbidden:

+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| Lifecycle Status                    | Meaning & Context                                             | Entry Conditions                  | Responsible Owner  | Required Records       | Optional / Conditional | Strictly Forbidden     | Permitted Next States             | Classification     |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 1. INTENT_CLARIFICATION_REQUIRED    | Stated intent is ambiguous, contradictory, or incomplete.     | Raw user prompt ingested; intent  | Session / Intent   | EngineeringIntentRecord| None                   | CaseEvidence, Obs,     | EVIDENCE_ASSESSMENT_UNDERWAY,     | Non-Terminal       |
|                                     | Paused awaiting user clarification. (Trace P1).               | validator flags ambiguity.        | Validator          |                        |                        | Hypo, Diag, Dec, Pred  | ABSTAINED_INTENT_REJECTED         | (Pause)            |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 2. EVIDENCE_ASSESSMENT_UNDERWAY     | Ingesting multi-modal audio, descriptors, and manifests.      | Intent confirmed; evidence intake | Evidence Intake    | IntentRecord,          | None                   | Observations, Hypo,    | INSUFFICIENT_EVIDENCE_ABSTAINED,  | Non-Terminal       |
|                                     | Actively parsing lineage and calibration.                     | payload received.                 | Controller         | CaseEvidenceRecord     |                        | Diag, Decision, Pred   | OBSERVATIONS_FORMED               | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 3. INSUFFICIENT_EVIDENCE_ABSTAINED  | Available evidence is too sparse or uncalibrated to diagnose. | Evidence completeness is MINIMAL; | Diagnostic Intake  | IntentRecord,          | None                   | Diag, Requirement,     | None (Terminal Run; may resume via| Terminal Run       |
|                                     | Terminated to prevent blind guessing. (Trace P2).             | initial diagnosis impossible.     | Evaluator          | CaseEvidenceRecord     |                        | Decision, Pred, Handoff| new child run if data provided)   | (Abstention)       |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 4. OBSERVATIONS_FORMED              | Descriptive factual phenomena extracted and verified. Zero    | Evidence intake completed; DSP/   | Observation Engine | Intent, Evidence,      | Phenomenological       | CausalDiagnosis,       | HYPOTHESES_UNDER_EVALUATION       | Non-Terminal       |
|                                     | causal claims. Phenomenological interpretations attached.     | listening extraction finished.    |                    | ObservationRecord      | Interpretations        | Decision, Predictions  |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 5. HYPOTHESES_UNDER_EVALUATION      | Competing causal mechanisms generated and cross-referenced    | Observations formed; Phase 1C.4   | Hypothesis Engine  | Intent, Evidence, Obs, | None                   | Decision, Requirement, | DISCRIMINATING_EVIDENCE_REQUESTED,| Non-Terminal       |
|                                     | against observations. Active workspace evaluation.            | retrieval snapshot loaded.        |                    | HypothesisWorkspace    |                        | PredictedOutcome       | CAUSAL_DIAGNOSIS_RESOLVED, DEADLOCK| (In-Progress)     |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 6. DISCRIMINATING_EVIDENCE_REQUESTED| Competing hypotheses cannot be narrowed; diagnostic test      | Ambiguity detected; targeted test | Diagnostic         | Intent, Evidence, Obs, | None                   | Decision, Requirement, | EVIDENCE_ACQUISITION_PENDING,     | Non-Terminal       |
|                                     | protocol formulated and emitted. (Stage 06A).                 | viable under session context.     | Evaluator          | HypoWorkspace, Discrim |                        | PredictedOutcome       | PROCEED_BOUNDED_UNCERTAINTY       | (Transition)       |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 7. EVIDENCE_ACQUISITION_PENDING     | System paused awaiting execution of diagnostic test (e.g.     | Discriminating request emitted;   | Session Controller | Intent, Evidence, Obs, | None                   | Decision, Requirement, | EVIDENCE_ACQUISITION_COMPLETED,   | Non-Terminal       |
|                                     | dry DI capture, solo mic, bypass test).                       | waiting on user or DAW capture.   |                    | HypoWorkspace, Discrim |                        | PredictedOutcome       | EVIDENCE_UNAVAILABLE, DECLINED    | (Pause)            |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 8. EVIDENCE_ACQUISITION_COMPLETED   | Diagnostic test executed; new empirical data returned to      | New test evidence item ingested;  | Evidence Intake    | Intent, Evidence, Obs, | None                   | Decision, Requirement, | HYPOTHESES_UNDER_EVALUATION       | Non-Terminal       |
|                                     | session. Initiates child run or stage update.                 | ready for evidential update.      |                    | HypoWorkspace, Discrim |                        | PredictedOutcome       | (loops to Stage 05)               | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 9. EVIDENCE_UNAVAILABLE             | Requested diagnostic data cannot be provided (gear missing,   | User or DAW reports requested test| Diagnostic         | Intent, Evidence, Obs, | None                   | Predictions, Semantic  | PROCEED_BOUNDED_UNCERTAINTY,      | Non-Terminal       |
|                                     | technical impossibility).                                     | cannot be performed.              | Evaluator          | HypoWorkspace, Discrim |                        | Handoff                | JUSTIFIED_NO_CHANGE, ABSTAINED    | (Decision Gate)    |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 10. EVIDENCE_DECLINED               | User explicitly declines to perform the requested test.       | User declines in UI/session.      | Diagnostic Evaluat.| Intent, Evidence, Obs, | None                   | Predictions, Semantic  | PROCEED_BOUNDED_UNCERTAINTY,      | Non-Terminal       |
|                                     |                                                               |                                   |                    | HypoWorkspace, Discrim |                        | Handoff                | JUSTIFIED_NO_CHANGE, ABSTAINED    | (Decision Gate)    |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 11. EVIDENCE_INVALID_CONFOUNDED     | Diagnostic test yielded corrupted or confounded data (e.g.    | Test analysis reveals uncontrolled| Diagnostic Evaluat.| Intent, Evidence, Obs, | None                   | Decision, Requirement, | DISCRIMINATING_EVIDENCE_REQUESTED,| Non-Terminal       |
|                                     | player changed pickups during test).                          | confounders; test uninterpretable.|                    | HypoWorkspace, Discrim |                        | PredictedOutcome       | PROCEED_BOUNDED_UNCERTAINTY       | (Transition)       |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 12. EVIDENCE_INCONCLUSIVE           | Test executed validly, but result failed to distinguish the   | Result fell within overlapping    | Diagnostic Evaluat.| Intent, Evidence, Obs, | None                   | Decision, Requirement, | DISCRIMINATING_EVIDENCE_REQUESTED,| Non-Terminal       |
|                                     | competing hypotheses. (Scenario B).                           | confidence intervals.             |                    | HypoWorkspace, Discrim |                        | PredictedOutcome       | PROCEED_BOUNDED_UNCERTAINTY       | (Transition)       |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 13. CAUSAL_DIAGNOSIS_RESOLVED       | Causal diagnosis established in one of the 5 valid forms      | Evidential balance supports       | Diagnostic         | Intent, Evidence, Obs, | DiscriminatingRequest  | CandidateInterventions,| ENGINEERING_REQUIREMENT_FORMED    | Non-Terminal       |
|                                     | (isolated, contributing, competing, bounded, or deadlock).    | diagnosis variant.                | Synthesizer        | HypoWorkspace, Diag    | (if previously emitted)| Predictions, Handoff   |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 14. DIAGNOSTIC_DEADLOCK             | All candidate hypotheses falsified or mutually contradictory. | Hypotheses contradicted; zero     | Diagnostic         | Intent, Evidence, Obs, | DiscriminatingRequest  | Requirement, Candidate,| None (Terminal Run; requires      | Terminal Run       |
|                                     | No supported diagnosis possible. (Demonstration L1).          | credible mechanisms survive.      | Synthesizer        | HypoWorkspace, Diag    |                        | Decision, Pred, Handoff| structural investigation)         | (Deadlock)         |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 15. ENGINEERING_REQUIREMENT_FORMED  | Abstract, solution-neutral behavioral transformation sealed.  | Diagnosis sealed; intent goals    | Requirement        | Intent, Evidence, Obs, | DiscriminatingRequest  | CandidateInterventions,| CANDIDATE_INTERVENTIONS_GENERATED | Non-Terminal       |
|                                     | Zero equipment or processor leakage.                          | reconciled with causal locus.     | Formulator         | Hypo, Diag, Requirement|                        | Predictions, Handoff   |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 16. CANDIDATE_INTERVENTIONS_GEN     | Materially distinct technical pathways formulated across      | Requirement sealed; distinct loci | Intervention       | All above + Candidate- | None                   | EngineeringDecision,   | TRADE_OFF_ANALYSIS_COMPLETED      | Non-Terminal       |
|                                     | causally appropriate signal stages.                           | identified.                       | Generator          | InterventionRecord[]   |                        | PredictedOutcome       |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 17. CONSTRAINT_DEADLOCK             | All candidates violate non-negotiable intent constraints.     | Constraint evaluator flags 100%   | Trade-Off          | All above + Constraint-| None                   | EngineeringDecision,   | None (Terminal Run; requires user | Terminal Run       |
|                                     | No viable path forward without compromise. (Demo L2).         | candidate disqualification.       | Evaluator          | TradeOffRecord         |                        | PredictedOutcome       | relaxation of constraints)        | (Deadlock)         |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 18. JUSTIFIED_NO_CHANGE             | Analysis proves current tone is optimal or interventions      | Existing state fulfills intent    | Decision Engine    | All above + Decision,  | None                   | Downstream Semantic    | None (Terminal Run; engineering   | Terminal Run       |
|                                     | cause net degradation. (Scenario J, Trace P4).                | better than alternatives.         |                    | PredictedOutcomeRecord |                        | Tone Design Handoff    | decision is to leave as-is)       | (Complete)         |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 19. PROCEED_BOUNDED_UNCERTAINTY     | Decision formulated under surviving competing causes. Action  | Surviving ambiguity; safe,        | Decision Engine    | All above + Decision,  | DiscriminatingRequest  | None                   | DECISION_SEALED_AWAITING_EXECUTION| Non-Terminal       |
|                                     | is defensible across all options. (Trace P3).                 | bounded action available.         |                    | PredictedOutcomeRecord |                        |                        |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 20. DECISION_SEALED_AWAITING_EXEC   | Engineering decision & predictions sealed. Batch run complete;| Decision and prediction sealed;   | Decision Engine    | All Stages 01 to 11    | SemanticToneDesign     | ActualOutcomeEvidence, | PLATFORM_TRANSLATION_EVALUATED,   | Batch Complete /   |
|                                     | engineering lifecycle remains open. (Trace P5).               | ready for platform translation.   |                    | fully populated        | (if handoff generated) | EngineeringReviewRecord| EXECUTION_BLOCKED_UNACCEPTABLE    | Lifecycle Open     |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 21. PLATFORM_TRANSLATION_UNSUPPORTED| Target platform completely lacks required processing blocks.  | Platform Translator reports       | Platform           | All Stages 01 to 12    | None                   | Execution, ActualAudio,| None (Terminal Run; requires      | Terminal Run       |
|                                     | Upstream diagnosis frozen. Execution halted. (Trace P6).      | UNSUPPORTED capability.           | Translator         | + Translation Report   |                        | EngineeringReviewRecord| platform change or new design)    | (Halted)           |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 22. EXECUTION_BLOCKED_UNACCEPTABLE  | Translator proposed DEFAULTED/APPROXIMATED mapping that       | Pre-execution gate detects intent | Pre-Execution Gate | All Stages 01 to 12    | None                   | Downstream Audio       | DECISION_SEALED_AWAITING_EXECUTION| Non-Terminal       |
|                                     | violates non-negotiables. Execution blocked. (P7, L4).        | violation before audio generation.|                    | + Block Report         |                        | Generation             | (escalates to new decision/alt)   | (Gate Block)       |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 23. EXECUTION_COMPLETED_AWAITING_OUT| Approved configuration rendered/executed on platform.         | Audio rendered or preset loaded;  | Execution Engine / | All Stages 01 to 12    | None                   | EngineeringReviewRecord| OUTCOME_EVIDENCE_INGESTED         | Non-Terminal       |
|                                     | Awaiting capture of resulting sound.                          | awaiting capture buffer.          | DAW Gateway        | + Translation Report   |                        |                        |                                   | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 24. OUTCOME_EVIDENCE_INGESTED       | Post-execution audio stems and delta measurements captured.   | Audio capture received; objective | Evidence Intake    | All Stages 01 to 13    | None                   | None                   | ENGINEERING_REVIEW_COMPLETED,     | Non-Terminal       |
|                                     | Ready for retrospective review.                               | delta calculations computed.      |                    | fully populated        |                        |                        | OUTCOME_UNEVALUABLE               | (In-Progress)      |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 25. OUTCOME_UNEVALUABLE             | Submitted audio is inadequate to verify predictions (e.g.     | Audio silent, wrong performance,  | Review Engine      | All Stages 01 to 14    | None                   | None                   | None (Lifecycle paused awaiting   | Non-Terminal       |
|                                     | wrong riff played). Review unevaluable. (Scenario F, P10).    | or uncalibrated; test unverified. |                    | (Review: UNEVALUABLE)  |                        |                        | valid performance capture)        | (Review Pause)     |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 26. REVIEW_COMPLETED_AWAITING_ITER  | Retrospective review completed; goal partially unmet or trade-| Review identifies unmet goals or  | Review Engine      | All Stages 01 to 14    | Quarantined Candidate- | None                   | INTENT_CLARIFICATION_REQUIRED,    | Iteration Loop     |
|                                     | off severe. Triggers next child run. (Trace P8).              | contingency alternative trigger.  |                    | fully populated        | Lesson Submission      | EVIDENCE_ASSESSMENT (Child Run)   | (Open)             |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+
| 27. CYCLE_COMPLETED_SATISFIED       | Tone fully satisfies intent; review confirms predictions.     | Review confirms primary goals     | Review Engine      | All Stages 01 to 14    | Quarantined Candidate- | None                   | None (Full Lifecycle Terminal     | Full Lifecycle     |
|                                     | Full engineering lifecycle successfully closed. (Scenario A). | achieved within trade-off bounds. |                    | fully populated        | Lesson Submission      | Completion)                       | Terminal (Closed)  |
+-------------------------------------+---------------------------------------------------------------+-----------------------------------+--------------------+------------------------+------------------------+------------------------+-----------------------------------+--------------------+


================================================================================
SECTION 11 — PARTIAL / PAUSE / TERMINAL / RESUMPTION SEMANTICS
================================================================================

11.1 RESOLUTION OF EARLY-PAUSE DEFECT (TRACE P1)
In v0.2, Trace P1 paused for intent clarification, yet the trace container
demanded an evidence record and a knowledge retrieval snapshot. This is corrected:
  - An `EngineeringReasoningTrace` is composed strictly per the active `lifecycle_status`.
  - In `INTENT_CLARIFICATION_REQUIRED`, ONLY `EngineeringIntentRecord` is required.
  - The engine is STRICTLY FORBIDDEN from generating placeholder evidence records,
    empty retrieval snapshots, or phantom observations.

11.2 BATCH COMPLETION VS FULL LIFECYCLE COMPLETION (TRACE P5 CORRECTION)
The ambiguity in v0.2 regarding whether `DECISION_SEALED_AWAITING_EXECUTION` is
terminal is formally resolved:
  - RUN / BATCH COMPLETION: A reasoning run is complete when an `EngineeringDecisionRecord`
    and `PredictedOutcomeRecord` are sealed. The AI Sound Engineer has completed
    its cognitive task for this session.
  - FULL LIFECYCLE COMPLETION: The overarching sound engineering lifecycle remains
    OPEN. Downstream platform translation, hardware execution, audio capture,
    and retrospective review may occur asynchronously hours or days later.
  - When outcome evidence returns, it references the batch run's sealed trace,
    closing the lifecycle without mutating the historical decision.


================================================================================
SECTION 12 — PARENT / CHILD RUN & REPEATED EVIDENCE ARCHITECTURE
================================================================================

12.1 INFORMATIONAL SEMANTICS OF MULTI-PASS REASONING
Real-world engineering frequently requires multiple iterative tests. The v0.3
architecture defines explicit parent/child run semantics:

  1. `parent_run_id`: References the predecessor run that initiated the test.
  2. `child_run_id`: Unique identifier for the resumed execution pass (e.g. `run_001.1`).
  3. `inherited_sealed_records`: Records sealed in predecessor runs (e.g. `EngineeringIntentRecord`)
     are inherited by immutable reference. They are NEVER re-written or duplicated.
  4. `current_run_records`: Newly generated records (e.g. new `CaseEvidenceAssessmentRecord`,
     updated `ObservationRecord`, updated `HypothesisWorkspaceRecord`).
  5. `evidence_request_lifecycle`:
     - `REQUEST_EMITTED`: Formal diagnostic request registered.
     - `REQUEST_CLOSED_SATISFIED`: Evidence ingested and evaluated.
     - `REQUEST_CLOSED_UNRESOLVED`: Evidence was inconclusive; ambiguity remains.
     - `REQUEST_SUPERSEDED`: A new, more specific test replaces the initial request.

12.2 DEMONSTRATION OF REPEATED EVIDENCE REQUEST HISTORY
The architecture natively records multi-pass diagnostic investigations without
overwriting history:

    +─────────────────────────────────────────────────────────────+
    | RUN 001: Initial Intake & Test 1                            |
    | - Obs: 4.2 kHz high-frequency buzz.                         |
    | - Hypotheses: Cone Beaming (H1) vs Cold Clipping (H2).      |
    | - Request 1: Shift mic 1.5 inches off-axis.                 |
    | - Lifecycle Status: PAUSED_FOR_DISCRIMINATING_EVIDENCE.     |
    +──────────────────────────────┬──────────────────────────────+
                                   │
                                   ▼ [Audio Ingested via Test 1]
    +─────────────────────────────────────────────────────────────+
    | RUN 001.1 (Child of 001): Inconclusive Result & Test 2      |
    | - Result 1: 4.2 kHz drops by 1.5 dB, but buzz persists.     |
    | - Epistemic Impact: INCONCLUSIVE (H1 weakened, not dead).   |
    | - Request 1 Status: REQUEST_CLOSED_UNRESOLVED.              |
    | - Request 2 Emitted: Capture pre-amp FX loop direct tap.    |
    | - Lifecycle Status: PAUSED_FOR_DISCRIMINATING_EVIDENCE.     |
    +──────────────────────────────┬──────────────────────────────+
                                   │
                                   ▼ [Audio Ingested via Test 2]
    +─────────────────────────────────────────────────────────────+
    | RUN 001.2 (Child of 001.1): Definitive Resolution           |
    | - Result 2: FX loop signal is clean; zero 4.2 kHz buzz.     |
    | - Epistemic Impact: Falsifies H2; conclusively proves H1.   |
    | - Request 2 Status: REQUEST_CLOSED_SATISFIED.               |
    | - Diagnosis Sealed: Isolated Primary (Acoustic Cone Beaming)|
    | - Advances to Stage 08 (Engineering Requirement).           |
    +─────────────────────────────────────────────────────────────+


================================================================================
SECTION 13 — HYPOTHESIS LIFECYCLE
================================================================================

13.1 THE AUDITABLE HYPOTHESIS STATE MACHINE
All hypotheses initialize in `UNEVALUATED_CANDIDATE`. They transition through
explicit, auditable states:

  - `UNEVALUATED_CANDIDATE`: Newly generated; awaiting evidential cross-referencing.
  - `ACTIVE_CREDIBLE`: Mechanistically sound and consistent with observed phenomena.
  - `ACTIVE_STRONG`: Supported by multiple independent observations with zero anomalies.
  - `ACTIVE_MARGINAL`: Accounts for some observations but exhibits tension with others.
  - `WEAKENED_BY_CONTRADICTION`: Observed phenomena conflict with necessary consequences.
  - `FALSIFIED_AND_RETIRED`: Disproved by definitive test. Preserved in history with
    explicit `falsification_or_weakening_rationale`.
  - `UNRESOLVED_DUE_TO_DATA_LIMITATION`: Credible, but missing evidence prevents testing.

13.2 COMPETING CAUSES VS JOINT CONTRIBUTING CAUSES
The engine strictly differentiates:
  - Competing (Disjunctive) Hypotheses: Rival explanations for the SAME acoustic
    manifestation (e.g. "Microphone comb filtering" VS "Pickup phase cancellation").
    Evidence supporting one diminishes the credibility of the other.
  - Joint (Contributing) Hypotheses: Distinct physical mechanisms acting concurrently
    at different points in the signal chain (e.g. "High pickup output" AND "Loose power
    supply damping" AND "Microphone proximity"). Both are validated and retained.
'''

if __name__ == "__main__":
    print(get_sections_10_13()[:300])
