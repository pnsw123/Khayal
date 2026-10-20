"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function useActive(href: string, exact?: boolean) {
  const pathname = usePathname();
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** Text link inside the glass pill; the active one sits on a soft capsule. */
export function NavLink({ href, label, exact }: { href: string; label: string; exact?: boolean }) {
  const active = useActive(href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "h-9 px-3 inline-flex items-center rounded-full text-[15px] transition-colors duration-150",
        active
          ? "text-[var(--cream)] bg-[var(--glass-strong)]"
          : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--glass)]"
      )}
    >
      {label}
    </Link>
  );
}

/** Icon-over-label item for the phone tab bar; the active one turns violet. */
export function TabLink({
  href, label, icon, exact,
}: { href: string; label: string; icon: React.ReactNode; exact?: boolean }) {
  const active = useActive(href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl text-[11px] transition-colors duration-150",
        active ? "text-[var(--saffron-glow)] bg-[var(--glass)]" : "text-[var(--cream-muted)]"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
