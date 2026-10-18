// src/sound-engineer/validation/evaluation/toleranceCriteriaResolver.ts
// ToleranceCriteriaResolver: Resolves governed tolerance criteria per dimension and gear topology.
// Phase 1C.5h — WP-14.
// Bound to frozen specification v0.1j Section 19, Invariant 7, and Plan Override v0.1h.

import { deepFreeze } from "../../contracts/immutability";
import {
  ACOUSTIC_EVALUATION_DIMENSIONS,
  AcousticEvaluationDimension,
  DimensionToleranceSpec,
} from "./acousticEvaluationTypes";

/**
 * Standard governed tolerance specifications bound to specific amplifier and pedal topologies.
 * Derived from authoritative circuit classes rather than universal numbers.
 */
const GOVERNED_TOPOLOGY_SPECS: ReadonlyArray<DimensionToleranceSpec> = [
  // 1. TUBE POWER AMP: High-voltage push-pull amplifier stage
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL,
    toleranceSpecRef: "tolerance_spec:tube_power_amp:spectral",
    isCritical: true,
    gearTopology: "TUBE_POWER_AMP",
    targetComponentClass: "Power amplifier stage",
    rules: [
      {
        metricName: "frequencyResponseDeltaDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 1.5,
        borderlineMarginPercent: 10,
      },
    ],
    description: "Frequency response delta for power-amp transformer and tube saturation curve.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC,
    toleranceSpecRef: "tolerance_spec:tube_power_amp:harmonic",
    isCritical: true,
    gearTopology: "TUBE_POWER_AMP",
    targetComponentClass: "Power amplifier stage",
    rules: [
      {
        metricName: "thdPercent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 8.0, // Power amp sag and saturation allows controlled harmonic THD
        borderlineMarginPercent: 5,
      },
    ],
    description: "Governed harmonic distortion limits for push-pull tube output stage.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC,
    toleranceSpecRef: "tolerance_spec:tube_power_amp:dynamic",
    isCritical: false,
    gearTopology: "TUBE_POWER_AMP",
    targetComponentClass: "Power amplifier stage",
    rules: [
      {
        metricName: "crestFactorDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 14.0,
        borderlineMarginPercent: 5,
      },
    ],
    description: "Power-amp dynamic crest factor under load.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.PHASE,
    toleranceSpecRef: "tolerance_spec:tube_power_amp:phase",
    isCritical: false,
    gearTopology: "TUBE_POWER_AMP",
    targetComponentClass: "Power amplifier stage",
    rules: [
      {
        metricName: "phaseCorrelation",
        comparisonType: "VALUE_GREATER_THAN",
        thresholdValue: 0.7,
      },
    ],
    description: "Mono power amp output phase linearity.",
  },

  // 2. ANALOG OVERDRIVE PEDAL: Symmetrical diode clipping circuit
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL,
    toleranceSpecRef: "tolerance_spec:analog_overdrive_pedal:spectral",
    isCritical: false,
    gearTopology: "ANALOG_OVERDRIVE_PEDAL",
    targetComponentClass: "Overdrive stompbox",
    rules: [
      {
        metricName: "frequencyResponseDeltaDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 2.0,
      },
    ],
    description: "Mid-hump and tone control filtering tolerances.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC,
    toleranceSpecRef: "tolerance_spec:analog_overdrive_pedal:harmonic",
    isCritical: true,
    gearTopology: "ANALOG_OVERDRIVE_PEDAL",
    targetComponentClass: "Overdrive stompbox",
    rules: [
      {
        metricName: "thdPercent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 25.0, // High clipping is expected, but bounded
      },
    ],
    description: "Diode saturation harmonic profile.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC,
    toleranceSpecRef: "tolerance_spec:analog_overdrive_pedal:dynamic",
    isCritical: false,
    gearTopology: "ANALOG_OVERDRIVE_PEDAL",
    targetComponentClass: "Overdrive stompbox",
    rules: [
      {
        metricName: "crestFactorDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 16.0,
      },
    ],
    description: "Overdrive stompbox dynamic compression.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.PHASE,
    toleranceSpecRef: "tolerance_spec:analog_overdrive_pedal:phase",
    isCritical: false,
    gearTopology: "ANALOG_OVERDRIVE_PEDAL",
    targetComponentClass: "Overdrive stompbox",
    rules: [
      {
        metricName: "phaseCorrelation",
        comparisonType: "VALUE_GREATER_THAN",
        thresholdValue: 0.7,
      },
    ],
    description: "Overdrive stompbox phase correlation.",
  },

  // 3. CABINET IR SIMULATOR: Multi-microphone speaker cabinet convolution
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL,
    toleranceSpecRef: "tolerance_spec:cabinet_ir_simulator:spectral",
    isCritical: true,
    gearTopology: "CABINET_IR_SIMULATOR",
    targetComponentClass: "Speaker cabinet convolution",
    rules: [
      {
        metricName: "frequencyResponseDeltaDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 0.8, // Convolutions require tight spectral matching
      },
    ],
    description: "Speaker cone acoustic response delta.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.PHASE,
    toleranceSpecRef: "tolerance_spec:cabinet_ir_simulator:phase",
    isCritical: true,
    gearTopology: "CABINET_IR_SIMULATOR",
    targetComponentClass: "Speaker cabinet convolution",
    rules: [
      {
        metricName: "phaseCorrelation",
        comparisonType: "VALUE_GREATER_THAN",
        thresholdValue: 0.85, // Multi-mic phase coherence must be high
      },
    ],
    description: "Multi-mic phase coherence across speaker cone.",
  },

  // 4. Canonical Test Profile References (Table 05)
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL,
    toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    isCritical: true,
    rules: [
      {
        metricName: "frequencyResponseDeltaDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 1.5,
      },
    ],
    description: "Table 05 PROFILE-04 Objective Acoustic tolerance criteria.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC,
    toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    isCritical: true,
    rules: [
      {
        metricName: "thdPercent",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 5.0,
      },
    ],
    description: "Table 05 PROFILE-04 Harmonic distortion tolerance criteria.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.PHASE,
    toleranceSpecRef: "tolerance_spec_ref:acoustic_profile_tolerance",
    isCritical: false,
    rules: [
      {
        metricName: "phaseCorrelation",
        comparisonType: "VALUE_GREATER_THAN",
        thresholdValue: 0.7,
      },
    ],
    description: "Table 05 PROFILE-04 Phase correlation tolerance criteria.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC,
    toleranceSpecRef: "tolerance_spec_ref:dynamic_budget_spec",
    isCritical: true,
    rules: [
      {
        metricName: "crestFactorDb",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 16.0,
      },
      {
        metricName: "dynamicRangeDb",
        comparisonType: "VALUE_GREATER_THAN",
        thresholdValue: 40.0,
      },
    ],
    description: "Table 05 PROFILE-05 Dynamic response budget specification.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.PLAYABILITY,
    toleranceSpecRef: "tolerance_spec_ref:latency_budget_ref",
    isCritical: true,
    rules: [
      {
        metricName: "latencyMs",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 10.0,
      },
    ],
    description: "Table 05 PROFILE-07 Playability latency budget specification.",
  },
  {
    dimension: ACOUSTIC_EVALUATION_DIMENSIONS.MIX_CONTEXT,
    toleranceSpecRef: "tolerance_spec_ref:mix_context_masking_tolerance",
    isCritical: false,
    rules: [
      {
        metricName: "maskingRatio",
        comparisonType: "VALUE_LESS_THAN",
        thresholdValue: 0.25,
      },
    ],
    description: "Table 05 PROFILE-08 Mix context masking tolerance specification.",
  },
];

/**
 * ToleranceCriteriaResolver:
 * Registry and resolver for governed dimension tolerance criteria.
 *
 * CRITICAL BINDING RULE (Plan Defect Override):
 * Unrecognized topologies must NOT receive synthesized or "strictest" fallback thresholds.
 * If a topology or profile has no registered governed tolerance specification,
 * resolution strictly returns undefined. Borrowing thresholds across topologies is prohibited.
 */
export class ToleranceCriteriaResolver {
  private readonly specs: Map<string, DimensionToleranceSpec> = new Map();

  constructor(customSpecs?: ReadonlyArray<DimensionToleranceSpec>) {
    // Register canonical topology specs
    for (const spec of GOVERNED_TOPOLOGY_SPECS) {
      this.registerSpec(spec);
    }
    if (customSpecs) {
      for (const custom of customSpecs) {
        this.registerSpec(custom);
      }
    }
  }

  /**
   * Generates a unique lookup key for a dimension and identifier.
   */
  private makeKey(dimension: AcousticEvaluationDimension, identifier: string): string {
    return `${dimension}:${identifier.trim().toUpperCase()}`;
  }

  /**
   * Registers a governed dimension tolerance specification.
   */
  public registerSpec(spec: DimensionToleranceSpec): void {
    const key = this.makeKey(spec.dimension, spec.toleranceSpecRef);
    this.specs.set(key, deepFreeze({ ...spec }));

    if (spec.gearTopology) {
      const topKey = this.makeKey(spec.dimension, spec.gearTopology);
      this.specs.set(topKey, deepFreeze({ ...spec }));
    }
  }

  /**
   * Resolves the governed tolerance specification for a dimension.
   *
   * STRICT GOVERNANCE (Plan Defect Override):
   * If identifier is unknown or no specification exists for this dimension and topology:
   * - Strictly returns undefined;
   * - Does NOT fallback to strictest conservative tolerances;
   * - Does NOT borrow tolerances from another topology;
   * - Does NOT synthesize numeric thresholds.
   */
  public resolveTolerance(
    dimension: AcousticEvaluationDimension,
    specRefOrTopology?: string
  ): DimensionToleranceSpec | undefined {
    if (!specRefOrTopology || typeof specRefOrTopology !== "string" || specRefOrTopology.trim() === "") {
      return undefined;
    }

    const key = this.makeKey(dimension, specRefOrTopology);
    return this.specs.get(key);
  }

  public hasTolerance(
    dimension: AcousticEvaluationDimension,
    specRefOrTopology?: string
  ): boolean {
    return this.resolveTolerance(dimension, specRefOrTopology) !== undefined;
  }
}
