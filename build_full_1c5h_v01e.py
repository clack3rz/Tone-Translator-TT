#!/usr/bin/env python3
import sys

def build():
    with open('TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1d.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    # Replacements
    # 1. Header
    h_old = text[text.find('Version: v0.1d'):text.find('1.2 Scope and Role')]
    h_new = h_old.replace('v0.1d — Gate 8 Re-Adjudication & Regression-Governance Consistency Correction', 'v0.1e — Validation PASS & Material Regression Terminology Consistency Correction')
    h_new = h_new.replace('Artifact: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1d.txt', 'Artifact: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt')
    h_new = h_new.replace('Immediate Prior Version: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1c.txt [Preserved Unchanged]', 'Immediate Prior Version: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1d.txt [Preserved Unchanged]')

    # 2. Section 23.2 PASS
    s23_old = """  1. PASS [PHASE_1C5H_PROPOSED]
     - Definition: All assigned test profiles have been executed; all objective and perceptual criteria are met; no material genuine regressions exist; rollback is proven; uncertainty is within acceptable governed tolerances for the requested scope.
     - Gate 8 Impact: Eligible for Gate 8 Production Cutover Authorization."""
    s23_new = """  1. PASS [PHASE_1C5H_PROPOSED]
     - Definition: All applicable assigned test profiles and validation criteria are satisfied; no unresolved material genuine regressions or hard blockers remain within the evaluated scope; applicable rollback requirements are satisfied; and residual uncertainty remains within governed acceptable bounds for the requested scope.
     - Gate 8 Impact: Eligible to proceed to Gate 8 adjudication. PASS does not itself authorize production cutover."""

    # 3. Table 10 Genuine Regression
    t10_old = "| GENUINE_REGRESSION | Degradation in tone, dynamics, export | Candidate is musically/technically worse | CRITICAL HARD BLOCKER; blocks Gate 8 authorization |"
    t10_new = "| GENUINE_REGRESSION | Degradation in tone, dynamics, export | Candidate is musically/technically worse | An unresolved material Genuine Regression blocks Gate 8 for the affected scope; remediation and revalidation are required before adjudication may proceed. |"

    # 4. Table 12 Regression Protection
    t12_old = "| Regression Protection | Zero unresolved genuine regressions | RegressionAssessment check | NO (Invariant 5) |"
    t12_new = "| Regression Protection | Zero unresolved material genuine regressions within the requested authorization scope | RegressionAssessment check | NO (Invariant 5) |"

    # 5. Section 42
    s42_idx = text.find('- v0.1d — Gate 8 Re-Adjudication & Regression-Governance Consistency Correction (Current):')
    s42_old = text[s42_idx:]
    
    entry_v01d_sup = """- v0.1d — Gate 8 Re-Adjudication & Regression-Governance Consistency Correction:
  Preserves the v0.1c detailed Phase 1C.5h architecture while executing four bounded internal-consistency corrections: removes automatic Gate 8 reinstatement and permanent withdrawal from the main Revalidation Flow in Section 24.3, establishing governed re-adjudication alignment with Stress Scenario 17 (revalidation produces evidence; Gate 8 re-adjudication produces authorization); corrects the Regression Classification Matrix (Table 10) so that regression classification does not itself grant Gate 8 authorization; corrects the Validation Outcome Matrix (Table 11) so that a PASS outcome specifies zero unresolved material genuine regressions and eligibility for Gate 8 adjudication rather than automatic authorization; and corrects Failure / Degradation Condition 08 so that an unexplained material divergence may be resolved as either an Intentional Architectural Correction or a Neutral Divergence where evidence supports that classification. No other substantive architecture changes. [SUPERSEDED BY v0.1e]

- v0.1e — Validation PASS & Material Regression Terminology Consistency Correction (Current):
  Preserves the v0.1d detailed Phase 1C.5h architecture while correcting three residual terminology and adjudication-consistency issues identified during architectural review. Aligns the Section 23.2 PASS definition and Gate 8 impact with Table 11 so PASS requires no unresolved material genuine regressions or hard blockers and establishes eligibility for Gate 8 adjudication rather than authorization; corrects the Table 10 Genuine Regression consequence so only an unresolved material Genuine Regression blocks Gate 8 for the affected scope; and corrects the Table 12 Regression Protection prerequisite so eligibility requires zero unresolved material genuine regressions within the requested authorization scope. No other substantive architecture changes."""

    s42_new = s42_old.replace(
        text[s42_idx:text.find('42.2 Architectural Status Declaration')].strip(),
        entry_v01d_sup.strip()
    )
    s42_new = s42_new.replace('candidate draft (v0.1d)', 'candidate draft (v0.1e)')
    s42_new = s42_new.replace('formally established as v0.1d', 'formally established as v0.1e')
    s42_new = s42_new.replace('v0.1d.txt================================================================================', 'v0.1e.txt================================================================================')

    replacements = [
        (h_old, h_new),
        (s23_old, s23_new),
        (t10_old, t10_new),
        (t12_old, t12_new),
        (s42_old, s42_new)
    ]

    for i, (old_s, new_s) in enumerate(replacements, 1):
        if text.count(old_s) != 1:
            print(f'Mismatch count for replacement {i}: {text.count(old_s)}')
            sys.exit(1)
        text = text.replace(old_s, new_s)

    with open('TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1e.txt', 'w', encoding='utf-8') as f:
        f.write(text)

    print('Build succeeded!')

if __name__ == '__main__':
    build()
