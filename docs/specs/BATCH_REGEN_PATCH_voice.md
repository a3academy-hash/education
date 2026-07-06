# BATCH_REGEN_PATCH_voice — voice-contract addendum to BATCH_REGEN_SPEC

**Status:** PATCH NOTE (design-only; no code, no data writes, no Supabase writes authorized).
**Patches:** `docs/specs/BATCH_REGEN_SPEC.md` @ `13ec37c` on the unmerged remote branch
`claude/batch-regen-runtime-tutor-specs-u79i6t`. That spec is not on this branch, so this
patch lives standalone; **fold it into BATCH_REGEN_SPEC.md §4/§5/§6 when the branch merges.**
Until then it is the authoritative voice addendum to the regeneration pipeline design.
**Basis:** `docs/specs/QUESTION_VOICE.md` (committed `e7b3d23`, ADJUSTs re-measured in §11.1
@ `8f13ffd`) — the empirically measured voice contract. All bands below cite measured values,
not vibes. Gates unchanged: this patch adds inputs and audit criteria; every human/agent gate
in BATCH_REGEN_SPEC §8 stands as written.

---

## 1. Patch to §4.1 — QUESTION_VOICE joins the cached shared prefix

Add one row to the injection table:

| Injected | Source | Role | Cache tier |
|---|---|---|---|
| Voice contract slice: QUESTION_VOICE §10 (register contract) + §3 (ask-phrasing catalog) + §9 (register-fit table) | `docs/specs/QUESTION_VOICE.md`, pinned at commit | Binds stem architecture, instruction-vs-assessment register selection, ask phrasing, number realism, reading level | **Shared (cached)** |

Placement: inside the shared cached block, after the taxonomy-keying contract and before the
archetype templates (stable-before-volatile ordering unchanged; the `cache_control` breakpoint
still sits on the last shared block).

Inject the **slice**, not the whole file: §10 + §3 + §9 ≈ 3k tokens. The corpus-measurement
sections (§1–§8, §11) are evidence, not instructions — the generator needs the contract, not
the archaeology. (License note: the spec file contains only <15-word measure-only fragments
and attributed CC BY quotes, so injection poses no licensing issue regardless.)

§4.3 budget impact: shared prefix ~20k → **~23k tokens**; amortized ≈ +0.3k effective
input/node ≈ **+$0.001/node** at Batch pricing — noise against the $0.55/node estimate.
§3.2 table's "Input — shared, cached" row reads ~23k after this patch.

F-DEP addition (§7): the harness precondition check MUST verify the voice-contract slice is
present in the rendered shared prefix and pinned to a commit hash. Missing/unpinned →
**hard stop**, same class as an un-pinned archetype version.

## 2. Patch to §4.2 — archetype-library required interface gains voice fields

Each archetype entry MUST additionally provide (append to the §4.2 MUST list):

- `voiceRegister`: `instruction` | `assessment` | `per-phase`. Resolution rule when
  `per-phase`: P1/P2 instantiations → instruction register; **standalone** P3 items →
  assessment register; P3-phase *scaffolded practice* items → instruction-register part rules
  under P3 phase discipline (neutral context) — exactly the QUESTION_VOICE §10 scoping
  sentence.
- `askPatterns`: the allowed final-ask frames for this archetype, drawn from the
  QUESTION_VOICE §3 catalog (e.g. `what-is-value`, `which-select`, `meaning/interpretation`,
  `write/create`, `how-many/much`). Mechanically checkable: the generated item's final ask
  must match one declared pattern. Archetypes with novel frames that have no corpus analog
  (error-analysis peer-diagnosis, predict-reveal, interactive builds — QUESTION_VOICE §11
  row 12) declare their own frame strings here; declaring is what makes drift detectable.
- `stemBand`: word-count band for the student-visible stem. Defaults (an archetype may
  narrow, never widen): instruction register **30–60 words**; assessment register
  **≤48 words** (SAT p75). Minimal-stem P3 forms (bare-points) may set a lower bound of 0 —
  short is compliant, long is not.
- `interpretationSlot`: `true` if this archetype carries a meaning-in-context ask (capstone
  part or whole-item). The manifest uses this to satisfy the node-level interpretation floors
  in §3 below — `manifest.json` MUST select, per node, an archetype mix whose
  `interpretationSlot` coverage can meet the floors.

## 3. Voice-conformance audit criteria (new; classed **major**, never fatal)

Two layers, mirroring the existing split between §5.2 host-side validation (deterministic,
every item) and §6.2 model audit (judgment, sampled).

### 3.1 §5.2 addition — step 5, deterministic voice validation (per node, host-side)

Computed by the harness with the QUESTION_VOICE instrument (same word/sentence/ask-bucket
definitions; the pipeline under `.authoring-tmp/voice-corpus/tools/analyze.py` is the
reference implementation). Bands cite QUESTION_VOICE §10 (contract) and §11.1 (post-ADJUST
measured values on the gold node — the bar generated nodes are held to):

| Check | Band | Empirical anchor (§11.1 post-adjust / corpus) |
|---|---|---|
| Stem-length band conformance | ≥90% of a node's items inside their register's `stemBand` | gold items median 35 words (27.5–42) inside the 30–60 instruction band; SAT p75 = 48 |
| Interpretation-ratio floor — instruction items | ≥25% of the node's instruction-register items carry a meaning-in-context ask **anywhere** in the item | gold post-adjust 26.7% anywhere; IM 29% |
| Interpretation-ratio floor — assessment/P3 bank | ≥13% of standalone-P3 items ask interpretation as the **final** ask | SAT 13% (the operative anchor). Gold's §11.1 "20% final" is an all-items figure — its enriched standalone-P3 slice carries no interpretation-final ask; the floor binds the whole bank and is satisfied by core-bank scheduling (MANIFEST §7) |
| Ask-phrasing catalog conformance | 100% of items: final ask matches one of the item's archetype `askPatterns`; ask lands **last** (context → data → ask) in 100% of items | universal corpus invariant (QUESTION_VOICE §1) |
| Interrogative close — standalone P3 | ≥90% end with "?" | SAT 93%; gold 73% overall only because interactive imperatives are archetype-declared exceptions |
| Realistic-values share — standalone P3 | 30–40% of the node's standalone-P3 items non-clean (decimal-bearing student-visible data, tractable path); binds the whole-bank standalone-P3 slice; construct-integrity exemptions (integer-snap interactives, boundary-construct clean numbers) per the archetype entries | SAT 30% (operative); gold post-ADJUST 2/5 of P3 enriched items (§11.1 row 10's own denominator) |

**Severity: `major`.** A violation does NOT quarantine (that is F-SCHEMA/F-TAG territory) and
does NOT fail the batch by itself — it is emitted as a `major` finding into the batch report,
which per §6.3 (a) denies the batch *clean* status, holding §6.1 sampling at 10%, and
(b) routes the node through the §6.4 regeneration loop with the violated bands injected as
negative constraints.

### 3.2 §6.2 addition — `voiceConformant` check in the audit JSON

Add to the forced-structure `checks` object:

```
"voiceConformant": "bool"   // MAJOR-CLASS CEILING. Register matches phase per the archetype's
                            // voiceRegister rule; context -> data -> ask ordering; no
                            // padding/meta-labels/authoring-speak in student text; units named
                            // in the ask for rate items; scenario data actually consumed by
                            // the math (structural-skin rule, voice edition). If false,
                            // severity is at least "major" and at most "major" on this check
                            // alone - voice NEVER escalates to fatal.
```

**Why major and not fatal (explicit):** §6.3 reserves `fatal` for integrity — wrong math,
mis-routing tags, answer/work mismatch, child-safety framing. Voice drift degrades quality,
not correctness or safety. Classing it `major` still gives it teeth: one `major` denies the
batch *clean* status (sampling stays at 10%) and a sampled-failure rate >5% fails the batch —
but a single stilted stem can never torch a batch the way a banned fitness quantity must.

### 3.3 Audit-prompt injection

For sampled items, the §6.2 audit request additionally injects the same voice-contract slice
(§10/§3/§9) already in the generation prefix, so the auditor grades against the identical
contract the generator saw. (Cache-shared with the generation prefix where the audit
sub-batch reuses the block.)

## 4. Non-goals of this patch

- No change to fatal-class criteria, batch pass bars, sampling rates, gates, model choices,
  cost model beyond the +$0.001/node noted, or the archetype fields already specified.
- No item text, no exemplars: voice exemplars remain the gold node itself (few-shot slot in
  §4.1 is unchanged). `VOICE_EXEMPLARS.md` deliberately does not exist — the gold items ARE
  the exemplars; a second exemplar file would drift from them.
- The QUESTION_VOICE licensing guardrails propagate: nothing in the pipeline may reproduce or
  adapt specific corpus items; the contract carries measurements only.
