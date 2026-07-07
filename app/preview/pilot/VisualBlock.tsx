"use client";

// app/preview/pilot/VisualBlock.tsx — visual-spec rendering under the honest
// mapping rule (constraint 4): coordinate-plane specs whose fields map onto
// the REAL CoordinatePlane props render the real component with a green
// "REAL COMPONENT" badge ("(partial…)" suffix only when fields went unmapped)
// and every unmapped field listed as spec text; everything else renders an
// amber "VISUAL SPEC — NOT BUILT" box with
// the pretty-printed spec. No spec field is ever silently dropped.

import { CoordinatePlane } from "@/components/learning";
import type { ItemVisual } from "@/lib/pilot-preview/types";
import {
  extractLessonPlaneData,
  mapCoordinatePlaneVisual,
  type PlaneRender,
} from "@/lib/pilot-preview/visual-map";

function RealPlane({
  plane,
  unmapped,
  specText,
}: {
  plane: PlaneRender;
  unmapped: string[];
  specText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.4px]"
        style={{
          color: "var(--color-success)",
          borderColor: "var(--color-success-border)",
          background: "var(--color-success-bg)",
        }}
      >
        REAL COMPONENT
        {unmapped.length > 0 ? " (partial: arrows/reveals shown as spec)" : ""}
      </span>
      <CoordinatePlane
        mode="display"
        points={plane.points}
        frame={plane.frame}
        lines={plane.lineThrough ? [{ through: plane.lineThrough }] : []}
        showLine={false}
        xLabel={plane.xLabel}
        yLabel={plane.yLabel}
        size={360}
      />
      {unmapped.length > 0 && (
        <div className="rounded-[10px] border border-track bg-inset px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            spec fields not rendered by the component
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {unmapped.map((u, i) => (
              <li key={i} className="break-words font-mono text-[11.5px] leading-[1.5] text-ink-500">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}
      <SpecDetails specText={specText} />
    </div>
  );
}

function AmberSpecBox({ reason, specText }: { reason: string; specText: string }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[10px] border px-4 py-3"
      style={{ borderColor: "var(--color-retrieval)" }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.4px]"
        style={{ color: "var(--color-retrieval)" }}
      >
        VISUAL SPEC — NOT BUILT
      </span>
      <p className="text-[12.5px] text-ink-500">{reason}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11.5px] leading-[1.55] text-ink-700">
        {specText}
      </pre>
    </div>
  );
}

function SpecDetails({ specText }: { specText: string }) {
  return (
    <details>
      <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        full visual spec
      </summary>
      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-[10px] border border-track bg-inset p-3 font-mono text-[11.5px] leading-[1.55] text-ink-700">
        {specText}
      </pre>
    </details>
  );
}

/** Visual object from an enriched item (JSON spec). */
export function ItemVisualBlock({ visual }: { visual: ItemVisual | undefined }) {
  if (!visual) return null;
  const specText = JSON.stringify(visual, null, 2);
  const result = mapCoordinatePlaneVisual(visual.type, visual.data ?? {});
  const header = (
    <p className="font-mono text-[11.5px] text-ink-500">
      {visual.id} · {visual.type} — {visual.purpose}
    </p>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {header}
      {result.ok ? (
        <RealPlane plane={result.plane} unmapped={result.unmapped} specText={specText} />
      ) : (
        <AmberSpecBox reason={result.reason} specText={specText} />
      )}
    </div>
  );
}

/** ```visual fence from the lesson markdown (YAML-ish raw text). */
export function LessonVisualBlock({
  raw,
  visualId,
  visualType,
}: {
  raw: string;
  visualId: string | null;
  visualType: string | null;
}) {
  const data = extractLessonPlaneData(raw);
  const result = data
    ? mapCoordinatePlaneVisual("coordinate-plane", data)
    : ({ ok: false, reason: `type "${visualType ?? "unknown"}" has no built component` } as const);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[11.5px] text-ink-500">
        {visualId ?? "visual"} · {visualType ?? "unknown"}
      </p>
      {result.ok ? (
        <RealPlane plane={result.plane} unmapped={result.unmapped} specText={raw} />
      ) : (
        <AmberSpecBox reason={result.reason} specText={raw} />
      )}
    </div>
  );
}
