# A3 EDUCATION — VIDEO STYLE SPEC

Binding production standard for all A3 Education lesson videos. Every build prompt
should reference this file ("follow VIDEO_STYLE.md") instead of restating these.
When a video needs to deviate, state the deviation explicitly in the build prompt;
otherwise these defaults are authoritative.

Lives in the video sandbox root. Read by Claude Code at build time.

---

## WATERMARK (persistent, every video)
- Text: "Algebra 1"
- Position: bottom-right corner, with a small margin from the edges.
- Style: small, dim — ~45% opacity, in off-white or a muted version of one accent
  so it brands without competing with the math.
- Persistent the ENTIRE runtime, never animated, sits beneath all active content.
  It should be legible but easy to ignore — a label, not a focal point.

## FORMAT
- Resolution: 1920 × 1080 (16:9)
- Frame rate: 30 fps
- Duration target: 90 sec for a single concept; up to ~3:30 for a multi-example
  teaching video. If a lesson runs past ~3:00, prefer splitting into Part 1 / Part 2
  over one long video (middle-school attention).
- Frame count = seconds × 30 (e.g. 165s = 4950 frames). Set composition duration to match.

## VISUAL REGISTER
- Background: BLACK (near-black, ~#0a0a0a — true black can flatten; a very dark
  charcoal reads richer on most screens). Always dark.
- Bold, vibrant, high-contrast, eye-catching — engaging "eye candy" that competes
  for a kid's attention against the rest of their feed. NOT enterprise, NOT calm,
  NOT a textbook. This deliberately diverges from the platform UI (which is the calm
  workspace); video is the hook, and its job is to be visually exciting.
- Think 3Blue1Brown energy: bright math glowing on a dark field, but warmer and more
  playful — marker/handwritten character, vivid color, motion that delights.
- Internal consistency is the rule: every video shares THIS dark-neon language so the
  set feels like one channel. Bold, never boring; vivid, never cluttered.

## COLOR PALETTE (vibrant, on black)
- Bright pink / magenta: #ff2e88 (primary pop — emphasis, key terms, the "wow")
- Bright green: #39ff8b (positive / correct / confirm)
- Bright yellow: #ffe14d (vocabulary / highlights / callouts)
- Bright cyan/blue: #3ad7ff (secondary accent — axes, structure, second curves)
- Text default: bright white #ffffff or off-white for body; color for emphasis
- Grid lines: dim gray (#333–#444) so they sit BEHIND the bright content
Colors should GLOW against the black — full saturation, high brightness. Where it
helps, a soft outer glow/bloom on key strokes adds the neon feel. Use color to
MEAN something (pink=emphasis, green=right, yellow=vocab) so it's not just decoration.

## TYPOGRAPHY
- Display / titles / emphasis: a bold MARKER or HANDWRITTEN-style font — energetic,
  hand-made character (e.g. a marker/brush/handwriting typeface), not a stiff serif.
  This is the personality of the series.
- Labels / smaller annotations: a clean, friendly sans can support the handwritten
  display where needed for legibility.
- Math notation: KaTeX-quality, ALWAYS real notation — true raised superscripts
  (3², t², x²), real minus signs (−3, not a hyphen), stacked fractions, proper
  radicals — but rendered in the BRIGHT palette on black, not muted. Never ASCII-style
  (3^2) on screen except when deliberately teaching the caret keyboard shortcut.

## ANNOTATION STYLE
- Hand-drawn MARKER feel for circling, underlining, arrows, and emphasis: a single
  slightly-imperfect stroke that DRAWS IN over ~0.5s, like a bright marker on a dark
  board — with the neon glow. This is a signature of the series, now bolder and more
  vivid. Bright pink/green/yellow strokes.
- Reasoning annotations appear AS the narration says them — never before
  (no spoiling an answer ahead of the explanation).

## FIGURES / ILLUSTRATION
- NO human figures or silhouettes, ever. (They consistently read poorly.)
  Orientation and context come from labeled axes, boxes, and clean diagrams —
  now rendered bright-on-black.
- Keep any object (ball, fountain, platform) minimal and geometric, but it CAN glow /
  have vivid color — a ball can be a bright glowing dot with a trail, not a dull
  circle. Make objects feel alive.
- The math is always the star; illustration supports it — but the whole frame should
  be visually energetic, not sparse.

## ANIMATION / TIMING
- Ease-in-out on all motion; deliberate, never snappy.
- Plotting/movement happens in the sequence the narration describes (e.g. for a
  coordinate point: move along x first, THEN y — never diagonally to the point).
- Sentence breaks and em-dashes in the script are HOLD points; let beats breathe.
- The conceptual-payoff beat of each video gets the most room.

## VOICE (ElevenLabs)
- Tone: warm, conversational, a real teacher in the room — NOT an announcer,
  NOT robotic. Contractions and light personality are good.
- ElevenLabs stability: ~0.4 (more expressive; higher values sound flat/robotic).
- Voice assignment (current convention):
  - Concept / male-voiced series: the calm male preset used in videos 2–5.
  - Worked-problem / female-voiced series: the female preset used in videos 6–9.
  - GOAL: keep voice consistent within a series so the set feels produced.
    (Open decision: single voice course-wide vs. male-concept/female-worked split —
    pick deliberately before scaling to many nodes.)
- Always print the ElevenLabs character count + estimated cost after generating.

## NARRATION + SCRIPT RULES
- Scripts are delivered VERBATIM to ElevenLabs — write them to be spoken, not read.
- Every number, coordinate, and result in a script must be verified before build
  (we have caught real math errors pre-render — this check is mandatory).
- Teaching voice: model the thinking aloud, name the common misconception before
  the student hits it, include honest self-checks ("if I got 100 I'd know I misread").
- Reuse recurring through-lines where they fit (e.g. "look first, the sign is the
  giveaway") so the course feels coherent.

## PIPELINE
- Narration: scripts/narrate.mjs (parameterized: script name, voice id, output path).
  Output MP3 → public/narration-<name>.mp3.
- Composition: a registered Remotion composition; id = "<node>-<topic>"
  (e.g. "q06-parabola-concept", "l01-strike-zone").
- Audio synced via Remotion <Audio>.
- Render: npx remotion render <composition-id> out/<name>.mp4

## MODEL FOR BUILDS
- Use Sonnet (/model sonnet) for video composition builds — the creative/pedagogical
  work is done in the script; the build is competent coding. Bump to Opus only for a
  specific scene whose animation comes out weak.

## GATES
- mr-kahn verifies math/pedagogy fidelity (every number, every claim, scope-correct).
- pee-wee verifies premium register: no human figures, palette held, voice matches
  the series, annotations read as warm not gimmicky, payoff beat lands.

## VIDEO LOG (keep current)
| # | id | node | topic | voice | length |
|---|----|------|-------|-------|--------|
| 1 | (slope-lesson) | L05 | slope as rate | male | ~45s |
| 2 | slope-baseball | L05 | launch angle = slope | male | ~48s |
| 3 | slope-signs | L05 | +/−/0/undefined slope | male | ~2:00 |
| 4 | q06-parabola-concept | Q06 | what makes a parabola + sign giveaway | male | ~90s |
| 5 | q06-parabola-hits | Q06 | three real hits | male | ~2:15 |
| 6 | q06-solve-together | Q06 | reading problems (think-aloud) | female | ~2:30 |
| 7 | q06-vocab-transfer | Q06 | vocabulary + non-baseball transfer | female | ~3:10 |
| 8 | l01-strike-zone | L01 | coordinate plane via strike zone | female | ~3:15 |
| 9 | p04-exponential | P04 | exponents + exponential growth | female | ~3:30 |
