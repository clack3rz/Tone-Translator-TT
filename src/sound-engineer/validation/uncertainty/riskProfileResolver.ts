// src/sound-engineer/validation/uncertainty/riskProfileResolver.ts
// Phase 1C.5h WP-18: Governed Production Risk Profile Repository & Resolver.
// Prohibits hardcoded universal numeric thresholds, arbitrary global percentages,
// and fallback to "strictest" or borrowed profiles. Missing profile fails closed.

import {
  CONFLICT_RESOLUTION_STATUSES,
  FAILURE_ATTRIBUTION_CLASSES,
  UNCERTAINTY_GATE_8_IMPACTS,
  UNCERTAINTY_SOURCES,
} from "../schemas/enums";
import { MissingRiskProfileError, UnknownRiskProfileError } from "./uncertaintyErrors";
import {
  GovernedRiskEvaluationResult,
  RiskProfile,
  UncertaintyEvaluationInput,
} from "./uncertaintyTypes";

/**
 * Standard governed production risk profiles.
 */
export const GOVERNED_RISK_PROFILES: ReadonlyMap<string, RiskProfile> = new Map([
  // 1. Conservative Core DSP Profile
  [
    "risk_profile:conservative:core_dsp",
    {
      profileRef: "risk_profile:conservative:core_dsp",
      description: "Conservative risk evaluation profile for core DSP, amplifier modeling, and tube dynamics.",
      domain: "CORE_DSP",
      evaluateRisk: (input: UncertaintyEvaluationInput): GovernedRiskEvaluationResult => {
        const severity = input.severity ?? "HIGH";

        switch (input.uncertaintySource) {
          case UNCERTAINTY_SOURCES.MISSING_EVIDENCE:
            return {
              potentialProductionRisk:
                "Missing core DSP evidence presents unacceptable operational risk of severe acoustic distortion or system instability in production.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
              requiredMonitoringIfAuthorized: [],
              internalCalculatedRiskScore: 0.95,
            };

          case UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE: {
            if (severity === "CRITICAL" || severity === "HIGH") {
              return {
                potentialProductionRisk:
                  "Unresolved conflicting evidence between objective transfer metrics and listening panel indicates acoustic instability in core tone stack.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.85,
              };
            }
            if (severity === "MEDIUM") {
              return {
                potentialProductionRisk:
                  "Moderate residual disagreement across non-critical secondary parameters; tone envelope intact.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
                requiredMonitoringIfAuthorized: [
                  "telemetry:spectral_flatness_drift",
                  "telemetry:harmonic_distortion_ratio",
                  "telemetry:evaluator_rating_anomaly_flag",
                ],
                internalCalculatedRiskScore: 0.55,
              };
            }
            return {
              potentialProductionRisk:
                "Minor residual dispute with negligible perceived sonic impact on core amp model.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
              requiredMonitoringIfAuthorized: [],
              internalCalculatedRiskScore: 0.2,
            };
          }

          case UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE: {
            if (severity === "CRITICAL" || (input.sampleSizeActual !== undefined && input.sampleSizeRequired !== undefined && input.sampleSizeActual < input.sampleSizeRequired * 0.3)) {
              return {
                potentialProductionRisk:
                  "Severe sample size deficiency prevents statistical confidence in core DSP harmonic stability.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.9,
              };
            }
            return {
              potentialProductionRisk:
                "Limited sample size captured across edge playing styles; core performance verified.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:sample_capture_expansion_counter",
                "telemetry:evaluator_session_logging",
              ],
              internalCalculatedRiskScore: 0.45,
            };
          }

          case UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN: {
            if (severity === "CRITICAL" || severity === "HIGH") {
              return {
                potentialProductionRisk:
                  "Untested core edge boundary (e.g. extreme gain stage or pathological input transient) may cause audio clipping or filter blowup.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.88,
              };
            }
            if (severity === "MEDIUM") {
              return {
                potentialProductionRisk:
                  "Untested boundary parameter combination outside standard musician operational range.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
                requiredMonitoringIfAuthorized: [
                  "telemetry:parameter_boundary_clamp_counter",
                  "telemetry:transient_peak_overshoot_detector",
                ],
                internalCalculatedRiskScore: 0.5,
              };
            }
            return {
              potentialProductionRisk:
                "Peripheral extreme control setting untested; low likelihood of musical deployment.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
              requiredMonitoringIfAuthorized: [],
              internalCalculatedRiskScore: 0.15,
            };
          }

          case UNCERTAINTY_SOURCES.CALIBRATION_AMBIGUITY: {
            if (severity === "CRITICAL" || severity === "HIGH") {
              return {
                potentialProductionRisk:
                  "Host audio interface or DI fixture calibration uncertainty leaves measured frequency response ambiguous.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.8,
              };
            }
            return {
              potentialProductionRisk:
                "Minor fixture pre-amp calibration tolerance drift; tone integrity verified through secondary reference.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:fixture_recalibration_audit_flag",
                "telemetry:analog_input_gain_drift",
              ],
              internalCalculatedRiskScore: 0.4,
            };
          }

          case UNCERTAINTY_SOURCES.UNKNOWN_FAILURE_CAUSE: {
            if (severity === "CRITICAL" || severity === "HIGH") {
              return {
                potentialProductionRisk:
                  "Unexplained system failure with unknown root cause creates unacceptable production crash or state corruption risk.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.92,
              };
            }
            return {
              potentialProductionRisk:
                "Isolated non-fatal failure with unknown attribution; isolated to peripheral non-audio thread.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:unhandled_exception_counter",
                "telemetry:thread_heartbeat_monitor",
              ],
              internalCalculatedRiskScore: 0.5,
            };
          }

          case UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY: {
            return {
              potentialProductionRisk:
                "Target host platform version instability threatens runtime DSP callback latency and preset deserialization.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:host_audio_callback_jitter",
                "telemetry:buffer_underrun_counter",
                "telemetry:target_platform_version_verification",
              ],
              internalCalculatedRiskScore: 0.65,
            };
          }

          default:
            return {
              potentialProductionRisk: "Unclassified uncertainty in core DSP model.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
              requiredMonitoringIfAuthorized: [],
              internalCalculatedRiskScore: 0.99,
            };
        }
      },
    },
  ],

  // 2. Perceptual Timbre Evaluation Profile
  [
    "risk_profile:perceptual:timbre_evaluation",
    {
      profileRef: "risk_profile:perceptual:timbre_evaluation",
      description: "Risk profile for perceptual listening tests, double-blind panels, and subjective tone feel.",
      domain: "PERCEPTUAL",
      evaluateRisk: (input: UncertaintyEvaluationInput): GovernedRiskEvaluationResult => {
        const severity = input.severity ?? "MEDIUM";

        switch (input.uncertaintySource) {
          case UNCERTAINTY_SOURCES.CONFLICTING_EVIDENCE: {
            if (severity === "CRITICAL") {
              return {
                potentialProductionRisk:
                  "Critical dispute between master engineer panel and acoustic metrics on tube warmth and pick attack.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.85,
              };
            }
            if (severity === "LOW") {
              return {
                potentialProductionRisk:
                  "Subtle perceptual variance in airiness across high-end studio monitoring setups; musically acceptable.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.15,
              };
            }
            return {
              potentialProductionRisk:
                "Evaluator panel expressed mixed ratings on high-gain presence boost.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:musician_preset_eq_adjustment_rate",
                "telemetry:user_listening_sentiment_tracker",
              ],
              internalCalculatedRiskScore: 0.45,
            };
          }

          case UNCERTAINTY_SOURCES.INSUFFICIENT_SAMPLE_SIZE: {
            if (severity === "LOW") {
              return {
                potentialProductionRisk:
                  "Slightly smaller listening panel than optimal, but consensus is positive.",
                gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
                requiredMonitoringIfAuthorized: [],
                internalCalculatedRiskScore: 0.25,
              };
            }
            return {
              potentialProductionRisk:
                "Limited listening panel evaluation requires post-cutover musician feedback monitoring.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:post_release_listener_panel_feedback",
                "telemetry:preset_modification_frequency",
              ],
              internalCalculatedRiskScore: 0.5,
            };
          }

          default:
            return {
              potentialProductionRisk:
                "Perceptual evaluation ambiguity requires observation of musician satisfaction.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
              requiredMonitoringIfAuthorized: [
                "telemetry:musician_tone_rating_stream",
              ],
              internalCalculatedRiskScore: 0.5,
            };
        }
      },
    },
  ],

  // 3. Platform & AmpliTube 5 Adapter Risk Profile
  [
    "risk_profile:platform:amplitube5_adapter",
    {
      profileRef: "risk_profile:platform:amplitube5_adapter",
      description: "Risk evaluation profile for AmpliTube 5 preset serialization, XML export, and host compatibility.",
      domain: "PLATFORM_EXPORT",
      evaluateRisk: (input: UncertaintyEvaluationInput): GovernedRiskEvaluationResult => {
        const severity = input.severity ?? "HIGH";

        if (input.uncertaintySource === UNCERTAINTY_SOURCES.TARGET_PLATFORM_VERSION_INSTABILITY) {
          if (severity === "CRITICAL") {
            return {
              potentialProductionRisk:
                "Host platform minor version update modifies preset XML schema, risking preset load crashes.",
              gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
              requiredMonitoringIfAuthorized: [],
              internalCalculatedRiskScore: 0.9,
            };
          }
          return {
            potentialProductionRisk:
              "Target host platform version has untested minor build patch; export format backward compatibility verified.",
            gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
            requiredMonitoringIfAuthorized: [
              "telemetry:at5_preset_load_success_rate",
              "telemetry:xml_deserialization_error_counter",
              "telemetry:host_platform_build_reporter",
            ],
            internalCalculatedRiskScore: 0.6,
          };
        }

        if (input.uncertaintySource === UNCERTAINTY_SOURCES.UNTESTED_EDGE_DOMAIN) {
          return {
            potentialProductionRisk:
              "Untested DAW host environment combination (e.g. standalone vs VST3 in Reaper).",
            gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
            requiredMonitoringIfAuthorized: [
              "telemetry:daw_host_environment_id_logging",
              "telemetry:export_compatibility_alerts",
            ],
            internalCalculatedRiskScore: 0.5,
          };
        }

        return {
          potentialProductionRisk:
            "Platform export parameter mapping ambiguity.",
          gate8Impact: severity === "LOW"
            ? UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK
            : UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
          requiredMonitoringIfAuthorized: severity === "LOW" ? [] : [
            "telemetry:platform_parameter_clamp_monitor",
          ],
          internalCalculatedRiskScore: 0.4,
        };
      },
    },
  ],

  // 4. General Standard Risk Profile
  [
    "risk_profile:general:standard",
    {
      profileRef: "risk_profile:general:standard",
      description: "Standard general-purpose validation risk profile for all governed uncertainty sources.",
      domain: "GENERAL",
      evaluateRisk: (input: UncertaintyEvaluationInput): GovernedRiskEvaluationResult => {
        const severity = input.severity ?? "MEDIUM";

        if (severity === "CRITICAL") {
          return {
            potentialProductionRisk: `Critical uncertainty in ${input.uncertaintySource} threatens production integrity.`,
            gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
            requiredMonitoringIfAuthorized: [],
            internalCalculatedRiskScore: 0.9,
          };
        }

        if (severity === "LOW") {
          return {
            potentialProductionRisk: `Low-consequence uncertainty in ${input.uncertaintySource} poses minimal production risk.`,
            gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
            requiredMonitoringIfAuthorized: [],
            internalCalculatedRiskScore: 0.1,
          };
        }

        // MEDIUM severity defaults to ALLOWS_CONDITIONAL with required monitoring
        return {
          potentialProductionRisk: `Moderate uncertainty in ${input.uncertaintySource} managed through conditional monitoring.`,
          gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL,
          requiredMonitoringIfAuthorized: [
            `telemetry:${input.uncertaintySource.toLowerCase()}_drift_monitor`,
            "telemetry:runtime_anomaly_counter",
          ],
          internalCalculatedRiskScore: 0.5,
        };
      },
    },
  ],

  // 5. Permissive Low-Impact Profile
  [
    "risk_profile:permissive:low_impact",
    {
      profileRef: "risk_profile:permissive:low_impact",
      description: "Risk profile for non-critical cosmetic, utility, and metadata components.",
      domain: "LOW_IMPACT",
      evaluateRisk: (input: UncertaintyEvaluationInput): GovernedRiskEvaluationResult => {
        if (input.severity === "CRITICAL") {
          return {
            potentialProductionRisk: "Unexpected critical failure in low-impact component.",
            gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK,
            requiredMonitoringIfAuthorized: [],
            internalCalculatedRiskScore: 0.8,
          };
        }

        return {
          potentialProductionRisk: `Residual uncertainty in ${input.uncertaintySource} represents acceptable production trade-off.`,
          gate8Impact: UNCERTAINTY_GATE_8_IMPACTS.ACCEPTABLE_LOW_RISK,
          requiredMonitoringIfAuthorized: [],
          internalCalculatedRiskScore: 0.15,
        };
      },
    },
  ],
]);

/**
 * Resolver for governed production risk profiles.
 * Strict fail-closed policy: If a requested profile is missing or unknown, throws an error.
 */
export class RiskProfileResolver {
  private readonly profiles: Map<string, RiskProfile>;

  constructor(customProfiles?: ReadonlyArray<RiskProfile>) {
    this.profiles = new Map(GOVERNED_RISK_PROFILES);
    if (customProfiles) {
      for (const profile of customProfiles) {
        this.profiles.set(profile.profileRef, profile);
      }
    }
  }

  /**
   * Resolves a risk profile by reference. Fails closed if missing or unknown.
   */
  public resolveProfile(profileRef: string): RiskProfile {
    if (!profileRef || typeof profileRef !== "string" || profileRef.trim() === "") {
      throw new MissingRiskProfileError(profileRef || "(empty)");
    }
    const trimmed = profileRef.trim();
    const profile = this.profiles.get(trimmed);
    if (!profile) {
      throw new UnknownRiskProfileError(trimmed);
    }
    return profile;
  }

  /**
   * Registers an additional governed risk profile.
   */
  public registerProfile(profile: RiskProfile): void {
    if (!profile.profileRef || typeof profile.profileRef !== "string") {
      throw new Error("Risk profile must have a valid profileRef string.");
    }
    this.profiles.set(profile.profileRef, profile);
  }

  /**
   * Checks if a profile is registered.
   */
  public hasProfile(profileRef: string): boolean {
    return this.profiles.has(profileRef.trim());
  }
}
