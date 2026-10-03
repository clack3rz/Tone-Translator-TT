#!/usr/bin/env python3
"""
Section 22 Part 1 (Scenarios A to F) for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
"""

def get_section_22_part1():
    return '''================================================================================
SECTION 22 — WORKED CHALLENGE SCENARIOS A–L
================================================================================

22.1 ARCHITECTURAL ROLE OF WORKED CHALLENGE SCENARIOS
The twelve scenarios in this section serve exclusively as architectural demonstrations
of Phase 1C.5b principles:
  - Demonstrating evidence intake, observation formation, and phenomenological interpretation.
  - Formulating bounded, competing, and joint hypotheses across distinct signal loci.
  - Proposing low-friction discriminating evidence requests under Principle 21.
  - Enforcing the strict handoff boundary: STOPPING at the hypothesis workspace without
    performing Phase 1C.5c causal diagnosis resolution or Phase 1C.5d intervention selection.
  - All numerical values, frequencies, and decibel levels are tagged as `ILLUSTRATIVE_VALUE`
    and must not be construed as universal physical truths.


--------------------------------------------------------------------------------
SCENARIO A — BROAD INTENT VS HIDDEN SPECIFIC TARGET (SISO & PROFESSIONAL BOUNDARY)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Give me an aggressive 1980s-style thrash rhythm tone."
   - Audio: None supplied.
   - Rig Manifest: Declared as "Electric guitar with bridge humbucker; computer audio interface."
   - Platform Settings: Digital modeling workstation; default blank routing template.
   - Hidden Reality (Unexpressed): User internally expects an exact replication of
     James Hetfield / Kirk Hammett rhythm tone on Metallica's "Seek & Destroy" (Kill 'Em All, 1983).

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 2 (Specific Style / Genre Intent).
   - Intended Musical Role: Tight, aggressive rhythm guitar for fast palm-muted downpicking.
   - Constraints: Must work on standard digital modeler platform.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: User prompt requests "aggressive 1980s-style thrash rhythm tone".
     No audio stems provided. Rig manifest establishes bridge humbucker into direct interface.
   - Negative Observation: No specific artist, album, track, amplifier model, or reference file
     supplied under stated session inputs.

4. PHENOMENOLOGICAL INTERPRETATION:
   - Musical Context: 1980s thrash metal rhythm demands rapid transient recovery, tight low-frequency
     damping on palm mutes, saturated harmonic bite for pick articulation, and sufficient gain
     for sustained power chords without mushy decay.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Production conventions of 1980s thrash guitar encompass two major distinct
     timbral topologies:
     (a) British Mid-Forward Crunch: High-gain modified British master-volume heads (Marshall JCM800/1959)
         boosted with pre-gain overdrive (OD/TS) to cut bass before clipping, retaining aggressive
         800 Hz - 2 kHz mid-punch (e.g. Slayer's Reign in Blood, Megadeth's Peace Sells).
     (b) American Scooped-Mid Grind: Cascaded preamp tube gain (Mesa Boogie Mark series) with graphic
         post-distortion EQ scoop pulling 750 Hz down by 8-12 dB, pairing heavy sub-bass thump with
         sizzling 3-5 kHz treble bite (e.g. Metallica's Master of Puppets, And Justice For All).
     (c) Early Prototype Thrash (1982-1983): High-treble, raw, dry crunch with Marshall heads driven by
         ProCo Rat or TS9, featuring un-scooped, raspy mid-bite (Kill 'Em All era).

6. HYPOTHESES FORMED:
   - Hypothesis A1 (Mid-Forward British Thrash Baseline):
     * Signal Locus: AMPLIFIER_TONE_STACK & PRE_AMPLIFIER_STAGE
     * Proposed Mechanism: Pre-gain bass cut with saturated upper-mid emphasis (1.2 kHz - 2.5 kHz)
       provides optimal articulation for generic fast thrash tempos.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION
     * Logical Relationship: COMPETING with A2.
   - Hypothesis A2 (Post-Gain Scooped-Mid American Thrash Baseline):
     * Signal Locus: AMPLIFIER_TONE_STACK & POST_TRANSDUCTION_SIGNAL
     * Proposed Mechanism: Post-distortion graphic V-curve EQ scoop yields modern heavy chunk
       and aggressive edge at expense of solo midrange presence.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION
     * Logical Relationship: COMPETING with A1.

7. ASSUMPTIONS:
   - User guitar bridge humbucker has medium-to-high output (Assumption Risk: MODERATE).
   - User intends a recorded album-style tone rather than an unmic'd live in-the-room sound (Risk: LOW).

8. UNKNOWNS:
   - Exact target album or artist aesthetic.
   - Guitar tuning (E-standard vs Eb vs D-standard).
   - Whether tone must fit into a multi-instrument mix or solo bedroom practice.

9. CONFLICTS:
   - High potential conflict between broad user prompt ("1980s thrash") and possible hidden
     specific expectation ("Seek & Destroy").

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Targeted Clarification Request (Principle 21): "1980s thrash guitar spans distinctly different
      tonal architectures — from the raw, mid-forward bite of early British Marshall crunch (Slayer,
      early Megadeth) to the scooped, chunky American graphic-EQ grind (Metallica). Do you have a
      specific reference track or album in mind, or should we build a versatile, punchy mid-forward baseline?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to silently infer "Metallica" or "Seek & Destroy".
    - TT is NOT entitled to insert a Mesa Boogie Mark IIC+ or apply an aggressive 750 Hz scoop.
    - TT is NOT entitled to claim that 1980s thrash "requires" a Tube Screamer.
    - STOP: Awaits user clarification or builds explicitly bounded broad foundation.


--------------------------------------------------------------------------------
SCENARIO B — PERCEPTUAL COMPLAINT WITH SEVERAL PLAUSIBLE CAUSES
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My rhythm tone sounds harsh, buzzy, and piercing when I dig into chords."
   - Audio Stem: Processed guitar track (WAV, 24-bit/48 kHz, 15 seconds of high-gain chords).
   - Rig Manifest: 50W high-gain tube head, 4x12 closed-back cabinet, single dynamic mic (SM57).
   - Direct Measurement: 1/3-octave FFT reveals a distinct resonant peak elevated by +6.2 dB
     centered at 4.2 kHz (Q ≈ 3.8) relative to 1 kHz baseline during chord sustain.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Creative / Troubleshooting Intent).
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

6. HYPOTHESES FORMED:
   - Hypothesis B1 (Acoustic Dust-Cap Mic Beaming):
     * Signal Locus: MICROPHONE_TRANSDUCTION
     * Proposed Mechanism: SM57 dynamic capsule positioned directly on-axis pointing at center dust-cap
       is transducing physical high-frequency acoustic beam.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with B2, B3; JOINT possible.
   - Hypothesis B2 (Preamp Cold-Clipper Harmonic Overdrive):
     * Signal Locus: PRE_AMPLIFIER_STAGE
     * Proposed Mechanism: Preamp gain stage driven into hard asymmetrical clipping, producing odd
       harmonic spray concentrated at 4.2 kHz.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with B1.
   - Hypothesis B3 (Amplifier Presence / Bright Circuit Over-Emphasis):
     * Signal Locus: AMPLIFIER_TONE_STACK & POWER_AMPLIFIER_STAGE
     * Proposed Mechanism: Presence potentiometer set high, reducing negative feedback at 4 kHz
       and allowing output stage to peak into inductive speaker load.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with B1, B2.

7. ASSUMPTIONS:
   - Mic was positioned near the center of the speaker (Risk: MODERATE; inferred from manifest).
   - Audio interface ADC did not hard-clip during recording (Risk: LOW; verified max peak -3.1 dBFS).

8. UNKNOWNS:
   - Exact mic angle and distance from grille cloth.
   - Position of Presence, Treble, and Gain knobs on amplifier head.
   - Dry DI signal (unavailable).

9. CONFLICTS:
   - None currently; all three physical mechanisms are capable of generating a 4.2 kHz peak.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Discriminating Test Protocol (Principle 21):
      "To isolate whether the 4.2 kHz harshness is acoustic mic beaming or amplifier clipping:
       Test 1 (Low Friction): Re-record the riff with the microphone angled 45 degrees or moved
       1.5 inches toward the outer edge of the speaker cone. If peak drops by >4 dB, cause is acoustic
       transduction. If peak persists unchanged, cause is amplifier circuit distortion."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to declare: "The microphone position is definitely the cause."
    - TT is NOT entitled to apply a surgical 4.2 kHz notch filter.
    - TT is NOT entitled to order the player to turn down amplifier Presence.
    - STOP: Pauses at hypothesis workspace; offers discriminating test protocol.


--------------------------------------------------------------------------------
SCENARIO C — MEASUREMENT CLEAR BUT PERCEPTUAL SIGNIFICANCE UNCERTAIN
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Check my cabinet capture; does this EQ curve look okay for hard rock?"
   - Audio Stem: Isolated cabinet IR impulse response and processed rhythm stem.
   - Direct Measurement: Calibrated transfer function indicates a narrow -3.2 dB notch at 650 Hz
     (Q ≈ 4.2) in the cabinet acoustic response.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 2 (Style/Genre Intent: Hard Rock Rhythm).
   - Intended Musical Role: Full-mix rhythm guitar tracking.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Cabinet impulse response exhibits a -3.2 dB attenuation notch centered at 650 Hz (Q = 4.2).
   - Negative Observation: Phase cancellation exceeding 90 degrees NOT DETECTED across 100 Hz - 5 kHz.

4. PHENOMENOLOGICAL INTERPRETATION:
   - In solo listening, a 650 Hz dip can sound slightly hollow or lean in the lower midrange.
   - However, in full-mix context, 600-700 Hz is the primary acoustic zone where snare drum fundamental
     body and vocal lower formants reside. A modest notch at 650 Hz frequently serves mix clarity
     by preventing guitars from masking the rhythm section.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Cabinet baffle geometry and speaker cone acoustic loading routinely produce
     minor phase notches between 500 Hz and 800 Hz. These are natural acoustic properties of 4x12
     enclosures (Claim KC-CAB-007).
   - Principle 3 & Principle 15: A measured anomaly is not automatically an engineering defect.

6. HYPOTHESES FORMED:
   - Hypothesis C1 (Benign Acoustic Baffle Loading):
     * Signal Locus: CABINET_ACOUSTIC
     * Proposed Mechanism: Baffle reflection notch typical of commercial 4x12 enclosures; perceptually
       neutral or beneficial in multi-track mix.
     * Epistemic Status: HIGHLY_PLAUSIBLE
   - Hypothesis C2 (Perceptually Detrimental Mid-Hollow Defect):
     * Signal Locus: CABINET_ACOUSTIC
     * Proposed Mechanism: Notch robs guitar of fundamental chord girth, causing thin perception.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION

7. ASSUMPTIONS:
   - Guitar will be placed into a multi-instrument rock mix (Risk: LOW).

8. UNKNOWNS:
   - Full mix context (bass guitar and drums currently absent from session).
   - Player's subjective aesthetic preference regarding mid fullness.

9. CONFLICTS:
   - Objective physical dip (-3.2 dB) vs engineering aesthetic utility (mix clearance vs solo fullness).

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Contextual Test: "The 650 Hz dip is an expected acoustic feature of 4x12 cabinets. In a full mix
      with bass and drums, this dip naturally leaves space for the snare drum body. If you are tracking
      in a mix, we recommend keeping it. If this is for solo guitar, does the tone sound hollow to your ears?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to declare: "The 650 Hz notch is a defect that must be boosted."
    - TT is NOT entitled to insert a parametric EQ boost.
    - STOP: Preserves hypothesis balance; explains contextual engineering trade-off.


--------------------------------------------------------------------------------
SCENARIO D — USER PERCEPTION CONFLICTS WITH SPECTRAL MEASUREMENT
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "The tone has way too much muddy low end; it's totally boomy and muffled."
   - Audio Stem: Processed rhythm guitar track (WAV, 24-bit/44.1 kHz).
   - Direct Measurement: Calibrated 1/3-octave FFT indicates 80-200 Hz energy is actually -4.5 dB
     BELOW standard rock baseline. However, 3.5 kHz - 8 kHz energy is severely depressed (-9.2 dB),
     and lower-midrange energy (400-600 Hz) is relatively elevated (+4.1 dB).

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Perceptual Complaint / Corrective Intent).
   - Intended Musical Role: Tight, clear, articulate rhythm guitar.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Low-frequency energy (80-200 Hz) is -4.5 dB relative to reference baseline.
     High-frequency energy (3.5-8 kHz) is attenuated by -9.2 dB. Lower-mids (400-600 Hz) are +4.1 dB.
   - Perceptual Report: User explicitly reports "boomy, muddy low end".

4. PHENOMENOLOGICAL INTERPRETATION:
   - Psychoacoustic Phenomenon: Auditory spectral tilt illusion. When high frequencies and presence
     are severely muted, the human ear perceives the sound as "dark", "underwater", and colloquially
     labels it "muddy" or "boomy", even when physical sub-bass energy is thin.
   - Alternative Psychoacoustic Phenomenon: Lower-midrange "boxiness" (450 Hz) is frequently conflated
     with low-end "mud" (150 Hz) by non-technical musicians.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Psychoacoustic masking and terminology ambiguity in practitioner descriptions
     (Claim KC-PSY-004; ConflictRecord CR-TERM-002). Untreated room acoustics routinely introduce
     severe 80-120 Hz room mode resonances at the listening position, causing a listener to hear
     massive bass boom that does not exist in the recorded digital file (Claim KC-ENV-011).

6. HYPOTHESES FORMED:
   - Hypothesis D1 (High-Frequency Roll-Off Psychoacoustic Illusion):
     * Signal Locus: MICROPHONE_TRANSDUCTION & AMPLIFIER_TONE_STACK
     * Proposed Mechanism: Severe high-frequency damping shifts spectral center of gravity downward,
       causing dark perception colloquially misdiagnosed as bass boom.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with D2, D3.
   - Hypothesis D2 (Listening Environment Room Mode Confounder):
     * Signal Locus: ACOUSTIC_ENVIRONMENT (Playback Monitoring)
     * Proposed Mechanism: User's monitoring room has an unmitigated standing wave (room mode) near
       100 Hz, causing physical room boom during playback that is absent from the recorded file.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with D1.
   - Hypothesis D3 (Colloquial Semantic Ambiguity / Boxiness):
     * Signal Locus: CABINET_ACOUSTIC
     * Proposed Mechanism: +4.1 dB peak at 500 Hz creates boxy, nasal resonance that user calls "mud".
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: JOINT with D1.

7. ASSUMPTIONS:
   - FFT measurement algorithm and calibration reference are accurate (Risk: NEGLIGIBLE).

8. UNKNOWNS:
   - User monitoring setup (nearfield studio monitors vs laptop speakers vs headphones; room acoustic treatment).

9. CONFLICTS:
   - Direct contradiction between user reported perception ("boomy low end") and physical DSP
     measurement (80-200 Hz is -4.5 dB down).

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Diagnostic Clarification & Test:
      "Our digital frequency analysis shows that sub-bass (80-200 Hz) is actually lean, but high
       frequencies above 3 kHz are very dark, and 500 Hz lower-mids are prominent.
       Test (Zero Friction): Put on high-quality closed-back headphones. Does the bass boom still
       sound excessive, or does the tone just sound dark and boxy? This tells us if your room
       acoustics are adding boom during playback."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to apply a high-pass filter or cut 100 Hz bass (which would destroy low-end
      fundamental energy that is already thin).
    - TT is NOT entitled to tell the user they are "wrong" or dismiss their report.
    - STOP: Maintains unresolved conflict; provides psychoacoustic diagnostic test.


--------------------------------------------------------------------------------
SCENARIO E — NEGATIVE OBSERVATION WITH EXPLICIT DETECTION LIMIT
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "There is an annoying background hum/noise on my high-gain lead patch. Fix the ground loop."
   - Audio Stem: 5 seconds of silence recorded between played passages on high-gain patch.
   - Direct Measurement: High-resolution 8192-point FFT (Blackman-Harris window) applied across 20-500 Hz.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Noise Troubleshooting).
   - Intended Musical Role: Clean background noise floor during silent pauses.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Negative Observation: Discrete 50 Hz and 60 Hz fundamental mains spikes and their first 5 harmonics
     NOT DETECTED UNDER STATED MEASUREMENT CONDITIONS (Method: 8192-point FFT, detection threshold -72 dBFS,
     bandwidth 20-500 Hz).
   - Factual Observation: Broadband un-correlated noise detected between 2 kHz and 16 kHz with RMS level
     of -46 dBFS.

4. PHENOMENOLOGICAL INTERPRETATION:
   - The noise problem is NOT electrical mains hum (ground loop 50/60 Hz buzz). The noise is broadband
     high-frequency thermal hiss ("white/pink noise"), perceived as constant rushing air.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: High-gain guitar amplifiers cascade 3 to 5 vacuum tube or solid-state gain
     stages, multiplying input Johnson-Nyquist thermal noise by up to 80 dB of voltage gain (Claim KC-AMP-045).
   - Principle 3: "Missing evidence is not negative evidence" & "Not detected != does not exist".
     Mains hum below -72 dBFS could exist, but is completely masked by -46 dBFS thermal hiss.

6. HYPOTHESES FORMED:
   - Hypothesis E1 (High-Gain Cascaded Thermal Hiss):
     * Signal Locus: PRE_AMPLIFIER_STAGE
     * Proposed Mechanism: High preamp gain setting amplifying thermal resistance noise of first tube
       stage and guitar pickup source impedance.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with E2.
   - Hypothesis E2 (Digital Interface / Converter Noise Floor):
     * Signal Locus: POST_TRANSDUCTION_SIGNAL (ADC Stage)
     * Proposed Mechanism: Audio interface instrument preamp input gain pushed into noisy upper range.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with E1.

7. ASSUMPTIONS:
   - Noise file represents the actual quiescent state of the rig during performance (Risk: LOW).

8. UNKNOWNS:
   - Position of guitar volume knob during the 5 seconds of silence (was guitar muted or open?).

9. CONFLICTS:
   - User complaint asserts "ground loop / hum", but measurement reveals broadband thermal hiss.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Low-Friction Test: "Does the hiss decrease substantially when you roll down the guitar volume pot
      to zero? If yes, noise originates from the guitar/cable input. If no, noise originates inside the amp/interface."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to declare: "There is zero ground loop in the system" (mains hum could exist below -72 dBFS).
    - TT is NOT entitled to insert a 60 Hz notch filter (which would do nothing for -46 dBFS hiss).
    - STOP: Preserves negative observation limits; identifies thermal hiss mechanism.


--------------------------------------------------------------------------------
SCENARIO F — REFERENCE AUDIO + CURRENT USER RECORDING
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

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 6 (Reference Audio + Current User Recording Comparison).
   - Intended Musical Role: Replicate dynamic, punchy vintage hard rock crunch with percussive breathing.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Comparative Factual:
     * User audio crest factor is 4.3 dB lower than reference (7.1 dB vs 11.4 dB).
     * User audio THD estimate is more than double reference (35-45% vs 12-16%).
     * User low-mid energy (120-250 Hz) is +5.1 dB higher relative to 1 kHz baseline.
     * User upper-mid presence (2.5-4.5 kHz) is -4.2 dB lower relative to reference.

4. PHENOMENOLOGICAL INTERPRETATION:
   - The user's tone is severely over-saturated and dynamically compressed relative to the reference.
     Where the reference guitar "breathes" with dynamic touch sensitivity, yielding crisp chord
     separation and articulate snap, the user guitar is clamped into continuous square-wave clipping,
     yielding mushy chord definition and muddy lower-mid buildup.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Vintage non-master volume British tube amplifiers (Marshall 1959 Super Lead)
     operating at edge-of-breakup produce low compression, high crest factor (>10 dB), and moderate THD,
     preserving pick attack dynamics. Modern cascaded preamps or engaged overdrive pedals squash dynamics
     and generate heavy odd-order harmonics (Claim KC-AMP-009).

6. HYPOTHESES FORMED:
   - Hypothesis F1 (Preamp Over-Saturation & Excessive Clipping):
     * Signal Locus: PRE_AMPLIFIER_STAGE
     * Proposed Mechanism: Preamp gain control set far too high, driving circuit into hard saturation
       and compressing transient peaks.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: JOINT with F2.
   - Hypothesis F2 (In-Line Compressor Pedal or Digital Limiting):
     * Signal Locus: DIGITAL_SIGNAL_PROCESSING or INSTRUMENT_ELECTRICAL
     * Proposed Mechanism: An engaged compressor/limiter pedal or DAW bus limiter clamping transient peaks.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with F1.
   - Hypothesis F3 (Neck Pickup Selection or Rolled-Down Tone Pot):
     * Signal Locus: INSTRUMENT_ELECTRICAL
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
       3. Test: Record a take with amp gain rolled back by 30-40% to match reference dynamic bounce."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to declare: "The user must buy a 1959 Super Lead Marshall."
    - TT is NOT entitled to immediately adjust parameters in user preset.
    - STOP: Preserves comparative differential observations; frames multi-locus hypotheses.'''

if __name__ == "__main__":
    print(get_section_22_part1()[:300])
