// src/sound-engineer/validation/outcome/uncertaintyThresholdResolver.ts
// Phase 1C.5h WP-19: Governed Uncertainty Threshold Profile Repository & Resolver.
// Enforces that residual uncertainty remains within governed bounds defined by uncertainty_threshold_profile_ref.
// Prohibits universal thresholds, arbitrary percentages, and fallback to "strictest" profiles.
// Missing or unknown profile reference strictly fails closed.

import { UNCERTAINTY_GATE_8_IMPACTS, UNCERTAINTY_SOURCES } from "../schemas/enums";
import { ValidationUncertaintyRecord } from "../schemas/records";
import { MissingThresholdProfileError } from "./outcomeErrors";

/**
 * Result of evaluating uncertainty records against a governed threshold profile.
 */
export interface UncertaintyThresholdEvaluationResult {
  readonly withinPassThreshold: boolean;
  readonly withinConditionalThreshold: boolean;
  readonly violations: ReadonlyArray<string>;
}

/**
 * Interface for a governed uncertainty threshold profile.
 */
export interface UncertaintyThresholdProfile {
  readonly profileRef: string;
  readonly domain: string;
  readonly description: string;
  readonly evaluateThreshold: (
    uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
  ) => UncertaintyThresholdEvaluationResult;
}

/**
 * Standard governed uncertainty threshold profiles.
 */
export const GOVERNED_THRESHOLD_PROFILES: ReadonlyMap<string, UncertaintyThresholdProfile> = new Map([
  // 1. Core DSP Standard Threshold Profile
  [
    "threshold_profile:core_dsp:standard",
    {
      profileRef: "threshold_profile:core_dsp:standard",
      domain: "CORE_DSP",
      description: "Conservative threshold profile for Core DSP and tube dynamics. Disallows FORCES_BLOCK and critical uncalibrated sources for PASS.",
      evaluateThreshold: (
        uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
      ): UncertaintyThresholdEvaluationResult => {
        const violations: string[] = [];
        let allowsConditionalCount = 0;

        for (const u of uncertainties) {
          if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
            violations.push(
              `FORCES_BLOCK uncertainty [${u.uncertainty_id}] from source "${u.uncertainty_source}" breaches threshold for both PASS and CONDITIONAL.`
            );
          } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
            allowsConditionalCount++;
            violations.push(
              `ALLOWS_CONDITIONAL uncertainty [${u.uncertainty_id}] from source "${u.uncertainty_source}" requires conditional handling; disallows unconditioned PASS.`
            );
          }
        }

        const withinPassThreshold = violations.length === 0;
        const withinConditionalThreshold = !uncertainties.some(
          (u) => u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK
        );

        return {
          withinPassThreshold,
          withinConditionalThreshold,
          violations,
        };
      },
    },
  ],

  // 2. Platform Export Standard Threshold Profile
  [
    "threshold_profile:platform_export:standard",
    {
      profileRef: "threshold_profile:platform_export:standard",
      domain: "PLATFORM_EXPORT",
      description: "Threshold profile for platform preset export and serialization integrity.",
      evaluateThreshold: (
        uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
      ): UncertaintyThresholdEvaluationResult => {
        const violations: string[] = [];

        for (const u of uncertainties) {
          if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
            violations.push(
              `Platform export blocker [${u.uncertainty_id}]: "${u.potential_production_risk}" violates export safety threshold.`
            );
          } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
            violations.push(
              `Platform export conditional risk [${u.uncertainty_id}]: requires telemetry monitoring before authorization.`
            );
          }
        }

        const withinPassThreshold = violations.length === 0;
        const withinConditionalThreshold = !uncertainties.some(
          (u) => u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK
        );

        return {
          withinPassThreshold,
          withinConditionalThreshold,
          violations,
        };
      },
    },
  ],

  // 3. User Facing Perceptual Threshold Profile
  [
    "threshold_profile:user_facing:standard",
    {
      profileRef: "threshold_profile:user_facing:standard",
      domain: "USER_FACING",
      description: "Threshold profile for perceptual listening and workflow UAT.",
      evaluateThreshold: (
        uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
      ): UncertaintyThresholdEvaluationResult => {
        const violations: string[] = [];

        for (const u of uncertainties) {
          if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
            violations.push(
              `Perceptual evaluation blocker [${u.uncertainty_id}] precludes Gate 8 eligibility.`
            );
          } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
            violations.push(
              `Perceptual listening conditional observation [${u.uncertainty_id}] requires conditional monitoring.`
            );
          }
        }

        return {
          withinPassThreshold: violations.length === 0,
          withinConditionalThreshold: !uncertainties.some(
            (u) => u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK
          ),
          violations,
        };
      },
    },
  ],

  // 4. Operational Rollback Threshold Profile
  [
    "threshold_profile:operational_rollback:conservative",
    {
      profileRef: "threshold_profile:operational_rollback:conservative",
      domain: "OPERATIONAL_ROLLBACK",
      description: "Conservative threshold profile for automated rollback and failover safety.",
      evaluateThreshold: (
        uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
      ): UncertaintyThresholdEvaluationResult => {
        const violations: string[] = [];

        for (const u of uncertainties) {
          if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
            violations.push(`Rollback failure risk [${u.uncertainty_id}] forces blocking.`);
          } else if (u.uncertainty_source === UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE) {
            violations.push(`Unknown failure cause in rollback path cannot be conditionally waived.`);
          } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
            violations.push(`Rollback conditional monitoring required for [${u.uncertainty_id}].`);
          }
        }

        const hasCritical = uncertainties.some(
          (u) =>
            u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK ||
            u.uncertainty_source === UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE
        );

        return {
          withinPassThreshold: violations.length === 0,
          withinConditionalThreshold: !hasCritical,
          violations,
        };
      },
    },
  ],

  // 5. Permissive Experimental Threshold Profile
  [
    "threshold_profile:permissive:experimental",
    {
      profileRef: "threshold_profile:permissive:experimental",
      domain: "EXPERIMENTAL",
      description: "Permissive threshold profile for non-production prototype / shadow validation.",
      evaluateThreshold: (
        uncertainties: ReadonlyArray<ValidationUncertaintyRecord>
      ): UncertaintyThresholdEvaluationResult => {
        const violations: string[] = [];

        for (const u of uncertainties) {
          if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
            violations.push(`Experimental blocker [${u.uncertainty_id}] breaches baseline.`);
          } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
            violations.push(`Experimental conditional note [${u.uncertainty_id}].`);
          }
        }

        return {
          withinPassThreshold: violations.length === 0,
          withinConditionalThreshold: !uncertainties.some(
            (u) => u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK
          ),
          violations,
        };
      },
    },
  ],
]);

/**
 * Governed resolver for uncertainty threshold profiles.
 * Fails closed if the requested profile reference is missing or unknown.
 */
export class UncertaintyThresholdResolver {
  private readonly customProfiles: Map<string, UncertaintyThresholdProfile> = new Map();

  constructor(customProfiles?: ReadonlyArray<UncertaintyThresholdProfile>) {
    if (customProfiles) {
      for (const p of customProfiles) {
        this.customProfiles.set(p.profileRef, p);
      }
    }
  }

  /**
   * Resolves a governed UncertaintyThresholdProfile by reference string.
   * Fails closed if reference is null, empty, or unknown.
   */
  public resolveProfile(profileRef: string | undefined): UncertaintyThresholdProfile {
    if (!profileRef || typeof profileRef !== "string" || profileRef.trim().length === 0) {
      throw new MissingThresholdProfileError(
        "Uncertainty threshold profile reference is required but was empty or undefined. Missing profile strictly fails closed."
      );
    }

    const trimmed = profileRef.trim();

    if (this.customProfiles.has(trimmed)) {
      return this.customProfiles.get(trimmed)!;
    }

    if (GOVERNED_THRESHOLD_PROFILES.has(trimmed)) {
      return GOVERNED_THRESHOLD_PROFILES.get(trimmed)!;
    }

    throw new MissingThresholdProfileError(
      `Unknown uncertainty threshold profile reference: "${trimmed}". The system prohibits universal scorecards and fallback to arbitrary profiles; missing profile fails closed.`
    );
  }

  /**
   * Checks if a profile reference is registered in the resolver.
   */
  public hasProfile(profileRef: string): boolean {
    const trimmed = profileRef.trim();
    return this.customProfiles.has(trimmed) || GOVERNED_THRESHOLD_PROFILES.has(trimmed);
  }
}
