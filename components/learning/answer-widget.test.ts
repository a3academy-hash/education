// LB3 / T1 — locks the kind↔widget contract used by DiagnosticFlow and
// PracticeFlow: `choice` answers render the ChoiceInput; every other renderable
// kind renders the text Input. The surfaces have no DOM render-test infra, so
// the contract is asserted at its pure seam (widgetForKind) — a regression that
// reverted choice→text would flip this test red.

import { describe, expect, it } from "vitest";
import { widgetForKind, type AnswerWidget } from "./answer-widget";
import type { AnswerSpec } from "../../types";

describe("widgetForKind — kind↔widget contract", () => {
  it("maps choice → the ChoiceInput widget", () => {
    expect(widgetForKind("choice")).toBe<AnswerWidget>("choice");
  });

  it("maps every typeable kind → the text Input widget", () => {
    const typeable: AnswerSpec["kind"][] = [
      "numeric",
      "expression",
      "inequality",
      "numeric-set",
      "coordinate",
    ];
    for (const kind of typeable) {
      expect(widgetForKind(kind)).toBe<AnswerWidget>("input");
    }
  });

  it("only choice selects the choice widget (exhaustive over the union)", () => {
    const allKinds: AnswerSpec["kind"][] = [
      "numeric",
      "expression",
      "choice",
      "coordinate",
      "inequality",
      "numeric-set",
    ];
    const choiceKinds = allKinds.filter((k) => widgetForKind(k) === "choice");
    expect(choiceKinds).toEqual(["choice"]);
  });
});
