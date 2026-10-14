import textwrap
import os

def format_row(version, date, author, text_content, status_tag=None):
    lines = textwrap.wrap(text_content, width=62)
    if status_tag:
        lines.append(status_tag)
    res = []
    for i, line in enumerate(lines):
        v = version if i == 0 else ""
        d = date if i == 0 else ""
        a = author if i == 0 else ""
        res.append(f"| {v:<7} | {d:<12} | {a:<21} | {line:<62} |")
    return "\n".join(res)

def build():
    source_path = "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1e.txt"
    output_path = "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1f.txt"

    with open(source_path, "r", encoding="utf-8") as f:
        text = f.read()

    # 1. Header replacement
    old_header = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5h — IMPLEMENTATION & BUILD PLAN
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1e — Telemetry Condition Reference Final Correction
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1d.txt [Preserved Unchanged]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Source Status: FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE
Plan Status: DRAFT — IMPLEMENTATION PLANNING
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
================================================================================"""

    new_header = """================================================================================
TONE TRANSLATOR (TT) AI SOUND ENGINEER
PHASE 1C.5h — IMPLEMENTATION & BUILD PLAN
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Version: v0.1f — Formal Implementation Plan Freeze & Adoption
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1e.txt [REVIEWED TECHNICAL BASELINE — PRESERVED UNCHANGED]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Source Status: FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE
Plan Status: FROZEN — AUTHORITATIVE IMPLEMENTATION & ENGINEERING PROGRAMME BASELINE
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
================================================================================"""

    assert old_header in text, "old_header not found in source text"
    text = text.replace(old_header, new_header, 1)

    # 2. Section 1 replacement
    pos_sec1_start = text.find("1. DOCUMENT IDENTITY, PURPOSE & SCOPE")
    pos_sec1_end = text.find("It operationalizes the frozen Phase 1C.5h architecture")
    exact_old_sec1 = text[pos_sec1_start:pos_sec1_end].rstrip()

    new_sec1 = """1. DOCUMENT IDENTITY, PURPOSE & SCOPE
--------------------------------------------------------------------------------
1.1 Document Identification
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1f.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Phase: Phase 1C.5h (Empirical Validation, User Acceptance Testing, Verification & Production-Readiness Governance)
Version: v0.1f — Formal Implementation Plan Freeze & Adoption
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1e.txt [REVIEWED TECHNICAL BASELINE — PRESERVED UNCHANGED]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
Status: FROZEN — AUTHORITATIVE IMPLEMENTATION & ENGINEERING PROGRAMME BASELINE
Authority Level: Frozen Authoritative Implementation & Engineering Programme Specification
1.2 Purpose of This Plan
This frozen Implementation & Build Plan is the authoritative engineering programme baseline for Phase 1C.5h."""

    assert exact_old_sec1 in text, "exact_old_sec1 not found in source text"
    text = text.replace(exact_old_sec1, new_sec1, 1)

    # 3. Section 11 replacement
    pos_sec11_start = text.find("11. DOCUMENT CONTROL, GOVERNANCE STATUS & REVISION REGISTER")
    exact_old_sec11 = text[pos_sec11_start:]

    v01e_desc = (
        "Telemetry Condition Reference Final Correction. Applies a "
        "final narrowly bounded telemetry-reference correction to "
        "v0.1d. Removes all residual claims in WP-28 that post-cutover "
        "production-quality telemetry degradation is frozen Condition "
        "15; preserves frozen Condition 15 exactly as \"Critical Domain "
        "Remains Untested\"; binds production telemetry anomalies solely "
        "to WF-17 Post-Cutover Telemetry Governance, TRIGGER-10 "
        "revalidation, canonical invalidation linkage, "
        "Gate8ChangeRecord lifecycle governance, Phase 1C.5g rollback "
        "execution, and governed retest planning; and corrects the "
        "historical v0.1d revision-register description to accurately "
        "record that the stale Condition 15 label remained until v0.1e. "
        "No architecture, programme structure, Work Package design, "
        "telemetry logic, threshold model, Gate 8 authority boundary, "
        "MVVI design, record schema, profile, edge model, trigger "
        "catalogue, condition catalogue, or milestone structure is "
        "otherwise changed."
    )
    v01e_row = format_row(
        "v0.1e",
        "2026-10-13",
        "Lead Sound Architect",
        v01e_desc,
        "[SUPERSEDED BY v0.1f — FROZEN AUTHORITATIVE IMPLEMENTATION BASELINE]"
    )

    v01f_desc = (
        "Formal Implementation Plan Freeze & Adoption. Performs formal "
        "governance transition of the reviewed Phase 1C.5h Implementation & "
        "Build Plan from DRAFT — IMPLEMENTATION PLANNING to FROZEN — "
        "AUTHORITATIVE IMPLEMENTATION & ENGINEERING PROGRAMME BASELINE. "
        "Confirms that the technical and programme content reviewed through "
        "v0.1e has completed implementation-plan architectural fidelity "
        "review and is approved as the governing build programme for "
        "implementation of the frozen Phase 1C.5h architecture (v0.1j) under "
        "the frozen Design Mandate (v0.1d). The frozen Implementation & "
        "Build Plan defines authoritative sequencing, Work Packages, "
        "dependencies, acceptance criteria, integration boundaries, MVVI "
        "structure, validation infrastructure, and progression toward "
        "empirical validation and Gate 8 adjudication. No substantive "
        "implementation-plan content, tracks, milestones, Work Packages, "
        "schemas, profiles, triggers, conditions, or thresholds are changed."
    )
    v01f_row = format_row(
        "v0.1f",
        "2026-10-13",
        "Lead Sound Architect",
        v01f_desc,
        "Status: FROZEN — AUTHORITATIVE IMPLEMENTATION BASELINE."
    )

    # Extract prior rows up through v0.1d
    pos_prior_start = text.find("+---------+--------------+-----------------------+----------------------------------------------------------------+\n| Version | Date         | Author                | Summary of Changes / Purpose")
    pos_v01e_start = text.find("| v0.1e   | 2026-10-13   | Lead Sound Architect  | Telemetry Condition Reference Final Correction.")
    prior_rows_up_to_v01d = text[pos_prior_start:pos_v01e_start]

    new_sec11 = f"""11. DOCUMENT CONTROL, GOVERNANCE STATUS & REVISION REGISTER
--------------------------------------------------------------------------------
11.1 Document Revision Register
{prior_rows_up_to_v01d}{v01e_row}
+---------+--------------+-----------------------+----------------------------------------------------------------+
{v01f_row}
+---------+--------------+-----------------------+----------------------------------------------------------------+

11.2 Architectural Status Declaration & Formal Freeze Declaration
Artifact: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1f.txt
Title: PHASE 1C.5h — EMPIRICAL VALIDATION, USER ACCEPTANCE TESTING, VERIFICATION & PRODUCTION-READINESS GOVERNANCE IMPLEMENTATION & BUILD PLAN
Phase: Phase 1C.5h (Empirical Validation, User Acceptance Testing, Verification & Production-Readiness Governance)
Version: v0.1f — Formal Implementation Plan Freeze & Adoption
Immediate Prior Version: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1e.txt [REVIEWED TECHNICAL BASELINE — PRESERVED UNCHANGED]
Source Architecture: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt [FROZEN — AUTHORITATIVE ARCHITECTURAL BASELINE]
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN — AUTHORITATIVE CONSTITUTIONAL DESIGN MANDATE]
Status: FROZEN — AUTHORITATIVE IMPLEMENTATION & ENGINEERING PROGRAMME BASELINE
Authority Level: Frozen Authoritative Implementation & Engineering Programme Specification

FORMAL FREEZE & ADOPTION DECLARATION:
TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1f.txt is hereby FROZEN and ADOPTED as the authoritative Implementation & Engineering Programme Baseline for Phase 1C.5h.

This freeze confirms that the technical content reviewed through v0.1e has completed implementation-plan architectural fidelity review and is approved as the governing build programme for implementation of the frozen Phase 1C.5h architecture.

The frozen Implementation & Build Plan defines the authoritative sequencing, Work Packages, dependencies, implementation acceptance criteria, integration boundaries, MVVI structure, validation infrastructure programme, and progression toward empirical validation and Gate 8 adjudication.

This freeze does NOT mean that implementation is complete, empirical validation has executed, UAT has passed, Gate 8 Production Cutover Authorization has been granted, or production cutover has occurred. Specifically:
  - Runtime implementation and test-harness construction remain to be executed in accordance with the Work Packages and Milestones defined herein;
  - Empirical listening tests, acoustic metrics collection, and subjective panel evaluations have not yet convened;
  - UAT test cases and migration intake packages have not yet been evaluated;
  - Gate 8 Production Cutover Authorization has NOT been granted;
  - No production traffic has moved to PATH-ADOPT and production routing remains strictly protected on PATH-PROD;
  - Operational cutover and rollback mechanisms remain under Phase 1C.5g operational ownership.

IMPLEMENTATION PLAN FREEZE ≠ RUNTIME IMPLEMENTATION COMPLETION ≠ EMPIRICAL VALIDATION EXECUTION ≠ UAT PASS ≠ GATE 8 CUTOVER AUTHORIZATION ≠ PRODUCTION CUTOVER.

ALL SUBSYSTEM BUILDS, CODE MODULES, TEST HARNESSES, AND VALIDATION PIPELINES MUST EXECUTE IN STRICT COMPLIANCE WITH THE SEQUENCING, WORK PACKAGES, AND ACCEPTANCE CRITERIA HEREIN.
================================================================================
END OF IMPLEMENTATION PLAN: TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1f.txt
================================================================================
"""

    text = text[:pos_sec11_start] + new_sec11

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"Successfully generated {output_path} ({len(text)} bytes)")

if __name__ == "__main__":
    build()
