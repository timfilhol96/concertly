import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Database, Download, Loader2, Music2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useAddConcert, useConcerts, useProfile } from "@/lib/concerts";
import { concertsToCsv, csvToConcerts, downloadCsv } from "@/lib/csv";
import { useUpdateUsername, USERNAME_RE } from "@/lib/friends";
import {
  disconnectSpotify,
  getSpotifyAuthUrl,
  getSpotifyStatus,
} from "@/lib/spotify.functions";

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
              Username
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center rounded-xl border border-hairline bg-surface/60 px-3 text-sm text-muted-foreground">@</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="yourname"
                maxLength={20}
              />
              <button
                type="button"
                disabled={
                  updateUsername.isPending ||
                  !USERNAME_RE.test(username) ||
                  username === (profile?.username ?? "")
                }
                onClick={async () => {
                  try {
                    await updateUsername.mutateAsync(username);
                    toast.success("Username saved");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't save");
                  }
                }}
                className="rounded-xl border border-hairline bg-surface px-4 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
              >
                {updateUsername.isPending ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              3–20 chars · lowercase letters, numbers, underscore. Friends use this to find you.
            </p>
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

      <SpotifySection />
      <DataSection />
    </main>
  );
}

function DataSection() {
  const { data: concerts } = useConcerts();
  const add = useAddConcert();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function onExport() {
    if (!concerts || concerts.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`concertly-${stamp}.csv`, concertsToCsv(concerts));
    toast.success(`Exported ${concerts.length} row${concerts.length === 1 ? "" : "s"}`);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { imported, errors } = csvToConcerts(text);
      if (imported.length === 0) {
        toast.error(errors[0] ?? "Nothing to import");
        return;
      }
      let ok = 0;
      for (const row of imported) {
        try {
          await add.mutateAsync(row);
          ok++;
        } catch {
          errors.push(`Row for ${row.artist} on ${row.date} failed to save`);
        }
      }
      toast.success(`Imported ${ok} show${ok === 1 ? "" : "s"}`, {
        description: errors.length ? `${errors.length} skipped` : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-hairline bg-card p-6 md:p-8">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-brand/15 text-brand">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">Your data</h2>
          <p className="text-sm text-muted-foreground">
            Export your archive as CSV, or import from a previous export.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" /> {importing ? "Importing…" : "Import CSV"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={onImportFile}
          className="hidden"
        />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        CSV headers: date, artist, tour, venue, city, country, rating, genre, notes, ticket_price, status, openers (pipe-separated).
      </p>
    </section>
  );
}

function SpotifySection() {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { data: status, isLoading } = useQuery({
    queryKey: ["spotify-status"],
    queryFn: () => getSpotifyStatus(),
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get("spotify");
    if (!s) return;
    if (s === "connected") toast.success("Spotify connected");
    else toast.error(`Spotify: ${url.searchParams.get("spotify_message") || "error"}`);
    url.searchParams.delete("spotify");
    url.searchParams.delete("spotify_message");
    window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
    qc.invalidateQueries({ queryKey: ["spotify-status"] });
  }, [qc]);

  async function onConnect() {
    setConnecting(true);
    try {
      const { url } = await getSpotifyAuthUrl({
        data: { redirectOrigin: window.location.origin },
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start Spotify connect");
      setConnecting(false);
    }
  }

  async function onDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectSpotify();
      await qc.invalidateQueries({ queryKey: ["spotify-status"] });
      toast.success("Spotify disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-hairline bg-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold">Spotify</h2>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Checking status…"
                : status?.connected
                  ? `Connected${status.displayName ? ` as ${status.displayName}` : ""}`
                  : "Connect to create playlists from your concert setlists."}
            </p>
          </div>
        </div>
        {status?.connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting || isLoading}
            className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-bold text-black hover:opacity-90 disabled:opacity-60"
          >
            {connecting ? "Redirecting…" : "Connect Spotify"}
          </button>
        )}
      </div>
    </section>
  );
}
