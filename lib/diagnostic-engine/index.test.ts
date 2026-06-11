// lib/diagnostic-engine tests — TWO kinds, deliberately separated:
//
// 1. FIXTURE-BASED algorithmic tests. Every precise assertion (exact item
//    sequences, exact anchor/confirm ids, exact confidence rows) runs against
//    the frozen synthetic graph in __fixtures__/diagnostic-fixture.ts. These
//    NEVER depend on the real graph, so content authoring (new domains, new
//    p3 banks) can never break them.
//
// 2. INVARIANT-ONLY smoke tests on the REAL graph
//    (data/algebra1-graph.json). These assert only content-count-robust
//    invariants — budget ≤ maxItems, every probeable domain (computed
//    dynamically, never hard-coded) probed at least once, determinism, the
//    probeability/neutral-P3 gates, and the weak/advanced student routing
//    contracts. They must pass unchanged at 3, 4, or 7 authored domains.

import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_CONFIG,
  diagnosticCreditedSkills,
  diagnosticTaken,
  finishDiagnostic,
  nextItem,
  prereqDepthWithinDomain,
  recordResponse,
  startDiagnostic,
  toDiagnosticGraphView,
  wasDiagnosticRun,
} from "./index";
import {
  buildDiagnosticFixture,
  fixtureGraph,
  fixtureNode,
  fixtureProblem,
} from "./__fixtures__/diagnostic-fixture";
import { computeMasteryAll, creditFromDiagnostic } from "../mastery-engine";
import { recommend } from "../adaptive-router";
import { advancePhase } from "../problem-engine";
import realGraphJson from "../../data/algebra1-graph.json";
import type {
  CurriculumGraph,
  DiagnosticItem,
  DiagnosticSession,
  MasteryUpdate,
  NewMasteryUpdate,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

const graph = realGraphJson as unknown as CurriculumGraph;
const NOW = "2026-06-10T09:00:00.000Z";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Drive a full session with a scripted responder; returns the trace. */
function runSession(
  g: CurriculumGraph,
  answer: (skillId: string) => boolean,
): { session: DiagnosticSession; items: DiagnosticItem[]; askedIds: string[] } {
  let session = startDiagnostic(g, "student-1", DIAGNOSTIC_CONFIG);
  const items: DiagnosticItem[] = [];
  for (;;) {
    const item = nextItem(session, g);
    if (!item) break;
    items.push(item);
    session = recordResponse(session, g, item.skillId, answer(item.skillId));
  }
  return { session, items, askedIds: items.map((i) => i.skillId) };
}

/** Apply credit updates the way the server action persists them. */
function applyCredit(
  states: Record<string, StudentSkillState>,
  updates: NewMasteryUpdate[],
  nowIso: string,
): void {
  for (const u of updates) {
    const prev: StudentSkillState = states[u.skillId] ?? {
      mastery: 0,
      status: "unknown",
      phase: 1,
      attempts: 0,
      correct: 0,
      hints: 0,
      timeMs: 0,
      recent: [],
      transfer: false,
      lastAttemptAt: null,
      masteredAt: null,
    };
    states[u.skillId] = {
      ...prev,
      mastery: u.newMastery,
      status: u.newStatus,
      phase: u.newPhase,
      recent: [],
      masteredAt: nowIso,
    };
  }
}

const isProbeableNode = (n: SkillNode): boolean =>
  n.problems.p3.some((p) => p.sport === "neutral");

/** Domains with ≥1 neutral-p3 node — computed from the graph, NEVER hard-coded. */
const probeableDomainIds = (g: CurriculumGraph): string[] =>
  g.domains
    .filter((d) => g.nodes.some((n) => n.domain === d.id && isProbeableNode(n)))
    .map((d) => d.id);

const unprobeableDomainIds = (g: CurriculumGraph): string[] =>
  g.domains.map((d) => d.id).filter((id) => !probeableDomainIds(g).includes(id));

const domainOf = (g: CurriculumGraph, skillId: string): string | undefined =>
  g.nodes.find((n) => n.id === skillId)?.domain;

// ===========================================================================
// PART 1 — FIXTURE-BASED ALGORITHMIC TESTS (precise, frozen forever)
// ===========================================================================

const fixture = buildDiagnosticFixture();

describe("fixture: depth metric (mr-kahn #1 — tier is NEVER the depth)", () => {
  it("counts the longest same-domain chain back to a domain root", () => {
    expect(prereqDepthWithinDomain(fixture, "a1")).toBe(0);
    expect(prereqDepthWithinDomain(fixture, "a2")).toBe(1);
    expect(prereqDepthWithinDomain(fixture, "a3")).toBe(2);
    expect(prereqDepthWithinDomain(fixture, "a4")).toBe(3);
    expect(prereqDepthWithinDomain(fixture, "a5")).toBe(4);
    // Cross-domain edges never count: b1's prereqs are {b0, a2} but only the
    // same-domain b0 edge contributes (a2 would make it 2).
    expect(prereqDepthWithinDomain(fixture, "b1")).toBe(1);
    expect(prereqDepthWithinDomain(fixture, "b2")).toBe(2);
  });

  it("throws on an unknown skill", () => {
    expect(() => prereqDepthWithinDomain(fixture, "NOPE")).toThrow(/Unknown skill/);
  });

  it("same-tier nodes have differing depth — depth, not tier, picks the anchor", () => {
    const alphaTiers = fixture.nodes.filter((n) => n.domain === "alpha").map((n) => n.tier);
    expect(new Set(alphaTiers).size).toBe(1); // tier carries NO depth signal
    const session = startDiagnostic(fixture, "s", DIAGNOSTIC_CONFIG);
    // Anchors first, in domain-tier order; each is the DEEPEST probeable node
    // of its domain (a5 depth 4, b2 depth 2, c2 depth 1), never the roots.
    expect(session.queue.slice(0, 3)).toEqual(["a5", "b2", "c2"]);
    // omega (empty p3 banks) gets no anchor and no localization slot.
    expect(Object.keys(session.localized).sort()).toEqual(["alpha", "beta", "gamma"]);
    expect(session.progress).toBe(0);
  });
});

describe("fixture: descent on incorrect (spec §B INCORRECT)", () => {
  it("walks each domain backward to its root, deepest unprobed same-domain prereq first", () => {
    const { session, items, askedIds } = runSession(fixture, () => false);
    expect(askedIds).toEqual([
      "a5", // alpha anchor
      "b2", // beta anchor
      "c2", // gamma anchor
      "a4", // a5 missed → deepest unprobed same-domain prereq
      "b1", // b2 missed → b1 (depth 1) beats b0 (depth 0); a2 is cross-domain
      "c1", // c2 missed → its only prereq
      "a3",
      "b0", // b1 missed → b0 (a2 is cross-domain, never a descent target)
      "a2",
      "a1", // the alpha root — descent can go no further
    ]);
    expect(items.length).toBeLessThanOrEqual(DIAGNOSTIC_CONFIG.maxItems);
    expect(nextItem(session, fixture)).toBeNull();

    const result = finishDiagnostic(session, fixture, NOW);
    expect(result.demonstrated).toEqual([]);
    // Blank state → only a prereq-free root is unblocked; lowest tier wins.
    expect(result.recommendedStart).toBe("a1");
    expect(result.recommendedReason).toBe("This is the next skill you're fully ready for.");
  });

  it("a correct answer found by descent becomes the start via the committed router", () => {
    // Everything wrong except the alpha root: descent localizes the gap at
    // a2, and crediting a1 makes a2 the recommended start (acceleration past
    // the proven root).
    const { session } = runSession(fixture, (id) => id === "a1");
    const result = finishDiagnostic(session, fixture, NOW);
    expect(result.demonstrated).toEqual(["a1"]);
    expect(result.recommendedStart).toBe("a2");
  });
});

describe("fixture: confirmation probe (mr-kahn #4 / spec §B)", () => {
  it("a deep correct anchor is withheld from demonstrated[] until its confirm passes", () => {
    // a5's pending ancestry is exactly creditDepthConfirm (4) deep.
    let session = startDiagnostic(fixture, "s", DIAGNOSTIC_CONFIG);
    session = recordResponse(session, fixture, "a5", true);
    const mid = finishDiagnostic(session, fixture, NOW);
    expect(mid.demonstrated).toEqual([]);
    expect(mid.perNode["a5"]).toMatchObject({ status: "near_mastery", confidence: "medium" });
    // The confirm target (mid-depth ancestor a2) is queued behind the
    // remaining anchors.
    expect(session.queue).toEqual(["b2", "c2", "a2"]);
  });

  it("all-correct: one confirm per triggering chain; probed = high, between = medium", () => {
    const { session, askedIds } = runSession(fixture, () => true);
    expect(askedIds).toEqual([
      "a5", // alpha anchor (≥4 ancestry → confirm needed)
      "b2", // beta anchor (cross-domain ancestry → confirm needed)
      "c2", // gamma anchor (1 same-domain ancestor → credits directly)
      "a2", // confirm for a5 (mid-depth of [a1,a2,a3,a4])
      "b0", // confirm for b2 (mid-depth of [a1,b0,a2,b1] by (depth, id))
    ]);
    const result = finishDiagnostic(session, fixture, NOW);
    expect([...result.demonstrated].sort()).toEqual(["a2", "a5", "b0", "b2", "c2"]);
    // Directly probed (and confirm-passed) → high.
    for (const id of ["a5", "a2", "b2", "b0", "c2"]) {
      expect(result.perNode[id]).toMatchObject({ status: "mastered", confidence: "high" });
    }
    // Inferred from a confirmed descendant → medium.
    for (const id of ["a1", "a3", "a4", "b1", "c1"]) {
      expect(result.perNode[id]).toMatchObject({ status: "mastered", confidence: "medium" });
    }
    // Probed clusters: fully covered and mastered; omega stays unmeasured.
    for (const domainId of ["alpha", "beta", "gamma"]) {
      expect(result.byCluster.find((c) => c.domainId === domainId)).toMatchObject({
        status: "mastered",
        confidence: "high",
        unestimated: false,
      });
    }
    expect(result.byCluster.find((c) => c.domainId === "omega")).toMatchObject({
      status: "unknown",
      confidence: "unknown",
      unestimated: true,
      masteredEstimate: 0,
    });
    // Acceleration target: the unmeasured omega root — never a credited node.
    expect(result.recommendedStart).toBe("o1");
    expect(result.demonstrated).not.toContain("o1");
  });

  it("incorrect confirm blocks credit above the confirm node and descends from it", () => {
    // Wrong ONLY on a2 (a5's confirm). One run exercises the ENTIRE
    // confidence taxonomy (mr-kahn #6).
    const { session, askedIds } = runSession(fixture, (id) => id !== "a2");
    expect(askedIds).toEqual([
      "a5", // correct → confirm queued on a2
      "b2", // correct → confirm queued on b0
      "c2", // correct → credits directly (c1 inferred)
      "a2", // confirm FAILS → a5 withheld, descend from a2
      "b0", // beta confirm passes → b2 chain credited
      "a1", // the descent target below a2 — answered correctly
    ]);
    const result = finishDiagnostic(session, fixture, NOW);
    // Nothing above the failed confirm point is credited.
    expect(result.demonstrated).toEqual(["c2", "b0", "b2", "a1"]);

    // The full estimate taxonomy, one row each:
    // directly probed correct (confirm-passed or not needed) → mastered/high
    expect(result.perNode["a1"]).toMatchObject({ status: "mastered", confidence: "high" });
    expect(result.perNode["b2"]).toMatchObject({ status: "mastered", confidence: "high" });
    // probed correct but unconfirmed → near_mastery/medium
    expect(result.perNode["a5"]).toMatchObject({ status: "near_mastery", confidence: "medium" });
    // directly probed incorrect → developing/high
    expect(result.perNode["a2"]).toMatchObject({ status: "developing", confidence: "high" });
    // inferred from a correct (confirmed) descendant → mastered/medium
    expect(result.perNode["c1"]).toMatchObject({ status: "mastered", confidence: "medium" });
    expect(result.perNode["b1"]).toMatchObject({ status: "mastered", confidence: "medium" });
    // descended past but never answered → unknown/low
    expect(result.perNode["a3"]).toMatchObject({ status: "unknown", confidence: "low" });
    expect(result.perNode["a4"]).toMatchObject({ status: "unknown", confidence: "low" });
    // never touched, never inferred (empty-bank domain) → unknown/unknown
    expect(result.perNode["o1"]).toMatchObject({ status: "unknown", confidence: "unknown" });
    expect(result.perNode["o2"]).toMatchObject({ status: "unknown", confidence: "unknown" });

    // The committed propagation cannot fire from the withheld a5: a3/a4 stay
    // uncredited, so the (blank-state) post-credit sim routes to a3 next.
    // NOTE: a2 IS credited inside the sim via b2's confirmed cross-domain
    // ancestry — finishDiagnostic simulates from blank prior states, so the
    // contrary-evidence skip in creditFromDiagnostic does not see the wrong
    // a2 answer here. Server-side persistence (real attempt rows) does.
    const credit = creditFromDiagnostic("s", fixture, result.demonstrated, {}, NOW);
    const credited = credit.updates.map((u) => u.skillId);
    expect(credited).not.toContain("a3");
    expect(credited).not.toContain("a4");
    expect(credited).not.toContain("a5");
    expect(result.recommendedStart).toBe("a3");
  });

  it("cross-domain ancestry always requires a confirm, even when shallow", () => {
    // d2's ancestry is a single cross-domain node — depth 1 < 4, but the
    // domain boundary alone forces the confirm.
    const g = fixtureGraph(
      [fixtureNode("a1", "alpha", 0, []), fixtureNode("d2", "delta", 1, ["a1"])],
      [
        { id: "alpha", label: "Alpha", tier: 0 },
        { id: "delta", label: "Delta", tier: 1 },
      ],
    );
    let session = startDiagnostic(g, "s", DIAGNOSTIC_CONFIG);
    // Anchors: a1 (alpha), d2 (delta). a1 correct demonstrates directly…
    session = recordResponse(session, g, "a1", true);
    // …and d2 correct then needs NO confirm (its one ancestor is already
    // demonstrated → nothing new to credit).
    session = recordResponse(session, g, "d2", true);
    expect(nextItem(session, g)).toBeNull();
    const r1 = finishDiagnostic(session, g, NOW);
    expect(r1.demonstrated.sort()).toEqual(["a1", "d2"]);

    // Reverse case: serve d2 FIRST (make delta tier 0) → confirm on a1.
    const g2 = fixtureGraph(
      [fixtureNode("a1", "alpha", 1, []), fixtureNode("d2", "delta", 0, ["a1"])],
      [
        { id: "delta", label: "Delta", tier: 0 },
        { id: "alpha", label: "Alpha", tier: 1 },
      ],
    );
    const run2 = runSession(g2, () => true);
    expect(run2.askedIds).toEqual(["d2", "a1"]);
    const r2 = finishDiagnostic(run2.session, g2, NOW);
    expect(r2.demonstrated.sort()).toEqual(["a1", "d2"]);
  });
});

describe("fixture: probeability gate (mr-kahn #2)", () => {
  it("the empty-p3 domain is never served and reports unestimated/unknown", () => {
    for (const answer of [() => true, () => false]) {
      const { session, askedIds } = runSession(fixture, answer);
      expect(askedIds.some((id) => domainOf(fixture, id) === "omega")).toBe(false);
      const result = finishDiagnostic(session, fixture, NOW);
      expect(result.byCluster.find((c) => c.domainId === "omega")).toMatchObject({
        status: "unknown",
        confidence: "unknown",
        unestimated: true,
        masteredEstimate: 0,
      });
      for (const id of ["o1", "o2"]) {
        expect(result.demonstrated).not.toContain(id);
        expect(result.perNode[id]).toMatchObject({ status: "unknown", confidence: "unknown" });
      }
    }
  });

  it("a sport-only p3 bank is NOT probeable (the bank must hold neutral problems)", () => {
    const sportOnly = fixtureNode("c1", "gamma", 1, []);
    sportOnly.problems.p3 = [fixtureProblem("c1", "baseball")];
    const g = fixtureGraph(
      [fixtureNode("a1", "alpha", 0, []), sportOnly],
      [
        { id: "alpha", label: "Alpha", tier: 0 },
        { id: "gamma", label: "Gamma", tier: 1 },
      ],
    );
    const session = startDiagnostic(g, "s", DIAGNOSTIC_CONFIG);
    expect(session.queue).toEqual(["a1"]); // gamma has no anchor
    expect(Object.keys(session.localized)).toEqual(["alpha"]);
  });
});

describe("fixture: evidence pointers (mr-kahn #6 / audit reconstructability)", () => {
  // Same taxonomy run as above: wrong only on a2.
  const { session } = runSession(fixture, (id) => id !== "a2");

  it("every touched estimate points at the response that produced it", () => {
    const result = finishDiagnostic(session, fixture, NOW);
    // Responses, in order: a5(0) b2(1) c2(2) a2(3) b0(4) a1(5).
    expect(result.perNode["a5"].evidenceAttemptIds).toEqual(["response-0"]);
    expect(result.perNode["a2"].evidenceAttemptIds).toEqual(["response-3"]);
    expect(result.perNode["a1"].evidenceAttemptIds).toEqual(["response-5"]);
    // Inferred nodes point at their evidencing DESCENDANT's response.
    expect(result.perNode["b1"].evidenceAttemptIds).toEqual(["response-1"]);
    expect(result.perNode["c1"].evidenceAttemptIds).toEqual(["response-2"]);
    // Descended-past nodes point at the probe they were walked past from.
    expect(result.perNode["a3"].evidenceAttemptIds).toEqual(["response-0"]);
    expect(result.perNode["a4"].evidenceAttemptIds).toEqual(["response-0"]);
    // Untouched nodes carry no pointer.
    expect(result.perNode["o1"].evidenceAttemptIds).toEqual([]);
    expect(result.perNode["o2"].evidenceAttemptIds).toEqual([]);
  });

  it("uses real attempt ids when responses carry attemptIdRef (server flow)", () => {
    const withRefs: DiagnosticSession = {
      ...session,
      responses: session.responses.map((r, i) => ({ ...r, attemptIdRef: `att-${i}` })),
    };
    const result = finishDiagnostic(withRefs, fixture, NOW);
    expect(result.perNode["a5"].evidenceAttemptIds).toEqual(["att-0"]);
    expect(result.perNode["a2"].evidenceAttemptIds).toEqual(["att-3"]);
    expect(result.perNode["b1"].evidenceAttemptIds).toEqual(["att-1"]);
  });
});

// ===========================================================================
// PART 2 — INVARIANT-ONLY SMOKE TESTS ON THE REAL GRAPH
// (must pass unchanged at 3, 4, or 7 authored domains)
// ===========================================================================

describe("real graph: budget and anchors-first coverage", () => {
  it("has at least one probeable domain (otherwise the diagnostic is vacuous)", () => {
    expect(probeableDomainIds(graph).length).toBeGreaterThanOrEqual(1);
  });

  it("all-correct and all-incorrect students stay within maxItems and probe every probeable domain", () => {
    for (const answer of [() => true, () => false]) {
      const { items, askedIds } = runSession(graph, answer);
      expect(items.length).toBeLessThanOrEqual(DIAGNOSTIC_CONFIG.maxItems);
      const probedDomains = new Set(askedIds.map((id) => domainOf(graph, id)));
      for (const d of probeableDomainIds(graph)) {
        expect(probedDomains.has(d)).toBe(true);
      }
    }
  });

  it("never exceeds maxItems for scripted mixed responders", () => {
    const responders = [
      (id: string) => id.includes("F"), // strong foundations only
      (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 === 0,
    ];
    for (const answer of responders) {
      const { items, askedIds } = runSession(graph, answer);
      expect(items.length).toBeLessThanOrEqual(DIAGNOSTIC_CONFIG.maxItems);
      for (const d of probeableDomainIds(graph)) {
        expect(askedIds.some((id) => domainOf(graph, id) === d)).toBe(true);
      }
    }
  });

  it("progress is monotonic, in [0,1], and never a question count", () => {
    let session = startDiagnostic(graph, "s", DIAGNOSTIC_CONFIG);
    let last = session.progress;
    for (;;) {
      const item = nextItem(session, graph);
      if (!item) break;
      session = recordResponse(session, graph, item.skillId, false);
      expect(session.progress).toBeGreaterThanOrEqual(last);
      expect(session.progress).toBeLessThanOrEqual(1);
      last = session.progress;
    }
  });

  it("recordResponse is immutable and rejects out-of-sequence responses", () => {
    const session = startDiagnostic(graph, "s", DIAGNOSTIC_CONFIG);
    const first = nextItem(session, graph);
    expect(first).not.toBeNull();
    const before = JSON.parse(JSON.stringify(session));
    const next = recordResponse(session, graph, (first as DiagnosticItem).skillId, true);
    expect(next).not.toBe(session);
    expect(session).toEqual(before); // untouched
    const notNext = session.queue.find((id) => id !== (first as DiagnosticItem).skillId);
    expect(notNext).toBeDefined();
    expect(() => recordResponse(session, graph, notNext as string, true)).toThrow(
      /not the expected next item/,
    );
  });
});

describe("real graph: determinism (mr-gates #4)", () => {
  const script = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3 !== 0;

  it("same responses → deep-equal item sequence", () => {
    const a = runSession(graph, script);
    const b = runSession(graph, script);
    expect(b.askedIds).toEqual(a.askedIds);
    expect(b.items.map((i) => i.problem.id)).toEqual(a.items.map((i) => i.problem.id));
    expect(finishDiagnostic(b.session, graph, NOW)).toEqual(
      finishDiagnostic(a.session, graph, NOW),
    );
  });

  it("permuted graph node order → identical sequence and result", () => {
    const permuted: CurriculumGraph = {
      ...graph,
      nodes: [...graph.nodes].reverse(),
    };
    const a = runSession(graph, script);
    const b = runSession(permuted, script);
    expect(b.askedIds).toEqual(a.askedIds);
    const ra = finishDiagnostic(a.session, graph, NOW);
    const rb = finishDiagnostic(b.session, permuted, NOW);
    expect(rb.demonstrated).toEqual(ra.demonstrated);
    expect(rb.recommendedStart).toEqual(ra.recommendedStart);
    expect(rb.perNode).toEqual(ra.perNode);
  });
});

describe("real graph: probeability + neutral-P3 gates", () => {
  it("never serves a node with an empty neutral p3 bank", () => {
    for (const answer of [() => true, () => false]) {
      const { askedIds } = runSession(graph, answer);
      for (const id of askedIds) {
        const node = graph.nodes.find((n) => n.id === id);
        expect(node !== undefined && isProbeableNode(node)).toBe(true);
      }
    }
  });

  it("every unprobeable domain (computed, not hard-coded) reports unestimated/unknown", () => {
    const { session } = runSession(graph, () => true);
    const result = finishDiagnostic(session, graph, NOW);
    for (const domainId of unprobeableDomainIds(graph)) {
      const cluster = result.byCluster.find((c) => c.domainId === domainId);
      expect(cluster).toMatchObject({
        status: "unknown",
        confidence: "unknown",
        unestimated: true,
        masteredEstimate: 0,
      });
      // No unprobed-domain node is ever demonstrated or estimated mastered.
      for (const n of graph.nodes.filter((node) => node.domain === domainId)) {
        expect(result.demonstrated).not.toContain(n.id);
        expect(result.perNode[n.id].status).not.toBe("mastered");
      }
    }
  });

  it("every served item is a neutral Phase-3 problem (type literal + runtime)", () => {
    const { items } = runSession(graph, (id) => id < "ALG-L");
    for (const item of items) {
      expect(item.phase).toBe(3);
      expect(item.problem.phase).toBe(3);
      expect(item.problem.sport).toBe("neutral");
    }
  });

  it("demonstrated[] holds only nodes answered correctly on a served neutral-p3 item", () => {
    const correctIds = new Set<string>();
    let session = startDiagnostic(graph, "s", DIAGNOSTIC_CONFIG);
    for (;;) {
      const item = nextItem(session, graph);
      if (!item) break;
      const ok = item.skillId.includes("F");
      if (ok) correctIds.add(item.skillId);
      session = recordResponse(session, graph, item.skillId, ok);
    }
    const result = finishDiagnostic(session, graph, NOW);
    for (const d of result.demonstrated) expect(correctIds.has(d)).toBe(true);
  });

  it("every perNode estimate carries evidenceAttemptIds; touched nodes are non-empty", () => {
    const { session } = runSession(graph, (id) => id.includes("F"));
    const result = finishDiagnostic(session, graph, NOW);
    for (const n of graph.nodes) {
      const est = result.perNode[n.id];
      expect(Array.isArray(est.evidenceAttemptIds)).toBe(true);
      if (est.confidence !== "unknown") {
        expect(est.evidenceAttemptIds.length).toBeGreaterThan(0);
      }
    }
    // Demonstrated nodes are traceable to their own probe.
    for (const d of result.demonstrated) {
      const i = session.responses.findIndex((r) => r.skillId === d);
      expect(result.perNode[d].evidenceAttemptIds).toEqual([`response-${i}`]);
    }
  });
});

// ---------------------------------------------------------------------------
// Real graph: WEAK student (all-incorrect) — invariants only
// ---------------------------------------------------------------------------

describe("real graph: WEAK student (all-incorrect) routes backward to an unblocked root", () => {
  const { session } = runSession(graph, () => false);
  const result = finishDiagnostic(session, graph, NOW);

  it("demonstrates nothing and reports measured weakness in every probed domain", () => {
    expect(result.demonstrated).toEqual([]);
    for (const d of probeableDomainIds(graph)) {
      expect(result.byCluster.find((c) => c.domainId === d)?.status).toBe("developing");
    }
    for (const d of unprobeableDomainIds(graph)) {
      expect(result.byCluster.find((c) => c.domainId === d)?.unestimated).toBe(true);
    }
  });

  it("recommends a frontier node with no unsatisfied prereqs (the graph root from blank state)", () => {
    const startNode = graph.nodes.find((n) => n.id === result.recommendedStart);
    expect(startNode).toBeDefined();
    // From a blank state every unmastered prereq locks, so only a
    // prereq-free root can be "fully ready".
    expect((startNode as SkillNode).prereqs).toEqual([]);
  });

  it("persisting credits nothing, and the committed router agrees with the engine", () => {
    const states: Record<string, StudentSkillState> = {};
    const credit = creditFromDiagnostic("riley", graph, result.demonstrated, states, NOW);
    expect(credit.updates).toEqual([]); // nothing demonstrated → nothing credited
    const batch = computeMasteryAll("riley", states, graph, NOW);
    const rec = recommend(batch.results, states, graph, { justCredited: [] });
    expect(rec.skillId).toBe(result.recommendedStart);
    expect(rec.kind).toBe("continue");
  });
});

// ---------------------------------------------------------------------------
// Real graph: ADVANCED student (all-correct) — invariants only
// ---------------------------------------------------------------------------

describe("real graph: ADVANCED student (all-correct) accelerates past credited ancestry", () => {
  const { session } = runSession(graph, () => true);
  const result = finishDiagnostic(session, graph, NOW);

  it("demonstrates something, and the recommended start is never a credited node", () => {
    expect(result.demonstrated.length).toBeGreaterThan(0);
    expect(result.demonstrated).not.toContain(result.recommendedStart);
  });

  it("credits through the committed engine; no credited or mastered node is re-taught", () => {
    const states: Record<string, StudentSkillState> = {};
    const credit = creditFromDiagnostic("sam", graph, result.demonstrated, states, NOW);
    applyCredit(states, credit.updates, NOW);
    const credited = credit.updates.map((u) => u.skillId);
    expect(credited.length).toBeGreaterThan(0);

    const batch = computeMasteryAll("sam", states, graph, NOW);
    for (const id of credited) expect(batch.results[id].status).toBe("mastered");

    const rec = recommend(batch.results, states, graph, { justCredited: credited });
    // Forward target only: never remediation, never a node it just credited.
    expect(["accelerate", "continue"]).toContain(rec.kind);
    expect(credited).not.toContain(rec.skillId);
    const masteredIds = graph.nodes
      .filter((n) => batch.results[n.id].status === "mastered")
      .map((n) => n.id);
    expect(masteredIds).not.toContain(rec.skillId);
    // …and the engine's own recommendedStart agrees with the committed router.
    expect(result.recommendedStart).toBe(rec.skillId);
  });

  it("never credits a node in an unprobeable domain on inference alone", () => {
    const states: Record<string, StudentSkillState> = {};
    const credit = creditFromDiagnostic("sam", graph, result.demonstrated, states, NOW);
    const credited = new Set(credit.updates.map((u) => u.skillId));
    for (const domainId of unprobeableDomainIds(graph)) {
      for (const n of graph.nodes.filter((node) => node.domain === domainId)) {
        expect(credited.has(n.id)).toBe(false);
      }
    }
  });

  it("a retake is strictly additive — it can only credit MORE, never revoke", () => {
    const states: Record<string, StudentSkillState> = {};
    const first = creditFromDiagnostic("sam", graph, result.demonstrated, states, NOW);
    applyCredit(states, first.updates, NOW);
    const firstCredited = new Set(first.updates.map((u) => u.skillId));

    // Identical retake: same responses replay to the same demonstrated[].
    const retake = runSession(graph, () => true);
    const retakeResult = finishDiagnostic(retake.session, graph, NOW);
    expect(retakeResult.demonstrated).toEqual(result.demonstrated);

    const second = creditFromDiagnostic("sam", graph, retakeResult.demonstrated, states, NOW);
    // No update ever demotes: every emitted update sets mastered.
    for (const u of second.updates) expect(u.newStatus).toBe("mastered");
    // Previously credited ancestors are skipped, not rewritten.
    for (const s of second.skipped) {
      expect(firstCredited.has(s.skillId)).toBe(true);
      expect(s.reason).toBe("already mastered");
    }
  });
});

// ---------------------------------------------------------------------------
// source isolation
// ---------------------------------------------------------------------------

describe("source isolation — `source` NEVER enters mastery/phase math", () => {
  const attempt = (
    n: number,
    correct: boolean,
    source: StudentAttempt["source"],
  ): StudentAttempt => ({
    id: `a-${n}`,
    studentId: "s",
    skillId: "ALG-F01",
    problemId: `p-${n}`,
    phase: 1,
    sport: "neutral",
    response: "1",
    correct,
    hintsUsed: 0,
    timeMs: 30_000,
    misconceptionTags: [],
    isProbe: false,
    source,
    sessionId: `sess-${source}`,
    createdAt: `2026-06-10T09:0${n}:00.000Z`,
  });

  it("a source:'diagnostic' attempt does not change advancePhase output", () => {
    const pattern = [true, true, true, true]; // 4/4 ≥ 0.8 → advance
    const practice = pattern.map((c, i) => attempt(i, c, "practice"));
    const diagnostic = pattern.map((c, i) => attempt(i, c, "diagnostic"));
    const mixed = pattern.map((c, i) => attempt(i, c, i % 2 ? "diagnostic" : "practice"));
    expect(advancePhase(practice, 1)).toBe(2);
    expect(advancePhase(diagnostic, 1)).toBe(advancePhase(practice, 1));
    expect(advancePhase(mixed, 1)).toBe(advancePhase(practice, 1));

    const weak = [true, false, true, false];
    const weakPractice = weak.map((c, i) => attempt(i, c, "practice"));
    const weakDiagnostic = weak.map((c, i) => attempt(i, c, "diagnostic"));
    expect(advancePhase(weakPractice, 1)).toBe(1);
    expect(advancePhase(weakDiagnostic, 1)).toBe(advancePhase(weakPractice, 1));
  });
});

// ---------------------------------------------------------------------------
// Read-side helpers
// ---------------------------------------------------------------------------

describe("wasDiagnosticRun / diagnosticCreditedSkills (mr-gates #3)", () => {
  const update = (skillId: string, trigger: MasteryUpdate["trigger"], n: number): MasteryUpdate => ({
    id: `u-${n}`,
    studentId: "s",
    skillId,
    attemptId: null,
    trigger,
    prevMastery: 0,
    newMastery: 0.85,
    prevStatus: "unknown",
    newStatus: "mastered",
    prevPhase: 1,
    newPhase: 3,
    reason: "",
    engineVersion: "1.0.0",
    sessionId: `sess-${n}`,
    createdAt: `2026-06-10T09:0${n}:00.000Z`,
  });

  it("derives the completion signal and credited set from the update log", () => {
    expect(wasDiagnosticRun([])).toBe(false);
    expect(wasDiagnosticRun([update("ALG-F01", "attempt", 0)])).toBe(false);
    const log = [
      update("ALG-F05", "diagnostic", 0),
      update("ALG-F03", "credit-propagation", 1),
      update("ALG-F01", "credit-propagation", 2),
      update("ALG-F01", "credit-propagation", 3), // dup — deduped
      update("ALG-E01", "attempt", 4), // practice — excluded
    ];
    expect(wasDiagnosticRun(log)).toBe(true);
    expect(diagnosticCreditedSkills(log)).toEqual(["ALG-F05", "ALG-F03", "ALG-F01"]);
  });
});

describe("diagnosticTaken — completion from the attempt log, not credit", () => {
  const attempt = (
    n: number,
    correct: boolean,
    source: StudentAttempt["source"],
  ): StudentAttempt => ({
    id: `a-${n}`,
    studentId: "s",
    skillId: "ALG-F01",
    problemId: `p-${n}`,
    phase: 3,
    sport: "neutral",
    response: "1",
    correct,
    hintsUsed: 0,
    timeMs: 30_000,
    misconceptionTags: [],
    isProbe: true,
    source,
    sessionId: `sess-${source}`,
    createdAt: `2026-06-10T09:0${n}:00.000Z`,
  });

  it("is false for a brand-new student (no attempts at all)", () => {
    expect(diagnosticTaken([])).toBe(false);
  });

  it("is false when only practice attempts exist", () => {
    expect(diagnosticTaken([attempt(0, true, "practice"), attempt(1, false, "practice")])).toBe(
      false,
    );
  });

  it("is true after an all-wrong diagnostic run (zero credit — the Riley case)", () => {
    const allWrong = [0, 1, 2].map((n) => attempt(n, false, "diagnostic"));
    expect(diagnosticTaken(allWrong)).toBe(true);
    // The credit-derived signal stays false here — that mismatch was the bug.
    expect(wasDiagnosticRun([])).toBe(false);
  });

  it("is true when diagnostic rows are mixed into practice history", () => {
    expect(
      diagnosticTaken([attempt(0, true, "practice"), attempt(1, true, "diagnostic")]),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Client graph view
// ---------------------------------------------------------------------------

describe("toDiagnosticGraphView (client-bundle leak guard)", () => {
  it("strips sport banks, hints, hooks, and registry; keeps neutral p3", () => {
    const view = toDiagnosticGraphView(graph);
    expect(view.misconceptionRegistry).toEqual([]);
    expect(view.edges).toEqual([]);
    for (const n of view.nodes) {
      expect(n.problems.p1).toEqual([]);
      expect(n.problems.p2).toEqual([]);
      expect(n.workedExamples).toEqual([]);
      expect(Object.values(n.contextHooks).every((h) => h === "")).toBe(true);
      for (const p of n.problems.p3) {
        expect(p.sport).toBe("neutral");
        expect(p.hints).toEqual([]);
        expect(p.misconceptionMap).toBeUndefined();
      }
    }
  });

  it("drives an identical item sequence to the full graph (client/server parity)", () => {
    const view = toDiagnosticGraphView(graph);
    const script = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3 !== 0;
    const full = runSession(graph, script);
    const pruned = runSession(view, script);
    expect(pruned.askedIds).toEqual(full.askedIds);
    expect(pruned.items.map((i) => i.problem.id)).toEqual(full.items.map((i) => i.problem.id));
    expect(finishDiagnostic(pruned.session, view, NOW).demonstrated).toEqual(
      finishDiagnostic(full.session, graph, NOW).demonstrated,
    );
  });
});
