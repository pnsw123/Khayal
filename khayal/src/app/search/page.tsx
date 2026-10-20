import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { SearchClient } from "./search-client";
import { PageGlow } from "@/components/backgrounds/page-glow";

export const metadata = { title: "Search — KHAYAL" };

export default async function SearchPage() {
  const sb = await supabaseServer();
  const { data: defaultQueries } = await sb
    .from("saved_queries")
    .select("id, title, query_text")
    .eq("is_default", true)
    .order("id");

  return (
    <div className="relative isolate -mt-20 pt-20 min-h-screen">
      <PageGlow />
      <div className="relative mx-auto max-w-[1400px] px-4 md:px-6 pt-8 md:pt-12 pb-16">
        <h1 className="font-display text-center text-[clamp(2rem,4.5vw,3.25rem)] leading-tight text-white mb-8">
          What are you looking for?
        </h1>
        <Suspense fallback={null}>
          <SearchClient defaultQueries={defaultQueries ?? []} />
        </Suspense>
      </div>
    </div>
  );
}
