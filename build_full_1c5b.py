#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt
Phase 1C.5b Architectural Specification
"""

import sys
import os

from build_1c5b_p1 import get_sections_1_4
from build_1c5b_p2 import get_sections_5_8
from build_1c5b_p3 import get_sections_9_13
from build_1c5b_p4 import get_sections_14_17
from build_1c5b_p5 import get_sections_18_21
from build_1c5b_p6 import get_section_22_part1
from build_1c5b_p7 import get_section_22_part2
from build_1c5b_p8 import get_sections_23_25
from build_1c5b_p9 import get_sections_26_29

def build_v01_specification():
    parts = [
        get_sections_1_4(),
        get_sections_5_8(),
        get_sections_9_13(),
        get_sections_14_17(),
        get_sections_18_21(),
        get_section_22_part1(),
        get_section_22_part2(),
        get_sections_23_25(),
        get_sections_26_29()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Evidence_Interpretation_and_Hypothesis_Formation_v0.1.txt"
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
        "SECTION 4 — EVIDENCE INTERPRETATION PRINCIPLES & IDENTITY PRESERVATION",
        "SECTION 5 — ENGINEERING INTENT & INPUT SPECIFICITY (SISO GOVERNANCE)",
        "SECTION 6 — CASE EVIDENCE ARCHITECTURE & MULTI-MODAL INTAKE",
        "SECTION 7 — EVIDENCE PROVENANCE & OPERATIONAL REALITY",
        "SECTION 8 — EVIDENCE QUALITY & APPLICABILITY ASSESSMENT",
        "SECTION 9 — OBSERVATION FORMATION & FACTUAL GROUNDING",
        "SECTION 10 — NEGATIVE OBSERVATIONS & DETECTION LIMITS",
        "SECTION 11 — PHENOMENOLOGICAL INTERPRETATION ARCHITECTURE",
        "SECTION 12 — CONTEXTUAL EVIDENCE & PLAUSIBILITY BOUNDS",
        "SECTION 13 — KNOWLEDGE-GUIDED INTERPRETATION & THE REFERENCE FIREWALL",
        "SECTION 14 — HYPOTHESIS FORMATION ARCHITECTURE & DATA STRUCTURES",
        "SECTION 15 — COMPETING VS JOINT HYPOTHESIS RELATIONSHIPS",
        "SECTION 16 — ASSUMPTIONS, UNKNOWNS & CONFLICT MANAGEMENT",
        "SECTION 17 — ADDITIONAL-EVIDENCE DECISION & DISCRIMINATING TEST PROTOCOL",
        "SECTION 18 — NUMERICAL EVIDENCE & LINEAGE GOVERNANCE",
        "SECTION 19 — QUALITATIVE UNCERTAINTY REPRESENTATION",
        "SECTION 20 — PARTIAL, AMBIGUOUS & INSUFFICIENT EVIDENCE BEHAVIOUR",
        "SECTION 21 — HANDOFF BOUNDARY TO PHASE 1C.5c",
        "SECTION 22 — WORKED CHALLENGE SCENARIOS A–L",
        "SECTION 23 — ADVERSARIAL REVIEW (CHECKS 1–27)",
        "SECTION 24 — 21-PRINCIPLE CONSTITUTIONAL COMPLIANCE MATRIX",
        "SECTION 25 — PHASE 1C.4 KNOWLEDGE ARCHITECTURE COMPATIBILITY REVIEW",
        "SECTION 26 — PHASE 1C.5a LIFECYCLE COMPATIBILITY REVIEW",
        "SECTION 27 — OPEN / DEFERRED DECISIONS & FROZEN ROADMAP VERIFICATION",
        "SECTION 28 — ACCEPTANCE ASSESSMENT",
        "SECTION 29 — FINAL RECOMMENDATION"
    ]
    
    missing_sections = []
    for s in expected_sections:
        if s not in full_text:
            missing_sections.append(s)
            
    if missing_sections:
        print("WARNING: Missing sections:", missing_sections)
    else:
        print("Verification PASS: All 29 sections present.")

    # Scenarios A to L check
    scenarios = ["SCENARIO A", "SCENARIO B", "SCENARIO C", "SCENARIO D", "SCENARIO E", "SCENARIO F",
                 "SCENARIO G", "SCENARIO H", "SCENARIO I", "SCENARIO J", "SCENARIO K", "SCENARIO L"]
    missing_scenarios = [sc for sc in scenarios if sc not in full_text]
    if missing_scenarios:
        print("WARNING: Missing scenarios:", missing_scenarios)
    else:
        print("Verification PASS: All Scenarios A–L present.")

if __name__ == "__main__":
    build_v01_specification()
