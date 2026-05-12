import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  // Only proxy TMDB CDN images
  if (!url.startsWith("https://image.tmdb.org/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(url, { next: { revalidate: 86400 } });
  if (!upstream.ok) return new NextResponse("Upstream error", { status: upstream.status });

  const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
