// src/sound-engineer/validation/scope/scopeManager.ts
// ValidationScopeManager: Authoritative boundary engine for Phase 1C.5h WP-04.
// Consumes accepted ValidationIntakeRecords, derives explicit validation scope boundaries,
// rejects ambiguous or wildcard scope definitions, generates canonical ValidationScopeRecord (Record 2),
// and integrates atomically with the signed-off relationship graph and immutable audit ledger.
// Bound to frozen specification v0.1j Section 9, Table 18, and Implementation Plan v0.1h WP-04.

import { defensiveClone, deepFreeze } from "../../contracts/immutability";
import { GOVERNED_ENTITY_KINDS } from "../graph/edgeTypes";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { INTAKE_STATUSES, VALIDATION_PRIMARY_DOMAINS, ValidationPrimaryDomain } from "../schemas/enums";
import { ValidationIntakeRecord, ValidationScopeRecord, validationScopeRecordSchema } from "../schemas/records";
import { ValidationAuditLedger } from "../storage/auditLedger";
import { ScopeEnforcer } from "./scopeEnforcer";
import {
  ParsedScopeDefinition,
  PROHIBITED_WILDCARD_PATTERNS,
  ScopeDeclarationInput,
  ScopeDerivationError,
  ScopeDerivationOptions,
  ScopeWildcardRejectionError,
} from "./types";

/**
 * Validates that an array of boundary tokens contains zero wildcards or ambiguous strings.
 * Throws ScopeWildcardRejectionError immediately upon encountering any prohibited pattern.
 */
export function validateNoWildcards(
  tokens: ReadonlyArray<string>,
  fieldLabel: string
): void {
  for (const raw of tokens) {
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new ScopeWildcardRejectionError(
        `Ambiguous scope boundary definition: empty or whitespace-only token in ${fieldLabel}. Enumerated explicit strings are required.`,
        raw
      );
    }
    const token = raw.trim();
    for (const pattern of PROHIBITED_WILDCARD_PATTERNS) {
      if (pattern.test(token)) {
        throw new ScopeWildcardRejectionError(
          `Ambiguous or wildcard scope boundary rejected in ${fieldLabel}: token "${token}" violates Axiom 6 (Strictly Scoped Authorization) and WP-04 Inflation Protection. Wildcard expansions are prohibited.`,
          token
        );
      }
    }
  }
}

/**
 * Checks whether a single text string contains prohibited wildcard symbols.
 */
export function hasWildcardSymbols(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  for (const pattern of PROHIBITED_WILDCARD_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  return false;
}

/**
 * Parses and sanitizes a declared scope input into canonical included, excluded, and constraint sets.
 */
export function parseScopeDefinition(
  declaredScopeText: string,
  options?: ScopeDerivationOptions
): ParsedScopeDefinition {
  const override = options?.scopeDeclaration;

  // 1. Check for wildcards in raw declared scope text when not overridden by explicit structured units
  if (!override?.included_units && !options?.includedUnits) {
    if (hasWildcardSymbols(declaredScopeText)) {
      throw new ScopeWildcardRejectionError(
        `Declared scope text "${declaredScopeText}" contains ambiguous wildcard patterns. Universal or wildcard authorizations are strictly prohibited.`,
        declaredScopeText
      );
    }
  }

  // 2. Determine Primary Domain
  let primaryDomain: ValidationPrimaryDomain =
    options?.primaryDomain ??
    override?.primary_domain ??
    VALIDATION_PRIMARY_DOMAINS.GEAR_FAMILY;

  let candidateIncluded: string[] = [];
  let candidateExcluded: string[] = [];
  let candidateConstraints: string[] = [];
  let inflationProtection = true;

  // Attempt JSON parsing of declaredScopeText if structured
  let parsedJson: Partial<ScopeDeclarationInput> | null = null;
  if (declaredScopeText.trim().startsWith("{") && declaredScopeText.trim().endsWith("}")) {
    try {
      parsedJson = JSON.parse(declaredScopeText);
    } catch {
      // Fallback to text parsing
      parsedJson = null;
    }
  }

  let structuredIncludedProvided = false;

  if (parsedJson) {
    if (parsedJson.primary_domain && Object.values(VALIDATION_PRIMARY_DOMAINS).includes(parsedJson.primary_domain)) {
      primaryDomain = parsedJson.primary_domain;
    }
    if (Array.isArray(parsedJson.included_units)) {
      structuredIncludedProvided = true;
      candidateIncluded.push(...parsedJson.included_units);
    }
    if (Array.isArray(parsedJson.excluded_units)) {
      candidateExcluded.push(...parsedJson.excluded_units);
    }
    if (Array.isArray(parsedJson.boundary_constraints)) {
      candidateConstraints.push(...parsedJson.boundary_constraints);
    }
    if (parsedJson.scope_inflation_protection !== undefined) {
      inflationProtection = parsedJson.scope_inflation_protection;
    }
  }

  // Apply explicit programmatic options / overrides if present
  if (override?.primary_domain) {
    primaryDomain = override.primary_domain;
  }
  if (override?.included_units) {
    structuredIncludedProvided = true;
    candidateIncluded = [...override.included_units];
  } else if (options?.includedUnits) {
    structuredIncludedProvided = true;
    candidateIncluded = [...options.includedUnits];
  }

  if (override?.excluded_units) {
    candidateExcluded = [...override.excluded_units];
  } else if (options?.excludedUnits) {
    candidateExcluded = [...options.excludedUnits];
  }

  if (override?.boundary_constraints) {
    candidateConstraints = [...override.boundary_constraints];
  } else if (options?.boundaryConstraints) {
    candidateConstraints = [...options.boundaryConstraints];
  }

  if (override?.scope_inflation_protection !== undefined) {
    inflationProtection = override.scope_inflation_protection;
  } else if (options?.scopeInflationProtection !== undefined) {
    inflationProtection = options.scopeInflationProtection;
  }

  // Fallback: If no structured included_units provided, parse delimited tokens from text
  if (!structuredIncludedProvided && candidateIncluded.length === 0) {
    const rawTokens = declaredScopeText
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (rawTokens.length > 0) {
      candidateIncluded = rawTokens;
    } else {
      candidateIncluded = [declaredScopeText.trim()];
    }
  }

  // Clean, trim, and deduplicate tokens
  const includedUnits = Array.from(new Set(candidateIncluded.map((u) => u.trim()))).filter((u) => u.length > 0);
  const excludedUnits = Array.from(new Set(candidateExcluded.map((u) => u.trim()))).filter((u) => u.length > 0);

  if (candidateConstraints.length === 0) {
    candidateConstraints = [
      "Strict scope boundary isolation enforced under Axiom 6",
      "Production authorization strictly prohibited outside included_units",
    ];
  }
  const boundaryConstraints = Array.from(new Set(candidateConstraints.map((c) => c.trim()))).filter((c) => c.length > 0);

  // 3. Strict Non-Empty Invariant
  if (includedUnits.length === 0) {
    throw new ScopeDerivationError(
      `Cannot derive validation scope: included_units is empty. At least one explicit unit must be declared.`
    );
  }

  // 4. Wildcard Validation across all boundaries
  validateNoWildcards(includedUnits, "included_units");
  validateNoWildcards(excludedUnits, "excluded_units");
  validateNoWildcards(boundaryConstraints, "boundary_constraints");

  // 5. Disjointness Assertion: included_units and excluded_units must not intersect
  const includedSet = new Set(includedUnits.map((u) => u.toLowerCase()));
  const overlapping: string[] = [];
  for (const exc of excludedUnits) {
    if (includedSet.has(exc.toLowerCase())) {
      overlapping.push(exc);
    }
  }

  if (overlapping.length > 0) {
    throw new ScopeDerivationError(
      `Ambiguous scope boundary conflict: units [${overlapping.join(", ")}] are present in both included_units and excluded_units.`
    );
  }

  return {
    primary_domain: primaryDomain,
    included_units: deepFreeze(includedUnits),
    excluded_units: deepFreeze(excludedUnits),
    boundary_constraints: deepFreeze(boundaryConstraints),
    scope_inflation_protection: inflationProtection,
  };
}

/**
 * Authoritative Validation Scope Boundary & Inflation Protection Manager for Phase 1C.5h.
 */
export class ValidationScopeManager {
  private readonly graph?: ValidationRelationshipGraph;
  private readonly ledger?: ValidationAuditLedger;

  /** Scope records stored by scope_id */
  private readonly scopesById: Map<string, ValidationScopeRecord> = new Map();

  /** Scope records indexed by parent intake_id */
  private readonly scopesByIntakeId: Map<string, ValidationScopeRecord> = new Map();

  constructor(
    graph?: ValidationRelationshipGraph,
    ledger?: ValidationAuditLedger
  ) {
    this.graph = graph;
    this.ledger = ledger;
  }

  /**
   * Derives and registers a canonical ValidationScopeRecord (Record 2) from an accepted ValidationIntakeRecord.
   *
   * Invariants enforced:
   * 1. Intake Acceptance: Refuses derivation if intake_status !== INTAKE_ACCEPTED.
   * 2. Wildcard Prohibition: Rejects any wildcard, regex, or ambiguous boundary definitions.
   * 3. Disjointness: Rejects conflicting inclusions and exclusions.
   * 4. Immutable Binding: Binds scope_id immutably to intake_id.
   * 5. Audit & Graph Persistence: Registers node in relationship graph and records sealed entry in audit ledger.
   */
  public deriveScope(
    intakeRecord: ValidationIntakeRecord,
    options?: ScopeDerivationOptions
  ): ValidationScopeRecord {
    // 1. Enforce Precondition: Intake must be formally INTAKE_ACCEPTED
    if (!intakeRecord || intakeRecord.intake_status !== INTAKE_STATUSES.INTAKE_ACCEPTED) {
      const status = intakeRecord ? intakeRecord.intake_status : "UNDEFINED";
      throw new ScopeDerivationError(
        `Cannot derive validation scope from intake record "${intakeRecord?.intake_id ?? 'unknown'}": intake_status is "${status}". Only INTAKE_ACCEPTED records are eligible for scope derivation.`
      );
    }

    const intakeId = intakeRecord.intake_id;
    const scopeId = options?.scopeId ?? `scope_${intakeId}`;

    // 2. Idempotency Check: Return existing scope record if already derived for this scopeId/intakeId
    if (this.scopesById.has(scopeId)) {
      return this.scopesById.get(scopeId)!;
    }
    if (this.scopesByIntakeId.has(intakeId)) {
      return this.scopesByIntakeId.get(intakeId)!;
    }

    // 3. Parse and Sanitize Scope Definition
    const parsed = parseScopeDefinition(intakeRecord.declared_scope, options);

    // 4. Construct Canonical Record 2
    const rawRecord = {
      scope_id: scopeId,
      intake_id: intakeId,
      primary_domain: parsed.primary_domain,
      included_units: defensiveClone(parsed.included_units),
      excluded_units: defensiveClone(parsed.excluded_units),
      boundary_constraints: defensiveClone(parsed.boundary_constraints),
      scope_inflation_protection: parsed.scope_inflation_protection,
    };

    // Validate strictly against frozen schema
    const scopeRecord: ValidationScopeRecord = deepFreeze(
      validationScopeRecordSchema.parse(rawRecord)
    );

    // 5. Atomic Graph Integration: Register ValidationScopeRecord node
    if (this.graph) {
      this.graph.registerNode({
        id: scopeRecord.scope_id,
        kind: GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
      });
    }

    // 6. Atomic Ledger Integration: Append immutable audit record
    if (this.ledger) {
      this.ledger.appendRecord(
        GOVERNED_ENTITY_KINDS.ValidationScopeRecord,
        scopeRecord.scope_id,
        scopeRecord
      );
    }

    // 7. Retain in memory registry
    this.scopesById.set(scopeRecord.scope_id, scopeRecord);
    this.scopesByIntakeId.set(scopeRecord.intake_id, scopeRecord);

    return scopeRecord;
  }

  /**
   * Retrieves a ValidationScopeRecord by its scope_id.
   */
  public getScopeRecord(scopeId: string): ValidationScopeRecord | undefined {
    return this.scopesById.get(scopeId);
  }

  /**
   * Retrieves a ValidationScopeRecord by its parent intake_id.
   */
  public getScopeByIntakeId(intakeId: string): ValidationScopeRecord | undefined {
    return this.scopesByIntakeId.get(intakeId);
  }

  /**
   * Returns all registered ValidationScopeRecords.
   */
  public getAllScopes(): ReadonlyArray<ValidationScopeRecord> {
    return deepFreeze(Array.from(this.scopesById.values()));
  }

  /**
   * Creates a ScopeEnforcer instance bound to a registered scope ID or provided ValidationScopeRecord.
   */
  public createEnforcer(scopeIdOrRecord: string | ValidationScopeRecord): ScopeEnforcer {
    if (typeof scopeIdOrRecord === "string") {
      const record = this.getScopeRecord(scopeIdOrRecord);
      if (!record) {
        throw new ScopeDerivationError(
          `Cannot create ScopeEnforcer: scope ID "${scopeIdOrRecord}" has not been derived or registered.`
        );
      }
      return new ScopeEnforcer(record);
    }

    return new ScopeEnforcer(scopeIdOrRecord);
  }
}
