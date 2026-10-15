// src/sound-engineer/validation/profiles/profileRepository.ts
// TestProfileRepository: Canonical repository of the fourteen frozen TestProfileRecord templates.
// Bound to frozen specification v0.1j Section 13, Table 05, and Table 07.

import { deepFreeze, defensiveClone } from "../../contracts/immutability";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { TestProfileRecord } from "../schemas/records";
import { CANONICAL_TEST_PROFILES } from "./profileDefinitions";
import {
  ProfileSubsystemDependencies,
  TEST_PROFILE_FAMILIES,
  TestProfileFamily,
} from "./types";

/**
 * Normalizes an arbitrary query key (e.g. "PROFILE-01", "profile_01", "PROFILE_01_STRUCTURAL_SCHEMA")
 * to match either canonical profile_id or profile_family.
 */
function normalizeQueryKey(key: string): string {
  return key.trim().toUpperCase().replace(/[-_]/g, "");
}

export class TestProfileRepository {
  private readonly profilesById: Map<string, TestProfileRecord> = new Map();
  private readonly profilesByFamily: Map<TestProfileFamily, TestProfileRecord> = new Map();
  private readonly normalizedLookup: Map<string, TestProfileRecord> = new Map();

  constructor(dependencies?: ProfileSubsystemDependencies) {
    // Populate authoritative in-memory indexes from the fourteen frozen canonical templates
    for (const profile of CANONICAL_TEST_PROFILES) {
      this.profilesById.set(profile.profile_id, profile);
      this.profilesByFamily.set(profile.profile_family as TestProfileFamily, profile);

      // Register flexible alias variants for deterministic query resolution
      this.normalizedLookup.set(normalizeQueryKey(profile.profile_id), profile);
      this.normalizedLookup.set(normalizeQueryKey(profile.profile_family), profile);
      // Also register short variant "profile01" -> profile
      const numMatch = profile.profile_id.match(/\d+/);
      if (numMatch) {
        this.normalizedLookup.set(`PROFILE${numMatch[0]}`, profile);
        this.normalizedLookup.set(`P${numMatch[0]}`, profile);
      }
    }

    // Optional atomic graph registration (nodes only, exactly 14 governed edges preserved)
    if (dependencies?.graph) {
      this.registerNodesInGraph(dependencies.graph);
    }

    // Optional atomic ledger recording (records audited deterministically without duplicate inflation)
    if (dependencies?.ledger) {
      this.recordInLedger(dependencies.ledger);
    }
  }

  /**
   * Retrieves an immutable canonical TestProfileRecord by profile_id or canonical alias.
   * Returns undefined if key is unrecognized (does NOT invent a profile).
   */
  public getProfile(idOrFamily: string): TestProfileRecord | undefined {
    if (!idOrFamily || typeof idOrFamily !== "string") {
      return undefined;
    }
    const direct = this.profilesById.get(idOrFamily);
    if (direct) {
      return deepFreeze(defensiveClone(direct));
    }
    const normalized = this.normalizedLookup.get(normalizeQueryKey(idOrFamily));
    return normalized ? deepFreeze(defensiveClone(normalized)) : undefined;
  }

  /**
   * Retrieves all fourteen canonical TestProfileRecord templates in strict canonical order
   * (PROFILE-01 through PROFILE-14).
   */
  public getAllProfiles(): ReadonlyArray<TestProfileRecord> {
    return CANONICAL_TEST_PROFILES.map((p) => deepFreeze(defensiveClone(p)));
  }

  /**
   * Retrieves an immutable canonical TestProfileRecord strictly by TestProfileFamily enum.
   * Returns undefined if family is unrecognized.
   */
  public getByFamily(family: TestProfileFamily | string): TestProfileRecord | undefined {
    if (!family || typeof family !== "string") {
      return undefined;
    }
    const direct = this.profilesByFamily.get(family as TestProfileFamily);
    if (direct) {
      return deepFreeze(defensiveClone(direct));
    }
    const normalized = this.normalizedLookup.get(normalizeQueryKey(family));
    return normalized ? deepFreeze(defensiveClone(normalized)) : undefined;
  }

  /**
   * Returns true if a profile matching the supplied ID or family exists in the repository.
   */
  public hasProfile(idOrFamily: string): boolean {
    if (!idOrFamily || typeof idOrFamily !== "string") {
      return false;
    }
    return this.profilesById.has(idOrFamily) || this.normalizedLookup.has(normalizeQueryKey(idOrFamily));
  }

  /**
   * Registers all 14 canonical profile templates as nodes in the ValidationRelationshipGraph.
   * CRITICAL GOVERNANCE: Creates ZERO relationship edges. Keeps the edge catalogue at exactly 14.
   */
  private registerNodesInGraph(graph: ValidationRelationshipGraph): void {
    for (const profile of CANONICAL_TEST_PROFILES) {
      // Register node if not already present
      if (!graph.getNode(profile.profile_id)) {
        graph.registerNode({
          id: profile.profile_id,
          kind: GOVERNED_ENTITY_KINDS.TestProfileRecord,
        });
      }
    }
  }

  /**
   * Appends canonical profile definitions to the audit ledger deterministically.
   * Uses existing ledger idempotency / checking to prevent duplicate inflation.
   */
  private recordInLedger(ledger: ValidationAuditLedger): void {
    const existingIds = new Set(ledger.getEntries().map((e) => e.entityId));
    const timestamp = "2026-10-14T00:00:00.000Z";

    for (const profile of CANONICAL_TEST_PROFILES) {
      if (!existingIds.has(profile.profile_id)) {
        ledger.appendRecord(
          GOVERNED_ENTITY_KINDS.TestProfileRecord,
          profile.profile_id,
          profile,
          timestamp
        );
      }
    }
  }
}
