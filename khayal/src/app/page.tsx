import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center gap-8">
      {/* Wordmark */}
      <div className="flex flex-col items-center gap-2">
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(4rem, 12vw, 9rem)",
            color: "var(--cream)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          KHAYAL
        </h1>
        <p
          className="font-arabic"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            color: "var(--cream-muted)",
            letterSpacing: "0.05em",
          }}
        >
          خيال
        </p>
      </div>

      {/* Tagline */}
      <p
        className="font-display"
        style={{
          fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
          color: "var(--cream-muted)",
          fontStyle: "italic",
          maxWidth: "32ch",
        }}
      >
        A library of imagination.
      </p>

      {/* CTAs */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <Link
          href="/browse"
          className="landing-cta-primary"
          style={{
            background: "var(--accent)",
            color: "var(--ink)",
            padding: "0.75rem 2rem",
            borderRadius: "0.375rem",
            fontWeight: 600,
            fontSize: "1rem",
            letterSpacing: "0.01em",
            textDecoration: "none",
          }}
        >
          Browse Films
        </Link>
        <Link
          href="/search"
          className="landing-cta-ghost"
          style={{
            background: "transparent",
            color: "var(--cream)",
            padding: "0.75rem 2rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--taupe)",
            fontSize: "1rem",
            letterSpacing: "0.01em",
            textDecoration: "none",
          }}
        >
          Search
        </Link>
      </div>
    </main>
  );
}
