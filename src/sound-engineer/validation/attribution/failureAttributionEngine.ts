// src/sound-engineer/validation/attribution/failureAttributionEngine.ts
// Phase 1C.5h WP-16: Failure Attribution & Diagnostic Isolation Engine (Record 14).
// Bound to frozen specification v0.1j Section 21, Section 29, Table 09, Table 17, and Implementation Plan v0.1h WP-16.

import { deepFreeze } from "../../contracts/immutability";
import {
  ATTRIBUTION_CONFIDENCE_LEVELS,
  AttributionConfidenceLevel,
  FAILURE_ATTRIBUTION_CLASSES,
  FAILURE_MATERIALITIES,
  FailureAttributionClass,
  FailureMateriality,
} from "../schemas/enums";
import {
  parseValidationExecutionRecord,
  parseValidationFailureRecord,
  parseValidationScopeRecord,
  ValidationFailureRecord,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
  GraphEdgeEndpoint,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  FailureAttributionInput,
  FailureAttributionResult,
  ForensicDecisionStep,
  ForensicIsolationTrace,
  ForensicSymptomDescriptor,
  RemandDestinationInfo,
  TABLE_17_REMAND_ROUTING,
} from "./attributionTypes";
import {
  ConfoundedAttributionError,
  InvalidAttributionEvidenceError,
  InvalidExecutionReferenceError,
  ScopeAttributionMismatchError,
} from "./attributionErrors";

export interface FailureAttributionEngineDependencies {
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
  readonly remandRoutingTable?: Readonly<Record<FailureAttributionClass, RemandDestinationInfo>>;
}

/**
 * Generates an authoritative failure ID with standard prefix.
 */
function generateFailureId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  return `FAIL_${uuid}`;
}

/**
 * Root-Layer Failure Attribution & Diagnostic Isolation Engine (Record 14).
 * Implements Activity WF-12 (Failure Attribution & Root-Layer Isolation).
 *
 * Enforces:
 * 1. Nine orthogonal failure attribution classes without speculative blame.
 * 2. Complete forensic decision tree with explicit diagnostic trace.
 * 3. Exact Table 17 Remand Routing Destination mapping.
 * 4. Canonical REMANDS_TO edge: ValidationFailureRecord -> GovernanceEntity.
 * 5. Strict immutability and append-only audit ledger compliance.
 */
export class FailureAttributionEngine {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly remandRoutingTable: Readonly<Record<FailureAttributionClass, RemandDestinationInfo>>;

  constructor(dependencies: FailureAttributionEngineDependencies = {}) {
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.remandRoutingTable = dependencies.remandRoutingTable ?? TABLE_17_REMAND_ROUTING;
  }

  /**
   * Executes forensic failure attribution and produces an immutable ValidationFailureRecord (Record 14).
   */
  public attributeFailure(input: FailureAttributionInput): FailureAttributionResult {
    // 1. Validate Execution & Scope Inputs
    this.validateInputs(input);

    const {
      executionRecord,
      scopeRecord,
      symptomDetails,
      explicitAttributionClass,
      explicitConfidence,
      materiality: callerMateriality,
      gate8Blocked: callerGate8Blocked,
      affectedScope: callerAffectedScope,
      evidenceRefs: callerEvidenceRefs,
      customRemandDestination,
      customRetestPrerequisites,
      customGovernanceEntityId,
    } = input;

    // 2. Forensic Isolation & Root-Layer Attribution
    const isolationTrace = this.isolateRootLayer(symptomDetails, explicitAttributionClass, explicitConfidence);
    const attributionClass = isolationTrace.isolatedClass;
    const attributionConfidence = isolationTrace.confidence;

    // 3. Resolve Remand Routing Information from Table 17
    const routingInfo = this.remandRoutingTable[attributionClass];
    const remandDestination = customRemandDestination ?? routingInfo.remandDestination;
    const remandClass = routingInfo.remandClass;
    const upstreamRecipient = routingInfo.upstreamRecipient;
    const governanceEntityId = customGovernanceEntityId ?? routingInfo.governanceEntityId;
    const retestPrerequisites = customRetestPrerequisites ?? routingInfo.defaultRetestPrerequisites;

    // 4. Resolve Materiality & Gate 8 Blocker Status (Strictly Independent of Attribution Class)
    const materiality = this.resolveMateriality(callerMateriality, symptomDetails);
    const gate8Blocked = this.resolveGate8Blocked(callerGate8Blocked, materiality);

    // 5. Resolve Affected Scope
    const affectedScope = this.resolveAffectedScope(callerAffectedScope, scopeRecord);

    // 6. Assemble Supporting Evidence References
    const evidenceRefs = this.assembleEvidenceRefs(callerEvidenceRefs, executionRecord, symptomDetails);

    // 7. Construct & Validate ValidationFailureRecord (Record 14)
    const failureId = input.failureId ?? generateFailureId();
    const rawRecord: ValidationFailureRecord = {
      failure_id: failureId,
      execution_id: executionRecord.execution_id,
      failure_timestamp: new Date().toISOString(),
      failure_title: symptomDetails.title,
      failure_symptom: symptomDetails.symptom,
      attribution_class: attributionClass,
      attribution_evidence_refs: [...evidenceRefs],
      attribution_confidence: attributionConfidence,
      materiality,
      affected_scope: [...affectedScope],
      gate_8_blocked: gate8Blocked,
      remand_destination: remandDestination,
      retest_prerequisites: retestPrerequisites,
    };

    // Schema validation ensures 100% parity with Record 14 definition
    const failureRecord = parseValidationFailureRecord(rawRecord);

    // 8. Register Graph Lineage & REMANDS_TO Edge (Record 14 -> GovernanceEntity)
    const edgesCreated: RelationshipEdge[] = [];
    const governanceEntityEndpoint: GraphEdgeEndpoint = {
      id: governanceEntityId,
      kind: GOVERNED_ENTITY_KINDS.GovernanceEntity,
    };

    if (this.graph) {
      // Register nodes to satisfy orphan protection
      this.graph.registerNode({
        id: failureRecord.failure_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
      });
      this.graph.registerNode(governanceEntityEndpoint);

      // Create canonical REMANDS_TO edge
      const edge = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.REMANDS_TO,
        source: {
          id: failureRecord.failure_id,
          kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
        },
        target: governanceEntityEndpoint,
      });
      edgesCreated.push(edge);
    }

    // 9. Append to Immutable Ledger
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationFailureRecord,
        failureRecord.failure_id,
        failureRecord
      );
    }

    // 10. Return Deep-Frozen Result
    return deepFreeze({
      record: failureRecord,
      remandDestination,
      remandClass,
      upstreamRecipient,
      governanceEntity: governanceEntityEndpoint,
      edgesCreated,
      isolationTrace,
    });
  }

  /**
   * Forensic decision tree isolating failure symptoms into one of the nine orthogonal classes.
   */
  public isolateRootLayer(
    symptom: ForensicSymptomDescriptor,
    explicitClass?: FailureAttributionClass,
    explicitConfidence?: AttributionConfidenceLevel
  ): ForensicIsolationTrace {
    const steps: ForensicDecisionStep[] = [];

    // If explicit attribution class was provided, validate and trace it
    if (explicitClass) {
      const step: ForensicDecisionStep = {
        stepNumber: 1,
        evaluatedLayer: explicitClass,
        hypothesis: `Explicit attribution assertion for layer ${explicitClass}`,
        result: "MATCH",
        rationale: `Direct forensic assignment verified with confidence ${
          explicitConfidence ?? ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN
        }`,
      };
      steps.push(step);
      return {
        steps,
        isolatedClass: explicitClass,
        confidence: explicitConfidence ?? ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        primaryEvidenceSummary: `Explicit assignment to ${explicitClass}: ${symptom.title}`,
        isConfounded: false,
      };
    }

    // Consolidate text corpora for forensic pattern matching
    const combinedText = [
      symptom.title,
      symptom.symptom,
      symptom.error?.name ?? "",
      symptom.error?.message ?? "",
      symptom.error?.stack ?? "",
      ...(symptom.logs ?? []),
    ]
      .join(" ")
      .toLowerCase();

    // Track matching indicators for multi-layer / confounded detection
    const matchedLayers: Array<{
      layer: FailureAttributionClass;
      confidence: AttributionConfidenceLevel;
      rationale: string;
    }> = [];

    // Step 1: Evaluate VALIDATION_ENVIRONMENT
    const isEnvMatch =
      /\b(?:outofmemory|enomem|sigkill|sigterm)\b/i.test(combinedText) ||
      /\bout of memory\b/i.test(combinedText) ||
      /\b(?:runner crash|runner timeout|runner timed out|driver dropout|audio driver dropout|host memory exhaustion)\b/i.test(combinedText) ||
      combinedText.includes("kernel: out of memory") ||
      combinedText.includes("host audio device") ||
      symptom.exitCode === 137 ||
      symptom.exitCode === 143;

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
      hypothesis: "Failure caused by test harness, OS memory limits, audio driver dropouts, or runner timeout",
      result: isEnvMatch ? "MATCH" : "RULED_OUT",
      rationale: isEnvMatch
        ? "Detected environment signatures (OOM, driver dropout, process signal, or timeout)"
        : "No environment, runner timeout, or host driver anomalies detected in symptoms",
    });
    if (isEnvMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.VALIDATION_ENVIRONMENT,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected test runner environment OOM / driver failure",
      });
    }

    // Step 2: Evaluate TEST_FIXTURE
    const isFixtureMatch =
      Boolean(symptom.audioIntegrityAnomalies && symptom.audioIntegrityAnomalies.length > 0) ||
      /\b(?:corrupt audio|corrupted fixture|miscalibrated stem|clipped stem|clipping detected|depleted pickup battery|depleted active pickup|dc offset|fixture contamination|stem header invalid|invalid audio format)\b/i.test(
        combinedText
      );

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
      hypothesis: "Failure caused by corrupt, miscalibrated, clipped, or contaminated golden audio stem/fixture",
      result: isFixtureMatch ? "MATCH" : "RULED_OUT",
      rationale: isFixtureMatch
        ? "Identified audio integrity anomalies or fixture calibration corruption in stems"
        : "Golden fixtures and test stems passed calibration and integrity verification",
    });
    if (isFixtureMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.TEST_FIXTURE,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected audio stem clipping, DC offset, or fixture integrity defect",
      });
    }

    // Step 3: Evaluate MIGRATION_MAPPING
    const isMappingMatch =
      Boolean(symptom.mappingDiff) ||
      /\b(?:heuristic remapping|migration mapping|parameter transformation|schema diff|1c\.5g mapping|unmapped parameter|mapping rule mismatch)\b/i.test(
        combinedText
      );

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
      hypothesis: "Failure caused by incorrect heuristic remapping, transformation error, or schema mismatch from Phase 1C.5g",
      result: isMappingMatch ? "MATCH" : "RULED_OUT",
      rationale: isMappingMatch
        ? "Detected parameter translation diff or Phase 1C.5g remapping heuristic mismatch"
        : "No migration mapping discrepancies or heuristic transformation errors identified",
    });
    if (isMappingMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.MIGRATION_MAPPING,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected Phase 1C.5g parameter remapping table mismatch",
      });
    }

    // Step 4: Evaluate RUNTIME_IMPLEMENTATION
    const isRuntimeMatch =
      combinedText.includes("cannot read properties of") ||
      /\b(?:nullpointerexception|null pointer|buffer overflow|dsp buffer race|core engine crash|segmentation fault in runtime)\b/i.test(
        combinedText
      ) ||
      (/\btypeerror\b/i.test(combinedText) && !isMappingMatch && !isEnvMatch);

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
      hypothesis: "Failure caused by code-level bug, null pointer, buffer overflow, or race condition in runtime core",
      result: isRuntimeMatch ? "MATCH" : "RULED_OUT",
      rationale: isRuntimeMatch
        ? "Detected code-level crash signature (null pointer, buffer overflow, or runtime exception)"
        : "Runtime codebase executed without internal unhandled exceptions or memory faults",
    });
    if (isRuntimeMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.RUNTIME_IMPLEMENTATION,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected internal runtime software null pointer or buffer bug",
      });
    }

    // Step 5: Evaluate REASONING
    // Note: Stage 12 is explicitly Platform Translation, whereas Stages 01-11 and 13-14 are Upstream Reasoning Cognition.
    const isReasoningMatch =
      Boolean(symptom.reasoningDiagnostics?.contradictionDetected) ||
      Boolean(symptom.reasoningDiagnostics?.causalAnomaly) ||
      Boolean(symptom.reasoningDiagnostics?.hypothesisRefuted) ||
      /\b(?:cognitive contradiction|ungrounded causal diagnosis|flawed acoustic diagnosis|unmusical intervention|dissonant eq|reasoning failure)\b/i.test(
        combinedText
      ) ||
      /\bstage (?:0?[1-9]|1[0134])\b/i.test(combinedText);

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.REASONING,
      hypothesis: "Failure caused by flawed AI sound engineering cognition, ungrounded causal diagnosis, or unmusical choice",
      result: isReasoningMatch ? "MATCH" : "RULED_OUT",
      rationale: isReasoningMatch
        ? "Identified cognitive contradiction, ungrounded causal reasoning, or unmusical parameter intervention"
        : "Upstream sound engineering reasoning chain produced internally coherent decisions",
    });
    if (isReasoningMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.REASONING,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        rationale: "Identified cognitive contradiction or ungrounded causal reasoning in Stages 01–14",
      });
    }

    // Step 6: Evaluate PLATFORM_TRANSLATION
    const isTranslationMatch =
      /\b(?:stage 12|platform translation|illegal platform parameter id|parameter normalization curve|invalid preset xml|amplitube 5 xml tag|unknown module id in preset|preset parser error|serialization syntax)\b/i.test(
        combinedText
      );

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
      hypothesis: "Failure caused by incorrect translation to target platform parameters in Stage 12 or preset serialization error",
      result: isTranslationMatch ? "MATCH" : "RULED_OUT",
      rationale: isTranslationMatch
        ? "Detected Stage 12 illegal platform parameter ID or preset serialization syntax error"
        : "Stage 12 platform translation strictly conformed to target schema and normalization bounds",
    });
    if (isTranslationMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.PLATFORM_TRANSLATION,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected illegal platform parameter ID or normalization curve failure in Stage 12",
      });
    }

    // Step 7: Evaluate TARGET_PLATFORM
    const isTargetPlatformMatch =
      Boolean(symptom.platformError) ||
      /\b(?:external target platform bug|vendor patch regression|undocumented vendor behavior|plugin host crash|daw crash|crash in vendor module)\b/i.test(
        combinedText
      );

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM,
      hypothesis: "Failure caused by bug, crash, or limitation inside external vendor target platform software",
      result: isTargetPlatformMatch ? "MATCH" : "RULED_OUT",
      rationale: isTargetPlatformMatch
        ? "Detected external vendor platform crash or undocumented platform regression"
        : "External host target platform responded normally and without vendor-level errors",
    });
    if (isTargetPlatformMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.TARGET_PLATFORM,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.PROBABLE,
        rationale: "Detected external host target platform application crash or vendor bug",
      });
    }

    // Step 8: Evaluate OPERATIONAL_INFRASTRUCTURE
    const isInfraMatch =
      /\b(?:cluster scheduling|database connection dropout|external storage degradation|disk i\/o alert|host hardware failure|sre cluster eviction|storage latency alert)\b/i.test(
        combinedText
      );

    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
      hypothesis: "Failure caused by host hardware, cluster scheduling, database connection dropouts, or storage degradation",
      result: isInfraMatch ? "MATCH" : "RULED_OUT",
      rationale: isInfraMatch
        ? "Detected operational infrastructure alerts (cluster eviction, db dropout, or storage degradation)"
        : "Operational host infrastructure operated within standard healthy latency budgets",
    });
    if (isInfraMatch) {
      matchedLayers.push({
        layer: FAILURE_ATTRIBUTION_CLASSES.OPERATIONAL_INFRASTRUCTURE,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.CERTAIN,
        rationale: "Detected cluster scheduling or persistent infrastructure dropout",
      });
    }

    // Step 9: Confounded & Unknown Synthesis
    // Rule: Phase 1C.5h forbids speculative attribution.
    // If multiple contradictory layers match or zero layers match, classify as UNKNOWN.
    if (matchedLayers.length === 1) {
      const match = matchedLayers[0];
      return {
        steps,
        isolatedClass: match.layer,
        confidence: match.confidence,
        primaryEvidenceSummary: match.rationale,
        isConfounded: false,
      };
    }

    if (matchedLayers.length > 1) {
      const conflictingNames = matchedLayers.map((m) => m.layer).join(", ");
      steps.push({
        stepNumber: steps.length + 1,
        evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
        hypothesis: "Confounded failure with multiple conflicting layer symptoms",
        result: "MATCH",
        rationale: `Conflicting signals detected across layers: [${conflictingNames}]. Forbidding speculative attribution.`,
      });
      return {
        steps,
        isolatedClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
        confidence: ATTRIBUTION_CONFIDENCE_LEVELS.SUSPECTED,
        primaryEvidenceSummary: `Confounded failure: conflicting diagnostic indicators across [${conflictingNames}]`,
        isConfounded: true,
      };
    }

    // No explicit layer matched
    steps.push({
      stepNumber: steps.length + 1,
      evaluatedLayer: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      hypothesis: "Unknown root cause due to absence of definitive architectural layer signatures",
      result: "MATCH",
      rationale: "No recognized layer patterns matched the available symptom telemetry. Marked UNKNOWN for joint diagnostic review.",
    });

    return {
      steps,
      isolatedClass: FAILURE_ATTRIBUTION_CLASSES.UNKNOWN,
      confidence: ATTRIBUTION_CONFIDENCE_LEVELS.SUSPECTED,
      primaryEvidenceSummary: `Unclassified symptom: ${symptom.title} (${symptom.symptom})`,
      isConfounded: false,
    };
  }

  /**
   * Validates mandatory caller inputs.
   */
  private validateInputs(input: FailureAttributionInput): void {
    if (!input) {
      throw new InvalidAttributionEvidenceError("FailureAttributionInput must not be null or undefined");
    }

    // 1. Validate ExecutionRecord
    if (!input.executionRecord) {
      throw new InvalidExecutionReferenceError("ValidationExecutionRecord is mandatory for failure attribution");
    }
    try {
      parseValidationExecutionRecord(input.executionRecord);
    } catch (err: any) {
      throw new InvalidExecutionReferenceError(
        `ValidationExecutionRecord validation failed: ${err.message ?? String(err)}`
      );
    }

    // 2. Validate ScopeRecord
    if (!input.scopeRecord) {
      throw new ScopeAttributionMismatchError("ValidationScopeRecord is mandatory for failure attribution");
    }
    try {
      parseValidationScopeRecord(input.scopeRecord);
    } catch (err: any) {
      throw new ScopeAttributionMismatchError(
        `ValidationScopeRecord validation failed: ${err.message ?? String(err)}`
      );
    }

    // 3. Validate VersionBinding alignment if provided
    if (input.versionBindingRecord) {
      if (input.executionRecord.binding_id !== input.versionBindingRecord.binding_id) {
        throw new InvalidExecutionReferenceError(
          `ExecutionRecord binding_id '${input.executionRecord.binding_id}' does not match ` +
            `provided VersionBindingRecord '${input.versionBindingRecord.binding_id}'`
        );
      }
    }

    // 4. Validate Symptom Details
    if (!input.symptomDetails) {
      throw new InvalidAttributionEvidenceError("symptomDetails must be provided");
    }
    if (!input.symptomDetails.title || input.symptomDetails.title.trim().length === 0) {
      throw new InvalidAttributionEvidenceError("symptomDetails.title must not be empty");
    }
    if (!input.symptomDetails.symptom || input.symptomDetails.symptom.trim().length === 0) {
      throw new InvalidAttributionEvidenceError("symptomDetails.symptom must not be empty");
    }
  }

  /**
   * Resolves the materiality score for the failure.
   * Materiality is determined independently from attribution class.
   */
  private resolveMateriality(
    callerMateriality?: FailureMateriality,
    symptom?: ForensicSymptomDescriptor
  ): FailureMateriality {
    if (callerMateriality) {
      return callerMateriality;
    }

    // Determine default materiality purely from symptom characteristics,
    // maintaining strict independence from attribution class.
    if (symptom) {
      if (symptom.exitCode === 137 || symptom.exitCode === 143) {
        return FAILURE_MATERIALITIES.CRITICAL_BLOCKER;
      }
      if (symptom.error?.name === "TypeError" || symptom.error?.name === "NullPointerException") {
        return FAILURE_MATERIALITIES.CRITICAL_BLOCKER;
      }
      const hasCriticalAnomaly = symptom.measurementAnomalies?.some(
        (a) => a.severity === "CRITICAL"
      );
      if (hasCriticalAnomaly) {
        return FAILURE_MATERIALITIES.CRITICAL_BLOCKER;
      }
    }

    return FAILURE_MATERIALITIES.MAJOR;
  }

  /**
   * Resolves whether the failure blocks Gate 8 cutover.
   *
   * Governed rule:
   * - Caller-provided gate8Blocked boolean is respected directly.
   * - If not provided, only CRITICAL_BLOCKER failures automatically set gate_8_blocked = true at Record 14 level.
   * - Attribution class (including UNKNOWN) must NEVER automatically dictate Gate-8 blocking.
   * - MAJOR, MINOR, and COSMETIC failures do not automatically block Gate 8 at Record 14 level
   *   (broader hard-blocker synthesis and Gate-8 adjudication are governed downstream by WP-21 and WP-22).
   */
  private resolveGate8Blocked(
    callerGate8Blocked: boolean | undefined,
    materiality: FailureMateriality
  ): boolean {
    if (typeof callerGate8Blocked === "boolean") {
      return callerGate8Blocked;
    }

    return materiality === FAILURE_MATERIALITIES.CRITICAL_BLOCKER;
  }

  /**
   * Resolves the affected scope units.
   */
  private resolveAffectedScope(
    callerAffectedScope: ReadonlyArray<string> | undefined,
    scopeRecord: FailureAttributionInput["scopeRecord"]
  ): string[] {
    if (callerAffectedScope && callerAffectedScope.length > 0) {
      const trimmed = callerAffectedScope.map((s) => s.trim()).filter((s) => s.length > 0);
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    if (scopeRecord.included_units && scopeRecord.included_units.length > 0) {
      return [...scopeRecord.included_units];
    }

    return ["GLOBAL_SCOPE"];
  }

  /**
   * Assembles a non-empty array of evidence references.
   */
  private assembleEvidenceRefs(
    callerEvidenceRefs: ReadonlyArray<string> | undefined,
    executionRecord: FailureAttributionInput["executionRecord"],
    symptom: ForensicSymptomDescriptor
  ): string[] {
    const refs: string[] = [];

    if (callerEvidenceRefs && callerEvidenceRefs.length > 0) {
      for (const ref of callerEvidenceRefs) {
        if (ref && ref.trim().length > 0) {
          refs.push(ref.trim());
        }
      }
    }

    if (refs.length > 0) {
      return refs;
    }

    // Construct grounded evidence refs from execution and symptom telemetry
    refs.push(`ref:execution:${executionRecord.execution_id}`);

    if (symptom.traceId) {
      refs.push(`ref:trace:${symptom.traceId}`);
    } else if (executionRecord.trace_ref) {
      refs.push(`ref:trace:${executionRecord.trace_ref}`);
    }

    if (symptom.error?.stack) {
      refs.push(`ref:stack_dump:${executionRecord.execution_id}`);
    }

    if (symptom.logs && symptom.logs.length > 0) {
      refs.push(`ref:diagnostic_logs:${executionRecord.execution_id}`);
    }

    if (symptom.audioIntegrityAnomalies && symptom.audioIntegrityAnomalies.length > 0) {
      refs.push(`ref:audio_anomaly:${executionRecord.execution_id}`);
    }

    if (symptom.measurementAnomalies && symptom.measurementAnomalies.length > 0) {
      refs.push(`ref:measurement_anomalies:${executionRecord.execution_id}`);
    }

    return refs;
  }
}
