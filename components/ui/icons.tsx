// Inline SVG glyphs (MANDATORY DEVIATION §F-5): raw unicode marks
// (✓ × ⚠ ○ ← →) become 1.5px currentColor strokes, aria-hidden, paired
// with adjacent text by the caller. 14px default box.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 14, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 2.5l5.5 9.5h-11z" />
      <path d="M8 6.5v3" />
      <path d="M8 11.2v.05" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 3.5L5 8l4.5 4.5" />
      <path d="M5 8h7" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 3.5L11 8l-4.5 4.5" />
      <path d="M11 8H4" />
    </svg>
  );
}
