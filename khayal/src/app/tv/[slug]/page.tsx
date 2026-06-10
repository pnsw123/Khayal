import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ArrowLeft, Film } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { TvDetail } from "@/lib/supabase";
import type { TvCreditWithPeopleRow } from "@/lib/database.types";
import { currentUser } from "@/lib/auth";
import { year } from "@/lib/utils";
import { RateWidget } from "@/components/rate-widget";
import { ReviewForm } from "@/components/review-form";
import { WhereToWatch } from "@/components/where-to-watch";
import { AddToListButton } from "@/components/add-to-list";
import { loadUserListsForTarget } from "@/lib/lists";
import { CastRow } from "@/components/cast-row";
import type { CastMember } from "@/components/cast-row";
import { SeasonsAccordion } from "@/components/seasons-accordion";
import type { Season } from "@/components/seasons-accordion";
import { TrailerModal } from "@/components/trailer-modal";
import { SimilarTitles } from "@/components/similar-titles";
import { getSimilarTvSeries } from "@/lib/similar";
import { EmptyState } from "@/components/empty-state";
import { ExpandableText } from "@/components/expandable-text";
import { ReviewCard } from "@/components/review-card";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  let data: unknown = null;
  try {
    const result = await sb.rpc("get_tv_detail", { p_slug: slug });
    if (result.error) {
      // RPC missing or DB error — return minimal metadata rather than crashing
      return {};
    }
    data = result.data;
  } catch {
    return {};
  }
  if (!data) return {};
  const s = (data as TvDetail).tv_series;
  const yr = s.first_air_date ? `(${s.first_air_date.split("-")[0]})` : "";
  const releaseYear = s.first_air_date ? s.first_air_date.split("-")[0] : "";

  const desc = s.overview
    ? s.overview.slice(0, 155).trimEnd() + (s.overview.length > 155 ? "\u2026" : "")
    : `${s.title}${releaseYear ? ` (${releaseYear})` : ""} \u2014 Watch on KHAYAL`;

  const ogImages = s.poster_url ? [{ url: s.poster_url, width: 500, height: 750 }] : [];

  return {
    title:       `${s.title} ${yr} \u2014 KHAYAL`,
    description: desc,
    openGraph: {
      title:       `${s.title} ${yr}`,
      description: desc,
      images:      ogImages,
      type:        "video.tv_show",
    },
    twitter: {
      card:        "summary_large_image",
      title:       `${s.title} ${yr}`,
      description: desc,
      images:      s.poster_url ? [s.poster_url] : [],
    },
  };
}

export default async function TvDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  let data: unknown = null;
  try {
    const result = await sb.rpc("get_tv_detail", { p_slug: slug });
    if (result.error) {
      // RPC undefined or DB error — treat as not found rather than crashing
      notFound();
    }
    data = result.data;
  } catch {
    notFound();
  }
  if (!data) notFound();

  const d = data as TvDetail;
  const { tv_series: t, stats, reviews } = d;

  const user = await currentUser();
  let myRating: number | null = null;
  let myReview: { id: number; headline: string | null; body: string; contains_spoiler: boolean } | null = null;
  let myLists: { id: number; name: string; is_favorites: boolean; is_public: boolean; member: boolean }[] = [];

  const [castResult, seasonsResult, similarSeries, ...userResults] = await Promise.all([
    sb.from("tv_credits")
      .select("person_id, role, character_name, job, credit_order, people(name, profile_path)")
      .eq("tv_series_id", t.id)
      .order("credit_order", { ascending: true })
      .limit(20),
    sb.from("seasons")
      .select("id, season_number, name, overview, air_date, episode_count, poster_url")
      .eq("tv_series_id", t.id)
      .order("season_number", { ascending: true }),
    getSimilarTvSeries(t.id, 6),
    user
      ? sb.from("tv_series_ratings").select("rating").eq("tv_series_id", t.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? sb.from("tv_series_reviews").select("id, headline, body, contains_spoiler").eq("tv_series_id", t.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? loadUserListsForTarget(user.id, "tv_series", t.id)
      : Promise.resolve([]),
  ]);

  if (user) {
    const [{ data: r }, { data: rv }, lists] = userResults as [
      { data: { rating: number } | null },
      { data: { id: number; headline: string | null; body: string; contains_spoiler: boolean } | null },
      { id: number; name: string; is_favorites: boolean; is_public: boolean; member: boolean }[],
    ];
    myRating = r?.rating ?? null;
    myReview = rv ?? null;
    myLists = lists ?? [];
  }

  const cast: CastMember[] = (castResult.data as TvCreditWithPeopleRow[] ?? []).map((c) => ({
    person_id:      c.person_id,
    name:           c.people?.name ?? "Unknown",
    character_name: c.character_name,
    profile_path:   c.people?.profile_path ?? null,
    role:           c.role,
    job:            c.job,
    credit_order:   c.credit_order ?? 0,
  }));

  const seasons: Season[] = (seasonsResult.data ?? []) as Season[];

  // Suppress unused-vars warning — stats is part of TvDetail type
  void stats;

  return (
    <div className="min-h-screen">
      {/* ── Full-bleed backdrop ── */}
      <div className="relative h-[55vh] min-h-[400px] overflow-hidden">
        {t.backdrop_url ? (
          <>
            <img src={t.backdrop_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-[50%_20%] scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink-lift)] to-[var(--ink)]" />
        )}
        <div className="absolute top-6 left-0 right-0">
          <div className="mx-auto max-w-[1400px] px-6">
            <Link href="/browse" className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] uppercase text-[var(--cream-muted)] hover:text-[var(--cream)] transition-colors">
              <ArrowLeft size={12} /> Back
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 -mt-48 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr] 2xl:grid-cols-[400px_1fr] gap-8 lg:gap-12 items-end mb-12">

          {/* Poster */}
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] self-end">
            {t.poster_url ? (
              <img src={t.poster_url} alt={t.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--ink-lift)]">
                <Film size={48} className="text-[var(--cream-muted)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 pb-2">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--accent-dim)] mb-4">Series · مسلسل</p>
            <h1 className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[0.92] text-[var(--cream)] mb-5">
              {t.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {t.first_air_date && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--cream-muted)]">
                  <CalendarDays size={13} />
                  {year(t.first_air_date)}{t.last_air_date && t.last_air_date !== t.first_air_date ? `–${year(t.last_air_date)}` : ""}
                </span>
              )}
            </div>

            {t.overview && (
              <div className="max-w-2xl mb-8">
                <ExpandableText text={t.overview} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-[var(--ink-high)]">
              {t.trailer_youtube_id && (
                <TrailerModal
                  trailerUrl={`https://www.youtube.com/watch?v=${t.trailer_youtube_id}`}
                  title={t.title}
                />
              )}
              <RateWidget
                userId={user?.id ?? null}
                kind="tv_series"
                targetId={t.id}
                initialRating={myRating}
                slug={t.slug}
              />
              <AddToListButton
                userId={user?.id ?? null}
                kind="tv_series"
                targetId={t.id}
                slug={t.slug}
                initialLists={myLists}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-6 mb-14">
          <WhereToWatch
            title={t.title}
            year={year(t.first_air_date)}
            trailerYoutubeId={t.trailer_youtube_id}
          />
          <ReviewForm
            userId={user?.id ?? null}
            kind="tv_series"
            targetId={t.id}
            slug={t.slug}
            existing={myReview}
          />
        </div>

        {/* ─── You might also like ─── */}
        <SimilarTitles
          heading="You might also like"
          items={similarSeries.map((s) => ({ ...s, kind: "tv" as const }))}
        />

        {/* ─── Cast ─── */}
        {cast.length > 0 && <CastRow cast={cast} />}

        {/* ─── Seasons ─── */}
        {seasons.length > 0 && <SeasonsAccordion seasons={seasons} />}

        <section className="pt-10 border-t border-[var(--ink-high)]">
          <h2 className="font-display text-2xl text-[var(--cream)] mb-8">
            Reviews <span className="font-mono text-sm text-[var(--cream-muted)] ml-2">({reviews.length})</span>
          </h2>

          {reviews.length === 0 ? (
            <EmptyState title="No voices yet." subtitle="Be the first. Form is above." />
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
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
