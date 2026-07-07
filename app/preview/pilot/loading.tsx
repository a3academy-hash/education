// /preview/pilot loading state — the server component reads local files on
// every request; this keeps the route calm (no layout jump) while it does.

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">
      <p className="text-[13.5px] text-ink-500">Reading local preview content…</p>
    </main>
  );
}
