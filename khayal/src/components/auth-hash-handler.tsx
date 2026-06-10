"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * AuthHashHandler — completes the Supabase *implicit* email-confirmation flow.
 *
 * ROOT CAUSE this fixes:
 *   When email confirmation is ON, Supabase emails a link of the form
 *     <supabase>/auth/v1/verify?token=...&type=signup&redirect_to=<SITE_URL>
 *   The project Site URL is the bare origin (`https://…vercel.app`), so after
 *   verifying the token Supabase redirects to the *implicit* flow:
 *     https://…vercel.app/#access_token=…&refresh_token=…&type=signup
 *   The tokens arrive in the URL **hash fragment**, which is never sent to the
 *   server. The `/` server component (page.tsx) only inspects `?code=` in the
 *   query string, and `createBrowserClient` from `@supabase/ssr` uses the PKCE
 *   flow — it does NOT auto-parse implicit hash tokens. Result: the user lands
 *   on the landing page **still logged out**, i.e. the reported "sign-in bounces
 *   me back to the landing page" bug.
 *
 * THE FIX:
 *   Detect `#access_token=…` (or an `#error=…`) in the hash on mount, hand the
 *   tokens to `supabase.auth.setSession()` so `@supabase/ssr` persists them to
 *   cookies, strip the hash from the URL, then navigate to /browse so the
 *   server re-renders with the authenticated session.
 *
 * Mounted on the landing page (`/`) — the only place the implicit redirect lands.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorDescription = params.get("error_description") ?? params.get("error");

    // Auth error came back in the hash — clean the URL and surface it on /login.
    if (errorDescription && !accessToken) {
      window.history.replaceState(null, "", window.location.pathname);
      router.replace(`/login?error=${encodeURIComponent(errorDescription)}`);
      return;
    }

    if (!accessToken || !refreshToken) return;

    let cancelled = false;
    (async () => {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;

      // Remove the tokens from the address bar regardless of outcome.
      window.history.replaceState(null, "", window.location.pathname);

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }

      // Session is now in cookies — go to the app and force an RSC refresh so
      // the server renders the authenticated view.
      router.replace("/browse");
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
