import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Prefs = {
  email_new_subscriber: boolean;
  email_new_message: boolean;
  email_booking_reminder: boolean;
  email_payout: boolean;
  email_marketing: boolean;
  push_new_message: boolean;
  push_new_subscriber: boolean;
  push_booking_reminder: boolean;
};

const DEFAULTS: Prefs = {
  email_new_subscriber: true,
  email_new_message: true,
  email_booking_reminder: true,
  email_payout: true,
  email_marketing: false,
  push_new_message: true,
  push_new_subscriber: true,
  push_booking_reminder: true,
};

const EMAIL_ROWS: { key: keyof Prefs; label: string; helper: string }[] = [
  { key: "email_new_subscriber", label: "New subscriber", helper: "When someone joins one of your tiers." },
  { key: "email_new_message", label: "New message", helper: "Direct messages from coaches or mentees." },
  { key: "email_booking_reminder", label: "Booking reminders", helper: "Heads-up before sessions start." },
  { key: "email_payout", label: "Payouts", helper: "When a payout is sent to your bank." },
  { key: "email_marketing", label: "Product updates", helper: "Occasional news and feature drops." },
];

const PUSH_ROWS: { key: keyof Prefs; label: string; helper: string }[] = [
  { key: "push_new_message", label: "New message", helper: "Push when a new message arrives." },
  { key: "push_new_subscriber", label: "New subscriber", helper: "Push when someone subscribes." },
  { key: "push_booking_reminder", label: "Booking reminders", helper: "Push before sessions start." },
];

const Toggle = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 items-center border-2 border-ink shadow-brutal-sm transition-colors",
      on ? "bg-accent" : "bg-surface",
      disabled && "opacity-60",
    )}
  >
    <span
      className={cn(
        "inline-block h-4 w-4 border-2 border-ink bg-background transition-transform",
        on ? "translate-x-6" : "translate-x-1",
      )}
    />
  </button>
);

const Notifications = () => {
  const { user } = useSession();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { user_id: _u, updated_at: _ua, ...rest } = data as Prefs & { user_id: string; updated_at: string };
          setPrefs({ ...DEFAULTS, ...rest });
        }
        setLoading(false);
      });
  }, [user]);

  const toggle = async (key: keyof Prefs) => {
    if (!user) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(null);
    if (error) {
      setPrefs(prefs);
      toast.error("Couldn't save preference");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <header className="mt-4 mb-8">
          <span className="brutal-tag mb-3"><Bell className="h-3 w-3" /> Notifications</span>
          <h1 className="font-display text-3xl md:text-5xl">Notifications</h1>
          <p className="mt-2 text-muted-foreground">Pick what reaches your inbox and your phone.</p>
        </header>

        {loading ? (
          <div className="brutal-card p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <section className="brutal-card p-5">
              <h2 className="font-display text-xl">Email</h2>
              <ul className="mt-4 divide-y-2 divide-ink/10">
                {EMAIL_ROWS.map((r) => (
                  <li key={r.key} className="flex items-center gap-4 py-3">
                    <div className="flex-1">
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.helper}</div>
                    </div>
                    <Toggle on={prefs[r.key]} onClick={() => toggle(r.key)} disabled={saving === r.key} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="brutal-card mt-6 p-5">
              <h2 className="font-display text-xl">Push</h2>
              <ul className="mt-4 divide-y-2 divide-ink/10">
                {PUSH_ROWS.map((r) => (
                  <li key={r.key} className="flex items-center gap-4 py-3">
                    <div className="flex-1">
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.helper}</div>
                    </div>
                    <Toggle on={prefs[r.key]} onClick={() => toggle(r.key)} disabled={saving === r.key} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Push notifications require the mobile app. Enable them in your device settings too.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Notifications;
