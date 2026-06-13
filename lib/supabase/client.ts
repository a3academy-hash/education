// Browser Supabase client — auth UI + client components ONLY.
//
// Holds ONLY the public publishable (anon) key; every request is RLS-scoped as
// the signed-in principal. NEVER import the service-role client here, and never
// read a service-role key in client-reachable code (see lib/supabase/service.ts
// for the server-only RLS-bypass surface).
//
// C2 (pee-wee-gated) wires the actual login/child-select surfaces; C1 ships the
// factory so those screens have a single, correct browser client to import.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase browser client is misconfigured: NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.",
    );
  }
  return createBrowserClient(url, key);
}
