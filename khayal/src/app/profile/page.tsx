import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Lock, Globe, ArrowUpRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { currentUser, currentProfile } from "@/lib/auth";
import { AvatarUpload } from "./avatar-upload";
import { ProfileDropdown } from "./profile-dropdown";

export const metadata = { title: "Profile — KHAYAL" };
export const revalidate = 0;

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");

  const profile = await currentProfile();
  const sb = await supabaseServer();

  const [
    { count: ratingCount },
    { count: reviewCount },
    { data: lists },
    { data: movieReviews },
    { data: tvReviews },
    { data: ratedMovies },
  ] = await Promise.all([
    sb.from("movie_ratings").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("movie_reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("user_lists")
      .select("id, name, is_public, is_favorites, created_at")
      .eq("user_id", user.id)
      .order("is_favorites", { ascending: false })
      .order("created_at", { ascending: false }),
    sb.from("movie_reviews")
      .select("id, headline, body, created_at, movies!inner(title, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    sb.from("tv_series_reviews")
      .select("id, headline, body, created_at, tv_series!inner(title, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    sb.from("movie_ratings")
      .select("rating, movies!inner(title, slug, poster_url, release_date)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  // Count items per list
  const listIds = (lists ?? []).map((l) => l.id);
  const [{ data: movieCounts }, { data: tvCounts }] = await Promise.all([
    sb.from("user_list_movies").select("list_id").in("list_id", listIds.length ? listIds : [-1]),
    sb.from("user_list_tv_series").select("list_id").in("list_id", listIds.length ? listIds : [-1]),
  ]);
  const countMap = new Map<number, number>();
  [...(movieCounts ?? []), ...(tvCounts ?? [])].forEach((r: any) => {
    countMap.set(r.list_id, (countMap.get(r.list_id) ?? 0) + 1);
  });

  const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "you";
  const allReviews = [
    ...(movieReviews ?? []).map((r: any) => ({ ...r, kind: "movie", target: r.movies })),
    ...(tvReviews ?? []).map((r: any) => ({ ...r, kind: "tv_series", target: r.tv_series })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-6 mb-12 pb-10 border-b border-[var(--taupe)]/20">
        <div className="flex items-center gap-5">
          <AvatarUpload
            userId={user.id}
            avatarUrl={profile?.avatar_url ?? null}
            displayName={displayName}
          />
          <div>
            <h1 className="font-display text-5xl text-[var(--cream)]">{displayName}</h1>
            {profile?.bio && <p className="mt-2 text-sm text-[var(--cream-muted)] max-w-md">{profile.bio}</p>}
            <p className="mt-1 font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--cream-muted)]">
              {user.email}
            </p>
          </div>
        </div>
        <ProfileDropdown email={user.email ?? ""} username={profile?.username} />
      </header>

      {/* Stats */}
      <div className="flex gap-10 mb-14">
        {[
          { label: "Ratings", n: ratingCount ?? 0 },
          { label: "Reviews", n: reviewCount ?? 0 },
          { label: "Lists",   n: lists?.length ?? 0 },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-display text-4xl text-[var(--saffron)]">{s.n}</p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lists */}
      <section className="mb-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl text-[var(--cream)]">
            Your lists <span className="font-mono text-sm text-[var(--cream-muted)] ml-2">({lists?.length ?? 0})</span>
          </h2>
          <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">قوائمك</span>
        </div>
        {(!lists || lists.length === 0) ? (
          <div>
            <p className="font-display italic text-lg text-[var(--cream)]/50">No lists yet.</p>
            <p className="mt-1 text-sm text-[var(--cream-muted)]">Add a film from its detail page and a Favorites list will auto-create.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--taupe)]/10">
            {lists.map((l) => (
              <Link
                key={l.id}
                href={`/lists/${l.id}`}
                className="group flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  {l.is_favorites && <Heart size={11} className="fill-[var(--saffron)] text-[var(--saffron)] shrink-0" />}
                  {!l.is_favorites && (l.is_public ? <Globe size={11} className="text-[var(--cream-muted)] shrink-0" /> : <Lock size={11} className="text-[var(--cream-muted)] shrink-0" />)}
                  <span className="font-display text-lg text-[var(--cream)] group-hover:text-[var(--saffron-glow)] transition-colors">
                    {l.name}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-[var(--cream-muted)]">
                    {countMap.get(l.id) ?? 0} items
                  </span>
                </div>
                <ArrowUpRight size={13} className="text-[var(--cream-muted)] group-hover:text-[var(--saffron)] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent reviews */}
      {allReviews.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl text-[var(--cream)] mb-6">Recent reviews</h2>
          <div className="flex flex-col divide-y divide-[var(--taupe)]/10">
            {allReviews.map((r: any) => (
              <Link
                key={`${r.kind}-${r.id}`}
                href={r.kind === "movie" ? `/movies/${r.target.slug}` : `/tv/${r.target.slug}`}
                className="group py-5 hover:opacity-80 transition-opacity"
              >
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)] mb-2">
                  {new Date(r.created_at).toLocaleDateString()} · on <span className="text-[var(--saffron)]">{r.target.title}</span>
                </p>
                {r.headline && <h3 className="font-display text-lg text-[var(--cream)] mb-1 group-hover:text-[var(--saffron-glow)] transition-colors">{r.headline}</h3>}
                <p className="text-sm text-[var(--cream-muted)] line-clamp-3">{r.body}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent ratings */}
      {(ratedMovies?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-display text-2xl text-[var(--cream)] mb-6">Recently rated</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {(ratedMovies ?? []).map((r: any) => (
              <Link
                key={r.movies.slug}
                href={`/movies/${r.movies.slug}`}
                className="group block relative aspect-[2/3] overflow-hidden rounded-md border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/50 transition-colors"
              >
                {r.movies.poster_url && (
                  <img src={r.movies.poster_url} alt={r.movies.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                )}
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-[var(--ink)] to-transparent">
                  <div className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-[var(--saffron)] text-[var(--ink)] text-xs font-mono">
                    {r.rating}/10
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
