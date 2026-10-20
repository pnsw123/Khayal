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
            "shrink-0 inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-[14px] text-sm whitespace-nowrap border transition-colors duration-150",
            isFiltered
              ? "bg-[var(--saffron)]/20 text-white border-[var(--saffron)]/50"
              : "bg-[var(--glass)] text-[var(--cream)] border-[var(--glass-line)] hover:bg-[var(--glass-strong)]"
          )}
        >
          {isFiltered ? active?.label ?? label : label}
          <ChevronDown size={14} className="opacity-60" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[200px] max-h-[340px] overflow-y-auto rounded-2xl bg-[var(--ink-lift)]/95 backdrop-blur-xl border border-[var(--glass-line)] shadow-[0_12px_40px_-8px_rgb(0_0_0/0.8)] p-1.5 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => {
            const selected = activeCode === item.code;
            return (
              <button
                key={item.code}
                onClick={() => navigate(item.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors duration-150",
                  selected
                    ? "text-white bg-[var(--saffron)]/20"
                    : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--glass)]"
                )}
              >
                {item.label}
                {selected && <Check size={14} className="shrink-0 text-[var(--saffron-glow)]" />}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
