interface ReviewCardProps {
  headline?: string | null;
  body: string;
  createdAt: string;
  authorInitial: string;
  authorName: string;
  containsSpoiler?: boolean;
}

export function ReviewCard({
  headline,
  body,
  createdAt,
  authorInitial,
  authorName,
  containsSpoiler = false,
}: ReviewCardProps) {
  return (
    <article className="p-5 rounded-md bg-[var(--ink-lift)] border border-[var(--ink-high)] hover:border-[var(--taupe)]/50 transition-colors">
      <header className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-[var(--ink-high)] text-[var(--cream)] grid place-items-center font-display text-sm font-bold shrink-0">
          {authorInitial}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--cream)]">{authorName}</p>
          <p className="font-mono text-[10px] tracking-wider text-[var(--cream-muted)]">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>
      {headline && (
        <h3 className="font-display text-lg text-[var(--cream)] mb-2">{headline}</h3>
      )}
      {containsSpoiler ? (
        <details className="text-sm text-[var(--cream-muted)]">
          <summary className="cursor-pointer text-[var(--accent-dim)] hover:text-[var(--cream)]">
            Contains spoilers — click to reveal
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{body}</p>
        </details>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--cream)]/80 whitespace-pre-wrap line-clamp-6">
          {body}
        </p>
      )}
    </article>
  );
}
