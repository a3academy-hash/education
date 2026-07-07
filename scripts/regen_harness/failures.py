"""Failure modes F-* (BATCH_REGEN_SPEC §7): detection + handling policy.

F-SCHEMA   quarantine + regenerate
F-TAG      existence -> quarantine; semantic -> audit-fail path (§6.4)
F-OVERFLOW split by phase (manifest splitPreemptively), merge host-side,
           per-fragment item-count validation BEFORE merge
F-PARTIAL  resubmit errored/expired custom_ids only; never re-key by position
F-DEP      precondition hard stop at harness start
F-DRIFT    pass-rate trend degradation across batch reports -> halt
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from . import config


class HarnessError(Exception):
    """Base class for all F-* failures."""


class FSchemaError(HarnessError):
    """F-SCHEMA: schema-invalid output. Quarantine; regenerate."""


class FTagError(HarnessError):
    """F-TAG (existence class): unknown misconception tag. Quarantine."""


class FOverflowError(HarnessError):
    """F-OVERFLOW: stop_reason=max_tokens or truncated JSON."""


class FPartialError(HarnessError):
    """F-PARTIAL: some custom_ids errored/expired."""

    def __init__(self, failed_custom_ids: list[str]):
        super().__init__(f"partial batch failure: {failed_custom_ids}")
        self.failed_custom_ids = failed_custom_ids


class FDepError(HarnessError):
    """F-DEP: precondition failure. HARD STOP — the pipeline refuses to run."""

    def __init__(self, problems: list[str]):
        super().__init__("F-DEP hard stop:\n  - " + "\n  - ".join(problems))
        self.problems = problems


class FDriftHalt(HarnessError):
    """F-DRIFT: audit pass-rate degraded across >=2 batches. Halt + re-pin."""


class GuardError(HarnessError):
    """Live-API guard tripped (submit.py). Not an F-* class; a session gate."""


# --- F-DEP: precondition checks at harness start (spec §7, MANIFEST §8) -----


def precondition_check(manifest: "config.BatchManifest") -> list[str]:
    """Returns the list of F-DEP problems (empty == all preconditions hold).

    Checks (MANIFEST §8 subset implementable host-side without the derived
    manifest.json, which is itself a gated build artifact):
      1. archetype pin: config pin == MANIFEST.md §1 value == batch pin
      2. all 9 archetype entry files present
      3. registry/graph rolling pin: batch pin >= baseline (monotone),
         live graph version == batch pin, entry count >= pinned count >=
         baseline 163; identity superset when the frozen baseline ID list
         is available
      4. voice-contract slice: source present, §10/§3/§9 extractable and
         non-empty, commit-pinned (prefix.py re-enforces at render)
      5. batch manifest structural sanity (nodes listed, models pinned)
    """
    problems: list[str] = []

    # 1-2. archetype library pin + entry files
    if not config.ARCHETYPE_MANIFEST_MD.exists():
        problems.append(f"archetype MANIFEST.md missing: {config.ARCHETYPE_MANIFEST_MD}")
    else:
        stated = config.parse_manifest_pinned_version(
            config.ARCHETYPE_MANIFEST_MD.read_text(encoding="utf-8")
        )
        if stated is None:
            problems.append("MANIFEST.md carries no archetypeLibraryVersion pin")
        elif stated != config.ARCHETYPE_LIBRARY_VERSION:
            problems.append(
                f"archetype version pin mismatch: config={config.ARCHETYPE_LIBRARY_VERSION} "
                f"MANIFEST.md={stated}"
            )
    if manifest.archetype_library_version != config.ARCHETYPE_LIBRARY_VERSION:
        problems.append(
            f"batch manifest archetype pin {manifest.archetype_library_version!r} "
            f"!= config pin {config.ARCHETYPE_LIBRARY_VERSION!r}"
        )
    for fname in config.ARCHETYPE_ENTRY_FILES:
        if not (config.ARCHETYPE_DIR / fname).exists():
            problems.append(f"archetype entry file missing: {fname}")

    # 3. rolling registry/graph pin (monotone superset of 163@1.12.0)
    if not config.GRAPH_PATH.exists():
        problems.append(f"graph missing: {config.GRAPH_PATH}")
        return problems  # nothing below is checkable
    graph = config.load_graph()
    live_version = config.graph_version(graph)
    pin = manifest.graph_version_pin
    if config.semver_tuple(pin) < config.semver_tuple(config.BASELINE_GRAPH_VERSION):
        problems.append(
            f"batch graph pin {pin} predates baseline {config.BASELINE_GRAPH_VERSION} "
            "(pre-diff registry — F-DEP)"
        )
    if live_version != pin:
        problems.append(
            f"live graph version {live_version} != batch pin {pin} "
            "(batch renders only against its pinned application state)"
        )
    live_ids = config.registry_ids(graph)
    if manifest.registry_entry_count_pin < config.BASELINE_REGISTRY_COUNT:
        problems.append(
            f"batch registry pin ({manifest.registry_entry_count_pin} entries) below "
            f"baseline {config.BASELINE_REGISTRY_COUNT}"
        )
    if len(live_ids) < manifest.registry_entry_count_pin:
        problems.append(
            f"live registry has {len(live_ids)} entries < pinned {manifest.registry_entry_count_pin}"
        )
    baseline_ids = config.load_baseline_registry_ids()
    if baseline_ids is not None:
        missing = sorted(baseline_ids - live_ids)
        if missing:
            problems.append(
                f"live registry is NOT a superset of the {config.BASELINE_REGISTRY_COUNT}-entry "
                f"baseline; missing: {missing[:5]}{'...' if len(missing) > 5 else ''}"
            )

    # 4. voice-contract slice (prefix.py hard-stops again at render time)
    from . import prefix  # late import to avoid a cycle

    if not config.QUESTION_VOICE_PATH.exists():
        problems.append(f"voice-contract source missing: {config.QUESTION_VOICE_PATH}")
    else:
        try:
            prefix.extract_voice_slice(
                config.QUESTION_VOICE_PATH.read_text(encoding="utf-8")
            )
        except FDepError as e:
            problems.extend(e.problems)
    if manifest.voice_slice_commit is None:
        problems.append(
            "voice-contract slice is UNPINNED (no commit hash recorded) — "
            "same F-DEP class as an un-pinned archetype version"
        )

    # 5. batch manifest sanity
    if not manifest.batch_nodes:
        problems.append("batch manifest lists no nodes")
    if manifest.generation_model != config.GENERATION_MODEL and \
            manifest.generation_model != config.GENERATION_MODEL_ALT:
        problems.append(f"unpinned generation model {manifest.generation_model!r}")
    if manifest.audit_model != config.AUDIT_MODEL:
        problems.append(f"unpinned audit model {manifest.audit_model!r}")

    return problems


def require_preconditions(manifest: "config.BatchManifest") -> None:
    problems = precondition_check(manifest)
    if problems:
        raise FDepError(problems)


# --- F-OVERFLOW: phase split + host-side merge -------------------------------


def is_overflow(result_message: dict) -> bool:
    """stop_reason == max_tokens, or the text payload is truncated JSON."""
    if result_message.get("stop_reason") == "max_tokens":
        return True
    for block in result_message.get("content", []):
        if block.get("type") == "text":
            try:
                json.loads(block.get("text", ""))
            except (json.JSONDecodeError, TypeError):
                return True
    return False


def split_custom_ids(node_id: str) -> list[str]:
    """Phase-split custom_ids (the split unit is PHASE — MANIFEST §9)."""
    return [f"{node_id}::{p}" for p in config.PHASES]


def parse_custom_id(custom_id: str) -> tuple[str, str | None]:
    """-> (node_id, phase-or-None)."""
    if "::" in custom_id:
        node, phase = custom_id.split("::", 1)
        return node, phase
    return custom_id, None


@dataclass
class FragmentExpectation:
    """Per-fragment item-count floor, validated BEFORE merge (MANIFEST §9:
    agents demonstrably under-produce P1/P2 in fragments — batch-6 record)."""

    phase: str
    min_items: int


def validate_fragments_before_merge(
    fragments: dict[str, dict], expectations: list[FragmentExpectation]
) -> list[str]:
    """fragments: phase -> fragment node-object (with 'items'). Returns
    problems; non-empty means the merge MUST NOT proceed."""
    problems = []
    by_phase = {e.phase: e for e in expectations}
    for phase in config.PHASES:
        if phase not in fragments:
            problems.append(f"missing fragment for {phase}")
            continue
        items = fragments[phase].get("items", [])
        wrong = [i.get("id") for i in items if i.get("phase") != phase]
        if wrong:
            problems.append(f"fragment {phase} carries off-phase items: {wrong}")
        exp = by_phase.get(phase)
        if exp and len(items) < exp.min_items:
            problems.append(
                f"fragment {phase} under-produced: {len(items)} < {exp.min_items}"
            )
    return problems


def merge_fragments(fragments: dict[str, dict],
                    expectations: list[FragmentExpectation]) -> dict:
    """Merge P1/P2/P3 fragments host-side. Whole-bank properties are then
    validated ONLY on the merged node (validate.py), never per fragment."""
    problems = validate_fragments_before_merge(fragments, expectations)
    if problems:
        raise FOverflowError(
            "fragment validation failed before merge:\n  - " + "\n  - ".join(problems)
        )
    # node-level fields (nodeId/prereqs/standards/...) are taken from the P1
    # fragment; downstream structural_check vs the source graph is the
    # divergence safety net.
    base = json.loads(json.dumps(fragments[config.PHASES[0]]))  # deep copy
    base["items"] = []
    for phase in config.PHASES:
        base["items"].extend(fragments[phase].get("items", []))
    merged_we = []
    for phase in config.PHASES:
        merged_we.extend(fragments[phase].get("workedExamples", []) or [])
    if merged_we:
        base["workedExamples"] = merged_we
    return base


# --- F-PARTIAL ---------------------------------------------------------------


def detect_partial(results: list[dict]) -> list[str]:
    """Batch result entries -> custom_ids whose .result.type errored/expired.
    Succeeded nodes proceed independently; resubmit ONLY these ids."""
    return [
        r["custom_id"]
        for r in results
        if r.get("result", {}).get("type") in ("errored", "expired")
    ]


# --- F-DRIFT -----------------------------------------------------------------


def drift_check(batch_reports: list[dict]) -> tuple[bool, str]:
    """Pass-rate trend across `_reports/batch-<n>-report.json` payloads
    (each carrying audit.passRate in [0,1]). Degradation across >=2
    consecutive batch-over-batch drops -> halt (re-pin exemplars /
    re-pilot model choice before continuing)."""
    rates = [
        r["audit"]["passRate"]
        for r in batch_reports
        if r.get("audit", {}).get("passRate") is not None
    ]
    if len(rates) < 3:
        return False, f"insufficient history ({len(rates)} batches with audit data)"
    drops = 0
    for prev, cur in zip(rates[-3:], rates[-2:]):
        if cur < prev:
            drops += 1
        else:
            drops = 0
    if drops >= 2:
        return True, (
            f"pass-rate degraded across {drops + 1} consecutive batches "
            f"({rates[-3:]}) — F-DRIFT halt"
        )
    return False, f"no degradation trend (last rates: {rates[-3:]})"
