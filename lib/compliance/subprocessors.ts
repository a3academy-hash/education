// lib/compliance/subprocessors — the subprocessor register + parent-notice
// generator (§15, R12). PURE: no IO, no Date.now(). mr-gates GATED.
//
// Every vendor that touches child data is registered here. DPAs / sub-processor
// flow-downs are a LAUNCH BLOCKER (§15) — every entry seeds dpaStatus:"pending"
// to keep that visible. The grade/NCAA/dashboard surfaces never read this; the
// parent notice does, via parentNoticeSection.
//
// LEAK GUARD (R11): parentNoticeSection emits ONLY inParentNotice entries and
// NEVER surfaces dpaStatus or securityCommitments (those are internal compliance
// posture, not parent-facing copy).

export type DpaStatus = "pending" | "executed" | "not_required";
export type SccStatus = "pending" | "executed" | "not_applicable";

export interface SubprocessorEntry {
  provider: string;
  dataShared: string;
  purpose: string;
  /** Does this vendor touch child personal data? */
  childData: boolean;
  retention: string;
  region: string;
  dpaStatus: DpaStatus;
  sccStatus: SccStatus;
  securityCommitments: string;
  deletionSupport: string;
  /** Whether this vendor appears in the plain-language parent sharing notice. */
  inParentNotice: boolean;
}

/**
 * The seeded register (§15 minimum set). All DPAs start "pending" — the launch
 * blocker is visible until paperwork is executed. Frozen so callers cannot
 * mutate the source of truth.
 */
export const SUBPROCESSOR_REGISTER: readonly SubprocessorEntry[] = Object.freeze([
  {
    provider: "Supabase",
    dataShared: "Account identity, learning telemetry, attempts, mastery records",
    purpose: "Primary database, authentication, and row-level-security enforcement",
    childData: true,
    retention: "While enrolled; deleted/anonymized within 30 days of verified parent request",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "RLS, encryption at rest/in transit, SOC 2 (vendor)",
    deletionSupport: "Row-level erase + anonymization via service role",
    inParentNotice: true,
  },
  {
    provider: "Vercel",
    dataShared: "Request metadata, IP (transient), session cookies",
    purpose: "Application hosting and edge delivery",
    childData: true,
    retention: "Transient request logs per vendor policy",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "TLS, platform isolation, vendor SOC 2",
    deletionSupport: "Log expiry per vendor policy",
    inParentNotice: true,
  },
  {
    provider: "Email provider",
    dataShared: "Parent email address, notification content",
    purpose: "Transactional notices (consent, digests, account)",
    childData: false,
    retention: "Per vendor policy; minimized",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "TLS, vendor security program",
    deletionSupport: "Suppression + deletion on request",
    inParentNotice: true,
  },
  {
    provider: "LLM tutor provider",
    dataShared: "Tokenized misconception tags + session id (NO raw PII body, §10)",
    purpose: "Advisory natural-language scaffolding (never routes/grades)",
    childData: true,
    retention: "Same as raw submissions; no training use by provider",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "No-training-use commitment, input/output filtering",
    deletionSupport: "Deleted/anonymized with operational data",
    inParentNotice: true,
  },
  {
    provider: "Analytics",
    dataShared: "Anonymized usage events only (irreversibly de-identified)",
    purpose: "Product analytics",
    childData: false,
    retention: "Indefinite ONLY if irreversibly de-identified",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "No re-identification path; no advertising disclosure ever",
    deletionSupport: "n/a (de-identified)",
    inParentNotice: false,
  },
  {
    provider: "Error logging",
    dataShared: "Stack traces, actor/student ids (NO answer text or transcript bodies)",
    purpose: "Reliability and incident response",
    childData: true,
    retention: "Separate from learning data; minimized",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "PII-body scrubbing, access controls",
    deletionSupport: "Log expiry + scrub on request",
    inParentNotice: false,
  },
  {
    provider: "Payment processor",
    dataShared: "Parent billing identity, payment-account match (VPC)",
    purpose: "Billing and verifiable-parental-consent identity match",
    childData: false,
    retention: "Per PCI + vendor policy",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "PCI-DSS, tokenized cards",
    deletionSupport: "Per financial-record retention law",
    inParentNotice: true,
  },
  {
    provider: "File storage",
    dataShared: "Export packages, work samples",
    purpose: "Generated export artifacts (watermarked, short-TTL signed URLs)",
    childData: true,
    retention: "While enrolled / per export election; deleted with operational data",
    region: "US",
    dpaStatus: "pending",
    sccStatus: "not_applicable",
    securityCommitments: "Private buckets, family/student-scoped paths, signed URLs",
    deletionSupport: "Object delete on request",
    inParentNotice: true,
  },
]);

/** A parent-facing sharing-notice row — NO internal compliance posture leaks. */
export interface ParentNoticeRow {
  provider: string;
  dataShared: string;
  purpose: string;
  childData: boolean;
  retention: string;
}

/**
 * The plain-language sharing notice for parents (§4 direct notice). Returns ONLY
 * inParentNotice entries, projected to parent-facing fields — dpaStatus and
 * securityCommitments are NEVER included (R11). PURE; preserves register order.
 */
export function parentNoticeSection(
  register: readonly SubprocessorEntry[] = SUBPROCESSOR_REGISTER,
): ParentNoticeRow[] {
  return register
    .filter((e) => e.inParentNotice)
    .map((e) => ({
      provider: e.provider,
      dataShared: e.dataShared,
      purpose: e.purpose,
      childData: e.childData,
      retention: e.retention,
    }));
}
