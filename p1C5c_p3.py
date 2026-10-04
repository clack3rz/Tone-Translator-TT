#!/usr/bin/env python3
"""
p1C5c_p3.py: Sections 9 to 13
for TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1a.txt
Phase 1C.5c — Diagnosis & Causal Reasoning (Bounded Causal-Epistemic Correction)
"""

def get_p1C5c_p3():
    return '''================================================================================
SECTION 9 — LOCUS RESOLUTION VS MECHANISM RESOLUTION
================================================================================

9.1 THE INDEPENDENCE OF LOCUS AND MECHANISM
In professional audio engineering, locating where an acoustic or electrical feature enters
the signal chain is a fundamentally distinct cognitive task from determining the exact
physical or electronic mechanism responsible:
    LOCUS ISOLATION != MECHANISM RESOLUTION.

Real-World Engineering Disconnects:
  - An engineer inspecting a Dry DI stem can confirm with absolute certainty that a 3.8 kHz
    resonant peak enters upstream of the amplifier (Locus: Instrument Electrical isolated).
    However, without component-level test gear, the engineer cannot definitively determine
    whether the peak is caused by pickup coil self-resonance, volume pot resistive loading,
    or cable capacitance (Exact Mechanism Unresolved).
  - An engineer testing a physical speaker cabinet with dual-channel FFT can confirm that a deep
    notch at 650 Hz originates at the cabinet acoustic stage (Locus: Cabinet Acoustic isolated).
    However, the engineer cannot immediately determine whether the notch is caused by internal
    standing wave cancellation, baffle wood compliance, or dust-cap acoustic phase cancellation
    (Exact Mechanism Unresolved).
  - Conversely, an engineer may understand the precise physical mechanism of power-tube screen grid
    clipping, but lack the telemetry to prove whether dynamic compression in a recorded track is
    occurring at the power stage, in an unrecorded compressor pedal, or in a DAW bus limiter
    (Mechanism Understood, Locus Unresolved).

9.2 RESOLUTION STATES (BASELINE + EXTENSIBLE + NON-EXHAUSTIVE)
To avoid false precision and maintain operational honesty, Tone Translator recognizes
baseline conceptual resolution states:

  - `LOCUS_RESOLVED_MECHANISM_RESOLVED`:
    Both the signal chain boundary and the precise electro-acoustic process are corroborated
    by empirical evidence and necessary-prediction testing.
    Example: "Feature enters at Instrument Electrical stage; confirmed as pickup cable loading
    resonance via short-cable substitution test."

  - `LOCUS_RESOLVED_MECHANISM_UNRESOLVED`:
    Empirical evidence isolates the feature to a specific signal boundary, but multiple internal
    physical mechanisms remain viable and indistinguishable under current telemetry.
    Example: "Feature originates upstream of the amplifier in the Dry DI signal; whether it stems
    from pickup winding resonance, pot loading, or cable capacitance remains an unmeasured internal unknown."
    Architectural Action: Tone Translator bounds the locus, states the viable candidate mechanisms,
    and halts diagnosis without guessing.

  - `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL` (CORRECTION B2):
    A plausible physical mechanism is identified from general principles or user symptoms,
    but the signal locus cannot be verified due to missing stems or uncalibrated audio.
    Epistemic Rule Enforced: `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL` represents an unresolved
    causal workspace, NOT a diagnosis. Tone Translator is strictly forbidden from granting a
    `PROVISIONAL_DIAGNOSIS` in this state. Permissible outputs include: candidate hypothesis retained,
    multiple mechanisms remain viable, insufficient evidence for causal resolution, or discriminating
    evidence required.

9.3 FORBIDDEN FALSE SPECIFICITY
Tone Translator is strictly barred from guessing specific electronic component faults when
only locus isolation has been achieved. If telemetry proves only that a problem enters at the
instrument stage, the diagnosis must state that the instrument locus is resolved while the
internal mechanism remains an open unknown.


================================================================================
SECTION 10 — CAUSAL CONTRIBUTION REASONING (WITHOUT FAKE PRECISION)
================================================================================

10.1 REPUDIATION OF FABRICATED CAUSAL PERCENTAGES
A widespread defect in pseudo-scientific automation is assigning precise numerical percentages
to causal contributions (e.g. "Pickup loading contributes 64%, preamp clipping contributes 28%,
speaker beaming contributes 8%").
In real-world sound engineering:
    THERE IS NO CALIBRATED TRANSFER FUNCTION CAPABLE OF
    LINEARLY APPORTIONING MULTI-STAGE HARMONIC INTERACTION.

Why Percentages Are Prohibited:
  - Acoustic and non-linear electrical stages interact synergistically. A +3 dB upstream resonant
    peak does not produce a simple arithmetic addition of downstream distortion; it changes the
    entire dynamic clipping threshold and intermodulation profile of the amplifier.
  - Inventing percentage values deceives the user with false precision and fabricates evidence
    that does not exist in the DSP telemetry (violating the Absolute Non-Fabrication Rule).
  - Quantitative decomposition is permitted ONLY where a mathematically exact, calibrated,
    linear physical decomposition method exists for the specific phenomenon (e.g. two linear
    independent uncorrelated noise sources with known calibrated RMS levels). In all other cases,
    percentage attribution is strictly prohibited.

10.2 QUALITATIVE CONTRIBUTION TIERS (BASELINE + EXTENSIBLE + NON-EXHAUSTIVE)
Tone Translator evaluates and communicates causal contribution using structured qualitative tiers:

  - `DOMINANT`:
    The primary driving mechanism behind the observed defect. Eliminating or mitigating this
    mechanism would resolve the fundamental character of the acoustic problem.
    Evidential Requirement: Corroborated by high-directness evidence (locus isolation, substitution,
    or necessary prediction) showing that the defect largely tracks this mechanism.

  - `MATERIAL`:
    A substantial contributor that materially alters the severity, harmonic density, or spectral
    extent of the defect, but is not its sole origin.
    Example: Preamp clipping saturating and multiplying an upstream pickup resonance peak.

  - `SECONDARY`:
    A noticeable but subsidiary contributor whose presence colors or worsens the defect,
    but whose total removal would leave the primary acoustic fault largely recognizable.
    Example: Minor 120 Hz power supply ripple adding a slight background hum to an already
    severe 60 Hz single-coil pickup buzz.

  - `ENABLING`:
    A condition that creates the physical prerequisites for another mechanism to manifest,
    without directly generating the acoustic symptom itself.
    Example: Wide-open tone pot allowing high-frequency cable resonance to reach the input grid.

  - `PLAUSIBLE_UNRESOLVED`:
    A mechanism that is physically consistent with all case data and may contribute to the
    defect, but whose actual contribution cannot be isolated or partitioned with available telemetry.

  - `NOT_ESTABLISHED`:
    A condition known to be present in the rig (e.g. vintage ungrounded bridge), but whose
    causal link to the observed acoustic complaint has not been demonstrated by evidence.


================================================================================
SECTION 11 — CAUSAL SUFFICIENCY & EXPLANATORY COVERAGE
================================================================================

11.1 MULTIDIMENSIONAL EXPLANATORY COVERAGE ASSESSMENT (CORRECTION M2)
Identifying a real physical mechanism does not mean the entire engineering problem has been
explained. A fatal error is "premature diagnostic closure" — identifying one valid defect and
assuming all client complaints are thereby accounted for.

Tone Translator requires an explicit multidimensional Explanatory Coverage Assessment,
evaluating six distinct audit questions:
  1. Origin Explained?: Is the entry point and original physical source of the feature accounted for?
  2. Mechanism Explained?: Is the specific electro-acoustic or mechanical process understood?
  3. Severity Explained?: Does the mechanism account for the full measured magnitude, or only a fraction?
  4. Downstream Interaction Explained?: Are non-linear harmonics, clipping, or resonance multiplications tracked?
  5. User Perceptual Complaint Explained?: Does the explanation bridge the gap to what the listener reported?
  6. Material Observations Left Unexplained?: Are there unaddressed spectral peaks, notches, or noise bins?

11.2 DESCRIPTIVE EXPLANATORY SUMMARIES (CORRECTION M2)
Rather than forcing all diagnoses into a rigid single-scalar enum, Tone Translator characterizes
explanatory coverage across the multidimensional assessment using descriptive summaries:

  - `COMPLETE_EXPLANATION`:
    The diagnosed mechanism(s) fully and adequately account for all observed objective anomalies,
    measured deltas, downstream harmonic multiplications, and user-reported perceptual complaints.
    Example: A single-coil Stratocaster plugged into a high-gain amp with no gate; direct spectral
    inspection shows classic 60 Hz and odd-harmonic mains spikes matching single-coil pickup
    induction, with zero residual unaddressed noise bins.

  - `PARTIAL_ORIGIN_EXPLANATION`:
    The mechanism correctly explains where and how a signal feature originated, but does NOT
    alone explain why it is so severe or abrasive in the final output without downstream interaction.
    Example: A +3 dB pickup resonance at 3.8 kHz explains the spectral feature's entry into the rig,
    but does NOT explain the harsh +8 dB harmonic hash in the recorded track without accounting
    for downstream cascaded preamp clipping.

  - `PARTIAL_SEVERITY_EXPLANATION`:
    The mechanism explains downstream amplification, saturation, or resonance multiplication,
    but does not identify the upstream origin of the feature.

  - `SUBSIDIARY_EXPLANATION`:
    The mechanism explains a secondary or incidental anomaly, while the primary user complaint
    remains unaddressed.
    Example: Diagnosing a slight 0.5 dB room reflection notch at 200 Hz while the user's central
    complaint is severe 4 kHz pick-attack fizz.
    Architectural Rule: A subsidiary explanation must NEVER be presented as the primary diagnosis.


================================================================================
SECTION 12 — VALID EXCLUSION & HYPOTHESIS RETIREMENT
================================================================================

12.1 RETIREMENT CRITERIA IN CAUSAL DELIBERATION
During Phase 1C.5c deliberation, candidate hypotheses inherited from Phase 1C.5b are either
elevated to a diagnosis, retained as unresolved candidates, or formally retired.
A candidate hypothesis may be retired from the active causal set ONLY under four valid paths:

  1. Valid Exclusion Test (Principle 6 & FB-C3):
     - An empirical test disproves a necessary prediction of the hypothesis under verified sensitivity
       and controlled confounders (e.g. moving mic 1.5 inches off-axis produces zero change in a 4.2 kHz
       peak, validly eliminating on-axis dust-cap beaming as the primary cause).
  2. Direct Locus Disproof:
     - Inspection of clean multi-channel stems proves the feature is absent from the locus where the
       mechanism must operate (e.g. a feature absent from a pre-cabinet FX loop send cannot originate in the preamp).
  3. Evidential Supersession:
     - Direct, high-directness telemetry establishes a complete causal explanation that physically
       precludes the candidate mechanism.
  4. Scope Invalidation:
     - Clarified user intent confirms the phenomenon is an intentional artistic feature rather than a fault.

12.2 RETROSPECTIVE RETIREMENT AUDITABILITY (PRINCIPLE 20)
Retired hypotheses are NEVER silently deleted or purged from the record.
Every retired hypothesis must be preserved in the `RetiredHypothesisRegister` within the deliberation trace:
  - Documenting the exact hypothesis ID;
  - Specifying the retirement reason and the empirical test or evidence that justified it;
  - Ensuring an independent reviewer can inspect why an alternative explanation was set aside.


================================================================================
SECTION 13 — CONTRADICTION HANDLING & DIAGNOSIS UNDER CONFLICT
================================================================================

13.1 THE GOVERNING DISTINCTION: CONTRADICTION != CROSS-DOMAIN DISCREPANCY (CORRECTION M5)
A fatal error in automated acoustic triage is treating every mismatch between audio measurements
and user listening reports as an empirical contradiction.
Tone Translator enforces a foundational architectural distinction:
    CONTRADICTION != CROSS-DOMAIN DISCREPANCY.

  1. GENUINE EMPIRICAL CONTRADICTION:
     - Occurs when two evidence items within the SAME domain or physical boundary cannot
       simultaneously be true under the stated conditions.
     - Example: A calibrated in-line FFT meter measuring an audio file reports a -4 dB low-end cut,
       while an interface input meter analyzing the exact same audio stream reports a +6 dB boost.
       Both cannot simultaneously be true of the same electrical signal.
     - Action: Commits a load-bearing `ConflictRecord`; halts causal resolution until resolved.

  2. CROSS-DOMAIN DISCREPANCY:
     - Occurs when observations across DIFFERENT physical domains (e.g. recorded file domain vs
       playback listening room domain) appear contradictory but can both be simultaneously true.
     - Example: The recorded audio file objectively possesses attenuated bass (-4.2 dB below 180 Hz),
       yet the user reports "overwhelming boomy mud that shakes my desk."
     - Possible Cross-Domain Explanation (Correction B6): Both statements may reflect physical reality.
       The recorded audio track may be bass-light while playback monitor coloration, boundary coupling,
       or room acoustic behavior causes perceived low-frequency reinforcement at the listening position.
       Tone Translator treats this as a plausible hypothesis to guide verification (e.g. headphone cross-check),
       never as proven room acoustic telemetry without calibrated acoustic measurement.
     - Action: Recognizes distinct domains; prevents misattributing acoustic playback defects
       to the recorded audio track, while avoiding false "contradiction" panics.

13.2 LOAD-BEARING CONTRADICTIONS BLOCK CAUSAL RESOLUTION
When conflicting evidence impacts a load-bearing premise of the primary causal explanation:
  - Tone Translator is STRICTLY FORBIDDEN from declaring a resolved causal diagnosis.
  - The active reasoning session must transition to:
    `CONTRADICTORY_EVIDENCE_BLOCKS_DIAGNOSIS` or `DISCRIMINATING_EVIDENCE_REQUESTED`.
  - The deliberation record must clearly expose the contradictory evidence to the user,
    explain why the conflict prevents a defensible diagnosis, and specify the discriminating test
    required to resolve the contradiction.'''

if __name__ == "__main__":
    print(get_p1C5c_p3()[:300])
