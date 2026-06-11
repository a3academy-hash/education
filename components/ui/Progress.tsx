// Progress (§B): track radius full; fill accent or a status color. Heights
// 4/6/8. Width transition 400ms ease-calm. role=progressbar with aria
// value attrs. No in-bar text — numbers live adjacent (mono), caller-owned.

export type ProgressHeight = 4 | 6 | 8;

export interface ProgressProps {
  /** 0..1 fraction. */
  value: number;
  height?: ProgressHeight;
  /** CSS color for the fill; defaults to accent. */
  fill?: string;
  label?: string;
  className?: string;
}

export function Progress({
  value,
  height = 6,
  fill = "var(--color-accent)",
  label,
  className = "",
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const pct = Math.round(clamped * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-track ${className}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[400ms] ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ width: `${pct}%`, background: fill }}
      />
    </div>
  );
}
