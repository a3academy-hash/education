// MasteryRing invariants (STYLE_GUIDE §3). Dependency-free: render to static
// markup (no jsdom/testing-library) and assert the three-channel + gold-cap +
// muted-firewall contracts hold in the SVG output.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MasteryRing } from "./MasteryRing";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("MasteryRing", () => {
  it("focus ring: solid stroke, hue, active ARIA, Plex-Mono %", () => {
    const out = html(<MasteryRing kind="focus" value={0.42} />);
    expect(out).toContain("Focus ring 42% — active");
    expect(out).toContain("var(--color-focus)");
    expect(out).not.toContain("stroke-dasharray"); // solid
    expect(out).toContain("42%");
  });

  it("retrieval ring: dashed stroke + reviewing ARIA", () => {
    const out = html(<MasteryRing kind="retrieval" value={0.5} />);
    expect(out).toContain('stroke-dasharray="4 4"');
    expect(out).toContain("Retrieval ring 50% — reviewing");
    expect(out).toContain("var(--color-retrieval)");
  });

  it("mastery ring WITHOUT goldCap: no gold, transferring ARIA", () => {
    const out = html(<MasteryRing kind="mastery" value={0.8} />);
    expect(out).not.toContain("var(--color-gold)");
    expect(out).toContain("Mastery ring 80% — transferring");
  });

  it("mastery ring WITH goldCap: gold cap arc + mastered ARIA (earned only)", () => {
    const out = html(<MasteryRing kind="mastery" value={1} goldCap />);
    expect(out).toContain("var(--color-gold)");
    expect(out).toContain("— mastered");
  });

  it("muted (gated test): track-grey fill, no gold, no dash, inactive ARIA", () => {
    const out = html(<MasteryRing kind="mastery" value={0.9} goldCap muted />);
    expect(out).toContain("inactive during this test");
    expect(out).toContain("var(--color-track)");
    expect(out).not.toContain("var(--color-gold)"); // gold suppressed when muted
    expect(out).not.toContain('stroke-dasharray="4 4"');
  });

  it("fill arc carries the test-firewall hooks (.a3-ring-fill / .a3-ring-sweep)", () => {
    const out = html(<MasteryRing kind="focus" value={0.3} />);
    expect(out).toContain("a3-ring-fill");
    expect(out).toContain("a3-ring-sweep");
  });

  it("clamps value to [0,1]", () => {
    expect(html(<MasteryRing kind="focus" value={1.5} />)).toContain("100%");
    expect(html(<MasteryRing kind="focus" value={-1} />)).toContain("0%");
    expect(html(<MasteryRing kind="focus" value={Number.NaN} />)).toContain("0%");
  });
});
