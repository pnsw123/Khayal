import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, MessageSquare, List, Film, Tv, CalendarDays } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { currentUser } from "@/lib/auth";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — KHAYAL`,
    description: `${username}'s ratings, reviews and watchlists on KHAYAL.`,
  };
}

export default async function UserProfilePage({
  params,
}: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const sb = await supabaseServer();

  // Look up profile by username
  const { data: profile } = await sb
    .from("profiles")
    .select("id, username, avatar_url, created_at, role")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const viewer = await currentUser();
  const isOwn = viewer?.id === profile.id;

  // Parallel data fetch
  const [
    { count: ratingCount },
    { count: reviewCount },
    { count: listCount },
    { data: recentMovieReviews },
    { data: recentTvReviews },
    { data: publicLists },
    { data: recentRatings },
  ] = await Promise.all([
    sb.from("movie_ratings").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    sb.from("movie_reviews").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    sb.from("user_lists").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_public", true),
    sb.from("movie_reviews")
      .select("id, headline, created_at, movies(title, slug, poster_url)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(4),
    sb.from("tv_series_reviews")
      .select("id, headline, created_at, tv_series(title, slug, poster_url)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(4),
    sb.from("user_lists")
      .select("id, name, is_favorites, created_at")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("is_favorites", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    sb.from("movie_ratings")
      .select("rating, created_at, movies(title, slug, poster_url)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const allReviews = [
    ...(recentMovieReviews ?? []).map((r: any) => ({
      id: r.id, headline: r.headline, created_at: r.created_at,
      title: r.movies?.title, slug: r.movies?.slug, poster: r.movies?.poster_url, type: "movie" as const,
    })),
    ...(recentTvReviews ?? []).map((r: any) => ({
      id: r.id, headline: r.headline, created_at: r.created_at,
      title: r.tv_series?.title, slug: r.tv_series?.slug, poster: r.tv_series?.poster_url, type: "tv" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  const initials = (profile.username ?? "?").slice(0, 2).toUpperCase();
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">

      {/* ── Profile header ── */}
      <div className="flex items-start gap-6 mb-12 pb-10 border-b border-[var(--taupe)]/15">
        {/* Avatar */}
        <div className="shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--saffron)]/30 bg-[var(--ink-lift)] flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username ?? ""} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-[var(--saffron)]">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl text-[var(--cream)]">{profile.username}</h1>
            {profile.role === "admin" && (
              <span className="px-2 py-0.5 rounded-sm bg-[var(--saffron)]/20 border border-[var(--saffron)]/40 font-mono text-[10px] tracking-wider uppercase text-[var(--saffron)]">
                Admin
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--cream-muted)] mt-1.5 flex items-center gap-1.5">
            <CalendarDays size={11} /> Joined {joined}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-4">
            {[
              { icon: Star,          value: ratingCount  ?? 0, label: "Ratings" },
              { icon: MessageSquare, value: reviewCount  ?? 0, label: "Reviews" },
              { icon: List,          value: listCount    ?? 0, label: "Lists" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={13} className="text-[var(--saffron)]" />
                <span className="font-display text-lg text-[var(--cream)]">{value}</span>
                <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--cream-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {isOwn && (
          <Link
            href="/profile"
            className="shrink-0 px-3 py-1.5 rounded-sm border border-[var(--taupe)]/30 font-mono text-[11px] tracking-wider uppercase text-[var(--cream-muted)] hover:border-[var(--saffron)]/50 hover:text-[var(--cream)] transition-colors"
          >
            Edit profile
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-10">
        <div className="space-y-12">

          {/* ── Recent ratings ── */}
          {(recentRatings ?? []).length > 0 && (
            <section>
              <h2 className="font-display text-xl text-[var(--cream)] mb-5 flex items-center gap-2">
                <Star size={16} className="text-[var(--saffron)]" /> Recent Ratings
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {(recentRatings ?? []).map((r: any) => (
                  <Link key={r.movies?.slug} href={`/movies/${r.movies?.slug}`} className="group">
                    <div className="relative aspect-[2/3] rounded-sm overflow-hidden border border-[var(--taupe)]/15 group-hover:border-[var(--saffron)]/40 transition-colors">
                      {r.movies?.poster_url ? (
                        <img src={r.movies.poster_url} alt={r.movies.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[var(--ink-lift)] flex items-center justify-center">
                          <Film size={16} className="text-[var(--cream-muted)]" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-[var(--ink)]/90 backdrop-blur-sm">
                        <Star size={8} className="fill-[var(--saffron)] text-[var(--saffron)]" />
                        <span className="font-mono text-[9px] text-[var(--cream)]">{r.rating}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent reviews ── */}
          {allReviews.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-[var(--cream)] mb-5 flex items-center gap-2">
                <MessageSquare size={16} className="text-[var(--saffron)]" /> Recent Reviews
              </h2>
              <div className="space-y-3">
                {allReviews.map((r) => (
                  <Link
                    key={`${r.type}-${r.id}`}
                    href={`/${r.type === "movie" ? "movies" : "tv"}/${r.slug}`}
                    className="flex items-center gap-4 p-3 rounded-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/40 transition-colors group"
                  >
                    {r.poster && (
                      <img src={r.poster} alt={r.title ?? ""} className="w-10 aspect-[2/3] object-cover rounded-sm shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[14px] text-[var(--cream)] group-hover:text-[var(--saffron-glow)] transition-colors truncate">
                        {r.title}
                      </p>
                      {r.headline && (
                        <p className="font-mono text-[11px] text-[var(--cream-muted)] truncate">{r.headline}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tracking-wider uppercase text-[var(--cream-muted)] px-1.5 py-0.5 rounded-sm border border-[var(--taupe)]/20">
                      {r.type === "movie" ? <Film size={10} className="inline mr-1" /> : <Tv size={10} className="inline mr-1" />}
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* ── Public lists sidebar ── */}
        {(publicLists ?? []).length > 0 && (
          <aside>
            <h2 className="font-display text-xl text-[var(--cream)] mb-5 flex items-center gap-2">
              <List size={16} className="text-[var(--saffron)]" /> Lists
            </h2>
            <div className="space-y-2">
              {(publicLists ?? []).map((l: any) => (
                <Link
                  key={l.id}
                  href={`/lists/${l.id}`}
                  className="flex items-center gap-3 p-3 rounded-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/40 transition-colors group"
                >
                  <span className="text-[var(--saffron)]">
                    {l.is_favorites ? "♥" : "☰"}
                  </span>
                  <span className="font-display text-[14px] text-[var(--cream)] group-hover:text-[var(--saffron-glow)] transition-colors truncate">
                    {l.name}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
