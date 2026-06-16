# Stack-decision dossier

## Evidence
- Specs name Vite: e.g. new_plan/CLAUDE.md:5 "Stack: React 19 + Vite + Supabase (Postgres, RLS,
  RPC), Vercel." Same line in DIAGNOSTIC.md:6, SECURITY_DB_REPORTING.md:5.
- Precedence rule: new_plan/PLAN.md ADJUDICATION CRITERIA — "binding specs win over Codex... GOAL.md
  non-negotiables win over everything"; tie-breakers "prefer the specs' implied direction and the
  simpler, reversible option."
- GOAL framing: new_plan/GOAL.md:12 "Transform the existing v0.1 course ... into a best-in-class
  adaptive Algebra 1 course," and the non-negotiables list (fast / no-slop / adaptive / interactive /
  one-skin / compliance) — none mention a framework.
- Current stack: package.json (Next.js + React + Tailwind), app/ (App Router, server actions in
  app/student/(shell)/*/actions.ts, middleware.ts auth), supabase/migrations/0001-0005, lib/ engine
  (framework-agnostic TS), 694 passing tests (vitest).
- The audit (AUDIT.md D1) classified all overhaul work except D2-arch + build tooling as
  stack-INVARIANT.

## Why this is a "big decision" requiring review
It gates Phase 1+ and is irreversible-ish (a migration, once started, is costly to undo). Per the
user's directive, all big decisions go through codexreview before proceeding.

## What I ruled out
- "Migrate to Vite because the spec says so" — rejected pending review: it discards a working
  compliance spine + tests for no behavioral gain, against the GOAL-precedence + simpler/reversible
  tiebreakers. But the cold reviewer should test whether spec-literalism should win anyway.
