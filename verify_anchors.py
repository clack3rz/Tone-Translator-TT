with open('TT_Sound_Engineering_Knowledge_Source_and_Acquisition_Architecture_v1.1f.txt', 'r', encoding='utf-8') as f:
    text = f.read()

anchors = [
    'PHASE 1C.4b-R v1.1f',
    'Repetition without independent methodology is',
    '10. Prescriptive Recommendation: Imperative guidance ("should", "must").',
    'Empirical practices observed in specific studios must NEVER be promoted to `PHYSICAL_LAW`.',
    'was generated, evaluated for domain validity rather than ordinal superiority:\n        was generated, evaluated for domain validity rather than ordinal superiority:',
    '3. Bounded Role Assignment: Must be classified under Axis 2 as `CONTEXT_DEPENDENT_PRACTICE`',
    '5. Non-Promotability to Physical Law: Practitioner accounts are permanently barred from',
    'DECISION E: Distinguishing Independent Corroboration from Duplicated Citation Lineage',
    'FINAL VERDICT: ARCHITECTURALLY COMPLETE AS A FREEZE CANDIDATE — SPECIFICATION READY FOR PHASE 1C.4f UAT EXECUTION (PENDING FORMAL HUMAN ARCHITECTURAL REVIEW)',
    'Phase 1C.4b-R v1.1f is SPECIFICATION COMPLETE, AUDITED, AND READY FOR FORMAL FREEZE REVIEW.',
    '37. PHASE 1C.4b-R v1.1f — BOUNDED CORRECTION AUDIT'
]

for a in anchors:
    assert a in text, f'Anchor not found: {a[:50]}'

print('All 11 anchor strings positively identified in v1.1f!')
