import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marquee search trigger. Looks like a strip of the theater marquee — a
 * thin horizontal panel with saffron filament lines top and bottom, mono
 * lettering, and the ⌘K shortcut integrated into the bar itself.
 */
export function SearchMarquee({ className }: { className?: string }) {
  return (
    <Link
      href="/search"
      className={cn(
        "group relative inline-flex items-center gap-3 h-11 px-4",
        "text-[11px] font-mono tracking-[0.28em] uppercase",
        "text-[var(--cream-muted)] hover:text-[var(--cream)]",
        "transition-colors",
        className,
      )}
    >
      {/* top + bottom saffron filaments */}
      <span
        aria-hidden
        className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--saffron)]/50 to-transparent group-hover:via-[var(--saffron)] transition-colors duration-300"
      />
      <span
        aria-hidden
        className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--saffron)]/50 to-transparent group-hover:via-[var(--saffron)] transition-colors duration-300"
      />
      {/* aperture glyph — six-blade iris, no lucide */}
      <svg width="14" height="14" viewBox="0 0 16 16" className="text-[var(--saffron)]/80 group-hover:text-[var(--saffron)] transition-colors" fill="currentColor">
        <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="8" cy="8" r="2.25" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M8 1 L10 6 L8 8 Z M15 8 L10 10 L8 8 Z M8 15 L6 10 L8 8 Z M1 8 L6 6 L8 8 Z" opacity="0.6" />
      </svg>
      <span className="hidden md:inline">Search</span>
      <span className="hidden md:inline h-3 w-px bg-[var(--taupe)]/30" />
      <span className="hidden md:inline text-[10px] tracking-wider text-[var(--cream-muted)]/70 group-hover:text-[var(--saffron)]">⌘ K</span>
    </Link>
  );
}

/**
 * Ticket-stub "ENTER" button. Corner notches, dashed vertical edges
 * (like a perforated ticket), pulsing saffron filament underneath.
 */
export function TicketEnter({ className }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={cn(
        "group relative inline-flex items-center gap-2 md:gap-3 h-10 md:h-11 px-3 md:pl-4 md:pr-5",
        "text-[10px] md:text-[11px] font-mono tracking-[0.15em] md:tracking-[0.32em] uppercase",
        "text-[var(--ink)] bg-[var(--saffron)]",
        "transition-all duration-300",
        "hover:bg-[var(--saffron-glow)]",
        "[clip-path:polygon(8px_0,calc(100%-8px)_0,100%_8px,100%_calc(100%-8px),calc(100%-8px)_100%,8px_100%,0_calc(100%-8px),0_8px)]",
        className,
      )}
    >
      <span className="font-semibold">Enter</span>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="hidden sm:block text-[var(--ink)] group-hover:translate-x-0.5 transition-transform">
        <path d="M3 8 H13 M9 4 L13 8 L9 12" />
      </svg>
    </Link>
  );
}

/**
 * Profile initial — embedded in a ticket-corner frame instead of a plain
 * circle. Keeps the cinematic aesthetic for the logged-in state.
 */
export function ProfileStub({ initial }: { initial: string }) {
  return (
    <Link
      href="/profile"
      aria-label="Profile"
      className="group relative inline-flex items-center justify-center h-11 w-11 bg-[var(--saffron)] text-[var(--ink)] font-display text-base hover:bg-[var(--saffron-glow)] transition-colors
        [clip-path:polygon(8px_0,calc(100%-8px)_0,100%_8px,100%_calc(100%-8px),calc(100%-8px)_100%,8px_100%,0_calc(100%-8px),0_8px)]"
    >
      {initial}
    </Link>
  );
}
