#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1.txt
Phase 1C.5c Architectural Specification
"""

import sys
import os

from p1C5c_p1 import get_p1C5c_p1
from p1C5c_p2 import get_p1C5c_p2
from p1C5c_p3 import get_p1C5c_p3
from p1C5c_p4 import get_p1C5c_p4
from p1C5c_p5 import get_p1C5c_p5
from p1C5c_p6 import get_p1C5c_p6
from p1C5c_p7 import get_p1C5c_p7
from p1C5c_p8 import get_p1C5c_p8
from p1C5c_p9 import get_p1C5c_p9

def build_v01_specification():
    parts = [
        get_p1C5c_p1(),
        get_p1C5c_p2(),
        get_p1C5c_p3(),
        get_p1C5c_p4(),
        get_p1C5c_p5(),
        get_p1C5c_p6(),
        get_p1C5c_p7(),
        get_p1C5c_p8(),
        get_p1C5c_p9()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1.txt"
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
        "SECTION 3 — PHASE 1C.5c ARCHITECTURAL BOUNDARY & THE REMEDY FIREWALL",
        "SECTION 4 — DIAGNOSIS SEMANTICS & EPISTEMIC TAXONOMY",
        "SECTION 5 — CAUSAL EVIDENCE STANDARDS & SUFFICIENCY CRITERIA",
        "SECTION 6 — CAUSAL NARROWING ARCHITECTURE & ELIMINATION DISCIPLINE",
        "SECTION 7 — MULTI-CAUSE & COMPOUND DIAGNOSIS ARCHITECTURE",
        "SECTION 8 — CONCEPTUAL CAUSAL CHAIN REPRESENTATION",
        "SECTION 9 — LOCUS RESOLUTION VS MECHANISM RESOLUTION",
        "SECTION 10 — CAUSAL CONTRIBUTION REASONING (WITHOUT FAKE PRECISION)",
        "SECTION 11 — CAUSAL SUFFICIENCY & EXPLANATORY COVERAGE",
        "SECTION 12 — VALID EXCLUSION & HYPOTHESIS RETIREMENT",
        "SECTION 13 — CONTRADICTION HANDLING & DIAGNOSIS UNDER CONFLICT",
        "SECTION 14 — ASSUMPTION SENSITIVITY & LOAD-BEARING RISK",
        "SECTION 15 — KNOWLEDGE GROUNDING & THE REFERENCE CASE FIREWALL",
        "SECTION 16 — DIAGNOSIS LANGUAGE CALIBRATION & EPISTEMIC PRECISION",
        "SECTION 17 — DIAGNOSIS STATUS MODEL & QUALITATIVE UNCERTAINTY",
        "SECTION 18 — DIAGNOSIS TRACEABILITY & AUDIT RECORD CONTRACT",
        "SECTION 19 — RESIDUAL UNCERTAINTY DOSSIER AFTER DIAGNOSIS",
        "SECTION 20 — HANDOFF CONTRACT TO PHASE 1C.5d",
        "SECTION 21 — WORKED CHALLENGE SCENARIOS A–L",
        "SECTION 22 — ADVERSARIAL REVIEW SUITE (CHECKS 1–30)",
        "SECTION 23 — 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX",
        "SECTION 24 — PHASE 1C.5b COMPATIBILITY & INTERFACE REVIEW",
        "SECTION 25 — PHASE 1C.4 KNOWLEDGE ARCHITECTURE COMPATIBILITY REVIEW",
        "SECTION 26 — OPEN / DEFERRED IMPLEMENTATION DECISIONS & FROZEN ROADMAP",
        "SECTION 27 — ACCEPTANCE ASSESSMENT & SIGN-OFF CRITERIA",
        "SECTION 28 — FINAL RECOMMENDATION"
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

    # Adversarial checks 1 to 30
    missing_checks = []
    for c in range(1, 31):
        check_str = f"CHECK {c}:"
        if check_str not in full_text:
            missing_checks.append(check_str)
    if missing_checks:
        print("WARNING: Missing adversarial checks:", missing_checks)
    else:
        print("Verification PASS: All 30 Adversarial Checks present.")

    # Invariants and Key Rules check
    required_phrases = [
        "A DIAGNOSIS IS A CAUSAL CLAIM EARNED BY EVIDENCE",
        "MOST SUPPORTED HYPOTHESIS != DIAGNOSED CAUSE",
        "DIAGNOSIS MUST NOT BECOME A REMEDY",
        "UNCERTAINTY MUST SURVIVE THE DECISION",
        "DRAFT — REQUIRES INDEPENDENT ARCHITECTURAL REVIEW",
        "READY FOR INDEPENDENT ARCHITECTURAL REVIEW"
    ]
    for p in required_phrases:
        if p not in full_text:
            print(f"WARNING: Missing key phrase: '{p}'")
        else:
            print(f"Verification PASS: Key phrase found: '{p}'")

if __name__ == "__main__":
    build_v01_specification()
