import { cn } from "@/lib/utils";

// Placeholder shown while a page's data loads, shaped like a typical page:
// title, subtitle, a row of stat tiles and a large panel.
export function PageSkeleton({ className, tiles = 4 }: { className?: string; tiles?: number }) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className={cn("mx-auto max-w-7xl px-6 py-10 md:py-14", className)}
    >
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-11 w-64 rounded-xl bg-surface-2" />
          <div className="h-4 w-96 max-w-full rounded-xl bg-surface-2" />
        </div>
        {tiles > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: tiles }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-2" />
            ))}
          </div>
        )}
        <div className="h-72 rounded-3xl bg-surface-2" />
      </div>
    </main>
  );
}

// Table-row placeholders for list pages.
export function RowSkeletons({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td colSpan={cols} className="px-6 py-4">
            <div className="h-10 rounded-xl bg-surface-2" />
          </td>
        </tr>
      ))}
    </>
  );
}
