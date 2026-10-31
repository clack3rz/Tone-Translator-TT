# D-01 fresh independent post-merge remote audit

Recorded 1 November 2026 (Sydney). Reviewer: Codex /root in this fresh audit run, separate from the prior PR #6 publication. Remote operations were strictly read-only. No repository mutations occurred during phase 1.

Result: PASS for repository integrity, integration, exact evidence identities and the explicit Owner alternative provenance basis. This is not fresh original-source authentication. D-01 remains HOLD pending separate final closure filing, independent review and authorized integration.

Method: live GitHub main ref, Git commit metadata, complete non-truncated recursive trees, individually fetched base64 contents decoded without normalization, SHA-256 and Git blob SHA-1 recomputation. Main was pinned at both ends of the main audit to daef9236ae20ae45736e95393ebd1b7e2d37ba3b. PR #6 is closed and merged. The merge tree equals its reviewed head tree. All 830 inherited path/mode/type/blob entries are unchanged; exactly the two authorized 100644 blobs were added (832 total).

Authority assessment: the acceptance JSON identifies original Owner message 4e841ce7-bdbc-4bd7-821b-11ca773414e0 and conditional authority to record closure after exact filing and verification. The integrated owner-provenance-sufficiency-determination.md records Owner message 76647cf8-b4d6-4b8f-a2b7-130b62531881 accepting the original approval, its filed quotation, reported earlier authentication and subsequent reconciliation as sufficient for this D-01 decision. The present user instruction expressly confirms that alternative provenance basis. Fresh read_thread for Validation Plan returned a bounded history with no older cursor; it did not return the original approval or complete prior authenticated review. Neither was freshly authenticated. Prior authentication and quote reconciliation remain attributed reports. PASS is confined to the explicit alternative provenance determination, not literal satisfaction of unavailable source retrieval. No content from missing reports is invented.

The current retrieved history includes the exact Owner PR #6 merge authorization (message 4bcf2848-d808-4df3-b1cf-e686d6792b46) and conditional preparation request (message 133382d7-0da1-4277-b909-9b661a4d46e3). Conversation provenance and stated Owner role are not independent identity attestation or cryptographic Owner signature.

Accepted authority remains Architecture v0.1k and Build Plan v0.1i at the hashes below for future governance interpretation only. The _PROPOSED filenames remain unchanged. Frozen v0.1j/v0.1h, inherited historical declarations, acceptance JSON, checklist, publication records and upstream constitutional authority remain unchanged. The later Owner decision supplies the narrow provenance determination without rewriting historical records.

No empirical UAT acceptance/PASS, implementation completion, tests, code changes, baseline/candidate freeze, Gate 8, Production authorization, deployment, cutover, routing change or Gemini execution. This audit does not itself close D-01 or authorize a merge.

## Exact remote audit evidence

```json
{
  "reviewer": "Codex /root, fresh read-only remote post-merge audit; not PR #6 publisher in this run",
  "started_utc": "2026-10-31T23:01:49.518383+00:00",
  "pinned_commit": "daef9236ae20ae45736e95393ebd1b7e2d37ba3b",
  "parents": [
    "81fd0f6dd8d8506d5fe890b9bd2ed0f474e315b4",
    "8e43cc6301f5a77d8885da85d184aae6f77b56f8"
  ],
  "root_tree": "2431c9548faf86e76466ba02570f9591e4d068f5",
  "inherited_files_unchanged": 830,
  "total_files": 832,
  "additions": {
    "governance/decisions/EV-UAT-ST0-D01/owner-provenance-sufficiency-determination.md": {
      "mode": "100644",
      "type": "blob",
      "sha": "15584985902b43d98e12481861a0d468afd7c356"
    },
    "governance/decisions/EV-UAT-ST0-D01/proposed-closure-determination.md": {
      "mode": "100644",
      "type": "blob",
      "sha": "57e7bb9b75f94b209c526d35db465de7e93cade4"
    }
  },
  "merge_tree_equals_reviewed_head": true,
  "identities": [
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/owner-provenance-sufficiency-determination.md",
      "bytes": 4623,
      "sha256": "c3f1519e939f7be0c5366b59a896e82e08d7e981e6132a7fb619c5b4611f6df6",
      "git_blob_sha1": "15584985902b43d98e12481861a0d468afd7c356"
    },
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/proposed-closure-determination.md",
      "bytes": 9449,
      "sha256": "5e8a6a50fc242fdaae33a14f86169fc062f1217777f73d9851aedb28ceb1d2d2",
      "git_blob_sha1": "57e7bb9b75f94b209c526d35db465de7e93cade4"
    },
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1k_PROPOSED.txt",
      "bytes": 243181,
      "sha256": "315cb18538be96ead9b901987a80b3deaebfcf91a4e0d7fbb747a17c0ba0c082",
      "git_blob_sha1": "9f49e3e93c2d5d6c56dcab632efaaf932e9de0a5"
    },
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1i_PROPOSED.txt",
      "bytes": 169672,
      "sha256": "455533ee73e50de91238b176bd3a045a724a1017966d50943b41051dd4d181b5",
      "git_blob_sha1": "baf2b3cf3deabf6dfdd6b47d34878a3943a55657"
    },
    {
      "path": "TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt",
      "bytes": 241844,
      "sha256": "24b20ad34781758896684e5e9b437102654f6706c9551a6681e3242292a8040d",
      "git_blob_sha1": "9ec84527ee227abc2c60cf38637d2e6f59e0df7f"
    },
    {
      "path": "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1h.txt",
      "bytes": 165021,
      "sha256": "9b02834b23d2ef2e4df5e4ca5c267262053056cc5f77cef25abfcbc16e29bca3",
      "git_blob_sha1": "a322cfb45c05fec5bff3cc812bbd2902f4792d58"
    },
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/final-authority-transition-acceptance.json",
      "bytes": 8125,
      "sha256": "341cdfe0b28ebf379de5a840cd0179dd5f274069f838c90977d40385fa45f197",
      "git_blob_sha1": "0d86500058289f350470cf077dcbeab93a9eccfc"
    }
  ],
  "pr6": {
    "state": "closed",
    "merged": true,
    "merge_commit_sha": "daef9236ae20ae45736e95393ebd1b7e2d37ba3b",
    "changed_files": 2
  },
  "integrity_result": "PASS",
  "completed_utc": "2026-10-31T23:01:57.195698+00:00"
}

{
  "checked_utc": "2026-10-31T23:02:48.861655+00:00",
  "result": "PASS",
  "original_files_preserved": 824,
  "publication_files_preserved": 828,
  "publication_merge": "ce4f9a614d147f1095fde1d551cfdbd7c8ff42d4",
  "publication_parents": [
    "6bcb4bd28b1922beb77cbf654f50e14417d7d5e6",
    "67dc097b6cf654e2509e0a43c33e1d352d03c87c"
  ],
  "publication_root_tree": "2d9f70601ffd11e0c7d4b1748e818412d698ee38",
  "publication_merged_at": "2026-10-31T12:36:34Z",
  "documents": [
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1k_PROPOSED.txt",
      "publication_sha256": "315cb18538be96ead9b901987a80b3deaebfcf91a4e0d7fbb747a17c0ba0c082"
    },
    {
      "path": "governance/decisions/EV-UAT-ST0-D01/TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1i_PROPOSED.txt",
      "publication_sha256": "455533ee73e50de91238b176bd3a045a724a1017966d50943b41051dd4d181b5"
    },
    {
      "path": "TT_Empirical_Validation_UAT_Verification_and_Production_Readiness_Architecture_v0.1j.txt",
      "publication_sha256": "24b20ad34781758896684e5e9b437102654f6706c9551a6681e3242292a8040d"
    },
    {
      "path": "TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1h.txt",
      "publication_sha256": "9b02834b23d2ef2e4df5e4ca5c267262053056cc5f77cef25abfcbc16e29bca3"
    }
  ]
}
```

The two consecutive JSON objects above are the main-merge audit and historical-publication audit respectively. Audit timestamps are UTC; 2026-10-31 23:01:57 UTC is 2026-11-01 10:01:57 Sydney (UTC+11). The historical check independently fetched the four document contents at publication merge ce4f9a614d147f1095fde1d551cfdbd7c8ff42d4, confirmed publication parents/tree and PR #4, and compared preserved originals against approved base 6bcb4bd28b1922beb77cbf654f50e14417d7d5e6.
