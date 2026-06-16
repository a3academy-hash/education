# STYLE_GUIDE.md — A3 Adaptive Math Course (Visual & Interaction System)

**Version:** v0.2 (post board-review: Claude / Grok / ChatGPT)
**Companion to:** CLAUDE.md (course) and DIAGNOSTIC.md.
**Subject grounding:** A3 Academy. Students are baseball players; coaches are their instructors.
Audience: athletes ~10-18, plus parents and coaches who must TRUST the product. The job: feel
like the best private-school education AND as engaging as a game — as ONE coherent product.

---

## 0. What v0.2 changed (provenance)

Both external reviewers independently nominated the SAME fatal flaw and converged on the fixes:

1. **Fatal flaw fixed: the three-register model read as three separate products** (white test +
   dark lesson + gamified ring app). v0.2's central change: **one A3 instrument system across
   every surface.** The measurement-vs-motivation firewall is now a BEHAVIORAL rule (rewards
   muted during tests), NOT a visual-language split (§1).
2. **Contrast failures fixed** — gold, mastery-green, and focus-blue all failed as text on
   white; raised-surface boundary was invisible. Tokens now resolve by surface, with a full
   audit (§2, §9).
3. **The moat got visual: math rendered as baseball performance instrumentation** (TrackMan /
   film-room / strike-zone), not generic glowing math or neon markers (§6).
4. **Dopamine language rewritten** to a non-manipulative ethic (predictable progress, variable
   presentation, never variable outcomes, no loot-box mechanics) (§5).
5. **Fraunces replaced** (too editorial/soft for an athletic academy) with Source Serif 4;
   Inter rejected as the default the brief warns against (§4).
6. **Motion specs made implementation-ready** (§7). **Adult dashboards gain urgency + proof
   modules** (§8.5, §8). **Age-split replaced by a student-switchable Training/Boost mode** (§8.6).

---

## 1. Organizing thesis: ONE instrument, three modes

**Calm is the resting state. Reward is the event. But it is all ONE product.**

The student moves rapidly diagnostic -> lesson -> dashboard -> review. If each surface has a
different emotional register AND a different visual language, the product feels stitched
together. So we separate the *behavior* of the registers, not the *identity* of the product.

**Shared across every surface (the A3 instrument system):**
- Same top chrome / nav.
- Same typography.
- Same ring/progress instrument — present everywhere, **muted/inactive during tests.**
- A persistent **mode indicator** ("Training mode" / "Measurement mode — focus on accuracy") so
  the student always knows where they are inside the same product.

**What differs by mode (behavior, not identity):**

| Mode | Surfaces | Behavior | Reward layer |
|------|----------|----------|--------------|
| **Trust** | Site, tests, reports, parent/coach dashboards | Calm, precise, sober | Muted/absent; calm progress only |
| **Focus** | Lessons, videos | Immersive dark canvas, content-forward | Rationed milestone rewards |
| **Reward** | Earned moments inside Focus + the learner dashboard | Celebratory, motion | The event — rare, designed |

Dark lessons still carry navy/white trust elements; white tests still carry the same progress
instrument (just non-rewarding). The firewall (course §12: motivation != measurement) is
preserved as **"no rings/points/streaks/celebration during a gated test,"** while the product
still looks and feels like one thing.

**Signature element:** the **mastery instrument** — rings rendered as baseball performance
gauges (clean arc, Plex-Mono readout, gold cap on lock), reading like tracking gear. One
memorable thing; everything else stays quiet.

---

## 2. Color tokens (resolve by surface)

The core fix: tokens have an **on-light** and **on-dark** value. Bright/saturated values are
fills on the dark canvas ONLY; on white they darken to pass contrast.

### Trust / on-light
- `--ink` #0E1B2C — text (17.3:1 on white, passes).
- `--surface` #FFFFFF; `--surface-subtle` #F5F7FA.
- `--surface-test` #F8FAFC — tests use a faint navy-tinted white so the jump to dark lessons is
  one step, not a hard white->black cut.
- `--brand-navy` #16335C — authority accent.
- `--text-muted` #5A6B82 (5.4:1 on white, passes).
- `--hairline-decorative` #DCE3ED — dividers only.
- `--border-meaningful` #9AA8BA — input/UI boundaries that must be seen (>=3:1).

### Action / reward — on-light (text/icon safe)
- `--blue-on-light` #2563EB (Focus).
- `--green-on-light` #168A4A (Mastery/progress, "on track").
- `--gold-on-light` #B45309 (Earned — for text/icon on white; never #F4B528 on white).
- `--retrieval-on-light` #D97706 (Retrieval — moved OFF violet for colorblind separation).
- `--error-on-light` #E5486D (misconception; never paired with green by color alone).

### Reward — on-dark fills (bright, dark canvas only)
- `--blue-fill` #3D7BF2, `--green-fill` #2FBF71, `--gold-fill` #F4B528,
  `--retrieval-fill` #D97706.
- `--reward-burst` radial gold -> white, tinted by the closing ring's hue (dark surfaces, or
  with a `--ink` outline on light).

### Focus canvas + highlighters
- `--canvas` #0B0F17 (blue-black; not #000).
- `--canvas-raised` #1E293B with `--canvas-border` #334155 (the old #141A26 was a 1.1:1
  invisible boundary — fixed).
- Highlighter set on canvas (all pass; use 1-2 per frame, never all at once):
  `--mark-chalk` #F2F5F8 (17.5:1), `--mark-cyan` #2DD4EF (10.8:1), `--mark-lime` #B6F23A
  (14.4:1, correct/growth), `--mark-amber` #FFC23D (11.9:1, key step), `--mark-magenta`
  #FF4D8D (6.1:1, misconception).

---

## 3. The mastery rings (hue + icon + pattern — three channels)

Three rings (course §12), differentiated on THREE channels so they read in grayscale and for
colorblind users:

| Ring | Hue (on-light / on-dark) | Pattern | Icon | Meaning |
|------|--------------------------|---------|------|---------|
| **Focus** | #2563EB / #3D7BF2 | solid | crosshair / focus dot | active concentration |
| **Mastery** | #168A4A / #2FBF71 | solid, **gold cap ONLY at lock** | upward track / growth | durable progress |
| **Retrieval** | #D97706 | **dashed/segmented** | circular-arrow / recall | memory reps |

**Gold means EARNED, full stop.** No green->gold gradient on ordinary progress (both reviewers
insisted). The Mastery ring is green while filling; gold appears only as a terminal cap at the
mastery-lock / level-up event. This keeps gold potent.

Every ring exposes ARIA: "Mastery ring 82% — transferring." Color is never the sole signal —
icon + label + Plex-Mono % always present.

---

## 4. Typography

- **Display — `Source Serif 4`** (open-source; institutional, credible, NOT soft/editorial).
  Replaces Fraunces. Headlines/major moments only, used with restraint. (Paid alt if ever
  licensed: Tiempos Headline.)
- **Body / UI — DECISION FORK (flag for A/B with real parents + athletes):**
  - `Hanken Grotesk` — warmer, a touch more "school."
  - `IBM Plex Sans` — unifies with Plex Mono into one family, reads "technical performance
    academy." **Leaning Plex Sans** for system coherence with the TrackMan identity.
  - `Inter` is REJECTED — it is the generic default the design brief explicitly warns against.
- **Data / numerics — `IBM Plex Mono`** (tabular figures). Scoreboard/TrackMan readouts: rings,
  scores, timers, stat panels. Restrict to numerics/labels/telemetry; not long text.
- **Math — KaTeX**, styled SEPARATELY for white tests vs. dark lessons; crisp, aligned, copy-safe.

---

## 5. Reward & dopamine ETHIC (non-manipulative by design)

Reward design must not borrow gambling/social-media/loot-box mechanics. The principle:

- **Predictable progress, variable PRESENTATION — never variable OUTCOMES.**
- Celebrate **competence milestones**, never random luck. No mystery rewards, no surprise
  advantages, no loot boxes.
- Reward durable learning: the strongest celebration is tied to the **delayed unseen re-check
  pass** (course §3) — "proof it stuck" — not the first correct answer.

**Celebration cadence (5 levels):**
1. Correct answer -> no celebration; subtle state confirmation only.
2. Good streak inside a lesson -> short microcopy only, no burst ("Gap closed — nice read").
3. Node provisional -> ring sweep, no gold.
4. Node mastered after delayed re-check -> **gold cap + short burst** (the real dopamine moment).
5. Level / course milestone -> full celebration, rare, <=1.2s.

**Cadence rules:** no burst more than **once per 90 seconds**; no sound by default on desktop;
optional haptic on mobile; reduced-motion -> static badge + number update. Variety in
presentation (which burst, which microcopy) sustains novelty without manipulation.

---

## 6. Baseball-native visual language (the moat)

The differentiator is NOT neon markers (that is un-ownable 3Blue1Brown / generic dark mode). It
is **math rendered as athletic performance instrumentation.** Borrow the vernacular of baseball
tracking across Focus surfaces:

- **Videos / lessons:** strike-zone grid lines as the coordinate plane; "film-room" annotation
  behavior (coach marking film); stat-panel overlays in Plex Mono; rate/slope/velocity visuals
  that feel like TrackMan/HitTrax, not generic glowing equations.
- **Rings:** performance gauges, not generic progress circles.
- **A slope problem looks like a launch-angle readout; a rate problem like a velocity track.**
  This ties the sport-contextualized teaching layer (course §4) into the visual system and is
  the thing that makes A3 un-clonable.
- **Trust surfaces** carry restrained baseball DNA too: thin navy pinstripe dividers, a subtle
  stitch texture in headers, an A3 monogram lockup — calm, but unmistakably A3, not generic
  edtech.

---

## 7. Layout, spacing, motion (implementation-ready)

- **Grid:** 8px base. Trust = generous air; Focus = immersive, content-forward.
- **Motion timings:**
  - Trust transitions: 120-180ms ease-out.
  - Focus annotation draw-on: 250-450ms.
  - Ring sweep: 600-900ms.
  - Burst: <=700ms; full milestone celebration <=1.2s.
  - **Throttle:** no celebration more than once / 90s.
  - **Reduced motion (`prefers-reduced-motion`):** instant state change + 150ms opacity fade;
    information never gated behind motion (vestibular safety).

---

## 8. Per-surface specifications

### 8.1 Website / marketing (Trust)
Enterprise, private-school, best-in-class: navy + white + air, Source Serif 4 sparingly, sober
proof over hype, restrained A3 baseball DNA. Hero opens on the live mastery instrument or a real
interactive atom, not a stock big-number-gradient.

### 8.2 Interactive lessons (Focus + rationed Reward)
Dark canvas, shared chrome, the predict/construct -> resolve atom centered. Highlighter feedback
(lime = correct, magenta = misconception). Concreteness fading (course §1) is visual: the canvas
gets cleaner as abstraction rises. TrackMan-style instrumentation for rate/slope content.

### 8.3 Tests & diagnostic (Trust — rewards muted, NOT motivation)
`--surface-test` faint-navy white, same chrome, **same progress instrument shown but inactive.**
NO rings filling, points, streaks, correctness feedback, or bursts (firewall). BUT keep calm
non-reward support: "Question 12 of about 40," "you can pause after this section," "this helps
place you correctly." Celebration resumes AFTER results, in the dashboard. (DIAGNOSTIC §6, §9.)

### 8.4 Videos (Focus)
Dark canvas + restrained highlighter as briefed, elevated past generic tutorial via §6:
strike-zone grids, film-room annotation, Plex-Mono stat panels, TrackMan-style readouts.
Captions in body face; math in dark-styled KaTeX; numerics in Plex Mono.

### 8.5 Dashboards
- **Learner (Trust base + Reward energy):** section instruments, distance-to-mastery, streaks,
  the signature mastery gauge. Dopamine welcome here.
- **Coach / parent (Trust + URGENCY, never confetti):** sober data, but with **intervention
  severity** — green on-track / amber watch / rose intervention-needed — and an always-present
  **"what to do next."** Too-sober risks coaches not acting. Plus **proof modules** (see §below).

### Trust = restraint AND proof
Parents trust specificity as much as restraint. Trust surfaces carry: "Why this placement?",
evidence count per node, **provisional vs. confirmed** labels, last re-check date, and a
plain-English confidence band. This wires the trust aesthetic to the validation substance
(course §3, DIAGNOSTIC §13).

### 8.6 Reward intensity = mode, not age
Replace the hard age-split with a **student-switchable preference:**
- **Training Mode** = restrained performance-analytics (default for older athletes).
- **Boost Mode** = slightly more celebratory (default for younger).
Default by age, but let students switch within guardrails. Maturity does not map to birthday.

---

## 9. Contrast audit (reconciled, both reviewers' calculations)

**Fixed failures (do NOT ship the originals):**
| Pairing | Ratio | Status | Fix |
|---------|-------|--------|-----|
| `#F4B528` gold on white | 1.83:1 | FAIL text | `--gold-on-light` #B45309; bright gold = dark-canvas fill only |
| `#2FBF71` green on white | 2.38:1 | FAIL text | `--green-on-light` #168A4A on white |
| `#3D7BF2` blue on white | 3.95:1 | FAIL normal text | `--blue-on-light` #2563EB |
| `#8B5CF6` violet on white | 4.23:1 | FAIL (marginal) | retired — Retrieval -> #D97706 |
| `#141A26` raised on `#0B0F17` | 1.10:1 | FAIL boundary | raised #1E293B + border #334155 |
| `#DCE3ED` hairline (as UI boundary) | 1.29:1 | FAIL boundary | meaningful borders -> #9AA8BA |

**Passes:** ink #0E1B2C on white 17.3:1; muted #5A6B82 on white ~5.4:1; all highlighters on
`#0B0F17` (chalk 17.5, cyan 10.8, lime 14.4, amber 11.9, magenta 6.1).

**Standing rules:** non-text UI components >=3:1; thin highlighter lines treated as 3:1 UI
components (bump stroke or add subtle glow); run actual colorblind simulators on ring + error
states; ARIA on rings; explicit keyboard + announcement paths for constructed-response and
coordinate-plane items (DIAGNOSTIC §10); respect reduced motion.

---

## 10. Assumptions still to attack
1. The single shared instrument system + muted-in-test rewards actually resolves fragmentation
   without weakening the measurement firewall.
2. Gold-cap-only-at-lock reads as rewarding enough during long Mastery fills.
3. Baseball-instrumentation visuals strengthen identity without alienating the 10-12 cohort or
   any future non-baseball context.
4. Source Serif 4 + (Plex Sans or Hanken) + Plex Mono reads "private-school best-in-class" to
   parents AND "performance, not babyish" to teen athletes.
5. The 90s celebration throttle + delayed-recheck-tied rewards sustain motivation without
   habituation or manipulation.

## 11. Open decision for the human
**Body font: IBM Plex Sans vs. Hanken Grotesk.** Leaning Plex Sans (unifies with Plex Mono,
"technical performance academy" identity). A/B with real parents + athletes before locking.
