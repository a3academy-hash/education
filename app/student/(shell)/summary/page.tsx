// Placeholder — the session summary is built in Phase 4. Relocated under the
// (shell) route group so it renders within the AppShell chrome.

import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";

export default function SummaryPage() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Session" title="Summary" />
      <Card>
        <p className="text-[14px] text-ink-700">Your session summary arrives in Phase 4.</p>
      </Card>
    </div>
  );
}
