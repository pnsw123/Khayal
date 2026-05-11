"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowUpRight, Shield, LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "yazeedjunk@gmail.com";

interface Props {
  email: string;
  username?: string | null;
}

export function ProfileDropdown({ email, username }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const isAdmin = email === ADMIN_EMAIL;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function signOut() {
    start(async () => {
      await supabaseBrowser().auth.signOut();
      router.push("/browse");
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-4 font-mono text-[11px] tracking-[0.18em] uppercase
          text-[var(--cream-muted)] border border-[var(--taupe)]/25
          hover:text-[var(--cream)] hover:border-[var(--saffron)]/50 transition-colors rounded-sm"
      >
        Menu
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 z-50 py-1
          bg-[var(--ink-lift)] border border-[var(--taupe)]/20 rounded-md shadow-2xl shadow-black/60"
        >
          {username && (
            <Link
              href={`/users/${username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-mono tracking-[0.18em] uppercase
                text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors"
            >
              <ArrowUpRight size={11} />
              Public profile
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-mono tracking-[0.18em] uppercase
                text-[var(--saffron)] hover:text-[var(--saffron-glow)] hover:bg-[var(--taupe)]/10 transition-colors"
            >
              <Shield size={11} />
              Admin
            </Link>
          )}

          <div className="my-1 border-t border-[var(--taupe)]/15" />

          <button
            onClick={signOut}
            disabled={pending}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-mono tracking-[0.18em] uppercase
              text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--taupe)]/10 transition-colors
              disabled:opacity-40"
          >
            <LogOut size={11} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
