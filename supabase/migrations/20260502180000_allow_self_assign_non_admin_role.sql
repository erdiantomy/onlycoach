-- Allow authenticated users to assign themselves a non-admin role.
-- Without this policy the coach onboarding flow (Onboarding.tsx → upgrade
-- mentee → coach) hits the existing "admins manage roles" FOR ALL policy
-- and 403s, leaving the user stuck with the auto-assigned 'mentee' row
-- created by handle_new_user(). We restrict role <> 'admin' so users
-- still cannot self-promote to admin.
create policy "users add own non-admin role" on public.user_roles
  for insert with check (
    auth.uid() = user_id
    and role <> 'admin'
  );

-- Mirror policy for delete: users may remove their own non-admin roles
-- (e.g. user wants to stop being a coach). Admin role removal still
-- restricted to admins via the existing FOR ALL policy.
create policy "users remove own non-admin role" on public.user_roles
  for delete using (
    auth.uid() = user_id
    and role <> 'admin'
  );
