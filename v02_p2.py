#!/usr/bin/env python3
"""
v02_p2.py: Sections 5 to 8
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2.txt
"""

def get_v02_p2():
    return '''================================================================================
SECTION 5 — ENGINEERING INTENT & INPUT SPECIFICITY (SISO GOVERNANCE)
================================================================================

5.1 THE TARGET SPECIFICITY SPECTRUM (DECOUPLED FROM EVIDENCE QUALITY)
In accordance with Major Finding M1, Tone Translator strictly decouples the degree of
Target Specificity from the dimensions of Evidence Quality, Evidence Directness, and
Measurement Comparability.

Target Specificity defines how narrowly the desired sonic destination has been specified:

  Tier 1: BROAD CREATIVE INTENT
    - Subjective, high-level aesthetic descriptions without stylistic or historical anchoring.
    - Examples: "Make my guitar sound huge", "warm, singing sustain", "more bite".
    - Engineering Epistemic Boundary: Establishes broad qualitative trade-off directions;
      cannot justify narrow parametric filtering, specific circuit topology choices, or
      single-artist gear emulation.

  Tier 2: STYLE / ERA INTENT
    - Anchored in established musical genres, historical production eras, and aesthetic traditions.
    - Examples: "1960s British invasion chime", "Mid-1980s thrash rhythm", "Modern progressive metal".
    - Engineering Epistemic Boundary: Establishes expected dynamic range, saturation density,
      and general arrangement role conventions; identifies known historical production archetypes
      without dictating a singular equipment chain.

  Tier 3: ARTIST / PRODUCTION FAMILY INTENT
    - Anchored in a recognized artist's production style or catalog period.
    - Examples: "Early Van Halen brown sound (1978)", "AC/DC late-1970s rhythm crunch".
    - Engineering Epistemic Boundary: Narrows plausible circuit topologies, pickup voicings,
      and transducer approaches; retains multiple valid variations across specific studios and tracks.

  Tier 4: SPECIFIC SONG / PART / PERFORMANCE ROLE INTENT
    - Anchored in an explicit, named album track or documented multi-track guitar pass.
    - Examples: "Metallica — 'Seek & Destroy' rhythm guitar track (Kill 'Em All, 1983)".
    - Engineering Epistemic Boundary: Establishes a concrete sonic benchmark with documented
      historical context, identifiable spectral/transient contours, and known mix relationships.

  Tier 5: REFERENCE AUDIO BENCHMARK
    - User supplies an external audio file representing the intended sonic destination.
    - Engineering Epistemic Boundary: Provides an empirical target file for comparative
      feature extraction (spectral balance, dynamic crest, decay profile).
    - Critical Epistemic Caveat (M1): A reference audio file is NOT inherently "calibrated"
      or uncorrupted. Its quality depends entirely on format, mastering compression, and source lineage.

  Tier 6: REFERENCE AUDIO + CURRENT USER EVIDENCE
    - User supplies both an external reference benchmark AND current session audio stems.
    - Engineering Epistemic Boundary: Defines target specificity at the highest comparative
      resolution by providing both target and source for differential analysis.
    - Critical Epistemic Caveat (M1): Possessing both files does NOT guarantee high measurement
      comparability. Performance differences, level mismatches, pickup variances, and lossy formats
      frequently limit the validity of direct mathematical subtraction.

5.2 THE SISO (SPECIFICITY-IN, SPECIFICITY-OUT) PRINCIPLE
A fundamental failure mode in automated sound engineering is "hallucinatory specificity" —
silently upgrading an ambiguous or broad user prompt into an unexpressed, highly specific target.

The SISO Invariant:
    TONE TRANSLATOR IS STRICTLY FORBIDDEN FROM SILENTLY INFERRING
    UNSTATED ARTIST OR RECORDING TARGETS FROM BROAD CREATIVE INPUTS.

Example Failure & Bounded Correction (Correction B2):
  - User Prompt: "Give me an aggressive 1980s-style thrash rhythm tone."
  - Defective AI Behavior: Silently assumes the user wants "Metallica — Master of Puppets",
    applies an extreme 800 Hz scoop, engages an Ibanez TS9 and Mesa Boogie Mark IIC+,
    and claims the engineering requirement is satisfied.
  - Authoritative 1C.5b Behavior:
    1. Categorizes intent as Tier 2 (Style/Era Intent).
    2. Identifies that 1980s thrash encompasses multiple distinct, legitimate sonic architectures:
       * British Mid-Forward Crunch (e.g. Slayer's Reign in Blood, Megadeth's Peace Sells);
       * American Scooped-Mid High-Gain Grind (e.g. Metallica's Master of Puppets);
       * Early Raw Prototype Crunch (e.g. Kill 'Em All).
    3. Recognizes that intent specificity is low relative to exact tonal replication.
    4. Evaluates whether clarification would materially improve specificity:
       "1980s thrash encompasses distinct tonal approaches — from mid-forward British Marshall
       crunch to deeply scooped American graphic-EQ rhythm. Do you have a specific reference
       track, or should reasoning proceed under a versatile early-thrash stylistic baseline?"
    5. If clarification is unavailable, proceeds under bounded uncertainty by retaining both
       stylistic interpretations in the hypothesis workspace, without prematurely constructing
       an intervention or selecting gear.

5.3 PROFESSIONAL RESPONSIBILITY VS INPUT EXCUSES
SISO is an input-quality and responsibility boundary; it is NEVER an excuse for lazy engineering:
  - When given broad intent, TT must formulate valid engineering hypotheses and recognize
    standard production constraints without manufacturing unrequested specificity.
  - TT must explicitly document what is established and what remains unknown.
  - TT must NOT invent artificial "input quality scores" (e.g. "Input quality: 48/100").
    Specificity is evaluated qualitatively against the task requirements.


================================================================================
SECTION 6 — CASE EVIDENCE ARCHITECTURE & MULTI-MODAL INTAKE
================================================================================

6.1 MULTI-MODAL EVIDENCE INGESTION
In accordance with Stage 02 of the frozen Decision Lifecycle, Case Evidence
Assessment (`CaseEvidenceAssessmentRecord`) ingests evidence across fifteen modalities:
  1. User Verbal Text: Subjective descriptors, musical references, perceived defects.
  2. Engineering Intent: Extracted artistic goals, explicit constraints, non-negotiables.
  3. Reference Audio Tracks: External commercial files supplied as sonic benchmarks.
  4. Current User Guitar Recordings: The player's existing captured guitar audio.
  5. Dry Direct Input (DI) Stems: Unamplified, high-impedance pickup captures from the guitar jack.
  6. Isolated Processing Stems: Preamp FX-loop sends, pre-cabinet DI taps, room mic stems.
  7. Full-Mix Context Audio: Multi-track or stereo mix stems containing drums, bass, vocals.
  8. Rig Manifest: Equipment list (guitar model, pickups, pedals, amplifier head, cabinet, speakers).
  9. Signal Chain Topology: The physical routing order of pedals, loops, and transducers.
  10. Hardware & Software Parameter Settings: Knob positions, switch states, digital preset values.
  11. Direct Measurements: DSP-derived FFT spectra, crest factor, THD, RMS levels, time delays.
  12. Controlled Diagnostic Test Captures: Audio captured during soloed, bypassed, or swept test states.
  13. Before/After Iteration Captures: Comparative audio pairs tracking specific parameter shifts.
  14. Platform Capability Telemetry: Target platform DSP limits, available blocks, parameter ranges.
  15. Prior Iteration Review Records: Historical review findings and documented failure modes.

6.2 THE FOUR ORTHOGONAL DIMENSIONS OF EVIDENCE ASSESSMENT (CORRECTION M1)
To prevent the category confusion identified in Finding M1, every material evidence item
must be evaluated across four independent, non-interchangeable dimensions:

  Dimension A: INTENT / TARGET SPECIFICITY
    - How specifically has the target sonic destination been defined? (Tiers 1 through 6).

  Dimension B: EVIDENCE QUALITY
    - How trustworthy is the data for empirical analysis?
    - Governed by: sample rate, bit depth, lossy compression codecs (e.g. MP3 vs WAV),
      signal-to-noise ratio, converter headroom, background acoustic contamination.

  Dimension C: EVIDENCE DIRECTNESS
    - How directly does the evidence observe the specific physical phenomenon under investigation?
    - Directness is locus-dependent: Dry DI has high directness for pickup loading and string buzz,
      but low directness for speaker cabinet resonance or acoustic room reflections.

  Dimension D: MEASUREMENT COMPARABILITY
    - How valid is an empirical comparison between two or more evidence items?
    - Governed by: performance consistency (identical riff, picking velocity, fretboard position),
      level calibration (gain matching), signal locus equivalence, and acoustic environment parity.

6.3 LISTENING VS MEASUREMENT: COMPLEMENTARY, NON-INTERCHANGEABLE MODALITIES
The AI Sound Engineer recognizes that objective measurement and perceptual listening
provide fundamentally different types of truth:
  - What Measurement Answers: Physical quantities (energy distributions, phase delays,
    crest factors, harmonic distortion percentages, DC offsets).
  - What Listening Answers: Aesthetic value, emotional impact, psychoacoustic maskability,
    musical appropriateness, genre authenticity, and balance.
  - Anti-Hierarchy Invariant:
    * Digital measurement does NOT automatically outrank human listening. A 2 dB spectral
      bump may measure as an anomaly but sound like essential rock "bite" in the mix.
    * Human listening does NOT automatically outrank measurement. A listener may perceive
      a sound as "dull and muddy" due to psychoacoustic masking, while measurement reveals
      the problem is actually excessive 3 kHz ear fatigue causing auditory desensitization.


================================================================================
SECTION 7 — EVIDENCE PROVENANCE & OPERATIONAL REALITY
================================================================================

7.1 THE SEVEN-TIER OPERATIONAL REALITY DISCIPLINE
In strict adherence to project operational reality, TT maintains complete honesty
regarding what software and AI models actually do versus what schemas declare:

  1. DECLARED: An entity, field, or interface specified in an architectural contract.
  2. IMPLEMENTED: Code exists in repository source files matching the specification.
  3. REACHABLE: Implemented code is wired into an execution path and invokable.
  4. EXECUTED: Code actually runs during a processing session.
  5. CONSUMED: Data produced by executed code is actively read and utilized downstream.
  6. DECISION-RELEVANT: Consumed data materially influences an engineering decision.
  7. USER-VISIBLE: Data or results are exposed to the user in the application UI.

Operational Reality Invariant:
The presence of a TypeScript interface (e.g. `dsp_feature_vector`, `thd_percent`)
does NOT establish that Tone Translator currently performs automated DSP feature
extraction. Where DSP analysis is not yet implemented at runtime, evidence items
are classified as `DECLARED_ARCHITECTURAL_CAPABILITY` or `USER_SUPPLIED_TELEMETRY`.
The reasoning architecture must never overstate current repository capabilities.

7.2 PROVENANCE AUDIT TRAIL
Every material claim made by the reasoning engine must link to an auditable provenance
type. When asked "Where did this come from?", the system must identify one of:
  - `DIRECTLY_SUPPLIED_BY_USER`: Explicit text or settings from the customer.
  - `MEASURED_FROM_CASE_EVIDENCE`: Output of an objective empirical procedure.
  - `DERIVED_MATHEMATICALLY`: Computed from other valid numerical inputs.
  - `INTERPRETED_PERCEPTUALLY`: Psychoacoustic characterization of verified phenomena.
  - `INFERRED_FROM_GOVERNED_KNOWLEDGE`: Deductions based on Phase 1C.4 canonical claims.
  - `PROPOSED_AS_HYPOTHESIS`: Causal mechanism formulated to explain observations.
  - `ASSUMED_PROVISIONALLY`: Explicit, unverified premise noted in uncertainty dossier.
  - `PLATFORM_SPECIFICATION`: Physical or DSP constraint imposed by target platform.
  - `RETRIEVED_FROM_LIBRARY`: Canonical knowledge retrieved via frozen snapshot.
  - `UNKNOWN_NOT_ESTABLISHED`: Explicit recognition that data is missing.


================================================================================
SECTION 8 — EVIDENCE QUALITY & QUESTION-RELATIVE SUFFICIENCY ASSESSMENT
================================================================================

8.1 QUESTION-RELATIVE EVIDENCE SUFFICIENCY (CORRECTION M2)
In accordance with Major Finding M2, Tone Translator repudiates the concept of
"universal diagnostic sufficiency." A specific package of evidence is never universally
complete; sufficiency is strictly relative to the specific engineering question being asked.

The Question-Relative Sufficiency Invariant:
    EVIDENCE SUFFICIENCY CANNOT BE EVALUATED IN THE ABSTRACT.
    IT IS DEFINED EXCLUSIVELY RELATIVE TO THE ACTIVE ENGINEERING QUESTION,
    THE COMPETING HYPOTHESES, AND THE REVERSIBILITY OF ACTION.

Contextual Sufficiency Matrix:
+------------------------------------+---------------------------------------+--------------------------------------+
| Engineering Question               | Minimum Sufficient Evidence Package   | Insufficient Evidence Examples       |
+------------------------------------+---------------------------------------+--------------------------------------+
| "Does defect originate in guitar   | Synchronized Dry DI + Processed Audio | Processed audio alone with full rig  |
| electronics vs downstream amp?"    | during identical performance take.    | manifest; oral user description.     |
+------------------------------------+---------------------------------------+--------------------------------------+
| "Is 4 kHz harshness acoustic mic   | Processed audio + controlled off-axis | Single on-axis capture with known amp|
| beaming vs preamp tube overdrive?" | or variable-excitation test capture.  | settings; dry DI alone.              |
+------------------------------------+---------------------------------------+--------------------------------------+
| "Is 650 Hz dip causing an acoustic | Solo guitar stem + Full-mix context   | Solo guitar capture alone; cabinet   |
| defect or aiding mix clearance?"   | stem (drums, bass, vocals).           | impulse response curve in isolation. |
+------------------------------------+---------------------------------------+--------------------------------------+
| "Does 8-string palm mute lack punch| Calibrated low-frequency FFT +        | Uncalibrated phone recording; generic|
| due to over-filtering vs pickup?"  | verified pre-amp filter settings.     | "djent" genre tag alone.             |
+------------------------------------+---------------------------------------+--------------------------------------+

8.2 EVIDENCE INTAKE COMPLETENESS CATEGORIES
While diagnostic sufficiency is question-relative, intake completeness categorizes the initial
breadth of supplied telemetry to guide the reasoning lifecycle:

  - `INTAKE_COMPREHENSIVE`: Direct audio (processed + DI), full rig manifest with knob settings,
    unambiguous intent, and verified calibration. Supports fine multi-locus hypothesis formulation.
  - `INTAKE_PARTIAL`: Core processed audio and general rig context present; internal circuit details
    (pickup DC resistance, exact mic distance) unobserved. Supports initial hypothesis workspace,
    with locus uncertainty explicitly bounded.
  - `INTAKE_MINIMAL`: Uncalibrated audio snippet or verbal description alone. Reasoning must proceed
    with strict uncertainty bounding or request targeted clarification.
  - `INTAKE_UNUSABLE`: Audio corrupted, unplayable, severely clipped by consumer mic, or intent
    wholly missing. Diagnostic reasoning is halted; triggers `INSUFFICIENT_EVIDENCE_ABSTAINED`.

8.3 CONFOUNDING VARIABLES & SIGNAL LOCATION INTEGRITY
A critical duty of Evidence Assessment is identifying confounders before observations
are formed:
  - Acoustic Confounders: Room reflections and boundary loading confounding microphone
    transduction evidence.
  - Performance Confounders: Player altering picking intensity, pick angle, or fretboard
    position between comparison takes, simulating an equipment defect.
  - Dynamic Gain Confounders: Uncalibrated DAW master faders or digital bus limiters
    compressing transients prior to analysis.
  - Signal Location Tagging: Every audio item must specify its exact physical acquisition
    point (`GUITAR_OUTPUT_JACK`, `PEDALBOARD_INPUT`, `PREAMP_FX_SEND`, `SPEAKER_CONE_ACOUSTIC`,
    `ROOM_AMBIENT`). Evidence from one locus cannot be substituted for another.'''

if __name__ == "__main__":
    print(get_v02_p2()[:300])
