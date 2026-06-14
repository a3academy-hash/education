// middleware.ts (C2 S2) — UX REDIRECTION ONLY. The binding gate is RLS + every
// server component/action resolving identity server-side and failing closed
// (lib/auth/session.ts). Middleware NEVER substitutes for that; it only smooths
// the UX (send an unauthenticated visitor to sign-in, send an authed parent away
// from the auth pages) and performs the @supabase/ssr session-cookie refresh.
//
// MEMORY MODE (default, dev/tests): a pure pass-through. No Supabase env is
// touched, no redirect happens — the STUDENT_COOKIE onboarding flow is untouched
// and all 623 tests / the local dev path keep working exactly as before (S11).
//
// SUPABASE MODE: refresh the session (getUser writes refreshed cookies via the
// updateSession pattern) and apply soft redirects. Consent enforcement is NOT
// done here authoritatively — the server-side session seam re-checks consent per
// request (S8/S9); middleware redirects are UX only and may lag by one request.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function authMode(): "memory" | "supabase" {
  return process.env.REPOSITORY_BACKEND === "supabase" ? "supabase" : "memory";
}

export async function middleware(request: NextRequest) {
  // Memory mode: never touch Supabase; pass through untouched (S11).
  if (authMode() !== "supabase") {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Fail OPEN to a pass-through if env is missing (never 500 the whole app); the
  // server-side fail-closed gate still protects data.
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // SERVER-VERIFIED refresh (do not use getSession in middleware). getUser()'s
  // side effect performs the @supabase/ssr cookie refresh; keep it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // App role is the 0005-minted 'user_role' claim (NOT the reserved 'role' claim,
  // which PostgREST SET ROLEs to and must stay 'authenticated').
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = (claimsData?.claims ?? {}) as Record<string, unknown>;
  const role = typeof claims.user_role === "string" ? claims.user_role : null;

  const path = request.nextUrl.pathname;
  const isParent = path === "/parent" || path.startsWith("/parent/");
  const isAuth = path === "/auth" || path.startsWith("/auth/");
  const isStudentShell =
    path === "/student" || (path.startsWith("/student/") && !path.startsWith("/student/onboarding"));

  // Unauthenticated → sign-in for protected areas (UX only).
  if (!user && (isParent || isStudentShell)) {
    return redirectTo(request, "/auth/sign-in");
  }

  // Authenticated parent on an auth page → their dashboard (UX only).
  if (user && role === "parent" && isAuth) {
    return redirectTo(request, "/parent");
  }

  return response;
}

function redirectTo(request: NextRequest, path: string) {
  const u = request.nextUrl.clone();
  u.pathname = path;
  u.search = "";
  return NextResponse.redirect(u);
}

export const config = {
  // Run on app routes; skip static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
