# H1 — Post-practice Summary is not reconstructable — Fix Spec

## Problem (observed live, supabase mode)
After finishing a 5-problem practice set, clicking **"See your summary"** appeared not to
transition — the student landed on `/student/summary` showing the calm empty state
**"No session to summarize yet."** even though all attempts persisted in Postgres. A refresh
or direct nav to `/student/summary` shows the same empty state.

## Root cause (verified by reading the code)
`app/student/(shell)/summary/page.tsx` is correct in its happy path: it reconstructs the
whole summary from `?skill=<id>&session=<id>` query params (page.tsx:104-107) by reading the
student's attempts/updates and re-running the engine once. `PracticeFlow.next()` pushes those
params correctly (PracticeFlow.tsx:156). The defect is the **error handling**, not the data:

1. **Broad error-swallow (primary).** The entire body is wrapped in
   `try { ... } catch { return <NoSession /> }` (page.tsx:114-333). In supabase mode, ANY
   thrown error inside the reads (`getRepository`, `getStudent`, `getSkillStates`,
   `listAttempts`, `listMasteryUpdates`) or the engine compute (`computeMasteryAll`,
   `recommend`) renders the SAME "No session to summarize yet." empty state — indistinguishable
   from a genuinely empty session. This is what was hit live: the button navigated, the page
   threw, the catch masked it as "no session." It is also untestable/undiagnosable (no log).
2. **No param-less recovery.** A bare `/student/summary` (refresh after the params are gone,
   or a deep link) returns NoSession at page.tsx:107 because `skillId`/`sessionId` are absent —
   even though the student's most recent session is fully reconstructable from persisted rows.

## Design (best solution)
Three distinct, honest terminal states instead of one catch-all. **No engine/evidence/RLS/SQL
change** — display + error-handling + a read-only "latest session" lookup only.

### D1 — Separate the failure modes (remove the silent swallow)
Refactor the page so the three outcomes are distinct:
- **`NoSession` (legit empty):** student has zero attempts for the resolved session, OR truly
  no session can be resolved. Keep today's calm copy.
- **`SummaryUnavailable` (load error):** a repo read or engine compute threw. Catch ONLY around
  the data+engine block; on throw, `console.error` server-side (for diagnosis) and render a
  DISTINCT calm panel: heading "We couldn't load your summary right now.", body "Your work is
  saved — this is just a display hiccup. Try again in a moment." + a "Try again" link (re-nav to
  the same URL) and a quiet "Back to home". NEVER the misleading "no session" copy; NEVER a raw
  500. pee-wee directs exact copy/treatment.
- **Happy path:** unchanged.
Implementation note: the `redirect()`/`notFound()` family throws control-flow exceptions — this
page uses neither, so a plain try/catch around the data block is safe. Keep the catch SCOPED to
the data+engine block, not the JSX render.

### D2 — Param-less recovery (reconstruct the latest session)
When `sessionId` is absent, derive it from persisted rows so refresh/direct-nav works:
- Read `listAttempts(studentId)`. If empty → `NoSession`.
- The **most recent session** = the `sessionId` of the latest attempt (attempts are returned
  createdAt asc, ties by id asc, per A3Repository.listAttempts contract — take the last).
- When `skillId` is absent, derive it as the **practiced skill of that session**: among that
  session's attempts, the `skillId` of the last attempt whose `source !== "retention"` (retention
  probes carry a different mastered-node skillId; the session's own skill is the practice source).
  The route that creates the session is `/practice/[skillId]`, so non-retention attempts share
  that one skillId. Fall back to the last attempt's skillId if all were retention (degenerate).
- If `skillId` is present but `sessionId` is absent, still resolve the latest session as above
  but keep the requested skillId.
- This is DISPLAY-ONLY provenance scoping; it never feeds mastery/phase/routing (the engine
  still runs once over the student's real skill states, exactly as today).

### D3 — Keep the navigation as-is
`PracticeFlow.next()` (router.push with both params) is correct and stays. The perceived
"didn't transition" was the errored load resolving to NoSession; D1 fixes the symptom. Add no
new client logic.

## Out of scope / deferred
- No persisted summary snapshot (the reconstruct-from-rows design is intentional, page.tsx:1-8).
- No change to what the summary shows or how the engine computes it.
- Multi-skill sessions: today a practice session is single-skill by route; D2's derivation is
  robust to retention probes mixed in. If true multi-skill sessions are ever introduced, the
  "primary skill" heuristic may need revisiting — noted, not built.

## Tests
- New PURE helper `resolveLatestSession(attempts): { sessionId, skillId } | null` extracted so it
  is unit-testable (memory-mode friendly): empty → null; single session → that id + its practice
  skill; retention probe mixed in → picks the practice skill, not the probe's; multiple sessions →
  the most recent. Add unit tests for these cases.
- Memory-mode behavior unchanged for the param'd happy path (existing manual coverage).
- Supabase load-error path is live-only (verify via chrome-devtools after implement).
- Full unit suite stays green.

## Invariants
- Engine/mastery/router/checkAnswer/evidence BYTE-UNCHANGED. No new dependency. No SQL/RLS.
- Summary remains reconstructed from immutable rows; no snapshot stored.
- The fix only ADDS a recovery path and SPLITS one error state into three honest states.

## Gates
- **pee-wee:** the new `SummaryUnavailable` state (calm, premium, no dead-end, distinct from the
  empty state) + the "Try again" affordance.
- **mr-gates:** the scoped catch (no silent swallow; server-side log; no raw 500), the
  `resolveLatestSession` derivation correctness (latest-session + practice-skill heuristic,
  retention-probe handling), and that nothing touches engine/evidence/RLS.
- **mr-kahn:** confirm that showing the most-recent session on a param-less nav is pedagogically
  acceptable (display provenance only; no credited-vs-practiced or mastery semantics change).

---

## REVISION (codexreview round 1 — BINDING; supersedes conflicting text above)
informed + cold reviewers, all concerns accepted. Implement to this section.

### R1 — Testable seam (concern: load-error-untested / live-only-verification)
Extract two PURE helpers into `lib/session-helpers.ts` (already the home of deriveVerdict etc.):
- `resolveLatestSession(attempts, skillId?): { sessionId: string; skillId: string } | null`
- `loadSummary(...)` may stay in the page; the unit-tested surface is `resolveLatestSession`.
  Additionally extract `classifySummary` so the page renders a discriminated union
  `{ kind: "ok"; ... } | { kind: "empty" } | { kind: "error" }`. Unit-test: throwing repo →
  "error"; no attempts → "empty"; happy → "ok"; plus the resolveLatestSession cases below.

### R2 — resolveLatestSession contract (concerns: ordering-contract, skill-heuristic-premise)
- **Defensive ordering:** the helper SORTS the input by `createdAt` asc then `id` asc itself —
  it does NOT trust caller/list order. "Most recent" = last after its own sort.
- **Retention classification:** treat ONLY `source === "retention"` as a probe; missing/unknown
  `source` counts as practice.
- **No skillId arg:** most-recent session = sessionId of the latest attempt overall; its skillId
  = the latest NON-retention attempt in that session; if a session has multiple distinct
  non-retention skillIds, pick the latest non-retention attempt's skillId (deterministic); if all
  retention, fall back to the latest attempt's skillId.
- **skillId arg present (concern: skill-only-mismatch):** find the most-recent session that
  CONTAINS a non-retention attempt for that skillId; return that sessionId + the requested skillId.
  If no session contains that skill → return null (→ NoSession, never a zero-attempt mismatch).
- Returns null on empty input.

### R3 — Authorization precondition (concern: latest-session-authorization — was blocking)
`studentId` is the authenticated principal from `getCurrentStudentId()`. `resolveLatestSession`
derives `sessionId` SOLELY from rows returned by `listAttempts(studentId)` — i.e. that student's
OWN attempts (Supabase RLS `student_id = current_student_id()` double-enforces at the row level).
The resolved `sessionId` therefore can never reference another student's session. No revalidation
needed beyond using only the student's own rows; the spec asserts this invariant explicitly.

### R4 — Error taxonomy (concern: error-taxonomy)
- **NoSession** (EXPECTED, not an error): `!studentId`; no resolvable session; resolved session
  has 0 attempts; node not found. Calm "No session to summarize yet."
- **SummaryUnavailable** (CAUGHT error): any thrown error from a repo read or engine compute.
  `console.error` server-side; render the distinct "couldn't load" panel. NEVER the empty copy.
- The page uses no `redirect()`/`notFound()`, so the scoped try/catch cannot swallow Next.js
  control-flow exceptions. Catch wraps ONLY the data+engine block, not JSX.
