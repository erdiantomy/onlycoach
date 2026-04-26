
# Rounds 2–6: Build everything to launch

The previous turn dropped me back into plan mode and Lovable Cloud isn't enabled yet. Approve this plan and I'll execute all five rounds end-to-end in the next message.

## Round 2 — Cloud + Auth + Profiles

- Enable **Lovable Cloud** (DB, auth, storage, edge functions, realtime)
- Migration: `app_role` enum (`coach`, `mentee`, `admin`); tables `profiles`, `user_roles`, `coach_profiles`, `subscription_tiers`; trigger to auto-create profile on signup; `has_role()` SECURITY DEFINER; RLS on every table
- Auth pages (`/auth`) — email + password, Google sign-in, password reset, `/reset-password` page
- Onboarding flow — pick role (coach/mentee), set handle, bio, avatar (uploads to `avatars` bucket)
- `useSession` hook + protected routes; replace mock "Me" with the real signed-in user

## Round 3 — Discovery + Coach Studio

- `/discover` — wired to `coach_profiles` with niche + search filters, server-side pagination
- `/coach/:handle` — public profile pulled from DB, tier picker, sample posts
- `/studio` — coach dashboard (stats from DB), post list
- `/studio/post/new` — create post (text/image/video/PDF) → `posts` + `post_media` tables, `post-media` private bucket, choose required tier
- Tier management page so coaches can edit their `subscription_tiers`

## Round 4 — Subscriptions + Gated Feed

- Run `recommend_payment_provider` → enable **Stripe Payments** (built-in)
- Create products/prices via `batch_create_product` for each coach tier
- Edge functions:
  - `create-subscription-checkout` — checkout session for a tier
  - `stripe-webhook` — `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid` → updates `subscriptions` table
  - `signed-media-url` — verifies active subscription before issuing a signed URL for `post-media`
- `/feed` — live posts from coaches the mentee subscribes to; locked posts show blurred preview + Subscribe CTA
- Likes + comments tables with RLS

## Round 5 — Realtime DMs

- Tables: `conversations`, `messages` with RLS that requires an active subscription between the two users
- Realtime channel per conversation via Lovable Cloud realtime
- Inbox + thread UI wired to live data, optimistic send, typing indicator, read receipts
- Image attachments via `message-attachments` private bucket

## Round 6 — Bookings + Launch Polish

- Tables: `availability_slots`, `bookings` (with `stripe_payment_intent_id`, `meeting_url`)
- Edge function `create-booking-checkout` (Stripe one-time payment)
- Webhook updates booking status; generates a Jitsi/Daily meeting link
- Coach UI: define recurring availability + per-session price/duration
- Mentee UI: pick slot → checkout → see in `/sessions`
- **Launch polish:**
  - Capacitor splash screen + app icon generated from logo
  - Native safe-area audit on every screen
  - Pull-to-refresh on feed/messages
  - Error boundaries + 404 polish
  - Run `security--run_security_scan`, fix any findings
  - SEO meta + sitemap on landing
  - `/terms` and `/privacy` placeholder pages

## What you need to know

- **Pro plan required** for Stripe Payments live mode (test mode works on any plan)
- After approval I'll prompt the Stripe enable flow once — the Lovable picker handles the rest, no API keys needed
- Auth uses email + password and Google by default (Apple/SAML can be added later)
- Roles always live in `user_roles` (never on profiles) and are checked via `has_role()` to prevent privilege escalation
- All UI keeps using the existing design system tokens — zero visual drift across web, mobile web, and Capacitor

After Round 6 we run a final build + security scan and the app is ready to publish.
