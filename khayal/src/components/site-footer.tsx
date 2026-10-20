import { Button } from "@/components/untitled/button";
import { TmdbAttribution } from "@/components/tmdb-attribution";

interface SiteFooterProps {
  signedIn: boolean;
}

/** Site-wide footer: wordmark · explore links (Untitled UI link buttons) · TMDB credit. */
export function SiteFooter({ signedIn }: SiteFooterProps) {
  return (
    <footer
      data-testid="site-footer"
      className="border-t"
      style={{ borderColor: "color-mix(in srgb, var(--taupe) 40%, transparent)", background: "var(--ink)" }}
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="font-display text-2xl" style={{ color: "var(--cream)", letterSpacing: "-0.02em" }}>
            KHAYAL{" "}
            <span className="font-arabic text-xl" style={{ color: "var(--saffron)" }}>
              خيال
            </span>
          </p>
          <p className="text-sm" style={{ color: "var(--cream-muted)" }}>
            A library of imagination.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col items-start gap-2">
          <p className="font-mono mb-1 text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--cream-muted)" }}>
            Explore
          </p>
          <Button href="/browse" color="link-gray" size="sm" data-testid="footer-browse">
            Browse films
          </Button>
          <Button href="/search" color="link-gray" size="sm" data-testid="footer-search">
            Search
          </Button>
          {signedIn ? (
            <Button href="/profile" color="link-gray" size="sm" data-testid="footer-profile">
              Profile
            </Button>
          ) : (
            <Button href="/login" color="link-gray" size="sm" data-testid="footer-signin">
              Sign in
            </Button>
          )}
        </nav>

        <div className="flex flex-col items-end gap-2">
          <p className="font-mono mb-1 text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--cream-muted)" }}>
            Data
          </p>
          <TmdbAttribution />
        </div>
      </div>
    </footer>
  );
}
