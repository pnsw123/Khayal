import type { Metadata } from "next";
import { Geist, Geist_Mono, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { currentUser } from "@/lib/auth";

const geist    = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const reem     = Reem_Kufi({ subsets: ["arabic", "latin"], variable: "--font-reem", display: "swap", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "KHAYAL · خيال",
  description: "A library of imagination. Every film and series, indexed.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`h-full antialiased ${geist.variable} ${geistMono.variable} ${reem.variable}`}>
      <body className="min-h-full flex flex-col bg-[var(--ink)] text-[var(--cream)] pb-20 sm:pb-0">
        <Nav />
        <main className="flex-1">{children}</main>
        <SiteFooter signedIn={!!user} />
      </body>
    </html>
  );
}
