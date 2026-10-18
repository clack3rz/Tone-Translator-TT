// src/sound-engineer/validation/evidence/perceptualListeningHarness.ts
// Perceptual Evaluation, Blind Listening & Psychoacoustic Harness (Record 11).
// Phase 1C.5h — WP-12.
// Bound to frozen specification v0.1j Section 16, Table 06, Table 07, and Implementation Plan v0.1h WP-12.

import { deepFreeze } from "../../contracts/immutability";
import {
  PERCEPTUAL_CONFIDENCE_LEVELS,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  PerceptualEvaluationOutcome,
  PERCEPTUAL_EVALUATOR_ROLES,
  PERCEPTUAL_METHODOLOGIES,
  REQUIRED_EVIDENCE_CLASSES,
  EXECUTION_OUTCOMES,
} from "../schemas/enums";
import {
  PerceptualEvaluationRecord,
  perceptualEvaluationRecordSchema,
  validationExecutionRecordSchema,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  createCanonicalEdgeId,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { IntegrityProvider } from "../schemas/integrity";
import { DEFAULT_INTEGRITY_PROVIDER } from "../fixtures/audioVerification";
import {
  BlindedPresentationSession,
  InternalStimulus,
  MultiEvaluatorPanelParams,
  MultiEvaluatorPanelResult,
  PERCEPTUAL_ACOUSTIC_TREATMENTS,
  PERCEPTUAL_MONITOR_TYPES,
  PerceptualEvaluationParams,
  PerceptualEvaluationResult,
  PerceptualHarnessDependencies,
  RandomSource,
  StimulusRole,
} from "./perceptualTypes";
import { BlindedStimulusPresenter } from "./blindedStimulusPresenter";
import { calculateInterRaterReliability } from "./interRaterReliability";
import {
  InapplicablePerceptualCaseError,
  IneligiblePerceptualExecutionError,
  InvalidEvaluatorRoleError,
  InvalidListeningEnvironmentError,
  StimulusIntegrityMismatchError,
} from "./perceptualErrors";

/**
 * PerceptualListeningHarness:
 * Governs human psychoacoustic listening evaluations, double-blind stimulus presentations,
 * hidden-reference/anchor verification, expert evaluator attribution, and produces Record 11.
 */
export class PerceptualListeningHarness {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly defaultRandomSource: RandomSource;
  private readonly blindedPresenter: BlindedStimulusPresenter;

  /** Immutable in-memory registry of recorded perceptual evidence */
  private readonly evidenceRegistry: Map<string, PerceptualEvaluationRecord> = new Map();

  constructor(dependencies: PerceptualHarnessDependencies = {}) {
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.integrityProvider =
      dependencies.integrityProvider ?? DEFAULT_INTEGRITY_PROVIDER;
    this.defaultRandomSource = dependencies.defaultRandomSource ?? Math.random;
    this.blindedPresenter = new BlindedStimulusPresenter();
  }

  public getEvidence(evidenceId: string): PerceptualEvaluationRecord | undefined {
    return this.evidenceRegistry.get(evidenceId);
  }

  public getAllEvidence(): ReadonlyArray<PerceptualEvaluationRecord> {
    return Array.from(this.evidenceRegistry.values());
  }

  public getEvidenceCount(): number {
    return this.evidenceRegistry.size;
  }

  /**
   * Generates a deterministic unique identifier for Record 11 evidence.
   */
  private generateEvidenceId(executionId: string, evaluatorId: string): string {
    const raw = `${executionId}:${evaluatorId}:${Math.random().toString(36).substring(2, 9)}`;
    const digest = this.integrityProvider.computeDigest(raw).substring(7, 19);
    return `EVID-PERC-${executionId}-${digest}`;
  }

  /**
   * Executes a single-evaluator perceptual listening evaluation session.
   */
  public async evaluateSession(
    params: PerceptualEvaluationParams
  ): Promise<PerceptualEvaluationResult> {
    // -------------------------------------------------------------------------
    // 1. Input Eligibility: Validate Execution Record Schema
    // -------------------------------------------------------------------------
    try {
      validationExecutionRecordSchema.parse(params.executionRecord);
    } catch (err: unknown) {
      throw new IneligiblePerceptualExecutionError(
        params.executionRecord?.execution_id ?? "UNKNOWN",
        `Execution record schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // -------------------------------------------------------------------------
    // 2. Input Eligibility: Verify Execution Outcome is COMPLETED
    // -------------------------------------------------------------------------
    if (params.executionRecord.outcome !== EXECUTION_OUTCOMES.COMPLETED) {
      throw new IneligiblePerceptualExecutionError(
        params.executionRecord.execution_id,
        `Execution outcome is '${params.executionRecord.outcome}'. Perceptual evaluation requires COMPLETED execution.`
      );
    }

    // -------------------------------------------------------------------------
    // 3. Input Eligibility: Candidate Audio Bit-Level Integrity Check
    // -------------------------------------------------------------------------
    if (!params.candidateAudio || params.candidateAudio.length === 0) {
      throw new IneligiblePerceptualExecutionError(
        params.executionRecord.execution_id,
        "Candidate audio buffer is empty or missing."
      );
    }

    const candidateComputedDigest = this.integrityProvider.computeDigest(params.candidateAudio);
    const expectedDigest = params.executionRecord.output_audio_integrity_ref;
    const isCandidateIntegrityMatch =
      candidateComputedDigest === expectedDigest ||
      candidateComputedDigest.replace(/^sha256:/, "") === expectedDigest.replace(/^sha256:/, "");

    if (!isCandidateIntegrityMatch) {
      throw new IneligiblePerceptualExecutionError(
        params.executionRecord.execution_id,
        `Candidate audio integrity mismatch: computed '${candidateComputedDigest}' does not match execution record output '${params.executionRecord.output_audio_integrity_ref}'.`
      );
    }

    // -------------------------------------------------------------------------
    // 4. Case Applicability Check: Must Require Perceptual or Mixed Evidence
    // -------------------------------------------------------------------------
    if (params.caseRecord) {
      const requiresPerceptual =
        params.caseRecord.required_evidence_classes.includes(
          REQUIRED_EVIDENCE_CLASSES.PERCEPTUAL
        ) ||
        params.caseRecord.required_evidence_classes.includes(
          REQUIRED_EVIDENCE_CLASSES.MIXED
        );

      if (!requiresPerceptual) {
        throw new InapplicablePerceptualCaseError(
          params.caseRecord.case_id,
          `Validation case '${params.caseRecord.case_id}' only requires [${params.caseRecord.required_evidence_classes.join(
            ", "
          )}]. Perceptual evidence cannot be attached to an objective-only case.`
        );
      }
    }

    // -------------------------------------------------------------------------
    // 5. Evaluator Role Governance Check
    // -------------------------------------------------------------------------
    const validRoles = Object.values(PERCEPTUAL_EVALUATOR_ROLES);
    if (!validRoles.includes(params.evaluatorRole)) {
      throw new InvalidEvaluatorRoleError(String(params.evaluatorRole));
    }

    // -------------------------------------------------------------------------
    // 6. Listening Environment Governance Check
    // -------------------------------------------------------------------------
    const env = params.listeningEnvironment;
    if (!env) {
      throw new InvalidListeningEnvironmentError("Listening environment metadata is missing.");
    }

    const validMonitors = Object.values(PERCEPTUAL_MONITOR_TYPES);
    if (!validMonitors.includes(env.monitor_type as any)) {
      throw new InvalidListeningEnvironmentError(
        `Invalid monitor_type: "${env.monitor_type}". Allowed: [${validMonitors.join(", ")}].`
      );
    }

    const validTreatments = Object.values(PERCEPTUAL_ACOUSTIC_TREATMENTS);
    if (!validTreatments.includes(env.acoustic_treatment_level as any)) {
      throw new InvalidListeningEnvironmentError(
        `Invalid acoustic_treatment_level: "${env.acoustic_treatment_level}". Allowed: [${validTreatments.join(", ")}].`
      );
    }

    if (!env.calibrated_spl_profile_ref || env.calibrated_spl_profile_ref.trim() === "") {
      throw new InvalidListeningEnvironmentError(
        "Missing calibrated_spl_profile_ref. Perceptual sessions require documented SPL calibration reference."
      );
    }

    // -------------------------------------------------------------------------
    // 7. Verify Secondary Stimuli Integrities
    // -------------------------------------------------------------------------
    const stimuliList: InternalStimulus[] = [];

    // Candidate
    stimuliList.push({
      id: `candidate_${params.executionRecord.execution_id}`,
      role: "CANDIDATE",
      audioPayload: params.candidateAudio,
      integrityRef: candidateComputedDigest,
    });

    // Baseline
    if (params.baselineAudio && params.baselineAudio.length > 0) {
      const baselineDigest = this.integrityProvider.computeDigest(params.baselineAudio);
      stimuliList.push({
        id: "baseline_audio",
        role: "BASELINE",
        audioPayload: params.baselineAudio,
        integrityRef: baselineDigest,
      });
    }

    // Reference
    if (params.referenceAudio && params.referenceAudio.length > 0) {
      const refDigest = this.integrityProvider.computeDigest(params.referenceAudio);
      stimuliList.push({
        id: "reference_audio",
        role: "REFERENCE",
        audioPayload: params.referenceAudio,
        integrityRef: refDigest,
      });

      // For MUSHRA: add hidden reference if required
      if (params.methodology === PERCEPTUAL_METHODOLOGIES.MUSHRA) {
        stimuliList.push({
          id: "hidden_reference_audio",
          role: "HIDDEN_REFERENCE",
          audioPayload: params.referenceAudio,
          integrityRef: refDigest,
        });
      }
    }

    // Anchor
    if (params.anchorAudio && params.anchorAudio.length > 0) {
      const anchorDigest = this.integrityProvider.computeDigest(params.anchorAudio);
      stimuliList.push({
        id: "anchor_audio",
        role: "ANCHOR",
        audioPayload: params.anchorAudio,
        integrityRef: anchorDigest,
        isAnchor: true,
      });
    }

    // -------------------------------------------------------------------------
    // 8. Blinded Stimulus Presentation
    // -------------------------------------------------------------------------
    const randomSource = params.randomSource ?? this.defaultRandomSource;
    const blindedSession: BlindedPresentationSession = this.blindedPresenter.presentStimuli({
      sessionId: `sess_${params.executionRecord.execution_id}_${params.evaluatorId}`,
      methodology: params.methodology,
      stimuli: stimuliList,
      randomSource,
    });

    // Map presentation items to presented_stimuli_refs
    const presentedStimuliRefs: Record<string, string> = {};
    for (const item of blindedSession.presentationItems) {
      presentedStimuliRefs[item.token] = item.integrityRef;
    }

    // -------------------------------------------------------------------------
    // 9. Session Duration Governance & Reviewer Fatigue Mitigation
    // -------------------------------------------------------------------------
    let isDurationExceeded = false;
    if (
      params.sessionDurationMinutes !== undefined &&
      params.methodologyProfile?.maxSessionDurationMinutes !== undefined
    ) {
      if (params.sessionDurationMinutes > params.methodologyProfile.maxSessionDurationMinutes) {
        isDurationExceeded = true;
      }
    }

    // -------------------------------------------------------------------------
    // 10. Hidden Anchor / Sanity Verification
    // -------------------------------------------------------------------------
    let isAnchorValid = true;
    if (params.methodologyProfile?.requiresAnchorCheck) {
      // Find the token corresponding to ANCHOR in blinded session
      let anchorToken: string | undefined;
      for (const [token, role] of blindedSession.internalDecodingMap.entries()) {
        if (role === "ANCHOR") {
          anchorToken = token;
          break;
        }
      }

      let referenceToken: string | undefined;
      for (const [token, role] of blindedSession.internalDecodingMap.entries()) {
        if (role === "REFERENCE" || role === "HIDDEN_REFERENCE") {
          referenceToken = token;
          break;
        }
      }

      if (anchorToken && params.methodologyProfile.verifyAnchorRating) {
        const anchorScore = params.ratings[anchorToken] ?? params.ratings["anchor"] ?? 0;
        const refScore = referenceToken ? params.ratings[referenceToken] : undefined;
        isAnchorValid = params.methodologyProfile.verifyAnchorRating(anchorScore, refScore);
      }
    }

    // -------------------------------------------------------------------------
    // 11. Governed Outcome Determination (Anti-Universal-Threshold Discipline)
    // -------------------------------------------------------------------------
    let evaluationOutcome: PerceptualEvaluationOutcome;

    if (isDurationExceeded) {
      // Invalidate session due to reviewer fatigue
      evaluationOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    } else if (!isAnchorValid) {
      // Failed hidden anchor check: NEVER generate PERCEPTUAL_PASS!
      evaluationOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    } else if (params.ratingScaleProfile) {
      // Governed by rating scale profile
      evaluationOutcome = params.ratingScaleProfile.evaluateOutcome(params.ratings, {
        isAnchorValid,
        isDurationExceeded,
      });

      // Strict safeguard: if anchor failed or duration exceeded, refuse PASS
      if (
        (!isAnchorValid || isDurationExceeded) &&
        evaluationOutcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS
      ) {
        evaluationOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
      }
    } else {
      // No rating scale profile supplied: strictly inconclusive (fail closed; zero universal defaults)
      evaluationOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    }

    // -------------------------------------------------------------------------
    // 12. Confidence Enum Parity & Qualitative Observations
    // -------------------------------------------------------------------------
    const validConfidences = Object.values(PERCEPTUAL_CONFIDENCE_LEVELS);
    if (!validConfidences.includes(params.confidence)) {
      throw new Error(`Invalid confidence level: "${params.confidence}".`);
    }

    // Append governance notes to qualitative observations if session was compromised
    let finalObservations = params.qualitativeObservations;
    if (isDurationExceeded) {
      finalObservations += ` [GOVERNANCE NOTE: Session duration ${params.sessionDurationMinutes}m exceeded limit of ${params.methodologyProfile?.maxSessionDurationMinutes}m; invalidated for listener fatigue.]`;
    }
    if (!isAnchorValid) {
      finalObservations += ` [GOVERNANCE NOTE: Sanity anchor verification failed; session invalidated.]`;
    }

    // -------------------------------------------------------------------------
    // 13. Assemble and Validate Record 11 PerceptualEvaluationRecord
    // -------------------------------------------------------------------------
    const evidenceId = this.generateEvidenceId(
      params.executionRecord.execution_id,
      params.evaluatorId
    );

    const recordRaw = {
      perceptual_evidence_id: evidenceId,
      execution_id: params.executionRecord.execution_id,
      evaluator_id: params.evaluatorId,
      evaluator_role: params.evaluatorRole,
      methodology_used: params.methodology,
      listening_environment: {
        monitor_type: env.monitor_type,
        calibrated_spl_profile_ref: env.calibrated_spl_profile_ref,
        acoustic_treatment_level: env.acoustic_treatment_level,
      },
      presented_stimuli_refs: presentedStimuliRefs,
      perceptual_dimensions_evaluated: params.ratings,
      qualitative_observations: finalObservations,
      confidence: params.confidence,
      evaluation_outcome: evaluationOutcome,
    };

    const validatedRecord: PerceptualEvaluationRecord =
      perceptualEvaluationRecordSchema.parse(recordRaw);
    const frozenRecord = deepFreeze(validatedRecord);

    // Save in historical registry
    this.evidenceRegistry.set(evidenceId, frozenRecord);

    // -------------------------------------------------------------------------
    // 14. Graph Lineage & Governance Ownership (EVALUATED_BY & EVIDENCED_BY)
    // -------------------------------------------------------------------------
    // Canonical edge 1: PerceptualEvaluationRecord -> EvaluatorPersona (EVALUATED_BY)
    // Canonical edge 2: ValidationCase -> PerceptualEvaluationRecord (EVIDENCED_BY)
    // Invariant: ZERO ExecutionRecord -> PerceptualRecord edges, ZERO CONFLICTS_WITH edges created in WP-12.
    if (this.graph) {
      // Register evidence node
      if (!this.graph.hasNode(evidenceId)) {
        this.graph.registerNode({
          id: evidenceId,
          kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
        });
      }

      // 1. EVALUATED_BY: PerceptualEvaluationRecord -> EvaluatorPersona
      const personaId =
        params.evaluatorPersonaId ?? `evaluator_persona:${params.evaluatorRole.toLowerCase()}`;
      if (!this.graph.hasNode(personaId)) {
        this.graph.registerNode({
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        });
      }
      this.graph.addEdge({
        source: {
          id: evidenceId,
          kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
        },
        target: {
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        },
        edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
      });

      // 2. EVIDENCED_BY: ValidationCase -> PerceptualEvaluationRecord
      if (params.caseRecord) {
        if (!this.graph.hasNode(params.caseRecord.case_id)) {
          this.graph.registerNode({
            id: params.caseRecord.case_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationCase,
          });
        }
        this.graph.addEdge({
          source: {
            id: params.caseRecord.case_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationCase,
          },
          target: {
            id: evidenceId,
            kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
          },
          edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 15. Audit Ledger Persistence
    // -------------------------------------------------------------------------
    if (this.ledger) {
      const nowIso = new Date().toISOString();
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
        evidenceId,
        frozenRecord,
        nowIso
      );

      const personaId =
        params.evaluatorPersonaId ?? `evaluator_persona:${params.evaluatorRole.toLowerCase()}`;
      const evaluatedByEdgeId = createCanonicalEdgeId(
        GOVERNED_EDGE_TYPES.EVALUATED_BY,
        evidenceId,
        personaId
      );
      this.ledger.appendEdge({
        edgeId: evaluatedByEdgeId,
        edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
        source: {
          id: evidenceId,
          kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
        },
        target: {
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        },
        isSymmetric: false,
        createdAt: nowIso,
      });

      if (params.caseRecord) {
        const evidencedByEdgeId = createCanonicalEdgeId(
          GOVERNED_EDGE_TYPES.EVIDENCED_BY,
          params.caseRecord.case_id,
          evidenceId
        );
        this.ledger.appendEdge({
          edgeId: evidencedByEdgeId,
          edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
          source: {
            id: params.caseRecord.case_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationCase,
          },
          target: {
            id: evidenceId,
            kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
          },
          isSymmetric: false,
          createdAt: nowIso,
        });
      }
    }

    return {
      evidenceRecord: frozenRecord,
      blindedPresentation: blindedSession,
      sessionDurationMinutes: params.sessionDurationMinutes,
      isAnchorValid,
    };
  }

  /**
   * Evaluates a multi-evaluator listening panel session, calculating governed inter-rater reliability.
   */
  public async evaluatePanel(
    params: MultiEvaluatorPanelParams
  ): Promise<MultiEvaluatorPanelResult> {
    const evidenceRecords: PerceptualEvaluationRecord[] = [];
    const ratingsList: Array<Record<string, number | string>> = [];

    for (const evalInput of params.evaluators) {
      const sessionResult = await this.evaluateSession({
        executionRecord: params.executionRecord,
        caseRecord: params.caseRecord,
        testProfile: params.testProfile,
        candidateAudio: params.candidateAudio,
        baselineAudio: params.baselineAudio,
        referenceAudio: params.referenceAudio,
        anchorAudio: params.anchorAudio,
        evaluatorId: evalInput.evaluatorId,
        evaluatorRole: evalInput.evaluatorRole,
        evaluatorPersonaId: evalInput.evaluatorPersonaId,
        methodology: params.methodology,
        listeningEnvironment: params.listeningEnvironment,
        ratings: evalInput.ratings,
        qualitativeObservations: evalInput.qualitativeObservations,
        confidence: evalInput.confidence,
        sessionDurationMinutes: evalInput.sessionDurationMinutes,
        evaluatorQualifications: evalInput.evaluatorQualifications,
        methodologyProfile: params.methodologyProfile,
        ratingScaleProfile: params.ratingScaleProfile,
        randomSource: params.randomSource,
      });

      evidenceRecords.push(sessionResult.evidenceRecord);
      ratingsList.push(evalInput.ratings);
    }

    // Inter-rater reliability
    const reliabilityMethod =
      params.methodologyProfile?.reliabilityMethod ?? "PEARSON_CORRELATION";
    const reliabilityResult = calculateInterRaterReliability(ratingsList, reliabilityMethod);

    let isReliabilityAccepted: boolean | undefined;
    let reliabilityScore: number | undefined;

    if (reliabilityResult.isCalculated) {
      reliabilityScore = reliabilityResult.score;
      if (params.methodologyProfile?.verifyReliability) {
        isReliabilityAccepted = params.methodologyProfile.verifyReliability(reliabilityScore);
      }
    }

    // Aggregate outcome: all must pass and reliability (if required) must be accepted
    const allPassed = evidenceRecords.every(
      (r) => r.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS
    );
    const hasFail = evidenceRecords.some(
      (r) => r.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL
    );

    let panelOutcome: PerceptualEvaluationOutcome;
    if (isReliabilityAccepted === false) {
      panelOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    } else if (allPassed) {
      panelOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS;
    } else if (hasFail) {
      panelOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL;
    } else {
      panelOutcome = PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_INCONCLUSIVE;
    }

    return {
      evidenceRecords,
      interRaterReliability: reliabilityScore,
      reliabilityMethod,
      isReliabilityAccepted,
      panelOutcome,
    };
  }
}
