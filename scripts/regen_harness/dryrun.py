"""Dry-run acceptance (BATCH_REGEN_SPEC session gate: NO LIVE API CALLS).

Treats the gold node (ALG-L06) as a synthetic single-node batch:
  1. F-DEP precondition check against the REAL frozen inputs (must PASS)
  2. full cached-prefix assembly + token estimate vs the ~23k budget
  3. deliberate hard-stop tests: voice slice WITHHELD and voice pin ABSENT
     must both raise F-DEP (the prefix refuses to render)
  4. payload render for ALG-L06 (plus the phase-split render + host-side
     fragment merge exercised on the gold items)
  5. gold-node-items.json's 15 items through the §5.2 host-side validators
     (gold items use an EXTENDED schema: the run validates what applies and
     reports which checks are gold-schema-adapted vs production-schema;
     P3-non-empty / tag-existence / ladder-ref checks run genuinely against
     the real 163-entry registry)
  6. sampler: rate-ramp truth table + stratified sample over the 15 items
  7. stage everything under .authoring-tmp/regen/_dryrun/ and write a report

Run:  python -m scripts.regen_harness.dryrun
"""

from __future__ import annotations

import datetime as _dt
import json
import re
import sys

from . import config, payload, prefix, sampler, staging, validate
from .failures import (
    FDepError, FragmentExpectation, drift_check, detect_partial,
    merge_fragments, precondition_check, validate_fragments_before_merge,
)

GOLD_NODE_ID = "ALG-L06"

# Manifest class row: the REAL derived shape from docs/archetypes/manifest.json
# (config.load_derived_manifest). ALG-L06 itself is deliberately excluded from
# the derived manifest (gold reference — frozen, never regenerated), so the
# dry run uses the adjacent conceptual node ALG-L05's row: same class, same
# quotas, and exactly the archetypeQuotas / enrichedTotal / phaseBands /
# splitPreemptively shape every live batch payload will carry. (The gold
# 15-item file predates the 1.1.0 rubric-explanation substitution — its
# measured mix carries no rex; noted, not a defect.)
MANIFEST_ROW_NODE_ID = "ALG-L05"


class Check:
    def __init__(self):
        self.results: list[dict] = []

    def record(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append({"check": name, "pass": ok, "detail": detail})
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
        return ok

    @property
    def all_pass(self) -> bool:
        return all(r["pass"] for r in self.results)


def _withheld_voice_md() -> str:
    """QUESTION_VOICE.md with §10, §3 and §9 removed (the withheld-slice test)."""
    md = config.QUESTION_VOICE_PATH.read_text(encoding="utf-8")
    for pat in (r"^## 10\..*?(?=^## |\Z)", r"^## 3\..*?(?=^## |\Z)",
                r"^## 9\..*?(?=^## |\Z)"):
        md = re.sub(pat, "", md, flags=re.M | re.S)
    return md


def main() -> int:
    print("=== BATCH REGEN HARNESS — DRY RUN (gold node as synthetic batch) ===")
    print(f"    NO LIVE API CALLS. Staging root: {config.DRYRUN_ROOT}\n")
    ck = Check()

    graph = config.load_graph()
    registry = config.registry_ids(graph)
    source_node = next(n for n in graph["nodes"] if n["id"] == GOLD_NODE_ID)
    gold_doc = json.loads(config.GOLD_ITEMS_PATH.read_text(encoding="utf-8"))
    gold_items = gold_doc["items"]

    voice_commit, voice_clean = config.git_commit_pin(config.QUESTION_VOICE_PATH)

    manifest = config.BatchManifest(
        run_id="dryrun-" + _dt.date.today().isoformat(),
        generation_model=config.GENERATION_MODEL,
        audit_model=config.AUDIT_MODEL,
        max_tokens=config.MAX_TOKENS,
        archetype_library_version=config.ARCHETYPE_LIBRARY_VERSION,
        graph_version_pin=config.graph_version(graph),
        registry_entry_count_pin=len(registry),
        voice_slice_source="docs/specs/QUESTION_VOICE.md",
        voice_slice_commit=voice_commit if voice_clean else None,
        batch_nodes=[GOLD_NODE_ID],
        dry_run=True,
        notes={"purpose": "acceptance dry run — gold node as synthetic single-node batch"},
    )

    # -- 1. F-DEP preconditions (real files) ---------------------------------
    print("[1] F-DEP precondition check (real frozen inputs)")
    problems = precondition_check(manifest)
    ck.record("F-DEP preconditions PASS with real files", not problems,
              "; ".join(problems) if problems else
              f"registry {len(registry)}@{manifest.graph_version_pin} "
              f"(baseline {config.BASELINE_REGISTRY_COUNT}@{config.BASELINE_GRAPH_VERSION}), "
              f"archetype lib {config.ARCHETYPE_LIBRARY_VERSION}, "
              f"voice pin {str(voice_commit)[:12]}")

    # -- 2. prefix assembly (real) --------------------------------------------
    print("\n[2] cached-prefix assembly (§4.1 render order)")
    derived = config.load_derived_manifest()
    manifest_row = derived["nodes"][MANIFEST_ROW_NODE_ID]
    ck.record("derived manifest row loaded (real shape; gold node excluded)",
              manifest_row["class"] == "conceptual"
              and set(manifest_row["archetypeQuotas"])
              == set(config.ITEM_BANK_ARCHETYPES)
              and GOLD_NODE_ID in derived.get("excludedNodes", {})
              and GOLD_NODE_ID not in derived["nodes"],
              f"{MANIFEST_ROW_NODE_ID} row: enrichedTotal="
              f"{manifest_row['enrichedTotal']}, splitPreemptively="
              f"{manifest_row['splitPreemptively']}; {GOLD_NODE_ID} excluded "
              f"(frozen gold)")
    archetype_ids = list(manifest_row["archetypeQuotas"].keys())
    exemplar_tags = {t for i in gold_items for _, t in validate._iter_item_tags(i) if t}
    schema_json = json.dumps(validate.ENRICHED_NODE_SCHEMA, indent=1)
    assembled = None
    try:
        assembled = prefix.assemble_prefix(
            graph, domains=["linear"], archetype_ids=archetype_ids,
            output_schema_json=schema_json, exemplar_tags=exemplar_tags,
        )
        ck.record("prefix renders with real files", True,
                  f"{len(assembled.blocks)} blocks, voice pin {assembled.voice_slice_commit[:12]}")
    except FDepError as e:
        ck.record("prefix renders with real files", False, str(e))

    if assembled:
        order = ["system", "output-schema", "taxonomy-keying-contract",
                 "registry-slice", "voice-contract-slice", "archetype-templates"]
        ck.record("render order matches §4.1", list(assembled.breakdown) == order)
        ck.record("cache_control breakpoint on LAST shared block",
                  "cache_control" in assembled.blocks[-1]
                  and not any("cache_control" in b for b in assembled.blocks[:-1]))
        voice_text = assembled.blocks[order.index("voice-contract-slice")]["text"]
        ck.record("voice slice contains §10+§3+§9 content",
                  all(s in voice_text for s in
                      ("Voice contract", "Ask phrasing catalog", "Divergence table")))
        budget = config.PREFIX_TOKEN_BUDGET
        est = assembled.token_estimate
        ck.record("prefix token estimate computed", True,
                  f"~{est:,} tokens vs ~{budget:,} budget "
                  f"({'OVER by ' + format(est - budget, ',') if est > budget else 'under'}); "
                  "breakdown: " + ", ".join(f"{k}={v:,}" for k, v in assembled.breakdown.items()))

    # -- 3. deliberate hard-stop tests ----------------------------------------
    print("\n[3] F-DEP hard-stop tests (must FAIL to render)")
    try:
        prefix.assemble_prefix(graph, ["linear"], archetype_ids, schema_json,
                               exemplar_tags, question_voice_md=_withheld_voice_md())
        ck.record("voice slice WITHHELD -> F-DEP hard stop", False,
                  "prefix rendered — hard stop DID NOT fire")
    except FDepError as e:
        ck.record("voice slice WITHHELD -> F-DEP hard stop", True, e.problems[0][:120])
    try:
        prefix.assemble_prefix(graph, ["linear"], archetype_ids, schema_json,
                               exemplar_tags, voice_commit_override=(None, False))
        ck.record("voice slice UNPINNED -> F-DEP hard stop", False,
                  "prefix rendered — hard stop DID NOT fire")
    except FDepError as e:
        ck.record("voice slice UNPINNED -> F-DEP hard stop", True, e.problems[0][:120])

    # -- 4. payload render ------------------------------------------------------
    print("\n[4] per-node payload render (ALG-L06)")
    exemplars = payload.select_gold_exemplars(gold_items, archetype_ids)
    reqs = payload.render_node_requests(source_node, assembled.blocks if assembled else [],
                                        exemplars, manifest_row,
                                        validate.ENRICHED_NODE_SCHEMA)
    r = reqs[0]
    ck.record("custom_id = node id", r["custom_id"] == GOLD_NODE_ID)
    ck.record("model + max_tokens pinned",
              r["params"]["model"] == config.GENERATION_MODEL
              and r["params"]["max_tokens"] == config.MAX_TOKENS,
              f"{r['params']['model']}, max_tokens={r['params']['max_tokens']}")
    oc = r["params"]["output_config"]
    # Verified API shape (2026-07-06 pre-smoke): format is a nested object
    # {type: "json_schema", schema: {...}} - the old flat rendering 400s.
    # The wire schema must also satisfy structured-output limits: every object
    # carries additionalProperties:false and no min/max-class constraints.
    fmt = oc.get("format") or {}
    wire = fmt.get("schema") or {}

    def _wire_clean(obj):
        if isinstance(obj, dict):
            if obj.get("type") == "object" and obj.get("additionalProperties") is not False:
                return False
            if any(k in obj for k in payload._UNSUPPORTED_WIRE_KEYS):
                return False
            return all(_wire_clean(v) for v in obj.values())
        if isinstance(obj, list):
            return all(_wire_clean(v) for v in obj)
        return True

    ck.record("structured output: output_config.format nested json_schema (verified API shape)",
              isinstance(fmt, dict) and fmt.get("type") == "json_schema"
              and isinstance(wire, dict) and bool(wire),
              "format={type: json_schema, schema: {...}}")
    ck.record("wire schema API-safe (additionalProperties:false everywhere, no unsupported constraints)",
              _wire_clean(wire))
    ck.record("2-3 archetype-matched exemplars injected",
              2 <= len(exemplars) <= 3,
              f"{len(exemplars)}: " + ", ".join(f"{e['id']}({e['phase']})" for e in exemplars))
    vol = r["params"]["messages"][0]["content"][0]["text"]
    ck.record("volatile payload carries trimmed node + manifest row + exemplars",
              all(s in vol for s in ("TARGET NODE", "MANIFEST CLASS ROW", "GOLD EXEMPLARS"))
              and '"problems"' not in vol,
              f"~{config.estimate_tokens(vol):,} tokens")

    split_row = dict(manifest_row, splitPreemptively=True)
    split_reqs = payload.render_node_requests(source_node, [], exemplars, split_row,
                                              validate.ENRICHED_NODE_SCHEMA)
    ck.record("splitPreemptively -> 3 phase-suffixed requests",
              [q["custom_id"] for q in split_reqs] ==
              [f"{GOLD_NODE_ID}::P1", f"{GOLD_NODE_ID}::P2", f"{GOLD_NODE_ID}::P3"])

    # F-OVERFLOW merge path, exercised on the real gold items split by phase
    frags = {p: {"nodeId": GOLD_NODE_ID,
                 "items": [i for i in gold_items if i["phase"] == p]}
             for p in config.PHASES}
    expectations = [FragmentExpectation(p, 1) for p in config.PHASES]
    merged = merge_fragments(frags, expectations)
    ck.record("F-OVERFLOW host-side merge preserves all items",
              len(merged["items"]) == len(gold_items),
              f"{len(merged['items'])}/{len(gold_items)} after P1/P2/P3 merge")
    bad = validate_fragments_before_merge(
        {p: v for p, v in frags.items() if p != "P2"}, expectations)
    ck.record("per-fragment validation BEFORE merge catches a missing fragment",
              any("P2" in b for b in bad), "; ".join(bad))
    ck.record("F-PARTIAL keys by custom_id, never position",
              detect_partial([
                  {"custom_id": "A", "result": {"type": "succeeded"}},
                  {"custom_id": "B", "result": {"type": "errored"}},
                  {"custom_id": "C", "result": {"type": "expired"}},
              ]) == ["B", "C"])
    halted, why = drift_check([{"audit": {"passRate": r_}} for r_ in (0.98, 0.90, 0.80)])
    ck.record("F-DRIFT trend check halts on 2-batch degradation", halted, why)

    # -- 5. §5.2 validators on the real gold items ------------------------------
    print("\n[5] host-side §5.2 validation of gold-node-items.json (15 items)")
    validation = validate.validate_items(gold_items, source_node, registry, mode="gold")
    ck.record("strict schema (gold-adapted GOLD_ITEM_SCHEMA)",
              validation["schema"]["pass"],
              "; ".join(validation["schema"]["errors"][:3]) or "0 errors")
    ck.record("tag existence vs real 163-entry registry (GENUINE)",
              validation["taxonomy"]["pass"],
              f"{validation['taxonomy']['tagsChecked']} tags checked, "
              f"{len(validation['taxonomy']['unknownTags'])} unknown")
    st = validation["structural"]["checks"]
    ck.record("P3 non-empty + phases present (GENUINE)",
              st["phasesPresentP3NonEmpty"]["pass"],
              json.dumps(st["phasesPresentP3NonEmpty"]["counts"]))
    ck.record("P3 all-neutral (GENUINE)", st["p3Neutral"]["pass"])
    ck.record(">=1 P3 scaffolded instance (GENUINE)", st["p3ScaffoldedPresent"]["pass"])
    ck.record("hint-ladder refs cover every used tag (gold-adapted, GENUINE data)",
              st["hintLadder"]["pass"],
              str(st["hintLadder"]["detail"] or "hintLadderRef.perTag complete on all 15"))
    ck.record("skillId match (GENUINE)", st["skillIdMatch"]["pass"])
    ck.record("standards preserved (gold-adapted: per-item standard in node ccss)",
              st["standardsPreserved"]["pass"])
    ck.record("prereqs check correctly reported gold-N/A",
              st["prereqsUnchanged"].get("skipped") is True)
    ck.record("solver hook runs as stub (skipped, not fake-pass)",
              validation["solver"]["counts"]["skipped"] == len(gold_items)
              and validation["solver"]["counts"]["pass"] == 0)
    ck.record("overall verdict VALID", validation["verdict"] == "VALID",
              validation["verdict"])

    # deliberate F-TAG negative control: an unknown tag must fail
    poisoned = json.loads(json.dumps(gold_items[0]))
    poisoned["misconceptionMap"].append(
        {"trigger": "x", "tag": "not-a-real-tag", "signature": "negative control"})
    ck.record("F-TAG negative control (unknown tag fails)",
              validate.validate_items([poisoned], source_node, registry,
                                      mode="gold")["verdict"] == "F-TAG")

    gold_adapted = ["schema (per-item GOLD_ITEM_SCHEMA vs whole-node ENRICHED_NODE_SCHEMA)",
                    "difficulty band (gold extends to 4 for P3 stretch items; production 1-3)",
                    "prompt field (gold predict-reveal carries predictPrompt/resolvePrompt, no top-level prompt)",
                    "hintLadder (hintLadderRef coverage vs inline 3-rung ladder)",
                    "standardsPreserved (per-item standard vs node-level ccss equality)",
                    "prereqsUnchanged (N/A — items file carries no prereqs[])"]
    production_only_pending = ["solver check (stub until per-archetype solverContract wiring)",
                               "§5.2 step-5 voice bands (reference instrument: "
                               ".authoring-tmp/voice-corpus/tools/analyze.py; not in scope)"]

    # -- 6. sampler --------------------------------------------------------------
    print("\n[6] stratified audit sampler (§6.1)")
    ramp_expect = [
        (0, [], config.AUDIT_RATE_INITIAL),
        (1, [True], config.AUDIT_RATE_INITIAL),
        (2, [True, True], config.AUDIT_RATE_STEPPED),
        (2, [True, False], config.AUDIT_RATE_INITIAL),
        (3, [True, True, False], config.AUDIT_RATE_INITIAL),   # reset on major
        (4, [False, False, True, True], config.AUDIT_RATE_STEPPED),
        (4, [True, True, False, True], config.AUDIT_RATE_INITIAL),
    ]
    ramp_ok = all(sampler.rate_for_batch(i, h) == want for i, h, want in ramp_expect)
    ck.record("rate ramp truth table (10% -> 5% after 2 consecutive clean; reset on major)",
              ramp_ok)
    units = sampler.units_from_node(GOLD_NODE_ID, gold_items)
    picked = sampler.stratified_sample(units, sampler.rate_for_batch(0, []), seed=7)
    strata = sampler.stratify(units)
    covered = {(u.node_id, u.item_form) for u in picked}
    ck.record("every node x item-form stratum sampled",
              covered == set(strata),
              f"{len(picked)} sampled across {len(strata)} strata "
              f"(guarantee dominates 10% of 15 = 2)")
    ck.record("sample is deterministic under seed",
              [u.item_id for u in sampler.stratified_sample(units, 0.10, seed=7)]
              == [u.item_id for u in picked])

    # -- 7. staging ---------------------------------------------------------------
    print("\n[7] staging under .authoring-tmp/regen/_dryrun/")
    area = staging.StagingArea(config.DRYRUN_ROOT)
    area.init_run(manifest)
    area.write_raw(GOLD_NODE_ID, gold_doc)
    area.write_node(GOLD_NODE_ID, {"nodeId": GOLD_NODE_ID,
                                   "prereqs": source_node["prereqs"],
                                   "standards": source_node["standards"],
                                   "items": gold_items})
    area.write_validation(GOLD_NODE_ID, validation)
    status_path = area.node_dir(GOLD_NODE_ID) / "status"
    if status_path.exists():
        status_path.unlink()   # idempotent re-runs
    area.set_status(GOLD_NODE_ID, "PENDING")
    area.set_status(GOLD_NODE_ID, "VALID")
    ck.record("status transitions PENDING -> VALID", area.get_status(GOLD_NODE_ID) == "VALID")
    try:
        area.set_status(GOLD_NODE_ID, "PENDING")
        ck.record("illegal transition rejected", False, "VALID -> PENDING was allowed")
    except staging.StatusTransitionError as e:
        ck.record("illegal transition rejected", True, str(e))
    area.write_audit(GOLD_NODE_ID, {
        "note": "dry run — no live audit sub-batch submitted (session gate)",
        "sampledItemIds": [u.item_id for u in picked],
        "strata": sorted(f"{n}/{f}" for n, f in strata),
    })

    report = {
        "runId": manifest.run_id,
        "generatedAt": _dt.datetime.now().isoformat(timespec="seconds"),
        "sessionGates": "no registry mutations, no graph edits, no Supabase, NO LIVE API CALLS",
        "pins": manifest.to_json(),
        "prefix": None if not assembled else {
            "tokenEstimate": assembled.token_estimate,
            "budget": config.PREFIX_TOKEN_BUDGET,
            "breakdown": assembled.breakdown,
            "voiceSliceCommit": assembled.voice_slice_commit,
        },
        "validation": validation,
        "goldSchemaAdaptedChecks": gold_adapted,
        "productionOnlyOrPending": production_only_pending,
        "sampler": {"rate": sampler.rate_for_batch(0, []),
                    "sampled": [u.item_id for u in picked],
                    "strataCount": len(strata)},
        "checks": ck.results,
        "allPass": ck.all_pass,
    }
    area.write_batch_report(0, {
        "batch": 0, "dryRun": True, "nodes": [GOLD_NODE_ID],
        "validation": {GOLD_NODE_ID: validation["verdict"]},
        "audit": {"passRate": None,
                  "note": "not run — live audit prohibited this session"},
        "costActuals": None,
    })
    (config.DRYRUN_ROOT / "dryrun-report.json").write_text(
        json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")

    print(f"\n=== DRY RUN {'GREEN' if ck.all_pass else 'RED'} — "
          f"{sum(r['pass'] for r in ck.results)}/{len(ck.results)} checks passed ===")
    print(f"report: {config.DRYRUN_ROOT / 'dryrun-report.json'}")
    return 0 if ck.all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
