// Placement diagnostic (Phase 3). Server component: reads the opaque student
// cookie, then hands the CLIENT flow a PRUNED graph view (neutral p3 banks
// only — the full curriculum graph never ships to the browser; mr-gates
// Phase 2 condition 1). No student → calm setup pointer (phase3-direction.md).

import { getRepository } from "../../../../lib/repository/server";
import { toDiagnosticGraphView } from "../../../../lib/diagnostic-engine";
import { getCurrentStudentId } from "../../../../lib/auth/session";
import { DiagnosticFlow } from "./DiagnosticFlow";
import { SurfacePanel } from "../../../../components/layout/SurfacePanel";

export default async function DiagnosticPage() {
  const studentId = await getCurrentStudentId();
  const repo = await getRepository();
  const student = studentId ? await repo.getStudent(studentId) : null;

  if (!student) {
    return (
      <SurfacePanel surface="test">
        <DiagnosticFlow graphView={null} />
      </SurfacePanel>
    );
  }

  const graph = await repo.getGraph();
  return (
    <SurfacePanel surface="test">
      <DiagnosticFlow graphView={toDiagnosticGraphView(graph)} />
    </SurfacePanel>
  );
}
