"use client";

// Parent per-child export + delete affordances (Phase 7 R5). CLIENT component —
// NO lib/grade import here (the grade is computed server-side and never shipped).
// The delete uses a focus-managed confirm modal with an "export first" warning and
// a NON-COLOR destructive affordance (an explicit typed confirmation), not a red
// button alone.

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import {
  deleteChildRecord,
  exportChildRecord,
  type ExportResult,
} from "./actions";

export interface ChildRecordActionsProps {
  studentId: string;
  childName: string;
}

export function ChildRecordActions({ studentId, childName }: ChildRecordActionsProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function onExport() {
    setExporting(true);
    setExportError(null);
    const res: ExportResult = await exportChildRecord(studentId);
    setExporting(false);
    if (!res.ok || !res.artifact) {
      setExportError(res.error ?? "Export failed.");
      return;
    }
    downloadJson(res.artifact, `a3-record-${childName}.json`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={onExport} loading={exporting}>
        Export record
      </Button>
      <Button variant="quiet" onClick={() => setModalOpen(true)}>
        Delete record
      </Button>
      {exportError && (
        <p role="alert" className="text-[12.5px] text-[var(--color-error)]">
          {exportError}
        </p>
      )}
      {modalOpen && (
        <DeleteConfirmModal
          studentId={studentId}
          childName={childName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({
  studentId,
  childName,
  onClose,
}: {
  studentId: string;
  childName: string;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus management: focus the confirm input on open; restore focus on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [busy, onClose]);

  // NON-COLOR destructive affordance: require typing DELETE to enable the action.
  const armed = confirmText.trim().toUpperCase() === "DELETE";

  async function onConfirm() {
    if (!armed) return;
    setBusy(true);
    setError(null);
    const res = await deleteChildRecord(studentId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Delete failed.");
      return;
    }
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,23,42,0.35)] px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-record-title"
    >
      <div className="w-full max-w-[460px] rounded-[16px] border border-border bg-surface p-7 shadow-lg">
        <h2 id="delete-record-title" className="font-display text-[18px] font-semibold text-ink">
          Delete {childName}&rsquo;s record
        </h2>

        {done ? (
          <>
            <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
              The record has been deleted. Operational data was anonymized; the
              evidence ledger is preserved for audit.
            </p>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
              Export this record first — deleting it may limit future NCAA or
              transcript support. This anonymizes {childName}&rsquo;s work; it cannot
              be undone.
            </p>
            <label className="mt-5 block text-[13px] font-medium text-ink-700">
              Type DELETE to confirm
              <input
                ref={inputRef}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-canvas px-3 py-2 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Type DELETE to confirm"
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 text-[12.5px] text-[var(--color-error)]">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="quiet" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={onConfirm} disabled={!armed} loading={busy}>
                Delete record
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
