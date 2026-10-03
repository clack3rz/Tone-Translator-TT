#!/usr/bin/env python3
"""
Section 22 Part 2 (Scenarios G to L) for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
"""

def get_section_22_part2():
    return '''--------------------------------------------------------------------------------
SCENARIO G — DRY DI + PROCESSED CAPTURE ALLOWING STRONGER HYPOTHESIS FORMATION
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "My high notes on the B and high-E strings have an unbearable harsh, metallic ringing."
   - Audio Stem 1: Processed amplifier track (WAV, 24-bit/48 kHz) exhibiting a +6.5 dB peak at 3.8 kHz.
   - Audio Stem 2: Synchronized Dry Direct Input (DI) capture tapped from high-Z splitter at guitar jack.
   - Rig Manifest: Stratocaster with vintage single-coils, 25-foot unbuffered guitar cable, tube combo.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Defect Troubleshooting).
   - Intended Musical Role: Smooth, singing lead tone without piercing metallic ringing.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Processed Track Factual: Sustained high notes exhibit a sharp resonant peak at 3.8 kHz (+6.5 dB).
   - Dry DI Factual: High-resolution FFT analysis of the DRY DI stem reveals the identical resonant
     peak (+5.8 dB at 3.8 kHz, Q ≈ 4.1) present on raw, unamplified pickup signals during high-E string plucks.
   - Negative Observation: Amplifier power supply ripple hum NOT DETECTED in processed audio (< -70 dBFS).

4. PHENOMENOLOGICAL INTERPRETATION:
   - The harsh ringing is NOT an artifact introduced by amplifier overdrive, digital clipping,
     or microphone placement. The physical source of the resonant peak is already fully formed
     in the electrical signal emerging directly from the guitar output jack.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Canonical Knowledge: Passive single-coil pickups form a second-order low-pass RLC resonant circuit
     with guitar cable capacitance and instrument potentiometer resistance. A long unbuffered cable
     (25 ft ≈ 750-1000 pF) shifts the electrical resonant peak downward into the sensitive 3.5 - 4.5 kHz
     zone, creating a pronounced high-Q metallic peak (Claim KC-ELEC-012).

6. HYPOTHESES FORMED:
   - Hypothesis G1 (Passive Pickup / Cable Capacitance RLC Resonance):
     * Signal Locus: INSTRUMENT_ELECTRICAL
     * Proposed Mechanism: Interaction between high-inductance single-coil pickup and long cable
       capacitance peaking electrical resonance at 3.8 kHz prior to amplifier input.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with G2.
   - Hypothesis G2 (Mechanical Fret / Bridge Saddle Sitar Ringing):
     * Signal Locus: INSTRUMENT_ACOUSTIC
     * Proposed Mechanism: Physical string buzzing against adjacent fret or burr on bridge saddle.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with G1.
   - Downstream Hypotheses (Amp clipping, Cab resonance, Mic beaming):
     * Epistemic Status: DEACTIVATED_EVIDENTIALLY (Ruled out because artifact is present in Dry DI).

7. ASSUMPTIONS:
   - Dry DI was tapped directly before any pedals or buffers (Risk: LOW; verified by session manifest).

8. UNKNOWNS:
   - Exact cable capacitance (pF/ft) and guitar volume pot resistance (250k vs 500k).

9. CONFLICTS:
   - None; DI evidence decisively isolates the signal locus to the instrument side of the signal chain.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Low-Friction Test: "Plug the guitar directly into the audio interface with a short (6-10 foot)
      low-capacitance cable, or insert a buffered pedal right after the guitar. Does the 3.8 kHz peak vanish?"

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to diagnose the amplifier head or adjust virtual mic positions.
    - TT is NOT entitled to apply a post-cab EQ notch to fix an instrument cable loading defect.
    - STOP: Isolates locus to instrument; proposes low-capacitance test.


--------------------------------------------------------------------------------
SCENARIO H — CONTEXT SUGGESTS FAMILIAR SOLUTION BUT EVIDENCE CONTRADICTS IT
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "Dial in my 8-string progressive metal tone. Palm mutes sound weak and anemic."
   - Context: Modern progressive metal ("djent"), 8-string guitar tuned to Drop F.
   - Audio Stem: Processed rhythm track of low-F palm-muted chugs.
   - Direct Measurement: 1/3-octave FFT reveals energy below 120 Hz is severely attenuated (-8.5 dB
     relative to 1 kHz baseline). Transient envelope shows attack is thin and papery with no low-end punch.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 2 (Style/Genre Intent).
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
   - Production Lore Bias: The ubiquitous recommendation for djent is "insert an overdrive pedal
     (Tube Screamer) with Gain at 0 and Tone/Level at 10 to aggressively cut low end".
   - Empirical Reality: Applying an aggressive pre-gain bass cut when the low-end is ALREADY -8.5 dB
     down will completely destroy the sub-fundamental of the low F (43.7 Hz), turning the 8-string
     into a thin, buzz-saw caricature (Claim KC-MET-021).

6. HYPOTHESES FORMED:
   - Hypothesis H1 (Excessive Pre-Gain High-Pass Filtering):
     * Signal Locus: PRE_AMPLIFIER_STAGE & DIGITAL_SIGNAL_PROCESSING
     * Proposed Mechanism: An existing high-pass filter or overdrive pedal is set with an excessively
       high cutoff frequency (>150 Hz), removing essential sub-bass energy.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with H2.
   - Hypothesis H2 (Bridge Pickup Height Set Too Low Under Low Strings):
     * Signal Locus: INSTRUMENT_ELECTRICAL
     * Proposed Mechanism: Pickup physical tilt has excessive distance from low 7th/8th strings,
       resulting in weak electromagnetic induction of low frequencies.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with H1.

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

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to recommend inserting an overdrive pedal or cutting 100 Hz.
    - TT is NOT entitled to apply a generic djent recipe in defiance of measured reality.
    - STOP: Repudiates genre recipe; maintains hypothesis of over-filtering.


--------------------------------------------------------------------------------
SCENARIO I — CONFLICTING EVIDENCE FROM TWO CAPTURES UNDER DIFFERENT CONDITIONS
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - Take 1 Audio (Morning Tracking): Crisp, articulate rhythm track with balanced 3-6 kHz presence.
   - Take 2 Audio (Afternoon Tracking): Muffled, dark rhythm track with 3-6 kHz energy down by -6.2 dB.
   - User Text: "I recorded Take 2 this afternoon without touching any settings, but it sounds completely
     different and dark. Why did the tone change?"
   - Rig Manifest: 100W tube head into physical 4x12 cabinet with dynamic mic on stand.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Drift / Discrepancy Investigation).
   - Intended Musical Role: Restore consistency to match Take 1.

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

6. HYPOTHESES FORMED:
   - Hypothesis I1 (Microphone Physical Dislocation / Bump):
     * Signal Locus: MICROPHONE_TRANSDUCTION
     * Proposed Mechanism: Physical mic stand was bumped, vibrating or shifting capsule off-center
       from the speaker dust-cap between sessions.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with I2, I3.
   - Hypothesis I2 (Pickup Selector Position Inadvertently Altered):
     * Signal Locus: INSTRUMENT_ELECTRICAL
     * Proposed Mechanism: Guitar pickup switch knocked from Bridge to Middle/Neck position.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: COMPETING with I1.
   - Hypothesis I3 (Guitar Cable Swap):
     * Signal Locus: INSTRUMENT_ELECTRICAL
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

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
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
   - Audio Quality Assessment:
     * Severe digital lossy compression artifacts (spectral cutoff at 11 kHz; swishy MP3 pre-echo).
     * Severe acoustic room reverberation (RT60 ≈ 1.8 s) dominating direct sound.
     * Hard clipping of mobile phone microphone diaphragm (+12 dB over input ceiling).
     * Background speech and street traffic audible.
   - Rig Manifest: Blank ("electric guitar and amp").

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Vague Complaint).

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Quality Assessment Observation: File bandwidth capped at 11 kHz (Nyquist ceiling of 22.05 kHz).
     Room reflection energy exceeds direct sound energy by +4.2 dB. Phone mic is hard-clipped.
   - Epistemic Evaluation: Audio is completely inadequate for electro-acoustic analysis.

4. PHENOMENOLOGICAL INTERPRETATION:
   - The capture is dominated by room acoustics, diaphragm clipping, and low-bitrate compression.
     Any attempt to evaluate pickup tone, tube saturation, or speaker response is pure fiction.

5. KNOWLEDGE USED (PHASE 1C.4):
   - Principle 3 & Principle 15: Operational reality mandates recognizing when data is insufficient.
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

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to guess what the guitar or amp sounds like.
    - TT is NOT entitled to recommend buying new pickups, amps, or EQ plugins.
    - STOP: Enforces `INSUFFICIENT_EVIDENCE_ABSTAINED`; educates user on evidence requirements.


--------------------------------------------------------------------------------
SCENARIO K — NOVEL PLAUSIBLE MECHANISM NOT IN GOVERNED KNOWLEDGE (CORRECTION M2)
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I have a weird sputtery gating on my clean notes when using my custom boutique fuzz pedal
     with an internal voltage starve knob set to 6V."
   - Audio Stem: High-resolution direct recording of single-note lines exhibiting abrupt decay cutoffs
     and octave-up harmonic fringing at low signal amplitudes.
   - Rig Manifest: Vintage Stratocaster, custom germanium fuzz with variable bias/starve pot set to 6.2V,
     clean tube combo amplifier.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 1 (Troubleshooting / Behavioral Clarification).
   - Intended Musical Role: Determine why clean notes gate prematurely.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: Audio exhibits sudden envelope cutoff below -38 dBFS (gating behavior). Low-amplitude
     tails display asymmetrical half-wave rectification and 2nd harmonic frequency doubling.
   - Negative Observation: Digital buffer dropouts NOT DETECTED (zero sample discontinuities).

4. PHENOMENOLOGICAL INTERPRETATION:
   - Signal envelope dies abruptly as note decays; harmonic structure shifts from smooth overtone
     to buzzy, raspy octave artifact as amplitude drops. Perceived as "velcro-fuzz" or "dying battery".

5. KNOWLEDGE USED (PHASE 1C.4):
   - Knowledge Library Query: No canonical KnowledgeClaim exists specifically covering the proprietary
     internal voltage-starve circuit of this boutique germanium pedal.
   - Governing Directive (Correction M2): Absence of a matching governed KnowledgeClaim must NOT
     prevent formation of a plausible, bounded, explicitly uncertain hypothesis.

6. HYPOTHESES FORMED:
   - Hypothesis K1 (Germanium Transistor Collector Voltage Starve Under-Biasing):
     * Signal Locus: PRE_AMPLIFIER_STAGE (Pedalboard Locus)
     * Proposed Mechanism: Starving supply voltage to 6.2V drops collector bias voltage below base-emitter
       turn-on threshold (V_be ≈ 0.3V for Ge), forcing transistor into cutoff during low-amplitude signal
       troughs, creating passive diode-like threshold gating.
     * Knowledge Grounding Status: NO_MATCHING_GOVERNED_KNOWLEDGE (Novel Physical Hypothesis)
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with K2.
   - Hypothesis K2 (Microphonic Guitar Pickup Coil Short / Loose Ground):
     * Signal Locus: INSTRUMENT_ELECTRICAL
     * Proposed Mechanism: Intermittent pickup coil ground wire opening under specific acoustic vibrations.
     * Epistemic Status: WEAKENED_BY_EVIDENCE; Logical Relationship: COMPETING with K1.

7. ASSUMPTIONS:
   - Voltage starve control is actively modifying transistor rail voltage (Risk: LOW).

8. UNKNOWNS:
   - Internal circuit schematic of the boutique pedal.

9. CONFLICTS:
   - None; novel mechanism aligns precisely with solid-state physics.

10. ADDITIONAL EVIDENCE WORTH REQUESTING:
    - Test Protocol: "Turn the pedal voltage starve knob back to standard 9V operation. Does the clean
      note decay smoothly without gating? If yes, the sputtering is the intended physical consequence
      of under-biasing the germanium transistors."

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to invent a fake canonical KnowledgeClaim ID.
    - TT is NOT entitled to declare the boutique pedal "defective" (voltage starve gating is often intentional).
    - STOP: Flags novel hypothesis status transparently; proposes voltage restoration test.


--------------------------------------------------------------------------------
SCENARIO L — REFERENCE CASE STRONGLY RESEMBLES CASE BUT BARRED BY FIREWALL
--------------------------------------------------------------------------------
1. SUPPLIED EVIDENCE:
   - User Text: "I want that classic 1978 Sunset Sound lead guitar brown sound. I have a 100W Marshall
     Plexi reissue head and a 4x12 with Greenbacks."
   - Audio Stem: Processed lead recording (WAV, 24-bit/48 kHz).
   - Historical Reference Archive in Knowledge Base: Documented production case from Sunset Sound (1978)
     where Eddie Van Halen's Marshall Super Lead had its mains voltage dropped to 89V AC using an external
     Variac, running Sylvania 6CA7 power tubes re-biased hot into a dummy load.

2. ENGINEERING INTENT:
   - Specificity Tier: Tier 3 (Artist / Era Intent).
   - Intended Musical Role: Singing, warm, compressed vintage hard rock solo tone.

3. FACTUAL / PERCEPTUAL OBSERVATIONS:
   - Factual: User audio exhibits high dynamic crest factor (12.8 dB), bright 5 kHz top-end bite,
     and moderate distortion.
   - Negative Observation: Deep power supply voltage sag NOT DETECTED (envelope sag < 1.0 dB).

4. PHENOMENOLOGICAL INTERPRETATION:
   - The user's tone is substantially stiffer, brighter, and more dynamic than the compressed,
     smoothly yielding 1978 brown sound aesthetic.

5. KNOWLEDGE USED & THE REFERENCE CASE FIREWALL (PRINCIPLE 20):
   - Principle 20 & Section 13.2: The Sunset Sound 1978 Variac case is a historical reference analogy.
     It is STRICTLY QUARANTINED behind the Reference Case Firewall.
   - Prohibited Failure Mode: Inferring that because the user mentioned "1978 brown sound", their
     physical amplifier is currently running low voltage, or that TT can declare their plate voltage
     is 89V.
   - Valid Role of Reference Case: Suggests electrical mechanisms (power tube saturation, reduced
     B+ plate voltage, speaker compression) as candidate structural analogies.

6. HYPOTHESES FORMED:
   - Hypothesis L1 (Amplifier Operating at Full Line Voltage Without Power Stage Sag):
     * Signal Locus: POWER_AMPLIFIER_STAGE
     * Proposed Mechanism: Plexi reissue operating at standard 120V line voltage with high B+ voltage
       (≈480V DC), keeping power tubes in clean linear headroom region; master volume or attenuator
       keeping power section from saturating.
     * Epistemic Status: HIGHLY_PLAUSIBLE; Logical Relationship: COMPETING with L2.
   - Hypothesis L2 (Excessive Speaker Attenuation / Bright Reissue Voicing):
     * Signal Locus: AMPLIFIER_TONE_STACK & SPEAKER_ELECTROMECHANICAL
     * Proposed Mechanism: Reissue amplifier bright cap (5000 pF on Volume 1) dominating top-end,
       preventing warm low-mid compression.
     * Epistemic Status: ACTIVE_UNDER_EVALUATION; Logical Relationship: JOINT with L1.

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

11. WHAT TT IS NOT ENTITLED TO CONCLUDE:
    - TT is NOT entitled to assert: "Your amp has a Variac set to 89V" or "You have 6CA7 tubes".
    - TT is NOT entitled to instruct the user to physically lower wall voltage with a Variac (safety violation).
    - STOP: Preserves firewall; relies strictly on current-case observations.'''

if __name__ == "__main__":
    print(get_section_22_part2()[:300])
