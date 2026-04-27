import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useNotifications, type NotificationKind } from "@/hooks/useNotifications";
import { Bell, BellOff, MessageCircle, FileText, CreditCard, Trophy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kindIcon: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  post: FileText,
  subscription: CreditCard,
  challenge: Trophy,
  system: Info,
};

const Notifications = () => {
  const { items, unreadCount, isRead, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const open = (id: string, href?: string) => {
    markRead(id);
    if (href) navigate(href);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <span className="brutal-tag mb-3"><Bell className="h-3 w-3" /> Notifications</span>
            <h1 className="font-display text-3xl md:text-4xl">
              {unreadCount > 0 ? `${unreadCount} new` : "All caught up"}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} className="border-2 border-ink bg-surface">
              Mark all read
            </Button>
          )}
        </header>

        {items.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <BellOff className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-xl">Quiet here.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscribe to a coach or join a challenge to start receiving updates.
            </p>
            <Link
              to="/discover"
              className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
              Find a coach
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const Icon = kindIcon[n.kind];
              const read = isRead(n.id);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => open(n.id, n.href)}
                    className={cn(
                      "brutal-card-sm flex w-full items-start gap-3 p-4 text-left",
                      !read && "bg-accent/15",
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink",
                      read ? "bg-surface" : "bg-primary text-primary-foreground",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <strong className="font-display text-base">{n.title}</strong>
                        <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{n.at}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    </div>
                    {!read && <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
};

export default Notifications;
