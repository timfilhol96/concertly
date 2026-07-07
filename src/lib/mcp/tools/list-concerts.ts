import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "list_concerts",
  title: "List concerts",
  description: "List the signed-in user's logged concerts, most recent first. Optionally filter by status (attended, upcoming, wishlist).",
  inputSchema: {
    status: z.enum(["attended", "upcoming", "wishlist"]).optional().describe("Filter by concert status."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("concerts")
      .select("id, artist, venue, city, country, date, status, rating, tour, genre, ticket_price")
      .eq("user_id", ctx.getUserId()!)
      .order("date", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { concerts: data ?? [] },
    };
  },
});
