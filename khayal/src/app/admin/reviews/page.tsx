import { supabaseServer } from "@/lib/supabase-server";
import { DeleteReviewButton } from "./delete-review-button";
import { AdminPagination } from "@/components/admin-pagination";

export const revalidate = 0;

const PAGE_SIZE = 25;

type SearchParams = { page?: string };

export default async function AdminReviews({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = await supabaseServer();

  // Fetch total counts first (cheap) to compute total pages for merged view
  const [{ count: movieCount }, { count: tvCount }] = await Promise.all([
    sb.from("movie_reviews").select("id", { count: "exact", head: true }),
    sb.from("tv_series_reviews").select("id", { count: "exact", head: true }),
  ]);

  const totalRows = (movieCount ?? 0) + (tvCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  // Fetch a window twice the page size from both tables, merge+sort, then slice
  // This ensures correct chronological ordering across both tables per page.
  const fetchWindow = PAGE_SIZE * 2;
  const windowFrom = (page - 1) * PAGE_SIZE;

  const [{ data: movieReviews }, { data: tvReviews }] = await Promise.all([
    sb
      .from("movie_reviews")
      .select(
        "id, headline, body, created_at, profiles(username), movies(title, slug)"
      )
      .order("created_at", { ascending: false })
      .range(windowFrom, windowFrom + fetchWindow - 1),
    sb
      .from("tv_series_reviews")
      .select(
        "id, headline, body, created_at, profiles(username), tv_series(title, slug)"
      )
      .order("created_at", { ascending: false })
      .range(windowFrom, windowFrom + fetchWindow - 1),
  ]);

  const allReviews = [
    ...(movieReviews ?? []).map((r) => ({
      ...r,
      type: "movie" as const,
      title: (r.movies as any)?.title,
    })),
    ...(tvReviews ?? []).map((r) => ({
      ...r,
      type: "tv" as const,
      title: (r.tv_series as any)?.title,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Review Moderation</h1>
        <p className="text-sm text-zinc-500">
          <span className="text-zinc-300">{totalRows.toLocaleString()}</span> total reviews
        </p>
      </div>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
        data-testid="admin-reviews-container"
      >
        <div className="divide-y divide-zinc-800/60">
          {allReviews.map((r) => (
            <div
              key={`${r.type}-${r.id}`}
              className="p-4 hover:bg-zinc-800/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      {r.type}
                    </span>
                    <span className="text-zinc-200 font-medium text-sm truncate">
                      {r.title}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      by {(r.profiles as any)?.username ?? "unknown"}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.headline && (
                    <p className="text-zinc-300 text-sm font-medium">
                      {r.headline}
                    </p>
                  )}
                  <p className="text-zinc-400 text-sm line-clamp-2 mt-0.5">
                    {r.body}
                  </p>
                </div>
                <DeleteReviewButton reviewId={r.id} type={r.type} />
              </div>
            </div>
          ))}
        </div>
        <AdminPagination
          current={page}
          totalPages={totalPages}
          totalRows={totalRows}
          basePath="/admin/reviews"
        />
      </div>
    </div>
  );
}
