import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * The signed-in user from the locally stored session. Unlike
 * `supabase.auth.getUser()` this makes no request to the auth server, which
 * matters because nearly every query needs the user id. It is fine for scoping
 * client queries: the database still verifies the token through RLS on every
 * request. The Supabase client refreshes the session token automatically.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
