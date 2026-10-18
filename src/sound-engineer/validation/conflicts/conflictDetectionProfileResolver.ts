// src/sound-engineer/validation/conflicts/conflictDetectionProfileResolver.ts
// Phase 1C.5h WP-17: Governed Conflict Detection Profile Resolver.
// Prohibits hardcoded universal percentages and guarantees fail-closed profile resolution.

import {
  CONFLICT_RESOLUTION_STATUSES,
  CONFLICT_RESOLUTION_STRATEGIES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
} from "../schemas/enums";
import { ConflictDetectionProfile } from "./conflictTypes";
import { MissingConflictProfileError } from "./conflictErrors";

/**
 * Standard governed conflict detection profiles bound to specific evaluation domains.
 */
export const GOVERNED_CONFLICT_PROFILES: ReadonlyMap<string, ConflictDetectionProfile> = new Map([
  [
    "conflict_detection_spec:acoustic:default",
    {
      profileRef: "conflict_detection_spec:acoustic:default",
      description: "Governed acoustic evidence conflict profile for spectral, dynamic, and listening evaluations.",
      triggers: {
        detectObjectivePassPerceptualFail: true,
        detectPerceptualPassObjectiveFail: true,
        minPerceptualConfidenceForConflict: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
      },
      defaultResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONVENE_EXPERT_PANEL_RECONCILIATION,
      defaultResolutionStatus: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
      defaultUnderlyingAcousticPhenomenon:
        "Psychoacoustic divergence between computational transfer function tolerances and human auditory timbre perception.",
      calculateResidualUncertainty: () => 0.75,
    },
  ],
  [
    "tolerance_spec_ref:conflict_detection_profile",
    {
      profileRef: "tolerance_spec_ref:conflict_detection_profile",
      description: "Standard tolerance specification profile reference for cross-methodology conflict detection.",
      triggers: {
        detectObjectivePassPerceptualFail: true,
        detectPerceptualPassObjectiveFail: true,
        minPerceptualConfidenceForConflict: PERCEPTUAL_CONFIDENCE_LEVELS.LOW,
      },
      defaultResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.CONDUCT_TARGETED_RETEST,
      defaultResolutionStatus: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
      defaultUnderlyingAcousticPhenomenon:
        "Objective frequency response metric met envelope bounds but human listening detected unmusical artifacts.",
      calculateResidualUncertainty: () => "HIGH_AESTHETIC_DIVERGENCE",
    },
  ],
  [
    "conflict_profile:guitar:tube_amp",
    {
      profileRef: "conflict_profile:guitar:tube_amp",
      description: "Guitar tube preamp and cabinet IR specific conflict detection profile.",
      triggers: {
        detectObjectivePassPerceptualFail: true,
        detectPerceptualPassObjectiveFail: true,
        minPerceptualConfidenceForConflict: PERCEPTUAL_CONFIDENCE_LEVELS.MEDIUM,
      },
      defaultResolutionStrategy: CONFLICT_RESOLUTION_STRATEGIES.ESCALATE_TO_STAGE_14_REVIEW,
      defaultResolutionStatus: CONFLICT_RESOLUTION_STATUSES.UNRESOLVED,
      defaultUnderlyingAcousticPhenomenon:
        "Non-linear harmonic saturation characteristics deemed pleasant by listener but flagged as distortion anomaly by FFT.",
      calculateResidualUncertainty: () => 0.65,
    },
  ],
]);

/**
 * Resolver for governed conflict detection profiles.
 * Fails closed if the requested profile reference is missing or unrecognized.
 */
export class ConflictDetectionProfileResolver {
  private readonly customProfiles = new Map<string, ConflictDetectionProfile>();

  /**
   * Registers a domain-specific conflict detection profile.
   */
  public registerProfile(profile: ConflictDetectionProfile): void {
    if (!profile || !profile.profileRef || profile.profileRef.trim().length === 0) {
      throw new Error("Invalid profile: profileRef must not be empty");
    }
    this.customProfiles.set(profile.profileRef, profile);
  }

  /**
   * Resolves a profile by reference. Fails closed with MissingConflictProfileError if not found.
   */
  public resolveProfile(profileRef: string): ConflictDetectionProfile {
    if (!profileRef || profileRef.trim().length === 0) {
      throw new MissingConflictProfileError("<empty_ref>");
    }

    const custom = this.customProfiles.get(profileRef);
    if (custom) return custom;

    const governed = GOVERNED_CONFLICT_PROFILES.get(profileRef);
    if (governed) return governed;

    throw new MissingConflictProfileError(profileRef);
  }

  public hasProfile(profileRef: string): boolean {
    return this.customProfiles.has(profileRef) || GOVERNED_CONFLICT_PROFILES.has(profileRef);
  }
}
