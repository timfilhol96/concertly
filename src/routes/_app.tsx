import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppNav } from "@/components/app-nav";

export const Route = createFileRoute("/_app")({
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
