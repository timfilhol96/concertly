import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const geocodeVenueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        venue: z.string().max(200),
        city: z.string().max(120),
        country: z.string().max(120).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const conn = process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !conn) throw new Error("Google Maps not configured");
    const address = [data.venue, data.city, data.country].filter(Boolean).join(", ");
    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Connection-Api-Key": conn,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`Geocode failed (${res.status})`);
    }
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const loc = json.results?.[0]?.geometry?.location;
    if (!loc) return { lat: null as number | null, lng: null as number | null };
    return { lat: loc.lat, lng: loc.lng };
  });
