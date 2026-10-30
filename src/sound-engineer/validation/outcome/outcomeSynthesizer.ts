// src/sound-engineer/validation/outcome/outcomeSynthesizer.ts
// Phase 1C.5h WP-19: Governed Validation Outcome Synthesis & Decision Engine (Record 17).
// Bound to frozen specification v0.1j Section 23, Table 11, Table 13, and Implementation Plan v0.1h WP-19.
// Cardinal Boundary: A ValidationOutcomeRecord is a validation verdict. It is NOT Gate-8 authorization.

import { deepFreeze } from "../../contracts/immutability";
import {
  CONFLICT_RESOLUTION_STATUSES,
  GOVERNANCE_EFFECTS,
  OBJECTIVE_PASS_FAIL_STATUSES,
  PERCEPTUAL_EVALUATION_OUTCOMES,
  REGRESSION_CLASSIFICATIONS,
  TASK_COMPLETION_STATUSES,
  TOLERANCE_EVALUATIONS,
  UNCERTAINTY_GATE_8_IMPACTS,
  VALIDATION_OUTCOME_CLASSES,
  ValidationOutcomeClass,
} from "../schemas/enums";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import {
  DefaultSha256IntegrityProvider,
} from "../storage/ledgerTypes";
import {
  IntegrityProvider,
} from "../schemas/integrity";
import {
  validationOutcomeRecordSchema,
  EvidenceConflictRecord,
  ValidationOutcomeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  ApplicabilityResolutionError,
  ImmutableRecordMutationError,
  IncompleteCoverageError,
  InvalidOutcomeLinkingError,
  InvalidOutcomeRecordError,
} from "./outcomeErrors";
import { OutcomeContextValidator } from "./outcomeContextValidator";
import { OutcomeApplicabilityEvaluator } from "./outcomeApplicability";
import {
  GOVERNED_HARD_BLOCKERS,
  ObjectiveSummaryData,
  OutcomeSynthesisResult,
  PerceptualSummaryData,
  RegressionSummaryData,
  SynthesizeOutcomeInput,
  UATSummaryData,
} from "./outcomeTypes";
import {
  UncertaintyThresholdResolver,
} from "./uncertaintyThresholdResolver";

/**
 * ValidationOutcomeSynthesizer
 * Governed synthesis engine that aggregates all evidence, regressions, conflicts,
 * and uncertainties into exactly one immutable ValidationOutcomeRecord (Record 17).
 */
export class ValidationOutcomeSynthesizer {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly applicabilityEvaluator: OutcomeApplicabilityEvaluator;
  private readonly thresholdResolver: UncertaintyThresholdResolver;
  private readonly integrityProvider: IntegrityProvider;

  constructor(options?: {
    graph?: ValidationRelationshipGraph;
    ledger?: ValidationAuditLedger;
    applicabilityEvaluator?: OutcomeApplicabilityEvaluator;
    thresholdResolver?: UncertaintyThresholdResolver;
    integrityProvider?: IntegrityProvider;
  }) {
    this.graph = options?.graph;
    this.ledger = options?.ledger;
    this.applicabilityEvaluator =
      options?.applicabilityEvaluator ?? new OutcomeApplicabilityEvaluator();
    this.thresholdResolver =
      options?.thresholdResolver ?? new UncertaintyThresholdResolver();
    this.integrityProvider =
      options?.integrityProvider ?? new DefaultSha256IntegrityProvider();
  }

  /**
   * Primary entry point: Synthesizes governed validation evidence into exactly one ValidationOutcomeRecord.
   */
  public synthesizeOutcome(input: SynthesizeOutcomeInput): OutcomeSynthesisResult {
    // -------------------------------------------------------------------------
    // Step 1: Context Coherence, Scope Containment, and Foreign Evidence Validation
    // -------------------------------------------------------------------------
    OutcomeContextValidator.validate(input);

    const packageId = input.packageRecord.package_id;
    const scopeId = input.scopeRecord.scope_id;
    const versionBindingId = input.versionBindingRecord.binding_id;
    const activeBlockers: string[] = [];
    const openFailures: string[] = [];
    const openUnresolvedIssues: string[] = [];
    const conditionsImposed: string[] = [];

    // Ingest any pre-declared hard blockers from input
    if (input.hardBlockersPresent) {
      for (const b of input.hardBlockersPresent) {
        activeBlockers.push(b);
      }
    }

    // -------------------------------------------------------------------------
    // Step 2: Test Profile Applicability Resolution & Complete Accounting (WP-07)
    // -------------------------------------------------------------------------
    const applicabilityAssessment = this.applicabilityEvaluator.evaluate(input);

    if (!applicabilityAssessment.isResolved) {
      activeBlockers.push(
        `Applicability resolution failure: ${applicabilityAssessment.unresolvedReason ?? "unresolved component class"}`
      );
    } else if (!applicabilityAssessment.hasCompleteCoverage) {
      activeBlockers.push(
        `Complete accounting failure: Missing execution/evidence for applicable profiles: ${applicabilityAssessment.missingApplicableProfileIds.join(", ")}`
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Check Upstream Prerequisites and Environmental Integrity
    // -------------------------------------------------------------------------
    if (input.intakeAccepted === false) {
      activeBlockers.push("Validation intake rejected or unverified.");
    }

    if (input.provenanceVerified === false) {
      activeBlockers.push(
        `${GOVERNED_HARD_BLOCKERS.BLOCK_04_PROVENANCE}: 1C.5f provenance seal missing or unverifiable.`
      );
    }

    if (input.fixturesVerified === false) {
      activeBlockers.push(
        `${GOVERNED_HARD_BLOCKERS.BLOCK_07_CONTAMINATION}: Fixtures missing, contaminated, or uncalibrated.`
      );
    }

    // Check failure records for validation environment or fixture attribution
    if (input.failureRecords) {
      for (const fail of input.failureRecords) {
        if (
          fail.attribution_class === "VALIDATION_ENVIRONMENT" ||
          fail.attribution_class === "TEST_FIXTURE"
        ) {
          activeBlockers.push(
            `Environmental execution blocker [${fail.failure_id}]: ${fail.failure_title} (${fail.attribution_class})`
          );
        } else if (
          fail.materiality === "CRITICAL_BLOCKER" ||
          fail.gate_8_blocked === true
        ) {
          openFailures.push(
            `Material validation failure [${fail.failure_id}]: ${fail.failure_title} (${fail.attribution_class})`
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 4: Summarize Evidence Streams
    // -------------------------------------------------------------------------
    const objectiveSummary = this.buildObjectiveSummary(
      input.objectiveEvidence ?? [],
      input.conflictRecords,
      packageId
    );
    const perceptualSummary = this.buildPerceptualSummary(input.perceptualEvidence ?? []);
    const uatSummary = this.buildUATSummary(input.uatEvidence ?? []);
    const regressionSummary = this.buildRegressionSummary(input.regressionAssessments ?? []);

    // -------------------------------------------------------------------------
    // Step 5: Check Target-Platform Export and Rollback Operationality
    // -------------------------------------------------------------------------
    if (input.targetPlatformExportVerified === false) {
      openFailures.push(
        `${GOVERNED_HARD_BLOCKERS.BLOCK_02_EXPORT_CRASH}: Target-platform export verification failed.`
      );
    }

    if (input.rollbackOperationalityVerified === false) {
      openFailures.push(
        `${GOVERNED_HARD_BLOCKERS.BLOCK_03_ROLLBACK_FAIL}: Operational rollback verification failed.`
      );
    }

    // -------------------------------------------------------------------------
    // Step 6: Evaluate Evidence Failures
    // -------------------------------------------------------------------------
    const unresolvedObjectiveCount =
      objectiveSummary.unresolved_failed_count ?? objectiveSummary.failed_count;
    if (unresolvedObjectiveCount > 0) {
      openFailures.push(
        `Objective acoustic criteria failed: ${unresolvedObjectiveCount} measurement(s) out of tolerance.`
      );
    }

    if (perceptualSummary.fail_count > 0) {
      openFailures.push(
        `Perceptual evaluation failed: ${perceptualSummary.fail_count} listening assessments rejected candidate.`
      );
    }

    if (uatSummary.failed_count > 0) {
      openFailures.push(
        `UAT workflow failure: ${uatSummary.failed_count} tasks failed execution.`
      );
    }

    if (uatSummary.fitness_rejected_count > 0) {
      openFailures.push(
        `UAT musical fitness rejected: ${uatSummary.fitness_rejected_count} persona evaluations rejected musical fitness.`
      );
    }

    // -------------------------------------------------------------------------
    // Step 7: Evaluate Regressions (WP-15)
    // -------------------------------------------------------------------------
    if (regressionSummary.material_genuine_regression_count > 0) {
      openFailures.push(
        `${GOVERNED_HARD_BLOCKERS.BLOCK_01_REGRESSION}: ${regressionSummary.material_genuine_regression_count} unresolved material genuine regression(s) detected in evaluated scope.`
      );
    }

    // Explicit UNRESOLVED divergence evaluation (distinct from GENUINE_REGRESSION)
    if (input.regressionAssessments) {
      for (const reg of input.regressionAssessments) {
        if (reg.classification === REGRESSION_CLASSIFICATIONS.UNRESOLVED) {
          if (reg.blocks_gate_8 === true) {
            activeBlockers.push(
              `Unresolved divergence [${reg.regression_id}]: Material divergence requires resolution before Gate 8 adjudication.`
            );
          }
          openUnresolvedIssues.push(
            `Unresolved divergence [${reg.regression_id}]: ${reg.detailed_justification || "Material divergence under review"}`
          );
        }
      }
    }

    if (regressionSummary.unresolved_count > 0 && !input.regressionAssessments) {
      openUnresolvedIssues.push(
        `${regressionSummary.unresolved_count} unresolved divergence(s) under review.`
      );
    }

    // -------------------------------------------------------------------------
    // Step 8: Evaluate Conflicts (WP-17)
    // -------------------------------------------------------------------------
    if (input.conflictRecords) {
      for (const conflict of input.conflictRecords) {
        if (conflict.resolution_status === CONFLICT_RESOLUTION_STATUSES.UNRESOLVED) {
          openUnresolvedIssues.push(
            `Unresolved evidence conflict [${conflict.conflict_id}]: ${conflict.conflict_description}`
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 9: Evaluate Uncertainty (WP-18 & uncertainty_threshold_profile_ref)
    // -------------------------------------------------------------------------
    let hasAllowsConditionalUncertainty = false;

    if (input.uncertaintyRecords && input.uncertaintyRecords.length > 0) {
      // If a threshold profile is specified, evaluate through governed resolver
      if (input.uncertaintyThresholdProfileRef) {
        const thresholdProfile = this.thresholdResolver.resolveProfile(
          input.uncertaintyThresholdProfileRef
        );
        const thresholdEval = thresholdProfile.evaluateThreshold(input.uncertaintyRecords);

        if (!thresholdEval.withinPassThreshold && !thresholdEval.withinConditionalThreshold) {
          activeBlockers.push(
            `Uncertainty threshold breach [${thresholdProfile.profileRef}]: ${thresholdEval.violations.join("; ")}`
          );
        } else if (!thresholdEval.withinPassThreshold && thresholdEval.withinConditionalThreshold) {
          hasAllowsConditionalUncertainty = true;
          for (const v of thresholdEval.violations) {
            conditionsImposed.push(`Uncertainty condition: ${v}`);
          }
        }
      }

      // Check raw records for FORCES_BLOCK and ALLOWS_CONDITIONAL
      for (const u of input.uncertaintyRecords) {
        if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.FORCES_BLOCK) {
          activeBlockers.push(
            `${GOVERNED_HARD_BLOCKERS.BLOCK_08_UNCERTAINTY} [${u.uncertainty_id}]: ${u.potential_production_risk}`
          );
          openUnresolvedIssues.push(
            `Critical uncertainty [${u.uncertainty_id}]: ${u.potential_production_risk}`
          );
        } else if (u.gate_8_impact === UNCERTAINTY_GATE_8_IMPACTS.ALLOWS_CONDITIONAL) {
          hasAllowsConditionalUncertainty = true;
          openUnresolvedIssues.push(
            `Conditional uncertainty [${u.uncertainty_id}]: ${u.potential_production_risk}`
          );
          for (const mon of u.required_monitoring_if_authorized) {
            if (!conditionsImposed.includes(mon)) {
              conditionsImposed.push(mon);
            }
          }
        }
      }
    }

    // Collect any UAT friction notes or custom conditions for conditional handling
    if (uatSummary.completed_with_friction_count > 0 || uatSummary.fitness_conditionally_accepted_count > 0) {
      conditionsImposed.push("UAT friction observed: mandatory workflow monitoring required.");
    }
    if (objectiveSummary.borderline_count > 0) {
      conditionsImposed.push(
        `Borderline tolerances observed (${objectiveSummary.borderline_count} metric(s)): production spectral telemetry required.`
      );
    }
    if (input.customConditions) {
      for (const c of input.customConditions) {
        if (!conditionsImposed.includes(c)) {
          conditionsImposed.push(c);
        }
      }
    }

    // Add failures to unresolved issues
    for (const f of openFailures) {
      openUnresolvedIssues.push(f);
    }
    for (const b of activeBlockers) {
      if (!openUnresolvedIssues.includes(b)) {
        openUnresolvedIssues.push(b);
      }
    }

    // -------------------------------------------------------------------------
    // Step 10: Determine Governed Outcome Class (Semantic Precedence)
    // -------------------------------------------------------------------------
    let outcomeClass: ValidationOutcomeClass;
    let summaryVerdict: string;

    const isPrerequisiteInvalidated =
      input.intakeAccepted === false || input.provenanceVerified === false;

    if (isPrerequisiteInvalidated) {
      // Evaluation-invalidating prerequisite: evaluation was invalid/unverified from the outset.
      outcomeClass = VALIDATION_OUTCOME_CLASSES.BLOCKED;
      summaryVerdict =
        input.summaryVerdictOverride ??
        `BLOCKED: Evaluation could not proceed due to invalid intake or unverifiable 1C.5f provenance seal. Testing halted pending prerequisite remediation.`;
      conditionsImposed.length = 0;
    } else if (openFailures.length > 0) {
      // FAIL: Candidate was evaluable and demonstrated verified material genuine regression,
      // structural export failure, unmusical acoustic failure, or failed rollback.
      outcomeClass = VALIDATION_OUTCOME_CLASSES.FAIL;
      if (activeBlockers.length > 0) {
        // Case C: Verified material failure exists, AND a coincident blocker exists.
        // Semantics: Candidate failed validation and triggers defect remand; coincident blockers are preserved and reported.
        summaryVerdict =
          input.summaryVerdictOverride ??
          `FAIL (WITH COINCIDENT BLOCKERS): Candidate exhibited ${openFailures.length} verified material failure(s): ${openFailures.join("; ")}. Coincident blocking condition(s) also present: ${activeBlockers.join("; ")}. Disqualified from Gate 8; remand triggered.`;
      } else {
        // Case A: Clean failure without coincident blockers.
        summaryVerdict =
          input.summaryVerdictOverride ??
          `FAIL: Candidate exhibited ${openFailures.length} verified material failure(s): ${openFailures[0]}. Disqualified from Gate 8 consideration; remand triggered.`;
      }
      conditionsImposed.length = 0;
    } else if (activeBlockers.length > 0) {
      // Case B: Candidate cannot be evaluated because required prerequisites/fixtures/environment
      // are unavailable or invalid, and NO candidate failure has been established.
      outcomeClass = VALIDATION_OUTCOME_CLASSES.BLOCKED;
      summaryVerdict =
        input.summaryVerdictOverride ??
        `BLOCKED: Evaluation could not be validly completed due to ${activeBlockers.length} active blocker(s): ${activeBlockers[0]}. Testing halted pending remediation.`;
      conditionsImposed.length = 0;
    } else if (
      hasAllowsConditionalUncertainty ||
      conditionsImposed.length > 0 ||
      uatSummary.completed_with_friction_count > 0 ||
      uatSummary.fitness_conditionally_accepted_count > 0 ||
      objectiveSummary.borderline_count > 0
    ) {
      // CONDITIONAL: Core functional/acoustic criteria pass, zero material regressions,
      // zero hard blockers, but minor non-critical anomalies, limited fixture coverage,
      // or residual uncertainty require restricted scope and mandatory monitoring.
      outcomeClass = VALIDATION_OUTCOME_CLASSES.CONDITIONAL;
      if (conditionsImposed.length === 0) {
        conditionsImposed.push(
          "Mandatory production telemetry monitoring required for residual uncertainty verification."
        );
      }
      summaryVerdict =
        input.summaryVerdictOverride ??
        `CONDITIONAL: Candidate satisfied core acoustic and functional criteria with 0 material regressions, but requires ${conditionsImposed.length} mandatory operational condition(s) and monitoring controls.`;
    } else {
      // PASS: Strict positive proof.
      outcomeClass = VALIDATION_OUTCOME_CLASSES.PASS;
      summaryVerdict =
        input.summaryVerdictOverride ??
        `PASS: All ${applicabilityAssessment.applicableProfileIds.length} applicable assigned test profile(s) satisfied; 0 material genuine regressions; 0 hard blockers; operational rollback validated. Eligible to proceed to Gate-8 adjudication.`;
      conditionsImposed.length = 0;
    }

    // -------------------------------------------------------------------------
    // Step 11: Construct Sealed Record 17
    // -------------------------------------------------------------------------
    const timestamp = new Date().toISOString();
    const outcomeId =
      input.outcomeId ?? `outcome_${packageId}_${Date.now().toString(36)}`;

    // Raw payload matching exact WP-01 ValidationOutcomeRecord schema
    const rawPayload = {
      outcome_id: outcomeId,
      package_id: packageId,
      outcome_class: outcomeClass,
      evaluated_scope: scopeId,
      version_binding: versionBindingId,
      summary_verdict: summaryVerdict,
      objective_summary: objectiveSummary as unknown as Record<string, unknown>,
      perceptual_summary: perceptualSummary as unknown as Record<string, unknown>,
      uat_summary: uatSummary as unknown as Record<string, unknown>,
      regression_summary: regressionSummary as unknown as Record<string, unknown>,
      unresolved_issues: openUnresolvedIssues,
      conditions_imposed: conditionsImposed,
      timestamp,
      record_integrity_metadata: {
        integrity_digest: this.integrityProvider.computeDigest({
          outcome_id: outcomeId,
          package_id: packageId,
          outcome_class: outcomeClass,
          evaluated_scope: scopeId,
          version_binding: versionBindingId,
          summary_verdict: summaryVerdict,
          timestamp,
        }),
        algorithm: this.integrityProvider.algorithmName,
        sealed_at: timestamp,
        signer_identity: "ValidationOutcomeSynthesizer:Phase1C.5h:WP-19",
        canonical_serialization_format: "CANONICAL-JSON",
      },
    };

    // Strict validation against authoritative WP-01 schema (rejects invented fields)
    let parsedRecord: ValidationOutcomeRecord;
    try {
      parsedRecord = validationOutcomeRecordSchema.parse(rawPayload);
    } catch (err) {
      throw new InvalidOutcomeRecordError(
        `ValidationOutcomeRecord schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Cryptographic & runtime immutability (deep-freeze)
    const frozenRecord = deepFreeze(parsedRecord);

    // -------------------------------------------------------------------------
    // Step 12: Establish Canonical Relationship Graph Edges
    // -------------------------------------------------------------------------
    const edgesCreated: RelationshipEdge[] = [];

    if (this.graph) {
      // 1. Register outcome node in graph
      this.graph.registerNode({
        id: frozenRecord.outcome_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
      });

      // 2. Canonical EVIDENCED_BY edges: ValidationOutcomeRecord -> ObjectiveEvidenceRecord
      if (input.objectiveEvidence) {
        for (const obj of input.objectiveEvidence) {
          this.graph.registerNode({
            id: obj.objective_evidence_id,
            kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
          });

          const edge = this.graph.addEdge({
            edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
            source: {
              id: frozenRecord.outcome_id,
              kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
            },
            target: {
              id: obj.objective_evidence_id,
              kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
            },
          });
          edgesCreated.push(edge);
        }
      }

      // 3. Canonical EVIDENCED_BY edges: ValidationOutcomeRecord -> PerceptualEvaluationRecord
      if (input.perceptualEvidence) {
        for (const perc of input.perceptualEvidence) {
          this.graph.registerNode({
            id: perc.perceptual_evidence_id,
            kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
          });

          const edge = this.graph.addEdge({
            edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
            source: {
              id: frozenRecord.outcome_id,
              kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
            },
            target: {
              id: perc.perceptual_evidence_id,
              kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
            },
          });
          edgesCreated.push(edge);
        }
      }

      // 4. Canonical UNCERTAIN_OF edges: ValidationOutcomeRecord -> ValidationUncertaintyRecord (WP-18 reuse)
      if (input.uncertaintyRecords) {
        for (const u of input.uncertaintyRecords) {
          this.graph.registerNode({
            id: u.uncertainty_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
          });

          const edge = this.graph.addEdge({
            edgeType: GOVERNED_EDGE_TYPES.UNCERTAIN_OF,
            source: {
              id: frozenRecord.outcome_id,
              kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
            },
            target: {
              id: u.uncertainty_id,
              kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord,
            },
          });
          edgesCreated.push(edge);
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 13: Append to Audit Ledger if Available
    // -------------------------------------------------------------------------
    if (this.ledger) {
      this.ledger.appendRecord(
        "ValidationOutcomeRecord",
        frozenRecord.outcome_id,
        frozenRecord
      );
      for (const edge of edgesCreated) {
        this.ledger.appendEdge(edge);
      }
    }

    return deepFreeze({
      outcomeRecord: frozenRecord,
      outcomeClass: frozenRecord.outcome_class,
      isPass: frozenRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.PASS,
      isFail: frozenRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.FAIL,
      isBlocked: frozenRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.BLOCKED,
      isConditional: frozenRecord.outcome_class === VALIDATION_OUTCOME_CLASSES.CONDITIONAL,
      activeBlockers,
      unresolvedIssues: openUnresolvedIssues,
      conditionsImposed,
      summaryVerdict,
      applicabilityDiagnostics: applicabilityAssessment.diagnostics,
      edgesCreated,
    });
  }

  // ---------------------------------------------------------------------------
  // Helper Summary Builders
  // ---------------------------------------------------------------------------

  private buildObjectiveSummary(
    records: ReadonlyArray<any>,
    conflictRecords?: ReadonlyArray<EvidenceConflictRecord>,
    packageId?: string
  ): ObjectiveSummaryData {
    let passedCount = 0;
    let failedCount = 0;
    let borderlineCount = 0;
    let notApplicableCount = 0;
    let dispositionedCount = 0;
    const byCategory: Record<
      string,
      { passed: number; failed: number; borderline: number; not_applicable: number }
    > = {};
    const outOfToleranceMetrics: Array<{
      metric_category: string;
      execution_id: string;
      delta: number;
      tolerance_evaluation: string;
    }> = [];

    for (const r of records) {
      const cat = r.metric_category ?? "UNKNOWN";
      if (!byCategory[cat]) {
        byCategory[cat] = { passed: 0, failed: 0, borderline: 0, not_applicable: 0 };
      }

      if (r.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.PASS) {
        passedCount++;
        byCategory[cat].passed++;
      } else if (r.objective_pass_fail === OBJECTIVE_PASS_FAIL_STATUSES.FAIL) {
        failedCount++;
        byCategory[cat].failed++;

        // Traceable exact evidence linkage: check if this specific failed objective measurement
        // is formally dispositioned by an accepted intentional trade-off
        const isDispositioned = conflictRecords?.some(
          (c) =>
            (!packageId || c.package_id === packageId) &&
            c.resolution_status === CONFLICT_RESOLUTION_STATUSES.ACCEPTED_TRADE_OFF &&
            c.competing_evidence_refs.includes(r.objective_evidence_id)
        );
        if (isDispositioned) {
          dispositionedCount++;
        }
      }

      if (r.tolerance_evaluation === TOLERANCE_EVALUATIONS.BORDERLINE) {
        borderlineCount++;
        byCategory[cat].borderline++;
      } else if (r.tolerance_evaluation === TOLERANCE_EVALUATIONS.NOT_APPLICABLE) {
        notApplicableCount++;
        byCategory[cat].not_applicable++;
      } else if (r.tolerance_evaluation === TOLERANCE_EVALUATIONS.OUT_OF_TOLERANCE) {
        outOfToleranceMetrics.push({
          metric_category: cat,
          execution_id: r.execution_id,
          delta: r.measured_delta ?? 0,
          tolerance_evaluation: r.tolerance_evaluation,
        });
      }
    }

    return {
      total_evaluations: records.length,
      passed_count: passedCount,
      failed_count: failedCount,
      borderline_count: borderlineCount,
      not_applicable_count: notApplicableCount,
      by_category: byCategory,
      out_of_tolerance_metrics: outOfToleranceMetrics,
      dispositioned_count: dispositionedCount,
      unresolved_failed_count: failedCount - dispositionedCount,
    };
  }

  private buildPerceptualSummary(
    records: ReadonlyArray<any>
  ): PerceptualSummaryData {
    let passCount = 0;
    let failCount = 0;
    let inconclusiveCount = 0;
    const byRole: Record<string, { pass: number; fail: number; inconclusive: number }> = {};
    const evaluations: Array<{
      perceptual_evidence_id: string;
      evaluator_role: string;
      methodology: string;
      evaluation_outcome: string;
      confidence: string;
    }> = [];

    for (const r of records) {
      const role = r.evaluator_role ?? "UNKNOWN";
      if (!byRole[role]) {
        byRole[role] = { pass: 0, fail: 0, inconclusive: 0 };
      }

      if (r.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_PASS) {
        passCount++;
        byRole[role].pass++;
      } else if (r.evaluation_outcome === PERCEPTUAL_EVALUATION_OUTCOMES.PERCEPTUAL_FAIL) {
        failCount++;
        byRole[role].fail++;
      } else {
        inconclusiveCount++;
        byRole[role].inconclusive++;
      }

      evaluations.push({
        perceptual_evidence_id: r.perceptual_evidence_id,
        evaluator_role: role,
        methodology: r.methodology_used ?? "UNKNOWN",
        evaluation_outcome: r.evaluation_outcome,
        confidence: r.confidence ?? "MEDIUM",
      });
    }

    return {
      total_evaluations: records.length,
      pass_count: passCount,
      fail_count: failCount,
      inconclusive_count: inconclusiveCount,
      by_role: byRole,
      evaluations,
    };
  }

  private buildUATSummary(records: ReadonlyArray<any>): UATSummaryData {
    let completedSuccess = 0;
    let completedFriction = 0;
    let failed = 0;
    let accepted = 0;
    let rejected = 0;
    let conditionallyAccepted = 0;
    const blockersIdentified: string[] = [];

    for (const r of records) {
      if (r.task_completion_status === TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY) {
        completedSuccess++;
      } else if (r.task_completion_status === TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION) {
        completedFriction++;
      } else if (r.task_completion_status === TASK_COMPLETION_STATUSES.FAILED) {
        failed++;
      }

      if (r.musical_fitness_verdict === "ACCEPTED") {
        accepted++;
      } else if (r.musical_fitness_verdict === "REJECTED") {
        rejected++;
      } else if (r.musical_fitness_verdict === "CONDITIONALLY_ACCEPTED") {
        conditionallyAccepted++;
      }

      if (r.uat_blockers_identified && Array.isArray(r.uat_blockers_identified)) {
        for (const b of r.uat_blockers_identified) {
          if (!blockersIdentified.includes(b)) {
            blockersIdentified.push(b);
          }
        }
      }
    }

    return {
      total_scenarios: records.length,
      completed_successfully_count: completedSuccess,
      completed_with_friction_count: completedFriction,
      failed_count: failed,
      fitness_accepted_count: accepted,
      fitness_rejected_count: rejected,
      fitness_conditionally_accepted_count: conditionallyAccepted,
      blockers_identified: blockersIdentified,
    };
  }

  private buildRegressionSummary(
    records: ReadonlyArray<any>
  ): RegressionSummaryData {
    let intentionalCorrections = 0;
    let neutralDivergences = 0;
    let genuineRegressions = 0;
    let unresolved = 0;
    let materialGenuineRegressions = 0;
    let blocksGate8Count = 0;

    for (const r of records) {
      if (r.classification === REGRESSION_CLASSIFICATIONS.INTENTIONAL_CORRECTION) {
        intentionalCorrections++;
      } else if (r.classification === REGRESSION_CLASSIFICATIONS.NEUTRAL) {
        neutralDivergences++;
      } else if (r.classification === REGRESSION_CLASSIFICATIONS.GENUINE_REGRESSION) {
        genuineRegressions++;
        if (
          r.materiality_score === "HIGH" ||
          r.materiality_score === "MEDIUM" ||
          r.blocks_gate_8 === true
        ) {
          materialGenuineRegressions++;
        }
      } else if (r.classification === REGRESSION_CLASSIFICATIONS.UNRESOLVED) {
        unresolved++;
      }

      if (r.blocks_gate_8 === true) {
        blocksGate8Count++;
      }
    }

    return {
      total_assessments: records.length,
      intentional_correction_count: intentionalCorrections,
      neutral_divergence_count: neutralDivergences,
      genuine_regression_count: genuineRegressions,
      unresolved_count: unresolved,
      material_genuine_regression_count: materialGenuineRegressions,
      blocks_gate_8_count: blocksGate8Count,
    };
  }
}

/**
 * Governed query helper: Evaluates whether a historical ValidationOutcomeRecord
 * is still applicable for a specified target version binding.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * Historical outcomes are strictly immutable.
 * A stale outcome's outcome_class is NEVER mutated to "INVALIDATED".
 * Invalidation is represented exclusively via INVALIDATED_BY relationship edges.
 */
export function isApplicableForCurrentBinding(
  outcomeRecord: ValidationOutcomeRecord,
  currentBinding: ValidationVersionBindingRecord | string,
  graph?: ValidationRelationshipGraph
): boolean {
  if (!outcomeRecord || !outcomeRecord.outcome_id) {
    throw new Error("Invalid outcomeRecord: must be a defined ValidationOutcomeRecord.");
  }

  const targetBindingId =
    typeof currentBinding === "string" ? currentBinding : currentBinding.binding_id;

  // 1. Direct version binding mismatch
  if (outcomeRecord.version_binding !== targetBindingId) {
    return false;
  }

  // 2. Query relationship graph for incoming/outgoing INVALIDATED_BY edges
  if (graph) {
    const isInvalidated = graph.getEdges().some(
      (edge) =>
        edge.edgeType === GOVERNED_EDGE_TYPES.INVALIDATED_BY &&
        edge.source.id === outcomeRecord.outcome_id
    );
    if (isInvalidated) {
      return false;
    }
  }

  return true;
}
