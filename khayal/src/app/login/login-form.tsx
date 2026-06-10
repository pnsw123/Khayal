"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Mail, Lock, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm({
  nextPath,
  initialError,
  initialMessage,
}: {
  nextPath?: string;
  initialError?: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(initialMessage ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const sb = supabaseBrowser();

    startTransition(async () => {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        router.push(nextPath || "/browse");
        router.refresh();
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) { setError(error.message); return; }
        // When email confirmation is disabled, signUp returns an active session
        // — sign the user straight in instead of telling them to check email.
        if (data.session) {
          router.push(nextPath || "/browse");
          router.refresh();
          return;
        }
        setInfo("Account created. Check your email — click the link to confirm.");
        setMode("signin");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email */}
      <label className="block">
        <span className="block font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)] mb-2">
          Email
        </span>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cream-muted)]" />
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cinema.com"
            className={cn(
              "w-full h-11 pl-10 pr-3 rounded-md text-sm",
              "bg-[var(--ink-lift)] border border-[var(--taupe)]/25",
              "text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60",
              "focus-visible:outline-none focus:border-[var(--accent)]/60 focus:bg-[var(--ink-high)]",
              "transition-colors"
            )}
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="block font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)] mb-2">
          Password
        </span>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cream-muted)]" />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            className={cn(
              "w-full h-11 pl-10 pr-3 rounded-md text-sm",
              "bg-[var(--ink-lift)] border border-[var(--taupe)]/25",
              "text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60",
              "focus-visible:outline-none focus:border-[var(--accent)]/60 focus:bg-[var(--ink-high)]",
              "transition-colors"
            )}
          />
        </div>
      </label>

      {/* Feedback */}
      {error && (
        <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="text-sm text-[var(--cream)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-md px-3 py-2">
          {info}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full h-11 rounded-md text-sm font-medium tracking-wide",
          "bg-[var(--accent)] text-[var(--ink)]",
          "hover:bg-[var(--cream)]",
          "shadow-[0_0_18px_-6px_var(--accent)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "inline-flex items-center justify-center gap-2",
          "transition-colors"
        )}
      >
        {pending && <LoaderCircle size={14} className="animate-spin" />}
        {mode === "signin" ? "Sign in" : "Create account"}
      </button>

      {/* Mode toggle */}
      <div className="text-center text-xs text-[var(--cream-muted)] pt-2">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
              className="text-[var(--accent-dim)] hover:text-[var(--cream)] underline-offset-2 hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have one?{" "}
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
              className="text-[var(--accent-dim)] hover:text-[var(--cream)] underline-offset-2 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  );
}
