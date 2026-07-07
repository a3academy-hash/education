"""adapters.py — the machine-block adapter (TAXONOMY_REGEN_SPEC §3.2; pilot
GAP 2, the generic taxonomy.md -> Taxonomy path the runner was missing).

Contract: every generated taxonomy document ENDS with one fenced block

    ```json taxonomy-machine-block
    { ... }
    ```

carrying the full machine form of the taxonomy (entries + signatures in the
three §3.2 evaluable forms, generator constraints, collision matrix,
not-an-error records, registry diff, rubric table, node-level structures).
The prose sections are authoritative for the mr-kahn audit; the machine block
is the harness contract; the two must agree.

parse_machine_block(md_text) -> signatures.Taxonomy, compatible with what
build_gold_taxonomy produces (same evaluator interface signatures.py exposes).
Numeric expressions are compiled through a SAFE evaluator: ast-based
arithmetic on the family's declared parameters only, Fraction-exact, NO
eval(). A missing/malformed block raises AdapterError (F-STRUCT class) with a
precise reason — that is pilot data, never repaired silently.

Also here:
  - MACHINE_BLOCK_CONTRACT / CITATIONS_DELTA_CONTRACT — the prompt-side text
    of the contract (orchestrate injects them into both passes / judgment);
  - gold_machine_block() — the GOLD taxonomy serialized to machine-block form
    (label/name-keyed expression tables for the gold lambdas), used by the
    self-test to prove the gold-passes-everything invariant THROUGH the
    adapter path;
  - merge_machine_blocks() — GAP 3 assembly merge (judgment entries win on
    conflict; draft supplies the mechanical layer; additions/strikes
    reported, never silent).

stdlib only.
"""
from __future__ import annotations

import ast
import json
import re
from fractions import Fraction as Fr

import config
import signatures as S


MACHINE_BLOCK_TAG = "taxonomy-machine-block"
CITATIONS_DELTA_TAG = "citations-delta"

_FENCE_RE = r"```json[ \t]+%s[ \t]*\r?\n(.*?)\r?\n[ \t]*```"

_FORM_NAME = {S.NUMERIC: "numeric-expression",
              S.CONSTRUCT: "construct-state",
              S.RECIPE: "keyed-choice"}
_FORM_FROM_NAME = {"numeric-expression": S.NUMERIC, "numeric": S.NUMERIC,
                   "construct-state": S.CONSTRUCT,
                   "keyed-choice": S.RECIPE}


class AdapterError(RuntimeError):
    """F-STRUCT-class adapter failure: the machine block is missing or
    malformed. Pilot data — staged as a finding, never repaired silently."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.finding = {"class": "F-STRUCT", "layer": "adapter",
                        "detail": reason}


# ---------------------------------------------------------------------------
# Fenced-block extraction
# ---------------------------------------------------------------------------
def find_fenced_json_block(md_text: str, tag: str) -> str | None:
    """Raw text of the LAST fenced ```json <tag>``` block, or None."""
    matches = list(re.finditer(_FENCE_RE % re.escape(tag), md_text or "",
                               re.DOTALL))
    return matches[-1].group(1) if matches else None


def extract_machine_block(md_text: str) -> dict:
    raw = find_fenced_json_block(md_text, MACHINE_BLOCK_TAG)
    if raw is None:
        raise AdapterError(
            "no fenced ```json taxonomy-machine-block``` block found — the "
            "document does not meet the §3.2 machine-block contract")
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        raise AdapterError(f"taxonomy-machine-block is not valid JSON: {e}")
    if not isinstance(obj, dict):
        raise AdapterError("taxonomy-machine-block must be a JSON object, got "
                           + type(obj).__name__)
    return obj


def render_machine_block(block: dict) -> str:
    return ("```json " + MACHINE_BLOCK_TAG + "\n"
            + json.dumps(block, indent=1, ensure_ascii=False) + "\n```")


def replace_machine_block(md_text: str, block: dict) -> str:
    """Splice a (merged) block over the doc's LAST machine block."""
    matches = list(re.finditer(_FENCE_RE % re.escape(MACHINE_BLOCK_TAG),
                               md_text, re.DOTALL))
    if not matches:
        raise AdapterError("cannot splice merged machine block: the document "
                           "has no taxonomy-machine-block fence")
    m = matches[-1]
    return md_text[:m.start()] + render_machine_block(block) + md_text[m.end():]


# ---------------------------------------------------------------------------
# SAFE expression evaluator — ast-based, declared params only, Fraction-exact.
# NO eval()/exec(); no attributes, subscripts, comprehensions, lambdas, or
# calls other than abs(). Integer constants become Fractions; floats are
# rejected outright (exact-arithmetic pin, sig_verify separation semantics).
# ---------------------------------------------------------------------------
_ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div)
_ALLOWED_UNARY = (ast.UAdd, ast.USub, ast.Not)
_ALLOWED_CMPS = (ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq)
_ALLOWED_BOOL = (ast.And, ast.Or)


def _validate_node(node, param_names, where, src):
    def bad(reason):
        raise AdapterError(f"{where}: illegal expression {src!r} — {reason}")

    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, str)):
            bad(f"constant {node.value!r} — only integers and quoted strings "
                f"are allowed (write exact rationals as e.g. 1/2, never 0.5)")
        return
    if isinstance(node, ast.Name):
        if node.id not in param_names:
            bad(f"name {node.id!r} is not a declared family parameter "
                f"({sorted(param_names)})")
        return
    if isinstance(node, ast.BinOp):
        if not isinstance(node.op, _ALLOWED_BINOPS):
            bad(f"operator {type(node.op).__name__} — only + - * / allowed")
        _validate_node(node.left, param_names, where, src)
        _validate_node(node.right, param_names, where, src)
        return
    if isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, _ALLOWED_UNARY):
            bad(f"unary operator {type(node.op).__name__}")
        _validate_node(node.operand, param_names, where, src)
        return
    if isinstance(node, ast.BoolOp):
        if not isinstance(node.op, _ALLOWED_BOOL):
            bad(f"boolean operator {type(node.op).__name__}")
        for v in node.values:
            _validate_node(v, param_names, where, src)
        return
    if isinstance(node, ast.Compare):
        if not all(isinstance(op, _ALLOWED_CMPS) for op in node.ops):
            bad("comparison operator outside < <= > >= == !=")
        _validate_node(node.left, param_names, where, src)
        for c in node.comparators:
            _validate_node(c, param_names, where, src)
        return
    if isinstance(node, ast.Call):
        if not (isinstance(node.func, ast.Name) and node.func.id == "abs"
                and len(node.args) == 1 and not node.keywords):
            bad("the only allowed function is abs(x)")
        _validate_node(node.args[0], param_names, where, src)
        return
    bad(f"disallowed syntax node {type(node).__name__}")


def _coerce(v):
    """Exact-arithmetic leaf coercion: ints -> Fraction; strings stay."""
    if isinstance(v, bool):
        return v
    if isinstance(v, int):
        return Fr(v)
    return v


def _eval_node(node, params):
    if isinstance(node, ast.Constant):
        return _coerce(node.value)
    if isinstance(node, ast.Name):
        return _coerce(params[node.id])          # KeyError -> caller handles
    if isinstance(node, ast.BinOp):
        a = _eval_node(node.left, params)
        b = _eval_node(node.right, params)
        if isinstance(node.op, ast.Add):
            return a + b
        if isinstance(node.op, ast.Sub):
            return a - b
        if isinstance(node.op, ast.Mult):
            return a * b
        return a / b                              # Div; Fr/0 -> ZeroDivisionError
    if isinstance(node, ast.UnaryOp):
        v = _eval_node(node.operand, params)
        if isinstance(node.op, ast.USub):
            return -v
        if isinstance(node.op, ast.UAdd):
            return +v
        return not v                              # Not
    if isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            out = True
            for v in node.values:
                out = _eval_node(v, params)
                if not out:
                    return False
            return bool(out)
        for v in node.values:
            out = _eval_node(v, params)
            if out:
                return bool(out)
        return False
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, params)
        for op, comp in zip(node.ops, node.comparators):
            right = _eval_node(comp, params)
            if isinstance(op, ast.Lt):
                ok = left < right
            elif isinstance(op, ast.LtE):
                ok = left <= right
            elif isinstance(op, ast.Gt):
                ok = left > right
            elif isinstance(op, ast.GtE):
                ok = left >= right
            elif isinstance(op, ast.Eq):
                ok = left == right
            else:
                ok = left != right
            if not ok:
                return False
            left = right
        return True
    if isinstance(node, ast.Call):                # validated: abs only
        return abs(_eval_node(node.args[0], params))
    raise AdapterError(f"unevaluable node {type(node).__name__}")  # unreachable


def compile_expression(src: str, param_names, where: str):
    """src -> fn(params). Fraction-exact; raises AdapterError at compile time
    on anything outside the declared grammar."""
    if not isinstance(src, str) or not src.strip():
        raise AdapterError(f"{where}: expression missing or blank")
    try:
        tree = ast.parse(src, mode="eval")
    except SyntaxError as e:
        raise AdapterError(f"{where}: unparseable expression {src!r} ({e.msg})")
    _validate_node(tree.body, frozenset(param_names), where, src)

    def fn(params, _body=tree.body):
        return _eval_node(_body, params)
    fn.expression = src
    return fn


# ---------------------------------------------------------------------------
# Block -> Taxonomy
# ---------------------------------------------------------------------------
def _parse_frac(v, where):
    if isinstance(v, bool) or isinstance(v, float):
        raise AdapterError(f"{where}: {v!r} — numeric values must be exact "
                           f"(integer or 'p/q' string), never float")
    if isinstance(v, int):
        return Fr(v)
    if isinstance(v, str):
        try:
            return Fr(v)
        except (ValueError, ZeroDivisionError):
            raise AdapterError(f"{where}: {v!r} is not an exact rational")
    raise AdapterError(f"{where}: {v!r} has no exact numeric reading")


def _parse_value(v, form, where):
    """Worked-example trap/correct value, typed by the signature form."""
    if form == S.NUMERIC:
        return _parse_frac(v, where)
    if form == S.CONSTRUCT:
        if not isinstance(v, list):
            raise AdapterError(f"{where}: construct-state value must be an "
                               f"array, got {v!r}")
        return tuple(_parse_frac(x, where) for x in v)
    if form == S.RECIPE:
        if not isinstance(v, str):
            raise AdapterError(f"{where}: keyed-choice value must be a "
                               f"string option, got {v!r}")
        return v
    # unknown form: best-effort typing (the chain reports the label mismatch)
    if isinstance(v, list):
        return tuple(_parse_frac(x, where) for x in v)
    if isinstance(v, str):
        try:
            return Fr(v)
        except (ValueError, ZeroDivisionError):
            return v
    return _parse_frac(v, where)


def _get(d, *keys, default=None):
    for k in keys:
        if k in d:
            return d[k]
    return default


def _cases_fn(cases, param_names, where):
    """keyed-choice `cases`: [{when: <bool expr>, option: str}...,
    {option: str}] — first matching when wins; trailing no-when = else."""
    if not isinstance(cases, list) or not cases:
        raise AdapterError(f"{where}: cases must be a non-empty array")
    compiled = []
    for i, c in enumerate(cases):
        if not isinstance(c, dict) or not isinstance(c.get("option"), str):
            raise AdapterError(f"{where}: cases[{i}] needs a string `option`")
        when = c.get("when")
        wfn = (compile_expression(when, param_names, f"{where}.cases[{i}].when")
               if when is not None else None)
        compiled.append((wfn, c["option"]))

    def fn(params):
        for wfn, option in compiled:
            if wfn is None or wfn(params):
                return option
        raise ValueError(f"{where}: no case matched params {params!r}")
    return fn


def _signature_from(sd, where):
    if not isinstance(sd, dict):
        raise AdapterError(f"{where}: signature must be an object")
    label = sd.get("label")
    if not isinstance(label, str) or not label.strip():
        raise AdapterError(f"{where}: signature has no label")
    where = f"{where} signature {label!r}"
    form_name = sd.get("form")
    form = _FORM_FROM_NAME.get(form_name)
    if form is None:
        raise AdapterError(f"{where}: unknown form {form_name!r} — must be one "
                           f"of numeric-expression | construct-state | "
                           f"keyed-choice (§3.2)")
    family_name = sd.get("family")
    family = S.FAMILIES.get(family_name)
    if family is None:
        raise AdapterError(
            f"{where}: unknown parameter family {family_name!r} — the pinned "
            f"library is {sorted(S.FAMILIES)} (signatures.py; a new family is "
            f"a harness change, not a document field)")
    pnames = family.param_names
    presentation = sd.get("presentation", "any")
    note = sd.get("note", "")
    key_fn = None

    if form == S.NUMERIC:
        fn = compile_expression(_get(sd, "expression"), pnames, where)
        key_src = _get(sd, "keyExpression", "key_expression")
        if key_src is not None:
            key_fn = compile_expression(key_src, pnames, f"{where} key")
    elif form == S.CONSTRUCT:
        comps = _get(sd, "components")
        if not isinstance(comps, list) or not comps:
            raise AdapterError(f"{where}: construct-state needs a non-empty "
                               f"`components` array of expressions")
        fns = [compile_expression(c, pnames, f"{where}.components[{i}]")
               for i, c in enumerate(comps)]
        fn = (lambda params, _fns=fns: tuple(f(params) for f in _fns))
        kcomps = _get(sd, "keyComponents", "key_components")
        if kcomps is not None:
            if not isinstance(kcomps, list) or not kcomps:
                raise AdapterError(f"{where}: keyComponents must be a "
                                   f"non-empty array")
            kfns = [compile_expression(c, pnames, f"{where}.keyComponents[{i}]")
                    for i, c in enumerate(kcomps)]
            key_fn = (lambda params, _fns=kfns: tuple(f(params) for f in _fns))
    else:                                          # RECIPE
        option = sd.get("option")
        if option is not None:
            if not isinstance(option, str):
                raise AdapterError(f"{where}: `option` must be a string")
            fn = (lambda params, _o=option: _o)
        elif sd.get("cases") is not None:
            fn = _cases_fn(sd["cases"], pnames, where)
        else:
            raise AdapterError(f"{where}: keyed-choice needs `option` or "
                               f"`cases`")
        key_option = _get(sd, "keyOption", "key_option")
        key_cases = _get(sd, "keyCases", "key_cases")
        if key_option is not None:
            if not isinstance(key_option, str):
                raise AdapterError(f"{where}: keyOption must be a string")
            key_fn = (lambda params, _o=key_option: _o)
        elif key_cases is not None:
            key_fn = _cases_fn(key_cases, pnames, f"{where} key")

    return S.Signature(label, form, family_name, fn,
                       presentation=presentation, note=note, key_fn=key_fn)


def _constraint_from(cd, param_names, where):
    if not isinstance(cd, dict):
        raise AdapterError(f"{where}: generator constraint must be an object")
    expr = _get(cd, "expression")
    name = cd.get("name") or (expr if isinstance(expr, str) else None)
    if not name:
        raise AdapterError(f"{where}: constraint has neither name nor "
                           f"expression")
    fn = compile_expression(expr, param_names, f"{where} constraint {name!r}")
    return S.Constraint(name, fn,
                        co_live=_get(cd, "coLive", "co_live"),
                        source=cd.get("source", "entry"))


def _entry_param_names(sig_dicts, where):
    """Union of declared params across the entry's signature families —
    the namespace its generator constraints compile against."""
    names = set()
    for sd in sig_dicts:
        fam = S.FAMILIES.get(sd.get("family")) if isinstance(sd, dict) else None
        if fam is not None:
            names.update(fam.param_names)
    if not names:
        # signatureless entry (judgment-only): permissive union — its
        # constraints never execute in sampling, but must still compile
        for fam in S.FAMILIES.values():
            names.update(fam.param_names)
    return frozenset(names)


def _worked_example_from(wd, sigs, where):
    if wd in (None, {}):
        return {}
    if not isinstance(wd, dict):
        raise AdapterError(f"{where}: workedExample must be an object")
    label = _get(wd, "signatureLabel", "signature_label")
    form = next((s.form for s in sigs if s.label == label), None)
    params = wd.get("params")
    if not isinstance(params, dict):
        raise AdapterError(f"{where}: workedExample needs a params object")
    return {"family": wd.get("family"),
            "params": params,
            "signature_label": label,
            "trap": _parse_value(wd.get("trap"), form, f"{where} trap"),
            "correct": _parse_value(wd.get("correct"), form,
                                    f"{where} correct")}


def _entry_from(d, idx):
    if not isinstance(d, dict):
        raise AdapterError(f"entries[{idx}] must be an object")
    tag = d.get("tag")
    if not isinstance(tag, str) or not tag.strip():
        raise AdapterError(f"entries[{idx}] has no tag")
    where = f"entry {tag!r}"

    sig_dicts = d.get("signatures")
    if sig_dicts is None:
        sig_dicts = [d["signature"]] if d.get("signature") else []
    if not isinstance(sig_dicts, list):
        raise AdapterError(f"{where}: signatures must be an array")
    sigs = [_signature_from(sd, where) for sd in sig_dicts]

    pnames = _entry_param_names(sig_dicts, where)
    cons_dicts = _get(d, "generatorConstraints", "generator_constraints",
                      default=[])
    if not isinstance(cons_dicts, list):
        raise AdapterError(f"{where}: generatorConstraints must be an array")
    cons = [_constraint_from(cd, pnames, where) for cd in cons_dicts]

    cit_raw = d.get("citations", [])
    if not isinstance(cit_raw, list):
        raise AdapterError(f"{where}: citations must be an array")
    citations = []
    for c in cit_raw:
        if not (isinstance(c, list) and len(c) == 2
                and all(isinstance(x, str) for x in c)):
            raise AdapterError(f"{where}: citations entries must be "
                               f"[registryKey, claimUsed] string pairs, got "
                               f"{c!r}")
        citations.append(tuple(c))

    flags = d.get("flags", [])
    if not isinstance(flags, list):
        raise AdapterError(f"{where}: flags must be an array")

    return S.Entry(
        tag=tag,
        section=_get(d, "id", "section", default=""),
        title=d.get("title", ""),
        belief=d.get("belief", ""),
        root=_get(d, "cognitiveRoot", "root", default=""),
        severity=d.get("severity", ""),
        severity_note=_get(d, "severityNote", "severity_note", default=""),
        signatures=sigs,
        step_locality=_get(d, "stepLocality", "step_locality", default=""),
        constraints=cons,
        constraints_note=_get(d, "constraintsNote", "constraints_note",
                              default=""),
        belief_rewrite=_get(d, "beliefFormRewrite", "belief_rewrite",
                            default=""),
        propagation=d.get("propagation", ""),
        presentation_sensitivity=_get(d, "presentationClass",
                                      "presentation_sensitivity", default=""),
        remediation=d.get("remediation", ""),
        primary_home=_get(d, "primaryHome", "primary_home", default=""),
        resurfaces=d.get("resurfaces", []),
        resurface_surfaces=_get(d, "resurfaceSurfaces", "resurface_surfaces",
                                default=[]),
        blocker_destination=_get(d, "blockerDestination",
                                 "blocker_destination"),
        blocker_reason=_get(d, "blockerReason", "blocker_reason"),
        neighbor=d.get("neighbor"),
        grounding_tier=_get(d, "groundingTier", "grounding_tier", default=""),
        grounding_flag=_get(d, "groundingFlag", "grounding_flag", default=""),
        citations=citations,
        worked_example=_worked_example_from(
            _get(d, "workedExample", "worked_example"), sigs, where),
        flags=flags,
    )


def _boundary_record_from(d, idx):
    if not isinstance(d, dict) or not isinstance(d.get("tag"), str):
        raise AdapterError(f"boundarySignatureRecords[{idx}] needs a tag")
    where = f"boundary record {d['tag']!r}"
    sig = _signature_from(d.get("signature"), where)
    fam = S.FAMILIES[sig.family]
    cons = [_constraint_from(cd, frozenset(fam.param_names), where)
            for cd in _get(d, "constraints", default=[])]
    return S.BoundarySigRecord(d["tag"], sig, constraints=cons)


def _matrix_row_from(d, idx):
    if not isinstance(d, dict):
        raise AdapterError(f"collisionMatrix[{idx}] must be an object")
    members = _get(d, "pair", "members")
    if not isinstance(members, list) or len(members) < 2:
        raise AdapterError(f"collisionMatrix[{idx}]: needs a pair/members "
                           f"array of >=2 tags")
    probe = _get(d, "probeRef", "probe", default="")
    return S.MatrixRow(d.get("value") or " / ".join(sorted(members)),
                       members, d.get("condition", ""), probe,
                       entry_level=bool(_get(d, "entryLevel", "entry_level",
                                             default=False)))


_KEYING_KEYS = {"hintLadders": "hint_ladders",
                "errorAnalysisRules": "error_analysis_rules",
                "rubricAdvisoryOnly": "rubric_advisory_only",
                "evidenceRouting": "evidence_routing",
                "logBothTagNeither": "log_both_tag_neither"}


def taxonomy_from_block(block: dict, doc_text: str = "") -> S.Taxonomy:
    node_ids = _get(block, "nodeIds", "node_ids")
    if not isinstance(node_ids, list) or not node_ids:
        raise AdapterError("machine block: nodeIds[] missing or empty")
    node_class = _get(block, "nodeClass", "node_class")
    if node_class not in config.CLASS_DEMANDS:
        raise AdapterError(f"machine block: nodeClass {node_class!r} not in "
                           f"{sorted(config.CLASS_DEMANDS)}")
    entries_raw = block.get("entries")
    if not isinstance(entries_raw, list) or not entries_raw:
        raise AdapterError("machine block: entries[] missing or empty")
    entries = [_entry_from(d, i) for i, d in enumerate(entries_raw)]
    tags = [e.tag for e in entries]
    dupes = sorted({t for t in tags if tags.count(t) > 1})
    if dupes:
        raise AdapterError(f"machine block: duplicate entry tags {dupes}")

    boundary = [_boundary_record_from(d, i) for i, d in enumerate(
        _get(block, "boundarySignatureRecords", "boundary_records",
             default=[]))]
    rows = [_matrix_row_from(d, i) for i, d in enumerate(
        _get(block, "collisionMatrix", "matrix_rows", default=[]))]

    rd = _get(block, "registryDiff", "registry_diff", default={}) or {}
    registry_diff = {"adds": rd.get("adds", []),
                     "redefines": rd.get("redefines", []),
                     "rekeys": _get(rd, "rekeys", default=[]),
                     "boundary_notes": _get(rd, "boundaryNotes",
                                            "boundary_notes", default=[])}

    kc_raw = _get(block, "keyingContract", "keying_contract", default={}) or {}
    keying = {snake: bool(_get(kc_raw, camel, snake, default=False))
              for camel, snake in _KEYING_KEYS.items()}

    ladder = _get(block, "exemplarLadder", "exemplar_ladder")

    return S.Taxonomy(
        node_ids=node_ids,
        node_class=node_class,
        entries=entries,
        boundary_records=boundary,
        matrix_rows=rows,
        global_generator_rule=_get(block, "globalGeneratorRule",
                                   "global_generator_rule", default=""),
        not_an_error=_get(block, "notAnError", "not_an_error", default=[]),
        rubric_table=_get(block, "rubricTable", "rubric_table", default=[]),
        exemplar_ladder=ladder,
        registry_diff=registry_diff,
        keying_contract=keying,
        doc_text=doc_text,
        boundary_shortfall_flag=_get(block, "boundaryShortfallFlag",
                                     "boundary_shortfall_flag"),
    )


def parse_machine_block(md_text: str) -> S.Taxonomy:
    """The GAP-2 entry point: taxonomy.md text -> executable Taxonomy."""
    return taxonomy_from_block(extract_machine_block(md_text),
                               doc_text=md_text)


def build_taxonomy(node_id: str, doc_text: str) -> S.Taxonomy:
    """Runner-facing builder (run_taxonomy_pilot._taxonomy_builder probe)."""
    taxonomy = parse_machine_block(doc_text)
    if node_id not in taxonomy.node_ids:
        raise AdapterError(f"machine block nodeIds {taxonomy.node_ids} do not "
                           f"include the staged node {node_id!r}")
    return taxonomy


# ---------------------------------------------------------------------------
# GAP 3 — machine-block merge (assembly). Judgment entries win on conflict;
# draft supplies the mechanical layer; membership follows the judgment block
# (spec §1.3 step 3: judgment owns strike/merge/add and the no-padding
# record). Additions and strikes are REPORTED, never silent — additions
# re-trigger the full harness chain (spec §4.2 entry-addition rule).
# ---------------------------------------------------------------------------
_DRAFT_OWNED_ENTRY_FIELDS = (
    # §1.5 field-ownership map, draft column (camelCase block spelling)
    "signatures", "signature", "generatorConstraints", "constraintsNote",
    "stepLocality", "propagation", "presentationClass", "workedExample",
    "flags")


def merge_machine_blocks(draft_block: dict, judgment_block: dict
                         ) -> tuple[dict, dict]:
    """(merged_block, merge_report). Node-level and entry-level: any key the
    judgment block provides wins; the draft fills everything else."""
    d_entries = {e.get("tag"): e for e in draft_block.get("entries", [])
                 if isinstance(e, dict)}
    j_entries = judgment_block.get("entries", [])
    if not isinstance(j_entries, list):
        raise AdapterError("judgment machine block: entries[] is not an array")

    merged_entries, additions, overrides = [], [], {}
    for je in j_entries:
        tag = je.get("tag") if isinstance(je, dict) else None
        de = d_entries.get(tag)
        if de is None:
            additions.append(tag)               # judgment ADD — full mechanical
            merged_entries.append(je)           # field set required; the chain
            continue                            # re-verifies it (spec §4.2)
        conflicted = [k for k in _DRAFT_OWNED_ENTRY_FIELDS
                      if k in je and k in de and je[k] != de[k]]
        if conflicted:
            overrides[tag] = conflicted         # judgment wins — recorded
        merged_entries.append({**de, **je})
    struck = [t for t in d_entries if t not in
              {e.get("tag") for e in j_entries if isinstance(e, dict)}]

    merged = {**draft_block,
              **{k: v for k, v in judgment_block.items() if k != "entries"},
              "entries": merged_entries}
    node_overrides = sorted(k for k in judgment_block
                            if k != "entries" and k in draft_block
                            and judgment_block[k] != draft_block[k])
    report = {
        "additions": additions,
        "struckByOmission": struck,
        "draftOwnedFieldOverrides": overrides,
        "nodeLevelOverrides": node_overrides,
        "harnessRechainRequired": bool(additions),
        "rule": "judgment entries win on conflict; draft supplies the "
                "mechanical layer; membership follows the judgment block "
                "(strike/merge/add authority, spec §1.3 step 3 / §1.5)",
    }
    return merged, report


# ---------------------------------------------------------------------------
# Prompt-side contract text (orchestrate injects these — GAP 2a / GAP 4)
# ---------------------------------------------------------------------------
def _family_catalog() -> str:
    return "\n".join(f"  {name}({', '.join(fam.param_names)})"
                     for name, fam in sorted(S.FAMILIES.items()))


MACHINE_BLOCK_CONTRACT = (
    "MACHINE-READABLE TAXONOMY BLOCK — REQUIRED (TAXONOMY_REGEN_SPEC §3.2; "
    "harness contract).\n"
    "The document MUST END with exactly one fenced block tagged:\n"
    "```json taxonomy-machine-block\n{ ... }\n```\n"
    "The prose sections are authoritative for the mr-kahn audit; the machine "
    "block is the harness contract; the two MUST agree — a disagreement is a "
    "document defect.\n\n"
    "Top-level object fields:\n"
    "  nodeIds[] (covered node ids), nodeClass (conceptual | word-problem | "
    "graphing | procedural),\n"
    "  entries[], boundarySignatureRecords[] ({tag, signature, constraints[]}"
    " — registry boundary tags the doc states signatures for),\n"
    "  collisionMatrix[] ({pair[] (tags; \"KEY\" allowed for trap-vs-correct "
    "rows), value, condition, probeRef, entryLevel?}),\n"
    "  notAnError[] ({candidate, disposition, reason}), resurfaceNodes[] "
    "(union of entry resurfaces, informational),\n"
    "  registryDiff {adds[], redefines[], rekeys[], boundaryNotes[]},\n"
    "  rubricTable[] ({element, counters[] of entry tags}),\n"
    "  globalGeneratorRule (string), exemplarLadder {entry, rungs[3]},\n"
    "  keyingContract {hintLadders, errorAnalysisRules, rubricAdvisoryOnly, "
    "evidenceRouting, logBothTagNeither}.\n\n"
    "entries[] — one object per taxonomy entry:\n"
    "  {id (section number), tag, title, belief, cognitiveRoot, severity, "
    "severityNote, groundingTier, groundingFlag,\n"
    "   citations [[registryKey, claimUsed], ...], signatures[] (singular "
    "`signature` accepted for one),\n"
    "   generatorConstraints[] ({name, expression, coLive?, source?}), "
    "constraintsNote (required text when constraints are deliberately "
    "empty),\n"
    "   stepLocality, propagation, presentationClass, beliefFormRewrite, "
    "remediation, primaryHome,\n"
    "   resurfaces[], resurfaceSurfaces[], blockerDestination ({type: node|"
    "below-graph, id?/surface?}), blockerReason, neighbor,\n"
    "   workedExample {family, params, signatureLabel, trap, correct}, "
    "flags[]}.\n\n"
    "Detection-signature forms (§3.2 — every signature machine-evaluable; "
    "prose restatement is additional, never a substitute):\n"
    "  numeric-expression: {label, form: \"numeric-expression\", family, "
    "expression, keyExpression?, presentation, note?}\n"
    "  construct-state:    {label, form: \"construct-state\", family, "
    "components[], keyComponents[]?, presentation, note?}\n"
    "  keyed-choice:       {label, form: \"keyed-choice\", family, option | "
    "cases[{when, option}..., {option}], keyOption? | keyCases?, "
    "presentation, note?}\n"
    "Expression grammar (SAFE evaluator — anything else is rejected): the "
    "family's declared parameters, integer constants, + - * /, abs(), "
    "comparisons (< <= > >= == !=), and/or/not, quoted string constants in "
    "comparisons. Arithmetic is Fraction-exact: write 1/2, NEVER 0.5. "
    "Fractions serialize as strings \"p/q\"; construct-state tuples as "
    "arrays; keyed options as strings.\n"
    "Pinned parameter-family library (signatures.py — a signature naming any "
    "other family is rejected; a needed new family is a harness change to "
    "flag, not a field to invent):\n"
    + _family_catalog() + "\n"
    "A missing or malformed block is an F-STRUCT adapter failure: the "
    "document is quarantined unread."
)

CITATIONS_DELTA_CONTRACT = (
    "CITATIONS-DELTA BLOCK — REQUIRED (TAXONOMY_REGEN_SPEC §2.4/§9; harness "
    "contract).\n"
    "The document MUST ALSO contain exactly one fenced block tagged:\n"
    "```json citations-delta\n{\"newCitations\": [], \"reusedCitations\": []}"
    "\n```\n"
    "  newCitations[]:    {key, authors[], year, title, venue, claimUsed} — "
    "every work cited that is NOT in the verified-citations registry "
    "(enters the §2.4 verification queue).\n"
    "  reusedCitations[]: {key, claimUsed} — registry works reused (a new "
    "claim against a verified work re-queues for claim-consistency).\n"
    "Every citation used by any entry must appear in exactly one of the two "
    "lists. A missing or malformed block is an F-STRUCT finding, not a "
    "repairable omission."
)


# ---------------------------------------------------------------------------
# GOLD serialization — build_gold_taxonomy's machine form as a machine block.
# The gold signatures/constraints are Python lambdas; these tables carry
# their exact expression forms (the same closed forms, confusable_pairwise
# provenance). The self-test proves behavioral equivalence sample-by-sample
# and then runs the FULL check chain through the adapter path.
# ---------------------------------------------------------------------------
_M_EXPR = "(y2 - y1) / (x2 - x1)"

GOLD_SIG_SPECS = {
    "Δy = y2 - y1": {"expression": "y2 - y1"},
    "-m": {"expression": f"-({_M_EXPR})"},
    "Δx/Δy = 1/m": {"expression": "(x2 - x1) / (y2 - y1)"},
    "(x0+run, y0+|rise|)": {
        "components": ["x1 + 1", f"y1 + abs({_M_EXPR})"],
        "keyComponents": ["x1 + 1", f"y1 + {_M_EXPR}"]},
    "|m| (read-a-graph)": {"expression": f"abs({_M_EXPR})"},
    "|m|": {"expression": f"abs({_M_EXPR})"},
    "Δy - Δx": {"expression": "(y2 - y1) - (x2 - x1)"},
    "y2 - x2": {"expression": "y2 - x2"},
    "(y2-x2)/(y1-x1)": {"expression": "(y2 - x2) / (y1 - x1)"},
    "y2 (queried-point height)": {"expression": "y2"},
    "y2/x2": {"expression": "y2 / x2"},
    "y1/x1": {"expression": "y1 / x1"},
    "Δy (chunk rate)": {"expression": "y2 - y1"},
    "m·(sx/sy)": {"expression": f"({_M_EXPR}) * sx / sy"},
    "visually-steeper-but-numerically-smaller panel": {"option": "panel-A"},
    "degenerate-label swap": {
        "cases": [{"when": "orientation == 'vertical'", "option": "0"},
                  {"option": "undefined"}]},
    "y1 + m1·(x3-x1) (linear extrapolation)": {
        "expression": f"y1 + ({_M_EXPR}) * (x3 - x1)"},
    "constancy-verdict 'yes' from endpoints": {
        "option": "yes-constant", "keyOption": "no-not-constant"},
    # boundary records
    "1/m (transposed pairs)": {"expression": "(x2 - x1) / (y2 - y1)"},
    "-1/m": {"expression": "-((x2 - x1) / (y2 - y1))"},
}

GOLD_CONSTRAINT_EXPRS = {
    "|Δx| != 1": "abs(x2 - x1) != 1",
    "y1 != 0 (co-live slope-as-height)": "y1 != 0",
    "|m| != 1": f"abs({_M_EXPR}) != 1",
    "m < 0 (arming)": f"({_M_EXPR}) < 0",
    "y1 != x1": "y1 != x1",
    "b != 0 (arming)": f"y1 - ({_M_EXPR}) * x1 != 0",
    "x1, x2 != 0": "x1 != 0 and x2 != 0",
    "y1 != 0": "y1 != 0",
    "y2 != m (parameter choice)": f"y2 != {_M_EXPR}",
    "sx != sy (arming)": "sx != sy",
    "per-item: neither variant equals m or Δy":
        f"((y2 - y1) - (x2 - x1)) != ({_M_EXPR}) "
        f"and (y2 - x2) != ({_M_EXPR}) "
        "and ((y2 - y1) - (x2 - x1)) != (y2 - y1) "
        "and (y2 - x2) != (y2 - y1)",
    "queried x != 1 (CC-04 arming)": "x2 != 1",
    "panel construction: mA < mB and mA/syA > mB/syB":
        "mA < mB and mA / syA > mB / syB",
    "item is degenerate (x1=x2 xor y1=y2)":
        "orientation == 'vertical' or orientation == 'horizontal'",
    "table is nonlinear (first differences nonconstant)":
        f"({_M_EXPR}) != (y3 - y2) / (x3 - x2)",
}
# same constraint NAME, different scope on 2.9 (two points armed, not one)
GOLD_CONSTRAINT_OVERRIDES = {
    ("slope-as-single-point-ratio", "queried x != 1 (CC-04 arming)"):
        "x2 != 1 and x1 != 1",
}


def _frac_json(v):
    if isinstance(v, tuple):
        return [_frac_json(x) for x in v]
    if isinstance(v, (int, Fr)):
        return str(Fr(v))
    return v                                       # keyed-choice option string


def _gold_sig_json(sig, owner_tag):
    spec = GOLD_SIG_SPECS.get(sig.label)
    if spec is None:
        raise AdapterError(f"gold serialization table drift: no expression "
                           f"spec for signature {sig.label!r} ({owner_tag})")
    out = {"label": sig.label, "form": _FORM_NAME[sig.form],
           "family": sig.family, "presentation": sig.presentation}
    if sig.note:
        out["note"] = sig.note
    out.update(spec)
    return out


def _gold_constraint_json(c, owner_tag):
    expr = GOLD_CONSTRAINT_OVERRIDES.get((owner_tag, c.name),
                                         GOLD_CONSTRAINT_EXPRS.get(c.name))
    if expr is None:
        raise AdapterError(f"gold serialization table drift: no expression "
                           f"for constraint {c.name!r} ({owner_tag})")
    out = {"name": c.name, "expression": expr, "source": c.source}
    if c.co_live is not None:
        out["coLive"] = c.co_live
    return out


def gold_machine_block() -> dict:
    """build_gold_taxonomy() -> machine-block dict (the §3.2 serialization)."""
    tax = S.build_gold_taxonomy()
    entries = []
    for e in tax.entries:
        we = {}
        if e.worked_example:
            w = e.worked_example
            we = {"family": w["family"], "params": w["params"],
                  "signatureLabel": w["signature_label"],
                  "trap": _frac_json(w["trap"]),
                  "correct": _frac_json(w["correct"])}
        entries.append({
            "id": e.section, "tag": e.tag, "title": e.title,
            "belief": e.belief, "cognitiveRoot": e.root,
            "severity": e.severity, "severityNote": e.severity_note,
            "groundingTier": e.grounding_tier,
            "groundingFlag": e.grounding_flag,
            "citations": [list(c) for c in e.citations],
            "signatures": [_gold_sig_json(s, e.tag) for s in e.signatures],
            "generatorConstraints": [_gold_constraint_json(c, e.tag)
                                     for c in e.constraints],
            "constraintsNote": e.constraints_note,
            "stepLocality": e.step_locality,
            "propagation": e.propagation,
            "presentationClass": e.presentation_sensitivity,
            "beliefFormRewrite": e.belief_rewrite,
            "remediation": e.remediation,
            "primaryHome": e.primary_home,
            "resurfaces": e.resurfaces,
            "resurfaceSurfaces": e.resurface_surfaces,
            "blockerDestination": e.blocker_destination,
            "blockerReason": e.blocker_reason,
            "neighbor": e.neighbor,
            "workedExample": we,
            "flags": sorted(e.flags),
        })
    return {
        "nodeIds": tax.node_ids,
        "nodeClass": tax.node_class,
        "entries": entries,
        "boundarySignatureRecords": [
            {"tag": r.tag,
             "signature": _gold_sig_json(r.signatures[0], r.tag),
             "constraints": [_gold_constraint_json(c, r.tag)
                             for c in r.constraints]}
            for r in tax.boundary_records],
        "collisionMatrix": [
            {"pair": sorted(row.members), "value": row.value,
             "condition": row.condition, "probeRef": row.probe,
             "entryLevel": row.entry_level}
            for row in tax.matrix_rows],
        "notAnError": tax.not_an_error,
        "resurfaceNodes": sorted({rid for e in tax.entries
                                  for rid in e.resurfaces}),
        "registryDiff": {"adds": tax.registry_diff["adds"],
                         "redefines": tax.registry_diff["redefines"],
                         "rekeys": tax.registry_diff["rekeys"],
                         "boundaryNotes": tax.registry_diff["boundary_notes"]},
        "rubricTable": tax.rubric_table,
        "globalGeneratorRule": tax.global_generator_rule,
        "exemplarLadder": tax.exemplar_ladder,
        "keyingContract": {camel: bool(tax.keying_contract.get(snake))
                           for camel, snake in _KEYING_KEYS.items()},
    }
