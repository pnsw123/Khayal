import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ArrowLeft, Film, Radio, Globe } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { TvDetail } from "@/lib/supabase";
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
import { TrailerModal } from "@/components/TrailerModal";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("get_tv_detail", { p_slug: slug });
  if (!data) return {};
  const s = (data as any).series;
  const yr = s.first_air_date ? `(${s.first_air_date.split("-")[0]})` : "";
  return {
    title:       `${s.title} ${yr} — KHAYAL`,
    description: s.overview?.slice(0, 160) ?? `Watch ${s.title} on KHAYAL.`,
    openGraph: {
      title:       `${s.title} ${yr}`,
      description: s.overview?.slice(0, 160),
      images:      s.poster_url ? [{ url: s.poster_url }] : [],
      type:        "video.tv_show",
    },
    twitter: {
      card:        "summary_large_image",
      title:       `${s.title} ${yr}`,
      description: s.overview?.slice(0, 160),
      images:      s.poster_url ? [s.poster_url] : [],
    },
  };
}

export default async function TvDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("get_tv_detail", { p_slug: slug });
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const d = data as TvDetail;
  const { tv_series: t, stats, reviews } = d;

  const user = await currentUser();
  let myRating: number | null = null;
  let myReview: { id: number; headline: string | null; body: string; contains_spoiler: boolean } | null = null;
  let myLists: any[] = [];

  const [castResult, seasonsResult, ...userResults] = await Promise.all([
    sb.from("tv_credits")
      .select("person_id, role, character_name, job, credit_order, people(name, profile_path)")
      .eq("tv_series_id", t.id)
      .order("credit_order", { ascending: true })
      .limit(20),
    sb.from("seasons")
      .select("id, season_number, name, overview, air_date, episode_count, poster_url")
      .eq("tv_series_id", t.id)
      .order("season_number", { ascending: true }),
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

  const seasons: Season[] = (seasonsResult.data ?? []) as Season[];

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
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--cream)]/80 mb-8">
                {t.overview}
              </p>
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

        {/* ─── Cast ─── */}
        {cast.length > 0 && <CastRow cast={cast} />}

        {/* ─── Seasons ─── */}
        {seasons.length > 0 && <SeasonsAccordion seasons={seasons} />}

        <section className="pt-10 border-t border-[var(--ink-high)]">
          <h2 className="font-display text-2xl text-[var(--cream)] mb-8">
            Reviews <span className="font-mono text-sm text-[var(--cream-muted)] ml-2">({reviews.length})</span>
          </h2>

          {reviews.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-display italic text-xl text-[var(--cream)]/70">No voices yet.</p>
              <p className="mt-2 text-sm text-[var(--cream-muted)]">Be the first. Form is above.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {reviews.map((r) => (
                <article key={r.id} className="p-5 rounded-sm bg-[var(--ink-lift)] border border-[var(--ink-high)] hover:border-[var(--taupe)]/60 transition-colors">
                  <header className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--ink-high)] text-[var(--cream)] grid place-items-center font-display text-sm">
                      {(r.display_name || r.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[var(--cream)]">{r.display_name || r.username || "anon"}</p>
                      <p className="font-mono text-[10px] tracking-wider text-[var(--cream-muted)]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </header>
                  {r.headline && <h3 className="font-display text-lg text-[var(--cream)] mb-2">{r.headline}</h3>}
                  {r.contains_spoiler ? (
                    <details className="text-sm text-[var(--cream-muted)]">
                      <summary className="cursor-pointer text-[var(--accent-dim)] hover:text-[var(--cream)]">Spoilers. Click to reveal.</summary>
                      <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
                    </details>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--cream)]/85 whitespace-pre-wrap line-clamp-6">{r.body}</p>
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
