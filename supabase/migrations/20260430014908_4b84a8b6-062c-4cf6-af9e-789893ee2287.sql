-- =========================================================================
-- Admin audit log
-- =========================================================================
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
create policy "admin_audit_read" on public.admin_audit_log for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin_audit_insert" on public.admin_audit_log for insert with check (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- Profile / posts column additions
-- =========================================================================
alter table public.profiles add column if not exists follower_count integer not null default 0;
alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists is_locked boolean not null default false;

-- =========================================================================
-- Mentee profiles
-- =========================================================================
create table if not exists public.mentee_profiles (
  user_id uuid primary key,
  goals text,
  location text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mentee_profiles enable row level security;
create policy "mentee reads own profile" on public.mentee_profiles for select using (auth.uid() = user_id);
create policy "mentee writes own profile" on public.mentee_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- Challenges
-- =========================================================================
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create policy "published challenges readable" on public.challenges for select using (is_published or auth.uid() = coach_id);
create policy "coach manages own challenges" on public.challenges for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

create table if not exists public.challenge_enrollments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
alter table public.challenge_enrollments enable row level security;
create policy "user reads own enrollments" on public.challenge_enrollments for select using (auth.uid() = user_id);
create policy "coach reads own challenge enrollments" on public.challenge_enrollments for select using (
  exists (select 1 from public.challenges c where c.id = challenge_id and c.coach_id = auth.uid())
);
create policy "user enrolls self" on public.challenge_enrollments for insert with check (auth.uid() = user_id);
create policy "user unenrolls self" on public.challenge_enrollments for delete using (auth.uid() = user_id);

-- =========================================================================
-- Community posts
-- =========================================================================
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  coach_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
create policy "community posts public" on public.community_posts for select using (true);
create policy "user creates own community post" on public.community_posts for insert with check (auth.uid() = author_id);
create policy "user deletes own community post" on public.community_posts for delete using (auth.uid() = author_id);
create policy "user updates own community post" on public.community_posts for update using (auth.uid() = author_id);

-- =========================================================================
-- Payouts
-- =========================================================================
create table if not exists public.coach_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null unique,
  provider text not null default 'bank',
  bank_name text,
  account_name text,
  account_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_payout_accounts enable row level security;
create policy "coach reads own payout account" on public.coach_payout_accounts for select using (auth.uid() = coach_id);
create policy "coach writes own payout account" on public.coach_payout_accounts for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  notes text
);
alter table public.payouts enable row level security;
create policy "coach reads own payouts" on public.payouts for select using (auth.uid() = coach_id);
create policy "coach requests own payout" on public.payouts for insert with check (auth.uid() = coach_id);

-- =========================================================================
-- Coach daily stats
-- =========================================================================
create table if not exists public.coach_daily_stats (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  day date not null,
  revenue_cents integer not null default 0,
  new_subscribers integer not null default 0,
  new_posts integer not null default 0,
  unique (coach_id, day)
);
alter table public.coach_daily_stats enable row level security;
create policy "coach reads own stats" on public.coach_daily_stats for select using (auth.uid() = coach_id);

-- =========================================================================
-- Subscriber CRM
-- =========================================================================
create table if not exists public.subscriber_tags (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  mentee_id uuid not null,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (coach_id, mentee_id, tag)
);
alter table public.subscriber_tags enable row level security;
create policy "coach manages own subscriber tags" on public.subscriber_tags for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

create table if not exists public.subscriber_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  mentee_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriber_notes enable row level security;
create policy "coach manages own subscriber notes" on public.subscriber_notes for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- =========================================================================
-- Profile views (for live feed)
-- =========================================================================
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  viewer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.profile_views enable row level security;
create policy "owner reads own profile views" on public.profile_views for select using (auth.uid() = profile_id);
create policy "anyone records a view" on public.profile_views for insert with check (true);

-- =========================================================================
-- Admin RLS policies on existing + new tables
-- =========================================================================
create policy "admin updates any profile" on public.profiles for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all coach profiles" on public.coach_profiles for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any coach profile" on public.coach_profiles for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all mentee profiles" on public.mentee_profiles for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all subscriptions" on public.subscriptions for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any subscription" on public.subscriptions for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any subscription" on public.subscriptions for delete using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all posts" on public.posts for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any post" on public.posts for delete using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all conversations" on public.conversations for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all messages" on public.messages for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all bookings" on public.bookings for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all challenges" on public.challenges for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all enrollments" on public.challenge_enrollments for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all community posts" on public.community_posts for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin deletes any community post" on public.community_posts for delete using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all payout accounts" on public.coach_payout_accounts for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all payouts" on public.payouts for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates any payout" on public.payouts for update using (public.has_role(auth.uid(), 'admin'));
create policy "admin inserts payout" on public.payouts for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all coach stats" on public.coach_daily_stats for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all tags" on public.subscriber_tags for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads all notes" on public.subscriber_notes for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads webhook events" on public.processed_webhook_events for select using (public.has_role(auth.uid(), 'admin'));
create policy "admin reads email send log" on public.email_send_log for select using (public.has_role(auth.uid(), 'admin'));

-- realtime publications for the live feed
alter publication supabase_realtime add table public.profile_views;
alter publication supabase_realtime add table public.subscriptions;
alter publication supabase_realtime add table public.community_posts;