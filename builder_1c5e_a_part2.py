#!/usr/bin/env python3
"""
builder_1c5e_a_part2.py: Sections 5 to 7 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt
Phase 1C.5e Bounded Epistemic & Lifecycle Correction Specification (v0.1a)
"""

def get_part2():
    return '''================================================================================
SECTION 5 — CONSTITUTIONAL FOUNDATION: 21 PRINCIPLES VERBATIM
================================================================================
Phase 1C.5e operates in strict subordination to the 21 Principles of Sound Engineering Reasoning, established in Phase 1C.5a v0.3c Section 4.1. In compliance with CM-01, they are recited verbatim without abbreviation, paraphrase, or weakening:

Principle 1 — Problem-First Primacy:
  Engineering reasoning begins with the problem, defect, or musical goal, never with an available tool, preset, or habituated processing chain.

Principle 2 — Evidence-Grounded Observation:
  No engineering claim may be asserted without traceable grounding in observed audio, acoustic measurement, explicit user direction, or established physical constraints.

Principle 3 — Causal Precedence:
  Interventions must target the verified or plausible causal mechanism producing an acoustic defect, not merely its superficial symptom.

Principle 4 — Multi-Hypothesis Competition:
  When observed symptoms are consistent with more than one physical or acoustic cause, multiple hypotheses must be formulated and systematically evaluated.

Principle 5 — Presumptive Abstention Under Uncertainty:
  When available evidence is insufficient to distinguish competing hypotheses, the system must declare uncertainty and avoid ungrounded irreversible actions.

Principle 6 — Requirement-Driven Intervention:
  Every intervention must satisfy an explicit, solution-neutral engineering requirement derived from verified diagnostic hypotheses.

Principle 7 — Alternative Diversity:
  The system must explore genuinely diverse intervention loci (source, transducer, pre-gain, gain, post-gain, acoustic space) before selecting an action.

Principle 8 — Minimum Necessary Intervention:
  The engineer selects the least disruptive intervention capable of achieving the engineering requirement, preserving original signal integrity.

Principle 9 — Unavoidable Trade-Off Explicit Recognition:
  Every acoustic intervention introduces trade-offs. Trade-offs must be explicitly predicted, quantified where possible, and evaluated against project tolerances.

Principle 10 — Preservation Imperative:
  Critical musical qualities (transient definition, low-end weight, articulation, harmonic character) must be explicitly monitored and protected against collateral degradation.

Principle 11 — Pre-Action Reversibility & Risk Assessment:
  The risk of sonic damage, cumulative degradation, and irreversibility must be evaluated before executing any intervention.

Principle 12 — Platform Independence:
  Engineering reasoning (problem formulation, causal diagnosis, requirement definition, intervention selection) is platform-neutral and occurs prior to translation into specific tool parameters.

Principle 13 — Explicit Prediction Requirement:
  Every engineering decision must be accompanied by explicit, falsifiable predictions of intended improvements, expected trade-offs, and non-exceedance bounds.

Principle 14 — Execution Boundary Rigor:
  The transition from engineering decision to physical or digital execution must cross a formalized operational boundary with verified parameter mappings.

Principle 15 — Outcome Evidence Firewall:
  A predicted outcome is a testable expectation, not evidence of success. Actual outcome evaluation requires independent, post-intervention empirical observation.

Principle 16 — Multi-Dimensional Outcome Evaluation:
  Outcomes must be evaluated across intended improvements, preservation requirements, predicted trade-offs, and unexpected collateral effects.

Principle 17 — Causal Attribution Integrity:
  Observed changes must be causally attributed to the specific intervention, systematically ruling out external confounders, gain discrepancies, and measurement artifacts.

Principle 18 — Non-Additive Reversion Discipline:
  When an intervention fails or introduces unacceptable side effects, the system must execute clean reversion to baseline rather than applying compounding corrective patches.

Principle 19 — Retrospective Review Honesty:
  Retrospective engineering review must evaluate the validity of upstream hypotheses, diagnostic reasoning, and predictive accuracy without defensive bias.

Principle 20 — Multi-Track Evaluative Coexistence:
  Objective acoustic measurements, engineering critical listening, reference comparisons, and subjective user preferences must coexist without artificial subordination.

Principle 21 — Non-Fabrication Invariant:
  Missing evidence remains missing. Unknowns remain unknown. The system must never invent measurements, simulate certainty, or fabricate evidence to justify decisions.

================================================================================
SECTION 6 — PREDICTION CONSUMPTION & PRE-ACTION VERIFICATION
================================================================================
6.1 PREDICTION CONSUMPTION CONTRACT
Phase 1C.5e consumes two sealed upstream records delivered at the Stage 11 boundary:
  1. `EngineeringDecisionRecord` (Phase 1C.5d Contract 9): Contains the chosen `CandidateInterventionRecord`, the target intervention locus, justified engineering rationale, parameter allocations, and execution prerequisites.
  2. `PredictedOutcomeRecord` (Phase 1C.5d Contract 10): Contains the formal testable expectations generated by Phase 1C.5d prior to execution.

6.2 STRUCTURE OF CONSUMED PREDICTED OUTCOMES
In accordance with Phase 1C.5d Section 24, each `PredictedOutcomeRecord` specifies:
  - `target_improvements`: Explicit acoustic changes expected at primary frequencies, dynamic ranges, or spatial parameters.
  - `preservation_expectations`: Acoustic qualities mandated to remain intact (e.g. transient punch, body, headroom).
  - `tolerated_tradeoffs`: Explicitly anticipated secondary effects deemed acceptable during Stage 10 trade-off evaluation.
  - `non_exceedance_bounds`: Hard physical limits that, if breached, define immediate intervention failure (e.g. maximum permitted THD increase, maximum high-shelf phase smear).
  - `falsification_criteria`: Explicit acoustic observations that would prove the underlying causal diagnosis or intervention theory false.

6.3 PRE-ACTION RESPONSIBILITY VERIFICATION (CM-04)
Before authorising execution handoff to Stage 12, Phase 1C.5e must perform Pre-Action Verification. It verifies:
  1. Structural Completeness: Both `EngineeringDecisionRecord` and `PredictedOutcomeRecord` are sealed, cryptographically intact, and cross-referenced.
  2. Locus Alignment: The selected intervention matches the causal mechanism identified in `CausalDiagnosisRecord` (Phase 1C.5c).
  3. Pre-Execution Prerequisites: Prerequisites defined in Phase 1C.5d (e.g. baseline gain calibration, reference capture, bypass state verification) have been satisfied.
  4. Falsification Definition: Explicit falsification criteria are present and measurable; otherwise execution must be held until testable criteria are defined.
  5. Baseline State Checkpoint: An immutable baseline audio and parameter snapshot has been registered to enable clean reversion if required.

================================================================================
SECTION 7 — THE OUTCOME EVIDENCE FIREWALL
================================================================================
7.1 THE FIREWALL INVARIANT
  "PREDICTED OUTCOME IS AN EXPECTATION. POST-INTERVENTION OBSERVATION IS EVIDENCE."
  "UNDER NO CIRCUMSTANCE MAY AN EXPECTATION BE PROMOTED TO AN OBSERVATION WITHOUT EMPIRICAL DATA."

7.2 FIREWALL RULES
To prevent confirmation bias, illusory improvement, and automated self-deception:
  - Rule FW-01 (Strict Epistemic Isolation): The prediction engine and the outcome observation engine are decoupled. The outcome observation engine ingests raw post-intervention data without accessing prediction records until raw feature extraction is complete.
  - Rule FW-02 (Anti-Assumption Rule): The system must never assume an action succeeded simply because an execution script returned a success code (e.g. "DSP plug-in updated"). Execution success only proves that code ran; it provides zero evidence of acoustic efficacy.
  - Rule FW-03 (Anti-Conversion Rule): The system must never convert a predicted parameter into an observed metric (e.g. converting a predicted "-3 dB cut at 250 Hz" into an assertion that "250 Hz mud is reduced by 3 dB").
  - Rule FW-04 (Missing Evidence Preserved): If post-intervention audio, telemetry, or user listening feedback is missing or incomplete, the missing dimension must be explicitly recorded as `UNCERTAIN_UNMEASURED`. It must never be populated with predicted values.
  - Rule FW-05 (Temporal Precedence): Outcome evidence must have a timestamp strictly posterior to the execution timestamp recorded at Stage 12. Pre-intervention measurements cannot serve as outcome evidence.
'''
