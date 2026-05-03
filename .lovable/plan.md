# OnlyCoach Pre-Launch Plan

Large scope. I'll execute in priority order (P0 → P3). Each phase ends in a working state so we can pause/ship between them.

## Phase P0a — Kill `lib/mock.ts` from pages

Convert every page reading mock data to live Supabase via TanStack Query.

- **Discover** — query `profiles` ⋈ `coach_profiles!inner(is_published=true)` ⋈ active `subscription_tiers`. Keep search + niche filters client-side over the result. Map to existing `CoachCard` shape.
- **CoachProfile** — `useParams<{handle}>()`, query by handle, `.maybeSingle()`, render `<NotFound/>` on null. Render real tiers/bio/headline/rating. Keep current `activeSub` lookup.
- **Feed** — query `posts` ⋈ `profiles` where `coach_id IN (mentee's active subs)`. RLS already gates locked posts. Empty state CTA → `/discover`.
- **Messages** — wire `conversations`/`messages` with realtime channel `messages:conversation_id=eq.<id>`. Replace stub with real insert. Add `last_read_at` column via migration (does not exist yet) and update on thread open.
- **Sessions** — query `bookings` ⋈ coach `profiles` for current user as mentee, split by status. Join button opens `meeting_url`.
- **Me** — replace `coaches.slice(0,2)` with `subscriptions` ⋈ coach `profiles` (active only).

Acceptance: no `lib/mock.ts` imports remain in `src/pages/`.

## Phase P0b — Coach Studio UIs

- **`/studio/tiers`** — list/create/edit/archive `subscription_tiers`. IDR integer ≥10,000. On create call existing Stripe + Xendit edge functions to populate `stripe_price_id`/`xendit_plan_id`. Block hard delete if subs reference it (soft archive `is_active=false`).
- **`/studio/availability`** — list + create `availability_slots`; sortable list (no calendar). Auto-hide past slots in query.
- **Studio dashboard widgets** — replace placeholders with real counts (subs, MRR sum, posts, unread DMs).
- **`/studio/subscribers`** — table + CSV export.
- **`/studio/payouts`** — read `payouts` table; lifetime + pending in IDR; Connect-account CTA.
- **`/studio/analytics`** — numeric tiles for revenue / subs / churn 7d/30d/all from `subscriptions` + `processed_webhook_events`.
- **`/studio/broadcast`** — textarea + audience count + fan-out insert into one message per active-subscriber conversation.
- Remove `/studio/referrals` and `/studio/challenges` from nav (keep routes 404 or redirect).

## Phase P0c — Real post uploads

- Hidden `<input type=file>` per media kind with mimetype + size limits (image 25MB, video 200MB, pdf 25MB).
- Call `signed-media-url` edge function for PUT URL → upload to `post-media` bucket → insert `posts` + `post_media`.
- XHR progress bar, inline preview pre-publish.
- Validate caption ≤2000 chars, tier ownership, then redirect to `/studio` with sonner toast.

## Phase P1 — Payments & subscription mgmt

- **Coach payout onboarding** in `/settings` (coach-only): Stripe Express via new edge function (creates account + AccountLink, returns to `/settings?stripe_onboarded=1`, persists `stripe_account_id` + `payouts_enabled` in `coach_billing` — needs migration to add `payouts_enabled bool`). Xendit equivalent or hide. Block paid-tier creation when `payouts_enabled=false` with banner.
- **Mentee `/settings → Subscriptions`**: list active subs with switch tier modal + cancel (existing edge fn). Payment history (last 12 from `processed_webhook_events` or new `invoices` view). "Update payment method" → Stripe Customer Portal edge fn.
- **Notification preferences**: migration for `notification_preferences` table (user_id PK + email_*/push_* bools). Settings UI bound to it. `send-transactional-email` edge function reads it before dispatch.

## Phase P1b — Email branding

Use Lovable Emails (built-in). Will set up sender domain via the email setup dialog, scaffold auth email templates (branded copy "Confirm your ONLY/COACH account" / "Reset your ONLY/COACH password"), deploy `auth-email-hook`. Replace `hello@`/`privacy@` placeholders in legal pages once domain confirmed.

## Phase P2

- **Apple OAuth**: wire `signInWithOAuth({provider:'apple'})`. (User confirmed earlier — keeping the button.)
- **Avatar upload**: Settings → Profile, square crop ≤2MB, store in `avatars` bucket → `profiles.avatar_url`.
- **i18n**: keep current `lib/i18n.tsx` (en/id already wired). Audit hardcoded strings touched in this PR and run them through `t()`. Full coverage out of scope for launch — document gaps.
- **Capacitor**: run `npm run mobile:preflight`, fix warnings; verify `isCheckoutBlockedOnDevice` + `ManageOnWebNotice` on iOS subscribe flows; replace `window.open` with `Browser.open` from `@capacitor/browser`; deep-link AASA + assetlinks under `public/.well-known/`.

## Phase P3 — Polish

- **Bundle**: vite `manualChunks` (supabase, react-router, lucide); lazy-load all `/studio/*` and `/admin/*` routes with `React.lazy` + Suspense.
- **SEO**: add `react-helmet-async`, sibling `usePageMeta` hook for description/OG/Twitter; per-route meta. Build-time `sitemap.xml` script (discover + each published coach handle); update `robots.txt`.
- **NotFound**: render inside `AppShell` with discover suggestion.
- **Moderation**: migration for `reports` table (reporter_id, target_type, target_id, reason, status); migration for `blocks` table (blocker_id, blocked_id). Report button on profiles/posts, block/mute action, hide blocked content in Feed/Messages queries. Admin panel already exists — add reports list with resolve/suspend actions. Add `/community-guidelines` page linked from `/terms`.

## Phase P3b — QA

Manual E2E walkthroughs (mentee + coach + edge cases) per spec, fix bugs.

## Migrations summary

```text
- conversations.last_read_at timestamptz
- coach_billing.payouts_enabled bool default false
- notification_preferences (full table + RLS)
- reports (table + RLS + admin policies)
- blocks (table + RLS)
```

## Hard rules I'll respect

- All prices via `formatCurrency` from `@/lib/currency` (IDR default)
- All schema changes via new `supabase/migrations/<ts>_*.sql` files
- `RequireRole` stays on coach-only routes
- Sonner toasts only (no shadcn `useToast` for new code)
- Never edit `src/integrations/supabase/{client,types}.ts`

## Suggested execution order in build mode

Given scope (~40+ files, ~6 migrations, several edge functions), I recommend executing **Phase P0a → P0b → P0c** in the first build run (the launch-blocking core), then pausing for you to QA before continuing to P1+. Reply with which phases to tackle in the first run, or "all P0" to start there.