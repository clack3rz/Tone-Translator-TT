#!/usr/bin/env python3
"""
Sections 1 to 4 for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.3.txt
"""

def get_sections_1_4():
    return '''================================================================================
TONE TRANSLATOR (TT)
PHASE 1C.5a-R v0.3: ENGINEERING REASONING ARCHITECTURE & DECISION LIFECYCLE
EPISTEMIC & LIFECYCLE CONSISTENCY CORRECTION
SPECIFICATION v0.3 — CANDIDATE FOR INDEPENDENT ARCHITECTURAL REVIEW
PROFESSIONAL SOUND ENGINEER FOUNDATION
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.3.txt
VERSION: v0.3 (Epistemic & Lifecycle Consistency Correction)
PREVIOUS VERSIONS:
  - v0.1: Verdict: HOLD — Architecturally Promising, But Not Yet Constitutionally Aligned
  - v0.2: Verdict: HOLD — Material Improvements, But Substantive Epistemic and Lifecycle Contradictions Remain
BINDING DEFECT REGISTER: TT_Phase_1C5a_R_v0.2_Independent_Audit.md
DATE: 2026-09-30
MODE: BOUNDED ARCHITECTURAL CORRECTION ONLY
STATUS: DRAFT ARCHITECTURE FOR INDEPENDENT REVIEW
AUTHORITATIVE UPSTREAM INPUTS:
  - TT_Professional_Sound_Engineer_Standards_v1.txt (Phase 1C.3a)
  - TT_Current_TT_Professional_Capability_Gap_Matrix_v1.txt (Phase 1C.3b)
  - TT_Sound_Engineer_Curriculum_and_Competency_Evaluation_Blueprint_v1.1.txt (Phase 1C.3c)
  - TT_Sound_Engineering_Knowledge_Architecture_v1.1.txt (Phase 1C.4a-R)
  - TT_Sound_Engineering_Knowledge_Source_and_Acquisition_Architecture_v1.1g.txt (Phase 1C.4b-R)
  - TT_Sound_Engineering_Knowledge_Conflict_Uncertainty_and_Governance_Architecture_v1.1a.txt (Phase 1C.4c-R)
  - TT_Sound_Engineering_Knowledge_Retrieval_and_Runtime_Context_Architecture_v1.1b.txt (Phase 1C.4d-R)
  - TT_Current_TT_Knowledge_Migration_Specification_v0.4c.txt (Phase 1C.4e-R)
  - TT_Phase_1C4f_R_Knowledge_Architecture_UAT_and_Signoff_v1.1.txt (Phase 1C.4f-R)
  - TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.2.txt (Baseline)
GOVERNANCE MANDATE:
  - BOUNDED ARCHITECTURAL CORRECTION ONLY: Resolves specific defects identified in v0.2 audit.
  - THIS IS NOT A REDESIGN: Preserves accepted architectural direction and core paradigm.
  - THIS IS NOT AN IMPLEMENTATION PHASE: No production source code, test suites, or DB schemas.
  - THIS IS NOT A PROMPT-ENGINEERING EXERCISE: No prompt templates or LLM instructions.
  - THIS IS NOT A CURRENT-TT MIGRATION PHASE: No migration execution or legacy deprecation.
  - THIS IS NOT AN AT5 DESIGN PHASE: No AmpliTube 5 gear IDs, presets, or XML mappings.
  - FROZEN CONSTITUTION: All 21 Principles remain authoritative, unalterable requirements.
  - FROZEN PROFESSIONAL JUDGEMENT BOUNDARY: Authoritative and unalterable.
  - GATE REMAINS LOCKED: Gemini must not self-freeze or declare production readiness.
================================================================================

TABLE OF CONTENTS
================================================================================
1. REVISION SCOPE & GOVERNANCE
2. BINDING INDEPENDENT AUDIT REGISTER
3. ORIGINAL FINDINGS CROSSWALK
4. FROZEN ARCHITECTURAL BASELINE
5. CORRECTED REASONING ARCHITECTURE
6. EPISTEMIC SEPARATION MODEL
7. OBSERVATION & INTERPRETATION ARCHITECTURE
8. CORRECTED CONTRACT / RECORD MODEL
9. CONTRACT NECESSITY, AUTHORITY & CARDINALITY MATRIX
10. AUTHORITATIVE LIFECYCLE TABLE
11. PARTIAL / PAUSE / TERMINAL / RESUMPTION SEMANTICS
12. PARENT / CHILD RUN & REPEATED EVIDENCE ARCHITECTURE
13. HYPOTHESIS LIFECYCLE
14. DISCRIMINATING EVIDENCE ARCHITECTURE
15. CAUSAL DIAGNOSIS VARIANTS
16. ENGINEERING REQUIREMENT ARCHITECTURE
17. CANDIDATE INTERVENTION & TRADE-OFF ARCHITECTURE
18. ENGINEERING DECISION & PREDICTED OUTCOME
19. SEMANTIC TONE DESIGN HANDOFF
20. TRANSLATION FIDELITY VS ENGINEERING ACCEPTABILITY
21. EXECUTION GATE & FAILURE RECOVERY
22. ACTUAL OUTCOME EVIDENCE & ENGINEERING REVIEW
23. CANDIDATELESSON / EXPERIENCE FIREWALL
24. IMMUTABILITY, LINEAGE & HISTORICAL RECONSTRUCTION
25. AI JUDGEMENT VS DETERMINISTIC JURISDICTION
26. EXACT PHASE 1C.4 INTERFACE COMPATIBILITY MATRIX
27. CORRECTED CHALLENGE SCENARIOS A–J
28. CORRECTED PARTIAL TRACES P1–P10
29. ADDITIONAL LIFECYCLE DEMONSTRATIONS L1–L5
30. 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX
31. TERMINOLOGY & CANONICAL VOCABULARY REGISTER
32. ADVERSARIAL REVIEW
33. OPEN / DEFERRED DECISIONS
34. ACCEPTANCE ASSESSMENT
35. FINAL RECOMMENDATION
================================================================================


================================================================================
SECTION 1 — REVISION SCOPE & GOVERNANCE
================================================================================

1.1 AUDIT CONTEXT & PURPOSE OF v0.3
The independent architectural audit of Phase 1C.5a-R v0.2 returned a formal
verdict of:
    HOLD — MATERIAL IMPROVEMENTS, BUT SUBSTANTIVE EPISTEMIC AND LIFECYCLE
           CONTRADICTIONS REMAIN.

While v0.2 successfully addressed gross structural gaps (such as separating
observations from hypotheses and introducing partial trace containers), the audit
revealed that substantive epistemic leakage, lifecycle contradictions, and false
certainty persisted under the surface of the specification. Specifically:
  - Epistemic separation broke down in challenge scenarios where observations
    asserted unmeasured circuit behaviors or converted qualitative user text into
    invented decibel figures.
  - The lifecycle remained fragmented: trace containers demanded evidence and
    retrieval snapshots even when runs paused early for intent clarification, and
    terminal vs non-terminal states were inconsistently defined.
  - Discriminating evidence was still modeled with binary confirmation semantics
    ("supports = proves"), failing to decouple acquired test data from logical
    hypothesis updating.
  - Diagnostic variants forced primary causes or required ranking without evidence.
  - Translation fidelity (`DEFAULTED`, `APPROXIMATED`) was conflated with engineering
    acceptability, lacking pre-execution blocking.
  - Outcome reviews made unverified causal leaps, asserting "reasoning sound" or
    "lucky guess" without independent evidence.
  - Historical reconstruction overpromised "100% stable forever" determinism.

Phase 1C.5a-R v0.3 executes an uncompromising, bounded architectural correction.
It resolves every blocker, major finding, and minor defect identified in the
binding defect register without expanding scope, without implementing code, and
without redesigning adjacent frozen phases.

1.2 PRESERVATION OF THE FROZEN CORE PARADIGM
The foundational sound engineering paradigm is preserved and reinforced:
    EVIDENCE PRECEDES DIAGNOSIS.
    OBSERVATION IS NOT INTERPRETATION.
    A SYMPTOM DOES NOT IDENTIFY ITS CAUSE.
    DIAGNOSIS IS CAUSAL, NOT LOOKUP-BASED.
    PROFESSIONAL JUDGEMENT BEGINS WHERE EVIDENCE PERMITS MULTIPLE DEFENSIBLE SOLUTIONS.
    UNCERTAINTY SURVIVES THE DECISION.

1.3 REVISION DISCIPLINE & GOVERNANCE LIMITS
This specification operates under strict read-only governance rules:
  - No application code, prompt templates, database collections, or tests are created.
  - The implementation gate remains firmly LOCKED.
  - No current-TT presets, migration scripts, or AT5 mappings are generated.
  - Phase 1C.5b (Schema Implementation) and Phase 1C.6 (Competency Certification)
    are NOT authorized.
  - The sole permitted final recommendations are:
      READY FOR INDEPENDENT ARCHITECTURAL REVIEW
      or
      HOLD — MATERIAL ARCHITECTURAL ISSUE REMAINS.


================================================================================
SECTION 2 — BINDING INDEPENDENT AUDIT REGISTER
================================================================================

The binding defect register established by the independent audit of v0.2 is
presented below. Each item records the defect, affected sections, architectural
correction, and verification criteria:

+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| Defect | Summary of v0.2 Defect                | Bounded Architectural Correction      | Affected Sections | Status    |
| ID     |                                       | in v0.3                               | in v0.3           | in v0.3   |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| B1     | Epistemic separation broken in actual | Enforces strict 6-tier epistemic      | Sections 6, 7,    | RESOLVED  |
|        | walkthroughs (Scenarios A, B, C, F, G)| separation in all contracts AND       | 27 (Scenarios     |           |
|        | Invented FFT decibels; asserted power | scenarios. Observations contain only  | A-J)              |           |
|        | sag, cold clipping, transformer sat.  | directly measured, perceived, or      |                   |           |
|        | Negative obs claimed absolute absence.| derived facts under stated limits.    |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| B2     | Fragmented, conflicting lifecycle     | Replaced fragmented lifecycle with    | Sections 10, 11,  | RESOLVED  |
|        | models. Trace containers required     | ONE Authoritative Lifecycle Table.    | 12, 28 (P1-P10),  |           |
|        | records not yet created in early pause| State-conditioned trace assembly.     | 29 (L1-L5)        |           |
|        | P5 terminality conflicted; no child.  | Explicit child-run and repeated test  |                   |           |
|        | run lineage for repeated requests.    | architecture without phantom records. |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| B3     | Phase 1C.4 compatibility claimed but  | Comprehensive, exact cross-contract   | Section 26        | RESOLVED  |
|        | lacked detailed citation of exact     | verification against all 8 canonical  |                   |           |
|        | sections, fields, and permitted       | 1C.4 entities, 3-axis taxonomy,       |                   |           |
|        | semantics from frozen specifications. | boundaries, and firewalls.            |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R1     | Evidence discrimination assumed       | Decoupled 4 concepts: Acquired Result,| Section 14,       | RESOLVED  |
|        | "supports = confirms" and "supports   | Test Validity, Epistemic Impact, and  | Section 27        |           |
|        | multiple = joint causation". Binary   | Diagnostic Consequence. Multi-valued  |                   |           |
|        | test logic; "will prove" language.    | updating model; removed "will prove". |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R2     | Causal diagnosis variants inconsistent| Authoritative informational specs for | Section 15        | RESOLVED  |
|        | Forced primary mechanism or ranking   | all 5 diagnostic forms. Contributing  |                   |           |
|        | without evidential backing.           | causes do not require primary ranking.|                   |           |
|        | Competing vs contributing conflated.  | Competing vs contributing decoupled.  |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R3     | Translation fidelity conflated with   | Separated Translation Fidelity        | Sections 20, 21,  | RESOLVED  |
|        | engineering acceptability. DEFAULTED  | (EXACT/APPROX/DEFAULT/UNSUPPORTED)    | 28 (P7), 29 (L4)  |           |
|        | not checked against constraints; no   | from Engineering Acceptability. Pre-  |                   |           |
|        | pre-execution rejection gate.         | execution gate blocks non-negotiable  |                   |           |
|        |                                       | violations before audio generation.   |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R4     | Retrospective review made unbacked    | Review requires evidence/rationale for| Sections 22, 23,  | RESOLVED  |
|        | causal claims ("reasoning sound",     | each of 6 independent dimensions.     | 28 (P8, P9)       |           |
|        | "lucky guess"). Prohibited bad runs   | Does not declare fluke/soundness      |                   |           |
|        | from generating CandidateLessons.     | without proof. Bad runs CAN submit    |                   |           |
|        |                                       | failure-mode CandidateLessons.        |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R5     | Requirements and interventions leaked | Every engineering objective must trace| Sections 16, 17,  | RESOLVED  |
|        | unsupported objectives ("tighten bass"| to intent, evidence, or constraint.   | 27 (Scenarios)    |           |
|        | "optimize gain"). Preferred processing| Preferred causal locus must be        |                   |           |
|        | location acted as recipe. Efficacy    | justified case-by-case. Removed       |                   |           |
|        | penalties ungrounded.                 | universal/hidden efficacy penalties.  |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R6     | Negative observations lacked detection| Negative observations carry explicit  | Sections 6, 7,    | RESOLVED  |
|        | limits ("zero hum"). Phenomenological | detection limits and observation      | 27 (Scenarios)    |           |
|        | Interpretation lacked auditable home. | types ("NOT DETECTED UNDER CONDITIONS")|                  |           |
|        |                                       | Auditable interpretation representation|                  |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| R7     | Contract decomposition lacked formal  | Explicit necessity, authority,        | Sections 8, 9,    | RESOLVED  |
|        | authority, producer, consumer, and    | cardinality, lifecycle, and sealing   | 24                |           |
|        | cardinality justification. Historical | point for every contract. Qualified   |                   |           |
|        | reconstruction overpromised determin. | historical reconstruction claims.     |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| r-m1   | Review finding IDs were renumbered    | Restored canonical finding IDs        | Section 2,        | RESOLVED  |
|        | and conflated with original M-series. | (B1-B3, R1-R7, r-m1-r-m3) and         | Section 3         |           |
|        |                                       | established explicit crosswalk.       |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| r-m2   | Terminology aliases inconsistent      | Full terminology audit: canonical     | Section 31        | RESOLVED  |
|        | (UNRESOLVED_DATA_GAP vs LIMITATION;   | vocabulary register; defined all      |                   |           |
|        | NEGATIVE_OBSERVATION vs types).       | permitted aliases and mappings.       |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+
| r-m3   | Hidden scoreboard / undefined efficacy| Explicitly prohibited hidden numeric  | Sections 17, 29,  | RESOLVED  |
|        | penalty language in prose.            | scoring behind qualitative labels.    | 32                |           |
|        |                                       | Removed undefined penalty terms.      |                   |           |
+--------+---------------------------------------+---------------------------------------+-------------------+-----------+


================================================================================
SECTION 3 — ORIGINAL FINDINGS CROSSWALK
================================================================================

To maintain complete historical audit traceability across the Phase 1C.5a
development lifecycle, the table below provides a bidirectional crosswalk
mapping the original independent review findings (from v0.1), their v0.2
disposition, their reassessment in the v0.2 independent audit, and their final
v0.3 architectural resolution:

+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Original       | v0.2 Disposition              | v0.2 Audit Reassessment       | v0.3 Architectural            | Final v0.3    |
| Finding ID     |                               | (Defect Identified)           | Correction Applied            | Status        |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Blocker B1     | Claimed resolved via 6-tier   | REOPENED (Defect B1): Scenarios| Rewrote ObservationRecord; all| RESOLVED      |
| (Observation   | taxonomy.                     | still contained invented FFT  | observations cite source,     |               |
| Purity)        |                               | numbers and unmeasured causes.| method, observer, limits; zero|               |
|                |                               |                               | causal claims; honest negative|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Blocker B2     | Claimed resolved via partial  | REOPENED (Defect B2): Trace   | Established ONE Authoritative | RESOLVED      |
| (Partial       | trace container.              | container required evidence   | Lifecycle Table; trace        |               |
| Lifecycles)    |                               | and retrieval snapshots in P1.| composition state-conditioned;|               |
|                |                               | P5 terminality conflicted.    | child runs for repeated tests.|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Blocker B3     | Claimed resolved via Section  | REOPENED (Defect B3): Matrix  | Detailed cross-contract audit | RESOLVED      |
| (1C.4 Compat.) | 22 matrix.                    | lacked exact section/field    | citing exact 1C.4 sections,   |               |
|                |                               | citations from frozen texts.  | entities, fields, semantics.  |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M1     | Renamed Tier 1 to "Intent and | PARTIALLY RESOLVED: Intent    | Segregated raw user text from | RESOLVED      |
| (Ground Truth) | Case Evidence".               | text not cleanly decoupled    | interpreted intent; explicit  |               |
|                |                               | from system interpretation.   | intent clarification loop.    |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M2     | Supported disjunctive causes; | REOPENED (Defect R2): Forced  | Defined 5 diagnostic variants;| RESOLVED      |
| (Unforced      | hypotheses UNEVALUATED.       | primary in contributing causes| unforced ranking; competing vs|               |
| Diagnosis)     |                               | without evidential backing.   | contributing strictly decoupled|              |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M3     | 9-outcome discriminating      | REOPENED (Defect R1): "Supports| 4-part model: Result, Validity| RESOLVED      |
| (Evidence      | evidence model.               | = confirms"; binary thinking; | Impact, Consequence. Removed  |               |
| Discrim.)      |                               | "will prove" language.        | "will prove" and forced action|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M4     | Governed knowledge gives      | RESOLVED (Reinforced): Claims | Grounding establishes prior   | RESOLVED      |
| (Governed KB)  | plausibility, not proof.      | establish plausibility only;  | plausibility only; knowledge  |               |
|                |                               | real obs survive KB gaps.     | gaps preserved as uncertainty.|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M5     | Requirements made solution-   | REOPENED (Defect R5): Leaked  | Stripped all equipment/proc   | RESOLVED      |
| (Neutral Reqs) | neutral.                      | preferred processing-location | types; requirements purely    |               |
|                |                               | recipes into requirements.    | behavioral; no location recipe|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M6     | Parsimony redefined as        | RESOLVED (Reinforced):        | Parsimony evaluates justified | RESOLVED      |
| (Parsimony)    | justified complexity.         | Parsimony evaluates purpose,  | purpose against trade-offs;   |               |
|                |                               | not simple processor count.   | no hidden penalty numbers.    |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M7     | Decoupled derivation history  | RESOLVED (Reinforced): Removed| Historical lineage acyclic;   | RESOLVED      |
| (Topology/Det) | from signal topology.         | unowned universal limits; det | signal topology governed by   |               |
|                |                               | owns declared constraints only| semantic design/platform.     |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M8     | Defined execution-relevant    | REOPENED (Defect R3): Fidelity| Fidelity (EXACT/APPROX/etc.)  | RESOLVED      |
| (Handoff)      | handoff payload.              | conflated with acceptability; | decoupled from Acceptability; |               |
|                |                               | no pre-execution blocking gate| pre-execution rejection gate. |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M9     | Working drafts vs sealed;     | REOPENED (Defect R7): Claimed | Historical reconstruction     | RESOLVED      |
| (Immutability) | AI re-execution distinguished.| "100% stable forever" without | qualified by retained data;   |               |
|                |                               | qualifying data retention.    | AI re-execution is a NEW run. |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Finding M10    | 6-dimension review matrix.    | REOPENED (Defect R4): Asserted| Review requires evidence for  | RESOLVED      |
| (Review Matrix)|                               | "reasoning sound" / "fluke"   | all 6 dimensions; bad runs CAN|               |
|                |                               | without evidence; barred lessons| submit CandidateLessons.     |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Minor m1       | Cryptographic algorithms      | RESOLVED: Hashing primitives  | Architectural integrity       | RESOLVED      |
| (Crypto Defer) | deferred to 1C.5b.            | deferred; architectural stable| mandated; concrete primitives |               |
|                |                               | identity mandated.            | deferred to Phase 1C.5b.      |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Minor m2       | Schemas marked non-normative. | REOPENED (Defect r-m3): Hidden| Schemas illustrative; removed | RESOLVED      |
| (Non-Normative)|                               | efficacy penalties in prose.  | hidden scoring and penalties. |               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+
| Minor m3       | Terminology consistency.      | REOPENED (Defect r-m2): Alias | Full terminology audit;       | RESOLVED      |
| (Terminology)  |                               | discrepancies across enums.   | Section 31 vocabulary register|               |
+----------------+-------------------------------+-------------------------------+-------------------------------+---------------+


================================================================================
SECTION 4 — FROZEN ARCHITECTURAL BASELINE
================================================================================

4.1 THE AUTHORITATIVE 21-PRINCIPLE ENGINEERING REASONING CONSTITUTION
The 21 principles of the Engineering Reasoning Constitution are frozen, authoritative,
and unalterable. They represent the supreme law of the reasoning architecture:

  1. EVIDENCE PRECEDES DIAGNOSIS:
     TT must establish what case evidence is actually available before diagnosing
     the sound. Different evidence types must not be silently conflated.

  2. OBSERVATION IS NOT INTERPRETATION:
     TT must distinguish: OBSERVATION -> INTERPRETATION -> HYPOTHESIS -> CONCLUSION.
     Measured or observed phenomena are not automatically explanations.

  3. MISSING EVIDENCE IS NOT NEGATIVE EVIDENCE:
     Failure to observe or measure something does not establish its absence.

  4. A SYMPTOM DOES NOT IDENTIFY ITS CAUSE:
     Similar perceptual symptoms may arise from different mechanisms. Terms such as
     harsh, thin, muddy, flubby, fizzy, weak attack, sterile, loose, congested must
     NOT become lookup keys for predetermined interventions.

  5. DIAGNOSIS SHOULD BE CAUSAL WHERE EVIDENCE PERMITS:
     TT should seek plausible mechanisms capable of producing the observed
     phenomenon. Causal conclusions must remain appropriately bounded by available
     evidence.

  6. COMPETING HYPOTHESES SURVIVE UNTIL EVIDENCE JUSTIFIES NARROWING THEM:
     TT must preserve multiple credible explanations where appropriate. It must not
     manufacture a single diagnosis merely because downstream execution expects one
     answer.

  7. CONTEXT INFORMS REASONING BUT DOES NOT PROVE CAUSATION:
     Genre, artist, era, production convention, known rigs and Reference Cases may
     inform hypotheses. They do not establish the cause.

  8. ENGINEERING INTENT CONSTRAINS THE SOLUTION:
     A technically valid change is not automatically the correct engineering decision.
     The intervention must be evaluated against the intended musical, sonic and
     production outcome.

  9. GENERATE ALTERNATIVES WHEN THE PROBLEM ADMITS ALTERNATIVES:
     TT must be capable of considering materially different engineering approaches
     rather than cosmetic variations of one predetermined solution.

  10. INTERVENTION SELECTION FOLLOWS DIAGNOSIS:
      Required ordering: EVIDENCE -> DIAGNOSIS -> ENGINEERING REQUIREMENT ->
      INTERVENTION CLASS -> SEMANTIC DESIGN -> PLATFORM IMPLEMENTATION.
      TT must not select equipment or parameter changes first and construct a
      rationale afterwards.

  11. INTERVENTION SHOULD OCCUR AT THE CAUSALLY APPROPRIATE POINT:
      Signal-chain location and causal stage matter. Pre- and post-nonlinear processing,
      for example, are not interchangeable simply because both can modify frequency
      response.

  12. PREDICT CONSEQUENCES BEFORE ACTING:
      An EngineeringDecision must state the expected engineering consequence of the
      selected intervention. The prediction must be sufficiently meaningful to permit
      later evaluation.

  13. EVERY INTERVENTION HAS POTENTIAL TRADE-OFFS:
      Relevant secondary consequences must be considered where material.

  14. PREFER THE LEAST UNNECESSARY INTERVENTION:
      This does NOT mean: fewer processors = better engineering. It means: do not
      introduce processing or complexity that lacks an engineering purpose supported
      by the decision.

  15. UNCERTAINTY MUST SURVIVE THE DECISION:
      Making an engineering decision does not erase unresolved uncertainty. TT must
      not create false precision merely because action is required.

  16. PLATFORM CAPABILITY MUST NOT REWRITE THE DIAGNOSIS:
      Engineering diagnosis and intent are determined upstream of target-platform
      capability. If a target platform cannot represent an intended design exactly,
      that is a translation issue. It must not retroactively alter the diagnosis.

  17. DETERMINISTIC SYSTEMS MAY VERIFY ONLY TRUTH THEY GENUINELY OWN:
      Deterministic components may validate: structural integrity, mathematical
      constraints, representation rules, known platform capability, serialization
      requirements, and other genuinely deterministic facts. They must NOT silently
      substitute professional engineering judgement.

  18. REASONING QUALITY AND OUTCOME QUALITY ARE INDEPENDENT:
      A successful outcome does not prove the reasoning was good. A poor outcome does
      not automatically prove the original decision was unreasonable. The architecture
      must permit independent review of evidence quality, hypothesis quality,
      decision quality, execution quality, and outcome quality.

  19. OUTCOME EVIDENCE UPDATES REASONING; IT DOES NOT REWRITE HISTORY:
      Original evidence, hypotheses, decisions and predictions must remain auditable.
      Later outcomes may update future reasoning but must not retroactively alter the
      historical decision record.

  20. ENGINEERING RATIONALE MUST BE AUDITABLE WITHOUT EXPOSING HIDDEN MODEL REASONING:
      TT must produce structured professional engineering rationale. This is an
      engineering decision record; it is NOT a request to expose private model
      chain-of-thought.

  21. TT MUST RECOGNISE WHEN ADDITIONAL DISCRIMINATING EVIDENCE IS MORE VALUABLE
      THAN ANOTHER INTERVENTION:
      Where available evidence cannot adequately distinguish between credible
      hypotheses, TT must be capable of identifying useful additional evidence.
      The architecture must support:
      REASON -> RECOGNISE AMBIGUITY -> SEEK DISCRIMINATING EVIDENCE -> UPDATE
      DIAGNOSIS -> INTERVENE
      rather than:
      GUESS -> TWEAK -> GUESS AGAIN.

4.2 THE FROZEN PROFESSIONAL ENGINEERING JUDGEMENT BOUNDARY
The authoritative project boundary governing Phase 1C.5 is:
    "Professional engineering judgement begins where available evidence and
     established knowledge permit more than one defensible interpretation or
     intervention."

Its responsibility is to produce a defensible engineering decision appropriate to:
  - available evidence;
  - engineering intent;
  - applicable knowledge;
  - constraints;
  - uncertainty;
  - credible alternatives;
  - trade-offs.

4.3 THE FROZEN HIGH-LEVEL DECISION LIFECYCLE
The architecture executes within the frozen lifecycle sequence:
    ENGINEERING INTENT
    ↓
    CASE EVIDENCE ASSESSMENT
    ↓
    OBSERVATION FORMATION
    ↓
    HYPOTHESIS GENERATION
    ↓
    EVIDENCE DISCRIMINATION / ADDITIONAL-EVIDENCE DECISION
    ↓
    CAUSAL DIAGNOSIS
    ↓
    ENGINEERING REQUIREMENT
    ↓
    CANDIDATE INTERVENTIONS
    ↓
    TRADE-OFF & CONSTRAINT ANALYSIS
    ↓
    ENGINEERING DECISION
    ↓
    PREDICTED OUTCOME
    ↓
    SEMANTIC TONE DESIGN
    ↓
    [DOWNSTREAM IMPLEMENTATION]
    ↓
    ACTUAL OUTCOME EVIDENCE
    ↓
    ENGINEERING REVIEW / ITERATION
'''

if __name__ == "__main__":
    print(get_sections_1_4()[:300])
