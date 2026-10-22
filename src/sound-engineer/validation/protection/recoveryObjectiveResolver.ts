// src/sound-engineer/validation/protection/recoveryObjectiveResolver.ts
// Recovery objective resolver interface and registry for Phase 1C.5h WP-27.
// Bound to frozen specification v0.1j Section 31.2 and PROFILE-11.
// Strictly adheres to the zero-hardcoded-thresholds invariant.

import { deepFreeze } from "../../contracts/immutability";
import { GovernedRecoveryObjective } from "./rollbackTypes";

/**
 * Capability interface for resolving a governed `recovery_objective_ref` into
 * concrete acceptance criteria.
 *
 * GOVERNANCE CONSTITUTION:
 * WP-27 does not own recovery policy values. If an objective reference cannot
 * be resolved, the system must fail closed. Universal fallback constants are prohibited.
 */
export interface RecoveryObjectiveResolver {
  /**
   * Resolves a recovery objective reference into its governed criteria.
   * Returns undefined if the reference is unmapped or unregistered.
   */
  resolve(
    recoveryObjectiveRef: string
  ): Promise<GovernedRecoveryObjective | undefined> | GovernedRecoveryObjective | undefined;
}

/**
 * Clean, in-memory recovery objective resolver allowing external callers,
 * governance adapters, or test harnesses to configure authoritative policies.
 * Contains ZERO built-in or hardcoded default thresholds.
 */
export class ConfiguredRecoveryObjectiveResolver implements RecoveryObjectiveResolver {
  private readonly registry: Map<string, GovernedRecoveryObjective> = new Map();

  constructor(initialObjectives?: ReadonlyArray<GovernedRecoveryObjective>) {
    if (initialObjectives) {
      for (const obj of initialObjectives) {
        this.registerObjective(obj);
      }
    }
  }

  /**
   * Registers a governed recovery objective into the resolver registry.
   */
  public registerObjective(objective: GovernedRecoveryObjective): void {
    if (!objective.recoveryObjectiveRef || typeof objective.recoveryObjectiveRef !== "string") {
      throw new Error("Cannot register GovernedRecoveryObjective without valid recoveryObjectiveRef");
    }
    this.registry.set(objective.recoveryObjectiveRef, deepFreeze({ ...objective }));
  }

  /**
   * Resolves the requested recovery objective reference.
   * Returns undefined if not found (strictly fails closed).
   */
  public resolve(recoveryObjectiveRef: string): GovernedRecoveryObjective | undefined {
    return this.registry.get(recoveryObjectiveRef);
  }

  /**
   * Returns the count of registered objectives.
   */
  public get size(): number {
    return this.registry.size;
  }
}
