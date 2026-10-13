#!/usr/bin/env python3
"""
builder_1c5e_b_part2.py: Sections 5 to 7 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt
Phase 1C.5e Surgical Architectural Patch (v0.1b)
"""

def get_part2():
    return '''================================================================================
SECTION 5 — THE 21 FROZEN PRINCIPLES OF SOUND ENGINEERING REASONING
================================================================================
Phase 1C.5e operates in strict subordination to the 21 Principles of Sound Engineering Reasoning, established in Phase 1C.5a v0.3c. In compliance with SP-01, these 21 principles are recited verbatim without alteration, paraphrase, reordering, or substitution:

Principle 1 — Evidence Precedes Diagnosis:
  Engineering reasoning begins with observed, verifiable acoustic evidence before any diagnostic claim may be asserted.

Principle 2 — Observation Is Not Interpretation:
  Acoustic measurements and raw listening observations must remain decoupled from phenomenological or causal interpretations.

Principle 3 — Missing Evidence Is Not Negative Evidence:
  The absence of an acoustic measurement or observation is not proof that a defect or acoustic phenomenon does not exist.

Principle 4 — Symptom Does Not Identify Cause:
  Superficial auditory symptoms are ambiguous; identical symptoms can be produced by radically different physical mechanisms.

Principle 5 — Diagnosis Is Causal Where Evidence Permits:
  Diagnostic claims must target verified physical and acoustic mechanisms rather than correlation or habituated assumptions.

Principle 6 — Competing Hypotheses Survive Until Evidence Narrows Them:
  Multiple plausible causal explanations must be preserved until discriminating evidence definitively eliminates them.

Principle 7 — Context Informs but Does Not Prove Causation:
  Musical genre, arrangement density, and instrument context provide valuable priors but never substitute for empirical evidence.

Principle 8 — Engineering Intent Constrains the Solution:
  All diagnostic and intervention reasoning must align with the explicitly declared musical and technical intent.

Principle 9 — Generate Alternatives When Appropriate:
  The system must explore diverse intervention loci and methods rather than settling prematurely on a single habitual tool.

Principle 10 — Intervention Selection Follows Diagnosis:
  No corrective action may be selected or executed without an earned causal diagnosis and an explicit engineering requirement.

Principle 11 — Intervene at the Causally Appropriate Point:
  Interventions must target the root causal locus (source, transducer, pre-gain, gain, post-gain) rather than applying downstream band-aids.

Principle 12 — Predict Consequences Before Acting:
  Every engineering decision must be accompanied by explicit, falsifiable predictions of intended changes, trade-offs, and non-exceedance bounds.

Principle 13 — Every Intervention Has Potential Trade-Offs:
  No acoustic intervention is completely free of side effects; all potential trade-offs must be identified, quantified, and evaluated.

Principle 14 — Respect Parsimony / No Unjustified Intervention:
  The engineer selects the minimum necessary intervention capable of satisfying the requirement, avoiding unneeded processing.

Principle 15 — Platform Translation Operates Downstream of Engineering Reasoning:
  Engineering intent, diagnosis, requirement definition, and intervention selection are platform-neutral and occur prior to translation into specific tool or plug-in parameters.

Principle 16 — Reject Unacceptable Platform Compromises:
  If a target platform or tool cannot execute an intervention without violating engineering tolerances, the compromise must be rejected.

Principle 17 — Deterministic Code Validates Constraints; It Does Not Replace Engineering Judgment:
  Deterministic algorithmic tools and rule engines validate physical constraints and bounds; they do not supplant contextual sound engineering judgment.

Principle 18 — Evaluate Outcomes Honestly Without Circular Justification:
  Outcome evaluation must evaluate post-intervention evidence honestly against pre-action criteria without self-fulfilling confirmation bias or circular rationalization.

Principle 19 — Capture Experience for Governed Review:
  Empirical results, unexpected side effects, and verified outcomes must be systematically structured to enable rigorous learning.

Principle 20 — Independent Retrospective Review Supports Audit and Improvement:
  Retrospective engineering review must audit the entire reasoning trajectory independently, non-punitively, and without defensive bias.

Principle 21 — When Evidence Is Insufficient, Seek Discriminating Evidence Rather Than Guess:
  When available evidence cannot resolve competing hypotheses or verify an outcome, the system must seek targeted discriminating evidence rather than guessing.

--------------------------------------------------------------------------------
FROZEN ARCHITECTURAL INVARIANT:
  "UNCERTAINTY MUST SURVIVE THE DECISION."
  This invariant is not a replacement for any numbered principle. It is an independent, permanent constitutional constraint ensuring that unmeasured dimensions and unresolved ambiguities are preserved rather than suppressed.

================================================================================
SECTION 6 — PRE-ACTION VALIDATION, PREDICTION CONSUMPTION & SIMULATION LANE
================================================================================
6.1 PREDICTION CONSUMPTION CONTRACT
Phase 1C.5e consumes two sealed upstream records delivered at the Stage 11 boundary:
  1. `EngineeringDecisionRecord` (Phase 1C.5d Contract 9): The chosen candidate intervention, target locus, parameter allocation, and execution prerequisites.
  2. `PredictedOutcomeRecord` (Phase 1C.5d Contract 10): Formal testable expectations generated prior to execution (Principle 12).

6.2 PRE-ACTION VALIDATION & SIMULATION LANE (SP-05)
Phase 1C.5d explicitly delegates pre-action consequence elaboration, simulation, and predictive refinement to Phase 1C.5e.
Phase 1C.5e establishes a dedicated Pre-Action Validation Lane prior to Stage 12 dispatch:
  1. Consequence Elaboration: Deconstructing high-level predictions into measurable acoustic delta expectations across frequency, dynamics, phase, and time domains.
  2. Model-Based Simulation: Where feasible and appropriate, running predictive acoustic or DSP simulations (e.g. transfer function simulation, phase cancellation modeling, gain-staging projection) to test whether the intervention will behave as expected.
  3. Pre-Action Verification of Preservation & Trade-Offs: Verifying that simulated consequences do not breach the non-exceedance bounds defined in `ConstraintAndTradeOffEvaluationRecord`.
  4. Targeted Pre-Execution Tests: Where predictive uncertainty remains high, designing non-destructive, discriminating micro-tests (e.g. temporary bypass sweeps or brief offline test renders).
  5. Refinement of Expected Consequence Model: Updating the testable expectation model with higher-resolution bounds derived from simulation.

6.3 THE SIMULATION FIREWALL (SP-05)
A fundamental architectural law governs the Pre-Action Validation Lane:
  "SIMULATION IS NOT ACTUAL OUTCOME EVIDENCE."
  Simulated results represent refined expectations; they possess ZERO evidentiary weight regarding whether the intervention actually succeeded in real physical reality.

6.4 MATERIAL CHANGE & UPSTREAM RETURN RULE (SP-05)
If pre-action simulation or testing reveals that:
  - The engineering requirement cannot be met;
  - The chosen intervention will cause severe unexpected trade-offs;
  - The trade-offs exceed acceptable limits; or
  - The underlying causal mechanism was modeled incorrectly;
THE SYSTEM IS STRICTLY FORBIDDEN FROM EDITING THE SEALED UPSTREAM RECORDS.
The system must immediately halt Stage 12 execution handoff, issue a formal `ReturnUpstreamDirectiveRecord`, and return to the appropriate upstream stage (Phase 1C.5d Stage 08, 09, 10, or Phase 1C.5c Stage 06/07) to generate a linked, authorized child record.

================================================================================
SECTION 7 — THE OUTCOME EVIDENCE FIREWALL
================================================================================
7.1 THE FIREWALL INVARIANT (PRINCIPLE 15 & 18)
  "A PREDICTED OUTCOME IS A TESTABLE EXPECTATION. IT IS NOT EVIDENCE THAT THE INTERVENTION WORKED."
  "UNDER NO CIRCUMSTANCE MAY AN EXPECTATION BE PROMOTED TO AN OBSERVATION WITHOUT EMPIRICAL DATA."

7.2 FIREWALL RULES
To prevent circular justification (Principle 18), confirmation bias, and automated self-deception:
  - Rule FW-01 (Epistemic Decoupling): The prediction/simulation engine and the actual evidence intake engine operate under strict epistemic decoupling. Post-intervention feature extraction is performed independently of predicted targets.
  - Rule FW-02 (Anti-Assumption Rule): The system must never assume an action succeeded merely because an external execution engine reported success. Code execution only proves that instructions ran; it provides no proof of acoustic efficacy.
  - Rule FW-03 (Anti-Conversion Rule): The system must never convert a predicted parameter into an observed metric (e.g. converting a predicted "-3 dB cut" into an observed claim of "-3 dB mud reduction").
  - Rule FW-04 (Missing Evidence Preserved): If post-intervention audio, telemetry, or user listening observations are missing or incomplete, the missing dimension must be explicitly recorded as `UNCERTAIN_UNMEASURED` (Principle 3, 21). Missing evidence is never populated with simulated or predicted values.
  - Rule FW-05 (Strict Temporal Precedence): Outcome evidence must have an empirical capture timestamp strictly posterior to the Stage 12 execution timestamp. Pre-intervention captures cannot serve as outcome evidence.
'''
