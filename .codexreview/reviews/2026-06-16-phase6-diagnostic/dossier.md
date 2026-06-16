# Dossier — Phase 6 Diagnostic plan (v2) review
Repo a3_education, branch overhaul/v0.2. Binding spec new_plan/DIAGNOSTIC.md (v0.2). v2 already
incorporates mr-kahn (REJECT→fixed) + mr-gates (APPROVE-WITH-CHANGES) — see phases/phase-6-review.md +
phase-6-decisions.md. Review the §V2 REVISIONS block as binding.

Existing engine (REUSE): lib/diagnostic-engine/index.ts — pure deterministic frontier-walk
(anchor-per-domain → advance/descend + confirmation probe), immutable replay (state = f(graph,config,
responses)), sealed client graph view, creditFromDiagnostic seed write, maxItems=15. cold-start seam
lib/engine-v2/cold-start.ts already has DiagnosticLabel union + seedFromDiagnostic(provisional). All 74
graph nodes carry CCSS. mr-kahn-verified high-impact node ids: ALG-F02/F03/F08/E02/E03/E04/L05/L07/E13.

Key v2 constraints proven by gates: (a) stop rule MUST be inside nextItem (client/server replay parity,
else persistDiagnostic sequence-check FAILs); (b) sim runs via vitest resolver not bare node
(ERR_UNSUPPORTED_DIR_IMPORT from dir-imports + @/ alias); (c) corroboration via widening needsConfirm in
processAnswer, finishDiagnostic stays pure read-out; (d) demonstrated[]/creditFromDiagnostic is the ONLY
node_mastery path; labels are read-side placement metadata; (e) pre-existing creditFromDiagnostic writing
status 'mastered' is a §12 accreditation concern flagged as a Matt checkpoint, not rewritten here.

Attack: anything in v2 that breaks DIAGNOSTIC.md conformance, determinism, the <800ms loop, the seed
firewall, or the §4 simulation validity. Name the single thing most likely still fatally wrong.
