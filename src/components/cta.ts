import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Pill-shaped call-to-action styles shared by links and buttons across the app.
// Use for primary/secondary actions; icon buttons and filter chips keep their own styles.
const ctaVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        brand: "bg-brand text-brand-foreground",
        inverse: "bg-foreground text-background",
        surface:
          "border border-hairline bg-surface/60 text-foreground backdrop-blur-md hover:scale-100 hover:bg-surface-2",
      },
      size: {
        sm: "px-3.5 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-sm",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  },
);

export function ctaClass(opts: VariantProps<typeof ctaVariants> = {}, className?: string) {
  return cn(ctaVariants(opts), className);
}
