"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  if (!client) client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON);
  return client;
}
