"use client";

// components/learning/MathKeypad.tsx — the math INPUT keypad (Phase 8 / C-2).
//
// WHAT IT IS: a thin single row of notation keys below the answer Input. It makes
// ² √ ± π and a/b fractions TYPEABLE; it never invents a new accepted format and
// it NEVER imports the engine. The keys it shows are driven ONLY by the
// inputNotation flags computed (answer-free) upstream — the answer value never
// reaches this component.
//
// THE ROUND-TRIP RULE (mr-gates): every key emits the form the FROZEN checkAnswer
// already accepts. The graph authors unicode superscripts in answers, so the
// superscript toggle maps typed digits 0-9 → ⁰¹²³⁴⁵⁶⁷⁸⁹ (so "x" + toggle + "2"
// → "x²"). The fraction key inserts "/" (parseNumeric accepts a/b). √ ± π insert
// the literal glyph. The conformance test in lib/problem-engine pins this.
//
// FOCUS-SAFE INSERTION (make-or-break): every key uses onMouseDown preventDefault
// so the Input never blurs; we insert at the live cursor/selection via
// setRangeText and restore the caret just past the inserted token. After any tap
// the student keeps typing on the physical keyboard with no focus hop.
//
// SUPERSCRIPT MODE: tapping x² turns superscript ON. While ON, a keydown listener
// on the Input rewrites typed 0-9 into the matching unicode superscript at the
// caret. Mode ends on a second tap, a space, an operator (+ − × / =), blur, or
// submit. Active state shows an accent ring + tint + an "exponent on" micro-hint.
//
// pee-wee §B: inset tray (radius-md, pad 8, transparent chips), NO card/shadow,
// ≥40px targets, accent focus-visible ring, tab-navigable AFTER the Input.

import { useCallback, useEffect, useRef, useState } from "react";
import type { InputNotation } from "../../lib/math-notation/input-notation";

export interface MathKeypadProps {
  /** Which keys to show — answer-free flags from inputNotation(). */
  notation: InputNotation;
  /** Ref to the answer <input> the keys insert into. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Current Input value (controlled). */
  value: string;
  /** Commit a new Input value (mirrors React onChange). */
  onValueChange: (next: string) => void;
}

/** Digit → unicode superscript glyph (the form the graph authors in answers). */
const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** Keys that END superscript mode when typed (base resumes after the exponent). */
const SUPER_END_KEYS = new Set([" ", "+", "-", "−", "*", "×", "/", "=", "Enter"]);

/**
 * Insert `token` at the Input's current selection, restore the caret just past
 * it, keep focus in the Input, and commit via onValueChange. Focus-safe: the
 * caller's onMouseDown preventDefault keeps the Input from blurring first.
 */
function insertAtCursor(
  input: HTMLInputElement | null,
  value: string,
  token: string,
  onValueChange: (next: string) => void,
): void {
  if (!input) {
    onValueChange(value + token);
    return;
  }
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  onValueChange(next);
  const caret = start + token.length;
  // Restore focus + caret after React commits the controlled value.
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(caret, caret);
  });
}

interface KeyDef {
  id: keyof InputNotation | "superscript" | "minus";
  label: string; // visible chip glyph
  aria: string;
  token?: string; // literal insert (non-toggle keys)
}

export function MathKeypad({
  notation,
  inputRef,
  value,
  onValueChange,
}: MathKeypadProps) {
  const [superMode, setSuperMode] = useState(false);
  // Keep the latest value/handler for the imperative keydown listener.
  const valueRef = useRef(value);
  const changeRef = useRef(onValueChange);
  valueRef.current = value;
  changeRef.current = onValueChange;

  // While superscript mode is ON, rewrite typed 0-9 at the caret into the
  // matching superscript glyph. Operators/space/Enter exit the mode (and pass
  // through untouched so the base resumes / the form submits).
  useEffect(() => {
    if (!superMode) return;
    const input = inputRef.current;
    if (!input) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in SUPERSCRIPT && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        insertAtCursor(input, valueRef.current, SUPERSCRIPT[e.key], changeRef.current);
        return;
      }
      if (SUPER_END_KEYS.has(e.key)) setSuperMode(false);
    };
    const onBlur = () => setSuperMode(false);
    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("blur", onBlur);
    return () => {
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", onBlur);
    };
  }, [superMode, inputRef]);

  const insert = useCallback(
    (token: string) => {
      // Inserting a literal operator/space/glyph ends superscript mode.
      if (superMode) setSuperMode(false);
      insertAtCursor(inputRef.current, valueRef.current, token, changeRef.current);
    },
    [inputRef, superMode],
  );

  const toggleSuper = useCallback(() => {
    setSuperMode((on) => !on);
    // Keep the caret in the Input so the next typed digit lands in the exponent.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  // Build the visible key list from the flags only (most items show 1–2 keys).
  const keys: KeyDef[] = [];
  if (notation.superscript) keys.push({ id: "superscript", label: "x²", aria: "Toggle superscript" });
  if (notation.fraction) keys.push({ id: "fraction", label: "a⁄b", aria: "Insert fraction", token: "/" });
  if (notation.radical) keys.push({ id: "radical", label: "√", aria: "Insert square root", token: "√" });
  if (notation.plusminus) keys.push({ id: "plusminus", label: "±", aria: "Insert plus or minus", token: "±" });
  if (notation.pi) keys.push({ id: "pi", label: "π", aria: "Insert pi", token: "π" });
  // A minus key is always present when the keypad shows (signed answers are common).
  keys.push({ id: "minus", label: "−", aria: "Insert minus", token: "-" });

  if (keys.length === 0) return null;

  return (
    <div className="mt-2">
      <div
        className="inline-flex flex-wrap items-center gap-1.5 rounded-[10px] bg-inset p-2"
        role="group"
        aria-label="Math notation keys"
      >
        {keys.map((k) => {
          const isToggle = k.id === "superscript";
          const active = isToggle && superMode;
          return (
            <button
              key={k.id}
              type="button"
              aria-label={k.aria}
              aria-pressed={isToggle ? superMode : undefined}
              // FOCUS-SAFE: keep the Input from blurring on press.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (isToggle ? toggleSuper() : insert(k.token ?? ""))}
              className={[
                "inline-flex h-10 min-w-10 items-center justify-center rounded-[7px] px-2.5",
                "font-mono text-[15px] transition-colors duration-150",
                "ease-[cubic-bezier(.2,.7,.2,1)]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "border border-accent bg-accent-tint text-accent shadow-[0_0_0_3px_rgba(42,72,120,.12)]"
                  : "border border-transparent text-ink-700 hover:bg-hover",
              ].join(" ")}
            >
              {k.label}
            </button>
          );
        })}
        {superMode && (
          <span className="ml-1 text-[12px] text-ink-500" aria-hidden>
            exponent on
          </span>
        )}
      </div>
    </div>
  );
}
