# builder_scenarios_11_15.py

def get_scenarios_11_15():
    return '''
--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-11
SCENARIO NAME: Platform Cannot Exactly Represent Semantic Intent (Continuous Variable Angle vs Discrete Switch)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE / ARCHITECTURAL_SEPARATION
   - What is Established: Phase 1C.4e Section 2.4 specifies the Capability Deficit
     and Constraint Protocol. The Platform Translator must report fidelity status
     (EXACT, APPROXIMATION_APPLIED, DEFAULTED, UNSUPPORTED), preserve semantic intent,
     and escalate non-trivial compromises to the reasoning layer.
   - What is Assumed/Hypothetical: Assume an upstream Semantic Tone Design specifies
     a Blumlein coincident ribbon pair placed at an angle of exactly 32.5 degrees
     relative to the speaker axis to balance direct transient clarity with ambient
     room reflections. The target simulation hardware or software plugin only supports
     a discrete binary angle selector: [0 degrees (on-axis) | 90 degrees (perpendicular)].
   - What is NOT_ESTABLISHED: Target platform limitations do NOT invalidate the
     upstream Semantic Tone Design. Semantic intent remains valid and uncompromised
     in its own layer.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4e (Section 2.4 — Constraint Satisfaction & Capability Deficits):
     When a platform cannot represent an upstream semantic parameter, the Platform
     Translator MUST NOT silently redesign the intent or alter the Semantic Tone Design.
   - Phase 1C.4e (Audit Tokens & Escalation):
     The translator must output an audit token (e.g. APPROXIMATION_APPLIED or
     CAPABILITY_DEFICIT) and evaluate whether the quantization error exceeds the
     permissible threshold. If the approximation fundamentally compromises acoustic
     intent, it must escalate to the sound engineer reasoning layer.
   - Deterministic Validation Boundary:
     A platform's inability to represent a valid Semantic Tone Design does NOT
     constitute a validation failure of the Semantic Tone Design itself.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates impeccable boundary preservation when
   handling platform deficits. When the 32.5-degree semantic parameter is passed
   to the platform translator:
   1. The deterministic validator verifies the Semantic Tone Design is physically
      and syntactically valid (angle in range [0, 90], units degrees). The design
      passes validation completely.
   2. The platform translator analyzes the target schema, discovering only {0, 90}.
   3. The translator determines that rounding 32.5 degrees to 0 degrees introduces
      an intolerable 32.5-degree angular error, causing severe comb-filtering and
      frequency-response distortion that violates the semantic intent.
   4. The translator records a CapabilityDeficitRecord (token: CAPABILITY_DEFICIT_UNSUPPORTED,
     parameter: "mic_angle", requested: 32.5, available: [0, 90]) and escalates the
     compromise to the sound engineering reasoning layer for re-evaluation (e.g.
     selecting an alternative multi-mic technique or changing target platforms).
   5. The original Semantic Tone Design remains completely untouched and pristine.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would preserve the Semantic Tone Design without
     modification.
   - A conforming implementation would generate a structured CapabilityDeficitRecord.
   - A conforming implementation would escalate the material deficit to reasoning.
   - PROHIBITED: Silently rounding 32.5 degrees to 0 degrees without reporting a deficit.
   - PROHIBITED: Mutating the upstream Semantic Tone Design to match platform limitations.
   - PROHIBITED: Rejecting the Semantic Tone Design as invalid simply because the
     target platform cannot render it.

E. OWNERSHIP CHECK:
   Strictly enforced: Semantic Tone Design owns intent; Platform Translator owns
   mapping and capability deficit detection; Sound Engineer reasoning owns trade-off
   decisions.

F. EPISTEMIC & PROVENANCE CHECK:
   Acoustic intent has rigorous provenance; platform deficiency is tracked in
   observability telemetry; fidelity_state = UNSUPPORTED_ESCALATED.

G. PLATFORM CONTAMINATION CHECK:
   Platform constraints are entirely contained within the translation layer.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture successfully handles target platform deficits
     without silent compromise, intent corruption, or false validation failures.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-12
SCENARIO NAME: Ghost Audio / Evidence Existence vs Consumption (Current TT Codebase Archaeology)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: ESTABLISHED_PROJECT_FACT (Current TT Archaeological Survey) & MIXED_FIXTURE
   - What is Established: Verified code archaeology in the Current TT codebase
     proves that audio-related plumbing and structures exist in the repository
     (`audio_sample` declarations, `analysis_mode` toggles, waveform rendering
     components). Verified code inspection of the tone generation pipeline confirms
     that these audio data structures are NEVER consumed by downstream prompt
     generators, preset builders, or tone decision logic (`is_consumed = FALSE`,
     `is_decision_relevant = FALSE`).
   - What is Assumed/Hypothetical: The test does NOT invent a successful user WAV
     file upload session, nor does it assume waveform execution occurred.
   - What is NOT_ESTABLISHED: User-facing reachability and visibility of the audio
     upload controls in live Current TT was NOT established during archaeology,
     and the project owner reported not currently seeing the file upload option
     (`is_user_visible = NOT_ESTABLISHED`, `is_reachable = NOT_ESTABLISHED`,
     `is_executed = NOT_ESTABLISHED`).

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4e (Seven Operational Reality Dimensions & Tri-State Epistemics):
     The architecture defines seven independent operational dimensions:
     1. is_declared (TRUE/FALSE)
     2. is_implemented (TRUE/FALSE)
     3. is_user_visible (TRUE/FALSE/NOT_ESTABLISHED)
     4. is_reachable (TRUE/FALSE/NOT_ESTABLISHED)
     5. is_executed (TRUE/FALSE/NOT_ESTABLISHED)
     6. is_consumed (TRUE/FALSE)
     7. is_decision_relevant (TRUE/FALSE)
   - Binding Epistemic Rule:
     EXISTENCE / DECLARATION / TRANSPORT != CONSUMPTION != DECISION RELEVANCE.
     Unresolved operational realities must remain NOT_ESTABLISHED. Unknowns cannot
     be defaulted to TRUE or FALSE.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture provides an unmatched epistemic framework for legacy
   code analysis. When the Current TT "Ghost Audio" specimen is evaluated under the
   seven reality dimensions:
   - is_declared = TRUE (types and schemas exist in code).
   - is_implemented = TRUE (plumbing and parsing functions exist).
   - is_user_visible = NOT_ESTABLISHED (archaeological record lacks UI confirmation;
     owner reported option missing).
   - is_reachable = NOT_ESTABLISHED (runtime call-graph connection unverified).
   - is_executed = NOT_ESTABLISHED (no production execution trace available).
   - is_consumed = FALSE (rigorous code tracing proves zero consumption by tone engine).
   - is_decision_relevant = FALSE (zero downstream tone decisions depend on audio data).
   The architecture prevents the fatal error of assuming that because code exists,
   it must be active and decision-bearing. In migration, the audio plumbing is
   classified as UNCONSUMED_LEGACY_PLUMBING, preventing false claims that legacy
   TT had an active audio analysis reasoning engine.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would record the tri-state reality vector exactly:
     [TRUE, TRUE, NOT_ESTABLISHED, NOT_ESTABLISHED, NOT_ESTABLISHED, FALSE, FALSE].
   - A conforming implementation would treat legacy audio data as non-decision-bearing.
   - PROHIBITED: Asserting that user visibility is TRUE without empirical proof.
   - PROHIBITED: Defaulting unestablished operational dimensions to FALSE.
   - PROHIBITED: Claiming that legacy TT performed audio-driven sound engineering.

E. OWNERSHIP CHECK:
   Code Archaeology & Migration layer. Isolates cosmetic/dormant code from active
   reasoning foundations.

F. EPISTEMIC & PROVENANCE CHECK:
   Code evidence is verified by repository audit; operational unknowns remain
   NOT_ESTABLISHED; epistemic_status = PARTIALLY_OBSERVED_LEGACY.

G. PLATFORM CONTAMINATION CHECK:
   Evaluates legacy code without contaminating the forward architecture.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces the seven operational reality dimensions,
     honors NOT_ESTABLISHED, and proves that code existence does not equal consumption
     or engineering decision relevance.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-13
SCENARIO NAME: Missing Evidence (Absence of Evidence != Evidence of Absence)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4a and 1C.4d epistemic principle: missing
     evidence MUST NOT be converted to FALSE. Unknown historical facts must evaluate
     to NOT_ESTABLISHED / UNKNOWN.
   - What is Assumed/Hypothetical: Assume an engineering analysis of a legendary
     1968 psychedelic rock tracking session at Olympic Studios is conducted to model
     the guitar fuzz tone. Studio tracking sheets confirm the use of an original
     Dallas Arbiter Fuzz Face, but provide NO record of whether the pedal contained
     NKT275 germanium transistors or early silicon transistors (BC183/BC108), nor
     whether the battery was fresh (9.2V) or dying (6.5V "sag").
   - What is NOT_ESTABLISHED: Transistor metallurgy (germanium vs silicon) and
     power supply voltage are completely NOT_ESTABLISHED.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Epistemic Principles: NOT_ESTABLISHED != FALSE):
     The absence of documented evidence regarding a circuit parameter must NOT
     be interpreted as evidence that the parameter was absent or defaulted.
   - Phase 1C.4c (Retrieval Context with Incomplete Evidence):
     When reasoning over incomplete historical evidence, the context packager
     must surface the uncertainty, parameterizing the unknown variables rather
     than injecting an unverified default.
   - Phase 1C.4d (Uncertainty Preservation):
     Preserve explicit hypothesis branches (Germanium vs Silicon) without collapsing
     to a single arbitrary guess.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture excels at handling incomplete case evidence. When the
   1968 session data is ingested as CaseEvidence:
   1. The pedal model is recorded: Fuzz Face (established).
   2. The transistor composition is evaluated: with zero documentation, the
      architecture assigns transistor_type = NOT_ESTABLISHED.
   3. The reasoning layer is strictly prohibited from executing a closed-world
      assumption (e.g. concluding "germanium was not recorded, therefore it was
      silicon").
   4. Instead, the architecture instantiates two competing phenomenological hypotheses
      under Knowledge Role PHENOMENOLOGICAL_MODEL:
      * Hypothesis A: Germanium NKT275 (higher temperature sensitivity, softer knee
        clipping, lower slew rate).
      * Hypothesis B: Silicon BC183 (sharper square-wave clipping, brighter bite).
   5. Both branches are exposed to the sound engineer with clear uncertainty bounds,
      enabling informed comparative decision-making.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would represent missing parameters as NOT_ESTABLISHED.
   - A conforming implementation would preserve competing causal hypotheses.
   - PROHIBITED: Silently defaulting unknown parameters to standard library values
     without flagging them as unverified assumptions.
   - PROHIBITED: Treating missing historical documentation as proof of non-existence.

E. OWNERSHIP CHECK:
   Case Evidence ingestion and Sound Engineer reasoning layers. Deterministic
   validation verifies AST structure but does not fill in missing historical facts.

F. EPISTEMIC & PROVENANCE CHECK:
   Documentary evidence is incomplete; parameter_certainty = UNKNOWN;
   hypothesis_state = MULTIPLE_COMPETING_BRANCHES.

G. PLATFORM CONTAMINATION CHECK:
   Zero platform-specific modeling constraints.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture enforces that missing evidence remains NOT_ESTABLISHED,
     preventing closed-world collapse and preserving competing engineering hypotheses.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-14
SCENARIO NAME: Perceptual Shorthand / False Precision ("Chug", "Tight", "Warm")
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST / HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4a Epistemic Safeguards against False
     Precision: Subjective perceptual descriptors ("chug", "tight", "warm", "boxy")
     represent complex, multidimensional psychoacoustic phenomena that correlate
     with multiple interrelated physical mechanisms (transient damping, phase
     alignment, harmonic distortion, low-frequency decay).
   - What is Assumed/Hypothetical: Assume an internet production tutorial asserts:
     "The exact guitar 'chug' frequency is 118.4 Hz with a filter Q of 4.2, and
     achieving 'tightness' requires a -4.5 dB cut at 118.4 Hz followed by a +3.2 dB
     boost at 2.4 kHz."
   - What is NOT_ESTABLISHED: Subjective perceptual descriptors do NOT have universal,
     fixed scalar frequencies, fixed Q values, or hardcoded gain settings. A guitar
     tuned to Drop D (D2 = 73.4Hz) will exhibit completely different low-frequency
     energy distribution than standard E (E2 = 82.4Hz) or 8-string F# (F#1 = 46.2Hz).

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Prohibition Against False Precision):
     Perceptual engineering concepts must NOT acquire arbitrary scalar precision
     merely because a data schema or database column can store floating-point numbers.
   - Phase 1C.4a (Knowledge Role PHENOMENOLOGICAL_MODEL vs Universal Law):
     Perceptual descriptors must be modeled as multidimensional concepts linking
     candidate observable correlates (damping factor, low-frequency group delay,
     muting envelope decay time, palm-mute pressure) to acoustic behavior, NOT
     single-frequency formulas.
   - Phase 1C.4b (Ingestion Rigor):
     Unsubstantiated scalar claims must be stripped of false precision or rejected.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture directly blocks the insertion of pseudo-scientific false
   precision. When the tutorial claim is ingested:
   1. The scalar value "118.4 Hz, Q=4.2" is audited. Because no empirical derivation,
      standardized measurement, or physical acoustic law links the perceptual concept
      of "chug" to 118.4 Hz, the claim is rejected as FALSE_PRECISION_PSEUDO_SCALAR.
   2. The architecture represents "chug" under Knowledge Role PHENOMENOLOGICAL_MODEL
      with Physical Scope PSYCHOACOUSTICS / CIRCUIT_ELECTRONICS.
   3. It models the term through its verified causal correlates:
      - Acoustic correlates: high low-frequency energy in the fundamental band of
        palm-muted power chords (dependent on guitar tuning);
      - Dynamic correlates: rapid transient envelope decay governed by palm-muting
        technique and amplifier power-supply sag recovery;
      - Nonlinear correlates: low-frequency intermodulation distortion in high-gain
        preamp stages.
   4. The architecture completely refrains from substituting a secondary set of
      unsupported numbers, preserving the concept as a bounded, context-dependent
      multidimensional phenomenon.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would reject arbitrary scalar precision (118.4 Hz, Q=4.2).
   - A conforming implementation would represent perceptual terms as multidimensional
     phenomenological concepts parameterized by tuning, envelope, and gain.
   - PROHIBITED: Hardcoding fixed single-frequency EQ points for subjective descriptors.
   - PROHIBITED: Replacing an arbitrary scalar with an equally unsupported narrow band.

E. OWNERSHIP CHECK:
   Sound Engineer Knowledge Base (psychoacoustic modeling) and Reasoning Engine
   (translating perceptual user intent into physical parameters). Deterministic
   validation enforces schema syntax but does not mandate fixed frequency values.

F. EPISTEMIC & PROVENANCE CHECK:
   The subjective claim lacks primary provenance; evidence_strength = UNVERIFIED;
   epistemic_classification = PERCEPTUAL_PHENOMENOLOGICAL_DESCRIPTOR.

G. PLATFORM CONTAMINATION CHECK:
   Completely platform-independent psychoacoustics.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture eliminates false precision, rejects arbitrary
     scalar numbers, and models perceptual engineering shorthand as rigorous
     multidimensional phenomena.


--------------------------------------------------------------------------------
SCENARIO ID: UAT-SCEN-15
SCENARIO NAME: Unconventional but Valid Engineering Choice (Post-Reverb High-Gain Distortion)
--------------------------------------------------------------------------------
A. TEST FIXTURE:
   - Fixture Type: EXTERNAL_CLAIM_UNDER_TEST / HYPOTHETICAL_TEST_FIXTURE
   - What is Established: Frozen Phase 1C.4a and 1C.4b principles: sound engineering
     is governed by physics and psychoacoustics, NOT rigid stylistic dogma or genre
     orthodoxy. Deterministic validation must NOT enforce aesthetic conformity.
   - What is Assumed/Hypothetical: Assume a creative guitar tone design places a
     lush, 100% wet stereo hall reverb block BEFORE a heavy high-gain fuzz/distortion
     stage (a hallmark technique of shoegaze, noise rock, and cinematic post-rock,
     popularized by bands like My Bloody Valentine). Standard textbook convention
     advises that reverb should always be placed at the very end of the signal chain
     after all distortion to prevent the reverberant tail from turning into a wall
     of compressed noise.
   - What is NOT_ESTABLISHED: Standard conventions do NOT constitute physical laws.
     Placing reverb before distortion does NOT violate signal flow integrity,
     mathematical DAG validity, or electrical circuit limits.

B. FROZEN ARCHITECTURAL CONTRACT:
   - Phase 1C.4a (Knowledge First — Rules Only Where Rules Genuinely Exist):
     Do NOT convert stylistic conventions, historical patterns, or common mixing
     habits into mandatory deterministic validation rules.
   - Phase 1C.4a (Deterministic Validation Ownership):
     Deterministic validation is strictly limited to: graph cycle detection, port
     type matching (audio vs control), mathematical validity, and buffer boundaries.
     It is PROHIBITED from rejecting a tone design on stylistic or aesthetic grounds.
   - Phase 1C.4b (Taxonomy: Knowledge Role PROFESSIONAL_CONVENTION):
     "Reverb after gain" must be classified as PROFESSIONAL_CONVENTION, not PHYSICAL_LAW.

C. ARCHITECTURAL EVALUATION:
   The frozen architecture demonstrates flawless protection of creative engineering
   freedom. When the post-reverb distortion signal chain is evaluated:
   1. The deterministic validator inspects the Directed Acyclic Graph (DAG):
      - Audio signal flow is acyclic (passes DAG check).
      - Buffer sample rates and channel counts match (stereo audio in/out).
      - Output levels remain bounded within floating-point ranges.
      - The validator issues a PASS.
   2. The sound engineer reasoning layer recognizes the topology:
      - It identifies that placing reverb before distortion causes extreme nonlinear
        compression of the reverberant decay, raising quiet tails to equal loudness
        with the initial attack, creating a dense wall-of-sound texture.
      - It evaluates this choice against the user's artistic intent (e.g. shoegaze
        ambience vs clean jazz articulation).
   3. Because the choice is intentional and physically valid, it is approved without
      spurious validation errors.

D. EXPECTED ARCHITECTURAL RESPONSE:
   - A conforming implementation would validate the signal chain as mechanically and
     syntactically valid.
   - A conforming implementation would allow the reasoning layer to evaluate the
     psychoacoustic texture without blocking the design.
   - PROHIBITED: Hardcoding a deterministic rule that throws an error when reverb
     precedes distortion.
   - PROHIBITED: Silently moving the reverb block to the end of the chain.

E. OWNERSHIP CHECK:
   Deterministic validation checks graph topology and data integrity; AI Sound
   Engineer reasoning evaluates artistic and acoustic intent. Neither usurps the other.

F. EPISTEMIC & PROVENANCE CHECK:
   Topology is grounded in nonlinear circuit behavior; convention is classified as
   PROFESSIONAL_CONVENTION; validity = FULLY_PERMISSIBLE.

G. PLATFORM CONTAMINATION CHECK:
   Pure platform-independent signal flow graph.

H. RESULT: PASS
   - Findings: None.
   - Rationale: The architecture strictly restricts deterministic validation to
     genuine structural invariants, preventing stylistic conventions from stifling
     unconventional engineering choices.
'''
