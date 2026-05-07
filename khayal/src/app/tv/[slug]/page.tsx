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
    <div className="relative">
      {t.backdrop_url && (
        <div className="absolute inset-x-0 top-0 h-[60vh] overflow-hidden" aria-hidden>
          <img src={t.backdrop_url} alt="" className="w-full h-full object-cover object-[50%_25%] opacity-25" />
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

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 mb-14">
          <div className="aspect-[2/3] rounded-[2px] overflow-hidden border border-[var(--saffron)]/15 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)] self-start">
            {t.poster_url ? (
              <img src={t.poster_url} alt={t.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--ink-lift)] text-[var(--cream-muted)]">
                <Film size={48} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--saffron)] mb-3">
              Series · مسلسل
            </p>
            <h1 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-[var(--cream)] mb-4">
              {t.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-sm text-[var(--cream-muted)]">
              {t.first_air_date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} /> {year(t.first_air_date)}
                  {t.last_air_date && t.last_air_date !== t.first_air_date ? `–${year(t.last_air_date)}` : ""}
                </span>
              )}
            </div>

            {t.overview && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--cream)]/90 mb-8">
                {t.overview}
              </p>
            )}

            <div className="pt-6 border-t border-[var(--taupe)]/15 space-y-5">
              <RateWidget
                userId={user?.id ?? null}
                kind="tv_series"
                targetId={t.id}
                initialRating={myRating}
                slug={t.slug}
              />
              <div>
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
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6 mb-14">
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

        <section className="pt-10 border-t border-[var(--taupe)]/15">
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
                <article key={r.id} className="p-5 rounded-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/40 transition-colors">
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
                  {r.headline && <h3 className="font-display text-lg text-[var(--cream)] mb-2">{r.headline}</h3>}
                  {r.contains_spoiler ? (
                    <details className="text-sm text-[var(--cream-muted)]">
                      <summary className="cursor-pointer text-[var(--saffron)] hover:text-[var(--saffron-glow)]">Spoilers. Click to reveal.</summary>
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
