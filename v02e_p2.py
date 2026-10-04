#!/usr/bin/env python3
"""
v02e_p2.py: Sections 5 to 8
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2e.txt
"""

def get_v02e_p2():
    return '''================================================================================
SECTION 5 — ENGINEERING INTENT & INPUT SPECIFICITY (SISO GOVERNANCE)
================================================================================

5.1 THE TARGET SPECIFICITY SPECTRUM & TASK-TYPE ORTHOGONALITY (CORRECTIONS M1 & SPEC-1)
In accordance with Major Finding M1 and Correction SPEC-1, Tone Translator strictly decouples
the degree of Target Specificity from:
  1. Evidence Quality, Evidence Directness, and Measurement Comparability;
  2. The Engineering Task / Problem Type (e.g. Defect Troubleshooting, Discrepancy Investigation,
     Inter-Session Drift Analysis, Creative Tone Building, Benchmark Matching).

Target Specificity defines how narrowly the desired sonic destination has been specified:

  Tier 1: BROAD CREATIVE INTENT / UNANCHORED SPECIFICATION
    - Subjective, high-level aesthetic descriptions without stylistic or historical anchoring.
    - Examples: "Make my guitar sound huge", "warm, singing sustain", "more bite", "fix the harshness".
    - Engineering Epistemic Boundary: Establishes broad qualitative trade-off directions;
      cannot justify narrow parametric filtering, specific circuit topology choices, or
      single-artist gear emulation.
    - Orthogonality Note (SPEC-1): Tier 1 represents low target specificity; it is NOT synonymous
      with troubleshooting. A troubleshooting task may have Tier 1 specificity ("my sound is harsh"),
      or Tier 4 specificity ("restore the exact high-E balance of my morning tracking pass").

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
    - Anchored in an explicit, named album track, documented multi-track guitar pass, or specific session take.
    - Examples: "Metallica — 'Seek & Destroy' rhythm guitar track (Kill 'Em All, 1983)", "Match Morning Take 1 pass".
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

Orthogonal Engineering Task Classifications:
The investigation domain represents an orthogonal descriptive facet independent of target specificity:
  - `DEFECT_TROUBLESHOOTING`: Investigating reported acoustic/electrical faults (buzz, harshness, flub).
  - `DISCREPANCY_INVESTIGATION`: Investigating conflicts between measurement and perception or between stems.
  - `INTER_SESSION_DRIFT`: Investigating unexplained changes between consecutive recording passes.
  - `CREATIVE_TONE_CREATION`: Establishing a new musical voice from stylistic or artist references.
  - `BENCHMARK_COMPARATIVE_MATCHING`: Minimizing sonic distance relative to a curated commercial target.
  - `INTAKE_QUALITY_TRIAGE`: Assessing adequacy of user-supplied telemetry before reasoning proceeds.

5.2 THE SISO (SPECIFICITY-IN, SPECIFICITY-OUT) PRINCIPLE
A fundamental failure mode in automated sound engineering is "hallucinatory specificity" —
silently upgrading an ambiguous or broad user prompt into an unexpressed, highly specific target.

The SISO Invariant:
    TONE TRANSLATOR IS STRICTLY FORBIDDEN FROM SILENTLY INFERRING
    UNSTATED ARTIST OR RECORDING TARGETS FROM BROAD CREATIVE INPUTS.

Example Failure & Bounded Correction (Correction B2, HYP-1 & FB-C5):
  - User Prompt: "Give me an aggressive 1980s-style thrash rhythm tone."
  - Defective AI Behavior: Silently assumes the user wants "Metallica — Master of Puppets",
    applies an extreme 800 Hz scoop, engages an Ibanez TS9 and Mesa Boogie Mark IIC+,
    and claims the engineering requirement is satisfied.
  - Authoritative 1C.5b Behavior:
    1. Categorizes intent as Tier 2 (Style / Era Intent); Task Type: Creative Tone Creation under Ambiguity.
    2. Identifies that 1980s thrash encompasses multiple distinct, legitimate sonic architectures:
       * British Mid-Forward Crunch (e.g. Slayer's Reign in Blood, Megadeth's Peace Sells);
       * American Scooped-Mid High-Gain Grind (e.g. Metallica's Master of Puppets);
       * Early Raw Prototype Crunch (e.g. Kill 'Em All).
    3. Recognizes that intent specificity is broad relative to exact tonal replication.
    4. Evaluates whether clarification would materially improve specificity:
       "1980s thrash encompasses distinct tonal approaches — from mid-forward British Marshall
       crunch to deeply scooped American graphic-EQ rhythm. Do you have a specific reference
       track, or should reasoning proceed under a versatile early-thrash stylistic baseline?"
    5. If clarification is unavailable, proceeds under bounded uncertainty by retaining both
       stylistic target interpretations, without prematurely instantiating a causal defect workspace
       or selecting equipment interventions.

5.3 QUESTION-RELATIVE NO-AUDIO BEHAVIOR & PROFESSIONAL RESPONSIBILITY (FB-C5)
SISO is an input-quality and responsibility boundary; it is NEVER an excuse for lazy engineering
nor an authorization for arbitrary work abstention.

Fundamental Principle (FB-C5):
    NO AUDIO != AUTOMATIC ABSTENTION.

The correct system behavior when audio evidence is absent depends strictly on the active
engineering task and question:
  1. Creative Target Clarification:
     - When the user supplies broad aesthetic intent (e.g. "Give me an aggressive 1980s thrash tone")
       without audio: Tone Translator clarifies intent, establishes candidate target interpretations,
       classifies target specificity (Tier 2), and proceeds with bounded creative reasoning later where
       allowed. Tone Translator MUST NOT instantiate a causal defect hypothesis workspace merely
       because the user supplied words.
  2. Reported Phenomenon Without Audio:
     - When the user reports a specific acoustic or electrical defect (e.g. "My amp has a loud buzz")
       without audio: Tone Translator may form carefully bounded candidate causal hypotheses grounded
       in the reported phenomenon and rig manifest, with appropriately high qualitative uncertainty.
       The absence of audio telemetry limits direct measurement, but does NOT prohibit all hypothesis
       formation.
  3. Requested Causal Diagnosis with Unusable Evidence:
     - When the user requests a definitive causal diagnosis that cannot be supported by supplied
       evidence (e.g. corrupted audio, missing critical signal taps): Tone Translator must abstain
       from causal resolution and issue a discriminating evidence request.

Tone Translator must explicitly document what is established and what remains unknown.
Tone Translator must NOT invent artificial "input quality scores" (e.g. "Input quality: 48/100").
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
  11. Direct Measurements: DSP-derived FFT spectra, crest factor, RMS levels, time delays.
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
    - Governed by: performance consistency (similar riff, picking velocity, fretboard position),
      level calibration (gain matching), signal locus equivalence, and acoustic environment parity.

6.3 LISTENING VS MEASUREMENT: COMPLEMENTARY, NON-INTERCHANGEABLE MODALITIES
The AI Sound Engineer recognizes that objective measurement and perceptual listening
provide fundamentally different types of truth:
  - What Measurement Answers: Physical quantities (energy distributions, phase delays,
    crest factors, spectral deltas, DC offsets).
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

7.1 THE IMMUTABLE EVIDENCE RECORD CONTRACT
To guarantee retrospective auditability (Constitutional Principle 20), all ingested evidence
is committed to an immutable `CaseEvidenceRecord` structure:

```typescript
interface CaseEvidenceRecord {
  case_id: string;
  timestamp: string; // ISO 8601
  items: EvidenceItem[];
  provenance_register: ProvenanceEntry[];
  unknown_domains: string[]; // Active unobserved parameters
}

interface EvidenceItem {
  evidence_id: string;
  modality: EvidenceModality;
  raw_payload_uri: string;
  metadata: Record<string, any>;
  evaluation: EvidenceEvaluationFacet;
}

interface EvidenceEvaluationFacet {
  quality_grade: QualityGrade;       // HIGH | MODERATE | COMPROMISED | UNUSABLE
  directness_score: DirectnessGrade; // DIRECT | INDIRECT | HIGHLY_INDIRECT
  comparability: ComparabilityGrade; // DIRECTLY_COMPARABLE | CONDITIONALLY_COMPARABLE | NON_COMPARABLE
  bandwidth_limit_hz?: number;
  sample_rate?: number;
  bit_depth?: number;
  format_codec?: string;
  calibration_state: CalibrationStatus;
}
```

7.2 OPERATIONAL REALITY & CONSERVATIVE REASONING (CORRECTION M6)
Current Tone Translator runtime operates in a bounded AI Studio software context.
Tone Translator must NEVER claim capabilities it does not possess:
  - It does NOT possess real-time hardware oscilloscopes connected to physical amplifier chassis.
  - It does NOT possess laser vibrometers measuring physical speaker cone displacement.
  - It does NOT possess calibrated room acoustic microphones placed in the user's bedroom.
Telemetry must be reported with strict operational honesty:
  - Distinguishing between direct WAV file inspection and user-reported verbal rig descriptions.
  - Refusing to treat unverified user assertions as measured physical ground truth.


================================================================================
SECTION 8 — EVIDENCE QUALITY & QUESTION-RELATIVE SUFFICIENCY ASSESSMENT
================================================================================

8.1 QUESTION-RELATIVE EVIDENCE SUFFICIENCY (CORRECTION M1)
Evidence sufficiency is NEVER an absolute scalar threshold. It is strictly relative to the
engineering question being asked:
  - A 128 kbps MP3 recording is INSUFFICIENT to diagnose subtle 14 kHz air band aliasing
    or sub-bass phase distortion;
  - However, that same 128 kbps MP3 may be FULLY SUFFICIENT to identify that the user is playing
    a single-coil bridge pickup rather than a neck humbucker, or that an aggressive noise gate
    is cutting off note decay.

8.2 THE QUESTION-RELATIVE SUFFICIENCY MATRIX
+------------------------------------+--------------------------+-----------------------+
| Engineering Investigation Target   | Required Quality / Locus | Sufficiency Verdict   |
+------------------------------------+--------------------------+-----------------------+
| Sub-bass phase cancellation        | Uncompressed WAV + Dry DI| SUFFICIENT            |
| Lossy MP3 room recording           | High-frequency analysis  | INSUFFICIENT (ABSTAIN)|
| Verbal report + No audio           | Broad creative intent    | SUFFICIENT (TIER 1/2) |
| Verbal report + No audio           | Precise tube bias drift  | INSUFFICIENT (ABSTAIN)|
| Single processed stem without DI   | Upstream pickup loading  | INDIRECT / WEAKENED   |
+------------------------------------+--------------------------+-----------------------+'''

if __name__ == "__main__":
    print(get_v02e_p2()[:300])
