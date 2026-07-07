#!/usr/bin/env python3
"""
derive_manifest.py -- deterministic derivation of docs/archetypes/manifest.json
from docs/archetypes/MANIFEST.md (archetypeLibraryVersion 1.1.0).

Source of truth: MANIFEST.md. This script mechanizes:
  - Section 3  node-type classifier (objective-verb lists + standards families +
    domain criteria; tie-break order conceptual > graphing > word-problem > procedural)
  - Section 4  v1.1.0 distribution rows (six item-bank archetypes per class)
  - Section 5  phase bands (whole-bank) + hard enriched constraints
  - Section 7  interpretationSlot coverage note (scaf is the sole bank carrier)
  - Section 9  splitPreemptively flag (per-archetype median token weights measured
    from the gold node; engineering constants fixed at this derivation gate)

Special rows:
  - ALG-L06 EXCLUDED (gold reference, never regenerated)  -> 74 emitted nodes.
  - ALG-L19 class pinned "conceptual" by DECISION_F-IF-B6 section 7 addendum;
    flagged stubNode + banklessUntilPhase3 (empty banks at graph 1.12.0).
  - ALG-L05 flagged taxonomyMode "conformance-pass" (gold cluster doc covers it
    partially; TAXONOMY_REGEN_SPEC section 0 node-inventory rule).

Deterministic, stdlib only. No graph edits. Run from anywhere:
  python scripts/derive_manifest.py
"""

import json
import re
import sys
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
GRAPH_PATH = ROOT / "data" / "algebra1-graph.json"
GOLD_ITEMS_PATH = ROOT / "docs" / "gold-node" / "gold-node-items.json"
GOLD_RUBRICS_PATH = ROOT / "docs" / "gold-node" / "GOLD_NODE_RUBRICS.md"
OUT_PATH = ROOT / "docs" / "archetypes" / "manifest.json"

MANIFEST_VERSION = "1.0.0"
ARCHETYPE_LIBRARY_VERSION = "1.1.0"
EXPECTED_GRAPH_PIN = "1.12.0"
GOLD_NODE = "ALG-L06"

CLASSES = ("conceptual", "graphing / representation", "word-problem / modeling", "procedural")
# short keys used internally, mapped to the section-3 row names above
C_CONC, C_GRAPH, C_WP, C_PROC = "conceptual", "graphing", "word-problem", "procedural"
CLASS_LABEL = {
    C_CONC: "conceptual",
    C_GRAPH: "graphing / representation",
    C_WP: "word-problem / modeling",
    C_PROC: "procedural",
}
TIE_BREAK_ORDER = [C_CONC, C_GRAPH, C_WP, C_PROC]  # MANIFEST section 3, verbatim order

ARCHETYPES = (
    "scaffolded-multistep",
    "error-analysis",
    "predict-reveal",
    "interactive",
    "discrimination",
    "rubric-explanation",
)

# ---- Section 4 distribution rows (v1.1.0), verbatim from MANIFEST.md ----
QUOTAS = {
    C_CONC:  {"scaffolded-multistep": 4, "error-analysis": 2, "predict-reveal": 1,
              "interactive": 3, "discrimination": 3, "rubric-explanation": 2},   # total 15
    C_PROC:  {"scaffolded-multistep": 5, "error-analysis": 4, "predict-reveal": 1,
              "interactive": 1, "discrimination": 2, "rubric-explanation": 1},   # total 14
    C_WP:    {"scaffolded-multistep": 4, "error-analysis": 2, "predict-reveal": 2,
              "interactive": 2, "discrimination": 3, "rubric-explanation": 2},   # total 15
    C_GRAPH: {"scaffolded-multistep": 3, "error-analysis": 2, "predict-reveal": 2,
              "interactive": 5, "discrimination": 2, "rubric-explanation": 1},   # total 15
}
EXPECTED_TOTALS = {C_CONC: 15, C_PROC: 14, C_WP: 15, C_GRAPH: 15}

# ---- Section 5 phase bands (whole-bank) + hard enriched constraints ----
PHASE_BANDS = {
    "scope": "whole node bank (core + enriched); checked only on the merged bank, never per fragment (section 9)",
    "P1_sport": "25-30%",
    "P2_blended": "35-40%",
    "P3_neutral": ">=30% (P3 non-empty is a hard structural invariant, BATCH_REGEN_SPEC 5.2 step 3)",
    "standaloneP3RealisticValues": "30-40% of the whole-bank standalone-P3 slice; construct-integrity exemptions (integer-snap interactives, boundary-construct clean numbers) apply by design",
}
HARD_ENRICHED_CONSTRAINTS = {
    "p3NonEmpty": True,
    "minP3ScaffoldedInstances": 1,
    "note": "enriched-level hard constraints per section 5: P3 set non-empty AND >=1 P3 scaffolded-multistep instance (fading capstone, archetype-scaffolded-multistep a.7 + section 7 carrier arithmetic). Bands themselves are whole-bank targets, not integer-satisfiable per enriched slice.",
}

# ---- Section 7 interpretation-slot coverage notes, per class ----
INTERP_NOTE = {
    C_CONC:  "carriers = 4 scaf (sole interpretationSlot:true bank archetype); enriched instruction-register share 4/~11 ~ 36% (>=25%). Core-regen prompt MUST carry both quotas: >=25% instruction-register meaning-anywhere; >=13% standalone-P3 interpretation-final.",
    C_PROC:  "carriers = 5 scaf; enriched instruction-register share 5/~10 ~ 50% (>=25%). Core-regen prompt MUST carry both quotas: >=25% instruction-register meaning-anywhere; >=13% standalone-P3 interpretation-final.",
    C_WP:    "carriers = 4 scaf; enriched instruction-register share 4/~10 ~ 40% (>=25%). Core-regen prompt MUST carry both quotas: >=25% instruction-register meaning-anywhere; >=13% standalone-P3 interpretation-final.",
    C_GRAPH: "carriers = 3 scaf; enriched instruction-register share 3/~10 ~ 30% (>=25%) -- least slack: below 3 scaf the enriched slice falls out of band (manifest defect). Core-regen prompt MUST carry both quotas: >=25% instruction-register meaning-anywhere; >=13% standalone-P3 interpretation-final.",
}

# ---- Section 9 engineering constants (fixed at this derivation gate, mr-gates) ----
CORE_COUNT = 85          # regenerated core ~85 items/node (MANIFEST section 6 arithmetic)
CORE_ITEM_WEIGHT = 350   # tokens per core item (section 9 rule text)
SAFETY_FACTOR = 0.75
MAX_TOKENS = 64000
CHARS_PER_TOKEN = 4      # token estimate = minified-JSON char count / 4

# ---------------------------------------------------------------------------
# Section 3 classifier
# ---------------------------------------------------------------------------

# Exemplar verb lists, verbatim from the section-3 rows (matched as clause-leading
# verb stems). "construct" (graphing) requires a display object in the same clause
# ("construct scatter plots" yes; "construct linear equations" no).
VERB_STEMS = {
    C_PROC:  ["solve", "simplif", "factor", "comput", "evaluat", "isolat", "extract"],
    C_CONC:  ["interpret", "contrast", "explain"],
    C_GRAPH: ["graph", "plot"],
    C_WP:    ["model"],
}
CONSTRUCT_DISPLAY_RE = re.compile(r"\b(plots?|graphs?|histograms?|scatter|displays?|lines?)\b")

# Criterion-prose-derived matchers (from the section-3 criterion sentences, not the
# italic exemplar lists). They classify, but force confidence "low" and a flag.
PROSE_TRANSLATE_RE = re.compile(r"^translat")             # wp: "context->math translation"
PROSE_MOVE_BETWEEN_RE = re.compile(r"\bmov(e|ing) between\b")  # graphing: "moving between representations"

# Exemplar multi-word phrases (whole-objective scan).
PHRASE_IDENTIFY_MEANING_RE = re.compile(r"\bidentify the meaning\b")                    # conceptual
PHRASE_READ_FROM_RE = re.compile(r"\bread from a (graph|table|display)\b")              # graphing
PHRASE_REPRESENT_SITUATION_RE = re.compile(r"\brepresent(s|ing)? (a |an |[\w-]+ )*situations?\b")  # wp
PHRASE_WRITE_EQUATION_RE = re.compile(r"\bwrite (an |[\w-]+ )*equations?\b")            # wp (context-guarded)

# "objective names a real-world quantity class" (wp criterion) -- conservative list.
WP_KEYWORD_RE = re.compile(
    r"\b(situations?|contexts?|real|real-world|discounts?|interest|projectile|optimization|growth|decay)\b"
)

def standards_family(code: str):
    """Map one CCSS code to a class per section 3, with sub-family precedence.

    Interpretive ruling (recorded in the manifest header): the conceptual row claims
    'F-IF ... concept strands' and the graphing row claims 'representation strands';
    F-IF.C ('Analyze functions using different representations') is assigned to
    graphing -- required for consistency with the section-3 graphing sample
    'graph-a-line nodes' (ALG-L09/ALG-Q06 carry F-IF.C.7a). Likewise 8.F.A ->
    graphing (named), 8.F.B -> conceptual; F-LE.A -> word-problem (named), other
    F-LE -> conceptual.
    """
    if "F-LE.A" in code:
        return C_WP
    if "F-LE" in code:
        return C_CONC
    if "A-CED" in code:
        return C_WP
    if "8.F.A" in code:
        return C_GRAPH
    if "8.F" in code:
        return C_CONC
    if "S-ID.A" in code:
        return C_GRAPH
    if "F-IF.C" in code:
        return C_GRAPH
    if "F-IF" in code:
        return C_CONC
    if "EE.C" in code or "A-REI" in code or "A-SSE" in code or "N-RN" in code:
        return C_PROC
    return None

FRAGMENT_SPLIT_RE = re.compile(r"[,;.]|\band\b|\bor\b|\bthen\b")
TOKEN_RE = re.compile(r"[a-z][\w-]*")

def clause_verb_hits(objective_lc: str):
    """Return ordered list of (class, verb, exemplar_bool) from clause-leading verbs."""
    hits = []
    for frag in FRAGMENT_SPLIT_RE.split(objective_lc):
        frag = frag.strip()
        if not frag:
            continue
        m = TOKEN_RE.search(frag)
        if not m:
            continue
        lead = m.group(0)
        matched = False
        for cls, stems in VERB_STEMS.items():
            if any(lead.startswith(s) for s in stems):
                hits.append((cls, lead, True))
                matched = True
                break
        if matched:
            continue
        if lead.startswith("construct") and CONSTRUCT_DISPLAY_RE.search(frag):
            hits.append((C_GRAPH, "construct(+display object)", True))
            continue
        if PROSE_TRANSLATE_RE.match(lead):
            hits.append((C_WP, lead + " (criterion prose: context->math translation)", False))
    return hits

def classify_raw(node):
    """Apply the section-3 classifier to one node. Returns a dict of results."""
    obj = node["objective"].lower()
    ccss = node["standards"]["ccss"]
    domain = node["domain"]

    verb_hits = clause_verb_hits(obj)

    # exemplar phrases (whole objective)
    if PHRASE_IDENTIFY_MEANING_RE.search(obj):
        verb_hits.append((C_CONC, "phrase 'identify the meaning'", True))
    if PHRASE_READ_FROM_RE.search(obj):
        verb_hits.append((C_GRAPH, "phrase 'read from a graph/table/display'", True))
    if PHRASE_REPRESENT_SITUATION_RE.search(obj):
        verb_hits.append((C_WP, "phrase 'represent a situation'", True))
    kw = WP_KEYWORD_RE.search(obj)
    if PHRASE_WRITE_EQUATION_RE.search(obj) and kw:
        verb_hits.append((C_WP, "phrase 'write an equation' (+context language)", True))
    if PROSE_MOVE_BETWEEN_RE.search(obj):
        verb_hits.append((C_GRAPH, "phrase 'move between' (criterion prose: moving between representations)", False))

    main = verb_hits[0] if verb_hits else None  # (class, verb, exemplar)
    verb_classes = {h[0] for h in verb_hits}

    std_hits = [(standards_family(c), c) for c in ccss]
    std_hits = [(cls, c) for cls, c in std_hits if cls]
    std_classes = {cls for cls, _ in std_hits}

    kw_classes = {C_WP} if kw else set()

    matched = verb_classes | std_classes | kw_classes

    evidence = []
    for cls, verb, exemplar in verb_hits:
        evidence.append("verb '%s' -> %s%s" % (verb, cls, "" if exemplar else " [prose-derived]"))
    for cls, code in std_hits:
        evidence.append("standards %s -> %s" % (code, cls))
    if kw:
        evidence.append("real-world-quantity keyword '%s' -> word-problem" % kw.group(0))

    tie = False
    if not matched:
        if domain == "foundations":
            cls, ev = C_PROC, "no verb/standards criterion matched; domain criterion: foundations fluency cluster -> procedural"
        elif domain == "data":
            cls, ev = C_GRAPH, "no verb/standards criterion matched; domain criterion: data display cluster -> graphing"
        else:
            cls, ev = C_PROC, "no criterion matched; residual default -> procedural (section 3: 'repeatable move sequence' residual)"
        return {"class": cls, "tie": False, "confidence": "low", "evidence": ev,
                "reason_low": "verb matched no list; domain/residual fallback"}

    if len(matched) == 1:
        cls = next(iter(matched))
        if main and main[0] == cls and main[2]:
            conf, reason = "high", None
        else:
            conf, reason = "low", ("main verb matched no exemplar list; class carried by %s"
                                   % ("secondary verb/standards/prose criterion"))
        return {"class": cls, "tie": False, "confidence": conf,
                "evidence": "; ".join(evidence), "reason_low": reason}

    # multiple classes matched
    if main and (std_classes <= {main[0]}) and (kw_classes <= {main[0]}):
        # main-verb dominance (section 3: hybrids take the class matching the main verb);
        # only secondary verbs conflicted.
        cls = main[0]
        return {"class": cls, "tie": False, "confidence": "low",
                "evidence": "; ".join(evidence),
                "reason_low": "criteria conflicted (secondary-verb hits in other classes); resolved by main-verb dominance"}

    # declared tie-break order
    for cls in TIE_BREAK_ORDER:
        if cls in matched:
            return {"class": cls, "tie": True, "confidence": "low",
                    "evidence": "; ".join(evidence),
                    "reason_low": "criteria conflicted across {%s}; section-3 tie-break order engaged"
                                  % ", ".join(sorted(matched))}
    raise AssertionError("unreachable")

# ---- Document pins ----
# (a) Section-3 sample-fit column: document-declared classifications (source of truth).
SAMPLE_PINS = {
    "ALG-F01": C_PROC, "ALG-E03": C_PROC, "ALG-S02": C_PROC, "ALG-Q05": C_PROC, "ALG-Q10": C_PROC,
    "ALG-L05": C_CONC, "ALG-L14": C_CONC,
    "ALG-P04": C_WP,
    "ALG-D02": C_GRAPH,
}
# (b) Decision-record / gate-ruling pins.
DECISION_PINS = {
    "ALG-L19": (C_CONC, "pinned by decision record (DECISION_F-IF-B6 section 7 addendum: sole "
                        "F-IF.B.6 assessment home; class reasoned conceptual there)"),
    # mr-kahn TAXONOMY_REGEN gate ruling (a), recorded here per his instruction: 'record this
    # exact rationale at the class-assignment sign-off.' L11 is math->math template substitution
    # ('write ... using y - y1 = m(x - x1) from a point and slope') -- no situation, no quantity
    # class; the word-problem translation criterion fails outright, so the tie-break never
    # engages. The A-CED.A.2-on-a-substitution-node standards tension is queued to the deferred
    # CCSS verification pass, not resolved here.
    "ALG-L11": (C_PROC, "pinned by mr-kahn gate ruling (TAXONOMY_REGEN_SPEC review, ruling (a)): "
                        "math-to-math template substitution, no context translation; "
                        "translation criterion fails outright, tie-break never engages; "
                        "A-CED.A.2 tension queued to the CCSS verification pass"),
    # mr-kahn class-assignment sign-off (MANIFEST section 8 gate 1, 2026-07-06) -- the 13-row
    # correction table, applied verbatim as pins so the derivation stays reproducible. Non-blocking
    # follow-up recorded by kahn: add 'recognize/classify/determine whether/organize/build' to the
    # section-3 exemplar verb lists at the next manifest version bump so these become derivable.
    "ALG-F10": (C_CONC, "kahn sign-off: 'reason proportionally between quantities' targets a relationship; additive-instead-of-multiplicative is a belief error needing the discrimination-heavy row; domain-fallback miss"),
    "ALG-E06": (C_PROC, "kahn sign-off: literal equations are pure symbol manipulation, zero translation; both tags are move-sequence slips; A-CED.A.4 hit is a standards false positive (queued to CCSS pass)"),
    "ALG-E11": (C_CONC, "kahn sign-off: node-new content is AND/OR set-logic semantics; both tags are belief errors; 'solve' is carried by prereq E10 (L06-precedent: verb reads procedural, node resolves conceptual)"),
    "ALG-E14": (C_CONC, "kahn sign-off: classification of solution structure (one/none/infinite); simplifying is prereq material; both tags are meaning errors about a=a / a=b"),
    "ALG-L12": (C_PROC, "kahn sign-off: form conversion is a repeatable move sequence; both tags are sign/shortcut slips; A-CED.A.2 tie leg was a standards false positive; intercept-graphing secondary"),
    "ALG-L17": (C_PROC, "kahn sign-off (L11 precedent): sequence-to-explicit-rule is math-to-math template substitution (an = a1 + (n-1)d); F-LE.A.2 family hit alone carried word-problem"),
    "ALG-L18": (C_CONC, "kahn sign-off: 'recognize y = kx relationships' meets the conceptual criterion verbatim; both tags are belief errors; residual-default miss"),
    "ALG-S04": (C_CONC, "kahn sign-off: same construct as E14 lifted to systems (classify solution structure); both tags are interpretation errors; consistency pair with E14"),
    "ALG-P05": (C_CONC, "kahn sign-off: vocabulary/classification node ('target is a definition' verbatim); degree-as-term-count is a definition confusion; A-SSE family rule misfires on a vocabulary node"),
    "ALG-Q11": (C_CONC, "kahn sign-off: computing b^2-4ac is trivial; the assessable skill is interpreting its sign as solution count/type; completes the E14/S04/Q11 classification triple"),
    "ALG-Q12": (C_WP,   "kahn sign-off: main verb 'build models for contexts' is the word-problem criterion verbatim; tags are context-interpretation errors; dominant main verb outranks the mechanical tie-break; quadratics' only modeling node"),
    "ALG-S01": (C_GRAPH,"kahn sign-off (unflagged false-high): solve-by-graphing node; both tags are coordinate-plane errors; 'solve' + A-REI.C.6 masked the method; interactive-5 row fits graph-two-lines items"),
    "ALG-D03": (C_GRAPH,"kahn sign-off (unflagged false-high): 'organize in two-way tables' = construct/read a display; tags are representation-reading errors; 'compute' was a secondary-verb hit"),
}

def classify(node):
    node_id = node["id"]
    raw = classify_raw(node)
    if node_id in DECISION_PINS:
        cls, why = DECISION_PINS[node_id]
        agree = raw["class"] == cls
        ev = why + "; raw classifier %s (%s)" % ("agrees" if agree else "DISAGREES", raw["class"])
        return {"class": cls, "tie": False, "confidence": "high", "evidence": ev,
                "pinned": "decision-record", "raw_agrees": agree, "reason_low": None}
    if node_id in SAMPLE_PINS:
        cls = SAMPLE_PINS[node_id]
        agree = raw["class"] == cls
        ev = ("MANIFEST section 3 sample fit (document-pinned); raw classifier %s (%s: %s)"
              % ("agrees" if agree else "DISAGREES -- pin is authoritative, derivation defers to the document",
                 raw["class"], raw["evidence"] if isinstance(raw["evidence"], str) else raw["evidence"]))
        return {"class": cls, "tie": False, "confidence": "high", "evidence": ev,
                "pinned": "section-3 sample fit", "raw_agrees": agree, "reason_low": None}
    raw["pinned"] = None
    raw["raw_agrees"] = True
    return raw

# ---------------------------------------------------------------------------
# Section 9 token-weight measurement
# ---------------------------------------------------------------------------

def minified_len(obj) -> int:
    return len(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))

def measure_weights():
    gold = json.loads(GOLD_ITEMS_PATH.read_text(encoding="utf-8"))
    by_arch = {}
    for item in gold["items"]:
        by_arch.setdefault(item["archetype"], []).append(minified_len(item))
    weights = {}
    provenance = {}
    for arch, lens in sorted(by_arch.items()):
        weights[arch] = int(round(median(lens) / CHARS_PER_TOKEN))
        provenance[arch] = "gold-node-items.json (%d items, minified-JSON chars %s)" % (
            len(lens), sorted(lens))
    # rubric-explanation: the additive gold exemplar lives in GOLD_NODE_RUBRICS.md section 3
    text = GOLD_RUBRICS_PATH.read_text(encoding="utf-8")
    rex = None
    for block in re.findall(r"```json\s*\n(.*?)```", text, flags=re.DOTALL):
        try:
            parsed = json.loads(block)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and parsed.get("id") == "ALG-L06-gold-rex-01" \
                and parsed.get("archetype") == "rubric-explanation":
            rex = parsed
            break
    if rex is None:
        sys.exit("FATAL: ALG-L06-gold-rex-01 not found in GOLD_NODE_RUBRICS.md")
    rex_len = minified_len(rex)
    weights["rubric-explanation"] = int(round(rex_len / CHARS_PER_TOKEN))
    provenance["rubric-explanation"] = (
        "GOLD_NODE_RUBRICS.md section 3 gold instance ALG-L06-gold-rex-01 "
        "(1 item, minified-JSON chars [%d]) -- not present in gold-node-items.json" % rex_len)
    return weights, provenance

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    graph = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
    graph_pin = graph["schema"]["version"]
    assert graph_pin == EXPECTED_GRAPH_PIN, "graph pin %s != expected %s" % (graph_pin, EXPECTED_GRAPH_PIN)
    nodes = graph["nodes"]
    assert len(nodes) == 75, "expected 75 nodes at 1.12.0, got %d" % len(nodes)
    assert any(n["id"] == GOLD_NODE for n in nodes), "gold node missing from graph"

    for cls, q in QUOTAS.items():
        assert sum(q.values()) == EXPECTED_TOTALS[cls], "quota row %s does not sum to section-4 total" % cls

    weights, weight_provenance = measure_weights()
    threshold = SAFETY_FACTOR * MAX_TOKENS

    est_by_class = {
        cls: sum(QUOTAS[cls][a] * weights[a] for a in ARCHETYPES) + CORE_COUNT * CORE_ITEM_WEIGHT
        for cls in QUOTAS
    }

    out_nodes = {}
    table = []
    for node in nodes:
        node_id = node["id"]
        if node_id == GOLD_NODE:
            continue
        r = classify(node)
        cls = r["class"]
        est = est_by_class[cls]
        entry = {
            "nodeId": node_id,
            "class": CLASS_LABEL[cls],
            "classifierEvidence": r["evidence"],
            "tieBreakEngaged": r["tie"],
            "confidence": r["confidence"],
            "archetypeQuotas": dict(QUOTAS[cls]),
            "enrichedTotal": EXPECTED_TOTALS[cls],
            "phaseBands": PHASE_BANDS,
            "hardEnrichedConstraints": HARD_ENRICHED_CONSTRAINTS,
            "interpretationSlotCoverage": INTERP_NOTE[cls],
            "estimatedOutputTokens": est,
            "splitPreemptively": est > threshold,
        }
        if r["confidence"] == "low" and r.get("reason_low"):
            entry["lowConfidenceReason"] = r["reason_low"]
        if r.get("pinned"):
            entry["pinned"] = r["pinned"]
        if node_id == "ALG-L19":
            entry["stubNode"] = True
            entry["banklessUntilPhase3"] = True
            entry["notes"] = ("Stub at 1.12.0 (empty banks, schema.notes sentence). Bank lands in "
                              "Phase 3 before any student ships; inherits DECISION_F-IF-B6 section-7 "
                              "binding authoring constraint (nonlinear relations PRESENTED only; "
                              "no vertex/factoring/exponential manipulation; symbolic work = direct "
                              "substitution per L03).")
        if node_id == "ALG-L05":
            entry["taxonomyMode"] = "conformance-pass"
            entry["notes"] = ("Gold cluster doc covers L05 partially; taxonomy deliverable is a "
                              "completion/conformance pass against the gold doc, not fresh generation "
                              "(TAXONOMY_REGEN_SPEC section 0 node inventory).")
        out_nodes[node_id] = entry
        table.append((node_id, cls, r))

    assert len(out_nodes) == 74, "expected 74 emitted nodes, got %d" % len(out_nodes)

    manifest = {
        "manifestVersion": MANIFEST_VERSION,
        "archetypeLibraryVersion": ARCHETYPE_LIBRARY_VERSION,
        "graphPin": graph_pin,
        "derivedBy": "scripts/derive_manifest.py (deterministic)",
        "sourceOfTruth": "docs/archetypes/MANIFEST.md (v1.1.0); a derivation disagreeing with that document is a build bug",
        "excludedNodes": {GOLD_NODE: "gold reference -- frozen, never regenerated"},
        "section9Constants": {
            "perArchetypeTokenWeights": {a: weights[a] for a in ARCHETYPES},
            "coreItemWeight": CORE_ITEM_WEIGHT,
            "coreCount": CORE_COUNT,
            "safetyFactor": SAFETY_FACTOR,
            "maxTokensAssumed": MAX_TOKENS,
            "splitThresholdTokens": int(threshold),
            "tokenEstimationMethod": ("per-archetype median of minified-JSON character counts of the "
                                      "gold items, divided by %d chars/token; constants fixed at this "
                                      "derivation gate (mr-gates), per MANIFEST section 9" % CHARS_PER_TOKEN),
            "measurementProvenance": weight_provenance,
            "estimatedOutputTokensByClass": {CLASS_LABEL[c]: est_by_class[c] for c in TIE_BREAK_ORDER},
            "splitRule": ("split unit = phase (separate P1/P2/P3 requests merged host-side); whole-bank "
                          "properties (section 5 bands, section 7 floors) validated only on the merged "
                          "bank; per-fragment item counts validated before merge (batch-6 under-production record)"),
        },
        "classifierNotes": {
            "tieBreakOrder": "conceptual > graphing > word-problem > procedural (MANIFEST section 3)",
            "standardsFamilyRulings": ("sub-family precedence: F-LE.A -> word-problem, other F-LE -> conceptual; "
                                       "8.F.A -> graphing, 8.F.B -> conceptual; S-ID.A -> graphing; F-IF.C -> "
                                       "graphing (representation strand -- required by the section-3 'graph-a-line "
                                       "nodes' sample, which carries F-IF.C.7a), other F-IF -> conceptual; "
                                       "EE.C/A-REI/A-SSE/N-RN -> procedural"),
            "proseDerivedMatchers": ("'translate' (word-problem: 'context->math translation') and 'move between' "
                                     "(graphing: 'moving between representations') come from section-3 criterion "
                                     "prose, not the italic exemplar lists -> always confidence low"),
            "wpKeywordList": "situation(s), context(s), real, real-world, discount(s), interest, projectile, optimization, growth, decay",
            "domainCriteria": "fallback only (no verb/standards hit): foundations -> procedural, data -> graphing; otherwise residual procedural",
            "confidenceRule": ("high = document pin OR single matched class carried by a main-verb exemplar hit; "
                               "low = tie-break engaged OR verb matched no exemplar list OR criteria conflicted"),
        },
        "nodes": out_nodes,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # ---- validation (re-read) ----
    check = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    assert len(check["nodes"]) == 74
    valid_labels = set(CLASS_LABEL.values())
    counts = {}
    for nid, e in check["nodes"].items():
        assert e["class"] in valid_labels, nid
        short = [k for k, v in CLASS_LABEL.items() if v == e["class"]][0]
        assert e["archetypeQuotas"] == QUOTAS[short], "quota mismatch on %s" % nid
        assert e["enrichedTotal"] == sum(e["archetypeQuotas"].values()) == EXPECTED_TOTALS[short], nid
        assert 12 <= e["enrichedTotal"] <= 15, nid
        counts[e["class"]] = counts.get(e["class"], 0) + 1
    assert sum(counts.values()) == 74
    assert check["nodes"]["ALG-L19"]["stubNode"] and check["nodes"]["ALG-L19"]["banklessUntilPhase3"]
    assert check["nodes"]["ALG-L05"]["taxonomyMode"] == "conformance-pass"

    # ---- report ----
    print("manifest.json written:", OUT_PATH)
    print("graphPin:", graph_pin, "| nodes emitted:", len(check["nodes"]), "| validation: PASS")
    print("\nsection9Constants:")
    for a in ARCHETYPES:
        print("  %-22s %5d tok" % (a, weights[a]))
    print("  coreItemWeight %d | coreCount %d | safetyFactor %s | maxTokens %d | threshold %d"
          % (CORE_ITEM_WEIGHT, CORE_COUNT, SAFETY_FACTOR, MAX_TOKENS, int(threshold)))
    for c in TIE_BREAK_ORDER:
        print("  est(%-12s) = %5d tok -> splitPreemptively=%s" % (c, est_by_class[c], est_by_class[c] > threshold))
    print("\nclass distribution:")
    for label, n in sorted(counts.items()):
        print("  %-28s %d" % (label, n))
    print("\nnodeId | class | tieBreak | confidence | evidence")
    for node_id, cls, r in table:
        print("%s | %s | %s | %s | %s" % (node_id, cls, "TIE" if r["tie"] else "-",
                                          r["confidence"], r["evidence"]))

if __name__ == "__main__":
    main()
