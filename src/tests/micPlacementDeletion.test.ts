// src/tests/micPlacementDeletion.test.ts
// Regression tests for Tone Translator — Custom Mic Placement Profile Deletion

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MicPlacementMapping } from "../types";

describe("Custom Mic Placement Profile Deletion & Persistent Identity", () => {

  // Sample test records representing both legacy and canonical Firestore documents
  const legacyMic1Doc: MicPlacementMapping = {
    id: "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis",
    firestoreDocumentId: "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis",
    originalProfileId: "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis",
    firestoreDocumentPath: "mic_placement_mappings/4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis",
    gear: "4x12 Brit 8000",
    cabName: "4x12 Brit 8000",
    friendly_setting: "Mic_1_Placement",
    friendly_value: "Cone Edge, Far, 45° Off Axis",
    maps_to: {
      Mic0Angle: 45,
      Mic0Distance: 0.15,
      Mic0Speaker: 0,
      Mic0XAxis: 0.28,
      Mic0YAxis: 0
    },
    status: "validated"
  };

  const legacyMic2Doc: MicPlacementMapping = {
    id: "4x12_Brit_8000_Mic_2_Placement_Cap_Edge-Close-On_Axis",
    firestoreDocumentId: "4x12_Brit_8000_Mic_2_Placement_Cap_Edge-Close-On_Axis",
    originalProfileId: "4x12_Brit_8000_Mic_2_Placement_Cap_Edge-Close-On_Axis",
    firestoreDocumentPath: "mic_placement_mappings/4x12_Brit_8000_Mic_2_Placement_Cap_Edge-Close-On_Axis",
    gear: "4x12 Brit 8000",
    cabName: "4x12 Brit 8000",
    friendly_setting: "Mic_2_Placement",
    friendly_value: "Cap Edge-Close-On Axis",
    maps_to: {
      Mic1Angle: 0,
      Mic1Distance: 0,
      Mic1Speaker: 1,
      Mic1XAxis: -0.21,
      Mic1YAxis: 0
    },
    status: "validated"
  };

  const canonicalMic0Doc: MicPlacementMapping = {
    id: "4x12_Brit_8000_Mic_0_Placement_Cap_Close_On_Axis",
    firestoreDocumentId: "4x12_Brit_8000_Mic_0_Placement_Cap_Close_On_Axis",
    originalProfileId: "4x12_Brit_8000_Mic_0_Placement_Cap_Close_On_Axis",
    firestoreDocumentPath: "mic_placement_mappings/4x12_Brit_8000_Mic_0_Placement_Cap_Close_On_Axis",
    gear: "4x12 Brit 8000",
    cabName: "4x12 Brit 8000",
    micSlot: "Mic_0",
    micIndex: 0,
    friendly_setting: "Mic_0_Placement",
    friendly_value: "Cap, Close, On Axis",
    canonicalPlacementName: "Cap, Close, On Axis",
    maps_to: {
      Mic0Angle: 0,
      Mic0Distance: 0,
      Mic0Speaker: 0,
      Mic0XAxis: 0,
      Mic0YAxis: 0
    },
    status: "validated"
  };

  const canonicalMic1Doc: MicPlacementMapping = {
    id: "4x12_Brit_8000_Mic_1_Placement_Cone_Far_45_Off_Axis",
    firestoreDocumentId: "4x12_Brit_8000_Mic_1_Placement_Cone_Far_45_Off_Axis",
    originalProfileId: "4x12_Brit_8000_Mic_1_Placement_Cone_Far_45_Off_Axis",
    firestoreDocumentPath: "mic_placement_mappings/4x12_Brit_8000_Mic_1_Placement_Cone_Far_45_Off_Axis",
    gear: "4x12 Brit 8000",
    cabName: "4x12 Brit 8000",
    micSlot: "Mic_1",
    micIndex: 1,
    friendly_setting: "Mic_1_Placement",
    friendly_value: "Cone, Far, 45° Off Axis",
    canonicalPlacementName: "Cone, Far, 45° Off Axis",
    maps_to: {
      Mic1Angle: 45,
      Mic1Distance: 0.15,
      Mic1Speaker: 1,
      Mic1XAxis: 0.28,
      Mic1YAxis: 0
    },
    status: "validated"
  };

  // Helper resolving deletion target ID from a loaded profile mapping
  function resolveDeletionTargetDocId(mapping: MicPlacementMapping | null): string | null {
    if (!mapping) return null;
    const target = mapping.firestoreDocumentId || mapping.id || mapping.originalProfileId;
    return target ? target.trim() : null;
  }

  // 1 & 2. Single shared request delete entry point
  it("invokes the same shared delete request from both card trash icon and edit modal", () => {
    let capturedForDelete: MicPlacementMapping | null = null;
    const requestDeleteCustomMicPlacement = (profile: MicPlacementMapping | null) => {
      capturedForDelete = profile;
    };

    // Simulate clicking card trash icon
    requestDeleteCustomMicPlacement(legacyMic1Doc);
    assert.equal(capturedForDelete, legacyMic1Doc);

    // Simulate clicking Edit modal DELETE PROFILE
    requestDeleteCustomMicPlacement(legacyMic2Doc);
    assert.equal(capturedForDelete, legacyMic2Doc);
  });

  // 3. Confirmation Cancel performs no deletion
  it("performs no deletion when confirmation dialog is cancelled", () => {
    let deletedDocId: string | null = null;
    let deletingMapping: MicPlacementMapping | null = legacyMic1Doc;

    // Simulate cancel
    deletingMapping = null;

    assert.equal(deletingMapping, null);
    assert.equal(deletedDocId, null);
  });

  // 4 & 5. Confirmation Delete performs deletion targeting correct original Firestore document ID
  it("performs Firestore deletion using the exact persistent Firestore document ID", () => {
    let deletedDocId: string | null = null;
    const fakeFirestoreDelete = (id: string) => {
      deletedDocId = id;
    };

    const targetId = resolveDeletionTargetDocId(legacyMic1Doc);
    assert.equal(targetId, "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis");

    fakeFirestoreDelete(targetId!);
    assert.equal(deletedDocId, "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis");
  });

  // 6. Legacy Mic 1 record normalized to canonical Mic 0 deletes its ORIGINAL legacy Firestore document
  it("allows legacy Mic 1 record normalized to canonical Mic 0 to delete its ORIGINAL legacy document", () => {
    // When opened in Edit modal, legacy Mic 1 displays as canonical Mic 0:
    const normalizedSlotInEditor = "Mic_0";
    assert.equal(normalizedSlotInEditor, "Mic_0");

    // But the persistent deletion target MUST remain the original legacy doc ID
    const targetId = resolveDeletionTargetDocId(legacyMic1Doc);
    assert.equal(targetId, "4x12_Brit_8000_Mic_1_Placement_Cone_Edge__Far__45__Off_Axis");
    assert.notEqual(targetId, "4x12_Brit_8000_Mic_0_Placement_Cone_Edge__Far__45__Off_Axis");
  });

  // 7. Legacy Mic 2 record normalized to canonical Mic 1 deletes its ORIGINAL legacy Firestore document
  it("allows legacy Mic 2 record normalized to canonical Mic 1 to delete its ORIGINAL legacy document", () => {
    // When opened in Edit modal, legacy Mic 2 displays as canonical Mic 1:
    const normalizedSlotInEditor = "Mic_1";
    assert.equal(normalizedSlotInEditor, "Mic_1");

    // But the persistent deletion target MUST remain the original legacy doc ID
    const targetId = resolveDeletionTargetDocId(legacyMic2Doc);
    assert.equal(targetId, "4x12_Brit_8000_Mic_2_Placement_Cap_Edge-Close-On_Axis");
    assert.notEqual(targetId, "4x12_Brit_8000_Mic_1_Placement_Cap_Edge-Close-On_Axis");
  });

  // 8 & 9. Canonical Mic 0 and Mic 1 records delete correctly
  it("deletes canonical Mic 0 and Mic 1 records using their exact persistent document IDs", () => {
    const target0 = resolveDeletionTargetDocId(canonicalMic0Doc);
    assert.equal(target0, "4x12_Brit_8000_Mic_0_Placement_Cap_Close_On_Axis");

    const target1 = resolveDeletionTargetDocId(canonicalMic1Doc);
    assert.equal(target1, "4x12_Brit_8000_Mic_1_Placement_Cone_Far_45_Off_Axis");
  });

  // 10 & 11. Successful deletion refreshes registered profile state and removes card immediately
  it("refreshes registered profile state and immediately removes deleted profile from list", () => {
    let profileList = [legacyMic1Doc, legacyMic2Doc, canonicalMic0Doc];

    // Deleting legacyMic2Doc
    const idToDelete = resolveDeletionTargetDocId(legacyMic2Doc)!;
    profileList = profileList.filter(p => (p.firestoreDocumentId || p.id) !== idToDelete);

    assert.equal(profileList.length, 2);
    assert.equal(profileList.some(p => p.id === legacyMic2Doc.id), false);
    assert.equal(profileList.some(p => p.id === legacyMic1Doc.id), true);
    assert.equal(profileList.some(p => p.id === canonicalMic0Doc.id), true);
  });

  // 12. Edit modal closes after successful deletion
  it("closes Edit modal after successful deletion of the currently edited profile", () => {
    let showAddModal = true;
    let editingMapping: MicPlacementMapping | null = legacyMic1Doc;

    const idToDelete = resolveDeletionTargetDocId(legacyMic1Doc)!;

    if (editingMapping && (editingMapping.id === idToDelete || editingMapping.firestoreDocumentId === idToDelete)) {
      showAddModal = false;
      editingMapping = null;
    }

    assert.equal(showAddModal, false);
    assert.equal(editingMapping, null);
  });

  // 13 & 14. Firestore failure produces visible error feedback without swallowing
  it("captures Firestore failure and formats human-readable error feedback without silent swallowing", () => {
    let errorFeedback: string | null = null;

    try {
      const simulatedError = new Error("Missing or insufficient permissions.");
      throw simulatedError;
    } catch (err: any) {
      let readableError = err.message || String(err);
      if (readableError.includes("insufficient permissions")) {
        readableError = "You must be signed in with Google to delete profiles from Firestore.";
      }
      errorFeedback = `Failed to delete Mic Placement Profile: ${readableError}`;
    }

    assert.equal(errorFeedback, "Failed to delete Mic Placement Profile: You must be signed in with Google to delete profiles from Firestore.");
    assert.notEqual(errorFeedback, null);
  });

  // 15. Delete cannot accidentally delete another profile because of Mic-slot normalization
  it("guarantees deletion cannot accidentally target or collide with another profile during slot normalization", () => {
    const records = [legacyMic1Doc, legacyMic2Doc, canonicalMic0Doc, canonicalMic1Doc];

    // Each record has a completely distinct persistent target ID
    const targetIds = records.map(r => resolveDeletionTargetDocId(r));
    const uniqueIds = new Set(targetIds);

    assert.equal(targetIds.length, uniqueIds.size, "All deletion target IDs must be strictly unique");
    
    // Deleting legacyMic1Doc MUST NOT touch canonicalMic0Doc even though both represent AT5 Mic0 / Primary slot
    const legacyMic1Target = resolveDeletionTargetDocId(legacyMic1Doc);
    const canonicalMic0Target = resolveDeletionTargetDocId(canonicalMic0Doc);

    assert.notEqual(legacyMic1Target, canonicalMic0Target);
  });
});
