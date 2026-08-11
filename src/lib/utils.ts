import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "5 shows" / "1 show". Handles irregulars via optional plural form.
export function plural(n: number, singular: string, pluralForm?: string): string {
  const word = n === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${n} ${word}`;
}

// Format fractional hours as "X hours XX minutes" (or "X minutes" under 1 hour).
export function formatDuration(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return plural(totalMinutes, "minute");
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return plural(h, "hour");
  return `${plural(h, "hour")} ${plural(m, "minute")}`;
}

