import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { lang, setLang, t } = useI18n();

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

        {[
          { title: "Profile", body: "Display name, avatar, bio." },
          { title: "Account", body: "Email, password, connected accounts." },
          { title: "Billing", body: "Payment methods, active subscriptions, invoices." },
          { title: "Payouts", body: "Coach payout settings." },
          { title: "Notifications", body: "Email + push notification preferences." },
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
