import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { SearchClient } from "./search-client";

export const metadata = { title: "Search — KHAYAL" };

export default async function SearchPage() {
  const sb = await supabaseServer();
  const { data: defaultQueries } = await sb
    .from("saved_queries")
    .select("id, title, query_text")
    .eq("is_default", true)
    .order("id");

  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[80vw] h-[40vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(244,196,48,0.08), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div className="relative">
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--saffron)] mb-3">
          Search
        </p>
        <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[0.95] text-[var(--cream)] mb-10">
          What are you looking for?
        </h1>
        <Suspense fallback={null}>
          <SearchClient defaultQueries={defaultQueries ?? []} />
        </Suspense>
      </div>
    </div>
  );
}
