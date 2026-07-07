"""citations.py — verified-citations.json registry (TAXONOMY_REGEN_SPEC §2).

Registry lives at .authoring-tmp/taxonomies/_registry/verified-citations.json
(spec §2.3 path; the task brief's flat path is superseded by the spec — noted
in the dry-run report). One record per distinct cited work; the `verified.source`
evidence field is REQUIRED (URL / DOI / consulted record — events
reconstructable, not asserted).

F-CITE enforcement (spec §2.1/§2.2): check() -> verified | pending-verification
| MISMATCH. A MISMATCH kills the node's taxonomy. There is deliberately NO
repair path in this module — no function edits an existing record's identity
fields or claims, and none ever will; the only path past a MISMATCH is
regeneration with the finding as a negative constraint. Silent repair would
erase the evidence that the generator fabricates.

Seeded from the gold taxonomy's §1 research base, verified by
"mr-kahn gold gate 2026-07-02".
"""
from __future__ import annotations

import json
import os
import re

import config

_GOLD_SOURCE = "misconception-taxonomy-slope.md §1 research base (kahn-approved)"
_GOLD_VERIFIED = {
    "date": "2026-07-02",
    "by": "mr-kahn gold gate 2026-07-02",
    "method": "kahn-gold-gate",
    "source": _GOLD_SOURCE,   # REQUIRED evidence field
    "existence": True,
}


def _w(key, authors, year, title, venue, claims, note=""):
    rec = {
        "key": key,
        "authors": authors, "year": year, "title": title, "venue": venue,
        "verified": dict(_GOLD_VERIFIED),
        "claims": [{"claim": c, "consistency": "abstract-consistent",
                    "firstUsedBy": "ALG-L06"} for c in claims],
        "status": "verified",
    }
    if note:
        rec["note"] = note
    return rec


_NO_YEAR = ("year not stated in gold §1; existence verified at tradition level "
            "by the kahn gold gate")

SEED_WORKS = [
    _w("stump-1999", ["Stump, S. L."], 1999,
       "Secondary mathematics teachers' knowledge of slope",
       "Mathematics Education Research Journal",
       ["slope conceived as visual steepness/angle rather than ratio",
        "notes vertical-line difficulty in passing"]),
    _w("stump-2001", ["Stump, S. L."], 2001,
       "High school precalculus students' understanding of slope as measure",
       "School Science and Mathematics",
       ["slope conceived as visual steepness/angle rather than ratio"]),
    _w("lobato-thanheiser-2002", ["Lobato, J.", "Thanheiser, E."], 2002,
       "Developing understanding of ratio-as-measure as a foundation for slope",
       "NCTM Yearbook: Making Sense of Fractions, Ratios, and Proportions",
       ["ratio-as-measure: students attend to one quantity instead of "
        "coordinating two"]),
    _w("lobato-ellis-munoz-2003", ["Lobato, J.", "Ellis, A. B.", "Muñoz, R."],
       2003,
       "How 'focusing phenomena' in the instructional environment support "
       "individual students' generalizations",
       "Mathematical Thinking and Learning",
       ["ratio-as-measure and referent anchoring of unit rates"]),
    _w("simon-blume-1994", ["Simon, M. A.", "Blume, G. W."], 1994,
       "Mathematical modeling as a component of understanding ratio-as-measure",
       "Journal of Mathematical Behavior",
       ["constructing steepness as a ratio"]),
    _w("hart-1981", ["Hart, K. M."], 1981,
       "Children's Understanding of Mathematics: 11-16", "John Murray (book)",
       ["additive strategies where multiplicative reasoning is required "
        "(proportional-reasoning failure)"]),
    _w("de-bock-van-dooren", ["De Bock, D.", "Van Dooren, W.", "et al."], None,
       "Illusion of linearity research program",
       "Educational Studies in Mathematics (program)",
       ["illusion of linearity/proportionality — proportional methods "
        "overgeneralized"], note=_NO_YEAR),
    _w("leinhardt-zaslavsky-stein-1990",
       ["Leinhardt, G.", "Zaslavsky, O.", "Stein, M. K."], 1990,
       "Functions, graphs, and graphing: Tasks, learning, and teaching",
       "Review of Educational Research",
       ["slope-height confusion in graph interpretation",
        "scale errors in graph interpretation"]),
    _w("mcdermott-rosenquist-vanzee-1987",
       ["McDermott, L. C.", "Rosenquist, M. L.", "van Zee, E. H."], 1987,
       "Student difficulties in connecting graphs and physics: Examples from "
       "kinematics", "American Journal of Physics",
       ["students read velocity as the height of the position graph"]),
    _w("beichner-1994", ["Beichner, R. J."], 1994,
       "Testing student interpretation of kinematics graphs",
       "American Journal of Physics",
       ["graph-reading errors including slope-height confusion"]),
    _w("postelnicu-2011", ["Postelnicu, V.", "(with Greenes, C.)"], 2011,
       "Student difficulties with linearity and linear functions",
       "Doctoral dissertation, Arizona State University",
       ["slope from graphs with non-homogeneous axis scales is the hardest "
        "item class for algebra students",
        "visual/steepness slope conceptions on graph tasks"]),
    _w("cho-nagle-2017", ["Cho, P.", "Nagle, C."], 2017,
       "Procedural and conceptual difficulties with slope",
       "International Journal of Research in Education and Science",
       ["categorizes concrete slope-calculation errors"]),
    _w("lamon", ["Lamon, S. J."], None,
       "Unit-rate and rational-number reasoning research program",
       "Teaching Fractions and Ratios for Understanding (and papers)",
       ["unit rates and the referent of 1 in rate reasoning"], note=_NO_YEAR),
    _w("cramer-post", ["Cramer, K.", "Post, T."], None,
       "Proportional reasoning (Rational Number Project)",
       "Mathematics Teacher / Rational Number Project",
       ["unit-rate referents in proportional reasoning"], note=_NO_YEAR),
    _w("bezuidenhout-1998", ["Bezuidenhout, J."], 1998,
       "First-year university students' understanding of rate of change",
       "International Journal of Mathematical Education in Science and "
       "Technology",
       ["average vs instantaneous rate confusion"]),
    _w("karplus", ["Karplus, R.", "Pulos, S.", "Stage, E. K."], None,
       "Proportional reasoning of early adolescents (research program)",
       "Educational Studies in Mathematics (program)",
       ["additive-vs-multiplicative reasoning in proportion tasks"],
       note=_NO_YEAR),
]


# ---------------------------------------------------------------------------
# Registry I/O — create + seed + append-queue only. NO edit, NO delete, NO
# status downgrade/upgrade of existing records (the F-CITE no-repair rule).
# ---------------------------------------------------------------------------
def load_registry() -> dict:
    with open(config.CITATION_REGISTRY_PATH, encoding="utf-8") as f:
        return json.load(f)


def _save(reg: dict):
    os.makedirs(config.CITATION_REGISTRY_DIR, exist_ok=True)
    with open(config.CITATION_REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(reg, f, indent=1, ensure_ascii=False)


def seed_registry() -> dict:
    """Initialize the registry with the gold research base if absent.
    Never overwrites an existing registry (no repair path)."""
    if os.path.exists(config.CITATION_REGISTRY_PATH):
        return load_registry()
    reg = {"registry": "verified-citations", "spec": "TAXONOMY_REGEN_SPEC §2.3",
           "works": {w["key"]: w for w in SEED_WORKS}}
    _save(reg)
    return reg


def queue_work(record: dict, registry: dict | None = None) -> dict:
    """Add a NEW work to the verification queue (status 'queued'). Refuses to
    touch an existing key — existing records are immutable from code."""
    reg = registry or load_registry()
    key = record["key"]
    if key in reg["works"]:
        raise ValueError(f"{key} already exists — records are immutable; a "
                         f"burned/failed key stays burned (spec §2.3)")
    if not record.get("verified", {}).get("source"):
        record.setdefault("verified", {})["source"] = None  # queued: filled at verification
    record["status"] = "queued"
    reg["works"][key] = record
    _save(reg)
    return reg


def queue_claim(key: str, claim: str, first_used_by: str,
                registry: dict | None = None) -> dict:
    """A NEW claim against a verified work re-enters the queue for
    claim-consistency only (existence is settled, spec §2.4). Appends —
    never rewrites recorded claims."""
    reg = registry or load_registry()
    work = reg["works"].get(key)
    if work is None:
        raise KeyError(f"unknown work {key} — new works go through queue_work()")
    work["claims"].append({"claim": claim, "consistency": "queued",
                           "firstUsedBy": first_used_by})
    _save(reg)
    return reg


# ---------------------------------------------------------------------------
# check(citation) -> verified | pending-verification | MISMATCH
# ---------------------------------------------------------------------------
def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def check(key: str, claim: str | None = None, *, year: int | None = None,
          title: str | None = None, registry: dict | None = None) -> str:
    """F-CITE gate for one citation use.

    MISMATCH is FATAL to the node's taxonomy and has NO repair path here —
    the only exit is regeneration (spec §2.1/§2.2).
    """
    reg = registry or load_registry()
    work = reg["works"].get(key)
    if work is None:
        return "pending-verification"          # new work — verification queue
    if work.get("status") == "FAILED":
        return "MISMATCH"                      # burned key stays burned
    # identity fields, when the citing entry asserts them, must match the record
    if year is not None and work.get("year") is not None and year != work["year"]:
        return "MISMATCH"
    if title is not None and _norm(title) != _norm(work.get("title")):
        return "MISMATCH"
    if work.get("status") == "queued":
        return "pending-verification"
    if claim is None:
        return "verified"
    recorded = {_norm(c["claim"]): c.get("consistency") for c in work["claims"]}
    consistency = recorded.get(_norm(claim))
    if consistency is None:
        return "pending-verification"          # new claim vs verified work (§2.4)
    if consistency == "queued":
        return "pending-verification"
    return "verified"


def verify_taxonomy_citations(taxonomy, registry: dict | None = None) -> dict:
    """Run check() over every (key, claim) an entry cites. Any MISMATCH is
    F-CITE: fails the whole node's taxonomy (spec §2.1)."""
    reg = registry or load_registry()
    verified, pending, mismatches = [], [], []
    for entry in taxonomy.entries:
        for key, claim in entry.citations:
            status = check(key, claim, registry=reg)
            item = {"entry": entry.tag, "key": key, "claim": claim}
            if status == "verified":
                verified.append(item)
            elif status == "pending-verification":
                pending.append(item)
            else:
                mismatches.append({**item, "class": "F-CITE",
                                   "detail": "fabricated/decorated citation or "
                                             "burned key — fails the node; "
                                             "no repair path (regen only)"})
    return {"verified": verified, "pending": pending, "failures": mismatches}
