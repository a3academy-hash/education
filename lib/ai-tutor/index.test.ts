import { describe, expect, it } from "vitest";
import { RuleBasedTutor, tutorRemediation } from "./index";
import type {
  ContextHooks,
  MisconceptionRegistryEntry,
  SkillNode,
  TutorBackend,
  TutorResponse,
} from "@/types";

const hooks: ContextHooks = {
  baseball: "Run differential: down 4 runs, score 7 — net is +3.",
  softball: "sb hook",
  basketball: "bk hook",
  soccer: "sc hook",
  football: "fb hook",
  volleyball: "vb hook",
  neutral: "A bank balance of −$4 plus a $7 deposit leaves +$3.",
};

const node: SkillNode = {
  id: "ALG-F01",
  title: "Integer Operations",
  domain: "foundations",
  tier: 0,
  prereqs: [],
  standards: { ccss: [], state: null },
  objective: "",
  misconceptionTags: ["sign-error-addition"],
  visual: "numberline",
  contextHooks: hooks,
  workedExamples: [],
  problems: { p1: [], p2: [], p3: [] },
};

const registry: MisconceptionRegistryEntry[] = [
  {
    id: "sign-error-addition",
    description: "Adds magnitudes and keeps the wrong sign when combining signed numbers.",
  },
];

describe("RuleBasedTutor", () => {
  it("returns ONLY strings — the tutor cannot route, set mastery, or reorder anything", async () => {
    const response = await new RuleBasedTutor(registry).remediate(
      "sign-error-addition",
      node,
      "baseball",
    );
    expect(Object.keys(response).sort()).toEqual(["bridgeToNeutral", "diagnosis", "reframe"]);
    for (const value of Object.values(response)) expect(typeof value).toBe("string");
  });

  it("grounds the diagnosis in the misconception registry", async () => {
    const response = await new RuleBasedTutor(registry).remediate(
      "sign-error-addition",
      node,
      "baseball",
    );
    expect(response.diagnosis).toContain(registry[0].description);
  });

  it("reframes through the student's sport hook and bridges to the neutral hook", async () => {
    const response = await new RuleBasedTutor(registry).remediate(
      "sign-error-addition",
      node,
      "baseball",
    );
    expect(response.reframe).toContain(hooks.baseball);
    expect(response.bridgeToNeutral).toContain(hooks.neutral);
  });

  it("falls back to a calm generic diagnosis for an unregistered tag — it never guesses content", async () => {
    const response = await new RuleBasedTutor(registry).remediate("not-a-tag", node, "soccer");
    expect(response.diagnosis.length).toBeGreaterThan(0);
    expect(response.reframe).toContain(hooks.soccer);
  });

  it("neutral-track students get the neutral hook in the reframe too", async () => {
    const response = await new RuleBasedTutor(registry).remediate(
      "sign-error-addition",
      node,
      "neutral",
    );
    expect(response.reframe).toContain(hooks.neutral);
  });
});

describe("tutorRemediation", () => {
  it("defaults to the rule-based backend built from the registry", async () => {
    const response = await tutorRemediation("sign-error-addition", node, "baseball", registry);
    expect(response.diagnosis).toContain(registry[0].description);
  });

  it("accepts a swapped backend through the TutorBackend seam", async () => {
    const canned: TutorResponse = {
      diagnosis: "canned diagnosis",
      reframe: "canned reframe",
      bridgeToNeutral: "canned bridge",
    };
    const backend: TutorBackend = { remediate: async () => canned };
    const response = await tutorRemediation("anything", node, "volleyball", registry, backend);
    expect(response).toEqual(canned);
  });
});
