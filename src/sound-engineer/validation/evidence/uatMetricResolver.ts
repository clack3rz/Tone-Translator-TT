// src/sound-engineer/validation/evidence/uatMetricResolver.ts
// UATMetricResolver: Manages and resolves version-bound UAT metric profiles.
// Phase 1C.5h — WP-13.
// Bound to frozen specification v0.1j Section 17.3 and Implementation Plan v0.1h WP-13.

import { deepFreeze } from "../../contracts/immutability";
import {
  InvalidSatisfactionRatingError,
  MissingUATMetricProfileError,
} from "./uatErrors";
import {
  UATMetricProfile,
  UATMetricResolverInterface,
} from "./uatTypes";

/**
 * Built-in canonical UAT metric profile templates bound to Section 17.2 and Table 05.
 * Strictly avoids universal defaults; each profile defines explicit bounds and step constraints.
 */
const CANONICAL_BUILTIN_PROFILES: ReadonlyArray<UATMetricProfile> = [
  // 1. Recording / Mix Engineer: 10-point workflow speed & mix-context scale
  {
    profileRef: "uat_metric_profile_ref:recording_engineer_mix_context_v1",
    ratingName: "Recording Engineer Mix Context Usability Scale",
    minRating: 1,
    maxRating: 10,
    validateRating: (r: number) => Number.isFinite(r) && r >= 1 && r <= 10,
    targetDurationSeconds: 600,
    maxAllowableDurationSeconds: 1800,
    description: "Evaluates workflow speed, headroom management, and mix-context sitting without extreme corrective EQ.",
  },

  // 2. Performing / Session Guitarist: 7-point Likert playability & feel scale
  {
    profileRef: "uat_metric_profile_ref:guitarist_playability_touch_v1",
    ratingName: "Performing Guitarist Touch & Dynamic Response Scale",
    minRating: 1,
    maxRating: 7,
    validateRating: (r: number) => Number.isFinite(r) && r >= 1 && r <= 7,
    targetDurationSeconds: 300,
    maxAllowableDurationSeconds: 900,
    description: "Evaluates pick attack response, volume knob cleanup, and dynamic feel within declared latency budget.",
  },

  // 3. Creative Producer / Songwriter: 5-point semantic translation & inspiration scale
  {
    profileRef: "uat_metric_profile_ref:producer_semantic_translation_v1",
    ratingName: "Producer Semantic Musical Fit & Inspiration Scale",
    minRating: 1,
    maxRating: 5,
    validateRating: (r: number) => Number.isFinite(r) && r >= 1 && r <= 5,
    targetDurationSeconds: 450,
    maxAllowableDurationSeconds: 1200,
    description: "Evaluates intuitive natural-language tone translation without requiring DSP parameter debugging.",
  },

  // 4. Platform Architect: 100-point structural compliance & manifest validity score
  {
    profileRef: "uat_metric_profile_ref:platform_architect_compliance_v1",
    ratingName: "Tone-Platform Architecture Compliance Rating",
    minRating: 0,
    maxRating: 100,
    validateRating: (r: number) => Number.isFinite(r) && r >= 0 && r <= 100,
    targetDurationSeconds: 180,
    maxAllowableDurationSeconds: 600,
    description: "Evaluates target-platform export validity, XML structure, and parameter bound clamping.",
  },

  // 5. Table 05 PROFILE-14 Canonical Specification Reference
  {
    profileRef: "tolerance_spec_ref:persona_workflow_acceptance_criteria",
    ratingName: "PROFILE-14 Governed Persona Workflow Acceptance Criteria",
    minRating: 1,
    maxRating: 10,
    validateRating: (r: number) => Number.isFinite(r) && r >= 1 && r <= 10,
    targetDurationSeconds: 600,
    maxAllowableDurationSeconds: 1800,
    description: "Table 05 tolerance specification reference for PROFILE-14 end-to-end task completion.",
  },

  // 6. Table 05 PROFILE-07 Latency Budget Reference
  {
    profileRef: "tolerance_spec_ref:latency_budget_ref",
    ratingName: "PROFILE-07 Governed Playability Latency Budget Reference",
    minRating: 1,
    maxRating: 10,
    validateRating: (r: number) => Number.isFinite(r) && r >= 1 && r <= 10,
    targetDurationSeconds: 300,
    maxAllowableDurationSeconds: 900,
    description: "Table 05 tolerance specification reference for PROFILE-07 interactive playability feel.",
  },
];

/**
 * UATMetricResolver:
 * Registry and validator for UAT metric profiles.
 * Enforces:
 * - Anti-Universal-Scorecard discipline (no universal 1-5 or 1-10 fallback);
 * - Strictly fails closed when a metric profile reference is absent or unresolvable;
 * - Validates numeric ratings strictly within declared profile boundaries.
 */
export class UATMetricResolver implements UATMetricResolverInterface {
  private readonly profiles: Map<string, UATMetricProfile> = new Map();

  constructor(customProfiles?: ReadonlyArray<UATMetricProfile>) {
    // Register canonical built-in profiles
    for (const profile of CANONICAL_BUILTIN_PROFILES) {
      this.registerProfile(profile);
    }
    // Register custom profiles if provided
    if (customProfiles) {
      for (const custom of customProfiles) {
        this.registerProfile(custom);
      }
    }
  }

  /**
   * Registers a UAT metric profile into the registry.
   */
  public registerProfile(profile: UATMetricProfile): void {
    if (!profile || !profile.profileRef) {
      throw new Error("Cannot register UAT metric profile: profileRef is required.");
    }
    if (profile.minRating >= profile.maxRating) {
      throw new Error(
        `Invalid metric profile "${profile.profileRef}": minRating (${profile.minRating}) must be less than maxRating (${profile.maxRating}).`
      );
    }
    this.profiles.set(profile.profileRef, deepFreeze({ ...profile }));
  }

  public hasProfile(profileRef: string): boolean {
    return this.profiles.has(profileRef);
  }

  /**
   * Resolves a metric profile by reference.
   * STRICT GOVERNANCE: Fails closed if the reference is not found.
   * Never falls back to a universal 1-5 or default scale.
   */
  public resolve(profileRef: string): UATMetricProfile {
    if (!profileRef || typeof profileRef !== "string" || profileRef.trim() === "") {
      throw new MissingUATMetricProfileError(
        String(profileRef),
        "Metric profile reference is empty or undefined"
      );
    }
    const profile = this.profiles.get(profileRef.trim());
    if (!profile) {
      throw new MissingUATMetricProfileError(
        profileRef,
        `Profile reference is not registered. Available profiles: [${Array.from(this.profiles.keys()).join(", ")}]`
      );
    }
    return profile;
  }

  /**
   * Validates a numeric satisfaction rating against the resolved profile.
   * Throws InvalidSatisfactionRatingError if the rating violates profile constraints.
   */
  public validateRating(profileRef: string, rating: number): boolean {
    const profile = this.resolve(profileRef);

    if (typeof rating !== "number" || Number.isNaN(rating) || !Number.isFinite(rating)) {
      throw new InvalidSatisfactionRatingError(
        profileRef,
        rating,
        `Rating must be a finite number. Received: ${String(rating)}`
      );
    }

    if (rating < profile.minRating || rating > profile.maxRating) {
      throw new InvalidSatisfactionRatingError(
        profileRef,
        rating,
        `Rating ${rating} is out of allowable bounds [${profile.minRating}, ${profile.maxRating}]`
      );
    }

    if (!profile.validateRating(rating)) {
      throw new InvalidSatisfactionRatingError(
        profileRef,
        rating,
        `Rating ${rating} failed profile custom validation criteria.`
      );
    }

    return true;
  }

  public getAllProfiles(): ReadonlyArray<UATMetricProfile> {
    return Array.from(this.profiles.values());
  }
}
