import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { DeleteContentButton } from "./delete-content-button";
import { ExternalLink } from "lucide-react";
import { AdminPagination } from "@/components/admin-pagination";

export const revalidate = 0;

const PAGE_SIZE = 25;

type SearchParams = { page?: string };

export default async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = await supabaseServer();

  const [
    { data: movies, count: moviesCount },
    { data: tv, count: tvCount },
  ] = await Promise.all([
    sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    sb
      .from("tv_series")
      .select("id, title, slug, first_air_date, poster_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);

  const moviesTotalPages = Math.max(1, Math.ceil((moviesCount ?? 0) / PAGE_SIZE));
  const tvTotalPages = Math.max(1, Math.ceil((tvCount ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">Content Management</h1>

      <Section
        title="Movies"
        items={movies ?? []}
        type="movies"
        dateField="release_date"
        current={page}
        totalPages={moviesTotalPages}
        totalRows={moviesCount ?? 0}
        basePath="/admin/content"
      />
      <Section
        title="TV Series"
        items={tv ?? []}
        type="tv"
        dateField="first_air_date"
        current={page}
        totalPages={tvTotalPages}
        totalRows={tvCount ?? 0}
        basePath="/admin/content"
      />
    </div>
  );
}

type ContentItem = {
  id: number;
  title: string;
  slug: string | null;
  poster_url: string | null;
  [key: string]: unknown;
};

function Section({
  title,
  items,
  type,
  dateField,
  current,
  totalPages,
  totalRows,
  basePath,
}: {
  title: string;
  items: ContentItem[];
  type: "movies" | "tv";
  dateField: string;
  current: number;
  totalPages: number;
  totalRows: number;
  basePath: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="font-semibold text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {totalRows.toLocaleString()} total · {PAGE_SIZE} per page
        </p>
      </div>
      <table className="w-full text-sm" data-testid={`admin-content-${type}-table`}>
        <thead className="border-b border-zinc-800">
          <tr className="text-left text-zinc-500">
            <th className="p-4 font-medium">Title</th>
            <th className="p-4 font-medium">Date</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-zinc-800/40 hover:bg-zinc-800/20"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {item.poster_url && (
                    <img
                      src={item.poster_url}
                      alt=""
                      className="w-8 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="text-zinc-200 font-medium">{item.title}</p>
                    <p className="text-zinc-500 text-xs">{item.slug}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-zinc-400 text-xs">
                {item[dateField] ? new Date(item[dateField] as string).getFullYear() : "—"}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Link
                    href={item.slug ? `/${type === "movies" ? "movies" : "tv"}/${item.slug}` : "#"}
                    target="_blank"
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="View page"
                  >
                    <ExternalLink size={13} />
                  </Link>
                  <DeleteContentButton id={item.id} type={type} title={item.title} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AdminPagination
        current={current}
        totalPages={totalPages}
        totalRows={totalRows}
        basePath={basePath}
      />
    </div>
  );
}
