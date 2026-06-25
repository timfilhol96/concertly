import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { WrappedSharePayload } from "./wrapped-share-types";

export const getPublicWrappedShare = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share, error } = await supabaseAdmin
      .from("wrapped_shares")
      .select("payload, gradient")
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return share
      ? {
          payload: share.payload as WrappedSharePayload,
          gradient: share.gradient,
        }
      : null;
  });