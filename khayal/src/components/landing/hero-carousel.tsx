"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CalendarDays, Clock, Info, LayoutGrid } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { runtime as fmtRuntime } from "@/lib/utils";
import type { LandingFeatured } from "@/lib/landing";

/** Auto-advance interval for the hero, in ms. */
export const HERO_INTERVAL = 6000;

const chip =
  "inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-sm text-white";

/**
 * Full-bleed hero: popular Khayal films on their backdrops, built on the
 * shadcn/ui Carousel (embla). Auto-advances unless the user prefers
 * reduced motion; dots underneath jump to a slide.
 */
export function HeroCarousel({ slides }: { slides: LandingFeatured[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  // Restart the timer on every slide change so a manual jump gets a full interval.
  useEffect(() => {
    if (!api || reduced || slides.length < 2) return;
    const t = setTimeout(() => api.scrollNext(), HERO_INTERVAL);
    return () => clearTimeout(t);
  }, [api, current, reduced, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section data-testid="hero-section" className="relative">
      <h1 className="sr-only">KHAYAL — a directory of films and series</h1>
      <Carousel setApi={setApi} opts={{ loop: true, duration: 32 }} aria-label="Popular films">
        <CarouselContent className="ml-0">
          {slides.map((s, i) => (
            <CarouselItem key={s.id} className="pl-0" aria-label={`${i + 1} of ${slides.length}`}>
              <div className="relative h-[78svh] min-h-[540px] max-h-[860px] w-full overflow-hidden">
                <Image
                  src={s.backdropUrl}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover object-[50%_25%]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/30" />

                <div className="absolute inset-0 flex items-end">
                  <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-12 pb-24 md:pb-28">
                    <div className="max-w-xl">
                      <p className="mb-3 text-sm font-medium text-[var(--saffron-glow)]">
                        Popular on KHAYAL <span className="font-arabic ml-1.5" dir="rtl">رائج</span>
                      </p>
                      <h2 className="font-display text-[clamp(2.25rem,6vw,4.75rem)] leading-[0.95] text-white mb-4 line-clamp-2">
                        {s.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {s.year && (
                          <span className={chip}><CalendarDays size={13} /> {s.year}</span>
                        )}
                        {s.runtime ? (
                          <span className={chip}><Clock size={13} /> {fmtRuntime(s.runtime)}</span>
                        ) : null}
                        {s.ageRating && <span className={chip}>{s.ageRating}</span>}
                      </div>
                      {s.overview && (
                        <p className="text-base leading-5 text-white/90 line-clamp-3 mb-6">{s.overview}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/movies/${s.slug}`}
                          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/85 transition-colors duration-150"
                        >
                          <Info size={17} /> View details
                        </Link>
                        <Link
                          href="/browse"
                          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[15px] hover:bg-white/20 transition-colors duration-150"
                        >
                          <LayoutGrid size={16} /> Browse films
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {slides.length > 1 && (
        <div className="absolute bottom-10 inset-x-0 flex justify-center gap-2" data-testid="hero-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.title}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => api?.scrollTo(i)}
              className={
                "h-1.5 rounded-full transition-all duration-300 ease-out " +
                (i === current ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70")
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
