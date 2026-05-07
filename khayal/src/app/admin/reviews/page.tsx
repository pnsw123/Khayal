import { supabaseServer } from "@/lib/supabase-server";
import { DeleteReviewButton } from "./delete-review-button";

export const revalidate = 0;

export default async function AdminReviews() {
  const sb = await supabaseServer();

  const [{ data: movieReviews }, { data: tvReviews }] = await Promise.all([
    sb.from("movie_reviews")
      .select("id, headline, body, created_at, profiles(username), movies(title, slug)")
      .order("created_at", { ascending: false })
      .limit(50),
    sb.from("tv_series_reviews")
      .select("id, headline, body, created_at, profiles(username), tv_series(title, slug)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const allReviews = [
    ...(movieReviews ?? []).map((r) => ({ ...r, type: "movie" as const, title: (r.movies as any)?.title })),
    ...(tvReviews ?? []).map((r) => ({ ...r, type: "tv" as const, title: (r.tv_series as any)?.title })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Review Moderation</h1>
      <p className="text-zinc-400 text-sm">{allReviews.length} most recent reviews</p>
      <div className="space-y-3">
        {allReviews.map((r) => (
          <div key={`${r.type}-${r.id}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{r.type}</span>
                  <span className="text-zinc-200 font-medium text-sm truncate">{r.title}</span>
                  <span className="text-zinc-500 text-xs">by {(r.profiles as any)?.username ?? "unknown"}</span>
                  <span className="text-zinc-600 text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.headline && <p className="text-zinc-300 text-sm font-medium">{r.headline}</p>}
                <p className="text-zinc-400 text-sm line-clamp-2 mt-0.5">{r.body}</p>
              </div>
              <DeleteReviewButton reviewId={r.id} type={r.type} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
