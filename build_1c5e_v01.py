#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt
Phase 1C.5e — Outcome Evaluation, Iteration & Engineering Review
Initial Design Baseline (v0.1)
"""

import sys
import os
import re

from p1C5e_p1 import get_p1C5e_p1
from p1C5e_p2 import get_p1C5e_p2
from p1C5e_p3 import get_p1C5e_p3
from p1C5e_p4 import get_p1C5e_p4
from p1C5e_p5 import get_p1C5e_p5
from p1C5e_p6 import get_p1C5e_p6
from p1C5e_p7 import get_p1C5e_p7
from p1C5e_p8 import get_p1C5e_p8
from p1C5e_p9 import get_p1C5e_p9

def build_v01_specification():
    parts = [
        get_p1C5e_p1(),
        get_p1C5e_p2(),
        get_p1C5e_p3(),
        get_p1C5e_p4(),
        get_p1C5e_p5(),
        get_p1C5e_p6(),
        get_p1C5e_p7(),
        get_p1C5e_p8(),
        get_p1C5e_p9()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    lines = full_text.splitlines()
    line_count = len(lines)
    byte_count = len(full_text.encode("utf-8"))
    
    print(f"Successfully generated {target_path}")
    print(f"Total Lines: {line_count}")
    print(f"Total Bytes: {byte_count}")
    
    # Audit verification checks
    expected_sections = [
        "SECTION 1 — PURPOSE AND SCOPE",
        "SECTION 2 — ARCHITECTURAL POSITION",
        "SECTION 3 — UPSTREAM DEPENDENCIES & IMMUTABILITY RULES",
        "SECTION 4 — LIFECYCLE OWNERSHIP & BOUNDARIES",
        "SECTION 5 — GOVERNING PRINCIPLES & CONSTITUTIONAL INVARIANTS",
        "SECTION 6 — PREDICTION CONSUMPTION",
        "SECTION 7 — OUTCOME EVIDENCE FIREWALL",
        "SECTION 8 — ACTUAL OUTCOME EVIDENCE ARCHITECTURE",
        "SECTION 9 — OUTCOME COMPARISON AND EVALUATION",
        "SECTION 10 — PRESERVATION REQUIREMENTS EVALUATION",
        "SECTION 11 — TRADE-OFF AND UNEXPECTED OUTCOME EVALUATION",
        "SECTION 12 — CAUSAL ATTRIBUTION ARCHITECTURE",
        "SECTION 13 — OUTCOME DISPOSITION TAXONOMY",
        "SECTION 14 — ITERATION ARCHITECTURE",
        "SECTION 15 — REFINEMENT VS RE-DIAGNOSIS BOUNDARY MATRIX",
        "SECTION 16 — REVERSION ARCHITECTURE",
        "SECTION 17 — RETURN-UPSTREAM RULES",
        "SECTION 18 — ENGINEERING REVIEW ARCHITECTURE (STAGE 14)",
        "SECTION 19 — RECORD ARCHITECTURE & CONTRACT SPECIFICATIONS",
        "SECTION 20 — UNCERTAINTY HANDLING ACROSS EVALUATION & REVIEW",
        "SECTION 21 — HUMAN / USER EVALUATION & MULTI-TRACK COEXISTENCE",
        "SECTION 22 — FAILURE MODES & PROHIBITED ANTI-PATTERNS",
        "SECTION 23 — CROSS-PHASE BOUNDARIES",
        "SECTION 24 — WORKED ARCHITECTURAL CHALLENGE SCENARIOS",
        "SECTION 25 — COMPLIANCE, SELF-AUDIT & REGRESSION ANALYSIS",
        "SECTION 26 — OPEN QUESTIONS & DOWNSTREAM DEPENDENCIES",
        "SECTION 27 — REVISION REGISTER",
        "SECTION 28 — FINAL STATUS"
    ]
    
    missing = []
    for sec in expected_sections:
        if sec not in full_text:
            missing.append(sec)
            
    if missing:
        print(f"WARNING: Missing expected sections: {missing}")
    else:
        print("ALL 28 SECTIONS VERIFIED PRESENT.")
        
    # Check 15 scenarios
    scenario_count = 0
    for i in range(1, 16):
        scen_tag = f"SCENARIO {i}:"
        if scen_tag in full_text:
            scenario_count += 1
        else:
            print(f"WARNING: Missing {scen_tag}")
            
    print(f"Verified Scenarios: {scenario_count}/15 present.")
    
    # Check Status wording
    if "DRAFT — ARCHITECTURAL REVIEW REQUIRED" in full_text:
        print("Status check: DRAFT — ARCHITECTURAL REVIEW REQUIRED confirmed.")
    else:
        print("WARNING: Status wording mismatch.")

if __name__ == '__main__':
    build_v01_specification()
