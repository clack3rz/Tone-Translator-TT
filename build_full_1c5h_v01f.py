#!/usr/bin/env python3
"""
Master assembly script for:
TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1f.txt

From:
TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt

Revision Title:
Final Regression-Blocking & Artifact-Identity Consistency Correction

Status: DRAFT — ARCHITECTURAL REVIEW REQUIRED
Authority Level: Detailed Architectural Specification
Governing Mandate: TT_Phase_1C.5h_Design_Mandate_v0.1d.txt [FROZEN]
"""

import os
import sys

def build():
    src_path = 'TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt'
    dst_path = 'TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1f.txt'

    with open(src_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Header block
    h_old = text[text.find('Version: v0.1e'):text.find('1.2 Scope and Role')]
    h_new = h_old.replace('v0.1e — Validation PASS & Material Regression Terminology Consistency Correction', 'v0.1f — Final Regression-Blocking & Artifact-Identity Consistency Correction')
    h_new = h_new.replace('Artifact: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt', 'Artifact: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1f.txt')
    h_new = h_new.replace('Immediate Prior Version: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1d.txt [Preserved Unchanged]', 'Immediate Prior Version: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt [Preserved Unchanged]')

    # 2. Section 20.3 blocks_gate_8
    b_old = '  - blocks_gate_8: Boolean (True if GENUINE_REGRESSION or UNRESOLVED_DIVERGENCE within scope).'
    b_new = '  - blocks_gate_8: Boolean (True where an unresolved material Genuine Regression or unresolved material divergence blocks the affected authorization scope under governed regression rules).'

    # 3. Section 25.2 Pillar 4
    p_old = '    - Zero material genuine regressions against PATH-PROD in production-critical behavior;'
    p_new = '    - No unresolved material genuine regressions within the requested authorization scope;'

    # 4. Section 42
    s42_idx = text.find('- v0.1e — Validation PASS & Material Regression Terminology Consistency Correction (Current):')
    s42_old = text[s42_idx:]

    entry_v01e_sup = """- v0.1e — Validation PASS & Material Regression Terminology Consistency Correction:
  Preserves the v0.1d detailed Phase 1C.5h architecture while correcting three residual terminology and adjudication-consistency issues identified during architectural review. Aligns the Section 23.2 PASS definition and Gate 8 impact with Table 11 so PASS requires no unresolved material genuine regressions or hard blockers and establishes eligibility for Gate 8 adjudication rather than authorization; corrects the Table 10 Genuine Regression consequence so only an unresolved material Genuine Regression blocks Gate 8 for the affected scope; and corrects the Table 12 Regression Protection prerequisite so eligibility requires zero unresolved material genuine regressions within the requested authorization scope. No other substantive architecture changes. [SUPERSEDED BY v0.1f]

- v0.1f — Final Regression-Blocking & Artifact-Identity Consistency Correction (Current):
  Preserves the v0.1e detailed Phase 1C.5h architecture while correcting three final residual consistency defects identified during architectural review. Refines RegressionAssessmentRecord.blocks_gate_8 so it represents current unresolved material blocking state rather than the historical existence of any Genuine Regression; aligns Production Readiness Pillar 4 with the frozen Material Regression Protection rule by requiring no unresolved material genuine regressions within the requested authorization scope; and corrects the terminal END OF SPECIFICATION artifact filename so it matches the current v0.1f document identity. No other substantive architecture changes."""

    s42_new = s42_old.replace(
        text[s42_idx:text.find('42.2 Architectural Status Declaration')].strip(),
        entry_v01e_sup.strip()
    )
    s42_new = s42_new.replace('candidate draft (v0.1e)', 'candidate draft (v0.1f)')
    s42_new = s42_new.replace('formally established as v0.1e', 'formally established as v0.1f')
    s42_new = s42_new.replace('END OF SPECIFICATION: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1d.txt', 'END OF SPECIFICATION: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1f.txt')

    replacements = [
        (h_old, h_new),
        (b_old, b_new),
        (p_old, p_new),
        (s42_old, s42_new)
    ]

    for i, (old_s, new_s) in enumerate(replacements, 1):
        if text.count(old_s) != 1:
            print(f'Mismatch for replacement {i}')
            sys.exit(1)
        text = text.replace(old_s, new_s)

    with open(dst_path, 'w', encoding='utf-8') as f:
        f.write(text)

    print(f'Successfully built {dst_path}')

if __name__ == '__main__':
    build()
