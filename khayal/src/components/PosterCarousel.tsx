"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface PosterCarouselItem {
  slug: string;
  title: string;
  poster_url: string | null;
  href: string;
}

export interface PosterCarouselProps {
  title: string;
  items: PosterCarouselItem[];
}

export function PosterCarousel({ title, items }: PosterCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: true });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const update = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
  }, [emblaApi, update]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (items.length === 0) return null;

  return (
    <section className="mb-14" data-testid="poster-carousel">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-4 md:px-6">
        <h2 className="font-display text-xl md:text-2xl text-[var(--cream)]">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Scroll left"
            className={[
              "h-9 w-9 rounded-full flex items-center justify-center transition-all",
              "bg-black/50 backdrop-blur-sm border border-white/10",
              canScrollPrev
                ? "text-[var(--cream)] hover:bg-[var(--saffron)] hover:text-[var(--ink)] hover:border-[var(--saffron)] cursor-pointer"
                : "text-[var(--cream-muted)]/30 cursor-default",
            ].join(" ")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Scroll right"
            className={[
              "h-9 w-9 rounded-full flex items-center justify-center transition-all",
              "bg-black/50 backdrop-blur-sm border border-white/10",
              canScrollNext
                ? "text-[var(--cream)] hover:bg-[var(--saffron)] hover:text-[var(--ink)] hover:border-[var(--saffron)] cursor-pointer"
                : "text-[var(--cream-muted)]/30 cursor-default",
            ].join(" ")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Embla viewport */}
      <div className="overflow-hidden -mx-4 md:-mx-6 px-4 md:px-6" ref={emblaRef}>
        <div className="flex gap-4 md:gap-5">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              data-testid="poster-slide"
              className="group shrink-0 w-[140px] md:w-[160px] block"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--ink-lift)]">
                {item.poster_url ? (
                  <Image
                    src={item.poster_url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 140px, 160px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[var(--cream-muted)]/40 text-xs font-mono px-2 text-center">
                      {item.title}
                    </span>
                  </div>
                )}
                {/* Title overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                  <span className="text-[var(--cream)] text-xs font-display leading-tight line-clamp-2">
                    {item.title}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
