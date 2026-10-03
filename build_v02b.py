#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2b.txt
Phase 1C.5b-R v0.2b Final Bounded Correction (Freeze Candidate)
"""

import sys
import os

from v02b_p1 import get_v02b_p1
from v02b_p2 import get_v02b_p2
from v02b_p3 import get_v02b_p3
from v02b_p4 import get_v02b_p4
from v02b_p5 import get_v02b_p5
from v02b_p6 import get_v02b_p6
from v02b_p7 import get_v02b_p7
from v02b_p8 import get_v02b_p8
from v02b_p9 import get_v02b_p9

def build_v02b_specification():
    parts = [
        get_v02b_p1(),
        get_v02b_p2(),
        get_v02b_p3(),
        get_v02b_p4(),
        get_v02b_p5(),
        get_v02b_p6(),
        get_v02b_p7(),
        get_v02b_p8(),
        get_v02b_p9()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.2b.txt"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    lines = full_text.splitlines()
    line_count = len(lines)
    byte_count = len(full_text.encode("utf-8"))
    
    print(f"Successfully generated {target_path}")
    print(f"Total Lines: {line_count}")
    print(f"Total Bytes: {byte_count}")
    
    # Verification checks
    expected_sections = [
        "SECTION 1 — EXECUTIVE SUMMARY",
        "SECTION 2 — SCOPE & FROZEN DEPENDENCIES",
        "SECTION 3 — PHASE 1C.5b ARCHITECTURAL BOUNDARY",
        "SECTION 4 — EVIDENCE INTERPRETATION PRINCIPLES, EXTENSIBLE IDENTITIES & PROVENANCE",
        "SECTION 5 — ENGINEERING INTENT & INPUT SPECIFICITY (SISO GOVERNANCE)",
        "SECTION 6 — CASE EVIDENCE ARCHITECTURE & MULTI-MODAL INTAKE",
        "SECTION 7 — EVIDENCE PROVENANCE & OPERATIONAL REALITY",
        "SECTION 8 — EVIDENCE QUALITY & QUESTION-RELATIVE SUFFICIENCY ASSESSMENT",
        "SECTION 9 — OBSERVATION FORMATION & FACTUAL GROUNDING",
        "SECTION 10 — NEGATIVE OBSERVATIONS & DETECTION LIMITS",
        "SECTION 11 — PHENOMENOLOGICAL INTERPRETATION ARCHITECTURE",
        "SECTION 12 — CONTEXTUAL EVIDENCE & PLAUSIBILITY BOUNDS",
        "SECTION 13 — KNOWLEDGE-GUIDED INTERPRETATION & THE REFERENCE FIREWALL",
        "SECTION 14 — HYPOTHESIS FORMATION ARCHITECTURE & EXTENSIBLE LOCUS MODEL",
        "SECTION 15 — COMPETING VS JOINT HYPOTHESIS RELATIONSHIPS",
        "SECTION 16 — ASSUMPTIONS, UNKNOWNS & CONFLICT MANAGEMENT",
        "SECTION 17 — ADDITIONAL-EVIDENCE DECISION & DISCRIMINATING TEST PROTOCOL",
        "SECTION 18 — NUMERICAL EVIDENCE & LINEAGE GOVERNANCE",
        "SECTION 19 — QUALITATIVE UNCERTAINTY REPRESENTATION",
        "SECTION 20 — PARTIAL, AMBIGUOUS & INSUFFICIENT EVIDENCE BEHAVIOUR",
        "SECTION 21 — HANDOFF BOUNDARY TO PHASE 1C.5c",
        "SECTION 22 — WORKED CHALLENGE SCENARIOS A–L",
        "SECTION 23 — ADVERSARIAL REVIEW (CHECKS 1–42 PLUS REGRESSION SUITE R1–R20)",
        "SECTION 24 — 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX (CORRECTION FB-1)",
        "SECTION 25 — PHASE 1C.4 KNOWLEDGE ARCHITECTURE COMPATIBILITY REVIEW",
        "SECTION 26 — PHASE 1C.5a LIFECYCLE COMPATIBILITY REVIEW",
        "SECTION 27 — OPEN / DEFERRED DECISIONS & FROZEN ROADMAP VERIFICATION",
        "SECTION 28 — ACCEPTANCE ASSESSMENT",
        "SECTION 29 — FINAL RECOMMENDATION"
    ]
    
    missing_sections = [s for s in expected_sections if s not in full_text]
    if missing_sections:
        print("ERROR: Missing sections:", missing_sections)
        sys.exit(1)
    else:
        print("Verification PASS: All 29 sections present.")

    # Scenarios A to L check
    scenarios = ["SCENARIO A", "SCENARIO B", "SCENARIO C", "SCENARIO D", "SCENARIO E", "SCENARIO F",
                 "SCENARIO G", "SCENARIO H", "SCENARIO I", "SCENARIO J", "SCENARIO K", "SCENARIO L"]
    missing_scenarios = [sc for sc in scenarios if sc not in full_text]
    if missing_scenarios:
        print("ERROR: Missing scenarios:", missing_scenarios)
        sys.exit(1)
    else:
        print("Verification PASS: All Scenarios A–L present.")

    # Check 21 principles verbatim from Phase 1C.5a v0.3c Section 4.1
    principles = [
        "Principle 1: Evidence Precedes Diagnosis.",
        "Principle 2: Observation is not Interpretation.",
        "Principle 3: Missing Evidence is not Negative Evidence.",
        "Principle 4: A Symptom Does Not Identify Its Cause.",
        "Principle 5: Diagnosis Should Be Causal Where Evidence Permits.",
        "Principle 6: Competing Hypotheses Survive Until Evidence Justifies Narrowing Them.",
        "Principle 7: Context Informs Reasoning but Does Not Prove Causation.",
        "Principle 8: Engineering Intent Constrains the Solution.",
        "Principle 9: Generate Alternatives When the Problem Admits Alternatives.",
        "Principle 10: Intervention Selection Follows Diagnosis.",
        "Principle 11: Intervention Should Occur at the Causally Appropriate Point.",
        "Principle 12: Predict Consequences Before Acting.",
        "Principle 13: Every Intervention Has Potential Trade-Offs.",
        "Principle 14: Parsimony: Do Not Intervene Without Justified Engineering Purpose.",
        "Principle 15: Platform Translation Operates Downstream of Engineering Reasoning.",
        "Principle 16: Reject Unacceptable Platform Compromises.",
        "Principle 17: Deterministic Code Validates Constraints; It Does Not Replace Sound Engineering Judgement.",
        "Principle 18: Evaluate Outcomes Honestly Without Circular Justification.",
        "Principle 19: Capture Engineering Experience for Governed Review.",
        "Principle 20: The Deliberation Record Must Support Independent Retrospective Audit.",
        "Principle 21: Where Evidence is Missing, Seek Discriminating Evidence Rather Than Guessing."
    ]
    missing_principles = [p for p in principles if p not in full_text]
    if missing_principles:
        print("ERROR: Missing principles:", missing_principles)
        sys.exit(1)
    else:
        print("Verification PASS: All 21 frozen principles present verbatim.")

    # Check regression checks R1 to R20
    for i in range(1, 21):
        r_tag = f"R{i}"
        if f"| {r_tag} " not in full_text and f"| {r_tag}  " not in full_text and f"| {r_tag}|" not in full_text:
            print(f"ERROR: Missing regression check {r_tag}")
            sys.exit(1)
    print("Verification PASS: Regression suite R1–R20 checked.")

    # Check final recommendation string
    if "READY FOR INDEPENDENT FREEZE REVIEW" not in full_text:
        print("ERROR: Final recommendation does not contain 'READY FOR INDEPENDENT FREEZE REVIEW'")
        sys.exit(1)
    else:
        print("Verification PASS: Final recommendation 'READY FOR INDEPENDENT FREEZE REVIEW' verified.")

if __name__ == "__main__":
    build_v02b_specification()
