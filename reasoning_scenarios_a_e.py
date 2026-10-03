#!/usr/bin/env python3
"""
Section 24 Part 1: Scenarios A to E for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.1.txt
"""

def get_scenarios_a_e():
    return '''================================================================================
SECTION 24 — CHALLENGE SCENARIO WALKTHROUGHS A–J (PART 1: SCENARIOS A–E)
================================================================================

To validate the architectural integrity of the Engineering Reasoning Architecture
and verify that all 21 Constitutional Principles are fully satisfied without
regressing into recipe lookup or scoreboard scoring, the architecture is
subjected to ten rigorous real-world sound engineering challenge scenarios.

--------------------------------------------------------------------------------
SCENARIO A: FLUBBY PALM MUTES
--------------------------------------------------------------------------------
1. Context & Raw Evidence:
   - User complaints: "My palm-muted rhythm chugs sound muddy, loose, and flubby.
     It's falling apart and farting out when I dig in on the low B string."
   - Rig Manifest: 7-string guitar with high-output passive humbuckers into a
     high-gain tube amplifier model (5150-style lead channel) into a 4x12 cabinet.
   - Captured Audio: 24-bit/48kHz direct DAW recording of heavy palm-muted riffs.

2. Factual Observations (ObservationRecord):
   - Observation 1 (Spectral/Dynamic): During low B string palm mutes (fundamentals
     60-125 Hz, harmonics 125-250 Hz), energy in the 80-180 Hz region swells by
     +8 dB relative to unmuted chordal passages.
   - Observation 2 (Temporal Envelope): Low-frequency decay time constant is
     prolonged (380 ms), lacking steep transient clamping.
   - Observation 3 (Harmonic Intermodulation): Pronounced intermodulation distortion
     manifesting as non-harmonic low-frequency "farting" / motorboating sidebands
     during initial pick transient.
   - Unobserved Domains: Pickup height distance from strings unmeasured; direct DI
     pre-amp signal not isolated in initial capture.

3. Hypotheses Considered & Grounded (HypothesisWorkspaceRecord):
   - Hypothesis A.1 (Pre-Clipping Bass Overload):
     * Locus: PRE_NONLINEAR_FILTER (Guitar output / amp input stage).
     * Mechanism: High-output pickups deliver excessive 60-150 Hz energy into the
       first high-gain tube clipping stage, driving the tube grid into deep saturation
       and bias excursion (blocking distortion), causing the power supply and coupling
       capacitors to sag and create low-frequency intermodulation flub.
     * Grounding: Phase 1C.4 Knowledge Claims on Tube Grid Current, Bias Excursion,
       and Pre-Distortion Equalization.
     * Evidential State: ACTIVE_STRONG. Explains both the intermodulation farting
       and the dynamic swelling.
   - Hypothesis A.2 (Post-Distortion Power Amp Sag & Damping):
     * Locus: POWER_SUPPLY_AND_SAG (Power amplifier section).
     * Mechanism: Heavy power amp tube conduction depletes filter capacitance,
       reducing the damping factor and allowing the speaker cone to oscillate
       loosely at cabinet resonance (~100 Hz).
     * Evidential State: ACTIVE_CREDIBLE. Explains prolonged decay, but less
       consistent with the specific harsh intermodulation sidebands.
   - Hypothesis A.3 (Acoustic Proximity Effect & Cabinet Resonance):
     * Locus: MICROPHONE_CAPSULE_TRANSDUCTION / TRANSDUCER.
     * Mechanism: Directional cardioid microphone placed 0.5 inches from the grille
     exhibits extreme proximity effect bass boost; 4x12 cabinet internal volume
     resonates at 115 Hz.
     * Evidential State: ACTIVE_CREDIBLE. Explains 80-180 Hz swell, but does NOT
       explain why intermodulation distortion is occurring inside the amplifier circuit.

4. Evidence Discrimination & Additional Evidence:
   - Ambiguity: A.1 (Pre-gain) vs A.3 (Mic proximity).
   - Discriminating Diagnostic Test: Apply a temporary pre-gain high-pass cut at
     150 Hz.
     * IF the intermodulation "farting" disappears entirely: Proves A.1 (pre-clipping).
     * IF the sound remains distorted and boomy: Indicates A.2 or A.3.
   - Execution: In this session, user supplies dry DI stem, confirming excessive
     sub-100Hz pickup output causing pre-gain clipping overload.

5. Causal Diagnosis (CausalDiagnosisRecord):
   - Diagnostic Structure: PRIMARY_AND_CONTRIBUTING_FACTORS.
   - Primary Mechanism: Pre-clipping low-frequency overload driving the high-gain
     preamp stages into asymmetrical bias excursion and blocking distortion.
   - Contributing Factor: Microphone proximity effect (+3 dB at 100 Hz) amplifying
     the low-end swell post-transduction.
   - Epistemic Bounds: Cabinet mechanical looseness not ruled out, but primary
     electrical cause is conclusively isolated.

6. Engineering Requirement (EngineeringRequirementRecord):
   - Causal Target Stage: PRE_CLIPPING_INPUT_CONDITIONING.
   - Functional Objective: Attenuate fundamental guitar energy below 130 Hz prior
     to nonlinear saturation by 4 to 6 dB with a smooth 6-12 dB/octave slope,
     preventing grid current blocking while preserving harmonic body.
   - Intent Boundary: Must NOT thin steady-state palm-mute punch in the 150-220 Hz
     zone; must retain heavy perceived weight.

7. Candidate Interventions (CandidateInterventionRecord):
   - Candidate 1 (Material Class: PRE_GAIN_ANALOG_VOICING):
     * Insert a pre-gain high-pass filter / mid-voicing overdrive block (drive at
       minimum, level boosted, tone shaping low-cut engaged at 120 Hz).
     * Locus: Directly before amplifier input.
   - Candidate 2 (Material Class: SOURCE_INSTRUMENT_MODIFICATION):
     * Lower the bass side of the guitar bridge pickup by 2 mm and engage an onboard
       bass-contour high-pass capacitor.
     * Locus: Source instrument.
   - Candidate 3 (Material Class: POST_PROCESSING_SURGICAL_INTERVENTION):
     * Insert a post-cabinet parametric dynamic EQ carving out 100-180 Hz with
       fast attack.
     * Locus: Post-capture DAW bus.

8. Constraint & Trade-off Evaluation (ConstraintAndTradeOffEvaluationRecord):
   - Candidate 1:
     * Causal Locus: Optimal (pre-clipping).
     * Efficacy: Highly effective. Eliminates intermodulation at the root.
     * Trade-off: Introduces slight pre-gain phase shift; slight elevation of input
       noise floor if drive circuit is active. Severity: ACCEPTABLE_COLLATERAL.
   - Candidate 2:
     * Causal Locus: Optimal.
     * Trade-off: Violates user convenience constraint (requires physical screwdriver
       and guitar setup alteration). Verdict: REJECTED_ON_CONSTRAINTS.
   - Candidate 3:
     * Causal Locus: INCORRECT_CAUSAL_LOCUS. Post-EQ cuts 150 Hz energy, but the
       nasty non-harmonic intermodulation distortion generated inside the preamp
       is already permanently baked into the upper midrange harmonics.
     * Trade-off: Carves out guitar body without fixing the dirty "farting" distortion.
     * Verdict: REJECTED_ON_TRADE_OFFS.

9. Engineering Decision & Prediction:
   - Selected Primary: Candidate 1 (Pre-Gain High-Pass / Analog Voicing).
   - Retained Credible Alternative: Candidate 2 (as a physical setup recommendation
     if pedal additions are undesired).
   - Residual Uncertainty: Exact guitar pickup resonant peak unmeasured; fine-tuning
     of cutoff frequency required during render.
   - Predicted Outcome:
     * Primary: 100-180 Hz palm-mute swell reduced by 5.5 dB; intermodulation
       farting completely eliminated; pick transient attack sharpened by 2.2 dB.
     * Secondary: Overall perceived gain may feel slightly leaner, requiring a
       0.5 dB increase in main preamp drive.

10. Outcome Evidence & Engineering Review (Post-Execution):
    - Actual Outcome: Post-render audio confirms tight, punchy palm mutes. FFT shows
      clean harmonic alignment without intermodulation sidebands.
    - Independence Review: Reasoning Quality = SOUND_ENGINEERING; Outcome =
      FULLY_ACHIEVED.
    - Quadrant: QUADRANT 1 (Exemplary Engineering).


--------------------------------------------------------------------------------
SCENARIO B: HARSH / FIZZY GUITAR
--------------------------------------------------------------------------------
1. Context & Raw Evidence:
   - User complaints: "The top end of this lead tone is like icepicks in my ears.
     It's shrill, buzzy, and fizzy above 4 kHz, but if I turn down the presence,
     the sound goes completely dark and lifeless."
   - Rig Manifest: British 800-style master volume amp into a 4x12 Greenback cabinet.
     Single dynamic microphone (SM57) centered directly on the dust cap cone center.

2. Factual Observations (ObservationRecord):
   - Observation 1: Severe spectral energy concentration between 3.5 kHz and 6.5 kHz
     (+9 dB relative to 1 kHz reference).
   - Observation 2: Narrowband resonance peaks at 4.2 kHz and 5.8 kHz with Q > 6.
   - Observation 3: High-frequency decay exhibits harsh, buzzy fizz lingering after
     the fundamental string vibration ceases.
   - Observation 4: Presence control attenuation drops the entire 2 kHz - 10 kHz
     shelf, causing loss of clarity in the 2.5 kHz articulation band.

3. Hypotheses Considered & Grounded (HypothesisWorkspaceRecord):
   - Hypothesis B.1 (On-Axis Microphone Transduction & Acoustic Radiation):
     * Locus: MICROPHONE_CAPSULE_TRANSDUCTION / ACOUSTIC_WAVE_PROPAGATION.
     * Mechanism: Transducer dust cap center emits intense, beam-like high-frequency
       acoustic radiation. Direct on-axis capsule placement aligns with maximum
       acoustic beaming and diaphragm breakup modes of the microphone.
     * Grounding: Phase 1C.4 Knowledge Claims on Loudspeaker Directivity Beaming,
       Dust Cap Phase Cancellation, and Dynamic Microphone Off-Axis Roll-off.
     * Evidential State: ACTIVE_STRONG.
   - Hypothesis B.2 (Power Amp Negative Feedback & Presence Phase Inversion):
     * Locus: AMPLIFIER_OPERATING_POINT_ADJUSTMENT.
     * Mechanism: Excessive Presence control reduces negative feedback at high
       frequencies, allowing power amp crossover distortion and high-order harmonics
       to enter uninhibited.
     * Evidential State: ACTIVE_CREDIBLE. Explains why turning down presence alters
       the character, but does not explain the extreme 4.2 kHz/5.8 kHz narrow spikes.
   - Hypothesis B.3 (Preamp Cold Clipper Harmonic Spikes):
     * Locus: NONLINEAR_CLIPPING_STAGE.
     * Mechanism: 800-circuit asymmetric cold-clipper generates unmusical high-order
       odd harmonics (11th, 13th, 15th) that are not being rolled off by subsequent
       filtering.
     * Evidential State: ACTIVE_CREDIBLE.

4. Evidence Discrimination & Additional Evidence:
   - Diagnostic Test: Compare frequency spectrum of an off-axis microphone position
     vs adjusting amplifier treble/presence knobs.
   - Result: Microphone capsule repositioned 1.5 inches toward the speaker cone edge.
     The 4.2 kHz and 5.8 kHz spikes drop by 7 dB while the 2 kHz - 3 kHz articulation
     shelf remains completely intact.

5. Causal Diagnosis (CausalDiagnosisRecord):
   - Diagnostic Structure: PRIMARY_AND_CONTRIBUTING_FACTORS.
   - Primary Mechanism: Severe high-frequency acoustic directivity beaming transduced
     by direct on-axis dust-cap microphone placement.
   - Contributing Factor: Upper-order harmonic generation from the master-volume
     clipping stage radiating through an un-damped speaker dust cap.

6. Engineering Requirement (EngineeringRequirementRecord):
   - Causal Target Stage: TRANSDUCER_COUPLING_AND_PLACEMENT.
   - Functional Objective: Reduce high-frequency transducer directivity capture
     above 3.8 kHz by 6-8 dB while preserving 2.0 - 3.2 kHz core attack presence.
   - Intent Boundary: Must NOT darken the sound globally; must maintain cutting
     solo presence in a dense mix.

7. Candidate Interventions (CandidateInterventionRecord):
   - Candidate 1 (Material Class: MICROPHONE_SELECTION_AND_PLACEMENT):
     * Shift microphone capsule 45 degrees off-axis and 1.5 inches outward toward
       the speaker cone sweet spot.
   - Candidate 2 (Material Class: POST_PROCESSING_SURGICAL_INTERVENTION):
     * Apply post-capture multi-notch surgical dynamic filtering at 4.2 kHz and 5.8 kHz.
   - Candidate 3 (Material Class: AMPLIFIER_OPERATING_POINT_ADJUSTMENT):
     * Reduce amp Presence control to zero and boost Treble to 10.

8. Constraint & Trade-off Evaluation (ConstraintAndTradeOffEvaluationRecord):
   - Candidate 1:
     * Causal Locus: Optimal. Solves acoustic beaming acoustically at the capture stage.
     * Trade-off: Slight reduction in extreme top-end "air" (>10 kHz). Severity: NEGLIGIBLE.
     * Verdict: RECOMMENDED_PRIMARY.
   - Candidate 2:
     * Causal Locus: Suboptimal post-capture fix. Introduces phase smearing across
     the high-mid transient region. Verdict: CREDIBLE_ALTERNATIVE.
   - Candidate 3:
     * Causal Locus: Flawed. Alters power amp feedback dynamics, creating a sterile,
       congested midrange. Verdict: REJECTED_ON_TRADE_OFFS.

9. Engineering Decision & Prediction:
   - Selected Primary: Candidate 1 (Microphone Off-Axis Cone Repositioning).
   - Retained Alternative: Candidate 2 (Surgical Dynamic EQ, if mic repositioning
     is constrained by fixed hardware).
   - Predicted Outcome: Harsh fizz at 4-6 kHz attenuated by 6.5 dB; smooth, singing
     lead tone achieved without losing 2.5 kHz cut.

10. Outcome Evidence & Engineering Review:
    - Post-render audio demonstrates creamy, singing top end with crisp pick attack.
    - Reasoning Quality: SOUND_ENGINEERING; Outcome: FULLY_ACHIEVED. Quadrant 1.


--------------------------------------------------------------------------------
SCENARIO C: WEAK PICK ATTACK
--------------------------------------------------------------------------------
1. Context & Raw Evidence:
   - User complaints: "The notes have no punch or snap when I pick fast. Every note
     turns into mush, and the front of the note gets swallowed."
   - Rig Manifest: Modern high-gain multi-stage amplifier with an inline studio
     compressor pedal placed before the amp.

2. Factual Observations (ObservationRecord):
   - Observation 1: Initial transient crest factor is exceptionally low (5.2 dB
     compared to expected 12-14 dB on isolated guitar plucks).
   - Observation 2: Transient onset time is smeared over 45 ms rather than a sharp
     2-5 ms initial transient spike.
   - Observation 3: High sustained harmonic density with zero dynamic range
     between light pick strokes and heavy attacks.

3. Hypotheses Considered & Grounded:
   - Hypothesis C.1 (Excessive Pre-Gain Compression & Fast Attack Clamping):
     * Locus: PRE_NONLINEAR_FILTER / DYNAMICS.
     * Mechanism: Compressor pedal attack time is set too fast (<5 ms), immediately
       squashing the initial transient pluck before it reaches the amplifier.
     * Evidential State: ACTIVE_STRONG.
   - Hypothesis C.2 (Preamp Saturation Saturation Clamping):
     * Locus: NONLINEAR_CLIPPING_STAGE.
     * Mechanism: Preamp gain stages are driven so deep into hard clipping that the
       signal is continuously limited, eliminating dynamic crest factor.
     * Evidential State: ACTIVE_CREDIBLE.
   - Hypothesis C.3 (Pickup Inductive Loading / Dull Cable):
     * Locus: SOURCE_INSTRUMENT.
     * Mechanism: High cable capacitance (>1000 pF) rolling off transient attack
       frequencies above 2 kHz.
     * Evidential State: ACTIVE_MARGINAL. Explains dullness, but does not explain
       complete destruction of dynamic envelope.

4. Evidence Discrimination & Additional Evidence:
   - Diagnostic Test: Bypass the inline compressor pedal.
   - Result: Crest factor immediately jumps from 5.2 dB to 11.4 dB; transient snap
     is restored, proving Hypothesis C.1 is the primary culprit.

5. Causal Diagnosis:
   - Diagnostic Structure: SINGLE_ISOLATED_CAUSE.
   - Primary Mechanism: Pre-gain compressor with ultra-fast attack clamping
     natural transient attack envelopes prior to amplifier clipping.

6. Engineering Requirement:
   - Causal Target Stage: PRE_CLIPPING_INPUT_CONDITIONING.
   - Functional Objective: Restore initial 5-15 ms transient envelope headroom
     by lengthening compressor attack time or removing unneeded pre-gain compression.
   - Intent Boundary: Maintain smooth note sustain without sacrificing attack punch.

7. Candidate Interventions:
   - Candidate 1: Lengthen compressor attack time to 25-35 ms with lower ratio (2:1).
   - Candidate 2: Completely remove compressor pedal, relying solely on natural
     tube amplifier compression.
   - Candidate 3: Post-amplifier transient designer boosting initial attack envelope.

8. Constraint & Trade-off Evaluation:
   - Candidate 2: Parsimony principle (Principle 14) applies: the compressor pedal
     serves no justifiable purpose in a high-gain rig where tube saturation already
     provides ample compression. Recommended Primary.
   - Candidate 3: Rejected as unnecessary complexity and poor causal locus.

9. Engineering Decision & Prediction:
   - Decision: Remove compressor pedal (Candidate 2) or re-voice to slow attack (Candidate 1).
   - Predicted Outcome: Attack transient crest factor increases by ~6 dB; pick
     definition restored across fast runs.

10. Outcome Evidence & Review:
    - User reports: "The guitar now snaps and tracks every note perfectly."
    - Reasoning Quality: SOUND; Outcome: FULLY_ACHIEVED.


--------------------------------------------------------------------------------
SCENARIO D: DUAL-MIC HOLLOW / NASAL SOUND
--------------------------------------------------------------------------------
1. Context & Raw Evidence:
   - User complaints: "I blended an SM57 and an R-121 ribbon mic on my cabinet to
     get a thick sound, but when I sum them together, the tone turns hollow,
     nasal, and thin—like it's inside a cardboard box."
   - Rig Manifest: 4x12 cabinet with two microphones positioned in front of the
     same speaker cone, summed to a mono bus.

2. Factual Observations (ObservationRecord):
   - Observation 1: Severe comb filtering pattern with deep notches at 1.4 kHz,
     4.2 kHz, and 7.0 kHz (notches exceeding -18 dB depth).
   - Observation 2: Severe midrange hollow nasal coloration in mono sum; disappears
     completely when either microphone is soloed.
   - Observation 3: Measured time-of-arrival delta between mic capsules: 0.36 ms
     (approx 4.8 inches path length difference in physical capsule position).

3. Hypotheses Considered & Grounded:
   - Hypothesis D.1 (Acoustic Time-of-Arrival Phase Cancellation):
     * Locus: ACOUSTIC_WAVE_PROPAGATION / TRANSDUCTION.
     * Mechanism: Ribbon element is physically recessed deeper inside its motor
       assembly compared to the dynamic mic diaphragm, creating a 0.36 ms delay.
       Summing creates destructive interference at wavelengths where delay equals
       (n + 1/2) * lambda.
     * Grounding: Phase 1C.4 Knowledge Claims on Wave Superposition, Time-Delay
       Comb Filtering, and Dual-Transducer Summation.
     * Evidential State: ACTIVE_STRONG (Conclusive mathematical match: 1/(2 * 0.00036s) = 1388 Hz).
   - Hypothesis D.2 (Electrical Polarity Inversion):
     * Locus: TRANSDUCER_COUPLING.
     * Mechanism: One microphone cable is wired pin-2 hot and the other pin-3 hot,
       creating 180-degree polarity flip across all frequencies.
     * Evidential State: WEAKENED_BY_CONTRADICTION. True polarity flip creates a
       high-pass notch at DC and broad cancellation, not periodic harmonic comb notches.
   - Hypothesis D.3 (Cabinet Internal Baffle Resonance):
     * Locus: ELECTROACOUSTIC_TRANSDUCER.
     * Evidential State: FALSIFIED. Disproved by the fact that soloing either mic
       completely eliminates the hollow nasal coloration.

4. Evidence Discrimination & Additional Evidence:
   - No additional evidence required. The mathematical calculation of comb notches
     from 0.36 ms delay matches measured FFT notches to within 1.5%.

5. Causal Diagnosis:
   - Diagnostic Structure: SINGLE_ISOLATED_CAUSE.
   - Primary Mechanism: Time-of-arrival propagation delay (0.36 ms) between dual
     capsules causing severe destructive acoustic comb filtering upon mono summation.

6. Engineering Requirement:
   - Causal Target Stage: TRANSDUCER_COUPLING_AND_PLACEMENT.
   - Functional Objective: Time-align the two transducer signals to within <0.02 ms
     (or physically align diaphragms) to eliminate acoustic comb filtering.

7. Candidate Interventions:
   - Candidate 1 (Material Class: MICROPHONE_SELECTION_AND_PLACEMENT):
     * Physically move the SM57 back by 4.8 inches or bring the ribbon forward
       until diaphragms are in the exact same phase plane.
   - Candidate 2 (Material Class: POST_PROCESSING_SURGICAL_INTERVENTION):
     * Insert a sample-delay plugin on the SM57 channel delayed by exactly 0.36 ms
       (17 samples at 48 kHz).
   - Candidate 3 (Material Class: POST_PROCESSING_SURGICAL_INTERVENTION):
     * Apply a 1.4 kHz parametric boost to EQ out the notch.

8. Constraint & Trade-off Evaluation:
   - Candidate 1: Physically pure, but difficult to calibrate without precision laser/ruler.
   - Candidate 2: Optimal digital solution. Perfect phase coherence restored with
     zero phase distortion. Recommended Primary.
   - Candidate 3: FLAWED. You cannot EQ out a comb-filtering phase cancellation;
     boosting 1.4 kHz merely pumps noise into a dead phase null. Rejected.

9. Engineering Decision & Prediction:
   - Decision: Candidate 2 (Digital Micro-Time Alignment of 0.36 ms).
   - Predicted Outcome: Comb filtering notches eliminated; midrange body restored;
     summed signal exhibits full, massive tone with combined ribbon warmth and
     dynamic punch.

10. Outcome Evidence & Review:
    - Post-alignment sum shows completely flat, reinforced midrange response.
    - Reasoning Quality: SOUND; Outcome: FULLY_ACHIEVED.


--------------------------------------------------------------------------------
SCENARIO E: HIGH-GAIN IDLE HISS
--------------------------------------------------------------------------------
1. Context & Raw Evidence:
   - User complaints: "When I stop playing, the amp produces an unbearable loud
     hissing and rushing sound. It's totally unusable in the studio."
   - Rig Manifest: Multi-gain-stage modern metal profile, noise gate threshold
     set to off, overdrive pedal boosting front of amp.

2. Factual Observations (ObservationRecord):
   - Observation 1: Idle noise floor (no guitar signal) is -38 dBFS broadband
     white/pink noise concentrated from 1 kHz to 12 kHz.
   - Observation 2: 50/60 Hz mains hum is negligible (-68 dBFS); noise is purely
     thermal / Johnson noise and shot noise.
   - Observation 3: Overdrive pedal level is set to maximum (+20 dB) with amp
     lead gain set to 8.5/10.

3. Hypotheses Considered & Grounded:
   - Hypothesis E.1 (Excessive Compounded Cascaded Gain & Thermal Noise Amplification):
     * Locus: PRE_NONLINEAR_FILTER & NONLINEAR_CLIPPING_STAGE.
     * Mechanism: +20 dB boost from pedal combined with 8.5 gain on 4 cascaded
       tube stages produces over 90 dB of total voltage gain. The microscopic
       thermal Johnson noise of the first grid resistor is amplified into full audibility.
     * Evidential State: ACTIVE_STRONG.
   - Hypothesis E.2 (Electromagnetic Radio Frequency Interference):
     * Locus: SOURCE_INSTRUMENT.
     * Mechanism: Unshielded guitar control cavity picking up ambient EMI/RFI.
     * Evidential State: ACTIVE_CREDIBLE.
   - Hypothesis E.3 (Digital Quantization or Dither Noise):
     * Locus: POST_CAPTURE_PROCESSING.
     * Evidential State: FALSIFIED. Dither noise is at -90 dBFS, not -38 dBFS.

4. Evidence Discrimination & Additional Evidence:
   - Diagnostic Test: Mute guitar volume pot to 0.
   - Result: Noise floor drops by only 2 dB (to -40 dBFS). This proves the noise
     is NOT originating from guitar pickup EMI, but is generated internally by
     the cascaded pre-gain pedal and amplifier input stages.

5. Causal Diagnosis:
   - Diagnostic Structure: PRIMARY_AND_CONTRIBUTING_FACTORS.
   - Primary Mechanism: Unnecessary compounded gain staging amplifying input stage
     thermal noise into the audible foreground.
   - Contributing Factor: Complete absence of dynamic downward expansion during idle.

6. Engineering Requirement:
   - Causal Target Stage: SYSTEM_NOISE_ATTENUATION & GAIN_STAGING.
   - Functional Objective: Reduce redundant cascaded gain while inserting a fast,
     transparent downward expander during non-playing intervals.
   - Intent Boundary: Must NOT cut off natural decaying note tails or clamp sustain.

7. Candidate Interventions:
   - Candidate 1: Reduce overdrive pedal output level by 6 dB and amp gain by 1.5;
     insert an intelligent downward expander after the preamp stage.
   - Candidate 2: Insert a hard brickwall noise gate at the very end of the signal chain.
   - Candidate 3: Apply a steep low-pass filter at 4 kHz across the entire mix.

8. Constraint & Trade-off Evaluation:
   - Candidate 1: Balanced gain staging + transparent expansion. Preserves tone,
     eliminates idle hiss. Recommended Primary.
   - Candidate 2: Chops off reverb/delay trails and creates jarring gating clicks. Rejected.
   - Candidate 3: Destroys high-end clarity of the guitar tone. Rejected.

9. Engineering Decision & Prediction:
   - Decision: Candidate 1 (Rationalize Gain Staging + Preamp-Loop Downward Expander).
   - Predicted Outcome: Idle noise floor drops from -38 dBFS to below -75 dBFS;
     zero audible hiss when silent; decaying notes sustain smoothly into silence.

10. Outcome Evidence & Review:
    - Post-test audio confirms silent idle state with zero note clamping.
    - Reasoning Quality: SOUND; Outcome: FULLY_ACHIEVED.
'''

if __name__ == "__main__":
    print(get_scenarios_a_e()[:300])
