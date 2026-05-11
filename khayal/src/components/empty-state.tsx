interface EmptyStateProps {
  title: string;
  subtitle?: string;
  arabicLabel?: string;
}
export function EmptyState({ title, subtitle, arabicLabel }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      {arabicLabel && (
        <p className="font-arabic text-2xl text-[var(--cream-muted)]/40 mb-3">{arabicLabel}</p>
      )}
      <p className="font-display italic text-xl text-[var(--cream)]/60">{title}</p>
      {subtitle && (
        <p className="mt-2 font-sans text-sm text-[var(--cream-muted)]">{subtitle}</p>
      )}
    </div>
  );
}
