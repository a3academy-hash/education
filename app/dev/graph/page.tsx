// /dev/graph — Curriculum Graph Inspector (Phase 5 §A). Server component.
// notFound() in production (verbatim from /dev/gallery). Reads the graph JSON
// and calls validateGraph(graphJson) DIRECTLY via buildInspectorModel — NOT
// getRepository().getGraph(), which throws on an invalid graph and so could
// never render an invalid banner. Pure read; graph-only; no PII.

import { notFound } from "next/navigation";
import graphJson from "../../../data/algebra1-graph.json";
import { buildInspectorModel, INSPECTOR_SPORTS } from "../../../lib/inspector/model";
import type { InspectorModel, NodeDetail } from "../../../lib/inspector/model";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { LabeledSection } from "../../../components/ui/Panels";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../../../components/ui/Table";
import { CheckIcon } from "../../../components/ui/icons";
import type { ValidationIssue } from "../../../types";

export const metadata = {
  title: "Graph Inspector (dev) — A3 Academy",
};

const LABEL =
  "text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500";
const MICRO =
  "text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500";

function issueDetail(issue: ValidationIssue): string {
  const bits: string[] = [];
  if (issue.path && issue.path.length > 0) bits.push(`path: ${issue.path.join(" → ")}`);
  if (issue.edge) bits.push(`edge: ${issue.edge.from} → ${issue.edge.to}`);
  return bits.join("  ·  ");
}

export default function GraphInspectorPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const model = buildInspectorModel(graphJson as unknown);

  return (
    <main className="mx-auto max-w-[1140px] px-7 py-12">
      <PageHeader
        eyebrow="Dev only · authoring tooling"
        title="Graph inspector"
        subhead="Validation, standards mapping, and content-bank coverage for the curriculum graph. Read-only; graph data only (no student PII)."
      />

      <ImportBanner model={model} />

      <div className="mt-7">
        <ValidationIssues model={model} />
      </div>

      {!model.structureUnavailable && (
        <>
          <div className="mt-7">
            <CoverageReport model={model} />
          </div>
          <div className="mt-7">
            <NodeDetails nodes={model.nodes} />
          </div>
          <div className="mt-7">
            <EdgeList model={model} />
          </div>
        </>
      )}
    </main>
  );
}

function ImportBanner({ model }: { model: InspectorModel }) {
  const tone = model.valid ? "success" : "error";
  const stat = [
    { label: "Schema version", value: model.schemaVersion ?? "—" },
    { label: "Nodes", value: String(model.stats.nodes) },
    { label: "Edges", value: String(model.stats.edges) },
    { label: "Domains", value: String(model.stats.domains) },
    { label: "Roots", value: String(model.stats.roots.length) },
    { label: "Leaves", value: String(model.stats.leaves) },
    { label: "Max depth", value: String(model.stats.maxDepth) },
  ];
  return (
    <Card tone={tone} as="section">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-[9px] w-[9px] shrink-0 rounded-full"
            style={{
              background: model.valid
                ? "var(--color-status-mastered)"
                : "var(--color-status-prerequisite-gap)",
            }}
          />
          <span className="font-display text-[18px] font-semibold text-ink">
            {model.valid ? "Graph valid" : "Graph invalid"}
          </span>
        </div>
        <span className={MICRO}>
          {model.errorCount} error{model.errorCount === 1 ? "" : "s"} ·{" "}
          {model.warningCount} warning{model.warningCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
        {stat.map((s) => (
          <div key={s.label}>
            <p className={MICRO}>{s.label}</p>
            <p className="mt-1 font-mono text-[14px] text-ink">{s.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ValidationIssues({ model }: { model: InspectorModel }) {
  if (model.valid && model.errorCount === 0 && model.warningCount === 0) {
    return (
      <LabeledSection label="Validation report">
        <Card>
          <div className="flex items-center gap-2.5 text-[14px] text-ink-700">
            <CheckIcon className="text-[var(--color-status-mastered)]" />
            0 issues — graph valid.
          </div>
        </Card>
      </LabeledSection>
    );
  }
  return (
    <LabeledSection label="Validation report">
      <div className="grid gap-4">
        {model.errors.length > 0 && (
          <IssueGroup heading="Errors" issues={model.errors} tone="error" />
        )}
        {model.warnings.length > 0 && (
          <IssueGroup heading="Warnings" issues={model.warnings} tone="default" />
        )}
      </div>
    </LabeledSection>
  );
}

function IssueGroup({
  heading,
  issues,
  tone,
}: {
  heading: string;
  issues: ValidationIssue[];
  tone: "error" | "default";
}) {
  return (
    <Card tone={tone === "error" ? "error" : "default"} as="section">
      <p className={`mb-3 ${LABEL}`}>
        {heading} · {issues.length}
      </p>
      <ul className="flex flex-col gap-2.5">
        {issues.map((issue, i) => {
          const detail = issueDetail(issue);
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-block rounded-[5px] border border-border bg-inset px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.3px] text-ink-500">
                {issue.code}
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] leading-[1.5] text-ink-800">
                  {issue.message}
                </p>
                {(issue.nodeId || detail) && (
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink-500">
                    {issue.nodeId ? `node: ${issue.nodeId}` : ""}
                    {issue.nodeId && detail ? "  ·  " : ""}
                    {detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function coverageStateClass(present: boolean): string {
  return present ? "text-ink-800" : "text-ink-400";
}

function CoverageReport({ model }: { model: InspectorModel }) {
  return (
    <LabeledSection label="Coverage report · node × sport × phase">
      <Card padding="flush">
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow first>
                <Th density="dense" className="px-[18px]">
                  Node
                </Th>
                {INSPECTOR_SPORTS.map((sport) => (
                  <Th key={sport} align="right" density="dense" className="pr-3">
                    {sport === "neutral" ? "neutral" : sport.slice(0, 4)}
                  </Th>
                ))}
                <Th align="right" density="dense" className="pr-[18px]">
                  P1·P2·P3
                </Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {model.coverage.map((row, i) => {
                const c0 = row.cells[0];
                return (
                  <TableRow key={row.nodeId} first={i === 0}>
                    <Td density="dense" className="px-[18px]">
                      <span className="font-mono text-[12px] text-ink-500">
                        {row.nodeId}
                      </span>
                      <span className="ml-2 text-ink-800">{row.title}</span>
                    </Td>
                    {row.cells.map((cell) => (
                      <Td
                        key={cell.sport}
                        align="right"
                        density="dense"
                        className={`pr-3 ${coverageStateClass(cell.hook)}`}
                      >
                        {cell.hook ? "●" : "○"}
                      </Td>
                    ))}
                    <Td align="right" density="dense" className="pr-[18px]">
                      {c0.p1}·{c0.p2}·{c0.p3}
                    </Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
      <p className="mt-2 text-[12px] text-ink-500">
        ● = context hook authored for that sport · ○ = missing. P1·P2·P3 = problem-bank counts per phase.
      </p>
    </LabeledSection>
  );
}

function NodeDetails({ nodes }: { nodes: NodeDetail[] }) {
  return (
    <LabeledSection label={`Node detail · ${nodes.length}`}>
      <div className="grid gap-3.5">
        {nodes.map((n) => (
          <Card key={n.id} as="article" padding="compact">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="font-mono text-[12px] text-ink-500">{n.id}</span>
                <span className="ml-2 font-display text-[16px] font-semibold text-ink">
                  {n.title}
                </span>
              </div>
              <span
                className="rounded-[6px] border border-border bg-inset px-2 py-0.5 text-[11px] font-medium text-ink-700"
                title="Derived from CCSS prefix (A-/F-/N-/S-/G- → credit)"
              >
                {n.creditTier === "algebra1-credit" ? "Algebra 1 credit" : "Prerequisite review"}
              </span>
            </div>
            <div className="mt-3 grid gap-x-7 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Domain · tier" value={`${n.domain} · ${n.tier}`} />
              <Field label="Visual" value={n.visual ?? "none"} />
              <Field
                label="Worked examples · WE count"
                value={String(n.workedExamples)}
              />
              <Field
                label="Prereqs"
                value={n.prereqs.length ? n.prereqs.join(", ") : "—"}
                mono
              />
              <Field
                label="Dependents"
                value={n.dependents.length ? n.dependents.join(", ") : "—"}
                mono
              />
              <Field
                label="CCSS · state"
                value={`${n.ccss.join(", ")}${n.state ? ` · ${n.state}` : " · (no state)"}`}
                mono
              />
              <Field
                label="Misconception tags"
                value={n.misconceptionTags.length ? n.misconceptionTags.join(", ") : "—"}
                mono
              />
              <Field
                label="Bank coverage P1·P2·P3"
                value={`${n.coverage.p1}·${n.coverage.p2}·${n.coverage.p3}`}
                mono
              />
              <Field
                label="Hooks present"
                value={`${INSPECTOR_SPORTS.filter((s) => n.coverage.hooks[s]).length} / 7`}
                mono
              />
            </div>
          </Card>
        ))}
      </div>
    </LabeledSection>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={MICRO}>{label}</p>
      <p
        className={`mt-1 break-words text-[13px] text-ink-800 ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EdgeList({ model }: { model: InspectorModel }) {
  return (
    <LabeledSection label={`Edge list · ${model.edges.length}`}>
      <Card padding="flush">
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow first>
                <Th density="dense" className="px-[18px]">
                  From (prerequisite)
                </Th>
                <Th density="dense">To (dependent)</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {model.edges.map((e, i) => (
                <TableRow key={`${e.from}->${e.to}`} first={i === 0}>
                  <Td density="dense" className="px-[18px] font-mono !text-[12px]">
                    {e.from}
                  </Td>
                  <Td density="dense" className="font-mono !text-[12px]">
                    {e.to}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </LabeledSection>
  );
}
