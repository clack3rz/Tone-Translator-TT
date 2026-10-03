#!/usr/bin/env python3
"""
Sections 1 to 4 for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.2.txt
"""

def get_sections_1_4():
    return '''================================================================================
TONE TRANSLATOR (TT)
PHASE 1C.5a-R v0.2: ENGINEERING REASONING ARCHITECTURE & DECISION LIFECYCLE
CONSTITUTIONAL ALIGNMENT CORRECTION
SPECIFICATION v0.2 — CANDIDATE FOR INDEPENDENT ARCHITECTURAL REVIEW
PROFESSIONAL SOUND ENGINEER FOUNDATION
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.2.txt
VERSION: v0.2 (Bounded Constitutional Alignment Correction)
PREVIOUS VERSION: v0.1 (Verdict: HOLD — Architecturally Promising, But Not Yet Constitutionally Aligned)
DATE: 2026-09-29
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
  - TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.1.txt (Phase 1C.5a Baseline)
GOVERNANCE MANDATE:
  - BOUNDED ARCHITECTURAL CORRECTION ONLY: Resolves contradictions identified in v0.1 review.
  - THIS IS NOT A REDESIGN: Preserves accepted architectural direction and core paradigm.
  - THIS IS NOT AN IMPLEMENTATION PHASE: No production source code, test suites, or DB schemas.
  - THIS IS NOT A PROMPT-ENGINEERING EXERCISE: No prompt templates or LLM instructions.
  - THIS IS NOT A CURRENT-TT MIGRATION PHASE: No migration execution or legacy deprecation.
  - THIS IS NOT AN AT5 DESIGN PHASE: No AmpliTube 5 gear IDs, presets, or XML mappings.
  - FROZEN CONSTITUTION: All 21 Principles remain authoritative, unalterable requirements.
  - FROZEN PROFESSIONAL JUDGEMENT BOUNDARY: Authoritative and unalterable.
================================================================================

TABLE OF CONTENTS
================================================================================
1. REVISION SUMMARY
2. INDEPENDENT REVIEW FINDINGS REGISTER
3. BOUNDED CORRECTION REGISTER
4. FROZEN ARCHITECTURAL BASELINE
5. CORRECTED REASONING ARCHITECTURE
6. CORRECTED CONTRACT / RECORD MODEL
7. CONTRACT NECESSITY & OWNERSHIP MATRIX
8. CORRECTED DECISION LIFECYCLE
9. PARTIAL LIFECYCLE / ABSTENTION MODEL
10. EVIDENCE / OBSERVATION / INTERPRETATION BOUNDARY
11. HYPOTHESIS LIFECYCLE
12. DISCRIMINATING EVIDENCE ARCHITECTURE
13. CAUSAL DIAGNOSIS ARCHITECTURE
14. ENGINEERING REQUIREMENT ARCHITECTURE
15. CANDIDATE INTERVENTION ARCHITECTURE
16. CONSTRAINT & TRADE-OFF REASONING
17. ENGINEERING DECISION & PREDICTED OUTCOME
18. SEMANTIC TONE DESIGN HANDOFF
19. OUTCOME EVIDENCE & ENGINEERING REVIEW
20. IMMUTABILITY / REVISION / HISTORICAL RECONSTRUCTION / RE-EXECUTION
21. AI JUDGEMENT VS DETERMINISTIC JURISDICTION
22. PHASE 1C.4 INTERFACE COMPATIBILITY MATRIX
23. CHALLENGE SCENARIOS A–J
24. PARTIAL TRACE DEMONSTRATIONS P1–P10
25. 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX
26. ADVERSARIAL REVIEW
27. OPEN QUESTIONS / DEFERRED DECISIONS
28. PHASE 1C.5a ACCEPTANCE ASSESSMENT
29. FINAL RECOMMENDATION
================================================================================


================================================================================
SECTION 1 — REVISION SUMMARY
================================================================================

1.1 PURPOSE & MANDATE OF v0.2
Phase 1C.5a v0.1 established a comprehensive, platform-independent foundation
for the Tone Translator (TT) AI Sound Engineer. However, independent architectural
review returned:
    HOLD — ARCHITECTURALLY PROMISING, BUT NOT YET CONSTITUTIONALLY ALIGNED.

The review identified specific contradictions between the frozen 21-principle
Engineering Reasoning Constitution, the frozen Phase 1C.4 Knowledge Architecture,
and the actual data contracts, state transitions, and challenge walkthroughs in v0.1.

This revision (v0.2) executes a BOUNDED ARCHITECTURAL CORRECTION. Its sole purpose
is to bring every contract, lifecycle state, observation rule, hypothesis transition,
diagnostic synthesis, and review assessment into strict, uncompromised alignment
with the frozen upstream baselines.

1.2 PRESERVATION OF CORE ARCHITECTURAL PARADIGM
The core paradigm established in v0.1 is preserved and reinforced:
  - EVIDENCE PRECEDES DIAGNOSIS.
  - OBSERVATION IS NOT INTERPRETATION.
  - A SYMPTOM DOES NOT IDENTIFY ITS CAUSE.
  - DIAGNOSIS IS CAUSAL, NOT LOOKUP-BASED.
  - PROFESSIONAL JUDGEMENT BEGINS WHERE EVIDENCE PERMITS MULTIPLE DEFENSIBLE SOLUTIONS.
  - UNCERTAINTY SURVIVES THE DECISION.

1.3 SUMMARY OF MAJOR CORRECTIONS IN v0.2
  1. Blocker B1 Resolved (Observation Purity): Strict separation between Case
     Evidence, Observation, Interpretation, Hypothesis, and Causal Diagnosis.
     Eliminated invented measurements from verbal descriptions and removed causal
     mechanisms from ObservationRecords.
  2. Blocker B2 Resolved (Valid Partial Lifecycles): Engineered first-class support
     for early pause, abstention, diagnostic deadlock, intent clarification, and
     unsupported platform execution without inventing phantom downstream records.
  3. Blocker B3 Resolved (Phase 1C.4 Compatibility Matrix): Formally verified
     reasoning integration against all eight canonical Phase 1C.4 entities,
     preserving OperationalBoundaries, epistemic states, conflict structures, and
     the Reference Case firewall.
  4. Finding M1 Resolved ("Ground Truth" Epistemic Correction): Renamed Tier 1 to
     "ENGINEERING INTENT AND CASE EVIDENCE". User intent and raw evidence now
     explicitly acknowledge uncertainty, ambiguities, and potential user error.
  5. Finding M2 Resolved (Unforced Primary Causes): Causal diagnosis supports
     disjunctive competing causes, multiple contributing causes, and bounded
     residual uncertainty without forcing a singular primary cause.
  6. Finding M3 Resolved (Non-Binary Evidence Discrimination): Evidence requests
     now accommodate multi-valued real-world outcomes (inconclusive, confounded,
     invalid, new phenomenon discovered, unavailable). Removed the assumption that
     unavailable evidence forces a reversible intervention.
  7. Finding M4 Resolved (Governed Knowledge Epistemic Discipline): Governed
     KnowledgeClaims provide physical plausibility and boundaries; they do not
     prove causation in a specific case. Handled knowledge library gaps gracefully.
  8. Finding M5 Resolved (Solution-Neutral Requirements): Stripped all processor
     types, equipment names, and plugin classes from EngineeringRequirement.
  9. Finding M6 / Principle 14 Resolved (Parsimony Redefined): Corrected the rule
     that fewer processors equals better engineering. Parsimony evaluates engineering
     purpose and justified complexity rather than simple block count.
  10. Finding M7 Resolved (Topology vs Lifecycle vs History): Explicitly decoupled
      acyclic historical record lineage from iterative reasoning lifecycles and
      signal processing topologies. Removed unowned universal deterministic limits.
  11. Finding M8 Resolved (Semantic Tone Design Handoff): Handoff preserves
      execution-relevant obligations, intent priorities, and acceptable approximation
      boundaries without transferring private deliberative scratchpads.
  12. Finding M9 Resolved (Immutability, Revision & Replay): Defined sealed records,
      supersession, and lineage. Distinguished historical reconstruction from
      AI re-execution; removed unprovable claims of 100% deterministic replay.
  13. Finding M10 Resolved (Dual-Track Review Independence): EngineeringReview
      independently evaluates evidence quality, hypothesis quality, diagnosis
      quality, decision quality, execution quality, and outcome quality.
  14. Finding M10 / Section 17 Resolved (Contract Decomposition Justification):
      Documented the architectural necessity, producer, consumer, and lifecycle
      for every independent record contract.
  15. Minor Findings m1-m3 Resolved: Deferred cryptographic implementation choices;
      marked schemas as non-normative / illustrative; resolved all terminology
      inconsistencies.


================================================================================
SECTION 2 — INDEPENDENT REVIEW FINDINGS REGISTER
================================================================================

Below is the definitive disposition table for all findings identified during
the independent architectural review of v0.1:

+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| Finding | v0.1 Defect                       | v0.2 Architectural Correction     | Affected Sections  | Status    |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| B1      | Unsupported interpretation and    | Strict 6-tier epistemic taxonomy: | Sections 6, 10,    | RESOLVED  |
|         | causal claims entered Observation | Case Evidence -> Observation ->   | 23 (Scenarios A-J) |           |
|         | records and challenge scenarios.  | Interpretation -> Hypothesis ->   |                    |           |
|         | Invented numbers from user text.  | Causal Diagnosis. No invented     |                    |           |
|         | Asserted "Johnson noise", "power  | metrics. Every observation cites  |                    |           |
|         | sag", "spectral problem" directly.| method, observer, limitations.    |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| B2      | ReasoningTrace required downstream| First-class support for valid     | Sections 6, 8, 9,  | RESOLVED  |
|         | records even when lifecycle paused| partial lifecycles (P1-P10). Early| 24 (Traces P1-P10) |           |
|         | or abstained early, violating     | termination, pause, abstention,   |                    |           |
|         | the Constitution.                 | and deadlock without inventing    |                    |           |
|         |                                   | phantom downstream records.       |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| B3      | Compatibility with frozen 1C.4    | Dedicated 1C.4 Interface          | Section 22         | RESOLVED  |
|         | specifications was claimed but not| Compatibility Matrix covering all |                    |           |
|         | cross-verified against actual     | 8 canonical entities, 3 axes,     |                    |           |
|         | contracts.                        | boundaries, and firewalls.        |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M1      | Tier 1 was misclassified as       | Renamed Tier 1 to "ENGINEERING    | Sections 6, 7, 10  | RESOLVED  |
|         | "Ground Truth". User intent and   | INTENT AND CASE EVIDENCE". Intent |                    |           |
|         | evidence can be flawed or biased. | preserves original text separate  |                    |           |
|         |                                   | from interpretation.              |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M2      | Causal diagnosis forced selection | Support for disjunctive competing | Sections 6, 11, 13,| RESOLVED  |
|         | of a primary cause even when      | causes, multiple contributing     | 23 (Scenario J)    |           |
|         | evidence was disjunctive. Hypo-   | causes, and bounded uncertainty.  |                    |           |
|         | theses defaulted to ACTIVE_CRED.  | Hypotheses start as UNEVALUATED.  |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M3      | Evidence discrimination assumed   | Replaced binary test model with   | Sections 6, 12,    | RESOLVED  |
|         | binary IF A ELSE B outcome, and   | multi-outcome space (inconclusive,| 23, 24             |           |
|         | forced reversible intervention    | confounded, invalid, etc.).       |                    |           |
|         | when evidence was unavailable.    | Unavailable evidence allows       |                    |           |
|         |                                   | abstention, waiting, or no change.|                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M4      | v0.1 text implied that a governed | Clarified that governed knowledge | Sections 9, 11, 13,| RESOLVED  |
|         | KnowledgeClaim "proves" a cause   | provides physical plausibility    | 22                 |           |
|         | in this specific case.            | and boundaries, not proof. Real   |                    |           |
|         |                                   | observations survive KB gaps.     |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M5      | EngineeringRequirement leaked     | Stripped all equipment, processor | Sections 6, 14, 23 | RESOLVED  |
|         | solutions (e.g. "apply surgical   | classes, and plugin types from    |                    |           |
|         | post-EQ", "use expander").        | requirement contracts. Reqs are   |                    |           |
|         | Closed enums acted as recipes.    | purely functional behavioral deltas|                   |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M6 / P14| Parsimony was misconstrued as     | Corrected Principle 14 enforcement| Sections 6, 15, 23 | RESOLVED  |
|         | "fewest processors", disqualifying| Parsimony evaluates engineering   |                    |           |
|         | multi-block interventions.        | purpose and justified complexity  |                    |           |
|         |                                   | across acoustic/dynamic axes.     |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M7      | Conflated acyclic history graphs  | Decoupled historical derivation   | Sections 6, 8, 20, | RESOLVED  |
|         | with signal topologies. Asserted  | (acyclic lineage) from reasoning  | 21                 |           |
|         | unowned universal limits (+24 dB, | lifecycle (iterative) and signal  |                    |           |
|         | 20Hz-20kHz) under deterministic.  | topology (governed by design).    |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M8      | Semantic Tone Design handoff either| Handoff transfers execution-     | Sections 6, 18, 24 | RESOLVED  |
|         | leaked deliberation scratchpads or| relevant obligations, priorities, |                    |           |
|         | dropped critical execution context| and approximation boundaries.     |                    |           |
|         | Ignored fidelity model.           | Unacceptable approx escalates.    |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M9      | Contradiction between immutable   | Defined working drafts vs sealed  | Sections 6, 20     | RESOLVED  |
|         | records and updating workspaces.  | immutable records. Distinguished  |                    |           |
|         | Promised 100% deterministic replay| historical reconstruction from AI |                    |           |
|         | of AI professional judgement.     | re-execution (creates new run).   |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M10     | Outcome review used 2x2 binary    | 6-dimension independent review:   | Sections 6, 19, 24 | RESOLVED  |
|         | matrix (Good/Bad), inferring      | evidence, hypothesis, diagnosis,  |                    |           |
|         | diagnosis quality from outcome.   | decision, execution, outcome.     |                    |           |
|         |                                   | Non-scalar qualitative states.    |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| M10/S17 | Arbitrary "13 contracts" target;  | Contract Necessity Matrix proves  | Section 7          | RESOLVED  |
|         | individual record necessity was   | justification, lifecycle, owners, |                    |           |
|         | not rigorously justified.         | and consumers for every contract. |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| m1      | Prematurely mandated SHA-256 and  | Stated architectural requirements | Sections 6, 20, 27 | RESOLVED  |
|         | cryptographic hashing mechanisms. | (stable identity, immutability,   |                    |           |
|         |                                   | integrity); deferred algorithms.  |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| m2      | Concrete TypeScript interfaces    | Marked all schemas as             | Sections 6, 14, 27 | RESOLVED  |
|         | appeared normative; closed enums. | NON-NORMATIVE / ILLUSTRATIVE.     |                    |           |
|         |                                   | Made taxonomies extensible.       |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+
| m3      | Inconsistencies in contract counts| Reconciled all names, contracts,  | All Sections       | RESOLVED  |
|         | and enum references.              | enums, and prose across document. |                    |           |
+---------+-----------------------------------+-----------------------------------+--------------------+-----------+


================================================================================
SECTION 3 — BOUNDED CORRECTION REGISTER
================================================================================

For every architectural modification applied between v0.1 and v0.2, the defect,
governing principle, architectural solution, and verification confirmation are
recorded below:

--------------------------------------------------------------------------------
Correction C1: Epistemic Purification of Observations (Blocker B1)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (ObservationRecord), Section 8, Section 24.
- Governing Requirement: Principle 1 (Evidence Precedes Diagnosis), Principle 2
  (Observation is not Interpretation), Principle 4 (Symptom does not identify cause).
- Defect: v0.1 allowed causal interpretations ("Johnson noise", "power sag",
  "spectral problem") to be asserted as observations, and converted user verbal
  descriptions into fabricated FFT decibel figures without scenario evidence.
- Correction: Restructured `ObservationRecord` to mandate an explicit `observation_type`
  (`USER_REPORTED_PHENOMENON`, `LISTENER_PERCEIVED_PHENOMENON`, `MEASURED_PHENOMENON`,
  or `DERIVED_OBSERVATION`). Required explicit pointers to source evidence items,
  measurement methods, producing processes, and observer limitations. Causal
  mechanisms are strictly prohibited in observation text. Challenge scenarios
  were revised so that all numerical metrics are explicitly declared as scenario-
  supplied measurements.
- Consequential Changes: Hypothesis generation now explicitly cites observations
  as phenomena to be explained, rather than echoing them as proven facts.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C2: Support for Valid Partial Lifecycles & Abstention (Blocker B2)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (ReasoningTrace), Section 7, Section 23.
- Governing Requirement: Principle 21 (Discriminating evidence recognition),
  Section 11 (Failure / Abstention Behavior).
- Defect: v0.1 treated the 13-record sequence as a mandatory linear container,
  forcing the generation of downstream records (e.g. Decisions, Predictions) even
  when reasoning legitimately halted at intent clarification or evidence abstention.
- Correction: Replaced the monolithic container assumption with a state-aware
  `EngineeringReasoningTrace` that supports valid partial lifecycles. Defined
  explicit lifecycle states (`INTENT_CLARIFICATION_REQUIRED`, `EVIDENCE_INSUFFICIENT_ABSTAINED`,
  `PAUSED_FOR_DISCRIMINATING_EVIDENCE`, `DIAGNOSTIC_DEADLOCK`, `JUSTIFIED_NO_CHANGE`,
  `PLATFORM_UNSUPPORTED_HALTED`, etc.). Downstream records are generated ONLY
  when upstream entry conditions are genuinely satisfied.
- Consequential Changes: Added 10 formal Partial Trace demonstrations (P1–P10).
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C3: Cross-Contract Verification Against Phase 1C.4 (Blocker B3)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 2, Section 9, Section 22.
- Governing Requirement: Upstream Phase 1C.4 Knowledge Architecture Freeze.
- Defect: v0.1 asserted compatibility with Phase 1C.4 without documenting explicit
  interface alignments against the 8 canonical Phase 1C.4 entities, the 3-axis
  taxonomy, or the Reference Case firewall.
- Correction: Executed a formal cross-contract audit and established Section 22
  (Phase 1C.4 Interface Compatibility Matrix), proving complete alignment with
  `SourceDocument`, `ClaimAttribution`, `KnowledgeClaim`, `OperationalBoundary`,
  `CausalModel`, `ConflictRecord`, `ReviewRecord`, and `CandidateLesson`.
- Consequential Changes: Clarified that governed knowledge claims inform prior
  plausibility but never substitute for case evidence.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C4: Neutralization of "Ground Truth" Terminology (Finding M1)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6, Section 8.
- Governing Requirement: Principle 1, Principle 3, Principle 7.
- Defect: Describing Tier 1 inputs as "Ground Truth" conferred false epistemic
  certainty upon unvetted user text, uncalibrated audio, and subjective requests.
- Correction: Renamed Tier 1 to "ENGINEERING INTENT AND CASE EVIDENCE". Structurally
  separated user-supplied intent from TT's interpreted intent. Added explicit
  capture limitations and uncertainty registries to `CaseEvidenceAssessmentRecord`.
- Consequential Changes: Removed all downstream references to "ground truth".
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C5: Unforced Primary Mechanisms in Diagnosis (Finding M2)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (CausalDiagnosisRecord), Section 12, Section 24.
- Governing Requirement: Principle 5 (Causal diagnosis), Principle 6 (Competing
  hypotheses survive until evidence justifies narrowing), Principle 15 (Uncertainty).
- Defect: v0.1 mandated a `primary_mechanism` field even when the diagnosis was
  classified as `DISJUNCTIVE_COMPETING_CAUSES`, forcing artificial certainty.
- Correction: Redesigned `CausalDiagnosisRecord` to support five structural forms:
  `SUFFICIENTLY_SUPPORTED_PRIMARY`, `MULTIPLE_CONTRIBUTING_CAUSES`,
  `UNRESOLVED_COMPETING_CAUSES`, `BOUNDED_DIAGNOSIS_WITH_RESIDUAL_UNCERTAINTY`,
  and `NO_ADEQUATELY_SUPPORTED_DIAGNOSIS`. When competing causes survive, the
  selection of a primary cause is strictly prohibited. Hypotheses initialize in
  an `UNEVALUATED_CANDIDATE` state.
- Consequential Changes: Downstream intervention planning accommodates disjunctive
  interventions or no-change decisions.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C6: Realistic Multi-Valued Evidence Discrimination (Finding M3)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (DiscriminatingEvidenceRequestRecord), Section 11.
- Governing Requirement: Principle 21.
- Defect: v0.1 used a binary "IF Outcome A THEN Hypo 1 ELSE Hypo 2" model, and
  prescribed that unavailable evidence automatically forces a reversible intervention.
- Correction: Expanded evidence discrimination to handle multi-valued outcomes
  (supports A, weakens A, supports both, contradicts all, inconclusive, invalid,
  confounded, new phenomenon, unavailable, declined). Removed the forced reversible
  intervention rule: when evidence is unavailable, TT may choose to seek other
  evidence, act under bounded uncertainty, wait, preserve current state, make no
  change, or abstain.
- Consequential Changes: Discriminating evidence records now specify confounders,
  controlled/uncontrolled variables, and observation limits.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C7: Solution-Neutral Engineering Requirements (Finding M5)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (EngineeringRequirementRecord), Section 13.
- Governing Requirement: Principle 10 (Intervention follows diagnosis), Principle 8.
- Defect: Requirements specified implementation solutions (e.g. "apply post-capture
  surgical EQ", "insert expander"), preselecting tools before candidate generation.
- Correction: Stripped all equipment, processor classes, and plugin types from
  `EngineeringRequirementRecord`. Requirements now state purely behavioral,
  acoustic, and dynamic deltas (e.g. "Attenuate unwanted 100-180 Hz energy accumulation
  prior to nonlinear clipping while preserving steady-state low-end body").
- Consequential Changes: All candidate interventions are generated downstream of
  the requirement, allowing true material alternatives.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C8: Proper Parsimony Formulation (Finding M6 / Principle 14)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 15.
- Governing Requirement: Principle 14 (Prefer least unnecessary intervention).
- Defect: v0.1 stated that if one processor can achieve the primary result, a
  multi-block intervention is disqualified, conflating parsimony with block count.
- Correction: Redefined parsimony evaluation to assess engineering purpose and
  justified complexity. A multi-stage intervention (e.g. gentle pre-gain low cut
  combined with slight mic repositioning) is valid if each element serves a
  justified acoustic role with fewer collateral trade-offs than a brutal single-block fix.
- Consequential Changes: Trade-off evaluation explicitly weighs collateral degradation
  against processing elegance.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C9: Decoupling Derivation History from Signal Topology (Finding M7)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6, Section 21.
- Governing Requirement: Principle 17 (Deterministic systems verify truth they own).
- Defect: v0.1 declared that signal chains are universally acyclic and imposed
  universal limits (+24 dB gain, 20Hz-20kHz) under deterministic validation.
- Correction: Explicitly separated historical derivation lineage (which is acyclic)
  from signal chain topology (which may permit feedback loops if supported by
  the platform and semantic design). Removed unowned universal limits; deterministic
  code enforces only declared contract constraints.
- Consequential Changes: Clarified deterministic vs AI professional boundaries.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C10: Semantic Tone Design Handoff Context Preservation (Finding M8)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6, Section 18.
- Governing Requirement: Principle 16 (Platform capability must not rewrite diagnosis).
- Defect: Handoff was described either as an empty shell or risked leaking internal
  deliberation. Did not account for the frozen translation fidelity model.
- Correction: Defined precise handoff payload: carries decision ID, requirement ID,
  intended behavior, intent priorities, non-negotiable preservation constraints,
  and acceptable approximation boundaries. Bars internal deliberation scratchpads.
  Integrated the four-tier fidelity model (EXACT, APPROXIMATED, DEFAULTED, UNSUPPORTED);
  approximations outside acceptable boundaries trigger escalation to engineering review.
- Consequential Changes: Platform translation compromises escalate back without
  rewriting upstream diagnosis.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C11: Multi-Dimensional Independent Review Matrix (Finding M10)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6 (EngineeringReviewRecord), Section 19.
- Governing Requirement: Principle 18 (Reasoning quality and outcome quality are
  independent), Principle 19.
- Defect: v0.1 used a simplistic 2x2 Good/Bad matrix that risked binary thinking
  and conflated execution fidelity with reasoning quality.
- Correction: Established an independent 6-dimension evaluation framework:
  (1) Evidence Quality, (2) Hypothesis Quality, (3) Diagnosis Quality, (4) Decision
  Quality, (5) Execution Quality, and (6) Outcome Quality. Evaluated via non-scalar
  qualitative states (`SUPPORTED`, `QUESTIONABLE`, `UNSUPPORTED`, `UNKNOWN`, `UNEVALUABLE`).
- Consequential Changes: Poor outcomes caused by platform translation failures are
  now clearly distinguished from diagnostic errors.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C12: Deferral of Cryptographic Implementation Mechanisms (Minor m1)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6, Section 20.
- Governing Requirement: Phase 1C.5a Scope Boundary (Architecture only).
- Defect: v0.1 mandated specific hashing algorithms (SHA-256) and digital signature
  mechanisms prematurely.
- Correction: Elevated the requirement to architectural invariants (stable identity,
  version lineage, post-sealing immutability, tamper detection); deferred specific
  hash primitives to Phase 1C.5b.
- Consequential Changes: Removed hardcoded algorithm names from schemas.
- Unrelated Architecture Changed: None.

--------------------------------------------------------------------------------
Correction C13: Non-Normative Schema Designation & Open Taxonomies (Minor m2)
--------------------------------------------------------------------------------
- Affected v0.1 Sections: Section 6, Section 14.
- Governing Requirement: Architectural Specification Discipline.
- Defect: TypeScript schemas appeared as rigid runtime implementations with
  closed enums acting as recipe lookup keys.
- Correction: Explicitly marked all structural schemas as NON-NORMATIVE /
  ILLUSTRATIVE. Converted domain taxonomies into extensible classification models.
- Consequential Changes: Emphasized qualitative reasoning over enum matching.
- Unrelated Architecture Changed: None.


================================================================================
SECTION 4 — FROZEN ARCHITECTURAL BASELINE
================================================================================

4.1 THE 21 AUTHORITATIVE CONSTITUTIONAL PRINCIPLES
The following 21 principles are frozen, authoritative, and non-negotiable. They
govern the architecture without exception:

  1. EVIDENCE PRECEDES DIAGNOSIS
     TT must establish what case evidence is actually available before diagnosing
     the sound. Different evidence types must not be silently conflated.

  2. OBSERVATION IS NOT INTERPRETATION
     TT must distinguish: OBSERVATION -> INTERPRETATION -> HYPOTHESIS -> CONCLUSION.
     Measured or observed phenomena are not automatically explanations.

  3. MISSING EVIDENCE IS NOT NEGATIVE EVIDENCE
     Failure to observe or measure something does not establish its absence.

  4. A SYMPTOM DOES NOT IDENTIFY ITS CAUSE
     Similar perceptual symptoms may arise from different mechanisms. Terms such
     as harsh, thin, muddy, flubby, fizzy, weak attack, sterile, loose, congested
     must NOT become lookup keys for predetermined interventions.

  5. DIAGNOSIS SHOULD BE CAUSAL WHERE EVIDENCE PERMITS
     TT should seek plausible mechanisms capable of producing the observed
     phenomenon. Causal conclusions must remain appropriately bounded by available
     evidence.

  6. COMPETING HYPOTHESES SURVIVE UNTIL EVIDENCE JUSTIFIES NARROWING THEM
     TT must preserve multiple credible explanations where appropriate. It must
     not manufacture a single diagnosis merely because downstream execution expects
     one answer.

  7. CONTEXT INFORMS REASONING BUT DOES NOT PROVE CAUSATION
     Genre, artist, era, production convention, known rigs and Reference Cases
     may inform hypotheses. They do not establish the cause.

  8. ENGINEERING INTENT CONSTRAINS THE SOLUTION
     A technically valid change is not automatically the correct engineering
     decision. The intervention must be evaluated against the intended musical,
     sonic and production outcome.

  9. GENERATE ALTERNATIVES WHEN THE PROBLEM ADMITS ALTERNATIVES
     TT must be capable of considering materially different engineering approaches
     rather than cosmetic variations of one predetermined solution.

  10. INTERVENTION SELECTION FOLLOWS DIAGNOSIS
      Required ordering: EVIDENCE -> DIAGNOSIS -> ENGINEERING REQUIREMENT ->
      INTERVENTION CLASS -> SEMANTIC DESIGN -> PLATFORM IMPLEMENTATION.
      TT must not select equipment or parameter changes first and construct a
      rationale afterwards.

  11. INTERVENTION SHOULD OCCUR AT THE CAUSALLY APPROPRIATE POINT
      Signal-chain location and causal stage matter. Pre- and post-nonlinear
      processing, for example, are not interchangeable simply because both can
      modify frequency response.

  12. PREDICT CONSEQUENCES BEFORE ACTING
      An EngineeringDecision must state the expected engineering consequence of
      the selected intervention. The prediction must be sufficiently meaningful
      to permit later evaluation.

  13. EVERY INTERVENTION HAS POTENTIAL TRADE-OFFS
      Relevant secondary consequences must be considered where material.

  14. PREFER THE LEAST UNNECESSARY INTERVENTION
      This does NOT mean: fewer processors = better engineering. It means: do not
      introduce processing or complexity that lacks an engineering purpose
      supported by the decision.

  15. UNCERTAINTY MUST SURVIVE THE DECISION
      Making an engineering decision does not erase unresolved uncertainty.
      TT must not create false precision merely because action is required.

  16. PLATFORM CAPABILITY MUST NOT REWRITE THE DIAGNOSIS
      Engineering diagnosis and intent are determined upstream of target-platform
      capability. If a target platform cannot represent an intended design exactly,
      that is a translation issue. It must not retroactively alter the diagnosis.

  17. DETERMINISTIC SYSTEMS MAY VERIFY ONLY TRUTH THEY GENUINELY OWN
      Deterministic components may validate: structural integrity, mathematical
      constraints, representation rules, known platform capability, serialization
      requirements, and other genuinely deterministic facts. They must NOT
      silently substitute professional engineering judgement.

  18. REASONING QUALITY AND OUTCOME QUALITY ARE INDEPENDENT
      A successful outcome does not prove the reasoning was good. A poor outcome
      does not automatically prove the original decision was unreasonable.
      The architecture must permit independent review of evidence quality,
      hypothesis quality, decision quality, execution quality, and outcome quality.

  19. OUTCOME EVIDENCE UPDATES REASONING; IT DOES NOT REWRITE HISTORY
      Original evidence, hypotheses, decisions and predictions must remain auditable.
      Later outcomes may update future reasoning but must not retroactively alter
      the historical decision record.

  20. ENGINEERING RATIONALE MUST BE AUDITABLE WITHOUT EXPOSING HIDDEN MODEL REASONING
      TT must produce structured professional engineering rationale. This is an
      engineering decision record; it is NOT a request to expose private model
      chain-of-thought.

  21. TT MUST RECOGNISE WHEN ADDITIONAL DISCRIMINATING EVIDENCE IS MORE VALUABLE
      THAN ANOTHER INTERVENTION
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
