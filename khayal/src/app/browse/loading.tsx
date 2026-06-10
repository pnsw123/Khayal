export default function BrowseLoading() {
  return (
    <div className="min-h-screen" aria-hidden>
      {/* Filter bar placeholder */}
      <div className="bg-[var(--ink)]">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-2.5 flex items-center gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-md bg-[var(--ink-lift)] animate-pulse" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
        {/* Title block */}
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-[var(--ink-lift)] animate-pulse" />
        </div>

        {/* Three shelf rows */}
        {Array.from({ length: 3 }).map((_, row) => (
          <section key={row} className="mb-10">
            <div className="mb-4 flex items-baseline gap-3">
              <div className="h-6 w-40 rounded bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-4 w-20 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
            <div className="flex gap-3 overflow-x-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px]">
                  <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-[var(--ink-lift)] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
