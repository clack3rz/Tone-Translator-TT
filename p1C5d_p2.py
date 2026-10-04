#!/usr/bin/env python3
"""
p1C5d_p2.py: Sections 5 to 8 for TT_Engineering_Intervention_Alternatives_and_Tradeoff_Reasoning_v0.1a.txt
Phase 1C.5d — Intervention, Alternatives & Trade-Off Reasoning
"""

def get_p1C5d_p2():
    return '''===============================================================================
SECTION 5 — CORE ARCHITECTURAL AXIOMS & GOVERNING PRINCIPLES
===============================================================================

5.1 AXIOM 1: DIAGNOSIS BEFORE INTERVENTION
"NO INTERVENTION MAY BE SELECTED WITHOUT A SUFFICIENTLY RESOLVED OR EXPLICITLY BOUNDED CAUSAL DIAGNOSIS."

Sound engineering is not the application of arbitrary processing routines to raw audio;
it is the purposeful modification of an electro-acoustic system based on an accurate understanding
of why that system is behaving as it is. Selecting an intervention without causal diagnosis
violates Constitutional Principle 10 ("Intervention Selection Follows Diagnosis").

If the upstream causal handoff from Phase 1C.5c does not satisfy the qualification criteria
set forth in Section 4, the reasoning engine must halt immediately. Tone Translator is strictly
forbidden from repairing diagnostic uncertainty by inventing certainty or pretending that the
most likely hypothesis is an established fact. Where causality is unresolved, seek discriminating
evidence (Principle 21); do not gamble with intervention.

5.2 AXIOM 2: REQUIREMENT BEFORE INTERVENTION
"DO NOT CHOOSE A PROCESSOR, GEAR ITEM, PARAMETER, OR PHYSICAL ACTION BEFORE DEFINING
WHAT ENGINEERING CHANGE IS REQUIRED."

In amateur practice, engineers frequently jump directly from an observation to a specific tool:
"I hear harshness, so I will reach for an equalizer" or "The solo lacks bite, so I will switch
on an overdrive pedal." Professional sound engineering interposes a critical intermediate discipline:
the formulation of an explicit, solution-neutral Engineering Requirement in Stage 09.

The cognitive sequence is invariant:
    EARNED DIAGNOSIS → ENGINEERING REQUIREMENT → ALTERNATIVE GENERATION → SELECTION

Only after the AI Sound Engineer has articulated precisely *what* physical, acoustic, dynamic,
or spectral transformation is needed can it rationally evaluate *how* that transformation
should be achieved across distinct loci in Stage 10 and deliberated in Stage 11.

5.3 AXIOM 3: THE SOLUTION-NEUTRAL REQUIREMENT PRINCIPLE
"ENGINEERING REQUIREMENTS MUST DESCRIBE THE PHYSICAL, ELECTRICAL, ACOUSTIC, DYNAMIC,
SPECTRAL, OR TEMPORAL CHANGE REQUIRED, NEVER THE SPECIFIC IMPLEMENTATION."

An Engineering Requirement must state the objective of the intervention in domain-agnostic physical
and musical terms. It must never prematurely dictate the tool, brand, circuit, or knob.

Examples of Invalid vs Valid Requirements:
  - INVALID (Tool-Prejudiced): "Add a 4.5 kHz notch filter with a Q of 4.0."
  - VALID (Solution-Neutral): "Attenuate excessive 4.0-5.0 kHz resonant energy originating from
    on-axis acoustic capture, while preserving pick attack transient clarity and upper-register presence."
  - INVALID (Tool-Prejudiced): "Lower amplifier preamp gain to 3.5."
  - VALID (Solution-Neutral): "Reduce downstream non-linear intermodulation distortion during complex
    chords, while preserving single-note sustain and dynamic compression response."
  - INVALID (Tool-Prejudiced): "Engage an 80 Hz high-pass filter on the channel strip."
  - VALID (Solution-Neutral): "Mitigate excessive sub-acoustic energy below 80 Hz driving the power stage
    into blocking distortion, without thinning the fundamental weight of low-register riffs."

5.4 AXIOM 4: CASE-RELATIVE CAUSAL APPROPRIATENESS (CORRECTION A3)
"INTERVENTION LOCUS MUST BE SELECTED RELATIVE TO THE EARNED DIAGNOSIS, ENGINEERING REQUIREMENTS,
PRESERVATION REQUIREMENTS, CONSTRAINTS, AND TRADE-OFFS."

Constitutional Principle 11 mandates: "Intervention Should Occur at the Causally Appropriate Point."
This principle establishes that interventions must be causally grounded, but it does NOT establish
an absolute dogma that the root-most or physically deepest intervention is universally superior.

Cause-directed interventions often possess distinct causal advantages because they eliminate, modify,
or prevent the diagnosed mechanism or enabling condition at its source before downstream consequences
accumulate. However:
  - Cause-directed interventions are not universally superior or automatically preferred in every case;
  - Compensatory interventions are not intrinsically inferior or mere second-class failures;
  - Downstream action may be professionally justified even when an upstream physical action is technically possible.

Legitimate engineering justifications for selecting downstream or compensatory interventions over upstream physical changes include:
  1. PRESERVATION INTEGRITY: Modifying an upstream source (e.g., changing pickup loading) may damage vital
     musical attributes (e.g., passive cleanup feel), whereas subtle downstream shaping achieves the goal cleanly.
  2. DESTRUCTIVE EDIT & WORKFLOW RISK: Physical or structural modifications carry irreversible setup costs
     or risk disrupting an established workflow.
  3. REVERSIBILITY & PARSIMONY: A non-destructive downstream adjustment may achieve 100% of the engineering intent
     with vastly superior reversibility and lower systemic disruption.
  4. IRREVERSIBLE HISTORICAL RECORDINGS: When tracking is complete, physical sources cannot be re-captured.
  5. ARTISTIC INTENT & DOWNSTREAM CONTEXT: The upstream anomaly may be an essential part of the instrument's
     identity, requiring gentle compensation only within a specific mix context.

Tone Translator recognizes six conceptual categories of intervention loci:
  1. CAUSE-DIRECTED INTERVENTION: Acts directly upon the diagnosed physical or electrical source mechanism.
  2. UPSTREAM PREVENTIVE INTERVENTION: Modifies an enabling condition or signal characteristic upstream
     of the diagnosed mechanism to prevent its excitation.
  3. MECHANISM-LOCAL INTERVENTION: Modifies the operation of the active circuit or acoustic boundary responsible.
  4. DOWNSTREAM COMPENSATORY INTERVENTION: Leaves the causal mechanism intact but applies inverse processing
     further down the signal chain to mitigate audible consequences.
  5. CONTEXTUAL / PLAYBACK INTERVENTION: Corrects a discrepancy originating in the monitoring environment,
     room acoustics, or psychoacoustic perception without altering the recorded master audio.
  6. PLATFORM WORKAROUND: A specialized compensatory technique engineered specifically to circumvent a known
     functional limitation in the destination execution platform.

The selection among these loci is never dogmatic; it is an explicit, case-relative sound engineering decision.


===============================================================================
SECTION 6 — ENGINEERING REQUIREMENT ARCHITECTURE & FORMULATION MODEL
===============================================================================

6.1 THE REQUIREMENT TRANSFORMATION PIPELINE
The transformation of an earned causal diagnosis into an actionable engineering specification
in Stage 09 requires decomposing the engineering intent into five complementary requirement dimensions:
    1. Primary Requirement (The core corrective or creative objective).
    2. Preservation Requirement (The vital musical attributes that must not be degraded).
    3. Constraints (The hard boundaries and soft preferences limiting the solution space).
    4. Secondary Requirements (Subordinate engineering improvements pursued opportunistically).
    5. Unknown / Unresolved Boundaries (The limits of knowledge bounding requirement specificity).

6.2 PRIMARY REQUIREMENTS
The Primary Requirement specifies the essential physical, acoustic, spectral, dynamic, or temporal
change necessary to fulfill the user's intent. It directly addresses the locus and mechanism
identified in the causal diagnosis.

A Primary Requirement must specify:
  - Targeted Phenomenon: The specific acoustic or electrical characteristic diagnosed in Phase 1C.5c.
  - Directional Objective: Attenuate, boost, compress, expand, stabilize, decouple, align, or saturate.
  - Spectral / Dynamic Locus: The frequency region, dynamic band, or temporal envelope affected.
  - Physical Target: The signal domain (acoustic radiation, pre-clipping drive, power-supply rail,
    transduction boundary) where the change must take effect.

6.3 PRESERVATION REQUIREMENTS (FIRST-CLASS STATUS)
In professional sound engineering, what you keep is just as critical as what you change.
Amateur mixing frequently ruins excellent tracks by "fixing" a flaw at the cost of the performance's
vitality. Phase 1C.5d establishes Preservation Requirements as first-class, mandatory architectural components.

Preservation Requirements explicitly protect musical properties against collateral damage:
  - Transient Attack: Pick snap, stick impact, percussive leading-edge clarity.
  - Dynamic Articulation: Note-to-note volume nuance, touch sensitivity, player expression.
  - Harmonic Character: Authentic even/odd harmonic series, tube warmth, tape bloom, vintage coloration.
  - Low-End Authority: Sub-bass punch, fundamental kick/bass weight, cabinet body resonance.
  - Spatial Imaging: Phase alignment, stereo spread, reverberant depth, environmental air.
  - Sustain & Envelope Decay: Clean harmonic tail decay without artificial gating or premature choking.

An intervention candidate that successfully satisfies the Primary Requirement but catastrophically
violates a Preservation Requirement must be rejected or severely penalized during trade-off analysis in Stage 11.

6.4 CONSTRAINTS (HARD VS SOFT)
Constraints delineate the boundaries of the permissible solution space. The architecture distinguishes
two distinct constraint tiers:

  - HARD CONSTRAINTS (Absolute Invariants):
    * Physical Inaccessibility: The live performance has ended; tracking is complete; microphones cannot be moved.
    * User Directives: The user explicitly forbids destructive edits, DI re-recording, or altering master faders.
    * Platform Capabilities: Destination platform environment lacks required functional routing or processing
      capabilities (e.g., lacks dynamic convolution, sub-millisecond channel delay, or multi-band transient control).
    * Electrical / Digital Limits: Inability to exceed 0 dBFS without digital clipping; fixed hardware impedance.

  - SOFT CONSTRAINTS (Trade-Off Preferences):
    * CPU Budget: Preference for lightweight processing over computationally heavy oversampling.
    * Workflow Complexity: Preference for fewer modules over complex parallel routing splits.
    * Gear Authenticity: Preference for period-correct vintage processors over modern sterile tools.

6.5 SECONDARY REQUIREMENTS
Secondary Requirements identify ancillary engineering improvements that can be achieved concurrently
with the primary objective, provided they introduce zero compromise to Primary or Preservation requirements.
Example: While restructuring pre-clipping EQ to mitigate bridge-pickup harshness, opportunistically
tightening subsonic rumble below 40 Hz to increase amplifier headroom.

6.6 UNKNOWN / UNRESOLVED BOUNDARIES
An Engineering Requirement must never claim greater precision than the upstream diagnosis and evidence
warrant. If the exact loudspeaker cone resonance is unmeasured, the requirement must be bounded to
"mitigate excessive narrow-band resonance in the 2.5-3.5 kHz region," rather than pretending to target
an exact fabricated center frequency of 2,842 Hz.

6.7 NON-FABRICATION OF NUMERIC PRECISION (CORRECTION A7)
In strict compliance with Constitutional Principle 17 and Phase 1C.5c Section 10, Phase 1C.5d forbids
manufacturing numeric precision out of thin air. Requirements and intervention blueprints must remain
qualitative, directional, or bounded unless:
  - The upstream evidence provided calibrated, quantitative telemetry (e.g., a measured +4.5 dB peak in DI);
  - The user specified an explicit numeric target; or
  - Physical circuit or acoustic theory establishes exact values (e.g., 1/4-wavelength delay comb-notch spacing).

Where illustrative values appear in examples, they must be explicitly designated as non-authoritative
approximations; they must never masquerade as evidence-derived current-case settings.


===============================================================================
SECTION 7 — DEFECT CORRECTION VS CREATIVE TONE DESIGN
===============================================================================

7.1 DECOUPLING PHYSICAL ANOMALIES FROM DEFECTS
A foundational fallacy in algorithmic audio processing is the assumption that every measurable physical
non-linearity, resonance, distortion, or noise is an engineering defect requiring elimination.
In guitar amplification and rock music production, physical anomalies are frequently the very essence
of the desired musical tone.

Examples of Desirable Physical Anomalies:
  - Power supply voltage sag producing dynamic compression, sponge, and bloom.
  - High-order odd harmonic distortion from asymmetrical tube clipping creating aggressive lead bite.
  - Cabinet speaker cone breakup adding complex midrange texture and presence.
  - Narrow-band pickup resonance giving single-coils their characteristic bell-like chime.
  - Gentle analog tape or tube circuit hiss imparting warmth and psychoacoustic cohesion.

Phase 1C.5d strictly decouples the objective physical diagnosis from subjective aesthetic value:
    "A PHYSICAL ANOMALY IS NOT AUTOMATICALLY A PROBLEM TO REMOVE."

7.2 INTENT-GOVERNED ACTION SPECTRUM
Engineering intent (established in Phase 1C.5b and consumed frozen) dictates how a diagnosed physical
phenomenon must be treated. Tone Translator recognizes six legitimate engineering actions:
  1. REMOVE: The phenomenon is an unambiguous technical defect conflicting with intent (e.g., ground loop hum).
  2. REDUCE: The phenomenon possesses musical utility but its current severity is excessive (e.g., taming harshness).
  3. PRESERVE: The phenomenon is intentional and vital to the requested tone identity (e.g., maintaining fuzz texture).
  4. ENHANCE: The phenomenon is artistically desirable but underdeveloped (e.g., coaxing more power amp sag).
  5. RELOCATE: The phenomenon is musically useful but occurring at the wrong frequency or stage (e.g., shifting resonance).
  6. TRADE: The phenomenon is accepted as an unavoidable, desirable consequence of achieving a higher-priority goal.

7.3 CREATIVE INTEGRITY PROTECTION
Before formulating a corrective requirement in Stage 09, Phase 1C.5d must cross-reference the diagnosed phenomenon
against the Target Specificity and Engineering Intent dossiers. If an anomaly is identified as a defining
stylistic element of the target aesthetic (e.g., raw vintage garage rock vs polished modern metal),
Tone Translator must protect it from destructive "sanitization."


===============================================================================
SECTION 8 — ALTERNATIVE GENERATION ARCHITECTURE & DIVERSITY CRITERIA
===============================================================================

8.1 MATERIAL DIVERSITY VS ARTIFICIAL QUOTAS
Constitutional Principle 9 commands: "Generate Alternatives When the Problem Admits Alternatives."
In Stage 10 (`CANDIDATE_INTERVENTIONS_EXPLORING_DISTINCT_LOCI`), Phase 1C.5d operationalizes this mandate
by generating genuinely diverse, materially distinct intervention paths whenever the engineering problem
space possesses degrees of freedom.

The architecture explicitly rejects two widespread industry pathologies:
  - THE RIGID QUOTA ANTI-PATTERN: Forcing the system to generate an arbitrary number of options (e.g.,
    "always generate exactly 3 choices"). If physical constraints admit only one viable engineering path,
    generating two fake options is dishonest. Conversely, if a rich problem admits five valid engineering
    strategies, truncating to three destroys professional insight.
  - THE COSMETIC VARIATION ANTI-PATTERN: Presenting trivial parameter variations or brand clones as distinct
    alternatives (e.g., Option A: Cut 4.5 kHz by 3 dB with Brand X EQ; Option B: Cut 4.5 kHz by 3.5 dB with
    Brand Y EQ). This is fake diversity.

8.2 TAXONOMY OF GENUINELY DISTINCT INTERVENTION PATHS
To qualify as materially distinct in Stage 10, candidate alternatives must explore different causal loci,
different physical mechanisms, or fundamentally different engineering philosophies:
  - PATH 1: Causal Source Modification (Directly altering the physical/acoustic origin).
  - PATH 2: Enabling Condition Neutralization (Altering an upstream dependency that excites the cause).
  - PATH 3: Component / Transducer Substitution (Changing physical hardware characteristics).
  - PATH 4: Acoustic Radiation / Boundary Relocation (Altering physical geometric relationships).
  - PATH 5: Dynamic / Program-Dependent Control (Applying threshold-dependent processing).
  - PATH 6: Downstream Spectral Compensation (Applying static frequency contouring).
  - PATH 7: Psychoacoustic / Contextual Masking (Altering surrounding arrangement or playback context).
  - PATH 8: Intentional Acceptance / Creative Re-Framing (Embracing the phenomenon as artistic tone).

8.3 NOVEL AND UNINDEXED INTERVENTIONS
Alternative generation must not be artificially restricted to hardcoded gear databases or traditional
textbook presets. Novel engineering strategies—such as utilizing an unconventional sidechain routing,
deploying an intentional impedance mismatch, or combining subtle complementary adjustments across multiple
stages—are fully admissible provided they satisfy the physical requirements and constraints.'''

if __name__ == "__main__":
    print(get_p1C5d_p2()[:300])
