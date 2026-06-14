// answer-widget.ts (LB3 / T1). The single source of truth for the
// kind↔widget contract used by both DiagnosticFlow and PracticeFlow: a
// `choice` answer renders the ChoiceInput multiple-choice widget; every other
// renderable kind renders the text Input (+ keypad). Keeping this as a pure
// function gives the widget-mapping a testable seam (the surfaces have no DOM
// render-test infra) so a regression can't silently revert choice→text.

import type { AnswerSpec } from "../../types";

export type AnswerWidget = "choice" | "input";

/**
 * Map an answer kind to its input widget. ONLY `choice` uses the ChoiceInput;
 * numeric / expression / inequality / numeric-set / coordinate all use the
 * text Input + keypad (they are typeable and already score correctly).
 */
export function widgetForKind(kind: AnswerSpec["kind"]): AnswerWidget {
  return kind === "choice" ? "choice" : "input";
}
