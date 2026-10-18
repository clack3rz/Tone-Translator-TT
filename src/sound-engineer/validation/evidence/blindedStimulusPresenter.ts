// src/sound-engineer/validation/evidence/blindedStimulusPresenter.ts
// Blinded stimulus presentation engine for Phase 1C.5h WP-12:
// Governed double-blind stimulus presentation, opaque tokenization, and anti-leakage guards.
// Bound to frozen specification v0.1j Section 16.2 and Implementation Plan v0.1h WP-12.

import { PERCEPTUAL_METHODOLOGIES, PerceptualMethodology } from "../schemas/enums";
import {
  BlindedPresentationSession,
  BlindedStimulusPresentationItem,
  InternalStimulus,
  RandomSource,
  StimulusRole,
} from "./perceptualTypes";
import { BlindedStimulusLeakError } from "./perceptualErrors";

export interface PresentStimuliOptions {
  readonly sessionId: string;
  readonly methodology: PerceptualMethodology;
  readonly stimuli: ReadonlyArray<InternalStimulus>;
  readonly randomSource?: RandomSource;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm and an injected random source.
 */
function shuffleArray<T>(array: T[], randomSource: RandomSource): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Checks whether a methodology requires strict blinding of candidate and baseline/anchor identities.
 */
export function methodologyRequiresBlinding(methodology: PerceptualMethodology): boolean {
  switch (methodology) {
    case PERCEPTUAL_METHODOLOGIES.BLIND_AB_TESTING:
    case PERCEPTUAL_METHODOLOGIES.ABX_TESTING:
    case PERCEPTUAL_METHODOLOGIES.MUSHRA:
    case PERCEPTUAL_METHODOLOGIES.PAIRED_COMPARISON:
    case PERCEPTUAL_METHODOLOGIES.DEFECT_DETECTION_PANEL:
      return true;
    case PERCEPTUAL_METHODOLOGIES.SIGHTED_EXPERT_REVIEW:
    case PERCEPTUAL_METHODOLOGIES.AB_TESTING:
    case PERCEPTUAL_METHODOLOGIES.REFERENCE_MATCHING:
    case PERCEPTUAL_METHODOLOGIES.MUSICAL_CONTEXT:
    case PERCEPTUAL_METHODOLOGIES.INTERACTIVE_PLAYABILITY:
    case PERCEPTUAL_METHODOLOGIES.EXTENDED_LISTENING_FATIGUE:
    default:
      return false;
  }
}

/**
 * BlindedStimulusPresenter:
 * Presents audio stimuli under strict single- or double-blind protocols.
 * Guarantees zero leakage of candidate/baseline identities, filenames, or internal paths.
 */
export class BlindedStimulusPresenter {
  /**
   * Prepares and blinds stimuli for a perceptual listening evaluation session.
   */
  public presentStimuli(options: PresentStimuliOptions): BlindedPresentationSession {
    const { sessionId, methodology, stimuli, randomSource = Math.random } = options;
    const isBlinded = methodologyRequiresBlinding(methodology);

    const decodingMap = new Map<string, StimulusRole>();
    const presentationItems: BlindedStimulusPresentationItem[] = [];

    if (methodology === PERCEPTUAL_METHODOLOGIES.ABX_TESTING) {
      // Special handling for ABX:
      // Known Reference A, Known Alternative B, Unknown Probe X
      const candidateStim = stimuli.find((s) => s.role === "CANDIDATE");
      const baselineStim = stimuli.find((s) => s.role === "BASELINE" || s.role === "REFERENCE");

      if (!candidateStim || !baselineStim) {
        throw new Error("ABX testing requires both Candidate and Baseline/Reference stimuli.");
      }

      // Randomize whether A is candidate and B is baseline, or vice versa
      const assignCandidateToA = randomSource() >= 0.5;
      const stimA = assignCandidateToA ? candidateStim : baselineStim;
      const stimB = assignCandidateToA ? baselineStim : candidateStim;

      // Randomize whether X matches A or B
      const probeMatchesA = randomSource() >= 0.5;
      const probeStim = probeMatchesA ? stimA : stimB;

      presentationItems.push({
        token: "Stimulus_A",
        audioPayload: stimA.audioPayload,
        integrityRef: stimA.integrityRef,
      });
      decodingMap.set("Stimulus_A", stimA.role);

      presentationItems.push({
        token: "Stimulus_B",
        audioPayload: stimB.audioPayload,
        integrityRef: stimB.integrityRef,
      });
      decodingMap.set("Stimulus_B", stimB.role);

      presentationItems.push({
        token: "Stimulus_X",
        audioPayload: probeStim.audioPayload,
        integrityRef: probeStim.integrityRef,
      });
      decodingMap.set("Stimulus_X", probeStim.role);
    } else if (isBlinded) {
      // Shuffle stimuli order using injected random source
      const shuffled = shuffleArray([...stimuli], randomSource);

      // Assign opaque lettered tokens (Stimulus_A, Stimulus_B, ...)
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      shuffled.forEach((stim, index) => {
        const tokenLabel = `Stimulus_${letters[index % letters.length]}`;
        presentationItems.push({
          token: tokenLabel,
          audioPayload: stim.audioPayload,
          integrityRef: stim.integrityRef,
        });
        decodingMap.set(tokenLabel, stim.role);
      });
    } else {
      // Unblinded / Sighted methodology
      stimuli.forEach((stim, index) => {
        const tokenLabel = `Audition_${index + 1}_${stim.role}`;
        presentationItems.push({
          token: tokenLabel,
          audioPayload: stim.audioPayload,
          integrityRef: stim.integrityRef,
        });
        decodingMap.set(tokenLabel, stim.role);
      });
    }

    // Anti-Leakage Verification:
    // Ensure no evaluator-facing token or metadata leaks source identity
    if (isBlinded) {
      const forbiddenTokens = ["candidate", "baseline", "path-prod", "path-shadow", "hidden_ref"];
      for (const item of presentationItems) {
        const lower = item.token.toLowerCase();
        for (const forbidden of forbiddenTokens) {
          if (lower.includes(forbidden)) {
            throw new BlindedStimulusLeakError(forbidden, `Evaluator token: ${item.token}`);
          }
        }
      }
    }

    return {
      sessionId,
      methodology,
      presentationItems,
      internalDecodingMap: decodingMap,
    };
  }
}
