import { NavLink } from "react-router-dom";
import { Compass, Home, MessageCircle, CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/me", label: "Me", icon: User },
];

/**
 * Bottom tab bar — primary navigation on mobile + native (Capacitor).
 * Hidden on md+ where the top nav takes over. Honors iOS safe-area inset.
 */
export const MobileTabBar = () => (
  <nav
    aria-label="Primary"
    className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface pb-safe md:hidden"
  >
    <ul className="grid grid-cols-5">
      {tabs.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            className={({ isActive }) =>
              cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent/40",
              )
            }
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

export default MobileTabBar;
