// lib/insight/suppression — n≥5 small-cell suppression for COHORT aggregates
// (§8 inference channel, B1/R4). PURE: no IO, no Date.now().
//
// SCOPE (binding, R4): this gates COHORT aggregates only — a cell (a count over a
// group of students) with size < minCell is suppressed so a small academy roster
// cannot be re-identified. SINGLE-STUDENT AUTHORIZED READS ARE EXEMPT and must
// NEVER be passed through here: a parent viewing their own child, the admin
// per-student detail, the student themselves, and a coach's own-roster per-child
// severity bands are authorized per-student projections, not cohort cells.
//
// SHIP-GATE (logged, R4): RLS bands only RAW evidence — this app-layer suppressor
// is the SOLE projection-channel defense for cohort aggregates until a follow-up
// coach-banding migration lands. mr-gates attention flagged.

/** A cohort aggregate cell: a labelled count over a group of students. */
export interface CohortCell {
  /** Stable cell key/label (e.g. a band name, a domain id). */
  key: string;
  /** Number of students contributing to this cell. */
  n: number;
  /** The aggregate value (e.g. a fraction or count). Suppressed when n < minCell. */
  value: number;
}

/** A cell after suppression: when suppressed, `value` is null and `n` is hidden. */
export interface SuppressedCell {
  key: string;
  /** Null when suppressed (n < minCell); otherwise the original n. */
  n: number | null;
  /** Null when suppressed; otherwise the original value. */
  value: number | null;
  suppressed: boolean;
}

export interface SuppressOptions {
  /** Minimum cell size; cells with n below this are suppressed. Default 5 (§8). */
  minCell?: number;
}

/**
 * Suppress small cohort cells. Any cell with n < minCell returns value:null,
 * n:null, suppressed:true (no per-child exact metric leaks). PURE; preserves
 * input order. NEVER call this on a single-student authorized projection (R4).
 */
export function suppressCohort(
  cells: CohortCell[],
  opts: SuppressOptions = {},
): SuppressedCell[] {
  const minCell = opts.minCell ?? 5;
  return cells.map((c) => {
    const suppressed = c.n < minCell;
    return {
      key: c.key,
      n: suppressed ? null : c.n,
      value: suppressed ? null : c.value,
      suppressed,
    };
  });
}
