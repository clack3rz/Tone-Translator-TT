// src/sound-engineer/validation/regression/materialityResolver.ts
// Materiality Resolver for Phase 1C.5h WP-15:
// Governs regression materiality scoring bound to specific domain profiles.
// Prevents universal or synthetic fallback thresholds.

import { MATERIALITY_SCORES, MaterialityScore, REGRESSION_DOMAINS, RegressionDomain } from "../schemas/enums";
import { MaterialityProfile } from "./regressionTypes";
import { MissingMaterialityGovernanceError } from "./regressionErrors";

/**
 * Standard governed materiality profiles bound to specific regression domains.
 */
const GOVERNED_MATERIALITY_PROFILES: ReadonlyMap<string, MaterialityProfile> = new Map([
  // 1. Acoustic Regression Materiality Profile (matches PROFILE-09 tolerance_criteria_spec)
  [
    "tolerance_spec_ref:regression_tolerance_profile",
    {
      materialityProfileRef: "tolerance_spec_ref:regression_tolerance_profile",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      thresholds: {
        highThreshold: 3.0, // e.g. > 3.0 dB delta or significant acoustic distortion
        mediumThreshold: 1.5, // 1.5 - 3.0 dB delta
        lowThreshold: 0.5, // 0.5 - 1.5 dB delta
      },
      description: "Governed acoustic regression profile for guitar tones and cabinet IRs.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
  [
    "materiality_spec:regression:acoustic:default",
    {
      materialityProfileRef: "materiality_spec:regression:acoustic:default",
      regressionDomain: REGRESSION_DOMAINS.ACOUSTIC,
      thresholds: {
        highThreshold: 3.0,
        mediumThreshold: 1.5,
        lowThreshold: 0.5,
      },
      description: "Acoustic domain materiality profile with dB spectral/dynamic boundaries.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
  // 2. Functional Regression Materiality Profile
  [
    "materiality_spec:regression:functional:default",
    {
      materialityProfileRef: "materiality_spec:regression:functional:default",
      regressionDomain: REGRESSION_DOMAINS.FUNCTIONAL,
      thresholds: {
        highThreshold: 1.0, // binary parameter divergence or state error
        mediumThreshold: 0.5,
        lowThreshold: 0.1,
      },
      description: "Functional parameter and control mapping regression profile.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
  // 3. Platform Export Materiality Profile
  [
    "materiality_spec:regression:export:default",
    {
      materialityProfileRef: "materiality_spec:regression:export:default",
      regressionDomain: REGRESSION_DOMAINS.EXPORT,
      thresholds: {
        highThreshold: 2.0,
        mediumThreshold: 1.0,
        lowThreshold: 0.2,
      },
      description: "Platform export byte layout and parameter fidelity regression profile.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
  // 4. Operational Stability Materiality Profile
  [
    "materiality_spec:regression:operational:default",
    {
      materialityProfileRef: "materiality_spec:regression:operational:default",
      regressionDomain: REGRESSION_DOMAINS.OPERATIONAL,
      thresholds: {
        highThreshold: 20.0, // ms latency or memory leak percentage
        mediumThreshold: 10.0,
        lowThreshold: 2.0,
      },
      description: "Operational latency and host resource consumption regression profile.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
  // 5. Playability Materiality Profile
  [
    "materiality_spec:regression:playability:default",
    {
      materialityProfileRef: "materiality_spec:regression:playability:default",
      regressionDomain: REGRESSION_DOMAINS.PLAYABILITY,
      thresholds: {
        highThreshold: 15.0, // roundtrip latency ms or dynamic tracking error
        mediumThreshold: 8.0,
        lowThreshold: 3.0,
      },
      description: "Playability pick-attack and real-time response regression profile.",
      isGate8BlockingMateriality: (score: MaterialityScore) =>
        score === MATERIALITY_SCORES.HIGH || score === MATERIALITY_SCORES.MEDIUM,
    },
  ],
]);

/**
 * MaterialityResolver: Resolves governed materiality score strictly from registered profiles.
 */
export class MaterialityResolver {
  private readonly customProfiles = new Map<string, MaterialityProfile>();

  /**
   * Register a domain-specific materiality profile.
   */
  public registerProfile(profile: MaterialityProfile): void {
    this.customProfiles.set(profile.materialityProfileRef, profile);
  }

  /**
   * Resolves a MaterialityProfile by reference.
   * Fails closed if not found: NO fallback to arbitrary/universal threshold.
   */
  public resolveProfile(profileRef: string): MaterialityProfile {
    const profile = this.customProfiles.get(profileRef) ?? GOVERNED_MATERIALITY_PROFILES.get(profileRef);
    if (!profile) {
      throw new MissingMaterialityGovernanceError(profileRef);
    }
    return profile;
  }

  /**
   * Evaluates the materiality score given a divergence magnitude and profile.
   */
  public evaluateMaterialityScore(
    divergenceMagnitude: number | string,
    profile: MaterialityProfile
  ): MaterialityScore {
    // If magnitude is already a canonical score string
    if (typeof divergenceMagnitude === "string") {
      const upper = divergenceMagnitude.toUpperCase();
      if (upper === MATERIALITY_SCORES.HIGH) return MATERIALITY_SCORES.HIGH;
      if (upper === MATERIALITY_SCORES.MEDIUM) return MATERIALITY_SCORES.MEDIUM;
      if (upper === MATERIALITY_SCORES.LOW) return MATERIALITY_SCORES.LOW;
      if (upper === MATERIALITY_SCORES.NEGLIGIBLE) return MATERIALITY_SCORES.NEGLIGIBLE;

      const parsedNum = parseFloat(divergenceMagnitude);
      if (!isNaN(parsedNum)) {
        return this.scoreNumericMagnitude(parsedNum, profile.thresholds);
      }
      return MATERIALITY_SCORES.MEDIUM;
    }

    return this.scoreNumericMagnitude(divergenceMagnitude, profile.thresholds);
  }

  private scoreNumericMagnitude(
    num: number,
    thresholds: MaterialityProfile["thresholds"]
  ): MaterialityScore {
    const absVal = Math.abs(num);
    if (absVal >= thresholds.highThreshold) {
      return MATERIALITY_SCORES.HIGH;
    }
    if (absVal >= thresholds.mediumThreshold) {
      return MATERIALITY_SCORES.MEDIUM;
    }
    if (absVal >= thresholds.lowThreshold) {
      return MATERIALITY_SCORES.LOW;
    }
    return MATERIALITY_SCORES.NEGLIGIBLE;
  }
}
