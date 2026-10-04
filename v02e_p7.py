#!/usr/bin/env python3
"""
v02e_p7.py: Section 22 Part 2 (Scenarios G to L)
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2e.txt
"""

def get_v02e_p7():
    return '''--------------------------------------------------------------------------------
SCENARIO G — DRY DI LOCALIZATION & TOTAL CAUSE DECOUPLING (CORRECTIONS FB-C1, FB-C4, D3, TEST-1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My high notes on the B and high-E strings have an unbearable harsh, metallic ringing."
   - Audio Stem 1: Processed amplifier track (WAV, 24-bit/48 kHz) exhibiting a +6.5 dB peak at 3.8 kHz.
   - Audio Stem 2: Synchronized Dry Direct Input (DI) capture tapped from high-Z splitter at guitar jack.
   - Rig Manifest: Stratocaster with vintage single-coils, 25-foot unbuffered guitar cable, tube combo.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unanchored).
   - Engineering Task Type: Defect Localization / Multi-Stem Diagnostic Inspection (SPEC-1).
   - Intended Musical Role: Smooth, singing lead tone without piercing metallic ringing.
   - Evidence Directness & Locus Bounding (M1 & Correction 3): Synchronized dry DI provides direct
     empirical evidence that a materially similar 3.8 kHz spectral feature already exists upstream
     of the amplifier, cabinet, and microphone stages.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS FB-C1, FB-C4 & NEG-1):
   - Processed Track Factual: Sustained high notes exhibit a sharp resonant peak at 3.8 kHz (+6.5 dB).
   - Dry DI Factual: High-resolution FFT analysis of the DRY DI stem reveals the identical resonant
     feature (+5.8 dB at 3.8 kHz, Q ≈ 4.1) present on raw, unamplified pickup signals during high-E string plucks,
     empirically establishing that the spectral peak enters the signal path at or upstream of the guitar output jack.
   - Evidential Limitation & Unknown State (FB-C1): Mains-frequency harmonic diagnostic measurements were
     not supplied in case telemetry. Power supply ripple hum is unmeasured and remains UNKNOWN (FB-C1).

4. PHENOMENOLOGICAL INTERPRETATION (CONTAINER PURITY PER FB-C4):
   - Musically and perceptually, sustained notes on high strings produce an abrasive, piercing metallic
     ringing that dominates the decay of the note and induces rapid listener ear fatigue.
   - Note on Container Purity (FB-C4): Upstream localization facts and downstream amplification mechanisms
     are strictly excluded from this phenomenological block; they belong to Evidence Assessment and Hypotheses.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Passive single-coil pickups form a second-order low-pass RLC resonant circuit
     with guitar cable capacitance and instrument potentiometer resistance. A long unbuffered cable
     (25 ft ≈ 750-1000 pF) shifts the electrical resonant peak downward into the sensitive 3.5 - 4.5 kHz
     zone, creating a pronounced high-Q metallic peak (Claim KC-ELEC-012). Mechanical bridge saddle
     burrs or fret contact can also inject narrow resonant frequencies directly into the string vibration.

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & FB-C4):
   - Fundamental Epistemic Distinction (Correction 3):
     ORIGIN OF AN OBSERVED FEATURE != COMPLETE CAUSE OF THE FINAL PERCEIVED PROBLEM.
     While empirical observation establishes that the resonant peak enters the signal chain upstream of the amp,
     downstream amplifier clipping, tone-stack shaping, and speaker/mic frequency response may substantially
     amplify its amplitude, add harmonic distortion sidebands, and exacerbate perceived harshness.
   - Hypothesis G1 (Passive Pickup / Cable Capacitance RLC Resonance):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: CROSS_BOUNDARY_LOADING (Pickup to Cable)
     * Boundary Details: High-inductance single-coil pickup loaded by 25-foot unbuffered cable capacitance.
     * Proposed Mechanism: RLC electrical resonance creating peak at 3.8 kHz prior to amplifier input stage.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Consistent with dry DI feature; cable capacitance and pot values unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart G2: competing explanation (mechanical bridge/fret ringing is an alternative physical origin).
       - Counterpart G3: potentially joint (cable resonance co-occurs with downstream amplifier/mic distortion).
   - Hypothesis G2 (Mechanical Fret / Bridge Saddle Sitar Ringing):
     * Locus Descriptor: Primary: INSTRUMENT_ACOUSTIC; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Physical string buzzing against adjacent fret or burr on bridge saddle.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart G1: competing explanation.
       - Counterpart G3: potentially joint.
   - Hypothesis G3 (Downstream Harmonic Exacerbation by Preamp / Mic):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE & MICROPHONE_TRANSDUCTION; Interaction: COMPOUND
     * Proposed Mechanism: Preamp overdrive clipping the incoming 3.8 kHz resonance and generating odd
       harmonics, exacerbated by on-axis microphone high-frequency boost.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart G1: potentially joint.
       - Counterpart G2: potentially joint.
     * Note: Downstream stages are weakened as hypotheses for the *origin* of the feature, but remain
       active as potential contributors to the *severity* of the perceived harshness.

7. ASSUMPTIONS:
   - Dry DI was tapped directly before any pedals or buffers (Risk: LOW; verified by session manifest).

8. UNKNOWNS:
   - Exact cable capacitance (pF/ft) and guitar volume pot resistance (250k vs 500k).
   - Degree to which downstream amplifier saturation exacerbates the perceived harshness.

9. CONFLICTS:
   - None; DI evidence decisively isolates the upstream boundary of the original resonant feature.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTION TEST-1):
    - Low-Friction Discriminating Test Protocol:
      "Connect the guitar directly to the recording interface with a short (6-foot) low-capacitance cable,
       or insert a clean buffer pedal immediately after the guitar.
       Epistemic Impact (Non-Binary Updating per TEST-1):
       - If the 3.8 kHz resonance peak attenuates or shifts upward out of the critical band, it provides
         strong empirical support for cable-capacitance and loading involvement (Hypothesis G1), though it
         does not by itself establish exact internal pot/pickup component parameters or exclude secondary
         mechanical string-seat contributions.
       - If the peak persists unchanged, it weakens cable-loading hypotheses and strengthens mechanical
         bridge/fret ringing (Hypothesis G2) or internal pickup defect hypotheses."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & CORRECTION 3):
    - TT is NOT entitled to declare: "The sole cause of the user's harshness is cable capacitance."
    - TT is NOT entitled to declare: "Amplifier and microphone stages are ruled out as contributors."
    - TT is NOT entitled to apply a post-cab EQ notch to fix an instrument-side resonance.
    - STOP: Localizes upstream origin boundary; preserves downstream exacerbation hypotheses; requests cable test.


--------------------------------------------------------------------------------
SCENARIO H — CONTEXT SUGGESTS FAMILIAR SOLUTION BUT EVIDENCE CONTRADICTS IT (CORRECTIONS FB-C1, FB-C4, D3, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Dial in my 8-string progressive metal tone. Palm mutes sound weak and anemic."
   - Context: Modern progressive metal ("djent"), 8-string guitar tuned to Drop F.
   - Audio Stem: Processed rhythm track of low-F palm-muted chugs.
   - Direct Measurement: 1/3-octave FFT reveals energy below 120 Hz is severely attenuated (-8.5 dB
     relative to 1 kHz baseline). Transient envelope shows attack is bright and thin with limited low-end weight.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 2 (Style / Era Intent: Modern Progressive Metal).
   - Engineering Task Type: Low-End Defect Investigation (SPEC-1).
   - Intended Musical Role: Tight, percussive, heavy low-end chunk on sub-octave fundamental.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS FB-C1 & NEG-1):
   - Factual: Low-frequency energy (60-120 Hz) is attenuated by -8.5 dB. Attack transient is bright
     and thin; decay lacks sub-bass weight.
   - Evidential Limitation & Unknown State (FB-C1): Harmonic and intermodulation distortion products
     were not measured in supplied telemetry. Non-linear distortion behavior remains UNKNOWN.
     No fabricated IMD figures or unmeasured suppression numbers are asserted (FB-C1).

4. PHENOMENOLOGICAL INTERPRETATION (CONTAINER PURITY PER FB-C4):
   - The guitar tone sounds thin, hollow, lacking low-end body, and lacking percussive chunk and sub-bass weight.
     Palm-muted chugs produce a brittle, clicky transient followed by an anemic, body-less decay.
   - Note on Container Purity (FB-C4): Processing explanations (e.g. "over-filtered by overdrive pedal")
     are strictly excluded from this phenomenological block and placed into candidate hypotheses.

5. KNOWLEDGE USED (PHASE 1C.4 & TECHNICAL PRECISION):
   - Principle 7: "Context informs reasoning but does not prove causation."
   - Production Lore Bias (Finding M3): The ubiquitous recommendation for djent is "insert an overdrive pedal
     (Tube Screamer) with Gain at 0 and Tone/Level at 10 to aggressively cut low end".
   - Empirical Reality (Technical Precision): Applying an aggressive pre-gain bass cut when the low-end
     is ALREADY -8.5 dB down will severely compromise the fundamental frequency of the low F (43.7 Hz, F1),
     resulting in a hollow, thin tone lacking essential bass foundation (Claim KC-MET-021).

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & FB-C4):
   - Hypothesis H1 (Excessive Pre-Gain High-Pass Filtering):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: CROSS_BOUNDARY_LOADING (Pre-Filter to Preamp)
     * Proposed Mechanism: An existing high-pass filter, overdrive pedal, or tight-switch is set with an
       excessively high cutoff frequency (>150 Hz), removing essential sub-bass energy prior to clipping.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Pre-filter cutoff frequency unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart H2: competing explanation (pickup transducer height is an alternative electrical explanation).
   - Hypothesis H2 (Bridge Pickup Height Set Too Low Under Low Strings):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS (Transducer Geometry)
     * Proposed Mechanism: Pickup physical tilt has excessive distance from low 7th/8th strings,
       resulting in weak electromagnetic induction of low frequencies.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Pickup physical height unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart H1: competing explanation.

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
SCENARIO I — CONFLICTING EVIDENCE FROM TWO CAPTURES UNDER DIFFERENT CONDITIONS (CORRECTIONS FB-C1, D6, D3, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - Take 1 Audio (Morning Tracking): Crisp, articulate rhythm track with balanced 3-6 kHz presence.
   - Take 2 Audio (Afternoon Tracking): Muffled, dark rhythm track with 3-6 kHz energy down by -6.2 dB.
   - User Text: "I recorded Take 2 this afternoon without touching any settings, but it sounds completely
     different and dark. Why did the tone change?"
   - Rig Manifest: 100W tube head into physical 4x12 cabinet with dynamic mic on stand.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 4 (Specific Session Pass Consistency).
   - Engineering Task Type: Inter-Session Drift Investigation (SPEC-1).
   - Intended Musical Role: Restore consistency to match Take 1.
   - Measurement Comparability Assessment (M-C2 & D6): Riff performance appears broadly similar in rhythm and
     progression based on auditory check, but micro-variations in playing dynamics, pick attack angle, hand
     placement, and transient intensity cannot be ruled out without multi-take performance analysis.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS FB-C1, M-C3, D6):
   - Comparative Factual: Take 2 exhibits a broadband -6.2 dB drop between 3 kHz and 7 kHz relative
     to Take 1. Lower frequencies (100-500 Hz) remain substantially similar and closely matched within
     comparison tolerance (~0.5 dB match between takes).
   - Evidential Limitation & Unknown State (FB-C1, M-C3): Low-frequency harmonic distortion variance
     was not measured under a calibrated single-frequency excitation model; internal power tube bias
     voltages and chassis temperatures remain UNKNOWN. No fabricated THD percentages or repeatability
     tolerances are asserted (FB-C1, M-C3).

4. PHENOMENOLOGICAL INTERPRETATION (CONTAINER PURITY PER FB-C4):
   - Musically, Take 2 has lost its lively presence, bite, and transient articulation in the 3-7 kHz region,
     sounding distinctly dark, blanketed, and recessed compared to Take 1, while low-end punch and body
     remain perceptually intact.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Small physical shifts in microphone position relative to a guitar speaker cone
     produce radical changes in high-frequency capture. Moving a mic 1 inch off-axis drops 4 kHz presence
     by 4-7 dB while leaving 150 Hz bass untouched (Claim KC-MIC-005). Alternatively, switching from
     bridge to middle pickup drops treble, or an unbuffered cable was swapped.

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & OPEN-1):
   - Hypothesis I1 (Microphone Physical Dislocation / Bump):
     * Locus Descriptor: Primary: MICROPHONE_TRANSDUCTION; Interaction: SINGLE_LOCUS (Transducer Geometry)
     * Proposed Mechanism: Physical mic stand was bumped, vibrating or shifting capsule off-center
       from the speaker dust-cap between sessions.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Mic physical position unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart I2: competing explanation.
       - Counterpart I3: competing explanation.
   - Hypothesis I2 (Pickup Selector Position Inadvertently Altered):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Guitar pickup switch knocked from Bridge to Middle/Neck position.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Switch state unverified).
     * Pairwise Relationships (D3):
       - Counterpart I1: competing explanation.
       - Counterpart I3: competing explanation.
   - Hypothesis I3 (Guitar Cable Swap):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: CROSS_BOUNDARY_LOADING
     * Proposed Mechanism: High-capacitance cable substituted in afternoon tracking.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION.
     * Pairwise Relationships (D3):
       - Counterpart I1: competing explanation.
       - Counterpart I2: competing explanation.

7. ASSUMPTIONS:
   - Amplifier controls were not intentionally altered (Risk: MODERATE; based on user report).

8. UNKNOWNS:
   - Physical mic position verification (no photograph or laser measurement provided).

9. CONFLICTS (REVISED PER M-C2 & D6):
   - The user reports no known intentional settings change, but the two captures differ materially in
     high-frequency presence (-6.2 dB). One or more relevant performance, capture, signal-path, processing,
     environmental, equipment-state, or analysis conditions therefore differ or remain unverified (M-C2).

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTIONS OPEN-1, M-C2, D6):
    - Targeted Physical Checklist (Non-Exhaustive Prioritization per OPEN-1 & D6):
      "A selective 6 dB high-frequency attenuation with low-frequency response closely matched within
       comparison tolerance (~0.5 dB) indicates a material difference in tracking or analysis conditions.
       Potential sources include performance variations, microphone placement, pickup selection, cable loading,
       amplifier state, or digital processing. Three high-value possibilities worth checking early without
       assuming a closed set are:
       1. Physical microphone placement: Was the mic stand bumped, displaced, or rotated off-axis between sessions?
       2. Instrument pickup selection: Was the pickup selector switch inadvertently knocked from Bridge to Middle/Neck?
       3. Signal cable loading: Was a different or unbuffered instrument cable used in the afternoon session?
       (Other possibilities such as tone pot displacement, performance pick-angle variations, interface
        input impedance shifts, or undocumented session conditions remain open)."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to silently average the two takes or guess which one is 'correct'.
    - TT is NOT entitled to apply a +6 dB shelving EQ to Take 2 to force a match.
    - STOP: Maintains conflict visibly; isolates plausible physical disturbance mechanisms.


--------------------------------------------------------------------------------
SCENARIO J — EVIDENCE TOO POOR FOR USEFUL HYPOTHESIS NARROWING (CORRECTIONS D4, FB-C4, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Why does my guitar sound so bad? Fix it."
   - Audio Stem: 3.5-second audio snippet recorded on a mobile phone voice memo in a reverberant garage;
     file is lossy MP3 (64 kbps, mono, 22.05 kHz sample rate).
   - Audio Quality Assessment (M1):
     * Severe digital lossy compression artifacts (spectral cutoff at 11 kHz; swishy MP3 pre-echo).
     * Severe acoustic room reverberation (RT60 ≈ 1.8 s) dominating direct sound.
     * Extensive full-scale waveform clipping and peak flattening.
     * Background speech and street traffic audible.
   - Rig Manifest: Blank ("electric guitar and amp").

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unspecified).
   - Engineering Task Type: Intake Quality Triage / Insufficient Evidence Abstention (SPEC-1).

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS D4 & FB-C4):
   - Quality Assessment Observation: File bandwidth capped at 11 kHz (Nyquist ceiling of 22.05 kHz).
     Room reflection energy exceeds direct sound energy by +4.2 dB. Captured waveform displays extensive
     samples reaching 0 dBFS and visibly flattened full-scale peaks under waveform inspection (Method: sample
     peak meter and waveform display; harmonic distortion spectrum was not separately measured per D4).
   - Epistemic Evaluation: Audio is completely inadequate for electro-acoustic analysis.

4. PHENOMENOLOGICAL INTERPRETATION (CONTAINER PURITY PER FB-C4):
   - The capture sounds chaotic, severely distorted, and heavily reverberant, washed out by long room decay,
     harsh clipping hash, and swishy low-bitrate compression artifacts. Timbre, pickup characteristics,
     and amplifier saturation behavior cannot be discerned.
   - Note on Container Purity (FB-C4): Possible phone microphone diaphragm overload, preamp clipping,
     or converter oversaturation remain candidate technical explanations, not established facts.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Principle 3 & Principle 17: Operational reality mandates recognizing when data is insufficient.
     Principle 17 establishes: "Deterministic Code Validates Constraints; It Does Not Replace Sound
     Engineering Judgement" (and its derived invariant: deterministic systems may verify only truth
     they genuinely own).
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
      "We cannot diagnose your tone from this recording because it is heavily distorted by clipping,
       room reverberation, and low-quality compression.
       To give you an accurate engineering diagnosis, please provide:
       1. A direct audio recording from your amplifier or audio interface (24-bit WAV preferred).
       2. The model of your guitar and amplifier.
       3. A 10-second recording of rhythm chords playing your typical riff."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2):
    - TT is NOT entitled to guess what the guitar or amp sounds like.
    - TT is NOT entitled to recommend buying new pickups, amps, or EQ plugins.
    - STOP: Enforces `INSUFFICIENT_EVIDENCE_ABSTAINED`; educates user on evidence requirements.


--------------------------------------------------------------------------------
SCENARIO K — NOVEL PLAUSIBLE MECHANISM (CORRECTIONS FB-C1, D3, M2, C-HP, TEST-1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I have a weird sputtery gating on my clean notes when using my custom boutique fuzz pedal
     with an internal voltage starve knob set to 6V."
   - Audio Stem: High-resolution direct recording of single-note lines exhibiting abrupt decay cutoffs
     and octave-up harmonic fringing at low signal amplitudes.
   - Rig Manifest: Vintage Stratocaster, custom germanium fuzz with variable bias/starve pot set to 6.2V,
     clean tube combo amplifier.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 1 (Broad Creative Intent / Unanchored).
   - Engineering Task Type: Novel Circuit Behavioral Investigation (SPEC-1).
   - Intended Musical Role: Determine why clean notes gate prematurely.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS FB-C1 & NEG-1):
   - Factual: Audio exhibits sudden envelope decay cutoff below -38 dBFS (gating behavior). Low-amplitude
     tails display asymmetrical half-wave rectification and 2nd harmonic frequency doubling.
   - Evidential Limitation & Unknown State (FB-C1): A sample-level discontinuity test to inspect for
     digital buffer dropouts was not performed in original evidence; digital dropout remains an unverified
     hypothesis. No fabricated dropout counts or zero-crossing numbers are asserted (FB-C1).

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

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & C-HP):
   - Hypothesis K1 (Germanium Transistor Collector Voltage Starve Under-Biasing):
     * Locus Descriptor: Primary: PRE_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS (Boutique Pedal Locus)
     * Proposed Mechanism: Starving supply voltage to 6.2V may drop collector bias voltage below base-emitter
       turn-on threshold (V_be ≈ 0.3V for Ge), forcing transistor into cutoff during low-amplitude signal
       troughs, creating passive diode-like threshold gating.
     * Knowledge Grounding Status: NO_MATCHING_GOVERNED_KNOWLEDGE (Novel Physical Hypothesis)
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Physically plausible candidate mechanism under unverified topology/state).
     * Pairwise Relationships (D3):
       - Counterpart K2: competing explanation.
   - Hypothesis K2 (Microphonic Guitar Pickup Coil Short / Loose Ground):
     * Locus Descriptor: Primary: INSTRUMENT_ELECTRICAL; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Intermittent pickup coil ground wire opening under specific acoustic vibrations.
     * Epistemic Status: WEAKENED_BY_EVIDENCE.
     * Pairwise Relationships (D3):
       - Counterpart K1: competing explanation.

7. ASSUMPTIONS:
   - Voltage starve control is actively modifying transistor rail voltage (Risk: MODERATE; unverified schematic).

8. UNKNOWNS:
   - Internal circuit schematic and exact component operating voltages.

9. CONFLICTS:
   - None; novel mechanism aligns with solid-state semiconductor physics.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTION TEST-1):
    - Test Protocol:
      "Test: Restore the pedal supply voltage control back to standard 9.0V operation.
       Epistemic Impact (Non-Binary Updating per TEST-1):
       - If the gating cutoff disappears and clean decays sustain normally, it provides strong qualitative
         support for a causal dependency between starved supply voltage and the sputtering gating behavior,
         weakening competing guitar wiring or amplifier defect hypotheses. However, it does NOT by itself
         establish the exact internal transistor bias physics, component values, or designer intent without
         circuit schematic analysis.
       - If the gating persists at 9.0V, it weakens the voltage-starve explanation and elevates internal
         component faults or pickup defects for further investigation."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2 & SC):
    - TT is NOT entitled to invent a fake canonical KnowledgeClaim ID.
    - TT is NOT entitled to claim the internal bias behavior is "HIGHLY_PLAUSIBLE" without a schematic.
    - TT is NOT entitled to declare the pedal defective or recommend modifications.
    - STOP: Flags novel hypothesis status transparently; proposes voltage restoration test.


--------------------------------------------------------------------------------
SCENARIO L — REFERENCE CASE RESEMBLES CASE BUT BARRED BY FIREWALL (CORRECTIONS D4, FB-C1, FB-C2, D3, FW-1, SPEC-1)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I want that classic 1978 Sunset Sound lead guitar brown sound. I have a 100W Marshall
     Plexi reissue head and a 4x12 with Greenbacks."
   - Audio Stem: Processed lead recording (WAV, 24-bit/48 kHz).
   - Historical Reference Archive in Knowledge Base: Documented production case from Sunset Sound (1978)
     where Eddie Van Halen's Marshall Super Lead had its mains voltage dropped to 89V AC using an external
     Variac, running Sylvania 6CA7 power tubes re-biased hot into a dummy load.

2. ENGINEERING INTENT & TARGET SPECIFICITY (CORRECTIONS SPEC-1 & M1):
   - Target Specificity: Tier 3 (Artist / Production Family Intent: 1978 Brown Sound).
   - Engineering Task Type: Reference Analogy Contrast (SPEC-1).
   - Intended Musical Role: Singing, warm, compressed vintage hard rock solo tone.

3. FACTUAL / PERCEPTUAL OBSERVATIONS (CORRECTIONS D4, FB-C1, FB-C2 & NEG-1):
   - Dynamic Factual (D4): User audio exhibits high dynamic crest factor (12.8 dB), bright 5 kHz top-end bite,
     and relatively open recorded dynamics compared to compressed vintage benchmarks.
   - Measurement Ownership Note (FB-C2, D4): Crest factor establishes the peak-to-average dynamic ratio
     in the captured audio; it does not directly measure internal amplifier circuit dynamics. Internal B+
     voltage, plate sag, power-stage saturation, and tube dissipation remain unmeasured and UNKNOWN.
     No fabricated envelope sag thresholds or internal voltage numbers are asserted (FB-C1, FB-C2, D4).

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

6. HYPOTHESES FORMED & PAIRWISE RELATIONSHIPS (CORRECTIONS D3 & FW-1):
   - Hypothesis L1 (Amplifier Operating at Full Line Voltage Without Power Stage Sag):
     * Locus Descriptor: Primary: POWER_AMPLIFIER_STAGE; Interaction: SINGLE_LOCUS
     * Proposed Mechanism: Plexi reissue operating at standard domestic line voltage with high B+ voltage
       (≈480V DC), keeping power tubes in clean linear headroom region; master volume or attenuator
       keeping power section from saturating.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Plate voltage and power tube dissipation unmeasured).
     * Pairwise Relationships (D3):
       - Counterpart L2: potentially joint (power amplifier linear headroom state and tone-stack bright cap /
         speaker stiffness co-occur and jointly contribute to perceived brightness and dynamic stiffness).
   - Hypothesis L2 (Bright Cap Treble Peaking / Stiff Speaker Response):
     * Locus Descriptor: Primary: AMPLIFIER_TONE_STACK; Interaction: COMPOUND (Bright Cap + Speaker)
     * Proposed Mechanism: Reissue amplifier bright cap dominating upper frequencies; speakers operating
       below compression threshold.
     * Epistemic Status: PLAUSIBLE_UNCONFIRMED (Tone stack component values unverified).
     * Pairwise Relationships (D3):
       - Counterpart L1: potentially joint (co-occurring contributor to dynamic stiffness and brightness).

7. ASSUMPTIONS:
   - User amplifier is a standard production reissue operating on standard domestic mains (Risk: LOW).

8. UNKNOWNS:
   - User amplifier Volume knob positions, presence of reactive loadbox or power attenuator.

9. CONFLICTS:
   - None; clear separation between user session reality and historical archive.

10. ADDITIONAL EVIDENCE WORTH REQUESTING (CORRECTIONS D4 & FW-1):
    - Inquiry & Diagnostic Discriminating Context (FW-1 & D4):
      "The historical reference benchmark exhibits significant dynamic yield and power-stage compression
       characteristics. The current user capture exhibits a high dynamic crest factor (12.8 dB) without
       the dynamic yield characteristic of the historical benchmark.
       Discriminating Inquiries:
       1. Is the amplifier operating into a reactive loadbox, power attenuator, or directly into a speaker cabinet?
       2. What are the physical master volume and channel volume knob positions on the amplifier head?
       Additional discriminating evidence (e.g. measuring dynamic crest at varying master/volume settings
       or tapping the preamp send) is required to evaluate whether power-stage saturation, power supply
       impedance behavior, cabinet acoustic compression, or a combination explains the dynamic difference,
       without pre-empting Phase 1C.5d intervention selection."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (STRICT BOUNDARY B2, SC, FW-1):
    - TT is NOT entitled to assert: "Your amp has a Variac set to 89V" or "You have 6CA7 tubes".
    - TT is NOT entitled to prescribe power-stage saturation, sag simulation, or processor selection in 1C.5b (FW-1).
    - TT is NOT entitled to instruct the user to physically lower wall voltage with a Variac (safety hazard).
    - STOP: Preserves firewall; relies strictly on current-case observations; halts at hypothesis workspace.'''

if __name__ == "__main__":
    print(get_v02e_p7()[:300])
