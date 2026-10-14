// src/sound-engineer/validation/schemas/references.ts
// External and upstream reference types for Phase 1C.5h Validation Schemas
// Preserves frozen semantic boundaries without redefining upstream internal structures

import { z } from "zod";

/**
 * Reference to a Phase 1C.5f RunTrace record.
 */
export const runTraceRefSchema = z.string().min(1, "RunTrace reference must not be empty");
export type RunTraceRef = z.infer<typeof runTraceRefSchema>;

/**
 * Reference to an upstream Engineering Decision Record (e.g. from Phase 1C.5d/f).
 */
export const decisionRecordRefSchema = z.string().min(1, "DecisionRecord reference must not be empty");
export type DecisionRecordRef = z.infer<typeof decisionRecordRefSchema>;

/**
 * Reference to a Phase 1C.5g sealed Migration Handoff Package Record.
 */
export const migrationHandoffPackageRefSchema = z
  .string()
  .min(1, "MigrationHandoffPackage reference must not be empty");
export type MigrationHandoffPackageRef = z.infer<typeof migrationHandoffPackageRefSchema>;

/**
 * Identifier reference to a Migration Candidate under evaluation.
 */
export const migrationCandidateRefSchema = z
  .string()
  .min(1, "MigrationCandidate reference must not be empty");
export type MigrationCandidateRef = z.infer<typeof migrationCandidateRefSchema>;

/**
 * Identifier reference to an AI Sound Engineer reasoning component.
 */
export const reasoningComponentRefSchema = z
  .string()
  .min(1, "ReasoningComponent reference must not be empty");
export type ReasoningComponentRef = z.infer<typeof reasoningComponentRefSchema>;

/**
 * Reference or descriptor for a Legacy Production Output baseline (PATH-PROD comparator).
 */
export const legacyOutputRefSchema = z.string().min(1, "LegacyOutput reference must not be empty");
export type LegacyOutputRef = z.infer<typeof legacyOutputRefSchema>;

/**
 * Reference or descriptor for a Golden Studio Reference (FIXTURE-REF comparator).
 */
export const goldenReferenceRefSchema = z.string().min(1, "GoldenReference reference must not be empty");
export type GoldenReferenceRef = z.infer<typeof goldenReferenceRefSchema>;

/**
 * Reference to an upstream or external Governance Entity (e.g. Phase 1C.5g, Upstream Reasoning Governance).
 */
export const governanceEntityRefSchema = z.string().min(1, "GovernanceEntity reference must not be empty");
export type GovernanceEntityRef = z.infer<typeof governanceEntityRefSchema>;
