// CreditedTag — a faint chip marking mastery that came from diagnostic / credit-
// propagation evidence rather than practiced work (Phase 7, pee-wee P5). Used in
// BOTH the admin mastery map and the parent transcript. Quiet by design: inset
// tint, ink-500, no color alarm. Token vocabulary only — no new colors.

export interface CreditedTagProps {
  className?: string;
}

export function CreditedTag({ className = "" }: CreditedTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-track bg-inset px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.4px] text-ink-500 ${className}`}
    >
      Credited
    </span>
  );
}
