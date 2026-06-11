// Pure number-line math (mr-gates condition 8). No React/SVG/engine imports.

export interface LineConfig {
  from: number;
  to: number;
  /** Pixel width of the drawable line area. */
  width: number;
  /** Inner horizontal padding in px. */
  pad: number;
}

export const DEFAULT_LINE: LineConfig = {
  from: -6,
  to: 6,
  width: 460,
  pad: 24,
};

export function lineSpan(cfg: LineConfig): number {
  return cfg.to - cfg.from;
}

/** Integer ticks from..to inclusive. */
export function ticksFor(cfg: LineConfig): number[] {
  const out: number[] = [];
  for (let i = Math.ceil(cfg.from); i <= cfg.to; i++) out.push(i);
  return out;
}

/** Data value → svg px (x grows right). */
export function valueToPx(v: number, cfg: LineConfig): number {
  const span = lineSpan(cfg);
  if (span <= 0) return cfg.pad;
  return cfg.pad + ((v - cfg.from) / span) * (cfg.width - 2 * cfg.pad);
}

/** svg px → nearest integer tick value, clamped to range. */
export function pxToValue(px: number, cfg: LineConfig): number {
  const span = lineSpan(cfg);
  if (span <= 0) return cfg.from;
  const raw = cfg.from + ((px - cfg.pad) / (cfg.width - 2 * cfg.pad)) * span;
  return clampValue(Math.round(raw), cfg);
}

export function clampValue(v: number, cfg: LineConfig): number {
  return Math.max(cfg.from, Math.min(cfg.to, v));
}

/** Nudge the marker by a signed step, clamped. */
export function nudgeMarker(v: number, step: number, cfg: LineConfig): number {
  return clampValue(v + step, cfg);
}

export interface OperationArc {
  /** Start value of the arc. */
  start: number;
  /** End value of the arc. */
  end: number;
  /** Mono label, e.g. "+7" or "−3". */
  label: string;
}

/** Build an operation arc from a start value and a signed delta. */
export function operationArc(start: number, delta: number): OperationArc {
  const sign = delta >= 0 ? "+" : "−";
  return {
    start,
    end: start + delta,
    label: `${sign}${Math.abs(delta)}`,
  };
}
