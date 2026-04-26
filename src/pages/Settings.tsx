import { AppShell } from "@/components/layout/AppShell";

const Settings = () => (
  <AppShell>
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="font-display text-3xl md:text-5xl">Settings</h1>
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

export default Settings;
