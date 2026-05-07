"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 md:px-5 py-2 text-[11px] md:text-[13px] tracking-[0.15em] md:tracking-[0.18em] uppercase font-medium transition-colors",
        active ? "text-[var(--saffron)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
      )}
    >
      {label}
      {active && (
        <span className="absolute left-3 right-3 md:left-5 md:right-5 -bottom-[2px] h-[2px] bg-[var(--saffron)] rounded-full" />
      )}
    </Link>
  );
}
