import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { WrappedSharePayload } from "./wrapped-share-types";

function createShareId() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createWrappedShare(payload: WrappedSharePayload, gradient: string) {
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError || !userRes.user) throw new Error("Not signed in");

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = createShareId();
    const { error } = await supabase.from("wrapped_shares").insert({
      id,
      user_id: userRes.user.id,
      payload: payload as Json,
      gradient,
    });

    if (!error) return id;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Couldn't create share link");
}