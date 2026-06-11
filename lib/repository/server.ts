// server-only — never import from client components.
//
// mr-gates condition 1: the repository singleton lives here, in a server-only
// module, and is intentionally NOT re-exported from lib/repository/index.ts.
// This guards against the curriculum graph JSON (bundled by InMemoryRepository)
// ever shipping into a client bundle.
//
// mr-gates condition 2: the instance is parked on globalThis (typed, keyed) so
// in-memory data survives Next.js HMR in development. This is honest
// ephemerality — the store is process-local and resets on a cold server start;
// nothing here is a durable database. Supabase replaces it when wired.

import { InMemoryRepository } from "./in-memory";
import type { A3Repository } from "../../types";

// No-dep server-only guard. The `server-only` npm package would be cleaner, but
// adding it is a package.json checkpoint deferred per the new-dependency rule.
// This runtime guard fails fast if the module is ever pulled into a client
// bundle (window is undefined on the server). Pair with the convention that
// this file is NOT re-exported from the barrel.
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

/**
 * The process-local repository singleton. Server components, route handlers,
 * and server actions read/write through this. Survives HMR via globalThis.
 */
export function getRepository(): A3Repository {
  if (!store[GLOBAL_KEY]) {
    store[GLOBAL_KEY] = new InMemoryRepository();
  }
  return store[GLOBAL_KEY];
}
