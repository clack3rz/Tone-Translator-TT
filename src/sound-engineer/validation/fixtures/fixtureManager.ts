// src/sound-engineer/validation/fixtures/fixtureManager.ts
// Fixture Corpus Manager for Phase 1C.5h WP-08:
// Golden Acoustic Fixture Corpus & Benchmark Stem Management (Record 8).
// Bound to frozen specification v0.1j Section 18, Table 08, and Invariant 4.

import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  type FixtureClass,
  type FixtureContaminationStatus,
  type FixtureLifecycleStatus,
} from "../schemas/enums";
import { type IntegrityProvider } from "../schemas/integrity";
import {
  parseValidationFixtureRecord,
  type ValidationFixtureRecord,
  type ValidationScopeRecord,
} from "../schemas/records";
import {
  computePayloadDigest,
  validatePcmWavHeader,
  verifyAudioPayloadIntegrity,
} from "./audioVerification";
import { MVVI_BOOTSTRAP_FIXTURE_RECORDS } from "./manifest";
import {
  type FixtureCalibrationAuditResult,
  type FixtureIntegrityAuditResult,
  type FixtureLifecycleTransitionResult,
  type FixtureProvenanceAuditResult,
  type FixtureScopeEvaluationResult,
  type PcmValidationResult,
} from "./types";

/**
 * Thrown when an illegal attempt is made to mutate or overwrite a sealed golden fixture in place.
 * Enforces Invariant 4 (Golden Fixture Immutability & Independence Invariant).
 */
export class FixtureImmutabilityViolationError extends Error {
  constructor(public readonly fixtureId: string, message: string) {
    super(`[INVARIANT 4 IMMUTABILITY VIOLATION] Fixture '${fixtureId}': ${message}`);
    this.name = "FixtureImmutabilityViolationError";
  }
}

/**
 * Thrown when a fixture is requested or utilized outside its declared validation scope.
 */
export class OffScopeFixtureError extends Error {
  constructor(public readonly fixtureId: string, message: string) {
    super(`[OFF-SCOPE FIXTURE REJECTION] Fixture '${fixtureId}': ${message}`);
    this.name = "OffScopeFixtureError";
  }
}

/**
 * Options for initializing FixtureCorpusManager.
 */
export interface FixtureCorpusManagerOptions {
  readonly integrityProvider?: IntegrityProvider;
  readonly loadBootstrapCorpus?: boolean;
  readonly isReadOnlyMount?: boolean;
}

/**
 * Core Fixture Corpus Manager implementing storage, provenance audit,
 * scope enforcement, bit integrity verification, and lifecycle management.
 */
export class FixtureCorpusManager {
  private readonly fixtures = new Map<string, ValidationFixtureRecord>();
  private readonly payloadBuffers = new Map<string, Uint8Array>();
  private readonly integrityProvider?: IntegrityProvider;
  private readonly isReadOnlyMount: boolean;

  constructor(options: FixtureCorpusManagerOptions = {}) {
    this.integrityProvider = options.integrityProvider;
    this.isReadOnlyMount = options.isReadOnlyMount ?? true;

    if (options.loadBootstrapCorpus ?? true) {
      this.loadBootstrapCorpus();
    }
  }

  /**
   * Loads the initial illustrative MVVI bootstrap corpus.
   */
  public loadBootstrapCorpus(): void {
    for (const record of MVVI_BOOTSTRAP_FIXTURE_RECORDS) {
      this.fixtures.set(record.fixture_id, record);
    }
  }

  /**
   * Registers a new ValidationFixtureRecord into the golden library.
   * Enforces schema conformance, explicit declared scope, and Invariant 4 immutability.
   */
  public registerFixture(
    recordInput: unknown,
    payloadBuffer?: Uint8Array
  ): ValidationFixtureRecord {
    const record = parseValidationFixtureRecord(recordInput);

    // Enforce Invariant 4: No silent overwriting of existing fixture
    const existing = this.fixtures.get(record.fixture_id);
    if (existing) {
      if (existing.version === record.version) {
        throw new FixtureImmutabilityViolationError(
          record.fixture_id,
          `Cannot overwrite sealed fixture version '${record.version}'. Must supersede with a new version.`
        );
      }
    }

    // Verify declared applicability scope is present and non-empty
    if (
      !record.declared_applicability_scope ||
      record.declared_applicability_scope.length === 0
    ) {
      throw new Error(
        `Fixture '${record.fixture_id}' rejected: declared_applicability_scope must not be empty.`
      );
    }

    // If audio payload is provided, verify bit integrity and uncompressed PCM header
    if (payloadBuffer) {
      const integrityCheck = verifyAudioPayloadIntegrity(
        payloadBuffer,
        record.payload_integrity_ref,
        this.integrityProvider
      );
      if (!integrityCheck.valid) {
        throw new Error(
          `Fixture '${record.fixture_id}' payload integrity verification failed: ${integrityCheck.error}`
        );
      }

      // Check PCM WAV header if file is a WAV container
      const pcmCheck = validatePcmWavHeader(payloadBuffer);
      if (!pcmCheck.valid) {
        throw new Error(
          `Fixture '${record.fixture_id}' audio header validation failed: ${pcmCheck.errors.join("; ")}`
        );
      }

      this.payloadBuffers.set(record.fixture_id, payloadBuffer);
    }

    // Store immutable copy
    const frozenRecord: ValidationFixtureRecord = Object.freeze({ ...record });
    this.fixtures.set(record.fixture_id, frozenRecord);
    return frozenRecord;
  }

  /**
   * Retrieves a fixture record by ID.
   */
  public getFixture(fixtureId: string): ValidationFixtureRecord | undefined {
    return this.fixtures.get(fixtureId);
  }

  /**
   * Checks if a fixture exists in the library.
   */
  public hasFixture(fixtureId: string): boolean {
    return this.fixtures.has(fixtureId);
  }

  /**
   * Retrieves the raw payload buffer if stored in memory.
   */
  public getPayloadBuffer(fixtureId: string): Uint8Array | undefined {
    return this.payloadBuffers.get(fixtureId);
  }

  /**
   * Associates an audio payload buffer with an existing fixture, verifying bit integrity.
   */
  public storePayloadBuffer(
    fixtureId: string,
    buffer: Uint8Array
  ): { valid: boolean; error?: string } {
    const fixture = this.getFixture(fixtureId);
    if (!fixture) {
      return { valid: false, error: `Fixture '${fixtureId}' not found in library.` };
    }

    const integrityCheck = verifyAudioPayloadIntegrity(
      buffer,
      fixture.payload_integrity_ref,
      this.integrityProvider
    );
    if (!integrityCheck.valid) {
      return { valid: false, error: integrityCheck.error };
    }

    const pcmCheck = validatePcmWavHeader(buffer);
    if (!pcmCheck.valid) {
      return {
        valid: false,
        error: `Audio header invalid: ${pcmCheck.errors.join("; ")}`,
      };
    }

    this.payloadBuffers.set(fixtureId, buffer);
    return { valid: true };
  }

  /**
   * Lists fixtures with optional filters.
   */
  public listFixtures(filter?: {
    fixtureClass?: FixtureClass;
    lifecycleStatus?: FixtureLifecycleStatus;
    contaminationStatus?: FixtureContaminationStatus;
  }): readonly ValidationFixtureRecord[] {
    const results: ValidationFixtureRecord[] = [];
    for (const f of this.fixtures.values()) {
      if (filter?.fixtureClass && f.fixture_class !== filter.fixtureClass) {
        continue;
      }
      if (filter?.lifecycleStatus && f.lifecycle_status !== filter.lifecycleStatus) {
        continue;
      }
      if (
        filter?.contaminationStatus &&
        f.contamination_status !== filter.contaminationStatus
      ) {
        continue;
      }
      results.push(f);
    }
    return Object.freeze(results);
  }

  /**
   * Counts total registered fixtures.
   */
  public countFixtures(): number {
    return this.fixtures.size;
  }

  // ---------------------------------------------------------------------------
  // SCOPE ENFORCEMENT & OFF-LABEL USE PROHIBITION
  // ---------------------------------------------------------------------------

  /**
   * Evaluates whether a fixture is applicable to a declared validation scope.
   * Enforces Section 18.1 cardinal rule:
   * "NO FIXTURE OR FIXTURE FAMILY BECOMES UNIVERSAL GROUND TRUTH OUTSIDE ITS DECLARED VALIDATION SCOPE."
   */
  public isFixtureApplicableToScope(
    fixtureIdOrRecord: string | ValidationFixtureRecord,
    scope:
      | ValidationScopeRecord
      | {
          readonly included_units?: readonly string[];
          readonly primary_domain?: string;
          readonly target_component_class?: string;
          readonly profile_id?: string;
        }
  ): FixtureScopeEvaluationResult {
    const fixture =
      typeof fixtureIdOrRecord === "string"
        ? this.fixtures.get(fixtureIdOrRecord)
        : fixtureIdOrRecord;

    if (!fixture) {
      return {
        isApplicable: false,
        fixtureId: typeof fixtureIdOrRecord === "string" ? fixtureIdOrRecord : "UNKNOWN",
        fixtureClass: FIXTURE_CLASSES.DI_PERFORMANCE,
        declaredScope: [],
        matchedScopes: [],
        missingScopes: [],
        rejectionReason: `Fixture not found in library.`,
      };
    }

    const declaredScope = fixture.declared_applicability_scope;
    const requestedUnits: string[] = [];

    if ("included_units" in scope && Array.isArray(scope.included_units)) {
      requestedUnits.push(...scope.included_units);
    }
    if ("primary_domain" in scope && scope.primary_domain) {
      requestedUnits.push(scope.primary_domain);
    }
    if ("target_component_class" in scope && scope.target_component_class) {
      requestedUnits.push(scope.target_component_class);
    }
    if ("profile_id" in scope && scope.profile_id) {
      requestedUnits.push(scope.profile_id);
    }

    // Find overlapping scopes
    const matchedScopes: string[] = [];
    const missingScopes: string[] = [];

    for (const req of requestedUnits) {
      const match = declaredScope.some(
        (ds) =>
          ds.toLowerCase() === req.toLowerCase() ||
          req.toLowerCase().includes(ds.toLowerCase()) ||
          ds.toLowerCase().includes(req.toLowerCase())
      );
      if (match) {
        matchedScopes.push(req);
      } else {
        missingScopes.push(req);
      }
    }

    const isApplicable = matchedScopes.length > 0;
    const rejectionReason = isApplicable
      ? undefined
      : `Off-Scope Fixture Rejection: fixture '${fixture.fixture_id}' declared scope [${declaredScope.join(
          ", "
        )}] does not cover requested validation units/domains [${requestedUnits.join(", ")}].`;

    return {
      isApplicable,
      fixtureId: fixture.fixture_id,
      fixtureClass: fixture.fixture_class,
      declaredScope,
      matchedScopes,
      missingScopes,
      rejectionReason,
    };
  }

  // ---------------------------------------------------------------------------
  // PROVENANCE AUDIT (Condition 02)
  // ---------------------------------------------------------------------------

  /**
   * Audits fixture provenance completeness.
   * Condition 02: Fixture Provenance Missing (WF-05).
   */
  public auditProvenance(
    fixtureIdOrRecord: string | ValidationFixtureRecord
  ): FixtureProvenanceAuditResult {
    const fixture =
      typeof fixtureIdOrRecord === "string"
        ? this.fixtures.get(fixtureIdOrRecord)
        : fixtureIdOrRecord;

    if (!fixture) {
      return {
        valid: false,
        fixtureId: typeof fixtureIdOrRecord === "string" ? fixtureIdOrRecord : "UNKNOWN",
        missingFields: ["FIXTURE_NOT_FOUND"],
        metadata: {},
        diagnosticMessage: "Fixture not found in library.",
      };
    }

    const missing: string[] = [];
    const meta = fixture.provenance_metadata ?? {};

    // For acoustic stems (DI, Reference Tone, Rendered Platform, Multitrack),
    // complete capture chain-of-custody is strictly required (Section 18.3, Invariant 4).
    if (
      fixture.fixture_class === FIXTURE_CLASSES.DI_PERFORMANCE ||
      fixture.fixture_class === FIXTURE_CLASSES.REFERENCE_TONE ||
      fixture.fixture_class === FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK ||
      fixture.fixture_class === FIXTURE_CLASSES.MULTITRACK_CONTEXT
    ) {
      if (!meta.instrument_details || meta.instrument_details.trim().length === 0) {
        missing.push("instrument_details");
      }
      if (!meta.capture_hardware || meta.capture_hardware.trim().length === 0) {
        missing.push("capture_hardware");
      }
      if (!meta.recording_engineer || meta.recording_engineer.trim().length === 0) {
        missing.push("recording_engineer");
      }
      if (!meta.capture_date || meta.capture_date.trim().length === 0) {
        missing.push("capture_date");
      }
    } else {
      // For synthetic / preset / prompt fixtures, at least recording_engineer / author is required
      if (!meta.recording_engineer || meta.recording_engineer.trim().length === 0) {
        missing.push("recording_engineer");
      }
      if (!meta.capture_date || meta.capture_date.trim().length === 0) {
        missing.push("capture_date");
      }
    }

    const valid = missing.length === 0;
    return {
      valid,
      fixtureId: fixture.fixture_id,
      missingFields: missing,
      metadata: meta,
      diagnosticMessage: valid
        ? undefined
        : `Condition 02: Fixture Provenance Missing on '${fixture.fixture_id}'. Missing fields: ${missing.join(
            ", "
          )}`,
    };
  }

  // ---------------------------------------------------------------------------
  // CALIBRATION AUDIT (Condition 03)
  // ---------------------------------------------------------------------------

  /**
   * Audits fixture calibration specification.
   * Condition 03: Calibration Mismatch (WF-05).
   */
  public auditCalibration(
    fixtureIdOrRecord: string | ValidationFixtureRecord
  ): FixtureCalibrationAuditResult {
    const fixture =
      typeof fixtureIdOrRecord === "string"
        ? this.fixtures.get(fixtureIdOrRecord)
        : fixtureIdOrRecord;

    if (!fixture) {
      return {
        valid: false,
        fixtureId: typeof fixtureIdOrRecord === "string" ? fixtureIdOrRecord : "UNKNOWN",
        calibrationSpec: "",
        errors: ["Fixture not found in library."],
      };
    }

    const errors: string[] = [];
    if (!fixture.calibration_spec || fixture.calibration_spec.trim().length === 0) {
      errors.push("Missing calibration_spec in ValidationFixtureRecord.");
    }

    return {
      valid: errors.length === 0,
      fixtureId: fixture.fixture_id,
      calibrationSpec: fixture.calibration_spec,
      errors,
    };
  }

  // ---------------------------------------------------------------------------
  // COMPREHENSIVE INTEGRITY & ANTI-CONTAMINATION PROTOCOL
  // ---------------------------------------------------------------------------

  /**
   * Performs complete audit of fixture integrity, contamination, and usability for testing.
   */
  public auditFixture(
    fixtureIdOrRecord: string | ValidationFixtureRecord
  ): FixtureIntegrityAuditResult {
    const fixture =
      typeof fixtureIdOrRecord === "string"
        ? this.fixtures.get(fixtureIdOrRecord)
        : fixtureIdOrRecord;

    if (!fixture) {
      return {
        valid: false,
        fixtureId: typeof fixtureIdOrRecord === "string" ? fixtureIdOrRecord : "UNKNOWN",
        contaminationStatus: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
        lifecycleStatus: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
        isQuarantined: true,
        isUsableForActiveTesting: false,
        requiresRevalidationOfPriorPasses: false,
        errors: ["Fixture not found in library."],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check contamination status
    const isContaminated =
      fixture.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED;
    const isSuspect =
      fixture.contamination_status === FIXTURE_CONTAMINATION_STATUSES.SUSPECT;
    const isQuarantined = isContaminated || isSuspect;

    if (isContaminated) {
      errors.push(
        `Fixture '${fixture.fixture_id}' is flagged CONTAMINATED. Mandates full revalidation of all prior PASS results (Section 18.4).`
      );
    } else if (isSuspect) {
      warnings.push(
        `Fixture '${fixture.fixture_id}' is flagged SUSPECT. Quarantined from active validation testing.`
      );
    }

    // Check lifecycle status
    if (fixture.lifecycle_status !== FIXTURE_LIFECYCLE_STATUSES.ACTIVE) {
      warnings.push(
        `Fixture '${fixture.fixture_id}' is in lifecycle state '${fixture.lifecycle_status}'. Not permitted for active testing.`
      );
    }

    // Audit provenance
    const provAudit = this.auditProvenance(fixture);
    if (!provAudit.valid) {
      errors.push(provAudit.diagnosticMessage!);
    }

    // Audit calibration
    const calAudit = this.auditCalibration(fixture);
    if (!calAudit.valid) {
      errors.push(...calAudit.errors);
    }

    // Check payload buffer if present in memory
    const buffer = this.payloadBuffers.get(fixture.fixture_id);
    if (buffer) {
      const bitIntegrity = verifyAudioPayloadIntegrity(
        buffer,
        fixture.payload_integrity_ref,
        this.integrityProvider
      );
      if (!bitIntegrity.valid) {
        errors.push(bitIntegrity.error!);
      }
    }

    const isUsableForActiveTesting =
      !isQuarantined &&
      fixture.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.ACTIVE &&
      errors.length === 0;

    return {
      valid: errors.length === 0,
      fixtureId: fixture.fixture_id,
      contaminationStatus: fixture.contamination_status,
      lifecycleStatus: fixture.lifecycle_status,
      isQuarantined,
      isUsableForActiveTesting,
      requiresRevalidationOfPriorPasses: isContaminated,
      errors,
      warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE MANAGEMENT & CONTAMINATION REMEDIATION
  // ---------------------------------------------------------------------------

  /**
   * Flags a fixture as CONTAMINATED (leaked into training or prompt tuning).
   * Implements Section 18.4:
   * "If a fixture is discovered to have leaked into upstream prompt design, it is immediately marked CONTAMINATED and INVALIDATED;
   * All prior validation outcomes that relied on the contaminated fixture are flagged for MANDATORY REVALIDATION."
   */
  public flagContaminated(
    fixtureId: string,
    reason: string
  ): {
    fixture: ValidationFixtureRecord;
    requiresRevalidationOfPriorPasses: boolean;
    quarantineReport: string;
  } {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture '${fixtureId}' not found.`);
    }

    const updated: ValidationFixtureRecord = Object.freeze({
      ...fixture,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
    });

    this.fixtures.set(fixtureId, updated);

    return {
      fixture: updated,
      requiresRevalidationOfPriorPasses: true,
      quarantineReport: `[QUARANTINE ENFORCED] Fixture '${fixtureId}' marked CONTAMINATED & INVALIDATED. Reason: ${reason}. All prior PASS results dependent on this fixture require mandatory revalidation (Section 18.4 / Invariant 4).`,
    };
  }

  /**
   * Flags a fixture as SUSPECT (potential calibration defect or suspected prompt leak).
   */
  public flagSuspect(
    fixtureId: string,
    reason: string
  ): ValidationFixtureRecord {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture '${fixtureId}' not found.`);
    }

    const updated: ValidationFixtureRecord = Object.freeze({
      ...fixture,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
    });

    this.fixtures.set(fixtureId, updated);
    return updated;
  }

  /**
   * Supersedes an active fixture with an approved successor version.
   * Section 18.3: ACTIVE -> SUPERSEDED.
   */
  public supersedeFixture(
    oldFixtureId: string,
    newRecordInput: unknown,
    newPayloadBuffer?: Uint8Array
  ): FixtureLifecycleTransitionResult {
    const oldFixture = this.fixtures.get(oldFixtureId);
    if (!oldFixture) {
      throw new Error(`Fixture to supersede '${oldFixtureId}' not found.`);
    }

    const newRecord = this.registerFixture(newRecordInput, newPayloadBuffer);

    // Update old fixture to SUPERSEDED and link superseding_fixture_id
    const supersededOld: ValidationFixtureRecord = Object.freeze({
      ...oldFixture,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
      superseding_fixture_id: newRecord.fixture_id,
    });

    this.fixtures.set(oldFixtureId, supersededOld);

    return {
      success: true,
      previousStatus: oldFixture.lifecycle_status,
      newStatus: FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED,
      fixtureId: oldFixtureId,
      supersedingFixtureId: newRecord.fixture_id,
      reason: `Superseded by '${newRecord.fixture_id}' (version ${newRecord.version}).`,
      updatedRecord: supersededOld,
    };
  }

  /**
   * Retires an archived fixture.
   * Section 18.3: Preserved in immutable archive for audit history; forbidden for new intakes.
   */
  public retireFixture(fixtureId: string, reason: string): FixtureLifecycleTransitionResult {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture '${fixtureId}' not found.`);
    }

    const retired: ValidationFixtureRecord = Object.freeze({
      ...fixture,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.RETIRED,
    });

    this.fixtures.set(fixtureId, retired);

    return {
      success: true,
      previousStatus: fixture.lifecycle_status,
      newStatus: FIXTURE_LIFECYCLE_STATUSES.RETIRED,
      fixtureId,
      reason: `Retired to immutable archive: ${reason}. Forbidden for new validation intakes.`,
      updatedRecord: retired,
    };
  }

  /**
   * Verifies an uncompressed PCM WAV buffer directly.
   */
  public verifyAudioBuffer(buffer: Uint8Array): PcmValidationResult {
    return validatePcmWavHeader(buffer);
  }

  /**
   * Verifies bit integrity of buffer against a fixture's stored integrity reference.
   */
  public verifyAudioBitIntegrity(
    fixtureId: string,
    buffer: Uint8Array
  ): { valid: boolean; error?: string } {
    const fixture = this.getFixture(fixtureId);
    if (!fixture) {
      return { valid: false, error: `Fixture '${fixtureId}' not found in library.` };
    }
    return verifyAudioPayloadIntegrity(
      buffer,
      fixture.payload_integrity_ref,
      this.integrityProvider
    );
  }
}
