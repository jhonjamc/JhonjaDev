-- ============================================
-- MIGRACIÓN 3: gastos (inversión) + forma de pago
-- Pegar y correr en el SQL Editor de Supabase
-- (además de las migraciones anteriores)
-- ============================================

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  concepto text,
  monto numeric,
  categoria text, -- herramientas | hosting | marketing | otro
  fecha date default now(),
  created_at timestamptz default now()
);

alter table public.gastos enable row level security;

create policy "admin ve y gestiona gastos"
  on public.gastos for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');

alter table public.pagos add column if not exists metodo_pago text; -- transferencia | efectivo | wompi | otro