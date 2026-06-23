import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConcertMediaItem = {
  name: string;
  path: string;
  kind: "image" | "video";
  createdAt: string | null;
};

function detectKind(name: string): "image" | "video" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "mov", "webm", "m4v", "ogg"].includes(ext) ? "video" : "image";
}

export function useConcertMedia(concertId: string | undefined) {
  return useQuery({
    queryKey: ["concert-media", concertId],
    enabled: !!concertId,
    queryFn: async (): Promise<ConcertMediaItem[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return [];
      // List under owner-prefix only; friends' media is shown via their own concert pages.
      // The show page's concert row already includes user_id (owner), but we fetch the
      // concert's owner from the concerts table to support viewing friends' shows.
      const { data: concert } = await supabase
        .from("concerts")
        .select("user_id")
        .eq("id", concertId!)
        .maybeSingle();
      const ownerId = concert?.user_id;
      if (!ownerId) return [];
      const prefix = `${ownerId}/${concertId}`;
      const { data, error } = await supabase.storage
        .from("concert-media")
        .list(prefix, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({
          name: f.name,
          path: `${prefix}/${f.name}`,
          kind: detectKind(f.name),
          createdAt: f.created_at ?? null,
        }));
    },
  });
}

export function useUploadConcertMedia(concertId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not authenticated");
      const uid = userRes.user.id;
      for (const file of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${uid}/${concertId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safe}`;
        const { error } = await supabase.storage
          .from("concert-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concert-media", concertId] }),
  });
}

export function useDeleteConcertMedia(concertId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from("concert-media").remove([path]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concert-media", concertId] }),
  });
}

export function useSignedMediaUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("concert-media")
      .createSignedUrl(path, 60 * 60)
      .then((res) => {
        if (cancelled) return;
        setUrl(res.data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}
