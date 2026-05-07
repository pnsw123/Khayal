import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildFilterHref } from "@/lib/filters";

export interface FilterChipsProps {
  readonly items: readonly { code: string; label: string }[];
  activeCode: string;
  paramKey: string;
  searchParams: URLSearchParams;
  className?: string;
}

/**
 * Row of chip links that set a single query param. Preserves any other
 * active params on the URL. Active chip = saffron fill.
 */
export function FilterChips({ items, activeCode, paramKey, searchParams, className }: FilterChipsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {items.map((it) => {
        const active = activeCode === it.code;
        return (
          <Link
            key={it.label}
            href={buildFilterHref(searchParams, paramKey, it.code)}
            className={cn(
              "inline-flex items-center h-7 px-3 rounded-md text-[10px] font-mono tracking-[0.1em] uppercase whitespace-nowrap transition-colors duration-150",
              active
                ? "bg-[var(--accent)] text-[var(--ink)] font-bold"
                : "bg-transparent text-[var(--cream-muted)] border border-[var(--taupe)]/60 hover:border-[var(--accent-dim)] hover:text-[var(--cream)]"
            )}
            scroll={false}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
