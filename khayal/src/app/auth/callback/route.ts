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
 *
 * SECURITY — PKCE is the CSRF mitigation for this flow:
 *   Supabase uses PKCE (RFC 7636) for the email magic-link / OAuth code flow.
 *   The code_verifier is stored in an HttpOnly cookie during signUp/signIn;
 *   `exchangeCodeForSession()` retrieves it and validates the code_challenge
 *   against the ?code= parameter server-side.  An attacker who intercepts or
 *   forges the ?code= cannot complete the exchange without the code_verifier,
 *   so no additional CSRF token is required for this handler.
 *
 *   The ?next= open-redirect is already mitigated below: only same-origin
 *   relative paths are accepted (startsWith("/") && !startsWith("//")).
 *
 *   Rate limiting for this route is enforced at the middleware layer
 *   (src/middleware.ts): 10 requests / 60 s per IP to prevent code enumeration.
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
