// src/tests/traceabilityFoundation.test.ts
// Unit verification of WP-29 Slice 1A Traceability Foundation Contracts & Principle Metadata.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRACEABILITY_AUDIT_VERDICTS,
  TRACEABILITY_FINDING_TYPES,
  TRACEABILITY_FINDING_CATEGORIES,
  STAGE_REPRESENTATION_STRENGTHS,
  PARAMETER_PROVENANCE_LEVELS,
  MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
  formatParameterKey,
  PRINCIPLE_AUDIT_STATES,
} from "../sound-engineer/validation/traceability/traceabilityTypes";
import {
  PRINCIPLE_AUDIT_STRENGTHS,
  FROZEN_PRINCIPLES_METADATA,
  getPrincipleMetadata,
  getAllPrinciplesMetadata,
} from "../sound-engineer/validation/traceability/principlesMetadata";

describe("WP-29 Slice 1A: Traceability Foundation Contracts & Principle Metadata", () => {
  it("preserves exactly 21 frozen principles in metadata catalogue", () => {
    const all = getAllPrinciplesMetadata();
    assert.equal(all.length, 21);
    assert.equal(FROZEN_PRINCIPLES_METADATA.length, 21);

    for (let i = 1; i <= 21; i++) {
      const p = getPrincipleMetadata(i);
      assert.ok(p, `Principle ${i} should exist in lookup`);
      assert.equal(p.number, i);
      assert.ok(p.title.length > 0);
      assert.ok(p.governanceInterpretation.length > 0);
      assert.ok(p.evidenceEvaluated.length > 0);
      assert.ok(p.auditBoundaryNotes.length > 0);
    }
  });

  it("strictly enforces required audit strengths across all 21 principles", () => {
    const expectedStrengths: Record<number, string> = {
      // STRUCTURALLY_VERIFIABLE (5 principles)
      1: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      7: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      12: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      15: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
      18: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,

      // EVIDENCE_PRESENT (8 principles)
      2: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      3: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      8: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      9: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      13: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      16: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      19: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
      20: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,

      // DELEGATED_UPSTREAM (8 principles)
      4: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      5: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      6: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      10: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      11: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      14: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      17: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
      21: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    };

    for (let i = 1; i <= 21; i++) {
      const p = getPrincipleMetadata(i)!;
      assert.equal(
        p.auditStrength,
        expectedStrengths[i],
        `Principle ${i} (${p.title}) audit strength mismatch`
      );
    }
  });

  it("preserves P20 guardrail as EVIDENCE_PRESENT without overclaiming substantive proof", () => {
    const p20 = getPrincipleMetadata(20)!;
    assert.equal(p20.auditStrength, PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT);
    assert.ok(p20.auditBoundaryNotes.includes("P20 Guardrail"));
    assert.ok(p20.auditBoundaryNotes.includes("does NOT independently certify"));
  });

  it("strictly bounds maximum parameter provenance capability to LEVEL_3_DECISION_RECORD_TRACE", () => {
    assert.equal(
      MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
      PARAMETER_PROVENANCE_LEVELS.LEVEL_3_DECISION_RECORD_TRACE
    );
    assert.notEqual(
      MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
      PARAMETER_PROVENANCE_LEVELS.LEVEL_4_EXACT_DECISION_TRACE
    );
    assert.notEqual(
      MAX_SUPPORTED_PARAMETER_PROVENANCE_LEVEL,
      PARAMETER_PROVENANCE_LEVELS.LEVEL_5_EXACT_CAUSAL_TRACE
    );
  });

  it("formats composite parameter key without claiming universal collision freedom", () => {
    const key = formatParameterKey({
      stageId: "stage_01_preamp",
      targetDeviceId: "amp_british_tube_lead",
      parameterName: "Gain",
    });
    assert.equal(key, "stage_01_preamp::amp_british_tube_lead::Gain");
  });

  it("strictly separates VIOLATION from NOT_VERIFIABLE finding types", () => {
    assert.equal(TRACEABILITY_FINDING_TYPES.VIOLATION, "VIOLATION");
    assert.equal(TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE, "NOT_VERIFIABLE");
    assert.notEqual(
      TRACEABILITY_FINDING_TYPES.VIOLATION,
      TRACEABILITY_FINDING_TYPES.NOT_VERIFIABLE
    );
  });

  it("preserves implementation-local audit verdicts without polluting global lifecycle statuses", () => {
    assert.equal(
      TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_VERIFIED,
      "TRACE_COMPLIANCE_VERIFIED"
    );
    assert.equal(
      TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_DEFICIENT,
      "TRACE_COMPLIANCE_DEFICIENT"
    );
    assert.equal(
      TRACEABILITY_AUDIT_VERDICTS.TRACE_COMPLIANCE_NOT_VERIFIABLE,
      "TRACE_COMPLIANCE_NOT_VERIFIABLE"
    );
  });

  it("preserves stage representation strengths model", () => {
    assert.equal(STAGE_REPRESENTATION_STRENGTHS.EXACT, "EXACT");
    assert.equal(STAGE_REPRESENTATION_STRENGTHS.DERIVED, "DERIVED");
    assert.equal(STAGE_REPRESENTATION_STRENGTHS.GROUPED, "GROUPED");
    assert.equal(STAGE_REPRESENTATION_STRENGTHS.NOT_REPRESENTED, "NOT_REPRESENTED");
  });

  it("preserves local principle audit states", () => {
    assert.equal(PRINCIPLE_AUDIT_STATES.SATISFIED, "SATISFIED");
    assert.equal(PRINCIPLE_AUDIT_STATES.VIOLATION, "VIOLATION");
    assert.equal(PRINCIPLE_AUDIT_STATES.NOT_VERIFIABLE, "NOT_VERIFIABLE");
    assert.equal(PRINCIPLE_AUDIT_STATES.DELEGATED, "DELEGATED");
  });
});
