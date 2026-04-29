import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { MobileTabBar } from "./MobileTabBar";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { SearchPalette } from "@/components/SearchPalette";
import { OfflineBanner } from "@/components/OfflineBanner";

interface AppShellProps {
  children: ReactNode;
  /** Hide the bottom tab bar (e.g. on landing/auth screens). */
  hideTabBar?: boolean;
}

/**
 * Shared chrome for every app screen.
 * Mobile = sticky top brand + bottom tab bar.
 * Desktop = top nav only. Same components on web and Capacitor native.
 *
 * Wraps content in a #main-content landmark so the skip link works
 * for keyboard users, and gives screen readers a stable anchor.
 */
export const AppShell = ({ children, hideTabBar = false }: AppShellProps) => (
  <div className="flex min-h-screen flex-col bg-background">
    <a
      href="#main-content"
      className="absolute left-2 top-2 z-[100] -translate-y-12 border-2 border-ink bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      Skip to content
    </a>
    <OfflineBanner />
    <TopNav />
    <main
      id="main-content"
      tabIndex={-1}
      className={`flex-1 focus:outline-none ${hideTabBar ? "" : "pb-20 md:pb-0"}`}
    >
      {children}
    </main>
    {!hideTabBar && <MobileTabBar />}
    <PwaInstallBanner />
    <SearchPalette />
  </div>
);

export default AppShell;
