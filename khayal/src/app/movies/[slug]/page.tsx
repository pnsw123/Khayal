import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, CalendarDays, ArrowLeft, Film, Star } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { MovieDetail } from "@/lib/supabase";
import type { MovieCreditRow, MovieWithGenresRow } from "@/lib/database.types";
import type { UserList } from "@/components/add-to-list";
import { currentUser } from "@/lib/auth";
import { year, runtime } from "@/lib/utils";
import { RateWidget } from "@/components/rate-widget";
import { ReviewForm } from "@/components/review-form";
import { WhereToWatch } from "@/components/where-to-watch";
import { AddToListButton } from "@/components/add-to-list";
import { loadUserListsForTarget } from "@/lib/lists";
import { CastRow } from "@/components/cast-row";
import type { CastMember } from "@/components/cast-row";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { TrailerModal } from "@/components/trailer-modal";
import { SimilarTitles } from "@/components/similar-titles";
import { getSimilarMovies } from "@/lib/similar";
import { EmptyState } from "@/components/empty-state";
import { ExpandableText } from "@/components/expandable-text";
import { ReviewCard } from "@/components/review-card";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("get_movie_detail", { p_slug: slug });
  if (!data) return {};
  const m = (data as MovieDetail).movie;
  const yr = m.release_date ? `(${m.release_date.split("-")[0]})` : "";
  const releaseYear = m.release_date ? m.release_date.split("-")[0] : "";

  // Fetch genres for fallback description
  const { data: genreRow } = await sb.from("movies_with_genres").select("genre_names").eq("id", m.id).maybeSingle();
  const genres: string[] = (genreRow as MovieWithGenresRow | null)?.genre_names ?? [];

  const desc = m.overview
    ? m.overview.slice(0, 155).trimEnd() + (m.overview.length > 155 ? "\u2026" : "")
    : genres.length > 0
      ? `${m.title} (${releaseYear}) \u2014 ${genres.slice(0, 3).join(", ")} \u2014 Watch on KHAYAL`
      : `${m.title}${releaseYear ? ` (${releaseYear})` : ""} \u2014 Watch on KHAYAL`;

  const ogImages = m.poster_url ? [{ url: m.poster_url, width: 500, height: 750 }] : [];

  return {
    title:       `${m.title} ${yr} \u2014 KHAYAL`,
    description: desc,
    openGraph: {
      title:       `${m.title} ${yr}`,
      description: desc,
      images:      ogImages,
      type:        "video.movie",
    },
    twitter: {
      card:        "summary_large_image",
      title:       `${m.title} ${yr}`,
      description: desc,
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
  let myLists: UserList[] = [];

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

  const genres: string[] = (genreResult.data as MovieWithGenresRow | null)?.genre_names ?? [];

  // Similar movies via RPC — genre overlap + year proximity scoring
  const [similarMovies] = await Promise.all([getSimilarMovies(movie.id, 6)]);

  if (user) {
    const [ratingResult, reviewResult, lists] = userResults as [
      { data: { rating: number } | null },
      { data: { id: number; headline: string | null; body: string; contains_spoiler: boolean } | null },
      UserList[],
    ];
    myRating = ratingResult.data?.rating ?? null;
    myReview = reviewResult.data ?? null;
    myLists = lists ?? [];
  }

  const cast: CastMember[] = (castResult.data as unknown as MovieCreditRow[] ?? []).map((c) => ({
    person_id:      c.person_id,
    name:           c.people?.name ?? "Unknown",
    character_name: c.character_name,
    profile_path:   c.people?.profile_path ?? null,
    role:           c.role,
    job:            c.job,
    credit_order:   c.credit_order,
  }));

  const avgRating = stats?.avg_rating ? Number(stats.avg_rating) : null;
  const ratingCount = stats?.total_ratings ?? 0;

  return (
    <div className="relative min-h-screen">
      <AmbientBackdrop posterUrl={movie.poster_url} />
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
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr] 2xl:grid-cols-[400px_1fr] gap-8 lg:gap-12 items-end mb-12">

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
                    className="px-3 py-1 rounded-md text-[10px] font-mono tracking-[0.1em] uppercase bg-[var(--ink-high)] text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/40 transition-colors"
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
              <div className="max-w-2xl mb-8">
                <ExpandableText text={movie.overview} />
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 border-t border-[var(--ink-high)]">
              {movie.trailer_youtube_id && (
                <div className="mb-4">
                  <TrailerModal
                    trailerUrl={`https://www.youtube.com/watch?v=${movie.trailer_youtube_id}`}
                    title={movie.title}
                  />
                </div>
              )}
              <div>
                <RateWidget
                  userId={user?.id ?? null}
                  kind="movie"
                  targetId={movie.id}
                  initialRating={myRating}
                  slug={movie.slug}
                />
              </div>
              <div className="mt-3">
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

        {/* ─── Where to watch ─── */}
        <div className="mb-10">
          <WhereToWatch
            title={movie.title}
            year={year(movie.release_date)}
            trailerYoutubeId={movie.trailer_youtube_id}
          />
        </div>

        {/* ─── You might also like ─── */}
        <SimilarTitles
          heading="You might also like"
          items={similarMovies.map((m) => ({ ...m, kind: "movie" as const }))}
        />

        {/* ─── Cast ─── */}
        {cast.length > 0 && <CastRow cast={cast} />}

        {/* ─── Reviews ─── */}
        <section className="pt-10 border-t border-[var(--ink-high)]">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-[var(--cream)]">Reviews</h2>
          </div>

          {/* Write / edit your review — always shown at top-left of section */}
          <div className="mb-8 max-w-2xl">
            <ReviewForm
              userId={user?.id ?? null}
              kind="movie"
              targetId={movie.id}
              slug={movie.slug}
              existing={myReview}
            />
          </div>

          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet." />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  headline={r.headline}
                  body={r.body}
                  createdAt={r.created_at}
                  authorInitial={(r.display_name || r.username || "?").charAt(0).toUpperCase()}
                  authorName={r.display_name || r.username || "anon"}
                  containsSpoiler={r.contains_spoiler}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
