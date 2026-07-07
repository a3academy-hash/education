// /preview/pilot — DEV-ONLY preview of the gold node (ALG-L06, from
// docs/gold-node/) and the three pilot slots (ALG-L19/L11/L09, honest stubs
// until content lands in .authoring-tmp/). Server component: reads local files
// through lib/pilot-preview/load.ts (no Supabase, no network, no writes) and
// hands serializable PreviewNode records to the client. Production gate below
// follows the blessed app/dev/gallery/page.tsx pattern ("mr-gates condition 7:
// notFound() in production").

import { notFound } from "next/navigation";
import { loadPreviewNode, PREVIEW_NODE_IDS } from "@/lib/pilot-preview/load";
import { PilotPreviewClient } from "./PilotPreviewClient";

export const metadata = {
  title: "Pilot Content Preview (dev) — A3 Academy",
};

// Content is re-read from disk on every request so authoring iterations in
// docs/gold-node/ and .authoring-tmp/ show up on refresh.
export const dynamic = "force-dynamic";

export default function PilotPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const nodes = PREVIEW_NODE_IDS.map((id) => loadPreviewNode(id));
  return (
    <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">
      <header className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-[22px] font-semibold text-ink">Pilot content preview</h1>
        <p className="text-[13.5px] leading-[1.6] text-ink-500">
          DEV PREVIEW — local file content, no persistence; answer state resets on
          refresh.
        </p>
      </header>
      <PilotPreviewClient nodes={nodes} />
    </main>
  );
}
