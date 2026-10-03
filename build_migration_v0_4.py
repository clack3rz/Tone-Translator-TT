import re
import os

with open('/app/applet/TT_Current_TT_Knowledge_Migration_Specification_v0.3.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header and Metadata Updates
content = content.replace(
    "PHASE 1C.4e-R v0.3 — CURRENT TT KNOWLEDGE MIGRATION SPECIFICATION",
    "PHASE 1C.4e-R v0.4 — CURRENT TT KNOWLEDGE MIGRATION SPECIFICATION"
)
content = content.replace(
    "Version: 0.3 — Freeze Candidate",
    "Version: 0.4 — Freeze Candidate"
)
content = content.replace(
    "Date: 2026-09-28",
    "Date: 2026-09-29"
)
content = content.replace(
    "Status: FREEZE CANDIDATE — SURGICAL PASS APPLIED & FROZEN",
    "Status: FREEZE CANDIDATE — PENDING INDEPENDENT HUMAN ARCHITECTURAL REVIEW"
)
content = content.replace(
    "Target Artifact: /TT_Current_TT_Knowledge_Migration_Specification_v0.3.txt",
    "Target Artifact: /TT_Current_TT_Knowledge_Migration_Specification_v0.4.txt"
)
content = content.replace(
    "  - /TT_Phase_1C4e_Current_TT_Knowledge_Migration_Specification_v0.3.txt\n  - /TT_Phase_1C.4e-R_v0.3_Specification.txt",
    "  - /TT_Phase_1C4e_Current_TT_Knowledge_Migration_Specification_v0.4.txt\n  - /TT_Phase_1C.4e-R_v0.4_Specification.txt"
)

# 2. Table of Contents Updates
content = content.replace(
    "SECTION 2  — THE CANONICAL MIGRATION PIPELINE & ATOMIC DECONSTRUCTION METHODOLOGY",
    "SECTION 2  — THE MIGRATION PIPELINE & ATOMIC DECONSTRUCTION METHODOLOGY"
)
content = content.replace(
    "  3.2 The 19 Canonical Migration Asset Classification Categories",
    "  3.2 The 19 Migration Asset Classification Categories"
)

# 3. Section 2 Heading Update
content = content.replace(
    "SECTION 2 — THE CANONICAL MIGRATION PIPELINE & ATOMIC DECONSTRUCTION METHODOLOGY",
    "SECTION 2 — THE MIGRATION PIPELINE & ATOMIC DECONSTRUCTION METHODOLOGY"
)

# 4. Section 3 Updates (Disciplined Terminology: Reserve 'canonical' for 1C.4a Knowledge Entities)
old_sec3_1 = """3.1 EPISTEMIC & ONTOLOGICAL PRECISION: MIGRATION METADATA VS CANONICAL KNOWLEDGE
In Current TT, code comments, prompt instructions, deterministic overrides, and UI labels
freely interchange physical facts, genre rules of thumb, and software hacks.
To construct a professional engineering knowledge system, every extracted asset must be
categorized according to what it ACTUALLY is, not what it purports to be.

CRITICAL DISTINCTION:
The 19 categories below represent MIGRATION ASSET CLASSIFICATION CATEGORIES.
They are migration intake metadata used to characterize legacy assets during triage.
They MUST NOT be confused with the 8 canonical knowledge entities (SourceDocument,
ClaimAttribution, KnowledgeClaim, CausalModel, OperationalBoundary, ConflictRecord,
ReviewRecord, CandidateLesson) defined in Phase 1C.4a.

3.2 THE 19 CANONICAL MIGRATION ASSET CLASSIFICATION CATEGORIES
Every atomic asset extracted from Current TT must be classified into exactly one of the
following 19 canonical categories:"""

new_sec3_1 = """3.1 EPISTEMIC & ONTOLOGICAL PRECISION: MIGRATION METADATA VS CANONICAL KNOWLEDGE
In Current TT, code comments, prompt instructions, deterministic overrides, and UI labels
freely interchange physical facts, genre rules of thumb, and software hacks.
To construct a professional engineering knowledge system, every extracted asset must be
categorized according to what it ACTUALLY is, not what it purports to be.

CRITICAL DISTINCTION:
The 19 categories below represent MIGRATION ASSET CLASSIFICATION CATEGORIES.
They are migration intake metadata used to characterize legacy assets during triage.
They MUST NOT be confused with the 8 canonical knowledge entities (SourceDocument,
ClaimAttribution, KnowledgeClaim, CausalModel, OperationalBoundary, ConflictRecord,
ReviewRecord, CandidateLesson) defined in Phase 1C.4a.
Migration asset categories are NOT canonical knowledge entities, and legacy assets do NOT
obtain canonical status merely by being categorized.

3.2 THE 19 MIGRATION ASSET CLASSIFICATION CATEGORIES
Every atomic asset extracted from Current TT must be classified into exactly one of the
following 19 migration asset categories:"""

content = content.replace(old_sec3_1, new_sec3_1)

# 5. Section 8.2 Risk-Proportional Evidentiary Sufficiency & Phase 1C.4d Governance Tiers
old_sec8_2 = """THE RISK-PROPORTIONAL PRINCIPLE:
Risk determines the REQUIRED EVIDENTIARY SUFFICIENCY, LEVEL OF SCRUTINY, NEED FOR INDEPENDENT
CORROBORATION, AND REVIEW BURDEN — NOT a mandatory source category:
  - Higher consequence/risk increases required evidence strength;
  - Higher consequence/risk increases scrutiny;
  - Higher consequence/risk may increase corroboration requirements;
  - Higher consequence/risk increases methodological adequacy requirements;
  - Higher consequence/risk increases review burden;
  - BUT NO risk tier mandates a particular source category."""

new_sec8_2 = """THE RISK-PROPORTIONAL PRINCIPLE & ALIGNMENT WITH PHASE 1C.4d GOVERNANCE TIERS:
Risk determines the REQUIRED EVIDENTIARY SUFFICIENCY, LEVEL OF SCRUTINY, NEED FOR INDEPENDENT
CORROBORATION, AND REVIEW BURDEN — NOT a mandatory source category:
  - High Risk (`risk_tier: HIGH`): Directly corresponds to Phase 1C.4d Tier A (High Systemic Consequence /
    Safety / Physical Equipment Hazard). Mandates highest evidentiary sufficiency, verifiable provenance,
    and rigorous dual independent expert review prior to canonical promotion.
  - Medium Risk (`risk_tier: MEDIUM`): Directly corresponds to Phase 1C.4d Tier B (Moderate-Risk Empirical /
    Device / Psychoacoustic / Studio Practice). Mandates structured scrutiny, methodological adequacy,
    and formal corroboration review.
  - Low Risk (`risk_tier: LOW`): Directly corresponds to Phase 1C.4d Tier C (Low-Risk Contextual Notes /
    Genre Conventions / Aesthetic Traditions). Mandates practitioner consensus, documented empirical
    listening logs, or reference case archives.
  - BUT NO risk tier mandates a particular source category:
    * Higher consequence/risk increases required evidence strength;
    * Higher consequence/risk increases scrutiny;
    * Higher consequence/risk increases corroboration requirements;
    * Higher consequence/risk increases methodological adequacy requirements;
    * Higher consequence/risk increases review burden;
    * BUT NO risk tier mandates a particular source type (e.g. academic paper vs schematic)."""

content = content.replace(old_sec8_2, new_sec8_2)

# 6. Schema Section 10 Field 11 Risk Tier Description
old_field11 = """   11. `risk_tier` (enum, required):
       `HIGH` (safety/physical hazard), `MEDIUM` (psychoacoustics/studio), `LOW` (genre/aesthetic).
       (Determines required evidentiary sufficiency and scrutiny burden, NOT a mandatory source type)."""

new_field11 = """   11. `risk_tier` (enum, required):
       `HIGH` (safety/physical hazard; aligns with Phase 1C.4d Tier A),
       `MEDIUM` (psychoacoustics/studio practice; aligns with Phase 1C.4d Tier B),
       `LOW` (genre/aesthetic convention; aligns with Phase 1C.4d Tier C).
       (Determines required evidentiary sufficiency and scrutiny burden, NOT a mandatory source type)."""

content = content.replace(old_field11, new_field11)

# Also update line 1219 "canonical schema:" to "formal migration record schema:"
content = content.replace("canonical schema:\n\n10.1 SCHEMA FIELD DEFINITIONS", "formal migration record schema:\n\n10.1 SCHEMA FIELD DEFINITIONS")

# 7. Specimen 3 Microphone 4D Model Architectural Owner Update
old_spec3_rec1 = """Record 1: Abstract 4D Spatial Model
  - Record ID: `MIG-SPEC3-MIC4D-001`
  - Legacy Reality: `ACTIVE_PRODUCTION`
  - Proposition: "Microphone placement relative to a loudspeaker transducer is parameterized by a
    4D spatial tuple: Radial Offset (X), Lateral Offset (Y), Distance (Z), and Incident Angle (Alpha)."
  - What It Actually Is: `SEMANTIC_REPRESENTATION`
  - Architectural Owner: `SOUND_ENGINEER_KNOWLEDGE`
  - Primary Disposition: `KEEP_CANDIDATE`
  - Secondary Annotations: []
  - Risk Tier: `LOW`
  - Epistemic Intake: Geometric representation schema; platform-independent sound engineering coordinate abstraction.
  - Provisional Provenance:
      source_id: `PROV-MIC-EARGLE-001`
      source_type: "Technical Treatise"
      citation: "SOURCE_TO_BE_ACQUIRED (e.g. Eargle, 'The Microphone Book', 3rd Edition)"
      excerpt: "EXCERPT_NOT_YET_VERIFIED — continuous geometric coordinate parameterization for microphone capture"
      methodology: "Acoustical transducer geometric analysis"
      provisional_status: "ILLUSTRATIVE / PROVISIONAL PROVENANCE — NOT YET ACQUIRED OR VALIDATED"
  - Target Destination: `src/domain/semantic_models/microphone_4d_coordinate.ts`"""

new_spec3_rec1 = """Record 1: Abstract 4D Spatial Model
  - Record ID: `MIG-SPEC3-MIC4D-001`
  - Legacy Reality: `ACTIVE_PRODUCTION`
  - Proposition: "Microphone placement relative to a loudspeaker transducer is parameterized by a
    4D spatial tuple: Radial Offset (X), Lateral Offset (Y), Distance (Z), and Incident Angle (Alpha)."
  - What It Actually Is: `SEMANTIC_REPRESENTATION`
  - Architectural Owner: `SEMANTIC_TONE_DESIGN`
  - Primary Disposition: `KEEP_CANDIDATE`
  - Secondary Annotations: []
  - Risk Tier: `LOW`
  - Epistemic Intake: Geometric representation schema; platform-independent sound engineering coordinate abstraction
    for signal capture topology (owned by SEMANTIC_TONE_DESIGN). Decoupled from physical polar attenuation
    causal physics (Record 2, owned by SOUND_ENGINEER_KNOWLEDGE).
  - Provisional Provenance:
      source_id: `PROV-MIC-EARGLE-001`
      source_type: "Technical Treatise"
      citation: "SOURCE_TO_BE_ACQUIRED (e.g. Eargle, 'The Microphone Book', 3rd Edition)"
      excerpt: "EXCERPT_NOT_YET_VERIFIED — continuous geometric coordinate parameterization for microphone capture"
      methodology: "Acoustical transducer geometric analysis"
      provisional_status: "ILLUSTRATIVE / PROVISIONAL PROVENANCE — NOT YET ACQUIRED OR VALIDATED"
  - Target Destination: `src/domain/semantic_models/microphone_4d_coordinate.ts`"""

content = content.replace(old_spec3_rec1, new_spec3_rec1)

# 8. Handoff Gates and Stale Reference Cleanup
content = content.replace(
    "GATE 2: MIGRATION SPECIFICATION FREEZE (THIS PHASE — 1C.4e-R v0.3)",
    "GATE 2: MIGRATION SPECIFICATION FREEZE (THIS PHASE — 1C.4e-R v0.4)"
)
content = content.replace(
    "This specification completes Phase 1C.4e-R v0.3.",
    "This specification completes Phase 1C.4e-R v0.4."
)
content = content.replace(
    "- Following independent human architectural review and formal acceptance of v0.2:",
    "- Following independent human architectural review and formal acceptance of v0.4:"
)
content = content.replace(
    "END OF SPECIFICATION: /TT_Current_TT_Knowledge_Migration_Specification_v0.3.txt",
    "END OF SPECIFICATION: /TT_Current_TT_Knowledge_Migration_Specification_v0.4.txt"
)

# Destination paths
paths = [
    "/app/applet/TT_Current_TT_Knowledge_Migration_Specification_v0.4.txt",
    "/app/applet/TT_Phase_1C4e_Current_TT_Knowledge_Migration_Specification_v0.4.txt",
    "/TT_Current_TT_Knowledge_Migration_Specification_v0.4.txt",
    "/TT_Phase_1C4e_Current_TT_Knowledge_Migration_Specification_v0.4.txt"
]

for p in paths:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully wrote {p} ({len(content)} chars, {len(content.splitlines())} lines)")

