import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "create_concert",
  title: "Log a concert",
  description: "Insert a new concert into the signed-in user's log.",
  inputSchema: {
    artist: z.string().min(1).describe("Headlining artist."),
    venue: z.string().min(1).describe("Venue name."),
    city: z.string().min(1).describe("City."),
    country: z.string().optional().describe("Country."),
    date: z.string().describe("Show date in YYYY-MM-DD."),
    status: z.enum(["attended", "upcoming", "wishlist"]).optional().describe("Defaults to attended."),
    rating: z.number().int().min(0).max(5).optional().describe("Rating 0-5."),
    tour: z.string().optional(),
    genre: z.string().optional(),
    ticket_price: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("concerts")
      .insert({ ...input, user_id: ctx.getUserId()! })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged: ${data.artist} at ${data.venue} on ${data.date}` }],
      structuredContent: { concert: data },
    };
  },
});
