# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # start Vite dev server
npm run build         # production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit (tsconfig.app.json)
npm run test          # Vitest single run
npm run test:watch    # Vitest watch mode
npm run ci            # lint + typecheck + test + build (via scripts/maintain.mjs)
```

Run individual maintain tasks: `npm run maintain -- lint typecheck test --no-bail`

To run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

**Stack**: React 18 + TypeScript + Vite SPA, Supabase (auth, Postgres, edge functions), TanStack Query, React Router v6, shadcn/ui (Radix UI + Tailwind CSS), Capacitor for native iOS/Android shells.

### Data layer

All Supabase access goes through the singleton client at `src/integrations/supabase/client.ts`, typed by the generated `src/integrations/supabase/types.ts`. Never create a second client instance.

Data fetching uses TanStack Query everywhere — no bare `useEffect` fetches. The pattern is `useQuery`/`useMutation` with `supabase` inside `queryFn`.

### Auth & routing

- `useSession` (`src/hooks/useSession.ts`) is the single source of auth state. It subscribes to `onAuthStateChange` *before* calling `getSession()` to avoid race conditions.
- Route protection: `RequireAuth` for authenticated routes, `RequireAdmin` for `/admin/*` routes. Admin access is determined by the `user_roles` table (`src/hooks/useAdminRole.ts`).
- Admin actions must be logged via `logAdminAction()` in `src/lib/adminAudit.ts`.

### Two-sided user model

The app has **coaches** (content creators) and **mentees** (subscribers). Most tables are keyed on `coach_id` / `user_id`. Coaches have a `coach_profiles` row in addition to the base `profiles` row.

Coach-facing pages live under `/studio/*` (content management, analytics, payouts, referrals, subscribers). Mentee-facing pages are the public-facing feed, discover, sessions, etc.

### Payment routing

`src/lib/checkout.ts` auto-routes to **Stripe** (global) or **Xendit** (SEA locales — detected via browser language and timezone). All payment entry points must go through the helper functions (`startSubscriptionCheckout`, `startBookingCheckout`, `changeSubscription`, `cancelSubscription`) — never call edge functions for payments directly.

**iOS App Store compliance**: On native iOS, checkout is blocked and routes to the web browser instead (`requiresExternalCheckout()` in `src/lib/platform.ts`). Always wrap checkout UI with the `ManageOnWebNotice` component or check `isCheckoutBlockedOnDevice()`.

### Layout

`AppShell` (`src/components/layout/AppShell.tsx`) is the shared chrome for every authenticated screen — it renders `TopNav` + `MobileTabBar`. Pages pass `hideTabBar` for auth/landing screens.

### Offline support

- `useOnlineStatus` — reactive network state with `recheck()` against Supabase.
- `useMessageOutbox` — localStorage-backed outbox for messages composed offline; auto-flushes on reconnect.
- `OfflineBoundary` — shows a sticky banner (default) or blocks the UI entirely (`blockWhenOffline` for checkout flows).

### i18n

`src/lib/i18n.tsx` supports English (`en`) and Indonesian (`id`). Use `useI18n()` hook to access `t(key)` and `setLang()`. All UI strings that appear in the i18n dictionaries must go through `t()` — do not add new hardcoded strings to settings/nav without adding entries to both dictionaries.

### Currency

All prices in the database are stored as **integer Rupiah cents** (`price_cents` columns). Use `formatIdr(cents)` from `src/lib/utils.ts` to display them — it divides by 100 and formats as `Rp149.000`. Never multiply by a USD-to-IDR rate; the data is already in IDR.

### Design system

The visual style is "neo-brutalist": thick borders, offset box shadows. Custom Tailwind tokens:
- `shadow-brutal` / `shadow-brutal-sm` / `shadow-brutal-lg` — the key stylistic shadows
- `ink` color — the dark border/shadow color (not black)
- `surface` color — card/panel background
- `font-display` → Archivo Black (headings), `font-sans` → Inter (body)

### Capacitor (mobile)

The Capacitor config (`capacitor.config.ts`) is env-aware:
- Dev: includes `server.url` for hot-reload from Lovable preview
- Release: `CAP_ENV=production npm run mobile:build:release` — omits `server.url` and bundles `dist/`

Never run `npx cap sync` for release without `CAP_ENV=production`. See `MOBILE_RELEASE.md` for the full release checklist.

## Production Setup

### Required environment variables (web/Vite)

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

### Required Supabase edge function secrets

Set these in the Supabase dashboard → Settings → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY          # Stripe secret key (sk_live_...)
STRIPE_WEBHOOK_SECRET      # Stripe webhook signing secret (whsec_...)
XENDIT_SECRET_KEY          # Xendit secret API key
XENDIT_WEBHOOK_TOKEN       # Xendit callback verification token
```

### OAuth setup

In the Supabase dashboard → Authentication → Providers:
- **Google**: enable, add OAuth client ID and secret from Google Cloud Console
- **Apple**: enable, add Service ID, Team ID, Key ID, and private key from Apple Developer

### Custom domain / Redirect URLs

In Supabase dashboard → Authentication → URL Configuration:
- **Site URL**: `https://onlycoach.co`
- **Redirect URLs**: add `https://onlycoach.co/**`, `https://*.lovableproject.com/**` (for preview), and `https://localhost:8080/**` (for local dev)

### Storage buckets

These are created by the first migration, but verify they exist in Supabase Storage:
- `avatars` — public bucket (coach/mentee profile photos)
- `post-media` — private bucket (images, videos, PDFs attached to posts)
- `message-attachments` — private bucket (files sent in DMs)
