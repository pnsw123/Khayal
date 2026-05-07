import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, Flag, CalendarDays, ArrowLeft, Film } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { MovieDetail } from "@/lib/supabase";
import { currentUser } from "@/lib/auth";
import { year, runtime } from "@/lib/utils";
import { RateWidget } from "@/components/rate-widget";
import { ReviewForm } from "@/components/review-form";
import { WhereToWatch } from "@/components/where-to-watch";
import { AddToListButton } from "@/components/add-to-list";
import { loadUserListsForTarget } from "@/lib/lists";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("get_movie_detail", { p_slug: slug });
  if (!data) return {};
  const m = (data as any).movie;
  const yr = m.release_date ? `(${m.release_date.split("-")[0]})` : "";
  return {
    title:       `${m.title} ${yr} — KHAYAL`,
    description: m.overview?.slice(0, 160) ?? `Watch ${m.title} on KHAYAL.`,
    openGraph: {
      title:       `${m.title} ${yr}`,
      description: m.overview?.slice(0, 160),
      images:      m.poster_url ? [{ url: m.poster_url }] : [],
      type:        "video.movie",
    },
    twitter: {
      card:        "summary_large_image",
      title:       `${m.title} ${yr}`,
      description: m.overview?.slice(0, 160),
      images:      m.poster_url ? [m.poster_url] : [],
    },
  };
}

export default async function MovieDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("get_movie_detail", { p_slug: slug });

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const d = data as MovieDetail;
  const { movie, stats, reviews } = d;

  const user = await currentUser();
  let myRating: number | null = null;
  let myReview: { id: number; headline: string | null; body: string; contains_spoiler: boolean } | null = null;
  let myLists: any[] = [];
  if (user) {
    const [{ data: r }, { data: rv }, lists] = await Promise.all([
      sb.from("movie_ratings").select("rating").eq("movie_id", movie.id).eq("user_id", user.id).maybeSingle(),
      sb.from("movie_reviews").select("id, headline, body, contains_spoiler").eq("movie_id", movie.id).eq("user_id", user.id).maybeSingle(),
      loadUserListsForTarget(user.id, "movie", movie.id),
    ]);
    myRating = r?.rating ?? null;
    myReview = rv ?? null;
    myLists = lists;
  }

  return (
    <div className="relative">
      {/* Backdrop hero */}
      {movie.backdrop_url && (
        <div className="absolute inset-x-0 top-0 h-[60vh] overflow-hidden" aria-hidden>
          <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover object-[50%_25%] opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/50 via-[var(--ink)]/85 to-[var(--ink)]" />
        </div>
      )}

      <div className="relative mx-auto max-w-[1400px] px-6 pt-8 pb-24">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] uppercase text-[var(--cream-muted)] hover:text-[var(--saffron)] transition-colors mb-8"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        {/* ─── Title block ─── */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 mb-14">
          {/* Poster */}
          <div className="aspect-[2/3] rounded-[2px] overflow-hidden border border-[var(--saffron)]/15 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)] self-start">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--ink-lift)] text-[var(--cream-muted)]">
                <Film size={48} />
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--saffron)] mb-3">
              Film · فيلم
            </p>
            <h1 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-[var(--cream)] mb-4">
              {movie.title}
            </h1>

            {/* Meta line */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-sm text-[var(--cream-muted)]">
              {movie.release_date && (
                <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {year(movie.release_date)}</span>
              )}
              {movie.runtime_minutes && (
                <span className="flex items-center gap-1.5"><Clock size={13} /> {runtime(movie.runtime_minutes)}</span>
              )}
              {movie.age_rating && (
                <span className="px-2 py-0.5 border border-[var(--taupe)]/40 text-xs font-mono tracking-wider uppercase">
                  {movie.age_rating}
                </span>
              )}
              {movie.original_language && (
                <span className="flex items-center gap-1.5"><Globe size={13} /> {movie.original_language.toUpperCase()}</span>
              )}
              {movie.country && (
                <span className="flex items-center gap-1.5"><Flag size={13} /> {movie.country}</span>
              )}
            </div>

            {/* Overview */}
            {movie.overview && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--cream)]/90 mb-8">
                {movie.overview}
              </p>
            )}

            {/* Actions: rate + add to list */}
            <div className="pt-6 border-t border-[var(--taupe)]/15 space-y-5">
              <RateWidget
                userId={user?.id ?? null}
                kind="movie"
                targetId={movie.id}
                initialRating={myRating}
                slug={movie.slug}
              />
              <div>
                <AddToListButton
                  userId={user?.id ?? null}
                  kind="movie"
                  targetId={movie.id}
                  slug={movie.slug}
                  initialLists={myLists}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Where to watch + review form row ─── */}
        <div className="grid md:grid-cols-[320px_1fr] gap-6 mb-14">
          <WhereToWatch
            title={movie.title}
            year={year(movie.release_date)}
            trailerYoutubeId={movie.trailer_youtube_id}
          />
          <ReviewForm
            userId={user?.id ?? null}
            kind="movie"
            targetId={movie.id}
            slug={movie.slug}
            existing={myReview}
          />
        </div>

        {/* ─── Reviews list ─── */}
        <section className="pt-10 border-t border-[var(--taupe)]/15">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-[var(--cream)]">
              Reviews <span className="font-mono text-sm text-[var(--cream-muted)] ml-2">({reviews.length})</span>
            </h2>
            <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">مراجعات</span>
          </div>

          {reviews.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-display italic text-xl text-[var(--cream)]/70">No voices yet.</p>
              <p className="mt-2 text-sm text-[var(--cream-muted)]">Be the first. Form is above.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="p-5 rounded-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/40 transition-colors"
                >
                  <header className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--saffron)] text-[var(--ink)] grid place-items-center font-display text-sm">
                      {(r.display_name || r.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[var(--cream)]">{r.display_name || r.username || "anon"}</p>
                      <p className="font-mono text-[10px] tracking-wider text-[var(--cream-muted)]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </header>
                  {r.headline && (
                    <h3 className="font-display text-lg text-[var(--cream)] mb-2">{r.headline}</h3>
                  )}
                  {r.contains_spoiler ? (
                    <details className="text-sm text-[var(--cream-muted)]">
                      <summary className="cursor-pointer text-[var(--saffron)] hover:text-[var(--saffron-glow)]">
                        Spoilers. Click to reveal.
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
                    </details>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--cream)]/85 whitespace-pre-wrap line-clamp-6">
                      {r.body}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
