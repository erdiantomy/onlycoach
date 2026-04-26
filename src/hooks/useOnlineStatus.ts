import { useEffect, useState } from "react";

/**
 * useOnlineStatus — reactive network status that's accurate inside the
 * Capacitor WebView too.
 *
 * `navigator.onLine` is unreliable on iOS WebView (it stays `true` even
 * after the device drops off Wi-Fi). To be safe we ALSO listen for
 * Capacitor's `@capacitor/network` `networkStatusChange` event when the
 * plugin is available, and treat either signal as authoritative.
 *
 * Returns `{ online, since, recheck }`:
 *   - online: boolean
 *   - since: Date when current state began (useful for "Reconnecting for 12s…")
 *   - recheck: () => Promise<boolean> — pings the Supabase URL to confirm
 */

const PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;

export interface NetworkStatus {
  online: boolean;
  since: Date;
  recheck: () => Promise<boolean>;
}

export const useOnlineStatus = (): NetworkStatus => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [since, setSince] = useState<Date>(new Date());

  useEffect(() => {
    const update = (next: boolean) => {
      setOnline((prev) => {
        if (prev !== next) setSince(new Date());
        return next;
      });
    };

    const handleOnline = () => update(true);
    const handleOffline = () => update(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const mod: any = await import(/* @vite-ignore */ ("@capacitor/network" as string)).catch(() => null);
      if (cancelled || !mod?.Network) return;
      const handle = await mod.Network.addListener("networkStatusChange", (s: { connected: boolean }) => {
        update(Boolean(s.connected));
      });
      // Initial sync — Capacitor knows actual radio state.
      const status = await mod.Network.getStatus().catch(() => null);
      if (status) update(Boolean(status.connected));
      cleanup = () => handle.remove();
    })();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const recheck = async (): Promise<boolean> => {
    if (!PING_URL || !PING_URL.startsWith("http")) return online;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(PING_URL, { method: "GET", signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      const ok = res.ok || res.status === 401; // 401 = service reachable
      setOnline((prev) => {
        if (prev !== ok) setSince(new Date());
        return ok;
      });
      return ok;
    } catch {
      setOnline((prev) => {
        if (prev !== false) setSince(new Date());
        return false;
      });
      return false;
    }
  };

  return { online, since, recheck };
};
