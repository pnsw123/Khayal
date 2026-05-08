interface Stat {
  label: string;
  value: number;
}

interface ProfileStatsProps {
  ratings: number;
  reviews: number;
  lists: number;
}

export function ProfileStats({ ratings, reviews, lists }: ProfileStatsProps) {
  const stats: Stat[] = [
    { label: "Ratings", value: ratings },
    { label: "Reviews", value: reviews },
    { label: "Lists", value: lists },
  ];

  return (
    <div data-testid="profile-stats" className="flex gap-10 mb-14">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="font-display text-4xl text-[var(--saffron)]">{s.value}</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
