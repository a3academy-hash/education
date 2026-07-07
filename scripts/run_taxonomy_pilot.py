"""run_taxonomy_pilot.py — thin CLI wiring for the taxonomy pilot (ALG-L19,
ALG-L11, ALG-L09) over the existing harness modules. TAXONOMY_REGEN_SPEC
§1.3 pipeline stages, §9 staging contract.

Subcommands:
  smoke     the ONE approved verification call (nested output_config shape)
  draft     TAX_DRAFT pass (opus) for the three pilot nodes, one batch
  judgment  TAX_JUDGMENT pass (fable) consuming each staged draft
  checks    full deterministic chain per node -> harness-report.json + status
  status    staging + batch state (no network unless --live)

GUARDS (never weakened, only layered):
  - every network path requires the explicit --live flag AND ANTHROPIC_API_KEY
    in the environment (PilotGuardError otherwise — no request is even built);
  - submission goes through orchestrate.submit_batch, which ALSO requires an
    existing batch manifest and a passing F-DEP precondition check;
  - a cost-bounded confirmation line is printed before any submission, and a
    hard spend ceiling (MAX_SPEND_CEILING_USD) refuses oversized batches;
  - without --live, smoke/draft/judgment render a dry preview and exit 0.

stdlib only (urllib in the existing modules). No SDK. Never commits.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error

# Windows cp1252 console guard
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

_SCRIPTS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPTS)                                # regen_harness pkg
sys.path.insert(0, os.path.join(_SCRIPTS, "taxonomy_harness"))  # flat modules

import adapters                                    # noqa: E402
import citations                                   # noqa: E402
import config as tax                               # noqa: E402  (taxonomy_harness/config.py)
import orchestrate                                 # noqa: E402
from regen_harness.payload import to_wire_schema   # noqa: E402
from regen_harness.submit import (                 # noqa: E402
    CONFIRMATION_PHRASE, stream_results)


# ---------------------------------------------------------------------------
# Pins (pilot slice — spec §7; models/token caps come from taxonomy config)
# ---------------------------------------------------------------------------
PILOT_NODES = ("ALG-L19", "ALG-L11", "ALG-L09")
PILOT_BATCH_ID = "batch-pilot-1"
SMOKE_BATCH_ID = "batch-smoke"
SMOKE_STAGE_ID = "_smoke"                 # stages under .authoring-tmp/taxonomies/_smoke/
SMOKE_CUSTOM_ID = "smoke-output-config-r0"
SMOKE_MAX_TOKENS = 256

SMOKE_POLL_INTERVAL_S = 30                # approved cadence: every 30s
SMOKE_POLL_CAP_S = 30 * 60                # cap 30min
PASS_POLL_INTERVAL_S = 60
PASS_POLL_CAP_S = 6 * 3600

# Batch API $/1M tokens — planning numbers from TAXONOMY_REGEN_SPEC §1.1-§1.3
# cost basis. Used ONLY for the printed estimate/ceiling; actuals come from
# response.usage.
PRICING_PER_MTOK = {
    tax.TAX_DRAFT_MODEL: (2.50, 12.50),       # claude-opus-4-8
    tax.TAX_JUDGMENT_MODEL: (5.00, 25.00),    # claude-fable-5
}
MAX_SPEND_CEILING_USD = 5.00              # pilot-scale hard bound per submission

# The smoke call's trivial 2-field schema (rendered through the SAME corrected
# nested output_config shape regen payload.py pins — the shape under test).
SMOKE_SCHEMA = {
    "type": "object",
    "properties": {
        "ok": {"type": "boolean"},
        "note": {"type": "string"},
    },
    "required": ["ok", "note"],
}


class PilotGuardError(RuntimeError):
    """A network path was reached without --live and/or ANTHROPIC_API_KEY.
    Raised BEFORE any request object is built."""


class PilotHTTPError(RuntimeError):
    """Non-2xx from the Batches API, body preserved for the F-DEP verdict."""

    def __init__(self, code: int, body: str, where: str):
        super().__init__(f"HTTP {code} during {where}")
        self.code, self.body, self.where = code, body, where


# ---------------------------------------------------------------------------
# Guards + network wrappers (existing guards re-used underneath, never bypassed)
# ---------------------------------------------------------------------------
def _guard_network(live: bool, what: str) -> None:
    problems = []
    if not live:
        problems.append("--live flag not set")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        problems.append("ANTHROPIC_API_KEY not set in the environment")
    if problems:
        raise PilotGuardError(
            f"{what} refused: " + "; ".join(problems)
            + " — no network call constructed")


def _submit(requests: list[dict], batch_id: str, live: bool) -> dict:
    """orchestrate.submit_batch (live + key + manifest + F-DEP guards inside),
    with the HTTP error body surfaced instead of a bare traceback."""
    _guard_network(live, "batch submission")
    try:
        return orchestrate.submit_batch(requests, batch_id, live=live)
    except urllib.error.HTTPError as e:
        raise PilotHTTPError(
            e.code, e.read().decode("utf-8", "replace"),
            f"POST /v1/messages/batches ({batch_id})") from e


def _poll_until_ended(remote_id: str, live: bool,
                      interval_s: int, cap_s: int) -> dict:
    _guard_network(live, "batch polling")
    deadline = time.monotonic() + cap_s
    while True:
        try:
            batch = orchestrate.poll_batch(remote_id, live=live)
        except urllib.error.HTTPError as e:
            raise PilotHTTPError(
                e.code, e.read().decode("utf-8", "replace"),
                f"GET /v1/messages/batches/{remote_id}") from e
        status = batch.get("processing_status")
        print(f"  poll [{time.strftime('%H:%M:%S')}]: {status} "
              f"{batch.get('request_counts', {})}")
        if status == "ended":
            return batch
        if time.monotonic() >= deadline:
            raise TimeoutError(
                f"batch {remote_id} not ended within {cap_s}s "
                f"(last status: {status}) — re-run later; the batch id is "
                f"recorded in the manifest")
        time.sleep(interval_s)


def _fetch_results(batch: dict, live: bool) -> tuple[dict[str, dict], list[str]]:
    """Results keyed by custom_id — NEVER by position (F-PARTIAL rule).
    Delegates to regen_harness.submit.stream_results, whose own guard is
    re-checked here; the confirmation phrase is supplied at this single call
    site only after --live + key held and the confirmation line printed."""
    _guard_network(live, "results fetch")
    return stream_results(batch, live=live, confirm=CONFIRMATION_PHRASE)


# ---------------------------------------------------------------------------
# Estimation + confirmation line
# ---------------------------------------------------------------------------
def _estimate(requests: list[dict]) -> dict:
    rows, tot_in, tot_out_cap, ceiling = [], 0, 0, 0.0
    for r in requests:
        p = r["params"]
        blob = json.dumps(p.get("system", "")) + json.dumps(p["messages"]) \
            + json.dumps(p.get("output_config", ""))
        est_in = max(1, len(blob) // 4)           # chars/4 planning heuristic
        out_cap = p["max_tokens"]
        in_rate, out_rate = PRICING_PER_MTOK[p["model"]]
        cost = (est_in * in_rate + out_cap * out_rate) / 1e6
        rows.append({"custom_id": r["custom_id"], "model": p["model"],
                     "est_in_tok": est_in, "out_cap_tok": out_cap,
                     "cost_ceiling_usd": round(cost, 4)})
        tot_in += est_in
        tot_out_cap += out_cap
        ceiling += cost
    return {"rows": rows, "requests": len(requests), "est_in_tok": tot_in,
            "out_cap_tok": tot_out_cap, "cost_ceiling_usd": round(ceiling, 4)}


# payload-section markers (GAP 1/2/4 injection visibility in dry previews)
_SECTION_MARKERS = (
    ("pilot-obligations", "PILOT OBLIGATIONS"),
    ("pilot-notes", "PILOT NOTES"),
    ("binding-constraint", "BINDING CONSTRAINT"),
    ("machine-block-contract", adapters.MACHINE_BLOCK_TAG),
    ("citations-delta-contract", adapters.CITATIONS_DELTA_TAG),
)


def _request_sections(request: dict) -> list[str]:
    blob = json.dumps(request["params"], ensure_ascii=False)
    return [name for name, marker in _SECTION_MARKERS if marker in blob]


def _print_payload_summary(title: str, est: dict,
                           requests: list[dict] | None = None) -> None:
    print(f"--- {title}: rendered payload summary ---")
    print(f"{'custom_id':<28} {'model':<18} {'est_in':>8} {'out_cap':>8} "
          f"{'ceiling$':>9}")
    by_cid = {r["custom_id"]: r for r in (requests or [])}
    for r in est["rows"]:
        print(f"{r['custom_id']:<28} {r['model']:<18} {r['est_in_tok']:>8,} "
              f"{r['out_cap_tok']:>8,} {r['cost_ceiling_usd']:>9.4f}")
        req = by_cid.get(r["custom_id"])
        if req is not None:
            sections = _request_sections(req)
            print(f"{'':<4}sections: "
                  f"{', '.join(sections) if sections else '(none)'}")
    print(f"requests: {est['requests']} | est input ~{est['est_in_tok']:,} tok "
          f"| output cap {est['out_cap_tok']:,} tok | cost ceiling "
          f"${est['cost_ceiling_usd']:.4f} (Batch rates, cache discount not "
          f"credited — true cost lower)")


def _confirm_spend(title: str, est: dict) -> None:
    """The cost-bounded confirmation line, printed BEFORE submission; refuses
    anything over the pilot-scale hard ceiling."""
    if est["cost_ceiling_usd"] > MAX_SPEND_CEILING_USD:
        raise PilotGuardError(
            f"{title}: cost ceiling ${est['cost_ceiling_usd']:.4f} exceeds the "
            f"pilot hard bound ${MAX_SPEND_CEILING_USD:.2f} — refusing")
    print(f"CONFIRM SPEND [{title}]: {est['requests']} request(s), cost "
          f"ceiling ${est['cost_ceiling_usd']:.4f} "
          f"(<= ${MAX_SPEND_CEILING_USD:.2f} bound) — submitting under "
          f"--live + ANTHROPIC_API_KEY.")


def _dry_exit(title: str, requests: list[dict], fdep: list[str]) -> int:
    _print_payload_summary(title, _estimate(requests), requests)
    if fdep:
        print("F-DEP findings (would hard-stop a live submission):")
        for f in fdep:
            print(f"  - {f}")
    print("dry preview - pass --live to submit")
    return 0


# ---------------------------------------------------------------------------
# Manifest + result helpers
# ---------------------------------------------------------------------------
def _record_remote(batch_id: str, passname: str, remote: dict) -> None:
    """Record the API-side batch id in the batch's _manifest.json."""
    path = tax.batch_manifest_path(batch_id)
    with open(path, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest.setdefault("remoteBatches", {})[passname] = {
        "id": remote.get("id"),
        "createdAt": remote.get("created_at"),
        "processingStatus": remote.get("processing_status"),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)


def _load_manifest(batch_id: str) -> dict | None:
    path = tax.batch_manifest_path(batch_id)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _result_message(entry: dict) -> tuple[str | None, dict, str | None]:
    """(text, usage, stop_reason) for a succeeded entry; text None otherwise."""
    r = entry.get("result", {})
    if r.get("type") != "succeeded":
        return None, {}, None
    msg = r.get("message", {})
    text = "".join(b.get("text", "") for b in msg.get("content", [])
                   if b.get("type") == "text")
    return text, msg.get("usage", {}), msg.get("stop_reason")


def _stage_pass_results(keyed: dict[str, dict], failed: list[str],
                        cid_for: dict[str, str], out_name: str) -> list[str]:
    """Stage per-node text results. Returns node ids that did NOT stage clean.
    F-PARTIAL convention: succeeded nodes proceed; errored/expired/missing ids
    are reported for resubmission ONLY (never re-keyed by position)."""
    bad_nodes = []
    for node_id, cid in cid_for.items():
        entry = keyed.get(cid)
        if entry is None or cid in failed:
            rtype = (entry or {}).get("result", {}).get("type", "missing")
            print(f"  {node_id}: {cid} -> {rtype} (F-PARTIAL)")
            bad_nodes.append(node_id)
            continue
        text, usage, stop = _result_message(entry)
        if text is None:
            print(f"  {node_id}: {cid} -> unrecognized result shape (F-PARTIAL)")
            bad_nodes.append(node_id)
            continue
        if stop == "max_tokens":
            path = orchestrate.write_stage(
                node_id, out_name.replace(".md", ".truncated.md"), text)
            print(f"  {node_id}: F-OVERFLOW (stop_reason=max_tokens) — staged "
                  f"truncated output at {path}; NOT staged as {out_name}")
            bad_nodes.append(node_id)
            continue
        path = orchestrate.write_stage(node_id, out_name, text)
        print(f"  {node_id}: staged {path} "
              f"(usage: in={usage.get('input_tokens')}, "
              f"out={usage.get('output_tokens')})")
    if failed:
        print(f"F-PARTIAL: resubmit ONLY these custom_ids in a follow-up "
              f"batch: {failed}")
    return bad_nodes


def _extract_citations_delta(text: str) -> tuple[dict | None, dict | None]:
    """GAP 4 — contract-required extraction of the fenced
    ```json citations-delta``` block (spec §2.4/§9). Returns
    (delta, None) on success or (None, F-STRUCT finding) — a missing or
    malformed block is staged as a finding, never a silent placeholder."""
    raw = adapters.find_fenced_json_block(text, adapters.CITATIONS_DELTA_TAG)
    if raw is None:
        return None, {"class": "F-STRUCT", "layer": "citations-delta",
                      "detail": "no fenced ```json citations-delta``` block "
                                "in the judgment output — the §2.4/§9 "
                                "contract is unmet (regen input, not a "
                                "repairable omission)"}
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        return None, {"class": "F-STRUCT", "layer": "citations-delta",
                      "detail": f"citations-delta block is not valid JSON: "
                                f"{e}"}
    if not (isinstance(obj, dict)
            and isinstance(obj.get("newCitations"), list)
            and isinstance(obj.get("reusedCitations"), list)):
        return None, {"class": "F-STRUCT", "layer": "citations-delta",
                      "detail": "citations-delta block must be an object "
                                "with newCitations[] and reusedCitations[] "
                                f"(got keys {sorted(obj) if isinstance(obj, dict) else type(obj).__name__})"}
    return obj, None


def _taxonomy_builder():
    """Generic taxonomy.md -> Taxonomy builder. The machine-block adapter
    (taxonomy_harness/adapters.py, GAP 2) is the shipping path; a later
    signatures.build_taxonomy override is still probed first."""
    import signatures
    for name in ("build_taxonomy", "build_node_taxonomy"):
        fn = getattr(signatures, name, None)
        if fn is not None:
            return fn
    return adapters.build_taxonomy


# ---------------------------------------------------------------------------
# Subcommand: smoke — the ONE approved verification call
# ---------------------------------------------------------------------------
def _render_smoke_request() -> dict:
    return {
        "custom_id": SMOKE_CUSTOM_ID,
        "params": {
            "model": tax.TAX_DRAFT_MODEL,          # claude-opus-4-8 pin
            "max_tokens": SMOKE_MAX_TOKENS,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": "Return the object."}]}],
            # the corrected NESTED shape (regen payload.py convention) —
            # exactly what this smoke call exists to verify at HTTP acceptance
            "output_config": {
                "format": {
                    "type": "json_schema",
                    "schema": to_wire_schema(SMOKE_SCHEMA),
                },
            },
        },
    }


def cmd_smoke(args) -> int:
    requests = [_render_smoke_request()]
    if not args.live:
        return _dry_exit("smoke", requests, tax.check_preconditions(None))
    _guard_network(args.live, "smoke")

    citations.seed_registry()                       # F-DEP: never overwrites
    tax.ensure_batch_layout(SMOKE_BATCH_ID, nodes=[])
    fdep = tax.check_preconditions(SMOKE_BATCH_ID)
    if fdep:
        print("F-DEP hard stop (unmet preconditions):")
        for f in fdep:
            print(f"  - {f}")
        return 2

    est = _estimate(requests)
    _print_payload_summary("smoke", est, requests)
    _confirm_spend("smoke", est)
    try:
        remote = _submit(requests, SMOKE_BATCH_ID, live=True)
    except PilotHTTPError as e:
        print(f"HTTP {e.code} at batch creation — the param shape was "
              f"REJECTED at acceptance. F-DEP verdict on the nested "
              f"output_config shape. Error body:")
        print(e.body)
        orchestrate.write_stage(SMOKE_STAGE_ID, "http-error.json",
                                {"code": e.code, "where": e.where,
                                 "body": e.body})
        print("STOP — fix the payload shape before any pilot batch.")
        return 2
    print(f"HTTP acceptance: PASS — batch {remote.get('id')} created "
          f"(the nested output_config shape is accepted).")
    _record_remote(SMOKE_BATCH_ID, "smoke", remote)
    orchestrate.write_stage(SMOKE_STAGE_ID, "batch.json", remote)

    batch = _poll_until_ended(remote["id"], True,
                              SMOKE_POLL_INTERVAL_S, SMOKE_POLL_CAP_S)
    keyed, failed = _fetch_results(batch, True)     # keyed by custom_id
    orchestrate.write_stage(SMOKE_STAGE_ID, "results.json", keyed)
    entry = keyed.get(SMOKE_CUSTOM_ID)
    if entry is None or failed:
        print(f"F-PARTIAL: smoke entry errored/expired/missing "
              f"(failed={failed}) — see _smoke/results.json")
        return 2

    text, usage, stop = _result_message(entry)
    parse_ok, parsed = False, None
    if text is not None:
        try:
            parsed = json.loads(text)
            parse_ok = isinstance(parsed, dict) and {"ok", "note"} <= parsed.keys()
        except json.JSONDecodeError:
            parse_ok = False
    report = {
        "httpAcceptance": "PASS",
        "batchId": remote.get("id"),
        "stopReason": stop,
        "resultParse": "PASS" if parse_ok else "FAIL",
        "parsed": parsed,
        "usageActuals": usage,
    }
    orchestrate.write_stage(SMOKE_STAGE_ID, "report.json", report)
    print(f"result parse: {'PASS' if parse_ok else 'FAIL'} — {parsed!r}")
    print(f"usage actuals: {usage}")
    return 0 if parse_ok else 1


# ---------------------------------------------------------------------------
# Subcommand: draft
# ---------------------------------------------------------------------------
def _render_draft_requests() -> list[dict]:
    graph = tax.load_graph()
    cmap = tax.load_confusable_map()
    requests = []
    for node_id in PILOT_NODES:
        cls = tax.NODE_CLASS.get(node_id)
        if cls is None:
            raise tax.FDepError(f"F-DEP: no signed MANIFEST class for "
                                f"{node_id}")
        requests.append(orchestrate.render_draft_request(
            node_id, graph, cmap, cls))
    return requests


def cmd_draft(args) -> int:
    requests = _render_draft_requests()
    if not args.live:
        return _dry_exit("draft (TAX_DRAFT, 3 pilot nodes)", requests,
                         tax.check_preconditions(None))
    _guard_network(args.live, "draft")

    citations.seed_registry()
    tax.ensure_batch_layout(PILOT_BATCH_ID, nodes=list(PILOT_NODES))
    fdep = tax.check_preconditions(PILOT_BATCH_ID)
    if fdep:
        print("F-DEP hard stop (unmet preconditions):")
        for f in fdep:
            print(f"  - {f}")
        return 2

    est = _estimate(requests)
    _print_payload_summary("draft", est, requests)
    _confirm_spend("draft", est)
    try:
        remote = _submit(requests, PILOT_BATCH_ID, live=True)
    except PilotHTTPError as e:
        print(f"HTTP {e.code} at draft batch creation. Error body:")
        print(e.body)
        return 2
    print(f"batch accepted: {remote.get('id')}")
    _record_remote(PILOT_BATCH_ID, "draft", remote)

    batch = _poll_until_ended(remote["id"], True,
                              PASS_POLL_INTERVAL_S, PASS_POLL_CAP_S)
    keyed, failed = _fetch_results(batch, True)     # keyed by custom_id
    cid_for = {n: f"tax-draft-{n}-r0" for n in PILOT_NODES}
    bad = _stage_pass_results(keyed, failed, cid_for, "draft.md")
    bad += _draft_stage_checks([n for n in PILOT_NODES if n not in bad])
    return 1 if bad else 0


def _draft_stage_checks(node_ids: list[str]) -> list[str]:
    """GAP 2c/GAP 3 input production — spec §1.3 step 2 on each staged draft:
    parse the draft's machine block (adapters), run computability +
    satisfiability, compute the §4.1 machine collision list, and stage
    draft-collisions.json + draft-harness-report.json (the judgment pass's
    injected inputs). DRAFT_VALID only on a clean draft check."""
    bad = []
    for node_id in node_ids:
        with open(os.path.join(tax.STAGING_ROOT, node_id, "draft.md"),
                  encoding="utf-8") as f:
            text = f.read()
        try:
            taxonomy = adapters.parse_machine_block(text)
        except adapters.AdapterError as e:
            orchestrate.write_stage(node_id, "draft-harness-report.json",
                                    {"stage": "draft (spec §1.3 step 2)",
                                     "failures": [e.finding],
                                     "status": "F-STRUCT"})
            print(f"  {node_id}: draft machine block rejected (F-STRUCT) — "
                  f"{e}")
            bad.append(node_id)
            continue
        machine, report = orchestrate.run_draft_stage_check(taxonomy)
        orchestrate.write_stage(node_id, "draft-collisions.json",
                                orchestrate.machine_jsonable(machine))
        orchestrate.write_stage(node_id, "draft-harness-report.json", report)
        if report["status"] == "DRAFT_VALID":
            orchestrate.set_status(node_id, "DRAFT_VALID")
            print(f"  {node_id}: draft-stage check PASS -> DRAFT_VALID "
                  f"({len(machine['structural'])} structural machine "
                  f"collision(s) staged)")
        else:
            print(f"  {node_id}: draft-stage F-SIG "
                  f"({len(report['failures'])} failure(s)) — one cheap "
                  f"redraft with the findings as negative constraints "
                  f"(spec §1.3 step 2); status stays PENDING")
            bad.append(node_id)
    return bad


# ---------------------------------------------------------------------------
# Subcommand: judgment
# ---------------------------------------------------------------------------
def _judgment_inputs(node_id: str) -> tuple[dict | None, list[str]]:
    """Load staged draft + machine collision list + draft harness report.
    Returns (inputs, missing-file list)."""
    node_dir = os.path.join(tax.STAGING_ROOT, node_id)
    paths = {
        "draft_md": os.path.join(node_dir, "draft.md"),
        "collisions": os.path.join(node_dir, "draft-collisions.json"),
        "report": os.path.join(node_dir, "draft-harness-report.json"),
    }
    missing = [p for p in paths.values() if not os.path.exists(p)]
    if missing:
        return None, missing
    with open(paths["draft_md"], encoding="utf-8") as f:
        draft_md = f.read()
    with open(paths["collisions"], encoding="utf-8") as f:
        machine_list = json.load(f)
    with open(paths["report"], encoding="utf-8") as f:
        report = json.load(f)
    return {"draft_md": draft_md, "machine_list": machine_list,
            "report": report}, []


def _render_judgment_requests() -> tuple[list[dict], list[str]]:
    graph = tax.load_graph()
    cmap = tax.load_confusable_map()
    registry = citations.seed_registry()            # loads if present
    requests, problems = [], []
    for node_id in PILOT_NODES:
        inputs, missing = _judgment_inputs(node_id)
        if missing:
            problems.extend(f"{node_id}: missing {m}" for m in missing)
            continue
        requests.append(orchestrate.render_judgment_request(
            node_id, inputs["draft_md"], inputs["machine_list"],
            inputs["report"], graph, cmap, registry))
    return requests, problems


def cmd_judgment(args) -> int:
    requests, problems = _render_judgment_requests()
    if problems:
        # §4.2: the machine collision list is INJECTED at generation — a
        # judgment request without it is not renderable, dry or live.
        print("judgment inputs missing (run draft + the draft-stage harness "
              "check first; the collision list/report are its outputs):")
        for p in problems:
            print(f"  - {p}")
        return 2
    if not args.live:
        return _dry_exit("judgment (TAX_JUDGMENT, 3 pilot nodes)", requests,
                         tax.check_preconditions(None))
    _guard_network(args.live, "judgment")

    fdep = tax.check_preconditions(PILOT_BATCH_ID)
    if fdep:
        print("F-DEP hard stop (unmet preconditions):")
        for f in fdep:
            print(f"  - {f}")
        return 2

    est = _estimate(requests)
    _print_payload_summary("judgment", est, requests)
    _confirm_spend("judgment", est)
    try:
        remote = _submit(requests, PILOT_BATCH_ID, live=True)
    except PilotHTTPError as e:
        print(f"HTTP {e.code} at judgment batch creation. Error body:")
        print(e.body)
        return 2
    print(f"batch accepted: {remote.get('id')}")
    _record_remote(PILOT_BATCH_ID, "judgment", remote)

    batch = _poll_until_ended(remote["id"], True,
                              PASS_POLL_INTERVAL_S, PASS_POLL_CAP_S)
    keyed, failed = _fetch_results(batch, True)     # keyed by custom_id
    cid_for = {n: f"tax-judgment-{n}-r0" for n in PILOT_NODES}
    bad = _stage_pass_results(keyed, failed, cid_for, "judgment.md")
    for node_id in PILOT_NODES:
        if node_id in bad:
            continue
        with open(os.path.join(tax.STAGING_ROOT, node_id, "judgment.md"),
                  encoding="utf-8") as f:
            text = f.read()
        # GAP 4: contract-required citations-delta — a missing/malformed
        # block stages as an F-STRUCT finding, never a silent placeholder
        delta, finding = _extract_citations_delta(text)
        if finding is not None:
            orchestrate.write_stage(node_id, "citations-delta.json",
                                    {"failures": [finding]})
            print(f"  {node_id}: citations-delta contract UNMET (F-STRUCT "
                  f"staged) — {finding['detail']}")
            bad.append(node_id)
            continue
        orchestrate.write_stage(node_id, "citations-delta.json", delta)
        # GAP 3: deterministic assembly (spec §1.3 step 4) — draft +
        # judgment machine blocks merged, taxonomy.md written, ASSEMBLED
        try:
            path = orchestrate.assemble_taxonomy(node_id)
        except (adapters.AdapterError, tax.FDepError) as e:
            print(f"  {node_id}: assembly failed — {e}")
            bad.append(node_id)
            continue
        print(f"  {node_id}: assembled {path} -> ASSEMBLED")
    return 1 if bad else 0


# ---------------------------------------------------------------------------
# Subcommand: checks — deterministic chain only; the kahn gate is AGENT-SIDE
# ---------------------------------------------------------------------------
def cmd_checks(args) -> int:
    builder = _taxonomy_builder()      # adapters.build_taxonomy (GAP 2c)

    graph = tax.load_graph()
    cmap = tax.load_confusable_map()
    registry_pin = tax.load_registry_pin(PILOT_BATCH_ID)   # F-DEP if absent
    registry = citations.seed_registry()

    rows = []
    for node_id in PILOT_NODES:
        doc_path = os.path.join(tax.STAGING_ROOT, node_id, "taxonomy.md")
        if not os.path.exists(doc_path):
            rows.append((node_id, "NO-DOC", "taxonomy.md not staged"))
            continue
        with open(doc_path, encoding="utf-8") as f:
            doc_text = f.read()
        try:
            taxonomy = builder(node_id, doc_text)
        except adapters.AdapterError as e:
            # a missing/malformed machine block is pilot data (F-STRUCT),
            # staged and quarantined — never repaired silently
            orchestrate.write_stage(node_id, "harness-report.json",
                                    {"failures": [e.finding],
                                     "status": "QUARANTINE"})
            orchestrate.set_status(node_id, "QUARANTINE")
            rows.append((node_id, "QUARANTINE", f"adapter F-STRUCT: {e}"))
            continue
        chain = orchestrate.run_check_chain(taxonomy, graph, cmap,
                                            registry_pin,
                                            citation_registry=registry)
        orchestrate.write_stage(node_id, "harness-report.json", chain)
        status = ("HARNESS_PASS" if chain["status"] == "HARNESS_PASS"
                  else "QUARANTINE")
        orchestrate.set_status(node_id, status)
        layer_summary = ", ".join(
            f"{name}:{'PASS' if not layer.get('failures') else 'FAIL'}"
            for name, layer in chain["layers"].items())
        rows.append((node_id, status, layer_summary))

    print(f"{'node':<10} {'status':<13} layers "
          f"(sig K={tax.K}, collisions+clusters, citations, structure, "
          f"routing, F-TAG)")
    print("-" * 78)
    for node_id, status, detail in rows:
        print(f"{node_id:<10} {status:<13} {detail}")
    print("-" * 78)
    print("deterministic chain complete — reports staged. The mr-kahn gate "
          "is agent-side; this script stops here.")
    return 0 if all(s == "HARNESS_PASS" for _, s, _ in rows) else 1


# ---------------------------------------------------------------------------
# Subcommand: status
# ---------------------------------------------------------------------------
def cmd_status(args) -> int:
    print(f"staging root: {tax.STAGING_ROOT}")
    print(f"pins: graph {tax.GRAPH_PIN_VERSION} | registry base "
          f"{tax.REGISTRY_BASE_COUNT} | map v{tax.CONFUSABLE_MAP_VERSION} | "
          f"draft {tax.TAX_DRAFT_MODEL} | judgment {tax.TAX_JUDGMENT_MODEL}")
    print()
    files = ("draft.md", "draft-collisions.json", "draft-harness-report.json",
             "judgment.md", "citations-delta.json", "assembly-report.json",
             "taxonomy.md", "harness-report.json")
    for node_id in PILOT_NODES + (SMOKE_STAGE_ID,):
        node_dir = os.path.join(tax.STAGING_ROOT, node_id)
        if not os.path.isdir(node_dir):
            print(f"{node_id:<10} (not staged)")
            continue
        status_path = os.path.join(node_dir, "status")
        status = "?"
        if os.path.exists(status_path):
            with open(status_path, encoding="utf-8") as f:
                status = f.read().strip()
        present = [fn for fn in files
                   if os.path.exists(os.path.join(node_dir, fn))]
        extra = [fn for fn in sorted(os.listdir(node_dir))
                 if fn not in files and fn != "status"]
        print(f"{node_id:<10} status={status:<13} files={present + extra}")
    print()
    remotes = []
    for batch_id in (PILOT_BATCH_ID, SMOKE_BATCH_ID):
        manifest = _load_manifest(batch_id)
        if manifest is None:
            print(f"{batch_id}: no manifest")
            continue
        rb = manifest.get("remoteBatches", {})
        print(f"{batch_id}: nodes={manifest.get('nodes')} "
              f"remoteBatches={ {k: v.get('id') for k, v in rb.items()} }")
        remotes.extend((batch_id, k, v.get("id")) for k, v in rb.items()
                       if v.get("id"))
    if args.live:
        _guard_network(True, "status --live poll")   # trip BEFORE any loop
        for batch_id, passname, remote_id in remotes:
            batch = orchestrate.poll_batch(remote_id, live=True)
            print(f"  {batch_id}/{passname} {remote_id}: "
                  f"{batch.get('processing_status')} "
                  f"{batch.get('request_counts', {})}")
    else:
        print("(local view only — pass --live to poll remote batch status)")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="run_taxonomy_pilot.py",
        description="Taxonomy pilot runner (ALG-L19/L11/L09). Dry preview by "
                    "default; every network path is guarded by --live + "
                    "ANTHROPIC_API_KEY (+ manifest + F-DEP at submission).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn, doc in (
            ("smoke", cmd_smoke, "the ONE approved output_config smoke call"),
            ("draft", cmd_draft, "TAX_DRAFT pass for the 3 pilot nodes"),
            ("judgment", cmd_judgment, "TAX_JUDGMENT pass over staged drafts"),
            ("checks", cmd_checks, "deterministic check chain -> reports"),
            ("status", cmd_status, "staging + batch state (local unless "
                                   "--live)")):
        p = sub.add_parser(name, help=doc)
        p.add_argument("--live", action="store_true",
                       help="required for any network call (plus env key)")
        p.set_defaults(fn=fn)
    args = ap.parse_args(argv)

    try:
        return args.fn(args)
    except (PilotGuardError, orchestrate.LiveGuardError) as e:
        print(f"{type(e).__name__}: {e}", file=sys.stderr)
        return 3
    except tax.FDepError as e:
        print(f"FDepError: {e}", file=sys.stderr)
        return 2
    except PilotHTTPError as e:
        print(f"{e}\n{e.body}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
