import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/app-nav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: location.href } });
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <Outlet />
    </div>
  );
}
