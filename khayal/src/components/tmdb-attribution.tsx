/**
 * TMDB attribution — required by TMDB API Terms of Service.
 * https://www.themoviedb.org/documentation/api/terms-of-use
 */
export function TmdbAttribution() {
  return (
    <div className="flex flex-col items-end gap-2">
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="This product uses the TMDB API"
        data-testid="tmdb-attribution-link"
      >
        <img
          src="/tmdb-logo.svg"
          alt="TMDB logo"
          width={80}
          height={11}
          className="opacity-60 hover:opacity-100 transition-opacity"
          data-testid="tmdb-logo"
        />
      </a>
      <p
        className="text-xs text-[var(--cream-muted)]/50 font-mono text-right max-w-xs"
        data-testid="tmdb-attribution-text"
      >
        This product uses the TMDB API but is not endorsed or certified by TMDB.
        {" · "}© {new Date().getFullYear()} KHAYAL
      </p>
    </div>
  );
}
