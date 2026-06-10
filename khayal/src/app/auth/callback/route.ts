import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Supabase Auth callback — exchanges the `?code=...` from the magic-link /
 * email-confirmation redirect into a session cookie, then sends the user
 * to /browse (or ?next= if provided).
 *
 * Supabase's dashboard Site URL should point at `<origin>/auth/callback`
 * (or at least `<origin>` with this handler living at root). Without this
 * handler the signup email link lands on `/?code=...` and just renders
 * the catalog without actually logging the user in.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/browse";
  // Prevent open redirect: only allow same-origin relative paths.
  // "//evil.com" starts with "/" but is protocol-relative and resolves externally.
  const safePath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/browse";

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(safePath, url.origin));
}
