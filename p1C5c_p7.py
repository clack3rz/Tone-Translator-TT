#!/usr/bin/env python3
"""
p1C5c_p7.py: Section 21 Part 2 (Worked Challenge Scenarios G to L)
for TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1a.txt
Phase 1C.5c — Diagnosis & Causal Reasoning (Bounded Causal-Epistemic Correction)
"""

def get_p1C5c_p7():
    return '''--------------------------------------------------------------------------------
SCENARIO G — USER IS CERTAIN OF A CAUSE BUT EVIDENCE CONTRADICTS THEM (CORRECTION C5)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Text: "My Marshall tube amp has gone bad. The power tubes are blown because it has a terrible
     harsh ringing sound on the high notes. I need to know which tubes to replace."
   - DSP Observations: Dry DI capture exhibits a prominent +6.8 dB resonance peak at 3.8 kHz; recorded
     amplifier output exhibits a matching +7.2 dB peak with moderate clipping harmonics.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Instrument Electrical): Stratocaster bridge pickup unloaded resonance and cable capacitive loading.
     * H2 (Power Amplifier Stage): User's stated hypothesis of power tube microphonics or bias breakdown.
     * H3 (Speaker Electromechanical): Speaker cone voice coil rub.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Direct Locus Isolation: Dry DI file directly captures the 3.8 kHz ringing peak before the signal ever
     reaches the amplifier input jack.
   - Negative Observation: Power tube microphonic oscillation NOT DETECTED (microphonic tap test produces
     no transient ringing in power stage; power tubes test nominal under bias idle).

3. LOCUS VS MECHANISM RESOLUTION (CORRECTION C5):
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED` (Locus proven upstream of amp; internal component mechanism unconfirmed).
   - Signal Locus: INSTRUMENT_ELECTRICAL (conclusively isolated upstream of the amplifier).
   - Mechanism: Instrument electrical resonance (pickup inductance / cable capacitance loading is plausible
     candidate, but exact component-level mechanism is unconfirmed without a cable or pickup substitution test).

4. CAUSAL NARROWING & EXCLUSION:
   - Hypothesis H2 (User Stated Cause: Blown Power Tubes): Direct Locus Disproof. A feature that already exists
     in the dry guitar output cannot have been originated by power tubes located downstream.
   - User claim treated with professional respect as subjective evidence of a perceived fault, but rejected
     as a causal diagnosis of origin.
   - Downstream Stage Evaluation: Amplifier is excluded as the origin of the 3.8 kHz peak; downstream gain stages
     sustain and amplify the peak, but claims that the amp is "fully nominal" are withheld without circuit telemetry.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Origin Cause: Instrument electrical stage resonance entering at guitar output (`DOMINANT` origin).
   - Downstream Stage: High gain sustains the resonant peak (`MATERIAL` downstream contributor).
   - User Stated Cause: Refuted (`NOT_CONTRIBUTORY` to origin).

6. CONCEPTUAL CAUSAL CHAIN:
   Instrument electrical stage generates +6.8 dB resonant peak at 3.8 kHz in the guitar output
   → Signal enters amplifier where high gain sustains and compresses the pre-existing ringing peak
   → User hears persistent piercing ringing on high notes, mistakenly assuming the power tubes are blown.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: Qualitative explanatory coverage achieved for feature origin;
     upstream locus accounts for entry of the 3.8 kHz peak and explains user frustration.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Dry DI was captured directly from the guitar before any outboard pedals (Risk: LOW; verified by routing metadata).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS:
   - Diagnosis Status: `LOCUS_RESOLVED_MECHANISM_UNRESOLVED`
   - Calibrated Assertion: "Direct locus isolation confirms the 3.8 kHz harsh ringing originates upstream of the
     amplifier at the Instrument Electrical stage; user hypothesis of power-tube failure is disproven by DI evidence;
     exact upstream mechanism (pickup resonance vs cable loading) remains unisolated pending substitution testing."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Internal amplifier power tube plate voltage and exact pickup coil capacitance.
    - Operational Validity Bounds: Diagnosis applies to this guitar and cable signal tap.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to recommend buying new power tubes or visiting an amplifier technician.
    - TT is NOT entitled to prescribe: "Cut 3.8 kHz by 6 dB on your graphic EQ."
    - STOP: Delivers clear, objective locus diagnosis to Phase 1C.5d.


--------------------------------------------------------------------------------
SCENARIO H — VALID EXCLUSION REMOVES ONE HYPOTHESIS BUT DOES NOT PROVE SURVIVOR (CORRECTION C6)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My high-gain rhythm tone sounds brittle, raspy, and fizzy on fast palm mutes."
   - DSP Observations: +5.8 dB elevation across 4.0-5.5 kHz; high harmonic density; Dry DI is nominal.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Transduction): Center-cone on-axis mic placement capturing dust-cap acoustic beaming.
     * H2 (Preamplifier Stage): Cold-clipper preamp tube bias drift producing asymmetrical harsh distortion.
     * H3 (Power Stage): Negative feedback loop phase oscillation.
     * H4 (Digital Processing): DAW interface buffer jitter or aliasing.
   - Stage 06A Test Outcome:
     * Valid Exclusion Test: Microphone moved 2 inches off-axis to cone edge under calibrated alignment.
     * Test Result: 4.0-5.5 kHz elevation and raspy fizz persist completely unchanged (delta < 0.3 dB).
     * Valid Exclusion Finding: H1 (Mic Beaming) is validly eliminated as the primary cause.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Valid Exclusion Test: Controlled off-axis microphone test disproved the necessary physical prediction
     of dust-cap beaming under verified sensitivity.
   - Locus Isolation: Dry DI is nominal, narrowing problem downstream of the instrument.

3. LOCUS VS MECHANISM RESOLUTION:
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL`
   - Signal Locus: Downstream of instrument; between preamp and speaker transducer.
   - Mechanism: Unresolved among electrical circuit stages.

4. CAUSAL NARROWING & EXCLUSION (THE NON-BINARY INVARIANT):
   - Prohibited Failure Mode: Concluding that because mic beaming (H1) was eliminated, cold-clipper
     bias drift (H2) must be the confirmed cause.
   - Non-Binary Rule Enforced: Eliminating H1 merely narrows the field; H2, H3, and H4 remain active
     competing candidates. None of them has earned affirmative proof.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Multiple Viable Candidates: Preamp tube bias drift, NFB oscillation, and converter aliasing
     remain uneliminated competing candidates (`PLAUSIBLE_UNRESOLVED`).

6. CONCEPTUAL CAUSAL CHAIN (HYPOTHETICAL / NON-DIAGNOSTIC DOWNSTREAM ELECTRICAL GENERATION):
   Unknown downstream circuit or conversion stage generates raspy 4.5 kHz distortion
   → Distortion passes through power section and speaker cone without directional beaming
   → Microphone captures diffuse high-frequency rasp across all angles
   → Player experiences brittle, unmusical fizz on heavy palm mutes.
   (The exact downstream electrical or conversion mechanism remains unisolated and non-diagnostic).

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Acoustic mic locus eliminated; electrical origin unresolved).

8. ASSUMPTION SENSITIVITY:
   - Assumption: Off-axis mic position was verified to be outside the directional beaming angle (Risk: LOW).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION C3):
   - Diagnosis Status: `MULTIPLE_CAUSES_REMAIN_VIABLE`
   - Calibrated Assertion: "On-axis microphone beaming is validly excluded as the primary explanation. The observed rasp remains unresolved among downstream candidate mechanisms including preamplifier bias behavior, power-stage/NFB behavior, and digital conversion effects. No surviving mechanism has yet earned causal diagnosis."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Internal tube voltages, interface clock jitter, power amp NFB loop components.
    - Required Discriminating Test: FX-loop send tap test to isolate preamp stage from power stage.

11. LIFECYCLE DECISION & HANDOFF GOVERNANCE (CORRECTION C6):
    - Epistemic Rule Enforced: "Diagnosis Before Intervention." An unresolved causal workspace must NOT
      enter intervention selection.
    - Action: Does NOT progress to Phase 1C.5d Stage 09. Active session pauses in Stage 07 (`CAUSAL_DIAGNOSIS_UNDERWAY`)
      and requests targeted discriminating evidence (FX-loop send tap test) per Stage 06A (`DISCRIMINATING_EVIDENCE_REQUESTED`).


--------------------------------------------------------------------------------
SCENARIO I — LOAD-BEARING ASSUMPTION BLOCKS UNCONDITIONAL DIAGNOSIS (CORRECTIONS C3 & C5)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My tone lost its sparkle and clarity between the morning and afternoon tracking sessions."
   - DSP Observations: High frequencies between 3.5-7.0 kHz are attenuated by -6.2 dB in Take 2 relative to Take 1;
     low frequencies below 250 Hz match within comparison tolerance (~0.5 dB).
   - Candidate Hypotheses from 1C.5b:
     * H1 (Instrument Electrical): Substituted instrument cable shifting passive pickup resonance downward.
     * H2 (Transduction): Physical microphone bumped or shifted off-axis between takes.
     * H3 (Instrument Controls): Guitar volume or tone knob rolled down.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Spectral Comparison Delta: Selective 6.2 dB high-frequency attenuation with matched low end is physically
     consistent with high-capacitance cable loading or off-axis mic displacement.
   - User Verbal Telemetry: User reports they swapped instrument cables between takes because the morning cable was tangled.

3. LOCUS VS MECHANISM RESOLUTION (CORRECTION B4):
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL`
   - Signal Locus: Unresolved across Instrument Electrical stage (cable loading) and Transduction stage (physical microphone displacement).
   - Mechanism Resolution: Unconfirmed / hypothetical. Cable capacitive loading is physically viable ONLY if the guitar utilizes passive pickups;
     if active pickups or an onboard buffer are present, a cable swap cannot cause this frequency loss, leaving microphone displacement or other acoustic variables active.

4. CAUSAL NARROWING & EXCLUSION:
   - Non-Fabrication Rule Enforced (Correction C5): Zero cable lengths, picofarad capacitance values, or pickup
     henry inductance numbers are fabricated.
   - Cable swap increases plausibility of H1, but does NOT establish definitive causal diagnosis while pickup
     impedance architecture remains unverified.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE (CORRECTION D2):
   - Active Viable Candidate Mechanisms:
     * H1 — Cable capacitive loading / resonance shift (`PLAUSIBLE_UNRESOLVED`);
     * H2 — Microphone displacement / off-axis transduction change (`PLAUSIBLE_UNRESOLVED`);
     * H3 — Instrument control change (`PLAUSIBLE_UNRESOLVED`, unless independently excluded).
   - Non-Ranking Rule Enforced: No unresolved candidate mechanism is assigned Primary, Secondary, Dominant, or Material causal rank.

6. CONCEPTUAL CAUSAL CHAIN (HYPOTHETICAL LC RESONANCE SHIFT):
   User substitutes different instrument cable between takes
   → If guitar pickups are passive, cable capacitance loads pickup inductance and shifts resonance downward
   → Upper frequencies between 3.5-7.0 kHz are attenuated by -6.2 dB in recorded take
   → Afternoon audio sounds dark and muffled compared to morning pass.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Contingent upon unverified circuit architecture and unresolved locus).

8. ASSUMPTION SENSITIVITY (THE LOAD-BEARING AUDIT):
   - Assumption: The guitar is equipped with passive pickups without active onboard buffering (Risk: LOAD_BEARING).
   - Sensitivity Tier: `INVALIDATING_DEPENDENCY`.
   - Epistemic Rule Enforced (Corrections C3 & B1): Because this load-bearing assumption is unverified, Tone Translator
     is STRICTLY FORBIDDEN from granting a `PROVISIONAL_DIAGNOSIS` or declaring an unconditional diagnosis.
     The dependent causal claim remains unresolved in Stage 07.

9. RESULTING CAUSAL DIAGNOSIS (CORRECTIONS B1, B4, C2):
   - Diagnosis Disposition: `MULTIPLE_CAUSES_REMAIN_VIABLE`
   - Assumption Sensitivity: `INVALIDATING_DEPENDENCY`
   - Calibrated Assertion: "Observed 3.5-7.0 kHz attenuation is consistent with cable capacitive loading following
     the reported cable change, but causal diagnosis is strictly conditional on unverified pickup topology; signal locus
     remains unresolved across Instrument Electrical and Transduction stages; if active pickup / buffering topology invalidates H1,
     cable loading is removed from the viable set, but H2 and any other unexcluded candidates such as H3 remain unresolved
     pending their own discriminating evidence."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Guitar pickup impedance topology (active vs passive), cable capacitance specifications.
    - Required Verification: User clarification of pickup type before committing to causal resolution.

11. LIFECYCLE DECISION & HANDOFF GOVERNANCE (CORRECTION C6):
    - Action: Does NOT progress to Phase 1C.5d intervention selection; active reasoning session pauses in Stage 07
      requesting user confirmation of pickup architecture.


--------------------------------------------------------------------------------
SCENARIO J — MULTIPLE VIABLE CAUSES REMAIN (SPUTTERING FUZZ DECAY) (CORRECTIONS C6 & D1)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "My sustained notes choke out and sputter into gated silence prematurely."
   - DSP Observations: Note decay envelope drops abruptly by -24 dB within 15 ms during tail; high-order non-linear
     harmonic distortion during cutoff; no noise gate pedal listed in manifest.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Pedal Circuit): Germanium fuzz pedal transistor bias starving due to dying 9V battery or sag control.
     * H2 (Instrument Electrical): Intermittent pickup coil ground wire opening under low vibration.
     * H3 (Digital Processing): Undisclosed software gate threshold clamping the tail in DAW.
   - Stage 06A Status: User unable to perform 9V battery replacement immediately; no further tests run.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Envelope Follower DSP: Proves premature non-linear gating cutoff exists in the captured audio.
   - Rig Manifest: Fuzz pedal confirmed present; battery voltage unmetered.

3. LOCUS VS MECHANISM RESOLUTION:
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL`
   - Signal Locus: Unresolved between pedal circuit, instrument electrical, and DAW channel strip.

4. CAUSAL NARROWING & EXCLUSION:
   - Prohibited Failure Mode: Declaring H1 (dying battery) as the winner simply because it is the most famous textbook cause.
   - Epistemic Rule Enforced: Tone Translator must NOT force a single-cause resolution where telemetry cannot discriminate.
   - Candidate Conservation Rule (Correction D1): No evidence exists that eliminates H2; all three candidates remain active.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE (CORRECTION D1):
   - Active Unresolved Candidates: H1 (Transistor Bias Starvation), H2 (Intermittent Pickup / Ground Continuity Fault),
     and H3 (Undisclosed Software Gate) remain viable unresolved candidate mechanisms (`PLAUSIBLE_UNRESOLVED`).
     None has received sufficient discriminating evidence for causal resolution, and no candidate has been validly excluded.

6. CONCEPTUAL CAUSAL CHAIN — HYPOTHETICAL / NON-DIAGNOSTIC EXAMPLE PATH (CORRECTION D1):
   Transistor supply voltage drops below threshold required for linear collector current
   → Low-level signal peaks fall below cutoff threshold
   → Waveform decays abruptly into non-linear crossover distortion and sharp silence
   → Player experiences choking, sputtering decay on held notes.
   (This chain illustrates a single physically plausible candidate path only; it does not imply H1 is preferred or established).

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Symptom characterized, mechanism unconfirmed).

8. ASSUMPTION SENSITIVITY:
   - Assumption: Pedal is powered by internal battery rather than regulated power supply (Risk: HIGH; load-bearing).
   - Sensitivity Tier: `INVALIDATING_DEPENDENCY`.

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION D1):
   - Diagnosis Status: `MULTIPLE_CAUSES_REMAIN_VIABLE`
   - Calibrated Assertion: "Premature gating decay is confirmed by envelope telemetry. Fuzz-transistor bias starvation,
     intermittent instrument electrical continuity, and undisclosed software gating remain viable unresolved candidate
     mechanisms. Available evidence does not discriminate among them."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Pedal DC supply rail voltage, DAW plugin list, pickup coil continuity.
    - Required Discriminating Test: Measure pedal supply voltage or test with fresh 9V battery.

11. LIFECYCLE DECISION & HANDOFF GOVERNANCE (CORRECTION C6):
    - Epistemic Rule Enforced: An unresolved causal workspace must NOT enter intervention selection.
    - Action: Does NOT progress to Phase 1C.5d Stage 09. Session pauses in Stage 07 awaiting power supply check or DAW inspection.


--------------------------------------------------------------------------------
SCENARIO K — NEGATIVE EVIDENCE NARROWS SPACE WITHOUT PROVING SURVIVOR (CORRECTIONS C5 & D3)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "There is an annoying background hum/buzz in my recorded tracks."
   - DSP Observations: Broadband noise floor elevated at -54 dBFS between 1 kHz and 16 kHz.
   - Calibrated Negative Observation:
     * Discrete 50 Hz and 60 Hz mains harmonic spikes NOT DETECTED ABOVE THRESHOLD UNDER STATED CONDITIONS
       (Method: 4096-point FFT, Blackman-Harris window; detection threshold: -68 dBFS; bandwidth: 20 Hz to 500 Hz).
   - Candidate Hypotheses from 1C.5b:
     * H1 (Power Supply Stage): Power supply filter capacitor failure causing 100/120 Hz rectified mains ripple hum.
     * H2 (Preamp Stage): High-gain cascaded preamp thermal Johnson noise.
     * H3 (Digital Interface): ADC converter input stage thermal noise floor.

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Valid Negative Observation: Calibrated FFT actively inspected the mains frequency domain and confirmed
     discrete spikes fell below -68 dBFS, validly excluding gross power supply ripple within stated detection limits.
   - Spectral Energy Distribution: Noise is broadband and uniform across 1-16 kHz.

3. LOCUS VS MECHANISM RESOLUTION (CORRECTION C5):
   - Resolution State: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL` (Gross mains ripple excluded; exact noise locus unresolved).
   - Signal Locus: Unresolved between preamplifier circuit and audio interface ADC input stage.
   - Physical Mechanism: Thermal resistance noise is physically plausible, but isolating preamplifier Johnson noise
     from ADC converter noise requires a dedicated interface termination test.

4. CAUSAL NARROWING & EXCLUSION (THE NEGATIVE EVIDENCE PRINCIPLE):
   - Hypothesis H1 (Power Supply Ripple Hum): Validly excluded within stated detection limit (-68 dBFS).
   - Hypotheses H2 & H3 (Thermal Noise): Both remain viable competing candidates.
   - Core Epistemic Teaching: Valid negative evidence successfully eliminated gross mains ripple, but it does
     NOT automatically prove that preamplifier Johnson noise is the confirmed cause. Eliminating H1 leaves H2 and H3
     to be evaluated on their own independent evidence.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Preamplifier Thermal Noise: `PLAUSIBLE_UNRESOLVED`.
   - ADC Converter Noise Floor: `PLAUSIBLE_UNRESOLVED`.
   - Power Supply Ripple: `EXCLUDED` within -68 dBFS detection limits.

6. CONCEPTUAL CAUSAL CHAIN — HYPOTHETICAL / NON-DIAGNOSTIC (CORRECTION D3):
   If one of the currently active thermal-noise hypotheses is responsible:
   high-gain analog amplification or digital conversion may contribute an elevated broadband noise floor
   → broadband noise appears in the captured signal
   → user perceives continuous hiss during pauses.
   (This chain illustrates a physically plausible candidate path only; it does not establish that either H2 or H3 is occurring in the current case).

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `PARTIAL_ORIGIN_EXPLANATION` (Broadband hiss characterized; exact hardware origin unisolated).

8. ASSUMPTION SENSITIVITY:
   - Assumption: Interface input gain was calibrated nominal (Risk: LOW).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS (CORRECTION C1):
   - Diagnosis Status: `MULTIPLE_CAUSES_REMAIN_VIABLE`
   - Calibrated Assertion: "Gross mains-ripple noise is excluded within the stated detection limits. Among the currently
     active candidate hypotheses, preamplifier thermal noise and ADC/interface noise remain viable. The exact
     broadband-noise locus and mechanism remain unresolved."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Circuit Variables: Standalone ADC converter noise specification, preamp input termination impedance.
    - Required Discriminating Test: Terminate audio interface input with 150-ohm plug to isolate ADC noise floor.

11. LIFECYCLE DECISION & HANDOFF GOVERNANCE (CORRECTION C6):
    - Action: Does NOT progress to Phase 1C.5d intervention selection; active reasoning session pauses in Stage 07
      requesting interface termination check.


--------------------------------------------------------------------------------
SCENARIO L — HIGH-CONFIDENCE CAUSAL DIAGNOSIS WITH RESIDUAL UNCERTAINTY (DUAL-MIC PHASE)
--------------------------------------------------------------------------------
1. UPSTREAM PHASE 1C.5b INTAKE:
   - User Complaint: "When I sum my two cabinet microphones to mono, the guitar sound completely thins out and loses all punch."
   - DSP Observations:
     * Mic A soloed: Rich low-end energy (100-250 Hz); crest factor 11.2 dB.
     * Mic B soloed: Bright bite, balanced low-mids; crest factor 10.8 dB.
     * Mono Sum (Mic A + Mic B): Deep, comb-filtered periodic attenuation notches at 350 Hz, 1050 Hz, 1750 Hz (-18 dB depth);
       low-end power drops by -9.4 dB; crest factor collapses to 6.2 dB.
   - Candidate Hypotheses from 1C.5b:
     * H1 (Transduction): Acoustic path-length delay difference between Mic A and Mic B capsules causing destructive phase cancellation.
     * H2 (Electrical Wiring): One microphone cable wired pin-2/pin-3 inverted (180-degree polarity flip).
     * H3 (DAW Latency): Asymmetrical buffer latency between interface input channels.
   - Stage 06A Test Outcomes:
     * Polarity Inversion Test: Flipping polarity switch on Mic B improves low-end partially, but shifts notch frequencies
       rather than restoring flat response; excludes pure 180-degree electrical polarity flip.
     * Channel Delay Cross-Correlation: Mathematical cross-correlation reveals a continuous time arrival delta
       of 1.42 ms (Mic A leading Mic B by ~19 inches of physical acoustic path distance).

2. CAUSAL EVIDENCE CLASSES EVALUATED:
   - Mathematical Temporal Cross-Correlation: Directly measures 1.42 ms arrival time delta between capsules.
   - Physical Consistency: Periodic notches at 350 Hz, 1050 Hz, and 1750 Hz align mathematically with
     the formula f = (2n + 1) / (2 * delta_t) for delta_t = 1.42 ms.
   - Valid Exclusion Test: Polarity flip test excluded pure electrical inversion as sole cause.

3. LOCUS VS MECHANISM RESOLUTION:
   - Resolution State: `LOCUS_RESOLVED_MECHANISM_RESOLVED`
   - Signal Locus: MICROPHONE_TRANSDUCTION (spatial capsule geometry).
   - Mechanism: Acoustic time-of-flight path delay causing destructive comb-filtering when summed to mono.

4. CAUSAL NARROWING & EXCLUSION:
   - Hypothesis H1: Conclusively confirmed by mathematical cross-correlation and notch spacing.
   - Hypothesis H2 (Wiring Flip): Disproven as sole cause; electrical flip shifts notch phase but does not eliminate time delay.
   - Hypothesis H3 (DAW Latency): Excluded by analog routing verification.

5. CAUSAL ROLE & CONTRIBUTION STRUCTURE:
   - Primary Cause: Physical capsule distance delta of 1.42 ms (~19 inches acoustic path difference) (`DOMINANT`).
   - Secondary Contributor: Minor level imbalance (Mic A is +2.1 dB louder than Mic B).

6. CONCEPTUAL CAUSAL CHAIN:
   Mic A placed close to speaker cone; Mic B placed 19 inches further back as ambient room mic
   → Sound wave reaches Mic A 1.42 ms before reaching Mic B
   → Both channels summed together in mono bus
   → 1.42 ms time offset produces destructive wave cancellation at odd multiples of 350 Hz
   → Frequency response develops deep periodic notches (-18 dB depth at 350 Hz, 1050 Hz, 1750 Hz)
   → Guitar loses all low-end punch, body, and fullness upon mono collapse.

7. EXPLANATORY COVERAGE ASSESSMENT:
   - Explanatory Completeness: `COMPLETE_EXPLANATION` of the mono phase cancellation.

8. ASSUMPTION SENSITIVITY:
   - Assumption: Speed of sound in room is nominal 343 m/s (Risk: NEGLIGIBLE).
   - Sensitivity Tier: `ROBUST_TO_ASSUMPTION`.

9. RESULTING CAUSAL DIAGNOSIS:
   - Diagnosis Status: `CAUSAL_DIAGNOSIS_SUPPORTED`
   - Calibrated Assertion: "Mathematical cross-correlation and harmonic notch spacing conclusively confirm that
     a 1.42 ms acoustic path-length delay between Mic A and Mic B is the dominant cause of destructive comb-filtering
     and low-end collapse upon mono summation; electrical polarity flip is excluded as sole cause."

10. POST-DIAGNOSIS RESIDUAL UNCERTAINTY DOSSIER:
    - Unobserved Physical Variables: Exact ambient room temperature (causes <1% velocity shift; negligible).
    - Unisolated Secondary Mechanisms: Slight off-axis capsule frequency coloration on Mic B.
    - Uncertainty Survival: High confidence in primary diagnosis, with secondary acoustic room reflections noted.

11. WHAT TT IS NOT ENTITLED TO CONCLUDE (THE REMEDY FIREWALL):
    - TT is NOT entitled to prescribe: "Insert a sample-delay plugin on Mic A set to 1.42 ms and flip polarity."
    - TT is NOT entitled to tell the user: "Mute Mic B and use only Mic A."
    - STOP: Transmits complete causal diagnosis dossier to Phase 1C.5d.'''

if __name__ == "__main__":
    print(get_p1C5c_p7()[:300])
