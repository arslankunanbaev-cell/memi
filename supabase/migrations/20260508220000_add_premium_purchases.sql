create table if not exists public.premium_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  telegram_id bigint,
  product_id text not null default 'premium',
  stars_amount integer,
  premium_expires_at timestamptz,
  telegram_payment_charge_id text,
  provider_payment_charge_id text,
  payload text,
  purchased_at timestamptz not null default now()
);

create unique index if not exists premium_purchases_telegram_charge_uidx
  on public.premium_purchases (telegram_payment_charge_id)
  where telegram_payment_charge_id is not null;

create index if not exists premium_purchases_user_id_idx
  on public.premium_purchases (user_id, purchased_at desc);

create index if not exists premium_purchases_product_expires_idx
  on public.premium_purchases (product_id, premium_expires_at desc);

alter table public.premium_purchases enable row level security;

drop policy if exists "premium_purchases_select_own" on public.premium_purchases;
create policy "premium_purchases_select_own"
  on public.premium_purchases for select
  using (user_id = public.get_my_user_id());
