# Part 3 of Phase 1C.5h Architecture Specification v0.1
# Sections 15 to 20

PART3 = """
15. OBJECTIVE EVIDENCE ARCHITECTURE

15.1 The Role of Objective Evidence
Objective evidence provides mathematical, deterministic, and physical proof of system behavior.
It is mandatory where the validation question concerns:
  - schema validity;
  - parameter-bound clamping;
  - target-platform preset file serialization;
  - spectral response curves;
  - total harmonic distortion (THD) and harmonic distribution;
  - dynamic crest factor and attack envelope;
  - phase coherence across stereo and multi-mic configurations;
  - system latency, memory allocation, and CPU execution time;
  - error handling and exception logging under invalid input.

15.2 The Prohibition of Universal Numeric Freezing
Phase 1C.5h strictly adheres to Invariant 7 and the Design Mandate:
`NO UNIVERSAL NUMERIC THRESHOLDS ARE FROZEN AT THE MANDATE OR SPECIFICATION LEVEL.`

A universal rule such as "Spectral delta must be < 1.5dB" or "THD must be < 0.5%" is fundamentally flawed in guitar audio engineering:
  - In an ultra-clean Fender Twin Reverb model, a 1.0dB mid-scoop divergence or 0.2% THD increase may be a severe defect;
  - In a heavily saturated Mesa Boogie Dual Rectifier fuzz-lead tone, a 3.0dB harmonic peak shift or 15% THD variation may be musically desirable and expected.

Therefore, objective acceptance thresholds in Phase 1C.5h are strictly:
  - declared within individual, version-bound Test Profiles;
  - scoped to specific gear families, pickup types, and musical genres;
  - calibrated against verified golden acoustic reference fixtures.

15.3 The ObjectiveEvidenceRecord Schema
  - objective_evidence_id: Unique UUID;
  - execution_id: Reference to ValidationExecutionRecord;
  - metric_category:
      - STRUCTURAL_SCHEMA
      - PARAMETER_BOUNDS
      - EXPORT_INTEGRITY
      - SPECTRAL_ANALYSIS
      - DYNAMIC_ENVELOPE
      - HARMONIC_DISTORTION
      - PHASE_COHERENCE
      - OPERATIONAL_LATENCY_PERFORMANCE;
  - measured_parameters: Detailed key-value map of raw values;
  - applied_threshold_profile_ref: Versioned ID of the applicable tolerance rule;
  - tolerance_evaluation: MET | OUT_OF_TOLERANCE | BORDERLINE | NOT_APPLICABLE;
  - measured_delta: Numerical difference from baseline or reference;
  - objective_pass_fail: PASS | FAIL | INCONCLUSIVE;
  - computational_artifacts_retained: URIs/hashes of FFT plots, wav exports, XML dumps.


16. PERCEPTUAL EVIDENCE ARCHITECTURE

16.1 The Materiality of Perceptual Evidence
In guitar tone engineering, objective measurements alone can never certify tone quality.
A frequency response curve cannot measure whether a guitar tone feels "stiff" or "spongy" under the guitarist's pick. An FFT plot cannot determine whether high-end harmonic content sounds like "silky air" or "grating digital fizz."

Perceptual evidence is mandatory whenever:
  - musical quality, tone warmth, depth, or presence is at issue;
  - pick attack dynamics, instrument cleanup, and musician feel are evaluated;
  - psychoacoustic masking, mix separation, and stereo imaging are assessed;
  - competing tone interventions are judged for aesthetic preference.

16.2 Controlled, Flexible Listening Methodologies
Phase 1C.5h explicitly rejects listening-methodology dogmatism. No single evaluation methodology is universal. Phase 1C.5h supports a governed toolkit of eleven distinct perceptual methodologies:

  1. Sighted Expert Review: Qualitative evaluation by master sound engineers to rapidly identify gross defects, obvious phase errors, or inappropriate gain staging;
  2. A/B Testing: Direct sequential comparison between candidate and baseline to evaluate specific audible differences;
  3. Blind A/B Testing: Evaluator compares Tone X and Tone Y without knowing which is candidate or legacy, eliminating brand and model bias;
  4. ABX Testing: Evaluator identifies whether unknown Tone X matches Reference A or Candidate B; used to prove whether an audible difference genuinely exists;
  5. MUSHRA (MUlti Stimulus test with Hidden Reference and Anchor): Rigorous ITU-R BS.1534 standard comparing candidate against hidden reference, low-pass anchor, and legacy baseline;
  6. Paired Comparison: Forced-choice comparative preference testing across multiple tone variants;
  7. Reference Matching Evaluation: Scoring how accurately candidate reproduces the acoustic characteristics of an approved commercial record stem;
  8. Defect Detection Panel: Targeted listening specifically tasked with hunting for aliasing, digital clipping, unnatural gate chatter, or phase cancellation;
  9. Musical-Context Evaluation: Listening to the guitar track embedded inside a full multitrack mix (drums, bass, vocals, keys) to evaluate mix fit;
  10. Interactive Playability Testing: Hands-on evaluation by performing guitarists with real instruments to assess latency, pick response, touch sensitivity, and cleanup;
  11. Extended Listening Fatigue Test: Prolonged listening at calibrated studio monitoring levels (83dB SPL) to detect fatiguing high-frequency resonances.

16.3 The PerceptualEvaluationRecord Schema
  - perceptual_evidence_id: Unique UUID;
  - execution_id: Reference to ValidationExecutionRecord;
  - evaluator_id: Anonymized unique ID of the evaluator;
  - evaluator_role: MASTER_ENGINEER | SESSION_GUITARIST | PRODUCER | PLATFORM_SPECIALIST;
  - methodology_used: One of the 11 governed methodologies above;
  - listening_environment:
      - monitor_type: NEARFIELD_STUDIO_MONITORS | OPEN_BACK_HEADPHONES | IEM | GUITAR_CAB_FRFR;
      - calibrated_spl_dba: Sound pressure level during testing;
      - acoustic_treatment_level: TREATED_CONTROL_ROOM | UNTREATED | REFERENCE_HEADPHONE;
  - presented_stimuli_hashes: Map of stimulus labels to audio hashes;
  - perceptual_dimensions_evaluated:
      - tonal_balance (1-10);
      - harmonic_warmth_vs_harshness (1-10);
      - transient_punch_and_clarity (1-10);
      - dynamic_touch_response (1-10);
      - mix_presence_and_separation (1-10);
      - listening_fatigue_absence (1-10);
  - qualitative_observations: Structured text notes detailing specific acoustic phenomena;
  - evaluator_confidence: HIGH | MEDIUM | LOW;
  - evaluation_outcome [PHASE_1C5H_PROPOSED]: PERCEPTUAL_PASS | PERCEPTUAL_FAIL | PERCEPTUAL_INCONCLUSIVE.


17. USER ACCEPTANCE TESTING (UAT) ARCHITECTURE

17.1 Task-Oriented Acceptance vs Listening Tests
While listening tests evaluate audio signals, User Acceptance Testing (UAT) evaluates task-oriented workflows, usability, cognitive friction, and system fitness from the perspective of real-world audio professionals.

17.2 The Four Governed UAT Evaluator Personas
Phase 1C.5h defines four distinct, governed UAT evaluator personas:

  1. PERSONA 1: THE RECORDING / MIX ENGINEER
     - Focus: Workflow speed, mix context integration, phase coherence, headroom management, automation behavior, export precision.
     - Sample Task: "Take a raw multitrack DI guitar, prompt Tone Translator for a 90s Grunge rhythm tone, export preset to AT5, and blend into mix."
     - Acceptance Criteria: Tone sits in mix without extreme corrective EQ, preset loads immediately, level matches studio standards (-18dBFS nominal RMS).

  2. PERSONA 2: THE PERFORMING / SESSION GUITARIST
     - Focus: Real-time playability, latency under 5ms, dynamic feel, volume pot cleanup, pick attack sensitivity, absence of unnatural gating.
     - Sample Task: "Plug guitar directly into input, play dynamic blues lead transitioning from soft thumbing to heavy aggressive picking."
     - Acceptance Criteria: Amp cleans up naturally on low volume; no digital glitching or unnatural sustain decay.

  3. PERSONA 3: THE CREATIVE PRODUCER / SONGWRITER
     - Focus: Intuitive semantic translation, aesthetic inspiration, genre authenticity, variety of valid alternatives presented.
     - Sample Task: "Request an 'ethereal shoegaze shimmer lead with dark vintage body' and evaluate relevance of generated signal chains."
     - Acceptance Criteria: System accurately translates subjective musical intent without requiring deep DSP parameter tweaking.

  4. PERSONA 4: THE TONE-PLATFORM / PRESET ARCHITECT
     - Focus: Target-platform compliance, gear licensing safety, XML structure, preset organization, parameter normalization.
     - Sample Task: "Verify that generated AT5 preset conforms to IK Multimedia AmpliTube 5 parameter manifests and contains no illegal gear IDs."
     - Acceptance Criteria: Zero XML parsing errors, zero missing gear warnings, valid parameter ranges [0.0 to 1.0].

17.3 The UATEvaluationRecord Schema
  - uat_id: Unique UUID;
  - package_id: Reference to parent ValidationPackage;
  - evaluator_persona: RECORDING_ENGINEER | SESSION_GUITARIST | PRODUCER | PLATFORM_ARCHITECT;
  - task_scenario_id: Identifier of the executed user task;
  - task_completion_status: COMPLETED_SUCCESSFULLY | COMPLETED_WITH_FRICTION | FAILED;
  - task_duration_seconds: Time taken to complete task;
  - workflow_satisfaction_score: Standard 1–5 Likert rating;
  - cognitive_friction_notes: Structured observations regarding confusing prompts, UI lag, or awkward mappings;
  - musical_fitness_verdict: ACCEPTED | REJECTED | CONDITIONALLY_ACCEPTED;
  - uat_blockers_identified: Array of critical usability defects preventing adoption.


18. GOLDEN ACOUSTIC FIXTURE LIBRARY & BENCHMARK STEM MANAGEMENT

18.1 The Golden Fixture Concept
A `ValidationFixtureRecord` represents a curated, immutable, version-controlled audio stem, DI performance, or reference preset used as a standardized benchmark for validation.

Phase 1C.5h enforces the cardinal rule:
`NO FIXTURE OR FIXTURE FAMILY BECOMES UNIVERSAL GROUND TRUTH OUTSIDE ITS DECLARED VALIDATION SCOPE.`

18.2 The Eight Governed Fixture Classes
Phase 1C.5h establishes eight distinct fixture classes:
  1. DI Performance Fixtures: Clean, unamplified guitar direct-injection recordings captured with calibrated high-impedance (Hi-Z) DI boxes, representing varied playing techniques (palm muting, sweep picking, fingerstyle, funk strums, heavy downstrokes);
  2. Reference Tone Fixtures: Multi-track stems and isolated guitar tracks from acclaimed commercial recordings, representing gold-standard studio production tones;
  3. Approved Preset Fixtures: Known-good, human-designed AmpliTube 5 presets that have previously achieved commercial success and engineering approval;
  4. Rendered Platform Benchmark Fixtures: Audio files pre-rendered through verified physical amplifiers and official AT5 hardware profiles to test algorithmic parity;
  5. Synthetic Test Signal Fixtures: Mathematically pure test tones (sine sweeps 20Hz–20kHz, pink noise, dual-tone IMD signals, impulse clicks, square waves) to evaluate transfer functions, frequency response, and phase linearity;
  6. Multitrack Context Fixtures: Complete rhythm section stems (drums, bass, vocals) designed to evaluate guitar masking and mix clarity;
  7. Adversarial & Pathological Fixtures: Deliberately corrupted or extreme audio stems (signals clipped at +12dBFS, extreme 60Hz hum, DC offsets, high noise floor, impedance-mismatched piezos);
  8. Workflow & Prompt Fixtures: Standardized suites of natural language user prompts and tone requests designed to evaluate semantic reasoning and translation robustness.

18.3 Fixture Lifecycle Governance Diagram (ASCII)

+----------------------------------------------------------------------------------------------------+
|                                    FIXTURE LIFECYCLE GOVERNANCE                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [FIXTURE CREATION]                                                                              |
|    - Capture high-res audio (24-bit/48kHz or 96kHz) under strict calibration                       |
|    - Document instrument, pickups, strings, player, DI hardware, and date                          |
|         |                                                                                          |
|         v                                                                                          |
|    [CALIBRATION & INTEGRITY AUDIT]                                                                 |
|    - Verify RMS level, peak headroom, noise floor, absence of unintentional clipping               |
|    - Generate SHA-256 cryptographic digest of raw audio payload                                    |
|         |                                                                                          |
|         v                                                                                          |
|    [APPROVAL & VERSIONING]                                                                         |
|    - Formal approval by Master Sound Engineer                                                      |
|    - Assigned immutable Fixture ID (e.g. FIX-DI-HM-01-v2) and locked in Golden Library             |
|         |                                                                                          |
|         +---------------------------+---------------------------+                                  |
|         |                           |                           |                                  |
|         v                           v                           v                                  |
|    [ACTIVE IN TESTING]         [CALIBRATION DISPUTE]       [CONTAMINATION DETECTED]                |
|    - Used exclusively in       - Defect found in fixture   - Discovered that fixture was           |
|      validation harnesses      - Triggers re-audit and       leaked into upstream training         |
|                                  versioned supersession      or prompt tuning                      |
|         |                           |                           |                                  |
|         |                           v                           v                                  |
|         |                      [SUPERSEDED]               [INVALIDATED]                            |
|         |                      - Replaced by v3           - Immediate quarantine                   |
|         |                      - Triggers revalidation    - Mandates full revalidation             |
|         |                        of affected validations     of all prior PASS results             |
|         |                           |                           |                                  |
|         +---------------------------+---------------------------+                                  |
|                                     |                                                              |
|                                     v                                                              |
|                                [RETIRED]                                                           |
|                                - Preserved in immutable archive for audit history                  |
|                                - Forbidden for new validation intakes                              |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+

18.4 Contamination & Segregation Controls
To guarantee empirical integrity, Phase 1C.5h enforces strict segregation between validation fixtures and upstream AI models:
  - NO Golden Fixture audio stem or prompt may be used in upstream LLM training sets, prompt few-shot tuning, or heuristic calibration;
  - If a fixture is discovered to have leaked into upstream prompt design, it is immediately marked CONTAMINATED and INVALIDATED;
  - All prior validation outcomes that relied on the contaminated fixture are flagged for MANDATORY REVALIDATION.

18.5 The ValidationFixtureRecord Schema
  - fixture_id: Unique immutable UUID;
  - fixture_name: Human-readable standard title;
  - fixture_class: One of the 8 classes defined above;
  - version: Semantic version string (e.g. "v1.2");
  - payload_hash: SHA-256 digest of uncompressed audio data or text;
  - declared_applicability_scope: Specific gear families, genres, or test profiles;
  - provenance_metadata:
      - instrument_details: Guitar model, woods, pickup brand/model, string gauge;
      - capture_hardware: DI box model, preamp, AD converter, sample rate, bit depth;
      - recording_engineer: Identity of engineer who captured fixture;
      - capture_date: ISO 8601 UTC date;
  - calibration_spec: Reference input level (e.g. -18dBFS RMS = 0VU), nominal impedance;
  - contamination_status: UNCONTAMINATED_SEPARATED | SUSPECTED_LEAK | CONFIRMED_CONTAMINATED;
  - lifecycle_status [PHASE_1C5H_PROPOSED]: ACTIVE | SUPERSEDED | INVALIDATED | RETIRED;
  - superseding_fixture_id: Optional ID if superseded.


19. MULTI-DIMENSIONAL ACOUSTIC EVALUATION MODEL

19.1 The Failure of Scalar Audio Metrics
Traditional audio software testing often relies on scalar metrics like Signal-to-Noise Ratio (SNR), Mean Squared Error (MSE), or simple RMS delta.
In guitar tone engineering, scalar metrics fail catastrophically:
  - An output signal phase-inverted 180 degrees sounds identical to the human ear in isolation, but has 100% MSE difference from the original;
  - A tone with an aggressive, musical high-gain saturation profile may have a huge spectral divergence from a clean reference, but represent the exact intended sound engineering outcome;
  - A tone that perfectly matches an FFT curve can suffer from severe digital aliasing or intermodulation distortion that ruins musicality.

19.2 The Seven Orthogonal Acoustic Evaluation Dimensions
Phase 1C.5h evaluates audio across seven mutually orthogonal dimensions:

  1. Spectral Balance Dimension: Frequency distribution across sub-bass (20–60Hz), bass (60–250Hz), low-mids (250–500Hz), mid-range (500–2kHz), upper-mids (2–6kHz), and treble/air (6–20kHz);
  2. Dynamic Envelope Dimension: Transient attack speed, compression ratio under peak picking, sustain decay curve, and crest factor;
  3. Harmonic Texture Dimension: Total harmonic distortion (THD), second-order (warm/even) vs third-order (aggressive/odd) harmonic ratios, and intermodulation distortion (IMD);
  4. Spatial & Phase Coherence Dimension: Stereo field width, phase correlation between dual microphones, comb-filtering absence, and mono-compatibility;
  5. Temporal & Latency Dimension: Algorithmic processing delay, buffer latency, phase smearing, and transient response time;
  6. Playability & Dynamic Feel Dimension: Instrument cleanup on volume roll-off, touch sensitivity, pick velocity response, and natural acoustic bloom;
  7. Mix Context & Masking Dimension: Vocal frequency pocket preservation, kick/bass separation, cymbal harshness avoidance, and intelligible presence in full production.


20. REGRESSION DETECTION & DIFFERENTIAL AUDITING ARCHITECTURE

20.1 Tripartite Differential Comparison
Phase 1C.5h evaluates candidate migrations using a rigorous Tripartite Comparison:
  - Path A: Candidate Migration Output (PATH-SHADOW);
  - Path B: Legacy Production Output (PATH-PROD);
  - Path C: Golden Studio Reference / Human Benchmark (FIXTURE-REF).

Comparing candidate solely against legacy (Path A vs Path B) is flawed because legacy often contains known acoustic bugs, harshness, or unmusical heuristics.
Comparing candidate solely against golden reference (Path A vs Path C) is flawed because it ignores operational continuity and may mask subtle regressions in working production features.

Tripartite comparison allows Phase 1C.5h to distinguish between improvements, neutral differences, and genuine regressions.

20.2 The Four Regression Classification Categories
Every detected divergence between candidate output and baseline output MUST be classified into exactly one of four governed categories:

  1. INTENTIONAL ARCHITECTURAL CORRECTION [PHASE_1C5H_PROPOSED]
     - Definition: Candidate diverges from PATH-PROD, but the divergence fixes a documented legacy defect, removes unmusical harshness, or aligns with the 21 Principles of Sound Engineering Reasoning without degrading user expectations.
     - Gate 8 Impact: Does NOT block Gate 8. Documented as a verified architectural improvement.

  2. NEUTRAL DIVERGENCE [PHASE_1C5H_PROPOSED]
     - Definition: Candidate differs subtly from PATH-PROD (e.g. minor micro-dB shifts, harmless harmonic variation), but listening panels and UAT judge neither output to be superior or degraded.
     - Gate 8 Impact: Does NOT block Gate 8. Logged in audit trail.

  3. GENUINE REGRESSION [PHASE_1C5H_PROPOSED]
     - Definition: Candidate performs worse than PATH-PROD in a production-critical acoustic, functional, export, or operational dimension (e.g. lost low-end definition, introduced clipping, broken AT5 preset loading, 20% latency increase, audible aliasing).
     - Gate 8 Impact: CRITICAL BLOCKER. Invariant 5 applies: ANY unresolved material genuine regression within scope blocks Gate 8.

  4. UNRESOLVED DIVERGENCE [PHASE_1C5H_PROPOSED]
     - Definition: Candidate differs materially from PATH-PROD, but evidence is inconclusive as to whether the divergence is an improvement or a regression (e.g. listening panel is split 50/50, or metrics indicate a change whose musical impact is unknown).
     - Gate 8 Impact: BLOCKS Gate 8 until resolved by targeted retest or formal engineering trade-off review.

20.3 The RegressionAssessmentRecord Schema
  - regression_id: Unique UUID;
  - package_id: Reference to parent ValidationPackage;
  - comparison_target: Legacy PATH-PROD vs Candidate PATH-SHADOW;
  - divergence_detected: Boolean;
  - divergence_magnitude: Quantitative summary of differences;
  - classification:
      - INTENTIONAL_ARCHITECTURAL_CORRECTION
      - NEUTRAL_DIVERGENCE
      - GENUINE_REGRESSION
      - UNRESOLVED_DIVERGENCE;
  - materiality_score: HIGH | MEDIUM | LOW | NEGLIGIBLE;
  - affected_scope: Explicit gear IDs, parameter IDs, or genres affected;
  - regression_domain: ACOUSTIC | FUNCTIONAL | EXPORT | OPERATIONAL | PLAYABILITY;
  - detailed_justification: Engineering rationale for classification;
  - blocks_gate_8: Boolean (True if GENUINE_REGRESSION or UNRESOLVED_DIVERGENCE within scope).
"""

if __name__ == "__main__":
    print(f"Part 3 loaded, length: {len(PART3)} chars")
