// lib/ai-tutor — the BOUNDED tutor layer. The tutor never routes, never sets
// mastery, never reorders curriculum — enforced by TutorResponse (strings
// only). Pure TypeScript: the rule-based backend is sync logic behind the
// async TutorBackend seam.
//
// SEAM: a future LLM backend implements TutorBackend OUTSIDE /lib (in an API
// route — fetch is banned here) and still returns TutorResponse ONLY. Routing
// and mastery remain deterministic regardless of backend.

import type {
  MisconceptionRegistryEntry,
  SkillNode,
  Sport,
  TutorBackend,
  TutorResponse,
} from "@/types";

const FALLBACK_DIAGNOSIS =
  "That answer points at a step worth a second look — let's walk it slowly.";

/** Deterministic tutor: registry-grounded diagnosis, context-hook reframes. */
export class RuleBasedTutor implements TutorBackend {
  constructor(private readonly registry: MisconceptionRegistryEntry[]) {}

  async remediate(
    misconceptionTag: string,
    node: SkillNode,
    sport: Sport,
  ): Promise<TutorResponse> {
    const entry = this.registry.find((e) => e.id === misconceptionTag);
    const diagnosis = entry?.description ?? FALLBACK_DIAGNOSIS;
    const sportHook = node.contextHooks[sport];
    const neutralHook = node.contextHooks.neutral;
    const reframe =
      sport === "neutral"
        ? `Look at it this way: ${neutralHook}`
        : `Think about it in ${sport} terms: ${sportHook}`;
    const bridgeToNeutral = `The same idea works without the game: ${neutralHook}`;
    return { diagnosis, reframe, bridgeToNeutral };
  }
}

/**
 * Remediation entry point. Defaults to the rule-based backend built from the
 * provided registry; pass a custom TutorBackend to swap implementations.
 */
export function tutorRemediation(
  misconceptionTag: string,
  node: SkillNode,
  sport: Sport,
  registry: MisconceptionRegistryEntry[],
  backend: TutorBackend = new RuleBasedTutor(registry),
): Promise<TutorResponse> {
  return backend.remediate(misconceptionTag, node, sport);
}
