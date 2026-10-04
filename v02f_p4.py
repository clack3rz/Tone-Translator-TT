#!/usr/bin/env python3
"""
v02f_p4.py: Sections 14 to 17
for TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2f.txt
"""

def get_v02f_p4():
    return '''================================================================================
SECTION 14 — HYPOTHESIS FORMATION ARCHITECTURE & EXTENSIBLE LOCUS MODEL (CORRECTIONS FB-C3, FB-C5, D3, F1)
================================================================================

14.1 DEFINITION & DISCIPLINE OF A CANDIDATE HYPOTHESIS
A candidate hypothesis in Stage 05 is strictly defined as:
    A CANDIDATE CAUSAL MECHANISM (PHYSICAL, ACOUSTIC, OR ELECTRICAL)
    LOCATED AT A SPECIFIC SIGNAL LOCUS, EXPLAINING AN OBSERVED PHENOMENON.

Strict Epistemic Invariants:
  1. A hypothesis is NOT a restatement of the symptom (e.g. "it sounds harsh" is an observation;
     "acoustic dust-cap beaming produces elevated 4.2 kHz presence" is a hypothesis).
  2. A hypothesis is NOT an intervention prescription (e.g. "needs a 4 kHz cut" is an intervention;
     interventions are barred from 1C.5b by the Intervention Firewall).
  3. Non-Defect Creative Intent Rule (FB-C5): Where engineering intent represents non-defect
     creative tone-building without an observed or reported physical fault (e.g. Scenario A),
     Tone Translator formulates candidate target interpretations (stylistic/production directions),
     NEVER a causal defect hypothesis workspace.

14.2 THE HYPOTHESIS RECORD DATA CONTRACT (CORRECTIONS M-C4, D3, F1)
Every hypothesis must specify its locus, proposed mechanism, grounding, assumptions,
falsifiable predictions, and pair-specific logical relationships:

```typescript
interface HypothesisRecord {
  hypothesis_id: string; // Unique identifier (e.g. "HYP-SCENARIO-B-01")
  target_observation_ids: string[]; // Observations this hypothesis explains
  locus_descriptor: SignalLocusDescriptor;
  proposed_mechanism: string; // Specific electro-acoustic or physical process
  knowledge_grounding: KnowledgeGroundingStatus;
  referenced_claim_ids?: string[]; // IDs from Phase 1C.4 knowledge base
  underlying_assumptions: AssumptionDescriptor[];
  operational_boundaries: string[]; // Valid operating conditions (e.g. SPL, impedance)
  predicted_observable_consequences: string[]; // Testable predictions if true
  discriminating_evidence_criteria: string[]; // Specific test that would discriminate
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

// Extensible standard loci (Non-exhaustive per M4):
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

// Calibrated Epistemic Statuses:
enum HypothesisEpistemicStatus {
  ACTIVE_UNDER_EVALUATION = "ACTIVE_UNDER_EVALUATION", // Physically viable candidate mechanism, awaiting discrimination.
  PLAUSIBLE_UNCONFIRMED = "PLAUSIBLE_UNCONFIRMED",     // Mechanistically sound hypothesis consistent with case evidence,
                                                       // but key internal circuit states or isolating tests remain unverified.
  HIGHLY_PLAUSIBLE = "HIGHLY_PLAUSIBLE",               // Strictly bounded descriptor applicable ONLY where direct empirical
                                                       // evidence corroborates the mechanism at the specific locus under controlled
                                                       // comparative testing, but formal diagnosis resolution awaits 1C.5c.
  WEAKENED_BY_EVIDENCE = "WEAKENED_BY_EVIDENCE",       // Rendered less plausible by case evidence or controlled test.
  DEACTIVATED_EVIDENTIALLY = "DEACTIVATED_EVIDENTIALLY", // Excluded as primary explanation by valid exclusion test.
  RETIRED_INACTIVE = "RETIRED_INACTIVE"                 // Superseded, subsumed, or scope invalidated.
}
```

Conceptual Pairwise Architecture Rule (M-C4, D3, F1):
In architectural deliberation, hypothesis relationships must be pair-specific, explicit,
counterpart-identified, and non-contradictory. A hypothesis may compete with one hypothesis,
potentially coexist with another, or remain independent. The relationship statement must identify
the counterpart hypothesis (e.g. "Relationship to H2: potentially joint; Relationship to H3: competing
explanation"). Concrete database and programmatic schema representations are explicitly deferred;
no implementation relationship field or enum is frozen in HypothesisRecord (Corrections D3 & F1).

Lifecycle Boundary Discipline:
Phase 1C.5b represents potential relationships (`potentially joint`, `competing`, `mutually exclusive
where physically justified`). Labels that imply Phase 1C.5b has already confirmed actual causal
contribution (e.g. "confirmed jointly contributory") are strictly barred, as causal contribution
resolution belongs exclusively to Phase 1C.5c.

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

14.4 REJECTION OF FAMILIARITY BIAS & CLOSED-WORLD SETS (PRINCIPLES 9 & 11, OPEN-1)
Engineers and machine models frequently suffer from "familiarity bias" — giving higher
prior probability to common tools or textbook scenarios (e.g. always suspecting the
overdrive pedal or mic placement), or assuming a problem must stem from a closed checklist.
Tone Translator mandates:
  - Hypotheses are evaluated strictly on their alignment with observed case evidence,
    not their historical frequency of occurrence.
  - Rare, subtle, or compound physical mechanisms (e.g. impedance mismatch between passive
    pickups and an unbuffered line-level input) must receive equal architectural standing
    if the empirical evidence points toward them.
  - Early diagnostic candidate prioritization is permitted for studio efficiency, but
    must NEVER be represented as an exhaustive or closed world of possibilities (OPEN-1).

14.5 CALIBRATED HYPOTHESIS RETIREMENT & VALID EXCLUSION REQUIREMENTS (CORRECTIONS Reg-H & FB-C3)
A hypothesis does not need to be mathematically disproven to cease being active. However,
Tone Translator strictly governs the conditions under which a hypothesis may be excluded or retired.

Governing Exclusion Standard (FB-C3):
    FALSIFICATION REQUIRES A VALID EXCLUSION TEST.
A hypothesis may be excluded only when its required prediction has been tested under
conditions capable of detecting the expected effect and plausible confounders are adequately controlled.
If a test lacks adequate sensitivity or controls, an unobserved change merely WEAKENS the
hypothesis rather than conclusively falsifying it.

The Four Valid Retirement Paths:
  1. Valid Exclusion Test: An empirical test with verified sensitivity, appropriate measurement
     locus, and controlled confounders disproves a required physical prediction.
     (e.g. if a controlled off-axis mic test with verified angle displacement produces no
     meaningful change in a resonant peak, the evidence materially weakens the acoustic dust-cap
     beaming hypothesis; complete exclusion is justified only if placement change was verified
     and speaker dispersion characteristics confirm the frequency should have attenuated).
  2. Evidential Supersession: New high-directness evidence renders another mechanism
     overwhelmingly complete, rendering the minor hypothesis redundant.
  3. Scope Invalidation: Clarified engineering intent reveals the posited phenomenon is
     an intended artistic feature, removing the need for a defect hypothesis.
  4. Locus Elimination: Direct DI inspection confirms the raw pickup signal already possesses
     the artifact, weakening downstream amplifier and acoustic loci as origin explanations.


================================================================================
SECTION 15 — PAIR-SPECIFIC HYPOTHESIS RELATIONSHIPS (COMPETING VS JOINT) (CORRECTIONS M-C4 & D3)
================================================================================

15.1 PAIR-SPECIFIC & NON-CONTRADICTORY RELATIONSHIP MODELING (CORRECTION M-C4 & D3)
In complex audio systems, a single hypothesis rarely possesses a monolithic relationship
to all other hypotheses. Hypothesis A may be mutually exclusive with B, but simultaneously
joint with C.

Governing Semantic Rule (M-C4 & D3):
    HYPOTHESIS RELATIONSHIP STATEMENTS MUST BE PAIR-SPECIFIC AND NON-CONTRADICTORY.
Every hypothesis documents its relationship explicitly against specific counterpart hypotheses:
  - Pairwise Symmetry: If Hypothesis 1 is potentially joint with Hypothesis 2, then Hypothesis 2
    must declare potentially joint with Hypothesis 1. Contradictory asymmetric declarations
    (e.g. H1 stating joint while H2 states competing) are strictly prohibited.
  - Architecture-Neutral Representation: Deliberation traces record the counterpart and
    relationship nature directly (e.g. "Relationship to H2: potentially joint (co-occurring contributor);
    Relationship to H3: competing explanation (alternative origin)"). Implementation-level
    enum locks are avoided in specification text (Correction D3).

15.2 THE EVIDENTIAL INDEPENDENCE THEOREM
Evidence strengthening Hypothesis A does NOT automatically weaken Hypothesis B, UNLESS
the evidence is explicitly discriminating between mutually exclusive premises.

In complex electro-acoustic guitar systems, multiple mechanisms routinely co-occur:
  - An over-saturated rhythm tone may simultaneously suffer from:
    1. An unbuffered pickup cable loading capacitance (Locus: Instrument Electrical),
    2. Over-biased preamp cold clipper producing harsh upper harmonics (Locus: Preamp Stage),
    3. Center-cone mic placement emphasizing brittle 4-5 kHz frequencies (Locus: Transduction).
  - Demonstrating that the mic is on-axis (strengthening Hypothesis 3) does NOT provide
    evidence that the preamp bias is correct (Hypothesis 2).
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
  - Unobserved Rig States: Internal tube bias voltages, B+ rail sag, speaker cabinet internal baffling.
  - Unobserved Environmental Factors: Room dimensions, listening distance, monitor boundary loading.

16.3 CONFLICT MANAGEMENT (PRINCIPLES 16 & 20)
When objective measurements contradict user reports or multiple stems yield conflicting evidence:
  - Tone Translator must NEVER silently average or compromise the conflicting data.
  - The conflict must be logged as an explicit `ConflictRecord` in the deliberation trace.
  - Hypotheses explaining the conflict itself (e.g. room acoustic modes, perceptual masking)
    must be elevated to the active workspace.


================================================================================
SECTION 17 — ADDITIONAL-EVIDENCE DECISION & DISCRIMINATING TEST PROTOCOL (CORRECTION D5)
================================================================================

17.1 EXPECTED ENGINEERING VALUE STANDARD (PRINCIPLE 21 & CORRECTION D5)
When competing hypotheses remain unresolved, Tone Translator evaluates whether to request
further discriminating evidence. In accordance with Constitutional Principle 21:
    "WHERE EVIDENCE IS MISSING, SEEK DISCRIMINATING EVIDENCE RATHER THAN GUESSING."

The decision to request additional evidence is governed by the Expected Engineering Value standard:
  - Materiality: Does the unreduced uncertainty block a sound engineering conclusion or downstream safety?
  - Information Gain (D5): Will the proposed test materially reduce decision-relevant uncertainty,
     distinguish among active hypotheses, bound important unknowns, or validate a load-bearing assumption?
     (The test does NOT need to provide binary proof to possess high engineering value).
  - Practical Friction (D5): Evaluates setup effort, user capability, required equipment, disruption
     to session workflow, safety, reversibility, and expected information gain relative to effort,
     without imposing an arbitrary universal time limit.
  - Urgency & Reversibility: Can downstream reasoning proceed safely under bounded uncertainty,
     or does the unresolved ambiguity create a load-bearing risk?

17.2 STUDIO DISCRIMINATING TEST PROTOCOL STANDARDS (CORRECTIONS FB-C3 & TEST-1)
Every discriminating test protocol in Stage 06A must specify:
  1. Concrete Test Action: Physical or routing change (e.g. move mic 1.5 inches off-axis, roll guitar volume to zero).
  2. Targeted Discrimination: Exactly which hypotheses are being tested.
  3. Non-Binary Epistemic Updating: How the observed outcome qualitatively strengthens,
     weakens, or bounds candidate hypotheses without false binary absolutism.
  4. Confounder Awareness: Clear recognition of unmitigated variables that prevent single-test proof.'''

if __name__ == "__main__":
    print(get_v02f_p4()[:300])
