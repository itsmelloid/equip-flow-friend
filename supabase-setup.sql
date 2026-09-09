-- Run this once in your Supabase project (SQL editor).

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_name text not null,
  category text,
  asset_code text not null unique,
  condition text,
  availability text not null default 'Available',
  created_at timestamptz not null default now()
);

create table if not exists public.borrow_transactions (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  borrower_name text not null,
  borrower_type text not null,
  department text,
  date_borrowed date not null default current_date,
  due_date date not null,
  date_returned date,
  status text not null default 'Borrowed',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.equipment to authenticated;
grant select, insert, update, delete on public.borrow_transactions to authenticated;
grant all on public.equipment to service_role;
grant all on public.borrow_transactions to service_role;

alter table public.equipment enable row level security;
alter table public.borrow_transactions enable row level security;

drop policy if exists "authenticated manage equipment" on public.equipment;
create policy "authenticated manage equipment" on public.equipment
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage transactions" on public.borrow_transactions;
create policy "authenticated manage transactions" on public.borrow_transactions
  for all to authenticated using (true) with check (true);
