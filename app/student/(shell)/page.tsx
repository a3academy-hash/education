// Learning Home placeholder. The real Learning Home is Phase 3 — this stays
// minimal (no Phase 3 logic) but renders inside the shell with a PageHeader and
// a quiet pointer to onboarding when no student cookie is present.

import { cookies } from "next/headers";
import Link from "next/link";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { InsetPanel } from "../../../components/ui/Panels";
import { STUDENT_COOKIE } from "../onboarding/constants";

export default async function StudentHomePage() {
  const cookieStore = await cookies();
  const hasStudent = Boolean(cookieStore.get(STUDENT_COOKIE)?.value);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Learning home"
        title="Your course"
        subhead="Your adaptive dashboard — recommended next skill, mastery overview, and recent activity — arrives in Phase 3."
      />

      {hasStudent ? (
        <Card>
          <p className="text-[14px] leading-[1.55] text-ink-700">
            You are set up. The full Learning Home is under construction.
          </p>
        </Card>
      ) : (
        <Card>
          <InsetPanel label="Get started">
            <span>
              You have not set up your course yet.{" "}
              <Link
                href="/student/onboarding"
                className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Set up your course
              </Link>{" "}
              to begin.
            </span>
          </InsetPanel>
        </Card>
      )}
    </div>
  );
}
