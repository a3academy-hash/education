# Phase 2 — Adversarial Review (Codex)

## Plan review (informed + cold) — 7 concerns, ALL adopted (round-1.claude.json)
The reviewers prevented two mistakes and forced an honest rescope:
- **solver-underdetermined / schema-contract (blocking):** items carry NO derivation metadata →
  certification is well-formedness + round-trip + choice-integrity (NOT prose re-derivation);
  schema (`equivalenceClass`/`calculatorFlag`) defined on ProblemTemplate + validators first.
- **exact-dup-collapse (high):** exact-prompt dups span phase/sport buckets = legit coverage →
  collapse only true within-bucket dups; report before removal. (Result: **0** within-bucket dups —
  no destructive deletion was ever correct.)
- **equivalence-too-coarse / auto-tagging-premise (high):** family signature gets difficulty+kind
  discriminators; flag-don't-fabricate for misconceptionMap; rule-based calculatorFlag.

## Code review (build/diff) — 4 concerns across 2 rounds, ALL fixed
- r1 **unicode-minus-mask (med):** bank uses U+2212 → normalize to '-' before masking (re-ran tag
  pass; 4129→4123 families merged). r1 **hardcoded-script-paths (med):** import.meta.url. r1
  **numeric-set-dup-order (low):** canonical sorted set key.
- r2 **malformed-numeric-set-throws (low):** validate shape before computing the round-trip response
  (flag, never throw).

Outcome: certification lib + the live-bank gate are honest, bounded, and tested; the reviewers'
predictions (no true dups; Unicode minus) were both borne out by the run.
