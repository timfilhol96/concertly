import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConcerts from "./tools/list-concerts";
import getConcert from "./tools/get-concert";
import createConcert from "./tools/create-concert";
import getStats from "./tools/get-stats";

// Direct Supabase host - the .lovable.cloud proxy is rejected as an OAuth issuer.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "concertly-mcp",
  title: "Concertly",
  version: "0.1.0",
  instructions:
    "Tools for Concertly, a personal concert log. Use `list_concerts` to browse the user's shows, `get_concert` for full details (including setlist), `create_concert` to log a new show, and `get_stats` for aggregate stats across attended shows.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listConcerts, getConcert, createConcert, getStats],
});
