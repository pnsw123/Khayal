import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-[70vh] grid place-items-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(closest-side at 50% 40%, rgba(184,180,204,0.12), transparent 60%)",
        }}
      />
      <div className="relative text-center">
        <p className="font-arabic text-5xl text-[var(--cream-muted)] mb-3">هذا الخيال ضاع</p>
        <h1 className="font-display text-5xl md:text-6xl text-[var(--cream)] mb-3">
          This fantasy got lost.
        </h1>
        <p className="text-sm text-[var(--cream-muted)] max-w-sm mx-auto mb-8">
          The reel you were looking for isn't in the catalog.
          Someone may have rewound too far.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-sm bg-[var(--accent)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--cream)] transition-colors"
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
