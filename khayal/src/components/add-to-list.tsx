"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ListPlus, Plus, LoaderCircle, Heart, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export interface UserList {
  id: number;
  name: string;
  is_favorites: boolean;
  is_public: boolean;
  member: boolean; // true if this target is already in this list
}

export interface AddToListButtonProps {
  userId: string | null;
  kind: "movie" | "tv_series";
  targetId: number;
  slug: string;
  /** The user's lists, server-fetched. Membership is pre-computed. */
  initialLists: UserList[];
}

/**
 * Add-to-list control. Dropdown with checkboxes for each of the user's lists
 * plus an inline "Create a new list" input. Favorites list is auto-created
 * and always present. Toggling checks upserts or deletes the bridge row.
 */
export function AddToListButton({ userId, kind, targetId, slug, initialLists }: AddToListButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<UserList[]>(initialLists);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!userId) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(kind === "movie" ? `/movies/${slug}` : `/tv/${slug}`)}`}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-md border border-[var(--taupe)]/30 text-[var(--cream)] text-sm hover:border-[var(--saffron)]/50 transition-colors"
      >
        <ListPlus size={14} /> Sign in to save
      </Link>
    );
  }

  const bridgeTable = kind === "movie" ? "user_list_movies" : "user_list_tv_series";
  const idField = kind === "movie" ? "movie_id" : "tv_series_id";

  const toggle = (list: UserList) => {
    setErr(null);
    // optimistic
    setLists((ls) => ls.map((l) => (l.id === list.id ? { ...l, member: !l.member } : l)));
    start(async () => {
      const sb = supabaseBrowser();
      if (list.member) {
        const { error } = await sb.from(bridgeTable)
          .delete()
          .eq("list_id", list.id)
          .eq(idField, targetId);
        if (error) { setErr(error.message); return; }
      } else {
        const { error } = await sb.from(bridgeTable)
          .upsert({ list_id: list.id, [idField]: targetId });
        if (error) { setErr(error.message); return; }
      }
      router.refresh();
    });
  };

  const createList = () => {
    const name = newName.trim();
    if (!name) return;
    setErr(null);
    start(async () => {
      const sb = supabaseBrowser();
      const { data, error } = await sb
        .from("user_lists")
        .insert({ user_id: userId, name, is_public: false, is_favorites: false })
        .select("id, name, is_favorites, is_public")
        .single();
      if (error) { setErr(error.message); return; }
      // Add the new list + immediately put the current title in it
      const newList: UserList = { ...data, member: false };
      setLists((ls) => [...ls, newList]);
      setNewName("");
      setCreating(false);
      toggle(newList);
    });
  };

  const inSomeList = lists.some((l) => l.member);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 h-11 px-4 rounded-md text-sm transition-colors",
          inSomeList
            ? "bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--cream)]"
            : "border border-[var(--taupe)]/30 text-[var(--cream)] hover:border-[var(--accent)]/50",
        )}
      >
        {inSomeList ? <Check size={14} /> : <ListPlus size={14} />}
        {inSomeList ? "In your lists" : "Add to list"}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-md bg-[var(--ink-lift)] border border-[var(--taupe)]/30 shadow-2xl z-50 overflow-hidden">
          <div className="p-2 max-h-72 overflow-y-auto">
            {lists.length === 0 && !creating && (
              <p className="p-3 text-xs text-[var(--cream-muted)]">No lists yet. Create one below.</p>
            )}
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => toggle(l)}
                disabled={pending}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left text-[var(--cream)] hover:bg-[var(--ink-high)] transition-colors"
              >
                <span className={cn(
                  "flex h-4 w-4 shrink-0 rounded-md border items-center justify-center",
                  l.member
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--ink)]"
                    : "border-[var(--taupe)]/50",
                )}>
                  {l.member && <Check size={11} strokeWidth={3} />}
                </span>
                {l.is_favorites && <Heart size={12} className="text-[var(--saffron)] fill-[var(--saffron)]" />}
                <span className="flex-1 truncate">{l.name}</span>
                {l.is_public && (
                  <span className="text-[9px] font-mono tracking-wider uppercase text-[var(--cream-muted)]">public</span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--taupe)]/20 p-2">
            {creating ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createList(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
                  placeholder="New list name…"
                  className="flex-1 h-9 px-3 rounded-md text-sm bg-[var(--ink)] border border-[var(--taupe)]/25 text-[var(--cream)] focus-visible:outline-none focus:border-[var(--accent)]/60"
                />
                <button
                  onClick={createList}
                  disabled={pending || !newName.trim()}
                  className="h-9 px-3 rounded-md text-xs font-medium bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--cream)] disabled:opacity-50"
                >
                  {pending ? <LoaderCircle size={12} className="animate-spin" /> : "Create"}
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(""); }}
                  className="h-9 w-9 grid place-items-center rounded-md text-[var(--cream-muted)] hover:text-[var(--cream)]"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs tracking-wider uppercase font-mono text-[var(--saffron)] hover:bg-[var(--ink-high)] transition-colors"
              >
                <Plus size={12} /> New list
              </button>
            )}
          </div>
          {err && (
            <div className="px-3 py-2 text-[11px] text-[var(--danger)] bg-[var(--danger)]/10 border-t border-[var(--danger)]/30">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
