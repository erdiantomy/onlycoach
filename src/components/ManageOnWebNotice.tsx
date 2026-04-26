import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openOnWeb } from "@/lib/platform";

interface ManageOnWebNoticeProps {
  /** Path on the web app to open, e.g. "/c/coach-handle". Defaults to "/". */
  path?: string;
  /** Headline. Default: "Manage on web". */
  title?: string;
  /** Body copy. Default explains App Store policy. */
  description?: string;
  /** CTA label. Default: "Open on web". */
  ctaLabel?: string;
  className?: string;
}

/**
 * Replaces in-app payment CTAs on native iOS to comply with App Store
 * Review Guideline 3.1.1 (no external purchase mechanisms in-app for
 * digital goods). Surfaces a clear "Manage on Web" button that opens the
 * relevant flow in the system browser.
 */
export const ManageOnWebNotice = ({
  path = "/",
  title = "Manage on web",
  description = "Subscriptions and bookings are managed on our website. Tap below to open in your browser.",
  ctaLabel = "Open on web",
  className = "",
}: ManageOnWebNoticeProps) => {
  return (
    <div className={`border-2 border-ink bg-surface p-4 ${className}`}>
      <h4 className="font-display text-base">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <Button
        type="button"
        onClick={() => openOnWeb(path)}
        className="mt-3 w-full border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        {ctaLabel}
      </Button>
    </div>
  );
};
