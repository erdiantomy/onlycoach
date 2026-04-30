-- =========================================================================
-- mentee_profiles: add visibility flags
-- =========================================================================
alter table public.mentee_profiles add column if not exists is_public boolean not null default true;
alter table public.mentee_profiles add column if not exists show_subscriptions boolean not null default true;

-- =========================================================================
-- community_posts: rename concept to user_id + add is_announcement
-- =========================================================================
alter table public.community_posts add column if not exists user_id uuid;
update public.community_posts set user_id = author_id where user_id is null;
alter table public.community_posts alter column user_id set not null;
alter table public.community_posts add column if not exists is_announcement boolean not null default false;

-- Named FK so PostgREST embed `profiles!community_posts_user_id_fkey` works
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'community_posts_user_id_fkey') then
    alter table public.community_posts
      add constraint community_posts_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- =========================================================================
-- coach_daily_stats: add stat_date + extra metric columns
-- =========================================================================
alter table public.coach_daily_stats add column if not exists stat_date date;
update public.coach_daily_stats set stat_date = day where stat_date is null;
alter table public.coach_daily_stats alter column stat_date set not null;
alter table public.coach_daily_stats alter column stat_date set default current_date;
alter table public.coach_daily_stats add column if not exists churned_subscribers integer not null default 0;
alter table public.coach_daily_stats add column if not exists content_views integer not null default 0;

-- =========================================================================
-- challenges: business columns + status enum + named FK
-- =========================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'challenge_status') then
    create type public.challenge_status as enum ('draft','open','active','closed');
  end if;
end $$;

alter table public.challenges add column if not exists price_cents integer not null default 0;
alter table public.challenges add column if not exists duration_days integer not null default 30;
alter table public.challenges add column if not exists max_participants integer;
alter table public.challenges add column if not exists status public.challenge_status not null default 'draft';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'challenges_coach_id_fkey') then
    alter table public.challenges
      add constraint challenges_coach_id_fkey
      foreign key (coach_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- =========================================================================
-- challenge_curriculum
-- =========================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'challenge_lesson_type') then
    create type public.challenge_lesson_type as enum ('text','video','quiz','task');
  end if;
end $$;

create table if not exists public.challenge_curriculum (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_number integer not null,
  title text not null,
  body text,
  lesson_type public.challenge_lesson_type not null default 'text',
  created_at timestamptz not null default now(),
  unique (challenge_id, day_number)
);
alter table public.challenge_curriculum enable row level security;
create policy "curriculum readable to enrolled or coach" on public.challenge_curriculum for select using (
  exists (
    select 1 from public.challenges c
    where c.id = challenge_id
      and (c.coach_id = auth.uid()
           or exists (select 1 from public.challenge_enrollments e where e.challenge_id = c.id and e.user_id = auth.uid()))
  )
);
create policy "coach manages own curriculum" on public.challenge_curriculum for all using (
  exists (select 1 from public.challenges c where c.id = challenge_id and c.coach_id = auth.uid())
) with check (
  exists (select 1 from public.challenges c where c.id = challenge_id and c.coach_id = auth.uid())
);
create policy "admin reads curriculum" on public.challenge_curriculum for select using (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- follows
-- =========================================================================
create table if not exists public.follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select using (true);
create policy "user follows" on public.follows for insert with check (auth.uid() = follower_id);
create policy "user unfollows" on public.follows for delete using (auth.uid() = follower_id);
create policy "admin reads all follows" on public.follows for select using (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- Named FKs for existing PostgREST embeds
-- =========================================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_coach_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_coach_id_fkey
      foreign key (coach_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_mentee_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_mentee_id_fkey
      foreign key (mentee_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'posts_coach_id_fkey') then
    alter table public.posts
      add constraint posts_coach_id_fkey
      foreign key (coach_id) references public.profiles(id) on delete cascade;
  end if;
end $$;