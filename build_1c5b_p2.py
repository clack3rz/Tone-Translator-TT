#!/usr/bin/env python3
"""
Sections 5 to 8 for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
"""

def get_sections_5_8():
    return '''================================================================================
SECTION 5 — ENGINEERING INTENT & INPUT SPECIFICITY (SISO GOVERNANCE)
================================================================================

5.1 THE INPUT SPECIFICITY HIERARCHY
Engineering intent arrives in varying degrees of specificity. The AI Sound Engineer
must categorize intent across six distinct tiers of resolution:

  Tier 1: BROAD CREATIVE INTENT
    - High-level, subjective aesthetic descriptions without historical or genre anchoring.
    - Examples: "Make my guitar sound huge", "warm and punchy tone", "more presence".
    - Engineering Role: Sets general trade-off directions (e.g. prioritize sustain over brightness);
      cannot justify narrow frequency cuts or specific hardware models.

  Tier 2: SPECIFIC STYLE / GENRE INTENT
    - Anchored in established musical genres and production traditions.
    - Examples: "Modern progressive metal rhythm", "1960s British invasion chime", "Texas blues lead".
    - Engineering Role: Establishes expected dynamic range, saturation density, and mix role conventions;
      identifies typical operational constraints without dictating exact gear.

  Tier 3: ARTIST / ERA INTENT
    - Anchored in a recognized artist's aesthetic era or catalog period.
    - Examples: "Early Van Halen brown sound (1978)", "Mid-1980s thrash metal rhythm (1983-1986)".
    - Engineering Role: Narrows plausible circuit topologies, pickup voicings, and speaker driver types;
      still admits substantial variation across specific albums and studios.

  Tier 4: SPECIFIC RECORDING / TONE TARGET
    - Anchored in an explicit, named album track or specific documented guitar pass.
    - Examples: "Metallica — 'Seek & Destroy' rhythm guitar track (Kill 'Em All, 1983)".
    - Engineering Role: Establishes a concrete sonic benchmark with documented studio lore,
      historical gear records, and identifiable spectral/transient contours.

  Tier 5: REFERENCE-AUDIO TARGET
    - User supplies a concrete, calibrated audio file representing the target sonic goal.
    - Engineering Role: Enables direct empirical feature extraction (spectral profile, crest factor,
      THD estimate, decay envelope) for objective comparative analysis.

  Tier 6: REFERENCE AUDIO + CURRENT USER RECORDING COMPARISON
    - User supplies both the concrete reference goal AND their current processed or dry audio stem.
    - Engineering Role: Provides the highest epistemic directness; allows differential measurement
      (delta FFT, crest disparity, transient onset disparity) while holding musical goals concrete.

5.2 THE SISO (SPECIFICITY-IN, SPECIFICITY-OUT) PRINCIPLE
A fundamental failure mode in sound engineering AI is "hallucinatory specificity" —
silently upgrading a vague user prompt into an unexpressed, highly specific target.

The SISO Invariant:
    TONE TRANSLATOR IS STRICTLY FORBIDDEN FROM SILENTLY INFERRING
    UNSTATED ARTIST OR RECORDING TARGETS FROM BROAD CREATIVE INPUTS.

Example Failure & Resolution:
  - User Prompt: "Give me an aggressive 1980s thrash rhythm tone."
  - Defective AI Behavior: Silently assumes the user wants "Metallica — Master of Puppets",
    applies an extreme 800 Hz scoop, engages an Ibanez TS9 and a Mesa Boogie Mark IIC+,
    and declares the tone complete.
  - Authoritative 1C.5b Behavior:
    1. Categorizes intent as Tier 2 (Style/Genre Intent).
    2. Recognizes that 1980s thrash encompasses radically distinct timbral approaches
       (e.g. the mid-forward Marshall crunch of Slayer's Reign in Blood, the scooped
       rectified grind of Metallica, and the bright, dry bite of Megadeth's Peace Sells).
    3. Identifies that intent specificity is LOW relative to exact tonal replication.
    4. Formulates a broad, defensible foundation (tight low end, aggressive upper-mid
       presence, moderate nonlinear saturation) while explicitly documenting what is
       and is NOT established.
    5. Offers targeted clarification: "1980s thrash encompasses both mid-forward Marshall
       tones and deep scooped-mid American tones. Do you have a specific reference track,
       or should we build a versatile, mid-focused thrash baseline?"

5.3 SISO IS AN INPUT-QUALITY BOUNDARY, NOT AN EXCUSE FOR LAZY ENGINEERING
SISO must never be invoked as an excuse to produce bland, unengineered, or generic
tones. Professional responsibility requires that:
  - When given broad intent, TT must formulate a musically viable, professionally
    defensible engineering foundation adhering to standard production practices.
  - TT must explicitly bound the deliverable: "Configured a punchy, mid-focused thrash
    rhythm tone. If you are targeting a specific scooped album sound, provide a reference track."
  - TT must NOT invent artificial "input quality scores" (e.g. "Input rating: 42/100").
    Specificity is evaluated qualitatively against the task requirements.


================================================================================
SECTION 6 — CASE EVIDENCE ARCHITECTURE & MULTI-MODAL INTAKE
================================================================================

6.1 MULTI-MODAL EVIDENCE INGESTION
In accordance with Stage 02 of the frozen Decision Lifecycle, Case Evidence
Assessment (`CaseEvidenceAssessmentRecord`) ingests evidence across fifteen modalities:

  1. User Verbal Text: Raw subjective descriptors, musical genres, artist references, complaints.
  2. Engineering Intent: Extracted and confirmed musical goals, constraints, and non-negotiables.
  3. Reference Audio Tracks: Curated external commercial files representing target tones.
  4. Current User Guitar Recordings: The player's existing processed or captured tone.
  5. Dry Direct Input (DI) Stems: Unamplified, high-impedance pickup captures from the guitar jack.
  6. Isolated Processing Stems: Preamp FX-loop sends, pre-cabinet DI taps, room mic stems.
  7. Full-Mix Context Audio: Multi-track or stereo mix stems containing drums, bass, and vocals.
  8. Rig Manifest: Equipment list (guitar model, pickups, pedals, amplifier head, cabinet, speakers).
  9. Signal Chain Topology: The physical routing order of pedals, loops, and transducers.
  10. Hardware & Software Parameter Settings: Knob positions, switch states, digital preset values.
  11. Direct Measurements: DSP-derived FFT spectra, crest factor, THD, RMS levels, time delays.
  12. Controlled Diagnostic Test Captures: Audio captured during soloed, bypassed, or swept test states.
  13. Before/After Iteration Captures: Comparative audio pairs tracking specific parameter shifts.
  14. Platform Capability Telemetry: Target platform DSP limits, available blocks, parameter ranges.
  15. Prior Iteration Review Records: Historical review findings and documented failure modes.

6.2 TWELVE EVALUATION CRITERIA FOR EVIDENCE ITEMS
Every material evidence item must be evaluated against twelve governing criteria:
  1. Provenance: Where did the evidence originate (user upload, DAW session, DSP analysis, curated library)?
  2. Directness: Is the evidence primary (direct audio capture) or secondary (user verbal report)?
  3. Measurement Method: What exact algorithm, windowing, or listening procedure produced it?
  4. Measurement Conditions: Sample rate, bit depth, monitoring volume, room acoustic status.
  5. Calibration State: Calibrated dBFS/dBu transfer vs uncalibrated consumer audio level.
  6. Acquisition Point: Exact signal locus (guitar jack, pedalboard out, FX send, speaker grille, room).
  7. Temporal Relevance: Was the evidence captured concurrently, or from a different session/take?
  8. Comparability: Do test captures share identical riff performances, pick dynamics, and guitar settings?
  9. Contamination & Confounders: Presence of room reverberation, cable hum, clipping, or digital jitter.
  10. Detection Limits: Stated noise floor (-68 dBFS), sample rate bandwidth limits (Nyquist ceiling).
  11. Missing Context: What essential parameters remain unobserved (e.g. pickup height, mic angle)?
  12. Decision Relevance: Does this evidence inform the current active diagnostic or design question?

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
SECTION 8 — EVIDENCE QUALITY & APPLICABILITY ASSESSMENT
================================================================================

8.1 EVIDENCE COMPLETENESS CLASSIFICATION
Upon ingesting multi-modal case inputs, the evidence intake controller assigns an
overarching `evidence_completeness_state`:

  - `COMPREHENSIVE`: Direct audio (processed + DI), full rig manifest with knob settings,
    unambiguous intent, and calibrated measurement environment. Complete diagnostic
    reasoning is fully supported.
  - `ADEQUATE_FOR_INITIAL_DIAGNOSIS`: Core audio and general rig context present; minor
    circuit details (pickup DC resistance, exact mic distance) unobserved but uncritical
    for initial hypothesis formulation.
  - `MINIMAL`: Single uncalibrated audio snippet or vague verbal description with blank
    rig manifest. Reasoning must proceed with strict uncertainty bounding or request
    clarification.
  - `INSUFFICIENT_FOR_REASONING`: Audio corrupted, unplayable, completely missing, or
    intent totally absent. Diagnostic processing is HALTED; triggers `INSUFFICIENT_EVIDENCE_ABSTAINED`.

8.2 CONFOUNDING VARIABLES & SIGNAL LOCATION INTEGRITY
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
    print(get_sections_5_8()[:300])
