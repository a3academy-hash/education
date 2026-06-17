# phase-7-decisions.md — Autonomous adjudication

All four plan reviewers (mr-kahn, mr-gates, pee-wee, Codex informed+cold) returned APPROVE WITH
CHANGES; every concern ADOPTED into `phase-7-plan.md` §V2 (R1–R13). One rebuttal. The full
disposition table is in `phase-7-review.md` (the convergent-findings list) and the codexreview
adjudication at `.codexreview/reviews/2026-06-16-phase7-reporting/round-1.claude.json`. Diff-review
dispositions at `round-1.diff.claude.json`. Summary:

- **ADOPT (load-bearing):** locked-from-MasteryUpdate-provenance (not `status`); credit-bearing
  denominator via `lib/transcript`; FERPA "projected grade" labeling + creditEligible gating;
  n≥5 cohort-only suppression in the builder (single-student + coach-own-roster exempt); memory-mode
  anonymize-in-place erase + export-first-in-action + no-PII audit; server-side grading invariant;
  `on-track/watch/intervention` severity band (leave FlagEntry.severity); NCAA pure builder over a
  static field-map + "not validated vs live toolkit" flag; explicit gate-vs-ship boundary.
- **ADOPT (diff):** Supabase erase RPC signature (service client + p_student/p_reason); creditEligible
  requires full scope + summative; parent-record read-audit seam.
- **REBUT:** codex-cold `repo-premises-unverified` — premises verified by the repo-aware reviewers.
- **Matt checkpoints (flagged, not blocking):** grade weights + grading scale; retention timers; VPC
  method — all ATTORNEY-PENDING, built configurable.
