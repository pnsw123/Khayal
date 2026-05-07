import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, CalendarDays, ArrowLeft, Film, Star } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { MovieDetail } from "@/lib/supabase";
import { currentUser } from "@/lib/auth";
import { year, runtime } from "@/lib/utils";
import { RateWidget } from "@/components/rate-widget";
import { ReviewForm } from "@/components/review-form";
import { WhereToWatch } from "@/components/where-to-watch";
import { AddToListButton } from "@/components/add-to-list";
import { loadUserListsForTarget } from "@/lib/lists";
import { CastRow } from "@/components/cast-row";
import type { CastMember } from "@/components/cast-row";

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

  const [castResult, genreResult, ...userResults] = await Promise.all([
    sb.from("movie_credits")
      .select("person_id, role, character_name, job, credit_order, people(name, profile_path)")
      .eq("movie_id", movie.id)
      .order("credit_order", { ascending: true })
      .limit(20),
    sb.from("movies_with_genres").select("genre_names").eq("id", movie.id).maybeSingle(),
    user
      ? sb.from("movie_ratings").select("rating").eq("movie_id", movie.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? sb.from("movie_reviews").select("id, headline, body, contains_spoiler").eq("movie_id", movie.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? loadUserListsForTarget(user.id, "movie", movie.id)
      : Promise.resolve([]),
  ]);

  if (user) {
    const [{ data: r }, { data: rv }, lists] = userResults as any;
    myRating = r?.rating ?? null;
    myReview = rv ?? null;
    myLists = lists ?? [];
  }

  const cast: CastMember[] = (castResult.data ?? []).map((c: any) => ({
    person_id:      c.person_id,
    name:           c.people?.name ?? "Unknown",
    character_name: c.character_name,
    profile_path:   c.people?.profile_path ?? null,
    role:           c.role,
    job:            c.job,
    credit_order:   c.credit_order,
  }));

  const genres: string[] = (genreResult.data as any)?.genre_names ?? [];
  const avgRating = stats?.avg_rating ? Number(stats.avg_rating) : null;
  const ratingCount = stats?.rating_count ?? 0;

  return (
    <div className="min-h-screen">
      {/* ── Full-bleed backdrop ── */}
      <div className="relative h-[55vh] min-h-[400px] overflow-hidden">
        {movie.backdrop_url ? (
          <>
            <img
              src={movie.backdrop_url}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover object-[50%_20%] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink-lift)] to-[var(--ink)]" />
        )}

        {/* Back link sits in the backdrop */}
        <div className="absolute top-6 left-0 right-0">
          <div className="mx-auto max-w-[1400px] px-6">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] uppercase text-[var(--cream-muted)] hover:text-[var(--cream)] transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content — overlaps backdrop ── */}
      <div className="relative mx-auto max-w-[1400px] px-6 -mt-48 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-end mb-12">

          {/* Poster */}
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] self-end">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--ink-lift)]">
                <Film size={48} className="text-[var(--cream-muted)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 pb-2">
            {/* Genre chips */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.slice(0, 4).map((g) => (
                  <Link
                    key={g}
                    href={`/browse?genre=${encodeURIComponent(g)}`}
                    className="px-3 py-1 rounded-full text-[11px] font-mono tracking-wide bg-[var(--ink-high)] text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/40 transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}

            <h1 className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[0.92] text-[var(--cream)] mb-5">
              {movie.title}
            </h1>

            {/* Meta pills row */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {movie.release_date && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--cream-muted)]">
                  <CalendarDays size={13} /> {year(movie.release_date)}
                </span>
              )}
              {movie.runtime_minutes && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--cream-muted)]">
                  <span className="text-[var(--cream-muted)]/40">·</span>
                  <Clock size={13} /> {runtime(movie.runtime_minutes)}
                </span>
              )}
              {movie.age_rating && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--cream-muted)]">
                  <span className="text-[var(--cream-muted)]/40">·</span>
                  <span className="px-2 py-0.5 rounded border border-[var(--taupe)]/40 text-[11px] font-mono tracking-wider uppercase">
                    {movie.age_rating}
                  </span>
                </span>
              )}
              {movie.original_language && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--cream-muted)]">
                  <span className="text-[var(--cream-muted)]/40">·</span>
                  <Globe size={13} /> {movie.original_language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Rating display */}
            {avgRating && avgRating > 0 && (
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-display text-5xl text-[var(--cream)]">{avgRating.toFixed(1)}</span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i <= Math.round(avgRating / 2)
                          ? "fill-[var(--saffron)] text-[var(--saffron)]"
                          : "text-[var(--taupe)]"}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] tracking-wider text-[var(--cream-muted)] uppercase">
                    {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
                  </span>
                </div>
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--cream)]/80 mb-8">
                {movie.overview}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-[var(--ink-high)]">
              <RateWidget
                userId={user?.id ?? null}
                kind="movie"
                targetId={movie.id}
                initialRating={myRating}
                slug={movie.slug}
              />
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

        {/* ─── Where to watch + review form ─── */}
        <div className="grid md:grid-cols-[300px_1fr] gap-6 mb-14">
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

        {/* ─── Cast ─── */}
        {cast.length > 0 && <CastRow cast={cast} />}

        {/* ─── Reviews ─── */}
        <section className="pt-10 border-t border-[var(--ink-high)]">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-[var(--cream)]">
              Reviews
              <span className="font-mono text-sm text-[var(--cream-muted)] ml-3">({reviews.length})</span>
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display italic text-xl text-[var(--cream)]/50">No reviews yet.</p>
              <p className="mt-2 text-sm text-[var(--cream-muted)]">Be the first — form is above.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="p-5 rounded-lg bg-[var(--ink-lift)] border border-[var(--ink-high)] hover:border-[var(--taupe)]/50 transition-colors"
                >
                  <header className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--saffron)] text-[var(--ink)] grid place-items-center font-display text-sm font-bold shrink-0">
                      {(r.display_name || r.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--cream)]">{r.display_name || r.username || "anon"}</p>
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
                        Contains spoilers — click to reveal
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
                    </details>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--cream)]/80 whitespace-pre-wrap line-clamp-6">
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
