import { describe, expect, it } from "vitest";
import { newAtom, predict, resolve, canAdvance, fadeStage } from "./index";

const nonEmpty = (s: string) => s.trim().length > 0;

describe("atom contract — predict/construct -> resolve (no slideshow)", () => {
  it("a fresh atom cannot advance", () => {
    expect(canAdvance(newAtom<string>())).toBe(false);
  });

  it("an empty/invalid prediction does NOT commit (stays awaiting, cannot advance)", () => {
    const a = predict(newAtom<string>(), "   ", nonEmpty);
    expect(a.state).toBe("awaiting_prediction");
    expect(canAdvance(a)).toBe(false);
  });

  it("a committed prediction -> resolving -> resolved -> can advance", () => {
    const committed = predict(newAtom<string>(), "y = 2x + 1", nonEmpty);
    expect(committed.state).toBe("resolving");
    expect(canAdvance(committed)).toBe(false); // not yet resolved
    const resolved = resolve(committed);
    expect(resolved.state).toBe("resolved");
    expect(canAdvance(resolved)).toBe(true);
  });

  it("cannot resolve without a committed output (no advance via resolve shortcut)", () => {
    const a = resolve(newAtom<string>()); // resolve from awaiting -> no-op
    expect(a.state).toBe("awaiting_prediction");
    expect(canAdvance(a)).toBe(false);
  });

  it("predict is correctable BEFORE resolve, frozen AFTER", () => {
    let a = predict(newAtom<string>(), "wrong", nonEmpty);
    a = predict(a, "corrected", nonEmpty); // correction allowed while resolving
    expect(a.output).toBe("corrected");
    const r = resolve(a);
    const after = predict(r, "too late", nonEmpty); // no-op once resolved
    expect(after.output).toBe("corrected");
    expect(after.state).toBe("resolved");
  });

  it("fadeStage ladder: full -> fill -> independent as phase/mastery rise", () => {
    expect(fadeStage(1, 0.1)).toBe("full_example");
    expect(fadeStage(1, 0.5)).toBe("fill_one_step");
    expect(fadeStage(2, 0.7)).toBe("fill_more");
    expect(fadeStage(3, 0.9)).toBe("independent");
  });
});
