#!/usr/bin/env python3
"""
v02e_p6.py: Section 22 Part 1 (Scenarios A to F)
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2e.txt
"""

def get_v02e_p6():
    return '''================================================================================
SECTION 22 — WORKED CHALLENGE SCENARIOS A–L
================================================================================

The twelve worked challenge scenarios below serve as normative architectural benchmarks.
Each scenario demonstrates the exact boundary discipline of Phase 1C.5b:
  - Formulating factual and negative observations under strict measurement ownership;
  - Translating observations into phenomenological interpretations without causal leakage;
  - Constructing multi-locus candidate hypotheses with pair-specific relationships;
  - Cataloging explicit assumptions and unknown variables in the signal chain;
  - Defining discriminating test protocols without binary overclaims;
  - Terminating strictly at the Stage 07 handoff without prescribing interventions.


--------------------------------------------------------------------------------
SCENARIO A — BROAD INTENT, NO AUDIO, NON-DEFECT CREATIVE TASK (CORRECTIONS HYP-1, FB-C5, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Give me an aggressive 1980s-style thrash rhythm tone."
   - Audio Stems: None provided.
   - Rig Manifest: "Guitar and high-gain amp" (unspecified models, pickups, or signal path).

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 2 (Style / Era Intent: Mid-1980s Thrash Metal Rhythm).
   - Engineering Task Type: Creative Tone Creation under Ambiguity (SPEC-1).
   - Intended Musical Role: Aggressive, percussive, fast-tempo rhythm guitar tracking.
   - Non-Defect Classification (HYP-1): No acoustic defect, electronic fault, or equipment
     malfunction has been reported or observed.

3. FACTUAL / INTENT OBSERVATIONS:
   - User prompt specifies a stylistic era ("1980s thrash") and qualitative descriptor ("aggressive").
   - Telemetry verification confirms zero audio files, zero hardware model numbers, and zero
     DSP parameter values were supplied.

4. PHENOMENOLOGICAL / STYLISTIC INTERPRETATION:
   - 1980s thrash metal rhythm tone is characterized musically by rapid palm-muted tracking,
     bright pick attack articulation, tight low-frequency damping, and aggressive upper-mid bite
     to maintain clarity during double-bass drumming and fast 16th-note passages.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Historical Production Canon: The 1980s thrash era encompassed distinctly different production
     approaches across major recording studios (Claim KC-GEN-014):
     (a) British Mid-Forward Marshall Crunch (e.g. Slayer — Reign in Blood; Megadeth — Peace Sells):
         Master-volume EL34 heads boosted with mid-focused overdrives, keeping upper-mids prominent.
     (b) American Scooped-Mid High-Gain Grind (e.g. Metallica — Master of Puppets):
         Cascaded preamps with aggressive post-distortion graphic EQ V-curve cuts in the 750-800 Hz band.
     (c) Early Raw Prototype Thrash Crunch (e.g. Kill 'Em All):
         Non-master British heads pushed into power-section overdrive with bright, un-scooped presence.

6. CANDIDATE TARGET INTERPRETATIONS (CORRECTIONS HYP-1 & FB-C5):
   - Architectural Epistemic Invariant (HYP-1 & FB-C5):
     Because this task is creative tone creation without an observed physical defect,
     Tone Translator MUST NOT instantiate a causal defect hypothesis workspace.
     Instead, it formulates candidate target interpretations (alternative stylistic production directions):
   - Target Interpretation A1 (British Mid-Forward Thrash Archetype):
     * Production Direction: Mid-focused crunch emphasizing 1.5 - 3.0 kHz cut; moderate low-end roll-off.
     * Historical Analogy: 1986 British studio thrash rhythm.
     * Pairwise Relationship:
       - Counterpart A2: mutually exclusive alternative (for a single target tone).
       - Counterpart A3: mutually exclusive alternative.
   - Target Interpretation A2 (American Scooped-Mid Thrash Archetype):
     * Production Direction: Deep 750-800 Hz graphic EQ notch; enhanced sub-bass chunk and 4-5 kHz bite.
     * Historical Analogy: 1986 American studio high-gain rhythm.
     * Pairwise Relationship:
       - Counterpart A1: mutually exclusive alternative.
       - Counterpart A3: mutually exclusive alternative.
   - Target Interpretation A3 (Early Raw Prototype Thrash Archetype):
     * Production Direction: Un-scooped, open power-amp crunch with aggressive upper-presence sizzle.
     * Historical Analogy: 1983 prototype thrash rhythm.
     * Pairwise Relationship:
       - Counterpart A1: mutually exclusive alternative.
       - Counterpart A2: mutually exclusive alternative.

7. ASSUMPTIONS:
   - User is tracking high-gain electric guitar with passive or active humbuckers (Risk: MODERATE).

8. UNKNOWNS (REGISTERED IN UNKNOWN DOMAIN REGISTER):
   - Guitar tuning (E-standard vs D-standard vs Drop-D).
   - Target production aesthetic (British mid-forward vs American scooped-mid).
   - Monitoring environment and playback system.

9. CONFLICTS:
   - Latent divergence between broad user prompt ("1980s thrash") and possible hidden specific expectation.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (DISCRIMINATING CLARIFICATION):
    - Targeted Clarification Request (Principle 21): "1980s thrash guitar spans distinctly different
      tonal architectures — from the raw, mid-forward bite of early British Marshall crunch (Slayer,
      early Megadeth) to the scooped, chunky American graphic-EQ grind (Metallica). Do you have a
      specific reference track or album in mind, or should reasoning proceed under a versatile early-thrash baseline?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to silently infer "Metallica" or "Seek & Destroy".
    - TT is NOT entitled to insert a Mesa Boogie Mark IIC+ or apply an aggressive 750 Hz scoop.
    - TT is NOT entitled to design or output a specific tone preset (e.g. gain values, EQ curves).
    - STOP: Binds intent; formulates competing stylistic target interpretations; pauses for clarification.


--------------------------------------------------------------------------------
SCENARIO B — PERCEPTUAL COMPLAINT WITH SEVERAL PLAUSIBLE CAUSES (CORRECTIONS FB-C1, M-C3, D3, EC-1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My rhythm tone sounds harsh, buzzy, and piercing when I dig into chords."
   - Audio Stem: Processed guitar track (WAV, 24-bit/48 kHz, 15 seconds of high-gain chords).
   - Rig Manifest: 50W high-gain tube head, 4x12 closed-back cabinet, single dynamic mic (SM57).
   - Direct Measurement: 1/3-octave FFT reveals a distinct resonant peak elevated by +6.2 dB
     centered at 4.2 kHz (Q ≈ 3.8) relative to 1 kHz baseline during chord sustain.
     Attack transient rise time: 14 ms. Dynamic crest factor: 8.4 dB.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unanchored).
   - Engineering Task Type: Defect Troubleshooting — High-Frequency Harshness (SPEC-1).
   - Intended Musical Role: Smooth, punchy high-gain rhythm without abrasive ear fatigue.
   - Constraints: Preserve chord definition and harmonic clarity.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (FB-C1, FB-C2, M-C3):
   - Factual: Audio exhibits a +6.2 dB spectral elevation centered at 4.2 kHz (Method: 4096-pt FFT,
     Hanning window). Attack transient rise time: 14 ms. Crest factor: 8.4 dB.
   - Evidential Limitation & Unknown State (FB-C1): Audio telemetry does not provide low-frequency
     isolation or internal amplifier circuit voltages. Low-frequency blocking distortion and power-supply
     behavior were not measured and remain UNKNOWN. No fabricated tolerance figures or unmeasured
     THD percentages are asserted (FB-C1, M-C3).

4. PHENOMENOLOGICAL INTERPRETATION:
   - Upper-mid/presence energy at 4.2 kHz falls squarely within the human ear's high-sensitivity
     Fletcher-Munson region (ear canal resonance). Perceived musically as abrasive "sizzle" and
     brittle "fizz" that masks vocal intelligibility and causes rapid listener fatigue.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: High-frequency harshness in high-gain electric guitar rigs can originate
     from multiple independent electro-acoustic loci:
     (a) Acoustic Dust-Cap Beaming: Dynamic microphones placed perpendicular and on-center to
         a guitar speaker transduce directional high-frequency beaming (3.5 kHz - 5 kHz)
         concentrated at the voice-coil dust cap (Claim KC-CAB-014).
     (b) Preamp Cold Clipper Tube Harmonic Distortion: Unbypassed or cold-biased 12AX7 gain stages
         generate heavy odd-order harmonic spray (5th, 7th, 9th harmonics) when driven hard (Claim KC-AMP-032).
     (c) Amplifier Tone Stack / Presence Peaking: Excessive Presence control feedback reduction
         or Bright Cap bypass capacitor creates an electrical shelf boost in the 4 kHz octave (Claim KC-EQ-019).
     (d) Speaker Cone Breakup Resonance: Structural electromechanical standing waves in the paper cone
         can produce sharp resonant peaks between 3.5 kHz and 4.8 kHz under high SPL (Claim KC-SPK-008).

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & EC-1):
   - Hypothesis B1 (Acoustic Dust-Cap Mic Beaming):
     * Locus Descriptor: Primary: MICROPHONE_TRANSDUCTION; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Dynamic capsule positioned on-axis pointing at center dust-cap
       is transducing physical high-frequency acoustic beam.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Awaiting off-axis test; mic physical angle unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart B2: competing explanation (co-occurrence possible, but compete as dominant generator).
       - Counterpart B3: competing explanation.
   - Hypothesis B2 (Preamp Cold-Clipper Harmonic Overdrive):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Preamp gain stage driven into hard asymmetrical clipping, producing odd
       harmonic spray concentrated at 4.2 kHz.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Internal tube bias state unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart B1: competing explanation.
       - Counterpart B3: potentially joint (preamp harmonic generation and tone-stack presence shaping interact).
   - Hypothesis B3 (Amplifier Presence / Bright Circuit Over-Emphasis):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: FEEDBACK_LOOP (Power Amp NFB to Presence)
     * Proposed Mechanism: Presence potentiometer set high, reducing negative feedback at 4 kHz
       and allowing output stage to peak into inductive speaker load.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Presence knob position unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart B1: competing explanation.
       - Counterpart B2: potentially joint.

7. ASSUMPTIONS:
   - Mic was positioned near the center of the speaker (Risk: MODERATE; inferred from manifest).
   - Audio interface ADC did not hard-clip during recording (Risk: LOW; verified max peak -3.1 dBFS).

8. UNKNOWNS:
   - Exact mic angle and distance from grille cloth.
   - Physical knob positions of Presence, Treble, and Gain on amplifier head.
   - Dry DI signal (unavailable).

9. CONFLICTS:
   - None currently; all three physical mechanisms are capable of generating a 4.2 kHz peak.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (DISCRIMINATING TEST PROTOCOL — CORRECTIONS EC-1, FB-C3):
    - Discriminating Test Protocol (Principle 21):
      "To evaluate whether on-axis acoustic mic beaming is a material contributor to the 4.2 kHz harshness:
       Test: Re-record the passage with the microphone moved 1.5 inches toward the outer edge of the
       speaker cone (off-axis), keeping amplifier controls unchanged.
       Epistemic Impact (Non-Binary Updating per EC-1 & FB-C3):
       - If the 4.2 kHz peak attenuates substantially, it provides qualitative empirical evidence
         strengthening Hypothesis B1 (mic beaming), without proving beaming was the sole cause or
         excluding secondary contributions from circuit distortion or speaker cone breakup.
       - If the peak persists largely unchanged, it materially weakens Hypothesis B1 under valid test
         conditions and elevates circuit-based or electromechanical hypotheses (B2, B3) for subsequent investigation."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to declare: "The microphone position is definitely the cause."
    - TT is NOT entitled to prescribe an EQ cut or select an intervention.
    - STOP: Pauses at hypothesis workspace; offers discriminating test protocol.


--------------------------------------------------------------------------------
SCENARIO C — MEASUREMENT CLEAR BUT PERCEPTUAL SIGNIFICANCE UNCERTAIN (CORRECTIONS M-C1, FB-C1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Check my cabinet capture; does this EQ curve look okay for hard rock?"
   - Audio Stem: Isolated cabinet IR impulse response and processed rhythm stem.
   - Direct Measurement: Calibrated transfer function indicates a narrow -3.2 dB notch at 650 Hz
     (Q ≈ 4.2) in the cabinet acoustic response.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 2 (Style / Era Intent: Hard Rock Rhythm).
   - Engineering Task Type: Telemetry Verification / Contextual Acoustic Evaluation (SPEC-1).
   - Intended Musical Role: Full-mix rhythm guitar tracking.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS FB-C1 & NEG-1):
   - Factual: Cabinet impulse response exhibits a -3.2 dB attenuation notch centered at 650 Hz (Q = 4.2).
   - Evidential Limitation (FB-C1): Multi-microphone phase transfer functions and room reflection
     phase measurements were not supplied. Phase cancellation behavior across the boundary remains
     UNKNOWN. No fabricated phase angles or tolerance thresholds are asserted (FB-C1).

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTIONS EC-2 & M-C1):
   - In solo audition, a narrow notch at 650 Hz sounds slightly lean in the lower midrange.
   - Musically, whether this attenuation constitutes a problem depends on arrangement context.
     The frequency falls in the transition band between lower-mid fundamental warmth and vocal/snare body.
     Perceptual impact is context-dependent and cannot be declared an objective defect from IR data alone.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Cabinet baffle geometry, internal standing waves, and speaker acoustic
     boundary loading routinely generate natural acoustic notches between 500 Hz and 800 Hz in 4x12
     guitar enclosures (Claim KC-CAB-007).
   - Principle 3 & Principle 14: A measured physical anomaly is not automatically an engineering defect;
     Principle 14 ("Parsimony: Do Not Intervene Without Justified Engineering Purpose") forbids
     intervening without demonstrated musical purpose.

6. CAUSAL HYPOTHESIS & CONTEXTUAL INTERPRETATIONS (CORRECTION M-C1):
   - Causal Origin Hypothesis (Physical Explanation of the Notch):
     * Hypothesis C1 (Cabinet Baffle Acoustic Enclosure Loading):
       - Locus Descriptor: Primary: CABINET_ACOUSTIC; Interaction: SINGLE_LOCUS
       - Proposed Mechanism: Baffle reflection and internal cavity acoustic boundary interference
         producing a natural -3.2 dB acoustic notch at 650 Hz.
       - Epistemic Status: PLAUSIBLE_UNCONFIRMED (Consistent with physical 4x12 enclosure acoustics).
       - Pairwise Relationships: Standalone physical explanation for measured IR feature.
   - Contextual & Aesthetic Interpretations (Awaiting Mix Audition per M-C1):
     * Interpretation C-A1 (Contextually Neutral / Arrangement Separation):
       - The notch leaves natural acoustic clearance for bass guitar harmonics, snare body, or low vocal energy.
     * Interpretation C-A2 (Perceptually Detrimental Thinness):
       - In solo or sparse arrangement, the notch robs rhythm guitar of lower-mid girth and fundamental power.
     * Epistemic Separation: Neither aesthetic interpretation is placed inside `proposed_mechanism`;
       both are documented as contextual evaluations awaiting mix playback.

7. ASSUMPTIONS:
   - Guitar will be placed into a multi-instrument rock mix (Risk: LOW).

8. UNKNOWNS:
   - Full mix context (bass guitar and drums currently absent from session).
   - Player's subjective aesthetic preference regarding lower-mid fullness.

9. CONFLICTS:
   - Objective physical dip (-3.2 dB) vs engineering aesthetic utility (mix clearance vs solo fullness).

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTION EC-2):
    - Contextual Test: "The 650 Hz dip is an expected acoustic feature of many 4x12 cabinet enclosures.
      In a multi-track mix, it may naturally leave space for other midrange instruments, or it may pass
      unnoticed. If tracking in a mix, audition in context before adjusting anything. If playing solo,
      does the guitar sound thin or hollow to your ears?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to declare: "The 650 Hz notch is a defect that must be boosted."
    - TT is NOT entitled to insert a parametric EQ boost or recommend corrective equalization.
    - STOP: Preserves hypothesis balance; explains contextual engineering trade-off.


--------------------------------------------------------------------------------
SCENARIO D — USER PERCEPTION CONFLICTS WITH SPECTRAL MEASUREMENT (CORRECTIONS FB-C4, EC-3, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "The tone has way too much muddy low end; it's totally boomy and muffled."
   - Audio Stem: Processed rhythm guitar track (WAV, 24-bit/44.1 kHz).
   - Direct Measurement: Calibrated 1/3-octave FFT indicates 80-200 Hz energy is actually -4.5 dB
     BELOW standard rock baseline under stated steady-state test conditions. However, 3.5 kHz - 8 kHz
     energy is severely depressed (-9.2 dB), and lower-midrange energy (400-600 Hz) is relatively elevated (+4.1 dB).

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unanchored).
   - Engineering Task Type: Perceptual Discrepancy Investigation (SPEC-1).
   - Intended Musical Role: Tight, clear, articulate rhythm guitar.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS EC-3 & FB-C4):
   - Factual: Low-frequency energy (80-200 Hz) is -4.5 dB relative to reference baseline under stated
     measurement conditions (Method: 1/3-octave FFT, steady-state passage). Lower-midrange (400-600 Hz)
     exhibits +4.1 dB relative elevation, and high-frequency energy (3.5-8 kHz) is attenuated (-9.2 dB).
   - Perceptual Report: User explicitly reports "boomy, muddy low end, totally muffled".

4. PHENOMENOLOGICAL INTERPRETATION (CONTAINER PURITY PER FB-C4):
   - The user experiences the tone as boomy, muddy, muffled, and dark, lacking definition and percussive snap.
     In listening terms, the sound feels congested, heavy, and hooded, with thick lower-mids and an absence
     of airy brilliance or crisp transient edge.
   - Note on Container Purity (FB-C4): Explanatory mechanisms (room boundary resonance, headphone curve,
     psychoacoustic tilt) are strictly excluded from this phenomenological block and placed into the hypothesis layer.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Psychoacoustic masking and terminology ambiguity in practitioner descriptions
     (Claim KC-PSY-004; ConflictRecord CR-TERM-002). Untreated room acoustics routinely introduce
     severe 80-120 Hz room mode resonances at the listening position, causing a listener to hear
     massive bass boom that does not exist in the recorded digital file (Claim KC-ENV-011).

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CALIBRATED STATUS SC, FB-C4, D3):
   - Hypothesis D1 (High-Frequency Roll-Off Psychoacoustic Tilt):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: COMPOUND (Treble Damping + Auditory Perception)
     * Proposed Mechanism: Severe high-frequency damping (-9.2 dB above 3.5 kHz) shifts perceived tonal
       center of gravity downward, creating a dark, muffled presentation that the listener colloquially describes as "muddy".
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED.
     * Pairwise Relationships (D3):
       - Counterpart D2: competing explanation (competes with external room acoustic resonance).
       - Counterpart D3: potentially joint (spectral tilt and boxy lower-mids co-occur and reinforce dark perception).
   - Hypothesis D2 (Listening Environment Room Mode Confounder):
     * Locus Descriptor: Primary: ACOUSTIC_ENVIRONMENT; Interaction: SINGLE_LOCUS (Playback Monitoring Space)
     * Proposed Mechanism: User's monitoring space has an unmitigated standing wave resonance near 100 Hz,
       producing physical acoustic boom at the listening position absent from the recorded file.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED.
     * Pairwise Relationships (D3):
       - Counterpart D1: competing explanation.
       - Counterpart D3: competing explanation.
   - Hypothesis D3 (Lower-Mid Boxiness / Nasal Resonance):
     * Locus Descriptor: Primary: CABINET_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: +4.1 dB peak across 400-600 Hz creates congested, boxy resonance that user misdiagnoses as low-end boom.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED.
     * Pairwise Relationships (D3):
       - Counterpart D1: potentially joint.
       - Counterpart D2: competing explanation.

7. ASSUMPTIONS:
   - FFT measurement algorithm and calibration reference are accurate within stated analysis limits (Risk: LOW).

8. UNKNOWNS:
   - User monitoring setup (nearfield studio monitors vs laptop speakers vs headphones; room acoustic treatment).

9. CONFLICTS:
   - Apparent contradiction between user reported perception ("boomy low end") and physical DSP
     measurement (80-200 Hz is -4.5 dB down under steady-state FFT).

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTIONS EC-3, FB-C3):
    - Diagnostic Clarification & Test:
      "Our digital frequency analysis shows that sub-bass (80-200 Hz) is actually lean, but high
       frequencies above 3 kHz are very dark, and 500 Hz lower-mids are prominent.
       Test: Audition the track on calibrated headphones in addition to your room monitors.
       Epistemic Impact: If the boominess decreases substantially on headphones, it provides qualitative
       evidence strengthening Hypothesis D2 (monitoring room resonance), though headphone response and
       ear-coupling may introduce their own coloration. If the sensation of boominess or muddiness persists
       equally on headphones, it strengthens hypotheses involving spectral tilt (D1) or lower-mid boxiness (D3)."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to apply a high-pass filter or cut 100 Hz bass (which would destroy low-end
      fundamental energy that is already thin).
    - TT is NOT entitled to dismiss the user's perception as 'wrong' or 'delusional'.
    - STOP: Maintains unresolved conflict; provides psychoacoustic diagnostic test.


--------------------------------------------------------------------------------
SCENARIO E — NEGATIVE OBSERVATION & UNRESOLVED BROADBAND NOISE (CORRECTIONS FB-C2, TEST-1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "There is an annoying background hum/noise on my high-gain lead patch. Fix the ground loop."
   - Audio Stem: 5 seconds of silence recorded between played passages on high-gain patch.
   - Direct Measurement: High-resolution 8192-point FFT (Blackman-Harris window) applied across 20-500 Hz.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unanchored).
   - Engineering Task Type: Noise Floor Troubleshooting (SPEC-1).
   - Intended Musical Role: Clean background noise floor during silent pauses.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (FB-C2 & NEG-1):
   - Negative Observation: Discrete 50 Hz and 60 Hz fundamental mains spikes and their first 5 harmonics
     in captured audio NOT DETECTED ABOVE THRESHOLD UNDER STATED MEASUREMENT CONDITIONS (Method: 8192-point FFT,
     Blackman-Harris window, bandwidth: 20 Hz to 500 Hz, detection threshold: -72 dBFS; measured residual bins < -74 dBFS).
     Measurement Ownership Note (FB-C2): This observation confirms absence of detectable mains spikes in the
     recorded audio signal; internal power-supply ripple state remains UNKNOWN.
   - Factual Observation: Broadband uncorrelated noise observed between 2 kHz and 16 kHz with RMS level
     of -46 dBFS.

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTION 2):
   - The dominant observed noise component in the supplied capture is broadband high-frequency hiss
     rather than a detected mains-frequency component under the stated measurement conditions.
     The physical generating mechanism remains unresolved.
   - Epistemic Invariant: NOT DETECTED != DOES NOT EXIST. Mains hum could exist below the -72 dBFS
     threshold, but is currently masked or negligible relative to the -46 dBFS broadband component.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: High-gain guitar amplifiers cascade multiple vacuum tube or solid-state gain
     stages, multiplying input thermal resistance noise (Johnson-Nyquist noise) and pickup source noise
     by up to 80 dB of voltage gain (Claim KC-AMP-045). Converter front-ends and electromagnetic pickup
     interference can also introduce broadband hiss.
   - Principle 3: "Missing evidence is not negative evidence" & "Not detected != does not exist".

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & FB-C2):
   - Hypothesis E1 (High-Gain Preamp Thermal Resistance Noise):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: High preamp gain setting amplifying thermal resistance noise of input
       components and guitar pickup source impedance.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Internal component noise unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart E2: competing explanation.
       - Counterpart E3: competing explanation.
   - Hypothesis E2 (Digital Interface ADC Input Stage Noise):
     * Locus Descriptor: Primary: POST_TRANSDUCTION_SIGNAL; Interaction: SINGLE_LOCUS (ADC Stage)
     * Proposed Mechanism: Audio interface instrument preamp gain pushed into noisy upper region.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart E1: competing explanation.
       - Counterpart E3: competing explanation.
   - Hypothesis E3 (Electromagnetic RF Interference Transduced by Guitar Cavity):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Unshielded guitar wiring or unbuffered cable acting as RF antenna.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart E1: competing explanation.
       - Counterpart E2: competing explanation.

7. ASSUMPTIONS:
   - Noise file represents the actual quiescent state of the rig during performance (Risk: LOW).

8. UNKNOWNS:
   - Position of guitar volume knob during the 5 seconds of silence (was guitar muted or open?).
   - Audio interface input gain setting.

9. CONFLICTS:
   - User complaint asserts "ground loop / hum", but measurement reveals broadband high-frequency noise.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTION TEST-1 & FB-C3):
    - Low-Friction Test Protocol:
      "Does the broadband noise floor decrease materially when rolling the guitar volume pot to zero?
       Epistemic Impact (Non-Binary Updating per TEST-1):
       - If the broadband noise decreases substantially with volume rollback, it provides qualitative
         evidence that a significant noise contribution enters via or upstream of the guitar/cable path,
         though it does not prove the specific physical mechanism (e.g. pickup RF vs input thermal resistance)
         nor exclude secondary downstream noise floor contributions.
       - If the broadband noise persists largely unchanged, it weakens the hypothesis of an instrument-dominated
         noise source and strengthens hypotheses involving downstream amplification, pedalboard, or audio
         interface stages, without ruling out compound or multi-stage noise generation."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & CORRECTION 2):
    - TT is NOT entitled to declare: "The noise problem is NOT electrical mains hum." (It is merely not detected above -72 dBFS).
    - TT is NOT entitled to declare: "The noise is thermal hiss." (Thermal noise is a candidate hypothesis, not an observation).
    - TT is NOT entitled to insert a 60 Hz notch filter or prescribe a downward expander / noise gate.
    - STOP: Preserves negative observation limits; identifies competing noise mechanisms; awaits volume test.


--------------------------------------------------------------------------------
SCENARIO F — REFERENCE AUDIO + CURRENT USER RECORDING (CORRECTIONS D4, M-C3, D3, EC-4, EC-4R, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - Reference Audio File: Isolated rhythm guitar track from classic hard rock benchmark
     ("AC/DC — Highway to Hell rhythm stem", 24-bit/48 kHz).
   - User Audio File: User's recorded rhythm pass playing similar open chords on Gibson SG.
   - Comparative DSP Measurements:
     * Crest Factor: Reference is 11.4 dB; User is 7.1 dB (User audio is 4.3 dB less dynamic).
     * Spectral Delta: Reference exhibits +4.2 dB more dynamic openness in 2.5 - 4.5 kHz range;
       User exhibits +5.1 dB higher energy in 120 - 250 Hz range.
     * Metric Validity Note (M-C3 & D4): Polyphonic musical guitar material contains multiple fundamental
       frequencies and string overtones; conventional single-tone THD percentages cannot be defensibly
       asserted and are excised from this comparison (M-C3). No unsupplied replacement envelope decay
       formulas or flattened peak statistics are manufactured (D4).

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS M1 & SPEC-1):
   - Target Specificity: Tier 6 (Reference Audio + Current User Evidence Comparison).
   - Engineering Task Type: Benchmark Comparative Evaluation (SPEC-1).
   - Intended Musical Role: Replicate dynamic, punchy vintage hard rock crunch with percussive breathing.
   - Measurement Comparability Assessment (M1): Riff and instrument type are comparable (both open
     hard-rock chords on humbucker guitar); playback levels matched to -18 LUFS before comparative analysis.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (M-C3 & D4):
   - Comparative Factual:
     * User audio crest factor is 4.3 dB lower than reference (7.1 dB vs 11.4 dB).
     * User low-mid energy (120-250 Hz) is +5.1 dB higher relative to 1 kHz baseline.
     * User upper-mid presence (2.5-4.5 kHz) is -4.2 dB lower relative to reference.

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTIONS EC-4 & D4):
   - Where the reference guitar exhibits greater dynamic crest factor (11.4 dB vs 7.1 dB) and dynamic
     openness in upper-mid transients, yielding crisp chord separation and articulate snap, the user
     recording shows significantly reduced dynamic crest (lower peak-to-average dynamics), elevated low-mid
     thickness, and suppressed presence. Perceptually, the user track sounds heavily compressed, congested,
     and saturated with reduced pick attack definition.
   - Epistemic Metric-History Separation (EC-4 & D4):
     These comparative metric deltas describe the resulting signal properties, NOT its exact processing
     history. Excessive preamp gain, stompbox clipping, or digital compression remain candidate hypotheses
     explaining the measurements, rather than observed facts.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Vintage non-master volume British tube amplifiers (Marshall 1959 Super Lead)
     operating at edge-of-breakup produce low compression, high crest factor (>10 dB), and articulate transients.
     Modern cascaded preamps, excessive gain, or engaged compression squashes dynamics and generates
     heavy harmonic saturation (Claim KC-AMP-009).

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & EC-4):
   - Hypothesis F1 (Preamp Over-Saturation & Excessive Gain):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Preamp gain control set far too high, driving circuit into hard saturation
       and compressing transient peaks.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Amp gain knob setting unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart F2: potentially joint (both preamp saturation and external compression can co-occur).
       - Counterpart F3: potentially joint (pickup choice and preamp gain operate at independent loci).
   - Hypothesis F2 (In-Line Dynamic Processor / Compressor Clamping):
     * Locus Descriptor: Primary: DIGITAL_SIGNAL_PROCESSING; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: An engaged compressor/limiter pedal or DAW bus limiter clamping transient peaks.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart F1: potentially joint (co-occurring contributor to dynamic compression).
       - Counterpart F3: potentially joint.
   - Hypothesis F3 (Neck Pickup Selection or Rolled-Down Tone Pot):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: User tracking on neck pickup rather than bridge pickup, creating low-mid
       buildup and muted presence.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart F1: potentially joint.
       - Counterpart F2: potentially joint.

7. ASSUMPTIONS:
   - User guitar has passive humbuckers similar to Gibson SG specification (Risk: LOW).

8. UNKNOWNS:
   - Exact amplifier gain knob position and presence of pedals in user's physical signal path.

9. CONFLICTS (CORRECTION EC-4R):
   - None currently; the comparative evidence unambiguously establishes lower crest factor (7.1 dB vs 11.4 dB)
     and elevated lower-mids (+5.1 dB) in the user capture under the stated comparison conditions, while the
     specific physical mechanism producing that result remains unresolved (EC-4R).

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Targeted Inquiries:
      "1. Is there an active compressor pedal or DAW plugin in your chain?
       2. Can you confirm the bridge pickup was selected with tone pot on 10?
       3. Test: Record a take with amp gain rolled back by 30-40% to test dynamic bounce."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to declare: "The user must buy a 1959 Super Lead Marshall."
    - TT is NOT entitled to immediately adjust parameters in user preset.
    - STOP: Preserves comparative differential observations; frames multi-locus hypotheses.'''

if __name__ == "__main__":
    print(get_v02e_p6()[:300])
