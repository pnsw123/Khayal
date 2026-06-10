import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/search
 *
 * Query params:
 *   q          – required; full-text search query (min 2 chars)
 *   type       – optional; "movie" | "tv"
 *   page_size  – optional; default 20, max 100
 *   page       – optional; 0-indexed page number, default 0
 *
 * Returns: { results: SearchResult[], total: number }
 *
 * Proxies the `search_all` Supabase RPC so k6 / synthetic monitors can
 * exercise the FTS path over HTTP without requiring a browser client.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;

  const q = sp.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  const typeParam = sp.get("type");
  const pType =
    typeParam === "movie" || typeParam === "tv" ? typeParam : null;

  const pageSizeParam = sp.get("page_size");
  const parsedPageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : NaN;
  const pageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(parsedPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const pageParam = sp.get("page");
  const parsedPage = pageParam ? parseInt(pageParam, 10) : NaN;
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

  const sb = await supabaseServer();

  const { data, error } = await sb.rpc("search_all", {
    query_text: q.trim(),
    page_size: pageSize,
    page_offset: page * pageSize,
    p_type: pType,
    p_year_start: null,
    p_year_end: null,
    p_genre: null,
  });

  if (error) {
    console.error("[search] search_all RPC error:", error.message);
    return NextResponse.json(
      { error: `Search failed: ${error.message}` },
      { status: 500 },
    );
  }

  const results = Array.isArray(data) ? data : [];

  return NextResponse.json({ results, total: results.length });
}
