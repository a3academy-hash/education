"""Host-side re-validation (BATCH_REGEN_SPEC §5.2, steps 1-4).

ENRICHED_NODE_SCHEMA / ENRICHED_ITEM_SCHEMA below describe the enriched
STAGING shape, NOT types/problem.ts ProblemTemplate; promotion to graph data
requires a separately gated enriched→ProblemTemplate transform (mr-gates for
any /types change).

Belt-and-suspenders: structured outputs constrain the model at generation
time; everything is re-validated here before raw.json can become node.json.

Step 1  strict schema (pinned ENRICHED_NODE_SCHEMA; stdlib mini-validator)
Step 2  taxonomy: every misconceptionMap tag + rubric counteredEntryId must
        exist in the batch's pinned registry -> F-TAG (existence class)
Step 3  structural invariants: prereqs[] unchanged vs source graph; phases
        present with P3 non-empty + neutral; 3-rung hint ladder per item;
        skillId match; standards preserved
Step 4  solver-check hook (stub interface; wired per archetype
        solverContract by the item-certification pipeline later)

Gold-schema adaptation: docs/gold-node/gold-node-items.json extends the
live schema (see its schemaNote) — `mode="gold"` validates what applies
and reports which checks are gold-adapted vs production (dryrun.py).
"""

from __future__ import annotations

import json
import re
from typing import Any

from . import config

# --- pinned output schema (spec §5.1: types/problem.ts-derived + gold delta) --

_MISCONCEPTION_MAP_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["trigger", "tag", "signature"],
        "properties": {
            "trigger": {"type": "string"},
            "tag": {"type": "string"},
            "signature": {"type": "string"},
        },
    },
}

_HINT_LADDER_SCHEMA = {
    "type": "array",
    "minItems": 3,
    "maxItems": 3,
    "items": {
        "type": "object",
        "required": ["rung", "text"],
        "properties": {
            "rung": {"enum": ["root-probe", "targeted-counter", "worked-micro-step"]},
            "text": {"type": "string"},
        },
    },
}

ENRICHED_ITEM_SCHEMA = {
    "type": "object",
    "required": [
        "id", "skillId", "archetype", "phase", "sport", "difficulty",
        "standard", "prompt", "misconceptionMap", "hintLadder",
    ],
    "properties": {
        "id": {"type": "string"},
        "skillId": {"type": "string"},
        "archetype": {"enum": list(config.ITEM_BANK_ARCHETYPES)},
        "phase": {"enum": list(config.PHASES)},
        "sport": {"enum": list(config.SPORTS)},
        "difficulty": {"type": "integer", "minimum": 1, "maximum": 3},
        "standard": {"type": "string"},
        "prompt": {"type": "string"},
        "misconceptionMap": _MISCONCEPTION_MAP_SCHEMA,
        "hintLadder": _HINT_LADDER_SCHEMA,
        # archetype-specific bodies (additive; enforced per-archetype below)
        "parts": {"type": "array"},
        "shownWork": {},
        "questions": {"type": "array"},
        "errorAnalysisOf": {},
        "predictPrompt": {"type": "string"},
        "resolvePrompt": {"type": "string"},
        "interaction": {"type": "object"},
        "choices": {"type": "array"},
        "correctAnswer": {},
        "answerType": {"type": "string"},
        "visual": {"type": ["object", "null"]},
        "rubricElementRefs": {"type": "array"},
        "equivalenceClass": {"type": "string"},
        "calculatorFlag": {
            "enum": ["no_calculator", "calculator_allowed",
                     "calc_neutral_arithmetic_light"],
        },
    },
}

ENRICHED_NODE_SCHEMA = {
    "type": "object",
    "required": ["nodeId", "prereqs", "standards", "items"],
    "properties": {
        "nodeId": {"type": "string"},
        "prereqs": {"type": "array", "items": {"type": "string"}},
        "standards": {
            "type": "object",
            "required": ["ccss"],
            "properties": {
                "ccss": {"type": "array", "items": {"type": "string"}},
                "state": {"type": ["string", "null"]},
            },
        },
        "items": {"type": "array", "minItems": 1, "items": ENRICHED_ITEM_SCHEMA},
        "workedExamples": {"type": "array"},
    },
}

# Gold extended-schema item (per gold-node-items.json schemaNote + measured
# facts): hintLadderRef object instead of inline hintLadder; authoringNote
# required; difficulty extends to 4 (gold P3 stretch items int-03/disc-01 —
# production stays 1-3 per types/problem.ts); `prompt` is required for every
# archetype EXCEPT predict-reveal, which carries predictPrompt/resolvePrompt
# instead (enforced below, not in this base schema).
GOLD_ITEM_SCHEMA = {
    "type": "object",
    "required": [
        "id", "skillId", "archetype", "phase", "sport", "difficulty",
        "standard", "misconceptionMap", "hintLadderRef",
        "visual", "authoringNote",
    ],
    "properties": {
        **ENRICHED_ITEM_SCHEMA["properties"],
        "difficulty": {"type": "integer", "minimum": 1, "maximum": 4},
        "hintLadderRef": {
            "type": "object",
            "required": ["generic", "perTag"],
            "properties": {
                "generic": {"type": "string"},
                "perTag": {"type": "object"},
            },
        },
        "authoringNote": {"type": "string"},
        "visual": {"type": "object"},
    },
}

# archetype -> extra required fields (both schemas)
ARCHETYPE_REQUIRED_FIELDS = {
    "scaffolded-multistep": ["parts"],
    "error-analysis": ["shownWork", "questions", "errorAnalysisOf"],
    "predict-reveal": ["predictPrompt", "resolvePrompt"],
    "interactive": ["interaction"],
    "discrimination": ["correctAnswer", "answerType"],
    "rubric-explanation": ["rubricElementRefs"],
}

# --- stdlib mini JSON-schema validator ----------------------------------------

_TYPE_MAP = {
    "object": dict, "array": list, "string": str,
    "boolean": bool, "null": type(None),
}


def _type_ok(value: Any, tname: str) -> bool:
    if tname == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if tname == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(value, _TYPE_MAP[tname])


def schema_check(instance: Any, schema: dict, path: str = "$") -> list[str]:
    """Validate against the supported schema subset: type, enum, const,
    required, properties, additionalProperties(bool), items, minItems,
    maxItems, minimum, maximum, pattern. Returns error strings."""
    errors: list[str] = []
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_type_ok(instance, t) for t in types):
            return [f"{path}: expected type {types}, got {type(instance).__name__}"]
    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{path}: {instance!r} not in enum {schema['enum']}")
    if "const" in schema and instance != schema["const"]:
        errors.append(f"{path}: {instance!r} != const {schema['const']!r}")
    if isinstance(instance, dict):
        for req in schema.get("required", []):
            if req not in instance:
                errors.append(f"{path}: missing required field {req!r}")
        props = schema.get("properties", {})
        for key, sub in props.items():
            if key in instance and sub:
                errors.extend(schema_check(instance[key], sub, f"{path}.{key}"))
        if schema.get("additionalProperties") is False:
            for key in instance:
                if key not in props:
                    errors.append(f"{path}: additional property {key!r} not allowed")
    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            errors.append(f"{path}: {len(instance)} items < minItems {schema['minItems']}")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            errors.append(f"{path}: {len(instance)} items > maxItems {schema['maxItems']}")
        if "items" in schema:
            for i, el in enumerate(instance):
                errors.extend(schema_check(el, schema["items"], f"{path}[{i}]"))
    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{path}: {instance} < minimum {schema['minimum']}")
        if "maximum" in schema and instance > schema["maximum"]:
            errors.append(f"{path}: {instance} > maximum {schema['maximum']}")
    if "pattern" in schema and isinstance(instance, str):
        if not re.search(schema["pattern"], instance):
            errors.append(f"{path}: {instance!r} does not match {schema['pattern']!r}")
    return errors


# --- step 2: taxonomy ----------------------------------------------------------


def _iter_item_tags(item: dict):
    """Yield (where, tag) for every misconceptionMap tag (item + part level)
    and every rubric counteredEntryId in the item."""
    for m in item.get("misconceptionMap", []) or []:
        yield f"{item.get('id', '?')}.misconceptionMap", m.get("tag")
    for part in item.get("parts", []) or []:
        for m in part.get("misconceptionMap", []) or []:
            yield f"{item.get('id', '?')}.parts[{part.get('partId', '?')}]", m.get("tag")
    for q in item.get("questions", []) or []:
        for m in q.get("misconceptionMap", []) or []:
            yield f"{item.get('id', '?')}.questions", m.get("tag")
    for ref in item.get("rubricElementRefs", []) or []:
        if isinstance(ref, dict):
            for cid in ref.get("counteredEntryIds", []) or []:
                yield f"{item.get('id', '?')}.rubricElementRefs", cid
    # error-analysis: the misconception the shown work instantiates
    eao = item.get("errorAnalysisOf")
    if isinstance(eao, str):
        yield f"{item.get('id', '?')}.errorAnalysisOf", eao
    elif isinstance(eao, dict) and eao.get("tag"):
        yield f"{item.get('id', '?')}.errorAnalysisOf", eao["tag"]


def taxonomy_check(items: list[dict], registry: set[str]) -> dict:
    """F-TAG existence class: every tag must be in the pinned registry."""
    unknown = []
    total = 0
    for item in items:
        for where, tag in _iter_item_tags(item):
            total += 1
            if tag not in registry:
                unknown.append({"where": where, "tag": tag})
    return {"pass": not unknown, "tagsChecked": total, "unknownTags": unknown}


# --- step 3: structural invariants ----------------------------------------------


def _item_uses_tags(item: dict) -> set[str]:
    return {tag for _, tag in _iter_item_tags(item) if tag}


def _hint_ladder_check(item: dict, mode: str) -> str | None:
    """Production: inline 3-rung ladder. Gold-adapted: hintLadderRef with a
    generic ladder id + perTag coverage of every tag the item's maps use."""
    if mode == "production":
        ladder = item.get("hintLadder")
        if not isinstance(ladder, list) or len(ladder) != 3:
            return f"{item.get('id')}: hintLadder must have exactly 3 rungs"
        rungs = [r.get("rung") for r in ladder if isinstance(r, dict)]
        if rungs != ["root-probe", "targeted-counter", "worked-micro-step"]:
            return f"{item.get('id')}: hintLadder rungs {rungs} out of order"
        return None
    ref = item.get("hintLadderRef")
    if not isinstance(ref, dict) or not ref.get("generic"):
        return f"{item.get('id')}: hintLadderRef missing/empty generic ladder"
    per_tag = ref.get("perTag") or {}
    missing = sorted(_item_uses_tags(item) - set(per_tag))
    if missing:
        return f"{item.get('id')}: hintLadderRef.perTag missing ladders for {missing}"
    return None


def structural_check(node_obj: dict, source_node: dict, mode: str = "production") -> dict:
    """§5.2 step 3. `source_node` is the node from the pinned source graph."""
    checks: dict[str, dict] = {}
    items = node_obj.get("items", [])

    # prereqs[] unchanged (production only; the gold items file carries none)
    if mode == "production":
        ok = node_obj.get("prereqs") == source_node.get("prereqs")
        checks["prereqsUnchanged"] = {
            "pass": ok,
            "detail": None if ok else
            f"prereqs {node_obj.get('prereqs')} != source {source_node.get('prereqs')}",
        }
    else:
        checks["prereqsUnchanged"] = {
            "pass": True, "skipped": True,
            "detail": "gold-schema-adapted: items file carries no prereqs[]; "
                      "production check compares node.prereqs to the source graph",
        }

    # phase distribution present; P3 non-empty AND neutral
    by_phase = {p: [i for i in items if i.get("phase") == p] for p in config.PHASES}
    missing_phases = [p for p, lst in by_phase.items() if not lst]
    non_neutral_p3 = [i.get("id") for i in by_phase["P3"] if i.get("sport") != "neutral"]
    checks["phasesPresentP3NonEmpty"] = {
        "pass": not missing_phases,
        "detail": None if not missing_phases else f"empty phases: {missing_phases}",
        "counts": {p: len(lst) for p, lst in by_phase.items()},
    }
    checks["p3Neutral"] = {
        "pass": not non_neutral_p3,
        "detail": None if not non_neutral_p3 else f"sport-skinned P3 items: {non_neutral_p3}",
    }
    p3_scaf = [i for i in by_phase["P3"] if i.get("archetype") == "scaffolded-multistep"]
    checks["p3ScaffoldedPresent"] = {  # MANIFEST §5 enriched hard constraint (ii)
        "pass": bool(p3_scaf),
        "detail": None if p3_scaf else "no P3 scaffolded-multistep instance",
    }

    # 3-rung hint ladder per item (gold-adapted: ladder-ref coverage)
    ladder_problems = [p for p in (_hint_ladder_check(i, mode) for i in items) if p]
    checks["hintLadder"] = {
        "pass": not ladder_problems,
        "adapted": mode != "production",
        "detail": ladder_problems or None,
    }

    # skillId match
    node_id = source_node["id"]
    bad_skill = [i.get("id") for i in items if i.get("skillId") != node_id]
    checks["skillIdMatch"] = {
        "pass": not bad_skill,
        "detail": None if not bad_skill else f"items with skillId != {node_id}: {bad_skill}",
    }

    # standards preserved
    source_ccss = set(source_node.get("standards", {}).get("ccss", []))
    if mode == "production":
        out_ccss = set(node_obj.get("standards", {}).get("ccss", []))
        std_ok = out_ccss == source_ccss
        std_detail = None if std_ok else f"node ccss {sorted(out_ccss)} != source {sorted(source_ccss)}"
    else:
        bad_std = [i.get("id") for i in items if i.get("standard") not in source_ccss]
        std_ok = not bad_std
        std_detail = None if std_ok else f"items with off-node standard: {bad_std}"
    checks["standardsPreserved"] = {"pass": std_ok, "detail": std_detail,
                                    "adapted": mode != "production"}

    # per-archetype required bodies
    body_problems = []
    for i in items:
        for f in ARCHETYPE_REQUIRED_FIELDS.get(i.get("archetype"), []):
            if f not in i:
                body_problems.append(f"{i.get('id')}: {i.get('archetype')} item missing {f!r}")
    checks["archetypeBodies"] = {"pass": not body_problems, "detail": body_problems or None}

    return {"pass": all(c["pass"] for c in checks.values()), "checks": checks}


# --- step 4: solver-check hook ---------------------------------------------------


class SolverRegistry:
    """Stub interface for the item-certification solver hook (§5.2 step 4).

    Per-archetype solvers register against the archetype `solverContract`
    (a later, separately-gated wiring task). Unwired archetypes report
    status 'skipped' — NOT 'pass': a skipped solver is not evidence.
    """

    def __init__(self):
        self._solvers: dict[str, callable] = {}

    def register(self, archetype: str, solver: callable) -> None:
        self._solvers[archetype] = solver

    def check_item(self, item: dict) -> dict:
        solver = self._solvers.get(item.get("archetype"))
        if solver is None:
            return {"itemId": item.get("id"), "status": "skipped",
                    "detail": "no solver wired for archetype "
                              f"{item.get('archetype')!r} (solverContract pending)"}
        try:
            ok, detail = solver(item)
            return {"itemId": item.get("id"),
                    "status": "pass" if ok else "fail", "detail": detail}
        except Exception as e:  # a crashing solver must not crash validation
            return {"itemId": item.get("id"), "status": "error", "detail": repr(e)}

    def check_items(self, items: list[dict]) -> dict:
        results = [self.check_item(i) for i in items]
        failed = [r for r in results if r["status"] == "fail"]
        return {"pass": not failed,
                "counts": {s: sum(1 for r in results if r["status"] == s)
                           for s in ("pass", "fail", "skipped", "error")},
                "results": results}


# --- full §5.2 run -----------------------------------------------------------------


def validate_items(items: list[dict], source_node: dict, registry: set[str],
                   node_obj: dict | None = None, mode: str = "production",
                   solver: SolverRegistry | None = None) -> dict:
    """Run §5.2 steps 1-4. Returns the validation.json payload.

    verdict: VALID | F-SCHEMA | F-TAG (first failing gate wins — a node that
    fails schema is quarantined before taxonomy is even consulted).
    """
    node_obj = node_obj if node_obj is not None else {"items": items}
    item_schema = ENRICHED_ITEM_SCHEMA if mode == "production" else GOLD_ITEM_SCHEMA

    if mode == "production":
        schema_errors = schema_check(node_obj, ENRICHED_NODE_SCHEMA)
    else:
        schema_errors = []
        for idx, item in enumerate(items):
            schema_errors.extend(schema_check(item, item_schema, f"$.items[{idx}]"))
            # gold conditional: prompt required unless predict-reveal (which
            # carries predictPrompt/resolvePrompt per ARCHETYPE_REQUIRED_FIELDS)
            if item.get("archetype") != "predict-reveal" and "prompt" not in item:
                schema_errors.append(f"$.items[{idx}]: missing required field 'prompt'")

    taxonomy = taxonomy_check(items, registry)
    structural = structural_check(node_obj, source_node, mode=mode)
    solver_result = (solver or SolverRegistry()).check_items(items)

    if schema_errors:
        verdict = "F-SCHEMA"
    elif not taxonomy["pass"]:
        verdict = "F-TAG"
    elif not (structural["pass"] and solver_result["pass"]):
        verdict = "INVALID-STRUCTURAL"
    else:
        verdict = "VALID"

    return {
        "mode": mode,
        "schema": {"pass": not schema_errors, "errors": schema_errors,
                   "schemaId": "ENRICHED_NODE_SCHEMA" if mode == "production"
                               else "GOLD_ITEM_SCHEMA (gold-adapted)"},
        "taxonomy": taxonomy,
        "structural": structural,
        "solver": solver_result,
        "verdict": verdict,
    }


def parse_raw_output(raw_text: str) -> dict:
    """Parse a raw model text payload. Truncated JSON -> F-OVERFLOW is the
    caller's classification; here it surfaces as ValueError."""
    return json.loads(raw_text)
