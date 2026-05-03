## Goal

Replace the three "Coming soon" buttons in `/settings` (Billing, Payouts, Notifications) with working entry points to live functionality.

## Current state

- **Payouts**: `/payouts` page already exists and is fully functional (bank account + schedule + history) — just needs to be linked.
- **Billing**: `/me` already shows active subscriptions with tier name + price. No cancel/manage flow surfaced from Settings yet. `cancelSubscription()` exists in `src/lib/checkout.ts`.
- **Notifications**: No table, no page, no logic. Needs to be built from scratch.

## Plan

### 1. Database — `notification_preferences` table

New migration `*_notification_preferences.sql`:

```sql
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_new_subscriber boolean not null default true,
  email_new_message boolean not null default true,
  email_booking_reminder boolean not null default true,
  email_payout boolean not null default true,
  email_marketing boolean not null default false,
  push_new_message boolean not null default true,
  push_new_subscriber boolean not null default true,
  push_booking_reminder boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "users manage own prefs" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.touch_updated_at();
```

### 2. New page — `src/pages/Notifications.tsx`

- Route: `/settings/notifications`
- Loads (or upserts default) row for current user.
- Toggle switches grouped under **Email** and **Push**, each label maps to a bool column.
- Save on toggle (optimistic, debounced upsert).
- Toast on success/failure.
- Brutal-card styling, matches existing Settings sections.

### 3. New page — `src/pages/Billing.tsx`

- Route: `/settings/billing`
- Lists active subscriptions (reuse query pattern from `Me.tsx`).
- Each row shows coach name, tier, price (`formatCurrency`), period end date, and a **Cancel** button.
- Cancel flow:
  - `confirm()` dialog
  - call `cancelSubscription(coach_id, provider)` — read provider from `subscriptions.provider` column (fall back to `'stripe'`).
  - On success show `toast` with `access_until` date and refetch.
- iOS guard: render `ManageOnWebNotice` at top when `requiresExternalCheckout()` is true (cancel routes to web automatically via existing helper).
- Empty state links to `/discover`.

### 4. Update `src/pages/Settings.tsx`

Replace each "Coming soon" button with a real `<Link>`:

- Billing → `/settings/billing`
- Payouts → `/payouts` (existing studio page)
- Notifications → `/settings/notifications`

Keep neo-brutalist style (`border-2 border-ink bg-surface` button, hover bg-accent).

### 5. Register routes in `src/App.tsx`

Add lazy-or-direct routes for `/settings/billing` and `/settings/notifications` (both wrapped in `RequireAuth`).

## Out of scope

- Actually wiring email/push providers to read `notification_preferences` (table exists; senders can consult it later).
- Invoice history (Stripe/Xendit invoice list) — billing page only handles active-subscription management for now.
- Payment-method update UI — handled by Stripe/Xendit hosted portals; out of scope unless requested.
