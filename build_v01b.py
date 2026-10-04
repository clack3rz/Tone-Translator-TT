#!/usr/bin/env python3
"""
Master Builder for:
TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1b.txt
Phase 1C.5c Bounded Diagnostic-State & Scenario Consistency Correction Specification
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

def build_v01b_specification():
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
    
    target_path = "TT_Engineering_Diagnosis_and_Causal_Reasoning_v0.1b.txt"
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
        "SECTION 17 — DIAGNOSIS DISPOSITION / RESOLUTION STATUS MODEL ACROSS PHASE 1C.5c",
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
        "A DIAGNOSIS IS A CAUSAL CLAIM EARNED BY EVIDENCE",
        "MOST SUPPORTED HYPOTHESIS != DIAGNOSED CAUSE",
        "DIAGNOSIS MUST NOT BECOME A REMEDY",
        "UNCERTAINTY MUST SURVIVE THE DECISION",
        "CONTRADICTION != CROSS-DOMAIN DISCREPANCY",
        "DIAGNOSIS IS NOT THE ACT OF CHOOSING THE BEST STORY",
        "DRAFT — REQUIRES INDEPENDENT ARCHITECTURAL REVIEW",
        "READY FOR INDEPENDENT ARCHITECTURAL REVIEW"
    ]
    for p in required_phrases:
        if p not in full_text:
            print(f"WARNING: Missing key phrase: '{p}'")
        else:
            print(f"Verification PASS: Key phrase found: '{p}'")

    # Regression Checks R-C1 to R-C20 in Section 27
    regression_checks = [f"R-C{i}:" for i in range(1, 21)]
    missing_rc = [rc for rc in regression_checks if rc not in full_text]
    if missing_rc:
        print("WARNING: Missing regression checks:", missing_rc)
    else:
        print("Verification PASS: All 20 Regression Checks (R-C1 to R-C20) verified.")

    # Verification of Seven Residual Corrections (B1 to B7)
    b_checks = [
        ("B1: Orthogonality of Assumption Sensitivity and Diagnosis Disposition", "Assumption Sensitivity answers: \"How dependent is a causal claim on an assumption?\""),
        ("B2: Provisional Diagnosis Locus Invariant", "LOCUS_UNRESOLVED_MECHANISM_HYPOTHETICAL` cases can NEVER receive a provisional diagnosis"),
        ("B3: Stage 08 / Stage 07 Partitioning", "RESOLUTION DISPOSITIONS CAPABLE OF COMPLETING STAGE 08"),
        ("B4: Scenario I Locus Unresolved", "Unresolved across Instrument Electrical stage (cable loading) and Transduction stage"),
        ("B5: Scenario H Hypothetical Chain", "CONCEPTUAL CAUSAL CHAIN (HYPOTHETICAL DOWNSTREAM ELECTRICAL GENERATION)"),
        ("B6: Section 13 Cross-Domain Explanation", "Possible Cross-Domain Explanation (Correction B6)"),
        ("B7: R-C20 Non-Fabrication Acceptance Wording", "Scenarios and worked examples rely strictly on explicit case givens")
    ]
    for name, snippet in b_checks:
        if snippet not in full_text:
            print(f"WARNING: Missing B-check snippet: {name}")
        else:
            print(f"Verification PASS: {name} verified.")

    # Sweep for prohibited fabricated elements
    prohibited_items = [
        "+12 dB",
        "800 pF",
        "3.0 H",
        "explains 100%",
        "amplifier operates normally"
    ]
    found_prohibited = []
    for item in prohibited_items:
        if item in full_text:
            found_prohibited.append(item)
    if found_prohibited:
        print("WARNING: Found prohibited fabricated items:", found_prohibited)
    else:
        print("Verification PASS: Zero prohibited fabricated items found.")

if __name__ == "__main__":
    build_v01b_specification()
