# PHASE 0 — Project kickoff (paste into Claude Code first)

Read CLAUDE.md and every file in .claude/agents/ before doing anything.
Confirm you understand the agent workflow, the gates, and the human
checkpoints. Then execute this phase only.

## What we are building (context, do not build it all now)
An enterprise-grade adaptive virtual school. First course: Algebra 1 for
middle school students. A deterministic adaptive engine continuously decides,
from real attempt evidence, whether each student routes BACKWARD on the
knowledge graph to master a deficient prerequisite or ACCELERATES forward
past material already mastered — no wasted seat time in either direction.
The platform must be built from day one to withstand accreditation scrutiny
(complete evidence trail, standards mapping, defensible mastery decisions)
and NCAA nontraditional-course requirements. Design quality bar:
Stripe/Linear/Apple-Education — premium, calm, white-background, desktop-first.
Engagement comes from learning science (competence, autonomy, flow,
retrieval practice, immediate informative feedback), never gimmick
gamification.

Sport personalization: at onboarding each student selects a favorite sport
(baseball, softball, basketball, soccer, football, volleyball) or a neutral
track. New concepts are introduced through that sport's authentic statistics
and situations (Phase 1), blended with academic notation (Phase 2), then
assessed sport-free (Phase 3). Mastery requires Phase-3 neutral transfer.
The sport visibly fades as mastery grows.

## Phase 0 scope (this session only)
1. Scaffold the repo: Next.js App Router + TypeScript + Tailwind, with the
   structure below. Empty-but-typed modules are fine.
2. Implement /types completely: Course, SkillNode, SkillEdge, SkillContent,
   ContextHook (per-sport), ProblemTemplate, StudentProfile (incl. selected
   sport), StudentSkillState, StudentAttempt, MasteryUpdate,
   AdaptiveRecommendation, ValidationReport, VideoAsset (primary / alternate /
   remediation / worked-example / external-resource slots — placeholder
   architecture only, no hardcoded video content, no implication that
   third-party video can be freely copied).
3. Implement /lib/validation: graph import + ValidationReport (schema check,
   invalid edges, orphans, cycle detection with offending path, standards-code
   presence per node).
4. Create /data/algebra1-graph.json as a SCHEMA STUB with 3 example nodes
   only — the real graph arrives via the curriculum-graph-builder prompt or
   from Matt. Do not author the full curriculum in this phase.
5. Repository layer: interface + in-memory mock implementation. Supabase
   implementation stubbed but not wired.
6. Unit tests for validation. CI-style script: typecheck + lint + test.

## Structure
/app
  /student (home, /diagnostic, /learn/[skillId], /practice/[skillId], /summary, /onboarding)
  /dev/graph
/components (/layout /ui /student /diagnostic /learning /practice /graph)
/lib (/curriculum /graph /validation /mastery-engine /adaptive-router /problem-engine /ai-tutor /repository)
/types
/data
/prompts (already present — do not modify)

## Gates for this phase
- mr-gates must APPROVE the /types design and repository interface before
  mr-grunt implements.
- mr-kahn must APPROVE the graph JSON schema (node/edge/content/hook shape,
  standards-mapping fields, misconception-tag field) before it is frozen.

## CHECKPOINT — stop for Matt
When done: present the file tree, the /types source, the graph schema, the
validation test results, and any open questions. Do not start Phase 1.
