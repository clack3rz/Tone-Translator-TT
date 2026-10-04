#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Intervention_Alternatives_and_Tradeoff_Reasoning_v0.1.txt
Phase 1C.5d Initial Architectural Specification
"""

import sys
import os
import re

from p1C5d_p1 import get_p1C5d_p1
from p1C5d_p2 import get_p1C5d_p2
from p1C5d_p3 import get_p1C5d_p3
from p1C5d_p4 import get_p1C5d_p4
from p1C5d_p5 import get_p1C5d_p5
from p1C5d_p6 import get_p1C5d_p6
from p1C5d_p7 import get_p1C5d_p7
from p1C5d_p8 import get_p1C5d_p8
from p1C5d_p9 import get_p1C5d_p9

def build_v01_specification():
    parts = [
        get_p1C5d_p1(),
        get_p1C5d_p2(),
        get_p1C5d_p3(),
        get_p1C5d_p4(),
        get_p1C5d_p5(),
        get_p1C5d_p6(),
        get_p1C5d_p7(),
        get_p1C5d_p8(),
        get_p1C5d_p9()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Intervention_Alternatives_and_Tradeoff_Reasoning_v0.1.txt"
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
        "SECTION 2 — SCOPE, GOVERNANCE & FROZEN UPSTREAM DEPENDENCIES",
        "SECTION 3 — PHASE 1C.5d ARCHITECTURAL BOUNDARY & LIFECYCLE OWNERSHIP",
        "SECTION 4 — THE CAUSAL DIAGNOSIS TO INTERVENTION HANDOFF CONTRACT",
        "SECTION 5 — CORE ARCHITECTURAL AXIOMS & GOVERNING PRINCIPLES",
        "SECTION 6 — ENGINEERING REQUIREMENT ARCHITECTURE & FORMULATION MODEL",
        "SECTION 7 — DEFECT CORRECTION VS CREATIVE TONE DESIGN",
        "SECTION 8 — ALTERNATIVE GENERATION ARCHITECTURE & DIVERSITY CRITERIA",
        "SECTION 9 — INTERVENTION ELIGIBILITY & CONTRAINDICATION REASONING",
        "SECTION 10 — CAUSE-DIRECTED VS COMPENSATORY INTERVENTION",
        "SECTION 11 — MINIMUM-NECESSARY INTERVENTION & PARSIMONY DISCIPLINE",
        "SECTION 12 — TRADE-OFF REASONING ARCHITECTURE (NO FAKE UTILITY FUNCTIONS)",
        "SECTION 13 — USER INTENT, TARGET SPECIFICITY & VALUE ALIGNMENT",
        "SECTION 14 — PRESERVATION REQUIREMENTS & UNINTENDED CONSEQUENCE PREVENTION",
        "SECTION 15 — COMPOUND CAUSATION & MULTI-INTERVENTION COORDINATION",
        "SECTION 16 — INTERVENTION SEQUENCING & PRE-EXECUTION CAUSAL ORDERING",
        "SECTION 17 — REVERSIBILITY, RISK & INFORMATION VALUE (DISCRIMINATING TESTS VS INTERVENTIONS)",
        "SECTION 18 — CONSTRAINT HANDLING & JUSTIFIED COMPROMISE REASONING",
        "SECTION 19 — PLATFORM NEUTRALITY & THE AT5 PLATFORM FIREWALL",
        "SECTION 20 — PLATFORM COMPROMISE EVALUATION & REJECTION OF UNACCEPTABLE COMPROMISES",
        "SECTION 21 — INTERVENTION SELECTION & JUSTIFIED ENGINEERING DECISION RATIONALE",
        "SECTION 22 — ABSTENTION, DEFERRAL & THE NO-CHANGE DECISION STATE",
        "SECTION 23 — RESIDUAL UNCERTAINTY SURVIVAL & UPSTREAM RETURN PATHS",
        "SECTION 24 — HANDOFF CONTRACT TO PHASE 1C.5e (OUTCOME PREDICTION & ITERATION)",
        "SECTION 25 — WORKED CHALLENGE SCENARIOS A–L",
        "SECTION 26 — ADVERSARIAL REVIEW SUITE (CHECKS 1–32)",
        "SECTION 27 — 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX",
        "SECTION 28 — ACCEPTANCE CRITERIA, AUDIT SWEEP & FINAL RECOMMENDATION"
    ]
    
    missing_sections = []
    for s in expected_sections:
        if s not in full_text:
            missing_sections.append(s)
            
    if missing_sections:
        print("WARNING: Missing sections:", missing_sections)
    else:
        print("Verification PASS: All 28 sections present.")

    # Scenarios A to L check
    scenarios = ["SCENARIO A", "SCENARIO B", "SCENARIO C", "SCENARIO D", "SCENARIO E", "SCENARIO F",
                 "SCENARIO G", "SCENARIO H", "SCENARIO I", "SCENARIO J", "SCENARIO K", "SCENARIO L"]
    missing_scenarios = [sc for sc in scenarios if sc not in full_text]
    if missing_scenarios:
        print("WARNING: Missing scenarios:", missing_scenarios)
    else:
        print("Verification PASS: All Scenarios A–L present.")

    # Adversarial checks 1 to 32
    missing_checks = []
    for c in range(1, 33):
        check_str = f"CHECK {c}:"
        if check_str not in full_text:
            missing_checks.append(check_str)
    if missing_checks:
        print("WARNING: Missing adversarial checks:", missing_checks)
    else:
        print("Verification PASS: All 32 Adversarial Checks present.")

    # Verbatim 21 Constitutional Principles Check
    constitutional_principles = [
        "1. Evidence Precedes Diagnosis.",
        "2. Observation is not Interpretation.",
        "3. Missing Evidence is not Negative Evidence.",
        "4. A Symptom Does Not Identify Its Cause.",
        "5. Diagnosis Should Be Causal Where Evidence Permits.",
        "6. Competing Hypotheses Survive Until Evidence Justifies Narrowing Them.",
        "7. Context Informs Reasoning but Does Not Prove Causation.",
        "8. Engineering Intent Constrains the Solution.",
        "9. Generate Alternatives When the Problem Admits Alternatives.",
        "10. Intervention Selection Follows Diagnosis.",
        "11. Intervention Should Occur at the Causally Appropriate Point.",
        "12. Predict Consequences Before Acting.",
        "13. Every Intervention Has Potential Trade-Offs.",
        "14. Parsimony: Do Not Intervene Without Justified Engineering Purpose.",
        "15. Platform Translation Operates Downstream of Engineering Reasoning.",
        "16. Reject Unacceptable Platform Compromises.",
        "17. Deterministic Code Validates Constraints; It Does Not Replace Sound Engineering Judgement.",
        "18. Evaluate Outcomes Honestly Without Circular Justification.",
        "19. Capture Engineering Experience for Governed Review.",
        "20. The Deliberation Record Must Support Independent Retrospective Audit.",
        "21. Where Evidence is Missing, Seek Discriminating Evidence Rather Than Guessing."
    ]
    missing_principles = [p for p in constitutional_principles if p not in full_text]
    if missing_principles:
        print("WARNING: Missing or non-verbatim Constitutional Principles:", missing_principles)
    else:
        print("Verification PASS: All 21 Constitutional Principles exact verbatim.")

    # Invariants and Key Rules check
    required_phrases = [
        "DO NOT START WITH THE TOOL. START WITH THE ENGINEERING REQUIREMENT.",
        "DO NOT CHOOSE AN INTERVENTION BECAUSE IT IS FAMILIAR, AVAILABLE, OR EASY.",
        "NO INTERVENTION MAY BE SELECTED WITHOUT A SUFFICIENTLY RESOLVED OR EXPLICITLY BOUNDED CAUSAL DIAGNOSIS.",
        "A PHYSICAL ANOMALY IS NOT AUTOMATICALLY A PROBLEM TO REMOVE.",
        "PHASE 1C.5d DECIDES WHAT SHOULD BE DONE.",
        "DRAFT — REQUIRES INDEPENDENT ARCHITECTURAL REVIEW",
        "READY FOR INDEPENDENT ARCHITECTURAL REVIEW"
    ]
    for p in required_phrases:
        if p not in full_text:
            print(f"WARNING: Missing key phrase: '{p}'")
        else:
            print(f"Verification PASS: Key phrase found: '{p}'")

    # Regression Checks R-D1 to R-D25 in Section 28.1
    regression_checks = [f"R-D{i}:" for i in range(1, 26)]
    missing_rd = [rd for rd in regression_checks if rd not in full_text]
    if missing_rd:
        print("WARNING: Missing regression checks:", missing_rd)
    else:
        print("Verification PASS: All 25 Regression Checks (R-D1 to R-D25) verified.")

    # Prohibited claims check (Phase 1C.5d must not declare itself frozen, passed, or signed off)
    prohibited_claims = [
        "1C.5d [FROZEN",
        "Phase 1C.5d: FROZEN",
        "STATUS: PASS",
        "STATUS: SIGNED OFF",
        "STATUS: PRODUCTION READY",
        "RECOMMENDATION: PASS",
        "RECOMMENDATION: SIGNED OFF"
    ]
    found_prohibited = []
    for pc in prohibited_claims:
        if pc in full_text:
            found_prohibited.append(pc)
    if found_prohibited:
        print("WARNING: Found prohibited status claims:", found_prohibited)
    else:
        print("Verification PASS: Zero prohibited status claims found.")

if __name__ == "__main__":
    build_v01_specification()
