import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppNav, MobileTabBar } from "@/components/app-nav";
import { AppFooter } from "@/components/app-footer";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
