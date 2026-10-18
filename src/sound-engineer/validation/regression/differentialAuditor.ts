// src/sound-engineer/validation/regression/differentialAuditor.ts
// DifferentialAuditingEngine: Orchestrates tripartite differential comparison and regression detection.
// Phase 1C.5h WP-15.
// Bound to frozen specification v0.1j Section 13, Section 34, and Implementation Plan v0.1h WP-15.

import { deepFreeze } from "../../contracts/immutability";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  REGRESSION_DOMAINS,
  RegressionDomain,
} from "../schemas/enums";
import {
  parseRegressionAssessmentRecord,
  parseValidationFixtureRecord,
  RegressionAssessmentRecord,
} from "../schemas/records";
import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  RelationshipEdge,
} from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import {
  DifferentialAuditResult,
  DifferentialAuditorInput,
  GoldenReferenceData,
  LegacyOutputData,
} from "./regressionTypes";
import {
  InvalidCandidateEvidenceError,
  InvalidGoldenReferenceError,
  InvalidPathProdBaselineError,
  ScopeMismatchError,
  VersionBindingMismatchError,
} from "./regressionErrors";
import { MaterialityResolver } from "./materialityResolver";
import { TripartiteComparator } from "./tripartiteComparator";
import { RegressionClassifier } from "./regressionClassifier";

/**
 * Permitted fixture classes for Golden Reference benchmarks under regression governance.
 */
const PERMITTED_GOLDEN_FIXTURE_CLASSES = new Set<string>([
  FIXTURE_CLASSES.DI_PERFORMANCE,
  FIXTURE_CLASSES.REFERENCE_TONE,
  FIXTURE_CLASSES.APPROVED_PRESET,
  FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK,
  FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL,
  FIXTURE_CLASSES.MULTITRACK_CONTEXT,
]);

export interface DifferentialAuditingEngineDependencies {
  readonly materialityResolver?: MaterialityResolver;
  readonly comparator?: TripartiteComparator;
  readonly classifier?: RegressionClassifier;
  readonly graph?: ValidationRelationshipGraph;
  readonly ledger?: ValidationAuditLedger;
}

export class DifferentialAuditingEngine {
  private readonly materialityResolver: MaterialityResolver;
  private readonly comparator: TripartiteComparator;
  private readonly classifier: RegressionClassifier;
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;

  constructor(dependencies: DifferentialAuditingEngineDependencies = {}) {
    this.materialityResolver = dependencies.materialityResolver ?? new MaterialityResolver();
    this.comparator = dependencies.comparator ?? new TripartiteComparator();
    this.classifier = dependencies.classifier ?? new RegressionClassifier(this.materialityResolver);
    this.graph = dependencies.graph;
    this.ledger = dependencies.ledger;
  }

  /**
   * Executes governed differential auditing across the tripartite comparison matrix.
   */
  public auditRegression(input: DifferentialAuditorInput): DifferentialAuditResult {
    const {
      packageRecord,
      scopeRecord,
      versionBindingRecord,
      candidateData,
      legacyOutput,
      goldenReference,
      materialityProfileRef,
      regressionDomain = REGRESSION_DOMAINS.ACOUSTIC,
      intentionalCorrectionIntent,
      customComparisonTarget,
    } = input;

    // 1. Validate Candidate Integrity & Scope
    this.validateCandidateIntegrity(packageRecord, scopeRecord, versionBindingRecord, candidateData);

    // 2. Validate Golden Reference Integrity
    this.validateGoldenReferenceIntegrity(goldenReference, scopeRecord);

    // 3. Validate PATH-PROD Legacy Baseline Integrity
    this.validateLegacyBaselineIntegrity(legacyOutput, candidateData);

    // 4. Resolve Materiality Profile (Fails closed if missing: no synthesized fallback)
    const profile = this.materialityResolver.resolveProfile(materialityProfileRef);

    // 5. Execute Tripartite Differential Comparison
    const tripartite = this.comparator.compareTripartite(
      candidateData,
      legacyOutput,
      goldenReference,
      regressionDomain
    );

    // 6. Execute Governed Classification
    const classificationResult = this.classifier.classify(
      tripartite,
      candidateData,
      legacyOutput,
      profile,
      intentionalCorrectionIntent
    );

    // 7. Bound Affected Scope strictly within declared scope boundaries
    const affectedScope = this.deriveAffectedScope(scopeRecord, tripartite);

    // 8. Generate Record 13: RegressionAssessmentRecord
    const regressionId = `reg_${packageRecord.package_id}_${Date.now()}`;
    const comparisonTarget =
      customComparisonTarget ??
      `tripartite:${legacyOutput.outputId}__${goldenReference.fixtureRecord.fixture_id}`;

    const rawRecord: RegressionAssessmentRecord = {
      regression_id: regressionId,
      package_id: packageRecord.package_id,
      comparison_target: comparisonTarget,
      divergence_detected: tripartite.primaryDivergenceDetected,
      divergence_magnitude: tripartite.primaryDivergenceMagnitude,
      classification: classificationResult.classification,
      materiality_score: classificationResult.materialityScore,
      affected_scope: affectedScope,
      regression_domain: regressionDomain,
      detailed_justification: classificationResult.justification,
      blocks_gate_8: classificationResult.blocksGate8,
    };

    // Strict schema parse ensures exact schema conformance (no extra fields, exact enums)
    const record = deepFreeze(parseRegressionAssessmentRecord(rawRecord));

    // 9. Relationship Graph Lineage: Exact COMPARED_AGAINST edge registration
    const edgesCreated: RelationshipEdge[] = [];
    if (this.graph) {
      // Register node descriptors if not already present
      if (!this.graph.hasNode(record.regression_id)) {
        this.graph.registerNode({
          id: record.regression_id,
          kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord,
        });
      }
      if (!this.graph.hasNode(legacyOutput.outputId)) {
        this.graph.registerNode({
          id: legacyOutput.outputId,
          kind: GOVERNED_ENTITY_KINDS.LegacyOutput,
        });
      }
      if (!this.graph.hasNode(goldenReference.fixtureRecord.fixture_id)) {
        this.graph.registerNode({
          id: goldenReference.fixtureRecord.fixture_id,
          kind: GOVERNED_ENTITY_KINDS.GoldenReference,
        });
      }

      // Edge 1: Record 13 -> LegacyOutput (canonical COMPARED_AGAINST)
      const edgeLegacy = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
        source: {
          id: record.regression_id,
          kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord,
        },
        target: {
          id: legacyOutput.outputId,
          kind: GOVERNED_ENTITY_KINDS.LegacyOutput,
        },
      });
      edgesCreated.push(edgeLegacy);

      // Edge 2: Record 13 -> GoldenReference (canonical COMPARED_AGAINST)
      const edgeGolden = this.graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.COMPARED_AGAINST,
        source: {
          id: record.regression_id,
          kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord,
        },
        target: {
          id: goldenReference.fixtureRecord.fixture_id,
          kind: GOVERNED_ENTITY_KINDS.GoldenReference,
        },
      });
      edgesCreated.push(edgeGolden);
    }

    // 10. Ledger append if present
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord,
        record.regression_id,
        record
      );
    }

    return deepFreeze({
      record,
      tripartiteComparison: tripartite,
      edgesCreated,
    });
  }

  /**
   * Validates Candidate comparison integrity, version binding, and scope compliance.
   */
  private validateCandidateIntegrity(
    packageRecord: DifferentialAuditorInput["packageRecord"],
    scopeRecord: DifferentialAuditorInput["scopeRecord"],
    versionBindingRecord: DifferentialAuditorInput["versionBindingRecord"],
    candidateData: DifferentialAuditorInput["candidateData"]
  ): void {
    if (!packageRecord || !packageRecord.package_id) {
      throw new InvalidCandidateEvidenceError("ValidationPackage is missing or invalid");
    }

    // Version binding alignment check
    if (packageRecord.version_binding_ref !== versionBindingRecord.binding_id) {
      throw new VersionBindingMismatchError(
        `Package binding ref '${packageRecord.version_binding_ref}' does not match ` +
          `provided VersionBindingRecord '${versionBindingRecord.binding_id}'`
      );
    }

    // Scope record reference check
    if (packageRecord.scope_record_ref !== scopeRecord.scope_id) {
      throw new ScopeMismatchError(
        `Package scope ref '${packageRecord.scope_record_ref}' does not match ` +
          `provided ValidationScopeRecord '${scopeRecord.scope_id}'`
      );
    }

    // Candidate execution check if execution record provided
    if (candidateData.execution) {
      if (candidateData.execution.binding_id !== versionBindingRecord.binding_id) {
        throw new VersionBindingMismatchError(
          `Candidate execution binding '${candidateData.execution.binding_id}' does not match ` +
            `VersionBindingRecord '${versionBindingRecord.binding_id}'`
        );
      }
    }
  }

  /**
   * Validates Golden Reference benchmark fixture against governed requirements:
   * - Valid schema
   * - Permitted fixture class
   * - Active lifecycle status
   * - Clean contamination status
   * - Valid non-empty payload integrity ref
   * - Declared applicability scope overlaps with validation scope
   */
  private validateGoldenReferenceIntegrity(
    goldenReference: GoldenReferenceData,
    scopeRecord: DifferentialAuditorInput["scopeRecord"]
  ): void {
    if (!goldenReference || !goldenReference.fixtureRecord) {
      throw new InvalidGoldenReferenceError("unknown", "Golden Reference fixture record is missing");
    }

    // Validate fixture schema
    let parsedFixture;
    try {
      parsedFixture = parseValidationFixtureRecord(goldenReference.fixtureRecord);
    } catch (err) {
      throw new InvalidGoldenReferenceError(
        goldenReference.fixtureRecord.fixture_id ?? "unknown",
        `Schema validation failure: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 1. Fixture Class Check
    if (!PERMITTED_GOLDEN_FIXTURE_CLASSES.has(parsedFixture.fixture_class)) {
      throw new InvalidGoldenReferenceError(
        parsedFixture.fixture_id,
        `Fixture class '${parsedFixture.fixture_class}' is not permitted as Golden Reference benchmark for regression auditing`
      );
    }

    // 2. Lifecycle Status Check
    if (parsedFixture.lifecycle_status !== FIXTURE_LIFECYCLE_STATUSES.ACTIVE) {
      throw new InvalidGoldenReferenceError(
        parsedFixture.fixture_id,
        `Fixture lifecycle status is '${parsedFixture.lifecycle_status}'. Only ACTIVE fixtures may be used as Golden References.`
      );
    }

    // 3. Contamination Status Check
    if (parsedFixture.contamination_status !== FIXTURE_CONTAMINATION_STATUSES.CLEAN) {
      throw new InvalidGoldenReferenceError(
        parsedFixture.fixture_id,
        `Fixture contamination status is '${parsedFixture.contamination_status}'. Must be CLEAN.`
      );
    }

    // 4. Payload Integrity Ref Check
    if (!parsedFixture.payload_integrity_ref || parsedFixture.payload_integrity_ref.trim() === "") {
      throw new InvalidGoldenReferenceError(
        parsedFixture.fixture_id,
        "Fixture payload_integrity_ref must be a non-empty cryptographic reference"
      );
    }

    // 5. Declared Scope Overlap Check
    const fixtureScopes = new Set(parsedFixture.declared_applicability_scope);
    const scopeBoundaries = scopeRecord.included_units;
    const hasOverlap = scopeBoundaries.some((boundary) => fixtureScopes.has(boundary));

    if (!hasOverlap) {
      throw new InvalidGoldenReferenceError(
        parsedFixture.fixture_id,
        `Declared applicability scope [${parsedFixture.declared_applicability_scope.join(", ")}] ` +
          `does not cover any validation scope boundary [${scopeBoundaries.join(", ")}]`
      );
    }
  }

  /**
   * Validates PATH-PROD legacy baseline integrity:
   * - Must exist and be non-empty
   * - Must not be equal to candidate execution ID (no self-referencing / reinterpretation)
   */
  private validateLegacyBaselineIntegrity(
    legacyOutput: LegacyOutputData,
    candidateData: DifferentialAuditorInput["candidateData"]
  ): void {
    if (!legacyOutput || !legacyOutput.outputId || legacyOutput.outputId.trim() === "") {
      throw new InvalidPathProdBaselineError("unknown", "PATH-PROD legacy output identifier is missing or empty");
    }

    // Guard against reinterpreting candidate as legacy baseline
    if (candidateData.execution && legacyOutput.outputId === candidateData.execution.execution_id) {
      throw new InvalidPathProdBaselineError(
        legacyOutput.outputId,
        "PATH-PROD baseline output ID cannot match candidate execution ID. Regenerating or substituting legacy from candidate is strictly prohibited."
      );
    }
  }

  /**
   * Derives affected scope strictly bounded to declared validation scope.
   */
  private deriveAffectedScope(
    scopeRecord: DifferentialAuditorInput["scopeRecord"],
    _tripartite: DifferentialAuditResult["tripartiteComparison"]
  ): string[] {
    // Return declared allowed boundaries without widening
    return [...scopeRecord.included_units];
  }
}
