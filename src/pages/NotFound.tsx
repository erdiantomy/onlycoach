import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Compass, Home as HomeIcon, MapPinOff } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center md:py-24">
        <div className="brutal-card w-full p-8">
          <MapPinOff aria-hidden className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="brutal-tag mt-4">Lost the trail</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">404</h1>
          <p className="mt-2 text-muted-foreground">
            We can't find <code className="break-all rounded-sm bg-surface px-1 py-0.5 text-xs">{location.pathname}</code>.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 border-2 border-ink bg-ink px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
              <HomeIcon className="h-4 w-4" /> Home
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-2 border-2 border-ink bg-surface px-4 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-accent/50">
              <Compass className="h-4 w-4" /> Discover coaches
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default NotFound;
