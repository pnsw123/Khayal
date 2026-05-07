"use client";

import { useRef, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Camera } from "lucide-react";

interface Props {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
}

export function AvatarUpload({ userId, avatarUrl, displayName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);

    startTransition(async () => {
      const sb = supabaseBrowser();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await sb.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) { setError("Upload failed"); return; }

      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);

      const { error: updateErr } = await sb
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateErr) setError("Failed to save");
    });
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative group cursor-pointer shrink-0" onClick={() => inputRef.current?.click()}>
      <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[var(--taupe)]/20 group-hover:ring-[var(--saffron)]/50 transition-all">
        {preview ? (
          <img src={preview} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[var(--ink-lift)] flex items-center justify-center font-display text-2xl text-[var(--saffron)]">
            {initials}
          </div>
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {isPending ? (
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Camera size={16} className="text-white" />
        )}
      </div>
      {error && (
        <p className="absolute top-full mt-1 text-[10px] text-red-400 whitespace-nowrap">{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
