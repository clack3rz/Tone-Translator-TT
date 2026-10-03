#!/usr/bin/env python3
"""
Sections 9 to 13 for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
"""

def get_sections_9_13():
    return '''================================================================================
SECTION 9 — OBSERVATION FORMATION & FACTUAL GROUNDING
================================================================================

9.1 THE OBSERVATION FORMATION DISCIPLINE (PRINCIPLE 2)
Principle 2 mandates:
    "OBSERVATION IS NOT INTERPRETATION."

An observation must describe purely what the available evidence objectively supports,
completely stripped of causal speculation, equipment blame, or remedial intent.

Observation Formation Invariant:
An observation states WHAT happened, NEVER WHY it happened or HOW to fix it.

Contrasting Valid Factual Observations with Prohibited Causal Leakage:
+------------------------------------+----------------------------------------+
| Prohibited Causal Assertion        | Authoritative Factual Observation      |
+------------------------------------+----------------------------------------+
| "Preamp cold clipper is generating | "Spectral peak at 4.2 kHz elevated by  |
| too much 4.2 kHz fizz."            | +6.2 dB relative to 1 kHz baseline     |
|                                    | (Method: 1/3-octave FFT, 4096-point)." |
+------------------------------------+----------------------------------------+
| "Compressor pedal is clamping down | "Transient onset envelope rise duration|
| on fast pick attack."              | measured at 38 ms (Method: envelope    |
|                                    | follower, 1 ms time window)."          |
+------------------------------------+----------------------------------------+
| "Floor reflection causing acoustic | "Periodic attenuation notches detected |
| comb filtering at 3.2 kHz."        | at 1.4 kHz, 4.2 kHz, and 7.0 kHz       |
|                                    | (-18 dB depth relative to surrounding).|
+------------------------------------+----------------------------------------+
| "Speaker cone breakup creating bad | "Non-harmonic sidebands detected in the|
| high-frequency buzz on low B."     | 2.2-2.8 kHz range during initial attack|
|                                    | transient of low-B note."              |
+------------------------------------+----------------------------------------+

9.2 THE FIVE TYPOLOGIES OF OBSERVATION
Every entry in `ObservationRecord` must be classified under one of five types:

  1. MEASURED PHENOMENON (`MEASURED_PHENOMENON`):
     - Empirical, quantitative outputs of calibrated DSP procedures.
     - Requires: exact measurement method, DSP window, time slice, and calibration limits.
     - Example: "RMS energy between 100-180 Hz is +7.2 dB higher during palm-muted strokes."

  2. USER-REPORTED PHENOMENON (`USER_REPORTED_PHENOMENON`):
     - Subjective experiences reported directly by the player.
     - Requires: verbatim quote, epistemic qualification (`UNVERIFIED_USER_CLAIM`).
     - Example: "User states: 'Notes have no snap or percussive punch when picking fast.'"

  3. LISTENER-PERCEIVED PHENOMENON (`LISTENER_PERCEIVED_PHENOMENON`):
     - Descriptive observations made by an engineer or listening model under a defined protocol.
     - Example: "Critical listening under nearfield monitoring identifies harsh high-frequency sizzle."

  4. RELATIONAL / COMPARATIVE PHENOMENON (`DERIVED_ANALYTICAL_PHENOMENON`):
     - Mathematical or structural deltas between two concurrent or synchronized audio stems.
     - Example: "Channel delay delta between Mic A and Mic B measured at 0.36 ms (Mic A leading)."

  5. NEGATIVE OBSERVATION (`NEGATIVE_OBSERVATION`):
     - Explicit verification of the absence of a feature under defined detection bounds.
     - Governed in full by Section 10 below.


================================================================================
SECTION 10 — NEGATIVE OBSERVATIONS & DETECTION LIMITS
================================================================================

10.1 DISCIPLINE OF NEGATIVE EVIDENCE (PRINCIPLE 3)
Principle 3 establishes:
    "MISSING EVIDENCE IS NOT NEGATIVE EVIDENCE."

A failure to observe a phenomenon because the appropriate sensor, bandwidth, or
test was not applied is an UNKNOWN DOMAIN, not a negative observation.

Negative Evidence Invariant:
    NOT DETECTED != DOES NOT EXIST.

A negative observation is legitimate ONLY when an empirical measurement procedure
actively inspected the targeted domain and confirmed that the phenomenon fell
below a defined detection threshold under stated operational conditions.

10.2 THE THREE MANDATORY ELEMENTS OF A NEGATIVE OBSERVATION
Every negative observation in Tone Translator must specify:
  1. Targeted Feature: Exactly what acoustic or electrical phenomenon was sought.
  2. Concrete Test Procedure: The algorithm, tool, or protocol used to search for it.
  3. Explicit Detection Limit: The sensitivity ceiling, noise floor, or bandwidth limit.

Authoritative Negative Observation Standard Form:
    "NOT DETECTED UNDER STATED MEASUREMENT CONDITIONS"

Standard Form Examples:
  - Mains Hum: "Discrete 50 Hz or 60 Hz harmonic spikes NOT DETECTED UNDER STATED
    MEASUREMENT CONDITIONS (Method: 4096-point FFT, detection threshold -68 dBFS,
    bandwidth 20 Hz to 500 Hz)."
  - Ultrasonic Noise: "Ultrasonic distortion components NOT DETECTED UNDER STATED
    MEASUREMENT CONDITIONS (Bandwidth ceiling 24 kHz at 48 kHz sample rate)."
  - Envelope Compression: "Dynamic envelope voltage sag NOT DETECTED UNDER STATED
    MEASUREMENT CONDITIONS (Steady-state sine test; detection limit 0.5 dB envelope deviation)."

10.3 PROHIBITED ABSOLUTIST FORMULATIONS
The AI Sound Engineer is strictly barred from asserting:
  - "There is zero hum."
  - "The signal is perfectly clean."
  - "No phase cancellation exists."
  - "The amplifier is not clipping."
Absolute assertions violate epistemic honesty and ignore physical noise floors and
measurement ceilings.


================================================================================
SECTION 11 — PHENOMENOLOGICAL INTERPRETATION ARCHITECTURE
================================================================================

11.1 THE PERCEPTUAL BRIDGE
Phenomenological Interpretation forms the bridge between cold physical measurements
and musical reality:

    PHYSICAL OBSERVATION (What the acoustic signal is doing physically)
        ↓
    PHENOMENOLOGICAL INTERPRETATION (How it is perceived musically and psychoacoustically)
        ↓
    CAUSAL HYPOTHESIS (What physical circuit or acoustic mechanism generated it)

Crucial Invariant:
Phenomenological Interpretation connects physical findings to perceptual experience;
it does NOT assign equipment blame or diagnose circuit faults.

Example Transformation:
  - Factual Observation: "Attack transient onset envelope rise duration is 38 ms."
  - Phenomenological Interpretation: "Percussive pick attack is perceived as swallowed,
    sluggish, and lacking snap, making rapid staccato picking indistinct in the mix."
  - Causal Hypothesis: "Pre-gain compressor pedal attack set sufficiently fast to clamp
    initial pick transients before envelope peaks."

11.2 DISCIPLINE OF QUALITATIVE DESCRIPTORS (THE ANTI-RECIPE RULE)
Sound engineering culture relies heavily on colorful subjective descriptors:
`flubby`, `fizzy`, `harsh`, `thin`, `boxy`, `stiff`, `sterile`, `loose`, `punchy`,
`aggressive`, `warm`, `dull`, `bright`, `hollow`, `muddy`, `scooped`.

The Anti-Recipe Invariant:
    TONE TRANSLATOR PERMANENTLY REPUDIATES FIXED FREQUENCY RECIPES
    FOR SUBJECTIVE PERCEPTUAL DESCRIPTORS.

Prohibited Static Lookups vs Professional Epistemic Reality:
+------------------------+--------------------------+---------------------------------+
| Subjective Descriptor  | Prohibited Static Recipe | Professional Epistemic Reality  |
+------------------------+--------------------------+---------------------------------+
| "Muddy"                | "Always cut 250-400 Hz"  | Can be caused by excessive bass |
|                        |                          | driving preamp, cabinet room    |
|                        |                          | resonance, mic proximity effect,|
|                        |                          | or dull guitar strings.         |
+------------------------+--------------------------+---------------------------------+
| "Fizzy" / "Harsh"      | "Always cut 4-6 kHz"     | Can be caused by dust-cap mic   |
|                        |                          | beaming, cold-clipper tube bias,|
|                        |                          | tweeter distortion, or digital  |
|                        |                          | aliasing.                       |
+------------------------+--------------------------+---------------------------------+
| "Thin"                 | "Always boost 100-200 Hz"| Can be caused by pickup phase   |
|                        |                          | cancellation, dual-mic comb     |
|                        |                          | filtering, or high-pass filter. |
+------------------------+--------------------------+---------------------------------+
| "Stiff" / "Sterile"    | "Always add tube sag"    | Can be caused by ultra-linear   |
|                        |                          | power supply, static cab IR, or |
|                        |                          | lack of pick dynamic velocity.  |
+------------------------+--------------------------+---------------------------------+

Qualitative descriptors are treated as valid perceptual evidence. They guide where
to look in the signal chain; they NEVER dictate an immediate EQ cut or processor insertion.


================================================================================
SECTION 12 — CONTEXTUAL EVIDENCE & PLAUSIBILITY BOUNDS
================================================================================

12.1 THE ROLE OF RIG & GENRE CONTEXT (PRINCIPLE 7)
Principle 7 establishes:
    "CONTEXT INFORMS REASONING BUT DOES NOT PROVE CAUSATION."

Contextual evidence includes:
  - Musical Context: Genre tradition, production era, tempo, tuning (e.g. standard E vs Drop A).
  - Arrangement Context: Solo lead guitar vs rhythm double-track vs 3-piece power trio.
  - Equipment Context: Single-coil vs active humbucker; vintage non-master tube head vs
    high-gain modern multi-stage preamp vs digital modeler; open-back 1x12 vs closed 4x12.
  - Transduction Context: Close dynamic mic vs off-axis ribbon vs direct loadbox IR.
  - Acoustic Environment: Treated tracking room vs untreated bedroom vs live stage.

12.2 WHAT CONTEXT IS ENTITLED TO DO
Context is legitimate and essential for:
  1. Shaping Engineering Intent: Knowing the tuning is Drop A on a 7-string establishes
     that 100-150 Hz energy must be tightly controlled to prevent intermodulation.
  2. Modulating Prior Plausibility: Knowing the rig includes an on-axis dynamic mic centered
     on the speaker dust cap makes acoustic dust-cap beaming highly plausible when
     a 4.2 kHz peak is observed.
  3. Pruning Impossible Mechanisms: Knowing the amplifier is an all-tube head prunes
     digital buffer underrun as a hypothesis for distortion.
  4. Guiding Diagnostic Test Selection: Suggesting relevant physical tests (e.g. moving
     the mic off-axis).

12.3 WHAT CONTEXT IS STRICTLY BARRED FROM DOING
Context MUST NEVER:
  - Mechanically prescribe a solution: "User plays metal -> insert Tube Screamer".
  - Substitute for case evidence: "Rig has an SM57 -> assume 4.2 kHz is always mic beaming".
  - Silence alternative hypotheses: "Amp is a high-gain head -> ignore possible cable defect".


================================================================================
SECTION 13 — KNOWLEDGE-GUIDED INTERPRETATION & THE REFERENCE FIREWALL
================================================================================

13.1 INTEGRATION WITH PHASE 1C.4 KNOWLEDGE ARCHITECTURE
The governed Knowledge Library (Phase 1C.4) acts as the sound engineering memory of TT:
  - Canonical KnowledgeClaims provide physical explanations linking symptoms to mechanisms.
  - CausalModels define interactions between circuit components, transducers, and acoustic waves.
  - OperationalBoundaries delineate valid parameter ranges for engineering claims.
  - ConflictRecords preserve ongoing professional controversies (e.g. tube rectifier sag debates).

Knowledge Retrieval Protocol:
During Stage 05, the engine queries the Knowledge Library using verified observations
and contextual tags. Retrieved claims populate `grounding_knowledge_claim_refs` in
the hypothesis workspace, anchoring prior plausibility in peer-reviewed and professional science.

13.2 THE REFERENCE CASE FIREWALL (PRINCIPLE 20)
Phase 1C.4d established the Reference Case Firewall:
    REFERENCE CASE ANALOGY != CURRENT CASE EVIDENCE.

Reference cases (e.g. documented album production notes, famous studio setups,
bench test archives) provide illustrative analogies to stimulate hypothesis generation.
However:
  - A reference case is NEVER evidence about what is happening in the current user session.
  - Just because Eddie Van Halen used a Variac in 1978 does NOT mean the user's amp has low plate voltage.
  - Reference cases remain quarantined behind the firewall; they cannot be cited as
    proof of current case causation.

13.3 OPTIONAL KNOWLEDGE GROUNDING & NOVEL HYPOTHESES (CORRECTION M2)
In accordance with frozen Correction M2:
    ABSENCE OF A MATCHING GOVERNED KNOWLEDGECLAIM MUST NOT PREVENT
    FORMATION OF A PLAUSIBLE, BOUNDED, EXPLICITLY UNCERTAIN HYPOTHESIS.

Real-world sound engineering constantly encounters custom circuits, uncatalogued boutique
pedals, unusual pickup combinations, and rare acoustic interactions not yet covered
in the governed library.

When forming a novel hypothesis:
  - `knowledge_grounding_status` is explicitly flagged as `NO_MATCHING_GOVERNED_KNOWLEDGE`.
  - The hypothesis must detail its physical evidential basis, explicit assumptions,
    and residual uncertainties.
  - The system is STRICTLY FORBIDDEN from manufacturing fake KnowledgeClaims to satisfy grounding.
  - The hypothesis is treated with the identical rigorous evidence-discrimination discipline
    as governed hypotheses.'''

if __name__ == "__main__":
    print(get_sections_9_13()[:300])
