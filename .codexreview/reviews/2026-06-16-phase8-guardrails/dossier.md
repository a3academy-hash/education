# Dossier — Phase 8 Engagement Guardrails plan
Repo a3_education, branch overhaul/v0.2. Binding new_plan/AI_ADAPTIVE.md §8 + STYLE_GUIDE §5/§8.6.
EXISTS (Phase 4, lib/engine-v2/selector.ts, pure+tested): 70-90% success band (bandLo/bandHi, bandFit),
review-burden cap (maxReviewFraction 0.4), frustration fallback (frustrationK 3 → reachable win,
auto-recover). Retention layer lib/engine-v2/retention.ts: stability/halflife/pRecall. Rings (Phase 5
MasteryRing/RingTrio) read-only, never in mastery math, muted on Test surface via CSS firewall. Live
mastery path = lib/mastery-engine; engine-v2 is the modular spine (lock gate, selector) not fully live-
wired into the practice UI yet (dual-engine). Phase 8 adds: fast-but-fragile detector, visible retained-
mastery stat, Training/Boost reward-intensity mode (deferred from Phase 5). GOAL gate: guardrails active;
rewards NEVER contaminate measurement. Attack: anything that lets a reward/engagement signal into mastery
math, violates the retention firewall (§7: lock only on delayed unseen), fabricates a retained/fragile
signal, or makes Boost a variable-OUTCOME (loot-box) reward. Name the single most-likely-fatal thing.
