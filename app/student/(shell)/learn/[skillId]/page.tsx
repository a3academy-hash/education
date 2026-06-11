// Placeholder — the Learn experience is built in Phase 4. Relocated under the
// (shell) route group so it renders within the AppShell chrome.

import { PageHeader } from "../../../../../components/ui/PageHeader";
import { Card } from "../../../../../components/ui/Card";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Learn" title="Learning session" />
      <Card>
        <p className="text-[14px] text-ink-700">
          Learning for skill {skillId} arrives in Phase 4.
        </p>
      </Card>
    </div>
  );
}
