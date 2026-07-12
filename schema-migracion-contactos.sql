-- ============================================
-- MIGRACIÓN 2: contactos (leads del formulario de la landing)
-- Pegar y correr en el SQL Editor de Supabase
-- (además de schema.sql y schema_migracion_documento.sql)
-- ============================================

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  nombre text,
  email text,
  plan_interes text,   -- 'Plan Pro' | 'Plan Plus' | 'Plan Premium' | 'No estoy seguro...'
  mensaje text,
  estado text default 'nuevo', -- nuevo | contactado | convertido | descartado
  created_at timestamptz default now()
);

alter table public.contactos enable row level security;

-- El cliente logueado puede crear y ver SU PROPIO contacto
create policy "clientes crean su propio contacto"
  on public.contactos for insert
  with check (cliente_id in (select id from public.clientes where user_id = auth.uid()));

create policy "clientes ven sus propios contactos"
  on public.contactos for select
  using (cliente_id in (select id from public.clientes where user_id = auth.uid()));

-- El admin ve y gestiona todos los contactos (para poder convertirlos en proyecto)
create policy "admin ve y gestiona contactos"
  on public.contactos for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');