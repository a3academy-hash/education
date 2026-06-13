// Placement diagnostic (Phase 3). Server component: reads the opaque student
// cookie, then hands the CLIENT flow a PRUNED graph view (neutral p3 banks
// only — the full curriculum graph never ships to the browser; mr-gates
// Phase 2 condition 1). No student → calm setup pointer (phase3-direction.md).

import { cookies } from "next/headers";
import { getRepository } from "../../../../lib/repository/server";
import { toDiagnosticGraphView } from "../../../../lib/diagnostic-engine";
import { STUDENT_COOKIE } from "../../onboarding/constants";
import { DiagnosticFlow } from "./DiagnosticFlow";

export default async function DiagnosticPage() {
  const cookieStore = await cookies();
  const studentId = cookieStore.get(STUDENT_COOKIE)?.value ?? null;
  const repo = await getRepository();
  const student = studentId ? await repo.getStudent(studentId) : null;

  if (!student) {
    return <DiagnosticFlow graphView={null} />;
  }

  const graph = await repo.getGraph();
  return <DiagnosticFlow graphView={toDiagnosticGraphView(graph)} />;
}
