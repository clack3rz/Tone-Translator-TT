# builder_scenarios_16_20.py

def get_scenarios_16_20():
    return '''
--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-16
SCENARIO NAME: High-Consequence Claim with Non-"Primary" Evidence (AC Ground Loop Safety vs Technician Lore)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE / TIER_GOVERNANCE
   - What is Established: Frozen Phase 1C.4d Tier A / B / C Governance & Risk Matrix:
     claims carrying catastrophic physical consequences (personal safety, lethal
     electrical shock, equipment destruction, irreversible hearing loss) require
     Tier A governance and the highest standard of formal verification (statutory
     electrical codes, IEC/AES safety standards, rigorous circuit physics).
   - What is Assumed/Hypothetical: Assume an informal guitar technician bulletin
     and popular forum thread advise audio engineers: "To completely eliminate
     stubborn 60Hz hum and ground loops between tube amplifiers and outboard audio
     interfaces, simply cut off the third prong (chassis earth ground pin) of the
     amplifier's AC power plug or use an ungrounded 3-to-2 prong 'cheater' adapter."
   - What is NOT_ESTABLISHED: Cutting chassis earth ground is lethally dangerous;
     under transformer insulation failure or tube short-circuit conditions, the
     amplifier chassis and guitar strings can become energized at full AC mains
     potential (120V/240V), presenting an immediate electrocution hazard under
     IEC 60065 / IEC 62368-1.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4d (Tier A Governance Standard for Catastrophic Risk):
     Consequence level governs review rigor and evidentiary sufficiency. Non-primary,
     informal practitioner lore is categorically barred from establishing high-consequence
     operational practices.
   - Phase 1C.4b (Source Hierarchy & Safety Overrides):
     Informal technician advice cannot override statutory physical and electrical
     safety standards.
   - Phase 1C.4a (Entities: OperationalBoundary & ConflictRecord):
     Unsafe practices must be flagged with explicit negative boundaries or rejected
     outright from the TT Knowledge Library.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates uncompromising safety governance. When the
   bulletin's proposition ("sever AC earth pin to eliminate ground hum") enters
   the ingestion pipeline:
   1. The consequence classifier evaluates risk under Phase 1C.4d:
      consequence_tier = TIER_A_CRITICAL (hazard: lethal electrical shock / death).
   2. Tier A governance mandates that no claim carrying safety hazards can be
      promoted without formal statutory/engineering corroboration (e.g. IEC 62368,
      National Electrical Code).
   3. The proposition is audited against circuit electronics physics: while breaking
      the ground loop does indeed eliminate the circulating hum current, it removes
      the protective low-impedance fault path, violating fundamental electrical
      safety.
   4. The proposition is categorically REJECTED from promotion as an acceptable
      engineering practice.
   5. A safe alternative is retrieved from governed Tier A knowledge: galvanic audio
      isolation (1:1 audio isolation transformers or balanced line receivers) which
      breaks the loop in the audio domain without compromising mains safety grounding.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would immediately block the ungrounded safety
     claim from promotion.
   - A conforming implementation would classify the risk as Tier A and require
     formal safety standard compliance.
   - PROHIBITED: Promoting "cut the ground pin" as a valid engineering technique.
   - PROHIBITED: Allowing informal technician folklore to satisfy Tier A evidence
     burdens.

E. OWNERSHIP CHECK:
   Governance and Ingestion layer. Safety boundaries are absolute and cannot be
   bypassed by user preference or reasoning shortcuts.

F. EPISTEMIC & PROVENANCE CHECK:
   Technician bulletin has low/anecdotal provenance; safety hazard is verified by
   statutory standards; promotion_status = REJECTED_LETHAL_HAZARD.

G. PLATFORM CONTAMINATION CHECK:
   Zero platform-specific parameters.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces strict risk-proportional governance,
     categorically preventing hazardous lore from entering canonical knowledge.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-17
SCENARIO NAME: Model Knowledge Conflicts with TT Library (Pretrained Prior vs Governed Schematic)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4c Runtime Knowledge Model: reasoning
     operates at the disciplined intersection of (1) Model Knowledge (opaque pretrained
     priors), (2) TT Knowledge Library (governed, bounded, provenance-backed knowledge),
     and (3) Case Evidence (current session parameters). Crucially, the TT Library
     is NOT defined as infallible "ground truth" (dogma), but model knowledge MUST NOT
     silently override governed library knowledge.
   - What is Assumed/Hypothetical: Assume during a tone design query for a 1959
     Fender Bassman (5F6-A circuit), the pretrained model prior hallucinatingly
     asserts: "The 5F6-A Bassman utilizes an active Baxandall negative-feedback tone
     stack where Bass and Treble controls are completely independent and provide
     up to 15 dB of clean boost." The governed TT Knowledge Library contains a
     verified circuit schematic and electroacoustic analysis establishing that the
     5F6-A utilizes a passive cathode-follower driven James/TMB tone stack exhibiting
     severe control interactivity and insertion loss.
   - What is NOT_ESTABLISHED: Model internal weights have opaque provenance and
     cannot be audited. Model assertions cannot silently mutate the TT Knowledge
     Library.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4c (Runtime Intersection & Anti-Override Rule):
     Model knowledge must NOT silently overwrite, displace, or corrupt governed
     TT Knowledge Library entities.
   - Epistemic Nuance Protection (Correction 7):
     The TT Knowledge Library is governed evidence, not divine dogma. If model
     knowledge conflicts with library knowledge, the architecture MUST:
     (1) preserve the discrepancy;
     (2) provide the governed library claim with complete provenance, boundaries,
         and review state;
     (3) reason using the best available governed evidence for the current case;
     (4) allow external challenges to enter the formal governance pipeline;
     (5) avoid treating "TT Library always wins" as an unreasoned dogma.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture handles runtime epistemic conflict with exemplary
   scientific discipline:
   1. The context packager detects that the pretrained model's internal prior
      (Baxandall active stack) directly contradicts the governed KnowledgeClaim
      (5F6-A passive cathode-follower stack).
   2. Because the model prior lacks auditable documentation, primary schematics,
      and governed review, it is denied authority to alter the canonical library.
   3. The runtime context package injects the governed KnowledgeClaim along with its
      verifiable provenance (Fender 1959 factory schematic, circuit equations) and
      explicitly flags the discrepancy in the reasoning trace.
   4. The reasoning engine executes tone calculations using the governed passive
      tone stack model (interactive insertion loss), ensuring accurate frequency
      prediction.
   5. The discrepancy is preserved for auditability, and if the user or model provides
      new physical evidence (e.g. an obscure factory custom modification), that
      evidence is routed to the formal governance intake rather than silently
      overriding the library in-place.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would prevent opaque model priors from silently
     overwriting governed library claims.
   - A conforming implementation would ground current-case reasoning in governed,
     provenance-backed schematics.
   - A conforming implementation would log the model discrepancy in RunTrace.
   - PROHIBITED: Silently accepting the model's Baxandall hallucination.
   - PROHIBITED: Declaring the TT Library "infallible ground truth" that can never
     be questioned through formal governance channels.

E. OWNERSHIP CHECK:
   Runtime Context Architecture (Phase 1C.4c) and Reasoning Engine (Phase 1C.5).
   The context packager arbitrates inputs without mutating library contents.

F. EPISTEMIC & PROVENANCE CHECK:
   TT Library claim is backed by primary engineering schematics; model prior is
   opaque; runtime evidence basis = GOVERNED_LIBRARY_PRIORITY_FOR_CASE.

G. PLATFORM CONTAMINATION CHECK:
   Circuit electronics physics remain platform-independent.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture successfully prevents model hallucinations from
     corrupting governed knowledge while preserving the epistemic open-endedness
     of scientific evidence.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-18
SCENARIO NAME: Retrieval Boundary Failure Test (Out-of-Domain Acoustic Context Retrieval)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4c Retrieval & Runtime Context Architecture:
     OperationalBoundary filtering must enforce physical scope, instrument context,
     and boundary constraints before a KnowledgeClaim is eligible for inclusion in
     a runtime context package.
   - What is Assumed/Hypothetical: Assume a user query requests: "How to maximize low-end
     clarity, warmth, and string articulation." A naive semantic vector search returns
     a KnowledgeClaim originating from a concert hall acoustics treatise describing
     boundary microphone placement on a 9-foot Steinway grand piano lid in a 2000-seat
     diffuse hall. The current engineering case is a solid-body electric bass guitar
     recorded direct-injection (DI) into an audio interface.
   - What is NOT_ESTABLISHED: Concert hall boundary acoustic physics do NOT apply
     to an electromagnetic guitar pickup and direct electrical wire transmission.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4c (Multi-Stage Retrieval & Boundary Gating):
     Semantic similarity search (dense vector retrieval) is NOT sufficient on its own.
     Retrieval MUST pass through hard boundary filtering (Physical Scope, Instrument
     Domain, Signal Path Topology).
   - Phase 1C.4a (Entities: OperationalBoundary):
     KnowledgeClaims are bound to explicit domains of applicability. Out-of-boundary
     claims must be suppressed or flagged with boundary mismatch warnings.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture prevents contextual contamination through its two-stage
   retrieval pipeline. When the query is processed:
   1. The query context is analyzed: instrument = "electric_bass", signal_chain =
      "direct_injection", environment = "electrical_wire".
   2. Stage 1 semantic retrieval identifies the grand piano claim based on lexical/
      embedding similarity to "low-end clarity and articulation".
   3. Stage 2 boundary gating evaluates the claim's OperationalBoundary:
      valid_scopes = [WAVE_ACOUSTICS], valid_instruments = ["acoustic_grand_piano"],
      valid_environments = ["reverberant_hall"].
   4. The boundary validator detects a complete domain mismatch: electric bass DI
      operates in CIRCUIT_ELECTRONICS, not WAVE_ACOUSTICS.
   5. The piano claim is strictly filtered out and excluded from the context package,
      preventing hallucinated acoustic advice from being applied to a direct
      electric bass signal.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would suppress the piano acoustic claim via
     boundary filtering despite high semantic similarity scores.
   - A conforming implementation would retrieve claims matching CIRCUIT_ELECTRONICS
     and electric bass DI (e.g. input impedance loading, pickup damping).
   - PROHIBITED: Injecting acoustic room boundaries into a direct electric signal
     reasoning context.
   - PROHIBITED: Relying solely on vector embeddings without boundary validation.

E. OWNERSHIP CHECK:
   Knowledge Retrieval & Runtime Context Architecture (Phase 1C.4c). Enforces
   boundary constraints before reasoning begins.

F. EPISTEMIC & PROVENANCE CHECK:
   Both claims have valid provenance, but applicability is strictly governed by
   OperationalBoundary AST evaluation.

G. PLATFORM CONTAMINATION CHECK:
   Zero platform dependencies.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture proves that semantic similarity is subordinate to
     operational boundaries, preventing out-of-domain knowledge contamination.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-19
SCENARIO NAME: Historical Knowledge Reconstruction & Audit Replay (Temporal Point-in-Time Reconstruction)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_HISTORICAL_REPLAY_FIXTURE
   - What is Established: Frozen Phase 1C.4a, 1C.4c, and 1C.4d Temporal Versioning
     and RunTrace architecture: all canonical knowledge entities are immutably
     versioned (`version_id`, `effective_timestamp`, `superseded_by`). Historical
     reasoning runs must be reconstructable exactly as they existed at past points
     in time.
   - What is Assumed/Hypothetical: Assume a hypothetical past engineering session
     occurred at timestamp T1 (e.g. 2024-03-01). At T1, KnowledgeClaim-K1 (a classic
     speaker impedance model) was active (v1.0). At timestamp T2 (e.g. 2025-06-01),
     new research led to the promotion of KnowledgeClaim-K1_v2.0, which formally
     superseded v1.0. At timestamp T3 (current time), an audit replay of the T1
     session is requested to determine why a specific filter choice was made.
   - What is NOT_ESTABLISHED: Modern knowledge (v2.0) was NOT available at T1 and
     must not leak into the historical replay context.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Entity Immutability & Temporal Lineage):
     Entities are never updated in-place. Updates create new versions with formal
     supersession pointers.
   - Phase 1C.4c (Point-in-Time Context Reconstruction):
     When replaying or auditing a past session, the context packager must retrieve
     only the entities that were active and effective at timestamp T_audit.
   - Phase 1C.4d (Auditability & Reconstructability Invariant):
     The architecture must guarantee that future knowledge cannot retroactively
     contaminate historical reasoning evaluations.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture provides complete specification for point-in-time
   temporal reconstruction. When the audit request for timestamp T1 is processed:
   1. The context packager receives the temporal query parameter: effective_at = T1.
   2. The retrieval filter inspects entity lifecycle headers:
      - Claim-K1_v1.0: created_at <= T1, superseded_at = T2 (active at T1).
      - Claim-K1_v2.0: created_at = T2 (does not exist at T1).
   3. The packager reconstructs the exact context package as it existed at T1,
      including Claim-K1_v1.0 and excluding Claim-K1_v2.0.
   4. Anachronistic knowledge leakage is mathematically impossible under the
      temporal query contract.
   5. The auditor can verify the exact reasoning and evidence that drove the T1
      decision without chronological distortion.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would reconstruct the historical context package
     using only entities effective at T1.
   - A conforming implementation would exclude superseded and future entities.
   - PROHIBITED: Injecting v2.0 knowledge into a T1 audit replay.
   - PROHIBITED: In-place database overwrites that destroy historical entity states.

E. OWNERSHIP CHECK:
   Knowledge Lifecycle and Retrieval Architecture. Temporal integrity is maintained
   at the database schema and retrieval query layer.

F. EPISTEMIC & PROVENANCE CHECK:
   Lineage is fully auditable through immutable entity chains; temporal_validity =
   VERIFIED_POINT_IN_TIME.

G. PLATFORM CONTAMINATION CHECK:
   Independent of platform.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces immutable temporal versioning, guaranteeing
     complete audit replayability without anachronistic knowledge leakage.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-20
SCENARIO NAME: Source Quality Does Not Equal Claim Truth (Prestige Bias vs Empirical Validation)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE / EXTERNAL_CLAIM_UNDER_TEST
   - What is Established: Frozen Phase 1C.4b and 1C.4d fundamental epistemic rule:
     SOURCE TYPE != CLAIM TRUTH. The institutional prestige or academic pedigree
     of a source does NOT guarantee the truth of every assertion it contains;
     conversely, an informal practitioner origin does NOT justify dismissing an
     empirically verifiable physical phenomenon.
   - What is Assumed/Hypothetical: Assume Source G1 is a prestigious university
     textbook written by an eminent physics professor that contains a brief passing
     claim: "Electric guitar loudspeakers operate entirely within their linear
     magnetic regime and do not produce harmonic distortion at normal studio levels."
     Assume Source G2 is a self-published blog by an uncredentialed tube amp technician
     documenting that guitar speaker paper cones experience severe nonlinear magnetic
     flux modulation and voice coil thermal compression under continuous 50W drive,
     corroborated by bench oscillograms and distortion analyzer measurements.
   - What is NOT_ESTABLISHED: Academic credentials do NOT make a physically false
     assertion true; lack of institutional credentials does NOT make a verified
     measurement false.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4b (Source Classification vs Claim Validation):
     Source classification (academic, practitioner, manufacturer) categorizes origin
     and informs initial bias checks, but is NOT a scalar truth ranking.
   - Phase 1C.4a (Multidimensional Epistemic Validation):
     Claims are validated on evidence strength, empirical replication, and physical
     boundaries, NOT source prestige.
   - Phase 1C.4d (Tier A/B Governance Safeguards):
     High-prestige sources must still pass physical and empirical scrutiny.
     Practitioner claims with verified empirical backing can be promoted.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates pristine epistemic independence from
   authority bias:
   1. When Source G1's claim enters ingestion, its academic pedigree classifies
      the source as ACADEMIC_INSTITUTIONAL. However, the claim itself ("guitar speakers
      never distort") is evaluated against empirical transducer physics. Because
      measurement benchmarks and electroacoustic consensus overwhelmingly prove
      that guitar speakers are designed specifically to produce nonlinear distortion,
      the professor's claim FAILS physical verification and is REJECTED.
   2. When Source G2's claim enters ingestion, its source is classified as
      INFORMAL_PRACTITIONER. However, the claim includes bench test measurements,
      harmonic distortion curves, and clear test procedures.
   3. The claim passes empirical verification and is corroborated against known
      transducer physics (non-uniform Bl(x) curve and Le(x) voice coil modulation).
   4. The claim is promoted to canonical KnowledgeClaim (Epistemic Basis:
      EMPIRICAL_RELATIONSHIP / Scope: TRANSDUCER_PHYSICS) with appropriate boundaries.
   This guarantees that authority bias cannot enshrine falsehoods, nor can elitism
   suppress valid empirical engineering knowledge.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would reject the eminent professor's false claim.
   - A conforming implementation would promote the technician's empirically verified claim.
   - PROHIBITED: Using source origin as an infallible proxy for claim truth.
   - PROHIBITED: Rejecting empirical data solely because the author lacks credentials.

E. OWNERSHIP CHECK:
   Knowledge Ingestion and Governance layer. Epistemic validation evaluates claims
   on their merits, independent of source vanity metrics.

F. EPISTEMIC & PROVENANCE CHECK:
   Source G1 has high prestige but evidence_strength = FALSIFIED; Source G2 has
   informal origin but evidence_strength = EMPIRICALLY_VERIFIED; consensus_state =
   CONSENSUS_WITH_MEASUREMENT.

G. PLATFORM CONTAMINATION CHECK:
   Completely platform-independent.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces that Source Type != Claim Truth, protecting
     the TT Knowledge Library from authority bias and epistemic elitism.
'''
