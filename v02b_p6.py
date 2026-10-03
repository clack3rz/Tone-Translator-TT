#!/usr/bin/env python3
"""
v02b_p6.py: Section 22 Part 1 (Scenarios A to F)
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2b.txt
"""

def get_v02b_p6():
    return '''================================================================================
SECTION 22 — WORKED CHALLENGE SCENARIOS A–L
================================================================================

22.1 ARCHITECTURAL ROLE OF WORKED CHALLENGE SCENARIOS
The twelve scenarios in this section serve exclusively as architectural demonstrations
of Phase 1C.5b principles:
  - Demonstrating evidence intake, observation formation, and phenomenological interpretation.
  - Formulating bounded, competing, and joint hypotheses across extensible signal loci and boundaries.
  - Proposing low-friction discriminating evidence requests under Principle 21.
  - Enforcing the strict handoff boundary: STOPPING at the hypothesis workspace without
    performing Phase 1C.5c causal diagnosis resolution or Phase 1C.5d intervention selection.
  - In strict compliance with Findings SC, SC-E, SC-G, C-HP, EC-1, EC-2, EC-3, and EC-4:
    * Direct observation of an acoustic feature or locus boundary does NOT automatically verify
      an internal component mechanism or total causality.
    * Unverified internal circuit mechanisms and component states are designated `PLAUSIBLE_UNCONFIRMED`.
    * `HIGHLY_PLAUSIBLE` is restricted to directly evidenced locus relationships under controlled testing.
    * Discriminating tests update hypothesis plausibility qualitatively without serving as binary proof machines.
    * Comparative metrics are decoupled from unobserved processing history.
  - All numerical values, frequencies, and decibel levels are tagged as `ILLUSTRATIVE_VALUE`
    and must not be construed as universal physical truths.


--------------------------------------------------------------------------------
SCENARIO A — BROAD INTENT VS HIDDEN SPECIFIC TARGET (SISO & INTENT BOUNDING)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Give me an aggressive 1980s-style thrash rhythm tone."
   - Audio: None supplied.
   - Rig Manifest: Declared as "Electric guitar with bridge humbucker; computer audio interface."
   - Platform Settings: Digital modeling workstation; default blank routing template.
   - Hidden Reality (Unexpressed): User internally expects an exact replication of
     James Hetfield / Kirk Hammett rhythm tone on Metallica's "Seek & Destroy" (Kill 'Em All, 1983).

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTION M1 & B2):
   - Target Specificity: Tier 2 (Style / Era Intent).
   - Intended Musical Role: Aggressive rhythm guitar for fast downpicked thrash metal riffs.
   - Constraints: Must operate on standard digital modeler platform.
   - Epistemic Boundary: Target specificity is BROAD. It establishes general genre conventions
     but does NOT identify an exact artist, album, or circuit topology.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: User prompt requests "aggressive 1980s-style thrash rhythm tone".
     No audio stems provided. Rig manifest establishes bridge humbucker into direct interface.
   - Negative Observation: No specific artist, album, track, amplifier model, or reference file
     supplied under stated session inputs.

4. PHENOMENOLOGICAL INTERPRETATION:
   - Musical Context: 1980s thrash metal rhythm demands fast transient recovery, controlled
     low-frequency damping during palm mutes, articulate pick attack, and sufficient nonlinear
     saturation for sustain without loss of chord definition.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Production conventions of 1980s thrash guitar encompass multiple distinct,
     historically validated timbral archetypes:
     (a) British Mid-Forward Crunch: High-gain modified British master-volume heads (Marshall JCM800/1959)
         boosted with pre-gain overdrive to cut sub-bass before clipping, retaining aggressive
         800 Hz - 2 kHz mid-punch (e.g. Slayer's Reign in Blood, Megadeth's Peace Sells).
     (b) American Scooped-Mid High-Gain Grind: Cascaded preamp tube gain (Mesa Boogie Mark series) with graphic
         post-distortion EQ scoop pulling 750 Hz down by 8-12 dB, pairing heavy low-end thump with
         sizzling presence (e.g. Metallica's Master of Puppets, And Justice For All).
     (c) Early Prototype Thrash (1982-1983): High-treble, raw, dry crunch with Marshall heads driven by
         distortion pedals, featuring raspy mid-bite without deep graphic scooping (Kill 'Em All era).

6. HYPOTHESES FORMED:
   - Hypothesis A1 (Mid-Forward British Thrash Archetype):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: CROSS_BOUNDARY_LOADING (Preamp to Tone Stack)
     * Proposed Mechanism: Pre-gain bass attenuation paired with focused upper-mid emphasis (1.2 kHz - 2.5 kHz)
       provides optimal articulation for rapid tempo downpicking.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION
     * Logical Relationship: COMPETING with A2.
   - Hypothesis A2 (Post-Distortion Scooped Graphic-EQ Archetype):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: SINGLE_LOCUS (Post-Distortion Graphic EQ)
     * Proposed Mechanism: Post-distortion graphic V-curve EQ scoop yields aggressive modern chunk
       at the expense of standalone midrange presence.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION
     * Logical Relationship: COMPETING with A1.

7. ASSUMPTIONS:
   - User guitar bridge humbucker has standard medium-to-high output (Risk: MODERATE).
   - User intends a studio album-style rhythm sound rather than an unmic'd live room sound (Risk: LOW).

8. UNKNOWNS:
   - Exact target album or artist aesthetic.
   - Guitar tuning (Standard E vs Eb vs D-standard).
   - Multi-track mix context (solo practice vs two guitarists, bass, and drums).

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
    - STOP: Binds intent; formulates competing stylistic hypotheses; pauses for clarification.


--------------------------------------------------------------------------------
SCENARIO B — PERCEPTUAL COMPLAINT WITH SEVERAL PLAUSIBLE CAUSES (CORRECTION EC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My rhythm tone sounds harsh, buzzy, and piercing when I dig into chords."
   - Audio Stem: Processed guitar track (WAV, 24-bit/48 kHz, 15 seconds of high-gain chords).
   - Rig Manifest: 50W high-gain tube head, 4x12 closed-back cabinet, single dynamic mic (SM57).
   - Direct Measurement: 1/3-octave FFT reveals a distinct resonant peak elevated by +6.2 dB
     centered at 4.2 kHz (Q ≈ 3.8) relative to 1 kHz baseline during chord sustain.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Troubleshooting / Defect Clarification).
   - Intended Musical Role: Smooth, punchy high-gain rhythm without abrasive ear fatigue.
   - Constraints: Preserve chord definition and harmonic clarity.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Audio exhibits a +6.2 dB spectral elevation centered at 4.2 kHz (Method: 4096-pt FFT,
     Hanning window). Attack transient rise time: 14 ms. Crest factor: 8.4 dB.
   - Negative Observation: Low-frequency blocking distortion below 100 Hz NOT DETECTED
     UNDER STATED MEASUREMENT CONDITIONS (Envelope sag < 0.8 dB).

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

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC):
   - Hypothesis B1 (Acoustic Dust-Cap Mic Beaming):
     * Locus Descriptor: Primary: MICROPHONE_TRANSDUCTION; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Dynamic capsule positioned on-axis pointing at center dust-cap
       is transducing physical high-frequency acoustic beam.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Awaiting off-axis test; mic physical angle unmeasured).
     * Logical Relationship: COMPETING with B2, B3; JOINT possible.
   - Hypothesis B2 (Preamp Cold-Clipper Harmonic Overdrive):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Preamp gain stage driven into hard asymmetrical clipping, producing odd
       harmonic spray concentrated at 4.2 kHz.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Internal tube bias state unmeasured).
     * Logical Relationship: COMPETING with B1.
   - Hypothesis B3 (Amplifier Presence / Bright Circuit Over-Emphasis):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: FEEDBACK_LOOP (Power Amp NFB to Presence)
     * Proposed Mechanism: Presence potentiometer set high, reducing negative feedback at 4 kHz
       and allowing output stage to peak into inductive speaker load.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Presence knob position unmeasured).
     * Logical Relationship: COMPETING with B1, B2.

7. ASSUMPTIONS:
   - Mic was positioned near the center of the speaker (Risk: MODERATE; inferred from manifest).
   - Audio interface ADC did not hard-clip during recording (Risk: LOW; verified max peak -3.1 dBFS).

8. UNKNOWNS:
   - Exact mic angle and distance from grille cloth.
   - Physical knob positions of Presence, Treble, and Gain on amplifier head.
   - Dry DI signal (unavailable).

9. CONFLICTS:
   - None currently; all three physical mechanisms are capable of generating a 4.2 kHz peak.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (DISCRIMINATING TEST PROTOCOL — CORRECTION EC-1):
    - Discriminating Test Protocol (Principle 21):
      "To evaluate whether on-axis acoustic mic beaming is a material contributor to the 4.2 kHz harshness:
       Test: Re-record the passage with the microphone moved 1.5 inches toward the outer edge of the
       speaker cone (off-axis), keeping amplifier controls unchanged.
       Epistemic Impact (Non-Binary Updating per EC-1):
       - If the 4.2 kHz peak attenuates substantially, it provides qualitative empirical evidence
         strengthening Hypothesis B1 (mic beaming), without proving beaming was the sole cause or
         excluding minor contributions from circuit distortion or speaker cone breakup.
       - If the peak persists largely unchanged, it weakens Hypothesis B1 and elevates circuit-based
         or electromechanical hypotheses (B2, B3) for subsequent investigation."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to declare: "The microphone position is definitely the cause."
    - TT is NOT entitled to prescribe an EQ cut or select an intervention.
    - STOP: Pauses at hypothesis workspace; offers discriminating test protocol.


--------------------------------------------------------------------------------
SCENARIO C — MEASUREMENT CLEAR BUT PERCEPTUAL SIGNIFICANCE UNCERTAIN (CORRECTION EC-2)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Check my cabinet capture; does this EQ curve look okay for hard rock?"
   - Audio Stem: Isolated cabinet IR impulse response and processed rhythm stem.
   - Direct Measurement: Calibrated transfer function indicates a narrow -3.2 dB notch at 650 Hz
     (Q ≈ 4.2) in the cabinet acoustic response.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 2 (Style / Era Intent: Hard Rock Rhythm).
   - Intended Musical Role: Full-mix rhythm guitar tracking.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Cabinet impulse response exhibits a -3.2 dB attenuation notch centered at 650 Hz (Q = 4.2).
   - Negative Observation: Severe phase cancellation exceeding 90 degrees NOT DETECTED across 100 Hz - 5 kHz.

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTION EC-2):
   - In solo audition, a narrow notch at 650 Hz can sound slightly lean in the lower midrange.
   - However, in a full-mix context, arrangement elements such as snare body, lower vocal warmth,
     or bass guitar overtones frequently occupy the 500-800 Hz region. A modest acoustic notch at 650 Hz
     may be contextually neutral, beneficial for arrangement separation, or subtly audible depending
     on the mix density, but it is neither inherently a defect nor universally beneficial. Mix auditioning
     is necessary to evaluate its musical significance in context.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Cabinet baffle geometry and speaker cone acoustic loading routinely produce
     minor phase notches between 500 Hz and 800 Hz. These are natural acoustic properties of 4x12
     enclosures (Claim KC-CAB-007).
   - Principle 3 & Principle 14: A measured anomaly is not automatically an engineering defect;
     Principle 14 ("Parsimony: Do Not Intervene Without Justified Engineering Purpose") forbids
     intervening without justified purpose.

6. HYPOTHESES FORMED:
   - Hypothesis C1 (Benign Acoustic Baffle Loading):
     * Locus Descriptor: Primary: CABINET_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Baffle reflection notch typical of commercial 4x12 enclosures; perceptually
       neutral or beneficial in multi-track mix.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Mix interaction unobserved).
   - Hypothesis C2 (Perceptually Detrimental Mid-Hollow Defect):
     * Locus Descriptor: Primary: CABINET_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Notch robs guitar of fundamental chord girth, causing thin perception.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION

7. ASSUMPTIONS:
   - Guitar will be placed into a multi-instrument rock mix (Risk: LOW).

8. UNKNOWNS:
   - Full mix context (bass guitar and drums currently absent from session).
   - Player's subjective aesthetic preference regarding mid fullness.

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
SCENARIO D — USER PERCEPTION CONFLICTS WITH SPECTRAL MEASUREMENT (CORRECTION EC-3)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "The tone has way too much muddy low end; it's totally boomy and muffled."
   - Audio Stem: Processed rhythm guitar track (WAV, 24-bit/44.1 kHz).
   - Direct Measurement: Calibrated 1/3-octave FFT indicates 80-200 Hz energy is actually -4.5 dB
     BELOW standard rock baseline under stated steady-state test conditions. However, 3.5 kHz - 8 kHz
     energy is severely depressed (-9.2 dB), and lower-midrange energy (400-600 Hz) is relatively elevated (+4.1 dB).

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Perceptual Complaint / Corrective Intent).
   - Intended Musical Role: Tight, clear, articulate rhythm guitar.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTION EC-3):
   - Factual: Low-frequency energy (80-200 Hz) is -4.5 dB relative to reference baseline under stated
     measurement conditions (Method: 1/3-octave FFT, steady-state passage). Lower-midrange (400-600 Hz)
     exhibits +4.1 dB relative elevation, and high-frequency energy (3.5-8 kHz) is attenuated (-9.2 dB).
   - Perceptual Report: User explicitly reports "boomy, muddy low end".

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTION EC-3):
   - Perceptual Discrepancy & Interpretation: The user explicitly perceives the tone as boomy, muddy,
     and muffled. The engineering engine recognizes that measured frequency response under steady-state FFT
     is conditioned by its analysis window, method, and reference baseline, and does not automatically
     invalidate subjective perception. Several non-exclusive psychoacoustic and environmental phenomena
     can explain the discrepancy:
     (a) Auditory Spectral Tilt / Dark Balance: Severe high-frequency roll-off (-9.2 dB) shifts the perceived
         tonal balance, causing listeners to perceive the sound as dark and heavy even with lean measured sub-bass.
     (b) Semantic Boxiness Conflation: Elevated 400-600 Hz lower-mids can sound congested and boxy, colloquially
         described by players as "mud".
     (c) Playback Acoustic Environment: Untreated room boundary loading or monitoring headphone curve may boost
         low frequencies at the listening position.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Psychoacoustic masking and terminology ambiguity in practitioner descriptions
     (Claim KC-PSY-004; ConflictRecord CR-TERM-002). Untreated room acoustics routinely introduce
     severe 80-120 Hz room mode resonances at the listening position, causing a listener to hear
     massive bass boom that does not exist in the recorded digital file (Claim KC-ENV-011).

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC & EC-3):
   - Hypothesis D1 (High-Frequency Roll-Off Psychoacoustic Tilt):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: COMPOUND (Treble Damping + Perception)
     * Proposed Mechanism: Severe high-frequency damping shifts spectral center of gravity downward,
       causing dark perception colloquially misdiagnosed as bass boom.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED; Logical Relationship: COMPETING with D2, D3.
   - Hypothesis D2 (Listening Environment Room Mode Confounder):
     * Locus Descriptor: Primary: ACOUSTIC_ENVIRONMENT; Interaction: SINGLE_LOCUS (Playback Monitoring Space)
     * Proposed Mechanism: User's monitoring room has an unmitigated standing wave (room mode) near
       100 Hz, causing physical room boom during playback that is absent from the recorded file.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED; Logical Relationship: COMPETING with D1.
   - Hypothesis D3 (Colloquial Semantic Ambiguity / Boxiness):
     * Locus Descriptor: Primary: CABINET_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: +4.1 dB peak at 500 Hz creates boxy, nasal resonance that user calls "mud".
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED; Logical Relationship: JOINT with D1.

7. ASSUMPTIONS:
   - FFT measurement algorithm and calibration reference are accurate within stated analysis limits (Risk: LOW).

8. UNKNOWNS:
   - User monitoring setup (nearfield studio monitors vs laptop speakers vs headphones; room acoustic treatment).

9. CONFLICTS:
   - Apparent contradiction between user reported perception ("boomy low end") and physical DSP
     measurement (80-200 Hz is -4.5 dB down under steady-state FFT).

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTION EC-3):
    - Diagnostic Clarification & Test:
      "Our digital frequency analysis shows that sub-bass (80-200 Hz) is actually lean, but high
       frequencies above 3 kHz are very dark, and 500 Hz lower-mids are prominent.
       Test: Put on high-quality closed-back headphones. Does the bass boom still sound excessive,
       or does the tone just sound dark and boxy? This tells us if your room acoustics or monitoring
       setup are adding boom during playback, or if the dark balance is creating the impression of boom."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to apply a high-pass filter or cut 100 Hz bass (which would destroy low-end
      fundamental energy that is already thin).
    - TT is NOT entitled to dismiss the user's perception as 'wrong' or 'delusional'.
    - STOP: Maintains unresolved conflict; provides psychoacoustic diagnostic test.


--------------------------------------------------------------------------------
SCENARIO E — NEGATIVE OBSERVATION & UNRESOLVED BROADBAND NOISE (CORRECTION 2)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "There is an annoying background hum/noise on my high-gain lead patch. Fix the ground loop."
   - Audio Stem: 5 seconds of silence recorded between played passages on high-gain patch.
   - Direct Measurement: High-resolution 8192-point FFT (Blackman-Harris window) applied across 20-500 Hz.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Noise Troubleshooting).
   - Intended Musical Role: Clean background noise floor during silent pauses.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Negative Observation: Discrete 50 Hz and 60 Hz fundamental mains spikes and their first 5 harmonics
     NOT DETECTED UNDER STATED MEASUREMENT CONDITIONS (Method: 8192-point FFT, detection threshold -72 dBFS,
     bandwidth 20-500 Hz).
   - Factual Observation: Broadband un-correlated noise detected between 2 kHz and 16 kHz with RMS level
     of -46 dBFS.

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTION 2):
   - The dominant observed noise component in the supplied capture is broadband high-frequency noise
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

6. HYPOTHESES FORMED (CALIBRATED NO-DIAGNOSIS STATUS SC & CORRECTION 2):
   - Hypothesis E1 (High-Gain Preamp Thermal Resistance Noise):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: High preamp gain setting amplifying thermal resistance noise of input
       components and guitar pickup source impedance.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Internal component noise unmeasured).
     * Logical Relationship: COMPETING with E2, E3.
   - Hypothesis E2 (Digital Interface ADC Input Stage Noise):
     * Locus Descriptor: Primary: POST_TRANSDUCTION_SIGNAL; Interaction: SINGLE_LOCUS (ADC Stage)
     * Proposed Mechanism: Audio interface instrument preamp gain pushed into noisy upper region.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with E1, E3.
   - Hypothesis E3 (Electromagnetic RF Interference Transduced by Guitar Cavity):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Unshielded guitar wiring or unbuffered cable acting as RF antenna.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with E1, E2.

7. ASSUMPTIONS:
   - Noise file represents the actual quiescent state of the rig during performance (Risk: LOW).

8. UNKNOWNS:
   - Position of guitar volume knob during the 5 seconds of silence (was guitar muted or open?).
   - Audio interface input gain setting.

9. CONFLICTS:
   - User complaint asserts "ground loop / hum", but measurement reveals broadband high-frequency noise.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Low-Friction Test: "Does the broadband noise decrease substantially when you roll down the guitar
      volume pot to zero? If yes, noise originates upstream in the guitar/cable. If no, noise originates
      downstream in the amplifier or audio interface."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & CORRECTION 2):
    - TT is NOT entitled to declare: "The noise problem is NOT electrical mains hum." (It is merely not detected above -72 dBFS).
    - TT is NOT entitled to declare: "The noise is thermal hiss." (Thermal noise is a candidate hypothesis, not an observation).
    - TT is NOT entitled to insert a 60 Hz notch filter or prescribe a downward expander / noise gate.
    - STOP: Preserves negative observation limits; identifies competing noise mechanisms; awaits volume test.


--------------------------------------------------------------------------------
SCENARIO F — REFERENCE AUDIO + CURRENT USER RECORDING (CORRECTION EC-4)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - Reference Audio File: Isolated rhythm guitar track from classic hard rock benchmark
     ("AC/DC — Highway to Hell rhythm stem", 24-bit/48 kHz).
   - User Audio File: User's recorded rhythm pass playing identical open chords on Gibson SG.
   - Comparative DSP Measurements:
     * Crest Factor: Reference is 11.4 dB; User is 7.1 dB (User audio is 4.3 dB less dynamic).
     * Spectral Delta: Reference exhibits +4.2 dB more dynamic openness in 2.5 - 4.5 kHz range;
       User exhibits +5.1 dB higher energy in 120 - 250 Hz range.
     * THD Estimate: Reference total harmonic distortion estimated at 12-16%; User THD estimated at 35-45%.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTION M1):
   - Target Specificity: Tier 6 (Reference Audio + Current User Recording Comparison).
   - Intended Musical Role: Replicate dynamic, punchy vintage hard rock crunch with percussive breathing.
   - Measurement Comparability Assessment (M1): Riff and instrument type are comparable (both open
     hard-rock chords on humbucker guitar); playback levels matched to -18 LUFS before comparative FFT.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Comparative Factual:
     * User audio crest factor is 4.3 dB lower than reference (7.1 dB vs 11.4 dB).
     * User audio THD estimate is more than double reference (35-45% vs 12-16%).
     * User low-mid energy (120-250 Hz) is +5.1 dB higher relative to 1 kHz baseline.
     * User upper-mid presence (2.5-4.5 kHz) is -4.2 dB lower relative to reference.

4. PHENOMENOLOGICAL INTERPRETATION (CORRECTION EC-4):
   - Where the reference guitar exhibits greater dynamic crest factor (11.4 dB vs 7.1 dB) and dynamic
     openness in upper-mid transients, yielding crisp chord separation and articulate snap, the user
     recording shows significantly reduced dynamic crest, elevated low-mid energy, and substantially
     higher harmonic distortion. Perceptually, the user track sounds heavily compressed and saturated
     with reduced pick attack definition.
   - Epistemic Metric-History Separation (EC-4):
     These comparative metric deltas describe the resulting signal properties, NOT its exact processing
     history. Excessive preamp gain, stompbox clipping, or digital compression remain candidate hypotheses
     explaining the measurements, rather than observed facts.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Vintage non-master volume British tube amplifiers (Marshall 1959 Super Lead)
     operating at edge-of-breakup produce low compression, high crest factor (>10 dB), and moderate THD,
     preserving pick attack dynamics. Modern cascaded preamps or engaged overdrive pedals squash dynamics
     and generate heavy odd-order harmonics (Claim KC-AMP-009).

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC & EC-4):
   - Hypothesis F1 (Preamp Over-Saturation & Excessive Gain):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Preamp gain control set far too high, driving circuit into hard saturation
       and compressing transient peaks.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Amp gain knob setting unmeasured).
     * Logical Relationship: JOINT with F2.
   - Hypothesis F2 (In-Line Dynamic Processor / Compressor Clamping):
     * Locus Descriptor: Primary: DIGITAL_SIGNAL_PROCESSING; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: An engaged compressor/limiter pedal or DAW bus limiter clamping transient peaks.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with F1.
   - Hypothesis F3 (Neck Pickup Selection or Rolled-Down Tone Pot):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: User tracking on neck pickup rather than bridge pickup, creating low-mid
       buildup and muted presence.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with F1, F2.

7. ASSUMPTIONS:
   - User guitar has passive humbuckers similar to Gibson SG specification (Risk: LOW).

8. UNKNOWNS:
   - Exact amplifier gain knob position and presence of pedals in user's physical signal path.

9. CONFLICTS:
   - None; comparative delta provides unambiguous physical evidence of over-compression.

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
    print(get_v02b_p6()[:300])
