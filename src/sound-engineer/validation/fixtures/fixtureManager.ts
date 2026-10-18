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
  DEFAULT_INTEGRITY_PROVIDER,
  computePayloadDigest,
  isAudioFixtureClass,
  validatePcmWavHeader,
  verifyAudioPayloadIntegrity,
} from "./audioVerification";
import {
  SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES,
  MVVI_BOOTSTRAP_FIXTURE_RECORDS,
} from "./manifest";
import {
  type FixtureCalibrationAuditResult,
  type FixtureIntegrityAuditResult,
  type FixtureLifecycleTransitionResult,
  type FixtureProvenanceAuditResult,
  type FixtureQuarantineResult,
  type FixtureRegistrationOptions,
  type FixtureRevalidationDirective,
  type FixtureScopeEvaluationResult,
  type MutableFixturePayloadStore,
  type PcmValidationResult,
  type ReadOnlyFixturePayloadStore,
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
 * Thrown when validation access is attempted against a fixture corpus where
 * storage is not in an enforced read-only state.
 */
export class FixtureStorageGovernanceError extends Error {
  constructor(message: string) {
    super(`[FIXTURE STORAGE GOVERNANCE ERROR] ${message}`);
    this.name = "FixtureStorageGovernanceError";
  }
}

/**
 * Thrown when an illegal mutation is attempted on a sealed payload store.
 */
export class FixtureStorageMutationError extends Error {
  constructor(public readonly fixtureId: string, message: string) {
    super(`[FIXTURE STORAGE MUTATION ERROR] Fixture '${fixtureId}': ${message}`);
    this.name = "FixtureStorageMutationError";
  }
}

/**
 * In-memory payload store implementing controlled two-phase lifecycle:
 * Phase 1: Provisioning / Ingestion (mutable until sealed).
 * Phase 2: Validation Consumption (strictly read-only; mutations fail closed).
 */
export class InMemoryFixturePayloadStore implements MutableFixturePayloadStore {
  private readonly storage = new Map<string, Uint8Array>();
  private sealed = false;

  constructor(sealed = false) {
    this.sealed = sealed;
  }

  public provisionPayload(fixtureId: string, payload: Uint8Array): void {
    if (this.sealed) {
      throw new FixtureStorageMutationError(
        fixtureId,
        "Cannot provision payload into a sealed read-only payload store (Invariant 4 / Section 18)."
      );
    }
    // Store defensive copy of payload bytes to guarantee storage immutability
    this.storage.set(fixtureId, new Uint8Array(payload));
  }

  public seal(): void {
    this.sealed = true;
  }

  public readPayload(fixtureId: string): Uint8Array | undefined {
    const data = this.storage.get(fixtureId);
    // Return defensive copy so external modification cannot corrupt stored payload
    return data ? new Uint8Array(data) : undefined;
  }

  public hasPayload(fixtureId: string): boolean {
    return this.storage.has(fixtureId);
  }

  public isReadOnlyForValidation(): boolean {
    return this.sealed;
  }
}

/**
 * Read-only wrapper exposing exclusively the ReadOnlyFixturePayloadStore interface.
 * Strictly prevents exposure of mutation methods (set, store, provision, replace, seal)
 * during validation consumption.
 */
export class ReadOnlyFixturePayloadStoreWrapper implements ReadOnlyFixturePayloadStore {
  constructor(private readonly inner: ReadOnlyFixturePayloadStore) {}

  public readPayload(fixtureId: string): Uint8Array | undefined {
    return this.inner.readPayload(fixtureId);
  }

  public hasPayload(fixtureId: string): boolean {
    return this.inner.hasPayload(fixtureId);
  }

  public isReadOnlyForValidation(): boolean {
    return this.inner.isReadOnlyForValidation();
  }
}

/**
 * Options for initializing FixtureCorpusManager.
 */
export interface FixtureCorpusManagerOptions {
  readonly integrityProvider?: IntegrityProvider;
  readonly loadBootstrapCorpus?: boolean;
  readonly isReadOnlyMount?: boolean;
  readonly payloadStore?: ReadOnlyFixturePayloadStore;
}

/**
 * Core Fixture Corpus Manager implementing storage, provenance audit,
 * scope enforcement, bit integrity verification, and lifecycle management.
 */
export class FixtureCorpusManager {
  private readonly fixtures = new Map<string, ValidationFixtureRecord>();
  private readonly payloadStore: MutableFixturePayloadStore;
  private readonly integrityProvider: IntegrityProvider;
  private readonly isReadOnlyMount: boolean;
  private readonly revalidationDirectives: FixtureRevalidationDirective[] = [];

  constructor(options: FixtureCorpusManagerOptions = {}) {
    this.integrityProvider = options.integrityProvider ?? DEFAULT_INTEGRITY_PROVIDER;
    this.isReadOnlyMount = options.isReadOnlyMount ?? true;

    if (options.payloadStore) {
      this.payloadStore = options.payloadStore as MutableFixturePayloadStore;
    } else {
      this.payloadStore = new InMemoryFixturePayloadStore(false);
    }

    // DEFECT 1 CORRECTION: loadBootstrapCorpus defaults to false.
    // Production runtime starts with ZERO fixtures unless explicitly provisioned.
    if (options.loadBootstrapCorpus === true) {
      this.loadSyntheticTestBootstrapCorpus();
    }

    // If isReadOnlyMount is active, seal the store for validation consumption
    if (this.isReadOnlyMount && typeof this.payloadStore.seal === "function") {
      this.payloadStore.seal();
    }
  }

  /**
   * Asserts that read-only storage protection is active for validation.
   * Fails closed if storage is not enforced read-only.
   */
  public assertReadOnlyValidationStorageEnforced(): void {
    if (!this.isReadOnlyMount || !this.payloadStore.isReadOnlyForValidation()) {
      throw new FixtureStorageGovernanceError(
        "Validation operation prohibited: fixture storage is not enforced as read-only. Mount must be read-only (isReadOnlyMount=true and payload store sealed)."
      );
    }
  }

  /**
   * Loads the isolated synthetic test-only MVVI bootstrap fixtures.
   * EXCLUSIVELY for offline automated tests and harness validation.
   * MUST NOT be invoked in production runtime state.
   */
  public loadSyntheticTestBootstrapCorpus(): void {
    const wasSealed = this.payloadStore.isReadOnlyForValidation();
    if (wasSealed && "seal" in this.payloadStore) {
      (this as unknown as { payloadStore: MutableFixturePayloadStore }).payloadStore =
        new InMemoryFixturePayloadStore(false);
    }

    for (const record of SYNTHETIC_TEST_MVVI_BOOTSTRAP_FIXTURES) {
      this.fixtures.set(record.fixture_id, record);
    }

    if (this.isReadOnlyMount && typeof this.payloadStore.seal === "function") {
      this.payloadStore.seal();
    }
  }

  /**
   * @deprecated Alias for loadSyntheticTestBootstrapCorpus for test backward compatibility.
   */
  public loadBootstrapCorpus(): void {
    this.loadSyntheticTestBootstrapCorpus();
  }

  /**
   * Registers a new ValidationFixtureRecord into the golden library.
   * Enforces schema conformance, explicit declared scope, Invariant 4 immutability,
   * authoritative payload integrity, and class-appropriate format validation (Defect 5).
   */
  public registerFixture(
    recordInput: unknown,
    payloadBuffer?: Uint8Array,
    options?: FixtureRegistrationOptions
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

    // If payload buffer is provided, verify bit integrity and class-appropriate format
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

      // DEFECT 5: Audio PCM WAV validation applies ONLY to governed audio fixture classes
      const requiresAudioValidation =
        options?.payloadType === "audio_pcm_wav" ||
        (options?.payloadType === undefined && isAudioFixtureClass(record.fixture_class));

      if (requiresAudioValidation) {
        const pcmCheck = validatePcmWavHeader(payloadBuffer);
        if (!pcmCheck.valid) {
          throw new Error(
            `Fixture '${record.fixture_id}' audio header validation failed: ${pcmCheck.errors.join("; ")}`
          );
        }
      }

      if (this.payloadStore.isReadOnlyForValidation()) {
        throw new FixtureStorageMutationError(
          record.fixture_id,
          "Cannot store payload buffer into a sealed read-only payload store during validation consumption."
        );
      }

      this.payloadStore.provisionPayload(record.fixture_id, payloadBuffer);
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
   * Retrieves the raw payload buffer from read-only payload storage.
   */
  public getPayloadBuffer(fixtureId: string): Uint8Array | undefined {
    return this.payloadStore.readPayload(fixtureId);
  }

  /**
   * Associates an audio payload buffer with an existing fixture, verifying bit integrity.
   * Fails closed if storage is in enforced read-only state.
   */
  public storePayloadBuffer(
    fixtureId: string,
    buffer: Uint8Array,
    options?: FixtureRegistrationOptions
  ): { valid: boolean; error?: string } {
    if (this.isReadOnlyMount || this.payloadStore.isReadOnlyForValidation()) {
      return {
        valid: false,
        error: `[READ-ONLY STORAGE ENFORCEMENT] Cannot store or mutate payload buffer: storage is in enforced read-only state.`,
      };
    }

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

    // DEFECT 5: Audio PCM WAV validation applies ONLY to governed audio fixture classes
    const requiresAudioValidation =
      options?.payloadType === "audio_pcm_wav" ||
      (options?.payloadType === undefined && isAudioFixtureClass(fixture.fixture_class));

    if (requiresAudioValidation) {
      const pcmCheck = validatePcmWavHeader(buffer);
      if (!pcmCheck.valid) {
        return {
          valid: false,
          error: `Audio header invalid: ${pcmCheck.errors.join("; ")}`,
        };
      }
    }

    this.payloadStore.provisionPayload(fixtureId, buffer);
    return { valid: true };
  }

  /**
   * Exposes strictly read-only view of payload storage for validation harnesses.
   * Completely encapsulates the store to eliminate exposure of mutation methods.
   */
  public getPayloadStore(): ReadOnlyFixturePayloadStore {
    return new ReadOnlyFixturePayloadStoreWrapper(this.payloadStore);
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

    // Storage Governance: Enforce read-only storage for validation access (fails closed if mutable)
    if (!this.isReadOnlyMount || !this.payloadStore.isReadOnlyForValidation()) {
      errors.push(
        "Storage Governance Failure: Fixture storage is not in enforced read-only state (isReadOnlyMount=false or payloadStore unsealed). Validation access requires read-only mount."
      );
    }

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
        `Fixture '${fixture.fixture_id}' is flagged SUSPECT. Quarantined from active validation testing (Section 18.3/18.4).`
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

    // Check payload buffer if present in read-only storage
    const buffer = this.payloadStore.readPayload(fixture.fixture_id);
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
      requiresRevalidationOfPriorPasses: isQuarantined,
      errors,
      warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE MANAGEMENT & CONTAMINATION REMEDIATION
  // ---------------------------------------------------------------------------

  /**
   * Flags a fixture as CONTAMINATED (leaked into training, few-shot tuning, or heuristic calibration).
   * Implements Section 18.4 & Invariant 4:
   * - Marks fixture CONTAMINATED & INVALIDATED;
   * - Enforces immediate quarantine from active testing;
   * - Issues governed FixtureRevalidationDirective (TRIGGER-06);
   * - Mandates full revalidation of all prior validation passes.
   */
  public flagContaminated(
    fixtureId: string,
    reason: string
  ): FixtureQuarantineResult {
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

    const revalidationDirective: FixtureRevalidationDirective = {
      directiveId: `REV-DIR-CONTAM-${fixtureId}-${Date.now()}`,
      fixtureId,
      contaminationStatus: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
      lifecycleStatus: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      triggerSource: "TRIGGER-06_FIXTURE_RECALIBRATION_CONTAMINATION",
      affectedScope: fixture.declared_applicability_scope,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.revalidationDirectives.push(revalidationDirective);

    const quarantineReport = `[QUARANTINE ENFORCED] Fixture '${fixtureId}' marked CONTAMINATED & INVALIDATED. Reason: ${reason}. All prior PASS results dependent on this fixture require mandatory revalidation (Section 18.4 / Invariant 4 / TRIGGER-06).`;

    return {
      fixture: updated,
      isQuarantined: true,
      requiresRevalidationOfPriorPasses: true,
      revalidationDirective,
      quarantineReport,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      fixture_id: fixtureId,
    };
  }

  /**
   * Flags a fixture as SUSPECT (potential calibration defect, dispute, or suspected prompt leak).
   * Implements Section 18.3 & Section 18.4:
   * - Marks fixture SUSPECT & INVALIDATED;
   * - Immediately quarantines fixture from active validation testing;
   * - Issues governed FixtureRevalidationDirective (TRIGGER-06);
   * - Mandates revalidation of dependent validation passes.
   */
  public flagSuspect(
    fixtureId: string,
    reason: string
  ): FixtureQuarantineResult {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture '${fixtureId}' not found.`);
    }

    const updated: ValidationFixtureRecord = Object.freeze({
      ...fixture,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
    });

    this.fixtures.set(fixtureId, updated);

    const revalidationDirective: FixtureRevalidationDirective = {
      directiveId: `REV-DIR-SUSPECT-${fixtureId}-${Date.now()}`,
      fixtureId,
      contaminationStatus: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
      lifecycleStatus: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      triggerSource: "TRIGGER-06_FIXTURE_RECALIBRATION_CONTAMINATION",
      affectedScope: fixture.declared_applicability_scope,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.revalidationDirectives.push(revalidationDirective);

    const quarantineReport = `[QUARANTINE ENFORCED] Fixture '${fixtureId}' marked SUSPECT & INVALIDATED. Reason: ${reason}. Quarantined from active testing; all prior passes dependent on this fixture require revalidation (Section 18.3 / Section 18.4 / TRIGGER-06).`;

    return {
      fixture: updated,
      isQuarantined: true,
      requiresRevalidationOfPriorPasses: true,
      revalidationDirective,
      quarantineReport,
      contamination_status: FIXTURE_CONTAMINATION_STATUSES.SUSPECT,
      lifecycle_status: FIXTURE_LIFECYCLE_STATUSES.INVALIDATED,
      fixture_id: fixtureId,
    };
  }

  /**
   * Returns all issued revalidation directives.
   */
  public getRevalidationDirectives(): readonly FixtureRevalidationDirective[] {
    return Object.freeze([...this.revalidationDirectives]);
  }

  /**
   * Returns all fixtures currently quarantined (CONTAMINATED or SUSPECT).
   */
  public getQuarantinedFixtures(): readonly ValidationFixtureRecord[] {
    return Object.freeze(
      Array.from(this.fixtures.values()).filter(
        (f) =>
          f.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED ||
          f.contamination_status === FIXTURE_CONTAMINATION_STATUSES.SUSPECT
      )
    );
  }

  /**
   * Evaluates if a fixture is currently usable for active testing.
   */
  public isFixtureUsableForTesting(fixtureId: string): boolean {
    const audit = this.auditFixture(fixtureId);
    return audit.isUsableForActiveTesting;
  }

  /**
   * Supersedes an active fixture with an approved successor version.
   * Section 18.3: ACTIVE -> SUPERSEDED.
   */
  public supersedeFixture(
    oldFixtureId: string,
    newRecordInput: unknown,
    newPayloadBuffer?: Uint8Array,
    options?: FixtureRegistrationOptions
  ): FixtureLifecycleTransitionResult {
    const oldFixture = this.fixtures.get(oldFixtureId);
    if (!oldFixture) {
      throw new Error(`Fixture to supersede '${oldFixtureId}' not found.`);
    }

    const newRecord = this.registerFixture(newRecordInput, newPayloadBuffer, options);

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
    this.assertReadOnlyValidationStorageEnforced();
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
