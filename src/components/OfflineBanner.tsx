import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * Persistent offline banner. Mounts above the TopNav and auto-hides
 * when the network returns. Includes a "Retry" button that pings the
 * Supabase health endpoint via useOnlineStatus().recheck() — this is
 * how we get past flaky-WiFi cases where the OS lies and reports we
 * have a connection.
 */
export const OfflineBanner = () => {
  const { online, since, recheck } = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (online) {
      setSecs(0);
      return;
    }
    const tick = () => setSecs(Math.round((Date.now() - since.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [online, since]);

  if (online) return null;

  const onRetry = async () => {
    setBusy(true);
    try {
      await recheck();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" aria-live="polite"
      className="border-b-2 border-ink bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <WifiOff aria-hidden className="h-4 w-4" />
        <span className="flex-1">
          You're offline {secs > 0 ? `for ${secs}s` : "—"} we'll keep your draft messages safe.
        </span>
        <Button onClick={onRetry} disabled={busy} variant="outline" size="sm"
          className="border-2 border-ink bg-surface">
          {busy ? "Checking…" : "Retry"}
        </Button>
      </div>
    </div>
  );
};

export default OfflineBanner;
