import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/coaches", label: "Coaches" },
  { to: "/admin/subscriptions", label: "Subscriptions" },
  { to: "/admin/payouts", label: "Payouts" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/emails", label: "Emails" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/system", label: "System" },
];

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const AdminShell = ({ title, subtitle, children }: AdminShellProps) => (
  <AppShell hideTabBar>
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-4">
        <span className="brutal-tag mb-3 bg-destructive text-destructive-foreground">Admin</span>
        <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      <nav aria-label="Admin sections" className="mb-6 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max items-center gap-2 border-b-2 border-ink pb-2">
          {navItems.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                    isActive ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
                  )
                }
              >
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  </AppShell>
);

export default AdminShell;
