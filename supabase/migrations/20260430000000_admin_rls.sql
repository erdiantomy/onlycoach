-- Admin RLS policies: grant admin role SELECT/UPDATE/DELETE on all tables.
-- Also creates admin_audit_log for tracking admin actions.

-- ============================================================
-- admin_audit_log
-- ============================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create policy "admin_audit_read" on public.admin_audit_log
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin_audit_insert" on public.admin_audit_log
  for insert with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- profiles — already readable by all, add admin update
-- ============================================================
create policy "admin updates any profile" on public.profiles
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any profile" on public.profiles
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- coach_profiles
-- ============================================================
create policy "admin reads all coach profiles" on public.coach_profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any coach profile" on public.coach_profiles
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any coach profile" on public.coach_profiles
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- mentee_profiles
-- ============================================================
create policy "admin reads all mentee profiles" on public.mentee_profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any mentee profile" on public.mentee_profiles
  for update using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- subscription_tiers
-- ============================================================
create policy "admin reads all tiers" on public.subscription_tiers
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- subscriptions
-- ============================================================
create policy "admin reads all subscriptions" on public.subscriptions
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any subscription" on public.subscriptions
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any subscription" on public.subscriptions
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- posts
-- ============================================================
create policy "admin reads all posts" on public.posts
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any post" on public.posts
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- post_media
-- ============================================================
create policy "admin reads all post media" on public.post_media
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- post_comments
-- ============================================================
create policy "admin deletes any comment" on public.post_comments
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- conversations
-- ============================================================
create policy "admin reads all conversations" on public.conversations
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- messages
-- ============================================================
create policy "admin reads all messages" on public.messages
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- bookings
-- ============================================================
create policy "admin reads all bookings" on public.bookings
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any booking" on public.bookings
  for update using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- challenges
-- ============================================================
create policy "admin reads all challenges" on public.challenges
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any challenge" on public.challenges
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- challenge_curriculum
-- ============================================================
create policy "admin reads all curriculum" on public.challenge_curriculum
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- challenge_enrollments
-- ============================================================
create policy "admin reads all enrollments" on public.challenge_enrollments
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- community_posts
-- ============================================================
create policy "admin reads all community posts" on public.community_posts
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any community post" on public.community_posts
  for delete using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- coach_payout_accounts
-- ============================================================
create policy "admin reads all payout accounts" on public.coach_payout_accounts
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any payout account" on public.coach_payout_accounts
  for update using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- payouts
-- ============================================================
create policy "admin reads all payouts" on public.payouts
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any payout" on public.payouts
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin inserts payout" on public.payouts
  for insert with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- coach_daily_stats
-- ============================================================
create policy "admin reads all coach stats" on public.coach_daily_stats
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- coach_referrals
-- ============================================================
create policy "admin reads all referrals" on public.coach_referrals
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- subscriber_tags
-- ============================================================
create policy "admin reads all tags" on public.subscriber_tags
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- subscriber_notes
-- ============================================================
create policy "admin reads all notes" on public.subscriber_notes
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- follows / badges / profile_views — already public read
-- ============================================================
-- No additional policies needed; all readable by everyone.

-- ============================================================
-- processed_webhook_events — currently service role only
-- ============================================================
create policy "admin reads webhook events" on public.processed_webhook_events
  for select using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- email_send_log + related tables — service role only currently
-- Add admin read access
-- ============================================================
create policy "admin reads email send log" on public.email_send_log
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admin reads email send state" on public.email_send_state
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "admin reads unsubscribes" on public.email_unsubscribes
  for select using (public.has_role(auth.uid(), 'admin'));
