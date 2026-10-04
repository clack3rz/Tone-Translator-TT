#!/usr/bin/env python3
"""
p1C5c_p6.py: Section 21 Part 1 (Worked Challenge Scenarios A to F)
for TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1a.txt
Phase 1C.5c — Diagnosis & Causal Reasoning (Bounded Causal-Epistemic Correction)
"""

def get_p1C5c_p6():
    return '''================================================================================
SECTION 21 — WORKED CHALLENGE SCENARIOS A–L
================================================================================

The twelve worked challenge scenarios below serve as normative architectural benchmarks
for Phase 1C.5c. They demonstrate the rigorous transition from an unresolved Phase 1C.5b
hypothesis workspace into a defensible causal diagnosis, compound causal structure, or
principled abstention, while maintaining absolute fidelity to the Remedy Firewall (RF-1).


--------------------------------------------------------------------------------
SCENARIO A — STRONG SINGLE DOMINANT CAUSE (MIC DUST-CAP BEAMING)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My recorded distorted guitar tone has a piercing, brittle high-end fizz on chords."
   - DSP Observations: +6.4 dB elevation in the 4.0-5.0 kHz region on close-mic cab capture; Dry DI shows flat response.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Transduction): Center-cone on-axis mic placement capturing directional dust-cap acoustic beaming.
     * H2 (Preamp): Preamp cold-clipper generating excessive upper harmonic distortion.
     * H3 (Speaker): Electro-mechanical speaker cone breakup in the 4.5 kHz zone.
   - Stage 06A Discriminating Test Outcome:
     * Action: Microphone moved 1.5 inches off-axis toward speaker cone edge; gain and distance held constant.
     * Result: 4.0-5.0 kHz energy attenuates by -5.2 dB; harsh fizz disappears from listening audition;
       overall dynamic crunch remains punchy and articulate.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Necessary-Prediction Confirmation: Moving the microphone off-axis confirmed the direct acoustic
     prediction required if dust-cap beaming was the cause.
   - Controlled Substitution/Manipulation: Changing only the physical angle/position altered the phenomenon.
   - Locus Isolation: Dry DI showed nominal upper-mids, isolating feature downstream of the instrument.

3. LOCUS VS MECHANISM RESOLUTION (CORRECTION C4):
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED` (Locus resolved to microphone transduction / directional acoustic capture boundary; exact radiator mechanism unresolved between dust-cap beaming and localized cone radiation).
   - Signal Locus: MICROPHONE_TRANSDUCTION / DIRECTIONAL ACOUSTIC RADIATION FIELD (isolated via off-axis test).
   - Physical Mechanism: Directional high-frequency speaker acoustic radiation captured on-axis; dust-cap beaming is a physically plausible mechanism, while independent cone breakup / flexure contribution remains unisolated.

4. CAUSAL NARROWING & EXCLUSION:
   - Hypothesis H1 (On-Axis Capture of Directional Radiation): Confirmed as dominant causal explanation at the positional/directional acoustic level via off-axis necessary-prediction testing.
   - Hypothesis H2 (Preamp Cold Clipper): Weakened as primary explanation; preamp settings were unchanged
     during off-axis test, yet the acoustic defect was eliminated. Retained as minor baseline saturation.
   - Hypothesis H3 (Speaker Breakup) (Corrections B5 & C4): Speaker breakup remains unisolated as an independent mechanism unless a speaker-specific discriminating test is performed; while the off-axis test strongly confirms directional acoustic capture, cone flexure behavior can be spatially complex.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Cause: On-axis capture of directional high-frequency speaker radiation (`DOMINANT`).
   - Specific Physical Radiator: Dust-cap beaming is physically plausible; independent cone breakup unisolated.
   - Enabling Condition: High-gain amplifier providing upper-frequency harmonic energy for the mic to transduce.

6. CONCEPTUAL CAUSAL CHAIN:
   Speaker radiates highly directional 4.0-5.0 kHz acoustic energy perpendicular to the cone center (consistent with dust-cap beaming or localized cone radiation)
   → On-axis microphone capsule positioned directly in the directional radiation path captures elevated 4.2 kHz acoustic pressure
   → Captured audio exhibits +6.4 dB spectral peak relative to off-axis energy
   → Human listener experiences piercing, fatiguing high-frequency fizz.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: High explanatory coverage of directional fizz anomaly;
     accounts for measured +6.4 dB peak and -5.2 dB off-axis delta; exact radiator mechanism and unisolated cone flexure noted in uncertainty.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Microphone distance from grille cloth was maintained during off-axis movement (Risk: LOW).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION` (5.2 dB attenuation is too large to be explained by minor distance drift).

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION C4):
   - Diagnosis Status: `CAUSAL_DIAGNOSIS_SUPPORTED`
   - Calibrated Assertion: "Evidence strongly supports on-axis capture of directional high-frequency speaker radiation as the dominant cause of the 4.0-5.0 kHz fizz; dust-cap beaming is a physically plausible mechanism, while independent cone-breakup contribution remains unresolved; preamp clipping is weakened as a primary explanation."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Internal amplifier cathode bypass capacitor tolerances and tube bias states.
    - Operational Validity Bounds: Diagnosis applies specifically to close-microphone placement on this speaker cone.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to prescribe: "Leave the mic at 1.5 inches off-axis and cut 4.5 kHz by 3 dB on your DAW EQ."
    - TT is NOT entitled to recommend buying a ribbon microphone or swapping speaker models.
    - STOP: Commits causal diagnosis dossier to trace; hands off to Phase 1C.5d.


--------------------------------------------------------------------------------
SCENARIO B — COMPOUND CAUSATION (PICKUP RESONANCE + PREAMP CLIPPING)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My bridge humbucker rhythm tone has an unbearable metallic clank on heavy palm mutes."
   - DSP Observations: +7.2 dB resonance peak at 3.6 kHz on Dry DI; recorded processed track shows extreme
     intermodulation distortion and odd harmonics across 3.6 kHz, 7.2 kHz, and 10.8 kHz; crest factor is low (6.8 dB).
   - Candidate Hypotheses from 1C.5b:
     * H1 (Instrument Electrical): High cable capacitance interacting with pickup inductance producing resonant peak.
     * H2 (Preamplifier Stage): Cascaded preamp gain stages heavily overdriven, squaring the waveform.
     * H3 (Speaker): Voice coil rub or mechanical distortion.
   - Stage 06A Test Outcomes:
     * Short-Cable Test (Guitar directly into interface via short low-capacitance cable): Resonant peak shifts from 3.6 kHz to 6.2 kHz
       and drops in Q amplitude.
     * Preamp Gain Rollback Test (Gain lowered from 8 to 4 with original cable): 3.6 kHz peak remains on DI, but
       the harsh intermodulation sidebands and upper harmonics disappear; tone becomes clear but bright.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Controlled Substitution: Short-cable test confirmed electrical LC resonance mechanism.
   - Controlled Gain Manipulation: Preamp gain rollback confirmed non-linear harmonic multiplication.
   - Direct Locus Isolation: Dry DI proved the 3.6 kHz feature enters before the amplifier.

3. LOCUS VS MECHANISM RESOLUTION:
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_RESOLVED` (Across two loci: Instrument Electrical and Preamp Stage).
   - Physical Mechanisms: Passive LC resonant tank circuit + non-linear multi-stage vacuum tube overdrive.

4. CAUSAL NARROWING & EXCLUSION:
   - Single-Cause Hypothesis (H1 alone): Excluded as a complete explanation; pickup resonance alone is merely bright,
     not harsh and clanky without preamp clipping.
   - Single-Cause Hypothesis (H2 alone): Excluded as a complete explanation; preamp clipping alone does not produce
     a selective 3.6 kHz emphasis without the resonant upstream boost.
   - Compound Causation Confirmed: H1 and H2 operate in compound interaction.
   - Hypothesis H3 (Voice Coil Rub): Falsified by valid exclusion; artifact disappeared on preamp rollback at high SPL.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Cause (Origin): Passive pickup inductance loaded by cable capacitance (`DOMINANT` origin).
   - Severity Amplifier: Cascaded preamp high-gain clipping saturating and multiplying the peak (`MATERIAL` amplifier).
   - Interaction Mode: `NON_LINEAR_MULTIPLICATION` & `CASCADED_EXACERBATION`.

6. CONCEPTUAL CAUSAL CHAIN:
   High-inductance bridge pickup loaded by high-capacitance instrument cable
   → Under-damped LC resonance creates +7.2 dB electrical voltage peak at 3.6 kHz in Dry DI
   → Overdriven preamp gain stages driven far past clipping threshold by the elevated 3.6 kHz peak
   → Non-linear distortion generates dense odd-harmonic series and intermodulation products
   → Captured audio exhibits harsh, dense spectral clank
   → Player experiences aggressive, unmusical metallic fatigue on palm-muted attacks.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `COMPLETE_EXPLANATION` (when modeled as compound interaction).
   - Explains both the origin of the 3.6 kHz spike and the dense harmonic distortion across higher bands.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Guitar tone pot was on 10 during tracking (Risk: MODERATE; verified by user verbal confirmation).
   - Sensitivity Tier: `CONDITIONAL_ON_ASSUMPTION` (If tone pot was rolled down, resonant Q would collapse).

9. RESULTING CAUSAL DIAGNOSIS:
   - Diagnosis Status: `COMPOUND_CAUSAL_DIAGNOSIS`
   - Calibrated Assertion: "Compound causal diagnosis confirmed: instrument cable capacitive loading originates
     a +7.2 dB resonant peak at 3.6 kHz; high-gain preamplifier clipping acts as a material severity amplifier,
     generating abrasive intermodulation distortion across the upper-mid spectrum."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Exact pickup coil DC resistance and tube plate voltages.
    - Operational Validity Bounds: Applies specifically to high-gain channel with full guitar volume.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to prescribe: "Lower the Preamp Gain knob to 4.5 and insert a 3.6 kHz notch filter."
    - TT is NOT entitled to recommend buying a wireless system or replacing guitar pickups.
    - STOP: Transmits compound causal diagnosis to Phase 1C.5d.


--------------------------------------------------------------------------------
SCENARIO C — LOCUS RESOLVED, MECHANISM UNRESOLVED (CABINET ACOUSTIC NOTCH)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My recorded heavy rhythm track sounds hollow, scooped, and completely lacks punch in the body."
   - DSP Observations: Calibrated 1/12-octave FFT reveals a sharp -9.4 dB notch centered at 650 Hz (Q = 4.2);
     pre-amp FX loop send signal is completely flat across this region.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Cabinet Acoustic): Internal standing-wave acoustic phase cancellation between parallel baffle and rear wall.
     * H2 (Speaker Transduction): Speaker cone mechanical decoupling / out-of-phase cone surround flexure.
     * H3 (Microphone Boundary): Destructive acoustic reflection from a nearby hard studio floor or baffle edge.
   - Stage 06A Test Outcome:
     * Floor Reflection Test: Thick acoustic absorber placed between cabinet and mic; 650 Hz notch persists unchanged (-9.2 dB).
     * Valid Exclusion Finding: H3 (Floor Boundary Reflection) is validly excluded.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Direct Locus Isolation: FX-loop send tap is flat, and power-amp electrical speaker output tap is flat,
     directly isolating the 650 Hz notch to the physical cabinet acoustic / transduction boundary.
   - Valid Exclusion Test: Floor absorption test eliminated external floor reflection boundary.

3. LOCUS VS MECHANISM RESOLUTION (THE CORE PRINCIPLE):
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED`.
   - Signal Locus: CABINET_ACOUSTIC_AND_TRANSDUCTION (conclusively isolated).
   - Physical Mechanism: UNRESOLVED between internal standing wave cancellation (H1) and cone surround decoupling (H2).
     Discriminating between them requires internal cabinet accelerometer or laser vibrometry telemetry, which is unavailable.

4. CAUSAL NARROWING & EXCLUSION:
   - External Boundary Reflection (H3): Validly excluded.
   - Upstream Circuit Stages: Conclusively excluded by electrical taps.
   - Surviving Mechanisms (H1 vs H2): Both remain physically viable; Tone Translator is STRICTLY FORBIDDEN from guessing.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Locus: Cabinet Acoustic boundary (`DOMINANT`).
   - Internal Mechanism: `PLAUSIBLE_UNRESOLVED` between standing wave resonance and cone surround flexure.

6. CONCEPTUAL CAUSAL CHAIN:
   Electrical signal from power amp drives speaker coil with flat 650 Hz voltage
   → Physical transducer or internal enclosure geometry creates severe acoustic phase cancellation at 650 Hz
   → Radiated acoustic wave exhibits deep -9.4 dB notch before reaching microphone
   → Recorded audio track lacks critical lower-midrange core energy
   → Listener perceives tone as hollow, weak, and lacking punch.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Locus resolved; internal enclosure mechanics unresolved).
   - Explains the exact frequency location and depth of the hollow sound, but cannot identify the internal physical defect.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Absorber test was acoustically sufficient to attenuate 650 Hz floor reflection (Risk: LOW; verified absorption coefficient >0.85).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS:
   - Diagnosis Status: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED`
   - Calibrated Assertion: "Signal locus is conclusively isolated to the physical cabinet acoustic / transduction boundary;
     the -9.4 dB notch at 650 Hz originates post-amplifier; internal standing wave cancellation and speaker cone mechanical
     decoupling remain viable unconfirmed mechanisms; electrical signal chain is exonerated."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Physical Variables: Cabinet internal panel dimensions, internal acoustic damping wool volume, speaker cone laser displacement data.
    - Operational Validity Bounds: Diagnosis applies to this physical speaker cabinet and microphone axis.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to guess: "Your cabinet needs fiberglass batting stapled to the rear wall."
    - TT is NOT entitled to prescribe: "Boost 650 Hz by +9 dB with a parametric EQ on the track."
    - STOP: Transmits bounded locus diagnosis to Phase 1C.5d with explicit mechanism uncertainty.


--------------------------------------------------------------------------------
SCENARIO D — EXACERBATION VS ORIGIN (STRATOCASTER BRIDGE HARSHNESS)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "The high notes on my lead channel sound harsh, piercing, and painful."
   - DSP Observations: Dry DI capture exhibits a +4.5 dB resonant peak at 4.2 kHz; captured amplifier
     track exhibits an +8.2 dB peak at 4.2 kHz with dense odd harmonics (12.6 kHz); ADC input level nominal (-8 dBFS peak).
   - Candidate Hypotheses from 1C.5b:
     * H1 (Instrument Electrical): Single-coil bridge pickup electrical resonance entering at guitar output.
     * H2 (Preamp Non-Linearity): High-gain preamp stage clipping asymmetrical harmonics.
     * H3 (Digital Conversion): Interface A/D converter clipping.
   - Stage 06A Test Outcomes:
     * Audio Interface Inspection: Peak metering confirms -8 dBFS margin; A/D clipping (H3) is falsified.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Direct Locus Isolation: Dry DI directly captures the +4.5 dB resonant peak at 4.2 kHz before the amplifier input.
   - Valid Exclusion Test: Interface peak headroom measurement validly excludes converter clipping.

3. LOCUS VS MECHANISM RESOLUTION (CORRECTIONS B5 & D4):
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED` for upstream origin locus,
     coupled with supported downstream non-linear exacerbation.
   - Signal Loci: Instrument Electrical (Origin established by Dry DI) and Downstream Amplification Stage (Exacerbation).
   - Mechanism Resolution: Upstream unloaded bridge pickup resonance remains a plausible candidate conditional on
     actual guitar internal wiring; downstream non-linear harmonic generation is supported as a material severity amplifier
     by increased harmonic content, though isolating the exact amplifier stage (preamp vs driver vs power) or specific
     clipping mechanism remains unresolved.

4. CAUSAL NARROWING & EXCLUSION:
   - Hypothesis H3 (ADC Clipping): Excluded by direct interface headroom telemetry.
   - Hypothesis H1 (Pickup Electrical Resonance): Established at Instrument Electrical locus via Dry DI;
     specific mechanism (unloaded bridge tone pot vs coil self-resonance) remains conditional on unverified internal wiring.
   - Hypothesis H2 (Downstream Non-Linearity): Downstream non-linear harmonic generation is supported as a material
     severity amplifier by the increased harmonic content in the processed capture. The available evidence does not
     isolate the exact amplifier stage or specific clipping mechanism.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Origin Cause: Instrument Electrical stage resonance (+4.5 dB at 4.2 kHz in DI) (`DOMINANT` origin).
   - Severity Amplifier: Downstream non-linear harmonic generation / distortion (`MATERIAL`), exact amplifier-stage mechanism unresolved.
   - Potential Enabling Condition: Unloaded bridge pickup circuit (plausible heuristic, unverified in current case).

6. CONCEPTUAL CAUSAL CHAIN:
   Instrument electrical stage generates resonant electrical peak (+4.5 dB at 4.2 kHz in Dry DI)
   → Signal enters downstream amplifier chain where one or more non-linear amplification stages generate additional harmonic content around the pre-existing feature
   → Non-linear distortion multiplies the peak into upper-harmonic series (12.6 kHz)
   → Final captured audio displays elevated +8.2 dB abrasive peak
   → User experiences harsh, piercing tone on high-register solo bends.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: Qualitative explanatory coverage achieved;
     distinguishes clearly between where the peak entered (+4.5 dB at DI) and downstream non-linear severity amplification.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Guitar bridge pickup is wired without active tone pot loading (Risk: MODERATE; heuristic prior).
   - Sensitivity Tier: `CONDITIONAL_ON_ASSUMPTION` (If a bridge tone control is present and engaged, resonant Q behavior shifts).

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION D4):
   - Diagnosis Status: `COMPOUND_CAUSAL_DIAGNOSIS`
   - Calibrated Assertion: "Compound causal structure supported: feature origin is established at the Instrument
     Electrical locus (+4.5 dB at 4.2 kHz in Dry DI); downstream non-linear harmonic generation materially exacerbates
     the feature; ADC clipping is validly excluded; exact upstream electrical mechanism and exact downstream
     amplifier-stage mechanism remain unresolved."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Exact pickup coil capacitance and magnet degaussing state.
    - Operational Validity Bounds: Applies to bridge pickup switch position only.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to prescribe: "Solder a jumper wire from the middle tone pot to the bridge terminal."
    - STOP: Hands off to Phase 1C.5d.


--------------------------------------------------------------------------------
SCENARIO E — CROSS-DOMAIN DISCREPANCY (BOOM VS DSP BASS ROLLOFF) (CORRECTIONS C5 & M5)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "The guitar sound is overwhelmingly boomy, muddy, and shaking my desk."
   - DSP Observations: Calibrated 1/3-octave FFT of recorded audio shows low frequencies (80-180 Hz) are
     actually attenuated by -4.2 dB relative to commercial rock mix baseline; sub-bass below 70 Hz is rolled off.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Playback Environment): Desk surface boundary loading / nearfield room acoustic resonance during playback.
     * H2 (Signal Chain): Undisclosed sub-bass boost pedal engaged before the amp.
     * H3 (Playback Transduction / Monitoring): Nearfield monitor bass port resonance or headphone bass boost.
     * H4 (Psychoacoustic Masking): High-frequency ear fatigue causing relative low-end over-perception.

2. CROSS-DOMAIN DISCREPANCY EVALUATION (CORRECTION M5):
   - Governing Epistemic Principle: `CONTRADICTION != CROSS-DOMAIN DISCREPANCY`.
   - Track-Domain Measurement: Calibrated DSP measurement objectively proves the recorded audio file does NOT
     possess elevated 80-180 Hz energy (it is thin/rolled-off).
   - Playback-Domain User Perception: User report accurately reflects their physical listening experience
     at their listening position.
    - Cross-Domain Finding (Correction C5): Both claims are physically admissible simultaneously. The recorded track is bass-light
      while the user's playback-domain report indicates perceived low-frequency reinforcement. Playback-room acoustics,
      monitor behavior, or another playback-domain mechanism remain plausible explanations but are unverified.
      This is a cross-domain discrepancy between file telemetry and acoustic playback, NOT an intra-domain contradiction.
      The cause of the playback experience remains unresolved.

3. LOCUS VS MECHANISM RESOLUTION:
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL`
   - Signal Locus: Track signal chain is exonerated of low-frequency buildup; playback acoustic environment remains unmeasured.
   - Mechanism: Playback acoustic reinforcement is physically plausible but unconfirmed by calibrated acoustic telemetry.

4. CAUSAL NARROWING & EXCLUSION:
   - Hypothesis H2 (Signal Chain Sub-Bass Boost): Falsified by direct DSP measurement of the audio file.
   - Hypotheses H1 & H3 (Playback Room / Monitor Acoustics): Plausible explanations for the discrepancy, but
     no acoustic room measurement, measurement microphone data, or headphone audit exists in the case record.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Track Audio Signal: Exonerated as origin of low-frequency buildup (`NOT_CONTRIBUTORY` to boomy defect).
   - Playback Acoustic Environment: `PLAUSIBLE_UNRESOLVED` (requires playback decoupling test).

6. CONCEPTUAL CAUSAL CHAIN (HYPOTHETICAL / NON-DIAGNOSTIC PLAYBACK REINFORCEMENT):
   Thin/nominal guitar audio played back through desktop monitor speakers
   → Acoustic monitor coupling or room boundary modes may reinforce low frequencies at the physical listening position (unverified hypothesis)
   → Listener experiences overwhelming bass boom and desk vibration, incorrectly blaming the recorded guitar file.
   (The exact physical cause of the playback experience remains unmeasured and unresolved).

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Accounts for recorded track characteristics;
     listening environment remains an unmeasured external variable).
   - Non-Fabrication Rule Enforced: No room gain decibel numbers are fabricated.

8. ASSUMPTION SENSITIVITY:
   - Assumption: User is auditioning on speakers rather than calibrated headphones (Risk: HIGH; load-bearing).
   - Sensitivity Tier: `INVALIDATING_DEPENDENCY` (If user was listening on flat reference headphones, H1 collapses).

9. RESULTING CAUSAL DIAGNOSIS:
   - Diagnosis Status: `INSUFFICIENT_EVIDENCE_FOR_CAUSAL_RESOLUTION` (Causal diagnosis of track audio withheld)
   - Calibrated Assertion: "Cross-domain discrepancy identified: recorded audio file objectively exhibits attenuated
     low-end (-4.2 dB below 180 Hz), precluding an in-track bass defect; user-reported boom is consistent with
     playback room acoustic boundary reinforcement or monitoring coloration; causal diagnosis of the audio signal
     is withheld pending headphone audition to isolate the playback environment."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Environmental Variables: User room dimensions, monitor boundary placement, listening position SPL.
    - Required Verification: Headphone cross-check to decouple listening environment from recorded audio file.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to apply a -6 dB low-cut EQ to the track to satisfy the user's boomy complaint.
    - STOP: Halts before Stage 09; does NOT hand off to Phase 1C.5d intervention selection; requests headphone verification.


--------------------------------------------------------------------------------
SCENARIO F — REFERENCE CASE QUARANTINE (1978 BROWN SOUND) (CORRECTIONS C5 & C6)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Text: "I want that classic 1978 Sunset Sound lead guitar brown sound. I have a 100W Marshall
     Plexi reissue head and a 4x12 with Greenbacks."
   - DSP Observations: User audio exhibits high dynamic crest factor (12.8 dB), bright 5 kHz top-end bite,
     and open, uncompressed transients compared to compressed vintage album benchmarks.
   - Historical Archive in 1C.4: Sunset Sound 1978 Variac reference case (Eddie Van Halen running Marshall Super Lead
     with mains dropped to 89V AC, Sylvania 6CA7 power tubes re-biased hot into dummy load).
   - Candidate Hypotheses from 1C.5b:
     * H1 (Power Stage Operating State): Amplifier operating with high dynamic power-stage headroom and minimal sag.
     * H2 (Tone Stack / Bright Cap): Bright cap treble peaking dominating at current volume setting.
     * H3 (Cabinet / Transduction): New, stiff speaker cone suspension lacking vintage compliance.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - DSP Crest Factor Measurement: Establishes high dynamic peak-to-average ratio (12.8 dB) in user's recorded track.
   - Reference Case Firewall: Sunset Sound 1978 case is strictly quarantined as an external structural analogy.
     Documented Variac operation cannot be assumed to be the cause of the user's tone difference.

3. LOCUS VS MECHANISM RESOLUTION (CORRECTION C6):
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL`
   - Signal Locus: Unresolved across power stage, tone stack, and speaker transducer loci.
   - Mechanism Resolution: UNRESOLVED; current evidence characterizes the spectral/dynamic difference from the reference
     but does not isolate whether the cause lies in amplifier power-stage behavior, tone-stack behavior, or speaker/transduction mechanics.
     Internal circuit B+ voltage, actual plate sag dynamics, bias current, and speaker mechanical compliance are unmetered and UNKNOWN.

4. CAUSAL NARROWING & EXCLUSION (THE REFERENCE FIREWALL):
   - Prohibited Failure Mode: Declaring as a current-case diagnosis that the user's amplifier lacks power-tube sag
     or has "full B+ voltage" simply because they lack an 89V Variac.
   - Evidential Discipline Enforced: Historical cases provide structural analogies, never current-case telemetry.
     The user's audio demonstrates high crest factor and top-end stiffness, but the internal physical mechanism
     (power amp headroom vs master volume attenuation vs bright cap vs speaker stiffness) remains unisolated.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Causal Candidates: Power amplifier headroom, tone-stack bright cap, and speaker cone compliance
     remain viable competing / potentially joint explanations (`PLAUSIBLE_UNRESOLVED`).

6. CONCEPTUAL CAUSAL CHAIN:
   Guitar signal passes through modern amplifier and speaker setup
   → Dynamic signal peaks maintain high crest factor (12.8 dB) through the signal chain
   → Audio exhibits stiff transient attacks and prominent 5 kHz bite
   → Listener perceives tone as bright, stiff, and lacking compressed vintage bloom compared to reference benchmark.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Dynamic/spectral difference characterized;
     internal circuit mechanisms remain unmeasured unknowns).
   - Non-Fabrication Enforced: Zero B+ rail voltages, sag percentages, or tube dissipation values are fabricated.

8. ASSUMPTION SENSITIVITY:
   - Assumption: User amplifier is operating within nominal manufacturer tolerances (Risk: LOW).
   - Sensitivity Tier: `CONDITIONAL_ON_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION C6):
   - Diagnosis Disposition: `MULTIPLE_CAUSES_REMAIN_VIABLE` (Causal diagnosis of internal circuit state withheld)
   - Calibrated Assertion: "User track exhibits high dynamic crest factor (12.8 dB) and upper-mid stiffness
     relative to vintage reference benchmark; current evidence characterizes the spectral/dynamic difference from the
     reference but does not isolate whether the cause lies in amplifier power-stage behavior, tone-stack behavior, or
     speaker/transduction mechanics; historical 1978 Variac operation provides a structural analogy for voltage sag,
     but current power-stage operating state remains unverified; multiple distinct candidate loci and mechanisms remain viable."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Internal B+ plate voltage, tube bias idle current, speaker mechanical compliance.
    - Reference Firewall Status: Fully enforced; historical Variac operating conditions quarantined.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to prescribe: "Plug your Marshall into a Variac set to 89V AC."
    - TT is NOT entitled to declare that power tubes are operating at full voltage without circuit telemetry.
    - STOP: Does NOT progress to Stage 09 intervention selection; remains in Stage 07 awaiting discriminating tests.'''

if __name__ == "__main__":
    print(get_p1C5c_p6()[:300])
