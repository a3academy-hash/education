"""Staging layout under .authoring-tmp/regen/ (BATCH_REGEN_SPEC §5.1).

Nothing is ever written to data/ or Supabase by this pipeline. Layout:

  .authoring-tmp/regen/
    _manifest.json                 run id, pins, batch->node map
    _reports/batch-<n>-report.json gen + validation + audit, pass/fail, cost
    <NODE-ID>/
      raw.json        verbatim model output (audit trail)
      node.json       schema-validated, normalized enriched node
      validation.json schema + taxonomy + solver check results
      audit.json      audit verdicts for sampled items
      status          PENDING | VALID | AUDIT_PASS | AUDIT_FAIL | QUARANTINE
"""

from __future__ import annotations

import json
from pathlib import Path

from . import config

STATUSES = ("PENDING", "VALID", "AUDIT_PASS", "AUDIT_FAIL", "QUARANTINE")

# Allowed transitions. None = no status file yet.
# PENDING -> VALID (passed §5.2) | QUARANTINE (F-SCHEMA / F-TAG existence)
# VALID   -> AUDIT_PASS | AUDIT_FAIL | QUARANTINE (late invalidation)
# AUDIT_FAIL -> PENDING (regen round, §6.4) | QUARANTINE (rounds exhausted)
_ALLOWED = {
    None: {"PENDING"},
    "PENDING": {"VALID", "QUARANTINE"},
    "VALID": {"AUDIT_PASS", "AUDIT_FAIL", "QUARANTINE"},
    "AUDIT_FAIL": {"PENDING", "QUARANTINE"},
    "AUDIT_PASS": set(),      # terminal for this pipeline (promotion is a
    "QUARANTINE": {"PENDING"},  # separate gated task); regen re-opens quarantine
}


class StatusTransitionError(RuntimeError):
    pass


class StagingArea:
    def __init__(self, root: Path | None = None):
        self.root = Path(root) if root else config.STAGING_ROOT
        self.reports_dir = self.root / "_reports"

    # -- run-level -----------------------------------------------------------

    def init_run(self, manifest: "config.BatchManifest") -> Path:
        self.root.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        path = self.root / "_manifest.json"
        path.write_text(json.dumps(manifest.to_json(), indent=1,
                                   ensure_ascii=False), encoding="utf-8")
        return path

    def load_manifest(self) -> "config.BatchManifest":
        d = json.loads((self.root / "_manifest.json").read_text(encoding="utf-8"))
        return config.BatchManifest.from_json(d)

    def write_batch_report(self, batch_n: int, report: dict) -> Path:
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        path = self.reports_dir / f"batch-{batch_n}-report.json"
        path.write_text(json.dumps(report, indent=1, ensure_ascii=False),
                        encoding="utf-8")
        return path

    def load_batch_reports(self) -> list[dict]:
        """Ordered by batch number (F-DRIFT trend input)."""
        if not self.reports_dir.exists():
            return []
        paths = sorted(
            self.reports_dir.glob("batch-*-report.json"),
            key=lambda p: int(p.stem.split("-")[1]),
        )
        return [json.loads(p.read_text(encoding="utf-8")) for p in paths]

    # -- node-level ----------------------------------------------------------

    def node_dir(self, node_id: str) -> Path:
        d = self.root / node_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _write_json(self, node_id: str, name: str, payload) -> Path:
        path = self.node_dir(node_id) / name
        path.write_text(json.dumps(payload, indent=1, ensure_ascii=False),
                        encoding="utf-8")
        return path

    def write_raw(self, node_id: str, raw) -> Path:
        return self._write_json(node_id, "raw.json", raw)

    def write_node(self, node_id: str, node_obj: dict) -> Path:
        return self._write_json(node_id, "node.json", node_obj)

    def write_validation(self, node_id: str, validation: dict) -> Path:
        return self._write_json(node_id, "validation.json", validation)

    def write_audit(self, node_id: str, audit: dict) -> Path:
        return self._write_json(node_id, "audit.json", audit)

    # -- status machine --------------------------------------------------------

    def get_status(self, node_id: str) -> str | None:
        path = self.node_dir(node_id) / "status"
        return path.read_text(encoding="utf-8").strip() if path.exists() else None

    def set_status(self, node_id: str, new_status: str) -> str:
        if new_status not in STATUSES:
            raise StatusTransitionError(f"unknown status {new_status!r}")
        current = self.get_status(node_id)
        if new_status not in _ALLOWED.get(current, set()):
            raise StatusTransitionError(
                f"{node_id}: illegal transition {current} -> {new_status}"
            )
        (self.node_dir(node_id) / "status").write_text(new_status, encoding="utf-8")
        return new_status
