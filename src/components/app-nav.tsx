import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Map as MapIcon,
  MoreHorizontal,
  Plus,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile } from "@/lib/concerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ctaClass } from "@/components/cta";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/shows", label: "My Shows" },
  { to: "/map", label: "Map" },
  { to: "/insights", label: "Insights" },
  { to: "/friends", label: "Friends" },
  { to: "/wrapped", label: "Wrapped" },
] as const;

// Mobile bottom bar: the most-used pages get a tab, the rest live under "More".
const MOBILE_TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/shows", label: "Shows", icon: ListMusic },
] as const;
const MOBILE_TABS_RIGHT = [{ to: "/map", label: "Map", icon: MapIcon }] as const;
const MOBILE_MORE = [
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/wrapped", label: "Wrapped", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
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
          <Link
            to="/add"
            className={ctaClass({}, "hidden md:inline-flex")}
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
                    <User className="h-3.5 w-3.5" /> View profile
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
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = MOBILE_MORE.some((n) => pathname.startsWith(n.to));

  const tab = (n: { to: string; label: string; icon: typeof User }) => {
    const active = pathname.startsWith(n.to);
    return (
      <Link
        key={n.to}
        to={n.to}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <n.icon className={cn("h-5 w-5", active && "text-brand")} />
        {n.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center px-2">
        {MOBILE_TABS.map(tab)}
        <div className="flex flex-1 justify-center">
          <Link
            to="/add"
            aria-label="Log a show"
            className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg glow-brand transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {MOBILE_TABS_RIGHT.map(tab)}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold outline-none transition-colors",
              moreActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className={cn("h-5 w-5", moreActive && "text-brand")} />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-48 rounded-2xl p-1.5">
            {MOBILE_MORE.map((n) => (
              <DropdownMenuItem key={n.to} asChild className="rounded-xl px-3 py-2.5">
                <Link to={n.to}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
