import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "get_stats",
  title: "Concert stats",
  description: "Summary stats for the signed-in user: totals, top artists, top venues, top cities across attended shows.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("concerts")
      .select("artist, venue, city, country, date, status, ticket_price")
      .eq("user_id", ctx.getUserId()!)
      .eq("status", "attended");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const tally = (key: "artist" | "venue" | "city") => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const v = (r as Record<string, unknown>)[key] as string | null;
        if (!v) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    };
    const totalSpend = rows.reduce((s, r) => s + (Number(r.ticket_price) || 0), 0);
    const stats = {
      total_attended: rows.length,
      unique_artists: new Set(rows.map((r) => r.artist)).size,
      unique_venues: new Set(rows.map((r) => r.venue)).size,
      unique_cities: new Set(rows.map((r) => r.city)).size,
      total_spend: totalSpend,
      top_artists: tally("artist"),
      top_venues: tally("venue"),
      top_cities: tally("city"),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: stats,
    };
  },
});
