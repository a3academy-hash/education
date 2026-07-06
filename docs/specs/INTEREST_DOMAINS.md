# INTEREST_DOMAINS — vetted interest-domain list for Algebra 1 variants

**Type:** Design spec (design-only). Changes no graph, no items, no Supabase state.
**Status:** DRAFT — for mr-kahn (content/equivalence) + pee-wee (declaration UX) review.
**Date:** 2026-07-03. **Author:** main session (remote/mobile design).
**Consumers:** the **D5 swap-template contract** (per-domain invariance envelope, §4) and **archetype extraction** (which archetypes may be skinned in which domain, §3). Precision matters because a bad skin silently changes item difficulty and corrupts the transfer signal (`new_plan/CLAUDE.md` §9.5).
**Governing rules:** structural-skin rule + interest-suitability triage + strong-default floor + no-story-first-class (`new_plan/CLAUDE.md` §4); interleave by **confusable concept, not story domain** (§1, Axis B); psychometric-equivalence of re-skins (§9.5); RUNTIME interest-variant call is constrained slot-fill, structure-frozen (`RUNTIME_TUTOR_SPEC` §1.3).

---

## 1. Vetting criteria

A domain is viable as an Algebra 1 interest skin only if it clears all five:

1. **Quantitative surface density.** The domain naturally *generates* the quantities algebra needs — rates, linear relationships, systems, growth, distributions — without a contrived narrative bolted on. High density = many concepts map with the math **being** the context, not wrapped in it (structural-skin rule). Low density → the skin becomes a "seductive-details" wrapper that adds extraneous load and *reduces* transfer.
2. **Age-appropriateness (11–14 primary, through 18).** Content the target student recognizes and relates to; nothing mature, unsafe, or values-corrosive. COPPA audience → data-minimization-safe framing (no personal data, no third-party trackers in student surfaces).
3. **Realistic-number availability.** Real reference values exist so items use *plausible* figures. Feeds the item-certification unit/context sanity check (`new_plan/CLAUDE.md` §9.4) — no impossible quantities, no domain absurdities.
4. **Cultural accessibility.** Broadly recognizable with a **low prior-knowledge barrier**; a student who doesn't follow the domain can still read the item. Niche domains are acceptable only as *opt-in light* skins, never as a default floor (interest-suitability triage).
5. **Structural-skin + equivalence compatibility.** The domain must be skinnable **without changing** the numeric structure, difficulty tier, misconception-detection signatures, or answer of the underlying certified item (§4). A domain whose realistic framing forces the numbers to change (or introduces ambiguity the neutral item didn't have) fails this test for the concepts it distorts — even if it passes for others.

**Coverage rule:** a domain is rarely all-or-nothing. Most "accept" verdicts are **scoped** — the domain carries some concepts at full fidelity and others weakly. The per-domain surface map (§3) is the real output; accept/reject (§2) is the headline.

---

## 2. Candidate vetting (accept / reject)

The six **platform sports** (`baseball, softball, basketball, soccer, football, volleyball` — schema `sports[]` + `CLAUDE.md`) are committed and near-equivalent in surface; they're vetted together. `neutral` (no-story) is not an "interest" — it is the **first-class default floor** (§5), not a domain in this list.

| # | Candidate | Verdict | Reasoning |
|---|---|---|---|
| 1 | **Baseball** (default anchor) | **ACCEPT — full** | Densest sports surface: batting avg (ratios/rates), HR-per-game (slope), ERA, cumulative stats over a season (linear/sequences), win-loss systems. Abundant realistic data. The gold node (ALG-L06) is baseball-anchored, so it is the calibration reference. |
| 2 | **Softball** | **ACCEPT — full** | Platform sport; near-identical statistical surface to baseball. Reuses baseball archetypes 1:1 with noun swaps. |
| 3 | **Basketball** | **ACCEPT — full** | Points/assists/rebounds per game (rates/slope), shooting % (ratios), pace, +/- (signed rate — good for negative slope), scoring over a season (linear). High accessibility. |
| 4 | **Football (American)** | **ACCEPT — full** | Yards per carry/attempt (rates), yards over drives (linear), field position (signed number line, negative values natural), scoring systems. Rich but slightly higher prior-knowledge barrier than basketball. |
| 5 | **Soccer** | **ACCEPT — full** | Goals/assists per match (rates), possession % (ratios), goal difference (signed), points-per-match tables (linear/systems). Globally accessible — best cross-cultural reach of the sports. |
| 6 | **Volleyball** | **ACCEPT — full** | Platform sport. Kills/digs/aces per set (rates), hitting % (ratios), rally scoring (sequences/cumulative). Slightly narrower stat vocabulary than the ball sports but fully sufficient. |
| 7 | **Personal finance** | **ACCEPT — full (realistic-number care ⚠️)** | Extremely dense and *transfer-valuable*: budgeting (linear equations/inequalities), saving over time (linear/arithmetic sequences), simple vs compound interest (**exponential growth — E/P domain**), unit price comparison (ratios/systems), depreciation (decay). Age-appropriate and life-relevant. **Care:** plausible rates only (§6). |
| 8 | **Gaming stats / in-game economies** | **ACCEPT — full (scope + care ⚠️)** | XP-to-level curves (**exponential/sequences**), resource farming rate (slope), damage-per-second (rate), win rate (ratio), in-game currency budgets (linear/systems). Very high engagement, high accessibility for this cohort. **Care:** keep to XP/scores/resources; **avoid loot-box / gambling monetization framing** (§6). |
| 9 | **Fitness / training** | **ACCEPT — scoped (realistic/health care ⚠️⚠️)** | Pace and distance-over-time (slope/linear), progressive overload (arithmetic sequences), heart-rate zones (ranges/inequalities), calories as rates. **Care (high):** teen-safe, performance-framed numbers only — no extreme weights, no calorie-deficit / weight-loss / body-composition framing (disordered-eating risk). Frame as *training performance*, never *weight loss* (§6). |
| 10 | **Cooking / recipes** | **ACCEPT — scoped (narrow)** | Best-in-class for **ratios, proportions, and scaling** (double/halve a recipe, unit conversion), and unit-price systems. **Weak** for slope-as-rate-of-change, exponentials, and quadratics — those become contrived. Route non-ratio concepts to default. High accessibility, safe numbers. |
| 11 | **Music production** | **ACCEPT — light (niche)** | Carries specific concepts well: BPM/tempo & beats-over-bars (rates/linear), streaming/play counts over time (linear/exponential growth), track/layer counts. dB and pitch are **logarithmic** — usable for later exponential/log intuition but a **distortion risk** for linear items (a "louder = +units" framing is false). **Light treatment**, narrow concept set; route the rest to default. Moderate accessibility → opt-in only, never default. |
| 12 | **Social media analytics** | **ACCEPT — light (values + COPPA care ⚠️⚠️)** | Follower/subscriber growth over time (linear & **exponential**), engagement rate (ratios/percent), reach vs impressions (ratios). Genuinely dense for growth concepts. **Care (high):** frame as a **generic creator's channel**, never a student's personal account (COPPA/data-minimization; no third-party trackers in student surfaces); avoid figures that normalize vanity-metric fixation or "going viral" as an expectation (§6). Light, opt-in. |
| 13 | **Weather & climate data** *(added)* | **ACCEPT — full** | Temperature trend over days (slope, signed values natural), rainfall accumulation (linear/cumulative), scatter + trend line (**data/stats domain**), seasonal cycles. Neutral-adjacent, culturally universal, abundant realistic data. Excellent bridge between skinned and neutral tracks. |
| 14 | **Travel / road trips (distance–rate–time)** *(added)* | **ACCEPT — full** | The classic algebra surface: `d = rt` (direct variation, linear), fuel use (rates), two-vehicle overtake (**systems of equations**), cost budgeting. Universal, safe, high density across linear + systems. |
| 15 | **Automotive (speed / fuel economy / depreciation)** *(added)* | **ACCEPT — scoped** | Fuel economy (rates/ratios), speed–time (linear), **depreciation (exponential decay)**, cost systems. Good for rate/decay; overlaps travel for motion. Slightly higher prior-knowledge barrier. |
| — | Retail / shopping deals | **FOLD into Personal finance** | Real quantitative content (discounts, unit price, budgeting) is a sub-context of personal finance; not a separate domain. |
| R1 | **Astrology / horoscopes** | **REJECT** | No genuine quantitative surface; pseudoscience; any "math" is arbitrary and would distort. Fails criteria 1 and 5. |
| R2 | **Movie / book / franchise plot trivia** | **REJECT** | The engaging part is narrative, not quantity — inevitably a seductive-details wrapper around generic numbers (violates the structural-skin rule, criterion 5). Box-office numbers alone → route to a finance/growth skin instead. |
| R3 | **Fashion / aesthetics (as style)** | **REJECT as a domain; route to finance** | Style has no quantitative surface; only its *commerce* (budgets, unit price, sale math) does — which is personal finance. Don't skin math as "outfits." |

**Accepted (13 domains + neutral floor):** baseball, softball, basketball, football, soccer, volleyball, personal finance, gaming, fitness, cooking, music (light), social media (light), weather, travel, automotive. *(15 if music/social counted; "light" = opt-in, narrow.)*

---

## 3. Per-domain quantitative surface map

Concept spine (from the graph domains): **ratios/rates** (F10), **linear equations & inequalities** (E-domain), **slope / rate of change** (L05/L06/L19-proposed), **linear functions & graphing** (L07–L10), **systems** (S-domain), **exponential growth/decay** (P-domain), **sequences / direct variation** (L17/L18), **quadratics** (Q-domain), **scatter/trend/stats** (L16, D-domain). Legend: ● full fidelity · ◐ workable · ○ contrived → route to default.

| Domain | Ratios/rates | Slope/RoC | Linear fns | Systems | Exp growth/decay | Sequences | Quadratics | Scatter/stats |
|---|---|---|---|---|---|---|---|---|
| Baseball/Softball | ● | ● | ● | ◐ | ○ | ◐ | ◐ (proj.) | ● |
| Basketball | ● | ● | ● | ◐ | ○ | ◐ | ○ | ● |
| Football | ● | ● | ● | ◐ | ○ | ◐ | ◐ (punt arc) | ● |
| Soccer | ● | ● | ● | ◐ | ○ | ◐ | ○ | ● |
| Volleyball | ● | ◐ | ◐ | ○ | ○ | ◐ | ○ | ● |
| Personal finance | ● | ● | ● | ● | ● (interest) | ● (savings) | ○ | ◐ |
| Gaming | ● | ● | ● | ◐ | ● (XP curves) | ● (levels) | ○ | ◐ |
| Fitness | ● | ● | ● | ○ | ○ | ● (overload) | ○ | ◐ |
| Cooking | ● | ○ | ○ | ◐ (unit price) | ○ | ○ | ○ | ○ |
| Music (light) | ◐ | ◐ (BPM) | ◐ | ○ | ◐ (streams) | ◐ | ○ | ○ |
| Social (light) | ● (eng. rate) | ◐ | ◐ | ○ | ● (follower growth) | ◐ | ○ | ◐ |
| Weather | ● | ● | ● | ○ | ◐ | ◐ | ○ | ● |
| Travel | ● | ● | ● | ● (overtake) | ○ | ○ | ○ | ○ |
| Automotive | ● | ● | ● | ◐ | ● (depreciation) | ○ | ○ | ◐ |

**Realistic-number guidelines (per domain, condensed):** sports — league-plausible stat ranges (batting avg .200–.350, not .900); finance — savings 1–5% APY, credit 15–25% APR, prices in-market (§6); gaming — level curves that actually compound, scores in observed ranges; fitness — teen-safe paces/reps, **no** weight/calorie-deficit figures (§6); cooking — real serving sizes and ingredient ratios; music — 60–180 BPM, plausible stream counts; social — realistic growth (not overnight-viral) (§6); weather — regionally plausible temps/precip; travel — legal speeds, real distances, plausible mpg; automotive — real mpg, market prices, 10–20%/yr depreciation.

**Known failure modes (contexts that distort the math or add ambiguity):**
- **Cooking → slope/RoC, exponentials, quadratics:** no natural "rate of change over an interval"; forcing it invents fake scenarios. Route these concepts to default.
- **Music → linear via loudness/pitch:** dB and pitch are logarithmic; "+3 units louder" is physically false and mis-teaches linearity. Only use count/tempo/time framings for linear items.
- **Sports → systems/exponentials:** two-team "systems" are often contrived; exponential framings (a stat "doubling each game") are unrealistic. Keep systems to genuine two-constraint setups; route exponentials to finance/gaming/automotive.
- **Social/gaming → any concept with "engagement/virality":** vanity framings can imply unrealistic growth; cap at plausible curves (§6).
- **Volleyball/football → quadratics:** projectile framings (spike arc, punt) are tempting but the physics rarely matches the item's intended parabola cleanly — verify or route to default.
- **Universal:** any framing that makes the *realistic* number differ from the certified item's frozen number is a failure — the number is frozen (§4); if realism and the frozen number conflict, the domain doesn't carry that item.

---

## 4. Invariance contract per domain (the D5 swap-template envelope)

Every skin is a **structure-frozen re-render** of an already-certified neutral item. This mirrors the RUNTIME interest-variant call (`RUNTIME_TUTOR_SPEC` §1.3: "may not change the underlying math, units, difficulty, or answer") and the psychometric-equivalence requirement (`new_plan/CLAUDE.md` §9.5).

**What SWAPS (the interest slot):**
- **Nouns / entities** — "games" → "matches" / "days" / "workouts" / "levels"; "hits" → "goals" / "reps" / "streams".
- **Scenario framing** — the one-sentence situation the numbers live in.
- **Unit labels** — the *names* of units (games, dollars, seconds, sets), chosen so the quantity type stays dimensionally faithful (a rate stays a rate).

**What is FROZEN (identical across every skin of the same item):**
- **Numeric structure & values** — every parameter (P₁, P₂, Δx, Δy, coefficients), the correct answer, and the *magnitudes* (only the labels differ, never the numbers).
- **Misconception detection signatures** — the exact trap values and their entry IDs in `misconceptionMap` (e.g. Δy, −m, 1/m, m·s_x/s_y). A skin may not change which wrong answers map to which taxonomy tags, or the collision-avoidance generator constraints (slope taxonomy §2.15).
- **Difficulty tier** — the certified difficulty (1–3) and IRT parameters; the skin must be psychometric-equivalent (§9.5), so it cannot add reading load, ambiguity, or prior-knowledge barriers the neutral item lacked.
- **Hint-ladder mapping** — the 3-rung ladder (root probe → targeted counter → worked micro-step) keys to the same entry IDs; only the *nouns* in the templated hint text swap.
- **Phase** — P1/P2/P3 designation and the P3-neutral mastery requirement are unaffected by the skin.

**Swap-validity gate (per rendered variant):** the swap is valid only if (a) all frozen elements are byte-identical to the neutral certified item except noun/unit labels, (b) every realistic-number guideline for the domain is satisfied by the *labels* without touching the *values*, and (c) the domain's surface map (§3) marks the item's concept as ● or ◐ for that domain. Fail any → **fall back to neutral** for this item (§5). This gate is the D5 contract the archetype-extraction and RUNTIME interest-variant paths both enforce (solver-verified "structureUnchanged" flag, `RUNTIME_TUTOR_SPEC` §3.3).

---

## 5. Student declaration UX

**Onboarding — diagnostic preference sampler, not a bare interest form** (`new_plan/CLAUDE.md` §4). Show 5–6 *worked example problems* across a spread of domains (a sport, finance, gaming, weather, and a **no-story/abstract** sample), and let the student pick **after seeing** them. "No-story / abstract-first" is a **first-class choice**, not a fallback — abstract-first learners select it directly and get the neutral track by preference.

**How many active domains.** Declare **1 primary + up to 2 secondary** (≤3 total). But **only one skin is active per concept at a time** — because interleaving is by **confusable concept, not story domain** (`new_plan/CLAUDE.md` §1, Axis B): mixing baseball/finance/gaming *within* a slope-vs-rate discrimination set is noise. Domains **rotate across nodes/sessions** for variety and transfer breadth; they do **not** mix inside a single discrimination set.

**Ongoing signals.** Declared interest is a **personalization layer on a strong default floor**, never the foundation. Adjust the active skin from engagement/completion signals per domain (opt-in, visible to the student); let the student re-pick any time. Ring/streak metrics never feed this (they measure return, not learning — §12/§14).

**Fallback when a declared interest has weak coverage** (interest-suitability triage, `new_plan/CLAUDE.md` §4):
1. If the concept is ● or ◐ for the declared domain (§3) → skin it.
2. If the concept is ○ (contrived) for the declared domain → **route that concept to the strong default**: first a *secondary* declared domain that carries it, else the **baseball anchor** (calibration reference) or **neutral no-story**. Never force a contrived skin.
3. Cold-start / no declaration → curated broad-appeal default (baseball anchor or neutral), same item quality, just an untailored context. **Nobody gets lower-quality items for not declaring.**

---

## 6. Domain safety constraints

Two tiers. **§6.1 hard constraints** are non-negotiable generation constraints with enumerated **banned quantities** — a violation is a **fatal-class failure**, not a quality flag. They carry into the downstream specs: enforced as **fatal audit checks** in `BATCH_REGEN_SPEC` §6 and as **template-certification requirements** on the RUNTIME interest-variant call (`RUNTIME_TUTOR_SPEC` §1.3 / §3.3). **§6.2 advisory guardrails** are realistic-number quality flags enforced at item certification.

### 6.1 Hard generation constraints (fatal-class — child-safety, not quality)

These bind at **generation**, at the **Fable audit gate** (fatal), and at **RUNTIME interest-variant template certification**. A skin that trips a banned quantity is **rejected outright and falls back to neutral** — it never advances to staging (regen) and never renders to a student (runtime). No amount of "otherwise-good" item quality offsets a violation.

**Fitness / training — performance-framed only.**
- **Required framing:** every quantity is a *training-performance* measure — pace, distance, time, speed, reps, sets, training load (volume as sets × reps × resistance, framed as performance), heart-rate *zones*.
- **BANNED quantities (fatal if present as a quantity, target, or framing):** body weight; weight change / weight-loss / weight-gain targets; **calories** (intake or burn used as a weight lever); body-fat %, BMI, or any body-composition figure; measurement/clothing sizes; any "before/after" or deficit/surplus framing. Rationale: disordered-eating risk in an 11–14 audience.
- **Test:** the item must read as *"how fast / how far / how many reps,"* never *"how much you weigh / how many calories / how much to lose."*

**Social media analytics — growth-rate math on fictional accounts only.**
- **Required framing:** the math is **rate-of-change / growth-rate** work (percent change, doubling time, linear/exponential growth) on a **clearly fictional, generic account** ("a fictional creator's channel," made-up handle).
- **BANNED quantities/framings (fatal if present):** follower / subscriber / like / view **counts presented as a norm, goal, target, or benchmark** ("you'd need X to…", "a good channel has…"); "going viral" or overnight-growth framing; any **real or student-identifiable account** or personal data; comparative vanity framing between the student and the numbers. Raw counts are allowed **only** as neutral inputs to a growth-rate computation, never as an aspiration.
- **COPPA posture:** the audience is largely under 13 → COPPA applies. **No** personal data, **no** real accounts, **no** third-party trackers or live-platform references in any student surface; accounts are fictional and inert. Consistent with `CLAUDE.md` privacy posture (COPPA, data minimization, no third-party trackers in student surfaces).
- **Test:** the item must read as *"this fictional channel grew from A to B — what's the rate?"*, never *"how many followers should you get."*

### 6.2 Advisory guardrails (realistic-number quality — enforced at item certification)

| Domain | Care | Guardrail |
|---|---|---|
| **Personal finance** | ⚠️ Plausible rates & prices | Savings **1–5% APY**; credit/loan **15–25% APR**; prices in real market ranges; simple before compound. **No** "double your money" / get-rich figures. Interest-rate items must use rates a student would actually encounter. |
| **Gaming** | ⚠️ No monetization framing | XP/scores/resources only. **No** loot-box, gacha, or gambling-style probability/spend framing — keep it to skill/progression math. |
| **Cooking** | ⚠️ Real portions | Serving sizes and ingredient ratios that reflect actual recipes; scaling factors that stay in plausible ranges. |
| **Music (light)** | ⚠️ Avoid log-as-linear | Use tempo/time/count framings for linear items; keep dB/pitch (logarithmic) out of linear contexts to avoid mis-teaching linearity. |

The §6.2 guardrails are enforced at **item certification** (unit/context sanity, `new_plan/CLAUDE.md` §9.4) — a skin that violates one fails certification and falls back to neutral (§4 swap-validity gate). The §6.1 hard constraints are enforced *additionally* as **fatal** at the audit gate and at runtime template certification — a stricter bar because they are child-safety, not realism.
