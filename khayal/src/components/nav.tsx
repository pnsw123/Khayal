import Link from "next/link";
import { currentUser, currentProfile } from "@/lib/auth";
import { NavLink, TabLink } from "./nav-link";
import { TicketEnter, ProfileStub } from "./nav-controls";
import { NavSearch } from "./nav-search";
import { Clapperboard, Home, Film, Search, UserRound } from "lucide-react";

/**
 * Floating glass pill, centred over the page. The header row itself is
 * transparent and click-through, so content scrolls under the pill.
 * Phones get a second glass pill docked at the bottom as a tab bar.
 */
export async function Nav() {
  const user = await currentUser();
  const profile = user ? await currentProfile() : null;

  const links = [
    { href: "/", label: "Home", exact: true },
    { href: "/browse", label: "Films" },
    { href: "/search", label: "Search" },
  ];

  const initial =
    (profile?.display_name || profile?.username || user?.email || "?")
      .charAt(0)
      .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 h-20 pointer-events-none">
        <div className="mx-auto max-w-[1600px] h-full px-3 md:px-6 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-1 h-12 pl-1.5 pr-1.5 rounded-[20px] bg-black/30 backdrop-blur-sm md:backdrop-blur-xl border border-[var(--glass-line)] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08),0_4px_16px_rgb(0_0_0/0.25),0_8px_24px_rgb(0_0_0/0.2)]">
            <Link
              href="/"
              aria-label="KHAYAL home"
              className="group flex items-center gap-2 shrink-0 h-9 pl-1 pr-2 rounded-full hover:bg-[var(--glass)] transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--saffron)] text-white">
                <Clapperboard size={14} strokeWidth={2.5} />
              </span>
              <span className="hidden md:flex items-baseline gap-1.5">
                <span className="font-display text-[15px] leading-none tracking-[0.06em] text-[var(--cream)]">
                  KHAYAL
                </span>
                <span className="font-arabic text-base leading-none text-[var(--cream-muted)]" dir="rtl">
                  خيال
                </span>
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-0.5 shrink-0">
              {links.map((l) => <NavLink key={l.href} href={l.href} label={l.label} exact={l.exact} />)}
            </nav>

            {/* Inline search dropdown */}
            <div className="w-40 sm:w-44 lg:w-60">
              <NavSearch />
            </div>

            <div className="flex items-center shrink-0">
              {user ? (
                <ProfileStub
                  initial={initial}
                  email={user.email ?? ""}
                  username={profile?.username}
                  avatarUrl={profile?.avatar_url}
                />
              ) : (
                <TicketEnter className="ml-1" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Phone tab bar */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed bottom-3 inset-x-3 z-40 flex items-center justify-around h-16 rounded-[22px] bg-black/50 backdrop-blur-xl border border-[var(--glass-line)] shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
      >
        <TabLink href="/" label="Home" exact icon={<Home size={19} />} />
        <TabLink href="/browse" label="Films" icon={<Film size={19} />} />
        <TabLink href="/search" label="Search" icon={<Search size={19} />} />
        <TabLink
          href={user ? "/profile" : "/login"}
          label={user ? "Profile" : "Sign in"}
          icon={<UserRound size={19} />}
        />
      </nav>
    </>
  );
}
