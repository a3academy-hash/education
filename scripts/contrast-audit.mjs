// scripts/contrast-audit.mjs — Phase 5 WCAG-AA gate (STYLE_GUIDE §9).
//
// Parses the ACTUAL tokens out of app/globals.css (the :root/@theme defaults plus the
// [data-surface="focus"] and [data-surface="test"] re-scope blocks), builds the effective
// token map per surface, and checks an explicit pairing manifest. Exits NON-ZERO on any
// failure so it can gate `npm run build` (wired via the "prebuild" script).
//
// Thresholds: normal text 4.5:1; large-text / non-text UI (borders, ring strokes, icons) 3:1.
// Driven off real tokens — a new token can't dodge the audit, and a value that doesn't pass
// fails the build instead of silently shipping a low-contrast surface.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

// ---- sRGB relative luminance + contrast ratio (WCAG 2.1) ----
function srgbToLin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ---- token parsing ----
// Pull every `--color-NAME: <value>;` from a CSS text fragment. Values may be a
// hex OR a `var(--color-OTHER)` indirection (e.g. test canvas → surface-test) —
// both are captured raw and resolved later so the audit sees the REAL color.
function parseTokens(fragment) {
  const map = {};
  const re = /--color-([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(fragment))) map[m[1]] = m[2].trim();
  return map;
}

// Resolve one level (or chain) of `var(--color-X)` against a surface's own map.
function resolveSurface(map) {
  const out = {};
  for (const k of Object.keys(map)) {
    let v = map[k];
    const seen = new Set();
    while (/^var\(\s*--color-([a-z0-9-]+)\s*\)$/.test(v) && !seen.has(v)) {
      seen.add(v);
      const ref = v.match(/^var\(\s*--color-([a-z0-9-]+)\s*\)$/)[1];
      if (map[ref] == null) break;
      v = map[ref];
    }
    out[k] = v;
  }
  return out;
}
// Extract the body of a top-level selector block, e.g. block('[data-surface="focus"]').
function block(selector) {
  const i = CSS.indexOf(selector);
  if (i === -1) return "";
  const open = CSS.indexOf("{", i);
  if (open === -1) return "";
  let depth = 0;
  for (let j = open; j < CSS.length; j++) {
    if (CSS[j] === "{") depth++;
    else if (CSS[j] === "}") {
      depth--;
      if (depth === 0) return CSS.slice(open + 1, j);
    }
  }
  return "";
}

const base = parseTokens(block("@theme"));
const focusOverrides = parseTokens(block('[data-surface="focus"]'));
const testOverrides = parseTokens(block('[data-surface="test"]'));

const trust = resolveSurface({ ...base });
const focus = resolveSurface({ ...base, ...focusOverrides });
const test = resolveSurface({ ...base, ...testOverrides });
const surfaces = { trust, focus, test };

function tok(surface, name) {
  if (name.startsWith("#")) return name.toLowerCase(); // literal hex (e.g. button text)
  const v = surfaces[surface][name];
  if (!v) throw new Error(`token --color-${name} not found for surface "${surface}"`);
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
    throw new Error(`token --color-${name} on "${surface}" did not resolve to a hex: "${v}"`);
  }
  return v.toLowerCase();
}

// ---- manifest: [surface, fgToken, bgToken, minRatio, kind] ----
// kind "text" => 4.5; "ui" => 3.0. (min is explicit so the manifest documents intent.)
const T = 4.5;
const U = 3.0;
const MANIFEST = [
  // Trust (default / on-light) — body text on the two light surfaces.
  ["trust", "ink", "surface", T, "primary text on surface"],
  ["trust", "ink", "canvas", T, "primary text on canvas"],
  ["trust", "ink-700", "surface", T, "secondary text on surface"],
  ["trust", "ink-500", "surface", T, "muted text on surface (AA-safe)"],
  ["trust", "ink-500", "canvas", T, "muted text on canvas"],
  // Trust action/status used as label text (StatusPill etc.) — must clear normal text.
  ["trust", "accent", "surface", T, "accent text/link on surface"],
  ["trust", "#ffffff", "accent", T, "white button text on accent"],
  ["trust", "status-mastered", "surface", T, "mastered/success text on surface"],
  ["trust", "status-near-mastery", "surface", T, "near-mastery text on surface"],
  ["trust", "status-developing", "surface", T, "developing text on surface"],
  ["trust", "status-needs-review", "surface", T, "needs-review text on surface"],
  ["trust", "status-prerequisite-gap", "surface", T, "prereq-gap/error text on surface"],
  ["trust", "error-ink", "error-bg", T, "error ink on error tint"],
  // Trust UI — ring strokes / meaningful borders (non-text).
  ["trust", "focus", "surface", U, "Focus ring stroke on surface"],
  ["trust", "mastery", "surface", U, "Mastery ring stroke on surface"],
  ["trust", "retrieval", "surface", U, "Retrieval ring stroke on surface"],
  ["trust", "border-meaningful", "surface", U, "meaningful border on surface"],
  ["trust", "border-meaningful", "inset", U, "meaningful border on inset"],

  // Test (surface-test #F8FAFC) — body text must still clear.
  ["test", "ink", "surface", T, "primary text on test surface"],
  ["test", "ink", "canvas", T, "primary text on test canvas"],
  ["test", "ink-500", "canvas", T, "muted text on test canvas"],

  // Focus (dark canvas) — text on the dark canvas + raised surface.
  ["focus", "ink", "canvas", T, "chalk text on dark canvas"],
  ["focus", "ink", "surface", T, "chalk text on raised"],
  ["focus", "ink-700", "canvas", T, "secondary text on dark canvas"],
  ["focus", "ink-500", "canvas", T, "muted text on dark canvas"],
  ["focus", "#ffffff", "accent", T, "white button text on accent (dark)"],
  ["focus", "accent", "canvas", U, "accent button-bg/outline on dark (UI)"],
  ["focus", "error-ink", "canvas", T, "re-scoped error ink on dark canvas"],
  ["focus", "status-mastered", "canvas", T, "mastered text on dark canvas"],
  // Focus highlighters (text on dark) — spec §9 says these pass; verify.
  ["focus", "mark-chalk", "canvas", T, "chalk highlighter on dark"],
  ["focus", "mark-cyan", "canvas", T, "cyan highlighter on dark"],
  ["focus", "mark-lime", "canvas", T, "lime highlighter on dark"],
  ["focus", "mark-amber", "canvas", T, "amber highlighter on dark"],
  ["focus", "mark-magenta", "canvas", T, "magenta highlighter on dark"],
  // Focus UI — ring strokes, focus outline, raised boundary (non-text).
  ["focus", "focus", "canvas", U, "Focus ring stroke on dark canvas"],
  ["focus", "mastery", "canvas", U, "Mastery ring stroke on dark canvas"],
  ["focus", "retrieval", "canvas", U, "Retrieval ring stroke on dark canvas"],
  ["focus", "gold", "canvas", U, "gold cap on dark canvas"],
  ["focus", "border-strong", "canvas", U, "raised boundary border on dark canvas"],
];

let failures = 0;
const rows = [];
for (const [surface, fg, bg, min, label] of MANIFEST) {
  let r, ok, fgHex, bgHex;
  try {
    fgHex = tok(surface, fg);
    bgHex = tok(surface, bg);
    r = ratio(fgHex, bgHex);
    ok = r >= min;
  } catch (e) {
    rows.push(`  MISSING ${surface}: ${e.message}`);
    failures++;
    continue;
  }
  if (!ok) failures++;
  rows.push(
    `  ${ok ? "PASS" : "FAIL"}  ${surface.padEnd(5)} ${fg}→${bg}  ${r.toFixed(2)}:1  (need ${min})  ${fgHex} on ${bgHex}  — ${label}`,
  );
}

console.log("WCAG-AA contrast audit (STYLE_GUIDE §9) — tokens parsed from app/globals.css\n");
console.log(rows.join("\n"));
console.log(`\n${MANIFEST.length - failures}/${MANIFEST.length} pairings pass.`);
if (failures > 0) {
  console.error(`\n✗ ${failures} contrast failure(s) — build gated. Fix the token(s) above.`);
  process.exit(1);
}
console.log("\n✓ All required pairings pass AA.");
