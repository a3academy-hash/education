// scripts/phase9-verify.test.ts — Phase 9 FULL VERIFICATION harness (GOAL.md).
// Runs via the vitest resolver (NOT bare node — dir imports + @/ alias). Proves
// the measurable GOAL.md domains over the LIVE artifacts and writes a report to
// phases/phase-9-verify-report.md when PHASE9_REPORT=1. Each block ASSERTS its
// gate (the test fails if a gate regresses) and accumulates report lines.

import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  certify,
  detectDuplicates,
  equivalenceClassOf,
  calculatorFlagFor,
} from "../lib/item-certification";
import { computeMasteryAll } from "../lib/mastery-engine";
import { recommend } from "../lib/adaptive-router";
import { bktUpdate } from "../lib/engine-v2/bkt";
import { pRecall, retentionUpdate } from "../lib/engine-v2/retention";
import type { BktParams } from "../lib/engine-v2/types";
import {
  startDiagnostic,
  nextItem,
  recordResponse,
  finishDiagnostic,
} from "../lib/diagnostic-engine";
import { creditFromDiagnostic } from "../lib/mastery-engine";
import { computeGrade } from "../lib/grade";
import { buildNcaaExport } from "../lib/ncaa-export";
import type {
  CurriculumGraph,
  ProblemTemplate,
  StudentProfile,
  StudentSkillState,
} from "../types";

const NOW = "2026-06-17T00:00:00.000Z";
const graph: CurriculumGraph = JSON.parse(
  readFileSync(join(process.cwd(), "data", "algebra1-graph.json"), "utf8"),
);

function allItems(g: CurriculumGraph): ProblemTemplate[] {
  const out: ProblemTemplate[] = [];
  for (const n of g.nodes) for (const ph of ["p1", "p2", "p3"] as const) out.push(...n.problems[ph]);
  return out;
}

const report: string[] = ["# phase-9-verify-report.md — Full verification (generated)\n"];
const line = (s: string) => report.push(s);

describe("Phase 9 — full verification (GOAL.md)", () => {
  it("DEDUP: 0 true duplicates above threshold (within equivalence bucket)", () => {
    const items = allItems(graph);
    // Detect dups WITHIN each equivalence/skill bucket (cross-bucket coverage is
    // intentional — AUDIT's '33 exact' were cross-bucket, per Phase 2).
    const byBucket = new Map<string, ProblemTemplate[]>();
    for (const it of items) {
      const key = `${it.skillId}::${equivalenceClassOf(it)}`;
      (byBucket.get(key) ?? byBucket.set(key, []).get(key)!).push(it);
    }
    let trueDups = 0;
    for (const bucket of byBucket.values()) {
      for (const g of detectDuplicates(bucket)) trueDups += Math.max(0, g.ids.length - 1);
    }
    line(`## Dedup\n- items: ${items.length}\n- within-bucket true duplicates: **${trueDups}**`);
    expect(trueDups).toBe(0);
  });

  it("SOLVER + TAGGING: 100% of live items solver-verify and are fully tagged", () => {
    const items = allItems(graph);
    let solved = 0;
    let tagged = 0;
    const failures: string[] = [];
    for (const it of items) {
      const c = certify(it);
      if (c.certified) solved += 1;
      else if (failures.length < 10) failures.push(`${it.id}: ${c.flags.join("; ")}`);
      // tagging: equivalence class + calculator flag derivable for every item
      if (equivalenceClassOf(it) && calculatorFlagFor(it)) tagged += 1;
    }
    const solvePct = (100 * solved) / items.length;
    const tagPct = (100 * tagged) / items.length;
    line(
      `## Solver + tagging\n- solver-verified: **${solved}/${items.length}** (${solvePct.toFixed(2)}%)\n- fully tagged: **${tagged}/${items.length}** (${tagPct.toFixed(2)}%)` +
        (failures.length ? `\n- sample solver failures:\n  - ${failures.join("\n  - ")}` : ""),
    );
    expect(tagged).toBe(items.length); // 100% tagged
    expect(solved).toBe(items.length); // 100% live items solver-verified
  });

  it("TAGGING (full set): every item carries node_id/difficulty_tier/item_version/response_type", () => {
    const items = allItems(graph);
    let full = 0;
    let withMisconception = 0;
    for (const it of items) {
      const hasNodeId = typeof it.skillId === "string" && it.skillId.length > 0;
      const hasTier = typeof it.difficulty === "number";
      const hasVersion = typeof it.version === "number";
      const hasResponseType = typeof it.answer?.kind === "string"; // response_type derivable
      if (hasNodeId && hasTier && hasVersion && hasResponseType) full += 1;
      if (it.misconceptionMap && Object.keys(it.misconceptionMap).length > 0) withMisconception += 1;
    }
    // misconception_map has KNOWN authoring gaps (Phase 2 flagged ~283) — reported,
    // not asserted 100% (a deferred content-authoring item, never fabricated).
    line(
      `## Tagging (full required set)\n- node_id + difficulty_tier + item_version + response_type + equivalence_class + calculator_flag: **${full}/${items.length}**\n- misconception_map present: ${withMisconception}/${items.length} (remainder = flagged authoring gaps, deferred)`,
    );
    expect(full).toBe(items.length);
  });

  it("ADAPTIVE ENGINE (engine-v2): BKT acquisition + FSRS retention math is live and correct", () => {
    const P: BktParams = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1 };
    // BKT: a correct response RAISES P(known); incorrect LOWERS it (acquisition).
    const up = bktUpdate(0.4, true, P);
    const down = bktUpdate(0.4, false, P);
    expect(up).toBeGreaterThan(0.4);
    expect(down).toBeLessThan(0.4);
    // FSRS retention: P(recall) DECAYS with elapsed time; a successful retrieval
    // EXTENDS stability (the §3 retention layer, distinct from acquisition).
    const stab = 5;
    expect(pRecall(10, stab)).toBeLessThan(pRecall(1, stab));
    expect(retentionUpdate(stab, true, 3)).toBeGreaterThan(stab);
    expect(retentionUpdate(stab, false, 3)).toBeLessThan(stab);
    line(
      `## Adaptive engine (engine-v2 modular spine)\n- BKT: correct ${up.toFixed(2)} > 0.40 > incorrect ${down.toFixed(2)} (acquisition live)\n- FSRS: P(recall) decays with time; success extends stability (retention live)\n- Lock firewall (delayed-unseen only): proven by lib/engine-v2/{gate,session}.test.ts (perfect in-session never locks). Live engine-v2↔mastery-engine cutover = carried residual.`,
    );
  });

  it("PERFORMANCE: engine loop (mastery + recommend) median < 800ms under load", () => {
    // Worst-case live state: every node assessed.
    const states: Record<string, StudentSkillState> = {};
    for (const n of graph.nodes) {
      states[n.id] = {
        mastery: 0.6,
        status: "developing",
        phase: 2,
        attempts: 8,
        correct: 5,
        hints: 1,
        timeMs: 90_000,
        recent: [],
        transfer: false,
        lastAttemptAt: NOW,
        masteredAt: null,
      };
    }
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now();
      const batch = computeMasteryAll("stu", states, graph, NOW);
      recommend(batch.results, states, graph);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    line(
      `## Performance (74-node graph, all assessed, 30 runs)\n- median engine loop: **${median.toFixed(1)}ms**\n- p95: ${p95.toFixed(1)}ms\n- budget: <800ms`,
    );
    expect(median).toBeLessThan(800);
    expect(p95).toBeLessThan(800);
  });

  it("END-TO-END: diagnostic → credit → mastery → grade → NCAA export is coherent", () => {
    // Drive a short diagnostic answering every served item correctly.
    let session = startDiagnostic(graph, "stu");
    let guard = 0;
    while (guard++ < 60) {
      const item = nextItem(session, graph);
      if (!item) break;
      session = recordResponse(session, graph, item.skillId, true);
    }
    const result = finishDiagnostic(session, graph, NOW);
    expect(result.demonstrated.length).toBeGreaterThan(0);
    expect(Object.keys(result.labels).length).toBe(graph.nodes.length);

    const rawCredit = creditFromDiagnostic(
      "stu",
      graph,
      result.demonstrated,
      {},
      NOW,
      new Set(result.blocked),
    );
    // creditFromDiagnostic returns NewMasteryUpdate[] (no id/createdAt — those are
    // stamped by the repository on append). The grade reads the PERSISTED log, so
    // stamp them here to mirror the real persist-then-read order.
    const credit = {
      ...rawCredit,
      updates: rawCredit.updates.map((u, i) => ({
        ...u,
        id: `u${i}`,
        createdAt: NOW,
        graphVersion: graph.schema.version,
      })),
    };
    const states: Record<string, StudentSkillState> = {};
    for (const u of credit.updates) {
      states[u.skillId] = {
        mastery: u.newMastery,
        status: u.newStatus,
        phase: u.newPhase,
        attempts: 0,
        correct: 0,
        hints: 0,
        timeMs: 0,
        recent: [],
        transfer: false,
        lastAttemptAt: null,
        masteredAt: NOW,
      };
    }
    const grade = computeGrade(states, graph, credit.updates, { nowIso: NOW });
    // Diagnostic credit is PROVISIONAL → excluded from the locked 70%; grade is a
    // projection and NOT credit-eligible (no summative + provisional credit).
    expect(grade.summativePresent).toBe(false);
    expect(grade.creditEligible).toBe(false);

    const student: StudentProfile = {
      id: "stu",
      displayName: "E2E",
      gradeLevel: 8,
      sport: "neutral",
      campusId: null,
      parentalConsent: { status: "granted", updatedAt: null },
      createdAt: NOW,
    };
    const ex = buildNcaaExport(student, graph, states, credit.updates, grade, NOW);
    // creditEligible=false → NO credit-bearing transcript line (§14a).
    expect(ex.parentCertified.transcriptLine).toBeNull();
    expect(ex.disclaimers.length).toBeGreaterThanOrEqual(3);
    line(
      `## End-to-end journey\n- diagnostic placed ${Object.keys(result.labels).length} nodes; demonstrated ${result.demonstrated.length}\n- credit updates: ${credit.updates.length}; grade projection ${grade.pct.toFixed(0)}% (creditEligible ${grade.creditEligible})\n- NCAA export: ${ex.disclaimers.length} disclaimers, transcript line ${ex.parentCertified.transcriptLine ? "present" : "withheld (not credit-eligible)"}`,
    );
  });

  it("writes the report", () => {
    if (process.env.PHASE9_REPORT) {
      writeFileSync(join(process.cwd(), "phases", "phase-9-verify-report.md"), report.join("\n\n") + "\n", "utf8");
    }
    expect(report.length).toBeGreaterThan(1);
  });
});
