import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared page heading so every page has the same title size, spacing and label style.
export function PageTitle({
  eyebrow,
  eyebrowClassName,
  title,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 animate-reveal", className)}>
      {eyebrow && <p className={cn("eyebrow text-muted-foreground", eyebrowClassName)}>{eyebrow}</p>}
      <h1
        className={cn(
          "font-display text-4xl font-extrabold tracking-tight md:text-5xl",
          eyebrow && "mt-1",
        )}
      >
        {title}
      </h1>
      {description && <div className="mt-2 max-w-2xl text-muted-foreground">{description}</div>}
    </div>
  );
}
