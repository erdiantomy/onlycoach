import { useRef, useState } from "react";
import { Share2, Copy, Check, MessageCircle, Twitter, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROD_BASE = "https://onlycoach.co";

export interface ShareProfileButtonProps {
  name: string;
  headline?: string;
  handle: string;
  role: "coach" | "mentee";
  className?: string;
}

export const ShareProfileButton = ({
  name,
  headline,
  handle,
  role,
  className,
}: ShareProfileButtonProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const url = `${PROD_BASE}/${role}/${handle}`;
  const text =
    role === "coach"
      ? `Check out ${name} on OnlyCoach${headline ? ` — ${headline}` : ""}\n${url}`
      : `${name} is on OnlyCoach\n${url}`;

  const nativeShare = async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title: name, text, url });
      return true;
    } catch {
      return false;
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy — try manually");
    }
    setOpen(false);
  };

  const handleMainClick = async () => {
    if (navigator.share) {
      const shared = await nativeShare();
      if (shared) return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleMainClick}
        className={cn(
          "brutal-tag inline-flex items-center gap-1.5 cursor-pointer select-none",
          className,
        )}
      >
        <Share2 className="h-3 w-3" /> Share
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-52 brutal-card-sm bg-surface p-1">
            <ShareItem icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"} onClick={copyLink} />
            <ShareItem
              icon={MessageCircle}
              label="WhatsApp"
              onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                setOpen(false);
              }}
            />
            <ShareItem
              icon={Twitter}
              label="X / Twitter"
              onClick={() => {
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                  "_blank",
                );
                setOpen(false);
              }}
            />
            <ShareItem
              icon={Send}
              label="Telegram"
              onClick={() => {
                window.open(
                  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                  "_blank",
                );
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

const ShareItem = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40"
  >
    <Icon className="h-4 w-4 shrink-0" />
    {label}
  </button>
);

export default ShareProfileButton;
