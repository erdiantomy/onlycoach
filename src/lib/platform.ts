import { Capacitor } from "@capacitor/core";

/**
 * Platform helpers for App Store compliance.
 *
 * Apple requires that digital goods/subscriptions sold inside an iOS app go
 * through Apple In-App Purchase (with the 30 % fee). Routing users to an
 * external payment processor (Stripe / Xendit) inside the iOS shell is a
 * rejection risk under App Store Review Guideline 3.1.1.
 *
 * Our compliance posture: on native iOS we DISABLE in-app checkout entirely
 * and surface a "Manage on Web" path that opens the same flow in the
 * device's external browser. Android + web behave normally.
 */

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
export const isIOS = (): boolean => Capacitor.getPlatform() === "ios";
export const isAndroid = (): boolean => Capacitor.getPlatform() === "android";

/** True when this build must hide/redirect external-payment UI. */
export const requiresExternalCheckout = (): boolean => isNativePlatform() && isIOS();

/** Public web origin used for "Manage on Web" deep links from the iOS shell. */
export const WEB_ORIGIN = "https://7ee943ba-1d4f-47bd-8b62-cc3bdd6d90c4.lovableproject.com";

/**
 * Open a path on the public web in the system browser. On iOS we prefer the
 * external browser (not an in-app webview) so the transaction is clearly
 * outside the app — that's the compliance requirement.
 */
export const openOnWeb = async (path: string): Promise<void> => {
  const url = path.startsWith("http") ? path : `${WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  if (isNativePlatform()) {
    try {
      // Optional plugin — only present once the user installs @capacitor/browser
      // in their native shell. Use a runtime-only dynamic import so TS doesn't
      // require the package to be in node_modules.
      const mod: any = await import(/* @vite-ignore */ "@capacitor/browser").catch(() => null);
      if (mod?.Browser?.open) {
        await mod.Browser.open({ url, presentationStyle: "fullscreen" });
        return;
      }
    } catch {
      // fall through
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
