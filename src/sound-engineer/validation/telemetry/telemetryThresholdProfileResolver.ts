// src/sound-engineer/validation/telemetry/telemetryThresholdProfileResolver.ts
// Resolver interface and registry for governed telemetry threshold profiles under Phase 1C.5h WP-28.
// Bound to frozen specification v0.1j Section 31.2, Activity WF-17, and Build Plan v0.1h WP-28.
// Strictly adheres to the zero-hardcoded-thresholds invariant.

import { deepFreeze } from "../../contracts/immutability";
import { GovernedTelemetryThresholdProfile } from "./telemetryTypes";

/**
 * Capability interface for resolving an authoritative `telemetry_threshold_profile_ref`
 * into concrete governed metric rules and reaction budgets.
 *
 * GOVERNANCE CONSTITUTION:
 * - WP-28 does not own threshold numbers.
 * - If a profile reference cannot be resolved, evaluation must fail closed.
 * - Universal fallback constants and default threshold values are prohibited.
 */
export interface TelemetryThresholdProfileResolver {
  /**
   * Resolves a telemetry threshold profile reference into its governed criteria.
   * Returns undefined if the reference is unmapped or unregistered (fails closed).
   */
  resolve(
    profileRef: string
  ):
    | Promise<GovernedTelemetryThresholdProfile | undefined>
    | GovernedTelemetryThresholdProfile
    | undefined;
}

/**
 * Caller-configured resolver registry allowing tests, harness adapters,
 * and governance controllers to provide authoritative policy definitions.
 *
 * CRITICAL RULE:
 * Contains ZERO built-in profiles, ZERO default threshold numbers, and ZERO fallback rules.
 */
export class ConfiguredTelemetryThresholdProfileResolver
  implements TelemetryThresholdProfileResolver
{
  private readonly registry = new Map<string, GovernedTelemetryThresholdProfile>();

  constructor(
    initialProfiles?: ReadonlyArray<GovernedTelemetryThresholdProfile>
  ) {
    if (initialProfiles) {
      for (const profile of initialProfiles) {
        this.registerProfile(profile);
      }
    }
  }

  /**
   * Registers a governed telemetry threshold profile into the resolver registry.
   */
  public registerProfile(profile: GovernedTelemetryThresholdProfile): void {
    if (!profile || !profile.profileRef || typeof profile.profileRef !== "string") {
      throw new Error("Cannot register GovernedTelemetryThresholdProfile without valid profileRef.");
    }
    if (!Array.isArray(profile.rules)) {
      throw new Error(`Profile "${profile.profileRef}" must define an array of rules.`);
    }

    if (
      profile.reactionBudgetMs !== undefined &&
      (typeof profile.reactionBudgetMs !== "number" ||
        profile.reactionBudgetMs < 0 ||
        !Number.isFinite(profile.reactionBudgetMs))
    ) {
      throw new Error(
        `Profile "${profile.profileRef}" specifies invalid reactionBudgetMs: must be a non-negative finite number.`
      );
    }

    this.registry.set(profile.profileRef, deepFreeze({ ...profile }));
  }

  /**
   * Resolves the requested telemetry threshold profile reference.
   * Returns undefined if not found (strictly fails closed; zero fallback defaults).
   */
  public resolve(
    profileRef: string
  ): GovernedTelemetryThresholdProfile | undefined {
    return this.registry.get(profileRef);
  }

  /**
   * Returns the count of registered profiles in this resolver instance.
   */
  public get size(): number {
    return this.registry.size;
  }
}
