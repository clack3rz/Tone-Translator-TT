# Part 2 of Phase 1C.5g Architecture Specification v0.1a
# Sections 7 to 11

PART2 = """
7. MIGRATION ESTATE DISCOVERY & ASSET IDENTITY MODEL

7.1 Discovery Architecture & Imperative
Migration governance cannot control what has not first been discovered.
The architecture establishes a comprehensive Legacy Estate Discovery framework designed to audit and index all existing Tone Translator assets across the codebase, configuration files, prompt repositories, and documentation.

7.2 Conceptual Migration Asset Identity (migration_asset_id)
Every legacy asset identified during discovery is assigned a stable, unique, technology-neutral migration asset identity:
  `migration_asset_id` (PHASE_1C5G_PROPOSED conceptual vocabulary)

This identity is immutable once assigned. It persists across all migration stages, tracking the asset through remapping, transformation, shadowing, validation, and final disposition.
The architecture does NOT prescribe a specific technical implementation for this identity (such as UUIDv4, UUIDv7, ULID, or database auto-increment keys). Any implementation that guarantees uniqueness, stability, and referential integrity is architecturally compliant.

7.3 Conceptual LegacyEstateInventory
The discovery process populates the conceptual `LegacyEstateInventory`.
Each inventory entry conceptually maintains the following governance metadata:
  1. migration_asset_id: Unique conceptual migration asset identifier;
  2. legacy_source_identifier: Exact codebase file path, function name, prompt template name, or data key;
  3. asset_name: Human-readable descriptive name of the legacy asset;
  4. asset_type: Syntactic category (e.g., system prompt, heuristic function, lookup table, clamp constant, error handler);
  5. migration_object_class: Formal assignment to one of the six migration object classes (Section 8);
  6. discovered_version: Historical version, Git commit hash, or modification date where known;
  7. source_provenance: Authorship, documentation reference, historical commit message, or origin notes;
  8. operational_owner_domain: Current subsystem domain (e.g., amplifier modeling, mic placement, catalog normalization);
  9. current_production_dependency: Boolean flag and dependency details indicating whether PATH-PROD actively relies on this asset;
  10. runtime_criticality: Qualitative assessment of operational failure impact (HIGH, MEDIUM, LOW);
  11. known_consumers: List of services, components, or UI views that invoke or reference this asset;
  12. known_dependencies: Upstream libraries, files, globals, or assumptions required by this asset;
  13. current_behaviour_summary: Exact description of what the asset does at runtime in current TT;
  14. known_assumptions: Implicit acoustic or runtime assumptions embedded within the asset;
  15. known_fallbacks: Hidden defaults, catch-block returns, or fail-soft behaviours in the asset;
  16. known_platform_coupling: Direct couplings to IK Multimedia AmpliTube 5 IDs, XML structures, or DAW quirks;
  17. known_reasoning_stage_coupling: Legacy mixing of distinct reasoning stage concerns;
  18. evidential_basis: Acoustic or engineering evidence supporting the asset's existence;
  19. known_uncertainty: Explicit documentation of gaps in knowledge, missing provenance, or unverified claims;
  20. historical_usage_info: Empirical frequency of execution, user feedback, or preset usage if known;
  21. candidate_disposition: Proposed initial migration disposition (Section 9);
  22. inventory_completeness_state: Degree of discovery audit completion (DISCOVERED, AUDITED, VERIFIED);
  23. discovery_notes: Contextual notes and annotations recorded by the discovery auditor.

These metadata fields represent conceptual architectural requirements, NOT a frozen JSON schema or TypeScript interface.


8. SIX MIGRATION OBJECT CLASSES

To prevent the catastrophic mistake of treating all code, data, and prompts as interchangeable entities, Phase 1C.5g categorizes all legacy assets into six distinct Migration Object Classes:

8.1 MIG-OBJ-KNOW: Migrated Knowledge
  - Scope: Domain understanding of acoustics, psychoacoustics, electrical engineering, guitar amplifier circuits, speaker cone break-up, room acoustics, and microphone polar patterns.
  - Nature: Declarative, empirical, or theoretical audio engineering principles.
  - Target Architectural Home: Stages 01–07 (Evidence, Observation, Interpretation, Hypothesis, Diagnosis) and Stage 10 (Constraint and Trade-Off Models).
  - Migration Treatment: Must be verified against sound engineering physics. Monolithic knowledge must be decomposed into explicit observation-interpretation-hypothesis chains.

8.2 MIG-OBJ-CONF: Migrated Configuration
  - Scope: Static datasets, gear metadata catalogs, hardware physical specifications, parameter ranges, visual UI knob ranges, and component lists.
  - Nature: Factual, descriptive reference data.
  - Target Architectural Home: Reference catalogs, gear manifests, and platform definition databases.
  - Migration Treatment: Normalized and validated for completeness and accuracy. Never allowed to masquerade as reasoning rules.

8.3 MIG-OBJ-DET: Migrated Deterministic Logic
  - Scope: Deterministic mathematical algorithms, coordinate conversions (e.g., VIR 3D coordinates to polar angles), unit conversions (dB to linear, Hz to Bark), and physical boundary clamps.
  - Nature: Pure, reproducible computational logic.
  - Target Architectural Home: Deterministic utility services, platform translation helpers, and pre-action validation checks.
  - Migration Treatment: Unit-tested for mathematical precision. Barred from replacing subjective or contextual engineering judgement.

8.4 MIG-OBJ-GEN: Migrated Generative / Prompted Reasoning
  - Scope: LLM prompts, system instructions, few-shot examples, chain-of-thought instructions, and prompt formatting templates.
  - Nature: Generative linguistic instructions previously used to drive single-pass or multi-pass reasoning.
  - Target Architectural Home: Governed prompts modularized strictly within individual reasoning stages (e.g., discrete Stage 04 hypothesis generation prompts or Stage 09 intervention candidate prompts).
  - Migration Treatment: Monolithic prompts must be dismantled. Platform-specific instructions must be stripped out. Implicit reasoning must be converted into explicit governed contracts.

8.5 MIG-OBJ-RUN: Migrated Runtime Behaviour
  - Scope: Session persistence, run lifecycle coordination, error handling, cancellation tokens, user interaction flows, and retry policies.
  - Nature: Operational and execution infrastructure.
  - Target Architectural Home: Execution controllers, shadow orchestrators, and session managers.
  - Migration Treatment: Rebuilt to support Phase 1C.5f run identity and immutable trace preservation.

8.6 MIG-OBJ-PLAT: Migrated Platform-Specific Logic
  - Scope: AT5 XML serialization, IKMPAK archive generation, AT5 parameter index mappings, GUI knob step scaling, and platform-specific workarounds.
  - Nature: Target delivery technology logic.
  - Target Architectural Home: Downstream Platform Translation (Stage 12 Platform Translation Plan) and export engines.
  - Migration Treatment: Strictly quarantined downstream of Stage 11. Forbidden from influencing upstream acoustic reasoning, diagnosis, or decision-making.


9. SEVEN MIGRATION DISPOSITIONS

Every discovered asset must be formally assigned exactly one of seven mutually exclusive migration dispositions:

9.1 RETAIN (PHASE_1C5G_PROPOSED)
  - Definition: The legacy asset conforms cleanly to the frozen Phase 1C.5a–f architecture, has verified provenance, exhibits no architectural conflicts, and can be adopted directly into the target system without substantive semantic or structural change.
  - Governance Threshold: Very high. Requires positive proof of conformity, verified origin, and full compatibility.

9.2 REMAP (PHASE_1C5G_PROPOSED)
  - Definition: The underlying engineering substance of the asset is sound, but its architectural location, taxonomy, record type, or stage boundary is incorrect. The asset is moved to its proper architectural location without changing its core meaning.
  - Example: Moving an acoustic cabinet resonance rule from an AT5 export helper into Stage 10 Constraint Evaluation.

9.3 TRANSFORM (PHASE_1C5G_PROPOSED)
  - Definition: The engineering intent or domain insight is valuable, but its representation, structure, or scope is incompatible with frozen contracts (e.g., a prompt that combines diagnosis and intervention). The asset is fundamentally restructured while preserving historical lineage.
  - Governance Requirement: Mandatory transformation record documenting removed assumptions and added constraints.

9.4 QUARANTINE (PHASE_1C5G_PROPOSED)
  - Definition: The asset's correctness, evidential foundation, provenance, or compatibility cannot currently be determined or verified. The asset is safely isolated, preserved in history, but strictly barred from execution in the authoritative path.
  - Governance Rule: Quarantine is not permanent rejection; it is an active protective isolation holding the asset until resolved or retired.

9.5 DEPRECATE (PHASE_1C5G_PROPOSED)
  - Definition: The asset is maintained temporarily in the legacy production path for backwards compatibility during phased migration, but is marked as obsolete and barred from target architecture development.
  - Governance Requirement: Must have an explicit retirement trigger and replacement plan.

9.6 RETIRE (PHASE_1C5G_PROPOSED)
  - Definition: The asset is permanently deactivated from active use because it conflicts irreconcilably with the 21 Principles, duplicates modern functionality, or represents invalid engineering practices.
  - Governance Rule: Retirement does NOT mean deletion. The historical asset remains permanently archived for audit and regression comparison.

9.7 DEFER (PHASE_1C5G_PROPOSED)
  - Definition: A migration determination cannot yet be responsibly reached due to missing upstream information, unbuilt downstream runtime dependencies, or pending empirical evidence.
  - Governance Rule: DEFER is not failure; it is the governed postponement of a decision until required dependencies or evidence become available.

9.8 The Zero-Entitlement Mandate
Governing Rule:
"NO LEGACY ASSET IS AUTOMATICALLY ENTITLED TO RETENTION."
The default disposition for any legacy asset upon initial discovery is DEFER or QUARANTINE.
An asset moves to RETAIN, REMAP, or TRANSFORM only upon positive, auditable verification against the disposition decision process.


10. DISPOSITION DECISION PROCESS & DECISION TREES

10.1 Structured Multi-Factor Assessment
The assignment of a migration disposition is governed by a rigorous, multi-factor decision tree.
The architecture strictly rejects arbitrary confidence percentages, weighted heuristic scores, or automated probabilistic disposition assignments. Every disposition decision must be explicitly reasoned and documented.

10.2 Decision Tree Walkthrough
For each discovered asset in `LegacyEstateInventory`:

Step 1: Provenance and Purpose Verification
  - Is the original source, author, commit, or acoustic derivation known?
  - Is the operational purpose and runtime behavior clearly understood?
  -> If NO: Assign QUARANTINE (if potential value exists) or DEFER (if investigation pending). Stop.
  -> If YES: Proceed to Step 2.

Step 2: Upstream Architectural Conflict Analysis
  - Does the asset contradict any of the 21 Principles of Sound Engineering Reasoning?
  - Does it erase uncertainty, fabricate missing evidence, or assert unearned certainty?
  - Does it use an arbitrary hardcoded clamp to override engineering reasoning?
  -> If YES (Irreconcilable Conflict): Assign RETIRE. Archive historical record. Stop.
  -> If YES (Valuable intent trapped inside flawed rule): Proceed to Step 4 (Transformation).
  -> If NO: Proceed to Step 3.

Step 3: Structural & Boundary Analysis
  - Does the asset cleanly map 1:1 to an existing frozen Stage 01–14 record, catalog, or utility?
  - Is it completely free from platform leakage (AT5-specific logic in upstream reasoning)?
  - Is it completely free from stage-monolithic mixing (e.g., diagnosis mixed with intervention)?
  -> If YES: Assign RETAIN. Register destination mapping. Stop.
  -> If NO: Proceed to Step 4.

Step 4: Remapping vs. Transformation Determination
  - Can the asset's structural mismatch be resolved solely by re-attaching it to the correct stage or record type without altering its internal logic?
  -> If YES: Assign REMAP. Document source and destination. Stop.
  -> If NO: Proceed to Step 5.

Step 5: Feasibility of Governed Transformation
  - Can the core engineering intent be cleanly extracted and restructured into compliant 1C.5a–f records (e.g., splitting a prompt into Stage 04 and Stage 09)?
  - Does a target architecture home exist for the transformed components?
  -> If YES: Assign TRANSFORM. Initiate transformation pipeline. Stop.
  -> If target component not yet built: Assign DEFER. Stop.

Step 6: Production Compatibility & Deprecation
  - Is the legacy asset actively required by PATH-PROD to prevent operational downtime?
  - Has an alternative target capability been validated in Phase 1C.5h?
  -> If required by production but obsolete for target architecture: Assign DEPRECATE. Stop.


11. KNOWLEDGE MIGRATION FIREWALL ARCHITECTURE

11.1 The Firewall Mandate
"LEGACY KNOWLEDGE MUST NOT BE PROMOTED INTO FROZEN REASONING STRUCTURES SOLELY BECAUSE IT EXISTS IN CURRENT TT."

11.2 Architectural Position of the Firewall
The Knowledge Migration Firewall is a formal governance checkpoint separating:
  THE UNVERIFIED LEGACY ESTATE (Code, Prompts, Configs, Overrides)
  from
  THE AUTHORITATIVE FROZEN AI SOUND ENGINEER SYSTEM (Phases 1C.5a–f Records)

No asset, rule, prompt fragment, or parameter table may cross the firewall into authoritative reasoning without passing all eleven firewall checkpoints:
  1. Provenance Verification: Source origin, commit, or extraction lineage is fully established;
  2. Object Class Assignment: Formal classification into MIG-OBJ-KNOW/CONF/DET/GEN/RUN/PLAT;
  3. Governed Disposition Approval: Formal assignment of RETAIN, REMAP, or TRANSFORM;
  4. Target Destination Binding: Explicit binding to a validated frozen schema or service;
  5. Compatibility Certification: Documented verification of semantic and structural fit;
  6. Zero Principles Conflict: Proven absence of conflict with the 21 Principles;
  7. Transformation Audit (if applicable): Complete transformation record with no unrecorded loss of meaning;
  8. Preserved Uncertainty: Full documentation of residual doubts, limitations, and caveats;
  9. Authorized Governance Decision: Formally recorded migration governance decision for the asset class;
  10. Candidate-Lesson Ingestion Proof (if applicable): Independent Knowledge Governance promotion approval;
  11. Validation Package Readiness: Complete specification of validation criteria for Phase 1C.5h.

11.3 Firewall Failure Handling
Any asset that fails to clear the firewall is immediately stopped.
The asset receives a governed failure disposition:
  - QUARANTINE: When provenance is missing, evidence is ambiguous, or potential value requires isolation;
  - DEFER: When target dependencies are unimplemented or validation fixtures are unavailable;
  - TRANSFORM: When engineering substance is sound but structure requires redesign;
  - RETIRE: When the asset irreconcilably violates frozen architecture.
Binary forcing (accept or discard) is strictly prohibited.
"""
