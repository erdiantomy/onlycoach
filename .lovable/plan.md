
# ONLY/COACH — MVP Plan

A peer-to-peer coaching platform (OnlyFans-style) where coaches publish gated content and mentees subscribe to unlock posts, DM their coach, and book live sessions. One codebase, one design system, rendered consistently on desktop web, mobile web, and a Capacitor-wrapped iOS/Android app.

## 1. Design system (the foundation for UI consistency)

Locked in from the prototype + logo so every screen — web and native — looks identical.

- **Palette (HSL tokens in `index.css`)**
  - `--background` sand `#d9d3bc`
  - `--card` cream `#f3eedd`
  - `--primary` deep forest `#1f3d2e`
  - `--accent` gold `#e8c674`
  - `--ink` near-black `#141414` (borders + headings)
  - `--muted-foreground` warm grey
- **Typography**: heavy condensed display (logo wordmark feel) for headings, clean grotesk for body. Loaded from Google Fonts.
- **Components**: brutalist-editorial — 2px black borders, hard shadows, square-ish corners (radius 4px), gold "primary action" buttons, forest-green "secondary" buttons, cream cards on sand background.
- All shadcn components retheme via tokens — no hardcoded colors anywhere.
- **Logo**: `ONLY/COACH` SVG component (outline + solid weight mix, green "COACH").

## 2. Information architecture

```text
/                       Landing (hero, how it works, featured coaches, CTA)
/auth                   Sign in / sign up (email+password + Google)
/onboarding             Choose role: Coach or Mentee → role-specific setup
/discover               Browse + search coaches (filter by niche, price)
/coach/:handle          Public coach profile (bio, tiers, sample posts, reviews)
/feed                   Mentee home: posts from subscribed coaches
/messages               DM inbox + thread view
/sessions               Bookings (upcoming + past), calendar
/studio                 Coach dashboard (posts, subscribers, earnings, sessions)
/studio/post/new        Create post (text/image/video/PDF, set tier lock)
/settings               Profile, payouts, notifications
```

Single bottom-tab nav on mobile/native (Discover · Feed · Messages · Sessions · Me), top nav on desktop — same routes, responsive shell.

## 3. Core features (v1)

**Discovery + paid subscriptions**
- Browse coaches with cover image, niche tag, price, rating
- Coach profile shows tiers (e.g. Basic / Pro / VIP, monthly)
- Subscribe via Stripe Checkout → unlocks coach's gated content + DMs
- Auto-renewing subscriptions; cancel anytime from settings

**Content feed**
- Coach posts text, images, video, PDFs; chooses required tier
- Mentee feed aggregates posts from all active subscriptions, newest first
- Locked posts show blurred preview + "Subscribe to unlock" CTA
- Likes + comments per post

**Direct messaging**
- 1:1 chat between mentee and coach (subscription required to initiate)
- Realtime via Lovable Cloud realtime channels
- Image attachments, read receipts, typing indicator

**Live session bookings**
- Coach defines availability slots + per-session price/duration
- Mentee picks a slot, pays via Stripe Checkout, gets confirmation + meeting link
- Both sides see upcoming/past sessions in `/sessions`

## 4. Backend (Lovable Cloud)

**Auth**: email+password + Google. `profiles` table auto-created via trigger; separate `user_roles` table (`coach` | `mentee` | `admin`) with `has_role()` security-definer function for RLS.

**Tables (with RLS)**
- `profiles` — display name, avatar, bio, handle
- `user_roles` — role per user
- `coach_profiles` — niche, headline, cover image, payout status
- `subscription_tiers` — coach_id, name, price, perks
- `subscriptions` — mentee_id, coach_id, tier_id, stripe_sub_id, status, current_period_end
- `posts` — coach_id, body, media, required_tier_id, created_at
- `post_media` — post_id, type, storage_path
- `post_likes`, `post_comments`
- `conversations`, `messages`
- `availability_slots`, `bookings` (with stripe_payment_intent_id, meeting_url)
- `payouts` (read-only ledger for coaches)

**Storage buckets**: `avatars` (public), `post-media` (private, signed URLs gated by active subscription check), `message-attachments` (private).

**Edge functions**
- `create-subscription-checkout` — Stripe Checkout Session for a tier
- `create-booking-checkout` — Stripe Checkout Session for a slot
- `stripe-webhook` — handle `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid`
- `signed-media-url` — verifies active subscription before issuing signed URL for gated media

**Payments**: Lovable's built-in Stripe Payments (no API keys needed). Connected accounts / payouts to coaches handled via Stripe.

## 5. Mobile / native consistency (iOS + Android)

Set up **Capacitor from day one** so every screen is verified for native from the start:
- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `capacitor.config.ts` with the project's app ID + hot-reload server URL pointing at the Lovable sandbox
- Mobile-first responsive layouts (375px baseline → up)
- Native-safe areas via `env(safe-area-inset-*)` on the bottom tab bar and headers
- Touch targets ≥44px, swipe-friendly lists, sheet/drawer modals on mobile, dialog on desktop
- Same React components render in browser and inside the Capacitor WebView — single source of truth = consistent UX

After plan approval, the user will be given the standard Capacitor handoff steps (export to GitHub, `npx cap add ios/android`, `npx cap sync`, `npx cap run`).

## 6. Build order (so we ship value fast and avoid one giant change)

1. **Design system + landing page + logo + responsive shell** (with bottom-tab nav for mobile)
2. **Auth + role selection + onboarding + profile**
3. **Coach profiles + discovery + coach studio (create posts)**
4. **Stripe subscriptions + gated content feed**
5. **Direct messaging (realtime)**
6. **Bookings + Stripe one-time checkout**
7. **Capacitor config + native polish (safe areas, splash, icons)**

Round 1 is what gets implemented immediately on approval; subsequent rounds we do as follow-up prompts so each chunk stays reviewable.

## Technical notes

- React 18 + Vite + TS + Tailwind + shadcn (existing stack)
- Lovable Cloud (Supabase) for DB/auth/storage/realtime/edge functions
- Stripe via Lovable's built-in Payments (Pro plan required for live mode)
- Roles in dedicated `user_roles` table + `has_role()` SECURITY DEFINER (never on profiles)
- All colors via HSL CSS tokens; zero hardcoded hex in components
- Capacitor `appId: app.lovable.7ee943ba1d4f47bd8b62cc3bdd6d90c4`, hot-reload URL preconfigured
