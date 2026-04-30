import { AppShell } from "@/components/layout/AppShell";

const LAST_UPDATED = "30 April 2026";
const COMPANY = "PT ONLY COACH INDONESIA";
const EMAIL = "legal@onlycoach.co";

const Terms = () => (
  <article className="prose prose-sm mt-8 max-w-none">
    <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

    <h2>1. Acceptance of Terms</h2>
    <p>
      By creating an account or using ONLY/COACH (the "Platform"), operated by {COMPANY}
      ("Company", "we", "us"), you agree to be bound by these Terms of Service ("Terms").
      If you do not agree, do not use the Platform.
    </p>

    <h2>2. User Accounts</h2>
    <p>
      You must be at least 18 years old to create an account. You are responsible for
      maintaining the confidentiality of your login credentials and for all activities that
      occur under your account. You agree to provide accurate and current information during
      registration and to update it as necessary.
    </p>

    <h2>3. Two-sided Platform — Coaches and Mentees</h2>
    <p>
      The Platform connects independent coaches ("Coaches") with subscribers ("Mentees").
      Coaches are independent contractors, not employees or agents of the Company. The Company
      does not endorse any Coach or guarantee the quality, accuracy, or legality of any content.
      The coaching relationship is solely between the Coach and the Mentee.
    </p>

    <h2>4. Subscriptions and Billing</h2>
    <p>
      Mentees may subscribe to Coaches at price tiers set by each Coach. Subscriptions are
      billed monthly in advance in Indonesian Rupiah (IDR). Payments are processed by
      Stripe (global) or Xendit (Southeast Asia region) on behalf of the Company. By
      subscribing, you authorise recurring charges until cancellation.
    </p>

    <h2>5. Cancellation and Refund Policy</h2>
    <p>
      You may cancel your subscription at any time. Access continues until the end of the
      current billing period. The Company does not issue refunds for partial periods, except
      where required by applicable Indonesian consumer protection law. Refund requests must
      be submitted within 7 days of the charge to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
    </p>

    <h2>6. Coach Payouts</h2>
    <p>
      The Company retains a platform fee (currently 15–20%, as displayed in the Coach's
      Studio dashboard) from each subscription payment. Coaches receive the remainder via
      bank transfer to the account registered in their payout settings. Payouts are
      processed on the schedule selected by the Coach (weekly, biweekly, or monthly),
      subject to a minimum payout threshold of Rp100.000.
    </p>

    <h2>7. Content Ownership and Licence</h2>
    <p>
      Coaches retain ownership of all content they post. By posting content, Coaches grant
      the Company a non-exclusive, worldwide, royalty-free licence to display that content
      to authorised subscribers on the Platform. Mentees may not reproduce, redistribute,
      or resell Coach content.
    </p>

    <h2>8. Prohibited Content</h2>
    <p>The following are strictly prohibited on the Platform:</p>
    <ul>
      <li>Content that is illegal under Indonesian law</li>
      <li>Sexually explicit or pornographic material</li>
      <li>Hate speech, harassment, or threats</li>
      <li>Medical or financial advice presented as professional consultation</li>
      <li>Misinformation about health, fitness, or nutrition that could cause harm</li>
      <li>Content that infringes third-party intellectual property rights</li>
    </ul>

    <h2>9. Platform Liability Limitation</h2>
    <p>
      To the maximum extent permitted by Indonesian law, the Company is not liable for any
      indirect, incidental, or consequential damages arising from your use of the Platform,
      including but not limited to personal injury resulting from fitness advice, financial
      losses from coaching decisions, or data loss. Our total liability shall not exceed the
      amount you paid to us in the 12 months preceding the claim.
    </p>

    <h2>10. Dispute Resolution</h2>
    <p>
      These Terms are governed by the laws of the Republic of Indonesia. Any dispute shall
      first be submitted to mediation under the auspices of BANI Arbitration Center. If
      mediation fails within 30 days, disputes shall be resolved by the competent court in
      South Jakarta.
    </p>

    <h2>11. Changes to Terms</h2>
    <p>
      We may update these Terms at any time. We will notify you by email or in-app notice
      at least 14 days before material changes take effect. Continued use after the
      effective date constitutes acceptance.
    </p>

    <h2>12. Contact</h2>
    <p>
      {COMPANY} · <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
    </p>
  </article>
);

const Privacy = () => (
  <article className="prose prose-sm mt-8 max-w-none">
    <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

    <h2>1. Who We Are</h2>
    <p>
      {COMPANY} operates ONLY/COACH. This Privacy Policy explains how we collect, use, and
      protect your personal data when you use the Platform.
    </p>

    <h2>2. Data We Collect</h2>
    <ul>
      <li><strong>Account data:</strong> name, email address, password hash, profile photo</li>
      <li><strong>Profile data:</strong> handle, bio, headline, niche (for Coaches)</li>
      <li><strong>Payment data:</strong> billing country and currency — card details are tokenised by Stripe or Xendit and never stored on our servers</li>
      <li><strong>Usage data:</strong> pages visited, posts viewed, content interactions, session timestamps</li>
      <li><strong>Device data:</strong> IP address, browser type, operating system, device identifiers</li>
      <li><strong>Communications:</strong> messages sent between Coaches and Mentees on the Platform</li>
    </ul>

    <h2>3. How We Use Your Data</h2>
    <ul>
      <li>Providing, operating, and improving the Platform</li>
      <li>Processing subscription payments and coach payouts</li>
      <li>Sending transactional emails (receipts, password resets, subscription notices)</li>
      <li>Detecting and preventing fraud, abuse, and security incidents</li>
      <li>Generating anonymised aggregate analytics for product decisions</li>
    </ul>

    <h2>4. Data Sharing</h2>
    <p>We share your data only with:</p>
    <ul>
      <li><strong>Payment processors:</strong> Stripe (US) and Xendit (Indonesia/SEA) — to process transactions</li>
      <li><strong>Cloud infrastructure:</strong> Supabase (database, auth, storage) hosted on AWS ap-southeast-1</li>
      <li><strong>Analytics:</strong> anonymised, aggregated usage data only — no personal identifiers</li>
      <li><strong>Legal requirements:</strong> when required by Indonesian law or court order</li>
    </ul>
    <p>We do not sell your personal data to third parties.</p>

    <h2>5. Cookies and Tracking</h2>
    <p>
      We use essential cookies for authentication (session tokens). We do not use third-party
      advertising cookies. You may disable non-essential cookies in your browser settings
      without affecting core functionality.
    </p>

    <h2>6. Your Rights</h2>
    <p>Under Indonesian Personal Data Protection Law (UU PDP), you have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you</li>
      <li>Correct inaccurate data</li>
      <li>Request deletion of your data (subject to legal retention requirements)</li>
      <li>Withdraw consent for optional data processing</li>
      <li>Lodge a complaint with the relevant authority</li>
    </ul>
    <p>
      To exercise these rights, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> with the
      subject "Privacy Request".
    </p>

    <h2>7. Data Retention</h2>
    <p>
      Account data is retained for the duration of your account and for 5 years after
      deletion for legal and tax compliance purposes. Payment records are retained for
      7 years per Indonesian tax regulation. Message content is deleted 90 days after
      account deletion.
    </p>

    <h2>8. Security</h2>
    <p>
      We use industry-standard security measures including TLS encryption in transit,
      AES-256 encryption at rest for sensitive data, and row-level security policies on
      our database. No security system is perfect; please use a strong, unique password.
    </p>

    <h2>9. Children's Privacy</h2>
    <p>
      The Platform is not directed to individuals under 18. We do not knowingly collect
      data from minors. If you believe a minor has registered, contact us at {EMAIL} and
      we will delete the account promptly.
    </p>

    <h2>10. Changes to This Policy</h2>
    <p>
      We will notify you of material changes via email or in-app notice 14 days in advance.
      The "Last updated" date at the top of this page reflects the most recent revision.
    </p>

    <h2>11. Contact</h2>
    <p>
      {COMPANY} · Data Controller · <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
    </p>
  </article>
);

const Legal = ({ kind }: { kind: "terms" | "privacy" }) => (
  <AppShell hideTabBar>
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl">
        {kind === "terms" ? "Terms of Service" : "Privacy Policy"}
      </h1>
      {kind === "terms" ? <Terms /> : <Privacy />}
    </div>
  </AppShell>
);

export default Legal;
