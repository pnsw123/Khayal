import Link from "next/link";
import { Film } from "lucide-react";
import { year } from "@/lib/utils";
import type { SimilarMovie, SimilarTv } from "@/lib/similar";

type Item =
  | (SimilarMovie & { kind: "movie" })
  | (SimilarTv   & { kind: "tv" });

interface SimilarTitlesProps {
  heading?: string;
  items: Item[];
}

export function SimilarTitles({ heading = "You might also like", items }: SimilarTitlesProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-14">
      <h2 className="font-display text-xl text-[var(--cream)] mb-5">{heading}</h2>
      <div
        className="relative -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto scroll-smooth snap-x [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex gap-4 min-w-max pb-3">
          {items.map((item) => {
            const href = item.kind === "movie" ? `/movies/${item.slug}` : `/tv/${item.slug}`;
            const releaseYear =
              item.kind === "movie"
                ? year((item as SimilarMovie).release_date)
                : year((item as SimilarTv).first_air_date);

            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={href}
                className="group relative w-[130px] shrink-0 snap-start rounded-md overflow-hidden border border-white/10 aspect-[2/3] block"
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--ink-lift)] flex items-center justify-center">
                    <Film size={32} className="text-[var(--cream-muted)]" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
                  <p className="text-[var(--cream)] text-xs font-medium line-clamp-2 leading-tight">{item.title}</p>
                  {releaseYear && (
                    <p className="text-[var(--cream-muted)] text-[10px] font-mono mt-0.5">{releaseYear}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
