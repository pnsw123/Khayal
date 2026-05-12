import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { NavGuard } from "@/components/nav-guard";
import { currentUser } from "@/lib/auth";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", style: ["normal","italic"] });
const dmSans   = DM_Sans({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbm      = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbm", display: "swap" });
const reem     = Reem_Kufi({ subsets: ["arabic", "latin"], variable: "--font-reem", display: "swap", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "KHAYAL · خيال",
  description: "A library of imagination. Every film and series, indexed.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`h-full antialiased ${playfair.variable} ${dmSans.variable} ${jbm.variable} ${reem.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--ink)] text-[var(--cream)]">
        <NavGuard><Nav /></NavGuard>
        <main className="flex-1">{children}</main>
        <NavGuard><footer className="border-t border-[var(--taupe)]/15 mt-16">
          <div className="mx-auto max-w-[1600px] px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="font-display text-lg text-[var(--cream)]">KHAYAL <span className="font-arabic text-[var(--saffron)]">خيال</span></p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[var(--cream-muted)] font-mono tracking-wide">
              <a href="/browse" className="hover:text-[var(--saffron)] transition-colors">Browse</a>
              <a href="/search" className="hover:text-[var(--saffron)] transition-colors">Search</a>
              {user
                ? <a href="/profile" className="hover:text-[var(--saffron)] transition-colors">Profile</a>
                : <a href="/login"   className="hover:text-[var(--saffron)] transition-colors">Sign In</a>
              }
            </div>
            <p className="text-xs text-[var(--cream-muted)]/50 font-mono">
              Data from <a href="https://www.themoviedb.org" className="hover:text-[var(--saffron)] transition-colors">TMDB</a>
              {" · "}© {new Date().getFullYear()} KHAYAL
            </p>
          </div>
        </footer></NavGuard>
      </body>
    </html>
  );
}
