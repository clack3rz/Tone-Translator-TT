// src/tests/gearIdentityExportIntegrity.test.ts
// Unit and regression test suite for Gear Identity & Export Integrity Correction.
// Verifies Slice A (Catalog Matching), Slice B (Actual Export Integrity),
// Slice C (Diagnostic Identity Preservation), and Slice D (Gear Manager Navigation).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAT5Gear, AT5_EMPTY_SLOT_GUID } from "../services/at5Catalog";
import { getExportDebugData, generateXML } from "../services/presetExporter";
import { ToneResult, SignalChainElement } from "../types";

describe("Slice A: Catalog Matching - Zero-Evidence Rejection", () => {
  it("rejects unknown stomp names and does NOT match OverScream or any other gear", () => {
    const unknownStomp = findAT5Gear("DistorTed", "stomp");
    assert.equal(unknownStomp, undefined, "DistorTed must return undefined and never false-match OverScream");

    const gibberish = findAT5Gear("XyzNonExistentFuzz123", "stomp");
    assert.equal(gibberish, undefined, "Gibberish stomp query must return undefined");
  });

  it("rejects unknown amp names without evidence", () => {
    const unknownAmp = findAT5Gear("SuperUnknownAmp9000", "amp");
    assert.equal(unknownAmp, undefined, "Unknown amp must return undefined");
  });

  it("rejects unknown cab names without evidence", () => {
    const unknownCab = findAT5Gear("AlienSpaceshipCab4x12", "cab");
    assert.equal(unknownCab, undefined, "Unknown cab must return undefined");
  });

  it("rejects unknown rack names without evidence", () => {
    const unknownRack = findAT5Gear("IntergalacticRackDelay99", "rack");
    assert.equal(unknownRack, undefined, "Unknown rack must return undefined");
  });

  it("preserves legitimate exact-name matches across categories", () => {
    const overScream = findAT5Gear("OverScream", "stomp");
    assert.ok(overScream, "OverScream must match exactly");
    assert.equal(overScream?.displayName, "OverScream");

    const brit8000 = findAT5Gear("Brit 8000", "amp");
    assert.ok(brit8000, "Brit 8000 must match exactly");
    assert.equal(brit8000?.displayName, "Brit 8000");

    const cab8000 = findAT5Gear("4x12 Brit 8000", "cab");
    assert.ok(cab8000, "4x12 Brit 8000 must match exactly");
    assert.equal(cab8000?.displayName, "4x12 Brit 8000");

    const black76 = findAT5Gear("Black 76", "rack");
    assert.ok(black76, "Black 76 must match exactly");
    assert.equal(black76?.displayName, "Black 76");
  });

  it("preserves legitimate alias and fuzzy matching for known gear", () => {
    const ts9Match = findAT5Gear("TS9", "stomp");
    assert.ok(ts9Match, "TS9 alias must resolve to OverScream");
    assert.equal(ts9Match?.displayName, "OverScream");

    const tubeScreamer = findAT5Gear("Tube Screamer", "stomp");
    assert.ok(tubeScreamer, "Tube Screamer alias must resolve to OverScream");
    assert.equal(tubeScreamer?.displayName, "OverScream");

    const jcm800 = findAT5Gear("JCM 800", "amp");
    assert.ok(jcm800, "JCM 800 alias must resolve to Brit 8000");
    assert.equal(jcm800?.displayName, "Brit 8000");
  });
});

describe("Slice B & C: End-to-End DistorTed Incident Reproduction and Export Integrity", () => {
  const incidentResult: ToneResult = {
    preset_name: "Incident Test Preset",
    tone_summary: {
      style: "High-Gain Raw Distortion",
      gain_level: "high",
      noise_level: "moderate",
    },
    engineering_notes: {
      gain_strategy: "Raw distortion into high-gain amp.",
    },
    signal_chain: [
      {
        type: "pedal",
        name: "DistorTed",
        settings: {
          Drive: 7,
          Tone: 5,
          Level: 7,
        },
      },
      {
        type: "amp",
        name: "Brit 8000",
        settings: {
          PreAmp: 7,
          Master: 6,
          Bass: 5,
          Middle: 5,
          Treble: 6,
        },
      },
      {
        type: "cab",
        name: "4x12 Brit 8000",
        settings: {},
      },
    ],
  };

  it("ensures DistorTed cannot falsely resolve to OverScream", () => {
    const exportDebug = getExportDebugData(incidentResult);
    const distItem = exportDebug.exported_chain.find(
      (item) => item.original_name === "DistorTed" || item.normalized_name === "DistorTed"
    );

    assert.ok(distItem, "DistorTed item must be present in exported chain");
    assert.notEqual(
      distItem?.resolved_guid,
      "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0",
      "DistorTed must NOT resolve to OverScream GUID"
    );
    assert.notEqual(
      distItem?.normalized_name,
      "OverScream",
      "DistorTed must NOT be normalized to OverScream"
    );
  });

  it("ensures preset XML physically contains AT5_EMPTY_SLOT_GUID for unresolved DistorTed slot", () => {
    const xml = generateXML(incidentResult);
    assert.ok(
      xml.includes(`Stomp0="${AT5_EMPTY_SLOT_GUID}"`),
      "Physical preset XML must serialize AT5_EMPTY_SLOT_GUID for unresolved slot"
    );
  });

  it("ensures PROdrive cannot be reported as exported when XML contains an empty slot", () => {
    const exportDebug = getExportDebugData(incidentResult);
    const distItem = exportDebug.exported_chain.find(
      (item) => item.original_name === "DistorTed" || item.normalized_name === "DistorTed"
    );

    assert.ok(distItem, "DistorTed item must be found");
    assert.notEqual(
      distItem?.actual_exported_gear_name,
      "PROdrive",
      "PROdrive must NEVER be reported as exported when XML has an empty slot"
    );
    assert.equal(
      distItem?.actual_exported_gear_name,
      "None",
      "Empty slot must report actual_exported_gear_name as 'None'"
    );
    assert.notEqual(
      distItem?.fallback_exported_gear_name,
      "PROdrive",
      "fallback_exported_gear_name must not claim PROdrive was exported"
    );
  });

  it("preserves original requested gear name DistorTed throughout diagnostics", () => {
    const exportDebug = getExportDebugData(incidentResult);
    const distItem = exportDebug.exported_chain.find(
      (item) => item.original_name === "DistorTed"
    );

    assert.ok(distItem, "DistorTed must be preserved as original_name");
    assert.equal(distItem?.original_name, "DistorTed");
    assert.equal(distItem?.original_requested_gear_name, "DistorTed");
    assert.equal(distItem?.final_status, "CHECK");
    assert.ok(
      distItem?.reason.includes("DistorTed"),
      `Reason must reference original requested gear name DistorTed: ${distItem?.reason}`
    );
    assert.ok(
      distItem?.reason.includes("empty slot in preset XML"),
      `Reason must explain empty slot export: ${distItem?.reason}`
    );
  });
});

describe("Slice D: Gear Manager Navigation Target Resolution", () => {
  // Navigation helper contract mirroring AT5SignalChainView
  const getGearManagerTarget = (item: {
    original_name: string;
    normalized_name: string;
    resolved_guid: string;
    verified_guid_resolved?: boolean;
    substitution_used?: boolean;
    fallback_applied?: boolean;
  }): string => {
    if (
      item.verified_guid_resolved &&
      !item.substitution_used &&
      !item.fallback_applied &&
      item.resolved_guid &&
      item.resolved_guid !== AT5_EMPTY_SLOT_GUID
    ) {
      return item.resolved_guid;
    }
    return item.original_name || item.normalized_name;
  };

  it("navigates verified gear directly to its canonical GUID", () => {
    const verifiedItem = {
      original_name: "OverScream",
      normalized_name: "OverScream",
      resolved_guid: "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0",
      verified_guid_resolved: true,
      substitution_used: false,
      fallback_applied: false,
    };

    const target = getGearManagerTarget(verifiedItem);
    assert.equal(
      target,
      "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0",
      "Verified gear must navigate using its canonical GUID"
    );
  });

  it("navigates unresolved/empty-slot gear using original requested name, never an unverified or contaminated GUID", () => {
    const unresolvedIncidentItem = {
      original_name: "DistorTed",
      normalized_name: "DistorTed",
      resolved_guid: AT5_EMPTY_SLOT_GUID,
      verified_guid_resolved: false,
      substitution_used: false,
      fallback_applied: false,
    };

    const target = getGearManagerTarget(unresolvedIncidentItem);
    assert.equal(
      target,
      "DistorTed",
      "Unresolved gear must navigate using original requested name to trigger review/search"
    );
    assert.notEqual(
      target,
      "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0",
      "Must NEVER navigate to OverScream GUID"
    );
  });

  it("navigates substituted/fallback gear using original requested name to review the requested target", () => {
    const fallbackItem = {
      original_name: "RareVintageFuzz",
      normalized_name: "RareVintageFuzz",
      resolved_guid: "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0", // substituted fallback
      verified_guid_resolved: false,
      substitution_used: true,
      fallback_applied: true,
    };

    const target = getGearManagerTarget(fallbackItem);
    assert.equal(
      target,
      "RareVintageFuzz",
      "Substituted/fallback gear must navigate using original requested name"
    );
  });
});

describe("Baseline Preservation: Standard Verified Gear Exports", () => {
  it("preserves correct export and PASS status for standard verified rig", () => {
    const validRig: ToneResult = {
      preset_name: "Classic JCM800 Rig",
      tone_summary: {
        style: "Classic Hard Rock",
        gain_level: "medium-high",
        noise_level: "low",
      },
      signal_chain: [
        {
          type: "pedal",
          name: "OverScream",
          settings: {
            Drive: 3,
            Tone: 6,
            Level: 8,
          },
        },
        {
          type: "amp",
          name: "Brit 8000",
          settings: {
            PreAmp: 6,
            Master: 7,
            Bass: 5,
            Middle: 6,
            Treble: 6,
          },
        },
        {
          type: "cab",
          name: "4x12 Brit 8000",
          settings: {},
        },
      ],
    };

    const exportDebug = getExportDebugData(validRig);
    assert.equal(exportDebug.exported_chain.length, 3);

    const overScream = exportDebug.exported_chain.find(
      (item) => item.normalized_name === "OverScream"
    );
    assert.ok(overScream, "OverScream should be present");
    assert.equal(overScream?.resolved_guid, "fa1de2e2-102b-4edf-b3b5-23ceaeddedf0");
    assert.equal(overScream?.final_status, "PASS");

    const brit8000 = exportDebug.exported_chain.find(
      (item) => item.normalized_name === "Brit 8000"
    );
    assert.ok(brit8000, "Brit 8000 should be present");
    assert.equal(brit8000?.final_status, "PASS");

    const cab = exportDebug.exported_chain.find(
      (item) => item.normalized_name === "4x12 Brit 8000"
    );
    assert.ok(cab, "4x12 Brit 8000 should be present");
    assert.equal(cab?.final_status, "PASS");
  });
});
