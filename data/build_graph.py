# =============================================================================
# ARCHIVED BUILD TOOLING — DO NOT RUN
#
# data/algebra1-graph.json v1.1.0+ is canonical and hand-maintained.
# This script and nodes_part*.py would regenerate the obsolete v1.0.0 graph,
# overwriting the canonical file. They are kept for reference only.
# =============================================================================
# build_graph.py — assemble, validate, emit algebra1-graph.json + student overlay sample
import json, sys
from collections import defaultdict
from nodes_part1 import PART1
from nodes_part2 import PART2

SPORTS = ["baseball","softball","basketball","soccer","football","volleyball","neutral"]
DOMAINS = ["foundations","equations","linear","systems","exponents-polynomials","quadratics","data"]

nodes = PART1 + PART2
ids = [n["id"] for n in nodes]
idset = set(ids)

errors, warnings = [], []

# --- schema checks ---
if len(ids) != len(idset): errors.append("duplicate node ids")
for n in nodes:
    if n["domain"] not in DOMAINS: errors.append(f'{n["id"]}: bad domain {n["domain"]}')
    if not n["standards"]["ccss"]: errors.append(f'{n["id"]}: missing CCSS codes')
    if not n["objective"]: errors.append(f'{n["id"]}: missing objective')
    if not n["misconceptionTags"]: errors.append(f'{n["id"]}: missing misconception tags')
    missing = [s for s in SPORTS if s not in n["contextHooks"] or not n["contextHooks"][s]]
    if missing: errors.append(f'{n["id"]}: missing hooks {missing}')
    for p in n["prereqs"]:
        if p not in idset: errors.append(f'invalid edge {p} -> {n["id"]} (missing source)')

# --- edges ---
edges = [{"from": p, "to": n["id"]} for n in nodes for p in n["prereqs"]]

# --- orphan check: no prereqs AND no dependents ---
has_dep = {e["from"] for e in edges}
for n in nodes:
    if not n["prereqs"] and n["id"] not in has_dep:
        warnings.append(f'orphan node: {n["id"]}')

# --- cycle detection (DFS) ---
adj = {n["id"]: n["prereqs"] for n in nodes}
WHITE, GRAY, BLACK = 0, 1, 2
color = {i: WHITE for i in ids}
def dfs(u, stack):
    color[u] = GRAY
    for v in adj[u]:
        if v not in idset: continue
        if color[v] == GRAY: errors.append("cycle: " + " -> ".join(stack + [u, v])); return
        if color[v] == WHITE: dfs(v, stack + [u])
    color[u] = BLACK
for i in ids:
    if color[i] == WHITE: dfs(i, [])

# --- topology stats ---
entry = [n["id"] for n in nodes if not n["prereqs"]]
terminal = [n["id"] for n in nodes if n["id"] not in has_dep]
indeg = defaultdict(int)
for e in edges: indeg[e["to"]] += 1

# longest path (DAG depth) via memoized depth over prereqs
from functools import lru_cache
@lru_cache(maxsize=None)
def depth(i):
    ps = adj[i]
    return 1 if not ps else 1 + max(depth(p) for p in ps)
max_depth = max(depth(i) for i in ids)

graph = {
    "schema": {
        "version": "1.0.0",
        "course": "Algebra 1",
        "audience": "middle-school",
        "sports": SPORTS,
        "phases": {
            "p1": "sport-context on-ramp",
            "p2": "blended sport + academic notation",
            "p3": "neutral academic transfer (required for mastery)"
        },
        "masteryStatuses": ["unknown","introduced","developing","near_mastery","mastered","needs_review","prerequisite_gap"],
        "notes": "problems p1/p2/p3 are authored in batches per prompts/03-curriculum-graph-builder.md; standards codes pending mr-kahn verification pass"
    },
    "domains": [
        {"id":"foundations","label":"Foundations","tier":0},
        {"id":"equations","label":"Equations & Inequalities","tier":1},
        {"id":"linear","label":"Linear Functions","tier":2},
        {"id":"systems","label":"Systems","tier":3},
        {"id":"exponents-polynomials","label":"Exponents & Polynomials","tier":4},
        {"id":"quadratics","label":"Quadratics & Radicals","tier":5},
        {"id":"data","label":"Data & Statistics","tier":6}
    ],
    "nodes": nodes,
    "edges": edges
}

with open("/home/claude/graph/algebra1-graph.json","w") as f:
    json.dump(graph, f, indent=2, ensure_ascii=False)

# ============ STUDENT OVERLAY SAMPLE ============
# Demonstrates the canonical graph overlaid with a logged-in student's state.
MASTERY_GATE = 0.70

def blank():
    return {"mastery":0.0,"status":"unknown","phase":1,"attempts":0,"correct":0,
            "hints":0,"timeMs":0,"lastFive":[],"transfer":False}

state = {i: blank() for i in ids}
def set_mastered(i):
    state[i].update({"mastery":0.92,"status":"mastered","phase":3,"attempts":8,
                     "correct":8,"lastFive":[True]*5,"transfer":True})
# Seed: solid foundations + early equations, gaps starting at slope
for i in ["ALG-F01","ALG-F02","ALG-F03","ALG-F04","ALG-F05","ALG-F06","ALG-F07",
          "ALG-F08","ALG-F09","ALG-F10","ALG-F11","ALG-E01","ALG-E02","ALG-L01"]:
    set_mastered(i)
state["ALG-E03"].update({"mastery":0.55,"status":"developing","phase":2,"attempts":6,
                         "correct":4,"hints":2,"lastFive":[False,True,True,False,True]})
state["ALG-L05"].update({"mastery":0.42,"status":"developing","phase":1,"attempts":4,
                         "correct":2,"hints":2,"lastFive":[True,False,False,True]})

# overlay computation (mirrors lib/graph/overlay.ts)
node_by_id = {n["id"]: n for n in nodes}
def effective_status(i):
    s = state[i]
    if s["status"] == "mastered": return "mastered", None
    gap = next((p for p in node_by_id[i]["prereqs"] if state[p]["mastery"] < MASTERY_GATE), None)
    if gap: return "prerequisite_gap", gap
    return s["status"], None

overlay_nodes = []
frontier, locked = [], []
for i in ids:
    eff, blocked_by = effective_status(i)
    prereqs_met = all(state[p]["mastery"] >= MASTERY_GATE for p in node_by_id[i]["prereqs"])
    is_frontier = prereqs_met and state[i]["status"] != "mastered"
    if is_frontier: frontier.append(i)
    if eff == "prerequisite_gap": locked.append(i)
    overlay_nodes.append({
        "skillId": i, "title": node_by_id[i]["title"], "domain": node_by_id[i]["domain"],
        "mastery": state[i]["mastery"], "phase": state[i]["phase"],
        "effectiveStatus": eff, "blockedBy": blocked_by, "frontier": is_frontier
    })

# deterministic recommendation: finish in-progress work before opening new nodes;
# then lowest mastery, earliest domain tier, then id (stable tiebreak)
dom_tier = {d["id"]: d["tier"] for d in graph["domains"]}
status_rank = {"needs_review":0,"developing":1,"near_mastery":2,"introduced":3,"unknown":4}
cands = sorted(
    [o for o in overlay_nodes if o["frontier"]],
    key=lambda o: (status_rank.get(o["effectiveStatus"],5), o["mastery"],
                   dom_tier[o["domain"]], o["skillId"])
)
rec = cands[0] if cands else None
sample_blocked = next((o for o in overlay_nodes if o["blockedBy"] == rec["skillId"]), None) if rec else None

domain_progress = {}
for d in graph["domains"]:
    dn = [o for o in overlay_nodes if o["domain"] == d["id"]]
    domain_progress[d["id"]] = {
        "mastered": sum(1 for o in dn if o["effectiveStatus"] == "mastered"),
        "total": len(dn),
        "avgMastery": round(sum(o["mastery"] for o in dn) / len(dn), 3)
    }

overlay = {
    "student": {"id":"stu_demo_001","name":"Demo Student","sport":"baseball","grade":8},
    "course":"Algebra 1","masteryGate": MASTERY_GATE,
    "summary": {
        "mastered": sum(1 for o in overlay_nodes if o["effectiveStatus"]=="mastered"),
        "frontier": len(frontier), "locked": len(locked),
        "domainProgress": domain_progress
    },
    "recommendation": {
        "skillId": rec["skillId"], "title": rec["title"], "kind": "continue",
        "reason": f'Lowest mastery among skills you are ready for; it currently locks {sample_blocked["title"] if sample_blocked else "downstream skills"}.'
    } if rec else None,
    "nodes": overlay_nodes
}
with open("/home/claude/graph/student-overlay-sample.json","w") as f:
    json.dump(overlay, f, indent=2, ensure_ascii=False)

# ============ REPORT ============
print("=== VALIDATION REPORT ===")
print(f"nodes: {len(nodes)}  edges: {len(edges)}  max prerequisite depth: {max_depth}")
print(f"entry nodes: {entry}")
print(f"terminal nodes ({len(terminal)}): {terminal}")
print(f"domains: " + ", ".join(f'{d}:{sum(1 for n in nodes if n["domain"]==d)}' for d in DOMAINS))
print(f"hooks: {len(nodes)*len(SPORTS)} authored ({len(SPORTS)} per node)")
print(f"errors: {len(errors)}"); [print("  ERROR:", e) for e in errors]
print(f"warnings: {len(warnings)}"); [print("  WARN:", w) for w in warnings]
print()
print("=== OVERLAY SAMPLE ===")
print(f"mastered: {overlay['summary']['mastered']}  frontier: {overlay['summary']['frontier']}  locked: {overlay['summary']['locked']}")
print(f"recommendation: {overlay['recommendation']['skillId']} — {overlay['recommendation']['title']}")
print(f"reason: {overlay['recommendation']['reason']}")
sys.exit(1 if errors else 0)
