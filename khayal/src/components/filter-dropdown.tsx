"use client";

import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  label: string;
  items: readonly { code: string; label: string }[];
  activeCode: string;
  paramKey: string;
  searchParams: URLSearchParams;
}

export function FilterDropdown({ label, items, activeCode, paramKey, searchParams }: FilterDropdownProps) {
  const router = useRouter();
  const active = items.find((i) => i.code === activeCode);
  const isFiltered = !!activeCode;

  const navigate = (code: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (!code) next.delete(paramKey);
    else next.set(paramKey, code);
    const q = next.toString();
    router.push(q ? `/browse?${q}` : "/browse", { scroll: false });
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded text-[11px] font-mono tracking-[0.08em] uppercase transition-colors",
            isFiltered
              ? "bg-[var(--accent)]/12 text-[var(--accent)] border border-[var(--accent)]/25"
              : "text-[var(--cream-muted)] border border-[var(--taupe)]/20 hover:border-[var(--taupe)]/50 hover:text-[var(--cream)]"
          )}
        >
          {isFiltered ? active?.label ?? label : label}
          <ChevronDown size={11} className="opacity-60" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[180px] max-h-[320px] overflow-y-auto rounded-md bg-[var(--ink-lift)] border border-[var(--taupe)]/20 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.6)] py-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => {
            const selected = activeCode === item.code;
            return (
              <button
                key={item.code}
                onClick={() => navigate(item.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-[12px] font-mono tracking-wide text-left transition-colors",
                  selected
                    ? "text-[var(--accent)] bg-[var(--accent)]/8"
                    : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--ink-high)]"
                )}
              >
                {item.label}
                {selected && <Check size={11} className="shrink-0" />}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
