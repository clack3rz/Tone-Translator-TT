// src/sound-engineer/validation/gate8/stateMachineErrors.ts
// Authoritative error classes for Phase 1C.5h WP-24:
// Post-Cutover Gate 8 Lifecycle State Machine (Record 22).
// Bound to frozen specification v0.1j Section 28, Table 18, Table 04, and Build Plan v0.1h WP-24.

import { Gate8Error } from "./gate8Errors";

/**
 * Thrown when an invalid transition between governance statuses is attempted.
 */
export class InvalidGate8TransitionError extends Gate8Error {
  public readonly fromStatus: string;
  public readonly toStatus: string;

  constructor(fromStatus: string, toStatus: string, details?: string) {
    const detailMsg = details ? ` - ${details}` : "";
    super(
      `Gate 8 State Machine: Disallowed lifecycle transition from "${fromStatus}" to "${toStatus}"${detailMsg}.`
    );
    this.name = "InvalidGate8TransitionError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Thrown when any state mutation or reactivation is attempted on an authorization in a terminal state
 * (specifically WITHDRAWN, or SUPERSEDED).
 */
export class TerminalStateError extends Gate8Error {
  public readonly decisionId: string;
  public readonly terminalStatus: string;

  constructor(decisionId: string, terminalStatus: string, details?: string) {
    const detailMsg = details ? ` - ${details}` : "";
    super(
      `Gate 8 State Machine Terminal State Violation: Authorization "${decisionId}" is in terminal state "${terminalStatus}" and cannot undergo state transitions${detailMsg}. Withdrawn authorizations are permanently closed and cannot be reactivated; a remediated candidate requires a new ValidationPackage and a new AdoptionDecisionRecord.`
    );
    this.name = "TerminalStateError";
    this.decisionId = decisionId;
    this.terminalStatus = terminalStatus;
  }
}

/**
 * Thrown when reinstatement from SUSPENDED or RESTRICTED to ACTIVE is attempted without
 * valid formal Gate 8 re-adjudication evidence, or with an unauthorized official / negative outcome.
 */
export class ReadjudicationRequiredError extends Gate8Error {
  public readonly decisionId: string;
  public readonly fromStatus: string;

  constructor(decisionId: string, fromStatus: string, reason: string) {
    super(
      `Gate 8 State Machine Re-Adjudication Requirement: Authorization "${decisionId}" in status "${fromStatus}" requires formal Gate 8 re-adjudication to return to ACTIVE. Failure: ${reason}`
    );
    this.name = "ReadjudicationRequiredError";
    this.decisionId = decisionId;
    this.fromStatus = fromStatus;
  }
}

/**
 * Thrown when an operation is requested on an unrecognized or untracked Gate 8 decisionId.
 */
export class UnknownAuthorizationError extends Gate8Error {
  public readonly decisionId: string;

  constructor(decisionId: string) {
    super(
      `Gate 8 State Machine: Authorization with decision_id "${decisionId}" is not registered or tracked in the state machine.`
    );
    this.name = "UnknownAuthorizationError";
    this.decisionId = decisionId;
  }
}

/**
 * Thrown when optimistic concurrency or precondition validation fails because
 * the authoritative current state or revision differs from the caller's expectation.
 */
export class StaleGovernanceStateError extends Gate8Error {
  public readonly decisionId: string;
  public readonly expectedStatus?: string;
  public readonly actualStatus: string;
  public readonly expectedRevision?: number;
  public readonly actualRevision: number;

  constructor(
    decisionId: string,
    actualStatus: string,
    actualRevision: number,
    expectedStatus?: string,
    expectedRevision?: number
  ) {
    const statusMsg = expectedStatus
      ? `expected status "${expectedStatus}", actual "${actualStatus}"`
      : `actual status "${actualStatus}"`;
    const revMsg =
      expectedRevision !== undefined
        ? `expected revision ${expectedRevision}, actual ${actualRevision}`
        : `revision ${actualRevision}`;
    super(
      `Gate 8 State Machine Concurrency Precondition Failure for "${decisionId}": Stale state detected (${statusMsg}, ${revMsg}).`
    );
    this.name = "StaleGovernanceStateError";
    this.decisionId = decisionId;
    this.expectedStatus = expectedStatus;
    this.actualStatus = actualStatus;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

/**
 * Thrown when a Gate8ChangeRecord payload is invalid or fails cryptographic integrity verification.
 */
export class InvalidGate8ChangeRecordError extends Gate8Error {
  constructor(message: string) {
    super(`Gate 8 Change Record Validation Failure: ${message}`);
    this.name = "InvalidGate8ChangeRecordError";
  }
}

/**
 * Thrown when an authoritative ledger commit succeeded but subsequent downstream
 * projection registration (such as ValidationRelationshipGraph) fails, indicating
 * a partial persistence state that requires reconciliation.
 */
export class PersistenceReconciliationError extends Gate8Error {
  public readonly decisionId: string;
  public readonly changeId: string;
  public readonly causeError?: unknown;

  constructor(
    decisionId: string,
    changeId: string,
    message: string,
    causeError?: unknown
  ) {
    super(
      `Gate 8 Persistence Reconciliation Required for decision "${decisionId}", change "${changeId}": ${message}`
    );
    this.name = "PersistenceReconciliationError";
    this.decisionId = decisionId;
    this.changeId = changeId;
    this.causeError = causeError;
  }
}

