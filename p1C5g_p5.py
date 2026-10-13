# Part 5 of Phase 1C.5g Architecture Specification v0.1
# Sections 24 to 32

PART5 = """
24. TONE TRANSLATOR SPECIFIC MIGRATION DOMAINS

To ensure exhaustive coverage of the existing codebase, Phase 1C.5g identifies fourteen concrete migration domains across Tone Translator.
These domains must be comprehensively inventoried during legacy discovery:

Domain A: Tone-Generation Prompts & Generative Reasoning
  - Includes current single-pass generation prompts, multi-pass recipe builders, and perceptual tone-shaping templates.
Domain B: Audio Feature Extraction & Interpretation Logic
  - Includes frequency centroid analysis, transient detection, RMS energy calculation, and raw spectral heuristics.
Domain C: Signal-Chain Topology Generation
  - Includes routing heuristics, serial vs. parallel split determinations, block ordering rules, and stereo bus logic.
Domain D: Gear Selection Knowledge
  - Includes heuristic selection logic for stompboxes, amplifiers, cabinets, speakers, microphones, and rack units.
Domain E: Gear Aliases & Identity Mapping
  - Includes fuzzy matching tables, historical naming aliases, brand mappings, and hardware cross-references.
Domain F: Gear Parameter Manifests & Verified Parameter Overrides
  - Includes parameter index manifests, min/max range limits, verified parameter overrides, and default settings.
Domain G: Parameter Normalization, Visual Range & Conversion Logic
  - Includes mathematical functions converting visual UI percentages (0–10) to internal DAW float values (0.0–1.0) and decibel curves.
Domain H: AT5 .at5p Export & Serialization Logic
  - Includes XML preset generation, XML node nesting, GUID injection, IKMPAK packaging, and checksum calculations.
Domain I: VIR Microphone Placement Reasoning & Calibration
  - Includes 3D volumetric speaker coordinates (X, Y, Z, distance, angle), speaker cone phase alignment, and off-axis high-frequency roll-off heuristics.
Domain J: Existing Comparison & Tuning Logic
  - Includes legacy A/B preset comparison logic, error tolerance checking, and iterative parameter tweaking scripts.
Domain K: Session & Runtime State Persistence
  - Includes browser localStorage caching, Firebase Firestore session synchronization, and run history logging.
Domain L: Error Handling, Fallbacks & Missing-Gear Handling
  - Includes catch-block default presets, missing amplifier fallback substitutions, and silent parameter clamping.
Domain M: Historical Artist/Album/Genre-Specific Tuning Heuristics
  - Includes specialized hardcoded rules developed for specific artists (e.g., AC/DC Malcolm Young studio tone heuristics), vintage genres, or album styles.
Domain N: Reference Presets & Reference Knowledge Assets
  - Includes curated reference JSON presets, benchmark audio stems, and static curriculum documents.

Governing Rule:
These fourteen domains define the discovery perimeter. The architecture does NOT assume that all assets in these domains will migrate into reasoning stages, nor does it assign final dispositions in this specification. Dispositions are assigned strictly through the governed discovery and assessment process.


25. IK MULTIMEDIA AMPLITUBE 5 PLATFORM-KNOWLEDGE SEPARATION

25.1 The Architectural Separation Mandate
One of the most critical responsibilities of Phase 1C.5g is untangling valid target-platform knowledge from invalid upstream platform leakage.
Tone Translator was historically built around IK Multimedia AmpliTube 5 (AT5). Over time, target platform constraints became deeply entangled with acoustic engineering reasoning.

25.2 Valid Downstream Platform Knowledge
The architecture explicitly recognizes that AmpliTube 5 specific knowledge is highly valuable and must be preserved:
  - Hardware model identifiers and GUIDs;
  - Parameter IDs, control indexes, and enumeration maps;
  - Legitimate parameter ranges and non-linear taper curves;
  - XML preset schema formatting and IKMPAK bundle serialization;
  - Volumetric Impulse Response (VIR) speaker cone coordinate systems and microphone capsule orientation limits;
  - Verified parameter overrides that correct known discrepancies between the AT5 UI and DAW automation.
Target Architectural Home: All valid AT5 platform knowledge is strictly isolated downstream of Stage 11, residing in DEST-DET-CONF and Stage 12 Platform Translation Plan (DEST-PLAT-TRANS).

25.3 Invalid Upstream Platform Leakage
The architecture strictly prohibits and eliminates upstream platform leakage:
  - Formulating an engineering requirement because an AT5 knob exists (violating Principle 1 & Principle 10);
  - Restricting causal diagnosis of a muddy tone to only gear models currently present in AT5;
  - Distorting perceptual acoustic requirements to match AT5 GUI parameter limitations;
  - Treating AT5 parameter numbers (e.g., "Gain = 6.2") as upstream acoustic requirements.
Target Architectural Action: All upstream platform leakage must be stopped at the Knowledge Migration Firewall and assigned to TRANSFORM or RETIRE.


26. PROMPT DECOMPOSITION & GENERATIVE REASONING MIG-OBJ-GEN

26.1 Dismantling the Monolithic Prompt
Legacy Tone Translator relies heavily on large generative prompts that ask a language model to take a user prompt (e.g., "Give me a punchy 80s hard rock guitar tone") and output complete amplifier, cabinet, and pedal parameters in a single pass.
This monolithic structure is completely incompatible with the frozen 14-stage reasoning architecture. It bypasses evidence parsing, obliterates hypothesis discrimination, conceals causal diagnosis, and erases uncertainty.

26.2 Systematic Decomposition Procedure
When a generative prompt enters the migration pipeline (MIG-OBJ-GEN):
  1. Semantic Decomposition Audit:
     The prompt is analyzed to extract embedded cognitive functions:
     - Evidence Assumptions: What input acoustic cues does the prompt assume?
     - Perceptual Interpretations: What acoustic adjectives does it translate?
     - Diagnostic Hypotheses: What causal assumptions does it make about frequency problems?
     - Engineering Requirements: What targets does it define (e.g., harmonic saturation, bandwidth)?
     - Candidate Interventions: What gear types and settings does it recommend?
     - Platform Formatting: What XML, JSON, or parameter templates does it generate?
  2. Structural Extraction & Isolation:
     - Embedded physical knowledge is extracted to Stage 08–10 constraint models;
     - Platform-specific XML templates are moved to Stage 12 translation helpers;
     - The monolithic prompt is decommissioned and assigned to RETIRE;
     - Clean, modular prompts are constructed, each constrained strictly to a single lifecycle stage (e.g., a prompt dedicated exclusively to Stage 04 Hypothesis Formation or Stage 09 Intervention Generation).
  3. Preservation of Explicit Governance:
     Private, unguided LLM "chain-of-thought" is never accepted as an architectural substitute for explicit, governed reasoning records. Only verifiable Stage 01–14 records cross the boundary.


27. DETERMINISTIC LOGIC MIGRATION & PHYSICAL CONSTRAINT VALIDATION

27.1 Role of Deterministic Code in the Frozen Architecture
Deterministic code (MIG-OBJ-DET) provides mathematical precision, reproducible conversions, and rigid physical boundary checks.
However, in the legacy codebase, deterministic code was frequently used to bypass sound engineering judgement.

27.2 Permitted Roles for Migrated Deterministic Logic
Deterministic logic is welcomed and retained when performing:
  - Physical and electrical constraint validation (e.g., verifying amplifier impedance load against cabinet impedance);
  - Unit conversions (e.g., converting milliseconds of pre-delay to beat divisions based on BPM);
  - Coordinate conversions (e.g., transforming VIR cartesian coordinates into polar microphone angles);
  - Reference lookup (e.g., mapping a gear name to its physical component topology);
  - Platform serialization (e.g., building valid XML trees).

27.3 Prohibited Roles for Deterministic Logic
In accordance with Principle 17, deterministic code is strictly PROHIBITED from:
  - Silently selecting an engineering intervention without a causal diagnosis;
  - Applying hardcoded "magic clamps" that override reasoned engineering trade-offs;
  - Overriding explicit acoustic uncertainty with arbitrary default values;
  - Silently mutating user-specified requirements.
Deterministic code that violates these rules must be assigned to TRANSFORM or RETIRE.


28. MIGRATION DEPENDENCY GRAPH, UNITS, PACKAGES & SEQUENCING

28.1 The Conceptual Migration Unit
The architecture defines the `MigrationUnit` as the smallest atom of migration governance that can independently:
  - Be discovered and inventoried;
  - Receive an approved disposition;
  - Be mapped to a target structure;
  - Be exercised in PATH-SHADOW;
  - Be validated in Phase 1C.5h;
  - Be adopted in PATH-ADOPT;
  - Be reverted in PATH-ROLLBACK.

28.2 Migration Packages for Co-Dependent Assets
Where two or more legacy assets exhibit tight circular dependencies (e.g., an amplifier model definition, its verified parameter overrides, and its bias calculation heuristic), migrating them individually would cause runtime inconsistency.
In such cases, assets are bundled into a `MigrationPackage` (PHASE_1C5G_PROPOSED). The entire package progresses through the adoption gates as a cohesive, atomic unit.

28.3 The Migration Dependency Graph
Phase 1C.5g constructs a formal Migration Dependency Graph.
This graph tracks:
  - Prerequisite configuration dependencies;
  - Downstream platform translation requirements;
  - Cross-asset heuristic couplings;
  - Target runtime engine availability dependencies.
The Migration Dependency Graph is completely distinct from the runtime reasoning DAG (Phase 1C.5a) and sealed trace graphs (Phase 1C.5f).

28.4 Recommended Migration Sequencing Principles
To minimize operational risk, migration sequencing follows an incremental, dependency-first hierarchy:
  Phase 1: Static catalogs, gear manifests, and parameter definitions (low risk, high stability);
  Phase 2: Deterministic mathematical utilities and coordinate converters;
  Phase 3: Downstream platform serialization and export adapters;
  Phase 4: Bounded, domain-specific acoustic knowledge assets;
  Phase 5: Decomposed generative prompts and modular reasoning templates;
  Phase 6: Multi-stage reasoning orchestration and shadow execution;
  Phase 7: Gated capability-by-capability production cutover.


29. CANDIDATE-LESSON INGESTION BOUNDARY & GOVERNANCE INTEGRATION

29.1 Strict Authority Boundaries
The architecture preserves the constitutional boundary established in Phases 1C.5e and 1C.5f:
  "PHASE 1C.5g DOES NOT APPROVE THE PROMOTION OF CANDIDATE LESSONS INTO AUTHORITATIVE KNOWLEDGE."

29.2 The Governed Promotion Lifecycle
  1. Generation: Candidate lessons are generated during Stage 14 Engineering Review (Phase 1C.5e) following empirical runs;
  2. Containment: Candidate lessons are immediately placed into quarantine under Phase 1C.5f governance;
  3. Authoritative Review: Independent Knowledge Governance evaluates the lesson against acoustic theory, empirical evidence, and regression risk;
  4. Governance Approval: Knowledge Governance records explicit, independently verifiable approval evidence authorizing promotion;
  5. Ingestion by 1C.5g: Phase 1C.5g migration tooling verifies the approval record and executes the technical remapping and ingestion into the target knowledge base;
  6. Empirical Handoff: The promoted lesson is delivered to Phase 1C.5h for empirical regression verification.

29.3 Firewall Rejection of Unapproved Lessons
Any automated script, runtime process, or developer attempt to ingest a candidate lesson that lacks independently verifiable Knowledge Governance approval evidence is instantly blocked by the Knowledge Migration Firewall and remanded to QUARANTINE. No particular cryptographic algorithm is mandated, but evidence must be tamper-evident and auditable.


30. PHASE 1C.5h HANDOFF ARCHITECTURE & DELIVERABLES

30.1 Clear Demarcation of Phase 1C.5h Authority
Phase 1C.5g prepares, maps, and packages migrated assets.
Phase 1C.5h alone possesses the authority to:
  - Design empirical UAT test protocols;
  - Curate golden acoustic audio fixtures and multi-track stems;
  - Execute automated and blind listening tests;
  - Score perceptual fidelity, dynamic responsiveness, and frequency balance;
  - Certify regression resistance;
  - Authorize Gate 8 Production Cutover.
Phase 1C.5g is strictly prohibited from declaring an asset "validated" or "acoustically certified."

30.2 The Migration Handoff Package
Upon satisfying Gates 1 through 7, Phase 1C.5g compiles and seals a formal `MigrationHandoffPackageRecord` containing:
  1. Migration Asset Identity & Version Metadata;
  2. Legacy Source Identifiers & Historical Execution Context;
  3. Formal Migration Disposition & Technical Rationale;
  4. Target Destination Mapping Schema;
  5. Transformation Provenance & Removed Assumptions Log;
  6. Active Migration Conflict Log (certifying zero unresolved conflicts);
  7. Explicit Uncertainty Declarations;
  8. PATH-SHADOW Execution Logs across benchmark suites;
  9. PATH-COMPARE Differential Analysis & Divergence Catalogue;
  10. Expected Intentional Behavioural Departures (explaining why new output differs from legacy);
  11. Operational Rollback Specification & Verification Proof;
  12. Recommended Phase 1C.5h Validation Criteria and Focus Areas.


31. PRODUCTION CUTOVER AUTHORITY & POST-AUTHORIZATION EXECUTION

31.1 The Authority Chain
The governance sequence for production deployment is absolute and irreversible:
  [Phase 1C.5g Prepares & Seals Gates 1–7]
              │
              ▼
  [Phase 1C.5h Executes Empirical UAT]
              │
              ▼
  [Phase 1C.5h Grants Gate 8 Cutover Authorization]
              │
              ▼
  [Phase 1C.5g Executes Governed PATH-ADOPT Cutover]

31.2 Post-Authorization Cutover Execution
Only after Phase 1C.5h issues a signed `AdoptionDecisionRecord` granting Gate 8 authorization may Phase 1C.5g execute production cutover:
  - PATH-ADOPT routing rules are updated to channel the specified traffic slice to the validated architecture;
  - Health checks and latency monitors are activated;
  - PATH-ROLLBACK triggers are primed and armed;
  - Active legacy production paths are marked as DEPRECATED if fully superseded;
  - Production deployment status is recorded in the immutable audit log.


32. MIGRATION FAILURE & DEGRADATION GOVERNANCE

The architecture provides deterministic, fail-safe handling for the fifteen migration failure conditions defined in the Design Mandate:

32.1 MIG-FAIL-01: Unidentified Legacy Dependency
An asset relies on an undocumented global variable or legacy helper.
Governance Action: Migration halted immediately; asset assigned to QUARANTINE; discovery audit re-opened.

32.2 MIG-FAIL-02: Unresolved Provenance
An asset has no verifiable origin, documentation, or author.
Governance Action: Asset barred from RETAIN; assigned to QUARANTINE or DEFER; origin investigated.

32.3 MIG-FAIL-03: Ambiguous Migration Destination
An asset addresses multiple overlapping concepts without a clear target.
Governance Action: Asset assigned to TRANSFORM for mandatory decomposition; direct mapping blocked.

32.4 MIG-FAIL-04: Frozen Architecture Conflict
An asset violates the 21 Principles or frozen stage boundaries.
Governance Action: Immediate rejection; assigned to RETIRE; historical copy preserved.

32.5 MIG-FAIL-05: Conflicting Legacy Rules
Two historical rules give contradictory instructions for the same condition.
Governance Action: Both assets assigned to QUARANTINE; referred to Knowledge Governance.

32.6 MIG-FAIL-06: Semantic Information Loss
A proposed transformation strips away critical acoustic nuances or physical constraints.
Governance Action: Transformation rejected; asset remanded to TRANSFORM for redesign.

32.7 MIG-FAIL-07: Scope Expansion / Semantic Drift
A remapped asset broadens its applicability beyond its valid domain.
Governance Action: Mapping rejected; scope strictly constrained; remanded to TRANSFORM.

32.8 MIG-FAIL-08: Shadow Comparison Infrastructure Failure
PATH-COMPARE fails to capture or compare differential outputs.
Governance Action: Shadow runs marked UNVERIFIED; advancement through Gates 4 and 5 blocked.

32.9 MIG-FAIL-09: Rollback Mechanism Failure
Automated rollback testing fails or exceeds safe operational windows.
Governance Action: Gate 6 failed; all cutover preparations locked until rollback reliability is restored.

32.10 MIG-FAIL-10: Target Dependency Unimplemented
The target stage or service in 1C.5a–f is not yet available in runtime.
Governance Action: Asset assigned to DEFER; held safely until target is deployed.

32.11 MIG-FAIL-11: Downstream Validation Unavailable
Phase 1C.5h testing harness or golden audio stems are unavailable.
Governance Action: Gate 7 handoff held in staging; production cutover prohibited.

32.12 MIG-FAIL-12: Production-Critical but Architecturally Incompatible
A legacy heuristic is vital to live production but fundamentally flawed architecturally.
Governance Action: Retained strictly in PATH-PROD; assigned to DEPRECATE; high-priority replacement reasoning scheduled in 1C.5d.

32.13 MIG-FAIL-13: Material Unexplained Divergence
PATH-SHADOW produces radically divergent parameters without causal justification in the trace.
Governance Action: Flagged for diagnostic triage; Gate 5 blocked; asset investigated.

32.14 MIG-FAIL-14: Missing Evidential Foundation
A transformed rule requires structured evidence that frontend intake cannot supply.
Governance Action: Asset assigned to DEFER or constrained to conditional execution.

32.15 MIG-FAIL-15: Unapproved Candidate Lesson Ingestion Attempt
An attempt is made to ingest an unapproved Stage 14 candidate lesson.
Governance Action: Knowledge Migration Firewall blocks ingestion; lesson quarantined; governance alert generated.

Governing Rule: Missing information must remain explicitly missing. The architecture strictly prohibits fabricating missing provenance, rationale, or test data.
"""

if __name__ == "__main__":
    print(f"Part 5 loaded, length: {len(PART5)} chars")
