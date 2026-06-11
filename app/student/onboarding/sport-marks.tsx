// Sport marks (§D-2): single-color, 1.5px-stroke, top-down field/court/diamond
// line drawings — ink-700, ~40px tall. No illustration, mascots, or team
// colors. aria-hidden; the card label carries the accessible name.

import type { SVGProps } from "react";

type MarkProps = SVGProps<SVGSVGElement>;

function frame(props: MarkProps) {
  return {
    width: 56,
    height: 40,
    viewBox: "0 0 56 40",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function BaseballMark(props: MarkProps) {
  // top-down diamond
  return (
    <svg {...frame(props)}>
      <path d="M28 6 L46 24 L28 38 L10 24 Z" />
      <path d="M28 26 L20 32 M28 26 L36 32" />
      <circle cx={28} cy={26} r={1.5} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SoftballMark(props: MarkProps) {
  return (
    <svg {...frame(props)}>
      <path d="M28 7 L45 24 L28 37 L11 24 Z" />
      <circle cx={28} cy={24} r={5} />
    </svg>
  );
}

export function BasketballMark(props: MarkProps) {
  // half court: key + arc
  return (
    <svg {...frame(props)}>
      <rect x={8} y={6} width={40} height={28} rx={1} />
      <rect x={22} y={6} width={12} height={11} />
      <path d="M22 17 a6 6 0 0 0 12 0" />
      <path d="M14 6 a20 20 0 0 0 28 0" />
    </svg>
  );
}

export function SoccerMark(props: MarkProps) {
  // pitch with center circle
  return (
    <svg {...frame(props)}>
      <rect x={7} y={7} width={42} height={26} rx={1} />
      <line x1={28} y1={7} x2={28} y2={33} />
      <circle cx={28} cy={20} r={5} />
      <rect x={7} y={13} width={6} height={14} />
      <rect x={43} y={13} width={6} height={14} />
    </svg>
  );
}

export function FootballMark(props: MarkProps) {
  // gridiron with yard lines
  return (
    <svg {...frame(props)}>
      <rect x={7} y={8} width={42} height={24} rx={1} />
      <line x1={18} y1={8} x2={18} y2={32} />
      <line x1={28} y1={8} x2={28} y2={32} />
      <line x1={38} y1={8} x2={38} y2={32} />
    </svg>
  );
}

export function VolleyballMark(props: MarkProps) {
  // court with net
  return (
    <svg {...frame(props)}>
      <rect x={9} y={9} width={38} height={22} rx={1} />
      <line x1={28} y1={5} x2={28} y2={35} />
      <line x1={19} y1={9} x2={19} y2={31} strokeDasharray="2 2" />
      <line x1={37} y1={9} x2={37} y2={31} strokeDasharray="2 2" />
    </svg>
  );
}

export function NeutralMark(props: MarkProps) {
  // plain coordinate cross — "straight math"
  return (
    <svg {...frame(props)}>
      <line x1={28} y1={7} x2={28} y2={33} />
      <line x1={11} y1={20} x2={45} y2={20} />
      <path d="M28 7 l-3 4 M28 7 l3 4" />
      <path d="M45 20 l-4 -3 M45 20 l-4 3" />
    </svg>
  );
}
