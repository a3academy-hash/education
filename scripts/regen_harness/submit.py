"""Message Batches API layer — stdlib urllib only (no anthropic SDK: a new
dependency is a Matt gate, deliberately not taken).

TRIPLE GUARD (session gate: NO LIVE API CALLS):
  1. the caller must pass live=True (wired to a --live CLI flag),
  2. ANTHROPIC_API_KEY must be set in the environment,
  3. the caller must pass the explicit confirmation string.
Any guard missing -> GuardError before a single byte leaves the machine.
This module was never invoked live during the dry-run acceptance session.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from .failures import GuardError, detect_partial

API_BASE = "https://api.anthropic.com"
BATCHES_ENDPOINT = f"{API_BASE}/v1/messages/batches"
ANTHROPIC_VERSION = "2023-06-01"
CONFIRMATION_PHRASE = "CONFIRM-LIVE-BATCH-SPEND"

_POLL_INTERVAL_S = 60
_TERMINAL_STATUS = "ended"


def _guard(live: bool, confirm: str | None) -> str:
    problems = []
    if not live:
        problems.append("live=False (--live flag not set)")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        problems.append("ANTHROPIC_API_KEY not set")
    if confirm != CONFIRMATION_PHRASE:
        problems.append(
            f"confirmation arg missing/wrong (expected {CONFIRMATION_PHRASE!r})"
        )
    if problems:
        raise GuardError("live-API guard tripped: " + "; ".join(problems))
    return os.environ["ANTHROPIC_API_KEY"]


def _request(method: str, url: str, api_key: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {url} -> HTTP {e.code}: "
                           f"{e.read().decode('utf-8', 'replace')[:2000]}") from e


def create_batch(requests: list[dict], *, live: bool = False,
                 confirm: str | None = None) -> dict:
    """POST /v1/messages/batches with the rendered request entries."""
    api_key = _guard(live, confirm)
    return _request("POST", BATCHES_ENDPOINT, api_key,
                    {"requests": requests})


def poll_batch(batch_id: str, *, live: bool = False, confirm: str | None = None,
               interval_s: int = _POLL_INTERVAL_S,
               timeout_s: int = 24 * 3600) -> dict:
    """Poll processing_status until 'ended' (results typically <1h; 24h cap)."""
    api_key = _guard(live, confirm)
    deadline = time.monotonic() + timeout_s
    while True:
        batch = _request("GET", f"{BATCHES_ENDPOINT}/{batch_id}", api_key)
        if batch.get("processing_status") == _TERMINAL_STATUS:
            return batch
        if time.monotonic() >= deadline:
            raise TimeoutError(f"batch {batch_id} not ended within {timeout_s}s")
        time.sleep(interval_s)


def stream_results(batch: dict, *, live: bool = False,
                   confirm: str | None = None) -> tuple[dict[str, dict], list[str]]:
    """Fetch the .jsonl results -> (results keyed by custom_id, failed ids).

    Results arrive UNORDERED and are keyed back by custom_id — never by
    position (spec §1.1). `failed` lists errored/expired custom_ids
    (F-PARTIAL: resubmit ONLY those in a follow-up batch; succeeded nodes
    proceed independently, which is why this returns rather than raises)."""
    api_key = _guard(live, confirm)
    results_url = batch.get("results_url")
    if not results_url:
        raise RuntimeError(f"batch {batch.get('id')} has no results_url")
    req = urllib.request.Request(results_url, headers={
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
    })
    entries: list[dict] = []
    with urllib.request.urlopen(req, timeout=600) as resp:
        for line in resp.read().decode("utf-8").splitlines():
            if line.strip():
                entries.append(json.loads(line))
    keyed = {e["custom_id"]: e for e in entries}
    return keyed, detect_partial(entries)
