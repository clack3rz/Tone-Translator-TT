// src/sound-engineer/validation/evidence/uatEvaluationEngine.ts
// UATEvaluationEngine: Governed, task-based UAT evaluation subsystem.
// Produces UATEvaluationRecord (Record 12).
// Phase 1C.5h — WP-13.
// Bound to frozen specification v0.1j Section 17, Section 33, Table 05, Table 06,
// and Implementation Plan v0.1h WP-13.

import { deepFreeze } from "../../contracts/immutability";
import {
  EVALUATOR_PERSONAS,
  EvaluatorPersona,
  TEST_PROFILE_FAMILIES,
} from "../schemas/enums";
import {
  UATEvaluationRecord,
  uatEvaluationRecordSchema,
  ValidationPackage,
  validationPackageSchema,
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
  CANONICAL_EVALUATOR_PERSONAS,
  CANONICAL_UAT_PROFILES,
  TaskScenario,
  UATCoverageReport,
  UATEngineDependencies,
  UATEvaluationInput,
  UATMetricProfile,
  UATMetricResolverInterface,
} from "./uatTypes";
import {
  InapplicableUATProfileError,
  IneligibleUATPackageError,
  InvalidTaskScenarioError,
} from "./uatErrors";
import { UATMetricResolver } from "./uatMetricResolver";
import { TaskScenarioRunner } from "./taskScenarioRunner";
import { UATCoverageValidator } from "./uatCoverageValidator";

/**
 * Normalizes text to a clean slug.
 */
function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Normalizes a test profile identifier for comparison across enums and short codes
 * (e.g. "PROFILE-14", "PROFILE_14_USER_WORKFLOW_UAT", "profile-07").
 */
function normalizeProfileId(id: string): string {
  return id.trim().toUpperCase().replace(/[-_]/g, "");
}

/**
 * Checks if assigned profiles in a ValidationPackage include any UAT-relevant profile.
 * Standard matches:
 * - "PROFILE-14" or TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT
 * - "PROFILE-07" or TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY
 */
function hasApplicableUATProfile(assignedProfiles: ReadonlyArray<string>): boolean {
  if (!assignedProfiles || assignedProfiles.length === 0) {
    return false;
  }
  return assignedProfiles.some((p) => {
    const norm = normalizeProfileId(p);
    return (
      norm.includes("PROFILE14") ||
      norm.includes("PROFILE07") ||
      norm.includes("PROFILE7")
    );
  });
}

/**
 * UATEvaluationEngine:
 * Implements the governed, task-based UAT evaluation subsystem that measures:
 * - workflow completion;
 * - workflow friction;
 * - task duration;
 * - workflow satisfaction;
 * - musical fitness;
 * - explicit blockers
 * across the four canonical evaluator personas.
 *
 * Produces UATEvaluationRecord (Record 12).
 *
 * Anti-Scope-Creep Guard:
 * Does NOT perform objective acoustic measurement (WP-11), perceptual listening (WP-12),
 * regression classification (WP-15), conflict reconciliation (WP-17), uncertainty synthesis (WP-18),
 * outcome synthesis (WP-19), or Gate 8 adjudication (WP-22).
 */
export class UATEvaluationEngine {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;
  private readonly integrityProvider: IntegrityProvider;
  private readonly metricResolver: UATMetricResolverInterface;
  private readonly scenarioRegistry: Map<string, TaskScenario> = new Map();

  /** Immutable in-memory registry of recorded UATEvaluationRecords */
  private readonly evaluationRegistry: Map<string, UATEvaluationRecord> = new Map();

  constructor(dependencies: UATEngineDependencies = {}) {
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
    this.integrityProvider =
      dependencies.integrityProvider ?? DEFAULT_INTEGRITY_PROVIDER;
    this.metricResolver =
      dependencies.metricResolver ?? new UATMetricResolver();

    if (dependencies.scenarios) {
      for (const scenario of dependencies.scenarios) {
        this.registerScenario(scenario);
      }
    }
  }

  /**
   * Registers a bounded TaskScenario in the engine's registry.
   */
  public registerScenario(scenario: TaskScenario): void {
    TaskScenarioRunner.validateScenarioDefinition(scenario);
    this.scenarioRegistry.set(
      scenario.taskScenarioId,
      deepFreeze({ ...scenario })
    );
  }

  public getScenario(scenarioId: string): TaskScenario | undefined {
    return this.scenarioRegistry.get(scenarioId);
  }

  public getAllScenarios(): ReadonlyArray<TaskScenario> {
    return Array.from(this.scenarioRegistry.values());
  }

  /**
   * Generates a deterministic unique identifier for Record 12 evidence.
   */
  private generateUatId(
    packageId: string,
    persona: EvaluatorPersona,
    scenarioId: string
  ): string {
    const raw = `${packageId}:${persona}:${scenarioId}:${Math.random().toString(36).substring(2, 9)}`;
    const digest = this.integrityProvider.computeDigest(raw).substring(7, 19);
    return `UAT-${toSlug(packageId)}-${toSlug(persona)}-${toSlug(scenarioId)}-${digest}`;
  }

  /**
   * Records a governed UAT task evaluation, producing an immutable UATEvaluationRecord (Record 12).
   */
  public recordEvaluation(input: UATEvaluationInput): UATEvaluationRecord {
    // -------------------------------------------------------------------------
    // 1. Package Eligibility & Schema Validation
    // -------------------------------------------------------------------------
    if (!input || !input.packageRecord) {
      throw new IneligibleUATPackageError(
        "UNDEFINED",
        "packageRecord is missing or null."
      );
    }

    try {
      validationPackageSchema.parse(input.packageRecord);
    } catch (err: unknown) {
      throw new IneligibleUATPackageError(
        input.packageRecord?.package_id ?? "UNKNOWN",
        `ValidationPackage schema validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const pkg = input.packageRecord;

    // -------------------------------------------------------------------------
    // 2. UAT Profile Applicability Check (PROFILE-07 / PROFILE-14)
    // -------------------------------------------------------------------------
    if (!hasApplicableUATProfile(pkg.assigned_test_profiles)) {
      throw new InapplicableUATProfileError(
        pkg.package_id,
        pkg.assigned_test_profiles.join(", ") || "NONE",
        "ValidationPackage does not have PROFILE-14 (User-Workflow / UAT) or PROFILE-07 (Playability) assigned. UAT cannot be generated for packages lacking applicable UAT profiles."
      );
    }

    // -------------------------------------------------------------------------
    // 3. Resolve and Validate Task Scenario
    // -------------------------------------------------------------------------
    const observation = input.observation;
    if (!observation) {
      throw new InvalidTaskScenarioError(
        "UNDEFINED",
        "observation payload is missing or null."
      );
    }

    // Resolve scenario definition
    let scenario = input.scenario ?? this.scenarioRegistry.get(observation.taskScenarioId);

    if (!scenario) {
      // If scenario was not pre-registered or explicitly provided, fail closed
      throw new InvalidTaskScenarioError(
        observation.taskScenarioId,
        `Task scenario "${observation.taskScenarioId}" is not registered in the engine and was not supplied in the evaluation input.`
      );
    }

    // Scope check: Ensure scenario is bounded and applicable to package's assigned profiles
    if (scenario.applicableProfiles.length > 0) {
      const hasMatchingProfile = scenario.applicableProfiles.some((prof) => {
        const normProf = normalizeProfileId(prof);
        return pkg.assigned_test_profiles.some((assigned) => {
          const normAssigned = normalizeProfileId(assigned);
          return normAssigned.includes(normProf) || normProf.includes(normAssigned);
        });
      });
      if (!hasMatchingProfile) {
        throw new InvalidTaskScenarioError(
          scenario.taskScenarioId,
          `Task scenario requires profiles [${scenario.applicableProfiles.join(", ")}], but package only assigns [${pkg.assigned_test_profiles.join(", ")}]. Out-of-scope scenario execution rejected.`
        );
      }
    }

    // -------------------------------------------------------------------------
    // 4. Validate Scenario Execution via TaskScenarioRunner
    // -------------------------------------------------------------------------
    const validated = TaskScenarioRunner.executeScenario({
      scenario,
      observation,
      metricResolver: this.metricResolver,
    });

    // -------------------------------------------------------------------------
    // 5. Assemble and Validate Record 12 (UATEvaluationRecord)
    // -------------------------------------------------------------------------
    const uatId =
      input.uatId ??
      this.generateUatId(pkg.package_id, validated.evaluatorPersona, validated.taskScenarioId);

    const rawRecord = {
      uat_id: uatId,
      package_id: pkg.package_id,
      evaluator_persona: validated.evaluatorPersona,
      task_scenario_id: validated.taskScenarioId,
      task_completion_status: validated.taskCompletionStatus,
      task_duration_seconds: validated.taskDurationSeconds,
      workflow_satisfaction_rating: validated.workflowSatisfactionRating,
      cognitive_friction_notes: validated.cognitiveFrictionNotes,
      musical_fitness_verdict: validated.musicalFitnessVerdict,
      uat_blockers_identified: validated.uatBlockersIdentified,
    };

    // Strict schema parse ensures zero extraneous fields
    const validatedRecord: UATEvaluationRecord = uatEvaluationRecordSchema.parse(rawRecord);
    const frozenRecord = deepFreeze(validatedRecord);

    // Save in historical registry
    this.evaluationRegistry.set(uatId, frozenRecord);

    // -------------------------------------------------------------------------
    // 6. Graph Lineage & Governance Ownership (EVALUATED_BY only)
    // -------------------------------------------------------------------------
    // Canonical edge: UATEvaluationRecord -> EvaluatorPersona (EVALUATED_BY)
    // Strictly NO reverse edge, NO widened EVIDENCED_BY, NO UATEvaluationRecord -> ValidationCase.
    if (this.graph) {
      // 1. Register UATEvaluationRecord node
      if (!this.graph.hasNode(uatId)) {
        this.graph.registerNode({
          id: uatId,
          kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
        });
      }

      // 2. Register EvaluatorPersona node
      const personaId =
        observation.evaluatorPersonaId ??
        `evaluator_persona:${validated.evaluatorPersona.toLowerCase()}`;
      if (!this.graph.hasNode(personaId)) {
        this.graph.registerNode({
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        });
      }

      // 3. Add canonical directional edge: UATEvaluationRecord -> EvaluatorPersona
      this.graph.addEdge({
        source: {
          id: uatId,
          kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
        },
        target: {
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        },
        edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
      });
    }

    // -------------------------------------------------------------------------
    // 7. Audit Ledger Persistence
    // -------------------------------------------------------------------------
    if (this.ledger) {
      const nowIso = new Date().toISOString();
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
        uatId,
        frozenRecord,
        nowIso
      );

      const personaId =
        observation.evaluatorPersonaId ??
        `evaluator_persona:${validated.evaluatorPersona.toLowerCase()}`;
      const evaluatedByEdgeId = createCanonicalEdgeId(
        GOVERNED_EDGE_TYPES.EVALUATED_BY,
        uatId,
        personaId
      );
      this.ledger.appendEdge({
        edgeId: evaluatedByEdgeId,
        edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
        source: {
          id: uatId,
          kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord,
        },
        target: {
          id: personaId,
          kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona,
        },
        isSymmetric: false,
        createdAt: nowIso,
      });
    }

    return frozenRecord;
  }

  /**
   * Retrieves an immutable evaluation record by uat_id.
   */
  public getEvaluation(uatId: string): UATEvaluationRecord | undefined {
    return this.evaluationRegistry.get(uatId);
  }

  /**
   * Retrieves all recorded evaluations.
   */
  public getAllEvaluations(): ReadonlyArray<UATEvaluationRecord> {
    return Array.from(this.evaluationRegistry.values());
  }

  /**
   * Retrieves all recorded evaluations for a specific package_id.
   */
  public getEvaluationsForPackage(packageId: string): ReadonlyArray<UATEvaluationRecord> {
    return Array.from(this.evaluationRegistry.values()).filter(
      (ev) => ev.package_id === packageId
    );
  }

  /**
   * Retrieves all recorded evaluations by evaluator persona.
   */
  public getEvaluationsByPersona(
    persona: EvaluatorPersona
  ): ReadonlyArray<UATEvaluationRecord> {
    return Array.from(this.evaluationRegistry.values()).filter(
      (ev) => ev.evaluator_persona === persona
    );
  }

  public getEvaluationCount(): number {
    return this.evaluationRegistry.size;
  }

  /**
   * Evaluates persona coverage for a given package without fabricating fake records.
   */
  public validatePersonaCoverage(
    packageId: string,
    requiredPersonas?: ReadonlyArray<EvaluatorPersona>
  ): UATCoverageReport {
    return UATCoverageValidator.evaluateCoverage(
      packageId,
      this.getEvaluationsForPackage(packageId),
      requiredPersonas
    );
  }
}
