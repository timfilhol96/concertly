// Wrapped themes - each theme is a single accent hue rendered at varying
// lightness/chroma in oklch. No theme mixes two hues.
export type WrappedTheme = {
  id: string;
  label: string;
  /** CSS background-image (linear-gradient in oklch) */
  bg: string;
  /** Same gradient but 135deg for the swatch preview */
  swatch: string;
  /** Tailwind text color class for content on top of `bg` */
  text: string;
  /** Accent hue in oklch degrees */
  hue: number;
  /** Base chroma */
  chroma: number;
  /** True when the theme renders dark content on a light background */
  light: boolean;
};

/**
 * Genre-mix swatches derived from the active theme: same hue, stepped
 * lightness/chroma so every segment stays visible on the theme background.
 */
export function genreColors(theme: WrappedTheme, count: number): string[] {
  const n = Math.max(count, 1);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    const l = theme.light ? 0.55 - t * 0.33 : 0.95 - t * 0.42;
    const c = Math.max(theme.chroma * (0.6 + t * 0.9), 0.02);
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${theme.hue})`;
  });
}

// hue → single-hue ramp. Keep chroma modest; vary lightness for depth.
const ramp = (hue: number, chroma: number, text: string = "text-white"): Omit<WrappedTheme, "id" | "label"> => {
  const from = `oklch(0.32 ${chroma} ${hue})`;
  const via = `oklch(0.55 ${chroma * 1.15} ${hue})`;
  const to = `oklch(0.22 ${chroma * 0.75} ${hue})`;
  return {
    bg: `linear-gradient(to bottom right, ${from}, ${via}, ${to})`,
    swatch: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
    text,
    hue,
    chroma,
    light: false,
  };
};

const lightRamp = (hue: number, chroma: number): Omit<WrappedTheme, "id" | "label"> => {
  const from = `oklch(0.86 ${chroma} ${hue})`;
  const via = `oklch(0.72 ${chroma * 1.2} ${hue})`;
  const to = `oklch(0.60 ${chroma} ${hue})`;
  return {
    bg: `linear-gradient(to bottom right, ${from}, ${via}, ${to})`,
    swatch: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
    text: "text-slate-900",
    hue,
    chroma,
    light: true,
  };
};

export const WRAPPED_THEMES = [
  { id: "sunset", label: "Sunset", ...ramp(45, 0.16) },       // amber/orange
  { id: "ocean", label: "Ocean", ...ramp(235, 0.14) },        // blue
  { id: "ember", label: "Ember", ...ramp(25, 0.18) },         // red-orange
  { id: "noir", label: "Noir", ...ramp(280, 0.015) },         // near-neutral
  { id: "citrus", label: "Citrus", ...ramp(140, 0.14) },      // green
  { id: "berry", label: "Berry", ...ramp(325, 0.16) },        // magenta
  { id: "aurora", label: "Aurora", ...ramp(200, 0.14) },      // cyan
  { id: "candy", label: "Candy", ...lightRamp(350, 0.11) },   // pale pink
  { id: "moss", label: "Moss", ...ramp(155, 0.09) },          // deep green
  { id: "royal", label: "Royal", ...ramp(270, 0.15) },        // violet
  { id: "clay", label: "Clay", ...ramp(60, 0.09) },           // warm sand
  { id: "ink", label: "Ink", ...ramp(250, 0.06) },            // muted indigo
] as const;

export type WrappedThemeId = (typeof WRAPPED_THEMES)[number]["id"];

export function getWrappedTheme(id?: string | null): WrappedTheme {
  return (WRAPPED_THEMES.find((t) => t.id === id) ?? WRAPPED_THEMES[0]) as WrappedTheme;
}
