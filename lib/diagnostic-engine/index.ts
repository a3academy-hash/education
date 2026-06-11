// lib/diagnostic-engine — adaptive placement diagnostic. PURE TypeScript:
// no React, no IO, no Date.now()/Math.random(). "Now" is always an explicit
// ISO parameter. mr-kahn gated (CLAUDE.md).
//
// WHAT THIS MODULE DOES — AND DOES NOT — DO
// It estimates. It NEVER writes mastery: it emits demonstrated[] and the
// committed creditFromDiagnostic / computeMasteryAll / recommend decide.
//
// DEPTH METRIC (mr-kahn #1): node `tier` equals the domain tier
// (validator-enforced), so tier is USELESS for within-domain depth. The only
// sanctioned metric is prereqDepthWithinDomain — the longest prerequisite
// chain back to a domain root, counting only same-domain edges. Anchors and
// descent use THIS, never tier.
//
// PROBEABILITY GATE (mr-kahn #2): a node is probeable iff its p3 bank holds
// at least one NEUTRAL problem. Domains with no probeable node (today:
// Systems, Exponents & Polynomials, Quadratics, Data) are never probed;
// finishDiagnostic reports them confidence "unknown" / unestimated:true —
// never medium/high without authored p3 evidence.
//
// NEUTRAL-P3 GATE (mr-kahn #3 / mr-gates #1): every credit-bearing item is a
// neutral Phase-3 problem (DiagnosticItem.phase is the literal 3). A node
// enters demonstrated[] ONLY on a correct neutral-p3 item.
//
// CONFIRMATION PROBE (mr-kahn #4): if crediting one correct answer would
// credit ancestry crossing a DOMAIN boundary OR ≥ creditDepthConfirm
// ancestors, ONE confirming probe on a mid-depth ancestor is served first.
// Correct confirm → the chain is credited (both probed nodes are "high"
// confidence; the inferred ones between are "medium"). Incorrect confirm →
// nothing above the confirm point is credited (the evidencing node is
// withheld from demonstrated[], so the committed propagation cannot fire from
// it) and the walk descends from the confirm node.
//
// DETERMINISM (mr-gates #4): item sequencing is a pure function of
// (graph, config, responses). Internally every API replays the response list
// from scratch — same responses give an identical sequence, and a permuted
// graph node order gives an identical sequence (every candidate set is sorted
// with a total order ending in skillId).
//
// RETAKE (mr-gates #2): a retake is strictly ADDITIVE. It appends fresh
// attempt rows and can only ever credit MORE skills; it never revokes prior
// diagnostic credit (sticky ever-mastered status + the lockConfirm floor in
// the mastery engine guarantee this downstream). The summary UI must never
// imply re-placement.
//
// LOCALIZATION + PROGRESS: each probeable domain gets exactly one anchor
// (allocated FIRST, before any descent/confirmation), and the domain counts
// as "localized" once its anchor is answered and no walk target remains for
// it. session.progress = ½·(localized domains fraction) + ½·(budget used) —
// monotonic, never a question count (pee-wee: no "N of M").
//
// ESTIMATE MAPPING (mr-kahn #6 — low vs unknown split):
//   directly probed correct (and confirm-passed)  → mastered  / high
//   probed correct but unconfirmed                → near_mastery / medium
//   directly probed incorrect                     → developing / high
//   inferred from a correct descendant            → mastered  / medium
//   descended past but never answered             → unknown   / low
//   never touched, never inferred                 → unknown   / unknown
// Every estimate carries evidenceAttemptIds (audit reconstructability):
// real attempt ids when responses carry attemptIdRef, else the deterministic
// placeholder "response-<index>".

import { computeMasteryAll, creditFromDiagnostic } from "../mastery-engine";
import { recommend } from "../adaptive-router";
import type {
  ContextHooks,
  CurriculumGraph,
  DiagnosticClusterEstimate,
  DiagnosticConfig,
  DiagnosticItem,
  DiagnosticNodeEstimate,
  DiagnosticResult,
  DiagnosticSession,
  MasteryUpdate,
  ProblemTemplate,
  ResponseType,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

/** Single home of diagnostic tuning. Changing ANY value is a Matt checkpoint. */
export const DIAGNOSTIC_CONFIG: DiagnosticConfig = {
  maxItems: 15,
  creditDepthConfirm: 4,
  anchorMetric: "prereqDepthWithinDomain",
  confidence: {
    directlyProbed: "high",
    inferredFromDescendant: "medium",
    descendedPast: "low",
    untouched: "unknown",
  },
};

// ---------------------------------------------------------------------------
// Graph indexing (pure, order-independent)
// ---------------------------------------------------------------------------

interface GraphIndex {
  byId: Map<string, SkillNode>;
  /** prereqDepthWithinDomain per node. */
  depth: Map<string, number>;
  /** Nodes with ≥ 1 neutral p3 problem. */
  probeable: Set<string>;
  /** Probeable domains sorted by (tier, id). */
  probeableDomains: { id: string; tier: number }[];
  /** Direct dependents per node, sorted by id. */
  dependents: Map<string, string[]>;
  /** domainId → anchor nodeId (deepest probeable; documented tie-breaks). */
  anchors: Map<string, string>;
}

const neutralP3 = (n: SkillNode): ProblemTemplate[] =>
  n.problems.p3.filter((p) => p.sport === "neutral");

function indexGraph(graph: CurriculumGraph): GraphIndex {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  // Longest same-domain prerequisite chain back to a domain root.
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    const memo = depth.get(id);
    if (memo !== undefined) return memo;
    const node = byId.get(id);
    if (!node) return 0;
    depth.set(id, 0); // cycle guard (graph is validated acyclic; defensive)
    let d = 0;
    for (const p of node.prereqs) {
      const pn = byId.get(p);
      if (pn && pn.domain === node.domain) d = Math.max(d, depthOf(p) + 1);
    }
    depth.set(id, d);
    return d;
  };
  for (const n of graph.nodes) depthOf(n.id);

  const probeable = new Set<string>();
  for (const n of graph.nodes) if (neutralP3(n).length > 0) probeable.add(n.id);

  const probeableDomains = graph.domains
    .filter((d) => graph.nodes.some((n) => n.domain === d.id && probeable.has(n.id)))
    .map((d) => ({ id: d.id, tier: d.tier }))
    .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));

  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes) {
    for (const p of n.prereqs) {
      const list = dependents.get(p);
      if (list) list.push(n.id);
      else dependents.set(p, [n.id]);
    }
  }
  for (const list of dependents.values()) list.sort((a, b) => a.localeCompare(b));

  // Anchor = max prereqDepthWithinDomain probeable node; ties broken by
  // fewest (unlocalized — at start, all) direct dependents, then skillId.
  const anchors = new Map<string, string>();
  for (const d of probeableDomains) {
    const candidates = graph.nodes
      .filter((n) => n.domain === d.id && probeable.has(n.id))
      .sort(
        (a, b) =>
          (depth.get(b.id) ?? 0) - (depth.get(a.id) ?? 0) ||
          (dependents.get(a.id)?.length ?? 0) - (dependents.get(b.id)?.length ?? 0) ||
          a.id.localeCompare(b.id),
      );
    if (candidates[0]) anchors.set(d.id, candidates[0].id);
  }

  return { byId, depth, probeable, probeableDomains, dependents, anchors };
}

/**
 * Longest prerequisite chain from `skillId` back to a domain root, counting
 * only same-domain edges. THE depth metric — node `tier` is never used.
 */
export function prereqDepthWithinDomain(graph: CurriculumGraph, skillId: string): number {
  const d = indexGraph(graph).depth.get(skillId);
  if (d === undefined) throw new Error(`Unknown skill: ${skillId}`);
  return d;
}

/** Transitive prerequisite closure (all domains; the node itself excluded). */
function ancestorsOf(id: string, byId: Map<string, SkillNode>): string[] {
  const seen = new Set<string>();
  const visit = (cur: string) => {
    for (const p of byId.get(cur)?.prereqs ?? []) {
      if (seen.has(p)) continue;
      seen.add(p);
      visit(p);
    }
  };
  visit(id);
  return [...seen].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Replay — the entire session state is a pure function of (graph, config,
// responses); every public API replays from scratch.
// ---------------------------------------------------------------------------

type TargetKind = "anchor" | "descend" | "advance" | "confirm";

interface Target {
  nodeId: string;
  kind: TargetKind;
  /** The probeable domain whose walk this target belongs to (localization). */
  walkDomain: string;
  /** Creation order — final ordering tie-break. */
  seq: number;
  confirm?: { evidencingId: string; pendingAncestors: string[] };
}

interface ReplayState {
  queue: Target[];
  asked: string[];
  answered: Map<string, boolean>;
  /** Correct neutral-p3, confirm-gated chains only when the confirm passed. */
  demonstrated: string[];
  /** nodeId → evidencing (demonstrated) descendant skillId. */
  inferred: Map<string, string>;
  /** Correct but withheld from demonstrated[] (failed/impossible confirm). */
  unconfirmed: Set<string>;
  /** Incorrect probes, in response order (descended-past evidence). */
  incorrect: string[];
  seq: number;
}

const domainTierOf = (idx: GraphIndex, domainId: string): number =>
  idx.probeableDomains.find((d) => d.id === domainId)?.tier ?? 99;

/**
 * Serve order: un-asked anchors first (domain tier order — anchors are
 * allocated FIRST, ≤ #probeable-domains of the budget). Then walk targets,
 * deepest-uncertainty domain first: fewest responses in the walk's domain,
 * then domain tier, then creation order.
 */
function orderQueue(state: ReplayState, idx: GraphIndex): Target[] {
  const responsesIn = (domainId: string): number =>
    state.asked.filter((id) => idx.byId.get(id)?.domain === domainId).length;
  return [...state.queue].sort((a, b) => {
    const anchorA = a.kind === "anchor" ? 0 : 1;
    const anchorB = b.kind === "anchor" ? 0 : 1;
    if (anchorA !== anchorB) return anchorA - anchorB;
    if (a.kind === "anchor") return a.seq - b.seq;
    return (
      responsesIn(a.walkDomain) - responsesIn(b.walkDomain) ||
      domainTierOf(idx, a.walkDomain) - domainTierOf(idx, b.walkDomain) ||
      a.seq - b.seq
    );
  });
}

function addDemonstrated(state: ReplayState, id: string): void {
  if (!state.demonstrated.includes(id)) state.demonstrated.push(id);
}

/** Ancestors that crediting `id` would newly cover. */
function pendingAncestorsOf(state: ReplayState, idx: GraphIndex, id: string): string[] {
  return ancestorsOf(id, idx.byId).filter(
    (a) =>
      !state.answered.has(a) &&
      !state.demonstrated.includes(a) &&
      !state.inferred.has(a) &&
      !state.unconfirmed.has(a),
  );
}

function pushTarget(
  state: ReplayState,
  t: Omit<Target, "seq">,
): void {
  state.seq += 1;
  state.queue.push({ ...t, seq: state.seq });
}

/** Advance forward: shallowest un-touched probeable same-domain dependent. */
function advanceFrom(state: ReplayState, idx: GraphIndex, fromId: string, walkDomain: string): void {
  const domain = idx.byId.get(fromId)?.domain;
  const cands = (idx.dependents.get(fromId) ?? [])
    .filter((d) => {
      const n = idx.byId.get(d);
      return (
        n !== undefined &&
        n.domain === domain &&
        idx.probeable.has(d) &&
        !state.answered.has(d) &&
        !state.demonstrated.includes(d) &&
        !state.inferred.has(d) &&
        !state.unconfirmed.has(d)
      );
    })
    .sort(
      (a, b) => (idx.depth.get(a) ?? 0) - (idx.depth.get(b) ?? 0) || a.localeCompare(b),
    );
  if (cands[0]) pushTarget(state, { nodeId: cands[0], kind: "advance", walkDomain });
  // No candidate → the walk ends; the domain localizes.
}

/**
 * Descend on a miss: the weakest un-probed same-domain DIRECT prerequisite
 * (greatest prereqDepthWithinDomain, then skillId). None → gap locus; the
 * walk ends and the domain localizes.
 */
function descendFrom(state: ReplayState, idx: GraphIndex, fromId: string, walkDomain: string): void {
  const node = idx.byId.get(fromId);
  if (!node) return;
  const cands = node.prereqs
    .filter((p) => {
      const pn = idx.byId.get(p);
      return (
        pn !== undefined &&
        pn.domain === node.domain &&
        idx.probeable.has(p) &&
        !state.answered.has(p)
      );
    })
    .sort(
      (a, b) => (idx.depth.get(b) ?? 0) - (idx.depth.get(a) ?? 0) || a.localeCompare(b),
    );
  if (cands[0]) pushTarget(state, { nodeId: cands[0], kind: "descend", walkDomain });
}

function processAnswer(
  state: ReplayState,
  idx: GraphIndex,
  config: DiagnosticConfig,
  target: Target,
  correct: boolean,
): void {
  if (target.kind === "confirm" && target.confirm) {
    const { evidencingId, pendingAncestors } = target.confirm;
    if (correct) {
      // Both probed nodes are demonstrated; the chain between is inferred.
      addDemonstrated(state, target.nodeId);
      addDemonstrated(state, evidencingId);
      for (const a of pendingAncestors) {
        if (
          a !== target.nodeId &&
          !state.answered.has(a) &&
          !state.demonstrated.includes(a) &&
          !state.inferred.has(a)
        ) {
          state.inferred.set(a, evidencingId);
        }
      }
      advanceFrom(state, idx, evidencingId, target.walkDomain);
    } else {
      // Failed confirm: nothing above the confirm point is credited — the
      // evidencing node is withheld from demonstrated[] so the committed
      // propagation cannot fire from it. Descend from the confirm node.
      state.unconfirmed.add(evidencingId);
      state.incorrect.push(target.nodeId);
      descendFrom(state, idx, target.nodeId, target.walkDomain);
    }
    return;
  }

  if (correct) {
    const pending = pendingAncestorsOf(state, idx, target.nodeId);
    const nodeDomain = idx.byId.get(target.nodeId)?.domain;
    const crossesDomain = pending.some((a) => idx.byId.get(a)?.domain !== nodeDomain);
    const needsConfirm = crossesDomain || pending.length >= config.creditDepthConfirm;
    if (needsConfirm) {
      // Mid-depth probeable ancestor: sort by (depth asc, id asc), middle.
      const cands = pending
        .filter((a) => idx.probeable.has(a))
        .sort(
          (a, b) => (idx.depth.get(a) ?? 0) - (idx.depth.get(b) ?? 0) || a.localeCompare(b),
        );
      if (cands.length > 0) {
        const confirmNode = cands[Math.floor((cands.length - 1) / 2)];
        pushTarget(state, {
          nodeId: confirmNode,
          kind: "confirm",
          walkDomain: target.walkDomain,
          confirm: { evidencingId: target.nodeId, pendingAncestors: pending },
        });
      } else {
        // Defensive (cannot occur on the current graph): a chain that needs
        // confirmation but has no probeable ancestor is never credited.
        state.unconfirmed.add(target.nodeId);
      }
    } else {
      addDemonstrated(state, target.nodeId);
      for (const a of pending) state.inferred.set(a, target.nodeId);
      advanceFrom(state, idx, target.nodeId, target.walkDomain);
    }
  } else {
    state.incorrect.push(target.nodeId);
    descendFrom(state, idx, target.nodeId, target.walkDomain);
  }
}

/**
 * Resolve queue heads whose node was already answered by another walk
 * (cross-walk collisions consume NO budget — the recorded answer is reused).
 */
function settle(state: ReplayState, idx: GraphIndex, config: DiagnosticConfig): void {
  for (;;) {
    const ordered = orderQueue(state, idx);
    const head = ordered[0];
    if (!head || !state.answered.has(head.nodeId)) return;
    state.queue = state.queue.filter((t) => t !== head);
    processAnswer(state, idx, config, head, state.answered.get(head.nodeId) as boolean);
  }
}

function replay(
  graph: CurriculumGraph,
  config: DiagnosticConfig,
  responses: DiagnosticSession["responses"],
): { state: ReplayState; idx: GraphIndex } {
  const idx = indexGraph(graph);
  const state: ReplayState = {
    queue: [],
    asked: [],
    answered: new Map(),
    demonstrated: [],
    inferred: new Map(),
    unconfirmed: new Set(),
    incorrect: [],
    seq: 0,
  };
  // One anchor per probeable domain, allocated FIRST (mr-kahn #5 coverage).
  for (const d of idx.probeableDomains) {
    const anchor = idx.anchors.get(d.id);
    if (anchor) pushTarget(state, { nodeId: anchor, kind: "anchor", walkDomain: d.id });
  }
  settle(state, idx, config);

  for (const r of responses) {
    const ordered = orderQueue(state, idx);
    const head = ordered[0];
    if (!head || head.nodeId !== r.skillId) {
      throw new Error(
        `diagnostic replay: response for ${r.skillId} does not match the expected item ${head?.nodeId ?? "(none)"}`,
      );
    }
    if (state.asked.length >= config.maxItems) {
      throw new Error("diagnostic replay: item budget exceeded");
    }
    state.queue = state.queue.filter((t) => t !== head);
    state.asked.push(r.skillId);
    state.answered.set(r.skillId, r.correct);
    processAnswer(state, idx, config, head, r.correct);
    settle(state, idx, config);
  }

  return { state, idx };
}

function localizedMap(state: ReplayState, idx: GraphIndex): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const d of idx.probeableDomains) {
    const anchor = idx.anchors.get(d.id);
    const anchorAsked = anchor !== undefined && state.answered.has(anchor);
    const open = state.queue.some((t) => t.walkDomain === d.id);
    out[d.id] = anchorAsked && !open;
  }
  return out;
}

function progressOf(
  state: ReplayState,
  idx: GraphIndex,
  config: DiagnosticConfig,
): number {
  const localized = localizedMap(state, idx);
  const domains = idx.probeableDomains.length;
  const locFrac = domains === 0 ? 1 : Object.values(localized).filter(Boolean).length / domains;
  const budgetFrac = Math.min(1, state.asked.length / config.maxItems);
  return Math.min(1, 0.5 * locFrac + 0.5 * budgetFrac);
}

function toSession(
  studentId: string,
  config: DiagnosticConfig,
  responses: DiagnosticSession["responses"],
  state: ReplayState,
  idx: GraphIndex,
): DiagnosticSession {
  return {
    studentId,
    config,
    asked: [...state.asked],
    responses: responses.map((r) => ({ ...r })),
    queue: orderQueue(state, idx).map((t) => t.nodeId),
    localized: localizedMap(state, idx),
    progress: progressOf(state, idx, config),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startDiagnostic(
  graph: CurriculumGraph,
  studentId: string,
  config: DiagnosticConfig = DIAGNOSTIC_CONFIG,
): DiagnosticSession {
  const { state, idx } = replay(graph, config, []);
  return toSession(studentId, config, [], state, idx);
}

const RESPONSE_TYPE_BY_VISUAL: Record<string, ResponseType> = {
  coordinate: "plane",
  numberline: "line",
  table: "table",
  // BalanceScale teaches; the diagnostic measures (pee-wee) — and the area
  // model has no diagnostic surface. Both degrade to plain math input.
  balance: "input",
  "area-model": "input",
};

/**
 * The next item to serve, or null when every probeable domain is localized
 * or the item budget is spent. Serves ONLY neutral p3 problems (lowest
 * problem id — deterministic) from probeable nodes.
 */
export function nextItem(session: DiagnosticSession, graph: CurriculumGraph): DiagnosticItem | null {
  const { state, idx } = replay(graph, session.config, session.responses);
  if (state.asked.length >= session.config.maxItems) return null;
  const head = orderQueue(state, idx)[0];
  if (!head) return null;
  const node = idx.byId.get(head.nodeId);
  if (!node) return null;
  const problem = neutralP3(node).sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!problem) return null; // unreachable: only probeable nodes are queued
  const responseType: ResponseType =
    (problem.visual && RESPONSE_TYPE_BY_VISUAL[problem.visual]) || "input";
  return { skillId: node.id, phase: 3, responseType, problem };
}

/**
 * Record one response. Immutable — returns a NEW session; deterministic pure
 * function of (graph, config, responses). Throws when the response does not
 * match the expected next item (tamper/programming error — fail fast).
 */
export function recordResponse(
  session: DiagnosticSession,
  graph: CurriculumGraph,
  skillId: string,
  correct: boolean,
): DiagnosticSession {
  const expected = nextItem(session, graph);
  if (!expected || expected.skillId !== skillId) {
    throw new Error(
      `recordResponse: ${skillId} is not the expected next item (${expected?.skillId ?? "session complete"})`,
    );
  }
  const responses = [...session.responses, { skillId, correct }];
  const { state, idx } = replay(graph, session.config, responses);
  return toSession(session.studentId, session.config, responses, state, idx);
}

/** Evidence pointer for the (single) response on a skill. */
function attemptRefFor(
  responses: DiagnosticSession["responses"],
  skillId: string,
): string {
  const i = responses.findIndex((r) => r.skillId === skillId);
  if (i < 0) return "";
  return responses[i].attemptIdRef ?? `response-${i}`;
}

/**
 * Final estimates + demonstrated[] + recommended start. `nowIso` is required
 * because the recommended start is computed via the committed pipeline
 * (creditFromDiagnostic → computeMasteryAll → recommend) over a simulated
 * post-credit state — the engine itself still never touches a clock.
 */
export function finishDiagnostic(
  session: DiagnosticSession,
  graph: CurriculumGraph,
  nowIso: string,
): DiagnosticResult {
  const { state, idx } = replay(graph, session.config, session.responses);
  const refFor = (skillId: string) => attemptRefFor(session.responses, skillId);

  // Descended-past: ancestors of incorrect probes, plus ancestors of
  // unconfirmed (failed-confirm) chains — walked past, never answered.
  const descendedPast = new Map<string, string>(); // nodeId → evidence probe id
  const descendRoots = [
    ...state.incorrect,
    ...[...state.unconfirmed].sort((a, b) => a.localeCompare(b)),
  ];
  for (const root of descendRoots) {
    for (const a of ancestorsOf(root, idx.byId)) {
      if (
        !state.answered.has(a) &&
        !state.demonstrated.includes(a) &&
        !state.inferred.has(a) &&
        !descendedPast.has(a)
      ) {
        descendedPast.set(a, root);
      }
    }
  }

  const cfg = session.config.confidence;
  const perNode: Record<string, DiagnosticNodeEstimate> = {};
  for (const n of graph.nodes) {
    if (state.demonstrated.includes(n.id)) {
      perNode[n.id] = {
        status: "mastered",
        confidence: cfg.directlyProbed,
        evidenceAttemptIds: [refFor(n.id)],
      };
    } else if (state.answered.get(n.id) === true) {
      // Correct but unconfirmed (failed or still-pending confirm) — never
      // credited, never demonstrated.
      perNode[n.id] = {
        status: "near_mastery",
        confidence: "medium",
        evidenceAttemptIds: [refFor(n.id)],
      };
    } else if (state.answered.get(n.id) === false) {
      perNode[n.id] = {
        status: "developing",
        confidence: cfg.directlyProbed,
        evidenceAttemptIds: [refFor(n.id)],
      };
    } else if (state.inferred.has(n.id)) {
      perNode[n.id] = {
        status: "mastered",
        confidence: cfg.inferredFromDescendant,
        evidenceAttemptIds: [refFor(state.inferred.get(n.id) as string)],
      };
    } else if (descendedPast.has(n.id)) {
      perNode[n.id] = {
        status: "unknown",
        confidence: cfg.descendedPast,
        evidenceAttemptIds: [refFor(descendedPast.get(n.id) as string)],
      };
    } else {
      perNode[n.id] = { status: "unknown", confidence: cfg.untouched, evidenceAttemptIds: [] };
    }
  }

  const byCluster: DiagnosticClusterEstimate[] = graph.domains.map((d) => {
    const ids = graph.nodes.filter((n) => n.domain === d.id).map((n) => n.id);
    const total = ids.length;
    const masteredEstimate = ids.filter((id) => perNode[id].status === "mastered").length;
    const probed = ids.filter((id) => state.answered.has(id)).length;
    if (probed === 0) {
      return {
        domainId: d.id,
        status: "unknown",
        confidence: "unknown",
        masteredEstimate,
        total,
        unestimated: true,
      };
    }
    const anyIncorrect = ids.some((id) => state.answered.get(id) === false);
    const status = anyIncorrect
      ? "developing"
      : masteredEstimate === total
        ? "mastered"
        : masteredEstimate > 0
          ? "near_mastery"
          : "unknown";
    const covered = ids.filter(
      (id) => state.answered.has(id) || state.inferred.has(id) || state.demonstrated.includes(id),
    ).length;
    const coverage = total === 0 ? 0 : covered / total;
    const confidence = coverage >= 2 / 3 ? "high" : coverage >= 1 / 3 ? "medium" : "low";
    return { domainId: d.id, status, confidence, masteredEstimate, total, unestimated: false };
  });

  // Recommended start: the committed pipeline over a simulated post-credit
  // state. Demonstrated nodes never include unprobed-domain nodes, so credit
  // (ancestry-only) can never mark an unprobed domain mastered — the
  // recommendation cannot route past one on inference alone.
  const credit = creditFromDiagnostic(session.studentId, graph, state.demonstrated, {}, nowIso);
  const simStates: Record<string, StudentSkillState> = {};
  for (const u of credit.updates) {
    simStates[u.skillId] = {
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
      masteredAt: nowIso,
    };
  }
  const batch = computeMasteryAll(session.studentId, simStates, graph, nowIso);
  const rec = recommend(batch.results, simStates, graph, {
    justCredited: credit.updates.map((u) => u.skillId),
  });

  return {
    perNode,
    byCluster,
    demonstrated: [...state.demonstrated],
    recommendedStart: rec.skillId,
    recommendedReason: rec.reason,
  };
}

// ---------------------------------------------------------------------------
// Pure read-side helpers (mr-gates #3 — no repository interface change).
// Derived from the immutable MasteryUpdate log, never stored.
// ---------------------------------------------------------------------------

/**
 * Has any diagnostic ever CREDITED this student? (trigger "diagnostic")
 * Credit presence, not completion — an all-wrong run completes with zero
 * credit and emits NO such update. For "has the student taken it at all?"
 * use diagnosticTaken(attempts) over the append-only attempt log.
 */
export function wasDiagnosticRun(updates: MasteryUpdate[]): boolean {
  return updates.some((u) => u.trigger === "diagnostic");
}

/**
 * Has this student COMPLETED a diagnostic? Derived from the append-only
 * attempt log: any attempt with source "diagnostic" means a run happened,
 * even when nothing was credited (every answer wrong). Drives the Learning
 * Home "Before you start" gate. Acceleration display still derives from
 * diagnosticCreditedSkills — credit, not mere completion. Read-side only;
 * `source` never enters engine math (types/student.ts isolation rule).
 */
export function diagnosticTaken(attempts: StudentAttempt[]): boolean {
  return attempts.some((a) => a.source === "diagnostic");
}

/**
 * Every skill ever credited by a diagnostic (demonstrated + propagated),
 * deduped, in first-credit order. Drives the Learning Home acceleration
 * callout via recommend({ justCredited }).
 */
export function diagnosticCreditedSkills(updates: MasteryUpdate[]): string[] {
  const out: string[] = [];
  for (const u of updates) {
    if (
      (u.trigger === "diagnostic" || u.trigger === "credit-propagation") &&
      !out.includes(u.skillId)
    ) {
      out.push(u.skillId);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Client graph view
// ---------------------------------------------------------------------------

const EMPTY_HOOKS: ContextHooks = {
  baseball: "",
  softball: "",
  basketball: "",
  soccer: "",
  football: "",
  volleyball: "",
  neutral: "",
};

/**
 * Pruned graph for the in-browser diagnostic loop. The full curriculum graph
 * must NEVER ship to the client (mr-gates Phase 2 condition 1) — this view
 * strips every sport bank (p1/p2), all worked examples, hints,
 * misconception maps, context hooks, and the misconception registry, keeping
 * only what startDiagnostic/nextItem/recordResponse/finishDiagnostic need:
 * domains, node ids/titles/prereqs, and the neutral p3 problems.
 *
 * NOTE (flagged for mr-gates): neutral-p3 AnswerSpecs do reach the browser —
 * the client checks correctness locally to drive adaptive sequencing. The
 * server independently re-checks every response against the real graph and
 * recomputes demonstrated[] itself; client correctness is never trusted.
 */
export function toDiagnosticGraphView(graph: CurriculumGraph): CurriculumGraph {
  return {
    schema: {
      version: graph.schema.version,
      course: graph.schema.course,
      audience: graph.schema.audience,
      sports: [...graph.schema.sports],
      phases: { ...graph.schema.phases },
      masteryStatuses: [...graph.schema.masteryStatuses],
    },
    domains: graph.domains.map((d) => ({ ...d })),
    misconceptionRegistry: [],
    edges: [],
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      domain: n.domain,
      tier: n.tier,
      prereqs: [...n.prereqs],
      standards: { ccss: [], state: null },
      objective: "",
      misconceptionTags: [],
      visual: n.visual,
      contextHooks: { ...EMPTY_HOOKS },
      workedExamples: [],
      problems: {
        p1: [],
        p2: [],
        p3: neutralP3(n).map((p) => ({
          id: p.id,
          version: p.version,
          skillId: p.skillId,
          phase: p.phase,
          sport: p.sport,
          prompt: p.prompt,
          visual: p.visual,
          ...(p.choices ? { choices: [...p.choices] } : {}),
          answer: { ...p.answer },
          hints: [],
          difficulty: p.difficulty,
        })),
      },
    })),
  };
}
