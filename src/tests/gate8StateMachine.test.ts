// src/tests/gate8StateMachine.test.ts
// Comprehensive independent verification suite for Phase 1C.5h WP-24:
// Post-Cutover Gate 8 Lifecycle State Machine (Record 22).
// Bound to frozen specification v0.1j Section 28, Table 18, Table 04, Invariant 10,
// and Build Plan v0.1h WP-24.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  ADOPTION_DECISION_OUTCOMES,
  AdoptionDecisionOutcome,
  GATE8_CHANGE_TRIGGER_SOURCES,
  GOVERNANCE_EFFECTS,
  GOVERNANCE_STATUSES,
  NEW_GOVERNANCE_STATUSES,
  PREVIOUS_GOVERNANCE_STATUSES,
  REQUIRED_ADOPTION_RESPONSES,
} from "../sound-engineer/validation/schemas/enums";
import {
  AdoptionDecisionRecord,
  Gate8ChangeRecord,
  gate8ChangeRecordSchema,
} from "../sound-engineer/validation/schemas/records";
import { ValidationAuditLedger } from "../sound-engineer/validation/storage/auditLedger";
import { ValidationRelationshipGraph } from "../sound-engineer/validation/graph/relationshipGraph";
import {
  deriveDeterministicChangeId,
  Gate8LifecycleChangeEvent,
  Gate8StateMachine,
  InvalidGate8ChangeRecordError,
  InvalidGate8TransitionError,
  PersistenceReconciliationError,
  ReadjudicationRequiredError,
  sealGate8ChangePayload,
  StaleGovernanceStateError,
  TerminalStateError,
  UnauthorizedSignerError,
  UnknownAuthorizationError,
  verifyGate8ChangeIntegrity,
} from "../sound-engineer/validation/gate8";

// ---------------------------------------------------------------------------
// Standard Test Fixtures & Factories
// ---------------------------------------------------------------------------

const CANONICAL_OFFICIAL = "Chief Sound Engineering Governance Authority";
const CANONICAL_OFFICIAL_KEY = "sec_key_chief_governance_2026_q4_phase1c5h";
const TEST_SCOPE = Object.freeze([
  "American High Gain Lead Channel",
  "British 800 Crunch",
  "Acoustic Preamp Clean",
]);

function createSampleAdoptionDecision(
  decisionId = "adr_wp24_001",
  governanceStatus = GOVERNANCE_STATUSES.ACTIVE,
  scope: readonly string[] = TEST_SCOPE,
  outcome: AdoptionDecisionOutcome = ADOPTION_DECISION_OUTCOMES.AUTHORIZED
): AdoptionDecisionRecord {
  return Object.freeze({
    decision_id: decisionId,
    package_id: "pkg_wp24_demo",
    readiness_assessment_id: "pra_wp24_demo",
    requested_scope: [...scope],
    authorized_scope: [...scope],
    version_binding_integrity_ref: "sha256_version_binding_ref_001",
    decision_outcome: outcome,
    decision_timestamp: "2026-10-15T00:00:00.000Z",
    conditions_and_restrictions: [],
    mandatory_monitoring_rules: ["MONITOR-THD-REALTIME"],
    rollback_verification_cert_ref: "cert_rollback_001",
    governance_status: governanceStatus,
    authorizing_official: CANONICAL_OFFICIAL,
    record_integrity_metadata: {
      integrity_digest: "digest_placeholder_adr",
      algorithm: "SHA-256",
      sealed_at: "2026-10-15T00:00:00.000Z",
      signer_identity: CANONICAL_OFFICIAL,
      canonical_serialization_format: "RFC-8785",
    },
  });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Phase 1C.5h WP-24: Post-Cutover Gate 8 Lifecycle State Machine (Record 22)", () => {
  // -------------------------------------------------------------------------
  // 1. Valid Governed Lifecycle Transitions
  // -------------------------------------------------------------------------
  describe("1. Valid Governed Lifecycle Transitions", () => {
    it("1.1 executes ACTIVE -> SUSPENDED with valid Record 22 and event", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_1");
      sm.registerAuthorization(decision);

      let eventReceived: Gate8LifecycleChangeEvent | undefined;
      sm.subscribe((evt) => {
        eventReceived = evt;
      });

      const result = sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Telemetry anomaly spike detected on Canary slice.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(result.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(sm.isAuthorizationActive(decision.decision_id), false);

      const state = sm.getAuthorizationState(decision.decision_id);
      assert.ok(state);
      assert.equal(state.currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(state.revision, 2);
      assert.equal(state.isTerminal, false);

      // Verify Record 22
      assert.ok(result.changeRecord);
      assert.equal(result.changeRecord.previous_governance_status, "ACTIVE");
      assert.equal(result.changeRecord.new_governance_status, "SUSPENDED");
      assert.equal(
        result.changeRecord.governance_effect,
        GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION
      );
      assert.equal(
        result.changeRecord.required_adoption_response,
        REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED
      );
      assert.equal(result.changeRecord.revalidation_required, true);
      assert.ok(result.changeRecord.record_integrity_metadata);

      // Verify event
      assert.ok(eventReceived);
      assert.equal(eventReceived.eventType, "GATE8_LIFECYCLE_STATUS_CHANGED");
      assert.equal(eventReceived.newGovernanceStatus, "SUSPENDED");
      assert.equal(eventReceived.changeRecordId, result.changeRecord.change_id);
    });

    it("1.2 executes ACTIVE -> RESTRICTED (scope narrowing carve-out)", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_2");
      sm.registerAuthorization(decision);

      const carvedOut = ["American High Gain Lead Channel"];
      const result = sm.restrictAuthorization({
        decisionId: decision.decision_id,
        carvedOutScope: carvedOut,
        changeReason: "Harmonic distortion out of tolerance on Lead channel.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(result.newStatus, GOVERNANCE_STATUSES.RESTRICTED);

      const state = sm.getAuthorizationState(decision.decision_id);
      assert.ok(state);
      assert.equal(state.currentStatus, GOVERNANCE_STATUSES.RESTRICTED);
      assert.deepEqual(state.currentAuthorizedScope, [
        "British 800 Crunch",
        "Acoustic Preamp Clean",
      ]);

      assert.equal(
        result.changeRecord.governance_effect,
        GOVERNANCE_EFFECTS.NARROW_SCOPE
      );
      assert.equal(
        result.changeRecord.required_adoption_response,
        REQUIRED_ADOPTION_RESPONSES.SCOPE_NARROWED
      );
      assert.deepEqual(result.changeRecord.affected_authorization_scope, carvedOut);
    });

    it("1.3 executes ACTIVE -> WITHDRAWN (terminal revocation)", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_3");
      sm.registerAuthorization(decision);

      const result = sm.withdrawAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Unresolved material regression; complete rollback mandatory.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.newStatus, GOVERNANCE_STATUSES.WITHDRAWN);

      const state = sm.getAuthorizationState(decision.decision_id);
      assert.ok(state);
      assert.equal(state.currentStatus, GOVERNANCE_STATUSES.WITHDRAWN);
      assert.equal(state.isTerminal, true);
      assert.deepEqual(state.currentAuthorizedScope, []);

      assert.equal(
        result.changeRecord.governance_effect,
        GOVERNANCE_EFFECTS.REVOKE_AUTHORIZATION
      );
      assert.equal(
        result.changeRecord.required_adoption_response,
        REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED
      );
      assert.equal(result.changeRecord.revalidation_required, false);
    });

    it("1.4 executes SUSPENDED -> WITHDRAWN", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_4");
      sm.registerAuthorization(decision);

      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Initial suspension.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const withdrawResult = sm.withdrawAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Remand failed to resolve regression; formal revocation.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(withdrawResult.previousStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(withdrawResult.newStatus, GOVERNANCE_STATUSES.WITHDRAWN);

      const state = sm.getAuthorizationState(decision.decision_id);
      assert.ok(state?.isTerminal);
      assert.equal(state?.currentStatus, GOVERNANCE_STATUSES.WITHDRAWN);
    });

    it("1.5 executes RESTRICTED -> WITHDRAWN", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_5");
      sm.registerAuthorization(decision);

      sm.restrictAuthorization({
        decisionId: decision.decision_id,
        carvedOutScope: ["British 800 Crunch"],
        changeReason: "Initial restriction.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const withdrawResult = sm.withdrawAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Remaining models also found deficient; total revocation.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(withdrawResult.previousStatus, GOVERNANCE_STATUSES.RESTRICTED);
      assert.equal(withdrawResult.newStatus, GOVERNANCE_STATUSES.WITHDRAWN);
      assert.ok(sm.getAuthorizationState(decision.decision_id)?.isTerminal);
    });

    it("1.6 executes SUSPENDED formal re-adjudication via canonical Record 21", () => {
      const sm = new Gate8StateMachine();
      const priorDecision = createSampleAdoptionDecision("adr_test_1_6_prior");
      sm.registerAuthorization(priorDecision);

      sm.suspendAuthorization({
        decisionId: priorDecision.decision_id,
        changeReason: "Suspended for retest.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      // Formal Gate 8 re-adjudication issues a new canonical AdoptionDecisionRecord (Record 21)
      const newDecisionRecord = createSampleAdoptionDecision(
        "adr_test_1_6_readjudicated",
        GOVERNANCE_STATUSES.ACTIVE,
        TEST_SCOPE,
        ADOPTION_DECISION_OUTCOMES.AUTHORIZED
      );

      const result = sm.readjudicateAuthorization({
        priorDecisionId: priorDecision.decision_id,
        readjudicationDecisionRecord: newDecisionRecord,
        changeReason: "Formal re-adjudication approved: retest passed with all tolerance criteria met.",
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.priorDecisionId, priorDecision.decision_id);
      assert.equal(result.previousStatus, GOVERNANCE_STATUSES.SUSPENDED);

      // Prior authorization record retired as SUPERSEDED via canonical Record 22
      assert.equal(result.supersededChangeRecord.previous_governance_status, "SUSPENDED");
      assert.equal(result.supersededChangeRecord.new_governance_status, "SUPERSEDED");
      assert.equal(
        result.supersededChangeRecord.governance_effect,
        GOVERNANCE_EFFECTS.SUPERSEDE_RECORD
      );

      const priorState = sm.getAuthorizationState(priorDecision.decision_id);
      assert.ok(priorState);
      assert.equal(priorState.currentStatus, GOVERNANCE_STATUSES.SUPERSEDED);
      assert.equal(priorState.isTerminal, true);

      // New authorization registered and ACTIVE
      assert.equal(result.newDecisionRecord.decision_id, newDecisionRecord.decision_id);
      assert.equal(result.newAuthorizationState.currentStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(sm.isAuthorizationActive(newDecisionRecord.decision_id), true);
    });

    it("1.7 executes RESTRICTED formal re-adjudication via canonical Record 21", () => {
      const sm = new Gate8StateMachine();
      const priorDecision = createSampleAdoptionDecision("adr_test_1_7_prior");
      sm.registerAuthorization(priorDecision);

      sm.restrictAuthorization({
        decisionId: priorDecision.decision_id,
        carvedOutScope: ["Acoustic Preamp Clean"],
        changeReason: "Temporarily restricting Acoustic Preamp pending harmonic check.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.DOWNSTREAM_DEFECT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const newDecisionRecord = createSampleAdoptionDecision(
        "adr_test_1_7_readjudicated",
        GOVERNANCE_STATUSES.ACTIVE,
        TEST_SCOPE,
        ADOPTION_DECISION_OUTCOMES.AUTHORIZED
      );

      const result = sm.reinstateAuthorization({
        priorDecisionId: priorDecision.decision_id,
        readjudicationDecisionRecord: newDecisionRecord,
        changeReason: "Re-adjudication panel re-certified Acoustic Preamp Clean after harmonic recalibration.",
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.previousStatus, GOVERNANCE_STATUSES.RESTRICTED);
      assert.equal(result.supersededChangeRecord.new_governance_status, "SUPERSEDED");
      assert.equal(
        result.supersededChangeRecord.governance_effect,
        GOVERNANCE_EFFECTS.SUPERSEDE_RECORD
      );

      assert.equal(
        sm.getAuthorizationState(priorDecision.decision_id)?.currentStatus,
        GOVERNANCE_STATUSES.SUPERSEDED
      );
      assert.equal(sm.isAuthorizationActive(newDecisionRecord.decision_id), true);
      assert.deepEqual(sm.getAuthorizedScope(newDecisionRecord.decision_id), TEST_SCOPE);
    });

    it("1.8 executes ACTIVE -> SUPERSEDED (version upgrade)", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_1_8");
      sm.registerAuthorization(decision);

      const result = sm.supersedeAuthorization({
        decisionId: decision.decision_id,
        supersedingDecisionId: "adr_v2_upgrade_001",
        changeReason: "Promoted to Version 2.0 release candidate.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(result.previousStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(result.newStatus, GOVERNANCE_STATUSES.SUPERSEDED);
      assert.ok(sm.getAuthorizationState(decision.decision_id)?.isTerminal);
      assert.equal(
        result.changeRecord.governance_effect,
        GOVERNANCE_EFFECTS.SUPERSEDE_RECORD
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Terminal-State & Invalid Transition Enforcement
  // -------------------------------------------------------------------------
  describe("2. Terminal-State & Invalid Transition Enforcement", () => {
    it("2.1 strictly rejects WITHDRAWN -> ACTIVE under all circumstances", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_1");
      sm.registerAuthorization(decision);

      sm.withdrawAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Permanent withdrawal.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.readjudicateAuthorization({
            priorDecisionId: decision.decision_id,
            readjudicationDecisionRecord: createSampleAdoptionDecision("adr_new_attempt"),
            changeReason: "Attempted reactivation of withdrawn record.",
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        TerminalStateError,
        "WITHDRAWN cannot be re-adjudicated or reinstated"
      );
    });

    it("2.2 strictly rejects WITHDRAWN -> any other governance state", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_2");
      sm.registerAuthorization(decision);
      sm.withdrawAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Terminal withdrawal.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const targets = [
        GOVERNANCE_STATUSES.SUSPENDED,
        GOVERNANCE_STATUSES.RESTRICTED,
        GOVERNANCE_STATUSES.SUPERSEDED,
        GOVERNANCE_STATUSES.WITHDRAWN,
      ];

      for (const target of targets) {
        assert.throws(
          () => {
            sm.transition({
              targetStatus: target,
              decisionId: decision.decision_id,
              changeReason: `Attempting transition from terminal WITHDRAWN to ${target}`,
              triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
              authorizingOfficial: CANONICAL_OFFICIAL,
              authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
            });
          },
          (err: any) =>
            err instanceof TerminalStateError || err instanceof InvalidGate8TransitionError,
          `Transition from WITHDRAWN to ${target} must fail closed`
        );
      }
    });

    it("2.3 Record 22 transition strictly rejects direct transition to ACTIVE", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_3");
      sm.registerAuthorization(decision);
      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspended.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.transition({
            targetStatus: GOVERNANCE_STATUSES.ACTIVE,
            decisionId: decision.decision_id,
            changeReason: "Attempted Record 22 direct transition to ACTIVE.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        InvalidGate8TransitionError,
        "Record 22 transition to ACTIVE must be rejected"
      );
    });

    it("2.4 rejects re-adjudication if new decision outcome is REJECTED or BLOCKED", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_4");
      sm.registerAuthorization(decision);
      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspended.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const negativeDecision = createSampleAdoptionDecision(
        "adr_negative_readjudication",
        GOVERNANCE_STATUSES.ACTIVE,
        TEST_SCOPE,
        ADOPTION_DECISION_OUTCOMES.REJECTED
      );

      assert.throws(
        () => {
          sm.readjudicateAuthorization({
            priorDecisionId: decision.decision_id,
            readjudicationDecisionRecord: negativeDecision,
            changeReason: "Attempting re-adjudication with REJECTED outcome.",
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        ReadjudicationRequiredError,
        "Re-adjudication with REJECTED outcome must fail closed"
      );
    });

    it("2.5 rejects same-state transitions (e.g. SUSPENDED -> SUSPENDED)", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_5");
      sm.registerAuthorization(decision);
      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Initial suspension.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.transition({
            targetStatus: GOVERNANCE_STATUSES.SUSPENDED,
            decisionId: decision.decision_id,
            changeReason: "Redundant suspension request.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        InvalidGate8TransitionError,
        "SUSPENDED -> SUSPENDED same-state transition must be rejected"
      );
    });

    it("2.6 rejects direct conversion between SUSPENDED and RESTRICTED", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_6");
      sm.registerAuthorization(decision);
      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspended.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.restrictAuthorization({
            decisionId: decision.decision_id,
            carvedOutScope: ["British 800 Crunch"],
            changeReason: "Direct conversion from SUSPENDED to RESTRICTED.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.DOWNSTREAM_DEFECT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        InvalidGate8TransitionError,
        "Direct conversion between SUSPENDED and RESTRICTED must be rejected"
      );
    });

    it("2.7 rejects transitions for unknown or untracked decisionId", () => {
      const sm = new Gate8StateMachine();

      assert.throws(
        () => {
          sm.suspendAuthorization({
            decisionId: "unknown_decision_999",
            changeReason: "Suspension on unregistered decision.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        UnknownAuthorizationError
      );
    });

    it("2.8 rejects unauthorized official or forged cryptographic key", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_2_8");
      sm.registerAuthorization(decision);

      assert.throws(
        () => {
          sm.suspendAuthorization({
            decisionId: decision.decision_id,
            changeReason: "Suspension by unauthorized entity.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: "Unauthorized Intruder",
          });
        },
        UnauthorizedSignerError
      );

      assert.throws(
        () => {
          sm.suspendAuthorization({
            decisionId: decision.decision_id,
            changeReason: "Suspension with bad key.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: "forged_key_material_000",
          });
        },
        UnauthorizedSignerError
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Record 22 (Gate8ChangeRecord) Integrity & Schema Suite
  // -------------------------------------------------------------------------
  describe("3. Record 22 Audit & Integrity Guarantees", () => {
    it("3.1 generated Gate8ChangeRecord strictly satisfies gate8ChangeRecordSchema", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_3_1");
      sm.registerAuthorization(decision);

      const result = sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Validation failure during nightly benchmark.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.REVALIDATION_FAILURE,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      const parsed = gate8ChangeRecordSchema.parse(result.changeRecord);
      assert.equal(parsed.change_id, result.changeRecord.change_id);
      assert.equal(parsed.decision_id, decision.decision_id);
      assert.equal(parsed.previous_governance_status, "ACTIVE");
      assert.equal(parsed.new_governance_status, "SUSPENDED");
      assert.ok(verifyGate8ChangeIntegrity(result.changeRecord));
    });

    it("3.2 previous_governance_status is strictly constrained to ACTIVE | SUSPENDED | RESTRICTED", () => {
      const validBase = {
        change_id: "g8c_prev_test",
        decision_id: "adr_001",
        new_governance_status: NEW_GOVERNANCE_STATUSES.WITHDRAWN,
        change_reason: "Permanent withdrawal test.",
        trigger_source: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        governance_effect: GOVERNANCE_EFFECTS.REVOKE_AUTHORIZATION,
        affected_authorization_scope: ["Lead"],
        required_adoption_response: REQUIRED_ADOPTION_RESPONSES.ROLLBACK_REQUIRED,
        revalidation_required: false,
        change_timestamp: "2026-10-15T00:00:00.000Z",
        authorizing_official: CANONICAL_OFFICIAL,
        record_integrity_metadata: {
          integrity_digest: "digest",
          algorithm: "SHA-256",
          sealed_at: "2026-10-15T00:00:00.000Z",
          signer_identity: CANONICAL_OFFICIAL,
          canonical_serialization_format: "RFC-8785",
        },
      };

      for (const validPrev of ["ACTIVE", "SUSPENDED", "RESTRICTED"]) {
        const parsed = gate8ChangeRecordSchema.parse({
          ...validBase,
          previous_governance_status: validPrev as any,
        });
        assert.equal(parsed.previous_governance_status, validPrev);
      }

      for (const invalidPrev of ["WITHDRAWN", "SUPERSEDED", "UNKNOWN", "PENDING"]) {
        assert.throws(
          () => {
            gate8ChangeRecordSchema.parse({
              ...validBase,
              previous_governance_status: invalidPrev as any,
            });
          },
          ZodError,
          `previous_governance_status must reject "${invalidPrev}"`
        );
      }
    });

    it("3.3 Record 22 strictly REJECTS ACTIVE as new_governance_status", () => {
      const validBase = {
        change_id: "g8c_reject_active",
        decision_id: "adr_001",
        previous_governance_status: PREVIOUS_GOVERNANCE_STATUSES.SUSPENDED,
        change_reason: "Attempting to declare ACTIVE in Record 22.",
        trigger_source: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        governance_effect: GOVERNANCE_EFFECTS.SUSPEND_AUTHORIZATION,
        affected_authorization_scope: ["Lead"],
        required_adoption_response: REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE,
        revalidation_required: false,
        change_timestamp: "2026-10-15T00:00:00.000Z",
        authorizing_official: CANONICAL_OFFICIAL,
        record_integrity_metadata: {
          integrity_digest: "digest",
          algorithm: "SHA-256",
          sealed_at: "2026-10-15T00:00:00.000Z",
          signer_identity: CANONICAL_OFFICIAL,
          canonical_serialization_format: "RFC-8785",
        },
      };

      assert.throws(
        () => {
          gate8ChangeRecordSchema.parse({
            ...validBase,
            new_governance_status: "ACTIVE" as any,
          });
        },
        ZodError,
        "Record 22 must strictly reject ACTIVE as new_governance_status under frozen Section 28.3"
      );
    });

    it("3.4 Record 22 strictly REJECTS REINSTATE_AUTHORIZATION as governance_effect", () => {
      const validBase = {
        change_id: "g8c_reject_reinstate",
        decision_id: "adr_001",
        previous_governance_status: PREVIOUS_GOVERNANCE_STATUSES.SUSPENDED,
        new_governance_status: NEW_GOVERNANCE_STATUSES.SUPERSEDED,
        change_reason: "Attempting to declare invented REINSTATE_AUTHORIZATION.",
        trigger_source: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
        affected_authorization_scope: ["Lead"],
        required_adoption_response: REQUIRED_ADOPTION_RESPONSES.NO_OPERATIONAL_CHANGE,
        revalidation_required: false,
        change_timestamp: "2026-10-15T00:00:00.000Z",
        authorizing_official: CANONICAL_OFFICIAL,
        record_integrity_metadata: {
          integrity_digest: "digest",
          algorithm: "SHA-256",
          sealed_at: "2026-10-15T00:00:00.000Z",
          signer_identity: CANONICAL_OFFICIAL,
          canonical_serialization_format: "RFC-8785",
        },
      };

      assert.throws(
        () => {
          gate8ChangeRecordSchema.parse({
            ...validBase,
            governance_effect: "REINSTATE_AUTHORIZATION" as any,
          });
        },
        ZodError,
        "Record 22 must strictly reject invented REINSTATE_AUTHORIZATION"
      );
    });

    it("3.5 failed transitions do NOT mutate state or append records to ledger", () => {
      const ledger = new ValidationAuditLedger();
      const sm = new Gate8StateMachine({ auditLedger: ledger });
      const decision = createSampleAdoptionDecision("adr_test_3_5");
      sm.registerAuthorization(decision);

      const initialCount = ledger.getEntryCount();

      assert.throws(() => {
        sm.transition({
          targetStatus: GOVERNANCE_STATUSES.ACTIVE, // invalid transition to active
          decisionId: decision.decision_id,
          changeReason: "Invalid direct transition to ACTIVE.",
          triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
          authorizingOfficial: CANONICAL_OFFICIAL,
          authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        });
      }, InvalidGate8TransitionError);

      assert.equal(ledger.getEntryCount(), initialCount);
      const state = sm.getAuthorizationState(decision.decision_id);
      assert.equal(state?.currentStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(state?.revision, 1);
      assert.equal(state?.history.length, 0);
    });

    it("3.6 successful transition persists to ledger and registers in graph", () => {
      const ledger = new ValidationAuditLedger();
      const graph = new ValidationRelationshipGraph();
      const sm = new Gate8StateMachine({ auditLedger: ledger, graph });
      const decision = createSampleAdoptionDecision("adr_test_3_6");
      sm.registerAuthorization(decision);

      const result = sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspended.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(ledger.getEntryCount(), 1);
      const ledgerEntry = ledger.getLatestEntry();
      assert.equal(ledgerEntry?.entityKind, "Gate8ChangeRecord");
      assert.equal(ledgerEntry?.entityId, result.changeRecord.change_id);

      assert.ok(graph.hasNode(result.changeRecord.change_id));
      const graphNode = graph.getNode(result.changeRecord.change_id);
      assert.equal(graphNode?.kind, "Gate8ChangeRecord");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Persistence Failure Recovery & Reconciliation Suite
  // -------------------------------------------------------------------------
  describe("4. Persistence Failure Recovery & Audit Ledger Reconciliation", () => {
    it("4.1 throws PersistenceReconciliationError when graph registration fails after ledger commit", () => {
      const ledger = new ValidationAuditLedger();
      const graph = new ValidationRelationshipGraph();

      // Simulate graph failure by monkey-patching registerNode to throw on change record
      const originalRegisterNode = graph.registerNode.bind(graph);
      let simulateFailure = true;
      graph.registerNode = (endpoint: any) => {
        if (simulateFailure && endpoint.kind === "Gate8ChangeRecord") {
          throw new Error("Simulated storage/graph connection failure");
        }
        return originalRegisterNode(endpoint);
      };

      const sm = new Gate8StateMachine({ auditLedger: ledger, graph });
      const decision = createSampleAdoptionDecision("adr_test_4_1");
      sm.registerAuthorization(decision);

      assert.throws(
        () => {
          sm.suspendAuthorization({
            decisionId: decision.decision_id,
            changeReason: "Testing partial persistence failure.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
            changeId: "g8c_simulated_partial_fail",
          });
        },
        PersistenceReconciliationError,
        "Must throw PersistenceReconciliationError when graph registration fails after ledger commit"
      );

      // Ledger MUST have committed the record (append-only Invariant 10)
      assert.equal(ledger.getEntryCount(), 1);
      const entry = ledger.getLatestEntry();
      assert.equal(entry?.entityId, "g8c_simulated_partial_fail");

      // Graph does NOT yet have the node due to simulated failure
      assert.equal(graph.hasNode("g8c_simulated_partial_fail"), false);

      // In-memory state was not mutated
      const staleState = sm.getAuthorizationState(decision.decision_id);
      assert.equal(staleState?.currentStatus, GOVERNANCE_STATUSES.ACTIVE);
      assert.equal(staleState?.revision, 1);
    });

    it("4.2 retrying after graph restoration succeeds idempotently without duplicate ledger entries", () => {
      const ledger = new ValidationAuditLedger();
      const graph = new ValidationRelationshipGraph();

      let failCount = 1;
      const originalRegisterNode = graph.registerNode.bind(graph);
      graph.registerNode = (endpoint: any) => {
        if (failCount > 0 && endpoint.kind === "Gate8ChangeRecord") {
          failCount--;
          throw new Error("Transient graph write lock failure");
        }
        return originalRegisterNode(endpoint);
      };

      const sm = new Gate8StateMachine({ auditLedger: ledger, graph });
      const decision = createSampleAdoptionDecision("adr_test_4_2");
      sm.registerAuthorization(decision);

      const params = {
        decisionId: decision.decision_id,
        changeReason: "Testing retry idempotency after partial failure.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        changeId: "g8c_retry_test_001",
      };

      // 1. First attempt fails at graph registration
      assert.throws(() => sm.suspendAuthorization(params), PersistenceReconciliationError);
      assert.equal(ledger.getEntryCount(), 1);

      // 2. Retry with same parameters now that graph error condition is cleared
      const result = sm.suspendAuthorization(params);

      assert.equal(result.success, true);
      assert.equal(result.newStatus, GOVERNANCE_STATUSES.SUSPENDED);
      // Crucial: ZERO duplicate entries in the append-only ledger!
      assert.equal(ledger.getEntryCount(), 1);

      // Graph now has the node
      assert.ok(graph.hasNode("g8c_retry_test_001"));

      // In-memory state is now accurately updated
      const state = sm.getAuthorizationState(decision.decision_id);
      assert.equal(state?.currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(state?.revision, 2);
    });

    it("4.3 reconcileFromLedger reconstructs authoritative lifecycle state from append-only ledger", () => {
      const ledger = new ValidationAuditLedger();
      const graph = new ValidationRelationshipGraph();

      // Simulate a state machine instance where a change was written to ledger
      const decision = createSampleAdoptionDecision("adr_test_4_3");
      ledger.appendRecord("AdoptionDecisionRecord", decision.decision_id, decision);

      const changePayload = {
        change_id: "g8c_reconcile_001",
        decision_id: decision.decision_id,
        previous_governance_status: "ACTIVE" as const,
        new_governance_status: "SUSPENDED" as const,
        change_reason: "Committed directly to ledger during previous session.",
        trigger_source: "TELEMETRY_STOP_CRITERIA" as const,
        governance_effect: "SUSPEND_AUTHORIZATION" as const,
        affected_authorization_scope: [...decision.authorized_scope],
        required_adoption_response: "ADOPTION_HALTED" as const,
        revalidation_required: true,
        change_timestamp: "2026-10-18T12:00:00.000Z",
        authorizing_official: CANONICAL_OFFICIAL,
      };

      const sealedMetadata = sealGate8ChangePayload(
        changePayload,
        CANONICAL_OFFICIAL,
        ledger.getIntegrityProvider(),
        changePayload.change_timestamp
      );

      const changeRecord: Gate8ChangeRecord = {
        ...changePayload,
        record_integrity_metadata: sealedMetadata,
      };

      ledger.appendRecord("Gate8ChangeRecord", changeRecord.change_id, changeRecord);

      // Create a fresh state machine with no in-memory state
      const sm = new Gate8StateMachine({ auditLedger: ledger, graph });
      assert.equal(sm.getAuthorizationState(decision.decision_id), undefined);
      assert.equal(graph.hasNode(changeRecord.change_id), false);

      // Reconcile from authoritative ledger
      const reconciliation = sm.reconcileFromLedger();

      assert.equal(reconciliation.reconciledDecisions, 1);
      assert.equal(reconciliation.replayedChanges, 1);
      assert.equal(reconciliation.graphNodesRegistered, 2); // 1 decision + 1 change record

      // Authoritative state is now completely reconstructed
      const restoredState = sm.getAuthorizationState(decision.decision_id);
      assert.ok(restoredState);
      assert.equal(restoredState.currentStatus, GOVERNANCE_STATUSES.SUSPENDED);
      assert.equal(restoredState.revision, 2);
      assert.equal(restoredState.history.length, 1);
      assert.equal(restoredState.history[0].change_id, changeRecord.change_id);

      // Graph is reconciled
      assert.ok(graph.hasNode(decision.decision_id));
      assert.ok(graph.hasNode(changeRecord.change_id));
    });
  });

  // -------------------------------------------------------------------------
  // 5. Concurrency & Idempotency Protection
  // -------------------------------------------------------------------------
  describe("5. Concurrency & Idempotency Protection", () => {
    it("5.1 detects stale status via expectedCurrentStatus precondition", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_5_1");
      sm.registerAuthorization(decision);

      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "First suspension.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.suspendAuthorization({
            decisionId: decision.decision_id,
            expectedCurrentStatus: GOVERNANCE_STATUSES.ACTIVE,
            changeReason: "Concurrent client assuming ACTIVE.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        StaleGovernanceStateError,
        "Stale expectedCurrentStatus must throw StaleGovernanceStateError"
      );
    });

    it("5.2 detects stale revision via expectedRevision precondition", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_5_2");
      sm.registerAuthorization(decision);

      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspension bump.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.throws(
        () => {
          sm.withdrawAuthorization({
            decisionId: decision.decision_id,
            expectedRevision: 1,
            changeReason: "Withdrawal based on stale revision 1.",
            triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
            authorizingOfficial: CANONICAL_OFFICIAL,
            authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
          });
        },
        StaleGovernanceStateError,
        "Stale expectedRevision must throw StaleGovernanceStateError"
      );
    });

    it("5.3 returns cached result idempotently when called with identical changeId", () => {
      const ledger = new ValidationAuditLedger();
      const sm = new Gate8StateMachine({ auditLedger: ledger });
      const decision = createSampleAdoptionDecision("adr_test_5_3");
      sm.registerAuthorization(decision);

      const fixedChangeId = "g8c_fixed_id_5_3";
      const params = {
        changeId: fixedChangeId,
        decisionId: decision.decision_id,
        changeReason: "Idempotent suspension test.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      };

      const result1 = sm.suspendAuthorization(params);
      const ledgerCountAfterFirst = ledger.getEntryCount();

      const result2 = sm.suspendAuthorization(params);

      assert.equal(result1.changeRecord.change_id, fixedChangeId);
      assert.equal(result2.changeRecord.change_id, fixedChangeId);
      assert.equal(result1, result2);
      assert.equal(ledger.getEntryCount(), ledgerCountAfterFirst);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Event Emission & Phase 1C.5g Consumer Integration
  // -------------------------------------------------------------------------
  describe("6. Event Emission & Phase 1C.5g Consumer Integration", () => {
    it("6.1 emits valid Gate8LifecycleChangeEvent to subscribers", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_6_1");
      sm.registerAuthorization(decision);

      const receivedEvents: Gate8LifecycleChangeEvent[] = [];
      sm.subscribe((evt) => {
        receivedEvents.push(evt);
      });

      sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Suspending for canary test.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(receivedEvents.length, 1);
      const evt = receivedEvents[0];
      assert.equal(evt.eventType, "GATE8_LIFECYCLE_STATUS_CHANGED");
      assert.equal(evt.decisionId, decision.decision_id);
      assert.equal(evt.previousGovernanceStatus, "ACTIVE");
      assert.equal(evt.newGovernanceStatus, "SUSPENDED");
      assert.equal(evt.requiredAdoptionResponse, REQUIRED_ADOPTION_RESPONSES.ADOPTION_HALTED);
      assert.ok(evt.changeRecord);
      assert.equal(evt.authorizingOfficial, CANONICAL_OFFICIAL);

      const history = sm.getEventHistory(decision.decision_id);
      assert.equal(history.length, 1);
      assert.equal(history[0].eventId, evt.eventId);
    });

    it("6.2 failed transition does NOT emit false lifecycle event", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_6_2");
      sm.registerAuthorization(decision);

      const events: Gate8LifecycleChangeEvent[] = [];
      sm.subscribe((evt) => {
        events.push(evt);
      });

      try {
        sm.transition({
          targetStatus: GOVERNANCE_STATUSES.ACTIVE,
          decisionId: decision.decision_id,
          changeReason: "Failing transition.",
          triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.HUMAN_AUDIT,
          authorizingOfficial: CANONICAL_OFFICIAL,
          authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
        });
      } catch {
        // Expected
      }

      assert.equal(events.length, 0);
      assert.equal(sm.getLifecycleEvents().length, 0);
    });

    it("6.3 subscriber errors do not disrupt state machine transition execution", () => {
      const sm = new Gate8StateMachine();
      const decision = createSampleAdoptionDecision("adr_test_6_3");
      sm.registerAuthorization(decision);

      sm.subscribe(() => {
        throw new Error("Downstream Phase 1C.5g listener crashed");
      });

      sm.subscribe(async () => {
        throw new Error("Async consumer rejected");
      });

      const result = sm.suspendAuthorization({
        decisionId: decision.decision_id,
        changeReason: "Testing consumer isolation.",
        triggerSource: GATE8_CHANGE_TRIGGER_SOURCES.TELEMETRY_STOP_CRITERIA,
        authorizingOfficial: CANONICAL_OFFICIAL,
        authorizingOfficialKey: CANONICAL_OFFICIAL_KEY,
      });

      assert.equal(result.success, true);
      assert.equal(sm.getAuthorizationState(decision.decision_id)?.currentStatus, "SUSPENDED");
    });
  });
});
