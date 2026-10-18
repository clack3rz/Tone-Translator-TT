// src/sound-engineer/validation/execution/executionRunner.ts
// ValidationExecutionRunner: Sandboxed Validation Execution Harness & Audio Runner (Record 9).
// Phase 1C.5h — WP-10.
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.

import { deepFreeze } from "../../contracts/immutability";
import { generateTraceId } from "../../trace/runTrace";
import {
  EXECUTION_OUTCOMES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  READINESS_OUTCOMES,
} from "../schemas/enums";
import {
  ValidationExecutionRecord,
  validationExecutionRecordSchema,
  validationCaseSchema,
  validationScopeRecordSchema,
  validationVersionBindingRecordSchema,
  ValidationFixtureRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  createCanonicalEdgeId,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import {
  DEFAULT_INTEGRITY_PROVIDER,
  verifyAudioPayloadIntegrity,
} from "../fixtures/audioVerification";
import {
  ExecuteCaseParams,
  ExecutionRunResult,
  OperationalBudgetResolver,
  PlatformValidationAdapter,
  RenderRequest,
  ValidationExecutionDependencies,
} from "./types";
import {
  ExecutionEligibilityError,
  ExecutionRetestError,
} from "./executionErrors";
import {
  ProductionProtectionGuard,
  SandboxIsolationBoundary,
} from "./sandboxIsolation";

/**
 * Standard operational budget resolver mapping budget reference keys to milliseconds.
 */
export class DefaultOperationalBudgetResolver implements OperationalBudgetResolver {
  private readonly budgetTable: Map<string, number> = new Map([
    ["BUDGET_FAST_SYNTAX", 1000],
    ["BUDGET_STANDARD_RENDER", 10000],
    ["BUDGET_EXTENDED_RENDER", 30000],
    ["BUDGET_REALTIME_STRESS", 15000],
    ["tolerance_spec_ref:operational_budget_ref", 10000],
  ]);

  constructor(customBudgets?: Record<string, number>) {
    if (customBudgets) {
      for (const [k, v] of Object.entries(customBudgets)) {
        this.budgetTable.set(k, v);
      }
    }
  }

  public resolveBudgetMs(budgetRef?: string): number {
    if (!budgetRef) return 10000;
    if (this.budgetTable.has(budgetRef)) {
      return this.budgetTable.get(budgetRef)!;
    }
    // Parse numeric string if format is BUDGET_<ms>MS
    const match = budgetRef.match(/BUDGET_(\d+)MS/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 10000;
  }
}

/**
 * ValidationExecutionRunner: Orchestrates isolated sandboxed test runs for ValidationCases,
 * invokes candidate and PATH-PROD baseline audio rendering through an abstract platform adapter,
 * validates prerequisite eligibility and fixture health immediately prior to execution,
 * creates sealed Record 9 ValidationExecutionRecords, and manages canonical TESTED_WITH and
 * SUPERSEDES_VALIDATION edges without modifying live production state.
 */
export class ValidationExecutionRunner {
  private readonly fixtureManager?: FixtureCorpusManager;
  private readonly adapter: PlatformValidationAdapter;
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly budgetResolver: OperationalBudgetResolver;
  private readonly environmentIdentifier: string;
  private readonly sandbox: SandboxIsolationBoundary = new SandboxIsolationBoundary();

  /** Immutable historical store of executed records */
  private readonly recordedExecutions: Map<string, ValidationExecutionRecord> = new Map();

  constructor(dependencies: ValidationExecutionDependencies) {
    if (!dependencies.adapter) {
      throw new Error("ValidationExecutionRunner requires an abstract PlatformValidationAdapter");
    }
    this.adapter = dependencies.adapter;
    this.fixtureManager = dependencies.fixtureManager;
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.integrityProvider =
      dependencies.integrityProvider ?? DEFAULT_INTEGRITY_PROVIDER;
    this.budgetResolver =
      dependencies.budgetResolver ?? new DefaultOperationalBudgetResolver();
    this.environmentIdentifier =
      dependencies.environmentIdentifier ??
      "HOST:LINUX_CONTAINER/ARCH:X86_64/SANDBOX:ISOLATED_UNPRIVILEGED_V1";
  }

  public getExecution(executionId: string): ValidationExecutionRecord | undefined {
    return this.recordedExecutions.get(executionId);
  }

  public getAllExecutions(): ReadonlyArray<ValidationExecutionRecord> {
    return Array.from(this.recordedExecutions.values());
  }

  public getExecutionCount(): number {
    return this.recordedExecutions.size;
  }

  /**
   * Generates a deterministic, unique execution identifier for a case run.
   */
  private generateExecutionId(caseId: string, timestamp: string): string {
    const raw = `${caseId}:${timestamp}:${Math.random().toString(36).substring(2, 9)}`;
    const digest = this.integrityProvider.computeDigest(raw).substring(7, 19);
    return `EXEC-${caseId}-${digest}`;
  }

  /**
   * Executes a single ValidationCase in the unprivileged sandbox harness.
   * Fails closed if prerequisites, scope, binding, or fixture eligibility are violated.
   */
  public async executeCase(params: ExecuteCaseParams): Promise<ExecutionRunResult> {
    // 0. Continuous Production Protection Assertion
    ProductionProtectionGuard.assertSandboxIsolation();

    // 1. Validate Core Schema Inputs
    try {
      validationCaseSchema.parse(params.caseRecord);
      validationScopeRecordSchema.parse(params.scopeRecord);
      validationVersionBindingRecordSchema.parse(params.versionBinding);
    } catch (err: unknown) {
      throw new ExecutionEligibilityError(
        `Invalid input schema: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. Scope & Version Binding Alignment Verification
    if (params.versionBinding.scope_id !== params.scopeRecord.scope_id) {
      throw new ExecutionEligibilityError(
        `Version binding scope mismatch: version binding is bound to '${params.versionBinding.scope_id}', but active scope is '${params.scopeRecord.scope_id}'.`
      );
    }

    // 3. Package Scope & Inclusion Verification (WP-09)
    if (params.packageRecord) {
      if (params.packageRecord.scope_record_ref !== params.scopeRecord.scope_id) {
        throw new ExecutionEligibilityError(
          `Package scope mismatch: package '${params.packageRecord.package_id}' references scope '${params.packageRecord.scope_record_ref}', but active scope is '${params.scopeRecord.scope_id}'.`
        );
      }
      if (params.packageRecord.version_binding_ref !== params.versionBinding.binding_id) {
        throw new ExecutionEligibilityError(
          `Package binding mismatch: package references binding '${params.packageRecord.version_binding_ref}', but active binding is '${params.versionBinding.binding_id}'.`
        );
      }
      if (!params.packageRecord.validation_case_refs.includes(params.caseRecord.case_id)) {
        throw new ExecutionEligibilityError(
          `Case '${params.caseRecord.case_id}' does not belong to package '${params.packageRecord.package_id}'.`
        );
      }
    }

    // 4. Pre-Validation Readiness Assessment Verification (WP-06)
    if (params.readinessRecord) {
      if (params.readinessRecord.readiness_outcome === READINESS_OUTCOMES.BLOCKED_NOT_EVALUABLE) {
        throw new ExecutionEligibilityError(
          `Readiness outcome is BLOCKED_NOT_EVALUABLE. Execution is prohibited under Section 10.`
        );
      }
      if (params.readinessRecord.readiness_outcome === READINESS_OUTCOMES.READY_WITH_DECLARED_LIMITATIONS) {
        const isLimited = params.readinessRecord.limitation_notes.some((note) =>
          note.includes(params.caseRecord.validation_subject)
        );
        if (isLimited) {
          throw new ExecutionEligibilityError(
            `Case validation subject '${params.caseRecord.validation_subject}' is declared unevaluable in readiness limitation notes.`
          );
        }
      }
    }

    // 5. Governed Retest & Supersession Verification
    const isRetest = Boolean(params.supersedesExecutionId);
    if (params.supersedesExecutionId) {
      // Reject self-supersession
      if (this.recordedExecutions.has(params.supersedesExecutionId)) {
        const prior = this.recordedExecutions.get(params.supersedesExecutionId)!;
        if (prior.case_id !== params.caseRecord.case_id) {
          throw new ExecutionRetestError(
            `Retest mismatch: prior execution '${params.supersedesExecutionId}' was for case '${prior.case_id}', but current case is '${params.caseRecord.case_id}'.`
          );
        }
      } else if (this.graph && !this.graph.hasNode(params.supersedesExecutionId)) {
        throw new ExecutionRetestError(
          `Prior execution to supersede '${params.supersedesExecutionId}' does not exist in graph or execution history.`
        );
      }
    }

    // 6. Fixture Eligibility & Health Revalidation (WP-08)
    const referencedFixtureId =
      params.fixtureId ??
      (params.caseRecord.associated_fixture_set && params.caseRecord.associated_fixture_set.length > 0
        ? params.caseRecord.associated_fixture_set[0]
        : undefined);

    let activeFixture: ValidationFixtureRecord | undefined;
    let fixturePayload: Uint8Array = new Uint8Array(0);

    if (referencedFixtureId) {
      if (!this.fixtureManager) {
        throw new ExecutionEligibilityError(
          `FixtureManager dependency is required to validate and load fixture '${referencedFixtureId}'.`
        );
      }

      // Revalidate fixture immediately before execution
      const audit = this.fixtureManager.auditFixture(referencedFixtureId);
      if (!audit.valid || !audit.isUsableForActiveTesting || audit.isQuarantined) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' failed immediate pre-execution eligibility audit: ${audit.errors.concat(audit.warnings).join("; ")}`
        );
      }

      const fixtureRecord = this.fixtureManager.getFixture(referencedFixtureId);
      if (!fixtureRecord) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' could not be retrieved from fixture corpus.`
        );
      }

      if (fixtureRecord.contamination_status !== FIXTURE_CONTAMINATION_STATUSES.CLEAN) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' has contamination status '${fixtureRecord.contamination_status}'. Execution prohibited.`
        );
      }

      if (fixtureRecord.lifecycle_status !== FIXTURE_LIFECYCLE_STATUSES.ACTIVE) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' has lifecycle status '${fixtureRecord.lifecycle_status}'. Only ACTIVE fixtures are permitted for test execution.`
        );
      }

      // Check fixture scope applicability
      const scopeMatches =
        fixtureRecord.declared_applicability_scope.includes(params.caseRecord.validation_subject) ||
        params.scopeRecord.included_units.some((u) => fixtureRecord.declared_applicability_scope.includes(u));
      if (!scopeMatches) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' scope does not include validation subject '${params.caseRecord.validation_subject}'.`
        );
      }

      // Load payload from governed read-only payload store
      const buffer = this.fixtureManager.getPayloadStore().readPayload(referencedFixtureId);
      if (!buffer || buffer.length === 0) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' payload buffer missing or empty in read-only store.`
        );
      }

      const integrityCheck = verifyAudioPayloadIntegrity(
        buffer,
        fixtureRecord.payload_integrity_ref,
        this.integrityProvider
      );
      if (!integrityCheck.valid) {
        throw new ExecutionEligibilityError(
          `Fixture '${referencedFixtureId}' payload bit-level integrity verification failed: ${integrityCheck.error}`
        );
      }

      activeFixture = fixtureRecord;
      fixturePayload = buffer;
    }

    // 7. Resolve Operational Budget Timeout
    const budgetRef =
      params.operationalBudgetRef ??
      params.caseRecord.acceptance_criteria_ref ??
      "BUDGET_STANDARD_RENDER";
    const budgetMs = this.budgetResolver.resolveBudgetMs(budgetRef);

    // 8. Prepare Execution Identity & Audit Trace
    const executionTimestamp = new Date().toISOString();
    const executionId = this.generateExecutionId(params.caseRecord.case_id, executionTimestamp);

    if (params.supersedesExecutionId && params.supersedesExecutionId === executionId) {
      throw new ExecutionRetestError("Self-supersession prohibited: execution cannot supersede itself.");
    }

    const traceRef = params.traceRef ?? generateTraceId();
    const inputAudioRef = activeFixture
      ? activeFixture.payload_integrity_ref
      : this.integrityProvider.computeDigest(new Uint8Array(0));

    // 9. Dispatch Execution into Isolated Sandbox
    const renderRequest: RenderRequest = {
      renderId: `rnd_${executionId}`,
      caseId: params.caseRecord.case_id,
      subjectId: params.caseRecord.validation_subject,
      fixturePayload,
      fixtureMetadata: activeFixture ? { fixture_name: activeFixture.fixture_name, fixture_class: activeFixture.fixture_class } : undefined,
      versionBinding: params.versionBinding,
      timeoutMs: budgetMs,
    };

    const sandboxOutcome = await this.sandbox.executeInSandbox<{
      candidateResult: import("./types").RenderResult;
      baselineResult: import("./types").RenderResult;
    }>(
      async (signal) => {
        const reqWithSignal: RenderRequest = { ...renderRequest, signal };

        // Render Candidate tone translator output and PATH-PROD baseline reference
        const [candidateResult, baselineResult] = await Promise.all([
          this.adapter.renderCandidate(reqWithSignal),
          this.adapter.renderBaseline(reqWithSignal),
        ]);

        return { candidateResult, baselineResult };
      },
      budgetMs,
      executionId,
      budgetRef
    );

    // 10. Process Sandbox Outcome & Determine Execution Status
    let outcome: (typeof EXECUTION_OUTCOMES)[keyof typeof EXECUTION_OUTCOMES];
    let outputAudioRef: string;
    let candidateAudioBuffer: Uint8Array | undefined;
    let baselineAudioBuffer: Uint8Array | undefined;
    const allAnomalies: string[] = [...sandboxOutcome.anomalies];

    if (sandboxOutcome.success && sandboxOutcome.result) {
      outcome = EXECUTION_OUTCOMES.COMPLETED;
      candidateAudioBuffer = sandboxOutcome.result.candidateResult.audioBuffer;
      baselineAudioBuffer = sandboxOutcome.result.baselineResult.audioBuffer;
      outputAudioRef = this.integrityProvider.computeDigest(candidateAudioBuffer);
      allAnomalies.push(
        ...sandboxOutcome.result.candidateResult.anomalies,
        ...sandboxOutcome.result.baselineResult.anomalies
      );
    } else if (sandboxOutcome.isTimeout) {
      outcome = EXECUTION_OUTCOMES.ABORTED;
      outputAudioRef = this.integrityProvider.computeDigest(new Uint8Array(0));
    } else {
      outcome = EXECUTION_OUTCOMES.FAILED;
      outputAudioRef = this.integrityProvider.computeDigest(new Uint8Array(0));
    }

    // 11. Compile Raw Telemetry Measurements (No WP-11 DSP or acoustic interpretation!)
    const rawMeasurements: Record<string, unknown> = {
      execution_wall_clock_ms: sandboxOutcome.durationMs,
      operational_budget_ms: budgetMs,
      operational_budget_ref: budgetRef,
      sandbox_timeout: sandboxOutcome.isTimeout,
      sandbox_crashed: sandboxOutcome.isCrashed,
      platform_id: this.adapter.platformId,
      platform_version: this.adapter.platformVersion,
      candidate_sample_count: sandboxOutcome.result?.candidateResult.sampleCount ?? 0,
      candidate_sample_rate: sandboxOutcome.result?.candidateResult.sampleRate ?? 0,
      candidate_channel_count: sandboxOutcome.result?.candidateResult.channelCount ?? 0,
      baseline_sample_count: sandboxOutcome.result?.baselineResult.sampleCount ?? 0,
      baseline_sample_rate: sandboxOutcome.result?.baselineResult.sampleRate ?? 0,
      baseline_channel_count: sandboxOutcome.result?.baselineResult.channelCount ?? 0,
    };

    const resolvedProfileId =
      params.caseRecord.applicable_test_dimensions &&
      params.caseRecord.applicable_test_dimensions.length > 0
        ? params.caseRecord.applicable_test_dimensions[0]
        : "PROFILE-DEFAULT";

    // 12. Assemble & Strictly Validate Record 9 ValidationExecutionRecord
    const executionRecordRaw = {
      execution_id: executionId,
      case_id: params.caseRecord.case_id,
      profile_id: resolvedProfileId,
      fixture_id: activeFixture ? activeFixture.fixture_id : "NONE",
      binding_id: params.versionBinding.binding_id,
      execution_timestamp: executionTimestamp,
      execution_environment: params.customEnvironment ?? this.environmentIdentifier,
      input_audio_integrity_ref: inputAudioRef,
      output_audio_integrity_ref: outputAudioRef,
      execution_duration_ms: sandboxOutcome.durationMs,
      anomalies_detected: allAnomalies,
      raw_measurements: rawMeasurements,
      outcome,
      trace_ref: traceRef,
    };

    const validatedRecord: ValidationExecutionRecord = validationExecutionRecordSchema.parse(executionRecordRaw);
    const frozenRecord = deepFreeze(validatedRecord);

    // Save into historical store
    this.recordedExecutions.set(executionId, frozenRecord);

    // 13. Graph Linage & Governance Ownership (WP-10 Authorized Edges Only)
    if (this.graph) {
      // Register execution node
      if (!this.graph.hasNode(executionId)) {
        this.graph.registerNode({
          id: executionId,
          kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
        });
      }

      // Edge A: TESTED_WITH (ValidationExecutionRecord -> ValidationFixtureRecord)
      // Only when a genuine fixture was used; NEVER from case -> fixture
      if (activeFixture) {
        if (!this.graph.hasNode(activeFixture.fixture_id)) {
          this.graph.registerNode({
            id: activeFixture.fixture_id,
            kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord,
          });
        }
        this.graph.addEdge({
          source: { id: executionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          target: { id: activeFixture.fixture_id, kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord },
          edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
        });
      }

      // Edge B: SUPERSEDES_VALIDATION (ValidationExecutionRecord -> ValidationExecutionRecord)
      // Governed retest runs only
      if (isRetest && params.supersedesExecutionId) {
        if (!this.graph.hasNode(params.supersedesExecutionId)) {
          this.graph.registerNode({
            id: params.supersedesExecutionId,
            kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
          });
        }
        this.graph.addEdge({
          source: { id: executionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          target: { id: params.supersedesExecutionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
        });
      }
    }

    // 14. Audit Ledger Append
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
        executionId,
        frozenRecord,
        executionTimestamp
      );

      if (activeFixture) {
        const edgeId = createCanonicalEdgeId(
          GOVERNED_EDGE_TYPES.TESTED_WITH,
          executionId,
          activeFixture.fixture_id
        );
        this.ledger.appendEdge({
          edgeId,
          edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
          source: { id: executionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          target: { id: activeFixture.fixture_id, kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord },
          isSymmetric: false,
          createdAt: executionTimestamp,
        });
      }

      if (isRetest && params.supersedesExecutionId) {
        const edgeId = createCanonicalEdgeId(
          GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
          executionId,
          params.supersedesExecutionId
        );
        this.ledger.appendEdge({
          edgeId,
          edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
          source: { id: executionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          target: { id: params.supersedesExecutionId, kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          isSymmetric: false,
          createdAt: executionTimestamp,
        });
      }
    }

    return {
      executionRecord: frozenRecord,
      candidateOutput: candidateAudioBuffer,
      baselineOutput: baselineAudioBuffer,
      testedWithFixtureId: activeFixture ? activeFixture.fixture_id : undefined,
      isRetest,
      supersededExecutionId: params.supersedesExecutionId,
      durationMs: sandboxOutcome.durationMs,
    };
  }
}
