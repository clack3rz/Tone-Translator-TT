#!/usr/bin/env python3
"""
v02a_p4.py: Sections 14 to 17
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2a.txt
"""

def get_v02a_p4():
    return '''================================================================================
SECTION 14 — HYPOTHESIS FORMATION ARCHITECTURE & EXTENSIBLE LOCUS MODEL
================================================================================

14.1 THE DEFENSE-FIRST HYPOTHESIS CRITERION (PRINCIPLES 1, 4, 5)
Principle 1 ("Evidence Precedes Diagnosis"), Principle 4 ("A Symptom Does Not Identify Its Cause"),
and Principle 5 ("Diagnosis Should Be Causal Where Evidence Permits") govern hypothesis formation.

An engineering hypothesis is neither an ungrounded guess nor an immediate diagnosis.
It is an explicitly bounded, testable proposition that a specific physical, electrical,
or acoustic mechanism operating at a defined locus or interaction boundary is responsible
for generating one or more observed phenomena.

The Defense-First Invariant:
A hypothesis is admissible into the reasoning workspace ONLY if it satisfies four
minimum architectural criteria:
  1. Phenomenological Linkage: It explicitly identifies which factual observations and
     perceptual interpretations it purports to explain.
  2. Physical Plausibility: The proposed mechanism is physically capable of producing
     the observed phenomena within known electro-acoustic principles.
  3. Locus or Boundary Specificity: It identifies the exact stage, transducer interface,
     loading boundary, or feedback loop where the mechanism is posited to operate.
  4. Testable Consequences: It predicts observable consequences that would distinguish
     its operation from alternative explanations.

14.2 THE HYPOTHESIS DATA STRUCTURE & EXTENSIBLE LOCUS MODEL (CORRECTIONS M4 & C-HP)
In Stage 05 of the Decision Lifecycle, the `HypothesisWorkspaceRecord` instantiates
structured hypotheses. In accordance with Major Finding M4, Tone Translator repudiates
any closed enum ontology that restricts sound engineering reasoning to an exhaustive checklist.
Loci and boundaries are structured via an extensible descriptor:

```typescript
interface HypothesisRecord {
  hypothesis_id: string; // e.g. "HYP-001-CAB-BEAMING"
  phenomenon_refs: string[]; // Pointer to ObservationRecord IDs explained
  proposed_mechanism: string; // Concise physical explanation of the causal process
  locus_descriptor: SignalLocusDescriptor; // Extensible physical / circuit / boundary location
  supporting_evidence_refs: string[]; // Evidence items strengthening plausibility
  contradicting_evidence_refs: string[]; // Evidence items weakening plausibility
  unresolved_evidence_refs: string[]; // Ambiguous or unanalyzed evidence items
  underlying_assumptions: string[]; // Explicit premises required for this hypothesis
  knowledge_grounding_status: KnowledgeGroundingStatus;
  grounding_knowledge_claim_refs?: string[]; // Governed 1C.4 claims (optional per M2)
  operational_boundaries: string[]; // Valid operating conditions (e.g. SPL, impedance)
  predicted_observable_consequences: string[]; // Falsifiable predictions if true
  discriminating_evidence_criteria: string[]; // Specific test or capture that would discriminate
  logical_relationship: HypothesisLogicalRelationship; // COMPETING | JOINT
  epistemic_status: HypothesisEpistemicStatus;
}

interface SignalLocusDescriptor {
  primary_locus: StandardSignalLocus | string; // Standard locus or custom domain
  interaction_type: LocusInteractionType;      // SINGLE_LOCUS | CROSS_BOUNDARY_LOADING | FEEDBACK_LOOP | COMPOUND
  boundary_details?: string;                   // e.g. "Guitar pickup inductance loaded by cable capacitance"
}

enum LocusInteractionType {
  SINGLE_LOCUS = "SINGLE_LOCUS",
  CROSS_BOUNDARY_LOADING = "CROSS_BOUNDARY_LOADING",
  FEEDBACK_LOOP = "FEEDBACK_LOOP",
  COMPOUND = "COMPOUND",
  UNCLASSIFIED_INTERACTION = "UNCLASSIFIED_INTERACTION"
}

// Illustrative standard loci (Extensible, non-exhaustive per M4):
enum StandardSignalLocus {
  INSTRUMENT_ACOUSTIC = "INSTRUMENT_ACOUSTIC",         // Woods, bridge, nut, acoustic resonance
  INSTRUMENT_ELECTRICAL = "INSTRUMENT_ELECTRICAL",     // Pickups, pots, wiring, shielding, cable
  PRE_AMPLIFIER_STAGE = "PRE_AMPLIFIER_STAGE",         // Input stage, gain stages, cathode clippers
  AMPLIFIER_TONE_STACK = "AMPLIFIER_TONE_STACK",       // Passive/active EQ, bright caps, slope resistor
  POWER_AMPLIFIER_STAGE = "POWER_AMPLIFIER_STAGE",     // Phase inverter, power tubes, screen sag, NFB
  SPEAKER_ELECTROMECHANICAL = "SPEAKER_ELECTROMECHANICAL", // Voice coil, cone breakup, surround
  CABINET_ACOUSTIC = "CABINET_ACOUSTIC",               // Baffle resonance, box tuning, comb filtering
  MICROPHONE_TRANSDUCTION = "MICROPHONE_TRANSDUCTION", // Capsule proximity, polar pattern, axis angle
  ACOUSTIC_ENVIRONMENT = "ACOUSTIC_ENVIRONMENT",       // Room modes, boundary reflections, isolation
  POST_TRANSDUCTION_SIGNAL = "POST_TRANSDUCTION_SIGNAL", // Console preamp, ADC conversion, DAW bus
  DIGITAL_SIGNAL_PROCESSING = "DIGITAL_SIGNAL_PROCESSING" // Aliasing, buffer underruns, latency
}

enum KnowledgeGroundingStatus {
  GROUNDED_CANONICAL_CLAIM = "GROUNDED_CANONICAL_CLAIM", // Anchored in peer-reviewed or governed 1C.4 claim
  DERIVED_GOVERNED_MODEL = "DERIVED_GOVERNED_MODEL",     // Derived from multi-component 1C.4 model
  NO_MATCHING_GOVERNED_KNOWLEDGE = "NO_MATCHING_GOVERNED_KNOWLEDGE" // Novel hypothesis (per M2)
}

enum HypothesisLogicalRelationship {
  COMPETING = "COMPETING", // Mutually exclusive or rival explanations
  JOINT = "JOINT"          // Co-occurring or compound causal contributors
}

// Calibrated Epistemic Statuses (Strict Evidentiary Definitions per Correction 4):
enum HypothesisEpistemicStatus {
  ACTIVE_UNDER_EVALUATION = "ACTIVE_UNDER_EVALUATION", // Physically viable candidate mechanism, awaiting discrimination.
  PLAUSIBLE_UNCONFIRMED = "PLAUSIBLE_UNCONFIRMED",     // Mechanistically sound hypothesis consistent with case evidence,
                                                       // but where key internal circuit states, component values, or
                                                       // isolating tests remain unverified. (Standard Stage 05 status).
  HIGHLY_PLAUSIBLE = "HIGHLY_PLAUSIBLE",               // Strictly bounded illustrative descriptor. Applicable ONLY where
                                                       // direct empirical evidence directly corroborates the mechanism at
                                                       // the specific locus under controlled comparative testing, but where
                                                       // formal causal diagnosis resolution awaits Phase 1C.5c. Direct
                                                       // evidence of a feature's existence or upstream location does NOT
                                                       // automatically elevate a specific internal mechanism to this status.
  WEAKENED_BY_EVIDENCE = "WEAKENED_BY_EVIDENCE",       // Contradicted or rendered unlikely by case evidence.
  DEACTIVATED_EVIDENTIALLY = "DEACTIVATED_EVIDENTIALLY", // Ruled out as the origin or primary explanation by direct test.
  RETIRED_INACTIVE = "RETIRED_INACTIVE"                 // Superseded, subsumed, or scope invalidated.
}
```

14.3 REPUDIATION OF ARBITRARY CANDIDATE QUOTAS (CORRECTION M3 OF 1C.5a)
In strict compliance with frozen Correction M3:
    TONE TRANSLATOR REJECTS ANY ARBITRARY CANDIDATE QUOTA.
    THERE IS NO MANDATE TO GENERATE THREE, FIVE, OR ANY FIXED NUMBER OF HYPOTHESES.

The Professional Quantity Rule:
  - If the case evidence and electro-acoustic reality defend ONLY ONE viable hypothesis,
    exactly one hypothesis must be generated. Inventing synthetic strawman hypotheses
    merely to satisfy a diversity quota degrades engineering rigor.
  - If the case evidence admits multiple defensible candidate mechanisms across different
    loci (e.g. harshness could stem from mic beaming, tone-stack settings, or clipping bias),
    ALL defensible candidates must be formulated and retained in the active workspace.
  - Candidates must NEVER be created out of thin air to fulfill an artificial checklist.

14.4 REJECTION OF FAMILIARITY BIAS (PRINCIPLES 9 & 11)
Engineers and machine models frequently suffer from "familiarity bias" — giving higher
prior probability to common tools or textbook scenarios (e.g. always suspecting the
overdrive pedal or mic placement).
Tone Translator mandates:
  - Hypotheses are evaluated strictly on their alignment with observed case evidence,
    not their historical frequency of occurrence.
  - Rare, subtle, or compound physical mechanisms (e.g. impedance mismatch between passive
    pickups and an unbuffered line-level input) must receive equal architectural standing
    if the empirical evidence points toward them.

14.5 FLEXIBLE HYPOTHESIS RETIREMENT (CORRECTION Reg-H)
A hypothesis does not need to be mathematically or physically falsified to cease being
active. In accordance with frozen Correction Reg-H, a hypothesis may be transitioned to
`RETIRED_INACTIVE` or `DEACTIVATED_EVIDENTIALLY` through multiple valid paths:
  1. Direct Falsification: An empirical test disproves a required prediction (e.g. moving
     the mic off-axis does not change the peak, falsifying acoustic dust-cap beaming).
  2. Evidential Supersession: New high-directness evidence renders another mechanism
     overwhelmingly complete, rendering the minor hypothesis redundant.
  3. Scope Invalidation: Clarified engineering intent reveals the posited phenomenon is
     an intended artistic feature, removing the need for a defect hypothesis.
  4. Locus Elimination: Direct DI inspection confirms the raw pickup signal already possesses
     the artifact, weakening downstream amplifier and acoustic loci as origin explanations.


================================================================================
SECTION 15 — COMPETING VS JOINT HYPOTHESIS RELATIONSHIPS
================================================================================

15.1 ORTHOGONALITY OF LOGICAL RELATIONSHIP AND EVIDENTIAL STATUS
Phase 1C.5a v0.3c established the fundamental principle:
    THE LOGICAL RELATIONSHIP (COMPETING VS JOINT) BETWEEN HYPOTHESES
    IS COMPLETELY ORTHOGONAL TO THEIR EVIDENTIAL STATUS.

Logical relationship defines how hypotheses interact conceptually:
  - `COMPETING`: Mechanism A and Mechanism B represent alternative, rival explanations
    for the exact same phenomenon. (e.g. "Peak at 4.2 kHz is caused by acoustic dust-cap
    beaming" VS "Peak at 4.2 kHz is caused by a hardware EQ boost at the desk").
  - `JOINT`: Mechanism A and Mechanism B represent co-occurring, additive, or compound
    phenomena that together produce the overall sonic symptom. (e.g. "Low-end mud is
    caused by excessive preamp bass gain driving cathode clipping into grid conduction AND
    close dynamic mic proximity effect at the speaker cone").

15.2 THE EVIDENTIAL INDEPENDENCE THEOREM
Evidence strengthening Hypothesis A does NOT automatically weaken Hypothesis B, UNLESS
the evidence is explicitly discriminating between mutually exclusive premises.

In complex electro-acoustic guitar systems, dual and triple mechanisms are commonplace:
  - An over-saturated rhythm tone may simultaneously suffer from:
    1. An unbuffered pickup cable loading capacitance (Locus: Instrument Electrical),
    2. Over-biased preamp cold clipper producing harsh upper harmonics (Locus: Preamp Stage),
    3. Center-cone mic placement emphasizing brittle 4-5 kHz frequencies (Locus: Transduction).
  - Demonstrating that the mic is on-axis (strengthening Hypothesis 3) does NOT provide
    one iota of evidence that the preamp bias is correct (Hypothesis 2).
  - Tone Translator strictly forbids "zero-sum evidential accounting" where confirming one
    defect prematurely exonerates other parts of the signal chain.


================================================================================
SECTION 16 — ASSUMPTIONS, UNKNOWNS & CONFLICT MANAGEMENT
================================================================================

16.1 EXPLICIT ASSUMPTION GOVERNANCE
Engineering reasoning in the real world constantly requires provisional assumptions
due to incomplete telemetry. Tone Translator forbids silent or covert assumptions.
Every assumption must:
  - Be explicitly recorded in `underlying_assumptions` within `HypothesisRecord`.
  - Be classified by risk level (`NEGLIGIBLE`, `MODERATE`, `LOAD_BEARING`).
  - Be explicitly exposed in user-facing communication when reasoning relies upon it.
  - Be flagged for immediate invalidation if subsequent case evidence contradicts it.

Example:
  - Valid: "Assuming user pickup selector was in the Bridge position during the capture take
    (Risk: LOAD_BEARING; unverified by metadata)."
  - Prohibited: Silently assuming the guitar is tuned to E-standard when analyzing 80 Hz energy.

16.2 THE UNKNOWN DOMAIN REGISTER
Missing evidence is never treated as a blank slate or assumed to be nominal.
Stage 02 and Stage 05 maintain an explicit `UnknownDomainRegister` tracking unobserved variables:
  - Unobserved Instrument Parameters: Pot values (250k vs 500k), string age, pickup height.
  - Unobserved Circuit States: Bias voltage, plate supply ripple, tube wear, pedal internal DIP switches.
  - Unobserved Acoustic Factors: Room dimensions, wall absorption coefficients, baffle angle.
An unknown domain acts as an epistemic constraint: TT is forbidden from formulating a definitive
causal diagnosis that depends upon an unknown variable without flagging the dependency.

16.3 CONFLICT MANAGEMENT & UNRESOLVED DISCREPANCIES
When case evidence contains internal contradictions, Tone Translator enforces strict discipline:
  - Prohibited: Silently averaging contradictory measurements, ignoring an inconvenient user report,
    or forcing data into conformity with a textbook model.
  - Mandatory Protocol for Conflicting Evidence:
    1. Log the conflict explicitly in `unresolved_evidence_refs` and `CaseEvidenceAssessmentRecord.conflict_flags`.
    2. Characterize the contradiction (e.g. "User reports overwhelming low-frequency muddiness,
       but calibrated 1/3-octave FFT indicates sub-200 Hz energy is -6 dB below standard baseline").
    3. Formulate competing hypotheses to explain the contradiction itself (e.g. "Hypothesis A:
       User is monitoring in an untreated room with an 80 Hz axial room mode; Hypothesis B:
       User is using headphones with hyped bass response; Hypothesis C: User refers to lower-mid
       boxiness at 500 Hz using the colloquial term 'mud'").
    4. Maintain the conflict as an UNRESOLVED STATE until discriminating evidence is gathered.


================================================================================
SECTION 17 — ADDITIONAL-EVIDENCE DECISION & DISCRIMINATING TEST PROTOCOL
================================================================================

17.1 THE VALUE-OF-INFORMATION MANDATE (PRINCIPLE 21)
Principle 21 establishes:
    "WHERE EVIDENCE IS MISSING, SEEK DISCRIMINATING EVIDENCE RATHER THAN GUESSING."
    (and "TT Must Recognise When Additional Discriminating Evidence is More Valuable Than Another Intervention").

In sound engineering, making a blind or premature adjustment to an equalizer or gain stage
can permanently damage tonal balance if the true fault lies elsewhere (e.g. attempting to
EQ out acoustic comb filtering caused by dual out-of-phase mics).

The Value-of-Evidence Rule:
When the active hypothesis workspace contains multiple competing, highly plausible
mechanisms with divergent remediation paths, Tone Translator must pause downstream
progression and evaluate the acquisition of discriminating evidence.

17.2 DISCRIMINATING EVIDENCE UTILITY (CORRECTION TO RIGID FORMULAS)
The AI Sound Engineer must maintain rigorous efficiency and avoid becoming a pedantic,
endless data-gathering loop. Additional evidence requests are governed by a flexible
engineering value standard:

The Core Evidential Invariant:
THE VALUE OF AN ADDITIONAL TEST COMES FROM ITS ABILITY TO DISCRIMINATE BETWEEN
MATERIAL LIVE HYPOTHESES OR REDUCE DECISION-RELEVANT UNCERTAINTY.

Tone Translator requests additional evidence when its expected engineering value
materially exceeds the cost, friction, and delay of acquiring it:
  - High Expected Value: When surviving hypotheses point to radically different loci
    (e.g. guitar cable loading vs amplifier clipping), a simple 5-second test provides
    massive dispositive clarity.
  - Low Expected Value: Merely "interesting" evidence (e.g. asking for guitar cable
    capacitance with an LCR meter, or requesting ambient humidity) is barred as compulsive
    over-acquisition.

17.3 ILLUSTRATIVE DISCRIMINATING TEST PROTOCOLS (NON-EXHAUSTIVE EXAMPLES)
Tone Translator recognizes numerous practical studio tests for isolating electro-acoustic mechanisms.
These represent extensible, non-exhaustive examples rather than a rigid closed checklist:
  - Dry DI Capture Test: Isolates guitar electrical signal from downstream amplifier stages.
  - Processor Bypass Test: Bypasses a single pedal to isolate pre-gain clipping or envelope clamping.
  - Preamp FX-Loop Send Tap: Taps line-level preamp output to separate preamp from power amp sag.
  - Single-Mic Solo Isolation: In multi-mic setups, mutes secondary mics to detect acoustic phase notches.
  - Off-Axis Capsule Repositioning: Moves mic 1.5 inches off-center to discriminate dust-cap beaming from circuit fizz.
  - Variable Input Excitation Test: Rolls guitar volume back to 7/10 to test input saturation thresholds.
  - Controlled Open-Chord / Chromatic Sweep: Isolates fixed structural cabinet resonances from dynamic distortion.
  - Level-Matched A/B Audition: Isolates Fletcher-Munson loudness artifacts from genuine timbral shifts.

17.4 PROGRESSION UNDER BOUNDED UNCERTAINTY (STRICT FIREWALL B2)
Acquiring additional evidence is NOT always possible. A musician in the middle of a creative
session may decline a request, lack a DI box, or demand to proceed immediately.
In strict adherence to Freeze Blocker B2, Phase 1C.5b handles this by documenting uncertainty,
NEVER by prematurely deciding the intervention:

When Evidence is Declined or Unavailable:
  1. The lifecycle state transitions to `EVIDENCE_DECLINED` or `EVIDENCE_UNAVAILABLE`.
  2. Phase 1C.5b logs all surviving active hypotheses in `HypothesisWorkspaceRecord`.
  3. Phase 1C.5b logs the unreduced uncertainty in `ResidualUncertaintyDossier`.
  4. Phase 1C.5b documents the known constraints and evidence limitations.
  5. Phase 1C.5b certifies that progression under bounded uncertainty is epistemically permissible.
  6. Phase 1C.5b HANDS OFF to downstream phases WITHOUT deciding the intervention.
     (Phase 1C.5d later determines whether a robust, reversible, or minimal-risk intervention is appropriate).'''

if __name__ == "__main__":
    print(get_v02a_p4()[:300])
