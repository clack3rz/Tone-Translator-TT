// src/sound-engineer/validation/profiles/applicabilityEngine.ts
// ProfileApplicabilityEngine: Evaluates validation subjects against frozen Section 13, Table 05, and Table 07 rules.
// Enforces orthogonal evidence domains, Anti-Universal-Scorecard discipline, and WP-04 Scope containment.

import { deepFreeze } from "../../contracts/immutability";
import {
  REQUIRED_EVIDENCE_CLASSES,
  RequiredEvidenceClass,
  TEST_PROFILE_FAMILIES,
  TestProfileFamily,
} from "../schemas/enums";
import { TestProfileRecord } from "../schemas/records";
import { ScopeEnforcer } from "../scope/scopeEnforcer";
import { CANONICAL_TEST_PROFILES } from "./profileDefinitions";
import { TestProfileRepository } from "./profileRepository";
import {
  COMPONENT_CLASSES,
  ProfileApplicabilityResult,
  ProfileDecisionDiagnostic,
  TABLE_07_QUESTIONS,
  ValidationSubjectInput,
} from "./types";

/**
 * Normalizes text for robust matching against recognized Table 05 component classes.
 */
function normalizeClass(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export class ProfileApplicabilityEngine {
  private readonly repository: TestProfileRepository;

  constructor(repository?: TestProfileRepository) {
    this.repository = repository ?? new TestProfileRepository();
  }

  /**
   * Evaluates fit-for-purpose profile applicability for a candidate validation subject.
   *
   * Enforces:
   * 1. WP-04 Scope Containment (cannot widen scope or assign profiles to excluded/out-of-scope units);
   * 2. Anti-Universal-Scorecard Discipline (refuses ungrounded "all 14 profiles" requests);
   * 3. Table 05 Mandatory vs Optional Subsystem Mappings;
   * 4. Table 07 Objective vs Perceptual Applicability Matrix;
   * 5. Unknown Component Class Fail-Closed Safeguard (does NOT default to universal scorecard).
   */
  public evaluateApplicability(input: ValidationSubjectInput): ProfileApplicabilityResult {
    if (!input || !input.subjectId) {
      throw new Error("Cannot evaluate profile applicability: subjectId is required.");
    }

    const diagnostics: ProfileDecisionDiagnostic[] = [];
    const rawClass = (input.componentClass ?? "").trim();
    const normalizedCls = normalizeClass(rawClass);

    // -------------------------------------------------------------------------
    // 1. WP-04 Scope Containment Check
    // -------------------------------------------------------------------------
    if (input.scopeRecord) {
      const enforcer = new ScopeEnforcer(input.scopeRecord);

      // Check unitId if provided
      if (input.unitId) {
        const check = enforcer.isWithinScope(input.unitId);
        if (!check) {
          const reason = `Validation subject "${input.subjectId}" references unit "${input.unitId}" which is outside declared validation scope or explicitly excluded. Profile applicability cannot override scope.`;
          return deepFreeze({
            subjectId: input.subjectId,
            componentClass: rawClass,
            mandatoryProfiles: [],
            optionalProfiles: [],
            nonApplicableProfiles: this.repository.getAllProfiles(),
            diagnostics: [
              {
                profileId: "ALL_PROFILES",
                profileFamily: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
                classification: "NON_APPLICABLE",
                governingRule: "WP-04 Scope Containment (Axiom 6 / Invariant 2)",
                rationale: reason,
              },
            ],
            isResolved: false,
            unresolvedReason: reason,
            requiredEvidenceClasses: [],
            isScopeAllowed: false,
            scopeViolationReason: reason,
          });
        }
      }

      // Check component class against excluded units
      for (const excluded of input.scopeRecord.excluded_units) {
        if (rawClass.toLowerCase().includes(excluded.toLowerCase())) {
          const reason = `Validation subject "${input.subjectId}" declared componentClass "${rawClass}" matches explicitly excluded unit "${excluded}". Profile assignment forbidden.`;
          return deepFreeze({
            subjectId: input.subjectId,
            componentClass: rawClass,
            mandatoryProfiles: [],
            optionalProfiles: [],
            nonApplicableProfiles: this.repository.getAllProfiles(),
            diagnostics: [
              {
                profileId: "ALL_PROFILES",
                profileFamily: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
                classification: "NON_APPLICABLE",
                governingRule: "WP-04 Scope Containment (Axiom 6 / Invariant 2)",
                rationale: reason,
              },
            ],
            isResolved: false,
            unresolvedReason: reason,
            requiredEvidenceClasses: [],
            isScopeAllowed: false,
            scopeViolationReason: reason,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. Anti-Universal-Scorecard Guard
    // -------------------------------------------------------------------------
    if (input.requestAllProfiles === true) {
      const reason = `Arbitrary request for universal test execution refused. Section 13.1 strictly prohibits universal fixed scorecards. Profiles must be fit-for-purpose based on orthogonal evidence domains.`;
      return deepFreeze({
        subjectId: input.subjectId,
        componentClass: rawClass,
        mandatoryProfiles: [],
        optionalProfiles: [],
        nonApplicableProfiles: this.repository.getAllProfiles(),
        diagnostics: [
          {
            profileId: "ALL_PROFILES",
            profileFamily: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
            classification: "NON_APPLICABLE",
            governingRule: "Section 13.1 Anti-Universal-Scorecard Rule",
            rationale: reason,
          },
        ],
        isResolved: false,
        unresolvedReason: reason,
        requiredEvidenceClasses: [],
        isScopeAllowed: true,
      });
    }

    // -------------------------------------------------------------------------
    // 3. Unknown / Unsupported Component Class Fail-Closed Guard
    // -------------------------------------------------------------------------
    const isKnownClass = this.isRecognizedComponentClass(normalizedCls, input);
    if (!isKnownClass) {
      const reason = `Unknown or unsupported component class "${rawClass}". The engine fails closed and refuses to fabricate a universal scorecard. Explicit architectural classification is required.`;
      return deepFreeze({
        subjectId: input.subjectId,
        componentClass: rawClass,
        mandatoryProfiles: [],
        optionalProfiles: [],
        nonApplicableProfiles: this.repository.getAllProfiles(),
        diagnostics: [
          {
            profileId: "UNRESOLVED_CLASS",
            profileFamily: TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA,
            classification: "UNRESOLVED",
            governingRule: "Section 13.1 Fail-Closed Unknown Classification Safeguard",
            rationale: reason,
          },
        ],
        isResolved: false,
        unresolvedReason: reason,
        requiredEvidenceClasses: [],
        isScopeAllowed: true,
      });
    }

    // -------------------------------------------------------------------------
    // 4. Evaluate Each Canonical Profile Against Table 05 and Table 07 Rules
    // -------------------------------------------------------------------------
    const mandatoryMap = new Map<TestProfileFamily, TestProfileRecord>();
    const optionalMap = new Map<TestProfileFamily, TestProfileRecord>();

    for (const profile of CANONICAL_TEST_PROFILES) {
      const family = profile.profile_family as TestProfileFamily;
      const decision = this.evaluateSingleProfile(profile, normalizedCls, input);

      diagnostics.push(decision);

      if (decision.classification === "MANDATORY") {
        mandatoryMap.set(family, profile);
      } else if (decision.classification === "OPTIONAL") {
        optionalMap.set(family, profile);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Build Ordered Canonical Output Lists
    // -------------------------------------------------------------------------
    const mandatoryProfiles: TestProfileRecord[] = [];
    const optionalProfiles: TestProfileRecord[] = [];
    const nonApplicableProfiles: TestProfileRecord[] = [];

    for (const profile of CANONICAL_TEST_PROFILES) {
      const family = profile.profile_family as TestProfileFamily;
      if (mandatoryMap.has(family)) {
        mandatoryProfiles.push(mandatoryMap.get(family)!);
      } else if (optionalMap.has(family)) {
        optionalProfiles.push(optionalMap.get(family)!);
      } else {
        nonApplicableProfiles.push(profile);
      }
    }

    // -------------------------------------------------------------------------
    // 6. Synthesize Required Evidence Classes (Table 06 / Table 07)
    // -------------------------------------------------------------------------
    const requiredEvidenceClasses = this.determineRequiredEvidenceClasses(
      mandatoryProfiles,
      input.validationQuestion
    );

    return deepFreeze({
      subjectId: input.subjectId,
      componentClass: rawClass,
      mandatoryProfiles,
      optionalProfiles,
      nonApplicableProfiles,
      diagnostics,
      isResolved: true,
      requiredEvidenceClasses,
      isScopeAllowed: true,
    });
  }

  // =========================================================================
  // Private Subsystem Evaluators
  // =========================================================================

  /**
   * Tests whether a component class or input descriptor matches any recognized Table 05 subsystem.
   */
  private isRecognizedComponentClass(normalizedCls: string, input: ValidationSubjectInput): boolean {
    if (!normalizedCls) {
      return false;
    }

    // Check against standard Table 05 component classes
    const recognizedClasses = [
      "presetexporter",
      "ruleengine",
      "parameterremapping",
      "configuration",
      "normalizer",
      "gaincalculator",
      "tonestackmath",
      "serializer",
      "stage12translation",
      "ampmodel",
      "cabinetemulator",
      "eqmodule",
      "analogsaturation",
      "overdrive",
      "compressor",
      "gate",
      "powerampsag",
      "coreguitarpreset",
      "completeguitartone",
      "cabinetirselection",
      "livedspmodel",
      "interactiveguitaremulation",
      "studiomixpreset",
      "multitrackmix",
      "multimicblend",
      "migratedcomponent",
      "dspengine",
      "executionpipeline",
      "backgroundshadowpipeline",
      "exportbatchservice",
      "deploymentcandidate",
      "productioncutovercandidate",
      "signalintake",
      "userfacingui",
      "platformfacingmodule",
      "aireasoningrun",
      "governanceaudit",
      "fullapplicationui",
      "userworkflow",
      "presetdiscovery",
      "pureaudiostems",
      "staticcleaneq",
      "deterministicserializers",
      "batchofflineexporters",
      "isolatedinstrumentdis",
      "staticheuristicrules",
      "prehandoffprototypes",
      "internalprotectedmath",
      "deterministiccppdsp",
      "standalonemicroservices",
    ];

    if (recognizedClasses.some((c) => normalizedCls.includes(c) || c.includes(normalizedCls))) {
      return true;
    }

    // Also recognize by explicit operational flags
    if (
      input.isMigrated === true ||
      input.isProductionCutoverCandidate === true ||
      input.isUserFacingOrSignalIntake === true ||
      input.isAiReasoningRun === true ||
      input.isEndToEndWorkflow === true ||
      (input.validationQuestion && this.isRecognizedQuestion(input.validationQuestion))
    ) {
      return true;
    }

    return false;
  }

  private isRecognizedQuestion(q: string): boolean {
    const norm = q.trim().toLowerCase();
    return Object.values(TABLE_07_QUESTIONS).some((t) =>
      norm.includes(t.toLowerCase()) || t.toLowerCase().includes(norm)
    );
  }

  /**
   * Evaluates an individual profile against Table 05 and Table 07 rules.
   */
  private evaluateSingleProfile(
    profile: TestProfileRecord,
    cls: string,
    input: ValidationSubjectInput
  ): ProfileDecisionDiagnostic {
    const family = profile.profile_family as TestProfileFamily;

    // Check explicit Table 07 Validation Question overrides
    if (input.validationQuestion) {
      const qDiag = this.evaluateTable07Question(family, input.validationQuestion);
      if (qDiag) {
        return qDiag;
      }
    }

    switch (family) {
      // -----------------------------------------------------------------------
      // PROFILE-01: Structural / Schema Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA: {
        const isMandatory =
          cls.includes("presetexporter") ||
          cls.includes("ruleengine") ||
          cls.includes("parameterremapping") ||
          cls.includes("configuration") ||
          cls.includes("serializer") ||
          cls.includes("stage12");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Preset Exporter, Rule Engine, Parameter Remapping, Configuration",
            rationale: "Requires schema validation, XML well-formedness, parameter bound clamping, and enum validity.",
          };
        }
        if (cls.includes("pureaudiostems") || cls.includes("audio")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Pure Audio Stems",
            rationale: "Audio stems do not carry XML parameter definitions but may undergo container validation.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not perform parameter remapping, preset export, or schema serialization.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-02: Deterministic Parameter Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER: {
        const isMandatory =
          cls.includes("normalizer") ||
          cls.includes("gaincalculator") ||
          cls.includes("tonestackmath") ||
          cls.includes("ruleengine");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Normalizer, Gain Calculator, Tone-Stack Math",
            rationale: "Requires mathematical verification of linear/log conversions and algorithmic transfer functions.",
          };
        }
        if (cls.includes("prompt") || cls.includes("subjectivetone")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Subjective Tone Prompts",
            rationale: "Subjective tone prompt parsers may optionally audit mathematical parameter mapping boundaries.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not implement deterministic parameter transformation rules or gain-staging math.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-03: Target-Platform Export Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT: {
        const isMandatory =
          cls.includes("serializer") ||
          cls.includes("exporter") ||
          cls.includes("presetexporter") ||
          cls.includes("stage12");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Serializer, Exporter, Stage 12 Translation",
            rationale: "Requires successful target-platform preset loading, parameter ID integrity, and GUI rendering without error.",
          };
        }
        if (cls.includes("prompt") || cls.includes("rawprompt")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Raw Prompt Reasoning",
            rationale: "Prompt reasoning may optionally verify target platform export feasibility.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not serialize target-platform presets or perform Stage 12 packaging.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-04: Objective Acoustic Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC: {
        const isMandatory =
          cls.includes("ampmodel") ||
          cls.includes("cabinetemulator") ||
          cls.includes("eqmodule") ||
          cls.includes("analogsaturation") ||
          cls.includes("amplifier") ||
          cls.includes("cabinet") ||
          cls.includes("saturation");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Amp Models, Cab Emulators, EQ Modules, Analog Saturation Algorithms",
            rationale: "Requires multi-band spectral magnitude, harmonic distortion (THD), phase coherence, and frequency-response deltas.",
          };
        }
        if (
          cls.includes("applicationui") ||
          cls.includes("userui") ||
          cls.endsWith("ui") ||
          cls === "ui" ||
          cls.includes("workflow")
        ) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for UI Workflow Controls",
            rationale: "UI controls may optionally verify acoustic response to slider manipulation.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not generate or process continuous acoustic audio signals.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-05: Dynamic Response Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE: {
        const isMandatory =
          cls.includes("overdrive") ||
          cls.includes("compressor") ||
          cls.includes("gate") ||
          cls.includes("powerampsag") ||
          cls.includes("distortion");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Overdrives, Compressors, Gates, Power-Amp Sag",
            rationale: "Requires compression envelope, transient attack preservation, sustain decay curve, and crest factor measurement.",
          };
        }
        if (cls.includes("staticeq") || cls.includes("cleaneq") || cls.includes("staticclean")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Static Clean EQ",
            rationale: "Linear static EQ modules may optionally be checked for dynamic distortion or headroom limits.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not implement non-linear dynamic envelope or compression behavior.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-06: Perceptual Listening Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING: {
        // Serializers and exporters are non-perceptual data formatting components
        if (cls.includes("serializer") || cls.includes("exporter")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Deterministic Serializers",
            rationale: "Serializers do not primarily require human listening panels unless rendering end-to-end tone output.",
          };
        }
        const isMandatory =
          cls.includes("coreguitarpreset") ||
          cls.includes("completeguitartone") ||
          cls.includes("cabinetirselection") ||
          cls.includes("coresoundengineering") ||
          cls.includes("guitartone") ||
          (cls.includes("preset") && !cls.includes("exporter") && !cls.includes("discovery"));
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for All Core Guitar Presets, Complete Guitar Tones, Cabinet IR Selection",
            rationale: "Requires expert human listening evaluation of tonal balance, musical warmth, harshness, presence, and punch.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is a low-level mathematical or operational utility that does not produce audible guitar tone.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-07: Playability Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY: {
        const isMandatory =
          cls.includes("livedspmodel") ||
          cls.includes("ampemulator") ||
          cls.includes("interactiveguitaremulation") ||
          cls.includes("realtimeinputconditioning") ||
          cls.includes("playability");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Live DSP Models, Amp Emulators, Interactive Guitar Emulation",
            rationale: "Requires performing guitarist touch response, latency within latency_budget_ref, and volume roll-off cleanup.",
          };
        }
        if (cls.includes("batch") || cls.includes("offlineexporter")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Batch Offline Exporters",
            rationale: "Batch offline processors may optionally evaluate touch response simulations.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is not an interactive live DSP model or real-time performance conditioning stage.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-08: Mix-Context Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT: {
        const isMandatory =
          cls.includes("studiomixpreset") ||
          cls.includes("multitrackmix") ||
          cls.includes("finalmixpreset") ||
          cls.includes("multimicblend") ||
          cls.includes("masteringchain");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Studio Mix Presets, Multitracks, Final Mix Presets, Multi-Mic Blend Reasoning",
            rationale: "Requires multi-track tonal behavior analysis, bass masking detection, and vocal pocket separation.",
          };
        }
        if (cls.includes("isolated") || cls.includes("instrumentdi")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Isolated Instrument DIs",
            rationale: "Solo DI tracks may optionally be tested against generic backing track stems.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is an isolated component not evaluated in a commercial multitrack mix context.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-09: Regression Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_09_REGRESSION: {
        const isMigrated =
          input.isMigrated === true ||
          cls.includes("migratedcomponent") ||
          cls.includes("migrated");
        if (isMigrated) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for All Migrated Components Replacing Existing Legacy Production Heuristics",
            rationale: "Requires tripartite differential comparison against PATH-PROD to isolate genuine regressions.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "OPTIONAL",
          governingRule: "Table 05: Optional for Completely Novel Gear with No Legacy Production Predecessor",
          rationale: "Novel gear components without legacy predecessors do not automatically undergo legacy differential comparison.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-10: Operational Stability Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_10_OPERATIONAL_STABILITY: {
        const isMandatory =
          cls.includes("dspengine") ||
          cls.includes("executionpipeline") ||
          cls.includes("backgroundshadowpipeline") ||
          cls.includes("exportbatchservice") ||
          cls.includes("runtime");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for DSP Engine, Execution Pipelines, Background Shadow Pipelines, Export Batch Services",
            rationale: "Requires host resource consumption audits, memory leak detection under continuous rendering, and thread safety within operational_budget_ref.",
          };
        }
        if (cls.includes("heuristic") || cls.includes("staticrule")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Static Heuristic Rules",
            rationale: "Static rule evaluation may optionally undergo execution pipeline stress tests.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is a declarative configuration or schema asset, not an operational runtime rendering engine.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-11: Rollback Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK: {
        const isCutover =
          input.isProductionCutoverCandidate === true ||
          cls.includes("deploymentcandidate") ||
          cls.includes("productioncutovercandidate") ||
          cls.includes("cutover");
        if (isCutover) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for All Deployment Candidates (Mandatory for Gate 8 Consideration)",
            rationale: "Requires pre-cutover automated rollback testing under load within recovery_objective_ref.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "OPTIONAL",
          governingRule: "Table 05: Optional for Pre-Handoff Prototypes, Isolated Schema Utilities, Local Tests",
          rationale: "Non-cutover prototype or local unit tests are not subject to mandatory automated failover rehearsal.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-12: Adversarial / Edge-Case Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_12_ADVERSARIAL_EDGE_CASE: {
        const isMandatory =
          input.isUserFacingOrSignalIntake === true ||
          cls.includes("signalintake") ||
          cls.includes("userfacing") ||
          cls.includes("platformfacing") ||
          cls.includes("exporter") ||
          cls.includes("intake") ||
          cls.includes("applicationui") ||
          cls.includes("userui") ||
          cls.endsWith("ui") ||
          cls === "ui";
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Signal Intake, Exporter, UI, User-Facing, Platform-Facing Modules",
            rationale: "Requires adversarial resilience testing against degraded inputs, pathological boundary conditions, and corrupt payloads.",
          };
        }
        if (cls.includes("math") || cls.includes("protectedmath")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Internal Protected Math",
            rationale: "Internal protected mathematical functions may optionally undergo extreme edge-case injection.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is an internal protected module with strictly sanitized inputs.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-13: Traceability / Governance Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_13_TRACEABILITY_GOVERNANCE: {
        const isMandatory =
          input.isAiReasoningRun === true ||
          cls.includes("aireasoningrun") ||
          cls.includes("governanceaudit") ||
          cls.includes("reasoning");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for All AI Reasoning Runs, Governance and Audit Verification",
            rationale: "Requires Phase 1C.5f RunTrace completeness, tamper-evident record seals, and causal justification.",
          };
        }
        if (cls.includes("dsp") || cls.includes("cpp")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Deterministic C++ DSP",
            rationale: "Deterministic DSP blocks may optionally record execution trace telemetry.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject does not perform heuristic AI Sound Engineer decision-making requiring causal reasoning audits.",
        };
      }

      // -----------------------------------------------------------------------
      // PROFILE-14: User-Workflow / UAT Profile
      // -----------------------------------------------------------------------
      case TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT: {
        const isMandatory =
          input.isEndToEndWorkflow === true ||
          cls.includes("fullapplicationui") ||
          cls.includes("userworkflow") ||
          cls.includes("presetdiscovery") ||
          cls.includes("workflow");
        if (isMandatory) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "MANDATORY",
            governingRule: "Table 05: Mandatory for Full Application UI & Workflows, End-to-End User Workflows, Preset Discovery",
            rationale: "Requires end-to-end task completion verification across the four governed evaluator personas.",
          };
        }
        if (cls.includes("microservice") || cls.includes("standalone") || cls.includes("util")) {
          return {
            profileId: profile.profile_id,
            profileFamily: family,
            classification: "OPTIONAL",
            governingRule: "Table 05: Optional for Standalone Micro-Services, Internal Deterministic Utilities",
            rationale: "Standalone utilities may optionally be tested within synthetic persona workflows.",
          };
        }
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Subject is an internal component with no direct end-user interaction workflow.",
        };
      }

      default:
        return {
          profileId: profile.profile_id,
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Section 13.1: Orthogonal Domain Boundary",
          rationale: "Non-applicable by default.",
        };
    }
  }

  /**
   * Applies the exact Table 07 Objective vs Perceptual Applicability Matrix for explicit validation questions.
   */
  private evaluateTable07Question(
    family: TestProfileFamily,
    question: string
  ): ProfileDecisionDiagnostic | undefined {
    const q = question.trim().toLowerCase();

    // 1. Target platform preset load error-free
    if (q.includes("preset load without errors") || q.includes(TABLE_07_QUESTIONS.PRESET_LOAD_ERROR_FREE.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT) {
        return {
          profileId: "PROFILE-03",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does the target platform preset load without errors? (Objective Mandatory: YES)",
          rationale: "Deterministic platform compatibility question.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA) {
        return {
          profileId: "PROFILE-01",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Deterministic platform compatibility requires schema well-formedness",
          rationale: "Objective schema validation.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Table 07: Does the target platform preset load without errors? (Perceptual Mandatory: NO)",
          rationale: "Deterministic platform compatibility cannot be certified or waived by human listening.",
        };
      }
    }

    // 2. Audio free of digital clipping
    if (q.includes("free of digital clipping") || q.includes(TABLE_07_QUESTIONS.AUDIO_FREE_OF_DIGITAL_CLIPPING.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC || family === TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE) {
        return {
          profileId: family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC ? "PROFILE-04" : "PROFILE-05",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Is the output audio free of digital clipping? (Objective Mandatory: YES)",
          rationale: "Peak meters and THD measurements detect digital clipping numerically.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Is the output audio free of digital clipping? (Perceptual Mandatory: YES)",
          rationale: "Human ears detect subjective distortion character and clipping harshness.",
        };
      }
    }

    // 3. Guitar tone cut through heavy mix
    if (q.includes("cut through a heavy mix") || q.includes(TABLE_07_QUESTIONS.GUITAR_TONE_CUT_THROUGH_MIX.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT) {
        return {
          profileId: "PROFILE-08",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does the guitar tone cut through a heavy mix? (Perceptual Mandatory: YES)",
          rationale: "Psychoacoustic masking requires human musical judgment in multitrack context.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC) {
        return {
          profileId: "PROFILE-04",
          profileFamily: family,
          classification: "OPTIONAL",
          governingRule: "Table 07: Does the guitar tone cut through a heavy mix? (Objective Mandatory: OPTIONAL)",
          rationale: "Spectral FFT masking analysis informs but cannot replace human ears.",
        };
      }
    }

    // 4. Amp model clean up on guitar volume roll-off
    if (q.includes("clean up on guitar volume roll-off") || q.includes(TABLE_07_QUESTIONS.AMP_CLEAN_UP_VOLUME_ROLLOFF.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY) {
        return {
          profileId: "PROFILE-07",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does the amp model clean up on volume roll-off? (Perceptual Mandatory: YES)",
          rationale: "Requires tactile musician interaction and touch feel.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE) {
        return {
          profileId: "PROFILE-05",
          profileFamily: family,
          classification: "OPTIONAL",
          governingRule: "Table 07: Does the amp model clean up on volume roll-off? (Objective Mandatory: OPTIONAL)",
          rationale: "Dynamic crest and gain sweep curves inform velocity analysis.",
        };
      }
    }

    // 5. EQ parameters safe range
    if (q.includes("parameters safe ranges") || q.includes("parameter values within safe ranges") || q.includes(TABLE_07_QUESTIONS.EQ_PARAMETERS_SAFE_RANGE.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER || family === TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA) {
        return {
          profileId: family === TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER ? "PROFILE-02" : "PROFILE-01",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Are the EQ parameter values within safe ranges? (Objective Mandatory: YES)",
          rationale: "Pure mathematical clamp check.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Table 07: Are the EQ parameter values within safe ranges? (Perceptual Mandatory: NO)",
          rationale: "Safe numeric parameter ranges cannot be certified or waived by listening.",
        };
      }
    }

    // 6. Speaker cabinet harsh fizz
    if (q.includes("exhibit harsh fizz") || q.includes(TABLE_07_QUESTIONS.CABINET_EXHIBIT_HARSH_FIZZ.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC) {
        return {
          profileId: "PROFILE-04",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does the speaker cabinet exhibit harsh fizz? (Objective Mandatory: YES - THD)",
          rationale: "Harmonic meters measure high-frequency distortion products numerically.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does the speaker cabinet exhibit harsh fizz? (Perceptual Mandatory: YES - Listening)",
          rationale: "Human ears judge listening fatigue and harsh fizz threshold.",
        };
      }
    }

    // 7. Automated rollback meet recovery objectives
    if (q.includes("rollback meet recovery objectives") || q.includes(TABLE_07_QUESTIONS.ROLLBACK_MEET_RECOVERY_OBJECTIVES.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK) {
        return {
          profileId: "PROFILE-11",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Does automated rollback meet recovery objectives? (Objective Mandatory: YES)",
          rationale: "Operational infrastructure SLA measurement against recovery_objective_ref.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Table 07: Does automated rollback meet recovery objectives? (Perceptual Mandatory: NO)",
          rationale: "Operational failover time cannot be evaluated by listening.",
        };
      }
    }

    // 8. Tone inspiring and genre-authentic
    if (q.includes("inspiring and genre-authentic") || q.includes("genre-authentic") || q.includes(TABLE_07_QUESTIONS.TONE_INSPIRING_GENRE_AUTHENTIC.toLowerCase())) {
      if (family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING) {
        return {
          profileId: "PROFILE-06",
          profileFamily: family,
          classification: "MANDATORY",
          governingRule: "Table 07: Is the tone inspiring and genre-authentic? (Perceptual Mandatory: YES)",
          rationale: "Pure aesthetic artistic evaluation.",
        };
      }
      if (family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC) {
        return {
          profileId: "PROFILE-04",
          profileFamily: family,
          classification: "NON_APPLICABLE",
          governingRule: "Table 07: Is the tone inspiring and genre-authentic? (Objective Mandatory: NO)",
          rationale: "Aesthetic artistic inspiration cannot be computed by an FFT spectrum analyzer.",
        };
      }
    }

    return undefined;
  }

  /**
   * Derives required evidence classes implied by the assigned mandatory profiles and Table 07 questions.
   */
  private determineRequiredEvidenceClasses(
    mandatoryProfiles: ReadonlyArray<TestProfileRecord>,
    validationQuestion?: string
  ): ReadonlyArray<RequiredEvidenceClass> {
    const classes = new Set<RequiredEvidenceClass>();

    for (const profile of mandatoryProfiles) {
      const family = profile.profile_family;
      if (
        family === TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA ||
        family === TEST_PROFILE_FAMILIES.PROFILE_02_DETERMINISTIC_PARAMETER ||
        family === TEST_PROFILE_FAMILIES.PROFILE_03_TARGET_PLATFORM_EXPORT ||
        family === TEST_PROFILE_FAMILIES.PROFILE_04_OBJECTIVE_ACOUSTIC ||
        family === TEST_PROFILE_FAMILIES.PROFILE_05_DYNAMIC_RESPONSE ||
        family === TEST_PROFILE_FAMILIES.PROFILE_09_REGRESSION ||
        family === TEST_PROFILE_FAMILIES.PROFILE_12_ADVERSARIAL_EDGE_CASE
      ) {
        classes.add(REQUIRED_EVIDENCE_CLASSES.OBJECTIVE);
      }

      if (
        family === TEST_PROFILE_FAMILIES.PROFILE_06_PERCEPTUAL_LISTENING ||
        family === TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY ||
        family === TEST_PROFILE_FAMILIES.PROFILE_08_MIX_CONTEXT
      ) {
        classes.add(REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL);
      }

      if (
        family === TEST_PROFILE_FAMILIES.PROFILE_10_OPERATIONAL_STABILITY ||
        family === TEST_PROFILE_FAMILIES.PROFILE_11_ROLLBACK ||
        family === TEST_PROFILE_FAMILIES.PROFILE_13_TRACEABILITY_GOVERNANCE ||
        family === TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT
      ) {
        classes.add(REQUIRED_EVIDENCE_CLASSES.OPERATIONAL);
      }
    }

    if (classes.has(REQUIRED_EVIDENCE_CLASSES.OBJECTIVE) && classes.has(REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL)) {
      classes.add(REQUIRED_EVIDENCE_CLASSES.MIXED);
    }

    return Array.from(classes);
  }
}
