import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Plus, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile } from "@/lib/concerts";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/shows", label: "My Shows" },
  { to: "/insights", label: "Insights" },
  { to: "/friends", label: "Friends" },
  { to: "/wrapped", label: "Wrapped" },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const avatarUrl = useAvatarUrl(profile?.avatarPath);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (profile?.displayName ?? "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="font-display text-2xl font-extrabold tracking-tighter text-brand">
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
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-2 text-xs font-bold transition-colors hover:border-brand"
              aria-label="Account menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </button>
            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-hairline bg-card shadow-xl">
                  <div className="border-b border-hairline px-4 py-3">
                    <p className="truncate text-sm font-semibold">{profile?.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <User className="h-3.5 w-3.5" /> Edit profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2 border-t border-hairline px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              </>
            )}
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
