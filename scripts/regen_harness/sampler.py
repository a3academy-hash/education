"""Stratified audit sampling with the ramped rate (BATCH_REGEN_SPEC §6.1).

Rate: 10% for the first two batches; 5% only after two CONSECUTIVE clean
batches (clean = 0 fatal AND 0 major, §6.3); ANY non-clean batch resets the
streak and the rate returns to 10%.

Strata: node x itemForm. At either rate the sample spans every node and
every item form present in the batch (>=1 sample per stratum) — no node and
no form is unaudited even at 5%.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from . import config


def rate_for_batch(batch_index: int, prior_clean_flags: list[bool]) -> float:
    """Sampling rate for batch `batch_index` (0-based) given the clean/not
    verdicts of all PRIOR batches (order matters — consecutiveness)."""
    if batch_index < 2:
        return config.AUDIT_RATE_INITIAL
    streak = 0
    for clean in prior_clean_flags:
        streak = streak + 1 if clean else 0     # any major-or-worse resets
    if streak >= config.AUDIT_CLEAN_STREAK_FOR_STEPDOWN:
        return config.AUDIT_RATE_STEPPED
    return config.AUDIT_RATE_INITIAL


@dataclass(frozen=True)
class SampleUnit:
    node_id: str
    item_form: str   # archetype / item form (closed-form strata use archetype)
    item_id: str


def stratify(units: list[SampleUnit]) -> dict[tuple[str, str], list[SampleUnit]]:
    strata: dict[tuple[str, str], list[SampleUnit]] = {}
    for u in units:
        strata.setdefault((u.node_id, u.item_form), []).append(u)
    return strata


def stratified_sample(units: list[SampleUnit], rate: float,
                      seed: int = 0) -> list[SampleUnit]:
    """ceil(rate x N) samples, >=1 per (node, form) stratum guaranteed.
    When the stratum count exceeds the rate target, the guarantee dominates
    (the sample grows past the rate rather than skipping a stratum).
    Deterministic under `seed` (replayability)."""
    if not units:
        return []
    rng = random.Random(seed)
    strata = stratify(units)
    target = max(math.ceil(rate * len(units)), len(strata))

    picked: list[SampleUnit] = []
    remaining: list[SampleUnit] = []
    for key in sorted(strata):                       # >=1 per stratum
        pool = list(strata[key])
        rng.shuffle(pool)
        picked.append(pool[0])
        remaining.extend(pool[1:])

    rng.shuffle(remaining)                            # proportional fill
    picked.extend(remaining[: max(0, target - len(picked))])
    return picked


def units_from_node(node_id: str, items: list[dict]) -> list[SampleUnit]:
    return [
        SampleUnit(node_id=node_id,
                   item_form=i.get("archetype", "closed-form"),
                   item_id=i.get("id", f"{node_id}-item-{n}"))
        for n, i in enumerate(items)
    ]
