// src/tests/relationshipGraph.test.ts
// Authoritative test suite for Phase 1C.5h — WP-02: Graph Edge Model & Immutable Validation Audit Ledger
// Bound to frozen specification v0.1j Section 34 and Implementation Plan v0.1h WP-02.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  GovernedEdgeType,
  GraphEdgeEndpoint,
  InvalidEdgeTypeError,
  InvalidEndpointError,
  CycleDetectedError,
  OrphanEndpointError,
  validateEdgeEndpoints,
  createCanonicalEdgeId,
} from "../sound-engineer/validation/graph/edgeTypes";

import {
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph/relationshipGraph";

import {
  ValidationAuditLedger,
} from "../sound-engineer/validation/storage/auditLedger";

import {
  LEDGER_GENESIS_PREVIOUS_DIGEST,
  DefaultSha256IntegrityProvider,
  computeSha256Hex,
} from "../sound-engineer/validation/storage/ledgerTypes";

import {
  canonicalizeJson,
} from "../sound-engineer/validation/schemas/integrity";

describe("Phase 1C.5h — WP-02: Graph Edge Model & Immutable Validation Audit Ledger", () => {
  // =========================================================================
  // Section A: Governed Edge Catalogue & Zero Invented Edges
  // =========================================================================
  it("A1. Governed edge catalogue contains exactly fourteen governed edge types", () => {
    const edgeTypes = Object.values(GOVERNED_EDGE_TYPES);
    assert.equal(edgeTypes.length, 14, "Must have exactly 14 governed edge types");

    const expectedEdges = [
      "VALIDATES",
      "TESTED_WITH",
      "BOUND_TO",
      "EVIDENCED_BY",
      "COMPARED_AGAINST",
      "EVALUATED_BY",
      "CONFLICTS_WITH",
      "UNCERTAIN_OF",
      "SUPERSEDES_VALIDATION",
      "INVALIDATED_BY",
      "REQUIRES_RETEST",
      "AUTHORIZES_SCOPE",
      "REMANDS_TO",
      "DERIVED_FROM_HANDOFF",
    ];

    for (const expected of expectedEdges) {
      assert.ok(
        edgeTypes.includes(expected as GovernedEdgeType),
        `Governed edge catalogue must contain "${expected}"`
      );
    }
  });

  it("A2. Rejects invented governed edges (e.g. HAS_EVIDENCE, LINKS_TO, BELONGS_TO)", () => {
    const inventedEdges = [
      "HAS_EVIDENCE",
      "GENERATED_BY",
      "BELONGS_TO",
      "HAS_SCOPE",
      "HAS_FIXTURE",
      "LINKS_TO",
      "HAS_TRACE",
      "DERIVED_FROM",
      "PARENT_OF",
      "CHILD_OF",
    ];

    const dummySource: GraphEdgeEndpoint = {
      id: "case_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationCase,
    };
    const dummyTarget: GraphEdgeEndpoint = {
      id: "cand_001",
      kind: GOVERNED_ENTITY_KINDS.MigrationCandidate,
    };

    for (const invented of inventedEdges) {
      assert.throws(
        () => validateEdgeEndpoints(invented, dummySource, dummyTarget),
        InvalidEdgeTypeError,
        `Must reject invented edge "${invented}"`
      );
    }
  });

  // =========================================================================
  // Section B: Endpoint Matrix Conformance (All 14 Governed Edges)
  // =========================================================================
  it("B. Validates and enforces exact endpoint constraints for all 14 governed edges", () => {
    // 1. VALIDATES: ValidationCase -> MigrationCandidate | ReasoningComponent
    assert.ok(
      validateEdgeEndpoints(
        "VALIDATES",
        { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        { id: "cand_1", kind: GOVERNED_ENTITY_KINDS.MigrationCandidate }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "VALIDATES",
        { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        { id: "rc_1", kind: GOVERNED_ENTITY_KINDS.ReasoningComponent }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "VALIDATES",
          { id: "exec_1", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          { id: "cand_1", kind: GOVERNED_ENTITY_KINDS.MigrationCandidate }
        ),
      InvalidEndpointError
    );

    // 2. TESTED_WITH: ValidationExecutionRecord -> ValidationFixtureRecord
    assert.ok(
      validateEdgeEndpoints(
        "TESTED_WITH",
        { id: "exec_1", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
        { id: "fix_1", kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "TESTED_WITH",
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "fix_1", kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord }
        ),
      InvalidEndpointError
    );

    // 3. BOUND_TO: ValidationCase | ValidationPackage -> ValidationVersionBindingRecord
    assert.ok(
      validateEdgeEndpoints(
        "BOUND_TO",
        { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        { id: "bind_1", kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "BOUND_TO",
        { id: "pkg_1", kind: GOVERNED_ENTITY_KINDS.ValidationPackage },
        { id: "bind_1", kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "BOUND_TO",
          { id: "exec_1", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
          { id: "bind_1", kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord }
        ),
      InvalidEndpointError
    );

    // 4. EVIDENCED_BY: ValidationCase | ValidationOutcomeRecord -> ObjectiveEvidenceRecord | PerceptualEvaluationRecord
    assert.ok(
      validateEdgeEndpoints(
        "EVIDENCED_BY",
        { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
        { id: "obj_1", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "EVIDENCED_BY",
        { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "EVIDENCED_BY",
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "uat_1", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord }
        ),
      InvalidEndpointError
    );

    // 5. COMPARED_AGAINST: RegressionAssessmentRecord -> LegacyOutput | GoldenReference
    assert.ok(
      validateEdgeEndpoints(
        "COMPARED_AGAINST",
        { id: "reg_1", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
        { id: "leg_1", kind: GOVERNED_ENTITY_KINDS.LegacyOutput }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "COMPARED_AGAINST",
        { id: "reg_1", kind: GOVERNED_ENTITY_KINDS.RegressionAssessmentRecord },
        { id: "gold_1", kind: GOVERNED_ENTITY_KINDS.GoldenReference }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "COMPARED_AGAINST",
          { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
          { id: "leg_1", kind: GOVERNED_ENTITY_KINDS.LegacyOutput }
        ),
      InvalidEndpointError
    );

    // 6. EVALUATED_BY: PerceptualEvaluationRecord | UATEvaluationRecord -> EvaluatorPersona
    assert.ok(
      validateEdgeEndpoints(
        "EVALUATED_BY",
        { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
        { id: "pers_1", kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "EVALUATED_BY",
        { id: "uat_1", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
        { id: "pers_1", kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "EVALUATED_BY",
          { id: "obj_1", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          { id: "pers_1", kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona }
        ),
      InvalidEndpointError
    );

    // 7. CONFLICTS_WITH: ObjectiveEvidenceRecord <-> PerceptualEvaluationRecord
    assert.ok(
      validateEdgeEndpoints(
        "CONFLICTS_WITH",
        { id: "obj_1", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
        { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
      )
    );

    // 8. UNCERTAIN_OF: ValidationOutcomeRecord -> ValidationUncertaintyRecord
    assert.ok(
      validateEdgeEndpoints(
        "UNCERTAIN_OF",
        { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        { id: "unc_1", kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "UNCERTAIN_OF",
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "unc_1", kind: GOVERNED_ENTITY_KINDS.ValidationUncertaintyRecord }
        ),
      InvalidEndpointError
    );

    // 9. SUPERSEDES_VALIDATION: ValidationExecutionRecord -> ValidationExecutionRecord
    assert.ok(
      validateEdgeEndpoints(
        "SUPERSEDES_VALIDATION",
        { id: "exec_2", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord },
        { id: "exec_1", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "SUPERSEDES_VALIDATION",
          { id: "case_2", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase }
        ),
      InvalidEndpointError
    );

    // 10. INVALIDATED_BY: ValidationOutcomeRecord | AdoptionDecisionRecord -> RevalidationTriggerRecord
    assert.ok(
      validateEdgeEndpoints(
        "INVALIDATED_BY",
        { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
        { id: "trig_1", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord }
      )
    );
    assert.ok(
      validateEdgeEndpoints(
        "INVALIDATED_BY",
        { id: "dec_1", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
        { id: "trig_1", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "INVALIDATED_BY",
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "trig_1", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord }
        ),
      InvalidEndpointError
    );

    // 11. REQUIRES_RETEST: RevalidationTriggerRecord -> RetestPlanRecord
    assert.ok(
      validateEdgeEndpoints(
        "REQUIRES_RETEST",
        { id: "trig_1", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
        { id: "plan_1", kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "REQUIRES_RETEST",
          { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord },
          { id: "plan_1", kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord }
        ),
      InvalidEndpointError
    );

    // 12. AUTHORIZES_SCOPE: AdoptionDecisionRecord -> ValidationScopeRecord
    assert.ok(
      validateEdgeEndpoints(
        "AUTHORIZES_SCOPE",
        { id: "dec_1", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord },
        { id: "scope_1", kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "AUTHORIZES_SCOPE",
          { id: "scope_1", kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord },
          { id: "dec_1", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord }
        ),
      InvalidEndpointError
    );

    // 13. REMANDS_TO: ValidationFailureRecord -> GovernanceEntity
    assert.ok(
      validateEdgeEndpoints(
        "REMANDS_TO",
        { id: "fail_1", kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord },
        { id: "gov_1", kind: GOVERNED_ENTITY_KINDS.GovernanceEntity }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "REMANDS_TO",
          { id: "gov_1", kind: GOVERNED_ENTITY_KINDS.GovernanceEntity },
          { id: "fail_1", kind: GOVERNED_ENTITY_KINDS.ValidationFailureRecord }
        ),
      InvalidEndpointError
    );

    // 14. DERIVED_FROM_HANDOFF: ValidationIntakeRecord -> MigrationHandoffPackageRecord
    assert.ok(
      validateEdgeEndpoints(
        "DERIVED_FROM_HANDOFF",
        { id: "intake_1", kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord },
        { id: "mhp_1", kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord }
      )
    );
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "DERIVED_FROM_HANDOFF",
          { id: "mhp_1", kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord },
          { id: "intake_1", kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord }
        ),
      InvalidEndpointError
    );
  });

  // =========================================================================
  // Section C: Directionality & Reversal Rejection
  // =========================================================================
  it("C. Strictly rejects endpoint direction reversal for directional edges", () => {
    // TESTED_WITH reversed: ValidationFixtureRecord -> ValidationExecutionRecord MUST fail
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "TESTED_WITH",
          { id: "fix_1", kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord },
          { id: "exec_1", kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord }
        ),
      InvalidEndpointError
    );

    // AUTHORIZES_SCOPE reversed: ValidationScopeRecord -> AdoptionDecisionRecord MUST fail
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "AUTHORIZES_SCOPE",
          { id: "scope_1", kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord },
          { id: "dec_1", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord }
        ),
      InvalidEndpointError
    );

    // EVIDENCED_BY reversed: PerceptualEvaluationRecord -> ValidationOutcomeRecord MUST fail
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "EVIDENCED_BY",
          { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
          { id: "out_1", kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord }
        ),
      InvalidEndpointError
    );

    // INVALIDATED_BY reversed: RevalidationTriggerRecord -> AdoptionDecisionRecord MUST fail
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "INVALIDATED_BY",
          { id: "trig_1", kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord },
          { id: "dec_1", kind: GOVERNED_ENTITY_KINDS.AdoptionDecisionRecord }
        ),
      InvalidEndpointError
    );
  });

  // =========================================================================
  // Section D: CONFLICTS_WITH Special Symmetric Semantics
  // =========================================================================
  it("D. CONFLICTS_WITH enforces single canonical persistence and bidirectional lookup", () => {
    const graph = new ValidationRelationshipGraph();

    const objNode: GraphEdgeEndpoint = {
      id: "obj_fft_01",
      kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
    };
    const percNode: GraphEdgeEndpoint = {
      id: "perc_mushra_01",
      kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    };

    graph.registerNodes([objNode, percNode]);

    // 1. Insertion in (Objective, Perceptual) order
    const edge1 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
      source: objNode,
      target: percNode,
    });

    assert.equal(graph.getEdges().length, 1, "Graph must contain exactly 1 edge");
    assert.equal(edge1.isSymmetric, true);

    // 2. Insertion in (Perceptual, Objective) reverse order
    const edge2 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
      source: percNode,
      target: objNode,
    });

    // Must resolve to the SAME canonical edge without creating a duplicate
    assert.equal(graph.getEdges().length, 1, "Persisted edge count must remain 1");
    assert.equal(edge1.edgeId, edge2.edgeId, "Must have identical canonical edgeId");

    // 3. Bidirectional queries
    const fromObj = graph.getConflicts("obj_fft_01");
    assert.equal(fromObj.length, 1);
    assert.equal(fromObj[0].id, "perc_mushra_01");

    const fromPerc = graph.getConflicts("perc_mushra_01");
    assert.equal(fromPerc.length, 1);
    assert.equal(fromPerc[0].id, "obj_fft_01");

    // 4. Invalid combinations must fail
    // Objective <-> Objective
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "CONFLICTS_WITH",
          { id: "obj_1", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord },
          { id: "obj_2", kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord }
        ),
      InvalidEndpointError
    );

    // Perceptual <-> Perceptual
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "CONFLICTS_WITH",
          { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord },
          { id: "perc_2", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
        ),
      InvalidEndpointError
    );

    // Unrelated endpoint kinds
    assert.throws(
      () =>
        validateEdgeEndpoints(
          "CONFLICTS_WITH",
          { id: "case_1", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          { id: "perc_1", kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord }
        ),
      InvalidEndpointError
    );
  });

  // =========================================================================
  // Section E: Directional DAG Cycle Protection
  // =========================================================================
  it("E. Enforces directional acyclicity and protects against self, 2-node, and multi-hop cycles", () => {
    const graph = new ValidationRelationshipGraph();

    const exec1: GraphEdgeEndpoint = {
      id: "exec_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
    };
    const exec2: GraphEdgeEndpoint = {
      id: "exec_002",
      kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
    };
    const exec3: GraphEdgeEndpoint = {
      id: "exec_003",
      kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
    };

    graph.registerNodes([exec1, exec2, exec3]);

    // 1. Direct self-cycle must fail
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
          source: exec1,
          target: exec1,
        }),
      CycleDetectedError
    );

    // 2. Legal directional chain: exec3 -> exec2 -> exec1
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
      source: exec3,
      target: exec2,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
      source: exec2,
      target: exec1,
    });

    // 3. 2-node cycle: exec1 -> exec2 must fail
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
          source: exec1,
          target: exec2,
        }),
      CycleDetectedError
    );

    // 4. Multi-hop cycle: exec1 -> exec3 must fail
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.SUPERSEDES_VALIDATION,
          source: exec1,
          target: exec3,
        }),
      CycleDetectedError
    );

    // 5. CONFLICTS_WITH does not trigger false-positive cycle detection
    const objEv: GraphEdgeEndpoint = {
      id: "obj_test_1",
      kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
    };
    const percEv: GraphEdgeEndpoint = {
      id: "perc_test_1",
      kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    };
    graph.registerNodes([objEv, percEv]);

    assert.doesNotThrow(() => {
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
        source: objEv,
        target: percEv,
      });
      // Reverse query or re-insertion does not trigger cycle error
      graph.addEdge({
        edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
        source: percEv,
        target: objEv,
      });
    });
  });

  // =========================================================================
  // Section F: Duplicate Handling & Orphan Protection
  // =========================================================================
  it("F. Rejects orphan endpoints and handles duplicates idempotently", () => {
    const graph = new ValidationRelationshipGraph();

    const registeredSource: GraphEdgeEndpoint = {
      id: "reg_source_1",
      kind: GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
    };
    const registeredTarget: GraphEdgeEndpoint = {
      id: "reg_target_1",
      kind: GOVERNED_ENTITY_KINDS.ValidationFixtureRecord,
    };

    // Unregistered endpoints must fail with OrphanEndpointError
    assert.throws(
      () =>
        graph.addEdge({
          edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
          source: registeredSource,
          target: registeredTarget,
        }),
      OrphanEndpointError
    );

    graph.registerNode(registeredSource);
    graph.registerNode(registeredTarget);

    // Adding valid edge
    const edge1 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
      source: registeredSource,
      target: registeredTarget,
    });
    assert.equal(graph.getEdges().length, 1);

    // Adding exact duplicate directional edge is idempotent
    const edge2 = graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.TESTED_WITH,
      source: registeredSource,
      target: registeredTarget,
    });
    assert.equal(graph.getEdges().length, 1, "Duplicate edge must not inflate edge count");
    assert.equal(edge1.edgeId, edge2.edgeId);
  });

  // =========================================================================
  // Section G & H: Lineage Traversal Query APIs & Historical Applicability
  // =========================================================================
  it("G. Provides getProvenanceLineage, getImpactedScope, and getEvidenceForCase queries", () => {
    const graph = new ValidationRelationshipGraph();

    const mhpNode: GraphEdgeEndpoint = {
      id: "mhp_1c5g_sealed_pkg",
      kind: GOVERNED_ENTITY_KINDS.MigrationHandoffPackageRecord,
    };
    const intakeNode: GraphEdgeEndpoint = {
      id: "intake_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
    };
    const caseNode: GraphEdgeEndpoint = {
      id: "case_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationCase,
    };
    const bindingNode: GraphEdgeEndpoint = {
      id: "binding_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationVersionBindingRecord,
    };
    const objEvNode: GraphEdgeEndpoint = {
      id: "obj_ev_001",
      kind: GOVERNED_ENTITY_KINDS.ObjectiveEvidenceRecord,
    };
    const percEvNode: GraphEdgeEndpoint = {
      id: "perc_ev_001",
      kind: GOVERNED_ENTITY_KINDS.PerceptualEvaluationRecord,
    };
    const trigNode: GraphEdgeEndpoint = {
      id: "reval_trig_001",
      kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
    };
    const outcomeNode: GraphEdgeEndpoint = {
      id: "outcome_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    };
    const retestPlanNode: GraphEdgeEndpoint = {
      id: "retest_plan_001",
      kind: GOVERNED_ENTITY_KINDS.RetestPlanRecord,
    };

    graph.registerNodes([
      mhpNode,
      intakeNode,
      caseNode,
      bindingNode,
      objEvNode,
      percEvNode,
      trigNode,
      outcomeNode,
      retestPlanNode,
    ]);

    // Build lineage relationships
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.DERIVED_FROM_HANDOFF,
      source: intakeNode,
      target: mhpNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.BOUND_TO,
      source: caseNode,
      target: bindingNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
      source: caseNode,
      target: objEvNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
      source: caseNode,
      target: percEvNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.CONFLICTS_WITH,
      source: objEvNode,
      target: percEvNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: outcomeNode,
      target: trigNode,
    });
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.REQUIRES_RETEST,
      source: trigNode,
      target: retestPlanNode,
    });

    // 1. Provenance Lineage from Case
    const caseLineage = graph.getProvenanceLineage("case_001");
    assert.equal(caseLineage.rootEntityId, "case_001");
    assert.ok(caseLineage.versionBindingIds.includes("binding_001"));

    // 2. Provenance Lineage from Intake
    const intakeLineage = graph.getProvenanceLineage("intake_001");
    assert.equal(intakeLineage.intakeRecordId, "intake_001");
    assert.equal(intakeLineage.migrationHandoffPackageId, "mhp_1c5g_sealed_pkg");

    // 3. Evidence For Case
    const caseEvidence = graph.getEvidenceForCase("case_001");
    assert.equal(caseEvidence.caseId, "case_001");
    assert.deepEqual(caseEvidence.objectiveEvidenceIds, ["obj_ev_001"]);
    assert.deepEqual(caseEvidence.perceptualEvidenceIds, ["perc_ev_001"]);
    assert.equal(caseEvidence.conflictingPairs.length, 1);
    assert.equal(caseEvidence.conflictingPairs[0].objectiveEvidenceId, "obj_ev_001");
    assert.equal(caseEvidence.conflictingPairs[0].perceptualEvidenceId, "perc_ev_001");

    // 4. Impacted Scope from Trigger
    const impacted = graph.getImpactedScope("reval_trig_001");
    assert.equal(impacted.triggerId, "reval_trig_001");
    assert.deepEqual(impacted.invalidatedOutcomeIds, ["outcome_001"]);
    assert.deepEqual(impacted.retestPlanIds, ["retest_plan_001"]);
  });

  it("H. Evaluates historical applicability without mutating outcome records", () => {
    const graph = new ValidationRelationshipGraph();

    const outcomeA: GraphEdgeEndpoint = {
      id: "outcome_active_001",
      kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    };
    const outcomeB: GraphEdgeEndpoint = {
      id: "outcome_stale_002",
      kind: GOVERNED_ENTITY_KINDS.ValidationOutcomeRecord,
    };
    const trigNode: GraphEdgeEndpoint = {
      id: "trig_upstream_001",
      kind: GOVERNED_ENTITY_KINDS.RevalidationTriggerRecord,
    };

    graph.registerNodes([outcomeA, outcomeB, trigNode]);

    // Outcome A has no invalidation trigger -> applicable
    assert.equal(
      graph.isApplicableForCurrentBinding("outcome_active_001"),
      true,
      "Untouched outcome must be applicable"
    );

    // Outcome B is linked via INVALIDATED_BY to trigger
    graph.addEdge({
      edgeType: GOVERNED_EDGE_TYPES.INVALIDATED_BY,
      source: outcomeB,
      target: trigNode,
    });

    // Historical record payload remains untouched
    const historicalPayload = {
      outcome_id: "outcome_stale_002",
      outcome_class: "PASS",
      summary: "Historical pass prior to trigger",
    };

    assert.equal(
      graph.isApplicableForCurrentBinding(historicalPayload),
      false,
      "Invalidated outcome must evaluate as stale/not-applicable"
    );

    // Verify historical payload was NOT mutated
    assert.equal(historicalPayload.outcome_class, "PASS", "Must NOT mutate historical outcome class");
  });

  // =========================================================================
  // Section I & J: Validation Audit Ledger & Tamper Detection
  // =========================================================================
  it("I. ValidationAuditLedger executes append-only chaining and verification", () => {
    const ledger = new ValidationAuditLedger();

    assert.equal(ledger.getEntryCount(), 0);
    const initialVerify = ledger.verifyLedger();
    assert.equal(initialVerify.isValid, true);
    assert.equal(initialVerify.totalEntries, 0);

    // Append Record 1
    const entry1 = ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
      "intake_001",
      { intake_id: "intake_001", status: "INTAKE_ACCEPTED" },
      "2026-10-13T10:00:00.000Z"
    );

    assert.equal(entry1.sequenceNumber, 0);
    assert.equal(entry1.previousDigest, LEDGER_GENESIS_PREVIOUS_DIGEST);
    assert.ok(entry1.entryDigest.length > 0);

    // Append Record 2
    const entry2 = ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationCase,
      "case_001",
      { case_id: "case_001", title: "Clean Amp Linearity" },
      "2026-10-13T10:01:00.000Z"
    );

    assert.equal(entry2.sequenceNumber, 1);
    assert.equal(entry2.previousDigest, entry1.entryDigest);

    // Verify pristine ledger
    const verifyResult = ledger.verifyLedger();
    assert.equal(verifyResult.isValid, true);
    assert.equal(verifyResult.totalEntries, 2);
  });

  it("J. Detects all forms of audit ledger tampering", () => {
    const ledger = new ValidationAuditLedger();

    ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationIntakeRecord,
      "intake_001",
      { intake_id: "intake_001", status: "INTAKE_ACCEPTED" }
    );
    ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationCase,
      "case_001",
      { case_id: "case_001", title: "Clean Amp Linearity" }
    );
    ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationExecutionRecord,
      "exec_001",
      { exec_id: "exec_001", status: "COMPLETED" }
    );

    assert.equal(ledger.verifyLedger().isValid, true);

    // Access internal entries array strictly for negative tampering tests
    const internalEntries = (ledger as any).entries as any[];

    // 1. Tamper test: payload modification in block 1
    const originalPayload = internalEntries[1].payload;
    internalEntries[1] = {
      ...internalEntries[1],
      payload: { ...originalPayload, title: "MALICIOUSLY_MUTATED_TITLE" },
    };
    const tamperPayloadResult = ledger.verifyLedger();
    assert.equal(tamperPayloadResult.isValid, false);
    assert.equal(tamperPayloadResult.corruptedSequenceNumber, 1);
    // Restore
    internalEntries[1] = { ...internalEntries[1], payload: originalPayload };
    assert.equal(ledger.verifyLedger().isValid, true);

    // 2. Tamper test: previous-link modification in block 2
    const originalPrevDigest = internalEntries[2].previousDigest;
    internalEntries[2] = {
      ...internalEntries[2],
      previousDigest: "0000000000000000000000000000000000000000000000000000000000000000",
    };
    const tamperLinkResult = ledger.verifyLedger();
    assert.equal(tamperLinkResult.isValid, false);
    assert.equal(tamperLinkResult.corruptedSequenceNumber, 2);
    // Restore
    internalEntries[2] = { ...internalEntries[2], previousDigest: originalPrevDigest };
    assert.equal(ledger.verifyLedger().isValid, true);

    // 3. Tamper test: forged entry digest in block 0
    const originalEntryDigest = internalEntries[0].entryDigest;
    internalEntries[0] = {
      ...internalEntries[0],
      entryDigest: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    };
    const tamperDigestResult = ledger.verifyLedger();
    assert.equal(tamperDigestResult.isValid, false);
    assert.equal(tamperDigestResult.corruptedSequenceNumber, 0);
    // Restore
    internalEntries[0] = { ...internalEntries[0], entryDigest: originalEntryDigest };
    assert.equal(ledger.verifyLedger().isValid, true);

    // 4. Tamper test: entry removal (delete block 1)
    const removedEntry = internalEntries.splice(1, 1)[0];
    const tamperRemovalResult = ledger.verifyLedger();
    assert.equal(tamperRemovalResult.isValid, false);
    // Restore
    internalEntries.splice(1, 0, removedEntry);
    assert.equal(ledger.verifyLedger().isValid, true);

    // 5. Tamper test: entry reordering (swap blocks 0 and 1)
    const temp = internalEntries[0];
    internalEntries[0] = internalEntries[1];
    internalEntries[1] = temp;
    const tamperReorderResult = ledger.verifyLedger();
    assert.equal(tamperReorderResult.isValid, false);
  });

  // =========================================================================
  // Section K: Canonical JSON Serialization & Technology-Neutral Hash
  // =========================================================================
  it("K. Deterministic canonical serialization and standard SHA-256 test vectors", () => {
    // 1. Standard SHA-256 test vectors
    assert.equal(
      computeSha256Hex(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "Empty string SHA-256 test vector"
    );
    assert.equal(
      computeSha256Hex("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      "Standard 'abc' SHA-256 test vector"
    );

    // 2. Canonical serialization invariant under property key reordering
    const obj1 = { z_prop: 100, a_prop: "alpha", m_prop: [3, 2, 1] };
    const obj2 = { a_prop: "alpha", m_prop: [3, 2, 1], z_prop: 100 };

    const canonical1 = canonicalizeJson(obj1);
    const canonical2 = canonicalizeJson(obj2);

    assert.equal(canonical1, canonical2, "Canonical strings must be identical");

    const provider = new DefaultSha256IntegrityProvider();
    assert.equal(
      provider.computeDigest(obj1),
      provider.computeDigest(obj2),
      "Computed digests must be identical"
    );
  });

  // =========================================================================
  // Section L: Immutability Protection
  // =========================================================================
  it("L. Guarantees immutability of returned entries and graph objects", () => {
    const ledger = new ValidationAuditLedger();
    const entry = ledger.appendRecord(
      GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
      "scope_001",
      { scope_id: "scope_001", description: "Amp Models" }
    );

    // Attempting to mutate returned entry properties must throw or fail silently in strict mode
    assert.throws(() => {
      (entry as any).sequenceNumber = 999;
    }, TypeError);

    // Array returned from getEntries() is frozen
    const entries = ledger.getEntries();
    assert.throws(() => {
      (entries as any).push({} as any);
    }, TypeError);
  });
});
