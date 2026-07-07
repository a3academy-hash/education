"""sig_verify.py — TAXONOMY_REGEN_SPEC §3.1/§3.3: the K-sample check.

Per signature-bearing entry: K = 25 stratified parameter sets rejection-sampled
under the entry's own generator constraints (deliberate boundary/degenerate
draws wherever the constraint region admits them), then:
  (i)   closed-form computable on every sample,
  (ii)  separated from the key on every sample,
  (iii) separated from every other live entry's value on every sample,
        EXCEPT documented pairs (collision matrix) and non-structural
        (render-time-duty) coincidences under the doc's global generator rule.

Separation semantics (mr-gates gate-3, replacing interim interpretation I1):
computed under EXACT Fraction arithmetic against the real platform pin —
the engine grades numeric answers by exact equality with an optional
per-item `tolerance` (lib/problem-engine/index.ts:151-152; types/problem.ts
AnswerSpec). Assertions (ii)/(iii) require separation > the max per-item
tolerance the archetype will declare (`declared_tolerance`, default 0 when
never declared). config.GRADING_TOL is a float-noise floor only;
config.NEAR_MISS_GUARD stays warning-only instrumentation.

Failures -> F-SIG records. Also verifies each entry's §3.14 worked example
numerically (trap and correct answer recompute exactly).
"""
from __future__ import annotations

import random
from fractions import Fraction as Fr

import config
import signatures as S


def within_grading(a, b, declared_tolerance=config.DECLARED_TOLERANCE_DEFAULT):
    """Grading-coincidence test for assertions (ii)/(iii).

    Exact-arithmetic semantics (the platform pin): two exact numerics
    (int/Fraction) coincide iff their exact separation is <= the declared
    per-item tolerance (0 = exact equality, the engine default). A float on
    either side is already noise-degraded, so the comparison falls back to
    float separation with GRADING_TOL as the noise floor. Tuples recurse;
    strings compare exactly.
    """
    num = (int, Fr, float)
    if isinstance(a, num) and isinstance(b, num):
        if isinstance(a, float) or isinstance(b, float):
            return abs(float(a) - float(b)) <= max(declared_tolerance,
                                                   config.GRADING_TOL)
        return abs(Fr(a) - Fr(b)) <= declared_tolerance
    if isinstance(a, tuple) and isinstance(b, tuple):
        return len(a) == len(b) and all(
            within_grading(x, y, declared_tolerance) for x, y in zip(a, b))
    if isinstance(a, str) and isinstance(b, str):
        return a == b
    return False


def sample_under(entry_like, family, rng, k, cap, co_live_tags=frozenset(),
                 extra_constraints=()):
    """Stratified rejection sampling under an entry's active constraints.

    Returns (samples, attempts, strata_used). Raises nothing; caller checks
    len(samples) < k against the satisfiability cap (F-SIG).
    """
    cons = list(entry_like.active_constraints(co_live_tags)) + list(extra_constraints)

    def admissible(p):
        try:
            return all(c.ok(p) for c in cons)
        except (ZeroDivisionError, KeyError):
            return False

    samples, strata_used = [], []
    attempts = 0
    # deliberate boundary/degenerate draws first (spec §3.1 stratification)
    for desc, builder in family.boundary_builders:
        found = False
        for _ in range(60):
            attempts += 1
            if attempts > cap:
                return samples, attempts, strata_used
            try:
                p = builder(rng)
            except Exception:
                break
            if admissible(p):
                samples.append(p)
                strata_used.append(desc)
                found = True
                break
        if not found:
            strata_used.append(f"{desc}: inadmissible under constraints (skipped)")
        if len(samples) >= k:
            return samples[:k], attempts, strata_used
    # fill with plain rejection draws
    while len(samples) < k and attempts < cap:
        attempts += 1
        p = family.sample(rng)
        if admissible(p):
            samples.append(p)
    return samples, attempts, strata_used


def _pair_exception(tag_a, tag_b, taxonomy, machine):
    """Is a coincidence between tag_a and tag_b excused?

    Documented pair (matrix row, incl. entry-level) -> excused.
    Machine-classified non-structural (sporadic / constraint-excluded) -> excused
    as a render-time re-parameterization duty PROVIDED the doc declares the
    global generator rule (dry-run interpretation #3).
    """
    pair = frozenset((tag_a, tag_b))
    if pair in taxonomy.documented_pairs():
        return "documented pair"
    kind = machine["pairs"].get(pair, {}).get("kind")
    if kind in ("sporadic", "constraint-excluded", "no-co-live-region", None) \
            and taxonomy.global_generator_rule:
        return f"render-time duty ({kind or 'not co-live'}; global generator rule)"
    return None


def verify(taxonomy, machine, seed=None,
           declared_tolerance=config.DECLARED_TOLERANCE_DEFAULT):
    """Run the §3.1 check over every signature-bearing entry.

    machine: output of collisions.compute_machine_list (supplies pair
    classification for assertion (iii) exceptions).
    declared_tolerance: max per-item AnswerSpec tolerance the archetype will
    declare (types/problem.ts); assertions (ii)/(iii) require exact-Fraction
    separation strictly greater than it. Default 0 = never declared, i.e.
    the engine's exact-equality grading (lib/problem-engine/index.ts:151-152).
    Returns {"failures": [F-SIG records], "warnings": [...], "entries": {...}}.
    """
    rng = random.Random(config.SEED if seed is None else seed)
    failures, warnings, per_entry = [], [], {}

    units = [(e.tag, e) for e in taxonomy.entries if e.signature_bearing]
    units += [(r.tag, r) for r in taxonomy.boundary_records]

    for tag, unit in units:
        report = {"samples": 0, "strata": [], "assertions": {}}
        per_entry[tag] = report
        families = {sig.family for sig in unit.signatures}
        for fam_name in families:
            family = S.FAMILIES[fam_name]
            extra = ()
            if taxonomy.global_generator_rule:
                # The doc's declared global generator rule ("if any trap equals
                # the correct answer ... re-parameterize") is an author-time
                # constraint on the rendered parameter space: apply its
                # trap-vs-key half as an implicit rejection screen. A trap
                # structurally dead on the whole region then surfaces as an
                # F-SIG satisfiability failure, which is the right diagnosis.
                # (dry-run interpretation I13)
                extra = (_render_rule_screen(unit, fam_name, family,
                                             declared_tolerance),)
            samples, attempts, strata = sample_under(
                unit, family, rng, config.K, config.SATISFIABILITY_CAP,
                extra_constraints=extra)
            report["samples"] += len(samples)
            report["strata"] += strata
            if len(samples) < config.K:
                failures.append({
                    "class": "F-SIG", "entry": tag,
                    "assertion": "constraint-satisfiability",
                    "detail": f"only {len(samples)}/{config.K} valid parameter "
                              f"sets in {attempts} attempts "
                              f"(cap {config.SATISFIABILITY_CAP}) — unsatisfiable "
                              f"constraint set: the trap can never arm"})
                continue
            fam_sigs = [s for s in unit.signatures if s.family == fam_name]
            for sig in fam_sigs:
                a_i = a_ii = True
                for p in samples:
                    # (i) computable
                    try:
                        val = sig.evaluate(p)
                        key = sig.key_for(p, family)
                    except Exception as exc:
                        failures.append({
                            "class": "F-SIG", "entry": tag, "assertion": "(i)",
                            "signature": sig.label,
                            "detail": f"non-computable on {p}: {exc!r} — "
                                      f"quarantine, never ships prose-only"})
                        a_i = False
                        break
                    # (ii) separated from the key (exact arithmetic; separation
                    # must exceed the declared per-item tolerance, default 0)
                    if S.values_comparable(val, key) and \
                            within_grading(val, key, declared_tolerance):
                        failures.append({
                            "class": "F-SIG", "entry": tag, "assertion": "(ii)",
                            "signature": sig.label,
                            "detail": f"trap not separated from the key "
                                      f"on {p} (trap={val}, key={key}, declared "
                                      f"tolerance {declared_tolerance}) — arming "
                                      f"constraint missing"})
                        a_ii = False
                        break
                    sep = S.separation(val, key)
                    if sep is not None and sep < config.NEAR_MISS_GUARD:
                        warnings.append({
                            "entry": tag, "signature": sig.label,
                            "detail": f"near-miss vs key on {p}: separation "
                                      f"{sep:.5f} < guard {config.NEAR_MISS_GUARD}"})
                    # (iii) pairwise vs every other live unit (same family,
                    # compatible presentation), except documented pairs
                    for other_tag, other in units:
                        if other_tag == tag:
                            continue
                        for osig in other.signatures:
                            if osig.family != fam_name:
                                continue
                            if not _presentation_compatible(sig.presentation,
                                                            osig.presentation):
                                continue
                            try:
                                oval = osig.evaluate(p)
                            except Exception:
                                continue   # other trap not evaluable here
                            if S.values_comparable(val, oval) and \
                                    within_grading(val, oval,
                                                   declared_tolerance):
                                excuse = _pair_exception(tag, other_tag,
                                                         taxonomy, machine)
                                if excuse is None:
                                    failures.append({
                                        "class": "F-SIG", "entry": tag,
                                        "assertion": "(iii)",
                                        "signature": sig.label,
                                        "detail": f"not separated from "
                                                  f"{other_tag} ({osig.label}) on "
                                                  f"{p} — undocumented pair"})
                                else:
                                    warnings.append({
                                        "entry": tag, "signature": sig.label,
                                        "detail": f"coincides with {other_tag} on "
                                                  f"a sample — excused: {excuse}"})
                report["assertions"][sig.label] = {
                    "computable": a_i, "key-separated": a_ii}
        # §3.14 worked example recomputes exactly
        we = getattr(unit, "worked_example", None)
        if we:
            _verify_worked_example(unit, we, failures)
    return {"failures": failures, "warnings": warnings, "entries": per_entry}


def _presentation_compatible(a, b):
    return a == "any" or b == "any" or a == b


def _render_rule_screen(unit, fam_name, family,
                        declared_tolerance=config.DECLARED_TOLERANCE_DEFAULT):
    """The global generator rule's trap-vs-key half as an implicit constraint."""
    def ok(p):
        for s in unit.signatures:
            if s.family != fam_name:
                continue
            try:
                v, k = s.evaluate(p), s.key_for(p, family)
            except Exception:
                continue
            if S.values_comparable(v, k) and within_grading(v, k,
                                                            declared_tolerance):
                return False
        return True
    return S.Constraint("global generator rule: trap != key (render screen)",
                        ok, source="global-generator-rule")


def _verify_worked_example(entry, we, failures):
    family = S.FAMILIES[we["family"]]
    sig = next((s for s in entry.signatures if s.label == we["signature_label"]),
               None)
    if sig is None:
        failures.append({"class": "F-SIG", "entry": entry.tag,
                         "assertion": "worked-example",
                         "detail": f"worked example names unknown signature "
                                   f"{we['signature_label']!r}"})
        return
    try:
        trap = sig.evaluate(we["params"])
        key = sig.key_for(we["params"], family)
    except Exception as exc:
        failures.append({"class": "F-SIG", "entry": entry.tag,
                         "assertion": "worked-example",
                         "detail": f"worked example not computable: {exc!r}"})
        return
    if not S.values_equal(trap, we["trap"], config.GRADING_TOL):
        failures.append({"class": "F-SIG", "entry": entry.tag,
                         "assertion": "worked-example",
                         "detail": f"stated trap {we['trap']} != computed {trap}"})
    if not S.values_equal(key, we["correct"], config.GRADING_TOL):
        failures.append({"class": "F-SIG", "entry": entry.tag,
                         "assertion": "worked-example",
                         "detail": f"stated correct {we['correct']} != "
                                   f"computed {key}"})
