"""Cached-prefix assembly (BATCH_REGEN_SPEC §4.1).

Render order (stable-before-volatile, per shared/prompt-caching.md):
  system prompt -> output schema -> taxonomy-keying contract ->
  registry slice -> VOICE-CONTRACT SLICE (§10+§3+§9 of QUESTION_VOICE.md) ->
  archetype templates, with the cache_control breakpoint on the LAST shared
  block. The per-node volatile payload (payload.py) sits after the breakpoint.

HARD-STOP (spec §7 F-DEP, folded voice patch §1): a missing/empty voice
slice, or a voice slice without a pinned commit hash, raises FDepError and
the prefix REFUSES to render.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from . import config
from .failures import FDepError

# --- frozen system prompt (spec §4.1 row 1) ----------------------------------

SYSTEM_PROMPT = """\
You are the item-bank author for A3 Virtual School's Algebra 1 adaptive \
platform, regenerating one curriculum node's lesson-adjacent item bank to \
the gold-node (ALG-L06) quality bar. Audience: middle-school students \
(11-14). Output is accreditation evidence: every answer must be \
mathematically correct and every wrong-answer trap must be produced by a \
named misconception-registry error path.

Hard rules (no exceptions):
- Three-phase progression: P1 items use the node's sport context; P2 items \
blend sport context with academic notation; P3 items are fully neutral \
academic. Mastery requires demonstrated P3 transfer, so P3 is never empty \
and no sport skin ever appears in a P3 item.
- Structural-skin rule: the interest context IS the math. Every scenario \
quantity you introduce must be consumed by the mathematics; no seductive- \
detail wrappers, no padding, no meta-labels or authoring-speak in \
student-visible text.
- Every item carries a 3-rung hint ladder (root probe -> targeted counter \
-> worked micro-step); a hint never reveals the answer.
- Every misconceptionMap entry names a trigger (the wrong answer a specific \
error path produces), the registry tag, and the signature (why that error \
path yields exactly that trigger, with the arming condition).
- Copy the node's prereqs and standards codes verbatim; never invent \
standards; skillId equals the node id on every item.
- Keys against the pinned misconception registry only: a tag that is not in \
the injected registry slice must not appear.
- Follow the voice contract exactly (instruction register for P1/P2, \
assessment register for standalone P3; context -> data -> ask; units named \
in the ask for rate items).
Respond with a single JSON object conforming to the provided output \
schema. No prose outside the JSON.
"""

# --- section extraction ------------------------------------------------------


def _extract_section(md: str, heading_pattern: str) -> str | None:
    """Text of a `## N. ...` section up to the next `## ` heading (exclusive).

    heading_pattern matches the full heading line after '## '.
    """
    m = re.search(rf"^## {heading_pattern}.*$", md, re.M)
    if not m:
        return None
    start = m.start()
    nxt = re.search(r"^## ", md[m.end():], re.M)
    end = m.end() + nxt.start() if nxt else len(md)
    section = md[start:end].strip()
    # strip a trailing horizontal rule left dangling before the next heading
    section = re.sub(r"\n-{3,}\s*$", "", section).strip()
    return section or None


def extract_voice_slice(question_voice_md: str) -> str:
    """QUESTION_VOICE §10 (register contract) + §3 (ask-phrasing catalog) +
    §9 (register-fit table) — the slice, not the whole file (spec §4.1).

    HARD-STOP: any of the three sections missing/empty -> FDepError.
    """
    sections = {
        "§10 voice contract": _extract_section(question_voice_md, r"10\.\s+Voice contract"),
        "§3 ask-phrasing catalog": _extract_section(question_voice_md, r"3\.\s+Ask phrasing"),
        "§9 register-fit table": _extract_section(question_voice_md, r"9\.\s+Divergence table"),
    }
    missing = [name for name, text in sections.items() if not text]
    if missing:
        raise FDepError([
            f"voice-contract slice incomplete — missing/empty: {', '.join(missing)} "
            "(QUESTION_VOICE.md §10/§3/§9). Refusing to render the prefix."
        ])
    return (
        "## VOICE CONTRACT (binding — QUESTION_VOICE.md §10, §3, §9)\n\n"
        + sections["§10 voice contract"]
        + "\n\n"
        + sections["§3 ask-phrasing catalog"]
        + "\n\n"
        + sections["§9 register-fit table"]
    )


def extract_taxonomy_keying_contract(taxonomy_md: str) -> str:
    """§3 of the slope taxonomy doc — the copy-to-all-nodes keying rules
    (hint ladder / error-analysis / rubric-annotation / evidence semantics)."""
    section = _extract_section(taxonomy_md, r"3\.\s+Keying contract")
    if not section:
        raise FDepError([
            "taxonomy-keying contract (§3 of misconception-taxonomy-slope.md) "
            "missing/empty — cannot render the prefix."
        ])
    return section


# --- registry slice (spec §4.1 row 5: shared per domain-cluster) -------------


def build_registry_slice(graph: dict, domains: list[str],
                         extra_tags: set[str] | None = None) -> str:
    """Legal tag vocabulary block for the batch's domain cluster.

    Deterministic slice = union of misconceptionTags over all nodes in the
    batch's domains, plus `extra_tags` (tags carried by the injected gold
    exemplars — registry-level taxonomy additions are not always echoed in
    node.misconceptionTags, so exemplar tags are unioned in explicitly).
    Host-side F-TAG validation runs against the FULL pinned registry;
    this slice only bounds the generator's working vocabulary.
    """
    wanted: set[str] = set(extra_tags or ())
    for node in graph["nodes"]:
        if node.get("domain") in domains:
            wanted.update(node.get("misconceptionTags", []))
    entries = [e for e in graph["misconceptionRegistry"] if e["id"] in wanted]
    entries.sort(key=lambda e: e["id"])
    lines = [
        "## MISCONCEPTION REGISTRY SLICE (legal tag vocabulary — "
        f"domains: {', '.join(domains)}; {len(entries)} entries)",
        "Every misconceptionMap tag and rubric counteredEntryId MUST be one "
        "of these ids. Using any other tag fails validation (F-TAG).",
        "",
    ]
    lines += [f"- `{e['id']}` — {e['description']}" for e in entries]
    return "\n".join(lines)


# --- archetype templates ------------------------------------------------------

_ARCHETYPE_FILE = {
    "scaffolded-multistep": "archetype-scaffolded-multistep.md",
    "error-analysis": "archetype-error-analysis.md",
    "predict-reveal": "archetype-predict-reveal.md",
    "interactive": "archetype-interactive.md",
    "discrimination": "archetype-discrimination.md",
    "rubric-explanation": "archetype-rubric-explanation.md",
    "embedded-check": "archetype-embedded-check.md",
    "worked-example": "archetype-worked-example.md",
    "transfer-battery": "archetype-transfer-battery.md",
}


def build_archetype_block(archetype_ids: list[str]) -> str:
    parts = [
        "## ARCHETYPE TEMPLATES (the item molds to fill — library v"
        + config.ARCHETYPE_LIBRARY_VERSION + ")"
    ]
    for aid in archetype_ids:
        fname = _ARCHETYPE_FILE.get(aid)
        if fname is None:
            raise FDepError([f"unknown archetype id {aid!r} — no entry file mapping"])
        path = config.ARCHETYPE_DIR / fname
        if not path.exists():
            raise FDepError([f"archetype entry file missing: {fname}"])
        parts.append(f"\n### ARCHETYPE: {aid}\n\n" + path.read_text(encoding="utf-8"))
    return "\n".join(parts)


# --- assembly -----------------------------------------------------------------


@dataclass
class AssembledPrefix:
    blocks: list[dict]              # system content blocks (API-ready)
    voice_slice_commit: str         # the recorded pin
    token_estimate: int             # chars/4 planning estimate
    breakdown: dict[str, int]       # per-block token estimates


def assemble_prefix(
    graph: dict,
    domains: list[str],
    archetype_ids: list[str],
    output_schema_json: str,
    exemplar_tags: set[str] | None = None,
    question_voice_md: str | None = None,
    voice_commit_override: tuple[str | None, bool] | None = None,
) -> AssembledPrefix:
    """Build the shared cached prefix for one batch.

    `question_voice_md` / `voice_commit_override` exist so the dry run can
    exercise the withheld-slice and unpinned-commit hard stops; production
    callers pass neither and get the real pinned file.

    Raises FDepError (hard stop) if the voice slice is missing/empty or its
    source is not commit-pinned (dirty working tree or no commit).
    """
    if question_voice_md is None:
        if not config.QUESTION_VOICE_PATH.exists():
            raise FDepError([f"voice-contract source missing: {config.QUESTION_VOICE_PATH}"])
        question_voice_md = config.QUESTION_VOICE_PATH.read_text(encoding="utf-8")

    # voice slice first: the hard stop must fire before any rendering work
    voice_block = extract_voice_slice(question_voice_md)

    commit, clean = (
        voice_commit_override
        if voice_commit_override is not None
        else config.git_commit_pin(config.QUESTION_VOICE_PATH)
    )
    if commit is None:
        raise FDepError([
            "voice-contract slice source has NO pinned commit hash — refusing "
            "to render (same F-DEP class as an un-pinned archetype version)."
        ])
    if not clean:
        raise FDepError([
            "QUESTION_VOICE.md has uncommitted modifications — the voice slice "
            "would not match its recorded commit pin. Commit or revert first."
        ])

    taxonomy_md = config.TAXONOMY_PATH.read_text(encoding="utf-8")

    named_blocks = [
        ("system", SYSTEM_PROMPT),
        ("output-schema",
         "## OUTPUT SCHEMA (strict — your entire response is one JSON object "
         "valid against this)\n\n```json\n" + output_schema_json + "\n```"),
        ("taxonomy-keying-contract",
         "## TAXONOMY KEYING CONTRACT (copy-to-all-nodes rules)\n\n"
         + extract_taxonomy_keying_contract(taxonomy_md)),
        ("registry-slice",
         build_registry_slice(graph, domains, exemplar_tags)),
        ("voice-contract-slice", voice_block),
        ("archetype-templates", build_archetype_block(archetype_ids)),
    ]

    blocks: list[dict] = []
    breakdown: dict[str, int] = {}
    for name, text in named_blocks:
        blocks.append({"type": "text", "text": text})
        breakdown[name] = config.estimate_tokens(text)
    # cache_control breakpoint on the LAST shared block (spec §4.1)
    blocks[-1]["cache_control"] = {"type": "ephemeral"}

    return AssembledPrefix(
        blocks=blocks,
        voice_slice_commit=commit,
        token_estimate=sum(breakdown.values()),
        breakdown=breakdown,
    )
