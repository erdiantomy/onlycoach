-- =========================================================
-- Challenges / Cohorts, Community, Payouts, Stats, Referrals
-- =========================================================

-- ---- ENUMS ----
do $$ begin
  if not exists (select 1 from pg_type where typname = 'challenge_status') then
    create type public.challenge_status as enum ('draft','open','active','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'challenge_lesson_type') then
    create type public.challenge_lesson_type as enum ('text','video','audio','assignment');
  end if;
  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type public.payout_status as enum ('pending','processing','completed','failed');
  end if;
end $$;

-- ---- CHALLENGES ----
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  price_cents int not null check (price_cents >= 0),
  duration_days int not null check (duration_days > 0),
  max_participants int,
  enrollment_deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.challenge_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create index if not exists challenges_coach_idx on public.challenges(coach_id);
create index if not exists challenges_status_idx on public.challenges(status);

create table if not exists public.challenge_curriculum (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  title text not null,
  body text,
  media_url text,
  lesson_type public.challenge_lesson_type not null default 'text',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, day_number)
);
alter table public.challenge_curriculum enable row level security;
create index if not exists challenge_curriculum_challenge_idx on public.challenge_curriculum(challenge_id);

create table if not exists public.challenge_enrollments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  payment_id uuid,
  unique (challenge_id, mentee_id)
);
alter table public.challenge_enrollments enable row level security;
create index if not exists challenge_enrollments_mentee_idx on public.challenge_enrollments(mentee_id);

-- ---- COMMUNITY POSTS ----
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.community_posts(id) on delete cascade,
  body text not null,
  is_announcement boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
create index if not exists community_posts_coach_idx on public.community_posts(coach_id, created_at desc);
create index if not exists community_posts_parent_idx on public.community_posts(parent_id);

-- ---- PAYOUTS ----
create table if not exists public.coach_payout_accounts (
  coach_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'xendit',
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  ewallet_kind text,
  ewallet_phone text,
  payout_schedule text not null default 'monthly' check (payout_schedule in ('weekly','biweekly','monthly')),
  min_payout_cents int not null default 100000,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_payout_accounts enable row level security;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null check (amount_cents >= 0),
  status public.payout_status not null default 'pending',
  xendit_payout_id text,
  payout_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payouts enable row level security;
create index if not exists payouts_coach_idx on public.payouts(coach_id, created_at desc);

-- ---- DAILY STATS ----
create table if not exists public.coach_daily_stats (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  stat_date date not null,
  revenue_cents int not null default 0,
  new_subscribers int not null default 0,
  churned_subscribers int not null default 0,
  content_views int not null default 0,
  messages_received int not null default 0,
  unique (coach_id, stat_date)
);
alter table public.coach_daily_stats enable row level security;
create index if not exists coach_daily_stats_coach_idx on public.coach_daily_stats(coach_id, stat_date desc);

-- ---- REFERRALS ----
create table if not exists public.coach_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  commission_rate numeric(5,4) not null default 0.10 check (commission_rate >= 0 and commission_rate <= 1),
  total_earned_cents int not null default 0,
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id),
  check (referrer_id <> referred_id)
);
alter table public.coach_referrals enable row level security;

-- ---- CRM: subscriber tags + notes ----
create table if not exists public.subscriber_tags (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (coach_id, mentee_id, tag)
);
alter table public.subscriber_tags enable row level security;

create table if not exists public.subscriber_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriber_notes enable row level security;

-- ---- TRIGGERS ----
drop trigger if exists challenges_touch on public.challenges;
create trigger challenges_touch before update on public.challenges
  for each row execute function public.touch_updated_at();

drop trigger if exists payout_accounts_touch on public.coach_payout_accounts;
create trigger payout_accounts_touch before update on public.coach_payout_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriber_notes_touch on public.subscriber_notes;
create trigger subscriber_notes_touch before update on public.subscriber_notes
  for each row execute function public.touch_updated_at();

-- ---- RLS POLICIES ----

-- Challenges: open/active/completed visible to all; drafts/cancelled visible to coach only
drop policy if exists "challenges public read" on public.challenges;
create policy "challenges public read" on public.challenges for select
  using (status in ('open','active','completed') or auth.uid() = coach_id);

drop policy if exists "coach manages own challenges" on public.challenges;
create policy "coach manages own challenges" on public.challenges for all
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- Challenge curriculum: coach always; enrolled mentee always; everyone may peek at first day for preview
drop policy if exists "curriculum visible to enrolled" on public.challenge_curriculum;
create policy "curriculum visible to enrolled" on public.challenge_curriculum for select
  using (
    day_number = 1
    or exists (
      select 1 from public.challenges ch
      where ch.id = challenge_curriculum.challenge_id
        and ch.coach_id = auth.uid()
    )
    or exists (
      select 1 from public.challenge_enrollments e
      where e.challenge_id = challenge_curriculum.challenge_id
        and e.mentee_id = auth.uid()
    )
  );

drop policy if exists "coach manages curriculum" on public.challenge_curriculum;
create policy "coach manages curriculum" on public.challenge_curriculum for all
  using (exists (
    select 1 from public.challenges ch
    where ch.id = challenge_curriculum.challenge_id and ch.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.challenges ch
    where ch.id = challenge_curriculum.challenge_id and ch.coach_id = auth.uid()
  ));

-- Enrollments: mentee + coach see; mentee inserts
drop policy if exists "enrollments visible to participants" on public.challenge_enrollments;
create policy "enrollments visible to participants" on public.challenge_enrollments for select
  using (
    auth.uid() = mentee_id
    or exists (
      select 1 from public.challenges ch
      where ch.id = challenge_enrollments.challenge_id and ch.coach_id = auth.uid()
    )
  );

drop policy if exists "mentee enrolls self" on public.challenge_enrollments;
create policy "mentee enrolls self" on public.challenge_enrollments for insert
  with check (auth.uid() = mentee_id);

-- Community posts: visible to coach + active subscribers
drop policy if exists "community visible to subscribers" on public.community_posts;
create policy "community visible to subscribers" on public.community_posts for select
  using (
    auth.uid() = coach_id
    or public.has_active_subscription(auth.uid(), coach_id)
  );

drop policy if exists "subscribers post in community" on public.community_posts;
create policy "subscribers post in community" on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and (auth.uid() = coach_id or public.has_active_subscription(auth.uid(), coach_id))
    and (is_announcement = false or auth.uid() = coach_id)
  );

drop policy if exists "user updates own community post" on public.community_posts;
create policy "user updates own community post" on public.community_posts for update
  using (auth.uid() = user_id);

drop policy if exists "user deletes own community post" on public.community_posts;
create policy "user deletes own community post" on public.community_posts for delete
  using (auth.uid() = user_id or auth.uid() = coach_id);

-- Payout accounts: coach only
drop policy if exists "coach reads own payout account" on public.coach_payout_accounts;
create policy "coach reads own payout account" on public.coach_payout_accounts for select
  using (auth.uid() = coach_id);

drop policy if exists "coach manages own payout account" on public.coach_payout_accounts;
create policy "coach manages own payout account" on public.coach_payout_accounts for all
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- Payouts: coach reads own
drop policy if exists "coach reads own payouts" on public.payouts;
create policy "coach reads own payouts" on public.payouts for select
  using (auth.uid() = coach_id);

-- Daily stats: coach reads own
drop policy if exists "coach reads own stats" on public.coach_daily_stats;
create policy "coach reads own stats" on public.coach_daily_stats for select
  using (auth.uid() = coach_id);

-- Referrals: either side reads
drop policy if exists "referral participants read" on public.coach_referrals;
create policy "referral participants read" on public.coach_referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "referrer creates referral" on public.coach_referrals;
create policy "referrer creates referral" on public.coach_referrals for insert
  with check (auth.uid() = referrer_id);

-- Subscriber tags + notes: coach only
drop policy if exists "coach reads own tags" on public.subscriber_tags;
create policy "coach reads own tags" on public.subscriber_tags for select
  using (auth.uid() = coach_id);
drop policy if exists "coach manages own tags" on public.subscriber_tags;
create policy "coach manages own tags" on public.subscriber_tags for all
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

drop policy if exists "coach reads own notes" on public.subscriber_notes;
create policy "coach reads own notes" on public.subscriber_notes for select
  using (auth.uid() = coach_id);
drop policy if exists "coach manages own notes" on public.subscriber_notes;
create policy "coach manages own notes" on public.subscriber_notes for all
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- ---- REALTIME ----
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_posts';
  if not found then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end $$;
