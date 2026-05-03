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
create policy "users read own prefs" on public.notification_preferences
  for select using (auth.uid() = user_id);
create policy "users insert own prefs" on public.notification_preferences
  for insert with check (auth.uid() = user_id);
create policy "users update own prefs" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own prefs" on public.notification_preferences
  for delete using (auth.uid() = user_id);
create policy "admin reads all prefs" on public.notification_preferences
  for select using (has_role(auth.uid(), 'admin'::app_role));
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.touch_updated_at();