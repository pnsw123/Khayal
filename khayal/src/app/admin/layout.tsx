import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata = { title: "Admin — KHAYAL" };
export const revalidate = 0;

const NAV = [
  { href: "/admin",          label: "Dashboard" },
  { href: "/admin/content",  label: "Content" },
  { href: "/admin/users",    label: "Users" },
  { href: "/admin/reviews",  label: "Reviews" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");

  const sb = await supabaseServer();
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
          <Link href="/" className="text-amber-400 font-bold tracking-wide">KHAYAL</Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 text-sm font-medium">Admin</span>
          <nav className="flex gap-1 ml-4">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
