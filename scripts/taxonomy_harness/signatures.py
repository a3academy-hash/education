"""signatures.py — machine-evaluable detection-signature forms + evaluator +
the GOLD ADAPTER (the 14 gold slope entries in machine form).

TAXONOMY_REGEN_SPEC §3.2: three evaluable forms —
  numeric        — numeric expression over the family's declared parameters
  construct-state — tuple/predicate over parameters, compared to a key state
  keyed-choice   — construction recipe; assertion (i) = "the recipe instantiates
                   a distinct option on all K samples" (honest limit: verifies
                   construction, never student behavior)

The 12 numeric closed forms reuse .authoring-tmp/confusable_pairwise.py's
lambdas (same algebra, Fraction-exact here). The 4 non-numeric gold entries are
typed records (construct-state / keyed-choice). stdlib only.
"""
from __future__ import annotations

import random
from fractions import Fraction as Fr

# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------
NUMERIC = "numeric"
CONSTRUCT = "construct-state"
RECIPE = "keyed-choice"


class Signature:
    """One evaluable signature variant of an entry."""

    def __init__(self, label, form, family, fn, presentation="any", note="",
                 key_fn=None):
        self.label = label            # e.g. "Δy", "-m", "(x0+run, y0+|rise|)"
        self.form = form              # NUMERIC | CONSTRUCT | RECIPE
        self.family = family          # parameter-family name
        self.fn = fn                  # params -> Fraction | tuple | str
        self.presentation = presentation  # numeric-entry | read-a-graph | construct
                                          # | choice | any  (TEMPLATE §3.10 feeds
                                          # collision-matrix conditions)
        self.note = note
        self.key_fn = key_fn          # overrides the family key where the variant's
                                      # correct answer differs (construct state /
                                      # keyed-choice correct option)

    def key_for(self, params, family):
        return (self.key_fn or family.key_fn)(params)

    def evaluate(self, params):
        return self.fn(params)


class Constraint:
    """Machine-evaluable generator constraint (TEMPLATE §3.7).

    co_live: if set, the constraint binds only on items also carrying that
    entry's trap (gold §2.1 "y1 != 0 on items also carrying slope-as-height").
    source: 'entry' (doc-stated), 'family' (parameter-family baseline), or
    'cluster:CC-nn' (arming condition injected from the approved confusable map,
    CONFUSABLE_CLUSTERS §3 item 3).
    """

    def __init__(self, name, fn, co_live=None, source="entry"):
        self.name = name
        self.fn = fn
        self.co_live = co_live
        self.source = source

    def ok(self, params) -> bool:
        return bool(self.fn(params))


class Entry:
    """One taxonomy entry with every TEMPLATE §3 field in machine form."""

    def __init__(self, *, tag, section, title, belief, root, severity,
                 severity_note="", signatures, step_locality, constraints,
                 constraints_note="", belief_rewrite, propagation,
                 presentation_sensitivity, remediation, primary_home,
                 resurfaces=(), resurface_surfaces=(), blocker_destination=None,
                 blocker_reason=None, neighbor=None, grounding_tier,
                 grounding_flag="", citations=(), worked_example=None, flags=()):
        self.tag = tag
        self.section = section
        self.title = title
        self.belief = belief                          # §3.2
        self.root = root                              # §3.3
        self.severity = severity                      # §3.4
        self.severity_note = severity_note
        self.signatures = list(signatures)            # §3.5 (may be empty for judgment-only entries)
        self.step_locality = step_locality            # §3.6
        self.constraints = list(constraints)          # §3.7
        self.constraints_note = constraints_note      # explicit mark when no
                                                      # constraint is needed
                                                      # (never silently blank)
        self.belief_rewrite = belief_rewrite          # §3.8
        self.propagation = propagation                # §3.9 ("non-propagating: ..." allowed)
        self.presentation_sensitivity = presentation_sensitivity  # §3.10
        self.remediation = remediation                # §3.11
        self.primary_home = primary_home              # §3.12
        self.resurfaces = list(resurfaces)            # node ids (routing.py checks existence)
        self.resurface_surfaces = list(resurface_surfaces)  # non-node named surfaces
        self.blocker_destination = blocker_destination  # {"type":"node"|"below-graph", ...}
        self.blocker_reason = blocker_reason          # §5/§3.4 reason string (BLOCKER only)
        self.neighbor = neighbor                      # boundary entries: named neighbor
        self.grounding_tier = grounding_tier          # §3.13
        self.grounding_flag = grounding_flag          # extrapolation / pilot-validation flag
        self.citations = list(citations)              # [(key, claim)] against verified-citations
        self.worked_example = worked_example or {}    # §3.14 {params, signature_label, trap, correct}
        self.flags = set(flags)                       # §3.15: boundary, predicate-expressible,
                                                      # predict-reveal, interactive, degenerate-case

    @property
    def signature_bearing(self) -> bool:
        return bool(self.signatures)

    def active_constraints(self, co_live_tags=frozenset()):
        """Constraints binding on an item: unconditional + co-live matches."""
        return [c for c in self.constraints
                if c.co_live is None or c.co_live in co_live_tags]


class BoundarySigRecord:
    """A registry boundary tag the doc states a signature for without owning the
    entry (the gold matrix's `reverses-x-and-y` row pattern, spec §4.1)."""

    def __init__(self, tag, signature, constraints=()):
        self.tag = tag
        self.signatures = [signature]
        self.constraints = list(constraints)
        self.section = None

    def active_constraints(self, co_live_tags=frozenset()):
        return [c for c in self.constraints
                if c.co_live is None or c.co_live in co_live_tags]


class MatrixRow:
    def __init__(self, value, members, condition, probe, entry_level=False):
        self.value = value            # colliding trap value (display form)
        self.members = set(members)   # tags (may include "KEY" for trap-vs-correct rows)
        self.condition = condition
        self.probe = probe
        self.entry_level = entry_level  # documented in an entry's collision block
                                        # rather than the consolidated matrix


class Taxonomy:
    """The assembled per-node(-cluster) taxonomy in machine form."""

    def __init__(self, *, node_ids, node_class, entries, boundary_records=(),
                 matrix_rows=(), global_generator_rule="", not_an_error=(),
                 rubric_table=(), exemplar_ladder=None, registry_diff=None,
                 keying_contract=None, doc_text="", boundary_shortfall_flag=None):
        self.node_ids = list(node_ids)
        self.node_class = node_class
        self.entries = list(entries)
        self.boundary_records = list(boundary_records)
        self.matrix_rows = list(matrix_rows)
        self.global_generator_rule = global_generator_rule
        self.not_an_error = list(not_an_error)   # [{"candidate","disposition","reason"}]
        self.rubric_table = list(rubric_table)   # [{"element","counters":[tags]}]
        self.exemplar_ladder = exemplar_ladder   # {"entry","rungs":[r1,r2,r3]}
        self.registry_diff = registry_diff or {"adds": [], "redefines": [],
                                               "rekeys": [], "boundary_notes": []}
        self.keying_contract = keying_contract or {}
        self.doc_text = doc_text                 # source doc text (cluster-token checks)
        self.boundary_shortfall_flag = boundary_shortfall_flag

    def entry_by_tag(self, tag):
        for e in self.entries:
            if e.tag == tag:
                return e
        return None

    @property
    def tags(self):
        return [e.tag for e in self.entries]

    def documented_pairs(self):
        """All tag pairs a matrix row (consolidated or entry-level) covers."""
        pairs = set()
        for row in self.matrix_rows:
            tags = sorted(row.members)
            for i, a in enumerate(tags):
                for b in tags[i + 1:]:
                    pairs.add(frozenset((a, b)))
        return pairs


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------
def values_comparable(a, b) -> bool:
    num = (int, Fr, float)
    if isinstance(a, num) and isinstance(b, num):
        return True
    if isinstance(a, tuple) and isinstance(b, tuple) and len(a) == len(b):
        return True
    if isinstance(a, str) and isinstance(b, str):
        return True
    return False


def values_equal(a, b, tol) -> bool:
    """Coincidence within grading tolerance (spec §3.1 separation standard)."""
    num = (int, Fr, float)
    if isinstance(a, num) and isinstance(b, num):
        return abs(float(a) - float(b)) <= tol
    if isinstance(a, tuple) and isinstance(b, tuple):
        return len(a) == len(b) and all(values_equal(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, str) and isinstance(b, str):
        return a == b
    return False


def separation(a, b):
    """Numeric separation where defined, else None."""
    num = (int, Fr, float)
    if isinstance(a, num) and isinstance(b, num):
        return abs(float(a) - float(b))
    return None


# ---------------------------------------------------------------------------
# Parameter families
# ---------------------------------------------------------------------------
class ParamFamily:
    def __init__(self, name, param_names, sample, key_fn, conditions=None,
                 condition_builders=None, boundary_builders=None):
        self.name = name
        self.param_names = param_names
        self.sample = sample                      # rng -> params dict
        self.key_fn = key_fn                      # params -> correct value
        self.conditions = conditions or {}        # name -> predicate (classification)
        self.condition_builders = condition_builders or {}  # name -> rng -> params
        self.boundary_builders = boundary_builders or []    # [(desc, rng -> params)]


def _m(p):
    return Fr(p["y2"] - p["y1"], p["x2"] - p["x1"])


def _b(p):
    return Fr(p["y1"]) - _m(p) * p["x1"]


def _sample_two_point(rng):
    while True:
        x1, x2 = rng.randint(-9, 9), rng.randint(-9, 9)
        if x1 == x2:
            continue
        y1, y2 = rng.randint(-20, 20), rng.randint(-20, 20)
        if y1 == y2:
            continue
        return {"x1": x1, "y1": y1, "x2": x2, "y2": y2,
                "sx": rng.choice([1, 2, 5]), "sy": rng.choice([1, 2, 4])}


def _build_m_neg(rng):
    p = _sample_two_point(rng)
    if _m(p) > 0:
        p["y1"], p["y2"] = p["y2"], p["y1"]
    return p


def _build_m_pos(rng):
    p = _sample_two_point(rng)
    if _m(p) < 0:
        p["y1"], p["y2"] = p["y2"], p["y1"]
    return p


def _build_abs_m_1(rng):
    while True:
        p = _sample_two_point(rng)
        sign = rng.choice([1, -1])
        y2 = p["y1"] + sign * (p["x2"] - p["x1"])
        if y2 != p["y1"] and -20 <= y2 <= 20:
            p["y2"] = y2
            return p


def _build_abs_dx_1(rng):
    while True:
        p = _sample_two_point(rng)
        x2 = p["x1"] + rng.choice([1, -1])
        if -9 <= x2 <= 9:
            p["x2"] = x2
            return p


def _build_y1_0(rng):
    p = _sample_two_point(rng)
    p["y1"] = 0
    if p["y2"] == 0:
        p["y2"] = rng.choice([-7, 5, 12])
    return p


def _build_y1_eq_x1(rng):
    while True:
        p = _sample_two_point(rng)
        p["y1"] = p["x1"]
        if p["y2"] != p["y1"]:
            return p


def _build_x2_1(rng):
    while True:
        p = _sample_two_point(rng)
        p["x2"] = 1
        if p["x1"] != 1:
            return p


def _build_sx_eq_sy(rng):
    p = _sample_two_point(rng)
    p["sx"] = p["sy"] = rng.choice([1, 2])
    return p


def _build_b_0(rng):
    while True:
        k = rng.choice([-4, -3, -2, 2, 3, 4, 5])
        x1, x2 = rng.randint(-6, 6), rng.randint(-6, 6)
        if x1 == x2:
            continue
        y1, y2 = k * x1, k * x2
        if not (-20 <= y1 <= 20 and -20 <= y2 <= 20) or y1 == y2:
            continue
        return {"x1": x1, "y1": y1, "x2": x2, "y2": y2,
                "sx": rng.choice([1, 2, 5]), "sy": rng.choice([1, 2, 4])}


def _build_min_dx(rng):
    while True:
        p = _sample_two_point(rng)
        x2 = p["x1"] + rng.choice([2, -2])   # minimum admissible |Δx| under |Δx|!=1
        if -9 <= x2 <= 9:
            p["x2"] = x2
            return p


def _build_x2_0(rng):
    while True:
        p = _sample_two_point(rng)
        p["x2"] = 0
        if p["x1"] != 0:
            return p


TWO_POINT_CONDITIONS = {
    # the pinned structural-condition library (spec §3.1 boundary classes +
    # every realizing condition named by the gold matrix / confusable map)
    "m < 0":    lambda p: _m(p) < 0,
    "m > 0":    lambda p: _m(p) > 0,
    "|m| = 1":  lambda p: abs(_m(p)) == 1,
    "|Δx| = 1": lambda p: abs(p["x2"] - p["x1"]) == 1,
    "y1 = 0":   lambda p: p["y1"] == 0,
    "y1 = x1":  lambda p: p["y1"] == p["x1"],
    "x2 = 1":   lambda p: p["x2"] == 1,
    "sx = sy":  lambda p: p["sx"] == p["sy"],
    "b = 0":    lambda p: _b(p) == 0,
}

TWO_POINT_BUILDERS = {
    "m < 0": _build_m_neg, "m > 0": _build_m_pos, "|m| = 1": _build_abs_m_1,
    "|Δx| = 1": _build_abs_dx_1, "y1 = 0": _build_y1_0, "y1 = x1": _build_y1_eq_x1,
    "x2 = 1": _build_x2_1, "sx = sy": _build_sx_eq_sy, "b = 0": _build_b_0,
}

TWO_POINT_BOUNDARY = [
    # deliberate boundary/degenerate draws for §3.1 stratified sampling
    ("sign boundary m<0", _build_m_neg),
    ("sign boundary m>0", _build_m_pos),
    ("zero param y1=0", _build_y1_0),
    ("zero param x2=0", _build_x2_0),
    ("|m| = 1", _build_abs_m_1),
    ("y1 = x1", _build_y1_eq_x1),
    ("minimum |Δx| = 2", _build_min_dx),
    ("|Δx| = 1", _build_abs_dx_1),
    ("equal scales sx=sy", _build_sx_eq_sy),
    ("b = 0 (through origin)", _build_b_0),
]

FAMILY_TWO_POINT = ParamFamily(
    "two-point", ("x1", "y1", "x2", "y2", "sx", "sy"),
    _sample_two_point, _m,
    conditions=TWO_POINT_CONDITIONS,
    condition_builders=TWO_POINT_BUILDERS,
    boundary_builders=TWO_POINT_BOUNDARY,
)


def _sample_nonlinear_table(rng):
    while True:
        x1 = rng.randint(-3, 3)
        d1, d2 = rng.randint(1, 4), rng.randint(1, 4)
        x2, x3 = x1 + d1, x1 + d1 + d2
        y1 = rng.randint(-10, 10)
        r1, r2 = rng.randint(-6, 6), rng.randint(-6, 6)
        if r1 == r2:            # constant rate — not a nonlinear table
            continue
        y2, y3 = y1 + r1 * d1, y1 + r1 * d1 + r2 * d2
        return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "x3": x3, "y3": y3}


FAMILY_NONLINEAR_TABLE = ParamFamily(
    "nonlinear-table-3pt", ("x1", "y1", "x2", "y2", "x3", "y3"),
    _sample_nonlinear_table,
    key_fn=lambda p: Fr(p["y3"]),   # prediction target: the table's actual value
    boundary_builders=[("minimal curvature (rates differ by 1)",
                        lambda rng: _sample_min_curvature(rng))],
)


def _sample_min_curvature(rng):
    while True:
        p = _sample_nonlinear_table(rng)
        r1 = Fr(p["y2"] - p["y1"], p["x2"] - p["x1"])
        r2 = Fr(p["y3"] - p["y2"], p["x3"] - p["x2"])
        if abs(r1 - r2) == 1:
            return p


def _sample_two_panel(rng):
    """Comparison item: panel A visually steeper, panel B numerically steeper.
    Visual steepness = m / sy (gridlines climbed per square right, sx = 1)."""
    while True:
        mA, mB = rng.randint(1, 4), rng.randint(2, 9)
        syA, syB = rng.choice([1, 2]), rng.choice([5, 10, 20])
        if mA < mB and Fr(mA, syA) > Fr(mB, syB):
            return {"mA": mA, "mB": mB, "syA": syA, "syB": syB}


FAMILY_TWO_PANEL = ParamFamily(
    "two-panel-comparison", ("mA", "mB", "syA", "syB"),
    _sample_two_panel,
    key_fn=lambda p: "panel-B",      # the numerically larger slope
    boundary_builders=[("adjacent slopes mB = mA+1",
                        lambda rng: _sample_adjacent_panels(rng))],
)


def _sample_adjacent_panels(rng):
    while True:
        p = _sample_two_panel(rng)
        if p["mB"] == p["mA"] + 1:
            return p


def _sample_degenerate(rng):
    if rng.random() < 0.5:
        x = rng.randint(-8, 8)
        y1 = rng.randint(-15, 15)
        y2 = y1
        while y2 == y1:
            y2 = rng.randint(-15, 15)
        return {"orientation": "vertical", "x1": x, "x2": x, "y1": y1, "y2": y2}
    y = rng.randint(-15, 15)
    x1 = rng.randint(-8, 8)
    x2 = x1
    while x2 == x1:
        x2 = rng.randint(-8, 8)
    return {"orientation": "horizontal", "x1": x1, "x2": x2, "y1": y, "y2": y}


FAMILY_DEGENERATE = ParamFamily(
    "degenerate-two-point", ("orientation", "x1", "y1", "x2", "y2"),
    _sample_degenerate,
    key_fn=lambda p: "undefined" if p["orientation"] == "vertical" else "0",
    boundary_builders=[
        ("vertical through origin",
         lambda rng: {"orientation": "vertical", "x1": 0, "x2": 0, "y1": 0, "y2": 5}),
        ("horizontal at y=0",
         lambda rng: {"orientation": "horizontal", "x1": -3, "x2": 4, "y1": 0, "y2": 0}),
    ],
)

FAMILIES = {f.name: f for f in
            (FAMILY_TWO_POINT, FAMILY_NONLINEAR_TABLE, FAMILY_TWO_PANEL,
             FAMILY_DEGENERATE)}


# ---------------------------------------------------------------------------
# GOLD ADAPTER — the 14 gold entries (misconception-taxonomy-slope.md §2) in
# machine form, plus the 2 gold-matrix boundary-tag signature records.
#
# The 12 numeric lambdas below are confusable_pairwise.py's forms, Fraction-exact.
# Adapter transcription notes (recorded in the dry-run report as interpretations):
#   - step-locality / propagation / presentation fields are stated inline in the
#     gold prose, not as labeled fields; transcribed here.
#   - grounding tiers post-date the gold doc (2026-07-06 vocabulary): mapping
#     recorded per entry below.
# ---------------------------------------------------------------------------
TP = "two-point"

# numeric closed forms (confusable_pairwise.py lambdas, exact arithmetic)
_dy = lambda p: Fr(p["y2"] - p["y1"])
_neg_m = lambda p: -_m(p)
_inv_m = lambda p: Fr(p["x2"] - p["x1"], p["y2"] - p["y1"])
_abs_m = lambda p: abs(_m(p))
_dy_minus_dx = lambda p: Fr((p["y2"] - p["y1"]) - (p["x2"] - p["x1"]))
_y2_minus_x2 = lambda p: Fr(p["y2"] - p["x2"])
_within_points = lambda p: Fr(p["y2"] - p["x2"], p["y1"] - p["x1"])
_y2 = lambda p: Fr(p["y2"])
_y2_over_x2 = lambda p: Fr(p["y2"], p["x2"])
_grid_count = lambda p: _m(p) * Fr(p["sx"], p["sy"])
_neg_inv_m = lambda p: -Fr(p["x2"] - p["x1"], p["y2"] - p["y1"])


def _c(name, fn, co_live=None, source="entry"):
    return Constraint(name, fn, co_live=co_live, source=source)


C_DX_NOT_1 = lambda: _c("|Δx| != 1", lambda p: abs(p["x2"] - p["x1"]) != 1)
C_Y1_NOT_0_COLIVE_HEIGHT = lambda: _c("y1 != 0 (co-live slope-as-height)",
                                      lambda p: p["y1"] != 0,
                                      co_live="slope-as-height")
C_M_NOT_ABS1 = lambda src="entry": _c("|m| != 1", lambda p: abs(_m(p)) != 1, source=src)
C_M_NEG = lambda: _c("m < 0 (arming)", lambda p: _m(p) < 0)
C_Y1_NEQ_X1 = lambda: _c("y1 != x1", lambda p: p["y1"] != p["x1"])
C_B_NOT_0 = lambda: _c("b != 0 (arming)", lambda p: _b(p) != 0)
C_X_NOT_0 = lambda: _c("x1, x2 != 0", lambda p: p["x1"] != 0 and p["x2"] != 0)
C_Y1_NOT_0 = lambda: _c("y1 != 0", lambda p: p["y1"] != 0)
C_Y2_NEQ_M = lambda: _c("y2 != m (parameter choice)", lambda p: Fr(p["y2"]) != _m(p))
C_SX_NEQ_SY = lambda: _c("sx != sy (arming)", lambda p: p["sx"] != p["sy"])
C_VARIANTS_NEQ_KEY = lambda: _c("per-item: neither variant equals m or Δy",
                                lambda p: _dy_minus_dx(p) != _m(p)
                                and _y2_minus_x2(p) != _m(p)
                                and _dy_minus_dx(p) != _dy(p)
                                and _y2_minus_x2(p) != _dy(p))


def build_gold_taxonomy(doc_text: str = "") -> Taxonomy:
    entries = [
        Entry(
            tag="forgot-denominator", section="2.1",
            title="Slope as the amount of change",
            belief="Slope/rate IS the change in the output quantity — an amount, "
                   "not a comparison — so Δy alone answers the question and Δx "
                   "is never consulted.",
            root="Ratio-as-measure failure — attends to one quantity instead of "
                 "coordinating two; slope treated as extensive, not intensive.",
            severity="BLOCKER",
            severity_note="most common slope error; 6.RP/7.RP intensive-quantity gap",
            # presentation "any": the Δy trap is committed on coordinate AND
            # graph/table items (gold's y1 != 0 co-live constraint vs
            # slope-as-height exists precisely because they share graph items)
            signatures=[Signature("Δy = y2 - y1", NUMERIC, TP, _dy,
                                  presentation="any")],
            step_locality="difference-forming step: only the output difference is "
                          "ever formed; the ratio step never happens",
            constraints=[C_DX_NOT_1(), C_Y1_NOT_0_COLIVE_HEIGHT()],
            belief_rewrite="“The rate is 12 — it went up by 12.” (12 what, "
                           "per what? The item's own Δx contradicts the reading.)",
            propagation="downstream builds y = (Δy)x + b in L08/L13 — the "
                        "unnormalized Δy propagates as the written coefficient",
            presentation_sensitivity="insensitive across numeric presentations; "
                                     "bare-numeric Δy default-tags here vs 2.10 "
                                     "(unit-labeled probe re-attributes)",
            remediation="Contrast case holding Δy fixed while varying Δx (12 more "
                        "goals over 4 games vs over 12 games — same rate?); then "
                        "“twelve WHAT, per WHAT?”",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L07", "ALG-L08", "ALG-L13", "ALG-L19"],
            blocker_destination={"type": "node", "id": "ALG-L05",
                                 "surface": "rate-as-comparison teaching sequence"},
            blocker_reason="You found how much it changed, but a rate compares two "
                           "changes — we're going back to rates as comparisons to "
                           "build that.",
            grounding_tier="literature-grounded",
            citations=[("lobato-thanheiser-2002",
                        "ratio-as-measure: students attend to one quantity instead "
                        "of coordinating two"),
                       ("stump-2001",
                        "slope conceived as visual steepness/angle rather than ratio")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "Δy = y2 - y1",
                            "trap": Fr(12), "correct": Fr(3)},
            flags={"interactive-eligible"},
        ),
        Entry(
            tag="inconsistent-subtraction-order", section="2.2",
            title="Mismatched Δ orientation",
            belief="The subtraction order in numerator and denominator are "
                   "independent choices — (y2-y1)/(x1-x2) is as good as any.",
            root="Notation-driven symbol manipulation without the invariant "
                 "“both differences must be read in the same direction.” "
                 "Documented as a distinct calculation-error category.",
            severity="HIGH", severity_note="frequent but yields to the arrows counter",
            signatures=[Signature("-m", NUMERIC, TP, _neg_m,
                                  presentation="numeric-entry")],
            step_locality="subtraction-order step inside the slope formula",
            constraints=[],
            constraints_note="none needed: -m is armed and separated from m on the "
                             "whole family region (m != 0 family baseline); "
                             "collisions handled by the documented matrix rows",
            belief_rewrite="“I subtracted 4 from 16 on top and 6 from 2 on the "
                           "bottom — order doesn't matter as long as you subtract.”",
            propagation="re-surfaces verbatim in point-slope substitution (L11) and "
                        "slope-intercept builds (L13) as a sign-flipped m",
            presentation_sensitivity="insensitive (any two-point numeric item)",
            remediation="Re-representation: draw rise and run AS ARROWS with "
                        "direction; ask whether the two arrows walk the line in the "
                        "same direction.",
            primary_home="ALG-L06",
            resurfaces=["ALG-L11", "ALG-L13"],
            grounding_tier="literature-grounded",
            citations=[("cho-nagle-2017",
                        "categorizes concrete slope-calculation errors")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "-m",
                            "trap": Fr(-3), "correct": Fr(3)},
            flags=set(),
        ),
        Entry(
            tag="inverted-ratio", section="2.3", title="Run over rise",
            belief="The rate compares input per output — Δx/Δy — often verbally "
                   "anchored (“games per hit”) because prompt word order "
                   "drove the setup.",
            root="Ratio inversion / failure to anchor the referent of a unit rate.",
            severity="HIGH",
            severity_note="partially a 6.RP.A.2 prerequisite-gap symptom; 3+ hits "
                          "route to a unit-rate micro-review inside L05",
            signatures=[Signature("Δx/Δy = 1/m", NUMERIC, TP, _inv_m,
                                  presentation="numeric-entry")],
            step_locality="ratio-forming step: numerator and denominator roles swapped",
            constraints=[C_M_NOT_ABS1()],
            belief_rewrite="“1/3 — one game for every 3 hits, that's the rate "
                           "the question wanted.” (The item asked hits per game.)",
            propagation="L08: interprets m in y = mx + b as “x per y”; "
                        "propagates into every rate interpretation",
            presentation_sensitivity="SENSITIVE: named-quantity prose items tag here "
                                     "outright; bare-pair items default-tag here and "
                                     "queue the plot probe (re-attributes to "
                                     "reverses-x-and-y on probe failure)",
            remediation="Units-first probe on the student's own answer (“1/3 of "
                        "a hit per game, or 3 games per hit — which did the question "
                        "ask?”), then both candidate rates written with full "
                        "unit labels checked against the table.",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L08", "ALG-L13"],
            grounding_tier="literature-grounded",
            citations=[("lobato-ellis-munoz-2003",
                        "ratio-as-measure and referent anchoring of unit rates"),
                       ("cramer-post",
                        "unit-rate referents in proportional reasoning")],
            worked_example={"family": TP,
                            "params": {"x1": 8, "y1": 24, "x2": 20, "y2": 60,
                                       "sx": 1, "sy": 1},
                            "signature_label": "Δx/Δy = 1/m",
                            "trap": Fr(1, 3), "correct": Fr(3)},
            flags=set(),
        ),
        Entry(
            tag="rise-run-direction-error", section="2.4",
            title="Wrong step direction for the sign",
            belief="“Rise” always means “up” (and “run” "
                   "always right) — rise/run are absolute directions, not signed "
                   "displacements.",
            root="Graphical convention error — rise and run learned as absolute "
                 "directions rather than signed displacements (first-principles: "
                 "the convention is taught on positive-slope examples, so the sign "
                 "never enters the learned move).",
            severity="MEDIUM", severity_note="local, graphical-task-specific",
            signatures=[
                Signature("(x0+run, y0+|rise|)", CONSTRUCT, TP,
                          lambda p: (Fr(p["x1"] + 1), Fr(p["y1"]) + abs(_m(p))),
                          presentation="construct",
                          note="key state: (x0+1, y0+m); distinct iff m < 0",
                          key_fn=lambda p: (Fr(p["x1"] + 1), Fr(p["y1"]) + _m(p))),
                Signature("|m| (read-a-graph)", NUMERIC, TP, _abs_m,
                          presentation="read-a-graph"),
            ],
            step_locality="stepping move when constructing/stepping along the line",
            constraints=[C_M_NEG()],
            belief_rewrite="“Slope 4 means up 4 — the sign is about the answer, "
                           "not about which way you step.” (The line visibly "
                           "goes down; the step leaves it.)",
            propagation="non-propagating: the wrong placement is terminal on the "
                        "construct task (no later procedure step consumes it)",
            presentation_sensitivity="SENSITIVE: construct items key here directly; "
                                     "pure numeric-computation items key "
                                     "drops-negative-slope-sign; read-a-graph "
                                     "numeric logs the pair + queues construct probe",
            remediation="Predict-then-reveal on the graph: step right 1 and up |m| "
                        "from a point of a falling line — the wrong step visibly "
                        "leaves the line.",
            primary_home="ALG-L09",
            resurfaces=["ALG-L05", "ALG-L06", "ALG-L11"],
            grounding_tier="engineering-candidate",
            grounding_flag="FLAGGED for pilot validation (first-principles analysis "
                           "stated in root; no dedicated literature)",
            citations=[],
            worked_example={"family": TP,
                            "params": {"x1": 0, "y1": 20, "x2": 5, "y2": 0,
                                       "sx": 1, "sy": 1},
                            "signature_label": "(x0+run, y0+|rise|)",
                            "trap": (Fr(1), Fr(24)), "correct": (Fr(1), Fr(16))},
            flags={"predicate-expressible", "interactive-eligible",
                   "predict-reveal-eligible"},
        ),
        Entry(
            tag="drops-negative-slope-sign", section="2.5",
            title="Magnitude-only slope",
            belief="Slope measures “how steep”; the sign is bookkeeping, "
                   "not meaning — correct magnitudes, sign discarded at the end.",
            root="Steepness-dominant slope concept (slope as steepness carries no "
                 "direction) meeting integer-operation fragility.",
            severity="MEDIUM",
            severity_note="HIGH if it survives to L08 — silently corrupts every "
                          "downstream graphing node",
            signatures=[Signature("|m|", NUMERIC, TP, _abs_m,
                                  presentation="any")],
            step_locality="final reporting step: computed value reported unsigned",
            constraints=[C_M_NEG()],
            belief_rewrite="“The slope is 1/3 — steepness can't be negative.” "
                           "(The team's average is falling; the item's data "
                           "decreases.)",
            propagation="L08: graphs y = -2x + 5 with positive inclination — the "
                        "unsigned m propagates into the drawn line's direction",
            presentation_sensitivity="SENSITIVE: numeric-computation items key here; "
                                     "read-a-graph numeric is ambiguous with "
                                     "rise-run-direction-error (construct probe)",
            remediation="Meaning-of-sign contrast pair (+3 vs -3 rate stories): "
                        "“if you write both slopes as 3, how would anyone know "
                        "which team is in trouble?”",
            primary_home="ALG-L06",
            resurfaces=["ALG-L05", "ALG-L08"],
            grounding_tier="literature-grounded",
            citations=[("stump-1999",
                        "slope conceived as visual steepness/angle rather than ratio")],
            worked_example={"family": TP,
                            "params": {"x1": 3, "y1": 6, "x2": 9, "y2": 4,
                                       "sx": 1, "sy": 1},
                            "signature_label": "|m|",
                            "trap": Fr(1, 3), "correct": Fr(-1, 3)},
            flags=set(),
        ),
        Entry(
            tag="slope-as-difference", section="2.6", title="Additive comparison",
            belief="The relationship between y's change and x's change is “how "
                   "much more,” not “how many times per unit” — "
                   "compare by subtracting.",
            root="Additive reasoning where multiplicative reasoning is required — "
                 "the canonical proportional-reasoning failure.",
            severity="BLOCKER",
            severity_note="deepest prerequisite-gap signal in the cluster (7.RP); "
                          "more slope practice is contraindicated",
            signatures=[
                Signature("Δy - Δx", NUMERIC, TP, _dy_minus_dx,
                          presentation="numeric-entry"),
                Signature("y2 - x2", NUMERIC, TP, _y2_minus_x2,
                          presentation="numeric-entry"),
            ],
            step_locality="comparison step: subtraction substituted for division",
            constraints=[C_Y1_NEQ_X1(), C_VARIANTS_NEQ_KEY()],
            belief_rewrite="“Hits grew by 12 and games by 4, so the rate is 8 — "
                           "hits are 8 ahead.” (8 of what? The item's own "
                           "numbers give 3 per game.)",
            propagation="the additive prediction propagates as next-value = last + "
                        "constant on table-extension items (L07, L19)",
            presentation_sensitivity="insensitive across numeric presentations",
            remediation="Ratio-as-measure ramp contrast: equal differences, unequal "
                        "ratios (rises 6 over 4 vs 12 over 10) — the felt answer "
                        "collides with the additive answer and forces division.",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L07", "ALG-L19"],
            resurface_surfaces=["E-domain via treats-exponential-as-steep-linear "
                                "(extension-flavored sibling)"],
            blocker_destination={"type": "below-graph",
                                 "surface": "7.RP proportional-reasoning "
                                            "remediation below ALG-L05"},
            blocker_reason="You're comparing by subtracting. Slope compares by "
                           "dividing — we're going back to build that.",
            neighbor="proportion-domain root tag additive-instead-of-multiplicative "
                     "(cross-link, not merge)",
            grounding_tier="literature-grounded",
            citations=[("hart-1981",
                        "additive strategies where multiplicative reasoning is "
                        "required (proportional-reasoning failure)"),
                       ("karplus",
                        "additive-vs-multiplicative reasoning in proportion tasks"),
                       ("simon-blume-1994",
                        "constructing steepness as a ratio")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "Δy - Δx",
                            "trap": Fr(8), "correct": Fr(3)},
            flags={"boundary"},
        ),
        Entry(
            tag="subtracts-within-points", section="2.7",
            title="Differences formed inside each pair",
            belief="The formula's subscripts mean “the 2-point stuff over the "
                   "1-point stuff” — form each difference WITHIN a point.",
            root="Notation-driven parsing of m = (y2-y1)/(x2-x1) with no quantity "
                 "image of Δy and Δx (first-principles: the subscript pattern is "
                 "matched, the quantities are never read). Attested as a "
                 "calculation-error category; frequency data thin.",
            severity="MEDIUM",
            severity_note="diagnostic gold — certifies formula-running with zero "
                          "quantity meaning; upgrades to the L05 interpretation check",
            signatures=[Signature("(y2-x2)/(y1-x1)", NUMERIC, TP, _within_points,
                                  presentation="numeric-entry")],
            step_locality="difference-forming step: pairs read vertically, not across",
            constraints=[C_Y1_NEQ_X1()],
            belief_rewrite="“Top of the fraction is the point-2 numbers, bottom "
                           "is the point-1 numbers: (16-6)/(4-2).”",
            propagation="re-surfaces in L11 substitution errors (within-pair "
                        "differences applied to the substitution)",
            presentation_sensitivity="insensitive (two-point formula items only)",
            remediation="Quantity-labeling probe before any formula: point to the "
                        "two numbers that are both hits, then both games; color-code "
                        "y's and x's in the worked example.",
            primary_home="ALG-L06",
            resurfaces=["ALG-L11"],
            grounding_tier="tradition-adjacent",
            grounding_flag="extrapolated from Cho & Nagle's calculation-error "
                           "categorization; frequency data thin — validate in pilot",
            citations=[("cho-nagle-2017",
                        "categorizes concrete slope-calculation errors")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "(y2-x2)/(y1-x1)",
                            "trap": Fr(5), "correct": Fr(3)},
            flags=set(),
        ),
        Entry(
            tag="slope-as-height", section="2.8", title="Slope read as the y-value",
            belief="Slope is the HEIGHT of the line at a point — “the line is "
                   "at 12, so the slope is 12” — the function's value conflated "
                   "with its rate of change.",
            root="Slope-height confusion, one of the most replicated findings in "
                 "graph-interpretation research.",
            severity="HIGH",
            severity_note="prerequisite-gap flavored (F10 graph-reading); repeat "
                          "hits route to a graph-reading micro-sequence",
            signatures=[Signature("y2 (queried-point height)", NUMERIC, TP, _y2,
                                  presentation="read-a-graph")],
            step_locality="reading step: a point's value read where a comparison "
                          "of two points is required",
            constraints=[C_Y1_NOT_0(), C_Y2_NEQ_M(),
                         _c("queried x != 1 (CC-04 arming)",
                            lambda p: p["x2"] != 1, source="cluster:CC-04")],
            belief_rewrite="“She's scoring 16 — the graph is at 16 at game "
                           "6.” (16 is where she IS, not how fast it's "
                           "changing.)",
            propagation="L08: evaluates y where m is asked; L10: reads the "
                        "intercept question as a slope question — the height value "
                        "propagates into the reported rate",
            presentation_sensitivity="SENSITIVE: read-a-graph/table items only "
                                     "(the queried point must be displayed)",
            remediation="Two-questions contrast on one graph (value at x=6 vs how "
                        "fast) — the student physically indicates where each answer "
                        "lives: height is a spot, slope is a tilt.",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L08", "ALG-L10"],
            resurface_surfaces=["function-behavior nodes"],
            grounding_tier="literature-grounded",
            citations=[("leinhardt-zaslavsky-stein-1990",
                        "slope-height confusion in graph interpretation"),
                       ("mcdermott-rosenquist-vanzee-1987",
                        "students read velocity as the height of the position graph"),
                       ("beichner-1994",
                        "graph-reading errors including slope-height confusion")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "y2 (queried-point height)",
                            "trap": Fr(16), "correct": Fr(3)},
            flags=set(),
        ),
        Entry(
            tag="slope-as-single-point-ratio", section="2.9",
            title="y/x from one point",
            belief="Any line's rate can be read from one snapshot as y/x — the "
                   "y = kx schema overgeneralized to lines not through the origin.",
            root="Illusion of proportionality: the 7.RP unit-rate procedure applied "
                 "where a starting value b != 0 breaks it.",
            severity="HIGH",
            severity_note="the single most important Axis-B discriminator between "
                          "proportional relationships and linear functions",
            signatures=[
                # presentation "any": gold marks this entry presentation-
                # insensitive — any single displayed point arms it (graph,
                # table, or coordinate item)
                Signature("y2/x2", NUMERIC, TP, _y2_over_x2,
                          presentation="any"),
                Signature("y1/x1", NUMERIC, TP, lambda p: Fr(p["y1"], p["x1"]),
                          presentation="any"),
            ],
            step_locality="setup step: one point consulted where two are required",
            constraints=[C_B_NOT_0(), C_X_NOT_0(),
                         _c("queried x != 1 (CC-04 arming)",
                            lambda p: p["x2"] != 1 and p["x1"] != 1,
                            source="cluster:CC-04")],
            belief_rewrite="“At game 6 she has 19 points, so she scores 19/6 "
                           "≈ 3.2 a game.” (That assumes she started at 0 "
                           "— she started at 1.)",
            propagation="L08/L13: writes y = (y1/x1)x, dropping b — the "
                        "proportional form propagates into the built equation",
            presentation_sensitivity="insensitive across numeric presentations "
                                     "(any single displayed point arms it)",
            remediation="Head-start contrast case (two runners, same speed, one "
                        "starts 20 m ahead): “what does dividing by 4 assume "
                        "about where she started?”",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L08", "ALG-L13", "ALG-L19"],
            neighbor="proportional relationships (ALG-L01 / 7.RP); mirror boundary "
                     "of k-as-y-intercept (L18)",
            grounding_tier="literature-grounded",
            citations=[("de-bock-van-dooren",
                        "illusion of linearity/proportionality — proportional "
                        "methods overgeneralized")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 7, "x2": 6, "y2": 19,
                                       "sx": 1, "sy": 1},
                            "signature_label": "y2/x2",
                            "trap": Fr(19, 6), "correct": Fr(3)},
            flags={"boundary"},
        ),
        Entry(
            tag="rate-not-per-unit", section="2.10",
            title="Rate not normalized to unit input",
            belief="A true change over a true interval (“12 hits per 4 "
                   "games”) IS the rate — no normalization to one unit of "
                   "input is ever needed.",
            root="Unit-rate incompleteness: the comparison is multiplicative but "
                 "not yet a measure with a standard referent of 1.",
            severity="MEDIUM",
            severity_note="MEDIUM in L05 (the node's teaching target); HIGH if it "
                          "survives into L06+",
            signatures=[Signature("Δy (chunk rate)", NUMERIC, TP, _dy,
                                  presentation="any",
                                  note="on unit-labeled choice items: the "
                                       "correct-Δy-wrong-referent option")],
            step_locality="normalization step: the per-1 division never happens",
            constraints=[C_DX_NOT_1(), C_Y1_NOT_0_COLIVE_HEIGHT()],
            belief_rewrite="“She's hitting 12 per 4 games — that's the "
                           "rate.” (True, but not per game; the item asked "
                           "per game.)",
            propagation="L08: m read as “per interval” instead of "
                        "“per 1” — the chunk rate propagates into "
                        "equation reading",
            presentation_sensitivity="SENSITIVE: unit-labeled choice items key here "
                                     "directly; bare-numeric Δy default-tags "
                                     "forgot-denominator and queues the unit-labeled "
                                     "probe (gold asymmetric default)",
            remediation="Fair-comparison probe: 12 hits in 4 games vs 20 in 8 — "
                        "“who's hotter? can you tell without making both "
                        "'per 1 game'?”",
            primary_home="ALG-L05",
            resurfaces=["ALG-L06", "ALG-L08", "ALG-L19"],
            grounding_tier="literature-grounded",
            citations=[("lamon", "unit rates and the referent of 1 in rate reasoning"),
                       ("cramer-post",
                        "unit-rate referents in proportional reasoning")],
            worked_example={"family": TP,
                            "params": {"x1": 2, "y1": 4, "x2": 6, "y2": 16,
                                       "sx": 1, "sy": 1},
                            "signature_label": "Δy (chunk rate)",
                            "trap": Fr(12), "correct": Fr(3)},
            flags={"predict-reveal-eligible"},
        ),
        Entry(
            tag="grid-count-ignores-scale", section="2.11",
            title="Rise/run counted in squares, not units",
            belief="The picture's geometry carries the slope — count grid squares "
                   "for rise and run; axis units never enter.",
            root="Scale-blindness in graph reading; the ratio procedure is right, "
                 "the measure is wrong. Non-homogeneous axis scales are the "
                 "hardest slope item class.",
            severity="HIGH",
            severity_note="invisible on equal-scale teaching graphs, detonates in "
                          "the transfer battery (representation change)",
            signatures=[Signature("m·(sx/sy)", NUMERIC, TP, _grid_count,
                                  presentation="read-a-graph")],
            step_locality="measurement step: counts read off the grid, never "
                          "converted to axis units",
            constraints=[C_SX_NEQ_SY()],
            belief_rewrite="“Up 2 squares, right 1 square — slope 2.” "
                           "(Each vertical square is worth 10; the axis says 20.)",
            propagation="non-propagating: the mis-measured m is the final answer on "
                        "these items (no later step consumes it inside the node)",
            presentation_sensitivity="SENSITIVE: graph items only; armed only where "
                                     "sx != sy (silent-survival warning — "
                                     "unequal-scale items must be authored "
                                     "deliberately into practice)",
            remediation="One graph, two readings: count squares, then label the "
                        "arrows with axis numbers — the two answers disagree on the "
                        "same picture; the axis wins.",
            primary_home="ALG-L09",
            resurfaces=["ALG-L05", "ALG-L06"],
            resurface_surfaces=["data/statistics-domain scatterplot and trend-line "
                                "graphs"],
            grounding_tier="literature-grounded",
            citations=[("leinhardt-zaslavsky-stein-1990",
                        "scale errors in graph interpretation"),
                       ("postelnicu-2011",
                        "slope from graphs with non-homogeneous axis scales is the "
                        "hardest item class for algebra students")],
            worked_example={"family": TP,
                            "params": {"x1": 0, "y1": 0, "x2": 1, "y2": 20,
                                       "sx": 1, "sy": 10},
                            "signature_label": "m·(sx/sy)",
                            "trap": Fr(2), "correct": Fr(20)},
            flags={"interactive-eligible"},
        ),
        Entry(
            tag="slope-as-visual-steepness", section="2.12",
            title="Steepness judged by eye, without scales",
            belief="Slope IS the visual steepness/angle of the drawn line — two "
                   "lines compare by eye, no axis consulted.",
            root="Steepness/angle conception of slope — the dominant intuitive "
                 "conception; distinct from 2.11 (the grid-counter runs a ratio on "
                 "the wrong measure; the steepness-judger runs no measurement).",
            severity="MEDIUM",
            severity_note="HIGH as a conceptual ceiling — persists into adulthood "
                          "when never confronted; exactly what transfer dimension 2 "
                          "exposes",
            signatures=[Signature("visually-steeper-but-numerically-smaller panel",
                                  RECIPE, "two-panel-comparison",
                                  lambda p: "panel-A",
                                  presentation="choice",
                                  note="recipe: engineer scale mismatch so the "
                                       "smaller slope (mA < mB) renders steeper "
                                       "(mA/syA > mB/syB); this belief selects "
                                       "panel A")],
            step_locality="comparison step: perceptual judgment substituted for "
                          "measurement",
            constraints=[_c("panel construction: mA < mB and mA/syA > mB/syB",
                            lambda p: p["mA"] < p["mB"]
                            and Fr(p["mA"], p["syA"]) > Fr(p["mB"], p["syB"]))],
            belief_rewrite="“Graph A is steeper, so A has the bigger "
                           "slope.” (A climbs 2 per game; B climbs 5 — the "
                           "axes differ.)",
            propagation="non-propagating: choice-item selection is terminal",
            presentation_sensitivity="SENSITIVE: comparison/choice items only; "
                                     "disambiguation ladder vs 2.11 runs through a "
                                     "single-graph unequal-scale numeric item",
            remediation="Zoom contrast: the SAME line rendered on two y-axis "
                        "scales side by side — “same team, same season, same "
                        "rate; which graph is steeper? did the team change?”",
            primary_home="ALG-L05",
            resurfaces=["ALG-L08", "ALG-L09"],
            resurface_surfaces=["transfer battery (representation-change dimension)"],
            grounding_tier="literature-grounded",
            citations=[("stump-1999",
                        "slope conceived as visual steepness/angle rather than "
                        "ratio"),
                       ("postelnicu-2011",
                        "visual/steepness slope conceptions on graph tasks")],
            worked_example={"family": "two-panel-comparison",
                            "params": {"mA": 2, "mB": 5, "syA": 1, "syB": 10},
                            "signature_label":
                                "visually-steeper-but-numerically-smaller panel",
                            "trap": "panel-A", "correct": "panel-B"},
            flags={"predict-reveal-eligible"},
        ),
        Entry(
            tag="zero-undefined-slope-swap", section="2.13",
            title="Horizontal/vertical confusion",
            belief="“0” and “undefined” are two labels memorized "
                   "for the two weird lines — and they attach the wrong way around.",
            root="Label-memorization without ratio meaning (first-principles: the "
                 "labels were stored as arbitrary facts unattached to 0/Δx vs "
                 "Δy/0, so retrieval has no structure to check against).",
            severity="LOW",
            severity_note="LOW-MEDIUM; cheap to fix but must be fixed in L06 "
                          "because L12 items assume it",
            signatures=[Signature("degenerate-label swap", RECIPE,
                                  "degenerate-two-point",
                                  lambda p: "0" if p["orientation"] == "vertical"
                                  else "undefined",
                                  presentation="choice",
                                  note="vertical item keys '0'; horizontal keys "
                                       "'undefined' — exact keyed traps on "
                                       "deliberately authored special cases")],
            step_locality="classification step on the degenerate cases",
            constraints=[_c("item is degenerate (x1=x2 xor y1=y2)",
                            lambda p: p["orientation"] in ("vertical", "horizontal"))],
            belief_rewrite="“(4,1) and (4,9): straight up and down — that's "
                           "the flat-feeling one, slope 0.” (Compute the run: "
                           "it's 0; 8/0 has no answer.)",
            propagation="non-propagating: the label is the final answer",
            presentation_sensitivity="insensitive (the degenerate item type itself "
                                     "is the arming condition)",
            remediation="Run the formula, don't recite the rule: compute the run, "
                        "get 0, try dividing 8 by 0 — “undefined” becomes "
                        "the result of an impossible division; pair with the "
                        "walking metaphor.",
            primary_home="ALG-L06",
            resurfaces=["ALG-L09", "ALG-L12"],
            resurface_surfaces=["domain/range work"],
            grounding_tier="engineering-candidate",
            grounding_flag="FLAGGED for pilot validation — practitioner-attested, "
                           "thin dedicated literature (Stump notes vertical-line "
                           "difficulty in passing)",
            citations=[("stump-1999",
                        "notes vertical-line difficulty in passing")],
            worked_example={"family": "degenerate-two-point",
                            "params": {"orientation": "vertical", "x1": 4, "y1": 1,
                                       "x2": 4, "y2": 9},
                            "signature_label": "degenerate-label swap",
                            "trap": "0", "correct": "undefined"},
            flags={"degenerate-case", "predicate-expressible"},
        ),
        Entry(
            tag="assumes-constant-rate-nonlinear", section="2.14",
            title="Two-point slope applied to a curve",
            belief="Any relationship has ONE rate, so two points always suffice to "
                   "know all of it — a two-point slope on a curve is THE rate "
                   "everywhere.",
            root="Illusion of linearity; rate-constancy overgeneralization "
                 "(average vs instantaneous rate).",
            severity="HIGH",
            severity_note="HIGH as forward-looking conceptual guard; LOW frequency "
                          "inside L05/L06 — it defines the boundary of the concept",
            signatures=[
                Signature("y1 + m1·(x3-x1) (linear extrapolation)", NUMERIC,
                          "nonlinear-table-3pt",
                          lambda p: Fr(p["y1"]) + Fr(p["y2"] - p["y1"],
                                                     p["x2"] - p["x1"])
                          * (p["x3"] - p["x1"]),
                          presentation="numeric-entry"),
                Signature("constancy-verdict 'yes' from endpoints", RECIPE,
                          "nonlinear-table-3pt",
                          lambda p: "yes-constant",
                          presentation="choice",
                          note="keyed choice on a shown nonconstant-differences "
                               "table; correct verdict is 'no'",
                          key_fn=lambda p: "no-not-constant"),
            ],
            step_locality="constancy-check step: skipped entirely (endpoints only)",
            constraints=[_c("table is nonlinear (first differences nonconstant)",
                            lambda p: Fr(p["y2"] - p["y1"], p["x2"] - p["x1"])
                            != Fr(p["y3"] - p["y2"], p["x3"] - p["x2"]))],
            belief_rewrite="“It went from 2 to 17 over 3 steps — 5 per step, "
                           "every step.” (The table's own steps say 3, then 5, "
                           "then 7.)",
            propagation="the extrapolated m1 propagates into every prediction "
                        "item built on the same table",
            presentation_sensitivity="SENSITIVE: presented-nonlinear data only "
                                     "(table/graph); exponential-context items key "
                                     "treats-exponential-as-steep-linear instead "
                                     "(P04 boundary rule)",
            remediation="Middle-point betrayal: compute P1→P2 and P2→P3 "
                        "rates on the student's own numbers — “you said 3; "
                        "your own numbers just said 3 and then 7. Can one line do "
                        "that?”",
            primary_home="ALG-L19",
            resurfaces=["ALG-L05", "ALG-L07"],
            resurface_surfaces=["quadratics-domain rate items"],
            neighbor="exponential extension (ALG-P04's "
                     "treats-exponential-as-steep-linear — extension flavor vs "
                     "this measurement flavor)",
            grounding_tier="literature-grounded",
            citations=[("de-bock-van-dooren",
                        "illusion of linearity/proportionality — proportional "
                        "methods overgeneralized"),
                       ("bezuidenhout-1998",
                        "average vs instantaneous rate confusion")],
            worked_example={"family": "nonlinear-table-3pt",
                            "params": {"x1": 1, "y1": 2, "x2": 2, "y2": 5,
                                       "x3": 4, "y3": 17},
                            "signature_label": "y1 + m1·(x3-x1) (linear extrapolation)",
                            "trap": Fr(11), "correct": Fr(17)},
            flags={"boundary", "degenerate-case", "predict-reveal-eligible"},
        ),
    ]

    boundary_records = [
        BoundarySigRecord(
            "reverses-x-and-y",
            Signature("1/m (transposed pairs)", NUMERIC, TP, _inv_m,
                      presentation="numeric-entry"),
            constraints=[C_M_NOT_ABS1("cluster:CC-02")],
        ),
        BoundarySigRecord(
            "negative-reciprocal-error",
            Signature("-1/m", NUMERIC, TP, _neg_inv_m,
                      presentation="numeric-entry"),
            # the -1/m surface arises in L05/L06 as the 2.3+2.2 compound; it
            # inherits 2.3's |m| != 1 arming via CC-02 (dry-run interpretation)
            constraints=[C_M_NOT_ABS1("cluster:CC-02")],
        ),
    ]

    matrix_rows = [
        MatrixRow("-m / |m|",
                  ["inconsistent-subtraction-order", "drops-negative-slope-sign"],
                  "m < 0", "positive-slope follow-up item"),
        MatrixRow("1/m", ["inverted-ratio", "reverses-x-and-y"],
                  "bare coordinate pairs", "named-quantity item or plot probe"),
        MatrixRow("Δy", ["forgot-denominator", "rate-not-per-unit"],
                  "numeric entry", "unit-labeled choice probe"),
        MatrixRow("Δy = y2", ["forgot-denominator", "slope-as-height"],
                  "y1 = 0", "generator constraint y1 != 0"),
        MatrixRow("y/x = m", ["slope-as-single-point-ratio", "KEY"],
                  "b = 0", "generator constraint b != 0"),
        MatrixRow("m·sx/sy = m", ["grid-count-ignores-scale", "KEY"],
                  "sx = sy", "author unequal-scale items deliberately"),
        MatrixRow("|m| on graph",
                  ["rise-run-direction-error", "drops-negative-slope-sign"],
                  "read-a-graph numeric", "task type: construct item decides"),
        MatrixRow("-1/m",
                  ["inverted-ratio", "inconsistent-subtraction-order",
                   "negative-reciprocal-error"],
                  "any (compound 2.3+2.2)",
                  "tag as compound (2.3 primary, probe queued); "
                  "negative-reciprocal-error reserved for perpendicular contexts"),
        # entry-level documented collision (gold §2.12 block — the disambiguation
        # ladder vs §2.11 lives in the entry, not the consolidated matrix)
        MatrixRow("scale-driven steepness choice",
                  ["slope-as-visual-steepness", "grid-count-ignores-scale"],
                  "choice hit, then single-graph unequal-scale numeric item",
                  "answer = m·sx/sy re-attributes to grid-count-ignores-scale; "
                  "unrelated answer confirms visual steepness",
                  entry_level=True),
    ]

    not_an_error = [
        {"candidate": "full label reversal (y1-y2)/(x1-x2)",
         "disposition": "rejected-correct-form",
         "reason": "mathematically correct; point labeling is arbitrary — grading "
                   "and hints must never penalize it"},
        {"candidate": "slope-as-angle",
         "disposition": "merged",
         "reason": "merged into slope-as-visual-steepness — no pre-trigonometry "
                   "observable separates them"},
        {"candidate": "other coordinate permutations, e.g. (y2-x1)/(x2-y1)",
         "disposition": "rejected-null-tag",
         "reason": "no stable documented belief; don't replicate within-student — "
                   "log misconception_tag: null and feed taxonomy growth"},
        {"candidate": "additive-instead-of-multiplicative reused for slope",
         "disposition": "cross-link",
         "reason": "kept as the proportion-domain root tag with slope-as-difference "
                   "as the slope-cluster manifestation — detection signatures and "
                   "routing targets differ; registry cross-link, not merge"},
        {"candidate": "averaging the coordinates (y1+y2)/(x1+x2)",
         "disposition": "rejected-null-tag",
         "reason": "occasionally observed, no attested belief structure; null-tag "
                   "and monitor"},
    ]

    rubric_table = [
        {"element": "Names the two quantities being compared (change in y, change in x)",
         "counters": ["slope-as-difference", "subtracts-within-points"]},
        {"element": "States the comparison is a division/ratio, not a difference",
         "counters": ["slope-as-difference", "forgot-denominator"]},
        {"element": "States the result means output change per ONE unit of input",
         "counters": ["rate-not-per-unit", "inverted-ratio"]},
        {"element": "States both subtractions must run in the same direction, and why",
         "counters": ["inconsistent-subtraction-order"]},
        {"element": "States what the sign of the answer tells you about the line",
         "counters": ["drops-negative-slope-sign", "rise-run-direction-error"]},
    ]

    exemplar_ladder = {
        "entry": "forgot-denominator",
        "rungs": [
            "You found how much the hits changed. A rate compares two changes — "
            "what else was changing?",
            "12 more hits in 4 games. Another player got 12 more hits in 12 games. "
            "Same rate? What do you have to do with the 4?",
            "Δhits = 12 and Δgames = 4. Slope = Δhits ÷ Δgames. You finish it.",
        ],
    }

    registry_diff = {
        "adds": ["drops-negative-slope-sign", "slope-as-difference",
                 "subtracts-within-points", "slope-as-height",
                 "slope-as-single-point-ratio", "rate-not-per-unit",
                 "grid-count-ignores-scale", "slope-as-visual-steepness",
                 "zero-undefined-slope-swap", "assumes-constant-rate-nonlinear"],
        "redefines": ["forgot-denominator", "inconsistent-subtraction-order",
                      "inverted-ratio", "rise-run-direction-error"],
        "rekeys": [{"item": "ALG-L05-p1-baseball-04",
                    "distractor": "-0.03 in batting average per game",
                    "tag": "rate-not-per-unit"}],
        "boundary_notes": ["reverses-x-and-y", "swaps-m-and-b",
                           "negative-reciprocal-error", "k-as-y-intercept",
                           "treats-exponential-as-steep-linear",
                           "additive-instead-of-multiplicative",
                           "mismatched-units-in-ratio"],
    }

    keying_contract = {
        "hint_ladders": True,          # gold §3.1
        "error_analysis_rules": True,  # gold §3.2
        "rubric_advisory_only": True,  # gold §3.3
        "evidence_routing": True,      # gold §3.4 (2 hits or 1 hit + failed probe)
        "log_both_tag_neither": True,  # collision-pair default
    }

    return Taxonomy(
        node_ids=["ALG-L05", "ALG-L06"],
        node_class="conceptual",
        entries=entries,
        boundary_records=boundary_records,
        matrix_rows=matrix_rows,
        global_generator_rule=(
            "at render time, compute every applicable signature; if any trap "
            "equals the correct answer, equals another trap (outside the "
            "documented pairs), or falls within grading tolerance of either, "
            "re-parameterize the item"),
        not_an_error=not_an_error,
        rubric_table=rubric_table,
        exemplar_ladder=exemplar_ladder,
        registry_diff=registry_diff,
        keying_contract=keying_contract,
        doc_text=doc_text,
    )
