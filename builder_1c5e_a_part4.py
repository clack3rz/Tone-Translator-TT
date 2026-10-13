#!/usr/bin/env python3
"""
builder_1c5e_a_part4.py: Sections 11 to 13 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt
Phase 1C.5e Bounded Epistemic & Lifecycle Correction Specification (v0.1a)
"""

def get_part4():
    return '''================================================================================
SECTION 11 — TRADE-OFF, COLLATERAL DAMAGE & UNEXPECTED EFFECT EVALUATION
================================================================================
11.1 TRADE-OFF VERIFICATION
In Phase 1C.5d Stage 10, candidate interventions underwent trade-off deliberation. Post-intervention evaluation must determine:
  1. Did the predicted trade-offs actually materialize?
  2. Was the magnitude of the trade-off consistent with prediction?
  3. Did the trade-off remain acceptable within the track and project context?

11.2 UNEXPECTED COLLATERAL EFFECTS
Interventions frequently generate secondary consequences that were not foreseen during prediction:
  - Phase distortion from aggressive minimum-phase equalization;
  - Dynamic pumping or breathing in multiband processing;
  - Intermodulation distortion arising when saturating complex polyphonic material;
  - Masking alterations: unmasking previously buried harsh resonances when fixing low-mid mud.
When unexpected effects occur, they are documented in an `UnexpectedOutcomeRecord` with acoustic characterization, severity classification, and musical impact.

11.3 DE-DOGMATIZATION OF UNIVERSAL NUMERIC THRESHOLDS (CM-07)
A critical flaw in simplistic evaluation systems is imposing arbitrary universal numeric cutoffs across all audio engineering decisions (e.g. "any THD > 1% is always unacceptable", or "all changes must fall within +/- 0.5 dB").
In authentic sound engineering:
  - An acoustic guitar fingerpicking ballad may have zero tolerance for added THD (>0.1% unacceptable), whereas an aggressive industrial bass synth intentionally benefits from 15% third-harmonic saturation.
  - A transient notch filter on an isolated hi-hat track may tolerate a 1.5 dB phase shift, whereas the same shift on an overhead pair causes destructive stereo comb filtering.
Tolerances must therefore be:
  - DERIVED from the specific `EngineeringRequirementRecord` and track genre/context;
  - BOUNDED by explicit non-exceedance criteria established in Stage 11;
  - AUDITED against musical preservation rather than dogmatic universal constants.

================================================================================
SECTION 12 — CAUSAL ATTRIBUTION ARCHITECTURE & CONFOUNDER GOVERNANCE
================================================================================
12.1 THE CAUSAL ATTRIBUTION QUESTION (PRINCIPLE 17)
Did the executed intervention actually produce the observed change, or did the change result from confounding variables?
Causal attribution is never assumed. It requires rigorous confounder isolation.

12.2 COMMON SOUND ENGINEERING CONFOUNDERS
Stage 13 explicitly audits six primary confounder categories:
  1. Gain/Loudness Differences: An apparent improvement in low-end punch caused purely by an inadvertent 1.2 dB output level boost from an EQ plug-in.
  2. Performance/Take Variability: Differences in player dynamics, pick attack strength, or vocalist distance from the microphone between takes.
  3. Monitoring Chain & Room Acoustics: Inconsistencies introduced by non-linear monitor response, room mode interference, or monitoring volume shifts.
  4. Multi-Track Masking & Mix Context Interactions: An apparent clearing of guitar mud that actually resulted from the bass guitar fader being lowered or a mute being applied elsewhere in the mix.
  5. Measurement Window & FFT Windowing Artifacts: Mismatched time windows, window leakage, or analyzing non-representative sections of the performance.
  6. Concurrent Processing Changes: External plug-ins, bus compressors, or master limiters reacting differently to altered peak structures.

12.3 FAILED-REMEDY VS DIAGNOSTIC FALSIFICATION DISAMBIGUATION (CM-06)
A central mandate of this specification is preventing causal overreach when an intervention does not produce the desired result.
A failed intervention DOES NOT automatically prove that the diagnosis was wrong:
  - Scenario A (Failed Remedy / Ineffective Implementation): The diagnosis was "350 Hz buildup due to room mode reflection." The engineer applied a narrow notch filter at 350 Hz with Q=10. The resonance was actually broad (Q=1.5). The intervention failed because the remedy was parameterized sub-optimally, not because the diagnosis was incorrect. The diagnosis remains valid; the intervention requires refinement or replacement.
  - Scenario B (Causal Mechanism Falsification): The diagnosis was "harshness is caused by clipping distortion in the pre-amplifier." An intervention reduced pre-amplifier gain by 12 dB, completely eliminating clipping, yet the harshness remained identical in spectral profile and perceived ear fatigue. Here, the post-intervention evidence DIRECTLY CONTRADICTS the causal mechanism: the harshness was not caused by pre-amp clipping (it was likely microphone capsule resonance). The diagnosis is FALSIFIED, requiring a formal return upstream to Stage 06/07 for re-diagnosis.

The system must evaluate whether the observed result:
  (1) Supports both diagnosis and intervention;
  (2) Supports diagnosis but indicates ineffective/sub-optimal intervention;
  (3) Contradicts and falsifies the diagnostic mechanism; or
  (4) Is confounded and unattributable due to external variables.

================================================================================
SECTION 13 — OUTCOME DISPOSITION TAXONOMY
================================================================================
Phase 1C.5e establishes a formal, non-binary, 9-member outcome disposition taxonomy:

1. `DISPOSITION_SUCCESS_INTENDED_ACHIEVED`:
   - Intended improvements fully realized within predicted bounds.
   - All preservation requirements intact.
   - Predicted trade-offs within acceptable limits; zero unexpected collateral damage.
   - Causal attribution confident.
   - Routing: Complete and proceed to Stage 14 Engineering Review.

2. `DISPOSITION_SUCCESS_ACCEPTABLE_TRADEOFF`:
   - Intended improvement substantially achieved.
   - Secondary trade-offs occurred as predicted and remain strictly acceptable within project context.
   - Preservation requirements intact.
   - Routing: Complete and proceed to Stage 14.

3. `DISPOSITION_PARTIAL_IMPROVEMENT_BOUNDED`:
   - Acoustic improvement moved in the intended direction but fell short of requirement target.
   - Diagnostic mechanism remains supported by observed delta.
   - Preservation requirements intact.
   - Routing: Authorize bounded refinement (tuning parameters within the same intervention locus).

4. `DISPOSITION_INEFFECTIVE_DIAGNOSIS_SUPPORTED`:
   - Intervention produced negligible or insufficient acoustic change.
   - Diagnostic mechanism remains plausible, but the chosen intervention tool/locus was incapable of affecting it.
   - Routing: Abandon current intervention, cleanly revert, and select alternative intervention candidate.

5. `DISPOSITION_UNACCEPTABLE_TRADEOFF`:
   - Intended improvement may have occurred, but collateral trade-offs (e.g. loss of punch, severe phase shift) exceeded non-exceedance bounds.
   - Routing: Mandatory clean reversion to baseline; evaluate alternative intervention locus.

6. `DISPOSITION_REGRESSIVE_SONIC_DAMAGE`:
   - The intervention degraded the audio signal, introducing new defects (distortion, comb filtering, pumping) or worsening the original problem.
   - Routing: Immediate mandatory clean reversion to baseline; prohibit further additive tweaking.

7. `DISPOSITION_CONTRADICTORY_DIAGNOSIS_FALSIFIED`:
   - Post-intervention evidence directly contradicts the underlying causal hypothesis (e.g. removing hypothesized cause did not alter symptom).
   - Routing: Clean reversion to baseline; issue `ReturnUpstreamDirectiveRecord` to Stage 06/07 for re-diagnosis.

8. `DISPOSITION_CONFOUNDED_UNATTRIBUTABLE`:
   - Acoustic changes cannot be causally attributed to the intervention due to uncontrolled external variables (gain shifts, take changes, mix interactions).
   - Routing: Clean reversion or hold; require controlled re-measurement and confounder isolation.

9. `DISPOSITION_INSUFFICIENT_EVIDENCE`:
   - Ingested evidence lacks required modalities or duration to evaluate the question.
   - Uncertainty survives; system refuses to declare success or failure.
   - Routing: Hold in Stage 13; request necessary evidence or human critical listening.
'''
