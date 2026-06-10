export default function SearchLoading() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-12" aria-hidden>
      {/* Kicker line */}
      <div className="h-3 w-16 rounded bg-[var(--ink-lift)] animate-pulse mb-3" />
      {/* Title */}
      <div className="h-14 w-2/3 rounded bg-[var(--ink-lift)] animate-pulse mb-10" />

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-[var(--taupe)]/15 mb-8">
        <div className="h-9 w-20 rounded-t-md bg-[var(--ink-lift)] animate-pulse" />
        <div className="h-9 w-20 rounded-t-md bg-[var(--ink-lift)] animate-pulse opacity-50" />
      </div>

      {/* Search input placeholder */}
      <div className="h-12 w-full max-w-2xl rounded-lg bg-[var(--ink-lift)] animate-pulse mb-8" />

      {/* Saved query chips */}
      <div className="flex gap-2 flex-wrap mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 rounded-full bg-[var(--ink-lift)] animate-pulse" />
        ))}
      </div>

      {/* Result grid placeholder */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
            <div className="mt-2 space-y-1.5">
              <div className="h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
