import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, LogOut, User } from "lucide-react";

const links = [
  { to: "/discover", label: "Discover" },
  { to: "/challenges", label: "Challenges" },
  { to: "/feed", label: "Feed" },
  { to: "/community", label: "Community" },
  { to: "/messages", label: "Messages" },
  { to: "/sessions", label: "Sessions" },
];

export const TopNav = () => {
  const { user, signOut } = useSession();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      setIsCoach(false);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? null));
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "coach")
      .maybeSingle()
      .then(({ data }) => setIsCoach(!!data));
  }, [user]);

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-background/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          to="/"
          aria-label="ONLY COACH home"
          className="-mx-2 -my-2 flex min-h-[44px] min-w-[44px] max-w-[55%] items-center rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:min-h-[48px] md:max-w-none"
        >
          <Logo variant="inline" className="h-8 sm:h-9 md:h-10" />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex">
          <ul className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 text-sm font-semibold uppercase tracking-wide",
                      isActive
                        ? "bg-ink text-ink-foreground"
                        : "text-foreground hover:bg-accent/50",
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isCoach && (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/studio">
                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Studio
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/me">
                  <User className="mr-1.5 h-3.5 w-3.5" />
                  {displayName ?? "Profile"}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => signOut()}
                aria-label="Sign out"
                className="border-2 border-ink bg-surface text-ink hover:bg-accent/50"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="border-2 border-ink bg-accent text-ink shadow-brutal-sm hover:bg-accent/90"
              >
                <Link to="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
