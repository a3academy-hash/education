// SSR USER-scoped Supabase client — runs as the authenticated principal, with
// RLS ENFORCED. This is the default for student-facing reads and own-insert
// writes (attempts, mastery_updates, sessions): defense-in-depth so that even an
// app bug cannot cross students. The service-role (RLS-bypass) client is a
// separate, narrow module (lib/supabase/service.ts).
//
// C-R4: this module carries its OWN server-only guard (not just the repository
// module's). The service-role key is NEVER read here — only the public key.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-only guard (C-R4). The `server-only` npm package would be cleaner but
// adding a dependency is a checkpoint; this runtime guard fails fast if the
// module is ever pulled into a client bundle (window is undefined on the server).
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/server.ts is server-only and must never run in the browser.",
  );
}

/**
 * A request-scoped, RLS-enforced Supabase client bound to the caller's session
 * cookies. MUST be constructed per request (cookies() is per-request) — never
 * cache the returned client across requests.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase server client is misconfigured: NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components, cookie writes throw; the middleware/route-handler
        // refresh path (C2) owns session-cookie persistence. Swallowing here is
        // the documented @supabase/ssr pattern for read-only render contexts.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // no-op: called from a Server Component render (read-only cookies).
        }
      },
    },
  });
}
