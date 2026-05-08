-- Track reminder cadence so Memi can nudge gently every couple of days,
-- not every time the daily reminder job runs.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_ritual_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_memory_reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS users_last_ritual_reminder_at_idx
  ON public.users (last_ritual_reminder_at);

CREATE INDEX IF NOT EXISTS users_last_memory_reminder_at_idx
  ON public.users (last_memory_reminder_at);
