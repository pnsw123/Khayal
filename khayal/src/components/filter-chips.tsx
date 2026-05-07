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
    <div className={cn("flex gap-1.5", className)}>
      {items.map((it) => {
        const active = activeCode === it.code;
        return (
          <Link
            key={it.label}
            href={buildFilterHref(searchParams, paramKey, it.code)}
            className={cn(
              "inline-flex items-center h-7 px-3 rounded-full text-[11px] font-mono tracking-wide transition-all whitespace-nowrap",
              active
                ? "bg-[var(--saffron)] text-[var(--ink)] font-semibold shadow-[0_0_12px_-2px_var(--saffron)]"
                : "bg-[var(--ink-high)] text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/30"
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
