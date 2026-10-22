// src/sound-engineer/validation/remand/remandAgingTracker.ts
// Phase 1C.5h WP-25: Remand Aging & Handoff Return Tracker.
// Bound to frozen specification v0.1j Section 29, Table 17, and Implementation Plan v0.1h WP-25.

import { deepFreeze } from "../../contracts/immutability";
import {
  DefectRemandPackage,
  RemandAgeRecord,
  RemandHandoffTracking,
} from "./remandTypes";

/**
 * Thrown when an operation targets an unknown or unregistered remand ID.
 */
export class RemandNotFoundError extends Error {
  constructor(public readonly remandId: string) {
    super(`[REMAND NOT FOUND] No remand registered with ID '${remandId}'.`);
    this.name = "RemandNotFoundError";
  }
}

/**
 * Thrown when an illegal attempt is made to overwrite an existing remand with conflicting data.
 */
export class DuplicateRemandRegistrationError extends Error {
  constructor(public readonly remandId: string, message: string) {
    super(`[DUPLICATE REMAND REGISTRATION] Remand '${remandId}': ${message}`);
    this.name = "DuplicateRemandRegistrationError";
  }
}

/**
 * Thrown when an invalid handoff return is recorded (e.g. empty reference, invalid timestamp, temporal violation).
 */
export class InvalidRemandHandoffError extends Error {
  constructor(public readonly remandId: string, message: string) {
    super(`[INVALID REMAND HANDOFF] Remand '${remandId}': ${message}`);
    this.name = "InvalidRemandHandoffError";
  }
}

/**
 * Thrown when aging calculation input is invalid (e.g. negative threshold, malformed timestamp, inverted time).
 */
export class InvalidAgingCalculationError extends Error {
  constructor(message: string) {
    super(`[INVALID AGING CALCULATION] ${message}`);
    this.name = "InvalidAgingCalculationError";
  }
}

export type NowFn = () => Date;

export interface RemandAgingTrackerOptions {
  /** Optional deterministic time-provider function. Defaults to system clock. */
  readonly nowFn?: NowFn;
}

/**
 * Authoritative Remand Aging & Handoff Return Tracker.
 * Implements WP-25 Failure Modes & Mitigations ("remand aging tracker flagging un-remediated defects").
 *
 * Enforces:
 * 1. Factual tracking: OUTSTANDING -> RETURNED upon upstream handoff recording.
 * 2. Immutable history: zero modification of historical records or ledger entries.
 * 3. Exact duration calculation: elapsed duration = asOf - remandedAt.
 * 4. Zero hardcoded SLAs: threshold comparison evaluated strictly when caller supplies thresholdMs.
 * 5. Deterministic time injection for reproducible verification.
 */
export class RemandAgingTracker {
  private readonly nowFn: NowFn;
  private readonly packages = new Map<string, DefectRemandPackage>();
  private readonly trackings = new Map<string, RemandHandoffTracking>();

  constructor(options: RemandAgingTrackerOptions = {}) {
    this.nowFn = options.nowFn ?? (() => new Date());
  }

  /**
   * Registers a newly assembled DefectRemandPackage.
   * Duplicate registration with identical package and failure IDs succeeds idempotently.
   * Conflicting registration for the same remandId throws DuplicateRemandRegistrationError.
   */
  public registerRemand(remandPackage: DefectRemandPackage): void {
    if (!remandPackage || typeof remandPackage !== "object") {
      throw new DuplicateRemandRegistrationError("UNKNOWN", "Package must be a valid DefectRemandPackage object.");
    }

    const { tracking, failureRecord, packageId } = remandPackage;
    if (!tracking || !tracking.remandId || tracking.remandId.trim() === "") {
      throw new DuplicateRemandRegistrationError("UNKNOWN", "Remand package must contain valid tracking with a non-empty remandId.");
    }
    if (!tracking.remandedAt || isNaN(Date.parse(tracking.remandedAt))) {
      throw new DuplicateRemandRegistrationError(tracking.remandId, "Tracking must contain a valid ISO 8601 UTC remandedAt timestamp.");
    }

    const existingPkg = this.packages.get(tracking.remandId);
    if (existingPkg) {
      // Idempotency check: exactly identical package and failure record IDs
      if (
        existingPkg.packageId === packageId &&
        existingPkg.failureRecord.failure_id === failureRecord.failure_id
      ) {
        return;
      }
      throw new DuplicateRemandRegistrationError(
        tracking.remandId,
        `Remand ID already registered with conflicting packageId '${existingPkg.packageId}' vs '${packageId}'.`
      );
    }

    // Store deep-frozen defensive copies
    this.packages.set(tracking.remandId, deepFreeze({ ...remandPackage }));
    this.trackings.set(tracking.remandId, deepFreeze({ ...tracking }));
  }

  /**
   * Records receipt of an upstream remediation handoff package.
   * Transitions factual status from OUTSTANDING to RETURNED.
   */
  public recordHandoffReturn(
    remandId: string,
    returnRef: string,
    returnedAt?: string
  ): RemandHandoffTracking {
    if (!remandId || remandId.trim() === "") {
      throw new RemandNotFoundError(remandId ?? "");
    }

    const existing = this.trackings.get(remandId);
    if (!existing) {
      throw new RemandNotFoundError(remandId);
    }

    if (!returnRef || returnRef.trim() === "") {
      throw new InvalidRemandHandoffError(remandId, "Handoff return reference must be a non-empty string.");
    }
    const cleanReturnRef = returnRef.trim();

    const timestamp = returnedAt ?? this.nowFn().toISOString();
    const timestampMs = Date.parse(timestamp);
    if (isNaN(timestampMs)) {
      throw new InvalidRemandHandoffError(remandId, `Malformed returnedAt timestamp: '${timestamp}'.`);
    }

    const remandedAtMs = Date.parse(existing.remandedAt);
    if (timestampMs < remandedAtMs) {
      throw new InvalidRemandHandoffError(
        remandId,
        `returnedAt timestamp (${timestamp}) cannot be earlier than remandedAt timestamp (${existing.remandedAt}).`
      );
    }

    // Idempotent retry check if already RETURNED
    if (existing.status === "RETURNED") {
      if (existing.handoffReturnRef === cleanReturnRef) {
        return existing;
      }
      throw new InvalidRemandHandoffError(
        remandId,
        `Conflicting handoff return already recorded with reference '${existing.handoffReturnRef}'.`
      );
    }

    const updatedTracking: RemandHandoffTracking = deepFreeze({
      ...existing,
      status: "RETURNED",
      handoffReturnRef: cleanReturnRef,
      returnedAt: timestamp,
    });

    // Update internal state
    this.trackings.set(remandId, updatedTracking);

    const existingPkg = this.packages.get(remandId);
    if (existingPkg) {
      this.packages.set(
        remandId,
        deepFreeze({
          ...existingPkg,
          tracking: updatedTracking,
        })
      );
    }

    return updatedTracking;
  }

  /**
   * Returns all currently OUTSTANDING remands (un-remediated).
   */
  public getOutstandingRemands(): ReadonlyArray<RemandHandoffTracking> {
    const outstanding: RemandHandoffTracking[] = [];
    for (const tracking of this.trackings.values()) {
      if (tracking.status === "OUTSTANDING") {
        outstanding.push(tracking);
      }
    }
    return deepFreeze(outstanding);
  }

  /**
   * Returns factual tracking for a given remand ID if registered.
   */
  public getTracking(remandId: string): RemandHandoffTracking | undefined {
    return this.trackings.get(remandId);
  }

  /**
   * Returns full DefectRemandPackage for a given remand ID if registered.
   */
  public getPackage(remandId: string): DefectRemandPackage | undefined {
    return this.packages.get(remandId);
  }

  /**
   * Calculates quantitative aging across all registered remands.
   *
   * Rules:
   * - elapsedMs = asOf - remandedAt.
   * - isUnremediated = true strictly while status === "OUTSTANDING".
   * - exceedsThreshold = elapsedMs > thresholdMs (populated strictly when thresholdMs is supplied).
   * - negative thresholdMs throws InvalidAgingCalculationError.
   * - asOf earlier than remandedAt throws InvalidAgingCalculationError.
   */
  public calculateAging(
    asOf?: string,
    thresholdMs?: number
  ): ReadonlyArray<RemandAgeRecord> {
    const asOfStr = asOf ?? this.nowFn().toISOString();
    const asOfMs = Date.parse(asOfStr);
    if (isNaN(asOfMs)) {
      throw new InvalidAgingCalculationError(`Malformed asOf timestamp: '${asOfStr}'.`);
    }

    if (thresholdMs !== undefined) {
      if (typeof thresholdMs !== "number" || isNaN(thresholdMs) || thresholdMs < 0) {
        throw new InvalidAgingCalculationError(`thresholdMs must be a non-negative number; received ${thresholdMs}.`);
      }
    }

    const records: RemandAgeRecord[] = [];

    for (const [remandId, tracking] of this.trackings.entries()) {
      const remandedAtMs = Date.parse(tracking.remandedAt);
      if (isNaN(remandedAtMs)) {
        throw new InvalidAgingCalculationError(
          `Malformed remandedAt timestamp '${tracking.remandedAt}' on remand '${remandId}'.`
        );
      }

      if (asOfMs < remandedAtMs) {
        throw new InvalidAgingCalculationError(
          `asOf timestamp (${asOfStr}) cannot be earlier than remandedAt timestamp (${tracking.remandedAt}) on remand '${remandId}'.`
        );
      }

      const elapsedMs = asOfMs - remandedAtMs;
      const isUnremediated = tracking.status === "OUTSTANDING";
      const pkg = this.packages.get(remandId);
      const materiality = pkg?.failureRecord.materiality ?? "MAJOR";

      const record: RemandAgeRecord = {
        remandId,
        failureId: tracking.failureId,
        materiality,
        remandedAt: tracking.remandedAt,
        elapsedMs,
        isUnremediated,
        ...(thresholdMs !== undefined ? { exceedsThreshold: elapsedMs > thresholdMs } : {}),
      };

      records.push(record);
    }

    return deepFreeze(records);
  }
}
