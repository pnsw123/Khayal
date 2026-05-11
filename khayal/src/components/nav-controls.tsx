"use client";

import Link from "next/link";
import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "yazeedjunk@gmail.com";

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

export function ProfileStub({
  initial,
  email,
  username,
  avatarUrl,
}: {
  initial: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const isAdmin = email === ADMIN_EMAIL;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function signOut() {
    start(async () => {
      await supabaseBrowser().auth.signOut();
      router.push("/browse");
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative ml-2">
      {/* Avatar */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full select-none",
          "bg-[var(--ink-high)] text-[var(--cream)]",
          "font-display text-sm",
          "ring-1 ring-[var(--taupe)]/40 hover:ring-[var(--accent)]/60",
          "transition-all duration-200",
          open && "ring-[var(--accent)]/80",
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initial} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2.5 w-56 z-50
            bg-[var(--ink-lift)] border border-[var(--taupe)]/20
            rounded-lg shadow-2xl shadow-black/80"
        >
          {/* Signed in as */}
          <div className="px-4 pt-3 pb-3 border-b border-[var(--taupe)]/15">
            <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--cream-muted)]/50 mb-1">
              Signed in as
            </p>
            <p className="font-sans text-[13px] text-[var(--cream-muted)] truncate leading-snug">
              {email}
            </p>
          </div>

          {/* Links */}
          <div className="py-1.5">
            {username && (
              <Link
                href={`/users/${username}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 font-sans text-[13px] text-[var(--cream-muted)]
                  hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
              >
                Public profile
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-sans text-[13px] text-[var(--cream-muted)]
                hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
            >
              My profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 font-sans text-[13px] text-[var(--rose)]
                  hover:text-[var(--rose-bright)] hover:bg-[var(--taupe)]/10 transition-colors"
              >
                Admin panel
              </Link>
            )}
          </div>

          <div className="border-t border-[var(--taupe)]/15 py-1.5">
            <button
              onClick={signOut}
              disabled={pending}
              className="w-full text-left px-4 py-2.5 font-sans text-[13px] text-[var(--cream-muted)]
                hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors
                disabled:opacity-40"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
