#!/usr/bin/env python3
"""
v02a_p7.py: Section 22 Part 2 (Scenarios G to L)
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2a.txt
"""

def get_v02a_p7():
    return '''--------------------------------------------------------------------------------
SCENARIO G — DRY DI LOCALIZATION & TOTAL CAUSE DECOUPLING (CORRECTIONS 3 & 4)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My high notes on the B and high-E strings have an unbearable harsh, metallic ringing."
   - Audio Stem 1: Processed amplifier track (WAV, 24-bit/48 kHz) exhibiting a +6.5 dB peak at 3.8 kHz.
   - Audio Stem 2: Synchronized Dry Direct Input (DI) capture tapped from high-Z splitter at guitar jack.
   - Rig Manifest: Stratocaster with vintage single-coils, 25-foot unbuffered guitar cable, tube combo.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Defect Troubleshooting).
   - Intended Musical Role: Smooth, singing lead tone without piercing metallic ringing.
   - Evidence Directness & Locus Bounding (M1 & Correction 3): Synchronized dry DI provides direct
     empirical evidence that a materially similar 3.8 kHz spectral feature already exists upstream
     of the amplifier, cabinet, and microphone stages.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Processed Track Factual: Sustained high notes exhibit a sharp resonant peak at 3.8 kHz (+6.5 dB).
   - Dry DI Factual: High-resolution FFT analysis of the DRY DI stem reveals the identical resonant
     feature (+5.8 dB at 3.8 kHz, Q ≈ 4.1) present on raw, unamplified pickup signals during high-E string plucks.
   - Negative Observation: Amplifier power supply ripple hum NOT DETECTED in processed audio (< -70 dBFS).

4. PHENOMENOLOGICAL INTERPRETATION:
   - The origin of the 3.8 kHz spectral resonance is located upstream of the amplifier input.
   - Fundamental Epistemic Distinction (Correction 3):
     ORIGIN OF AN OBSERVED FEATURE != COMPLETE CAUSE OF THE FINAL PERCEIVED PROBLEM.
     While the resonant peak enters the signal path at or before the guitar output jack, downstream
     amplifier clipping, tone-stack shaping, and speaker/mic frequency response may substantially
     amplify its amplitude, add harmonic distortion sidebands, and exacerbate perceived harshness.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Passive single-coil pickups form a second-order low-pass RLC resonant circuit
     with guitar cable capacitance and instrument potentiometer resistance. A long unbuffered cable
     (25 ft ≈ 750-1000 pF) shifts the electrical resonant peak downward into the sensitive 3.5 - 4.5 kHz
     zone, creating a pronounced high-Q metallic peak (Claim KC-ELEC-012). Mechanical bridge saddle
     burrs or fret contact can also inject narrow resonant frequencies directly into the string vibration.

6. HYPOTHESES FORMED (CALIBRATED STATUS C-HP & CORRECTION 3):
   - Hypothesis G1 (Passive Pickup / Cable Capacitance RLC Resonance):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: CROSS_BOUNDARY_LOADING (Pickup to Cable)
     * Boundary Details: High-inductance single-coil pickup loaded by 25-foot unbuffered cable capacitance.
     * Proposed Mechanism: RLC electrical resonance creating peak at 3.8 kHz prior to amplifier input stage.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Consistent with dry DI feature, but cable capacitance
       and pot values remain unmeasured; awaiting cable swap test).
     * Logical Relationship: COMPETING with G2; JOINT with G3.
   - Hypothesis G2 (Mechanical Fret / Bridge Saddle Sitar Ringing):
     * Locus Descriptor: Primary: INSTRUMENT_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Physical string buzzing against adjacent fret or burr on bridge saddle.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with G1.
   - Hypothesis G3 (Downstream Harmonic Exacerbation by Preamp / Mic):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE & MICROPHONE_TRANSDUCTION; Interaction: COMPOUND
     * Proposed Mechanism: Preamp overdrive clipping the incoming 3.8 kHz resonance and generating odd
       harmonics, exacerbated by on-axis microphone high-frequency boost.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: JOINT with G1/G2.
     * Note: Downstream stages are weakened as hypotheses for the *origin* of the feature, but remain
       active as potential contributors to the *severity* of the perceived harshness.

7. ASSUMPTIONS:
   - Dry DI was tapped directly before any pedals or buffers (Risk: LOW; verified by session manifest).

8. UNKNOWNS:
   - Exact cable capacitance (pF/ft) and guitar volume pot resistance (250k vs 500k).
   - Degree to which downstream amplifier saturation exacerbates the perceived harshness.

9. CONFLICTS:
   - None; DI evidence decisively isolates the upstream boundary of the original resonant feature.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Low-Friction Discriminating Test: "Plug the guitar directly into the audio interface with a short
      (6-10 foot) low-capacitance cable, or insert a buffered pedal right after the guitar. Does the 3.8 kHz
      resonance in the dry DI vanish? If yes, the origin mechanism is cable capacitance RLC loading."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & CORRECTION 3):
    - TT is NOT entitled to declare: "The sole cause of the user's harshness is cable capacitance."
    - TT is NOT entitled to declare: "Amplifier and microphone stages are ruled out as contributors."
    - TT is NOT entitled to apply a post-cab EQ notch to fix an instrument-side resonance.
    - STOP: Localizes upstream origin boundary; preserves downstream exacerbation hypotheses; requests cable test.


--------------------------------------------------------------------------------
SCENARIO H — CONTEXT SUGGESTS FAMILIAR SOLUTION BUT EVIDENCE CONTRADICTS IT
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Dial in my 8-string progressive metal tone. Palm mutes sound weak and anemic."
   - Context: Modern progressive metal ("djent"), 8-string guitar tuned to Drop F.
   - Audio Stem: Processed rhythm track of low-F palm-muted chugs.
   - Direct Measurement: 1/3-octave FFT reveals energy below 120 Hz is severely attenuated (-8.5 dB
     relative to 1 kHz baseline). Transient envelope shows attack is thin and papery with no low-end punch.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 2 (Style / Era Intent).
   - Intended Musical Role: Tight, percussive, heavy low-end chunk on sub-octave fundamental.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Low-frequency energy (60-120 Hz) is attenuated by -8.5 dB. Attack transient is bright
     and thin; decay lacks sub-bass weight.
   - Negative Observation: Preamp low-frequency intermodulation flub NOT DETECTED.

4. PHENOMENOLOGICAL INTERPRETATION:
   - The guitar tone lacks low-end body and percussive weight. The common engineering fear in djent
     is "muddy flub", but this tone has crossed into the opposite defect: it is over-filtered,
     brittle, and acoustically hollow.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Principle 7: "Context informs reasoning but does not prove causation."
   - Production Lore Bias (Finding M3): The ubiquitous recommendation for djent is "insert an overdrive pedal
     (Tube Screamer) with Gain at 0 and Tone/Level at 10 to aggressively cut low end".
   - Empirical Reality: Applying an aggressive pre-gain bass cut when the low-end is ALREADY -8.5 dB
     down will completely destroy the sub-fundamental of the low F (43.7 Hz), turning the 8-string
     into a thin, buzz-saw caricature (Claim KC-MET-021).

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC):
   - Hypothesis H1 (Excessive Pre-Gain High-Pass Filtering):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: CROSS_BOUNDARY_LOADING (Pre-Filter to Preamp)
     * Proposed Mechanism: An existing high-pass filter or overdrive pedal is set with an excessively
       high cutoff frequency (>150 Hz), removing essential sub-bass energy prior to clipping.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Pre-filter cutoff frequency unmeasured).
     * Logical Relationship: COMPETING with H2.
   - Hypothesis H2 (Bridge Pickup Height Set Too Low Under Low Strings):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS (Transducer Geometry)
     * Proposed Mechanism: Pickup physical tilt has excessive distance from low 7th/8th strings,
       resulting in weak electromagnetic induction of low frequencies.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Pickup physical height unmeasured).
     * Logical Relationship: COMPETING with H1.

7. ASSUMPTIONS:
   - User guitar is properly intonated and string gauge is sufficient for Drop F (Risk: MODERATE).

8. UNKNOWNS:
   - Exact plugin chain routing and pickup mechanical height measurements.

9. CONFLICTS:
   - Textbook internet advice ("always use a Tube Screamer on 8-string") directly contradicts the
     empirical measurement (low end is already starved).

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Verification Inquiry: "Check your pre-amp chain: is there an active overdrive pedal or high-pass
      filter engaged? If so, what is its frequency cutoff? Can you provide a take with the pedal bypassed?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to recommend inserting an overdrive pedal or cutting 100 Hz.
    - TT is NOT entitled to apply a generic djent recipe in defiance of measured reality.
    - STOP: Repudiates genre recipe; maintains hypothesis of over-filtering; requests filter bypass take.


--------------------------------------------------------------------------------
SCENARIO I — CONFLICTING EVIDENCE FROM TWO CAPTURES UNDER DIFFERENT CONDITIONS
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - Take 1 Audio (Morning Tracking): Crisp, articulate rhythm track with balanced 3-6 kHz presence.
   - Take 2 Audio (Afternoon Tracking): Muffled, dark rhythm track with 3-6 kHz energy down by -6.2 dB.
   - User Text: "I recorded Take 2 this afternoon without touching any settings, but it sounds completely
     different and dark. Why did the tone change?"
   - Rig Manifest: 100W tube head into physical 4x12 cabinet with dynamic mic on stand.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Drift / Discrepancy Investigation).
   - Intended Musical Role: Restore consistency to match Take 1.
   - Measurement Comparability Assessment (M1): Riff performance is identical; however, temporal
     and environmental conditions changed between morning and afternoon sessions.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Comparative Factual: Take 2 exhibits a broadband -6.2 dB drop between 3 kHz and 7 kHz relative
     to Take 1. Lower frequencies (100-500 Hz) remain within 0.5 dB match between takes.
   - Negative Observation: Amplifier power tube bias drift NOT DETECTED (low-end THD identical at 14%).

4. PHENOMENOLOGICAL INTERPRETATION:
   - A dramatic high-frequency attenuation occurred while low frequencies remained constant. This
     selective spectral divergence indicates an acoustic transduction change, pickup change, or
     cable loading change, rather than a global amplifier power failure.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Small physical shifts in microphone position relative to a guitar speaker cone
     produce radical changes in high-frequency capture. Moving a mic 1 inch off-axis drops 4 kHz presence
     by 4-7 dB while leaving 150 Hz bass untouched (Claim KC-MIC-005). Alternatively, switching from
     bridge to middle pickup drops treble, or an unbuffered cable was swapped.

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC):
   - Hypothesis I1 (Microphone Physical Dislocation / Bump):
     * Locus Descriptor: Primary: MICROPHONE_TRANSDUCTION; Interaction: SINGLE_LOCUS (Transducer Geometry)
     * Proposed Mechanism: Physical mic stand was bumped, vibrating or shifting capsule off-center
       from the speaker dust-cap between sessions.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Mic physical position unmeasured).
     * Logical Relationship: COMPETING with I2, I3.
   - Hypothesis I2 (Pickup Selector Position Inadvertently Altered):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Guitar pickup switch knocked from Bridge to Middle/Neck position.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Switch state unverified).
     * Logical Relationship: COMPETING with I1.
   - Hypothesis I3 (Guitar Cable Swap):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: CROSS_BOUNDARY_LOADING
     * Proposed Mechanism: High-capacitance cable substituted in afternoon tracking.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with I1, I2.

7. ASSUMPTIONS:
   - Amplifier controls were genuinely not altered (Risk: MODERATE; based on user report).

8. UNKNOWNS:
   - Physical mic position verification (no photograph or laser measurement provided).

9. CONFLICTS:
   - User assertion ("nothing changed") directly conflicts with acoustic physics (a 6 dB 4 kHz drop
     requires a physical or electrical change).

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Targeted Physical Checklist:
      "A 6 dB drop in treble with identical bass almost always indicates one of three physical changes:
       1. Was the physical microphone stand bumped, moved, or angled between takes?
       2. Is your guitar pickup switch set to the Bridge pickup?
       3. Was a different guitar cable used?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to silently average the two takes or guess which one is 'correct'.
    - TT is NOT entitled to apply a +6 dB shelving EQ to Take 2 to force a match.
    - STOP: Maintains conflict visibly; isolates plausible physical disturbance mechanisms.


--------------------------------------------------------------------------------
SCENARIO J — EVIDENCE TOO POOR FOR USEFUL HYPOTHESIS NARROWING
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Why does my guitar sound so bad? Fix it."
   - Audio Stem: 3.5-second audio snippet recorded on a mobile phone voice memo in a reverberant garage;
     file is lossy MP3 (64 kbps, mono, 22.05 kHz sample rate).
   - Audio Quality Assessment (M1):
     * Severe digital lossy compression artifacts (spectral cutoff at 11 kHz; swishy MP3 pre-echo).
     * Severe acoustic room reverberation (RT60 ≈ 1.8 s) dominating direct sound.
     * Hard clipping of mobile phone microphone diaphragm (+12 dB over input ceiling).
     * Background speech and street traffic audible.
   - Rig Manifest: Blank ("electric guitar and amp").

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Vague Complaint).

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Quality Assessment Observation: File bandwidth capped at 11 kHz (Nyquist ceiling of 22.05 kHz).
     Room reflection energy exceeds direct sound energy by +4.2 dB. Phone mic is hard-clipped.
   - Epistemic Evaluation: Audio is completely inadequate for electro-acoustic analysis.

4. PHENOMENOLOGICAL INTERPRETATION:
   - The capture is dominated by room acoustics, diaphragm clipping, and low-bitrate compression.
     Any attempt to evaluate pickup tone, tube saturation, or speaker response is pure fiction.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Principle 3 & Principle 17: Operational reality mandates recognizing when data is insufficient
     ("Deterministic Systems May Verify Only Truth They Genuinely Own").
   - Phase 1C.5a Lifecycle: When evidence is corrupted or inadequate, the system must trigger
     `INSUFFICIENT_EVIDENCE_ABSTAINED` rather than hallucinate diagnoses.

6. HYPOTHESES FORMED:
   - None. Formulating circuit or acoustic hypotheses from this file violates sound engineering ethics.
   - Status: INSUFFICIENT_FOR_REASONING.

7. ASSUMPTIONS:
   - None permitted.

8. UNKNOWNS:
   - All parameters in the physical and digital signal chains.

9. CONFLICTS:
   - User expects tone diagnosis, but provided data is acoustically un-analyzable.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Clear Audio Acquisition Instruction:
      "We cannot diagnose your tone from this recording because it is heavily distorted by the phone
       microphone, room reverberation, and low-quality compression.
       To give you an accurate engineering diagnosis, please provide:
       1. A direct audio recording from your amplifier or audio interface (24-bit WAV preferred).
       2. The model of your guitar and amplifier.
       3. A 10-second recording of rhythm chords playing your typical riff."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to guess what the guitar or amp sounds like.
    - TT is NOT entitled to recommend buying new pickups, amps, or EQ plugins.
    - STOP: Enforces `INSUFFICIENT_EVIDENCE_ABSTAINED`; educates user on evidence requirements.


--------------------------------------------------------------------------------
SCENARIO K — NOVEL PLAUSIBLE MECHANISM (CORRECTIONS M2 OF 1C.5a & C-HP)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I have a weird sputtery gating on my clean notes when using my custom boutique fuzz pedal
     with an internal voltage starve knob set to 6V."
   - Audio Stem: High-resolution direct recording of single-note lines exhibiting abrupt decay cutoffs
     and octave-up harmonic fringing at low signal amplitudes.
   - Rig Manifest: Vintage Stratocaster, custom germanium fuzz with variable bias/starve pot set to 6.2V,
     clean tube combo amplifier.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 1 (Troubleshooting / Behavioral Clarification).
   - Intended Musical Role: Determine why clean notes gate prematurely.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Audio exhibits sudden envelope cutoff below -38 dBFS (gating behavior). Low-amplitude
     tails display asymmetrical half-wave rectification and 2nd harmonic frequency doubling.
   - Negative Observation: Digital buffer dropouts NOT DETECTED (zero sample discontinuities).

4. PHENOMENOLOGICAL INTERPRETATION:
   - Signal envelope dies abruptly as note decays; harmonic structure shifts from smooth overtone
     to buzzy, raspy octave artifact as amplitude drops. Perceived as "velcro-fuzz" or "dying battery".

5. KNOWLEDGE USED (PHASE 1C.4 & SPECIAL REVIEW SC):
   - Knowledge Library Query: No canonical KnowledgeClaim exists specifically covering the proprietary
     internal voltage-starve circuit of this boutique germanium pedal.
   - Governing Directive (Correction M2 of 1C.5a): Absence of a matching governed KnowledgeClaim must NOT
     prevent formation of a plausible, bounded, explicitly uncertain hypothesis.
   - Special Review Rule (SC): Absence of schematic, measured internal voltages, and confirmed topology
     strictly prevents asserting detailed internal behavior as strongly supported.

6. HYPOTHESES FORMED (CALIBRATED NOVEL STATUS C-HP):
   - Hypothesis K1 (Germanium Transistor Collector Voltage Starve Under-Biasing):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS (Boutique Pedal Locus)
     * Proposed Mechanism: Starving supply voltage to 6.2V may drop collector bias voltage below base-emitter
       turn-on threshold (V_be ≈ 0.3V for Ge), forcing transistor into cutoff during low-amplitude signal
       troughs, creating passive diode-like threshold gating.
     * Knowledge Grounding Status: NO_MATCHING_GOVERNED_KNOWLEDGE (Novel Physical Hypothesis)
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Physically plausible candidate mechanism under unverified topology/state).
     * Logical Relationship: COMPETING with K2.
   - Hypothesis K2 (Microphonic Guitar Pickup Coil Short / Loose Ground):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Intermittent pickup coil ground wire opening under specific acoustic vibrations.
     * Epistemic Status: WEAKENED_BY_EVIDENCE; Logical Relationship: COMPETING with K1.

7. ASSUMPTIONS:
   - Voltage starve control is actively modifying transistor rail voltage (Risk: MODERATE; unverified schematic).

8. UNKNOWNS:
   - Internal circuit schematic and exact component operating voltages.

9. CONFLICTS:
   - None; novel mechanism aligns with solid-state semiconductor physics.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Test Protocol: "Turn the pedal voltage starve knob back to standard 9V operation. Does the clean
      note decay smoothly without gating? If yes, the sputtering is the intended physical consequence
      of under-biasing the germanium transistors."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & SC):
    - TT is NOT entitled to invent a fake canonical KnowledgeClaim ID.
    - TT is NOT entitled to claim the internal bias behavior is "HIGHLY_PLAUSIBLE" without a schematic.
    - TT is NOT entitled to declare the pedal defective or recommend modifications.
    - STOP: Flags novel hypothesis status transparently; proposes voltage restoration test.


--------------------------------------------------------------------------------
SCENARIO L — REFERENCE CASE RESEMBLES CASE BUT BARRED BY FIREWALL (SC)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I want that classic 1978 Sunset Sound lead guitar brown sound. I have a 100W Marshall
     Plexi reissue head and a 4x12 with Greenbacks."
   - Audio Stem: Processed lead recording (WAV, 24-bit/48 kHz).
   - Historical Reference Archive in Knowledge Base: Documented production case from Sunset Sound (1978)
     where Eddie Van Halen's Marshall Super Lead had its mains voltage dropped to 89V AC using an external
     Variac, running Sylvania 6CA7 power tubes re-biased hot into a dummy load.

2. ENGINEERING INTENT & TARGET SPECIFICITY:
   - Target Specificity: Tier 3 (Artist / Production Family Intent).
   - Intended Musical Role: Singing, warm, compressed vintage hard rock solo tone.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: User audio exhibits high dynamic crest factor (12.8 dB), bright 5 kHz top-end bite,
     and moderate distortion.
   - Negative Observation: Deep power supply voltage sag NOT DETECTED (envelope sag < 1.0 dB).

4. PHENOMENOLOGICAL INTERPRETATION:
   - The user's tone is substantially stiffer, brighter, and more dynamic than the compressed,
     smoothly yielding 1978 brown sound aesthetic.

5. KNOWLEDGE USED & THE REFERENCE CASE FIREWALL (SECTION 13.3 & SC):
   - Reference Case Firewall: The Sunset Sound 1978 Variac case is a historical reference analogy.
     It is STRICTLY QUARANTINED behind the Reference Case Firewall.
   - Prohibited Failure Mode: Inferring that because the user mentioned "1978 brown sound", their
     physical amplifier is currently running low voltage, or that TT can assume their tubes are 6CA7s.
   - Reference Case Analogy Role: Suggests physical mechanisms (power tube saturation, reduced
     plate voltage, speaker compression) as candidate structural analogies. Current operating state is UNKNOWN.

6. HYPOTHESES FORMED (CALIBRATED EPISTEMIC STATUS SC):
   - Hypothesis L1 (Amplifier Operating at Full Line Voltage Without Power Stage Sag):
     * Locus Descriptor: Primary: POWER_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Plexi reissue operating at standard domestic line voltage with high B+ voltage
       (≈480V DC), keeping power tubes in clean linear headroom region; master volume or attenuator
       keeping power section from saturating.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Plate voltage and power tube dissipation unmeasured).
     * Logical Relationship: COMPETING with L2.
   - Hypothesis L2 (Bright Cap Treble Peaking / Stiff Speaker Response):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: COMPOUND (Bright Cap + Speaker)
     * Proposed Mechanism: Reissue amplifier bright cap dominating upper frequencies; speakers operating
       below compression threshold.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Tone stack component values unverified).
     * Logical Relationship: JOINT with L1.

7. ASSUMPTIONS:
   - User amplifier is a standard production reissue operating on standard domestic mains (Risk: LOW).

8. UNKNOWNS:
   - User amplifier Volume knob positions, presence of reactive loadbox or power attenuator.

9. CONFLICTS:
   - None; clear separation between user session reality and historical archive.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Inquiry: "How loud is the amplifier running, and is an attenuator or master volume engaged?
      To capture the yielding compression of the 1978 sound, the power amp section must be driven
      into saturation, or power section sag must be simulated."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & SC):
    - TT is NOT entitled to assert: "Your amp has a Variac set to 89V" or "You have 6CA7 tubes".
    - TT is NOT entitled to select a power-stage or sag intervention in 1C.5b.
    - TT is NOT entitled to instruct the user to physically lower wall voltage with a Variac (safety hazard).
    - STOP: Preserves firewall; relies strictly on current-case observations; halts at hypothesis workspace.'''

if __name__ == "__main__":
    print(get_v02a_p7()[:300])
