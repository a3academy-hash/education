"""Per-node request rendering (BATCH_REGEN_SPEC §4, Appendix A).

custom_id = node id (plus ::P1/::P2/::P3 phase suffix when the manifest
flags the node splitPreemptively — MANIFEST §9). Structured output via
output_config.format = json_schema (strict), re-validated host-side.
The volatile payload (trimmed node JSON + 2-3 archetype-matched gold
exemplars + the node's manifest class row) sits AFTER the cache breakpoint.
"""

from __future__ import annotations

import json

from . import config
from .failures import split_custom_ids

# node-JSON fields the generator needs (spec §4.1 row 7: "trimmed to
# relevant fields"); baseline problem bodies are summarized, not injected.
_NODE_KEEP_FIELDS = (
    "id", "title", "domain", "tier", "prereqs", "standards",
    "objective", "misconceptionTags", "visual", "contextHooks",
)


def trim_node(node: dict) -> dict:
    trimmed = {k: node[k] for k in _NODE_KEEP_FIELDS if k in node}
    problems = node.get("problems") or {}
    trimmed["baselineBankSummary"] = {
        ph: len(problems.get(ph, []) or []) for ph in ("p1", "p2", "p3")
    }
    trimmed["workedExampleCount"] = len(node.get("workedExamples", []) or [])
    return trimmed


def select_gold_exemplars(gold_items: list[dict], archetype_ids: list[str],
                          limit: int = 3) -> list[dict]:
    """2-3 gold items archetype-matched to the node's archetype set,
    phase-diverse where possible (few-shot quality anchor, §4.1 row 8)."""
    matched = [i for i in gold_items if i.get("archetype") in archetype_ids]
    picked: list[dict] = []
    for phase in config.PHASES:                      # phase diversity first
        for item in matched:
            if len(picked) >= limit:
                break
            if item.get("phase") == phase and item not in picked:
                picked.append(item)
                break
    for item in matched:                             # then fill to the limit
        if len(picked) >= limit:
            break
        if item not in picked:
            picked.append(item)
    return picked


def render_volatile_payload(node: dict, exemplars: list[dict],
                            manifest_row: dict,
                            phase_scope: str | None = None) -> str:
    """The per-node user message (everything after the cache breakpoint)."""
    scope_line = (
        f"Generate ONLY the {phase_scope} portion of the bank (this node is "
        "phase-split for output-size control; fragments are merged and "
        "validated host-side).\n\n"
        if phase_scope else ""
    )
    return (
        scope_line
        + "## TARGET NODE (regenerate this node's bank)\n\n```json\n"
        + json.dumps(trim_node(node), indent=1, ensure_ascii=False)
        + "\n```\n\n## MANIFEST CLASS ROW (archetype mix + item-count target "
          "for this node)\n\n```json\n"
        + json.dumps(manifest_row, indent=1, ensure_ascii=False)
        + "\n```\n\n## GOLD EXEMPLARS (quality anchor — match this bar, "
          "never copy the scenarios)\n\n```json\n"
        + json.dumps(exemplars, indent=1, ensure_ascii=False)
        + "\n```"
    )


def render_request(node: dict, prefix_blocks: list[dict], exemplars: list[dict],
                   manifest_row: dict, output_schema: dict,
                   model: str = config.GENERATION_MODEL,
                   custom_id: str | None = None,
                   phase_scope: str | None = None) -> dict:
    """One Batch-API request entry: {custom_id, params}."""
    return {
        "custom_id": custom_id or node["id"],
        "params": {
            "model": model,
            "max_tokens": config.MAX_TOKENS,
            "system": prefix_blocks,
            "messages": [{
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": render_volatile_payload(node, exemplars,
                                                    manifest_row, phase_scope),
                }],
            }],
            # spec Appendix A: output_config.format = json_schema, strict
            "output_config": {
                "format": "json_schema",
                "schema": output_schema,
                "strict": True,
            },
        },
    }


def render_node_requests(node: dict, prefix_blocks: list[dict],
                         exemplars: list[dict], manifest_row: dict,
                         output_schema: dict,
                         model: str = config.GENERATION_MODEL) -> list[dict]:
    """All requests for one node: 1 normally, 3 (phase-split) when the
    manifest row flags splitPreemptively (F-OVERFLOW preemption)."""
    if manifest_row.get("splitPreemptively"):
        return [
            render_request(node, prefix_blocks, exemplars, manifest_row,
                           output_schema, model=model, custom_id=cid,
                           phase_scope=cid.split("::", 1)[1])
            for cid in split_custom_ids(node["id"])
        ]
    return [render_request(node, prefix_blocks, exemplars, manifest_row,
                           output_schema, model=model)]
