// Table (§B): header = label style + 1px bottom border; rows 14/500 with
// 12.5 secondary; dividers 1px color-selected; numerals right-aligned mono.
// No zebra; hover only on link-rows. Thin wrappers, caller composes cells.

import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export type CellAlign = "left" | "right";
export type Density = "default" | "dense";

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <table className={`w-full border-collapse text-left ${className}`}>
      {children}
    </table>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export interface TableRowProps {
  children: ReactNode;
  /** First body row drops its top divider. */
  first?: boolean;
  /** link-rows get a hover background. */
  interactive?: boolean;
  className?: string;
}

export function TableRow({
  children,
  first = false,
  interactive = false,
  className = "",
}: TableRowProps) {
  return (
    <tr
      className={[
        first ? "" : "border-t border-selected",
        interactive
          ? "cursor-pointer transition-colors duration-150 hover:bg-hover"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </tr>
  );
}

const ALIGN: Record<CellAlign, string> = {
  left: "text-left",
  right: "text-right tabular-nums font-mono",
};

const DENSITY: Record<Density, string> = {
  default: "px-[18px] py-4",
  dense: "py-[11px]",
};

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  density?: Density;
}

export function Th({
  children,
  align = "left",
  density = "default",
  className = "",
  ...rest
}: ThProps) {
  return (
    <th
      scope="col"
      className={`border-b border-border text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500 ${ALIGN[align]} ${DENSITY[density]} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  density?: Density;
  /** Secondary cells render smaller/muted. */
  secondary?: boolean;
}

export function Td({
  children,
  align = "left",
  density = "default",
  secondary = false,
  className = "",
  ...rest
}: TdProps) {
  return (
    <td
      className={`${
        secondary ? "text-[12.5px] text-ink-500" : "text-[14px] font-medium text-ink"
      } ${ALIGN[align]} ${DENSITY[density]} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
