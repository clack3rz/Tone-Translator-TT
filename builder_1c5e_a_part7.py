#!/usr/bin/env python3
"""
builder_1c5e_a_part7.py: Sections 21 to 23 for TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt
Phase 1C.5e Bounded Epistemic & Lifecycle Correction Specification (v0.1a)
"""

def get_part7():
    return '''================================================================================
SECTION 21 — HUMAN / USER EVALUATION & MULTI-TRACK COEXISTENCE
================================================================================
21.1 THE FOUR EVALUATIVE TRACKS (PRINCIPLE 20)
Sound engineering exists at the intersection of acoustic physics and human artistic emotion.
Stage 13 establishes four distinct evaluative tracks that must coexist without artificial subordination:
  1. TRACK 1: Objective Acoustic & DSP Measurements (FFT curves, LUFS, crest factor, THD).
  2. TRACK 2: Professional Critical Listening (trained auditory evaluation of timbre, balance, depth, mask dynamics).
  3. TRACK 3: Reference Track Comparison (contextual similarity to target commercial production).
  4. TRACK 4: User/Artist Subjective Experience (emotional response, perceived vibe, artistic intent).

21.2 HANDLING DIVERGENCE BETWEEN TRACKS
Divergence between tracks is natural and informative:
  - Divergence Type A (Measurement Perfect, Listening Rejects): An EQ curve perfectly flattens a resonant peak on an acoustic guitar, but critical listening reveals the instrument now sounds lifeless, plastic, and unmusical. The listening track takes precedence; the intervention must be refined or reverted.
  - Divergence Type B (Measurement Shows Trade-Off, Artist Enthusiastic): Adding heavy tube saturation increases THD to 8% and squashes dynamic range by 3 dB, but the artist loves the "vintage grit and swagger." The system must NOT override the artist by declaring technical failure; it documents the trade-off and registers user-authorized trade-off acceptance.
  - Divergence Type C (User Complains, Technical Metrics Unchanged): The user reports that the vocal sounds "distant" after an intervention, even though spectral analysis shows identical mid frequencies. This indicates a spatial or masking artifact that raw spectral metrics failed to capture. The system investigates depth and reverb reflections.

21.3 PROHIBITION OF GASLIGHTING & FORCED CONFORMITY
The system is strictly forbidden from:
  - Dismissing user perceptual feedback by asserting that "the numbers prove the track is objectively better";
  - Forcing the user to agree with algorithmic evaluations; or
  - Smoothing over genuine disagreements between critical listening and objective telemetry.
Divergences are preserved as explicit tension records in `OutcomeComparisonRecord`.

================================================================================
SECTION 22 — FAILURE MODES & PROHIBITED ANTI-PATTERNS
================================================================================
Phase 1C.5e explicitly catalogs and outlaws seven fatal architectural anti-patterns:

1. ANTI-PATTERN AP-01 (Confirmation Bias & Self-Fulfilling Success):
   - Prohibited Behavior: Assuming that because an intervention was chosen and executed, it must have achieved its goal.
   - Mandated Defense: Strict enforcement of the Outcome Evidence Firewall. Actual evidence must independently verify success.

2. ANTI-PATTERN AP-02 (Additive Stacking & Corrective Creep):
   - Prohibited Behavior: Applying additional corrective plug-ins or EQ filters on top of a failed intervention to fix the side effects created by that intervention.
   - Mandated Defense: Enforced clean reversion to baseline. Prohibit all compounding patches.

3. ANTI-PATTERN AP-03 (Goalpost Shifting & Defensive Rationalization):
   - Prohibited Behavior: Redefining the criteria of success after the action was executed (e.g. "We didn't fix the mud, but we made the guitar brighter, so it's a win!").
   - Mandated Defense: Requirements and non-exceedance bounds are locked in `EngineeringRequirementRecord` and `PredictedOutcomeRecord` prior to execution. Success is judged strictly against pre-locked criteria.

4. ANTI-PATTERN AP-04 (Infinite Iteration & Blind Parameter Hunting):
   - Prohibited Behavior: Endlessly tweaking filter frequencies or compressor thresholds without a convergent trajectory.
   - Mandated Defense: Strict anti-thrashing rules, oscillation detection, and mandatory termination to clean reversion.

5. ANTI-PATTERN AP-05 (Sacrificing Musicality for Telemetry):
   - Prohibited Behavior: Chasing flat frequency lines or arbitrary metric targets at the expense of instrument tone, punch, and soul.
   - Mandated Defense: Mandatory preservation audits across musical qualities; critical listening coexists with telemetry.

6. ANTI-PATTERN AP-06 (Causal Overreach & Premature Falsification):
   - Prohibited Behavior: Either declaring a diagnosis fully proven when external confounders were present, or throwing out a correct diagnosis simply because a single sub-optimal filter value was tried.
   - Mandated Defense: Rigorous confounder isolation; clear distinction between failed remedy parameterization and genuine diagnostic mechanism contradiction.

7. ANTI-PATTERN AP-07 (Blaming the User for System Failure):
   - Prohibited Behavior: Rationalizing bad acoustic outcomes by blaming the user's listening environment, monitoring chain, or musical tastes.
   - Mandated Defense: Honest logging of outcome divergence; non-defensive logging in `EngineeringReviewRecord`.

================================================================================
SECTION 23 — CROSS-PHASE INTERFACES & DOWNSTREAM INTEGRATION BOUNDARIES
================================================================================
23.1 INTERFACE MAP
Phase 1C.5e interfaces with adjacent lifecycle phases:
  - From Phase 1C.5d: Ingests `EngineeringDecisionRecord` and `PredictedOutcomeRecord` at Stage 11.
  - To Stage 12 Execution Engine: Hands off executable parameter instructions with pre-action verification tokens; receives execution status and telemetry receipts.
  - From Stage 12: Ingests post-intervention audio and telemetry into Stage 13.
  - To Phase 1C.5b (via Stage 02/03): Issues `ReturnUpstreamDirectiveRecord` when evidence is missing or confounded.
  - To Phase 1C.5c (via Stage 06/07): Issues `ReturnUpstreamDirectiveRecord` when post-intervention observations falsify the causal diagnosis.
  - To Phase 1C.5d (via Stage 08): Issues `ReturnUpstreamDirectiveRecord` when requirements prove unachievable or incomplete.
  - To Phase 1C.5f (Traceability & Governance): Delivers immutable `ActualOutcomeEvidenceRecord` and `EngineeringReviewRecord` for cryptographic audit sealing.
  - To Phase 1C.5g (Knowledge Migration): Delivers validated empirical lessons from Stage 14 for migration into canonical knowledge structures.
  - To Phase 1C.5h (UAT & Validation): Provides empirical validation criteria and scenario test benches.
'''
