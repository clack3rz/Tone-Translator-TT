// src/tests/uatEvaluationEngine.test.ts
// Focused unit and integration tests for Phase 1C.5h WP-13:
// User Acceptance Testing (UAT) Multi-Persona Workflow Engine (Record 12).
// Bound to frozen specification v0.1j Section 17, Section 33, and Implementation Plan v0.1h WP-13.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVALUATOR_PERSONAS,
  MUSICAL_FITNESS_VERDICTS,
  TASK_COMPLETION_STATUSES,
  TEST_PROFILE_FAMILIES,
} from "../sound-engineer/validation/schemas/enums";
import {
  UATEvaluationRecord,
  uatEvaluationRecordSchema,
  ValidationPackage,
} from "../sound-engineer/validation/schemas/records";
import {
  GOVERNED_EDGE_DEFINITIONS,
  GOVERNED_EDGE_TYPES,
  GOVERNED_ENTITY_KINDS,
  ValidationRelationshipGraph,
} from "../sound-engineer/validation/graph";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage";
import {
  CANONICAL_EVALUATOR_PERSONAS,
  CANONICAL_MUSICAL_FITNESS_VERDICTS,
  CANONICAL_TASK_COMPLETION_STATUSES,
  InapplicableUATProfileError,
  IneligibleUATPackageError,
  InvalidEvaluatorPersonaError,
  InvalidMusicalFitnessVerdictError,
  InvalidSatisfactionRatingError,
  InvalidTaskCompletionStatusError,
  InvalidTaskDurationError,
  InvalidTaskScenarioError,
  MissingUATMetricProfileError,
  TaskScenario,
  TaskScenarioRunner,
  UATCoverageValidator,
  UATEvaluationEngine,
  UATMetricResolver,
} from "../sound-engineer/validation/evidence";

/**
 * Helper to build a valid mock ValidationPackage record.
 */
function createMockPackage(overrides?: Partial<ValidationPackage>): ValidationPackage {
  return {
    package_id: "PKG-UAT-TEST-001",
    intake_id: "INTAKE-TEST-001",
    scope_record_ref: "SCOPE-TEST-001",
    version_binding_ref: "BINDING-TEST-001",
    assigned_test_profiles: [
      TEST_PROFILE_FAMILIES.PROFILE_14_USER_WORKFLOW_UAT,
      TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY,
    ],
    validation_case_refs: ["CASE-UAT-001"],
    execution_record_refs: ["EXEC-UAT-001"],
    evidence_refs: [],
    ...overrides,
  };
}

/**
 * Helper to build a valid mock TaskScenario definition.
 */
function createMockScenario(overrides?: Partial<TaskScenario>): TaskScenario {
  return {
    taskScenarioId: "SCENARIO-RECORDING-ENG-001",
    title: "90s Grunge Rhythm Tone Mix Integration",
    description: "Prompt Tone Translator, export preset to target platform, blend into multitrack drum/bass mix.",
    applicableProfiles: ["PROFILE-14"],
    targetPersonas: [
      EVALUATOR_PERSONAS.RECORDING_ENGINEER,
      EVALUATOR_PERSONAS.PRODUCER,
    ],
    scopedBoundaries: ["amp_models", "cabinet_emulations", "export_stage"],
    metricProfileRef: "uat_metric_profile_ref:recording_engineer_mix_context_v1",
    illustrativeContext: "mix engineer working on alternative rock album",
    ...overrides,
  };
}

describe("WP-13: User Acceptance Testing Multi-Persona Workflow Engine (Record 12)", () => {
  // ---------------------------------------------------------------------------
  // 1. Valid UAT evaluation produces valid Record 12 conforming to schema
  // ---------------------------------------------------------------------------
  it("produces a valid Record 12 passing strict signed-off schema", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    const record = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 420.5,
        workflowSatisfactionRating: 8.5,
        cognitiveFrictionNotes: "Smooth prompt translation; fast DAW export.",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });

    assert.ok(record.uat_id.startsWith("UAT-"));
    assert.equal(record.package_id, pkg.package_id);
    assert.equal(record.evaluator_persona, EVALUATOR_PERSONAS.RECORDING_ENGINEER);
    assert.equal(record.task_scenario_id, scenario.taskScenarioId);
    assert.equal(record.task_completion_status, TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY);
    assert.equal(record.task_duration_seconds, 420.5);
    assert.equal(record.workflow_satisfaction_rating, 8.5);
    assert.equal(record.cognitive_friction_notes, "Smooth prompt translation; fast DAW export.");
    assert.equal(record.musical_fitness_verdict, MUSICAL_FITNESS_VERDICTS.ACCEPTED);
    assert.deepEqual(record.uat_blockers_identified, []);

    // Strict schema parse must pass
    const parsed = uatEvaluationRecordSchema.parse(record);
    assert.deepEqual(parsed, record);
  });

  // ---------------------------------------------------------------------------
  // 2. Strict schema rejects extraneous fields
  // ---------------------------------------------------------------------------
  it("rejects extraneous fields via strict Record 12 schema", () => {
    const rawWithExtra = {
      uat_id: "UAT-123",
      package_id: "PKG-001",
      evaluator_persona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
      task_scenario_id: "SCEN-01",
      task_completion_status: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
      task_duration_seconds: 120,
      workflow_satisfaction_rating: 8,
      cognitive_friction_notes: "None",
      musical_fitness_verdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
      uat_blockers_identified: [],
      extra_unauthorized_field: "ILLEGAL_DATA",
    };

    assert.throws(
      () => uatEvaluationRecordSchema.parse(rawWithExtra),
      /unrecognized_keys/i
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Exactly four canonical personas accepted; noncanonical personas rejected
  // ---------------------------------------------------------------------------
  it("accepts all four canonical personas and rejects noncanonical personas", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();

    for (const persona of CANONICAL_EVALUATOR_PERSONAS) {
      const scenario = createMockScenario({
        taskScenarioId: `SCENARIO-${persona}`,
        targetPersonas: [persona],
        metricProfileRef: "tolerance_spec_ref:persona_workflow_acceptance_criteria",
      });

      const rec = engine.recordEvaluation({
        packageRecord: pkg,
        scenario,
        observation: {
          taskScenarioId: scenario.taskScenarioId,
          evaluatorPersona: persona,
          taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
          taskDurationSeconds: 180,
          workflowSatisfactionRating: 9,
          cognitiveFrictionNotes: "Workflow tested cleanly.",
          musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
          uatBlockersIdentified: [],
        },
      });

      assert.equal(rec.evaluator_persona, persona);
    }

    // Noncanonical illustrative personas (e.g. touring_guitarist, bedroom_producer) must be rejected
    const invalidPersonas = [
      "TOURING_GUITARIST",
      "BEDROOM_PRODUCER",
      "MASTERING_ENGINEER",
      "HOBBYIST",
      "AI_ASSISTANT",
      "QA_TESTER",
    ];

    const scenario = createMockScenario({
      targetPersonas: [EVALUATOR_PERSONAS.SESSION_GUITARIST],
    });

    for (const invalid of invalidPersonas) {
      assert.throws(
        () =>
          engine.recordEvaluation({
            packageRecord: pkg,
            scenario,
            observation: {
              taskScenarioId: scenario.taskScenarioId,
              evaluatorPersona: invalid as any,
              taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
              taskDurationSeconds: 180,
              workflowSatisfactionRating: 9,
              cognitiveFrictionNotes: "",
              musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
              uatBlockersIdentified: [],
            },
          }),
        InvalidEvaluatorPersonaError
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Exactly three canonical task completion statuses accepted; invalid rejected
  // ---------------------------------------------------------------------------
  it("accepts exactly three canonical task completion statuses and rejects invalid ones", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario({
      targetPersonas: [EVALUATOR_PERSONAS.RECORDING_ENGINEER],
    });

    for (const status of CANONICAL_TASK_COMPLETION_STATUSES) {
      const rec = engine.recordEvaluation({
        packageRecord: pkg,
        scenario,
        observation: {
          taskScenarioId: scenario.taskScenarioId,
          evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
          taskCompletionStatus: status,
          taskDurationSeconds: 200,
          workflowSatisfactionRating: 7,
          cognitiveFrictionNotes: `Testing status: ${status}`,
          musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
          uatBlockersIdentified: status === TASK_COMPLETION_STATUSES.FAILED ? ["CRITICAL_FAIL"] : [],
        },
      });
      assert.equal(rec.task_completion_status, status);
    }

    // Invalid task statuses (e.g. PASS, PARTIAL, ABORTED, INCOMPLETE, SUCCESS) must be rejected
    const invalidStatuses = ["PASS", "PARTIAL", "ABORTED", "INCOMPLETE", "SUCCESS", "BLOCKED"];
    for (const bad of invalidStatuses) {
      assert.throws(
        () =>
          engine.recordEvaluation({
            packageRecord: pkg,
            scenario,
            observation: {
              taskScenarioId: scenario.taskScenarioId,
              evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
              taskCompletionStatus: bad as any,
              taskDurationSeconds: 200,
              workflowSatisfactionRating: 7,
              cognitiveFrictionNotes: "",
              musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
              uatBlockersIdentified: [],
            },
          }),
        InvalidTaskCompletionStatusError
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Exactly three canonical musical fitness verdicts accepted; invalid rejected
  // ---------------------------------------------------------------------------
  it("accepts exactly three canonical musical fitness verdicts and rejects invalid ones", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario({
      targetPersonas: [EVALUATOR_PERSONAS.PRODUCER],
    });

    for (const verdict of CANONICAL_MUSICAL_FITNESS_VERDICTS) {
      const rec = engine.recordEvaluation({
        packageRecord: pkg,
        scenario,
        observation: {
          taskScenarioId: scenario.taskScenarioId,
          evaluatorPersona: EVALUATOR_PERSONAS.PRODUCER,
          taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
          taskDurationSeconds: 250,
          workflowSatisfactionRating: 8,
          cognitiveFrictionNotes: `Testing verdict: ${verdict}`,
          musicalFitnessVerdict: verdict,
          uatBlockersIdentified: [],
        },
      });
      assert.equal(rec.musical_fitness_verdict, verdict);
    }

    // Must not be confused with Record 17 outcome classes (PASS, FAIL, CONDITIONAL)
    const invalidVerdicts = ["PASS", "FAIL", "CONDITIONAL", "APPROVED", "DISAPPROVED", "EXCELLENT"];
    for (const bad of invalidVerdicts) {
      assert.throws(
        () =>
          engine.recordEvaluation({
            packageRecord: pkg,
            scenario,
            observation: {
              taskScenarioId: scenario.taskScenarioId,
              evaluatorPersona: EVALUATOR_PERSONAS.PRODUCER,
              taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
              taskDurationSeconds: 250,
              workflowSatisfactionRating: 8,
              cognitiveFrictionNotes: "",
              musicalFitnessVerdict: bad as any,
              uatBlockersIdentified: [],
            },
          }),
        InvalidMusicalFitnessVerdictError
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Task duration validation: finite, non-negative, not NaN, not Infinity
  // ---------------------------------------------------------------------------
  it("enforces finite, non-negative task duration and fails closed on invalid values", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    const invalidDurations = [-1, -0.001, NaN, Infinity, -Infinity, "300" as any, undefined as any, null as any];

    for (const dur of invalidDurations) {
      assert.throws(
        () =>
          engine.recordEvaluation({
            packageRecord: pkg,
            scenario,
            observation: {
              taskScenarioId: scenario.taskScenarioId,
              evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
              taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
              taskDurationSeconds: dur,
              workflowSatisfactionRating: 8,
              cognitiveFrictionNotes: "",
              musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
              uatBlockersIdentified: [],
            },
          }),
        InvalidTaskDurationError
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Workflow satisfaction governed by uat_metric_profile_ref; no universal fallback
  // ---------------------------------------------------------------------------
  it("enforces workflow satisfaction rating bounds and rejects unknown profile references", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();

    // 1. Guitarist 1-7 Likert profile
    const guitaristScenario = createMockScenario({
      taskScenarioId: "SCEN-GUITAR-01",
      targetPersonas: [EVALUATOR_PERSONAS.SESSION_GUITARIST],
      metricProfileRef: "uat_metric_profile_ref:guitarist_playability_touch_v1",
    });

    // Rating within [1, 7] passes
    const recValid = engine.recordEvaluation({
      packageRecord: pkg,
      scenario: guitaristScenario,
      observation: {
        taskScenarioId: guitaristScenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.SESSION_GUITARIST,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 150,
        workflowSatisfactionRating: 6.5,
        cognitiveFrictionNotes: "Good pick touch.",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });
    assert.equal(recValid.workflow_satisfaction_rating, 6.5);

    // Rating > 7 fails for this profile
    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: pkg,
          scenario: guitaristScenario,
          observation: {
            taskScenarioId: guitaristScenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.SESSION_GUITARIST,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 150,
            workflowSatisfactionRating: 8.0, // Invalid for 1-7 scale!
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      InvalidSatisfactionRatingError
    );

    // Rating < 1 fails
    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: pkg,
          scenario: guitaristScenario,
          observation: {
            taskScenarioId: guitaristScenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.SESSION_GUITARIST,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 150,
            workflowSatisfactionRating: 0.5,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      InvalidSatisfactionRatingError
    );

    // Missing / unknown metric profile reference fails closed without universal fallback
    const unknownScenario = createMockScenario({
      taskScenarioId: "SCEN-UNKNOWN-01",
      metricProfileRef: "uat_metric_profile_ref:nonexistent_scale",
    });

    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: pkg,
          scenario: unknownScenario,
          observation: {
            taskScenarioId: unknownScenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 120,
            workflowSatisfactionRating: 5,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      MissingUATMetricProfileError
    );
  });

  // ---------------------------------------------------------------------------
  // 8. Friction and blockers preserved losslessly; no erasure or scalar collapse
  // ---------------------------------------------------------------------------
  it("preserves cognitive friction notes and blockers losslessly even on successful completion", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    const frictionText = "User was initially confused by ambiguous 'air' macro label; had to search manual.";
    const blockers = [
      "BLOCKER-01: Delay feedback oscillation clips master output with no limiter",
      "BLOCKER-02: Preset export omitted speaker IR metadata block",
    ];

    // Case 1: COMPLETED_WITH_FRICTION remains distinct from COMPLETED_SUCCESSFULLY
    const recFriction = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
        taskDurationSeconds: 320,
        workflowSatisfactionRating: 6.0,
        cognitiveFrictionNotes: frictionText,
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });

    assert.equal(recFriction.task_completion_status, TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION);
    assert.equal(recFriction.cognitive_friction_notes, frictionText);

    // Case 2: COMPLETED_SUCCESSFULLY with high satisfaction does NOT erase blockers
    const recWithBlockers = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 180,
        workflowSatisfactionRating: 9.5, // High rating!
        cognitiveFrictionNotes: "Workflow finished fast.",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED, // Accepted verdict!
        uatBlockersIdentified: blockers,
      },
    });

    assert.equal(recWithBlockers.task_completion_status, TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY);
    assert.equal(recWithBlockers.musical_fitness_verdict, MUSICAL_FITNESS_VERDICTS.ACCEPTED);
    assert.deepEqual(recWithBlockers.uat_blockers_identified, blockers);
    assert.equal(recWithBlockers.uat_blockers_identified.length, 2);
  });

  // ---------------------------------------------------------------------------
  // 9. Musical fitness verdict is independent and not derived from other metrics
  // ---------------------------------------------------------------------------
  it("keeps musical fitness verdict independent from duration, completion, or rating", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    // High rating, fast duration, completed successfully, BUT musically REJECTED (e.g. sterile tone)
    const recRejected = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 60,
        workflowSatisfactionRating: 9.0,
        cognitiveFrictionNotes: "Workflow was fast, but guitar tone has unnatural digital harshness in high frequencies.",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.REJECTED,
        uatBlockersIdentified: [],
      },
    });

    assert.equal(recRejected.musical_fitness_verdict, MUSICAL_FITNESS_VERDICTS.REJECTED);
    assert.equal(recRejected.task_completion_status, TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY);
  });

  // ---------------------------------------------------------------------------
  // 10. Package eligibility: missing package, invalid schema, or missing UAT profile
  // ---------------------------------------------------------------------------
  it("rejects invalid package, missing package, or package lacking UAT profiles", () => {
    const engine = new UATEvaluationEngine();
    const scenario = createMockScenario();

    // 1. Missing package
    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: null as any,
          scenario,
          observation: {
            taskScenarioId: scenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 120,
            workflowSatisfactionRating: 8,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      IneligibleUATPackageError
    );

    // 2. Malformed package
    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: { package_id: "BAD_PKG" } as any,
          scenario,
          observation: {
            taskScenarioId: scenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 120,
            workflowSatisfactionRating: 8,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      IneligibleUATPackageError
    );

    // 3. Package lacking PROFILE-14 and PROFILE-07
    const packageWithoutUAT = createMockPackage({
      assigned_test_profiles: [TEST_PROFILE_FAMILIES.PROFILE_01_STRUCTURAL_SCHEMA],
    });

    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: packageWithoutUAT,
          scenario,
          observation: {
            taskScenarioId: scenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 120,
            workflowSatisfactionRating: 8,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      InapplicableUATProfileError
    );
  });

  // ---------------------------------------------------------------------------
  // 11. Scenario scope checks: out-of-scope scenario rejected
  // ---------------------------------------------------------------------------
  it("rejects out-of-scope scenario whose required profiles are not assigned to package", () => {
    const engine = new UATEvaluationEngine();
    // Package only assigns PROFILE-07
    const pkg = createMockPackage({
      assigned_test_profiles: [TEST_PROFILE_FAMILIES.PROFILE_07_PLAYABILITY],
    });

    // Scenario requires PROFILE-14
    const scenario = createMockScenario({
      taskScenarioId: "SCEN-REQ-P14",
      applicableProfiles: ["PROFILE-14"],
    });

    assert.throws(
      () =>
        engine.recordEvaluation({
          packageRecord: pkg,
          scenario,
          observation: {
            taskScenarioId: scenario.taskScenarioId,
            evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
            taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
            taskDurationSeconds: 100,
            workflowSatisfactionRating: 8,
            cognitiveFrictionNotes: "",
            musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
            uatBlockersIdentified: [],
          },
        }),
      InvalidTaskScenarioError
    );
  });

  // ---------------------------------------------------------------------------
  // 12. Canonical persona coverage detection without fabricating fake evaluations
  // ---------------------------------------------------------------------------
  it("detects persona coverage omissions and never fabricates fake evaluations", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();

    // Initially 0 evaluations
    const initialReport = engine.validatePersonaCoverage(pkg.package_id);
    assert.equal(initialReport.isCoverageComplete, false);
    assert.equal(initialReport.evaluationCount, 0);
    assert.equal(initialReport.missingPersonas.length, 4);
    assert.deepEqual(initialReport.missingPersonas, CANONICAL_EVALUATOR_PERSONAS);

    // Record evaluation for RECORDING_ENGINEER
    const scen1 = createMockScenario({
      taskScenarioId: "SCEN-RE",
      targetPersonas: [EVALUATOR_PERSONAS.RECORDING_ENGINEER],
    });
    engine.recordEvaluation({
      packageRecord: pkg,
      scenario: scen1,
      observation: {
        taskScenarioId: scen1.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 200,
        workflowSatisfactionRating: 8,
        cognitiveFrictionNotes: "",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });

    const report1 = engine.validatePersonaCoverage(pkg.package_id);
    assert.equal(report1.isCoverageComplete, false);
    assert.equal(report1.evaluationCount, 1);
    assert.equal(report1.evaluatedPersonas.length, 1);
    assert.ok(report1.evaluatedPersonas.includes(EVALUATOR_PERSONAS.RECORDING_ENGINEER));
    assert.equal(report1.missingPersonas.length, 3);
    assert.ok(!report1.missingPersonas.includes(EVALUATOR_PERSONAS.RECORDING_ENGINEER));

    // Record the remaining 3 personas
    const remainingPersonas = [
      EVALUATOR_PERSONAS.SESSION_GUITARIST,
      EVALUATOR_PERSONAS.PRODUCER,
      EVALUATOR_PERSONAS.PLATFORM_ARCHITECT,
    ];

    for (const persona of remainingPersonas) {
      const scen = createMockScenario({
        taskScenarioId: `SCEN-${persona}`,
        targetPersonas: [persona],
        metricProfileRef: "tolerance_spec_ref:persona_workflow_acceptance_criteria",
      });
      engine.recordEvaluation({
        packageRecord: pkg,
        scenario: scen,
        observation: {
          taskScenarioId: scen.taskScenarioId,
          evaluatorPersona: persona,
          taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
          taskDurationSeconds: 150,
          workflowSatisfactionRating: 8.5,
          cognitiveFrictionNotes: "",
          musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
          uatBlockersIdentified: [],
        },
      });
    }

    const fullReport = engine.validatePersonaCoverage(pkg.package_id);
    assert.equal(fullReport.isCoverageComplete, true);
    assert.equal(fullReport.evaluationCount, 4);
    assert.equal(fullReport.missingPersonas.length, 0);
    assert.equal(fullReport.evaluatedPersonas.length, 4);
  });

  // ---------------------------------------------------------------------------
  // 13. Canonical EVALUATED_BY edge creation: UATEvaluationRecord -> EvaluatorPersona
  // ---------------------------------------------------------------------------
  it("creates exact canonical EVALUATED_BY edge (UATEvaluationRecord -> EvaluatorPersona)", () => {
    const graph = new ValidationRelationshipGraph();
    const ledger = new ValidationAuditLedger();
    const engine = new UATEvaluationEngine({ graph, ledger });
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    const record = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 180,
        workflowSatisfactionRating: 8.0,
        cognitiveFrictionNotes: "Tested in graph environment.",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });

    const personaId = `evaluator_persona:${EVALUATOR_PERSONAS.RECORDING_ENGINEER.toLowerCase()}`;

    // Verify nodes in graph
    assert.ok(graph.hasNode(record.uat_id));
    assert.ok(graph.hasNode(personaId));

    // Verify exact directional edge
    const edges = graph.getEdges();
    assert.equal(edges.length, 1);
    const edge = edges[0];

    assert.equal(edge.edgeType, GOVERNED_EDGE_TYPES.EVALUATED_BY);
    assert.equal(edge.source.id, record.uat_id);
    assert.equal(edge.source.kind, GOVERNED_ENTITY_KINDS.UATEvaluationRecord);
    assert.equal(edge.target.id, personaId);
    assert.equal(edge.target.kind, GOVERNED_ENTITY_KINDS.EvaluatorPersona);
    assert.equal(edge.isSymmetric, false);

    // Verify ledger persistence
    const ledgerEntries = ledger.getEntries();
    const ledgerRecords = ledgerEntries.filter(
      (e) => e.entryType === "RECORD" && e.entityKind === GOVERNED_ENTITY_KINDS.UATEvaluationRecord
    );
    assert.equal(ledgerRecords.length, 1);
    assert.equal(ledgerRecords[0].entityId, record.uat_id);

    const ledgerEdges = ledgerEntries.filter(
      (e) => e.entryType === "RELATIONSHIP_EDGE" && e.entityKind === GOVERNED_EDGE_TYPES.EVALUATED_BY
    );
    assert.equal(ledgerEdges.length, 1);
    assert.equal((ledgerEdges[0].payload as any).source.id, record.uat_id);
    assert.equal((ledgerEdges[0].payload as any).target.id, personaId);
  });

  // ---------------------------------------------------------------------------
  // 14. Graph governance: NO reverse EVALUATED_BY, NO widened EVIDENCED_BY, exactly 14 edge types
  // ---------------------------------------------------------------------------
  it("enforces graph constraints: exactly 14 edge types, no reverse EVALUATED_BY, no widened EVIDENCED_BY", () => {
    const graph = new ValidationRelationshipGraph();

    // 1. Catalogue contains exactly 14 governed edge types
    const edgeTypeCount = Object.keys(GOVERNED_EDGE_TYPES).length;
    assert.equal(edgeTypeCount, 14, "Graph must contain exactly 14 governed edge types.");

    // 2. Governed edge definitions check
    const evaluatedByDef = GOVERNED_EDGE_DEFINITIONS[GOVERNED_EDGE_TYPES.EVALUATED_BY];
    assert.ok(evaluatedByDef.allowedSourceKinds.includes(GOVERNED_ENTITY_KINDS.UATEvaluationRecord));
    assert.ok(evaluatedByDef.allowedTargetKinds.includes(GOVERNED_ENTITY_KINDS.EvaluatorPersona));
    assert.equal(evaluatedByDef.isSymmetric, false);

    // 3. Reverse EVALUATED_BY (EvaluatorPersona -> UATEvaluationRecord) must be rejected
    graph.registerNode({ id: "persona:session_guitarist", kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona });
    graph.registerNode({ id: "uat:001", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord });

    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "persona:session_guitarist", kind: GOVERNED_ENTITY_KINDS.EvaluatorPersona },
          target: { id: "uat:001", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
          edgeType: GOVERNED_EDGE_TYPES.EVALUATED_BY,
        }),
      /Source entity kind "EvaluatorPersona" is not permitted/i
    );

    // 4. EVIDENCED_BY must not be widened to target UATEvaluationRecord
    graph.registerNode({ id: "case:001", kind: GOVERNED_ENTITY_KINDS.ValidationCase });
    assert.throws(
      () =>
        graph.addEdge({
          source: { id: "case:001", kind: GOVERNED_ENTITY_KINDS.ValidationCase },
          target: { id: "uat:001", kind: GOVERNED_ENTITY_KINDS.UATEvaluationRecord },
          edgeType: GOVERNED_EDGE_TYPES.EVIDENCED_BY,
        }),
      /Target entity kind "UATEvaluationRecord" is not permitted/i
    );
  });

  // ---------------------------------------------------------------------------
  // 15. Record 12 immutability after emission (deepFreeze)
  // ---------------------------------------------------------------------------
  it("enforces deep immutability on emitted UATEvaluationRecord", () => {
    const engine = new UATEvaluationEngine();
    const pkg = createMockPackage();
    const scenario = createMockScenario();

    const record = engine.recordEvaluation({
      packageRecord: pkg,
      scenario,
      observation: {
        taskScenarioId: scenario.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 150,
        workflowSatisfactionRating: 8.0,
        cognitiveFrictionNotes: "Immutability check",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: ["BLOCKER_A"],
      },
    });

    assert.ok(Object.isFrozen(record));
    assert.ok(Object.isFrozen(record.uat_blockers_identified));

    // Attempted mutation must throw in strict mode
    assert.throws(() => {
      (record as any).task_completion_status = TASK_COMPLETION_STATUSES.FAILED;
    });

    assert.throws(() => {
      (record.uat_blockers_identified as any).push("BLOCKER_B");
    });
  });

  // ---------------------------------------------------------------------------
  // 16. Multi-evaluation scenario query and historical registry preservation
  // ---------------------------------------------------------------------------
  it("preserves evaluation history in engine registry across multiple evaluations and packages", () => {
    const engine = new UATEvaluationEngine();
    const pkgA = createMockPackage({ package_id: "PKG-A" });
    const pkgB = createMockPackage({ package_id: "PKG-B" });

    const scen = createMockScenario();

    const recA1 = engine.recordEvaluation({
      packageRecord: pkgA,
      scenario: scen,
      observation: {
        taskScenarioId: scen.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.RECORDING_ENGINEER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_SUCCESSFULLY,
        taskDurationSeconds: 100,
        workflowSatisfactionRating: 8.0,
        cognitiveFrictionNotes: "Pkg A eval",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.ACCEPTED,
        uatBlockersIdentified: [],
      },
    });

    const recB1 = engine.recordEvaluation({
      packageRecord: pkgB,
      scenario: scen,
      observation: {
        taskScenarioId: scen.taskScenarioId,
        evaluatorPersona: EVALUATOR_PERSONAS.PRODUCER,
        taskCompletionStatus: TASK_COMPLETION_STATUSES.COMPLETED_WITH_FRICTION,
        taskDurationSeconds: 200,
        workflowSatisfactionRating: 6.0,
        cognitiveFrictionNotes: "Pkg B eval",
        musicalFitnessVerdict: MUSICAL_FITNESS_VERDICTS.CONDITIONALLY_ACCEPTED,
        uatBlockersIdentified: ["MINOR_FRICTION"],
      },
    });

    assert.equal(engine.getEvaluationCount(), 2);
    assert.equal(engine.getEvaluation(recA1.uat_id)?.package_id, "PKG-A");
    assert.equal(engine.getEvaluation(recB1.uat_id)?.package_id, "PKG-B");

    assert.equal(engine.getEvaluationsForPackage("PKG-A").length, 1);
    assert.equal(engine.getEvaluationsForPackage("PKG-B").length, 1);
    assert.equal(engine.getEvaluationsByPersona(EVALUATOR_PERSONAS.RECORDING_ENGINEER).length, 1);
    assert.equal(engine.getEvaluationsByPersona(EVALUATOR_PERSONAS.PRODUCER).length, 1);
  });
});
