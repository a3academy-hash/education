"""config.py — pinned parameters for the taxonomy generation harness.

TAXONOMY_REGEN_SPEC Appendix A: every pin lives HERE and only here.
stdlib only. No anthropic SDK (Batch API layer is urllib in orchestrate.py).

Session gates honored by this module: read-only against data/; all writes go
under .authoring-tmp/taxonomies/; no Supabase; no live API calls unless
orchestrate.py's triple guard (--live + ANTHROPIC_API_KEY + batch-id) is met.
"""
from __future__ import annotations

import json
import os
import re

# ---------------------------------------------------------------------------
# Model pins (TAXONOMY_REGEN_SPEC model-config table — the single source of truth)
# ---------------------------------------------------------------------------
TAX_DRAFT_MODEL = "claude-opus-4-8"      # mechanical scaffolding drafts (spec §1.3 step 1)
TAX_JUDGMENT_MODEL = "claude-fable-5"    # belief-level authorship (spec §1.3 step 3)
# audit: NO LLM audit model exists in this pipeline (spec model table / §6).

# ---------------------------------------------------------------------------
# Sampling / verification pins (spec §3, Appendix A)
# ---------------------------------------------------------------------------
K = 25                        # samples per signature-bearing entry (spec §3.1)
SATISFIABILITY_CAP = 10_000   # rejection-sampling attempts before F-SIG (spec §3.3)
SEED = 0x7A31                 # deterministic harness runs

# Grading-tolerance pin (mr-gates gate-3 — replaces interim interpretation I1).
# The platform grades numeric answers by EXACT equality, with an OPTIONAL
# per-item `tolerance` on the AnswerSpec (pin source:
# lib/problem-engine/index.ts:151-152 `numericEqual` — exact unless a
# tolerance is declared; types/problem.ts AnswerSpec numeric/coordinate).
# Consequences for the §3.1 checks:
#   - separation for assertions (ii)/(iii) is computed under exact Fraction
#     arithmetic and must EXCEED the max per-item tolerance the archetype
#     will declare (sig_verify's `declared_tolerance`, default
#     DECLARED_TOLERANCE_DEFAULT = 0 when never declared);
#   - GRADING_TOL is demoted to a float-noise floor ONLY (applied when a
#     compared value has degraded to float — never grading semantics);
#   - NEAR_MISS_GUARD stays instrumentation: separations below it are
#     recorded as warnings (gold §2.9 posture), never failures.
GRADING_TOL = 1e-9              # float-noise floor only — NOT a grading tolerance
DECLARED_TOLERANCE_DEFAULT = 0  # per-item AnswerSpec tolerance, when never declared
NEAR_MISS_GUARD = 4e-3          # warning-only instrumentation

MAX_AUTO_REGEN_ROUNDS = 2     # spec §6.4
BATCH_SIZE = 10               # spec §8.1

# ---------------------------------------------------------------------------
# Input pins (spec §0 preconditions — F-DEP surface)
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

GRAPH_PATH = os.path.join(REPO_ROOT, "data", "algebra1-graph.json")
GRAPH_PIN_VERSION = "1.12.0"          # batch-1 pin; later batches pin via _manifest.json
GRAPH_PIN_NODES = 75
GRAPH_PIN_EDGES = 117

TEMPLATE_PATH = os.path.join(REPO_ROOT, "docs", "archetypes", "TAXONOMY_TEMPLATE.md")
TAXONOMY_TEMPLATE_VERSION = "1.0.0"   # F-DEP if the doc header drifts from this pin

CONFUSABLE_MAP_PATH = os.path.join(REPO_ROOT, "docs", "specs", "confusable-clusters.json")
CONFUSABLE_MAP_DOC_PATH = os.path.join(REPO_ROOT, "docs", "specs", "CONFUSABLE_CLUSTERS.md")
CONFUSABLE_MAP_VERSION = "1.0.0"      # Appendix-A pin (gate 2)

# DECISION_F-IF-B6 §7 application addendum (mr-kahn ruling, batch approved by
# Matt 2026-07-06) — source of the binding presented-only authoring constraint
# that L19's pilotNotes reference; orchestrate extracts and injects it
# verbatim into the L19 draft/judgment payloads (pilot GAP 1).
DECISION_F_IF_B6_PATH = os.path.join(REPO_ROOT, "docs", "specs", "DECISION_F-IF-B6.md")

GOLD_TAXONOMY_PATH = os.path.join(REPO_ROOT, "docs", "gold-node", "misconception-taxonomy-slope.md")
GOLD_NODE_IDS = ("ALG-L05", "ALG-L06")   # the gold doc is a cluster doc (TEMPLATE §2 rule)

REGISTRY_BASE_PATH = os.path.join(REPO_ROOT, ".authoring-tmp", "registry-163.json")
REGISTRY_BASE_COUNT = 163             # post-1.12.0 state — the batch-1 base pin

# ---------------------------------------------------------------------------
# Staging layout (spec §9 — nothing outside .authoring-tmp/taxonomies/)
# ---------------------------------------------------------------------------
STAGING_ROOT = os.path.join(REPO_ROOT, ".authoring-tmp", "taxonomies")
BATCHES_DIR = os.path.join(STAGING_ROOT, "_batches")
CITATION_REGISTRY_DIR = os.path.join(STAGING_ROOT, "_registry")
CITATION_REGISTRY_PATH = os.path.join(CITATION_REGISTRY_DIR, "verified-citations.json")
REPORTS_DIR = os.path.join(STAGING_ROOT, "_reports")
DRYRUN_DIR = os.path.join(STAGING_ROOT, "_dryrun")

STATUS_VALUES = (
    "PENDING", "DRAFT_VALID", "ASSEMBLED", "HARNESS_PASS",
    "CITATIONS_VERIFIED", "APPROVED", "AWC", "REJECTED", "QUARANTINE",
)

# ---------------------------------------------------------------------------
# Batch API surface (orchestrate.py — urllib, never the SDK)
# ---------------------------------------------------------------------------
ANTHROPIC_BATCHES_URL = "https://api.anthropic.com/v1/messages/batches"
ANTHROPIC_VERSION = "2023-06-01"
DRAFT_MAX_TOKENS = 16_000
JUDGMENT_MAX_TOKENS = 10_000

# ---------------------------------------------------------------------------
# Node classes and demand rows (spec §5; MANIFEST class sign-off is per-batch F-DEP —
# only the gold/pilot slice is pinned here; the full 74-map arrives batch-signed)
# ---------------------------------------------------------------------------
NODE_CLASS = {
    "ALG-L05": "conceptual",
    "ALG-L06": "conceptual",   # gold anchor
    "ALG-L19": "conceptual",   # pilot
    "ALG-L11": "procedural",   # pilot (kahn classification rationale in spec §7)
    "ALG-L09": "graphing",     # pilot
}

# Entry-count bands — anomaly instrumentation, never floors (spec §5.2)
ENTRY_COUNT_BANDS = {
    "conceptual": (10, 14),
    "word-problem": (9, 12),
    "graphing": (8, 12),
    "procedural": (6, 10),
}

# TEMPLATE §4.5 countable demand rows (per class where the row varies).
# error_analysis_count: MANIFEST §4 error-analysis demand (2-4 by class).
CLASS_DEMANDS = {
    "conceptual":   {"min_signature": 4, "min_belief_rewritable": 3, "min_boundary": 2,
                     "min_predicate": 2, "error_analysis_count": 4},
    "word-problem": {"min_signature": 4, "min_belief_rewritable": 3, "min_boundary": 2,
                     "min_predicate": 2, "error_analysis_count": 3},
    "graphing":     {"min_signature": 4, "min_belief_rewritable": 3, "min_boundary": 2,
                     "min_predicate": 2, "error_analysis_count": 3},
    "procedural":   {"min_signature": 4, "min_belief_rewritable": 3, "min_boundary": 2,
                     "min_predicate": 2, "error_analysis_count": 2},
}

GROUNDING_TIERS = ("literature-grounded", "tradition-adjacent", "engineering-candidate")
SEVERITY_BANDS = ("BLOCKER", "HIGH", "MEDIUM", "LOW")


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
class FDepError(RuntimeError):
    """A spec §0 precondition is unmet. Hard stop (F-DEP)."""


def load_graph():
    with open(GRAPH_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_confusable_map():
    with open(CONFUSABLE_MAP_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_registry_base():
    """The 163-entry post-1.12.0 registry state (batch-1 base pin)."""
    with open(REGISTRY_BASE_PATH, encoding="utf-8") as f:
        entries = json.load(f)
    return {e["id"] for e in entries}


def template_version_on_disk() -> str | None:
    try:
        with open(TEMPLATE_PATH, encoding="utf-8") as f:
            head = f.read(2000)
    except OSError:
        return None
    m = re.search(r"\*\*Version:\*\*\s*([0-9]+\.[0-9]+\.[0-9]+)", head)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# Per-batch registry pin (spec §0 rolling pin)
#
# pin(batch) = 163-entry base  ∪  every diff applied by prior gated
# graph-mutation batches, walked TRANSITIVELY through each manifest's
# priorBatches list. Registry growth is legal ONLY via gate-6 gated
# applications; this loader never mutates anything — it reads manifests
# and unions ids.
# ---------------------------------------------------------------------------
def batch_dir(batch_id: str) -> str:
    return os.path.join(BATCHES_DIR, batch_id)


def batch_manifest_path(batch_id: str) -> str:
    return os.path.join(batch_dir(batch_id), "_manifest.json")


def ensure_batch_layout(batch_id: str, nodes: list[str] | None = None,
                        prior_batches: list[str] | None = None) -> dict:
    """Create .authoring-tmp/taxonomies/_batches/<batch-id>/_manifest.json if absent.

    The manifest records the batch's full pin set. appliedRegistryDiff is the
    list of registry entry ids ADDED by the gated graph-mutation application
    that closed THIS batch (empty until gate 6 runs for it) — successor batches
    union prior batches' applied diffs into their pin.
    """
    os.makedirs(batch_dir(batch_id), exist_ok=True)
    path = batch_manifest_path(batch_id)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    manifest = {
        "batchId": batch_id,
        "models": {"draft": TAX_DRAFT_MODEL, "judgment": TAX_JUDGMENT_MODEL},
        "templateVersion": TAXONOMY_TEMPLATE_VERSION,
        "graphPin": {"version": GRAPH_PIN_VERSION, "nodes": GRAPH_PIN_NODES,
                     "edges": GRAPH_PIN_EDGES},
        "registryPin": {"base": REGISTRY_BASE_COUNT,
                        "basePath": os.path.relpath(REGISTRY_BASE_PATH, REPO_ROOT)},
        "confusableMapVersion": CONFUSABLE_MAP_VERSION,
        "priorBatches": prior_batches or [],
        "appliedRegistryDiff": [],   # filled ONLY by a gate-6 gated application
        "nodes": nodes or [],
        "k": K, "satisfiabilityCap": SATISFIABILITY_CAP, "seed": SEED,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
    return manifest


def load_registry_pin(batch_id: str) -> frozenset[str]:
    """The batch's rolling registry pin: base 163 ∪ the applied diffs of the
    TRANSITIVE prior-batch closure.

    priorBatches is walked recursively — a manifest may name only its
    immediate predecessors, but the pin must still union every ancestor
    batch's gate-6 appliedRegistryDiff (batch-3 naming only batch-2 must
    still see batch-1's diff). The walk is cycle-safe (visited set). Any
    referenced manifest that is missing — direct or transitive — is F-DEP:
    an unreadable ancestor makes the pin unreconstructable.
    """
    path = batch_manifest_path(batch_id)
    if not os.path.exists(path):
        raise FDepError(f"F-DEP: no _manifest.json for batch '{batch_id}' "
                        f"(expected {path}) — the batch pin is unrecorded")
    with open(path, encoding="utf-8") as f:
        manifest = json.load(f)
    pin = set(load_registry_base())
    if len(pin) != manifest["registryPin"]["base"]:
        raise FDepError(
            f"F-DEP: registry base has {len(pin)} entries; batch pin says "
            f"{manifest['registryPin']['base']}")
    seen = {batch_id}
    stack = list(manifest.get("priorBatches", []))
    while stack:
        prior_id = stack.pop()
        if prior_id in seen:          # cycle-safe: each manifest read once
            continue
        seen.add(prior_id)
        prior_path = batch_manifest_path(prior_id)
        if not os.path.exists(prior_path):
            raise FDepError(f"F-DEP: prior batch '{prior_id}' (in the "
                            f"transitive closure of '{batch_id}') has no "
                            f"manifest — the pin is unreconstructable")
        with open(prior_path, encoding="utf-8") as f:
            prior = json.load(f)
        pin.update(prior.get("appliedRegistryDiff", []))
        stack.extend(prior.get("priorBatches", []))
    return frozenset(pin)


def check_preconditions(batch_id: str | None = None) -> list[str]:
    """Spec §0 F-DEP check, run at every harness start. Returns finding strings
    (empty = all preconditions hold). Raises nothing — callers decide hard-stop."""
    findings = []
    # graph pin
    try:
        g = load_graph()
        v = g["schema"]["version"]
        if v != GRAPH_PIN_VERSION:
            findings.append(f"graph version {v} != pin {GRAPH_PIN_VERSION}")
        if len(g["nodes"]) != GRAPH_PIN_NODES or len(g["edges"]) != GRAPH_PIN_EDGES:
            findings.append(f"graph shape {len(g['nodes'])}n/{len(g['edges'])}e "
                            f"!= pin {GRAPH_PIN_NODES}n/{GRAPH_PIN_EDGES}e")
        if len(g["misconceptionRegistry"]) != REGISTRY_BASE_COUNT:
            findings.append(f"graph registry {len(g['misconceptionRegistry'])} "
                            f"!= base pin {REGISTRY_BASE_COUNT}")
    except (OSError, KeyError) as e:
        findings.append(f"graph unreadable: {e}")
    # template pin
    tv = template_version_on_disk()
    if tv != TAXONOMY_TEMPLATE_VERSION:
        findings.append(f"TAXONOMY_TEMPLATE version on disk {tv!r} != pin "
                        f"{TAXONOMY_TEMPLATE_VERSION!r}")
    # confusable map pin
    try:
        cmap = load_confusable_map()
        if cmap.get("version") != CONFUSABLE_MAP_VERSION:
            findings.append(f"confusable map version {cmap.get('version')!r} "
                            f"!= pin {CONFUSABLE_MAP_VERSION!r}")
    except OSError as e:
        findings.append(f"confusable map unreadable: {e}")
    # registry base
    try:
        base = load_registry_base()
        if len(base) != REGISTRY_BASE_COUNT:
            findings.append(f"registry base {len(base)} != {REGISTRY_BASE_COUNT}")
    except OSError as e:
        findings.append(f"registry base unreadable: {e}")
    # citation registry initialized (seeded before batch 1 — spec §2.4)
    if not os.path.exists(CITATION_REGISTRY_PATH):
        findings.append("verified-citations.json not initialized "
                        "(citations.seed_registry() creates and seeds it)")
    # batch pin, when a batch is named
    if batch_id is not None:
        try:
            load_registry_pin(batch_id)
        except FDepError as e:
            findings.append(str(e))
    return findings
