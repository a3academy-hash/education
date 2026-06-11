// Shared diagnostic constants/types. Kept OUT of actions.ts because a
// "use server" module may only export async functions (onboarding pattern).

import type { DiagnosticPersistResult } from "../../../../types";

/** One raw client response — the server re-checks correctness itself. */
export interface DiagnosticAnswer {
  skillId: string;
  problemId: string;
  response: string;
  timeMs: number;
}

export type PersistDiagnosticResponse =
  | { ok: true; result: DiagnosticPersistResult }
  | { ok: false; error: string };
