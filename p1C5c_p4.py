#!/usr/bin/env python3
"""
p1C5c_p4.py: Sections 14 to 17
for TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1a.txt
Phase 1C.5c — Diagnosis & Causal Reasoning (Bounded Causal-Epistemic Correction)
"""

def get_p1C5c_p4():
    return '''================================================================================
SECTION 14 — ASSUMPTION SENSITIVITY & LOAD-BEARING RISK
================================================================================

14.1 EVALUATING DIAGNOSTIC DEPENDENCE ON ASSUMPTIONS (CORRECTION B1)
Every real-world engineering diagnosis relies to some degree on provisional assumptions
inherited from Phase 1C.5b (e.g. guitar volume pot setting, string gauge, unmeasured tube bias).
Tone Translator strictly forbids treating a conditional diagnosis as unconditional fact:
    THE STABILITY OF A DIAGNOSIS IS BOUNDED BY ITS LOAD-BEARING ASSUMPTIONS.

Orthogonality of Assumption Sensitivity and Diagnosis Disposition (Correction B1):
Tone Translator maintains explicit separation between two independent semantic dimensions:
  1. Assumption Sensitivity answers: "How dependent is a causal claim on an assumption?"
  2. Diagnosis Disposition answers: "What causal resolution has the available evidence earned?"
A case may simultaneously have a resolved diagnosis disposition (`CAUSAL_DIAGNOSIS_SUPPORTED`)
and an assumption sensitivity rating of `CONDITIONAL_ON_ASSUMPTION` if the assumption merely
bounds operational validity without destroying the core causal mechanism.
Conversely, if an unverified assumption is genuinely load-bearing such that falsifying it
would invalidate the dependent causal mechanism, the dependent causal claim MUST remain
unresolved at that specificity (retaining an unresolved disposition in Stage 07, such as
`MULTIPLE_CAUSES_REMAIN_VIABLE`). `CONDITIONAL_ON_ASSUMPTION` is an assumption sensitivity
rating, NOT a diagnosis status.

14.2 ASSUMPTION SENSITIVITY TIERS (BASELINE + EXTENSIBLE + NON-EXHAUSTIVE)
Tone Translator evaluates every diagnosis against explicit assumption sensitivity tiers:

  - `ROBUST_TO_ASSUMPTION`:
    The diagnosis holds true regardless of whether the assumption is valid or invalid.
    Example: Diagnosing acoustic comb filtering from an on-axis microphone 2 inches off a hard
    reflective floor is robust to whether the guitar has a 250k or 500k volume pot.

  - `CONDITIONAL_ON_ASSUMPTION`:
    The diagnosis holds true only within the bounded validity range of the stated assumption,
    where variation of the assumption merely shifts the severity rather than reversing the cause.
    Example: Diagnosing power-stage saturation where the exact onset threshold depends on
    assuming nominal domestic AC mains voltage within typical operational bounds.

  - `INVALIDATING_DEPENDENCY`:
    If the assumption is false, the diagnosed causal mechanism is physically impossible or
    fundamentally misattributed.
    Example: Diagnosing pickup cable capacitive loading on a guitar that is secretly equipped
    with active pickups and an onboard low-impedance preamp buffer.

  - `LOAD_BEARING_REQUIRING_VERIFICATION`:
    An assumption with high load-bearing risk that must be verified before a diagnosis depending
    on it can be treated as definitive.
    Governing Epistemic Rule (Corrections C3 & M3): If a load-bearing assumption remains unverified,
    Tone Translator must NOT issue an unconditional diagnosis; the causal claim remains explicitly
    conditional or unresolved until verification is achieved. (Phase 1C.5c defines validity conditions
    and load-bearing dependencies; it does not dictate downstream intervention policy).

14.3 ASSUMPTION INVALIDATION HOOK
If subsequent telemetry, stem analysis, or user clarification falsifies a load-bearing assumption,
Tone Translator must immediately revoke any dependent diagnosis and return the session to
active causal evaluation in Stage 07.


================================================================================
SECTION 15 — KNOWLEDGE GROUNDING & THE REFERENCE CASE FIREWALL
================================================================================

15.1 KNOWLEDGE GROUNDING BOUNDARIES (PHASE 1C.4 FIREWALL)
Tone Translator leverages the frozen Phase 1C.4 Knowledge Architecture to structure
causal models and verify physical plausibility. However, the Knowledge Firewall establishes:
    GOVERNED KNOWLEDGE PROVES WHAT IS PHYSICALLY POSSIBLE;
    ONLY CASE EVIDENCE PROVES WHAT ACTUALLY OCCURRED.

Strict Epistemic Invariants:
  - A peer-reviewed KnowledgeClaim (KC) documenting that cathode-biased EL84 tubes exhibit
    screen compression under transient peaks proves that this mechanism is physically viable.
  - A KnowledgeClaim does NOT prove that the current user's EL84 amplifier is currently compressing,
    nor that screen compression is the cause of their specific low-end complaint.
  - Case telemetry and empirical observations must independently demonstrate that the mechanism
    is active in the current case.
  - Familiarity bias is prohibited: an obscure, unindexed mechanism supported by empirical evidence
    outranks a famous textbook KnowledgeClaim that contradicts current telemetry.

15.2 THE REFERENCE CASE FIREWALL IN CAUSAL DIAGNOSIS (CORRECTION C5)
Phase 1C.5c strictly preserves the Reference Case Firewall established in Phase 1C.5b:
    HISTORICAL REFERENCE CASES ARE STRUCTURAL ANALOGIES.
    THEY NEVER ESTABLISH CURRENT-CASE DIAGNOSIS.

The "Brown Sound / Variac" Invariant Demonstration:
  - Case Telemetry: A user states: "I want that classic 1978 Sunset Sound lead guitar brown sound.
    I have a 100W Marshall Plexi reissue head and a 4x12 with Greenbacks." Audio analysis shows
    high crest factor (12.8 dB) and bright top-end bite.
  - Historical Archive: The knowledge base contains documented production notes from Sunset Sound (1978)
    where Eddie Van Halen ran a Marshall Super Lead with mains voltage dropped to 89V AC using an external Variac.
  - Prohibited Failure Mode: Declaring as a current-case diagnosis: "The user's amplifier lacks power-tube sag
    because it is not running at 89V AC like Eddie Van Halen's 1978 rig," or fabricating unmeasured circuit
    states (e.g. asserting specific B+ voltages or headroom numbers without evidence).
  - Authoritative Diagnosis Discipline: The historical case suggests power-stage voltage sag and
    reactive load damping as candidate structural analogies. However, the current user's audio differs
    from the reference in dynamic and spectral behaviour. Current power-stage operating state remains
    unverified. Multiple mechanisms remain viable. Causal diagnosis of internal circuit headroom is
    withheld pending direct evidence.


================================================================================
SECTION 16 — DIAGNOSIS LANGUAGE CALIBRATION & EPISTEMIC PRECISION
================================================================================

16.1 PRINCIPLE OF CALIBRATED ASSERTION
Tone Translator strictly mandates that the assertive strength of diagnostic language must
precisely match the empirical support earned by evidence:
    PERSUASIVE LANGUAGE MUST NEVER EXCEED EVIDENTIAL PROOF.

Naive AI systems frequently use hyperbolic or authoritative language ("It is definitively proven",
"The exact reason is") when only weak circumstantial evidence exists.
Tone Translator enforces a calibrated linguistic hierarchy.

16.2 CALIBRATED DIAGNOSTIC LANGUAGE TIERS (BASELINE + EXTENSIBLE + NON-EXHAUSTIVE)
+--------------------------------------------------+-------------------------------------------------------------+
| Calibrated Diagnostic Formulation                | Permissible Evidential Condition                            |
+--------------------------------------------------+-------------------------------------------------------------+
| "Cannot be determined from available evidence"   | Audio telemetry is missing, uncalibrated, corrupted,        |
|                                                  | or completely inadequate for causal diagnosis.              |
+--------------------------------------------------+-------------------------------------------------------------+
| "Mechanisms remain unresolved across loci"       | Multiple candidate mechanisms across different signal       |
|                                                  | stages remain equally viable and unisolated.                |
+--------------------------------------------------+-------------------------------------------------------------+
| "Signal locus isolated; mechanism unresolved"    | Clean stem or tap isolates the stage (e.g. Dry DI), but     |
|                                                  | internal circuit processes cannot be discriminated.         |
+--------------------------------------------------+-------------------------------------------------------------+
| "Consistent with [Mechanism]"                    | Mechanism is physically plausible and matches symptoms,     |
|                                                  | but lacks direct locus isolation or necessary prediction.   |
+--------------------------------------------------+-------------------------------------------------------------+
| "Evidence corroborates / supports [Mechanism]"   | Case evidence directly demonstrates a primary signal effect |
|                                                  | predicted by the mechanism under documented conditions.     |
+--------------------------------------------------+-------------------------------------------------------------+
| "Evidence strongly supports [Mechanism]"         | Controlled test (e.g. off-axis mic move, cable swap)        |
|                                                  | confirms necessary prediction while alternatives weaken.    |
+--------------------------------------------------+-------------------------------------------------------------+
| "Causal contribution established for [Mechanism]"| Empirical manipulation demonstrates that the symptom        |
|                                                  | directly tracks this mechanism as a material contributor.   |
+--------------------------------------------------+-------------------------------------------------------------+
| "Dominant cause established for [Mechanism]"     | Direct affirmative evidence confirms primary driver,        |
|                                                  | and all major alternative mechanisms are validly excluded.  |
+--------------------------------------------------+-------------------------------------------------------------+


================================================================================
SECTION 17 — DIAGNOSIS DISPOSITION / RESOLUTION STATUS MODEL ACROSS PHASE 1C.5c (CORRECTIONS B1, B2, B3)
================================================================================

17.1 EXTENSIBLE DIAGNOSIS STATUS MODEL (BASELINE + EXTENSIBLE + NON-EXHAUSTIVE)
Tone Translator governs causal deliberation across Phase 1C.5c through an extensible status
model partitioned into two distinct operational groups:

A. RESOLUTION DISPOSITIONS CAPABLE OF COMPLETING STAGE 08:
   (Provided the handoff criteria in Section 20 are satisfied, these complete Stage 08 and
    transmit structured causal dossiers to Phase 1C.5d Stage 09)

  - `CAUSAL_DIAGNOSIS_SUPPORTED`:
    High-directness affirmative evidence confirms a primary causal mechanism; major competing
    alternatives are validly excluded or weakened; residual uncertainty is fully bounded.

  - `PROVISIONAL_DIAGNOSIS` (CORRECTIONS C3 & B2):
    A provisional diagnosis remains valid ONLY where:
      1. The core causal claim has genuinely crossed the causal evidence threshold;
      2. Remaining uncertainty is bounded;
      3. Remaining assumptions are non-load-bearing to the established core claim;
      4. Residual alternatives do not overturn the diagnosis.
    Strict Epistemic Invariants:
      - A provisional diagnosis must NOT be granted merely because a candidate is "most plausible"
        or "highest-ranked".
      - `LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL` cases can NEVER receive a provisional diagnosis.
      - If a load-bearing unverified assumption must be true for the claim to hold, the diagnosis
        is NOT provisional — it must remain an unresolved disposition (e.g. `MULTIPLE_CAUSES_REMAIN_VIABLE`).

  - `COMPOUND_CAUSAL_DIAGNOSIS`:
    Multiple distinct physical mechanisms across one or more signal loci jointly account
    for the observed phenomena (structured as Primary, Secondary, Joint, Enabling, or Amplifying).

  - `LOCUS_RESOLVED_MECHANISM_UNRESOLVED` (CORRECTION C7):
    Empirical stems definitively isolate the entry locus (e.g. Dry DI precedes amp),
    while internal component mechanisms are bounded and transparently documented as unresolved.
    Binding Stage 08 Completion Criteria (Correction C7):
    `LOCUS_RESOLVED_MECHANISM_UNRESOLVED` does NOT automatically qualify for Stage 08 completion.
    A bounded locus-only diagnosis may proceed to Stage 09 only when:
      1. The locus itself is empirically established;
      2. The unresolved internal mechanisms share a sufficiently common causal boundary for
         downstream requirement formulation;
      3. Downstream reasoning does not need to choose among unresolved mechanisms to formulate
         a valid engineering requirement;
      4. Residual uncertainty is explicitly preserved;
      5. Proceeding does not cause Phase 1C.5d to perform hidden causal diagnosis.
    Otherwise, the reasoning session MUST remain in Stage 07 / discriminating evidence loop.

B. NON-RESOLUTION DISPOSITIONS REMAINING IN STAGE 07 / EVIDENCE LOOP:
   (These do NOT complete Stage 08; they halt prior to Stage 09, remaining in Stage 07,
    requesting discriminating evidence via Stage 06A, or issuing bounded causal abstentions)

  - `MULTIPLE_CAUSES_REMAIN_VIABLE`:
    Evidence demonstrates that several distinct mechanisms are physically and acoustically
    viable, without discriminating evidence available to distinguish them.

  - `INSUFFICIENT_EVIDENCE_FOR_CAUSAL_RESOLUTION`:
    Supplied telemetry is too poor, corrupted, or lossy to support any defensible causal claim;
    forces bounded abstention or issues a discriminating evidence request.

  - `CONTRADICTORY_EVIDENCE_BLOCKS_DIAGNOSIS`:
    Direct, unresolvable intra-domain conflict exists between empirical evidence sources,
    halting diagnostic resolution until discriminating testing occurs.

  - `DIAGNOSIS_DEFERRED_PENDING_EVIDENCE`:
    Active deliberation is formally paused awaiting the execution of a studio
    discriminating test protocol.

17.2 QUALITATIVE UNCERTAINTY & THE UNCERTAINTY-SURVIVAL INVARIANT
In strict compliance with the derived architectural invariant:
    "UNCERTAINTY MUST SURVIVE THE DECISION."

Resolving a diagnosis does NOT extinguish uncertainty:
  - Declaring a primary cause (e.g. microphone beaming) does not prove that the amplifier tone stack
    was perfectly nominal.
  - Every committed diagnosis dossier must carry its companion `ResidualUncertaintyDossier`,
    ensuring that downstream reasoning respects unmeasured internal variables, secondary
    contributors, and operational boundaries.'''

if __name__ == "__main__":
    print(get_p1C5c_p4()[:300])
