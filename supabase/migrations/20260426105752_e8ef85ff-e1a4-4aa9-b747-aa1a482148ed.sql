
create table if not exists public.coach_billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text,
  updated_at timestamptz not null default now()
);
alter table public.coach_billing enable row level security;
create policy "coach reads own billing" on public.coach_billing for select using (auth.uid() = user_id);
create policy "coach writes own billing" on public.coach_billing for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.coach_billing (user_id, stripe_account_id)
  select user_id, stripe_account_id from public.coach_profiles where stripe_account_id is not null
  on conflict (user_id) do nothing;
alter table public.coach_profiles drop column if exists stripe_account_id;

drop policy if exists "mentee creates own sub" on public.subscriptions;
drop policy if exists "mentee updates own sub" on public.subscriptions;

create policy "post-media subscriber read" on storage.objects for select
  using (
    bucket_id = 'post-media'
    and exists (
      select 1 from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.storage_path = storage.objects.name
        and (p.required_tier_id is null
             or auth.uid() = p.coach_id
             or public.has_active_subscription_to_tier(auth.uid(), p.required_tier_id))
    )
  );

drop policy if exists "message-attachments owner read" on storage.objects;
create policy "message-attachments participants read" on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.attachment_path = storage.objects.name
          and (auth.uid() = c.mentee_id or auth.uid() = c.coach_id)
      )
    )
  );
