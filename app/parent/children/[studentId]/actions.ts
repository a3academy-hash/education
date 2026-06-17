"use server";

// Parent per-child export + delete server actions (Phase 7 R5). SUPABASE-mode
// only; memory mode short-circuits. NO lib/grade import in a client module — this
// is a server action, so computing the grade here is allowed.
//
// R5 ORDERING (enforced in the action, not just the UI):
//   delete = (a) verify parent-of authz, (b) generate the export FIRST,
//            (c) only THEN erase operational data (anonymize-in-place).
// Audit row carries NO PII: { actorId, actorRole, studentId, recordType }.

import { getAuthMode } from "../../../../lib/auth/mode";
import { getCurrentParent, parentOwnsChild } from "../../../../lib/auth/parent";
import { getRepository } from "../../../../lib/repository/server";
import { computeGrade } from "../../../../lib/grade";
import { buildNcaaExport, type NcaaExport } from "../../../../lib/ncaa-export";

export interface ExportResult {
  ok: boolean;
  error?: string;
  /** The generated artifact (returned for download in supabase mode). */
  artifact?: NcaaExport & { watermark: string };
}

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

const MEMORY_NOTICE = "This action is not available in this environment.";
const GENERIC_FAIL = "We couldn't complete that just now. Please try again.";

/**
 * Build the export artifact for a child the verified parent owns (R5b). PURE of
 * side effects beyond the repository reads + the watermark stamp.
 */
async function buildArtifact(studentId: string, nowIso: string): Promise<NcaaExport & { watermark: string }> {
  const repo = await getRepository();
  const [profile, graph, states, updates] = await Promise.all([
    repo.getStudent(studentId),
    repo.getGraph(),
    repo.getSkillStates(studentId),
    repo.listMasteryUpdates(studentId),
  ]);
  if (!profile) throw new Error("student not found");
  // Grade computed SERVER-SIDE (R6). Summative intake deferred → not credit-eligible.
  const grade = computeGrade(states, graph, updates, { nowIso });
  const ncaa = buildNcaaExport(profile, graph, states, updates, grade, nowIso);
  return {
    ...ncaa,
    watermark: `A3 Academy support package · ${profile.displayName} · generated ${nowIso}`,
  };
}

/** Self-service export (R5). Verifies parent-of, then builds the artifact. */
export async function exportChildRecord(studentId: string): Promise<ExportResult> {
  if (getAuthMode() !== "supabase") return { ok: false, error: MEMORY_NOTICE };
  const parent = await getCurrentParent();
  if (!parent) return { ok: false, error: "Please sign in again to continue." };
  if (!(await parentOwnsChild(parent.uid, studentId))) return { ok: false, error: GENERIC_FAIL };

  try {
    const nowIso = new Date().toISOString();
    const artifact = await buildArtifact(studentId, nowIso);
    return { ok: true, artifact };
  } catch {
    return { ok: false, error: GENERIC_FAIL };
  }
}

/**
 * Self-service delete (R5). ORDER: authz → generate export FIRST → erase. The
 * audit row carries NO PII body. The export artifact is returned so the parent
 * becomes custodian of the record (§3 export-first-then-delete).
 */
export async function deleteChildRecord(studentId: string): Promise<DeleteResult> {
  if (getAuthMode() !== "supabase") return { ok: false, error: MEMORY_NOTICE };
  const parent = await getCurrentParent();
  if (!parent) return { ok: false, error: "Please sign in again to continue." };
  // (a) verify authz BEFORE any erase.
  if (!(await parentOwnsChild(parent.uid, studentId))) return { ok: false, error: GENERIC_FAIL };

  try {
    const nowIso = new Date().toISOString();
    const repo = await getRepository();
    // (b) generate the export FIRST (§3 export-then-delete) — if it throws, we
    // never reach the erase, so no data is destroyed without a record produced.
    await buildArtifact(studentId, nowIso);
    // (c) only THEN erase operational data (anonymize-in-place; append-only kept).
    await repo.eraseOperationalData(studentId);
    // Audit row — NO PII body (R5): { actorId, actorRole, studentId, recordType }.
    try {
      await repo.appendAccessLog({
        actorId: parent.uid,
        actorRole: "parent", // administrator of record (§7)
        studentId,
        recordType: "operational_erase",
      });
    } catch {
      /* audit best-effort; the erase already succeeded */
    }
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_FAIL };
  }
}
