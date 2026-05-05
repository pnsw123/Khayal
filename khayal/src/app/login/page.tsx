import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — KHAYAL" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  if (user) redirect(sp.next || "/browse");

  return (
    <div className="relative min-h-[calc(100vh-5rem)] grid place-items-center px-6 py-16">
      {/* Saffron lamp pool — centered behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmax] h-[60vmax] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,196,48,0.14), rgba(244,196,48,0.05) 40%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-arabic text-4xl text-[var(--cream)] mb-1">خيال</h1>
          <h2 className="font-display text-3xl text-[var(--cream)]">Welcome back</h2>
          <p className="mt-3 text-sm text-[var(--cream-muted)]">
            Sign in to rate, review, and build your watchlist.
          </p>
        </div>

        <LoginForm nextPath={sp.next} initialError={sp.error} initialMessage={sp.message} />

        <p className="mt-8 text-center text-xs text-[var(--cream-muted)]">
          No account? Sign-in here also creates one.
        </p>
      </div>
    </div>
  );
}
