import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "oc_pwa_install_dismissed";

/**
 * PWA install banner. Captures `beforeinstallprompt` so we can
 * surface a CTA on our own terms instead of relying on the browser's
 * default infobar (which most mobile browsers swallow).
 *
 * Hides itself if:
 *   - already running standalone (display-mode: standalone)
 *   - user dismissed it (persisted in localStorage)
 *   - browser hasn't fired the event yet
 *
 * Lives in the AppShell so every page can prompt — but the banner
 * only renders once per session post-install/dismissal.
 */
export const PwaInstallBanner = () => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari uses navigator.standalone
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (dismissed || standalone) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => {
      setHidden(true);
      window.localStorage.setItem(DISMISS_KEY, "installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !event) return null;

  const dismiss = () => {
    setHidden(true);
    window.localStorage.setItem(DISMISS_KEY, "dismissed");
  };

  const install = async () => {
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setHidden(true);
        window.localStorage.setItem(DISMISS_KEY, "installed");
      }
    } catch {
      // user cancelled — keep banner visible until they dismiss
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 border-2 border-ink bg-accent p-3 shadow-brutal-sm md:bottom-6">
      <Download aria-hidden className="h-5 w-5 shrink-0 text-ink" />
      <div className="flex-1 text-sm">
        <strong className="font-display">Install OnlyCoach</strong>
        <p className="text-xs text-ink/80">Faster, offline-friendly, fits like an app.</p>
      </div>
      <button onClick={install}
        className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-foreground">
        Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss"
        className="border-2 border-ink bg-surface p-1.5">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PwaInstallBanner;
