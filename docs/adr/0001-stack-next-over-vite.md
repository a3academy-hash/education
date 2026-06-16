# ADR-0001 — Adopt Next.js (App Router) as the React 19 host; do NOT migrate to Vite

**Status:** ACCEPTED (2026-06-15). **Decider:** Claude (autonomous chair, PLAN.md). **Review:**
`/codexreview` informed+cold at `.codexreview/reviews/2026-06-15-stack-decision/`.

## Context
The five binding v0.2 specs (`new_plan/*.md`) head with "Stack: React 19 + **Vite** + Supabase
(Postgres, RLS, RPC), Vercel." The existing v0.1 app is **Next.js (App Router)** + React + Supabase
(migrations 0001–0005, Model-B identity, RLS) + Vercel, with ~694 passing tests and a framework-
neutral `lib/` engine. GOAL.md mandates "**transform the existing** v0.1 course," and PLAN.md sets
precedence: **GOAL non-negotiables > binding specs > Codex**, tie-break "simpler, reversible."

## Decision
**Keep Next.js (App Router).** The codexreview informed (repo-aware) reviewer found **no spec
requirement that Next.js cannot satisfy that Vite would** ("No spec requirement found that Next.js
App Router cannot technically meet while Vite can. Staying on Next is lower implementation risk than
a migration."). The "Stack:" header is an implementation default subordinate to the GOAL non-
negotiables, which are behavioral and framework-agnostic. Migrating discards a working RLS/compliance
spine + 694 tests for zero behavioral gain.

## Governance (resolves cold `binding-stack` BLOCKING)
This ADR is the formal adjudication amending the specs' stack line. The three spec headers that name
Vite carry a non-destructive pointer to this ADR. The substance of those specs is unchanged; only the
framework label is adjudicated. Any future "why not Vite?" is answered here.

## Binding architecture rules adopted from the review (conditions of this decision)
1. **RPC boundary (resolves rpc-equivalence/rpc-boundary-blur):** Next server actions / route
   handlers are **thin HTTP+auth wrappers only**. Every privileged mutation (grade, attempt write,
   mastery/retention update, consent, export, delete) is a **Postgres `SECURITY DEFINER` RPC** that
   takes an explicit `student_id`, calls `assert_can_access_student(auth.uid(), student_id)` FIRST,
   pins `search_path`, and uses no dynamic SQL on user input (SECURITY §8). The action authenticates,
   then calls the RPC; it is NOT itself the security boundary. (This is *more* spec-faithful than the
   current direct-repo-write path and closes AUDIT D7.)
2. **Domain logic stays framework-neutral (resolves reversible-claim/effort-equivalence):** all
   engine/domain logic lives in `lib/` (pure TS, already the pattern); App Router code only
   orchestrates. This preserves portability (a future Vite move would re-wire only `app/`) and keeps
   the reversibility tie-breaker honest.
3. **Latency budget (resolves perf-premise):** the submit loop splits **perceived** (optimistic
   client render, target <16ms to first feedback paint) from **authoritative** (server grade RPC,
   target <300ms; full model/retention update async + non-blocking). End-to-end <800ms is the
   non-negotiable, **measured under load in Phase 4** (Vercel runtime placement + Supabase RTT +
   cold-start + async-failure fallback). Server-side grading stays in the loop but does not block the
   optimistic paint.

## Portability inventory (effort-equivalence)
Portable as-is: `lib/` (pure TS engine), `data/`, `supabase/migrations/`, `types/`, most
`components/` (React; minor Next-import tweaks). Next-specific (the only re-do under a hypothetical
Vite move): `app/` routing, server actions, `middleware.ts` auth. => most overhaul work is
stack-invariant, which is itself an argument for staying.

## Consequences
- No migration. Phase 1 builds the SECURITY §2 schema + the RPC boundary + the fast-interaction
  skeleton on Next. Reversible by construction (rule 2).
- Reopen only if a concrete spec behavior is found that Next genuinely cannot meet (none identified).
