import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "get_concert",
  title: "Get concert",
  description: "Get full details for one concert by id, including setlist and openers.",
  inputSchema: {
    id: z.string().uuid().describe("Concert id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("concerts")
      .select("*")
      .eq("id", id)
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Concert not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { concert: data },
    };
  },
});
