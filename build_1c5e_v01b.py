#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt
Phase 1C.5e — Outcome Evaluation, Iteration & Engineering Review
Surgical Architectural Patch Baseline (v0.1b)
"""

import sys
import os
import re

from builder_1c5e_b_part1 import get_part1
from builder_1c5e_b_part2 import get_part2
from builder_1c5e_b_part3 import get_part3
from builder_1c5e_b_part4 import get_part4
from builder_1c5e_b_part5 import get_part5
from builder_1c5e_b_part6 import get_part6
from builder_1c5e_b_part7 import get_part7
from builder_1c5e_b_part8 import get_part8
from builder_1c5e_b_part9 import get_part9
from builder_1c5e_b_part10 import get_part10

def build_v01b_specification():
    # 1. Verify v0.1 and v0.1a exist and record sizes
    v01_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1.txt"
    v01a_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1a.txt"
    
    if not os.path.exists(v01_path):
        print(f"ERROR: {v01_path} does not exist!")
        sys.exit(1)
    if not os.path.exists(v01a_path):
        print(f"ERROR: {v01a_path} does not exist!")
        sys.exit(1)
        
    v01_size_before = os.path.getsize(v01_path)
    v01a_size_before = os.path.getsize(v01a_path)
    
    parts = [
        get_part1(),
        get_part2(),
        get_part3(),
        get_part4(),
        get_part5(),
        get_part6(),
        get_part7(),
        get_part8(),
        get_part9(),
        get_part10()
    ]
    
    full_text = "\n\n".join(parts)
    
    target_path = "TT_Engineering_Outcome_Evaluation_Iteration_and_Review_v0.1b.txt"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    lines = full_text.splitlines()
    line_count = len(lines)
    byte_count = len(full_text.encode("utf-8"))
    
    print(f"Successfully generated {target_path}")
    print(f"Total Lines: {line_count}")
    print(f"Total Bytes: {byte_count}")
    
    # Verify v0.1 and v0.1a unchanged
    v01_size_after = os.path.getsize(v01_path)
    v01a_size_after = os.path.getsize(v01a_path)
    
    if v01_size_before != v01_size_after:
        print(f"ERROR: v0.1 modified! Before: {v01_size_before}, After: {v01_size_after}")
        sys.exit(1)
    else:
        print(f"Verified v0.1 preserved UNCHANGED ({v01_size_after} bytes).")
        
    if v01a_size_before != v01a_size_after:
        print(f"ERROR: v0.1a modified! Before: {v01a_size_before}, After: {v01a_size_after}")
        sys.exit(1)
    else:
        print(f"Verified v0.1a preserved UNCHANGED ({v01a_size_after} bytes).")
        
    # Check all 28 expected sections
    expected_sections = [
        "SECTION 1 — PURPOSE, SCOPE & GOVERNANCE BOUNDARIES",
        "SECTION 2 — ARCHITECTURAL POSITION & UPSTREAM DEPENDENCY MAP",
        "SECTION 3 — UPSTREAM RECORD IMMUTABILITY & ANTI-REWRITE ENFORCEMENT",
        "SECTION 4 — LIFECYCLE OWNERSHIP & STAGE BOUNDARIES (STAGES 11 TO 14)",
        "SECTION 5 — THE 21 FROZEN PRINCIPLES OF SOUND ENGINEERING REASONING",
        "SECTION 6 — PRE-ACTION VALIDATION, PREDICTION CONSUMPTION & SIMULATION LANE",
        "SECTION 7 — THE OUTCOME EVIDENCE FIREWALL",
        "SECTION 8 — ACTUAL OUTCOME EVIDENCE ARCHITECTURE (STAGE 13)",
        "SECTION 9 — OUTCOME COMPARISON & MULTI-DIMENSIONAL DELTA EVALUATION",
        "SECTION 10 — PRESERVATION REQUIREMENTS EVALUATION",
        "SECTION 11 — TRADE-OFF, COLLATERAL DAMAGE & UNEXPECTED EFFECT EVALUATION",
        "SECTION 12 — CAUSAL ATTRIBUTION ARCHITECTURE & CONFOUNDER GOVERNANCE",
        "SECTION 13 — TWO-LAYER OUTCOME EVALUATION MODEL: FINDINGS & ACTIONS",
        "SECTION 14 — ITERATION ARCHITECTURE & PATHWAY GOVERNANCE",
        "SECTION 15 — REFINEMENT VS ALTERNATIVE VS RE-DIAGNOSIS BOUNDARY MATRIX",
        "SECTION 16 — CHECKPOINT-AWARE REVERSION ARCHITECTURE & NON-STACKING DISCIPLINE",
        "SECTION 17 — RETURN-UPSTREAM DIRECTIVES & PARENT-CHILD RUN TRACEABILITY",
        "SECTION 18 — RETROSPECTIVE ENGINEERING REVIEW ARCHITECTURE (STAGE 14)",
        "SECTION 19 — RECORD ARCHITECTURE & PROPOSED PHASE 1C.5e SCHEMAS",
        "SECTION 20 — UNCERTAINTY SURVIVAL ACROSS EVALUATION & REVIEW",
        "SECTION 21 — HUMAN / USER EVALUATION & MULTI-TRACK COEXISTENCE",
        "SECTION 22 — FAILURE MODES & PROHIBITED ANTI-PATTERNS",
        "SECTION 23 — CROSS-PHASE INTERFACES & DOWNSTREAM INTEGRATION BOUNDARIES",
        "SECTION 24 — WORKED ARCHITECTURAL ILLUSTRATIONS (SCENARIOS 1 TO 20)",
        "SECTION 25 — CONCORDANCE REGISTRIES & VOCABULARY AUDIT TABLES",
        "SECTION 26 — v0.1a → v0.1b SURGICAL PATCH REGISTER (SP-01 THROUGH SP-10)",
        "SECTION 27 — INDEPENDENT-REVIEW CHECKLIST & CONSTITUTIONAL AUDIT",
        "SECTION 28 — OPEN DESIGN QUESTIONS, REVISION REGISTER & FINAL STATUS"
    ]
    
    missing = []
    for sec in expected_sections:
        if sec not in full_text:
            missing.append(sec)
            
    if missing:
        print(f"WARNING: Missing expected sections: {missing}")
        sys.exit(1)
    else:
        print("Verification: All 28 sections verified present in v0.1b.")
        
    # Check scenarios 1 to 20
    scenario_count = 0
    for i in range(1, 21):
        scen_tag = f"SCENARIO {i}:"
        if scen_tag in full_text:
            scenario_count += 1
        else:
            print(f"WARNING: Missing {scen_tag}")
            sys.exit(1)
            
    print(f"Verification: All {scenario_count}/20 scenarios verified present.")
    
    # Check SP-01 through SP-10
    sp_count = 0
    for i in range(1, 11):
        sp_tag = f"SP-{i:02d}"
        if sp_tag in full_text:
            sp_count += 1
        else:
            print(f"WARNING: Missing {sp_tag}")
            sys.exit(1)
            
    print(f"Verification: All {sp_count}/10 Surgical Patches (SP-01 to SP-10) verified present.")
    
    # Check status
    if "STATUS: DRAFT — ARCHITECTURAL REVIEW REQUIRED" not in full_text:
        print("ERROR: Missing required status string!")
        sys.exit(1)
    else:
        print("Verification: Status verified as DRAFT — ARCHITECTURAL REVIEW REQUIRED.")

if __name__ == "__main__":
    build_v01b_specification()
