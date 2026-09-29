import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConcerts, type Concert } from "@/lib/concerts";
import { geocodeVenueFn } from "@/lib/geocode.functions";
import { ctaClass } from "@/components/cta";
import { PageTitle } from "@/components/page-title";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Map · Concertly" },
      { name: "description", content: "See every concert you have logged plotted on a world map, with venues, cities and countries you have travelled to." },
    ],
  }),
  component: MapPage,
});

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

type MapsGlobal = {
  maps?: {
    Map: new (el: HTMLElement, opts: unknown) => unknown;
    Marker: new (opts: unknown) => { addListener: (e: string, cb: () => void) => void };
    InfoWindow: new (opts: unknown) => {
      open: (map: unknown, marker: unknown) => void;
      close: () => void;
      setContent: (c: string) => void;
    };
    LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
  };
};

declare global {
  interface Window {
    google?: MapsGlobal;
    __concertlyInitMap?: () => void;
  }
}

let googleMapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps not configured"));
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    window.__concertlyInitMap = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: "__concertlyInitMap",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return googleMapsPromise;
}

function MapPage() {
  const { data: concerts, isLoading } = useConcerts();
  const geocode = useServerFn(geocodeVenueFn);
  const [geocoding, setGeocoding] = useState<{ done: number; total: number } | null>(
    null,
  );

  const attended = useMemo(
    () => (concerts ?? []).filter((c) => (c.status ?? "attended") === "attended"),
    [concerts],
  );
  const withCoords = useMemo(
    () => attended.filter((c) => c.latitude != null && c.longitude != null),
    [attended],
  );
  const missingCoords = useMemo(
    () =>
      attended.filter(
        (c) =>
          (c.latitude == null || c.longitude == null) &&
          c.venue.trim().length > 0 &&
          c.city.trim().length > 0,
      ),
    [attended],
  );

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Array<{ setMap?: (m: unknown) => void }>>([]);

  // Boot the map once concerts arrive.
  useEffect(() => {
    let cancelled = false;
    if (!mapDivRef.current) return;
    if (withCoords.length === 0) return;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapDivRef.current || !window.google?.maps) return;
        const g = window.google.maps;
        // Reset markers.
        for (const m of markersRef.current) m.setMap?.(null);
        markersRef.current = [];
        if (!mapRef.current) {
          mapRef.current = new g.Map(mapDivRef.current, {
            center: { lat: withCoords[0].latitude!, lng: withCoords[0].longitude! },
            zoom: 3,
            mapTypeControl: false,
            streetViewControl: false,
            styles: DARK_STYLE,
            backgroundColor: MAP_COLORS.background,
          });
        }
        const bounds = new g.LatLngBounds();
        const infoWindow = new g.InfoWindow({ content: "" });
        // Group by rounded coords to collapse duplicates at same venue.
        const groups = new Map<string, Concert[]>();
        for (const c of withCoords) {
          const key = `${c.latitude!.toFixed(4)},${c.longitude!.toFixed(4)}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(c);
        }
        for (const [, group] of groups) {
          const pos = { lat: group[0].latitude!, lng: group[0].longitude! };
          bounds.extend(pos);
          const marker = new g.Marker({ position: pos, map: mapRef.current });
          marker.addListener("click", () => {
            const html = renderInfo(group);
            infoWindow.setContent(html);
            infoWindow.open(mapRef.current, marker);
          });
          markersRef.current.push(marker as unknown as { setMap?: (m: unknown) => void });
        }
        if (withCoords.length > 1) {
          (mapRef.current as { fitBounds: (b: unknown) => void }).fitBounds(bounds);
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Map failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [withCoords]);

  async function runGeocode() {
    if (missingCoords.length === 0) return;
    setGeocoding({ done: 0, total: missingCoords.length });
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      setGeocoding(null);
      return;
    }
    let done = 0;
    for (const c of missingCoords) {
      try {
        const { lat, lng } = await geocode({
          data: { venue: c.venue, city: c.city, country: c.country ?? null },
        });
        if (lat != null && lng != null) {
          await supabase
            .from("concerts")
            .update({ latitude: lat, longitude: lng })
            .eq("id", c.id)
            .eq("user_id", userId);
        }
      } catch {
        // continue with the next one
      }
      done += 1;
      setGeocoding({ done, total: missingCoords.length });
    }
    setGeocoding(null);
    toast.success(`Geocoded ${done} venue${done === 1 ? "" : "s"}`);
    // Force a refetch - invalidate the concerts query.
    window.location.reload();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <PageTitle
          title="Map"
          description="Every venue you've been to, plotted on a map. Attended shows only."
        />
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5">
            <MapPin className="h-3 w-3" /> {withCoords.length} mapped
          </span>
          {missingCoords.length > 0 && (
            <button
              type="button"
              onClick={runGeocode}
              disabled={!!geocoding || !BROWSER_KEY}
              className={ctaClass({ size: "sm" })}
            >
              {geocoding
                ? `Geocoding ${geocoding.done}/${geocoding.total}…`
                : `Geocode ${missingCoords.length} missing`}
            </button>
          )}
        </div>
      </div>

      {!BROWSER_KEY && (
        <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Google Maps isn't configured yet. Connect Google Maps to enable the map.
        </div>
      )}

      {isLoading ? (
        <div className="h-[70vh] animate-pulse rounded-2xl bg-surface" />
      ) : attended.length === 0 ? (
        <EmptyState message="No attended shows yet. Log your first one to see it on the map." />
      ) : withCoords.length === 0 ? (
        <EmptyState
          message={
            missingCoords.length > 0
              ? `${missingCoords.length} shows are ready to geocode. Hit "Geocode missing" to plot them.`
              : "None of your shows have venue info to plot yet."
          }
        />
      ) : (
        <div
          ref={mapDivRef}
          className="h-[70vh] w-full overflow-hidden rounded-2xl border border-hairline bg-surface"
        />
      )}
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[50vh] items-center justify-center rounded-2xl border border-hairline bg-card text-center">
      <div className="max-w-md px-6">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function renderInfo(shows: Concert[]): string {
  const first = shows[0];
  const header = `<div style="font-family:system-ui,sans-serif;color:#111;max-width:260px">
    <div style="font-weight:800;font-size:14px">${escapeHtml(first.venue)}</div>
    <div style="color:#555;font-size:12px;margin-bottom:6px">${escapeHtml(
      first.city,
    )}${first.country ? `, ${escapeHtml(first.country)}` : ""}</div>`;
  const rows = shows
    .slice(0, 6)
    .map(
      (c) =>
        `<div style="font-size:12px;padding:2px 0"><b>${escapeHtml(
          c.artist,
        )}</b> · ${new Date(c.date).toLocaleDateString("en", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}</div>`,
    )
    .join("");
  const more =
    shows.length > 6
      ? `<div style="font-size:11px;color:#777;margin-top:4px">+${shows.length - 6} more</div>`
      : "";
  return `${header}${rows}${more}</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Google Maps styles only accept hex colours, so these are the app's palette
// tokens (styles.css) converted from oklch. Keep them in sync if the palette changes.
const MAP_COLORS = {
  background: "#08090d", // --background
  land: "#0e0f15", // --surface
  road: "#17181f", // --surface-2
  border: "#25262e", // hairline, opaque
  label: "#8f919f", // --muted-foreground
  water: "#151022", // background tinted towards --brand
  waterLabel: "#776a90",
};

// Dark map style that blends with the app aesthetic.
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: MAP_COLORS.land }] },
  { elementType: "labels.text.stroke", stylers: [{ color: MAP_COLORS.land }] },
  { elementType: "labels.text.fill", stylers: [{ color: MAP_COLORS.label }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: MAP_COLORS.border }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: MAP_COLORS.road }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: MAP_COLORS.water }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: MAP_COLORS.waterLabel }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: MAP_COLORS.land }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
