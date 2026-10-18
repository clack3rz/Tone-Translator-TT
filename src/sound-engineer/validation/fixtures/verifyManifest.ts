// src/sound-engineer/validation/fixtures/verifyManifest.ts
// Fixture manifest verification CLI tool and auditing engine for Phase 1C.5h WP-08.
// Bound to frozen specification v0.1j Section 18, Table 08, and Invariant 4.

import * as fs from "node:fs";
import * as path from "node:path";
import {
  FIXTURE_CLASSES,
  FIXTURE_CONTAMINATION_STATUSES,
  FIXTURE_LIFECYCLE_STATUSES,
  type FixtureClass,
} from "../schemas/enums";
import { parseValidationFixtureRecord } from "../schemas/records";
import {
  isAudioFixtureClass,
  validatePcmWavHeader,
  verifyAudioPayloadIntegrity,
} from "./audioVerification";
import { FixtureCorpusManager } from "./fixtureManager";
import { createDefaultMvviCorpusManifest } from "./manifest";
import {
  type FixtureCorpusManifest,
  type FixtureIntegrityAuditResult,
  type ManifestVerificationReport,
} from "./types";

/**
 * Verifies a Golden Acoustic Fixture Manifest against frozen schemas,
 * taxonomy compliance, provenance completeness, and anti-contamination rules.
 */
export function verifyFixtureManifest(
  manifestInput?: unknown,
  options: {
    basePath?: string;
    checkAudioFilesOnDisk?: boolean;
    requireAllEightClasses?: boolean;
  } = {}
): ManifestVerificationReport {
  let manifest: FixtureCorpusManifest;

  if (!manifestInput) {
    manifest = createDefaultMvviCorpusManifest();
  } else if (typeof manifestInput === "string") {
    const trimmed = manifestInput.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      manifest = JSON.parse(trimmed) as FixtureCorpusManifest;
    } else if (typeof fs !== "undefined" && typeof fs.readFileSync === "function") {
      const content = fs.readFileSync(manifestInput, "utf-8");
      manifest = JSON.parse(content) as FixtureCorpusManifest;
    } else {
      throw new Error(
        "Filesystem access is unavailable in this environment. Provide the manifest as an object or JSON string."
      );
    }
  } else {
    manifest = manifestInput as FixtureCorpusManifest;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, FixtureIntegrityAuditResult> = {};

  const classDistribution: Record<FixtureClass, number> = {
    [FIXTURE_CLASSES.DI_PERFORMANCE]: 0,
    [FIXTURE_CLASSES.REFERENCE_TONE]: 0,
    [FIXTURE_CLASSES.APPROVED_PRESET]: 0,
    [FIXTURE_CLASSES.RENDERED_PLATFORM_BENCHMARK]: 0,
    [FIXTURE_CLASSES.SYNTHETIC_TEST_SIGNAL]: 0,
    [FIXTURE_CLASSES.MULTITRACK_CONTEXT]: 0,
    [FIXTURE_CLASSES.ADVERSARIAL_PATHOLOGICAL]: 0,
    [FIXTURE_CLASSES.WORKFLOW_PROMPT]: 0,
  };

  let activeCount = 0;
  let supersededCount = 0;
  let invalidatedCount = 0;
  let retiredCount = 0;
  let cleanCount = 0;
  let suspectCount = 0;
  let contaminatedCount = 0;

  if (!manifest.fixtures || !Array.isArray(manifest.fixtures)) {
    errors.push("Manifest missing 'fixtures' array.");
    return {
      valid: false,
      manifestVersion: manifest.manifestVersion ?? "unknown",
      totalFixtures: 0,
      activeCount: 0,
      supersededCount: 0,
      invalidatedCount: 0,
      retiredCount: 0,
      cleanCount: 0,
      suspectCount: 0,
      contaminatedCount: 0,
      fixtureClassDistribution: classDistribution,
      errors,
      warnings,
      details,
    };
  }

  const manager = new FixtureCorpusManager({ loadBootstrapCorpus: false });

  for (const entry of manifest.fixtures) {
    try {
      const record = parseValidationFixtureRecord(entry.record);
      manager.registerFixture(record);

      // Tally lifecycle
      if (record.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.ACTIVE) activeCount++;
      else if (record.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.SUPERSEDED) supersededCount++;
      else if (record.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.INVALIDATED) invalidatedCount++;
      else if (record.lifecycle_status === FIXTURE_LIFECYCLE_STATUSES.RETIRED) retiredCount++;

      // Tally contamination
      if (record.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CLEAN) cleanCount++;
      else if (record.contamination_status === FIXTURE_CONTAMINATION_STATUSES.SUSPECT) suspectCount++;
      else if (record.contamination_status === FIXTURE_CONTAMINATION_STATUSES.CONTAMINATED) contaminatedCount++;

      // Tally class distribution
      if (record.fixture_class in classDistribution) {
        classDistribution[record.fixture_class]++;
      } else {
        errors.push(
          `Fixture '${record.fixture_id}' has non-governed class '${record.fixture_class}'. Must strictly adhere to the 8 frozen Fixture Classes.`
        );
      }

      // Audit fixture
      const auditResult = manager.auditFixture(record);
      details[record.fixture_id] = auditResult;

      if (!auditResult.valid) {
        errors.push(
          `Fixture '${record.fixture_id}' audit failure: ${auditResult.errors.join("; ")}`
        );
      }

      // Optional file verification on disk
      if (options.checkAudioFilesOnDisk && entry.relativeFilePath) {
        if (
          typeof fs !== "undefined" &&
          typeof fs.existsSync === "function" &&
          typeof fs.readFileSync === "function" &&
          typeof path !== "undefined" &&
          typeof path.resolve === "function"
        ) {
          const basePath =
            options.basePath ??
            (typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".");
          const filePath = path.resolve(basePath, entry.relativeFilePath);

          if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

            const bitCheck = verifyAudioPayloadIntegrity(
              uint8,
              record.payload_integrity_ref
            );
            if (!bitCheck.valid) {
              errors.push(
                `Fixture file '${entry.relativeFilePath}' bit integrity failed: ${bitCheck.error}`
              );
            }

            if (isAudioFixtureClass(record.fixture_class)) {
              const pcmCheck = validatePcmWavHeader(uint8);
              if (!pcmCheck.valid) {
                errors.push(
                  `Fixture file '${entry.relativeFilePath}' PCM WAV header invalid: ${pcmCheck.errors.join(
                    "; "
                  )}`
                );
              }
            }
          } else {
            warnings.push(
              `Fixture file not found on disk at '${filePath}' (virtual/staged stem).`
            );
          }
        } else {
          warnings.push(
            `Filesystem access is not available in this environment to check fixture file '${entry.relativeFilePath}'.`
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Manifest entry parsing error: ${msg}`);
    }
  }

  // Check 8 frozen classes coverage if requested
  if (options.requireAllEightClasses ?? true) {
    for (const [cls, count] of Object.entries(classDistribution)) {
      if (count === 0) {
        errors.push(
          `Corpus incomplete: zero fixtures cataloged for frozen class '${cls}'. All eight fixture classes must be supported.`
        );
      }
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    manifestVersion: manifest.manifestVersion,
    totalFixtures: manifest.fixtures.length,
    activeCount,
    supersededCount,
    invalidatedCount,
    retiredCount,
    cleanCount,
    suspectCount,
    contaminatedCount,
    fixtureClassDistribution: classDistribution,
    errors,
    warnings,
    details,
  };
}

/**
 * CLI execution entrypoint.
 */
export function runManifestCli(): void {
  const args =
    typeof process !== "undefined" && Array.isArray(process?.argv)
      ? process.argv.slice(2)
      : [];
  const manifestPath = args[0];

  console.log("================================================================================");
  console.log("Phase 1C.5h — WP-08 Golden Acoustic Fixture Manifest Verification CLI");
  console.log("================================================================================");

  try {
    const report = verifyFixtureManifest(manifestPath);

    console.log(`Manifest Version:    ${report.manifestVersion}`);
    console.log(`Total Fixtures:      ${report.totalFixtures}`);
    console.log(`  Active:            ${report.activeCount}`);
    console.log(`  Superseded:        ${report.supersededCount}`);
    console.log(`  Invalidated:       ${report.invalidatedCount}`);
    console.log(`  Retired:           ${report.retiredCount}`);
    console.log(`Contamination State:`);
    console.log(`  Clean:             ${report.cleanCount}`);
    console.log(`  Suspect:           ${report.suspectCount}`);
    console.log(`  Contaminated:      ${report.contaminatedCount}`);
    console.log("\nEight Frozen Fixture Classes Distribution:");
    for (const [cls, count] of Object.entries(report.fixtureClassDistribution)) {
      console.log(`  ${cls.padEnd(30)} : ${count}`);
    }

    if (report.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const w of report.warnings) {
        console.log(`  [WARN] ${w}`);
      }
    }

    if (!report.valid) {
      console.error("\nErrors Encountered:");
      for (const e of report.errors) {
        console.error(`  [FAIL] ${e}`);
      }
      console.error("\nMANIFEST VERIFICATION RESULT: FAILED (Gate 8 Blocked / Invariant 4)");
      if (typeof process !== "undefined") {
        process.exitCode = 1;
      }
    } else {
      console.log("\nMANIFEST VERIFICATION RESULT: PASS (All Invariant 4 and Table 08 rules satisfied)");
      if (typeof process !== "undefined") {
        process.exitCode = 0;
      }
    }
  } catch (err: unknown) {
    console.error("Fatal error during manifest verification:", err);
    if (typeof process !== "undefined") {
      process.exitCode = 1;
    }
  }
}

// Auto-run if executed directly in Node CLI
const isDirectCliExecution =
  typeof process !== "undefined" &&
  Array.isArray(process?.argv) &&
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("verifyManifest.ts") || process.argv[1].endsWith("verifyManifest.js"));

if (isDirectCliExecution) {
  runManifestCli();
}
