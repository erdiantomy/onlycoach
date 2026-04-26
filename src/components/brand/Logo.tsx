import { cn } from "@/lib/utils";
import logoSrc from "@/assets/only-coach-logo.svg";

interface LogoProps {
  className?: string;
  /**
   * `stacked` and `inline` are kept for backwards compatibility; both now
   * render the official ONLY/COACH wordmark SVG. Sizing is controlled via
   * `className` (height utilities like `h-8`, `h-10`, etc.).
   */
  variant?: "stacked" | "inline";
}

/**
 * Official ONLY/COACH wordmark.
 * Uses the brand SVG so it renders identically on web and inside the
 * Capacitor WebView, and scales crisply at any size.
 */
export const Logo = ({ className, variant = "inline" }: LogoProps) => {
  const defaultSize = variant === "stacked" ? "h-16 w-auto" : "h-8 w-auto";

  return (
    <img
      src={logoSrc}
      alt="ONLY COACH"
      className={cn(defaultSize, "select-none", className)}
      draggable={false}
    />
  );
};

export default Logo;
