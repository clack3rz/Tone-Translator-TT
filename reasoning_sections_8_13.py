#!/usr/bin/env python3
"""
Sections 8 to 13 for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.1.txt
"""

def get_sections_8_13():
    return '''================================================================================
SECTION 8 — EVIDENCE-TO-OBSERVATION BOUNDARY
================================================================================

8.1 EPISTEMIC SEPARATION: RAW EVIDENCE VS FACTUAL OBSERVATION
The first critical boundary in the reasoning lifecycle separates raw incoming
case evidence from factual observations:
    RAW CASE EVIDENCE (What was supplied, recorded, or captured)
    != FACTUAL OBSERVATION (What is objectively detectable or measured)

Case evidence arrives as heterogeneous, unvetted data:
  - Digital audio files (WAV, FLAC, AIFF) of uncertain calibration and gain staging.
  - User verbal text ("it sounds super muddy and hollow on palm mutes").
  - Gear lists ("Gibson Les Paul into Marshall JCM800 into 4x12").
  - Target reference audio tracks ("Master of Puppets rhythm guitar stem").

The `ObservationEngine` ingests this raw evidence and derives an `ObservationRecord`.
The invariant governing this transition is:
    AN OBSERVATION MUST BE PHENOMENOLOGICAL AND DESCRIPTIVE.
    AN OBSERVATION MUST NEVER BE DIAGNOSTIC OR CAUSAL.

8.2 THE MULTI-MODAL EVIDENCE DIGESTION RULES
To avoid bias and premature conclusions, the ingestion process adheres to four
strict rules:
  1. Multi-Modal Segregation: Objective measurements (e.g., FFT spectra, crest
     factor, envelope decay times) are maintained in distinct data structures
     from subjective user descriptors. Subjective complaints are treated as
     perceptual symptom reports, not physical facts.
  2. Lineage Accounting: Every measurement records its capture lineage. An FFT
     spectrum computed from an uncalibrated smartphone microphone recording in
     an untreated room is marked `UNCALIBRATED_CONSUMER_CAPTURE`, restricting its
     evidentiary weight compared to a direct DAW bounce.
  3. The Negative Evidence Rule (Principle 3): The absence of an observation in a
     domain (e.g., no data on pickup height or room acoustics) is formally
     logged in `unobserved_domains`. The engine is strictly barred from assuming
     that an unobserved parameter is optimal or absent.
  4. Context Isolation (Principle 7): Genre, artist names, and production eras
     are placed in `contextual_priors`. They do not constitute observations of
     the current audio signal.

8.3 CONTRAST TABLE: EVIDENCE VS OBSERVATION VS PREMATURE DIAGNOSIS
+-----------------------+-------------------------+---------------------------+
| Raw Evidence Input    | Factual Observation     | Forbidden Premature       |
|                       | (ObservationRecord)     | Diagnosis (LEAKAGE)       |
+-----------------------+-------------------------+---------------------------+
| User text: "The palm  | "During low-register    | "Amp low-cut filter is    |
| mutes sound completely| palm-muted passages,    | set too low; bass knob is |
| flubby and boomy."    | 120-220 Hz energy is    | too high."                |
|                       | +7 dB relative to lead; | [FORBIDDEN: Causal        |
|                       | decay time is 380 ms."  | attribution in observation|
+-----------------------+-------------------------+---------------------------+
| Dual-mic capture WAV  | "Comb filtering notch   | "The SM57 and R121 are    |
| file with 2 channels  | at 1.8 kHz and 3.6 kHz; | out of phase; invert phase|
| summed to mono.       | hollow midrange balance.| on mic 2."                |
|                       | High-frequency phase    | [FORBIDDEN: Assumes phase |
|                       | cancellation observed." | flip is the sole fix]     |
+-----------------------+-------------------------+---------------------------+
| High-gain guitar track| "Broadband high-freq    | "Cheap single-coil pickups|
| idle audio buffer.    | noise floor at -42 dBFS | or bad patch cable."      |
|                       | concentrated around     | [FORBIDDEN: Physical root |
|                       | 6 kHz - 12 kHz."        | cause unproven]           |
+-----------------------+-------------------------+---------------------------+


================================================================================
SECTION 9 — OBSERVATION-TO-HYPOTHESIS BOUNDARY
================================================================================

9.1 DECOUPLING PHENOMENON FROM EXPLANATION
The second boundary separates what is observed from why it occurred:
    OBSERVATION (The phenomenon: "Midrange notch at 1.8 kHz")
    != HYPOTHESIS (The mechanism: "Acoustic arrival time offset of 0.28 ms
                   between two capsules transducing the same acoustic wave")

In legacy systems, symptoms directly triggered hardcoded fixes:
    "fizzy" --> "reduce 4 kHz on post-EQ"
    "flubby" --> "turn down bass control"

Phase 1C.5a enforces Principle 4 (A symptom does not identify its cause) by
requiring that every observation family maps to MULTIPLE candidate physical,
electrical, or acoustical hypotheses.

9.2 GROUNDING IN GOVERNED KNOWLEDGE (PHASE 1C.4)
Hypotheses are not generated as arbitrary creative guesses. Every `HypothesisRecord`
must cite one or more governed `KnowledgeClaim` records from the Phase 1C.4
Knowledge Base (e.g., Claims regarding transformer core saturation, dynamic
pickup loading, room boundary reflection, or psychoacoustic masking).

However, governed knowledge does NOT prove the hypothesis is true for this case.
It merely proves that the proposed physical mechanism is a scientifically
established phenomenon that COULD produce the observed effect.

9.3 THE FOUR-PHASE HYPOTHESIS GENERATION PIPELINE
When an observation is processed:
  1. Mechanism Identification: Identify all physical/electrical stages in the
     sound generation chain capable of altering this domain (Source Instrument,
     Pre-Clipping, Clipping Stage, Power Amp, Transducer, Room, Mic, Console).
  2. Multi-Hypothesis Seeding: Formulate distinct hypotheses for each viable
     locus (e.g., Hypothesis 1 at Pre-Gain; Hypothesis 2 at Speaker; Hypothesis 3
     at Mic).
  3. Grounding Verification: Verify that each hypothesis references an active,
     non-falsified Phase 1C.4 KnowledgeClaim.
  4. Epistemic Initialization: Set initial epistemic state to `ACTIVE_CREDIBLE`
     prior to evidential evaluation.


================================================================================
SECTION 10 — HYPOTHESIS MANAGEMENT
================================================================================

10.1 THE HYPOTHESIS WORKSPACE
The `HypothesisWorkspaceRecord` manages the active pool of hypotheses. It is
fundamentally an n-ary concurrent workspace where multiple explanations for
the same phenomenon co-exist.

10.2 THE NON-SCALAR BALANCE OF EVIDENCE (NO SCOREBOARD)
In strict compliance with Section 8 of the project brief ("DO NOT TURN REASONING
INTO A SCOREBOARD"), the reasoning engine is prohibited from calculating pseudo-
precise scalar probabilities (e.g., "Hypothesis A = 73.4%").

Instead, hypothesis evaluation is based on a Qualitative Balance of Evidence:
  1. Direct Explanatory Power: Does the mechanism explain ALL aspects of the
     observation (e.g., both the spectral peak AND the dynamic envelope behavior),
     or only an isolated slice?
  2. Absence of Direct Contradiction: Are there observations in the record that
     actively falsify this mechanism?
  3. Physical Chain Plausibility: Given known elements in the rig manifest, is
     this mechanism physically operative?
  4. Parsimony: Does this mechanism explain multiple disparate observations
     simultaneously (Occam's engineering razor)?

10.3 HYPOTHESIS LIFECYCLE STATES
A hypothesis transitions through six formal epistemic states:
  - `ACTIVE_STRONG`: Supported by multiple independent observations with zero
    contradictions.
  - `ACTIVE_CREDIBLE`: Mechanistically sound and consistent with observations, but
    lacking definitive discriminating proof.
  - `ACTIVE_MARGINAL`: Accounts for some observations but exhibits mild tension
    with others.
  - `WEAKENED_BY_CONTRADICTION`: Observed phenomena directly conflict with the
    necessary consequences of this mechanism.
  - `FALSIFIED_AND_RETIRED`: Disproved by definitive evidence or diagnostic test.
    Preserved in history with `falsification_reasoning`.
  - `UNRESOLVED_DUE_TO_DATA_LIMITATION`: Credible, but missing evidence prevents
    testing. Preserved into the decision record.

10.4 RETIRING HYPOTHESES WITH AUDITABLE RATIONALE
A hypothesis CANNOT be silently pruned or deleted. If an engineer or the AI
concludes that a hypothesis is invalid, a `contradicting_observations` link
with explicit `falsification_reasoning` must be recorded. Downstream reviewers
must be able to inspect why an explanation was dismissed.


================================================================================
SECTION 11 — EVIDENCE DISCRIMINATION & ADDITIONAL EVIDENCE
================================================================================

11.1 AMBIGUITY RECOGNITION (PRINCIPLE 21)
A core mark of professional engineering competence is recognizing when
available evidence is insufficient to distinguish between competing causes:
    "REASON -> RECOGNISE AMBIGUITY -> SEEK DISCRIMINATING EVIDENCE ->
     UPDATE DIAGNOSIS -> INTERVENE"
    RATHER THAN:
    "GUESS -> TWEAK -> GUESS AGAIN"

When two or more hypotheses remain `ACTIVE_CREDIBLE` and point to conflicting
interventions, jumping directly to an intervention is a professional failure.

11.2 DISCRIMINATING EVIDENCE REQUEST RECORD
When ambiguity is detected, the engine emits a `DiscriminatingEvidenceRequestRecord`.
This contract specifies:
  - The exact competing hypotheses under dispute.
  - Why the existing evidence cannot resolve them.
  - A concrete, targeted diagnostic action (e.g., soloing one mic, capturing a
    dry DI signal, bypassing an overdrive pedal, or recording a 1-second pick scrape).
  - The precise falsification criterion: what result will confirm Hypothesis A vs B.

11.3 LIFECYCLE ACTION: PAUSE VS BOUNDED DISJUNCTION
The engine evaluates the operational context to determine whether to PAUSE:
  - In an interactive session: Transition to `DISCRIMINATING_EVIDENCE_SEEKING`
    and pause execution, presenting the diagnostic request to the user.
  - In an automated or batch run: If additional evidence cannot be obtained, the
    engine does NOT guess. It transitions to `PROCEED_WITH_BOUNDED_DISJUNCTION`,
    propagating the ambiguity into the `CausalDiagnosisRecord` and designing an
    intervention that remains safe or reversible under both hypotheses.


================================================================================
SECTION 12 — CAUSAL DIAGNOSIS
================================================================================

12.1 CAUSAL SYNTHESIS WITHOUT FALSE PRECISION
The `CausalDiagnosisRecord` represents the culmination of the diagnostic phase.
It synthesizes the validated findings of the `HypothesisWorkspaceRecord` into a
coherent structural diagnosis.

The diagnosis is explicitly classified into one of three structural types:
  1. `SINGLE_ISOLATED_CAUSE`: A single causal mechanism is conclusively isolated
     by unambiguous evidence (e.g., a massive 2 ms time delay between two mics).
  2. `PRIMARY_AND_CONTRIBUTING_FACTORS`: A dominant causal mechanism is identified,
     interacting with secondary aggravating factors (e.g., excessive low-frequency
     pickup output overloading an already-sagging tube rectifier).
  3. `DISJUNCTIVE_COMPETING_CAUSES`: Evidence is insufficient to eliminate all
     rivals; the diagnosis formally preserves the disjunction (e.g., "Either
     transducer cone breakup above 4 kHz OR asymmetric clipping in preamp stage 2").

12.2 STRUCTURAL BOUNDS: WHAT THIS DIAGNOSIS DOES NOT CLAIM
To prevent diagnostic over-reach (Principle 5 and 15), every `CausalDiagnosisRecord`
includes a mandatory `epistemic_bounds_and_uncertainty` section.
This section explicitly lists:
  - `unverified_assumptions`: Latent parameters assumed based on typical rig
    behavior but not directly measured.
  - `what_this_diagnosis_does_not_claim`: Explicit statements preventing false
    extrapolation (e.g., "This diagnosis attributes the harshness to microphone
    axis alignment; it does NOT claim the speaker driver itself is defective").


================================================================================
SECTION 13 — ENGINEERING REQUIREMENT FORMATION
================================================================================

13.1 THE BRIDGE FROM DIAGNOSIS TO SOLUTION
An engineering diagnosis explains what is wrong. An engineering requirement
specifies what must be achieved to fix it.
    CAUSAL DIAGNOSIS ("Why it happens")
    + ENGINEERING INTENT ("What we want musically")
    --> ENGINEERING REQUIREMENT ("What physical transformation must occur")

A common architectural flaw in tone systems is jumping directly from diagnosis
to a specific piece of equipment (e.g., "The low end is flubby, therefore add an
Ibanez TS9 pedal").
Phase 1C.5a inserts `EngineeringRequirementRecord` as an abstract, gear-agnostic
firewall.

13.2 ANATOMY OF AN ENGINEERING REQUIREMENT
The `EngineeringRequirementRecord` defines:
  1. Causal Target Stage: Where in the signal flow the correction must occur
     (e.g., `PRE_CLIPPING_INPUT_CONDITIONING`).
  2. Functional Objective: A clear statement of the required acoustic/electrical
     transformation (e.g., "Attenuate fundamental bass energy below 130 Hz by
     4-6 dB prior to the first nonlinear saturation stage").
  3. Acoustic Transfer Requirements: Frequency bands, dynamic dependencies, and
     magnitude envelopes.
  4. Musical Intent Preservation Boundary: Guardrails derived from Engineering
     Intent that must NOT be violated (e.g., "Must preserve heavy punch between
     140 Hz and 200 Hz; must not introduce phase ringing that dulls palm-mute attack").
'''

if __name__ == "__main__":
    print(get_sections_8_13()[:300])
