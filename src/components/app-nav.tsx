import { Link, useRouterState } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { USER } from "@/lib/mock-data";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/shows", label: "My Shows" },
  { to: "/insights", label: "Insights" },
  { to: "/wrapped", label: "Wrapped" },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tighter text-brand">
            CONCERTLY
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    "text-sm font-medium transition-colors " +
                    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted-foreground transition-colors hover:text-foreground md:flex">
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Log Show
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface-2 text-xs font-bold">
            {USER.initials}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={
                "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap " +
                (active ? "bg-surface-2 text-foreground" : "text-muted-foreground")
              }
            >
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
