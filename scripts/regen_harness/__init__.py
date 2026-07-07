"""Batch regeneration harness (BATCH_REGEN_SPEC.md).

Pure staging tool: reads frozen inputs, renders batch requests, validates
outputs host-side, stages under .authoring-tmp/regen/. Never writes to
data/ or Supabase. Live API calls are triple-guarded (submit.py) and were
not made during the dry-run acceptance session.

Python 3.12, stdlib only (urllib against /v1/messages/batches; no SDK —
a new dependency is a Matt gate, deliberately not taken).
"""
