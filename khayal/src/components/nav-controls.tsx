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
        "inline-flex items-center gap-2 h-9 px-4",
        "text-[11px] font-mono tracking-[0.2em] uppercase font-semibold",
        "text-[var(--ink)] bg-[var(--accent)] rounded-md",
        "hover:bg-[var(--cream)] transition-colors duration-200",
        className,
      )}
    >
      Sign In
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
      className="group relative inline-flex items-center justify-center h-9 w-9 rounded-md bg-[var(--ink-high)] text-[var(--cream)] font-display text-sm hover:bg-[var(--taupe)] transition-colors
        "
    >
      {initial}
    </Link>
  );
}
