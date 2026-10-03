# builder_scenarios_1_5.py

def get_scenarios_1_5():
    return '''
================================================================================
5. ALL 20 RE-EVALUATED ADVERSARIAL SCENARIOS
================================================================================

--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-01
SCENARIO NAME: Strong Physical / Engineering Principle (Acoustic Wave Diffraction & High-Frequency Air Attenuation)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST
   - What is Established: The frozen TT architecture defines the Epistemic Basis
     'PHYSICAL_LAW', Physical Scope 'WAVE_ACOUSTICS', and canonical entities
     SourceDocument, ClaimAttribution, KnowledgeClaim, and OperationalBoundary.
   - What is Assumed/Hypothetical: Assume for purposes of this architectural test
     that Source A asserts the atmospheric absorption coefficient alpha(f, T, RH)
     in accordance with ISO 9613-1, asserting that acoustic wave energy attenuation
     in air scales quadratically with frequency above 10 kHz over distances
     d >= 5.0 meters, under standard atmospheric conditions (20 deg C, 50% relative
     humidity).
   - What is NOT_ESTABLISHED: Any specific numerical attenuation coefficient is
     NOT established as TT canonical truth until formally acquired and governed.
     No claim of universal applicability to closed-box headphone transducers,
     sub-millimeter acoustic boundaries, or near-field microphone placement is
     established.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Canonical Entities & Independent Taxonomy Axes):
     Physical laws must be represented as KnowledgeClaim with Epistemic Basis
     PHYSICAL_LAW, Knowledge Role FUNDAMENTAL_THEORY, Physical Scope WAVE_ACOUSTICS.
   - Phase 1C.4b (Physical Law Ingestion Standard):
     Must recover primary mathematical/empirical provenance. Must enforce strict
     OperationalBoundary specifications; physical laws cannot be generalized
     beyond their physical boundary conditions.
   - Phase 1C.4d (Tier A Governance):
     Physical laws require rigorous verification against authoritative scientific
     literature (consensus standards, peer-reviewed acoustics).

C. ARCHITECTURAL EVALUATION:
   The frozen architecture provides complete, non-contradictory mechanisms to
   ingest, classify, and bound strong physical principles. The ingestion pipeline
   requires a SourceDocument (ISO 9613-1 standard) and ClaimAttribution. The resulting
   KnowledgeClaim is bound to an OperationalBoundary entity specifying physical
   prerequisites: medium (air), minimum distance (d >= 5.0m), temperature, and
   humidity envelopes.
   Crucially, when queried during a near-field guitar cabinet miking task (e.g. mic
   at 2 inches / 0.05m), the OperationalBoundary filtering mechanism specified in
   Phase 1C.4c excludes this claim because the distance parameter falls entirely
   outside the valid envelope, preventing an irrelevant physical law from
   distorting close-mic frequency decisions.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would ingest the claim as PHYSICAL_LAW with
     an immutable OperationalBoundary.
   - A conforming implementation would retrieve the claim only when query context
     satisfies distance >= 5.0m in open air.
   - PROHIBITED: Universalizing the claim to close-proximity transducers (< 0.1m).
   - PROHIBITED: Ingesting the claim without an explicit OperationalBoundary.
   - PROHIBITED: Collapsing boundary parameters into an unparameterized rule.

E. OWNERSHIP CHECK:
   Sound Engineer Knowledge Base domain (WHAT + WHY of wave physics). Deterministic
   validation enforces AST schema compliance of OperationalBoundary. Platform
   translators have zero access to mutate physical laws.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance anchored to primary standard; evidence_strength = HIGH; consensus_state
   = CONSENSUS; boundary_certainty = RIGID.

G. PLATFORM CONTAMINATION CHECK:
   Completely platform-independent; zero DAW, hardware, or preset parameters.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture successfully represents strong physical laws with
     uncompromising boundary constraints, preventing both under-specification and
     over-generalization.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-02
SCENARIO NAME: Context-Dependent Professional Practice (Pre-Gain High-Pass Filtering for High-Gain Guitar)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST
   - What is Established: The frozen taxonomy provides Epistemic Basis
     'ENGINEERING_TENDENCY' or 'EMPIRICAL_RELATIONSHIP', Knowledge Role
     'CONTEXT_DEPENDENT_PRACTICE', Physical Scope 'CIRCUIT_ELECTRONICS' and
     'PSYCHOACOUSTICS'.
   - What is Assumed/Hypothetical: Assume Source B (a recognized studio mixing
     handbook) asserts: "Insert an 80Hz pre-gain high-pass filter (HPF) before
     high-gain guitar amplification stages to tighten low-end response and prevent
     muddy intermodulation distortion."
   - What is NOT_ESTABLISHED: Whether 80Hz is a universal law or required for all
     guitars and tunings (it is NOT; 7-string, 8-string, baritone, drop-tuned
     guitars, bass instruments, or clean jazz tones require entirely different
     low-end handling; cutting at 80Hz would attenuate the fundamental of a low B
     at ~61.7Hz).

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Taxonomy Axes Independence):
     Context-dependent practices must NOT be conflated with physical laws.
     Knowledge Role must be CONTEXT_DEPENDENT_PRACTICE; Epistemic Basis must be
     ENGINEERING_TENDENCY or EMPIRICAL_RELATIONSHIP.
   - Phase 1C.4b (Knowledge First — Rules Only Where Rules Genuinely Exist):
     Professional conventions, genre tendencies, and studio practices must NOT
     be converted into universal rules or deterministic validation constraints.
   - Phase 1C.4d (Tier B Governance):
     Practice claims require documented practitioner consensus and explicit
     boundary conditions.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture cleanly prevents context-dependent studio practice from
   hardening into a rigid rule. During extraction, the ingestion contract requires
   identifying the causal mechanism (attenuating sub-100Hz energy before nonlinear
   clipping stages reduces low-frequency intermodulation distortion) and generating
   an OperationalBoundary entity. The boundary explicitly restricts the practice to:
   instrument = 6-string electric guitar, tuning = standard E (E2 = 82.4Hz),
   topology = pre-gain stage, genre = high-gain rock/metal.
   When evaluated against a drop-tuned 7-string context (low A = 55Hz), the
   retrieval boundary filter correctly suppresses the 80Hz recommendation or
   flags a boundary violation, preventing destructive tone alteration.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would classify the claim as CONTEXT_DEPENDENT_PRACTICE
     with Epistemic Basis ENGINEERING_TENDENCY.
   - A conforming implementation would link the claim to a CausalModel explaining
     intermodulation distortion in nonlinear stages.
   - PROHIBITED: Converting 80Hz pre-gain HPF into a mandatory deterministic rule.
   - PROHIBITED: Hardcoding 80Hz as a global default for all guitar tone designs.
   - PROHIBITED: Applying the claim to instruments or tunings whose fundamentals
     fall below 80Hz without boundary warnings.

E. OWNERSHIP CHECK:
   AI Sound Engineer reasoning layer (evaluating trade-offs of low-end tightness
   vs low-frequency fullness). Deterministic validation must NOT reject a tone
   design simply because it omits an 80Hz HPF.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance linked to practitioner literature; consensus_state = COMMON_PRACTICE;
   boundary_certainty = CONTEXT_SENSITIVE.

G. PLATFORM CONTAMINATION CHECK:
   Zero platform-specific filter parameters (no specific EQ plugin IDs or hardware
   models mandated).

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture protects context-dependent studio practices from
     false promotion to universal truth and enforces boundary-aware retrieval.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-03
SCENARIO NAME: Manufacturer Technical Claim (Guitar Speaker Datasheet vs Promotional Ad Copy)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST
   - What is Established: Frozen Phase 1C.4b Section 3 explicitly separates
     manufacturer engineering specifications (measured impedance curves, resonant
     frequency, voice coil dimensions) from promotional ad copy and subjective claims.
   - What is Assumed/Hypothetical: Assume Source C is a manufacturer technical
     publication for a 12-inch guitar loudspeaker containing both an engineering
     specification block (Fs = 75Hz, sensitivity = 100 dB SPL 1W/1m, power handling
     = 60W, voice coil = 1.75 inch copper) and promotional marketing text ("delivers
     warm, rich vocal mid-range and singing, harmonious top-end chime").
   - What is NOT_ESTABLISHED: The subjective marketing descriptors ("warm, rich
     vocal mid-range", "singing top-end chime") have zero empirical definitions,
     repeatable test protocols, or physical validation.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4b (Manufacturer Source Rigor & De-Marketing Filter):
     Objective electroacoustic specifications must be separated from promotional
     adjectives. Engineering data must cite standardized measurement conditions
     (e.g. IEC 268-5, AES2-1984). Marketing claims must be quarantined or rejected.
   - Phase 1C.4a (Entities: KnowledgeClaim vs Unverified Assertion):
     Only propositions meeting evidence standards appropriate to their nature
     can be promoted to canonical KnowledgeClaim status.
   - Phase 1C.4d (Tier B/C Governance for Commercial Sources):
     Commercial sources carry commercial bias risk; claims must be corroborated
     or strictly bounded as unilateral manufacturer assertions.

C. ARCHITECTURAL EVALUATION:
   The frozen acquisition architecture provides explicit de-marketing and boundary
   protocols. When parsing Source C, the specification requires the extraction of
   two completely distinct entity streams:
   1. The objective technical specifications are extracted into KnowledgeClaim
      entities (Epistemic Basis: EMPIRICAL_RELATIONSHIP / Physical Scope:
      TRANSDUCER_PHYSICS) with an OperationalBoundary defining the measurement
      standard (free-air or standardized baffle, 1W at 1 meter, ambient temperature).
   2. The marketing prose is flagged as UNVERIFIED_COMMERCIAL_MARKETING. Because it
      lacks measurable physical correlates and falsifiable criteria, it is barred
      from promotion to canonical KnowledgeClaim.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would promote objective transducer parameters
     (Fs, sensitivity, voice coil diameter) with appropriate measurement boundaries.
   - A conforming implementation would reject or indefinitely quarantine the
     unverifiable marketing assertions.
   - PROHIBITED: Ingesting "singing harmonious chime" as a validated acoustic fact.
   - PROHIBITED: Treating manufacturer power ratings as universal continuous ratings
     without specifying signal crest factor and thermal time constants.

E. OWNERSHIP CHECK:
   Knowledge Acquisition & Ingestion Pipeline. Downstream reasoning layers receive
   only verified transducer data, not marketing fluff.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance linked to manufacturer documentation; consensus_state =
   UNILATERAL_MANUFACTURER; evidence_strength = MEDIUM (for datasheet values) vs
   UNVERIFIED (for marketing prose).

G. PLATFORM CONTAMINATION CHECK:
   Transducer physics remain entirely platform-independent.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces source hygiene and cleanly filters
     commercial bias and marketing prose from engineering knowledge.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-04
SCENARIO NAME: Practitioner Claim with Useful Experience (Fredman 45-Degree Dual-Mic Technique)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST
   - What is Established: Frozen Phase 1C.4b "Best Available Underlying Provenance"
     and Phase 1C.4a Knowledge Role 'CONTEXT_DEPENDENT_PRACTICE' / 'PHENOMENOLOGICAL_MODEL'.
   - What is Assumed/Hypothetical: Assume Source D is a published interview with a
     renowned metal producer describing the "Fredman technique": placing one cardioid
     dynamic microphone on-axis pointed at the speaker cone cap edge, and placing a
     second identical microphone immediately adjacent at a 45-degree angle pointing
     towards the same spot, summing their signals to attenuate harsh upper-mid cone
     breakup around 4 kHz via acoustic phase cancellation while preserving low-end
     punch.
   - What is NOT_ESTABLISHED: The exact phase cancellation frequency is NOT an
     invariant 4.0 kHz constant across all speaker models, cone depths, capsule
     spacings, or grille cloths.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Entities: CausalModel, OperationalBoundary):
     Experiential practitioner claims must be decomposed into: (1) the observable
     technique, (2) the underlying causal hypothesis, and (3) the operational
     boundaries of validity.
   - Phase 1C.4b (Recover Underlying Provenance):
     Do not reject practitioner experience merely because it originates in a studio
     interview; recover the best available physical/acoustic explanation.
   - Phase 1C.4d (Tier B Governance for Practitioner Techniques):
     Must validate that the claimed acoustic effect is physically plausible under
     wave superposition and comb-filtering theory.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates superior epistemic nuance by neither
   uncritically swallowing the interview as dogma nor dogmatically discarding it as
   unscientific folklore.
   The acquisition contract requires extracting:
   - A KnowledgeClaim (Role: CONTEXT_DEPENDENT_PRACTICE, Basis: EMPIRICAL_RELATIONSHIP,
     Scope: TRANSDUCER_PHYSICS / WAVE_ACOUSTICS).
   - An associated CausalModel: Explaining that the path-length difference and off-axis
     phase delay between the two capsules create acoustic comb-filtering, where the
     first destructive interference notch can be tuned to the harsh breakup band
     of high-output guitar loudspeakers.
   - An OperationalBoundary: Constraining the technique to two identical dynamic
     cardioid microphones, physical proximity (< 5mm capsule spacing), high-SPL
     distorted electric guitar cabinet sources, and manual alignment verification.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would link the practitioner technique to a
     CausalModel grounded in wave superposition and phase cancellation.
   - A conforming implementation would represent the 4 kHz notch as a tunable,
     position-dependent phenomenon, NOT a hardcoded constant.
   - PROHIBITED: Ingesting the technique as a magical trick without causal grounding.
   - PROHIBITED: Asserting that the technique guarantees exactly 4.0 kHz cancellation
     regardless of capsule placement geometry.

E. OWNERSHIP CHECK:
   Sound Engineer Knowledge Base domain (WHAT + WHY of acoustic mic summing).
   Platform translation maps the resulting mic configuration to target capabilities
   without altering acoustic causality.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance traced to practitioner interview with causal backing from wave
   acoustics; consensus_state = COMMON_PRACTICE; evidence_strength = MODERATE_EXPERIENTIAL.

G. PLATFORM CONTAMINATION CHECK:
   Zero dependency on specific DAW mixer plugins or virtual mic simulation software.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture successfully grounds practical studio experience
     in physical causality and operational boundaries without epistemic loss.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-05
SCENARIO NAME: Conflicting High-Quality Sources (Loudspeaker Piston Dispersion vs Laser Doppler Modal Breakup)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST / HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4d ConflictRecord architecture: conflicts
     between authoritative sources MUST NOT be collapsed to scalar confidence scores
     or settled by arbitrary winner-take-all suppression.
   - What is Assumed/Hypothetical: Assume Source E1 is a classic authoritative
     acoustics textbook (e.g. Olson, 1957) modeling a direct-radiator loudspeaker
     as an ideal rigid circular piston in an infinite baffle, predicting smooth
     off-axis beam narrowing as a function of ka. Assume Source E2 is a peer-reviewed
     AES journal paper using laser Doppler vibrometry (e.g. Klippel et al., 2018)
     demonstrating that paper guitar speaker cones exhibit severe non-rigid modal
     breakup above 1 kHz, resulting in highly irregular, multi-lobed polar directivity
     that contradicts the rigid piston assumption.
   - What is NOT_ESTABLISHED: Neither model is universally true across all operating
     domains: the rigid piston model is analytically robust at low frequencies
     (ka < 1), while the modal breakup model is essential at high frequencies (ka >> 1)
     for paper cone drivers.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4d (ConflictRecord Entity & Conflict Governance):
     When two authoritative sources disagree within overlapping scopes, the
     architecture MUST generate a ConflictRecord preserving both claims, their
     distinct underlying assumptions, and their operational limits.
   - Phase 1C.4a (Epistemic Validation):
     Do NOT compute a scalar weighted average (e.g. 0.6 vs 0.4). Do NOT silently
     delete the older textbook source.
   - Phase 1C.4c (Retrieval Under Conflict):
     When reasoning requires loudspeaker dispersion, both conflicting models and
     their ConflictRecord must be retrieved into the runtime context package.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture provides an explicit, dedicated entity (ConflictRecord)
   for this exact condition. During verification, the conflict detection protocol
   identifies that Source E1 and Source E2 make contradictory assertions regarding
   off-axis dispersion patterns above 1 kHz.
   Rather than attempting a forced resolution, the specification creates:
   - ConflictRecord: conflict_type = THEORETICAL_BOUNDARY_CONFLICT, status = ACTIVE_UNRESOLVED,
     conflicting_entities = [Claim-E1, Claim-E2].
   - OperationalBoundary for Claim-E1: restricted to ka < 1.0 (low-frequency regime
     where cone moves as a coherent piston).
   - OperationalBoundary for Claim-E2: valid for ka >= 1.0 in flexible paper cones.
   In runtime retrieval, the reasoning engine receives both claims together with
   their ConflictRecord and boundary distinctions, allowing the engineer to select
   the appropriate model based on frequency band and cone material.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would preserve both claims in the TT Library.
   - A conforming implementation would instantiate a formal ConflictRecord.
   - A conforming implementation would provide the ConflictRecord to the reasoning
     layer during context assembly.
   - PROHIBITED: Deleting or silencing Source E1 simply because Source E2 is newer.
   - PROHIBITED: Generating a scalar confidence number that merges the two models.
   - PROHIBITED: Concealing the theoretical discrepancy from runtime reasoning.

E. OWNERSHIP CHECK:
   Knowledge Governance Layer (conflict identification and management). The reasoning
   engine evaluates contextual applicability without altering library provenance.

F. EPISTEMIC & PROVENANCE CHECK:
   Both sources have impeccable provenance; conflict_status = UNRESOLVED_PERSISTENT;
   consensus_state = DISPUTED_REGIME_DEPENDENT; evidence_strength = HIGH for both.

G. PLATFORM CONTAMINATION CHECK:
   Completely platform-independent acoustic science.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture treats conflict as valuable structured domain
     intelligence rather than an error to be silently smoothed over.
'''
