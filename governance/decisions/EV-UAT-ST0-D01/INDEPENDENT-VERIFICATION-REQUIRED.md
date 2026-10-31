# EV-UAT Stage 0 D-01 — independent read-only verification required

D-01 remains **HOLD**. Owner authority transition is **APPROVED** for the exact two hash-bound documents. This filing does not declare closure and must not be automatically merged.

## Controlled evidence

Read `final-authority-transition-acceptance.json` in this directory. It contains the precise original Owner message, source conversation and message IDs, authority relationship, immutable document identities, publication timeline and excluded actions. The source was retrieved directly from the original conversation, not inferred from assistant text.

The Owner approval is effective as the stated decision on future governance interpretation. Filing/integration and independent verification remain administrative conditions for a later D-01 closure record. Branch publication alone does not establish completed filing on main.

## Independent audit procedure

An independent reviewer, separate from the evidence publisher, must perform a fresh read-only audit. Do not rely on the publisher's report or local copies as proof.

1. Retrieve the original user message `4e841ce7-bdbc-4bd7-821b-11ca773414e0` from conversation `6adb2ab8-c7b4-83ec-a884-b5db0cedce21` (Validation Plan). Compare the complete quote exactly. The source's turn-start timestamp is provenance metadata, not a separate signed decision timestamp.
2. Resolve the governance PR head to its full immutable commit SHA. Retrieve that commit and tree and both new evidence files at that SHA. Recompute their byte lengths, SHA-256 and Git blob identities. Pin the audit to those identities and the actual PR/base/head references. A record cannot include its own containing commit hash without circularity; obtain that hash from GitHub, not a floating branch name.
3. Compare the full governance head tree against pinned filing base `ce4f9a614d147f1095fde1d551cfdbd7c8ff42d4`. Expect exactly two additions in this directory: this checklist and the final acceptance JSON. Every existing blob path, type, mode and identity must remain unchanged. Confirm no rename, removal or normalization of either `_PROPOSED.txt` artifact.
4. Fetch each of the four document contents individually as base64 at the pinned publication merge and the governance head. Decode without text/newline normalization. Recompute SHA-256 and Git blob SHA-1 with the Git `blob <byte-length> NUL` prefix; compare against the JSON identities. Verify predecessors against approved base `6bcb4bd28b1922beb77cbf654f50e14417d7d5e6`.
5. Inspect publication PR #4, its actual merge commit, ordered parents, root tree and timestamps. Distinguish original controlled publication, later normal merge, reported post-merge audit, explicit Owner authority decision, and this later evidence filing. Historical false authority flags remain historical; the later Owner decision explicitly authorizes future interpretation.
6. Confirm new authority applies only to Architecture v0.1k and Build Plan v0.1i at the specified hashes. Frozen v0.1j and v0.1h remain immutable historical records. Inherited freeze/adoption and proposal declarations do not override the later Owner decision. No new baseline freeze or upstream authority expansion follows.
7. Confirm D-01 closure is conditional, independent verification is pending, no empirical UAT acceptance/PASS, implementation completion, baseline freeze, Gate 8 or Production authorization is asserted, and no automatic merge or unilateral closure is enabled.
8. Produce a read-only audit result with reviewer identity, UTC/Sydney timestamp, full evidence head/base/merge commit refs, file hashes, source message ID, scope findings, discrepancies and PASS/FAIL. Return the report for separate controlled filing; the audit itself does not mutate state or close D-01.

## After the independent audit

If the pre-integration audit passes, seek or follow explicit governed merge authorization; this filing does not authorize a merge. Following any authorized integration, independently verify the actual main merge commit and exact filed evidence again. Only after the filing and independent verification conditions are satisfied may a separate controlled D-01 closure record cite the Owner approval, acceptance evidence commit and audit report. If bytes, refs or scope change, keep HOLD and repeat the affected checks.

No code changes or tests are part of this activity.
