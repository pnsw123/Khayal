import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getLandingData } from "@/lib/landing";
import { loadBrowseRows } from "@/lib/browse";
import { HeroCarousel } from "@/components/landing/hero-carousel";
import { Shelf } from "@/components/shelf";
import { PageGlow } from "@/components/backgrounds/page-glow";
import { NumbersSection } from "@/components/landing/numbers-section";
import { CtaReveal } from "@/components/landing/cta-reveal";
import { AuthHashHandler } from "@/components/auth-hash-handler";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  // Supabase email-confirmation / OAuth links sometimes redirect to the Site
  // URL root (`/`) with the auth `?code=` attached instead of `/auth/callback`
  // (e.g. when /auth/callback is not in the project's allowed Redirect URLs).
  // Forward it to the callback handler so the session is actually exchanged —
  // otherwise the user lands back on the homepage still logged out.
  const sp = await searchParams;
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  }
  if (sp.error) {
    redirect(`/login?error=${encodeURIComponent(sp.error_description ?? sp.error)}`);
  }

  const sb = await supabaseServer();
  const [{ featured, counts, backdrop }, rows] = await Promise.all([
    getLandingData(sb),
    loadBrowseRows(),
  ]);

  return (
    <main>
      {/* Completes the Supabase implicit email-confirmation flow when the
          verify redirect lands on `/#access_token=…` instead of /auth/callback. */}
      <AuthHashHandler />

      {/* Section 1 — hero carousel, pulled up under the floating nav */}
      <div className="-mt-20">
        {featured.length > 0 ? (
          <HeroCarousel slides={featured} />
        ) : (
          /* No backdrops to show (empty catalogue / DB unreachable) — plain intro */
          <section data-testid="hero-section" className="relative isolate pt-40 pb-24 px-6 text-center">
            <PageGlow />
            <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] leading-none text-white">
              KHAYAL <span className="font-arabic font-normal text-[var(--saffron-glow)]">خيال</span>
            </h1>
            <p className="mt-5 text-lg text-white/70">A directory of films and series — browse, rate, review.</p>
            <div className="mt-8 flex justify-center gap-2">
              <Link href="/browse" className="inline-flex items-center h-11 px-5 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/85 transition-colors duration-150">
                Browse films
              </Link>
              <Link href="/search" className="inline-flex items-center h-11 px-5 rounded-full bg-white/10 border border-white/15 text-white text-[15px] hover:bg-white/20 transition-colors duration-150">
                Search
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Section 2 — poster rows */}
      <div className="relative z-10 -mt-8 mx-auto max-w-[1600px] px-4 md:px-6 lg:px-12" data-testid="landing-rows">
        <Shelf
          title="Top rated"
          kicker="الأعلى تقييماً"
          items={rows.topRated}
          ratingByMovie={rows.ratingByMovie}
          viewAllHref="/browse?sort=rated"
        />
        <Shelf
          title="New this week"
          kicker="جديد"
          items={rows.newThisWeek}
          ratingByMovie={rows.ratingByMovie}
          viewAllHref="/browse"
        />
        {rows.genreRows.slice(0, 4).map((gr) => (
          <Shelf
            key={gr.name}
            title={gr.name}
            items={gr.items}
            ratingByMovie={rows.ratingByMovie}
            viewAllHref={"/browse?genre=" + encodeURIComponent(gr.name)}
          />
        ))}
      </div>

      {/* Section 3 — Numbers, stagger in + count up once */}
      <NumbersSection counts={counts} />

      {/* Section 4 — CTA over a film still that un-curtains on scroll */}
      <CtaReveal backdrop={backdrop} counts={counts} />
    </main>
  );
}
