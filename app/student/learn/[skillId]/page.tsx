// Placeholder — the Learn experience is built in Phase 4 (pee-wee-gated).
export default async function LearnPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  return (
    <main className="p-12">
      <h1 className="text-2xl font-semibold">Learn</h1>
      <p className="mt-2 text-neutral-600">Learning for skill {skillId} arrives in Phase 4.</p>
    </main>
  );
}
