"use client";

// Dev gallery: exercises every primitive in every state. Not a student surface;
// dev-only (guarded by notFound() in production in page.tsx).

import { useState } from "react";
import type { MasteryStatus } from "../../../types";
import {
  AlertPanel,
  Button,
  Card,
  CheckIcon,
  CrossIcon,
  InsetPanel,
  Input,
  LabeledSection,
  PageHeader,
  Progress,
  StatusPill,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Td,
  Th,
} from "../../../components/ui";
import {
  BalanceScale,
  CoordinatePlane,
  DataTable,
  NumberLine,
  StepReveal,
} from "../../../components/learning";
import type { Point } from "../../../components/learning/coordinate-plane-math";

const ALL_STATUSES: MasteryStatus[] = [
  "unknown",
  "introduced",
  "developing",
  "near_mastery",
  "mastered",
  "needs_review",
  "prerequisite_gap",
];

export function GalleryClient() {
  return (
    <div className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">
      <PageHeader
        eyebrow="Dev only"
        title="Component gallery"
        subhead="Every UI primitive in every state and every math primitive in representative interactive states. Not linked from student navigation."
      />

      <div className="flex flex-col gap-12">
        <UISection />
        <MathSection />
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-[24px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

function UISection() {
  const [loading, setLoading] = useState(false);
  return (
    <Group title="UI primitives">
      <LabeledSection label="Button — variants">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="quiet">Quiet</Button>
        </div>
      </LabeledSection>

      <LabeledSection label="Button — sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md">
            Primary md
          </Button>
          <Button variant="primary" size="sm">
            Primary sm
          </Button>
          <Button variant="secondary" size="sm">
            Secondary sm
          </Button>
        </div>
      </LabeledSection>

      <LabeledSection label="Button — disabled and loading">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? "Saving" : "Click to load"}
          </Button>
        </div>
      </LabeledSection>

      <LabeledSection label="Input — text, math, helper, error, disabled">
        <div className="grid max-w-[640px] grid-cols-2 gap-5">
          <Input label="Text input" placeholder="Type here" fieldMode="text" />
          <Input label="Math input" placeholder="3x + 4" fieldMode="math" />
          <Input
            label="With helper"
            placeholder="First name"
            helperText="First name only — that's all we need."
          />
          <Input
            label="With error"
            defaultValue="??"
            fieldMode="math"
            errorText="Enter a valid value to continue."
          />
          <Input label="Disabled" placeholder="Locked" disabled />
        </div>
      </LabeledSection>

      <LabeledSection label="Progress — heights and a status fill">
        <div className="flex max-w-[420px] flex-col gap-4">
          <Progress value={0.25} height={4} />
          <Progress value={0.5} height={6} />
          <Progress value={0.8} height={8} />
          <Progress value={0.9} height={6} fill="var(--color-status-mastered)" />
        </div>
      </LabeledSection>

      <LabeledSection label="StatusPill — all seven statuses">
        <div className="flex flex-wrap gap-4">
          {ALL_STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {ALL_STATUSES.map((s) => (
            <StatusPill key={s} status={s} small />
          ))}
        </div>
      </LabeledSection>

      <LabeledSection label="Card — tones and padding">
        <div className="grid grid-cols-3 gap-5">
          <Card>
            <p className="text-[14px] text-ink-700">Default · padding 24</p>
          </Card>
          <Card tone="success" padding="compact">
            <p className="text-[14px] text-ink-700">Success · compact</p>
          </Card>
          <Card tone="error">
            <p className="text-[14px] text-ink-700">Error tone</p>
          </Card>
        </div>
      </LabeledSection>

      <LabeledSection label="Panels — inset, alert, labeled">
        <div className="grid grid-cols-2 gap-5">
          <InsetPanel label="Why this, now">
            Building this skill strengthens the Equations domain.
          </InsetPanel>
          <AlertPanel>
            <strong className="font-semibold">Two-Step Equations</strong> is locked —
            strengthen its prerequisite first.
          </AlertPanel>
        </div>
      </LabeledSection>

      <LabeledSection label="Table — header, rows, dense, right-aligned numerals">
        <Card padding="flush">
          <Table>
            <TableHead>
              <TableRow first>
                <Th>Skill</Th>
                <Th>Status</Th>
                <Th align="right">Accuracy</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow first interactive>
                <Td>Two-Step Equations</Td>
                <Td secondary>Developing</Td>
                <Td align="right">67%</Td>
              </TableRow>
              <TableRow interactive>
                <Td>Slope as Rate of Change</Td>
                <Td secondary>Introduced</Td>
                <Td align="right">50%</Td>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </LabeledSection>

      <LabeledSection label="Icons (SVG strokes replacing unicode glyphs)">
        <div className="flex items-center gap-4 text-ink-700">
          <span className="inline-flex items-center gap-1.5 text-[14px]">
            <CheckIcon /> correct
          </span>
          <span className="inline-flex items-center gap-1.5 text-[14px]">
            <CrossIcon /> incorrect
          </span>
        </div>
      </LabeledSection>

      <LabeledSection label="States — loading / empty / error (definition of done)">
        <div className="grid grid-cols-3 gap-5">
          <Card>
            <div className="flex items-center gap-2 text-ink-500">
              <Button variant="quiet" loading>
                Loading
              </Button>
            </div>
          </Card>
          <Card>
            <p className="text-[14px] text-ink-500">Empty — nothing here yet.</p>
          </Card>
          <Card tone="error">
            <p className="text-[14px] text-error-ink">Error — could not load this panel.</p>
          </Card>
        </div>
      </LabeledSection>
    </Group>
  );
}

function MathSection() {
  return (
    <Group title="Math primitives">
      <CoordinatePlaneDemo />
      <NumberLineDemo />
      <LabeledSection label="BalanceScale — solving 3x + 4 = 19">
        <BalanceScale
          initial={{ leftX: 3, leftC: 4, rightX: 0, rightC: 19 }}
          prompt="Solve for x. Apply the same operation to both sides until x stands alone."
        />
      </LabeledSection>

      <LabeledSection label="BalanceScale — free-tile mode (tilt teaching)">
        <BalanceScale
          initial={{ leftX: 1, leftC: 4, rightX: 0, rightC: 7 }}
          freeTileMode
          prompt="Remove a tile from one side and watch the beam tilt."
        />
      </LabeledSection>

      <LabeledSection label="StepReveal — normal mode (with completion)">
        <StepReveal
          problem="3x + 4 = 19"
          steps={["Subtract 4 from both sides: 3x = 15.", "Divide by 3: x = 5."]}
          result="x = 5"
        />
      </LabeledSection>

      <LabeledSection label="StepReveal — completion mode (blank step)">
        <StepReveal
          problem="5x − 8 = 12"
          steps={["Add 8 to both sides: 5x = 20.", "Divide by 5: x = 4."]}
          result="x = 4"
          blankStepIndex={0}
          blankAnswer="5x = 20"
        />
      </LabeledSection>

      <LabeledSection label="DataTable — fillable cells">
        <DataTable
          columns={[
            { key: "game", header: "Game" },
            { key: "hits", header: "Total hits", align: "right" },
          ]}
          rows={[
            { game: { text: "1" }, hits: { text: "9" } },
            { game: { text: "2" }, hits: { answer: "11", hint: "Add the per-game rate." } },
            { game: { text: "3" }, hits: { answer: "13", hint: "Add the per-game rate." } },
          ]}
          caption="Fill the predicted totals. Press Enter to check."
        />
      </LabeledSection>

      <LabeledSection label="DataTable — empty state">
        <DataTable
          columns={[
            { key: "x", header: "x" },
            { key: "y", header: "y", align: "right" },
          ]}
          rows={[]}
        />
      </LabeledSection>
    </Group>
  );
}

function CoordinatePlaneDemo() {
  const [points, setPoints] = useState<Point[]>([
    { x: 2, y: 3 },
    { x: 6, y: 7 },
  ]);
  const [placedPoints, setPlacedPoints] = useState<Point[]>([]);
  return (
    <LabeledSection label="CoordinatePlane — two draggable points, line, rise/run">
      <div className="flex flex-wrap items-start gap-8">
        <CoordinatePlane
          points={points}
          onChange={setPoints}
          showLine
          showRiseRun
          xLabel="x"
          yLabel="y"
        />
        <p className="max-w-[260px] text-[13px] text-ink-500">
          Drag a point, or Tab to a handle and use the arrow keys (Shift for ±5).
          The equation readout and rise/run elbow update live.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap items-start gap-8">
        <CoordinatePlane
          points={placedPoints}
          onChange={setPlacedPoints}
          showLine
          xLabel="x"
          yLabel="y"
        />
        <p className="max-w-[260px] text-[13px] text-ink-500">
          Empty interactive plane — click anywhere on the grid to place a point.
          Each placed point becomes draggable and keyboard-addressable.
        </p>
      </div>
    </LabeledSection>
  );
}

function NumberLineDemo() {
  const [value, setValue] = useState(3);
  return (
    <LabeledSection label="NumberLine — marker with operation arc (+7)">
      <div className="max-w-[480px]">
        <NumberLine
          value={value}
          onChange={setValue}
          from={-6}
          to={9}
          operationDelta={7}
          caption="Drag the marker or use ← / → (Shift for ±5)."
        />
      </div>
    </LabeledSection>
  );
}
