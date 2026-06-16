# DECISION — Stack: keep Next.js, or migrate to Vite? (Phase 1 gate)

## The fork
The five binding v0.2 specs head with **"Stack: React 19 + Vite + Supabase (Postgres, RLS, RPC),
Vercel."** The existing v0.1 app is **Next.js (App Router) + React + TypeScript + Tailwind + Supabase
(migrations 0001–0005, Model-B identity, RLS) + Vercel**, with ~694 passing unit tests and a
salvageable framework-agnostic `lib/` engine + component library.

## Recommendation (to be attacked): KEEP Next.js (App Router); satisfy every spec BEHAVIOR
Do NOT migrate to Vite. Treat Next.js **server actions / route handlers** as the server-side
grading + RPC boundary (calling Postgres `SECURITY DEFINER` RPCs where the spec wants RPC), keep
Supabase RLS as the authority, and meet every behavioral requirement the specs actually gate on:
- server-side grading, never trust client (SECURITY §9) — server actions / route handlers;
- RLS-on-everything + RPC with `assert_can_access_student` (SECURITY §8) — Postgres, stack-agnostic;
- <800ms loop + optimistic UI + async model updates (AI_ADAPTIVE §9) — achievable in Next (optimistic
  client state + fire-and-forget server mutation);
- one instrument visual system, rings, dark Focus canvas (STYLE_GUIDE) — React + CSS, stack-agnostic.

## Rationale
1. **Precedence:** GOAL.md non-negotiables > binding specs > Codex (PLAN.md). The GOAL non-negotiables
   (fast; no-slop; genuinely adaptive; real interactivity; one skin; compliance-built) are **all
   framework-agnostic** — none require Vite. The "Stack:" line is an implementation default in a doc
   header, not a behavioral non-negotiable.
2. **GOAL framing:** "**Transform the existing** v0.1 course," not "rebuild from scratch." A Next→Vite
   migration discards a working RLS/compliance spine + 694 tests + routing/auth/SSR for **zero
   behavioral gain** the specs require.
3. **PLAN.md tie-breaker:** "prefer the simpler, reversible option." Staying is simpler; the actual
   overhaul work (engine split, item remediation, diagnostic, visual system, compliance schema) is
   **stack-invariant** — identical effort either way. Migrating adds pure cost + regret.
4. **Next IS React 19 on Vercel with Supabase.** The only thing Vite buys is "no Next server layer" —
   but the spec WANTS a server layer (server-side grading, RPC, HMAC). Next's server actions are that
   layer.

## What this decision does NOT do
- It does not weaken any spec requirement; every SECURITY/AI_ADAPTIVE/STYLE_GUIDE behavior is still
  binding and will be built. Only the framework label changes from the spec's literal "Vite."
- If a concrete spec requirement is found that Next.js genuinely cannot satisfy (none identified),
  reopen.

## The question for review
Is keeping Next.js a defensible adjudication under PLAN.md's criteria, or does "binding specs name
Vite" override the GOAL-precedence + simpler/reversible argument? Name any spec requirement that
Next.js (App Router, server actions, Vercel, Supabase) genuinely **cannot** meet that Vite would.
Is there a hidden cost to keeping Next (e.g. server-action latency, RSC vs SPA optimistic-UI
friction, bundle, edge constraints) that makes the <800ms / "feels fast" non-negotiable harder than
on a Vite SPA? Rank the risk of staying vs migrating.
