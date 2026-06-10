export default function MovieDetailLoading() {
  return (
    <div className="min-h-screen" aria-hidden>
      {/* Hero section */}
      <div className="relative w-full">
        {/* Ambient backdrop placeholder */}
        <div className="absolute inset-0 h-[420px] bg-[var(--ink-lift)] animate-pulse opacity-30" />

        <div className="relative mx-auto max-w-[1400px] px-4 md:px-8 pt-10 pb-12">
          <div className="flex flex-col md:flex-row gap-8 md:gap-10">
            {/* Poster placeholder */}
            <div className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px]">
              <div className="aspect-[2/3] w-full rounded-lg bg-[var(--ink-lift)] animate-pulse" />
            </div>

            {/* Meta block */}
            <div className="flex-1 min-w-0 pt-2 space-y-4">
              {/* Title */}
              <div className="h-10 w-3/4 rounded bg-[var(--ink-lift)] animate-pulse" />
              {/* Year + runtime + rating row */}
              <div className="flex gap-3">
                <div className="h-5 w-12 rounded bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-5 w-16 rounded bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-5 w-10 rounded bg-[var(--ink-lift)] animate-pulse" />
              </div>
              {/* Genre chips */}
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 w-20 rounded-full bg-[var(--ink-lift)] animate-pulse" />
                ))}
              </div>
              {/* Overview lines */}
              <div className="space-y-2 max-w-prose">
                <div className="h-3.5 w-full rounded bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-3.5 w-11/12 rounded bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-3.5 w-2/3 rounded bg-[var(--ink-lift)] animate-pulse" />
              </div>
              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <div className="h-10 w-32 rounded-md bg-[var(--ink-lift)] animate-pulse" />
                <div className="h-10 w-28 rounded-md bg-[var(--ink-lift)] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast row placeholder */}
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8">
        <div className="h-6 w-24 rounded bg-[var(--ink-lift)] animate-pulse mb-4" />
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[80px] space-y-2">
              <div className="w-16 h-16 rounded-full bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-3 w-full rounded bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-2.5 w-3/4 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Similar titles placeholder */}
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 pb-12">
        <div className="h-6 w-36 rounded bg-[var(--ink-lift)] animate-pulse mb-4" />
        <div className="flex gap-3 overflow-x-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px]">
              <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
              <div className="mt-2 h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
