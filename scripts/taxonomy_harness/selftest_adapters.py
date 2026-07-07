"""selftest_adapters.py — GAP-2(d) adapter self-test (session-gated: no API
calls, no data/ writes, no Supabase).

1. SYNTHETIC round trip: a small machine block exercising all three §3.2
   signature forms + one documented collision parses through
   adapters.parse_machine_block and runs clean through sig_verify +
   collisions (recall included).
2. MALFORMATIONS: a missing block, an undeclared-parameter expression, a
   disallowed-call expression, and a float constant are each rejected with
   an AdapterError (F-STRUCT class) carrying a precise reason.
3. GOLD-THROUGH-ADAPTER: build_gold_taxonomy's machine form is serialized to
   a machine block (adapters.gold_machine_block), parsed back, checked for
   sample-by-sample behavioral equivalence against the gold lambdas, and run
   through the FULL deterministic check chain — it must stay GREEN (the
   gold-passes-everything invariant, now proven through the adapter path).

Prints a transcript; exit 0 only if every assertion holds.
"""
from __future__ import annotations

import json
import os
import random
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import adapters
import citations
import collisions
import config
import orchestrate
import sig_verify
import signatures as S


_RESULTS = []


def check(name: str, ok: bool, detail: str = ""):
    _RESULTS.append((name, ok, detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}"
          + (f" — {detail}" if detail else ""))
    return ok


# ---------------------------------------------------------------------------
# 1. Synthetic block — all three forms + one documented collision
# ---------------------------------------------------------------------------
_M = "(y2 - y1) / (x2 - x1)"

SYNTHETIC_BLOCK = {
    "nodeIds": ["ALG-L06"],
    "nodeClass": "conceptual",
    "globalGeneratorRule": ("at render time, compute every applicable "
                            "signature; if any trap equals the correct "
                            "answer or another trap, re-parameterize"),
    "entries": [
        {   # numeric-expression form; collides structurally with entry 2
            "id": "2.1", "tag": "forgot-denominator",
            "title": "synthetic Δy",
            "severity": "BLOCKER", "groundingTier": "literature-grounded",
            "cognitiveRoot": "synthetic root A",
            "signatures": [{"label": "Δy", "form": "numeric-expression",
                            "family": "two-point", "expression": "y2 - y1",
                            "presentation": "numeric-entry"}],
            "generatorConstraints": [
                {"name": "|Δx| != 1", "expression": "abs(x2 - x1) != 1"}],
            "stepLocality": "difference step", "propagation": "downstream",
            "presentationClass": "insensitive",
            "beliefFormRewrite": "synthetic rewrite",
            "workedExample": {"family": "two-point",
                              "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                         "sx": 1, "sy": 1},
                              "signatureLabel": "Δy",
                              "trap": "12", "correct": "3"},
        },
        {   # same trap value — the deliberate documented collision
            "id": "2.2", "tag": "rate-not-per-unit",
            "title": "synthetic chunk rate",
            "severity": "MEDIUM", "groundingTier": "literature-grounded",
            "cognitiveRoot": "synthetic root B",
            "signatures": [{"label": "Δy (chunk)",
                            "form": "numeric-expression",
                            "family": "two-point", "expression": "y2 - y1",
                            "presentation": "numeric-entry"}],
            "generatorConstraints": [
                {"name": "|Δx| != 1", "expression": "abs(x2 - x1) != 1"}],
            "stepLocality": "normalization step", "propagation": "downstream",
            "presentationClass": "insensitive",
            "beliefFormRewrite": "synthetic rewrite",
        },
        {   # construct-state form (tuple + key override)
            "id": "2.3", "tag": "rise-run-direction-error",
            "title": "synthetic construct",
            "severity": "MEDIUM", "groundingTier": "engineering-candidate",
            "cognitiveRoot": "synthetic root C (first-principles)",
            "signatures": [{
                "label": "(x0+1, y0+|m|)", "form": "construct-state",
                "family": "two-point",
                "components": ["x1 + 1", f"y1 + abs({_M})"],
                "keyComponents": ["x1 + 1", f"y1 + {_M}"],
                "presentation": "construct"}],
            "generatorConstraints": [
                {"name": "m < 0 (arming)", "expression": f"({_M}) < 0"}],
            "stepLocality": "stepping move", "propagation": "non-propagating",
            "presentationClass": "SENSITIVE: construct items",
            "beliefFormRewrite": "synthetic rewrite",
            "workedExample": {"family": "two-point",
                              "params": {"x1": 0, "y1": 20, "x2": 5, "y2": 0,
                                         "sx": 1, "sy": 1},
                              "signatureLabel": "(x0+1, y0+|m|)",
                              "trap": ["1", "24"], "correct": ["1", "16"]},
        },
        {   # keyed-choice form (recipe, family key)
            "id": "2.4", "tag": "slope-as-visual-steepness",
            "title": "synthetic recipe",
            "severity": "MEDIUM", "groundingTier": "literature-grounded",
            "cognitiveRoot": "synthetic root D",
            "signatures": [{
                "label": "steeper-looking panel", "form": "keyed-choice",
                "family": "two-panel-comparison", "option": "panel-A",
                "presentation": "choice"}],
            "generatorConstraints": [
                {"name": "panel construction",
                 "expression": "mA < mB and mA / syA > mB / syB"}],
            "stepLocality": "comparison step", "propagation": "non-propagating",
            "presentationClass": "SENSITIVE: choice items",
            "beliefFormRewrite": "synthetic rewrite",
            "workedExample": {"family": "two-panel-comparison",
                              "params": {"mA": 2, "mB": 5, "syA": 1,
                                         "syB": 10},
                              "signatureLabel": "steeper-looking panel",
                              "trap": "panel-A", "correct": "panel-B"},
        },
    ],
    "collisionMatrix": [
        {"pair": ["forgot-denominator", "rate-not-per-unit"], "value": "Δy",
         "condition": "numeric entry", "probeRef": "unit-labeled choice probe"}
    ],
    "notAnError": [],
    "registryDiff": {"adds": [], "redefines": []},
    "rubricTable": [],
}


def _wrap(block: dict) -> str:
    return ("# synthetic taxonomy (adapter self-test)\n\n"
            + adapters.render_machine_block(block) + "\n")


def test_synthetic() -> None:
    print("--- 1. synthetic machine block (all three §3.2 forms) ---")
    taxonomy = adapters.parse_machine_block(_wrap(SYNTHETIC_BLOCK))
    check("parses: 4 entries, 3 forms",
          len(taxonomy.entries) == 4
          and {s.form for e in taxonomy.entries for s in e.signatures}
          == {S.NUMERIC, S.CONSTRUCT, S.RECIPE})

    machine = collisions.compute_machine_list(taxonomy)
    pair = frozenset(("forgot-denominator", "rate-not-per-unit"))
    check("machine list finds the deliberate structural collision",
          machine["pairs"].get(pair, {}).get("kind") == "structural",
          str(machine["pairs"].get(pair)))

    recall = collisions.check_recall(taxonomy, machine)
    check("collision recall clean (the pair is documented)",
          not recall["failures"], str(recall["failures"]))

    sig = sig_verify.verify(taxonomy, machine)
    check("sig_verify clean on all three forms (K-sample round trip)",
          not sig["failures"], str(sig["failures"][:2]))
    excused = [w for w in sig["warnings"] if "excused" in w.get("detail", "")]
    check("collision coincidences excused as the documented pair",
          bool(excused), f"{len(excused)} excused warnings")


def test_malformations() -> None:
    print("--- 2. deliberate malformations -> AdapterError (F-STRUCT) ---")

    def expect_error(name, mutate):
        block = json.loads(json.dumps(SYNTHETIC_BLOCK))
        text = mutate(block)
        try:
            adapters.parse_machine_block(text)
        except adapters.AdapterError as e:
            ok = e.finding.get("class") == "F-STRUCT" and str(e)
            check(name, bool(ok), f"reason: {e}")
            return
        check(name, False, "no AdapterError raised")

    expect_error("missing machine block rejected",
                 lambda b: "# a document with no machine block\n")

    def bad_param(b):
        b["entries"][0]["signatures"][0]["expression"] = "y3 - y1"
        return _wrap(b)
    expect_error("undeclared parameter rejected", bad_param)

    def bad_call(b):
        b["entries"][0]["signatures"][0]["expression"] = \
            "__import__('os').system('echo')"
        return _wrap(b)
    expect_error("disallowed call rejected (no eval, abs() only)", bad_call)

    def bad_float(b):
        b["entries"][0]["generatorConstraints"][0]["expression"] = "y1 != 0.5"
        return _wrap(b)
    expect_error("float constant rejected (Fraction-exact pin)", bad_float)


# ---------------------------------------------------------------------------
# 3. Gold through the adapter
# ---------------------------------------------------------------------------
def _equivalent(fn_a, fn_b, family, rng, draws=30) -> bool:
    for _ in range(draws):
        p = family.sample(rng)
        try:
            va = fn_a(p)
        except Exception as ea:                          # noqa: BLE001
            try:
                fn_b(p)
            except Exception as eb:                      # noqa: BLE001
                if type(ea) is type(eb):
                    continue
            return False
        try:
            vb = fn_b(p)
        except Exception:                                # noqa: BLE001
            return False
        if va != vb:
            return False
    return True


def test_gold_through_adapter() -> int:
    print("--- 3. GOLD serialized -> parsed -> FULL check chain ---")
    block = adapters.gold_machine_block()
    with open(config.GOLD_TAXONOMY_PATH, encoding="utf-8") as f:
        gold_text = f.read()
    md = gold_text + "\n\n" + adapters.render_machine_block(block) + "\n"
    parsed = adapters.parse_machine_block(md)
    gold = S.build_gold_taxonomy(doc_text=gold_text)

    check("entry set round-trips",
          [e.tag for e in parsed.entries] == [e.tag for e in gold.entries]
          and [r.tag for r in parsed.boundary_records]
          == [r.tag for r in gold.boundary_records])

    # sample-by-sample behavioral equivalence: every serialized expression
    # computes exactly what the gold lambda computes
    rng = random.Random(0xE0_1D)
    units_g = list(gold.entries) + list(gold.boundary_records)
    units_p = list(parsed.entries) + list(parsed.boundary_records)
    sig_ok = cons_ok = key_ok = True
    for ug, up in zip(units_g, units_p):
        for sg, sp in zip(ug.signatures, up.signatures):
            fam = S.FAMILIES[sg.family]
            if not _equivalent(sg.fn, sp.fn, fam, rng):
                sig_ok = False
                print(f"      ! {ug.tag} / {sg.label}: expression drift")
            kg = sg.key_fn or fam.key_fn
            kp = sp.key_fn or fam.key_fn
            if not _equivalent(kg, kp, fam, rng):
                key_ok = False
                print(f"      ! {ug.tag} / {sg.label}: KEY expression drift")
        fams = [S.FAMILIES[s.family] for s in ug.signatures] or \
               [S.FAMILIES["two-point"]]
        for cg, cp in zip(ug.constraints, up.constraints):
            if not _equivalent(cg.ok, cp.ok, fams[0], rng):
                cons_ok = False
                print(f"      ! {ug.tag} / constraint {cg.name!r}: drift")
    check("signature expressions behaviorally equivalent (30 draws each)",
          sig_ok)
    check("key expressions behaviorally equivalent", key_ok)
    check("generator constraints behaviorally equivalent", cons_ok)

    # the FULL deterministic chain, through the adapter-built taxonomy
    registry = citations.seed_registry()
    config.ensure_batch_layout("batch-1", nodes=[])
    graph = config.load_graph()
    cmap = config.load_confusable_map()
    registry_pin = config.load_registry_pin("batch-1")
    chain = orchestrate.run_check_chain(parsed, graph, cmap, registry_pin,
                                        citation_registry=registry)
    for name, layer in chain["layers"].items():
        check(f"chain layer {name}", not layer.get("failures"),
              str(layer.get("failures")[:2]) if layer.get("failures") else "")
    green = chain["status"] == "HARNESS_PASS"
    check("chain status HARNESS_PASS", green, chain["status"])
    print()
    print("GOLD-THROUGH-ADAPTER: "
          + ("GREEN — gold passes the full deterministic chain through "
             "adapters.parse_machine_block (the gold-passes-everything "
             "invariant holds on the adapter path)"
             if green and sig_ok and cons_ok and key_ok else
             "RED — adapter path diverges from the gold adapter"))
    return 0 if green else 1


def main() -> int:
    print("=" * 78)
    print("ADAPTER SELF-TEST — taxonomy_harness/adapters.py (GAP 2d)")
    print("=" * 78)
    test_synthetic()
    test_malformations()
    test_gold_through_adapter()
    print("-" * 78)
    n_pass = sum(1 for _, ok, _ in _RESULTS if ok)
    print(f"self-test: {n_pass}/{len(_RESULTS)} assertions pass")
    return 0 if n_pass == len(_RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
