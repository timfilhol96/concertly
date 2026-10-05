import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const URL_LIFETIME_S = 60 * 60;

/**
 * Signed URL for a private storage object, cached and shared by every
 * component showing the same file. Signing per mount used to cost a request
 * each time and produced a new URL, so the browser re-downloaded the image too.
 * The URL is reused until shortly before it expires.
 */
export function useSignedStorageUrl(bucket: string, path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["signed-url", bucket, path],
    enabled: !!path,
    staleTime: (URL_LIFETIME_S - 10 * 60) * 1000,
    gcTime: (URL_LIFETIME_S - 5 * 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path!, URL_LIFETIME_S);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return path ? (data ?? null) : null;
}
