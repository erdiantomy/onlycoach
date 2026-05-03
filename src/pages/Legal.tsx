import { AppShell } from "@/components/layout/AppShell";
import { usePageTitle } from "@/hooks/usePageTitle";

const Terms = () => (
  <>
    <p>
      <strong>Last updated:</strong> May 2026.
    </p>
    <p>
      ONLY/COACH ("we", "us") operates a peer-to-peer coaching platform that
      connects independent coaches with paying mentees. By creating an account
      or using the service you agree to these Terms.
    </p>
    <h2>1. Eligibility</h2>
    <p>
      You must be at least 18 years old, or the age of majority in your
      jurisdiction, to create an account. Coaches are independent
      professionals; we do not employ them and we do not guarantee outcomes.
    </p>
    <h2>2. Subscriptions and bookings</h2>
    <p>
      Coaches set their own subscription tiers and 1:1 session prices. Payment
      is processed by our payment partners (Stripe and Xendit). Subscriptions
      renew monthly until cancelled; cancellations take effect at the end of
      the current billing period.
    </p>
    <h2>3. Refunds</h2>
    <p>
      Subscription payments are non-refundable except where required by law.
      For 1:1 sessions, refunds and rescheduling are at the coach's
      discretion if cancelled outside the coach's stated cancellation window.
    </p>
    <h2>4. Content</h2>
    <p>
      Coaches retain ownership of the content they post. By posting content
      you grant us a non-exclusive licence to host, distribute, and display it
      to your subscribers in connection with the service. You are responsible
      for the content you post.
    </p>
    <h2>5. Acceptable use</h2>
    <p>
      No medical advice presented as a substitute for a licensed professional;
      no harassment; no scraping; no resale of subscriber-only content. We may
      suspend accounts that violate these rules.
    </p>
    <h2>6. Termination</h2>
    <p>
      You may close your account at any time from Settings. We may suspend or
      terminate accounts for violations of these Terms. Active subscriptions
      survive termination only to the extent required to honour the current
      billing period.
    </p>
    <h2>7. Changes</h2>
    <p>
      We may update these Terms from time to time. We'll notify you in-app or
      by email when material changes take effect.
    </p>
    <h2>8. Contact</h2>
    <p>
      Questions: <a href="mailto:hello@onlycoach.co">hello@onlycoach.co</a>.
    </p>
  </>
);

const Privacy = () => (
  <>
    <p>
      <strong>Last updated:</strong> May 2026.
    </p>
    <p>
      This policy explains what data we collect, why, and what choices you
      have. ONLY/COACH is the controller for the personal data described
      below.
    </p>
    <h2>1. What we collect</h2>
    <ul>
      <li>Account data: email, display name, handle, password hash.</li>
      <li>Profile data you choose to add: avatar, bio, headline, niche.</li>
      <li>Coaching activity: posts, comments, likes, messages, bookings.</li>
      <li>Payment metadata from Stripe / Xendit (we never store card numbers).</li>
      <li>Device and log data needed to keep the service running and secure.</li>
    </ul>
    <h2>2. How we use it</h2>
    <p>
      To run the service, process payments, deliver coach content to
      subscribers, send transactional email, prevent abuse, and meet legal
      obligations. We do not sell your data.
    </p>
    <h2>3. Sharing</h2>
    <p>
      We share data with the processors required to run the service: our
      hosting and database provider (Supabase), our payment processors
      (Stripe and Xendit), and our email provider. Each receives only what
      they need.
    </p>
    <h2>4. Retention</h2>
    <p>
      We keep account data while your account is active and for up to 30 days
      after deletion to handle disputes. Payment records are retained as
      required by tax and accounting law.
    </p>
    <h2>5. Your rights</h2>
    <p>
      You can access, correct, export, or delete your data from Settings, or
      by emailing us. We respond to verifiable requests within 30 days.
    </p>
    <h2>6. International transfers</h2>
    <p>
      Our processors may store data outside your country of residence. We
      rely on standard contractual clauses where applicable.
    </p>
    <h2>7. Contact</h2>
    <p>
      Questions: <a href="mailto:privacy@onlycoach.co">privacy@onlycoach.co</a>.
    </p>
  </>
);

const Legal = ({ kind }: { kind: "terms" | "privacy" }) => {
  usePageTitle(kind === "terms" ? "Terms of Service" : "Privacy Policy");
  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl">
          {kind === "terms" ? "Terms of Service" : "Privacy Policy"}
        </h1>
        <article className="prose prose-sm mt-6 max-w-none">
          {kind === "terms" ? <Terms /> : <Privacy />}
        </article>
      </div>
    </AppShell>
  );
};

export default Legal;
