// server-only — never import from client components.
//
// mr-gates condition 1: the repository accessor lives here, in a server-only
// module, and is intentionally NOT re-exported from lib/repository/index.ts.
// This guards against the curriculum graph JSON (bundled by InMemoryRepository)
// and the Supabase service-role client ever shipping into a client bundle.
//
// FEATURE FLAG (C-R3): REPOSITORY_BACKEND selects the backend.
//   - 'memory' (default, CI/tests): the process-local InMemoryRepository
//     singleton, parked on globalThis to survive Next.js HMR. Behavior is
//     UNCHANGED from before — just Promise-wrapped (getRepository is now async).
//   - 'supabase': a FRESH SupabaseRepository built PER REQUEST from the
//     per-request RLS userClient (cookies) + the server-only service client.
//     NEVER cached on globalThis (the userClient is request-scoped).

import { InMemoryRepository } from "./in-memory";
import { SupabaseRepository } from "./supabase";
import { createClient as createUserClient } from "../supabase/server";
import { createServiceClient } from "../supabase/service";
import type { A3Repository } from "../../types";

// No-dep server-only guard. Fails fast if this module is ever pulled into a
// client bundle (window is undefined on the server). Pair with the convention
// that this file is NOT re-exported from the barrel.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/repository/server.ts is server-only and must never run in the browser.",
  );
}

const GLOBAL_KEY = Symbol.for("a3.repository.singleton");

type GlobalWithRepo = typeof globalThis & {
  [GLOBAL_KEY]?: A3Repository;
};

const store = globalThis as GlobalWithRepo;

function repositoryBackend(): "memory" | "supabase" {
  return process.env.REPOSITORY_BACKEND === "supabase" ? "supabase" : "memory";
}

/**
 * The request's repository. Server components, route handlers, and server
 * actions read/write through this.
 *
 * memory  → the process-local InMemoryRepository singleton (survives HMR).
 * supabase → a fresh, request-scoped SupabaseRepository (RLS userClient from
 *            cookies + server-only service client). NEVER cached across requests.
 *
 * ASYNC (C-R3): the Supabase userClient needs per-request `cookies()`, so all
 * call sites do `const repo = await getRepository();`. The memory path resolves
 * synchronously through the Promise (no behavior change).
 */
export async function getRepository(): Promise<A3Repository> {
  if (repositoryBackend() === "supabase") {
    const [userClient, serviceClient] = [
      await createUserClient(),
      createServiceClient(),
    ];
    return new SupabaseRepository({ userClient, serviceClient });
  }

  if (!store[GLOBAL_KEY]) {
    store[GLOBAL_KEY] = new InMemoryRepository();
  }
  return store[GLOBAL_KEY];
}
