// src/sound-engineer/validation/remand/index.ts
// Phase 1C.5h WP-25: Defect Remand Packaging & Multi-Destination Routing Subsystem.
// Public module export boundary for WP-25.

export type {
  DefectRemandPackage,
  RemandLifecycleStatus,
  RemandHandoffTracking,
  RemandAgeRecord,
} from "./remandTypes";

export {
  RemandAgingTracker,
  RemandNotFoundError,
  DuplicateRemandRegistrationError,
  InvalidRemandHandoffError,
  InvalidAgingCalculationError,
} from "./remandAgingTracker";

export type {
  RemandAgingTrackerOptions,
  NowFn,
} from "./remandAgingTracker";

export {
  DefectRemandRouter,
  RemandLineageMismatchError,
  IncompleteReproductionEvidenceError,
  UnsupportedFailureAttributionError,
} from "./defectRemandRouter";

export type {
  DefectRemandRouterDependencies,
  RouteDefectInput,
  RouteDefectResult,
} from "./defectRemandRouter";

export {
  exportDefectRemandPackage,
  verifyDefectRemandPackageIntegrity,
  verifyExportManifestIntegrity,
  runDefectExportCli,
  DefectExportError,
  PackageIntegrityVerificationError,
  ExportDestinationExistsError,
  InvalidExportDestinationError,
  ExportFilesystemError,
  MissingReproductionFixtureError,
} from "./defectExportCli";

export type {
  FixtureAssetHandlingMode,
  ExportFixtureAssetReference,
  ExportedEvidenceFileEntry,
  ExportRemandManifest,
  ExportDefectRemandOptions,
  ExportDefectRemandResult,
  ManifestVerificationResult,
  CliExecutionResult,
  CliContext,
} from "./defectExportCli";
