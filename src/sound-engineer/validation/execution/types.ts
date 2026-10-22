// src/sound-engineer/validation/execution/types.ts
// Authoritative types and interfaces for Phase 1C.5h WP-10:
// Sandboxed Validation Execution Harness & Audio Runner (Record 9).
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.

import {
  ValidationCase,
  ValidationExecutionRecord,
  ValidationPackage,
  ValidationReadinessAssessmentRecord,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { IntegrityProvider } from "../schemas/integrity";
import { FixtureCorpusManager } from "../fixtures/fixtureManager";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";

/**
 * Parameter payload passed to an abstract PlatformValidationAdapter for audio rendering.
 */
export interface RenderRequest {
  /** Unique correlation ID for this render dispatch */
  readonly renderId: string;
  /** Case ID under validation */
  readonly caseId: string;
  /** Target component or candidate unit identifier */
  readonly subjectId: string;
  /** Binary audio payload of the input fixture (e.g. golden DI track) */
  readonly fixturePayload: Uint8Array;
  /** Fixture metadata passed for context */
  readonly fixtureMetadata?: Record<string, unknown>;
  /** The frozen version binding governing the execution environment */
  readonly versionBinding: ValidationVersionBindingRecord;
  /** Maximum wall-clock execution budget in milliseconds */
  readonly timeoutMs?: number;
  /** Abort signal for immediate execution termination / cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Result returned by an abstract PlatformValidationAdapter after rendering.
 */
export interface RenderResult {
  readonly renderId: string;
  /** Rendered PCM/WAV audio buffer */
  readonly audioBuffer: Uint8Array;
  readonly sampleRate: number;
  readonly channelCount: number;
  readonly sampleCount: number;
  readonly durationMs: number;
  /** Raw execution telemetry and render metadata */
  readonly renderMetadata: Record<string, unknown>;
  /** Any non-fatal anomalies, warnings, or dropouts detected during render */
  readonly anomalies: string[];
}

import type {
  PlatformAudioRenderer,
  PlatformValidationAdapter,
} from "../platform/platformAdapter";

export type {
  PlatformAudioRenderer,
  PlatformValidationAdapter,
};

/**
 * Interface for resolving an operational budget reference string into millisecond timeout limits.
 */
export interface OperationalBudgetResolver {
  resolveBudgetMs(budgetRef?: string): number;
}

/**
 * Injected dependencies for ValidationExecutionRunner.
 */
export interface ValidationExecutionDependencies {
  /** Governed fixture corpus manager for loading and auditing golden stems */
  readonly fixtureManager?: FixtureCorpusManager;
  /** The abstract platform validation adapter */
  readonly adapter: PlatformValidationAdapter;
  /** Authoritative validation relationship graph (for TESTED_WITH and SUPERSEDES_VALIDATION edges) */
  readonly graph?: ValidationRelationshipGraph;
  /** Tamper-evident audit ledger for logging execution entries */
  readonly ledger?: ValidationAuditLedger;
  /** Cryptographic integrity provider */
  readonly integrityProvider?: IntegrityProvider;
  /** Operational budget resolver */
  readonly budgetResolver?: OperationalBudgetResolver;
  /** Custom execution environment descriptor string */
  readonly environmentIdentifier?: string;
}

/**
 * Parameters for executing an individual ValidationCase.
 */
export interface ExecuteCaseParams {
  /** The atomic ValidationCase to execute */
  readonly caseRecord: ValidationCase;
  /** The governing scope record */
  readonly scopeRecord: ValidationScopeRecord;
  /** The governing version binding record */
  readonly versionBinding: ValidationVersionBindingRecord;
  /** Optional container ValidationPackage */
  readonly packageRecord?: ValidationPackage;
  /** Optional pre-validation readiness assessment record */
  readonly readinessRecord?: ValidationReadinessAssessmentRecord;
  /** Optional explicit fixture override ID (must match case associated fixtures) */
  readonly fixtureId?: string;
  /** Governed operational budget reference (e.g. BUDGET_STANDARD_RENDER) */
  readonly operationalBudgetRef?: string;
  /** Prior execution ID that this execution supersedes (governed retest only) */
  readonly supersedesExecutionId?: string;
  /** Trace reference linking execution to Phase 1C.5f causal lineage */
  readonly traceRef?: string;
  /** Custom hardware/OS environment descriptor override */
  readonly customEnvironment?: string;
}

/**
 * Comprehensive execution result returned by ValidationExecutionRunner.
 */
export interface ExecutionRunResult {
  /** Sealed, immutable Record 9 ValidationExecutionRecord */
  readonly executionRecord: ValidationExecutionRecord;
  /** Rendered candidate output audio buffer (if available) */
  readonly candidateOutput?: Uint8Array;
  /** Rendered baseline reference output audio buffer (if available) */
  readonly baselineOutput?: Uint8Array;
  /** Fixture ID used, if applicable */
  readonly testedWithFixtureId?: string;
  /** True if this execution is a governed retest superseding a prior execution */
  readonly isRetest: boolean;
  /** Prior execution ID superseded, if applicable */
  readonly supersededExecutionId?: string;
  /** Wall-clock duration in ms */
  readonly durationMs: number;
}
