"""Pinned parameters (BATCH_REGEN_SPEC Appendix A) + frozen input paths.

Every model ID and pin used by the pipeline is defined ONCE here (spec
"Model configuration" table). Nothing else may inline a model string.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

# --- repo layout -----------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]

GRAPH_PATH = REPO_ROOT / "data" / "algebra1-graph.json"
ARCHETYPE_DIR = REPO_ROOT / "docs" / "archetypes"
ARCHETYPE_MANIFEST_MD = ARCHETYPE_DIR / "MANIFEST.md"
DERIVED_MANIFEST_PATH = ARCHETYPE_DIR / "manifest.json"
QUESTION_VOICE_PATH = REPO_ROOT / "docs" / "specs" / "QUESTION_VOICE.md"
TAXONOMY_PATH = REPO_ROOT / "docs" / "gold-node" / "misconception-taxonomy-slope.md"
GOLD_ITEMS_PATH = REPO_ROOT / "docs" / "gold-node" / "gold-node-items.json"

STAGING_ROOT = REPO_ROOT / ".authoring-tmp" / "regen"
DRYRUN_ROOT = STAGING_ROOT / "_dryrun"

# Optional frozen baseline ID list (superset check strengthens from count to
# identity when present). Gitignored working copy; absence degrades to count.
BASELINE_REGISTRY_IDS_PATH = REPO_ROOT / ".authoring-tmp" / "registry-163.json"

# --- Appendix A pins ---------------------------------------------------------

GENERATION_MODEL = "claude-opus-4-8"
GENERATION_MODEL_ALT = "claude-sonnet-5"  # cost-down pilot candidate (spec §1.1)
AUDIT_MODEL = "claude-fable-5"

MAX_TOKENS = 64_000
BATCH_SIZE = 10  # nodes per batch (human audit unit, spec §3.1)

# F-DEP pin: must equal MANIFEST.md §1's stated value (checked at start).
ARCHETYPE_LIBRARY_VERSION = "1.1.0"

# Rolling registry/graph baseline: every bank batch's pin must be a monotone
# superset of this state (spec §7 F-DEP, 2026-07-06 amendment).
BASELINE_GRAPH_VERSION = "1.12.0"
BASELINE_REGISTRY_COUNT = 163

# Audit sampling ramp (spec §6.1).
AUDIT_RATE_INITIAL = 0.10
AUDIT_RATE_STEPPED = 0.05
AUDIT_CLEAN_STREAK_FOR_STEPDOWN = 2

# Batch pass bar (spec §6.3).
BATCH_MAX_SAMPLED_FAILURE_RATE = 0.05
MAX_AUTO_REGEN_ROUNDS = 2

# Shared-prefix token budget the spec's cost model assumed (§3.2, ~23k).
# The dry run reports the measured estimate against this planning number.
PREFIX_TOKEN_BUDGET = 23_000

# The 9 archetype entry files that MUST exist (MANIFEST §2 / §8 check 2).
ARCHETYPE_ENTRY_FILES = (
    "archetype-scaffolded-multistep.md",
    "archetype-error-analysis.md",
    "archetype-predict-reveal.md",
    "archetype-interactive.md",
    "archetype-discrimination.md",
    "archetype-rubric-explanation.md",
    "archetype-embedded-check.md",
    "archetype-worked-example.md",
    "archetype-transfer-battery.md",
)

# Item-bank archetypes (the ones that appear in generated item banks).
ITEM_BANK_ARCHETYPES = (
    "scaffolded-multistep",
    "error-analysis",
    "predict-reveal",
    "interactive",
    "discrimination",
    "rubric-explanation",
)

SPORTS = (
    "baseball", "softball", "basketball", "soccer",
    "football", "volleyball", "neutral",
)

PHASES = ("P1", "P2", "P3")

# --- helpers over the pinned inputs -----------------------------------------


def parse_manifest_pinned_version(manifest_md_text: str) -> str | None:
    """Extract `archetypeLibraryVersion: X.Y.Z` from MANIFEST.md §1."""
    m = re.search(r"archetypeLibraryVersion:\s*([0-9]+\.[0-9]+\.[0-9]+)", manifest_md_text)
    return m.group(1) if m else None


def semver_tuple(v: str) -> tuple[int, ...]:
    return tuple(int(p) for p in v.split("."))


def load_graph() -> dict:
    return json.loads(GRAPH_PATH.read_text(encoding="utf-8"))


def load_derived_manifest() -> dict:
    """docs/archetypes/manifest.json — the gated derived build artifact
    (scripts/derive_manifest.py against MANIFEST.md v1.1.0).

    Returns the parsed document. Per-node manifest class rows live under
    ["nodes"][<node-id>] and carry archetypeQuotas / enrichedTotal / class /
    phaseBands / splitPreemptively (the shape the batch payload renders).
    ALG-L06 is deliberately absent: gold reference, frozen, never
    regenerated (["excludedNodes"])."""
    return json.loads(DERIVED_MANIFEST_PATH.read_text(encoding="utf-8"))


def graph_version(graph: dict) -> str:
    return graph["schema"]["version"]


def registry_ids(graph: dict) -> set[str]:
    return {e["id"] for e in graph["misconceptionRegistry"]}


def load_baseline_registry_ids() -> set[str] | None:
    """Frozen 163-entry baseline ID list, if the working copy carries it."""
    if not BASELINE_REGISTRY_IDS_PATH.exists():
        return None
    data = json.loads(BASELINE_REGISTRY_IDS_PATH.read_text(encoding="utf-8"))
    if isinstance(data, list):
        ids = {e["id"] if isinstance(e, dict) else e for e in data}
    elif isinstance(data, dict) and "misconceptionRegistry" in data:
        ids = {e["id"] for e in data["misconceptionRegistry"]}
    else:
        return None
    return ids


def git_commit_pin(path: Path) -> tuple[str | None, bool]:
    """(last commit hash touching `path`, working-tree-clean?) — the
    voice-slice source pin recorded at assembly. (None, _) if git fails."""
    try:
        rel = path.resolve().relative_to(REPO_ROOT).as_posix()
        commit = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "log", "-n", "1", "--format=%H", "--", rel],
            capture_output=True, text=True, check=True, timeout=30,
        ).stdout.strip() or None
        dirty = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "status", "--porcelain", "--", rel],
            capture_output=True, text=True, check=True, timeout=30,
        ).stdout.strip()
        return commit, dirty == ""
    except Exception:
        return None, False


# --- run/batch manifest ------------------------------------------------------


@dataclass
class BatchManifest:
    """The batch's `_manifest.json` — carries the rolling registry/graph pin
    (spec §7 F-DEP amendment: pinned per bank batch, monotone superset of
    163@1.12.0)."""

    run_id: str
    generation_model: str
    audit_model: str
    max_tokens: int
    archetype_library_version: str
    graph_version_pin: str          # rolling pin, >= BASELINE_GRAPH_VERSION
    registry_entry_count_pin: int   # rolling pin, >= BASELINE_REGISTRY_COUNT
    voice_slice_source: str         # repo-relative path
    voice_slice_commit: str | None  # pinned commit hash (F-DEP if None)
    batch_nodes: list[str]
    dry_run: bool = False
    notes: dict = field(default_factory=dict)

    def to_json(self) -> dict:
        return {
            "runId": self.run_id,
            "generationModel": self.generation_model,
            "auditModel": self.audit_model,
            "maxTokens": self.max_tokens,
            "archetypeLibraryVersion": self.archetype_library_version,
            "registryPin": {
                "graphVersion": self.graph_version_pin,
                "entryCount": self.registry_entry_count_pin,
                "baseline": f"{BASELINE_REGISTRY_COUNT}@{BASELINE_GRAPH_VERSION}",
            },
            "voiceSlice": {
                "source": self.voice_slice_source,
                "commit": self.voice_slice_commit,
                "sections": ["§10", "§3", "§9"],
            },
            "batchNodes": self.batch_nodes,
            "dryRun": self.dry_run,
            "notes": self.notes,
        }

    @classmethod
    def from_json(cls, d: dict) -> "BatchManifest":
        return cls(
            run_id=d["runId"],
            generation_model=d["generationModel"],
            audit_model=d["auditModel"],
            max_tokens=d["maxTokens"],
            archetype_library_version=d["archetypeLibraryVersion"],
            graph_version_pin=d["registryPin"]["graphVersion"],
            registry_entry_count_pin=d["registryPin"]["entryCount"],
            voice_slice_source=d["voiceSlice"]["source"],
            voice_slice_commit=d["voiceSlice"].get("commit"),
            batch_nodes=list(d["batchNodes"]),
            dry_run=bool(d.get("dryRun", False)),
            notes=d.get("notes", {}),
        )


def estimate_tokens(text: str) -> int:
    """Planning heuristic (chars/4). Actuals come from response.usage."""
    return len(text) // 4
