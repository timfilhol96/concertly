import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Exact-username lookup for sending friend requests. Runs server-side after
// verifying the caller, and returns only the minimum needed (id + names).
export const findProfileByUsernameFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_]{3,20}$/, "3–20 chars, lowercase letters, numbers, underscore"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", data.username)
      .limit(1);
    if (error) throw new Error("Lookup failed");
    const row = rows?.[0];
    if (!row) return null;
    return { id: row.id, username: row.username, displayName: row.display_name };
  });
