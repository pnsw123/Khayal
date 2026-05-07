import { supabaseServer } from "@/lib/supabase-server";
import type { MetadataRoute } from "next";

const BASE = "https://movie-db-one-psi.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = await supabaseServer();

  const [{ data: movies }, { data: tv }] = await Promise.all([
    sb.from("movies").select("slug, updated_at").order("updated_at", { ascending: false }),
    sb.from("tv_series").select("slug, updated_at").order("updated_at", { ascending: false }),
  ]);

  const movieUrls = (movies ?? []).map((m) => ({
    url:          `${BASE}/movies/${m.slug}`,
    lastModified: m.updated_at ?? new Date(),
    changeFrequency: "monthly" as const,
    priority:     0.7,
  }));

  const tvUrls = (tv ?? []).map((s) => ({
    url:          `${BASE}/tv/${s.slug}`,
    lastModified: s.updated_at ?? new Date(),
    changeFrequency: "monthly" as const,
    priority:     0.7,
  }));

  return [
    { url: BASE,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/browse`,  lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/search`,  lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    ...movieUrls,
    ...tvUrls,
  ];
}
