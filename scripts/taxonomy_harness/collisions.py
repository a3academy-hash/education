"""collisions.py — TAXONOMY_REGEN_SPEC §4: machine collision ground truth,
matrix recall (F-COLL), extra-row verification, and confusable-cluster
obligations.

Machine ground truth = pairwise signature coincidence within grading tolerance
over the sampled grid + condition-directed exact checks (the pinned structural-
condition library plays the role of the symbolic layer: for each named boundary
condition the pair is sampled INSIDE the condition region with Fraction-exact
arithmetic, so identities like -m = |m| <=> m < 0 are caught exactly, not by
luck of the draw).

Classification (CONFUSABLE_CLUSTERS §1 reading rule, dry-run interpretation):
  structural          — ALWAYS-equal under joint constraints, or equal on every
                        draw inside a library condition admissible under joint
                        constraints. RECALL-BINDING: omission from the doc's
                        collision documentation = F-COLL (fatal).
  constraint-excluded — equal inside a library condition only when the declared
                        constraints are relaxed (the gold "y1 != 0" row pattern).
                        Reported; a documenting row is legal, not owed.
  sporadic            — sample-level coincidence with no library condition:
                        item-level render-time re-parameterization duty under the
                        doc's global generator rule. Never a matrix duty.
  no-co-live-region   — the two traps' constraint regions don't intersect (or
                        presentations never co-occur): no runtime ambiguity.
"""
from __future__ import annotations

import random

import config
import signatures as S
from sig_verify import sample_under, _presentation_compatible

_COND_DRAWS = 6          # samples to attempt inside each condition region
_COND_MIN = 3            # minimum found to assert a condition-realized identity
_JOINT_DRAWS = None      # defaults to config.K


# ---------------------------------------------------------------------------
# Machine ground truth
# ---------------------------------------------------------------------------
def _units(taxonomy):
    units = [(e.tag, e) for e in taxonomy.entries if e.signature_bearing]
    units += [(r.tag, r) for r in taxonomy.boundary_records]
    return units


def _joint_admissible(pair_units, co_live_tags):
    a, b = pair_units

    class _Joint:
        def active_constraints(self, tags=frozenset()):
            return (a.active_constraints(co_live_tags)
                    + b.active_constraints(co_live_tags))

    return _Joint()


def _all_equal_on(sig_a, sig_b, samples):
    hits, total = 0, 0
    for p in samples:
        try:
            va, vb = sig_a.evaluate(p), sig_b.evaluate(p)
        except Exception:
            continue
        if not S.values_comparable(va, vb):
            continue
        total += 1
        if S.values_equal(va, vb, config.GRADING_TOL):
            hits += 1
    return hits, total


def _condition_samples(family, cond_name, joint, rng, relax=False):
    """Draw samples inside a library condition region, honoring (or relaxing)
    the joint constraints."""
    builder = family.condition_builders.get(cond_name)
    pred = family.conditions.get(cond_name)
    if builder is None or pred is None:
        return []
    cons = [] if relax else joint.active_constraints()
    out = []
    for _ in range(_COND_DRAWS * 40):
        if len(out) >= _COND_DRAWS:
            break
        try:
            p = builder(rng)
        except Exception:
            return []
        try:
            if not pred(p):
                continue
            if all(c.ok(p) for c in cons):
                out.append(p)
        except (ZeroDivisionError, KeyError):
            continue
    return out


def compute_machine_list(taxonomy, seed=None):
    """Pairwise machine collision ground truth + key-collision (arming) map.

    Returns {"pairs": {frozenset({a,b}): {...}}, "key_collisions": {tag: [...]},
             "structural": [row dicts]}.
    """
    rng = random.Random((config.SEED if seed is None else seed) ^ 0x5EED)
    units = _units(taxonomy)
    pairs, structural = {}, []

    for i, (tag_a, a) in enumerate(units):
        for tag_b, b in units[i + 1:]:
            fams = ({s.family for s in a.signatures}
                    & {s.family for s in b.signatures})
            for fam_name in sorted(fams):
                family = S.FAMILIES[fam_name]
                sig_pairs = [
                    (sa, sb)
                    for sa in a.signatures if sa.family == fam_name
                    for sb in b.signatures if sb.family == fam_name
                    if _presentation_compatible(sa.presentation, sb.presentation)]
                if not sig_pairs:
                    continue
                co_live = frozenset((tag_a, tag_b))
                joint = _joint_admissible((a, b), co_live)
                samples, attempts, _ = sample_under(
                    joint, family, rng, config.K, config.SATISFIABILITY_CAP)
                record = None
                for sa, sb in sig_pairs:
                    if len(samples) < config.K:
                        record = _best(record, {
                            "kind": "no-co-live-region", "family": fam_name,
                            "detail": f"joint constraint region too thin "
                                      f"({len(samples)} samples in {attempts} "
                                      f"attempts)"})
                        continue
                    hits, total = _all_equal_on(sa, sb, samples)
                    if total and hits == total:
                        record = _best(record, {
                            "kind": "structural", "family": fam_name,
                            "condition": "ALWAYS (joint constraint region)",
                            "signatures": (sa.label, sb.label),
                            "rate": f"{hits}/{total}"})
                        continue
                    # condition-directed exact layer
                    cond_hit = None
                    for cond_name in family.condition_builders:
                        cs = _condition_samples(family, cond_name, joint, rng)
                        if len(cs) >= _COND_MIN:
                            h, t = _all_equal_on(sa, sb, cs)
                            if t >= _COND_MIN and h == t:
                                cond_hit = ("structural", cond_name)
                                break
                        else:
                            rs = _condition_samples(family, cond_name, joint,
                                                    rng, relax=True)
                            if len(rs) >= _COND_MIN:
                                h, t = _all_equal_on(sa, sb, rs)
                                if t >= _COND_MIN and h == t:
                                    cond_hit = ("constraint-excluded", cond_name)
                                    break
                    if cond_hit:
                        kind, cond = cond_hit
                        record = _best(record, {
                            "kind": kind, "family": fam_name, "condition": cond,
                            "signatures": (sa.label, sb.label)})
                    elif hits:
                        record = _best(record, {
                            "kind": "sporadic", "family": fam_name,
                            "rate": f"{hits}/{total}",
                            "signatures": (sa.label, sb.label),
                            "detail": "no library condition — render-time "
                                      "re-parameterization duty"})
                if record:
                    key = frozenset((tag_a, tag_b))
                    prev = pairs.get(key)
                    pairs[key] = _best(prev, record)

    for key, rec in pairs.items():
        if rec["kind"] == "structural":
            structural.append({"pair": sorted(key), **rec})

    key_collisions = _key_collisions(taxonomy, rng)
    return {"pairs": pairs, "structural": structural,
            "key_collisions": key_collisions}


_KIND_RANK = {"structural": 3, "constraint-excluded": 2, "sporadic": 1,
              "no-co-live-region": 0}


def _best(old, new):
    if old is None or _KIND_RANK[new["kind"]] > _KIND_RANK[old["kind"]]:
        return new
    return old


def _key_collisions(taxonomy, rng):
    """Trap-equals-key regions (arming-constraint territory, spec §4.1 /
    CONFUSABLE_CLUSTERS key-collision class). Constraint-relaxed by design:
    these confirm which arming constraints are load-bearing."""
    out = {}
    for tag, unit in _units(taxonomy):
        findings = []
        for sig in unit.signatures:
            family = S.FAMILIES[sig.family]
            for cond_name in family.condition_builders:
                cs = _condition_samples(
                    family, cond_name, _joint_admissible((unit, unit),
                                                         frozenset()),
                    rng, relax=True)
                if len(cs) < _COND_MIN:
                    continue
                hits = total = 0
                for p in cs:
                    try:
                        v, k = sig.evaluate(p), sig.key_for(p, family)
                    except Exception:
                        continue
                    if S.values_comparable(v, k):
                        total += 1
                        if S.values_equal(v, k, config.GRADING_TOL):
                            hits += 1
                if total >= _COND_MIN and hits == total:
                    findings.append({
                        "signature": sig.label, "condition": cond_name,
                        "note": "trap = key here — arming constraint territory",
                        "excluded_by_declared_constraints":
                            not _cond_admissible(unit, family, cond_name, rng)})
        if findings:
            out[tag] = findings
    return out


def _cond_admissible(unit, family, cond_name, rng):
    joint = _joint_admissible((unit, unit), frozenset())
    return len(_condition_samples(family, cond_name, joint, rng)) >= 1


# ---------------------------------------------------------------------------
# Recall requirement (spec §4.2) — F-COLL is fatal
# ---------------------------------------------------------------------------
def check_recall(taxonomy, machine):
    failures, findings = [], []
    documented = taxonomy.documented_pairs()
    for row in machine["structural"]:
        pair = frozenset(row["pair"])
        if pair not in documented:
            failures.append({
                "class": "F-COLL", "pair": sorted(pair),
                "condition": row.get("condition"),
                "detail": "machine-detected structural collision absent from the "
                          "taxonomy's collision documentation — misattributed-"
                          "evidence hazard (fatal)"})
    # extra documented rows: verify against the grid + condition layer (spec §4.2)
    live_tags = {t for t, _ in _units(taxonomy)}
    for row in taxonomy.matrix_rows:
        members = row.members - {"KEY"}
        if "KEY" in row.members:
            findings.append({"row": row.value,
                             "status": "key-collision documentation row "
                                       "(arming constraint) — confirmed against "
                                       "machine key-collision map"
                             if any(m in machine["key_collisions"]
                                    for m in members)
                             else "key-collision row not machine-confirmed"})
            continue
        pairs_in_row = [frozenset((x, y)) for i, x in enumerate(sorted(members))
                        for y in sorted(members)[i + 1:]]
        confirmed = [p for p in pairs_in_row
                     if machine["pairs"].get(p, {}).get("kind")
                     in ("structural", "constraint-excluded", "sporadic")]
        if confirmed:
            continue
        if not members <= live_tags:
            findings.append({"row": row.value,
                             "status": "references non-signature-bearing or "
                                       "cross-form member — construction-level "
                                       "documentation, kahn territory"})
        else:
            findings.append({"row": row.value,
                             "status": "documented-extra: not machine-realizable "
                                       "as a live pairwise coincidence under "
                                       "stated constraints — finding for mr-kahn "
                                       "(spec §4.2), satisfied for gold by the "
                                       "kahn verdict"})
    return {"failures": failures, "extra_row_findings": findings}


# ---------------------------------------------------------------------------
# Confusable-cluster obligations (task brief: every obligation for clusters the
# node touches needs a matrix row + conforming probe reference; probeContract
# fields must be cited)
# ---------------------------------------------------------------------------
# Pinned token transcriptions of each cluster's probeContract "varies"/"default"
# fields (deterministic text checks against the doc; lowercase).
PROBE_TOKENS = {
    "CC-01": ["positive-slope"],
    "CC-02": ["plot"],
    "CC-03": ["unit-labeled"],
    "CC-04": ["how fast"],
    "CC-05": ["unequal-scale"],
    "CC-06": ["middle-point"],
    "CC-07": ["ramp"],
}
DEFAULT_TOKENS = {
    # only clusters with a live co-documented ambiguous pair owe the default
    # rule verbatim (dry-run interpretation #4)
    "CC-01": ["tag neither"],
    "CC-02": ["defaults to `inverted-ratio`"],
    "CC-03": ["defaults to `forgot-denominator`"],
}


def check_cluster_obligations(taxonomy, cmap, machine):
    failures, findings = [], []
    covered = set(taxonomy.node_ids)
    text = (taxonomy.doc_text or "").lower()
    live_tags = ({e.tag for e in taxonomy.entries}
                 | {r.tag for r in taxonomy.boundary_records})
    documented = taxonomy.documented_pairs()

    for cluster in cmap["clusters"]:
        cid = cluster["id"]
        if not (set(cluster["nodes"]) & covered):
            continue
        members = [m["tag"] for m in cluster["members"]]
        live = [t for t in members if t in live_tags]
        contract = cluster.get("probeContract", {})
        is_a = cluster["type"].startswith("A")

        if is_a and len(live) >= 2:
            live_pairs = [frozenset((a, b)) for i, a in enumerate(live)
                          for b in live[i + 1:]]
            row_pairs = [p for p in live_pairs if p in documented]
            excluded = [p for p in live_pairs
                        if machine["pairs"].get(p, {}).get("kind")
                        == "constraint-excluded"]
            if not row_pairs and not excluded:
                failures.append({
                    "class": "F-COLL", "cluster": cid,
                    "detail": f"{cid} ({cluster['name']}): >=2 members live "
                              f"({live}) but no matrix row covers any pair and "
                              f"no pair is constraint-excluded"})
                continue
            missing = [t for t in PROBE_TOKENS.get(cid, [])
                       if t not in text]
            if missing:
                failures.append({
                    "class": "F-COLL", "cluster": cid,
                    "detail": f"{cid}: probe contract not cited — expected "
                              f"token(s) {missing} (probeContract.varies: "
                              f"{contract.get('varies')!r})"})
            if row_pairs:
                dmiss = [t for t in DEFAULT_TOKENS.get(cid, [])
                         if t not in text]
                if dmiss:
                    failures.append({
                        "class": "F-COLL", "cluster": cid,
                        "detail": f"{cid}: default rule not stated — expected "
                                  f"token(s) {dmiss} (defaultRule: "
                                  f"{contract.get('defaultRule')!r})"})
                findings.append({"cluster": cid,
                                 "status": f"row(s) present for {sorted(map(sorted, row_pairs))}; "
                                           f"probe + default cited"})
            else:
                findings.append({"cluster": cid,
                                 "status": "live pair constraint-excluded under "
                                           "injected cluster arming — no row/"
                                           "default owed; probe observable cited"})
        elif len(live) >= 1:
            # boundary / pooling duty: the non-live members' boundary must be
            # documented (type A single-live) or the cross-link stated (type B
            # component / hybrid)
            others = [t for t in members if t not in live]
            mentioned = [t for t in others if t in text]
            crosslink = ("cross-link" in text) or ("merge" in text)
            if cluster["type"] in ("B", "A/B-hybrid") and not crosslink:
                failures.append({
                    "class": "F-STRUCT", "cluster": cid,
                    "detail": f"{cid}: type-B/hybrid pooling duty — no cross-link/"
                              f"merge statement found in the doc"})
            elif others and not mentioned and not crosslink:
                failures.append({
                    "class": "F-STRUCT", "cluster": cid,
                    "detail": f"{cid}: single live member {live}; sibling "
                              f"member(s) {others} never mentioned — boundary "
                              f"rule undocumented"})
            else:
                findings.append({"cluster": cid,
                                 "status": f"boundary/pooling duty documented "
                                           f"(live={live}, cited siblings="
                                           f"{mentioned or 'cross-link'})"})
        else:
            findings.append({"cluster": cid,
                             "status": "touches node span but no member is live "
                                       "on the covered node(s) — no duty"})
    return {"failures": failures, "findings": findings}
