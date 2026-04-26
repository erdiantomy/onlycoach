import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativePlatform } from "@/lib/platform";

/**
 * DeepLinkHandler — bridges native URL opens (push-notification taps,
 * universal links, custom-scheme links) into React Router navigations.
 *
 * Supported link shapes (both web URLs and the app's custom scheme):
 *   https://onlycoach.app/messages/<conversationId>
 *   https://onlycoach.app/sessions/<bookingId>
 *   onlycoach://messages/<conversationId>
 *   onlycoach://booking/<bookingId>
 *   onlycoach://subscription/<coachHandle>
 *
 * On Android/iOS, push notification payloads should set `data.deeplink` to
 * one of the URLs above; the native handler calls `App.openUrl()` (or sets
 * `intent` for Android) so this listener fires. The handler also dispatches
 * a window event for any in-page subscribers (e.g. badge counters).
 */
export const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Dynamic import keeps web bundles slim and avoids requiring the
      // package at build time on installs without the native shell.
      const mod: any = await import(/* @vite-ignore */ ("@capacitor/app" as string)).catch(() => null);
      if (cancelled || !mod?.App?.addListener) return;

      const handle = await mod.App.addListener("appUrlOpen", (event: { url: string }) => {
        const path = parseDeepLinkToPath(event.url);
        if (path) {
          navigate(path);
          window.dispatchEvent(new CustomEvent("app:deep-link", { detail: { url: event.url, path } }));
        }
      });
      cleanup = () => handle.remove();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate]);

  return null;
};

/**
 * Map any supported deep-link URL → in-app path. Returns null if the URL
 * is not one we route. Exported for unit testing.
 */
export const parseDeepLinkToPath = (raw: string): string | null => {
  try {
    const url = new URL(raw);
    // For custom scheme like `onlycoach://messages/abc`, URL parses the
    // host as "messages" and pathname as "/abc". Normalize both shapes.
    const isCustomScheme = !url.protocol.startsWith("http");
    const segments = isCustomScheme
      ? [url.hostname, ...url.pathname.split("/")].filter(Boolean)
      : url.pathname.split("/").filter(Boolean);

    if (segments.length === 0) return "/";

    const [head, id] = segments;
    switch (head) {
      case "messages":
      case "conversation":
        return id ? `/messages/${id}` : "/messages";
      case "sessions":
      case "booking":
      case "bookings":
        return id ? `/sessions?booking=${encodeURIComponent(id)}` : "/sessions";
      case "subscription":
      case "subscribe":
      case "coach":
        return id ? `/coach/${id}` : "/discover";
      case "feed":
        return "/feed";
      default:
        // Fall through: if it's a normal web URL we recognize the path of,
        // just hand the path back so React Router can resolve it.
        return isCustomScheme ? null : url.pathname + url.search;
    }
  } catch {
    return null;
  }
};
