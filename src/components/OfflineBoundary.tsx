import { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface OfflineBoundaryProps {
  children: React.ReactNode;
  /** When true, hide children entirely while offline (for checkout). */
  blockWhenOffline?: boolean;
  /** Optional title shown in the banner/blocker. */
  title?: string;
  /** Optional description. */
  description?: string;
}

/**
 * OfflineBoundary
 *
 * Two modes:
 *  - default: shows a sticky banner above children when offline. Children
 *    keep rendering (chat history stays readable, drafts can be queued).
 *  - blockWhenOffline: hides children entirely and shows a full-pane
 *    offline state with retry. Use for flows that MUST not run partially
 *    online — checkout in particular: starting a Stripe/Xendit redirect on
 *    flaky network risks creating an orphaned pending payment.
 *
 * Both modes expose a Retry button that pings Supabase via `recheck()` so
 * the user can recover without leaving the screen.
 */
export const OfflineBoundary = ({
  children,
  blockWhenOffline = false,
  title = "You're offline",
  description = "Your connection dropped. We'll resume when it's back.",
}: OfflineBoundaryProps) => {
  const { online, since, recheck } = useOnlineStatus();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await recheck();
    } finally {
      setChecking(false);
    }
  };

  if (online) return <>{children}</>;

  if (blockWhenOffline) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-surface">
          <WifiOff className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Offline since {since.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button
          onClick={handleRetry}
          disabled={checking}
          className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden />
          {checking ? "Checking…" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-ink bg-destructive px-4 py-2 text-destructive-foreground"
      >
        <div className="flex items-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" aria-hidden />
          <span className="font-display">Offline — changes will send when reconnected</span>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center gap-1 border-2 border-ink bg-surface px-2 py-1 text-xs font-display text-foreground"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} aria-hidden />
          {checking ? "Checking…" : "Retry"}
        </button>
      </div>
      {children}
    </div>
  );
};
