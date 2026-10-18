// src/sound-engineer/validation/fixtures/types.ts
// Type definitions for Phase 1C.5h WP-08:
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
import {
  type FixtureProvenanceMetadata,
  type ValidationFixtureRecord,
  type ValidationScopeRecord,
} from "../schemas/records";

export {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  type FixtureClass,
  type FixtureContaminationStatus,
  type FixtureLifecycleStatus,
  type FixtureProvenanceMetadata,
  type ValidationFixtureRecord,
  type ValidationScopeRecord,
};

/**
 * Standard uncompressed PCM audio specification.
 * Required for acoustic validation stems (Section 18.2).
 */
export interface PcmAudioSpec {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitDepth: 16 | 24 | 32;
  readonly byteLength: number;
  readonly sampleCount: number;
  readonly durationSeconds: number;
  /** Always false under frozen PCM contract; IEEE Float (0x0003) is forbidden */
  readonly isFloat: false;
  readonly audioFormatCode: 1;
}

/**
 * Result of uncompressed PCM WAV header and data validation.
 */
export interface PcmValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly spec?: PcmAudioSpec;
}

/**
 * Read-only interface for validation-time fixture payload consumption.
 * Strictly prohibits mutation methods (set, replace, delete) during test execution.
 */
export interface ReadOnlyFixturePayloadStore {
  /** Retrieves raw audio payload bytes if present */
  readPayload(fixtureId: string): Uint8Array | undefined;
  /** Checks if payload exists in the store */
  hasPayload(fixtureId: string): boolean;
  /** Returns true if storage is in enforced read-only state */
  isReadOnlyForValidation(): boolean;
}

/**
 * Canonical alias for read-only fixture payload storage interface used in validation consumption.
 */
export type FixturePayloadStore = ReadOnlyFixturePayloadStore;

/**
 * Controlled mutable interface for provisioning/ingestion phase prior to sealing.
 */
export interface MutableFixturePayloadStore extends ReadOnlyFixturePayloadStore {
  /** Provisions a payload buffer before sealing */
  provisionPayload(fixtureId: string, payload: Uint8Array): void;
  /** Permanently seals the payload store to read-only state */
  seal(): void;
}

/**
 * Governed Revalidation Directive issued when a fixture is invalidated or contaminated.
 * Connects WP-08 fixture status changes to WP-09 / WP-18 retest requirements without violating boundaries.
 */
export interface FixtureRevalidationDirective {
  readonly directiveId: string;
  readonly fixtureId: string;
  readonly contaminationStatus: FixtureContaminationStatus;
  readonly lifecycleStatus: FixtureLifecycleStatus;
  readonly triggerSource: "TRIGGER-06_FIXTURE_RECALIBRATION_CONTAMINATION";
  readonly affectedScope: readonly string[];
  readonly reason: string;
  readonly timestamp: string;
}

/**
 * Result of quarantining a contaminated or suspect fixture.
 */
export interface FixtureQuarantineResult {
  readonly fixture: ValidationFixtureRecord;
  readonly isQuarantined: boolean;
  readonly requiresRevalidationOfPriorPasses: boolean;
  readonly revalidationDirective: FixtureRevalidationDirective;
  readonly quarantineReport: string;
  readonly contamination_status: FixtureContaminationStatus;
  readonly lifecycle_status: FixtureLifecycleStatus;
  readonly fixture_id: string;
}

/**
 * Fixture payload type classification for class-appropriate validation (Defect 5).
 */
export type FixturePayloadType = "audio_pcm_wav" | "preset" | "prompt" | "opaque_binary" | "text";

/**
 * Options controlling fixture registration and payload validation.
 */
export interface FixtureRegistrationOptions {
  /** Explicit payload type override if fixture class supports multiple payload formats */
  readonly payloadType?: FixturePayloadType;
}

/**
 * Result of fixture scope applicability evaluation.
 * Prohibits off-label fixture use outside declared domain (Invariant 4 / Section 18.1).
 */
export interface FixtureScopeEvaluationResult {
  readonly isApplicable: boolean;
  readonly fixtureId: string;
  readonly fixtureClass: FixtureClass;
  readonly declaredScope: readonly string[];
  readonly matchedScopes: readonly string[];
  readonly missingScopes: readonly string[];
  readonly rejectionReason?: string;
}

/**
 * Result of fixture provenance completeness audit (Condition 02 / Invariant 10).
 */
export interface FixtureProvenanceAuditResult {
  readonly valid: boolean;
  readonly fixtureId: string;
  readonly missingFields: readonly string[];
  readonly metadata: FixtureProvenanceMetadata;
  readonly diagnosticMessage?: string;
}

/**
 * Result of fixture calibration specification audit (Condition 03).
 */
export interface FixtureCalibrationAuditResult {
  readonly valid: boolean;
  readonly fixtureId: string;
  readonly calibrationSpec: string;
  readonly errors: readonly string[];
}

/**
 * Comprehensive fixture integrity and anti-contamination audit result.
 */
export interface FixtureIntegrityAuditResult {
  readonly valid: boolean;
  readonly fixtureId: string;
  readonly contaminationStatus: FixtureContaminationStatus;
  readonly lifecycleStatus: FixtureLifecycleStatus;
  readonly isQuarantined: boolean;
  readonly isUsableForActiveTesting: boolean;
  readonly requiresRevalidationOfPriorPasses: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Result of governed fixture lifecycle transition (Section 18.3).
 */
export interface FixtureLifecycleTransitionResult {
  readonly success: boolean;
  readonly previousStatus: FixtureLifecycleStatus;
  readonly newStatus: FixtureLifecycleStatus;
  readonly fixtureId: string;
  readonly supersedingFixtureId?: string;
  readonly reason: string;
  readonly updatedRecord: ValidationFixtureRecord;
}

/**
 * Fixture manifest entry representing a file in the golden fixture library.
 */
export interface FixtureManifestEntry {
  readonly record: ValidationFixtureRecord;
  readonly relativeFilePath?: string;
  readonly fileSize?: number;
  readonly audioSpec?: Partial<PcmAudioSpec>;
}

/**
 * Golden Acoustic Fixture Corpus Manifest.
 */
export interface FixtureCorpusManifest {
  readonly manifestVersion: string;
  readonly createdAt: string;
  readonly integrityRef: string;
  readonly libraryVersion: string;
  readonly fixtureCount: number;
  readonly fixtures: readonly FixtureManifestEntry[];
}

/**
 * Manifest verification report returned by verifyFixtureManifest.
 */
export interface ManifestVerificationReport {
  readonly valid: boolean;
  readonly manifestVersion: string;
  readonly totalFixtures: number;
  readonly activeCount: number;
  readonly supersededCount: number;
  readonly invalidatedCount: number;
  readonly retiredCount: number;
  readonly cleanCount: number;
  readonly suspectCount: number;
  readonly contaminatedCount: number;
  readonly fixtureClassDistribution: Record<FixtureClass, number>;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly details: Record<string, FixtureIntegrityAuditResult>;
}
