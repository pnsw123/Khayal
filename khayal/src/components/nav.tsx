import Link from "next/link";
import { currentUser, currentProfile } from "@/lib/auth";
import { NavLink } from "./nav-link";
import { TicketEnter, ProfileStub } from "./nav-controls";
import { Clapperboard } from "lucide-react";

/**
 * Index-style nav. Single compact row, no decorative microbar, no bulb
 * strip. A thin saffron hairline under for subtle brand continuity — not
 * a marquee.
 */
export async function Nav() {
  const user = await currentUser();
  const profile = user ? await currentProfile() : null;

  const links = user
    ? [
        { href: "/search",   label: "Search"   },
        { href: "/profile",  label: "Profile"  },
      ]
    : [
        { href: "/search",   label: "Search"   },
      ];

  const initial =
    (profile?.display_name || profile?.username || user?.email || "?")
      .charAt(0)
      .toUpperCase();

  return (
    <header className="relative z-20 border-b border-[var(--taupe)]/15">
      <div className="mx-auto max-w-[1600px] px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          {/* Icon mark */}
          <span className="flex items-center justify-center w-8 h-8 rounded-sm bg-[var(--saffron)] text-[var(--ink)] group-hover:bg-[var(--saffron-glow)] transition-colors">
            <Clapperboard size={16} strokeWidth={2.5} />
          </span>
          {/* Wordmark */}
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[1.2rem] leading-none tracking-[0.08em] text-[var(--cream)] group-hover:text-[var(--saffron)] transition-colors">
              KHAYAL
            </span>
            <span className="font-arabic text-lg leading-none text-[var(--saffron)]/70 group-hover:text-[var(--saffron)] transition-colors" dir="rtl">
              خيال
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="flex items-center">
            {links.map((l) => <NavLink key={l.href} href={l.href} label={l.label} />)}
          </nav>

          {user ? (
            <ProfileStub initial={initial} />
          ) : (
            <TicketEnter className="ml-2 md:ml-3" />
          )}
        </div>
      </div>
    </header>
  );
}
