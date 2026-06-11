// DataTable (§C) — built on the ui Table. Specified cells become math Inputs
// (mono, borderless until focus, inset bg). Enter checks: correct → confirmed
// + success dot; wrong → error border + caller hint; second miss → reveal the
// value (ink-500) + needs-review dot and move on (informs, never blocks).
// Tab/Enter walk the fillable cells. Sport = column headers only.

"use client";

import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../ui/Table";
import { CheckIcon } from "../ui/icons";
import {
  checkCell,
  initCell,
  type CellState,
} from "./data-table-logic";

export interface DataColumn {
  key: string;
  header: string;
  align?: "left" | "right";
}

export interface DataCellSpec {
  /** Static display text (used when not fillable). */
  text?: string;
  /** When set, the cell is fillable and checked against this answer. */
  answer?: string;
  /** One-line hint shown after a first miss. */
  hint?: string;
}

export type DataRow = Record<string, DataCellSpec>;

export interface DataTableProps {
  columns: DataColumn[];
  rows: DataRow[];
  caption?: string;
}

export function DataTable({ columns, rows, caption }: DataTableProps) {
  // cell state keyed by `${rowIdx}:${colKey}` for fillable cells only.
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const init: Record<string, CellState> = {};
    rows.forEach((row, r) => {
      columns.forEach((c) => {
        if (row[c.key]?.answer !== undefined) init[`${r}:${c.key}`] = initCell();
      });
    });
    return init;
  });

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Table>
          <TableHead>
            <TableRow first>
              {columns.map((c) => (
                <Th key={c.key} align={c.align}>
                  {c.header}
                </Th>
              ))}
            </TableRow>
          </TableHead>
        </Table>
        <p className="text-[13px] text-ink-500">Make your first prediction.</p>
      </div>
    );
  }

  const setValue = (key: string, value: string) =>
    setCells((cur) => ({
      ...cur,
      [key]: { ...cur[key], value, status: cur[key].status === "error" ? "empty" : cur[key].status },
    }));

  const submit = (key: string, expected: string) =>
    setCells((cur) => {
      const result = checkCell(cur[key], expected);
      return { ...cur, [key]: result.next };
    });

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHead>
          <TableRow first>
            {columns.map((c) => (
              <Th key={c.key} align={c.align}>
                {c.header}
              </Th>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, r) => (
            <TableRow key={r} first={r === 0}>
              {columns.map((c) => {
                const spec = row[c.key];
                const fillable = spec?.answer !== undefined;
                if (!fillable) {
                  return (
                    <Td key={c.key} align={c.align}>
                      {spec?.text ?? ""}
                    </Td>
                  );
                }
                const key = `${r}:${c.key}`;
                const cell = cells[key];
                return (
                  <Td key={c.key} align={c.align}>
                    <FillCell
                      cell={cell}
                      hint={spec?.hint}
                      onValue={(v) => setValue(key, v)}
                      onSubmit={() => submit(key, spec!.answer!)}
                    />
                  </Td>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {caption && <p className="text-[13px] text-ink-500">{caption}</p>}
    </div>
  );
}

function FillCell({
  cell,
  hint,
  onValue,
  onSubmit,
}: {
  cell: CellState;
  hint?: string;
  onValue: (v: string) => void;
  onSubmit: () => void;
}) {
  const locked = cell.status === "confirmed" || cell.status === "revealed";

  if (cell.status === "confirmed") {
    return (
      <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[14px] text-ink">
        <CheckIcon
          size={14}
          style={{ color: "var(--color-status-mastered)" }}
        />
        {cell.value}
      </span>
    );
  }

  if (cell.status === "revealed") {
    return (
      <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[14px] text-ink-500">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-status-needs-review)" }}
        />
        {cell.value}
      </span>
    );
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <span className="flex flex-col items-end gap-1">
      <input
        inputMode="numeric"
        disabled={locked}
        value={cell.value}
        onChange={(e) => onValue(e.target.value)}
        onKeyDown={onKeyDown}
        aria-invalid={cell.status === "error" || undefined}
        placeholder="—"
        className={[
          "w-20 rounded-[8px] bg-inset px-2 py-1.5 text-right font-mono text-[14px] text-ink",
          "border outline-none transition-shadow duration-150",
          cell.status === "error"
            ? "border-[var(--color-status-prerequisite-gap)] focus:shadow-[0_0_0_3px_rgba(180,84,63,.12)]"
            : "border-transparent focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(42,72,120,.12)]",
        ].join(" ")}
      />
      {cell.status === "error" && hint && (
        <span className="text-[12px] text-[var(--color-status-prerequisite-gap)]">
          {hint}
        </span>
      )}
    </span>
  );
}
