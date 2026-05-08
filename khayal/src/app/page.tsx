import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTrending, getNowPlaying, getUpcoming } from "@/lib/shelves";
import { Shelf } from "@/components/shelf";

export const revalidate = 300;

function ShelfSkeleton() {
  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <div className="h-6 w-48 rounded bg-[var(--ink-lift)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--ink-lift)] animate-pulse" />
      </div>
      <div className="flex gap-4 md:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-[150px] md:w-[170px] shrink-0">
            <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
            <div className="mt-2.5 space-y-1.5">
              <div className="h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function HomeShelves() {
  const [trending, nowPlaying, upcoming] = await Promise.all([
    getTrending(),
    getNowPlaying(),
    getUpcoming(),
  ]);

  return (
    <>
      <section data-testid="trending-shelf">
        {trending.length === 0 ? (
          <div className="mb-14">
            <h2 className="font-display text-xl md:text-2xl text-[var(--cream)] mb-4">Trending</h2>
            <p className="text-sm text-[var(--cream-muted)]">No trending titles right now.</p>
          </div>
        ) : (
          <Shelf
            title="Trending"
            kicker="الأكثر تقييماً"
            items={trending}
            viewAllHref="/browse"
          />
        )}
      </section>

      <section data-testid="now-playing-shelf">
        {nowPlaying.length === 0 ? (
          <div className="mb-14">
            <h2 className="font-display text-xl md:text-2xl text-[var(--cream)] mb-4">Now Playing</h2>
            <p className="text-sm text-[var(--cream-muted)]">No new releases right now.</p>
          </div>
        ) : (
          <Shelf
            title="Now Playing"
            kicker="يُعرض الآن"
            items={nowPlaying}
            viewAllHref="/browse"
          />
        )}
      </section>

      <section data-testid="upcoming-shelf">
        {upcoming.length === 0 ? (
          <div className="mb-14">
            <h2 className="font-display text-xl md:text-2xl text-[var(--cream)] mb-4">Upcoming</h2>
            <p className="text-sm text-[var(--cream-muted)]">No upcoming titles scheduled.</p>
          </div>
        ) : (
          <Shelf
            title="Upcoming"
            kicker="قريبًا"
            items={upcoming}
            viewAllHref="/browse"
          />
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-12">
      <div className="mb-12">
        <h1 className="font-display text-3xl md:text-5xl text-[var(--cream)] mb-3">
          KHAYAL <span className="font-arabic text-[var(--saffron)]">خيال</span>
        </h1>
        <p className="text-sm text-[var(--cream-muted)] font-mono tracking-wide">
          A library of imagination.{" "}
          <Link href="/browse" className="inline-flex items-center gap-1 text-[var(--saffron)] hover:underline">
            Browse all films <ArrowRight size={12} />
          </Link>
        </p>
      </div>

      <Suspense fallback={<><ShelfSkeleton /><ShelfSkeleton /><ShelfSkeleton /></>}>
        <HomeShelves />
      </Suspense>
    </div>
  );
}
