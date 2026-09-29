import { Link } from "@tanstack/react-router";

// Slim footer for signed-in pages so legal pages stay reachable after sign-in.
export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Concertly · Made for the front row</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/trust" className="hover:text-foreground">
            Trust
          </Link>
        </nav>
      </div>
    </footer>
  );
}
