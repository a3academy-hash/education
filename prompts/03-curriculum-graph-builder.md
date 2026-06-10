# CURRICULUM GRAPH BUILDER (standalone — run when the elite graph is needed)

Use this prompt in Claude Code, delegated to mr-kahn for authoring and
verdicts, with mr-grunt writing the JSON file and /lib/validation proving it.
If Matt supplies his own graph JSON instead, run only the AUDIT section.

## Goal
Author /data/algebra1-graph.json: a complete, elite, accreditation-defensible
Algebra 1 knowledge graph for middle school students.

## Requirements
- 60–80 nodes covering a full Algebra 1 scope & sequence:
  foundations (integer ops, order of operations, like terms, distribution),
  expressions, one/two/multi-step equations, variables both sides, literal
  equations, inequalities (incl. compound), coordinate plane, slope, linear
  graphing, slope-intercept/point-slope/standard forms, writing equations,
  functions (notation, domain/range, evaluation), systems (graphing,
  substitution, elimination, word problems), exponent rules, scientific
  notation, polynomials (add/subtract/multiply), factoring (GCF, trinomials,
  special products), quadratics (graphing, vertex, solving by factoring,
  square roots, quadratic formula), radicals, and data/statistics basics.
- One assessable concept per node. Edges = true cognitive prerequisites only.
- Valid DAG: no cycles, no orphans, clear entry nodes and capstones.
- Every node carries:
  - id, title, domain, prereqs[]
  - standards: { ccss: [codes], state: placeholder }
  - objective: one sentence
  - misconceptionTags: research-documented error patterns for that concept
  - contextHooks: authentic hooks for baseball, softball, basketball,
    soccer, football, volleyball, AND neutral — real statistics and
    situations from each sport; a player of that sport must find it credible
  - content: concept (≤2 sentences), worked example (problem, steps, result),
    visual spec (numberline | coordinate | balance | table | none)
  - problems: { p1: [...sport-templated], p2: [...blended], p3: [...neutral] }
    — minimum 4 per phase per node, each with answer equivalence class,
    hint, explanation, misconception map for predictable wrong answers
- Three-phase integrity: p2 genuinely blends notation with sport framing
  (not a reskin); p3 contains zero sport references.

## Process
1. mr-kahn produces the node list + edge list FIRST (no content). Validate
   with /lib/validation. CHECKPOINT: Matt approves the topology.
2. Author nodes domain-by-domain in batches of ~10. After each batch:
   validation run + mr-kahn self-audit against his checklists.
3. Final pass: coverage report from the graph inspector — every node must
   show full hook + problem coverage for all sports and phases, or be
   explicitly flagged as content-debt.

## AUDIT section (for a Matt-supplied graph)
mr-kahn reviews the provided JSON against every requirement above and returns
a numbered defect list (topology, granularity, standards mapping, hook
authenticity, phase integrity, misconception coverage) with severity. Nothing
is "fixed" without Matt's approval of the defect list first.

CHECKPOINT — stop for Matt at: topology approval, after each authored batch,
and final coverage report.
