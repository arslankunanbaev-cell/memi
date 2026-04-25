-- ─────────────────────────────────────────────
-- Memi Premium: подписка + темы карточек
-- ─────────────────────────────────────────────

-- 1. Поля подписки в таблице users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_premium          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_expires_at  timestamptz          DEFAULT null;

-- 2. Таблица купленных тем карточек
CREATE TABLE IF NOT EXISTS public.user_themes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  theme_id     text        NOT NULL,           -- 'summer' | 'cinema' | ...
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, theme_id)
);

-- 3. RLS для user_themes
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- Юзер видит только свои темы
CREATE POLICY "user_themes_select_own"
  ON public.user_themes FOR SELECT
  USING (user_id = auth.uid());

-- Вставка только через service_role (webhook обновляет)
CREATE POLICY "user_themes_insert_service"
  ON public.user_themes FOR INSERT
  WITH CHECK (false);  -- запрещаем с клиента, только service_role bypass

-- 4. Индекс для быстрого поиска тем юзера
CREATE INDEX IF NOT EXISTS user_themes_user_id_idx
  ON public.user_themes (user_id);

-- 5. Вспомогательная функция: проверить активность подписки
--    Возвращает true если is_premium=true И подписка не истекла (или бессрочная)
CREATE OR REPLACE FUNCTION public.is_user_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
      AND is_premium = true
      AND (premium_expires_at IS NULL OR premium_expires_at > now())
  );
$$;
