#!/usr/bin/env python3
"""
Master assembly script for:
TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1a.txt
Phase 1C.5h Detailed Architectural Specification v0.1a
"""

import os
import sys

from p1C5h_v01a_p1 import PART1
from p1C5h_v01a_p2 import PART2
from p1C5h_v01a_p3 import PART3
from p1C5h_v01a_p4 import PART4
from p1C5h_v01a_p5 import PART5
from p1C5h_v01a_p6 import PART6
from p1C5h_v01a_p7 import PART7

def build():
    parts = [PART1, PART2, PART3, PART4, PART5, PART6, PART7]
    full_content = "".join(parts)
    
    target_path = "TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1a.txt"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(full_content)
    
    file_size = os.path.getsize(target_path)
    lines = full_content.splitlines()
    print(f"Successfully generated {target_path}")
    print(f"File size: {file_size} bytes ({file_size / 1024:.2f} KB)")
    print(f"Total lines: {len(lines)}")
    
    # Verification checks
    assert "END OF SPECIFICATION: TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1a.txt" in full_content, "Missing terminal marker!"
    assert "v0.1a — Constitutional Fidelity, Threshold Neutrality & Authority-Boundary Correction" in full_content, "Missing v0.1a title!"
    assert "DRAFT — ARCHITECTURAL REVIEW REQUIRED" in full_content, "Missing draft status!"
    assert "OVERALL CHECKLIST AUDIT RESULT: 20 / 20 PASS" in full_content, "Checklist audit missing or failed!"
    print("All verification assertions passed!")

if __name__ == "__main__":
    build()
