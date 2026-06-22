import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile } from "@/lib/concerts";
import { useUpdateUsername, USERNAME_RE } from "@/lib/friends";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Concertly" }] }),
  component: Profile,
});

function Profile() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [saving, setSaving] = useState(false);
  const updateUsername = useUpdateUsername();
  const avatarUrl = useAvatarUrl(profile?.avatarPath);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", profile.userId);
      if (dbErr) throw dbErr;
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onSaveName() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", profile.userId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Name saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 md:py-14">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Your <span className="gradient-text">profile</span>.
        </h1>
      </div>

      <section className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="relative">
            <div className="h-28 w-28 overflow-hidden rounded-full border border-hairline bg-surface-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-3xl font-extrabold text-muted-foreground">
                  {(profile?.displayName ?? "U")
                    .split(/\s+/)
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-hairline bg-brand text-brand-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-60"
              aria-label="Change profile picture"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile picture</p>
            <p className="mt-1 text-sm text-muted-foreground">
              JPG or PNG, up to 5&nbsp;MB. A square image works best.
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2 disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload new picture"}
            </button>
          </div>
        </div>

        <div className="mt-10 space-y-5 border-t border-hairline pt-8">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              value={profile?.email ?? ""}
              disabled
              className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-3 text-sm text-muted-foreground"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSaveName}
              disabled={saving || !profile}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
