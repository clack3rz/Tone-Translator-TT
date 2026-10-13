with open("TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1f.txt", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Header
header_old = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5f — REASONING TRACEABILITY, EXPLAINABILITY & GOVERNANCE ARCHITECTURE
ARCHITECTURAL SPECIFICATION (v0.1f)
FINAL CURRENT-VERSION METADATA RECONCILIATION
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1f.txt
PHASE: Phase 1C.5f (Reasoning Traceability, Explainability & Governance Architecture)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Final Current-Version Metadata Reconciliation
PREVIOUS VERSIONS:
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1a.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1b.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1c.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1d.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1e.txt [Preserved Unchanged]"""

header_new = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5f — REASONING TRACEABILITY, EXPLAINABILITY & GOVERNANCE ARCHITECTURE
ARCHITECTURAL SPECIFICATION (v0.1g)
FREEZE-CERTIFICATION RECONCILIATION
================================================================================
DOCUMENT IDENTIFIER: TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1g.txt
PHASE: Phase 1C.5f (Reasoning Traceability, Explainability & Governance Architecture)
STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED
DATE: October 2026
REVISION TYPE: Freeze-Certification Reconciliation
PREVIOUS VERSIONS:
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1a.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1b.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1c.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1d.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1e.txt [Preserved Unchanged]
  - TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1f.txt [Preserved Unchanged]"""

# 2. Section 11.2 Rule 3
rule3_old = """RULE 3: MANDATORY COMPARABILITY AUDIT:
  Before an inherited measurement is used to guide child-run decisions, a comparability check
  must be logged:
    - Did the audio source, musician performance, or recording take change?
    - Did intervening processing alter the track gain staging or frequency balance?
    - If comparability cannot be verified, fresh baseline evidence MUST be acquired."""

rule3_new = """RULE 3: MANDATORY COMPARABILITY AUDIT:
  Before an inherited measurement is used to guide child-run decisions, a comparability check
  must be logged:
    - Did the audio source, musician performance, or recording take change?
    - Did intervening processing alter the track gain staging or frequency balance?
    - If comparability cannot be established, Phase 1C.5f withholds active reliance on the
      inherited measurement and records the comparability limitation. The applicable Phase 1C.5b
      evidence-sufficiency and discriminating-evidence rules determine whether fresh or
      additional evidence is required."""

# 3. Scenario 2 Step 4
sc2_old = """4. GOVERNANCE RESOLUTION (Phase 1C.5f):
   - Inherited parent evidence remains historical, but active operational reliance on that inherited evidence is withheld; child run QUARANTINES parent baseline evidence.
   - Current child-run evidence must be acquired and re-qualified under the applicable upstream evidence rules (Phase 1C.5b Stage 01 Evidence Intake forced).
   - Trace logs explicit rationale for withholding operational reliance from parent baseline."""

sc2_new = """4. GOVERNANCE RESOLUTION (Phase 1C.5f):
   - Inherited parent evidence remains historical, but active operational reliance on that inherited evidence is withheld; child run QUARANTINES parent baseline evidence.
   - Current child-run evidence is acquired, assessed, or re-qualified as required under the applicable upstream Phase 1C.5b evidence-sufficiency and discriminating-evidence rules.
   - Trace logs explicit rationale for withholding operational reliance from parent baseline."""

# 4. Section 14.3 Criterion 4
crit4_old = """4. ABSENCE OF FALSIFYING INSTANCES: The quarantine engine must search historical traces
   for contradictory instances where the same intervention produced harmful collateral damage."""

crit4_new = """4. CONTRADICTION & COUNTEREXAMPLE ASSESSMENT: The quarantine process must search for,
   preserve, and evaluate contradictory or counterexample traces relevant to the proposed lesson.
   The existence of a counterexample does not automatically prohibit promotion; instead,
   contradictions must be reconciled through narrower applicability boundaries, preserved
   uncertainty, or rejection where the claim cannot be responsibly bounded."""

# 5. Section 16.2 Condition 3
cond3_old = """3. `GOVERNANCE_CONDITION_UNVERIFIABLE_LINEAGE`:
   - A child run's `parent_run_id` points to a run that cannot be located in the repository.
   - Handling: Treat the child run as an orphaned root run; prohibit automatic inheritance
     of parent evidence."""

cond3_new = """3. `GOVERNANCE_CONDITION_UNVERIFIABLE_LINEAGE`:
   - A child run's `parent_run_id` points to a run that cannot be located in the repository.
   - Handling: Preserve the declared `parent_run_id` and existing lineage claim unchanged.
     Mark the referenced parent artifact as unresolved or unavailable, classify the lineage
     as unverifiable, and prohibit automatic reliance on inherited parent evidence until
     the lineage can be resolved or independently verified."""

# 6. Section 16.2 Condition 9
cond9_old = """9. `GOVERNANCE_CONDITION_BROKEN_EXECUTION_CHAIN`:
   - Execution commands were dispatched, but no execution receipt or telemetry was returned.
   - Handling: Lifecycle pauses at `STATUS 23: EXECUTION_COMPLETED_AWAITING_OUT` or transitions
     to `STATUS 25: OUTCOME_UNEVALUABLE`. Prohibit manufacturing fake receipts."""

cond9_new = """9. `GOVERNANCE_CONDITION_BROKEN_EXECUTION_CHAIN`:
   - Execution commands were dispatched, but no execution receipt or telemetry was returned.
   - Handling: Phase 1C.5f records the broken execution-chain governance condition, preserves
     the absence of execution receipt or telemetry as UNKNOWN / UNVERIFIED, and exposes the trace
     limitation. The applicable frozen lifecycle status or transition is determined exclusively
     by the Phase 1C.5a lifecycle state machine and the owning upstream Phase 1C.5e
     execution/outcome rules. Prohibit manufacturing fake receipts; missing history remains missing."""

# 7. Section 16.2 Condition 10
cond10_old = """10. `GOVERNANCE_CONDITION_FIREWALL_VIOLATION`:
    - Post-action outcome evaluation records contain direct references to predicted values
      treated as observed data.
    - Handling: Fatal audit violation (Principle 18 breach). Void the evaluation."""

cond10_new = """10. `GOVERNANCE_CONDITION_FIREWALL_VIOLATION`:
    - Post-action outcome evaluation records contain direct references to predicted values
      treated as observed data.
    - Handling: Fatal audit violation (Principle 18 breach). Preserve the evaluation record
      as a historical artifact, record the Outcome Evidence Firewall violation explicitly,
      prohibit authoritative or operational reliance on the contaminated evaluation, and retain
      full traceability to the improper prediction-derived inputs. Any substantive re-evaluation
      or lifecycle response remains with the owning upstream reasoning and review authorities."""

# 8. Section 18.2 Table
table_old = """| Technology-Neutral Integrity Options  | NON_NORMATIVE_OPTIONS    | Illustrative implementation mechanisms (§15.2).             |
| `REJECTED_BY_HUMAN` / Human Overrides | PHASE_1C5F_PROPOSED      | Human review governance dispositions / metadata (§13.2, §20).|
| Quarantined Candidate Lesson States   | PHASE_1C5F_PROPOSED      | Quarantined lesson states (`STATE_QUARANTINED`, etc.; §14.2).|
| Provenance Resolution States          | PHASE_1C5F_PROPOSED      | Record-level provenance flags (`UNRESOLVED_INCOMPLETE`; §5.2)|
| Human Interaction Action Family       | PHASE_1C5F_PROPOSED      | Human-interaction governance/action tokens only; NOT        |
|                                       |                          | lifecycle statuses (`HUMAN_ACTION_EXPLICIT_APPROVAL`, etc.) |
| Execution Deviation Family            | PHASE_1C5F_PROPOSED      | Execution-lineage governance classifications only; NOT      |
|                                       |                          | lifecycle statuses (`DEVIATION_TYPE_PLATFORM_GRID_*`, etc.) |
| `COMPARABILITY_FAILED_PERFORMANCE_*`  | ILLUSTRATIVE             | Scenario-specific illustrative comparability result label;  |
|                                       |                          | not an inherited upstream token; NOT a lifecycle status.    |
+---------------------------------------+--------------------------+-------------------------------------------------------------+"""

table_new = """| Technology-Neutral Integrity Options  | ILLUSTRATIVE             | Illustrative implementation mechanisms (§15.2); non-        |
|                                       |                          | normative implementation options only.                      |
| `REJECTED_BY_HUMAN` / Human Overrides | PHASE_1C5F_PROPOSED      | Human review governance dispositions / metadata (§13.2, §20).|
| Quarantined Candidate Lesson States   | PHASE_1C5F_PROPOSED      | Quarantined lesson states (`STATE_QUARANTINED`, etc.; §14.2).|
| Provenance Resolution States          | PHASE_1C5F_PROPOSED      | Record-level provenance flags (`UNRESOLVED_INCOMPLETE`; §5.2)|
| Human Interaction Action Family       | PHASE_1C5F_PROPOSED      | Human-interaction governance/action tokens only; NOT        |
|                                       |                          | lifecycle statuses (`HUMAN_ACTION_EXPLICIT_APPROVAL`, etc.) |
| Execution Deviation Family            | PHASE_1C5F_PROPOSED      | Execution-lineage governance classifications only; NOT      |
|                                       |                          | lifecycle statuses (`DEVIATION_TYPE_PLATFORM_GRID_*`, etc.) |
| `COMPARABILITY_FAILED_PERFORMANCE_*`  | ILLUSTRATIVE             | Scenario-specific illustrative comparability result label;  |
|                                       |                          | not an inherited upstream token; NOT a lifecycle status.    |
| Relationship Edge Type Family         | PHASE_1C5F_PROPOSED      | Trace relationship semantics only; not lifecycle statuses   |
|                                       |                          | and not substantive reasoning conclusions (`PRODUCED_FROM`, |
|                                       |                          | `JUSTIFIED_BY`, `PREDICTS_FOR`, `OUTCOME_OF`, etc.; §6.2).  |
| Uncertainty Trace Classification Fam. | PHASE_1C5F_PROPOSED      | Trace-layer labels for preserving and exposing upstream     |
|                                       |                          | uncertainty; do not redefine substantive epistemic meaning  |
|                                       |                          | or sufficiency rules owned by upstream phases (§9.2).       |
| Phase 1C.5f Proposed Trace Records    | PHASE_1C5F_PROPOSED      | Trace-layer governance and metadata records introduced by   |
|                                       |                          | Phase 1C.5f (`PlatformTranslationRecord`, §17;              |
|                                       |                          | `HumanReviewRecord`, `ExecutionReceiptRecord`, etc.).       |
+---------------------------------------+--------------------------+-------------------------------------------------------------+"""

# 9. Section 21.2
s21_old = "To certify Phase 1C.5f v0.1f as an acceptable architectural baseline, reviewers must confirm:"
s21_new = "To certify Phase 1C.5f v0.1g as an acceptable architectural baseline, reviewers must confirm:"

# 10. Revision register
rev_table_end_old = """| v0.1f   | October 2026       | Sound Engineer | Final Current-Version Metadata Reconciliation:             |
|         |                    | AI Architect   | Corrects the stale Section 21.2 current-review reference   |
|         |                    |                | from v0.1d to v0.1f. No substantive architecture,          |
|         |                    |                | governance, lifecycle, scenario, vocabulary, or reasoning  |
|         |                    |                | changes.                                                   |
+---------+--------------------+----------------+------------------------------------------------------------+"""

rev_table_end_new = """| v0.1f   | October 2026       | Sound Engineer | Final Current-Version Metadata Reconciliation:             |
|         |                    | AI Architect   | Corrects the stale Section 21.2 current-review reference   |
|         |                    |                | from v0.1d to v0.1f. No substantive architecture,          |
|         |                    |                | governance, lifecycle, scenario, vocabulary, or reasoning  |
|         |                    |                | changes.                                                   |
+---------+--------------------+----------------+------------------------------------------------------------+
| v0.1g   | October 2026       | Sound Engineer | Freeze-Certification Reconciliation:                       |
|         |                    | AI Architect   | 1. Preserves declared parent lineage in §16.2 when parent  |
|         |                    |                |    artifact is missing; bars rewriting child as root run.  |
|         |                    |                | 2. Removes Phase 1C.5f lifecycle transition choice in      |
|         |                    |                |    §16.2; returns status control to Phase 1C.5a / 1C.5e.   |
|         |                    |                | 3. Replaces voiding of firewall-violating evaluations in   |
|         |                    |                |    §16.2 with historical preservation and reliance bar.    |
|         |                    |                | 4. Decouples evidence acquisition in §11.2 and Scenario 2, |
|         |                    |                |    returning acquisition decisions to Phase 1C.5b.         |
|         |                    |                | 5. Completes §18.2 concordance for edge types, uncertainty |
|         |                    |                |    trace types, and proposed records; uses valid classes.  |
|         |                    |                | 6. Replaces absolute falsifying-instance rule in §14.3     |
|         |                    |                |    with contradiction and counterexample assessment.       |
+---------+--------------------+----------------+------------------------------------------------------------+"""

# 11. Footer declaration and filename
footer_old = """22.2 ARCHITECTURAL STATUS DECLARATION
ARCHITECTURAL STATUS:
  DRAFT — ARCHITECTURAL REVIEW REQUIRED

GOVERNANCE DECLARATION:
  This document represents the Final Current-Version Metadata Reconciliation release (v0.1f) for Phase 1C.5f
  (Reasoning Traceability, Explainability & Governance Architecture).
  It operates in strict compliance with TT_Phase_1C.5f_Design_Mandate.txt and subordinate to
  frozen upstream baselines Phases 1C.5a v0.3c through 1C.5e v0.1m.
  It is submitted for independent peer review by qualified sound engineering and software
  architecture authorities.
  It is NOT marked frozen, certified, approved, UAT-passed, implementation-complete, or production-ready.
  Runtime implementation, physical database creation, and empirical UAT remain outside this
  design specification and retain their downstream ownership.

================================================================================
END OF SPECIFICATION: TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1f.txt
================================================================================"""

footer_new = """22.2 ARCHITECTURAL STATUS DECLARATION
ARCHITECTURAL STATUS:
  DRAFT — ARCHITECTURAL REVIEW REQUIRED

GOVERNANCE DECLARATION:
  This document represents the Freeze-Certification Reconciliation release (v0.1g) for Phase 1C.5f
  (Reasoning Traceability, Explainability & Governance Architecture).
  It operates in strict compliance with TT_Phase_1C.5f_Design_Mandate.txt and subordinate to
  frozen upstream baselines Phases 1C.5a v0.3c through 1C.5e v0.1m.
  It is submitted for independent peer review by qualified sound engineering and software
  architecture authorities.
  It is NOT marked frozen, certified, approved, UAT-passed, implementation-complete, or production-ready.
  Runtime implementation, physical database creation, and empirical UAT remain outside this
  design specification and retain their downstream ownership.

================================================================================
END OF SPECIFICATION: TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1g.txt
================================================================================"""

replacements = [
    ("header", header_old, header_new),
    ("rule3", rule3_old, rule3_new),
    ("sc2", sc2_old, sc2_new),
    ("crit4", crit4_old, crit4_new),
    ("cond3", cond3_old, cond3_new),
    ("cond9", cond9_old, cond9_new),
    ("cond10", cond10_old, cond10_new),
    ("table", table_old, table_new),
    ("s21", s21_old, s21_new),
    ("rev_table", rev_table_end_old, rev_table_end_new),
    ("footer", footer_old, footer_new)
]

for name, old_s, new_s in replacements:
    if old_s not in text:
        raise ValueError(f"Pattern for {name} not found in text!")
    text = text.replace(old_s, new_s, 1)
    print(f"Applied replacement: {name}")

target_fname = "TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1g.txt"
with open(target_fname, "w", encoding="utf-8") as f:
    f.write(text)

print(f"Generated {target_fname} successfully, length: {len(text)} characters")
