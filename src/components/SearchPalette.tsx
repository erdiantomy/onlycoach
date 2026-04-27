import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCoaches } from "@/hooks/useCoaches";
import { challenges } from "@/lib/mock";
import {
  BarChart3,
  Banknote,
  Bell,
  Bookmark,
  Compass,
  CreditCard,
  FileText,
  Flame,
  Gift,
  Home as HomeIcon,
  MessageCircle,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
  User,
  Users,
} from "lucide-react";

type Result = {
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
};

const NAV_ITEMS: Result[] = [
  { label: "Home",           to: "/",                     icon: HomeIcon },
  { label: "Discover",       to: "/discover",             icon: Compass },
  { label: "Trending",       to: "/trending",             icon: Flame },
  { label: "Feed",           to: "/feed",                 icon: HomeIcon },
  { label: "Saved posts",    to: "/saved",                icon: Bookmark },
  { label: "Notifications",  to: "/notifications",        icon: Bell },
  { label: "Messages",       to: "/messages",             icon: MessageCircle },
  { label: "Sessions",       to: "/sessions",             icon: User },
  { label: "Challenges",     to: "/challenges",           icon: Trophy },
  { label: "Community",      to: "/community",            icon: Users },
  { label: "Profile",        to: "/me",                   icon: User },
  { label: "Billing",        to: "/billing",              icon: CreditCard },
  { label: "Settings",       to: "/settings",             icon: SettingsIcon },
];

const STUDIO_ITEMS: Result[] = [
  { label: "Studio",         to: "/studio",               icon: Sparkles },
  { label: "Analytics",      to: "/studio/analytics",     icon: BarChart3 },
  { label: "Subscribers",    to: "/studio/subscribers",   icon: Users },
  { label: "Content",        to: "/studio/content",       icon: FileText },
  { label: "Tiers",          to: "/studio/tiers",         icon: Sparkles },
  { label: "Payouts",        to: "/studio/payouts",       icon: Banknote },
  { label: "Referrals",      to: "/studio/referrals",     icon: Gift },
  { label: "Challenges",     to: "/studio/challenges",    icon: Trophy },
  { label: "Broadcast",      to: "/studio/broadcast",     icon: MessageCircle },
];

/**
 * Cmd-K / Ctrl-K global search palette.
 *
 * Pulls coaches from useCoaches() so search hits real DB rows when
 * available, and falls back to mock data otherwise. Also indexes
 * cohorts and every navigation entry so the palette doubles as
 * keyboard nav.
 *
 * Mounted once in AppShell so it works on every screen.
 */
export const SearchPalette = () => {
  const navigate = useNavigate();
  const { coaches } = useCoaches();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search coaches, challenges, pages…" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
            <SearchIcon className="h-5 w-5" /> Nothing matches yet.
          </div>
        </CommandEmpty>

        {coaches.length > 0 && (
          <CommandGroup heading="Coaches">
            {coaches.slice(0, 8).map((c) => (
              <CommandItem
                key={c.id}
                value={`coach ${c.name} ${c.handle} ${c.niche} ${c.headline}`}
                onSelect={() => go(`/coach/${c.handle}`)}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <span className="font-display">{c.name}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {c.niche}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">@{c.handle}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Challenges">
          {challenges.map((ch) => (
            <CommandItem
              key={ch.id}
              value={`challenge ${ch.title} ${ch.description}`}
              onSelect={() => go(`/challenges/${ch.id}`)}
            >
              <Trophy className="mr-2 h-4 w-4" />
              <span className="flex-1">{ch.title}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {ch.durationDays}d
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((n) => (
            <CommandItem
              key={n.to}
              value={`nav ${n.label}`}
              onSelect={() => go(n.to)}
            >
              <n.icon className="mr-2 h-4 w-4" /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Studio">
          {STUDIO_ITEMS.map((n) => (
            <CommandItem
              key={n.to}
              value={`studio ${n.label}`}
              onSelect={() => go(n.to)}
            >
              <n.icon className="mr-2 h-4 w-4" /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default SearchPalette;
