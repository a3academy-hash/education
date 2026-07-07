"""routing.py — mechanized halves of the §3.12 routing checks
(TAXONOMY_REGEN_SPEC §6.2 step 1, routing-reference checks).

  1. Every re-surfacing node id exists in the graph.
  2. Every BLOCKER's stated backward destination is a prerequisite ancestor of
     the node in the graph DAG (prereq walk), or an explicitly named
     below-graph surface.

Whether it is the RIGHT ancestor stays mr-kahn's judgment half (§6.2 step 3).
For a cluster doc, "ancestor" means ancestor of at least one covered node
(dry-run interpretation — the gold doc spans L05+L06 and routes L06 traffic
back to L05).
"""
from __future__ import annotations


def prereq_ancestors(graph: dict, node_id: str) -> set[str]:
    prereqs = {n["id"]: n.get("prereqs", []) for n in graph["nodes"]}
    seen, stack = set(), list(prereqs.get(node_id, []))
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        stack.extend(prereqs.get(cur, []))
    return seen


def check_routing(taxonomy, graph: dict) -> dict:
    failures, findings = [], []
    node_ids = {n["id"] for n in graph["nodes"]}
    ancestors = set()
    for covered in taxonomy.node_ids:
        if covered not in node_ids:
            failures.append({"class": "F-STRUCT", "detail":
                             f"covered node {covered!r} not in the graph"})
            continue
        ancestors |= prereq_ancestors(graph, covered)

    for e in taxonomy.entries:
        # 1. re-surfacing node ids exist
        for rid in e.resurfaces:
            if rid not in node_ids:
                failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                                 f"re-surfacing node id {rid!r} does not exist "
                                 f"in the graph"})
        if e.primary_home not in node_ids:
            failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                             f"primary home {e.primary_home!r} does not exist "
                             f"in the graph"})
        # 2. BLOCKER backward destinations
        if e.severity != "BLOCKER":
            continue
        dest = e.blocker_destination or {}
        kind = dest.get("type")
        if kind == "node":
            did = dest.get("id")
            if did not in node_ids:
                failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                                 f"BLOCKER destination node {did!r} does not "
                                 f"exist in the graph"})
            elif did not in ancestors:
                failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                                 f"BLOCKER destination {did} is not a "
                                 f"prerequisite ancestor of any covered node "
                                 f"({taxonomy.node_ids})"})
            else:
                findings.append(f"{e.tag}: BLOCKER -> {did} (prereq ancestor "
                                f"verified by graph walk)")
        elif kind == "below-graph":
            surface = dest.get("surface", "")
            if not surface.strip():
                failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                                 "below-graph BLOCKER destination without a "
                                 "named surface"})
            else:
                findings.append(f"{e.tag}: BLOCKER -> below-graph surface "
                                f"({surface})")
        else:
            failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                             f"BLOCKER destination has unknown type {kind!r}"})
    return {"failures": failures, "findings": findings}
