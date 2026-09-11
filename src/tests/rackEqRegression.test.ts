import { getExportDebugData } from "../services/presetExporter";
import { ToneResult, SignalChainElement } from "../types";

// Helper for basic assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("=== Running Rack EQ XML Verification Regression Test ===");

// 1. Construct a mock tone result matching the user's scenario
const mockToneResult: ToneResult = {
  tone_summary: {
    style: "Wherever I May Roam Metallica Main Riff",
    gain_level: "high",
    noise_level: "moderate"
  },
  engineering_notes: {
    gain_strategy: "Amp distortion with high gain settings.",
    noise_control: "Noise gate added to tame high gain hiss.",
    eq_strategy: "Rack Graphic EQ added in RackA Slot0 to scoop mids."
  },
  confidence: 0.95,
  signal_chain: [
    {
      type: "amp",
      name: "American Lead MKIII",
      settings: {
        "Lead Drive": 7,
        "Volume": 6,
        "Master": 5,
        "Treble": 6,
        "Bass": 4.5,
        "Middle": 4
      }
    },
    {
      type: "cab",
      name: "4x12 Brit 8000",
      settings: {}
    },
    {
      type: "rack",
      name: "10 Band Graphic", // Will be resolved to Graphic EQ / rack_slot RackA Slot0
      settings: {
        "Band31": -2,
        "Band63": -5,
        "Band125": 1.5,
        "Band250": 3,
        "Band500": -6,
        "Band1000": -4,
        "Band2000": 2,
        "Band4000": 4,
        "Band8000": 0.5,
        "Band16000": -1,
        "OutLevel": 0,
        "Mode_GraphicEQ": 1
      }
    }
  ]
};

try {
  // 2. Invoke getExportDebugData
  const debugData = getExportDebugData(mockToneResult);

  // 3. Output high-level summary of verification results
  console.log(`Verification Status: ${debugData.final_xml_verification?.status}`);
  console.log(`Total Elements Verified: ${debugData.final_xml_verification?.total_elements_verified}`);
  console.log(`Discrepancies Count: ${debugData.final_xml_verification?.discrepancies.length}`);

  if (debugData.final_xml_verification?.discrepancies.length) {
    console.log("Discrepancies found:", debugData.final_xml_verification.discrepancies);
  }

  // 4. Assert verification PASS
  assert(
    debugData.final_xml_verification?.status === "PASS",
    `Expected PASS status but got "${debugData.final_xml_verification?.status}"`
  );

  // 5. Find the rack Graphic EQ debug item
  const rackEqItem = debugData.exported_chain.find(
    (item) => item.normalized_name === "Graphic EQ" && item.slot_section === "RackA"
  );

  assert(!!rackEqItem, "Could not find exported Graphic EQ item in exported_chain");

  // Verify diagnostic fields are present and correct on the exported item
  console.log("\nVerifying diagnostic fields on Rack Graphic EQ:");
  console.log(`- verification_xml_length: ${rackEqItem!.verification_xml_length}`);
  console.log(`- verification_xml_was_truncated: ${rackEqItem!.verification_xml_was_truncated}`);
  console.log(`- searched_section: ${rackEqItem!.searched_section}`);
  console.log(`- searched_slot_node: ${rackEqItem!.searched_slot_node}`);
  console.log(`- searched_stomp_attr: ${rackEqItem!.searched_stomp_attr}`);
  console.log(`- expected_guid: ${rackEqItem!.expected_guid}`);
  console.log(`- actual_guid_found: ${rackEqItem!.actual_guid_found}`);
  console.log(`- section_found: ${rackEqItem!.section_found}`);
  console.log(`- slot_node_found: ${rackEqItem!.slot_node_found}`);
  console.log(`- slot_attrs_found_count: ${rackEqItem!.slot_attrs_found?.length}`);
  console.log(`- verification_source: ${rackEqItem!.verification_source}`);

  assert(typeof rackEqItem!.verification_xml_length === "number" && rackEqItem!.verification_xml_length > 0, "verification_xml_length should be a positive number");
  assert(rackEqItem!.verification_xml_was_truncated === false, "verification_xml_was_truncated should be false");
  assert(rackEqItem!.searched_section === "RackA", "searched_section should be 'RackA'");
  assert(rackEqItem!.searched_slot_node === "Slot0", "searched_slot_node should be 'Slot0'");
  assert(rackEqItem!.searched_stomp_attr === "Stomp0", "searched_stomp_attr should be 'Stomp0'");
  assert(rackEqItem!.expected_guid === "b66b51c2-d9a3-4909-b7e0-cd1e51636e97", "expected_guid is incorrect");
  assert(rackEqItem!.actual_guid_found === "b66b51c2-d9a3-4909-b7e0-cd1e51636e97", "actual_guid_found is incorrect");
  assert(rackEqItem!.section_found === true, "section_found should be true");
  assert(rackEqItem!.slot_node_found === true, "slot_node_found should be true");
  assert(Array.isArray(rackEqItem!.slot_attrs_found) && rackEqItem!.slot_attrs_found.includes("Band63"), "slot_attrs_found should contain Band63");
  assert(rackEqItem!.verification_source === "final_export_xml", "verification_source is incorrect");

  console.log("\n=== ALL REGRESSION TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
} catch (error: any) {
  console.error("\n❌ Regression test failed with error:", error.message || error);
  process.exit(1);
}
