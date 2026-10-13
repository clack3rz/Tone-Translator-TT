with open("TT_Engineering_Reasoning_Traceability_Explainability_and_Governance_v0.1g.txt") as f:
    text = f.read()

import re

print("=== Section 14.2 ===")
idx = text.find("14.2")
print(text[idx:idx+1800])

print("\n=== Section 17.6 ===")
idx = text.find("QuarantinedCandidateLessonRecord")
print(text[idx-50:idx+600])

print("\n=== Section 18.2 candidate lesson states row ===")
idx = text.find("Quarantined Candidate Lesson States")
print(text[idx-50:idx+250])

print("\n=== NON_NORMATIVE occurrences ===")
for m in re.finditer(r"NON_NORMATIVE[A-Z_]*", text):
    start = max(0, m.start()-40)
    end = min(len(text), m.end()+40)
    print(f"{m.group(0)}: {text[start:end].replace(chr(10), ' ')}")

