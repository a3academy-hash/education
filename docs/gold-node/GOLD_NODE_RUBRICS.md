# GOLD_NODE_RUBRICS — D4 rubric contract, gold instances, graded samples (ALG-L06)

**Status:** DRAFT — pending Matt review. Do not commit without approval.
**Deliverable:** gold-node D4 (rubric contract + instances + graded samples). Companion: D6 transfer battery (`docs/gold-node/gold-node-transfer.json`).
**Sources of authority:**
- `.authoring-tmp/remote-specs/RUNTIME_TUTOR_SPEC.md` §1.2 (grading guardrails), §3.2 (grading output schema — the drop-in target), §4 (fallback), §6 (never-LLM list)
- `docs/gold-node/misconception-taxonomy-slope.md` §3.3 (the self-explanation element table + advisory-only semantics), §2 (entry IDs), §3.4 (evidence semantics)
- `new_plan/CLAUDE.md` §10 (rubrics require specific semantic elements, never vibes), §5 (transfer battery)
- `docs/specs/QUESTION_VOICE.md` §10 (assessment register)

**Namespace caution (MANIFEST §2):** "D4" in this file's title is the gold-node *deliverable* D4. The battery's four dimensions are always written "transfer dimension 1–4," never bare "D1–D4."

---

## 1. The rubric contract (authoring-side schema)

Every rubric-scored open-response item ships with exactly one rubric object in this shape:

```json
{
  "rubricId": "RUB-<node>-<slug>",
  "promptRef": "<itemId>#<partId>",
  "metThreshold": 0.7,
  "elements": [
    {
      "elementId": "kebab-case-id",
      "requiredSemantic": "the meaning the response must state, in one sentence - never a keyword list",
      "counteredEntryIds": ["taxonomy entry IDs whose belief this element's presence contradicts"],
      "scoreWeight": 0.25
    }
  ],
  "canonicalAnswer": "a model explanation - grading anchor only, NEVER shown to the student",
  "gradableRule": "gradable = false only when the response is empty, off-task, or uninterpretable; a wrong-but-on-task explanation is gradable = true with low element scores"
}
```

Field semantics:

- **`rubricId`** — stable key; items point at it via `rubricRef`.
- **`promptRef`** — the item + part whose prompt elicits this rubric's response (one rubric, one eliciting prompt).
- **`elements[].requiredSemantic`** — a *required semantic element* per `new_plan/CLAUDE.md` §10: the grader scores against these elements, never against "good explanation" vibes (RUNTIME §1.2 guardrail). Paraphrase in any register counts; keyword absence does not fail a present meaning.
- **`elements[].counteredEntryIds`** — the taxonomy entries this element counters (taxonomy §3.3 annotation). **Host-side only** — consumed by the deterministic engine for the missing-element prior-raise; never sent to the grader and never echoed in grader output. **Amendment APPLIED 2026-07-06 (RUNTIME_TUTOR_SPEC §2, branch consolidation):** the RUNTIME §2 context-envelope example no longer carries `counteredEntryIds` inside `item.rubric` on grading calls and now carries `metThreshold` as grader input (see the dated 2026-07-06 note at RUNTIME §2). This contract's never-sent rule — a stricter anti-bias design (the grader must judge element presence without knowing which beliefs an element is meant to counter) — is now consistent with the consumer spec. *(Was: declared deviation / proposed amendment, pending.)*
- **`elements[].scoreWeight`** — how the engine aggregates per-element scores into advisory evidence. **Host-side only**: the grader scores each element independently and never sees weights (weights would bias element judgments).
- **`metThreshold`** — the deterministic rule `met = (score >= metThreshold)`; stated in the rubric so the grader's `met` booleans are auditable against its own scores. `met = score ≥ metThreshold` is D4-supplied semantics (RUNTIME §3.2 leaves `met` undefined); `metThreshold` is grader input, never echoed in output.
- **`canonicalAnswer`** — enters the grading call's context envelope as `item.canonicalAnswer` (RUNTIME §2: "grading only; never sent to the student").
- **`gradableRule`** — the authoring-side definition the grader's `gradable` boolean implements.
- **Fallback eligibility (RUNTIME §1.2):** a rubric with **≤4 elements** is eligible for `GRADING_FALLBACK_MODEL` grading; 5+ elements grade on `RUNTIME_MODEL` only. `RUB-L06-transfer-d1` (4 elements) is eligible; `RUB-L06-explain` (5 elements) is not.

### 1.1 Mapping table — authoring field → RUNTIME §3.2 grading-schema field

| Authoring-side (this contract) | Grading schema (RUNTIME §3.2) | Direction / rule |
|---|---|---|
| item `id` (carrying `rubricRef`) | `itemId` | echoed verbatim by the grader |
| `elements[].elementId` | `perElement[].elementId` | 1:1; the grader MUST cover **all** rubric elements (§4 validation: "perElement covers all rubric elements") |
| `elements[].requiredSemantic` | basis for `perElement[].score` and `perElement[].met` | grader judges presence of the meaning; `met = score >= metThreshold` |
| — (grader-produced) | `perElement[].evidenceSpan` | exact substring of the student text on which the score judgment rests — the span showing presence, OR the span showing violation; empty string `""` only when the element is simply absent |
| envelope `misconceptions.registrySlice` (tag vocabulary) | `detectedMisconceptionTags[].tag` | grader may flag any registry tag it finds *affirmative* textual evidence for — not limited to `counteredEntryIds` |
| — (grader-produced) | `detectedMisconceptionTags[].confidence` | in [0, 1] |
| — (grader-produced) | `detectedMisconceptionTags[].evidenceSpan` | exact substring quoting the belief |
| — (grader-produced) | `overallConfidence` | in [0, 1]; the engine's confidence gate reads this |
| `gradableRule` | `gradable` | false ⇒ the engine treats the response as ungraded (§4 fallback path) |
| `counteredEntryIds`, `scoreWeight`, `metThreshold`, `canonicalAnswer`, `promptRef`, `rubricId` | **no grading-schema counterpart** | host-side authoring/engine fields; MUST NOT appear in grader output |

This is the exact triple RUNTIME §3.2 names — *score per element, detected misconception tags, confidence* — so any conforming grader is drop-in compatible with these rubrics (proof by sample in §5).

### 1.2 The advisory-only rule (binding, verbatim-faithful to taxonomy §3.3)

> A missing element is *advisory* evidence: it raises the skill model's prior on the countered tags (feeding routing and hint pre-selection) but **never sets a tag active by itself** — active status still requires a signature hit or failed probe.

Consequences, spelled out:

1. **No rubric outcome gates anything.** Grading output is evidence, not verdict (RUNTIME §0). Mastery updates, routing, and the transfer-battery pass decision are on the §6 never-LLM list.
2. **Missing element ⇒ prior raise on its `counteredEntryIds`.** Deterministic engine-side mapping; the grader does not know or perform it.
3. **Detected tag (affirmative textual evidence) ⇒ logged advisory evidence** with confidence, same channel as a tutor turn's suspected tags. It can pre-select hint ladders and schedule a disambiguation probe; it cannot activate a tag. Activation stays at taxonomy §3.4: **2 signature hits, or 1 hit + failed disambiguation probe.**
4. **Grading failure ⇒ deterministic fallback (RUNTIME §4):** the explanation is marked "ungraded — queued for human review"; provisional state advances only on the deterministic answer-check of the closed-form companion part. This is why every rubric-scored gold instance below carries a closed-form anchor part.
5. Rubric scoring is logged per element for audit and sampled for human review (`new_plan/CLAUDE.md` §10).

---

## 2. `RUB-L06-explain` — the taxonomy §3.3 element table, formalized

The five-row table in taxonomy §3.3 ("explain how you find slope from two points and why it works"), as a rubric object:

```json
{
  "rubricId": "RUB-L06-explain",
  "promptRef": "ALG-L06-gold-rex-01#b",
  "metThreshold": 0.7,
  "elements": [
    {
      "elementId": "names-two-quantities",
      "requiredSemantic": "Names the two quantities being compared (change in y, change in x)",
      "counteredEntryIds": ["slope-as-difference", "subtracts-within-points"],
      "scoreWeight": 0.25
    },
    {
      "elementId": "ratio-not-difference",
      "requiredSemantic": "States the comparison is a division/ratio, not a difference",
      "counteredEntryIds": ["slope-as-difference", "forgot-denominator"],
      "scoreWeight": 0.25
    },
    {
      "elementId": "per-one-unit-meaning",
      "requiredSemantic": "States the result means 'output change per ONE unit of input'",
      "counteredEntryIds": ["rate-not-per-unit", "inverted-ratio"],
      "scoreWeight": 0.2
    },
    {
      "elementId": "same-direction-subtraction",
      "requiredSemantic": "States both subtractions must run in the same direction, and why (flipping one flips the sign)",
      "counteredEntryIds": ["inconsistent-subtraction-order"],
      "scoreWeight": 0.15
    },
    {
      "elementId": "sign-meaning",
      "requiredSemantic": "States what the sign of the answer tells you about the line",
      "counteredEntryIds": ["drops-negative-slope-sign", "rise-run-direction-error"],
      "scoreWeight": 0.15
    }
  ],
  "canonicalAnswer": "Subtract the two y-values and the two x-values in the same order to get the change in y and the change in x; if one subtraction runs backward the sign flips. Divide the change in y by the change in x - a ratio, not a difference - and the result says how much y changes for every 1 unit of x, for any two points on the line. A negative result means the line falls as x increases.",
  "gradableRule": "gradable = false only when the response is empty, off-task, or uninterpretable; a wrong-but-on-task explanation is gradable = true with low element scores"
}
```

Element IDs are kebab-case; `counteredEntryIds` match taxonomy §3.3 row-for-row (rows 1–5). Five elements ⇒ **not** eligible for `GRADING_FALLBACK_MODEL` (RUNTIME §1.2); grades on `RUNTIME_MODEL`.

---

## 3. Gold instance `ALG-L06-gold-rex-01` — rubric-explanation item

P3 neutral, assessment register, schema-consistent with `gold-node-items.json` (additive archetype `rubric-explanation`; part (b) carries `rubricRef` instead of a `misconceptionMap` — free text has no deterministic triggers; its evidence arrives through the §3.2 grading channel, advisory-only). Part (a) is the **deterministic anchor** RUNTIME §4 requires: on grading failure, provisional state advances on part (a)'s solver-checked answer alone.

```json
{
  "id": "ALG-L06-gold-rex-01",
  "archetype": "rubric-explanation",
  "phase": "P3",
  "sport": "neutral",
  "difficulty": 3,
  "standard": "8.F.B.4",
  "skillId": "ALG-L06",
  "prompt": "A line passes through (3, 8) and (7, 24).",
  "parts": [
    {
      "partId": "a",
      "prompt": "What is the slope of the line?",
      "answerType": "numeric",
      "correctAnswer": "4",
      "misconceptionMap": [
        {
          "trigger": "16",
          "tag": "forgot-denominator",
          "signature": "Δy = 24 - 8 = 16 reported as the slope (§2.1; |Δx| = 4 != 1 so the trap is live)"
        },
        {
          "trigger": "1/4",
          "tag": "inverted-ratio",
          "signature": "Δx/Δy = 4/16 = 1/4 = 1/m (§2.3; |m| = 4 != 1)"
        },
        {
          "trigger": "-4",
          "tag": "inconsistent-subtraction-order",
          "signature": "(y2 - y1)/(x1 - x2) = 16/(-4) = -4 = -m (§2.2; m > 0 so no §2.5 ambiguity)"
        },
        {
          "trigger": "12",
          "tag": "slope-as-difference",
          "signature": "Δy - Δx = 16 - 4 = 12 (§2.6 variant (a); y1 = 8 != x1 = 3)"
        },
        {
          "trigger": "17",
          "tag": "slope-as-difference",
          "signature": "y2 - x2 = 24 - 7 = 17 (§2.6 variant (b), computed per the entry's both-variants rule)"
        }
      ]
    },
    {
      "partId": "b",
      "prompt": "Explain in two or three sentences: how do you find the slope of a line from any two points, and why does the method work?",
      "answerType": "open-response",
      "rubricRef": "RUB-L06-explain",
      "gradedBy": "free-response-grading call (RUNTIME_TUTOR_SPEC §1.2, output schema §3.2); evidence is advisory-only per §1.2 of this document",
      "deterministicFallback": "on grading failure: explanation marked 'ungraded - queued for human review'; provisional state advances on part (a) only (RUNTIME §4)"
    }
  ],
  "misconceptionMap": [
    { "trigger": "a:16", "tag": "forgot-denominator", "signature": "Δy = 16 as slope (§2.1)" },
    { "trigger": "a:1/4", "tag": "inverted-ratio", "signature": "1/m = 1/4 (§2.3)" },
    { "trigger": "a:-4", "tag": "inconsistent-subtraction-order", "signature": "-m = -4 (§2.2)" },
    { "trigger": "a:12", "tag": "slope-as-difference", "signature": "Δy - Δx = 12 (§2.6a)" },
    { "trigger": "a:17", "tag": "slope-as-difference", "signature": "y2 - x2 = 17 (§2.6b)" }
  ],
  "visual": {
    "id": "V-GN-REX01",
    "type": "coordinate-plane",
    "purpose": "Confirmation-only, withheld until the whole item resolves - the explanation must come from the student's own model, not from reading arrows and a readout off the canvas.",
    "data": {
      "x_axis": { "label": "x", "range": [0, 8], "gridline_every": 1 },
      "y_axis": { "label": "y", "range": [0, 28], "gridline_every": 4 },
      "points": [
        { "x": 3, "y": 8, "label": "(3, 8)" },
        { "x": 7, "y": 24, "label": "(7, 24)" }
      ],
      "line": "solid through both points",
      "arrows": {
        "run": { "from": [3, 8], "to": [7, 8], "label": "run = 7 - 3 = 4" },
        "rise": { "from": [7, 8], "to": [7, 24], "label": "rise = 24 - 8 = 16" }
      },
      "readout": "16 / 4 = 4"
    },
    "annotations": [
      "held back entirely until part (b) is submitted - no scaffold may leak into the rubric-scored explanation",
      "standard rise/run color convention (--blue-on-light / --green-on-light)"
    ],
    "reveal_beats": [
      "(No visual during parts (a) and (b) - the item is the assessment of the student's unaided model.)",
      "On part (b) submit: plane, points, line, arrows, and readout appear as confirmation.",
      "Caption: 'your sentences, drawn.'"
    ]
  },
  "hintLadderRef": {
    "generic": "HL-L06-generic",
    "perTag": {
      "forgot-denominator": "HL-forgot-denominator",
      "inverted-ratio": "HL-inverted-ratio",
      "inconsistent-subtraction-order": "HL-inconsistent-subtraction-order",
      "slope-as-difference": "HL-slope-as-difference"
    }
  },
  "authoringNote": "The taxonomy §3.3 core-explanation prompt, worn as a P3 assessment item with the RUNTIME §4 deterministic anchor in part (a). Generator constraints verified on (3, 8)-(7, 24): |Δx| = 4 != 1 (§2.1 live), |m| = 4 != 1 (§2.3 live, 1/4 != 4), y1 = 8 != x1 = 3 (§2.6 variants distinct: 12 vs 17), y1 != 0. §2.9 traps (y2/x2 = 24/7 ≈ 3.43; y1/x1 = 8/3 ≈ 2.67) are EXCLUDED per §2.9's minimum-separation recommendation (|24/7 - 4| = 0.57 is too close to the key for comfort on numeric entry) - noted, not armed. All armed traps {16, 1/4, -4, 12, 17} pairwise distinct and distinct from the key 4. Hints (part (a) only) never fire on part (b): an open response gets graded, not laddered. Voice: two components, one ask each, both interrogative closes; the two-part shape is a declared deviation from the standalone-P3 no-sub-parts rule, required by RUNTIME §4's deterministic-anchor mandate for rubric items."
}
```

---

## 4. Transfer-battery gold instance — `ALG-L06-gold-tb-d1-01` + `RUB-L06-transfer-d1`

**Transfer dimension 1** (same structure, changed story — foreign domain), per `new_plan/CLAUDE.md` §5.1. Foreign domain: **atmospheric science** — non-sport, and absent from the taught neutral contexts (plant growth, water tank, candle, savings account).

**What makes it structurally fresh, not a reskin:** (i) the input variable is **altitude — a continuous spatial measure, not a count or a clock**: in the teaching bank (all 62 live + all 15 gold), every item that gives x a real-world meaning runs it as a sequential event count (games, games-left, innings, starts, plate appearances, fouls committed, play number, drives, quarters, matches, sets) or clock time (minutes, hours, days, weeks), and the remaining items use bare coordinates with no physical referent; no teaching item makes x spatial, and none uses a physical-gradient construct (a rate of change across space); (ii) the slope is a **negative decimal on decimal-bearing data** (−6.5 °C/km — the real environmental lapse rate; realistic values per QUESTION_VOICE §10 assessment register); (iii) it pairs the computation with a rubric-scored interpretation element, a combination no teaching item carries. Same underlying structure (two points → Δ ratio), fully changed story.

### 4.1 `RUB-L06-transfer-d1` (4 elements — `GRADING_FALLBACK_MODEL`-eligible per RUNTIME §1.2)

```json
{
  "rubricId": "RUB-L06-transfer-d1",
  "promptRef": "ALG-L06-gold-tb-d1-01#b",
  "metThreshold": 0.7,
  "elements": [
    {
      "elementId": "names-two-changes",
      "requiredSemantic": "Names both quantities that changed (the temperature change and the altitude change)",
      "counteredEntryIds": ["slope-as-difference", "subtracts-within-points"],
      "scoreWeight": 0.25
    },
    {
      "elementId": "division-not-subtraction",
      "requiredSemantic": "States the rate comes from dividing the temperature change by the altitude change, not from the change alone or a difference of changes",
      "counteredEntryIds": ["slope-as-difference", "forgot-denominator"],
      "scoreWeight": 0.25
    },
    {
      "elementId": "per-one-km-referent",
      "requiredSemantic": "States the rate's referent: degrees per ONE kilometer of altitude (not per the whole 2 km interval, and not kilometers per degree)",
      "counteredEntryIds": ["rate-not-per-unit", "inverted-ratio"],
      "scoreWeight": 0.25
    },
    {
      "elementId": "sign-direction",
      "requiredSemantic": "States what the negative sign means here: temperature falls as altitude rises",
      "counteredEntryIds": ["drops-negative-slope-sign"],
      "scoreWeight": 0.25
    }
  ],
  "canonicalAnswer": "The temperature changed -13 °C while the altitude changed +2 km, and dividing -13 by 2 gives -6.5 °C for every 1 km of climb. The sign is negative because the temperature falls as the altitude rises.",
  "gradableRule": "gradable = false only when the response is empty, off-task, or uninterpretable; a wrong-but-on-task explanation is gradable = true with low element scores"
}
```

(Four elements, not five. The element dropped from taxonomy §3.3 is **row 4 — same-direction subtraction, countering `inconsistent-subtraction-order`**: part (b)'s prompt never elicits the subtraction-direction invariant, so scoring its absence would penalize unasked content; §2.2 evidence retains a deterministic channel through part (a)'s 6.5 trigger (pair logged, probe queued). Row 5 survives as `sign-direction`, with its `counteredEntryIds` trimmed to the `drops-negative-slope-sign` half — `rise-run-direction-error` is a graph-construction entry with no purchase on a prose item. The ≤4-element bound is met by honest trimming, not compression.)

### 4.2 Item JSON

```json
{
  "id": "ALG-L06-gold-tb-d1-01",
  "archetype": "transfer-battery",
  "batteryDimension": "transfer dimension 1 (same structure, changed story - foreign domain)",
  "foreignDomain": "atmospheric science",
  "phase": "P3",
  "sport": "neutral",
  "difficulty": 3,
  "standard": "8.F.B.4",
  "skillId": "ALG-L06",
  "prompt": "A weather balloon measures the air temperature as it climbs: 8.4 °C at an altitude of 1.2 km, and -4.6 °C at 3.2 km.",
  "parts": [
    {
      "partId": "a",
      "prompt": "At what rate is the temperature changing, in degrees Celsius per kilometer?",
      "answerType": "numeric",
      "correctAnswer": "-6.5",
      "acceptedEquivalents": ["-13/2", "-6.50"],
      "misconceptionMap": [
        {
          "trigger": "-13",
          "tag": "forgot-denominator",
          "signature": "Δy = -4.6 - 8.4 = -13 reported as the rate (§2.1; |Δx| = 2 != 1). Bare-numeric Δy defaults to §2.1 per the collision matrix; the §2.10 disambiguation arrives through part (b)'s rubric evidence if the text shows the interval was seen but never normalized"
        },
        {
          "trigger": "6.5",
          "tag": "inconsistent-subtraction-order",
          "signature": "-m = |m| = 6.5 since m = -6.5 < 0: ambiguous between §2.2 and §2.5 - log the pair, tag neither active, queue a positive-slope probe per the collision matrix"
        },
        {
          "trigger": "-2/13",
          "tag": "inverted-ratio",
          "signature": "Δx/Δy = 2/(-13) = -2/13 = 1/m (§2.3; |m| = 6.5 != 1)"
        },
        {
          "trigger": "-15",
          "tag": "slope-as-difference",
          "signature": "Δy - Δx = -13 - 2 = -15 (§2.6 variant (a); y1 = 8.4 != x1 = 1.2)"
        },
        {
          "trigger": "-7.8",
          "tag": "slope-as-difference",
          "signature": "y2 - x2 = -4.6 - 3.2 = -7.8 (§2.6 variant (b))"
        }
      ]
    },
    {
      "partId": "b",
      "prompt": "In one or two sentences: how did you find your rate, and what does its sign say about the air higher up?",
      "answerType": "open-response",
      "rubricRef": "RUB-L06-transfer-d1",
      "gradedBy": "free-response-grading call (RUNTIME §1.2/§3.2); 4-element rubric - GRADING_FALLBACK_MODEL-eligible",
      "deterministicFallback": "on grading failure: explanation marked 'ungraded - queued for human review'; part (a) is the item's sole gating evidence regardless (see gatingNote)"
    }
  ],
  "misconceptionMap": [
    { "trigger": "a:-13", "tag": "forgot-denominator", "signature": "Δy = -13 as rate (§2.1)" },
    { "trigger": "a:6.5", "tag": "inconsistent-subtraction-order", "signature": "-m = 6.5; §2.2/§2.5 pair logged, probe queued" },
    { "trigger": "a:-2/13", "tag": "inverted-ratio", "signature": "1/m = -2/13 (§2.3)" },
    { "trigger": "a:-15", "tag": "slope-as-difference", "signature": "Δy - Δx = -15 (§2.6a)" },
    { "trigger": "a:-7.8", "tag": "slope-as-difference", "signature": "y2 - x2 = -7.8 (§2.6b)" }
  ],
  "visual": {
    "id": "V-GN-TBD101",
    "type": "table",
    "purpose": "Data vehicle only - an assessment surface, not a scaffold. The two altitude-temperature readings as a table (tables are a first-class data vehicle, QUESTION_VOICE §6).",
    "data": {
      "columns": ["Altitude (km)", "Air temperature (°C)"],
      "rows": [
        [1.2, 8.4],
        [3.2, -4.6]
      ],
      "caption": "Readings from one balloon ascent."
    },
    "annotations": [
      "no arrows, brackets, or per-interval labels - the battery assesses unaided transfer",
      "no mid-item reveals; feedback defers to battery review"
    ],
    "reveal_beats": [
      "Table and prompt appear together; nothing else renders.",
      "(Assessment surface: no reveal on resolve - results surface in the post-battery review.)"
    ]
  },
  "hintPolicy": "none-during-battery",
  "hintPolicyNote": "Battery items are assessment: no hint ladder is served while the battery runs. Wrong answers still log their taxonomy trigger/tag/signature as evidence; remediation is scheduled AFTER the battery resolves.",
  "gatingNote": "Part (a)'s deterministic answer-check is this item's SOLE gating evidence for the transfer-dimension-1 pass. Part (b)'s rubric output is advisory misconception evidence only (this document §1.2); the battery pass decision is on the RUNTIME §6 never-LLM list (item 4).",
  "authoringNote": "Transfer dimension 1, foreign domain #1 (atmospheric science; foreign domain #2 is print-shop economics in gold-node-transfer.json - >=2 foreign domains per new_plan/CLAUDE.md §5.1). Structurally fresh, not a reskin: x is altitude, a continuous spatial measure (every contextualized teaching-item x is a sequential event count or clock time; the rest are bare coordinates; no teaching item uses a physical-gradient construct), negative decimal slope on decimal-bearing realistic data (-6.5 °C/km is the true environmental lapse rate), computation paired with a rubric interpretation element. Generator constraints verified on (1.2, 8.4)-(3.2, -4.6): |Δx| = 2 != 1, |m| = 6.5 != 1, y1 = 8.4 != x1 = 1.2, y1 != 0; no §2.9 trap armed (numeric-entry separation: y2/x2 = -1.4375 vs key -6.5 is safe, but §2.9 is better assessed by tb-d4-01's inverse form and disc-03's head-start construction - kept unarmed here to keep the trap set tight). Armed traps {-13, 6.5, -2/13, -15, -7.8} pairwise distinct and distinct from the key -6.5; accepted equivalents (-13/2, -6.50) collision-checked against all traps (no matches). Arithmetic path tractable: 8.4 - (-4.6)? No - forward: -4.6 - 8.4 = -13 in one step, 3.2 - 1.2 = 2 in one step, one division."
}
```

---

## 5. Sample graded responses — the drop-in-compatibility proof

Each sample: authentic middle-school student text, then the **exact RUNTIME §3.2 JSON** a conforming grader returns. Field-for-field parity is audited in §6.

### 5.1 `ALG-L06-gold-rex-01` — high-scoring response

**Student text (part b):**

> "First I find how much y changed and how much x changed, subtracting in the same order both times, like (24 - 8) on top and (7 - 3) on the bottom. Then I divide the y-change by the x-change, and that gives how much y climbs for every 1 step x takes. Dividing spreads the whole climb evenly over the steps, and if the answer comes out negative it means the line falls instead of climbs."

**Grader output (§3.2 schema):**

```json
{
  "itemId": "ALG-L06-gold-rex-01",
  "perElement": [
    {
      "elementId": "names-two-quantities",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "how much y changed and how much x changed"
    },
    {
      "elementId": "ratio-not-difference",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "I divide the y-change by the x-change"
    },
    {
      "elementId": "per-one-unit-meaning",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "how much y climbs for every 1 step x takes"
    },
    {
      "elementId": "same-direction-subtraction",
      "score": 0.75,
      "met": true,
      "evidenceSpan": "subtracting in the same order both times"
    },
    {
      "elementId": "sign-meaning",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "if the answer comes out negative it means the line falls instead of climbs"
    }
  ],
  "detectedMisconceptionTags": [],
  "overallConfidence": 0.92,
  "gradable": true
}
```

*Grading note:* `same-direction-subtraction` scores 0.75, not 1.0 — the invariant is stated but the *why* (flipping one flips the sign) is not; 0.75 ≥ metThreshold 0.7 ⇒ `met: true`. This is element-anchored partial credit, not vibes.

### 5.2 `ALG-L06-gold-rex-01` — partial response revealing `slope-as-difference`

**Student text (part b):**

> "You look at how much the y went up and how much the x went up, and then you see how much more the y went up than the x. That extra amount is the slope, so here it would be 16 - 4 = 12."

**Grader output (§3.2 schema):**

```json
{
  "itemId": "ALG-L06-gold-rex-01",
  "perElement": [
    {
      "elementId": "names-two-quantities",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "how much the y went up and how much the x went up"
    },
    {
      "elementId": "ratio-not-difference",
      "score": 0.0,
      "met": false,
      "evidenceSpan": "how much more the y went up than the x"
    },
    {
      "elementId": "per-one-unit-meaning",
      "score": 0.0,
      "met": false,
      "evidenceSpan": ""
    },
    {
      "elementId": "same-direction-subtraction",
      "score": 0.0,
      "met": false,
      "evidenceSpan": ""
    },
    {
      "elementId": "sign-meaning",
      "score": 0.0,
      "met": false,
      "evidenceSpan": ""
    }
  ],
  "detectedMisconceptionTags": [
    {
      "tag": "slope-as-difference",
      "confidence": 0.9,
      "evidenceSpan": "how much more the y went up than the x"
    }
  ],
  "overallConfidence": 0.88,
  "gradable": true
}
```

*Engine-side story (deterministic, not the grader's job):* `ratio-not-difference` fails on a violation span (the contrary evidence is quoted); the three absent elements return `""`. Missing elements raise priors on their `counteredEntryIds`; the detected `slope-as-difference` tag is advisory. Neither activates anything. If this student also typed **12** on part (a), that is one §2.6 signature hit (weak evidence, logged); one more hit or a failed probe activates the tag per taxonomy §3.4 — and §2.6 is a BLOCKER, routing below L05. The rubric sharpened the diagnosis; the deterministic engine made every decision.

### 5.3 `ALG-L06-gold-tb-d1-01` — high-scoring response

**Student text (part b):**

> "The temperature changed by -13 degrees while the altitude changed by 2 km, so I divided -13 by 2 to get -6.5 degrees for every 1 km up. The sign is negative because the temperature drops as the balloon climbs - the air gets colder the higher you go."

**Grader output (§3.2 schema):**

```json
{
  "itemId": "ALG-L06-gold-tb-d1-01",
  "perElement": [
    {
      "elementId": "names-two-changes",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "The temperature changed by -13 degrees while the altitude changed by 2 km"
    },
    {
      "elementId": "division-not-subtraction",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "I divided -13 by 2"
    },
    {
      "elementId": "per-one-km-referent",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "-6.5 degrees for every 1 km up"
    },
    {
      "elementId": "sign-direction",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "negative because the temperature drops as the balloon climbs"
    }
  ],
  "detectedMisconceptionTags": [],
  "overallConfidence": 0.94,
  "gradable": true
}
```

### 5.4 `ALG-L06-gold-tb-d1-01` — partial response revealing `rate-not-per-unit`

**Student text (part b):**

> "Between the two heights the temperature dropped 13 degrees and the altitude went up 2 kilometers. So the rate is 13 degrees colder over those 2 kilometers, and it is negative because the air got colder."

**Grader output (§3.2 schema):**

```json
{
  "itemId": "ALG-L06-gold-tb-d1-01",
  "perElement": [
    {
      "elementId": "names-two-changes",
      "score": 1.0,
      "met": true,
      "evidenceSpan": "the temperature dropped 13 degrees and the altitude went up 2 kilometers"
    },
    {
      "elementId": "division-not-subtraction",
      "score": 0.0,
      "met": false,
      "evidenceSpan": "the rate is 13 degrees colder over those 2 kilometers"
    },
    {
      "elementId": "per-one-km-referent",
      "score": 0.0,
      "met": false,
      "evidenceSpan": "over those 2 kilometers"
    },
    {
      "elementId": "sign-direction",
      "score": 0.5,
      "met": false,
      "evidenceSpan": "negative because the air got colder"
    }
  ],
  "detectedMisconceptionTags": [
    {
      "tag": "rate-not-per-unit",
      "confidence": 0.85,
      "evidenceSpan": "the rate is 13 degrees colder over those 2 kilometers"
    }
  ],
  "overallConfidence": 0.9,
  "gradable": true
}
```

*Grading note:* this is taxonomy §2.10's own disambiguation, arriving through text instead of a probe: a numeric **-13** on part (a) defaults to `forgot-denominator` (collision matrix), but this text shows the student *saw* both quantities and never normalized — the §2.10 belief exactly. `sign-direction` scores 0.5 (sign tied to falling temperature, never to rising altitude) — below metThreshold ⇒ `met: false`. The detected tag stays advisory; if part (a) carried the -13 trigger, the engine now has one signature hit plus rubric evidence favoring re-attribution — it queues §2.10's unit-labeled choice probe rather than §2.1's contrast case. Diagnosis sharpened, decision deterministic.

---

## 6. Self-audit appendix

### 6.1 Field-for-field parity vs RUNTIME §3.2

Every §3.2 field, checked against all four sample outputs (§5.1–§5.4):

| §3.2 field | Type/domain | §5.1 | §5.2 | §5.3 | §5.4 | Extra fields present? |
|---|---|---|---|---|---|---|
| `itemId` | string | ✓ | ✓ | ✓ | ✓ | — |
| `perElement[].elementId` | string, covers ALL rubric elements | ✓ (5/5) | ✓ (5/5) | ✓ (4/4) | ✓ (4/4) | — |
| `perElement[].score` | number in [0,1] | ✓ | ✓ | ✓ | ✓ | — |
| `perElement[].met` | boolean (= score ≥ 0.7) | ✓ | ✓ | ✓ | ✓ | — |
| `perElement[].evidenceSpan` | string (exact substring or "") | ✓ | ✓ | ✓ | ✓ | — |
| `detectedMisconceptionTags[].tag` | registry tag | ✓ (empty list) | ✓ | ✓ (empty list) | ✓ | — |
| `detectedMisconceptionTags[].confidence` | number in [0,1] | n/a | ✓ | n/a | ✓ | — |
| `detectedMisconceptionTags[].evidenceSpan` | string | n/a | ✓ | n/a | ✓ | — |
| `overallConfidence` | number in [0,1] | ✓ | ✓ | ✓ | ✓ | — |
| `gradable` | boolean | ✓ | ✓ | ✓ | ✓ | — |

**No field of §3.2 is missing from any sample; no sample carries a field §3.2 does not define.** (Authoring-side fields — `counteredEntryIds`, `scoreWeight`, `metThreshold`, `canonicalAnswer` — appear only in the rubric objects, never in grader output, per §1.1's host-side-only rule.) All `met` booleans are consistent with `score >= 0.7`. All confidences in [0,1]. Every `evidenceSpan` is an exact substring of its sample's student text, or `""` for an absent element.

### 6.2 Voice check (QUESTION_VOICE §10 assessment register)

| Surface | Words | Context sentences | Close | Notes |
|---|---|---|---|---|
| rex-01 stem | 9 | 1 | — (data sentence) | |
| rex-01 part (a) ask | 7 | 0 | interrogative "?" | |
| rex-01 part (b) ask | 25 | 0 | interrogative "?" | the §3.3 prompt in assessment register |
| tb-d1-01 stem | 24 | 1 | — (data sentence) | realistic decimal values, units attached (°C, km) |
| tb-d1-01 part (a) ask | 12 | 0 | interrogative "?" | units in the ask ("in degrees Celsius per kilometer?") |
| tb-d1-01 part (b) ask | 22 | 0 | interrogative "?" | interpretation ask (sign meaning) |

All stems ≤48 words, 0–2 context sentences, interrogative closes, ask last, units attached. FK not re-instrumented here; vocabulary is tier-1/2 plus taught math terms, sentences ≤15 words — and per mr-kahn's §11.1 row-11 ruling the FK 6–8 band is a ceiling over the full student-visible surface, with minimal stems below band compliant by design. **Declared deviation:** both instances carry two parts (closed-form + explanation) against the standalone-P3 no-sub-parts rule — required by RUNTIME §4's deterministic-anchor mandate for rubric-scored items; each part is a single ask.

### 6.3 Advisory-only assertions (binding)

1. The §1.2 rule is quoted verbatim-faithful from taxonomy §3.3: a missing element **raises the prior on the countered tags; it never sets a tag active by itself**. Activation requires a signature hit or failed probe (taxonomy §3.4: 2 hits, or 1 hit + failed probe).
2. No rubric score, element outcome, detected tag, or confidence value gates mastery, routing, or the transfer-battery pass — all four are on the RUNTIME §6 never-LLM list. `ALG-L06-gold-tb-d1-01`'s gating evidence is part (a)'s deterministic answer-check alone (`gatingNote` in the item JSON).
3. On grading failure the RUNTIME §4 row applies unmodified: no retry success ⇒ explanation "ungraded — queued for human review"; provisional state advances only on deterministic evidence. Both gold instances carry the closed-form anchor that makes this fallback non-degenerate.
4. Rubric scoring is logged per element and sampled for human review (`new_plan/CLAUDE.md` §10; RUNTIME §1.2).
