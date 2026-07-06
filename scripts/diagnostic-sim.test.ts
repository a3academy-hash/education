// scripts/diagnostic-sim.test.ts — the §4 / §V2 R11 MANDATORY simulation.
//
// Runs via the VITEST resolver (NOT bare node — G2): deterministic seeded LCG,
// no Date.now()/Math.random(). Generates ~500 synthetic students with a known
// per-node "true mastered" pattern, simulates responses ~ Bernoulli(known ?
// 1-slip : guess), drives the real engine, and validates classification on the
// COVERED high-impact subset (§V3.4), the realized length distribution, and a
// procedural-over-brittle scenario (correct on dependents while a true prereq
// gap exists) proving NO false high-impact READY.
//
// Targets (§13): high-impact-subset sensitivity ≥ .80, specificity ≥ .85,
// high-impact false-READY ≤ .05. If a target fails the test is LEFT FAILING —
// the assertion is never weakened silently.
//
// The report is console.log'd AND written to phases/phase-6-simulation.md.

import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DIAGNOSTIC_CONFIG,
  finishDiagnostic,
  nextItem,
  recordResponse,
  startDiagnostic,
} from "../lib/diagnostic-engine";
import {
  HIGH_IMPACT_NODE_IDS,
  isHighImpact,
} from "../lib/diagnostic-engine/high-impact";
import realGraphJson from "../data/algebra1-graph.json";
import type { CurriculumGraph, DiagnosticSession } from "../types";

const graph = realGraphJson as unknown as CurriculumGraph;
const NOW = "2026-06-10T09:00:00.000Z";
const { guess, slip } = DIAGNOSTIC_CONFIG.posterior;

// --- deterministic seeded LCG (no RNG, no clock) ---------------------------
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // Numerical Recipes LCG constants.
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// --- ground truth: a student's true per-node mastery -----------------------
// Each node has an intrinsic "difficulty rank" (topological depth proxy).
// A student has an ability threshold: nodes at/below the threshold are truly
// mastered, with a small random "brittle gap" probability that knocks some
// below-threshold nodes back to not-mastered (the realistic case §3a targets).

// Simulation universe = PROBEABLE nodes only, using the diagnostic engine's
// own serve gate: ≥1 NEUTRAL p3 item (lib/diagnostic-engine/index.ts,
// neutralP3 — the engine abstains on anything else). A bankless stub node
// (e.g. ALG-L19 at graph 1.12.0) can never be served, so it belongs in
// neither the truth model nor the per-student RNG budget; including it would
// shift every seeded draw and turn the statistical bounds below into
// artifacts of node count rather than engine behavior.
// FRAGILITY NOTE: the false-READY bound passed pre-1.12.0 with ~1-count
// margin (40/804-ish of the ≤.05 line at N=500). Any future trip of that
// bound must be investigated as a REAL signal — this universe scoping was a
// one-time harness correction and may never be rescoped again to make the
// test pass (docstring rule). Backlog: raise N to shrink estimator variance
// (docs/TODO.md).
const NODE_IDS = graph.nodes
  .filter((n) => n.problems.p3.some((p) => p.sport === "neutral"))
  .map((n) => n.id)
  .sort((a, b) => a.localeCompare(b));

/** Longest prerequisite chain length per node (global depth proxy). */
function globalDepth(): Map<string, number> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const memo = new Map<string, number>();
  const depthOf = (id: string): number => {
    const m = memo.get(id);
    if (m !== undefined) return m;
    memo.set(id, 0);
    let d = 0;
    for (const p of byId.get(id)?.prereqs ?? []) d = Math.max(d, depthOf(p) + 1);
    memo.set(id, d);
    return d;
  };
  for (const id of NODE_IDS) depthOf(id);
  return memo;
}
const DEPTH = globalDepth();
const MAX_DEPTH = Math.max(...[...DEPTH.values()]);

interface Student {
  trueMastered: Set<string>;
}

function makeStudent(rng: () => number): Student {
  // Ability ∈ [0, MAX_DEPTH]: master everything at depth ≤ ability.
  const ability = rng() * (MAX_DEPTH + 1);
  const gapProb = 0.12 * rng(); // up to 12% brittle gaps among "known" nodes
  const trueMastered = new Set<string>();
  for (const id of NODE_IDS) {
    const d = DEPTH.get(id) ?? 0;
    if (d <= ability && rng() > gapProb) trueMastered.add(id);
  }
  return { trueMastered };
}

/** Simulated response to a served node: Bernoulli(known ? 1-slip : guess). */
function answer(student: Student, skillId: string, rng: () => number): boolean {
  const p = student.trueMastered.has(skillId) ? 1 - slip : guess;
  return rng() < p;
}

function runStudent(student: Student, rng: () => number) {
  let session: DiagnosticSession = startDiagnostic(graph, "sim", DIAGNOSTIC_CONFIG);
  const askedCounts = new Map<string, number>();
  for (;;) {
    const item = nextItem(session, graph);
    if (!item) break;
    askedCounts.set(item.skillId, (askedCounts.get(item.skillId) ?? 0) + 1);
    session = recordResponse(session, graph, item.skillId, answer(student, item.skillId, rng));
  }
  const result = finishDiagnostic(session, graph, NOW);
  return { result, length: session.responses.length, askedCounts };
}

// --- metric accumulators ----------------------------------------------------
// Sensitivity catches a true gap as EITHER NEEDS_WORK or UNCERTAIN (both route
// the node to remediation / course confirmation). Specificity guards against a
// false GAP verdict — and the gap VERDICT is NEEDS_WORK (DIAGNOSTIC §1):
// UNCERTAIN is "inconclusive, course confirms", explicitly NOT a gap label, so
// an UNCERTAIN on a truly-ready node is not a false-gap (it costs only a
// confirmation re-check, §12). This split is the faithful reading of §13
// ("sensitivity for true gaps; specificity against false-gap labels").
const GAP_LABELS = new Set(["NEEDS_WORK", "UNCERTAIN"]);
const FALSE_GAP_LABELS = new Set(["NEEDS_WORK"]);

describe("diagnostic simulation (§4 / §V2 R11) — high-impact classification + length", () => {
  // 500 students × full pure-replay-per-item is intentionally heavy; the
  // engine re-derives state from scratch each step (determinism guarantee).
  it("meets sensitivity ≥ .80, specificity ≥ .85, false-READY ≤ .05 on the covered high-impact subset", { timeout: 120000 }, () => {
    const N = 500;
    const lengths: number[] = [];

    // High-impact confusion counts over COVERED nodes (directly answered ≥1).
    let hiTruePos = 0; // true gap, predicted gap
    let hiFalseNeg = 0; // true gap, predicted not-gap (READY/INFERRED_READY)
    let hiTrueNeg = 0; // true ready, predicted not-gap
    let hiFalsePos = 0; // true ready, predicted gap
    let hiFalseReady = 0; // true gap, predicted READY (the dangerous case)
    let hiCovered = 0;
    let hiReadyTotal = 0;

    // Overall (all nodes) confusion for context.
    let allTruePos = 0;
    let allFalseNeg = 0;
    let allTrueNeg = 0;
    let allFalsePos = 0;

    for (let i = 0; i < N; i += 1) {
      const rng = lcg(0x9e3779b9 ^ (i * 2654435761));
      const student = makeStudent(rng);
      const { result, length, askedCounts } = runStudent(student, rng);
      lengths.push(length);

      for (const id of NODE_IDS) {
        const label = result.labels[id]?.label;
        if (!label) continue;
        const trueGap = !student.trueMastered.has(id);
        const predGap = GAP_LABELS.has(label); // sensitivity signal
        const predFalseGap = FALSE_GAP_LABELS.has(label); // specificity signal

        if (trueGap) {
          if (predGap) allTruePos += 1;
          else allFalseNeg += 1;
        } else {
          if (predFalseGap) allFalsePos += 1;
          else allTrueNeg += 1;
        }

        if (isHighImpact(id) && (askedCounts.get(id) ?? 0) >= 1) {
          hiCovered += 1;
          if (label === "READY") hiReadyTotal += 1;
          if (trueGap) {
            // sensitivity: caught as NEEDS_WORK or UNCERTAIN
            if (predGap) hiTruePos += 1;
            else hiFalseNeg += 1;
            if (label === "READY") hiFalseReady += 1;
          } else {
            // specificity: a truly-ready node must NOT get the gap VERDICT
            // (NEEDS_WORK). UNCERTAIN here is acceptable (course confirms).
            if (predFalseGap) hiFalsePos += 1;
            else hiTrueNeg += 1;
          }
        }
      }
    }

    const hiSensitivity = hiTruePos / Math.max(1, hiTruePos + hiFalseNeg);
    const hiSpecificity = hiTrueNeg / Math.max(1, hiTrueNeg + hiFalsePos);
    const hiFalseReadyRate = hiFalseReady / Math.max(1, hiTruePos + hiFalseNeg);
    const allSensitivity = allTruePos / Math.max(1, allTruePos + allFalseNeg);
    const allSpecificity = allTrueNeg / Math.max(1, allTrueNeg + allFalsePos);

    const sorted = [...lengths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    // --- procedural-over-brittle scenario (§V2 R11 / K8) ---
    // A student who is procedurally strong on DEPENDENTS while truly holding a
    // prereq gap on each high-impact bridge. To ISOLATE the inference claim
    // from guess-luck, the bridges are answered to reflect the true gap (always
    // incorrect — no slip/guess noise on the bridges themselves) while every
    // non-bridge is answered correctly. This proves that NO high-impact bridge
    // is ever labeled READY by INFERENCE from the (correct) dependents.
    // (Guess-luck false-READY — two lucky correct guesses — is a separate
    //  slip/guess artifact, bounded by the ≤ .05 distribution assertion above.)
    let pb: DiagnosticSession = startDiagnostic(graph, "pb", DIAGNOSTIC_CONFIG);
    for (;;) {
      const item = nextItem(pb, graph);
      if (!item) break;
      const correct = !isHighImpact(item.skillId); // bridges: true gap, no luck
      pb = recordResponse(pb, graph, item.skillId, correct);
    }
    const pbResult = finishDiagnostic(pb, graph, NOW);
    const pbFalseReady = HIGH_IMPACT_NODE_IDS.filter(
      (id) => pbResult.labels[id]?.label === "READY",
    );

    // --- UNMEASURED bridge gaps (§V3.4) — named, not silently dropped ---
    const unmeasured = [
      "ordered-pair-as-solution (no graph node exists)",
      "decimal/fraction/rational magnitude split (collapsed into ALG-F02)",
    ];

    const report = [
      "# phase-6-simulation.md — diagnostic simulation report",
      "",
      "Generated by `scripts/diagnostic-sim.test.ts` (vitest resolver, seeded LCG —",
      "deterministic, no clock, no RNG). Re-run: `npx vitest run scripts/diagnostic-sim.test.ts`.",
      "",
      `**Synthetic students:** ${N}  ·  guess=${guess}, slip=${slip}  ·  graph v${graph.schema.version} (${graph.nodes.length} nodes)`,
      "",
      "## High-impact subset (covered) — the Phase-6 acceptance bar",
      "",
      `- Covered high-impact observations: **${hiCovered}**`,
      `- Sensitivity (true gap → NEEDS_WORK/UNCERTAIN): **${hiSensitivity.toFixed(3)}** (target ≥ .80)`,
      `- Specificity (true ready → NOT the NEEDS_WORK gap verdict; UNCERTAIN allowed): **${hiSpecificity.toFixed(3)}** (target ≥ .85)`,
      `- High-impact false-READY rate (true gap → READY): **${hiFalseReadyRate.toFixed(3)}** (target ≤ .05)`,
      `- High-impact READY labels emitted: ${hiReadyTotal}`,
      "",
      "## Overall (all nodes) — context only (not the acceptance bar)",
      "",
      `- Sensitivity: ${allSensitivity.toFixed(3)}  ·  Specificity: ${allSpecificity.toFixed(3)}`,
      "",
      "## Realized length distribution (items per student)",
      "",
      `- min **${min}** · median **${median}** · mean **${mean.toFixed(1)}** · max **${max}**`,
      `- provisionalMaxItems cap: ${DIAGNOSTIC_CONFIG.provisionalMaxItems}`,
      `- Uncertain-middle split needed? ${max >= DIAGNOSTIC_CONFIG.provisionalMaxItems ? "YES — some students hit the cap; the §4 second-session split is warranted (logged)." : "No — no student hit the cap in simulation."}`,
      "",
      "## Procedural-over-brittle scenario (§V2 R11 / K8)",
      "",
      "Student answers every DEPENDENT correctly while holding a true prereq gap on",
      "each high-impact bridge. Inference must yield NO false high-impact READY.",
      "",
      `- High-impact nodes falsely labeled READY: **${pbFalseReady.length}** ${pbFalseReady.length === 0 ? "(none — inference never fakes a bridge READY ✔)" : `(${pbFalseReady.join(", ")})`}`,
      "",
      "## UNMEASURED bridge gaps (§V3.4 — named for v1.5, never fake-tagged)",
      "",
      ...unmeasured.map((u) => `- ${u}`),
      "",
    ].join("\n");

    console.log("\n" + report + "\n");
    // Keep the default test run READ-ONLY (no working-tree mutation / CI dirt).
    // Regenerate the committed report explicitly: DIAG_SIM_REPORT=1 vitest run.
    if (process.env.DIAG_SIM_REPORT) {
      writeFileSync(join(process.cwd(), "phases", "phase-6-simulation.md"), report, "utf8");
    }

    // --- assertions (never weakened silently) ---
    expect(hiCovered).toBeGreaterThan(0);
    expect(pbFalseReady.length).toBe(0); // procedural-over-brittle: no fake bridge READY
    expect(hiFalseReadyRate).toBeLessThanOrEqual(0.05);
    expect(hiSensitivity).toBeGreaterThanOrEqual(0.8);
    expect(hiSpecificity).toBeGreaterThanOrEqual(0.85);
  });
});
