import Link from "next/link";
import { currentUser, currentProfile } from "@/lib/auth";
import { NavLink } from "./nav-link";
import { TicketEnter, ProfileStub } from "./nav-controls";
import { NavSearch } from "./nav-search";
import { Clapperboard } from "lucide-react";

/**
 * Index-style nav. Single compact row, no decorative microbar, no bulb
 * strip. A thin saffron hairline under for subtle brand continuity — not
 * a marquee. Inline NavSearch replaces the static /search link.
 */
export async function Nav() {
  const user = await currentUser();
  const profile = user ? await currentProfile() : null;

  const links = [
    { href: "/browse", label: "Films" },
  ];

  const initial =
    (profile?.display_name || profile?.username || user?.email || "?")
      .charAt(0)
      .toUpperCase();

  return (
    <header className="sticky top-0 z-20 backdrop-blur-sm bg-[var(--ink)]/80">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          {/* Icon mark */}
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--ink-high)] text-[var(--accent)] group-hover:bg-[var(--taupe)] transition-colors">
            <Clapperboard size={16} strokeWidth={2.5} />
          </span>
          {/* Wordmark */}
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[1.2rem] leading-none tracking-[0.08em] text-[var(--cream)] group-hover:text-[var(--accent)] transition-colors">
              KHAYAL
            </span>
            <span className="font-arabic text-lg leading-none text-[var(--cream-muted)] group-hover:text-[var(--accent-dim)] transition-colors" dir="rtl">
              خيال
            </span>
          </span>
        </Link>

        {/* Static nav links */}
        <nav className="flex items-center shrink-0">
          {links.map((l) => <NavLink key={l.href} href={l.href} label={l.label} />)}
        </nav>

        {/* Inline search dropdown — replaces the static /search nav link */}
        <NavSearch />

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {user ? (
            <ProfileStub
              initial={initial}
              email={user.email ?? ""}
              username={profile?.username}
              avatarUrl={profile?.avatar_url}
            />
          ) : (
            <TicketEnter className="ml-2 md:ml-3" />
          )}
        </div>
      </div>
    </header>
  );
}
