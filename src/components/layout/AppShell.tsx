import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { MobileTabBar } from "./MobileTabBar";

interface AppShellProps {
  children: ReactNode;
  /** Hide the bottom tab bar (e.g. on landing/auth screens). */
  hideTabBar?: boolean;
}

/**
 * Shared chrome for every app screen.
 * Mobile = sticky top brand + bottom tab bar.
 * Desktop = top nav only. Same components on web and Capacitor native.
 */
export const AppShell = ({ children, hideTabBar = false }: AppShellProps) => (
  <div className="flex min-h-screen flex-col bg-background">
    <TopNav />
    <main className={`flex-1 ${hideTabBar ? "" : "pb-20 md:pb-0"}`}>{children}</main>
    {!hideTabBar && <MobileTabBar />}
  </div>
);

export default AppShell;
