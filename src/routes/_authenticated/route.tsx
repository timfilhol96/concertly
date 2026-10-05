import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/current-user";
import { AppNav, MobileTabBar } from "@/components/app-nav";
import { AppFooter } from "@/components/app-footer";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Runs on every navigation, so read the local session instead of calling
    // the auth server each time. Data access is still enforced by RLS.
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    // Bottom padding on mobile keeps page content clear of the fixed tab bar.
    <div className="min-h-screen bg-background pb-24 text-foreground md:pb-0">
      <AppNav />
      <Outlet />
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
