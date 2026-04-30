import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", path: "/admin" },
  { label: "Users", path: "/admin/users" },
  { label: "Coaches", path: "/admin/coaches" },
  { label: "Subscriptions", path: "/admin/subscriptions" },
  { label: "Payouts", path: "/admin/payouts" },
  { label: "Content", path: "/admin/content" },
  { label: "Emails", path: "/admin/emails" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "System", path: "/admin/system" },
];

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();

  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-screen-xl px-4 py-6 md:px-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block border-2 border-ink bg-ink px-2 py-0.5 font-display text-xs uppercase tracking-widest text-ink-foreground">
            Admin
          </span>
          <h1 className="font-display text-2xl">Super Admin Panel</h1>
        </div>

        {/* Horizontal scroll nav */}
        <div className="mb-6 flex overflow-x-auto border-2 border-ink">
          {NAV_ITEMS.map((item) => {
            const active = item.path === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "shrink-0 border-r-2 border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wide last:border-r-0 whitespace-nowrap",
                  active ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </AppShell>
  );
};

export default AdminShell;
