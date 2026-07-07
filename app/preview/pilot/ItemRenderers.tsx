"use client";

// app/preview/pilot/ItemRenderers.tsx — one renderer per enriched-item
// archetype for the DEV-ONLY pilot preview. Answers run through the
// deterministic lib/pilot-preview/check.ts (exact equality + accepted
// equivalents); wrong answers are matched against the item's misconceptionMap
// triggers and surface the tag + signature + the referenced hint ladder
// (rungs reveal one at a time, rung 3 never auto-reveals). The `interactive`
// archetype is NOT faked: it renders the interaction contract in an amber
// described-not-built panel. React state only; nothing persists.

import { useMemo, useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import type {
  EnrichedItem,
  HintLadder,
  ItemInteraction,
  ItemPart,
  ItemQuestion,
  PreviewItem,
  PreviewNode,
} from "@/lib/pilot-preview/types";
import { checkChoice, checkNumeric, matchTrigger } from "@/lib/pilot-preview/check";
import { ItemVisualBlock } from "./VisualBlock";
import {
  AuthoringAside,
  BadgeRow,
  ChoiceAnswer,
  Chip,
  CorrectPanel,
  HintLadderPanel,
  NumericAnswerField,
  WrongPanel,
} from "./shared";

// ---------------------------------------------------------------------------
// Attempt state + ladder resolution
// ---------------------------------------------------------------------------

interface AttemptState {
  status: "idle" | "correct" | "wrong";
  tag: string | null;
  signature?: string;
  /** Nonce so each wrong attempt gets a fresh (collapsed) ladder. */
  attempt: number;
}

const IDLE: AttemptState = { status: "idle", tag: null, attempt: 0 };

/** Resolve the ladder for a (possibly null) tag via the item's hintLadderRef,
 * falling back to any node ladder carrying the tag, then the generic ladder.
 * Machine banks carry no ladders yet — HintLadderPanel states that honestly. */
function ladderFor(
  node: PreviewNode,
  item: EnrichedItem,
  tag: string | null,
): HintLadder | null {
  const ref = item.hintLadderRef;
  if (tag !== null) {
    const id = ref?.perTag?.[tag];
    if (id && node.ladders[id]) return node.ladders[id];
    const byTag = Object.values(node.ladders).find((l) => l.tag === tag);
    if (byTag) return byTag;
  }
  if (ref?.generic && node.ladders[ref.generic]) return node.ladders[ref.generic];
  return Object.values(node.ladders).find((l) => l.tag === null) ?? null;
}

function WrongFeedback({
  node,
  item,
  state,
  ladderKey,
}: {
  node: PreviewNode;
  item: EnrichedItem;
  state: AttemptState;
  ladderKey: string;
}) {
  return (
    <>
      <WrongPanel tag={state.tag} signature={state.signature} />
      <HintLadderPanel
        key={`${ladderKey}-${state.attempt}`}
        ladder={ladderFor(node, item, state.tag)}
      />
    </>
  );
}

/** A content shape the renderer refuses to fake (missing parts/choices/etc.). */
function MalformedNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[10px] border border-error-border bg-error-bg-soft px-4 py-3 text-[13px] text-error-ink">
      {children}
    </p>
  );
}

function Stem({ text }: { text: string | undefined }) {
  if (!text) return null;
  return <p className="text-[14.5px] leading-[1.7] text-ink">{text}</p>;
}

// ---------------------------------------------------------------------------
// scaffolded-multistep — parts sequential; part n+1 unlocks on part n correct
// ---------------------------------------------------------------------------

function ScaffoldedItem({ node, item }: { node: PreviewNode; item: EnrichedItem }) {
  const parts = item.parts ?? [];
  const [states, setStates] = useState<Record<string, AttemptState>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (parts.length === 0) {
    return <MalformedNote>scaffolded-multistep item without parts — refusing to fake steps.</MalformedNote>;
  }

  // Sequential gating: a part renders only once every earlier part is correct.
  const firstOpen = parts.findIndex((p) => states[p.partId]?.status !== "correct");
  const visibleCount = firstOpen === -1 ? parts.length : firstOpen + 1;

  /** Wrong-answer tag matching: the part's own map first, then the item-level
   * map with the "partId:" prefix (gold carries both; either may be absent). */
  const resolveWrong = (part: ItemPart, response: string) => {
    const partHit = matchTrigger(response, part.answerType, part.misconceptionMap ?? []);
    return (
      partHit ??
      matchTrigger(response, part.answerType, item.misconceptionMap ?? [], part.partId)
    );
  };

  const submit = (part: ItemPart, response: string) => {
    const ok =
      part.answerType === "choice"
        ? checkChoice(response, part.correctAnswer)
        : checkNumeric(response, part.correctAnswer, part.acceptedEquivalents);
    const hit = ok ? null : resolveWrong(part, response);
    setStates((prev) => {
      const attempt = (prev[part.partId]?.attempt ?? 0) + 1;
      const next: AttemptState = ok
        ? { status: "correct", tag: null, attempt }
        : { status: "wrong", tag: hit?.tag ?? null, signature: hit?.signature, attempt };
      return { ...prev, [part.partId]: next };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {parts.slice(0, visibleCount).map((part, i) => {
        const state = states[part.partId] ?? IDLE;
        const done = state.status === "correct";
        return (
          <div
            key={part.partId}
            className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-4"
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              part ({part.partId})
            </p>
            <p className="text-[14px] leading-[1.7] text-ink-700">{part.prompt}</p>
            {part.answerType === "choice" ? (
              part.choices && part.choices.length > 0 ? (
                <>
                  <ChoiceAnswer
                    options={part.choices.map((c) => ({ id: c.id, text: `${c.id}) ${c.text}` }))}
                    selectedId={selections[part.partId] ?? ""}
                    onSelect={(id) =>
                      setSelections((prev) => ({ ...prev, [part.partId]: id }))
                    }
                    disabled={done}
                    marked={
                      done
                        ? { [selections[part.partId] ?? ""]: "you-correct" }
                        : state.status === "wrong" && selections[part.partId]
                          ? { [selections[part.partId]]: "you-wrong" }
                          : undefined
                    }
                    ariaLabel={`Part (${part.partId}) — choose one`}
                  />
                  {!done && (
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!selections[part.partId]}
                        onClick={() => submit(part, selections[part.partId] ?? "")}
                      >
                        Check
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <MalformedNote>choice part without choices — refusing to fabricate options.</MalformedNote>
              )
            ) : (
              <NumericAnswerField
                label={`Part (${part.partId}) answer`}
                value={values[part.partId] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [part.partId]: v }))}
                onSubmit={() => submit(part, values[part.partId] ?? "")}
                disabled={done}
              />
            )}
            {done && (
              <CorrectPanel>
                {i + 1 < parts.length ? "Next part unlocked below." : "That completes the item."}
              </CorrectPanel>
            )}
            {state.status === "wrong" && (
              <WrongFeedback node={node} item={item} state={state} ladderKey={part.partId} />
            )}
          </div>
        );
      })}
      {visibleCount < parts.length && (
        <p className="text-[12.5px] text-ink-500">
          {parts.length - visibleCount} more part{parts.length - visibleCount === 1 ? "" : "s"}{" "}
          locked — answer part ({parts[visibleCount - 1].partId}) to continue.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// error-analysis — locate (click a shown-work step) → diagnose (keyed MC)
// ---------------------------------------------------------------------------

/** Map shown-work step number n → the locate choice with id "step-n" (or text
 * "Step n"). If any step fails to map, locate falls back to plain MC. */
function locateChoiceForStep(locate: ItemQuestion, stepNumber: number) {
  return locate.choices.find(
    (c) =>
      c.id.trim().toLowerCase() === `step-${stepNumber}` ||
      c.text.trim().toLowerCase() === `step ${stepNumber}`,
  );
}

function ErrorAnalysisItem({ node, item }: { node: PreviewNode; item: EnrichedItem }) {
  const shownWork = item.shownWork ?? [];
  const locate = item.questions?.find((q) => q.questionId === "locate");
  const diagnose = item.questions?.find((q) => q.questionId === "diagnose");

  const [locateState, setLocateState] = useState<AttemptState>(IDLE);
  const [pickedStep, setPickedStep] = useState<number | null>(null);
  const [diagnoseSel, setDiagnoseSel] = useState("");
  const [diagnoseState, setDiagnoseState] = useState<AttemptState>(IDLE);

  if (shownWork.length === 0 || !locate || !diagnose) {
    return (
      <MalformedNote>
        error-analysis item missing shownWork / locate / diagnose — refusing to fake the flow.
      </MalformedNote>
    );
  }

  const clickable = shownWork.every((_, i) => locateChoiceForStep(locate, i + 1));

  const submitLocate = (choiceId: string, stepNumber: number | null) => {
    if (locateState.status === "correct") return;
    setPickedStep(stepNumber);
    const ok = checkChoice(choiceId, locate.correctAnswer);
    const hit = ok
      ? null
      : matchTrigger(choiceId, "choice", item.misconceptionMap ?? [], "locate");
    setLocateState((prev) => ({
      status: ok ? "correct" : "wrong",
      tag: hit?.tag ?? null,
      signature: hit?.signature,
      attempt: prev.attempt + 1,
    }));
  };

  const submitDiagnose = () => {
    const ok = checkChoice(diagnoseSel, diagnose.correctAnswer);
    const hit = ok
      ? null
      : matchTrigger(diagnoseSel, "choice", item.misconceptionMap ?? [], "diagnose");
    setDiagnoseState((prev) => ({
      status: ok ? "correct" : "wrong",
      tag: hit?.tag ?? null,
      signature: hit?.signature,
      attempt: prev.attempt + 1,
    }));
  };

  const locateDone = locateState.status === "correct";

  return (
    <div className="flex flex-col gap-4">
      {/* Shown work: numbered panel; locate = click the first broken step. */}
      <div className="rounded-[10px] border border-track bg-inset p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          {locate.prompt}
          {clickable ? " (click a step)" : ""}
        </p>
        <ol className="flex flex-col gap-1.5">
          {shownWork.map((step, i) => {
            const n = i + 1;
            const isPicked = pickedStep === n;
            const mark = isPicked
              ? locateDone
                ? "border-success-border bg-success-bg"
                : "border-error-border bg-error-bg-soft"
              : "border-transparent";
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={!clickable || locateDone}
                  onClick={() => {
                    const choice = locateChoiceForStep(locate, n);
                    if (choice) submitLocate(choice.id, n);
                  }}
                  className={`w-full rounded-[8px] border px-3 py-2 text-left font-mono text-[13px] leading-[1.6] text-ink-700 ${mark} ${
                    clickable && !locateDone ? "cursor-pointer hover:bg-hover" : "cursor-default"
                  }`}
                >
                  {step}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {!clickable && (
        <>
          <ChoiceAnswer
            options={locate.choices}
            selectedId={pickedStep !== null ? String(pickedStep) : ""}
            onSelect={(id) => submitLocate(id, null)}
            disabled={locateDone}
            ariaLabel="Which step breaks first?"
          />
        </>
      )}
      {locateDone && <CorrectPanel>That step is where the work first breaks.</CorrectPanel>}
      {locateState.status === "wrong" && (
        <WrongFeedback node={node} item={item} state={locateState} ladderKey="locate" />
      )}

      {/* Diagnose appears only after the break is located. */}
      {locateDone && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] leading-[1.7] text-ink-700">{diagnose.prompt}</p>
          <ChoiceAnswer
            options={diagnose.choices.map((c) => ({ id: c.id, text: `${c.id}) ${c.text}` }))}
            selectedId={diagnoseSel}
            onSelect={setDiagnoseSel}
            disabled={diagnoseState.status === "correct"}
            marked={
              diagnoseState.status === "correct"
                ? { [diagnoseSel]: "you-correct" }
                : diagnoseState.status === "wrong" && diagnoseSel
                  ? { [diagnoseSel]: "you-wrong" }
                  : undefined
            }
            ariaLabel="What did the worked student believe?"
          />
          {diagnoseState.status !== "correct" && (
            <div>
              <Button size="sm" variant="secondary" disabled={!diagnoseSel} onClick={submitDiagnose}>
                Check
              </Button>
            </div>
          )}
          {diagnoseState.status === "correct" && (
            <CorrectPanel>Diagnosis matches the error in the work.</CorrectPanel>
          )}
          {diagnoseState.status === "wrong" && (
            <WrongFeedback node={node} item={item} state={diagnoseState} ladderKey="diagnose" />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// predict-reveal — commit (logged, unscored) → reveal → numeric resolve
// ---------------------------------------------------------------------------

function PredictRevealItem({ node, item }: { node: PreviewNode; item: EnrichedItem }) {
  const [prediction, setPrediction] = useState("");
  const [committed, setCommitted] = useState(false);
  const [resolveValue, setResolveValue] = useState("");
  const [resolveState, setResolveState] = useState<AttemptState>(IDLE);

  if (!item.predictChoices || item.predictChoices.length === 0 || !item.resolvePrompt) {
    return (
      <MalformedNote>
        predict-reveal item missing predictChoices / resolvePrompt — refusing to fake the flow.
      </MalformedNote>
    );
  }

  const submitResolve = () => {
    const ok = checkNumeric(
      resolveValue,
      item.resolveCorrectAnswer ?? "",
      item.resolveAcceptedEquivalents,
    );
    const hit = ok ? null : matchTrigger(resolveValue, "numeric", item.misconceptionMap ?? []);
    setResolveState((prev) => ({
      status: ok ? "correct" : "wrong",
      tag: hit?.tag ?? null,
      signature: hit?.signature,
      attempt: prev.attempt + 1,
    }));
  };

  const predictedText = item.predictChoices.find((c) => c.id === prediction)?.text;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] leading-[1.7] text-ink-700">{item.predictPrompt}</p>
        </div>
        <Chip tone="muted">prediction — logged, unscored (state only)</Chip>
        <ChoiceAnswer
          options={item.predictChoices}
          selectedId={prediction}
          onSelect={setPrediction}
          disabled={committed}
          ariaLabel="Your prediction"
        />
        {!committed && (
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!prediction}
              onClick={() => setCommitted(true)}
            >
              Commit prediction
            </Button>
          </div>
        )}
      </div>

      {committed && (
        <>
          <p className="text-[12.5px] text-ink-500">
            Prediction logged (state only, never scored): {predictedText}
          </p>
          {/* The reveal is a described behavior, not a built one — amber
              described-not-built treatment, same as visual specs. */}
          {item.reveal && (
            <div
              className="rounded-[10px] border px-4 py-3"
              style={{ borderColor: "var(--color-retrieval)" }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "var(--color-retrieval)" }}
              >
                REVEAL — DESCRIBED, NOT YET BUILT · {item.reveal.visualRef}
              </p>
              <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-700">{item.reveal.shows}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <p className="text-[14px] leading-[1.7] text-ink-700">{item.resolvePrompt}</p>
            <NumericAnswerField
              label="Resolve"
              value={resolveValue}
              onChange={setResolveValue}
              onSubmit={submitResolve}
              disabled={resolveState.status === "correct"}
            />
            {resolveState.status === "correct" && <CorrectPanel />}
            {resolveState.status === "wrong" && (
              <WrongFeedback node={node} item={item} state={resolveState} ladderKey="resolve" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// discrimination — keyed MC (or numeric where the item keys a numeric answer)
// ---------------------------------------------------------------------------

function DiscriminationItem({ node, item }: { node: PreviewNode; item: EnrichedItem }) {
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState("");
  const [state, setState] = useState<AttemptState>(IDLE);

  if (!item.correctAnswer || !item.answerType) {
    return <MalformedNote>discrimination item missing answerType/correctAnswer.</MalformedNote>;
  }
  if (item.answerType === "choice" && (!item.choices || item.choices.length === 0)) {
    return <MalformedNote>choice discrimination item without choices — refusing to fabricate options.</MalformedNote>;
  }

  const submit = (response: string) => {
    const ok =
      item.answerType === "choice"
        ? checkChoice(response, item.correctAnswer ?? "")
        : checkNumeric(response, item.correctAnswer ?? "");
    const hit = ok
      ? null
      : matchTrigger(response, item.answerType ?? "numeric", item.misconceptionMap ?? []);
    setState((prev) => ({
      status: ok ? "correct" : "wrong",
      tag: hit?.tag ?? null,
      signature: hit?.signature,
      attempt: prev.attempt + 1,
    }));
  };

  return (
    <div className="flex flex-col gap-3">
      {item.answerType === "choice" ? (
        <>
          <ChoiceAnswer
            options={(item.choices ?? []).map((c) => ({ id: c.id, text: `${c.id}) ${c.text}` }))}
            selectedId={selected}
            onSelect={setSelected}
            disabled={state.status === "correct"}
            marked={
              state.status === "correct"
                ? { [selected]: "you-correct" }
                : state.status === "wrong" && selected
                  ? { [selected]: "you-wrong" }
                  : undefined
            }
          />
          {state.status !== "correct" && (
            <div>
              <Button
                size="sm"
                variant="secondary"
                disabled={!selected}
                onClick={() => submit(selected)}
              >
                Check
              </Button>
            </div>
          )}
        </>
      ) : (
        <NumericAnswerField
          value={value}
          onChange={setValue}
          onSubmit={() => submit(value)}
          disabled={state.status === "correct"}
        />
      )}
      {state.status === "correct" && <CorrectPanel />}
      {state.status === "wrong" && (
        <WrongFeedback node={node} item={item} state={state} ladderKey={item.id} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// interactive — described, NOT built. No fake interaction, ever.
// ---------------------------------------------------------------------------

function InteractiveContract({ interaction }: { interaction: ItemInteraction | undefined }) {
  if (!interaction) {
    return <MalformedNote>interactive item without an interaction contract.</MalformedNote>;
  }
  return (
    <div
      className="flex flex-col gap-2 rounded-[10px] border px-4 py-3"
      style={{ borderColor: "var(--color-retrieval)" }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.4px]"
        style={{ color: "var(--color-retrieval)" }}
      >
        INTERACTIVE — DESCRIBED, NOT YET BUILT
      </span>
      <dl className="flex flex-col gap-2">
        <ContractRow label="tool">{interaction.tool}</ContractRow>
        <ContractRow label="manipulates">{interaction.manipulates}</ContractRow>
        <ContractRow label="submittedState">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-[1.55]">
            {JSON.stringify(interaction.submittedState, null, 2)}
          </pre>
        </ContractRow>
        <ContractRow label={`scoring (${interaction.scoring.type}) — correctWhen`}>
          <code className="font-mono text-[12.5px]">{interaction.scoring.correctWhen}</code>
        </ContractRow>
        {interaction.scoring.note && (
          <ContractRow label="scoring note">{interaction.scoring.note}</ContractRow>
        )}
      </dl>
    </div>
  );
}

function ContractRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] leading-[1.6] text-ink-700">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The card: badges → stem → visual (honest mapping) → archetype interaction
// ---------------------------------------------------------------------------

export function ItemCard({
  node,
  previewItem,
}: {
  node: PreviewNode;
  previewItem: PreviewItem;
}) {
  const item = previewItem.item;
  const body = useMemo(() => {
    switch (previewItem.archetype) {
      case "scaffolded-multistep":
        return <ScaffoldedItem node={node} item={item} />;
      case "error-analysis":
        return <ErrorAnalysisItem node={node} item={item} />;
      case "predict-reveal":
        return <PredictRevealItem node={node} item={item} />;
      case "discrimination":
        return <DiscriminationItem node={node} item={item} />;
      case "interactive":
        return <InteractiveContract interaction={item.interaction} />;
    }
  }, [previewItem.archetype, node, item]);

  return (
    <Card padding="compact" as="article">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BadgeRow item={previewItem} />
          <span className="font-mono text-[11.5px] text-ink-500">{item.id}</span>
        </div>
        {/* predict-reveal keeps its stem inside the flow (predictPrompt). */}
        {previewItem.archetype !== "predict-reveal" && <Stem text={item.prompt} />}
        <ItemVisualBlock visual={item.visual} />
        {body}
        {item.authoringNote && <AuthoringAside text={item.authoringNote} />}
      </div>
    </Card>
  );
}
