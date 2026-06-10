import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  // Only proxy TMDB CDN images
  if (!url.startsWith("https://image.tmdb.org/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok) return new NextResponse("Upstream error", { status: upstream.status });

  const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);
  const rawType = upstream.headers.get("Content-Type") ?? "";
  const baseType = rawType.split(";")[0].trim();
  const contentType = ALLOWED_TYPES.has(baseType) ? rawType : "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
