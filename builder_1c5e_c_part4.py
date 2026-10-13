#!/usr/bin/env python3
"""
builder_1c5e_c_part4.py: Sections 11 to 13 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1c.txt
Phase 1C.5e Final Surgical Correction Pass (v0.1c)
"""

def get_part4():
    return '''================================================================================
SECTION 11 — TRADE-OFF, COLLATERAL DAMAGE & UNEXPECTED EFFECT EVALUATION
================================================================================
11.1 TRADE-OFF VERIFICATION (PRINCIPLE 13)
In Phase 1C.5d Stage 10, candidate interventions underwent trade-off deliberation recorded in `ConstraintAndTradeOffEvaluationRecord`.
Post-intervention evaluation must determine:
  1. Did predicted trade-offs actually materialize?
  2. Was the magnitude of the trade-off consistent with prediction?
  3. Did the trade-off remain acceptable within project context?
In accordance with Principle 13, trade-offs are evaluated qualitatively or quantitatively as appropriate to the domain, without dogmatic demands for numerical quantification where qualitative evaluation is technically sound.

11.2 UNEXPECTED COLLATERAL EFFECTS
Interventions frequently generate secondary consequences that were not foreseen:
  - Phase distortion from aggressive minimum-phase equalization;
  - Dynamic pumping or breathing in multiband processing;
  - Intermodulation distortion arising when saturating complex polyphonic material;
  - Unmasking of previously buried harsh resonances when cleaning low-mid mud.
When unexpected effects occur, they are recorded in an `UnexpectedOutcomeRecord` detailing acoustic character, severity, and musical impact.

11.3 REMOVAL OF UNIVERSAL NUMERIC / METHOD PRESCRIPTIONS
Phase 1C.5e eliminates all arbitrary universal numeric cutoffs across sound engineering decisions:
  - There are NO universal rules such as "mandatory ±0.1 LUFS matching everywhere", "mandatory 1/24-octave FFT", "mandatory 20 ms transient analysis window", or "fixed 1% THD limit".
  - In professional sound engineering:
    * An acoustic fingerpicking guitar may tolerate zero added THD (>0.1% unacceptable), whereas an aggressive industrial bass synth intentionally benefits from heavy saturation.
    * A high-Q notch on a stationary whistle requires narrow FFT binning, whereas broad vocal warmth adjustments are evaluated across octave-fraction bands.
  - All measurement methods, integration windows, and tolerance thresholds must be CASE-SPECIFIC, QUESTION-RELATIVE, and REQUIREMENT-DERIVED.

================================================================================
SECTION 12 — CAUSAL ATTRIBUTION ARCHITECTURE & CONFOUNDER GOVERNANCE
================================================================================
12.1 THE CAUSAL ATTRIBUTION QUESTION (PRINCIPLES 5 & 18)
Did the executed intervention actually produce the observed change, or did the change result from confounding variables?
Causal attribution is never assumed. It requires rigorous confounder isolation.

12.2 COMMON SOUND ENGINEERING CONFOUNDERS
Stage 13 explicitly audits six primary confounder categories:
  1. Gain / Loudness Discrepancies: Perceptual shifts caused purely by an uncompensated output level boost from a plug-in.
  2. Performance & Take Variability: Differences in player dynamics, pick attack strength, or vocalist distance between takes.
  3. Monitoring Chain & Room Acoustics: Non-linear monitor response, room mode interference, or monitoring volume shifts.
  4. Multi-Track Masking & Arrangement Shifts: Apparent clarity caused by fader adjustments, mutes, or arrangement density changes elsewhere in the mix.
  5. Measurement Window & FFT Leakage: Mismatched time windows or non-representative analysis frames.
  6. Concurrent Processing Changes: Downstream bus compressors or limiters reacting differently to altered peak structures.

12.3 CAUSAL EXCLUSION & FALSIFICATION REPAIR (VC-05)
Phase 1C.5e establishes ten strict constitutional rules governing causal attribution:
  1. A failed remedy does NOT automatically falsify the diagnosis. An intervention may fail due to sub-optimal parameterization, wrong tool locus, or masking, while the diagnosed causal mechanism remains real.
  2. A successful remedy does NOT automatically confirm the diagnosis. A symptom may improve through coincidental broadband masking or level shifts even if the diagnosed cause was inaccurate.
  3. Excluding one cause does NOT prove another cause. Disproving pre-amp clipping does not automatically prove speaker breakup; affirmative evidence is required for every asserted cause.
  4. Directional improvement does NOT prove unique causal mechanism.
  5. Lack of symptom change is only diagnostic evidence if the test validly manipulated or isolated the hypothesized cause.
  6. Falsification requires an adequately sensitive, controlled, discriminating test (Principle 21).
  7. Confounders, execution failure, inadequate intervention magnitude, measurement limitations, and multi-causal mechanisms must remain plausible explanations where applicable.
  8. Phase 1C.5e records the outcome's epistemic impact; it does NOT unilaterally rewrite diagnostic causal models.
  9. Authoritative diagnosis revision remains strictly owned by Phase 1C.5b / 1C.5c.
  10. New intervention selection following diagnostic revision remains strictly owned by Phase 1C.5d.

Under VC-05, dogmatic claims like "If reducing a cause fails to alter the defect, the diagnosis must be falsified" are purged.
Instead:
  "If a valid discriminating test adequately isolates or removes the hypothesized causal variable and the predicted causal consequence fails under controlled conditions, the hypothesis may be weakened, excluded, or falsified at the specificity actually earned by the evidence."

================================================================================
SECTION 13 — TWO-LAYER OUTCOME EVALUATION MODEL: FINDINGS & ACTIONS
================================================================================
13.1 DECOUPLING FINDINGS FROM ACTIONS (VC-06)
Real-world sound engineering outcomes are nuanced and multi-dimensional. Forcing a complex outcome into a single closed 9-state label is artificially restrictive and erases secondary findings.
Phase 1C.5e replaces the single closed taxonomy with a two-layer model:

13.2 LAYER A — INDEPENDENT OUTCOME FINDINGS
Multiple findings can and do coexist simultaneously. They are not mutually exclusive:
  - `finding_intended_requirement_satisfied`: Target acoustic requirement achieved.
  - `finding_partial_improvement`: Directional improvement observed, but fell short of target.
  - `finding_requirement_unmet`: Target acoustic requirement not achieved.
  - `finding_preservation_intact`: All audited musical qualities remained within non-exceedance bounds.
  - `finding_preservation_breached`: One or more protected qualities degraded beyond tolerance.
  - `finding_expected_tradeoff_acceptable`: Anticipated trade-offs materialized and remain acceptable.
  - `finding_expected_tradeoff_excessive`: Anticipated trade-offs exceeded acceptable severity.
  - `finding_unexpected_adverse_effect`: Unpredicted collateral damage or artifact observed.
  - `finding_unexpected_beneficial_effect`: Unpredicted positive musical quality emerged.
  - `finding_new_symptom_observed`: Previously unobserved defect or masking issue unmasked.
  - `finding_causal_attribution_supported`: Observed change definitively linked to intervention.
  - `finding_causal_attribution_uncertain`: Confounders prevent definitive causal linkage.
  - `finding_confounded`: External variables heavily distorted the observation.
  - `finding_evidence_insufficient`: Incomplete observations across one or more dimensions.
  - `finding_diagnostic_consequence_unresolved`: Observed delta neither proves nor disproves diagnosis.

13.3 LAYER B — ENGINEERING ACTION / NEXT STEP
Based on the synthesis of Layer A findings, the system determines the justified engineering action:
  - `action_accept_and_close`: Requirement met, preservation intact; finalize and advance to Stage 14.
  - `action_retain_with_monitoring`: Minor acceptable trade-off; retain and monitor in full mix.
  - `action_bounded_refinement`: Diagnostic mechanism supported, preservation intact; authorize parameter tuning within same locus.
  - `action_alternate_intervention`: Diagnosis supported, but current locus ineffective or collateral damage excessive; revert to checkpoint and select alternative candidate from Phase 1C.5d.
  - `action_partial_reversion`: Undo a specific component of a multi-parameter change while retaining beneficial elements.
  - `action_full_reversion_to_checkpoint`: Undo current intervention completely, restoring last accepted checkpoint.
  - `action_full_reversion_to_original_baseline`: Restore original pre-intervention baseline.
  - `action_return_to_evidence_acquisition`: Request calibrated audio/telemetry from Phase 1C.5b (Stage 02/03).
  - `action_return_to_diagnosis`: Issue directive to Phase 1C.5c (Stage 06/07) to re-evaluate causal hypotheses.
  - `action_return_to_requirement_formulation`: Issue directive to Phase 1C.5d (Stage 08) to reformulate requirements.
  - `action_open_new_diagnostic_branch`: Acknowledge new unmasked symptom and branch diagnostic graph.
  - `action_escalate_to_human_engineer`: Disagreement between technical metrics and critical listening; escalate.
  - `action_abstain_under_uncertainty`: Evidence ambiguous; declare uncertainty and halt automated intervention.

13.4 PROPOSED SUMMARY LABEL (VC-06)
Where a single summary label is required for reporting, it is explicitly classified as:
`PHASE_1C5E_PROPOSED_SUMMARY` (e.g. `PROPOSED_SUMMARY_ACCEPTABLE_TRADEOFF`, `PROPOSED_SUMMARY_REVERSION_REQUIRED`).
This summary label NEVER erases or replaces the underlying Layer A findings.
'''
