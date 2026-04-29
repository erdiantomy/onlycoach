# OnlyCoach

Subscription-first coaching marketplace for the Indonesian market. React +
Vite + Tailwind + shadcn on the front end, Supabase (Postgres, Auth, Storage,
Realtime, Edge Functions) on the back end, Xendit for payments, Capacitor for
the native iOS / Android shells.

## Run locally

```bash
npm install
npm run dev      # vite dev server at http://localhost:5173
npm run build    # production bundle
npm run preview  # serve the prod bundle locally
npm run lint     # eslint
npm test         # vitest
```

### Environment

`.env` and `.env.development` are committed (the project uses non-secret
public Supabase URLs and anon keys for the demo). For the seed script you
also need a service-role key:

```ini
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role, server-only
```

## Auth providers

The app ships with three sign-in methods. Email + password works out of
the box once you've created the Supabase project. The other two need a
quick provider configuration:

### Google OAuth

1. **Google Cloud Console** → APIs & Services → Credentials → "Create
   credentials" → OAuth client ID → **Web application**.
2. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://<your-deployed-domain>`
3. Authorized redirect URIs (one per environment):
   - `http://localhost:5173/auth/callback`
   - `https://<your-deployed-domain>/auth/callback`
   - `https://<project-ref>.supabase.co/auth/v1/callback`
4. **Supabase dashboard** → Authentication → Providers → **Google** →
   enable, paste the Client ID + Client Secret, save.
5. **Supabase dashboard** → Authentication → URL Configuration → add the
   same `http(s)://…/auth/callback` URLs to "Redirect URLs".

The button on `/auth` already points at `/auth/callback?next=…` so no
code changes are needed once the provider is enabled.

### Phone OTP (Indonesia + global)

1. **Supabase dashboard** → Authentication → Providers → **Phone** →
   pick a provider (Twilio, MessageBird, etc.), paste credentials.
2. Numbers default to `+62` prefix in the UI; users can also paste any
   E.164-formatted number.

### Email magic links / signup

Already enabled by default — Supabase sends from `noreply@…` unless you
configure an SMTP provider in **Authentication → Email Templates**.

## Database

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI:

```bash
supabase db push                  # apply pending migrations
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Hand-written types for the latest migration (challenges, community,
payouts, stats, referrals, CRM) live in
`src/integrations/supabase/extra-types.ts` until `gen types` is re-run.

## Seed test data

Idempotent seeder for local / staging projects:

```bash
npm run seed
```

Creates 5 Indonesian coaches (Maya, Budi, Aisyah, Rizky, Sari), 10 mentees,
three subscription tiers each (149K / 299K / 499K IDR), starter posts, two
challenges with curriculum, and ~3 active subs per coach. Skips rows that
already exist.

## Edge functions

Xendit checkout + webhook handlers in `supabase/functions/`:

- `create-subscription-checkout` — start a recurring subscription
- `change-subscription` — upgrade / downgrade with proration
- `cancel-subscription` / `cancel-xendit-subscription`
- `create-xendit-invoice` / `create-xendit-subscription`
- `create-booking-checkout` — one-off session booking
- `payments-webhook` / `xendit-webhook` — payment status sync
- `signed-media-url` — short-lived URLs for tier-locked media

Deploy individually:

```bash
supabase functions deploy <name>
```

## Mobile

```bash
npm run mobile:sync:release      # cap sync (production)
npm run mobile:build:release     # build + sync + preflight
npm run mobile:preflight         # validate native config without sync
```

See `MOBILE_RELEASE.md` for the full release checklist.

## Project layout

```
src/
  pages/                  # one page = one route
  components/
    layout/               # AppShell, TopNav, MobileTabBar
    auth/                 # RequireAuth gate
    coach/                # CoachCard
    brand/                # Logo
    ui/                   # shadcn primitives
    ErrorBoundary.tsx     # top-level boundary
  hooks/                  # session, online status, message outbox,
                          # voice recorder, saved posts, post engagement,
                          # notifications, notification prefs, i18n
  lib/                    # utils (cn, formatIdr), i18n, mock data,
                          # checkout, platform detection
  integrations/supabase/  # client, types, extra-types
supabase/
  migrations/             # SQL schema
  functions/              # Deno edge functions
scripts/
  seed.mjs                # idempotent test-data seeder
  mobile-preflight.mjs    # native build validator
```

## Architecture notes

- **Currency**: prices in mock + UI live in USD-equivalents and are
  converted to IDR at render time via `formatIdr()` in `src/lib/utils.ts`.
  DB columns are `price_cents` (Rupiah-cents).
- **Code splitting**: all non-public routes are lazy-loaded in `App.tsx`
  to keep the initial bundle small.
- **Local-first state**: bookmarks, post likes/comments, notifications,
  and notification prefs are stored in `localStorage` for instant UI;
  in production these mirror to Supabase tables (`post_likes`,
  `post_engagements`, etc.) on a debounce.
- **Realtime**: messaging uses `useMessageOutbox` for offline queueing
  + auto-flush when connectivity returns. `community_posts` and
  `messages` tables are added to the `supabase_realtime` publication.
- **Auth**: Email + password, Google OAuth, and phone OTP (defaults
  to +62 for Indonesia). All gated routes go through `RequireAuth`.
- **i18n**: English / Bahasa Indonesia toggle in Settings, persisted
  to `localStorage`, defaults from `navigator.language`.
- **Error boundary**: `<ErrorBoundary>` at the root of `App.tsx` so a
  render crash never paints a white screen.

## License

Private — all rights reserved.
