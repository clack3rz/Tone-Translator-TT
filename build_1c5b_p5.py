#!/usr/bin/env python3
"""
Sections 18 to 21 for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
"""

def get_sections_18_21():
    return '''================================================================================
SECTION 18 — NUMERICAL EVIDENCE & LINEAGE GOVERNANCE
================================================================================

18.1 THE NUMERICAL LINEAGE INVARIANT (PRINCIPLE 15 & CORRECTION C3)
In strict accordance with Phase 1C.5a v0.3c, Tone Translator enforces the fundamental law:
    NUMERICAL PRECISION REQUIRES TRACEABLE LINEAGE APPROPRIATE
    TO WHAT THE NUMBER CLAIMS TO REPRESENT.

A number appearing in the sound engineering reasoning chain is NEVER a detached scalar.
Every quantity must possess an explicit origin, an understood tolerance, and a legitimate
functional role.

The Anti-False-Precision Rule:
  - TT is strictly forbidden from generating unearned decimal places (e.g. reporting
    "center frequency 4218.73 Hz" when derived from a 1024-point FFT with 43 Hz bin widths).
  - TT is strictly forbidden from presenting a provisional test parameter, an illustrative
    demonstration value, or a platform-specific knob integer as a discovered universal physical law.

18.2 THE NINE LEGITIMATE NUMERICAL LINEAGE CATEGORIES
Every numerical value recorded in `CaseEvidenceAssessmentRecord`, `ObservationRecord`,
or `HypothesisWorkspaceRecord` must be tagged with one of nine lineage origins:

  1. MEASURED VALUES (`MEASURED_VALUE`):
     - Empirical quantities extracted via defined DSP or physical test procedures.
     - Lineage Requirement: Algorithm name, FFT window size, sample rate, calibration status.
     - Example: "+6.2 dB peak at 4.2 kHz (Method: 4096-point FFT, Hanning window, 48 kHz)".
  2. USER CONSTRAINTS (`USER_CONSTRAINT`):
     - Hard numerical limits or target specifications set directly by the user.
     - Lineage Requirement: User session prompt citation, verbatim text.
     - Example: "Max allowable latency: 5.0 ms (User interface specification)".
  3. GOVERNED KNOWLEDGE (`GOVERNED_KNOWLEDGE`):
     - Canonical operational limits, physical constants, or standard acoustic frequencies from 1C.4.
     - Lineage Requirement: Phase 1C.4 KnowledgeClaim ID or CausalModel ID.
     - Example: "Guitar low-E fundamental frequency: 82.4 Hz (Standard tuning 440 Hz reference)".
  4. PLATFORM PARAMETERS (`PLATFORM_PARAMETER`):
     - Exact hardware or software parameter ranges, discrete step counts, or unit scales.
     - Lineage Requirement: Platform hardware/software profile identifier.
     - Example: "Gain knob range: 0.0 to 10.0 in 0.1 increments (Platform schema definition)".
  5. ENGINEERING DESIGN TARGETS (`DESIGN_TARGET`):
     - Normative mathematical targets justified by engineering intent and mix conventions.
     - Lineage Requirement: Intent tier reference, genre production standard justification.
     - Example: "Crest factor target: 8.0-10.0 dB for modern metal rhythm punch".
  6. CONTROLLED CALIBRATIONS (`CONTROLLED_CALIBRATION`):
     - Reference electrical or acoustic values established during bench calibration.
     - Lineage Requirement: Test equipment reference, calibration date, zero reference (e.g. 0 dBu = 0.775 VRMS).
     - Example: "Converter line input clipping ceiling: +18.0 dBu = 0 dBFS".
  7. PROVISIONAL TEST PARAMETERS (`PROVISIONAL_TEST_PARAMETER`):
     - Reversible, temporary numerical values chosen solely to excite a circuit or isolate a variable.
     - Lineage Requirement: Discriminating test protocol ID, explicit test rationale.
     - Example: "Volume knob rolled back to 7.0/10 solely to test pickup output saturation".
  8. DERIVED VALUES (`DERIVED_VALUE`):
     - Mathematically calculated quantities from other validated numerical lineage values.
     - Lineage Requirement: Mathematical formula and pointers to all parent lineage inputs.
     - Example: "Calculated inter-mic distance: 4.8 inches (Derived from 0.36 ms delta-t at 1125 ft/s)".
  9. ILLUSTRATIVE VALUES (`ILLUSTRATIVE_VALUE`):
     - Values used in worked architectural scenarios or educational explanations.
     - Lineage Requirement: Explicit label that the value is an illustrative example only.
     - Example: "4.2 kHz peak in Scenario B is an illustrative architectural demonstration".

18.3 CATEGORY CONFUSION PROHIBITIONS
Tone Translator strictly bars the following category conflations:
  - Measured Value != Engineering Target: An elevated 120 Hz bump is a measured fact;
    it is NOT automatically an engineering target that must be preserved or eradicated.
  - Platform Parameter != Physical Constant: A digital modeler's "Mid: 6.5" is an arbitrary
    potentiometer law; it is NOT an acoustic physical quantity.
  - Derived Value != Measured Fact: A calculated phase cancellation notch is an analytical
    prediction; it remains unconfirmed until verified by empirical measurement.


================================================================================
SECTION 19 — QUALITATIVE UNCERTAINTY REPRESENTATION
================================================================================

19.1 REPUDIATION OF FALSE SCALAR PROBABILITIES (PRINCIPLE 15)
Principle 15 establishes:
    "UNCERTAINTY SURVIVES DECISION; REJECT FALSE PRECISION."

A pervasive flaw in modern AI systems is the generation of synthetic, pseudo-precise
probability scores (e.g. "Hypothesis A has 83.4% probability; Hypothesis B has 16.6%").
In professional sound engineering:
  - There is no calibrated frequentist or Bayesian prior database covering all guitar,
    tube, pickup, speaker, and room permutations.
  - Presenting a fabricated probability score deceives the user and creates an illusion
    of mathematical rigor where subjective and physical uncertainty exists.

Scalar Confidence Invariant:
Tone Translator permanently repudiates uncalibrated scalar probabilities.
Hypothesis plausibility and case certainty must be articulated using structured,
qualitatively bounded epistemic categories.

19.2 THE SIX QUALITATIVE UNCERTAINTY CATEGORIES
Uncertainty within `HypothesisWorkspaceRecord` is structured across six explicit conditions:

  1. HIGH CERTAINTY (EMPIRICALLY VERIFIED) (`HIGH_CERTAINTY_EMPIRICALLY_VERIFIED`):
     - The physical phenomenon is directly measured with high-precision DSP under controlled
       conditions, and its locus is isolated by a decisive discriminating test (e.g. DI vs Amp).
  2. PROVISIONALLY BOUNDED (PLAUSIBLE) (`PROVISIONALLY_BOUNDED_PLAUSIBLE`):
     - Mechanistically coherent and supported by available telemetry, but non-critical internal
       circuit states (e.g. exact bias voltage) remain unmeasured.
  3. MULTI-MECHANISM UNCERTAINTY (`MULTI_MECHANISM_UNCERTAINTY`):
     - Multiple competing mechanisms (e.g. speaker beaming vs tone-stack setting) are equally
       defensible given current evidence; requires discriminating test or robust dual remediation.
  4. MEASUREMENT-LIMITED UNCERTAINTY (`MEASUREMENT_LIMITED_UNCERTAINTY`):
     - Available audio is uncalibrated, bandwidth-limited, lossy (MP3/AAC), or contaminated by room
       reverberation, preventing fine spectral or transient discrimination.
  5. UNRESOLVED CONFLICT UNCERTAINTY (`UNRESOLVED_CONFLICT_UNCERTAINTY`):
     - Objective DSP measurement directly contradicts subjective user perception or two captures
       yield incompatible data; root cause of contradiction remains under investigation.
  6. KNOWLEDGE-CONTESTED UNCERTAINTY (`KNOWLEDGE_CONTESTED_UNCERTAINTY`):
     - The physical mechanism involves an area of active electro-acoustic controversy documented
       in a Phase 1C.4 ConflictRecord (e.g. audible influence of power cable dielectric absorption).

19.3 THE RESIDUAL UNCERTAINTY DOSSIER
Every hypothesis workspace concludes with an explicit `ResidualUncertaintyDossier`:
  - Cataloging all unobserved variables in the signal path.
  - Documenting active competing hypotheses that could not be decisively ruled out.
  - Specifying the operational boundaries within which the current assessment holds.
  - Ensuring downstream phases (Diagnosis in 1C.5c, Interventions in 1C.5d) do not overstep
    the empirical limits of the case.


================================================================================
SECTION 20 — PARTIAL, AMBIGUOUS & INSUFFICIENT EVIDENCE BEHAVIOUR
================================================================================

20.1 THE EVIDENCE TRIAGE TAXONOMY
Real-world client sessions frequently provide imperfect inputs. Tone Translator
responds with calibrated behavioral strategies:

+----------------------------+----------------------------------+--------------------------------------+
| Evidence Intake State      | System Epistemic Action          | Lifecycle State Transition           |
+----------------------------+----------------------------------+--------------------------------------+
| Audio Missing or Corrupted | HALT reasoning immediately;      | INSUFFICIENT_EVIDENCE_ABSTAINED      |
|                            | refuse causal speculation.       |                                      |
+----------------------------+----------------------------------+--------------------------------------+
| Verbal Only (No Audio,     | Formulate broad genre baseline;  | INTENT_CLARIFICATION_REQUIRED or     |
| Minimal Rig Data)          | request audio capture or rig info| PROCEED_UNDER_BOUNDED_UNCERTAINTY    |
+----------------------------+----------------------------------+--------------------------------------+
| Single Processed Capture   | Formulate candidate hypotheses   | HYPOTHESES_UNDER_EVALUATION          |
| (No DI, Unknown Rig)       | spanning all potential loci;     | (with high locus uncertainty)        |
|                            | propose low-friction DI test.    |                                      |
+----------------------------+----------------------------------+--------------------------------------+
| Processed Capture + DI     | Isolate instrument from amp;     | HYPOTHESES_UNDER_EVALUATION          |
| (Full Rig Manifest)        | eliminate instrument loci;       | (high locus precision)               |
|                            | narrow hypotheses to amp/cab/mic.|                                      |
+----------------------------+----------------------------------+--------------------------------------+
| Reference Audio +          | Perform differential FFT and     | HYPOTHESES_UNDER_EVALUATION          |
| User Capture Pair          | transient analysis; ground both  | (differential empirical precision)   |
|                            | in explicit comparative delta.   |                                      |
+----------------------------+----------------------------------+--------------------------------------+

20.2 BOUNDED PROGRESSION WITHOUT COMPULSIVE STALLING
A major hazard in AI engineering is "paralysis by analysis" — demanding endless
clarifications or laboratory test files before giving the musician a working tone.
Tone Translator balances rigor with utility:
  - If the task is establishing a creative baseline (e.g. building a standard rock tone),
    TT proceeds under bounded uncertainty, applying time-tested, solution-neutral engineering
    principles (e.g. balancing 200 Hz mud, clearing 3 kHz mask space, controlling dynamic peaks).
  - If the task is troubleshooting an explicit electro-acoustic defect (e.g. severe high-frequency
    buzzing, phase cancellation, or extreme boomy flub), TT pauses and requests targeted
    discriminating evidence, because blind adjustments risk compounding the acoustic defect.

20.3 GRACEFUL DEGRADATION UNDER DECLINED EVIDENCE
When a player declines a discriminating test (e.g. "I don't have a DI box, just fix the buzz"):
  - TT transitions lifecycle to `EVIDENCE_DECLINED`.
  - TT logs that signal locus discrimination between instrument and amplifier is unachievable.
  - Downstream intervention selection (Phase 1C.5d) is constrained to non-destructive,
    reversible modifications (e.g. using a downward expander / noise gate or switchable notch
    filter) rather than permanent radical circuit redesign.


================================================================================
SECTION 21 — HANDOFF BOUNDARY TO PHASE 1C.5c
================================================================================

21.1 THE 1C.5b / 1C.5c REASONING JURISDICTION
To maintain architectural modularity and prevent premature conclusions, Phase 1C.5b
establishes a clean, inviolable handoff boundary to Phase 1C.5c:

Phase 1C.5b OWNS & DELIVERS:
  1. `EngineeringIntentRecord`: Validated user goals, constraints, and intent specificity tier.
  2. `CaseEvidenceAssessmentRecord`: Catalog of multi-modal evidence, quality ratings,
     calibration limits, and signal locus tags.
  3. `ObservationRecord`: Factual, non-causal observations and negative observations with
     explicit detection limits.
  4. `PhenomenologicalInterpretationBlock`: Perceptual characterizations of observations,
     completely devoid of equipment blame or circuit fault diagnosis.
  5. `HypothesisWorkspaceRecord`: Formulated candidate mechanisms, each detailing signal locus,
     supporting/contradicting evidence, explicit assumptions, and predicted consequences.
  6. `DiscriminatingEvidenceRequestRecord`: Executed or pending discriminating test protocols.

Phase 1C.5c EXCLUSIVELY OWNS (STRICTLY PROHIBITED IN 1C.5b):
  1. Causal Diagnosis Resolution (Stage 07):
     - Selecting the single primary cause when evidence permits.
     - Apportioning multi-factor causal attribution (e.g. 70% mic placement, 30% cab resonance).
     - Declaring final causal diagnosis records (`CausalDiagnosisRecord`).
     - Establishing formal diagnostic thresholds for causal certainty.
  2. Residual Causal Dossier Finalization:
     - Adjudicating between competing diagnoses when discriminating evidence is unavailable.

Phase 1C.5d EXCLUSIVELY OWNS (STRICTLY PROHIBITED IN 1C.5b):
  1. Solution-Neutral Engineering Requirements (Stage 08).
  2. Candidate Intervention Generation across distinct signal loci (Stage 09).
  3. Constraint & Trade-off Qualitative Evaluation (Stage 10).
  4. Engineering Decision Sealing (Stage 11).

21.2 THE STOP-AT-HYPOTHESES MANDATE
In all worked examples, scenarios, and production workflows belonging to Phase 1C.5b:
    THE REASONING ENGINE MUST HALT AT THE HYPOTHESIS WORKSPACE
    OR THE DISCRIMINATING EVIDENCE REQUEST.

It is an explicit constitutional failure for Phase 1C.5b to declare:
  - "The diagnosis is confirmed as X."
  - "The primary cause is the preamp tube."
  - "Therefore, the required intervention is to cut 4 kHz by 3 dB."
  - "We should insert an overdrive pedal here."
Such statements violate the handoff boundary and pre-empt Phase 1C.5c and 1C.5d.'''

if __name__ == "__main__":
    print(get_sections_18_21()[:300])
