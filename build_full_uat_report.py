#!/usr/bin/env python3
"""
Master Builder for:
TT_Phase_1C4f_Knowledge_Architecture_UAT_Report_v1.0.txt
Tone Translator (TT) Phase 1C.4f — Knowledge Architecture UAT & Sign-Off Report
"""

import os
import sys

def main():
    target_path = "/app/applet/TT_Phase_1C4f_Knowledge_Architecture_UAT_Report_v1.0.txt"
    print(f"Generating {target_path}...")

    # We will import or call module builders
    import uat_report_sections_1_3
    import uat_report_scenarios_1_10
    import uat_report_scenarios_11_20
    import uat_report_tests_a_j
    import uat_report_sections_6_10

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(uat_report_sections_1_3.get_content())
        f.write("\n\n")
        f.write(uat_report_scenarios_1_10.get_content())
        f.write("\n\n")
        f.write(uat_report_scenarios_11_20.get_content())
        f.write("\n\n")
        f.write(uat_report_tests_a_j.get_content())
        f.write("\n\n")
        f.write(uat_report_sections_6_10.get_content())
        f.write("\n")

    size = os.path.getsize(target_path)
    with open(target_path, "r", encoding="utf-8") as f:
        line_count = len(f.readlines())

    print(f"Successfully generated {target_path}")
    print(f"File size: {size} bytes, Line count: {line_count} lines")

if __name__ == "__main__":
    main()
