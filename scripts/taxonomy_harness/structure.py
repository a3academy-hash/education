"""structure.py — TAXONOMY_TEMPLATE conformance (harness layer, spec §6.2 step 1).

Checks:
  - all fifteen TEMPLATE §3 per-entry fields present-or-explicitly-marked;
  - node-level structures: collision matrix + global generator rule, >=2
    boundary entries (or documented shortfall flag), not-an-error records,
    rubric table, exemplar hint ladder, BLOCKER reason strings;
  - §4.5 minimum counts against the node's MANIFEST class demand row;
  - grounding-tier vocabulary (literature-grounded | tradition-adjacent |
    engineering-candidate) with the honesty flags of TEMPLATE §7.1;
  - registry-tag hygiene: every entry ID in the batch's pinned registry ∪ the
    doc's own §4 proposed diff (authoring-time F-TAG);
  - entry-count band instrumentation (spec §5.2 — anomaly flag, never failure).
Failures -> F-STRUCT / F-TAG records.
"""
from __future__ import annotations

import config


def _blank(v) -> bool:
    return v is None or (isinstance(v, str) and not v.strip())


def check_structure(taxonomy) -> dict:
    failures, findings = [], []
    demands = config.CLASS_DEMANDS[taxonomy.node_class]

    # ---- per-entry: the fifteen §3 fields -------------------------------
    for e in taxonomy.entries:
        missing = []
        if _blank(e.tag) or " " in e.tag or e.tag != e.tag.lower():
            missing.append("§3.1 entry ID (kebab-case, belief-named)")
        if _blank(e.belief):
            missing.append("§3.2 student-belief statement")
        if _blank(e.root):
            missing.append("§3.3 cognitive root")
        if e.severity not in config.SEVERITY_BANDS:
            missing.append(f"§3.4 severity band (got {e.severity!r})")
        if not e.signatures:
            missing.append("§3.5 closed-form detection signature (no machine-"
                           "evaluable form — F-SIG quarantine territory)")
        if _blank(e.step_locality):
            missing.append("§3.6 step-locality")
        if not e.constraints and _blank(e.constraints_note):
            missing.append("§3.7 generator constraints (empty and not "
                           "explicitly marked)")
        if _blank(e.belief_rewrite):
            missing.append("§3.8 belief-form rewrite")
        if _blank(e.propagation):
            missing.append("§3.9 propagation form / non-propagating mark")
        if _blank(e.presentation_sensitivity):
            missing.append("§3.10 presentation-class sensitivity / "
                           "insensitive mark")
        if _blank(e.remediation):
            missing.append("§3.11 remediation move")
        if _blank(e.primary_home):
            missing.append("§3.12 nodes/homes/routing (primary home)")
        if e.grounding_tier not in config.GROUNDING_TIERS:
            missing.append(f"§3.13 grounding tier (got {e.grounding_tier!r})")
        if not e.worked_example:
            missing.append("§3.14 worked example")
        if not isinstance(e.flags, set):
            missing.append("§3.15 archetype-eligibility flags")
        # honesty flags (TEMPLATE §7.1)
        if e.grounding_tier == "literature-grounded" and not e.citations:
            missing.append("§3.13 literature-grounded without any citation")
        if e.grounding_tier == "tradition-adjacent" and \
                "extrapolated" not in e.grounding_flag.lower():
            missing.append("§3.13 tradition-adjacent without the 'extrapolated "
                           "from [tradition]' flag")
        if e.grounding_tier == "engineering-candidate":
            if "pilot" not in e.grounding_flag.lower():
                missing.append("§3.13 engineering-candidate without the pilot-"
                               "validation flag")
            if "first-principles" not in (e.root + " " + e.grounding_flag).lower():
                missing.append("§3.13 engineering-candidate without a stated "
                               "first-principles analysis (F-INVENT territory)")
        if e.severity == "BLOCKER":
            if not e.blocker_destination:
                missing.append("§3.12 BLOCKER without a stated backward "
                               "destination")
            if _blank(e.blocker_reason):
                missing.append("§3.4/§5 BLOCKER without its plain-language "
                               "reason string")
        for m in missing:
            failures.append({"class": "F-STRUCT", "entry": e.tag, "detail": m})

    # ---- node-level structures ------------------------------------------
    if not taxonomy.matrix_rows:
        failures.append({"class": "F-STRUCT", "detail":
                         "consolidated collision matrix absent — not check-ready "
                         "(TEMPLATE §4.1/§4.5 row 9)"})
    if _blank(taxonomy.global_generator_rule):
        failures.append({"class": "F-STRUCT", "detail":
                         "global generator rule absent (TEMPLATE §4.5 row 9)"})
    if not taxonomy.not_an_error:
        failures.append({"class": "F-STRUCT", "detail":
                         "§2.15-class merged/rejected/not-an-error records absent "
                         "(TEMPLATE §4.3 — the no-padding evidence record)"})
    elif not any(r["disposition"] in ("rejected-correct-form", "correct-form")
                 for r in taxonomy.not_an_error):
        findings.append("no correct-but-unusual-form record — acceptable only if "
                        "the procedure admits no labeling/order freedom "
                        "(TEMPLATE §4.5 row 8)")
    if not taxonomy.rubric_table:
        failures.append({"class": "F-STRUCT", "detail":
                         "§3.3-style rubric table absent (TEMPLATE §4.5 row 10)"})
    else:
        tags = set(taxonomy.tags)
        for row in taxonomy.rubric_table:
            unknown = [t for t in row["counters"] if t not in tags]
            if unknown:
                failures.append({"class": "F-STRUCT", "detail":
                                 f"rubric element counters unknown entries: "
                                 f"{unknown}"})
    ladder = taxonomy.exemplar_ladder
    if not ladder or len(ladder.get("rungs", [])) != 3:
        failures.append({"class": "F-STRUCT", "detail":
                         "exemplar hint ladder absent or not 3 rungs "
                         "(TEMPLATE §5.1)"})
    else:
        le = taxonomy.entry_by_tag(ladder["entry"])
        if le is None:
            failures.append({"class": "F-STRUCT", "detail":
                             f"exemplar ladder keyed to unknown entry "
                             f"{ladder['entry']!r}"})
        elif le.severity not in ("BLOCKER", "HIGH"):
            findings.append(f"exemplar ladder entry {ladder['entry']} is "
                            f"{le.severity}, not the highest-severity band")
    for key in ("hint_ladders", "error_analysis_rules", "rubric_advisory_only",
                "evidence_routing"):
        if not taxonomy.keying_contract.get(key):
            failures.append({"class": "F-STRUCT", "detail":
                             f"§3-contract restatement missing component: {key}"})

    # ---- §4.5 countable rows vs the MANIFEST class row --------------------
    sig_entries = [e for e in taxonomy.entries if e.signature_bearing]
    n_sig = len(sig_entries)
    n_belief = sum(1 for e in taxonomy.entries if not _blank(e.belief_rewrite))
    boundary = [e for e in taxonomy.entries if "boundary" in e.flags]
    n_pred = sum(1 for e in taxonomy.entries
                 if "predicate-expressible" in e.flags)
    distinct_roots = len({e.root for e in sig_entries
                          if not _blank(e.step_locality)})
    counts = {
        "row 1 closed-form signature entries":
            (n_sig, demands["min_signature"]),
        "row 2 belief-rewritable entries":
            (n_belief, demands["min_belief_rewritable"]),
        "row 3 boundary/contrast entries":
            (len(boundary), demands["min_boundary"]),
        "row 4 predicate-expressible entries":
            (n_pred, demands["min_predicate"]),
        "row 6 step-instantiable entries with distinct roots":
            (distinct_roots, demands["error_analysis_count"]),
    }
    for name, (have, need) in counts.items():
        if have < need:
            if name.startswith("row 3") and taxonomy.boundary_shortfall_flag:
                findings.append(f"{name}: {have} < {need} — documented shortfall "
                                f"flag present ({taxonomy.boundary_shortfall_flag})"
                                f"; MANIFEST takes the degradation (spec §5.3)")
            else:
                failures.append({"class": "F-STRUCT", "detail":
                                 f"§4.5 {name}: {have} < required {need} and no "
                                 f"documented shortfall"})
    for e in boundary:
        problems = []
        if _blank(e.neighbor):
            problems.append("no named neighbor")
        if not e.signature_bearing:
            problems.append("no construction recipe (signature)")
        if not e.constraints and _blank(e.constraints_note):
            problems.append("no arming constraint")
        if problems:
            failures.append({"class": "F-STRUCT", "entry": e.tag, "detail":
                             f"boundary entry incomplete: {', '.join(problems)} "
                             f"(TEMPLATE §4.2)"})
    if not any("degenerate-case" in e.flags for e in taxonomy.entries):
        findings.append("no degenerate-case entry — acceptable only if the "
                        "node's concept has no degenerate cases "
                        "(TEMPLATE §4.5 row 15)")
    if not any("predict-reveal-eligible" in e.flags for e in taxonomy.entries):
        findings.append("no predict-committable entry — GAP_NOTES flag + "
                        "manifest reallocation if predict-reveal is scheduled "
                        "(TEMPLATE §4.5 row 5)")

    # ---- band instrumentation (spec §5.2 — never a failure) ---------------
    lo, hi = config.ENTRY_COUNT_BANDS[taxonomy.node_class]
    n = len(taxonomy.entries)
    if n < lo:
        findings.append(f"entry count {n} below the {taxonomy.node_class} band "
                        f"[{lo}-{hi}] — shortfall documentation gets audited "
                        f"first (spec §5.2)")
    elif n > hi:
        findings.append(f"entry count {n} above the {taxonomy.node_class} band "
                        f"[{lo}-{hi}] — padding suspicion, heightened kahn "
                        f"attention on the §2.15 record (F-PAD watch)")
    else:
        findings.append(f"entry count {n} within the {taxonomy.node_class} "
                        f"band [{lo}-{hi}]")

    return {"failures": failures, "findings": findings, "counts": counts}


def check_tag_hygiene(taxonomy, registry_pin: frozenset) -> dict:
    """Authoring-time F-TAG: every entry ID (and every matrix-row member) exists
    in the batch's pinned registry ∪ the doc's own proposed diff."""
    failures = []
    legal = set(registry_pin) | set(taxonomy.registry_diff.get("adds", []))
    for e in taxonomy.entries:
        if e.tag not in legal:
            failures.append({"class": "F-TAG", "entry": e.tag, "detail":
                             "entry ID outside batch-pinned registry ∪ own "
                             "proposed diff"})
    for r in taxonomy.boundary_records:
        if r.tag not in legal:
            failures.append({"class": "F-TAG", "entry": r.tag, "detail":
                             "boundary signature record tag outside registry "
                             "∪ diff"})
    for row in taxonomy.matrix_rows:
        for t in row.members - {"KEY"}:
            if t not in legal:
                failures.append({"class": "F-TAG", "detail":
                                 f"collision-matrix member {t!r} outside "
                                 f"registry ∪ diff"})
    for t in taxonomy.registry_diff.get("redefines", []):
        if t not in registry_pin:
            failures.append({"class": "F-TAG", "detail":
                             f"REDEFINE target {t!r} not in the pinned registry"})
    return {"failures": failures}
