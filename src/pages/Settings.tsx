import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  TOPIC_LABELS,
  useNotificationPrefs,
  type Channel,
  type Topic,
} from "@/hooks/useNotificationPrefs";
import { Bell, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const CHANNELS: Array<{ id: Channel; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "email", label: "Email", icon: Mail },
  { id: "push", label: "Push", icon: Bell },
  { id: "sms", label: "SMS", icon: MessageCircle },
];

const Settings = () => {
  const { lang, setLang, t } = useI18n();
  const { prefs, setChannel, reset } = useNotificationPrefs();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="font-display text-3xl md:text-5xl">{t("settings.title")}</h1>

        <section className="brutal-card-sm mt-6 p-5">
          <h2 className="font-display text-xl">{t("settings.language")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.language.helper")}</p>
          <div className="mt-3 flex gap-1">
            {(["en", "id"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                lang === l ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{l === "en" ? "English" : "Bahasa Indonesia"}</button>
            ))}
          </div>
        </section>

        <section className="brutal-card mt-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Notifications</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick how you want to hear from us. Per topic, per channel.
              </p>
            </div>
            <button
              onClick={() => { reset(); toast.success("Reset to defaults"); }}
              className="border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent/50">
              Reset
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="border-b-2 border-ink px-2 py-2">Topic</th>
                  {CHANNELS.map((c) => (
                    <th key={c.id} className="border-b-2 border-ink px-2 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <c.icon className="h-3.5 w-3.5" /> {c.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TOPIC_LABELS) as Topic[]).map((topic) => (
                  <tr key={topic} className="border-b-2 border-ink/10 last:border-0">
                    <td className="px-2 py-3 align-top">
                      <div className="font-semibold">{TOPIC_LABELS[topic].title}</div>
                      <div className="text-xs text-muted-foreground">{TOPIC_LABELS[topic].helper}</div>
                    </td>
                    {CHANNELS.map((c) => (
                      <td key={c.id} className="px-2 py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={prefs[topic][c.id]}
                            onChange={(e) => {
                              setChannel(topic, c.id, e.target.checked);
                            }}
                            aria-label={`${TOPIC_LABELS[topic].title} via ${c.label}`}
                            className="h-4 w-4 border-2 border-ink"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Push notifications also require your device to grant permission.
          </p>
        </section>

        {[
          { title: "Profile", body: "Display name, avatar, bio." },
          { title: "Account", body: "Email, password, connected accounts." },
          { title: "Billing", body: "Payment methods, active subscriptions, invoices." },
          { title: "Payouts", body: "Coach payout settings." },
        ].map((s) => (
          <section key={s.title} className="brutal-card-sm mt-4 p-5">
            <h2 className="font-display text-xl">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            <button className="mt-3 border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
              Manage
            </button>
          </section>
        ))}
      </div>
    </AppShell>
  );
};

export default Settings;
