// src/sound-engineer/validation/traceability/parameterProvenance.ts
// WP-29 Stage 2 Slice 1D: Level 3 Parameter Provenance Index & Query
// Implementation-local subsystem providing deterministic index and query
// capabilities for platform-specific parameter provenance chains.
//
// FROZEN CAPABILITY BOUNDARY:
// Maximum supportable level: LEVEL_3_DECISION_RECORD_TRACE
// Chain: Parameter -> PlatformTranslationItem -> SemanticProcessingStage -> EngineeringDecisionRecord
// Level 4 (exact decision item) and Level 5 (causal chain) are UNSUPPORTED by current runtime contracts.

import { RunId } from "../../execution";
import { RunTrace, TraceId } from "../../trace/runTrace";
import { SOUND_ENGINEER_LAYERS } from "../../checkpoints/layerIdentity";
import {
  PlatformTranslationPlan,
  PlatformTranslationItem,
  isPlatformTranslationPlan,
} from "../../layer-contracts/platformTranslationPlan";
import {
  SemanticToneDesign,
  SemanticProcessingStage,
  isSemanticToneDesign,
} from "../../layer-contracts/semanticToneDesign";
import {
  EngineeringDecisionRecord,
  isEngineeringDecisionRecord,
} from "../../layer-contracts/engineeringDecisionRecord";
import { deepFreeze } from "../../contracts/immutability";
import {
  ParameterIdentity,
  formatParameterKey,
  PARAMETER_PROVENANCE_LEVELS,
  MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
  ParameterProvenanceCapabilityLevel,
  ParameterProvenanceEntry,
  ParameterProvenanceSummary,
  ParameterProvenanceTranslationContext,
  ParameterProvenanceSemanticContext,
  ParameterProvenanceDecisionContext,
  TraceabilityFinding,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_CATEGORIES,
  TRACEABILITY_FINDING_SEVERITIES,
} from "./traceabilityTypes";

/**
 * Input artifacts for building a ParameterProvenanceIndex.
 * Uses existing runtime contracts only; no shadow adapters or mock copies.
 */
export interface ParameterProvenanceArtifactInputs {
  /** Optional bound trace identifier */
  readonly traceId?: TraceId;

  /** Optional bound execution run identifier */
  readonly runId?: RunId;

  readonly plan?: PlatformTranslationPlan | null;
  readonly semanticDesign?: SemanticToneDesign | null;
  readonly decisionRecord?: EngineeringDecisionRecord | null;
}

/**
 * Result structure returned when querying unsupported Level 4 or Level 5 provenance.
 */
export interface UnsupportedProvenanceQueryResult {
  readonly supported: false;
  readonly level: ParameterProvenanceCapabilityLevel;
  readonly reason: string;
}

/**
 * ParameterProvenanceIndex: In-memory index owned by WP-29 traceability subsystem.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTIONS:
 * 1. Implementation-local only:
 *    Never creates graph edges, persists to ValidationRelationshipGraph,
 *    or introduces global enums.
 * 2. Capped at Level 3:
 *    Parameter -> PlatformTranslationItem -> SemanticProcessingStage -> EngineeringDecisionRecord
 *    Does NOT infer exact EngineeringDecisionItem (Level 4) or causal chains (Level 5).
 * 3. Collision handling:
 *    Does NOT overwrite on composite key collision. Preserves all entries,
 *    marks ambiguous, and emits NOT_VERIFIABLE finding.
 * 4. Trace Isolation:
 *    Belongs structurally to exactly one RunTrace / execution run context.
 */
export class ParameterProvenanceIndex {
  /** Bound trace identifier if constructed in a RunTrace context */
  public readonly traceId?: TraceId;

  /** Bound execution run identifier */
  public readonly runId?: RunId;

  private readonly entriesByKey = new Map<string, ParameterProvenanceEntry[]>();
  private readonly allEntriesList: ParameterProvenanceEntry[] = [];
  private readonly findingsList: TraceabilityFinding[] = [];
  private readonly summaryData: ParameterProvenanceSummary;

  private constructor(
    entriesByKey: Map<string, ParameterProvenanceEntry[]>,
    allEntriesList: ParameterProvenanceEntry[],
    findingsList: TraceabilityFinding[],
    traceId?: TraceId,
    runId?: RunId
  ) {
    this.entriesByKey = entriesByKey;
    this.allEntriesList = allEntriesList;
    this.findingsList = findingsList;
    this.traceId = traceId;
    this.runId = runId;

    const totalParametersEncountered = allEntriesList.length;
    const totalIndexEntries = allEntriesList.length;

    let ambiguousKeysCount = 0;
    let ambiguousEntriesCount = 0;
    for (const list of entriesByKey.values()) {
      if (list.length > 1) {
        ambiguousKeysCount++;
        ambiguousEntriesCount += list.length;
      }
    }

    let level1ExactCount = 0;
    let level2ExactCount = 0;
    let level3ExactCount = 0;

    for (const entry of allEntriesList) {
      if (entry.provenanceLevel === PARAMETER_PROVENANCE_LEVELS.LEVEL_1_PARAMETER_IDENTITY) {
        level1ExactCount++;
      } else if (entry.provenanceLevel === PARAMETER_PROVENANCE_LEVELS.LEVEL_2_DESIGN_TRACE) {
        level2ExactCount++;
      } else if (entry.provenanceLevel === PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE) {
        level3ExactCount++;
      }
    }

    const level1CumulativeCount = totalIndexEntries;
    const level2CumulativeCount = level2ExactCount + level3ExactCount;
    const level3CumulativeCount = level3ExactCount;
    const unresolvedEntriesCount = level1ExactCount + level2ExactCount;

    const maxLevelReached: ParameterProvenanceCapabilityLevel =
      level3ExactCount > 0
        ? PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE
        : level2ExactCount > 0
        ? PARAMETER_PROVENANCE_LEVELS.LEVEL_2_DESIGN_TRACE
        : level1ExactCount > 0
        ? PARAMETER_PROVENANCE_LEVELS.LEVEL_1_PARAMETER_IDENTITY
        : MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL;

    this.summaryData = Object.freeze({
      totalParametersEncountered,
      totalIndexEntries,
      uniqueKeysCount: entriesByKey.size,
      ambiguousKeysCount,
      ambiguousEntriesCount,
      level1ExactCount,
      level2ExactCount,
      level3ExactCount,
      level1CumulativeCount,
      level2CumulativeCount,
      level3CumulativeCount,
      unresolvedEntriesCount,
      maxLevelReached,

      // Backward-compatibility aliases
      totalIndexedParameters: totalIndexEntries,
      level1OnlyCount: level1ExactCount,
      level2Count: level2ExactCount,
      level3Count: level3ExactCount,
    });

    deepFreeze(this.allEntriesList);
    deepFreeze(this.findingsList);
  }

  /**
   * Builds an index directly from provided runtime artifacts.
   */
  public static fromArtifacts(
    inputs: ParameterProvenanceArtifactInputs
  ): ParameterProvenanceIndex {
    const entriesByKey = new Map<string, ParameterProvenanceEntry[]>();
    const allEntriesList: ParameterProvenanceEntry[] = [];
    const findingsList: TraceabilityFinding[] = [];

    const { plan, semanticDesign, decisionRecord } = inputs;
    const effectiveTraceId = inputs.traceId;
    const effectiveRunId = inputs.runId ?? (plan?.runId as RunId | undefined);

    if (!plan || !Array.isArray(plan.translationDecisions) || plan.translationDecisions.length === 0) {
      return new ParameterProvenanceIndex(
        entriesByKey,
        allEntriesList,
        findingsList,
        effectiveTraceId,
        effectiveRunId
      );
    }

    // Map semantic stages by stageId for Level 2 resolution
    const semanticStagesById = new Map<string, SemanticProcessingStage>();
    if (semanticDesign && Array.isArray(semanticDesign.stages)) {
      for (const stg of semanticDesign.stages) {
        if (stg && typeof stg.stageId === "string") {
          semanticStagesById.set(stg.stageId.trim(), stg);
        }
      }
    }

    // Determine whether upstream EngineeringDecisionRecord resolves for Level 3
    let decisionContext: ParameterProvenanceDecisionContext | undefined;
    if (decisionRecord && isEngineeringDecisionRecord(decisionRecord)) {
      const semRef = semanticDesign?.decisionRecordReference;
      const refMatches =
        semRef &&
        (semRef.artifactId === decisionRecord.decisionRecordId ||
          (Boolean(semanticDesign?.runId) && semanticDesign?.runId === decisionRecord.runId));

      if (refMatches) {
        decisionContext = Object.freeze({
          decisionRecordId: decisionRecord.decisionRecordId,
          overallObjective: decisionRecord.overallObjective,
          confidence: decisionRecord.confidence,
          evidenceReference: decisionRecord.evidenceReference,
        });
      }
    }

    // Process every translation decision and extract platform-specific parameters
    for (const item of plan.translationDecisions) {
      if (!item || typeof item !== "object") continue;

      const stageId = item.stageId?.trim() ?? "";
      const semanticRole = item.semanticRole?.trim() ?? "";
      const mapping = item.mappingDecision;

      if (!stageId || !mapping || typeof mapping !== "object") continue;

      const targetDeviceId = mapping.targetDeviceId?.trim() ?? "";
      const targetDeviceName = mapping.targetDeviceName ?? "";
      const deviceCategory = mapping.deviceCategory ?? "";
      const rationale = item.rationale ?? "";
      const confidence = item.confidence;

      const rawParams = mapping.platformSpecificParameters;
      if (!rawParams || typeof rawParams !== "object" || Array.isArray(rawParams)) {
        continue;
      }

      const paramEntries = Object.entries(rawParams);
      for (const [paramName, paramVal] of paramEntries) {
        if (typeof paramName !== "string" || paramName.length === 0) continue;

        const identity: ParameterIdentity = Object.freeze({
          stageId,
          targetDeviceId,
          parameterName: paramName,
        });
        const key = formatParameterKey(identity);

        // Level 1 Translation Context
        const translationContext: ParameterProvenanceTranslationContext = Object.freeze({
          stageId,
          semanticRole,
          targetDeviceId,
          targetDeviceName,
          deviceCategory,
          rationale,
          confidence,
        });

        // Level 2 Semantic Stage Resolution
        let semanticContext: ParameterProvenanceSemanticContext | undefined;
        let provenanceLevel: ParameterProvenanceCapabilityLevel =
          PARAMETER_PROVENANCE_LEVELS.LEVEL_1_PARAMETER_IDENTITY;

        const matchedStage = semanticStagesById.get(stageId);
        if (matchedStage) {
          semanticContext = Object.freeze({
            stageId: matchedStage.stageId,
            stageIndex: matchedStage.stageIndex,
            role: matchedStage.role,
            designIntent: matchedStage.designIntent,
            constraints: Object.freeze([...(matchedStage.constraints ?? [])]),
          });
          provenanceLevel = PARAMETER_PROVENANCE_LEVELS.LEVEL_2_DESIGN_TRACE;
        } else {
          findingsList.push(
            Object.freeze({
              code: "WARN_PARAM_SEMANTIC_STAGE_UNRESOLVED",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              targetId: key,
              message: `Parameter "${paramName}" (key: "${key}") stageId "${stageId}" does not resolve to an existing SemanticProcessingStage`,
            })
          );
        }

        // Level 3 Engineering Decision Record Resolution
        let resolvedDecision: ParameterProvenanceDecisionContext | undefined;
        if (matchedStage) {
          if (decisionContext) {
            resolvedDecision = decisionContext;
            provenanceLevel = PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE;
          } else {
            findingsList.push(
              Object.freeze({
                code: "WARN_PARAM_DECISION_RECORD_UNRESOLVED",
                type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
                category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
                severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
                targetId: key,
                message: `Parameter "${paramName}" (key: "${key}") semantic design does not resolve to an EngineeringDecisionRecord`,
              })
            );
          }
        }

        // Collision Check on composite index key
        const isUnresolved = !matchedStage || !resolvedDecision;
        const existingList = entriesByKey.get(key);
        if (existingList) {
          // Mark all existing entries and this new entry as ambiguous
          for (let i = 0; i < existingList.length; i++) {
            const ex = existingList[i];
            if (!ex.isAmbiguous) {
              const updatedEx: ParameterProvenanceEntry = Object.freeze({
                ...ex,
                isAmbiguous: true,
              });
              existingList[i] = updatedEx;
              const allIdx = allEntriesList.indexOf(ex);
              if (allIdx >= 0) {
                allEntriesList[allIdx] = updatedEx;
              }
            }
          }

          const entry: ParameterProvenanceEntry = Object.freeze({
            traceId: effectiveTraceId,
            runId: effectiveRunId,
            identity,
            parameterKey: key,
            translatedValue: paramVal,
            provenanceLevel,
            isAmbiguous: true,
            isUnresolved,
            translationItem: translationContext,
            semanticStage: semanticContext,
            decisionRecord: resolvedDecision,
          });

          existingList.push(entry);
          allEntriesList.push(entry);

          findingsList.push(
            Object.freeze({
              code: "WARN_PARAM_KEY_COLLISION_AMBIGUOUS",
              type: TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE,
              category: TRACEABILITY_FINDING_CATEGORIES.PARAMETER_PROVENANCE,
              severity: TRACEABILITY_FINDING_SEVERITIES.WARNING,
              targetId: key,
              message: `Duplicate composite parameter key collision detected for "${key}". Preserving all colliding entries marked ambiguous.`,
            })
          );
        } else {
          const entry: ParameterProvenanceEntry = Object.freeze({
            traceId: effectiveTraceId,
            runId: effectiveRunId,
            identity,
            parameterKey: key,
            translatedValue: paramVal,
            provenanceLevel,
            isAmbiguous: false,
            isUnresolved,
            translationItem: translationContext,
            semanticStage: semanticContext,
            decisionRecord: resolvedDecision,
          });

          entriesByKey.set(key, [entry]);
          allEntriesList.push(entry);
        }
      }
    }

    return new ParameterProvenanceIndex(
      entriesByKey,
      allEntriesList,
      findingsList,
      effectiveTraceId,
      effectiveRunId
    );
  }

  /**
   * Builds an index by extracting artifacts from an execution RunTrace.
   */
  public static fromTrace(runTrace: RunTrace): ParameterProvenanceIndex {
    if (!runTrace || !Array.isArray(runTrace.checkpoints)) {
      return new ParameterProvenanceIndex(new Map(), [], [], runTrace?.traceId, runTrace?.runId);
    }

    let plan: PlatformTranslationPlan | undefined;
    let semanticDesign: SemanticToneDesign | undefined;
    let decisionRecord: EngineeringDecisionRecord | undefined;

    for (const entry of runTrace.checkpoints) {
      const layer = entry.checkpoint?.layer;
      const payload = entry.checkpoint?.payload;

      if (layer === SOUND_ENGINEER_LAYERS.PLATFORM_TRANSLATION && isPlatformTranslationPlan(payload)) {
        plan = payload;
      } else if (layer === SOUND_ENGINEER_LAYERS.SEMANTIC_DESIGN && isSemanticToneDesign(payload)) {
        semanticDesign = payload;
      } else if (layer === SOUND_ENGINEER_LAYERS.ENGINEERING && isEngineeringDecisionRecord(payload)) {
        decisionRecord = payload;
      }
    }

    return ParameterProvenanceIndex.fromArtifacts({
      traceId: runTrace.traceId,
      runId: runTrace.runId,
      plan,
      semanticDesign,
      decisionRecord,
    });
  }

  /**
   * Queries provenance for a parameter by key string or ParameterIdentity.
   * If collision occurred on this key, returns readonly array of all colliding entries.
   * If uniquely identified, returns the single ParameterProvenanceEntry.
   * If not found, returns undefined.
   */
  public lookup(
    keyOrIdentity: string | ParameterIdentity
  ): ParameterProvenanceEntry | readonly ParameterProvenanceEntry[] | undefined {
    const key =
      typeof keyOrIdentity === "string" ? keyOrIdentity : formatParameterKey(keyOrIdentity);
    const list = this.entriesByKey.get(key);
    if (!list || list.length === 0) return undefined;
    if (list.length === 1) return list[0];
    return Object.freeze([...list]);
  }

  /**
   * Queries provenance expecting a single unique match.
   * If not found or if collision/ambiguity exists, returns undefined.
   */
  public getSingle(
    keyOrIdentity: string | ParameterIdentity
  ): ParameterProvenanceEntry | undefined {
    const key =
      typeof keyOrIdentity === "string" ? keyOrIdentity : formatParameterKey(keyOrIdentity);
    const list = this.entriesByKey.get(key);
    if (!list || list.length !== 1) return undefined;
    return list[0];
  }

  /**
   * Returns all entries stored for a key or identity (empty array if none found).
   */
  public getAll(
    keyOrIdentity: string | ParameterIdentity
  ): readonly ParameterProvenanceEntry[] {
    const key =
      typeof keyOrIdentity === "string" ? keyOrIdentity : formatParameterKey(keyOrIdentity);
    const list = this.entriesByKey.get(key);
    if (!list) return Object.freeze([]);
    return Object.freeze([...list]);
  }

  /**
   * Returns whether an entry exists for the given key or identity.
   */
  public has(keyOrIdentity: string | ParameterIdentity): boolean {
    const key =
      typeof keyOrIdentity === "string" ? keyOrIdentity : formatParameterKey(keyOrIdentity);
    return this.entriesByKey.has(key);
  }

  /**
   * Returns whether multiple distinct translation items collided on this composite key.
   */
  public isAmbiguous(keyOrIdentity: string | ParameterIdentity): boolean {
    const key =
      typeof keyOrIdentity === "string" ? keyOrIdentity : formatParameterKey(keyOrIdentity);
    const list = this.entriesByKey.get(key);
    return Boolean(list && list.length > 1);
  }

  /**
   * Returns all parameter provenance entries for a given stageId.
   */
  public getByStageId(stageId: string): readonly ParameterProvenanceEntry[] {
    const trimmed = stageId.trim();
    const results = this.allEntriesList.filter((e) => e.identity.stageId === trimmed);
    return Object.freeze([...results]);
  }

  /**
   * Returns all parameter provenance entries for a given targetDeviceId.
   */
  public getByTargetDeviceId(targetDeviceId: string): readonly ParameterProvenanceEntry[] {
    const trimmed = targetDeviceId.trim();
    const results = this.allEntriesList.filter((e) => e.identity.targetDeviceId === trimmed);
    return Object.freeze([...results]);
  }

  /**
   * Returns all parameter provenance entries matching a specific provenance capability level.
   */
  public getByProvenanceLevel(
    level: ParameterProvenanceCapabilityLevel
  ): readonly ParameterProvenanceEntry[] {
    const results = this.allEntriesList.filter((e) => e.provenanceLevel === level);
    return Object.freeze([...results]);
  }

  /**
   * Returns all indexed parameter provenance entries.
   */
  public getAllEntries(): readonly ParameterProvenanceEntry[] {
    return Object.freeze([...this.allEntriesList]);
  }

  /**
   * Returns all unique composite keys currently in the index.
   */
  public getAllKeys(): readonly string[] {
    return Object.freeze(Array.from(this.entriesByKey.keys()));
  }

  /**
   * Returns all composite keys that encountered collisions (ambiguous keys).
   */
  public getAmbiguousKeys(): readonly string[] {
    const ambiguous: string[] = [];
    for (const [key, list] of this.entriesByKey.entries()) {
      if (list.length > 1) {
        ambiguous.push(key);
      }
    }
    return Object.freeze(ambiguous);
  }

  /**
   * Returns the factual summary of parameter provenance indexing.
   */
  public getSummary(): ParameterProvenanceSummary {
    return this.summaryData;
  }

  /**
   * Returns all implementation-local traceability findings emitted during index construction.
   */
  public getFindings(): readonly TraceabilityFinding[] {
    return Object.freeze([...this.findingsList]);
  }

  /**
   * Number of unique composite keys in the index.
   */
  public get size(): number {
    return this.entriesByKey.size;
  }

  /**
   * Total number of indexed parameter entries across all keys.
   */
  public get totalParameters(): number {
    return this.allEntriesList.length;
  }

  /**
   * Inquires for Level 4 provenance (exact EngineeringDecisionItem).
   * Truthfully reports UNSUPPORTED without attempting heuristic inference.
   * This query does NOT mutate the index, does not alter findings, and does not affect audit verdicts.
   */
  public queryLevel4Item(
    _keyOrIdentity: string | ParameterIdentity
  ): UnsupportedProvenanceQueryResult {
    return Object.freeze({
      supported: false,
      level: PARAMETER_PROVENANCE_LEVELS.LEVEL_4_EXACT_DECISION_TRACE,
      reason:
        "LEVEL_4_EXACT_DECISION_TRACE is not supported by current runtime contracts: neither SemanticProcessingStage nor PlatformTranslationItem contains an explicit canonical pointer to EngineeringDecisionItem.decisionId",
    });
  }

  /**
   * Inquires for Level 5 provenance (exact decision -> requirement -> diagnosis -> observation).
   * Truthfully reports UNSUPPORTED without attempting heuristic inference.
   * This query does NOT mutate the index, does not alter findings, and does not affect audit verdicts.
   */
  public queryLevel5Causal(
    _keyOrIdentity: string | ParameterIdentity
  ): UnsupportedProvenanceQueryResult {
    return Object.freeze({
      supported: false,
      level: PARAMETER_PROVENANCE_LEVELS.LEVEL_5_EXACT_CAUSAL_TRACE,
      reason:
        "LEVEL_5_EXACT_CAUSAL_TRACE is not supported by current runtime contracts",
    });
  }
}

/**
 * Functional entry point to build a ParameterProvenanceIndex.
 */
export function buildParameterProvenanceIndex(
  source: RunTrace | ParameterProvenanceArtifactInputs
): ParameterProvenanceIndex {
  if (source && "checkpoints" in source && Array.isArray((source as RunTrace).checkpoints)) {
    return ParameterProvenanceIndex.fromTrace(source as RunTrace);
  }
  return ParameterProvenanceIndex.fromArtifacts(source as ParameterProvenanceArtifactInputs);
}
