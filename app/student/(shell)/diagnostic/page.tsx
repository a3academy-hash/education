// Placeholder — the placement diagnostic is built in Phase 3. Relocated under
// the (shell) route group so it renders within the AppShell chrome.

import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";

export default function DiagnosticPage() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Placement" title="Diagnostic" />
      <Card>
        <p className="text-[14px] text-ink-700">The placement diagnostic arrives in Phase 3.</p>
      </Card>
    </div>
  );
}
