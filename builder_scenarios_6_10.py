# builder_scenarios_6_10.py

def get_scenarios_6_10():
    return '''
--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-06
SCENARIO NAME: Duplicated Source Lineage / False Corroboration (Citation Ring & Folklore Amplification)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4b Citation Lineage & Source Attribution
     rules: N identical repetitions of an unverified assertion do NOT increase its
     evidence strength or consensus rating.
   - What is Assumed/Hypothetical: Assume a web crawl ingests twelve distinct
     audio production blog posts and forum tutorials (Sources F1 through F12) published
     between 2012 and 2024, each asserting that "analog magnetic tape machines
     inherently generate true octave-down subharmonics below 40Hz that thicken the low end."
     Lineage tracking reveals that Sources F2 through F12 all cite Source F1, and
     Source F1 cites a single 1998 home-studio forum post whose author misidentified
     the low-frequency repro head contour resonance ("head bump") as a "subharmonic
     generator".
   - What is NOT_ESTABLISHED: Analog magnetic tape induction does NOT physically
     generate subharmonic fundamentals; magnetic recording is an electromagnetic
     transfer process where head bump is a linear frequency-response anomaly
     governed by tape speed, head geometry, and gap dimensions.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4b (Citation Lineage Tracking & Root Attribution):
     The ingestion pipeline must trace citations back to primary root sources.
     Circular or derivative citations must collapse to a single evidence instance.
   - Phase 1C.4a (Multidimensional Epistemic Validation):
     Consensus state cannot be computed by unweighted document counts. Duplicated
     claims from identical lineage cannot increase consensus_state.
   - Phase 1C.4d (Tier A/B Physical Verification):
     A physical claim (subharmonic frequency division) requires electroacoustic
     proof or physical modeling, which electromagnetic induction theory contradicts.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture contains robust structural safeguards against citation
   rings and viral internet folklore. When Sources F1 through F12 are parsed,
   the attribution pipeline constructs the citation lineage tree. The specification
   mandates root provenance resolution: because F2 through F12 derive entirely
   from F1's unverified assertion, the entire cluster collapses to a single
   anecdotal data point (evidence_strength = ANECDOTAL_SINGLE_SOURCE).
   Furthermore, during physical review, the claim of "tape subharmonic generation"
   is evaluated against electromagnetic circuit physics (Physical Scope:
   CIRCUIT_ELECTRONICS / TRANSDUCER_PHYSICS). Because magnetic tape heads operate
   as linear electromagnetic transducers (subject to saturation and head-bump EQ
   contours, but physically incapable of frequency division without active digital/
   analog pitch-shifting circuitry), the claim fails physical verification and is
   rejected from promotion to canonical KnowledgeClaim.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would trace the twelve documents to a single root
     anecdote and collapse their evidence weighting.
   - A conforming implementation would reject the subharmonic claim or flag it as
     an unverified phenomenological misconception.
   - PROHIBITED: Counting twelve derivative blog posts as twelve independent
     confirmations.
   - PROHIBITED: Promoting "tape generates subharmonics" to canonical status based
     on document frequency.

E. OWNERSHIP CHECK:
   Knowledge Acquisition & Governance Pipeline. Prevents web noise from corrupting
   the TT Knowledge Library.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance collapses to single unverified 1998 forum post; consensus_state =
   DERIVATIVE_FOLKLORE; evidence_strength = UNVERIFIED.

G. PLATFORM CONTAMINATION CHECK:
   Independent of any tape emulation plugin or platform.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture successfully detects citation rings and prevents
     the volume of repeated assertions from being mistaken for evidentiary weight.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-07
SCENARIO NAME: Successful Legacy Recipe (Current TT Kill 'Em All Calibration Case)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: ESTABLISHED_PROJECT_FACT (Current TT Archaeological Survey & Migration Spec)
   - What is Established: Current TT codebase contains a tuned reference case
     for Metallica "Kill 'Em All" based on concrete AmpliTube 5 gear blocks
     (British-style amplifier head, TS-style overdrive pedal, British 4x12 cabinet)
     that produced subjectively satisfying results through iterative human listening
     and tuning. Code presence demonstrates deterministic, static recipe behavior
     in legacy TT.
   - What is Assumed/Hypothetical: Historical claims regarding the exact studio
     rig used at Music America Studios in May 1983 (e.g. modified Marshall 1959
     Super Lead, Jose Arredondo master volume mod, modified ProCo Rat) are classified
     as HISTORICAL_CLAIM_REQUIRING_PROVENANCE.
   - What is NOT_ESTABLISHED: Historical recording session specifics are NOT
     established as verified studio truth. Current TT preset parameters are NOT
     established as universal engineering laws or objective physical ground truth.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4e (Axiom 1 & Axiom 3 — Legacy Classification & Recipe Decomposition):
     Current TT remains UNASSESSED_LEGACY_SOURCE. A successful legacy output does NOT
     validate the underlying engineering causality or make the preset a universal
     law. Legacy presets must be decomposed into:
     (1) Semantic Tone Design intent (e.g. scooped aggressive mid-range, fast
         transient response, tight low-end saturation);
     (2) Empirical reference artifact (the specific tuned preset as an illustrative
         example);
     (3) Platform-specific implementation details (AmpliTube 5 gear model IDs).
   - Phase 1C.4a (Taxonomy: Knowledge Role ILLUSTRATIVE_EXAMPLE):
     Reference presets cannot be promoted to FUNDAMENTAL_THEORY or mandatory rules.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture cleanly resolves the legacy migration challenge without
   epistemic corruption. Current TT's Kill 'Em All preset is treated strictly as an
   UNASSESSED_LEGACY_SOURCE. Under the Phase 1C.4e migration protocol, the recipe
   is decomposed rather than blindly imported as truth:
   1. The engineering intent is extracted into a platform-independent Semantic
      Tone Design (mid-scoop curve, high-gain pre-clipping, aggressive presence).
   2. The specific gear combination is cataloged under Knowledge Role
      ILLUSTRATIVE_EXAMPLE, tagged with OperationalBoundary (thrash metal rhythm,
      passive high-output humbuckers, E-standard tuning).
   3. The exact AT5 knob settings remain categorized as platform-specific
      implementation artifacts, completely quarantined from canonical sound
      engineering principles.
   This guarantees that SUCCESSFUL LEGACY OUTPUT != VALIDATED ENGINEERING CAUSALITY
   != UNIVERSAL RECIPE != CANONICAL KNOWLEDGE.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would decompose the legacy case into semantic intent,
     empirical example, and platform mapping.
   - A conforming implementation would preserve the legacy case as an ILLUSTRATIVE_EXAMPLE.
   - PROHIBITED: Promoting legacy AT5 preset settings into universal engineering laws.
   - PROHIBITED: Hardcoding the legacy gear chain as the only valid way to achieve
     a 1983 thrash metal tone.
   - PROHIBITED: Fabricating historical studio facts without verified primary provenance.

E. OWNERSHIP CHECK:
   Ownership boundaries are cleanly enforced: Semantic intent belongs to Semantic
   Tone Design; platform parameters belong to Platform Translator / Exporter;
   engineering principles belong to Sound Engineer Knowledge Base.

F. EPISTEMIC & PROVENANCE CHECK:
   Provenance marked as LEGACY_TT_CALIBRATION_CASE; evidence_strength =
   EMPIRICAL_UNVALIDATED; consensus_state = LOCAL_REFERENCE_CASE.

G. PLATFORM CONTAMINATION CHECK:
   AT5 gear identifiers are strictly isolated from semantic tone intent.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture decomposes legacy recipes without false promotion
     to universal truth and completely protects semantic design from platform lock-in.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-08
SCENARIO NAME: Failed or Mixed-Outcome Experience (3.2 kHz Notch Filter Mix Failure)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4a and 1C.4d Experience / Feedback
     Firewall: OUTCOME != DECISION QUALITY != REASONING QUALITY != KNOWLEDGE TRUTH.
   - What is Assumed/Hypothetical: Assume an audio engineer working on a dense
     modern rock production applies a sharp parametric notch filter (-6 dB, Q=8.0)
     at 3.2 kHz on distorted electric guitars, relying on a valid KnowledgeClaim
     stating that "guitar speaker cone breakup around 3-4 kHz can produce harsh,
     fatiguing acoustic resonances." The client rejects the resulting mix, complaining
     that the guitars sound "hollow, distant, and completely buried behind the cymbals."
   - What is NOT_ESTABLISHED: Whether 3.2 kHz was the actual acoustic problem in
     this specific guitar track, whether the notch bandwidth was too narrow/deep,
     or whether the client's rejection was driven by masking from vocal/cymbal balance.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a & 1C.4d (The Experience Firewall):
     A failed outcome does NOT automatically falsify the underlying KnowledgeClaim
     (loudspeaker breakup resonance around 3-4 kHz is a proven electroacoustic fact).
     Negative experiential feedback must NOT trigger automated deletion or mutation
     of canonical knowledge.
   - Phase 1C.4d (CandidateLesson Quarantine & Governance Review):
     Experiential failures may spawn a CandidateLesson to investigate operational
     boundaries (e.g. notch depth/Q limits in dense arrangements), but cannot alter
     canonical claims without formal governance review.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture prevents reactive epistemic instability. When the mix
   rejection feedback enters the system, the Experience Firewall strictly prevents
   the reasoning engine or governance layer from concluding that "loudspeaker
   resonance at 3.2 kHz is false."
   The specification dictates:
   1. The underlying KnowledgeClaim (speaker cone resonance) remains fully active
      and untouched in the TT Knowledge Library.
   2. The session context and negative outcome are encapsulated in an observability
      record (RunTrace / SessionEvaluation).
   3. If the engineer notes that excessive notch depth hollowed out the core vocal/
      guitar presence pocket, a CandidateLesson may be created: "Deep high-Q notches
      in 3-4 kHz band risk phase smearing and loss of guitar mix articulation in
      dense rock arrangements."
   4. The CandidateLesson is quarantined under status DRAFT_QUARANTINED. It cannot
      alter retrieval or reasoning until subjected to Tier B governance review.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would protect the underlying physical knowledge claim
     from reactive falsification.
   - A conforming implementation would isolate the failure to session context and
     optionally generate a quarantined CandidateLesson.
   - PROHIBITED: Deleting or weakening the 3.2 kHz acoustic resonance claim based
     on a single mix rejection.
   - PROHIBITED: Auto-promoting a "never cut 3.2 kHz" rule into canonical knowledge.

E. OWNERSHIP CHECK:
   Observability records what happened; CandidateLesson captures potential insight;
   canonical Knowledge Library remains protected by the governance firewall.

F. EPISTEMIC & PROVENANCE CHECK:
   The physical acoustic claim retains evidence_strength = HIGH; the candidate lesson
   has evidence_strength = ANECDOTAL_SINGLE_FAILURE with boundary_certainty = UNTESTED.

G. PLATFORM CONTAMINATION CHECK:
   Zero platform-specific artifacts involved.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The Experience Firewall successfully isolates outcome failure from
     decision quality and preserves valid engineering knowledge against unreasoned
     reactive destruction.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-09
SCENARIO NAME: Candidate Lesson from Repeated Experience (EL34 Power Amp Presence Buildup)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4d CandidateLesson entity and quarantine
     lifecycle: repeated empirical observations do NOT auto-promote at any fixed
     repetition threshold N.
   - What is Assumed/Hypothetical: Assume that across fifteen independent tracking
     sessions in a commercial studio, an engineer repeatedly notes that setting the
     Presence control above 7.0 on EL34-based tube power amplifiers causes an
     unpleasant high-frequency intermodulation buildup when room microphones pick
     up high-hat bleed, which is not observed with 6L6-based amplifiers.
   - What is NOT_ESTABLISHED: Whether this observation represents a universal
     property of the EL34 valve itself, a specific negative feedback loop topology
     in Marshall-style circuits, speaker impedance curve interactions, or room
     mic placement anomalies.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4d (CandidateLesson Lifecycle — No Automatic Promotion):
     CandidateLesson exists specifically to quarantine experiential observations.
     Under no circumstances may a CandidateLesson automatically promote to
     canonical KnowledgeClaim merely because it has been observed N=15 times.
   - Phase 1C.4d (Tier B Governance Requirements for Promotion):
     Promotion requires: (1) proposed causal mechanism, (2) verified operational
     boundaries, (3) independent corroboration, and (4) formal governance review.
   - Phase 1C.4c (Retrieval Quarantine):
     Unpromoted CandidateLessons are strictly barred from production retrieval.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates rigorous protection against premature
   generalization. When the engineer logs the 15th observation, the system updates
   the CandidateLesson observation log: observation_count = 15.
   However, the frozen governance rules strictly prohibit automated state transitions.
   The CandidateLesson remains in status UNDER_GOVERNANCE_REVIEW / QUARANTINED.
   During architectural review:
   - It cannot be retrieved by the Phase 1C.4c context packager for active reasoning runs.
   - To achieve promotion, governance requires investigating whether the cause is
     the EL34 transconductance/pentode characteristics, the absence of cathode
     feedback, or high-frequency negative feedback phase shift in specific output
     transformers.
   - Until these boundaries and causal models are defined and reviewed, the claim
     remains safely quarantined.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would maintain the CandidateLesson in quarantine
     despite N=15 consistent observations.
   - A conforming implementation would bar the unpromoted lesson from runtime retrieval.
   - PROHIBITED: Auto-promoting the lesson at N=5, 10, or 15.
   - PROHIBITED: Hardcoding "EL34 presence above 7 is harsh" as an authoritative
     knowledge claim without causal modeling and boundary verification.

E. OWNERSHIP CHECK:
   Governance and lifecycle layer. Experiential heuristics cannot bypass the
   review firewall.

F. EPISTEMIC & PROVENANCE CHECK:
   Observation count = 15; evidence_strength = OBSERVATIONAL_UNVERIFIED;
   promotion_state = QUARANTINED; boundary_certainty = PROVISIONAL.

G. PLATFORM CONTAMINATION CHECK:
   Completely platform-independent circuit and psychoacoustic observation.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces the CandidateLesson firewall, ensuring
     that repeated empirical experience cannot bypass formal causal modeling and
     governance review.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-10
SCENARIO NAME: Platform-Specific Fact vs Engineering Knowledge (AmpliTube 5 VIR Separation)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: ESTABLISHED_PROJECT_FACT & ARCHITECTURAL_SEPARATION
   - What is Established: AmpliTube 5 features a proprietary Volumetric Impulse
     Response (VIR) cabinet modeling engine that represents virtual microphone
     placement using discrete proprietary coordinate parameters. Established TT
     architecture enforces strict layer separation:
     * Sound Engineer Knowledge: continuous physical wave acoustics (e.g. on-axis
       vs off-axis positioning, distance, capsule orientation, proximity effect).
     * Semantic Tone Design: platform-independent engineering intent.
     * Platform Translator: maps continuous semantic intent to target platform
       parameters (e.g. discrete AT5 VIR coordinates) and reports capability deficits.
     * Exporter: deterministically serializes the platform parameters into native
       formats (e.g. AT5 XML preset files).
   - What is Assumed/Hypothetical: No synthetic coordinate ranges or reverse-engineered
     integer formulas are asserted as established facts. The test evaluates the
     structural boundary between layers.
   - What is NOT_ESTABLISHED: AT5 internal DSP algorithms, coordinate interpolation
     functions, and internal grid boundaries are proprietary and are NOT canonical
     sound engineering knowledge.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Taxonomy: Physical Scope DEVICE_SPECIFIC_BEHAVIOUR vs WAVE_ACOUSTICS):
     Platform-specific parameters must NOT be classified as general sound engineering
     knowledge.
   - Phase 1C.4e (Axiom 2 — Strict Separation of Concerns):
     Semantic Tone Design represents engineering intent without platform knowledge.
     The Platform Translator maps intent to target capabilities and reports deficits.
     The Exporter deterministically serializes the output.
   - Phase 1C.4e (Prohibition Against Platform Contamination):
     Target platform constraints, coordinate grids, or XML schemas MUST NOT
     contaminate the Sound Engineer Knowledge Library or Semantic Tone Design.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture maintains an absolute firewall between general sound
   engineering principles and platform-specific implementation mechanics.
   When an engineer designs a microphone setup (e.g. "place a dynamic microphone
   at the speaker cone-cap boundary, angled 30 degrees off-axis at a distance of
   1.5 inches"):
   1. The Sound Engineer Knowledge Library provides the acoustic principles
      (proximity effect bass boost, off-axis high-frequency rolloff due to diaphragm
      directivity).
   2. The Semantic Tone Design represents this purely in continuous physical units
      (distance_cm: 3.8, angle_deg: 30, radial_position: "cap_edge").
   3. The AT5 Platform Translator takes this semantic specification and maps it to
      the corresponding AT5 VIR parameters, applying platform quantization constraints
      and recording an audit token (e.g. APPROXIMATION_APPLIED) if the grid is discrete.
   4. The Exporter writes the XML element.
   At no point do AT5 parameters, coordinate systems, or XML tags leak backwards into
   the Semantic Tone Design or Knowledge Library.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would represent microphone intent exclusively in
     platform-independent physical/geometric terms.
   - A conforming implementation would restrict platform coordinate mapping strictly
     to the Platform Translator layer.
   - PROHIBITED: Storing AT5 VIR coordinates in a canonical KnowledgeClaim.
   - PROHIBITED: Forcing Semantic Tone Design to use AT5-specific coordinate bounds.
   - PROHIBITED: Allowing the Exporter to alter upstream sound engineering intent.

E. OWNERSHIP CHECK:
   Clean three-way separation: Sound Engineer (Intent) -> Platform Translator
   (Mapping & Deficits) -> Exporter (Serialization). No layer breaches boundaries.

F. EPISTEMIC & PROVENANCE CHECK:
   Acoustic principles have primary provenance; platform parameters are categorized
   strictly as PLATFORM_TRANSLATION_RULES; evidence_strength = HIGH for acoustic laws,
   IMPLEMENTATION_BOUND for platform mappings.

G. PLATFORM CONTAMINATION CHECK:
   Zero leakage of AT5 implementation details into sound engineering knowledge.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture cleanly isolates platform-specific mechanics from
     engineering knowledge, preventing platform lock-in and reverse contamination.
'''
