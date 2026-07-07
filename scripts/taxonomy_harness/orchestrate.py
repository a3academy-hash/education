"""orchestrate.py — the hybrid pipeline (TAXONOMY_REGEN_SPEC §1.3).

  1. render draft-pass payload   (TAX_DRAFT_MODEL, cached prefix per §1.4)
  2. render judgment-pass payload (TAX_JUDGMENT_MODEL)
  3. deterministic check chain   (§3 + §4 + structure + tag hygiene + routing)
  4. verdict staging             (.authoring-tmp/taxonomies/<NODE-ID>/...)

Batch submission exists but is TRIPLE-GUARDED: the --live flag AND the
ANTHROPIC_API_KEY env var AND an explicit batch-id argument are all required
before any network call is even constructed. This session never calls it
(dry-run only). urllib against /v1/messages/batches — NO anthropic SDK (a new
dependency is a Matt gate we are not taking).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request

import adapters
import citations
import collisions
import config
import routing
import sig_verify
import structure


class LiveGuardError(RuntimeError):
    """Raised whenever batch submission is attempted without the full triple
    guard (--live + ANTHROPIC_API_KEY + explicit batch-id)."""


# ---------------------------------------------------------------------------
# Prompt rendering (spec §1.4 — stable-before-volatile, cache_control on the
# last shared block; both passes go through the Message Batches API)
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are authoring a per-node misconception taxonomy for a deterministic "
    "adaptive-routing engine. Admission conditions, all four per entry: "
    "(1) names a belief, not a wrong output; (2) has a deterministic detection "
    "signature; (3) is distinguishable from every other entry by some "
    "observable — else document the collision and probe, or merge; "
    "(4) is grounded — cited research tradition, or honestly tiered "
    "tradition-adjacent / engineering-candidate with the mandated flags. "
    "Severity scale: BLOCKER = prerequisite-gap symptom routing backward; "
    "HIGH = frequent local stall; MEDIUM = yields to one targeted counter; "
    "LOW = tag, don't interrupt. Honesty rules, verbatim: never pad — the "
    "minimums are demand statements, not quotas; merge or document, never "
    "duplicate; severity is evidence-bearing; grounding or the flag. "
    "An invented misconception is worse than a missing one — it routes real "
    "students to remediation for beliefs they don't hold."
)


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _template_sections_2_to_5(template_text: str) -> str:
    start = template_text.find("## 2.")
    end = template_text.find("## 6.")
    return template_text[start:end] if start != -1 and end != -1 else template_text


def _node_json(graph, node_id):
    for n in graph["nodes"]:
        if n["id"] == node_id:
            return n
    raise KeyError(f"node {node_id} not in graph")


def _bank_error_slice(node):
    """Existing misconceptionMap keys + distractor patterns — the empirical
    error surface already observed (draft-pass input). `problems` is a
    phase-keyed dict {p1: [...], p2: [...], p3: [...]}."""
    out = []
    problems = node.get("problems") or {}
    for phase, items in sorted(problems.items()):
        for p in items:
            mm = p.get("misconceptionMap") or {}
            if mm:
                out.append({"id": p.get("id"), "phase": phase,
                            "misconceptionMap": mm})
    return out


def _confusable_rows(cmap, node_id):
    return [c for c in cmap["clusters"] if node_id in c.get("nodes", [])]


# ---------------------------------------------------------------------------
# Pilot GAP 1 — mechanical injection of kahn-ruled content into BOTH passes.
# Sources (cited, injected verbatim, never paraphrased):
#   - pilotObligations / pilotNotes: docs/specs/confusable-clusters.json
#     (APPROVED WITH CHANGES, mr-kahn gate 2, 2026-07-06 — the map version is
#     F-DEP-pinned in config.py);
#   - the binding presented-only authoring constraint L19's pilotNotes
#     reference: docs/specs/DECISION_F-IF-B6.md §7 application addendum
#     (mr-kahn ruling in the graph-1.12.0 batch, approved by Matt 2026-07-06).
# ---------------------------------------------------------------------------
_BINDING_CONSTRAINT_RE = re.compile(
    r"\*\*Binding authoring constraint[^:*]*:\*\*\s*\*[\"“](.+?)[\"”]\*",
    re.DOTALL)
_binding_cache: dict[str, str] = {}


def _binding_constraint_text() -> str:
    """Extract DECISION_F-IF-B6 §7's binding constraint verbatim. Extraction
    failure is F-DEP: rendering an L19 payload WITHOUT the binding constraint
    would drop a kahn ruling on the floor — refuse instead."""
    cached = _binding_cache.get("F-IF-B6")
    if cached is not None:
        return cached
    try:
        text = _read(config.DECISION_F_IF_B6_PATH)
    except OSError as e:
        raise config.FDepError(
            f"F-DEP: DECISION_F-IF-B6.md unreadable ({e}) — the binding "
            f"constraint referenced by pilotNotes cannot be injected")
    m = _BINDING_CONSTRAINT_RE.search(text)
    if m is None:
        raise config.FDepError(
            "F-DEP: DECISION_F-IF-B6.md §7 'Binding authoring constraint' "
            "text not found — the doc drifted from the extraction pattern; "
            "refusing to render the node without the kahn-ruled constraint")
    constraint = re.sub(r"\s+", " ", m.group(1)).strip()
    _binding_cache["F-IF-B6"] = constraint
    return constraint


def _pilot_injection_text(node_id, cmap) -> str:
    """Volatile-payload text for the node's pilot obligations, pilot notes
    (verbatim), and — where the notes reference it — the binding authoring
    constraint (L19 -> DECISION_F-IF-B6 §7). Empty string when none apply."""
    obligations = (cmap.get("pilotObligations") or {}).get(node_id)
    notes = (cmap.get("pilotNotes") or {}).get(node_id)
    parts = []
    if obligations:
        parts.append(
            "PILOT OBLIGATIONS (confusable-clusters.json pilotObligations — "
            "mr-kahn gate 2, 2026-07-06; every listed cluster's duties bind "
            "this node's matrix rows and probes): "
            + json.dumps(obligations, ensure_ascii=False))
    if notes:
        parts.append(
            "PILOT NOTES (confusable-clusters.json pilotNotes, verbatim):\n"
            + notes)
        # pilotNotes referencing a binding authoring constraint pull the
        # constraint text itself into the payload (L19 -> DECISION_F-IF-B6 §7)
        if "binding" in notes.lower() and "DECISION_F-IF-B6" in notes:
            parts.append(
                "BINDING CONSTRAINT (DECISION_F-IF-B6 §7 application "
                "addendum, mr-kahn ruling approved by Matt 2026-07-06 — "
                "verbatim; binds EVERY generator constraint, worked example, "
                "item spec, and probe this document authors):\n\""
                + _binding_constraint_text() + "\"")
    return ("\n\n" + "\n\n".join(parts)) if parts else ""


def _registry_slice(graph, tags):
    reg = {e["id"]: e["description"] for e in graph["misconceptionRegistry"]}
    return {t: reg[t] for t in tags if t in reg}


def _shared_blocks(passname, graph, cmap, citation_registry=None):
    """Shared (cached) prefix blocks, stable-before-volatile."""
    template = _read(config.TEMPLATE_PATH)
    gold = _read(config.GOLD_TAXONOMY_PATH)
    blocks = [
        {"type": "text", "text": SYSTEM_PROMPT},
        {"type": "text",
         "text": "TAXONOMY_TEMPLATE §2-§5 (the output contract):\n\n"
                 + _template_sections_2_to_5(template)},
        {"type": "text",
         "text": "GOLD EXEMPLAR (pinned few-shot — entry anatomy, §2.15, "
                 "collision matrix, §3, §4):\n\n" + gold},
    ]
    if passname == "judgment" and citation_registry is not None:
        blocks.append({"type": "text", "text":
                       "GROUNDING TIERS: literature-grounded (work + specific "
                       "claim, verified) | tradition-adjacent (FLAGGED "
                       "'extrapolated from [tradition]') | engineering-candidate "
                       "(stated first-principles analysis, FLAGGED for pilot "
                       "validation).\n\nVERIFIED-CITATIONS REGISTRY (works "
                       "available for reuse, with their verified claims):\n"
                       + json.dumps(citation_registry, indent=1,
                                    ensure_ascii=False)})
    # GAP 2a: the machine-block contract (both passes) — the fenced
    # ```json taxonomy-machine-block``` the adapter parses; stable text,
    # so it lives in the cached prefix. GAP 4: judgment additionally owes
    # the fenced ```json citations-delta``` block (spec §2.4/§9).
    contract = adapters.MACHINE_BLOCK_CONTRACT
    if passname == "judgment":
        contract += "\n\n" + adapters.CITATIONS_DELTA_CONTRACT
    blocks.append({"type": "text", "text": contract})
    # cache breakpoint on the LAST shared block (spec §1.4)
    blocks[-1]["cache_control"] = {"type": "ephemeral"}
    return blocks


def render_draft_request(node_id, graph, cmap, node_class, round_n=0):
    node = _node_json(graph, node_id)
    tags = node.get("misconceptionTags", [])
    payload = {
        "node": node_id,
        "nodeJSON": {k: node[k] for k in
                     ("id", "title", "domain", "tier", "prereqs", "standards",
                      "objective", "misconceptionTags") if k in node},
        "baselineBankErrorSlice": _bank_error_slice(node),
        "confusableClusterRows": _confusable_rows(cmap, node_id),
        "manifestClassRow": {"class": node_class,
                             "demands": config.CLASS_DEMANDS[node_class],
                             "band": config.ENTRY_COUNT_BANDS[node_class]},
        "registrySlice": _registry_slice(graph, tags),
    }
    return {
        "custom_id": f"tax-draft-{node_id}-r{round_n}",
        "params": {
            "model": config.TAX_DRAFT_MODEL,
            "max_tokens": config.DRAFT_MAX_TOKENS,
            "system": _shared_blocks("draft", graph, cmap),
            "messages": [{"role": "user", "content": [
                {"type": "text", "text":
                 "DRAFT PASS (mechanical layer only — §1.5 draft-owned fields: "
                 "candidate entry list, machine-evaluable detection signatures "
                 "in one of the three §3.2 forms, generator constraints, worked "
                 "examples, step-locality, propagation forms, presentation-class "
                 "marks, archetype-eligibility flags, §3-contract scaffold; "
                 "hint-ladder rung 3 only). Do NOT author beliefs, roots, "
                 "severities, probes, or grounding — the judgment pass owns "
                 "those. End the document with the required "
                 "taxonomy-machine-block (harness contract above).\n\n"
                 "NODE PAYLOAD:\n"
                 + json.dumps(payload, indent=1, ensure_ascii=False)
                 # GAP 1: pilot obligations / notes / binding constraint
                 + _pilot_injection_text(node_id, cmap)},
            ]}],
        },
    }


def render_judgment_request(node_id, draft_md, machine_collision_list,
                            draft_harness_report, graph, cmap,
                            citation_registry, round_n=0):
    return {
        "custom_id": f"tax-judgment-{node_id}-r{round_n}",
        "params": {
            "model": config.TAX_JUDGMENT_MODEL,
            "max_tokens": config.JUDGMENT_MAX_TOKENS,
            "system": _shared_blocks("judgment", graph, cmap, citation_registry),
            "messages": [{"role": "user", "content": [
                {"type": "text", "text":
                 "JUDGMENT PASS (§1.5 judgment-owned fields: belief definitions, "
                 "cognitive roots, severity bands + routing destinations + "
                 "BLOCKER reason strings, remediation moves, belief-form "
                 "rewrites, merged/rejected/not-an-error records, a "
                 "disambiguation probe for EVERY row of the machine collision "
                 "list below, grounding tier per entry with citations drawn "
                 "from or queued into the registry; hint-ladder rungs 1-2). "
                 "You may strike, merge, or ADD entries — an addition carries "
                 "the full mechanical field set and re-triggers §3/§4.1 "
                 "verification at assembly. Return the COMPLETE document "
                 "(TEMPLATE §2 structure), ending with the required "
                 "taxonomy-machine-block — your machine block is merged over "
                 "the draft's at assembly (your entries win on conflict; the "
                 "draft supplies mechanical fields you leave unstated) — and "
                 "include the required citations-delta block (contracts "
                 "above).\n\n"
                 "ASSEMBLED DRAFT:\n" + draft_md + "\n\n"
                 "MACHINE COLLISION LIST (every row needs a named probe):\n"
                 + json.dumps(machine_collision_list, indent=1, default=str,
                              ensure_ascii=False) + "\n\n"
                 "DRAFT HARNESS REPORT:\n"
                 + json.dumps(draft_harness_report, indent=1, default=str,
                              ensure_ascii=False)
                 # GAP 1 mirror: the judgment pass holds the same pilot
                 # obligations and binding constraint the draft was given
                 + _pilot_injection_text(node_id, cmap)},
            ]}],
        },
    }


# ---------------------------------------------------------------------------
# Deterministic check chain (spec §6.2 steps 1-2; §1.3 steps 2 and 5)
# ---------------------------------------------------------------------------
def run_check_chain(taxonomy, graph, cmap, registry_pin,
                    citation_registry=None) -> dict:
    """Full harness verification on an assembled taxonomy. Deterministic; a doc
    that fails any layer never reaches mr-kahn."""
    machine = collisions.compute_machine_list(taxonomy)
    layers = {
        "signatures": sig_verify.verify(taxonomy, machine),
        "collision_recall": collisions.check_recall(taxonomy, machine),
        "cluster_obligations": collisions.check_cluster_obligations(
            taxonomy, cmap, machine),
        "structure": structure.check_structure(taxonomy),
        "tag_hygiene": structure.check_tag_hygiene(taxonomy, registry_pin),
        "routing": routing.check_routing(taxonomy, graph),
        "citations": citations.verify_taxonomy_citations(
            taxonomy, citation_registry),
    }
    failures = [f for layer in layers.values()
                for f in layer.get("failures", [])]
    return {
        "machineCollisions": machine["structural"],
        "sporadicAndExcluded": {
            "-".join(sorted(k)): v for k, v in machine["pairs"].items()
            if v["kind"] != "structural"},
        "keyCollisions": machine["key_collisions"],
        "layers": layers,
        "failures": failures,
        "status": "HARNESS_PASS" if not failures else "QUARANTINE",
    }


def machine_jsonable(machine: dict) -> dict:
    """collisions.compute_machine_list output in JSON-stageable form (the
    frozenset pair keys flattened) — the draft-collisions.json content the
    judgment payload injects (spec §1.3 step 3 / §4.2)."""
    return {
        "structural": machine["structural"],
        "pairs": {"-".join(sorted(k)): v for k, v in machine["pairs"].items()},
        "keyCollisions": machine["key_collisions"],
    }


def run_draft_stage_check(taxonomy) -> tuple[dict, dict]:
    """Spec §1.3 step 2 — the cheap fail-fast draft check: §3 signature
    computability + constraint satisfiability (+ worked-example recompute,
    all draft-owned) on the DRAFT, and the §4.1 machine collision list.

    Assertion (ii)/(iii) findings are reported as ADVISORY here, not
    blocking: separation defects are constraint/matrix decisions the
    judgment pass and assembly own (§3.3 — 'the regen round decides').
    Returns (machine_list, report)."""
    machine = collisions.compute_machine_list(taxonomy)
    sig = sig_verify.verify(taxonomy, machine)
    blocking_assertions = ("constraint-satisfiability", "(i)",
                           "worked-example")
    blocking = [f for f in sig["failures"]
                if f.get("assertion") in blocking_assertions]
    advisory = [f for f in sig["failures"] if f not in blocking]
    report = {
        "stage": "draft (spec §1.3 step 2)",
        "failures": blocking,
        "advisorySeparationFindings": advisory,
        "warnings": sig["warnings"],
        "entries": sig["entries"],
        "status": "DRAFT_VALID" if not blocking else "F-SIG",
    }
    return machine, report


# ---------------------------------------------------------------------------
# GAP 3 — assembly (spec §1.3 step 4, deterministic, no model call)
# ---------------------------------------------------------------------------
def assemble_taxonomy(node_id: str) -> str:
    """Merge staged draft + judgment outputs into the final taxonomy.md.

    Judgment is authoritative for judgment-owned fields (spec §1.5
    field-ownership map) and for entry membership (strike/merge/add
    authority, §1.3 step 3); the draft supplies the mechanical layer. The
    machine blocks are merged with judgment's entries winning on conflict;
    additions flag the mandatory harness re-chain (§4.2). The final doc is
    the judgment prose with the MERGED machine block spliced over its own.

    Writes taxonomy.md + assembly-report.json, sets status ASSEMBLED,
    returns the taxonomy.md path. Missing staged inputs -> FDepError;
    missing/malformed machine blocks -> adapters.AdapterError (F-STRUCT)."""
    node_dir = os.path.join(config.STAGING_ROOT, node_id)
    paths = {"draft": os.path.join(node_dir, "draft.md"),
             "judgment": os.path.join(node_dir, "judgment.md")}
    missing = [p for p in paths.values() if not os.path.exists(p)]
    if missing:
        raise config.FDepError(
            f"assembly for {node_id} needs staged draft + judgment outputs; "
            f"missing: {missing}")
    draft_md = _read(paths["draft"])
    judgment_md = _read(paths["judgment"])

    draft_block = adapters.extract_machine_block(draft_md)
    judgment_block = adapters.extract_machine_block(judgment_md)
    merged, merge_report = adapters.merge_machine_blocks(draft_block,
                                                         judgment_block)
    # the merged block must itself parse into an executable Taxonomy —
    # a merge that produces an unloadable block stops HERE, not at checks
    adapters.taxonomy_from_block(merged, doc_text=judgment_md)

    final_md = adapters.replace_machine_block(judgment_md, merged)
    path = write_stage(node_id, "taxonomy.md", final_md)
    write_stage(node_id, "assembly-report.json", merge_report)
    set_status(node_id, "ASSEMBLED")
    return path


# ---------------------------------------------------------------------------
# Verdict staging (spec §9 layout)
# ---------------------------------------------------------------------------
def stage_node(node_id: str) -> str:
    node_dir = os.path.join(config.STAGING_ROOT, node_id)
    os.makedirs(node_dir, exist_ok=True)
    status_path = os.path.join(node_dir, "status")
    if not os.path.exists(status_path):
        with open(status_path, "w", encoding="utf-8") as f:
            f.write("PENDING")
    return node_dir


def write_stage(node_id: str, filename: str, content) -> str:
    node_dir = stage_node(node_id)
    path = os.path.join(node_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        if isinstance(content, str):
            f.write(content)
        else:
            json.dump(content, f, indent=1, default=str, ensure_ascii=False)
    return path


def set_status(node_id: str, status: str):
    if status not in config.STATUS_VALUES:
        raise ValueError(f"unknown status {status!r}")
    write_stage(node_id, "status", status)


# ---------------------------------------------------------------------------
# Batch submission — GUARDED. Never called this session.
# ---------------------------------------------------------------------------
def submit_batch(requests: list[dict], batch_id: str, live: bool = False) -> dict:
    """POST /v1/messages/batches via urllib. Requires ALL THREE guards:
    live=True (the --live flag), ANTHROPIC_API_KEY in env, and an explicit
    non-empty batch_id with an existing manifest (the pin record)."""
    if not live:
        raise LiveGuardError("submit_batch called without --live: this session "
                             "is dry-run only; no network call constructed")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LiveGuardError("ANTHROPIC_API_KEY not set — refusing to submit")
    if not batch_id or not os.path.exists(config.batch_manifest_path(batch_id)):
        raise LiveGuardError(f"no batch manifest for {batch_id!r} — the batch "
                             f"pin must exist before submission (F-DEP)")
    fdep = config.check_preconditions(batch_id)
    if fdep:
        raise config.FDepError("F-DEP hard stop before submission: "
                               + "; ".join(fdep))
    body = json.dumps({"requests": requests}).encode("utf-8")
    req = urllib.request.Request(
        config.ANTHROPIC_BATCHES_URL, data=body, method="POST",
        headers={"x-api-key": api_key,
                 "anthropic-version": config.ANTHROPIC_VERSION,
                 "content-type": "application/json"})
    with urllib.request.urlopen(req) as resp:          # network only past guards
        return json.load(resp)


def poll_batch(batch_id_remote: str, live: bool = False) -> dict:
    if not live:
        raise LiveGuardError("poll_batch called without --live")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LiveGuardError("ANTHROPIC_API_KEY not set")
    req = urllib.request.Request(
        f"{config.ANTHROPIC_BATCHES_URL}/{batch_id_remote}",
        headers={"x-api-key": api_key,
                 "anthropic-version": config.ANTHROPIC_VERSION})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):        # Windows cp1252 console guard
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(
        description="Taxonomy generation harness orchestrator (dry-run by "
                    "default; --live is triple-guarded)")
    ap.add_argument("--node", help="node id, e.g. ALG-L19")
    ap.add_argument("--pass", dest="passname", choices=["draft", "judgment"],
                    default="draft")
    ap.add_argument("--render-only", action="store_true",
                    help="render the batch request payload to stdout; no I/O "
                         "beyond staging")
    ap.add_argument("--live", action="store_true",
                    help="required for any batch submission (plus env key + "
                         "batch id)")
    ap.add_argument("--batch-id", help="explicit batch id (manifest must exist)")
    args = ap.parse_args(argv)

    fdep = config.check_preconditions(args.batch_id)
    if fdep:
        print("F-DEP preconditions unmet:", file=sys.stderr)
        for f in fdep:
            print(f"  - {f}", file=sys.stderr)
        if not args.render_only:
            return 2

    if args.render_only:
        if not args.node:
            ap.error("--render-only requires --node")
        graph = config.load_graph()
        cmap = config.load_confusable_map()
        cls = config.NODE_CLASS.get(args.node)
        if cls is None:
            ap.error(f"no signed MANIFEST class for {args.node} (F-DEP: class "
                     f"row unsigned for this batch)")
        req = render_draft_request(args.node, graph, cmap, cls)
        print(json.dumps(req, indent=1, ensure_ascii=False)[:4000])
        print("... [payload truncated for display]")
        return 0

    if args.live:
        # Even under --live the remaining guards apply; this session never
        # reaches here (dry-run only).
        raise LiveGuardError("live submission path not exercised this session")
    print("Nothing to do: pass --render-only for payload inspection, or run "
          "dryrun.py for the acceptance test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
