// src/sound-engineer/validation/lessons/index.ts
// Phase 1C.5h WP-26: Candidate Lesson Boundary & Phase 1C.5e/f Governance Integration.
// Public module export boundary for WP-26.

export type {
  SupportingEvidenceKind,
  SupportingEvidenceReference,
  CandidateLessonScopeReference,
  CandidateLessonUncertaintyReference,
  CandidateLessonEvidencePackage,
  CandidateLessonQuarantineReceipt,
  CandidateLessonQuarantineSink,
  FormulateCandidateLessonInput,
  CandidateLessonHandoffResult,
} from "./lessonTypes";

export {
  InvalidCandidateLessonPackageError,
  QuarantineHandoffError,
} from "./lessonTypes";

export { CandidateLessonHandoffGateway } from "./candidateLessonGateway";
export type { CandidateLessonGatewayOptions } from "./candidateLessonGateway";
