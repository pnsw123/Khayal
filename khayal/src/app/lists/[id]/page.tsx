import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Heart, Lock, Globe, Trash2 } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { currentUser } from "@/lib/auth";
import { MovieCard } from "@/components/movie-card";
import { year } from "@/lib/utils";
import { ListActions } from "./list-actions";
import { EmptyState } from "@/components/empty-state";

export const revalidate = 0;

export default async function ListPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listId = Number(id);
  if (!Number.isFinite(listId)) notFound();

  const sb = await supabaseServer();
  const { data: list } = await sb
    .from("user_lists")
    .select("id, user_id, name, description, is_public, is_favorites, created_at")
    .eq("id", listId)
    .maybeSingle();

  if (!list) notFound();

  const user = await currentUser();
  const isOwner = !!user && user.id === list.user_id;

  // If private and not the owner, hide it
  if (!list.is_public && !isOwner) {
    redirect("/browse");
  }

  // Owner's profile (for public display)
  const { data: ownerProfile } = await sb
    .from("profiles")
    .select("username, display_name")
    .eq("id", list.user_id)
    .maybeSingle();

  // Member movies + series
  const [{ data: movieRows }, { data: tvRows }] = await Promise.all([
    sb.from("user_list_movies")
      .select("movie_id, added_at, movies!inner(id, title, slug, release_date, poster_url)")
      .eq("list_id", listId)
      .order("added_at", { ascending: false }),
    sb.from("user_list_tv_series")
      .select("tv_series_id, added_at, tv_series!inner(id, title, slug, first_air_date, poster_url)")
      .eq("list_id", listId)
      .order("added_at", { ascending: false }),
  ]);

  const movies: any[] = (movieRows ?? []).map((r: any) => r.movies).filter(Boolean);
  const series: any[] = (tvRows ?? []).map((r: any) => r.tv_series).filter(Boolean);
  const total = movies.length + series.length;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10">
      <Link
        href={isOwner ? "/profile" : "/browse"}
        className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] uppercase text-[var(--cream-muted)] hover:text-[var(--saffron)] transition-colors mb-8"
      >
        <ArrowLeft size={12} /> {isOwner ? "Your profile" : "Home"}
      </Link>

      <header className="flex items-end justify-between gap-4 mb-10 pb-8 border-b border-[var(--taupe)]/15">
        <div>
          <p className="flex items-center gap-3 mb-3 text-[11px] font-mono tracking-[0.3em] uppercase text-[var(--saffron)]">
            {list.is_favorites && <Heart size={12} className="fill-[var(--saffron)]" />}
            {list.is_public ? <Globe size={12} /> : <Lock size={12} />}
            {list.is_public ? "Public list" : "Private list"}
            <span>·</span>
            <span>{total} title{total === 1 ? "" : "s"}</span>
          </p>
          <h1 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-[var(--cream)]">
            {list.name}
          </h1>
          {list.description && (
            <p className="mt-3 text-sm text-[var(--cream-muted)] max-w-xl">{list.description}</p>
          )}
          {!isOwner && ownerProfile && (
            <p className="mt-3 text-xs text-[var(--cream-muted)]">
              curated by <span className="text-[var(--cream)]">{ownerProfile.display_name || ownerProfile.username}</span>
            </p>
          )}
        </div>

        {isOwner && (
          <ListActions
            listId={list.id}
            isFavorites={list.is_favorites}
            isPublic={list.is_public}
          />
        )}
      </header>

      {total === 0 ? (
        <EmptyState
          title="Empty shelf."
          subtitle={isOwner ? 'Add films from their detail pages. Look for “Add to list.”' : "Nothing on this list yet."}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-10">
          {movies.map((m: any) => (
            <MovieCard
              key={`m-${m.id}`}
              title={m.title}
              year={year(m.release_date)}
              posterUrl={m.poster_url}
              href={`/movies/${m.slug}`}
            />
          ))}
          {series.map((t: any) => (
            <MovieCard
              key={`t-${t.id}`}
              title={t.title}
              year={year(t.first_air_date)}
              posterUrl={t.poster_url}
              href={`/tv/${t.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
