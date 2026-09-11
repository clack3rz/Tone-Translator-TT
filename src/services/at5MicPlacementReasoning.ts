// src/services/at5MicPlacementReasoning.ts
// Authoritative Stage 2 Semantic Microphone Placement Decision System

import {
  SemanticPosition,
  SemanticDistance,
  SemanticAngle,
  VALID_SEMANTIC_POSITIONS,
  VALID_SEMANTIC_DISTANCES,
  VALID_SEMANTIC_ANGLES,
  isValidSemanticPosition,
  isValidSemanticDistance,
  isValidSemanticAngle,
  formatSemanticPlacement,
  parseSemanticPlacement,
  isCompleteSemanticPlacement
} from "./at5MicPlacementService";
import { detectCabSettingsFormat } from "./at5SignalChainNormalizer";
import { ToneProfile, ToneResult, SignalChainElement } from "../types";

export interface MicReasoningInput {
  micModel: string;
  micSlot: "Mic_0" | "Mic_1" | "Mic_2";
  cabName?: string;
  speakerName?: string;
  toneProfile?: Partial<ToneProfile>;
  otherMic?: {
    model: string;
    role?: string;
    position?: SemanticPosition;
    distance?: SemanticDistance;
    angle?: SemanticAngle;
  };
  promptContext?: string;
  existingPlacement?: string;
}

export interface MicPlacementDecision {
  micModel: string;
  micSlot: "Mic_0" | "Mic_1" | "Mic_2";
  role: string;
  position: SemanticPosition;
  distance: SemanticDistance;
  angle: SemanticAngle;
  placementString: string; // e.g. "Cap Edge, Close, On Axis"
  reason: string; // Acoustic explanation detailing target tone requirements, role, and position/distance/angle rationale
  validationNote?: string; // Software verification and provenance note kept distinct from acoustic reasoning
  wasCompletedFromPartialOrOmitted: boolean;
}

/**
 * Assigns an authoritative tonal role to a selected microphone model
 * based on its acoustic transducer characteristics and musical function.
 */
export function determineMicrophoneRole(
  micModel: string,
  toneProfile?: Partial<ToneProfile>,
  micSlot: "Mic_0" | "Mic_1" | "Mic_2" = "Mic_0"
): string {
  const clean = (micModel || "").toLowerCase().trim();
  const isBassTone = toneProfile?.role === "bass" || 
    (toneProfile?.style || []).some(s => s.toLowerCase().includes("bass"));

  if (isBassTone || clean.includes("vintage dynamic 20") || clean.includes("dynamic 20") || clean.includes("re20")) {
    return "bass low-end/fullness mic";
  }

  if (clean.includes("57") || clean.includes("sm57") || clean.includes("i5") || clean.includes("d6")) {
    return "primary attack/presence mic";
  }

  if (clean.includes("121") || clean.includes("r121") || clean.includes("ribbon") || clean.includes("160") || clean.includes("vr1")) {
    return "warmth/fizz-control mic";
  }

  if (clean.includes("87") || clean.includes("u87") || clean.includes("414") || clean.includes("c414") || clean.includes("condenser")) {
    if (toneProfile?.style?.some(s => ["ambient", "shoegaze", "surf", "room"].includes(s.toLowerCase()))) {
      return "room/space mic";
    }
    return "detail/polish mic";
  }

  if (clean.includes("421") || clean.includes("md421")) {
    return "body/punch mic";
  }

  // General fallbacks based on slot
  return (micSlot === "Mic_0" || micSlot === "Mic_1") ? "primary attack/presence mic" : "warmth/fizz-control mic";
}

/**
 * Determines acoustic target tone requirements from ToneProfile and prompt context.
 * Expresses musical/acoustic requirements (e.g., transient attack, upper-mid definition, fizz risk)
 * rather than simple genre labels.
 */
export function determineTargetToneRequirement(
  role: string,
  toneProfile?: Partial<ToneProfile>,
  promptContext: string = ""
): string {
  const promptLower = promptContext.toLowerCase();
  const gainLevel = (toneProfile?.gain_level || "").toLowerCase();
  const distType = (toneProfile?.distortion_type || "").toLowerCase();
  const isHighGain = gainLevel === "high" || gainLevel === "medium-high" || distType === "saturated" || distType === "fuzz" ||
    promptLower.includes("thrash") || promptLower.includes("metal") || promptLower.includes("high gain");
  const isCrunch = distType === "crunch" || distType === "overdrive" || gainLevel === "medium";
  const isClean = gainLevel === "clean" || gainLevel === "low" || distType === "clean" || distType === "transparent";
  const hasHarshnessRisk = isHighGain || promptLower.includes("fizz") || promptLower.includes("harsh") || promptLower.includes("buzz") || promptLower.includes("solid-state") || promptLower.includes("solid state");
  const isRhythm = toneProfile?.role === "rhythm" || promptLower.includes("rhythm") || promptLower.includes("palm mute") || promptLower.includes("chug");
  const isLead = toneProfile?.role === "lead" || promptLower.includes("lead") || promptLower.includes("solo");
  const isAmbient = (toneProfile?.style || []).some(s => ["ambient", "shoegaze", "surf", "spatial"].includes(s.toLowerCase())) || promptLower.includes("ambient");

  if (role.includes("attack") || role.includes("presence")) {
    if (isHighGain && isRhythm) {
      return "The target calls for sharp pick attack, tight transient definition, and aggressive upper-mid presence under heavy saturation";
    }
    if (isHighGain) {
      return "The target calls for sharp pick attack and forward upper-mid definition under dense harmonic saturation";
    }
    if (isCrunch) {
      return "The target requires crisp transient attack, punchy upper-mid bite, and dynamic pick response";
    }
    if (isClean) {
      return "The target calls for transparent transient attack, pristine pick definition, and open acoustic chime";
    }
    if (isLead) {
      return "The target calls for articulate pick attack, singing upper-mid presence, and focused note definition";
    }
    return "The target requires defined transient attack and focused upper-mid articulation";
  }

  if (role.includes("warmth") || role.includes("fizz")) {
    if (hasHarshnessRisk) {
      return "The target involves dense harmonic saturation prone to high-frequency distortion fizz and aggressive treble bite";
    }
    if (isCrunch) {
      return "The target calls for warm low-mid body and rounded cabinet resonance to anchor the crunch without brittle top end";
    }
    if (isClean) {
      return "The target benefits from warm acoustic body, rounded low-mid resonance, and smooth harmonic rolloff";
    }
    return "The target requires balanced low-mid warmth and controlled high-frequency response";
  }

  if (role.includes("body") || role.includes("punch")) {
    return "The target calls for muscular lower-midrange punch, authoritative cabinet thump, and focused palm-mute tracking";
  }

  if (role.includes("room") || role.includes("space") || isAmbient) {
    return "The target demands natural acoustic room reflections, spatial width, and diffused ambient depth";
  }

  if (role.includes("detail") || role.includes("polish")) {
    return "The target calls for studio-grade sheen, broad frequency extension, and nuanced acoustic detail";
  }

  if (role.includes("bass")) {
    return "The target requires deep fundamental bass frequencies with smooth, controlled proximity effect and punch";
  }

  return "The target calls for balanced frequency response and articulate cabinet coupling";
}

/**
 * Explains why the selected Position supports the microphone's role and target sound.
 */
export function determinePositionReason(
  position: SemanticPosition,
  role: string
): string {
  switch (position) {
    case "Cap":
      return "Cap placement maximizes direct high-frequency brightness and pick attack where aggressive forward cut is needed";
    case "Cap Edge":
      return "Cap Edge preserves transient definition and pick attack while avoiding excessive direct-cap harshness";
    case "Cone":
      return "Cone reduces direct upper-frequency emphasis, fills out woody lower midrange, and adds warm speaker body";
    case "Cone Edge":
      return "Cone Edge provides the strongest positional softening, severely attenuating harsh top-end sizzle while maximizing low-end fullness";
  }
}

/**
 * Explains why the selected Distance supports the microphone's role and target sound.
 */
export function determineDistanceReason(
  distance: SemanticDistance,
  role: string,
  promptContext: string = ""
): string {
  const promptLower = promptContext.toLowerCase();
  switch (distance) {
    case "Close":
      if (promptLower.includes("rhythm") || promptLower.includes("palm mute") || promptLower.includes("tight") || promptLower.includes("thrash")) {
        return "Close keeps palm-mute response tight and immediate with minimal room bleed";
      }
      return "Close keeps cabinet response direct, punchy, and tight with controlled low-end coupling";
    case "Medium":
      return "Medium distance introduces natural cabinet blend and acoustic openness while retaining useful speaker focus";
    case "Far":
      return "Far placement deliberately captures ambient room reflections and spatial diffusion rather than direct speaker impact";
  }
}

/**
 * Explains why the selected Angle supports the microphone's role and target sound.
 */
export function determineAngleReason(
  angle: SemanticAngle,
  role: string
): string {
  switch (angle) {
    case "On Axis":
      if (role.includes("attack") || role.includes("presence")) {
        return "On Axis preserves the attack, direct high-frequency energy, and articulation required from the primary mic";
      }
      return "On Axis preserves direct high-frequency energy, attack and articulation";
    case "45° Off Axis":
      return "45° Off Axis softens direct highs and helps control harshness and fizz without sacrificing body";
  }
}

/**
 * Explains how Mic 2 complements Mic 1 when two microphones are present.
 */
export function determineMultiMicRelationship(
  micModel: string,
  role: string,
  position: SemanticPosition,
  distance: SemanticDistance,
  angle: SemanticAngle,
  otherMic: NonNullable<MicReasoningInput["otherMic"]>
): string {
  const otherName = otherMic.model || "primary mic";
  const isOtherAttack = otherMic.role?.includes("attack") || otherMic.role?.includes("presence");
  const isThisWarmth = role.includes("warmth") || role.includes("fizz");

  if (isThisWarmth && isOtherAttack) {
    if (position === "Cone" && angle === "45° Off Axis") {
      return `This mic complements the brighter ${otherName} by supplying a smoother, warmer contribution: while ${otherName} handles aggressive attack at the cap edge, this mic's Cone position and 45° Off Axis angle selectively tames high-frequency distortion fizz to create a balanced, multi-dimensional blend`;
    }
    if (position === "Cone" && angle === "On Axis") {
      return `This mic complements ${otherName} by supplying woody lower midrange and body without over-damping highs, anchoring the brighter attack of ${otherName}`;
    }
    return `This mic complements ${otherName} by providing a warmer, fuller low-mid foundation to counterbalance the primary attack`;
  }

  if (role.includes("body") || role.includes("punch")) {
    return `This mic complements ${otherName} by reinforcing muscular lower-midrange punch and low-end weight on palm mutes`;
  }

  if (role.includes("room") || role.includes("space")) {
    return `This mic complements the direct focus of ${otherName} by contributing spacious room ambience and acoustic depth`;
  }

  if (role.includes("detail") || role.includes("polish")) {
    return `This mic complements ${otherName} by adding pristine high-frequency sheen and articulate acoustic nuance`;
  }

  return `This mic complements ${otherName} to provide a balanced multi-microphone composite`;
}

export interface BuildAcousticReasoningInput {
  micModel: string;
  micSlot: "Mic_0" | "Mic_1" | "Mic_2";
  role: string;
  position: SemanticPosition;
  distance: SemanticDistance;
  angle: SemanticAngle;
  toneProfile?: Partial<ToneProfile>;
  promptContext?: string;
  speakerName?: string;
  cabName?: string;
  otherMic?: {
    model: string;
    role?: string;
    position?: SemanticPosition;
    distance?: SemanticDistance;
    angle?: SemanticAngle;
  };
}

/**
 * Builds the comprehensive acoustic rationale for a microphone's semantic placement,
 * exposing target tone requirements, role, position/distance/angle physics, and multi-mic blending.
 */
export function buildAcousticReasoning(params: BuildAcousticReasoningInput): string {
  const { micModel, micSlot, role, position, distance, angle, toneProfile, promptContext = "", otherMic } = params;

  const targetReq = determineTargetToneRequirement(role, toneProfile, promptContext);
  const posReason = determinePositionReason(position, role);
  const distReason = determineDistanceReason(distance, role, promptContext);
  const angReason = determineAngleReason(angle, role);

  if ((micSlot === "Mic_2" || otherMic) && otherMic) {
    const multiMic = determineMultiMicRelationship(micModel, role, position, distance, angle, otherMic);
    return `${multiMic}. ${posReason}; ${distReason}; ${angReason}.`;
  }

  return `${targetReq}. ${posReason}; ${distReason}; ${angReason}.`;
}

/**
 * 10-Step Semantic Microphone Placement Reasoning Engine.
 * Explicitly decides Position, Distance, and Angle based on:
 * 1. Tone profile characteristics (gain, distortion, spectral balance, harshness)
 * 2. Cabinet and speaker acoustics (cone breakup, high-frequency sparkle/fizz)
 * 3. Assigned microphone role and transducer type
 * 4. Multi-microphone interaction and complementary blending
 * 5. Explains acoustic tone-design rationale while keeping software validation distinct.
 */
export function reasonSemanticMicPlacement(input: MicReasoningInput): MicPlacementDecision {
  const { micModel, micSlot, cabName = "", speakerName = "", toneProfile, otherMic, promptContext = "", existingPlacement } = input;
  const promptLower = promptContext.toLowerCase();
  const role = determineMicrophoneRole(micModel, toneProfile, micSlot);

  // --- Step 1: Analyze Target Tone Characteristics ---
  const gainLevel = (toneProfile?.gain_level || "").toLowerCase();
  const distortionType = (toneProfile?.distortion_type || "").toLowerCase();
  const isHighGain = gainLevel === "high" || gainLevel === "medium-high" || 
    distortionType === "saturated" || distortionType === "fuzz" ||
    promptLower.includes("thrash") || promptLower.includes("metal") || promptLower.includes("high gain");
  const isCleanOrLowGain = gainLevel === "clean" || gainLevel === "low" || gainLevel === "edge" ||
    distortionType === "clean" || distortionType === "edge_of_breakup";

  const hasHighFrequencyHarshnessRisk = isHighGain ||
    promptLower.includes("fizz") || promptLower.includes("harsh") || promptLower.includes("buzz") ||
    promptLower.includes("solid-state") || promptLower.includes("solid state") ||
    promptLower.includes("cowboys") || promptLower.includes("pantera") || promptLower.includes("kill 'em all") || promptLower.includes("kill em all");

  const isAmbientOrSpatial = (toneProfile?.style || []).some(s => 
    ["ambient", "shoegaze", "surf", "reverb-drenched", "roomy", "spatial"].includes(s.toLowerCase())
  ) || promptLower.includes("ambient") || promptLower.includes("shoegaze");

  // --- Step 2: Analyze Cabinet and Speaker Behaviour ---
  const cleanSpeaker = speakerName.toLowerCase();
  const isBrightSpeaker = cleanSpeaker.includes("brit 75") || cleanSpeaker.includes("t75") || 
    cleanSpeaker.includes("american 12c") || cleanSpeaker.includes("jensen") ||
    cleanSpeaker.includes("brit v1") || cleanSpeaker.includes("v30");

  // --- Step 3, 4, 5: Decide Semantic Position ---
  let position: SemanticPosition = "Cap Edge";
  if (role === "primary attack/presence mic") {
    if (isCleanOrLowGain && promptLower.includes("piercing") && !isBrightSpeaker) {
      position = "Cap";
    } else {
      position = "Cap Edge";
    }
  } else if (role === "warmth/fizz-control mic") {
    if (hasHighFrequencyHarshnessRisk && isBrightSpeaker && gainLevel === "high" && promptLower.includes("extreme fizz")) {
      position = "Cone Edge";
    } else {
      position = "Cone";
    }
  } else if (role === "body/punch mic") {
    position = "Cone";
  } else if (role === "bass low-end/fullness mic") {
    position = "Cone";
  } else if (role === "detail/polish mic" || role === "room/space mic") {
    position = isBrightSpeaker ? "Cone" : "Cap Edge";
  }

  // --- Step 6: Decide Semantic Distance ---
  let distance: SemanticDistance = "Close";
  if (role === "room/space mic" || isAmbientOrSpatial) {
    distance = promptLower.includes("far room") ? "Far" : "Medium";
  } else {
    distance = "Close";
  }

  // --- Step 7: Decide Semantic Angle ---
  let angle: SemanticAngle = "On Axis";
  if (role === "primary attack/presence mic") {
    if (hasHighFrequencyHarshnessRisk && isBrightSpeaker && gainLevel === "high" && !promptLower.includes("rhythm")) {
      angle = "45° Off Axis";
    } else {
      angle = "On Axis";
    }
  } else if (role === "warmth/fizz-control mic") {
    if (hasHighFrequencyHarshnessRisk && (isHighGain || isBrightSpeaker)) {
      angle = "45° Off Axis";
    } else {
      angle = "On Axis";
    }
  } else if (role === "body/punch mic") {
    angle = "On Axis";
  } else if (role === "bass low-end/fullness mic") {
    angle = "On Axis";
  }

  // --- Step 8: Multi-Microphone System Interaction Evaluation ---
  if (otherMic) {
    if (otherMic.role?.includes("attack") && role.includes("warmth")) {
      if (position === "Cap Edge") {
        position = "Cone";
      }
    }
  }

  // --- Step 9: Evaluate Existing Placement Provenance & Preservation ---
  let validationNote: string | undefined = undefined;
  let wasCompletedFromPartialOrOmitted = false;

  if (existingPlacement && isCompleteSemanticPlacement(existingPlacement)) {
    // Case A: Explicit complete placement was provided
    const parsed = parseSemanticPlacement(existingPlacement);
    if (parsed.position && parsed.distance && parsed.angle) {
      position = parsed.position;
      distance = parsed.distance;
      angle = parsed.angle;
      validationNote = "Explicit semantic placement was supplied and passed vocabulary validation.";
      wasCompletedFromPartialOrOmitted = false;
    }
  } else if (existingPlacement) {
    // Case B: Partial placement was provided; retain supplied values, complete remaining
    const parsed = parseSemanticPlacement(existingPlacement);
    if (parsed.position) position = parsed.position;
    if (parsed.distance) distance = parsed.distance;
    if (parsed.angle) angle = parsed.angle;
    validationNote = `Semantic placement completed from partial specification ("${existingPlacement}") by Stage 2 Placement Engine.`;
    wasCompletedFromPartialOrOmitted = true;
  } else {
    // Case C: Omitted placement; fully determined by Stage 2 reasoning
    validationNote = "Semantic placement generated by Stage 2 Semantic Placement Engine.";
    wasCompletedFromPartialOrOmitted = true;
  }

  const placementString = formatSemanticPlacement(position, distance, angle);

  // --- Step 10: Generate Full Acoustic Rationale ---
  // Exposes target tone requirement, role, position/distance/angle principles, and multi-mic blending
  const reason = buildAcousticReasoning({
    micModel,
    micSlot,
    role,
    position,
    distance,
    angle,
    toneProfile,
    promptContext,
    speakerName,
    cabName,
    otherMic
  });

  return {
    micModel,
    micSlot,
    role,
    position,
    distance,
    angle,
    placementString,
    reason,
    validationNote,
    wasCompletedFromPartialOrOmitted
  };
}

/**
 * Formats structured microphone debug explanation lines matching Stage 2 requirements.
 * Exposes Role, Placement, Acoustic Reason, and distinct Validation notes.
 */
export function formatMicrophoneDebug(decisions: MicPlacementDecision[]): string {
  if (!decisions.length) return "";

  return decisions.map(d => {
    let slotLabel = "Mic 1";
    if (d.micSlot === "Mic_0") slotLabel = "Mic 0";
    else if (d.micSlot === "Mic_1") slotLabel = "Mic 1";
    else if (d.micSlot === "Mic_2") slotLabel = "Mic 2";

    const lines = [
      `${slotLabel}: ${d.micModel}`,
      `Role: ${d.role}`,
      `Placement: ${d.position} / ${d.distance} / ${d.angle}`,
      `Reason: ${d.reason}`
    ];
    if (d.validationNote) {
      lines.push(`Validation: ${d.validationNote}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * Ensures all cabinet elements in a newly generated ToneResult explicitly provide
 * complete semantic microphone placements (Position, Distance, Angle) for all selected
 * microphones, and updates engineering_notes accordingly.
 */
export function ensureSignalChainSemanticPlacements(
  result: ToneResult,
  toneProfile?: ToneProfile,
  promptText: string = ""
): ToneResult {
  if (!result || !Array.isArray(result.signal_chain)) return result;

  const decisions: MicPlacementDecision[] = [];

  for (const el of result.signal_chain) {
    if (el.type === "cab" || (el as any).type === "cabinet") {
      const settings = el.settings || {};
      const speakerName = (settings["Speaker"] || settings["speaker"] || "") as string;
      const cabName = el.name || "";

      const detection = detectCabSettingsFormat(settings);
      const isLegacy = detection.isLegacy;

      if (isLegacy) {
        // Legacy 1-indexed schema: Mic_1 is Primary, Mic_2 is Secondary
        const mic1Name = (settings["Mic_1"] || settings["mic_1"] || settings["Mic 1"] || settings["mic 1"]) as string;
        let m1Decision: MicPlacementDecision | undefined = undefined;

        if (mic1Name) {
          const rawM1Placement = (settings["Mic_1_Placement"] || settings["mic_1_placement"] || settings["Mic 1 Placement"]) as string;
          m1Decision = reasonSemanticMicPlacement({
            micModel: mic1Name,
            micSlot: "Mic_1",
            cabName,
            speakerName,
            toneProfile,
            promptContext: promptText,
            existingPlacement: rawM1Placement
          });

          settings["Mic_1_Placement"] = m1Decision.placementString;
          decisions.push(m1Decision);
        }

        const mic2Name = (settings["Mic_2"] || settings["mic_2"] || settings["Mic 2"] || settings["mic 2"]) as string;
        if (mic2Name) {
          const rawM2Placement = (settings["Mic_2_Placement"] || settings["mic_2_placement"] || settings["Mic 2 Placement"]) as string;
          const m2Decision = reasonSemanticMicPlacement({
            micModel: mic2Name,
            micSlot: "Mic_2",
            cabName,
            speakerName,
            toneProfile,
            otherMic: m1Decision ? {
              model: m1Decision.micModel,
              role: m1Decision.role,
              position: m1Decision.position,
              distance: m1Decision.distance,
              angle: m1Decision.angle
            } : undefined,
            promptContext: promptText,
            existingPlacement: rawM2Placement
          });

          settings["Mic_2_Placement"] = m2Decision.placementString;
          decisions.push(m2Decision);
        }
      } else {
        // Canonical 0-indexed schema: Mic_0 is Primary, Mic_1 is Secondary
        const mic0Name = (settings["Mic_0"] || settings["mic_0"] || settings["Mic 0"] || settings["mic 0"]) as string;
        let m0Decision: MicPlacementDecision | undefined = undefined;

        if (mic0Name) {
          const rawM0Placement = (settings["Mic_0_Placement"] || settings["mic_0_placement"] || settings["Mic 0 Placement"]) as string;
          m0Decision = reasonSemanticMicPlacement({
            micModel: mic0Name,
            micSlot: "Mic_0",
            cabName,
            speakerName,
            toneProfile,
            promptContext: promptText,
            existingPlacement: rawM0Placement
          });

          settings["Mic_0_Placement"] = m0Decision.placementString;
          decisions.push(m0Decision);
        }

        const mic1Name = (settings["Mic_1"] || settings["mic_1"] || settings["Mic 1"] || settings["mic 1"]) as string;
        if (mic1Name) {
          const rawM1Placement = (settings["Mic_1_Placement"] || settings["mic_1_placement"] || settings["Mic 1 Placement"]) as string;
          const m1Decision = reasonSemanticMicPlacement({
            micModel: mic1Name,
            micSlot: "Mic_1",
            cabName,
            speakerName,
            toneProfile,
            otherMic: m0Decision ? {
              model: m0Decision.micModel,
              role: m0Decision.role,
              position: m0Decision.position,
              distance: m0Decision.distance,
              angle: m0Decision.angle
            } : undefined,
            promptContext: promptText,
            existingPlacement: rawM1Placement
          });

          settings["Mic_1_Placement"] = m1Decision.placementString;
          decisions.push(m1Decision);
        }
      }

      el.settings = settings;
    }
  }

  // Update engineering notes with microphone debug breakdown
  if (decisions.length > 0) {
    const formattedMicDebug = formatMicrophoneDebug(decisions);
    if (!result.engineering_notes) {
      result.engineering_notes = {
        gain_strategy: "",
        noise_control: "",
        eq_strategy: ""
      };
    }

    result.engineering_notes.microphone_debug = formattedMicDebug;

    // Also integrate into amplifier_debug under cab/mic section if amplifier_debug exists
    if (result.engineering_notes.amplifier_debug) {
      if (!result.engineering_notes.amplifier_debug.includes("Microphone Placement Details:")) {
        result.engineering_notes.amplifier_debug += `\n\nMicrophone Placement Details:\n${formattedMicDebug}`;
      }
    }
  }

  return result;
}
