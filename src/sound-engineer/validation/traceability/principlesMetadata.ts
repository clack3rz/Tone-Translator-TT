// src/sound-engineer/validation/traceability/principlesMetadata.ts
// Immutable local metadata for the 21 Principles of Sound Engineering Reasoning.
// Bound to frozen specification Phase 1C.5a v0.3c §3, Phase 1C.5f v0.1j §3, and Phase 1C.5h v0.1j Invariant 3.

import { deepFreeze } from "../../contracts/immutability";

/**
 * Audit strength classification for the 21 Principles.
 * Strictly reflects what WP-29 can truthfully evaluate from existing runtime contracts.
 */
export const PRINCIPLE_AUDIT_STRENGTHS = {
  /** Deterministic governance/sequence relationship can be proven from runtime fields */
  STRUCTURALLY_VERIFIABLE: "STRUCTURALLY_VERIFIABLE",

  /** WP-29 can prove required evidence is present, but cannot independently evaluate substantive judgement */
  EVIDENCE_PRESENT: "EVIDENCE_PRESENT",

  /** Substantive compliance is owned by upstream reasoning/review; WP-29 verifies only reference presence */
  DELEGATED_UPSTREAM: "DELEGATED_UPSTREAM",

  /** Current runtime trace lacks sufficient data to evaluate */
  NOT_VERIFIABLE: "NOT_VERIFIABLE",
} as const;

export type PrincipleAuditStrength =
  (typeof PRINCIPLE_AUDIT_STRENGTHS)[keyof typeof PRINCIPLE_AUDIT_STRENGTHS];

/**
 * Immutable metadata describing one of the 21 Principles.
 */
export interface PrincipleMetadata {
  /** Principle number: 1 through 21 */
  readonly number: number;

  /** Frozen verbatim title from Phase 1C.5a v0.3c */
  readonly title: string;

  /** Audit strength classification */
  readonly auditStrength: PrincipleAuditStrength;

  /** Operational governance interpretation from Phase 1C.5f v0.1j */
  readonly governanceInterpretation: string;

  /** Concrete fields / artifacts evaluated */
  readonly evidenceEvaluated: string;

  /** Explicit boundary notes on what WP-29 does and does NOT verify */
  readonly auditBoundaryNotes: string;
}

/**
 * The 21 frozen Principles of Sound Engineering Reasoning.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * These are immutable local descriptors. No global principle enum is created.
 * Principle numbers and titles are inherited verbatim from Phase 1C.5a and Phase 1C.5f.
 */
const PRINCIPLES_DATA: readonly PrincipleMetadata[] = [
  {
    number: 1,
    title: "Evidence Precedes Diagnosis",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
    governanceInterpretation:
      "Evidence records must precede diagnostic/decision records in sequence index and timestamp. An audit flags any decision lacking upstream evidence.",
    evidenceEvaluated:
      "Checkpoint layer sequence (EVIDENCE before ENGINEERING) and EngineeringDecisionRecord.evidenceReference.",
    auditBoundaryNotes:
      "Structurally verifiable: checks checkpoint timestamps, sequence order, and artifact reference match.",
  },
  {
    number: 2,
    title: "Observation Is Not Interpretation",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Descriptive physical acoustic observations must be classified separately from psychoacoustic inferences.",
    evidenceEvaluated:
      "EvidenceRecord.acousticCharacteristics containing structured descriptive properties (spectral, dynamic, distortion, spatial).",
    auditBoundaryNotes:
      "Evidence-presence check: verifies presence of descriptive measurement structure; does not re-analyze DSP spectral calculations.",
  },
  {
    number: 3,
    title: "Missing Evidence Is Not Negative Evidence",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Absence of evidence must be recorded explicitly as unobserved or missing; diagnostics must not treat missing evidence as proof of health.",
    evidenceEvaluated:
      "Checkpoint diagnostics and EvidenceRecord unobserved flags.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies missing data is not converted into affirmative compliance.",
  },
  {
    number: 4,
    title: "A Symptom Does Not Identify Its Cause",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Trace lineage must connect symptoms to causal mechanisms, not directly to interventions. Interventions must not be solution-first shortcuts.",
    evidenceEvaluated:
      "EngineeringDecisionRecord evidence reference and decision item purpose/intent/rationale.",
    auditBoundaryNotes:
      "Delegated upstream: EngineeringDecisionItem lacks an explicit diagnosisId foreign key. WP-29 verifies decision-level evidence linkage and non-empty rationale, but cannot prove sub-item causal decoupling.",
  },
  {
    number: 5,
    title: "Diagnosis Should Be Causal Where Evidence Permits",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Diagnostic records must capture causal hypotheses, mechanism pathways, and competing hypotheses.",
    evidenceEvaluated:
      "EngineeringDecisionRecord.overallObjective and decision item rationale.",
    auditBoundaryNotes:
      "Delegated upstream: acoustic correctness of diagnosis is a substantive sound-engineering judgement owned by Stages 04-07. WP-29 verifies evidence linkage and presence of rationale.",
  },
  {
    number: 6,
    title: "Competing Hypotheses Survive Until Evidence Justifies Narrowing Them",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Trace graph must preserve considered hypotheses and evidential basis for exclusion.",
    evidenceEvaluated:
      "EngineeringDecisionItem.dependencies and tradeOffs.",
    auditBoundaryNotes:
      "Delegated upstream: competing hypothesis deliberation is owned upstream by the reasoning engine.",
  },
  {
    number: 7,
    title: "Context Informs Reasoning but Does Not Prove Causation",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
    governanceInterpretation:
      "Metadata and user prompt priors must be isolated as contextual inputs rather than direct acoustic evidence.",
    evidenceEvaluated:
      "InputSnapshot artifact (INPUT layer) versus EvidenceRecord artifact (EVIDENCE layer).",
    auditBoundaryNotes:
      "Structurally verifiable: verifies context inputs are encapsulated in INPUT layer and distinct from measured acoustic evidence in EVIDENCE layer.",
  },
  {
    number: 8,
    title: "Engineering Intent Constrains the Solution",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Engineering requirements establish non-negotiable preservation bounds against which solutions are evaluated.",
    evidenceEvaluated:
      "EngineeringDecisionRecord.overallObjective and EngineeringDecisionItem.constraints.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies presence of explicit constraints in decisions.",
  },
  {
    number: 9,
    title: "Generate Alternatives When the Problem Admits Alternatives",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Trace must document alternatives considered and reasons for selection.",
    evidenceEvaluated:
      "EngineeringDecisionItem.tradeOffs and PlatformTranslationPlan.substitutions.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies trade-offs or substitutions are documented when multi-choice decisions exist.",
  },
  {
    number: 10,
    title: "Intervention Selection Follows Diagnosis",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Candidate interventions must link directly to authorized diagnosis records, not solution-first.",
    evidenceEvaluated:
      "EngineeringDecisionRecord.evidenceReference and decision item purpose/intent.",
    auditBoundaryNotes:
      "Delegated upstream: no individual intervention -> diagnosis foreign key exists. WP-29 checks record-level evidence linkage and structured decision fields.",
  },
  {
    number: 11,
    title: "Intervention Should Occur at the Causally Appropriate Point",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Trace must capture the signal chain locus of intervention (pre-gain, power amp, cab, post-effects).",
    evidenceEvaluated:
      "EngineeringDecisionItem.category (EngineeringDecisionCategory).",
    auditBoundaryNotes:
      "Delegated upstream: category proves WHERE in the signal chain an intervention occurred, but acoustic causal appropriateness is an engineering judgement.",
  },
  {
    number: 12,
    title: "Predict Consequences Before Acting",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
    governanceInterpretation:
      "Decisions and predicted consequences must be sealed before execution/translation boundary dispatch.",
    evidenceEvaluated:
      "Sequence index and completedAt timestamp of ENGINEERING checkpoint strictly preceding PLATFORM_TRANSLATION checkpoint.",
    auditBoundaryNotes:
      "Structurally verifiable: confirms engineering decisions were sealed before platform translation began.",
  },
  {
    number: 13,
    title: "Every Intervention Has Potential Trade-Offs",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Evaluated side effects, collateral risks, and accepted trade-offs must be documented.",
    evidenceEvaluated:
      "EngineeringDecisionItem.tradeOffs array on each decision item.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies tradeOffs array exists and is populated on active decisions.",
  },
  {
    number: 14,
    title: "Parsimony: Do Not Intervene Without Justified Engineering Purpose",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Audit reconstruction must evaluate whether the minimal necessary intervention was selected without gratuitous parameter shifts.",
    evidenceEvaluated:
      "EngineeringDecisionItem.purpose and rationale.",
    auditBoundaryNotes:
      "Delegated upstream: presence of purpose/rationale proves justification exists; mathematical minimality is an upstream judgement.",
  },
  {
    number: 15,
    title: "Platform Translation Operates Downstream of Engineering Reasoning",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
    governanceInterpretation:
      "Trace must enforce separation between platform-neutral design and target-platform parameter mapping.",
    evidenceEvaluated:
      "SemanticToneDesign checkpoint (SEMANTIC_DESIGN layer) and PlatformTranslationPlan checkpoint (PLATFORM_TRANSLATION layer).",
    auditBoundaryNotes:
      "Structurally verifiable: confirms SemanticToneDesign exists independently of PlatformTranslationPlan and translation references semantic design.",
  },
  {
    number: 16,
    title: "Reject Unacceptable Platform Compromises",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Where platform translation truncates or violates core requirements, the trace must record the compromise report.",
    evidenceEvaluated:
      "PlatformTranslationPlan.substitutions and unresolvedMappings.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies documented substitutions and unresolved mappings in translation plan.",
  },
  {
    number: 17,
    title: "Deterministic Code Validates Constraints; It Does Not Replace Judgement",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Algorithmic checks must have execution receipts in trace, but represented as constraint validators rather than replacements for acoustic evaluation.",
    evidenceEvaluated:
      "ValidationReport artifact from VALIDATION layer.",
    auditBoundaryNotes:
      "Delegated upstream: validation harness executes constraint checks; WP-29 verifies validation report presence.",
  },
  {
    number: 18,
    title: "Evaluate Outcomes Honestly Without Circular Justification",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.STRUCTURALLY_VERIFIABLE,
    governanceInterpretation:
      "Actual outcome evidence must derive strictly from empirical post-action audio, never from pre-action predictions.",
    evidenceEvaluated:
      "ValidationExecutionRecord input/output audio integrity refs and objective evidence measurements.",
    auditBoundaryNotes:
      "Structurally verifiable: confirms validation evidence evaluates empirical audio fixtures, not simulation models.",
  },
  {
    number: 19,
    title: "Capture Engineering Experience for Governed Review",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "Retrospective review records and quarantined candidate lessons must be immutably recorded.",
    evidenceEvaluated:
      "Trace diagnostic entries with WARNING/ERROR severities and review findings.",
    auditBoundaryNotes:
      "Evidence-presence check: verifies review findings and diagnostics are retained in trace summary.",
  },
  {
    number: 20,
    title: "The Deliberation Record Must Support Independent Retrospective Audit",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.EVIDENCE_PRESENT,
    governanceInterpretation:
      "The deliberation record must contain all information necessary for an independent human expert to reconstruct the entire reasoning lifecycle without conversational AI.",
    evidenceEvaluated:
      "Completeness of all 5 core reasoning layers (INPUT, EVIDENCE, ENGINEERING, SEMANTIC_DESIGN, PLATFORM_TRANSLATION) and lineage entries.",
    auditBoundaryNotes:
      "P20 Guardrail: Evidence-presence check only. WP-29 verifies that all required checkpoint envelopes, artifact references, and lineage entries are present and sealed. It does NOT independently certify that every substantive judgement was acoustically sufficient for a human expert.",
  },
  {
    number: 21,
    title: "Where Evidence Is Missing, Seek Discriminating Evidence Rather Than Guessing",
    auditStrength: PRINCIPLE_AUDIT_STRENGTHS.DELEGATED_UPSTREAM,
    governanceInterpretation:
      "Where uncertainty prevents definitive diagnosis or decision, the trace must record discriminating evidence requests rather than fabricating certainty.",
    evidenceEvaluated:
      "Diagnostics for unhandled ambiguity versus structured decision rationales.",
    auditBoundaryNotes:
      "Delegated upstream: ambiguity handling is governed during reasoning intake; WP-29 checks that no fatal unresolved ambiguity diagnostics were ignored.",
  },
];

/**
 * Immutable frozen collection of all 21 Principles metadata.
 */
export const FROZEN_PRINCIPLES_METADATA: readonly PrincipleMetadata[] =
  deepFreeze(PRINCIPLES_DATA);

/**
 * Lookup map keyed by principle number (1-21).
 */
const PRINCIPLES_BY_NUMBER: ReadonlyMap<number, PrincipleMetadata> = new Map(
  FROZEN_PRINCIPLES_METADATA.map((p) => [p.number, p])
);

/**
 * Retrieves metadata for a specific principle by number (1-21).
 */
export function getPrincipleMetadata(
  principleNumber: number
): PrincipleMetadata | undefined {
  return PRINCIPLES_BY_NUMBER.get(principleNumber);
}

/**
 * Returns all 21 principle metadata entries.
 */
export function getAllPrinciplesMetadata(): readonly PrincipleMetadata[] {
  return FROZEN_PRINCIPLES_METADATA;
}
