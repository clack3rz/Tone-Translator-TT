// src/sound-engineer/validation/lessons/candidateLessonGateway.ts
// Phase 1C.5h WP-26: Candidate Lesson Boundary & Phase 1C.5e/f Governance Integration Engine.
// Bound to frozen specification v0.1j Section 30, Phase 1C.5f Section 14, and Implementation Plan v0.1h WP-26.

import {
  canonicalizeJson,
  IntegrityProvider,
  RecordIntegrityMetadata,
} from "../schemas/integrity";
import { DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import {
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationExecutionRecord,
  ValidationVersionBindingRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  UATEvaluationRecord,
  ValidationFailureRecord,
} from "../schemas/records";
import {
  CandidateLessonEvidencePackage,
  CandidateLessonHandoffResult,
  CandidateLessonQuarantineReceipt,
  CandidateLessonQuarantineSink,
  CandidateLessonScopeReference,
  CandidateLessonUncertaintyReference,
  FormulateCandidateLessonInput,
  InvalidCandidateLessonPackageError,
  QuarantineHandoffError,
  SupportingEvidenceKind,
  SupportingEvidenceReference,
} from "./lessonTypes";

/**
 * Options for configuring CandidateLessonHandoffGateway.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * Receives strictly quarantine sink capability.
 * ZERO active knowledge writers or database mutation services are accepted.
 */
export interface CandidateLessonGatewayOptions {
  /** The mandatory quarantine repository sink. Writes strictly to isolated quarantine. */
  readonly quarantineSink: CandidateLessonQuarantineSink;
  /** Pluggable technology-neutral integrity provider (defaults to DefaultSha256IntegrityProvider) */
  readonly integrityProvider?: IntegrityProvider;
  /** System / signer identity attached to RecordIntegrityMetadata */
  readonly signerIdentity?: string;
  /** Deterministic UUID/ID generator override for testing */
  readonly idGenerator?: () => string;
}

/**
 * Helper to deep-freeze an object for strict immutability.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

/**
 * Generates a default UUID string.
 */
function defaultGenerateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * CandidateLessonHandoffGateway
 *
 * Implements the Phase 1C.5h candidate lesson boundary engine.
 *
 * CARDINAL RULES (v0.1j Section 30.1):
 * 1. "VALIDATION EVIDENCE MAY PRODUCE A CANDIDATE LESSON ONLY WHEN THE EVIDENCE
 *     SUPPORTS A POTENTIALLY GENERALIZABLE ENGINEERING INSIGHT REQUIRING GOVERNED REVIEW."
 * 2. "STAGE 14 ENGINEERING REVIEW MAY CONTRIBUTE REVIEW EVIDENCE RELEVANT TO A
 *     CANDIDATE LESSON, BUT STAGE 14 IS NOT THE CANDIDATE LESSON QUARANTINE,
 *     KNOWLEDGE GOVERNANCE, OR PROMOTION AUTHORITY."
 * 3. "PHASE 1C.5h MAY FORMULATE CANDIDATE LESSON EVIDENCE. IT MAY NOT PROMOTE IT."
 *
 * ZERO ACTIVE KNOWLEDGE WRITE ACCESS:
 * This gateway contains zero imports of active knowledge services, zero database mutation
 * APIs, and zero promotion methods by construction.
 */
export class CandidateLessonHandoffGateway {
  private readonly quarantineSink: CandidateLessonQuarantineSink;
  private readonly integrityProvider: IntegrityProvider;
  private readonly signerIdentity: string;
  private readonly idGenerator: () => string;

  constructor(options: CandidateLessonGatewayOptions) {
    if (!options || !options.quarantineSink) {
      throw new Error(
        "CandidateLessonHandoffGateway requires a valid CandidateLessonQuarantineSink."
      );
    }
    this.quarantineSink = options.quarantineSink;
    this.integrityProvider =
      options.integrityProvider ?? new DefaultSha256IntegrityProvider();
    this.signerIdentity =
      options.signerIdentity ?? "Phase1C5h_CandidateLessonGateway";
    this.idGenerator = options.idGenerator ?? defaultGenerateUuid;
  }

  /**
   * Formulates and tamper-evidently seals a CandidateLessonEvidencePackage from validation evidence.
   *
   * Enforces the formulation gate:
   * - Proposed insight must be explicit and non-empty.
   * - At least one supporting validation evidence item is present and mapped.
   * - Bounded gear scope (bound to Record 02) is verified.
   * - Uncertainty assessment (bound to Record 16) is verified.
   * - Execution record and Phase 1C.5f run trace references are verified.
   * - Lineage references are internally consistent.
   *
   * Does NOT evaluate promotion eligibility (owned by Phase 1C.5e/f Knowledge Governance).
   */
  public formulatePackage(
    input: FormulateCandidateLessonInput
  ): CandidateLessonEvidencePackage {
    const validationErrors: string[] = [];

    // 1. Proposed insight text validation
    const insightText = input.proposedInsight?.trim();
    if (!insightText) {
      validationErrors.push("proposedInsight must be a non-empty string.");
    }

    // 2. Supporting evidence validation (at least one valid canonical source required)
    const supportingEvidenceRefs: SupportingEvidenceReference[] = [];
    if (
      !Array.isArray(input.supportingEvidence) ||
      input.supportingEvidence.length === 0
    ) {
      validationErrors.push(
        "supportingEvidence must contain at least one valid empirical validation evidence source."
      );
    } else {
      input.supportingEvidence.forEach((item, index) => {
        const resolved = this.resolveEvidenceItem(item, index, validationErrors);
        if (resolved) {
          supportingEvidenceRefs.push(resolved);
        }
      });
    }

    // 3. Scope reference validation (thin canonical reference)
    const scopeRef = this.resolveScope(input.scope, validationErrors);

    // 4. Uncertainty reference validation (thin canonical reference)
    const uncertaintyRef = this.resolveUncertainty(
      input.uncertainty,
      validationErrors
    );

    // 5. Execution and RunTrace lineage validation
    const { executionRecordRef, runTraceRef } = this.resolveExecutionAndTrace(
      input.execution,
      input.runTraceRef,
      validationErrors
    );

    // 6. Version binding lineage validation
    const versionBindingRef = this.resolveVersionBinding(
      input.versionBinding,
      input.execution,
      validationErrors
    );

    // 7. Stage 14 Engineering Review reference (observational context only)
    let stage14ReviewRef: string | undefined;
    if (input.stage14ReviewRef !== undefined) {
      const trimmed = input.stage14ReviewRef.trim();
      if (!trimmed) {
        validationErrors.push(
          "stage14ReviewRef, if provided, must be a non-empty string."
        );
      } else {
        stage14ReviewRef = trimmed;
      }
    }

    // If any formulation checks failed, fail closed
    if (validationErrors.length > 0) {
      throw new InvalidCandidateLessonPackageError(
        `Candidate Lesson formulation failed with ${validationErrors.length} validation error(s).`,
        validationErrors
      );
    }

    // Assemble unsealed package payload
    const packageId = `CLEP_${this.idGenerator()}`;
    const formulatedAt = new Date().toISOString();

    const unsealedPayload = {
      packageId,
      formulatedAt,
      proposedInsight: insightText,
      supportingEvidence: supportingEvidenceRefs,
      scopeRef: scopeRef!,
      uncertaintyRef: uncertaintyRef!,
      executionRecordRef: executionRecordRef!,
      runTraceRef: runTraceRef!,
      ...(versionBindingRef ? { versionBindingRef } : {}),
      ...(stage14ReviewRef ? { stage14ReviewRef } : {}),
    };

    // Seal package with tamper-evident integrity metadata
    const canonicalJson = canonicalizeJson(unsealedPayload);
    const integrityDigest = this.integrityProvider.computeDigest(canonicalJson);

    const integrityMetadata: RecordIntegrityMetadata = {
      integrity_digest: integrityDigest,
      algorithm: this.integrityProvider.algorithmName,
      sealed_at: formulatedAt,
      signer_identity: this.signerIdentity,
      canonical_serialization_format: "CANONICAL-JSON",
    };

    const sealedPackage: CandidateLessonEvidencePackage = deepFreeze({
      ...unsealedPayload,
      integrityMetadata,
    });

    return sealedPackage;
  }

  /**
   * Hands off a sealed CandidateLessonEvidencePackage to the inherited quarantine sink.
   *
   * Validates the factual quarantine receipt returned by the sink:
   * - Confirms receipt identifier and timestamp are present.
   * - Confirms receipt lessonPackageId matches the submitted packageId.
   * - Confirms receipt status is strictly "QUARANTINED".
   * - Confirms integrity digest matches the submitted package seal.
   */
  public async quarantinePackage(
    pkg: CandidateLessonEvidencePackage
  ): Promise<CandidateLessonHandoffResult> {
    if (!pkg || !pkg.packageId || !pkg.integrityMetadata) {
      throw new QuarantineHandoffError(
        "Cannot hand off unsealed or invalid CandidateLessonEvidencePackage."
      );
    }

    let receipt: CandidateLessonQuarantineReceipt;
    try {
      receipt = await this.quarantineSink.quarantineLesson(pkg);
    } catch (err: unknown) {
      throw new QuarantineHandoffError(
        `Quarantine sink rejected or failed during handoff for package ${pkg.packageId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err
      );
    }

    // Factual receipt validation
    this.validateQuarantineReceipt(receipt, pkg);

    return deepFreeze({
      package: pkg,
      receipt,
    });
  }

  /**
   * High-level operation: formulates, seals, and hands off a Candidate Lesson into quarantine.
   */
  public async formulateAndQuarantine(
    input: FormulateCandidateLessonInput
  ): Promise<CandidateLessonHandoffResult> {
    const pkg = this.formulatePackage(input);
    return this.quarantinePackage(pkg);
  }

  // ---------------------------------------------------------------------------
  // Internal Resolution & Validation Helpers
  // ---------------------------------------------------------------------------

  private resolveEvidenceItem(
    item: unknown,
    index: number,
    errors: string[]
  ): SupportingEvidenceReference | null {
    if (!item || typeof item !== "object") {
      errors.push(`supportingEvidence[${index}] must be an object or record.`);
      return null;
    }

    const obj = item as Record<string, unknown>;

    // Case 1: ObjectiveEvidenceRecord (Record 10)
    if (typeof obj.objective_evidence_id === "string") {
      const rec = item as ObjectiveEvidenceRecord;
      return {
        evidenceKind: "ObjectiveEvidenceRecord",
        evidenceId: rec.objective_evidence_id,
        observationSummary: `Metric category: ${rec.metric_category}, tolerance: ${rec.tolerance_evaluation}, delta: ${rec.measured_delta}, outcome: ${rec.objective_pass_fail}`,
      };
    }

    // Case 2: PerceptualEvaluationRecord (Record 11)
    if (typeof obj.perceptual_evidence_id === "string") {
      const rec = item as PerceptualEvaluationRecord;
      return {
        evidenceKind: "PerceptualEvaluationRecord",
        evidenceId: rec.perceptual_evidence_id,
        observationSummary: `Evaluator: ${rec.evaluator_role}, outcome: ${rec.evaluation_outcome}, observations: ${rec.qualitative_observations || "None"}`,
      };
    }

    // Case 3: UATEvaluationRecord (Record 12)
    if (typeof obj.uat_id === "string") {
      const rec = item as UATEvaluationRecord;
      return {
        evidenceKind: "UATEvaluationRecord",
        evidenceId: rec.uat_id,
        observationSummary: `Persona: ${rec.evaluator_persona}, task: ${rec.task_scenario_id}, completion: ${rec.task_completion_status}, musical fitness: ${rec.musical_fitness_verdict}`,
      };
    }

    // Case 4: ValidationFailureRecord (Record 14)
    if (typeof obj.failure_id === "string") {
      const rec = item as ValidationFailureRecord;
      return {
        evidenceKind: "ValidationFailureRecord",
        evidenceId: rec.failure_id,
        observationSummary: `Attribution: ${rec.attribution_class}, title: ${rec.failure_title}, materiality: ${rec.materiality}, symptom: ${rec.failure_symptom}`,
      };
    }

    // Case 5: Explicit SupportingEvidenceReference
    if (typeof obj.evidenceKind === "string" && typeof obj.evidenceId === "string") {
      const allowedKinds: SupportingEvidenceKind[] = [
        "ObjectiveEvidenceRecord",
        "PerceptualEvaluationRecord",
        "UATEvaluationRecord",
        "ValidationFailureRecord",
      ];
      const kind = obj.evidenceKind as SupportingEvidenceKind;
      if (!allowedKinds.includes(kind)) {
        errors.push(
          `supportingEvidence[${index}] has invalid evidenceKind "${obj.evidenceKind}". Must be one of: ${allowedKinds.join(
            ", "
          )}`
        );
        return null;
      }
      const trimmedId = obj.evidenceId.trim();
      if (!trimmedId) {
        errors.push(`supportingEvidence[${index}] evidenceId must not be empty.`);
        return null;
      }
      return {
        evidenceKind: kind,
        evidenceId: trimmedId,
        ...(typeof obj.observationSummary === "string"
          ? { observationSummary: obj.observationSummary }
          : {}),
      };
    }

    errors.push(
      `supportingEvidence[${index}] does not conform to ObjectiveEvidenceRecord, PerceptualEvaluationRecord, UATEvaluationRecord, ValidationFailureRecord, or SupportingEvidenceReference.`
    );
    return null;
  }

  private resolveScope(
    scopeInput: unknown,
    errors: string[]
  ): CandidateLessonScopeReference | null {
    if (!scopeInput || typeof scopeInput !== "object") {
      errors.push("scope must be provided as ValidationScopeRecord or CandidateLessonScopeReference.");
      return null;
    }

    const obj = scopeInput as Record<string, unknown>;

    // Case 1: ValidationScopeRecord (Record 02)
    if (typeof obj.scope_id === "string") {
      const rec = scopeInput as ValidationScopeRecord;
      if (!Array.isArray(rec.included_units) || rec.included_units.length === 0) {
        errors.push("ValidationScopeRecord included_units must not be empty.");
        return null;
      }
      return {
        scopeRecordRef: rec.scope_id,
        affectedUnits: [...rec.included_units],
      };
    }

    // Case 2: CandidateLessonScopeReference (thin reference)
    if (typeof obj.scopeRecordRef === "string") {
      const ref = scopeInput as CandidateLessonScopeReference;
      const trimmedScopeRef = ref.scopeRecordRef.trim();
      if (!trimmedScopeRef) {
        errors.push("scope.scopeRecordRef must not be empty.");
      }
      if (!Array.isArray(ref.affectedUnits) || ref.affectedUnits.length === 0) {
        errors.push("scope.affectedUnits must be a non-empty array of canonical unit identifiers.");
      }
      return {
        scopeRecordRef: trimmedScopeRef,
        affectedUnits: Array.isArray(ref.affectedUnits) ? [...ref.affectedUnits] : [],
      };
    }

    errors.push("scope does not match ValidationScopeRecord or CandidateLessonScopeReference contract.");
    return null;
  }

  private resolveUncertainty(
    uncertaintyInput: unknown,
    errors: string[]
  ): CandidateLessonUncertaintyReference | null {
    if (!uncertaintyInput || typeof uncertaintyInput !== "object") {
      errors.push(
        "uncertainty must be provided as ValidationUncertaintyRecord or CandidateLessonUncertaintyReference."
      );
      return null;
    }

    const obj = uncertaintyInput as Record<string, unknown>;

    // Case 1: ValidationUncertaintyRecord (Record 16)
    if (typeof obj.uncertainty_id === "string") {
      const rec = uncertaintyInput as ValidationUncertaintyRecord;
      return {
        uncertaintyRecordRef: rec.uncertainty_id,
        uncertaintySource: rec.uncertainty_source,
      };
    }

    // Case 2: CandidateLessonUncertaintyReference (thin reference)
    if (typeof obj.uncertaintyRecordRef === "string") {
      const ref = uncertaintyInput as CandidateLessonUncertaintyReference;
      const trimmedId = ref.uncertaintyRecordRef.trim();
      const trimmedSource = typeof ref.uncertaintySource === "string" ? ref.uncertaintySource.trim() : "";
      if (!trimmedId) {
        errors.push("uncertainty.uncertaintyRecordRef must not be empty.");
      }
      if (!trimmedSource) {
        errors.push("uncertainty.uncertaintySource must not be empty.");
      }
      return {
        uncertaintyRecordRef: trimmedId,
        uncertaintySource: trimmedSource,
      };
    }

    errors.push(
      "uncertainty does not match ValidationUncertaintyRecord or CandidateLessonUncertaintyReference contract."
    );
    return null;
  }

  private resolveExecutionAndTrace(
    executionInput: unknown,
    explicitRunTraceRef: string | undefined,
    errors: string[]
  ): { executionRecordRef?: string; runTraceRef?: string } {
    let executionRecordRef: string | undefined;
    let runTraceRef: string | undefined;

    if (!executionInput) {
      errors.push("execution must be provided as ValidationExecutionRecord or execution ID string.");
      return {};
    }

    if (typeof executionInput === "string") {
      const trimmed = executionInput.trim();
      if (!trimmed) {
        errors.push("execution ID must not be empty.");
      } else {
        executionRecordRef = trimmed;
      }
      if (explicitRunTraceRef) {
        const trimmedTrace = explicitRunTraceRef.trim();
        if (!trimmedTrace) {
          errors.push("runTraceRef must not be empty.");
        } else {
          runTraceRef = trimmedTrace;
        }
      } else {
        errors.push("runTraceRef is required when execution is passed as an ID string.");
      }
    } else if (typeof executionInput === "object") {
      const rec = executionInput as ValidationExecutionRecord;
      if (typeof rec.execution_id === "string" && rec.execution_id.trim()) {
        executionRecordRef = rec.execution_id.trim();
      } else {
        errors.push("ValidationExecutionRecord must contain a non-empty execution_id.");
      }

      const recTraceRef = typeof rec.trace_ref === "string" ? rec.trace_ref.trim() : undefined;
      const explicitTrace = explicitRunTraceRef?.trim();

      if (recTraceRef && explicitTrace && recTraceRef !== explicitTrace) {
        errors.push(
          `Lineage mismatch: execution.trace_ref ("${recTraceRef}") does not match explicit runTraceRef ("${explicitTrace}").`
        );
      } else {
        runTraceRef = explicitTrace || recTraceRef;
      }

      if (!runTraceRef) {
        errors.push("ValidationExecutionRecord must contain a non-empty trace_ref.");
      }
    } else {
      errors.push("execution must be a string or ValidationExecutionRecord.");
    }

    return { executionRecordRef, runTraceRef };
  }

  private resolveVersionBinding(
    bindingInput: unknown,
    executionInput: unknown,
    errors: string[]
  ): string | undefined {
    if (!bindingInput) {
      return undefined;
    }

    let resolvedBindingId: string | undefined;

    if (typeof bindingInput === "string") {
      const trimmed = bindingInput.trim();
      if (trimmed) {
        resolvedBindingId = trimmed;
      }
    } else if (typeof bindingInput === "object") {
      const rec = bindingInput as ValidationVersionBindingRecord;
      if (typeof rec.binding_id === "string" && rec.binding_id.trim()) {
        resolvedBindingId = rec.binding_id.trim();
      }
    }

    // Lineage check against execution record if available
    if (
      resolvedBindingId &&
      typeof executionInput === "object" &&
      executionInput !== null
    ) {
      const exec = executionInput as ValidationExecutionRecord;
      if (
        typeof exec.binding_id === "string" &&
        exec.binding_id.trim() &&
        exec.binding_id.trim() !== resolvedBindingId
      ) {
        errors.push(
          `Lineage mismatch: execution.binding_id ("${exec.binding_id}") does not match versionBinding ("${resolvedBindingId}").`
        );
      }
    }

    return resolvedBindingId;
  }

  private validateQuarantineReceipt(
    receipt: CandidateLessonQuarantineReceipt,
    pkg: CandidateLessonEvidencePackage
  ): void {
    if (!receipt || typeof receipt !== "object") {
      throw new QuarantineHandoffError(
        "Quarantine sink returned an invalid receipt: expected an object."
      );
    }

    if (!receipt.receiptId || typeof receipt.receiptId !== "string") {
      throw new QuarantineHandoffError(
        "Quarantine receipt missing or invalid receiptId."
      );
    }

    if (receipt.lessonPackageId !== pkg.packageId) {
      throw new QuarantineHandoffError(
        `Quarantine receipt lessonPackageId mismatch: expected "${pkg.packageId}", received "${receipt.lessonPackageId}".`
      );
    }

    // Strict status enforcement: must be "QUARANTINED"
    if (receipt.status !== "QUARANTINED") {
      throw new QuarantineHandoffError(
        `Quarantine receipt status violation: expected "QUARANTINED", received "${receipt.status}". Phase 1C.5h cannot accept external state promotions or unauthorized status mutations.`
      );
    }

    if (!receipt.quarantinedAt || typeof receipt.quarantinedAt !== "string") {
      throw new QuarantineHandoffError(
        "Quarantine receipt missing or invalid quarantinedAt timestamp."
      );
    }

    // Digest verification if present
    if (
      receipt.packageIntegrityDigest &&
      receipt.packageIntegrityDigest !== pkg.integrityMetadata.integrity_digest
    ) {
      throw new QuarantineHandoffError(
        `Quarantine receipt integrity digest mismatch: expected "${pkg.integrityMetadata.integrity_digest}", received "${receipt.packageIntegrityDigest}".`
      );
    }
  }
}
