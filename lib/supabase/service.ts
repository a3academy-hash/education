// SERVICE-ROLE Supabase client — RLS-BYPASSING, SERVER-ONLY, smallest possible
// surface. Used ONLY where RLS has no application write path:
//   - student_skill_state writes (the engine owns this table)
//   - (future) grade_artifacts issuance, curriculum_graphs / video_assets writes
// NEVER in the browser, NEVER logged, NEVER threaded across the server/client
// boundary as a prop (C-S1).
//
// SUPABASE_SERVICE_ROLE_KEY is read ONLY here (no NEXT_PUBLIC_ prefix → bundler
// will not ship it to the client). The client is constructed LAZILY so that
// importing this module in `memory` mode never requires the key to be present.

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only guard (C-R4). Fails fast if pulled into a client bundle.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/service.ts is server-only and must never run in the browser.",
  );
}

/**
 * Build the RLS-bypassing service-role client. Lazy by design: the key is only
 * required when `supabase` mode actually constructs the repository. Throws
 * LOUDLY (C-S1 build-time assertion) if the service-role key is missing — a
 * misconfigured `supabase` deployment must fail closed, never silently degrade.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error(
      "Supabase service client is misconfigured: NEXT_PUBLIC_SUPABASE_URL must be set.",
    );
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required when REPOSITORY_BACKEND=supabase. " +
        "It is read ONLY in lib/supabase/service.ts, server-side, and must never " +
        "be exposed as a NEXT_PUBLIC_ variable.",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
