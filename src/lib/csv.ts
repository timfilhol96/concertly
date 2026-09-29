// Tiny CSV helpers used by the profile export/import section.
// Purely client-side - no dependency needed.

import type { Concert, ConcertStatus, NewConcert } from "@/lib/concerts";

const HEADERS = [
  "date",
  "artist",
  "tour",
  "venue",
  "city",
  "country",
  "rating",
  "genre",
  "notes",
  "ticket_price",
  "status",
  "openers",
] as const;

function escapeCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function concertsToCsv(list: Concert[]): string {
  const lines = [HEADERS.join(",")];
  for (const c of list) {
    lines.push(
      [
        c.date,
        c.artist,
        c.tour ?? "",
        c.venue,
        c.city,
        c.country ?? "",
        c.rating,
        c.genre ?? "",
        c.notes ?? "",
        c.ticketPrice ?? "",
        c.status ?? "attended",
        (c.openers ?? []).join("|"),
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

// Minimal RFC-4180-ish CSV parser: handles quoted cells, escaped quotes,
// LF/CRLF row separators. Good enough for our own export shape.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        cell = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export type ImportResult = { imported: NewConcert[]; errors: string[] };

export function csvToConcerts(text: string): ImportResult {
  const rows = parseCsv(text.trim());
  const errors: string[] = [];
  const imported: NewConcert[] = [];
  if (rows.length === 0) return { imported, errors: ["Empty file"] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h)])) as Record<
    (typeof HEADERS)[number],
    number
  >;
  if (idx.date === -1 || idx.artist === -1 || idx.venue === -1 || idx.city === -1) {
    return {
      imported,
      errors: ["CSV must include date, artist, venue and city columns."],
    };
  }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (k: (typeof HEADERS)[number]) => (idx[k] >= 0 ? row[idx[k]]?.trim() ?? "" : "");
    const date = get("date");
    const artist = get("artist");
    const venue = get("venue");
    const city = get("city");
    if (!date || !artist || !venue || !city) {
      errors.push(`Row ${r + 1}: missing required field`);
      continue;
    }
    const ratingRaw = Number(get("rating"));
    const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(10, ratingRaw)) : 0;
    const priceRaw = get("ticket_price");
    const price = priceRaw === "" ? null : Number(priceRaw);
    const openers = get("openers")
      ? get("openers").split("|").map((s) => s.trim()).filter(Boolean)
      : null;
    const status = (get("status") || "attended") as ConcertStatus;
    imported.push({
      artist,
      tour: get("tour") || null,
      openers: openers && openers.length ? openers : null,
      date,
      venue,
      city,
      country: get("country") || null,
      rating,
      genre: get("genre") || null,
      notes: get("notes") || null,
      ticketPrice: price != null && Number.isFinite(price) ? price : null,
      songsSeen: null,
      setlist: null,
      artistImageUrl: null,
      openerSetlists: null,
      status: ["attended", "upcoming", "wishlist"].includes(status) ? status : "attended",
    });
  }
  return { imported, errors };
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
