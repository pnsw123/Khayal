"use client";

import Link from "next/link";
import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Shield, LogOut } from "lucide-react";
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
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full",
          "bg-[var(--ink-high)] text-[var(--cream)] font-display text-sm",
          "ring-1 ring-[var(--taupe)]/40 hover:ring-[var(--accent)]/60",
          "transition-all duration-200",
          open && "ring-[var(--accent)]/80",
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initial} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="select-none">{initial}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2.5 w-52 z-50 py-1.5
          bg-[var(--ink-lift)] border border-[var(--taupe)]/20
          rounded-lg shadow-2xl shadow-black/70 backdrop-blur-sm">

          {/* Account label */}
          <div className="px-4 pt-1 pb-2.5 border-b border-[var(--taupe)]/15">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--cream-muted)]/60 mb-0.5">Signed in as</p>
            <p className="text-[11px] font-mono text-[var(--cream-muted)] truncate">{email}</p>
          </div>

          <div className="py-1">
            {username && (
              <Link
                href={`/users/${username}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-mono tracking-[0.1em]
                  text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
              >
                <ArrowUpRight size={12} className="shrink-0" />
                Public profile
              </Link>
            )}

            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-mono tracking-[0.1em]
                text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
            >
              <span className="w-3 h-3 shrink-0 rounded-full border border-[var(--cream-muted)]/40" />
              My profile
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-mono tracking-[0.1em]
                  text-[var(--accent)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
              >
                <Shield size={12} className="shrink-0" />
                Admin panel
              </Link>
            )}
          </div>

          <div className="border-t border-[var(--taupe)]/15 pt-1">
            <button
              onClick={signOut}
              disabled={pending}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-mono tracking-[0.1em]
                text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors
                disabled:opacity-40"
            >
              <LogOut size={12} className="shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
