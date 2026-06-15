# H1 dossier — evidence gathered

## summary/page.tsx — the swallow + param gate
- Header comment (lines 1-8): "Before/after is RECONSTRUCTED from the immutable update rows …
  no snapshot is stored." → reconstruct-from-rows is intentional; a stored snapshot is out.
- `searchParams: Promise<{ skill?: string; session?: string }>` (lines 100-105).
- `const { skill: skillId, session: sessionId } = await searchParams;` (line 105).
- `const studentId = await getCurrentStudentId();` (line 106).
- `if (!studentId || !skillId || !sessionId) return <NoSession />;` (line 107) ← param-less nav
  dead-ends here even when rows exist.
- `try {` (line 114) … the WHOLE data+engine+JSX block … `} catch { return <NoSession />; }`
  (lines 331-333) ← the broad swallow. Every read/engine error collapses to the empty state.
- Reads: `repo.getStudent` (116-117), `Promise.all([getGraph, getSkillStates, listAttempts,
  listMasteryUpdates])` (118-123), `diagnosticCreditedSkills(allUpdates)` (124).
- Session scoping: `allAttempts.filter(a => a.sessionId === sessionId)` (127);
  `if (sessionAttempts.length === 0) return <NoSession />;` (128).
- Engine once: `computeMasteryAll` (138), `recommend` (139). Then verdict/stat/firmUp/JSX.

## PracticeFlow.tsx — navigation is correct (not the bug)
- `const next = () => { if (isLast) { router.push(
  \`/student/summary?skill=${encodeURIComponent(skillId)}&session=${sessionId}\`); return; } … }`
  (lines 154-161). Both params are passed. "See your summary" button calls `onNext` (lines
  567-573 primary; 575-579 quiet on a miss).
- `sessionId` is a prop into PracticeFlow (PracticeFlowProps, line 92) — created upstream in the
  practice route's page.tsx and threaded through; evidence writes reference it (submit at 128-140).

## Attempt shape / ordering (for the D2 derivation)
- `A3Repository.listAttempts(studentId, skillId?)` doc: "Deterministic order: createdAt
  ascending, ties broken by id ascending." (types/repository.ts:56-57) → the LAST element is the
  most recent attempt → its sessionId = most recent session.
- StudentAttempt carries `sessionId`, `skillId`, and `source` ("practice" | "retention") —
  retention probes carry their OWN mastered-node skillId (ServedItem doc, PracticeFlow.tsx:54-63;
  submit threads `skillId: item.skillId ?? skillId` and `source: item.source ?? "practice"`,
  lines 131/139). So within one session the practice skill = the skillId on non-retention
  attempts.

## What I ruled out
- A client routing bug in `next()` — the push is well-formed with both params; ruled out.
- A persisted-snapshot approach — explicitly counter to the page's design (lines 1-8); the data
  is already reconstructable, so the only real defects are (a) the swallow and (b) no param-less
  recovery.
- Touching the engine/evidence — the summary is a read+display surface; no mastery/routing change
  is needed or wanted.
