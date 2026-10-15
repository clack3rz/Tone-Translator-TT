// src/sound-engineer/validation/profiles/types.ts
// Authoritative type definitions and interfaces for Phase 1C.5h WP-07:
// Test Profile Template Repository & Applicability Rules Engine (Record 7).
// Bound to frozen specification v0.1j Section 13, Table 05, and Table 07.

import {
  FIXTURE_CLASSES,
  FixtureClass,
  REQUIRED_EVIDENCE_CLASSES,
  RequiredEvidenceClass,
  TEST_PROFILE_FAMILIES,
  TestProfileFamily,
} from "../schemas/enums";
import { TestProfileRecord, ValidationScopeRecord } from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";

export {
  TEST_PROFILE_FAMILIES,
  type TestProfileFamily,
  FIXTURE_CLASSES,
  type FixtureClass,
  REQUIRED_EVIDENCE_CLASSES,
  type RequiredEvidenceClass,
};

/**
 * Standard subsystem / component class classifications from Table 05.
 * Used for deterministic fit-for-purpose profile applicability decisions.
 */
export const COMPONENT_CLASSES = {
  // Profile 01 / 02 / 03 (Deterministic & Platform)
  PRESET_EXPORTER: "Preset Exporter",
  RULE_ENGINE: "Rule Engine",
  PARAMETER_REMAPPING: "Parameter Remapping",
  CONFIGURATION: "Configuration",
  NORMALIZER: "Normalizer",
  GAIN_CALCULATOR: "Gain Calculator",
  TONE_STACK_MATH: "Tone-Stack Math",
  SERIALIZER: "Serializer",
  STAGE12_TRANSLATION: "Stage 12 Translation",

  // Profile 04 / 05 / 06 / 07 / 08 (Acoustic, Dynamic & Perceptual)
  AMP_MODEL: "Amp Model",
  CABINET_EMULATOR: "Cabinet Emulator",
  EQ_MODULE: "EQ Module",
  ANALOG_SATURATION: "Analog Saturation",
  OVERDRIVE: "Overdrive",
  COMPRESSOR: "Compressor",
  GATE: "Gate",
  POWER_AMP_SAG: "Power-Amp Sag",
  CORE_GUITAR_PRESET: "Core Guitar Preset",
  COMPLETE_GUITAR_TONE: "Complete Guitar Tone",
  CABINET_IR_SELECTION: "Cabinet IR Selection",
  LIVE_DSP_MODEL: "Live DSP Model",
  INTERACTIVE_GUITAR_EMULATION: "Interactive Guitar Emulation",
  STUDIO_MIX_PRESET: "Studio Mix Preset",
  MULTITRACK_MIX: "Multitrack Mix",
  MULTI_MIC_BLEND: "Multi-Mic Blend",

  // Profile 09 (Regression)
  MIGRATED_COMPONENT: "Migrated Component",

  // Profile 10 (Operational Stability)
  DSP_ENGINE: "DSP Engine",
  EXECUTION_PIPELINE: "Execution Pipeline",
  BACKGROUND_SHADOW_PIPELINE: "Background Shadow Pipeline",
  EXPORT_BATCH_SERVICE: "Export Batch Service",

  // Profile 11 (Rollback)
  DEPLOYMENT_CANDIDATE: "Deployment Candidate",
  PRODUCTION_CUTOVER_CANDIDATE: "Production Cutover Candidate",

  // Profile 12 (Adversarial / Edge-Case)
  SIGNAL_INTAKE: "Signal Intake",
  USER_FACING_UI: "User-Facing UI",
  PLATFORM_FACING_MODULE: "Platform-Facing Module",

  // Profile 13 (Traceability / Governance)
  AI_REASONING_RUN: "AI Reasoning Run",
  GOVERNANCE_AUDIT: "Governance Audit",

  // Profile 14 (User-Workflow / UAT)
  FULL_APPLICATION_UI: "Full Application UI",
  USER_WORKFLOW: "User Workflow",
  PRESET_DISCOVERY: "Preset Discovery",
} as const;

export type ComponentClass =
  (typeof COMPONENT_CLASSES)[keyof typeof COMPONENT_CLASSES];

/**
 * Standard Table 07 Validation Questions for objective vs perceptual applicability rules.
 */
export const TABLE_07_QUESTIONS = {
  PRESET_LOAD_ERROR_FREE: "Does the target platform preset load without errors?",
  AUDIO_FREE_OF_DIGITAL_CLIPPING: "Is the output audio free of digital clipping?",
  GUITAR_TONE_CUT_THROUGH_MIX: "Does the guitar tone cut through a heavy mix?",
  AMP_CLEAN_UP_VOLUME_ROLLOFF: "Does the amp model clean up on guitar volume roll-off?",
  EQ_PARAMETERS_SAFE_RANGE: "Are the EQ parameter values within safe ranges?",
  CABINET_EXHIBIT_HARSH_FIZZ: "Does the speaker cabinet exhibit harsh fizz?",
  ROLLBACK_MEET_RECOVERY_OBJECTIVES: "Does automated rollback meet recovery objectives?",
  TONE_INSPIRING_GENRE_AUTHENTIC: "Is the tone inspiring and genre-authentic?",
} as const;

export type Table07Question =
  (typeof TABLE_07_QUESTIONS)[keyof typeof TABLE_07_QUESTIONS];

/**
 * Input descriptor representing a candidate component or subject for validation profile evaluation.
 */
export interface ValidationSubjectInput {
  /** Identifier of the validation subject */
  readonly subjectId: string;
  /** Component class / architecture subsystem classification */
  readonly componentClass: string;
  /** Primary operational domain / function */
  readonly operationalDomain?: string;
  /** Specific candidate unit identifier within scope (e.g. amp model ID) */
  readonly unitId?: string;
  /** Optional ValidationScopeRecord (from WP-04) for boundary enforcement */
  readonly scopeRecord?: ValidationScopeRecord;
  /** True if component is replacing legacy production heuristics (Profile 09 mandatory) */
  readonly isMigrated?: boolean;
  /** True if component is being evaluated for Gate 8 production cutover (Profile 11 mandatory) */
  readonly isProductionCutoverCandidate?: boolean;
  /** True if component handles external inputs, UI, or raw payloads (Profile 12 mandatory) */
  readonly isUserFacingOrSignalIntake?: boolean;
  /** True if subject executes AI Sound Engineer reasoning (Profile 13 mandatory) */
  readonly isAiReasoningRun?: boolean;
  /** True if subject is an end-to-end user workflow or interactive UI (Profile 14 mandatory) */
  readonly isEndToEndWorkflow?: boolean;
  /** Explicit Table 07 validation question if targeting a specific empirical inquiry */
  readonly validationQuestion?: string;
  /** Risk profile classification */
  readonly riskProfile?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  /** Declared failure modes */
  readonly failureModes?: ReadonlyArray<string>;
  /** Explicit request to assign all profiles without justification (Anti-Universal-Scorecard guard will refuse) */
  readonly requestAllProfiles?: boolean;
}

/**
 * Diagnostic decision record explaining the rule-level justification for a single profile.
 */
export interface ProfileDecisionDiagnostic {
  readonly profileId: string;
  readonly profileFamily: TestProfileFamily;
  readonly classification: "MANDATORY" | "OPTIONAL" | "NON_APPLICABLE" | "UNRESOLVED";
  readonly governingRule: string;
  readonly rationale: string;
}

/**
 * Comprehensive result of evaluating profile applicability for a validation subject.
 */
export interface ProfileApplicabilityResult {
  /** Identifier of the evaluated subject */
  readonly subjectId: string;
  /** Evaluated component class */
  readonly componentClass: string;
  /** Mandatory profiles assigned by frozen rules (sorted PROFILE-01 through PROFILE-14) */
  readonly mandatoryProfiles: ReadonlyArray<TestProfileRecord>;
  /** Optional profiles assigned by frozen rules (sorted PROFILE-01 through PROFILE-14) */
  readonly optionalProfiles: ReadonlyArray<TestProfileRecord>;
  /** Non-applicable profiles excluded by orthogonal boundaries */
  readonly nonApplicableProfiles: ReadonlyArray<TestProfileRecord>;
  /** Detailed rule-level diagnostics explaining each assignment */
  readonly diagnostics: ReadonlyArray<ProfileDecisionDiagnostic>;
  /** True if applicability was successfully resolved against frozen rules */
  readonly isResolved: boolean;
  /** Detailed reason if applicability could not be resolved safely */
  readonly unresolvedReason?: string;
  /** Required evidence classes implied by mandatory profiles (from Table 06/07) */
  readonly requiredEvidenceClasses: ReadonlyArray<RequiredEvidenceClass>;
  /** True if WP-04 scope check passed for unitId and componentClass */
  readonly isScopeAllowed: boolean;
  /** Scope violation reason if blocked by WP-04 ScopeEnforcer */
  readonly scopeViolationReason?: string;
}

/**
 * Dependencies injected into TestProfileRepository or ProfileApplicabilityEngine.
 */
export interface ProfileSubsystemDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
}
