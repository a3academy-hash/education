# QUESTION_VOICE.md — empirically measured question-voice spec

**Status:** v1.0, 2026-07-05. Measured on branch `gold-node-alg-l06`.
**Method:** mirror of the video-CLAUDE.md methodology — measure the properties of exemplar
material, encode a contract, reconcile our own content against it. Every number below was
computed by a deterministic script over a transcribed item corpus; qualitative labels
(ask type, distractor error paths) were classified per item against official rationales
where available. Nothing here is a vibe.

---

## 0. LICENSING GUARDRAILS (hard constraints on this document and everything derived from it)

- **Illustrative Mathematics (CC BY 4.0):** may be analyzed deeply, quoted briefly with
  attribution, and its structures adapted. **Attribution is required if any IM-derived
  structure ships.** Brief quotes in this file are attributed: © Illustrative Mathematics,
  CC BY 4.0, im.kendallhunt.com.
- **SAT released practice tests, Florida B.E.S.T. released/sample items, NY Regents released
  exams (copyrighted):** **MEASURE-ONLY.** This document contains statistical properties and
  structural patterns extracted from them. It must never reproduce an item, never store item
  text beyond short fragments (<15 words) needed to illustrate a pattern, and no one may
  produce "adapted" versions of specific items from these sources.
- **This file is a measurement + pattern spec, not a question bank.** If a future edit adds
  item text to this file, that edit is wrong — revert it.
- The raw corpus lives in `.authoring-tmp/voice-corpus/` (gitignored, with its own
  `SOURCES.md` license ledger). It never ships and is never committed.

## 0.1 Sources (reference copy of the corpus ledger)

| Source | License | Files analyzed | URL |
|---|---|---|---|
| Illustrative Mathematics Algebra 1, Unit 2, Lessons 1–12 (lesson activities + practice sets) | CC BY 4.0 | 24 HTML pages | `im.kendallhunt.com/HS/students/1/2/{1..12}/{index,practice}.html` |
| College Board digital SAT released practice tests 4, 5, 6 + official answer explanations | © College Board — measure-only | 6 PDFs | `satsuite.collegeboard.org/media/pdf/sat-practice-test-{4,5,6}-digital.pdf` (+ `-answers-`) |
| Florida B.E.S.T. Algebra 1 EOC — Spring 2024 released items; 2025 CBT sample items + key | © FLDOE — measure-only | 2 PDFs | `flfast.org/content/contentresources/en/…` (2024 Test Release Support Document; 2025 answer key) |
| NY Regents Algebra 1 — June 2025, August 2025, January 2026 exams | © NYSED — measure-only | 3 PDFs | `nysedregents.org/algebraone/{625,825,126}/…-exam.pdf` |

## 0.2 Corpus and pipeline

Filter: items fundamentally about slope/rate of change, linear equation from two points,
proportional relationships, or linear functions in context. Systems-only, inequality-only,
exponential, quadratic, geometry, and pure-stats items excluded.

| Source | Items in scope | Formats | Notes |
|---|---|---|---|
| IM Alg 1 U2 | **68** (49 practice, 19 activities) | 36 multipart, 21 MC, 11 constructed | activities included because scaffolding is a measurement target |
| SAT | **30** | 21 MC, 9 student-produced response | correct answers + distractor rationales from official explanations |
| FL B.E.S.T. | **14** | 8 MC (1 multiselect), 3 constructed-interaction, 2 multipart, 1 SPR | no per-item %-correct available locally |
| Regents | **10** | 6 MC, 4 constructed | MC keys derived by solving (no key PDF pulled) |
| **Total** | **122** | | + our own 15 gold-node items and 4 D1 embedded checks run through the identical pipeline (§11) |

Pipeline (reproducible): `tools/fetch.py` / `tools/regents.py` (acquisition) →
`tools/extract.py` (pypdf/bs4 text) → per-source transcription to a shared JSONL schema
(`tools/SCHEMA.md`) → `tools/analyze.py` (all statistics; medians/quartiles, FK via
syllable heuristic). All under `.authoring-tmp/voice-corpus/`.

**Caveats, stated up front:** Regents (n=10), FL (n=14), and D1 checks (n=4) are small
samples — treat their numbers as indicative, not precise. A handful of graph-dependent items
were excluded rather than transcribed unfaithfully (biases graph-representation counts
slightly down for IM/FL). FK grades use a heuristic syllable counter (±0.5 grade). Distractor
error labels for non-SAT sources are analyst-derived, not official.

---

## 1. Stem architecture

Word counts are the student-visible stem excluding choices; "total" adds sub-part text for
multipart items.

| Source | Stem words median (p25–p75) | Total words median | Context sentences before the ask, median | Ask ends with "?" | Ask is imperative |
|---|---|---|---|---|---|
| SAT | **37.5** (24–47) | 37.5 | **1** | **93%** | 0% |
| IM | **44.5** (33–59) | 75.5 (51–100) | **3** | 37% | **43%** |
| FL B.E.S.T. | 41 (29–52) | 41 | 1 | 64% | 29% |
| Regents | 32.5 (29–41) | 32.5 | 1.5 | 30% | 30% |

Patterns:
- **SAT compresses hard.** One context sentence, one data sentence, one interrogative ask —
  the question mark lands at the very end of the item ≥93% of the time. Never imperative.
- **IM expands.** Median 3 sentences of scenario before any ask; asks are frequently
  imperative ("Write an equation…", "Explain…") and split across lettered parts.
- Regents/FL sit between, with Regents' constructed-response register ("Determine and state…",
  "Justify your answer") pulling imperative share up and "?" share down.
- Everyone's ask lands **last**. No source buries the ask mid-stem. Context first, data
  second, ask final — universal ordering.

## 2. Context density

Math-word ratio = mathematical/numeric tokens as a share of content words (stopwords
removed). Lower = more scenario language.

| Source | Math-word ratio (median) | Scenario:math (approx) | Real-world scenario | "Clean" numbers | Data introduced via (top shares) |
|---|---|---|---|---|---|
| IM | **0.3** | 70:30 | **96%** | 62% | prose 54%, mixed 27%, table 9%, graph 7% |
| SAT | 0.4 | 60:40 | 60% | 70% | prose 47%, mixed 27%, table 10%, equation 10% |
| Regents | 0.4 | 60:40 | 70% | 50% | prose 60%, table 40% |
| FL B.E.S.T. | 0.6 | 40:60 | 50% | 79% | mixed 43%, equation 21%, prose 21% |

Patterns:
- IM is the scenario-richest and almost always real-world; FL is the most symbol-forward
  (many items hand the student an equation directly).
- **Prose is the default data-delivery vehicle everywhere**; tables appear in 10–40% of items;
  standalone graphs are rarer than intuition suggests (7–21%).
- Realistic ("messy") numbers appear in 21–50% of items depending on source — decimals like
  $12.20, values like 14,699. **No source keeps numbers 100% clean.** Assessment sources use
  messiness deliberately (unit-price decimals, large populations) while keeping the *arithmetic
  path* tractable.

## 3. Ask phrasing catalog

Bucketed by regex over the final ask clause (frequencies per source):

| Pattern | SAT | IM | FL | Regents | Example shape (composite, not a real item) |
|---|---|---|---|---|---|
| "What is the value/slope/…?" | **27%** | 3% | – | 10% | "What is the slope of line k?" |
| "Which …" (select) | 23% | 10% | **50%** | 20% | "Which equation represents this relationship?" |
| Meaning/interpretation | 10% | 13% | – | – | "…best interpretation of the slope in this context?" |
| "How many/much/long…?" | 13% | 12% | – | – | "How many minutes will it take…?" |
| "Write/create an equation…" | – | **21%** | – | 20% | "Write an equation relating C and n." |
| Explain/justify | – | 9% | – | – | "Explain how you know." |
| Find/determine/state | – | 4% | 7% | 10% | "Determine and state the rate of change." |
| Graph/complete/match | – | 3% | 7% | – | "Complete the table." |
| Other (multi-clause, interaction, SPR) | 27% | 25% | 36% | 40% | |

(Note: FL *does* ask interpretation — see the second table — but phrases it inside "Which…"
selection stems, so the phrasing bucket credits which-select; Regents asks none in this
sample. Table corrected 2026-07-05 after an instrument fix; each column sums to 100%.)

Interpretation-vs-computation split (final ask classification):

| Source | interpretation | computation | equation-write | feature-id | graph-read |
|---|---|---|---|---|---|
| SAT | 13% | **43%** | 27% | 10% | 3% |
| IM | 13% | 21% | **50%** | 6% | 7% |
| FL | 7% | 7% | 29% | **29%** | 7% |
| Regents | 0% | **50%** | 40% | – | – |

Patterns:
- SAT's signature ask is a short interrogative "What is…?" / "Which of the following…?" —
  and its interpretation items use one nearly-fixed frame: "Which of the following is the
  best interpretation of ___ in this context?"
- IM's signature ask is productive, not selective: half of all final asks are
  "write an equation" — the student builds the object rather than recognizing it.
- FL leans on "Which…" selection plus direct feature identification; Regents constructed
  response has a fossilized register: "Determine and state… Justify your answer."

## 4. Multi-part scaffolding (IM)

36 of 68 IM items are multipart: **median 4 parts** (p25 3, p75 5, max 14). Three
recurring progression architectures, each observed repeatedly in U2 L1–L12
(© Illustrative Mathematics, CC BY 4.0 — structures adaptable with attribution):

1. **Abstraction fading.** Same scenario, parts step numeric → single variable → all-variable
   general form, then a comparison capstone ("How are the equations you wrote … alike?", L2).
   Each part changes exactly one thing about the previous part. Cognitive add per part:
   strip one concrete anchor.
2. **Compute → formalize → use → interpret.** Parts (a)(b) evaluate the relationship at
   specific values ("How much will be in the account after 3 weeks?", L5), (c) writes the
   general equation, (d) graphs it, then a final part *uses or interprets* the formal object
   ("In this situation, what does the solution to the equation tell us?", L4). The student
   has computed concrete instances before being asked to symbolize — the equation names
   something they already did.
3. **Parallel-context transfer.** An identical part-sequence is repeated on a second, fresh
   context inside the same item (savings account → water tank, L5), forcing the schema, not
   the answers, to carry over.

Also note: IM part (a) is nearly always answerable by direct arithmetic — an entry ramp —
and reflection/interpretation parts come **last**, never first.

## 5. Distractor logic

Every wrong MC option was classified: does an identifiable error path (misconception)
produce exactly this option, or is it merely a plausible number?

| Source | Wrong options analyzed | Mapped to identifiable misconception | Options per MC item |
|---|---|---|---|
| SAT | 63 | **97%** (per official rationales) | 4 (3 distractors) |
| Regents | 18 | 100% (analyst-derived, n small) | 4 |
| FL B.E.S.T. | 28 | 89% | 4–6 (incl. multiselect) |
| IM (MC subset) | 62 | 86% | ~4 |

Patterns:
- **The professional standard is: essentially no random distractors.** SAT's official
  explanations name the error behind almost every wrong option ("this is the slope, not the
  y-intercept"-class rationales). The recurring error families in the linear domain:
  swapped rise/run, sign error on slope, intercept-as-slope (and converse), computed
  total instead of rate, inverted unit rate, endpoint/interval misreads.
- This matches — and validates — our taxonomy's detection-signature approach: a wrong answer
  should be *diagnostic*, produced by a specific documented error path. Where we go further:
  the corpus maps errors to options post-hoc; our items are *generated from* the taxonomy with
  trigger values armed by constraint (§11, verdict: exceed).

## 6. Representation mix

Share of items presenting each representation to the student (items can carry several):

| Source | verbal | symbolic | table | graph | multi-representation items |
|---|---|---|---|---|---|
| SAT | 93% | 37% | 10% | 7% | 47% |
| IM | 97% | 25% | 10% | 16% | 43% |
| FL | 57% | 57% | 21% | 21% | 50% |
| Regents | 90% | – | 40% | – | 30% |

Verbal is the universal substrate; tables outnumber graphs as given data in every source
except FL. Multi-representation (e.g., prose + table, prose + equation) is roughly **every
other item** — it is normal, not decoration.

## 7. Interpretation demand

Fraction of items requiring meaning-in-context (the "what does the 3 represent?" class),
measured two ways: final-ask only, and anywhere in the item (any sub-part):

| Source | Final ask | Anywhere in item |
|---|---|---|
| IM | 13% | **29%** |
| SAT | 13% | 13% |
| FL | 7% | 7% |
| Regents | 0% | 0% |

This is the sharpest curriculum-vs-generic divergence in the corpus: **IM weaves an
interpretation part into nearly a third of its items** (usually as the capstone of a
multipart progression, §4.2), while state assessments barely ask for meaning at all.
SAT holds a steady ~13% via its fixed "best interpretation" frame. A bank that never asks
"what does this number mean here?" is measurably generic-shaped.

## 8. Reading level

| Source | FK grade median (p25–p75) | Sentence length, words median (p25–p75) |
|---|---|---|
| SAT | 6.7 (4.4–9.0) | 14 (10–20) |
| IM | 6.8 (5.8–7.7) | 12 (8–17) |
| FL | 7.2 (5.5–8.8) | 13 (9–20) |
| Regents | 7.8 (7.3–8.0) | 13 (10.5–16.5) |

All four sources converge on **FK grade ≈ 7, sentences ≈ 12–14 words** — at or slightly
below the age of the students being assessed. Vocabulary outside the math register stays
tier-1/tier-2 (buys, earns, climbs, costs); tier-3 words are exclusively math terms that are
themselves being taught (slope, intercept, proportional).

## 9. Divergence table — SAT voice vs IM voice, and where each fits

| Dimension | SAT (assessment voice) | IM (instruction voice) | Fit for us |
|---|---|---|---|
| Compression | 1 context sentence; 37 words; single ask | 3 sentences; 75 words total; 3–5 asks | P3/assessment items → SAT; learn-loop items → IM |
| Ask form | Interrogative ≥93%, never imperative | Imperative 43% ("write", "explain") | P3 → interrogative close; practice parts may be imperative |
| Scaffolding | None (0 multipart in 30 items) | 53% multipart, median 4 parts, fading architectures (§4) | Scaffolded archetypes follow IM; assessment items must stand alone |
| Production vs selection | Select/compute (MC + numeric entry) | Produce (write equation, explain) 59% | P1/P2 lean produce; P3 mixes in select with mapped distractors |
| Interpretation | Fixed 13% via one frame | 29% woven as capstones | Instruction ≥25% woven; assessment ≥13% |
| Numbers | 70% clean, messiness deliberate | 62% clean, real prices/quantities | P1 clean; P2/P3 admit realistic values |
| Context | 60% real-world, thin | 96% real-world, data-genuine | Matches our P1 sport → P3 neutral phase ramp |

Recommendation encoded: **instruction items (learn loop, P1/P2 practice) speak IM; assessment
and P3-transfer items speak SAT.** These are two registers of one voice, not two voices —
both put context first and the ask last, both keep FK ≈ 7 or below, both refuse random
distractors.

## 10. Voice contract (the measurable spec)

Instruction register (P1/P2 learn + practice items):
- Stem 30–60 words before parts; 1–3 context sentences before the first ask.
- Multipart: 2–5 parts; part (a) directly computable; exactly one cognitive step added per
  part; final part interprets or generalizes (§4 architectures) in ≥ half of scaffolded items.
- Asks may be imperative; conversational second person allowed; units named inside the ask
  ("…, in runs per game?").
- FK grade ≤ 7; sentences ≤ 15 words median; scenario:math word balance between 70:30 and 50:50.
- Numbers clean at P1; realistic values admitted from P2 onward.

Assessment register (P3 items, summative, transfer checks):
- Stem ≤ ~48 words (SAT p75); 0–2 context sentences; single ask; ask ends with "?" (target
  ≥90% of the bank); no sub-parts. The no-sub-parts rule binds standalone P3 items;
  P3-phase scaffolded practice items follow the instruction register's part rules under
  P3 phase discipline (neutral context throughout).
- MC: exactly 3 distractors, **each one produced by a named taxonomy error path** — 0 random.
- ≥13% of the bank asks interpretation, using a stable frame ("Which sentence says what this
  slope means?" / "…best interpretation of…").
- ~30–40% of items use realistic (non-clean) values with tractable arithmetic.
- FK grade 6–8 — do not under-shoot; students must meet the assessment register before
  they meet it on an exam that counts.

Universal (both registers):
- Order is invariant: context → data → ask. The ask is always last. Never bury it.
- Every wrong option/trap maps to a taxonomy signature (our standard already exceeds the
  corpus; hold it).
- Multi-representation in roughly half of items or more; tables are a first-class data
  vehicle, not just graphs.
- No source pads: IM's length buys scenario genuinely used by the math ("the math *is* the
  context"); if a sentence's data is never consumed, cut it.

---

## 11. Reconciliation — gold node (ALG-L06) vs the measured voice

The identical pipeline ran over `docs/gold-node/gold-node-items.json` (15 items) and the D1
lesson's embedded checks EC1–EC4. Delta table (corpus benchmark → our measured value):

| # | Dimension | Corpus benchmark | Gold node measured | Verdict |
|---|---|---|---|---|
| 1 | Stem length | 32–45 words median across sources | items 35 (27–42); D1 checks 32.5 | **KEEP** — inside corpus band |
| 2 | Context sentences before ask | SAT 1 / IM 3 | 2 | **KEEP** — correctly between registers |
| 3 | Ask position + interrogative close | ask always last; SAT 93% "?" | ask always last; 73% "?" (interactive drag/build items account for the gap) | **KEEP** |
| 4 | Units named in the ask | common in corpus rate items | consistent ("…, in runs per game?") | **KEEP** |
| 5 | Traps per item, taxonomy-keyed | best source: SAT 2.1/item at 97% named | **3.8/item at 100% named**, armed by generator constraints | **KEEP — exceeds corpus standard.** Signature approach validated by §5 |
| 6 | Multi-representation | corpus ~30–50% | 100% (verbal + coordinate plane/table) | **KEEP** — deliberate visual-teaching mandate, exceeds standard |
| 7 | Real-world share | IM 96% / SAT 60% | 67% | **KEEP** — artifact of deliberate P1→P3 phase ramp |
| 8 | Interpretation demand | IM 29% anywhere; SAT 13% | items: 13% — at SAT level, **half of IM**; D1 checks: **0%** | **ADJUST** — the strongest empirical finding against us. Scaffolded items decompose procedure (rise → run → divide) but rarely end by asking what the number *means*; IM ends a third of its items that way. Recommendation: add an interpretation capstone part to scaffolded-multistep items (IM §4.2 pattern) and make one embedded check ask meaning, not computation. No new item count needed — reword/extend existing finals |
| 9 | Multipart architecture | IM median 4 parts; progressions = fading, formalize-then-interpret, transfer | median 2 parts; progression = procedure decomposition only | **KEEP the part count** (adaptive per-part checking favors tight scaffolds) but **ADJUST the composition** — same fix as #8: final parts should interpret/generalize, and at least one archetype should fade abstraction (numeric → variable) rather than only decompose procedure |
| 10 | Clean numbers | no source is 100% clean (SAT 70%, IM 62%, Regents 50%) | **100% clean** | **ADJUST (P3 only)** — P1/P2 cleanliness is correct working-memory design; but P3/assessment items should admit realistic values at the SAT rate (~30% messy) or transfer is rehearsed on a cleaner world than the one that tests it |
| 11 | Reading level | corpus converges FK ≈ 7 (6.7–7.8) | items FK 3.9; D1 checks 3.3 | **KEEP for P1/P2** — the plain-English voice pass was deliberate and the corpus does not license walls of text. **ADJUST for P3**: P3/assessment items should sit at FK 6–8 (SAT register), so the first FK-7 sentence a student meets isn't on a real exam |
| 12 | Ask phrasing variety | each source has stable frames | conversational frames, peer-attributed error analysis ("What did Ava think was true?") — no corpus analog | **KEEP** — our error-analysis and predict-reveal archetypes have no corpus counterpart; they are additive, not drift |

**Summary: 8 KEEP / 3 ADJUST (one of them P3-scoped) / 1 KEEP-with-composition-change.**
The three ADJUSTs are one coherent theme: our gold node out-engineers the corpus on
diagnosis (traps, visuals, taxonomy) but under-asks for *meaning* and under-rehearses the
*assessment register*. Both are additive fixes — extend final parts, retune P3 items — and
neither touches the misconception machinery.

Per instruction, **no gold-node items were modified** in the measurement pass; the ADJUST
rows above record the divergences as measured on 2026-07-05 before any fix.

### 11.1 ADJUSTs applied — post-change re-measurement (2026-07-05)

Matt approved the ADJUSTs; mr-kahn gated the changes (APPROVE WITH CHANGES, all changes
applied); the identical pipeline was re-run on the updated gold node. Rows 8–11 restated
with measured values:

| # | Dimension | Target | Re-measured | Status |
|---|---|---|---|---|
| 8 | Interpretation demand | instruction ≥25% woven (IM: 29%) | items: 20% final ask, **26.7% anywhere** (interpretation capstones added to scaf-01/scaf-04; scaf-02/03 already had meaning parts); D1 checks: **25%** (EC2 reframed from computation to interpretation, same three taxonomy tags in belief form) | **closed** |
| 9 | Multipart composition | final parts interpret or generalize; ≥1 archetype fades abstraction | 4/4 scaffolded items now end interpret-or-generalize; scaf-03 gained a numeric→subscript-notation fading capstone (choice-for-expressions — keypad cannot accept symbolic input); multipart median 2 parts (p75 4), inside the 2–5 contract | **closed** |
| 10 | P3 realistic values | ~30–40% of P3 items non-clean (SAT: 30%) | **40%** (2/5: ea-03 now (2.5, 11)/(12.5, 30), m = 1.9; pr-02 now (1.5, 22.4)/(9.5, 8.4), m = −7/4) — decimal-bearing student-visible data, arithmetic path ≤2 clean steps, all generator constraints and trap distinctness re-verified on the new numbers | **closed** |
| 11 | P3 reading register | FK 6–8 on P3 surfaces | pr-02 FK 6.8, int-03 FK 7.4 (in band). scaf-03 (0.7), disc-01 (3.0), ea-03 (1.1) score below band as **instrument artifacts**: nine-word abstract stems and worked-step lines make FK statistically meaningless; per mr-kahn's ruling the band is a *ceiling* over the full student-visible surface, not a per-sentence floor — minimal P3 stems below band are compliant by design | **closed (scoped)** |

Collateral: traps rose 57 → 65 on items (**4.33/item, still 100% taxonomy-keyed**); item
count, archetype mix, phases, and all pre-existing trap tag identities unchanged. EC2's
rewording is reflected in the D1 lesson's §4 contract preamble, appendix audit table, and
status line (trust-layer rule: the audit trail describes what exists now).

Instrument note: the interpretation regex was extended on 2026-07-05 to catch the
"…says what this slope means" phrasing (a false negative on our own items); re-running
the full corpus under the extended instrument changed **no** corpus value in §3/§7.
