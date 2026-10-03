#!/usr/bin/env python3
"""
Sections 6 and 7 for TT_Engineering_Reasoning_Architecture_and_Decision_Lifecycle_v0.1.txt
"""

def get_sections_6_7():
    return '''================================================================================
SECTION 6 — PROPOSED REASONING RECORDS / CONTRACTS
================================================================================

6.1 THE CORE CONTRACT TAXONOMY
The Engineering Reasoning Architecture defines thirteen authoritative data
contracts. Each contract has a single, strictly delineated responsibility,
a defined mutability lifecycle, and formal epistemic boundaries.

The contracts are divided into four functional tiers:
  Tier 1: Ground Truth & Evidence Ingestion
    1. EngineeringIntentRecord (Immutable Intent Specification)
    2. CaseEvidenceAssessmentRecord (Multi-Modal Ground Truth & Lineage)
  Tier 2: Phenomenological & Diagnostic Synthesis
    3. ObservationRecord (Factual Observed Phenomena, Free of Causal Claims)
    4. HypothesisRecord & HypothesisWorkspaceRecord (Competing Causal Explanations)
    5. DiscriminatingEvidenceRequestRecord (Formal Diagnostics / Test Invocations)
    6. CausalDiagnosisRecord (Bounded Causal Synthesis)
  Tier 3: Solution Design & Decision
    7. EngineeringRequirementRecord (Abstract Causal Transformation Target)
    8. CandidateInterventionRecord (Materially Distinct Technical Pathways)
    9. ConstraintAndTradeOffEvaluationRecord (Multi-Dimensional Impact Analysis)
    10. EngineeringDecisionRecord (Selected Action, Alternatives, Uncertainty)
    11. PredictedOutcomeRecord (Falsifiable Primary/Secondary Forecasts)
  Tier 4: Verification, Review & Audit
    12. ActualOutcomeEvidenceRecord (Post-Intervention Captured Evidence)
    13. EngineeringReviewRecord (Dual-Track Quality Evaluation & Feedback)
    14. EngineeringReasoningTrace (Composite Audit Container)

6.2 FORMAL SCHEMA SPECIFICATIONS

Below are the formal structural schemas defining each record contract.

--------------------------------------------------------------------------------
CONTRACT 1: EngineeringIntentRecord
--------------------------------------------------------------------------------
Responsibility: Captures the user's artistic, musical, sonic, and production
objectives, along with non-negotiable constraints and aesthetic priorities.

```typescript
export interface EngineeringIntentRecord {
  record_id: string; // "eir_<hash>"
  schema_version: "1.0.0";
  timestamp: string; // ISO-8601 UTC
  session_id: string;
  
  musical_context: {
    genre?: string;
    subgenre?: string;
    era_aesthetic?: string; // e.g., "Late 1970s Hard Rock", "Modern Progressive Metal"
    mix_role: "SOLO_LEAD" | "RHYTHM_DOUBLE_LEFT" | "RHYTHM_DOUBLE_RIGHT" | "WALL_OF_SOUND" | "PERCUSSIVE_ACCENT" | "CLEAN_TEXTURE";
    arrangement_density: "SPARSE" | "MEDIUM" | "DENSE" | "EXTREME";
    complementary_elements: string[]; // e.g., ["Heavy sub-bass synth", "Aggressive double-kick", "Dark vocal"]
  };

  sonic_objectives: {
    spectral_profile: {
      low_end_character: "TIGHT_CONTROLLED" | "WARM_FULL" | "LOOSE_RESONANT" | "LEAN_FILTERED";
      midrange_focus: "SCOOPED" | "FORWARD_PUNCHY" | "BARK_CRUNCH" | "FLAT_TRANSPARENT";
      top_end_air: "DARK_SMOOTH" | "OPEN_NATURAL" | "BRIGHT_CUTTING" | "AGGRESSIVE_SIZZLE";
    };
    dynamic_character: "HIGHLY_DYNAMIC" | "CONTROLLED_PUNCH" | "COMPACT_SUSTAINED" | "HYPER_COMPRESSED";
    transient_response: "SHARP_CLICKY" | "PUNCHY_ORGANIC" | "SOFT_ROUNDED" | "HEAVILY_SMOOTHED";
    harmonic_density: "PRISTINE_CLEAN" | "EDGE_OF_BREAKUP" | "DYNAMIC_CRUNCH" | "DENSE_SATURATION" | "EXTREME_FUZZ";
    spatial_environment: "DIRECT_BONE_DRY" | "STUDIO_TIGHT_ROOM" | "REFLECTIVE_LIVE_ROOM" | "EXPANSIVE_AMBIENT";
  };

  non_negotiable_constraints: {
    preserve_core_instrument_character: boolean;
    prohibited_processing_classes?: string[]; // e.g., ["CHORUS", "PITCH_SHIFTER"]
    max_latency_tolerance_ms?: number;
    fixed_hardware_commitments?: string[]; // e.g., "Must keep physical tube preamp"
  };

  intent_priority_weighting: {
    primary_objective: string;
    secondary_objective: string;
    acceptable_compromise_areas: string[];
  };
}
```

--------------------------------------------------------------------------------
CONTRACT 2: CaseEvidenceAssessmentRecord
--------------------------------------------------------------------------------
Responsibility: Documents all available case inputs, their modalities, provenance,
capture chains, and objective properties, without interpretation.

```typescript
export interface CaseEvidenceAssessmentRecord {
  record_id: string; // "cear_<hash>"
  schema_version: "1.0.0";
  timestamp: string;
  run_id: string;
  intent_ref: string; // references EngineeringIntentRecord.record_id

  evidence_modalities_present: Array<
    "RAW_AUDIO_WAVEFORM" |
    "FEATURE_EXTRACTION_VECTOR" |
    "SPECTRAL_ANALYSIS_MAP" |
    "USER_VERBAL_DESCRIPTOR" |
    "EQUIPMENT_MANIFEST" |
    "TARGET_AUDIO_REFERENCE" |
    "CALIBRATION_TELEMETRY"
  >;

  evidence_items: Array<{
    item_id: string;
    modality: string;
    source_origin: "USER_DIRECT_UPLOAD" | "DAW_SESSION_CAPTURE" | "USER_TEXT_INPUT" | "EXTRACTED_DSP_FEATURE" | "CURATED_REFERENCE_CASE";
    lineage: {
      capture_device?: string;
      sample_rate_hz?: number;
      bit_depth?: number;
      transducer_lineage?: string; // e.g., "Guitar Output -> Passive DI -> Focusrite 2i2 -> DAW"
      calibration_status: "CALIBRATED_LEVELS" | "UNCALIBRATED_CONSUMER_CAPTURE" | "UNKNOWN";
    };
    raw_payload_ref?: string; // artifact reference or URI
    objective_properties: Record<string, unknown>; // e.g., peak_dbfs, rms_dbfs, crest_factor, spectral_centroid
  }>;

  perceptual_symptoms_reported: Array<{
    symptom_id: string;
    raw_term: string; // e.g., "flubby", "fizzy", "hollow", "harsh"
    source: "USER_TEXT" | "AUTOMATED_RULE_FLAG";
    reported_context: string; // e.g., "Occurs only during fast palm-muted runs on low B string"
  }>;

  contextual_priors: {
    genre?: string;
    artist_reference?: string;
    target_production_era?: string;
    known_rig_elements?: string[];
  };

  evidence_completeness: {
    completeness_status: "COMPREHENSIVE" | "PARTIAL" | "SPARSE" | "MINIMAL";
    unobserved_domains: Array<
      "DRY_DIRECT_INPUT_UNAVAILABLE" |
      "ROOM_ACOUSTICS_UNKNOWN" |
      "PICKUP_SPECIFICATIONS_UNKNOWN" |
      "CABINET_IMPEDANCE_CURVE_UNKNOWN" |
      "MIC_POLAR_RESPONSE_UNMEASURED"
    >;
  };
}
```

--------------------------------------------------------------------------------
CONTRACT 3: ObservationRecord
--------------------------------------------------------------------------------
Responsibility: Records verified, factual, non-causal descriptions of physical or
perceptual phenomena observed in the evidence.

```typescript
export interface ObservationRecord {
  record_id: string; // "obs_<hash>"
  schema_version: "1.0.0";
  timestamp: string;
  run_id: string;
  evidence_ref: string; // references CaseEvidenceAssessmentRecord.record_id

  observations: Array<{
    observation_id: string;
    domain: "SPECTRAL_BALANCE" | "TEMPORAL_DYNAMICS" | "HARMONIC_STRUCTURE" | "SPATIAL_IMAGING" | "NOISE_FLOOR";
    description: string; // STRICT RULE: Must be descriptive, NOT explanatory or diagnostic
    metric_evidence?: {
      measurement_name: string;
      measured_value: number | string;
      unit: string;
      frequency_band_hz?: [number, number];
      time_window_ms?: [number, number];
      reference_baseline_value?: number | string;
    };
    signal_state: "STEADY_STATE" | "ATTACK_TRANSIENT" | "DECAY_RESONANCE" | "IDLE_REST" | "INTERMUTED_PASSAGE";
    associated_symptom_refs: string[]; // references symptom_id from CaseEvidenceAssessmentRecord
  }>;

  negative_observations: Array<{
    checked_domain: string;
    finding: string; // e.g., "No DC offset detected; THD under clean conditions is below 0.05%"
  }>;
}
```

--------------------------------------------------------------------------------
CONTRACT 4: HypothesisRecord & HypothesisWorkspaceRecord
--------------------------------------------------------------------------------
Responsibility: Formulates, evaluates, and maintains multiple simultaneous,
competing hypotheses regarding the underlying causal mechanisms producing the
observations.

```typescript
export interface HypothesisRecord {
  hypothesis_id: string; // "hyp_<hash>"
  title: string;
  causal_mechanism_family: 
    "PRE_DISTORTION_FREQUENCY_CONGESTION" |
    "POST_DISTORTION_SPECTRAL_EXCESS" |
    "AMPLIFIER_POWER_STAGE_SAG" |
    "ASYMMETRIC_WAVEFORM_COLLAPSE" |
    "TRANSDUCER_CONE_BREAKUP" |
    "MICROPHONE_OFF_AXIS_PHASE_CANCELLATION" |
    "COMB_FILTERING_MULTI_TRANSDUCTION" |
    "EXCESSIVE_BROADBAND_COMPRESSION" |
    "GROUND_LOOP_ELECTRICAL_INDUCTION" |
    "INSTRUMENT_TRANSDUCER_OVERLOAD";

  causal_chain_locus: 
    "SOURCE_INSTRUMENT" |
    "PRE_NONLINEAR_FILTER" |
    "NONLINEAR_CLIPPING_STAGE" |
    "POWER_SUPPLY_AND_SAG" |
    "ELECTROACOUSTIC_TRANSDUCER" |
    "ACOUSTIC_WAVE_PROPAGATION" |
    "MICROPHONE_CAPSULE_TRANSDUCTION" |
    "POST_CAPTURE_PROCESSING";

  detailed_mechanism_description: string;

  grounding_knowledge_claims: Array<{
    claim_id: string; // references Phase 1C.4 KnowledgeClaim.claim_id
    epistemic_basis: string;
    relevance_rationale: string;
  }>;

  supporting_observations: Array<{
    observation_id: string;
    causal_explanatory_power: "DIRECT_MATCH" | "STRONGLY_CONSISTENT" | "PARTIALLY_CONSISTENT";
    explanation: string;
  }>;

  contradicting_observations: Array<{
    observation_id: string;
    anomaly_severity: "MILD_TENSION" | "SUBSTANTIAL_CONTRADICTION" | "DIRECT_FALSIFICATION";
    falsification_reasoning: string;
  }>;

  unexplained_observations: string[]; // observation_ids not accounted for by this mechanism

  epistemic_state: 
    "ACTIVE_STRONG" |
    "ACTIVE_CREDIBLE" |
    "ACTIVE_MARGINAL" |
    "WEAKENED_BY_CONTRADICTION" |
    "FALSIFIED_AND_RETIRED" |
    "UNRESOLVED_DUE_TO_DATA_LIMITATION";

  qualitative_evaluation_summary: string; // No scalar probabilities! Qualitative balance of evidence.
}

export interface HypothesisWorkspaceRecord {
  workspace_id: string;
  run_id: string;
  timestamp: string;
  hypotheses: HypothesisRecord[];
  competing_clusters: Array<{
    cluster_name: string;
    observation_target: string;
    competing_hypothesis_ids: string[];
    is_disambiguated: boolean;
  }>;
}
```

--------------------------------------------------------------------------------
CONTRACT 5: DiscriminatingEvidenceRequestRecord
--------------------------------------------------------------------------------
Responsibility: Emitted when available evidence is ambiguous and cannot
distinguish between competing hypotheses. Specifies actionable diagnostic tests
or targeted evidence acquisitions.

```typescript
export interface DiscriminatingEvidenceRequestRecord {
  request_id: string; // "derr_<hash>"
  run_id: string;
  timestamp: string;
  competing_hypothesis_ids: [string, string, ...string[]];

  ambiguity_diagnosis: string; // Why the current evidence is incapable of resolving the dispute

  requested_diagnostic_actions: Array<{
    action_type: 
      "CAPTURE_DRY_DIRECT_INPUT" |
      "SOLO_INDIVIDUAL_MICROPHONES" |
      "BYPASS_SUSPECTED_NONLINEAR_BLOCK" |
      "APPLY_CONTROLLED_SWEEP_TONE" |
      "ADJUST_PRE_GAIN_LOW_CUT_TEST" |
      "INVERT_MICROPHONE_POLARITY_TEST" |
      "CAPTURE_ISOLATED_PICKUP_BURST";
    test_protocol: string;
    expected_discriminating_criterion: {
      if_outcome_observed: string;
      then_favors_hypothesis_id: string;
      else_favors_hypothesis_id: string;
    };
    operational_effort: "TRIVIAL" | "MODERATE" | "HIGH_INTERVENTION_REQUIRED";
  }>;

  lifecycle_action: "PAUSE_FOR_DISCRIMINATING_EVIDENCE" | "PROCEED_WITH_BOUNDED_DISJUNCTION";
  justification_for_lifecycle_action: string;
}
```

--------------------------------------------------------------------------------
CONTRACT 6: CausalDiagnosisRecord
--------------------------------------------------------------------------------
Responsibility: Synthesizes validated hypotheses into a bounded, definitive or
disjunctive explanation of the sonic problem.

```typescript
export interface CausalDiagnosisRecord {
  diagnosis_id: string; // "diag_<hash>"
  run_id: string;
  timestamp: string;
  workspace_ref: string; // references HypothesisWorkspaceRecord.workspace_id

  diagnostic_structure: "SINGLE_ISOLATED_CAUSE" | "PRIMARY_AND_CONTRIBUTING_FACTORS" | "DISJUNCTIVE_COMPETING_CAUSES";

  primary_mechanism: {
    hypothesis_id: string;
    causal_mechanism_family: string;
    causal_locus: string;
    physical_summary: string;
    evidential_sufficiency: "DEFINITIVE" | "WELL_SUPPORTED" | "PLAUSIBLE_BOUNDED";
  };

  contributing_mechanisms?: Array<{
    hypothesis_id: string;
    interaction_type: "AMPLIFIES_PRIMARY" | "CONCURRENT_SECONDARY_DEFECT" | "PERCEPTUAL_MASKING";
    contribution_summary: string;
  }>;

  surviving_unresolved_alternatives?: Array<{
    hypothesis_id: string;
    retention_justification: string;
  }>;

  epistemic_bounds_and_uncertainty: {
    unverified_assumptions: string[];
    what_this_diagnosis_does_not_claim: string[];
  };
}
```

--------------------------------------------------------------------------------
CONTRACT 7: EngineeringRequirementRecord
--------------------------------------------------------------------------------
Responsibility: Formulates the abstract, gear-agnostic transformation required to
rectify the diagnosed causal mechanism while advancing Engineering Intent.

```typescript
export interface EngineeringRequirementRecord {
  requirement_id: string; // "req_<hash>"
  run_id: string;
  timestamp: string;
  diagnosis_ref: string; // references CausalDiagnosisRecord.diagnosis_id
  intent_ref: string; // references EngineeringIntentRecord.record_id

  causal_target_stage: 
    "PRE_CLIPPING_INPUT_CONDITIONING" |
    "DYNAMIC_HARMONIC_SATURATION" |
    "POWER_AMP_DYNAMIC_DAMPING" |
    "ACOUSTIC_RESONANCE_MANAGEMENT" |
    "TRANSDUCER_COUPLING_AND_PLACEMENT" |
    "POST_CAPTURE_SURGICAL_EQ" |
    "SYSTEM_NOISE_ATTENUATION";

  functional_objective: string; // e.g., "Attenuate excessive sub-120Hz fundamental energy prior to high-gain clipping to eliminate intermodulation blocking while preserving low-end body post-saturation."

  acoustic_transfer_requirements: {
    frequency_band_focus?: [number, number];
    required_dynamic_behavior: "STATIC_LINEAR" | "DYNAMIC_COMPRESSION" | "FREQUENCY_DEPENDENT_SATURATION" | "ENVELOPE_ATTACK_SHAPING";
    directional_shift: "ATTENUATE" | "BOOST" | "NARROW_BAND_NOTCH" | "DYNAMIC_SUPPRESS" | "HARMONICALLY_ENRICH";
    magnitude_envelope: "SURGICAL_MILD" | "MODERATE_CORRECTION" | "AGGRESSIVE_TRANSFORMATION";
  };

  musical_intent_preservation_boundary: string; // e.g., "Must not thin palm-mute chug punch below 150 Hz in steady state."
}
```

--------------------------------------------------------------------------------
CONTRACT 8: CandidateInterventionRecord
--------------------------------------------------------------------------------
Responsibility: Specifies a materially distinct technical pathway capable of
satisfying the engineering requirement.

```typescript
export interface CandidateInterventionRecord {
  intervention_id: string; // "cint_<hash>"
  requirement_ref: string; // references EngineeringRequirementRecord.requirement_id
  pathway_title: string;

  material_differentiation_class: 
    "SOURCE_INSTRUMENT_MODIFICATION" |
    "PRE_GAIN_ANALOG_VOICING" |
    "AMPLIFIER_OPERATING_POINT_ADJUSTMENT" |
    "SPEAKER_CABINET_SUBSTITUTION" |
    "MICROPHONE_SELECTION_AND_PLACEMENT" |
    "POST_PROCESSING_SURGICAL_INTERVENTION" |
    "MULTI_BLOCK_DISTRIBUTED_SOLUTION";

  target_signal_stage: string;

  processing_architecture: {
    primary_functional_role: "HIGH_PASS_FILTER" | "PARAMETRIC_DYNAMIC_EQ" | "OVERDRIVE_MID_HUMP" | "MIC_DISTANCE_PROXIMITY_REDUCTION" | "POWER_AMP_SAG_STIFFENING" | "BAND_SPLIT_SATURATION";
    operational_parameters: Record<string, string | number>; // Platform-agnostic units (Hz, dB, Q, ms)
  };

  causal_alignment_explanation: string; // Why this intervention addresses the diagnosed root cause
}
```

--------------------------------------------------------------------------------
CONTRACT 9: ConstraintAndTradeOffEvaluationRecord
--------------------------------------------------------------------------------
Responsibility: Evaluates candidates against physical, musical, and platform-agnostic
constraints, explicitly mapping secondary acoustic trade-offs.

```typescript
export interface ConstraintAndTradeOffEvaluationRecord {
  evaluation_id: string; // "ctoe_<hash>"
  run_id: string;
  candidate_evaluations: Array<{
    intervention_id: string;
    
    constraint_compliance: {
      satisfies_intent_priorities: boolean;
      violates_non_negotiables: boolean;
      violation_details?: string[];
    };

    primary_engineering_efficacy: {
      effectiveness_assessment: "HIGHLY_EFFECTIVE" | "MODERATELY_EFFECTIVE" | "PARTIALLY_EFFECTIVE";
      causal_locus_correctness: "OPTIMAL_CAUSAL_LOCUS" | "SUBOPTIMAL_BUT_VIABLE" | "INCORRECT_CAUSAL_LOCUS";
    };

    secondary_acoustic_trade_offs: Array<{
      affected_domain: "PHASE_COHERENCE" | "TRANSIENT_PUNCH" | "NOISE_FLOOR" | "TONAL_BODY" | "DYNAMIC_FEEL" | "HARMONIC_RICHNESS";
      impact_description: string;
      severity: "NEGLIGIBLE" | "ACCEPTABLE_COLLATERAL" | "SIGNIFICANT_DEGRADATION" | "INTENT_BREAKING";
      mitigation_strategy?: string;
    }>;

    signal_path_parsimony: {
      added_complexity: "MINIMAL_INLINE" | "MODERATE_STAGE" | "HIGH_MULTIBLOCK";
      unnecessary_processing_risk: "LOW" | "ELEVATED" | "UNJUSTIFIED";
    };

    overall_professional_verdict: "RECOMMENDED_PRIMARY" | "CREDIBLE_ALTERNATIVE" | "REJECTED_ON_CONSTRAINTS" | "REJECTED_ON_TRADE_OFFS";
    deliberation_notes: string;
  }>;
}
```

--------------------------------------------------------------------------------
CONTRACT 10: EngineeringDecisionRecord
--------------------------------------------------------------------------------
Responsibility: Documents the selected primary intervention, justifies the choice
over alternatives, explicitly lists preserved alternatives, and documents
residual uncertainty.

```typescript
export interface EngineeringDecisionRecord {
  decision_id: string; // "edec_<hash>"
  run_id: string;
  timestamp: string;
  requirement_ref: string;
  evaluation_ref: string;

  selected_primary_intervention: {
    intervention_id: string;
    summary: string;
    selection_justification: string;
  };

  retained_credible_alternatives: Array<{
    intervention_id: string;
    summary: string;
    contingency_application_condition: string; // When to switch to this alternative if primary fails
  }>;

  rejected_interventions: Array<{
    intervention_id: string;
    rejection_reason: string;
  }>;

  residual_uncertainty: {
    unresolved_questions: string[];
    unobserved_variable_risks: string[];
    confidence_envelope: "TIGHTLY_CONSTRAINED" | "MODERATELY_BOUNDED" | "EXPLORATORY_PROVISIONAL";
  };
}
```

--------------------------------------------------------------------------------
CONTRACT 11: PredictedOutcomeRecord
--------------------------------------------------------------------------------
Responsibility: Establishes falsifiable, concrete predictions of primary sonic
changes and secondary trade-offs resulting from the decision.

```typescript
export interface PredictedOutcomeRecord {
  prediction_id: string; // "pred_<hash>"
  decision_ref: string; // references EngineeringDecisionRecord.decision_id
  timestamp: string;

  predicted_primary_effects: Array<{
    domain: "SPECTRAL" | "DYNAMIC" | "HARMONIC" | "TRANSIENT";
    predicted_change: string; // e.g., "Attenuation of 100-200 Hz mud by ~4 dB during low-end palm mutes; elimination of low-frequency intermodulation fuzz."
    verifiable_metric_target?: {
      target_metric: string;
      expected_range: [number, number];
      unit: string;
    };
  }>;

  predicted_secondary_effects: Array<{
    domain: string;
    predicted_impact: string; // e.g., "Slight thinning of single-note lead lines if played on low strings without neck pickup."
    acceptability_threshold: string;
  }>;

  explicit_falsification_criteria: Array<{
    observation_condition: string;
    indicates: "PRE_GAIN_DIAGNOSIS_WAS_INCORRECT" | "INTERVENTION_TOO_AGGRESSIVE" | "SECONDARY_RESONANCE_UNMASKED";
  }>;
}
```

--------------------------------------------------------------------------------
CONTRACT 12: ActualOutcomeEvidenceRecord
--------------------------------------------------------------------------------
Responsibility: Ingests post-intervention audio, measurements, and user evaluation
following downstream implementation and execution.

```typescript
export interface ActualOutcomeEvidenceRecord {
  outcome_evidence_id: string; // "aoer_<hash>"
  decision_ref: string;
  prediction_ref: string;
  timestamp: string;

  captured_audio_items: Array<{
    item_id: string;
    capture_type: "POST_INTERVENTION_RENDER" | "RE_RECORDED_PERFORMANCE";
    objective_properties: Record<string, unknown>;
  }>;

  measured_deltas: Array<{
    domain: string;
    metric_name: string;
    pre_intervention_value: number | string;
    post_intervention_value: number | string;
    measured_delta: number | string;
    unit: string;
  }>;

  user_perceptual_feedback?: {
    raw_user_response: string;
    perceived_problem_resolved: boolean;
    new_symptoms_reported: string[];
  };
}
```

--------------------------------------------------------------------------------
CONTRACT 13: EngineeringReviewRecord
--------------------------------------------------------------------------------
Responsibility: Conducts dual-track retrospective evaluation of Reasoning Quality
and Outcome Quality, closing the learning loop without rewriting historical records.

```typescript
export interface EngineeringReviewRecord {
  review_id: string; // "erev_<hash>"
  run_id: string;
  timestamp: string;
  decision_ref: string;
  outcome_ref: string;

  dual_track_evaluation: {
    reasoning_quality: {
      evidence_adequacy: "EXCELLENT" | "ADEQUATE" | "POOR_LACKING_CRUCIAL_DATA";
      hypothesis_soundness: "FLAWLESS_RIGOR" | "DEFENSIBLE_UNDER_UNCERTAINTY" | "FLAWED_PREMATURE_NARROWING";
      causal_logic_integrity: "STRICTLY_CAUSAL" | "MOSTLY_CAUSAL" | "LEAKED_SYMPTOM_HEURISTIC";
      overall_reasoning_verdict: "SOUND_ENGINEERING" | "VALID_UNDER_CONSTRAINTS" | "DEFECTIVE_REASONING";
    };

    outcome_quality: {
      primary_intent_achieved: "FULLY_ACHIEVED" | "PARTIALLY_ACHIEVED" | "FAILED" | "DEGRADED";
      prediction_accuracy: "PREDICTIONS_ACCURATELY_MATCHED" | "SURPRISES_OBSERVED" | "PREDICTIONS_FALSIFIED";
      trade_off_severity_actual: "WITHIN_PREDICTED_BOUNDS" | "WORSE_THAN_EXPECTED" | "NEGLIGIBLE";
    };
  };

  independence_finding: {
    quadrant: 
      "GOOD_REASONING_GOOD_OUTCOME" | // Ideal engineering
      "GOOD_REASONING_POOR_OUTCOME" | // Latent unobserved variables or uncooperative physics
      "POOR_REASONING_GOOD_OUTCOME" | // Lucky guess; must not be canonized!
      "POOR_REASONING_POOR_OUTCOME";  // Flawed analysis and failed tone
    explanation: string;
  };

  iteration_recommendation: 
    "SATISFIED_CLOSE_CYCLE" |
    "ITERATE_EXECUTE_CONTINGENT_ALTERNATIVE" |
    "ITERATE_GATHER_DISCRIMINATING_EVIDENCE" |
    "ITERATE_REVISE_DIAGNOSIS" |
    "ABSTAIN_UNSOLVABLE_UNDER_CONSTRAINTS";

  knowledge_architecture_candidate_lesson_ref?: string; // Eligible for CandidateLesson quarantine if generalizable
}
```

--------------------------------------------------------------------------------
COMPOSITE RUN CONTAINER: EngineeringReasoningTrace
--------------------------------------------------------------------------------
Responsibility: Aggregates all records generated within a single reasoning run,
guaranteeing complete provenance, causal traceability, and cryptographic integrity.

```typescript
export interface EngineeringReasoningTrace {
  trace_id: string; // "ert_<hash>"
  run_id: string;
  session_id: string;
  timestamp_start: string;
  timestamp_completed: string;
  reasoning_architecture_version: "0.1.0";
  knowledge_retrieval_snapshot_id: string;

  // Ordered execution lineage
  intent_record: EngineeringIntentRecord;
  evidence_record: CaseEvidenceAssessmentRecord;
  observation_record: ObservationRecord;
  hypothesis_workspace: HypothesisWorkspaceRecord;
  discriminating_evidence_request?: DiscriminatingEvidenceRequestRecord;
  causal_diagnosis: CausalDiagnosisRecord;
  engineering_requirement: EngineeringRequirementRecord;
  candidate_interventions: CandidateInterventionRecord[];
  trade_off_evaluation: ConstraintAndTradeOffEvaluationRecord;
  engineering_decision: EngineeringDecisionRecord;
  predicted_outcome: PredictedOutcomeRecord;

  // Post-Execution (Appended upon iteration/review)
  actual_outcome_evidence?: ActualOutcomeEvidenceRecord;
  engineering_review?: EngineeringReviewRecord;

  cryptographic_hash: string; // SHA-256 over entire record payload
}
```


================================================================================
SECTION 7 — ENGINEERING DECISION LIFECYCLE
================================================================================

7.1 THE 14-STAGE DECISION STATE MACHINE
The Engineering Decision Lifecycle executes as a formal state machine comprising
14 ordered stages. While conceptually linear, the architecture provides explicit
branching, pausing, backtracking, and iteration loops.

  Stage 01: INTENT_INTAKE
    - Action: Ingest user goals, mix role, sonic target, non-negotiable constraints.
    - Emits: EngineeringIntentRecord.
    - Gate: Intent completeness and consistency validation.

  Stage 02: CASE_EVIDENCE_ASSESSMENT
    - Action: Ingest audio, descriptors, settings, calibration status. Registry
      of unobserved parameters.
    - Emits: CaseEvidenceAssessmentRecord.
    - Gate: Multi-modal lineage verification; no symptom lookup.

  Stage 03: OBSERVATION_FORMATION
    - Action: Extract objective physical and perceptual facts from evidence.
    - Emits: ObservationRecord.
    - Invariant: Zero causal explanations permitted in observation descriptions.

  Stage 04: HYPOTHESIS_GENERATION
    - Action: Generate multiple competing causal mechanisms grounded in Phase 1C.4
      knowledge claims.
    - Emits: Initial HypothesisWorkspaceRecord.
    - Invariant: Minimum 2 competing hypotheses where symptom is multi-causal.

  Stage 05: HYPOTHESIS_EVALUATION_AND_COMPETITION
    - Action: Link observations as supporting, contradicting, or unexplained.
      Qualitative balance of evidence.
    - Updates: HypothesisWorkspaceRecord (epistemic states).

  Stage 06: DISCRIMINATING_EVIDENCE_CHECK
    - Decision Branch:
      * IF competing credible hypotheses cannot be narrowed AND diagnostic test
        is viable: TRANSITION to Stage 06A (DISCRIMINATING_EVIDENCE_SEEKING).
      * ELSE IF evidence is sufficient OR uncertainty is acceptable:
        TRANSITION to Stage 07 (CAUSAL_DIAGNOSIS).

  Stage 06A: DISCRIMINATING_EVIDENCE_SEEKING (Conditional Pause)
    - Action: Emit DiscriminatingEvidenceRequestRecord (request DI, solo mic, sweep).
    - Status: PAUSED awaiting new evidence, OR execute bounded fallback if user declines.
    - Loopback: When new evidence arrives, loops back to Stage 02.

  Stage 07: CAUSAL_DIAGNOSIS
    - Action: Formulate bounded causal explanation (Single, Primary+Contributing,
      or Disjunctive).
    - Emits: CausalDiagnosisRecord.
    - Invariant: Explicitly records unverified assumptions and epistemic limits.

  Stage 08: ENGINEERING_REQUIREMENT_FORMATION
    - Action: Bridge Causal Diagnosis and Engineering Intent into abstract transformation.
    - Emits: EngineeringRequirementRecord.
    - Invariant: Purely functional and gear-agnostic.

  Stage 09: CANDIDATE_INTERVENTION_GENERATION
    - Action: Generate materially distinct engineering pathways at causally
      appropriate signal stages.
    - Emits: CandidateInterventionRecord[].
    - Invariant: Minimum 2 distinct pathways generated for complex problems.

  Stage 10: CONSTRAINT_AND_TRADE_OFF_ANALYSIS
    - Action: Evaluate candidates against acoustic trade-offs, constraints, and
      signal parsimony.
    - Emits: ConstraintAndTradeOffEvaluationRecord.
    - Invariant: No arbitrary scalar arithmetic; qualitative impact analysis.

  Stage 11: ENGINEERING_DECISION_AND_PREDICTION
    - Action: Select primary intervention, preserve credible alternatives,
      document residual uncertainty, formulate falsifiable predictions.
    - Emits: EngineeringDecisionRecord and PredictedOutcomeRecord.
    - Gate: Both records sealed together.

  Stage 12: SEMANTIC_TONE_DESIGN_HANDOFF
    - Action: Convert selected intervention into abstract semantic signal
      processing topology.
    - Emits: SemanticToneDesign payload (Firewall: NO reasoning internals).

  [DOWNSTREAM EXECUTION: Platform Translation, Exporter, Hardware/Software Execution]

  Stage 13: OUTCOME_EVIDENCE_INGESTION
    - Action: Ingest re-recorded audio, post-render measurements, user evaluation.
    - Emits: ActualOutcomeEvidenceRecord.

  Stage 14: ENGINEERING_REVIEW_AND_ITERATION
    - Action: Dual-track retrospective evaluation (Reasoning Quality vs Outcome Quality).
    - Emits: EngineeringReviewRecord.
    - Decision:
      * IF Intent satisfied: COMPLETE.
      * IF Unmet: TRIGGER ITERATION (Creates new RunID, referencing previous trace).

7.2 NON-LINEAR PATHWAYS & BACKTRACK TRIGGERS
The lifecycle is not an inflexible waterfall. The following formal transitions
are built into the state machine:

  1. The Discriminating Evidence Branch (Stage 06 -> 06A -> 02):
     Recognizes ambiguity before making risky irreversible choices.
  2. The Constraint Deadlock Backtrack (Stage 10 -> 08):
     If all candidate interventions are disqualified by non-negotiable intent
     constraints, the engine backtracks to Stage 08 to reconsider whether a
     different engineering requirement can be formulated.
  3. The Disproved Causal Mechanism Loop (Stage 14 -> 04):
     If outcome evidence proves the diagnosed causal mechanism was false,
     the review engine launches a new run, retiring the disproved hypothesis and
     elevating the surviving alternative.
'''

if __name__ == "__main__":
    print(get_sections_6_7()[:300])
