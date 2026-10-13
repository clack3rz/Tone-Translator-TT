#!/usr/bin/env python3
"""
builder_1c5e_c_part2.py: Sections 5 to 7 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt
Phase 1C.5e Final Surgical Correction Pass (v0.1c)
"""

def get_part2():
    return '''================================================================================
SECTION 5 — THE 21 FROZEN PRINCIPLES OF SOUND ENGINEERING REASONING
================================================================================
Phase 1C.5e operates in strict subordination to the 21 Principles of Sound Engineering Reasoning, established in Phase 1C.5a v0.3c.
In strict compliance with VC-01, each principle is presented in a two-part decoupled structure:
  1. FROZEN PRINCIPLE: The exact verbatim principle title and text from Phase 1C.5a v0.3c.
  2. PHASE 1C.5e OPERATIONAL INTERPRETATION: A separately labelled operational explanation of how Phase 1C.5e applies the principle to post-decision outcome evaluation, iteration, and review.
Under no circumstances is an operational interpretation described as frozen or verbatim, nor are Phase 1C.5e rules merged into the frozen principle itself.

--------------------------------------------------------------------------------
PRINCIPLE 1
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  1. Evidence Precedes Diagnosis.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  In the post-decision lifecycle, actual outcome evaluation begins with captured, calibrated acoustic observations and critical listening data. Evaluation of whether an intervention succeeded or failed must never precede the acquisition of actual post-intervention evidence.

--------------------------------------------------------------------------------
PRINCIPLE 2
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  2. Observation is not Interpretation.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Raw acoustic telemetry (FFT spectra, LUFS readings, crest factor measurements) and unprocessed listening notes must be recorded independently of interpretative judgments. An observed 3 dB drop at 250 Hz is an empirical observation; asserting that "low-mid mud has been eliminated" is an interpretative claim.

--------------------------------------------------------------------------------
PRINCIPLE 3
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  3. Missing Evidence is not Negative Evidence.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  The absence of post-intervention measurement or listening feedback along a particular dimension (e.g. unmeasured transient response or uncollected vocal air telemetry) is never treated as proof that no degradation occurred. Missing evidence is explicitly logged as UNCERTAIN_UNMEASURED.

--------------------------------------------------------------------------------
PRINCIPLE 4
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  4. A Symptom Does Not Identify Its Cause.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  A change in an audible symptom following an intervention does not automatically identify the physical mechanism that produced the shift. Apparent reduction of harshness may stem from desired resonance attenuation or accidental high-frequency rolloff elsewhere in the chain.

--------------------------------------------------------------------------------
PRINCIPLE 5
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  5. Diagnosis Should Be Causal Where Evidence Permits.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Causal attribution of an observed outcome to an executed intervention requires isolating the active physical mechanism. Post-intervention evaluation audits external acoustic and processing confounders before attributing observed changes to the intervention.

--------------------------------------------------------------------------------
PRINCIPLE 6
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  6. Competing Hypotheses Survive Until Evidence Justifies Narrowing Them.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  When an unexpected outcome or partial failure occurs, all plausible explanations (e.g. sub-optimal parameter choice, incorrect intervention locus, unexpected acoustic masking, or external tracking variance) must be preserved until discriminating tests eliminate them.

--------------------------------------------------------------------------------
PRINCIPLE 7
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  7. Context Informs Reasoning but Does Not Prove Causation.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Arrangement density, musical genre, and instrumentation provide essential priors for establishing evaluation tolerances, but contextual expectations never substitute for empirical post-intervention outcome evidence.

--------------------------------------------------------------------------------
PRINCIPLE 8
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  8. Engineering Intent Constrains the Solution.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Outcome success is measured strictly against the explicitly declared engineering requirements and preservation constraints established in Stage 08. An intervention that alters the signal pleasantly but violates declared intent is not evaluated as a successful outcome.

--------------------------------------------------------------------------------
PRINCIPLE 9
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  9. Generate Alternatives When the Problem Admits Alternatives.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  When an intervention fails or incurs unacceptable trade-offs, the system does not endlessly adjust parameters at the same locus. It evaluates credible alternative intervention candidates formulated during Phase 1C.5d Stage 09.

--------------------------------------------------------------------------------
PRINCIPLE 10
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  10. Intervention Selection Follows Diagnosis.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Any corrective adjustment or iterative refinement must remain causally bound to an earned diagnosis. The system is forbidden from applying arbitrary downstream signal processing without an identified diagnostic basis.

--------------------------------------------------------------------------------
PRINCIPLE 11
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  11. Intervention Should Occur at the Causally Appropriate Point.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Interventions target the causally appropriate locus based on diagnosis and constraints, avoiding inappropriate downstream band-aids without dogmatically forcing physical intervention where DSP or other loci are appropriate. In retrospective review (Stage 14), the system audits whether the chosen intervention point was causally sound or merely convenient.

--------------------------------------------------------------------------------
PRINCIPLE 12
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  12. Predict Consequences Before Acting.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Every engineering decision must consume explicit, falsifiable predictions generated in Stage 11 before execution handoff. Post-intervention evaluation compares actual outcomes directly against these pre-action predictions.

--------------------------------------------------------------------------------
PRINCIPLE 13
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  13. Every Intervention Has Potential Trade-Offs.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  All potential trade-offs must be identified and evaluated qualitatively or quantitatively as appropriate, without dogmatically demanding numerical quantification where qualitative evaluation is technically sound. Stage 13 audits whether anticipated trade-offs materialized within acceptable bounds.

--------------------------------------------------------------------------------
PRINCIPLE 14
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  14. Parsimony: Do Not Intervene Without Justified Engineering Purpose.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  The engineer selects the minimum necessary intervention capable of satisfying the requirement. Retrospective review audits whether an outcome could have been achieved with simpler, less invasive processing.

--------------------------------------------------------------------------------
PRINCIPLE 15
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  15. Platform Translation Operates Downstream of Engineering Reasoning.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Engineering evaluation, delta analysis, and review operate in a platform-neutral conceptual space prior to and independent of external plug-in, DAW, or hardware implementation formats.

--------------------------------------------------------------------------------
PRINCIPLE 16
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  16. Reject Unacceptable Platform Compromises.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  If an execution platform introduces unacceptable latency, truncation, phase distortion, or parameter quantization that breaches engineering bounds, the execution must be rejected or halted prior to handoff.

--------------------------------------------------------------------------------
PRINCIPLE 17
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  17. Deterministic Code Validates Constraints; It Does Not Replace Sound Engineering Judgement.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Algorithmic metric checks, loudness analyzers, and constraint rules validate physical bounds and non-exceedance limits; they do not replace sound engineering listening judgment, contextual appraisal, or human aesthetic evaluation.

--------------------------------------------------------------------------------
PRINCIPLE 18
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  18. Evaluate Outcomes Honestly Without Circular Justification.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Outcome evaluation strictly separates pre-action expectations from actual evidence. The system is forbidden from circular rationalization, post-hoc criterion shifting, or asserting that an intervention succeeded merely because it was executed.

--------------------------------------------------------------------------------
PRINCIPLE 19
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  19. Capture Engineering Experience for Governed Review.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  Empirical results, predictive errors, and verified acoustic behaviors are systematically recorded in Stage 14 retrospective review records, supporting governed refinement of engineering knowledge.

--------------------------------------------------------------------------------
PRINCIPLE 20
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  20. The Deliberation Record Must Support Independent Retrospective Audit.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  The complete reasoning trail—from intent through prediction, execution telemetry, actual outcome evidence, and review—must be transparently recorded to enable external peer review without defensive obfuscation.

--------------------------------------------------------------------------------
PRINCIPLE 21
--------------------------------------------------------------------------------
FROZEN PRINCIPLE:
  21. Where Evidence is Missing, Seek Discriminating Evidence Rather Than Guessing.

PHASE 1C.5e OPERATIONAL INTERPRETATION:
  When available outcome evidence cannot confirm an effect or resolve competing hypotheses, the system requests targeted discriminating evidence or tests rather than guessing or declaring unearned victory.

--------------------------------------------------------------------------------
FROZEN ARCHITECTURAL INVARIANT:
  "UNCERTAINTY MUST SURVIVE THE DECISION."
  This invariant is not a replacement for any numbered principle. It stands as an independent, permanent constitutional constraint ensuring that unmeasured dimensions and unresolved ambiguities are preserved across evaluation and review.

================================================================================
SECTION 6 — PRE-ACTION VALIDATION, PREDICTION CONSUMPTION & SIMULATION LANE
================================================================================
6.1 PREDICTION CONSUMPTION CONTRACT
Phase 1C.5e consumes two sealed upstream records delivered at the Stage 11 boundary:
  1. `EngineeringDecisionRecord` (Phase 1C.5d Contract 9): The chosen candidate intervention, target locus, parameter allocation, and execution prerequisites.
  2. `PredictedOutcomeRecord` (Phase 1C.5d Contract 10): Formal testable expectations generated prior to execution (Principle 12).
Phase 1C.5e consumes these records strictly read-only. It has zero authority to retroactively modify or alter sealed Stage 11 decisions or predictions.

6.2 PRE-ACTION VALIDATION & SIMULATION LANE (VC-04)
Phase 1C.5d explicitly delegates pre-action consequence elaboration, simulation, and predictive refinement to Phase 1C.5e.
Phase 1C.5e establishes a dedicated Pre-Action Validation Lane prior to Stage 12 dispatch:
  1. Consequence Elaboration: Deconstructing high-level predictions into measurable acoustic delta expectations across frequency, dynamics, phase, and time domains.
  2. Model-Based Simulation: Where feasible and appropriate, running predictive acoustic or DSP simulations (e.g. transfer function simulation, phase cancellation modeling, gain-staging projection) to test whether the intervention will behave as expected.
  3. Pre-Action Verification of Preservation & Trade-Offs: Verifying that simulated consequences do not breach the non-exceedance bounds defined in `ConstraintAndTradeOffEvaluationRecord`.
  4. Targeted Pre-Execution Tests: Where predictive uncertainty remains high, designing non-destructive, discriminating micro-tests (e.g. temporary bypass sweeps or brief offline test renders).
  5. Refinement of Expected Consequence Model: Updating the testable expectation model with higher-resolution bounds derived from simulation without modifying the sealed upstream records.

6.3 THE SIMULATION FIREWALL (VC-04)
A fundamental architectural law governs the Pre-Action Validation Lane:
  "SIMULATION IS NOT ACTUAL OUTCOME EVIDENCE."
Deterministic algorithmic models and simulation routines validate physical constraints and bounds; they do not replace sound engineering judgment (Principle 17). Simulated outcomes are testable expectations; they NEVER satisfy the requirement for empirical post-intervention evidence.

================================================================================
SECTION 7 — THE OUTCOME EVIDENCE FIREWALL
================================================================================
7.1 CORE FIREWALL AXIOM (PRINCIPLE 18)
  "A PREDICTED OUTCOME IS A TESTABLE EXPECTATION. IT IS NOT EVIDENCE THAT THE INTERVENTION WORKED."
The Outcome Evidence Firewall strictly decouples expectations from observations:
  - Upstream Stage 11 predicted outcomes, pre-action simulation models, and engineer expectations exist exclusively on the EXPECTATION side of the firewall.
  - Post-intervention audio waveforms, measured telemetry, critical listening observations, and user feedback exist exclusively on the EVIDENCE side of the firewall.

7.2 FIREWALL GOVERNANCE RULES
  - Rule FW-01 (Strict Decoupling): Outcome evaluation engines must never consume predicted delta values as evidence inputs.
  - Rule FW-02 (Anti-Assumption Rule): The system must never assume an action succeeded merely because an external execution engine reported success. Code execution only proves that instructions ran; it provides no proof of acoustic efficacy.
  - Rule FW-03 (Anti-Conversion Rule): The system must never convert a predicted parameter into an observed metric (e.g. converting a predicted "-3 dB cut" into an observed claim of "-3 dB mud reduction").
  - Rule FW-04 (Missing Evidence Preserved): If post-intervention audio, telemetry, or user listening observations are missing or incomplete, the missing dimension must be explicitly recorded as `UNCERTAIN_UNMEASURED` (Principle 3, 21). Missing evidence is never populated with simulated or predicted values.
'''
