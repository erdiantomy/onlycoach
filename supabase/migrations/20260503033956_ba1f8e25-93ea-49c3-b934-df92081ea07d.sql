ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS mentee_last_read_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS coach_last_read_at timestamptz NOT NULL DEFAULT now();

-- Allow participants to update their own read marker (uses existing UPDATE policy
-- pattern: a permissive update policy on conversations limited to participants).
DROP POLICY IF EXISTS "participant updates conversation" ON public.conversations;
CREATE POLICY "participant updates conversation"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = mentee_id OR auth.uid() = coach_id)
  WITH CHECK (auth.uid() = mentee_id OR auth.uid() = coach_id);