# Phase 0 audit-methodology — dossier

This is a PLAN/methodology review, not code. The plan under review is the AUDIT methodology in
phases/phase-0-plan.md. The binding specs live in new_plan/ (GOAL.md, PLAN.md, CLAUDE.md,
DIAGNOSTIC.md, AI_ADAPTIVE.md, STYLE_GUIDE.md, SECURITY_DB_REPORTING.md) — read them for what a
complete audit must cover.

Context: this is Phase 0 of a self-driving full overhaul (PLAN.md). Phase 0's only deliverable is
AUDIT.md — a gap report (current state vs spec, severity per domain). No code changes in Phase 0.
The current app is Next.js (App Router) + Supabase; the specs name React 19 + Vite + Supabase. The
methodology DEFERS the stack decision to Phase 1 (to be adjudicated via codexreview there).

The 7 audit domains: (1) stack/architecture, (2) latency vs <800ms, (3) item bank dedup/solver/
slop/tagging, (4) interactivity/atoms vs click-through, (5) adaptivity reality vs AI_ADAPTIVE §5-7,
(6) visual/contrast/register vs STYLE_GUIDE, (7) schema/RLS/identity/data-class vs SECURITY.

Review question: does this methodology have a blind spot that would let a fatal v0.1 failure (slow/
clunky, fake-adaptive, slop+dups, weak interactivity, or a compliance/RLS hole) survive into the
overhaul? Is any binding-spec dimension unaudited? Is deferring the stack decision to Phase 1 sound?
