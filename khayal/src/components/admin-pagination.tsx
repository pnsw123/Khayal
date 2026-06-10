import Link from "next/link";

interface AdminPaginationProps {
  current: number;
  totalPages: number;
  totalRows: number;
  basePath: string;
}

export function AdminPagination({ current, totalPages, totalRows, basePath }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    if (p === 1) return basePath;
    return `${basePath}?page=${p}`;
  };

  const windowSize = 7;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div
      className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between gap-4"
      data-testid="admin-pagination"
    >
      <p className="text-xs text-zinc-500">
        Page <span className="text-zinc-300">{current}</span> of{" "}
        <span className="text-zinc-300">{totalPages}</span>
        <span className="mx-1.5 text-zinc-700">·</span>
        <span className="text-zinc-300">{totalRows.toLocaleString()}</span> total
      </p>

      <nav className="flex items-center gap-0.5" aria-label="Pagination">
        {current > 1 ? (
          <Link
            href={href(current - 1)}
            className="h-8 px-3 rounded text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors flex items-center"
            data-testid="pagination-prev"
          >
            ‹ Prev
          </Link>
        ) : (
          <span className="h-8 px-3 rounded text-xs font-mono border border-zinc-800 text-zinc-700 flex items-center">
            ‹ Prev
          </span>
        )}

        {pages.map((p) => (
          <Link
            key={p}
            href={href(p)}
            className={
              "h-8 min-w-8 px-2 rounded text-xs font-mono flex items-center justify-center transition-colors " +
              (p === current
                ? "bg-amber-500 text-zinc-950 font-semibold"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
            }
            data-testid={p === current ? "pagination-current" : undefined}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </Link>
        ))}

        {current < totalPages ? (
          <Link
            href={href(current + 1)}
            className="h-8 px-3 rounded text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors flex items-center"
            data-testid="pagination-next"
          >
            Next ›
          </Link>
        ) : (
          <span className="h-8 px-3 rounded text-xs font-mono border border-zinc-800 text-zinc-700 flex items-center">
            Next ›
          </span>
        )}
      </nav>
    </div>
  );
}
