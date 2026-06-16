# .codexreview — adversarial review chain (per-project)

Run `/codexreview` to pressure-test a plan/spec (informed + cold reviewers) or a git diff before commit. Claude builds & defends; Codex reviews read-only; you approve.

- `agent-chain.yaml` — role->provider/model map for this repo (overrides the global default).
- `reviews/<slug>/` — committed audit trail per review.

Global logic lives in `~/.claude/skills/review-chain/` + the `/codexreview` command.
Requires Codex CLI (`npm i -g @openai/codex`, then `codex login`).
