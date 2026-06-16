# phase-6-review.md — Adversarial review of the Diagnostic plan (v1)

Gates: **mr-kahn (REJECT)** — academic/standards/accreditation; **mr-gates (APPROVE WITH CHANGES)** —
architecture. Codex adversarial pass run on the CORRECTED v2 (below) per the loop. mr-kahn's REJECT is
factual (the high-impact CCSS list mismatches the real 74-node graph) and blocks implementation until
fixed — revise-and-proceed (first REJECT; two on the same proposal would escalate to Matt).

## mr-kahn (REJECT → fix the 10 items, then APPROVE)
1. **[REJECT root] High-impact by CCSS-intersection is wrong against the real graph.** Codes are
   many-to-many and not aligned to §3a's named-bridge taxonomy. Phantom codes (`6.EE.B.6`,
   `6.NS.B.3`, bare `6.EE.A.2`); misattributions (`6.EE.A.1`=Exponents not Order-of-Ops;
   `8.F.B.4`=Slope-from-2-pts not table↔graph↔rule). **Use a curated, blessed `HIGH_IMPACT_NODE_IDS`:**
   | §3a bridge | node id | CCSS |
   |---|---|---|
   | fraction/decimal/rational ops | ALG-F02 | 7.NS.A.3 |
   | distributive | ALG-F08 | 7.EE.A.1 |
   | order of operations | ALG-F03 | 6.EE.A.2c |
   | two-step equations | ALG-E02 | 7.EE.B.4a |
   | multi-step | ALG-E03 | 8.EE.C.7b |
   | variables-both-sides | ALG-E04 | 8.EE.C.7b |
   | slope/rate | ALG-L05 | 8.EE.B.5, F-IF.B.6 |
   | table↔graph↔rule | ALG-L07 | 8.F.A.2 |
   | verbal→equation | ALG-E13 | A-CED.A.1 |
2. **Coverage gaps — flag, don't fake:** no dedicated ordered-pair-as-solution node; decimal/
   fraction/rational ops collapsed into one node (ALG-F02) vs §2's split → v1.5.
3. Add ALG-F03 + ALG-E03; correct two-step→ALG-E02, table↔rule→ALG-L07.
4. **≥2 DIRECT evidence for any high-impact READY**; 1 direct → UNCERTAIN (the "queue ONE probe"
   wording risked a 1-direct READY, violating §3a/§7).
5. Implement or EXPLICITLY defer the §1 "1 hard constructed-response" READY branch + foundational-fail
   NEEDS_WORK branch — don't silently narrow.
6. Use a non-inflating inferred prior (Beta(1,1) or Beta(1,2)); surface prior/guess/slip/threshold
   constants for Matt's threshold checkpoint.
7. maxItems=40 is sim-PROVISIONAL; §8 sim validates or triggers the §4 split-session path.
8. Sim must report on the **high-impact subset** specifically + a **false-READY rate** on high-impact +
   simulate the §3a procedural-over-brittle pattern (correct dependents over a true prereq gap).
9. **Integrity:** diagnostic-exposed P3 items must be excluded from that student's later transfer
   battery, or the §3/§11 "delayed unseen" lock is contaminated (same items reused).
10. **Accreditation line (§12):** diagnostic-credited nodes must seed as provisional/needs_review,
    NEVER course-`mastered`; entryFrontier must carry the provisional flag for inferred prereqs.

## mr-gates (APPROVE WITH CHANGES)
- **[BLOCKER] Stop rule inside `nextItem`** (return null) so client+server compute identical session
  length from the same pure replay — else `persistDiagnostic`'s sequence check FAILs mid-session.
- **[BLOCKER] Sim cannot run under bare `node`** (engine chain uses dir imports + `@/` alias →
  `ERR_UNSUPPORTED_DIR_IMPORT`). Run it through the **vitest resolver** (a report `.test.ts`); seed RNG
  deterministically (small LCG). (tsx = new dep = Matt checkpoint; rejected for this phase.)
- High-impact corroboration via **widening the existing `needsConfirm`** in `processAnswer`, NOT a new
  pass in `finishDiagnostic` (keep finish a pure read-out); expect + flag changed test expectations.
- **One label type:** move the union into `types/diagnostic.ts` as `DiagnosticPlacementLabel`;
  `cold-start.ts` imports it (underscore form canonical).
- **Determinism hygiene:** posterior/label code iterates `graph.nodes`/sorted ids, never Map/Set order.
- **UI remount:** key `ItemScreen` on a per-item ordinal (not skillId) since corroboration can re-serve.
- **Seed firewall:** `demonstrated[]`/`creditFromDiagnostic` stays the ONLY path to node_mastery; derive
  remediation read-side from the immutable log (no `diag_results` write this phase). Test:
  INFERRED_READY/UNCERTAIN emit no MasteryUpdate.
- Determinism PASS, type-extension safe for all 3 DiagnosticResult consumers, perf at 40 items fine.

Most-fatal (consensus): the wrong high-impact set (mr-kahn #1) — every §3a guarantee keys off it.
