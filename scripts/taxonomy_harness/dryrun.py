"""dryrun.py — THE ACCEPTANCE TEST (session-gated: no API calls, no data/
writes, no Supabase).

Loads the gold taxonomy through the adapter (signatures.build_gold_taxonomy)
and runs EVERY deterministic check against it. The gold doc must PASS
everything: its documented collisions = the machine structural list; its
citations verify against the seeded registry; its structure conforms to
TAXONOMY_TEMPLATE; its routing destinations resolve in the graph DAG.

If gold fails a check, the harness is wrong, not the gold doc. Every place a
check needed interpretation to pass gold is recorded in INTERPRETATIONS and
written into the report.

Also runs persisted NEGATIVE CONTROLS (mr-gates gate-3): one deliberate
poisoned-input trip per check family (F-COLL / F-CITE / F-STRUCT / F-TAG /
F-SIG), each asserting the check FIRES on the poison.

Output: .authoring-tmp/taxonomies/_dryrun/report.json + a printed summary table.
"""
from __future__ import annotations

import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

import citations
import collisions
import config
import orchestrate
import sig_verify
import signatures
import structure


INTERPRETATIONS = [
    ("I1", "REPLACED (mr-gates gate-3): the interim 'no platform-wide "
           "tolerance / 1e-9 over Fraction evaluation' reading is superseded "
           "by the real platform pin — the engine grades numeric answers by "
           "EXACT equality with an optional per-item `tolerance` on the "
           "AnswerSpec (pin source: lib/problem-engine/index.ts:151-152 "
           "numericEqual; types/problem.ts AnswerSpec numeric/coordinate). "
           "Separation for assertions (ii)/(iii) is computed under exact "
           "Fraction arithmetic and must exceed the max per-item tolerance "
           "the archetype will declare (sig_verify declared_tolerance, "
           "default 0 = never declared); GRADING_TOL = 1e-9 is demoted to a "
           "float-noise floor only. NEAR_MISS_GUARD = 4e-3 stays "
           "warning-only instrumentation (gold §2.9 posture)."),
    ("I2", "Pairwise coincidence is computed within compatible presentation "
           "classes (TEMPLATE §3.10 explicitly feeds collision-matrix "
           "conditions): -m (2.2, numeric-entry) and |m| (2.4's read-a-graph "
           "variant) never co-live on one item, so 2.2~2.4 is not owed a matrix "
           "row; 2.2~2.5 (gold row 1) and 2.4~2.5 (gold row 7) are, and both "
           "recall."),
    ("I3", "Structural-vs-sporadic reading rule (from the kahn-approved "
           "CONFUSABLE_CLUSTERS §1): F-COLL recall binds on collisions that are "
           "ALWAYS-equal under joint constraints or equal on every draw inside "
           "a pinned library condition; sample-level sporadic coincidences are "
           "render-time re-parameterization duties under the doc's global "
           "generator rule, not matrix duties."),
    ("I4", "Cluster arming injection (CONFUSABLE_CLUSTERS §3 item 3: 'arming "
           "conditions from the cluster row enter the node's generator "
           "constraints'): CC-04's 'queried x != 1' is applied to "
           "slope-as-height / slope-as-single-point-ratio, making their "
           "internal x=1 collision constraint-excluded — so no matrix row or "
           "default rule is owed for the pair (gold has none); the probe "
           "observable (two-questions contrast) is cited instead."),
    ("I5", "negative-reciprocal-error inherits |m| != 1 via CC-02: the -1/m "
           "surface in L05/L06 is the 2.3+2.2 compound, and the 2.3 component "
           "carries |m| != 1 — without this the machine would flag "
           "2.2~negative-reciprocal-error at |m|=1 against a matrix that "
           "already documents both tags in row 8."),
    ("I6", "Gold matrix row 8 (-1/m compound) and row 9 (2.12~2.11 cross-form "
           "ladder) are not machine-realizable as live pairwise numeric "
           "coincidences: row 8 is a compound attribution rule, row 9 pairs a "
           "keyed-choice recipe with a numeric form. Both are carried as "
           "documented-extra rows (spec §4.2 kahn-finding path — satisfied for "
           "gold by the kahn verdict); the harness verifies recipe construction "
           "only (spec §3.2 honest limit)."),
    ("I7", "'Documented collision' = consolidated-matrix row OR per-entry "
           "collision/disambiguation block (gold precedent: the 2.11~2.12 "
           "re-attribution ladder lives in §2.12's entry, not the matrix "
           "table). The adapter models it as an entry_level MatrixRow."),
    ("I8", "Adapter transcription: step-locality, propagation, and "
           "presentation-class fields are stated inline in gold prose, not as "
           "labeled fields — transcribed to machine fields. Grounding tiers "
           "post-date gold (2026-07-06 vocabulary): 2.7 -> tradition-adjacent "
           "(extrapolated from Cho & Nagle's categorization), 2.4 and 2.13 -> "
           "engineering-candidate (first-principles analysis stated), all "
           "others literature-grounded."),
    ("I9", "Gold §2.2 declares no generator constraints (none needed: -m is "
           "armed and separated on the whole family region). TEMPLATE §4.5 "
           "row 13 is satisfied by an explicit constraints-note in place of "
           "constraints — never silently blank."),
    ("I10", "BLOCKER ancestor rule for cluster docs: the destination must be a "
            "prerequisite ancestor of at least one covered node (ALG-L05 is "
            "L06's direct prereq; the doc covers both)."),
    ("I11", "Citation registry path: spec §2.3 pins "
            ".authoring-tmp/taxonomies/_registry/verified-citations.json; the "
            "task brief's flat taxonomies/verified-citations.json is treated "
            "as superseded by the spec. AMBIGUITY — flagged, not silently "
            "resolved."),
    ("I12", "Registry works cited in gold §1 without years (De Bock & Van "
            "Dooren, Lamon, Cramer & Post, Karplus) are seeded with year: null "
            "+ a tradition-level note — recording a specific year would assert "
            "bibliography the kahn gold gate did not verify."),
    ("I13", "A doc-declared global generator rule ('if any trap equals the "
            "correct answer ... re-parameterize') is applied as an implicit "
            "author-time trap-vs-key rejection screen during §3.1 sampling; a "
            "structurally dead trap then fails satisfiability (the right "
            "diagnosis), and the machine key-collision map still reports "
            "arming territory. Realized on gold by 2.7's sporadic "
            "(y2-x2)/(y1-x1) = m draws — gold's own §2.7 'per-item check "
            "against all other live traps' machinery."),
]


def _fmt_status(ok: bool) -> str:
    return "PASS" if ok else "FAIL"


def negative_controls(gold_text, registry, registry_pin):
    """Persisted NEGATIVE CONTROLS (mr-gates gate-3; mirrors the regen
    dry-run's poisoned-input pattern). Each control deliberately poisons a
    fresh gold taxonomy and asserts the targeted check FIRES. pass=True means
    the check fired on the poison — a control that stays green means the
    harness lost its teeth, not that the input was fine.
    """
    checks = []

    # NC-COLL: delete a documented matrix row that covers a machine structural
    # collision — recall (F-COLL) must fire on the now-undocumented pair.
    # (The machine ground truth is signature-derived and untouched by the
    # row deletion; recomputed here so the control is self-contained.)
    tax = signatures.build_gold_taxonomy(doc_text=gold_text)
    machine = collisions.compute_machine_list(tax)
    if machine["structural"]:
        target = frozenset(machine["structural"][0]["pair"])
        tax.matrix_rows = [r for r in tax.matrix_rows
                           if not target <= r.members]
        rec = collisions.check_recall(tax, machine)
        fired = any(f["class"] == "F-COLL"
                    and frozenset(f["pair"]) == target
                    for f in rec["failures"])
        detail = (f"deleted the row covering {sorted(target)} — F-COLL "
                  f"{'fired' if fired else 'DID NOT fire'}")
    else:
        fired, detail = False, ("no machine structural row exists to "
                                "poison — control cannot run")
    checks.append({"id": "NC-COLL", "name": "negative control: deleted "
                   "matrix row -> F-COLL recall fires",
                   "pass": fired, "detail": detail})

    # NC-CITE: a wrong-year citation against a verified work must MISMATCH
    # (F-CITE, fatal, no repair path).
    status = citations.check(
        "stump-1999", "slope conceived as visual steepness/angle rather "
        "than ratio", year=2005, registry=registry)
    checks.append({"id": "NC-CITE", "name": "negative control: wrong-year "
                   "citation (stump-1999 as 2005) -> MISMATCH",
                   "pass": status == "MISMATCH",
                   "detail": f"citations.check returned {status!r}"})

    # NC-STRUCT: blank a required §3 field — F-STRUCT must fire on the entry.
    tax = signatures.build_gold_taxonomy(doc_text=gold_text)
    tax.entries[0].belief = ""
    struct = structure.check_structure(tax)
    fired = any(f.get("entry") == tax.entries[0].tag
                and "§3.2" in f["detail"] for f in struct["failures"])
    checks.append({"id": "NC-STRUCT", "name": "negative control: blanked "
                   "required field (§3.2 belief) -> F-STRUCT fires",
                   "pass": fired,
                   "detail": f"blanked {tax.entries[0].tag}.belief — F-STRUCT "
                             f"{'fired' if fired else 'DID NOT fire'}"})

    # NC-TAG: rename an entry to a tag outside pin ∪ own diff — F-TAG fires.
    tax = signatures.build_gold_taxonomy(doc_text=gold_text)
    tax.entries[0].tag = "alien-tag-negative-control"
    hyg = structure.check_tag_hygiene(tax, registry_pin)
    fired = any(f["class"] == "F-TAG"
                and f.get("entry") == "alien-tag-negative-control"
                for f in hyg["failures"])
    checks.append({"id": "NC-TAG", "name": "negative control: alien tag "
                   "outside registry pin ∪ diff -> F-TAG fires",
                   "pass": fired,
                   "detail": "alien-tag-negative-control — F-TAG "
                             f"{'fired' if fired else 'DID NOT fire'}"})

    # NC-SIG: append an unsatisfiable generator constraint — the §3.3
    # satisfiability check (F-SIG) must fire. Run on a single-entry taxonomy
    # so the control costs one rejection-sampling cap, not a full chain.
    tax = signatures.build_gold_taxonomy(doc_text=gold_text)
    entry = tax.entry_by_tag("forgot-denominator")
    entry.constraints.append(signatures.Constraint(
        "unsatisfiable (negative control: empty region)", lambda p: False))
    solo = signatures.Taxonomy(
        node_ids=tax.node_ids, node_class=tax.node_class, entries=[entry],
        global_generator_rule=tax.global_generator_rule)
    sig = sig_verify.verify(solo, {"pairs": {}, "structural": [],
                                   "key_collisions": {}})
    fired = any(f["assertion"] == "constraint-satisfiability"
                for f in sig["failures"])
    checks.append({"id": "NC-SIG", "name": "negative control: unsatisfiable "
                   "constraint -> F-SIG satisfiability fires",
                   "pass": fired,
                   "detail": "always-false constraint on forgot-denominator — "
                             f"F-SIG {'fired' if fired else 'DID NOT fire'}"})
    return checks


def main() -> int:
    # staging layout (spec §9) — created up front, including the batch layout
    for d in (config.STAGING_ROOT, config.BATCHES_DIR,
              config.CITATION_REGISTRY_DIR, config.REPORTS_DIR,
              config.DRYRUN_DIR):
        os.makedirs(d, exist_ok=True)
    config.ensure_batch_layout("batch-1", nodes=[], prior_batches=[])

    # citations registry must exist before the F-DEP check (spec §0 last row)
    registry = citations.seed_registry()

    checks = []

    # 0. F-DEP preconditions
    fdep = config.check_preconditions("batch-1")
    checks.append({"id": "F-DEP", "name": "spec §0 preconditions (graph / "
                   "template / map / registry pins)",
                   "pass": not fdep, "detail": fdep or "all pins hold"})

    graph = config.load_graph()
    cmap = config.load_confusable_map()
    registry_pin = config.load_registry_pin("batch-1")

    with open(config.GOLD_TAXONOMY_PATH, encoding="utf-8") as f:
        gold_text = f.read()
    taxonomy = signatures.build_gold_taxonomy(doc_text=gold_text)

    # full deterministic chain
    chain = orchestrate.run_check_chain(taxonomy, graph, cmap, registry_pin,
                                        citation_registry=registry)
    L = chain["layers"]

    sig = L["signatures"]
    sat_fails = [f for f in sig["failures"]
                 if f["assertion"] == "constraint-satisfiability"]
    i_fails = [f for f in sig["failures"] if f["assertion"] == "(i)"]
    ii_fails = [f for f in sig["failures"] if f["assertion"] == "(ii)"]
    iii_fails = [f for f in sig["failures"] if f["assertion"] == "(iii)"]
    we_fails = [f for f in sig["failures"] if f["assertion"] == "worked-example"]
    n_units = len(sig["entries"])
    checks += [
        {"id": "SIG-SAT", "name": f"§3.3 constraint satisfiability "
         f"(K={config.K} within N={config.SATISFIABILITY_CAP}, {n_units} "
         f"signature units)", "pass": not sat_fails,
         "detail": sat_fails or "all constraint sets satisfiable"},
        {"id": "SIG-i", "name": "§3.1(i) closed-form computable on every sample",
         "pass": not i_fails, "detail": i_fails or "computable everywhere"},
        {"id": "SIG-ii", "name": "§3.1(ii) separated from the key (exact "
         "arithmetic, > declared per-item tolerance)",
         "pass": not ii_fails, "detail": ii_fails or "armed and separated"},
        {"id": "SIG-iii", "name": "§3.1(iii) pairwise-separated except "
         "documented pairs", "pass": not iii_fails,
         "detail": iii_fails or f"{len(sig['warnings'])} excused coincidences "
         "(documented pairs / render-time duties)"},
        {"id": "SIG-WE", "name": "§3.14 worked examples recompute exactly",
         "pass": not we_fails, "detail": we_fails or "all traps and keys match"},
    ]

    rec = L["collision_recall"]
    checks.append({"id": "COLL-RECALL",
                   "name": "§4.2 recall: machine structural list ⊆ documented "
                           "collisions (F-COLL)",
                   "pass": not rec["failures"],
                   "detail": rec["failures"] or
                   [f"machine structural rows: "
                    f"{[r['pair'] for r in chain['machineCollisions']]}",
                    *(f"extra row — {f['row']}: {f['status']}"
                      for f in rec["extra_row_findings"])]})

    clus = L["cluster_obligations"]
    checks.append({"id": "COLL-CLUSTERS",
                   "name": "confusable-clusters obligations (matrix rows + "
                           "probe-contract citations, CC map v"
                           + cmap["version"] + ")",
                   "pass": not clus["failures"],
                   "detail": clus["failures"] or clus["findings"]})

    cit = L["citations"]
    checks.append({"id": "CITE",
                   "name": "§2 citation verification (F-CITE fatal, no repair "
                           "path)",
                   "pass": not cit["failures"] and not cit["pending"],
                   "detail": cit["failures"] or
                   (f"{len(cit['verified'])} citation uses verified against the "
                    f"seeded registry; {len(cit['pending'])} pending")})

    struct = L["structure"]
    checks.append({"id": "STRUCT",
                   "name": "TAXONOMY_TEMPLATE conformance (15 §3 fields, "
                           "node-level structures, §4.5 counts, tiers)",
                   "pass": not struct["failures"],
                   "detail": struct["failures"] or struct["findings"]})

    hyg = L["tag_hygiene"]
    checks.append({"id": "F-TAG",
                   "name": "registry-tag hygiene (pin ∪ own diff, "
                           f"{len(registry_pin)}-entry batch-1 pin)",
                   "pass": not hyg["failures"],
                   "detail": hyg["failures"] or "all tags legal"})

    rout = L["routing"]
    checks.append({"id": "ROUTE",
                   "name": "routing references (re-surface ids exist; BLOCKER "
                           "destinations are prereq ancestors / named "
                           "below-graph surfaces)",
                   "pass": not rout["failures"],
                   "detail": rout["failures"] or rout["findings"]})

    # negative controls: poisoned inputs must make the checks FIRE
    checks += negative_controls(gold_text, registry, registry_pin)

    all_pass = all(c["pass"] for c in checks)

    report = {
        "dryRun": "gold-taxonomy acceptance test (TAXONOMY_REGEN_SPEC harness)",
        "goldDoc": os.path.relpath(config.GOLD_TAXONOMY_PATH, config.REPO_ROOT),
        "pins": {"draftModel": config.TAX_DRAFT_MODEL,
                 "judgmentModel": config.TAX_JUDGMENT_MODEL,
                 "K": config.K, "satisfiabilityCap": config.SATISFIABILITY_CAP,
                 "gradingFloatNoiseFloor": config.GRADING_TOL,
                 "declaredToleranceDefault": config.DECLARED_TOLERANCE_DEFAULT,
                 "graph": config.GRAPH_PIN_VERSION,
                 "template": config.TAXONOMY_TEMPLATE_VERSION,
                 "confusableMap": config.CONFUSABLE_MAP_VERSION,
                 "registryPinSize": len(registry_pin)},
        "verdict": "GREEN — gold passes every deterministic check"
                   if all_pass else "RED — harness defect (gold is right)",
        "checks": checks,
        "interpretations": [{"id": i, "text": t} for i, t in INTERPRETATIONS],
        "machineCollisionsStructural": chain["machineCollisions"],
        "sporadicAndConstraintExcluded": chain["sporadicAndExcluded"],
        "keyCollisions": chain["keyCollisions"],
        "signatureWarnings": sig["warnings"],
    }
    out = os.path.join(config.DRYRUN_DIR, "report.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, default=str, ensure_ascii=False)

    # ---- summary table ----
    print("=" * 78)
    print("DRY-RUN — gold taxonomy vs every deterministic check")
    print("=" * 78)
    print(f"{'check':<14} {'result':<7} name")
    print("-" * 78)
    for c in checks:
        print(f"{c['id']:<14} {_fmt_status(c['pass']):<7} {c['name']}")
        if not c["pass"]:
            for d in (c["detail"] if isinstance(c["detail"], list)
                      else [c["detail"]]):
                print(f"{'':<22}! {d}")
    print("-" * 78)
    print(f"VERDICT: {report['verdict']}")
    print(f"interpretations recorded: {len(INTERPRETATIONS)} "
          f"(see report.json)")
    print(f"report: {os.path.relpath(out, config.REPO_ROOT)}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
