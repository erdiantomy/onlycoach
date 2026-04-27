import { NavLink } from "react-router-dom";
import { Compass, Home, MessageCircle, Trophy, User } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/challenges", label: "Cohorts", icon: Trophy },
  { to: "/messages", label: "DMs", icon: MessageCircle },
  { to: "/me", label: "Me", icon: User },
];

/**
 * Bottom tab bar — primary navigation on mobile + native (Capacitor).
 * Hidden on md+ where the top nav takes over. Honors iOS safe-area inset.
 */
export const MobileTabBar = () => {
  const { user } = useSession();
  const { unreadCount } = useNotifications();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface pb-safe md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isMessages = to === "/messages";
          const showBadge = isMessages && user && unreadCount > 0;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent/40",
                  )
                }
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
                <span>{label}</span>
                {showBadge && (
                  <span
                    aria-hidden
                    className="absolute right-1/2 top-2 ml-3 inline-flex h-3.5 min-w-3.5 translate-x-3 items-center justify-center border-2 border-ink bg-accent px-1 font-display text-[9px] leading-none"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
